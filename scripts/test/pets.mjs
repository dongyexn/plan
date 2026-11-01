/* 위젯 미니펫 회귀 — 그림 파일 누락(표정 포함) · 업무 대사 규칙 · 3마리 제한(넷째는 가장 먼저 올린 펫이 내려감) · 짝 대본 · 던지기 · 전체 펫 올림·놀기 오류.
   사용: node scripts/test/pets.mjs (CHROMIUM 경로를 줄 수 있다) */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const PORT=8541;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.gif':'image/gif','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
const srv=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]);const f=path.join(root,u==='/'?'index.html':u);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));}).listen(PORT);
let fail=0;const ok=(n,c,x)=>{console.log((c?'✓ ':'✗ ')+n+(c||x===undefined?'':'  → '+JSON.stringify(x)));if(!c)fail++;};
const W=ms=>new Promise(r=>setTimeout(r,ms));
const exe=process.env.CHROMIUM||'';
const br=await chromium.launch(Object.assign({args:['--no-sandbox']},exe?{executablePath:exe}:{}));
async function page(cfg,w=620,h=700){const ctx=await br.newContext({viewport:{width:w,height:h}});const pg=await ctx.newPage();const perr=[],nf=[];
  pg.on('pageerror',e=>perr.push(e.message));pg.on('response',r=>{if(r.status()>=400)nf.push(r.url());});
  await pg.addInitScript(c=>{localStorage.setItem('calapp.wid',JSON.stringify(c));},cfg);
  await pg.goto('http://localhost:'+PORT+'/index.html?local=1&w=1&glass=1');
  await pg.waitForFunction(n=>window.PETM&&document.querySelectorAll('.wgPet').length===n,(cfg.pets||[]).length,{timeout:15000}).catch(()=>{});await W(300);return{ctx,pg,perr,nf};}   /* 고정 2초 대신 펫이 다 올라올 때까지 */
/* 던진 먹이를 펫이 집을 때까지(그림이 사라짐) + 먹는 동작 */
const ballGone=async pg=>{await pg.waitForFunction(()=>!document.querySelector('.wgBall'),null,{timeout:9000}).catch(()=>{});await W(600);};
const bubbles=async(pg,n,until)=>{const log=[];for(let i=0;i<n;i++){await W(400);const t=(await pg.$$eval('.wgPet .bub.on',x=>x.map(y=>y.textContent))).join('|');
  if(t&&log[log.length-1]!==t)log.push(t);if(until&&log.some(x=>x.includes(until)))break;}return log;};

/* 1) 목록 — 쓰는 그림이 모두 있는지 */
const src=fs.readFileSync(path.join(root,'assets/pets.js'),'utf8');const s=src.indexOf('{',src.indexOf('CALAPP_PETS'));
const P=JSON.parse(src.slice(s,src.lastIndexOf('}')+1));const keys=Object.keys(P);
const miss=keys.flatMap(k=>{const v=P[k];return [...Object.values(v.g).map(g=>g.f),v.t.f,v.z.f,'av-'+k+'.png',...(v.it?['it-'+v.it+'.png']:[])].filter(f=>!fs.existsSync(path.join(root,'assets/pets',f))).map(f=>k+':'+f);});
ok('그림 파일 누락 없음('+keys.length+'종)',!miss.length,miss);
{const mm=keys.flatMap(k=>{const v=P[k];return [...String(v.mo||'')].flatMap(m=>[...new Set(['idle','walk','run'].filter(a=>v.g[a]).map(a=>v.g[a].f))].map(f=>f.replace(/\.gif$/,'-'+m+'.gif'))).filter(f=>!fs.existsSync(path.join(root,'assets/pets',f))).map(f=>k+':'+f);});
 ok('표정 그림 누락 없음(mo '+keys.filter(k=>P[k].mo).length+'종)',!mm.length,mm);}
{const sm=keys.filter(k=>P[k].s&&!fs.existsSync(path.join(root,'assets/pets',P[k].s.f)));ok('잠자는 그림 누락 없음(s '+keys.filter(k=>P[k].s).length+'종)',!sm.length,sm);}   /* 1300 */   /* 1298 — pets.js 의 mo(w·h)가 가리키는 기분 그림 */
ok('분류 c 지정(사람·안전·공종·사무)',keys.every(k=>'psto'.includes(P[k].c||'-')),keys.filter(k=>!'psto'.includes(P[k].c||'-')));

/* 2) 3마리 제한 */
{const{ctx,pg,perr}=await page({pets:['manager','worker','cone']});
  ok('세 마리 표시',(await pg.$$eval('.wgPet',a=>a.length))===3);
  await pg.evaluate(()=>petToggle('helm'));await W(500);
  ok('넷째를 올리면 가장 먼저 올린 펫이 내려감',JSON.stringify(await pg.evaluate(()=>petKeys()))===JSON.stringify(['worker','cone','helm']));
  await pg.evaluate(()=>petToggle('cone'));await W(400);ok('다시 누르면 내림',(await pg.$$eval('.wgPet',a=>a.length))===2);
  ok('오류 없음(제한)',!perr.length,perr);await ctx.close();}

