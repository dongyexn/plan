/* 709차: 민원 세대 레벨화 — 예문 정답셋(fixtures/risk-gold.md 60건)으로 앱 엔진(riskDetect·riskLevel)을 검사한다.
   기준: 세대 단위 완전일치 ≥ 90%, 감지요소 정밀도·재현율 ≥ 90%. 정답셋 자체의 판단 차이 3건(HANDOFF 709차)은 허용 오차 안이다. */
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root=process.cwd();const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'};
const srv=http.createServer((q,s)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(root,p);
 if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);s.end();return;}s.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});s.end(fs.readFileSync(f));}).listen(8460);
const md=fs.readFileSync(path.join(root,'scripts/test/fixtures/risk-gold.md'),'utf8');
const N={'감정격화':'감정격화·위협표현','책임·형평성':'책임·형평성불만','처리지연':'처리지연·일정피해'};
const rows=[];for(const m of md.matchAll(/^\d+\. (.+?) \| (.+?) \| `(.+?)` \| \[(.+?)\]/gm))rows.push({trade:m[1].trim(),dtype:m[2].trim(),content:m[3],gold:m[4].split(',').map(x=>x.trim()).filter(x=>!x.startsWith('없음')).map(x=>N[x]||x)});
const br=await chromium.launch({executablePath:process.env.CHROMIUM,args:['--no-sandbox']});
const pg=await br.newPage();await pg.goto('http://localhost:8460/index.html?local=1');await pg.waitForFunction(()=>typeof riskDetect==='function');
const res=await pg.evaluate(rows=>rows.map(r=>{const d=riskDetect(r.content);return {got:d.factors,phys:riskPhys(r.dtype,r.trade),lv:riskLevel(d.factors,riskPhys(r.dtype,r.trade)).level};}),rows);
let exact=0,tp=0,fp=0,fn=0,fail=0;const miss=[];globalThis.__miss=miss;
rows.forEach((r,i)=>{const g=new Set(r.gold),o=new Set(res[i].got.filter(x=>x!=='장기방치'&&x!=='반복민원'&&x!=='사설시공·인테리어'));   /* 743차: 반복민원은 정답셋(709차) 이후 추가된 요소 — 비교에서 뺀다 */const ok=g.size===o.size&&[...g].every(x=>o.has(x));if(ok)exact++;else miss.push(r.content.slice(0,50)+' | 정답 '+r.gold.join(',')+' | 판정 '+res[i].got.join(','));for(const x of o)g.has(x)?tp++:fp++;for(const x of g)if(!o.has(x))fn++;});
const acc=exact/rows.length,prec=tp/(tp+fp),rec=tp/(tp+fn);
const ok=(m,c)=>{console.log((c?'ok    ':'FAIL  ')+m);if(!c)fail++;};
ok(`예문 ${rows.length}건 완전일치 ${(acc*100).toFixed(0)}% (${exact}/${rows.length})`,acc>=0.9);miss.forEach(m=>console.log('      · '+m));
ok(`감지요소 정밀도 ${(prec*100).toFixed(0)}% · 재현율 ${(rec*100).toFixed(0)}%`,prec>=0.9&&rec>=0.9);
/* 고위험 규칙: 중대 1개 → 고위험, 소프트(장기방치)만 → 주의 */
const lv=await pg.evaluate(()=>[riskLevel(['안전위험'],1,0).level,riskLevel(['안전위험'],1,2).level,riskLevel(['장기방치'],1,0).level,riskLevel(['응대·소통불만','생활불편','책임·형평성불만'],1,0).level,riskLevel(['응대·소통불만','생활불편','책임·형평성불만'],1,1).level,riskLevel(['응대·소통불만','장기방치','생활불편'],1,0).level,riskLevel([],3,0).level,riskLevel([],4,0).level,riskLevel(['안전위험','보상요구'],1,0).level,riskLevel(['법적·외부기관'],1,0).level,riskLevel(['법적·외부기관'],1,1).level,riskLevel(['안전위험','보상요구','감정격화·위협표현'],1,0).level,riskLevel(['외부확산'],1,1,0,3).level,riskLevel(['외부확산','장기방치'],4,1,0,7).level]);
/* 734차: 긴급 = ★중대 2개 이상, 또는 법적·외부기관/외부확산 + 미처리 잔여(HANDOFF §민원 현황 규칙). 종전 「심각 + 미처리」 승격은 심각을 비우고 긴급으로 쏠리게 했다 */
ok('5단계 — 긴급 = 중대3 · 외부/법적+미처리 · 장기방치만→주의 · 비중대3→심각 · 물리3→주의 · 물리4→경계',JSON.stringify(lv)==='["심각","심각","주의","심각","심각","경계","주의","경계","심각","심각","긴급","긴급","심각","긴급"]');   /* 745차: 외부+미처리는 점수 7 이상일 때만 긴급 */
/* 오탐 5종 */
const fp5=await pg.evaluate(()=>['거실 스피커 방송 안들림','회장대 도배 불량','걷고 발디딜때마다 가라앉을까 무서울만큼요','101호와 같은 현상으로 민원','[소송미참여세대] 침1 전등스위치 작동불량','세면대 하부장 스크래치 / 자재발주'].map(t=>riskDetect(t).factors));
ok('오탐 5종 — 방송·회장대·고발/발디딜·직원 민원 메모·소송 태그·자재발주',fp5[0].length===0&&fp5[1].length===0&&!fp5[2].includes('법적·외부기관')&&fp5[3].length===0&&fp5[4].length===0&&fp5[5].length===0);
miss.forEach(m=>console.log('   ✗ '+m));
/* 743차: 문맥·방향성 — 단독 키워드로 오르던 오탐과 직원 문장 */
const ctx=await pg.evaluate(()=>[
  ['사고 없이 마무리함',[]],['바닥이 내려앉아 디디면 위험합니다',['안전위험']],['위험 없음 확인',[]],['삐그덕 소리가 나서 불안합니다',['안전위험']],
  ['보수비용 발생 여부 확인',[]],['발생한 손해에 대해 비용을 청구하겠습니다',['보상요구']],['비용 지급 예정',[]],['청구서 접수',[]],
  ['책임지고 처리하겠습니다',[]],['시공사가 책임져야 한다',['책임·형평성불만']],['누가 책임질 것인지 밝혀달라',['책임·형평성불만']],
  ['입주민이 화가 나서 경찰을 부르겠다고 함',['감정격화·위협표현']],['경찰 신고 여부 확인',[]],['처리 지연으로 스트레스가 심함',['감정격화·위협표현']],
  ['지난번에도 문의했는데 아직 답변이 없습니다',['반복민원','응대·소통불만']],['방문 이후 처리 예정',[]],['보수했으나 동일 현상 발생',['보수품질·반복하자']],
  ['현대에서 직접 와서 봐라',['응대·소통불만']],['담당자 연락해라',['응대·소통불만']],['협력업체 본사에 연락함',[]],['인테리어 줄눈 시공분 보상 문의',['사설시공·인테리어']],['사설 중문 설치 후 문틀 파손',['사설시공·인테리어']],
  ['몇 달째 처리되지 않고 있습니다',['처리지연·일정피해']],['작년부터 신청했는데 아직도 조치가 안됨',['처리지연·일정피해']],['아직 방문하지 않음',['처리지연·일정피해']],['8/21 // 8/30 / 9/2 독촉',['반복민원']],['고객 보상 요구함, 자재발주 처리예정',['보상요구']],['자재발주 처리예정',[]],['자재발주했으나 고객이 보상을 요구함',['보상요구']],['8/21 접수 / 8/30 현장 방문',[]],
].map(([c,g])=>{const got=riskDetect(c).factors.filter(x=>x!=='장기방치').sort();return [c,g.slice().sort().join(','),got.join(',')];}));
const bad=ctx.filter(([c,g,o])=>g!==o);
ok('문맥·방향성 30건 — 단독 키워드(사고·위험·청구·비용·책임·경찰·스트레스) 무효, 직원 문장 무효',bad.length===0);bad.forEach(b=>console.log('      · '+b[0]+' | 정답 '+b[1]+' | 판정 '+b[2]));
const sc=await pg.evaluate(()=>[riskScore(['안전위험','응대·소통불만'],4,0),riskScore(['장기방치'],1,200),riskScore(['장기방치'],3,400),riskLevel(['응대·소통불만'],1,1,200).level,riskLevel(['응대·소통불만'],1,1,400).level]);
ok('점수 — 중대3+일반1+물리4 = 6 · 장기방치1+180일1 = 2 · 장기방치1+365일2+물리3 1 = 4 · 180일은 등급 그대로(경계) · 365일은 한 단계 위(심각)',JSON.stringify(sc)==='[6,2,4,"경계","심각"]');
/* 756차: 세대 묶음 — 끝난 옛 건의 지연일은 등급을 올리지 않고, 자동 요소엔 근거 줄이 붙는다 */
const hh=await pg.evaluate(()=>{const rows=[
  {building:'101',unit:'101',receiptNo:'1',receiptContent:'타일 흠집',defectType:'흠집',trade:'타일',space:'욕실',status:'처리',delayDays:400,receiptDate:'2025-01-01'},
  {building:'101',unit:'101',receiptNo:'2',receiptContent:'연락이 없음',defectType:'오염',trade:'도배',space:'거실',status:'미처리',delayDays:5,receiptDate:'2026-08-01'}];
  const h=riskHH(rows).list[0];return [h.level,h.delay,h.maxDelay,h.sc];});
ok('옛 완료건 400일은 이력(maxDelay)로만 — 현재 미처리 5일 세대는 경계(응대 1개), 점수 1',JSON.stringify(hh)==='["경계",5,400,1]');
const au=await pg.evaluate(()=>{const rows=[];for(let i=0;i<8;i++)rows.push({building:'102',unit:'202',receiptNo:String(i),receiptContent:'문의',defectType:'파손',trade:'가구',space:'주방',status:i<6?'처리':'미처리',delayDays:i<6?10:70,receiptDate:'2026-01-0'+(i+1)});
  const h=riskHH(rows).list[0];return h.evid.filter(e=>e.auto).map(e=>e.f[0]+':'+e.t);});
ok('자동 요소 근거 — 반복민원(8건)·보수품질(주방/파손 8건)·장기방치(미처리 최장 70일)',JSON.stringify(au)==='["반복민원:세대 접수 8건(8건 이상)","보수품질·반복하자:주방 / 파손 8건 반복","장기방치:현재 미처리 최장 70일(60일 이상)"]');
await br.close();srv.close();console.log(fail?'RISK FAIL '+fail:'RISK ALL PASS');process.exit(fail?1:0);
