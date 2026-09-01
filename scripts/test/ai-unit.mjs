/* AI 연결·호출 단위 검증(675차) — e2e-defect 가 못 잡는 타이밍·오류 경로만 본다.
   여기 있는 것들은 전부 실제로 났던(또는 코드상 확실했던) 결함이다:
     · aiConfLoad 읽기가 끝나기 전에 한 칸을 고치면 나머지 두 칸이 지워지던 것(set → update)
     · 배포를 바꿔도 _azMode 가 남아 새 배포에서 계속 400 이 나던 것
     · 프록시가 HTML 을 돌려주면 파싱 오류 문구만 뜨던 것
     · 코드펜스 뒤 개행 하나에 JSON.parse 가 터지던 것
     · 버튼 연타로 3만자 프롬프트가 두 번 나가던 것
   Firebase 는 페이지 안 가짜 트리로 대체(e2e-defect 와 같은 발상). fetch 도 갈아끼운다.
   사용: node scripts/test/ai-unit.mjs (CHROMIUM 환경변수로 브라우저 지정 가능) */
import {chromium} from 'playwright';
import http from 'http';import fs from 'fs';import path from 'path';
import {fileURLToPath} from 'url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png'};
const srv=http.createServer((q,r)=>{const u=q.url.split('?')[0];const f=path.join(root,u==='/'?'index.html':u);
 if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
 r.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});r.end(fs.readFileSync(f));}).listen(8401);
let fail=0;const ok=(n,c,x='')=>{console.log((c?'✓ ':'✗ ')+n+(x?' — '+x:''));if(!c)fail++;};
const exe=process.env.CHROMIUM||'';
const br=await chromium.launch(Object.assign({args:['--no-sandbox']},exe?{executablePath:exe}:{}));
const pg=await br.newPage();const perr=[];pg.on('pageerror',e=>perr.push(e.message));
await pg.goto('http://localhost:8401/index.html?local=1');await pg.waitForTimeout(1500);

await pg.evaluate(()=>{
  window.__DB__={};window.__CALLS__=[];window.__DELAY__=0;
  FB.db={ref:p=>({
    once:async()=>{if(window.__DELAY__)await new Promise(r=>setTimeout(r,window.__DELAY__));return {val:()=>window.__DB__[p]||null};},
    set:async v=>{window.__DB__[p]=JSON.parse(JSON.stringify(v));window.__CALLS__.push(['set',p,v]);},
    update:async u=>{window.__DB__[p]=Object.assign({},window.__DB__[p]||{},JSON.parse(JSON.stringify(u)));window.__CALLS__.push(['update',p,u]);},
    on:()=>{},off:()=>{},
  })};
  S.live=true;S.role='editor';S.snap=false;S.user={email:'e1@hdec.co.kr'};
  window.__TOASTS__=[];const t0=window.toast;window.toast=(m,d)=>{window.__TOASTS__.push(m);return t0?t0(m,d):null;};
});

/* ① 옛 localStorage 키 정리 */
console.log(ok('부팅 시 옛 키 제거(calapp.ck·calapp.ai)', await pg.evaluate(()=>{
  return !localStorage.getItem('calapp.ck')&&!localStorage.getItem('calapp.ai');})) ?? '');

/* ② 읽기 완료 전 저장 — 다른 칸이 지워지지 않아야 한다 */
const r2=await pg.evaluate(async()=>{
  window.__DB__['aiConf']={endpoint:'https://old.services.ai.azure.com',deployment:'old-dep',key:'OLDKEY'};
  window.__DELAY__=300;_aiConfP=null;S.azEp='';S.azDep='';S.azCk='';
  aiConfLoad();                       /* 읽기 시작(아직 안 끝남) */
  const e=document.getElementById('dfAzDep');e.value='new-dep';e.dispatchEvent(new Event('change',{bubbles:true}));
  await new Promise(r=>setTimeout(r,600));
  window.__DELAY__=0;
  return {db:window.__DB__['aiConf'],ops:window.__CALLS__.map(c=>c[0])};
});
ok('읽기 전 저장해도 다른 칸이 안 지워진다',r2.db.endpoint==='https://old.services.ai.azure.com'&&r2.db.key==='OLDKEY'&&r2.db.deployment==='new-dep',JSON.stringify(r2.db));
ok('전체 set 이 아니라 update 로 쓴다',r2.ops.every(o=>o==='update'),r2.ops.join(','));

