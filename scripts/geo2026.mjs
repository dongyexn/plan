/* korea-geo.js 재생성 — vuski/admdongkor HangJeongDong_ver20260701.geojson (CC BY 4.0) 기준 */
import fs from 'fs';
import * as tjs from 'topojson-server';
import * as tjc from 'topojson-client';
import * as tjsimp from 'topojson-simplify';
const SRC=process.argv[2]||'/root/work/hjd.geojson', OLD=process.argv[3], OUT=process.argv[4]||'/root/work/korea-geo.js';
const s=8271.01354851737,t=[-18123.94839273026,6059.944519746961],k=4;
const P=(lon,lat)=>[k*(s*lon*Math.PI/180+t[0]), k*(t[1]-s*Math.log(Math.tan(Math.PI/4+lat*Math.PI/180/2)))];
const SIDO={'11':['11','서울','서울특별시'],'26':['21','부산','부산광역시'],'27':['22','대구','대구광역시'],'28':['23','인천','인천광역시'],'12':['36','전남광주','전남광주통합특별시'],
 '30':['25','대전','대전광역시'],'31':['26','울산','울산광역시'],'36':['29','세종','세종특별자치시'],'41':['31','경기','경기도'],'51':['32','강원','강원특별자치도'],
 '43':['33','충북','충청북도'],'44':['34','충남','충청남도'],'52':['35','전북','전북특별자치도'],'47':['37','경북','경상북도'],'48':['38','경상남도'.slice(0,0)+'경남','경상남도'],'50':['39','제주','제주특별자치도']};
const METRO=new Set(['11','21','22','23','25','26','29']);
/* 588차: 육지 마스크 — 2018 통계청 시군구 원해상도(southkorea-maps kostat, 바다 없음). 2026 행정동엔 공유수면을 품은 동이 있어
   시도·시군구 면을 병합한 **뒤** 마스크와 교집합을 취한다(행정동 단위로 먼저 자르면 이웃끼리 공유하던 변이 깨져 위상이 무너진다).
   선(mesh·sub)은 선분 중점이 육지 밖이면 버린다 */
import pc from 'polygon-clipping';
const MASK_SRC=process.env.MASK||'/root/work/mun.json';
function dpRing(pts,tol){if(pts.length<4)return pts;const keep=new Uint8Array(pts.length);keep[0]=keep[pts.length-1]=1;const st=[[0,pts.length-1]];
  while(st.length){const [a,b]=st.pop();let md=-1,mi=-1;const [ax,ay]=pts[a],[bx,by]=pts[b];const dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy;
    for(let i=a+1;i<b;i++){const [px,py]=pts[i];let d;if(L===0)d=Math.hypot(px-ax,py-ay);else{const u=((px-ax)*dx+(py-ay)*dy)/L;d=Math.hypot(px-(ax+u*dx),py-(ay+u*dy));}if(d>md){md=d;mi=i;}}
    if(md>tol){keep[mi]=1;st.push([a,mi],[mi,b]);}}return pts.filter((_,i)=>keep[i]);}
let MASK=null,MASKR=null;
if(fs.existsSync(MASK_SRC)){const mj=JSON.parse(fs.readFileSync(MASK_SRC,'utf8'));const polys=[];
  mj.features.forEach(f=>{const ps=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
    ps.forEach(p=>{const rings=p.map(r=>dpRing(r.map(c=>P(c[0],c[1])),Number(process.env.TOLM||1.2))).filter(r=>r.length>=4);if(rings.length)polys.push(rings);});});
  console.log('mask polys',polys.length);const t0=Date.now();MASK=pc.union(...polys.map(p=>[p]));console.log('mask union',MASK.length,'polys',Date.now()-t0,'ms');
  MASKR=MASK.flatMap(p=>p.map((r,i)=>({r,hole:i>0})));}
