/* 사용 안내 그림 만들기 — 앱을 ?local=1 로 띄워 가짜 자료(현장명1·업무명1·담당자1 …)를 넣고, 화면을 찍어
   docs/guide/*.webp 와 docs/guide/guide.json(장 → 데스크톱 d / 폰 m → 단계[제목·그림·번호 칸])을 만든다.
   번호 칸 자리는 실제 요소 위치를 재서 % 로 적는다 — 화면이 바뀌면 이 스크립트만 다시 돌리면 된다.
   날짜는 고정(GUIDE_NOW)이라 몇 번을 돌려도 같은 그림이 나온다.
   사용: CHROMIUM=/path/to/chrome node scripts/guide-shots.mjs   (PROBE=1 이면 화면 전체 캡처만 /tmp 에) */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(root,'docs','guide');
const PROBE=process.env.PROBE?path.join(os.tmpdir(),'guide-probe'):'';
const GUIDE_NOW='2026-10-14T10:00:00+09:00';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.md':'text/markdown','.woff2':'font/woff2','.webmanifest':'application/json'};
const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);const f=path.join(root,u==='/'?'index.html':u);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
  r.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});r.end(fs.readFileSync(f));}).listen(0);
const PORT=srv.address().port,URL0='http://localhost:'+PORT+'/index.html?local=1';
const exe=process.env.CHROMIUM||'';
const br=await chromium.launch(Object.assign({args:['--no-sandbox']},exe?{executablePath:exe}:{}));
const W=ms=>new Promise(r=>setTimeout(r,ms));
if(PROBE)fs.mkdirSync(PROBE,{recursive:true});

/* ── 가짜 자료 — 이름은 드라이하게(현장명N · 업무명N · 담당자N · 권역N · 업체N) ── */
function seedBase(){
  S.org=S.org||{};S.org.teams=[{id:'t1',name:'팀명'}];
  S.org.regions=[1,2,3].map(i=>({id:'권역'+i,name:'권역'+i,team:'t1'}));
  const comp=['2026-08-20','2026-08-28','2026-09-05','2026-09-18','2025-06-30','2025-03-31','2024-11-30','2025-12-31','2026-07-31'];
  S.org.sites=Array.from({length:9},(_,i)=>({id:'s'+(i+1),name:'현장명'+(i+1),region:'권역'+(i%3+1),team:'t1',units:700+i*80,buildings:7+i%6,completionDate:comp[i]}));
  S.accounts=Object.assign(S.accounts||{},{u1:{name:'담당자1',avColor:'#3E71D2'},u2:{name:'담당자2',avColor:'#DD3B30'},u3:{name:'담당자3',avColor:'#2E9E5B'}});
  S.people={u1:{name:'담당자1',email:'',team:'t1',region:'권역1',sites:{s1:1,s4:1,s7:1}},u2:{name:'담당자2',email:'',team:'t1',region:'권역2',sites:{s2:1,s5:1,s8:1}},u3:{name:'담당자3',email:'',team:'t1',region:'권역3',sites:{s3:1,s6:1,s9:1}}};
  if(typeof LocalStore!=='undefined'&&LocalStore._d)LocalStore._d.people=S.people;
  const t=todayStr();S.tasks={u1:{},u2:{},u3:{}};
  const D=[[1,'s1',1,'u1'],[1,'s2',2,'u2'],[2,'s3',1,'u3'],[2,'s4',1,'u1'],[2,'s5',2,'u2'],[3,'s6',1,'u3'],[3,'s7',2,'u1'],[-1,'s2',2,'u2'],[-2,'s7',2,'u1'],[-6,'s8',2,'u2'],[6,'s9',1,'u3'],[8,'s3',1,'u3']];
  D.forEach(([o,s,st,u],k)=>{S.tasks[u]['k'+k]={text:'업무명'+(k+1),date:addDays(t,o),end:'',site:s,assignees:{[u]:1},st,createdAt:1000+k,updatedAt:1000+k};});
  if(typeof normOrg==='function')normOrg(S.org);
  if(typeof calRerender==='function')calRerender();if(typeof rWidget==='function')rWidget();
}
async function open(pg,q=''){
  await pg.clock.install({time:new Date(GUIDE_NOW)});await pg.clock.resume();   /* 날짜만 고정하고 시간은 흐르게(움직임·타이머 정상) */
  await pg.route('https://images.unsplash.com/**',r=>r.fulfill({status:200,contentType:'image/jpeg',body:fs.readFileSync(path.join(root,'login-bg.jpg'))}));
  await pg.goto(URL0+q);await W(1500);await pg.evaluate(seedBase);
  await pg.addStyleTag({content:'#toast{display:none!important}'});await W(500);
}
const G={};
/* 한 장 찍기 — crop:[x,y,w,h](css px) · spots:[{sel|pt(+cl), all?, t}] → 잘라낸 그림 기준 % */
const boxOf=(pg,s)=>pg.evaluate(({sel,pt,cl,all})=>{let es;
      if(pt){let e=document.elementFromPoint(pt[0],pt[1]);e=e&&(e.closest(cl||'[data-act]')||e);es=e?[e]:[];}
      else{es=[...document.querySelectorAll(sel)].filter(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0;});if(!all)es=es.slice(0,1);}
      if(!es.length)return null;const rs=es.map(e=>e.getBoundingClientRect());
      const x=Math.min(...rs.map(r=>r.left)),y=Math.min(...rs.map(r=>r.top)),X=Math.max(...rs.map(r=>r.right)),Y=Math.max(...rs.map(r=>r.bottom));return [x,y,X-x,Y-y];},s);
