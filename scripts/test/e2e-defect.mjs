/* 가상데이터 전 구간 검증(637차 기준 회귀 스위트) — 업로드→저장→[등록]→소비 화면 전부를 실브라우저에서 돌린다.
   Firebase 는 페이지 안 가짜 트리로 대체(스냅샷 문서의 FB 스텁과 같은 발상 + update/set 구현).
   검사: 기준월 자동 결정 · 게시 트리 무결성 · 대시보드 합계=게시 kpi 합 · 현장 탭 5종 렌더 ·
   NLQ 질의 · 목록 모달 · 월 전환 · AI 분석(가짜 Azure AI Foundry) · 페이지 오류 0. 스크린샷 저장.
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
const OUT=process.env.E2E_OUT || path.join(os.tmpdir(),'calapp-e2e');
fs.mkdirSync(OUT,{recursive:true});
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png'};
const srv=http.createServer((req,res)=>{const u=req.url.split('?')[0];const f=path.join(root,u==='/'?'index.html':u);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));}).listen(8399);

let fail=0;const ok=(n,c)=>{console.log((c?'✓ ':'✗ ')+n);if(!c)fail++;};
const exe=process.env.CHROMIUM||'';
const br=await chromium.launch(Object.assign({args:['--no-sandbox']},exe?{executablePath:exe}:{}));   /* CI 는 Playwright 설치본, 로컬은 CHROMIUM 경로 */
const pg=await br.newPage({viewport:{width:1560,height:1000},deviceScaleFactor:2});
const perr=[];pg.on('pageerror',e=>perr.push(e.message));
await pg.goto('http://localhost:8399/index.html?local=1');
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
  return {hasIns:!!document.querySelector('.ins-grid'),txt:t.slice(0,50)};
});
ok('대시보드 렌더(주요이슈 카드 포함)',dash.hasIns);
await pg.screenshot({path:OUT+'/1-dashboard.png',fullPage:false});

/* ── 4) 현장 화면 — 탭 5종 ── */
for(const [tab,name] of [['sum','종합'],['lt','장기미처리'],['vac','공가세대'],['store','공가상가'],['det','상세 현황']]){
  await pg.evaluate(t=>{S.dfSid='sA';S.dfTab=t;go('defect');rDefect();},tab);
  await pg.waitForTimeout(900);
  const r=await pg.evaluate(t=>({len:document.querySelector('#view-defect').textContent.length,
    act:(document.querySelector('.tnav-i.act')||{}).textContent||'',now:S.dfTab}),tab);
  ok('현장 탭 '+name+' 렌더('+r.len+'자 · 활성='+r.act.trim()+')',r.len>300&&r.now===tab);
  await pg.screenshot({path:OUT+'/2-site-'+tab+'.png',fullPage:false});
}

/* ── 5) NLQ — 찾기 질의 ── */
const nlq=await pg.evaluate(async()=>{
  nqOpen(true);
  const i=document.getElementById('nqQ');i.value='두정역 도배 30일 이상';
  rNq();
  await new Promise(r=>setTimeout(r,300));
  const res=document.getElementById('nqRes').textContent;
  const chips=[...document.querySelectorAll('#nqRes .nq-chip')].map(x=>x.textContent);
  const i2=document.getElementById('nqQ');i2.value='홍길동 재방문';rNq();
  await new Promise(r=>setTimeout(r,200));
  const pii=/010-\d{4}-\d{4}/.test(document.getElementById('nqRes').textContent);
  i.value='두정역 도배 30일 이상';rNq();await new Promise(r=>setTimeout(r,200));
  return {chips,hasList:res.includes('전체 목록으로 보기'),pii};
});
ok('NLQ 해석 칩: '+nlq.chips.join(' / '),nlq.chips.length>=3&&nlq.hasList);
ok('NLQ 미리보기 PII 마스킹(전화번호 무노출)',!nlq.pii);
await pg.screenshot({path:OUT+'/3-nlq.png',fullPage:false});

