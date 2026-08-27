/* 637차 실제 Firebase E2E
   실제 Firebase Auth + Realtime Database를 사용한다. 로컬 local=1 모드는 사용하지 않는다.
   필요한 환경변수:
     LIVE_E2E_EMAIL / LIVE_E2E_PASSWORD
     LIVE_E2E_SECOND_EMAIL / LIVE_E2E_SECOND_PASSWORD
   두 계정 모두 @hdec.co.kr + 이메일 인증 완료 상태여야 하며, users/{uid}.role 은 viewer 이상이어야 한다.
   시험 데이터는 calapp/tasks/__e2e637__/fbE2E... 아래에 만들고 finally 에서 삭제한다.
*/
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const PORT=4324;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.webmanifest':'application/manifest+json'};
const email1=process.env.LIVE_E2E_EMAIL||'';
const pw1=process.env.LIVE_E2E_PASSWORD||'';
const email2=process.env.LIVE_E2E_SECOND_EMAIL||'';
const pw2=process.env.LIVE_E2E_SECOND_PASSWORD||'';
let fail=0;
const OK=m=>console.log('ok    '+m);
const F=m=>{fail++;console.log('FAIL  '+m);};

if(!email1||!pw1||!email2||!pw2){
  console.error('LIVE_E2E_* 4개 환경변수가 필요합니다. 실제 Firebase E2E를 실행하지 않고 종료합니다.');
  process.exit(2);
}
if(!/@hdec\.co\.kr$/i.test(email1)||!/@hdec\.co\.kr$/i.test(email2)){
  console.error('LIVE_E2E 계정은 @hdec.co.kr 이어야 합니다.');
  process.exit(2);
}

const srv=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';
  const f=path.join(root,p);
  if(!f.startsWith(root)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);
});
await new Promise(r=>srv.listen(PORT,r));