/* crop 이 {boxes:[칸 지정…],pad,maxH} 면 그 칸들을 감싸는 상자로 자른다(화면 밖은 잘라 냄) */
async function cropOf(pg,c){
  if(Array.isArray(c))return c;
  let x=1e9,y=1e9,X=-1e9,Y=-1e9;for(const b0 of c.boxes){const b=await boxOf(pg,b0);if(!b){console.log('  ✗ 자를 칸 없음',b0.sel||b0.pt);continue;}x=Math.min(x,b[0]);y=Math.min(y,b[1]);X=Math.max(X,b[0]+b[2]);Y=Math.max(Y,b[1]+b[3]);}
  const [pt,pr,pb,pl]=[].concat(c.pad??12).length===4?c.pad:[c.pad??12,c.pad??12,c.pad??12,c.pad??12];
  const vp=pg.viewportSize();x=Math.max(0,x-pl);y=Math.max(0,y-pt);X=Math.min(vp.width,X+pr);Y=Math.min(vp.height,Y+pb);if(c.maxH)Y=Math.min(Y,y+c.maxH);
  return [Math.round(x),Math.round(y),Math.round(X-x),Math.round(Y-y)];
}
async function shot(pg,key,crop0,spots){
  if(PROBE){await pg.screenshot({path:path.join(PROBE,key+'.png')});return;}
  const crop=await cropOf(pg,crop0);
  const res=[];
  for(const s of spots){
    const b=await boxOf(pg,s);
    if(!b){console.log('  ✗ 없음',key,s.sel||s.pt);continue;}
    const [x,y,w,h]=b,[cx,cy,cw,ch]=crop,pc=(v,t)=>Math.round(v/t*1000)/10;
    const mx=x+w/2-cx,my=y+h/2-cy;if(mx<0||my<0||mx>cw||my>ch){console.log('  ✗ 그림 밖',key,s.sel||s.pt);continue;}   /* 잘라낸 그림 밖의 칸은 넣지 않는다 */
    res.push({x:pc(x-cx,cw),y:pc(y-cy,ch),w:pc(w,cw),h:pc(h,ch),t:s.t});
  }
  const png=await pg.screenshot({clip:{x:crop[0],y:crop[1],width:crop[2],height:crop[3]},type:'png'});
  /* webp 는 브라우저 캔버스로 굽는다(추가 의존성 없음) */
  const b64=await pg.evaluate(async d=>{const im=new Image();im.src='data:image/png;base64,'+d;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);return c.toDataURL('image/webp',.82).split(',')[1];},png.toString('base64'));
  fs.writeFileSync(path.join(OUT,key+'.webp'),Buffer.from(b64,'base64'));
  G[key]={img:key+'.webp',w:crop[2],h:crop[3],spots:res};console.log('  ✓',key,res.length+'칸');
}
const DESK={viewport:{width:1280,height:800},deviceScaleFactor:2};
const PHONE={viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true};
fs.mkdirSync(OUT,{recursive:true});

