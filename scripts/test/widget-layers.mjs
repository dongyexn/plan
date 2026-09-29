/* 위젯 겹침·닫기 회귀 — 떠 있는 창(팝업·시트·확인창)을 실제 키·마우스로 열고 닫는다.
   검사: 층마다 Esc·바깥 클릭·여는 버튼 다시 누름 · 확인창이 위에 있으면 Esc 는 확인창만 ·
   팝업 닫을 때 편집기 잔류 없음 · 좁은 위젯 폭 · 말풍선·아침 확인·새 판 적용·←→ 가 확인창을 존중 ·
   폰에서 바깥 탭 한 번은 닫기만(아래 칸이 눌리지 않음).
   사용: node scripts/test/widget-layers.mjs (로컬은 CHROMIUM 경로를 줄 수 있다) */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const PORT=8527;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
const srv=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]);const f=path.join(root,u==='/'?'index.html':u);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));}).listen(PORT);

let fail=0;const ok=(n,c,x)=>{console.log((c?'✓ ':'✗ ')+n+(c||x===undefined?'':'  → '+JSON.stringify(x)));if(!c)fail++;};
const exe=process.env.CHROMIUM||'';
const br=await chromium.launch(Object.assign({args:['--no-sandbox']},exe?{executablePath:exe}:{}));

/* 가상 조직·업무 — 실제 현장명은 쓰지 않는다 */
const seed=()=>{
  S.org=S.org||{};S.org.teams=[{id:'t1',name:'테스트팀'}];S.org.regions=[{id:'r1',name:'권역1',team:'t1'}];
  S.org.sites=Array.from({length:4},(_,i)=>({id:'s'+i,name:'테스트현장'+i,region:'r1',team:'t1',units:500,buildings:5,completionDate:'2025-03-31'}));
  S.accounts=Object.assign(S.accounts||{},{u1:{name:'직원1',avColor:'#3E71D2'},u2:{name:'직원2',avColor:'#DD3B30'}});
  S.tasks={u1:{}};const t=todayStr();
  for(let k=0;k<10;k++)S.tasks.u1['k'+k]={text:'업무 '+k,date:addDays(t,k%5-2),end:'',site:'s'+(k%4),assignees:{u1:1},st:k%3?1:2,createdAt:1000+k,updatedAt:1000+k};
  if(typeof normOrg==='function')normOrg(S.org);
  if(typeof calRerender==='function')calRerender();if(typeof rWidget==='function')rWidget();
};
async function open(W,H,q,mobile){
  const ctx=await br.newContext({viewport:{width:W,height:H},deviceScaleFactor:1,isMobile:!!mobile,hasTouch:!!mobile});
  const pg=await ctx.newPage();const perr=[];pg.on('pageerror',e=>perr.push(e.message));
  await pg.goto('http://localhost:'+PORT+'/index.html?'+q);await pg.waitForTimeout(1500);
  await pg.evaluate(seed);await pg.waitForTimeout(500);
  return {ctx,pg,perr};
}
const ST=pg=>pg.evaluate(()=>({
  msel:!!document.querySelector('.msel.open'),mo:$('#mo').classList.contains('open'),ym:!!ymPopEl(),
  wg:!!($('#wgSet')&&$('#wgSet').classList.contains('on')),filt:!!($('#calFilt')&&$('#calFilt').classList.contains('on')),
  side:!!($('#widSide')&&$('#widSide').classList.contains('on')),nq:!!($('#nqPanel')&&$('#nqPanel').classList.contains('on')),
  pop:!!S.widPop,plan:!!S.planEdit}));
const W=ms=>new Promise(r=>setTimeout(r,ms));
/* 층을 모두 걷는다 — 각 검사를 깨끗한 상태에서 시작 */
const reset=async pg=>{await pg.evaluate(()=>{
  if($('#mo').classList.contains('open'))closeModal();mselClose();closeYMPop();calFiltClose();
  const wg=$('#wgSet');if(wg){wg.classList.remove('on');wg.setAttribute('aria-hidden','true');}
  const sd=$('#widSide');if(sd){sd.classList.remove('on');S.widSide='';}
  if(typeof nqOpen==='function')nqOpen(false);
  S.widPop=false;if(S.planEdit)closePlanEdit();rWidget();
  const ae=document.activeElement;if(ae&&ae.blur)ae.blur();});await W(350);};
