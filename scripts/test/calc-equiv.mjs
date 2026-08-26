/* 집계 엔진 동등성 검사 — report 원본 vs calapp 이식본 (614차)
   원본 저장소가 옆에 있을 때만 전체 비교가 돌고, 없으면 이식본 단독 불변식 검사만 한다.
   사용: node scripts/test/calc-equiv.mjs [--report <report-main 경로>]
   ⚠ 이 검사가 지키는 것: 이식본의 calc/calcW/calcMo/capAm/capWks/maskPII/redactUL/slimUL/critReason 이
     원본과 **동일 입력→동일 출력(JSON 일치)** 임. 게시본 kpi 와의 실데이터 대조는 3단계(게시)에서 별도 수행. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const APP=path.join(HERE,'../../app.js');
const argi=process.argv.indexOf('--report');
const REPORT=argi>0?process.argv[argi+1]:path.join(HERE,'../../../../report/report-main');

function grab(src,name){
  const re=new RegExp('(^|\\n)function '+name.replace(/\$/g,'\\$')+'\\(');
  const m=re.exec(src);if(!m)throw new Error('not found: '+name);
  let i=src.indexOf('{',m.index+m[0].length-1);
  let d=0,j=i,inS=null,esc=false;
  for(;j<src.length;j++){
    const c=src[j];
    if(inS){if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(c===inS)inS=null;continue;}
    if(c==='"'||c==="'"||c==='`'){inS=c;continue;}
    if(c==='/'&&src[j+1]==='/'){j=src.indexOf('\n',j);if(j<0)j=src.length;continue;}
    if(c==='/'&&src[j+1]==='*'){j=src.indexOf('*/',j)+1;continue;}
    if(c==='{')d++;else if(c==='}'){d--;if(d===0)break;}
  }
  return src.slice(m.index+(m[1]?1:0),j+1);
}
function grabConst(src,decl){ // `const NAME=` 에서 다음 세미콜론(대괄호/중괄호 균형)까지
  const i=src.indexOf(decl);if(i<0)throw new Error('const not found: '+decl);
  let d=0,j=i,inS=null,esc=false;
  for(;j<src.length;j++){
    const c=src[j];
    if(inS){if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(c===inS)inS=null;continue;}
    if(c==='"'||c==="'"||c==='`'){inS=c;continue;}
    if(c==='['||c==='{')d++;else if(c===']'||c==='}')d--;
    else if(c===';'&&d===0)break;
  }
  return src.slice(i,j+1);
}

const FNS=['pM','todayYM','_ruleFind','ruleVal','critKwRegex','critLongLen','critReason','wk','isCritCandidate','topT','calcW','calcMo','_calcImpl','isStoreLabel','capAm','isVacUnit','isVacStore','capWks','trendYearInfo','maskPII','redactUL','slimUL','calc'];

function buildSandbox(codes,orgKind){
  const sb={console,Math,Date,JSON,Object,Array,Number,String,RegExp,Set,Map,Float64Array,isFinite,parseInt,setTimeout,clearTimeout,window:{}};
  sb.globalThis=sb;
  let code='';
  code+=codes.consts.join('\n')+'\n';
  code+='const S={def:{},defVer:0,rm:"2026-07",trendYear:null,siteTrendYear:null,dfPubRm:"2026-07"};\n';
  code+='function setDef(id,items){S.def[id]=items;}\n';
  code+='const _calcCache=new Map();function bumpDef(){S.defVer++;_calcCache.clear();}\n';
  if(orgKind==='report'){
    code+='let __SITES=[];function setSites(s){__SITES=s;}\n';
    code+='function teamSites(){return __SITES;}\n';
    code+='function dashSites(){return __SITES.filter(s=>s.region!=="인수 전 현장");}\n';
  }else{
    code+='let __SITES=[];function setSites(s){__SITES=s;}\n';
    code+='function dfSites(){return __SITES;}\n';
    code+='function dfDashSites(){return __SITES.filter(s=>s.region!=="인수 전 현장");}\n';
    code+='function dfPubRm(){return S.dfPubRm;}\n';
  }
  code+=codes.fns.join('\n')+'\n';
  code+=grab(codes.capAllSrc,'capAll')+'\n';
  vm.createContext(sb);
  vm.runInContext(code,sb,{filename:orgKind+'-sandbox.js'});
  return sb;
}

