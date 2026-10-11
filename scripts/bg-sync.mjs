/* 배경 사진 목록 동기화 — 사용자 Unsplash 컬렉션 「BG」의 가로 사진 주소·작가를 RTDB bg 에 쓴다(바뀌었을 때만).
   GitHub Actions 가 매시간 돌린다(.github/workflows/bg-sync.yml). 앱(로그인 배경·회의 표지)은 bg 를 실시간으로 읽는다.
   필요: UNSPLASH_ACCESS_KEY(Unsplash 개발자 앱 calapp 의 Access Key — 약관상 비공개라 리포 Secrets 에만) ·
         FIREBASE_SERVICE_ACCOUNT · FIREBASE_DB_URL. 로컬 시험: DRY=1 이면 쓰지 않고 목록만. */
import admin from 'firebase-admin';
const key=process.env.UNSPLASH_ACCESS_KEY,sa=process.env.FIREBASE_SERVICE_ACCOUNT,url=process.env.FIREBASE_DB_URL||'https://report-c29a1-default-rtdb.asia-southeast1.firebasedatabase.app';
const COL=process.env.BG_COLLECTION||'V1rR9aIWwDE';   /* 컬렉션 「BG」(@lhoo3140) */
if(!key){console.error('UNSPLASH_ACCESS_KEY 가 없습니다');process.exit(1);}
const H={headers:{Authorization:'Client-ID '+key,'Accept-Version':'v1'}};
const all=[];
for(let p=1;p<=10;p++){   /* 30장씩 — 300장까지 */
  const r=await fetch('https://api.unsplash.com/collections/'+COL+'/photos?per_page=30&page='+p,H);
  if(!r.ok){console.error('Unsplash 응답',r.status,await r.text());process.exit(1);}
  const a=await r.json();all.push(...a);if(a.length<30)break;
}
const l=all.filter(x=>x&&x.urls&&x.urls.raw&&x.user&&x.width>x.height)   /* 가로 사진만 — 세로는 화면을 못 채운다 */
  .map(x=>({u:x.urls.raw,n:x.user.name||x.user.username||'',h:'https://unsplash.com/@'+x.user.username}));
console.log('컬렉션',all.length,'장 · 가로',l.length,'장');
if(!l.length){console.log('쓸 사진이 없어 그대로 둔다');process.exit(0);}
if(process.env.DRY){console.log(JSON.stringify(l,null,1));process.exit(0);}
if(!sa){console.error('FIREBASE_SERVICE_ACCOUNT 가 없습니다');process.exit(1);}
admin.initializeApp({credential:admin.credential.cert(JSON.parse(sa)),databaseURL:url});
const db=admin.database();
const cur=(await db.ref('bg/l').get()).val()||[];
if(JSON.stringify(cur)===JSON.stringify(l)){console.log('바뀐 것 없음');process.exit(0);}
await db.ref('bg').set({l,at:Date.now()});console.log('bg 갱신',l.length,'장');
process.exit(0);
