import sys,os
from PIL import Image, ImageChops
A,B=sys.argv[1],sys.argv[2]; bad=0
for f in sorted(os.listdir(A)):
  if not f.endswith('.png'): continue
  if not os.path.exists(os.path.join(B,f)): print('manque',f); bad+=1; continue
  a=Image.open(os.path.join(A,f)).convert('RGB'); b=Image.open(os.path.join(B,f)).convert('RGB')
  if a.size!=b.size: print('TAILLE',f,a.size,b.size); bad+=1; continue
  d=ImageChops.difference(a,b); bb=d.getbbox()
  if bb:
    n=sum(1 for px in d.getdata() if max(px)>16); print('DIFF',f,bb,n,'px'); bad+=1
print('ok' if not bad else str(bad)+' écarts')
