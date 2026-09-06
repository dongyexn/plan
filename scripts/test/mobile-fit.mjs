/* 가상데이터 전 구간 검증(637차 기준 회귀 스위트) — 업로드→저장→[등록]→소비 화면 전부를 실브라우저에서 돌린다.
   Firebase 는 페이지 안 가짜 트리로 대체(스냅샷 문서의 FB 스텁과 같은 발상 + update/set 구현).
   검사: 기준월 자동 결정 · 게시 트리 무결성 · 대시보드 합계=게시 kpi 합 · 현장 탭 5종 렌더 ·
   사용: CHROMIUM=/tmp/chromium node scripts/test/e2e-defect.mjs */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','..');
/* 665차: 기본 저장 위치를 저장소 밖(OS 임시 폴더)으로 옮긴다 —
   예전엔 저장소 안 e2e/ 에 쌓여 배포 zip 이 3MB 커졌다. 보고 싶으면 E2E_OUT 을 준다. */
const EOUT=process.env.E2E_OUT || path.join(os.tmpdir(),'calapp-e2e');
fs.mkdirSync(EOUT,{recursive:true});
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png'};
const srv=http.createServer((req,res)=>{const u=req.url.split('?')[0];const f=path.join(root,u==='/'?'index.html':u);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));}).listen(8519);

let fail=0;const ok=(n,c)=>{console.log((c?'✓ ':'✗ ')+n);if(!c)fail++;};
const exe=process.env.CHROMIUM||'';
const br=await chromium.launch(Object.assign({args:['--no-sandbox']},exe?{executablePath:exe}:{}));   /* CI 는 Playwright 설치본, 로컬은 CHROMIUM 경로 */
const pg=await br.newPage({viewport:{width:1560,height:1000},deviceScaleFactor:2});
const perr=[];pg.on('pageerror',e=>perr.push(e.message));
await pg.goto('http://localhost:8519/index.html?local=1');
await pg.waitForTimeout(1200);

