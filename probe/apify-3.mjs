/* 시험 3단계 — 지난 실행들의 최종 비용 내역(크레딧 안 씀) + searchapi 를 최소 상한 0.5달러로 한 번 */
import fs from 'node:fs';
const T=process.env.APIFY_TOKEN;const H={Authorization:'Bearer '+T,'Content-Type':'application/json'};
const out={runs:[]};
const L=await (await fetch('https://api.apify.com/v2/actor-runs?desc=1&limit=10',{headers:H})).json();
for(const r of (L.data&&L.data.items)||[]){const d=(await (await fetch('https://api.apify.com/v2/actor-runs/'+r.id,{headers:H})).json()).data;
  out.runs.push({act:d.actId,status:d.status,secs:d.stats&&d.stats.runTimeSecs,usd:d.usageTotalUsd,usage:d.usageUsd,charged:d.chargedEventCounts});}
const t0=Date.now();
const r=await fetch('https://api.apify.com/v2/acts/searchapi~naver-shopping-scraper/runs?waitForFinish=240&maxTotalChargeUsd=0.5&timeout=180&memory=1024',{method:'POST',headers:H,body:JSON.stringify({query:'석고보드 9.5T',maxItemsPerQuery:10,maxPages:1,sortBy:'relevance'})});
const d=((await r.json())||{}).data||{};let items=[];
if(d.defaultDatasetId)items=await (await fetch(`https://api.apify.com/v2/datasets/${d.defaultDatasetId}/items?clean=1&limit=10`,{headers:H})).json();
await new Promise(s=>setTimeout(s,20000));
const fin=d.id?(await (await fetch('https://api.apify.com/v2/actor-runs/'+d.id,{headers:H})).json()).data:{};
out.sa={status:fin.status,secs:Math.round((Date.now()-t0)/1000),usd:fin.usageTotalUsd,usage:fin.usageUsd,charged:fin.chargedEventCounts,n:items.length,keys:items[0]?Object.keys(items[0]):[],sample:items.slice(0,10).map(x=>({t:(x.title||x.name||'').slice(0,60),p:x.price??x.lowPrice??x.priceKrw,m:x.mallName||x.seller||x.sellerName,u:String(x.url||x.link||x.productUrl||'').slice(0,60)}))};
const lim=await (await fetch('https://api.apify.com/v2/users/me/limits',{headers:H})).json();out.used=lim.data&&lim.data.current&&lim.data.current.monthlyUsageUsd;
fs.writeFileSync('probe/out/apify-3.json',JSON.stringify(out,null,1));
