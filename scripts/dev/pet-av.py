# 프로필 캐릭터 아바타 — 정지 그림(<키>-t.png)을 시각 중심이 한가운데 오도록 정사각형으로 다시 놓는다(픽셀은 그대로, 크기 조정 없음)
# 사용: python3 scripts/dev/pet-av.py . assets/pets   (새 펫을 넣거나 정지 그림을 고치면 다시 돌린다)
import json,sys,os
from PIL import Image
root=sys.argv[1];out=sys.argv[2]
src=open(os.path.join(root,'assets/pets.js'),encoding='utf-8').read()
P=json.loads(src[src.index('{',src.index('CALAPP_PETS')):src.rindex('}')+1])
for k,v in P.items():
  im=Image.open(os.path.join(root,'assets/pets',v['t']['f'])).convert('RGBA')
  bb=im.getbbox();a=im.getchannel('A');W,H=im.size;px=a.load()
  sw=sx=sy=0
  for y in range(H):
    for x in range(W):
      w=px[x,y]
      if w:sw+=w;sx+=w*x;sy+=w*y
  cx=sx/sw;cy=sy/sw
  bx=(bb[0]+bb[2])/2;by=(bb[1]+bb[3])/2
  ox=0.6*cx+0.4*bx;oy=0.35*cy+0.65*by   # 가로는 무게 중심 쪽, 세로는 윤곽 가운데 쪽(머리·발이 동그라미 밖으로 덜 나가게)
  half=max(ox-bb[0],bb[2]-ox,oy-bb[1],bb[3]-oy)
  S=int(2*half+0.999)+8;S+=S%2
  c=Image.new('RGBA',(S,S),(0,0,0,0))
  c.paste(im.crop(bb),(round(S/2-(ox-bb[0])),round(S/2-(oy-bb[1]))))
  c.save(os.path.join(out,'av-'+k+'.png'),optimize=True)
print(len(P))
