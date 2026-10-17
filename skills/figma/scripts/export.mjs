// node export.mjs <figma-url> <outDir> <nodeId> [nodeId...]
// Экспорт нод в PNG 1:1 через панель Export (работает и с view-only доступом).
// На каждую ноду — свежий браузер: повторный экспорт в той же вкладке нестабилен.
import fs from 'fs';
import { openFigma, openNode, exportSelected } from './common.mjs';
const [fileUrl, outDir, ...ids] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
let failed = 0;
for (const id of ids) {
	const { ctx, page } = await openFigma();
	try {
		await openNode(page, fileUrl, id, 40000);
		const out = `${outDir}/${id.replace(':', '-')}.png`;
		fs.writeFileSync(out, await exportSelected(page));
		console.log('saved', out);
	} catch (e) {
		failed++;
		console.log('FAIL', id, e.message.split('\n')[0]);
	} finally {
		await ctx.close().catch(() => {});
	}
}
process.exit(failed ? 1 : 0);
