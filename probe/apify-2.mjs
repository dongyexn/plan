/* 시험 2단계 — 실제 수집: 검색어 3개 × 수집기 2개, 시간·비용·결과 표본. 실행마다 지출 상한 0.2달러 */
import fs from 'node:fs';
const T=process.env.APIFY_TOKEN;const H={Authorization:'Bearer '+T,'Content-Type':'application/json'};
const Q=['석고보드 9.5T','실리콘 실란트','도어락'];
const RUN={
  'searchapi~naver-shopping-scraper':q=>({query:q,maxItemsPerQuery:10,maxPages:1,sortBy:'relevance'}),
  'khadinakbar~naver-product-shopping-scraper':q=>({searchQueries:[q],maxResults:10}),
};
const out={at:new Date().toISOString(),runs:[]};
for(const [id,inp] of Object.entries(RUN))for(const q of Q){
  const t0=Date.now();
  const r=await fetch(`https://api.apify.com/v2/acts/${id}/runs?waitForFinish=240&maxTotalChargeUsd=0.2&timeout=180&memory=1024`,{method:'POST',headers:H,body:JSON.stringify(inp(q))});
  const j=await r.json().catch(()=>({}));const d=j.data||{};
  let items=[];if(d.defaultDatasetId){const it=await fetch(`https://api.apify.com/v2/datasets/${d.defaultDatasetId}/items?clean=1&limit=10`,{headers:H});items=await it.json().catch(()=>[]);}
  const run=d.id?(await (await fetch('https://api.apify.com/v2/actor-runs/'+d.id,{headers:H})).json()).data:{};
  out.runs.push({id,q,http:r.status,status:run.status||d.status||j.error,secs:Math.round((Date.now()-t0)/1000),usd:run.usageTotalUsd,charged:run.chargedEventCounts,n:Array.isArray(items)?items.length:0,
    keys:Array.isArray(items)&&items[0]?Object.keys(items[0]):[],sample:(Array.isArray(items)?items:[]).slice(0,10).map(x=>{const o={};for(const k of Object.keys(x))if(/name|title|price|mall|seller|store|url|link|brand|maker|category|review|deliver/i.test(k))o[k]=typeof x[k]==='string'?x[k].slice(0,90):x[k];return o;})});
  console.log(id,q,out.runs.at(-1).status,out.runs.at(-1).secs+'s',out.runs.at(-1).n);
}
const lim=await (await fetch('https://api.apify.com/v2/users/me/limits',{headers:H})).json();out.used=lim.data&&lim.data.current&&lim.data.current.monthlyUsageUsd;
fs.mkdirSync('probe/out',{recursive:true});fs.writeFileSync('probe/out/apify-2.json',JSON.stringify(out,null,1));
