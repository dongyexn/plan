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
const page=await browser.newPage({viewport:{width:1440,height:900}});
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

  await page.evaluate(()=>{
    document.querySelectorAll('[data-rb-test]').forEach(x=>x.remove());
    const box=document.createElement('div');box.dataset.rbTest='1';box.innerHTML=colDotHTML('rainbow','rb-test',false);document.body.appendChild(box);
  });
  const inline=await page.locator('[data-rb-test] .p-col-rainbow').evaluate(el=>({bg:getComputedStyle(el).backgroundImage,style:el.getAttribute('style')}));
  if(inline.bg.includes('linear-gradient'))OK('실제 DOM 색 원 — computedStyle에 무지개 그라디언트 반영');
  else F('실제 DOM 색 원 — computedStyle 무지개 미반영: '+JSON.stringify(inline));

  if(errors.length)F('pageerror '+errors.join(' | '));
  else OK('브라우저 pageerror 없음');
}catch(e){F('테스트 예외: '+String(e.stack||e));}
finally{await browser.close();srv.close();}
console.log(`결과: FAIL ${fail}`);
process.exitCode=fail?1:0;
