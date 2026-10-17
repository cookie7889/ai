import sys
from PIL import Image, ImageChops, ImageOps
# usage: ov.py design.png x y w h site.png out.png  — difference overlay (PerfectPixel "invert")
d, x, y, w, h, s, out = sys.argv[1], *map(int, sys.argv[2:6]), sys.argv[6], sys.argv[7]
D = Image.open(d).convert('RGB').crop((x, y, x + w, y + h))
S = Image.open(s).convert('RGB')
W, H = max(w, S.width), max(h, S.height)
cd = Image.new('RGB', (W, H), 'white'); cd.paste(D, (0, 0))
cs = Image.new('RGB', (W, H), 'white'); cs.paste(S, (0, 0))
diff = ImageChops.difference(cd, cs)
# поверх: сайт с инвертированным макетом 50/50 — как в PerfectPixel
inv = Image.blend(cs, ImageOps.invert(cd), 0.5)
inv.save(out)
diff.save(out.replace('.png', '-diff.png'))
D.save(out.replace('.png', '-design.png'))
print('design', w, h, 'site', S.size)
