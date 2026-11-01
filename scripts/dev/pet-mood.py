# 펫 기분 표정(1294) — 걷기·쉬기 GIF 의 눈만 바꿔 <그림>-w.gif(걱정 — 동그란 눈 · 처진 눈썹 · 벌린 입) · <그림>-h.gif(신남 ^_^ — 눈) 를 만든다.
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
  if mood=='w':   # 걱정 = 동그란 눈(O) · 처진 눈썹(자리 있을 때) · 네모로 벌린 입(테두리 + 빨간 속) — 사용자 그림 O△O
    (xl,y0,y1),(xr,_,_)=e;col=P[xl,y0];fc=P[xl-1,y0] if not dark(P[xl-1,y0]) else P[xl+1,y0];lf=lum(fc)
    for yy in range(y1+1,y1+5):   # 옛 입 지우기 — 얼굴색보다 어둡고 위아래가 얼굴(줄무늬·홈 같은 세로 무늬는 남긴다)
      for xx in range(xl+1,xr):
        q=P[xx,yy] if yy<H else None
        if q and q!=fc and q[3]>=128 and lum(q)<lf-15 and P[xx,yy-1] in (fc,q) and P[xx,y1]==fc:P[xx,yy]=fc
    put={}
    for i,(x,a0,a1) in enumerate(e):   # 눈 = 3칸 폭 둥근 고리(모서리 뺌), 속은 흰색
      for yy in range(a0-1,a1+2):
        for xx in (x-1,x,x+1):
          inner=xx==x and a0<=yy<=a1
          if xx!=x and yy in (a0-1,a1+1):continue   # 모서리는 비워 둥글게(네모면 안경처럼 보였다)
          put[(xx,yy)]=(255,255,255,255) if inner else col
    ring=set(put)
    for i,(x,a0,a1) in enumerate(e):   # 눈썹 — 바깥이 낮고 안쪽(가운데 쪽)이 높게. 두 줄이 얼굴일 때만
      s_=1 if i==0 else -1;bp=[(x-s_,a0-3),(x,a0-3),(x+s_,a0-4)]
      if all(ok(a,b) and P[a,b]==fc for a,b in bp):
        for q in bp:put[q]=col
    c0=(xl+xr)//2;odd=(xr-xl)%2;ym=y1+2   # 입 — 네모로 크게 벌린 입(사용자 그림): 테두리로 두르고 속은 빨강. 아래 테두리 줄이 얼굴 밖이면 두 줄로
    mw=list(range(c0-1,c0+2+odd));tall=all(ok(x,ym+2) and not dark(P[x,ym+2]) for x in mw)
    for r in range(3 if tall else 2):
      for x in mw:put[(x,ym+r)]=col if r==0 or r==2 or x in (mw[0],mw[-1]) else (214,58,64,255)
    for (a,b),v in put.items():
      if not ok(a,b):return None
      if dark(P[a,b]) and (a,b) not in ring:return None
    for (a,b),v in put.items():P[a,b]=v
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
NO_W={'senior'}   # 안경 — 동그란 눈이 안경테와 겹친다(눈으로 확인)
ok={};skip=[]
for k,v in P.items():
  files=sorted({v['g'][m]['f'] for m in ('idle','walk','run') if m in v['g']})
  have=''
  for m in ('h' if k in NO_W else 'wh'):   # 기분마다 따로 — 한쪽만 되는 펫은 그쪽만(pets.js "mo":"h" 등)
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