function loadReport(){
  const core=fs.readFileSync(path.join(REPORT,'app/app-core.js'),'utf8').replace(/\r\n/g,'\n');
  const view=fs.readFileSync(path.join(REPORT,'app/app-view.js'),'utf8').replace(/\r\n/g,'\n');
  const consts=[grabConst(view,'const RULE_DEF='),grabConst(view,'const CRIT_DEF='),'let _critRxCache={};',grabConst(view,'const _PII_ROLE=')];
  const fns=FNS.map(n=>grab(core,n));
  return buildSandbox({consts,fns,capAllSrc:core},'report');
}
function loadCalapp(){
  const app=fs.readFileSync(APP,'utf8');
  const a=app.indexOf('하자 생산자 ① — 집계 엔진');
  const b=app.indexOf('하자 생산자 ① 끝');
  if(a<0||b<0)throw new Error('생산자 블록을 찾지 못함');
  const seg=app.slice(a,b);
  const consts=[grabConst(seg,'const RULE_DEF='),grabConst(seg,'const CRIT_DEF='),'let _critRxCache={};',grabConst(seg,'const _PII_ROLE=')];
  const fns=FNS.map(n=>grab(seg,n));
  return buildSandbox({consts,fns,capAllSrc:seg},'calapp');
}

/* ── 현실 규모 합성 데이터 — 시드 고정 난수(재현 가능) ── */
function rng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
const R=rng(20260824);
const TRADES=['도배','타일','마루','창호','가구','도장','전기','설비','미장','잡철','조경','승강기','방수','석공사','수장'];
const COS=['','','대한인테리어','한빛설비','우주도배','태성타일','명진창호','그린조경','서울전기','동아방수'];
const CONTENT=[
  '문틀 벌어짐 확인 요청','벽지 들뜸','거실 마루 찍힘','주방 상부장 문짝 처짐',
  '화장실 타일 줄눈 오염','현관 도어 스토퍼 파손',
  '안방 천장 누수 발생, 아랫집 피해 보상 요구',
  '엘리베이터 갇힘 사고 발생 확인 바람','승강기 멈춤 반복',
  '누수 없음 확인 완료 단순 문의','침수 이상 무',
  '홍길동님 010-1234-5678 연락 요망','담당자님 확인 부탁 kim@test.co.kr',
  '언론 제보 하겠다고 함','퇴거 후 숙박비 요구',
  '장문 민원 '.repeat(20),
];
function pad2(n){return String(n).padStart(2,'0');}
function dstr(y,m,d){return `${y}-${pad2(m)}-${pad2(d)}`;}
function randDate(){
  const y=2024+Math.floor(R()*3);
  const m=1+Math.floor(R()*12);
  const d=1+Math.floor(R()*28);
  const s=dstr(y,m,d);
  return s<='2026-08-20'?s:'2026-08-'+pad2(1+Math.floor(R()*20));
}
function makeItems(n){
  const out=[];
  for(let i=0;i<n;i++){
    const rd=randDate();
    const done=R()<0.72;
    let cd='';
    if(done){
      const off=Math.floor(R()*120);
      const t=new Date(rd);t.setDate(t.getDate()+off);
      cd=dstr(t.getFullYear(),t.getMonth()+1,t.getDate());
    }
    const cls=R()<0.8?'세대':'공용';
    const store=cls==='공용'&&R()<0.15;
    out.push({
      receiptDate:rd,status:done?'처리':'미처리',completionDate:cd,
      trade:TRADES[Math.floor(R()*TRADES.length)],
      contractor:COS[Math.floor(R()*COS.length)],
      defectClass:cls,
      saleStatus:R()<0.12?(R()<0.5?'미분양':'미납'):'입주',
      building:store?'상가'+(1+Math.floor(R()*3)):String(101+Math.floor(R()*12))+'동',
      unit:store?'싱가'+(1+Math.floor(R()*5)):String(101+Math.floor(R()*30))+'0'+(1+Math.floor(R()*4)),
      defectType:R()<0.05?'누수':'기타하자',
      criticalType:R()<0.02?'중대':'',
      receiptContent:CONTENT[Math.floor(R()*CONTENT.length)],
      complaint:R()<0.05?'피해 보상 요구':'',
      space:'거실',repairParty:R()<0.5?'직영':'협력사',
      repairContractor:'',delayDays:0,
    });
  }
  // 형식 이탈 행(방어 경로 검증): 접수일 없음·이상 포맷
  out.push({receiptDate:'',status:'미처리'});
  out.push({receiptDate:'2026/01/03',status:'미처리',trade:'도배'});
  return out;
}
const SITES=[];const DEF={};
for(let i=0;i<12;i++){
  const id='s'+(1000+i);
  SITES.push({id,name:'현장'+i,region:i<2?'인수 전 현장':(i%2?'중부1':'중부2'),teamId:'t1',
    units:500+i*40,hasCommercial:i%3===0,showVacant:true,lastUploadedAt:170000+i});
  DEF[id]=makeItems(400+Math.floor(R()*2600));
}