function inMask(x,y){if(!MASKR)return true;let ins=false;MASKR.forEach(({r})=>{for(let i=0,j=r.length-1;i<r.length;j=i++){const [xi,yi]=r[i],[xj,yj]=r[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)ins=!ins;}});return ins;}
function clipGeo(geo){if(!MASK||!geo)return geo;let polys=geo.type==='Polygon'?[geo.coordinates]:geo.coordinates;
  /* 2026 공유수면 동 사이의 빈틈(만 안쪽에 어느 동에도 안 속한 자리)은 마스크와 만나면 직선 변으로 남는다 — 작은 구멍(HOLE 단위² 미만)은
     먼저 메운다. 큰 구멍(경기 속 서울, 경북 속 대구)은 남긴다 */
  const HOLE=Number(process.env.HOLE||8000);const ra=r=>{let a=0;for(let i=0;i<r.length;i++){const u=r[i],v=r[(i+1)%r.length];a+=u[0]*v[1]-v[0]*u[1];}return Math.abs(a)/2;};
  polys=polys.map(p=>[p[0],...p.slice(1).filter(h=>ra(h)>=HOLE)]);
  try{const r=pc.intersection(polys,MASK);return {type:'MultiPolygon',coordinates:r};}catch(e){console.log('clip fail',e.message);return geo;}}   // 행정동 mesh·라벨(sub/subl)을 갖는 시도 — 광주(36 안)는 따로
const GJ=new Set(['동구','서구','남구','북구','광산구']);
const raw=JSON.parse(fs.readFileSync(SRC,'utf8'));
/* 투영 좌표로 바꾼 GeoJSON */
const proj=g=>g.type==='Polygon'?{type:'Polygon',coordinates:g.coordinates.map(r=>r.map(c=>P(c[0],c[1])))}:{type:'MultiPolygon',coordinates:g.coordinates.map(p=>p.map(r=>r.map(c=>P(c[0],c[1]))))};
const feats=raw.features.map(f=>{const p=f.properties,sd=SIDO[p.sido];if(!sd)throw new Error('sido '+p.sido);
  let mk=p.sggnm;const mm=/^(.+?시)(.+구)$/.exec(mk);const cityKey=mm?mm[1]:mk;   // 천안시서북구 → 천안시
  const gj=sd[0]==='36'&&GJ.has(p.sggnm);
  return {type:'Feature',properties:{pc:sd[0],sgg:p.sgg,sggnm:p.sggnm,city:cityKey,dong:p.adm_nm.split(' ').pop(),gj,metro:METRO.has(sd[0])||gj},geometry:proj(f.geometry)};});
const topo0=tjsimp.presimplify(tjs.topology({d:{type:'FeationCollection'.replace('Feation','Feature'),features:feats}},1e4));
/* 두 단계 간략화 — 시도 외곽(전체 보기)은 굵게, 시군구 면·경계(확대)는 곱게. 같은 위상에서 나오므로 이웃끼리 틈이 없다 */
const TOL=Number(process.env.TOL||2),TOLP=Number(process.env.TOLP||4);
const topo=tjsimp.simplify(topo0,TOL*TOL),topoP=tjsimp.simplify(topo0,TOLP*TOLP);
const geoms=topo.objects.d.geometries;
const rnd=v=>Math.round(v);
function pathOf(geo){   // GeoJSON geometry → 상대 path, 작은 고리 제거
  if(!geo)return '';const polys=geo.type==='Polygon'?[geo.coordinates]:geo.type==='MultiPolygon'?geo.coordinates:[];
  let d='';polys.forEach(poly=>poly.forEach(r=>{const q=[];r.forEach(c=>{const p=[rnd(c[0]),rnd(c[1])];if(!q.length||q[q.length-1][0]!==p[0]||q[q.length-1][1]!==p[1])q.push(p);});
    if(q.length>1&&q[0][0]===q[q.length-1][0]&&q[0][1]===q[q.length-1][1])q.pop();
    if(q.length<3)return;let a=0,per=0;for(let i=0;i<q.length;i++){const u=q[i],v=q[(i+1)%q.length];a+=u[0]*v[1]-v[0]*u[1];per+=Math.hypot(v[0]-u[0],v[1]-u[1]);}
    a=Math.abs(a)/2;
    /* 592차: 섬 문턱은 **작고 동글동글한 고리(=섬)** 에만 건다. 사천만 해안선처럼 가늘고 긴 띠(면적은 작지만 둘레가 길다)는 남긴다 —
       591차엔 MINAP 이 이 띠(면적 763·둘레 1213)를 지워 만이 빈 삼각형이 됐다 */
    /* 594차: 문턱은 '동글동글한' 고리(=섬)에만 건다. 면적/둘레² 가 작은 가늘고 긴 띠(사천만 해안선 등)는 크기와 무관하게 남긴다 */
    if(a<Number(process.env.MINA||10)&&a/(per*per)>Number(process.env.THIN||0.004))return;
    /* 592차: 587차의 '실오라기 고리' 제거는 뺐다 — 그 가늘고 긴 고리가 사천만 해안선(직선과 실제 해안 사이의 띠)이었다.
       지우니 만이 통째로 빈 삼각형이 됐다. SLIV 로 켤 수 있게만 남긴다 */
    if(process.env.SLIV&&a<3000&&a/(per*per)<0.003)return;
    d+='M'+q[0][0]+' '+q[0][1];for(let i=1;i<q.length;i++)d+='l'+(q[i][0]-q[i-1][0])+' '+(q[i][1]-q[i-1][1]);d+='z';}));
  return d;}
