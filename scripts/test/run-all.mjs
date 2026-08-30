/* 전체 로컬 회귀 게이트 — 이 저장소만으로 독립 실행한다.
   기본: 정적 감사 → Rules 감사 → 브라우저 smoke → rainbow → 하자 E2E → AI 단위.
   LIVE_E2E_* 4개가 모두 있으면 실제 Firebase E2E도 마지막에 실행한다. */
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const run=(name,args,env={})=>{
  console.log(`\n=== ${name} ===`);
  const r=spawnSync(process.execPath,args,{stdio:'inherit',env:{...process.env,...env}});
  if(r.error){console.error(r.error);return 1;}
  return r.status??1;
};

const jobs=[
  ['정적 감사',['scripts/test/static-audit.mjs']],
  ['Rules 권한 감사',['scripts/test/rules-auth.mjs']],
  ['브라우저 smoke',['scripts/test/smoke.mjs']],
  ['무지개 렌더링 E2E',['scripts/test/rainbow-render.mjs']],
  ['하자 전 구간 E2E',['scripts/test/e2e-defect.mjs']],
  ['AI 연결·호출 단위',['scripts/test/ai-unit.mjs']],
];
let failed=0;
for(const [name,args] of jobs){ if(run(name,args)!==0) failed++; }

const live=['LIVE_E2E_EMAIL','LIVE_E2E_PASSWORD','LIVE_E2E_SECOND_EMAIL','LIVE_E2E_SECOND_PASSWORD'];
if(live.every(k=>process.env[k])){
  if(run('실제 Firebase E2E',['scripts/test/firebase-live-e2e.mjs'])!==0) failed++;
}else console.log('\n=== 실제 Firebase E2E ===\nSKIP  LIVE_E2E_* 4개 Secret이 모두 있을 때만 실행합니다.');


console.log(`\n전체 결과: ${failed?'FAIL '+failed:'PASS'}`);
process.exitCode=failed?1:0;