let browser;
const TEST_SID='__e2e637__';
const testIid='fbE2E_'+Date.now().toString(36);
const contexts=[];
let p1=null,p2=null;
try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:true});
  async function login(email,pw,label){
    const ctx=await browser.newContext({viewport:{width:1440,height:900}});contexts.push(ctx);
    const page=await ctx.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(`http://localhost:${PORT}/index.html?e2e=637`,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#fbEmail',{timeout:15000});
    await page.fill('#fbEmail',email);await page.fill('#fbPw',pw);await page.click('[data-act="auth.login"]');
    await page.waitForFunction(()=>document.querySelector('#coverGate')?.style.display==='none',{timeout:30000});
    await page.waitForFunction(()=>window.S&&S.live===true&&S.user&&S.role,{timeout:30000});
    if(errors.length)F(label+' 로그인 중 pageerror: '+errors.join(' | '));
    else OK(label+' — 실제 Firebase 로그인 및 live 진입');
    return page;
  }

  p1=await login(email1,pw1,'계정 A');
  p2=await login(email2,pw2,'계정 B');

  const info=await p1.evaluate(async()=>({uid:S.user.uid,email:S.user.email,role:S.role,verified:S.user.emailVerified}));
  if(info.verified&&['editor','viewer'].includes(info.role))OK('계정 A — 이메일 인증·역할 확인');
  else F('계정 A — 인증/역할 이상: '+JSON.stringify(info));
  const info2=await p2.evaluate(async()=>({uid:S.user.uid,email:S.user.email,role:S.role,verified:S.user.emailVerified}));
  if(info2.verified&&['editor','viewer'].includes(info2.role))OK('계정 B — 이메일 인증·역할 확인');
  else F('계정 B — 인증/역할 이상: '+JSON.stringify(info2));

  /* 실제 SDK를 앱 페이지 안에서 사용하므로 별도 REST 모사 없이 동일한 Firebase 연결을 검증한다. */
  const seed={text:'637 실제 Firebase E2E',st:1,stKeep:false,createdAt:Date.now(),updatedAt:Date.now(),createdBy:info.uid,assignees:{[info2.uid]:1}};
  const seedResult=await p1.evaluate(async({sid,iid,item})=>{
    try{await FB.db.ref('calapp/tasks/'+sid+'/'+iid).set(item);return{ok:true};}
    catch(e){return{ok:false,code:e?.code||'',msg:e?.message||String(e)}}
  },{sid:TEST_SID,iid:testIid,item:seed});
  if(seedResult.ok)OK('CRUD-01 — 계정 A 실제 RTDB 신규 업무 생성');
  else F('CRUD-01 — 생성 실패: '+JSON.stringify(seedResult));

  const readA=await p1.evaluate(async({sid,iid})=>{const s=await FB.db.ref('calapp/tasks/'+sid+'/'+iid).once('value');return s.val();},{sid:TEST_SID,iid:testIid});
  if(readA?.text==='637 실제 Firebase E2E'&&readA?.createdBy===info.uid)OK('CRUD-02 — 서버 재조회로 생성 데이터 확인');
  else F('CRUD-02 — 서버 재조회 불일치: '+JSON.stringify(readA));

  /* 새로고침: 실제 onAuth + resolveRole + RTDB 구독을 다시 통과시킨다. */
  await p1.reload({waitUntil:'domcontentloaded'});
  await p1.waitForFunction(({sid,iid})=>window.S&&S.live===true&&!!((S.tasks?.[sid]||{})[iid]),{sid:TEST_SID,iid:testIid},{timeout:30000});
  const afterReload=await p1.evaluate(({sid,iid})=>({live:S.live,found:!!((S.tasks[sid]||{})[iid]),item:(S.tasks[sid]||{})[iid]||null}),{sid:TEST_SID,iid:testIid});
  if(afterReload.live&&afterReload.found)OK('CRUD-03 — 새로고침 후 Firebase 데이터 복구');
  else F('CRUD-03 — 새로고침 후 데이터 미복구: '+JSON.stringify(afterReload));

  /* 계정 A 수정 */
  const editResult=await p1.evaluate(async({sid,iid})=>{
    const r=FB.db.ref('calapp/tasks/'+sid+'/'+iid);const s=await r.once('value');const v=s.val();v.st=2;v.updatedAt=Date.now();
    try{await r.set(v);return{ok:true};}catch(e){return{ok:false,code:e?.code||'',msg:e?.message||String(e)}}
  },{sid:TEST_SID,iid:testIid});
  if(editResult.ok)OK('CRUD-04 — 계정 A 실제 업무 수정');else F('CRUD-04 — 수정 실패: '+JSON.stringify(editResult));

  /* 계정 B가 A의 작성 업무를 수정하면 rules에서 거부되어야 한다. */
  const denyResult=await p2.evaluate(async({sid,iid})=>{
    const r=FB.db.ref('calapp/tasks/'+sid+'/'+iid);const s=await r.once('value');const v=s.val();v.st=3;v.updatedAt=Date.now();
    try{await r.set(v);return{ok:true};}catch(e){return{ok:false,code:e?.code||'',msg:e?.message||String(e)}}
  },{sid:TEST_SID,iid:testIid});
  if(!denyResult.ok)OK('AUTH-12 — 계정 B가 계정 A 업무 수정 시 실제 Firebase 규칙 거부');
  else F('AUTH-12 — 계정 B의 무단 수정이 허용됨');

  const serverAfterDeny=await p1.evaluate(async({sid,iid})=>{const s=await FB.db.ref('calapp/tasks/'+sid+'/'+iid).once('value');return s.val();},{sid:TEST_SID,iid:testIid});
  if(serverAfterDeny?.st===2&&serverAfterDeny?.createdBy===info.uid)OK('AUTH-12b — 거부 후 서버 원본 불변');
  else F('AUTH-12b — 거부 후 원본 변조: '+JSON.stringify(serverAfterDeny));

  /* createdBy 양도도 실제 규칙에서 거부되어야 한다. */
  const denyOwner=await p1.evaluate(async({sid,iid})=>{
    const r=FB.db.ref('calapp/tasks/'+sid+'/'+iid);const s=await r.once('value');const v=s.val();v.createdBy='other-user';
    try{await r.set(v);return{ok:true};}catch(e){return{ok:false,code:e?.code||'',msg:e?.message||String(e)}}
  },{sid:TEST_SID,iid:testIid});
  if(!denyOwner.ok)OK('AUTH-13 — 실제 Firebase createdBy 불변 검증');else F('AUTH-13 — createdBy 양도 허용됨');

  /* 637차: 부분 update 로 createdBy 를 지우는 우회도 막혀야 한다. */
  const denyOwnerDelete=await p1.evaluate(async({sid,iid})=>{
    const r=FB.db.ref('calapp/tasks/'+sid+'/'+iid);
    try{await r.update({createdBy:null});return{ok:true};}
    catch(e){return{ok:false,code:e?.code||'',msg:e?.message||String(e)}}
  },{sid:TEST_SID,iid:testIid});
  if(!denyOwnerDelete.ok)OK('AUTH-14 — partial update 로 createdBy 삭제 우회 차단');
  else F('AUTH-14 — partial update 로 createdBy 삭제가 허용됨');

  const afterOwnerDelete=await p1.evaluate(async({sid,iid})=>(await FB.db.ref('calapp/tasks/'+sid+'/'+iid).once('value')).val(),{sid:TEST_SID,iid:testIid});
  if(afterOwnerDelete?.createdBy===info.uid)OK('AUTH-14b — createdBy 부분 삭제 거부 후 원본 유지');
  else F('AUTH-14b — createdBy 부분 삭제 후 원본 변조: '+JSON.stringify(afterOwnerDelete));

  /* 637차: 담당자 B의 partial update 는 다른 필드를 건드리지 않아야 한다. */
  const partialB=await p2.evaluate(async({sid,iid})=>{
    const r=FB.db.ref('calapp/tasks/'+sid+'/'+iid);
    try{await r.update({st:3});return{ok:true};}
    catch(e){return{ok:false,code:e?.code||'',msg:e?.message||String(e)}}
  },{sid:TEST_SID,iid:testIid});
  if(partialB.ok)OK('CON-03 — 담당자 B partial update 허용');else F('CON-03 — 담당자 B partial update 실패: '+JSON.stringify(partialB));
  const afterPartialB=await p1.evaluate(async({sid,iid})=>(await FB.db.ref('calapp/tasks/'+sid+'/'+iid).once('value')).val(),{sid:TEST_SID,iid:testIid});
  if(afterPartialB?.st===3&&afterPartialB?.text==='637 실제 Firebase E2E'&&afterPartialB?.createdBy===info.uid)OK('CON-04 — partial update 가 비변경 필드를 보존');
  else F('CON-04 — partial update 필드 보존 실패: '+JSON.stringify(afterPartialB));

  /* 삭제 후 서버에 실제로 없는지 확인 */
  const del=await p1.evaluate(async({sid,iid})=>{try{await FB.db.ref('calapp/tasks/'+sid+'/'+iid).remove();return{ok:true};}catch(e){return{ok:false,code:e?.code||'',msg:e?.message||String(e)}}},{sid:TEST_SID,iid:testIid});
  if(del.ok)OK('CRUD-05 — 계정 A 실제 업무 삭제');else F('CRUD-05 — 삭제 실패: '+JSON.stringify(del));
  const gone=await p1.evaluate(async({sid,iid})=>(await FB.db.ref('calapp/tasks/'+sid+'/'+iid).once('value')).exists(),{sid:TEST_SID,iid:testIid});
  if(!gone)OK('CRUD-06 — 삭제 후 서버 재조회에서 업무 없음');else F('CRUD-06 — 삭제 후 서버에 업무가 남음');

  /* 두 세션의 동시 수정은 서로 다른 필드를 직접 update 하는 방식으로 검증한다. */
  const iid2=testIid+'_con';
  const concurrent=await p1.evaluate(async({sid,iid,uid})=>{await FB.db.ref('calapp/tasks/'+sid+'/'+iid).set({text:'동시 수정',st:1,stKeep:false,createdAt:Date.now(),updatedAt:Date.now(),createdBy:uid});return true;},{sid:TEST_SID,iid:iid2,uid:info.uid});
  if(concurrent)OK('CON-01 — 동시 수정용 업무 생성');
  const [a,b]=await Promise.all([
    p1.evaluate(async({sid,iid})=>{const r=FB.db.ref('calapp/tasks/'+sid+'/'+iid);await r.update({st:2,updatedAt:Date.now()});return true;},{sid:TEST_SID,iid:iid2}),
    p2.evaluate(async({sid,iid})=>{const r=FB.db.ref('calapp/tasks/'+sid+'/'+iid);await r.update({color:'rainbow',updatedAt:Date.now()});return true;},{sid:TEST_SID,iid:iid2})
  ]);
  const merged=await p1.evaluate(async({sid,iid})=>(await FB.db.ref('calapp/tasks/'+sid+'/'+iid).once('value')).val(),{sid:TEST_SID,iid:iid2});
  if(merged?.st===2&&merged?.color==='rainbow')OK('CON-02 — 동시 partial update 후 두 변경 모두 보존');
  else F('CON-02 — 동시 수정 결과 유실: '+JSON.stringify(merged));
  await p1.evaluate(async({sid,iid})=>FB.db.ref('calapp/tasks/'+sid+'/'+iid).remove(),{sid:TEST_SID,iid:iid2});

}catch(e){F('테스트 예외: '+String(e.stack||e));}
finally{
  if(p1)try{await p1.evaluate(async({sid,iid})=>{await FB.db.ref('calapp/tasks/'+sid+'/'+iid).remove();},{sid:TEST_SID,iid:testIid+'_con'});}catch{}
  if(p1)try{await p1.evaluate(async({sid,iid})=>{await FB.db.ref('calapp/tasks/'+sid+'/'+iid).remove();},{sid:TEST_SID,iid:testIid});}catch{}
  for(const c of contexts)try{await c.close();}catch{}
  if(browser)try{await browser.close();}catch{}
  srv.close();
}
console.log(`결과: FAIL ${fail}`);
process.exitCode=fail?1:0;
