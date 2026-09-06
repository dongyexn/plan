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
let exact=0,tp=0,fp=0,fn=0,fail=0;const miss=[];
rows.forEach((r,i)=>{const g=new Set(r.gold),o=new Set(res[i].got.filter(x=>x!=='장기방치'));const ok=g.size===o.size&&[...g].every(x=>o.has(x));if(ok)exact++;else miss.push(r.content.slice(0,50)+' | 정답 '+r.gold.join(',')+' | 판정 '+res[i].got.join(','));for(const x of o)g.has(x)?tp++:fp++;for(const x of g)if(!o.has(x))fn++;});
const acc=exact/rows.length,prec=tp/(tp+fp),rec=tp/(tp+fn);
const ok=(m,c)=>{console.log((c?'ok    ':'FAIL  ')+m);if(!c)fail++;};
ok(`예문 ${rows.length}건 완전일치 ${(acc*100).toFixed(0)}% (${exact}/${rows.length})`,acc>=0.9);
ok(`감지요소 정밀도 ${(prec*100).toFixed(0)}% · 재현율 ${(rec*100).toFixed(0)}%`,prec>=0.9&&rec>=0.9);
/* 고위험 규칙: 중대 1개 → 고위험, 소프트(장기방치)만 → 주의 */
const lv=await pg.evaluate(()=>[riskLevel(['안전위험'],1,0).level,riskLevel(['안전위험'],1,2).level,riskLevel(['장기방치'],1,0).level,riskLevel(['응대·소통불만','생활불편','책임·형평성불만'],1,0).level,riskLevel(['응대·소통불만','생활불편','책임·형평성불만'],1,1).level,riskLevel(['응대·소통불만','장기방치','생활불편'],1,0).level,riskLevel([],3,0).level,riskLevel([],4,0).level,riskLevel(['안전위험','보상요구'],1,0).level]);
ok('5단계 — 긴급 = 심각 + 미처리 잔여(처리 끝나면 심각) · 장기방치만→주의 · 비중대3→심각 · 물리3→주의 · 물리4→경계',JSON.stringify(lv)==='["심각","긴급","주의","심각","긴급","경계","주의","경계","심각"]');
/* 오탐 5종 */
const fp5=await pg.evaluate(()=>['거실 스피커 방송 안들림','회장대 도배 불량','걷고 발디딜때마다 가라앉을까 무서울만큼요','101호와 같은 현상으로 민원','[소송미참여세대] 침1 전등스위치 작동불량','세면대 하부장 스크래치 / 자재발주'].map(t=>riskDetect(t).factors));
ok('오탐 5종 — 방송·회장대·고발/발디딜·직원 민원 메모·소송 태그·자재발주',fp5[0].length===0&&fp5[1].length===0&&!fp5[2].includes('법적·외부기관')&&fp5[3].length===0&&fp5[4].length===0&&fp5[5].length===0);
miss.forEach(m=>console.log('   ✗ '+m));
await br.close();srv.close();console.log(fail?'RISK FAIL '+fail:'RISK ALL PASS');process.exit(fail?1:0);
