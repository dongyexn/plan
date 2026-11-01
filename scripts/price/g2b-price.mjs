/* 조달청 나라장터 가격정보현황서비스 → data/g2b-price.json (앱 물가정보의 「조달청 가격정보」 검색용)
   시설공통자재(건축·기계설비·전기정보통신·토목) · 시장시공가격(건축·기계설비)을 모두 받아
   같은 품명·단위는 가장 최근 고시의 값만 남긴다(0원 제외). 키: 환경변수 G2B_KEY(공공데이터포털 인증키)
   12개월 넘게 다시 고시되지 않은 품목은 뺀다. 출력 d 한 줄 = [품명(규격 포함), 단위, 단가, 고시월 YYYY-MM, 분류 번호(c 의 차례), 물품분류명] */
import fs from 'node:fs';
const KEY=process.env.G2B_KEY;if(!KEY){console.error('G2B_KEY 없음');process.exit(1);}
const B='https://apis.data.go.kr/1230000/ao/PriceInfoService/';
const OPS=[['getPriceInfoListFcltyCmmnMtrilBildng','자재 · 건축'],['getPriceInfoListFcltyCmmnMtrilMchnEqp','자재 · 기계설비'],['getPriceInfoListFcltyCmmnMtrilElctyIrmc','자재 · 전기·통신'],
  ['getPriceInfoListFcltyCmmnMtrilEngrk','자재 · 토목'],['getPriceInfoListMrktCnstrctPcBildng','시공 · 건축'],['getPriceInfoListMrktCnstrctPcMchnEqp','시공 · 기계설비']];
const N=500,sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function page(op,no){
  const u=B+op+'?'+new URLSearchParams({serviceKey:KEY,type:'json',pageNo:String(no),numOfRows:String(N)});
  for(let t=1;t<=4;t++){
    try{const r=await fetch(u,{signal:AbortSignal.timeout(90000)});const j=JSON.parse(await r.text());const b=j.response&&j.response.body;
      if(!b)throw new Error(JSON.stringify(j).slice(0,200));return b;}
    catch(e){console.warn(op,no,'재시도',t,String(e.message||e).replace(KEY,'').slice(0,160));await sleep(3000*t);}
  }
  throw new Error(op+' '+no+' 실패');
}
/* 같은 품목인데 고시마다 표기가 조금 다르다(9.5*900 · 9.5×900, mm · ㎜) — 비교 키만 고르게 한다 */
const nk=t=>String(t).toLowerCase().replace(/\s+/g,'').replace(/[*x×]/g,'×').replace(/㎜/g,'mm').replace(/㎡/g,'m2').replace(/㎥/g,'m3').replace(/[()（）\[\]]/g,'');
const best=new Map();let calls=0,rows=0;
for(const [ci,[op,label]] of OPS.entries()){
  const first=await page(op,1);calls++;const tot=+first.totalCount||0,pages=Math.ceil(tot/N);
  const take=it=>{for(const x of it||[]){rows++;const p=Math.round(+x.prce||0);if(!(p>0))continue;const n=String(x.krnPrdctNm||'').replace(/\s+/g,' ').trim();if(!n)continue;
    const u=String(x.unit||'').trim(),d=String(x.nticeDt||''),k=nk(n)+'|'+nk(u)+'|'+ci,o=best.get(k);
    if(!o||d>o.d)best.set(k,{d,r:[n,u,p,d.slice(0,7),ci,String(x.prdctClsfcNoNm||'').trim()]});}};
  take(first.items);
  for(let no=2;no<=pages;no++){take((await page(op,no)).items);calls++;}
  console.log(label,'총',tot,'쪽',pages);
}
/* 가장 최근 고시에서 12개월 넘게 다시 고시되지 않은 품목(이름이 바뀌었거나 빠진 것)은 버린다 */
const last=[...best.values()].reduce((m,x)=>x.r[3]>m?x.r[3]:m,'');const[ly,lm]=last.split('-').map(Number),cut=(lm>=12?ly:ly-1)+'-'+String(lm>=12?1:lm+1).padStart(2,'0');
const d=[...best.values()].map(x=>x.r).filter(r=>r[3]>=cut).sort((a,b)=>a[0].localeCompare(b[0],'ko'));
const out={at:new Date().toISOString(),c:OPS.map(o=>o[1]),d};
fs.mkdirSync('data',{recursive:true});
const old=fs.existsSync('data/g2b-price.json')?JSON.parse(fs.readFileSync('data/g2b-price.json','utf8')):null;
if(old&&JSON.stringify(old.d)===JSON.stringify(d)){console.log('바뀐 값 없음');process.exit(0);}
fs.writeFileSync('data/g2b-price.json',JSON.stringify(out));
console.log('호출',calls,'행',rows,'남긴 품목',d.length,'크기',fs.statSync('data/g2b-price.json').size);
