/* 634차 무지개 렌더링 E2E — 실제 브라우저에서 색 원/업무 막대를 검증한다.
   단순 문자열 검사가 아니라 DOM의 class/style/computedStyle을 확인한다.
   실행: node scripts/test/rainbow-render.mjs
   필요: Playwright Chromium (CHROMIUM 환경변수로 실행 파일 지정 가능)
*/
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const PORT=4311;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.webmanifest':'application/manifest+json'};
let fail=0;
const OK=m=>console.log('ok    '+m);
const F=m=>{fail++;console.log('FAIL  '+m);};
const srv=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';
  const f=path.join(root,p);
  if(!f.startsWith(root)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);
});
await new Promise(r=>srv.listen(PORT,r));
let browser;
try{browser=await chromium.launch({...(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}),headless:true});}
catch(e){console.log('FAIL  브라우저 실행 실패: '+String(e).split('\n')[0]);srv.close();process.exit(1);}
/* 677차: **동작 줄이기를 켠 채로** 돌린다. 사용자 환경이 그랬고, 머리쪽 전역 reduce 규칙이
   모든 애니메이션을 !important 로 죽여 흐름 무지개가 멈춰 있었다 — 기본값으로 돌리면 그 회귀를 놓친다. */
const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
/* ⚠ 685차: 날짜를 '2026-08-27' 처럼 박아 두면 그 달이 지나는 순간 막대가 화면 밖 달로 밀려
   `.fc .ev-rb` 를 못 찾고 통째로 FAIL 한다(실제로 겪었다). **오늘이 낀 달**에서 날짜를 뽑는다. */
const D=(off=0)=>{const d=new Date();d.setDate(1);d.setDate(1+Math.min(26,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()-1)-off);
  const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;};