/* ③ 배포를 바꾸면 모델 계열 캐시가 풀린다 */
const r3=await pg.evaluate(async()=>{
  window.__DB__['aiConf']={endpoint:'https://x.services.ai.azure.com',deployment:'d1',key:'K'};
  _aiConfP=null;await aiConfLoad(true);
  const bodies=[];
  window.fetch=async(u,o)=>{const b=JSON.parse(o.body);bodies.push(b);
    if('temperature' in b)return{ok:false,status:400,text:async()=>JSON.stringify({error:{message:"Unsupported parameter: 'temperature'"}})};
    return{ok:true,status:200,text:async()=>JSON.stringify({choices:[{message:{content:'ok'},finish_reason:'stop'}]})};};
  await AI.text({system:'s',prompt:'p'});          /* 추론 모델로 확정 */
  const modeA=_azMode;
  const e=document.getElementById('dfAzDep');e.value='d2';e.dispatchEvent(new Event('change',{bubbles:true}));
  const modeB=_azMode;
  bodies.length=0;
  await AI.text({system:'s',prompt:'p'});          /* 다시 탐색해야 성공 */
  return {modeA,modeB,tries:bodies.length,modeC:_azMode};
});
ok('배포 변경 시 _azMode 무효화',r3.modeA==='reason'&&r3.modeB===null&&r3.modeC==='reason'&&r3.tries===2,JSON.stringify(r3));

/* ④ 캐시된 모양이 거부되면 캐시를 비운다(다음 호출이 회복) */
const r4=await pg.evaluate(async()=>{
  _azMode='chat';let n=0;
  window.fetch=async(u,o)=>{n++;const b=JSON.parse(o.body);
    if('temperature' in b)return{ok:false,status:400,text:async()=>JSON.stringify({error:{message:'unsupported parameter: temperature'}})};
    return{ok:true,status:200,text:async()=>JSON.stringify({choices:[{message:{content:'ok'},finish_reason:'stop'}]})};};
  let err='';try{await AI.text({system:'s',prompt:'p'});}catch(e){err=e.message;}
  const after=_azMode;
  const out=await AI.text({system:'s',prompt:'p'});
  return {err:!!err,after,out,calls:n};
});
ok('낡은 캐시로 실패하면 캐시를 비워 다음 호출이 회복',r4.err&&r4.after===null&&r4.out==='ok',JSON.stringify(r4));

/* ⑤ 비-JSON 응답(프록시 차단) */
const r5=await pg.evaluate(async()=>{
  _azMode=null;window.fetch=async()=>({ok:false,status:403,text:async()=>'<html>blocked</html>'});
  try{await AI.text({system:'s',prompt:'p'});return 'no-throw';}catch(e){return e.message;}
});
ok('HTML 응답을 상태코드로 알린다',/HTTP 403/.test(r5),r5);

/* ⑥ 코드펜스 끝 개행 */
const r6=await pg.evaluate(async()=>{
  _azMode=null;const body='```json\n[{"line1":"a","line2":"b"}]\n```\n';
  window.fetch=async()=>({ok:true,status:200,text:async()=>JSON.stringify({choices:[{message:{content:body},finish_reason:'stop'}]})});
  const t=await AI.text({system:'s',prompt:'p'});
  let parsed=false;try{JSON.parse(t);parsed=true;}catch(e){}
  return {t,parsed};
});
ok('펜스 뒤 개행이 있어도 JSON.parse 통과',r6.parsed,JSON.stringify(r6.t));

/* ⑦ 엔드포인트 정규화 */
const r7=await pg.evaluate(()=>['https://x.services.ai.azure.com','https://x.services.ai.azure.com/openai/v1/responses',
  'https://x.services.ai.azure.com/api/projects/p1','x.services.ai.azure.com/','  https://x.services.ai.azure.com/openai/  ']
  .map(v=>azBase(v)));
ok('엔드포인트를 호스트로 정규화',r7.every(v=>v==='https://x.services.ai.azure.com'),r7.join(' | '));

/* ⑧ 연타 방지 */
const r8=await pg.evaluate(async()=>{
  /* 686차: runDashAI 를 걷어내 연타 방지 검사를 runAI 로 옮겼다 */
  window.__TOASTS__=[];_aiBusy=true;
  await runAI('sA');
  _aiBusy=false;
  return window.__TOASTS__.join('|');
});
ok('실행 중에는 두 번째 클릭을 막는다',/이미 실행 중/.test(r8),r8);

/* ⑨ 로컬 모드에서는 AI 카드를 감춘다 */
const r9=await pg.evaluate(()=>{S.live=false;dfProdCardFill();const d=getComputedStyle(document.getElementById('aiCard')).display;S.live=true;dfProdCardFill();return d;});
ok('로컬 모드에서 AI 연결 카드 숨김',r9==='none',r9);

ok('페이지 오류 0',perr.length===0,perr.join(' / '));
await br.close();srv.close();
console.log(fail?('AI-UNIT FAIL '+fail):'AI-UNIT ALL PASS');
process.exit(fail?1:0);
