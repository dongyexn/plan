/* 주요 현안 회귀 — 데스크톱 화면 · 위젯 판(머리 단추) · 위젯 「4주 + 주요 현안」 아래 칸.
   검사: 추가(Enter 이어 쓰기)·해결/취소·고치기(빈 칸이면 지움)·지우기+되돌리기 · 해결 7일 뒤 숨김 · D+N(30일↑ 주황) ·
   권역 탭 · 담당자 표시 · 판 켜면 아래 칸 숨고 초점은 보이는 입력 칸 · 달력 단추로 판 끔 · 우클릭 빼기·+ 다시 넣기 · 정렬·접기 · 4주 뷰 한 주씩 · 아래 칸 한 줄 · 카드 기본 높이 현안 4줄 · 백업에 현안.
   사용: node scripts/test/iss.mjs (CHROMIUM 경로를 줄 수 있다) */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const PORT=8531;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.gif':'image/gif','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.md':'text/markdown'};
const srv=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]);const f=path.join(root,u==='/'?'index.html':u);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));}).listen(PORT);
let fail=0;const ok=(n,c,x)=>{console.log((c?'✓ ':'✗ ')+n+(c||x===undefined?'':'  → '+JSON.stringify(x)));if(!c)fail++;};
const exe=process.env.CHROMIUM||'';
const br=await chromium.launch(Object.assign({args:['--no-sandbox']},exe?{executablePath:exe}:{}));
/* 가상 자료 — 이름은 드라이하게 */
const seed=wid=>{const now=Date.now(),D=864e5;
  localStorage.setItem('calapp.v1',JSON.stringify({org:{teams:[{id:'t1',name:'팀1'}],regions:[{id:'r1',name:'권역1'},{id:'r2',name:'권역2'}],
    sites:[{id:'s1',name:'현장명1',team:'t1',region:'r1'},{id:'s2',name:'현장명2',team:'t1',region:'r1'},{id:'s3',name:'현장명3',team:'t1',region:'r2'}]},tasks:{},
    people:{u1:{name:'담당자1',team:'t1',region:'r1',rank:'member',sites:{s1:1}}},
    iss:{s1:{a:{t:'현안1',at:now-40*D,by:''},b:{t:'현안2',at:now-2*D,by:''},c:{t:'오래 전 해결',at:now-20*D,dt:now-9*D,by:''},d:{t:'최근 해결',at:now-5*D,dt:now-D,by:''}}}}));
  localStorage.setItem('calapp.wid',JSON.stringify(wid||{}));};
async function open(W,H,q,wid){
  const ctx=await br.newContext({viewport:{width:W,height:H}});const pg=await ctx.newPage();const perr=[];pg.on('pageerror',e=>perr.push(e.message));
  await pg.goto('http://localhost:'+PORT+'/index.html?local=1');await pg.evaluate(seed,wid);
  await pg.goto('http://localhost:'+PORT+'/index.html?'+q);await pg.waitForTimeout(2500);return {ctx,pg,perr};}
const txt=(pg,sel)=>pg.evaluate(s=>[...document.querySelectorAll(s)].map(e=>e.textContent.trim()),sel);

