/* 건설업 시중노임단가(대한건설협회 「건설업 임금실태조사 보고서」) → data/wage.json (앱 물가정보의 「시중노임」 검색용)
   협회 누리집 건설임금 게시판에서 가장 최근 「…적용 건설업 임금실태조사 보고서」 글의 PDF 를 받아 pdftotext(-layout)로 읽는다.
   공표는 해마다 1.1 · 9.1 두 번. 이번 공표에서 조사되지 않은 직종(「-」)은 직전 공표 값을 쓰고 비고에 적는다.
   출력 d 한 줄 = [직종명, 단위, 단가(1일), 공표월 YYYY-MM, 분류 차례, '', '', 비고, 규격(직종번호 · 기준 시간)] — 조달청 파일과 같은 꼴, 9번째가 있으면 앱은 그것을 규격 줄로 쓴다 */
import fs from 'node:fs';import {execFileSync} from 'node:child_process';
const B='https://www.cak.or.kr',LIST=B+'/lay1/bbs/S1T41C42/A/14/list.do',H={'user-agent':'Mozilla/5.0'};
const get=async u=>{for(let t=1;t<=3;t++){try{const r=await fetch(u,{headers:H,signal:AbortSignal.timeout(60000)});if(!r.ok)throw new Error(r.status);return r;}catch(e){console.warn('재시도',t,u,e.message);await new Promise(r=>setTimeout(r,3000*t));}}throw new Error('받기 실패 '+u);};
const pdfPath=process.argv[2];let src='';
if(!pdfPath){
  const list=await (await get(LIST)).text();
  const m=[...list.matchAll(/href="(view\.do\?article_seq=(\d+)[^"]*)"[^>]*>\s*([^<]*적용 건설업 임금실태조사 보고서[^<]*)</g)].sort((a,b)=>b[2]-a[2])[0];
  if(!m)throw new Error('보고서 글을 찾지 못함');
  const view=B+'/lay1/bbs/S1T41C42/A/14/'+m[1].replace(/&amp;/g,'&');src=view;console.log('글',m[3].trim());
  const v=await (await get(view)).text();const f=(v.match(/download\.do\?uuid=([0-9a-f\-]+\.pdf)/i)||[])[1];if(!f)throw new Error('PDF 첨부 없음');
  fs.writeFileSync('/tmp/wage.pdf',Buffer.from(await (await get(B+'/download.do?uuid='+f)).arrayBuffer()));
}
const txt=execFileSync('pdftotext',['-layout',pdfPath||'/tmp/wage.pdf','-'],{encoding:'utf8',maxBuffer:64<<20});
const C=['일반공사','광전자','국가유산','원자력','기타'],cat=no=>Math.max(0,+String(no)[0]-1);
/* 「Ⅲ. 개별직종 노임단가」 표부터 읽는다 — 앞쪽 평균임금 표에도 날짜 줄이 있다 */
const at3=txt.search(/Ⅲ\.\s*개\s*별\s*직\s*종\s*노\s*임[^·\n]*\n(?![^\n]*·{3})/),body=at3<0?'':txt.slice(at3);
const hd=body.match(/(\d{4})\.(\d{1,2})\.1((?:\s+\d{4}\.\d{1,2}\.1){1,3})/);if(!hd)throw new Error('표 머리(공표일)를 읽지 못함');
const cols=hd[0].trim().split(/\s+/).map(x=>{const[y,m]=x.split('.');return y+'.'+m;}),pub=hd[1]+'-'+String(hd[2]).padStart(2,'0');
const rows=new Map();
for(const ln of body.split('\n')){
  const m=ln.match(/^\s*(\*{0,2})(\d{4})\s+(.+?)\s{2,}((?:[\d,]+|-)(?:\s+(?:[\d,]+|-)){0,3})\s*$/);
  if(!m||!/[가-힣]/.test(m[3]))continue;
  const no=m[2];if(rows.has(no))continue;
  const v=m[4].trim().split(/\s+/).map(x=>x==='-'?0:+x.replace(/,/g,''));const i=v.findIndex(x=>x>0);if(i<0)continue;
  const nm=m[3].replace(/\s+/g,'').replace(/\(/g,' (').trim(),note=[i>0?'이번 미조사 · '+(cols[i]||'이전')+' 공표 값':'',m[1]==='*'?'조사 현장 5곳 미만':''].filter(Boolean).join(' · ');
  rows.set(no,[nm,'인',v[i],'',cat(no),'','',note,'직종 '+no+' · 1일 '+(nm==='잠수부'?6:8)+'시간']);}
const d=[...rows.values()].map(r=>(r[3]=pub,r)).sort((a,b)=>a[8].localeCompare(b[8],'ko',{numeric:true}));
if(d.length<100)throw new Error('직종이 너무 적다 '+d.length);
const out={at:new Date().toISOString(),pub,src:LIST,c:C,d};
fs.mkdirSync('data',{recursive:true});
const old=fs.existsSync('data/wage.json')?JSON.parse(fs.readFileSync('data/wage.json','utf8')):null;
if(old&&JSON.stringify(old.d)===JSON.stringify(d)){console.log('바뀐 값 없음');process.exit(0);}
fs.writeFileSync('data/wage.json',JSON.stringify(out));console.log('공표',pub,'직종',d.length,'크기',fs.statSync('data/wage.json').size);
