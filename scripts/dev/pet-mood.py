# 펫 기분 표정(1294) — 걷기·쉬기 GIF 의 눈만 바꿔 <그림>-w.gif(걱정 O△O — 입만 삼각형) · <그림>-h.gif(신남 ^_^ — 눈) 를 만든다.
# 눈 = 같은 줄에 3~8칸 떨어진 같은 모양의 작은 어두운 덩어리 둘(1×1 · 1×2). 눈 감은(깜빡임) 프레임 하나까지는 이웃 프레임으로 채우고, 그 밖에 못 찾은 펫은 표정 없이 둔다.
# 그림은 4배 픽셀(한 칸 = 4px). 바꾼 칸이 얼굴 밖(투명·윤곽)에 닿으면 그 펫은 건너뛴다.
# 사용: python3 scripts/dev/pet-mood.py .   (새 펫을 넣거나 그림을 고치면 다시 돌린다 — pets.js 의 "mo"(가진 기분 w·h) 도 다시 맞춘다)
import json,sys,os,re
from PIL import Image
root=sys.argv[1];D=os.path.join(root,'assets/pets');S=4
def lum(p):return .299*p[0]+.587*p[1]+.114*p[2]
def dark(p):return p[3]>=128 and lum(p)<100
def comps(g):
  W,H=g.size;P=g.load();seen=set();out=[]
  for y in range(H):
    for x in range(W):
      if (x,y) in seen or not dark(P[x,y]):continue
      st=[(x,y)];seen.add((x,y));c=[]
      while st:
        a,b=st.pop();c.append((a,b))
        for q in ((a+1,b),(a-1,b),(a,b+1),(a,b-1)):
          if 0<=q[0]<W and 0<=q[1]<H and q not in seen and dark(P[q])and len(c)<6:seen.add(q);st.append(q)
      xs=[p[0] for p in c];ys=[p[1] for p in c]
      if len(c)<=2 and max(xs)==min(xs):   # 1×1 · 세로 1×2
        x0,y0,y1=xs[0],min(ys),max(ys)
        ring=[(x0-1,yy) for yy in range(y0,y1+1)]+[(x0+1,yy) for yy in range(y0,y1+1)]+[(x0,y0-1),(x0,y1+1)]
        if all(0<=a<W and 0<=b<H and P[a,b][3]>=128 for a,b in ring) and sum(not dark(P[q]) for q in ring)>=len(ring)-1:
          out.append((x0,y0,y1))
  return out
def find(g):
  c=comps(g);best=None
  for a in c:
    for b in c:
      if a[1]==b[1] and a[2]==b[2] and 3<=b[0]-a[0]<=8:
        if best is None or a[1]<best[0][1]:best=(a,b)
  return best
def face(P,x,y):return P[x,y]
def draw(g,e,mood):
  g=g.copy();P=g.load();W,H=g.size
  ok=lambda a,b:0<=a<W and 0<=b<H and P[a,b][3]>=128
  if mood=='w':   # 걱정 = 눈은 그대로(O) · 입이 삼각형(△) — 사용자 O△O
    (xl,y0,y1),(xr,_,_)=e;col=P[xl,y0];fc=P[xl-1,y0] if not dark(P[xl-1,y0]) else P[xl+1,y0];lf=lum(fc)
    for yy in range(y1+1,y1+4):   # 옛 입 지우기 — 얼굴색보다 어둡고 위아래가 얼굴(줄무늬·홈 같은 세로 무늬는 남긴다)
      for xx in range(xl+1,xr):
        q=P[xx,yy]
        if q!=fc and q[3]>=128 and lum(q)<lf-15 and P[xx,yy-1] in (fc,q) and P[xx,y1]==fc:P[xx,yy]=fc
    c0=(xl+xr)//2;odd=(xr-xl)%2;ym=y1+2
    px=[(c0,ym)]+([(c0+1,ym)] if odd else [])+[(x,ym+1) for x in range(c0-1,c0+2+odd)]
    for a,b in px:
      if not ok(a,b) or dark(P[a,b]):return None
      P[a,b]=(150,52,62,255)   # 벌린 입 색 — 검정이면 콧수염처럼 보였다
    return g
  for i,(x,y0,y1) in enumerate(e):   # 신남 = 눈 ^_^
    col=P[x,y0];fc=P[x-1,y0] if not dark(P[x-1,y0]) else P[x+1,y0]
    for yy in range(y0,y1+1):P[x,yy]=fc
    px=[(x-1,y1),(x,y1-1),(x+1,y1)] if y1>y0 else [(x-1,y0),(x,y0-1),(x+1,y0)]
    for a,b in px:
      if not ok(a,b) or (dark(P[a,b]) and (a,b)!=(x,y0)):return None
      P[a,b]=col
  return g
def frames(fn):
  im=Image.open(fn);out=[]
  for i in range(im.n_frames):
    im.seek(i);out.append((im.convert('RGBA'),im.info.get('duration',100)))
  return out,im.info.get('loop',0)
def save(fs,dur,loop,fn):
  fs[0].save(fn,save_all=True,append_images=fs[1:],duration=dur,loop=loop,disposal=2,optimize=False)
src=open(os.path.join(root,'assets/pets.js'),encoding='utf-8').read()
i0=src.index('{',src.index('CALAPP_PETS'));P=json.loads(src[i0:src.rindex('}')+1])
ok={};skip=[]
for k,v in P.items():
  files=sorted({v['g'][m]['f'] for m in ('idle','walk','run') if m in v['g']})
  have=''
  for m in 'wh':   # 기분마다 따로 — 한쪽만 되는 펫은 그쪽만(pets.js "mo":"h" 등)
    res={};good=True
    for f in files:
      fr,loop=frames(os.path.join(D,f));gs=[]
      for im,_ in fr:
        g=im.resize((im.width//S,im.height//S),Image.NEAREST)
        if g.resize(im.size,Image.NEAREST).tobytes()!=im.tobytes():good=False;break
        gs.append((g,find(g)))
      if not good or not any(e for _,e in gs) or sum(1 for _,e in gs if not e)>1:good=False;break
      out=[]
      for j,(g,e) in enumerate(gs):
        if not e:out.append(None);continue   # 눈 감은 프레임(깜빡임) — 기분 표정은 깜빡이지 않고 앞(없으면 뒤) 프레임을 그대로 쓴다
        d=draw(g,e,m)
        if d is None:good=False;break
        out.append(d.resize((g.width*S,g.height*S),Image.NEAREST))
      if not good:break
      out=[o if o is not None else (out[j-1] if j and out[j-1] is not None else out[j+1]) for j,o in enumerate(out)]
      res[f]=(out,[d for _,d in fr],loop)
    if good and res:
      for f,(out,dur,loop) in res.items():save(out,dur,loop,os.path.join(D,f[:-4]+'-'+m+'.gif'))
      have+=m
  if have:ok[k]=have
  else:skip.append(k)
for k,v in P.items():
  v.pop('mo',None)
  if k in ok:v['mo']=ok[k]
src=src[:i0]+json.dumps(P,ensure_ascii=False,separators=(',',':'))+src[src.rindex('}')+1:]
open(os.path.join(root,'assets/pets.js'),'w',encoding='utf-8').write(src)
print('표정',len(ok),' '.join(k+('' if m=='wh' else '('+m+')') for k,m in ok.items()));print('없음',len(skip),' '.join(skip))
