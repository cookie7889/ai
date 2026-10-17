// Загрузка машинных путей из skills/.env (без зависимостей).
// Поддерживает $HOME, ${HOME} и ~ в значениях.
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_FILE = process.env.OPENCODE_SKILLS_ENV
	|| path.resolve(__dirname, '../../.env');

function expand(v) {
	return v
		.replace(/\$\{?HOME\}?/g, os.homedir())
		.replace(/^~(?=\/|$)/, os.homedir());
}

if (fs.existsSync(ENV_FILE)) {
	for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
		const s = line.trim();
		if (!s || s.startsWith('#')) continue;
		const eq = s.indexOf('=');
		if (eq < 1) continue;
		const key = s.slice(0, eq).trim();
		let val = s.slice(eq + 1).trim();
		val = val.replace(/^["']|["']$/g, '');
		if (!(key in process.env)) process.env[key] = expand(val);
	}
}

// дефолты, если .env нет / ключ не задан
const home = os.homedir();
if (!process.env.SKILLS_DATA_DIR) process.env.SKILLS_DATA_DIR = path.join(home, '.config/opencode/skills-data');
if (!process.env.BITRIX24_DIR) process.env.BITRIX24_DIR = path.join(process.env.SKILLS_DATA_DIR, 'bitrix24');
if (!process.env.FIGMA_DIR) process.env.FIGMA_DIR = path.join(process.env.SKILLS_DATA_DIR, 'figma');
if (!process.env.SKILLS_TMP_DIR) process.env.SKILLS_TMP_DIR = path.join(process.env.SKILLS_DATA_DIR, 'tmp');
// Приоритет:
// 1) CHROMIUM_PATH из .env как абсолютный путь (существует);
// 2) бандл-chromium из playwright-core (версия из browsers.json, лежит в ms-playwright);
// 3) CHROMIUM_PATH как команда из PATH / системные кандидаты.
// Google Chrome системный с playwright нередко падает (SIGTRAP) — бандл надёжнее.
function findPlaywrightChromium() {
	try {
		const corePkg = path.resolve(__dirname, 'node_modules/playwright-core/browsers.json');
		if (!fs.existsSync(corePkg)) return null;
		const rev = JSON.parse(fs.readFileSync(corePkg, 'utf8'))
			.browsers?.find(b => b.name === 'chromium')?.revision;
		const base = process.env.PLAYWRIGHT_BROWSERS_PATH
			|| path.join(process.env.HOME || home, '.cache', 'ms-playwright');
		if (!fs.existsSync(base)) return null;
		// установленные chromium-<rev> (headless shell не подходит: нет обычного рендера канваса Figma)
		const revs = fs.readdirSync(base)
			.map(d => d.match(/^chromium-(\d+)$/))
			.filter(Boolean)
			.map(m => parseInt(m[1], 10))
			.sort((a, b) => b - a);
		// точное совпадение с playwright-core, иначе максимальная установленная
		// (минорный дрейф ревизии обычно безвреден — 1247 против 1248 работает)
		const ordered = (rev && revs.includes(parseInt(rev, 10)))
			? [parseInt(rev, 10), ...revs]
			: revs;
		for (const r of ordered) {
			for (const rel of [
				`chromium-${r}/chrome-linux64/chrome`,
				`chromium-${r}/chrome-linux/chrome`,
			]) {
				const p = path.join(base, rel);
				if (fs.existsSync(p)) return p;
			}
		}
	} catch {}
	return null;
}

async function resolveChromium() {
	const raw = process.env.CHROMIUM_PATH;
	if (raw && raw.includes('/') && fs.existsSync(raw)) return raw;
	const bundled = findPlaywrightChromium();
	if (bundled) return bundled;
	const { execSync } = await import('child_process');
	const candidates = [raw, 'google-chrome', 'chromium', 'chromium-browser', '/usr/local/bin/chromium', '/usr/bin/google-chrome'].filter(Boolean);
	for (const c of candidates) {
		try {
			if (c.includes('/')) {
				if (fs.existsSync(c)) return c;
			} else {
				return execSync(`command -v ${c}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
			}
		} catch {}
	}
	return 'google-chrome';
}
process.env.CHROMIUM_PATH = await resolveChromium();

export const FIGMA_DIR = process.env.FIGMA_DIR;
export const CHROMIUM_PATH = process.env.CHROMIUM_PATH;
export const SKILLS_TMP_DIR = process.env.SKILLS_TMP_DIR;
