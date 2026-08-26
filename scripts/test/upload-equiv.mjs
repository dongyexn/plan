/* 업로드·주요이슈·게시 동등성 검사 — report 원본 vs calapp 이식본 (614차)
   1) 파서(norm/nd/csvToAoA/findHeaderRow/rowsToObjs/auditUpload): 동일 입력 → 동일 출력
   2) 주요이슈: 이식 dfInsightsBuild(문자열) ≡ 원본 rInsights(#d-insight 캡처)
   3) 게시 payload: 이식 dfPublish 가 만든 update 트리 ≡ 원본 수식(calc/redactUL/slimUL/capAll/deepEncKeys)으로
      직접 조립한 기대 트리 (publishedAt/publishedBy 만 제외)
   사용: node scripts/test/upload-equiv.mjs [--report <report-main 경로>] */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const APP=path.join(HERE,'../../app.js');
const argi=process.argv.indexOf('--report');
const REPORT=argi>0?process.argv[argi+1]:path.join(HERE,'../../../../report/report-main');

/* calc-equiv 와 동일한 스택 스캐너 grab */
function grab(src,name){
  const re=new RegExp('(^|\\n)(async function|function) '+name.replace(/\$/g,'\\$')+'\\(');
  const m=re.exec(src);if(!m)throw new Error('not found: '+name);
  let i=src.indexOf('{',m.index+m[0].length-1);
  const st=[{t:'code',d:0}];let prev='';
  const reBefore=/[=(,:\[!&|?{};+\-*%~^<>\n]/;
  let j=i;
  for(;j<src.length;j++){
    const top=st[st.length-1],c=src[j];
    if(top.t==='str'){if(c==='\\'){j++;continue;}if(c===top.q)st.pop();continue;}
    if(top.t==='tpl'){if(c==='\\'){j++;continue;}if(c==='`'){st.pop();continue;}if(c==='$'&&src[j+1]==='{'){st.push({t:'code',d:1});j++;prev='{';continue;}continue;}
    if(c==='"'||c==="'"){st.push({t:'str',q:c});continue;}
    if(c==='`'){st.push({t:'tpl'});continue;}
    if(c==='/'&&src[j+1]==='/'){j=src.indexOf('\n',j);if(j<0)j=src.length;prev='\n';continue;}
    if(c==='/'&&src[j+1]==='*'){j=src.indexOf('*/',j)+1;prev=' ';continue;}
    if(c==='/'){
      if(prev===''||reBefore.test(prev)){
        let k=j+1,cls=false;
        for(;k<src.length;k++){const cc=src[k];if(cc==='\\'){k++;continue;}if(cls){if(cc===']')cls=false;continue;}if(cc==='[')cls=true;else if(cc==='/')break;else if(cc==='\n')break;}
        j=k;prev='/';continue;
      }
      prev='/';continue;
    }
    if(c==='{'){top.d++;prev=c;continue;}
    if(c==='}'){top.d--;prev=c;if(top.d===0){if(st.length===1)break;st.pop();}continue;}
    if(!/\s/.test(c))prev=c;
  }
  return src.slice(m.index+(m[1]?1:0),j+1);
}
function grabConst(src,decl){
  const i=src.indexOf(decl);if(i<0)throw new Error('const not found: '+decl);
  let d=0,j=i,inS=null;
  for(;j<src.length;j++){
    const c=src[j];
    if(inS){if(c==='\\'){j++;continue;}if(c===inS)inS=null;continue;}
    if(c==='"'||c==="'"||c==='`'){inS=c;continue;}
    if(c==='['||c==='{')d++;else if(c===']'||c==='}')d--;
    else if(c===';'&&d===0)break;
  }
  return src.slice(i,j+1);
}

const app=fs.readFileSync(APP,'utf8');
const segA=(()=>{const a=app.indexOf('하자 생산자 ① — 집계 엔진'),b=app.indexOf('하자 생산자 ① 끝');return app.slice(a,b);})();
const segB=(()=>{const a=app.indexOf('하자 생산자 ② — 저장·업로드'),b=app.indexOf('하자 생산자 ② 끝');return app.slice(a,b);})();
const segC=(()=>{const a=app.indexOf('하자 생산자 ③ — AI 분석'),b=app.indexOf('하자 생산자 ③ 끝');return app.slice(a,b);})();
const segD=(()=>{const a=app.indexOf('하자 생산자 ④ — 자연어 찾기'),b=app.indexOf('하자 생산자 ④ 끝');return app.slice(a,b);})();
const core=fs.readFileSync(path.join(REPORT,'app/app-core.js'),'utf8').replace(/\r\n/g,'\n');
const data=fs.readFileSync(path.join(REPORT,'app/app-data.js'),'utf8').replace(/\r\n/g,'\n');
const boot=fs.readFileSync(path.join(REPORT,'app/app-boot.js'),'utf8').replace(/\r\n/g,'\n');
const view=fs.readFileSync(path.join(REPORT,'app/app-view.js'),'utf8').replace(/\r\n/g,'\n');

let fail=0;
function eq(name,a,b){
  const ja=JSON.stringify(a),jb=JSON.stringify(b);
  if(ja!==jb){fail++;console.log('✗ '+name);
    for(let i=0;i<Math.min(ja.length,jb.length);i++)if(ja[i]!==jb[i]){console.log('  diff@'+i+': …'+ja.slice(Math.max(0,i-70),i+70)+'\n            …'+jb.slice(Math.max(0,i-70),i+70));break;}
    if(ja.length!==jb.length&&ja.slice(0,200)===jb.slice(0,200))console.log('  len '+ja.length+' vs '+jb.length);
  }else console.log('✓ '+name);
}

/* ═══ 1) 파서 동등성 ═══ */
{
  const mk=(src,names)=>{const sb={console,Date,Math,JSON,Number,String,Object,Array,Map,Set,RegExp,isFinite,parseInt};sb.globalThis=sb;
    vm.createContext(sb);vm.runInContext(names.map(n=>grab(src,n)).join('\n'),sb);return sb;};
  const orig=mk(boot,['nd','norm','csvToAoA','findHeaderRow','rowsToObjs','auditUpload']);
  const port=mk(segB,['nd','norm','csvToAoA','findHeaderRow','rowsToObjs','auditUpload']);
  const ndCases=['2026-01-05','2026.1.5','2026/01/05','20260105','2026-01-05 오전 12:00:00','',null,45123,0.5,70001,'날짜아님','1899-13-40'];
  eq('nd(문자·시리얼)',ndCases.map(orig.nd),ndCases.map(port.nd));
  const row={'접수번호':'A-1','동':'101동','호':'1203','공종':'도배','하자유형':'들뜸','중대하자유형':'','하자구분':'세대','접수일':'2026-07-03','처리확인일':'2026-07-10','처리상태':'처리완료','지연일':'7','보수주체':'시공업체','시공업체':'우주도배','보수업체':'','입주상태':'입주','세대구분':'세대','입점여부':'Y','공간':'거실','접수내용':'벽지 들뜸','민원':'','현장':'두정역','현장코드':'C01'};
  const rows=[row,{...row,'처리상태':'','처리확인일':''},{...row,'처리상태':'미처리','접수일':'2026.7.4'},{'접수일':'','처리상태':'x','공종':''}];
  eq('norm',rows.map(orig.norm),rows.map(port.norm));
  const csv='\uFEFF접수일,공종,"접수내용",처리상태\r\n2026-07-01,도배,"쉼표,포함 ""인용"" 줄\n바꿈",처리\r\n2026-07-02,타일,단순,미처리\r\n';
  eq('csvToAoA',orig.csvToAoA(csv),port.csvToAoA(csv));
  const aoa=[['하자 리스트 추출',''],['',''],['접수일','공종','처리상태','보수주체','접수번호'],['2026-07-01','도배','처리','시공업체','R1'],['','','','',''],['2026-07-02','타일','미처리','','R1']];
  eq('findHeaderRow',orig.findHeaderRow(aoa),port.findHeaderRow(aoa));
  eq('rowsToObjs',orig.rowsToObjs(aoa),port.rowsToObjs(aoa));
  const items=[{receiptDate:'2026-07-01',completionDate:'',receiptNo:'R1'},{receiptDate:'2099-01-01',completionDate:'2099-01-02',receiptNo:'R1'},{receiptDate:'',receiptNo:''}];
  eq('auditUpload',orig.auditUpload(items),port.auditUpload(items));
  /* __proto__ 오염 방어 유지 확인 */
  const evil=[['접수일','공종','처리상태','__proto__'],['2026-07-01','도배','처리','x']];
  const po=port.rowsToObjs(evil).rows[0];
  if(Object.prototype.hasOwnProperty.call(po,'__proto__')||({}).x!==undefined){fail++;console.log('✗ __proto__ 방어');}else console.log('✓ __proto__ 방어');
}

/* ═══ 공용 — 집계·데이터 사전 준비 (calc-equiv 와 같은 시드 데이터) ═══ */
function rng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
const R=rng(20260824);
const TRADES=['도배','타일','마루','창호','가구','도장','전기','설비','미장','잡철','조경','승강기','방수','석공사','수장'];
const COS=['','','대한인테리어','한빛설비','우주도배','태성타일','명진창호','그린조경','서울전기','동아방수'];
const CONTENT=['문틀 벌어짐 확인 요청','벽지 들뜸','거실 마루 찍힘','주방 상부장 문짝 처짐','화장실 타일 줄눈 오염','현관 도어 스토퍼 파손','안방 천장 누수 발생, 아랫집 피해 보상 요구','엘리베이터 갇힘 사고 발생 확인 바람','승강기 멈춤 반복','누수 없음 확인 완료 단순 문의','침수 이상 무','홍길동님 010-1234-5678 연락 요망','담당자님 확인 부탁 kim@test.co.kr','언론 제보 하겠다고 함','퇴거 후 숙박비 요구','장문 민원 '.repeat(20)];
function pad2(n){return String(n).padStart(2,'0');}
function dstr(y,m,d){return `${y}-${pad2(m)}-${pad2(d)}`;}
function randDate(){const y=2024+Math.floor(R()*3);const m=1+Math.floor(R()*12);const d=1+Math.floor(R()*28);const s=dstr(y,m,d);return s<='2026-08-20'?s:'2026-08-'+pad2(1+Math.floor(R()*20));}
function makeItems(n){
  const out=[];
  for(let i=0;i<n;i++){
    const rd=randDate();const done=R()<0.72;let cd='';
    if(done){const off=Math.floor(R()*120);const t=new Date(rd);t.setDate(t.getDate()+off);cd=dstr(t.getFullYear(),t.getMonth()+1,t.getDate());}
    const cls=R()<0.8?'세대':'공용';const store=cls==='공용'&&R()<0.15;
    out.push({receiptDate:rd,status:done?'처리':'미처리',completionDate:cd,trade:TRADES[Math.floor(R()*TRADES.length)],
      contractor:COS[Math.floor(R()*COS.length)],defectClass:cls,saleStatus:R()<0.12?(R()<0.5?'미분양':'미납'):'입주',
      building:store?'상가'+(1+Math.floor(R()*3)):String(101+Math.floor(R()*12))+'동',
      unit:store?'싱가'+(1+Math.floor(R()*5)):String(101+Math.floor(R()*30))+'0'+(1+Math.floor(R()*4)),
      defectType:R()<0.05?'누수':'기타하자',criticalType:R()<0.02?'중대':'',
      receiptContent:CONTENT[Math.floor(R()*CONTENT.length)],complaint:R()<0.05?'피해 보상 요구':'',
      space:'거실',repairParty:R()<0.5?(R()<0.5?'직영':'품의(대기)'):'협력사',repairContractor:'',delayDays:0,siteName:'',siteCode:''});
  }
  return out;
}
const SITES=[];const DEF={};
for(let i=0;i<12;i++){
  const id='s'+(1000+i);
  SITES.push({id,name:'힐스테이트 현장'+i,region:i<2?'인수 전 현장':(i%2?'중부1':'중부2'),team:'t1',teamId:'t1',
    units:500+i*40,buildings:8+i,commercialUnits:i%3===0?20:0,completionDate:'2025-0'+(1+i%9)+'-01',
    hasCommercial:i%3===0,showVacant:true,lastUploadedAt:'2026-08-2'+(i%9)});
  DEF[id]=makeItems(400+Math.floor(R()*2600));
}
const RM='2026-07';

/* 원본(report) 프리미티브 샌드박스 — calc·목록가공·capAll·rInsights·deepEncKeys */
function loadOrig(){
  const sb={console,Math,Date,JSON,Object,Array,Number,String,RegExp,Set,Map,Float64Array,isFinite,parseInt,setTimeout,clearTimeout};
  sb.window={};sb.globalThis=sb;
  const cap={innerHTML:''};
  sb.document={getElementById:id=>id==='d-insight'?cap:null};
  sb.__cap=cap;
  sb.LZString={compressToBase64:s=>'LZ:'+s.length+':'+s.slice(0,40)};
  let code='';
  code+=grabConst(view,'const RULE_DEF=')+'\n'+grabConst(view,'const CRIT_DEF=')+'\nlet _critRxCache={};\n'+grabConst(view,'const _PII_ROLE=')+'\n';
  code+='const S={def:{},defVer:0,rm:'+JSON.stringify(RM)+',trendYear:null,siteTrendYear:null,teams:[],teamId:"t1"};\n';
  code+='function setDef(id,items){S.def[id]=items;}\nfunction setS(k,v){S[k]=v;}\n';
  code+='const _calcCache=new Map();function bumpDef(){S.defVer++;_calcCache.clear();}\n';
  code+='let __SITES=[];function setSites(s){__SITES=s;S.sites=s;}\n';
  code+='function teamSites(){return __SITES;}\n';
  code+='const DASH_EXCLUDE_REGIONS=["인수 전 현장"];\n';
  code+='function insBindCards(){}\n';
  for(const n of ['pM','todayYM','esc','_ruleFind','ruleVal','critKwRegex','critLongLen','critReason','wk','isCritCandidate','topT','calcW','calcMo','_calcImpl','isStoreLabel','capAm','isVacUnit','isVacStore','capWks','trendYearInfo','maskPII','redactUL','slimUL','calc','dashSites','capAll','icoSVG','themeHTML','safeHTML'])code+=grab(core,n)+'\n';
  code+=grabConst(core,'const AI_COLOR_MAP=')+'\n';
  code+=grab(view,'shortName')+'\n';
  code+=grab(view,'rInsights')+'\n';
  code+=grab(data,'deepEncKeys').split('fbEncKey').join('__enc')+'\n';
  code+='function curTeam(){return S.teams.find(t=>t.id===S.teamId)||S.teams[0]||null;}\n';
  code+='function anaSet(){}\nfunction lsSave(){}\nfunction fb2AnaWrite(){}\nfunction toast(){}\n';
  code+='const __calls=[];function __getCalls(){return __calls;}\n';
  code+='async function fetch(url,opt){__calls.push({url,body:JSON.parse(opt.body)});return {json:async()=>({candidates:[{content:{parts:[{text:"[{\\"line1\\":\\"a\\",\\"line2\\":\\"b\\"},{\\"line1\\":\\"a\\",\\"line2\\":\\"b\\"},{\\"line1\\":\\"a\\",\\"line2\\":\\"b\\"}]"}]}}]})};}\n';
  code+=grab(view,'buildRules')+'\n'+grab(view,'runAI')+'\n'+grab(view,'runDashAI')+'\n';
  code+=[grabConst(core,'const NLQ_JOSA='),grabConst(core,'const NLQ_NOISE='),grabConst(core,'const NLQ_SYN=')].join('\n')+'\n';
  code+=grab(core,'_nlqKeys')+'\n'+grab(core,'nlqParse')+'\n'+grab(core,'nlqChips')+'\n'+grab(core,'nlqApply')+'\n';
  code+='function __enc(k){return encodeURIComponent(String(k)).replace(/\\./g,"%2E");}\n';
  vm.createContext(sb);vm.runInContext(code,sb,{filename:'orig.js'});
  return sb;
}
/* 이식본 샌드박스 — 생산자 ①+② 필요 함수 + dfPublish */
function loadPort(){
  const sb={console,Math,Date,JSON,Object,Array,Number,String,RegExp,Set,Map,Float64Array,isFinite,parseInt,setTimeout,clearTimeout,encodeURIComponent,decodeURIComponent};
  sb.window={};sb.globalThis=sb;
  sb.LZString={compressToBase64:s=>'LZ:'+s.length+':'+s.slice(0,40)};
  sb.toast=()=>{};sb.$=()=>null;sb.confirm=()=>false;
  /* 게시 전 검토 모달(615차) — 열리면 곧바로 [게시] 승인으로 응답 */
  sb.openModal=()=>{setTimeout(()=>{const r=sb.window.__PUBOK__;sb.window.__PUBOK__=null;if(r)r(true);},0);};
  sb.closeModal=()=>{};
  sb.isEditor=()=>true;sb.dfSubSiteCfg=()=>{};sb.dfProdCardFill=()=>{};
  let captured=null;sb.__pub=()=>captured;
  sb.FB={db:{ref:p=>({once:async()=>({val:()=>p==='reportIndex'?{}:null}),update:async u=>{captured=u;},set:async()=>{}})}};
  sb.DF={cache:{},kpi:{},sw:{},sam:{},vac:{}};
  let code='';
  code+='const S={def:{},defVer:0,dfPubRm:'+JSON.stringify(RM)+',live:true,user:{email:"editor@hdec.co.kr"},org:{teams:[{id:"t1",name:"H서비스중부팀"}],regions:[{id:"중부1",name:"중부1"},{id:"중부2",name:"중부2"},{id:"인수 전 현장",name:"인수 전 현장"}],sites:[]},snap:false};\n';
  code+='function setDef(id,items){S.def[id]=items;}\nfunction setS(k,v){S[k]=v;}\n';
  code+='const _calcCache=new Map();function bumpDef(){S.defVer++;_calcCache.clear();}\n';
  code+='let __SITES=[];function setSites(s){__SITES=s;S.org.sites=s;}\n';
  code+='function dfSites(){return __SITES;}\n';
  code+='function dfDashSites(){return dfSites().filter(s=>s.region!=="인수 전 현장");}\n';
  code+='function dfPubRm(){return S.dfPubRm;}\n';
  code+='function esc(s){return String(s==null?"":s).replace(/[&<>"\']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","\'":"&#39;"}[c]));}\n';
  code+='function dfEncKey(k){return encodeURIComponent(String(k)).replace(/\\./g,"%2E");}\n';
  code+='function dfDecKey(k){try{return decodeURIComponent(String(k));}catch(e){return String(k);}}\n';
  code+='function dfDec(v){if(Array.isArray(v))return v.map(dfDec);if(v&&typeof v==="object"){const o={};Object.keys(v).forEach(k=>{o[dfDecKey(k)]=dfDec(v[k]);});return o;}return v;}\n';
  for(const n of ['pM','todayYM','_ruleFind','ruleVal','critKwRegex','critLongLen','critReason','wk','isCritCandidate','topT','calcW','calcMo','_calcImpl','isStoreLabel','capAm','isVacUnit','isVacStore','capWks','trendYearInfo','capAll','maskPII','redactUL','slimUL','calc'])code+=grab(segA,n)+'\n';
  code+=grabConst(segA,'const RULE_DEF=')+'\n'+grabConst(segA,'const CRIT_DEF=')+'\nlet _critRxCache={};\n'+grabConst(segA,'const _PII_ROLE=')+'\n';
  code+=grabConst(segB,'const AI_COLOR_MAP=')+'\n';
  for(const n of ['themeHTML','icoSVG','safeHTML','dfInsShortName','dfInsightsBuild','deepEncKeys','dfOrgToDashSites','dfOrgToDashTeams','dfPublish'])code+=grab(segB,n)+'\n';
  code+='let DFMETA={lastUp:{}};\n';
  code+='const __calls=[];function __getCalls(){return __calls;}\n';
  code+='async function fetch(url,opt){__calls.push({url,body:JSON.parse(opt.body)});return {json:async()=>({candidates:[{content:{parts:[{text:"[{\\"line1\\":\\"a\\",\\"line2\\":\\"b\\"},{\\"line1\\":\\"a\\",\\"line2\\":\\"b\\"},{\\"line1\\":\\"a\\",\\"line2\\":\\"b\\"}]"}]}}]})};}\n';
  for(const n of ['dfAnaWrite','buildRules','runAI','runDashAI'])code+=grab(segC,n)+'\n';
  code+=[grabConst(segD,'const NLQ_JOSA='),grabConst(segD,'const NLQ_NOISE='),grabConst(segD,'const NLQ_SYN=')].join('\n')+'\n';
  code+=grab(segD,'_nlqKeys')+'\n'+grab(segD,'nlqParse')+'\n'+grab(segD,'nlqChips')+'\n'+grab(segD,'nlqApply')+'\n';
  vm.createContext(sb);vm.runInContext(code,sb,{filename:'port.js'});
  return sb;
}

const O=loadOrig(),P2=loadPort();
O.setSites(SITES);P2.setSites(SITES);
for(const s of SITES){O.setDef(s.id,DEF[s.id]);P2.setDef(s.id,DEF[s.id]);}

/* ═══ 2) 주요이슈 동등성 ═══ */
{
  const allO=O.teamSites().filter(s=>s.region!=='인수 전 현장').map(s=>({s,st:O.calc(DEF[s.id],s,RM)}));
  let tR=0,tRes=0,tU=0,tLt=0,pR=0,pRes=0;
  for(const x of allO){const st=x.st;tR+=st.tR;tRes+=st.res;tU+=st.unr;tLt+=st.lt;pR+=st.prev.total;pRes+=st.prev.res;}
  const rate=tR>0?tRes/tR*100:0,pRate=pR>0?pRes/pR*100:0;
  O.rInsights(allO,tR,tRes,tU,tLt,rate,pRate);
  const origHTML=O.__cap.innerHTML;
  const allP=P2.dfDashSites().map(s=>({s,st:P2.calc(DEF[s.id],s,RM)}));
  const portHTML=P2.dfInsightsBuild(allP,tR,tRes,tU,tLt,rate,pRate,RM);
  eq('주요이슈 HTML',origHTML,portHTML);
}

/* ═══ 3) 게시 payload 동등성 ═══ */
{
  await P2.dfPublish();
  const got=P2.__pub();
  if(!got){fail++;console.log('✗ dfPublish update 미호출');}
  else{
    /* 기대 트리 — 원본 fb2Publish 의 수식 그대로 조립 */
    const cap=O.capAll();
    const exp={};
    const allO=O.teamSites().filter(s=>s.region!=='인수 전 현장').map(s=>({s,st:O.calc(DEF[s.id],s,RM)}));
    let tR=0,tRes=0,tU=0,tLt=0,pR=0,pRes=0;
    for(const x of allO){const st=x.st;tR+=st.tR;tRes+=st.res;tU+=st.unr;tLt+=st.lt;pR+=st.prev.total;pRes+=st.prev.res;}
    O.rInsights(allO,tR,tRes,tU,tLt,tR>0?tRes/tR*100:0,pR>0?pRes/pR*100:0);
    exp['report/'+RM+'/_dash']={wks:cap.wks||[],am:cap.am||{},insightsHTML:O.__cap.innerHTML,
      sites:SITES.map(x=>({id:String(x.id),name:String(x.name),region:String(x.region||''),teamId:String(x.team||''),
        units:Number(x.units)||0,buildings:Number(x.buildings)||0,commercialUnits:Number(x.commercialUnits)||0,
        completionDate:String(x.completionDate||''),hasCommercial:!!x.hasCommercial,showVacant:x.showVacant!==false,
        lastUploadedAt:x.lastUploadedAt||''})),
      teams:[{id:'t1',name:'H서비스중부팀',regions:['중부1','중부2']}]};
    for(const s2 of SITES){
      const r=O.calc(DEF[s2.id],s2,RM);
      const kpi=Object.assign({},r,{ul:O.redactUL(r.ul),lul:O.redactUL(r.lul),critUl:O.redactUL(r.critUl)});
      const ulz=O.LZString.compressToBase64(JSON.stringify(O.slimUL(r.ul)));
      exp['report/'+RM+'/'+s2.id]={kpi,ulz,siteWks:(cap.siteWks&&cap.siteWks[s2.id])||[],siteAm:(cap.siteAm&&cap.siteAm[s2.id])||{},vac:{}};
    }
    exp['report/'+RM+'/_meta']={rm:RM};
    exp['reportIndex/'+RM]=0;
    Object.keys(exp).forEach(p=>{exp[p]=O.deepEncKeys(exp[p]);});
    /* 타임스탬프·게시자 제외 후 비교 */
    const gotCmp=JSON.parse(JSON.stringify(got));
    if(gotCmp['report/'+RM+'/_meta']){delete gotCmp['report/'+RM+'/_meta'].publishedAt;delete gotCmp['report/'+RM+'/_meta'].publishedBy;}
    gotCmp['reportIndex/'+RM]=0;
    eq('게시 payload 경로 집합',Object.keys(gotCmp).sort(),Object.keys(exp).sort());
    for(const k of Object.keys(exp))eq('게시 '+k,gotCmp[k],exp[k]);
  }
}

/* ═══ 5) NLQ 해석·적용 동등성 ═══ */
{
  const NAMES=SITES.filter(s=>s.region!=='인수 전 현장').map(s=>s.name);
  const mk=sb=>{const A=sb._nlqKeys(NAMES),B=sb._nlqKeys(TRADES);return {siteKeys:A.keys,siteAmbig:A.ambig,tradeKeys:B.keys,tradeAmbig:B.ambig};};
  const dO=mk(O),dP=mk(P2);
  eq('NLQ 사전',dO,dP);
  const rows=[];
  SITES.filter(s=>s.region!=='인수 전 현장').forEach(s=>{const st=O.calc(DEF[s.id],s,RM);(st.ul||[]).forEach(i=>rows.push(Object.assign({},i,{siteName:s.name,__hc:!!s.hasCommercial})));});
  const QS=['현장3 도배 30일 이상','누수 피해 보상','공가 오래된순 승강기','상가 타일 60일 미만','완료된 창호 101동 302호','힐스테이트 현장6 갇힘 최신순'];
  for(const q of QS){
    const a=O.nlqParse(q,dO),b=P2.nlqParse(q,dP);
    eq('NLQ 해석 "'+q+'"',a,b);
    eq('NLQ 칩 "'+q+'"',O.nlqChips(a.R),P2.nlqChips(b.R));
    eq('NLQ 적용 "'+q+'" ('+O.nlqApply(rows,a.R).length+'건)',O.nlqApply(rows,a.R),P2.nlqApply(rows,b.R));
  }
}

/* ═══ 6) AI 프롬프트 동등성 — 요청(URL·본문)이 원본과 같아야 산출물이 같다 ═══ */
{
  O.setS('ck','testkey');P2.setS('ck','testkey');
  O.setS('teams',[{id:'t1',name:'H서비스중부팀'}]);O.setS('teamId','t1');
  const site=SITES[4];
  await O.runAI(site.id);
  await P2.runAI(site.id);
  const cO=O.__getCalls(),cP=P2.__getCalls();
  eq('runAI URL',cO[0]&&cO[0].url,cP[0]&&cP[0].url);
  eq('runAI 본문',cO[0]&&cO[0].body,cP[0]&&cP[0].body);
  /* runDashAI — S._dashIns 는 2·3절에서 양쪽 다 규칙기반으로 채워졌다(원본 rInsights / 이식 dfInsightsBuild) */
  await O.runDashAI();
  await P2.runDashAI();
  eq('runDashAI URL',cO[1]&&cO[1].url,cP[1]&&cP[1].url);
  eq('runDashAI 본문',cO[1]&&cO[1].body,cP[1]&&cP[1].body);
}

/* ═══ 4) 생산자 부팅·카드 배선 스모크 (vm 스텁 DOM — 실브라우저 스모크는 smoke.mjs, 배포 전 별도 실행) ═══ */
{
  const els={};const mk=id=>els[id]||(els[id]={id,style:{},value:'',textContent:'',innerHTML:'',disabled:false,
    classList:{add(){},remove(){},toggle(){}},files:null,click(){this._clicked=true;},
    querySelector:()=>null,querySelectorAll:()=>[],insertBefore(){},appendChild(){},append(){},setAttribute(){},dataset:{}});
  const sb={console,Math,Date,JSON,Object,Array,Number,String,RegExp,Set,Map,Promise,isFinite,parseInt,setTimeout,clearTimeout,encodeURIComponent,decodeURIComponent};
  sb.window={};sb.globalThis=sb;
  const listeners={};
  const mkEl=()=>({style:{},className:'',textContent:'',dataset:{},append(){},appendChild(){},prepend(){},setAttribute(){},addEventListener(){},remove(){},classList:{add(){},remove(){}}});
  sb.document={readyState:'complete',getElementById:mk,querySelectorAll:()=>[],createElement:mkEl,createDocumentFragment:mkEl,addEventListener:(t,f)=>{(listeners[t]=listeners[t]||[]).push(f);}};
  sb.location={search:''};
  sb.$=sel=>mk(sel.replace('#',''));
  sb.toast=()=>{};sb.isEditor=()=>true;sb.closeModal=()=>{};sb.openModal=()=>{};sb.esc=x=>String(x??'');
  sb.ACT={};sb.FB={db:null};sb.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
  /* in-memory IndexedDB 최소 스텁 — dbOpen 경로용 */
  const stores={meta:{},defects:{}};
  const asyncReq=fn=>{const r={};setTimeout(()=>{try{r.result=fn();r.onsuccess&&r.onsuccess();}catch(e){r.error=e;r.onerror&&r.onerror();}},0);return r;};
  const osOf=st=>({
    get:k=>asyncReq(()=>stores[st][k]),
    put:v=>asyncReq(()=>{stores[st][v.id||v.sid]=v;}),
    delete:k=>asyncReq(()=>{delete stores[st][k];}),
    getAll:()=>asyncReq(()=>Object.values(stores[st])),
  });
  sb.indexedDB={open(){
    const req={};
    setTimeout(()=>{
      req.result={objectStoreNames:{contains:()=>true},transaction:st=>({objectStore:()=>osOf(st)})};
      req.onsuccess&&req.onsuccess();
    },0);
    return req;
  }};
  let code='const DB_NAME="hdec_db_v1",DB_VER=1;\nlet _db=null;\nconst S={def:{},defVer:0,live:true,snap:false,org:{teams:[],regions:[],sites:[]},user:null};\n';
  code+='function dfSites(){return [];}\nfunction dfDashSites(){return [];}\n';
  code+='function pM(ym){const[y,m]=ym.split("-").map(Number);return m===1?`${y-1}-12`:`${y}-${String(m-1).padStart(2,"0")}`;}\n';
  code+='function todayYM(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;}\n';
  code+='function dfPubRm(){return S.dfPubRm||pM(todayYM());}\n';
  for(const n of ['dbOpen','dbTx','dbGet','dbPut','dbDel','dbAll','defEncode','defDecode','defSave','defLoadAll','defDelete','dfMetaLoad','dfMetaSave','dfFmtDT','dfExTkList','dfExTkSet','dfExTkRender','dfProdCardFill','dfProdWire','dfProdBoot','onFile','cancelUL'])code+=grab(segB,n)+'\n';
  code+=grabConst(segB,'let DFMETA=')+';\n';
  vm.createContext(sb);
  try{
    vm.runInContext(code,sb,{filename:'prodboot.js'});
    await sb.dfProdBoot();
    const okAct=typeof sb.ACT['dfp.publish']==='function'&&typeof sb.ACT['dfp.uz']==='function'&&typeof sb.ACT['dfp.ulCancel']==='function'&&typeof sb.ACT['dfp.ulSite']==='function';
    if(!okAct){fail++;console.log('✗ 생산자 ACT 등록');}else console.log('✓ 생산자 ACT 등록');
    const okChange=(listeners['change']||[]).length>=1&&(listeners['drop']||[]).length>=1;
    if(!okChange){fail++;console.log('✗ 파일/드롭 리스너 등록');}else console.log('✓ 파일/드롭 리스너 등록');
    sb.ACT['dfp.uz']();
    if(!els['dfFi']||!els['dfFi']._clicked){fail++;console.log('✗ 업로드존 → 파일창');}else console.log('✓ 업로드존 → 파일창');
    if(String(els['dfLocalStat'].textContent).indexOf('업로드된 데이터 없음')<0){fail++;console.log('✗ 카드 상태 문구');}else console.log('✓ 카드 상태 문구');
    if(!/^\d{4}-\d{2}$/.test(els['dfPubRm'].value)){fail++;console.log('✗ 기준월 기본값');}else console.log('✓ 기준월 기본값');
  }catch(e){fail++;console.log('✗ 생산자 부팅 스모크: '+e.message);}
}

console.log(fail?('FAIL '+fail):'ALL PASS');
process.exit(fail?1:0);