/* 3) 짝 대본 */
const PAIRS=[['sf-bell','beacon','띵동! 호출 눌렀어요','삐뽀삐뽀! 장비 정지!'],['excavator','dump','흙 퍼 담습니다~','덜컹! 반출 갑니다'],['of-mouse','of-kbd','나 없으면 클릭 못 해요','나 없으면 글자 못 쳐요'],
  ['sf-wind','crane','풍속 10m/s 넘었어요!','인양 작업 중지합니다'],['plumber','tr-pipe','배관 손볼게!','뻥 뚫렸다!'],
  ['cs','angry','내일 오전 방문할게요!','네, 꼭 드릴게요!']];
/* 짝 6쌍·던지기 4종은 창을 따로 띄워 한꺼번에 돌린다(대사·먹기 시간은 앱 속도라 줄일 수 없어 기다림을 겹친다) — 결과는 순서대로 적는다 */
const pairRes=await Promise.all(PAIRS.map(async([a,b,t1,t2])=>{const{ctx,pg,perr,nf}=await page({pets:[b,a]});await pg.evaluate(()=>PET.play());const log=await bubbles(pg,40,t2);
  await ctx.close();return ['짝 '+a+'↔'+b,log.some(x=>x.includes(t1))&&log.some(x=>x.includes(t2))&&!perr.length&&!nf.length,{log,perr,nf}];}));
pairRes.forEach(r=>ok(...r));

/* 4) 던지기 — 펫별 먹이 그림 */
const thrRes=await Promise.all(['plumber','sf-radio','of-kbd','tr-tree'].map(async k=>{const{ctx,pg,perr,nf}=await page({pets:[k]});
  const cx=await pg.$eval('.wgPet',e=>{const r=e.getBoundingClientRect();return r.left+r.width/2+120;});
  await pg.evaluate(x=>PET.throwBall(x),cx);await W(250);
  const bg=await pg.$eval('.wgBall',e=>e.style.backgroundImage).catch(()=>'');await ballGone(pg);
  await ctx.close();return ['던지기 '+k,bg.includes('it-'+(P[k].it||'heart')+'.png')&&!perr.length&&!nf.length,{bg,perr,nf}];}));
thrRes.forEach(r=>ok(...r));

/* 5) 전체 — 한 창에서 세 마리씩 바꿔 올려 놀고 던짐(창을 매번 새로 열지 않아 빠르다).
   펫 코드·그림(pet.js · assets/pets*)이 main 과 달라졌거나 PETS_FULL=1 이면 75종 전부, 아니면 묶음 5개 표본(처음·끝 포함) */
let full=process.env.PETS_FULL==='1';
if(!full){try{const {execSync}=await import('child_process');
  const d=execSync('git diff --name-only origin/main...HEAD; git diff --name-only HEAD',{cwd:root,stdio:['ignore','pipe','ignore']}).toString();
  full=/(^|\n)(pet\.js|assets\/pets)/.test(d);}catch(e){full=true;}}   /* 비교 못 하면 전부(안전 쪽) */
const grp=[];for(let i=0;i<keys.length;i+=3)grp.push(keys.slice(i,i+3));
const pick=full?grp:grp.filter((g,i)=>i===0||i===grp.length-1||i%6===3);
const bad=[];const sweep=async part=>{const{ctx,pg,perr,nf}=await page({pets:[]});   /* 창 4개에 나눠 동시에 */
  for(const ks of part){const e0=perr.length,n0=nf.length;
    await pg.evaluate(ks=>{const c=widCfgLoad();c.pets=ks;widCfgSave(c);petSync();},ks);
    await pg.waitForFunction(n=>document.querySelectorAll('.wgPet').length===n,ks.length,{timeout:5000}).catch(()=>{});await W(200);
    const n=await pg.$$eval('.wgPet',a=>a.length);await pg.evaluate(()=>PET.play());await W(1500);
    const cx=await pg.$eval('.wgPet',e=>{const r=e.getBoundingClientRect();return r.left+r.width/2+100;});await pg.evaluate(x=>PET.throwBall(x),cx);await ballGone(pg);
    if(perr.length>e0||nf.length>n0||n!==ks.length)bad.push({ks,n,perr:perr.slice(e0),nf:nf.slice(n0)});}
  await ctx.close();};
await Promise.all([0,1,2,3].map(j=>sweep(pick.filter((_,i)=>i%4===j))));
ok((full?'전체 '+keys.length+'종':'표본 '+pick.length+'묶음('+keys.length+'종 중 · 전체는 PETS_FULL=1)')+' 올림·놀기·던지기 오류 없음',!bad.length,bad);

/* 6) 본편(위젯 아님)은 pet.js 를 받지 않는다 */
{const ctx=await br.newContext({viewport:{width:900,height:700}});const pg=await ctx.newPage();const got=[];pg.on('request',r=>{if(/\/pet\.js|pets\.js/.test(r.url()))got.push(r.url());});
  await pg.goto('http://localhost:'+PORT+'/index.html?local=1');await W(2500);ok('본편은 pet.js·pets.js 를 받지 않음',!got.length,got);await ctx.close();}

