/* D+60 점검 사진 정리 — 대표 점검일이 1년 지난 현장의 사진(calapp/d60photo/{sid})을 지우고 장수·용량 기록을 비운다.
   GitHub Actions 가 매일 돌린다(.github/workflows/d60-photo-clean.yml). 앱 안의 d60PhAutoClean 과 같은 규칙.
   필요: 환경변수 FIREBASE_SERVICE_ACCOUNT(서비스 계정 JSON 한 줄) · FIREBASE_DB_URL. 로컬 시험: DRY=1 이면 지우지 않고 목록만. */
import admin from 'firebase-admin';
const sa=process.env.FIREBASE_SERVICE_ACCOUNT,url=process.env.FIREBASE_DB_URL||'https://report-c29a1-default-rtdb.asia-southeast1.firebasedatabase.app';
if(!sa){console.error('FIREBASE_SERVICE_ACCOUNT 가 없습니다');process.exit(1);}
admin.initializeApp({credential:admin.credential.cert(JSON.parse(sa)),databaseURL:url});
const db=admin.database();
const addMonths=(ds,n)=>{const [y,m,d]=ds.split('-').map(Number);const t=new Date(y,m-1+n,d);return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');};
const today=new Date(),lim=new Date(today);lim.setFullYear(lim.getFullYear()-1);const ls=lim.toISOString().slice(0,10);
const [orgS,inspS,photoS]=await Promise.all([db.ref('calapp/org/sites').get(),db.ref('calapp/d60/insp').get(),db.ref('calapp/d60photo').get()]);
const sites=(orgS.val()||[]).filter(Boolean),insp=inspS.val()||{},photos=photoS.val()||{};
const TR=['arch','mech','elec','land'];
let n=0;const patch={};
for(const s of sites){
  const i=insp[s.id]||{};
  const date=((i.dates||{}).arch)||i.date||(s.completionDate?addMonths(s.completionDate,2):'');
  if(!date||date>=ls)continue;
  if(!(i.phb>0)&&!photos[s.id])continue;
  n++;console.log('정리:',s.name,date,'phb',i.phb||0);
  patch['calapp/d60photo/'+s.id]=null;patch['calapp/d60/insp/'+s.id+'/phb']=null;
  for(const tr of TR){for(const [k,r] of Object.entries((i.res||{})[tr]||{}))if(r&&r.ph)patch['calapp/d60/insp/'+s.id+'/res/'+tr+'/'+k+'/ph']=null;
    for(const [k,r] of Object.entries((i.civil||{})[tr]||{}))if(r&&r.ph)patch['calapp/d60/insp/'+s.id+'/civil/'+tr+'/'+k+'/ph']=null;}
}
if(!n){console.log('정리할 현장 없음 (기준 '+ls+' 이전)');}
else if(process.env.DRY){console.log('DRY — '+n+'개 현장, 경로 '+Object.keys(patch).length+'개 (지우지 않음)');}
else{await db.ref().update(patch);console.log(n+'개 현장 정리 완료');}
process.exit(0);
