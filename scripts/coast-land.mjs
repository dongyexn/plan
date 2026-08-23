/* 국립해양조사원 2026 해안선(선) → 육지 폴리곤(GeoJSON, WGS84).
   1) 끝점이 정확히 맞는 선을 이어 붙인다 → 섬은 닫힌 고리, 본토는 몇 개의 열린 사슬.
   2) 열린 사슬은 끝점이 가까운 것끼리 이어 본토 해안선 하나로 만든다(하구·부두에서 갈라진 자리).
   3) 본토는 DMZ 에서 끊기므로 북쪽으로 크게 둘러 닫는다(북쪽 바다는 행정경계가 없어 무해).  */
import fs from 'fs';import * as sf from 'shapefile';import proj4 from 'proj4';
const dir=fs.readdirSync('/root/work/cl')[0];const d='/root/work/cl/'+dir;
const base=d+'/'+fs.readdirSync(d).find(f=>f.endsWith('.shp')).replace(/\.shp$/,'');
proj4.defs('EPSG:5186','+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs');
const to=proj4('EPSG:5186','EPSG:4326');
const src=await sf.open(base+'.shp',base+'.dbf',{encoding:'euc-kr'});
const R=1e3,key=p=>Math.round(p[0]*R)+'_'+Math.round(p[1]*R);
const segs=[];
while(true){const r=await src.read();if(r.done)break;const g=r.value.geometry;if(!g)continue;
  (g.type==='LineString'?[g.coordinates]:g.coordinates).forEach(l=>{if(l.length>1)segs.push(l);});}
const ends=new Map();segs.forEach((s,i)=>{[key(s[0]),key(s[s.length-1])].forEach(k=>{if(!ends.has(k))ends.set(k,[]);ends.get(k).push(i);});});
const used=new Uint8Array(segs.length);const rings=[];
for(let i=0;i<segs.length;i++){if(used[i])continue;used[i]=1;let ring=segs[i].slice();
  for(let g2=0;g2<300000;g2++){const k=key(ring[ring.length-1]);const cand=(ends.get(k)||[]).filter(j=>!used[j]);
    if(!cand.length)break;const j=cand[0];used[j]=1;const s=segs[j];
    ring=key(s[0])===k?ring.concat(s.slice(1)):ring.concat(s.slice().reverse().slice(1));
    if(key(ring[0])===key(ring[ring.length-1]))break;}
  rings.push({ring,closed:key(ring[0])===key(ring[ring.length-1])});}
let open=rings.filter(r=>!r.closed).map(r=>r.ring).sort((a,b)=>b.length-a.length);
const closed=rings.filter(r=>r.closed).map(r=>r.ring);
console.log('closed',closed.length,'open',open.length);
/* 열린 사슬 잇기 */
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
let cur=open.shift();
/* 앞뒤 양쪽으로 이어 붙인다 — 한쪽만 하면 동해안이 통째로 빠진다 */
for(let pass=0;pass<2;pass++){
  while(open.length){
    const tail=cur[cur.length-1];let bi=-1,brev=false,bd=1e18;
    open.forEach((o,i)=>{const d1=dist(tail,o[0]),d2=dist(tail,o[o.length-1]);
      if(d1<bd){bd=d1;bi=i;brev=false;}if(d2<bd){bd=d2;bi=i;brev=true;}});
    if(bd>Number(process.env.GAPM||300))break;
    const o=open.splice(bi,1)[0];cur=cur.concat(brev?o.slice().reverse():o);
  }
  cur.reverse();
}
console.log('본토 해안선 점',cur.length,'남은 사슬',open.length);
open.forEach(o=>{const A=to.forward(o[0]),B=to.forward(o[o.length-1]);console.log('  남은',o.length,A.map(v=>+v.toFixed(4)),'->',B.map(v=>+v.toFixed(4)));});
/* 북쪽으로 둘러 닫기 */
let ymax=-1e18;cur.forEach(p=>{if(p[1]>ymax)ymax=p[1];});const NY=ymax+150000;
const main=cur.concat([[cur[cur.length-1][0],NY],[cur[0][0],NY],[cur[0][0],cur[0][1]]]);
/* 단순화(DP, 30m) */
function dp(pts,tol){if(pts.length<4)return pts;const keep=new Uint8Array(pts.length);keep[0]=keep[pts.length-1]=1;const st=[[0,pts.length-1]];
  while(st.length){const [a,b]=st.pop();let md=-1,mi=-1;const [ax,ay]=pts[a],[bx,by]=pts[b];const dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy;
    for(let i=a+1;i<b;i++){const [px,py]=pts[i];let dd;if(L===0)dd=Math.hypot(px-ax,py-ay);else{const u=((px-ax)*dx+(py-ay)*dy)/L;dd=Math.hypot(px-(ax+u*dx),py-(ay+u*dy));}if(dd>md){md=dd;mi=i;}}
    if(md>tol){keep[mi]=1;st.push([a,mi],[mi,b]);}}return pts.filter((_,i)=>keep[i]);}
const TOL=Number(process.env.CTOL||30);
const ar=r=>{let a=0;for(let i=0;i<r.length;i++){const u=r[i],v=r[(i+1)%r.length];a+=u[0]*v[1]-v[0]*u[1];}return Math.abs(a)/2;};
const MIN=Number(process.env.CMIN||2e4);   // 0.02 km² 미만 섬 버림
const polys=[dp(main,TOL)].concat(closed.filter(r=>ar(r)>=MIN).map(r=>dp(r,TOL)));
const ll=polys.map(r=>[r.map(p=>to.forward(p).map(v=>+v.toFixed(5)))]);
const gj={type:'FeatureCollection',features:[{type:'Feature',properties:{src:'국립해양조사원 2026 해안선'},geometry:{type:'MultiPolygon',coordinates:ll}}]};
fs.writeFileSync('/root/work/coast-land.geojson',JSON.stringify(gj));
console.log('폴리곤',polys.length,'점',polys.reduce((a,b)=>a+b.length,0),'크기',fs.statSync('/root/work/coast-land.geojson').size);