/* ── 데스크톱 ── */
{const {ctx,pg,perr}=await open(1400,900,'local=1');
  await pg.click('.nvi[data-view="iss"]');await pg.waitForTimeout(500);
  ok('카드 3장',(await pg.$$('#issRoot .iss-c')).length===3);
  const rows=await txt(pg,'#issRoot .iss-c[data-sid="s1"] .iss-tx');
  ok('진행 등록순 → 해결 · 7일 지난 해결 숨김',JSON.stringify(rows)===JSON.stringify(['현안1','현안2','최근 해결']),rows);
  ok('D+N · 30일↑ 주황',await pg.evaluate(()=>{const m=document.querySelector('#issRoot .iss-c[data-sid="s1"] .iss-m');return /^D\+40$/.test(m.textContent)&&m.classList.contains('old');}));
  ok('담당자 — 음영·프로필·이름',await pg.evaluate(()=>{const h=document.querySelector('#issRoot .iss-c[data-sid="s1"] .tm-h');return h.classList.contains('own')&&!!h.querySelector('.iss-av')&&h.querySelector('.iss-own').textContent==='담당자1';}));
  ok('담당자 없는 현장은 그대로',await pg.evaluate(()=>!document.querySelector('#issRoot .iss-c[data-sid="s2"] .tm-h').classList.contains('own')));
  await pg.click('#issRoot .iss-c[data-sid="s2"] [data-act="iss.add"]');await pg.keyboard.type('추가1');await pg.keyboard.press('Enter');await pg.keyboard.type('추가2');await pg.keyboard.press('Enter');
  ok('Enter 이어 쓰기 · 입력 칸 유지',(await txt(pg,'#issRoot .iss-c[data-sid="s2"] .iss-tx')).length===2&&await pg.evaluate(()=>document.activeElement.matches('.iss-in')));
  await pg.keyboard.press('Escape');
  await pg.click('#issRoot .iss-c[data-sid="s2"] .iss-i:first-child [data-act="iss.ck"]');
  ok('해결 표시',await pg.evaluate(()=>Object.values(S.iss.s2).some(x=>x.t==='추가1'&&x.dt)));
  await pg.click('#issRoot .iss-c[data-sid="s2"] .iss-tx');await pg.keyboard.press('Control+A');await pg.keyboard.type('고침');await pg.keyboard.press('Enter');
  ok('고치기',await pg.evaluate(()=>Object.values(S.iss.s2).some(x=>x.t==='고침')));
  const n0=await pg.evaluate(()=>Object.keys(S.iss.s2).length);
  await pg.hover('#issRoot .iss-c[data-sid="s2"] .iss-i:first-child');await pg.click('#issRoot .iss-c[data-sid="s2"] .iss-i:first-child [data-act="iss.del"]');
  ok('지우기',await pg.evaluate(n=>Object.keys(S.iss.s2||{}).length===n-1,n0));
  await pg.click('#toast [data-act="toast.act"]');
  ok('되돌리기',await pg.evaluate(n=>Object.keys(S.iss.s2||{}).length===n,n0));
  await pg.click('#issRoot .rp-tab[data-rg="r2"]');
  ok('권역 탭',(await pg.$$('#issRoot .iss-c')).length===1);
  ok('로컬 저장',await pg.evaluate(()=>!!JSON.parse(localStorage.getItem('calapp.v1')).iss.s2));
  ok('백업에 현안',await pg.evaluate(()=>!!JSON.parse(bkData()).iss.s1));
  ok('데스크톱 오류 없음',!perr.length,perr);await ctx.close();}

