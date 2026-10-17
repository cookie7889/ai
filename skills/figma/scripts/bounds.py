import sys
# usage: bounds.py export.png — координаты фреймов/карточек на сером фоне экспорта секции
from PIL import Image
import numpy as np
a=np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(int); B=3; a[:B]=a[B,B]; a[-B:]=a[B,B]; a[:,:B]=a[B,B]; a[:,-B:]=a[B,B]
fg=~(abs(a-a[5,5]).sum(2)<8)
# split by empty rows, then by empty cols within each band
def runs(v,gap=20):
    idx=np.where(v)[0]; out=[]
    if not len(idx): return out
    s=p=idx[0]
    for i in idx[1:]:
        if i-p>gap: out.append((s,p+1)); s=i
        p=i
    out.append((s,p+1)); return out
for y0,y1 in runs(fg.any(1)):
    for x0,x1 in runs(fg[y0:y1].any(0)):
        sub=fg[y0:y1,x0:x1]; ys=runs(sub.any(1))
        print(f'x={x0} y={y0+ys[0][0]} w={x1-x0} h={ys[-1][1]-ys[0][0]}')
