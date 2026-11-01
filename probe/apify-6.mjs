/* 시험 6단계 — 앱과 같은 요청 한 번(run-sync-get-dataset-items · 10건) : 쇼핑 건수 · 시간 · 비용 */
import fs from 'node:fs';
const T=process.env.APIFY_TOKEN;const t0=Date.now();
const r=await fetch('https://api.apify.com/v2/acts/johnvc~naver-search-api/run-sync-get-dataset-items?timeout=90&maxTotalChargeUsd=0.5',{method:'POST',headers:{Authorization:'Bearer '+T,'Content-Type':'application/json',Origin:'https://dongyexn.github.io'},body:JSON.stringify({query:'석고보드 9.5t',where:'nexearch',maxResultsPerQuery:10})});
const j=await r.json().catch(()=>null);const secs=Math.round((Date.now()-t0)/1000);
await new Promise(s=>setTimeout(s,15000));
const L=await (await fetch('https://api.apify.com/v2/actor-runs?desc=1&limit=1',{headers:{Authorization:'Bearer '+T}})).json();const last=L.data.items[0];
const lim=await (await fetch('https://api.apify.com/v2/users/me/limits',{headers:{Authorization:'Bearer '+T}})).json();
fs.writeFileSync('probe/out/apify-6.json',JSON.stringify({http:r.status,acao:r.headers.get('access-control-allow-origin'),secs,n:Array.isArray(j)?j.length:j,types:Array.isArray(j)?j.map(x=>x.result_type+':'+x.position):null,shop:Array.isArray(j)?j.filter(x=>x.result_type==='shopping').map(x=>[x.title,x.price,x.stores]):null,usd:last.usageTotalUsd,used:lim.data.current.monthlyUsageUsd},null,1));
