/* 건설공사 표준시장단가(국토교통부 공고 · 한국건설기술연구원 공사비원가관리센터) → data/std-price.json (앱 물가정보의 「표준시장단가」 검색용)
   센터 자료실(cost.kict.re.kr)에서 가장 최근 「…표준시장단가 적용공종 및 단가 공고」 글의 공고자료 PDF 를 받아 pdftotext(-layout)로 읽는다.
   공고는 해마다 두 번(연말 상반기분 · 4~5월 하반기 물가보정분). 단가는 별도 언급이 없으면 재료비 · 직접노무비 · 직접공사경비를 합친 값.
   출력 d 한 줄 = [공종명칭, 단위, 단가, 공고월 YYYY-MM, 분류 차례(c), 소분류(■ 줄), '', 비고(노무비율 · 제외 항목), 규격] */
import fs from 'node:fs';import {execFileSync} from 'node:child_process';
const B='https://cost.kict.re.kr';let jar={};
const keep=r=>{for(const c of r.headers.getSetCookie?.()||[]){const[kv]=c.split(';');const i=kv.indexOf('=');jar[kv.slice(0,i)]=kv.slice(i+1);}return r;};
const H=a=>({'user-agent':'Mozilla/5.0',referer:B+'/',accept:a||'application/json, text/plain, */*',cookie:Object.entries(jar).map(([k,v])=>k+'='+v).join('; '),...(jar['XSRF-TOKEN']?{'x-xsrf-token':jar['XSRF-TOKEN']}:{})});
const req=async(u,o={})=>{for(let t=1;t<=3;t++){try{const r=keep(await fetch(B+u,{...o,headers:{...H(o.accept),...(o.headers||{})},signal:AbortSignal.timeout(120000)}));if(!r.ok)throw new Error(r.status);return r;}catch(e){console.warn('재시도',t,u,e.message);await new Promise(r=>setTimeout(r,3000*t));}}throw new Error('받기 실패 '+u);};
const pdfPath=process.argv[2];let pub=process.argv[3]||'',title='';
if(!pdfPath){
  await req('/');await req('/getCsrfToken');
  const L=await (await req('/archive/list',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sortData:'price'})})).json();
  const a=L.filter(x=>/표준시장단가 적용공종 및 단가/.test(x.board_title||'')&&/\.pdf/.test(x.fileName||'')).sort((x,y)=>String(y.reg_dt).localeCompare(String(x.reg_dt)))[0];
  if(!a)throw new Error('공고 글을 찾지 못함');title=a.board_title;pub=String(a.reg_dt).slice(0,7);console.log('글',title,pub);
  const names=String(a.fileName).split(/,(?=[^,]*\.(?:pdf|hwp|hwpx|xlsx?|zip))/i);   /* 파일 순서 = fileSeq 1부터 */
  const seq=names.findIndex(n=>/공고자료/.test(n)&&/단가\.pdf$/i.test(n.trim()))+1||names.findIndex(n=>/\.pdf$/i.test(n)&&!/공고문|부록|신구|정오/.test(n))+1;
  if(!seq)throw new Error('공고자료 PDF 없음 '+a.fileName);
  fs.writeFileSync('/tmp/std.pdf',Buffer.from(await (await req('/file/download?fileId='+a.file_id+'&fileSeq='+seq,{accept:'*/*'})).arrayBuffer()));
}
const txt=execFileSync('pdftotext',['-layout',pdfPath||'/tmp/std.pdf','-'],{encoding:'utf8',maxBuffer:256<<20});
const C=['토목','건축','기계설비','BIM 구조물'];
const lines=txt.replace(/\f/g,'').split('\n'),CODE=/^(\s*)([A-Z]{2,3}\d{3}\.\d{5})(.*?)\s+(\S+)\s+([\d,]+)\s+(\d+)%\s*$/;
let ch=-1,sec='',hd=null,body=false;const out=[];
const isCode=l=>CODE.test(l),skip=l=>!l.trim()||/^\s*(■|【|공종코드|<|대분류|\-\s|①|②|③|④|⑤|⑥|※)/.test(l)||isCode(l)||/^\s*<.*-\s*\d+\s*>\s*$/.test(l);
/* 한 줄의 덩어리(두 칸 넘게 띈)를 머리 줄 「규격」 경계(cut)로 공종명칭 · 규격에 나눈다. 경계를 걸친 덩어리는 경계에 가장 가까운 빈칸에서 자른다 */
const split=(l,cut)=>{const nm=[],sp=[];for(const m of l.matchAll(/\S+(?: \S+)*/g)){const a=m.index,b=a+m[0].length;
  if(b<=cut+1)nm.push(m[0]);else if(a>=cut-1)sp.push(m[0]);
  else{let best=-1;for(let k=0;k<m[0].length;k++)if(m[0][k]===' '&&(best<0||Math.abs(a+k-cut)<Math.abs(a+best-cut)))best=k;
    if(best<0)(a+m[0].length/2<cut?nm:sp).push(m[0]);else{nm.push(m[0].slice(0,best));sp.push(m[0].slice(best+1));}}}
  return[nm.join(' '),sp.join(' ')];};
