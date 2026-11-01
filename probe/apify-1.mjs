/* 시험 1단계 — 크레딧 안 씀: 후보 수집기 정보·입력 형식·가격, Apify API 의 CORS 응답 */
import fs from 'node:fs';
const T=process.env.APIFY_TOKEN;if(!T){console.log('::error::APIFY_TOKEN 없음');process.exit(1);}
const H={Authorization:'Bearer '+T};
const IDS=['parsebird~naver-shopping-scraper','automation-lab~naver-shopping-product-scraper','khadinakbar~naver-product-shopping-scraper','searchapi~naver-shopping-scraper'];
const out={at:new Date().toISOString(),actors:{},cors:{},me:null};
const j=async(u,o={})=>{const r=await fetch(u,{...o,headers:{...H,...(o.headers||{})}});const t=await r.text();try{return{s:r.status,b:JSON.parse(t)};}catch(e){return{s:r.status,b:t.slice(0,300)};}};
{const r=await j('https://api.apify.com/v2/users/me');const d=r.b&&r.b.data||{};out.me={s:r.s,plan:d.plan&&d.plan.id,username:d.username?'(있음)':null};}
{const r=await j('https://api.apify.com/v2/users/me/limits');out.limits=r.b&&r.b.data?{max:r.b.data.limits&&r.b.data.limits.maxMonthlyUsageUsd,used:r.b.data.current&&r.b.data.current.monthlyUsageUsd}:r.s;}
for(const id of IDS){
  const a=await j('https://api.apify.com/v2/acts/'+id);const d=a.b&&a.b.data;
  if(!d){out.actors[id]={s:a.s};continue;}
  const bid=d.taggedBuilds&&d.taggedBuilds.latest&&d.taggedBuilds.latest.buildId;
  let schema=null;if(bid){const b=await j('https://api.apify.com/v2/actor-builds/'+bid);const bd=b.b&&b.b.data;let s=bd&&(bd.inputSchema||(bd.actorDefinition&&bd.actorDefinition.input));if(typeof s==='string')try{s=JSON.parse(s);}catch(e){}
    if(s&&s.properties)schema=Object.fromEntries(Object.entries(s.properties).map(([k,v])=>[k,{type:v.type,title:v.title,def:v.default??v.prefill,enum:v.enum,req:(s.required||[]).includes(k)}]));}
  out.actors[id]={title:d.title,modified:d.modifiedAt,stats:d.stats&&{users30:d.stats.totalUsers30Days,runs:d.stats.totalRuns},pricing:d.pricingInfos&&d.pricingInfos.slice(-1),schema};
}
for(const [m,p] of [['OPTIONS','https://api.apify.com/v2/acts/x/run-sync-get-dataset-items'],['GET','https://api.apify.com/v2/users/me']]){
  const r=await fetch(p,{method:m,headers:{Origin:'https://dongyexn.github.io','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});
  out.cors[m]={s:r.status,acao:r.headers.get('access-control-allow-origin'),acah:r.headers.get('access-control-allow-headers'),acam:r.headers.get('access-control-allow-methods')};
}
fs.mkdirSync('probe/out',{recursive:true});fs.writeFileSync('probe/out/apify-1.json',JSON.stringify(out,null,1));console.log('완료');
