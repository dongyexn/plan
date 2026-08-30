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

  const ev=await page.evaluate(()=>planEvent({id:'rb-e2e',title:'무지개 E2E',date:'2026-08-27',color:'rainbow',owners:{}},'2026-08-27'));
  if(ev.classNames.includes('ev-rb')&&ev.classNames.includes('team'))OK('FullCalendar 공통 업무 — ev-rb + team 클래스');
  else F('FullCalendar 공통 업무 클래스 누락: '+JSON.stringify(ev.classNames));
  if(ev.borderColor==='rainbow'&&ev.backgroundColor==='transparent')OK('FullCalendar 공통 업무 — 원본 rainbow 토큰 유지');
  else F('FullCalendar 공통 업무 색 토큰 이상: '+JSON.stringify({backgroundColor:ev.backgroundColor,borderColor:ev.borderColor}));

  const normal=await page.evaluate(()=>planEvent({id:'rb-e2e2',title:'무지개 E2E',date:'2026-08-27',color:'rainbow',owners:{u1:1}},'2026-08-27'));
  if(normal.classNames.includes('ev-rb')&&!normal.classNames.includes('team'))OK('FullCalendar 일반 업무 — ev-rb 클래스');
  else F('FullCalendar 일반 업무 클래스 이상: '+JSON.stringify(normal.classNames));

  /* 저장 데이터 → 실제 FullCalendar DOM까지 한 번 통과시킨다. */
  await page.evaluate(()=>{
    const d='2026-08-27';
    S.tasks=S.tasks||{}; S.tasks.team=S.tasks.team||{};
    S.tasks.team.rbE2E={text:'637차 무지개 렌더 시험',date:d,end:'',color:'rainbow',assignees:{},st:1,createdAt:Date.now(),updatedAt:Date.now()};
    S.selDate=d;
    calRerender();
  });
  await page.locator('.fc .ev-rb').first().waitFor({state:'attached', timeout:8000});
  const domEv=await page.locator('.fc .ev-rb').first().evaluate(el=>({
    cls:el.className,
    bg:getComputedStyle(el).backgroundImage,
    border:getComputedStyle(el).borderColor
  }));
  if(domEv.cls.includes('team')&&domEv.bg.includes('linear-gradient'))OK('실제 FullCalendar DOM — 공통 무지개 막대 렌더');
  else F('실제 FullCalendar DOM — 공통 무지개 막대 실패: '+JSON.stringify(domEv));

  /* 676차: 그라디언트가 **흐르는지**까지 본다. rbflow 는 background-position 을 애니메이션하는데,
     어느 규칙이든 단축 background(=position 을 !important 로 초기화)를 쓰면 애니메이션이 조용히 죽는다.
     계산값이 시간에 따라 변하는지가 유일하게 믿을 만한 판정이다 — animationName 만 봐서는 못 잡는다.
     ⚠ 공통 막대는 배경 레이어가 둘이라 rbflow2(값 2개)를 쓴다. 레이어 수가 안 맞으면 적용되지 않는다. */
  /* 고정('rainbow')과 흐름('rainbow-anim') 두 종을 실제로 만들어 픽셀이 변하는지 각각 본다 */
  /* ⚠ 한 칸에 몰아넣으면 FullCalendar 가 '+N 더보기'로 접어 막대가 안 보인다 — 날짜를 흩는다 */
  await page.evaluate(()=>{
    S.tasks=S.tasks||{};S.tasks.u1=S.tasks.u1||{};
    const put=(k,t,c,d)=>{S.tasks.u1[k]={text:t,date:d,end:'',color:c,assignees:{u1:1},st:1,createdAt:Date.now(),updatedAt:Date.now()};};
    put('rbFix','고정 무지개','rainbow','2026-08-24');
    put('rbAni','흐름 무지개','rainbow-anim','2026-08-25');
    put('gdFix','고정 그라디언트','grad-bl','2026-08-26');
    put('gdAni','흐름 그라디언트','grad-bl-anim','2026-08-27');
    S.selDate='2026-08-27';calRerender();
  });
  await page.locator('.fc .ev-fx').first().waitFor({state:'attached',timeout:8000});
  {
    /* ⚠ 막대를 글자로 집는다 — .first() 로 집으면 같은 날 다른 무지개 업무가 걸려 판정이 흔들린다 */
    const moved=async label=>{const l=page.locator('.fc .ev-rb, .fc .ev-gd',{hasText:label}).first();
      /* ⚠ 먼저 화면 안으로 굴려 놓고 가라앉기를 기다린다 — 첫 촬영이 스크롤을 유발하면
         두 장이 서브픽셀만큼 달라져 '움직인다'로 오판한다(실제로 그랬다) */
      await l.scrollIntoViewIfNeeded();await new Promise(r=>setTimeout(r,400));
      const a=await l.screenshot();await new Promise(r=>setTimeout(r,1300));
      return Buffer.compare(a,await l.screenshot())!==0;};
    if(await moved('흐름 무지개'))OK('실제 픽셀 — 흐름 무지개는 동작 줄이기에서도 움직인다');
    else F('흐름 무지개가 멈춰 있다(동작 줄이기 예외 누락 의심)');
    /* ⚠ 고정 막대는 픽셀 비교로 판정하지 않는다. 옆에서 흐름 막대가 도는 동안 정지 요소를 두 번 캡처하면
       합성 차이로 서브픽셀이 흔들려 간헐 FAIL 이 났다(실제로 겪었다). 애니메이션 이름이 none 이고
       배경 위치가 그대로면 움직일 수단 자체가 없으므로, 계산값 판정이 여기서는 더 정확하고 안정적이다. */
    const fix=await page.locator('.fc .ev-rb',{hasText:'고정 무지개'}).first().evaluate(async el=>{
      const g=()=>getComputedStyle(el).backgroundPosition;const t0=g();
      await new Promise(r=>setTimeout(r,800));
      return {anim:getComputedStyle(el).animationName,t0,t1:g(),rbx:el.classList.contains('ev-fx')};
    });
    if(fix.anim==='none'&&fix.t0===fix.t1&&!fix.rbx)OK('고정 무지개는 애니메이션이 없다(동작 줄이기와 무관하게 정지)');
    else F('고정 무지개가 움직인다 — 두 종이 갈리지 않았다 '+JSON.stringify(fix));

    /* 679차: 그라디언트도 고정·흐름 두 벌이다 — 같은 방식으로 본다 */
    if(await moved('흐름 그라디언트'))OK('실제 픽셀 — 흐름 그라디언트도 동작 줄이기에서 움직인다');
    else F('흐름 그라디언트가 멈춰 있다');
    const gfix=await page.locator('.fc .ev-gd',{hasText:'고정 그라디언트'}).first().evaluate(async el=>{
      const g=()=>getComputedStyle(el).backgroundPosition;const t0=g();
      await new Promise(r=>setTimeout(r,800));
      return {anim:getComputedStyle(el).animationName,t0,t1:g(),size:getComputedStyle(el).backgroundSize,
              gb:getComputedStyle(el).getPropertyValue('--gb').trim().slice(0,20)};
    });
    if(gfix.anim==='none'&&gfix.t0===gfix.t1&&gfix.size==='100% 100%'&&gfix.gb.startsWith('linear-gradient'))
      OK('고정 그라디언트 — 정지 · 막대 폭에 맞춤(--gb 주입 확인)');
    else F('고정 그라디언트 이상: '+JSON.stringify(gfix));

  }

  const flow=await page.locator('.fc .ev-fx').first().evaluate(async el=>{
    const g=()=>getComputedStyle(el).backgroundPosition;
    const t0=g(); await new Promise(r=>setTimeout(r,1200));
    return {t0,t1:g(),anim:getComputedStyle(el).animationName,layers:getComputedStyle(el).backgroundImage.split('linear-gradient').length-1};
  });
  if(flow.t0!==flow.t1)OK('실제 FullCalendar DOM — 흐름 무지개 background-position 이동('+flow.anim+' · 레이어 '+flow.layers+')');
  else F('무지개 막대가 멈춰 있다 — background-position 이 안 움직인다: '+JSON.stringify(flow));

  await page.evaluate(()=>{
    document.querySelectorAll('[data-rb-test]').forEach(x=>x.remove());
    const box=document.createElement('div');box.dataset.rbTest='1';box.innerHTML=colDotHTML('rainbow','rb-test',false);document.body.appendChild(box);
  });
  const inline=await page.locator('[data-rb-test] .p-col-rainbow').evaluate(el=>({bg:getComputedStyle(el).backgroundImage,style:el.getAttribute('style')}));
  if(inline.bg.includes('linear-gradient'))OK('실제 DOM 색 원 — computedStyle에 무지개 그라디언트 반영');
  else F('실제 DOM 색 원 — computedStyle 무지개 미반영: '+JSON.stringify(inline));

  /* 682차: 12월 크리스마스가 직접 고른 색을 덮지 않는지 — 스킨 고르기는 되돌렸다 */
  {
    const r=await page.evaluate(async()=>{
      document.body.classList.add('dec');await new Promise(r=>setTimeout(r,60));
      const rb=document.querySelector('#fcal .fc-event.ev-rb.team');
      const kept=rb?getComputedStyle(rb).backgroundImage.includes('135deg'):'막대없음';
      document.body.classList.remove('dec');
      return {kept,skin:typeof window.SKINS};
    });
    if(r.kept===true&&r.skin==='undefined')OK('12월 크리스마스를 켜도 무지개 공통 막대는 그대로(스킨 고르기 잔재 없음)');
    else F('크리스마스 규칙 이상: '+JSON.stringify(r));
  }

  if(errors.length)F('pageerror '+errors.join(' | '));
  else OK('브라우저 pageerror 없음');
}catch(e){F('테스트 예외: '+String(e.stack||e));}
finally{await browser.close();srv.close();}
console.log(`결과: FAIL ${fail}`);
process.exitCode=fail?1:0;