/* 7) 업무 대사 규칙(1297~1299) — 순서(지남→오늘→내일 마감→나머지) · 같은 업무 30분 쉼 · 7일 넘은 지난 업무 제외 · 기간 업무는 끝나는 날 · 다 쉬면 일반 대사 · 다음 대사 2.5~3.5분.
   혼잣말 타이머(150~210초)를 잡아 두고 바로 부른다. Math.random .1 = 업무 대사 · .9 = 일반 대사 */
{const ctx=await br.newContext({viewport:{width:760,height:640}});const pg=await ctx.newPage();const perr=[];pg.on('pageerror',e=>perr.push(e.message));
  await pg.addInitScript(()=>{localStorage.setItem('calapp.wid',JSON.stringify({pets:['manager']}));window.__talk=[];const st=window.setTimeout;
    window.setTimeout=function(f,ms,...a){if(ms>=150000&&ms<=210000&&typeof f==='function'){window.__talk.push(ms);window.__talkFn=f;return 1;}return st.call(this,f,ms,...a);};});
  await pg.goto('http://localhost:'+PORT+'/index.html?local=1&w=1&glass=1');
  await pg.waitForFunction(()=>window.PETM&&document.querySelector('.wgPet')&&window.__talkFn,null,{timeout:15000}).catch(()=>{});
  await pg.evaluate(()=>{window.curTeam=()=>({id:'tm'});const me=myId(),d=todayStr(),A={[me]:true};
    S.tasks.tm={c:{text:'공통 오늘',date:d,assignees:{}}};
    S.tasks[me]={r:{text:'나머지',date:addDays(d,5),assignees:A},p:{text:'기간 내일 끝',date:addDays(d,-1),end:addDays(d,1),assignees:A},
      l:{text:'지난 업무',date:addDays(d,-3),assignees:A},o:{text:'오래된 업무',date:addDays(d,-10),assignees:A},q:{text:'기간 진행',date:addDays(d,-4),end:addDays(d,4),assignees:A}};});
  const talk=r=>pg.evaluate(r=>{const mr=Math.random;Math.random=()=>r;try{window.__talkFn();}finally{Math.random=mr;}return document.querySelector('.wgPet .bub').textContent;},r);
  const seq=[];for(let i=0;i<6;i++)seq.push(await talk(.1));
  ok('업무 대사 순서 — 지남 → 오늘 → 내일 마감 → 나머지',/지난 업무 기한 지났어/.test(seq[0])&&/(공통 오늘|기간 진행)/.test(seq[1])&&/(공통 오늘|기간 진행)/.test(seq[2])&&/기간 내일 끝 내일까지/.test(seq[3])&&/나머지/.test(seq[4]),seq);
  ok('7일 넘은 지난 업무는 말 안 함 · 다 말하면 30분 쉼(일반 대사로)',!seq.some(t=>/오래된/.test(t))&&!/(지난|공통|기간|나머지)/.test(seq[5]),seq);
  ok('일반 대사(.9)',!/(지난|공통|기간|나머지)/.test(await talk(.9)));
  const mood=await pg.evaluate(()=>{const me=myId(),k=S.tasks[me];const r1=petMood();S.tasks[me]={o:k.o,q:k.q};const r2=petMood();S.tasks[me]=k;return [r1,r2];});
  ok('기분 — 3일 지난 업무 걱정 · 10일 지난 업무와 진행 중 기간 업무만이면 걱정 아님',mood[0]==='worry'&&mood[1]==='',mood);
  const ds=await pg.evaluate(()=>window.__talk.slice(1));ok('다음 대사 2.5~3.5분',ds.length>=6&&ds.every(m=>m>=150000&&m<=210000),ds);
  /* 1300 잠 — 1분 넘게 마우스가 없으면 잠자는 그림 + Z, 마우스가 오면 깸 */
  await pg.evaluate(()=>{petAct=performance.now()-70000;});
  const zz=await pg.waitForFunction(()=>{const e=document.querySelector('.wgPet');return e&&e.classList.contains('zz')&&/-s\.gif/.test(e.querySelector('img').src);},null,{timeout:12000}).then(()=>true,()=>false);
  ok('잠 — 잠자는 그림(-s.gif) + Z',zz);
  await pg.mouse.move(5,300);await pg.mouse.move(40,320);await W(400);
  ok('잠 — 마우스가 오면 깸',await pg.evaluate(()=>{const e=document.querySelector('.wgPet');return !e.classList.contains('zz')&&!/-s\.gif|-z\.png/.test(e.querySelector('img').src);}));
  ok('대사 규칙 시험 페이지 오류 없음',!perr.length,perr);await ctx.close();}

await br.close();srv.close();
console.log(fail?'FAIL '+fail:'PASS');process.exitCode=fail?1:0;