/* 598차: 끊은 자리를 공식 해안선으로 메운다. COAST= 로 coast-simp.json(지도 좌표 선 묶음, scripts/coast-simp.mjs 가 만든다)을 준다.
   해안선 조각을 격자에 넣어 두고, 끊긴 직선의 주변 상자 안에 드는 조각만 가져다 붙인다 — 자료 전체를 싣지 않으니 용량이 거의 안 는다 */
let COAST=null,CGRID=null;const CG=50;
if(process.env.COAST&&fs.existsSync(process.env.COAST)){
  COAST=JSON.parse(fs.readFileSync(process.env.COAST,'utf8'));CGRID=new Map();
  COAST.forEach((p,i)=>{const cells=new Set();p.forEach(q=>cells.add(Math.floor(q[0]/CG)+'_'+Math.floor(q[1]/CG)));
    cells.forEach(c=>{if(!CGRID.has(c))CGRID.set(c,[]);CGRID.get(c).push(i);});});
  console.log('해안선 조각',COAST.length);}
function coastFill(a,b,pad){   /* 직선 a→b 를 감싸는 상자 안의 해안선 조각을 path 로 */
  if(!COAST)return '';
  const x0=Math.min(a[0],b[0])-pad,x1=Math.max(a[0],b[0])+pad,y0=Math.min(a[1],b[1])-pad,y1=Math.max(a[1],b[1])+pad;
  const ids=new Set();
  for(let cx=Math.floor(x0/CG);cx<=Math.floor(x1/CG);cx++)for(let cy=Math.floor(y0/CG);cy<=Math.floor(y1/CG);cy++)
    (CGRID.get(cx+'_'+cy)||[]).forEach(i=>ids.add(i));
  let d='';
  ids.forEach(i=>{const p=COAST[i];let open=false,prev=null;
    p.forEach(q=>{const inb=q[0]>=x0&&q[0]<=x1&&q[1]>=y0&&q[1]<=y1;
      if(!inb){open=false;prev=q;return;}
      const r=[rnd(q[0]),rnd(q[1])];
      if(!open){d+='M'+r[0]+' '+r[1];open=true;}else if(prev)d+='l'+(r[0]-rnd(prev[0]))+' '+(r[1]-rnd(prev[1]));
      prev=q;});});
  return d;}
/* 590차: 면의 외곽을 '선'으로 — MAXSEG(기본 45 단위 ≈ 7km) 넘는 직선은 공유수면 해상경계라 끊는다. 면(fill)은 그대로, 테두리만 이걸로 그린다 */
function linePath(geo){if(!geo)return '';const MAXSEG=Number(process.env.MAXSEG||45);const polys=geo.type==='Polygon'?[geo.coordinates]:geo.type==='MultiPolygon'?geo.coordinates:[];
  let d='';polys.forEach(poly=>poly.forEach(r=>{const q=[];r.forEach(c=>{const p=[rnd(c[0]),rnd(c[1])];if(!q.length||q[q.length-1][0]!==p[0]||q[q.length-1][1]!==p[1])q.push(p);});
    if(q.length>1&&q[0][0]===q[q.length-1][0]&&q[0][1]===q[q.length-1][1])q.pop();if(q.length<3)return;
    let a=0,per=0;for(let i=0;i<q.length;i++){const u=q[i],v=q[(i+1)%q.length];a+=u[0]*v[1]-v[0]*u[1];per+=Math.hypot(v[0]-u[0],v[1]-u[1]);}a=Math.abs(a)/2;
    if(a<Number(process.env.MINA||10)&&a/(per*per)>Number(process.env.THIN||0.004))return;   /* ⚠ pathOf 와 같은 규칙이어야 한다 — 예전 '실오라기' 필터가 남아 사천만 해안 띠가 선에서만 빠졌다 */
    let open=false;for(let i=0;i<q.length;i++){const u=q[i],v=q[(i+1)%q.length];
      if(Math.hypot(v[0]-u[0],v[1]-u[1])>MAXSEG){open=false;d+=coastFill(u,v,Number(process.env.CPAD||12));continue;}
      if(!open){d+='M'+u[0]+' '+u[1];open=true;}d+='l'+(v[0]-u[0])+' '+(v[1]-u[1]);}}));return d;}