const DD=[D(0),D(1),D(2),D(3)];const D0=DD[0];
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
try{
  await page.goto(`http://localhost:${PORT}/index.html?local=1`);
  await page.waitForSelector('#fcal .fc-daygrid-day',{timeout:10000});
  OK('부팅 — 달력 렌더');

  const result=await page.evaluate(()=>{
    const rb='linear-gradient(135deg,#F43F5E 0%,#F59E0B 20%,#FACC15 40%,#22C55E 60%,#3B82F6 80%,#8B5CF6 100%)';
    const team=document.createElement('div');
    team.innerHTML=colDotHTML('rainbow','rb-team',true);
    document.body.appendChild(team.firstElementChild);
    const filled=document.createElement('div');
    filled.innerHTML=colDotHTML('rainbow','rb-filled',false);
    document.body.appendChild(filled.firstElementChild);
    const t=team.firstElementChild||document.querySelector('.p-col-team.p-col-rainbow');
    const f=filled.firstElementChild||document.querySelector('.p-col-rainbow:not(.p-col-team)');
    const cs=x=>x?getComputedStyle(x):null;
    return {
      team:{exists:!!t,cls:t?.className||'',bg:cs(t)?.backgroundImage||'',box:cs(t)?.boxShadow||''},
      filled:{exists:!!f,cls:f?.className||'',bg:cs(f)?.backgroundImage||''},
      rb
    };
  });
  if(result.team.exists&&result.team.cls.includes('p-col-rainbow')&&result.team.bg.includes('linear-gradient'))OK('공통 업무 색 원 — 무지개 그라디언트 테두리 렌더');
  else F('공통 업무 색 원 — 무지개 렌더 실패: '+JSON.stringify(result.team));
  if(result.filled.exists&&result.filled.cls.includes('p-col-rainbow')&&result.filled.bg.includes('linear-gradient'))OK('일반 업무 색 원 — 무지개 그라디언트 렌더');
  else F('일반 업무 색 원 — 무지개 렌더 실패: '+JSON.stringify(result.filled));

  const ev=await page.evaluate((d)=>planEvent({id:'rb-e2e',title:'무지개 E2E',date:d,color:'rainbow',owners:{}},d),D0);
  if(ev.classNames.includes('ev-rb')&&ev.classNames.includes('team'))OK('FullCalendar 공통 업무 — ev-rb + team 클래스');
  else F('FullCalendar 공통 업무 클래스 누락: '+JSON.stringify(ev.classNames));
  if(ev.borderColor==='rainbow'&&ev.backgroundColor==='transparent')OK('FullCalendar 공통 업무 — 원본 rainbow 토큰 유지');
  else F('FullCalendar 공통 업무 색 토큰 이상: '+JSON.stringify({backgroundColor:ev.backgroundColor,borderColor:ev.borderColor}));

  const normal=await page.evaluate((d)=>planEvent({id:'rb-e2e2',title:'무지개 E2E',date:d,color:'rainbow',owners:{u1:1}},d),D0);
  if(normal.classNames.includes('ev-rb')&&!normal.classNames.includes('team'))OK('FullCalendar 일반 업무 — ev-rb 클래스');
  else F('FullCalendar 일반 업무 클래스 이상: '+JSON.stringify(normal.classNames));

  /* 저장 데이터 → 실제 FullCalendar DOM까지 한 번 통과시킨다. */
  await page.evaluate((d)=>{
    S.tasks=S.tasks||{}; S.tasks.team=S.tasks.team||{};
    S.tasks.team.rbE2E={text:'637차 무지개 렌더 시험',date:d,end:'',color:'rainbow',assignees:{},st:1,createdAt:Date.now(),updatedAt:Date.now()};
    S.selDate=d;
    calRerender();
  },D0);
  await page.locator('.fc .ev-rb').first().waitFor({state:'attached', timeout:8000});
  /* 683차: 무지개는 막대의 배경이 아니라 ::after 한 겹이 그린다 — 판정 자리도 옮긴다.
     공통(team)은 그 위에 흰 판(::before)을 덮어 테두리 칸만 남긴다. */
  const domEv=await page.locator('.fc .ev-rb').first().evaluate(el=>({
    cls:el.className,
    bg:getComputedStyle(el,'::after').backgroundImage,
    white:getComputedStyle(el,'::before').backgroundColor,
    clip:getComputedStyle(el).clipPath
  }));
  if(domEv.cls.includes('team')&&domEv.bg.includes('linear-gradient')
     &&domEv.white==='rgb(255, 255, 255)'&&domEv.clip.includes('inset'))
    OK('실제 FullCalendar DOM — 공통 무지개 막대(::after 무지개 + ::before 흰 속 + border-box 자르기)');
  else F('실제 FullCalendar DOM — 공통 무지개 막대 실패: '+JSON.stringify(domEv));

  /* 676차: 그라디언트가 **흐르는지**까지 본다. rbflow 는 background-position 을 애니메이션하는데,
     어느 규칙이든 단축 background(=position 을 !important 로 초기화)를 쓰면 애니메이션이 조용히 죽는다.
     계산값이 시간에 따라 변하는지가 유일하게 믿을 만한 판정이다 — animationName 만 봐서는 못 잡는다.
     ⚠ 공통 막대는 배경 레이어가 둘이라 rbflow2(값 2개)를 쓴다. 레이어 수가 안 맞으면 적용되지 않는다. */
  /* 고정('rainbow')과 흐름('rainbow-anim') 두 종을 실제로 만들어 픽셀이 변하는지 각각 본다 */
  /* ⚠ 한 칸에 몰아넣으면 FullCalendar 가 '+N 더보기'로 접어 막대가 안 보인다 — 날짜를 흩는다 */
  await page.evaluate((DD)=>{
    S.tasks=S.tasks||{};S.tasks.u1=S.tasks.u1||{};
    const put=(k,t,c,d)=>{S.tasks.u1[k]={text:t,date:d,end:'',color:c,assignees:{u1:1},st:1,createdAt:Date.now(),updatedAt:Date.now()};};
    put('rbFix','고정 무지개','rainbow',DD[3]);
    put('rbAni','흐름 무지개','rainbow-anim',DD[2]);
    put('gdFix','고정 그라디언트','grad-bl',DD[1]);
    put('gdAni','흐름 그라디언트','grad-yl-anim',DD[0]);
    S.selDate=DD[0];calRerender();
  },DD);
  await page.locator('.fc .ev-rb.ev-fx').first().waitFor({state:'attached',timeout:8000});
  {
    /* ⚠ 막대를 글자로 집는다 — .first() 로 집으면 같은 날 다른 무지개 업무가 걸려 판정이 흔들린다 */
    const moved=async label=>{const l=page.locator('.fc .ev-rb',{hasText:label}).first();
      /* ⚠ 먼저 화면 안으로 굴려 놓고 가라앉기를 기다린다 — 첫 촬영이 스크롤을 유발하면
         두 장이 서브픽셀만큼 달라져 '움직인다'로 오판한다(실제로 그랬다) */
      await l.scrollIntoViewIfNeeded();await new Promise(r=>setTimeout(r,400));
      const a=await l.screenshot();await new Promise(r=>setTimeout(r,1300));
      return Buffer.compare(a,await l.screenshot())!==0;};
    if(await moved('흐름 무지개'))OK('실제 픽셀 — 흐름 무지개는 동작 줄이기에서도 움직인다');
    else F('흐름 무지개가 멈춰 있다(동작 줄이기 예외 누락 의심)');
    /* ⚠ 고정 막대는 픽셀 비교로 판정하지 않는다. 옆에서 흐름 막대가 도는 동안 정지 요소를 두 번 캡처하면
       합성 차이로 서브픽셀이 흔들려 간헐 FAIL 이 났다(실제로 겪었다). */
    const fix=await page.locator('.fc .ev-rb',{hasText:'고정 무지개'}).first().evaluate(async el=>{
      const g=()=>getComputedStyle(el,'::after').transform;const t0=g();
      await new Promise(r=>setTimeout(r,800));
      return {anim:getComputedStyle(el,'::after').animationName,t0,t1:g(),rbx:el.classList.contains('ev-fx')};
    });
    if(fix.anim==='none'&&fix.t0===fix.t1&&!fix.rbx)OK('고정 무지개는 애니메이션이 없다(동작 줄이기와 무관하게 정지)');
    else F('고정 무지개가 움직인다 — 두 종이 갈리지 않았다 '+JSON.stringify(fix));

    /* ── 683차: 흐름은 **transform** 으로만 돈다 ─────────────────────
       background-position 애니메이션은 합성으로 올라가지 않아 프레임마다 주 스레드가 막대를 다시 칠했다.
       transform 이 실제로 움직이는지, background-position 이 그대로인지 둘 다 본다 —
       어느 쪽이든 어긋나면 682차 CPU 문제로 되돌아간 것이다. */
    const flow=await page.locator('.fc .ev-rb.ev-fx').first().evaluate(async el=>{
      const g=()=>getComputedStyle(el,'::after');
      const t0=g().transform,p0=g().backgroundPosition;
      await new Promise(r=>setTimeout(r,1200));
      return {t0,t1:g().transform,p0,p1:g().backgroundPosition,anim:g().animationName};
    });
    if(flow.t0===flow.t1) F('흐름 무지개가 멈춰 있다 — ::after transform 이 안 움직인다: '+JSON.stringify(flow));
    else if(flow.p0!==flow.p1) F('흐름이 아직 background-position 을 쓴다 — 주 스레드 재도장이 돌아왔다: '+JSON.stringify(flow));
    else OK('실제 DOM — 흐름 무지개는 transform 으로 움직인다('+flow.anim+' · background-position 고정)');

    /* 684차: 그라디언트도 무지개와 같은 ::after 합성 경로를 타야 한다.
       고정은 막대 폭에 맞춰 다 보이고(100% 100%), 흐름만 transform 으로 움직인다. */
    const gfix=await page.locator('.fc .ev-gd',{hasText:'고정 그라디언트'}).first().evaluate(async el=>{
      const g=()=>getComputedStyle(el,'::after');
      const t0=g().transform;await new Promise(r=>setTimeout(r,700));
      return {anim:g().animationName,t0,t1:g().transform,size:g().backgroundSize,
              gb:g().backgroundImage,fx:el.classList.contains('ev-fx')};
    });
    if(gfix.anim==='none'&&gfix.t0===gfix.t1&&gfix.size==='100% 100%'&&gfix.gb.startsWith('linear-gradient')&&!gfix.fx)
      OK('고정 그라디언트 — 정지 · 막대 폭에 맞춤(--gb 주입 확인)');
    else F('고정 그라디언트 이상: '+JSON.stringify(gfix));
    const gani=await page.locator('.fc .ev-gd.ev-fx').first().evaluate(async el=>{
      const g=()=>getComputedStyle(el,'::after');
      const t0=g().transform,p0=g().backgroundPosition;
      await new Promise(r=>setTimeout(r,1200));
      return {t0,t1:g().transform,p0,p1:g().backgroundPosition,anim:g().animationName,cls:el.className};
    });
    if(gani.t0===gani.t1) F('흐름 그라디언트가 멈춰 있다: '+JSON.stringify(gani));
    else if(gani.p0!==gani.p1) F('흐름 그라디언트가 background-position 을 쓴다 — 주 스레드 재도장 회귀: '+JSON.stringify(gani));
    else OK('흐름 그라디언트 — transform 으로 움직인다('+gani.anim+')');
    /* 밝은 그라디언트(노랑)는 흰 글자가 안 읽혀 어두운 글자로 넘어가야 한다 */
    const lg=await page.evaluate((DD)=>{
      const a=planEvent({id:'l1',title:'노랑',date:DD[1],color:'grad-yl',owners:{u1:1}},DD[1]);
      const b=planEvent({id:'l2',title:'파랑',date:DD[1],color:'grad-bl',owners:{u1:1}},DD[1]);
      return {y:a.textColor,b:b.textColor,ycls:a.classNames};
    },DD);
    if(lg.y==='#1B1B1F'&&lg.b==='#fff'&&lg.ycls.includes('on-light'))
      OK('밝은 그라디언트(노랑) — 어두운 글자로 넘어간다');
    else F('그라디언트 글자색 판정 이상: '+JSON.stringify(lg));
  }

  await page.evaluate(()=>{
    document.querySelectorAll('[data-rb-test]').forEach(x=>x.remove());
    const box=document.createElement('div');box.dataset.rbTest='1';box.innerHTML=colDotHTML('rainbow','rb-test',false);document.body.appendChild(box);
  });
  const inline=await page.locator('[data-rb-test] .p-col-rainbow').evaluate(el=>({bg:getComputedStyle(el).backgroundImage,style:el.getAttribute('style')}));
  if(inline.bg.includes('linear-gradient'))OK('실제 DOM 색 원 — computedStyle에 무지개 그라디언트 반영');
  else F('실제 DOM 색 원 — computedStyle 무지개 미반영: '+JSON.stringify(inline));

  /* ── 687차: colBg() 를 안 거치던 자리 네 곳 — 지도 점(SVG fill) · 모달 현장 목록 · 업무 현황 미니달력 · 공통 그라디언트 원 ── */
  {
    const r=await page.evaluate(()=>{
      const box=document.querySelector('[data-rb-test]');box.innerHTML=colDotHTML('grad-gr','rb-test',true);
      const ring=getComputedStyle(box.firstElementChild).backgroundImage;
      /* 담당자 프로필 색이 그라디언트·무지개일 때 지도 점 — 실제 kmSVG 로 그린다 */
      S.org.teams=[{id:'t1',name:'T'}];S.org.regions=[{id:'r1',name:'R'}];
      S.org.sites=[{id:'sG',name:'힐스테이트 세종 리버파크',region:'r1',team:'t1',units:10},{id:'sR',name:'힐스테이트 광주 첨단',region:'r1',team:'t1',units:10}];
      S.people={g1:{name:'그라',team:'t1',region:'r1',rank:'member',sites:{sG:1}},r1:{name:'무지',team:'t1',region:'r1',rank:'member',sites:{sR:1}}};
      S.accounts={g1:{name:'그라',role:'editor',avColor:'grad-rd'},r1:{name:'무지',role:'editor',avColor:'rainbow'}};
      S.tk.t='t1';go('org');rOrg();
      const pins=[...document.querySelectorAll('#okmSvg ~ .okm-ov .okm-pin, .okm-ov .okm-pin')].map(p=>({sid:p.dataset.sid,attr:p.getAttribute('fill'),fill:getComputedStyle(p).fill}));
      const defs=document.querySelectorAll('.okm-ov linearGradient').length;
      /* 업무 현황 미니달력 점 — 그라디언트 업무 */
      S.tasks.g1={m1:{text:'미니',date:S.selDate,end:'',color:'auto',assignees:{g1:1},st:1,createdAt:Date.now(),updatedAt:Date.now()}};
      go('tasks');rTasks();
      const dot=[...document.querySelectorAll('#view-tasks .dots i')].map(i=>getComputedStyle(i).backgroundImage);
      go('calendar');
      return {ring,pins,defs,dot};
    });
    const pinOk=r.pins.length===2&&r.pins.every(p=>/^url\(/.test(p.attr)&&p.fill.startsWith('url('))&&r.defs===2;
    if(r.ring.includes('rgb(52, 211, 153)')&&!r.ring.includes('rgb(244, 63, 94)'))OK('공통 그라디언트 색 원 — 무지개가 아니라 제 그라디언트 링(--gb)');
    else F('공통 그라디언트 색 원 링 이상: '+r.ring.slice(0,80));
    if(pinOk)OK('지도 점 — 그라디언트·무지개 담당자 색을 <linearGradient> 로 칠한다('+r.pins.length+'점 · defs '+r.defs+')');
    else F('지도 점 그라디언트 fill 이상: '+JSON.stringify(r.pins)+' defs='+r.defs);
    if(r.dot.length&&r.dot.every(d=>d.includes('linear-gradient')))OK('업무 현황 미니달력 점 — 그라디언트 담당자 색 반영');
    else F('업무 현황 미니달력 점 그라디언트 미반영: '+JSON.stringify(r.dot));
  }

  /* 682차: 12월 크리스마스가 직접 고른 색을 덮지 않는지 — 스킨 고르기는 되돌렸다 */
  {
    const r=await page.evaluate(async()=>{
      document.body.classList.add('dec');await new Promise(r=>setTimeout(r,60));
      const rb=document.querySelector('#fcal .fc-event.ev-rb.team');
      const kept=rb?getComputedStyle(rb,'::after').backgroundImage.includes('135deg'):'막대없음';
      document.body.classList.remove('dec');
      return {kept,skin:typeof window.SKINS};
    });
    if(r.kept===true&&r.skin==='undefined')OK('12월 크리스마스를 켜도 무지개 공통 막대는 그대로(스킨 고르기 잔재 없음)');
    else F('크리스마스 규칙 이상: '+JSON.stringify(r));
  }

  /* ── 683차: CPU 회귀 감시 ────────────────────────────────────────
     흐름 막대를 30개 띄우고 4초 동안 **주 스레드 스타일 재계산 횟수**를 센다.
     background-position 방식이면 막대마다 초당 60회가 찍힌다(240회 이상).
     transform(합성) 이면 0에 가깝다. 숫자로 못박아 두어야 다음에 되돌아가는 걸 잡는다. */
  {
    const cdp=await page.context().newCDPSession(page);
    await page.evaluate((DD)=>{
      S.tasks=S.tasks||{};S.tasks.u1=S.tasks.u1||{};
      for(let i=0;i<30;i++){const d=DD[0].slice(0,8)+String(3+(i%20)).padStart(2,'0');
        S.tasks.u1['perf'+i]={text:'흐름'+i,date:d,end:'',color:'rainbow-anim',assignees:{u1:1},st:1,createdAt:Date.now(),updatedAt:Date.now()};}
      S.selDate=DD[0];calRerender();
    },DD);
    await page.waitForTimeout(1000);
    await cdp.send('Performance.enable');
    const m=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
    const a=await m();await page.waitForTimeout(4000);const b=await m();
    const recalc=b.RecalcStyleCount-a.RecalcStyleCount, task=Math.round(1000*(b.TaskDuration-a.TaskDuration));
    if(recalc>120) F('흐름 막대 30개가 4초에 스타일 재계산 '+recalc+'회 · 주 스레드 '+task+'ms — 합성 애니메이션이 아니다(background-position 회귀)');
    else OK('CPU — 흐름 막대 30개 · 4초 재계산 '+recalc+'회 · 주 스레드 '+task+'ms (합성 애니메이션)');
  }

  if(errors.length)F('pageerror '+errors.join(' | '));
  else OK('브라우저 pageerror 없음');
}catch(e){F('테스트 예외: '+String(e.stack||e));}
finally{await browser.close();srv.close();}
console.log(`결과: FAIL ${fail}`);
process.exitCode=fail?1:0;
