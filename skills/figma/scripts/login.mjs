// node login.mjs — войти в Figma (или проверить, что сессия жива)
import { openFigma, login } from './common.mjs';
const { ctx, page } = await openFigma();
console.log(await login(page) ? 'OK: залогинены' : 'FAIL: не вошли (2FA/капча?) — смотри login-fail.png');
if (/\/login/.test(page.url())) await page.screenshot({ path: 'login-fail.png' });
await ctx.close();