function meshPath(lines){if(!lines)return '';const segs=lines.type==='LineString'?[lines.coordinates]:lines.coordinates;let d='';
  segs.forEach(r=>{const q=[];r.forEach(c=>{const p=[rnd(c[0]),rnd(c[1])];if(!q.length||q[q.length-1][0]!==p[0]||q[q.length-1][1]!==p[1])q.push(p);});
    if(q.length<2)return;
    /* 선분 중점이 육지 밖이면 끊는다(공유수면 위 경계) — 끊긴 자리마다 새 M */
    const MAXSEG=Number(process.env.MAXSEG||45);
    let open=false;for(let i=1;i<q.length;i++){const a=q[i-1],b=q[i];const keep=inMask((a[0]+b[0])/2,(a[1]+b[1])/2)&&Math.hypot(b[0]-a[0],b[1]-a[1])<=MAXSEG;   /* 긴 직선(해상경계)도 끊는다 */
      if(!keep){open=false;continue;}
      if(!open){d+='M'+a[0]+' '+a[1];open=true;}
      d+='l'+(b[0]-a[0])+' '+(b[1]-a[1]);}});return d;}
/* 네모 — 큰 고리(본체)에서 시작해 GAP(기본 60 단위 ≈ 9km) 안에 있는 고리를 이어 붙인다. 멀리 떨어진 섬(백령·흑산·추자·울릉·격렬비열도)은
   네모에서 빠진다 — 이전(2018) 파일의 네모와 같은 취지. 면·선 path 에는 섬이 그대로 있다 */
function bbox(geo){const polys=geo.type==='Polygon'?[geo.coordinates]:geo.coordinates;const GAP=Number(process.env.GAP||60);
  const rs=polys.map(p=>{const r=p[0];let a=0,x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(let i=0;i<r.length;i++){const u=r[i],v=r[(i+1)%r.length];a+=u[0]*v[1]-v[0]*u[1];x0=Math.min(x0,u[0]);y0=Math.min(y0,u[1]);x1=Math.max(x1,u[0]);y1=Math.max(y1,u[1]);}return {a:Math.abs(a)/2,b:[x0,y0,x1,y1]};});
  rs.sort((p,q)=>q.a-p.a);let B=rs[0].b.slice();const used=new Set([0]);let grew=true;
  while(grew){grew=false;rs.forEach((r,i)=>{if(used.has(i))return;const c=r.b;if(c[0]<=B[2]+GAP&&c[2]>=B[0]-GAP&&c[1]<=B[3]+GAP&&c[3]>=B[1]-GAP){used.add(i);B=[Math.min(B[0],c[0]),Math.min(B[1],c[1]),Math.max(B[2],c[2]),Math.max(B[3],c[3])];grew=true;}});}
  return B.map(rnd);}
