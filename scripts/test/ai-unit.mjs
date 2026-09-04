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

/* ② 읽기 완료 전 저장 — proxy 한 칸만 남았지만, set 이 아니라 update 로 써야 다른 메타(updatedBy)가 안 지워진다(702차) */
const r2=await pg.evaluate(async()=>{
  window.__DB__['aiConf']={proxy:'https://old.azurewebsites.net',updatedBy:'x'};
  window.__DELAY__=300;_aiConfP=null;S.azProxy='';
  aiConfLoad();
  const e=document.getElementById('dfAzPx');e.value='https://new.azurewebsites.net';e.dispatchEvent(new Event('change',{bubbles:true}));
  await new Promise(r=>setTimeout(r,600));
  window.__DELAY__=0;
  return {db:window.__DB__['aiConf'],ops:window.__CALLS__.map(c=>c[0])};
});
ok('읽기 전 저장해도 다른 칸이 안 지워진다',r2.db.proxy==='https://new.azurewebsites.net'&&r2.db.updatedBy!==undefined,JSON.stringify(r2.db));
ok('전체 set 이 아니라 update 로 쓴다',r2.ops.every(o=>o==='update'),r2.ops.join(','));

/* ③ 702차: DB 에 옛 키·엔드포인트가 남아 있으면 관리자가 지운다 */
const r3=await pg.evaluate(async()=>{
  window.__CALLS__=[];window.__DB__['aiConf']={proxy:'https://p.azurewebsites.net',key:'OLDKEY',endpoint:'https://x.services.ai.azure.com',deployment:'d1'};
  _aiConfP=null;await aiConfLoad(true);await new Promise(r=>setTimeout(r,50));
  return {db:window.__DB__['aiConf'],ops:window.__CALLS__.map(c=>c[0]+':'+JSON.stringify(c[2]))};
});
ok('옛 키·엔드포인트·배포를 DB 에서 지운다(null update)',r3.db.key===null&&r3.db.endpoint===null&&r3.db.deployment===null&&r3.db.proxy==='https://p.azurewebsites.net',JSON.stringify(r3.db));

/* ④ 중계 서버 오류(HTML·비 JSON)를 상태코드로 알린다 */
const r4=await pg.evaluate(async()=>{
  S.azProxy='https://p.azurewebsites.net';FB.auth={currentUser:{getIdToken:async()=>'T'}};
  window.fetch=async()=>({ok:false,status:503,json:async()=>{throw new Error('not json');}});
  try{await AI.text({system:'s',prompt:'p'});return '';}catch(e){return e.message;}
});
ok('HTML 응답을 상태코드로 알린다',/HTTP 503/.test(r4),r4);

/* ⑥ 코드펜스 끝 개행 */
const r6=await pg.evaluate(async()=>{
  const body='```json\n[{"line1":"a","line2":"b"}]\n```\n';S.azProxy='https://p.azurewebsites.net';FB.auth={currentUser:{getIdToken:async()=>'T'}};
  window.fetch=async()=>({ok:true,status:200,json:async()=>({text:body,mode:'chat'})});
  const t=await AI.text({system:'s',prompt:'p'});
  let parsed=false;try{JSON.parse(t);parsed=true;}catch(e){}
  return {t,parsed};
});
ok('펜스 뒤 개행이 있어도 JSON.parse 통과',r6.parsed,JSON.stringify(r6.t));

/* ⑦ 중계 서버 주소 정규화 — 끝 슬래시·/api/ai 유무를 가려 한 URL 로 */
const r7=await pg.evaluate(async()=>{
  const urls=[];FB.auth={currentUser:{getIdToken:async()=>'T'}};
  window.fetch=async(u)=>{urls.push(String(u));return {ok:true,status:200,json:async()=>({text:'x',mode:'chat'})};};
  for(const v of ['https://p.azurewebsites.net','https://p.azurewebsites.net/','https://p.azurewebsites.net/api/ai']){S.azProxy=v;await AI.text({system:'s',prompt:'p'});}
  return urls;
});
ok('중계 서버 주소를 /api/ai 하나로 정규화',r7.every(u=>u==='https://p.azurewebsites.net/api/ai'),r7.join(' | '));

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

/* 700차: 중계 서버 경로 — Function 만 부르고 api-key 헤더가 없다. system/prompt/max 만 보낸다 */
const r10=await pg.evaluate(async()=>{
  const calls=[];S.azProxy='https://calapp-ai-proxy-x.azurewebsites.net';
  FB.auth={currentUser:{getIdToken:async()=>'ID.TOKEN'}};
  window.fetch=async(u,o)=>{calls.push({u:String(u),h:o.headers,b:JSON.parse(o.body)});return {ok:true,status:200,json:async()=>({text:'프록시 답',mode:'chat'})};};
  const t=await AI.text({system:'s',prompt:'p',max:1000});
  const err=await (async()=>{window.fetch=async()=>({ok:false,status:403,json:async()=>({error:'AI 분석은 관리자만 쓸 수 있습니다'})});try{await AI.text({system:'s',prompt:'p'});return '';}catch(e){return e.message;}})();
  S.azProxy='';
  return {t,calls,err,ready:AI.ready()};
});
const c10=r10.calls[0]||{h:{},b:{}};
ok('중계 경로 — Function URL /api/ai 로, Authorization=ID 토큰, api-key 없음',
   /\/api\/ai$/.test(c10.u)&&c10.h.Authorization==='Bearer ID.TOKEN'&&!('api-key' in c10.h)&&JSON.stringify(Object.keys(c10.b).sort())==='["max","prompt","system"]'&&r10.t==='프록시 답',JSON.stringify(c10));
ok('중계 서버 오류 문구가 그대로 뜬다',/관리자만/.test(r10.err),r10.err);
ok('페이지 오류 0',perr.length===0,perr.join(' / '));
await br.close();srv.close();
console.log(fail?('AI-UNIT FAIL '+fail):'AI-UNIT ALL PASS');
process.exit(fail?1:0);