/* ── 6) NLQ → 목록 모달 인계 ── */
await pg.evaluate(()=>{document.querySelector('[data-act="nq.list"]').click();});
await pg.waitForTimeout(1200);
const rec=await pg.evaluate(()=>{
  const m=document.querySelector('#mo.open');
  return {open:!!m,txt:m?m.textContent.slice(0,120):''};
});
ok('목록 모달 열림(조건 인계)',rec.open);
await pg.screenshot({path:OUT+'/4-list-modal.png',fullPage:false});
await pg.evaluate(()=>closeModal());

/* ── 7) 둘째 달 게시 → 월 전환 ── */
const mo2=await pg.evaluate(async()=>{
  const cur=dfPubRm();
  const d=new Date(cur+'-01');d.setMonth(d.getMonth()-1);
  const prev=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  window.confirm=()=>false;   /* 미래월 정리 프롬프트 — 과거월 수정 게시라 최신월을 지우면 안 된다 */
  S.dfPubRm=prev;await window.__pubWithOk();S.dfPubRm=cur;
  window.confirm=()=>true;
  return {prev,idx:Object.keys((window.__TREE.reportIndex)||{}).sort()};
});
ok('전월('+mo2.prev+') 추가 게시 · 색인 2개월',mo2.idx.length===2);
await pg.evaluate(prev=>{S.dfRmSel=prev;S.dfSid='';rDefect();},mo2.prev);
await pg.waitForTimeout(1000);
/* ⚠ 672차: 대시보드 카드의 '{기준월} 게시본' 칩을 없앴다(제목과 중복). 화면에서 기준월을 알리는 자리는
   상단바 #tbRm 하나다 — 검사도 그쪽을 본다. 화면이 실제로 그려졌는지는 본문 길이로 함께 확인한다. */
const swch=await pg.evaluate(prev=>{
  const rm=document.getElementById('tbRm');
  return {tb:rm?rm.textContent.trim():'', hidden:rm?rm.hidden:true, cur:S.dfRm, body:document.querySelector('#view-defect').textContent.length, want:prev};
},mo2.prev);
ok('기준월 전환 렌더('+mo2.prev+' · 상단바 "'+swch.tb+'")',swch.cur===swch.want&&swch.tb===swch.want&&!swch.hidden&&swch.body>500);
await pg.screenshot({path:OUT+'/5-month-switch.png',fullPage:false});
await pg.evaluate(()=>{S.dfRmSel='';rDefect();});
await pg.waitForTimeout(600);