const old=OLD?(()=>{global.window={};eval(fs.readFileSync(OLD,'utf8'));return window.KRGEO;})():null;
const out={k,s,t,prov:[],provl:{},mesh:{},sub:{},muni:{},subl:{},dong:{},bjd:old?old.bjd:{},mpoly:{},gj:''};
const pcs=[...new Set(geoms.map(g=>g.properties.pc))].sort();
pcs.forEach(pc=>{
  const sd=Object.values(SIDO).find(x=>x[0]===pc);
  const mine=geoms.filter(g=>g.properties.pc===pc);
  const merged=clipGeo(tjc.merge(topo,mine));const bb=bbox(merged);
  const mergedP=clipGeo(tjc.merge(topoP,topoP.objects.d.geometries.filter(g=>g.properties.pc===pc)));
  const op=old&&old.prov.find(f=>f[0]===pc);
  const MINA0=process.env.MINA;process.env.MINA=process.env.MINAP||60;const pp=pathOf(mergedP);process.env.MINA=MINA0||'';
  out.prov.push([pc,sd[1],sd[2],op?op[3]:rnd((bb[0]+bb[2])/2),op?op[4]:rnd((bb[1]+bb[3])/2),...bb,pp]);
  /* 600차: 테두리 선은 **곱게 간략화한 면**(merged, TOL)에서 뽑는다 — 거칠게(TOLP) 줄인 면에서는 사천만 해안처럼 폭이 좁은 띠가
     통째로 사라져 그 구간 선이 안 그려졌다. 면적 문턱은 채우기와 같게(MINAP) 두어 섬 개수는 맞춘다 */
  {const M0=process.env.MINA;process.env.MINA=process.env.MINAP||60;out.provl[pc]=linePath(merged);process.env.MINA=M0||'';}
  out.mesh[pc]=meshPath(tjc.mesh(topo,topo.objects.d,(a,b)=>a!==b&&a.properties.pc===pc&&b.properties.pc===pc&&a.properties.city!==b.properties.city));
  const metro=mine.some(g=>g.properties.metro);
  if(metro){out.sub[pc]=meshPath(tjc.mesh(topo,topo.objects.d,(a,b)=>a!==b&&a.properties.pc===pc&&b.properties.pc===pc&&a.properties.metro&&b.properties.metro&&a.properties.city===b.properties.city));
    out.subl[pc]=[];}
  /* 시군구(구는 시로 합침) */
  const cities=[...new Set(mine.map(g=>g.properties.city))];
  out.muni[pc]=[];out.mpoly[pc]=[];
  cities.forEach(c=>{const gs=mine.filter(g=>g.properties.city===c);const m=clipGeo(tjc.merge(topo,gs));const b=bbox(m);
    const nm=/구$/.test(c)&&!/시/.test(c)?c:c.replace(/(특별자치)?(시|군)$/,'');
    out.muni[pc].push([nm,rnd((b[0]+b[2])/2),rnd((b[1]+b[3])/2),Math.max(b[2]-b[0],b[3]-b[1]),...b]);
    out.mpoly[pc].push([nm,gs[0].properties.sgg.slice(0,5),pathOf(m)]);});
  out.dong[pc]=[];const base={};
  mine.forEach(g=>{const f=tjc.feature(topo,g);const b=bbox(f.geometry);const x=rnd((b[0]+b[2])/2),y=rnd((b[1]+b[3])/2);
    out.dong[pc].push([g.properties.dong,x,y]);
    /* 첨단1동·첨단2동 → '첨단동' 도 한 점으로(평균) — 현장명은 숫자 없는 이름을 쓴다. 2018 색인은 통합동이라 그대로 맞았다 */
    const mb=/^(.+?)\d+(동|가|리|읍|면)$/.exec(g.properties.dong);
    if(mb){const nm=mb[1]+mb[2];(base[nm]=base[nm]||[]).push([x,y]);}
    if(metro&&g.properties.metro)out.subl[pc].push([g.properties.dong,x,y,Math.max(b[2]-b[0],b[3]-b[1])]);});
  for(const nm in base){if(!out.dong[pc].some(d=>d[0]===nm)){const a=base[nm];out.dong[pc].push([nm,rnd(a.reduce((p,q)=>p+q[0],0)/a.length),rnd(a.reduce((p,q)=>p+q[1],0)/a.length)]);}}
  if(pc==='36'){out.gj=linePath(clipGeo(tjc.merge(topo,mine.filter(g=>g.properties.gj))));}
});
const head=`/* 대한민국 행정 경계 — vuski/admdongkor HangJeongDong_ver20260701 (행정동, CC BY 4.0 · 원자료 통계청/행안부) 기준으로
   scripts/geo2026.mjs 가 만든다(585차). 이전 버전은 SGIS 2018 이었다.
   투영: 메르카토르. x = k·(s·lon(rad) + t[0]), y = k·(t[1] − s·ln tan(π/4 + lat/2)). 단위 ≈ 150m.
   prov: [코드(SGIS식), 약칭, 정식, 라벨x, 라벨y, bx0,by0,bx1,by1, path]   mesh: 시도 안 시군구 경계(중복 없는 선)
   sub: 광역시·광주 안 행정동 경계   subl: 그 행정동 라벨 [이름,x,y,크기]   muni: [이름,x,y,크기,bbox…] (구는 시로 합침, 광역시는 구)
   provl: 시도 외곽 '선'(공유수면 해상경계 직선은 끊음 — 테두리는 이걸로)   dong: 행정동 중심 [이름,x,y](현장명→좌표 색인)   bjd: 법정동 중심(이전 파일 그대로)   mpoly: 시군구 면 [이름, 행정코드, path]   gj: 광주 외곽선 */
window.KRGEO=`;
fs.writeFileSync(OUT,head+JSON.stringify(out)+';\n');
const sz=fs.statSync(OUT).size;console.log('written',sz,'prov',out.prov.length,'muni',Object.values(out.muni).reduce((a,b)=>a+b.length,0),'dong',Object.values(out.dong).reduce((a,b)=>a+b.length,0));