/* 하자 — 가짜 HCS 를 실제 업로드 경로로 올리고, 페이지 안 가짜 Firebase 에 [등록]해 게시본으로 그린다(e2e-defect 와 같은 방식) */
async function seedDefect(pg){
  await pg.evaluate(async()=>{
    const TODAY=new Date();const pad=n=>String(n).padStart(2,'0');const ds=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    let seed=20261014;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const TR=['도배','타일','마루','창호','가구','도장','전기','설비','미장','방수','수장','금속'];
    const CO=['업체1','업체2','업체3','업체4','업체5','업체6'];
    const SP=['거실','안방','주방','욕실1','욕실2','발코니','현관','침실2'];
    const CT=['벽지 들뜸','타일 줄눈 균열','마루 찍힘','창호 잠금장치 불량','문짝 처짐','도장면 얼룩','콘센트 커버 파손','배수 불량','실리콘 오염','걸레받이 들뜸',
      '누수 흔적 확인 요청','보상 요구 — 재시공 및 피해 보상','재방문 요청 — 지난번에도 같은 하자'];
    const rows=[];let no=1;
    const push=(site,rd,done)=>{const rdD=new Date(rd);let comp='',delay=0;
      if(done){const t=new Date(rd);t.setDate(t.getDate()+Math.floor(rnd()*rnd()*160));if(t>TODAY)t.setTime(TODAY.getTime());comp=ds(t);}else delay=Math.max(0,Math.round((TODAY-rdD)/86400000));
      const vac=rnd()<0.08;
      rows.push({NO:no++,현장:site.name,현장코드:'C'+site.id,동:String(101+Math.floor(rnd()*site.buildings))+'동',호:String((1+Math.floor(rnd()*20))*100+1+Math.floor(rnd()*4)),
        공종:TR[Math.floor(rnd()*TR.length)],하자유형:['들뜸','균열','오염','파손','작동불량','소음'][Math.floor(rnd()*6)],중대하자유형:'',하자구분:'세대',
        접수일:rd,처리확인일:comp,처리상태:done?'처리완료':'미처리',지연일:delay,보수주체:rnd()<0.5?'시공업체':'직영',시공업체:CO[Math.floor(rnd()*CO.length)],보수업체:'',
        입주상태:vac?'미입주':'입주완료',세대구분:'세대',입점여부:'Y',공간:SP[Math.floor(rnd()*SP.length)],접수내용:CT[Math.floor(rnd()*CT.length)],민원:''});};
    for(const site of S.org.sites){const n=300+Math.floor(rnd()*700);
      for(let i=0;i<n;i++){const back=Math.floor(Math.pow(rnd(),1.6)*690);const d=new Date(TODAY);d.setDate(d.getDate()-back);push(site,ds(d),rnd()<(back>60?0.86:0.35));}}
    const HS=Object.keys(rows[0]);const cell=v=>{const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
    const csv=HS.join(',')+'\n'+rows.map(r=>HS.map(h=>cell(r[h])).join(',')).join('\n');
    window.confirm=()=>true;window.confirmAsk=async()=>true;
    onFile(new File([new Blob(['﻿'+csv],{type:'text/csv'})],'전체하자목록.csv',{type:'text/csv'}));
    await new Promise(r=>{const t=setInterval(()=>{if(Object.keys(S.def).length>=S.org.sites.length&&!S._importing){clearInterval(t);r();}},200);setTimeout(()=>{clearInterval(t);r();},30000);});
    const tree={};const get=p=>{let n=tree;for(const k of p.split('/').filter(Boolean)){if(n==null||typeof n!=='object')return null;n=n[k];}return n==null?null:n;};
    const set=(p,v)=>{const ks=p.split('/').filter(Boolean);let n=tree;for(let i=0;i<ks.length-1;i++)n=n[ks[i]]=n[ks[i]]||{};if(v==null)delete n[ks[ks.length-1]];else n[ks[ks.length-1]]=JSON.parse(JSON.stringify(v));};
    FB.db={ref:(p='')=>({once:async()=>({val:()=>get(p)}),get:async()=>({val:()=>get(p),exists:()=>get(p)!=null}),set:async v=>set(p,v),update:async u=>{Object.keys(u).forEach(k=>set((p?p+'/':'')+k,u[k]));},on:()=>{},off:()=>{}})};
    S.live=true;S.role='editor';S.user={email:'editor@hdec.co.kr'};
    const p=dfPublish();for(let i=0;i<60&&!document.querySelector('[data-act="dfp.pubOk"]');i++)await new Promise(r=>setTimeout(r,100));
    const b=document.querySelector('[data-act="dfp.pubOk"]');if(b)b.click();await p;
    ORG_RM=dfPubRm();S.dfSid='';
  });
  await W(800);
}

/* D+60 — 서식(공간·점검항목) 몇 개와 세대 하나 */
function seedD60(){
  const it=(a)=>Object.fromEntries(a.map(([gj,q,act],i)=>['i'+i,{gj,q,act,ord:i+1}]));
  S.d60d=S.d60d||{};
  S.d60d.forms={arch:{
    unit:{p1:{name:'공간명1',ord:1,items:it([['공종1','점검항목1','조치사항1'],['공종1','점검항목2','조치사항2'],['공종2','점검항목3','조치사항3'],['공종2','점검항목4','조치사항4']])},
          p2:{name:'공간명2',ord:2,items:it([['공종1','점검항목5','조치사항5'],['공종3','점검항목6','조치사항6']])}},
    common:{p3:{name:'공간명3',ord:1,items:it([['공종4','점검항목7','조치사항7'],['공종4','점검항목8','조치사항8']])}}}};
  S.d60d.insp={s1:{units:{u1:{dg:'101',ho:'1001',ord:1}}}};
  if(typeof LocalStore!=='undefined'&&LocalStore._d){LocalStore._d.d60=S.d60d;}
}
const WIDE={...DESK,viewport:{width:1440,height:860}};   /* 사이드바가 펼쳐지는 폭 */
const tdOf=d=>'#fcal td.fc-daygrid-day[data-date="'+d+'"]';
const D16='2026-10-16';

/* ── 데스크톱 ── */
{const pg=await br.newPage(WIDE);await open(pg);
  /* 캘린더 */
  const bb=await pg.locator(tdOf(D16)).boundingBox();await pg.mouse.click(bb.x+bb.width/2,bb.y+bb.height-12);await W(800);
  await shot(pg,'d-cal-1',{boxes:[{sel:tdOf(D16)},{sel:'.dp-col [data-act="plan.new"]'},{sel:'.dp-col .plan',all:1}],pad:[14,16,14,16]},[
    {sel:tdOf(D16),t:'날짜를 누르면 오른쪽에 그날 업무가 나옵니다. 여러 날은 끌어서 고릅니다'},
    {sel:'.dp-col [data-act="plan.new"]',t:'새 업무 추가'},
    {sel:'.dp-col .plan',t:'업무를 누르면 그 자리에서 고칩니다. 우클릭하면 완료 · 복사 · 삭제'},
    {sel:'.dp-col [data-act="plan.stCycle"]',t:'누르면 완료 · 다시 누르면 해제'},
    {sel:'[data-act="day.fmore"]',t:'담당자 · 현장 · 구분으로 걸러 보기'}]);
  await pg.click('.dp-col [data-act="plan.body"]');await W(800);
  await shot(pg,'d-cal-2',{boxes:[{sel:'#dpEdit'},{sel:'.dp-col [data-act="plan.new"]'}],pad:14},[
    {sel:'#dpEdit .c-date',t:'날짜 · 기간'},
    {sel:'#dpEdit .c-own',t:'담당자 — 비우면 공통 업무'},
    {sel:'#dpEdit .c-site',t:'현장 — 권역별로 묶여 있고 찾기도 됩니다'},
    {sel:'#dpEdit .c-sm',all:1,t:'구분 · 시간 · 반복 · 링크'},
    {sel:'#dpEdit [data-act="plan.del"]',t:'삭제 — 휴지통에 30일 보관'},
    {sel:'#dpEdit [data-act="plan.cancel"]',t:'닫기 — 저장 단추 없이 적는 대로 저장됩니다'}]);
  await pg.click('#dpEdit [data-act="plan.cancel"]').catch(()=>{});await W(600);
  /* 업무 현황 */
  await pg.evaluate(()=>go('tasks'));await W(1200);
  await shot(pg,'d-tk-1',{boxes:[{sel:'#view-tasks [data-act="tk.view"]',all:1},{sel:'[data-act="tk.newOpen"]'},{sel:'[data-act="tkf.toggle"]'},{sel:'[data-act="tk.st"]',all:1}],pad:[12,16,16,16]},[
    {sel:'#view-tasks [data-act="tk.view"]',all:1,t:'주간 업무 ↔ 현장별 업무'},
    {sel:'.mc-lbl[data-act="mine.mon"]',t:'보고 주기는 목요일 ~ 수요일. 달력에서 주를 고릅니다'},
    {sel:'[data-act="tk.pick"]',t:'보류한 업무 — 날짜를 정하면 되살아납니다'},
    {sel:'[data-act="tk.qopen"],[data-act="tkf.toggle"]',all:1,t:'찾기 · 걸러 보기'},
    {sel:'[data-act="tk.tab"]',all:1,t:'권역별로 보기'},
    {sel:'[data-act="tk.newOpen"]',t:'업무 추가'},
    {sel:'.tk-ttl[data-act="tk.open"]',t:'줄을 누르면 그 자리에서 고칩니다'},
    {sel:'[data-act="tk.st"]',t:'누르면 완료 · 다시 누르면 해제'}]);
  /* 업무 도구 — D+60 */
  await pg.evaluate(seedD60);await pg.evaluate(()=>go('d60'));await W(1200);
  await shot(pg,'d-d60-1',{boxes:[{sel:'[data-act="d60.tab"]',all:1},{sel:'[data-act="d60.m"]',all:1},{sel:'[data-act="pd.xlsx"]'},{sel:'tr[data-act="d60.open"]',all:1}],pad:[10,16,14,16]},[
    {sel:'[data-act="d60.tab"]',all:1,t:'점검 ↔ 서식(공간 · 점검항목 고치기, 데스크톱만)'},
    {sel:'[data-act="d60.m"]',all:1,t:'달을 누르면 그 달 점검만'},
    {sel:'[data-act="d60.reg"]',all:1,t:'권역별로 보기'},
    {sel:'.d60-mss',t:'예정 · 진행 중 · 완료'},
    {sel:'tr[data-act="d60.open"][data-sid="s1"]',t:'현장을 누르면 점검표'},
    {sel:'[data-act="pd.xlsx"],[data-act="sb.print"]',all:1,t:'엑셀 · 인쇄'}]);
  await pg.click('tr[data-act="d60.open"][data-sid="s1"]');await W(1400);
  await shot(pg,'d-d60-2',[250,0,1190,600],[
    {sel:'[data-act="d60.un"]',t:'세대 — 「+ 세대」로 더하고 동 · 호를 적습니다'},
    {sel:'[data-act="d60.sp"]',all:1,t:'공간을 고르면 그 공간 항목만'},
    {sel:'[data-act="d60.tr"]',all:1,t:'공종 — 건축 · 설비 · 전기 · 조경'},
    {sel:'[data-act="d60.ansCell"]',t:'결과 칸을 눌러 양호 · 지적 · N/A'},
    {sel:'[data-act="d60.allOk"]',t:'남은 항목 한 번에 양호'},
    {sel:'[data-act="d60.toPd"]',t:'찍은 사진으로 사진대지'},
    {sel:'[data-act="d60.fin"]',t:'다 봤으면 점검 완료(미확인이 남아도 됩니다)'}]);
  /* 업무 도구 — 사진대지 · 견적 검토 */
  await pg.evaluate(()=>go('photo'));await W(1200);
  await shot(pg,'d-pd-1',{boxes:[{sel:'#view-photo'}],pad:0,maxH:560},[
    {sel:'[data-act="pd.orient"],[data-act="pd.per"]',all:1,t:'세로 · 가로 · 한 장에 2 · 4 · 6칸'},
    {sel:'[data-act="pd.files"],[data-act="pd.dir"]',all:1,t:'사진 · 폴더 넣기 — 화면에 끌어다 놓아도 됩니다'},
    {sel:'[data-act="pd.zoom"]',all:1,t:'미리보기 크기'},
    {sel:'[data-act="pd.undo"],[data-act="pd.redo"]',all:1,t:'되돌리기 (Ctrl+Z)'}]);
  await pg.evaluate(()=>go('qc'));await W(1000);
  await pg.fill('#view-qc textarea','1.2*2.4\n3.0*2.5=7.5\n(1.2+0.8)*2=4.1\n2.4*2.4');await pg.click('[data-act="qc.run"]');await W(1200);
  await shot(pg,'d-qc-1',{boxes:[{sel:'#view-qc'}],pad:0},[
    {sel:'#view-qc textarea',t:'업체 산출서의 산출 근거 열을 붙여 넣기'},
    {sel:'[data-act="qc.run"]',t:'검토 — 줄마다 계산식을 검산'},
    {sel:'[data-act="qc.rnd"],[data-act="qc.tol"]',all:1,t:'반올림 · 허용 오차'},
    {sel:'[data-act="qc.filter"]',all:1,t:'정답 · 오답 · 제외로 나눠 보기'}]);
  /* 설정 */
  await pg.addStyleTag({content:'#bgPvCr{visibility:hidden!important}'});
  await pg.evaluate(()=>go('settings'));await W(1500);
  await shot(pg,'d-set-1',{boxes:[{sel:'#bgCard'},{sel:'[data-act="wid.dl"]'}],pad:[10,16,14,16]},[
    {sel:'.bgp-auto',t:'자동 변경 — 켜 두면 매시간 바뀝니다'},
    {sel:'[data-act="bg.pick"]',all:1,t:'끄고 사진을 고르면 그 사진으로 고정'},
    {sel:'[data-act="wid.dl"]',t:'바탕화면 위젯 받기'}]);
  /* 하자처리 현황 */
  await pg.evaluate(()=>go('calendar'));await seedDefect(pg);await pg.evaluate(()=>go('defect'));await W(2500);
  await shot(pg,'d-df-1',[0,0,1440,600],[
    {sel:'[data-act="df.fold"]',all:1,t:'권역을 펼쳐 현장을 고르면 현장 화면'},
    {sel:'[data-act="df.rm"]',t:'기준월 — 숫자는 모두 기준월 말일 기준'},
    {sel:'.kc',all:1,t:'팀 합계 — 「목록」을 누르면 그 하자 목록'},
    {sel:'[data-act="mtg.open"]',t:'회의 모드 — 월간 회의용 화면'},
    {sel:'[data-act="sb.print"]',t:'인쇄'},
    {sel:'input.ah-srch-in',t:'업무 · 현장 · 하자 찾기 (Ctrl+K) — 어느 화면에서나'}]);
  await pg.evaluate(()=>{S.dfSid='s5';S.dfTab='lt';rDefect();});await W(1500);
  await shot(pg,'d-df-2',[250,60,1190,640],[
    {sel:'.kc',t:'현장 — 권역 · 세대 · 준공일'},
    {sel:'[data-act="df.tab"]',all:1,t:'종합 · 장기미처리 · 공가세대 · 민원 현황 · 상세 현황'},
    {sel:'.rp-plan textarea,.lt-plan textarea,#view-defect textarea',t:'처리계획 — 여기 적으면 팀 전체에 반영'}]);
  await pg.evaluate(()=>{S.dfSid='';go('defect');});await W(800);await pg.evaluate(()=>mtgOpen());await W(2000);
  await pg.keyboard.press('ArrowRight');await W(1500);
  await shot(pg,'d-df-3',[0,0,1440,600],[
    {sel:'#mm .mm-tab',all:1,t:'장 고르기 — ← → 키로도 넘깁니다'},
    {sel:'#mm [data-act="mtg.rm"]',t:'기준월'},
    {sel:'#mm [data-act="mtg.fs"]',t:'전체화면'},
    {sel:'#mm [data-act="mtg.close"]',t:'나가기'}]);
  await pg.keyboard.press('ArrowRight');await W(800);await pg.keyboard.press('ArrowRight');await W(1500);
  await shot(pg,'d-df-4',[0,0,1440,760],[
    {sel:'#mm [data-act="mtg.who"]',all:1,t:'담당자를 고르면 그 사람 현장만'},
    {sel:'#mm .sg.deck>.sc[data-k="0"]',t:'현장 카드 — ↑ ↓ 나 휠로 다음 현장'},
    {sel:'#mm .sg.deck>.sc[data-k="0"] [data-act="mtg.agg"]',all:1,t:'공종별 ↔ 업체별'}]);
  await pg.close();}

/* ── 폰 ── */
{const pg=await br.newPage(PHONE);await open(pg);
  await pg.evaluate(()=>{go('tasks');go('calendar');});await W(1200);
  const d15=[251,440];
  await shot(pg,'m-cal-1',[0,0,390,500],[
    {sel:'.tbt-ym',t:'눌러서 년 · 달 바꾸기. 달력을 옆으로 밀어도 됩니다'},
    {pt:[322,24],t:'담당자 · 현장 · 구분으로 걸러 보기'},
    {pt:[362,24],t:'업무 · 현장 찾기'},
    {pt:d15,cl:'.mc-d',t:'날짜를 누르면 그날 업무가 아래에서 올라옵니다'}]);
  await shot(pg,'m-cal-3',[0,768,390,76],[
    {sel:'#mtab .mtab-m',t:'메뉴 — 모든 화면 · 설정'},
    {sel:'#mtab [data-act="mtab.go"]',all:1,t:'캘린더 · 업무 현황 · 업무 도구 · 하자처리 현황'}]);
  await pg.mouse.click(...d15);await W(1200);
  await shot(pg,'m-cal-2',[0,200,390,640],[
    {sel:'.dp-col [data-act="plan.new"]',t:'새 업무 추가'},
    {sel:'.dp-col .plan',t:'눌러서 그 자리에서 고치기'},
    {sel:'.dp-col [data-act="plan.stCycle"]',t:'누르면 완료'},
    {pt:[195,380],cl:'.dp-col',t:'옆으로 밀면 다음 날 · 아래로 내리면 닫힘'}]);
  await pg.evaluate(()=>{if(typeof mdsClose==='function')mdsClose();go('tasks');});await W(1200);
  await shot(pg,'m-tk-1',[0,0,390,640],[
    {sel:'[data-act="tk.ym"]',t:'주 바꾸기 · 옆으로 밀어도 됩니다'},
    {sel:'[data-act="tk.pick"]',t:'보류한 업무'},
    {sel:'[data-act="tk.view"]',all:1,t:'주간 업무 ↔ 현장별 업무'},
    {sel:'[data-act="tk.newOpen"]',t:'업무 추가'},
    {sel:'.tk-ttl[data-act="tk.open"]',t:'줄을 누르면 그 자리에서 고칩니다'},
    {sel:'[data-act="tk.st"]',t:'완료 표시'}]);
  await pg.evaluate(seedD60);await pg.evaluate(()=>go('d60'));await W(1000);
  await pg.click('[data-act="d60.mx"][data-sid="s1"]');await W(800);
  await shot(pg,'m-d60-1',[0,0,390,650],[
    {sel:'[data-act="d60.pm"]',all:1,t:'달을 누르면 그 달만'},
    {sel:'[data-act="d60.ms"]',all:1,t:'전체 · 예정 · 진행 중 · 완료'},
    {sel:'[data-act="d60.mx"][data-sid="s1"]',t:'현장을 누르면 공종이 펼쳐집니다'},
    {sel:'.d60-mtb [data-act="d60.open"]',all:1,t:'공종을 골라 점검 시작'}]);
  await pg.click('.d60-mtb [data-act="d60.open"][data-sid="s1"][data-tr="arch"]');await W(1200);await pg.click('.d60-it.fold');await W(800);
  await shot(pg,'m-d60-2',[0,0,390,560],[
    {sel:'[data-act="d60.sc"]',all:1,t:'전유부 · 공용부 · 민원사항'},
    {sel:'[data-act="d60.sp"]',all:1,t:'공간 — 옆으로 밀면 다음 공간'},
    {sel:'[data-act="d60.ans"]',all:1,t:'양호 · 지적 · N/A — 지적이면 조치사항이 열립니다'},
    {pt:[340,302],cl:'label,button',t:'사진 — 항목당 4장'},
    {sel:'[data-act="d60.allOk"]',t:'남은 항목 한 번에 양호'},
    {sel:'[data-act="d60.fin"]',t:'점검 완료'}]);
  await pg.addStyleTag({content:'#bgPvCr{visibility:hidden!important}'});
  await pg.evaluate(()=>go('settings'));await W(1500);await pg.evaluate(()=>{const c=document.querySelector('#bgCard');if(c)c.scrollIntoView({block:'center'});});await W(600);
  await shot(pg,'m-set-1',{boxes:[{sel:'#bgCard'}],pad:[8,12,8,12]},[
    {sel:'.bgp-auto',t:'자동 변경 — 켜 두면 매시간 바뀝니다'},
    {sel:'[data-act="bg.pick"]',all:1,t:'끄고 사진을 고르면 그 사진으로 고정'}]);
  await seedDefect(pg);await pg.evaluate(()=>go('defect'));await W(2500);
  await shot(pg,'m-df-1',[0,0,390,660],[
    {sel:'[data-act="df.rm"]',t:'기준월'},
    {sel:'.kc',t:'눌러서 현장 고르기'},
    {sel:'[data-act="rec.list"]',all:1,t:'눌러서 그 하자 목록'}]);
  await pg.close();}

/* ── 위젯 ── */
{const pg=await br.newPage({viewport:{width:460,height:760},deviceScaleFactor:2});await open(pg,'&w=1&glass=1');
  await pg.addStyleTag({content:'html,body{background:#47566A!important}'});await W(500);
  const bb=await pg.locator(tdOf('2026-10-15')).boundingBox();await pg.mouse.click(bb.x+bb.width/2,bb.y+bb.height-12);await W(1000);
  await shot(pg,'w-1',[0,0,460,560],[
    {sel:'.cal-head [data-act="cal.pick"],.cal-title',t:'년 · 달 — 양옆 화살표로 넘기기'},
    {sel:'[data-act="wid.open"]',t:'앱 전체 화면 열기'},
    {sel:'[data-act="wid.side"]',t:'내 업무 · 알림'},
    {sel:'[data-act="wid.set"]',t:'위젯 설정 — 위치 · 크기 · 알림'},
    {sel:'#widPop',t:'날짜를 누르면 그날 업무 — 「+」로 추가'}]);
  await pg.close();}

/* 장 → 단계 — 장 이름은 docs/manual.md 의 ## 제목과 같아야 그 장이 그림으로 바뀐다 */
const SEC={
  '캘린더':{d:[['업무 보기 · 추가','d-cal-1'],['업무 고치기','d-cal-2']],m:[['달력','m-cal-1'],['그날 업무','m-cal-2'],['아래 탭','m-cal-3']]},
  '업무 현황':{d:[['주간 · 현장별 업무','d-tk-1']],m:[['주간 · 현장별 업무','m-tk-1']]},
  '업무 도구':{d:[['D+60 점검 — 목록','d-d60-1'],['D+60 점검 — 점검표','d-d60-2'],['사진대지 작성','d-pd-1'],['견적 검토','d-qc-1']],m:[['D+60 점검 — 목록','m-d60-1'],['D+60 점검 — 점검하기','m-d60-2']]},
  '하자처리 현황':{d:[['대시보드','d-df-1'],['현장','d-df-2'],['회의 모드','d-df-3'],['회의 모드 — 처리계획','d-df-4']],m:[['대시보드','m-df-1']]},
  '위젯 · 설정':{d:[['바탕화면 위젯','w-1'],['설정','d-set-1']],m:[['배경화면','m-set-1']]},
};
const out={sec:{}};
for(const [t,o] of Object.entries(SEC)){out.sec[t]={};for(const k of ['d','m'])out.sec[t][k]=o[k].filter(([,key])=>G[key]).map(([tt,key])=>({t:tt,...G[key]}));}
fs.writeFileSync(path.join(OUT,'guide.json'),JSON.stringify(out));
const used=new Set(Object.values(G).map(g=>g.img));for(const f of fs.readdirSync(OUT))if(f.endsWith('.webp')&&!used.has(f))fs.unlinkSync(path.join(OUT,f));
console.log('완료 —',Object.keys(G).length,'장');
await br.close();srv.close();