/* 공종 하나는 코드 줄 위아래 몇 줄에 걸쳐 쓰인다(위: 앞 조각, 아래: 뒷 조각). 두 코드 줄 사이 줄들은 앞 절반을 위 코드의 아래 조각, 뒤 절반을 아래 코드의 위 조각으로 */
const owner=new Map();{let prev=-1,run=[];
  const flush=next=>{const g=run.length;if(!g)return;const k=prev<0?0:next<0?g:Math.floor(g/2);run.forEach((ln,x)=>owner.set(ln,x<k?[prev,'dn']:[next,'up']));run=[];};
  for(let i=0;i<lines.length;i++){const l=lines[i];if(isCode(l)){flush(i);prev=i;continue;}if(skip(l)){flush(-1);prev=-1;continue;}run.push(i);}flush(-1);}
const frag=new Map();for(const[ln,[c,w]]of owner){if(c<0)continue;if(!frag.has(c))frag.set(c,{up:[],dn:[]});frag.get(c)[w].push(ln);}
for(let i=0;i<lines.length;i++){const l=lines[i];
  const c=l.match(/^제([2-5])장\s/);if(c&&!/·{3}/.test(l)){ch=+c[1]-2;body=true;continue;}
  if(/^제[16]장/.test(l))body=false;
  if(!body||ch<0)continue;
  const s=l.match(/^\s*■\s*(?:[A-Z0-9*]+,?\s+)+(.+?)\s*$/);if(s){sec=s[1].replace(/\s+/g,' ');continue;}
  if(/공종코드/.test(l)){const a=l.indexOf('공종명칭'),b=l.indexOf('규격');hd={cut:b>0&&a>=0?(a+4+b)/2:40};continue;}
  const m=l.match(CODE);if(!m)continue;
  const cut=hd?hd.cut:40,nm=[],sp=[],f=frag.get(i)||{up:[],dn:[]};
  const add=t=>{const[a,b]=split(t,cut);if(a)nm.push(a);if(b)sp.push(b);};
  f.up.forEach(x=>add(lines[x]));add(' '.repeat(m[1].length+m[2].length)+m[3]);f.dn.forEach(x=>add(lines[x]));
  let name=nm.join(' ').replace(/\s+/g,' ').replace(/\s+([)\]])/g,'$1').replace(/([(\[])\s+/g,'$1').trim(),spec=sp.join(' ').replace(/\s+/g,' ').replace(/[,/]\s*$/,'').trim();
  name=name.replace(/\s*\/\s*$/,'');let unit=m[4];
  if(/^m$/.test(unit)&&/^[23]\s/.test(spec)){unit+=spec[0];spec=spec.slice(2).trim();}   /* m³ · m² 의 어깨 숫자가 다음 줄로 떨어진 경우 */
  if(!name)name=sec.split(' / ')[0];
  const ex=sec.includes(' / ')?sec.split(' / ').slice(1).join(' · '):'';
  out.push([name,unit,+m[5].replace(/,/g,''),'',ch,sec.split(' / ')[0],'',['노무비율 '+m[6]+'%',ex].filter(Boolean).join(' · '),[spec,m[2]].filter(Boolean).join(' · ')]);
}
if(!pub){const y=txt.match(/(\d{4})\.\s*(\d{1,2})\./);pub=y?y[1]+'-'+String(y[2]).padStart(2,'0'):'';}
const h=(txt.match(/(\d{4})년\s*(상|하)반기/)||[]);
const d=out.map(r=>(r[3]=pub,r));
if(d.length<1000)throw new Error('공종이 너무 적다 '+d.length);
const res={at:new Date().toISOString(),pub,ttl:h[0]||title,src:B+'/#/notice/file/price',c:C,d};
fs.mkdirSync('data',{recursive:true});
const old=fs.existsSync('data/std-price.json')?JSON.parse(fs.readFileSync('data/std-price.json','utf8')):null;
if(old&&JSON.stringify(old.d)===JSON.stringify(d)){console.log('바뀐 값 없음');process.exit(0);}
fs.writeFileSync('data/std-price.json',JSON.stringify(res));console.log(res.ttl,'공고',pub,'공종',d.length,'크기',fs.statSync('data/std-price.json').size);
