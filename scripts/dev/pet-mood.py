# 펫 기분 표정(1294) — 걷기·쉬기 GIF 의 눈만 바꿔 <그림>-w.gif(걱정 — 동그란 눈 · 처진 눈썹 · 벌린 입) · <그림>-h.gif(신남 ^_^ — 눈) 를 만든다.
# 눈 = 같은 줄에 3~8칸 떨어진 같은 모양의 작은 어두운 덩어리 둘(1×1 · 1×2). 눈을 못 찾은 프레임(깜빡임 등)은 가장 닮은 프레임의 눈 자리에 그린다. 절반 넘게 못 찾으면 표정 없이 둔다.
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
def comps2(g):   # 2차(대비) — 1차에서 못 찾은 펫용: 같은 색 세로 1~3칸 덩어리가 둘레와 밝기 차 45 넘게(밝은 눈·빨간 얼굴·눈썹 붙은 눈)
  W,H=g.size;P=g.load();seen=set();out=[]
  for y in range(H):
    for x in range(W):
      p=P[x,y]
      if (x,y) in seen or p[3]<128 or not(lum(p)<90 or lum(p)>160):continue
      yy=y
      while yy+1<H and P[x,yy+1]==p and yy-y<2:yy+=1
      for t in range(y,yy+1):seen.add((x,t))
      if x<1 or x>=W-1 or y<1 or yy>=H-1:continue
      if P[x,yy+1]==p or any(P[x-1,t]==p or P[x+1,t]==p for t in range(y,yy+1)):continue
      ring=[(x-1,t) for t in range(y,yy+1)]+[(x+1,t) for t in range(y,yy+1)]+[(x,y-1),(x,yy+1)]
      if not all(0<=a<W and 0<=b<H and P[a,b][3]>=128 for a,b in ring):continue
      if any(P[a,b]==p for a,b in ring):continue
      if sum(abs(lum(P[q])-lum(p))>45 for q in ring)>=len(ring)-1:out.append((x,y,yy))
  return out
def find2(g):
  c=comps2(g);P=g.load();best=None
  for a in c:
    for b in c:
      if a[1]==b[1] and a[2]==b[2] and 3<=b[0]-a[0]<=11 and P[a[0],a[1]]==P[b[0],b[1]]:
        if best is None or a[1]<best[0][1]:best=(a,b)
  return best
def draw(g,e,mood,cm=False,force=False):   # force = 3차 — 겹침 검사 없이(문틈·지퍼·눈썹 위에도 그린다). FORCE 펫만, 눈으로 확인   # cm = 2차(대비) — 얼굴색은 눈 둘레에서 가장 많은 색, 특징 = 얼굴색과 밝기 차 45 넘음
  g=g.copy();P=g.load();W,H=g.size
  def fcol(x,y0,y1):
    if not cm:return P[x-1,y0] if not dark(P[x-1,y0]) else P[x+1,y0]
    r=[P[x-1,t] for t in range(y0,y1+1)]+[P[x+1,t] for t in range(y0,y1+1)]+[P[x,y0-1],P[x,y1+1]];return max(set(r),key=r.count)
  ok=lambda a,b:0<=a<W and 0<=b<H and P[a,b][3]>=128
  if mood=='w':   # 걱정 = 동그란 눈(O) · 처진 눈썹(자리 있을 때) · 네모로 벌린 입(테두리 + 빨간 속) — 사용자 그림 O△O
    (xl,y0,y1),(xr,_,_)=e;col=P[xl,y0];fc=fcol(xl,y0,y1);lf=lum(fc)
    F=(lambda p:False) if force else (lambda p:p[3]>=128 and abs(lum(p)-lf)>45) if cm else dark;lite=cm and lum(col)>lf   # lite = 어두운 얼굴에 밝은 눈
    for yy in range(y1+1,y1+5):   # 옛 입 지우기 — 얼굴색보다 어둡고 위아래가 얼굴(줄무늬·홈 같은 세로 무늬는 남긴다)
      for xx in range(xl+1,xr):
        q=P[xx,yy] if yy<H else None
        if q and q!=fc and q[3]>=128 and (abs(lum(q)-lf)>15 if cm else lum(q)<lf-15) and P[xx,yy-1] in (fc,q) and P[xx,y1]==fc:P[xx,yy]=fc
    put={}
    for i,(x,a0,a1) in enumerate(e):   # 눈 = 3칸 폭 둥근 고리(모서리 뺌), 속은 흰색
      for yy in range(a0-1,a1+2):
        for xx in (x-1,x,x+1):
          inner=xx==x and a0<=yy<=a1
          if xx!=x and yy in (a0-1,a1+1):continue   # 모서리는 비워 둥글게(네모면 안경처럼 보였다)
          put[(xx,yy)]=(fc if lite else (255,255,255,255)) if inner else col
    ring=set(put)
    for i,(x,a0,a1) in enumerate(e):   # 눈썹 — 바깥이 낮고 안쪽(가운데 쪽)이 높게. 두 줄이 얼굴일 때만
      s_=1 if i==0 else -1;bp=[(x-s_,a0-3),(x,a0-3),(x+s_,a0-4)]
      if all(ok(a,b) and P[a,b]==fc for a,b in bp):
        for q in bp:put[q]=col
    c0=(xl+xr)//2;odd=(xr-xl)%2;ym=y1+2   # 입 — 네모로 크게 벌린 입(사용자 그림): 테두리로 두르고 속은 빨강. 아래 테두리 줄이 얼굴 밖이면 두 줄로
    mw=list(range(c0-1,c0+2+odd));tall=all(ok(x,ym+2) and not F(P[x,ym+2]) for x in mw)
    for r in range(3 if tall else 2):
      for x in mw:put[(x,ym+r)]=col if r==0 or r==2 or x in (mw[0],mw[-1]) else (214,58,64,255)
    for (a,b),v in put.items():
      if not ok(a,b):return None
      if F(P[a,b]) and (a,b) not in ring:return None
    for (a,b),v in put.items():P[a,b]=v
    return g
  for i,(x,y0,y1) in enumerate(e):   # 신남 = 눈 ^_^
    col=P[x,y0];fc=fcol(x,y0,y1);F=(lambda p:False) if force else (lambda p,f=lum(fc):p[3]>=128 and abs(lum(p)-f)>45) if cm else dark
    for yy in range(y0,y1+1):P[x,yy]=fc
    px=[(x-1,y1),(x,y1-1),(x+1,y1)] if y1>y0 else [(x-1,y0),(x,y0-1),(x+1,y0)]
    for a,b in px:
      if not ok(a,b) or (F(P[a,b]) and (a,b)!=(x,y0)):return None
      P[a,b]=col
  return g
