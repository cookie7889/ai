import { chromium } from 'playwright-core';
import fs from 'fs';
import { FIGMA_DIR, CHROMIUM_PATH, SKILLS_TMP_DIR } from './env.mjs';

export { FIGMA_DIR, CHROMIUM_PATH, SKILLS_TMP_DIR };

/** Persistent headless-браузер с сессией Figma (профиль в FIGMA_DIR/profile) */
export async function openFigma() {
	const ctx = await chromium.launchPersistentContext(`${FIGMA_DIR}/profile`, {
		executablePath: CHROMIUM_PATH, headless: true,
		args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-blink-features=AutomationControlled'],
		viewport: { width: 1600, height: 1000 }, locale: 'ru-RU',
		// без обычного desktop UA CloudFront Figma отдаёт 403
		userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
	});
	// Figma отдаёт экспорт blob-ссылкой и сразу её отзывает — перехватываем blob'ы
	await ctx.addInitScript(() => {
		URL.revokeObjectURL = () => {};
		const create = URL.createObjectURL;
		window.__blobs = [];
		URL.createObjectURL = (b) => { if (b instanceof Blob) window.__blobs.push(b); return create(b); };
		// само скачивание глушим: на нём headless-chromium падает (SIGSEGV), blob уже перехвачен
		const click = HTMLAnchorElement.prototype.click;
		HTMLAnchorElement.prototype.click = function () {
			if (this.hasAttribute('download') || /^blob:/.test(this.href)) return;
			return click.call(this);
		};
	});
	const page = ctx.pages()[0] || await ctx.newPage();
	return { ctx, page };
}

/** Логин, если сессия протухла. Данные — FIGMA_EMAIL/FIGMA_PASSWORD из skills/.env
 *  (fallback: файл FIGMA_DIR/creds, формат email\npassword). */
export async function login(page) {
	let email = process.env.FIGMA_EMAIL;
	let pass = process.env.FIGMA_PASSWORD;
	if (!email || !pass) {
		const credsPath = `${FIGMA_DIR}/creds`;
		if (fs.existsSync(credsPath)) {
			const [e2, p2] = fs.readFileSync(credsPath, 'utf8').split('\n');
			email = email || e2?.trim();
			pass = pass || p2?.trim();
		}
	}
	if (!email || !pass) throw new Error('Нет FIGMA_EMAIL/FIGMA_PASSWORD в skills/.env и нет FIGMA_DIR/creds');
	await page.goto('https://www.figma.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
	await page.waitForTimeout(6000);
	if (!/\/login/.test(page.url())) return true; // уже залогинены
	await page.getByText(/Do not allow cookies|Отклонить/).click().catch(() => {});
	await page.locator('input[type=email], input[name=email]').first().fill(email);
	await page.locator('input[type=password]').first().fill(pass);
	await page.locator('button[type=submit]').first().click();
	await page.waitForTimeout(15000);
	return !/\/login/.test(page.url());
}

/** Открыть файл на ноде и дождаться загрузки канваса */
export async function openNode(page, fileUrl, nodeId, wait = 35000) {
	const url = new URL(fileUrl);
	url.searchParams.set('node-id', nodeId.replace(':', '-'));
	await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 90000 });
	if (/\/login/.test(page.url())) throw new Error('Сессия Figma протухла — запусти login.mjs');
	await page.waitForTimeout(wait);
}

/** Экспорт выделенной ноды через панель Export (PNG 1x по умолчанию) → Buffer */
export async function exportSelected(page) {
	const plus = page.locator('[aria-label="Add export settings"]').first();
	if (await plus.count()) await plus.click();
	await page.waitForTimeout(1500);
	const n0 = await page.evaluate(() => window.__blobs.length);
	await page.getByText(/^Export .+/).last().click();
	await page.waitForFunction((n) => window.__blobs.slice(n).some(b => b.size > 1000), n0, { timeout: 180000 });
	const b64 = await page.evaluate(async (n) => {
		const b = window.__blobs.slice(n).filter(b => b.size > 1000).pop();
		const buf = new Uint8Array(await b.arrayBuffer()); let s = '';
		for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
		return btoa(s);
	}, n0);
	return Buffer.from(b64, 'base64');
}
