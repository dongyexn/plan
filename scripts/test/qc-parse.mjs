/* 견적 검토 계산식 읽기 회귀 — 브라우저 없이 app.js 의 QC 함수만 떼어 돌린다.
   사용: node scripts/test/qc-parse.mjs */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const src=fs.readFileSync(path.join(root,'app.js'),'utf8');
const a=src.indexOf("const QC={txt:''"),b=src.indexOf('let _qcLiveT=0;');
const {qcParse}=new Function(src.slice(a,b)+';return {qcParse};')();
let fail=0;const ok=(n,c,x)=>{console.log((c?'ok    ':'FAIL  ')+n+(c?'':'  → '+JSON.stringify(x)));if(!c)fail++;};
/* [이름, 원문, 기대(줄마다 st:calc)] */
const C=[
  ['식 중간 라벨(PD)','1. 거실\n- 도배 : (2.4+1.2)*2*2.4-PD 0.6*0.6=16.92m2',['ok:16.92']],
  ['라벨 + 괄호','1. 거실\n- 도배 : 3.6*2.4-PD(0.3*0.4)-AD:0.2*0.2=8.48m2',['ok:8.48']],
  ['이중 괄호','1. 거실\n- 타일 : ((1.2+0.3)*2+0.6)*2.4=8.64m2',['ok:8.64']],
  ['중괄호·대괄호','1. 거실\n- 타일 : {[(1.2+0.3)*2]+0.6}*2.4=8.64m2',['ok:8.64']],
  ['곱하기 빠진 괄호','1. 거실\n- 타일 : 2((1.2+0.3))(2.4)=7.2m2',['ok:7.2']],
  ['항목 아래 「:」 없는 식','1. 거실\n- 타일\n((1.2+0.3)*2)*2.4=7.2m2',['ok:7.2']],
  ['비례식 X 뒤 바로 값','1. 거실\n- 단가 : 17500 : 15000 = 6.7 : X = 5.74',['ok:5.742857143']],
  ['비례식 다음 줄 ∴','1. 거실\n- 비례 : 1 : 3 = 4 : x\n∴ x = 12',['ok:12']],
  ['비례식 → X','1. 거실\n- 비례 : 1:3 = X:12 → X=4',['ok:4']],
  ['비례식 오답','1. 거실\n- 비례 : 1:3=4:X  X=11',['no:12']],
  ['떨어진 두 수는 읽지 않음','1. 거실\n- 메모 : 3세대 2개소=6',['sk:null']],
  ['감액·합계','1. 안방\n- 타일 : (1.2+0.6)*2*2.4=8.64m2\n- 감액 : -(0.6*0.6)=-0.36m2\n* 합계 : 8.64-0.36=8.28m2',['ok:8.64','ok:-0.36','ok:8.28']],
];
for(const [n,t,want] of C){const got=qcParse(t).map(r=>r.st+':'+r.calc);ok(n,JSON.stringify(got)===JSON.stringify(want),got);}
console.log('\n결과: '+(fail?'FAIL '+fail:'PASS'));process.exitCode=fail?1:0;
