/* 시험 4단계 — 크레딧 안 씀: searchapi 실패 실행의 로그 끝부분 + 어떤 수집기가 돌았는지(actId → 이름) */
import fs from 'node:fs';
const T=process.env.APIFY_TOKEN;const H={Authorization:'Bearer '+T};
const L=await (await fetch('https://api.apify.com/v2/actor-runs?desc=1&limit=12',{headers:H})).json();
const out={runs:[]};const names={};
for(const r of (L.data&&L.data.items)||[]){
  if(!names[r.actId]){const a=(await (await fetch('https://api.apify.com/v2/acts/'+r.actId,{headers:H})).json()).data||{};names[r.actId]=(a.username||'?')+'/'+(a.name||'?');}
  const o={act:names[r.actId],status:r.status,started:r.startedAt,usd:r.usageTotalUsd};
  if(r.status==='FAILED'){const lg=await (await fetch('https://api.apify.com/v2/actor-runs/'+r.id+'/log',{headers:H})).text();o.log=lg.split('\n').filter(l=>/error|fail|block|captcha|429|403|418|timeout|warn/i.test(l)).slice(-12).map(l=>l.slice(0,220));}
  out.runs.push(o);}
fs.writeFileSync('probe/out/apify-4.json',JSON.stringify(out,null,1));
