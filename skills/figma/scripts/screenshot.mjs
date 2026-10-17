// node screenshot.mjs <figma-url> <out.png> [nodeId] — скриншот редактора (посмотреть, что на канвасе/в панелях)
import { openFigma, openNode } from './common.mjs';
const [fileUrl, out, nodeId] = process.argv.slice(2);
const { ctx, page } = await openFigma();
await openNode(page, fileUrl, nodeId || new URL(fileUrl).searchParams.get('node-id') || '0-1');
await page.screenshot({ path: out });
console.log('saved', out);
await ctx.close();