/* ── 8) AI 분석 — 가짜 Gemini ── */
const ai=await pg.evaluate(async()=>{
  /* 671차: 연결 정보는 Firebase aiConf 리프에서 온다 — S.az* 를 직접 넣으면 aiConfLoad 가 덮어쓴다.
     리프에 심어 실제 경로(aiConfLoad → S.az* → AI.ready)를 그대로 태운다. */
  window.__TREE.aiConf={endpoint:'https://e2e.services.ai.azure.com',deployment:'e2e-dep',key:'vk-test'};
  const calls=[];
  window.fetch=async(url,opt)=>{calls.push(url);
    const body=JSON.parse(opt.body);   /* Azure chat completions 모양 — messages[0]=규칙, messages[1]=데이터 */
    const sys=body.messages[0].content||'',usr=body.messages[1].content||'';
    const isDash=/line1/.test(sys)||/line1/.test(usr);
    const text=isDash?JSON.stringify([{line1:'<b>AI</b> 요약 1',line2:'세부 1'},{line1:'요약 2',line2:'세부 2'},{line1:'요약 3',line2:'세부 3'}])
      :'<div style="font-weight:700">종합 소견</div><ul><li>미처리 상위 공종 집중 보수 필요</li><li>장기 미처리 30건 — 주간 단위 감축 계획 권고</li></ul>';
    /* ⚠ 675차: provider 가 r.ok·r.status 를 보고 r.text() 로 읽는다(프록시가 HTML 을 주는 경우 대비) —
       가짜 응답도 Response 모양을 갖춰야 한다. json() 만 있으면 첫 줄에서 TypeError 가 난다. */
    return {ok:true,status:200,text:async()=>JSON.stringify({choices:[{message:{content:text},finish_reason:'stop'}]})};
  };
  S.dfSid='sA';S.dfTab='sum';rDefect();
  await new Promise(r=>setTimeout(r,400));
  await runAI('sA');
  await new Promise(r=>setTimeout(r,300));
  const leafFull=(window.__TREE.analysis&&window.__TREE.analysis.sA&&window.__TREE.analysis.sA[dfPubRm()])||'';
  const leaf=/종합 소견/.test(leafFull)?'종합 소견':leafFull.slice(0,30);
  delete DF.ana.sA;await dfLoadAna('sA');rDefect();
  await new Promise(r=>setTimeout(r,300));
  const shown=document.getElementById('dfAit')?document.getElementById('dfAit').textContent:'';
  /* 686차: runDashAI(대시보드 AI 재작성)를 걷어냈다. 대신 ① 함수·버튼이 정말 사라졌는지
     ② 주요이슈가 [등록] 때 규칙으로 채워졌는지를 본다 — 자동 갱신이 유일한 경로가 됐다. */
  const insLeaf=(window.__TREE.report[dfPubRm()]._dash.insightsHTML)||'';
  return {calls:calls.length,leaf:leaf.slice(0,30),shown:shown.slice(0,30),
    gone:typeof window.runDashAI==='undefined',
    btn:!!document.querySelector('[data-act="dfp.dashAi"]'),
    ins:/ic-ttl/.test(insLeaf)};
});
ok('runAI → analysis 리프 기록·화면 반영: "'+ai.shown+'…"',ai.calls>=1&&/종합 소견/.test(ai.leaf)&&/종합 소견/.test(ai.shown));
ok('주요이슈 — AI 재작성 경로 제거(함수·버튼 없음) · 규칙기반 자동 갱신만 남음',ai.gone&&!ai.btn&&ai.ins);

/* ── 686차: 원본이 없는 현장을 0 으로 덮지 않는지 ─────────────────────────
   현장 3개만 올린 PC 에서 [등록]을 누르면 나머지 현장 게시본이 통째로 0 이 되던 결함.
   S.def 에서 두 현장을 지운 뒤 재게시하고, 그 현장 kpi 가 그대로 남는지 본다. */
const keep=await pg.evaluate(async()=>{
  const rm=dfPubRm(),ids=Object.keys(S.def);
  const drop=ids.slice(0,2),live=ids.slice(2);
  const before={};drop.forEach(id=>{before[id]=(window.__TREE.report[rm][id]||{}).kpi;});
  const bT=before[drop[0]]&&before[drop[0]].tR;
  drop.forEach(id=>{delete S.def[id];});
  window.__PUBOK_AUTO__=true;
  const p=dfPublish();
  await new Promise(r=>setTimeout(r,300));
  if(window.__PUBOK__)window.__PUBOK__(true);
  await p;
  const after={};drop.forEach(id=>{after[id]=(window.__TREE.report[rm][id]||{}).kpi;});
  return {dropN:drop.length,liveN:live.length,
    beforeTR:bT, afterTR:after[drop[0]]&&after[drop[0]].tR,
    zeroed:drop.some(id=>after[id]&&Number(after[id].tR)===0&&Number(before[id].tR)>0)};
});
ok('원본 없는 현장 — 0 으로 안 덮고 직전 게시본 유지 ('+keep.beforeTR+'→'+keep.afterTR+')',
   !keep.zeroed&&keep.beforeTR===keep.afterTR&&keep.beforeTR>0);

/* ── 686차: 업로드 즉시 이 PC 현장 화면이 로컬 원본으로 바뀌는지 ────────────
   게시본에는 없는 값(kpi 를 통째로 지운 뒤)이라도 로컬 원본이 있으면 화면이 채워져야 한다. */
