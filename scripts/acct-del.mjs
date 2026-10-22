/* 계정 삭제 마무리 — 앱(관리자 「계정 삭제」)이 calapp/acctDel/{uid} 에 남긴 요청을 읽어 Firebase 로그인 계정을 지운다.
   앱(브라우저)은 남의 로그인 계정을 지울 수 없다(서버 권한 필요) — 그래서 서비스 계정을 가진 GitHub 작업이 맡는다(.github/workflows/acct-del.yml, 10분마다).
   앱은 이미 users/{uid} 를 지우고 명부(people)에 이름만 남겼다(gone). 여기서는
     ① 요청자가 지금도 관리자인지 확인(규칙을 거치지 않는 자리라 한 번 더) ② 대상이 관리자가 아닌지 확인
     ③ 로그인 계정 삭제(이미 없으면 통과) ④ 그 사이 다시 로그인해 생긴 users/{uid} 를 다시 지움 ⑤ 요청 지움.
   필요: FIREBASE_SERVICE_ACCOUNT · FIREBASE_DB_URL. DRY=1 이면 지우지 않고 목록만. */
import admin from 'firebase-admin';
const sa=process.env.FIREBASE_SERVICE_ACCOUNT,url=process.env.FIREBASE_DB_URL||'https://report-c29a1-default-rtdb.asia-southeast1.firebasedatabase.app';
if(!sa){console.error('FIREBASE_SERVICE_ACCOUNT 가 없습니다');process.exit(1);}
admin.initializeApp({credential:admin.credential.cert(JSON.parse(sa)),databaseURL:url});
const db=admin.database();
const q=(await db.ref('calapp/acctDel').get()).val()||{};
const ids=Object.keys(q);
console.log('삭제 요청',ids.length,'건');
for(const uid of ids){
  const r=q[uid]||{};
  const by=(await db.ref('users/'+String(r.by||'_')+'/role').get()).val();
  if(by!=='editor'){console.log('건너뜀(요청자가 관리자 아님)',uid);await db.ref('calapp/acctDel/'+uid).remove();continue;}
  const role=(await db.ref('users/'+uid+'/role').get()).val();
  if(role==='editor'){console.log('건너뜀(대상이 관리자)',uid);await db.ref('calapp/acctDel/'+uid).remove();continue;}
  if(process.env.DRY){console.log('DRY',uid,r.email||'');continue;}
  try{await admin.auth().deleteUser(uid);console.log('로그인 계정 삭제',uid,r.email||'');}
  catch(e){if(e&&e.code==='auth/user-not-found')console.log('이미 없음',uid);else{console.error('실패',uid,e&&e.code,e&&e.message);continue;}}
  await db.ref().update({['users/'+uid]:null,['calapp/acctDel/'+uid]:null});
}
process.exit(0);