def frames(fn):
  im=Image.open(fn);out=[]
  for i in range(im.n_frames):
    im.seek(i);out.append((im.convert('RGBA'),im.info.get('duration',100)))
  return out,im.info.get('loop',0)
def save(fs,dur,loop,fn):
  fs[0].save(fn,save_all=True,append_images=fs[1:],duration=dur,loop=loop,disposal=2,optimize=True)   # 1296 — 같은 그림, 용량 약 35% 줄임(팔레트 정리)
src=open(os.path.join(root,'assets/pets.js'),encoding='utf-8').read()
i0=src.index('{',src.index('CALAPP_PETS'));P=json.loads(src[i0:src.rindex('}')+1])
NO_W=set()
STATIC={'tr-elev'}
FORCE={'senior','teamlead','tr-fire','tr-tile','tr-pipe','tr-hood','sf-svest','sf-wind','tr-elev'}   # 겹침 검사를 넘는 펫(안경·눈썹·문틈·지퍼·줄무늬) — 결과를 눈으로 확인했다
EQUIP={'excavator','dump','roller','mixer','crane','forklift','ladder'}   # 장비류 — 얼굴이 없다(사용자: 장비류만 표정 없음)
def build(k,files,m,cm,force=False):   # 한 기분 · 한 방식(cm = 2차 대비). 모든 그림에서 되면 {파일: (프레임, 시간, 반복)}
  res={}
  for f in files:
    fr,loop=frames(os.path.join(D,f));gs=[]
    for im,_ in fr:
      g=im.resize((im.width//S,im.height//S),Image.NEAREST)
      if g.resize(im.size,Image.NEAREST).tobytes()!=im.tobytes():return None
      gs.append([g,(find2 if cm else find)(g)])
    if k in STATIC:gs=[list(gs[0]) for _ in gs]   # 문이 열리는 승강기 — 기분 그림은 닫힌 첫 프레임 그대로(열린 문 위 얼굴이 어긋남)
    E=[e for _,e in gs if e]
    if len(E)*2<len(gs):return None
    ref=max(E,key=lambda e:sum(1 for x in E if x==e))
    for t in gs:   # 다른 프레임과 동떨어진 자리에서 찾은 눈(깜빡임 프레임의 다른 무늬)은 버린다
      if t[1] and (abs(t[1][0][0]-ref[0][0])>3 or abs(t[1][0][1]-ref[0][1])>2):t[1]=None
    out=[]
    for j,(g,e) in enumerate(gs):
      fo=force
      if not e:   # 눈 감은 프레임(깜빡임·문 닫힘) — 가장 닮은 프레임의 눈 자리에 그린다(겹침 검사 없이)
        cand=[(sum(a!=b for a,b in zip(g.tobytes(),h.tobytes())),hi) for hi,(h,he) in enumerate(gs) if he]
        e=gs[min(cand)[1]][1];fo=True
      d=draw(g,e,m,cm,fo)
      if d is None:return None
      out.append(d.resize((g.width*S,g.height*S),Image.NEAREST))
    res[f]=(out,[d for _,d in fr],loop)
  return res
ok={};skip=[];via2=[]
for k,v in P.items():
  if k in EQUIP:skip.append(k);continue
  files=sorted({v['g'][m]['f'] for m in ('idle','walk','run') if m in v['g']})
  have=''
  for m in ('h' if k in NO_W else 'wh'):   # 기분마다 따로 — 한쪽만 되는 펫은 그쪽만(pets.js "mo":"h" 등)
    res=build(k,files,m,False)
    if not res:
      res=build(k,files,m,True)
      if res:via2.append(k+'-'+m)
    if not res and k in FORCE:
      res=build(k,files,m,False,True) or build(k,files,m,True,True)
      if res:via2.append(k+'-'+m+'!')
    if res:
      for f,(out,dur,loop) in res.items():save(out,dur,loop,os.path.join(D,f[:-4]+'-'+m+'.gif'))
      have+=m
  if have:ok[k]=have
  else:skip.append(k)
for k,v in P.items():
  v.pop('mo',None)
  if k in ok:v['mo']=ok[k]
src=src[:i0]+json.dumps(P,ensure_ascii=False,separators=(',',':'))+src[src.rindex('}')+1:]
open(os.path.join(root,'assets/pets.js'),'w',encoding='utf-8').write(src)
print('표정',len(ok),' '.join(k+('' if m=='wh' else '('+m+')') for k,m in ok.items()));print('없음',len(skip),' '.join(skip));print('2차',' '.join(via2))
