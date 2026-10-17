// node find-node.mjs <figma-url-with-node> "<имя слоя>" — кликнуть слой в панели Layers и вывести его node-id
import { openFigma, openNode } from './common.mjs';
const [fileUrl, layerName] = process.argv.slice(2);
const { ctx, page } = await openFigma();
const nodeId = new URL(fileUrl).searchParams.get('node-id') || '0-1';
await openNode(page, fileUrl, nodeId);
await page.getByText(layerName, { exact: false }).first().click();
await page.waitForTimeout(3000);
console.log(new URL(page.url()).searchParams.get('node-id'));
await ctx.close();
