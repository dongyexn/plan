/* 시험 5단계 — 크레딧 안 씀: johnvc/naver-search-api 입력 형식·가격 + 지난 실행 결과 표본·입력값 */
import fs from 'node:fs';
const T=process.env.APIFY_TOKEN;const H={Authorization:'Bearer '+T};
const g=async u=>(await (await fetch(u,{headers:H})).json());
const a=(await g('https://api.apify.com/v2/acts/johnvc~naver-search-api')).data||{};
const bid=a.taggedBuilds&&a.taggedBuilds.latest&&a.taggedBuilds.latest.buildId;
let s=null;if(bid){const b=(await g('https://api.apify.com/v2/actor-builds/'+bid)).data||{};s=b.inputSchema||(b.actorDefinition&&b.actorDefinition.input);if(typeof s==='string')s=JSON.parse(s);}
const out={title:a.title,modified:a.modifiedAt,stats:a.stats&&{users30:a.stats.totalUsers30Days,runs:a.stats.totalRuns},pricing:a.pricingInfos&&a.pricingInfos.slice(-1),
  schema:s&&s.properties&&Object.fromEntries(Object.entries(s.properties).map(([k,v])=>[k,{type:v.type,title:v.title,desc:(v.description||'').slice(0,160),def:v.default??v.prefill,enum:v.enum,min:v.minimum,max:v.maximum,req:(s.required||[]).includes(k)}]))};
const L=(await g('https://api.apify.com/v2/actor-runs?desc=1&limit=15')).data.items.filter(r=>r.actId===a.id).slice(0,1);
for(const r of L){const kv=await (await fetch(`https://api.apify.com/v2/key-value-stores/${r.defaultKeyValueStoreId}/records/INPUT`,{headers:H})).text();out.lastInput=kv.slice(0,600);
  const it=await g(`https://api.apify.com/v2/datasets/${r.defaultDatasetId}/items?clean=1&limit=20`);out.n=it.length;out.sample=it.slice(0,20);}
fs.writeFileSync('probe/out/apify-5.json',JSON.stringify(out,null,1));