const lp=await pg.evaluate(async()=>{
  /* ⚠ 앞 검사에서 S.def 의 앞 두 현장을 지웠다 — 원본이 남아 있는 현장을 고른다 */
  const rm=dfPubRm(),sid=Object.keys(S.def).find(k=>(S.def[k]||[]).length);
  const pubTR=(window.__TREE.report[rm][sid].kpi||{}).tR;
  window.__TREE.report[rm][sid].kpi=null;          // 게시본을 비운다
  delete DF.kpi[rm+'/'+sid];delete DF.sw[rm+'/'+sid];delete DF.sam[rm+'/'+sid];delete DF.local[rm+'/'+sid];
  const k=await dfSiteData(sid);
  return {pubTR,locTR:k&&k.tR,local:!!DF.local[rm+'/'+sid],rows:(S.def[sid]||[]).length,
    hasRows:!!dfLocalRows(sid),site:!!dfSites().find(x=>x.id===sid),rm,dfRm:dfRm(),
    calcOK:(()=>{try{const st=dfLocalSiteData(sid,dfRm());return st?st.kpi.tR:'null';}catch(e){return 'ERR '+e.message;}})()};
});
ok('업로드 원본이 있는 현장 — 게시본 없이도 로컬로 화면이 채워진다 ('+lp.locTR+'건 · 로컬표시 '+lp.local+')',
   lp.local===true&&lp.locTR>0&&lp.rows>0);


await pg.evaluate(async()=>{S.dfSid='';delete DF.cache[dfPubRm()];rDefect();});
await pg.waitForTimeout(900);
await pg.screenshot({path:OUT+'/6-ai.png',fullPage:false});

/* ── 9) 공가상가 토글 → 탭 즉시 반영 ── */
const tog=await pg.evaluate(async()=>{
  S.dfSid='sB';S.dfTab='sum';go('defect');rDefect();await new Promise(r=>setTimeout(r,900));
  const before=document.querySelector('#view-defect').textContent.includes('공가상가');
  const st=S.org.sites.find(x=>x.id==='sB');st.hasCommercial=true;dfSiteCfgWrite('sB',st);rDefect();
  await new Promise(r=>setTimeout(r,900));
  const after=document.querySelector('#view-defect').textContent.includes('공가상가');
  const cfg=window.__TREE.siteConfig&&window.__TREE.siteConfig.sB;
  st.hasCommercial=false;dfSiteCfgWrite('sB',st);rDefect();
  return {before,after,cfgW:!!(cfg&&cfg.hasCommercial)};
});
ok('공가상가 토글 → siteConfig 기록·탭 즉시 등장 (before='+tog.before+' after='+tog.after+' cfg='+tog.cfgW+')',!tog.before&&tog.after&&tog.cfgW);

/* ── 10) 현장 삭제 잔재 정리(620차) — IndexedDB 원본·siteConfig 리프가 함께 지워진다 ── */
const del=await pg.evaluate(async()=>{
  const sid='sB';
  const had={def:!!(S.def[sid]&&S.def[sid].length),cfg:!!(window.__TREE.siteConfig&&window.__TREE.siteConfig[sid])};
  window.__delOK=null;
  S.org.sites=S.org.sites.filter(x=>x.id!==sid);
  delete S.def[sid];defDelete(sid);
  if(S.live&&FB.db)FB.db.ref('siteConfig/'+sid).set(null);
  await new Promise(r=>setTimeout(r,400));
  let idb=null;try{idb=await dbGet('defects',sid);}catch(e){}
  return {had,defGone:!S.def[sid],idbGone:!idb,cfgGone:!(window.__TREE.siteConfig&&window.__TREE.siteConfig[sid])};
});
ok('현장 삭제 잔재 정리(IndexedDB·siteConfig)',del.defGone&&del.idbGone&&del.cfgGone);

ok('페이지 오류 0'+(perr.length?' — '+perr[0]:''),perr.length===0);
await br.close();srv.close();
console.log(fail?('FAIL '+fail):'E2E ALL PASS');
process.exit(fail?1:0);