/* ── 위젯 4주 + 판 ── */
{const {ctx,pg,perr}=await open(620,520,'w=1&glass=1&local=1',{iss3:true});
  ok('4주 뷰',await pg.evaluate(()=>CAL.view.type==='dayGrid4w'&&document.querySelectorAll('#fcal .fc-daygrid-body tbody tr').length===4));
  ok('4주 뷰 — 전주부터',await pg.evaluate(()=>dstr(CAL.view.currentStart)<=addDays(todayStr(),-7)&&addDays(todayStr(),-7)<dstr(CAL.view.currentEnd)));
  const s0=await pg.evaluate(()=>dstr(CAL.view.currentStart));
  await pg.click('[data-act="cal.next"]');await pg.waitForTimeout(300);
  ok('한 주씩',await pg.evaluate(s=>daysBetween(s,dstr(CAL.view.currentStart))===7,s0));
  await pg.click('[data-act="cal.today"]').catch(()=>{});await pg.waitForTimeout(300);
  ok('아래 칸 카드(로컬 = 전부)',(await pg.$$('#issStrip .iss-c')).length===3);
  ok('아래 칸 한 줄 · 현안 4줄 높이',await pg.evaluate(()=>{const c=[...document.querySelectorAll('#issStrip .iss-c')].map(e=>e.getBoundingClientRect());
    const u=document.querySelector('#issStrip .iss-c[data-sid="s1"] .iss-ul');return c.every(r=>Math.abs(r.top-c[0].top)<1)&&u.scrollHeight<=u.clientHeight+1&&u.querySelectorAll('.iss-i').length===3;}));
  await pg.click('[data-act="iss.open"]');await pg.waitForTimeout(300);
  ok('판 카드 기본 높이 = 현안 4줄',await pg.evaluate(()=>{const c=document.querySelector('#issPane .iss-c[data-sid="s2"]');return Math.abs(c.getBoundingClientRect().height-parseFloat(getComputedStyle(c).minHeight))<1&&parseFloat(getComputedStyle(c).minHeight)>150;}));
  ok('판 켬 — 아래 칸 숨음 · 단추 눌림',await pg.evaluate(()=>issOn()&&getComputedStyle($('#issStrip')).display==='none'&&$('[data-act="iss.open"]').getAttribute('aria-pressed')==='true'));
  await pg.click('#issPane .iss-c[data-sid="s3"] [data-act="iss.add"]');
  ok('빈 카드에 적을 땐 빈 문구 없음',await pg.evaluate(()=>!document.querySelector('#issPane .iss-c[data-sid="s3"] .iss-empty')));
  ok('초점은 보이는 입력 칸',await pg.evaluate(()=>!!document.activeElement.closest('#issPane')));
  await pg.keyboard.type('위젯 추가');await pg.keyboard.press('Enter');await pg.keyboard.press('Escape');
  await pg.click('[data-act="cal.prev"]');await pg.waitForTimeout(300);
  ok('달력 단추 → 판 끔 · 아래 칸 다시 그림',await pg.evaluate(()=>!issOn()&&$('#issStrip').innerHTML.includes('위젯 추가')));
  await pg.click('[data-act="iss.open"]');await pg.waitForTimeout(300);
  await pg.click('#issPane .iss-c[data-sid="s2"] .iss-ch b',{button:'right'});await pg.click('.ctxmenu .ctx-it');await pg.waitForTimeout(200);
  ok('우클릭 → 보드에서 빼기(팀 공통 저장)',await pg.evaluate(()=>!$('#issPane .iss-c[data-sid="s2"]')&&!!JSON.parse(localStorage.getItem('calapp.v1')).issHide.s2));
  await pg.click('#issPane [data-act="iss.more"]');
  ok('+ → 뺀 현장 목록',await pg.evaluate(()=>$('.ctxmenu').innerText.includes('현장명2')));
  await pg.click('.ctxmenu .ctx-it');await pg.waitForTimeout(200);
  ok('다시 넣기',await pg.evaluate(()=>!!$('#issPane .iss-c[data-sid="s2"]')&&!JSON.parse(localStorage.getItem('calapp.v1')).issHide.s2));
  await pg.click('#issPane [data-act="iss.sort"]');await pg.click('.ctxmenu .ctx-it:has-text("진행 많은 순")');await pg.waitForTimeout(200);
  await pg.click('#issPane [data-act="iss.sort"]');await pg.waitForTimeout(150);await pg.click('#issPane [data-act="iss.sort"]');await pg.waitForTimeout(300);
  ok('정렬 단추 다시 누르면 닫힘',await pg.evaluate(()=>!document.querySelector('.ctxmenu:not(.out)')));
  ok('정렬 — 진행 많은 순(내 설정 저장)',await pg.evaluate(()=>S.prefs.iss&&S.prefs.iss.sort==='open'&&document.querySelector('#issPane .iss-c').dataset.sid==='s1'));
  await pg.dblclick('#issPane .iss-c[data-sid="s1"] .iss-ch b');await pg.waitForTimeout(200);
  ok('머리 두 번 → 접기',await pg.evaluate(()=>$('#issPane .iss-c[data-sid="s1"]').classList.contains('fold')&&S.prefs.iss.fold==='s1'));
  ok('위젯 오류 없음',!perr.length,perr);await ctx.close();}

await br.close();srv.close();
console.log(fail?`\nFAIL ${fail}`:'\n주요 현안 PASS');process.exit(fail?1:0);