/* ── 1) 조직 시드 + 가상 HCS CSV 생성 + 업로드 ── */
const up=await pg.evaluate(async()=>{
  /* 조직 — 실사용 규모의 축소판: 6개 운영 현장 + 인수 전 1 */
  S.org.teams=[{id:'t1',name:'H서비스중부팀'}];
  S.org.regions=[{id:'중부1',name:'중부1'},{id:'중부2',name:'중부2'},{id:'광주',name:'광주'},{id:'인수 전 현장',name:'인수 전 현장'}];
  const SITES=[
    {id:'sA',name:'힐스테이트 두정역',region:'중부1',units:1100,buildings:12,commercialUnits:24,completionDate:'2025-03-31',hasCommercial:true},
    {id:'sB',name:'힐스테이트 레이크 송도',region:'중부2',units:860,buildings:9,commercialUnits:0,completionDate:'2024-11-30'},
    {id:'sC',name:'힐스테이트 세종 리버파크',region:'중부1',units:1520,buildings:15,commercialUnits:36,completionDate:'2025-08-31',hasCommercial:true},
    {id:'sD',name:'힐스테이트 광주 첨단',region:'광주',units:720,buildings:8,commercialUnits:0,completionDate:'2026-01-31'},
    {id:'sE',name:'힐스테이트 평택 브레인시티',region:'중부2',units:1340,buildings:14,commercialUnits:0,completionDate:'2026-05-31'},
    {id:'sF',name:'힐스테이트 청주 가경',region:'중부1',units:980,buildings:10,commercialUnits:18,completionDate:'2025-12-31',hasCommercial:true},
    {id:'sZ',name:'힐스테이트 아산 배방',region:'인수 전 현장',units:1210,buildings:13,commercialUnits:0,completionDate:'2026-11-30'},
  ];
  S.org.sites=SITES.map(x=>({team:'t1',...x}));
  /* 가상 하자 행 — 현시점(오늘) 기준: 접수 2024-09~오늘, 미처리 지연일은 실제 경과일 */
  const TODAY=new Date();const pad=n=>String(n).padStart(2,'0');
  const ds=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const TODAYS=ds(TODAY);
  let seed=20260825;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const TR=['도배','타일','마루','창호','가구','도장','전기','설비','미장','잡철','조경','승강기','방수','수장','금속'];
  const CO=['','대한인테리어','한빛설비','우주도배','태성타일','명진창호','그린조경','서울전기','동아방수','미래가구'];
  const SP=['거실','안방','주방','욕실1','욕실2','발코니','현관','침실2','다용도실'];
  const CT=['벽지 이음부 들뜸 확인 요청','타일 줄눈 균열','마루 찍힘 및 들뜸','창호 잠금장치 뻑뻑함','상부장 문짝 처짐','도장면 얼룩','콘센트 커버 파손','배수 더딤 점검 요청',
    '천장 누수 흔적 확인 바람, 윗세대 확인 필요','세대 현관문 도어클로저 소음','실리콘 오염 재시공 요청','걸레받이 들뜸',
    '승강기 갇힘 발생 — 즉시 확인 요청','언론 제보하겠다고 강하게 항의','보상 요구 — 도배 재시공 및 피해 보상','입주자 홍길동님 010-2345-6789 재방문 요청'];
  const rows=[];let no=1;
  const push=(site,rd,done,extra)=>{
    const rdD=new Date(rd);
    let comp='';let delay=0;
    if(done){const t=new Date(rd);t.setDate(t.getDate()+Math.floor(rnd()*rnd()*160));if(t>TODAY)t.setTime(TODAY.getTime());comp=ds(t);}
    else{delay=Math.max(0,Math.round((TODAY-rdD)/86400000));}
    const store=extra&&extra.store;
    const vac=!store&&rnd()<0.1;
    rows.push({
      NO:no++,현장:site.name,현장코드:'C'+site.id,
      동:store?('상가'+(1+Math.floor(rnd()*3))+'동'):String(101+Math.floor(rnd()*site.buildings))+'동',
      호:store?String(101+Math.floor(rnd()*8)):String((1+Math.floor(rnd()*20))*100+1+Math.floor(rnd()*4)),
      공종:extra&&extra.trade||TR[Math.floor(rnd()*TR.length)],
      하자유형:extra&&extra.dtype||['들뜸','균열','오염','파손','작동불량','소음'][Math.floor(rnd()*6)],
      중대하자유형:extra&&extra.crit||'',
      하자구분:store?'공용':'세대',
      접수일:rd,처리확인일:comp,처리상태:done?'처리완료':'미처리',
      지연일:delay,보수주체:rnd()<0.5?'시공업체':'직영',
      시공업체:CO[Math.floor(rnd()*CO.length)],보수업체:'',
      입주상태:vac?(rnd()<0.5?'미분양':'미입주'):'입주완료',
      세대구분:'세대',입점여부:store?(rnd()<0.3?'N':'Y'):'Y',
      공간:SP[Math.floor(rnd()*SP.length)],
      접수내용:extra&&extra.txt||CT[Math.floor(rnd()*CT.length)],
      민원:extra&&extra.cmp||(rnd()<0.04?'재발 민원':''),
    });
  };
  const OPS=S.org.sites.filter(s=>s.region!=='인수 전 현장');
  for(const site of OPS){
    const n=600+Math.floor(rnd()*1200);
    for(let i=0;i<n;i++){
      /* 접수일 — 최근일수록 많게(월간 증가 추세), 오늘까지 */
      const back=Math.floor(Math.pow(rnd(),1.6)*690);      /* 0~690일 전 */
      const d=new Date(TODAY);d.setDate(d.getDate()-back);
      push(site,ds(d),rnd()<(back>60?0.86:0.35),{store:site.hasCommercial&&rnd()<0.06});
    }
    /* 중대하자 후보 시나리오 — 규칙(critReason) 경로를 실제로 지나게 */
    push(site,TODAYS,false,{trade:'승강기',txt:'승강기 갇힘 발생 — 즉시 확인 요청'});
    push(site,ds(new Date(TODAY-86400000*3)),false,{crit:'누수',trade:'방수',txt:'천장 누수 재발, 아랫세대 피해 보상 요구',cmp:'피해 보상 요구'});
    push(site,ds(new Date(TODAY-86400000*40)),false,{txt:'언론 제보하겠다고 강하게 항의'});
  }
  /* 인수 전 현장에도 소량 — 대시보드 제외·현장 게시 포함 경로 검증 */
  for(let i=0;i<40;i++){const d=new Date(TODAY);d.setDate(d.getDate()-Math.floor(rnd()*60));push(S.org.sites.find(s=>s.id==='sZ'),ds(d),rnd()<0.4,{});}
  /* CSV 조립(따옴표·쉼표 이스케이프) + 머리 잡동사니 행(findHeaderRow 경로) */
  const HS=Object.keys(rows[0]);
  const cell=v=>{const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
  const csv='하자 리스트 추출본,,\n생성일: '+TODAYS+',,\n'+HS.join(',')+'\n'+rows.map(r=>HS.map(h=>cell(r[h])).join(',')).join('\n');
  /* 업로드 — 실제 onFile 경로(파일→rCSV→handleParsed→confirmUL→doSaveUL) */
  window.confirm=()=>true;   /* 이상 징후 확인·미래 게시월 정리 프롬프트는 자동 승인 */
  const f=new File([new Blob(['\uFEFF'+csv],{type:'text/csv'})],'전체하자목록_'+TODAYS+'.csv',{type:'text/csv'});
  onFile(f);
  await new Promise(r=>{const t=setInterval(()=>{if(Object.keys(S.def).length>=7&&!S._importing){clearInterval(t);r();}},200);setTimeout(()=>{clearInterval(t);r();},30000);});
  return {rows:rows.length,sites:Object.keys(S.def).length,pubRm:S.dfPubRm,
    perSite:Object.fromEntries(Object.keys(S.def).map(k=>[k,S.def[k].length]))};
});
ok('업로드→저장: 7개 현장 '+up.rows.toLocaleString()+'행',up.sites===7);
const wantRm=(()=>{const d=new Date();d.setMonth(d.getMonth()-1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');})();
ok('기준월 자동 결정(전월 상한): '+up.pubRm+' = '+wantRm,up.pubRm===wantRm);

/* ── 2) 가짜 Firebase 주입 + [등록] ── */
const pub=await pg.evaluate(async()=>{
  const tree={};
  const get=(p)=>{let n=tree;for(const k of p.split('/').filter(Boolean)){if(n==null||typeof n!=='object')return null;n=n[k];}return n==null?null:n;};
  const set=(p,v)=>{const ks=p.split('/').filter(Boolean);let n=tree;for(let i=0;i<ks.length-1;i++){n=n[ks[i]]=n[ks[i]]||{};}if(v==null)delete n[ks[ks.length-1]];else n[ks[ks.length-1]]=JSON.parse(JSON.stringify(v));};
  window.__TREE=tree;
  FB.db={ref:(p='')=>({
    once:async()=>({val:()=>get(p)}),
    get:async()=>({val:()=>get(p),exists:()=>get(p)!=null}),
    set:async v=>set(p,v),
    update:async u=>{Object.keys(u).forEach(k=>set((p?p+'/':'')+k,u[k]));},
    on:()=>{},off:()=>{},
  })};
  S.live=true;S.role='editor';S.user={email:'editor@hdec.co.kr'};   /* isEditor()=!live||role — live 전환 시 role 필요 */
  const pubWithOk=async()=>{const p=dfPublish();   /* 게시 전 검토 모달(637차 기준 회귀 스위트) — [게시]를 눌러 승인 */
    for(let i=0;i<50&&!document.querySelector('[data-act="dfp.pubOk"]');i++)await new Promise(r=>setTimeout(r,100));
    const b=document.querySelector('[data-act="dfp.pubOk"]');if(b)b.click();
    await p;};
  window.__pubWithOk=pubWithOk;
  /* 검토 모달 취소 경로 — 요약이 뜨고, 취소하면 아무것도 안 쓴다 */
  let cancelOk=false;
  {const p=dfPublish();
   for(let i=0;i<50&&!document.querySelector('[data-act="dfp.pubCancel"]');i++)await new Promise(r=>setTimeout(r,100));
   const sum=document.querySelector('#mbody')?document.querySelector('#mbody').textContent:'';
   const b=document.querySelector('[data-act="dfp.pubCancel"]');if(b)b.click();
   await p;
   cancelOk=/기준월/.test(sum)&&/전체 접수/.test(sum)&&!Object.keys(tree).length;}
  window.__pubCancelOk=cancelOk;
  await pubWithOk();
  const rm=dfPubRm();
  const dash=get('report/'+rm+'/_dash');
  const idx=get('reportIndex');
  const meta=get('report/'+rm+'/_meta');
  /* 게시 kpi 합(대시보드 제외 규칙 적용) vs 로컬 calc 합 — 소비자가 볼 숫자의 원장 대조 */
  const dfDecT=v=>dfDec(v);
  let pubUnr=0,pubTr=0;
  dfDashSites().forEach(s=>{const k=dfDecT(get('report/'+rm+'/'+s.id+'/kpi'));pubUnr+=k.unr;pubTr+=k.tR;});
  let locUnr=0,locTr=0;
  dfDashSites().forEach(s=>{const st=calc(S.def[s.id]||[],s,rm);locUnr+=st.unr;locTr+=st.tR;});
  return {rm,hasDash:!!dash,dashSites:(dash&&dash.sites||[]).length,ins:!!(dash&&dash.insightsHTML),idx:Object.keys(idx||{}),
    meta:meta&&meta.publishedBy,pubUnr,locUnr,pubTr,locTr,
    zNode:!!get('report/'+rm+'/sZ/kpi')};
});
ok('게시 전 검토 모달 — 요약 표시·취소 시 무기록',await pg.evaluate(()=>window.__pubCancelOk));
ok('[등록] 완료 · _dash/현장/메타/색인 생성',pub.hasDash&&pub.dashSites===7&&pub.ins&&pub.idx.length===1&&pub.meta==='editor@hdec.co.kr');
ok('게시 kpi 합 = 로컬 집계 합 (미처리 '+pub.pubUnr.toLocaleString()+' · 접수 '+pub.pubTr.toLocaleString()+')',pub.pubUnr===pub.locUnr&&pub.pubTr===pub.locTr);
ok('인수 전 현장 — 대시보드 제외·현장 게시 포함',pub.zNode);

/* ── 3) 소비 화면 — 대시보드 ── */
await pg.evaluate(()=>{ORG_RM=dfPubRm();S.dfSid='';go('defect');});
await pg.waitForTimeout(1500);
const dash=await pg.evaluate(()=>{
  const t=document.querySelector('#view-defect').textContent;
  return {hasIns:!!document.querySelector('.rkh')||!!document.querySelector('.ins-grid'),txt:t.slice(0,50)};   /* 712차: 인사이트 자리에 민원 현황(.rkd) */
});
ok('대시보드 렌더(민원 현황 카드 포함)',dash.hasIns);
await pg.screenshot({path:EOUT+'/1-dashboard.png',fullPage:false});

/* ── 4) 현장 화면 — 탭 5종 ── */
/* ── 730차: 모바일 맞춤 검사 ─────────────────────────────────────────
   폰 폭에서 ① 표·막대 안 요소끼리 겹치는지 ② 셀 내용이 잘리는지 ③ 페이지가 가로로 넘치는지.
   「뷰포트 밖으로 나갔나」만 보던 예전 검사는 표 안 겹침을 못 잡았다(v729 에서 실제로 겹쳐 있었다). */
let mfail=0;const mok=(m,c,d)=>{console.log((c?'✓ ':'✗ ')+m+(c?'':' — '+(d||'')));if(!c)mfail++;};
const md=fs.readFileSync('scripts/test/fixtures/risk-gold.md','utf8');const ex=[...md.matchAll(/`(.+?)` \| \[/g)].map(m=>m[1]);
await pg.evaluate(async(ex)=>{for(const sid of Object.keys(S.def)){const rows=S.def[sid]||[];rows.forEach((x,i)=>{if(i%4===0&&ex[i%ex.length])x.receiptContent=ex[i%ex.length];x.building=String(101+(i%12));x.unit=String(101+(i%40)*3);});}
  S.defVer=(S.defVer||0)+1;_calcCache.clear();Object.keys(DF.kpi).forEach(k=>delete DF.kpi[k]);delete DF.cache[dfRm()];await window.__pubWithOk();},ex);
const probe=()=>pg.evaluate(()=>{
  const bad=[],cut=[];
  for(const tr of document.querySelectorAll('#view-defect table tr,#mb table tr,.mom-row,.ltrmom-row,.rkd-r,.rkh-r')){
    const boxes=[];
    for(const c of [...tr.children])for(const n of (c.children.length?c.children:[c])){
      if(!n.getClientRects||!n.getClientRects().length)continue;const b=n.getBoundingClientRect();if(b.width<2||b.height<2)continue;
      boxes.push({b,t:(n.textContent||'').trim().slice(0,12)});}
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const A=boxes[i].b,B=boxes[j].b;
      const ox=Math.min(A.right,B.right)-Math.max(A.left,B.left),oy=Math.min(A.bottom,B.bottom)-Math.max(A.top,B.top);
      if(ox>2&&oy>2)bad.push(boxes[i].t+'⨯'+boxes[j].t+' '+Math.round(ox)+'px');}}
  for(const el of document.querySelectorAll('#view-defect td,#view-defect th,#mb td,#mb th,.seg-v,.lm-stat')){
    if(!el.getClientRects().length)continue;const cs=getComputedStyle(el);
    if(el.scrollWidth>el.clientWidth+2&&cs.overflow!=='visible'&&!/ellipsis/.test(cs.textOverflow))cut.push((el.textContent||'').trim().slice(0,12)+' '+el.clientWidth+'<'+el.scrollWidth);}
  return {bad:[...new Set(bad)].slice(0,6),cut:[...new Set(cut)].slice(0,6),dsw:document.documentElement.scrollWidth,vw:innerWidth};});
const steps=[['대시보드',()=>pg.evaluate(()=>{closeModal&&closeModal();S.dfSid='';go('defect');})],
 ['현장 종합',()=>pg.evaluate(()=>{S.dfSid='sA';S.dfTab='sum';go('defect');})],
 ['장기미처리',()=>pg.evaluate(()=>{S.dfTab='lt';rDefect();})],
 ['민원 현황',()=>pg.evaluate(()=>{S.dfTab='risk';rDefect();})],
 ['상세 현황',()=>pg.evaluate(()=>{S.dfTab='det';rDefect();})],
 ['공가세대',()=>pg.evaluate(()=>{S.dfTab='vac';rDefect();})],
 ['목록 모달',()=>pg.evaluate(async()=>{S.dfTab='sum';rDefect();await new Promise(r=>setTimeout(r,300));await recOpen('sA','ul');})]];
for(const [dev,w,h] of [['375',375,812],['390',390,844],['360',360,800]]){
  await pg.setViewportSize({width:w,height:h});await pg.waitForTimeout(400);
  for(const [nm,f] of steps){await f();await pg.waitForTimeout(800);const r=await probe();
    mok(dev+'px '+nm,!r.bad.length&&!r.cut.length&&r.dsw<=r.vw+1,
      (r.bad.length?'겹침 '+r.bad.join(' | '):'')+(r.cut.length?' 잘림 '+r.cut.join(' | '):'')+(r.dsw>r.vw+1?' 가로넘침 '+r.dsw+'/'+r.vw:''));}
}
/* 731차: 데스크톱 폭에서도 화면이 가로로 밀리면 안 된다 — aspect-ratio 카드가 min-height×비율만큼 폭을 키워 1024~1100 에서 스크롤이 생겼다 */
for(const w of [1024,1100,1180,1280,1366,1440,1600,1920]){
  await pg.setViewportSize({width:w,height:820});
  for(const [nm,f] of [['대시보드',()=>pg.evaluate(()=>{closeModal&&closeModal();S.dfSid='';go('defect');})],['현장 종합',()=>pg.evaluate(()=>{S.dfSid='sA';S.dfTab='sum';go('defect');})]]){
    await f();await pg.waitForTimeout(900);
    const r=await pg.evaluate(()=>{const v=document.querySelector('#view-defect');return {doc:document.documentElement.scrollWidth,vw:innerWidth,cw:v.clientWidth,sw:v.scrollWidth};});
    mok(w+'px '+nm+' 가로 스크롤 없음',r.doc<=r.vw+1&&r.sw<=r.cw+1,'doc '+r.doc+'/'+r.vw+' view '+r.sw+'/'+r.cw);}
}
await br.close();console.log(mfail?('MOBILE-FIT FAIL '+mfail):'MOBILE-FIT ALL PASS');process.exit(mfail?1:0);
