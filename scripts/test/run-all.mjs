/* 전체 로컬 회귀 게이트 — 이 저장소만으로 독립 실행한다.
   기본: 정적 감사 → Rules 감사 → 브라우저 smoke → rainbow → 하자 E2E …
   LIVE_E2E_* 4개가 모두 있으면 실제 Firebase E2E도 마지막에 실행한다.
   1285: ① 동시에 돌린다(TEST_JOBS, 기본 = CPU 수-1, 최소 1 · 최대 4) — 각 시험의 출력은 끝난 뒤 한 덩어리로 찍는다(섞이지 않게).
            ⚠ 시험마다 정적 서버 포트가 달라야 한다(smoke 8391 · rainbow 4311 · 하자 8399 · 모바일 8519 · 잘림 8527 · 위젯 8528 · 현안 8531 · 펫 8541).
         ② 바뀐 파일만 보고 범위를 정한다 — 앱 화면에 닿지 않는 파일(문서 · 수집 스크립트 · 다른 워크플로 · 위젯 exe 소스 · 공공 단가 데이터)만 바뀌었으면
            브라우저 시험을 건너뛰고 정적 · 권한 · 계산식 시험만(TEST_SCOPE=full 이면 늘 전부). 기준: TEST_BASE(기본 origin/main · main 자신이면 HEAD^1). */
import { spawn, execFileSync } from 'node:child_process';
import os from 'node:os';
import process from 'node:process';

const jobs=[
  ['정적 감사',['scripts/test/static-audit.mjs'],'light'],
  ['Rules 권한 감사',['scripts/test/rules-auth.mjs'],'light'],
  ['브라우저 smoke',['scripts/test/smoke.mjs']],
  ['무지개 렌더링 E2E',['scripts/test/rainbow-render.mjs']],
  ['하자 전 구간 E2E',['scripts/test/e2e-defect.mjs']],
  ['민원 세대 레벨화 정답셋',['scripts/test/risk-gold.mjs'],'light'],
  ['견적 검토 계산식 읽기',['scripts/test/qc-parse.mjs'],'light'],
  ['모바일 맞춤(겹침·잘림)',['scripts/test/mobile-fit.mjs']],
  ['잘림 검사(스크롤로 못 닿는 내용)',['scripts/test/clip-audit.mjs']],   /* 845차 */
  ['위젯 겹침·닫기',['scripts/test/widget-layers.mjs']],
  ['주요 현안',['scripts/test/iss.mjs']],
  ['위젯 미니펫',['scripts/test/pets.mjs']],
];

/* ── 범위 ── 앱(브라우저)에 닿지 않는 파일만 바뀌었는가 */
const NOAPP=/^(HANDOFF(-log)?\.md|README\.md|docs\/|scripts\/(?!test\/)|\.github\/workflows\/(?!smoke\.yml)|widget-lite\/|data\/(g2b-price|std-price|wage)\.json$)/;
function scope(){
  if(process.env.TEST_SCOPE==='full')return['full','TEST_SCOPE=full'];
  try{
    const g=(...a)=>execFileSync('git',a,{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
    let base=process.env.TEST_BASE||'origin/main';
    const head=g('rev-parse','HEAD');let b='';try{b=g('rev-parse',base);}catch(e){return['full','기준 '+base+' 없음'];}
    if(b===head)base='HEAD^1';   /* main 에 합친 직후(push) — 바로 앞 커밋과 비교 */
    const files=g('diff','--name-only',base+'...HEAD').split('\n').filter(Boolean);
    const dirty=g('status','--porcelain').split('\n').filter(Boolean).map(l=>l.slice(3));
    const all=[...new Set([...files,...dirty])];
    if(!all.length)return['full','바뀐 파일 없음 — 전부'];
    const app=all.filter(f=>!NOAPP.test(f));
    return app.length?['full','앱에 닿는 파일 '+app.length+'개('+app.slice(0,4).join(' · ')+(app.length>4?' …':'')+')']:['light','앱에 닿지 않는 파일만 '+all.length+'개'];
  }catch(e){return['full','git 을 못 읽음 — 전부'];}
}
const [mode,why]=scope();
const N=Math.max(1,Math.min(4,+process.env.TEST_JOBS||os.cpus().length-1));
/* 오래 걸리는 것부터 — 동시 실행 칸을 고르게 채운다(1285 측정 초: 위젯 65 · 현안 46 · 잘림 45 · 모바일 43 · 펫 30 · 하자 23 · 무지개 13 · smoke 8) */
const W={'위젯 겹침·닫기':65,'주요 현안':46,'잘림 검사(스크롤로 못 닿는 내용)':45,'모바일 맞춤(겹침·잘림)':43,'위젯 미니펫':30,'하자 전 구간 E2E':23,'무지개 렌더링 E2E':13,'브라우저 smoke':8};
const todo=jobs.filter(j=>mode==='full'||j[2]==='light').sort((a,b)=>(W[b[0]]||1)-(W[a[0]]||1));
console.log(`범위: ${mode==='full'?'전부':'가벼운 시험만'} (${why}) · 동시 ${N}개`);
if(mode!=='full')console.log('건너뜀: '+jobs.filter(j=>j[2]!=='light').map(j=>j[0]).join(' · '));

const t0=Date.now();
const run=([name,args])=>new Promise(res=>{const s=Date.now();let out='';
  const p=spawn(process.execPath,args,{env:process.env});
  p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>out+=d);
  p.on('error',e=>{out+=String(e);});
  p.on('close',code=>{console.log(`\n=== ${name} === (${((Date.now()-s)/1000).toFixed(1)}초)\n`+out.trimEnd());res(code===0?0:1);});});
let failed=0,i=0;
await Promise.all(Array.from({length:Math.min(N,todo.length)},async()=>{while(i<todo.length){const j=todo[i++];const r=await run(j);failed+=r;}   /* ⚠ failed+=await … 는 await 전의 값을 읽어 동시 실행에서 실패 수를 잃는다 */}));

const live=['LIVE_E2E_EMAIL','LIVE_E2E_PASSWORD','LIVE_E2E_SECOND_EMAIL','LIVE_E2E_SECOND_PASSWORD'];
if(mode==='full'&&live.every(k=>process.env[k])){
  const r=await run(['실제 Firebase E2E',['scripts/test/firebase-live-e2e.mjs']]);failed+=r;
}else console.log('\n=== 실제 Firebase E2E ===\nSKIP  '+(mode==='full'?'LIVE_E2E_* 4개 Secret이 모두 있을 때만 실행합니다.':'가벼운 시험만 도는 판'));

console.log(`\n전체 결과: ${failed?'FAIL '+failed:'PASS'} · ${((Date.now()-t0)/1000).toFixed(0)}초`);
process.exitCode=failed?1:0;