const cal=loadCalapp();
let rep=null;
try{rep=loadReport();}catch(e){console.log('· 원본 저장소 없음 — 이식본 단독 불변식만 검사 ('+e.message+')');}

let fail=0;
function eq(name,a,b){
  const ja=JSON.stringify(a),jb=JSON.stringify(b);
  if(ja!==jb){fail++;console.log('✗ '+name);
    for(let i=0;i<Math.min(ja.length,jb.length);i++)if(ja[i]!==jb[i]){console.log('  diff@'+i+': …'+ja.slice(Math.max(0,i-60),i+60)+'\n            …'+jb.slice(Math.max(0,i-60),i+60));break;}
  }else console.log('✓ '+name);
}
function inv(name,ok){if(!ok){fail++;console.log('✗ 불변식 '+name);}else console.log('✓ 불변식 '+name);}

const RM='2026-07';
for(const sb of [cal,rep].filter(Boolean))sb.setSites(SITES);

/* 1) 현장별 calc 전 필드 일치 */
if(rep){
  for(const s of SITES){
    const a=cal.calc(DEF[s.id],s,RM),b=rep.calc(DEF[s.id],s,RM);
    eq('calc '+s.id,a,b);
  }
  /* 2) capAll(게시 캡처) 일치 — S.def 채워서 */
  for(const s of SITES){cal.setDef(s.id,DEF[s.id]);rep.setDef(s.id,DEF[s.id]);}
  eq('capAll',cal.capAll(),rep.capAll());
  /* 3) 목록 가공(마스킹·슬림) 일치 */
  const ul=cal.calc(DEF[SITES[3].id],SITES[3],RM).ul;
  eq('redactUL',cal.redactUL(ul),rep.redactUL(ul));
  eq('slimUL',cal.slimUL(ul),rep.slimUL(ul));
  eq('maskPII',CONTENT.map(cal.maskPII),CONTENT.map(rep.maskPII));
  /* 4) 다른 기준월(연초·전년 이월) 일치 */
  for(const rm of ['2026-01','2025-12','2026-08']){
    const a=cal.calc(DEF[SITES[0].id],SITES[0],rm),b=rep.calc(DEF[SITES[0].id],SITES[0],rm);
    eq('calc rm='+rm,a,b);
  }
}

/* 5) 이식본 단독 불변식 — 원본 유무와 무관하게 */
for(const s of SITES.slice(0,4)){
  const k=cal.calc(DEF[s.id],s,RM);
  inv(s.id+' unr=tR-res',k.unr===k.tR-k.res);
  inv(s.id+' dd 합=unr',k.dd[0]+k.dd[1]+k.dd[2]===k.unr);
  inv(s.id+' lt=d30+d60',k.lt===k.dd[1]+k.dd[2]);
  const last=k.weekly.filter(w=>w.week<=k.rmEnd).slice(-1)[0];
  inv(s.id+' weekly 종점=KPI',!!last&&last.r===k.tR&&last.res===k.res&&last.u===k.unr&&last.d0===k.dd[0]&&last.d30===k.dd[1]&&last.d60===k.dd[2]);
  inv(s.id+' ul 길이=unr',k.ul.length===k.unr);
  const trSum=k.trAgg.reduce((a,o)=>a+o.u,0);
  inv(s.id+' trAgg u 합=unr',trSum===k.unr);
  const coSum=k.coAgg.reduce((a,o)=>a+o.u,0);
  inv(s.id+' coAgg u 합=unr',coSum===k.unr);
}
/* PII 마스킹 스팟 */
inv('전화 마스킹',!/1234-5678/.test(cal.maskPII('홍길동님 010-1234-5678 연락')));
inv('이메일 마스킹',!/kim@test/.test(cal.maskPII('kim@test.co.kr 확인')));
inv('직함 보존','담당자님'===cal.maskPII('담당자님').trim());
inv('인명 치환',/○○님/.test(cal.maskPII('홍길동님 요청')));

console.log(fail?('FAIL '+fail):'ALL PASS');
process.exit(fail?1:0);