/* 떠 있는 창 밖의 빈 자리 — 요일 머리 칸 중 맨 위가 그 칸 자신인 곳 */
const outsideXY=pg=>pg.evaluate(()=>{
  for(const c of document.querySelectorAll('.fc-col-header-cell')){const r=c.getBoundingClientRect();
    const x=r.x+r.width/2,y=r.y+r.height/2,h=document.elementFromPoint(x,y);if(h&&c.contains(h))return [x,y];}
  return [4,innerHeight-4];});
const clickOutside=async pg=>{const [x,y]=await outsideXY(pg);await pg.mouse.click(x,y);await W(350);};
const dayCell=(pg,i=2)=>pg.locator('#fcal td.fc-daygrid-day').nth(i);

/* ═══ 위젯 460×820 ═══ */
{
  const {ctx,pg,perr}=await open(460,820,'local=1&w=1&glass=1');
  const L={
    ym:  {open:()=>pg.click('.cal-title'),toggle:true},
    wg:  {open:()=>pg.click('[data-act="wid.set"]'),toggle:true},
    filt:{open:()=>pg.click('[data-act="day.fmore"]'),toggle:true},
    side:{open:()=>pg.click('[data-act="wid.side"]'),toggle:true},
    nq:  {open:()=>pg.click('[data-act="nq.toggle"]'),toggle:false},   /* 찾기는 헤더 입력칸이 여는 버튼 — 토글 검사 제외 */
    pop: {open:()=>dayCell(pg).click(),toggle:false},   /* 460 폭에선 팝업이 칸을 덮어 같은 칸을 다시 누를 수 없다 */
  };
  for(const [k,o] of Object.entries(L)){
    await reset(pg);await o.open();await W(400);
    let s=await ST(pg);ok('위젯 '+k+' 열림',s[k],s);
    await pg.keyboard.press('Escape');await W(350);s=await ST(pg);ok('위젯 '+k+' Esc 로 닫힘',!s[k],s);
    await o.open();await W(400);await clickOutside(pg);s=await ST(pg);ok('위젯 '+k+' 바깥 클릭으로 닫힘',!s[k],s);
    if(o.toggle){await o.open();await W(400);await o.open();await W(400);s=await ST(pg);ok('위젯 '+k+' 여는 버튼 다시 누르면 닫힘',!s[k],s);}
    /* 확인창이 위에 있으면 Esc 는 확인창만 닫고, 다음 Esc 가 아래 층을 닫는다 */
    await reset(pg);await o.open();await W(400);
    await pg.evaluate(()=>openModal('확인','<p>시험</p>',''));await W(300);
    await pg.keyboard.press('Escape');await W(350);s=await ST(pg);ok('위젯 '+k+' 위 확인창 — Esc 1회는 확인창만',!s.mo&&s[k],s);
    await pg.keyboard.press('Escape');await W(350);s=await ST(pg);ok('위젯 '+k+' 위 확인창 — Esc 2회에 아래 층',!s[k],s);
  }
  /* 필터 안 다중 선택 목록 — Esc·바깥(필터 안 다른 곳) 모두 목록만 닫는다 */
  await reset(pg);await L.filt.open();await W(400);await pg.click('#calFilt .msel-b');await W(300);
  let s=await ST(pg);ok('필터 목록 열림',s.msel&&s.filt,s);
  await pg.keyboard.press('Escape');await W(300);s=await ST(pg);ok('필터 목록 Esc 는 목록만',!s.msel&&s.filt,s);
  await pg.click('#calFilt .msel-b');await W(300);
  {const r=await pg.locator('#calFilt').boundingBox();await pg.mouse.click(r.x+r.width-6,r.y+6);await W(300);}
  s=await ST(pg);ok('필터 목록 바깥(필터 안) 클릭은 목록만',!s.msel&&s.filt,s);
  /* 팝업 편집기 — 어떻게 닫아도 편집기가 남지 않는다 */
  const plan=async()=>{await reset(pg);await L.pop.open();await W(400);await pg.click('#widPop [data-act="plan.new"]');await W(400);};
  await plan();s=await ST(pg);ok('편집기 열림',s.pop&&s.plan,s);
  await pg.keyboard.press('Escape');await W(350);s=await ST(pg);ok('편집기 Esc — 팝업·편집기 함께 닫힘',!s.pop&&!s.plan,s);
  await plan();await clickOutside(pg);s=await ST(pg);ok('편집기 바깥 클릭 — 편집기 남지 않음',!s.pop&&!s.plan,s);
  await plan();await pg.click('#widPop [data-act="wid.popClose"]');await W(400);s=await ST(pg);ok('편집기 ✕ — 편집기 남지 않음',!s.pop&&!s.plan,s);
  /* 알림창은 데이터가 바뀌면 다시 그린다 */
  await reset(pg);await L.side.open();await W(400);
  s=await pg.evaluate(()=>{let n=0;const f=widSideRender;window.widSideRender=function(){n++;return f.apply(this,arguments);};rWidget();window.widSideRender=f;return n;});
  ok('알림창 열린 채 rWidget → 다시 그림',s>0,s);
  /* 확인창 존중 — ←→ · 말풍선 · 아침 확인 · 새 판 적용 */
  await reset(pg);
  const t0=await pg.textContent('.cal-title');
  await pg.evaluate(()=>openModal('확인','<p>시험</p>',''));await W(300);
  await pg.keyboard.press('ArrowRight');await W(300);ok('확인창 중 → 로 달 안 넘김',(await pg.textContent('.cal-title'))===t0);
  await pg.keyboard.press('Escape');await W(300);
  await pg.keyboard.press('ArrowRight');await W(300);ok('확인창 닫힌 뒤 → 로 달 넘김',(await pg.textContent('.cal-title'))!==t0);
  await pg.keyboard.press('ArrowLeft');await W(300);
  await pg.evaluate(()=>{window.eveOn=()=>true;openModal('확인','<p>시험</p>','');});await W(200);
  await pg.evaluate(()=>evePopShow(true));
  ok('확인창 중 말풍선 보류',!(await pg.evaluate(()=>!!$('#evePop'))));
  s=await pg.evaluate(()=>{morningReview();return !!morningReview._t;});ok('확인창 중 아침 확인 미룸',s);
  await pg.evaluate(()=>{clearTimeout(morningReview._t);closeModal();});await W(5400);
  ok('확인창 닫힌 뒤 말풍선 표시',await pg.evaluate(()=>!!$('#evePop')));
  await W(10500);ok('말풍선 10초 뒤 접힘',!(await pg.evaluate(()=>!!$('#evePop'))));
  ok('평소 새 판 적용 가능',await pg.evaluate(()=>verIdle()));
  ok('이동 중 새 판 적용 보류',!(await pg.evaluate(()=>{widMove(true);const v=verIdle();widMove(false);return v;})));
  /* 찾기를 Esc 로 닫으면 숨은 입력칸에 초점이 남지 않는다(남으면 실시간 반영·자동 업데이트가 멈춘다) */
  await reset(pg);await L.nq.open();await W(300);await pg.keyboard.type('업무');await W(200);
  await pg.keyboard.press('Escape');await W(300);
  s=await pg.evaluate(()=>({inNq:!!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#nqPanel')),hold:tkHold()}));
  ok('찾기 Esc 뒤 초점·보류 풀림',!s.inNq&&!s.hold,s);
  /* 편집 중 미룬 실시간 반영 — 보통 속도(110ms) 바깥 클릭으로 닫아도 몰아 그린다 */
  await reset(pg);
  {const c=await pg.evaluate(()=>{const td=document.querySelector('#fcal td[data-date="'+todayStr()+'"]');const r=td.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height-6];});
   await pg.mouse.click(c[0],c[1]);await W(400);}
  await pg.click('#widPop [data-act="plan.new"]');await W(400);
  s=await pg.evaluate(()=>{const v=JSON.parse(JSON.stringify(S.tasks));v.u1.remote={text:'원격 추가',date:todayStr(),end:'',site:'',assignees:{u1:1},st:1,createdAt:5,updatedAt:5};
    S.tasks=v;if(tkHold()){PEND.tasks=true;PEND.day=true;return 'held';}rTasks();refetchCal();rDay();rWidget();return 'rendered';});
  ok('편집 중 실시간 반영은 미룸',s==='held',s);
  {const [x,y]=await outsideXY(pg);await pg.mouse.move(x,y);await pg.mouse.down();await W(110);await pg.mouse.up();await W(500);}
  s=await pg.evaluate(()=>({pend:PEND.day||PEND.tasks,plan:!!S.planEdit,ev:CAL.getEvents().some(e=>e.title&&e.title.includes('원격'))}));
  ok('보통 속도 바깥 클릭으로 닫은 뒤 미룬 반영이 그려짐',!s.pend&&!s.plan&&s.ev,s);
  /* 아침 확인 — 창을 띄운 뒤 다른 곳에서 옮긴 업무는 닫을 때 보류로 넘기지 않는다 */
  await reset(pg);
  s=await pg.evaluate(()=>{const me=myId();if(!me)return 'no-me';const t=todayStr();const v=JSON.parse(JSON.stringify(S.tasks));v[me]=v[me]||{};
    v[me].mx={text:'지난업무X',date:addDays(t,-2),end:'',site:'',assignees:{[me]:1},st:1,createdAt:1,updatedAt:1};
    v[me].my={text:'지난업무Y',date:addDays(t,-2),end:'',site:'',assignees:{[me]:1},st:1,createdAt:2,updatedAt:2};
    S.tasks=v;try{localStorage.removeItem(mrvKey());}catch(e){}morningReview();
    return [...document.querySelectorAll('#mbody .mrv-i')].map(r=>r.dataset.iid).join(',');});
  ok('아침 확인에 두 업무',/mx/.test(s)&&/my/.test(s),s);
  await pg.evaluate(()=>{const me=myId();S.tasks[me].mx={...S.tasks[me].mx,date:addDays(todayStr(),7),updatedAt:Date.now()};
    window.__puts=[];const f=store.putTask.bind(store);store.putTask=(a,b,c)=>{window.__puts.push(b+':'+c.st);return f(a,b,c);};});
  await pg.keyboard.press('Escape');await W(400);
  s=await pg.evaluate(()=>window.__puts);ok('닫을 때 옮긴 업무는 건너뛰고 남은 것만 보류',s.length===1&&s[0]==='my:3',s);
  /* 창 크기가 바뀌면 팝업이 창 안·칸 옆으로 다시 */
  await reset(pg);await dayCell(pg,30).click({force:true});await W(400);
  await pg.setViewportSize({width:400,height:520});await W(500);
  s=await pg.evaluate(()=>{const b=$('#widPop').getBoundingClientRect();return [Math.round(b.bottom),Math.round(b.right),innerWidth,innerHeight];});
  ok('창을 줄여도 팝업이 창 안',s[0]<=s[3]&&s[1]<=s[2],s);
  await pg.setViewportSize({width:460,height:820});await W(400);
  ok('위젯 460 페이지 오류 없음',!perr.length,perr);
  await ctx.close();
}
/* ═══ 데스크톱 1560×1000 — 같은 층 목록을 쓰는 앱 화면 ═══ */
{
  const {ctx,pg,perr}=await open(1560,1000,'local=1');
  const D={
    ym:  ()=>pg.click('.cal-title'),
    filt:()=>pg.click('[data-act="day.fmore"]'),
    nq:  ()=>pg.keyboard.press('Control+k'),
  };
  for(const [k,o] of Object.entries(D)){
    await reset(pg);await o();await W(400);
    let s=await ST(pg);ok('데스크톱 '+k+' 열림',s[k],s);
    await pg.keyboard.press('Escape');await W(350);s=await ST(pg);ok('데스크톱 '+k+' Esc 로 닫힘',!s[k],s);
    await o();await W(400);await clickOutside(pg);s=await ST(pg);ok('데스크톱 '+k+' 바깥 클릭으로 닫힘',!s[k],s);
  }
  await reset(pg);await pg.click('#view-calendar [data-act="plan.new"]');await W(400);
  let s=await ST(pg);ok('데스크톱 편집기 열림',s.plan,s);
  await pg.keyboard.press('Escape');await W(350);s=await ST(pg);ok('데스크톱 편집기 Esc 로 닫힘',!s.plan,s);
  await pg.evaluate(()=>go('tasks'));await W(700);
  await pg.click('[data-act="tk.newOpen"]');await W(500);
  ok('데스크톱 업무 폼 열림',await pg.evaluate(()=>!!(S.tkNew||S.tkEdit)));
  await pg.evaluate(()=>{const a=document.activeElement;if(a&&a.blur)a.blur();});
  await pg.keyboard.press('Escape');await W(400);ok('데스크톱 업무 폼 Esc 로 닫힘',await pg.evaluate(()=>!(S.tkNew||S.tkEdit)));
  /* createdAt 이 없는 옛 업무 — 고치거나 상태만 바꿔도 순서(목록·달력 칸)가 그대로 */
  await pg.evaluate(()=>{go('calendar');const t=todayStr();const d=store._d;d.tasks={me:{
    aold:{text:'가옛업무',date:t,st:1,updatedAt:1},bnew:{text:'나업무',date:t,st:1,createdAt:2000,updatedAt:2000},cnew:{text:'다업무',date:t,st:1,createdAt:3000,updatedAt:3000}}};
    S.tasks=d.tasks;lsSave(d);selDate(t);refetchCal();rDay();});await W(700);
  const ord=()=>pg.evaluate(()=>[...document.querySelectorAll('#view-calendar .day-panel [data-pid]')].map(e=>e.dataset.pid).filter((v,i,a)=>a.indexOf(v)===i).join(',')
    +'|'+[...document.querySelectorAll('#fcal td[data-date="'+todayStr()+'"] .fc-event')].map(e=>e.textContent.trim().slice(0,1)).join(','));
  const o0=await ord();
  await pg.click('#view-calendar .day-panel [data-pid="aold"]');await W(500);
  await pg.click('#peTitle');await pg.keyboard.press('End');await pg.keyboard.type('수정');await W(900);await pg.keyboard.press('Enter');await W(600);
  const o1=await ord();ok('옛 업무 고친 뒤 순서 그대로',o1===o0,[o0,o1]);
  await pg.evaluate(()=>{store.putTask('me','aold',{...S.tasks.me.aold,st:2,updatedAt:Date.now()});store.putTask('me','aold',{...S.tasks.me.aold,st:1,updatedAt:Date.now()});refetchCal();rDay();});await W(500);
  const o2=await ord();ok('옛 업무 상태 바꾼 뒤 순서 그대로',o2===o0,[o0,o2]);
  ok('데스크톱 페이지 오류 없음',!perr.length,perr);
  await ctx.close();
}
/* ═══ 위젯 360×560 — 팝업이 창 안에 ═══ */
{
  const {ctx,pg,perr}=await open(360,560,'local=1&w=1&glass=1');
  await dayCell(pg,9).click();await W(500);
  const r=await pg.evaluate(()=>{const p=$('#widPop');if(!p)return null;const b=p.getBoundingClientRect();return [Math.round(b.left),Math.round(b.right),innerWidth];});
  ok('위젯 360 팝업이 창 안',r&&r[0]>=0&&r[1]<=r[2],r);
  ok('위젯 360 페이지 오류 없음',!perr.length,perr);
  await ctx.close();
}
/* ═══ 폰 390×844 — 바깥 탭 한 번은 닫기만 ═══ */
{
  const {ctx,pg,perr}=await open(390,844,'local=1',true);
  const sheet=()=>pg.evaluate(()=>!!((typeof mdsOn==='function'&&mdsOn())||S.dpSheet));
  await pg.locator('#topbar .tbt-ym').tap();await W(400);
  ok('폰 연·월 팝업 열림',await pg.evaluate(()=>!!ymPopEl()));
  /* 팝업에 가리지 않은 날짜 칸(맨 위가 그 칸 자신) 중 마지막 것 */
  const xy=await pg.evaluate(()=>{let p=null;for(const b of document.querySelectorAll('.mc-d[data-act="cal.day"]')){const r=b.getBoundingClientRect();if(!r.width)continue;
    const x=r.x+r.width/2,y=r.y+r.height/2,h=document.elementFromPoint(x,y);if(h&&b.contains(h))p=[x,y];}return p;});
  ok('폰 가리지 않은 날짜 칸 있음',!!xy);
  if(xy){
    await pg.touchscreen.tap(xy[0],xy[1]);await W(500);
    ok('폰 바깥 탭 — 팝업만 닫고 날짜 시트는 안 열림',!(await pg.evaluate(()=>!!ymPopEl()))&&!(await sheet()));
    await pg.touchscreen.tap(xy[0],xy[1]);await W(600);ok('폰 (대조) 팝업 없을 때 칸 탭은 시트를 연다',await sheet());
  }
  /* 메뉴 시트가 올라오는 중(0.2초)에 「설정」을 눌러도 설정으로 — click 이 아래 줄에 떨어지지 않게 */
  {const cdp=await ctx.newCDPSession(pg);
   const tch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
   const tap=async(x,y)=>{await tch('touchStart',x,y);await W(60);await tch('touchEnd',x,y);};
   const res=[];
   for(const dl of [160,200,240,280]){
     await pg.evaluate(()=>{if(typeof mdsClose==='function')mdsClose();go('calendar');mssClose();});await W(700);
     const m=await pg.evaluate(()=>{const r=$('#mtab .mtab-m').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];});
     await tap(m[0],m[1]);await W(dl);
     const sp=await pg.evaluate(()=>{const e=document.querySelector('#mss [data-view="settings"]');const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];});
     await tap(sp[0],sp[1]);await W(500);
     res.push(dl+':'+(await pg.evaluate(()=>S.view)));}
   ok('폰 메뉴 올라오는 중 「설정」 한 번에',res.every(r=>r.endsWith(':settings')),res);}
  ok('폰 페이지 오류 없음',!perr.length,perr);
  await ctx.close();
}
await br.close();srv.close();
console.log(fail?`\nFAIL ${fail}`:'\n위젯 겹침·닫기 PASS');
process.exitCode=fail?1:0;
