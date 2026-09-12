/* ═══════════════════════════════════════════════════════════════
   H서비스센터 · 일정·업무 공유
   - 업무·조직·하자 관리를 하나의 앱에서 운영한다.
   - 데이터: 로그인 전 localStorage → 로그인 후 Firebase RTDB 실시간
   - 브라우저와 위젯은 같은 앱 주소와 인증 체계를 사용한다.
   - 「업무 도구」(사진대지 작성 · 견적 검토 · 도면 인쇄, 798차~)는 **이 창 메모리에서만** 돈다.
     서버·localStorage 에 아무것도 남기지 않고, 창을 닫으면 사라진다. 결과물은 인쇄나 복사로 가져간다.
   ═══════════════════════════════════════════════════════════════ */
'use strict';
/* 이 웹앱의 버전 = 배포 회차. zip 이름(calapp-vNNN)·index.html 의 app.js?v=NNN 과 **같은 숫자**다(390차).
   ⚠ 예전엔 semver(4.8.1)를 따로 뒀지만 회차와 무엇이 다른지 아무도 설명할 수 없었다 — 값 하나로 합쳤다.
     어긋나면 static-audit 이 FAIL 로 잡는다. 위젯 버전은 별개이며 트레이 메뉴에 나온다 */
const APP_VER='854';
/* ── 사용 안내(README) 뷰어 ───────────────────────────────────────
   저장소의 README.md 를 그대로 읽어 보여 준다 — 안내와 문서가 어긋날 일이 없다.
   ⚠ 라이브러리는 사내망 CDN 차단에 대비해 `vendor/` 에 함께 둔다(지연 로드).
   ⚠ 받은 글은 반드시 DOMPurify 로 살균한 뒤 넣는다. */
let _mdPromise=null;
function loadMarked(){
  if(typeof marked!=='undefined'&&typeof DOMPurify!=='undefined')return Promise.resolve(true);
  if(_mdPromise)return _mdPromise;
  const one=src=>new Promise((res,rej)=>{
    const el=document.createElement('script');el.src=src;
    el.onload=()=>res(true);el.onerror=()=>rej(new Error(src));
    document.head.appendChild(el);
  });
  _mdPromise=Promise.all([
    typeof marked!=='undefined'?Promise.resolve(true):one('./vendor/marked.min.js'),
    typeof DOMPurify!=='undefined'?Promise.resolve(true):one('./vendor/purify.min.js')
  ]).catch(e=>{_mdPromise=null;throw e;});
  return _mdPromise;
}
async function openReadme(){
  try{
    const res=await fetch('README.md',{cache:'no-cache'});
    if(!res.ok)throw new Error('HTTP '+res.status);
    const md=await res.text();
    await loadMarked();
    const src=document.createElement('div');
    src.innerHTML=DOMPurify.sanitize(marked.parse(md,{breaks:true}));   /* 원문의 줄바꿈을 그대로 살린다 */
    /* 장(h2) 단위로 쪼개 왼쪽 목차 + 본문 한 장씩 — 길어서 스크롤만으로는 찾기 어렵다 */
    const secs=[];let cur={t:'소개',nodes:[]};
    Array.from(src.childNodes).forEach(n=>{
      if(n.nodeType===1&&n.tagName==='H2'){if(cur.nodes.length)secs.push(cur);cur={t:n.textContent.trim(),nodes:[n]};}
      else cur.nodes.push(n);
    });
    if(cur.nodes.length)secs.push(cur);
    const wrap=document.createElement('div');wrap.className='rd-wrap';
    const nav=document.createElement('nav');nav.className='rd-nav';nav.setAttribute('aria-label','사용 안내 목차');
    nav.innerHTML=secs.map((x,i)=>'<button class="rd-navi'+(i===0?' act':'')+'" data-act="readme.tab" data-i="'+i+'">'+esc(x.t)+'</button>').join('');
    const body=document.createElement('div');body.className='rd-body md-doc';
    secs.forEach((x,i)=>{
      const d=document.createElement('div');d.className='rd-sec'+(i===0?' act':'');
      x.nodes.forEach(n=>d.appendChild(n));
      d.querySelectorAll('table').forEach(tb=>{      /* 좁은 화면에서 표만 가로 스크롤 */
        const w=document.createElement('div');w.className='md-tw';
        tb.parentNode.insertBefore(w,tb);w.appendChild(tb);
      });
      body.appendChild(d);
    });
    wrap.appendChild(nav);wrap.appendChild(body);
    openModal('사용 안내','<div class="md-scroll"></div>','');
    const mb=$('#mb');if(mb)mb.classList.add('rdw');
    $('#mbody').firstChild.appendChild(wrap);
  }catch(e){
    console.warn('[README] 열기 실패',e);
    /* 단일 파일 빌드에는 README.md 가 없다 — 그때는 저장소 주소로 안내한다 */
    toast('사용 안내를 읽지 못했습니다 · README.md 가 함께 올라갔는지 확인해 주세요');
  }
}
const ERRLOG=[];
window.addEventListener('error',e=>{ERRLOG.unshift(new Date().toLocaleString('ko-KR')+' · '+(e.message||'')+' @'+(e.filename||'').split('/').pop()+':'+(e.lineno||0));ERRLOG.length=Math.min(ERRLOG.length,20);});
window.addEventListener('unhandledrejection',e=>{ERRLOG.unshift(new Date().toLocaleString('ko-KR')+' · 미처리 거부 · '+String((e.reason&&e.reason.message)||e.reason||'').slice(0,120));ERRLOG.length=Math.min(ERRLOG.length,20);});

/* ───── 유틸 ───── */
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
function pad(n){return String(n).padStart(2,'0');}
function dstr(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function ymOf(ds){return ds.slice(0,7);}
function todayStr(){return dstr(new Date());}
const DOW=['일','월','화','수','목','금','토'];
const PAL=['#6B7280','#3E71D2','#0EA5E9','#0D9488','#16A34A','#65A30D',
           '#D97706','#EA580C','#DC2626','#DB2777','#7C5CD6','#4B5563'];

/* 아바타 배경색 즉시 반영 · 이모지 검색 */
function pfPaint(c){
  const av=document.querySelector('.acct-av');
  if(av&&c)av.style.setProperty('--avc',colBg(c));
}
document.addEventListener('click',e=>{
  /* 655차: 수식키(또는 선택 모드)로 행을 누르면 펼치기 대신 선택 */
  const pr=e.target.closest(PICK_SEL);
  if(pr&&!e.target.closest('.tk-acts')&&!e.target.closest('.plan-acts')&&(e.ctrlKey||e.metaKey||e.shiftKey||PICK.mode)){
    e.preventDefault();e.stopPropagation();pickToggle(pr,e.shiftKey);return;
  }
  /* 색상환 슬라이더 — 끌 때는 미리보기만, 놓을 때 확정한다(끌 때마다 저장하면 목록이 다시 그려져 팝오버가 사라진다) */
  /* 팝오버에서 고르면 줄에 반영하고 닫는다 */
  const ec=e.target.closest('#colPop .pal-c');
  if(ec&&!ec.classList.contains('pal-add')){
    setPlanColor(ec.dataset.c||'auto');closeColPop();return;
  }
  const pc=e.target.closest('#pfPal .pal-c');
  if(pc&&!pc.classList.contains('pal-add')){const cv=pc.dataset.c||'';PF_SEL.color=cv;
    if(cv&&cv!=='auto'&&!isRainbow(cv)&&!isGrad(cv)&&PAL.indexOf(cv)<0)palAdd(cv);   /* 651차: 고른 색을 최근색으로 */
    setTimeout(()=>pfPaint(cv||ownColor((S.user||{}).uid)),0);acctAutoSave();return;}
  /* 팝오버 밖을 누르면 닫는다 — 아바타 버튼 자체는 토글이 처리 */
  const p=$('#pfPop');
  if(p&&p.classList.contains('open')&&!e.target.closest('#pfPop')&&!e.target.closest('[data-act="pf.toggle"]'))
    p.classList.remove('open');
});
document.addEventListener('input',e=>{
  if(e.target.id==='ahQ'){ahSrchSync(e.target.value);return;}
  if(e.target.id==='acctName'||e.target.id==='acctNamePw'){acctAutoSave();return;}   /* 648차: 비밀번호 탭의 이름 칸도 같이 저장 */
  /* 451차: 배경 슬라이더는 끄는 동안 바로 보여야 한다(change 는 손을 뗄 때만 온다) */
  if(e.target.id==='bgAlpha'||e.target.id==='bgBri'){ACT[e.target.dataset.act](e.target);return;}
  /* 색상 띠 — 끌 때는 미리보기만(끌 때마다 저장하면 목록이 다시 그려져 팝오버가 사라진다) */
  if(e.target.classList&&e.target.classList.contains('cp-hue')){
    const pop=$('#colPop');if(!pop)return;
    const d=pop.querySelector('.cp-dot');
    const [,sa,v]=hexHsv(rgbHex(d?d.style.background:''));
    const hex=hsvHex(Number(e.target.value)||0,sa||.7,v||.85);
    cpPaint(pop,hex);
    const btn=pop.closest('.p-col');if(btn)btn.style.background=hex;
    return;
  }
  if(e.target.closest('#pfPal')){const v=e.target.value;PF_SEL.color=v;pfPaint(v);acctAutoSave();return;}
  if(e.target.id==='pfSrch'){
    const q=e.target.value.trim();
    $$('#pfCats .pf-cat').forEach(x=>x.classList.remove('act'));
    pfRenderEmg('smiley',q);
  }
});

/* 고른 뒤 드롭다운 목록과 '지정 안 함' 문구를 다시 맞춘다 */
/* 로그인한 본인을 목록 맨 앞으로 — 자기 업무를 가장 자주 고르므로 매번 찾아 내려가지 않게 한다.
   ⚠ 원본 배열은 건드리지 않는다(호출부가 같은 배열을 다른 용도로도 쓴다) */
function meFirst(list){
  const uid=(S.user||{}).uid||'';
  if(!uid||!Array.isArray(list))return list||[];
  const i=list.findIndex(p=>p&&p.id===uid);
  return i<=0?list:[list[i],...list.slice(0,i),...list.slice(i+1)];
}
/* 담당자 단일 지정 select — 53차에 다중 칩(ownPickHTML)에서 단순화 */
function ownSelHTML(id,cur,people){
  const uid=(S.user||{}).uid||'';
  return `<select class="inp inp-sm" id="${id}" aria-label="담당자">
    <option value="">공통</option>
    ${meFirst(people).map(p=>'<option value="'+esc(p.id)+'"'+(p.id===cur?' selected':'')+'>'+esc(p.name)+(p.id===uid?' (나)':'')+'</option>').join('')}
  </select>`;
}
function sitePickHTML(id,cur){
  const sites=(S.org.sites||[]).filter(x=>x.name);
  return `<select class="inp inp-sm" id="${id}">
    <option value="">-</option>
    ${sites.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===cur?' selected':'')+'>'+esc(x.name)+'</option>').join('')}
  </select>`;
}
/* 업무 색 = 제목 앞 색 원. 누르면 팔레트 팝오버가 열린다(읽기 카드는 pid 를 달아 바로 저장) */
/* 색 원 — 수정 모드(pid 없이 부를 때)에서만 팔레트를 연다.
   읽기 카드에서는 표시만 한다(실수로 색이 바뀌던 것을 막는다) */
/* 색 원 — 공통 업무(담당자 없음)는 달력 막대와 같은 '속 빈' 표시로 그린다(테두리만 업무색).
   team 은 호출부에서 넘긴다(미지정이면 기존처럼 꽉 찬 원). */
function colDotHTML(c,pid,team){
  const rb=isRainbow(c)||isGrad(c);   /* 678차: 그라디언트도 테두리만 칠하는 공통 표시를 같이 쓴다 */
  const st=team
    ? (rb?'background:transparent;box-shadow:none;--gb:'+esc(colBg(c)):'background:transparent;box-shadow:inset 0 0 0 1.5px '+esc(c))   /* 687차: 링 그라디언트는 --gb 로 넘긴다(CSS 는 무지개를 기본값으로만 둔다) */
    : 'background:'+esc(colBg(c));
  const cls=(team?' p-col-team':'')+(rb?' p-col-rainbow':'')+(isFlow(c)?' p-col-fx':'');
  return pid
    ?'<span class="p-col p-col-ro'+cls+'" style="'+st+'"></span>'
    :'<button class="p-col'+cls+'" data-act="plan.color" aria-label="색 고르기" data-tip="색 고르기" style="'+st+'"></button>';
}
/* 담당자를 바꾸면 색 원도 곧바로 따라 바뀐다(609차 · 폼을 다시 그리지 않고 그 원만 고친다).
   ⚠ 판정은 `planColor` 에 맡긴다 — 직접 고른 색이면 담당자를 바꿔도 그대로다('auto' 일 때만 담당자 색).
   ⚠ 공통(담당자 없음)은 색뿐 아니라 **꼴**이 바뀐다(속 빈 원) — 클래스도 함께 토글해야 한다.
   ⚠ 폼은 둘이고 규칙이 다르다: 달력 옆 인라인(#dpEdit·peOwners)은 속 빈 원을 쓰고,
     업무 현황 목록(#tkNew·tnAsg)은 원래부터 team 인자를 안 넘겨 늘 꽉 찬 원이다 — 그 차이를 지킨다. */
function peColorSync(){
  const inline=$('#dpEdit'),box=inline||$('#tkNew');if(!box)return;
  const dot=box.querySelector('.pe-bar .p-col');if(!dot)return;
  const sel=box.querySelector(inline?'#peOwners':'#tnAsg');
  const v=(sel&&sel.value)||'';
  const color=inline?((S.planEdit&&S.planEdit.draft&&S.planEdit.draft.color)||'auto')
                    :(($('#tnColor')&&$('#tnColor').value)||'');
  const pp={color,owners:v?{[v]:1}:{}};
  const c=planColor(pp),team=!!inline&&!planOwners(pp).length,rb=isRainbow(c)||isGrad(c);
  dot.classList.toggle('p-col-team',team);
  dot.classList.toggle('p-col-rainbow',rb);
  dot.classList.toggle('p-col-fx',isFlow(c));
  dot.style.cssText=team
    ? (rb?'background:transparent;box-shadow:none;--gb:'+colBg(c):'background:transparent;box-shadow:inset 0 0 0 1.5px '+c)
    : 'background:'+colBg(c);
}
/* 색 선택기 HTML — 기본 팔레트 + 임의 색 추가.
   현재 값이 팔레트에 없으면(직접 고른 색) 맨 뒤에 칩으로 붙여 선택 상태를 유지한다. */
/* 색 팝오버 — 1행은 기본색(담당자 색 + 빨·파·초·노·회), 2행부터는 직접 추가한 색.
   맨 아래에 색상 팔레트(사각형 + 색상 띠)를 늘 펼쳐 둔다. 추가색은 우클릭으로 지운다. */
const PAL_BASE=['#DD3B30','#3E71D2','#16A34A','#FACC15','#8B5CF6','#6B7280'];
function palKey(){return 'calapp.pal.'+((S.user&&S.user.uid)||'local');}
function palCustom(){try{return JSON.parse(localStorage.getItem(palKey())||'[]');}catch(e){return[];}}
function palAdd(c){
  if(!c||PAL_BASE.includes(c))return;
  const l=palCustom().filter(x=>x!==c);l.unshift(c);
  try{localStorage.setItem(palKey(),JSON.stringify(l.slice(0,7)));}catch(e){}   /* 최근 쓴 7개만 */
}
function palDel(c){
  try{localStorage.setItem(palKey(),JSON.stringify(palCustom().filter(x=>x!==c)));}catch(e){}
}
function colPopHTML(cur){
  const c=(!cur||cur==='auto')?'auto':cur;
  const dot=(v,cls,style,title)=>'<button class="pal-c'+(v===c?' sel':'')+(cls?' '+cls:'')
    +'" data-c="'+esc(v)+'"'+(style?' style="'+style+'"':'')+(title?' data-tip="'+esc(title)+'"':'')+'></button>';
  const custom=palCustom().filter(x=>x&&!PAL_BASE.includes(x));
  if(c!=='auto'&&!PAL_BASE.includes(c)&&!custom.includes(c))custom.unshift(c);
  return '<div class="col-pop-h">색 고르기</div>'
    +'<div class="pal">'
      +'<button class="pal-c pal-auto'+(c==='auto'?' sel':'')+'" data-c="auto" data-tip="담당자 색">'
        +'<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#av-person"></use></svg></button>'
      +PAL_BASE.map(x=>dot(x,'','background:'+x)).join('')
      +(custom.length?'<div class="pal-br"></div>'+custom.map(x=>dot(x,'pal-custom','background:'+esc(x),'우클릭으로 삭제')).join(''):'')
    +'</div>'
    +'<div class="cp">'
      +'<div class="cp-sv"><span class="cp-dot"></span></div>'
      +'<input type="range" class="cp-hue" min="0" max="359" value="215" aria-label="색상">'
    +'</div>';
}
/* 팔레트 사각형·색상 띠를 지금 색에 맞춰 그린다 */
function cpPaint(pop,hex){
  const sv=pop.querySelector('.cp-sv'),hue=pop.querySelector('.cp-hue'),dot=pop.querySelector('.cp-dot');
  if(!sv||!hue)return;
  const [h,sa,v]=hexHsv(hex);
  hue.value=Math.round(h);
  sv.style.background='linear-gradient(to top,#000,rgba(0,0,0,0)),linear-gradient(to right,#fff,hsl('+Math.round(h)+',100%,50%))';
  if(dot){dot.style.left=(sa*100)+'%';dot.style.top=((1-v)*100)+'%';dot.style.background=hex;}
}
/* 배경색이 밝으면 어두운 글자를 쓴다 — 노랑·연두 위의 흰 글자는 그림자로도 안 읽힌다 */
function isLightColor(hex){
  const m=/^#?([\da-f]{6})$/i.exec(String(hex||''));
  if(!m)return false;
  const n=parseInt(m[1],16);
  /* 사람 눈이 느끼는 밝기(녹색에 가중) */
  return (0.299*(n>>16)+0.587*((n>>8)&255)+0.114*(n&255))>150;   /* 연두(#84CC16≈162)도 어두운 글자로 — 실사용에서 안 읽혔다 */
}
function hsvHex(h,s,v){
  const f=n=>{const k=(n+h/60)%6,x=v-v*s*Math.max(0,Math.min(k,4-k,1));
    return Math.round(x*255).toString(16).padStart(2,'0').toUpperCase();};
  return '#'+f(5)+f(3)+f(1);
}
/* style.background 는 rgb(...) 로 되돌아온다 — hex 로 바꿔 준다 */
function rgbHex(v){
  const m=/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(String(v||''));
  if(!m)return String(v||'').trim()||'#3E71D2';
  return '#'+[1,2,3].map(i=>Number(m[i]).toString(16).padStart(2,'0')).join('').toUpperCase();
}
function hexHsv(hex){
  const m=/^#?([\da-f]{6})$/i.exec(String(hex||''));
  if(!m)return[215,.7,.85];
  const n=parseInt(m[1],16),r=(n>>16)/255,g=((n>>8)&255)/255,b=(n&255)/255;
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
  let h=0;
  if(d){h=mx===r?((g-b)/d+(g<b?6:0)):mx===g?((b-r)/d+2):((r-g)/d+4);h*=60;}
  return[h,mx?d/mx:0,mx];
}
function palHTML(id,cur,extraFirst){
  const c=cur||'';
  /* 651차: 직접 고른 색을 칩 한 칸에 덮어쓰던 것을 '최근 쓴 색' 목록으로 바꾼다.
     업무 색 팝오버와 같은 저장소(palCustom/palAdd)를 쓰므로 두 곳의 최근색이 하나로 모인다. */
  const cust=palCustom().filter(x=>x&&PAL.indexOf(x)<0);
  if(c&&c!=='auto'&&!isRainbow(c)&&!isGrad(c)&&PAL.indexOf(c)<0&&cust.indexOf(c)<0)cust.unshift(c);
  return '<div class="pal" id="'+id+'">'+(extraFirst||'')
    +PAL.map(x=>'<div class="pal-c'+(x===c?' sel':'')+'" data-c="'+x+'" style="background:'+x+'"></div>').join('')
    +cust.map(x=>'<div class="pal-c pal-custom'+(x===c?' sel':'')+'" data-c="'+esc(x)+'" style="background:'+esc(x)+'" data-tip="우클릭으로 삭제"></div>').join('')
    +'<label class="pal-c pal-add" data-tip="직접 고르기">'
    +'<input type="color" class="pal-inp" value="'+esc(c&&c!=='auto'&&!isRainbow(c)&&!isGrad(c)?c:'#3E71D2')+'"><span>+</span></label>'
    /* 678차: 그라디언트는 단색과 성격이 달라 줄을 나눈다 — 무지개 2종 + 색 그라디언트 7종 */
    /* 위 줄은 고정, 아래 줄은 흐름(▶). 같은 순서로 세워 세로로 짝이 맞는다. */
    +'<div class="pal-row pal-grad">'
    +'<div class="pal-c'+(c==='rainbow'?' sel':'')+'" data-c="rainbow" style="background:'+RAINBOW_BG+'" data-tip="무지개"></div>'
    +Object.keys(GRADS).map(g=>'<div class="pal-c'+(g===c?' sel':'')+'" data-c="'+g+'" style="background:'+GRADS[g]+'" data-tip="그라디언트"></div>').join('')
    +'</div>'
    +'<div class="pal-row pal-grad pal-grad2">'
    +'<div class="pal-c pal-fx'+(c===RB_ANIM?' sel':'')+'" data-c="'+RB_ANIM+'" style="background:'+RAINBOW_BG+'" data-tip="무지개 · 흐름"></div>'
    +Object.keys(GRADS).map(g=>'<div class="pal-c pal-fx'+(g+GRAD_ANIM===c?' sel':'')+'" data-c="'+g+GRAD_ANIM+'" style="background:'+GRADS[g]+'" data-tip="그라디언트 · 흐름"></div>').join('')
    +'</div>'
    +'</div>';
}
/* 프로필 아바타 — 계정에 저장한 색·아이콘이 있으면 그것을, 없으면 자동 색 */
/* 아바타 — 기본 아이콘 1종(person SVG) + 시스템 이모지.
   이모지 목록은 유니코드 표준 분류(애플 키보드와 동일한 8개 묶음). */
const EMOJI_CATS=[
  {id:'smiley',label:'표정·사람',s:'😀 grinning|😃 smiley|😄 smile|😁 grin|😆 laughing|😅 sweat_smile|🤣 rolling_on_the_floor_laughing|😂 joy|🙂 slightly_smiling_face|🙃 upside_down_face|🫠 melting_face|😉 wink|😊 blush|😇 innocent|🥰 smiling_face_with_3_hearts|😍 heart_eyes|🤩 star-struck|😘 kissing_heart|😗 kissing|☺️ relaxed|😚 kissing_closed_eyes|😙 kissing_smiling_eyes|🥲 smiling_face_with_tear|😋 yum|😛 stuck_out_tongue|😜 stuck_out_tongue_winking_eye|🤪 zany_face|😝 stuck_out_tongue_closed_eyes|🤑 money_mouth_face|🤗 hugging_face|🤭 face_with_hand_over_mouth|🫢 face_with_open_eyes_and_hand_over_mouth|🫣 face_with_peeking_eye|🤫 shushing_face|🤔 thinking_face|🫡 saluting_face|🤐 zipper_mouth_face|🤨 face_with_raised_eyebrow|😐 neutral_face|😑 expressionless|😶 no_mouth|🫥 dotted_line_face|😶‍🌫️ face_in_clouds|😏 smirk|😒 unamused|🙄 face_with_rolling_eyes|😬 grimacing|😮‍💨 face_exhaling|🤥 lying_face|🫨 shaking_face|🙂‍↔️ head_shaking_horizontally|🙂‍↕️ head_shaking_vertically|😌 relieved|😔 pensive|😪 sleepy|🤤 drooling_face|😴 sleeping|🫩 face_with_bags_under_eyes|😷 mask|🤒 face_with_thermometer|🤕 face_with_head_bandage|🤢 nauseated_face|🤮 face_vomiting|🤧 sneezing_face|🥵 hot_face|🥶 cold_face|🥴 woozy_face|😵 dizzy_face|😵‍💫 face_with_spiral_eyes|🤯 exploding_head|🤠 face_with_cowboy_hat|🥳 partying_face|🥸 disguised_face|😎 sunglasses|🤓 nerd_face|🧐 face_with_monocle|😕 confused|🫤 face_with_diagonal_mouth|😟 worried|🙁 slightly_frowning_face|☹️ white_frowning_face|😮 open_mouth|😯 hushed|😲 astonished|😳 flushed|🥺 pleading_face|🥹 face_holding_back_tears|😦 frowning|😧 anguished|😨 fearful|😰 cold_sweat|😥 disappointed_relieved|😢 cry|😭 sob|😱 scream|😖 confounded|😣 persevere|😞 disappointed|😓 sweat|😩 weary|😫 tired_face|🥱 yawning_face|😤 triumph|😡 rage|😠 angry|🤬 face_with_symbols_on_mouth|😈 smiling_imp|👿 imp|💀 skull|☠️ skull_and_crossbones|💩 hankey|🤡 clown_face|👹 japanese_ogre|👺 japanese_goblin|👻 ghost|👽 alien|👾 space_invader|🤖 robot_face|😺 smiley_cat|😸 smile_cat|😹 joy_cat|😻 heart_eyes_cat|😼 smirk_cat|😽 kissing_cat|🙀 scream_cat|😿 crying_cat_face|😾 pouting_cat|🙈 see_no_evil|🙉 hear_no_evil|🙊 speak_no_evil|💌 love_letter|💘 cupid|💝 gift_heart|💖 sparkling_heart|💗 heartpulse|💓 heartbeat|💞 revolving_hearts|💕 two_hearts|💟 heart_decoration|❣️ heavy_heart_exclamation_mark_ornament|💔 broken_heart|❤️‍🔥 heart_on_fire|❤️‍🩹 mending_heart|❤️ heart|🩷 pink_heart|🧡 orange_heart|💛 yellow_heart|💚 green_heart|💙 blue_heart|🩵 light_blue_heart|💜 purple_heart|🤎 brown_heart|🖤 black_heart|🩶 grey_heart|🤍 white_heart|💋 kiss|💯 100|💢 anger|💥 boom|💫 dizzy|💦 sweat_drops|💨 dash|🕳️ hole|💬 speech_balloon|👁️‍🗨️ eye-in-speech-bubble|🗨️ left_speech_bubble|🗯️ right_anger_bubble|💭 thought_balloon|💤 zzz|👋 wave|🤚 raised_back_of_hand|🖐️ raised_hand_with_fingers_splayed|✋ hand|🖖 spock-hand|🫱 rightwards_hand|🫲 leftwards_hand|🫳 palm_down_hand|🫴 palm_up_hand|🫷 leftwards_pushing_hand|🫸 rightwards_pushing_hand|👌 ok_hand|🤌 pinched_fingers|🤏 pinching_hand|✌️ v|🤞 crossed_fingers|🫰 hand_with_index_finger_and_thumb_crossed|🤟 i_love_you_hand_sign|🤘 the_horns|🤙 call_me_hand|👈 point_left|👉 point_right|👆 point_up_2|🖕 middle_finger|👇 point_down|☝️ point_up|🫵 index_pointing_at_the_viewer|👍 +1|👎 -1|✊ fist|👊 facepunch|🤛 left-facing_fist|🤜 right-facing_fist|👏 clap|🙌 raised_hands|🫶 heart_hands|👐 open_hands|🤲 palms_up_together|🤝 handshake|🙏 pray|✍️ writing_hand|💅 nail_care|🤳 selfie|💪 muscle|🦾 mechanical_arm|🦿 mechanical_leg|🦵 leg|🦶 foot|👂 ear|🦻 ear_with_hearing_aid|👃 nose|🧠 brain|🫀 anatomical_heart|🫁 lungs|🦷 tooth|🦴 bone|👀 eyes|👁️ eye|👅 tongue|👄 lips|🫦 biting_lip|👶 baby|🧒 child|👦 boy|👧 girl|🧑 adult|👨 man|🧔 bearded_person|🧔‍♂️ man_with_beard|🧔‍♀️ woman_with_beard|👨‍🦰 red_haired_man|👨‍🦱 curly_haired_man|👨‍🦳 white_haired_man|👨‍🦲 bald_man|👩 woman|👩‍🦰 red_haired_woman|🧑‍🦰 red_haired_person|👩‍🦱 curly_haired_woman|🧑‍🦱 curly_haired_person|👩‍🦳 white_haired_woman|🧑‍🦳 white_haired_person|👩‍🦲 bald_woman|🧑‍🦲 bald_person|👱‍♀️ blond-haired-woman|👱‍♂️ blond-haired-man|🧓 older_adult|👴 older_man|👵 older_woman|🙍‍♂️ man-frowning|🙍‍♀️ woman-frowning|🙎‍♂️ man-pouting|🙎‍♀️ woman-pouting|🙅‍♂️ man-gesturing-no|🙅‍♀️ woman-gesturing-no|🙆‍♂️ man-gesturing-ok|🙆‍♀️ woman-gesturing-ok|💁‍♂️ man-tipping-hand|💁‍♀️ woman-tipping-hand|🙋‍♂️ man-raising-hand|🙋‍♀️ woman-raising-hand|🧏 deaf_person|🧏‍♂️ deaf_man|🧏‍♀️ deaf_woman|🙇 bow|🙇‍♂️ man-bowing|🙇‍♀️ woman-bowing|🤦 face_palm|🤦‍♂️ man-facepalming|🤦‍♀️ woman-facepalming|🤷 shrug|🤷‍♂️ man-shrugging|🤷‍♀️ woman-shrugging|🧑‍⚕️ health_worker|👨‍⚕️ male-doctor|👩‍⚕️ female-doctor|🧑‍🎓 student|👨‍🎓 male-student|👩‍🎓 female-student|🧑‍🏫 teacher|👨‍🏫 male-teacher|👩‍🏫 female-teacher|🧑‍⚖️ judge|👨‍⚖️ male-judge|👩‍⚖️ female-judge|🧑‍🌾 farmer|👨‍🌾 male-farmer|👩‍🌾 female-farmer|🧑‍🍳 cook|👨‍🍳 male-cook|👩‍🍳 female-cook|🧑‍🔧 mechanic|👨‍🔧 male-mechanic|👩‍🔧 female-mechanic|🧑‍🏭 factory_worker|👨‍🏭 male-factory-worker|👩‍🏭 female-factory-worker|🧑‍💼 office_worker|👨‍💼 male-office-worker|👩‍💼 female-office-worker|🧑‍🔬 scientist|👨‍🔬 male-scientist|👩‍🔬 female-scientist|🧑‍💻 technologist|👨‍💻 male-technologist|👩‍💻 female-technologist|🧑‍🎤 singer|👨‍🎤 male-singer|👩‍🎤 female-singer|🧑‍🎨 artist|👨‍🎨 male-artist|👩‍🎨 female-artist|🧑‍✈️ pilot|👨‍✈️ male-pilot|👩‍✈️ female-pilot|🧑‍🚀 astronaut|👨‍🚀 male-astronaut|👩‍🚀 female-astronaut|🧑‍🚒 firefighter|👨‍🚒 male-firefighter|👩‍🚒 female-firefighter|👮‍♂️ male-police-officer|👮‍♀️ female-police-officer|🕵️‍♂️ male-detective|🕵️‍♀️ female-detective|💂‍♂️ male-guard|💂‍♀️ female-guard|🥷 ninja|👷‍♂️ male-construction-worker|👷‍♀️ female-construction-worker|🫅 person_with_crown|🤴 prince|👸 princess|👳‍♂️ man-wearing-turban|👳‍♀️ woman-wearing-turban|👲 man_with_gua_pi_mao|🧕 person_with_headscarf|🤵 person_in_tuxedo|🤵‍♂️ man_in_tuxedo|🤵‍♀️ woman_in_tuxedo|👰 bride_with_veil|👰‍♂️ man_with_veil|👰‍♀️ woman_with_veil|🤰 pregnant_woman|🫃 pregnant_man|🫄 pregnant_person|🤱 breast-feeding|👩‍🍼 woman_feeding_baby|👨‍🍼 man_feeding_baby|🧑‍🍼 person_feeding_baby|👼 angel|🎅 santa|🤶 mrs_claus|🧑‍🎄 mx_claus|🦸 superhero|🦸‍♂️ male_superhero|🦸‍♀️ female_superhero|🦹 supervillain|🦹‍♂️ male_supervillain|🦹‍♀️ female_supervillain|🧙‍♂️ male_mage|🧙‍♀️ female_mage|🧚‍♂️ male_fairy|🧚‍♀️ female_fairy|🧛‍♂️ male_vampire|🧛‍♀️ female_vampire|🧜‍♂️ merman|🧜‍♀️ mermaid|🧝‍♂️ male_elf|🧝‍♀️ female_elf|🧞‍♂️ male_genie|🧞‍♀️ female_genie|🧟‍♂️ male_zombie|🧟‍♀️ female_zombie|🧌 troll|💆‍♂️ man-getting-massage|💆‍♀️ woman-getting-massage|💇‍♂️ man-getting-haircut|💇‍♀️ woman-getting-haircut|🚶‍♂️ man-walking|🚶‍♀️ woman-walking|🚶‍➡️ person_walking_facing_right|🚶‍♀️‍➡️ woman_walking_facing_right|🚶‍♂️‍➡️ man_walking_facing_right|🧍 standing_person|🧍‍♂️ man_standing|🧍‍♀️ woman_standing|🧎 kneeling_person|🧎‍♂️ man_kneeling|🧎‍♀️ woman_kneeling|🧎‍➡️ person_kneeling_facing_right|🧎‍♀️‍➡️ woman_kneeling_facing_right|🧎‍♂️‍➡️ man_kneeling_facing_right|🧑‍🦯 person_with_probing_cane|🧑‍🦯‍➡️ person_with_white_cane_facing_right|👨‍🦯 man_with_probing_cane|👨‍🦯‍➡️ man_with_white_cane_facing_right|👩‍🦯 woman_with_probing_cane|👩‍🦯‍➡️ woman_with_white_cane_facing_right|🧑‍🦼 person_in_motorized_wheelchair|🧑‍🦼‍➡️ person_in_motorized_wheelchair_facing_right|👨‍🦼 man_in_motorized_wheelchair|👨‍🦼‍➡️ man_in_motorized_wheelchair_facing_right|👩‍🦼 woman_in_motorized_wheelchair|👩‍🦼‍➡️ woman_in_motorized_wheelchair_facing_right|🧑‍🦽 person_in_manual_wheelchair|🧑‍🦽‍➡️ person_in_manual_wheelchair_facing_right|👨‍🦽 man_in_manual_wheelchair|👨‍🦽‍➡️ man_in_manual_wheelchair_facing_right|👩‍🦽 woman_in_manual_wheelchair|👩‍🦽‍➡️ woman_in_manual_wheelchair_facing_right|🏃‍♂️ man-running|🏃‍♀️ woman-running|🏃‍➡️ person_running_facing_right|🏃‍♀️‍➡️ woman_running_facing_right|🏃‍♂️‍➡️ man_running_facing_right|💃 dancer|🕺 man_dancing|🕴️ man_in_business_suit_levitating|👯‍♂️ men-with-bunny-ears-partying|👯‍♀️ women-with-bunny-ears-partying|🧖‍♂️ man_in_steamy_room|🧖‍♀️ woman_in_steamy_room|🧗‍♂️ man_climbing|🧗‍♀️ woman_climbing|🤺 fencer|🏇 horse_racing|⛷️ skier|🏂 snowboarder|🏌️‍♂️ man-golfing|🏌️‍♀️ woman-golfing|🏄‍♂️ man-surfing|🏄‍♀️ woman-surfing|🚣‍♂️ man-rowing-boat|🚣‍♀️ woman-rowing-boat|🏊‍♂️ man-swimming|🏊‍♀️ woman-swimming|⛹️‍♂️ man-bouncing-ball|⛹️‍♀️ woman-bouncing-ball|🏋️‍♂️ man-lifting-weights|🏋️‍♀️ woman-lifting-weights|🚴‍♂️ man-biking|🚴‍♀️ woman-biking|🚵‍♂️ man-mountain-biking|🚵‍♀️ woman-mountain-biking|🤸 person_doing_cartwheel|🤸‍♂️ man-cartwheeling|🤸‍♀️ woman-cartwheeling|🤼 wrestlers|🤼‍♂️ man-wrestling|🤼‍♀️ woman-wrestling|🤽 water_polo|🤽‍♂️ man-playing-water-polo|🤽‍♀️ woman-playing-water-polo|🤾 handball|🤾‍♂️ man-playing-handball|🤾‍♀️ woman-playing-handball|🤹 juggling|🤹‍♂️ man-juggling|🤹‍♀️ woman-juggling|🧘‍♂️ man_in_lotus_position|🧘‍♀️ woman_in_lotus_position|🛀 bath|🛌 sleeping_accommodation|🧑‍🤝‍🧑 people_holding_hands|👭 two_women_holding_hands|👫 man_and_woman_holding_hands|👬 two_men_holding_hands|💏 couplekiss|👩‍❤️‍💋‍👨 woman-kiss-man|👨‍❤️‍💋‍👨 man-kiss-man|👩‍❤️‍💋‍👩 woman-kiss-woman|💑 couple_with_heart|👩‍❤️‍👨 woman-heart-man|👨‍❤️‍👨 man-heart-man|👩‍❤️‍👩 woman-heart-woman|👨‍👩‍👦 man-woman-boy|👨‍👩‍👧 man-woman-girl|👨‍👩‍👧‍👦 man-woman-girl-boy|👨‍👩‍👦‍👦 man-woman-boy-boy|👨‍👩‍👧‍👧 man-woman-girl-girl|👨‍👨‍👦 man-man-boy|👨‍👨‍👧 man-man-girl|👨‍👨‍👧‍👦 man-man-girl-boy|👨‍👨‍👦‍👦 man-man-boy-boy|👨‍👨‍👧‍👧 man-man-girl-girl|👩‍👩‍👦 woman-woman-boy|👩‍👩‍👧 woman-woman-girl|👩‍👩‍👧‍👦 woman-woman-girl-boy|👩‍👩‍👦‍👦 woman-woman-boy-boy|👩‍👩‍👧‍👧 woman-woman-girl-girl|👨‍👦 man-boy|👨‍👦‍👦 man-boy-boy|👨‍👧 man-girl|👨‍👧‍👦 man-girl-boy|👨‍👧‍👧 man-girl-girl|👩‍👦 woman-boy|👩‍👦‍👦 woman-boy-boy|👩‍👧 woman-girl|👩‍👧‍👦 woman-girl-boy|👩‍👧‍👧 woman-girl-girl|🗣️ speaking_head_in_silhouette|👤 bust_in_silhouette|👥 busts_in_silhouette|🫂 people_hugging|🧑‍🧑‍🧒 family_adult_adult_child|🧑‍🧑‍🧒‍🧒 family_adult_adult_child_child|🧑‍🧒 family_adult_child|🧑‍🧒‍🧒 family_adult_child_child|👣 footprints|🫆 fingerprint'},
  {id:'animal',label:'동물·자연',s:'🐵 monkey_face|🐒 monkey|🦍 gorilla|🦧 orangutan|🐶 dog|🐕 dog2|🦮 guide_dog|🐕‍🦺 service_dog|🐩 poodle|🐺 wolf|🦊 fox_face|🦝 raccoon|🐱 cat|🐈 cat2|🐈‍⬛ black_cat|🦁 lion_face|🐯 tiger|🐅 tiger2|🐆 leopard|🐴 horse|🫎 moose|🫏 donkey|🐎 racehorse|🦄 unicorn_face|🦓 zebra_face|🦌 deer|🦬 bison|🐮 cow|🐂 ox|🐃 water_buffalo|🐄 cow2|🐷 pig|🐖 pig2|🐗 boar|🐽 pig_nose|🐏 ram|🐑 sheep|🐐 goat|🐪 dromedary_camel|🐫 camel|🦙 llama|🦒 giraffe_face|🐘 elephant|🦣 mammoth|🦏 rhinoceros|🦛 hippopotamus|🐭 mouse|🐁 mouse2|🐀 rat|🐹 hamster|🐰 rabbit|🐇 rabbit2|🐿️ chipmunk|🦫 beaver|🦔 hedgehog|🦇 bat|🐻 bear|🐻‍❄️ polar_bear|🐨 koala|🐼 panda_face|🦥 sloth|🦦 otter|🦨 skunk|🦘 kangaroo|🦡 badger|🐾 feet|🦃 turkey|🐔 chicken|🐓 rooster|🐣 hatching_chick|🐤 baby_chick|🐥 hatched_chick|🐦 bird|🐧 penguin|🕊️ dove_of_peace|🦅 eagle|🦆 duck|🦢 swan|🦉 owl|🦤 dodo|🪶 feather|🦩 flamingo|🦚 peacock|🦜 parrot|🪽 wing|🐦‍⬛ black_bird|🪿 goose|🐦‍🔥 phoenix|🐸 frog|🐊 crocodile|🐢 turtle|🦎 lizard|🐍 snake|🐲 dragon_face|🐉 dragon|🦕 sauropod|🦖 t-rex|🐳 whale|🐋 whale2|🐬 dolphin|🦭 seal|🐟 fish|🐠 tropical_fish|🐡 blowfish|🦈 shark|🐙 octopus|🐚 shell|🪸 coral|🪼 jellyfish|🦀 crab|🦞 lobster|🦐 shrimp|🦑 squid|🦪 oyster|🐌 snail|🦋 butterfly|🐛 bug|🐜 ant|🐝 bee|🪲 beetle|🐞 ladybug|🦗 cricket|🪳 cockroach|🕷️ spider|🕸️ spider_web|🦂 scorpion|🦟 mosquito|🪰 fly|🪱 worm|🦠 microbe|💐 bouquet|🌸 cherry_blossom|💮 white_flower|🪷 lotus|🏵️ rosette|🌹 rose|🥀 wilted_flower|🌺 hibiscus|🌻 sunflower|🌼 blossom|🌷 tulip|🪻 hyacinth|🌱 seedling|🪴 potted_plant|🌲 evergreen_tree|🌳 deciduous_tree|🌴 palm_tree|🌵 cactus|🌾 ear_of_rice|🌿 herb|☘️ shamrock|🍀 four_leaf_clover|🍁 maple_leaf|🍂 fallen_leaf|🍃 leaves|🪹 empty_nest|🪺 nest_with_eggs|🍄 mushroom|🪾 leafless_tree'},
  {id:'food',label:'음식·음료',s:'🍇 grapes|🍈 melon|🍉 watermelon|🍊 tangerine|🍋 lemon|🍋‍🟩 lime|🍌 banana|🍍 pineapple|🥭 mango|🍎 apple|🍏 green_apple|🍐 pear|🍑 peach|🍒 cherries|🍓 strawberry|🫐 blueberries|🥝 kiwifruit|🍅 tomato|🫒 olive|🥥 coconut|🥑 avocado|🍆 eggplant|🥔 potato|🥕 carrot|🌽 corn|🌶️ hot_pepper|🫑 bell_pepper|🥒 cucumber|🥬 leafy_green|🥦 broccoli|🧄 garlic|🧅 onion|🥜 peanuts|🫘 beans|🌰 chestnut|🫚 ginger_root|🫛 pea_pod|🍄‍🟫 brown_mushroom|🫜 root_vegetable|🍞 bread|🥐 croissant|🥖 baguette_bread|🫓 flatbread|🥨 pretzel|🥯 bagel|🥞 pancakes|🧇 waffle|🧀 cheese_wedge|🍖 meat_on_bone|🍗 poultry_leg|🥩 cut_of_meat|🥓 bacon|🍔 hamburger|🍟 fries|🍕 pizza|🌭 hotdog|🥪 sandwich|🌮 taco|🌯 burrito|🫔 tamale|🥙 stuffed_flatbread|🧆 falafel|🥚 egg|🍳 fried_egg|🥘 shallow_pan_of_food|🍲 stew|🫕 fondue|🥣 bowl_with_spoon|🥗 green_salad|🍿 popcorn|🧈 butter|🧂 salt|🥫 canned_food|🍱 bento|🍘 rice_cracker|🍙 rice_ball|🍚 rice|🍛 curry|🍜 ramen|🍝 spaghetti|🍠 sweet_potato|🍢 oden|🍣 sushi|🍤 fried_shrimp|🍥 fish_cake|🥮 moon_cake|🍡 dango|🥟 dumpling|🥠 fortune_cookie|🥡 takeout_box|🍦 icecream|🍧 shaved_ice|🍨 ice_cream|🍩 doughnut|🍪 cookie|🎂 birthday|🍰 cake|🧁 cupcake|🥧 pie|🍫 chocolate_bar|🍬 candy|🍭 lollipop|🍮 custard|🍯 honey_pot|🍼 baby_bottle|🥛 glass_of_milk|☕ coffee|🫖 teapot|🍵 tea|🍶 sake|🍾 champagne|🍷 wine_glass|🍸 cocktail|🍹 tropical_drink|🍺 beer|🍻 beers|🥂 clinking_glasses|🥃 tumbler_glass|🫗 pouring_liquid|🥤 cup_with_straw|🧋 bubble_tea|🧃 beverage_box|🧉 mate_drink|🧊 ice_cube|🥢 chopsticks|🍽️ knife_fork_plate|🍴 fork_and_knife|🥄 spoon|🔪 hocho|🫙 jar|🏺 amphora'},
  {id:'activity',label:'활동',s:'🎃 jack_o_lantern|🎄 christmas_tree|🎆 fireworks|🎇 sparkler|🧨 firecracker|✨ sparkles|🎈 balloon|🎉 tada|🎊 confetti_ball|🎋 tanabata_tree|🎍 bamboo|🎎 dolls|🎏 flags|🎐 wind_chime|🎑 rice_scene|🧧 red_envelope|🎀 ribbon|🎁 gift|🎗️ reminder_ribbon|🎟️ admission_tickets|🎫 ticket|🎖️ medal|🏆 trophy|🏅 sports_medal|🥇 first_place_medal|🥈 second_place_medal|🥉 third_place_medal|⚽ soccer|⚾ baseball|🥎 softball|🏀 basketball|🏐 volleyball|🏈 football|🏉 rugby_football|🎾 tennis|🥏 flying_disc|🎳 bowling|🏏 cricket_bat_and_ball|🏑 field_hockey_stick_and_ball|🏒 ice_hockey_stick_and_puck|🥍 lacrosse|🏓 table_tennis_paddle_and_ball|🏸 badminton_racquet_and_shuttlecock|🥊 boxing_glove|🥋 martial_arts_uniform|🥅 goal_net|⛳ golf|⛸️ ice_skate|🎣 fishing_pole_and_fish|🤿 diving_mask|🎽 running_shirt_with_sash|🎿 ski|🛷 sled|🥌 curling_stone|🎯 dart|🪀 yo-yo|🪁 kite|🔫 gun|🎱 8ball|🔮 crystal_ball|🪄 magic_wand|🎮 video_game|🕹️ joystick|🎰 slot_machine|🎲 game_die|🧩 jigsaw|🧸 teddy_bear|🪅 pinata|🪩 mirror_ball|🪆 nesting_dolls|♠️ spades|♥️ hearts|♦️ diamonds|♣️ clubs|♟️ chess_pawn|🃏 black_joker|🀄 mahjong|🎴 flower_playing_cards|🎭 performing_arts|🖼️ frame_with_picture|🎨 art|🧵 thread|🪡 sewing_needle|🧶 yarn|🪢 knot'},
  {id:'travel',label:'여행·장소',s:'🌍 earth_africa|🌎 earth_americas|🌏 earth_asia|🌐 globe_with_meridians|🗺️ world_map|🗾 japan|🧭 compass|🏔️ snow_capped_mountain|⛰️ mountain|🌋 volcano|🗻 mount_fuji|🏕️ camping|🏖️ beach_with_umbrella|🏜️ desert|🏝️ desert_island|🏞️ national_park|🏟️ stadium|🏛️ classical_building|🏗️ building_construction|🧱 bricks|🪨 rock|🪵 wood|🛖 hut|🏘️ house_buildings|🏚️ derelict_house_building|🏠 house|🏡 house_with_garden|🏢 office|🏣 post_office|🏤 european_post_office|🏥 hospital|🏦 bank|🏨 hotel|🏩 love_hotel|🏪 convenience_store|🏫 school|🏬 department_store|🏭 factory|🏯 japanese_castle|🏰 european_castle|💒 wedding|🗼 tokyo_tower|🗽 statue_of_liberty|⛪ church|🕌 mosque|🛕 hindu_temple|🕍 synagogue|⛩️ shinto_shrine|🕋 kaaba|⛲ fountain|⛺ tent|🌁 foggy|🌃 night_with_stars|🏙️ cityscape|🌄 sunrise_over_mountains|🌅 sunrise|🌆 city_sunset|🌇 city_sunrise|🌉 bridge_at_night|♨️ hotsprings|🎠 carousel_horse|🛝 playground_slide|🎡 ferris_wheel|🎢 roller_coaster|💈 barber|🎪 circus_tent|🚂 steam_locomotive|🚃 railway_car|🚄 bullettrain_side|🚅 bullettrain_front|🚆 train2|🚇 metro|🚈 light_rail|🚉 station|🚊 tram|🚝 monorail|🚞 mountain_railway|🚋 train|🚌 bus|🚍 oncoming_bus|🚎 trolleybus|🚐 minibus|🚑 ambulance|🚒 fire_engine|🚓 police_car|🚔 oncoming_police_car|🚕 taxi|🚖 oncoming_taxi|🚗 car|🚘 oncoming_automobile|🚙 blue_car|🛻 pickup_truck|🚚 truck|🚛 articulated_lorry|🚜 tractor|🏎️ racing_car|🏍️ racing_motorcycle|🛵 motor_scooter|🦽 manual_wheelchair|🦼 motorized_wheelchair|🛺 auto_rickshaw|🚲 bike|🛴 scooter|🛹 skateboard|🛼 roller_skate|🚏 busstop|🛣️ motorway|🛤️ railway_track|🛢️ oil_drum|⛽ fuelpump|🛞 wheel|🚨 rotating_light|🚥 traffic_light|🚦 vertical_traffic_light|🛑 octagonal_sign|🚧 construction|⚓ anchor|🛟 ring_buoy|⛵ boat|🛶 canoe|🚤 speedboat|🛳️ passenger_ship|⛴️ ferry|🛥️ motor_boat|🚢 ship|✈️ airplane|🛩️ small_airplane|🛫 airplane_departure|🛬 airplane_arriving|🪂 parachute|💺 seat|🚁 helicopter|🚟 suspension_railway|🚠 mountain_cableway|🚡 aerial_tramway|🛰️ satellite|🚀 rocket|🛸 flying_saucer|🛎️ bellhop_bell|🧳 luggage|⌛ hourglass|⏳ hourglass_flowing_sand|⌚ watch|⏰ alarm_clock|⏱️ stopwatch|⏲️ timer_clock|🕰️ mantelpiece_clock|🕛 clock12|🕧 clock1230|🕐 clock1|🕜 clock130|🕑 clock2|🕝 clock230|🕒 clock3|🕞 clock330|🕓 clock4|🕟 clock430|🕔 clock5|🕠 clock530|🕕 clock6|🕡 clock630|🕖 clock7|🕢 clock730|🕗 clock8|🕣 clock830|🕘 clock9|🕤 clock930|🕙 clock10|🕥 clock1030|🕚 clock11|🕦 clock1130|🌑 new_moon|🌒 waxing_crescent_moon|🌓 first_quarter_moon|🌔 moon|🌕 full_moon|🌖 waning_gibbous_moon|🌗 last_quarter_moon|🌘 waning_crescent_moon|🌙 crescent_moon|🌚 new_moon_with_face|🌛 first_quarter_moon_with_face|🌜 last_quarter_moon_with_face|🌡️ thermometer|☀️ sunny|🌝 full_moon_with_face|🌞 sun_with_face|🪐 ringed_planet|⭐ star|🌟 star2|🌠 stars|🌌 milky_way|☁️ cloud|⛅ partly_sunny|⛈️ thunder_cloud_and_rain|🌤️ mostly_sunny|🌥️ barely_sunny|🌦️ partly_sunny_rain|🌧️ rain_cloud|🌨️ snow_cloud|🌩️ lightning|🌪️ tornado|🌫️ fog|🌬️ wind_blowing_face|🌀 cyclone|🌈 rainbow|🌂 closed_umbrella|☂️ umbrella|☔ umbrella_with_rain_drops|⛱️ umbrella_on_ground|⚡ zap|❄️ snowflake|☃️ snowman|⛄ snowman_without_snow|☄️ comet|🔥 fire|💧 droplet|🌊 ocean'},
  {id:'object',label:'사물',s:'👓 eyeglasses|🕶️ dark_sunglasses|🥽 goggles|🥼 lab_coat|🦺 safety_vest|👔 necktie|👕 shirt|👖 jeans|🧣 scarf|🧤 gloves|🧥 coat|🧦 socks|👗 dress|👘 kimono|🥻 sari|🩱 one-piece_swimsuit|🩲 briefs|🩳 shorts|👙 bikini|👚 womans_clothes|🪭 folding_hand_fan|👛 purse|👜 handbag|👝 pouch|🛍️ shopping_bags|🎒 school_satchel|🩴 thong_sandal|👞 mans_shoe|👟 athletic_shoe|🥾 hiking_boot|🥿 womans_flat_shoe|👠 high_heel|👡 sandal|🩰 ballet_shoes|👢 boot|🪮 hair_pick|👑 crown|👒 womans_hat|🎩 tophat|🎓 mortar_board|🧢 billed_cap|🪖 military_helmet|⛑️ helmet_with_white_cross|📿 prayer_beads|💄 lipstick|💍 ring|💎 gem|🔇 mute|🔈 speaker|🔉 sound|🔊 loud_sound|📢 loudspeaker|📣 mega|📯 postal_horn|🔔 bell|🔕 no_bell|🎼 musical_score|🎵 musical_note|🎶 notes|🎙️ studio_microphone|🎚️ level_slider|🎛️ control_knobs|🎤 microphone|🎧 headphones|📻 radio|🎷 saxophone|🪗 accordion|🎸 guitar|🎹 musical_keyboard|🎺 trumpet|🎻 violin|🪕 banjo|🥁 drum_with_drumsticks|🪘 long_drum|🪇 maracas|🪈 flute|🪉 harp|📱 iphone|📲 calling|☎️ phone|📞 telephone_receiver|📟 pager|📠 fax|🔋 battery|🪫 low_battery|🔌 electric_plug|💻 computer|🖥️ desktop_computer|🖨️ printer|⌨️ keyboard|🖱️ three_button_mouse|🖲️ trackball|💽 minidisc|💾 floppy_disk|💿 cd|📀 dvd|🧮 abacus|🎥 movie_camera|🎞️ film_frames|📽️ film_projector|🎬 clapper|📺 tv|📷 camera|📸 camera_with_flash|📹 video_camera|📼 vhs|🔍 mag|🔎 mag_right|🕯️ candle|💡 bulb|🔦 flashlight|🏮 izakaya_lantern|🪔 diya_lamp|📔 notebook_with_decorative_cover|📕 closed_book|📖 book|📗 green_book|📘 blue_book|📙 orange_book|📚 books|📓 notebook|📒 ledger|📃 page_with_curl|📜 scroll|📄 page_facing_up|📰 newspaper|🗞️ rolled_up_newspaper|📑 bookmark_tabs|🔖 bookmark|🏷️ label|💰 moneybag|🪙 coin|💴 yen|💵 dollar|💶 euro|💷 pound|💸 money_with_wings|💳 credit_card|🧾 receipt|💹 chart|✉️ email|📧 e-mail|📨 incoming_envelope|📩 envelope_with_arrow|📤 outbox_tray|📥 inbox_tray|📦 package|📫 mailbox|📪 mailbox_closed|📬 mailbox_with_mail|📭 mailbox_with_no_mail|📮 postbox|🗳️ ballot_box_with_ballot|✏️ pencil2|✒️ black_nib|🖋️ lower_left_fountain_pen|🖊️ lower_left_ballpoint_pen|🖌️ lower_left_paintbrush|🖍️ lower_left_crayon|📝 memo|💼 briefcase|📁 file_folder|📂 open_file_folder|🗂️ card_index_dividers|📅 date|📆 calendar|🗒️ spiral_note_pad|🗓️ spiral_calendar_pad|📇 card_index|📈 chart_with_upwards_trend|📉 chart_with_downwards_trend|📊 bar_chart|📋 clipboard|📌 pushpin|📍 round_pushpin|📎 paperclip|🖇️ linked_paperclips|📏 straight_ruler|📐 triangular_ruler|✂️ scissors|🗃️ card_file_box|🗄️ file_cabinet|🗑️ wastebasket|🔒 lock|🔓 unlock|🔏 lock_with_ink_pen|🔐 closed_lock_with_key|🔑 key|🗝️ old_key|🔨 hammer|🪓 axe|⛏️ pick|⚒️ hammer_and_pick|🛠️ hammer_and_wrench|🗡️ dagger_knife|⚔️ crossed_swords|💣 bomb|🪃 boomerang|🏹 bow_and_arrow|🛡️ shield|🪚 carpentry_saw|🔧 wrench|🪛 screwdriver|🔩 nut_and_bolt|⚙️ gear|🗜️ compression|⚖️ scales|🦯 probing_cane|🔗 link|⛓️‍💥 broken_chain|⛓️ chains|🪝 hook|🧰 toolbox|🧲 magnet|🪜 ladder|🪏 shovel|⚗️ alembic|🧪 test_tube|🧫 petri_dish|🧬 dna|🔬 microscope|🔭 telescope|📡 satellite_antenna|💉 syringe|🩸 drop_of_blood|💊 pill|🩹 adhesive_bandage|🩼 crutch|🩺 stethoscope|🩻 x-ray|🚪 door|🛗 elevator|🪞 mirror|🪟 window|🛏️ bed|🛋️ couch_and_lamp|🪑 chair|🚽 toilet|🪠 plunger|🚿 shower|🛁 bathtub|🪤 mouse_trap|🪒 razor|🧴 lotion_bottle|🧷 safety_pin|🧹 broom|🧺 basket|🧻 roll_of_paper|🪣 bucket|🧼 soap|🫧 bubbles|🪥 toothbrush|🧽 sponge|🧯 fire_extinguisher|🛒 shopping_trolley|🚬 smoking|⚰️ coffin|🪦 headstone|⚱️ funeral_urn|🧿 nazar_amulet|🪬 hamsa|🗿 moyai|🪧 placard|🪪 identification_card'},
  {id:'symbol',label:'기호',s:'🏧 atm|🚮 put_litter_in_its_place|🚰 potable_water|♿ wheelchair|🚹 mens|🚺 womens|🚻 restroom|🚼 baby_symbol|🚾 wc|🛂 passport_control|🛃 customs|🛄 baggage_claim|🛅 left_luggage|⚠️ warning|🚸 children_crossing|⛔ no_entry|🚫 no_entry_sign|🚳 no_bicycles|🚭 no_smoking|🚯 do_not_litter|🚱 non-potable_water|🚷 no_pedestrians|📵 no_mobile_phones|🔞 underage|☢️ radioactive_sign|☣️ biohazard_sign|⬆️ arrow_up|↗️ arrow_upper_right|➡️ arrow_right|↘️ arrow_lower_right|⬇️ arrow_down|↙️ arrow_lower_left|⬅️ arrow_left|↖️ arrow_upper_left|↕️ arrow_up_down|↔️ left_right_arrow|↩️ leftwards_arrow_with_hook|↪️ arrow_right_hook|⤴️ arrow_heading_up|⤵️ arrow_heading_down|🔃 arrows_clockwise|🔄 arrows_counterclockwise|🔙 back|🔚 end|🔛 on|🔜 soon|🔝 top|🛐 place_of_worship|⚛️ atom_symbol|🕉️ om_symbol|✡️ star_of_david|☸️ wheel_of_dharma|☯️ yin_yang|✝️ latin_cross|☦️ orthodox_cross|☪️ star_and_crescent|☮️ peace_symbol|🕎 menorah_with_nine_branches|🔯 six_pointed_star|🪯 khanda|♈ aries|♉ taurus|♊ gemini|♋ cancer|♌ leo|♍ virgo|♎ libra|♏ scorpius|♐ sagittarius|♑ capricorn|♒ aquarius|♓ pisces|⛎ ophiuchus|🔀 twisted_rightwards_arrows|🔁 repeat|🔂 repeat_one|▶️ arrow_forward|⏩ fast_forward|⏭️ black_right_pointing_double_triangle_with_vertical_bar|⏯️ black_right_pointing_triangle_with_double_vertical_bar|◀️ arrow_backward|⏪ rewind|⏮️ black_left_pointing_double_triangle_with_vertical_bar|🔼 arrow_up_small|⏫ arrow_double_up|🔽 arrow_down_small|⏬ arrow_double_down|⏸️ double_vertical_bar|⏹️ black_square_for_stop|⏺️ black_circle_for_record|⏏️ eject|🎦 cinema|🔅 low_brightness|🔆 high_brightness|📶 signal_strength|🛜 wireless|📳 vibration_mode|📴 mobile_phone_off|♀️ female_sign|♂️ male_sign|⚧️ transgender_symbol|✖️ heavy_multiplication_x|➕ heavy_plus_sign|➖ heavy_minus_sign|➗ heavy_division_sign|🟰 heavy_equals_sign|♾️ infinity|‼️ bangbang|⁉️ interrobang|❓ question|❔ grey_question|❕ grey_exclamation|❗ exclamation|〰️ wavy_dash|💱 currency_exchange|💲 heavy_dollar_sign|⚕️ medical_symbol|♻️ recycle|⚜️ fleur_de_lis|🔱 trident|📛 name_badge|🔰 beginner|⭕ o|✅ white_check_mark|☑️ ballot_box_with_check|✔️ heavy_check_mark|❌ x|❎ negative_squared_cross_mark|➰ curly_loop|➿ loop|〽️ part_alternation_mark|✳️ eight_spoked_asterisk|✴️ eight_pointed_black_star|❇️ sparkle|©️ copyright|®️ registered|™️ tm|🫟 splatter|#️⃣ hash|*️⃣ keycap_star|0️⃣ zero|1️⃣ one|2️⃣ two|3️⃣ three|4️⃣ four|5️⃣ five|6️⃣ six|7️⃣ seven|8️⃣ eight|9️⃣ nine|🔟 keycap_ten|🔠 capital_abcd|🔡 abcd|🔢 1234|🔣 symbols|🔤 abc|🅰️ a|🆎 ab|🅱️ b|🆑 cl|🆒 cool|🆓 free|ℹ️ information_source|🆔 id|Ⓜ️ m|🆕 new|🆖 ng|🅾️ o2|🆗 ok|🅿️ parking|🆘 sos|🆙 up|🆚 vs|🈁 koko|🈂️ sa|🈷️ u6708|🈶 u6709|🈯 u6307|🉐 ideograph_advantage|🈹 u5272|🈚 u7121|🈲 u7981|🉑 accept|🈸 u7533|🈴 u5408|🈳 u7a7a|㊗️ congratulations|㊙️ secret|🈺 u55b6|🈵 u6e80|🔴 red_circle|🟠 large_orange_circle|🟡 large_yellow_circle|🟢 large_green_circle|🔵 large_blue_circle|🟣 large_purple_circle|🟤 large_brown_circle|⚫ black_circle|⚪ white_circle|🟥 large_red_square|🟧 large_orange_square|🟨 large_yellow_square|🟩 large_green_square|🟦 large_blue_square|🟪 large_purple_square|🟫 large_brown_square|⬛ black_large_square|⬜ white_large_square|◼️ black_medium_square|◻️ white_medium_square|◾ black_medium_small_square|◽ white_medium_small_square|▪️ black_small_square|▫️ white_small_square|🔶 large_orange_diamond|🔷 large_blue_diamond|🔸 small_orange_diamond|🔹 small_blue_diamond|🔺 small_red_triangle|🔻 small_red_triangle_down|💠 diamond_shape_with_a_dot_inside|🔘 radio_button|🔳 white_square_button|🔲 black_square_button'},
  {id:'flag',label:'깃발',s:'🏁 checkered_flag|🚩 triangular_flag_on_post|🎌 crossed_flags|🏴 waving_black_flag|🏳️ waving_white_flag|🏳️‍🌈 rainbow-flag|🏳️‍⚧️ transgender_flag|🏴‍☠️ pirate_flag|🇦🇨 flag-ac|🇦🇩 flag-ad|🇦🇪 flag-ae|🇦🇫 flag-af|🇦🇬 flag-ag|🇦🇮 flag-ai|🇦🇱 flag-al|🇦🇲 flag-am|🇦🇴 flag-ao|🇦🇶 flag-aq|🇦🇷 flag-ar|🇦🇸 flag-as|🇦🇹 flag-at|🇦🇺 flag-au|🇦🇼 flag-aw|🇦🇽 flag-ax|🇦🇿 flag-az|🇧🇦 flag-ba|🇧🇧 flag-bb|🇧🇩 flag-bd|🇧🇪 flag-be|🇧🇫 flag-bf|🇧🇬 flag-bg|🇧🇭 flag-bh|🇧🇮 flag-bi|🇧🇯 flag-bj|🇧🇱 flag-bl|🇧🇲 flag-bm|🇧🇳 flag-bn|🇧🇴 flag-bo|🇧🇶 flag-bq|🇧🇷 flag-br|🇧🇸 flag-bs|🇧🇹 flag-bt|🇧🇻 flag-bv|🇧🇼 flag-bw|🇧🇾 flag-by|🇧🇿 flag-bz|🇨🇦 flag-ca|🇨🇨 flag-cc|🇨🇩 flag-cd|🇨🇫 flag-cf|🇨🇬 flag-cg|🇨🇭 flag-ch|🇨🇮 flag-ci|🇨🇰 flag-ck|🇨🇱 flag-cl|🇨🇲 flag-cm|🇨🇳 cn|🇨🇴 flag-co|🇨🇵 flag-cp|🇨🇶 flag-sark|🇨🇷 flag-cr|🇨🇺 flag-cu|🇨🇻 flag-cv|🇨🇼 flag-cw|🇨🇽 flag-cx|🇨🇾 flag-cy|🇨🇿 flag-cz|🇩🇪 de|🇩🇬 flag-dg|🇩🇯 flag-dj|🇩🇰 flag-dk|🇩🇲 flag-dm|🇩🇴 flag-do|🇩🇿 flag-dz|🇪🇦 flag-ea|🇪🇨 flag-ec|🇪🇪 flag-ee|🇪🇬 flag-eg|🇪🇭 flag-eh|🇪🇷 flag-er|🇪🇸 es|🇪🇹 flag-et|🇪🇺 flag-eu|🇫🇮 flag-fi|🇫🇯 flag-fj|🇫🇰 flag-fk|🇫🇲 flag-fm|🇫🇴 flag-fo|🇫🇷 fr|🇬🇦 flag-ga|🇬🇧 gb|🇬🇩 flag-gd|🇬🇪 flag-ge|🇬🇫 flag-gf|🇬🇬 flag-gg|🇬🇭 flag-gh|🇬🇮 flag-gi|🇬🇱 flag-gl|🇬🇲 flag-gm|🇬🇳 flag-gn|🇬🇵 flag-gp|🇬🇶 flag-gq|🇬🇷 flag-gr|🇬🇸 flag-gs|🇬🇹 flag-gt|🇬🇺 flag-gu|🇬🇼 flag-gw|🇬🇾 flag-gy|🇭🇰 flag-hk|🇭🇲 flag-hm|🇭🇳 flag-hn|🇭🇷 flag-hr|🇭🇹 flag-ht|🇭🇺 flag-hu|🇮🇨 flag-ic|🇮🇩 flag-id|🇮🇪 flag-ie|🇮🇱 flag-il|🇮🇲 flag-im|🇮🇳 flag-in|🇮🇴 flag-io|🇮🇶 flag-iq|🇮🇷 flag-ir|🇮🇸 flag-is|🇮🇹 it|🇯🇪 flag-je|🇯🇲 flag-jm|🇯🇴 flag-jo|🇯🇵 jp|🇰🇪 flag-ke|🇰🇬 flag-kg|🇰🇭 flag-kh|🇰🇮 flag-ki|🇰🇲 flag-km|🇰🇳 flag-kn|🇰🇵 flag-kp|🇰🇷 kr|🇰🇼 flag-kw|🇰🇾 flag-ky|🇰🇿 flag-kz|🇱🇦 flag-la|🇱🇧 flag-lb|🇱🇨 flag-lc|🇱🇮 flag-li|🇱🇰 flag-lk|🇱🇷 flag-lr|🇱🇸 flag-ls|🇱🇹 flag-lt|🇱🇺 flag-lu|🇱🇻 flag-lv|🇱🇾 flag-ly|🇲🇦 flag-ma|🇲🇨 flag-mc|🇲🇩 flag-md|🇲🇪 flag-me|🇲🇫 flag-mf|🇲🇬 flag-mg|🇲🇭 flag-mh|🇲🇰 flag-mk|🇲🇱 flag-ml|🇲🇲 flag-mm|🇲🇳 flag-mn|🇲🇴 flag-mo|🇲🇵 flag-mp|🇲🇶 flag-mq|🇲🇷 flag-mr|🇲🇸 flag-ms|🇲🇹 flag-mt|🇲🇺 flag-mu|🇲🇻 flag-mv|🇲🇼 flag-mw|🇲🇽 flag-mx|🇲🇾 flag-my|🇲🇿 flag-mz|🇳🇦 flag-na|🇳🇨 flag-nc|🇳🇪 flag-ne|🇳🇫 flag-nf|🇳🇬 flag-ng|🇳🇮 flag-ni|🇳🇱 flag-nl|🇳🇴 flag-no|🇳🇵 flag-np|🇳🇷 flag-nr|🇳🇺 flag-nu|🇳🇿 flag-nz|🇴🇲 flag-om|🇵🇦 flag-pa|🇵🇪 flag-pe|🇵🇫 flag-pf|🇵🇬 flag-pg|🇵🇭 flag-ph|🇵🇰 flag-pk|🇵🇱 flag-pl|🇵🇲 flag-pm|🇵🇳 flag-pn|🇵🇷 flag-pr|🇵🇸 flag-ps|🇵🇹 flag-pt|🇵🇼 flag-pw|🇵🇾 flag-py|🇶🇦 flag-qa|🇷🇪 flag-re|🇷🇴 flag-ro|🇷🇸 flag-rs|🇷🇺 ru|🇷🇼 flag-rw|🇸🇦 flag-sa|🇸🇧 flag-sb|🇸🇨 flag-sc|🇸🇩 flag-sd|🇸🇪 flag-se|🇸🇬 flag-sg|🇸🇭 flag-sh|🇸🇮 flag-si|🇸🇯 flag-sj|🇸🇰 flag-sk|🇸🇱 flag-sl|🇸🇲 flag-sm|🇸🇳 flag-sn|🇸🇴 flag-so|🇸🇷 flag-sr|🇸🇸 flag-ss|🇸🇹 flag-st|🇸🇻 flag-sv|🇸🇽 flag-sx|🇸🇾 flag-sy|🇸🇿 flag-sz|🇹🇦 flag-ta|🇹🇨 flag-tc|🇹🇩 flag-td|🇹🇫 flag-tf|🇹🇬 flag-tg|🇹🇭 flag-th|🇹🇯 flag-tj|🇹🇰 flag-tk|🇹🇱 flag-tl|🇹🇲 flag-tm|🇹🇳 flag-tn|🇹🇴 flag-to|🇹🇷 flag-tr|🇹🇹 flag-tt|🇹🇻 flag-tv|🇹🇼 flag-tw|🇹🇿 flag-tz|🇺🇦 flag-ua|🇺🇬 flag-ug|🇺🇲 flag-um|🇺🇳 flag-un|🇺🇸 us|🇺🇾 flag-uy|🇺🇿 flag-uz|🇻🇦 flag-va|🇻🇨 flag-vc|🇻🇪 flag-ve|🇻🇬 flag-vg|🇻🇮 flag-vi|🇻🇳 flag-vn|🇻🇺 flag-vu|🇼🇫 flag-wf|🇼🇸 flag-ws|🇽🇰 flag-xk|🇾🇪 flag-ye|🇾🇹 flag-yt|🇿🇦 flag-za|🇿🇲 flag-zm|🇿🇼 flag-zw|🏴󠁧󠁢󠁥󠁮󠁧󠁿 flag-england|🏴󠁧󠁢󠁳󠁣󠁴󠁿 flag-scotland|🏴󠁧󠁢󠁷󠁬󠁳󠁿 flag-wales'}
];
let EMOJI_IDX=null;
function emojiList(cid){
  if(!EMOJI_IDX){EMOJI_IDX={};EMOJI_CATS.forEach(c=>{
    EMOJI_IDX[c.id]=c.s.split('|').map(t=>{const i=t.indexOf(' ');return{e:t.slice(0,i),k:t.slice(i+1)};});});}
  return EMOJI_IDX[cid]||[];
}
function avOf(pid){
  const a=(S.accounts||{})[pid]||{};
  const ic=String(a.avIcon||'');
  return{color:a.avColor||'',icon:(ic&&ic!=='person'&&ic.length<=12)?ic:''};   /* 빈 값 = 기본 사람 아이콘 */
}
const AV_DFLT='<svg class="av-ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#av-person"></use></svg>';
function avInner(icon){return icon?'<span class="av-em">'+esc(icon)+'</span>':AV_DFLT;}
function avHTML(pid,cls){
  const{color,icon}=avOf(pid);
  return '<div class="'+(cls||'fbu-av')+' av-cus" style="--avc:'+esc(colBg(color||ownColor(pid)))+'">'
    +avInner(icon)+'</div>';
}
/* 담당자 자동 색 — 명부 순서에 따라 안정적으로 배정 */
const OWN_PAL=['#3E71D2','#16A34A','#D97706','#DC2626','#7C5CD6','#0EA5E9','#DB2777','#65A30D','#EA580C','#0D9488'];
/* 633차 무지개(재미용 기본색) — 색 파이프에 특수 토큰 'rainbow' 하나를 흘린다.
   background 를 받는 자리는 colBg() 로 그라디언트를, 단색만 받는 자리는 없다(FC 이벤트는
   아래 eventDidMount 훅이 배경을 직접 칠한다). isLightColor('rainbow')=false → 흰 글자. */
const RAINBOW_BG='linear-gradient(135deg,#F43F5E 0%,#F59E0B 17%,#FACC15 33%,#22C55E 50%,#3B82F6 67%,#8B5CF6 83%,#F43F5E 100%)';
const RB_ANIM='rainbow-anim';   /* 677차: 무지개 두 종 — 'rainbow'(고정) · 'rainbow-anim'(흐름).
   ⚠ 서버 규칙의 color 는 16자 이내 문자열이면 통과하므로 규칙 변경은 없다.
   ⚠ 애니메이션 쪽은 사용자가 **직접 고른** 장식이므로 OS 동작 줄이기(prefers-reduced-motion)에도 멈추지 않는다.
      고정 무지개가 그 설정을 위한 선택지다. */
function isRainbow(c){return c==='rainbow'||c===RB_ANIM;}
/* 678차: 그라디언트 계열 — 무지개와 같은 자리(색 파이프)를 쓰는 특수 토큰이다.
   ⚠ 토큰은 16자 이내여야 한다(서버 규칙 color 제한). 'grad-xx' 는 7자다.
   ⚠ 값을 여기서만 정하고 CSS 는 클래스로 받는다 — 종류가 고정 7개라 인라인이 필요 없다.
      막대는 `ev-g-{id}` 가 --gb 변수를 채우고, 색 원·팔레트 칩은 colBg() 문자열을 그대로 쓴다.
   ⚠ 684차: 683차에 한 번 걷어냈다가 되살렸다. 그리기·흐름은 이제 막대가 아니라 ::after 가 맡는다. */
const GRADS={
  'grad-rd':'linear-gradient(135deg,#FB7185 0%,#EF4444 38%,#F97316 72%,#FB7185 100%)',
  'grad-og':'linear-gradient(135deg,#FBBF24 0%,#F97316 38%,#EF4444 72%,#FBBF24 100%)',
  'grad-yl':'linear-gradient(135deg,#FDE68A 0%,#FACC15 38%,#A3E635 72%,#FDE68A 100%)',
  'grad-gr':'linear-gradient(135deg,#34D399 0%,#22C55E 38%,#14B8A6 72%,#34D399 100%)',
  'grad-bl':'linear-gradient(135deg,#38BDF8 0%,#3B82F6 38%,#6366F1 72%,#38BDF8 100%)',
  'grad-nv':'linear-gradient(135deg,#6366F1 0%,#4338CA 38%,#7C3AED 72%,#6366F1 100%)',
  'grad-pp':'linear-gradient(135deg,#A78BFA 0%,#8B5CF6 38%,#EC4899 72%,#A78BFA 100%)'
};
const GRAD_ANIM='-anim';   /* 679차: 그라디언트도 고정·흐름 두 벌 — 'grad-bl' / 'grad-bl-anim' (12자, 규칙 16자 제한 안) */
function gradBase(c){const t=String(c||'');return t.endsWith(GRAD_ANIM)?t.slice(0,-GRAD_ANIM.length):t;}
function isGrad(c){return Object.prototype.hasOwnProperty.call(GRADS,gradBase(c));}
function isGradAnim(c){return isGrad(c)&&String(c||'').endsWith(GRAD_ANIM);}
/* 흐름(움직임)을 켜는 색인지 — 무지개·그라디언트가 같은 판정을 쓴다 */
function isFlow(c){return c===RB_ANIM||isGradAnim(c);}
/* 밝은 그라디언트는 흰 글자가 안 읽힌다 — 노랑만 어두운 글자로 넘긴다(isLightColor 는 hex 만 판정한다) */
const GRAD_LIGHT={'grad-yl':1};
function isLightBg(c){return isGrad(c)?!!GRAD_LIGHT[gradBase(c)]:isLightColor(c);}
function colBg(c){return isRainbow(c)?RAINBOW_BG:(isGrad(c)?GRADS[gradBase(c)]:c);}
/* 687차: SVG fill 은 CSS 그라디언트 문자열을 못 받는다(fill="grad-rd" → 검정). 지도 점은 <linearGradient> 로 받는다.
   정지점은 colBg() 문자열에서 그대로 옮긴다 — 값의 진실은 GRADS·RAINBOW_BG 한 곳뿐이다.
   pfx 는 svg id 로 가른다(카드 okmSvg · 모달 okmBig 이 한 문서에 같이 있어 id 가 겹치면 한쪽이 못 찾는다). */
function colSvgKey(c){return isRainbow(c)?'rainbow':isGrad(c)?gradBase(c):'';}
function colSvgFill(c,pfx){const k=colSvgKey(c);return k?'url(#'+pfx+'-'+k+')':c;}
function colSvgDefs(cols,pfx){
  const seen={};let s='';
  cols.forEach(c=>{const k=colSvgKey(c);if(!k||seen[k])return;seen[k]=1;
    const st=[];String(colBg(c)).replace(/(#[0-9A-Fa-f]{6})\s+(\d+)%/g,(m,h,q)=>{st.push('<stop offset="'+q+'%" stop-color="'+h+'"/>');return m;});
    s+='<linearGradient id="'+pfx+'-'+k+'" x1="0" y1="0" x2="1" y2="1">'+st.join('')+'</linearGradient>';});
  return s?'<defs>'+s+'</defs>':'';
}
function ownColor(pid){
  if(!pid)return PAL[0];
  /* 프로필에서 고른 색이 있으면 그 색을 쓴다 — 노란 프로필인데 보라 업무로 뜨면 헷갈린다 */
  const av=(S.accounts&&S.accounts[pid])||{};
  if(av.avColor)return av.avColor;
  const list=roster();const i=list.findIndex(p=>p.id===pid);
  return i<0?PAL[0]:OWN_PAL[i%OWN_PAL.length];
}
function ownName(pid){const p=roster().find(x=>x.id===pid);return p?p.name:'';}
/* 로그인한 본인이 담당자 명단에 있으면 {uid:1} 로 — 없으면 팀 공통({}) */
function meOwner(){
  const id=S.user&&S.user.uid;
  return (id&&roster().some(p=>p.id===id))?{[id]:1}:{};
}
function planOwners(p){
  const o=Object.keys((p&&p.owners)||{});
  if(o.length)return o;
  return p&&p.owner?[p.owner]:[];   /* 구버전 단일 담당자 호환 */
}
/* 공통 업무(담당자 없음)의 기본색 — 232차: 구분은 **속 빈 막대(2안)** 가 담당하므로 색은 파랑으로 되돌린다.
   계정 업무는 전부 꽉 찬 막대라 같은 파랑이어도 채움 여부로 갈린다(사용자 지시). */
const TEAM_COLOR='#3E71D2';
function planColor(p){
  if(p.color&&p.color!=='auto')return p.color;
  const o=planOwners(p);
  return o.length?ownColor(o[0]):TEAM_COLOR;
}
/* 상태는 진행·완료에 보류(3)를 더한 셋. 보류는 아침 확인에서 넘긴 업무 — 옛 데이터의 예정(0)은 진행으로 본다 */
const ST_PICK=[['1','진행'],['2','완료'],['3','보류']];
/* 링크 최대 길이 — 원드라이브·쉐어포인트 공유 링크는 한글 경로가 퍼센트 인코딩되어 길다.
   ⚠ 이 값을 바꾸면 database.rules.json 의 links/url 한도(<=2000)도 같이 바꿔야 한다 */
const LINK_MAX=2000;
const WIDGET_URL='https://github.com/dongyexn/plan/releases/latest/download/HPlanWidgetLite.exe';   /* 늘 최신 릴리스를 가리킨다 — 버전을 적을 필요가 없다. 186차부터 Lite(WebView2) 판 */
/* ── 한국 공휴일(대체공휴일 포함, 2025~2030) — 임시공휴일 지정 등 변동 시 이 표만 수정 ── */
const HOLI={
'2025-01-01':'신정','2025-01-27':'임시공휴일','2025-01-28':'설날 연휴','2025-01-29':'설날','2025-01-30':'설날 연휴','2025-03-01':'삼일절','2025-03-03':'대체공휴일','2025-05-05':'어린이날·석가탄신일','2025-05-06':'대체공휴일','2025-06-03':'임시공휴일','2025-06-06':'현충일','2025-08-15':'광복절','2025-10-03':'개천절','2025-10-05':'추석 연휴','2025-10-06':'추석','2025-10-07':'추석 연휴','2025-10-08':'대체공휴일','2025-10-09':'한글날','2025-12-25':'성탄절',
'2026-01-01':'신정','2026-02-16':'설날 연휴','2026-02-17':'설날','2026-02-18':'설날 연휴','2026-03-01':'삼일절','2026-03-02':'대체공휴일','2026-05-05':'어린이날','2026-05-24':'석가탄신일','2026-05-25':'대체공휴일','2026-06-06':'현충일','2026-08-15':'광복절','2026-08-17':'대체공휴일','2026-09-24':'추석 연휴','2026-09-25':'추석','2026-09-26':'추석 연휴','2026-10-03':'개천절','2026-10-05':'대체공휴일','2026-10-09':'한글날','2026-12-25':'성탄절',
'2027-01-01':'신정','2027-02-06':'설날 연휴','2027-02-07':'설날','2027-02-08':'설날 연휴','2027-02-09':'대체공휴일','2027-03-01':'삼일절','2027-05-05':'어린이날','2027-05-13':'석가탄신일','2027-06-06':'현충일','2027-08-15':'광복절','2027-08-16':'대체공휴일','2027-09-14':'추석 연휴','2027-09-15':'추석','2027-09-16':'추석 연휴','2027-10-03':'개천절','2027-10-04':'대체공휴일','2027-10-09':'한글날','2027-10-11':'대체공휴일','2027-12-25':'성탄절','2027-12-27':'대체공휴일',
'2028-01-01':'신정','2028-01-26':'설날 연휴','2028-01-27':'설날','2028-01-28':'설날 연휴','2028-03-01':'삼일절','2028-05-02':'석가탄신일','2028-05-05':'어린이날','2028-06-06':'현충일','2028-08-15':'광복절','2028-10-02':'추석 연휴','2028-10-03':'추석·개천절','2028-10-04':'추석 연휴','2028-10-05':'대체공휴일','2028-10-09':'한글날','2028-12-25':'성탄절',
'2029-01-01':'신정','2029-02-12':'설날 연휴','2029-02-13':'설날','2029-02-14':'설날 연휴','2029-03-01':'삼일절','2029-05-05':'어린이날','2029-05-07':'대체공휴일','2029-05-20':'석가탄신일','2029-05-21':'대체공휴일','2029-06-06':'현충일','2029-08-15':'광복절','2029-09-21':'추석 연휴','2029-09-22':'추석','2029-09-23':'추석 연휴','2029-09-24':'대체공휴일','2029-10-03':'개천절','2029-10-09':'한글날','2029-12-25':'성탄절',
'2030-01-01':'신정','2030-02-02':'설날 연휴','2030-02-03':'설날','2030-02-04':'설날 연휴','2030-02-05':'대체공휴일','2030-03-01':'삼일절','2030-05-05':'어린이날','2030-05-06':'대체공휴일','2030-05-09':'석가탄신일','2030-06-06':'현충일','2030-08-15':'광복절','2030-09-11':'추석 연휴','2030-09-12':'추석','2030-09-13':'추석 연휴','2030-10-03':'개천절','2030-10-09':'한글날','2030-12-25':'성탄절'};
/* 매년 반복 기념일(비공휴일 — 회색 표기) */
const ANNIV={'04-05':'식목일','05-01':'근로자의날','05-08':'어버이날','05-15':'스승의날','07-17':'제헌절','10-01':'국군의날'};
function holOf(ds){
  const off=(S.offdays||{})[ds];                 /* 팀이 정한 휴무일이 공휴일보다 앞선다 */
  if(off)return{n:String(off).slice(0,12),h:true,off:true};
  if(HOLI[ds])return{n:HOLI[ds],h:true};
  const a=ANNIV[ds.slice(5)];return a?{n:a,h:false}:null;
}
function toDate(ds){const[a,b,c]=ds.split('-').map(Number);return new Date(a,b-1,c);}
function addDays(ds,n){const d=toDate(ds);d.setDate(d.getDate()+n);return dstr(d);}
function addMonths(ds,n){const d=toDate(ds);const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+n);
  const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));return dstr(d);}
function daysBetween(a,b){return Math.round((toDate(b)-toDate(a))/86400000);}
const REC_LBL={'':'반복 없음',w:'매주','2w':'격주',m:'매월',y:'매년'};
/* 53차: 시각은 시작 하나만 쓴다 — endTime 은 폐기(옛 데이터는 무시) */
function fmtSpan(p){return p&&p.time?fmtTime(p.time):'';}
function fmtTime(t){if(!t)return'';const[h,m]=t.split(':').map(Number);const ap=h<12?'오전':'오후';const hh=h%12===0?12:h%12;return ap+' '+hh+':'+pad(m);}

/* ───── 상태 ───── */
const S={
  view:'calendar',
  snap:false,        // 스냅샷 문서로 열렸는가(dfSnapBoot) — 읽기 전용이라 정리 작업을 건너뛴다
  selDate:todayStr(),
  conn:null,      // 657차: RTDB 연결 상태(null=로컬/판정 전, true/false)
  org:{teams:[],regions:[],sites:[]},  // 팀·권역·현장 목록 (모두 {id,name}, 현장은 team·region 포함)
  offdays:{},        // calapp/offdays/<날짜> = 이름 — 단체연차 등 팀 휴무일(공휴일처럼 칠한다)
  people:{},         // calapp/people/{id}: {name,email,team,region} — id는 로그인 uid
  accounts:{},       // users/{uid}: {email,name,role} — 하자처리 현황과 공용
  tasks:{},          // {memberId:{itemId:{text,st,updatedAt}}}
  arch:{},           // 아카이브에서 읽어 온 옛 업무(풀린 상태) — ARCH.loaded 일 때만 채워진다(384차)
  cfg:{},            // 앱 설정(하자 감춘 현장 등)
  tk:{t:null,m:null},       // 업무 현황 대상 — m 은 'teamall'(기본) · 'hold'(보류함)만 쓴다
  tkDate:{open:false,ym:'',a:'',b:''},   // 날짜 칸의 기간 달력
  tkEditOcc:'',      // 반복 업무를 어느 회차 행에서 수정하는지(팝업 위치·표시용)
  tkFOpen:false,     // 왼쪽 칸 필터 펼침 여부(찾기 줄 옆 꺽쇠) — 기본은 접힘
  tkTab:'',          // 업무 현황 탭 — ''(전체) · 'team'(공통 업무) · 담당자 id(팀장 등) · 'reg:<권역id>'
  loading:false,     // 첫 데이터를 기다리는 중(캐시가 없는 첫 실행에서만 참) — 뼈대 화면을 그린다
  tkView:'week',     // 업무 현황 보기 — week(주간 업무) · month(월간 업무 · 현장별)
  tkWeek:'',         // 업무 현황이 보는 주(빈 값이면 오늘) — 이 날이 든 목~수 주기가 「완료」, 다음 주기가 「예정」
  filter:{kind:[],st:[],reg:[],own:[],site:[]},  // 달력 필터 — 모두 다중 선택(빈 배열이 '전체')
  mineYm:'',         // 내 업무 화면의 작은 달력이 보고 있는 달
  mineSel:'',        // 작은 달력에서 고른 날 — 그 날 업무를 목록에서 강조한다
  tkNew:null,        // 인라인 작성창이 열린 대상
  tkEdit:null,       // 인라인 수정 중인 업무 'sid/iid'
  tkOpen:null,       // 펼쳐 놓은 업무 'sid/iid'
  planEdit:null,     // 일자 패널 인라인 편집기 상태
  widPop:false,
  widMore:{com:false,mine:false,hold:false},   // 위젯 내 업무 팝업에서 목록을 펼쳤는지
  holdMine:false,    // 보류함을 내 업무만 보기로 좁혔는지
  dfSid:'',          // 하자 관리에서 보고 있는 현장(비면 대시보드)
  dfFold:{},         // 하자 관리 사이드바에서 접어 둔 권역
  dfTab:'sum',       // 하자 현장 화면의 탭
  dfRm:'',           // 하자 게시본 기준월(YYYY-MM)
  widSide:'',        // 위젯 헤더의 '내 업무' 팝오버 ('' / mine)
  tkF:{q:'',st:[],kind:[],site:[],own:[]},   // 업무 현황 검색·필터 — 모두 다중 선택(권역은 탭이 맡는다)
  orgTab:'acct',     // 조직 관리 좌측 보기 (acct | site)
  orgReg:'',         // 조직 관리 권역 탭 — ''(전체) · 권역 id · '_none'(권역 미지정)
  km:null,           // 현장 위치 지도 보기 상태 {vb,sel,hist} — 조직 관리 좌측 카드
  prefs:{},          // calapp/prefs/{uid} — 저장한 필터 등 개인 설정
  live:false,        // Firebase 실시간 모드 여부
  role:null,         // editor · viewer (users/{uid})
  acctDenied:false,  // users 노드 읽기 권한 없음
  user:null,
};

/* 입력 중이면 실시간 수신이 타이핑을 덮어쓰지 않도록 렌더 보류 (하자처리 현황 패턴) */
function shEditing(){const a=document.activeElement;return !!(a&&(a.tagName==='TEXTAREA'||a.tagName==='INPUT'||a.isContentEditable));}
/* 233차: 업무 수정/추가 폼이 열려 있는 동안에는 목록을 다시 그리지 않는다.
   포커스가 잠깐 폼 밖으로 나간 사이 실시간 수신이 들어오면 목록이 재정렬되며
   **수정 중인 폼이 다른 자리로 튀어** 사용자가 위치를 잃었다(사용자 지적). */
function tkFormOpen(){return !!(S.tkEdit||S.tkNew||S.planEdit);}
function tkHold(){return shEditing()||tkFormOpen();}
/* 조직 관리 표 입력 중 — 에코(구독 콜백)의 rOrg 가 입력 칸을 갈아끼워 초점을 죽인다(615차:
   준공일 연도 첫 자리 '2' 입력 → 0002-… 완전값 → change 저장 → 에코 재렌더 → 초점 소실).
   입력 중에는 PEND.org 로 미루고, 칸을 떠날 때 아래 focusout 이 몰아 그린다. */
function orgHold(){const a=document.activeElement;return !!(a&&a.closest&&a.closest('#view-org')&&a.matches('input,select,textarea'));}
const PEND={day:false,tasks:false,org:false};
/* 수정 충돌 가드(383차) — 칸에 들어갈 때의 값을 기억해 둔다.
   구독이 실시간이라 대개 최신이지만, 오래 입력하는 사이 남이 같은 칸을 고치면
   focusout 저장이 그 내용을 소리 없이 덮어쓴다 — 그때만 물어보고 덮는다 */
document.addEventListener('focusin',e=>{
  const f=e.target&&e.target.closest&&e.target.closest('[data-act="tk.field"]');
  if(f){const cur=(S.tasks[f.dataset.sid]||{})[f.dataset.iid];f.dataset.base=cur?(cur[f.dataset.f]||''):'';}
});
document.addEventListener('focusout',e=>{
  const f=e.target&&e.target.closest&&e.target.closest('[data-act="tk.field"]');
  if(f){
    const sid=f.dataset.sid,iid=f.dataset.iid,cur=(S.tasks[sid]||{})[iid];
    if(cur){
      const v=f.innerText.replace(/\u00a0/g,' ').trim();
      const now=cur[f.dataset.f]||'';
      if(f.dataset.base!==undefined&&now!==f.dataset.base&&v!==now){
        /* 입력하는 사이 남이 이 칸을 고쳤다 — 서버 값을 먼저 화면에 보이고, 덮을지 묻는다 */
        rTasks();
        confirmModal('수정이 겹쳤습니다',
          '입력하는 사이 다른 사람이 이 칸을 고쳤습니다. 내 내용으로 덮어쓸까요?',
          ()=>{const c2=(S.tasks[sid]||{})[iid];if(c2)store.putTask(sid,iid,histPush({...c2,[f.dataset.f]:v,updatedAt:Date.now()},'edit'));},
          '덮어쓰기');
      }
      else if(now!==v)store.putTask(sid,iid,histPush({...cur,[f.dataset.f]:v,updatedAt:Date.now()},'edit'));
    }
  }
  setTimeout(()=>{if(tkHold())return;
  if(PEND.day){PEND.day=false;if(!S.planEdit)rDay();refetchCal();}
  if(PEND.tasks){PEND.tasks=false;if(!S.tkNew&&!S.tkEdit)rTasks();}
  if(PEND.org){PEND.org=false;rOrg();}
},60);});

/* DB 규칙이 스키마 외 키를 거부($other:false)하므로, 저장 전에 필드를 정제한다.
   반복이 아닌 일정에 doneOn/skipOn 이 남아 들어가는 것도 여기서 걸러진다. */
/* 627차 — 업무 소유·이력. 정책: 앞으로 만드는 업무만 소유 적용(레거시 createdBy 없음 = 기존대로 전원),
   완료 체크·수정·삭제·보류 전부 작성자(또는 관리자)만. 이력은 live 에서만 최근 20건. */
function authUid(){return String((S.user||{}).uid||'');}
function myRank(){return rankOf(((S.people||{})[authUid()]||{}).rank);}
function myRegion(){return String(((S.people||{})[authUid()]||{}).region||'');}
function mySites(){return ((S.people||{})[authUid()]||{}).sites||{};}
/* 628차 확장 — 수정 권한: 관리자 ∥ 레거시 ∥ 작성자 ∥ 지정 담당자(assignees) ∥ 직급 위계
   (팀장=모든 업무 · 공구장=자기 권역 트리의 업무 · 담당자=업무의 현장(site)이 내 담당 현장).
   ownerSid = 업무가 달린 트리 주인(멤버 id). 팀 공통 트리는 people 에 없어 공구장 권역 판정에서
   자연히 제외된다(공통 업무는 작성자·담당자·팀장·관리자만). */
function canEditTask(it,ownerSid){
  if(!S.live||isEditor()||!it)return true;
  if(!it.createdBy)return true;                       /* 레거시 — 기존대로 전원 */
  const me=authUid();
  if(it.createdBy===me)return true;
  if(it.assignees&&it.assignees[me])return true;      /* 남이 만들어 줘도 담당자로 지정되면 수정 가능 */
  const rk=myRank();
  if(rk==='head')return true;                         /* 팀장: 모든 업무 */
  if(rk==='lead'){const o=(S.people||{})[ownerSid];
    if(o&&o.region&&o.region===myRegion())return true;}   /* 공구장: 자기 권역 */
  if(it.site&&mySites()[it.site])return true;         /* 담당자: 내 담당 현장의 업무 */
  return false;
}
/* 명부 배정 권한(628차) — 권역: 관리자·팀장 / 담당 현장: 관리자·팀장 전원, 공구장은 자기 권역 사람,
   담당자는 본인만(선택 범위도 자기 권역 내 — 선택창이 제한한다) */
function canAssignRegion(){return isEditor()||myRank()==='head';}
/* 담당 현장 칩+선택 버튼(628차 공용) — 조직 관리 명부와 내 계정이 같은 꼴을 쓴다.
   ⚠ 무조건 3개로 자르면 칸이 넓어도 '+1'이 뜬다 — 넣을 수 있는 만큼 다 넣고 넘칠 때만 접는다(CSS 가 판단) */
function sitesChkHTML(p){
  const can=canAssignSites(p.id);
  const list=(S.org.sites||[]).filter(x=>(p.sites||{})[x.id]);
  const shown=list.map(x=>can
    ?'<button class="site-on" data-act="acct.siteOff" data-id="'+esc(p.id)+'" data-sid="'+esc(x.id)+'" data-tip="눌러서 빼기">'+esc(x.name)+'</button>'
    :'<span class="site-on site-ro">'+esc(x.name)+'</span>').join('');
  return '<div class="site-chk">'
    +(list.length?shown:(can?'':'<span class="site-none">미지정</span>'))   /* 771차: 현장이 없을 때는 [+] 대신 「현장 추가」 글자 버튼 */
    +(can?(list.length?'<button class="site-pick" data-act="acct.sitePick" data-id="'+esc(p.id)+'" aria-label="담당 현장 선택" data-tip="담당 현장 선택"><svg class="icn"><use href="#i-plus"></use></svg></button>':'<button class="site-pick site-pick-txt" data-act="acct.sitePick" data-id="'+esc(p.id)+'"><svg class="icn"><use href="#i-plus"></use></svg>현장 추가</button>'):'')
    +'</div>';
}
function canAssignSites(pid){
  if(!S.live)return true;
  if(isEditor()||myRank()==='head')return true;
  if(myRank()==='lead'){const t=(S.people||{})[pid]||{};return !!myRegion()&&t.region===myRegion();}
  return pid===authUid();
}
function denyTask(){toast('작성자만 수정할 수 있습니다');}
function histName(){const u=authUid();
  return String(((S.people||{})[u]||{}).name||String((S.user||{}).email||'').split('@')[0]||'?').slice(0,30);}
function histPush(it,k){if(!S.live)return it;
  const h=(Array.isArray(it.hist)?it.hist:[]).slice(-19);
  h.push({t:Date.now(),u:histName(),k:String(k)});it.hist=h;return it;}
const HIST_LBL={new:'작성',edit:'수정',done:'완료',undone:'진행으로',hold:'보류',move:'날짜 이동',restore:'복원'};
/* 암호화 백업 복호(629차) — 위젯 브리지(hpw-restore-req/res) 왕복. 실패·비위젯이면 안내하고 null. */
function bkDecrypt(text){
  return new Promise(res=>{
    const ev=window.__TAURI__&&window.__TAURI__.event;
    if(!WIDGET||!ev){toast('암호화된 위젯 백업입니다 — 같은 PC 의 위젯 화면에서 되돌려 주세요');return res(null);}
    const id='r'+Date.now()+Math.random().toString(36).slice(2,6);
    let un=null,done=false;
    const fin=v=>{if(done)return;done=true;clearTimeout(to);if(un)try{un();}catch(e){}res(v);};
    const to=setTimeout(()=>{toast('위젯 응답이 없습니다 — 위젯을 다시 실행해 보세요');fin(null);},8000);
    ev.listen('hpw-restore-res',e=>{
      const p=(e&&e.payload)||{};if(p.id!==id)return;
      if(p.err||!p.json){toast('복호에 실패했습니다 — 이 PC·이 계정에서 만든 백업만 되돌릴 수 있습니다');fin(null);}
      else fin(p.json);
    }).then(u=>{un=u;ev.emit('hpw-restore-req',{id,text});})
      .catch(()=>{toast('위젯 연결에 실패했습니다');fin(null);});
  });
}
function cleanTask(t){
  const o={text:String(t.text||'').slice(0,500),st:stOf(t.st),stKeep:!!t.stKeep,
    createdAt:Number(t.createdAt)||Date.now(),updatedAt:Number(t.updatedAt)||Date.now()};
  if(t.createdBy)o.createdBy=String(t.createdBy).slice(0,64);   /* 627차: 소유 — 없으면 레거시(전원 수정) */
  if(Array.isArray(t.hist)&&t.hist.length)o.hist=t.hist.slice(-20)
    .map(h=>({t:Number(h.t)||0,u:String(h.u||'').slice(0,30),k:String(h.k||'').slice(0,10)}));
  /* 일정 성격 — 날짜가 있으면 달력에도 뜬다 */
  if(t.date)o.date=String(t.date).slice(0,10);
  if(t.end)o.end=String(t.end).slice(0,10);
  if(t.time)o.time=String(t.time).slice(0,5);
  const rf=t.recur&&t.recur.f?String(t.recur.f):'';
  if(rf){
    o.recur={f:rf,until:String((t.recur&&t.recur.until)||'')};
    if(t.doneOn&&Object.keys(t.doneOn).length)o.doneOn=t.doneOn;
    if(t.skipOn&&Object.keys(t.skipOn).length)o.skipOn=t.skipOn;
    if(t.moveOn&&Object.keys(t.moveOn).length)o.moveOn=t.moveOn;
  }
  if(t.body)o.body=String(t.body).slice(0,2000);
  if(t.prog)o.prog=String(t.prog).slice(0,2000);
  if(t.site)o.site=String(t.site).slice(0,40);
  if(kindOf(t.kind))o.kind=kindOf(t.kind);
  if(t.color)o.color=String(t.color).slice(0,16);
  if(Number.isFinite(Number(t.order)))o.order=Number(t.order);
  if(t.assignees&&Object.keys(t.assignees).length){o.assignees={};Object.keys(t.assignees).forEach(k=>{if(t.assignees[k])o.assignees[k]=1;});}
  if(t.links&&Object.keys(t.links).length){
    o.links={};
    Object.keys(t.links).forEach(k=>{const l=t.links[k]||{};
      const u=String(l.url||'').trim();
      /* ⚠ 한도 500 자는 짧았다 — 원드라이브 공유 링크가 한글 경로를 퍼센트 인코딩하면 500 자를 쉽게 넘고,
         끝에 붙는 ?d=…&csf=1&web=1&e=<공유토큰> 이 잘려 나가 열면 루트로 튕겼다(실사용 520 자 확인).
         ⚠ 입력칸 maxlength · 여기 slice · DB 규칙(links/url) 세 곳이 늘 같아야 한다 */
      if(/^https?:\/\//i.test(u))o.links[k]={url:u.slice(0,LINK_MAX),label:String(l.label||'').slice(0,80)};});
    if(!Object.keys(o.links).length)delete o.links;
  }
  return o;
}
/* ═══════════ 휴지통(383차) — 삭제는 지우지 않고 30일 보관한다 ═══════════
   원본은 lz 압축(z)으로 통째 보관 — 필드가 늘어도 DB 규칙은 안 바뀌고,
   복원할 때 cleanTask 를 다시 지나므로 tasks 스키마는 그대로 지켜진다.
   text·date 는 목록 표시용 평문. 30일 지난 항목은 접속 때 누구나 정리한다. */
const TRASH_KEEP=30*24*3600*1000;
function trashWrap(it){return{text:String(it.text||'').slice(0,500),date:String(it.date||''),
  deletedAt:Date.now(),z:LZString.compressToBase64(JSON.stringify(cleanTask(it)))};}
function trashAll(cb){                 /* {sid:{iid:wrap}} — 구독하지 않고 열 때마다 읽는다 */
  if(!S.live){cb((LocalStore._d&&LocalStore._d.trash)||{});return;}
  FB.db.ref('calapp/trash').get().then(s=>cb(s.val()||{})).catch(e=>{fbErr(e);cb({});});}
function trashDrop(sid,iid){           /* 휴지통에서 한 건 제거(복원·영구 삭제 공용) */
  if(S.live)FB.db.ref('calapp/trash/'+sid+'/'+iid).remove().catch(fbErr);
  else{if(LocalStore._d.trash&&LocalStore._d.trash[sid])delete LocalStore._d.trash[sid][iid];lsSave(LocalStore._d);}}
function trashPurge(){                 /* 30일 지난 항목 정리 — 부팅 뒤 한 번 */
  if(S.snap)return;   /* 607차: 스냅샷은 읽기 전용 문서다 — 정리를 돌리면 '저장되지 않습니다' 알림만 뜬다 */
  trashAll(t=>{const lim=Date.now()-TRASH_KEEP,up={};let n=0;
    Object.keys(t).forEach(sid=>Object.keys(t[sid]||{}).forEach(iid=>{
      const w=t[sid][iid];if(w&&Number(w.deletedAt||0)<lim){n++;
        if(S.live)up['calapp/trash/'+sid+'/'+iid]=null;else delete LocalStore._d.trash[sid][iid];}}));
    if(!n)return;
    if(S.live)FB.db.ref().update(up).catch(()=>{});else lsSave(LocalStore._d);});}
function trashOpen(){
  trashAll(t=>{
    const rows=[];
    Object.keys(t).forEach(sid=>Object.keys(t[sid]||{}).forEach(iid=>rows.push({sid,iid,...t[sid][iid]})));
    rows.sort((a,b)=>(b.deletedAt||0)-(a.deletedAt||0));
    const body=rows.length?rows.map(r=>'<div class="share-row"><div class="share-info"><b>'+esc(r.text||'제목 없음')+'</b>'
      +'<span>'+(r.date?esc(r.date)+' · ':'')+'삭제 '+new Date(Number(r.deletedAt)||0).toLocaleDateString('ko-KR')+'</span></div>'
      +'<span style="display:flex;gap:6px;flex:none">'
      +'<button class="btn bo bsm" data-act="trash.restore" data-sid="'+esc(r.sid)+'" data-iid="'+esc(r.iid)+'">복원</button>'
      +'<button class="btn bg2 bsm" data-act="trash.del" data-sid="'+esc(r.sid)+'" data-iid="'+esc(r.iid)+'">영구 삭제</button></span></div>').join('')
      :'<div style="font-size:13px;color:var(--lbl2)">비어 있습니다.</div>';
    openModal('휴지통 — 30일 보관 후 자동 삭제됩니다',body,
      '<button class="btn bg2 bsm" data-act="modal.close">닫기</button>');
  });}

/* ═══════════ 아카이브(384차) — 오래 끝난 업무를 실시간 구독 밖으로 ═══════════
   업무가 해마다 쌓이면 calapp/tasks 전량 구독이 무거워진다. 완료·종료 후 6개월이
   지난 업무를 calapp/archive 로 옮겨 두고(휴지통과 같은 wrap 모양 — z 압축 + 표시용 평문),
   달력·월별 현장을 과거로 넘기거나 찾기를 쓸 때만 통째로 한 번 읽어 합친다.
   옮겨진 업무를 건드리면(수정·상태·삭제) putTask·trashTask 가 아카이브 사본을 지워
   그 자리에서 다시 살아난다 — 두 곳에 겹쳐 남지 않는다. */
const ARCH_AFTER=180*24*3600*1000;
const ARCH={loaded:false,loading:false};
function archWrap(it){return{text:String(it.text||'').slice(0,500),date:String(it.date||''),
  archivedAt:Date.now(),z:LZString.compressToBase64(JSON.stringify(cleanTask(it)))};}
function archCutStr(){return dstr(new Date(Date.now()-ARCH_AFTER));}
/* 이동 대상 판정 — 보류(st3)와 아직 도는 반복은 남긴다. 날짜 없는 업무는 완료된 것만 */
function archDue(it,cut,cutMs){
  if(!it)return false;
  if(it.recur&&it.recur.f)return !!(it.recur.until&&String(it.recur.until)<cut);
  if(stOf(it.st)===3)return false;
  const d=it.end||it.date;
  if(d)return String(d)<cut;
  return stOf(it.st)===2&&(Number(it.updatedAt)||0)<cutMs;
}
/* 부팅 뒤 한 번 — 이동 대상을 archive 로 옮기고 원본을 지운다. 라이브는 200건씩 끊는다 */
function archMigrate(){
  if(S.snap)return;   /* 607차: 스냅샷은 읽기 전용 문서다 */
  const cut=archCutStr(),cutMs=Date.now()-ARCH_AFTER,moves=[];
  Object.keys(S.tasks||{}).forEach(sid=>Object.keys(S.tasks[sid]||{}).forEach(iid=>{
    const it=S.tasks[sid][iid];if(archDue(it,cut,cutMs))moves.push({sid,iid,it});}));
  if(!moves.length)return;
  if(!S.live){
    const d=LocalStore._d;d.archive=d.archive||{};
    moves.forEach(({sid,iid,it})=>{(d.archive[sid]=d.archive[sid]||{})[iid]=archWrap(it);delete d.tasks[sid][iid];});
    S.tasks=d.tasks;lsSave(d);rTasks();refetchCal();rDay();rWidget();return;
  }
  (async()=>{
    for(let i=0;i<moves.length;i+=200){
      const up={};moves.slice(i,i+200).forEach(({sid,iid,it})=>{
        up['calapp/archive/'+sid+'/'+iid]=archWrap(it);up['calapp/tasks/'+sid+'/'+iid]=null;});
      try{await FB.db.ref().update(up);}    /* 원본 삭제는 구독이 받아 화면에 반영한다 */
      catch(e){console.warn('[FB] 아카이브 이동 실패',e);return;}
    }
  })();
}
function archLoad(cb){
  if(ARCH.loaded){if(cb)cb();return;}
  const unpack=v=>{S.arch={};
    Object.keys(v||{}).forEach(sid=>Object.keys(v[sid]||{}).forEach(iid=>{
      try{const it=JSON.parse(LZString.decompressFromBase64((v[sid][iid]||{}).z||'')||'null');
        if(it)(S.arch[sid]=S.arch[sid]||{})[iid]=it;}catch(e){}}));
    ARCH.loaded=true;ARCH.loading=false;if(cb)cb();};
  if(!S.live){unpack((LocalStore._d&&LocalStore._d.archive)||{});return;}
  if(ARCH.loading)return;ARCH.loading=true;
  FB.db.ref('calapp/archive').get().then(s=>unpack(s.val()||{}))
    .catch(e=>{ARCH.loading=false;console.warn('[FB] 아카이브 읽기',e);});
}
/* 과거 화면·찾기가 부른다 — 범위가 아카이브 경계보다 오래됐을 때만 한 번 읽고 다시 그린다 */
function archNeed(fromStr){
  if(ARCH.loaded||ARCH.loading)return;
  if(fromStr!==undefined&&!(String(fromStr)<archCutStr()))return;
  archLoad(()=>{refetchCal();rDay();rTasks();rWidget();if(typeof rNq==='function')rNq();});
}
/* 핫(S.tasks)에 아카이브를 합친 {sid:{iid:it}} — 같은 iid 는 핫이 이긴다.
   ⚠ 반환값을 고치지 말 것 — 안 읽혔을 때는 S.tasks 그 자체를 돌려준다 */
function mergedTaskMaps(){
  if(!ARCH.loaded)return S.tasks||{};
  const out={};
  Object.keys(S.tasks||{}).forEach(sid=>{out[sid]={...S.tasks[sid]};});
  Object.keys(S.arch||{}).forEach(sid=>{out[sid]=out[sid]||{};
    Object.keys(S.arch[sid]).forEach(iid=>{if(!out[sid][iid])out[sid][iid]=S.arch[sid][iid];});});
  return out;
}

/* 선택 목록과 정렬 순서를 같은 차례로 둔다 — 팀장 · 공구장 · 담당자 · 안전 · 원가 */
const RANKS=[['head','팀장'],['lead','공구장'],['member','담당자'],['safety','안전'],['cost','원가']];
function rankOrd(v){const i=RANKS.findIndex(r=>r[0]===rankOf(v));return i<0?2:i;}
function rankOf(v){return RANKS.some(r=>r[0]===v)?v:'member';}
function rankLabel(v){const r=RANKS.find(x=>x[0]===rankOf(v));return r?r[1]:'담당자';}
/* 팀 단위 직급 — 권역에 매이지 않고 팀 전체를 본다(rankUses 의 권역·현장 없음과 같은 기준).
   ⚠ 이들을 권역으로 묶으면 '권역 미지정' 으로 떨어진다 — 팀 묶음 안에서 팀장 아래에 둔다 */
function isTeamRank(v){const r=rankOf(v);return r==='head'||r==='safety'||r==='cost';}
/* 직급별로 쓰는 칸이 다르다 — 팀장은 팀 전체를 보므로 권역·현장을 두지 않는다 */
function rankUses(v){
  const r=rankOf(v);
  /* 팀장·안전·원가는 팀 전체를 보므로 권역·현장을 두지 않는다. 공구장은 권역만, 담당자는 둘 다 */
  return{region:r==='member'||r==='lead',sites:r==='member'};
}
/* 팀장·공구장 지정은 아무나 하면 안 된다 — 관리자이거나, 이미 팀장·공구장인 사람만 */

function cleanPerson(p){
  const o={name:String(p.name||'').slice(0,60),email:String(p.email||'').slice(0,200),
    team:String(p.team||''),region:String(p.region||''),rank:rankOf(p.rank)};
  if(p.sites&&Object.keys(p.sites).length){o.sites={};Object.keys(p.sites).forEach(k=>{if(p.sites[k])o.sites[k]=1;});}
  return o;
}
function cleanOrg(org){
  const nm=x=>({id:String(x.id),name:String(x.name||'').slice(0,60)});
  return{
    teams:(org.teams||[]).filter(Boolean).map(nm),
    regions:(org.regions||[]).filter(Boolean).map(nm),
    sites:(org.sites||[]).filter(Boolean).map(x=>({...nm(x),team:String(x.team||''),region:String(x.region||''),
      units:Number(x.units)||0,buildings:Number(x.buildings)||0,commercialUnits:Number(x.commercialUnits)||0,
      completionDate:String(x.completionDate||'').slice(0,10),
      ...(x.lastUploadedAt?{lastUploadedAt:String(x.lastUploadedAt).slice(0,24)}:{})}))   /* 695차: 업데이트일 — 규칙에도 같은 필드가 열려 있다 */
  };
}

/* ═══════════ 저장소 — 로컬 ⇄ Firebase 공용 인터페이스 ═══════════ */
const LS_KEY='calapp.v1';
function lsLoad(){try{return JSON.parse(localStorage.getItem(LS_KEY))||{};}catch(e){return{};}}
function lsSave(d){try{localStorage.setItem(LS_KEY,JSON.stringify(d));}catch(e){}}

const LocalStore={
  name:'local',
  _d:null,
  init(){this._d=lsLoad();this._d.plans=this._d.plans||{};this._d.recur=this._d.recur||{};this._d.org=this._d.org||{teams:[],regions:[],sites:[]};this._d.tasks=this._d.tasks||{};this._d.cfg=this._d.cfg||{};this._d.people=this._d.people||{};this._d.prefs=this._d.prefs||{};this._d.offdays=this._d.offdays||{};
    migrateOrg(this._d);
    const moved=migratePlans(this._d)|migrateDue(this._d);
    normOrg(this._d.org);
    if(moved)lsSave(this._d);   /* 옮긴 결과를 저장하지 않으면 새로고침 때마다 되살아난다 */
    S.org=this._d.org;S.tasks=this._d.tasks;S.cfg=this._d.cfg;S.people=this._d.people;S.prefs=this._d.prefs;S.offdays=this._d.offdays;S.accounts={};
    setTimeout(trashPurge,1500);   /* 휴지통 30일 정리(383차) */
    setTimeout(archMigrate,1800);  /* 오래 끝난 업무를 보관함으로(384차) */},
  putPlan(p){const{sid,iid,item,prevSid}=planToTask(p);
    if(prevSid&&prevSid!==sid)this.putTask(prevSid,iid,null);   /* 담당자가 바뀌면 옛 소속에서 지운다 */
    this.putTask(sid,iid,item);},
  /* 사용자 삭제는 전부 여기로 — 지우지 않고 휴지통에 30일 보관한다(383차).
     아카이브에서 보이는 업무도 같은 길로 — 사본을 함께 걷는다(384차) */
  trashTask(sid,iid){const it=(S.tasks[sid]||{})[iid]||((S.arch[sid]||{})[iid]);if(!it)return;
    this._d.trash=this._d.trash||{};(this._d.trash[sid]=this._d.trash[sid]||{})[iid]=trashWrap(it);
    if(S.arch[sid]&&S.arch[sid][iid])delete S.arch[sid][iid];
    if(this._d.archive&&this._d.archive[sid])delete this._d.archive[sid][iid];
    this.putTask(sid,iid,null);},
  delPlan(ym,id){const hit=allTasks().find(x=>x.iid===id);if(hit)this.trashTask(hit.sid,hit.iid);},
  movePlan(p){this.putPlan(p);},
  putOrg(org){this._d.org=org;S.org=org;lsSave(this._d);},
  putOffday(ds,name){this._d.offdays=this._d.offdays||{};
    if(name)this._d.offdays[ds]=name;else delete this._d.offdays[ds];
    S.offdays=this._d.offdays;lsSave(this._d);calRerender();rDay();rWidget();},
  putPerson(id,p){if(p)this._d.people[id]=p;else delete this._d.people[id];S.people=this._d.people;lsSave(this._d);},
  putTask(mid,iid,item){
    if(S.arch[mid]&&S.arch[mid][iid])delete S.arch[mid][iid];   /* 아카이브 사본 제거(384차) */
    if(this._d.archive&&this._d.archive[mid])delete this._d.archive[mid][iid];
    this._d.tasks[mid]=this._d.tasks[mid]||{};if(item)this._d.tasks[mid][iid]=item;else delete this._d.tasks[mid][iid];S.tasks=this._d.tasks;lsSave(this._d);},
  putCfg(k,v,cb){this._d.cfg[k]=v;S.cfg=this._d.cfg;lsSave(this._d);if(cb)cb(null);},
  putPref(k,v){this._d.prefs=this._d.prefs||{};if(v)this._d.prefs[k]=v;else delete this._d.prefs[k];S.prefs=this._d.prefs;lsSave(this._d);},
};

/* Firebase — 하자처리 현황과 같은 프로젝트(report-c29a1), calapp/ 네임스페이스 */
const FB={
  cfg:{
    apiKey:"AIzaSyDX5yANupr5xqLbCq_UcSVHc-iZvobRM3g",
    authDomain:"report-c29a1.firebaseapp.com",
    databaseURL:"https://report-c29a1-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId:"report-c29a1",
    storageBucket:"report-c29a1.firebasestorage.app",
    messagingSenderId:"625677240502",
    appId:"1:625677240502:web:f66c629db928c2b801fe17",
    measurementId:"G-YT6MVSE221"
  },
  APPCHECK_KEY:"6Lcl5zctAAAAAPgvPJKKLxBwgENnAmogtVTqf61f",
  /* 위젯(Electron)에서는 reCAPTCHA 가 토큰을 안 내주는 경우가 있다(403 → 24시간 차단 → 데이터 읽기 거부).
     여기에 디버그 토큰을 넣고 Firebase 콘솔 > App Check > 앱 > 디버그 토큰 관리에 같은 값을 등록하면
     위젯만 그 토큰으로 통과한다. 비워 두면 위젯도 브라우저와 똑같이 reCAPTCHA 를 쓴다.
     ⚠ 이 값은 배포 파일 안에 그대로 들어간다 — 알면 누구나 쓸 수 있으니 App Check 의 보호 효과는 그만큼 약해진다 */
  APPCHECK_DEBUG:"",
  app:null,db:null,auth:null,_subs:[]
};
function fbDomainOk(email){return /@hdec\.co\.kr$/i.test(String(email||'').trim());}

/* 라이브 부팅 캐시 — 로그인 직후 FB 응답을 기다리는 동안 마지막 데이터로 먼저 그린다.
   FB 값이 도착하면 그대로 덮어쓰므로 캐시는 '첫 화면'에만 쓰인다. 로그아웃 시 지운다. */
const BOOT_KEY='calapp.boot.v1';
let bootT=null;
function bootCacheLoad(){try{return JSON.parse(localStorage.getItem(BOOT_KEY))||null;}catch(e){return null;}}
function bootCacheSave(){
  clearTimeout(bootT);
  bootT=setTimeout(()=>{try{
    /* 230차: accounts(계정 지정색)도 캐시 — 빠지면 첫 렌더가 인덱스색으로 나갔다가
       users 도착 후 지정색으로 덮여 부팅 때 1초쯤 색이 깜빡였다 */
    localStorage.setItem(BOOT_KEY,JSON.stringify({org:S.org,people:S.people,tasks:S.tasks,cfg:S.cfg,accounts:S.accounts,at:Date.now()}));
  }catch(e){}},500);
}
function bootCacheClear(){try{localStorage.removeItem(BOOT_KEY);}catch(e){}}
const FbStore={
  name:'fb',
  init(){},
  _on(path,cb,onErr){const r=FB.db.ref(path);r.on('value',s=>cb(s.val()),e=>{if(onErr)onErr(e);else console.warn('[FB] read',path,e);});FB._subs.push(r);},
  putPlan(p){const{sid,iid,item,prevSid}=planToTask(p);
    if(prevSid&&prevSid!==sid)this.putTask(prevSid,iid,null);   /* 담당자가 바뀌면 옛 소속에서 지운다 */
    this.putTask(sid,iid,item);},
  /* 사용자 삭제는 전부 여기로 — 휴지통 저장과 원본 제거를 multi-path update 한 번으로(383차).
     아카이브에서 보이는 업무도 같은 길로 지운다 — 사본을 함께 걷는다(384차) */
  trashTask(sid,iid){const it=(S.tasks[sid]||{})[iid]||((S.arch[sid]||{})[iid]);if(!it)return;
    const wrap=trashWrap(it);
    if(S.tasks[sid])delete S.tasks[sid][iid];   /* 화면 먼저 — putTask 와 같은 원칙 */
    const up={['calapp/trash/'+sid+'/'+iid]:wrap,['calapp/tasks/'+sid+'/'+iid]:null};
    if(S.arch[sid]&&S.arch[sid][iid]){delete S.arch[sid][iid];up['calapp/archive/'+sid+'/'+iid]=null;}
    rDay();rTasks();refetchCal();rWidget();
    FB.db.ref().update(up).catch(fbErr);},
  delPlan(ym,id){const hit=allTasks().find(x=>x.iid===id);if(hit)this.trashTask(hit.sid,hit.iid);},
  movePlan(p){this.putPlan(p);},
  putOrg(org){const o=cleanOrg(org);
    /* 630차: org.sites 는 배열(인덱스 키)이라 규칙에서 현장 id 로 권역을 찾을 수 없다 —
       {sid:region} 미러를 함께 원자 기록해 people.sites 권역 검증의 서버 참조점으로 쓴다 */
    const mir={};(o.sites||[]).forEach(x=>{if(x&&x.id)mir[x.id]=String(x.region||'');});
    FB.db.ref().update({'calapp/org':o,'calapp/orgSiteRegion':mir}).catch(fbErr);},
  putOffday(ds,name){FB.db.ref('calapp/offdays/'+ds)[name?'set':'remove'](name||null).catch(fbErr);},
  putPerson(id,p){const r=FB.db.ref('calapp/people/'+id);(p?r.set(cleanPerson(p)):r.remove()).catch(fbErr);},
  putTask(mid,iid,item){
    /* 서버 응답을 기다리면 한 박자 늦게 반영된다 — 화면에 먼저 반영하고 서버 값이 오면 덮어쓴다.
       실패하면 구독이 원래 값을 되돌려 주므로 화면이 어긋난 채 남지 않는다.
       635차: 기존 set()은 다른 사용자가 먼저 바꾼 필드를 통째로 덮을 수 있었다.
       기존 화면값과 새 값을 diff 해 변경된 필드만 RTDB update() 한다. 중첩 객체도 경로별로
       쪼개므로 assignees/links 같은 별도 변경까지 불필요하게 덮지 않는다. 신규는 set(), 삭제는 remove(). */
    /* 아카이브에 있던 업무를 건드리면 그 사본을 지운다 — 두 곳에 겹쳐 남지 않게(384차) */
    if(S.arch[mid]&&S.arch[mid][iid]){delete S.arch[mid][iid];
      FB.db.ref('calapp/archive/'+mid+'/'+iid).remove().catch(()=>{});}
    S.tasks[mid]=S.tasks[mid]||{};
    const before=S.tasks[mid][iid]||null;
    if(item)S.tasks[mid][iid]=item;else delete S.tasks[mid][iid];
    rDay();rTasks();refetchCal();rWidget();
    const r=FB.db.ref('calapp/tasks/'+mid+'/'+iid);
    if(!item){r.remove().catch(fbErr);return;}
    const next=cleanTask(item),base=before?cleanTask(before):null;
    if(!base){r.set(next).catch(fbErr);return;}
    const patch={};
    const walk=(a,b,path='')=>{
      const ao=a&&typeof a==='object'&&!Array.isArray(a)?a:null;
      const bo=b&&typeof b==='object'&&!Array.isArray(b)?b:null;
      if(ao&&bo){
        const keys=new Set([...Object.keys(a),...Object.keys(b)]);
        keys.forEach(k=>{
          const p=path?path+'/'+k:k;
          if(!(k in b))patch[p]=null;
          else if(!(k in a))patch[p]=b[k];
          else walk(a[k],b[k],p);
        });
        return;
      }
      if(JSON.stringify(a)!==JSON.stringify(b)&&path)patch[path]=b;
    };
    walk(base,next);
    if(Object.keys(patch).length)r.update(patch).catch(fbErr);
  },
  putCfg(k,v,cb){FB.db.ref('calapp/cfg/'+k).set(v).then(()=>cb&&cb(null)).catch(e=>{fbErr(e);if(cb)cb(e);});},
  putPref(k,v){const uid=S.user&&S.user.uid;if(!uid)return;
    const r=FB.db.ref('calapp/prefs/'+uid+'/'+k);(v?r.set(v):r.remove()).catch(fbErr);},
  /* 서버에 남은 예전 구조(plans·recur)를 업무로 한 번 옮긴다.
     관리자·사용자 누구나 실행 가능하지만, 이미 옮겨졌으면 아무 것도 하지 않는다. */
  async migrateRemote(){
    if(!FB.db)return;
    let plans=null,recur=null;
    try{
      const [a,b]=await Promise.all([FB.db.ref('calapp/plans').get(),FB.db.ref('calapp/recur').get()]);
      plans=a.val();recur=b.val();
    }catch(e){console.warn('[FB] 옛 일정 읽기 건너뜀',e);return;}
    /* 기한(due)만 있던 업무를 날짜(date)로 — 실패해도 나머지 이전은 계속한다 */
    const dueFix={};
    allTasks().forEach(({sid,iid,it,arch})=>{
      if(arch||!it||!it.due)return;   /* 아카이브 사본은 tasks 로 되쓰면 되살아난다 — 손대지 않는다(384차) */
      dueFix['calapp/tasks/'+sid+'/'+iid]=cleanTask({...it,date:it.date||it.due,due:undefined});
    });
    if(Object.keys(dueFix).length){
      try{await FB.db.ref().update(dueFix);toast('기한을 날짜로 옮겼습니다');}
      catch(e){console.warn('[FB] 기한 이전 실패',e);}
    }
    /* 옛 일정 — 원본 경로를 함께 들고 있어야 한 건씩 지울 수 있다
       (calapp/plans 통째 삭제는 상위에 쓰기 규칙이 없어 거부된다) */
    const olds=[];
    Object.keys(plans||{}).forEach(ym=>Object.entries(plans[ym]||{}).forEach(([k,p])=>{
      if(p&&p.id)olds.push({p,path:'calapp/plans/'+ym+'/'+k});}));
    Object.entries(recur||{}).forEach(([k,p])=>{if(p&&p.id)olds.push({p,path:'calapp/recur/'+k});});
    if(!olds.length)return;
    const teamId=((S.org.teams||[])[0]||{}).id||'team';
    const seen=new Set(allTasks().map(x=>x.iid));
    const up={};
    olds.forEach(({p,path})=>{
      up[path]=null;                       /* 원본은 한 건씩 지운다 */
      if(seen.has(p.id))return;            /* 이미 옮겨졌으면 새로 쓰지 않는다 */
      const owns=Object.keys(p.owners||{}).filter(k=>p.owners[k]);
      const sid=owns[0]||teamId;
      const it={text:String(p.title||''),prog:String(p.body||''),
        date:String(p.date||''),end:String(p.end||''),time:String(p.time||''),
        site:String(p.site||''),color:String(p.color||''),
        st:p.done?2:0,assignees:(()=>{const o={};owns.forEach(k=>{o[k]=1;});return o;})(),
        createdAt:Number(p.createdAt)||Date.now(),updatedAt:Date.now()};
      if(p.recur&&p.recur.f){
        it.recur={f:p.recur.f,until:String(p.recur.until||'')};
        if(p.doneOn)it.doneOn=p.doneOn;
        if(p.skipOn)it.skipOn=p.skipOn;
        if(p.moveOn)it.moveOn=p.moveOn;
      }
      up['calapp/tasks/'+sid+'/'+p.id]=cleanTask(it);
    });
    try{
      await FB.db.ref().update(up);
      toast('예전 일정 '+olds.length+'건을 업무로 옮겼습니다');
    }catch(e){
      console.warn('[FB] 옛 일정 이전 실패',e);
      toast('예전 일정을 옮기지 못했습니다 · 관리자에게 문의하세요');
    }
  },
  /* 하자처리 현황의 게시본(report/<게시월>/_dash)을 직접 구독한다.
     ⚠ 게시월이 나뉘어 있어 `reportIndex` 로 최신 월을 먼저 찾고, 그 달이 바뀌면 다시 붙는다.
     ⚠ 읽기 권한이 없거나 게시본이 없으면 아무것도 하지 않는다 — 그러면 사본(calapp/org)이 계속 쓰인다. */
  bindReportOrg(){
    /* ⚠ 614차 조직 원본 역전: 팀·권역·현장의 원본은 이제 **calapp/org** 다(생산자 이식으로 게시 주체가
       이 앱이 됐다 — _dash.sites/teams 는 게시 때 S.org 에서 파생되는 스냅샷일 뿐).
       그래서 _dash 구독으로 S.org 를 덮어쓰던 코드를 걷어내고, reportIndex 로 **최신 게시월(ORG_RM)만**
       따라간다(하자 화면 기준월). ORG_LIVE 는 스냅샷 문서(dfSnapBoot)만 켠다 — 여기서는 더 안 켠다. */
    const attach=rm=>{
      if(!rm||rm===ORG_RM)return;
      ORG_RM=rm;
      if(WIDGET)dfNewPopMaybe();   /* 615차: 위젯 — 새 게시월 말풍선(설정 톱니에 꼬리) */
      if(tkHold()){PEND.org=true;return;}
      dfLinkOpen();
      if(S.view==='defect')rDefect();   /* 새 게시월 — 하자 화면을 보고 있으면 즉시 갈아탄다 */
    };
    /* 최신 게시월 따라가기 */
    FB.db.ref('reportIndex').on('value',snap=>{
      const ks=Object.keys(snap.val()||{}).sort();
      if(ks.length)attach(ks[ks.length-1]);
    },()=>{
      /* 인덱스를 못 읽으면 이번 달부터 거슬러 24개월을 훑어 한 번만 붙인다 */
      (async()=>{
        const d=new Date();
        for(let i=0;i<24;i++){
          const dd=new Date(d.getFullYear(),d.getMonth()-i,1);
          const rm=dd.getFullYear()+'-'+pad(dd.getMonth()+1);
          try{
            const v=(await FB.db.ref('report/'+rm+'/_dash/sites').once('value')).val();
            if(v&&Object.keys(v).length){attach(rm);return;}
          }catch(e){return;}
        }
      })();
    });
  },
  bindShared(){
    this.migrateRemote();
    setTimeout(trashPurge,5000);   /* 휴지통 30일 정리(383차) — 부팅 통신이 잦아든 뒤 한 번 */

    /* ⚠ 614차 조직 원본 역전: `calapp/org` 가 팀·권역·현장의 **원본**이다(사본 아님).
       hasCommercial/showVacant 토글은 규칙상 org 에 실리지 않는다 — siteConfig 채널(dfSubSiteCfg)이
       실시간 진실이므로, org 스냅샷이 S.org 를 통째로 갈아끼운 직후 마지막 siteConfig 를 다시 입힌다. */
    this._on('calapp/org',v=>{
      S.org=v||{teams:[],regions:[],sites:[]};normOrg(S.org);dfApplySiteCfg(DF._cfgLast);bootCacheSave();
      if(tkHold()||orgHold()){PEND.org=true;PEND.tasks=true;return;}
      rOrg();rTasks();rTeamSel();rFilter();dfLinkOpen();});
    /* 795차: siteConfig 구독을 부팅 때 건다 — 전엔 하자 화면(rDefect)·게시에서만 걸려, 조직 화면만 연 세션은
       ① 저장된 공가세대 끔이 켜짐으로 보이고 ② 다른 칸 저장(조직 에코) 뒤 방금 끈 토글이 도로 켜졌으며
       ③ 그 상태에서 공가상가·소송 토글을 누르면 dfSiteCfgWrite 가 화면값(켜짐)으로 공가세대를 서버에 덮어썼다 */
    dfSubSiteCfg();
    this.bindReportOrg();
    this._on('calapp/tasks',v=>{S.tasks=v||{};S.loading=false;bootCacheSave();
      /* 첫 스냅샷이 온 뒤 한 번 — 놓친 담당자 업무를 아침 확인으로 묻는다 */
      if(!FB._mrv){FB._mrv=true;setTimeout(morningReview,WIDGET?1400:800);   /* 위젯은 첫 렌더가 조금 늦다 */
        setTimeout(archMigrate,8000);   /* 오래 끝난 업무를 구독 밖으로(384차) — 부팅 통신이 잦아든 뒤 */
        /* 5시가 지난 뒤 PC 를 켠 경우 — 놓친 업무 확인 모달이 지나간 뒤에 띄운다(겹치면 가린다) */
        setTimeout(()=>{if(!$('#mo')||!$('#mo').classList.contains('open'))evePopShow();},WIDGET?4200:3600);}
      if(tkHold()){PEND.tasks=true;PEND.day=true;return;}
      rTasks();refetchCal();rDay();rWidget();});   /* 업무가 곧 일정 — 달력도 함께 갱신 */
    this._on('calapp/offdays',v=>{S.offdays=v||{};bootCacheSave();calRerender();rDay();rWidget();});
    this._on('calapp/people',v=>{S.people=v||{};bootCacheSave();
      if(tkHold()){PEND.org=true;PEND.tasks=true;return;}
      rOrg();rTasks();});
    /* 하자처리 현황과 공용인 users 노드 — 계정 목록을 그대로 가져온다.
       규칙상 읽기가 막히면(관리자 전용 등) 조용히 수동 명부로 대체한다. */
    this._on('users',v=>{S.accounts=v||{};S.acctDenied=false;bootCacheSave();
      const me=S.user&&S.accounts[S.user.uid];
      if(me){FB.userRec={...(FB.userRec||{}),...me};
        /* 접속 중 role 이 바뀌면(관리자 지정) 새로고침 없이 반영한다 */
        if(['editor','viewer','blocked'].includes(me.role)&&me.role!==S.role)S.role=me.role;}
      rAcct();                                   /* 사이드바 아바타·이름도 함께 갱신 */
      /* ⚠ 담당자 색(avColor)이 바뀌면 '담당자 색' 업무의 색도 함께 바뀐다 —
         카드만 다시 그리고 달력·일자 패널·위젯을 빠뜨려 달력 막대만 옛 색으로 남던 버그 */
      if(tkHold()){PEND.org=true;PEND.tasks=true;PEND.day=true;return;}
      rOrg();rTasks();rFilter();rDay();refetchCal();rWidget();rDefectNav();},
      e=>{S.accounts={};S.acctDenied=true;console.warn('[FB] users 읽기 권한 없음',e);rOrg();rTasks();});
    /* cfg 에는 하자 관리에서 감춘 현장(dfHide)도 들어 있다 — 목록·현장 표도 함께 다시 그린다 */
    this._on('calapp/cfg',v=>{S.cfg=v||{};bootCacheSave();rCfg();rDefectNav();if(S.view==='org')rOrg();});
    const uid=S.user&&S.user.uid;
    if(uid){
        this._on('calapp/prefs/'+uid,v=>{S.prefs=v||{};});   /* 최근 이모지 등 개인 설정 */
    }
  }
};
let fbErrT=0,fbErrMsg='';
function fbErr(e){
  console.warn('[FB]',e);
  const c=String((e&&e.code)||'');
  const msg=/permission|PERMISSION/i.test(c+String(e&&e.message))
    ? '저장 권한이 없습니다 — Firebase 규칙에 calapp 블록이 반영됐는지 확인하세요'
    : '저장하지 못했습니다 — 연결을 확인하세요. 화면 값은 서버 값으로 곧 되돌아갑니다';
  const now=Date.now();
  if(msg===fbErrMsg && now-fbErrT<1800)return;
  fbErrMsg=msg;fbErrT=now;toast(msg,4000);
}
/* Firebase 배열 직렬화 보정: 빈 배열은 사라지고 객체로 돌아올 수 있다 */
function normOrg(org){org.teams=arr(org.teams);org.regions=arr(org.regions);org.sites=arr(org.sites);org.sites.sort(siteCmp(org.regions));}
/* 692차: 현장 순서는 한 곳에서 — 권역(권역 목록 순) → 준공일 내림차순(최신 위 · 없으면 뒤) → 이름.
   normOrg 가 읽을 때·저장할 때 배열 자체를 정렬하므로 조직 표·업무 추가/수정 현장 선택·필터·사이드바가 저절로 같은 순서다.
   ⚠ 795차: 이름 없는 새 행은 **맨 끝** — 전엔 권역 비교가 먼저라 그 권역 안에서, 이름('')이 가장 앞이라 준공일 없는 줄들 맨 앞에 끼었다 */
function siteCmp(regs){
  const ord={};(regs||[]).forEach((r,i)=>{ord[r.id]=i;});
  return (a,b)=>((a.name?0:1)-(b.name?0:1))
    ||((ord[a.region]??99)-(ord[b.region]??99))
    ||((a.completionDate?0:1)-(b.completionDate?0:1))
    ||String(b.completionDate||'').localeCompare(String(a.completionDate||''))   /* 694차: 최신 준공이 위로(내림차순) */
    ||String(a.name||'').localeCompare(String(b.name||''),'ko');
}
/* 구버전(팀→공구→담당자) 데이터를 팀·권역·계정 구조로 1회 이관 */
/* 예전 구조(plans/recur 분리)를 업무 하나로 합친다 — 한 번만 돌고 원본은 지운다 */
/* 기한(due)을 날짜(date)로 일원화 — 예전 데이터에 due 만 있으면 date 로 옮긴다 */
function migrateDue(d){
  let moved=0;
  Object.keys(d.tasks||{}).forEach(sid=>{
    const m=d.tasks[sid]||{};
    Object.keys(m).forEach(iid=>{
      const it=m[iid];if(!it||!it.due)return;
      if(!it.date)it.date=it.due;
      delete it.due;moved++;
    });
  });
  return moved>0;
}
function migratePlans(d){
  const has=(d.plans&&Object.keys(d.plans).length)||(d.recur&&Object.keys(d.recur).length);
  if(!has)return false;
  d.tasks=d.tasks||{};
  const teamId=(d.org&&d.org.teams&&d.org.teams[0]&&d.org.teams[0].id)||'team';
  const move=p=>{
    if(!p||!p.id)return;
    const owns=Object.keys(p.owners||{}).filter(k=>p.owners[k]);
    const sid=owns[0]||teamId;
    d.tasks[sid]=d.tasks[sid]||{};
    if(d.tasks[sid][p.id])return;                 /* 이미 옮겨졌으면 건너뛴다 */
    const it={text:String(p.title||''),prog:String(p.body||''),
      date:String(p.date||''),end:String(p.end||''),time:String(p.time||''),
      site:String(p.site||''),color:String(p.color||''),
      st:p.done?2:0,assignees:(()=>{const o={};owns.forEach(k=>{o[k]=1;});return o;})(),
      createdAt:Number(p.createdAt)||Date.now(),updatedAt:Date.now()};
    if(p.recur&&p.recur.f){
      it.recur={f:p.recur.f,until:String(p.recur.until||'')};
      if(p.doneOn)it.doneOn=p.doneOn;
      if(p.skipOn)it.skipOn=p.skipOn;
      if(p.moveOn)it.moveOn=p.moveOn;
    }
    d.tasks[sid][p.id]=it;
  };
  Object.keys(d.plans||{}).forEach(ym=>Object.values(d.plans[ym]||{}).forEach(move));
  Object.values(d.recur||{}).forEach(move);
  d.plans={};d.recur={};
  return true;
}
function migrateOrg(d){
  const t=(d.org&&d.org.teams)||[];
  if(!t.some(x=>x&&x.ggs))return;
  d.people=d.people||{};
  t.forEach(tm=>arr(tm.ggs).forEach(g=>arr(g.members).forEach(m=>{
    d.people[m.id]={name:m.name,email:m.email||'',team:tm.id,region:''};
  })));
  d.org={teams:t.map(x=>({id:x.id,name:x.name})),regions:[]};
}
function arr(v){if(Array.isArray(v))return v.filter(Boolean);if(v&&typeof v==='object')return Object.values(v).filter(Boolean);return[];}

let store=LocalStore;

/* ═══════════ Firebase 초기화 · 세션 감지 ═══════════ */
/* ═══════════ 로그인 게이트 — 하자처리 현황과 동일한 절차 ═══════════ */
const DEV_LOCAL=/[?&]local=1\b/.test(location.search);   // 계정 없이 둘러보는 로컬 모드(개발·시연용)
function showCover(){const g=$('#coverGate');if(g)g.style.display='flex';}
function hideCover(){const g=$('#coverGate');if(g)g.style.display='none';}
function showGateForm(){const ld=$('#cvLoading');if(ld)ld.style.display='none';const bd=$('#cvBody');if(bd)bd.style.display='';showCover();}
function fbMsg(t,ok){const e=$('#cvMsg');if(e){e.textContent=t||'';e.style.color=ok?'#7CFC9A':'#ff8a80';}}
function fbCreds(){return{email:($('#fbEmail')||{}).value||'',pw:($('#fbPw')||{}).value||''};}
function fbAuthErr(e){
  const c=(e&&e.code)||'';
  return{
    'auth/invalid-credential':'이메일 또는 비밀번호가 올바르지 않습니다',
    'auth/wrong-password':'비밀번호가 올바르지 않습니다',
    'auth/user-not-found':'가입되지 않은 계정입니다 · [신규 가입]을 눌러주세요',
    'auth/invalid-email':'이메일 형식이 올바르지 않습니다',
    'auth/email-already-in-use':'이미 가입된 계정입니다 · 로그인하세요',
    'auth/too-many-requests':'시도가 많습니다 · 잠시 후 다시 시도하세요',
    'auth/network-request-failed':'네트워크 오류 · 사내망에서 Firebase 접속이 허용되는지 확인하세요',
    'auth/weak-password':'비밀번호는 6자 이상이어야 합니다',
    'auth/operation-not-allowed':'이메일/비밀번호 로그인이 콘솔에서 활성화되지 않았습니다'
  }[c]||('오류: '+((e&&e.message)||c||'알 수 없음'));
}
/* 로그인·가입 공통 검증 — 통과하면 {email,pw}, 아니면 null(메시지는 여기서 띄운다) */
function fbValidCreds(verb){
  if(!FB.auth){fbMsg('네트워크에 연결할 수 없습니다.');return null;}
  const c=fbCreds(),email=c.email.trim().toLowerCase();
  if(!fbDomainOk(email)){fbMsg('@hdec.co.kr 계정만 '+verb+'할 수 있습니다');return null;}
  if((c.pw||'').length<6){fbMsg('비밀번호는 6자 이상이어야 합니다');return null;}
  return{email,pw:c.pw};
}
/* 로그인이 멈추면 어디가 막혔는지 알려 준다 — 사내망은 도메인별로 차단되는 경우가 많다.
   no-cors 요청은 응답 내용을 못 읽지만 '닿았는지'는 알 수 있다. */
async function netDiag(){
  if(S.live)return;
  fbMsg('연결 상태를 확인하는 중…',true);
  const T=[
    ['인증 서버','https://identitytoolkit.googleapis.com/'],
    ['토큰 서버','https://securetoken.googleapis.com/'],
    ['데이터베이스','https://report-c29a1-default-rtdb.asia-southeast1.firebasedatabase.app/.json?shallow=true'],
    ['구글 CDN','https://www.gstatic.com/firebasejs/'],
    ['보안 확인(reCAPTCHA)','https://www.google.com/recaptcha/api.js']
  ];
  const bad=[];
  await Promise.all(T.map(async ([n,u])=>{
    try{
      const ctl=new AbortController();
      const t=setTimeout(()=>ctl.abort(),6000);
      await fetch(u,{mode:'no-cors',cache:'no-store',signal:ctl.signal});
      clearTimeout(t);
    }catch(e){bad.push(n);}
  }));
  if(S.live)return;
  fbMsg(bad.length
    ? '사내망에서 '+bad.join(' · ')+' 에 연결할 수 없습니다. 전산 담당자에게 이 주소들의 허용을 요청해 주세요.'
    : '연결은 되지만 응답이 없습니다. 브라우저에서는 되고 위젯에서만 멈춘다면 보안 확인(reCAPTCHA) 단계에서 걸린 것입니다 — 위젯을 최신 버전으로 다시 만들어 주세요.');
}
async function fbDoLogin(){
  const c=fbValidCreds('사용');if(!c)return;
  const email=c.email;
  fbMsg('로그인 중…',true);
  clearTimeout(FB._watch);
  FB._watch=setTimeout(()=>{if(!S.live)netDiag();},9000);
  try{
    await FB.auth.signInWithEmailAndPassword(email,c.pw);
    /* 가입 직후엔 이미 같은 계정으로 로그인돼 있어 onAuthStateChanged가 다시 울리지 않는다 —
       reload로 emailVerified를 최신화한 뒤 진입 판정을 직접 호출한다. */
    const u=FB.auth.currentUser;
    if(u){try{await u.reload();}catch(e){}onAuth(FB.auth.currentUser);}
  }catch(e){clearTimeout(FB._watch);fbMsg(fbAuthErr(e));}
}
async function fbDoSignup(){
  const c=fbValidCreds('가입');if(!c)return;
  const email=c.email;
  fbMsg('가입 처리 중…',true);
  try{
    const cred=await FB.auth.createUserWithEmailAndPassword(email,c.pw);
    try{await cred.user.sendEmailVerification();}catch(e){}
    fbMsg('인증메일을 보냈습니다. 메일의 링크를 클릭한 뒤 [로그인]을 눌러주세요.',true);
  }catch(e){fbMsg(fbAuthErr(e));}
}
async function fbDoResend(){
  if(!FB.auth||!FB.auth.currentUser){fbMsg('먼저 로그인 또는 가입을 진행하세요');return;}
  try{await FB.auth.currentUser.sendEmailVerification();fbMsg('인증메일을 다시 보냈습니다. 받은 메일의 링크를 클릭하세요.',true);}
  catch(e){fbMsg(fbAuthErr(e));}
}
/* 비밀번호 찾기 — 본인이 자기 계정에 재설정 메일을 받는다(관리자·서버 불필요).
   ⚠ 계정 존재 여부가 새지 않도록 성공·실패 안내를 같게 한다(user-not-found 도 같은 문구).
   단, 형식·도메인·네트워크·과다요청 같은 '고칠 수 있는' 오류는 그대로 알려 준다. */
async function fbDoReset(){
  if(!FB.auth){fbMsg('네트워크에 연결할 수 없습니다.');return;}
  const email=(fbCreds().email||'').trim().toLowerCase();
  if(!email){fbMsg('이메일을 먼저 입력한 뒤 [비밀번호를 잊으셨나요?]를 눌러주세요');return;}
  if(!fbDomainOk(email)){fbMsg('@hdec.co.kr 계정만 재설정할 수 있습니다');return;}
  const same='가입된 계정이면 재설정 메일을 보냈습니다. 메일의 링크에서 새 비밀번호를 정하세요.';
  fbMsg('재설정 메일을 보내는 중…',true);
  try{await FB.auth.sendPasswordResetEmail(email);fbMsg(same,true);}
  catch(e){
    const c=e&&e.code;
    if(c==='auth/user-not-found'){fbMsg(same,true);return;}   /* 존재 여부 은폐 */
    if(c==='auth/invalid-email'){fbMsg('이메일 형식이 올바르지 않습니다');return;}
    if(c==='auth/too-many-requests'){fbMsg('시도가 많습니다 · 잠시 후 다시 시도하세요');return;}
    if(c==='auth/network-request-failed'){fbMsg('네트워크 오류 · 사내망에서 Firebase 접속이 허용되는지 확인하세요');return;}
    fbMsg(same,true);   /* 그 밖의 오류도 은폐 쪽으로 — 정보 노출보다 안전 */
  }
}
/* 역할 해석 — users/{uid}. 최초 로그인 시 본인을 viewer로 자기 등록(하자처리 현황과 동일 규칙) */
async function resolveRole(user){
  const uid=user.uid,email=String(user.email||'').toLowerCase();
  const ref=FB.db.ref('users/'+uid);
  let rec=null,readOk=true;
  try{rec=(await ref.once('value')).val();}
  catch(e){readOk=false;console.warn('[FB] role read',e);}
  /* 읽기에 실패했으면 기록이 없다고 단정하면 안 된다 — 기존 관리자 기록을 viewer로 덮어쓸 수 있다 */
  if(!rec&&!readOk){FB.userRec=null;return 'viewer';}
  if(!rec){
    rec={email,role:'viewer',createdAt:Date.now(),lastSeen:Date.now()};
    try{await ref.set(rec);}catch(e){console.warn('[FB] self-register',e);}
  }else{
    /* 규칙상 users/{uid} 는 email 일치 + role 유지 조건으로 '전체 레코드'를 써야 통과한다.
       lastSeen 만 부분 쓰기하면 email 검증에 걸려 거부된다. */
    const next={email,role:rec.role,createdAt:rec.createdAt||Date.now(),lastSeen:Date.now()};
    /* 전체 덮어쓰기라 기존 필드를 빠뜨리면 지워진다 — 로그인할 때마다 프로필이 초기화되던 원인 */
    if(rec.name)next.name=rec.name;
    if(rec.avColor)next.avColor=rec.avColor;
    if(rec.avIcon)next.avIcon=rec.avIcon;
    try{await ref.set(next);rec=next;}catch(e){console.warn('[FB] lastSeen',e);}
  }
  FB.userRec=rec;
  const r=rec&&rec.role;
  return(r==='editor'||r==='viewer'||r==='blocked')?r:'viewer';
}
async function onAuth(user){
  clearTimeout(FB._watch);
  if(!user){exitLive();showGateForm();return;}
  if(!fbDomainOk(user.email)){showGateForm();fbMsg('@hdec.co.kr 계정만 접근할 수 있습니다.');try{FB.auth.signOut();}catch(e){}return;}
  if(!user.emailVerified){
    showGateForm();
    fbMsg('이메일 인증이 필요합니다. 받은 인증메일의 링크를 클릭한 뒤 [로그인]을 다시 누르세요. (메일이 없으면 [인증메일 재발송])');
    return;
  }
  const role=await resolveRole(user);
  if(role==='blocked'){showGateForm();fbMsg('이 계정은 접근이 차단되었습니다. 관리자에게 문의하세요.');return;}
  S.role=role;
  enterLive(user);
  filtLoad();          /* 계정마다 저장해 둔 필터로 바꿔 읽는다 */
  /* ⚠ 로그인은 됐는데 데이터가 안 오면 App Check(보안 확인) 토큰 문제일 가능성이 크다.
     토큰이 없으면 데이터베이스가 읽기를 거부하고, 앱은 아무 말 없이 기다리기만 한다 */
  clearTimeout(FB._dbWatch);
  FB._dbWatch=setTimeout(()=>{
    if(S.live)return;
    showGateForm();
    fbMsg('로그인은 되었지만 데이터를 읽지 못했습니다 · 보안 확인(App Check) 토큰을 받지 못한 것으로 보입니다. 관리자에게 알려 주세요.');
  },20000);
  hideCover();
}
function acctNick(){
  const u=S.user;if(!u)return'';
  return String(u.displayName||(FB.userRec&&FB.userRec.name)||String(u.email||'').split('@')[0]||'').trim();
}
function isEditor(){return !S.live||S.role==='editor';}   /* 로컬 모드는 제한 없음 */
function denyEdit(){toast('보기 전용 · 변경은 관리자만 가능');return false;}
function roleLabel(r){return r==='editor'?'관리자':(r==='blocked'?'차단':'사용자');}
function acctHeadHTML(){
  const u=S.user;if(!u)return '';
  const av=avOf(u.uid),role=S.role||'viewer';
  return `<div class="acct-head">
      <button class="acct-av av-cus av-btn" data-act="pf.toggle" aria-label="아바타 변경" style="--avc:${esc(colBg(av.color||ownColor(u.uid)))}">
        ${avInner(av.icon)}<span class="av-pen"><svg class="icn"><use href="#i-plus"></use></svg></span>
      </button>
      <div style="min-width:0;flex:1">
        <div class="acct-mail">${esc(u.email||'')}</div>
        <span class="acct-rolebadge ${role==='editor'?'r-editor':'r-viewer'}">${esc(roleLabel(role))}</span>
      </div>
      <span class="acct-state" id="acctState"></span>
      <button class="acct-btn acct-btn-danger acct-btn-sm" data-act="acct.signout">로그아웃</button>
    </div>`;
}
/* 646차: 프로필의 비밀번호 찾기 — 로그인 화면의 fbDoReset 은 로그인 폼(fbCreds)을 읽으므로 여기선 못 쓴다.
   이미 로그인한 상태이니 대상은 항상 내 계정이다. 존재 여부 은폐가 필요 없어 안내가 단순하다. */
async function acctResetPw(){
  const em=String(((S.user||{}).email)||'').trim().toLowerCase();
  if(!em){toast('메일 주소를 확인할 수 없습니다');return;}
  if(!FB.auth){toast('네트워크에 연결할 수 없습니다');return;}
  try{await FB.auth.sendPasswordResetEmail(em);toast(em+' 로 재설정 메일을 보냈습니다');}
  catch(e){
    const c=e&&e.code;
    if(c==='auth/too-many-requests'){toast('시도가 많습니다 · 잠시 후 다시 시도하세요');return;}
    if(c==='auth/network-request-failed'){toast('네트워크 오류 · 사내망 접속을 확인하세요');return;}
    toast('메일을 보내지 못했습니다');
  }
}
function acctTabBody(tab){
  const u=S.user;if(!u)return '';
  const av=avOf(u.uid);
  if(tab==='pw'){
    /* 아바타는 두 탭 공통 — 비밀번호 탭에서도 눌러 바꿀 수 있다 */
    return `${acctHeadHTML()}
      <label class="il" for="acctNamePw">이름</label>
      <input class="inp" id="acctNamePw" maxlength="60" value="${esc(acctNick())}" placeholder="표시할 이름">
      <div class="acct-sec">
      <label class="il il-first">비밀번호 변경</label>
      <input class="inp acct-gap" id="acctPwCur" type="password" autocomplete="current-password" placeholder="현재 비밀번호">
      <input class="inp acct-gap" id="acctPwNew" type="password" autocomplete="new-password" placeholder="새 비밀번호 (6자 이상)">
      <input class="inp acct-gap" id="acctPwNew2" type="password" autocomplete="new-password" placeholder="새 비밀번호 확인">
      <div class="acct-pwrow">
        <button class="acct-btn acct-btn-primary" data-act="acct.changePw">비밀번호 변경</button>
        <button class="acct-btn acct-btn-ghost" data-act="acct.reset">비밀번호 찾기</button>
      </div>
      </div>
      ${emojiPickerHTML(av)}`;
  }
  return `${acctHeadHTML()}
    <label class="il" for="acctName">이름</label>
    <input class="inp" id="acctName" maxlength="60" value="${esc(acctNick())}" placeholder="표시할 이름">
    ${myOrgHTML()}
    ${emojiPickerHTML(av)}`;
}
/* 내 소속(628차) — 팀·권역·직급은 조직 관리에서 배정(본인 읽기 전용), 본인은 이름·비밀번호·
   담당 현장만. 담당 현장 UI 는 조직 관리 명부와 동일(칩 + 선택창 — sitesChkHTML 공용). */
function myOrgHTML(){
  const u=S.user;if(!u)return '';
  const me=roster().find(p=>p.id===u.uid)||{id:u.uid};
  const teams=(S.org.teams||[]);
  const uses=rankUses(me.rank);
  const rk=rankOf(me.rank);
  const tName=(teams.find(t=>t.id===me.team)||{}).name||'미배정';
  /* 654차: 권역은 id 가 아니라 이름으로 — 조직 관리 표(8448행)와 같은 방식 */
  const rName=(S.org.regions||[]).find(r=>r.id===me.region)?.name
    || (me.region?me.region:(uses.region?'미지정':'해당 없음'));
  const fix=v=>'<div class="myorg-fix">'+esc(v)+'</div>';
  const sitesHTML=uses.sites?`
      <div class="myorg-f myorg-f-wide"><label>담당 현장</label>${sitesChkHTML(me)}</div>`:'';
  return `<div class="myorg">
    <div class="myorg-h">소속</div>
    <div class="myorg-g myorg-g3">
      <div class="myorg-f"><label>팀</label>${fix(tName)}</div>
      <div class="myorg-f"><label>권역</label>${fix(rName)}</div>
      <div class="myorg-f"><label>직급</label>${fix(rankLabel(rk))}</div>
    </div>
    ${sitesHTML}
  </div>`;
}
/* 직급·권역을 바꾸면 아래 칸 구성이 달라진다 — 소속 블록만 다시 그린다 */
function pfScopeRefresh(){
  const wrap=document.querySelector('.myorg');if(!wrap)return;
  if(!S.user)return;
  const tmp=document.createElement('div');tmp.innerHTML=myOrgHTML();
  wrap.replaceWith(tmp.firstElementChild);
}
/* 아바타 선택 팝오버 — 애플 키보드와 같은 8개 분류 + 검색 + 최근 사용 */
function recentEmoji(){
  const v=(S.prefs&&S.prefs.emoji)||'';
  return String(v).split('|').filter(Boolean).slice(0,18);
}
function emojiPickerHTML(av){
  const rec=recentEmoji();
  return `<div class="popbox" id="pfPop">
    <div class="pop-h">아바타
      <button class="pop-x" data-act="pf.close" aria-label="닫기"><svg class="icn"><use href="#i-close"></use></svg></button>
    </div>
    <input class="inp inp-sm pf-srch" id="pfSrch" placeholder="이모지 검색(영문) · 직접 붙여넣기도 됩니다" autocomplete="off">
    <div class="pf-cats" id="pfCats">
      <button class="pf-cat act" data-cat="${rec.length?'recent':'smiley'}" data-act="pf.cat">${rec.length?'🕘':'😀'}</button>
      ${EMOJI_CATS.map((c,i)=>rec.length||i?'<button class="pf-cat" data-cat="'+c.id+'" data-act="pf.cat" data-tip="'+esc(c.label)+'">'+esc(c.s.slice(0,c.s.indexOf(' ')))+'</button>':'').join('')}
    </div>
    <div class="pf-emg" id="pfEmg"></div>
    <div class="pf-lab">배경색</div>
    ${palHTML('pfPal',av.color||'',
      '<div class="pal-c pal-auto'+(av.color?'':' sel')+'" data-c="" data-tip="자동 — 계정 기본 색"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#av-person"></use></svg></div>')}
  </div>`;
}
let PF_MORE=null;
function pfRenderEmg(cat,q,append){
  const box=$('#pfEmg');if(!box)return;
  let list;
  if(q){
    const t=q.toLowerCase();
    list=[];
    EMOJI_CATS.forEach(c=>emojiList(c.id).forEach(x=>{if(x.k.indexOf(t)>=0||x.e===q)list.push(x);}));
    list=list.slice(0,160);
  }else if(cat==='recent'){
    list=recentEmoji().map(e=>({e,k:''}));
  }else list=emojiList(cat);
  /* 500개 넘는 묶음을 한 번에 그리면 팝업이 늦게 뜬다 — 120개씩 끊어 스크롤에 맞춰 잇는다 */
  const CH=120;
  if(!append){
    PF_MORE={cat,q,list,at:0};
    box.innerHTML='<button class="pf-em dflt" data-e="" data-act="pf.pick" data-tip="기본 아이콘">'+AV_DFLT+'</button>';
    if(!list.length){box.innerHTML+='<div class="pf-empty">결과가 없습니다. 이모지를 직접 붙여넣어도 됩니다.</div>';return;}
    box.scrollTop=0;
  }
  if(!PF_MORE||!PF_MORE.list.length)return;
  const from=PF_MORE.at,to=Math.min(from+CH,PF_MORE.list.length);
  if(from>=to)return;
  box.insertAdjacentHTML('beforeend',
    PF_MORE.list.slice(from,to).map(x=>'<button class="pf-em" data-e="'+esc(x.e)+'" data-act="pf.pick">'+esc(x.e)+'</button>').join(''));
  PF_MORE.at=to;
}
/* 아래로 다 내려가면 다음 묶음을 잇는다 */
document.addEventListener('scroll',e=>{
  const box=e.target;
  if(!box||box.id!=='pfEmg'||!PF_MORE)return;
  if(box.scrollTop+box.clientHeight>=box.scrollHeight-80)pfRenderEmg(PF_MORE.cat,PF_MORE.q,true);
},true);
function pfDetach(){
  const p=$('#pfPop');
  /* #mb 에 transform 이 있어 그 안의 fixed 는 모달 기준이 된다 — body 직속으로 옮겨야 화면 기준이 된다 */
  if(p&&p.parentElement!==document.body)document.body.appendChild(p);
  return p;
}
/* 팝오버를 모달 오른쪽에 띄운다 — 자리가 없으면 왼쪽, 그다음 아래.
   프로필 미리보기(아바타)를 가리지 않는 게 목적. */
function pfPlace(){
  const p=pfDetach(),mb=$('#mb');if(!p||!mb)return;
  /* 위젯은 창이 좁아 옆에 세울 자리가 없다 — 모달을 밀지 않고 그 위에 겹쳐 띄운다(가로는 CSS가 가운데로) */
  if(WIDGET){
    const h=p.offsetHeight||372;
    p.style.top=Math.round(Math.max(8,Math.min((innerHeight-h)/2,innerHeight-h-8)))+'px';
    p.style.left='';
    return;
  }
  const m=mb.getBoundingClientRect();
  const w=p.offsetWidth||336,h=p.offsetHeight||372,gap=12;
  let left,top;
  if(m.right+gap+w<=window.innerWidth-8){left=m.right+gap;top=m.top;}
  else if(m.left-gap-w>=8){left=m.left-gap-w;top=m.top;}
  else if(m.bottom+gap+h<=window.innerHeight-8){left=Math.max(8,m.left);top=m.bottom+gap;}
  else{left=Math.max(8,Math.min(m.left+16,window.innerWidth-w-8));top=Math.max(8,m.top+16);}
  /* 위젯처럼 창이 좁으면 오른쪽·왼쪽 어디에도 못 붙는다 — 가로도 창 안으로 접는다 */
  left=Math.max(8,Math.min(left,window.innerWidth-w-8));
  top=Math.max(8,Math.min(top,window.innerHeight-h-8));
  p.style.left=Math.round(left)+'px';
  p.style.top=Math.round(top)+'px';
}
window.addEventListener('resize',()=>{const p=$('#pfPop');if(p&&p.classList.contains('open'))pfPlace();});
function pfDrop(){const p=document.getElementById('pfPop');if(p&&p.parentElement===document.body)p.remove();pfClosed();}
function renderAcctModal(tab){
  const u=S.user;if(!u)return;
  pfDrop();
  const role=S.role||'viewer';
  const t=tab||'profile';
  $('#mbody').innerHTML=`
    <div class="acct-tabs">
      <button class="acct-tab${t==='profile'?' act':''}" data-act="acct.tab" data-tab="profile">프로필</button>
      <button class="acct-tab${t==='pw'?' act':''}" data-act="acct.tab" data-tab="pw">비밀번호</button>
    </div>
    <div class="acct-pane">
      <div class="acct-real">${acctTabBody(t)}</div>
      <div class="acct-ghost" aria-hidden="true">${acctTabBody(t==='pw'?'profile':'pw').replace(/\sid="[^"]*"/g,'')}</div>
    </div>`;
  MODAL_CB={type:'acct',tab:t};
  PF_MORE=null;   /* 이모지는 팝업을 열 때 그린다 — 모달 여는 속도를 늦추지 않게 */
}
function openAcctModal(){
  const u=S.user;if(!u){toast('로그인이 필요합니다');return;}
  openModal('계정','','');   /* 하단 버튼 없음 — 닫기는 우측 상단 X, 로그아웃은 헤더 우측 */
  renderAcctModal('profile');
}
/* users/{uid} 는 부분 쓰기가 규칙에 막혀 항상 전체를 다시 쓴다 —
   빠뜨린 필드는 지워지므로 기존 값을 모아 두고 patch 만 얹는다. */
function userRecord(patch){
  const u=FB.auth&&FB.auth.currentUser;
  const rec=FB.userRec||{};
  const out={
    email:String((u&&u.email)||rec.email||'').toLowerCase(),
    role:rec.role||S.role||'viewer',
    createdAt:rec.createdAt||Date.now(),
    lastSeen:Date.now()
  };
  if(rec.name)out.name=rec.name;
  if(rec.avColor)out.avColor=rec.avColor;
  if(rec.avIcon)out.avIcon=rec.avIcon;
  Object.keys(patch||{}).forEach(k=>{
    if(patch[k]===''||patch[k]===null||patch[k]===undefined)delete out[k];
    else out[k]=patch[k];
  });
  return out;
}
/* 프로필 탭 저장 — 이름·아이콘·색을 한 번에 (버튼 하나) */
let PF_SEL={icon:null,color:null};
let AS_T=null,AS_BUSY=false;
function acctAutoSave(){
  clearTimeout(AS_T);
  acctMark('saving');
  AS_T=setTimeout(()=>{
    if(AS_BUSY){acctAutoSave();return;}
    AS_BUSY=true;
    Promise.resolve(acctSave(true)).finally(()=>{AS_BUSY=false;});
  },420);
}
function acctMark(state,msg){
  const el=$('#acctState');if(!el)return;
  el.className='acct-state '+(state||'');
  el.textContent=state==='saving'?'저장 중…':state==='err'?(msg||'저장 실패'):state==='ok'?'저장됨':'';
  if(state==='ok'){clearTimeout(acctMark._t);acctMark._t=setTimeout(()=>{if($('#acctState'))$('#acctState').textContent='';},1600);}
}
async function acctSave(silent){
  const u=FB.auth&&FB.auth.currentUser;
  /* 648차: 탭마다 이름 칸 id 가 다르다 — 지금 떠 있는 쪽을 읽는다 */
  const nameInp=$('#acctName')||$('#acctNamePw');
  const name=nameInp?nameInp.value.trim().slice(0,60):'';
  const cur=avOf((S.user||{}).uid||'');
  const icon=PF_SEL.icon===null?cur.icon:PF_SEL.icon;
  /* ⚠ 팔레트의 .sel 을 fallback 으로 읽으면, 색을 고른 적 없는 계정이 이름만 고쳐도
     그 순간의 자동 색이 avColor 로 박제된다 — 만진 적 없으면(null) 저장값을 그대로 둔다 */
  const color=PF_SEL.color!==null?PF_SEL.color:cur.color;
  /* 소속(팀·직급)은 조직 데이터(people)라 계정 저장과 별개로 먼저 반영한다 */
  const myUid=(S.user||{}).uid||'';
  const tSel=$('#acctTeam'),rSel=$('#acctRank');
  if(myUid){
    const me=roster().find(p=>p.id===myUid)||{};
    const pcur=(S.people||{})[myUid]||{};
    /* 627차: 팀·권역·직급은 관리자 배정 — 본인 저장은 기존값을 그대로 싣는다(규칙도 불변을 강제).
       최초 등록(레코드 없음)은 빈 팀·빈 권역·member 로 시작한다. */
    const rank=rankOf(pcur.rank);
    const uses=rankUses(rank);
    const sites=uses.sites?(pcur.sites||{}):{};   /* 628차: 담당 현장은 선택창(acct.sitePick)이 putPerson 으로 직접 반영 */
    store.putPerson(myUid,{
      name:name||me.name||'',email:String((S.user||{}).email||me.email||'').toLowerCase(),
      team:pcur.team||'',
      region:uses.region?(pcur.region||''):'',
      rank,sites});
    if(!S.live){rOrg();if(S.view==='tasks')rTasks();}
    pfScopeRefresh();          /* 직급에 따라 권역 칸 구성이 달라진다 */
  }
  if(!u){
    /* 로컬 모드 — 계정이 없어 이름·아바타는 저장할 수 없다 */
    acctMark(myUid?'ok':'err',myUid?'':'로그인 필요');
    if(!silent&&MODAL_CB&&MODAL_CB.type==='acct')renderAcctModal(MODAL_CB.tab||'profile');
    return;
  }
  if(name&&name!==acctNick()){
    try{await u.updateProfile({displayName:name});}catch(e){acctMark('err','이름 저장 실패');return;}
  }
  try{
    await FB.db.ref('users/'+u.uid).set(userRecord({name,avColor:color,avIcon:icon}));
    FB.userRec=FB.userRec||{};FB.userRec.name=name;FB.userRec.avColor=color;FB.userRec.avIcon=icon;
    S.accounts[u.uid]={...(S.accounts[u.uid]||{}),name,avColor:color,avIcon:icon};
    if(icon)store.putPref('emoji',[icon].concat(recentEmoji().filter(x=>x!==icon)).slice(0,18).join('|'));
    S.user=u;PF_SEL={icon:null,color:null};
    rAcct();rOrg();if(S.view==='tasks')rTasks();
    acctMark('ok');
  }catch(e){acctMark('err',(e&&e.message)||String(e));}
}
async function acctChangePw(){
  const u=FB.auth&&FB.auth.currentUser;if(!u){toast('로그인이 필요합니다');return;}
  const cur=($('#acctPwCur')||{}).value||'',n1=($('#acctPwNew')||{}).value||'',n2=($('#acctPwNew2')||{}).value||'';
  if(!cur){toast('현재 비밀번호를 입력하세요');return;}
  if(n1.length<6){toast('새 비밀번호는 6자 이상이어야 합니다');return;}
  if(n1!==n2){toast('새 비밀번호 확인이 일치하지 않습니다');return;}
  if(n1===cur){toast('현재와 다른 비밀번호를 사용하세요');return;}
  try{
    const cred=firebase.auth.EmailAuthProvider.credential(u.email,cur);
    await u.reauthenticateWithCredential(cred);
    await u.updatePassword(n1);
    ['#acctPwCur','#acctPwNew','#acctPwNew2'].forEach(id=>{const e=$(id);if(e)e.value='';});
    toast('비밀번호 변경됨');
  }catch(e){toast(fbAuthErr(e));}
}
function acctSignout(){
  if(!confirm('로그아웃하시겠습니까?'))return;
  closeModal();
  bootCacheClear();   /* 공용 PC 대비 — 로그아웃하면 부팅 캐시도 지운다 */
  try{FB.auth.signOut();}catch(e){toast('로그아웃 실패');}
}

function fbInit(){
  if(typeof firebase==='undefined'||!firebase.initializeApp)return;
  try{
    FB.app=firebase.apps&&firebase.apps.length?firebase.app():firebase.initializeApp(FB.cfg);
    if(FB.APPCHECK_KEY&&firebase.appCheck){
      /* 위젯에서만 디버그 토큰으로 바꿔 끼운다 — activate 보다 먼저 세워야 적용된다 */
      if(WIDGET&&FB.APPCHECK_DEBUG)self.FIREBASE_APPCHECK_DEBUG_TOKEN=FB.APPCHECK_DEBUG;
      try{const EP=firebase.appCheck.ReCaptchaEnterpriseProvider;
        firebase.appCheck().activate(EP?new EP(FB.APPCHECK_KEY):FB.APPCHECK_KEY,true);}
      catch(e){console.warn('[FB] appCheck',e);}
      /* 토큰 발급이 막히면(403·throttled) 콘솔에만 경고가 남는다 — 위 감시가 사용자에게 알린다 */
    }
    FB.auth=firebase.auth();FB.db=firebase.database();
    FB.auth.onAuthStateChanged(onAuth);
  }catch(e){console.warn('[FB] init',e);showGateForm();fbMsg('네트워크에 연결할 수 없습니다.');}
}
/* ═══════════ 657차: 연결 끊김 ═══════════
   RTDB 는 끊겨도 쓰기를 큐에 쌓아 두었다가 다시 붙으면 밀어 넣는다 —
   문제는 그 사이 사용자가 아무 표시도 못 본다는 것이다. 상태를 눈에 보이게만 한다.
   ⚠ navigator.onLine 은 사내망 안에서 인터넷만 끊긴 경우를 못 잡는다 → .info/connected 를 함께 본다. */
let _netWas=null,_netT=0;
/* 698차: 탭을 잠깐 다른 데 뒀다 돌아오면 .info/connected 가 순간 false 로 떨어져 「연결 끊김」이 떴다 — 실제 끊김이 아니다.
   끊김은 6초 이상 이어질 때만 보이고, 탭이 숨겨진 동안엔 판정하지 않는다(돌아오면 다시 잰다). 복구는 즉시 */
function netPaint(){
  const rawOff=(S.live&&S.conn===false)||navigator.onLine===false;
  if(rawOff){
    if(document.hidden){clearTimeout(_netT);_netT=0;return;}
    if(!_netT&&!_netWas){_netT=setTimeout(()=>{_netT=0;netPaintNow();},6000);}
    return;
  }
  clearTimeout(_netT);_netT=0;netPaintNow();
}
function netPaintNow(){
  const el=document.getElementById('ahOff');
  const off=(S.live&&S.conn===false)||navigator.onLine===false;
  if(el)el.hidden=!off;
  document.body.classList.toggle('netoff',!!off);
  /* 661차: 위젯은 헤더가 없어 알약이 안 보인다 — 상태가 바뀌는 순간 아래 토스트로 알린다.
     ⚠ 끊긴 동안 계속 띄우지 않는다(매 렌더마다 뜨면 방해) — 바뀔 때 한 번만. */
  if(_netWas!==null&&_netWas!==off){
    if(off)toast('연결 끊김 · 저장 대기',5000);   /* 662차: 위젯 폭에서 줄이 넘어가지 않게 짧게 */
    else toast('다시 연결됨');
  }
  _netWas=off;
}
function netWatch(){
  window.addEventListener('online',netPaint);
  window.addEventListener('offline',netPaint);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)netPaint();});   /* 698차: 돌아오면 다시 잰다 */
  netPaint();
}
function bindConn(){
  if(!FB.db)return;
  try{
    FB.db.ref('.info/connected').on('value',s=>{
      S.conn=s.val()===true;netPaint();   /* 안내는 netPaint 한 곳에서만 낸다 */
    });
  }catch(e){console.warn('[FB] conn',e);}
}
function enterLive(u){
  if(S.live)return;
  clearTimeout(FB._boot);clearTimeout(FB._watch);clearTimeout(FB._dbWatch);hideCover();
  S.live=true;S.user=u;store=FbStore;
  /* FB 첫 응답 전까지 마지막 캐시로 먼저 그린다 — 매일 여는 도구의 체감 속도.
     구독 값이 도착하면 그대로 덮어써서 캐시가 화면에 남는 일은 없다. */
  const c=bootCacheLoad();
  S.loading=!c;   /* 캐시가 있으면 그것으로 바로 그린다 — 뼈대는 **캐시 없는 첫 실행**에서만(348차) */
  if(c){
    S.org=c.org||S.org;normOrg(S.org);
    S.people=c.people||{};S.tasks=c.tasks||{};S.cfg=c.cfg||{};
    S.accounts=c.accounts||{};   /* 마지막으로 알던 지정색으로 즉시 그린다 — 깜빡임 방지 */
    rAll();
  }
  FbStore.bindShared();
  bindConn();
  subVisibleMonths();
  rAcct();
}
function exitLive(){
  S.live=false;S.user=null;S.loading=false;S.conn=null;netPaint();
  FB._subs.forEach(r=>{try{r.off();}catch(e){}});FB._subs=[];
  store=LocalStore;LocalStore.init();
  subVisibleMonths();rAll();rAcct();
}
/* 팀 이름 줄이기 — 'H서비스중부팀' → '중부'. 앞의 회사·조직 접두와 끝의 '팀'만 떼고 가운데만 쓴다 */
function rTeamSel(){
  const el=$('#teamsel');if(!el)return;
  const teams=(S.org.teams||[]).filter(t=>t.name);
  if(!teams.length){$('#tselWrap').innerHTML='';el.hidden=true;return;}
  if(!teams.some(t=>t.id===S.tk.t))S.tk.t=teams[0].id;
  /* 팀이 하나뿐이면 고를 것이 없다 — 선택기를 감춘다(390차). 팀이 늘면 저절로 다시 나온다.
     ⚠ 고른 팀(S.tk.t)은 감춘 상태에서도 위에서 정해 둔다 — 다른 화면이 이 값을 쓴다 */
  /* 484차: 팀이 하나여도 지금 보는 범위를 보여준다 — 사이드바 머리의 제목 역할을 겸한다 */
  el.hidden=false;
  const opts=teams.map(t=>'<option value="'+esc(t.id)+'"'+(t.id===S.tk.t?' selected':'')+'>'+esc(t.name)+'</option>').join('');
  /* 선택창은 정적 마크업 — 내용만 채운다 */
  const cur=teams.find(t=>t.id===S.tk.t)||teams[0];
  /* 516차: 네이티브 select 팝업은 OS 가 그려 앱과 결이 다르다 — 앱 팝업(tb-pop)으로 바꾼다 */
  $('#tselWrap').innerHTML=
    '<button class="tsel-b" id="teamSelEl" data-act="team.pop" aria-haspopup="listbox" aria-expanded="false">'
    +'<span class="tsel-t">'+esc(cur?cur.name:'')+'</span>'
    +'</button>'
    +'<div class="tb-pop tsel-pop" id="teamPop" role="listbox">'
    + teams.map(t=>'<button class="tsel-o'+(t.id===S.tk.t?' on':'')+'" role="option" data-act="team.switch" data-tid="'+esc(t.id)+'">'
        +'<span>'+esc(t.name)+'</span>'
        +(t.id===S.tk.t?'<svg class="icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>':'')
      +'</button>').join('')
    +'</div>';
}
/* ═══════════ 오후 점검 알림 — 그날 아직 안 끝낸 업무를 알림창에 띄운다 ═══════════
   ⚠ 어디에도 저장하지 않는다. 조건이 맞을 때만 알림창에 끼워 그리는 '가상 줄'이다 —
   업무를 끝내면 저절로 사라지고, 닫으면 그날은 다시 뜨지 않는다. */
const EVE_HOUR=17;                       /* 오후 5시 */

/* ── 종 아이콘 옆 미니 말풍선 ──
   빨간 점(7px)만으로는 바탕화면에 깔린 위젯에서 눈에 안 들어온다는 지적. 윈도우 토스트만큼
   방해하지 않으면서 한 번은 눈에 띄게 한다. 하루 한 번만 스스로 뜨고 10초 뒤 저절로 접힌다
   — 빨간 점은 그대로 남으므로 놓쳐도 되짚을 수 있다 */
const EVE_POP_KEY='calapp.evePop';
function evePopKey(){return EVE_POP_KEY+'.'+((S.user&&S.user.uid)||'local');}
function evePopDone(){try{return localStorage.getItem(evePopKey())===todayStr();}catch(e){return false;}}
function evePopHide(){const el=$('#evePop');if(el)el.remove();}
/* 말풍선을 누르면 '내 업무' 를 연다 — 남은 업무를 실제로 보여 주는 화면은 거기 하나뿐이다.
   ⚠ 252차에 알림창을 따로 만들었다가 걷어냈다. 같은 데이터(mineTasks+teamTasks)를 두 곳에서
   보여 주는 셈이라 겹쳤다 — 말풍선은 '알리는 일'만, 내 업무는 '보여 주는 일'만 맡는다 */
function eveOpenPanel(){
  if(WIDGET){widSideOpen('mine');return;}
  go('tasks');   /* 말풍선이 붙은 사이드바 항목과 같은 곳으로 */
}
/* 말풍선이 붙는 곳 — 위젯은 '내 업무' 아이콘, 앱은 사이드바의 업무 목록 항목 */
function eveBell(){
  return WIDGET?document.querySelector('[data-act="wid.side"][data-tab="mine"]')
              :document.querySelector('#sidebar .nvi[data-view="tasks"]');
}
/* 위젯 새 게시월 말풍선(615차) — 저녁 말풍선(evePop)과 같은 결: 새 게시월이 오면 한 번 뜨고
   10초 뒤 접힌다. 위젯에는 하자 화면이 없으므로 누르면 브라우저 대시보드(?df=dash)를 연다.
   꼬리는 설정(톱니)을 가리키고 색은 차콜(--lbl) — 파란 저녁 말풍선과 헷갈리지 않게. */
const DFPOP_KEY='calapp.dfSeenRm';
function dfNewPopMaybe(){
  if(!WIDGET||!ORG_RM)return;
  let seen='';try{seen=localStorage.getItem(DFPOP_KEY)||'';}catch(e){}
  if(ORG_RM<=seen)return;
  const gear=document.querySelector('[data-act="wid.set"]');
  if(!gear||!gear.isConnected){setTimeout(dfNewPopMaybe,1500);return;}   /* 위젯 첫 렌더 전이면 잠시 뒤 다시 */
  try{localStorage.setItem(DFPOP_KEY,ORG_RM);}catch(e){}
  const old=$('#dfNewPop');if(old)old.remove();
  const el=document.createElement('div');
  el.id='dfNewPop';
  el.innerHTML='<b>하자처리현황 '+Number(ORG_RM.slice(5))+'월 게시</b>';   /* evePop 과 동일 체급 — 굵은 한 줄 */
  document.body.appendChild(el);
  const r=gear.getBoundingClientRect(),b=el.getBoundingClientRect();
  let x=r.left+r.width/2-b.width/2;
  x=Math.max(6,Math.min(x,innerWidth-b.width-6));
  el.style.left=Math.round(x)+'px';
  let ty=r.bottom+8;
  const eve=document.getElementById('evePop');   /* 625차: 저녁 말풍선과 앵커(내 업무·톱니)가 68px 차라 포개진다 — 떠 있으면 아래로 쌓는다 */
  if(eve&&eve.classList.contains('on'))ty=Math.max(ty,eve.getBoundingClientRect().bottom+6);
  el.style.top=Math.round(ty)+'px';
  const ax=Math.max(14,Math.min(r.left+r.width/2-x,b.width-14));
  el.style.setProperty('--ax',Math.round(ax)+'px');
  requestAnimationFrame(()=>el.classList.add('on'));
  el.addEventListener('click',()=>{el.remove();
    window.open(location.origin+location.pathname+'?df=dash','_blank','noopener');
    toast('브라우저에서 하자처리 현황을 엽니다');});
  setTimeout(()=>{if(el.isConnected){el.classList.remove('on');setTimeout(()=>el.remove(),200);}},10000);
}
function evePopShow(force){
  if(!eveOn())return;
  if(isMob()&&!WIDGET)return;   /* 742차: 폰에서는 「오늘 남은 업무」 말풍선을 띄우지 않는다(사용자) — 화면이 좁고 종 아이콘이 없다 */
  if(!force&&evePopDone())return;
  const bell=eveBell();if(!bell||!bell.isConnected)return;
  /* 알림창이 이미 열려 있으면 굳이 겹쳐 띄우지 않는다 */
  const side=$('#widSide');
  if(side&&side.classList.contains('on'))return;   /* 이미 열려 있으면 굳이 겹쳐 띄우지 않는다 */
  evePopHide();
  try{localStorage.setItem(evePopKey(),todayStr());}catch(e){}
  const n=eveList().length;
  const el=document.createElement('div');
  el.id='evePop';
  el.innerHTML='<b>오늘 남은 업무 '+n+'건</b>';
  document.body.appendChild(el);
  const r=bell.getBoundingClientRect(),b=el.getBoundingClientRect();
  /* 779차: 사이드바가 접혀 있으면 아이콘 아래가 아니라 **오른쪽 옆**에 붙인다(툴팁과 같은 자리) — 전엔 좁은 아이콘 기준이라 달력 위로 튀어나와 가리키는 곳이 없어 보였다 */
  const sbMini=!WIDGET&&document.querySelector('#sidebar')&&document.querySelector('#sidebar').classList.contains('mini');
  if(sbMini){
    el.classList.add('side');
    el.style.left=Math.round(r.right+10)+'px';
    el.style.top=Math.round(r.top+r.height/2-b.height/2)+'px';
    el.style.setProperty('--ax','0px');
    requestAnimationFrame(()=>el.classList.add('on'));
    el.addEventListener('click',()=>{evePopHide();eveOpenPanel();});
    return;
  }
  let x=r.left+r.width/2-b.width/2;
  x=Math.max(6,Math.min(x,innerWidth-b.width-6));       /* 위젯은 창이 곧 화면 — 넘치면 잘린다 */
  el.style.left=Math.round(x)+'px';
  let ty2=r.bottom+8;
  const dnp=document.getElementById('dfNewPop');   /* 625차: 새 게시월 말풍선이 먼저 떠 있으면 그 아래로(역순 대비) */
  if(dnp)ty2=Math.max(ty2,dnp.getBoundingClientRect().bottom+6);
  el.style.top=Math.round(ty2)+'px';
  /* 꼬리는 종 한가운데를 가리키되, 둥근 모서리(10px) 밖으로 나가지 않게 안쪽으로 물린다 */
  const ax=Math.max(14,Math.min(r.left+r.width/2-x,b.width-14));
  el.style.setProperty('--ax',Math.round(ax)+'px');
  requestAnimationFrame(()=>el.classList.add('on'));
  /* 말풍선을 눌러도 알림창이 열린다 — 종을 겨냥하지 않아도 되게 */
  el.addEventListener('click',()=>{evePopHide();eveOpenPanel();});
}
/* 오늘 걸린 '내 업무 + 공통 업무' 중 아직 안 끝난 것.
   ⚠ mineTasks 는 완료·보류를 이미 뺀다. teamTasks 는 완료만 빼므로 보류(3)를 여기서 한 번 더 거른다
      — 일부러 미뤄 둔 것을 오후에 다시 찌르면 보류함의 뜻이 없어진다.
   ⚠ 공통 업무에 내가 담당자로도 들어 있으면 두 목록에 겹쳐 나온다 — sid/iid 로 한 번만 센다 */
function eveList(){
  const today=todayStr();
  const onToday=({it})=>{
    if(!it||!it.date)return false;
    const span=it.end&&it.end>it.date;
    return span?(it.date<=today&&today<=it.end):(it.date===today);
  };
  const seen=new Set(),out=[];
  mineTasks().concat(teamTasks().filter(({it})=>stEff(it)!==3))
    .filter(onToday)
    .forEach(x=>{const k=x.sid+'/'+x.iid;if(seen.has(k))return;seen.add(k);out.push(x);});
  return out;
}
function eveOn(){
  if(!S.live||!notiOn()||!myId())return false;
  const today=todayStr();
  const d=toDate(today).getDay();
  if(d===0||d===6)return false;                    /* 주말에는 띄우지 않는다 */
  const ho=holOf(today);
  if(ho&&ho.h)return false;                        /* 공휴일·팀 휴무일도 제외 */
  if(new Date().getHours()<EVE_HOUR)return false;  /* 5시 전에는 조용히 */
  return eveList().length>0;
}
/* ═══════════ 위젯 — 알림 · 내 업무 팝오버 ═══════════
   위젯만 쓰는 사람에게는 사이드바가 없다 — 알림과 내 업무를 헤더에서 바로 볼 수 있게 한다 */
function widSideRender(){
  if(!WIDGET)return;
  const box=$('#widSideB'),ttl=$('#widSideT'),cnt=$('#widSideN');
  if(!box)return;
  const dlab=d=>{const n=daysBetween(todayStr(),d);
    return n===0?'오늘':n===1?'내일':n===-1?'어제':(toDate(d).getMonth()+1)+'/'+toDate(d).getDate();};
  /* 한 줄 — 왼쪽에 날짜 알약, 오른쪽에 제목·부제. 두 목록이 같은 모양을 쓴다 */
  const row=(act,attrs,when,tone,title,sub)=>
    '<button class="wl" data-act="'+act+'"'+attrs+'>'
      +'<span class="wl-d'+(tone?' '+tone:'')+'">'+esc(when)+'</span>'
      +'<span class="wl-b"><span class="wl-t">'+esc(title)+'</span>'
      +(sub?'<span class="wl-s">'+esc(sub)+'</span>':'')+'</span></button>';
  const empty=(icon,msg)=>'<div class="wl-none"><svg class="icn"><use href="#'+icon+'"></use></svg><span>'+esc(msg)+'</span></div>';

  if(S.widSide==='mine'){
    if(ttl)ttl.textContent='내 업무';
    const me=myId();
    if(!me){box.innerHTML=empty('i-me','로그인하면 내 업무를 모아 볼 수 있습니다');if(cnt)cnt.textContent='';return;}
    const commons=teamTasks(),tasks=mineTasks();
    const holds=mineHolds();
    if(cnt)cnt.textContent='';
    /* 좁은 팝업이라 기본 3건만 보이고, 머리의 꺾쇠로 나머지를 펼친다(건수 표시 대신) */
    const MIN=3;
    const sec=(t,key,total,div)=>'<div class="wl-h'+(div?' wl-h2':'')+'">'+esc(t)
      +(total>MIN?'<button class="wl-more'+(S.widMore[key]?' on':'')+'" data-act="wid.more" data-k="'+key+'"'
        +' aria-label="'+(S.widMore[key]?'접기':'더 보기')+'"><svg class="icn"><use href="#i-chevr"></use></svg></button>':'')
      +'</div>';
    const cut=(list,key)=>S.widMore[key]?list:list.slice(0,MIN);
    box.innerHTML=
      sec('공통 업무','com',commons.length)
      +(commons.length?cut(commons,'com').map(({sid,iid,it})=>{const wd=taskDate(sid,iid,it);return row('wid.goTask',
          ' data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'" data-date="'+esc(wd||'')+'"',
          wd?dlab(wd):'기한 없음',
          (wd&&daysBetween(todayStr(),wd)<0)?'over':(wd&&daysBetween(todayStr(),wd)===0?'now':''),
          it.text||'제목 없음',
          [kindLabel(it.kind),siteName(it.site)].filter(Boolean).join(' · '));}).join('')
        :empty('i-tasks','공통 업무가 없습니다'))
      +sec('미완료 업무','mine',tasks.length,1)   /* 849차: 위에 구분선 */
      /* 231차: 미완료 줄은 여기서 바로 완료 처리할 수 있게 왼쪽에 진행 아이콘을 붙인다.
         아이콘은 줄 클릭(이동)과 겹치면 안 되므로 버튼을 줄 밖에 두고 한 칸으로 감싼다. */
      +(tasks.length?cut(tasks,'mine').map(({sid,iid,it})=>{const wd=taskDate(sid,iid,it);
        const late=wd&&daysBetween(todayStr(),wd)<0;
        return '<div class="wl-row">'
          +row('wid.goTask',
            ' data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'" data-date="'+esc(wd||'')+'"',
            wd?dlab(wd):'기한 없음',late?'over':(wd&&daysBetween(todayStr(),wd)===0?'now':''),
            it.text||'제목 없음',
            [kindLabel(it.kind),siteName(it.site)].filter(Boolean).join(' · '))   /* ⚠ 순서는 공통 줄·업무 목록과 같게 — 구분 → 현장 */
          +stIcon(stEff(it),' data-act="wid.st" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'"')
          +'</div>';}).join('')
        :empty('i-tasks','미완료 업무가 없습니다'))
      /* 보류함 — 아침 확인에서 넘긴 업무. 비어 있으면 머리째 넣지 않는다 */
      +(holds.length?sec('보류한 업무','hold',holds.length,1)
        +cut(holds,'hold').map(({sid,iid,it})=>{const wd=taskDate(sid,iid,it);return row('wid.goTask',
          ' data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'" data-date="'+esc(wd||'')+'"',
          wd?dlab(wd):'기한 없음','hold',
          it.text||'제목 없음',
          [kindLabel(it.kind),siteName(it.site)].filter(Boolean).join(' · '));}).join(''):'');
    return;
  }

}
function widSideOpen(tab){
  const el=$('#widSide');if(!el)return;
  const same=el.classList.contains('on')&&S.widSide===tab;
  S.widSide=same?'':tab;
  el.classList.toggle('on',!same);
  if(!same)widSideRender();
}
function rAcct(){
  const nm=$('#sbAcctName'),rb=$('#sbAcctRole');
  if(!nm)return;
  if(!S.user){nm.textContent=DEV_LOCAL?'로컬 모드':'로그인 전';nm.title='';if(rb){rb.textContent='';rb.className='sb-acct-role';}return;}
  const nick=acctNick()||'사용자';
  nm.textContent=nick;nm.title=nick;
  if(rb){const role=S.role||'viewer';rb.textContent=roleLabel(role);rb.className='sb-acct-role '+(role==='editor'?'r-editor':'r-viewer');}
  const a=S.user?avOf(S.user.uid):null;
  const paint=el=>{
    if(!el||!a)return;
    el.classList.add('av-cus');
    el.style.setProperty('--avc',colBg(a.color||ownColor(S.user.uid)));
    el.innerHTML=avInner(a.icon);   /* 이모지·기본 아이콘 모두 처리 */
  };
  paint($('#sbAcctAv'));
  paint($('#widAcctAv'));           /* 위젯 헤더 프로필 버튼도 같은 얼굴로 */
}

/* ═══════════ 달력 (FullCalendar) ═══════════ */
let CAL=null,MOBILE_CAL=null;
function calInit(){
  MOBILE_CAL=isNarrow();
  CAL=new FullCalendar.Calendar($('#fcal'),{
    initialView:'dayGridMonth',
    initialDate:S.selDate,
    firstDay:0,fixedWeekCount:true,showNonCurrentDates:true,   /* 항상 6주 — 달마다 칸 높이가 달라지지 않게 */
    /* 시간은 제목 안의 fmtSpan 이 담당 — FC 기본 표기("10a")를 켜 두면 이중으로 찍힌다 */
    displayEventTime:false,
    /* 공통·내 업무를 위로 올린다(ord). ⚠ 기간 업무(-duration)를 ord 보다 앞에 둔다 —
       여러 날에 걸친 막대는 모든 날에서 같은 줄이어야 하나로 이어지는데, 등급 때문에 날마다
       줄이 달라지면 FullCalendar 가 가장 아래 줄로 통일해 그 위 칸들이 비어 버린다.
       기간 막대는 예전처럼 맨 위에 두고, 하루짜리 막대들만 등급으로 세운다 */
    /* ⚠ 609차: 끝을 `title` 로 두면 수정 중 제목을 칠 때마다 막대가 줄을 옮겨 다닌다 —
       만든 순(cre) → 업무 id(pid) 로 못 박는다. 둘 다 편집 중에 변하지 않는 값이다. */
    eventOrder:'-duration,ord,oky,start,allDay,cre,pid',
    headerToolbar:false,height:'100%',dayMaxEvents:maxEvOf(),
    moreLinkContent:a=>(isMob()&&!WIDGET&&document.body.classList.contains('mcal-full'))?'+'+a.num:'외 '+a.num+'건 ›',   /* 704차: 폰 큰 달력은 「+N」 */   /* 234차: 5안(우측 정렬 미니) — 조용하게 오른쪽 끝에 */
    /* 기본 더보기 팝오버 대신 그 날짜를 골라 업무 패널(위젯은 팝업)에서 전부 보게 한다 */
    moreLinkClick:a=>{const ds=dstr(a.date);selDate(ds,true);
      if(WIDGET){S.widPop=true;rWidget();}
      return 'none';},
    dayHeaderContent:a=>DOW[a.date.getDay()],
    dayCellClassNames:a=>{const o=holOf(dstr(a.date));return o&&o.h?['hol']:[];},
    dayCellContent:a=>{
      const ds=dstr(a.date),o=holOf(ds);
      /* ⚠ 오늘이면서 공휴일인 날은 배지가 둘이다 — '오늘' 에 wnm 을 붙여 자리를 양보시킨다.
         안 그러면 둘 다 flex:1·margin-right:auto 라 공간을 나눠 갖고 **공휴일 문구가 칸 가운데로 밀린다** */
      const today=ds===todayStr()?'<span class="dhol dtoday'+(o?' wnm':'')+'">오늘</span>':'';
      const cls=o?('dhol'+(o.h?'':' anv')+(o.off?' off':'')):'';
      return{html:today+(o?'<span class="'+cls+'">'+esc(o.n)+'</span>':'')+'<span class="dnum">'+a.date.getDate()+'</span>'};},
    events:(info,ok)=>{
      const end=new Date(info.end);end.setDate(end.getDate()-1);   /* FullCalendar 의 end 는 다음 날(배타적) */
      ok(buildEvents(dstr(info.start),dstr(end)));
    },
    dateClick:info=>{S.selEnd='';selDate(String(info.dateStr).slice(0,10));if(isMob()&&!WIDGET){if(mcalIsLand()){const d=$('#view-calendar .dp-col');if(d)d.classList.add('on');}else mcalSet('mini');}},   /* 704차: 가로는 시트, 세로는 점 달력 */
    eventClick:info=>{info.jsEvent.preventDefault();
      const t=info.event.extendedProps.task;
      if(t){gotoTask(t.sid,t.iid);return;}
      const p=findPlan(info.event.extendedProps.pid);
      if(!p)return;
      const ds=info.event.extendedProps.occ||p.date;
      /* 위젯: 막대를 누르면 바로 그 날 팝업을 열고 그 업무를 펼친다(수정 모드로는 들어가지 않는다) */
      if(WIDGET){selDate(ds,true);S.planOpen=p.id;S.widPop=true;rDay();rWidget();return;}
      selDate(ds);openPlanEdit(p,null,null,info.event.extendedProps.occ);},
    eventDrop:info=>{const p=findPlan(info.event.extendedProps.pid);if(!p||(p.recur&&p.recur.f)){info.revert();return;}
      if(p.sid&&p.id)undoSnap([{sid:p.sid,iid:p.id}],'날짜 이동');   /* 657차: 손이 스쳐 옮겨져도 되돌린다.
        ⚠ 660차: 일정은 iid 가 아니라 id 를 쓴다(taskAsPlan) — 657차에 p.iid 로 적어 스냅샷이 안 떴다 */
      const oldYm=ymOf(p.date);const ns=info.event.startStr.slice(0,10);
      if(p.end)p.end=addDays(p.end,daysBetween(p.date,ns));
      p.date=ns;p.updatedAt=Date.now();
      if(oldYm===ymOf(p.date))store.putPlan(p);else store.movePlan(p,oldYm);
      if(!S.live){refetchCal();}
      undoCommit();
      selDate(p.date);toast('날짜 옮김 · Ctrl+Z');},
    editable:true,eventDurationEditable:false,
    selectable:true,selectMirror:true,
    /* 하루만 클릭한 건 날짜 선택으로만 처리하고(dateClick), 이틀 이상 끌었을 때만 기간 업무 작성 */
    select:info=>{
      const a=info.startStr.slice(0,10);
      const b=addDays(info.endStr.slice(0,10),-1);
      CAL.unselect();
      if(b<=a)return;
      /* 폼이 열려 있으면 기간만 채우고, 아니면 기억만 해 둔다('업무 추가'를 누를 때 적용) */
      if(S.planEdit&&$('#peDate')){
        $('#peDate').value=a;$('#peEnd').value=b;
        planAutosave();
        toast('기간을 '+a+' ~ '+b+' 로 바꿨습니다');return;
      }
      /* 드래그는 '기간 선택' — 그 사이 업무를 패널에 보여 주고, 업무 추가를 누르면 이 기간으로 연다 */
      selRange(a,b);},
    datesSet:()=>{rMonTitle();subVisibleMonths();markSel();if(WIDGET)setTimeout(calFitApply,0);   /* 776차: 위젯은 달이 바뀔 때마다 칸 높이로 막대 단계 재계산 */
      requestAnimationFrame(holdFit);}   /* 주 수(5·6주)가 바뀌면 칸 높이도 바뀐다 — 보류함을 다시 맞춘다(389차) */
  });
  CAL.render();
  markSel();
  /* Pretendard 가 늦게 스왑되면 칩 높이가 바뀌어 FullCalendar 가 측정해 둔
     기간 바 위치와 어긋난다(칩 겹침의 원인) — 폰트 로드 완료 후 한 번 재계산 */
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{if(CAL)CAL.updateSize();});
}
/* 반복 일정 전개 — 화면에 보이는 구간(from~to)의 발생일만 만든다 */
function recurDates(p,from,to){
  const out=[];const f=p.recur&&p.recur.f;if(!f)return out;
  const until=(p.recur.until||'').trim();
  let d=p.date,guard=0;
  const step=x=>f==='w'?addDays(x,7):f==='2w'?addDays(x,14):f==='m'?addMonths(x,1):addMonths(x,12);
  /* 시작이 화면보다 한참 이르면 빠르게 근처로 점프 */
  if(f==='w'||f==='2w'){
    const per=f==='w'?7:14,gap=daysBetween(d,from);
    if(gap>per)d=addDays(d,Math.floor(gap/per)*per);
  }else if(f==='m'||f==='y'){
    const per=f==='m'?1:12,gapM=(toDate(from).getFullYear()-toDate(d).getFullYear())*12+(toDate(from).getMonth()-toDate(d).getMonth());
    if(gapM>per)d=addMonths(d,Math.floor(gapM/per)*per);
  }
  while(d<from&&guard++<400)d=step(d);
  const mv=p.moveOn||{};
  while(d<=to&&guard++<400){
    if(until&&d>until)break;
    if(!(p.skipOn&&p.skipOn[d])){
      /* 이 회차만 다른 날로 옮긴 경우 — 옮긴 날이 범위 안이면 그 날짜로 낸다 */
      const to2=mv[d];
      if(!to2)out.push(d);
      else if(to2>=from&&to2<=to)out.push(to2);
    }
    d=step(d);
  }
  /* 범위 밖(앞·뒤) 회차가 이 범위로 옮겨온 경우도 포함 — 루프는 범위 안 원 회차만 돈다 */
  Object.keys(mv).forEach(src=>{
    const dst=mv[src];
    if(dst>=from&&dst<=to&&out.indexOf(dst)<0&&(src<from||src>to)&&!(p.skipOn&&p.skipOn[src]))out.push(dst);
  });
  return out.sort();
}
/* 옮긴 회차의 원래 날짜를 되찾는다 — 완료·제외 표시는 원래 날짜 기준으로 기록한다 */
function occSrc(p,date){
  const mv=(p&&p.moveOn)||{};
  const hit=Object.keys(mv).find(k=>mv[k]===date);
  return hit||date;
}
/* ── 반복 업무가 목록에서 보여야 할 날짜 ──
   ⚠ it.date 는 **맨 처음 회차**다. 그대로 쓰면 매월 14일 같은 업무가 목록에서 늘 몇 달 전 날짜로,
   따라서 영원히 '지연' 으로 보인다(달력은 회차를 펼치므로 멀쩡했다 — 두 화면이 어긋났다).
   규칙: 아직 안 끝난 회차 중 **오늘에서 가장 가까운 것**. 지난 회차가 남아 있어도 다음 회차가 더
   가까우면(주기의 절반을 넘겼으면) 다음 회차를 본다 — 완료 체크를 건너뛰는 업무가 영영 지난 날짜에
   묶이지 않게. ⚠ 반복이 아니면 it.date 를 그대로 돌려준다 — 부르는 쪽에서 분기하지 않게. */
function taskDate(sid,iid,it){
  if(!it)return '';
  if(!(it.recur&&it.recur.f)||!it.date)return it.date||'';
  const p=taskAsPlan(sid,iid,it),t=todayStr();
  const undone=d=>!(it.doneOn&&it.doneOn[occSrc(p,d)]);
  const past=recurDates(p,addDays(t,-400),addDays(t,-1)).filter(undone);
  const prev=past.length?past[past.length-1]:'';
  const next=recurDates(p,t,addDays(t,400)).find(undone)||'';
  if(prev&&next)return (daysBetween(prev,t)<=daysBetween(t,next))?prev:next;
  return prev||next||it.date;
}
/* 정렬 등급 — 공통 → 내 업무 → 팀장 → 그 밖의 담당자.
   달력 막대(planEvent)와 일자 패널 목록(sortPlans)이 같은 기준을 쓴다.
   ⚠ 달력은 기간 업무를 이보다 앞에 둔다(-duration) — 여러 날 막대는 모든 날에서 같은 줄이어야
   하나로 이어지는데, 등급으로 밀리면 빈 줄이 생긴다 */
function evOrd(p,team){
  if(team===undefined)team=!planOwners(p).length;
  if(team)return 0;                                   /* 공통 업무 */
  const own=planOwners(p),me=myId();
  if(me&&own.includes(me))return 1;                   /* 내 업무 */
  const R=roster();
  if(own.some(id=>{const q=R.find(x=>x.id===id);return q&&rankOf(q.rank)==='head';}))return 2;   /* 팀장 */
  return 3;                                           /* 그 밖의 담당자 */
}
/* 같은 등급 안에서 담당자끼리 묶는 키 — A업무1 · B업무1 · A업무2 처럼 섞이지 않게 한다.
   ⚠ 이름으로 묶는다(id 로 묶으면 순서가 사람 눈에 무의미하다). 공동 담당은 이름을 정렬해 이어 붙여
   같은 조합끼리 모인다. 담당자가 없으면 빈 문자열 — 공통 업무는 어차피 한 등급 안에 있다 */
function evOwnKey(p){
  const own=planOwners(p);
  if(!own.length)return '';
  return own.map(id=>ownName(id)||id).sort((a,b)=>String(a).localeCompare(String(b),'ko')).join(',');
}
function planEvent(p,date){
  const span=p.end?daysBetween(p.date,p.end):0;
  const done=isDone(p,date);   /* 반복은 occSrc 로 원 회차일의 doneOn 을 본다 — 옮긴 회차의 완료 표시가 칩에서 빠지던 버그 */
  const own=p.owner?ownName(p.owner):'';
  /* 담당자 없는 팀 공통 업무는 제목 앞에 작은 흰 점을 찍어 가른다(점은 CSS 로 그린다) */
  const team=!planOwners(p).length;
  return{
    id:p.id+'@'+date,
    title:(fmtSpan(p)?fmtSpan(p)+' ':'')+p.title+(own?' · '+own:''),
    start:(p.time&&!p.end)?date+'T'+p.time:date,
    end:span>0?addDays(date,span+1):undefined,
    allDay:!p.time||!!p.end,
    /* 231차: 공통 업무는 **속 빈 막대(2안)** — 계정 업무는 전부 꽉 찬 막대라 색과 무관하게 갈린다.
       예전에 파랑으로 저장된 공통 업무도 여기서 함께 윤곽선형이 된다(색 지정 여부와 무관). */
    backgroundColor:team?'transparent':planColor(p),
    borderColor:team?planColor(p):'transparent',
    textColor:team?'':(isLightBg(planColor(p))?'#1B1B1F':'#fff'),
    /* ⚠ display 를 지정하지 않으면 시간이 있는 업무는 FullCalendar 가 '점 형식'으로 그린다 —
       배경 없이 어두운 글자라 유리(어두운) 배경 위에서 거의 보이지 않는다. 전부 색 막대로 통일한다 */
    display:'block',
    classNames:(done?['done']:[]).concat((!team&&isLightBg(planColor(p)))?['on-light']:[]).concat(team?['team']:[]).concat(isRisk(p.kind)?['risk']:[]).concat(isRainbow(planColor(p))?['ev-rb']:[]).concat(isFlow(planColor(p))?['ev-fx']:[]).concat(isGrad(planColor(p))?['ev-gd','ev-g-'+gradBase(planColor(p)).slice(5)]:[]),   /* 633차: 담당자/공통 모두 무지개 렌더링 경로를 통일 · 677차: 흐름은 ev-fx 가 켠다 */
    /* 칸 안 차례 — 공통(0) · 내 업무(1) · 팀장(2) · 나머지(3).
       칸이 넘쳐 '외 N건' 으로 접힐 때 나와 상관 있는 것이 먼저 남는다(eventOrder 참조) */
    extendedProps:{pid:p.id,occ:date,recur:!!(p.recur&&p.recur.f),ord:evOrd(p,team),oky:evOwnKey(p),cre:Number(p.createdAt)||0},
    editable:!(p.recur&&p.recur.f)
  };
}
function visibleRange(){
  if(!CAL)return[S.selDate,S.selDate];
  const a=CAL.view.activeStart,b=new Date(CAL.view.activeEnd);b.setDate(b.getDate()-1);
  return[dstr(a),dstr(b)];
}
function regSel(){const r=S.filter.reg;return Array.isArray(r)?r.map(String):(r&&r!=='*'?[String(r)]:[]);}
/* 모든 업무를 한 곳(tasks)에서 읽는다 — 날짜가 있으면 달력에, 기한이 있으면 기한 배지로 */
function allTasks(){
  const out=[],hot=S.tasks||{},src=mergedTaskMaps();
  Object.keys(src).forEach(sid=>{
    const m=src[sid]||{};
    Object.keys(m).forEach(iid=>{const it=m[iid];
      if(it)out.push({sid,iid,it,arch:ARCH.loaded&&!((hot[sid]||{})[iid])});});
  });
  return out;
}
/* 일정 편집기가 만든 모양 → 업무 레코드. 소속(sid)은 첫 담당자, 없으면 팀 공통 */
function planToTask(p){
  const owns=Object.keys(p.owners||p.assignees||{}).filter(k=>(p.owners||p.assignees)[k]);
  const prev=allTasks().find(x=>x.iid===p.id);
  /* ⚠ 담당자가 곧 소속이다 — prev.sid 를 그대로 쓰면 담당자를 바꿔도 만든 사람 밑에 남는다.
     담당자를 비우면 팀 공통으로 돌아간다. 소속이 바뀌면 putPlan 이 옛 자리를 지운다 */
  const sid=owns[0]||(curTeam()&&curTeam().id)||(S.org.teams&&S.org.teams[0]&&S.org.teams[0].id)||'team';
  const base=prev?prev.it:{};
  const item={...base,
    text:p.title!==undefined?p.title:base.text,
    prog:p.body!==undefined?p.body:base.prog,
    date:p.date||'',end:p.end||'',time:p.time||'',
    site:p.site!==undefined?p.site:(base.site||''),
    kind:p.kind!==undefined?kindOf(p.kind):kindOf(base.kind||''),
    plan:'',   /* (389차) 처리계획은 내용으로 합쳤다 — 새로 쓰지 않는다 */
    links:p.links!==undefined?(p.links||{}):(base.links||{}),
    color:p.color||base.color||'',
    assignees:(()=>{const o={};owns.forEach(k=>{o[k]=1;});return o;})(),
    recur:(p.recur&&p.recur.f)?{f:p.recur.f,until:String(p.recur.until||'')}:{f:'',until:''},
    st:(p.st!==undefined?stOf(p.st):(p.done?2:stOf(base.st))),
    createdAt:Number(base.createdAt||p.createdAt)||Date.now(),updatedAt:Date.now()};
  ['doneOn','skipOn','moveOn'].forEach(k=>{if(p[k])item[k]=p[k];else if(base[k])item[k]=base[k];});
  if(!item.recur.f){delete item.doneOn;delete item.skipOn;delete item.moveOn;}
  return{sid,iid:p.id,item,prevSid:prev?prev.sid:null};
}
function taskAsPlan(sid,iid,it){
  /* 달력·일자 패널이 쓰던 모양으로 감싼다 — 필드 이름만 맞춰 준다 */
  return{...it,id:iid,sid,title:it.text||'',body:taskBody(it),
    owners:it.assignees||{},done:stEff(it)===2};
}
/* ⚠ 범위는 **FullCalendar 가 넘겨주는 것**을 먼저 쓴다 — CAL.view 를 읽으면 달을 넘길 때
   뷰 상태가 갱신되기 전에 계산될 수 있고, 그러면 그 달의 반복 회차가 통째로 빠진다.
   인자가 없으면(직접 호출) 지금 보이는 범위로 떨어진다. */
function buildEvents(rFrom,rTo){
  const vr=visibleRange();
  const from=rFrom||vr[0],to=rTo||vr[1];
  archNeed(from);   /* 아카이브 경계보다 과거를 보면 옛 업무를 읽어 합친다(384차) */
  const evs=[],today=todayStr();
  /* 수정 중인 업무는 저장 전이라도 draft 로 그린다 — 입력하는 대로 달력에 바로 반영된다 */
  const pe=S.planEdit,dr=(pe&&pe.draft&&pe.draft.title)?pe.draft:null;
  allTasks().forEach(({sid,iid,it})=>{
    if(dr&&iid===dr.id)return;
    if(!taskFilterOk(sid,it))return;
    const p=taskAsPlan(sid,iid,it);
    if(it.date){
      if(it.recur&&it.recur.f)recurDates(p,from,to).forEach(d=>evs.push(planEvent(p,d)));
      else evs.push(planEvent(p,it.date));
    }
  });
  if(dr&&dr.date){
    if(dr.recur&&dr.recur.f)recurDates(dr,from,to).forEach(d=>evs.push(planEvent(dr,d)));
    else evs.push(planEvent(dr,dr.date));
  }
  return evs;
}
function refetchCal(){
  if(!CAL)return;
  CAL.refetchEvents();
  /* 막대가 그려진 뒤라야 칸을 잴 수 있다 — 한 박자 뒤에 맞춘다 */
  requestAnimationFrame(()=>requestAnimationFrame(calFitApply));
}
function findPlan(id){
  const hit=allTasks().find(x=>x.iid===id);
  return hit?taskAsPlan(hit.sid,hit.iid,hit.it):null;
}
/* 달 이동 시 로컬 모드 이벤트 재조회 — 예전 월별 구독(subPlans)은 tasks 통합으로 폐기 */
function subVisibleMonths(){
  if(!CAL)return;
  if(!S.live)refetchCal();
}
/* 645차: 모바일 달력은 FullCalendar 대신 미니달력 + 상시 업무 패널로 본다.
   ⚠ 점은 CAL.getEvents() 에서 뽑는다 — 달력 필터가 이미 반영된 목록이라 필터를 두 번 구현하지 않는다.
   ⚠ 업무 현황의 miniCalHTML 은 S.mineYm·mine.day(업무 현황 상태)에 묶여 있어 그대로 쓸 수 없다. */
/* 733차: 폰 달력 = 미니 격자 3장(이전·이번·다음 달)을 가로로 이어 붙인 트랙. 손가락을 따라 밀고 놓으면 이웃 달로 스냅한다.
   막대는 FullCalendar 의 막대 규격(≤620 구간: 15px·10.5px·500·모서리 3·완료 .72·공통=속 빈 막대)을 그대로 옮겼다.
   ⚠ 사건은 CAL.getEvents()(보이는 달만) 가 아니라 buildEvents(from,to) 로 세 달 범위를 한 번에 받는다. */
function mcalEvs(from,to){
  return buildEvents(from,to).map(ev=>{
    const st=String(ev.start).slice(0,10);
    let en=ev.end?addDays(String(ev.end).slice(0,10),-1):st;if(en<st)en=st;   /* FullCalendar end 는 배타(다음 날) */
    const cn=ev.classNames||[],team=cn.indexOf('team')>=0;
    const raw=team?ev.borderColor:ev.backgroundColor;
    return{st,en,c:colBg(raw||'var(--lbl3)'),done:cn.indexOf('done')>=0,team,light:cn.indexOf('on-light')>=0,risk:cn.indexOf('risk')>=0,t:ev.title||''};
  });
}
/* 한 칸에 담는 막대 수 — 셀 높이(mcalFullH)에서 위아래 여백 5·숫자 줄 16·막대 위 여백 2 를 빼고(=H-23) 막대 피치 17(15+틈 2)로 나눈다(+2 는 마지막 틈).
   넘치면 마지막 줄을 「+N」 으로 쓴다. ⚠ 값들은 CSS `.mc-d` 패딩·`.n` 16px·`.mc-bar` 15px·gap 2 와 짝 */
function mcalCap(){return Math.max(1,Math.min(6,Math.floor((mcalFullH()-21)/17)));}
function mcalPane(y,m,evs,dots){
  const first=new Date(y,m,1),days=new Date(y,m+1,0).getDate(),lead=first.getDay();
  const prevDays=new Date(y,m,0).getDate();
  const CAP=mcalCap();
  const lanes={};   /* 날짜 → [줄0, 줄1, …] — 주 단위로 줄을 배정해 기간 업무가 한 주 안에서 같은 줄에 온다 */
  const gridStart=addDays(y+'-'+pad(m+1)+'-01',-lead);
  for(let w=0;w<6;w++){
    const ws=addDays(gridStart,w*7),we=addDays(ws,6);const used=[];
    evs.filter(e=>e.st<=we&&e.en>=ws).forEach(e=>{
      const a=e.st>ws?e.st:ws,b=e.en<we?e.en:we;
      let k=0;while(used[k]&&used[k].some(r=>!(r.b<a||r.a>b)))k++;
      (used[k]=used[k]||[]).push({a,b});
      const n=daysBetween(a,b)+1;   /* 이 주 안의 길이 — 머리 조각의 제목이 이어진 조각 위로 흐르게 폭을 준다 */
      for(let d=a;d<=b;d=addDays(d,1)){(lanes[d]=lanes[d]||[])[k]={e,s:d===e.st||d===ws,en:d===e.en||d===we,head:d===a,n};}
    });
  }
  const today=todayStr();
  let cells='';
  for(let i=0;i<lead;i++)cells+='<div class="mc-d out"><span class="n">'+(prevDays-lead+i+1)+'</span></div>';
  for(let d=1;d<=days;d++){
    const ds=y+'-'+pad(m+1)+'-'+pad(d),dw=(lead+d-1)%7,ho=holOf(ds);
    const ln=lanes[ds]||[],over=ln.length>CAP,show=over?CAP-1:Math.min(ln.length,CAP);
    cells+='<button class="mc-d'+(ds===today?' today':'')+(ds===S.selDate?' sel':'')
      +((dw===0||(ho&&ho.h))?' sun':'')+(dw===6?' sat':'')+'" data-act="cal.day" data-date="'+ds+'"'
      +(ho?' data-tip="'+esc(ho.n)+'"':'')+'>'
      +'<span class="n">'+d+'</span>'
      +(ho&&ho.n?'<span class="mc-ho">'+esc(ho.n)+'</span>':'')
      +(ln.length
        ?'<span class="mc-bars">'+Array.from({length:show},(_,k)=>{const o=ln[k];if(!o)return '<i class="mc-bar sp"></i>';
            const e=o.e;
            return '<i class="mc-bar'+(e.done?' dn':'')+(e.team?' tm':'')+(e.light?' lt':'')+(e.risk?' rk':'')+(o.s?' s':'')+(o.en?' e':'')+'" style="background:'+esc(e.c)+'">'
              +((o.head||e.team)?'<b'+((o.head&&o.n>1)?' style="width:calc('+o.n+'*100% - '+(2*o.n+2)+'px)"':'')+'>'+(o.head?esc(e.t):'')+'</b>':'')+'</i>';}).join('')
          +(over?'<i class="mc-more">+'+(ln.filter(Boolean).length-show)+'</i>':'')+'</span>'
        :'')
      +(dots[ds]&&dots[ds].length
        ?'<span class="dots">'+dots[ds].slice(0,3).map(o=>'<i class="'+(o.done?'dn':'')+'" style="background:'+esc(o.c)+'"></i>').join('')+'</span>'
        :'')+'</button>';
  }
  for(let i=lead+days;i<42;i++)cells+='<div class="mc-d out"><span class="n">'+(i-lead-days+1)+'</span></div>';
  return '<div class="mc-g">'+cells+'</div>';
}
function calMiniHTML(){
  if(!CAL)return '';
  const c=CAL.view.currentStart,y=c.getFullYear(),m=c.getMonth();
  /* 세 달의 격자 범위(앞뒤 6주)를 한 번에 — archNeed 도 한 번만 */
  const pm=new Date(y,m-1,1),nm=new Date(y,m+1,1);
  const from=addDays(dstr(pm),-6),to=addDays(dstr(new Date(nm.getFullYear(),nm.getMonth()+1,0)),42);
  const evs=mcalEvs(from,to);
  evs.sort((a,b)=>(a.st<b.st?-1:a.st>b.st?1:0)||((b.en>a.en)?1:-1));
  const dots={};
  evs.forEach(e=>{for(let d=e.st;d<=e.en;d=addDays(d,1))(dots[d]=dots[d]||[]).push({c:e.c,done:e.done});});
  Object.keys(dots).forEach(d=>dots[d].sort((a,b)=>(a.done?1:0)-(b.done?1:0)));
  return '<div class="mini-cal cal-mini">'
    +'<div class="mc-w">'+DOW.map((w,i)=>'<span'+(i===0?' class="sun"':i===6?' class="sat"':'')+'>'+w+'</span>').join('')+'</div>'
    +'<div class="mc-slide"><div class="mc-track">'
    +mcalPane(pm.getFullYear(),pm.getMonth(),evs,dots)
    +mcalPane(y,m,evs,dots)
    +mcalPane(nm.getFullYear(),nm.getMonth(),evs,dots)
    +'</div></div></div>';
}
/* 704차: 모바일 달력 두 상태 — 'full'(큰 월 달력, 기본) ↔ 'mini'(점 달력 + 업무 패널). 네이버 캘린더 방식.
   날짜 탭·위로 스와이프 → mini, 패널을 맨 위에서 아래로 당김·점 달력에서 아래로 스와이프 → full. 좌우 스와이프 = 월 이동.
   가로 모드(높이 500 이하)는 늘 full 이고 패널은 아래에서 올라오는 시트(.dp-col.on). */
S.mcal=S.mcal||'full';
/* 732차: 가로로 눕히면 폰이라도 데스크톱 레이아웃(달력 + 오른쪽 업무 패널)을 쓴다 */
function mcalIsLand(){return isMob()&&!WIDGET&&matchMedia('(orientation:landscape)').matches&&innerWidth>=640;}
/* 733차: 셀 높이 두 값 — ⚠ CSS(`.mcal-full … .mc-d{height:calc((100dvh - var(--th) - 78px) / 6)}` · `.mcal-mini … 46px`)와 같은 식.
   손가락을 따라가는 전환(mcalDrag)이 이 값 사이를 보간하므로 한쪽을 바꾸면 다른 쪽도 함께. */
const MCAL_MINI_H=46;
function mcalFullH(){const th=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--th'))||46;return Math.max(MCAL_MINI_H,(innerHeight-th-78)/6);}
function mcalSet(mode){
  if(!isMob()||WIDGET){document.body.classList.remove('mcal-full','mcal-mini','mcal-land','mcal-drag');return;}
  const land=mcalIsLand();
  document.body.classList.toggle('mcal-land',land);
  document.body.classList.remove('mcal-drag');
  const box=$('#view-calendar');if(box){box.style.removeProperty('--mch');box.style.removeProperty('--mcp');}
  if(land){   /* 가로 = 데스크톱 레이아웃(달력 + 오른쪽 패널). 확장/축소 없음 */
    document.body.classList.remove('mcal-full','mcal-mini');
    const d=$('#view-calendar .dp-col');if(d)d.classList.remove('on');
    S.mcal='full';rCalMini();if(CAL)requestAnimationFrame(()=>{try{CAL.updateSize();}catch(e){}});return;
  }
  S.mcal=mode;
  document.body.classList.toggle('mcal-full',mode==='full');
  document.body.classList.toggle('mcal-mini',mode==='mini');
  rCalMini();
}
function mcalTitle(){
  const t=$('#tbt');if(!t||!CAL)return;
  if(S.view!=='calendar'||!isMob()||WIDGET)return;
  const c=CAL.view.currentStart;
  t.innerHTML='<button class="tbt-ym" data-act="cal.pick">'+c.getFullYear()+'. '+(c.getMonth()+1)+'.<svg class="icn" aria-hidden="true"><use href="#i-chevd"></use></svg></button>';
}
function rCalMini(){
  const box=$('#calMini');if(!box)return;
  mcalTitle();
  /* ⚠ 위젯도 폭이 좁아 isMob()이 참이다 — 위젯은 FullCalendar 를 그대로 쓰므로 제외한다 */
  const on=isMob()&&S.view==='calendar'&&!WIDGET;
  box.hidden=!on;
  if(!on){box.innerHTML='';return;}
  paintHTML(box,calMiniHTML());
}
function rMonTitle(){
  if(!CAL)return;const c=CAL.view.currentStart;
  $('#calMonTxt').textContent=(c.getMonth()+1)+'월';
  $('#calYearTxt').textContent=c.getFullYear()+'년';
  calTodaySync();   /* 826차: 달이 바뀌면 「오늘」 칩을 보이거나 숨긴다 */
  /* 644차: 12월이면 공통 업무 막대를 크리스마스 줄무늬로 — 보고 있는 달 기준
     ⚠ 681차에 스킨 고르기를 넣었다가 되돌렸다(682차). 다시 넣는다면 설정 카드가 아니라
        **색 팔레트 아래 구분선 밑에 스킨 칩**으로 붙이기로 했다 — 색과 같은 자리에서 고르는 편이 맞다. */
  document.body.classList.toggle('dec',c.getMonth()===11);
  rCalMini();
}
/* 연·월 바로 가기 — 제목을 누르면 뜬다 */
let YM_Y=null;
function ymPickHTML(){
  const c=CAL?CAL.view.currentStart:new Date();
  const cy=YM_Y===null?c.getFullYear():YM_Y;
  const now=new Date(),ty=now.getFullYear(),tm=now.getMonth()+1;
  const sy=c.getFullYear(),sm=c.getMonth()+1;
  const isNow=sy===ty&&sm===tm;
  return `<div class="ymp">
    <div class="ymp-h">
      <button class="cal-nb" data-act="cal.pickY" data-d="-1" aria-label="이전 해"><svg class="icn"><use href="#i-chevl"></use></svg></button>
      <b>${cy}년</b>
      <button class="cal-nb" data-act="cal.pickY" data-d="1" aria-label="다음 해"><svg class="icn"><use href="#i-chevr"></use></svg></button>
    </div>
    <div class="ymp-g">
      ${Array.from({length:12},(_,i)=>{
        const m=i+1,sel=cy===sy&&m===sm,today=cy===ty&&m===tm;
        return '<button class="ymp-m'+(sel?' sel':'')+(today?' now':'')+'" data-act="cal.goYM" data-y="'+cy+'" data-m="'+m+'">'+m+'월</button>';
      }).join('')}
    </div>
    <button class="ymp-now" data-act="cal.today"${isNow?' disabled':''}>오늘로 이동</button>
  </div>`;
}
function openYMPick(){
  YM_Y=null;
  const old=$('#ymPop');
  if(old){old.remove();document.removeEventListener('click',ymOutside,true);return;}   /* 732차: 바깥 클릭 감시도 같이 풀어야 다음 탭이 먹힌다 */
  /* 연·월 버튼이 있는 달력 열 기준으로 붙인다(.cal-card 는 position:relative) */
  const host=$('#view-calendar .cal-card');if(!host)return;
  const pop=document.createElement('div');
  pop.id='ymPop';pop.innerHTML=ymPickHTML();
  const btn2=(isMob()&&!WIDGET&&!mcalIsLand())?$('#topbar .tbt-ym'):$('#view-calendar .cal-title');   /* 733차: 폰은 상단바 년월 버튼 기준 */
  host.appendChild(pop);
  /* ⚠ offsetTop 계산은 위젯(글라스)에서 4px 어긋나 알약을 덮었다(522차) — 붙인 뒤 실측으로 보정한다.
     간격 8px 는 필터 팝업과 동일. 포함 블록이 무엇이든 화면 좌표 차이만큼 옮기므로 항상 맞는다 */
  if(btn2){
    pop.style.top='0px';
    const want=btn2.getBoundingClientRect().bottom+8;
    pop.style.top=(want-pop.getBoundingClientRect().top)+'px';
  }
  setTimeout(()=>{document.addEventListener('click',ymOutside,true);},0);
}
function ymOutside(e){
  const pop=$('#ymPop');
  if(!pop){document.removeEventListener('click',ymOutside,true);return;}
  if(pop.contains(e.target)||e.target.closest('.cal-title,.tbt-ym'))return;   /* 여는 버튼 클릭은 토글이 처리한다 — 폰 상단바 버튼(.tbt-ym)도 예외(733차: 빠져 있어 캡처가 먼저 닫고 토글이 다시 열어 늘 열려 있었다) */
  closeYMPop();
}
function closeYMPop(){
  const pop=$('#ymPop');if(pop)pop.remove();
  document.removeEventListener('click',ymOutside,true);
}
/* 모바일 하단 시트 — 날짜를 누르면 일자 패널이 올라온다(캘린더 앱 UX) */
const isMob=()=>matchMedia('(max-width:960px)').matches;
function dpSheet(open){
  const col=$('#view-calendar .dp-col');if(!col)return;
  S.dpSheet=!!open;
  col.classList.toggle('on',S.dpSheet);
  /* 645차: 모바일 달력 패널은 상시로 떠 있다 — 스크림은 사이드바 드로어에만 쓴다 */
  const sc=$('#scrim');if(sc)sc.classList.toggle('on',$('#sidebar').classList.contains('mob-open'));
}
function markSel(){
  $$('#fcal .fc-daygrid-day.sel-day').forEach(el=>el.classList.remove('sel-day','sel-t','sel-b','sel-l','sel-r'));
  /* 기간 선택이면 그 사이 날짜를 모두 표시한다 */
  const a=S.selDate,b=S.selEnd||S.selDate;
  const inSel=d=>!!d&&d>=a&&d<=b;
  const tds=$$('#fcal .fc-scrollgrid-sync-table td.fc-daygrid-day');
  tds.forEach(td=>{
    const d=td.getAttribute('data-date');
    if(inSel(d))td.classList.add('sel-day');
  });
  /* 각 변은 그 방향 이웃 칸이 선택되지 않았을 때만 그린다 — 여러 주에 걸치면 하나의 계단형 도형이 된다.
     이웃은 좌우 ±1일, 위아래 ±7일(같은 요일). 표 가장자리 칸은 무조건 변을 둔다(격자 밖은 이웃이 없다) */
  const rows=$$('#fcal .fc-scrollgrid-sync-table tr');
  rows.forEach((tr,ri)=>{
    const cells=Array.from(tr.querySelectorAll('td.fc-daygrid-day'));
    cells.forEach((td,ci)=>{
      if(!td.classList.contains('sel-day'))return;
      const d=td.getAttribute('data-date');
      if(ci===0||!inSel(addDays(d,-1)))td.classList.add('sel-l');
      if(ci===cells.length-1||!inSel(addDays(d,1)))td.classList.add('sel-r');
      if(ri===0||!inSel(addDays(d,-7)))td.classList.add('sel-t');
      if(ri===rows.length-1||!inSel(addDays(d,7)))td.classList.add('sel-b');
    });
  });
}
/* 기간 선택 — 시작·종료를 함께 잡는다(하루면 selEnd 없음) */
function selRange(a,b){
  S.selEnd=(b&&b>a)?b:'';
  selDate(a);
}
function selDate(ds,quiet){
  ds=String(ds||'').slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(ds))return;   /* 잘못된 값이 들어오면 무시 — NaN 표시 방지 */
  const same=S.selDate===ds;
  S.selDate=ds;
  if(S.selEnd&&S.selEnd<=ds)S.selEnd='';
  /* 위젯: 첫 클릭은 날짜 선택까지만, **같은 칸을 한 번 더** 눌러야 업무 팝업이 뜬다.
     quiet 는 '이동만'(오늘·연월 이동·업무 바 클릭 뒤 별도 처리) */
  if(WIDGET){
    if(!same)S.planOpen='';
    S.widPop=quiet?false:(same&&!S.widPop);
    if(!S.widPop)S.planOpen='';   /* 팝업을 닫으면 펼친 카드도 접는다 */
  }   /* 같은 칸: 안 떠 있으면 열고, 떠 있으면 닫는다 */
  setTimeout(rWidget,0);
  if(CAL&&ymOf(ds)!==CAL.view.currentStart.getFullYear()+'-'+pad(CAL.view.currentStart.getMonth()+1))CAL.gotoDate(ds);
  markSel();
  if(isMob()&&S.view==='calendar')dpSheet(true);
  /* 편집기가 열려 있을 때 — 새 업무면 날짜가 따라가고, 기존 업무를 고치는 중이면 폼을 닫는다.
     (다른 날을 눌렀는데 그 날 목록 위에 남의 날 업무 폼이 계속 떠 있으면 혼란스럽다) */
  if(S.planEdit&&$('#dpEdit')){
    /* 다른 날로 옮기면 열려 있던 폼은 닫는다. closePlanEdit 이 제목이 있을 때만 저장하므로
       빈 폼은 그대로 버려지고, 새 날짜의 팝업이 수정 상태로 열리는 일도 없다 */
    if(S.planEdit.orig||!same){closePlanEdit();S.planOpen='';rDayHead();rDay();setTimeout(rWidget,0);return;}
    rDayHead();
    /* ⚠ 이미 있는 업무를 고치는 중이라면 날짜를 따라가지 않는다 —
       달력을 둘러보려고 다른 날을 눌렀을 뿐인데 업무가 그 날로 옮겨져 버렸다(실사용 지적).
       새 업무를 쓰는 중일 때만 시작일이 따라가고, 기존 업무의 날짜는 기간 드래그나 입력칸으로만 바꾼다. */
    if(!S.planEdit.orig){
      const i=$('#peDate'),e=$('#peEnd');
      if(i)i.value=ds;
      if(e)e.value='';          /* 한 칸만 눌렀으니 기간은 해제 */
      planAutosave();
    }
    return;
  }
  rDay();
}

/* ───── 우측 일자 패널 ───── */
function dayPlans(ds,raw){
  /* raw=true 면 화면 필터·검색을 무시한다 */
  const out=[];
  allTasks().forEach(({sid,iid,it})=>{
    if(!it.date)return;
    if(!raw&&!taskFilterOk(sid,it))return;
    const p=taskAsPlan(sid,iid,it);
    if(it.recur&&it.recur.f){
      if(recurDates(p,ds,ds).length)out.push({p,occ:ds});
      return;
    }
    const last=it.end||it.date;
    if(ds>=it.date&&ds<=last)out.push({p,occ:it.date});
  });
  return out.sort((a,b)=>{
    const ta=a.p.time||'99',tb=b.p.time||'99';
    return ta<tb?-1:ta>tb?1:(a.p.createdAt||0)-(b.p.createdAt||0);});
}
/* 카드 상태 — 반복 회차는 doneOn 이 우선(회차별 완료), 그 외는 st(0 예정·1 진행·2 완료·3 보류) */
function planSt(p,occ){
  if(p.recur&&p.recur.f)return isDone(p,occ)?2:1;
  return stEff(p,p.end||p.date);
}
function isDone(p,occ){return (p.recur&&p.recur.f)?!!(p.doneOn&&p.doneOn[occSrc(p,occ)]):!!p.done;}
/* 780차: 일자 패널 검색어(S.dayQ)·범위(S.dayScope)는 입력 UI 가 없어 늘 기본값이었다 — dayQ/dayHit·검색 전용 분기 제거 */
function taskOwnOk(sid,it){
  const who=[sid].concat(Object.keys(it.assignees||{}).filter(k=>(it.assignees||{})[k]));
  const rs=regSel();
  if(rs.length){
    const ids=roster().filter(x=>rs.includes(x.region)).map(x=>x.id);
    /* 팀 공통 업무(sid 가 팀 id)는 권역을 가리지 않는다 */
    const isTeam=(S.org.teams||[]).some(t=>t.id===sid);
    if(!isTeam&&!who.some(o=>ids.includes(o)))return false;
  }
  const own=(S.filter.own||[]).map(String);
  if(!own.length)return true;
  return who.some(o=>own.includes(String(o)));
}
/* 화면 필터 단일 관문 — 달력(buildEvents)·일자 패널(dayPlans)이 함께 거친다 */
function taskFilterOk(sid,it){
  if(!taskOwnOk(sid,it))return false;
  const f=S.filter;
  const K=(f.kind||[]).map(String),ST=(f.st||[]).map(String),SI=(f.site||[]).map(String);
  if(K.length&&!K.includes(kindOf(it.kind)||'_gen'))return false;
  if(ST.length&&!ST.includes(String(stEff(it))))return false;
  if(SI.length&&!SI.includes(String(it.site||'')))return false;
  return true;
}
/* 440차: 목록을 다시 그릴 때마다 전부 깜빡이면 산만하다. 같은 날짜 안에서 '새로 나타난' 카드에만 표시한다.
   날짜를 옮기면 전부 새 카드이므로 그때는 효과 없이 기준만 새로 잡는다. */
let _cardKey='',_cardSeen=new Set();
/* 문자열 서명 — 목록 HTML 을 그대로 들고 있지 않으려고 짧은 해시만 남긴다 */
function strHash(t){let h=5381;for(let i=0;i<t.length;i++)h=(h*33^t.charCodeAt(i))>>>0;return h.toString(36)+':'+t.length;}
/* 443차: 같은 내용이면 다시 그리지 않는다.
   라이브에서는 저장 직후 한 번, Firebase 리스너 에코로 또 한 번 같은 화면을 그린다 —
   그 재생성이 깜빡임의 정체였다. 바뀐 게 없으면 false 를 돌려주니 후속 작업도 건너뛸 수 있다. */
function paintHTML(el,html){
  if(!el)return false;
  const sig=strHash(html);
  if(el.__sig===sig)return false;
  el.__sig=sig;el.innerHTML=html;
  return true;
}
function paintReset(el){if(el)el.__sig=null;}

/* 445차: 오버레이 가로 스크롤바.
   네이티브 바는 자리를 차지해 표 폭·정렬을 밀어낸다(피벗에서 특히). 그래서 바는 숨기고,
   내용 위에 떠 있는 얇은 막대를 직접 그린다 — 위치 표시 + 잡아끌기까지 된다.
   세로는 표시하지 않는다(없어도 쓰는 데 지장이 없다는 판단). */
function ovsAttach(el){
  if(!el||el.__ovs)return;
  const host=el.parentElement;if(!host)return;
  host.classList.add('ovs-host');
  const wrap=document.createElement('div');wrap.className='ovs';
  const bar=document.createElement('div');bar.className='ovs-bar';
  wrap.appendChild(bar);host.appendChild(wrap);
  el.__ovs={wrap,bar};
  const sync=()=>{
    const w=el.clientWidth,sw=el.scrollWidth;
    if(sw<=w+1){wrap.classList.remove('on');bar.style.width='0px';bar.style.left='0px';return;}   /* 742차: 숨겨도(opacity 0) 옛 left+width 가 scrollWidth 에 남아 뷰포트를 넘겼다(1366px 게이트 +13px) */
    wrap.classList.add('on');
    const bw=Math.max(28,Math.round(w*w/sw));
    const max=w-bw,ratio=el.scrollLeft/(sw-w);
    bar.style.width=bw+'px';
    bar.style.left=Math.round(max*ratio)+'px';
  };
  el.addEventListener('scroll',sync,{passive:true});
  if(window.ResizeObserver){const ro=new ResizeObserver(sync);ro.observe(el);el.__ovsRo=ro;}
  /* 막대 잡아끌기 */
  bar.addEventListener('pointerdown',e=>{
    e.preventDefault();
    const w=el.clientWidth,sw=el.scrollWidth,bw=bar.offsetWidth,max=w-bw;
    const x0=e.clientX,l0=parseFloat(bar.style.left)||0;
    wrap.classList.add('drag');bar.setPointerCapture(e.pointerId);
    const move=ev=>{
      const l=Math.min(max,Math.max(0,l0+(ev.clientX-x0)));
      el.scrollLeft=(sw-w)*(max?l/max:0);
    };
    const up=()=>{wrap.classList.remove('drag');
      bar.removeEventListener('pointermove',move);bar.removeEventListener('pointerup',up);};
    bar.addEventListener('pointermove',move);bar.addEventListener('pointerup',up);
  });
  sync();
}
/* 화면을 다시 그린 뒤 스크롤 영역에 다시 붙인다 */
function ovsRefresh(){document.querySelectorAll('.pv-scroll,.rec-wrap,#view-defect .card,.rkm-wrap').forEach(ovsAttach);}   /* 757차: 세대 현황도(.rkm-wrap)도 카드 밑 막대 */
function markNewCards(box){
  const key=String(S.selDate||'')+'|'+String(S.selEnd||'');
  const ids=[...box.querySelectorAll('.plan[data-pid]')].map(e=>e.dataset.pid);
  if(key!==_cardKey){_cardKey=key;_cardSeen=new Set(ids);return;}
  box.querySelectorAll('.plan[data-pid]').forEach(e=>{
    if(!_cardSeen.has(e.dataset.pid))e.classList.add('fx-in');
  });
  _cardSeen=new Set(ids);
}
function rDayHead(){   /* 426차: 날짜 머리 삭제 — 이제 기간 업무 계산만 한다(이름은 호출부 유지용) */
  return rangePlans();
}
/* 선택 기간(하루면 그날)에 걸친 업무 — 날짜순 */
/* 목록 정렬 — 완료는 아래로, 그다음 공통·내 업무 순(달력 막대와 같은 등급),
   그 안에서 시간 있는 업무가 먼저(시간순), 나머지는 날짜순 */
function sortPlans(list){
  return list.slice().sort((x,y)=>{
    const dx=isDone(x.p,x.occ)?1:0, dy=isDone(y.p,y.occ)?1:0;
    if(dx!==dy)return dx-dy;
    const ox=evOrd(x.p), oy=evOrd(y.p);
    if(ox!==oy)return ox-oy;
    const kx=evOwnKey(x.p), ky=evOwnKey(y.p);        /* 같은 등급 안에서는 담당자끼리 묶는다 */
    if(kx!==ky)return kx.localeCompare(ky,'ko');
    const tx=x.p.time||'', ty=y.p.time||'';
    if(!!tx!==!!ty)return tx?-1:1;
    if(tx&&ty&&tx!==ty)return tx<ty?-1:1;
    const ax=x.p.date||'', ay=y.p.date||'';
    if(ax!==ay)return ax<ay?-1:1;
    /* ⚠ 609차: 마지막 기준이 **제목**이었다 — 수정 폼에서 제목을 한 글자 칠 때마다 카드가 목록에서
       위아래로 튀었다(입력 때마다 planAutosave 가 다시 그린다). 만든 순서로 바꿔 고정한다.
       createdAt 이 없는 옛 업무는 id 로 가른다 — `uid()` 가 Date.now() 로 시작해 대체로 만든 순이다. */
    const cx=Number(x.p.createdAt)||0, cy=Number(y.p.createdAt)||0;
    if(cx!==cy)return cx-cy;
    return String(x.p.id||'').localeCompare(String(y.p.id||''));
  });
}
function rangePlans(){
  const a=S.selDate,b=S.selEnd||S.selDate;
  if(!S.selEnd)return sortPlans(dayPlans(a));
  const seen={},out=[];
  for(let d=a;d<=b;d=addDays(d,1)){
    dayPlans(d).forEach(x=>{const k=x.p.id+'@'+x.occ;if(seen[k])return;seen[k]=1;out.push(x);});
  }
  return sortPlans(out);
}
/* 펼쳐 보기 — 내용(진행경과·처리계획)을 읽기 전용으로 보여 준다.
   링크는 여기 넣지 않는다 — 머리줄 옆 아이콘이 이미 있어 겹말이다(브라우저·위젯 동일, 319차) */
function planDetHTML(p){
  const sec=(h,v)=>v?'<div class="pd-sec"><div class="pd-h">'+h+'</div><div class="pd-b">'+esc(v)+'</div></div>':'';
  const body=sec('내용',p.body);
  /* 보여 줄 게 없으면 펼침 자체를 만들지 않는다 — 눌러도 아무 일이 없던 헛손질 방지 */
  return body?'<div class="plan-det">'+body+'</div>':'';
}
/* 링크에 보일 이름 — 직접 적은 이름이 있으면 그것을, 없으면 주소에서 뽑는다.
   원드라이브·쉐어포인트 공유 주소는 무의미하게 길어 '원드라이브'로 줄여 쓴다 */
function linkLabel(l){
  if(!l)return '';
  if(l.label)return l.label;
  const u=String(l.url||'');
  if(/(^|\/\/)[^/]*(1drv\.ms|onedrive\.live\.com|\-my\.sharepoint\.com|sharepoint\.com)/i.test(u))return '원드라이브';
  return u.replace(/^https?:\/\//,'');
}
/* 글자 칸이 아니면 커서 위치를 읽을 수 없다(날짜·색 칸은 읽기만 해도 오류) */
function selOf(el,k){try{return el[k];}catch(e){return null;}}
function rDay(){
  const ps=rDayHead();
  rCalMini();   /* 645차: 점·선택 표시를 목록과 같이 맞춘다 */
  const box=$('#dpList');
  /* 작성 중에도 버튼은 남기고, 누르면 새 업무 폼으로 바꾼다 */
  const add=$('.dp-add');if(add)add.classList.toggle('on',!!S.planEdit);
  /* 이미 떠 있는 폼은 다시 그리지 않고 그대로 떼었다 도로 꽂는다 —
     자동 저장이 목록을 다시 그려도 입력 중인 값·포커스·커서가 살아남는다 */
  const keep=(S.planEdit&&S.planEdit.mounted&&$('#dpEdit'))?$('#dpEdit'):null;
  /* ⚠ 같은 노드를 도로 꽂아도 **DOM 에서 떼는 순간 포커스는 풀린다** — 값·커서는 남지만
     글자를 치던 칸에서 초점이 빠진다(자동 저장이 600ms 뒤 이 함수를 부르므로,
     타이핑을 잠깐 멈출 때마다 끊기는 것처럼 보였다). 어디에 커서가 있었는지 적어 두었다가 되살린다 */
  const ae=document.activeElement;
  const kf=(keep&&ae&&keep.contains(ae))?{el:ae,s:selOf(ae,'selectionStart'),e:selOf(ae,'selectionEnd')}:null;
  if(keep)keep.remove();
  /* 처음 여는 순간엔 draft 가 아직 없다(planFormHTML 이 만든다) — orig 로도 찾아야 자리를 지킨다 */
  const editingId=S.planEdit?(((S.planEdit.draft||{}).id)||((S.planEdit.orig||{}).id)||null):null;
  const cnt=$('#dpCount');if(cnt)cnt.textContent='업무 '+ps.length+'건';
  /* 771차: 머리에 날짜 — 「9월 9일 (수) · 업무 3건」, 공휴일·휴무일이면 이름도 */
  const dEl=$('#dpDate');if(dEl){const d=toDate(S.selDate),ho=holOf(S.selDate);dEl.textContent=(d.getMonth()+1)+'월 '+d.getDate()+'일 ('+DOW[d.getDay()]+')'+(ho&&ho.n?' · '+ho.n:'')+' · ';}
  if(!ps.length&&!S.planEdit){
    box.innerHTML='<div class="dp-empty">이 날짜에 등록된 업무가 없습니다.</div>';
    paintReset(box);   /* 빈 목록으로 갈아끼웠으니 서명도 비운다 — 안 그러면 다시 채워질 때 스킵된다 */
    rHold();wireHoldDnD();return;}
  /* 폼은 원래 카드가 있던 자리에 그대로 들어간다 — 수정을 눌러도 목록이 위로 튀지 않는다 */
  let slot=false;
  const parts=ps.map(({p,occ})=>{
    if(editingId&&p.id===editingId){slot=true;return '<div id="peSlot"></div>';}
    const done=isDone(p,occ),rep=p.recur&&p.recur.f,span=p.end&&p.end!==p.date,st=planSt(p,occ);
    const md=x=>{const t=toDate(x);return (t.getMonth()+1)+'/'+t.getDate();};
    const lnk=Object.values(p.links||{}).filter(l=>l&&l.url)[0];
    const det=planDetHTML(p);
    /* 펼침은 적어 둔 내용을 여는 용도다 — 내용이 없으면 펼치지 않는다(390차) */
    const openAct=det?' data-act="plan.open" data-pid="'+esc(p.id)+'" data-occ="'+esc(occ)+'"':'';
    return `
    <div class="plan${done?' done':''}${det?' has-det':''}${det&&S.planOpen===p.id?' open':''}" data-pid="${esc(p.id)}">
      <div class="plan-hd">
        ${colDotHTML(planColor(p),p.id,!planOwners(p).length)}
        <div class="plan-t"${openAct}>${riskMark(p.kind)}${esc(p.title)}</div>
        <div class="plan-side${lnk?' has-lnk':''}">
          ${lnk?'<a class="p-ico" href="'+esc(lnk.url)+'" target="_blank" rel="noopener" aria-label="링크 열기" data-tip="'+esc(linkLabel(lnk))+'"><svg class="icn"><use href="#i-ext"></use></svg></a>':''}
          <button class="p-ico p-edit" data-act="plan.edit" data-pid="${esc(p.id)}" data-occ="${esc(occ)}" aria-label="수정" data-tip="수정"><svg class="icn"><use href="#i-pen"></use></svg></button>
          ${stIcon(st,' data-act="plan.stCycle" data-pid="'+esc(p.id)+'" data-occ="'+esc(occ)+'"')}
        </div>
      </div>
      <div class="plan-main"${openAct}>
        <div class="plan-meta">
          <span class="pm-l">${[
            kindLabel(p.kind),
            span?md(p.date)+'–'+md(p.end):md(p.date),
            fmtSpan(p),
            rep?REC_LBL[p.recur.f]:''
          ].filter(Boolean).map(esc).join(' · ')}</span>
          <span class="pm-r">${[p.site?siteName(p.site):'',planOwners(p).map(o=>ownName(o)).join(', ')||'공통']
            .filter(Boolean).map(esc).join(' · ')}</span>
        </div>
        ${det}
      </div>
    </div>`;}).join('');
  /* 편집 중인 업무가 목록에 없으면(새 업무·날짜를 옮긴 경우) 맨 위에 둔다 */
  const html=(S.planEdit&&!slot?'<div id="peSlot"></div>':'')+parts;
  /* 441차: 라이브에서는 저장 직후 한 번, 리스너 에코로 또 한 번 그린다.
     내용이 같으면 DOM 을 통째로 갈지 않는다 — 그 재생성이 화면 깜빡임의 정체였다.
     폼이 떠 있을 때는 아래에서 노드를 도로 꽂아야 하므로 건너뛰지 않는다. */
  if(S.planEdit)paintReset(box);   /* 폼이 뜰 땐 노드를 도로 꽂아야 하므로 항상 다시 그린다 */
  else if(!paintHTML(box,html)){ rHold();wireHoldDnD();return; }
  if(S.planEdit)box.innerHTML=html;
  markNewCards(box);   /* 440차: 이번에 새로 생긴 카드만 등장 효과 */
  const sl=$('#peSlot');
  if(sl){
    if(keep)sl.replaceWith(keep);
    else sl.outerHTML=planFormHTML();
  }
  if(kf&&kf.el.isConnected){
    kf.el.focus({preventScroll:true});
    if(kf.s!=null){try{kf.el.setSelectionRange(kf.s,kf.e);}catch(e){}}
  }
  const rec=$('#peRec');
  if(rec&&!rec.dataset.wired){rec.dataset.wired='1';
    rec.addEventListener('change',()=>{const r=$('#peUntilRow');if(r)r.style.display=rec.value?'':'none';});}
  rHold();wireHoldDnD();   /* 일자 패널 아래 보류함 — 목록이 바뀔 때마다 함께 다시 그린다 */
}

/* ───── 업무 작성·수정 모달 ───── */
let MODAL_CB=null;
function openModal(title,bodyHTML,footHTML){
  pfClosed();                        /* 지난번 프로필 팝오버 때문에 모달이 왼쪽으로 쏠린 채 열리지 않게 */
  $('#mt').textContent=title;$('#mbody').innerHTML=bodyHTML;$('#mf').innerHTML=footHTML||'';
  /* 하단 버튼이 없는 모달(사용 안내 등)은 우상단 X 로 닫는다 — 참조 앱과 동일 */
  const mb=$('#mb');
  mb.classList.remove('rdw','narrow','mlw','dfwide','wide-pick','kmw','rkm','pdcw');   /* pdcw: 798차 사진 자르기 */   /* ⚠ 지난번 모달의 폭 설정이 남으면 다음 모달이 엉뚱한 크기로 뜬다 */
  /* ⚠ 605차: 'kmw' 가 이 목록에서 빠져 있었다 — 조직 관리 지도 모달을 한 번 열면 그 뒤 **모든** 모달에 남는다.
     `#mb.kmw{width:auto;max-width:94vw}` 는 `#mb.dfwide{width:88vw;max-width:88vw}` 와 명시도가 같은데
     CSS 에서 더 뒤에 있어 이긴다 → 목록 모달 폭이 내용에 따라 정해지고, 목록↔피벗 전환 때 폭이 튄다
     (실측: 단일현장 피벗 1353.6px → 452.5px). 폭 클래스를 새로 만들면 반드시 이 줄에 함께 넣을 것. */
  mb.classList.toggle('has-x',!footHTML);
  $('#mo').classList.add('open');
}
function closeModal(){mrvHoldRest();$('#mo').classList.remove('open');MODAL_CB=null;pfDrop();
  if(window.__SNAPPICK__){const r=window.__SNAPPICK__;window.__SNAPPICK__=null;try{r(null);}catch(_){}}   /* 614차: 스냅샷 월 선택 대기 중 닫히면(Esc·배경) 취소로 종결 — 원본 app-core 641 과 동일 */
  if(window.__PUBOK__){const r=window.__PUBOK__;window.__PUBOK__=null;try{r(false);}catch(_){}}   /* 615차: 게시 확인 대기 중 닫히면 게시 중단 */
  if($('#mb').classList.contains('kmw'))kmModalClosed();}   /* 552차: 지도 모달 — 카드 상태 복원 */
/* 인라인 편집기 — 모달 대신 우측 일자 패널 안에서 작성·수정한다 */
function openPlanEdit(p,startD,endD,occ){
  S.planEdit={orig:p?{...p}:null,occ:occ||'',start:startD||S.selDate,end:endD||''};
  rDay();
  setTimeout(()=>{const t=$('#peTitle');if(t)t.focus();},30);
}
/* 고른 색 적용 — 읽기 카드에서 골랐으면 바로 저장, 편집 폼이면 draft 에 담고 자동 저장 */

function setPlanColor(c){
  /* 업무 목록 폼도 같은 팔레트를 쓴다 — 숨은 값과 색 원만 갱신하고 저장은 폼 저장 때 한다.
     대상은 팝오버가 기록한 scope 가 정한다(위 plan.color 의 함정 참조) */
  const pop=$('#colPop');
  const scope=(pop&&pop.dataset.scope)||($('#tkNew')?'tk':'plan');
  const tn=$('#tnColor');
  if(scope==='tk'&&tn&&$('#tkNew')){
    tn.value=(c==='auto')?'':c;
    const dot=$('#tkNew .p-col');
    if(dot)dot.style.background=colBg(planColor({color:tn.value,assignees:{}}));
    return;
  }
  const pe=S.planEdit;if(!pe||!pe.draft)return;
  pe.draft.color=c;
  const btn=$('#dpEdit .p-col');
  if(btn)btn.style.background=colBg(planColor(pe.draft));
  planAutosave();
}
function colOutside(e){
  const pop=$('#colPop');
  if(!pop){document.removeEventListener('click',colOutside,true);return;}
  if(pop.contains(e.target)||e.target.closest('.p-col'))return;
  closeColPop();
}
function pfClosed(){const mo=$('#mo');if(mo)mo.classList.remove('pf-on');}
/* 겹쳐 뜬 것들을 바깥 클릭으로 닫는다(상용 위젯의 기본 동작).
   ⚠ click 이 아니라 mousedown 캡처를 쓴다 — FullCalendar 가 달력 칸의 click 을 삼켜
   달력을 눌렀을 때만 안 닫히던 문제가 있었다 */
document.addEventListener('mousedown',e=>{
  const t=e.target;
  const wg=$('#wgSet');
  if(wg&&wg.classList.contains('on')&&!t.closest('#wgSet')&&!t.closest('[data-act="wid.set"]')){
    wg.classList.remove('on');wg.setAttribute('aria-hidden','true');
  }  const sd=$('#widSide');
  if(sd&&sd.classList.contains('on')&&!t.closest('#widSide')&&!t.closest('[data-act="wid.side"]')){
    sd.classList.remove('on');S.widSide='';
  }
  /* 찾기 패널 — 앱(사이드바 버튼)·위젯(헤더 버튼) 둘 다 같은 규칙으로 닫는다 */
  const nq=$('#nqPanel');
  if(nq&&nq.classList.contains('on')&&!t.closest('#nqPanel')&&!t.closest('[data-act="nq.toggle"]'))nqOpen(false);
},true);
/* 색상 팔레트 사각형 — 가로는 채도, 세로는 밝기. 끌면서 고를 수 있고 고른 색은 추가색으로 쌓인다 */
let CP_DRAG=false;
function cpPick(e,commit){
  const pop=$('#colPop');if(!pop)return;
  const sv=pop.querySelector('.cp-sv');if(!sv)return;
  const r=sv.getBoundingClientRect();
  const x=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));
  const y=Math.min(1,Math.max(0,(e.clientY-r.top)/r.height));
  const h=Number(pop.querySelector('.cp-hue').value)||0;
  const hex=hsvHex(h,x,1-y);
  cpPaint(pop,hex);
  setPlanColor(hex);
  /* ⚠ 끄는 동안 목록에 쌓으면 비슷한 색이 수십 개 생긴다 — 손을 뗄 때 한 번만 담는다 */
  if(commit)palAdd(hex);
  CP_LAST=hex;
}
let CP_LAST='';
document.addEventListener('mousedown',e=>{
  if(!e.target.closest||!e.target.closest('#colPop .cp-sv'))return;
  CP_DRAG=true;cpPick(e);e.preventDefault();
});
document.addEventListener('mousemove',e=>{if(CP_DRAG)cpPick(e);});
document.addEventListener('mouseup',()=>{
  if(!CP_DRAG)return;
  CP_DRAG=false;
  if(CP_LAST){palAdd(CP_LAST);const pop=$('#colPop');if(pop)cpRefresh(pop,CP_LAST);}
});
/* 색 줄만 다시 그린다 — 팔레트 사각형은 그대로 두어야 끌던 자리가 유지된다 */
function cpRefresh(pop,cur){
  const row=pop.querySelector('.pal');if(!row)return;
  const tmp=document.createElement('div');tmp.innerHTML=colPopHTML(cur);
  row.replaceWith(tmp.querySelector('.pal'));
}
function closeColPop(){
  const pop=$('#colPop');if(pop)pop.remove();
  document.removeEventListener('click',colOutside,true);
}
function closePlanEdit(){
  if(!S.planEdit)return;
  clearTimeout(PE_SAVE);
  const p=planCollect(S.planEdit.draft);   /* 자동 저장 대기 중인 입력을 확정한다 */
  if(p&&p.title)planCommit(p);
  closeColPop();S.planEdit=null;rDay();
}
/* 본문 칸 — 업무 구분이 '일반'이면 진행경과·처리계획 두 칸(업무 목록 폼과 동일), 그 외는 한 칸 */
function peBodyHTML(d,kind){
  return `<div class="frow"><label>내용</label><textarea class="inp inp-sm" id="peProg" maxlength="2000" placeholder="${esc(kindLabel(kind))} 내용을 적으세요">${esc(d.body||'')}</textarea></div>`;
}
/* 업무 구분을 바꾸면 본문 칸 구성이 달라진다 — 그 부분만 다시 그려 다른 입력을 지키지 않게 한다 */
function peKindRefresh(){
  const pe=S.planEdit,sec=$('#peBodySec');if(!pe||!sec)return;
  planCollect(pe.draft);                       /* 지금 입력값을 draft 에 담아 두고 */
  const kind=kindOf(($('#peKind')&&$('#peKind').value)||'');
  sec.innerHTML=peBodyHTML(pe.draft,kind);     /* 본문 칸만 새 구성으로 */
  planAutosave();
}
function planFormHTML(){
  const pe=S.planEdit;if(!pe)return'';
  /* 새 업무의 담당자는 로그인한 본인이 기본 — 대부분 자기 일을 쓴다(앱·위젯 공통) */
  const d=pe.orig||{id:uid(),date:pe.start,end:pe.end,title:'',time:'',body:'',plan:'',links:{},color:'auto',
    done:false,kind:KIND_DEF,recur:{f:'',until:''},owners:meOwner(),createdAt:Date.now()};
  pe.draft=d;pe.mounted=true;
  const rc=(d.recur&&d.recur.f)||'';
  const people=roster();
  const kind=kindOf(d.kind);
  /* (상태는 폼에서 바꾸지 않는다 — 카드의 상태 아이콘·아침 확인이 담당) */
  const lnk=Object.values(d.links||{}).filter(l=>l&&l.url)[0];
  return `<div class="dp-edit" id="dpEdit">
    <div class="pe-bar">
      ${colDotHTML(planColor(d),null,!planOwners(d).length)}
      <input class="pe-ttl" id="peTitle" maxlength="80" placeholder="무엇을 하나요?" value="${esc(d.title)}">
      <div class="pe-side">
        ${pe.orig
          ?'<button class="pe-ic pe-del" data-act="plan.del" data-pid="'+esc(d.id)+'" data-ym="'+esc(ymOf(d.date))+'" data-occ="'+esc(pe.occ||'')+'" aria-label="삭제" data-tip="삭제"><svg class="icn"><use href="#i-trash"></use></svg></button>'
          :'<button class="pe-ic pe-del" data-act="plan.discard" aria-label="취소" data-tip="저장하지 않고 닫기"><svg class="icn"><use href="#i-close"></use></svg></button>'}
        <button class="pe-ic pe-ok" data-act="plan.cancel" aria-label="저장하고 닫기 (Esc)" data-tip="저장하고 닫기"><svg class="icn"><use href="#i-check"></use></svg></button>
      </div>
    </div>
    <div class="pe-body">
      <div class="frow2">
        <div class="frow"><label>시작일</label><input type="date" class="inp inp-sm" id="peDate" value="${esc(d.date)}"></div>
        <div class="frow"><label>종료일</label><input type="date" class="inp inp-sm" id="peEnd" value="${esc(d.end||'')}"></div>
      </div>
      <div class="frow2">
        <div class="frow"><label>구분</label>
          <select class="inp inp-sm" id="peKind">${TK_KIND.map(k=>'<option value="'+k[0]+'"'+(k[0]===kind?' selected':'')+'>'+k[1]+'</option>').join('')}</select></div>
        <div class="frow"><label>담당자</label>${ownSelHTML('peOwners',planOwners(d)[0]||'',people)}</div>
      </div>
      <div class="frow"><label>현장</label>${sitePickHTML('peSite',d.site||'')}</div>
      <div class="pe-morerow">
        <button class="pe-more" data-act="plan.more" id="peMoreBtn" aria-label="자세히"><svg class="icn"><use href="#i-chevr"></use></svg></button>
      </div>
      <div class="pe-adv" id="peAdv">
        <div class="frow2">
          <div class="frow"><label>시간</label><input type="time" class="inp inp-sm" id="peTime" value="${esc(d.time||'')}"></div>
          <div class="frow"><label>반복</label><select class="inp inp-sm" id="peRec">${Object.keys(REC_LBL).map(k=>'<option value="'+k+'"'+(k===rc?' selected':'')+'>'+REC_LBL[k]+'</option>').join('')}</select></div>
        </div>
        ${(pe.orig&&rc&&pe.occ)?`<div class="frow2" id="peUntilRow">
          <div class="frow"><label>반복 종료</label><input type="date" class="inp inp-sm" id="peUntil" value="${esc((d.recur&&d.recur.until)||'')}"></div>
          <div class="frow"><label>회차 이동</label><input type="date" class="inp inp-sm" id="peOcc" data-pid="${esc(d.id)}" data-occ="${esc(pe.occ)}" value="${esc(pe.occ)}" data-tip="날짜를 고르면 이 회차만 옮깁니다 — 원래 날짜를 고르면 되돌립니다"></div>
        </div>`:`<div class="frow" id="peUntilRow" style="${rc?'':'display:none'}"><label>반복 종료</label><input type="date" class="inp inp-sm" id="peUntil" value="${esc((d.recur&&d.recur.until)||'')}"></div>`}
        <div class="frow"><label>링크</label><input class="inp inp-sm" id="peLink" maxlength="${LINK_MAX}" placeholder="https://…" value="${esc((lnk&&lnk.url)||'')}"></div>
        <div id="peBodySec">${peBodyHTML(d,kind)}</div>

      </div>
    </div>
  </div>`;
}
/* 폼의 현재 입력을 draft 위에 얹어 저장할 업무 객체를 만든다(검증 없음) */
function planCollect(base){
  const pe=S.planEdit;if(!pe)return null;
  const d=base||pe.draft;
  const date=($('#peDate')&&$('#peDate').value)||pe.start||S.selDate;
  let end=(($('#peEnd')&&$('#peEnd').value)||'').trim();
  if(end&&end<=date)end='';
  const f=($('#peRec')&&$('#peRec').value)||'';
  /* 링크는 한 칸만 편집한다 — 업무 목록에서 넣은 나머지 링크는 그대로 둔다 */
  const links={...(d.links||{})};
  const lk=Object.keys(links).find(k=>links[k]&&links[k].url)||'l1';
  const url=(($('#peLink')&&$('#peLink').value)||'').trim();
  if(url)links[lk]={url,label:(links[lk]&&links[lk].label)||''};
  else delete links[lk];
  const p={...d,
    date,end,
    title:(($('#peTitle')&&$('#peTitle').value)||'').trim(),
    time:($('#peTime')&&$('#peTime').value)||'',
    site:($('#peSite')&&$('#peSite').value)||'',
    owners:(()=>{const v=($('#peOwners')&&$('#peOwners').value)||'';return v?{[v]:1}:{};})(),owner:'',
    body:(($('#peProg')&&$('#peProg').value)||'').trim(),plan:'',
    links,
    color:(d&&d.color)||'auto',
    recur:f?{f,until:(($('#peUntil')&&$('#peUntil').value)||'')}:{f:'',until:''},
    kind:kindOf(($('#peKind')&&$('#peKind').value)||''),
    /* ⚠ stEff(표시용 자동 완료)가 아니라 저장된 상태만 넘긴다 — stEff 를 쓰면 지난 업무의 폼을
       열었다 닫기만 해도 st:2 가 기록되고, 시작일을 미래로 미루면 '완료'로 저장되던 버그 */
    st:stOf(d.st),
    done:stOf(d.st)===2,
    updatedAt:Date.now()};
  if(base)Object.assign(base,p);   /* draft 를 현재 화면 값으로 최신화 */
  return p;
}
/* 저장 — 반복 여부가 바뀌면 옛 항목을 지우고 새로 넣어야 한다 */
function planCommit(p){
  const pe=S.planEdit;
  const wasRec=!!(pe&&pe.orig&&pe.orig.recur&&pe.orig.recur.f);
  const nowRec=!!(p.recur&&p.recur.f);
  if(pe&&pe.orig&&wasRec!==nowRec){
    store.delPlan(ymOf(pe.orig.date),pe.orig.id);
    store.putPlan(p);
  }else{
    const oldYm=(pe&&pe.orig)?ymOf(pe.orig.date):null;
    if(!nowRec&&oldYm&&oldYm!==ymOf(p.date))store.movePlan(p,oldYm);
    else store.putPlan(p);
  }
}
/* 자동 저장 — 입력이 멎으면 조용히 반영한다(토스트 없음).
   일자 패널은 다시 그리지 않는다(rDay 가 열린 폼은 떼었다 도로 꽂으므로 입력·포커스는 살아남는다) */
let PE_SAVE=null;
function planAutosave(now){
  clearTimeout(PE_SAVE);
  /* 저장(600ms)을 기다리지 않고 달력은 곧바로 갱신한다 — buildEvents 가 draft 를 읽는다 */
  if(S.planEdit&&S.planEdit.draft&&$('#dpEdit')){planCollect(S.planEdit.draft);refetchCal();}
  const run=()=>{
    const pe=S.planEdit;if(!pe||!$('#dpEdit'))return;
    const p=planCollect(pe.draft);
    if(!p||!p.title)return;                 /* 제목이 없으면 아직 만들지 않는다 */
    planCommit(p);
    if(!pe.orig){
      pe.orig={...p};                       /* 처음 저장한 뒤부터는 '수정' */
      /* ⚠ 폼은 다시 그리지 않으므로(입력이 날아간다) 삭제 버튼이 안 생긴다 — 그 자리에 끼워 넣는다 */
      const side=$('#dpEdit .pe-side');
      const old=side&&side.querySelector('[data-act="plan.discard"]');
      if(old)old.remove();                 /* 취소 버튼을 삭제 버튼으로 바꾼다 */
      if(side&&!side.querySelector('[data-act="plan.del"]')){
        const del=document.createElement('button');
        del.className='pe-ic pe-del';del.setAttribute('aria-label','삭제');del.setAttribute('data-tip','삭제');
        del.dataset.act='plan.del';del.dataset.pid=p.id;del.dataset.ym=ymOf(p.date);del.dataset.occ=pe.occ||'';
        del.innerHTML='<svg class="icn"><use href="#i-trash"></use></svg>';
        side.insertBefore(del,side.querySelector('.pe-rem')||side.lastElementChild);
      }
    }
    if(!S.live){refetchCal();rDay();rWidget();}
  };
  if(now)run();else PE_SAVE=setTimeout(run,600);
}
function savePlanInline(){
  const pe=S.planEdit;if(!pe)return;
  clearTimeout(PE_SAVE);
  const p=planCollect(pe.draft);
  if(!p)return;
  if(!p.title){closePlanEdit();return;}     /* 제목 없이 닫으면 저장하지 않는다 */
  planCommit(p);
  S.planEdit=null;
  /* 664차: 위젯에서 제목 입력 중 Enter 를 치면 팝업이 닫히던 버그.
     selDate()는 위젯에서 '같은 칸을 다시 누른 것'으로 보고 팝업을 토글한다 → 저장 전 상태를 지켜 준다. */
  const keepPop=WIDGET&&S.widPop;
  selDate(p.date);
  if(keepPop&&!S.widPop){S.widPop=true;rWidget();}
  if(!S.live){refetchCal();rDay();}
}

/* ═══════════ 주요업무 현황 — 좌: 대상 선택 · 우: 작성/목록 ═══════════ */
/* 명부 = 로그인 계정(users) + 이 앱의 팀·권역 배정(calapp/people) */
/* ⚠ roster() 는 한 번 그릴 때 수백 번 불린다(행마다 권역·이름을 찾는다). 계정·인사 정보가 바뀌지 않는
   **같은 프레임 안에서는** 결과가 같으므로 그동안만 캐시한다 — 마이크로태스크가 끝나면 스스로 비운다(346차) */
let _rosterC=null;
function rosterBust(){_rosterC=null;}
function roster(){
  if(_rosterC)return _rosterC;
  const v=rosterBuild();
  _rosterC=v;Promise.resolve().then(rosterBust);
  return v;
}
function rosterBuild(){
  /* 로컬 모드는 계정이 없다 — 화면이 비지 않도록 '나' 한 명을 가정한다(이 브라우저 전용) */
  if(!S.live&&!Object.keys(S.people||{}).length)
    return[{id:'me',name:'나',email:'',team:'',region:'',sites:{},rank:'member',role:'editor',acct:false,local:true}];
  const out={};
  Object.keys(S.accounts||{}).forEach(uid=>{
    const a=S.accounts[uid]||{};
    /* 501차: 차단 계정도 담는다 — 감추는 대신 '차단' 탭에서만 보여 준다 */
    out[uid]={id:uid,name:a.name||String(a.email||'').split('@')[0]||'이름없음',email:a.email||'',team:'',region:'',rank:'member',role:a.role||'viewer',acct:true};
  });
  Object.keys(S.people||{}).forEach(id=>{
    const p=S.people[id]||{},prev=out[id];
    out[id]={id,
      name:(prev&&prev.acct&&prev.name)||p.name||'이름없음',
      email:(prev&&prev.email)||p.email||'',
      team:p.team||'',region:p.region||'',sites:p.sites||{},rank:rankOf(p.rank),
      role:(prev&&prev.role)||'viewer',
      acct:!!(prev&&prev.acct)};
  });
  return Object.values(out).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ko'));
}
function stOf(v){const n=Number(v);return n===2?2:n===3?3:1;}   /* 진행(1) · 완료(2) · 보류(3) — 그 외 값은 진행으로 */
/* 아이콘 상태를 바꾸고 눌린 효과를 한 번 준다(다시 그리지 않는 자리에서 쓴다) */
function stxSet(el,st){
  const b=el.closest?el.closest('.stx'):null;if(!b)return;
  b.dataset.on=stOf(st)===2?1:0;
  b.classList.toggle('on',stOf(st)===2);
  b.classList.remove('hold');   /* 보류는 아침 확인에서만 붙는다 — 눌러서 바꾸면 진행·완료 둘 중 하나 */
  b.classList.remove('fx');void b.offsetWidth;b.classList.add('fx');
}
/* 상태 아이콘. attrs 에 data-act 등을 넣어 누를 수 있게 한다(없으면 표시 전용) */
function stIcon(st,attrs){
  const on=stOf(st)===2,hold=stOf(st)===3;
  const lbl=on?'완료':hold?'보류':'진행 중';
  return '<button class="stx'+(on?' on':'')+(hold?' hold':'')+'"'+(attrs||' disabled')+' data-on="'+(on?1:0)+'"'
    +' aria-label="'+lbl+'" data-tip="'+lbl+'">'
    +'<span class="stx-in">'
      +'<svg class="stx-run" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path class="tri" d="M10.4 8.8v6.4l5.2-3.2z"/></svg>'
      +'<svg class="stx-done" viewBox="0 0 24 24"><circle class="cf" mask="url(#stx-ck)" cx="12" cy="12" r="9"/><path class="ck" d="m8.3 12.2 2.5 2.5 4.9-5.2"/></svg>'
      +'<svg class="stx-hold" viewBox="0 0 24 24"><circle class="cf" mask="url(#stx-mn)" cx="12" cy="12" r="9"/></svg>'
    +'</span></button>';
}
/* 유효 상태 — 저장된 완료(2)·보류(3)는 그대로, 자동 완료('날짜가 지나면 완료로 본다')는
   **팀 공통 단발 업무에만** 적용한다. 반복 업무는 회차별 doneOn 이 완료를 담당하고(원 시작일이
   지났다고 전체가 완료되면 다음 회차가 목록·집계·미니 달력에서 통째로 사라지던 버그),
   담당자 업무는 아침 확인(morningReview)에서 완료·보류를 직접 고른다.
   팀 공통도 지난 뒤 손으로 '진행'을 고르면(stKeep) 자동 완료를 덮지 않는다. */
function stEff(it,date){
  const s=stOf(it&&it.st);
  if(s===2)return 2;
  if(s===3)return 3;
  if(it&&it.recur&&it.recur.f)return 1;
  if(it&&it.assignees&&Object.keys(it.assignees).some(k=>it.assignees[k]))return 1;
  if(it&&it.stKeep)return 1;
  const d=(date||(it&&(it.end||it.date))||'');
  return (d&&d<todayStr())?2:1;
}
function tkSel(){
  const teams=(S.org.teams||[]).filter(t=>t.name),regions=(S.org.regions||[]).filter(r=>r.name),all=roster();
  const team=teams.find(x=>x.id===S.tk.t)||teams[0]||null;S.tk.t=team?team.id:null;
  /* 로컬 모드의 가상 담당자는 선택한 팀에 속한 것으로 본다 */
  const mems=team?all.filter(p=>p.team===team.id||p.local):[];
  /* 선택값: teamall(팀 전체) · team(공통 업무) · reg:<권역id>(권역) · 담당자 id */
  const m=S.tk.m;
  const regOk=rid=>rid===''?mems.some(p=>!p.region||!regions.some(r=>r.id===p.region)):regions.some(r=>r.id===rid);
  const valid=m==='teamall'||m==='team'||m==='hold'
    ||(typeof m==='string'&&m.indexOf('reg:')===0&&regOk(m.slice(4)))
    ||mems.some(p=>p.id===m);
  if(!valid)S.tk.m='teamall';
  return{teams,team,regions,mems,total:all.length};
}
/* 좌측 카운트는 '아직 끝나지 않은 업무' 수 — 완료는 세지 않는다 */
/* 날짜 배지 — 지났는데 미완료면 D+, 오늘이면 D-DAY */
function dueInfo(due){
  if(!due)return{cls:'none',txt:'날짜'};
  const n=daysBetween(todayStr(),due);
  if(n<0)return{cls:'over',txt:'D+'+(-n)};
  if(n===0)return{cls:'over',txt:'D-DAY'};
  if(n<=3)return{cls:'soon',txt:'D-'+n};
  return{cls:'',txt:'D-'+n};
}
function siteName(id){const s=(S.org.sites||[]).find(x=>x.id===id);return s?s.name:'';}
/* 작은 달력에서 고른 날에 걸치는 업무인지 — 목록에서 강조하는 데 쓴다.
   ⚠ 주간 화면의 행은 원본 시작일이 아니라 **표시일**(반복 회차·완료일)로 서 있다 —
   그 날짜(dsp)도 함께 봐야 완료 칸·반복 회차가 빠지지 않는다(320차, 사용자 지적) */
function onSelDay(sid,iid,it,dsp){
  const d=S.mineSel;if(!d||!it)return false;
  if(dsp&&dsp===d)return true;
  if(!it.date)return false;
  if(it.recur&&it.recur.f)return recurDates(taskAsPlan(sid,iid,it),d,d).length>0;
  return d>=it.date&&d<=(it.end||it.date);
}
let _edShown=false;   /* 이번 렌더에서 수정 폼을 이미 그렸는지 */
/* 615차: 행의 인라인 수정 버튼 제거(수정은 펼침의 체크 아래 .tk-det-ed) · 완료(st=2)면 날짜 지남(over)
   강조를 끈다 — 끝난 일이 붉게 남아 있었다. ⚠ 템플릿 리터럴 안에는 주석을 달 수 없다(그대로 렌더됨) */
function taskItemHTML(sid,iid,it,withSubject,hideOwn,colsIn,occ){
  const cols=colsIn||{site:true,who:true};
  const key=sid+'/'+iid;
  /* ⚠ 수정 폼은 행 자리에 넣지 않는다(360차). 반복 업무는 회차마다 행이 있는데 키가 같아
     **폼이 회차 수만큼 열렸다**(실측 2개). 표 열 정렬도 깨져 작성과 같은 팝업으로 옮겼다 */
  /* ⚠ 반복 업무는 회차마다 행이 있어 키만으로는 여러 행이 걸린다 — 누른 회차(tkEditOcc)로 좁히고,
     그것도 없는 경로(검색에서 바로 열기 등)를 대비해 **한 번 그리면 잠근다**(363차) */
  let editing=S.tkEdit===key&&(!S.tkEditOcc||S.tkEditOcc===(occ||dsp||''));
  if(editing){if(_edShown)editing=false;else _edShown=true;}
  const dsp=occ||taskDate(sid,iid,it);       /* 반복이면 주기 화면이 준 그 회차, 아니면 it.date */
  /* ⚠ 반복은 회차별 완료(doneOn)가 상태다 — stEff 는 반복을 늘 '진행'으로 보므로 여기서 회차를 본다(323차) */
  const rec=!!(it.recur&&it.recur.f);
  const st=(rec&&dsp)?(isDone(taskAsPlan(sid,iid,it),dsp)?2:1):stEff(it,occ||undefined);
  const di=dueInfo(dsp);
  /* 담당자별 묶음 안에서는 소제목이 곧 그 사람 — 본인 배지는 겹말이라 뺀다(공동 담당자만 남긴다) */
  const asg=Object.keys(it.assignees||{}).filter(id=>id!==hideOwn)
    .map(id=>roster().find(p=>p.id===id)).filter(Boolean);
  const sn=siteName(it.site);
  const open=S.tkOpen===key;
  /* 업무 일정 카드와 같은 골격 — 1행 [색 원][제목][아이콘], 2행 [상태 배지][구분·날짜]//[현장·담당자] */
  const p0=taskAsPlan(sid,iid,it);
  const lnk=Object.values(it.links||{}).filter(l=>l&&l.url)[0];
  const md=x=>{const t=toDate(x);return (t.getMonth()+1)+'/'+t.getDate();};
  const span=it.end&&it.end!==it.date&&!(it.recur&&it.recur.f);   /* 반복은 회차 하루로 본다 */
  /* ── 한 줄 · 열 고정(250차) ──
     [색 원][제목][구분][현장][담당][날짜][조작]. 열 폭이 고정이라 행마다 같은 자리에 같은 정보가 온다
     — 예전처럼 좌우 양끝으로 밀면 칸이 넓을수록 가운데가 비고 행마다 위치가 달라 훑기 어려웠다.
     ⚠ 시각·반복처럼 가끔 있는 정보는 열을 따로 주지 않고 제목 뒤에 흐리게 붙인다(열이 늘면 다 좁아진다) */
  /* 689차: 기간 업무는 시작–끝을 it.date 로 그린다 — 완료 패널은 occ 에 끝날짜를 넘겨(정렬용) 「8/31–8/31」로 찍혔다. 반복은 회차(dsp)가 시작 */
  const dcell=dsp?(span?md(rec?dsp:it.date)+'–'+md(it.end):md(dsp)):'';
  /* 제목 뒤에 흐리게 붙는 것 — 시각·반복처럼 **열을 줄 만큼 잦지 않은 값**만 */
  const sub=[fmtSpan(it),(it.recur&&it.recur.f)?REC_LBL[it.recur.f]:''].filter(Boolean).join(' · ');
  const who=asg.map(x=>x.name).join(', ')||(withSubject?subjName(sid):'');
  /* 적힌 내용이 있으면 제목 뒤에 표시를 단다 — 어느 행에 진행사항·계획이 있는지 눌러 보지 않아도 안다(361차) */
  const hasDet=!!taskBody(it).trim();
  const go=' data-act="tk.open" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'"';
  return `
  <div class="tk-item s${st}${editing?' editing':''}${open?' open':''}${cols.grp?' grp':''}${cols.gw?' gw':''}${onSelDay(sid,iid,it,dsp)?' hl':''}" data-sid="${esc(sid)}" data-iid="${esc(iid)}">
    <div class="tk-row">
      ${cols.noReg?'':'<span class="tkc tkc-r"'+go+'>'+esc(cols.regLabel||'')+'</span>'}
      ${editing
        ? (cols.who?'<span class="tkc tkc-w"><i class="tkc-dot" id="tnAsgDot" style="background:'+esc(colBg(planColor(p0)))+'"></i>'
            +ownSelHTML('tnAsg',(Object.keys(it.assignees||{}).filter(k=>it.assignees[k])[0])||'',roster())+'</span>':'')
          +(cols.site?'<span class="tkc tkc-s">'+sitePickHTML('tnSite',it.site||'')+'</span>':'')
          +'<span class="tk-ttl"><input class="inp cell-inp" id="tnTitle" value="'+esc(it.text||'')+'" placeholder="무엇을 하나요?"></span>'
          +'<span class="tkc tkc-d date-wrap">'
            +'<button type="button" class="inp cell-inp date-cell" data-act="tk.dateOpen">'+esc(rangeLabel(it.date||'',it.end||'')||'선택')+'</button>'
            +'<input type="hidden" id="tnDate" value="'+esc(it.date||'')+'"><input type="hidden" id="tnEnd" value="'+esc(it.end||'')+'">'
            +tkRangePopHTML()+'</span>'
        : (cols.who?(cols.gw?'<span class="tkc tkc-w"></span>'
            :'<span class="tkc tkc-w'+(who?'':' dim')+'"'+go+'>'
              +'<i class="tkc-dot" style="background:'+esc(colBg(planColor(p0)))+'"></i>'+(who?esc(who):'공통')+'</span>'):'')
          +(cols.site?'<span class="tkc tkc-s"'+go+'>'+esc(sn)+'</span>':'')
          +'<span class="tk-ttl"'+go+'>'+riskMark(it.kind)+esc(it.text||'제목 없음')
            +(sub?'<i class="tk-sub-i">'+esc(sub)+'</i>':'')
            +(hasDet?'<i class="tk-note" aria-label="적힌 내용 있음"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></i>':'')
            +'</span>'
          +'<span class="tkc tkc-d'+(st!==2&&di.cls==='over'?' over':'')+'"'+go+'>'+esc(dcell)+'</span>'}
      <span class="tk-acts">
        ${editing
          ? '<button class="tk-ico tk-ok" data-act="tk.formSave" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'" aria-label="저장" data-tip="저장"><svg class="icn"><use href="#i-check"></use></svg></button>'
            +'<button class="tk-ico tk-cx" data-act="tk.formCancel" aria-label="취소" data-tip="취소"><svg class="icn"><use href="#i-close"></use></svg></button>'
            +'<button class="tk-ico tk-del" data-act="tk.del" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'" aria-label="삭제" data-tip="삭제"><svg class="icn"><use href="#i-trash"></use></svg></button>'
          : stIcon(st,' data-act="tk.st" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'" data-occ="'+esc(dsp||'')+'"')}
      </span>
    </div>
    ${editing?tkEditRestHTML(sid,iid,it):(open?taskDetailHTML(sid,iid,it,dsp):'')}
  </div>`;
}

/* 목록 맨 위 열 이름 — 어느 열이 무엇인지 알려 준다.
   ⚠ 목록 안에 두고 sticky 로 붙인다 — 그냥 두면 스크롤할 때 위로 밀려 잘린 채 남는다(251차) */
/* 한 행만 다시 그린다 — 화면을 통째로 갈아엎지 않으므로 **그 행의 요소가 살아남고**,
   덕분에 상태 아이콘의 모션이 그대로 보인다(372차). 다른 행·스크롤·펼침은 건드리지 않는다.
   ⚠ 주기가 바뀌어 그 행이 다른 칸으로 옮겨가야 하면(완료↔예정) 전체를 다시 그린다 */
function tkRowRefresh(el){
  const row=el&&el.closest&&el.closest('.tk-item');
  const list=row&&row.closest('.tkl');
  if(!row||!list)return rTasks();
  const sid=row.dataset.sid,iid=row.dataset.iid;
  const it=(S.tasks[sid]||{})[iid];
  if(!it)return rTasks();
  const occ=el.dataset.occ||'';
  const cols=tkColsFromList(list);
  const done=(it.recur&&it.recur.f&&occ)?isDone(taskAsPlan(sid,iid,it),occ):(stEff(it)===2);
  const inDone=!!row.closest('.tkwk-col:first-child');
  if(S.tkView!=='month'&&done!==inDone)return rTasks();   /* 칸이 달라진다 — 전체로 */
  const box=document.createElement('div');
  box.innerHTML=taskItemHTML(sid,iid,it,false,'',cols,occ);
  const next=box.firstElementChild;
  if(!next)return rTasks();
  next.classList.add('st-just');   /* 상태 아이콘이 살짝 튀어나오는 표시 */
  row.replaceWith(next);
}
/* 그 목록이 어떤 열 구성인지 — 행을 다시 그릴 때 열이 어긋나지 않게 클래스에서 되읽는다 */
function tkColsFromList(list){
  const c=list.className||'';
  if(/tkl-nr-w/.test(c))return{site:false,who:true,noReg:true};
  if(/tkl-nr/.test(c))return{site:false,who:false,noReg:true};
  if(/tkl-s-w/.test(c))return{site:true,who:true};
  if(/tkl-s/.test(c))return{site:true,who:false};
  if(/tkl-w/.test(c))return{site:false,who:true};
  return{site:false,who:false};
}
function tkHeadRowHTML(cols){
  const c=cols||{site:true,who:true};
  return '<div class="tk-row tk-hrow">'
    +(c.noReg?'':'<span class="tkc tkc-r">권역</span>')
    +(c.who?'<span class="tkc tkc-w">이름</span>':'')
    +(c.site?'<span class="tkc tkc-s">현장</span>':'')
    +'<span class="tk-ttl">업무</span>'
    +'<span class="tkc tkc-d">날짜</span>'
    +'<span class="tk-acts">완료</span></div>';
}
/* 이 목록에 실제로 값이 있는 열만 그린다 — 공통 업무처럼 현장·담당자가 없는 묶음에서
   빈 열이 자리만 차지하지 않게. ⚠ 판정은 **그려질 HTML 이 아니라 데이터**로 한다 */
function tkColsOf(list,hideOwn){
  const site=list.some(x=>x.it&&x.it.site);
  const who=list.some(x=>{
    const a=Object.keys((x.it&&x.it.assignees)||{}).filter(id=>id!==hideOwn&&x.it.assignees[id]);
    return a.length>0;});
  return{site,who};
}
/* 목록 묶음을 감쌀 때 쓰는 클래스 — 열 개수에 맞춰 grid 를 고른다 */
function tkListCls(c){   /* ⚠ 리터럴로 낸다 — 문자열을 조합하면 정적 감사가 죽은 클래스로 본다 */
  if(c.noReg)return c.who?'tkl-nr-w':'tkl-nr';   /* 월간 업무 — 권역·현장 열이 없다 */
  return c.site?(c.who?'tkl-s-w':'tkl-s'):(c.who?'tkl-w':'tkl');}
/* 펼친 업무 — 진행경과·처리계획. 링크는 넣지 않는다 — 행 우측 아이콘이 이미 있어 겹말이다(319차) */
/* 행에 열이 없는 값들 — 셀 스위칭만으로는 고칠 수 없어 아래 한 줄로 잇는다(363차).
   ⚠ 큰 카드 폼을 끼워 넣지 않는다 — 표의 연장으로 보이게 라벨을 작게, 한 줄로 */
/* 날짜 칸 표기 — 하루면 한 날짜, 기간이면 시작~종료 */
function rangeLabel(a,b){
  if(!a)return '';
  const md=x=>Number(x.slice(5,7))+'/'+Number(x.slice(8,10));
  return (b&&b!==a)?md(a)+'~'+md(b):md(a);
}
/* 날짜 칸을 누르면 뜨는 작은 달력 — 한 번 누르면 시작, 다시 누르면 종료(그 사이가 기간).
   ⚠ 칸을 둘로 늘리지 않는다(365차 지시) — 한 칸 안에서 기간을 잡는다 */
function tkRangePopHTML(){
  const D=S.tkDate||{};if(!D.open)return '';
  const a=($('#tnDate')&&$('#tnDate').value)||D.a||'';
  const ym=D.ym||(a?a.slice(0,7):todayStr().slice(0,7));
  const y=Number(ym.slice(0,4)),m=Number(ym.slice(5,7))-1;
  const days=new Date(y,m+1,0).getDate(),lead=new Date(y,m,1).getDay();
  const b=($('#tnEnd')&&$('#tnEnd').value)||D.b||'';
  let cells='';
  for(let i=0;i<lead;i++)cells+='<i class="rc-d out"></i>';
  for(let d=1;d<=days;d++){
    const ds=y+'-'+pad(m+1)+'-'+pad(d);
    const inR=a&&b&&ds>a&&ds<b;
    cells+='<button type="button" class="rc-d'+(ds===a?' a':'')+(ds===b?' b':'')+(inR?' in':'')
      +'" data-act="tk.dateDay" data-d="'+ds+'">'+d+'</button>';
  }
  return `<div class="rc-pop" id="tkRcPop" data-act="modal.stop">
    <div class="rc-h">
      <button type="button" class="rc-nb" data-act="tk.dateMon" data-d="-1">‹</button>
      <b>${y}년 ${m+1}월</b>
      <button type="button" class="rc-nb" data-act="tk.dateMon" data-d="1">›</button>
    </div>
    <div class="rc-w">${['일','월','화','수','목','금','토'].map(x=>'<i>'+x+'</i>').join('')}</div>
    <div class="rc-g">${cells}</div>
  </div>`;
}
/* 달력만 다시 그린다 — 행 전체를 다시 그리면 입력 중인 값이 날아간다 */
function tkDateRefresh(){
  const cell=$('.date-wrap');if(!cell)return;
  const old=$('#tkRcPop');if(old)old.remove();
  const btn=cell.querySelector('.date-cell');
  if(btn)btn.textContent=rangeLabel(($('#tnDate')&&$('#tnDate').value)||'',($('#tnEnd')&&$('#tnEnd').value)||'')||'선택';
  const html=tkRangePopHTML();if(!html)return;
  /* ⚠ 표 안에 두면 목록·카드의 overflow 가 달력을 잘라낸다(370차 실측) — 화면 기준으로 띄우고 좌표만 맞춘다 */
  document.body.insertAdjacentHTML('beforeend',html);
  const pop=$('#tkRcPop');if(!pop||!btn)return;
  const r=btn.getBoundingClientRect(),h=pop.offsetHeight,w=pop.offsetWidth;
  let top=r.bottom+6;if(top+h>window.innerHeight-8)top=Math.max(8,r.top-h-6);
  let left=r.left;if(left+w>window.innerWidth-8)left=Math.max(8,window.innerWidth-w-8);
  pop.style.top=Math.round(top)+'px';pop.style.left=Math.round(left)+'px';
}
function tkEditRestHTML(sid,iid,it){
  const kind=kindOf(it.kind),rc=(it.recur&&it.recur.f)||'';
  const lnk=Object.values(it.links||{})[0]||null;
  return `<div class="tk-editrest">
    <div class="tk-erow">
      <label>구분<select class="inp cell-inp" id="tnKind" data-act="tk.kind">
        ${TK_KIND.map(([v,l])=>'<option value="'+v+'"'+(v===kind?' selected':'')+'>'+esc(l)+'</option>').join('')}</select></label>
      <label>시간<input type="time" class="inp cell-inp" id="tnTime" value="${esc(it.time||'')}"></label>
      <label>반복<select class="inp cell-inp" id="tnRec">
        ${Object.keys(REC_LBL).map(k=>'<option value="'+k+'"'+(k===rc?' selected':'')+'>'+REC_LBL[k]+'</option>').join('')}</select></label>
      <label class="ru"${rc?'':' hidden'}>반복 종료<input type="date" class="inp cell-inp" id="tnUntil" value="${esc((it.recur&&it.recur.until)||'')}"></label>
      <label class="gw">링크<input class="inp cell-inp" id="tnLink" maxlength="${LINK_MAX}" placeholder="https://…" value="${esc((lnk&&lnk.url)||'')}"></label>
    </div>
    <div id="tnBodySec" class="tk-ebody">${tkBodyHTML(taskBody(it),kind)}</div>

    <input type="hidden" id="tnColor" value="${esc(it.color||'')}">
  </div>`;
}
function taskDetailHTML(sid,iid,it,occ){
  /* ⚠ 비어 있어도 칸을 그린다(361차) — 예전에는 값이 없으면 펼침 자체가 열리지 않아
     **새로 적을 방법이 수정 폼밖에** 없었다. 펼침은 읽기이자 쓰기 자리다 */
  const box=(lbl,val,field)=>`<div class="tk-sec">
      <div class="tk-sec-h">${lbl}</div>
      <div class="tk-sec-b" contenteditable="true" data-act="tk.field" data-f="${field}" data-sid="${esc(sid)}" data-iid="${esc(iid)}"
        data-ph="${lbl}를 입력하세요">${esc(val||'')}</div>
    </div>`;
  const hist=(Array.isArray(it.hist)?it.hist:[]).slice().reverse();
  const histHTML=hist.length?`<details class="tk-hist"><summary>이력 ${hist.length}</summary><div class="tk-hist-l">${
    hist.map(h=>{const d=new Date(h.t);
      return '<div>'+esc((d.getMonth()+1)+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'))
        +' · '+esc(h.u||'?')+' · '+esc(HIST_LBL[h.k]||h.k)+'</div>';}).join('')
  }</div></details>`:'';
  return `<div class="tk-detail">
    ${canEditTask(it,sid)?`<button class="tk-ico tk-ed tk-det-ed" data-act="tk.edit" data-sid="${esc(sid)}" data-iid="${esc(iid)}" data-occ="${esc(occ||'')}" aria-label="수정" data-tip="수정"><svg class="icn"><use href="#i-pen"></use></svg></button>`:''}
    ${box('내용',taskBody(it),'prog')}
    ${histHTML}
  </div>`;
}   /* 615차: 수정 버튼을 펼침으로 — 행의 체크 버튼 바로 아래 자리(.tk-det-ed) */
/* 보류함 — 아침 확인에서 넘긴 업무(st=3). 고른 팀의 공통·담당자 것을 모아 기한 오래된 순으로 */
function holdItems(){
  const{team,mems}=tkSel();
  const sids=(team?[team.id]:[]).concat(mems.map(p=>p.id));
  const out=[];
  sids.forEach(sid=>{
    const m=S.tasks[sid]||{};
    Object.keys(m).forEach(iid=>{if(m[iid]&&stOf(m[iid].st)===3)out.push({sid,iid,it:m[iid]});});
  });
  return out.sort((a,b)=>String(taskDate(a.sid,a.iid,a.it)||'9999').localeCompare(String(taskDate(b.sid,b.iid,b.it)||'9999')));   /* 반복은 회차 기준 */
}
function regionMembers(mems,regions,rid){
  return rid===''?mems.filter(p=>!p.region||!regions.some(r=>r.id===p.region))
                 :mems.filter(p=>p.region===rid);
}
/* 작성·수정 공용 폼 — 작성창과 수정 폼이 같은 골격을 쓴다(일관성) */
function taskFormHTML(sid,iid,cur){
  /* 업무 일정의 편집 폼과 같은 골격 — 행 순서·아이콘·버튼·디자인 전부 동일.
     다만 업무 목록에는 '자세히'(접기·펼치기)와 '업무 목록에서 쓰기' 아이콘이 필요 없다 */
  const d=cur||{text:'',prog:'',plan:'',site:'',assignees:meOwner(),links:{},color:'',date:'',end:'',time:'',kind:KIND_DEF,recur:{f:'',until:''}};
  const people=tkSel().mems;
  const kind=kindOf(d.kind);
  /* (상태는 폼에서 바꾸지 않는다 — 목록의 상태 아이콘이 담당) */
  const rc=(d.recur&&d.recur.f)||'';
  const lnk=Object.values(d.links||{}).filter(l=>l&&l.url)[0];
  const own=Object.keys(d.assignees||{}).find(k=>(d.assignees||{})[k])||'';
  return `<div class="dp-edit tk-new" id="tkNew" data-sid="${esc(sid)}" data-iid="${esc(iid||'')}">
    <div class="pe-bar">
      ${colDotHTML(planColor({color:d.color,owners:d.assignees||{}}))}
      <input type="hidden" id="tnColor" value="${esc(d.color||'')}">
      <input class="pe-ttl" id="tnTitle" maxlength="120" placeholder="무엇을 하나요?" value="${esc(d.text||'')}">
      <div class="pe-side">
        ${iid
          ?'<button class="pe-ic pe-del" data-act="tk.del" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'" aria-label="삭제" data-tip="삭제"><svg class="icn"><use href="#i-trash"></use></svg></button>'
          :'<button class="pe-ic pe-del" data-act="tk.formCancel" aria-label="취소" data-tip="저장하지 않고 닫기"><svg class="icn"><use href="#i-close"></use></svg></button>'}
        <button class="pe-ic pe-ok" data-act="tk.formSave" data-sid="${esc(sid)}" data-iid="${esc(iid||'')}" aria-label="저장하고 닫기" data-tip="저장하고 닫기"><svg class="icn"><use href="#i-check"></use></svg></button>
      </div>
    </div>
    <div class="pe-body">
      <div class="frow4">
        <div class="frow"><label>시작일</label><input type="date" class="inp inp-sm" id="tnDate" value="${esc(d.date||'')}"></div>
        <div class="frow"><label>종료일</label><input type="date" class="inp inp-sm" id="tnEnd" value="${esc(d.end||'')}"></div>
        <div class="frow"><label>시간</label><input type="time" class="inp inp-sm" id="tnTime" value="${esc(d.time||'')}"></div>
        <div class="frow"><label>반복</label><select class="inp inp-sm" id="tnRec">${Object.keys(REC_LBL).map(k=>'<option value="'+k+'"'+(k===rc?' selected':'')+'>'+REC_LBL[k]+'</option>').join('')}</select></div>
      </div>
      <div class="frow" id="tnUntilRow" style="${rc?'':'display:none'}"><label>반복 종료</label><input type="date" class="inp inp-sm" id="tnUntil" value="${esc((d.recur&&d.recur.until)||'')}"></div>
      <div class="frow4">
        <div class="frow"><label>구분</label>
          <select class="inp inp-sm" id="tnKind" data-act="tk.kind">
            ${TK_KIND.map(([v,l])=>'<option value="'+v+'"'+(v===kind?' selected':'')+'>'+esc(l)+'</option>').join('')}
          </select></div>
        <div class="frow"><label>담당자</label>${ownSelHTML('tnAsg',own,people)}</div>
        <div class="frow"><label>현장</label>${sitePickHTML('tnSite',d.site||'')}</div>
        <div class="frow"><label>링크</label><input class="inp inp-sm" id="tnLink" maxlength="${LINK_MAX}" placeholder="https://…" value="${esc((lnk&&lnk.url)||'')}"></div>
      </div>
      <div id="tnBodySec">${tkBodyHTML(taskBody(d),kind)}</div>
    </div>
  </div>`;
}
function tkBodyHTML(prog,kind){
  return `<div class="frow"><label>내용</label><textarea class="inp inp-sm" id="tnProg" maxlength="2000" placeholder="${esc(kindLabel(kind))} 내용을 적으세요">${esc(prog)}</textarea></div>`;
}
/* 업무 구분을 바꾸면 본문 칸 구성이 달라진다 — 그 부분만 다시 그려 다른 입력을 지키지 않게 한다 */
/* 업무 구분을 '공통'으로 고르면 담당자도 공통(빈 값)으로 — 공통 업무는 특정 담당자에게 걸지 않는다 */
function kindOwnerSync(kindId,ownId){
  const k=$('#'+kindId),o=$('#'+ownId);
  if(k&&o&&k.value==='gather'){o.value='';peColorSync();}   /* 609차: 값을 코드로 바꾸면 input 이 안 울린다 — 직접 부른다 */
}
function tkKindRefresh(){
  const sec=$('#tnBodySec');if(!sec)return;
  const kind=kindOf(($('#tnKind')&&$('#tnKind').value)||'');
  const prog=($('#tnProg')&&$('#tnProg').value)||'';
  sec.innerHTML=tkBodyHTML(prog,kind);
}
function taskFormSave(sid,iid){
  S.tkDate={open:false,ym:'',a:'',b:''};const rp0=$('#tkRcPop');if(rp0)rp0.remove();
  const t=($('#tnTitle').value||'').trim();
  if(!t){toast('제목을 입력하세요');$('#tnTitle').focus();return;}
  const cur=iid?((S.tasks[sid]||{})[iid]||null):null;
  const id=iid||uid();
  /* ⚠ 폼에 그 칸이 없으면(현장별 업무에는 현장·권역 칸이 없다) 기존 값을 그대로 지킨다 —
     없는 칸을 읽어 빈 값으로 덮으면 담당자·현장이 소리 없이 지워진다(389차) */
  const asgEl=$('#tnAsg');
  const asg=asgEl?(asgEl.value?{[asgEl.value]:1}:{}):{...((cur&&cur.assignees)||{})};
  const siteEl=$('#tnSite');
  const siteV=siteEl?(siteEl.value||''):String((cur&&cur.site)||'');
  /* 링크는 업무 일정 폼과 같이 한 칸 — 예전에 여러 개 넣어 둔 것은 첫 칸만 고치고 나머지는 그대로 둔다 */
  const links={...((cur&&cur.links)||{})};
  const lu=(($('#tnLink')&&$('#tnLink').value)||'').trim();
  const lk0=Object.keys(links)[0];
  if(lu){const k=lk0||uid();links[k]={...(links[k]||{}),url:/^https?:\/\//i.test(lu)?lu:'https://'+lu};}
  else if(lk0)delete links[lk0];
  const rec=($('#tnRec')&&$('#tnRec').value)||'';
  const _nu=!cur;   /* 627차: 신규 판별 — 신규면 소유·작성 이력, 기존이면 수정 이력 */
  store.putTask(sid,id,histPush({...(cur||{createdAt:Date.now(),...(S.live&&authUid()?{createdBy:authUid()}:{})}),
    text:t,kind:kindOf(($('#tnKind')&&$('#tnKind').value)||''),
    prog:(($('#tnProg')&&$('#tnProg').value)||'').trim(),plan:'',
    site:siteV,
    date:($('#tnDate')&&$('#tnDate').value)||'',
    end:($('#tnEnd')&&$('#tnEnd').value)||'',
    time:($('#tnTime')&&$('#tnTime').value)||'',
    recur:rec?{f:rec,until:(($('#tnUntil')&&$('#tnUntil').value)||'')}:{f:'',until:''},
    /* ⚠ 표시 상태(stEff)를 저장하면 지난 팀 업무를 고치기만 해도 완료로 굳는다 — 저장된 상태만 유지 */
    st:stOf(cur&&cur.st),
    stKeep:!!(cur&&cur.stKeep),
    assignees:asg,links,color:($('#tnColor')&&$('#tnColor').value)||'',
    order:(cur&&Number.isFinite(Number(cur.order)))?Number(cur.order):nextOrder(sid),
    updatedAt:Date.now()},_nu?'new':'edit'));
  S.tkNew=null;S.tkEdit=null;S.tkOpen=sid+'/'+id;
  if(!S.live){rTasks();rDay();rWidget();}else setTimeout(rTasks,220);
  refetchCal();
}

/* ── 업무 폼 닫기 보호 ──
   폼에는 진행경과·처리계획이 각 2000자까지 들어간다. Escape 한 번에 말없이 버리면 손해가 크다.
   ⚠ 저장된 값과 비교해 **정말 바뀐 것이 있을 때만** 묻는다 — 열자마자 닫는 경우까지 물으면 성가시다 */
function tkFormDirty(){
  if(!S.tkNew&&!S.tkEdit)return false;
  if(!$('#tnTitle'))return false;
  const key=S.tkEdit||'';
  const sid=key?key.split('/')[0]:S.tkNew,iid=key?key.split('/')[1]:'';
  const cur=(key&&(S.tasks[sid]||{})[iid])||{};
  const v=id=>{const el=$('#'+id);return el?String(el.value||'').trim():'';};
  const was=x=>String(x||'').trim();
  return v('tnTitle')!==was(cur.text)||v('tnProg')!==was(taskBody(cur));
}
/* 폼을 닫는 유일한 통로 — 취소 버튼과 Escape 가 함께 쓴다 */
function tkFormClose(){
  S.tkDate={open:false,ym:'',a:'',b:''};const rp=$('#tkRcPop');if(rp)rp.remove();
  if(!tkFormDirty()){S.tkNew=null;S.tkEdit=null;S.tkEditOcc='';rTasks();return;}
  confirmModal('작성 중인 내용 버리기','적은 내용이 저장되지 않았습니다. 그대로 닫으면 사라집니다.',
    ()=>{S.tkNew=null;S.tkEdit=null;S.tkEditOcc='';rTasks();},'버리고 닫기',true);
}
/* ── 목록 보조 ── */
function nextOrder(sid){
  const m=S.tasks[sid]||{};
  const vals=Object.values(m).map(x=>Number(x.order)).filter(Number.isFinite);
  return (vals.length?Math.max(...vals):0)+1;
}
/* 업무 검색·필터 — 제목·경과·계획·현장·담당자까지 훑고, 상태·기한으로 좁힌다 */
/* 업무 분류 — 일반만 진행경과·처리계획을 나눠 쓰고, 나머지는 내용 한 칸 */
const TK_KIND=[['','일반'],['risk','고위험'],['gather','공통'],['trip','출장'],['meet','회의'],['etc','기타']];   /* 첫 항목이 새 업무 기본값 — 일반 */
const KIND_DEF='';
function kindOf(v){return TK_KIND.some(k=>k[0]===v)?v:'';}
function kindLabel(v){const k=TK_KIND.find(x=>x[0]===kindOf(v));return k?k[1]:'일반';}
/* 업무 내용 — 구분과 상관없이 한 칸이다(389차: 진행경과·처리계획을 내용으로 일원화).
   ⚠ 옛 업무에 남아 있는 처리계획(plan)은 버리지 않고 내용 뒤에 이어 붙여 보여 준다.
   저장하면 cleanTask 가 plan 을 쓰지 않으므로 합쳐진 내용만 남는다 */
function taskBody(t){
  if(!t)return '';
  const a=String(t.prog||t.body||'').trim(),b=String(t.plan||'').trim();
  return b?(a?a+'\n'+b:b):a;
}
function isRisk(v){return kindOf(v)==='risk';}   /* 고위험 — 달력 막대·목록에서 느낌표로 표시 */
/* 제목 앞 고위험 표식 — 달력 막대는 CSS(.fc-event.risk)가 같은 아이콘을 그린다.
   ⚠ 모양은 CSS 마스크가 그린다 — 안에 글자를 넣지 않는다(넣으면 원 안에서 위로 뜬다) */
function riskMark(kind){return isRisk(kind)?'<span class="risk-b" role="img" aria-label="고위험" data-tip="고위험 업무"></span>':'';}
/* 필터는 매번 다시 고르기 번거롭다 — 계정별로 이 브라우저에 저장해 다음에 그대로 연다 */
function filtKey(){return 'calapp.filt.'+((S.user&&S.user.uid)||'local');}
function filtSave(){
  try{localStorage.setItem(filtKey(),JSON.stringify({filter:S.filter,tkF:S.tkF}));}
  catch(e){/* 저장 실패는 무시 */}
}
function filtLoad(){
  try{
    const v=JSON.parse(localStorage.getItem(filtKey())||'null');if(!v)return;
    if(v.filter)S.filter={...S.filter,...v.filter};
    if(v.tkF){S.tkF={...S.tkF,...v.tkF};delete S.tkF.reg;}   /* 옛 저장값의 권역은 버린다(필터에서 없앴다) */
  }catch(e){/* 깨진 값은 무시 */}
}
/* 목록 위 한 줄 — 검색(남는 폭 전부) + 업무 추가.
   ⚠ 업무 추가는 여기 하나뿐이다(패널 머리에서 뺐다 — 252차까지는 카드마다 있었다) */
/* 찾기 — 왼쪽 칸 필터 카드 맨 위에 둔다(327차) */
function tkSearchHTML(){
  const f=S.tkF||{};
  return `<div class="dp-srch tkq-srch${String(f.q||'').trim()?' has':''}">
      <svg class="icn dp-srch-i" aria-hidden="true"><use href="#i-search"></use></svg>
      <input class="inp inp-sm" id="tkQ" placeholder="찾기" value="${esc(f.q||'')}" autocomplete="off">
      <button class="dp-srch-x" data-act="tkf.qclear" aria-label="지우기"><svg class="icn"><use href="#i-close"></use></svg></button>
    </div>`;   /* 771차: × 는 늘 두고 값이 있을 때만 보인다(has) — 타이핑 중 바로 뜨게 */
}
/* 필터 — 왼쪽 칸(보류한 업무 아래)에 따로 둔다. 셋뿐이라 접지 않고 세로로 세운다 */
function tkFilterHTML(){
  const f=S.tkF||{};
  const on=!!((f.st||[]).length||(f.kind||[]).length||(f.site||[]).length||(f.own||[]).length);
  /* ⚠ 권역 필터는 없앴다 — 팀 전체 화면의 '담당 업무' 카드 탭이 권역을 맡는다(248차). */
  const sites=(S.org.sites||[]).filter(x=>x.name);
  const M=(g,all,items)=>mselHTML('tk',g,all,items,f[g]);
  /* 찾기 줄 옆 꺽쇠로 필터를 접었다 폈다 한다 — 제목 줄은 두지 않는다(328차).
     ⚠ 필터가 걸려 있으면 접혀 있어도 알 수 있게 꺽쇠에 점을 찍는다 */
  const open=S.tkFOpen===true;
  return `<div class="card tkf-card${open?' open':''}" id="tkFcard">
    <div class="tkf-top">
      ${tkSearchHTML()}
      <button class="tkf-tg${on?' on':''}" data-act="tkf.toggle" aria-label="필터 ${open?'접기':'펼치기'}" aria-expanded="${open}" data-tip="필터">
        <svg class="icn" aria-hidden="true"><use href="#i-filter"></use></svg>
      </button>
    </div>
    ${open?`<div class="tkf-body">
      ${M('kind','업무 구분 전체',TK_KIND.map(k=>[k[0]||'_gen',k[1]]))}
      ${M('st','진행 상태 전체',ST_PICK)}
      ${M('own','담당자 전체',[['_none','공통(담당자 없음)']].concat(tkSel().mems.map(p=>[p.id,p.name])))}
      ${M('site','현장 전체',sites.map(x=>[x.id,x.name]))}
    </div>`:''}
  </div>`;
}
function tkMatch(sid,iid,it){
  const f=S.tkF||{};
  const q=String(f.q||'').trim().toLowerCase();
  if(q){
    const asg=Object.keys(it.assignees||{}).map(id=>ownName(id)).join(' ');
    const hay=[it.text,it.prog,it.body,it.plan,siteName(it.site),subjName(sid),asg,
      ].join(' ').toLowerCase();
    if(hay.indexOf(q)<0)return false;
  }
  const ST=(f.st||[]).map(String),K=(f.kind||[]).map(String),SI=(f.site||[]).map(String),OW=(f.own||[]).map(String);
  if(ST.length&&!ST.includes(String(stEff(it))))return false;
  if(K.length&&!K.includes(kindOf(it.kind)||'_gen'))return false;
  if(SI.length&&!SI.includes(String(it.site||'')))return false;
  if(OW.length){   /* 담당자 — 배정된 사람 중 하나라도 걸리면 통과. '_none' 은 담당자 없는 공통 업무 */
    const asg=Object.keys(it.assignees||{}).filter(k=>it.assignees[k]);
    const hit=asg.length?asg.some(id=>OW.includes(String(id))):OW.includes('_none');
    if(!hit)return false;
  }
  return true;
}
/* 다시 그리기 전후로 스크롤 위치를 기억한다 — rTasks 는 #tkRoot 를 통째로 갈아끼우므로
   그냥 두면 완료 체크·펼치기마다 목록이 맨 위로 튄다.
   ⚠ 대상(팀/담당자)을 바꿨을 때는 되돌리지 않는다 — 새 목록이 아래로 내려간 채 열린다 */
let _tkScKey='';
/* 연타(탭·주 이동)로 렌더 요청이 몰리면 다음 프레임에 한 번만 그린다 — 총 비용이 줄고 화면이 튀지 않는다(372차) */
let _rqT=0;
function rTasksSoon(){if(_rqT)return;_rqT=requestAnimationFrame(()=>{_rqT=0;rTasks();});}
/* ═══════════ 655차: 여러 건 골라 한 번에 처리 ═══════════
   ⚠ 행 클릭은 이미 tk.open(펼치기)이 쓰고 있다 — 선택은 수식키(데스크톱)나 길게 누르기(모바일)로만 들어간다.
   ⚠ 범위 선택(Shift)은 데이터 순서가 아니라 화면에 그려진 순서로 계산한다(묶음·정렬이 매번 다르다). */
const PICK={set:new Set(),anchor:null,mode:false};
/* 모바일은 수식키가 없다 — 500ms 길게 누르면 선택 모드로 들어간다 */
let _lpT=0;
document.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch')return;   /* ⚠ 마우스에도 걸면 데스크톱에서 누른 채 잠깐 멈춰도 선택이 켜진다 */
  const r=e.target.closest(PICK_SEL);if(!r)return;
  clearTimeout(_lpT);
  _lpT=setTimeout(()=>{PICK.mode=true;pickToggle(r,false);},500);
},true);
['pointerup','pointermove','pointercancel','scroll'].forEach(t=>
  document.addEventListener(t,()=>clearTimeout(_lpT),true));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&PICK.set.size)pickClear();});
/* 663차: 선택 대상은 두 가지 — 업무 목록 행(.tk-item)과 일자 패널 카드(.plan).
   위젯은 업무 목록이 없고 일자 패널만 팝업으로 띄우므로 카드 쪽이 위젯의 선택 대상이 된다.
   ⚠ 카드는 sid 를 들고 있지 않다(data-pid 만) — findPlan 으로 소속을 찾는다. */
const PICK_SEL='#tkRoot .tk-item, .day-panel .plan';
function pickKey(el){
  if(el.dataset.sid)return el.dataset.sid+'/'+el.dataset.iid;
  const p=findPlan(el.dataset.pid);
  return p&&p.sid?p.sid+'/'+p.id:'';
}
function pickRows(){return [...document.querySelectorAll(PICK_SEL)].filter(e=>pickKey(e));}
/* ⚠ 막대를 목록 안에 넣으면 목록을 다시 그릴 때마다 사라졌다 나타난다 —
   body 직속 플로팅으로 한 번만 만들고 보이기만 토글한다(피그마 툴바처럼 화면 하단 가운데). */
function pickBar(){
  let bar=document.getElementById('tkBulk');
  if(bar)return bar;
  bar=document.createElement('div');bar.id='tkBulk';bar.className='tkbulk';bar.hidden=true;
  /* 656차: 상태는 아무 행에서나 바꾸면 나머지가 따라간다 — 툴바에는 안내와 삭제·해제만 둔다 */
  bar.innerHTML='<span class="tkbulk-n" id="tkBulkN">0건 선택</span>'
    +'<span class="tkbulk-hint">한 건의 완료를 누르면 모두 따라갑니다</span>'
    +'<i class="tkbulk-sep"></i>'
    +'<button class="tkbulk-b tkbulk-del" data-act="pick.del">삭제</button>'
    +'<button class="tkbulk-b tkbulk-x" data-act="pick.clear" aria-label="선택 해제">해제</button>';
  document.body.appendChild(bar);return bar;
}
function pickPaint(){
  pickRows().forEach(r=>r.classList.toggle('pick',PICK.set.has(pickKey(r))));
  document.body.classList.toggle('pickmode',PICK.set.size>0);
  const bar=pickBar();
  bar.hidden=PICK.set.size===0;
  const c=document.getElementById('tkBulkN');if(c)c.textContent=PICK.set.size+'건 선택';
}
function pickClear(){PICK.set.clear();PICK.anchor=null;PICK.mode=false;pickPaint();}
function pickToggle(el,shift){
  const rows=pickRows(),k=pickKey(el);
  if(shift&&PICK.anchor){
    const a=rows.findIndex(r=>pickKey(r)===PICK.anchor),b=rows.indexOf(el);
    if(a>=0&&b>=0){const[i,j]=a<b?[a,b]:[b,a];
      for(let n=i;n<=j;n++)PICK.set.add(pickKey(rows[n]));}
  }else{
    if(PICK.set.has(k))PICK.set.delete(k);else PICK.set.add(k);
    PICK.anchor=k;
  }
  pickPaint();
}
/* 고른 것 중 내가 고칠 수 있는 것만 남긴다 — 조용히 실패하지 않게 몇 건이 빠졌는지 알린다 */
function pickEditable(){
  const ok=[],no=[];
  PICK.set.forEach(k=>{const[sid,iid]=k.split('/');const it=(S.tasks[sid]||{})[iid];
    if(!it)return;(canEditTask(it,sid)?ok:no).push({sid,iid,it});});
  return{ok,no};
}
/* 고른 것 전체를 '누른 행이 가려는 상태'로 맞춘다.
   ⚠ 반복 업무는 **이 회차만** 바꾼다 — 업무 자체(st)를 건드리면 다음 회차까지 닫힌다.
   회차 키는 행이 들고 있는 data-occ 로 잡고, 없으면 그 업무의 지금 회차를 쓴다. */
function pickSyncSt(el){
  const k0=el.dataset.sid+'/'+el.dataset.iid;
  const cur0=(S.tasks[el.dataset.sid]||{})[el.dataset.iid];if(!cur0)return;
  const wantDone=stEff(cur0)!==2;                 /* 누른 행이 가려는 방향 */
  const{ok,no}=pickEditable();
  if(!ok.length){denyTask();return;}
  undoSnap(ok,'일괄 상태');   /* ⚠ 바꾸기 전에 떠야 한다 */
  const rowOcc={};
  pickRows().forEach(r=>{const o=r.querySelector('.tk-acts [data-act="tk.st"]');
    if(o&&o.dataset.occ)rowOcc[pickKey(r)]=o.dataset.occ;});
  const patch={};
  ok.forEach(({sid,iid,it})=>{
    let next;
    if(it.recur&&it.recur.f){
      const occ=rowOcc[sid+'/'+iid]||'';
      const p=taskAsPlan(sid,iid,it),key=occ?occSrc(p,occ):(it.date||'');
      if(!key)return;
      const doneOn={...(it.doneOn||{})};
      if(wantDone)doneOn[key]=1;else delete doneOn[key];
      next=histPush({...it,doneOn,updatedAt:Date.now()},wantDone?'done':'undone');
    }else{
      next=histPush({...it,st:wantDone?2:1,stKeep:true,updatedAt:Date.now()},wantDone?'done':'undone');
    }
    S.tasks[sid][iid]=next;
    if(S.live)patch['calapp/tasks/'+sid+'/'+iid]=cleanTask(next);
  });
  if(S.live&&FB.db){if(Object.keys(patch).length)FB.db.ref().update(patch).catch(fbErr);}
  else lsSave(LocalStore._d);
  const label=wantDone?'완료':'진행';
  undoCommit();
  pickClear();rDay();rTasks();refetchCal();rWidget();
  /* 659차: 일괄은 여러 건이 한꺼번에 바뀌므로 결과만 짧게 알린다(되돌리기 버튼은 없앰 — Ctrl+Z) */
  if(no.length)toast(ok.length+'건 '+label+' · '+no.length+'건 권한 없음');
  void k0;
}
function rTasks(){
  if(_rqT){cancelAnimationFrame(_rqT);_rqT=0;}
  _edShown=false;
  const root=$('#tkRoot');
  const scKey=String(S.tk.t||'')+'|'+String(S.tk.m||'');
  const scSame=_tkScKey===scKey;
  const scList=[...root.querySelectorAll('.tk-list')].map(el=>el.scrollTop);
  _tkScKey=scKey;
  const restoreScroll=()=>{
    if(scSame)root.querySelectorAll('.tk-list').forEach((el,i)=>{if(scList[i])el.scrollTop=scList[i];});
    pickPaint();   /* 655차: 목록을 다시 그리면 선택 표시가 지워진다 — 상태에서 되살린다 */
  };
  const{teams,team,regions,mems}=tkSel();
  if(!teams.length){
    root.innerHTML='<div class="tk-none">아직 등록된 팀이 없습니다.<br>조직 관리에서 팀·권역을 만들고 계정에 배정하세요.<br><button class="btn bp bsm" data-act="nav.go" data-view="org">조직 관리로 이동</button></div>';
    return;
  }
  if(S.tk.m!=='hold')S.tk.m='teamall';   /* 대상 화면은 전체(주간)와 보류함뿐이다(316차) */
  const sel=S.tk.m;

  let mainHTML='';
  if(sel==='hold'){
    /* 검색·필터가 보류함에도 걸린다(323차). 탭도 함께 건다(389차) — 위 탭 줄과 목록이 어긋나면 안 된다 */
    const Rh={};roster().forEach(p=>{Rh[p.id]=p;});
    const hs=holdItems().filter(x=>tkMatch(x.sid,x.iid,x.it)&&tkTabHit(x.it,S.tkTab,Rh));
    const colsS=tkColsOf(hs,'');
    const listHTML=hs.length?hs.map(({sid,iid,it})=>taskItemHTML(sid,iid,it,false,'',{...colsS,regLabel:tkRegionOf(it).name})).join('')
      :'<div class="tk-empty">보류한 업무가 없습니다.</div>';
    mainHTML=tkTabsHTML(team,mems,regions,'hold')+`<div class="tkmain">
      <div class="tkmo-g">
        <div class="tkmo-h">보류한 업무</div>
        ${listHTML.includes('tk-item')?'<div class="tkl '+tkListCls(colsS)+'">'+tkHeadRowHTML(colsS)+listHTML+'</div>':listHTML}
      </div>
    </div>`;
  }else if(S.loading){
    mainHTML=tkSkelHTML();
  }else{
    mainHTML=(S.tkView==='month')?tkMonthHTML(team,mems,regions):tkWeekHTML(team,mems,regions);
  }

  const tkHTML=`<div class="tkwrap">
    <div class="tkside">
      <div class="seg tkv-seg">
        <button class="${S.tkView==='month'?'':'act'}" data-act="tk.view" data-v="week"><svg class="icn" aria-hidden="true"><use href="#i-cal-ck"></use></svg>주간 업무</button>
        <button class="${S.tkView==='month'?'act':''}" data-act="tk.view" data-v="month"><svg class="icn" aria-hidden="true"><use href="#i-layers"></use></svg>현장별 업무</button>
      </div>
      <div class="tkbar-wrap">
        ${miniCalHTML()}
        <div class="card tks-card tks-hold">
          <div class="tks-item tks-reg${sel==='hold'?' act':''}" data-act="tk.pick" data-id="${sel==='hold'?'teamall':'hold'}">
            <span class="n">보류한 업무</span><span class="c">${holdItems().length}</span>
          </div>
        </div>
        ${tkFilterHTML()}
      </div>
    </div>

    <div class="tkcol">
      ${mainHTML}
    </div>
  </div>`;
  if(!paintHTML(root,tkHTML)){restoreScroll();rTkNewOverlay();return;}   /* 443차: 같은 내용이면 다시 그리지 않는다 */
  restoreScroll();
  rTkNewOverlay();
  if(S.tkNew){const t=$('#tnTitle');if(t&&document.activeElement!==t)t.focus();}   /* ⚠ 초점은 **새 업무**에서만 — 수정은 행 안에서 고치므로 자동 초점이 가면 그 칸만 면이 켜진 채 남는다(369차) */
}
/* 새 업무 작성 모달 — 상태(S.tkNew)를 켜고 끄는 곳은 그대로 두고(핸들러·저장·닫기),
   rTasks 가 매번 여기서 오버레이를 상태에 맞춘다. 폼 로직은 인라인 시절과 동일(#tkNew·전역 위임).
   ⚠ 수정(S.tkEdit)은 지금처럼 목록 항목 자리에서 인라인으로 — 문맥을 잃지 않는다 */
function rTkNewOverlay(){
  const o=$('#tko');if(!o)return;
  const c=$('#tkoCard');
  /* 팝업은 **새 업무**만 맡는다 — 수정은 그 행 아래에서 펼쳐진다(363차, 펼침과 같은 자리라 직관적) */
  if(!S.tkNew){o.classList.remove('open');c.innerHTML='';c.removeAttribute('style');return;}
  c.innerHTML=taskFormHTML(S.tkNew,null,null);
  o.classList.add('open');
  /* 화면 한가운데 뜨는 모달이 아니라 **업무 추가 버튼에 붙는 팝업**으로 띄운다(327차).
     버튼이 없으면(보류함 등) 오른쪽 위에 붙인다 */
  const b=$('.tkq-add');
  const W=Math.min(720,window.innerWidth-24);
  let top=76,right=16;
  if(b){const r=b.getBoundingClientRect();top=Math.round(r.bottom+8);right=Math.round(window.innerWidth-r.right);}
  /* 아래로 넘치면 위쪽으로 붙인다 — 목록 끝 행을 고쳐도 폼이 화면 밖으로 나가지 않게 */
  const H=Math.min(420,window.innerHeight-32);
  if(top+H>window.innerHeight-12&&b)top=Math.max(12,Math.round(b.getBoundingClientRect().top-H-8));
  c.style.cssText='width:'+W+'px;position:fixed;top:'+top+'px;right:'+Math.max(8,right)+'px;';
}
/* 보고 주기 — 목요일에 시작해 수요일에 끝난다(8/6~8/12 → 8/13~8/19 …).
   업무 현황의 주간 보기가 이 주기를 쓴다 */
const RPT_DOW=4;   /* 보고 주기의 시작 요일 — 목요일(0=일) */
function rptCycle(ds){
  const start=addDays(ds,-((toDate(ds).getDay()-RPT_DOW+7)%7));
  return{start,end:addDays(start,6)};
}
/* ═══ 업무 현황 — 주간 완료·예정 통합(316차) ═══
   보고 주기는 주요 업무의 것을 그대로 물려받았다: 목요일 시작, 수요일 끝(rptCycle).
   기준일(S.tkWeek, 빈 값이면 오늘)이 든 주기가 「완료」, 다음 주기가 「예정」.
   탭은 카드 밖 한 줄로 통합 — 전체 · 공통 업무 · 팀 직급(팀장 등) · 권역들. */
function tkWeekCycles(){
  const cur=rptCycle(S.tkWeek||todayStr());
  return{cur,nxt:rptCycle(addDays(cur.start,7))};
}
/* 탭 적중 판정 — R 은 roster 를 id 로 찾는 맵(항목마다 roster() 를 다시 돌지 않게) */
function tkTabHit(it,tab,R){
  if(!tab)return true;
  const asg=Object.keys(it.assignees||{}).filter(k=>it.assignees[k]);
  if(tab==='team')return !asg.length;
  if(tab.indexOf('reg:')===0){
    const rid=tab.slice(4);
    return asg.some(id=>{const p=R[id];return p&&!isTeamRank(p.rank)
      &&(rid===''?(!p.region||!(S.org.regions||[]).some(r=>r.id===p.region)):p.region===rid);});
  }
  return asg.includes(tab);
}
/* 한 주기의 완료(done=true) 또는 예정(false) 업무 — 모든 가방에서 iid 로 한 번씩.
   두 칸은 **주기로만** 가른다 — 왼쪽은 지난 주기(「완료」), 오른쪽은 다음 주기(「예정」).
   진행 상태는 칸을 정하지 않는다(323차): 왼쪽 칸의 미완료는 연체(빨강) 날짜와 상태 아이콘으로 드러난다.
   기준 날짜만 다르다 — 왼쪽은 종료일(완료일 대용), 오른쪽은 시작일. 기한 없는 업무는 예정 칸에.
   반복은 회차를 펼친다. 보류(st=3)는 보류함이 맡는다. */
function tkCycleItems(from,to,done,tab){
  archNeed(from);   /* 옛 주기를 보면 아카이브도 합친다(384차) */
  const TM=mergedTaskMaps();
  const R={};roster().forEach(p=>{R[p.id]=p;});
  const out=[],seen=new Set();
  Object.keys(TM).forEach(sid=>{
    const m=TM[sid]||{};
    Object.keys(m).forEach(iid=>{
      const it=m[iid];if(!it||seen.has(iid))return;seen.add(iid);
      if(!tkTabHit(it,tab,R))return;
      if(!tkMatch(sid,iid,it))return;
      if(it.recur&&it.recur.f){
        const p=taskAsPlan(sid,iid,it);
        recurDates(p,from,to).forEach(d=>{out.push({sid,iid,it,d});});   /* 회차가 그 주기에 들면 상태와 무관하게 싣는다 */
        return;
      }
      const st=stEff(it);
      if(st===3)return;                                    /* 보류는 보류함이 맡는다 */
      const sD=it.date||'',e=it.end||it.date||'';
      if(!sD){if(!done)out.push({sid,iid,it,d:''});return;} /* 기한 없는 업무는 예정 칸에 */
      /* 완료 칸은 종료일, 예정 칸은 시작일을 기준으로 그 주기에 드는지 본다 —
         진행 상태는 따지지 않는다: 칸 이름은 「지난 주기 / 다음 주기」라는 뜻이고
         상태는 행의 아이콘·연체(빨강) 날짜가 말한다(323차, 사용자 지시) */
      if(done){if(e>=from&&e<=to)out.push({sid,iid,it,d:e});return;}
      if(sD>=from&&sD<=to)out.push({sid,iid,it,d:sD});
    });
  });
  return out.sort((a,b)=>String(a.d||'9999').localeCompare(String(b.d||'9999'))
    ||(a.it.createdAt||0)-(b.it.createdAt||0));
}
/* 업무의 권역 — 담당자의 권역이 기준. 담당자가 없으면 '공통', 팀장·안전·원가는 '팀'.
   ord 는 정렬 차례: 공통(0) → 팀(1) → 권역들(2, 조직에 등록된 순) → 권역 미지정(9) */
function tkRegionOf(it){
  const asg=Object.keys(it.assignees||{}).filter(k=>it.assignees[k]);
  if(!asg.length)return{name:'공통',ord:0};
  const R=roster();
  const p=asg.map(id=>R.find(x=>x.id===id)).filter(Boolean)[0];
  if(!p)return{name:'공통',ord:0};
  if(isTeamRank(p.rank))return{name:'팀',ord:1};
  const regs=(S.org.regions||[]).filter(r=>r.name);
  const i=regs.findIndex(r=>r.id===p.region);
  return i<0?{name:'권역 미지정',ord:9}:{name:regs[i].name,ord:2+i};
}
function tkOwnerName(it){
  const asg=Object.keys(it.assignees||{}).filter(k=>it.assignees[k]);
  if(!asg.length)return '';
  const R=roster();
  return asg.map(id=>(R.find(x=>x.id===id)||{}).name).filter(Boolean).join(', ');
}
/* (stOfRow — wdone 판정 전용이던 함수 — 는 wdone 폐기(520차)와 함께 제거) */
/* 예정 주가 그 달의 몇째 주인지 — 주기 시작(목요일) 날짜로 센다 */
function tkWeekNo(ds){return Math.floor((toDate(ds).getDate()-1)/7)+1;}
/* ── 통합 탭 — 전체 · 공통 · 팀 직급 · 권역(담당자 있는 것만). 주간·월간이 함께 쓴다 ── */
function tkTabsHTML(team,mems,regions,mode){
  const rest=mems.filter(p=>!isTeamRank(p.rank));
  const tabs=[['','전체']];
  /* 월간 업무는 **현장이 주인공**이라 공통·팀장·원가 탭을 두지 않는다 — 권역만 남긴다(326차) */
  if(mode!=='month'){
    const heads=mems.filter(p=>isTeamRank(p.rank))
      .sort((a,b)=>rankOrd(a.rank)-rankOrd(b.rank)||String(a.name).localeCompare(String(b.name),'ko'));
    const rkCnt={};heads.forEach(p=>{const r=rankLabel(p.rank)||'담당';rkCnt[r]=(rkCnt[r]||0)+1;});
    tabs.push(['team','공통 업무']);
    heads.forEach(p=>{const r=rankLabel(p.rank)||'담당';tabs.push([p.id,rkCnt[r]>1?r+' '+p.name:r]);});
  }
  regions.forEach(r=>{if(rest.some(p=>p.region===r.id))tabs.push(['reg:'+r.id,r.name]);});
  if(mode!=='month'&&regionMembers(rest,regions,'').length)tabs.push(['reg:','권역 미지정']);
  if(!tabs.some(t=>t[0]===S.tkTab))S.tkTab='';
  /* ⚠ 탭마다 전체 업무를 다시 훑으면 탭 수만큼 순회가 늘어난다(400건·탭 8개 = 19회 순회, 346차 실측).
     전체 탭 목록을 한 번만 훑어 건수를 한꺼번에 센다 */
  const{cur,nxt}=tkWeekCycles();
  const ids=tabs.map(x=>x[0]);
  const tally={};ids.forEach(id=>{tally[id]=0;});
  const R={};roster().forEach(p=>{R[p.id]=p;});
  const bump=it=>ids.forEach(id=>{if(tkTabHit(it,id,R))tally[id]++;});
  if(mode==='hold')holdItems().forEach(x=>bump(x.it));
  else if(mode==='month')tkMonthItems('').forEach(x=>bump(x.it));
  else{tkCycleItems(cur.start,cur.end,true,'').forEach(x=>bump(x.it));
       tkCycleItems(nxt.start,nxt.end,false,'').forEach(x=>bump(x.it));}
  const cnt=t=>tally[t]||0;
  return '<div class="tkbar"><div class="rp-tabs tkm-tabs tkbar-tabs" data-sbx>'+tabs.map(([id,nm])=>
    '<button class="rp-tab'+(id===S.tkTab?' on':'')+'" data-act="tk.tab" data-id="'+esc(id)+'">'
    +esc(nm)+'<span class="rp-tcnt">'+cnt(id)+'</span></button>').join('')
    +'</div><button class="btn bo bsm tkq-add" data-act="tk.newOpen" aria-label="업무 추가" data-tip="업무 추가"><svg class="icn"><use href="#i-plus"></use></svg></button></div>';
}
/* 첫 데이터를 기다리는 동안의 뼈대 — 곧 나타날 표와 같은 자리·같은 높이로 둔다.
   ⚠ 빈 화면을 보여 주면 "없는 것"으로 읽힌다 — 기다리는 중임을 형태로 알린다(348차) */
function tkSkelHTML(){
  const rows=n=>Array.from({length:n},()=>'<div class="skel-row"><i style="width:34px"></i><i style="width:44px"></i><i class="g"></i><i style="width:32px"></i></div>').join('');
  const col=nm=>`<section class="tkwk-col">
      <div class="tkwk-h"><b>${nm}</b></div>
      <div class="tk-list"><div class="skel">${rows(7)}</div></div>
    </section>`;
  return `<div class="tkbar"><div class="rp-tabs tkm-tabs tkbar-tabs" data-sbx>
      <button class="rp-tab on">불러오는 중<span class="rp-tcnt">·</span></button></div></div>
    <div class="card tkmain tkwk"><div class="tkwk-cols">${col('완료')}${col('예정')}</div></div>`;
}
function tkWeekHTML(team,mems,regions){
  const{cur,nxt}=tkWeekCycles();
  const short=(a,b)=>{const A=toDate(a),B=toDate(b);
    return (A.getMonth()+1)+'/'+A.getDate()+' ~ '+(A.getMonth()===B.getMonth()?'':(B.getMonth()+1)+'/')+B.getDate();};
  /* ── 완료 | 예정 두 칸 — 한 카드 안에서 가운데 선으로 나눈다 ── */
  const panel=(done,cy)=>{
    const list=tkCycleItems(cy.start,cy.end,done,S.tkTab);
    const base={site:list.some(x=>x.it.site),
      who:S.tkTab===''||S.tkTab==='team'||S.tkTab.indexOf('reg:')===0};   /* 개인 탭은 이름이 겹말 */
    if(S.tkTab==='team')base.who=false;                                   /* 공통 탭은 전부 '공통' */
    /* 권역 → 이름 → 날짜 순으로 세운다 */
    /* ⚠ 비교자 안에서 권역·이름을 구하면 정렬 한 번에 수천 번 다시 계산된다 — 미리 한 번씩 붙여 둔다(346차) */
    list.forEach(x=>{const r=tkRegionOf(x.it);x._ro=r.ord;x._rn=r.name;x._wn=tkOwnerName(x.it);});
    list.sort((a,b)=>a._ro-b._ro||a._rn.localeCompare(b._rn,'ko')
      ||a._wn.localeCompare(b._wn,'ko')
      ||String(a.d||'9999').localeCompare(String(b.d||'9999'))
      ||(a.it.createdAt||0)-(b.it.createdAt||0));
    /* 권역은 순서대로 서 있으니 **표의 병합 셀처럼** 낸다 — 묶음 첫 행에만 적고,
       이어지는 행의 구분선은 권역 칸을 지나가지 않는다(325차) */
    /* (337차의 wdone — 이름 묶음 전체 완료 시 이름을 옅게 — 는 520차에 폐기. 완료 표시는 업무명만) */
    let pr=null,pw=null;
    const rows=list.map(x=>{
      const rn=x._rn,wn=x._wn;
      const grp=rn!==pr,gw=!grp&&wn===pw;   /* 권역이 같고 이름도 같으면 이름 칸까지 이어진 것으로 본다 */
      pr=rn;pw=wn;
      return taskItemHTML(x.sid,x.iid,x.it,false,'',
        {...base,regLabel:grp?rn:'',grp,gw},x.d||'');
    }).join('');
    const cols=base;
    return `<section class="tkwk-col">
      <div class="tkwk-h"><b>${done?'완료':'예정'}</b><span class="tkwk-period">${esc(short(cy.start,cy.end))}</span><span class="c">${list.length}</span></div>
      <div class="tk-list">
        ${rows?'<div class="tkl '+tkListCls(cols)+'">'+tkHeadRowHTML(cols)+rows+'</div>'
          :'<div class="tk-empty">'+(done?'이 주기에 마감된 업무가 없습니다.':'다음 주기에 잡힌 업무가 없습니다.')+'</div>'}
      </div>
    </section>`;
  };
  return `${tkTabsHTML(team,mems,regions)}
    <div class="card tkmain tkwk">
      <div class="tkwk-cols">${panel(true,cur)}${panel(false,nxt)}</div>
    </div>`;
}
/* ═══ 현장별 업무 — 고른 달의 업무를 현장마다 따로 묶어 본다(325차, 334차 이름 변경) ═══
   달은 작은 달력이 보는 달(S.mineYm)을 따른다. 탭·검색·필터는 주간 업무와 같은 것을 쓴다.
   ⚠ 날짜 없는 업무는 달에 걸 수 없어 빠진다 — 그런 업무는 주간 업무의 예정 칸에서 본다. */
/* 고른 달(작은 달력이 보는 달)에 걸치는 업무 — 탭 건수와 본문이 함께 쓴다 */
function tkMonthItems(tab){
  const ym=(S.mineYm||todayStr().slice(0,7)+'-01').slice(0,7);
  const from=ym+'-01',to=ym+'-'+pad(new Date(Number(ym.slice(0,4)),Number(ym.slice(5,7)),0).getDate());
  archNeed(from);   /* 옛 달을 보면 아카이브도 합친다(384차) */
  const TM=mergedTaskMaps();
  const R={};roster().forEach(p=>{R[p.id]=p;});
  const items=[],seen=new Set();
  Object.keys(TM).forEach(sid=>{
    const m=TM[sid]||{};
    Object.keys(m).forEach(iid=>{
      const it=m[iid];if(!it||!it.date||seen.has(iid))return;
      if(!tkTabHit(it,tab,R)||!tkMatch(sid,iid,it))return;
      if(stEff(it)===3)return;
      if(it.recur&&it.recur.f){
        const p=taskAsPlan(sid,iid,it);
        recurDates(p,from,to).forEach(d=>items.push({sid,iid,it,d}));
        seen.add(iid);return;
      }
      const a=it.date,e=it.end||it.date;
      if(a<=to&&e>=from){items.push({sid,iid,it,d:a});seen.add(iid);}
    });
  });
  /* 현장이 없는 업무는 이 화면의 대상이 아니다 — 탭 건수도 본문과 같은 기준이어야 한다(327차) */
  const sids=new Set((S.org.sites||[]).filter(x=>x.name).map(x=>x.id));
  return items.filter(x=>x.it.site&&sids.has(x.it.site));
}
function tkMonthHTML(team,mems,regions){
  const items=tkMonthItems(S.tkTab);
  /* 현장별 묶음 — 조직에 등록된 차례대로, 현장 없는 업무는 맨 아래 '현장 미지정' */
  const sites=(S.org.sites||[]).filter(x=>x.name);
  const regs=(S.org.regions||[]).filter(r=>r.name);
  const groups=[];
  /* 권역은 표에 열로 넣지 않는다 — 현장은 한 권역에 속하므로 **칸 머리에 배지 하나**면 충분하다(336차) */
  const ord=st=>{const i=regs.findIndex(r=>r.id===st.region);return i<0?99:i;};
  [...sites].sort((a,b)=>ord(a)-ord(b)).forEach(st=>{
    const list=items.filter(x=>x.it.site===st.id);
    if(list.length)groups.push([st.name,list,(regs.find(r=>r.id===st.region)||{}).name||'']);
  });
  /* 현장 없는 업무(공통·행정 등)는 월간에서 빼둔다 — 이 화면은 현장이 주인공이다(327차) */

  /* 현장은 묶음 머리가, 권역은 그 현장이 이미 말한다(현장은 한 권역에 속한다) — 두 열 모두 뺀다 */
  const cols={site:false,who:true,noReg:true};
  const body=groups.map(([nm,list,rgName])=>{
    list.sort((a,b)=>tkOwnerName(a.it).localeCompare(tkOwnerName(b.it),'ko')
      ||String(a.d||'9999').localeCompare(String(b.d||'9999')));
    let pw=null;
    const rows=list.map(x=>{
      const wn=tkOwnerName(x.it),gw=wn===pw;pw=wn;
      return taskItemHTML(x.sid,x.iid,x.it,false,'',{...cols,gw},x.d||'');
    }).join('');
    return '<div class="tkmo-g"><div class="tkmo-h">'+esc(nm)
      +(rgName?'<span class="rg">'+esc(rgName)+'</span>':'')
      +'<span class="c">'+list.length+'</span></div>'
      +'<div class="tkl '+tkListCls(cols)+'">'+tkHeadRowHTML(cols)+rows+'</div></div>';
  }).join('');
  /* ⚠ 현장 칸이 이미 저마다 카드다 — 바깥에 큰 카드를 한 겹 더 씌우지 않는다(334차) */
  return `${tkTabsHTML(team,mems,regions,'month')}
    <div class="tkmo-list">${body||'<div class="card tk-empty">이 달에 잡힌 현장 업무가 없습니다.<br>작은 달력의 ‹ › 로 다른 달을 보세요.</div>'}</div>`;
}
/* 업무로 이동 — 검색·내 업무·달력에서 공통으로 쓰고, 모달 없이 인라인으로 펼친다 */
function gotoTask(sid,iid){
  nqOpen(false);closeModal();
  const isTeam=(S.org.teams||[]).some(t=>t.id===sid);
  if(!isTeam){const p=roster().find(x=>x.id===sid);if(p&&p.team)S.tk.t=p.team;}
  else S.tk.t=sid;
  S.tk.m='teamall';S.tkTab='';   /* 통합 화면 전체 탭에서 연다 */
  /* 그 업무가 든 주기가 화면에 오도록 기준 주를 맞춘다 —
     완료면 종료일 주기가 「완료」 칸, 미완료면 시작일 주기가 「예정」 칸(기준 주는 그 한 주 전) */
  const it=(S.tasks[sid]||{})[iid];
  if(it&&!(it.recur&&it.recur.f)){
    const sD=it.date||'',e=it.end||it.date||'';
    if(stEff(it)===2){if(e)S.tkWeek=e;}
    else if(sD){const nx=rptCycle(addDays(rptCycle(todayStr()).start,7));
      S.tkWeek=(sD>nx.end)?addDays(sD,-7):'';}   /* 기본 화면에 이미 보이면 오늘 주기 그대로 */
    else S.tkWeek='';
  }else S.tkWeek='';
  S.tkNew=null;S.tkEdit=null;
  go('tasks');
  /* ⚠ go() 가 화면 전환 때 tkOpen 을 접는다 — 펼침 지정은 반드시 그 뒤에 */
  S.tkOpen=sid+'/'+iid;rTasks();
  setTimeout(()=>{const el=document.querySelector('.tk-item[data-iid="'+iid+'"]');
    if(el)el.scrollIntoView({block:'center',behavior:'smooth'});},80);
}

/* ═══════════ 찾기 — 업무·현장·하자를 한 번에 ═══════════ */
/* 457차: 헤더 검색창 → 기존 검색 패널(nqQ)로 값을 넘긴다.
   패널 안 입력은 그대로 두고(위젯·모바일에서 쓴다) 헤더에서 친 값만 흘려보낸다. */
let nqFromHdr=false;
function ahSrchSync(v){
  const wrap=$('#ahSrch');if(wrap)wrap.classList.toggle('has',!!String(v||'').trim());
  const q=$('#nqQ');if(q)q.value=v;
  nqFromHdr=true;
  if(String(v||'').trim()){ if(!$('#nqPanel').classList.contains('on'))nqOpen(true); rNq(); }
  else nqOpen(false);
  nqFromHdr=false;
}
function nqOpen(on){
  const p=$('#nqPanel');if(!p)return;  p.classList.toggle('on',!!on);
  p.setAttribute('aria-hidden',on?'false':'true');  if(on&&!nqFromHdr)setTimeout(()=>{const q=$('#nqQ');if(q){q.focus();q.select();}},60);   /* 457차: 헤더에서 칠 땐 포커스를 빼앗지 않는다 */
}
function nqMark(text,q){
  const t=String(text||'');
  const i=t.toLowerCase().indexOf(q.toLowerCase());
  if(i<0)return esc(t.slice(0,80));
  return esc(t.slice(Math.max(0,i-24),i))+'<mark>'+esc(t.substr(i,q.length))+'</mark>'+esc(t.substr(i+q.length,50));
}
function nqSearch(q){
  const out={tasks:[],sites:[],defects:[]};
  if(q.length<1)return out;
  archNeed();   /* 찾기는 옛 업무까지 — 읽히면 rNq 가 다시 그린다(384차) */
  const lo=q.toLowerCase(),hit=v=>String(v||'').toLowerCase().includes(lo);
  const TM=mergedTaskMaps();
  Object.keys(TM).forEach(sid=>{
    const m=TM[sid]||{};
    Object.keys(m).forEach(iid=>{
      const it=m[iid];if(!it)return;
      if(hit(it.text)||hit(it.body)||hit(it.prog)||hit(it.plan)||hit(siteName(it.site)))out.tasks.push({sid,iid,it});
    });
  });
  (S.org.sites||[]).forEach(s=>{if(hit(s.name))out.sites.push(s);});
  /* 하자 건 찾기는 rNq 의 자연어 해석(NLQ · 생산자 ④)으로 옮겼다(614차) — 이전에는 '이미 불러온'
     목록만 훑어서 현장을 열기 전엔 안 찾혔다. 지금은 전 현장 미처리 목록을 조건으로 거른다. */
  return out;
}
function subjName(sid){
  const t=(S.org.teams||[]).find(x=>x.id===sid);
  if(t)return t.name+' 공통 업무';
  const p=roster().find(x=>x.id===sid);
  return p?p.name:'';
}
function rNq(){
  const box=$('#nqRes'),q=($('#nqQ')&&$('#nqQ').value||'').trim();
  if(!box)return;
  if(!q){paintHTML(box,'<div class="nq-empty">업무 제목·진행경과·처리계획, 현장, 하자에서 찾습니다.</div>');return;}   /* ⚠ 615차: innerHTML 직접 대입은 paintHTML 서명과 어긋나 다음 렌더가 건너뛰어진다 */
  const r=nqSearch(q);
  /* 하자 절 — 자연어 해석(원본 NLQ · 생산자 ④): 현장·공종·지연·동호·공가를 조건 칩으로 풀고
     전 현장 미처리 목록에서 거른다. 뷰어는 첫 사용 때 목록을 받아 둔다(dfNqWarm). */
  let dRows=[],dChips=[],dR=null,dNote='';
  try{
    const {R}=nlqParse(q,nlqDict());dR=R;
    dRows=nlqApply(dfNqRawRows(),R);
    dChips=nlqChips(R);
    if(_dfNqWarm===1)dNote='전 현장 하자 목록 받는 중… ('+_dfNqWarmProg[0]+'/'+_dfNqWarmProg[1]+' 현장) — 받는 대로 결과가 늘어납니다';
    else if(!dRows.length&&_dfNqWarm===0)dfNqWarm();   /* 뷰어 첫 사용 — 받아지면 rNq 를 다시 부른다 */
    window.__DFNQ=dRows.length?{q,R,n:dRows.length}:null;
  }catch(e){console.warn('nlq',e);window.__DFNQ=null;}
  const total=r.tasks.length+r.sites.length+dRows.length;
  if(!total&&!dNote){paintHTML(box,'<div class="nq-empty">"'+esc(q)+'" 에 해당하는 결과가 없습니다.</div>');return;}   /* ⚠ 615차: 같은 이유 — 직접 대입 뒤 같은 질의 재입력 시 결과가 안 돌아오던 버그 */
  const item=(icon,tt,sb,attrs)=>`<div class="nq-item" ${attrs}>
    <span class="ic"><svg class="icn"><use href="#${icon}"></use></svg></span>
    <div style="min-width:0"><div class="tt">${tt}</div><div class="sb">${esc(sb)}</div></div></div>`;
  const chipsHTML=dChips.length?'<div style="display:flex;flex-wrap:wrap;gap:4px;padding:4px 10px 2px">'+dChips.map(c=>'<span class="nq-chip">'+esc(c[0])+' · '+esc(c[1])+'</span>').join('')+'</div>':'';   /* ⚠ .ba 는 #view-defect 스코프 — 패널 전용 칩 클래스(615차) */
  paintHTML(box,
    (r.tasks.length?'<div class="nq-g">업무 '+r.tasks.length+'</div>'+r.tasks.slice(0,20).map(({sid,iid,it})=>
      item('i-tasks',nqMark(it.text,q),
        subjName(sid)+(it.date?' · '+it.date+(it.end&&it.end!==it.date?'~'+it.end:''):''),
        'data-act="nq.task" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'" data-date="'+esc(it.date||'')+'"')).join(''):'')
    +(r.sites.length?'<div class="nq-g">하자처리 현황 · 현장 '+r.sites.length+'</div>'+r.sites.slice(0,10).map(s=>
      item('i-defect',nqMark(s.name,q),'하자처리 현황 보기',
        'data-act="nq.site" data-sid="'+esc(s.id)+'"')).join(''):'')
    +(dRows.length||dNote?'<div class="nq-g">하자 '+(dRows.length?dRows.length.toLocaleString():'')+'</div>'+chipsHTML
      +(dNote?'<div class="nq-empty">'+esc(dNote)+'</div>':'')
      +dRows.slice(0,12).map(x=>
        item('i-defect',nqMark([x.trade,x.defectType,x.receiptContent].filter(Boolean).join(' · '),q),
          (x.siteName||'')+' · '+[x.building,x.unit].filter(Boolean).join('-')+' · 지연 '+(Number(x.delayDays)||0)+'일',
          'data-act="nq.list"')).join('')
      +(dRows.length?item('i-defect','전체 목록으로 보기','조건 그대로 미처리 목록 창을 엽니다 · '+dRows.length.toLocaleString()+'건','data-act="nq.list"'):''):''));
}

/* ═══════════ 하자 데이터 생산·집계 — 현재 앱의 단일 처리 경로 ═══════════
   HCS 업로드 → 로컬 원본 보관 → 집계 → 게시본 생성까지 이 앱이 직접 처리한다.
   집계 결과는 게시본 KPI·추이·목록의 공통 기준이며, 임의 수정 시 회귀 게이트를 함께 갱신한다.
   원본 행은 S.def[sid] 에 보관하고 캐시 무효화는 S.def Proxy 가 담당한다. */
/* 게시 기준월 — 원본 규칙과 동일하게 자동 전월(pM(todayYM())), 나중에 게시 UI에서 조정한다(3단계) */
function dfPubRm(){return S.dfPubRm||pM(todayYM());}
S.def={};S.defVer=0;   /* 원본 하자 행(현장별)·계산 캐시 세대 — report S 와 같은 자리 */
const _calcCache=new Map();
function pM(ym){const[y,m]=ym.split('-').map(Number);return m===1?`${y-1}-12`:`${y}-${String(m-1).padStart(2,'0')}`;}
function todayYM(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
/* 중대하자 키워드 규칙(CRIT_DEF) — ruleVal 로 읽는다 */
// 중대하자 의심 추출 규칙 기본값 — critReason이 critKwRegex/critLongLen으로 참조. 쉼표 구분, 키워드 내 공백은 \s*로 완화(띄어쓰기 유무 모두 매칭).
const CRIT_DEF=[
 {id:'c_leak',t:'누수·침수 키워드',d:'누수, 침수, 누유, 역류',hint:'하자유형+접수내용 대상 · 부정문맥 필터 적용'},
 {id:'c_ev1',t:'엘리베이터 대상어',d:'엘리베이터, 엘베, 승강기, EV',hint:'아래 상태어와 접수내용에 함께 있을 때만 의심'},
 {id:'c_ev2',t:'엘리베이터 상태어',d:'갇힘, 갇혔, 멈춤, 정지, 고장, 추락'},
 {id:'c_evict',t:'퇴거·거주불가 키워드',d:'퇴거, 이주, 이사, 숙박, 호텔, 거주 불가, 입주 불가',hint:'부정문맥 필터 적용'},
 {id:'c_media',t:'언론리스크 키워드',d:'언론, 기자, 방송, 뉴스, 제보, 보도'},
 {id:'c_legal',t:'피해보상·법적 키워드',d:'피해, 보상, 배상, 변상, 손해, 소송, 법무, 내용증명, 고소, 고발'},
 {id:'c_long',t:'장문민원 기준(공백 제외 글자수)',d:'80',num:true},
];
let _critRxCache={}; // 정규식 캐시(규칙이 고정이라 무효화 불필요)
function _ruleFind(id){for(const r of CRIT_DEF)if(r.id===id)return r;return null;}   /* 중대하자 키워드(CRIT_DEF) 조회 */
function ruleVal(id){const r=_ruleFind(id);return r?r.d:'';}
function critKwRegex(id,flags){const k=id+'|'+(flags||'');if(k in _critRxCache)return _critRxCache[k];const v=String(ruleVal(id)||'').split(',').map(x=>x.trim()).filter(Boolean);let rx=null;if(v.length){try{rx=new RegExp(v.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s*')).join('|'),flags||'');}catch(e){rx=null;}}_critRxCache[k]=rx;return rx;}
function critLongLen(){const n=parseInt(ruleVal('c_long'),10);return (isFinite(n)&&n>0)?n:80;}
function critReason(i){
  const c=((i.receiptContent||'')+' '+(i.complaint||''));
  const t=((i.defectType||'')+' '+(i.trade||''));
  const tags=[];
  // 부정·해소 절 필터: 위험어가 속한 절(다음 구두점까지, 최대 20자) 안에 부정/해소어(없음·정상·해결 등)만
  //   있고 위험 확정 문맥이 아니면 그 매치는 무효. 모든 매치가 부정 문맥이면 신호 제외(오탐 제거).
  //   위험어가 부정 없이 한 번이라도 등장하면 채택(recall 보존).
  const NEG=/없|아니|아님|無|해결|정상|이상\s*무|단순\s*문의|해당\s*무/;
  const hasHazard=(re,text)=>{
    const g=new RegExp(re.source,re.flags.replace('g','')+'g');let m;
    while((m=g.exec(text))){
      const clause=text.slice(m.index,m.index+20).split(/[,.\n·;]/)[0];
      if(!NEG.test(clause.slice(m[0].length)))return true;
    }
    return false;
  };
  if(i.criticalType&&String(i.criticalType).trim())tags.push('유형기재');
  {const rx=critKwRegex('c_leak');if(rx&&hasHazard(rx,t+' '+c))tags.push('누수침수');}
  {const r1=critKwRegex('c_ev1','i'),r2=critKwRegex('c_ev2');if(r1&&r2&&r1.test(c)&&r2.test(c))tags.push('엘리베이터');}
  {const rx=critKwRegex('c_evict');if(rx&&hasHazard(rx,c))tags.push('퇴거거주불가');}
  {const rx=critKwRegex('c_media');if(rx&&rx.test(c))tags.push('언론리스크');}
  {const rx=critKwRegex('c_legal');if(rx&&rx.test(c))tags.push('피해보상법적');}
  if((i.receiptContent||'').replace(/\s+/g,'').length>=critLongLen())tags.push('장문민원');
  return tags;
}
function wk(d){if(!d)return null;const m=String(d).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(!m)return null;const dt=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));if(isNaN(dt))return null;const sunOff=(7-dt.getUTCDay())%7;const sun=new Date(dt.getTime()+sunOff*86400000);return `${sun.getUTCFullYear()}-${String(sun.getUTCMonth()+1).padStart(2,'0')}-${String(sun.getUTCDate()).padStart(2,'0')}`;}
function isCritCandidate(i){return critReason(i).length>0;}
function topT(items,n){
  const m={};
  items.forEach(i=>{const k=i.trade||'기타';if(!m[k])m[k]={c:0,co:{}};m[k].c++;const co=i.contractor||'';if(co)m[k].co[co]=(m[k].co[co]||0)+1;});
  const s=Object.entries(m).sort((a,b)=>b[1].c-a[1].c);
  const top=s.slice(0,n).map(([t,v])=>{const coEntries=Object.entries(v.co).sort((a,b)=>b[1]-a[1]);return{t,c:v.c,co:coEntries[0]?.[0]||'-',coN:coEntries.length};});
  const oth=s.slice(n).reduce((a,[,v])=>a+v.c,0),tot=s.reduce((a,[,v])=>a+v.c,0);
  // 기타(6위~끝) 묶음의 고유 시공업체 집합
  const othCo={};s.slice(n).forEach(([,v])=>{Object.keys(v.co).forEach(c=>{othCo[c]=true;});});
  if(oth>0)top.push({t:'기타',c:oth,isO:true,coN:Object.keys(othCo).length,keys:s.slice(n).map(([k])=>k)});
  top.push({t:'계',c:tot,isT:true});
  return top;
}
function calcW(items,rmEnd,pmEnd){
  // 각 주차 일요일 cutoff 기준 역산. 지연구간(d0/d30/d60) 분해를 diff-array로 O(N·logW+W)에 계산.
  // (구버전 O(주차×건수) 재순회 대체 — 동일 입력 BIT-EXACT 일치 검증 완료)
  const DAY=86400000;
  const cutSet={};
  for(const i of items){const k=wk(i.receiptDate);if(k)cutSet[k]=true;}
  // 월말 컷 추가: 월별 표의 각 월 값이 '월 마지막 일요일'이 아닌 '월말일' 기준이 되도록.
  // KPI(unr=접수≤월말−처리≤월말)·도넛·추이차트 종점(refLim)과 동일 수식으로 정렬된다. 일요일 컷 값들은 불변.
  const _me=ym=>{const[y,m]=ym.split('-').map(Number);cutSet[`${ym}-${String(new Date(y,m,0).getDate()).padStart(2,'0')}`]=true;};
  for(const i of items){const rd=i.receiptDate;if(rd&&/^\d{4}-\d{2}/.test(rd))_me(rd.slice(0,7));}
  if(rmEnd)cutSet[rmEnd]=true;
  if(pmEnd)cutSet[pmEnd]=true;
  const cuts=Object.keys(cutSet).sort();const W=cuts.length;if(!W)return[];
  const cutMs=cuts.map(c=>new Date(c).getTime());
  const byReceipt=items.filter(i=>i.receiptDate).slice().sort((a,b)=>a.receiptDate<b.receiptDate?-1:a.receiptDate>b.receiptDate?1:0);
  const doneSorted=byReceipt.filter(i=>i.status==='처리'&&i.completionDate).map(i=>i.completionDate).sort();
  // 누적 접수 r / 누적 처리 res — 포인터(문자열 비교, 구버전과 동일)
  const rArr=new Array(W),resArr=new Array(W);
  {let rPtr=0,resPtr=0;for(let c=0;c<W;c++){const cutoff=cuts[c];
    while(rPtr<byReceipt.length&&byReceipt[rPtr].receiptDate<=cutoff)rPtr++;rArr[c]=rPtr;
    while(resPtr<doneSorted.length&&doneSorted[resPtr]<=cutoff)resPtr++;resArr[c]=resPtr;}}
  // cutMs 오름차순 → lowerBound(첫 c: cutMs[c]>=v)
  const lb=v=>{let lo=0,hi=W;while(lo<hi){const mid=(lo+hi)>>1;if(cutMs[mid]>=v)hi=mid;else lo=mid+1;}return lo;};
  const D0=new Float64Array(W+1),D30=new Float64Array(W+1),D60=new Float64Array(W+1);
  const addRange=(D,a,b)=>{if(a<b){D[a]++;D[b]--;}};
  for(const it of byReceipt){
    const rcMs=new Date(it.receiptDate).getTime();
    const enter=lb(rcMs);                                   // 접수<=cutoff 최초 주차
    const done=it.status==='처리'&&it.completionDate;
    const end=Math.min(done?lb(new Date(it.completionDate).getTime()):W,W); // 완료<=cutoff 이후 제외
    if(enter>=end)continue;
    const i30=lb(rcMs+30*DAY),i60=lb(rcMs+60*DAY);          // 경과 30·60일 도달 주차
    addRange(D0,enter,Math.min(i30,end));
    addRange(D30,Math.max(i30,enter),Math.min(i60,end));
    addRange(D60,Math.max(i60,enter),end);
  }
  let a0=0,a30=0,a60=0;const arr=[];
  for(let c=0;c<W;c++){a0+=D0[c];a30+=D30[c];a60+=D60[c];
    arr.push({week:cuts[c],r:rArr[c],res:resArr[c],u:rArr[c]-resArr[c],d0:a0,d30:a30,d60:a60});}
  // M월 Nw주 — 같은 달 내 누적 주 번호 (월 바뀌면 1로 리셋). 일요일 컷만 주번호를 증가시키고,
  // 월말(비일요일) 컷은 'M월 말' 라벨 + sun:false — 월별 표 전용 스냅샷임을 표시(주차별 표는 sun 컷만 표시).
  let lastM=null,wInM=0;
  arr.forEach(r=>{const m=Number(r.week.slice(5,7));r.m=m;
    const isSun=new Date(r.week).getUTCDay()===0;r.sun=isSun;
    if(m!==lastM){wInM=0;lastM=m;}
    if(isSun){wInM++;r.wn=wInM;r.label=`${m}월 ${wInM}주`;}
    else{r.wn=wInM;r.label=`${m}월 말`;}
  });
  return arr;
}
function calcMo(items){const m={};items.forEach(i=>{const k=(i.receiptDate||'').slice(0,7);if(!k)return;if(!m[k])m[k]={month:k,r:0,res:0,u:0};m[k].r++;const done=i.status==='처리'&&i.completionDate;if(done)m[k].res++;else m[k].u++;});return Object.values(m).sort((a,b)=>a.month.localeCompare(b.month));}
function _calcImpl(items,site,rm){
  const pm=pM(rm),all=items.filter(i=>i.receiptDate);
  // 전월 말일 문자열 (ex. "2026-04-30") — 역산 기준일
  const pmParts=pm.split('-').map(Number);
  const pmLastDay=new Date(pmParts[0],pmParts[1],0).getDate();
  const pmEnd=`${pm}-${String(pmLastDay).padStart(2,'0')}`;
  // 금월 말일 문자열
  const rmParts=rm.split('-').map(Number);
  const rmLastDay=new Date(rmParts[0],rmParts[1],0).getDate();
  const rmEnd=`${rm}-${String(rmLastDay).padStart(2,'0')}`;

  // 미처리 통일 기준: 접수일<=cutoff & (status가 미처리 또는 완료일이 cutoff 이후) → 미처리
  // 처리로 간주: status==='처리' AND 완료일<=cutoff. (status 미처리는 무조건 미처리)
  const isDone=(i,cutoff)=>i.status==='처리'&&i.completionDate&&i.completionDate<=cutoff;

  // 금월 기준: 접수일 <= 금월말
  const ref=all.filter(i=>i.receiptDate<=rmEnd);
  const tR=ref.length;
  const res=ref.filter(i=>isDone(i,rmEnd)).length;
  const unr=tR-res;
  const rate=tR>0?res/tR*100:0;
  // 금월 기준 미처리 목록
  const ul=ref.filter(i=>!isDone(i,rmEnd));
  // 지연일 역산: 기준일 - 접수일 (단, 원본 delayDays가 있으면 보조로만 활용)
  const daysBetween=(a,b)=>{const da=new Date(a),db=new Date(b);return Math.max(0,Math.round((db-da)/86400000));};
  const d0=ul.filter(i=>{const dd=daysBetween(i.receiptDate,rmEnd);return dd<30;}).length;
  const d30=ul.filter(i=>{const dd=daysBetween(i.receiptDate,rmEnd);return dd>=30&&dd<60;}).length;
  const d60=ul.filter(i=>{const dd=daysBetween(i.receiptDate,rmEnd);return dd>=60;}).length;
  const lt=d30+d60;
  const ltr=unr>0?lt/unr*100:0;
  const top=topT(ul,5);
  // 금월 장기미처리(30일+) 목록 및 TOP5 — 장기미처리 탭 상위5 표용
  const lul=ul.filter(i=>daysBetween(i.receiptDate,rmEnd)>=30);
  const topLt=topT(lul,5);

  // 전월 기준 역산: 접수일 <= 전월말
  const prev=all.filter(i=>i.receiptDate<=pmEnd);
  const pT=prev.length;
  const pRes=prev.filter(i=>isDone(i,pmEnd)).length;
  const pUnr=pT-pRes;
  const pRate=pT>0?pRes/pT*100:0;
  const ulPrev=prev.filter(i=>!isDone(i,pmEnd));
  const pd0=ulPrev.filter(i=>{const dd=daysBetween(i.receiptDate,pmEnd);return dd<30;}).length;
  const pd30=ulPrev.filter(i=>{const dd=daysBetween(i.receiptDate,pmEnd);return dd>=30&&dd<60;}).length;
  const pd60=ulPrev.filter(i=>{const dd=daysBetween(i.receiptDate,pmEnd);return dd>=60;}).length;
  const pLt=pd30+pd60;
  const pLtr=pUnr>0?pLt/pUnr*100:0;

  // 전월 공종별 미처리 맵 — 증감 계산용
  const topPrev={};ulPrev.forEach(i=>{const k=i.trade||'기타';topPrev[k]=(topPrev[k]||0)+1;});
  // 전월 공종별 장기미처리(30일+) 맵 — 장기미처리 탭 증감 계산용
  const lulPrev=ulPrev.filter(i=>daysBetween(i.receiptDate,pmEnd)>=30);
  const topLtPrev={};lulPrev.forEach(i=>{const k=i.trade||'기타';topLtPrev[k]=(topLtPrev[k]||0)+1;});

  // 공가 — 세대/상가 개별 집계
  const _buildVac=(set,pset)=>{
    const ul=set.filter(i=>!isDone(i,rmEnd));
    const T=set.length,Unr=ul.length,Res=T-Unr,Rate=T>0?Res/T*100:0,Top=topT(ul,5);
    const Lt=ul.filter(i=>daysBetween(i.receiptDate,rmEnd)>=30).length;
    const _us=new Set(set.map(i=>`${i.building||''}-${i.unit||''}`));_us.delete('-');const Units=_us.size;
    const TopPrev={};pset.filter(i=>!isDone(i,pmEnd)).forEach(i=>{const k=i.trade||'기타';TopPrev[k]=(TopPrev[k]||0)+1;});
    return{T,Res,Unr,Rate,Lt,Units,Top,TopPrev};
  };
  const vacU=_buildVac(ref.filter(i=>isVacUnit(i)),prev.filter(i=>isVacUnit(i)));     // 공가세대
  const vacS=_buildVac(ref.filter(i=>isVacStore(i,site)),prev.filter(i=>isVacStore(i,site))); // 공가상가
  // 레거시 평면 필드(vT 등)는 세대 기준으로 매핑(호환)
  const vT=vacU.T,vRes=vacU.Res,vUnr=vacU.Unr,vRate=vacU.Rate,vLt=vacU.Lt,vUnits=vacU.Units,vTop=vacU.Top,vTopPrev=vacU.TopPrev;

  const rpb={};ul.forEach(i=>{rpb[i.repairParty||'미지정']=(rpb[i.repairParty||'미지정']||0)+1;});
  const dtb={};ul.forEach(i=>{dtb[i.defectType||'미분류']=(dtb[i.defectType||'미분류']||0)+1;});
  // 중대하자 "의심" 후보 — isCritCandidate(규칙: 매뉴얼 키워드+피해보상+장문)로 추출.
  const _critAll=ref.filter(isCritCandidate);
  const critT=_critAll.length;
  const critUl=_critAll.filter(i=>!isDone(i,rmEnd));
  const critUnr=critUl.length;
  const critPrevUnr=prev.filter(i=>isCritCandidate(i)&&!isDone(i,pmEnd)).length;
  // 공종별 전체 처리현황 집계(trAgg) — 현장 화면 표의 단일 출처. 게시 kpi에 실려 뷰어·스냅샷도 동일 표를 본다.
  //   (기존에는 rSite가 로컬 원본으로 직접 재계산 → 원본이 없는 뷰어에서 표가 비는 문제)
  const _trm={};
  for(const i of all){
    if(i.receiptDate>rmEnd)continue;
    const t=i.trade||'기타';
    const o=_trm[t]||(_trm[t]={t,r:0,res:0,u:0,lt:0,d0:0,d30:0,d60:0,co:{},pu:0,plt:0});
    o.r++;
    const done=i.status==='처리'&&i.completionDate&&i.completionDate<=rmEnd;
    if(done)o.res++;else{o.u++;const dd=daysBetween(i.receiptDate,rmEnd);if(dd>=60){o.d60++;o.lt++;}else if(dd>=30){o.d30++;o.lt++;}else o.d0++;}
    if(i.contractor)o.co[i.contractor]=(o.co[i.contractor]||0)+1;
  }
  for(const i of all){ // 전월 기준 역산(증감용) — rmEnd 범위가 pmEnd를 포함하므로 _trm에 항목 존재 보장
    if(i.receiptDate>pmEnd)continue;
    const o=_trm[i.trade||'기타'];if(!o)continue;
    const done=i.status==='처리'&&i.completionDate&&i.completionDate<=pmEnd;
    if(!done){o.pu++;if(daysBetween(i.receiptDate,pmEnd)>=30)o.plt++;}
  }
  const trAgg=Object.values(_trm).sort((a,b)=>b.u-a.u).map(o=>({t:o.t,r:o.r,res:o.res,u:o.u,lt:o.lt,d0:o.d0,d30:o.d30,d60:o.d60,coTop:Object.entries(o.co).sort((a,b)=>b[1]-a[1])[0]?.[0]||'-',coN:Object.keys(o.co).length,pu:o.pu,plt:o.plt}));
  // 시공업체별 집계(coAgg) — 같은 원본을 업체로 묶은 것. 표의 축 전환에 쓰이고 게시본에도 실려 뷰어가 같은 표를 본다.
  //   업체가 비어 있는 행은 '(미기재)'로 따로 센다 — 숨기면 합계가 안 맞는다.
  const _com={};
  for(const i of all){
    if(i.receiptDate>rmEnd)continue;
    const c=i.contractor||'(미기재)';
    const o=_com[c]||(_com[c]={c,r:0,res:0,u:0,lt:0,d0:0,d30:0,d60:0,tr:{},pu:0,plt:0});
    o.r++;
    const done=i.status==='처리'&&i.completionDate&&i.completionDate<=rmEnd;
    if(done)o.res++;else{o.u++;const dd=daysBetween(i.receiptDate,rmEnd);if(dd>=60){o.d60++;o.lt++;}else if(dd>=30){o.d30++;o.lt++;}else o.d0++;}
    const tr=i.trade||'기타';o.tr[tr]=(o.tr[tr]||0)+1;
  }
  for(const i of all){
    if(i.receiptDate>pmEnd)continue;
    const o=_com[i.contractor||'(미기재)'];if(!o)continue;
    const done=i.status==='처리'&&i.completionDate&&i.completionDate<=pmEnd;
    if(!done){o.pu++;if(daysBetween(i.receiptDate,pmEnd)>=30)o.plt++;}
  }
  const coAgg=Object.values(_com).sort((a,b)=>b.u-a.u).map(o=>({c:o.c,r:o.r,res:o.res,u:o.u,lt:o.lt,d0:o.d0,d30:o.d30,d60:o.d60,trTop:Object.entries(o.tr).sort((a,b)=>b[1]-a[1])[0]?.[0]||'-',trN:Object.keys(o.tr).length,pu:o.pu,plt:o.plt}));
  return{tR,res,unr,rate,lt,ltr,prev:{total:pT,res:pRes,unr:pUnr,rate:pRate,lt:pLt,ltr:pLtr,dd:[pd0,pd30,pd60]},weekly:calcW(ref,rmEnd,pmEnd),monthly:calcMo(all),top,topPrev,topLt,topLtPrev,dd:[d0,d30,d60],vT,vRes,vUnr,vRate,vLt,vUnits,vTop,vTopPrev,vacU,vacS,rpb,dtb,critT,critUnr,critPrevUnr,critUl,rm,pm,rmEnd,pmEnd,ul,lul,trAgg,coAgg};
}
function isStoreLabel(s){return /[강산살상성싱][가거기]/.test(String(s||''));}
function capAm(defs,rm){
  const _rmP=rm.split('-').map(Number),_rmEnd=`${rm}-${String(new Date(_rmP[0],_rmP[1],0).getDate()).padStart(2,'0')}`;
  const am={};(defs||[]).filter(i=>i.receiptDate&&i.receiptDate<=_rmEnd&&!(i.status==='처리'&&i.completionDate&&i.completionDate<=_rmEnd)).forEach(i=>{am[i.trade||'기타']=(am[i.trade||'기타']||0)+1;});
  return am;
}
function isVacUnit(item){return item.defectClass==='세대'&&(item.saleStatus==='미분양'||item.saleStatus==='미납');}
function isVacStore(item,site){return !!site?.hasCommercial&&item.defectClass==='공용'&&(isStoreLabel(item.building)||isStoreLabel(item.unit));}
function capWks(defs,rm,year){
  const _ty=Number(year);
  const ymPart=rm.split('-').map(Number),lastDay=new Date(ymPart[0],ymPart[1],0).getDate();
  const refLimTS=Math.min(Date.UTC(ymPart[0],ymPart[1]-1,lastDay),Date.UTC(_ty,11,31));
  const _rl=new Date(refLimTS),refLimStr=`${_rl.getUTCFullYear()}-${String(_rl.getUTCMonth()+1).padStart(2,'0')}-${String(_rl.getUTCDate()).padStart(2,'0')}`;
  const startTS=Date.UTC(_ty,0,1),firstSunOff=(7-new Date(startTS).getUTCDay())%7;
  const wks=[];let sunTS=startTS+firstSunOff*86400000,prevCutoff=`${_ty}-01-01`;
  while(prevCutoff<refLimStr){
    const isPartial=sunTS>refLimTS;
    const cutTS=isPartial?refLimTS:sunTS;
    const cutD=new Date(cutTS),cutoff=`${cutD.getUTCFullYear()}-${String(cutD.getUTCMonth()+1).padStart(2,'0')}-${String(cutD.getUTCDate()).padStart(2,'0')}`;
    const m=cutD.getUTCMonth()+1;
    let weekNum;
    if(wks.length>0&&wks[wks.length-1].m===m)weekNum=wks[wks.length-1].w+1;
    else weekNum=1;
    let cR=0,cRes=0,curU=0,curLt=0,curLt60=0;
    for(const it of defs){if(it.receiptDate>cutoff)continue;cR++;const done=it.status==='처리'&&it.completionDate&&it.completionDate<=cutoff;if(done)cRes++;else{curU++;const _dd=Math.max(0,Math.round((new Date(cutoff)-new Date(it.receiptDate))/86400000));if(_dd>=60){curLt++;curLt60++;}else if(_dd>=30)curLt++;}}
    wks.push({m,w:weekNum,cumR:cR,cumRes:cRes,u:curU,lt:curLt,lt60:curLt60});
    if(isPartial)break;
    sunTS+=7*86400000;prevCutoff=cutoff;
  }
  return wks;
}
function trendYearInfo(defs,stateKey){
  const ys=new Set();
  for(const i of defs){if(i&&i.receiptDate&&/^\d{4}/.test(i.receiptDate))ys.add(i.receiptDate.slice(0,4));}
  ys.add('2026');const curY=dfPubRm().slice(0,4);ys.add(curY);
  const years=[...ys].sort();const sel=S[stateKey];
  const year=(sel&&years.includes(sel))?sel:(years.includes(curY)?curY:years[years.length-1]);
  return {year,years};
}
function capAll(){
  const allDefRaw=dfDashSites().flatMap(s=>S.def[s.id]||[]);
  const allDef=allDefRaw.filter(i=>i.receiptDate&&/^\d{4}-\d{2}-\d{2}/.test(i.receiptDate));
  const cap={wks:capWks(allDef,dfPubRm(),trendYearInfo(allDef,'trendYear').year),am:capAm(allDefRaw,dfPubRm()),siteWks:{},siteAm:{}};
  for(const s of dfSites()){ // 현장별 캡처는 인수 전 현장 포함 — 대시보드 합산(wks/am)만 dashSites로 집계 제외
    const defs=S.def[s.id]||[];
    const sd=defs.filter(i=>i.receiptDate&&/^\d{4}-\d{2}-\d{2}/.test(i.receiptDate));
    cap.siteWks[s.id]=capWks(sd,dfPubRm(),trendYearInfo(sd,'siteTrendYear').year);
    cap.siteAm[s.id]=capAm(defs,dfPubRm());
  }
  return cap;
}
const _PII_ROLE=new Set(['고객','손님','선생','사장','기사','소장','반장','과장','차장','부장','대리','주임','팀장','실장','원장','이사','상무','전무','대표','회장','여사','담당','담당자','관리자','작업자','기술자','입주자','입주민','세대주','어르신','사모','아저','아주머','어머','아버']);
function maskPII(s){
  return String(s==null?'':s)
    .replace(/01[016789][ .-]?\d{3,4}[ .-]?\d{4}\b/g,'010-****-****')
    .replace(/\b0\d{1,2}[ .-]\d{3,4}[ .-]\d{4}\b/g,'0**-***-****')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,'***@***')
    .replace(/([가-힣]{2,4})(님|씨)(?![가-힣])/g,(m,name,h)=>_PII_ROLE.has(name)?m:'○○'+h);
  // 알려진 한계: '홍길동님이'처럼 님/씨 뒤에 조사가 바로 붙으면 매치하지 않음(의도 — 완화 시 '날씨가' 등
  // 일반 어휘 오탐이 발생). 인명 마스킹은 best-effort이며 고위험 PII(전화·이메일)는 위 규칙이 전담.
}
function redactUL(ul,all){const a=all?(ul||[]):(ul||[]).slice(0,300);return a.map(i=>Object.assign({},i,{receiptContent:maskPII(String(i.receiptContent||'')),complaint:''}));}
function slimUL(ul){return (ul||[]).map(i=>({building:i.building,unit:i.unit,receiptDate:i.receiptDate,defectClass:i.defectClass,space:i.space,trade:i.trade,defectType:i.defectType,receiptContent:maskPII(String(i.receiptContent||'')),saleStatus:i.saleStatus,repairParty:i.repairParty,contractor:i.contractor,repairContractor:i.repairContractor,delayDays:i.delayDays}));}
/* deriveLul 은 이식하지 않는다(614차) — report 소비자 전용 헬퍼. calapp 소비자는 목록 모달에서 delayDays 필터로 자체 파생하고, 게시는 kpi.lul 을 직접 싣는다. */
function bumpDef(){S.defVer++;_calcCache.clear();warmCalcKick();}
let _warmT=null,_warmQ=null;
S.def=new Proxy(S.def,{set(t,k,v){t[k]=v;bumpDef();return true;},deleteProperty(t,k){delete t[k];bumpDef();return true;}});
function warmCalcKick(){clearTimeout(_warmT);_warmQ=null;_warmT=setTimeout(()=>{if(window.__SNAP__)return;_warmQ=(dfSites()||[]).slice();_warmStep();},600);}
function _warmStep(){
  if(!_warmQ||!_warmQ.length)return;
  const idle=window.requestIdleCallback||function(f){return setTimeout(()=>f(),120);};
  idle(()=>{if(!_warmQ)return;const s=_warmQ.shift();if(s){try{calc(S.def[s.id]||[],s,dfPubRm());}catch(e){}}if(_warmQ&&_warmQ.length)_warmStep();},{timeout:3000});
}
/* ═══ 709차: 민원 세대 레벨화 — 규칙 엔진 ═══════════════════════════════════
   접수건을 세대(동·호) 단위로 묶어 [축 A] 물리 심각도(하자유형·공종) 와 [축 B] 민원 감지요소 10종(접수내용 고객 발화 · 760차 기준: ★중대 4 · 일반 4 · soft 2)으로 판정한다.
   팀 「민원 발생 관리 보고서」 정의 계승: ★중대 = 안전위험·보상요구·법적·감정격화·외부확산. 고위험 = ★중대 1개 이상 또는 감지요소 3개 이상.
   추가(사용자 결정): 「장기방치」 — 문장의 장기간 방치 표현 또는 지연일 60일 이상. ★중대 아님, 3개 규칙에도 안 셈, 최대 「주의」.
   소송 미참여 세대 태그는 민원이 아니다(채권양도 안 한 세대 구분) — 지우고 본다. 근거 조각·위치·접수번호를 함께 저장해 표에서 펼쳐 보인다.
   규칙은 RISK_RULES 한 곳에 — 사람이 고친다. 검사: scripts/test/risk-gold.mjs (예문 60건 정답셋). */
const RISK_RULES={
  /* 743차: 「키워드가 있느냐」→「민원 의미로 쓰였느냐」. 요소마다
       rx   = 강한 직접어(단독 적중)
       cond = 조건부어 — 같은 조각에 ctx(문맥어)가 **다른 자리에** 함께 있어야 적중
       no   = 제외 문맥(조각째 무효) · 직원 방향 문장 포함
     직원 메모 조각(staffMemo)은 memoOk 요소만 본다. 판정 로그는 riskDetect(text,log) 로 남는다(riskAuditCSV). */
  staffMemo:/자재발주|직영확인|이관|안내함|안내드림|선\s*안내|처리예정|처리\s*예정|(조치|방문|확인|시공|보수|재시공|교체)\s*예정|처리불가\s*안내|보수불가\s*안내|방문예정|같은\s*현상으로\s*민원|지급\s*(함|예정|완료)|청구서\s*접수|신고\s*여부\s*확인|책임지고\s*(처리|조치)|끝까지\s*책임|책임감/,
  tags:/\[?소송\s*미참여\s*세대\]?|소송현장\s*세대|\[탄성세대\]|\[?기접수건\]?/g,
  factors:{
    '안전위험':{crit:true,
      rx:/다칠|다치|무섭|무서|화재|감전|추락|가라앉|붕괴|넘어[지질]|전도(?!율)/,
      cond:/꺼[짐지집]|위험|불안|사고|삐그덕|디디|디딜|흔들|탈락|파편/,
      ctx:/바닥|천장|발(?!주|송|생)|아이|아기|어린이|노인|다치|떨어|무너|기울|흔들|불안|위험|디디|디딜|가라앉|꺼[짐지집]|파편|깨|칼|뾰족/,
      no:/위험\s*없|안전\s*확인|사고\s*없|이상\s*없|위험물/},
    '보상요구':{crit:true,
      rx:/보상|배상|환불|손해배상|비용\s*청구|청구\s*하겠|청구하겠/,
      cond:/청구|비용|손실|손해|지급|정신적/,
      ctx:/요구|요청|요함|해달|해주|하겠|바람|바랍|원함|원한다|주세요|해야|받아야|하라|해줘|합당|보전|물어|주셔야|받고|피해|경제적|어려/,
      no:/보상\s*(불가|없)|비용\s*(지급함|지급\s*예정|지급완료)|청구서\s*접수|비용\s*발생\s*여부|인테리어|줄눈/},   /* 744차: 인테리어·줄눈 시공분 보상 문의는 거른다(사용자) */
    /* 760차: 법적·외부기관 + 외부확산 → 하나(★중대) */
    '법적·외부확산':{crit:true,rx:/소송|내용증명|국토부|하심위|하자\s*분쟁|분쟁조정|소비자원|국민신문고|본사(에|\s)|고발(?!디)|언론|투고|게시판|올리겠|커뮤니티|유튜브|인터넷|카페에|입주민.*공유|공론|(?<!안내)방송(?!\s*(안\s*들|설비|스피커))/,no:/고\s*발디|협력\s*업체|협력사|(업체|제조사|LG|삼성)\s*본사|스피커|안내방송|방송\s*안\s*들/},
    /* 760차: 처리지연·일정피해 + 장기방치 → 하나(soft: 단독이면 주의). 지연 60일+ 자동 태그도 여기 */
    '처리지연·장기방치':{soft:true,rx:/재촉\s*반복|반복\s*재촉|입주\s*지연|일정\s*피해|지연\s*보상|(개월|달|주|년)째.*(안\s*됨|미처리|안됨|안\s*되|않)|(작년|재작년|지난해|오래\s*전)부터|수개월|계속\s*미처리|아직\s*(처리|조치|방문|보수)\s*(안|않|되지|못)|여태\s*(처리|조치|방문)|처리(가)?\s*안\s*(됨|되)|(방문|조치|처리)하지\s*않|(년|겨울|여름|봄|가을|월)부터.*(아직|여태|연락)|년\s*(다\s*)?됐|한달째|몇\s*달째|몇\s*개월째|아직도/},
    /* 760차: 보수품질·반복하자 + 반복민원 → 하나(일반, 직원 메모에서도) */
    '반복하자·반복민원':{memoOk:true,
      rx:/재하자|(?<!자)재발|재시공\s*(요구|요청)|여전히|미개선|[2-9]\s*번째\s*접수|[2-9]년차\s*재접수|이번에도|메꾸고\s*갔으나|처리\s*받고\s*싶다|보수(했으나|했지만|받았으나|를\s*받았으나|\s*이후에도|\s*후에도)|처리(했으나|했지만|\s*이후에도)|동일\s*(현상|부위|문제).*(반복|재발|발생)|재문의|재요청|다시\s*문의|다시\s*요청|재접수|여러\s*차례|여러\s*번|몇\s*번이나|몇\s*번을|지난번에도|이전에도|또\s*연락|계속\s*문의|계속\s*연락/},
    '응대·소통불만':{rx:/연락\s*(이\s*)?없|연락이없|연락\s*(요청|주세요|해라|하라|바람|바랍|달라|요망|부탁|줘)|회신\s*요청|회신요청|답변\s*(이\s*)?없|미루|기사\s*변경|담당\s*변경|연락안주|전화\s*(달라|주세요|요망|바람|해라|하라)|직접\s*(와서|방문|나와)|직접\s*확인\s*(해|하|바람|요청)|담당자\s*(대면|나와)/},   /* 744차: 「현대에서 직접 와서 봐라」「연락해라」 */
    '생활불편':{
      rx:/수면\s*장애|사용\s*불가|생활(에|\s*중).*(불편|지장|어려)|일상\s*생활|(지속|계속).*소음|소음.*(지속|계속|새벽)|처리불가(?!\s*안내)/,
      cond:/주거|손상|불편|지장/,
      ctx:/심각|훼손|생활|일상|가구|침대|매트리스|가전|물건|옷|젖|곰팡이|잠|수면|사용|거주|아이|밤/},
    '책임·형평성불만':{
      rx:/다른\s*세대|형평|유독|시공\s*하자로\s*판단|시공사\s*측|원인\s*규명|원인규명|본사\s*차원|책임\s*소재|책임\s*규명|누가\s*책임|시공사\s*책임|회사\s*책임|책임을\s*물|책임\s*회피|책임\s*전가|책임져|책임\s*요구|책임\s*있는/,
      cond:/책임/,
      ctx:/요구|요청|밝혀|물|져야|지어야|규명|소재|시공사|회사|본사|누구|누가|전가|회피/,
      no:/책임지고\s*(처리|조치)|담당자가\s*책임|끝까지\s*책임|책임감/},
    '감정격화·위협표현':{crit:true,
      rx:/화가\s*나|화나|정신적\s*고통|난리|!{3,}|언성|너무한거|폭언|협박|욕설|고성|정말\s*바랍|필요없으니/,
      cond:/스트레스|경찰|짜증|분노/,
      ctx:/심|너무|많|받|때문|힘들|부르|신고하겠|부른다|하겠|고소/,
      no:/경찰\s*신고\s*여부|스트레스\s*관리/},
    /* 745차: 사설 시공(인테리어·줄눈·사설 중문 등) 언급 — 보상 요구로 올리지 않고 주의로만(soft). 다른 요소와 겹치면 그쪽 등급 */
    '사설시공·인테리어':{soft:true,memoOk:true,rx:/인테리어\s*(공사|시공|업체|세대|후|한|하면서|중)|인테리어로|사설\s*(시공|공사|설치|업체|중문)|자체\s*시공|개인\s*시공|줄눈\s*(시공|업체|비용|공사|세대)|중문\s*(설치|시공)/},   /* 763차: 「줄눈」「인테리어」 단독은 일반 하자일 수 있어 시공 문맥이 있을 때만 */
  },
  phys:{4:/누수|침수|역류|균열|크랙|파손|개폐|작동불량|미점등|감전|화재|탈락/,3:/들뜸|고정불량|틈새|단차|구배|수압/,2:/코킹|줄눈|바탕면|수직|수평|시공불량/,1:/흠집|오염|변색|주름|랩핑|기스|스크래치/},
  physTradeBoost:/방화문|창호|전기|설비|스프링클러|콘크리트/,
  /* 접수 데이터로 자동 붙이는 요소(743차): 지연 60일+ → 장기방치, 90일+·180일+ 는 점수·등급 가산 / 세대 접수 N건 이상 → 반복민원 / 같은 공간·하자유형 M건 이상 → 보수품질·반복하자 */
  longDelayDays:60,delay180:180,delay365:365,autoRepeatN:8,autoRepeatN2:5,autoRepeatOpen:2,autoSameDefectN:2,
  urgentMinScore:7,   /* 745차: 「외부·법적 + 미처리」 경로의 긴급은 점수 7 이상일 때만(중대 하나 + 미처리 1건으로 긴급이 되던 것을 조인다) */   /* 744차: 90일 가중 삭제, 180일 +1 · 365일 +2, 등급 승격은 365일(사용자: 널널하게) */
  /* 최종 민원 점수(743차): 태그 개수 대신 하나의 수 — 등급 안 정렬·우선순위. 상한 12 */
  score:{crit:3,hard:1,soft:1,d180:1,d365:2,phys4:2,phys3:1,cap:12},
  levelNames:['','양호','주의','경계','심각'],
};

function riskSegs(text){return String(text||'').replace(RISK_RULES.tags,' ').split(/\s*(?:\/\/|\/|\|| - |■|▶)\s*/).map(x=>x.trim()).filter(Boolean);}
function riskDetect(content,log){
  const hits={},evid=[];
  const rec=(f,kw,seg,ok,why)=>{if(log)log.push({f,kw,seg:seg.slice(0,140),ok,why});};
  /* 749차: 직원 메모로 판정된 조각은 쉼표로 더 쪼개 고객 발화가 섞인 부분(「고객 보상 요구함, 자재발주 처리예정」)을 살린다 */
  /* 756차: 절 단위 — 쉼표뿐 아니라 「~했으나/~지만/~하고/~며」 뒤에서도 끊어 「자재발주했으나 고객이 보상을 요구함」의 뒷절을 살린다 */
  const segs=[];for(const seg of riskSegs(content)){if(RISK_RULES.staffMemo.test(seg))seg.split(/[,，]|(?<=으나|았으나|었으나|였으나|지만|하고|하며|으며|고서|한\s*뒤|한\s*후)\s*/).map(x=>x.trim()).filter(Boolean).forEach(x=>segs.push(x));else segs.push(seg);}
  for(const seg of segs){
    const staff=RISK_RULES.staffMemo.test(seg);
    for(const [name,f] of Object.entries(RISK_RULES.factors)){
      if(hits[name])continue;
      const m1=seg.match(f.rx),m2=(!m1&&f.cond)?seg.match(f.cond):null;
      if(!m1&&!m2)continue;
      const kw=(m1||m2)[0];
      if(staff&&!f.memoOk){rec(name,kw,seg,false,'직원 메모');continue;}
      if(f.no&&f.no.test(seg)){rec(name,kw,seg,false,'제외문맥');continue;}
      if(m1){hits[name]=true;evid.push({f:name,t:seg.slice(0,140),i:m1.index});rec(name,kw,seg,true,'직접어');continue;}
      /* 조건부어: 그 낱말을 지운 나머지에 문맥어가 있어야 한다 */
      const rest=seg.slice(0,m2.index)+' '+seg.slice(m2.index+kw.length);
      const c=f.ctx&&rest.match(f.ctx);
      if(c){hits[name]=true;evid.push({f:name,t:seg.slice(0,140),i:m2.index});rec(name,kw,seg,true,'조건부+'+c[0]);}
      else rec(name,kw,seg,false,'문맥 없음');
    }
  }
  /* 749차: 「8/21 // 8/30 / 9/2 독촉」 — 날짜가 2개 이상 나열되거나 독촉이 2번 이상이면 여러 번 재촉한 것 → 반복민원 */
  const txt=String(content||''),nd=(txt.match(/(^|[^\d])\d{1,2}\/\d{1,2}(?!\d)/g)||[]).length,nu=(txt.match(/독촉/g)||[]).length;
  /* 756차: 날짜 나열만으로는 안 잡는다(「8/21 접수 / 8/30 방문」) — 독촉·재촉·재문의·재연락·반복·다시 같은 행동어가 함께 있어야 */
  const act=/독촉|재촉|재문의|재연락|반복|다시|또\s*연락|여러\s*번/.test(txt);
  if(!hits['반복하자·반복민원']&&((nd>=2&&act)||nu>=2)){hits['반복하자·반복민원']=true;evid.push({f:'반복하자·반복민원',t:txt.slice(0,140),i:0});rec('반복하자·반복민원',nu>=2?'독촉 '+nu+'회':'날짜 '+nd+'회+행동어',txt,true,'재촉 횟수');}
  return {factors:Object.keys(hits),evid,log:log||null};
}
/* 743차: 판정 로그 CSV — 현장 원본 행 전부를 돌려 요소·검출어·원문·판정·사유를 남긴다. 콘솔에서 riskAuditCSV(sid) → 내려받기.
   300~500건만 봐도 어느 정규식이 오탐인지 드러난다. */
function riskAuditCSV(sid){
  const rows=(S.def&&S.def[sid])||[];const out=[['접수번호','동','호','요소','검출어','판정','사유','원문']];
  for(const r0 of rows){const r=r0.receiptContent!==undefined?r0:norm(r0);const log=[];riskDetect(r.receiptContent,log);
    log.forEach(l=>out.push([r.receiptNo,r.building,r.unit,l.f,l.kw,l.ok?'TRUE':'FALSE',l.why,maskPII(l.seg)]));}   /* 756차: 원문은 마스킹 — 게시본과 같은 원칙 */
  const csv='\ufeff'+out.map(a=>a.map(v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='risk-audit_'+sid+'_'+todayStr()+'.csv';a.click();
  return out.length-1;
}
function riskPhys(dtype,trade){
  let lv=1;for(const k of [4,3,2,1]){if(RISK_RULES.phys[k].test(String(dtype||''))){lv=k;break;}}
  if(lv===3&&RISK_RULES.physTradeBoost.test(String(trade||'')))lv=4;
  return lv;
}
/* 710차: 한 척도 5단계 — 양호 · 주의 · 경계 · 심각 · 긴급(즉시 대응).
   긴급 = ★중대 3개 이상(738차, 종전 2), 또는 법적·외부기관/외부확산 이 있고 미처리 건이 남음
   심각 = ★중대 1~2개, 또는 비중대 3개 이상
   경계 = 비중대 1~2개, 또는 물리 심각(누수·균열·파손 등) 보유
   주의 = 장기방치만, 또는 물리 경계
   양호 = 나머지 */
const RISK_LEVELS=['양호','주의','경계','심각','긴급'];
function riskScore(factors,phys,delay){
  const F=RISK_RULES.factors,W=RISK_RULES.score;let sc=0;
  factors.forEach(f=>{const d=F[f];if(!d)return;sc+=d.crit?W.crit:d.soft?W.soft:W.hard;});
  if(delay>=RISK_RULES.delay365)sc+=W.d365;else if(delay>=RISK_RULES.delay180)sc+=W.d180;
  if(phys>=4)sc+=W.phys4;else if(phys>=3)sc+=W.phys3;
  return Math.min(W.cap,sc);
}
function riskLevel(factors,phys,open,delay,sc){
  const F=RISK_RULES.factors;
  const crit=factors.filter(f=>F[f]&&F[f].crit),hard=factors.filter(f=>F[f]&&!F[f].soft);
  const ext=factors.includes('법적·외부확산');
  /* 721차: 긴급은 「심각 + 아직 미처리」 — 처리가 끝났으면 긴급이라 부를 수 없다(할 일이 없다). 이력은 심각으로 남는다 */
  let lv,why;
  if(crit.length){lv=3;why='중대: '+crit.join(', ');}
  else if(hard.length>=3){lv=3;why='감지요소 3개 이상: '+hard.join(', ');}
  else if(hard.length){lv=2;why=hard.join(', ');}
  else if(factors.length){lv=1;why=factors.join(', ');}
  else{lv=0;why='';}
  /* 734차(738차 3개로): 긴급 = ★중대 3개 이상, 또는 법적·외부기관/외부확산이 있고 미처리 잔여(문서·HANDOFF 규칙 그대로).
     ⚠ 그동안 「심각 + 미처리 잔여」면 전부 긴급으로 올려 심각이 0 이 되고 긴급으로 쏠렸다(게다가 처리 판정 오류로 전 건이 미처리였다) */
  const hasOpen=(open===undefined||open>0);
  if(crit.length>=3){lv=4;why='중대 3개 이상 · '+why;}   /* 738차: 2→3(사용자) */
  else if(lv===3&&ext&&hasOpen&&(sc===undefined||sc>=RISK_RULES.urgentMinScore)){lv=4;why='외부·법적 + 미처리 잔여 · '+why;}
  /* 743차(744차 365일로): 1년 이상 방치는 한 단계 올린다(심각까지) */
  if((delay||0)>=RISK_RULES.delay365&&lv>=1&&lv<3){lv++;why='1년 이상 방치 · '+why;}
  const pl=phys>=4?2:phys>=3?1:0;   /* 물리 심각 → 경계, 물리 경계 → 주의 */
  if(pl>lv){lv=pl;why=(why?why+' · ':'')+'물리 '+RISK_RULES.levelNames[phys];}
  return {lv,disp:RISK_LEVELS[lv],level:RISK_LEVELS[lv],why};
}
/* 접수건(norm 결과) → 세대 판정 목록. 게시본 크기 때문에 일반 세대는 개수만, 주의 이상만 목록·근거를 남긴다 */
function riskHH(items){
  const map=new Map();
  /* 760차: 민원 세대 레벨화는 「하자구분 = 세대」 접수만 다룬다(공용부·상가는 관리사무소 경로라 세대 민원이 아니다). 하자구분 열이 아예 없는 자료면 전부 */
  const hasCls=(items||[]).some(r=>String(r.defectClass||'').trim());
  for(const r of items||[]){
    if(hasCls&&String(r.defectClass||'').trim()!=='세대')continue;
    const bu=String(r.building||'').trim(),un=String(r.unit||'').trim();if(!bu&&!un)continue;
    const key=bu+'-'+un;let h=map.get(key);
    if(!h){h={bu,un,n:0,phys:1,factors:new Set(),evid:[],no:'',maxDelay:0,openDelay:0,open:0,types:new Map()};map.set(key,h);}
    h.n++;if(!h.no)h.no=String(r.receiptNo||'');
    const pl=riskPhys(r.defectType,r.trade);h.phys=Math.max(h.phys,pl);
    {const t=String(r.defectType||'').trim();if(t){const cur=h.types.get(t)||{lv:pl,n:0};cur.n++;h.types.set(t,cur);}}   /* 711차: 하자유형 칩 */
    const d=riskDetect(r.receiptContent);
    d.factors.forEach(f=>h.factors.add(f));
    /* 712차: 근거는 접수건 단위 — 감지요소 묶음 + 접수일·공간·공종·하자유형·지연일 + 접수내용(마스킹·200자) */
    if(d.factors.length&&h.evid.length<6)h.evid.push({no:String(r.receiptNo||''),f:d.factors,d:String(r.receiptDate||'').slice(0,10),sp:String(r.space||''),tr:String(r.trade||''),ty:String(r.defectType||''),dl:Number(r.delayDays)||0,st:r.status==='처리'?'완료':'',t:maskPII(String(r.receiptContent||'').replace(/^\s*제목\s*[:：]\s*/,'')).slice(0,200)});   /* 756차: 게시본에 실리므로 마스킹 */
    const dl=Number(r.delayDays)||0;if(dl>h.maxDelay)h.maxDelay=dl;
    /* 756차: 등급·점수·장기방치 자동 태그는 **현재 미처리 건**의 지연일만 본다 — 400일 걸려 끝난 옛 건이 지금 5일짜리 새 민원을 1년 방치 세대로 올리지 않게. maxDelay 는 이력용 */
    if(r.status!=='처리'){if(dl>h.openDelay)h.openDelay=dl;if(dl>=RISK_RULES.longDelayDays)h.factors.add('처리지연·장기방치');}
    {const sk=String(r.space||'').trim()+'|'+String(r.defectType||'').trim();h.same=h.same||new Map();h.same.set(sk,(h.same.get(sk)||0)+1);}
    if(r.status!=='처리')h.open++;   /* 734차: norm() 의 상태값은 '처리'/'미처리' — '완료' 를 찾던 탓에 전 건이 미처리로 세어졌다(처리완료 0·미처리=접수) */
  }
  const cnt={양호:0,주의:0,경계:0,심각:0,긴급:0,total:map.size};const list=[];const fac={};
  for(const h of map.values()){
    /* 743차: 접수 데이터 기반 자동 요소 — 세대 접수 N건+ → 반복민원, 같은 공간·유형 M건+ → 보수품질·반복하자 */
    /* 756차: 자동 요소마다 산출 근거를 근거 표에 한 줄로(auto:true — 접수건 아님) */
    const autoEv=(f,why)=>{h.factors.add(f);h.evid.push({no:'',f:[f],d:'',sp:'',tr:'',ty:'',dl:0,st:'',t:why,auto:true});};
    if(h.n>=RISK_RULES.autoRepeatN)autoEv('반복하자·반복민원','세대 접수 '+h.n+'건('+RISK_RULES.autoRepeatN+'건 이상)');
    else if(h.n>=RISK_RULES.autoRepeatN2&&h.open>=RISK_RULES.autoRepeatOpen)autoEv('반복하자·반복민원','세대 접수 '+h.n+'건 · 미처리 '+h.open+'건');   /* 749차: 8건+, 또는 5건+ 미처리 2건+ */
    if(h.n>=3&&h.same){const top=[...h.same.entries()].filter(([k,v])=>v>=RISK_RULES.autoSameDefectN).sort((a,b)=>b[1]-a[1])[0];if(top)autoEv('반복하자·반복민원',top[0].replace('|',' / ')+' '+top[1]+'건 반복');}   /* 749차: 3건 이상 + 같은 공간·유형 반복 */
    if(h.factors.has('처리지연·장기방치')&&h.openDelay>=RISK_RULES.longDelayDays)h.evid.push({no:'',f:['처리지연·장기방치'],d:'',sp:'',tr:'',ty:'',dl:h.openDelay,st:'',t:'현재 미처리 최장 '+h.openDelay+'일('+RISK_RULES.longDelayDays+'일 이상)',auto:true});
    const FO=Object.keys(RISK_RULES.factors),F=RISK_RULES.factors;
    /* 744차: 감지요소는 중요한 순(★중대 → 일반 → 장기방치), 같은 급은 규칙 순 — 왜 이 등급인지 칩만 보고 읽히게 */
    const factors=[...h.factors].sort((a,b)=>((F[b]&&F[b].crit)?2:(F[b]&&F[b].soft)?0:1)-((F[a]&&F[a].crit)?2:(F[a]&&F[a].soft)?0:1)||(FO.indexOf(a)-FO.indexOf(b)));
    const sc=riskScore(factors,h.phys,h.openDelay);const lv=riskLevel(factors,h.phys,h.open,h.openDelay,sc);
    cnt[lv.disp]=(cnt[lv.disp]||0)+1;
    {const types=[...h.types.entries()].sort((a,b)=>(b[1].lv-a[1].lv)||(b[1].n-a[1].n)).slice(0,4).map(([t,v])=>({t,lv:v.lv,n:v.n}));
      /* 713차: 양호 세대도 얇게 싣는다(근거 없음) — 필터 「양호;주의」 로 같이 보기 위함. 650세대 × 작은 객체라 게시본 부담은 작다 */
      const row={bu:h.bu,un:h.un,n:h.n,open:h.open,done:h.n-h.open,phys:h.phys,types,factors,lv:lv.lv,level:lv.level,why:lv.why,no:h.no,delay:h.openDelay,maxDelay:h.maxDelay,sc};
      if(lv.lv>=1)row.evid=h.evid.map(e=>({...e,t:maskPII(e.t)}));
      list.push(row);}
    factors.forEach(f=>{fac[f]=(fac[f]||0)+1;});
  }
  list.sort((a,b)=>(b.lv-a.lv)||((b.sc||0)-(a.sc||0))||(b.open-a.open)||(b.factors.length-a.factors.length)||(b.phys-a.phys));   /* 750차: 레벨 → 점수 → 미처리 순 */
  return {cnt,list,fac};
}
function calc(items,site,rm){
  if(window.__SNAP__){const _e=window.__SNAP__.st&&window.__SNAP__.st[site.id];if(_e)return _e;} // 스냅샷: 임베드 집계 반환
  // 메모이즈: (현장·기준월·데이터버전·건수) 조합으로 캐시. 건수를 내용 프록시로 사용한다.
  // 캐시 무효화는 S.def Proxy가 자동 처리(set/delete). defVer·length는 키의 보조 식별자.
  const _ck=site.id+'|'+rm+'|'+S.defVer+'|'+(site.lastUploadedAt||'')+'|'+(items?items.length:0);
  const _hit=_calcCache.get(_ck);if(_hit)return _hit;
  if(_calcCache.size>80)_calcCache.clear(); // 소프트 상한 — 월 전환 반복 열람 시 메모리 증식 방지
  const _res=_calcImpl(items,site,rm);
  try{_res.hh=riskHH(items);}catch(e){console.warn('[risk]',e);_res.hh=null;}   /* 709차: 세대 레벨화 — kpi 와 함께 게시된다 */
  _calcCache.set(_ck,_res);
  return _res;
}
/* ═══════════ 하자 생산자 ① 끝 ═══════════ */

/* ═══════════ 하자 데이터 저장·업로드·주요이슈·게시 ═══════════
   HCS 원본 행은 이 앱 전용 IndexedDB 에 보관하고, 업로드 → 집계 → 게시를 모두 이 앱에서 수행한다.
   위젯(WebView2)과 스냅샷은 원본 업로드 저장소를 사용하지 않으며, 브라우저의 관리자 화면에서만 업로드·게시한다.
   meta 스토어에는 이 앱의 게시 기준월·업로드 이력을 별도 레코드로 저장한다. */
const DB_NAME='calapp_defects_v1',DB_VER=1;
const PREV_DB_NAME='hdec_db_v1';
let _db=null;

async function migrateDefectStore(){
  /* 기존 로컬 데이터가 있는 설치만 조용히 현재 저장소로 한 번 복사한다. 이후에는 새 저장소만 사용한다. */
  try{
    const mark=localStorage.getItem('calapp.defectStoreV1');
    if(mark==='1')return;
    /* 763차: databases() 가 없는 브라우저는 옛 DB 를 직접 열어 본다(없으면 open 이 새로 만들므로 onupgradeneeded 에서 취소·삭제) */
    if(indexedDB.databases){const dbs=await indexedDB.databases();if(!dbs.some(x=>x&&x.name===PREV_DB_NAME)){localStorage.setItem('calapp.defectStoreV1','1');return;}}
    else{const exists=await new Promise(res=>{let created=false;const q=indexedDB.open(PREV_DB_NAME);q.onupgradeneeded=()=>{created=true;q.transaction.abort();};q.onsuccess=()=>{q.result.close();res(!created);};q.onerror=()=>res(false);q.onblocked=()=>res(false);});
      if(!exists){try{indexedDB.deleteDatabase(PREV_DB_NAME);}catch(e){}localStorage.setItem('calapp.defectStoreV1','1');return;}}
    const rows=await new Promise((res,rej)=>{
      let req;try{req=indexedDB.open(PREV_DB_NAME,1);}catch(e){return rej(e);}
      req.onerror=()=>rej(req.error);
      req.onsuccess=()=>{const db=req.result;if(!db.objectStoreNames.contains('defects')){db.close();return res([]);}
        const tx=db.transaction('defects','readonly'),os=tx.objectStore('defects'),r=os.getAll();
        r.onsuccess=()=>{const v=r.result||[];db.close();res(v);};r.onerror=()=>{const e=r.error;db.close();rej(e);};
      };
    });
    for(const row of rows){if(row&&row.sid&&!S.def[row.sid]){const raw=defDecode(row);if(raw){try{await dbPut('defects',{sid:row.sid,data:row.data,enc:row.enc,compressed:row.compressed,count:row.count,savedAt:row.savedAt});}catch(e){console.warn('[store] 데이터 이전 실패',row.sid,e);}}}}
    localStorage.setItem('calapp.defectStoreV1','1');
  }catch(e){console.warn('[store] 기존 로컬 데이터 확인 실패',e);}
}
function dbOpen(){
  return new Promise((res,rej)=>{
    if(_db)return res(_db);
    let settled=false;
    const done=(fn,v)=>{if(settled)return;settled=true;fn(v);};
    // open이 onsuccess/onerror/onblocked 어느 것도 안 부르고 멈추는 경우 대비 (file:// 등)
    const to=setTimeout(()=>done(rej,new Error('indexedDB.open timeout')),5000);
    let req;
    try{req=indexedDB.open(DB_NAME,DB_VER);}
    catch(e){clearTimeout(to);return done(rej,e);}
    req.onupgradeneeded=e=>{
      const db=e.target.result;
      if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta',{keyPath:'id'});
      if(!db.objectStoreNames.contains('defects'))db.createObjectStore('defects',{keyPath:'sid'});
    };
    req.onsuccess=()=>{clearTimeout(to);_db=req.result;done(res,_db);};
    req.onerror=()=>{clearTimeout(to);done(rej,req.error);};
    req.onblocked=()=>{clearTimeout(to);done(rej,new Error('indexedDB.open blocked'));};
  });
}
function dbTx(store,mode){return dbOpen().then(db=>db.transaction(store,mode).objectStore(store));}
function dbGet(store,key){return dbTx(store,'readonly').then(os=>new Promise((res,rej)=>{const r=os.get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}));}
function dbPut(store,value){return dbTx(store,'readwrite').then(os=>new Promise((res,rej)=>{const r=os.put(value);r.onsuccess=()=>res();r.onerror=()=>rej(r.error);}));}
function dbDel(store,key){return dbTx(store,'readwrite').then(os=>new Promise((res,rej)=>{const r=os.delete(key);r.onsuccess=()=>res();r.onerror=()=>rej(r.error);}));}
function dbAll(store){return dbTx(store,'readonly').then(os=>new Promise((res,rej)=>{const r=os.getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error);}));}
function defEncode(json){
  if(typeof LZString==='undefined')return{data:json,enc:'raw'};
  return{data:LZString.compressToBase64(json),enc:'b64'};
}
function defDecode(row){
  if(!row)return null;
  if(typeof LZString==='undefined'){
    // 압축 저장분을 압축 해제 없이 JSON.parse 하면 정체불명 오류가 난다 → 원인을 명확히 남기고 중단
    if(row.enc==='b64'||row.enc==='utf16'||row.compressed){
      if(!defDecode._warned){defDecode._warned=true;console.error('[store] 압축 해제 라이브러리(LZString) 미로드 — 로컬 데이터를 읽을 수 없습니다. vendor/lz-string.min.js 배포를 확인하세요.');}
      return null;
    }
    return row.data;
  }
  // enc 명시 우선, 없으면 과거 데이터(compressed:true=utf16) 추정
  const enc=row.enc||(row.compressed?'utf16':'raw');
  try{
    if(enc==='b64')return LZString.decompressFromBase64(row.data);
    if(enc==='utf16')return LZString.decompressFromUTF16(row.data);
    return row.data;
  }catch(e){console.warn('defDecode failed',e);return null;}
}
async function defSave(sid,items){
  try{
    const json=JSON.stringify(items||[]);
    const{data,enc}=defEncode(json);
    await dbPut('defects',{sid,data,enc,compressed:enc!=='raw',count:(items||[]).length,savedAt:Date.now()});
    return true;
  }catch(e){console.error('defSave failed for',sid,e);toast('하자 데이터 저장 실패');return false;}   /* 763차: 실패를 호출부에 돌려준다 — 먹으면 「저장 완료」로 세어져 새로고침 뒤 자료가 사라진다 */
}
async function defLoadAll(){
  try{
    const rows=await dbAll('defects');
    for(const row of rows){
      try{
        const raw=defDecode(row);
        if(raw)S.def[row.sid]=Object.freeze(JSON.parse(raw)); // freeze: 통째 교체 규약 강제 — push/splice 등 in-place 편집 시 무증상 캐시 스테일 차단
      }catch(e){console.warn('defLoad parse failed for',row.sid,e);}
    }
  }catch(e){console.warn('defLoadAll',e);}
}
async function defDelete(sid){try{await dbDel('defects',sid);}catch(e){console.warn('defDelete failed',e);}}
/* ── calapp 생산자 메타(게시 기준월·현장별 최근 업로드) — meta/'calapp' 레코드 ── */
let DFMETA={lastUp:{},hist:[],pubAt:{}};   /* 688차: pubAt[sid] — 이 PC 가 그 현장을 마지막으로 게시한 시각. lastUp 과 견줘 「미게시 변경」을 가른다 */   /* hist: 최근 업로드 10회(시각·행수·현장수·기준월) — 615차 */
function dfFmtDT(v){const d=v instanceof Date?v:new Date(v);if(isNaN(d))return '—';
  return (d.getMonth()+1)+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}   /* 업로드·등록 시각 한 서식(615차) */
async function dfMetaLoad(){try{const o=await dbGet('meta','calapp');if(o){if(/^\d{4}-\d{2}$/.test(o.pubRm||''))S.dfPubRm=o.pubRm;if(o.lastUp)DFMETA.lastUp=o.lastUp;if(Array.isArray(o.hist))DFMETA.hist=o.hist.slice(0,12);if(o.pubAt)DFMETA.pubAt=o.pubAt;}}catch(e){console.warn('dfMetaLoad',e);}}
function dfMetaSave(){dbPut('meta',{id:'calapp',pubRm:S.dfPubRm||'',lastUp:DFMETA.lastUp,hist:DFMETA.hist||[],pubAt:DFMETA.pubAt||{}}).catch(e=>console.warn('dfMetaSave',e));}
/* 제외 키워드 — 기본값 'dummy'(테스트행 제외). 이 앱의 설정만 사용한다. */
S.exTk=(function(){try{return localStorage.getItem('calapp.exTk')??'dummy';}catch(e){return 'dummy';}})();
/* 권역 이름 목록 — 원본 curRegions 와 같은 규칙(고정 권역 '인수 전 현장'을 끝에 붙인다) */
function dfRegionNames(){const base=(S.org.regions||[]).map(r=>r&&r.name).filter(n=>n&&n!=='인수 전 현장');base.push('인수 전 현장');return base;}

function progShow(msg){const o=document.getElementById('uprog');if(!o)return;document.getElementById('uprogMsg').textContent=msg||'처리 중...';document.getElementById('uprogFill').style.width='0%';document.getElementById('uprogSub').textContent='';o.classList.add('show');}
function progSet(pct,sub){const f=document.getElementById('uprogFill');if(f)f.style.width=Math.max(0,Math.min(100,pct))+'%';if(sub!=null){const s=document.getElementById('uprogSub');if(s)s.textContent=sub;}}
function progMsg(msg){const m=document.getElementById('uprogMsg');if(m)m.textContent=msg;}
function progHide(){const o=document.getElementById('uprog');if(o)o.classList.remove('show');}
function nextFrame(){return new Promise(r=>{let done=false;const fin=()=>{if(done)return;done=true;r();};requestAnimationFrame(()=>requestAnimationFrame(fin));setTimeout(fin,60);});}
/* ── 업로드 파이프라인 — 현재 앱의 HCS 데이터 처리 경로 ── */
const COLS_REQ=['접수일','처리상태','공종'];
const COLS_WARN=[['현장'],['현장코드'],['동'],['호'],['접수번호'],['처리확인일'],['하자유형'],['하자구분'],['중대하자유형','중대하자'],['지연일','지연일수'],['보수주체'],['시공업체'],['보수업체'],['입주상태','분양상태'],['공간'],['접수내용'],['민원']];
function findHeaderRow(rows){const sniff=['접수일','공종','처리상태','보수주체'];for(let i=0;i<Math.min(rows.length,20);i++){const r=rows[i]||[];const cells=r.map(c=>String(c||'').trim());let hits=0;for(const s of sniff)if(cells.includes(s))hits++;if(hits>=2)return i;}return 0;}
function rowsToObjs(aoa){const hi=findHeaderRow(aoa),hs=(aoa[hi]||[]).map(c=>String(c||'').trim());const objs=[];for(let i=hi+1;i<aoa.length;i++){const row=aoa[i]||[];if(row.every(c=>c===''||c==null))continue;const o={};hs.forEach((h,j)=>{if(h&&h!=='__proto__'&&h!=='constructor'&&h!=='prototype')o[h]=row[j]!=null?row[j]:'';});objs.push(o);}return{rows:objs,headers:hs.filter(Boolean)};}
function setStep(n){document.querySelectorAll('#upstepper .step').forEach((s,i)=>{const j=i+1;s.classList.toggle('done',j<n);s.classList.toggle('act',j===n);if(j<n)s.querySelector('.step-c').innerHTML='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M3 8l3 3 7-7"/></svg>';else s.querySelector('.step-c').textContent=String(j);});}
function onFile(f){
  if(!isEditor()){toast('보기 전용 · 업로드는 관리자만 가능');return;}
  if(!f){console.warn('[upload] onFile called without file');return;}
  const e=f.name.split('.').pop().toLowerCase();
  if(e==='csv')rCSV(f);
  else if(['xlsx','xls'].includes(e))rXLSX(f);
  else toast('지원하지 않는 형식: '+e);
  // 같은 파일 재선택 시 onchange가 안 뜨는 브라우저 동작 대응
  const fi=document.getElementById('dfFi');if(fi)fi.value='';
}
function csvDecode(buf){
  const u=new Uint8Array(buf);
  if(u.length>=3&&u[0]===0xEF&&u[1]===0xBB&&u[2]===0xBF)return new TextDecoder('utf-8').decode(u.subarray(3)); // UTF-8 BOM
  try{return new TextDecoder('utf-8',{fatal:true}).decode(u);}           // 유효 UTF-8이면 그대로
  catch(_){try{return new TextDecoder('euc-kr').decode(u);}catch(__){return new TextDecoder('utf-8').decode(u);}} // 아니면 CP949
}
function csvToAoA(text){
  text=text.replace(/^\uFEFF/,'');
  const rows=[];let row=[],fld='',q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){fld+='"';i++;} else q=false; } else fld+=c; continue; }
    if(c==='"'){q=true;continue;}
    if(c===','){row.push(fld);fld='';continue;}
    if(c==='\n'){row.push(fld);rows.push(row);row=[];fld='';continue;}
    if(c==='\r')continue;
    fld+=c;
  }
  if(fld.length||row.length){row.push(fld);rows.push(row);}
  return rows.map(r=>r.map(c=>c.trim())).filter(r=>r.some(c=>c!==''));
}
function rCSV(f){
  const r=new FileReader();
  r.onerror=err=>{console.error('[upload] CSV read error',err);toast('CSV 읽기 실패');};
  r.onload=e=>{
    try{
      const aoa=csvToAoA(csvDecode(e.target.result));
      const{rows,headers}=rowsToObjs(aoa);
      handleParsed(rows,headers);
    }catch(err){console.error('[upload] CSV parse error',err);toast('CSV 파싱 실패: '+err.message);}
  };
  r.readAsArrayBuffer(f);
}
function readWorkbookSafe(data,opts){
  const before=new Set(Object.getOwnPropertyNames(Object.prototype));
  try{return XLSX.read(data,opts);}
  finally{
    for(const k of Object.getOwnPropertyNames(Object.prototype)){
      if(!before.has(k)){try{delete Object.prototype[k];}catch(_){}}
    }
  }
}
async function rXLSX(f){
  try{await loadXlsx();}catch(e){toast('엑셀 모듈 로드 실패 · 네트워크·CDN 차단 확인');return;}
  const r=new FileReader();
  r.onerror=err=>{console.error('[upload] XLSX read error',err);toast('파일 읽기 실패');};
  r.onload=e=>{
    try{
      const wb=readWorkbookSafe(e.target.result,{type:'array',cellDates:true});
      const sh=wb.Sheets[wb.SheetNames[0]];
      const aoa=XLSX.utils.sheet_to_json(sh,{header:1,defval:'',raw:false,dateNF:'yyyy-mm-dd'});
      const{rows,headers}=rowsToObjs(aoa);
      handleParsed(rows,headers);
    }catch(err){
      console.error('[upload] XLSX parse error',err);
      const msg=String(err.message||err);
      if(/Encrypted|EncryptionInfo|ECMA-376/i.test(msg)){
        toast('암호로 보호된 엑셀입니다.',5000);
      }else{
        toast('Excel 파싱 실패: '+msg);
      }
    }
  };
  r.readAsArrayBuffer(f);
}
function handleParsed(rowsRaw,hs){
  // 제외 키워드 적용: 대소문자/공백 무시. 여러 키워드는 쉼표로 구분.
  const exTk=(S.exTk||'').split(',').map(t=>t.replace(/\s+/g,'').toLowerCase()).filter(Boolean);
  let excluded=0,rows=rowsRaw;
  if(exTk.length){const matchRow=r=>{const blob=Object.values(r).map(v=>String(v??'').replace(/\s+/g,'').toLowerCase()).join('|');return exTk.some(t=>blob.includes(t));};rows=rowsRaw.filter(r=>{if(matchRow(r)){excluded++;return false;}return true;});}
  // 필수 컬럼 검증
  const missing=COLS_REQ.filter(c=>!hs.includes(c));
  if(missing.length){toast('필수 컬럼 누락: '+missing.join(', '),5000);return;}
  // 경고 컬럼 점검(차단 아님): 대체명 중 하나도 없으면 해당 값이 전부 비어 집계됨 → HCS 컬럼명 변경 신호
  const warnMiss=COLS_WARN.filter(alts=>!alts.some(c=>hs.includes(c))).map(alts=>alts[0]);
  if(warnMiss.length&&!confirm('다음 컬럼이 엑셀에 없어 해당 값이 전부 빈 채로 집계됩니다.\n(HCS 컬럼명 변경 가능성 — 원본 헤더를 확인하세요)\n\n· '+warnMiss.join('  · ')+'\n\n그대로 진행하시겠습니까?'))return;
  if(!rows.length){toast('처리할 데이터가 없습니다');return;}
  S.ubuf=rows;
  if(excluded)toast(`제외 ${excluded.toLocaleString()}건 적용 · ${rows.length.toLocaleString()}건 처리`);
  confirmUL();
}
function auditUpload(items){
  const today=new Date(Date.now()+9*36e5).toISOString().slice(0,10); // KST 기준 오늘 YYYY-MM-DD
  let futR=0,futC=0,noDate=0;const rn=new Map();
  for(const i of items){
    if(!i.receiptDate)noDate++;else if(i.receiptDate>today)futR++;
    if(i.completionDate&&i.completionDate>today)futC++;
    const k=(i.receiptNo||'').trim();if(k)rn.set(k,(rn.get(k)||0)+1);
  }
  let dupKeys=0,dupRows=0;rn.forEach(c=>{if(c>1){dupKeys++;dupRows+=c;}});
  const L=[];
  if(futR)L.push(`· 미래 접수일(오늘 이후): ${futR.toLocaleString()}건`);
  if(futC)L.push(`· 미래 완료일(오늘 이후): ${futC.toLocaleString()}건`);
  if(dupKeys)L.push(`· 중복 접수번호: ${dupKeys.toLocaleString()}종 ${dupRows.toLocaleString()}건`);
  if(noDate)L.push(`· 접수일 없음(집계 제외): ${noDate.toLocaleString()}건`);
  if(!L.length)return '';
  return `업로드 데이터에서 이상 징후가 발견되었습니다.\n\n${L.join('\n')}\n\n그대로 진행하면 회의자료 수치에 영향을 줄 수 있습니다. 계속 진행하시겠습니까?\n(취소 후 원본 파일을 수정하는 것을 권장합니다)`;
}
async function confirmUL(){
  if(!S.ubuf){toast('파일을 먼저 업로드하세요');return;}
  progShow('데이터 정규화 중...');
  await nextFrame();
  // 정규화 + 현장명별 그룹핑 — 청크 단위로 처리해 진행률 표시
  const src=S.ubuf,total=src.length,items=new Array(total);
  const CHUNK=5000;
  for(let i=0;i<total;i+=CHUNK){
    const end=Math.min(i+CHUNK,total);
    for(let j=i;j<end;j++)items[j]=norm(src[j]);
    progSet(end/total*100,`${end.toLocaleString()} / ${total.toLocaleString()}행`);
    await nextFrame();
  }
  // 이상 징후 점검(차단 아님 — 진행 여부는 사용자 판단)
  const _audit=auditUpload(items);
  if(_audit){progHide();if(!confirm(_audit)){cancelUL();return;}progShow('데이터 저장 준비 중...');await nextFrame();}
  const byName={},rawByName={};
  for(let i=0;i<items.length;i++){const it=items[i];const k=it.siteName||'(미지정)';(byName[k]=byName[k]||[]).push(it);(rawByName[k]=rawByName[k]||[]).push(src[i]);}
  S._uploadRaw=rawByName;
  const names=Object.keys(byName);
  if(!names.length||(names.length===1&&names[0]==='(미지정)')){progHide();toast('현장명 식별 불가 · 엑셀의 "현장" 컬럼 확인');return;}
  // 신규 현장 추출
  const unknown=names.filter(n=>n!=='(미지정)'&&!dfSites().some(s=>s.name===n));
  if(unknown.length){
    progHide();
    // 신규 현장 순차 등록 wizard. 마지막 현장 등록 후 doSaveUL 호출
    openNewSiteWizard(unknown,0,byName,items);
    return;
  }
  await doSaveUL(byName,items);
}
/* 신규 현장 위저드 — 원본 openNewSiteWizard/confirmNewSite. ⚠ 모달 API 만 calapp(openModal)로,
   현장은 S.org.sites 에 넣고 orgSave()로 calapp/org 에 쓴다(조직 원본 역전 — ④단계). */
function openNewSiteWizard(unknown,idx,byName,allItems){
  if(idx>=unknown.length){doSaveUL(byName,allItems);return;}
  const name=unknown[idx];
  const sample=byName[name]||[];
  const bldgs=new Set(sample.map(i=>i.building).filter(Boolean));
  const bldgHint=bldgs.size||'';
  const{team}=tkSel();
  openModal('신규 현장 등록 ('+(idx+1)+'/'+unknown.length+')',
    '<p style="font-size:12.5px;color:var(--lbl2);margin-bottom:14px">"<b style="color:var(--bt1)">'+esc(name)+'</b>" 현장이 등록되어 있지 않습니다. 정보를 입력하세요.</p>'
    /* 615차 배치: 1행 팀·권역·준공일 / 2행 동수·세대수·상가수 */
    +'<div class="g3"><div class="ig2"><label class="il" for="mtm">팀</label><select class="inp" id="mtm">'+(S.org.teams||[]).map(t=>'<option value="'+esc(t.id)+'"'+(team&&team.id===t.id?' selected':'')+'>'+esc(t.name||t.id)+'</option>').join('')+'</select></div>'
    +'<div class="ig2"><label class="il" for="mr">권역 *</label><select class="inp" id="mr">'+dfRegionNames().map(r=>'<option>'+esc(r)+'</option>').join('')+'</select></div>'
    +'<div class="ig2"><label class="il" for="mc">준공일</label><input class="inp" id="mc" type="date" max="9999-12-31"></div></div>'
    +'<div class="g3"><div class="ig2"><label class="il" for="mb2">동수</label><input class="inp" id="mb2" type="number" value="'+bldgHint+'" placeholder="예: 12"></div>'
    +'<div class="ig2"><label class="il" for="mu">세대수</label><input class="inp" id="mu" type="number" placeholder="예: 1,240"></div>'
    +'<div class="ig2"><label class="il" for="mcu">상가수</label><input class="inp" id="mcu" type="number" placeholder="예: 24"></div></div>'
    +'<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-top:4px"><input type="checkbox" id="mco" aria-label="공가상가 포함 현장"> 공가상가 포함 현장</label>',
    '<button class="btn bg2 bsm" data-act="dfp.ulCancel">전체 취소</button><button class="btn bp bsm" data-act="dfp.ulSite" data-name="'+esc(name)+'" data-idx="'+idx+'" data-total="'+unknown.length+'">'+(idx+1<unknown.length?'다음':'완료 및 저장')+'</button>');
  S._wiz={unknown,byName,allItems};
}
async function confirmNewSite(name,idx,total){
  const w=S._wiz;if(!w){closeModal();return;}
  const region=document.getElementById('mr').value;
  const units=Number(document.getElementById('mu').value)||0;
  const buildings=Number(document.getElementById('mb2').value)||0;
  const commercialUnits=Number(document.getElementById('mcu').value)||0;
  const completionDate=document.getElementById('mc').value;
  const hasCommercial=document.getElementById('mco').checked;
  const id='s'+Date.now()+'_'+idx;
  const tmSel=document.getElementById('mtm');
  const teamId=(tmSel&&tmSel.value)||((tkSel().team||{}).id)||'';   /* 615차: 위저드에서 팀 선택 */
  const newSite={id,name,region,units,buildings,commercialUnits,completionDate,hasCommercial,team:teamId};
  S.org.sites.push(newSite);
  orgSave();
  dfSiteCfgWrite(id,newSite);   /* hasCommercial/showVacant 실시간 채널 — 원본 fb2SiteConfigWrite 와 같은 자리 */
  rOrg();
  if(idx+1<total){openNewSiteWizard(w.unknown,idx+1,w.byName,w.allItems);}
  else{closeModal();await doSaveUL(w.byName,w.allItems);S._wiz=null;}
}
function dfSiteCfgWrite(sid,site){
  if(!S.live||!FB.db)return;
  FB.db.ref('siteConfig/'+sid).set({hasCommercial:!!site.hasCommercial,showVacant:site.showVacant!==false,lawsuit:!!site.lawsuit,updatedAt:Date.now()})
    .catch(e=>console.warn('[siteConfig] 쓰기 실패',sid,e));
}

async function doSaveUL(byName,allItems){
  S._importing=true;
  progShow('하자 데이터 저장 중...');
  await nextFrame();
  // 기준월 자동 결정: 모든 receiptDate의 최댓값이 속한 월
  const dates=allItems.map(i=>i.receiptDate).filter(Boolean).sort();
  const maxDate=dates[dates.length-1]||'';
  const autoRm=maxDate.slice(0,7);
  // 기준월 자동값 상한 = 전월. 월간보고는 '전월 말일까지' 기준인데, 월초 HCS 추출본에는
  // 당월 접수분이 몇 건 섞여 들어와 기준월이 당월로 튀고, 그 상태로 게시하면 미래 월
  // 게시본이 생겨 뷰어 전원이 잘못된 기준월을 보게 된다. 수동 변경(기준월 칩)은 그대로 가능.
  const _capRm=pM(todayYM());
  const effRm=(autoRm&&autoRm>_capRm)?_capRm:autoRm;
  if(effRm)S.dfPubRm=effRm;dfMetaSave();   /* ⚠ 원본 S.rm/lsSave → 게시 기준월 + calapp meta 레코드 */
  // 현장별 저장 (메모리 + IndexedDB 압축). 순차 처리로 진행률 표시.
  let savedCount=0,savedSites=0,firstSid=null;const savedNames=[];
  const entries=Object.entries(byName).filter(([name])=>name!=='(미지정)');
  for(let k=0;k<entries.length;k++){
    const[name,its]=entries[k];
    const site=dfSites().find(s=>s.name===name);if(!site)continue;
    progMsg(`저장 중: ${name}`);
    progSet(k/entries.length*100,`${k+1} / ${entries.length}개 현장 · ${its.length.toLocaleString()}건 압축`);
    await nextFrame();
    /* 765차: 업로드 원자성 — 저장이 성공했을 때만 교체를 확정한다. 실패하면 이 세션의 옛 원본·업로드 시각(사이트·DFMETA)을 되돌린다(763차의 delete 는 옛 원본까지 지웠다) */
    const prevDef=S.def[site.id],prevAt=site.lastUploadedAt,prevMeta=DFMETA.lastUp[site.id];
    S.def[site.id]=Object.freeze(its); // freeze: 원본 불변
    site.lastUploadedAt=new Date().toISOString();DFMETA.lastUp[site.id]=site.lastUploadedAt;   /* 업로드 시각은 meta(state) sites 와 calapp 쪽 meta 둘 다 */
    const okSave=await defSave(site.id,its);// 메모리+IndexedDB 저장
    if(!okSave){
      if(prevDef!==undefined)S.def[site.id]=prevDef;else delete S.def[site.id];
      if(prevAt!==undefined)site.lastUploadedAt=prevAt;else delete site.lastUploadedAt;
      if(prevMeta!==undefined)DFMETA.lastUp[site.id]=prevMeta;else delete DFMETA.lastUp[site.id];
      progHide();S._uploadRaw=null;throw new Error(name+' 저장 실패(IndexedDB) — 이전 자료는 그대로 두었습니다. 브라우저 저장 공간·시크릿 모드 여부를 확인하세요');
    }
    savedCount+=its.length;savedSites++;savedNames.push(site.name);
    if(!firstSid)firstSid=site.id;
  }
  progSet(100,'완료');
  await nextFrame();
  progHide();
  S._uploadRaw=null;
  /* 695차: 업데이트일을 조직(sites[].lastUploadedAt)에도 저장 — 전엔 이 PC 의 site 객체에만 얹혀 새로고침·다른 PC 에선 안 보였다(표의 업데이트일 열이 늘 「—」) */
  if(savedSites&&!S.snap){try{store.putOrg(S.org);}catch(e){console.warn('lastUploadedAt 저장',e);}}
  DFMETA.hist=[{at:new Date().toISOString(),rows:savedCount,sites:savedSites,rm:S.dfPubRm||'',names:savedNames}].concat(DFMETA.hist||[]).slice(0,12);   /* 697차: 12건(1년) */dfMetaSave();   /* 업로드 이력(615차) */
  /* ⚠ 686차: 저장하자마자 이 PC 화면이 새 원본을 쓰도록 현장 캐시를 비운다.
     원본 앱이 그랬듯 업로드 즉시 현장 페이지가 바뀐다(팀 화면은 여전히 [등록] 후에 바뀐다). */
  Object.keys(DF.kpi).forEach(k=>{const sid=k.slice(k.indexOf('/')+1);
    if(((S.def||{})[sid]||[]).length){delete DF.kpi[k];delete DF.sw[k];delete DF.sam[k];delete (DF.local||{})[k];}});
  DF.lastDash=null;
  dfProdCardFill();   /* ⚠ 원본 setRmChip → 게시 카드 갱신 */
  if(S.view==='defect')rDefect();
  toast(`${savedCount.toLocaleString()}건 · ${savedSites}개 현장 저장 완료`);
  S.ubuf=null;setStep(3);
  setTimeout(()=>{
    setStep(1);
    S._importing=false;
    toast('저장 완료 · 이 PC 화면에는 바로 반영됩니다 — 팀 화면은 [등록] 후에 바뀝니다',6000);   /* ⚠ 원본은 화면 이동 — calapp 화면은 게시본 기준이라 이동해도 숫자가 안 변해 오해를 부른다 */
  },600);
}
function cancelUL(){S.ubuf=null;S._uploadRaw=null;S._importing=false;}
function norm(r){
  const pick=(...keys)=>{for(const k of keys){const v=r[k];if(v!=null&&String(v).trim()!=='')return v;}return '';};
  // 처리상태: '처리','미처리','처리완료' 등을 정규화. 처리확인일이 있으면 처리로 간주
  // 처리일 기준 = 처리확인일 단독 (업체처리일·처리완료일 폴백 제거 → 전 계산 일관)
  const rawStatus=String(pick('처리상태')).trim();
  const compRaw=pick('처리확인일');
  const comp=nd(compRaw);
  let status='미처리';
  if(rawStatus==='처리'||rawStatus==='처리완료'||rawStatus==='완료')status='처리';
  else if(rawStatus==='미처리')status='미처리';
  else if(comp)status='처리';
  return{
    // 메모리=슬림 원칙: 원본 전 컬럼은 공유폴더 압축 파일(defects/{id}.json)에만 보존하고
    // 메모리/IndexedDB에는 표시용 필드만 올린다. (70만 건 규모에서 ...r 전개는 메모리 과부하)
    receiptNo:String(pick('접수번호')||''),
    building:String(pick('동')||''),
    unit:String(pick('호')||''),
    trade:String(pick('공종')||''),
    defectType:String(pick('하자유형')||''),
    criticalType:String(pick('중대하자유형','중대하자')||'').trim(), // 중대하자유형(비어있지 않으면 중대하자)
    defectClass:String(pick('하자구분')||'').trim(),
    receiptDate:nd(pick('접수일')),
    completionDate:comp,
    status,
    delayDays:Number(pick('지연일','지연일수'))||0,
    repairParty:String(pick('보수주체')||''),
    contractor:String(pick('시공업체')||''),       // 시공업체 — 더 이상 보수업체와 병합하지 않음
    repairContractor:String(pick('보수업체')||''), // 보수업체 별도 보존
    saleStatus:String(pick('입주상태','분양상태')||'입주완료'),
    unitType:String(pick('세대구분')||'세대'),
    moveIn:String(pick('입점여부')||'Y'),
    space:String(pick('공간')||'').trim(),
    receiptContent:String(pick('접수내용')||'').trim(),
    complaint:String(pick('민원')||'').trim(),
    siteName:String(pick('현장')||'').trim(),
    siteCode:String(pick('현장코드')||'').trim()
  };
}
function nd(v){
  if(v==null||v==='')return '';
  // Excel Date 객체 (cellDates:true 사용 시)
  if(v instanceof Date){const y=v.getFullYear();if(y<1900||y>2100)return '';return`${y}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;}
  // Excel 시리얼 숫자 (1899-12-30 기준)
  if(typeof v==='number'&&v>1&&v<60000){const d=new Date(Math.round((v-25569)*86400*1000));if(!isNaN(d))return`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;}
  const s=String(v).trim();
  // 'YYYY-MM-DD 오전 12:00:00' 같은 한국식 시각 포함도 슬라이스로 처리
  const m=s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if(m)return`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  if(/^\d{8}$/.test(s))return`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  return '';
}
/* ── 주요 이슈 생성 — 원본 rInsights 본문 그대로(머리·꼬리만 순수 함수화 · ⚠ 주석 참조) ── */
const INS_COLOR_MAP={'#c0392b':'var(--rd)','#1a7a3c':'var(--gn)','#a0590a':'var(--am)','#d97706':'var(--am)',
                    '#3e71d2':'var(--bt1)','#3259b6':'var(--bt1)','#1f2b4c':'var(--bt2)',
                    '#1c1c1e':'var(--lbl)','#6e6e73':'var(--lbl2)','#333':'var(--lbl)','#444':'var(--lbl)'};
function themeHTML(html){
  return String(html||'').replace(/color:\s*(#[0-9a-fA-F]{3,6})/g,(m,hex)=>{
    const t=INS_COLOR_MAP[hex.toLowerCase()];return t?('color:'+t):m;
  });
}
function icoSVG(v){
  const s=String(v||'');
  const inner=/^\s*[Mm][\s\d.-]/.test(s)?'<path d="'+s+'"/>':s;
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+inner+'</svg>';
}
function safeHTML(dirty){
  const s=String(dirty==null?'':dirty);
  if(window.DOMPurify&&DOMPurify.sanitize){
    // class 토큰 화이트리스트 훅(1회 등록): 살균 통과 HTML이 앱 스타일 클래스를 도용해 UI를 위장하지 못하도록
    // 인사이트 카드가 실제 사용하는 클래스만 통과시킨다.
    if(!safeHTML._clsHook){
      safeHTML._cls=new Set(['ic','ic-i','ic-t','ic-ttl','ic-sub','warn','bad','ok']);
      DOMPurify.addHook('uponSanitizeAttribute',(node,data)=>{
        if(data.attrName==='class'){
          data.attrValue=String(data.attrValue).split(/\s+/).filter(c=>safeHTML._cls.has(c)).join(' ');
          if(!data.attrValue)data.keepAttr=false;
        }
      });
      safeHTML._clsHook=true;
    }
    return DOMPurify.sanitize(s,{
      ALLOWED_TAGS:['div','p','ul','ol','li','strong','b','em','i','span','br','small','h1','h2','h3','h4','table','thead','tbody','tr','td','th','svg','path'],
      ALLOWED_ATTR:['style','class','viewBox','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','d','opacity','width','height','xmlns'],
      ALLOW_DATA_ATTR:false
    });
  }
  // 폴백(DOMPurify 부재): 626차 — 정규식 살균은 보안 최종선이 못 된다(우회 여지). HTML 을 버리고
  // 텍스트로만 표시한다. DOMPurify 는 자체 번들이라 부재 자체가 이상 상황 — 기능 저하보다 안전을 택한다.
  return esc(s);
}
function dfInsShortName(name){if(!name)return'-';const stripped=String(name).replace(/힐스테이트/g,' ').replace(/\s+/g,' ').trim();return stripped||String(name).trim();}
function dfInsightsBuild(all,tR,tRes,tU,tLt,rate,pRate,rm){
  if(!all.length)return '';
  const C={gn:'#1A7A3C',rd:'#C0392B'};
  const ICON={up:'<path d="M22.0 7.0L13.5 15.5L8.5 10.5L2.0 17.0"/><path d="M16.0 7.0L22.0 7.0L22.0 13.0"/>',clock:'<path d="M2.0 12.0a10.0 10.0 0 1 0 20.0 0a10.0 10.0 0 1 0 -20.0 0"/><path d="M12.0 6.0L12.0 12.0L16.0 14.0"/>',wrench:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',user:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M5.0 7.0a4.0 4.0 0 1 0 8.0 0a4.0 4.0 0 1 0 -8.0 0"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',layers:'<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>',box:'<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/><path d="m7.5 4.27 9 5.15"/>',home:'<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'}; // Lucide(ISC) — path만 사용(safeHTML 허용 태그 제약) // Lucide(ISC) — path만 사용(safeHTML 허용 태그 제약)
  const fmt=n=>Math.round(n).toLocaleString();
  const sgn=n=>(n>=0?'+':'−')+fmt(Math.abs(n));
  const pct=(n,d)=>d>0?(n/d*100):0;
  // z-score 헬퍼: 현장 배열에서 한 현장이 평균 대비 얼마나 튀는지(표준편차 배수)
  const zTop=(arr)=>{const v=arr.map(a=>a.v),n=v.length;if(n<2)return arr[0]?{...arr[0],z:0}:null;const m=v.reduce((a,b)=>a+b,0)/n,sd=Math.sqrt(v.reduce((a,b)=>a+(b-m)**2,0)/n)||1;return arr.map(a=>({...a,z:(a.v-m)/sd})).sort((a,b)=>b.z-a.z)[0];};
  // 전월대비 변화 점수: 비율(%) 절댓값을 0~1로 (40% 변화면 만점). 악화 방향이면 가산.
  const chg=(curr,prev,worseUp)=>{if(prev<=0)return curr>0?0.5:0;const r=(curr-prev)/prev;const mag=Math.min(Math.abs(r)/0.4,1);const worse=worseUp?r>0:r<0;return mag*(worse?1:0.35);};
  // 미처리 원시건 (대시보드 기준월말 기준)
  const _rmPi=rm.split('-').map(Number),_rmEndI=`${rm}-${String(new Date(_rmPi[0],_rmPi[1],0).getDate()).padStart(2,'0')}`;
  const siteUnr={};all.forEach(({s})=>{siteUnr[s.id]=(S.def[s.id]||[]).filter(i=>i.receiptDate&&i.receiptDate<=_rmEndI&&!(i.status==='처리'&&i.completionDate&&i.completionDate<=_rmEndI));});
  const _unrAll=all.flatMap(({s})=>siteUnr[s.id]);
  // 집계 헬퍼
  const agg=(items,key)=>{const m={};items.forEach(i=>{const k=(typeof key==='function'?key(i):i[key])||'기타';m[k]=(m[k]||0)+1;});return Object.entries(m).sort((a,b)=>b[1]-a[1]);};
  // 미귀책 보수주체 집합 (시공업체=정상귀책 외 전부)
  const NONFAULT=new Set(['품의(대기)','외주','외주(다기능공)','H서비스센터','신속대응팀','현장직영','미지정']);
  // 전월 대비 합계
  const pT=all.reduce((a,x)=>a+x.st.prev.total,0),pRes=all.reduce((a,x)=>a+x.st.prev.res,0),pU=all.reduce((a,x)=>a+x.st.prev.unr,0),pLt=all.reduce((a,x)=>a+x.st.prev.lt,0);
  const deltaU=tU-pU,deltaLt=tLt-pLt,deltaR=tRes-pRes,deltaIn=tR-pT,delta=rate-pRate;
  const ltr=pct(tLt,tU);

  // 현장명 줄임말 헬퍼 (도넛 차트 범례와 동일)
  const sn=s=>dfInsShortName(s.name);
  // 현장 목록 → 줄임말 나열 (최대 4개, 초과 시 '외N개')
  const siteList=(arr,max=4)=>{if(!arr||!arr.length)return'';const names=arr.map(s=>sn(s));if(names.length<=max)return names.map(n=>`<b>${n}</b>`).join('·');return names.slice(0,max).map(n=>`<b>${n}</b>`).join('·')+`·외${names.length-max}개`;};

  // 미처리 상위 10 협력사 집합 (미처리 건수 기준) — 협력사/공종 후보 필터링에 공통 사용
  const _unrByCo={}; _unrAll.forEach(i=>{const k=i.contractor||'미지정';if(k==='미지정'||k==='')return;(_unrByCo[k]=_unrByCo[k]||0);_unrByCo[k]++;});
  const _top10Co=new Set(Object.entries(_unrByCo).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k])=>k));
  // 미처리 상위 10 공종 집합
  const _unrByTr={}; _unrAll.forEach(i=>{const k=i.trade||'기타';(_unrByTr[k]=_unrByTr[k]||0);_unrByTr[k]++;});
  const _top10Tr=new Set(Object.entries(_unrByTr).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k])=>k));

  const cand=[];
  // 1. 협력사 처리율 저조 — 미처리 상위 10 업체 중 처리율 최저, 타 업체 평균 대비 격차
  (()=>{
    // 협력사별 접수·처리·미처리 + 주공종(미처리 기준) + 소속 현장 추적
    const byCo={};all.flatMap(({s})=>(S.def[s.id]||[]).filter(i=>i.receiptDate&&i.receiptDate<=_rmEndI).map(i=>({...i,_s:s}))).forEach(i=>{const k=i.contractor||'미지정';if(k==='미지정'||k==='')return;const done=i.status==='처리'&&i.completionDate&&i.completionDate<=_rmEndI;if(!byCo[k])byCo[k]={t:0,r:0,u:0,siteSet:new Set(),trades:{}};byCo[k].t++;if(done)byCo[k].r++;else{byCo[k].u++;const tr=i.trade||'기타';byCo[k].trades[tr]=(byCo[k].trades[tr]||0)+1;}byCo[k].siteSet.add(i._s.id);});
    // 미처리 상위 10 업체만 대상 + 접수 충분(50건+) 필터
    const rows=Object.entries(byCo).filter(([k,v])=>_top10Co.has(k)&&v.t>=50).map(([k,v])=>({k,t:v.t,rate:pct(v.r,v.t),u:v.u,topTr:Object.entries(v.trades).sort((a,b)=>b[1]-a[1])[0]?.[0]||'-',sites:[...v.siteSet].map(id=>all.find(x=>x.s.id===id)?.s).filter(Boolean)}));if(rows.length<2)return;
    const avg=rows.reduce((a,r)=>a+r.rate,0)/rows.length;const w=rows.slice().sort((a,b)=>a.rate-b.rate)[0];const gap=avg-w.rate;if(w.rate>=90||gap<10)return;
    const score=0.6*Math.min(gap/30,1)+0.4*Math.min(gap/15,1);
    const sLabel=w.sites.length===1?` (${sn(w.sites[0])})`:w.sites.length>1?` (${siteList(w.sites)})`:' ';
    cand.push({score,cls:'bad',icon:ICON.user,ttl:'협력사 처리율 저조',
      sub:`<b>${w.topTr} · ${w.k}</b>${sLabel} 처리율 <b style="color:${C.rd}">${w.rate.toFixed(1)}%</b> · 미처리 ${fmt(w.u)}건 (타 협력사 평균 ${avg.toFixed(1)}%, <b>−${gap.toFixed(1)}%p</b>)<br>해당 협력사 PM 호출 — 다음 달 처리계획 제출 요구, 미처리 ${fmt(w.u)}건 일정 확정 필요`});})();
  // 2. 장기미처리 다수 — 30일+ 절대건수·미처리대비%, 현장 z-score
  (()=>{const z=zTop(all.filter(x=>x.st.unr>0).map(x=>({s:x.s,v:x.st.lt,st:x.st})));if(!z)return;
    const score=0.6*chg(tLt,pLt,true)+0.4*Math.min(Math.max(z.z,0)/2,1)*(ltr>=25?1:0.6);
    cand.push({score,cls:deltaLt>0||ltr>=40?'bad':ltr>=25?'warn':'ok',icon:ICON.clock,ttl:'장기미처리 적체',
      sub:`30일+ <b>${fmt(tLt)}건</b> (전월대비 <b style="color:${deltaLt<=0?C.gn:C.rd}">${sgn(deltaLt)}</b>) · 미처리 대비 <b>${ltr.toFixed(1)}%</b> · 집중 <b>${sn(z.s)}</b> ${fmt(z.v)}건<br>${deltaLt>0?`<b style="color:${C.rd}">증가 ${fmt(deltaLt)}건</b> — 60일+ 별도 추적, 180일+ 동결건 분리 후 30일대 가속`:`<b style="color:${C.gn}">전월대비 ${fmt(Math.abs(deltaLt))}건 감소</b> — 개선 흐름 유지, <b>${sn(z.s)}</b> 집중 관리`}`});})();
  // 3. 품의(대기) 적체 — 건수·평균지연 + 쏠린 공종/유형/업체
  (()=>{const pi=_unrAll.filter(i=>i.repairParty==='품의(대기)');const n=pi.length;if(n<30)return;
    const _dB=(a,b)=>Math.max(0,Math.round((new Date(b)-new Date(a))/86400000));
    const avgDelay=pi.reduce((a,i)=>a+(i.receiptDate?_dB(i.receiptDate,_rmEndI):0),0)/Math.max(n,1); // 역산(기준일-접수일)으로 통일 — 대시보드 전체와 동일 기준
    const tT=agg(pi,'trade')[0],dT=agg(pi,'defectType')[0],cT=agg(pi,i=>i.contractor||'미지정')[0];
    // 품의 적체가 쏠린 현장
    const piSites=all.map(({s})=>({s,v:siteUnr[s.id].filter(i=>i.repairParty==='품의(대기)').length})).filter(r=>r.v>=10).sort((a,b)=>b.v-a.v);
    const piSiteLbl=piSites.length?` · 집중 ${siteList(piSites.slice(0,3).map(r=>r.s))}`:' ';
    const score=0.6*Math.min(avgDelay/120,1)+0.4*Math.min(n/200,1);
    cand.push({score,cls:n>=100||avgDelay>=100?'bad':'warn',icon:ICON.box,ttl:'품의(대기) 적체 — 당사 의사결정 병목',
      sub:`품의(대기) <b>${fmt(n)}건</b> · 평균지연 <b>${Math.round(avgDelay)}일</b>${piSiteLbl}<br>쏠림: <b>${tT?.[0]||'-'}</b> ${fmt(tT?.[1]||0)}건 · <b>${dT?.[0]||'-'}</b> ${fmt(dT?.[1]||0)}건 · <b>${cT?.[0]||'-'}</b> — 30일↑ 외주 전환·품의 승인 가속 필요`});})();
  // 4. 특정 하자유형 다수 — 미처리 최다 하자유형 점유율
  (()=>{const dt=agg(_unrAll,'defectType');if(!dt.length)return;const top=dt[0],share=pct(top[1],tU);if(share<20)return;
    const tradeOf=agg(_unrAll.filter(i=>(i.defectType||'미분류')===top[0]),'trade')[0];
    // 해당 유형이 쏠린 현장들
    const dtSites=all.map(({s})=>({s,v:siteUnr[s.id].filter(i=>(i.defectType||'미분류')===top[0]).length})).filter(r=>r.v>0).sort((a,b)=>b.v-a.v);
    const dtSiteLbl=dtSites.length?` · ${siteList(dtSites.slice(0,3).map(r=>r.s))} 집중`:' ';
    const score=0.6*Math.min(share/50,1)+0.4*Math.min(share/35,1);
    cand.push({score,cls:share>=40?'bad':'warn',icon:ICON.wrench,ttl:'특정 하자유형 집중',
      sub:`<b>${esc(top[0])}</b> 미처리 <b>${fmt(top[1])}건</b> (미처리의 <b>${share.toFixed(0)}%</b>) · 주 공종 <b>${esc(tradeOf?.[0]||'-')}</b>${dtSiteLbl}<br>해당 하자유형 표준 보수절차 정비·자재 선조달로 일괄 해소 검토`});})();
  // 5. 공가세대 다수 — 공가 미처리 건수, 현장 z-score
  (()=>{const isVac=i=>isVacUnit(i); // 공식 공가세대 정의로 일원화 — 카드/탭과 동일(하자구분='세대' AND 입주상태∈{미분양,미납})
    const rows=all.map(({s})=>({s,v:siteUnr[s.id].filter(isVac).length})).filter(r=>r.v>0);if(!rows.length)return;
    const tot=rows.reduce((a,r)=>a+r.v,0);const z=zTop(rows);if(tot<30||!z)return;
    const tradeOf=agg(all.flatMap(({s})=>siteUnr[s.id].filter(isVac)),'trade')[0];
    const affSites=rows.sort((a,b)=>b.v-a.v).slice(0,3).map(r=>r.s);
    const score=0.6*Math.min(tot/150,1)+0.4*Math.min(Math.max(z.z,0)/2,1);
    cand.push({score,cls:'warn',icon:ICON.home,ttl:'공가세대 미처리 다수',
      sub:`공가세대 미처리 <b>${fmt(tot)}건</b> · 집중 ${siteList(affSites)} · 주 공종 <b>${esc(tradeOf?.[0]||'-')}</b><br>공가 일괄작업일 지정 — 단일 업체 다공종 보유 시 1회 투입으로 동선 절감`});})();
  // 6. 전월대비 접수 급증
  (()=>{if(pT<=0)return;const r=(tR-pT)/pT;if(r<=0.15)return;const z=zTop(all.filter(x=>x.st.prev.total>0).map(x=>({s:x.s,v:(x.st.tR-x.st.prev.total)/x.st.prev.total})));
    const score=0.6*chg(tR,pT,true)+0.4*Math.min(Math.max(z?.z||0,0)/2,1);
    cand.push({score,cls:'warn',icon:ICON.up,ttl:'전월대비 접수 급증',
      sub:`전체 접수 <b>${fmt(tR)}건</b> (전월대비 <b style="color:${C.rd}">${sgn(deltaIn)}</b>, <b>+${(r*100).toFixed(0)}%</b>)${z?` · 급증 <b>${sn(z.s)}</b>`:''}<br>입주 초기 피크 가능성 — 다발 공종 사전 인력·자재 확보, 신규 30일+ 진입 차단`});})();
  // 7. 전월대비 처리 급감
  (()=>{if(pRes<=0)return;const r=(tRes-pRes)/pRes;if(r>=-0.15)return;const z=zTop(all.filter(x=>x.st.prev.res>0).map(x=>({s:x.s,v:(x.st.prev.res-x.st.res)/x.st.prev.res})));
    const score=0.6*chg(tRes,pRes,false)+0.4*Math.min(Math.max(z?.z||0,0)/2,1);
    cand.push({score,cls:'bad',icon:ICON.up,ttl:'전월대비 처리량 급감',
      sub:`처리 완료 <b>${fmt(tRes)}건</b> (전월대비 <b style="color:${C.rd}">${sgn(deltaR)}</b>, <b>${(r*100).toFixed(0)}%</b>)${z?` · 급감 <b>${sn(z.s)}</b>`:''}<br>처리 동력 저하 — 협력사 가동률 점검, 주간 처리 KPI 직전월 평균 +50% 재설정`});})();
  // 8. 전월대비 미처리 급증
  (()=>{if(pU<=0)return;const r=(tU-pU)/pU;if(r<=0.1)return;const z=zTop(all.filter(x=>x.st.prev.unr>0).map(x=>({s:x.s,v:(x.st.unr-x.st.prev.unr)/x.st.prev.unr})));
    const score=0.6*chg(tU,pU,true)+0.4*Math.min(Math.max(z?.z||0,0)/2,1);
    cand.push({score,cls:'bad',icon:ICON.clock,ttl:'전월대비 미처리 급증',
      sub:`미처리 <b>${fmt(tU)}건</b> (전월대비 <b style="color:${C.rd}">${sgn(deltaU)}</b>, <b>+${(r*100).toFixed(0)}%</b>)${z?` · 급증 <b>${sn(z.s)}</b>`:''}<br>접수 대비 처리 적체 — 다발 공종 우선 배정, 미귀책건 외주 전환 가속`});})();
  // 9. 전월대비 장기미처리 급증
  (()=>{if(pLt<=0)return;const r=(tLt-pLt)/pLt;if(r<=0.1)return;const z=zTop(all.filter(x=>x.st.prev.lt>0).map(x=>({s:x.s,v:(x.st.lt-x.st.prev.lt)/x.st.prev.lt})));
    const score=0.6*chg(tLt,pLt,true)+0.4*Math.min(Math.max(z?.z||0,0)/2,1)+0.1;
    cand.push({score,cls:'bad',icon:ICON.clock,ttl:'전월대비 장기미처리 급증',
      sub:`30일+ <b>${fmt(tLt)}건</b> (전월대비 <b style="color:${C.rd}">${sgn(deltaLt)}</b>, <b>+${(r*100).toFixed(0)}%</b>)${z?` · 급증 <b>${sn(z.s)}</b>`:''}<br>신규 장기진입 가속 — 30일 도래 임박건 집중 처리, 60일+ 별도 동결 분류`});})();
  // 10. 전 현장 특정 업체·공종 미처리 다수 — 미처리 상위 10 업체 AND 상위 10 공종 조합만
  (()=>{const m={};_unrAll.forEach(i=>{const co=i.contractor||'미지정',tr=i.trade||'기타';if(co==='미지정')return;if(!_top10Co.has(co)||!_top10Tr.has(tr))return;// 상위 10 업체·공종 교차만
    const k=co+'|'+tr;if(!m[k])m[k]={co,tr,c:0,siteIds:new Set()};m[k].c++;m[k].siteIds.add(i.siteCode||i.siteName||'');});
    const rows=Object.values(m).filter(v=>v.siteIds.size>=2).sort((a,b)=>b.c-a.c);if(!rows.length)return;const top=rows[0];const share=pct(top.c,tU);if(top.c<50)return;
    // 해당 협력사+공종 조합이 있는 현장 실제 객체 찾기
    const affIds=top.siteIds;const affSites=all.filter(({s})=>affIds.has(s.id)||affIds.has(s.name)).map(({s})=>s);
    const siteLbl=affSites.length?` (${siteList(affSites)})`:` (${top.siteIds.size}개 현장)`;
    const score=0.6*Math.min(share/30,1)+0.4*Math.min(top.siteIds.size/all.length,1);
    cand.push({score,cls:share>=15?'bad':'warn',icon:ICON.layers,ttl:'전 현장 특정 업체·공종 미처리',
      sub:`<b>${top.tr} · ${top.co}</b> 미처리 <b>${fmt(top.c)}건</b>${siteLbl} · 미처리의 ${share.toFixed(0)}%<br>전사 단일 협력사 적체 — 본부 차원 합동 점검·자재 선조달, 협력사 증원 협의`});})();
  // 11. 미귀책 보수주체 비중 과다 — 쏠린 공종·업체가 미처리 상위 10 안에 있을 때만 명시
  (()=>{const nf=_unrAll.filter(i=>NONFAULT.has(i.repairParty));const share=pct(nf.length,tU);if(nf.length<50||share<25)return;
    const rows=all.map(({s})=>{const u=siteUnr[s.id];return{s,v:pct(u.filter(i=>NONFAULT.has(i.repairParty)).length,u.length)};}).filter(r=>r.v>0);const z=zTop(rows);
    const tT=agg(nf.filter(i=>_top10Tr.has(i.trade||'기타')),'trade')[0];// 상위 10 공종만
    const cT=agg(nf.filter(i=>_top10Co.has(i.contractor||'')),'contractor')[0];// 상위 10 업체만
    const pT2=agg(nf,'repairParty')[0];
    const score=0.6*Math.min(share/50,1)+0.4*Math.min(Math.max(z?.z||0,0)/2,1);
    const trCoLbl=(tT&&cT)?`<b>${tT[0]} · ${cT[0]}</b>`:(tT?`공종 <b>${tT[0]}</b>`:(cT?`업체 <b>${cT[0]}</b>`:''));
    cand.push({score,cls:share>=40?'bad':'warn',icon:ICON.box,ttl:'미귀책 보수주체 비중 과다',
      sub:`시공업체 외 보수주체 <b>${fmt(nf.length)}건</b> (미처리의 <b>${share.toFixed(0)}%</b>) · 최다 <b>${pT2?.[0]||'-'}</b>${z?` · 집중 <b>${sn(z.s)}</b>`:''}<br>쏠림: ${trCoLbl||'-'} — 품의 승인·외주 발주 우선 처리로 신속 해소`});})();

  // ── 긍정 후보 ──
  // 12. 전월대비 처리율 상승 — 괄목 현장 포함
  (()=>{if(delta<=1)return;// 1%p 초과 상승
    const byImpP=all.filter(x=>x.st.prev.total>0).map(x=>({s:x.s,imp:x.st.rate-x.st.prev.rate})).sort((a,b)=>b.imp-a.imp);
    const topUp=byImpP[0];const upSites=byImpP.filter(x=>x.imp>1).map(x=>x.s);
    const score=0.45*Math.min(delta/10,1)+0.3*Math.min((rate-60)/35,1)+0.25;// 긍정은 기본 0.25 가산
    cand.push({score,cls:'ok',icon:ICON.up,ttl:'전월대비 처리율 상승',
      sub:`처리율 <b style="color:${C.gn}">${rate.toFixed(1)}%</b> (전월대비 <b style="color:${C.gn}">+${delta.toFixed(1)}%p</b>) · 미처리 <b>${fmt(tU)}건</b> (전월대비 ${deltaU<=0?`<b style="color:${C.gn}">${sgn(deltaU)}</b>`:`<b style="color:${C.rd}">${sgn(deltaU)}</b>`})<br>${upSites.length?`개선 현장: ${siteList(upSites.slice(0,4))} — 처리 흐름 유지, 미도달 현장 집중 지원`:'전체 처리율 상승 — 협력사 현 가동률 유지 권고'}`});})();
  // 13. 전월대비 미처리 감소 (처리율 상승 없이도 미처리 자체가 줄었을 때)
  (()=>{if(deltaU>=-5||tU<=0)return;const r=Math.abs(deltaU)/Math.max(pU,1);if(r<0.05)return;
    const byDn=all.filter(x=>x.st.prev.unr>0).map(x=>({s:x.s,dn:x.st.prev.unr-x.st.unr})).filter(x=>x.dn>0).sort((a,b)=>b.dn-a.dn);
    const score=0.4*Math.min(r/0.3,1)+0.25;
    cand.push({score,cls:'ok',icon:ICON.clock,ttl:'전월대비 미처리 감소',
      sub:`미처리 <b style="color:${C.gn}">${fmt(tU)}건</b> (전월대비 <b style="color:${C.gn}">${sgn(deltaU)}</b>, <b>${(r*100).toFixed(0)}%↓</b>) · 처리율 <b>${rate.toFixed(1)}%</b><br>${byDn.length?`감소 주도: ${siteList(byDn.slice(0,3).map(x=>x.s))} — 미처리 추가 감축 목표 연속 설정`:'전반 미처리 감소 — 처리 속도 유지, 60일+ 모니터링 강화'}`});})();
  // 14. 전월대비 장기미처리 감소
  (()=>{if(deltaLt>=-5||tLt<=0)return;const r=Math.abs(deltaLt)/Math.max(pLt,1);if(r<0.05)return;
    const z=zTop(all.filter(x=>x.st.prev.lt>0&&x.st.lt<x.st.prev.lt).map(x=>({s:x.s,v:x.st.prev.lt-x.st.lt})));
    const score=0.4*Math.min(r/0.3,1)+0.2;
    cand.push({score,cls:'ok',icon:ICON.clock,ttl:'전월대비 장기미처리 감소',
      sub:`30일+ <b style="color:${C.gn}">${fmt(tLt)}건</b> (전월대비 <b style="color:${C.gn}">${sgn(deltaLt)}</b>, <b>${(r*100).toFixed(0)}%↓</b>) · 미처리 대비 <b>${ltr.toFixed(1)}%</b>${z?` · 최대개선 <b>${sn(z.s)}</b> −${fmt(z.v)}건`:''}<br>장기 적체 해소 진행 중 — 60일+ 동결건 분리 완료 후 30일 구간 가속 권고`});})();
  // 15. 전월대비 처리량 급증
  (()=>{if(pRes<=0)return;const r=(tRes-pRes)/pRes;if(r<0.15)return;const z=zTop(all.filter(x=>x.st.prev.res>0).map(x=>({s:x.s,v:(x.st.res-x.st.prev.res)/x.st.prev.res})));
    const score=0.4*Math.min(r/0.4,1)+0.2;
    cand.push({score,cls:'ok',icon:ICON.up,ttl:'전월대비 처리량 급증',
      sub:`처리 완료 <b style="color:${C.gn}">${fmt(tRes)}건</b> (전월대비 <b style="color:${C.gn}">+${(r*100).toFixed(0)}%</b>, ${sgn(deltaR)})${z?` · 선도 <b>${sn(z.s)}</b>`:''}<br>처리 동력 강화 확인 — 협력사 가동률·인력 현수준 유지, 미처리 감축 목표 추가 설정`});})();

  // 항상 노출되는 기본 카드(종합 처리 성과) — 후보 부족 시 보충용
  const byImpAll=all.filter(x=>x.st.prev.total>0).map(x=>({s:x.s,imp:x.st.rate-x.st.prev.rate}));
  const mostUp=byImpAll.slice().sort((a,b)=>b.imp-a.imp)[0],mostDn=byImpAll.slice().sort((a,b)=>a.imp-b.imp)[0];
  cand.push({score:0.05,cls:rate>=75?'ok':rate>=60?'warn':'bad',icon:ICON.up,ttl:'종합 처리 성과',
    sub:`처리율 <b>${rate.toFixed(1)}%</b> (전월대비 <b style="color:${delta>=0?C.gn:C.rd}">${delta>=0?'+':''}${delta.toFixed(1)}%p</b>) · 미처리 <b>${fmt(tU)}건</b> (전월대비 <b style="color:${deltaU<=0?C.gn:C.rd}">${sgn(deltaU)}</b>)<br>${mostUp&&mostUp.imp>0.5?`괄목 <b>${sn(mostUp.s)}</b> <b style="color:${C.gn}">+${mostUp.imp.toFixed(1)}%p</b>`:'전월 대비 큰 개선 현장 없음'}${mostDn&&mostDn.imp<-0.5?` · 문제 <b>${sn(mostDn.s)}</b> <b style="color:${C.rd}">${mostDn.imp.toFixed(1)}%p</b> 하락`:` · 전반 ${delta>=0?'개선 유지':'하락 — 본부 일정 협의'}`}`});

  // 상위 3개 선정 — 경고/불량만 뽑지 않도록 ok 후보도 반드시 1개 이상 확보
  // 1) 점수 내림차순 정렬, 중복 제목 제거
  const seen=new Set(),allItems=[];
  cand.sort((a,b)=>b.score-a.score);
  for(const c of cand){if(seen.has(c.ttl))continue;seen.add(c.ttl);allItems.push(c);}
  // 2) bad/warn 후보와 ok 후보 분리
  const badItems=allItems.filter(x=>x.cls==='bad'||x.cls==='warn');
  const okItems=allItems.filter(x=>x.cls==='ok');
  // 3) 3개 슬롯 구성: ok 후보가 있으면 최소 1개 ok 보장. bad/warn 가득 차면 최하위 1개를 ok로 교체.
  const items=[];
  if(badItems.length>=3&&okItems.length>0){
    // bad/warn 상위 2 + ok 상위 1
    items.push(badItems[0],badItems[1],okItems[0]);
  }else{
    // 그냥 점수순 상위 3
    for(const c of allItems){items.push(c);if(items.length===3)break;}
  }
  /* ⚠ 원본은 #d-insight 에 innerHTML — 여기서는 게시 문자열을 돌려준다(원본 insCleanHTML 캡처와 동일 내용) */
  return themeHTML(safeHTML(items.map(x=>`<div class="ic ${x.cls}"><div class="ic-i">${icoSVG(x.icon)}</div><div class="ic-t"><div class="ic-ttl">${x.ttl}</div><div class="ic-sub">${x.sub}</div></div></div>`).join('')));
}
function deepEncKeys(v){if(Array.isArray(v))return v.map(deepEncKeys);if(v&&typeof v==='object'){const o={};Object.keys(v).forEach(function(k){o[dfEncKey(k)]=deepEncKeys(v[k]);});return o;}return v;}
/* ── 게시용 조직 변환 — calapp S.org 를 월별 게시본에 필요한 현장·팀 구조로 변환한다. ── */
function dfOrgToDashSites(){
  return (S.org.sites||[]).filter(x=>x&&x.name).map(x=>({id:String(x.id),name:String(x.name),region:String(x.region||''),
    teamId:String(x.team||''),units:Number(x.units)||0,buildings:Number(x.buildings)||0,
    commercialUnits:Number(x.commercialUnits)||0,completionDate:String(x.completionDate||''),
    hasCommercial:!!x.hasCommercial,showVacant:x.showVacant!==false,lawsuit:!!x.lawsuit,
    lastUploadedAt:DFMETA.lastUp[x.id]||x.lastUploadedAt||''}));
}
function dfOrgToDashTeams(){
  const regs=(S.org.regions||[]).map(r=>r&&r.name).filter(n=>n&&n!=='인수 전 현장');
  return (S.org.teams||[]).map(t=>({id:String(t.id),name:String(t.name||''),regions:regs}));
}

/* ── 게시 — 원본 fb2Publish 의 구조를 그대로 따른다. 달라진 곳(⚠):
   · insightsHTML: 원본은 #d-insight DOM 캡처(insCleanHTML) — 여기서는 dfInsightsBuild 가 같은 내용을 문자열로 만든다
   · vac: 원본은 로컬 S.cmt — calapp 편집 경로는 RTDB 리프이므로 금월 리프 → 전월 리프 순으로 읽어 싣는다(이월)
   · fb2SeedPlansAnalysis 생략 — calapp 은 처리계획·분석의견을 처음부터 리프에 실시간으로 쓴다
   · 미래 게시월 정리: toastAction 대신 confirm ── */
async function dfPublish(){
  if(!isEditor()){toast('등록 권한이 없습니다(관리자 전용)');return;}
  if(!S.live||!FB.db){toast('네트워크에 연결할 수 없습니다.');return;}
  if(!Object.keys(S.def||{}).length){toast('등록할 데이터 없음 · 리스트 업로드 필요');return;}
  const btn=$('#dfPubBtn');if(btn)btn.disabled=true;
  try{
    toast('등록 준비 중…');
    dfSubSiteCfg();   /* hasCommercial/showVacant 최신화 — 게시 sites 에 실린다 */
    const rm=dfPubRm(),pm=pM(rm);
    const cap=capAll();
    /* ⚠ 686차 핵심 수정 — 예전에는 dfSites() 전부를 calc(S.def[id]||[]) 로 다시 계산해 게시했다.
       이 PC 에 원본 행이 없는 현장은 빈 배열로 계산돼 **전부 0 으로 덮였다.**
       현장 3개만 올린 PC 에서 [등록]을 누르면 나머지 현장 숫자가 통째로 0 이 됐고,
       사용자는 「숫자가 꼬였다」며 원본 앱에서 재게시해야 했다.
       이제 원본이 있는 현장만 새로 쓰고, 없는 현장은 **직전 게시본을 그대로 읽어 남긴다.** */
    const _hasRows=id=>((S.def||{})[id]||[]).length>0;
    const _keepSites=dfSites().filter(s=>!_hasRows(s.id));
    const _keepKpi={};
    for(const s2 of _keepSites){
      try{const v=(await FB.db.ref('report/'+rm+'/'+s2.id+'/kpi').once('value')).val();if(v)_keepKpi[s2.id]=dfDec(v);}catch(e){}
    }
    /* 대시보드 합계도 같은 규칙 — 새로 계산한 현장 + 직전 게시본을 남긴 현장을 함께 더한다.
       둘 다 없는 현장(한 번도 안 올린 신규)만 합계에서 빠진다. */
    const all=dfDashSites().map(s=>({s,st:_hasRows(s.id)?calc(S.def[s.id],s,rm):(_keepKpi[s.id]||null)}))
      .filter(x=>x.st&&typeof x.st.tR==='number');
    /* 합계 — 원본 rDash 단일 패스와 동일 수식 */
    let tR=0,tRes=0,tU=0,tLt=0,pR=0,pRes=0;
    for(const x of all){const st=x.st;tR+=st.tR;tRes+=st.res;tU+=st.unr;tLt+=st.lt;pR+=st.prev.total;pRes+=st.prev.res;}
    const rate=tR>0?tRes/tR*100:0,pRate=pR>0?pRes/pR*100:0;
    /* 게시 전 검토(615차) — 잘못된 파일·기준월을 마지막으로 거른다. 취소·닫기(Esc·배경)는 게시 중단. */
    const _chg=pR>0?((tR-pR)/pR*100):0;
    const goOn=await new Promise(resolve=>{
      window.__PUBOK__=resolve;
      /* 615차: 요약 대신 현장 열거 — 왼쪽부터 현장명·전체 접수·미처리·처리율(합계 행 굵게) */
      const _cell='padding:7px 2px;font-size:12.5px;font-variant-numeric:tabular-nums;';
      const _row=(a,b,c,d,bold,red)=>'<div style="display:grid;grid-template-columns:1fr 84px 74px 70px;gap:8px;align-items:center;box-shadow:inset 0 1px 0 var(--sep);'+(bold?'font-weight:700;':'')+'">'
        +'<div style="'+_cell+'min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+a+'</div>'
        +'<div style="'+_cell+'text-align:right;">'+b+'</div>'
        +'<div style="'+_cell+'text-align:right;'+(red?'color:var(--rd);font-weight:700;':'')+'">'+c+'</div>'
        +'<div style="'+_cell+'text-align:right;">'+d+'</div></div>';
      const siteRows=dfSites().map(s2=>{
        const isNew=_hasRows(s2.id);
        const k=isNew?calc(S.def[s2.id],s2,rm):_keepKpi[s2.id];
        const tag=s2.region==='인수 전 현장'?' <span style="font-size:10.5px;color:var(--lbl3)">인수 전</span>':'';
        /* ⚠ 이 PC 에 원본이 없는 현장은 「유지」로 표시한다 — 0 으로 덮이지 않는다는 걸 게시 전에 알린다 */
        if(!k)return _row(esc(s2.name)+tag+' <span style="font-size:10.5px;color:var(--lbl3)">원본 없음 · 게시 제외</span>','—','—','—',false,false);
        return _row(esc(s2.name)+tag+(isNew?'':' <span style="font-size:10.5px;color:var(--bl)">직전 게시본 유지</span>'),
          k.tR.toLocaleString(),k.unr.toLocaleString(),(k.tR>0?(k.res/k.tR*100).toFixed(1):'0.0')+'%',false,k.unr>0);}).join('');
      /* 691차: 원본 없이 유지되는 현장이 있으면 알린다 — 대시보드 추이(wks)·공종 집계(am)는 이 PC 원본으로만 계산돼 KPI 합과 어긋난다.
         운영은 월초에 전 현장을 한 번에 넣으므로 합산 로직 대신 경고로 둔다 */
      const _keepN=dfSites().filter(s2=>!_hasRows(s2.id)&&_keepKpi[s2.id]).length;
      const _keepWarn=_keepN?'<p style="font-size:12px;color:var(--rd);font-weight:700;margin:-4px 0 10px">원본 없는 현장 '+_keepN+'개는 직전 게시본으로 유지되지만, 대시보드의 주차별 추이·공종별 집계는 이 PC에 올린 현장분만 반영됩니다. 월초 전 현장 등록이 원칙입니다.</p>':'';
      openModal('사내 게시 확인',
        '<p style="font-size:12.5px;color:var(--lbl2);margin-bottom:10px">아래 내용이 맞으면 게시하세요 — 팀 전원 화면에 곧바로 반영됩니다.</p>'+_keepWarn
        +'<div class="share-row" style="padding-left:0;padding-right:0"><div class="share-info"><b>기준월</b></div><b style="font-size:14px">'+esc(rm)+'</b></div>'
        +'<div class="md-scroll" style="max-height:46vh">'
        +'<div style="display:grid;grid-template-columns:1fr 84px 74px 70px;gap:8px;font-size:11px;font-weight:700;color:var(--lbl2);padding:2px 0 4px;"><div style="padding:0 2px">현장명</div><div style="text-align:right;padding:0 2px">전체 접수</div><div style="text-align:right;padding:0 2px">미처리</div><div style="text-align:right;padding:0 2px">처리율</div></div>'
        +siteRows
        +_row('합계 · 대시보드 집계 '+dfDashSites().length+'개'+(pR>0?' · 전월 대비 '+((_chg>=0?'+':'')+_chg.toFixed(1)+'%'):''),tR.toLocaleString(),tU.toLocaleString(),rate.toFixed(1)+'%',true,true)
        +'</div>',
        '<button class="btn bg2 bsm" data-act="dfp.pubCancel">취소</button><button class="btn bp bsm" data-act="dfp.pubOk">게시</button>');
    });
    if(!goOn){toast('게시를 취소했습니다');return;}
    toast('등록 중…');
    const insightsHTML=dfInsightsBuild(all,tR,tRes,tU,tLt,rate,pRate,rm);
    const upd={};
    upd['report/'+rm+'/_dash']={wks:cap.wks||[],am:cap.am||{},insightsHTML:insightsHTML,sites:dfOrgToDashSites(),teams:dfOrgToDashTeams()};
    for(const s2 of dfSites()){ // 인수 전 현장 포함 — 대시보드 집계 제외는 유지되나 현장 개별 게시본은 전 현장에 제공(원본과 동일)
      if(!_hasRows(s2.id))continue;   /* ⚠ 686차: 원본이 없으면 아예 쓰지 않는다(직전 게시본 유지) */
      const r=calc(S.def[s2.id],s2,rm);
      const kpi=Object.assign({},r,{ul:redactUL(r.ul),lul:redactUL(r.lul),critUl:redactUL(r.critUl)}); // 캡(300) 목록 — ulz 해제 실패 시 폴백
      let ulz='';
      try{
        if(typeof LZString!=='undefined'){
          ulz=LZString.compressToBase64(JSON.stringify(slimUL(r.ul)));
        }
      }catch(e){console.warn('[게시] ulz 압축 실패 — 캡 목록으로 게시',s2.id,e);ulz='';}
      let vac={};
      try{vac=(await FB.db.ref('report/'+rm+'/'+s2.id+'/vac').once('value')).val()||{};}catch(e){}
      if(!Object.keys(vac).length){try{vac=(await FB.db.ref('report/'+pm+'/'+s2.id+'/vac').once('value')).val()||{};}catch(e){}}
      upd['report/'+rm+'/'+s2.id]={kpi:kpi,ulz:ulz,siteWks:(cap.siteWks&&cap.siteWks[s2.id])||[],siteAm:(cap.siteAm&&cap.siteAm[s2.id])||{},vac:dfDec(vac)}; /* dfDec: 리프의 인코딩 키를 되돌려 deepEncKeys 이중 인코딩 방지 */
    }
    upd['report/'+rm+'/_meta']={publishedAt:Date.now(),publishedBy:String((S.user&&S.user.email)||'').slice(0,120),rm:rm};
    upd['reportIndex/'+rm]=Date.now();
    Object.keys(upd).forEach(function(p){upd[p]=deepEncKeys(upd[p]);}); // 중첩 맵 키(하자유형/공종/보수주체 등)에 '/'·'.' 등이 있으면 거부되므로 인코딩
    await FB.db.ref().update(upd);
    /* 소비자 캐시 무효화 — 같은 화면에서 곧바로 새 게시본을 본다 */
    delete DF.cache[rm];
    Object.keys(DF.kpi).forEach(k=>{if(k.indexOf(rm+'/')===0){delete DF.kpi[k];delete DF.sw[k];delete DF.sam[k];delete DF.vac[k];}});
    {const _now=new Date().toISOString();DFMETA.pubAt=DFMETA.pubAt||{};dfSites().forEach(s2=>{if(_hasRows(s2.id))DFMETA.pubAt[s2.id]=_now;});DF._pubAt[rm]=_now;dfMetaSave();dfTopbar();if(S.view==='settings')dfProdCardFill();}   /* 697차: 미게시 현장 목록도 갱신 */   /* 688차: 게시 도장 — 이 뒤로 원본이 안 바뀌면 「미게시 변경」이 꺼진다 */
    dfProdCardFill();
    {const _n=dfSites().filter(s2=>_hasRows(s2.id)).length,_k=_keepSites.filter(s2=>_keepKpi[s2.id]).length;
     toast('등록 완료 · '+rm+' · 갱신 '+_n+'개 현장'+(_k?' · 유지 '+_k+'개':''),3500);}
    try{
      const idx=(await FB.db.ref('reportIndex').once('value')).val()||{};
      const stale=Object.keys(idx).filter(k=>/^\d{4}-\d{2}$/.test(k)&&k>rm);
      if(stale.length&&confirm('기준월('+rm+')보다 미래인 게시월 발견: '+stale.join(', ')+'\n잘못 게시된 월이면 삭제해야 뷰어 기준월이 어긋나지 않습니다. 지금 삭제하시겠습니까?')){
        const del={};stale.forEach(m=>{del['report/'+m]=null;del['reportIndex/'+m]=null;});
        await FB.db.ref().update(del);toast('게시월 삭제 완료 · '+stale.join(', '));
      }
    }catch(e){console.warn('[게시] 미래 게시월 감지 실패',e);}
  }catch(e){console.error('[게시] 실패',e);toast('등록 실패: '+((e&&e.message)||e));}
  finally{if(btn)btn.disabled=false;}
}

/* ── 게시 카드(설정 화면 · 관리자 전용) 상태 채우기 + 배선 ── */
function dfProdCardFill(){
  const card=$('#dfPubCard');if(!card)return;
  card.style.display=isEditor()&&!S.snap?'':'none';
  /* 값이 Firebase 에 있으므로 로컬 모드(!S.live)에서는
     저장 자체가 불가능하다 — 보이는데 안 되는 칸을 두지 않는다. */
  const sids=Object.keys(S.def||{});let n=0;sids.forEach(k=>{n+=(S.def[k]||[]).length;});
  /* 615차 통합 행 — 굵은 줄=이 PC 상태, 아랫줄=업로드·최신 등록 시각 */
  const st=$('#dfLocalStat');
  if(st)st.textContent=sids.length?('이 PC 데이터 · '+sids.length+'개 현장 · '+n.toLocaleString()+'건'):'업로드된 데이터 없음';
  const sub=$('#dfPubSub');
  if(sub){const h0=(DFMETA.hist||[])[0];let t=sids.length?'':'이 PC 가 마스터가 아니면 정상 · ';
    if(h0)t='업로드 '+dfFmtDT(h0.at)+' · ';
    sub.innerHTML=esc(t)+'등록 <span id="dfPubAt">—</span>';}
  const rl=$('#dfPubRm');if(rl&&document.activeElement!==rl)rl.value=dfPubRm();
  /* 697차: 등록했지만 아직 게시하지 않은 현장 — 이력보다 이게 실무에 쓸모 있다. 게시하면 사라진다 */
  const pd=$('#dfPending');
  if(pd){const ids=dfLocalDirtySites();
    pd.hidden=!ids.length;
    pd.innerHTML=ids.length?'<b>미게시 '+ids.length+'개 현장</b> — '+esc(ids.map(id=>((S.org.sites||[]).find(x=>x.id===id)||{}).name||id).join(' · ')):'';}
  dfExTkRender();
  const _fill=(id,v)=>{const e=$(id);if(e&&document.activeElement!==e)e.value=v||'';};
  const hi=$('#dfUpHist');
  if(hi){const h=DFMETA.hist||[];
    /* ⚠ 686차: slice(0,3) 이었다. meta 에는 10회가 쌓이는데 화면엔 3줄만 나와
       네 번째부터 「이력이 더 안 생긴다」로 보였다. 보관하는 만큼 그대로 보여 준다. */
    hi.innerHTML=h.length?h.map(x=>'<div>'+esc(dfFmtDT(x.at))+' · '+x.sites+'개 현장 · 기준월 '+esc(x.rm||'—')
      +(Array.isArray(x.names)&&x.names.length?'<div style="font-size:11px;color:var(--lbl3);padding-left:10px">'+esc(x.names.join(' · '))+'</div>':'')+'</div>').join('')   /* 692차: 어느 현장을 넣었는지 */
      :'—';}   /* 행수는 뺐다(사용자: 궁금하지 않음) — meta 에는 계속 남는다 */
  const at=$('#dfPubAt');
  if(at){at.textContent='—';
    if(S.live&&FB.db)FB.db.ref('report/'+dfPubRm()+'/_meta/publishedAt').once('value')
      .then(s=>{const v=s.val();if(v)at.textContent=dfFmtDT(v);}).catch(()=>{});}   /* 업로드와 같은 서식(615차) */
}
/* 제외 키워드 칩(615차) — 엔터·쉼표로 추가, ×·백스페이스로 제거. 엔진 쪽 값은 그대로 쉼표 문자열(S.exTk) */
function dfExTkList(){return String(S.exTk||'').split(',').map(x=>x.trim()).filter(Boolean);}
function dfExTkSet(list){S.exTk=list.join(', ');try{localStorage.setItem('calapp.exTk',S.exTk);}catch(_){ }dfExTkRender();}
function dfExTkRender(){
  const box=$('#dfExTkBox');if(!box)return;
  const inp=box.querySelector('#dfExTk');const keep=inp?inp.value:'';
  box.querySelectorAll('.tag-chip').forEach(x=>x.remove());
  const frag=document.createDocumentFragment();
  dfExTkList().forEach((t,i)=>{
    const c=document.createElement('span');c.className='tag-chip';
    c.append(t);
    const x=document.createElement('span');x.className='tag-x';x.textContent='×';x.dataset.i=i;
    x.setAttribute('role','button');x.setAttribute('aria-label','"'+t+'" 제거');
    c.appendChild(x);frag.appendChild(c);
  });
  box.insertBefore(frag,inp);
  if(inp)inp.value=keep;
}
function dfProdWire(){
  Object.assign(ACT,{
    'dfp.uz':()=>{const fi=document.getElementById('dfFi');if(fi)fi.click();},
    'dfp.publish':()=>dfPublish(),
    'dfp.ulCancel':()=>{cancelUL();S._wiz=null;closeModal();},
    'dfp.ulSite':el=>confirmNewSite(el.dataset.name,Number(el.dataset.idx),Number(el.dataset.total)),
    'dfp.snapAll':()=>{$$('#mbody .snap-mo').forEach(c=>{c.checked=true;});},
    'dfp.snapCancel':()=>{const r=window.__SNAPPICK__;window.__SNAPPICK__=null;closeModal();if(r)r(null);},
    'dfp.snapOk':()=>{const v=$$('#mbody .snap-mo:checked').map(c=>c.value);
      if(!v.length){toast('기준월을 한 개 이상 선택하세요');return;}
      const r=window.__SNAPPICK__;window.__SNAPPICK__=null;closeModal();if(r)r(v);},
    'df.siteRisk':el=>{closeModal();S.dfSid=el.dataset.sid;S.dfTab='risk';S.dfRiskLv='';go('defect');},
    'df.riskCell':el=>{dfRiskCellModal(el.dataset.sid,el.dataset.lv);},
    'df.riskLv':el=>{S.dfRiskLv=el.dataset.lv||'';rDefect();},
    'rec.qclear':()=>{REC.q='';const i=document.getElementById('recQ');if(i){i.value='';i.closest('.rl-q-wrap').classList.remove('has');i.focus();}const b=$('#mbody');if(b&&paintHTML(b,recBodyHTML()))ovsRefresh();recHeadSync(REC.view.length,REC.rows.length);},   /* 771차 */
    'df.riskQClear':el=>{const ns=el.dataset.ns||'site';rkState(ns).search='';if(ns==='modal'){const t=document.getElementById('rkQ');if(t){t.value='';t.closest('.rl-q-wrap').classList.remove('has');}dfRiskModalBody();}else rkRerender('site');},   /* 760차: 검색 지우기 × */
    'df.riskMapPick':el=>{const st=rkState('site');st.search=el.dataset.q||'';S.dfRiskLv='';rDefect();setTimeout(()=>{const t=document.querySelector('#view-defect .rk-card');if(t)t.scrollIntoView({block:'start',behavior:'smooth'});},50);},   /* 745차: 배치도 칸 → 표를 그 세대로 검색 */
    'df.riskLimit':el=>{const ns=el.dataset.ns||'site';rkState(ns).limit=Number(el.dataset.n)||0;rkRerender(ns);},
    'df.riskChip':el=>{const ns=el.dataset.ns||'site',st=rkState(ns),k=el.dataset.q,v=el.dataset.v;st.q=st.q||{};
      const t=String(st.q[k]||'').split(/[;,]/).map(z=>z.trim()).filter(Boolean);const i=t.indexOf(v);if(i>=0)t.splice(i,1);else t.push(v);st.q[k]=t.join(';');rkRerender(ns);},
    'df.riskSort':el=>{const ns=el.dataset.ns||'site',st=rkState(ns),k=el.dataset.k;st.sort=(st.sort&&st.sort.k===k)?{k,d:-st.sort.d}:{k,d:(k==='bu'||k==='un')?1:-1};rkRerender(ns);},
    'df.riskOpen':el=>{const ev=el.parentElement.querySelector('.rk-ev[data-ns="'+(el.dataset.ns||'site')+'"][data-i="'+el.dataset.i+'"]');if(ev){ev.hidden=!ev.hidden;el.classList.toggle('open',!ev.hidden);}},   /* 724차: 부모 행도 열림 표시 */
    'dfp.pubOk':()=>{const r=window.__PUBOK__;window.__PUBOK__=null;closeModal();if(r)r(true);},
    'dfp.pubCancel':()=>{const r=window.__PUBOK__;window.__PUBOK__=null;closeModal();if(r)r(false);},
  });
  document.addEventListener('change',e=>{
    const el=e.target;if(!el)return;
    if(el.id==='dfFi'){onFile(el.files&&el.files[0]);return;}
    if(el.id==='dfExTk'){const v=el.value.trim();if(v){el.value='';dfExTkSet(dfExTkList().concat(v.split(',').map(x=>x.trim()).filter(Boolean)));}return;}   /* blur 잔여 글도 칩으로 */
    if(el.id==='dfPubRm'){const v=el.value;if(/^\d{4}-\d{2}$/.test(v)){S.dfPubRm=v;dfMetaSave();dfProdCardFill();}return;}
  });
  /* 제외 키워드 칩 — 엔터·쉼표 추가, 빈 칸 백스페이스로 마지막 칩 제거, × 클릭 제거 */
  document.addEventListener('keydown',e=>{
    const el=e.target;if(!el||el.id!=='dfExTk')return;
    if(e.key==='Enter'||e.key===','){e.preventDefault();const v=el.value.trim();
      if(v)dfExTkSet(dfExTkList().concat(v));el.value='';return;}
    if(e.key==='Backspace'&&!el.value){const l=dfExTkList();if(l.length){l.pop();dfExTkSet(l);}}
  });
  document.addEventListener('click',e=>{
    const x=e.target.closest&&e.target.closest('#dfExTkBox .tag-x');
    if(x){const l=dfExTkList();l.splice(Number(x.dataset.i),1);dfExTkSet(l);return;}
    const bx=e.target.closest&&e.target.closest('#dfExTkBox');
    if(bx){const i=bx.querySelector('#dfExTk');if(i)i.focus();}
  });
  /* 드롭존 — 원본 uz 위임과 같은 동작 */
  document.addEventListener('dragover',e=>{const z=e.target.closest&&e.target.closest('#dfUz');if(z){e.preventDefault();z.classList.add('drag');}});
  document.addEventListener('dragleave',e=>{const z=e.target.closest&&e.target.closest('#dfUz');if(z)z.classList.remove('drag');});
  document.addEventListener('drop',e=>{const z=e.target.closest&&e.target.closest('#dfUz');if(z){e.preventDefault();z.classList.remove('drag');const f=e.dataTransfer&&e.dataTransfer.files[0];if(f)onFile(f);}});
}
/* 부팅 — 위젯(WebView2 별도 IndexedDB)·스냅샷 문서에서는 생산자 기능을 켜지 않는다 */
async function dfProdBoot(){
  if(S.snap||/[?&]w=1\b/.test(location.search))return;
  dfProdWire();
  try{await migrateDefectStore();await dfMetaLoad();await defLoadAll();}catch(e){console.warn('dfProdBoot',e);}
  dfProdCardFill();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(dfProdBoot,0));
else setTimeout(dfProdBoot,0);

/* ═══════════ 하자 생산자 ② 끝 ═══════════ */


/* ═══════════ 하자 생산자 ④ — 자연어 찾기(NLQ) 해석기 (원본 app-core.js 이식 · 614차) ═══════════
   기존 찾기 패널의 '하자' 절을 원본 NLQ 로 승격한다 — "두정역 도배 30일 이상 누수" 처럼 현장·공종·
   지연·동호·공가를 섞어 물으면 조건 칩으로 해석해 전 현장 미처리 목록에서 거른다.
   해석기(nlqParse/Chips/Apply)·사전(_nlqKeys)은 원본 그대로 — 행 원천만 calapp 에 맞춘다(⚠ 주석):
   · 마스터 PC(원본 행 보유): calc().ul — 원본 nlqRows 와 동일 수식
   · 뷰어: 게시 목록(dfList 의 DF.list 캐시) — 처음 물을 때 전 현장을 한 번 받아 둔다(dfNqWarm)
   ⚠ 원본의 패널 UI(nq-hist·전용 패널)는 이식하지 않는다 — calapp 찾기 패널이 그 자리다. */
let _dfNqCache=null,_dfNqWarm=0,_dfNqWarmProg=[0,0];   /* warm: 0 안함 · 1 진행 중 · 2 완료 · 진행률 [i,n] (615차) */
function dfNqRawRows(){
  const rm=dfRm();if(!rm)return [];
  const sites=dfDashSites();
  const hasLocal=sites.some(s=>((S.def[s.id]||[]).length));
  const key=[hasLocal?'L':'P',rm,sites.length,sites.reduce((a,s)=>a+((S.def[s.id]||[]).length)+((DF.list[rm+'/'+s.id]||[]).length),0)].join('|');
  if(_dfNqCache&&_dfNqCache.k===key)return _dfNqCache.v;
  const out=[];
  if(hasLocal){   /* 원본 nlqRows 와 동일 — 로컬 원본 행에서 미처리 목록.
                     ⚠ 원본 편집자 화면은 생 데이터를 보였지만, 여기서는 redactUL(all=true)로 마스킹해
                     게시 목록(뷰어 경로)과 같은 모양을 보인다 — 찾기 미리보기에 전화번호가 노출되지 않게(615차 E2E 에서 발견) */
    sites.forEach(s=>{
      const st=calc(S.def[s.id]||[],s,rm);
      redactUL(st.ul,true).forEach(i=>out.push(Object.assign(i,{siteName:s.name,__hc:!!s.hasCommercial})));
    });
  }else{          /* 뷰어 — 게시 목록(이미 받아 둔 것만; 워밍은 dfNqWarm) */
    sites.forEach(s=>{
      (DF.list[rm+'/'+s.id]||[]).forEach(i=>out.push(Object.assign({},i,{siteName:s.name,__hc:!!s.hasCommercial})));
    });
  }
  _dfNqCache={k:key,v:out};
  return out;
}
async function dfNqWarm(){
  if(_dfNqWarm||!S.live||!FB.db||!dfRm())return;
  const sites=dfDashSites();
  if(sites.some(s=>((S.def[s.id]||[]).length)))return;   /* 마스터 — 워밍 불필요 */
  _dfNqWarm=1;_dfNqWarmProg=[0,sites.length];
  for(const s of sites){
    try{await dfList(s.id);}catch(e){}
    _dfNqWarmProg[0]++;_dfNqCache=null;
    try{rNq();}catch(e){}   /* 현장 하나 받을 때마다 진행률·결과를 갱신(≤현장 수 회) */
  }
  _dfNqWarm=2;_dfNqCache=null;
  try{rNq();}catch(e){}
}
const NLQ_JOSA=/(에서|으로|에게|까지|부터|이랑|하고|이야|인거|인 거|랑|만|도|은|는|이|가|을|를|의|에|로|와|과)$/;
const NLQ_NOISE=/^(거|것|좀|중|해줘|알려줘|보여줘|찾아줘|줘|해|목록|건|개|다|전부|모두|세대|어때|뭐|얼마나|건수|몇)$/;
const NLQ_SYN={
  vac:['공가세대','공가','빈집'], shop:['상가','근생'],
  old:['오래된 순','오래된순','지연 순','지연순','밀린 순','오래된'], recent:['최신순','최근 순','최근순'],
  done:['처리완료','완료된','완료']
};
function _nlqKeys(names){
  const cand=new Map();
  const add=(k,n)=>{ k=(k||'').trim(); if(k.length<2)return;
    if(!cand.has(k))cand.set(k,new Set()); cand.get(k).add(n); };
  names.forEach(n=>{
    add(n,n);
    n.split(/[\s·,()\-\/]+/).forEach(w=>{ add(w,n); add(w.replace(/(역|지구|시티|아파트|단지|차)$/,''),n); });
    (n.match(/[가-힣]{2,}/g)||[]).forEach(w=>{ add(w,n); add(w.replace(/(역|지구|시티|아파트|단지|차)$/,''),n); });
  });
  const uniq=[],ambig=[];
  cand.forEach((set,k)=>{ if(set.size===1)uniq.push([k,[...set][0]]); else ambig.push(k); });
  uniq.sort((a,b)=>b[0].length-a[0].length);
  ambig.sort((a,b)=>b.length-a.length);
  return {keys:uniq,ambig:ambig};
}
function nlqDict(){
  const sites=dfDashSites().map(s=>s.name).filter(Boolean);   /* ⚠ 원본 dashSites/S.sites → calapp */
  const tr=new Set();
  dfNqRawRows().forEach(r=>{ if(r.trade)tr.add(r.trade); });   /* ⚠ 원본은 로컬 원본 행 — calapp 은 마스터·뷰어 공용 원천(dfNqRawRows) */
  const A=_nlqKeys([...new Set(sites)]), B=_nlqKeys([...tr]);
  return {siteKeys:A.keys, siteAmbig:A.ambig, tradeKeys:B.keys, tradeAmbig:B.ambig};
}
function nlqParse(q,dict){
  const D=dict||nlqDict();
  let s=' '+String(q||'').trim()+' ';
  const R={site:null,trades:[],delay:null,vac:false,shop:false,dong:null,ho:null,sort:null,doneAsked:false};
  const rx=v=>new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g');
  const eat=(re,fn)=>{ s=s.replace(re,(...a)=>{ fn(...a); return ' '; }); };
  eat(/(\d+)\s*일\s*(이상|넘는|넘은|넘어|초과)/g,(m,n)=>R.delay={op:'gte',n:+n});
  eat(/(\d+)\s*일\s*(미만|이내|이하)/g,(m,n)=>R.delay={op:'lt',n:+n});
  eat(/장기\s*미?처리?/g,()=>{ R.delay=R.delay||{op:'gte',n:30}; });
  eat(/미처리/g,()=>{});                     // 목록 자체가 미처리라 조건이 아니다
  eat(/(\d+)\s*동/g,(m,n)=>R.dong=String(+n));
  eat(/(\d+)\s*호/g,(m,n)=>R.ho=String(+n));
  NLQ_SYN.done.forEach(v=>eat(rx(v),()=>R.doneAsked=true));
  NLQ_SYN.vac.forEach(v=>eat(rx(v),()=>R.vac=true));
  NLQ_SYN.shop.forEach(v=>eat(rx(v),()=>R.shop=true));
  NLQ_SYN.old.forEach(v=>eat(rx(v),()=>R.sort='old'));
  NLQ_SYN.recent.forEach(v=>eat(rx(v),()=>R.sort='new'));
  D.tradeKeys.forEach(kv=>eat(rx(kv[0]),()=>{ if(!R.trades.includes(kv[1]))R.trades.push(kv[1]); }));
  D.siteKeys.forEach(kv=>eat(rx(kv[0]),()=>{ R.site=R.site||kv[1]; }));
  // 여러 현장이 함께 쓰는 말은 조건이 되지 못한다 — 못 알아들은 말로 보고하지 말고 따로 알린다
  D.siteAmbig.concat(D.tradeAmbig).forEach(v=>eat(rx(v),()=>{ R.ambig=v; }));
  // 남은 말은 버리지 않고 '본문 검색어'로 쓴다 — 접수내용·하자유형·공간·업체까지 훑는다
  R.text=s.split(/[\s,·]+/).map(w=>w.replace(NLQ_JOSA,'').trim()).filter(w=>w&&!NLQ_NOISE.test(w));
  R.empty=!(R.site||R.trades.length||R.delay||R.vac||R.shop||R.dong||R.ho||R.text.length);
  return {R};   // 본문 검색어는 R.text 하나로 전달
}
function nlqChips(R){
  const c=[];
  if(R.site)c.push(['현장',R.site]);
  if(R.trades.length)c.push(['공종',R.trades.join(', ')]);
  if(R.delay)c.push(['지연',R.delay.op==='gte'?(R.delay.n+'일 이상'):(R.delay.n+'일 미만')]);
  if(R.vac)c.push(['구분','공가세대']);
  if(R.shop)c.push(['구분','상가']);
  if(R.dong)c.push(['동',R.dong+'동']);
  if(R.ho)c.push(['호',R.ho+'호']);
  if(R.text&&R.text.length)c.push(['내용',R.text.join(' ')]);
  if(R.sort)c.push(['정렬',R.sort==='old'?'오래된 순':'최근 순']);
  return c;
}
function nlqApply(rows,R){
  const out=(rows||[]).filter(r=>{
    if(R.site&&(r.siteName||'')!==R.site)return false;
    if(R.trades.length&&!R.trades.includes(r.trade||'기타'))return false;
    if(R.co&&(r.contractor||'(미기재)')!==R.co)return false;   // 업체별 표에서 목록을 열 때
    if(R.dong&&String(r.building||'').replace(/[^0-9]/g,'')!==R.dong)return false;
    if(R.ho&&String(r.unit||'').replace(/[^0-9]/g,'')!==R.ho)return false;
    if(R.vac&&!isVacUnit(r))return false;
    if(R.shop&&!r.__hc)return false;
    if(R.delay){ const d=Number(r.delayDays)||0;
      if(R.delay.op==='gte'&&!(d>=R.delay.n))return false;
      if(R.delay.op==='lt'&&!(d<R.delay.n))return false; }
    if(R.text&&R.text.length){
      const hay=[r.siteName,r.building,r.unit,r.space,r.trade,r.defectType,r.receiptContent,
                 r.defectClass,r.saleStatus,r.repairParty,r.contractor,r.repairContractor,r.receiptDate]
                .filter(Boolean).join(' ').toLowerCase();
      for(const w of R.text){ if(hay.indexOf(w.toLowerCase())<0)return false; }   // 모두 포함(AND)
    }
    return true;
  });
  if(R.sort==='old')out.sort((a,b)=>(Number(b.delayDays)||0)-(Number(a.delayDays)||0));
  else if(R.sort==='new')out.sort((a,b)=>(Number(a.delayDays)||0)-(Number(b.delayDays)||0));
  return out;
}
/* ═══════════ 하자 생산자 ④ 끝 ═══════════ */




/* ═══════════ 하자처리 현황 — 현재 앱의 하자 관리 화면 ═══════════
   대시보드·현장 패널은 이 앱의 공통 UI 규칙으로 구성한다.
   HCS 원본 행은 관리자 업로드로 이 앱의 로컬 저장소에 보관하고, 집계·게시는 이 앱에서 수행한다.
   숫자의 단일 출처는 게시본:
   - report/{rm}/_dash : wks(주차 누계)·am(공종별 미처리)·insightsHTML·sites·teams
   - report/{rm}/{sid} : kpi(calc 전체 — weekly·monthly·trAgg·coAgg·top·topLt·prev·vacU·vacS…)
                          ·siteWks(추이차트용)·siteAm(도넛용)·vac(공가 입력값)·ulz(미처리 목록 압축) */
/* ⚠ noAnim 은 기본이 **켜짐**이다(351차) — 차트 등장 애니메이션은 큰 표가 함께 그려질 때 렉만 남기고
   정보를 더해 주지 않는다. 인쇄·사이드바 토글에서 잠시 끄던 스위치를 상시로 돌린 것이라
   그 경로들은 손대지 않아도 그대로 동작한다 */
const DF={cache:{},kpi:{},sw:{},sam:{},vac:{},plans:{},list:{},ch:{},local:{},busy:false,lastDash:null,noAnim:true};
/* 도넛 팔레트 — 686차: 고정 12색 배열을 버리고 **양 끝만 정해 개수에 맞춰 나눈다.**
   ⚠ 예전에는 12색을 순환했다. 현장 도넛은 현장 수를 자르지 않으므로(공종 도넛만 상위 11+기타)
      현장이 13개가 되는 순간 13번째가 배열을 한 바퀴 돌아 첫 색(가장 진한 남색)으로 되돌아왔고,
      옅어지던 띠 끝에 진한 조각이 박혀 순서가 끊겨 보였다.
   ⚠ 가운데 앵커(브랜드 파랑)를 하나 둔다. 짙은 남색→연한 하늘을 곧바로 이으면 중간이 회색으로
      죽는다(실측: 8칸의 4번째가 #929CAC). 양 끝은 고정이고 중간만 파랑을 지난다.
   ⚠ 섞기는 제곱 공간에서 한다 — sRGB 를 그대로 선형 보간하면 중간이 탁해진다. */
const DF_PAL_A='#1F2B4C',DF_PAL_M='#3E71D2',DF_PAL_B='#DCE9F8';
function dfRamp(n){
  const hx=c=>[1,3,5].map(i=>parseInt(c.substr(i,2),16));
  const A=hx(DF_PAL_A),M=hx(DF_PAL_M),B=hx(DF_PAL_B),m=Math.max(1,n|0),out=[];
  const mix=(x,y,t)=>'#'+[0,1,2].map(k=>Math.round(Math.sqrt(x[k]*x[k]*(1-t)+y[k]*y[k]*t))
    .toString(16).padStart(2,'0')).join('').toUpperCase();
  for(let i=0;i<m;i++){
    const t=m<=1?0:i/(m-1);
    out.push(t<=0.5?mix(A,M,t*2):mix(M,B,(t-0.5)*2));
  }
  return out;
}
/* 게시본 키 복원 — 게시 때 deepEncKeys 로 인코딩된 중첩 맵 키(공종·하자유형 등)를 되돌린다 */
function dfDecKey(k){try{return decodeURIComponent(String(k));}catch(e){return String(k);}}
function dfEncKey(k){return encodeURIComponent(String(k==null?'':k)).replace(/\./g,'%2E');}   /* 원본 fbEncKey 와 동일 — 쓰기 키 규칙 통일 */
function dfDec(v){if(Array.isArray(v))return v.map(dfDec);if(v&&typeof v==='object'){const o={};Object.keys(v).forEach(k=>{o[dfDecKey(k)]=dfDec(v[k]);});return o;}return v;}
function dfPrevMonth(rm){
  const m=/^(\d{4})-(\d{2})$/.exec(String(rm||''));if(!m)return '';
  const d=new Date(Number(m[1]),Number(m[2])-1,1);d.setMonth(d.getMonth()-1);
  return d.getFullYear()+'-'+pad(d.getMonth()+1);
}
function dfEnds(rm){
  const p=String(rm).split('-').map(Number);
  const rmEnd=rm+'-'+pad(new Date(p[0],p[1],0).getDate());
  const pm=dfPrevMonth(rm),pp=pm.split('-').map(Number);
  const pmEnd=pm?pm+'-'+pad(new Date(pp[0],pp[1],0).getDate()):'';
  return{rmEnd,pmEnd};
}
/* 현장 목록 — 사이드바와 동일한 팀 필터. 대시보드 집계는 원본과 같이 '인수 전 현장' 권역 제외 */
/* 보고 있는 기준월 — 기본은 최신 게시월(ORG_RM), 상단바에서 지난 게시월을 골라 볼 수 있다 */
function dfRm(){return S.dfRmSel||ORG_RM;}
/* 하자 관리 화면에서 감춘 현장 — ⚠ 현장 레코드에 두면 안 된다.
   calapp/org 스냅샷이 S.org.sites 를 통째로 갈아끼우면 지워진다(규칙도 정해진 필드만 허용).
   그래서 조직과 무관한 calapp/cfg 에 현장 id 만 모아 둔다(팀 전체 공유) */
function dfHidden(){return (S.cfg&&S.cfg.dfHide)||{};}
function dfIsHidden(id){return !!dfHidden()[id];}
/* 하자 관리가 다루는 현장 — 대시보드·집계·사이드바가 모두 이 목록을 쓴다.
   dfHide 는 현장 관리에서 끈 마이너 현장(현장 자체와 업무는 그대로 남고 하자 화면에서만 빠진다) */
function dfSites(){const{team}=tkSel();return (S.org.sites||[]).filter(x=>x.name&&!dfIsHidden(x.id)&&(!team||!x.team||x.team===team.id));}
function dfDashSites(){return dfSites().filter(x=>x.region!=='인수 전 현장');}
/* ── 표 공유 헬퍼 — 원본 tblNF/tblDlt/tblLtrCells/tblMetrics 포트(월별·주차별·대시보드 월별표 단일 출처) ── */
const dfNF=n=>(n||0).toLocaleString();
const dfDeltaParts=dN=>({dArrow:dN===0?'─':dN>0?'▲':'▼',dBadge:dN===0?'bgr':dN>0?'brd':'bgn',
  dTxt:dN===0?'0':`${dN>0?'+':'−'}${Math.abs(dN).toLocaleString()}`});
const dfDlt=(d,isFirst,cur,u)=>{
  if(isFirst)return'<span class="na">—</span>';
  const tt=(typeof cur==='number')?` data-tip="전${u||'월'} ${(cur-d).toLocaleString()} → 금${u||'월'} ${cur.toLocaleString()}"`:'';
  if(d===0)return`<span class="ba bgr"${tt}>─ 0</span>`;
  const cls=d>0?'brd':'bgn',sign=d>0?'+':'−',arrow=d>0?'▲':'▼';
  return`<span class="ba ${cls}"${tt}>${arrow} ${sign}${Math.abs(d).toLocaleString()}</span>`;};
/* 막대 툴팁 — 짚은 구간 하나만 말한다(391차). 예전에는 현장명 + 세 구간을 한 줄에 몰아 넣어
   정작 어디를 짚었는지가 묻혔다. 구간별로 따로 달므로 이름도 필요 없다 */
const dfLtrTip=(lbl,n,unr)=>lbl+' '+Number(n).toLocaleString()+'건'+(unr>0?' ('+(n/unr*100).toFixed(1)+'%)':'');
const dfLtrBar=(unr,d60,d30,d0)=>{
  d60=Math.max(0,Number(d60)||0);d30=Math.max(0,Number(d30)||0);d0=Math.max(0,Number(d0)||0);unr=Math.max(0,Number(unr)||0);   /* 427차: 인자 어긋남·이상치 방어 */   /* 이름은 더 쓰지 않는다 — 툴팁이 구간별로 갈라졌다(391차) */
  const ltr=unr>0?((d60+d30)/unr*100):0;
  const p60=unr>0?Math.min(d60/unr*100,100):0,p30=unr>0?Math.min(d30/unr*100,100):0,p0=unr>0?Math.min(d0/unr*100,100):0;
  const seg=(cls,lbl,n,w)=>w>0?`<div class="seg ${cls}" style="width:${w.toFixed(1)}%" data-tip="${esc(dfLtrTip(lbl,n,unr))}"></div>`:'';
  return`<div class="ltrbar-wrap"><div class="ltrbar">${seg('s60','60일 이상',d60,p60)}${seg('s30','30~59일',d30,p30)}${seg('s0','30일 미만',d0,p0)}</div><span class="ltrbar-pct">${ltr.toFixed(1)}%</span></div>`;};
const dfLtrCells=(d0,d30,d60,unr,ltDlt,isFirst,u)=>{
  const lt=d30+d60;
  return`<td class="cc ltr-red tl-grp-ltr">${dfNF(lt)}</td><td class="cc tl-grp-ltr">${dfLtrBar(unr,d60,d30,d0)}</td><td class="cc">${dfDlt(ltDlt,isFirst,lt,u)}</td>`;};
const dfMetrics=(cur,prev,prev2)=>{const tR=cur.r,cumRes=cur.res,unr=cur.u,d0=cur.d0,lt=cur.d30+cur.d60;
  const rate=tR>0?(cumRes/tR*100):0;
  const recvW=prev?cur.r-prev.r:cur.r;const resW=prev?cur.res-prev.res:cur.res;
  const prevResW=prev?(prev2?prev.res-prev2.res:prev.res):0;
  const prevLt=prev?(prev.d30+prev.d60):0,prevUnr=prev?prev.u:0;
  return{tR,cumRes,unr,d0,d30:cur.d30,d60:cur.d60,lt,rate,recvW,resW,resWDlt:resW-prevResW,ltDlt:lt-prevLt,unrDlt:unr-prevUnr};};
const dfTh=(cls,txt)=>`<th class="cc ${cls}">${txt}</th>`;
const dfThG=(cls,txt)=>`<th class="cc ${cls} tl-grp">${txt}</th>`;
/* kpi.weekly(calcW 행: {week,r,res,u,d0,d30,d60,m,sun,wn,label})에서 금월말·전월말 스냅샷을 뽑는다.
   ⚠ 예전 구현은 siteWks(cumR·cumRes…)를 잘못 읽어 라벨이 비고 전월값이 없었다 — weekly 가 단일 출처다. */
function dfStFromWeekly(weekly,rm){
  const z={r:0,res:0,u:0,d0:0,d30:0,d60:0};
  const{rmEnd,pmEnd}=dfEnds(rm);
  let cur=null,prev=null;
  (weekly||[]).forEach(w=>{if(!w||!w.week)return;
    if(w.week<=rmEnd&&(!cur||w.week>cur.week))cur=w;
    if(pmEnd&&w.week<=pmEnd&&(!prev||w.week>prev.week))prev=w;});
  cur=cur||z;prev=prev||z;
  const mk=w=>{const lt=w.d30+w.d60;return{total:w.r,res:w.res,unr:w.u,rate:w.r>0?w.res/w.r*100:0,lt,ltr:w.u>0?lt/w.u*100:0,dd:[w.d0,w.d30,w.d60]};};
  const c=mk(cur),p=mk(prev);
  return{tR:c.total,res:c.res,unr:c.unr,rate:c.rate,lt:c.lt,ltr:c.ltr,dd:c.dd,prev:p};
}
/* 월말 스냅샷 — 원본 moSnapsSite/moSnapsDash 포트(월별 표 단일 출처) */
function dfMoSnapsSite(weekly){const map={};(weekly||[]).forEach(w=>{const mk=String(w.week||'').slice(0,7);
    /* ⚠ dash 쪽(dfMoSnapsDash)처럼 월 숫자(m)를 월키에서 파생시켜 둔다 — 주간 레코드에 m 이 없으면
       월별 표 라벨이 'undefined월'로 찍힌다(223차 인쇄 점검에서 확인). 레코드에 m 이 있으면 그 값이 이긴다. */
    map[mk]={m:Number(mk.slice(5,7)),...w};});
  return{keys:Object.keys(map).filter(k=>k&&k<=S.dfRm).sort(),map};}
function dfMoSnapsDash(wkBySite){
  const arrs=Object.values(wkBySite||{}).map(a=>(a||[]).slice().sort((x,y)=>x.week<y.week?-1:1)).filter(a=>a.length);
  const keys=[...new Set(arrs.flatMap(a=>a.map(w=>w.week.slice(0,7))))].filter(k=>k<=S.dfRm).sort();
  const map={};
  keys.forEach(mk=>{const a={r:0,res:0,u:0,d0:0,d30:0,d60:0};
    arrs.forEach(arr=>{let last=null;for(const w of arr){if(w.week.slice(0,7)<=mk)last=w;else break;}
      if(last){a.r+=last.r;a.res+=last.res;a.u+=last.u;a.d0+=last.d0;a.d30+=last.d30;a.d60+=last.d60;}});
    map[mk]={week:mk,m:Number(mk.slice(5,7)),...a};});
  return{keys,map};
}
/* ── 게시본 읽기 ── */
async function dfRef(path){return dfDec((await FB.db.ref(path).once('value')).val());}
/* 현장 토글(공가세대 표시·공가상가 포함) — 원본이 siteConfig/{sid} 리프에 실시간으로 쓴다.
   게시본 _dash/sites 는 게시 시점의 스냅샷이라 이 리프가 항상 우선이다(fb2SubSiteConfig 와 동일 규칙). */
/* siteConfig 적용부 — 구독 콜백과 org 스냅샷 직후(원본 역전 · 614차) 양쪽에서 부른다 */
function dfApplySiteCfg(cfg){
  let changed=false;
  for(const sid in (cfg||{})){
    const c=cfg[sid]||{},x=(S.org.sites||[]).find(y=>y.id===sid);if(!x)continue;
    if(typeof c.hasCommercial==='boolean'&&x.hasCommercial!==c.hasCommercial){x.hasCommercial=c.hasCommercial;changed=true;}
    if(typeof c.showVacant==='boolean'&&(x.showVacant!==false)!==c.showVacant){x.showVacant=c.showVacant;changed=true;}
    if(typeof c.lawsuit==='boolean'&&!!x.lawsuit!==c.lawsuit){x.lawsuit=c.lawsuit;changed=true;}   /* 771차 */
  }
  return changed;
}
function dfSubSiteCfg(){
  if(DF._cfgBound||!S.live||!FB.db)return;DF._cfgBound=true;
  FB.db.ref('siteConfig').on('value',snap=>{
    const cfg=snap.val()||{};
    DF._cfgLast=cfg;   /* ⚠ 614차: calapp/org 스냅샷이 S.org 를 갈아끼운 뒤 다시 입히기 위한 보관본 */
    if(!dfApplySiteCfg(cfg))return;   /* 값이 같은 에코는 다시 그리지 않는다(깜빡임 방지) */
    if(S.view==='defect')rDefect();
    if(S.view==='org')rOrg();
  });
}
async function dfLoad(){
  const rm=dfRm();
  if(!S.live||!FB.db||!rm){S.dfRm='';return null;}
  S.dfRm=rm;
  if(DF.cache[rm])return DF.cache[rm];
  if(DF.busy)return null;
  DF.busy=true;
  try{
    const sites=dfSites();
    const[wks,am,ins]=await Promise.all([
      dfRef('report/'+rm+'/_dash/wks'),dfRef('report/'+rm+'/_dash/am'),
      FB.db.ref('report/'+rm+'/_dash/insightsHTML').once('value').then(s=>String(s.val()||''))]);
    /* 대시보드 표·월별표·전월대비는 현장별 kpi/weekly(가벼운 부분 경로)만 읽는다 — kpi 전체(목록 포함)는 무겁다 */
    const wk={};
    const hh={};   /* 711차: 현장별 세대 레벨 개수(작다) */
    await Promise.all(sites.map(async s=>{
      try{wk[s.id]=(await dfRef('report/'+rm+'/'+s.id+'/kpi/weekly'))||[];}catch(e){wk[s.id]=[];}
      try{hh[s.id]=(await dfRef('report/'+rm+'/'+s.id+'/kpi/hh/cnt'))||null;}catch(e){hh[s.id]=null;}
    }));
    DF.cache[rm]={rm,wks:Array.isArray(wks)?wks:[],am:am||{},ins,wk,hh};
    return DF.cache[rm];
  }catch(e){console.warn('[하자] 게시본 읽기 실패',e);return null;}
  finally{DF.busy=false;}
}
/* 686차: 이 PC 에 원본 행이 있는 현장인가 — 업로드한 마스터 PC 에서만 참이다.
   ⚠ 게시 여부와 무관하다. 업로드 직후(게시 전)에도 참이다. */
function dfLocalRows(sid){const a=(S.def||{})[sid];return (a&&a.length)?a:null;}
/* 688차: 이 PC 원본이 마지막 게시보다 새것인가. 게시 시각은 DFMETA.pubAt(로컬 meta) — 서버를 안 묻고도 판정된다.
   ⚠ 원본이 있어도 게시 뒤 그대로면 거짓 — 686차의 「미게시 반영」 배지가 게시 뒤에도 남던 오류를 이렇게 가른다 */
/* 699차: 게시 시각은 **서버**(report/{rm}/_meta/publishedAt)도 본다. 이 PC 도장(pubAt)만 보면 다른 PC 가 나중에 게시해도
   이 PC 의 옛 원본이 「미게시 변경」으로 남아 현장 화면이 옛 데이터(5월본)로 그려졌다 — 강력 새로고침으로도 안 풀리던 사고.
   DF._pubAt[rm] 은 dfPubAtLoad() 가 채운다(비동기). 아직 못 읽었으면 로컬 도장만으로 판정한다 */
DF._pubAt={};
async function dfPubAtLoad(rm){
  rm=rm||dfRm();if(!rm||!S.live||!FB.db)return '';
  if(DF._pubAt[rm]!==undefined)return DF._pubAt[rm];
  try{const v=await dfRef('report/'+rm+'/_meta/publishedAt');DF._pubAt[rm]=v?new Date(Number(v)||v).toISOString():'';}
  catch(e){DF._pubAt[rm]='';}
  return DF._pubAt[rm];
}
function dfLocalDirty(sid){
  if(!dfLocalRows(sid))return false;
  const up=(DFMETA.lastUp||{})[sid]||'',pbL=(DFMETA.pubAt||{})[sid]||'',pbS=DF._pubAt[dfRm()]||'';
  const pb=pbL>pbS?pbL:pbS;
  return !pb||(!!up&&up>pb);
}
function dfLocalDirtySites(){return dfSites().filter(s=>dfLocalDirty(s.id)).map(s=>s.id);}
/* 686차: 로컬 원본으로 현장 화면 값을 그 자리에서 계산한다 — 원본 앱이 그랬듯 업로드하면 바로 보인다.
   ⚠ 게시본을 덮어쓰지 않는다. 이 PC 화면에만 쓰고, 팀 화면은 여전히 [등록]을 눌러야 바뀐다.
   ⚠ 게시 경로(dfPublish)와 같은 calc()·capAll() 을 쓴다 — 미리 보는 숫자와 게시될 숫자가 어긋나면 안 된다. */
/* 690차: capAll() 은 이 PC 원본 전부를 훑는다 — 현장마다 다시 부르면 14현장 × 전량 계산이라 마스터 PC 진입이 느렸다.
   원본 지문(기준월 + 현장별 업로드 시각)이 같으면 한 번 계산한 것을 다시 쓴다 */
let _dfCap={key:'',val:null};
function dfCapCached(rm){
  const key=rm+'|'+JSON.stringify(DFMETA.lastUp||{})+'|'+Object.keys(S.def||{}).map(k=>k+':'+((S.def[k]||[]).length)).join(',');
  if(_dfCap.key!==key){_dfCap={key,val:capAll()};}
  return _dfCap.val;
}
function dfLocalSiteData(sid,rm){
  const rows=dfLocalRows(sid);if(!rows)return null;
  /* 690차: 로컬 원본으로 그리는 건 등록~게시 사이뿐. 게시한 뒤엔 마스터 PC 도 게시본을 읽는다(팀과 같은 화면 · 진입 빠름).
     서버가 없을 때(로컬 모드·오프라인)만 원본으로 계속 그린다 */
  if(!dfLocalDirty(sid)&&S.live&&FB.db)return null;
  const site=dfSites().find(x=>x.id===sid);if(!site)return null;
  try{
    const cap=dfCapCached(rm);
    return {kpi:calc(rows,site,rm),
      sw:(cap.siteWks&&cap.siteWks[sid])||[],
      sam:(cap.siteAm&&cap.siteAm[sid])||{}};
  }catch(e){console.warn('[하자] 로컬 미리보기 계산 실패',sid,e);return null;}
}
/* 현장 하나를 열 때 — kpi 전체·추이·도넛·공가 입력값을 병렬로 읽는다 */
async function dfSiteData(sid){
  const rm=dfRm();if(!rm||!sid)return null;
  const k=rm+'/'+sid;
  if(DF.kpi[k]!==undefined)return DF.kpi[k];
  if(dfLocalRows(sid)&&DF._pubAt[rm]===undefined){await dfPubAtLoad(rm);dfTopbar();}   /* 699차: 로컬 판정 전에 서버 게시 시각을 확보 */
  /* ⚠ 686차: 이 PC 에 원본이 있으면 게시본을 기다리지 않고 로컬 계산을 먼저 쓴다.
     공가 입력값(vac)만은 여럿이 같이 쓰는 값이라 게시본에서 계속 읽는다. */
  const loc=dfLocalSiteData(sid,rm);
  if(loc){
    DF.kpi[k]=loc.kpi;DF.sw[k]=loc.sw;DF.sam[k]=loc.sam;DF.local=DF.local||{};DF.local[k]=true;
    DF.vac[k]=DF.vac[k]||{};
    if(S.live&&FB.db)dfRef('report/'+rm+'/'+sid+'/vac').then(v=>{DF.vac[k]=v||{};}).catch(()=>{});
    return DF.kpi[k];
  }
  if(!S.live||!FB.db)return null;
  try{
    const[kpi,sw,sam,vac]=await Promise.all([
      dfRef('report/'+rm+'/'+sid+'/kpi'),dfRef('report/'+rm+'/'+sid+'/siteWks'),
      dfRef('report/'+rm+'/'+sid+'/siteAm'),dfRef('report/'+rm+'/'+sid+'/vac')]);
    DF.kpi[k]=kpi||null;DF.sw[k]=Array.isArray(sw)?sw:[];DF.sam[k]=sam||{};DF.vac[k]=vac||{};
  }catch(e){console.warn('[하자] 현장 자료 읽기 실패',e);DF.kpi[k]=null;DF.sw[k]=[];DF.sam[k]={};DF.vac[k]={};}
  return DF.kpi[k];
}
/* 대시보드 업체별 축 — 전 현장 kpi 를 그때 처음 읽는다(무거워서 누르기 전에는 안 받는다) */
async function dfAllKpi(){
  const rm=dfRm(),list=dfDashSites();
  for(let i=0;i<list.length;i++){
    if(DF.kpi[rm+'/'+list[i].id]===undefined){toast('현장 자료 받는 중… ('+(i+1)+'/'+list.length+')');await dfSiteData(list[i].id);}
  }
}
/* 처리계획 — 현장별·기준월별 저장(plans/{현장}/{필드}/{기준월@공종}) */
function dfPlanKey(rm,trade){return encodeURIComponent(rm+'@'+trade).replace(/\./g,'%2E');}
async function dfLoadPlans(sid){
  if(!S.live||!FB.db||!sid)return {};
  if(DF.plans[sid])return DF.plans[sid];
  try{DF.plans[sid]=(await FB.db.ref('plans/'+sid).once('value')).val()||{};}
  catch(e){DF.plans[sid]={};}
  return DF.plans[sid];
}
function dfPlanGet(sid,field,rm,trade){
  const m=(DF.plans[sid]||{})[field]||{};
  return m[dfPlanKey(rm,trade)]||'';
}
function dfPlanSet(sid,field,rm,trade,val){
  const key=dfPlanKey(rm,trade),v=String(val||'').slice(0,5000);
  if(!DF.plans[sid])DF.plans[sid]={};
  if(!DF.plans[sid][field])DF.plans[sid][field]={};
  DF.plans[sid][field][key]=v;
  if(S.live&&FB.db)FB.db.ref('plans/'+sid+'/'+field+'/'+key).set(v).catch(()=>toast('처리계획 저장 실패'));
}
/* 현재 열어 둔 현장의 처리계획·분석 의견 실시간 구독.
   입력 중인 칸은 타이핑이 덮어쓰지 않도록 보호한다. */
function dfSubSite(sid){
  const skey=dfRm()+'/'+sid;   /* 기준월이 바뀌면 vac 경로도 바뀐다 — rm 포함 키로 재구독 */
  if(DF._sub&&DF._sub.sid===skey)return;
  if(DF._sub)DF._sub.offs.forEach(f=>{try{f();}catch(e){}});
  DF._sub={sid:skey,offs:[]};
  if(!S.live||!FB.db||!sid)return;
  /* 공가 수(미분양·미키불출)는 현재 앱의 게시본 리프이며, 이 앱에서 수정하면 즉시 반영된다. */
  {const vref=FB.db.ref('report/'+dfRm()+'/'+sid+'/vac');
   const vh=vref.on('value',snap=>{
     DF.vac[skey]=dfDec(snap.val())||{};
     if(S.view==='defect'&&S.dfSid===sid&&(S.dfTab==='vac'||S.dfTab==='store'))rDefect();
   });
   DF._sub.offs.push(()=>vref.off('value',vh));}
  const pref=FB.db.ref('plans/'+sid);
  const ph=pref.on('value',snap=>{
    DF.plans[sid]=snap.val()||{};
    $$('#view-defect .plan-ta').forEach(ta=>{
      if(ta===document.activeElement||ta.dataset.act!=='df.plan')return;
      const v=dfPlanGet(sid,ta.dataset.f,S.dfRm,ta.dataset.t);
      if(ta.value!==v){ta.value=v;dfPlanFit(ta);}
    });
  });
  DF._sub.offs.push(()=>pref.off('value',ph));
}
/* ── 차트 공통 — 원본과 같은 구성, 색은 토큰에서 읽는다 ── */
function cvar(n,f){try{const v=getComputedStyle(document.documentElement).getPropertyValue(n).trim();return v||f;}catch(e){return f;}}
function dfC(k){if(DF.ch[k]){DF.ch[k].$destroyed=true;try{DF.ch[k].destroy();}catch(e){}delete DF.ch[k];}}
/* 762차: 무거운 vendor 는 첫 화면에서 안 읽는다(회사 PC 초기 로드 부담). Chart.js(208KB+13KB)는 하자 화면을 처음 열 때, 지도(korea-geo 574KB+apt-geo)는 조직 관리 지도를 처음 그릴 때. 읽히면 그 화면을 한 번 다시 그린다 */
let _chartP=null,_geoP=null;
function loadScriptOnce(src){return new Promise((res,rej)=>{const el=document.createElement('script');el.src=src;el.onload=()=>res(true);el.onerror=()=>rej(new Error(src));document.head.appendChild(el);});}
function loadChart(){
  if(typeof Chart!=='undefined')return Promise.resolve(true);
  if(_chartP)return _chartP;
  _chartP=loadScriptOnce('./vendor/chart.umd.min.js').then(()=>loadScriptOnce('./vendor/chartjs-plugin-datalabels.min.js').catch(()=>true)).catch(e=>{_chartP=null;throw e;});
  return _chartP;
}
function loadGeo(){
  if(window.KRGEO)return Promise.resolve(true);
  if(_geoP)return _geoP;
  _geoP=loadScriptOnce('./vendor/korea-geo.js?v=635').then(()=>loadScriptOnce('./vendor/apt-geo.js?v=635').catch(()=>true)).catch(e=>{_geoP=null;throw e;});
  return _geoP;
}
/* 782차: 추이 차트용 HTML 툴팁 — 이름(왼쪽) / 값(오른쪽) 두 열. 커서 아래 15px */
function chTipHide(){const t=document.getElementById('chTip');if(t)t.classList.remove('on');}
function chTipDraw(ctx){
  const {chart,tooltip}=ctx;
  /* 782차: 캔버스 밖으로 나가면 닫는다 — Chart 는 마우스가 캔버스를 벗어나면 external 을 더 부르지 않는다.
     mouseleave 가 늦게(또는 안) 오는 경우가 있어 document 의 mousemove 로도 판정한다 */
  if(!chart.canvas.__tipOut){chart.canvas.__tipOut=1;
    /* 784차: 커서 좌표를 직접 기억한다 — tooltip.caretY 는 「데이터 점」의 y 라 계열이 바뀔 때마다 툴팁이 세로로 튀었다(781차 캔버스 툴팁은 마우스 y 를 썼다) */
    chart.canvas.addEventListener('mousemove',e=>{chart.canvas.__mx=e.clientX;chart.canvas.__my=e.clientY;
      /* 같은 주차 안에서 위아래로만 움직이면 Chart 가 external 을 다시 부르지 않는다 → 자리만 직접 옮긴다 */
      const t=document.getElementById('chTip');if(t&&t.classList.contains('on')&&t.__pos)t.__pos();});
    chart.canvas.addEventListener('mouseleave',chTipHide);
    document.addEventListener('mousemove',e=>{const t=document.getElementById('chTip');if(!t||!t.classList.contains('on'))return;
      const b=chart.canvas.getBoundingClientRect();
      if(e.clientX<b.left-4||e.clientX>b.right+4||e.clientY<b.top-4||e.clientY>b.bottom+4)chTipHide();},true);}
  let el=document.getElementById('chTip');
  if(!el){el=document.createElement('div');el.id='chTip';document.body.appendChild(el);}
  if(!tooltip||tooltip.opacity===0){chTipHide();return;}
  const title=(tooltip.title||[]).join(' ').replace(/\s*\n\s*/g,' ');   /* 가로축 라벨은 두 줄('8월'·'3주') — 한 줄로 */
  const rows=(tooltip.dataPoints||[]).map(p=>{
    /* 막대는 배경색, 선의 점은 테두리색이 그 계열 색이다(점 속은 흰색) */
    const o=(p.element&&p.element.options)||{};
    const c=(p.dataset.type==='line'||p.dataset.borderWidth)?(p.dataset.borderColor||o.borderColor||o.backgroundColor):(o.backgroundColor||p.dataset.backgroundColor||'#888');
    const v=(p.parsed&&p.parsed.y!=null?p.parsed.y:p.parsed)||0;
    return '<div class="r"><i style="background:'+esc(String(c))+'"></i><span class="n">'+esc(p.dataset.label||'')+'</span><b>'+Number(v).toLocaleString()+'건</b></div>';
  }).join('');
  el.innerHTML='<div class="t">'+esc(title)+'</div>'+rows;
  el.classList.add('on');
  const cb=chart.canvas.getBoundingClientRect(),b=el.getBoundingClientRect();
  const my=chart.canvas.__my!=null?chart.canvas.__my:(cb.top+tooltip.caretY);
  let x=cb.left+tooltip.caretX-b.width/2, y=my+15;   /* 가로는 그 주차에 맞춰 스냅, 세로는 커서 아래 15px */
  x=Math.max(6,Math.min(x,innerWidth-b.width-6));
  if(y+b.height>innerHeight-6)y=my-b.height-15;
  /* 784차: 자리 계산을 함수로 두고 마우스가 움직일 때마다 다시 부른다(transform 만 바꾸므로 레이아웃 비용 없음) */
  el.__pos=()=>{const cb2=chart.canvas.getBoundingClientRect(),b2=el.getBoundingClientRect();
    const my2=chart.canvas.__my!=null?chart.canvas.__my:(cb2.top+tooltip.caretY);
    let x2=cb2.left+tooltip.caretX-b2.width/2, y2=my2+15;
    x2=Math.max(6,Math.min(x2,innerWidth-b2.width-6));
    if(y2+b2.height>innerHeight-6)y2=my2-b2.height-15;
    el.style.transform='translate('+Math.round(x2)+'px,'+Math.round(y2)+'px)';};
  el.style.transform='translate('+Math.round(x)+'px,'+Math.round(y)+'px)';
}
function dfChartInit(){
  if(typeof Chart==='undefined'){loadChart().then(()=>{if(S.view==='defect')rDefect();}).catch(()=>{});return false;}
  /* 623차 톤 정합 — ① 서체: 축·눈금·라벨·툴팁이 브라우저 기본체였다(도넛 중앙만 Pretendard 명시).
     ② 툴팁: 앱 툴팁(#htip)과 같은 차콜·라운드 3·같은 글자 체급. 개별 차트의 위치·모드 옵션은 그대로다. */
  if(!Chart.__calappTone){
    Chart.defaults.font.family="'Pretendard Variable',Pretendard,sans-serif";
    const tt=Chart.defaults.plugins.tooltip;
    tt.backgroundColor='rgba(28,32,42,.96)';tt.titleColor='#fff';tt.bodyColor='#fff';
    tt.cornerRadius=3;tt.titleFont={size:12,weight:700};tt.bodyFont={size:12,weight:600};
    Chart.__calappTone=true;
  }
  if(window.ChartDataLabels&&!Chart.__dlOff){Chart.register(ChartDataLabels);
  /* 원본과 동일한 툴팁 위치 — 가장 높은 지점 위에 뜨는 'aboveAll'(app-core.js 774) */
  if(Chart.Tooltip&&!Chart.Tooltip.positioners.aboveAll){
    Chart.Tooltip.positioners.aboveAll=function(items,evt){
      if(!items.length)return false;
      let minY=Infinity,sumX=0;
      for(const it of items){const p=it.element.tooltipPosition();if(p.y<minY)minY=p.y;sumX+=p.x;}
      const x=sumX/items.length;
      /* 515차: 늘 최고점 위에 붙어 상단 고정처럼 보였다 — 커서 높이를 따라가되 그래프 안에 머문다 */
      const ca=this.chart.chartArea;
      const cy=(evt&&typeof evt.y==='number')?evt.y:minY;
      const y=Math.min(ca.bottom-4,Math.max(ca.top+4,cy+26));   /* 781차: 커서 위(−16)에서 아래(+26)로 — 손·커서가 값을 가리지 않게 */
      return{x,y};
    };
  }Chart.defaults.set('plugins.datalabels',{display:false});Chart.__dlOff=true;}
  if(!Chart.__ctReg){Chart.register({id:'centerText',afterDatasetsDraw(chart,_,opts){if(!opts||!opts.display)return;const{ctx,chartArea:{left,right,top,bottom}}=chart;const cx=(left+right)/2,cy=(top+bottom)/2;ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=opts.valueColor||cvar('--lbl','#1C1C1E');ctx.font=`700 ${opts.valueSize||16}px 'Pretendard Variable',Pretendard,sans-serif`;ctx.fillText(opts.value||'',cx,cy-2);ctx.fillStyle=opts.labelColor||cvar('--ch-axis','rgba(60,60,67,.58)');ctx.font=`600 ${opts.labelSize||11}px 'Pretendard Variable',Pretendard,sans-serif`;ctx.fillText(opts.label||'',cx,cy+14);ctx.restore();}});Chart.__ctReg=true;}
  return true;
}
/* 원본 moDLCfg(app-core.js 691) 문자 그대로 — 228차: 자릿수 축소 루프(임의 추가)를 걷어냈다.
   원본에 없는 '개선'이 화면 차이를 만든다 — 이 파일의 차트 코드는 원본과 diff 0 이 원칙이다. */
function dfMoDLCfg(ctx){
  const ca=ctx.chart.chartArea,n=(ctx.chart.data.labels||[]).length||1;
  const catW=(ca&&ca.width)?ca.width/n:60;
  const size=catW>=50?11:catW>=42?10:catW>=34?9:catW>=27?8:7;
  return {size,catW,showInner:catW>=46,totalEvery:catW>=26?1:2};
}
function dfNiceFit(lo,hi){
  const span=Math.max(hi-lo,1),padv=Math.max(span*0.12,1);
  let rawMin=lo-padv,rawMax=hi+padv;
  const rough=(rawMax-rawMin)/5,mag=Math.pow(10,Math.floor(Math.log10(rough)));
  const steps=[1,2,2.5,5,10];let step=10*mag;
  for(const s of steps){if(s*mag>=rough){step=s*mag;break;}}
  let min=Math.floor(rawMin/step)*step;if(min<0)min=0;
  return{min,max:Math.ceil(rawMax/step)*step};
}
/* 주차별 추이 — 원본과 같은 복합 차트(누적막대 3단 + 누계 라인 2개 + 데이터라벨·페이드) */
function dfTrendDraw(key,cid,wks){
  if(!dfChartInit())return;
  const el=document.getElementById(cid);if(!el)return;
  dfC(key);
  const rows=Array.isArray(wks)?wks:[];if(!rows.length)return;
  const ink=cvar('--lbl','#1C1C1E'),grid=cvar('--ch-grid','rgba(0,0,0,.05)'),axisT=cvar('--ch-axis','rgba(60,60,67,.42)');
  const stroke=cvar('--bg2','#fff');
  const cumR=rows.map(x=>Number(x.cumR)||0),cumRes=rows.map(x=>Number(x.cumRes)||0);
  const y1v=[...cumR,...cumRes].filter(v=>v>0);let y1min=0,y1max;
  if(y1v.length){const r=dfNiceFit(Math.min(...y1v),Math.max(...y1v));y1min=r.min;y1max=r.max;}
  /* ⚠ duration 은 함수로 둔다 — Chart.js 옵션은 그릴 때마다 다시 읽으므로(lazy),
     사이드바 토글 동안 DF.noAnim 을 세우면 ResizeObserver 가 몇 번을 발화하든 즉시 상태로만 그린다.
     (responsive=false 저글링은 이미 붙은 옵저버를 막지 못해 무효였다 — 216차 방식의 실패 원인) */
  const DUR=()=>DF.noAnim?0:520;
  const baseY=ctx=>{if(ctx.type!=='data')return;const ds=ctx.chart.data.datasets[ctx.datasetIndex];const sc=ctx.chart.scales[(ds&&ds.yAxisID)||'y'];if(!sc)return 0;return sc.getPixelForValue(sc.min!=null?sc.min:0);};
  const barAnim={y:{duration:DUR,easing:'easeOutQuart',from:baseY},base:{duration:DUR,easing:'easeOutQuart',from:baseY}};
  const lineAnim={y:{duration:DUR,easing:'easeOutCubic',from:baseY}};
  const op=ctx=>ctx.chart.$la??0,opIn=ctx=>(ctx.chart.$la??0)*0.55;
  const _pr=/^pr/.test(key);
  const _mb=typeof window!=='undefined'&&window.innerWidth<=768;   /* 689차: 폰에선 45주 × 반지름 4 가 원 사슬로 보였다 — 점을 줄여 선이 보이게 */   /* 인쇄용 캔버스 — 231차 지시로 축 제목·눈금·점 크기 축소 */
  const _atSize=_pr?9:((typeof window!=='undefined'&&window.innerWidth<=768)?10:13);
  const _tkSize=_pr?8:((typeof window!=='undefined'&&window.innerWidth<=768)?9:12);   /* 231차: 인쇄 축 수치도 축소 */
  const innerDl=(color)=>({display:ctx=>window.innerWidth>768&&dfMoDLCfg(ctx).showInner&&ctx.dataset.data[ctx.dataIndex]>0,opacity:opIn,anchor:'center',align:'center',color,font:ctx=>({size:dfMoDLCfg(ctx).size,weight:600}),formatter:v=>v.toLocaleString()});
  const ds=[
    {type:'bar',label:'60일 이상',data:rows.map(x=>Number(x.lt60)||0),backgroundColor:cvar('--ch-d60','#DA6A60'),hoverBackgroundColor:cvar('--ch-d60h','#C65A50'),pointStyle:'rectRounded',stack:'u',borderRadius:0,borderSkipped:false,yAxisID:'y',order:3,animations:barAnim,datalabels:innerDl('#fff')},
    {type:'bar',label:'30~59일',data:rows.map(x=>(Number(x.lt)||0)-(Number(x.lt60)||0)),backgroundColor:cvar('--ch-d30','#E89C9A'),hoverBackgroundColor:cvar('--ch-d30h','#C76F6D'),pointStyle:'rectRounded',stack:'u',borderRadius:0,borderSkipped:false,yAxisID:'y',order:3,animations:barAnim,datalabels:innerDl(cvar('--ch-lbl2','#7A3434'))},
    {type:'bar',label:'30일 미만',data:rows.map(x=>(Number(x.u)||0)-(Number(x.lt)||0)),backgroundColor:cvar('--ch-d0','#B3C7DD'),hoverBackgroundColor:cvar('--ch-d0h','#7E9BBC'),pointStyle:'rectRounded',stack:'u',borderRadius:0,borderSkipped:false,yAxisID:'y',order:3,animations:barAnim,
      datalabels:{labels:{value:innerDl(cvar('--ch-lbl','#1F2B4C')),
        total:{display:ctx=>{if(window.innerWidth<=768)return false;const t=rows[ctx.dataIndex]?Number(rows[ctx.dataIndex].u)||0:0;if(t<=0)return false;const c=dfMoDLCfg(ctx),n=ctx.chart.data.labels.length;return c.totalEvery===1||ctx.dataIndex%c.totalEvery===0||ctx.dataIndex===n-1;},opacity:op,anchor:'end',align:'end',offset:2,clip:false,color:ink,font:ctx=>({size:dfMoDLCfg(ctx).size,weight:700}),textStrokeColor:stroke,textStrokeWidth:4,formatter:(v,ctx)=>{const t=Number(rows[ctx.dataIndex].u)||0;return t>0?t.toLocaleString():'';}}}}},
    {type:'line',label:'전체 접수',data:cumR,borderColor:cvar('--ch-recv','#3E71D2'),backgroundColor:stroke,pointBackgroundColor:stroke,pointBorderColor:cvar('--ch-recv','#3E71D2'),pointBorderWidth:_pr?1.2:(_mb?1:2),tension:.4,pointRadius:_pr?2.2:(_mb?1.6:4),pointHoverRadius:8,pointHoverBorderWidth:3,pointHoverBackgroundColor:cvar('--ch-recv','#3E71D2'),pointHoverBorderColor:'#fff',hoverBorderWidth:3.5,borderWidth:2.5,fill:false,yAxisID:'y1',order:1,animations:lineAnim,
      datalabels:{display:ctx=>window.innerWidth>768&&(ctx.dataIndex===0||ctx.dataIndex===ctx.dataset.data.length-1),opacity:op,anchor:'center',align:ctx=>ctx.dataIndex===0?'right':'left',offset:8,clip:false,color:cvar('--ch-dlr','#2C437C'),font:{size:11,weight:700},textStrokeColor:stroke,textStrokeWidth:4,textShadowColor:'rgba(0,0,0,.2)',textShadowBlur:3,formatter:v=>v.toLocaleString()}},
    {type:'line',label:'처리 완료',data:cumRes,borderColor:cvar('--ch-done','#F0B144'),backgroundColor:stroke,pointBackgroundColor:stroke,pointBorderColor:cvar('--ch-done','#F0B144'),pointBorderWidth:_pr?1.2:(_mb?1:2),tension:.4,pointRadius:_pr?2.2:(_mb?1.6:4),pointHoverRadius:8,pointHoverBorderWidth:3,pointHoverBackgroundColor:cvar('--ch-done','#F0B144'),pointHoverBorderColor:'#fff',hoverBorderWidth:3.5,borderWidth:2.5,fill:false,yAxisID:'y1',order:0,animations:lineAnim,
      datalabels:{display:ctx=>window.innerWidth>768&&(ctx.dataIndex===0||ctx.dataIndex===ctx.dataset.data.length-1),opacity:op,anchor:'center',align:ctx=>ctx.dataIndex===0?'right':'left',offset:8,clip:false,color:cvar('--ch-dld','#A0590A'),font:{size:11,weight:700},textStrokeColor:stroke,textStrokeWidth:4,textShadowColor:'rgba(0,0,0,.2)',textShadowBlur:3,formatter:v=>v.toLocaleString()}}];
  DF.ch[key]=new Chart(el,{data:{labels:rows.map(x=>`${Number(x.m)||0}월\n${Number(x.w)||0}주`),datasets:ds},
    options:{responsive:true,maintainAspectRatio:false,
      animation:{duration:DUR,easing:'easeOutQuart',onComplete(ac){if(DF.noAnim){ac.chart.$dlShown=true;ac.chart.$la=1;return;}if(!ac.initial||ac.chart.$dlShown)return;ac.chart.$dlShown=true;const ch=ac.chart,t0=performance.now(),fd=350;const tick=()=>{if(!ch||ch.$destroyed||!ch.ctx)return;try{const p=Math.min(1,(performance.now()-t0)/fd);ch.$la=p*p*(3-2*p);ch.update('none');if(p<1)requestAnimationFrame(tick);}catch(e){console.warn('label fade tick aborted',e);}};requestAnimationFrame(tick);}},
      /* 782차: 이름 왼쪽·값 오른쪽으로 나누려면 캔버스 툴팁으로는 안 된다(한 줄 문자열뿐) → HTML 툴팁(#chTip)으로 그린다.
         위치는 커서 아래 +15px, 화면 밖으로 나가지 않게 좌우·아래를 물린다 */
      plugins:{legend:{display:false},tooltip:{enabled:false,external:chTipDraw,mode:'index',intersect:false}},
      /* 인쇄 상자는 720px 폭이라 주차 라벨이 자동 회전한다(원본은 화면 폭 그대로 인쇄해 수평).
         인쇄용만 회전을 막고 촘촘하면 건너뛰게 한다 — 화면은 원본 그대로. */
      scales:{x:{grid:{display:false},ticks:{font:{size:_pr?9:10},color:ink,
        ...(_pr?{maxRotation:0,minRotation:0,autoSkip:true,autoSkipPadding:4}:{}),
        callback:function(v){return this.getLabelForValue(v).split('\n');}}},
        y:{beginAtZero:true,position:'left',grace:'25%',grid:{color:grid},ticks:{font:{size:_tkSize}},title:{display:true,text:'미처리(건)',font:{size:_atSize,weight:600},color:axisT}},
        y1:{beginAtZero:false,min:y1min,max:y1max,position:'right',grid:{display:false},ticks:{font:{size:_tkSize}},title:{display:true,text:'접수·처리(건)',font:{size:_atSize,weight:600},color:axisT}}}}});
}
function dfWkToTrend(w){return{m:Number(w.m)||Number(String(w.week).slice(5,7)),w:Number(w.wn)||0,
  cumR:Number(w.r)||0,cumRes:Number(w.res)||0,u:Number(w.u)||0,lt:(Number(w.d30)||0)+(Number(w.d60)||0),lt60:Number(w.d60)||0};}
function dfWksOfYear(weekly,year){
  const{rmEnd}=dfEnds(S.dfRm);
  return (weekly||[]).filter(w=>String(w.week||'').slice(0,4)===year&&w.week<=rmEnd&&(w.sun!==false||w.week===rmEnd))
    .sort((a,b)=>a.week<b.week?-1:1).map(dfWkToTrend);
}
function dfYearsOf(weekly){return [...new Set((weekly||[]).map(w=>String(w.week||'').slice(0,4)))].filter(Boolean).sort();}
/* 대시보드용 — 현장별 weekly 를 같은 컷 날짜로 carry-forward 합산 */
function dfDashWksOfYear(wk,year){
  const{rmEnd}=dfEnds(S.dfRm);
  const arrs=dfDashSites().map(s=>((wk||{})[s.id]||[]).slice().sort((a,b)=>a.week<b.week?-1:1));
  const cuts=[...new Set(arrs.flat().filter(w=>String(w.week).slice(0,4)===year&&w.week<=rmEnd&&(w.sun!==false||w.week===rmEnd))
    .map(w=>w.week))].sort();
  return cuts.map(cut=>{
    const a={week:cut,r:0,res:0,u:0,d0:0,d30:0,d60:0,m:0,wn:0,sun:true};
    arrs.forEach(arr=>{let last=null;for(const w of arr){if(w.week<=cut)last=w;else break;}
      if(last){a.r+=last.r;a.res+=last.res;a.u+=last.u;a.d0+=last.d0;a.d30+=last.d30;a.d60+=last.d60;}});
    const src=arrs.flat().find(w=>w.week===cut);
    if(src){a.m=src.m;a.wn=src.wn;a.sun=src.sun;}
    return dfWkToTrend(a);
  });
}
const dfTrendLegend='<div class="chart-lg"><div class="li"><span class="mk-bar ck-d60"></span>60일 이상</div><div class="li"><span class="mk-bar ck-d30"></span>30~59일</div><div class="li"><span class="mk-bar ck-d0"></span>30일 미만</div><div class="li"><span class="mk-ln ck-recv"></span>전체 접수</div><div class="li"><span class="mk-ln ck-done"></span>처리 완료</div></div>';
function dfTrendCardHTML(cid,scope,years,cur){
  const opts=(years&&years.length?years:[S.dfRm.slice(0,4)]).map(y=>`<option value="${y}"${y===cur?' selected':''}>${y}년</option>`).join('');
  return `<div class="card mb12 main-chart-card" data-print="ov-chart"><div class="sh" style="margin-bottom:6px;flex-shrink:0"><div class="ct cardttl">하자접수 · 처리 주차별 추이</div><select class="yr-sel no-print" data-act="df.trendYear" data-scope="${scope}" aria-label="추이 연도 선택">${opts}</select></div><div class="cw" style="flex:1;min-height:0"><canvas id="${cid}"></canvas></div>${dfTrendLegend}</div>`;}
/* 도넛 — 원본과 같은 가운데 합계 + 우측 2열 범례(항목에 마우스를 올리면 조각이 커진다) */
function dfEtcOf(am){const m={...am};const v=Number(m['기타'])||0;delete m['기타'];return{m,etc:v};}
function dfDonutData(am){
  const{m,etc}=dfEtcOf(am||{});
  const sorted=Object.entries(m).map(([t,c])=>[t,Number(c)||0]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);
  const top11=sorted.slice(0,11),rest=sorted.slice(11).reduce((a,x)=>a+x[1],0),etcTotal=etc+rest;
  const data=top11.map(([t,c])=>({t,c}));if(etcTotal>0)data.push({t:'기타',c:etcTotal});
  return data;
}
function dfDonutDraw(key,cid,lgid,items,opt){   /* 714차: opt {colors,unit,label} — 레벨 도넛처럼 고정 색·다른 단위를 쓸 때 */
  const colors=(opt&&opt.colors)||null,unit=(opt&&opt.unit)||'건',clabel=(opt&&opt.label)||'미처리';
  if(!dfChartInit())return;
  const el=document.getElementById(cid);if(!el)return;
  dfC(key);
  const data=(items||[]).filter(x=>x&&Number(x.c)>0);
  const lg=document.getElementById(lgid);
  if(!data.length){if(lg)lg.innerHTML='<div class="dn-empty">자료 없음</div>';return;}
  const tot=data.reduce((a,x)=>a+Number(x.c),0);
  const border=cvar('--bg2','#fff');
  /* 원본 app-view.js 911·919행 문자 그대로 — pointStyle:'circle'·caretPadding:32 포함,
     animation 옵션은 원본처럼 지정하지 않는다(도넛 기본 회전·원호 이징까지 동일해야 한다).
     유일 편차: DF.noAnim(전용 인쇄·사이드바 토글) 때만 duration 0 을 덧씌우는 어댑터 한 줄. */
  const PAL=dfRamp(data.length);
  DF.ch[key]=new Chart(el,{type:'doughnut',data:{labels:data.map(d=>d.t),datasets:[{data:data.map(d=>Number(d.c)),backgroundColor:data.map((d,i)=>(colors&&colors[i])||PAL[i]),borderWidth:3,borderColor:border,pointStyle:'circle',hoverOffset:12,hoverBorderWidth:3}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:14},cutout:'58%',
      ...(DF.noAnim?{animation:{duration:0}}:{}),
      /* 231차 지시: 인쇄본에서 도넛 안 글자가 커 보인다 — 인쇄용 캔버스(prSx/prMx)만 축소.
         화면은 원본과 동일한 기본값(16/11)을 그대로 둔다. */
      /* 768차: 조각·범례에 마우스를 올리면 가운데 수치가 그 항목(건수·이름)으로, 떼면 전체로 */
      onHover:(ev,els,ch)=>{const ct=ch.options.plugins.centerText;const i=els&&els.length?els[0].index:-1;const nv=i>=0?{value:Number(data[i].c).toLocaleString()+unit,label:data[i].t}:{value:tot.toLocaleString()+unit,label:clabel};if(ct.value!==nv.value||ct.label!==nv.label){ct.value=nv.value;ct.label=nv.label;ch.update('none');}},
      plugins:{centerText:{display:true,value:tot.toLocaleString()+unit,label:clabel,
        ...(/^pr/.test(key)?{valueSize:13,labelSize:8}:{})},legend:{display:false},
        tooltip:{enabled:false},datalabels:{display:false}}}});   /* 770차: 가운데 수치가 항목을 따라 바뀌므로 툴팁은 끈다 */
  if(lg){
    /* 원본과 동일: 범례는 항상 2열 — --lgr(행수)로 좌열부터 세로 채움. 폭 조건 토글은 원본에 없다(225차 철회). */
    lg.classList.add('lg-2col');
    lg.style.setProperty('--lgr',String(Math.max(1,Math.ceil(data.length/2))));
    lg.innerHTML=data.map((d,i)=>`<div class="it" data-idx="${i}"${d.full?` data-tt="${esc(d.full)}" aria-label="${esc(d.full)}"`:''} data-tip="${esc(d.full||d.t)}"><span class="l"><span class="dt" style="background:${(colors&&colors[i])||PAL[i]}"></span><span class="nm">${esc(d.t)}</span></span><span class="cnt">${Number(d.c).toLocaleString()}${unit}</span><span class="pct">${tot>0?(Number(d.c)/tot*100).toFixed(1):0}%</span></div>`).join('');
    lg.querySelectorAll('.it').forEach(it=>{
      it.addEventListener('mouseenter',()=>{const ch=DF.ch[key];if(!ch)return;const idx=Number(it.dataset.idx);ch.setActiveElements([{datasetIndex:0,index:idx}]);const ct=ch.options.plugins.centerText;ct.value=Number(data[idx].c).toLocaleString()+unit;ct.label=data[idx].t;ch.update();});
      it.addEventListener('mouseleave',()=>{const ch=DF.ch[key];if(!ch)return;ch.setActiveElements([]);const ct=ch.options.plugins.centerText;ct.value=tot.toLocaleString()+unit;ct.label=clabel;ch.update();});
    });
  }
}
function dfDonutCardHTML(title,cid,lgid){return `<div class="card"><div class="ct cardttl">${esc(title)}</div><div class="dn-side"><div class="canv"><canvas id="${cid}"></canvas></div><div class="lg lg-2col" id="${lgid}"></div></div></div>`;}
/* 전월대비 실적 현황 — 원본과 같은 가로 막대(전월/금월 + 증감 배지) */
function dfMomRender(elId,tot,rowsIn){   /* 720차: rowsIn — 다른 지표(세대 레벨)도 같은 전월/금월 막대로 */
  const el=document.getElementById(elId);if(!el)return;
  const M=rowsIn||[
    {label:'전체 접수',prev:tot.prev.total,curr:tot.tR,goodUp:false,grp:'in'},
    {label:'처리 완료',prev:tot.prev.res,curr:tot.res,goodUp:true,grp:'in'},
    {label:'미처리',prev:tot.prev.unr,curr:tot.unr,goodUp:false,grp:'un'},
    {label:'장기미처리',prev:tot.prev.lt,curr:tot.lt,goodUp:false,grp:'un'}];
  const mxIn=Math.max(...M.filter(m=>m.grp==='in').flatMap(m=>[m.prev,m.curr]),1),mxUn=Math.max(...M.filter(m=>m.grp==='un').flatMap(m=>[m.prev,m.curr]),1);
  const mnIn=(()=>{const vs=M.filter(m=>m.grp==='in').flatMap(m=>[m.prev,m.curr]).filter(v=>v>0);if(!vs.length)return 0;const lo=Math.min(...vs),hi=Math.max(...vs),span=hi-lo;return span<hi*0.12?Math.max(0,Math.floor(lo-span*2)):0;})();
  el.innerHTML=M.map(m=>{const mx=m.grp==='in'?mxIn:mxUn,mn=m.grp==='in'?mnIn:0,eff=Math.max(mx-mn,1);
    const diff=m.curr-m.prev,pct=m.prev>0?(diff/m.prev*100):0,isUp=diff>0,isEq=diff===0;
    const arrow=isEq?'—':isUp?'▲':'▼',good=isEq?'eq':(m.goodUp===isUp?'up':'dn');
    const pctTxt=isEq?'변동 없음':(m.prev>0?(diff>0?'+':'')+pct.toFixed(1)+'%':'—');
    return`<div class="mom-row"><div class="label">${m.label}</div><div class="bars"><div class="bar prev"><span class="lb">전월</span><div class="tr"><div class="fl" data-w="${Math.max(0,(m.prev-mn)/eff*100)}"></div></div><span class="vl">${m.prev.toLocaleString()}</span></div><div class="bar curr"><span class="lb">금월</span><div class="tr"><div class="fl" data-w="${Math.max(0,(m.curr-mn)/eff*100)}"></div></div><span class="vl">${m.curr.toLocaleString()}</span></div></div><div class="delta"><span class="d ${good}">${arrow} ${pctTxt}</span></div></div>`;}).join('');
  /* ⚠ 예전에는 행마다 40ms 씩 늦춰 막대를 늘렸다(마지막 행은 0.8s 전환까지 더해 1초 넘게 걸렸다) —
     정보를 더해 주지 않고 큰 표와 함께 그려질 때 렉만 남아 즉시 표시로 바꿨다(352차) */
  el.querySelectorAll('.fl').forEach(fl=>{fl.style.width=fl.dataset.w+'%';});
}
/* KPI 카드 — 원본 kc 구조(라벨/큰 값/메타 + 우상단 '목록 보기') */
function dfKcHTML(list){
  return '<div class="akpi">'+list.map(k=>`<div class="kc ${k.cls}${k.act?' kc-click':''}"${k.act?` data-act="rec.list" data-sid="${esc(k.sid||'')}" data-scope="${k.act}"`:''}${k.tt?` data-tip="${esc(k.tt)}"`:''}><div class="kl">${k.label}</div><div class="kv">${k.valHTML!==undefined?k.valHTML:k.val.toLocaleString()+(k.unit?`<span class="u">${k.unit}</span>`:'')}</div><div class="km">${k.meta}</div>${k.act?`<span class="kc-cta"><span class="kc-cta-t">목록</span> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></span>`:''}</div>`).join('')+'</div>';
}
/* 주요 이슈 — 게시본 HTML 그대로(원본 .ic 카드). 남이 만든 HTML 이므로 반드시 DOMPurify 로 씻는다 */
function dfInsightHTML(html){
  const raw=String(html||'').trim();
  /* 게시본 이슈는 정적 HTML 이다 — 원본이 붙여 둔 '펼치기' 툴팁만 떼어 오해를 없앤다
     (상세 집계는 게시본에 실리지 않아 이 앱에서는 펼칠 수 없다) */
  const inner=raw?String((typeof DOMPurify!=='undefined')?DOMPurify.sanitize(raw):esc(raw)).replace(/\sdata-tt="펼치기"/g,'')
    :'<div class="ic warn"><div class="ic-i"><svg viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/></svg></div><div class="ic-t"><div class="ic-ttl">주요 이슈 없음</div><div class="ic-sub">이 게시본에는 주요 이슈가 포함되지 않았습니다 · 재게시하면 표시됩니다.</div></div></div>';
  /* 686차: 「업데이트」 버튼을 없앴다 — 이 카드는 [등록] 때마다 dfInsightsBuild 가 데이터로 다시 쓴다.
     버튼은 그 세 장을 다시 쓰는 것이었는데, 자동 갱신과 구분이 안 돼 혼란만 줬다. */
  return `<div class="card"><div class="sh"><div class="ct cardttl">주요 이슈 및 분석 의견</div></div><div class="ins-grid">${inner}</div></div>`;
}
function dfNoneHTML(msg){
  return `<div class="card dfc-none">
    <svg class="icn" aria-hidden="true"><use href="#i-defect"></use></svg>
    <b>하자처리 현황</b><span>${esc(msg)}</span></div>`;
}
/* ── 대시보드 ── */
function dfDashRowHTML(s,st){
  const ld=st.lt-st.prev.lt,uD=st.unr-st.prev.unr;
  const b1=dfDeltaParts(uD),b2=dfDeltaParts(ld);
  return`<tr><td class="cc" style="white-space:nowrap"><span class="ba bbl">${esc(s.region||'-')}</span></td>`
    +`<td><b style="color:var(--bt1);cursor:pointer" data-act="df.site" data-sid="${esc(s.id)}">${esc(s.name)}</b></td>`
    +`<td class="n">${(s.units||0).toLocaleString()}</td>`
    +`<td class="n">${st.tR.toLocaleString()}</td>`
    +`<td class="n" style="color:var(--gn)">${st.res.toLocaleString()}</td>`
    +`<td class="n" style="font-weight:600">${st.rate.toFixed(1)}%</td>`
    +`<td class="n" style="color:var(--am)">${st.unr.toLocaleString()}</td>`
    +`<td class="cc" style="white-space:nowrap"><span class="ba ${b1.dBadge}" data-tip="전월 ${st.prev.unr.toLocaleString()} → 금월 ${st.unr.toLocaleString()}">${b1.dArrow} ${b1.dTxt}</span></td>`
    +`<td class="n" style="color:var(--rd)">${st.lt.toLocaleString()}</td>`
    +`<td>${dfLtrBar(st.unr,st.dd[2],st.dd[1],st.dd[0])}</td>`
    +`<td class="cc" style="white-space:nowrap"><span class="ba ${b2.dBadge}" data-tip="전월 ${st.prev.lt.toLocaleString()} → 금월 ${st.lt.toLocaleString()}">${b2.dArrow} ${b2.dTxt}</span></td></tr>`;
}
function dfDashSort(all){
  const so=S.dfSort;if(!so||!so.col)return all;
  const gv=({s,st})=>({region:s.region,name:s.name,units:s.units||0,tR:st.tR,res:st.res,rate:st.rate,unr:st.unr,deltaUnr:st.unr-st.prev.unr,lt:st.lt,ltr:st.ltr,delta:st.lt-st.prev.lt}[so.col]);
  return all.slice().sort((a,b)=>{const va=gv(a),vb=gv(b);
    if(typeof va==='string')return so.dir*String(va).localeCompare(String(vb),'ko');
    return so.dir*(va-vb);});
}
const DF_DASH_TH=[['region','권역','cc','7.7%'],['name','현장명','','16.75%'],['units','세대수','n','7.2%'],['tR','전체 접수','n','7.2%'],['res','처리','n','7.2%'],['rate','처리율','n','7.2%'],['unr','미처리','n','7.2%'],['deltaUnr','전월대비','cc','7.2%'],['lt','장기미처리','n','6.2%'],['ltr','장기미처리 비율','cc ltr-col','18.75%'],['delta','전월대비','cc','7.2%']];
function dfDashTheadHTML(){
  const so=S.dfSort||{};
  return '<thead><tr>'+DF_DASH_TH.map(([k,t,cls,w])=>{
    const act=so.col===k;
    return`<th class="${cls}${act?' act':''}" style="width:${w}${cls==='cc'?';white-space:nowrap':''}" data-act="df.sort.dash" data-key="${k}" tabindex="0">${t} <span class="sortmk">${act?(so.dir===1?'▲':'▼'):'↕'}</span></th>`;}).join('')+'</tr></thead>';
}
function dfDashTableFill(d){
  const tbl=$('#dfDashTbl');if(!tbl)return;
  if(S.dfAxDash==='co'){dfDashCoFill(tbl);return;}
  const ttl=$('#dfDashAxTtl');if(ttl)ttl.textContent='현장별 하자처리 현황';
  $$('#dfDashAx button').forEach(b=>b.classList.toggle('on',b.dataset.ax==='site'));
  const all=dfDashSites().map(s=>({s,st:dfStFromWeekly(d.wk[s.id],d.rm)}));
  const rows=dfDashSort(all).map(({s,st})=>dfDashRowHTML(s,st)).join('')
    ||'<tr><td colspan="11" style="text-align:center;padding:24px;color:var(--lbl3)">게시된 현장이 없습니다.</td></tr>';
  let foot='';
  if(all.length){
    const T={tR:0,res:0,unr:0,lt:0,d0:0,d30:0,d60:0,pU:0,pLt:0,units:0};
    all.forEach(({s,st})=>{T.tR+=st.tR;T.res+=st.res;T.unr+=st.unr;T.lt+=st.lt;T.d0+=st.dd[0];T.d30+=st.dd[1];T.d60+=st.dd[2];T.pU+=st.prev.unr;T.pLt+=st.prev.lt;T.units+=s.units||0;});
    const rate=T.tR>0?T.res/T.tR*100:0;
    const b1=dfDeltaParts(T.unr-T.pU),b2=dfDeltaParts(T.lt-T.pLt);
    foot=`<tfoot><tr class="tot"><td class="cc"></td><td><b>합계</b></td><td class="n">${T.units.toLocaleString()}</td><td class="n">${T.tR.toLocaleString()}</td><td class="n" style="color:var(--gn)">${T.res.toLocaleString()}</td><td class="n">${rate.toFixed(1)}%</td><td class="n" style="color:var(--am)">${T.unr.toLocaleString()}</td><td class="cc" style="white-space:nowrap"><span class="ba ${b1.dBadge}" data-tip="전월 ${T.pU.toLocaleString()} → 금월 ${T.unr.toLocaleString()}">${b1.dArrow} ${b1.dTxt}</span></td><td class="n" style="color:var(--rd)">${T.lt.toLocaleString()}</td><td>${dfLtrBar(T.unr,T.d60,T.d30,T.d0)}</td><td class="cc" style="white-space:nowrap"><span class="ba ${b2.dBadge}" data-tip="전월 ${T.pLt.toLocaleString()} → 금월 ${T.lt.toLocaleString()}">${b2.dArrow} ${b2.dTxt}</span></td></tr></tfoot>`;
  }
  paintHTML(tbl,dfDashTheadHTML()+'<tbody>'+rows+'</tbody>'+foot);
  ovsRefresh();
}
/* 대시보드 업체별 축 — 현장별 coAgg 를 업체 기준으로 합친다(원본 dashCoAgg). 상위 10 + 나머지 한 줄 */
/* 업체별 하자처리 현황 집계 — 대시보드 표·보고서 양식 공용 */
/* 범례·보고서용 짧은 현장명 — '힐스테이트'는 어디에 붙어 있든 뗀다(갑천1 트리풀시티 힐스테이트 등) */
function dfShortSite(nm){
  /* 783차: 브랜드를 지우지 않고 줄인다 — 힐스테이트 → HS, 디에이치/THE H → TH */
  const s2=String(nm||'').replace(/힐스테이트/g,'HS').replace(/디에이치|더\s*에이치|THE\s*H/gi,'TH').replace(/\s{2,}/g,' ').trim().replace(/^[·\-\s]+|[·\-\s]+$/g,'');
  return s2||String(nm||'');
}
function dfDashCoAgg(rm,list){
  const m=new Map();
  list.forEach(s=>{const k=DF.kpi[rm+'/'+s.id];((k&&k.coAgg)||[]).forEach(x=>{
    let o=m.get(x.c);
    if(!o){o={key:x.c,r:0,res:0,u:0,lt:0,d0:0,d30:0,d60:0,pu:0,plt:0,tr:new Map()};m.set(x.c,o);}
    o.r+=x.r;o.res+=x.res;o.u+=x.u;o.lt+=x.lt;o.d0+=x.d0;o.d30+=x.d30;o.d60+=x.d60;o.pu+=x.pu||0;o.plt+=x.plt||0;
    if(x.trTop&&x.trTop!=='-')o.tr.set(x.trTop,(o.tr.get(x.trTop)||0)+x.u);});});
  return [...m.values()].map(o=>{const top=[...o.tr.entries()].sort((a,b)=>b[1]-a[1]);return Object.assign(o,{side:top[0]?top[0][0]:'-'});}).sort((a,b)=>b.u-a.u);
}
function dfDashCoFill(tbl){
  const ttl=$('#dfDashAxTtl');if(ttl)ttl.textContent='업체별 하자처리 현황';
  $$('#dfDashAx button').forEach(b=>b.classList.toggle('on',b.dataset.ax==='co'));
  const rm=dfRm(),list=dfDashSites();
  const miss=list.some(s=>DF.kpi[rm+'/'+s.id]===undefined);
  const H=['NO','시공업체','주요 공종','전체 접수','처리','처리율','미처리','전월대비','장기미처리','장기미처리 비율','전월대비'];
  const W=[7.7,16.75,7.2,7.2,7.2,7.2,7.2,7.2,6.2,18.75,7.2];
  const CLS=['cc','','cc','n','n','n','n','cc','n','cc ltr-col','cc'];
  const thead='<thead><tr>'+H.map((h,i)=>`<th class="${CLS[i]}" style="width:${W[i]}%${CLS[i]==='cc'?';white-space:nowrap':''}">${h}</th>`).join('')+'</tr></thead>';
  if(miss){
    tbl.innerHTML=thead+'<tbody><tr><td colspan="11" style="text-align:center;padding:24px;color:var(--lbl3)">현장 자료를 받는 중입니다…</td></tr></tbody>';
    dfAllKpi().then(()=>{if(S.view==='defect'&&!S.dfSid&&S.dfAxDash==='co')dfDashCoFill(tbl);});
    return;
  }
  const rows=dfDashCoAgg(rm,list);
  const named=rows.filter(r=>r.key!=='(미기재)'),na=rows.filter(r=>r.key==='(미기재)');
  let shown=named,folded=null;
  if(named.length>10){shown=named.slice(0,10);
    folded=named.slice(10).reduce((a,r)=>{a.r+=r.r;a.res+=r.res;a.u+=r.u;a.lt+=r.lt;a.d0+=r.d0;a.d30+=r.d30;a.d60+=r.d60;a.pu+=r.pu;a.plt+=r.plt;return a;},
      {key:`그 외 ${named.length-10}곳`,r:0,res:0,u:0,lt:0,d0:0,d30:0,d60:0,pu:0,plt:0,side:'-',fold:true});}
  const ordered=[...shown,...(folded?[folded]:[]),...na];
  const rowH=(x,i,opt)=>{
    opt=opt||{};
    const rate=x.r>0?(x.res/x.r*100):0;
    const b1=dfDeltaParts(x.u-x.pu),b2=dfDeltaParts(x.lt-x.plt);
    const muted=opt.tot||opt.muted;
    const name=opt.tot?`<b>${esc(x.key)}</b>`:muted?`<b style="color:var(--lbl3);font-style:italic">${esc(x.key)}</b>`:`<b>${esc(x.key)}</b>`;
    /* 시공업체 클릭 → 팀 전체 미처리 목록(그 업체만). 상위 10 접기 개편 때 링크가 빠졌던 회귀 복원 */
    const nameTd=(opt.tot||muted)?`<td>${name}</td>`:`<td class="rl-link" data-act="rec.list" data-sid="" data-scope="ul" data-co="${esc(x.key)}">${name}</td>`;
    return`<tr${opt.tot?' class="tot"':''}><td class="cc">${muted?'':(i+1)}</td>${nameTd}<td class="cc">${muted?'-':esc(x.side||'-')}</td>`
      +`<td class="n">${x.r.toLocaleString()}</td><td class="n" style="color:var(--gn)">${x.res.toLocaleString()}</td><td class="n" style="font-weight:600">${rate.toFixed(1)}%</td>`
      +`<td class="n" style="color:var(--am)">${x.u.toLocaleString()}</td><td class="cc" style="white-space:nowrap"><span class="ba ${b1.dBadge}" data-tip="전월 ${x.pu.toLocaleString()} → 금월 ${x.u.toLocaleString()}">${b1.dArrow} ${b1.dTxt}</span></td>`
      +`<td class="n" style="color:var(--rd)">${x.lt.toLocaleString()}</td><td>${dfLtrBar(x.u,x.d60,x.d30,x.d0)}</td>`
      +`<td class="cc" style="white-space:nowrap"><span class="ba ${b2.dBadge}" data-tip="전월 ${x.plt.toLocaleString()} → 금월 ${x.lt.toLocaleString()}">${b2.dArrow} ${b2.dTxt}</span></td></tr>`;};
  const T=rows.reduce((a,r)=>{a.r+=r.r;a.res+=r.res;a.u+=r.u;a.lt+=r.lt;a.d0+=r.d0;a.d30+=r.d30;a.d60+=r.d60;a.pu+=r.pu;a.plt+=r.plt;return a;},{r:0,res:0,u:0,lt:0,d0:0,d30:0,d60:0,pu:0,plt:0});
  const body=ordered.length?ordered.map((x,i)=>rowH(x,i,{muted:!!(x.fold||x.key==='(미기재)')})).join('')
    :'<tr><td colspan="11" style="text-align:center;padding:14px;color:var(--lbl3)">이 게시본에는 업체별 자료가 없습니다 · 재게시하면 보입니다</td></tr>';
  const tfoot=ordered.length?`<tfoot>${rowH(Object.assign({},T,{key:'합계',side:''}),0,{tot:true})}</tfoot>`:'';
  paintHTML(tbl,thead+'<tbody>'+body+'</tbody>'+tfoot);
  ovsRefresh();
}
/* 월별 하자처리 현황 (대시보드) — 원본 buildDashMonthTable 포트. 현장별 weekly 를 월말 carry-forward 합산 */
function dfDashMonthTable(d){
  const tbl=$('#dfDashMo');if(!tbl)return;
  const wkDash={};dfDashSites().forEach(s2=>{wkDash[s2.id]=d.wk[s2.id];});   /* 집계 범위 = 대시보드 현장 */
  const{keys,map}=dfMoSnapsDash(wkDash);
  const years=[...new Set(keys.map(k=>k.slice(0,4)))].sort();
  const cur=(years.includes(S.dfMoYear)?S.dfMoYear:(years.includes(S.dfRm.slice(0,4))?S.dfRm.slice(0,4):years[years.length-1]))||S.dfRm.slice(0,4);
  const sel=$('#dfMoYr');
  if(sel)sel.innerHTML=years.length?years.map(y=>`<option value="${y}"${y===cur?' selected':''}>${y}년</option>`).join(''):`<option selected>${cur}년</option>`;
  const rows=keys.map((k,i)=>{const w=map[k],prev=i>0?map[keys[i-1]]:null,prev2=i>1?map[keys[i-2]]:null;
    return{w,m:dfMetrics(w,prev,prev2),first:i===0,yr:k.slice(0,4),mo:Number(k.slice(5,7))};}).filter(x=>x.yr===cur);
  const body=rows.map(x=>{const{w,m,first,mo}=x;
    return`<tr${(x.yr+'-'+String(mo).padStart(2,'0'))===S.dfRm?' class="cur-row"':''}><td class="cc mcell">${mo}월</td><td class="cc recv-total tl-grp">${dfNF(m.tR)}</td><td class="cc recv-weekly">${dfNF(m.recvW)}</td><td class="cc proc-blue tl-grp">${dfNF(m.cumRes)}</td><td class="rate-col proc-blue">${m.rate.toFixed(1)}%</td><td class="cc proc-blue">${dfNF(m.resW)}</td><td class="cc">${dfDlt(m.resWDlt,first,m.resW,'월')}</td><td class="cc unr-red tl-grp">${dfNF(m.unr)}</td><td class="cc">${dfDlt(m.unrDlt,first,m.unr,'월')}</td>${dfLtrCells(m.d0,m.d30,m.d60,m.unr,m.ltDlt,first,'월')}</tr>`;}).join('');
  const eq='6.5%',ltrW='16%';
  const colgroup=`<colgroup><col style="width:9%">${('<col style="width:'+eq+'">').repeat(9)}<col style="width:${ltrW}"><col style="width:${eq}"></colgroup>`;
  const thead=`<thead><tr>${dfTh('','월')}${dfThG('','전체 접수')}${dfTh('recv-sub','월간 접수')}${dfThG('','전체 처리')}${dfTh('rate-col','처리율')}${dfTh('','월간 처리')}${dfTh('','전월대비')}${dfThG('','전체 미처리')}${dfTh('','전월대비')}${dfTh('tl-grp-ltr','장기미처리')}<th class="cc tl-grp-ltr">장기미처리 비율</th><th class="cc">전월대비</th></tr></thead>`;
  tbl.innerHTML=colgroup+thead+`<tbody>${body||'<tr><td colspan="12" style="text-align:center;padding:14px;color:var(--lbl3)">데이터 없음</td></tr>'}</tbody>`;
}
function rDefectDash(root,d){
  const sites=dfDashSites();
  const units=sites.reduce((a,s)=>a+(s.units||0),0);
  const all=sites.map(s=>({s,st:dfStFromWeekly(d.wk[s.id],d.rm)}));
  let tR=0,tRes=0,tU=0,tLt=0,pT=0,pRes=0,pU=0,pLt=0;
  all.forEach(({st})=>{tR+=st.tR;tRes+=st.res;tU+=st.unr;tLt+=st.lt;pT+=st.prev.total;pRes+=st.prev.res;pU+=st.prev.unr;pLt+=st.prev.lt;});
  const rate=tR>0?tRes/tR*100:0;
  const kpis=dfKcHTML([
    {cls:'bl',label:'관리대상현장',valHTML:`${units.toLocaleString()}<span class="u">세대</span>`,meta:`${sites.length.toLocaleString()}개 현장`},
    {cls:'sk',label:'전체 접수',val:tR,unit:'건',meta:`세대당 ${units>0?(tR/units).toFixed(1):'0.0'}건`},
    {cls:'ms',label:'처리 완료',val:tRes,unit:'건',meta:`처리율 ${rate.toFixed(1)}%`},
    {cls:'wh'+(tU>0?' kc-warn':''),label:'미처리',val:tU,unit:'건',meta:`세대당 ${units>0?(tU/units).toFixed(1):'0.0'}건`,act:'ul',sid:'',tt:'팀 전체 미처리 목록 보기'},
    {cls:'wh'+(tLt>0?' kc-bad':''),label:'장기미처리(30일+)',val:tLt,unit:'건',meta:`미처리의 ${tU>0?(tLt/tU*100).toFixed(1):0}%`,act:'lul',sid:'',tt:'팀 전체 장기미처리 목록 보기'}]);
  const dashYears=[...new Set(Object.values(d.wk||{}).flatMap(dfYearsOf))].sort();
  const rmY=S.dfRm.slice(0,4);
  const dashYear=(dashYears.includes(S.dfTrendYearDash)?S.dfTrendYearDash:rmY);
  const dashWks=dashYear===rmY?d.wks:dfDashWksOfYear(d.wk,dashYear);
  root.innerHTML=kpis
    +dfTrendCardHTML('dfTrend','dash',dashYears,dashYear)
    +`<div class="opsr"><div class="card"><div class="ct cardttl">전월대비 실적 현황</div><div id="dfMom" class="mom-wrap"></div></div>${dfDonutCardHTML('현장별 미처리 분포','dfSx','dfSxLg')}</div>`
    +`<div class="opsr">${dfRiskDashHTML(sites,d.hh||{})||dfInsightHTML(d.ins)}${dfDonutCardHTML('공종별 미처리 분포','dfMx','dfMxLg')}</div>`   /* 712차: 분석 의견 자리에 민원 현황(세대 레벨 없으면 예전 인사이트) */
    +`<div class="card mb12"><div class="sh"><div class="ct cardttl">월별 하자처리 현황</div><select class="yr-sel" id="dfMoYr" data-act="df.moYear" aria-label="월별 연도 선택"></select></div><div style="overflow-x:auto" data-sbx="r"><table class="dt dt-detail" style="table-layout:fixed" id="dfDashMo"></table></div></div>`
    +`<div class="card mb12"><div class="sh"><div class="st cardttl" id="dfDashAxTtl">현장별 하자처리 현황</div><div class="axseg" id="dfDashAx" role="group" aria-label="묶는 기준"><button data-act="df.ax.dash" data-ax="site" class="${S.dfAxDash==='co'?'':'on'}">현장별</button><button data-act="df.ax.dash" data-ax="co" class="${S.dfAxDash==='co'?'on':''}">업체별</button></div></div><table class="dt" id="dfDashTbl" style="table-layout:fixed"></table></div>`;
  DF.lastDash=d;
  setTimeout(()=>{
    dfTrendDraw('trend','dfTrend',dashWks);
    dfMomRender('dfMom',{tR,res:tRes,unr:tU,lt:tLt,prev:{total:pT,res:pRes,unr:pU,lt:pLt}});
    /* 범례는 '힐스테이트'를 떼고 보여 준다 — 전체 이름은 툴팁으로 */
    dfDonutDraw('sx','dfSx','dfSxLg',all.filter(x=>x.st.unr>0).map(x=>({t:dfShortSite(x.s.name),full:x.s.name,c:x.st.unr})).sort((a,b)=>b.c-a.c));
    dfDonutDraw('mx','dfMx','dfMxLg',dfDonutData(d.am));
    dfDashMonthTable(d);
    dfDashTableFill(d);
  },30);
}
/* ── 현장 화면 ── */
window._dfSort=window._dfSort||{};
function dfSortPanel(tableId,th){
  const tbl=document.getElementById(tableId);if(!tbl||!th)return;
  const allTh=Array.prototype.slice.call(th.parentNode.children);
  const colIdx=allTh.indexOf(th);
  const type=th.dataset.sortType||'num';
  const st=window._dfSort[tableId]||{col:null,dir:-1};
  if(st.col===colIdx){if(st.dir===1){st.col=null;st.dir=-1;}else st.dir=1;}
  else{st.col=colIdx;st.dir=-1;}
  window._dfSort[tableId]=st;
  tbl.querySelectorAll('thead th').forEach((h,idx)=>{const mk=h.querySelector('.sortmk');const has='sort'in h.dataset;const act=st.col===idx&&has;h.classList.toggle('act',act);if(mk)mk.textContent=act?(st.dir===1?'▲':'▼'):'↕';});
  const tb=tbl.querySelector('tbody');if(!tb)return;
  const allRows=Array.prototype.slice.call(tb.querySelectorAll(':scope > tr'));
  const fixed=allRows.filter(r=>r.classList.contains('tot')||r.dataset.fixed==='1');
  let rows=allRows.filter(r=>!(r.classList.contains('tot')||r.dataset.fixed==='1'));
  if(st.col!==null){
    const gv=r=>{const cell=r.children[st.col];if(!cell)return type==='str'?'':-Infinity;let txt=(cell.textContent||'').trim();if(type==='str')return txt;txt=txt.replace(/\u2212/g,'-').replace(/[▲▼]/g,'');const num=parseFloat(txt.replace(/[^0-9.\-]/g,''));return isNaN(num)?-Infinity:num;};
    rows.sort((a,b)=>{const va=gv(a),vb=gv(b);const cmp=type==='str'?String(va).localeCompare(String(vb),'ko'):va-vb;return cmp*st.dir;});
  }
  rows.concat(fixed).forEach(r=>tb.appendChild(r));
}
/* 공종/업체 축 표 — 원본 aggNorm/aggRowHTML/siteAxParts 포트 */
const DF_SITE_TOP_N=15;
function dfAggNorm(list,axis){
  return (list||[]).map(x=>axis==='co'
    ?{key:x.c,side:x.trTop||'-',r:x.r,res:x.res,u:x.u,lt:x.lt,d0:x.d0,d30:x.d30,d60:x.d60,pu:x.pu||0,plt:x.plt||0}
    :{key:x.t,side:x.coTop||'-',r:x.r,res:x.res,u:x.u,lt:x.lt,d0:x.d0,d30:x.d30,d60:x.d60,pu:x.pu||0,plt:x.plt||0});
}
function dfAggRowHTML(x,i,axis,sid,blankIdx,isTot,foldRow){
  const rt=x.r>0?(x.res/x.r*100).toFixed(1):'0.0';
  /* 마지막 전월대비는 장기미처리 '건수' 증감 — 대시보드 표와 같은 표기(비율 %p 표기는 사용자 지시로 폐기) */
  const b1=dfDeltaParts(x.u-x.pu),b2=dfDeltaParts(x.lt-x.plt);
  const na=x.key==='(미기재)';
  const link=axis==='co'
    ?`data-act="rec.list" data-sid="${esc(sid)}" data-scope="ul" data-co="${esc(x.key)}"`
    :`data-act="rec.list" data-sid="${esc(sid)}" data-scope="ul" data-trade="${esc(x.key)}"`;
  return`<tr${isTot?' class="tot"':foldRow?' class="axfold" data-act="df.ax.siteAll"':''}><td class="cc">${(blankIdx||isTot)?'':i+1}</td>`
    +(isTot?`<td><b>${esc(x.key)}</b></td>`
      :x.fold?`<td><b class="axfold-k">${esc(x.key)} <span class="axfold-h">펼치기</span></b></td>`
      :na?`<td><b style="color:var(--lbl3);font-style:italic">${esc(x.key)}</b></td>`
      :`<td class="rl-link" ${link}><b>${esc(x.key)}</b></td>`)
    +`<td>${esc(x.side)}</td>`
    +`<td class="n">${x.r.toLocaleString()}</td>`
    +`<td class="n" style="color:var(--gn)">${x.res.toLocaleString()}</td>`
    +`<td class="cc" style="font-weight:600">${rt}%</td>`
    +`<td class="cc" style="color:var(--am);font-weight:600">${x.u.toLocaleString()}</td>`
    +`<td class="cc" style="white-space:nowrap"><span class="ba ${b1.dBadge}" data-tip="전월 ${x.pu.toLocaleString()} → 금월 ${x.u.toLocaleString()}">${b1.dArrow} ${b1.dTxt}</span></td>`
    +`<td class="n" style="color:var(--rd)">${x.lt.toLocaleString()}</td>`
    +`<td>${dfLtrBar(x.u,x.d60,x.d30,x.d0)}</td>`
    +`<td class="cc" style="white-space:nowrap"><span class="ba ${b2.dBadge}" data-tip="전월 ${x.plt.toLocaleString()} → 금월 ${x.lt.toLocaleString()}">${b2.dArrow} ${b2.dTxt}</span></td></tr>`;
}
function dfAxParts(sid,k){
  const ax=(S.dfAxSite==='co'&&(k.coAgg||[]).length)?'co':'trade';
  const all=dfAggNorm(ax==='co'?k.coAgg:k.trAgg,ax);
  const unit=ax==='co'?'곳':'개';
  let list=all,folded=false;
  const named=all.filter(x=>x.key!=='(미기재)'),na=all.filter(x=>x.key==='(미기재)');
  if(!S.dfAxSiteAll&&named.length>DF_SITE_TOP_N){
    const rest=named.slice(DF_SITE_TOP_N);
    const f=rest.reduce((a,r)=>{a.r+=r.r;a.res+=r.res;a.u+=r.u;a.lt+=r.lt;a.d0+=r.d0;a.d30+=r.d30;a.d60+=r.d60;a.pu+=r.pu;a.plt+=r.plt;return a;},
      {key:`그 외 ${rest.length}${unit}`,r:0,res:0,u:0,lt:0,d0:0,d30:0,d60:0,pu:0,plt:0,side:'-',fold:true});
    list=[...named.slice(0,DF_SITE_TOP_N),f,...na];folded=true;
  }
  const rows=list.map((x,i)=>dfAggRowHTML(x,i,ax,sid,!!(x.fold||x.key==='(미기재)'),false,!!x.fold)).join('')
    +(!folded&&named.length>DF_SITE_TOP_N?`<tr class="axfold" data-act="df.ax.siteAll"><td colspan="11">접기 — 상위 ${DF_SITE_TOP_N}${unit}만 보기</td></tr>`:'');
  const msg=(S.dfAxSite==='co'&&!(k.coAgg||[]).length)?'이 게시본에는 업체별 자료가 없습니다 · 재게시하면 보입니다':'데이터 없음';
  return{ax,rows,emptyRow:'<tr><td colspan="11" style="text-align:center;padding:14px;color:var(--lbl3)">'+esc(msg)+'</td></tr>'};
}
function dfSiteAxisOnly(sid){
  const tbl=document.getElementById('dfTrade-'+sid);if(!tbl){rDefect();return;}
  const k=DF.kpi[dfRm()+'/'+sid];if(!k)return;
  const P=dfAxParts(sid,k);
  const ths=tbl.querySelectorAll('thead th');
  if(ths[1])ths[1].firstChild.nodeValue=(P.ax==='co'?'시공업체':'공종')+' ';
  if(ths[2])ths[2].firstChild.nodeValue=(P.ax==='co'?'주요 공종':'시공업체')+' ';
  paintHTML(tbl.querySelector('tbody'),P.rows||P.emptyRow);
  const card=tbl.closest('.card');
  if(card){
    card.querySelectorAll('.axseg button').forEach(b=>b.classList.toggle('on',b.dataset.ax===(S.dfAxSite==='co'?'co':'trade')));
    const ttl=card.querySelector('.cardttl');if(ttl)ttl.textContent=(P.ax==='co'?'업체별':'공종별')+' 하자처리 현황';
  }
}
/* 지난달 계획 — 원본 prevPlanTop: 이번 달 입력 칸 바로 위에 쌓는다 */
function dfPrevPlanTop(sid,field,trade){
  const txt=dfPlanGet(sid,field,dfPrevMonth(S.dfRm),trade);
  return'<div class="pp-stack'+(txt?'':' pp-empty')+'"><span class="pp-lab">전월</span>'
    +(txt?'<div class="pp-box">'+esc(txt)+'</div>':'<span class="pp-none">-</span>')+'</div>';
}
function dfPlanCell(sid,field,trade){
  return`<td class="pp-cell">${dfPrevPlanTop(sid,field,trade)}<div class="pp-stack"><span class="pp-lab">금월</span><textarea class="inp plan-ta" rows="1" maxlength="5000" aria-label="처리계획" data-act="df.plan" data-sid="${esc(sid)}" data-f="${esc(field)}" data-t="${esc(trade)}">${esc(dfPlanGet(sid,field,S.dfRm,trade))}</textarea></div></td>`;
}
/* 상위 5개 공종 표 — 장기미처리·공가 공용(원본 trRowFn/vacRowsHTML) */
function dfTop5Rows(sid,topList,prevMap,denom,field,vac){
  const base=(topList||[]).filter(t=>!t.isT&&!t.isO);
  const etc=(topList||[]).find(t=>t.isO),tot=(topList||[]).find(t=>t.isT);
  const prevTot=Object.values(prevMap||{}).reduce((a,b)=>a+b,0);
  const rowFn=(t,i)=>{
    const ratio=denom>0?(t.c/denom*100).toFixed(1):'0.0';
    const pc=(prevMap||{})[t.t]||0,d=dfDeltaParts(t.c-pc);
    const link=`data-act="rec.list" data-sid="${esc(sid)}" data-scope="${vac?'ul':'lul'}" data-trade="${esc(t.t)}"${vac?` data-vac="${vac}"`:''}`;
    return`<tr><td class="cc"><b>${i+1}</b></td><td class="rl-link" ${link}><b>${esc(t.t)}</b></td><td>${esc(t.co||'-')}</td><td class="n">${pc.toLocaleString()}</td><td class="n" style="color:var(--bt1);font-weight:700">${t.c.toLocaleString()}</td><td class="cc" style="font-weight:600">${ratio}%</td><td class="cc" style="white-space:nowrap"><span class="ba ${d.dBadge}" data-tip="전월 ${pc.toLocaleString()} → 금월 ${t.c.toLocaleString()}">${d.dArrow} ${d.dTxt}</span></td>${dfPlanCell(sid,field,t.t)}</tr>`;};
  const etcFn=e=>{
    if(!e)return'';
    const pc=(e.keys||[]).reduce((a,k)=>a+((prevMap||{})[k]||0),0),d=dfDeltaParts(e.c-pc);
    const ratio=denom>0?(e.c/denom*100).toFixed(1):'0.0';
    const co=e.coN>0?`외 ${e.coN.toLocaleString()}개 업체`:'-';
    return`<tr data-fixed="1"><td class="cc"></td><td><b>기타</b></td><td>${co}</td><td class="n">${pc.toLocaleString()}</td><td class="n" style="color:var(--bt1);font-weight:700">${e.c.toLocaleString()}</td><td class="cc" style="font-weight:600">${ratio}%</td><td class="cc" style="white-space:nowrap"><span class="ba ${d.dBadge}" data-tip="전월 ${pc.toLocaleString()} → 금월 ${e.c.toLocaleString()}">${d.dArrow} ${d.dTxt}</span></td>${dfPlanCell(sid,field,'기타')}</tr>`;};
  const totFn=t=>{
    if(!t)return'';
    const d=dfDeltaParts(t.c-prevTot);
    return`<tr class="tot"><td class="cc"></td><td><b>합계</b></td><td></td><td class="n"><b>${prevTot.toLocaleString()}</b></td><td class="n" style="color:var(--bt1)"><b>${t.c.toLocaleString()}</b></td><td class="cc"><b>100.0%</b></td><td class="cc" style="white-space:nowrap"><span class="ba ${d.dBadge}" data-tip="전월 ${prevTot.toLocaleString()} → 금월 ${t.c.toLocaleString()}">${d.dArrow} ${d.dTxt}</span></td><td class="pp-cell"><div style="min-height:32px"></div></td></tr>`;};
  return(base.map(rowFn).join('')+etcFn(etc)+totFn(tot))
    ||'<tr><td colspan="8" style="text-align:center;padding:14px;color:var(--lbl3)">해당 없음</td></tr>';
}
const DF_TOP5_THEAD='<thead><tr><th class="cc" style="width:6%">순위</th><th style="width:11%">공종</th><th style="width:11%">시공업체</th><th class="n" style="width:7%">전월</th><th class="n" style="width:7%">금월</th><th class="cc" style="width:7%">비율</th><th class="cc" style="width:7%;white-space:nowrap">전월대비</th><th style="width:44%">처리계획</th></tr></thead>';
/* 장기미처리 비율 현황 — 전월/금월 누적 가로 바 + 증감 배지 (화면·인쇄 공용) */
function dfLtrMomHTML(st){
  const curLtr=Number(st.ltr)||0,prevLtr=Number(st.prev&&st.prev.ltr)||0,dLtr=Number((curLtr-prevLtr).toFixed(1));
  const dCls=dLtr>0?'up':dLtr<0?'dn':'eq',dArrow=dLtr>0?'▲':dLtr<0?'▼':'─',dSign=dLtr>0?'+':dLtr<0?'−':'';
  const maxUnr=Math.max((st.prev&&st.prev.unr)||0,st.unr||0,1);
  const momRow=(label,dd,unr,isCur)=>{
    const d0=dd[0]||0,d30=dd[1]||0,d60=dd[2]||0,tot=unr||0;
    const lt=d30+d60,ltr=tot>0?lt/tot*100:0,fillW=tot/maxUnr*100;
    const w=n=>tot>0?(n/tot*100):0;
    const seg=(cls,lbl,n)=>{const wd=w(n);if(wd<=0)return'';return`<div class="seg ${cls}" data-tip="${label} ${lbl} ${n.toLocaleString()}건 / ${tot.toLocaleString()}건" style="width:${wd}%"><span class="seg-v">${n.toLocaleString()}</span></div>`;};
    const segs=tot>0?(seg('s60','60일 이상',d60)+seg('s30','30~59일',d30)+seg('s0','30일 미만',d0)):'';
    return`<div class="ltrmom-row${isCur?' cur':''}"><span class="lm-mo">${label}</span><span class="lm-stat">${lt.toLocaleString()}건 · ${ltr.toFixed(1)}%</span><div class="ltrmom-bar"><div class="lm-fill" style="width:${fillW}%">${segs}</div></div></div>`;};
  return `<div class="card ltrmom-card" data-print="tr-ltr"><div class="ltrmom-head"><span class="lm-ttl">장기미처리 비율 현황</span><div class="ltrmom-lg"><div class="li"><span class="mk ck-d60"></span>60일 이상</div><div class="li"><span class="mk ck-d30"></span>30~59일</div><div class="li"><span class="mk ck-d0"></span>30일 미만</div></div></div><div class="ltrmom-body"><div class="ltrmom-rows">${momRow('전월',(st.prev&&st.prev.dd)||[0,0,0],(st.prev&&st.prev.unr)||0,false)}${momRow('금월',st.dd||[0,0,0],st.unr||0,true)}</div><div class="ltrmom-delta"><span class="lm-delta ${dCls}" data-tip="전월 ${prevLtr.toFixed(1)}% → 금월 ${curLtr.toFixed(1)}%">${dArrow} ${dSign}${Math.abs(dLtr).toFixed(1)}%</span></div></div></div>`;
}
/* 월별 현황 카드 — 상세 탭·인쇄 공용 */
function dfMonthCardHTML(st,curYear,pickerHTML){
  const wkAll=(st.weekly||[]).slice().sort((a,b)=>a.week<b.week?-1:1);
  const eq='6.5%',ltrW='16%';
  const moColgroup=`<colgroup><col style="width:9%">${('<col style="width:'+eq+'">').repeat(9)}<col style="width:${ltrW}"><col style="width:${eq}"></colgroup>`;
  const moThead=`<thead><tr>${dfTh('','월')}${dfThG('','전체 접수')}${dfTh('recv-sub','월간 접수')}${dfThG('','전체 처리')}${dfTh('rate-col','처리율')}${dfTh('','월간 처리')}${dfTh('','전월대비')}${dfThG('','전체 미처리')}${dfTh('','전월대비')}${dfTh('tl-grp-ltr','장기미처리')}<th class="cc tl-grp-ltr">장기미처리 비율</th><th class="cc">전월대비</th></tr></thead>`;
  const{keys:moKeys,map:moMap}=dfMoSnapsSite(wkAll);
  const moBody=moKeys.map((mk2,i)=>({w:moMap[mk2],k:mk2,m:dfMetrics(moMap[mk2],i>0?moMap[moKeys[i-1]]:null,i>1?moMap[moKeys[i-2]]:null),first:i===0,yr:mk2.slice(0,4)}))
    .filter(x=>x.yr===curYear&&x.k<=S.dfRm)
    .map(x=>{const{w,m,first}=x;
      return`<tr${x.k===S.dfRm?' class="cur-row"':''}><td class="cc mcell">${w.m}월</td><td class="cc recv-total tl-grp">${dfNF(m.tR)}</td><td class="cc recv-weekly">${dfNF(m.recvW)}</td><td class="cc proc-blue tl-grp">${dfNF(m.cumRes)}</td><td class="rate-col proc-blue">${m.rate.toFixed(1)}%</td><td class="cc proc-blue">${dfNF(m.resW)}</td><td class="cc">${dfDlt(m.resWDlt,first,m.resW,'월')}</td><td class="cc unr-red tl-grp">${dfNF(m.unr)}</td><td class="cc">${dfDlt(m.unrDlt,first,m.unr,'월')}</td>${dfLtrCells(m.d0,m.d30,m.d60,m.unr,m.ltDlt,first,'월')}</tr>`;}).join('');
  return `<div class="card" data-print="tl-month"><div class="sh"><div class="st cardttl">월별 현황</div>${pickerHTML||''}</div><div style="overflow-x:auto" data-sbx="r"><table class="dt dt-detail" style="table-layout:fixed">${moColgroup}${moThead}<tbody>${moBody||'<tr><td colspan="12" style="text-align:center;padding:14px;color:var(--lbl3)">데이터 없음</td></tr>'}</tbody></table></div></div>`;
}
/* 공가 탭 — 현재 앱 게시본의 공가 수(미분양·미키불출)를 표시한다. */
/* 709차: 민원 세대 탭 — 레벨별 세대 수 + 주의 이상 세대 목록(근거 펼침) */
const RISK_COLORS={긴급:'#DA6A60',심각:'#E89C9A',경계:'#B3C7DD',주의:'#CDD3DB',양호:'#EEF0F3'};   /* 722차: 장기미처리 차트와 같은 색 계열(--ch-d60/d30/d0) */
/* 711차: 대시보드 「민원 현황」 — 현장별 긴급·심각·경계·주의 세대 수. 팀장은 건이 아니라 현장을 본다. 행 클릭 → 그 현장 민원 현황 탭 */
function dfRiskDashHTML(sites,hh){
  const rows=sites.map(s=>({s,c:hh[s.id]||null})).filter(x=>x.c);
  if(!rows.length)return '';
  rows.sort((a,b)=>(((b.c.긴급||0)+(b.c.심각||0))-((a.c.긴급||0)+(a.c.심각||0)))||((b.c.긴급||0)-(a.c.긴급||0)));
  /* 714차: 히트맵 — 현장 × 레벨, 셀 농도 = 열 최대값 대비 세대 수. 숫자가 다 보이고 14현장이 한 화면. 행 클릭 → 그 현장 민원 현황 */
  const LV=['긴급','심각','경계','주의','양호'];const RGB={긴급:'218,106,96',심각:'232,156,154',경계:'179,199,221',주의:'120,128,140'};   /* 738차: 긴급·심각·경계 = 장기미처리 차트 3단(--ch-d60/d30/d0)과 같은 색 — 긴급·심각이 같은 빨강이라 구분이 안 됐다. 농도 범위도 갈라(긴급 .45~.95 · 심각 .15~.70) 같은 세대 수라도 긴급이 늘 진하다 */
  const mx={};LV.forEach(k=>{mx[k]=Math.max(1,...rows.map(({c})=>c[k]||0));});
  /* 715차: 세대 열 없음(표 자체가 세대 수). 셀을 누르면 그 현장·레벨의 세대 목록 모달, 현장명을 누르면 현장 페이지 */
  const cell=(sid,k,v)=>{const n=(v||0).toLocaleString();if(k==='양호')return `<button class="rkh-c rkh-ok" data-act="df.riskCell" data-sid="${esc(sid)}" data-lv="${k}">${n}</button>`;const AR={긴급:[0.55,0.45],심각:[0.5,0.5]}[k]||[0.5,0.45];   /* 769차: 최소 농도 .5~.55 — 흰 글자 가독성(사용자 스크린샷) */const a=v?AR[0]+AR[1]*v/mx[k]:0;return `<button class="rkh-c" data-act="df.riskCell" data-sid="${esc(sid)}" data-lv="${k}" style="background:rgba(${RGB[k]},${a.toFixed(2)})">${n}</button>`;};   /* 768차: 글자는 전부 흰색(그림자로 가독성) — 농도 따라 흰/검 섞이던 것 정리 */
  /* 769차: 권역을 앞에 작게(현장명 폭은 내용 폭까지만) */
  const tr=({s,c})=>`<div class="rkh-r"><span class="rkh-rg">${esc(s.region||'')}</span><button class="rkh-n" data-act="df.siteRisk" data-sid="${esc(s.id)}" data-tip="${esc(s.name)}">${esc((isMob()&&!WIDGET)?dfShortSite(s.name):s.name)}</button>${LV.map(k=>cell(s.id,k,c[k])).join('')}</div>`;
  /* 769차: 현장명 칸 폭 = 가장 긴 이름 기준(한 글자 ≈ 12.5px, 최대 240) — 행마다 격자가 따로라 max-content 로는 열이 안 맞는다 */
  const nameW=Math.min(240,Math.max(120,Math.round(Math.max(...rows.map(({s})=>String(s.name||'').length))*12.5+12)));
  return `<div class="card rkh" style="--rkhn:${nameW}px"><div class="ct cardttl">현장별 민원 현황</div>
    <div class="rkh-h"><span></span><span></span>${LV.map(k=>`<span>${k}</span>`).join('')}</div>
    <div class="rkh-body">${rows.map(tr).join('')}</div></div>`;
}
/* 717차: 세대 표 공용 렌더러 — 현장 페이지(ns='site')와 히트맵 셀 모달(ns='modal')이 같은 표를 쓴다.
   상태 S.rk[ns] = {q:{lv,bu,un,fac,ty}, sort:{k,d}, limit, search, filt}. 필터는 ';' OR. 표시 건수 100·300·1,000·전체(780차 주석 최신화). */
function rkState(ns){S.rk=S.rk||{};return S.rk[ns]||(S.rk[ns]={q:{},sort:{k:'lv',d:-1},limit:100,filt:false});}   /* filt: 필터 줄 — 처음엔 없고 머리 우클릭으로 켠다(목록보기와 같은 방식) */
/* 757차: 현장 표는 검색·칩·표시 건수 변경 때 카드 안쪽만 다시 그린다(전체 rDefect 는 현황도·막대까지 다시 그려 타이핑이 버벅였다). 목록은 dfRiskPane 이 S._rkSiteList 에 둔다 */
function rkRerender(ns){if(ns==='modal'){dfRiskModalBody();return;}const c=document.querySelector('#view-defect .rk-card');if(c&&S._rkSiteList){c.innerHTML=dfRiskTableHTML(S._rkSiteList,'site');fadeSoon();ovsRefresh();}else rDefect();}
function dfRiskTableHTML(all,ns){
  /* 734차: 게시본(Firebase)은 빈 배열을 떨어뜨린다 — 양호·물리만인 세대는 factors 가 없어 .join 에서 죽어 모달이 「불러오는 중…」에 멈추고 현장 탭이 안 열렸다 */
  all=(all||[]).map(h=>({...h,factors:h.factors||[],types:h.types||[],evid:h.evid||[]}));
  const st=rkState(ns),q=st.q||{},so=st.sort||{k:'lv',d:-1};
  const has=(v,x)=>{if(!x)return true;const t=String(v||'').toLowerCase();return String(x).split(/[;,]/).map(z=>z.trim().toLowerCase()).filter(Boolean).some(z=>t.includes(z));};
  const hhName=h=>(/동$/.test(h.bu)?h.bu:h.bu+'동')+' '+(/호$/.test(h.un)?h.un:h.un+'호');
  const qq=String(st.search||'').trim().toLowerCase();
  const blob=h=>[h.level,hhName(h),h.factors.join(' '),(h.types||[]).map(t=>t.t).join(' '),(h.evid||[]).map(e=>[e.sp,e.tr,e.ty,e.t].join(' ')).join(' ')].join(' ').toLowerCase();
  let list=all.filter(h=>has(h.level,q.lv)&&has(h.bu,q.bu)&&has(h.un,q.un)&&has(h.factors.join(' '),q.fac)&&has((h.types||[]).map(t=>t.t).join(' '),q.ty)&&(!qq||blob(h).includes(qq)));   /* 735차: 검색은 세대·감지요소·유형·근거 접수내용까지 */
  const kv={lv:h=>h.lv,sc:h=>h.sc||0,bu:h=>Number(h.bu)||0,un:h=>Number(h.un)||0,n:h=>h.n,done:h=>h.done||0,open:h=>h.open,fac:h=>h.factors.length,ty:h=>(h.types||[]).length};
  const kf=kv[so.k]||kv.lv;list=list.slice().sort((a,b)=>{const x=kf(a),y=kf(b);return (x>y?1:x<y?-1:0)*so.d||(b.lv-a.lv)||((b.sc||0)-(a.sc||0))||(b.open-a.open)||(b.factors.length-a.factors.length);});   /* 750차: 레벨 → 점수 → 미처리 */
  const W={lv:60,sc:38,bu:62,un:58,n:52,done:62,open:54};   /* 755차: 레벨 60·점수 38, 합 386. 안쪽 표는 NO 58(=레벨−선 2)·접수일 100(=점수+동)·공간·공종·하자유형 74+76+76(=호~미처리 226) 로 384 */
  const th=(k,nm,cls)=>`<th class="rk-th${cls?' '+cls:''}${so.k===k?' on':''}" data-act="df.riskSort" data-ns="${ns}" data-k="${k}"${W[k]?` style="width:${W[k]}px"`:k==='ty'?' style="width:300px"':''}>${nm}${so.k===k?(so.d>0?' ↑':' ↓'):''}</th>`;
  const RKC={긴급:'rkl rkl-ur',심각:'rkl rkl-hi',경계:'rkl rkl-mg',주의:'rkl rkl-wa'};
  const chip=f=>`<span class="rk-t${RISK_RULES.factors[f]&&RISK_RULES.factors[f].crit?' crit':''}">${esc(f)}</span>`;
  const FOr=Object.keys(RISK_RULES.factors),Fd=RISK_RULES.factors,fw=f=>(Fd[f]&&Fd[f].crit)?2:(Fd[f]&&Fd[f].soft)?0:1;
  const facOrd=a=>a.slice().sort((x,y)=>(fw(y)-fw(x))||(FOr.indexOf(x)-FOr.indexOf(y)));   /* 744차: 칩은 중요한 순 — 옛 게시본도 같게 */
  const typeChip=t=>`<span class="rk-t${t.lv>=4?' hard':''}">${esc(t.t)}${t.n>1?`<span class="rk-tn">${t.n}</span>`:''}</span>`;
  /* 719차: 펼침 = 문제가 된 하자건을 하자 목록처럼 표로 */
  /* 721차: 접수번호(10자리) 폭 맞춤 · 접수번호~하자유형 가운데 · 접수번호 클릭 복사 */
  /* 722차: 앞은 NO, 뒤는 처리상태 */
  /* 724차: 열폭을 바깥 표에 맞춘다 — NO~하자유형 합 384px(= 레벨60+점수38+동62+호58+접수52+처리완료62+미처리54 − 선 2), 접수내용 = 바깥 감지요소, 처리상태 74 + 감지요소 226 = 바깥 하자 유형 300(757차: 칩 4개가 들어가게 251→300), 감지요소+처리상태 = 20%(= 바깥 하자 유형) */
  /* 755차: 접수내용 = 바깥 감지요소, 처리상태 74 는 바깥 하자 유형 시작선에, 감지요소 177 이 그 뒤. 앞 다섯 열 합 384 = 바깥 레벨~미처리 386 − 선 2 */
  const evTbl=list=>`<table class="rk-etbl"><thead><tr><th class="cc" style="width:58px">NO</th><th class="cc" style="width:100px">접수일</th><th class="cc" style="width:74px">공간</th><th class="cc" style="width:76px">공종</th><th class="cc" style="width:76px">하자유형</th><th>접수내용</th><th class="cc" style="width:74px">처리상태</th><th style="width:226px">감지요소</th></tr></thead><tbody>${list.map((e,i)=>e.auto?`<tr class="rk-auto"><td class="cc">—</td><td class="cc" colspan="4">자동 판정</td><td class="rk-etx">${esc(e.t)}</td><td></td><td class="rk-f">${(e.f||[]).map(chip).join('')}</td></tr>`:`<tr><td class="cc">${i+1}</td><td class="cc">${esc(e.d||'')}</td><td class="cc">${esc(e.sp||'')}</td><td class="cc">${esc(e.tr||'')}</td><td class="cc">${esc(e.ty||'')}</td><td class="rk-etx">${esc(e.t)}</td><td class="cc">${e.st==='완료'?'처리완료':'미처리'}</td><td class="rk-f"${((e.f||[]).length>1||(e.f||[]).join('').length>9)?` data-tip="${esc((e.f||[]).join(' · '))}"`:''}>${(e.f||[]).map(chip).join('')}</td></tr>`).join('')}</tbody></table>`;
  /* 734차: 「더 보기」 대신 목록보기와 같은 표시 건수(st.limit: 100·300·1000·전체) */
  const lim=st.limit===undefined?100:st.limit;
  const shown=lim>0?Math.min(list.length,lim):list.length;   /* 736차: 현장 표도 모달과 같은 표시 건수 */
  const rows=list.slice(0,shown).map((h,i)=>`<tr class="rk-r" data-act="df.riskOpen" data-ns="${ns}" data-i="${i}" data-h="${i}"><td class="cc"><span class="${RKC[h.level]||'rkl rkl-ok'}">${esc(h.level)}</span></td><td class="cc rk-sc">${h.sc||0}</td><td class="cc">${esc(h.bu)}</td><td class="cc">${esc(h.un)}</td><td class="cc">${h.n}</td><td class="cc">${h.done||0}</td><td class="cc">${h.open?`<b style="color:var(--rd)">${h.open}</b>`:'0'}</td><td class="rk-f">${facOrd(h.factors).map(chip).join('')||'<span class="rk-sub" style="margin:0">'+esc(h.why||'')+'</span>'}</td><td class="rk-f">${(h.types||[]).map(typeChip).join('')}</td></tr>
    <tr class="rk-ev" data-ns="${ns}" data-i="${i}" hidden><td colspan="9">${(h.evid||[]).length?evTbl(h.evid):'<div class="rk-none">근거 접수건 없음'+(h.why?' · '+esc(h.why):'')+'</div>'}</td></tr>`).join('')
    +'';
  const inp=(k,ph,cls)=>`<td><input class="rk-q${cls?' '+cls:''}" data-act="df.riskQ" data-ns="${ns}" data-q="${k}" value="${esc(q[k]||'')}" placeholder="${ph}"></td>`;
  const filt=st.filt?`<tr class="rk-fr">${inp('lv','레벨','cc')}<td></td>${inp('bu','동','cc')}${inp('un','호','cc')}<td></td><td></td><td></td>${inp('fac','감지요소')}${inp('ty','하자 유형')}</tr>`:'';
  const tbl=`<table class="dt rk-tbl"><thead><tr>${th('lv','레벨','cc')}${th('sc','점수','cc')}${th('bu','동','cc')}${th('un','호','cc')}${th('n','접수','cc')}${th('done','처리완료','cc')}${th('open','미처리','cc')}${th('fac','감지요소')}${th('ty','하자 유형')}</tr>${filt}</thead><tbody>${rows||'<tr><td colspan="9"><div class="dfnone">해당 세대가 없습니다</div></td></tr>'}</tbody></table>`;
  /* 모달·현장 공통(736차):  머리와 표 사이에 감지요소·하자유형 칩(목록보기 밴드와 같은 꼴, 누르면 ';' OR 필터) + 표시 건수, 표는 세로·가로 스크롤 */
  const tok=v=>String(v||'').split(/[;,]/).map(z=>z.trim()).filter(Boolean);
  const on=(k,x)=>tok(q[k]).includes(x);
  const cntF={},cntT={};all.forEach(h=>{h.factors.forEach(f=>{cntF[f]=(cntF[f]||0)+1;});h.types.forEach(t=>{cntT[t.t]=(cntT[t.t]||0)+1;});});
  const FO=Object.keys(RISK_RULES.factors);
  const facs=Object.keys(cntF).sort((a,b)=>(FO.indexOf(a)-FO.indexOf(b))||(cntF[b]-cntF[a]));
  const tys=Object.keys(cntT).sort((a,b)=>cntT[b]-cntT[a]).slice(0,12);
  const bchip=(k,x,n)=>`<button class="rl-band${on(k,x)?' on':''}" data-act="df.riskChip" data-ns="${ns}" data-q="${k}" data-v="${esc(x)}">${esc(x)} <b>${n.toLocaleString()}</b></button>`;
  const limBtn=n=>`<button class="${lim===n?'on':''}" data-act="df.riskLimit" data-ns="${ns}" data-n="${n}">${n>0?n.toLocaleString()+'세대':'전체'}</button>`;
  /* 737차: 두 줄 — 1행 감지요소 칩 / 검색, 2행 하자유형 칩 / 표시 건수(모달·현장 동일). 검색 id 는 ns 별(rkQ·rkQs) */
  /* 738차: 모달은 검색창이 머리(닫기 옆)에 있으므로 1행에 안 둔다 */
  const srch=ns==='modal'?'':`<span class="rl-q-wrap rk-qs${st.search?' has':''}"><svg class="icn icn-sm" aria-hidden="true"><use href="#i-search"></use></svg><input id="rkQs" class="rl-q" placeholder="세대 · 감지요소 · 유형 · 접수내용" value="${esc(st.search||'')}" autocomplete="off"><button class="rl-qx" data-act="df.riskQClear" data-ns="site" aria-label="지우기">×</button></span>`;
  /* 739차(740차 순서 교체): 1행 하자유형 칩 + (현장: 검색) + 표시 건수, 2행 감지요소 칩. 칩 묶음은 줄바꿈 대신 가로 스크롤(.rk-chips, 페이드) — 감지요소 11종이 다 나와도 한 줄 */
  const lim2=`<span class="rl-lim"><span class="rl-lim-lbl">표시</span>${limBtn(100)}${limBtn(300)}${limBtn(1000)}${limBtn(0)}</span>`;
  /* 740차: 1행 하자유형(짧고 개수 적음) + 검색·표시, 2행 감지요소(길고 11종까지) — 모달·현장 동일 */
  /* 741차: 현장 표는 1행 하자유형 + 검색, 2행 감지요소 + 표시. 모달은 검색이 머리에 있어 1행 하자유형 + 표시, 2행 감지요소 */
  const bar=`<div class="rl-band-bar rk-band"><div class="rk-chips" data-sbx>${tys.map(t=>bchip('ty',t,cntT[t])).join('')}</div>${ns==='modal'?lim2:srch}</div>`
    +`<div class="rl-band-bar rk-band rk-band2"><div class="rk-chips" data-sbx>${facs.map(f=>bchip('fac',f,cntF[f])).join('')}</div>${ns==='modal'?'':lim2}</div>`;
  return bar+(ns==='modal'?`<div class="rk-wrap">${tbl}</div>`:`<div style="overflow-x:auto" data-sbx="r">${tbl}</div>`);
}
/* 히트맵 셀 → 그 현장·레벨 세대 목록 모달(현장 페이지 표와 동일, 탭만 없음) */
async function dfRiskCellModal(sid,lv){
  const st=dfSites().find(x=>x.id===sid);if(!st)return;
  openModal('','<div class="dfnone">불러오는 중…</div>','');
  const mb=$('#mb');if(mb){mb.classList.add('dfwide');mb.classList.add('rkm');}
  let k=null;try{k=await dfSiteData(sid);}catch(e){}
  const list=k&&k.hh?(k.hh.list||[]).filter(h=>h.level===lv):[];
  S.rk=S.rk||{};S.rk.modal={q:{},sort:{k:'lv',d:-1},limit:100};S.rkModal={sid,lv,list,name:st.name};
  dfRiskModalBody();
}
function dfRiskModalBody(){
  const m=S.rkModal;if(!m)return;
  /* 735차: 머리 = 제목 + 검색창(목록보기와 같은 자리). 입력은 input 위임(rk-search)이라 본문만 다시 그려 커서가 살아 있다 */
  const st=rkState('modal');
  const t=$('#mt');if(t&&!$('#rkN'))t.innerHTML='<div class="rl-head"><span class="rl-ttl">'+esc(m.name+' · '+m.lv+' '+m.list.length.toLocaleString()+'세대')+'</span><span class="rec-n" id="rkN"></span>'
    +'<div class="rl-acts"><span class="rl-q-wrap'+(st.search?' has':'')+'"><svg class="icn icn-sm" aria-hidden="true"><use href="#i-search"></use></svg><input id="rkQ" class="rl-q" placeholder="세대 · 감지요소 · 유형 · 접수내용" value="'+esc(st.search||'')+'" autocomplete="off"><button class="rl-qx" data-act="df.riskQClear" data-ns="modal" aria-label="지우기">×</button></span>'
    +'<button class="btn bg2 bsm" data-act="modal.close">닫기</button></div></div>';
  /* 738차: 검색창은 머리(닫기 옆) — 머리는 한 번만 그리므로 입력해도 본문만 다시 그려진다 */
  const b=$('#mbody');if(b)b.innerHTML=dfRiskTableHTML(m.list,'modal');
  fadeSoon();   /* 739차: 페이드 관찰자는 #app 만 본다 — 모달(#mo)의 칩 줄(.rk-chips[data-sbx])은 직접 */
  const nEl=$('#rkN');if(nEl){const n=b?b.querySelectorAll('.rk-r').length:0;const shown=(st.search||Object.values(st.q||{}).some(Boolean));nEl.textContent=shown?'결과 '+n.toLocaleString()+' / 전체 '+m.list.length.toLocaleString():'';}
  const f=$('#mf');if(f)f.innerHTML='';
}
/* 745차(시안): 동별 세대 배치도 — 동마다 층(위→아래) × 라인(호 끝 두 자리) 격자, 칸 색 = 세대 레벨. 접수 없는 세대는 빈 칸(세대 목록이 없어 접수된 세대만 안다).
   칸을 누르면 아래 표를 그 세대로 검색. 동 블록은 가로로 흐르고 넘치면 가로 스크롤(페이드) */
function dfRiskMapHTML(all){
  /* 764차: 오기입 호(실데이터 「49014」)가 실제로 있어 격자를 490층까지 늘렸다 → 층이 RISK_MAP_MAXFL(70) 넘는 호, 그리고 동 안에서 아래 무리와 RISK_MAP_GAP(8)층 이상 떨어진 3세대 이하 위 무리는 격자에서 **조용히 뺀다**(별도 칩 없음 — 표에는 그대로 있다). 호가 3자리 이상 숫자인 세대만, 1F 부터 라인별 최고층까지. 같은 목록이면 HTML 재사용 */
  const C=RISK_COLORS;
  if(dfRiskMapHTML._k===all&&dfRiskMapHTML._h)return dfRiskMapHTML._h;
  const by=new Map();
  for(const h of all){
    const bu=String(h.bu||''),m=String(h.un||'').match(/^(\d+)$/),n=m?Number(m[1]):NaN;if(!(n>=100))continue;
    const fl=Math.floor(n/100),ln=n%100;if(fl>RISK_MAP_MAXFL)continue;
    let b=by.get(bu);if(!b){b={bu,top:{},cells:new Map()};by.set(bu,b);}
    b.top[ln]=Math.max(b.top[ln]||0,fl);b.cells.set(fl+'-'+ln,h);
  }
  for(const b of by.values()){
    const fls=[...new Set([...b.cells.values()].map(h=>Math.floor(Number(h.un)/100)))].sort((x,y)=>x-y);
    let cut=Infinity;
    for(let i=1;i<fls.length;i++){if(fls[i]-fls[i-1]>=RISK_MAP_GAP){const above=[...b.cells.values()].filter(h=>Math.floor(Number(h.un)/100)>=fls[i]).length;if(above<=3){cut=fls[i];break;}}}
    if(cut<Infinity){for(const [k,h] of [...b.cells.entries()]){if(Math.floor(Number(h.un)/100)>=cut)b.cells.delete(k);}
      b.top={};for(const h of b.cells.values()){const n=Number(h.un),fl=Math.floor(n/100),ln=n%100;b.top[ln]=Math.max(b.top[ln]||0,fl);}
      if(!b.cells.size)by.delete(b.bu);}
  }
  if(!by.size)return '';
  const hhN=h=>(/동$/.test(String(h.bu))?h.bu:h.bu+'동')+' '+(/호$/.test(String(h.un))?h.un:h.un+'호');
  /* 781차: 3단 — ①동·호 ②레벨·점수 ③감지요소(#htip 이 white-space:pre-line 이라 \n 이 줄로 산다) */
  const tip=h=>esc(hhN(h)+'\n'+h.level+' · '+(h.sc||0)+'점');
  const tipc=h=>' data-tipc="'+esc(C[h.level]||'')+'"';   /* 783차: 툴팁 둘째 줄(레벨) 글자색 */
  const key=x=>{const m=String(x).match(/\d+/);return m?Number(m[0]):9999;};
  const blocks=[...by.values()].sort((a,b)=>key(a.bu)-key(b.bu)).map(b=>{
    const lns=Object.keys(b.top).map(Number).sort((x,y)=>x-y);const maxF=Math.max(...Object.values(b.top));
    let rows='';
    for(let f=maxF;f>=1;f--){
      rows+=`<div class="rkm-row"><span class="rkm-fl">${f}F</span>${lns.map(l=>{
        if(f>b.top[l])return '<span class="rkm-c gap"></span>';
        const h=b.cells.get(f+'-'+l),un=f*100+l;
        if(!h)return `<span class="rkm-c">${un}</span>`;
        return `<button class="rkm-c on${h.level==='긴급'?' inv':''}" style="background:${C[h.level]||C.양호}" data-act="df.riskMapPick" data-q="${esc(hhN(h))}" data-tip="${tip(h)}"${tipc(h)}>${un}</button>`;}).join('')}</div>`;
    }
    const foot=`<div class="rkm-row rkm-ft"><span class="rkm-fl"></span>${lns.map(l=>`<span class="rkm-c rkm-ln">${l}호</span>`).join('')}</div>`;
    return `<div class="rkm-b"><div class="rkm-grid">${rows}${foot}</div><div class="rkm-row"><span class="rkm-fl"></span><div class="rkm-bt">${esc(/동$/.test(b.bu)?b.bu:b.bu+'동')}</div></div></div>`;
  }).join('');
  const html=`<div class="rk-sep"></div><div class="rkm-sec"><div class="rkm-wrap">${blocks}</div></div>`;
  dfRiskMapHTML._k=all;dfRiskMapHTML._h=html;return html;
}
const RISK_MAP_MAXFL=70,RISK_MAP_GAP=8;

function dfRiskPane(hh){
  if(!hh)return '<div class="as"><div class="card"><div class="dfnone">이 게시본에는 세대 레벨 정보가 없습니다 — 원본을 다시 등록·게시하면 채워집니다.</div></div></div>';
  const c=hh.cnt||{},all=hh.list||[],fac=hh.fac||{};
  const cur=RISK_LEVELS.includes(S.dfRiskLv)?S.dfRiskLv:'';
  const tab=(id,nm,n)=>`<button class="rp-tab${cur===id?' on':''}" data-act="df.riskLv" data-lv="${esc(id)}">${esc(nm)}<span class="rp-tcnt">${(n||0).toLocaleString()}</span></button>`;
  /* 737차: 레벨 탭은 카드 밖 탭 줄(업무 현황의 .tkbar 과 같은 문법) — 카드 안에는 칩·검색·표만 */
  const tabs=`<div class="tkbar rk-tabbar"><div class="rp-tabs tkm-tabs tkbar-tabs" data-sbx>${tab('','전체',all.length)}${['긴급','심각','경계','주의','양호'].map(l=>tab(l,l,c[l])).join('')}</div></div>`;
  /* 722차: 장기미처리 비율 현황과 같은 폼 — 머리(제목+범례) · 전월/금월 두 줄 · 오른쪽 전월대비 배지(긴급 기준) */
  const viz=`<div class="card ltrmom-card rkmom-card"><div class="ltrmom-head"><span class="lm-ttl">민원 세대 현황</span><div class="ltrmom-lg">${RISK_LEVELS.slice().reverse().map(k=>`<div class="li"><span class="mk" style="background:${RISK_COLORS[k]}"></span>${k}</div>`).join('')}<div class="li"><span class="mk" style="background:var(--bg);box-shadow:inset 0 0 0 1px var(--sep)"></span>접수 없음</div></div></div><div class="ltrmom-body" id="dfRkMom"></div>${dfRiskMapHTML(all)}</div>`;
  setTimeout(async()=>{
    const el=document.getElementById('dfRkMom');if(!el)return;
    const rm=dfRm(),[y,m]=rm.split('-').map(Number);const pyr=(m===1?(y-1)+'-12':y+'-'+String(m-1).padStart(2,'0'));
    let pc=null;try{if(S.live&&FB.db&&S.dfSid)pc=await dfRef('report/'+pyr+'/'+S.dfSid+'/kpi/hh/cnt');}catch(e){}
    const mx=Math.max((pc&&pc.total)||0,c.total||0,1);
    const row=(label,cc,isCur)=>{
      const tot=(cc&&cc.total)||0,ur=(cc&&cc.긴급)||0,urr=tot>0?ur/tot*100:0;
      const segs=tot>0?RISK_LEVELS.slice().reverse().map(k=>{const n=(cc&&cc[k])||0;if(!n)return '';return `<div class="seg" data-tip="${label} ${k} ${n.toLocaleString()}세대" style="width:${(n/tot*100).toFixed(2)}%;background:${RISK_COLORS[k]}"><span class="seg-v">${n.toLocaleString()}</span></div>`;}).join(''):'';
      return `<div class="ltrmom-row${isCur?' cur':''}"><span class="lm-mo">${label}</span><span class="lm-stat">${ur.toLocaleString()}세대 · ${urr.toFixed(1)}%</span><div class="ltrmom-bar"><div class="lm-fill" style="width:${(tot/mx*100).toFixed(2)}%">${segs}</div></div></div>`;
    };
    /* 배지는 장기미처리와 같이 **비율(%p)** 증감 — 세대 수가 달라도 비교된다 */
    const pt=(pc&&pc.total)||0,pu=(pc&&pc.긴급)||0,cu=c.긴급||0;
    const pr=pt>0?pu/pt*100:0,cr=c.total>0?cu/c.total*100:0,d=Number((cr-pr).toFixed(1));
    const dCls=d>0?'up':d<0?'dn':'eq',dArrow=d>0?'▲':d<0?'▼':'―',dSign=d>0?'+':d<0?'−':'';
    el.innerHTML=`<div class="ltrmom-rows">${row('전월',pc,false)}${row('금월',c,true)}</div><div class="ltrmom-delta"><span class="lm-delta ${dCls}" data-tip="긴급 비율 전월 ${pr.toFixed(1)}% → 금월 ${cr.toFixed(1)}%">${dArrow} ${dSign}${Math.abs(d).toFixed(1)}%</span></div>`;
  },0);
  const list=cur?all.filter(h=>h.level===cur):all;
  S._rkSiteList=list;
  return `<div class="as">${viz}${tabs}<div class="card rk-card">${dfRiskTableHTML(list,'site')}</div></div>`;
}
function dfVacPane(sid,stat,vacSv,kind){
  const sangga=kind==='sangga';
  const vl=sangga?'공가상가':'공가세대';
  const field=sangga?'commercialProcessingPlan':'vacantProcessingPlan';
  const _u=sangga?'호실':'세대';
  const sv=(vacSv&&(sangga?vacSv.commercialStatus:vacSv.vacantStatus))||{};
  const mb=parseInt(sv['미분양'],10)||0,mk=parseInt(sv['미키불출'],10)||0;
  const hasV=(sv['미분양']!=null&&sv['미분양']!=='')||(sv['미키불출']!=null&&sv['미키불출']!=='');
  const edit=`data-act="df.vacEdit" data-sid="${esc(sid)}" data-kind="${sangga?'sangga':'sedae'}" role="button" tabindex="0" data-tip="${vl} 수 입력"`;
  /* ⚠ 게시본에 공가 필드가 결손이면(undefined) .toLocaleString 에서 던져 **공가 페이지가 통째로
     조용히 빠졌다**(525차 실측) — 숫자로 강제해 페이지는 항상 남긴다 */
  const s0=stat||{};
  const st={T:Number(s0.T)||0,Res:Number(s0.Res)||0,Unr:Number(s0.Unr)||0,Rate:Number(s0.Rate)||0,
    Lt:Number(s0.Lt)||0,Units:Number(s0.Units)||0,Top:s0.Top||[],TopPrev:s0.TopPrev||{}};
  const perRecv=st.Units>0?(st.T/st.Units).toFixed(1):'-',perUnr=st.Units>0?(st.Unr/st.Units).toFixed(1):'-';
  return`<div class="as">
    <div class="card vac-stat"><div class="sh"><div class="st cardttl">${vl} 현황</div></div><div class="vrow">
      <div class="vseg vseg-edit" ${edit}><div class="vseg-l">${vl}</div><div class="vseg-v">${hasV?(mb+mk).toLocaleString():'<span class="vph">입력</span>'}<span class="vseg-u">${_u}</span></div><div class="vseg-m">미분양 ${mb.toLocaleString()} · 미키불출 ${mk.toLocaleString()}</div></div>
      <div class="vseg"><div class="vseg-l">전체 접수</div><div class="vseg-v">${st.T.toLocaleString()}<span class="vseg-u">건</span></div><div class="vseg-m">${_u}당 ${perRecv}건</div></div>
      <div class="vseg"><div class="vseg-l">처리 완료</div><div class="vseg-v">${st.Res.toLocaleString()}<span class="vseg-u">건</span></div><div class="vseg-m">처리율 ${(Number(st.Rate)||0).toFixed(1)}%</div></div>
      <div class="vseg"><div class="vseg-l">미처리</div><div class="vseg-v" style="color:var(--am)">${st.Unr.toLocaleString()}<span class="vseg-u">건</span></div><div class="vseg-m">${_u}당 ${perUnr}건</div></div>
      <div class="vseg"><div class="vseg-l">장기미처리</div><div class="vseg-v" style="color:var(--rd)">${st.Lt.toLocaleString()}<span class="vseg-u">건</span></div><div class="vseg-m">미처리의 ${st.Unr>0?(st.Lt/st.Unr*100).toFixed(1):'0.0'}%</div></div>
    </div></div>
    <div class="card"><div class="sh"><div class="st cardttl">${vl} 미처리 상위 5개 공종 처리 현황</div></div><table class="dt" style="table-layout:fixed">${DF_TOP5_THEAD}<tbody>${dfTop5Rows(sid,st.Top,st.TopPrev,st.Unr,field,sangga?'store':'unit')}</tbody></table></div>
  </div>`;
}
function rDefectSite(root,site){
  const key=dfRm()+'/'+site.id;
  const k=DF.kpi[key];
  if(k===undefined||DF.plans[site.id]===undefined){
    root.innerHTML=dfNoneHTML(site.name+' 자료를 불러오는 중입니다…');
    Promise.all([dfSiteData(site.id),dfLoadPlans(site.id)])
      .then(()=>{if(S.view==='defect'&&S.dfSid===site.id)rDefect();});
    return;
  }
  dfSubSite(site.id);   /* 처리계획·분석 의견 실시간 반영 */
  if(!k){root.innerHTML=dfNoneHTML('이 현장의 게시 자료가 없습니다.');return;}
  const st=k;
  const units=site.units||0;
  const compDate=site.completionDate?` · ${site.completionDate}`:'';
  const kpis=dfKcHTML([
    /* ⚠ 686차: 이 PC 원본으로 계산한 화면이면 표시한다 — 팀 화면(게시본)과 다를 수 있음을 숨기지 않는다 */
    {cls:'bl kc-site',label:esc(site.region||'-'),   /* 688차: 「이 PC 원본」 표시는 상단바(#tbLoc)로 옮겼다 */valHTML:`<span class="kc-site-nm">${esc(site.name||'-')}</span>`,meta:`${units.toLocaleString()}세대 · ${site.buildings||0}개동${compDate}`},
    {cls:'sk',label:'전체 접수',val:st.tR||0,unit:'건',meta:`세대당 ${units>0?((st.tR||0)/units).toFixed(1):'0.0'}건`},
    {cls:'ms',label:'처리 완료',val:st.res||0,unit:'건',meta:`처리율 ${(Number(st.rate)||0).toFixed(1)}%`},
    {cls:'wh'+((st.unr||0)>0?' kc-warn':''),label:'미처리',val:st.unr||0,unit:'건',meta:`세대당 ${units>0?((st.unr||0)/units).toFixed(1):'0.0'}건`,act:'ul',sid:site.id,tt:'미처리 하자리스트 보기'},
    {cls:'wh'+((st.lt||0)>0?' kc-bad':''),label:'장기미처리(30일+)',val:st.lt||0,unit:'건',meta:`미처리의 ${(Number(st.ltr)||0).toFixed(1)}%`,act:'lul',sid:site.id,tt:'장기미처리 하자리스트 보기'}]);
  /* 탭 — 원본과 같은 구성(공가세대/공가상가는 현장 설정에 따라) */
  const showSedae=site.showVacant!==false,showSangga=!!site.hasCommercial;
  let tab=S.dfTab||'sum';
  if(tab==='vac'&&!showSedae)tab='sum';
  if(tab==='store'&&!showSangga)tab='sum';
  S.dfTab=tab;
  const tnav=`<div class="tnav" data-sbx>
    <button class="tnav-i${tab==='sum'?' act':''}" data-act="df.tab" data-t="sum"><svg class="icn icn-sm" aria-hidden="true"><use href="#i-chart"></use></svg>종합</button>
    <button class="tnav-i${tab==='lt'?' act':''}" data-act="df.tab" data-t="lt"><svg class="icn icn-sm" aria-hidden="true"><use href="#i-warn"></use></svg>장기미처리</button>
    ${showSedae?`<button class="tnav-i${tab==='vac'?' act':''}" data-act="df.tab" data-t="vac"><svg class="icn icn-sm" aria-hidden="true"><use href="#i-home"></use></svg>공가세대</button>`:''}
    ${showSangga?`<button class="tnav-i${tab==='store'?' act':''}" data-act="df.tab" data-t="store"><svg class="icn icn-sm" aria-hidden="true"><use href="#i-build"></use></svg>공가상가</button>`:''}
    <button class="tnav-i${tab==='risk'?' act':''}" data-act="df.tab" data-t="risk"><svg class="icn icn-sm" aria-hidden="true"><use href="#i-voice"></use></svg>민원 현황</button>
    <button class="tnav-i${tab==='det'?' act':''}" data-act="df.tab" data-t="det"><svg class="icn icn-sm" aria-hidden="true"><use href="#i-trend"></use></svg>상세 현황</button>
  </div>`;
  let body='';
  if(tab==='sum'){
    const siteYears=dfYearsOf(st.weekly);
    const rmY=S.dfRm.slice(0,4);
    const siteYear=(siteYears.includes(S.dfTrendYearSite)?S.dfTrendYearSite:rmY);
    body=`<div class="as">
      ${dfTrendCardHTML('dfSiteTrend','site',siteYears,siteYear)}
      <div class="opsr" style="margin-bottom:0"><div class="card"><div class="ct cardttl">전월대비 실적 현황</div><div id="dfSiteMom" class="mom-wrap"></div></div>${dfDonutCardHTML('공종별 미처리 분포','dfSiteMx','dfSiteMxLg')}</div>
    </div>`;
  }else if(tab==='lt'){
    const ltrMomBar=dfLtrMomHTML(st);
    const P=dfAxParts(site.id,st);
    const sortTh=(txt,type,cls,w)=>`<th class="${cls}" style="width:${w}${cls==='cc'?';white-space:nowrap':''}" data-sort data-sort-type="${type}" tabindex="0" data-act="df.sort.tbl" data-tbl="dfTrade-${esc(site.id)}">${txt} <span class="sortmk">↕</span></th>`;
    body=`<div class="as">
      ${ltrMomBar}
      <div class="card"><div class="sh"><div class="st cardttl">장기미처리 상위 5개 공종 처리 현황</div></div><table class="dt" style="table-layout:fixed">${DF_TOP5_THEAD}<tbody>${dfTop5Rows(site.id,st.topLt,st.topLtPrev,st.lt||0,'processingPlan','')}</tbody></table></div>
      <div class="card"><div class="sh"><div class="st cardttl">${P.ax==='co'?'업체별':'공종별'} 하자처리 현황</div><div class="axseg" role="group" aria-label="묶는 기준"><button class="${P.ax==='trade'?'on':''}" data-act="df.ax.site" data-ax="trade">공종별</button><button class="${P.ax==='co'?'on':''}" data-act="df.ax.site" data-ax="co">업체별</button></div></div><table class="dt" style="table-layout:fixed" id="dfTrade-${esc(site.id)}"><thead><tr>${sortTh('NO','num','cc','6%')}${sortTh(P.ax==='co'?'시공업체':'공종','str','','11%')}${sortTh(P.ax==='co'?'주요 공종':'시공업체','str','','11%')}${sortTh('전체 접수','num','n','7%')}${sortTh('처리','num','n','7%')}${sortTh('처리율','num','cc','7%')}${sortTh('미처리','num','cc','7%')}${sortTh('전월대비','num','cc','6%')}${sortTh('장기미처리','num','n','7%')}<th class="cc" style="width:25%">장기미처리 비율</th>${sortTh('전월대비','num','cc','6%')}</tr></thead><tbody>${P.rows||P.emptyRow}</tbody></table></div>
    </div>`;
  }else if(tab==='vac'){
    body=dfVacPane(site.id,st.vacU||{T:st.vT,Res:st.vRes,Unr:st.vUnr,Rate:st.vRate,Lt:st.vLt,Units:st.vUnits,Top:st.vTop,TopPrev:st.vTopPrev},DF.vac[key],'sedae');
  }else if(tab==='store'){
    body=dfVacPane(site.id,st.vacS,DF.vac[key],'sangga');
  }else if(tab==='risk'){
    body=dfRiskPane(st.hh);
  }else{
    /* 상세 현황 — 원본과 같은 월별·주차별 12/13열 표(연도 선택) */
    const wkAll=(st.weekly||[]).slice().sort((a,b)=>a.week<b.week?-1:1);
    const years=[...new Set(wkAll.map(w=>String(w.week||'').slice(0,4)))].filter(Boolean).sort();
    const curYear=(years.includes(S.dfDetailYear)?S.dfDetailYear:(years.includes(S.dfRm.slice(0,4))?S.dfRm.slice(0,4):years[years.length-1]))||S.dfRm.slice(0,4);
    const yrOpts=years.length?years.map(y=>`<option value="${y}"${y===curYear?' selected':''}>${y}년</option>`).join(''):`<option selected>${curYear}년</option>`;
    const yrPicker=`<select class="yr-sel" data-act="df.detailYear" aria-label="상세 연도 선택">${yrOpts}</select>`;
    const eq='6.5%',ltrW='16%';
    const wkColgroup=`<colgroup><col style="width:4.5%"><col style="width:4.5%">${('<col style="width:'+eq+'">').repeat(9)}<col style="width:${ltrW}"><col style="width:${eq}"></colgroup>`;
    const{rmEnd}=dfEnds(S.dfRm);
    const wkBody=wkAll.map((w,i)=>({w,m:dfMetrics(w,i>0?wkAll[i-1]:null,i>1?wkAll[i-2]:null),first:i===0,yr:String(w.week).slice(0,4)}))
      .filter(x=>x.yr===curYear&&String(x.w.week).slice(0,7)<=S.dfRm&&(x.w.sun!==false||x.w.week===rmEnd))
      .map((x,j,arr)=>{
        const{w,m,first}=x;
        const firstOfMonth=j===0||arr[j-1].w.m!==w.m;
        const lastOfMonth=j===arr.length-1||arr[j+1].w.m!==w.m;
        const monthCell=firstOfMonth?`<td class="cc mcell">${w.m}월</td>`:'<td class="cc"></td>';
        return`<tr class="${lastOfMonth?'mend':''}${w.week===rmEnd?' cur-row':''}">${monthCell}<td class="cc">${w.wn}주</td><td class="cc recv-total tl-grp">${dfNF(m.tR)}</td><td class="cc recv-weekly">${dfNF(m.recvW)}</td><td class="cc proc-blue tl-grp">${dfNF(m.cumRes)}</td><td class="rate-col proc-blue">${m.rate.toFixed(1)}%</td><td class="cc proc-blue">${dfNF(m.resW)}</td><td class="cc">${dfDlt(m.resWDlt,first,m.resW,'주')}</td><td class="cc unr-red tl-grp">${dfNF(m.unr)}</td><td class="cc">${dfDlt(m.unrDlt,first,m.unr,'주')}</td>${dfLtrCells(m.d0,m.d30,m.d60,m.unr,m.ltDlt,first,'주')}</tr>`;}).join('');
    const wkThead=`<thead><tr>${dfTh('','월')}${dfTh('','주차')}${dfThG('','전체 접수')}${dfTh('recv-sub','주간 접수')}${dfThG('','전체 처리')}${dfTh('rate-col','처리율')}${dfTh('','주간 처리')}${dfTh('','전월대비')}${dfThG('','전체 미처리')}${dfTh('','전월대비')}${dfTh('tl-grp-ltr','장기미처리')}<th class="cc tl-grp-ltr">장기미처리 비율</th><th class="cc">전월대비</th></tr></thead>`;
    body=`<div class="as">
      ${dfMonthCardHTML(st,curYear,yrPicker)}
      <div class="card"><div class="sh"><div class="st cardttl">주차별 현황</div></div><div style="overflow-x:auto" data-sbx="r"><table class="dt dt-detail" style="table-layout:fixed">${wkColgroup}${wkThead}<tbody>${wkBody||'<tr><td colspan="13" style="text-align:center;padding:14px;color:var(--lbl3)">데이터 없음</td></tr>'}</tbody></table></div></div>
    </div>`;
  }
  root.innerHTML=kpis+tnav+body;
  setTimeout(dfPlanFitAll,30);   /* 저장된 처리계획 길이에 맞춰 칸 높이를 잡는다 */
  if(tab==='sum')setTimeout(()=>{
    const rmY2=S.dfRm.slice(0,4);
    const y2=(dfYearsOf(st.weekly).includes(S.dfTrendYearSite)?S.dfTrendYearSite:rmY2);
    dfTrendDraw('strend','dfSiteTrend',y2===rmY2?DF.sw[key]:dfWksOfYear(st.weekly,y2));
    dfMomRender('dfSiteMom',{tR:st.tR||0,res:st.res||0,unr:st.unr||0,lt:st.lt||0,
      prev:{total:(st.prev&&st.prev.total)||0,res:(st.prev&&st.prev.res)||0,unr:(st.prev&&st.prev.unr)||0,lt:(st.prev&&st.prev.lt)||0}});
    dfDonutDraw('smx','dfSiteMx','dfSiteMxLg',dfDonutData(DF.sam[key]));
  },30);
}
/* 하자 관리 스냅샷 — 지금 보는 게시월의 자료 전체(대시보드+전 현장+목록+처리계획+분석)를
   단일 HTML 로 굳힌다. 파일을 열면 로그인 없이 하자 화면만 열리고, 저장은 되지 않는다. */
async function dfSnapshot(){
  if(!S.live||!FB.db){toast('로그인 후 사용할 수 있습니다');return;}
  /* 614차 다월: 게시된 달 목록에서 담을 달을 고른다(원본 pickSnapMonths). 두 달 이상이면
     파일 안의 기준월 선택기('df.rm')가 스텁 reportIndex 를 읽어 그대로 동작한다. */
  let idxAll={};
  try{idxAll=(await FB.db.ref('reportIndex').once('value')).val()||{};}catch(e){}
  const monthsAll=Object.keys(idxAll).filter(k=>/^\d{4}-\d{2}$/.test(k)).sort().reverse();
  if(!monthsAll.length){toast('게시본이 없습니다');return;}
  const defRm=dfRm()||monthsAll[0];
  let months=[defRm];
  if(monthsAll.length>1){
    const picked=await new Promise(resolve=>{
      window.__SNAPPICK__=resolve;
      openModal('스냅샷 내보내기',
        '<div class="md-scroll" style="max-height:56vh"><p style="font-size:12.5px;color:var(--lbl2);margin-bottom:10px">두 달 이상 담으면 파일 안에서 기준월을 바꿔가며 볼 수 있습니다(월당 수백 KB~수 MB).</p>'
        +monthsAll.map(m=>'<label class="share-row" style="cursor:pointer"><span class="share-info"><b>'+esc(m)+(m===defRm?' <span style="font-size:11px;font-weight:600;color:var(--bt1);vertical-align:1px">현재</span>':'')+'</b></span><input type="checkbox" class="snap-mo" value="'+esc(m)+'"'+(m===defRm?' checked':'')+' style="width:17px;height:17px;accent-color:var(--bt1)"></label>').join('')
        +'</div>',
        '<button class="btn bo bsm" data-act="dfp.snapAll">전체 선택</button><div style="flex:1"></div><button class="btn bg2 bsm" data-act="dfp.snapCancel">취소</button><button class="btn bp bsm" data-act="dfp.snapOk">내보내기</button>');
    });
    if(!picked||!picked.length)return;   /* 취소 */
    months=picked.sort().reverse();
  }
  const rm=months[0];   /* 파일이 처음 열리는 달 = 담은 것 중 최신 */
  toast('스냅샷 준비 중 — 현장 자료 수집…');
  const sites=dfSites();
  /* ⚠ org 에 전체 현장을 담으면 뷰어에서 감춘 현장이 자료 없이 뜬다 — 자료를 담은 현장만 넣는다
     (스냅샷은 cfg 를 싣지 않으므로 dfHide 를 뷰어에서 다시 읽을 수 없다) */
  const snap={rm,org:{...S.org,sites},months:{},plans:{}};
  for(const st of sites){await dfLoadPlans(st.id);snap.plans[st.id]=DF.plans[st.id]||{};}
  /* 달마다 _dash 와 현장 노드를 리프에서 직접 받는다 — DF 캐시는 보고 있는 달만 갖고 있어서 */
  for(let mi=0;mi<months.length;mi++){
    const m=months[mi];
    toast('스냅샷 준비 중 — '+m+' ('+(mi+1)+'/'+months.length+')');
    let dash={};try{dash=dfDec((await FB.db.ref('report/'+m+'/_dash').once('value')).val())||{};}catch(e){}
    const mo={dash:{wks:dash.wks||[],am:dash.am||{},ins:dash.insightsHTML||''},site:{}};
    for(const st of sites){
      let v={};try{v=dfDec((await FB.db.ref('report/'+m+'/'+st.id).once('value')).val())||{};}catch(e){}
      /* ulz 는 압축 문자열이라 dfDec 무해 — kpi/sam/vac 의 인코딩 키가 풀린다(소비자 dfSiteData 와 동일) */
      mo.site[st.id]={kpi:v.kpi||null,sw:v.siteWks||[],sam:v.siteAm||{},vac:v.vac||{},ulz:v.ulz||''};
    }
    snap.months[m]=mo;
  }
  toast('스냅샷 문서 조립 중…');
  let idx,app;
  try{
    [idx,app]=await Promise.all([fetch('./index.html').then(r=>r.text()),fetch('./app.js?v='+Date.now()).then(r=>r.text())]);
  }catch(e){toast('스냅샷 생성 실패 · 앱 파일을 불러올 수 없습니다');return;}
  /* vendor 인라인 — firebase 4종은 뺀다(스냅샷은 통신하지 않는다) */
  /* ⚠ 607차: 이 반복은 index.html 의 `<script src>` **태그를 훑는다**. 605차에 xlsx 를 지연 로드로
     바꾸면서 그 태그를 지웠고, 그러자 스냅샷에 XLSX 가 안 실려 **목록의 '엑셀' 버튼이 죽었다**
     (스냅샷은 파일 하나로 도는 문서라 `./vendor/…` 를 받아올 곳이 없다).
     태그가 없어진 vendor 는 여기서 이름으로 직접 챙긴다 — 앞으로 다른 vendor 를 지연 로드로 바꿀 때도 같다. */
  let extra='';
  try{
    const code=await fetch('./vendor/xlsx.full.min.js').then(r=>r.text());
    extra='<script>\n'+code.split('</scr'+'ipt>').join('<\\/scr'+'ipt>')+'\n</scr'+'ipt>';
  }catch(e){console.warn('[스냅샷] xlsx 인라인 실패 — 엑셀 내보내기는 빠진다',e);}
  const tags=[...idx.matchAll(/<script src="\.\/(vendor\/[^"]+|app\.js[^"]*)"[^>]*><\/script>/g)];
  for(const m of tags){
    const src=m[1];
    if(/firebase/.test(src)){idx=idx.replace(m[0],'');continue;}
    if(/^app\.js/.test(src)){const rep=extra+'<script>\n'+app.split('</scr'+'ipt>').join('<\\/scr'+'ipt>')+'\n</scr'+'ipt>';idx=idx.replace(m[0],()=>rep);continue;}
    try{
      const code=await fetch('./'+src).then(r=>r.text());
      const rep='<script>\n'+code.split('</scr'+'ipt>').join('<\\/scr'+'ipt>')+'\n</scr'+'ipt>';
      idx=idx.replace(m[0],()=>rep);
    }catch(e){idx=idx.replace(m[0],'');}
  }
  /* 단일 파일은 인라인 스크립트로만 돈다 — CSP 메타를 떼지 않으면 스스로를 차단한다 */
  idx=idx.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\s*/g,'');
  const z=LZString.compressToBase64(JSON.stringify(snap));
  idx=idx.replace('<script>',()=>'<script>window.__SNAP_Z__='+JSON.stringify(z)+';\n');
  const blob=new Blob([idx],{type:'text/html;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='하자처리 현황_스냅샷_'+(months.length>1?(months[months.length-1]+'~'+months[0]):rm)+'.html';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  toast('스냅샷을 내려받았습니다 · '+(months.length>1?months.length+'개월':rm));
}
/* 스냅샷 문서로 열렸을 때 — FB 대신 박아 둔 자료를 읽는다. 쓰기는 전부 무시 */
function dfSnapBoot(){
  let snap=null;
  try{snap=JSON.parse(LZString.decompressFromBase64(window.__SNAP_Z__));}catch(e){}
  if(!snap)return false;
  /* 다월 스냅샷: snap.months={달:{dash,site}} 이면 달마다 트리를 채운다 — 기준월 선택기가
     스텁 reportIndex 를 읽어 파일 안에서 달 전환이 그대로 된다. 구형(단월 snap.dash/site)도 연다. */
  const mos=snap.months||{[snap.rm]:{dash:snap.dash,site:snap.site}};
  const tree={report:{},plans:snap.plans,siteConfig:{},reportIndex:{}};
  Object.keys(mos).sort().forEach((m,i)=>{
    const mo=mos[m]||{},d=mo.dash||{};
    tree.report[m]={_dash:{wks:d.wks||[],am:d.am||{},insightsHTML:d.ins||''}};
    tree.reportIndex[m]=i+1;   /* 값은 게시 순서 흉내 — 최신 달이 최댓값이면 충분하다 */
    Object.keys(mo.site||{}).forEach(sid=>{
      const v=mo.site[sid];
      tree.report[m][sid]={kpi:v.kpi,siteWks:v.sw,siteAm:v.sam,vac:v.vac,ulz:v.ulz};
    });
  });
  const walk=(o,ps)=>{let c=o;for(const k of ps){if(c==null)return null;c=c[k];}return c==null?null:c;};
  S.live=true;
  /* 스냅샷 문서는 읽기 전용이므로 Firebase ref 의 once/get/on 인터페이스만 제공한다. */
  FB.db={ref:p=>({
    once:async()=>({val:()=>{const v=walk(tree,String(p||'').split('/').filter(Boolean));return v===undefined?null:v;}}),
    get:async()=>({val:()=>{const v=walk(tree,String(p||'').split('/').filter(Boolean));return v===undefined?null:v;}}),
    on:(ev,cb)=>{const v=walk(tree,String(p||'').split('/').filter(Boolean));setTimeout(()=>cb&&cb({val:()=>v===undefined?null:v}),30);return cb;},
    off:()=>{},set:async()=>{toast('스냅샷 문서 · 저장되지 않습니다');},update:async()=>{toast('스냅샷 문서 · 저장되지 않습니다');}
  })};
  S.snap=true;   /* 읽기 전용 문서 — 정리 작업(휴지통·보관함)은 돌지 않는다 */
  ORG_RM=snap.rm;ORG_LIVE=true;
  S.org=snap.org||{teams:[],regions:[],sites:[]};
  document.body.classList.add('snap');
  hideCover();rDefectNav();go('defect');
  return true;
}
/* ══════════ 인쇄용 보고서 양식(rpt) — 원본 이식 ══════════
   화면 카드를 옮기는 화면식 인쇄(dfPrint)와 달리, 게시본 집계로 A4 문서를 새로 조립한다.
   원본은 calc() 원본 행에서 만들지만, 여기서는 게시본 kpi(=calc 전체)·weekly 가 같은 값을 준다. */
const RP_COL=['#08213f','#14395f','#22537f','#3a6f9f','#6b96bd','#b9c9d8'];
const rpN=v=>Number(v||0).toLocaleString();
const rpDelta=d=>d===0?'— 0':`<span class="${d>0?'up':'dn2'}">${d>0?'▲ ':'▼ '}${rpN(Math.abs(d))}</span>`;
const rpPct=(a,b)=>b?(a/b*100).toFixed(1)+'%':'0.0%';

/* 보고서 월별 처리 현황 — 화면 표와 같은 월말 스냅샷·지표(dfMetrics). 연도 필터는 지표 계산 뒤에 */
function rpMoRows({keys,map}){
  const yr=S.dfRm.slice(0,4);
  const all=keys.map((k,i)=>({k,first:i===0,
    m:dfMetrics(map[k],i>0?map[keys[i-1]]:null,i>1?map[keys[i-2]]:null)}));
  const sel=all.filter(x=>x.k.slice(0,4)===yr&&x.k<=S.dfRm);
  return sel.map((x,i)=>{
    const m=x.m,last=i===sel.length-1,B=v=>last?`<b>${v}</b>`:v;
    const d=(v,isFirst)=>isFirst?'<span class="dim">—</span>':rpDelta(v);
    return `<tr><td>${B(Number(x.k.slice(5))+'월')}</td><td>${B(rpN(m.tR))}</td><td>${B(rpN(m.recvW))}</td>`+
      `<td>${B(rpN(m.cumRes))}</td><td>${B(rpPct(m.cumRes,m.tR))}</td><td>${B(rpN(m.resW))}</td><td>${B(rpN(m.unr))}</td>`+
      `<td${last?' class="dn"':''}>${d(m.unrDlt,x.first)}</td><td>${B(rpN(m.d30+m.d60))}</td>`+
      `<td${last?' class="dn"':''}>${d(m.ltDlt,x.first)}</td></tr>`;}).join('');
}
/* 주차별 스택 막대 + 누계 선 2종 — SVG (원본 그대로, 당해년도만) */
function rpTrend(wks){
  const W=523,H=112,L=48,R=486,T=14,B=96;
  const _y=S.dfRm.slice(0,4),{rmEnd}=dfEnds(S.dfRm);
  wks=(wks||[]).filter(w=>String(w.week||'').slice(0,4)===_y&&w.week<=rmEnd&&(w.sun!==false||w.week===rmEnd));
  if(!wks.length)return '';
  const n=wks.length,step=(R-L)/n,bw=Math.min(16,step*0.7);
  const umax=Math.max(...wks.map(w=>w.u||0))*1.15||1;
  const tv=wks.map(w=>w.r||0),rv=wks.map(w=>w.res||0);
  let tmin=Math.max(0,Math.min(...rv)*0.98),tmax=Math.max(...tv)*1.02||1;
  if(tmax<=tmin)tmax=tmin+1;
  const uy=v=>B-(v/umax)*(B-T),ty=v=>B-((v-tmin)/(tmax-tmin))*(B-T);
  const _big=tmax>=10000;
  const kUnit=v=>_big?Math.round(v/1000)+'천':rpN(Math.round(v));
  let s=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  for(let g=0;g<=4;g++){const v=umax*g/4,y=uy(v);
    s+=`<line x1="${L}" y1="${y.toFixed(1)}" x2="${R}" y2="${y.toFixed(1)}" stroke="#e4e7eb"/>`+
       `<text x="${L-4}" y="${(y+2.4).toFixed(1)}" font-size="6.5" fill="#6b7280" text-anchor="end">${rpN(Math.round(v))}</text>`;}
  for(let g=0;g<=2;g++){const v=tmin+(tmax-tmin)*g/2;
    s+=`<text x="${R+4}" y="${(ty(v)+2.4).toFixed(1)}" font-size="6.5" fill="#6b7280">${kUnit(v)}</text>`;}
  wks.forEach((w,i)=>{
    const cx=L+step*i+step/2,x=cx-bw/2;let base=B;
    [[w.d60||0,RP_COL[0]],[w.d30||0,RP_COL[3]],[w.d0||0,RP_COL[5]]].forEach(([v,c])=>{
      const hh=(v/umax)*(B-T);
      s+=`<rect x="${x.toFixed(1)}" y="${(base-hh).toFixed(1)}" width="${bw.toFixed(1)}" height="${hh.toFixed(1)}" fill="${c}"/>`;
      base-=hh;});
  });
  const pts=a=>a.map((v,i)=>`${(L+step*i+step/2).toFixed(1)},${ty(v).toFixed(1)}`).join(' ');
  s+=`<polyline fill="none" stroke="#22537f" stroke-width="1.4" points="${pts(tv)}"/>`;
  s+=`<polyline fill="none" stroke="#6b96bd" stroke-width="1.4" stroke-dasharray="3 2" points="${pts(rv)}"/>`;
  s+=`<line x1="${L}" y1="${B}" x2="${R}" y2="${B}" stroke="#c8cdd4"/>`;
  let lastM='';
  wks.forEach((w,i)=>{const mm=String(w.week||'').slice(5,7);
    if(mm&&mm!==lastM){lastM=mm;
      s+=`<text x="${(L+step*i+step/2).toFixed(1)}" y="${B+12}" font-size="7" fill="#4a5568" text-anchor="middle">${Number(mm)}월</text>`;}});
  const _ac=(T+B)/2;
  s+=`<text x="9" y="${_ac}" font-size="6" fill="#9aa3ad" text-anchor="middle" transform="rotate(-90 9 ${_ac})">미처리(건)</text>`;
  s+=`<text x="516" y="${_ac}" font-size="6" fill="#9aa3ad" text-anchor="middle" transform="rotate(90 516 ${_ac})">접수·처리(건)</text>`;
  return s+'</svg>';
}
function rpDonut(items,total,cap){
  const C=2*Math.PI*42;let off=0,circ='',rows='';
  items.forEach((it,i)=>{
    const pc=total?it.v/total*100:0,ln=C*pc/100,c=RP_COL[Math.min(i,RP_COL.length-1)];
    circ+=`<circle cx="50" cy="50" r="42" stroke="${c}" stroke-dasharray="${ln.toFixed(1)} ${(C-ln).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}"/>`;
    rows+=`<div class="r"><i style="background:${c}"></i><span class="nm">${esc(it.n)}</span><span class="vl">${rpN(it.v)}</span><span class="pc">${pc.toFixed(1)}%</span></div>`;
    off+=ln;});
  return `<div><div class="cap">${esc(cap)}</div><div class="dwrap">
    <svg width="70" height="70" viewBox="0 0 100 100" class="dnut">
      <g transform="rotate(-90 50 50)" fill="none" stroke-width="15">${circ}</g>
      <text x="50" y="47" text-anchor="middle" font-size="12" font-weight="700" fill="#08213f">${rpN(total)}</text>
      <text x="50" y="59" text-anchor="middle" font-size="7" fill="#6b7280">미처리</text></svg>
    <div class="dl">${rows}</div></div></div>`;
}
function rpSec(no,title,note,inner,style){
  return `<div class="sec"${style?` style="${style}"`:''}>
    <div class="sec-h"><span class="sec-n">${no}</span><span class="sec-t">${esc(title)}</span>${note?`<span class="sec-note">${esc(note)}</span>`:''}</div>
    ${inner}</div>`;
}
function rpKpi(cards){
  return '<div class="kpis">'+cards.map(c=>
    `<div class="kpi"><div class="k">${esc(c.k)}</div><div class="v">${rpN(c.v)}<span>건</span></div><div class="d">${c.d}</div></div>`).join('')+'</div>';
}
function rpPage(n,total,hdr,body,cls){
  return `<div class="page${cls?' '+cls:''}"><div class="sheet">${hdr}
    ${body}
    <div class="pgn">${n} / ${total}</div></div></div>`;
}
function rpHdr(title,subs,asof,slim){
  return `<div class="titlewrap"><div class="thead-row"><h1>${esc(title)}</h1>
      <div class="asof">기준일<b>${esc(asof)}</b></div></div>
    ${slim?'':`<div class="subject">${subs.map(s2=>`<div>${s2}</div>`).join('')}</div>`}</div>`;
}
const RP_LG=`<div class="lg">
    <span><i style="background:${RP_COL[0]}"></i>60일 이상</span>
    <span><i style="background:${RP_COL[3]}"></i>30~59일</span>
    <span><i style="background:${RP_COL[5]}"></i>30일 미만</span>
    <span style="margin-left:auto"><i class="ln" style="background:#22537f"></i>전체 접수(누계)</span>
    <span><i class="ln" style="background:#6b96bd"></i>처리 완료(누계)</span></div>`;

/* 736차: 보고서 「주요 이슈」 — 규칙 자동 선별(원본 rpt 의 3항목을 넓힘). 중요도순으로 최대 6건, 각 문장에 근거 수치 */
function rpIssHTML(iss,n){return iss.slice(0,n||6).map(i=>`<div class="iss"><div class="t">${esc(i.t)}</div><div class="m">${i.m}</div></div>`).join('')||'<div class="iss"><div class="m">특이 사항 없음.</div></div>';}
function rpIssDash(st,sum,units){
  const tR=sum.tR,res=sum.res,unr=sum.unr,lt=sum.lt,pR=sum.pR,pRes=sum.pRes,pUnr=sum.pUnr,pLt=sum.pLt;
  const avg=tR?res/tR*100:0,iss=[];
  const worst=[...st].sort((a,b)=>(b.c.unr||0)-(a.c.unr||0))[0];
  if(worst&&unr)iss.push({w:5,t:'특정 현장 집중',
    m:`<b>${esc(worst.s.name)}</b> 미처리 <b>${rpN(worst.c.unr)}건</b> — 팀 전체의 <b>${rpPct(worst.c.unr,unr)}</b>. 처리율 ${rpPct(worst.c.res,worst.c.tR)}로 팀 평균(${avg.toFixed(1)}%) 대비 ${(()=>{const d=avg-(worst.c.tR?worst.c.res/worst.c.tR*100:0);return Math.abs(d).toFixed(1)+'%p '+(d>=0?'낮음':'높음');})()}.`});
  /* 미처리 급증 현장 — 전월 대비 증가분이 팀 증가분의 30% 이상 */
  const dU=st.map(x=>({x,d:(x.c.unr||0)-((x.c.prev&&x.c.prev.unr)||0)})).sort((a,b)=>b.d-a.d)[0];
  const tdU=unr-pUnr;
  if(dU&&dU.d>0&&tdU>0&&dU.d>=tdU*0.3)iss.push({w:4,t:'미처리 급증 현장',
    m:`<b>${esc(dU.x.s.name)}</b> 미처리 전월 대비 <b>+${rpN(dU.d)}건</b> — 팀 순증(${rpN(tdU)}건)의 <b>${rpPct(dU.d,tdU)}</b>. 세대당 ${dU.x.s.units?((dU.x.c.unr||0)/dU.x.s.units).toFixed(1):'-'}건.`});
  if(lt-pLt!==0)iss.push({w:4,t:lt>pLt?'장기미처리 증가':'장기미처리 감소',
    m:`장기미처리 <b>${rpN(lt)}건</b>, 전월 대비 <b>${rpN(Math.abs(lt-pLt))}건 ${lt>pLt?'증가':'감소'}</b>. 미처리 중 비중 ${rpPct(pLt,pUnr)} → <b>${rpPct(lt,unr)}</b>.`});
  /* 장기미처리 비율 최고 현장(미처리 30건 이상) */
  const ltr=st.filter(x=>(x.c.unr||0)>=30).map(x=>({x,r:(x.c.lt||0)/(x.c.unr||1)*100})).sort((a,b)=>b.r-a.r)[0];
  const ltrAvg=unr?lt/unr*100:0;
  if(ltr&&ltr.r>=ltrAvg+10)iss.push({w:3,t:'장기화 현장',
    m:`<b>${esc(ltr.x.s.name)}</b> 미처리 ${rpN(ltr.x.c.unr)}건 중 30일 이상이 <b>${rpN(ltr.x.c.lt)}건(${ltr.r.toFixed(1)}%)</b> — 팀 평균 ${ltrAvg.toFixed(1)}% 대비 ${(ltr.r-ltrAvg).toFixed(1)}%p 높음.`});
  const mR=tR-pR,mRes=res-pRes;
  if(mR||mRes)iss.push({w:3,t:mRes<mR?'처리 속도 둔화':'처리 속도 개선',
    m:`월간 처리 <b>${rpN(mRes)}건</b>으로 월간 접수(${rpN(mR)}건)를 ${mRes<mR?'밑돌아 미처리 순증':'웃돌아 미처리 감소'}. 처리율 ${rpPct(pRes,pR)} → <b>${rpPct(res,tR)}</b>.`});
  /* 공종·업체 집중 */
  const trMap={};st.forEach(x=>((x.c.trAgg)||[]).forEach(t=>{trMap[t.t]=(trMap[t.t]||0)+(t.u||0);}));
  const trTop=Object.entries(trMap).sort((a,b)=>b[1]-a[1]).slice(0,3);
  if(trTop.length&&unr){const s3=trTop.reduce((a,x)=>a+x[1],0);
    iss.push({w:2,t:'공종 집중',m:`${trTop.map(([n,v])=>`<b>${esc(n)}</b> ${rpN(v)}건`).join(' · ')} — 상위 3개 공종이 미처리의 <b>${rpPct(s3,unr)}</b>.`});}
  /* 764차: 대시보드 보고서는 「중대하자 미처리」 카드를 넣지 않는다(사용자) */
  /* 세대당 미처리 최다 현장 */
  const perU=st.filter(x=>x.s.units).map(x=>({x,v:(x.c.unr||0)/x.s.units})).sort((a,b)=>b.v-a.v)[0];
  const teamPer=units?unr/units:0;
  if(perU&&perU.v>=teamPer*1.5&&perU.x!==worst)iss.push({w:2,t:'세대당 미처리 과다',m:`<b>${esc(perU.x.s.name)}</b> 세대당 <b>${perU.v.toFixed(2)}건</b> — 팀 평균 ${teamPer.toFixed(2)}건의 ${(perU.v/(teamPer||1)).toFixed(1)}배.`});
  return rpIssHTML(iss.sort((a,b)=>b.w-a.w),4);   /* 764차: 대시보드는 4장 */
}
function rpIssSite(c,p,site,tops){
  const iss=[];
  if(tops[0])iss.push({w:4,t:'미처리 집중 공종',
    m:`<b>${esc(tops[0].t)}</b> ${rpN(tops[0].u)}건(미처리의 <b>${rpPct(tops[0].u,c.unr)}</b>) · 시공업체 ${esc(tops[0].coTop||'-')}${tops[1]?` · 다음 ${esc(tops[1].t)} ${rpN(tops[1].u)}건`:''}.`});
  if((c.lt||0)-(p.lt||0)!==0)iss.push({w:4,t:c.lt>(p.lt||0)?'장기미처리 증가':'장기미처리 감소',
    m:`장기미처리 <b>${rpN(c.lt)}건</b>, 전월 대비 <b>${rpN(Math.abs((c.lt||0)-(p.lt||0)))}건 ${c.lt>(p.lt||0)?'증가':'감소'}</b>. 미처리 중 비중 ${rpPct(p.lt,p.unr)} → <b>${rpPct(c.lt,c.unr)}</b>.`});
  if(c.critUnr)iss.push({w:5,t:'중대하자',
    m:`사내 매뉴얼 기준 <b>${rpN(c.critUnr)}건</b>이 미처리 상태. 최우선 현장 재방문 및 정밀 진단 요망.`});
  const mR=(c.tR||0)-(p.total||0),mRes=(c.res||0)-(p.res||0);
  if(mR||mRes)iss.push({w:3,t:mRes<mR?'처리 속도 둔화':'처리 속도 개선',
    m:`월간 접수 <b>${rpN(mR)}건</b> vs 월간 처리 <b>${rpN(mRes)}건</b> — 미처리 ${mRes<mR?'순증 '+rpN(mR-mRes):'순감 '+rpN(mRes-mR)}건. 처리율 ${rpPct(p.res,p.total)} → <b>${rpPct(c.res,c.tR)}</b>.`});
  const ltr=c.unr?(c.lt||0)/c.unr*100:0;
  if(ltr>=50&&(c.lt||0)>=20)iss.push({w:3,t:'장기화 비중 과반',m:`미처리 ${rpN(c.unr)}건 중 30일 이상이 <b>${rpN(c.lt)}건(${ltr.toFixed(1)}%)</b>. 접수 후 30일 안에 닫히는 비율이 낮음 — 공종별 처리계획 점검.`});
  /* 시공업체 집중 */
  const co=(c.coAgg||[]).slice().sort((a,b)=>(b.u||0)-(a.u||0));
  if(co[0]&&c.unr&&(co[0].u||0)/c.unr>=0.25)iss.push({w:2,t:'업체 집중',m:`<b>${esc(co[0].c||'-')}</b> 미처리 <b>${rpN(co[0].u)}건(${rpPct(co[0].u,c.unr)})</b>${co[0].lt?` · 장기 ${rpN(co[0].lt)}건`:''}.`});
  /* 공가세대 */
  if((c.vUnr||0)>0&&c.unr&&(c.vUnr/c.unr)>=0.15)iss.push({w:2,t:'공가세대 미처리',m:`공가세대 미처리 <b>${rpN(c.vUnr)}건</b> — 전체 미처리의 <b>${rpPct(c.vUnr,c.unr)}</b>${c.vLt?` · 장기 ${rpN(c.vLt)}건`:''}. 입주 전 일괄 보수 일정 확인.`});
  if(site.units&&(c.unr||0)/site.units>=0.5)iss.push({w:2,t:'세대당 미처리',m:`세대당 미처리 <b>${((c.unr||0)/site.units).toFixed(2)}건</b>(${rpN(site.units)}세대 · 미처리 ${rpN(c.unr)}건).`});
  return rpIssHTML(iss.sort((a,b)=>b.w-a.w));
}
/* ── 대시보드 보고서 — 게시본 kpi 합산 ── */
function rptDashboard(){
  const rm=dfRm(),sites=dfDashSites();
  const st=sites.map(s2=>({s:s2,c:DF.kpi[rm+'/'+s2.id]||{}}));
  const sum=k=>st.reduce((a,x)=>a+(Number(x.c[k])||0),0);
  const tR=sum('tR'),res=sum('res'),unr=sum('unr'),lt=sum('lt');
  const pv=k=>st.reduce((a,x)=>a+((x.c.prev&&Number(x.c.prev[k]))||0),0);
  const pR=pv('total'),pRes=pv('res'),pUnr=pv('unr'),pLt=pv('lt');
  const units=sites.reduce((a,s2)=>a+(+s2.units||0),0);
  const rgs=[...new Set(sites.map(s2=>s2.region).filter(Boolean))];
  const{team}=tkSel();
  const asof=((st[0]&&st[0].c.rmEnd)||dfEnds(S.dfRm).rmEnd||S.dfRm).replace(/-/g,'. ')+'.';
  const hdrF=rpHdr(((team&&team.name)||'H서비스센터')+' 하자처리 현황 보고',
    [`권역 <b>${esc(rgs.join(' · '))}</b>`,`관리대상현장 <b>${sites.length}개</b>`,`관리세대 <b>${rpN(units)}세대</b>`],asof);
  const hdrS=rpHdr(((team&&team.name)||'H서비스센터')+' 하자처리 현황 보고',[],asof,true);

  const kpi=rpKpi([
    {k:'전체 접수',v:tR,d:`세대당 ${units?(tR/units).toFixed(1):'0.0'}건 · ${rpDelta(tR-pR)}`},
    {k:'처리 완료',v:res,d:`처리율 <b>${rpPct(res,tR)}</b> · ${rpDelta(res-pRes)}`},
    {k:'미처리',v:unr,d:`세대당 ${units?(unr/units).toFixed(1):'0.0'}건 · ${rpDelta(unr-pUnr)}`},
    {k:'장기미처리',v:lt,d:`미처리의 <b>${rpPct(lt,unr)}</b> · ${rpDelta(lt-pLt)}`}]);

  /* 팀 합산 주차별 — week 키 union, 현장별 마지막 스냅샷 carry-forward */
  const siteWk=st.map(x=>(x.c.weekly||[]).slice().sort((a,b)=>a.week<b.week?-1:1)).filter(a=>a.length);
  const wkKeys=[...new Set(siteWk.flatMap(a=>a.map(w=>w.week)))].sort();
  const wks=wkKeys.map(k=>{
    const o={week:k,r:0,res:0,u:0,d0:0,d30:0,d60:0};
    siteWk.forEach(arr=>{let last=null;for(const w of arr){if(w.week<=k)last=w;else break;}
      if(last){o.r+=last.r;o.res+=last.res;o.u+=last.u;o.d0+=last.d0;o.d30+=last.d30;o.d60+=last.d60;}});
    const src=siteWk.flat().find(w=>w.week===k);if(src)o.sun=src.sun;
    return o;});
  const trend=rpTrend(wks)+RP_LG;

  const issHTML=rpIssDash(st,{tR,res,unr,lt,pR,pRes,pUnr,pLt},units);

  const wkDash={};sites.forEach(s2=>{wkDash[s2.id]=(DF.kpi[rm+'/'+s2.id]||{}).weekly||[];});
  const moTbl=`<table><thead><tr>
    <th class="cc" style="width:10%">월</th><th style="width:10%">전체 접수</th><th style="width:10%">월간 접수</th>
    <th style="width:10%">전체 처리</th><th style="width:10%">처리율</th><th style="width:10%">월간 처리</th>
    <th style="width:10%">전체 미처리</th><th style="width:10%">전월대비</th><th style="width:10%">장기미처리</th>
    <th style="width:10%">전월대비</th></tr></thead><tbody>${rpMoRows(dfMoSnapsDash(wkDash))}</tbody></table>`;

  const bySite=st.map(x=>({n:dfShortSite(x.s.name),v:x.c.unr||0})).sort((a,b)=>b.v-a.v);
  const trMap={};
  st.forEach(x=>((x.c.trAgg)||[]).forEach(t=>{trMap[t.t]=(trMap[t.t]||0)+(t.u||0);}));
  const byTr=Object.entries(trMap).map(([n,v])=>({n,v})).sort((a,b)=>b.v-a.v);
  const cut=(arr,lbl)=>{const top=arr.slice(0,5),rest=arr.slice(5);
    if(rest.length)top.push({n:`그 외 ${rest.length}${lbl}`,v:rest.reduce((a,x)=>a+x.v,0)});return top;};
  const dist=`<div class="two">${rpDonut(cut(bySite,'개 현장'),unr,'현장별')}${rpDonut(cut(byTr,'개 공종'),unr,'공종별')}</div>`;

  const siteRows=st.map(x=>{const c=x.c,p=c.prev||{};
    return `<tr><td class="l dim">${esc(x.s.region||'')}</td><td class="l">${esc(x.s.name)}</td>`+
      `<td>${rpN(x.s.units)}</td><td>${rpN(c.tR)}</td><td>${rpN(c.res)}</td><td>${rpPct(c.res,c.tR)}</td>`+
      `<td class="dn">${rpN(c.unr)}</td><td>${rpDelta((c.unr||0)-(p.unr||0))}</td>`+
      `<td>${rpN(c.lt)}</td><td>${rpDelta((c.lt||0)-(p.lt||0))}</td></tr>`;}).join('');
  const siteTbl=`<table><thead><tr>
    <th class="l" style="width:8%">권역</th><th class="l" style="width:24.9%">현장명</th>
    <th style="width:8.39%">세대수</th><th style="width:8.39%">전체 접수</th><th style="width:8.39%">처리</th>
    <th style="width:8.39%">처리율</th><th style="width:8.39%">미처리</th><th style="width:8.39%">전월대비</th>
    <th style="width:8.39%">장기미처리</th><th style="width:8.39%">전월대비</th></tr></thead>
    <tbody>${siteRows}</tbody>
    <tfoot><tr><td class="l"></td><td class="l">합계</td><td>${rpN(units)}</td><td>${rpN(tR)}</td><td>${rpN(res)}</td>
      <td>${rpPct(res,tR)}</td><td>${rpN(unr)}</td><td>${rpDelta(unr-pUnr)}</td><td>${rpN(lt)}</td><td>${rpDelta(lt-pLt)}</td></tr></tfoot></table>`;

  const co=dfDashCoAgg(rm,sites);
  const top=co.slice(0,10),rest=co.slice(10);
  const rSum=k=>rest.reduce((a,x)=>a+(x[k]||0),0);
  let coRows=top.map((x,i)=>
    `<tr><td>${i+1}</td><td class="l">${esc(x.key)}</td><td class="l">${esc(x.side||'-')}</td>`+
    `<td>${rpN(x.r)}</td><td>${rpN(x.res)}</td><td>${rpPct(x.res,x.r)}</td>`+
    `<td class="dn">${rpN(x.u)}</td><td>${rpDelta(x.u-(x.pu||0))}</td>`+
    `<td>${rpN(x.lt)}</td><td>${rpDelta(x.lt-(x.plt||0))}</td></tr>`).join('');
  if(rest.length)coRows+=`<tr><td class="dim">—</td><td class="l dim">그 외 ${rest.length}곳</td><td class="l dim">—</td>`+
    `<td class="dim">${rpN(rSum('r'))}</td><td class="dim">${rpN(rSum('res'))}</td><td class="dim">${rpPct(rSum('res'),rSum('r'))}</td>`+
    `<td class="dim">${rpN(rSum('u'))}</td><td class="dim">${rpDelta(rSum('u')-rSum('pu'))}</td>`+
    `<td class="dim">${rpN(rSum('lt'))}</td><td class="dim">${rpDelta(rSum('lt')-rSum('plt'))}</td></tr>`;
  const coTbl=`<table><thead><tr>
    <th class="cc" style="width:5%">NO</th><th class="l" style="width:22%">시공업체</th><th class="l" style="width:9%">주요 공종</th>
    <th style="width:9.6%">전체 접수</th><th style="width:9.6%">처리</th><th style="width:8.6%">처리율</th>
    <th style="width:9.6%">미처리</th><th style="width:8.6%">전월대비</th><th style="width:9.6%">장기미처리</th>
    <th style="width:8.4%">전월대비</th></tr></thead><tbody>${coRows}</tbody>
    <tfoot><tr><td></td><td class="l">합계</td><td></td><td>${rpN(tR)}</td><td>${rpN(res)}</td><td>${rpPct(res,tR)}</td>
      <td>${rpN(unr)}</td><td>${rpDelta(unr-pUnr)}</td><td>${rpN(lt)}</td><td>${rpDelta(lt-pLt)}</td></tr></tfoot></table>`;

  const p1=rpSec(1,'종합 현황','전월 대비',kpi)+rpSec(2,'하자접수 · 처리 주차별 추이','',trend)
    +rpSec(3,'주요 이슈','전월 대비 변화·현장 간 편차 기준 자동 선별',issHTML)
    +rpSec(4,'월별 처리 현황',rm.slice(0,4)+'년 누계',moTbl);
  const p2=rpSec(5,'미처리 분포',`미처리 ${rpN(unr)}건 기준`,dist)
    +rpSec(6,'현장별 처리 현황',`권역 · 현장 순 · ${sites.length}개 현장`,siteTbl)
    +rpSec(7,'업체별 처리 현황',`시공업체 기준 · 미처리 상위 ${top.length}곳 / 전체 ${co.length}곳`,coTbl);
  const p2Rows=st.length+top.length+(rest.length?1:0);
  const p2Cls=p2Rows>=27?'dense dense2':p2Rows>=23?'dense':'';
  return `<div class="rpt">${rpPage(1,2,hdrF,p1)}${rpPage(2,2,hdrS,p2,p2Cls)}</div>`;
}

/* ── 현장 보고서 ── */
function rptSite(sid){
  const site=(S.org.sites||[]).find(s2=>s2.id===sid);if(!site)return '';
  const c=DF.kpi[dfRm()+'/'+sid];if(!c)return '';
  const p=c.prev||{},asof=(c.rmEnd||S.dfRm).replace(/-/g,'. ')+'.';
  const hdrF=rpHdr(site.name+' 하자처리 현황 보고',
    [`권역 <b>${esc(site.region||'-')}</b>`,
     `규모 <b>${site.buildings?site.buildings+'개동 ':''}${rpN(site.units)}세대</b>`,
     `준공 <b>${esc((site.completionDate||'').replace('-','. ')+'.')}</b>`],asof);
  const hdrS=rpHdr(site.name+' 하자처리 현황 보고',[],asof,true);

  const kpi=rpKpi([
    {k:'전체 접수',v:c.tR,d:`세대당 ${site.units?((c.tR||0)/site.units).toFixed(1):'0.0'}건 · ${rpDelta((c.tR||0)-(p.total||0))}`},
    {k:'처리 완료',v:c.res,d:`처리율 <b>${rpPct(c.res,c.tR)}</b> · ${rpDelta((c.res||0)-(p.res||0))}`},
    {k:'미처리',v:c.unr,d:`세대당 ${site.units?((c.unr||0)/site.units).toFixed(1):'0.0'}건 · ${rpDelta((c.unr||0)-(p.unr||0))}`},
    {k:'장기미처리',v:c.lt,d:`미처리의 <b>${rpPct(c.lt,c.unr)}</b> · ${rpDelta((c.lt||0)-(p.lt||0))}`}]);
  const trend=rpTrend(c.weekly||[])+RP_LG;

  const tops=((c.trAgg)||[]).slice().sort((a,b)=>(b.u||0)-(a.u||0));
  const issHTML=rpIssSite(c,p,site,tops);

  const moTbl=`<table><thead><tr>
    <th class="cc" style="width:10%">월</th><th style="width:10%">전체 접수</th><th style="width:10%">월간 접수</th>
    <th style="width:10%">전체 처리</th><th style="width:10%">처리율</th><th style="width:10%">월간 처리</th>
    <th style="width:10%">전체 미처리</th><th style="width:10%">전월대비</th><th style="width:10%">장기미처리</th>
    <th style="width:10%">전월대비</th></tr></thead><tbody>${rpMoRows({keys:dfMoSnapsSite(c.weekly).keys,map:dfMoSnapsSite(c.weekly).map})}</tbody></table>`;

  const cut=(arr,lbl)=>{const t=arr.slice(0,5),r=arr.slice(5);
    if(r.length)t.push({n:`그 외 ${r.length}${lbl}`,v:r.reduce((a,x)=>a+x.v,0)});return t;};
  const byTr=tops.map(t=>({n:t.t,v:t.u||0}));
  const tyMap={};
  /* ⚠ kpi.ul 은 게시본 폴백(상위 300건 캡)이다 — 전체 목록은 ulz(dfList)로 받는다 */
  const ulFull=DF.list[dfRm()+'/'+sid]||c.ul||[];
  ulFull.forEach(i=>{const k=(i.trade||'기타')+'-'+(i.defectType||i.type||'기타');tyMap[k]=(tyMap[k]||0)+1;});
  const byTy=Object.entries(tyMap).map(([n,v])=>({n,v})).sort((a,b)=>b.v-a.v);
  /* ⚠ 게시본 ul 은 상위 300건까지만 실린다 — 유형별 분모는 실린 표본 수로 잡아야 도넛이 채워진다 */
  const tySum=byTy.reduce((a,x)=>a+x.v,0)||(c.unr||0);
  const dist=`<div class="two">${rpDonut(cut(byTr,'개 공종'),c.unr,'공종별')}${rpDonut(cut(byTy,'개'),tySum,'공종 · 유형별')}</div>`;

  const planTbl=(rows,prevMap,field,num)=>{
    const body=rows.map((x,i)=>{
      const pc=(prevMap&&prevMap[x.t])||0,d=(x.c||0)-pc;
      const prev=dfPlanGet(sid,field,dfPrevMonth(S.dfRm),x.t),cur=dfPlanGet(sid,field,S.dfRm,x.t);
      const cell=v=>v?esc(v):'';
      return `<tr><td>${i+1}</td><td class="l">${esc(x.t)}</td><td class="l">${esc(x.co||'-')}</td>`+
        `<td>${rpN(pc)}</td><td class="dn">${rpN(x.c)}</td><td>${rpDelta(d)}</td>`+
        `<td>${num?rpPct(x.c,num):'-'}</td><td class="plan">`+
        `<div class="prev"><span class="lb">전월</span><span class="tx">${cell(prev)}</span></div>`+
        `<div class="cur"><span class="lb">금월</span><span class="tx">${cell(cur)}</span></div></td></tr>`;}).join('');
    return `<table class="plan-tbl"><thead><tr>
      <th style="width:4%">순위</th><th class="l" style="width:9%">공종</th><th class="l" style="width:14%">시공업체</th>
      <th style="width:6.5%">전월</th><th style="width:6.5%">금월</th><th style="width:7%">전월대비</th><th style="width:7%">비율</th>
      <th class="l" style="width:46%">처리계획</th></tr></thead><tbody>${body}</tbody></table>`;};
  const ltTop=((c.topLt)||[]).filter(x=>!x.isT&&!x.isO).slice(0,5);
  const vacTop=((c.vTop)||[]).filter(x=>!x.isT&&!x.isO).slice(0,5);


  const p1=rpSec(1,'종합 현황','전월 대비',kpi)+rpSec(2,'하자접수 · 처리 주차별 추이','',trend)
    +rpSec(3,'주요 이슈','전월 대비 변화·공종 간 편차 기준 자동 선별',issHTML)
    +rpSec(4,'월별 처리 현황',S.dfRm.slice(0,4)+'년 누계',moTbl);
  const p2=rpSec(5,'미처리 분포',`미처리 ${rpN(c.unr)}건 기준`,dist)
    +rpSec(6,'장기미처리 처리계획','30일 이상 · 상위 5개 공종',planTbl(ltTop,c.topLtPrev,'processingPlan',c.lt))
    +(vacTop.length?rpSec(7,'공가세대 처리계획',`공가세대 미처리 ${rpN(c.vUnr||0)}건 · 상위 ${vacTop.length}개 공종`,
        planTbl(vacTop,c.vTopPrev,'vacantProcessingPlan',c.vUnr)):'');
  /* 736차: 3쪽은 708차(AI 분석 제거) 이후 빈 채로 나오던 잔재 — 2쪽으로 끝낸다. 민원 절은 보고서에 넣지 않는다(사용자 결정) */
  return `<div class="rpt">${rpPage(1,2,hdrF,p1)}${rpPage(2,2,hdrS,p2)}</div>`;
}

/* 보고서 한 쪽 맞춤 — 쪽마다 실측해 넘치는 만큼만 줄인다(행간 → 표 글자 → 분석 본문 순) */
function rptFit(root){
  if(!root)return;
  root.querySelectorAll('.page').forEach(pg=>{
    const pgn=pg.querySelector('.pgn');if(!pgn)return;
    const over=()=>{const lim=pgn.getBoundingClientRect().top-6;let b=0;
      pg.querySelectorAll('.sec').forEach(s2=>{b=Math.max(b,s2.getBoundingClientRect().bottom);});return b>lim;};
    if(over())pg.classList.add('dense');
    if(over())pg.classList.add('dense2');
    const ai=pg.querySelector('.ai');
    if(ai)for(let fs=8.25;over()&&fs>=6.25;fs-=0.25)ai.style.setProperty('--aifs',fs+'px');
  });
}
/* 분석 원문을 보고서 서식으로 — HTML 이면 스타일 걷어내고 재서식, 평문이면 소제목/목록 */
/* 인쇄 방식 선택 — 화면 그대로 / 보고서 양식 + 보고서 글꼴 */
function rptThumb(kind){
  if(kind==='screen')return `<svg class="rpk-th" viewBox="0 0 160 113" width="100%">
    <rect x="10" y="9" width="140" height="18" rx="4" fill="#DDE3EA"/>
    <g fill="#DDE3EA"><rect x="10" y="32" width="33" height="20" rx="4"/><rect x="46" y="32" width="33" height="20" rx="4"/>
      <rect x="82" y="32" width="33" height="20" rx="4"/><rect x="118" y="32" width="32" height="20" rx="4"/></g>
    <rect x="10" y="57" width="140" height="30" rx="4" fill="#DDE3EA"/>
    <g fill="#08213f" opacity=".55"><rect x="18" y="70" width="6" height="13"/><rect x="28" y="66" width="6" height="17"/>
      <rect x="38" y="72" width="6" height="11"/><rect x="48" y="63" width="6" height="20"/>
      <rect x="58" y="68" width="6" height="15"/><rect x="68" y="61" width="6" height="22"/></g>
    <rect x="10" y="92" width="140" height="13" rx="4" fill="#DDE3EA"/></svg>`;
  return `<svg class="rpk-th" viewBox="0 0 160 113" width="100%">
    <rect x="14" y="10" width="62" height="7" rx="1.5" fill="#08213f"/>
    <rect x="118" y="11" width="28" height="4" rx="1" fill="#C8CDD4"/>
    <rect x="14" y="21" width="52" height="3" rx="1" fill="#C8CDD4"/>
    <line x1="14" y1="29" x2="146" y2="29" stroke="#C8CDD4"/>
    <rect x="14" y="34" width="26" height="4" rx="1" fill="#08213f"/>
    <line x1="14" y1="41" x2="146" y2="41" stroke="#08213f"/>
    <g fill="#08213f" opacity=".75"><rect x="16" y="46" width="20" height="7" rx="1"/><rect x="50" y="46" width="20" height="7" rx="1"/>
      <rect x="84" y="46" width="20" height="7" rx="1"/><rect x="118" y="46" width="20" height="7" rx="1"/></g>
    <rect x="14" y="60" width="26" height="4" rx="1" fill="#08213f"/>
    <line x1="14" y1="67" x2="146" y2="67" stroke="#08213f"/>
    <g fill="#08213f" opacity=".6"><rect x="18" y="76" width="5" height="10"/><rect x="27" y="73" width="5" height="13"/>
      <rect x="36" y="78" width="5" height="8"/><rect x="45" y="71" width="5" height="15"/><rect x="54" y="75" width="5" height="11"/>
      <rect x="63" y="69" width="5" height="17"/><rect x="72" y="74" width="5" height="12"/><rect x="81" y="70" width="5" height="16"/></g>
    <polyline points="20,80 29,78 38,79 47,74 56,75 65,71 74,72 83,69" fill="none" stroke="#08213f" stroke-width="1.2"/>
    <rect x="14" y="92" width="26" height="4" rx="1" fill="#08213f"/>
    <g stroke="#C8CDD4"><line x1="14" y1="99" x2="146" y2="99"/><line x1="14" y1="104" x2="146" y2="104"/>
      <line x1="14" y1="109" x2="146" y2="109"/></g></svg>`;
}
function rptFont(){try{return localStorage.getItem('calapp.rptFont')==='sys'?'sys':'brand';}catch(e){return 'brand';}}   /* 442차: 저장소 차단(프라이빗 모드 등)에서도 죽지 않게 */
function openPrintPick(){
  const fSaved=rptFont();
  const opt=(v,nm,ds,mt)=>`<div class="rpk-opt${v==='report'?' on':''}" data-act="print.pick" data-v="${v}">
      ${rptThumb(v)}
      <div class="rpk-nm"><span class="rpk-rd"></span>${nm}</div>
      <div class="rpk-ds">${ds}</div><div class="rpk-mt">${mt}</div></div>`;
  openModal('인쇄',
    `<div class="rpk-sub">어떤 형태로 인쇄할지 고르세요.</div>
    <div class="rpk">
      ${opt('screen','화면 그대로','지금 보고 계신 카드 배치를 그대로 인쇄합니다.','기존 방식')}
      ${opt('report','보고서 양식','A4 문서 형태로 재구성해 인쇄합니다.',S.dfSid?'현황 · 추이 · 이슈 · 표 순 · 3쪽':'현황 · 추이 · 이슈 · 표 순 · 2쪽')}
    </div>
    <div class="rpk-fnt" id="rpkFont"><span class="rpk-fnt-l">보고서 글꼴</span><div class="rpk-seg">
      ${[['brand','기본'],['sys','윈도우 기본']].map(([f,nm])=>
        `<button class="${f===fSaved?'on':''}" data-act="print.font" data-f="${f}">${nm}</button>`).join('')}
    </div></div>`,
    `<button class="btn bg2 bsm" data-act="modal.close">취소</button>
    <button class="btn bp bsm" data-act="print.go">인쇄</button>`);
  $('#mb').classList.add('wide-pick');
}
function rptPickSel(el){
  $$('.rpk-opt').forEach(o=>o.classList.remove('on'));
  el.classList.add('on');
  const f=$('#rpkFont');
  if(f)f.classList.toggle('off',el.dataset.v==='screen');   /* 글꼴은 보고서 양식에만 적용 */
}
function rptPickFont(el){
  $$('.rpk-seg button').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');
}
function rptPickGo(){
  const sel=document.querySelector('.rpk-opt.on'),v=sel?sel.dataset.v:'report';
  const fs=document.querySelector('.rpk-seg button.on');
  if(fs){try{localStorage.setItem('calapp.rptFont',fs.dataset.f);}catch(e){}}
  closeModal();
  setTimeout(()=>{v==='screen'?dfPrint():dfPrintReport();},80);
}
async function dfPrintReport(){
  try{await loadChart();}catch(e){}
  if(S.view!=='defect'){window.print();return;}
  const rm=dfRm();
  if(S.dfSid){
    if(DF.kpi[rm+'/'+S.dfSid]===undefined){toast('자료를 불러온 뒤 인쇄할 수 있습니다');return;}
    /* ⚠ 사전 로드가 하나라도 reject 되면 async 가 조용히 중단돼 보고서가 아예 안 뜬다(223차 점검에서 확인)
       — 네트워크 실패여도 이미 받아 둔 자료로 조립한다 */
    try{await dfLoadPlans(S.dfSid);}catch(e){console.warn('[하자] 인쇄 사전 로드(plans)',e);}
    
    try{await dfList(S.dfSid);}catch(e){console.warn('[하자] 인쇄 사전 로드(list)',e);}   /* 공종·유형별 분포는 전체 미처리 목록 기준 */
  }else{
    if(!DF.cache[rm]){toast('자료를 불러온 뒤 인쇄할 수 있습니다');return;}
    toast('현장 자료 수집 중…');
    try{await dfAllKpi();}catch(e){console.warn('[하자] 인쇄 사전 로드(kpi)',e);}
  }
  const old=document.getElementById('rptRoot');if(old)old.remove();
  /* 보고서는 A4 전면을 직접 구성한다 — @page 설정은 인쇄 동안만 적용한다 */
  let _ps=document.getElementById('rptPageCSS');
  if(!_ps){_ps=document.createElement('style');_ps.id='rptPageCSS';document.head.appendChild(_ps);}
  _ps.textContent='@page{size:A4 portrait;margin:0;@bottom-right{content:""}@bottom-left{content:""}@top-left{content:""}@top-right{content:""}}';
  const d=document.createElement('div');d.id='rptRoot';
  try{d.innerHTML=S.dfSid?rptSite(S.dfSid):rptDashboard();}
  catch(e){toast('보고서를 만들지 못했습니다');console.error(e);return;}
  const _rp=d.querySelector('.rpt');
  if(_rp)_rp.classList.add(rptFont()==='sys'?'f-sys':'f-brand');
  document.body.appendChild(d);
  document.body.classList.add('rpt-on');
  try{rptFit(d);}catch(e){console.warn('rptFit',e);}
  let _rdone=false;
  const done=()=>{if(_rdone)return;_rdone=true;
    document.body.classList.remove('rpt-on');
    const r=document.getElementById('rptRoot');if(r)r.remove();
    const st=document.getElementById('rptPageCSS');if(st)st.remove();
    window.removeEventListener('afterprint',done);};
  window.addEventListener('afterprint',done);
  /* 보고서 경로도 같은 함정 — 1.5초 폴백이 인쇄 대화상자보다 먼저 터지면 2쪽부터 사라진다 */
  setTimeout(()=>{window.print();
    setTimeout(()=>{if(document.body.classList.contains('rpt-on'))done();},60000);},60);
}

/* 인쇄용 추이 카드 — 캔버스를 2배 폭으로 그린 뒤 절반으로 줄여 넣는다(라벨 겹침 방지) */
function dfPrTrendCard(){
  return `<div class="card mb12 main-chart-card" data-print="ov-chart"><div class="sh" style="margin-bottom:6px;flex-shrink:0"><div class="ct cardttl">하자접수 · 처리 주차별 추이</div></div>
    <div class="cw" style="flex:1;min-height:0"><canvas id="dfPrTrend"></canvas></div>${dfTrendLegend}</div>`;
}
function dfPrintHdrHTML(title){
  const{team}=tkSel();
  const ym=S.dfRm||new Date().toISOString().slice(0,7),[y,m]=ym.split('-');
  const last=new Date(Number(y),Number(m),0).getDate();
  return `<div class="sp-page-hdr"><div class="ph-l"><div class="ph-team">${esc((team&&team.name)||'H서비스센터')} 하자처리 현황</div><div class="ph-title">${esc(title)}</div></div><div class="ph-r"><div class="ph-label">기준일</div><div class="ph-date">${y}.${m}.${String(last).padStart(2,'0')}</div></div></div>`;
}
async function dfPrint(){
  try{await loadChart();}catch(e){}
  if(S.view!=='defect'){window.print();return;}
  const site=S.dfSid?(S.org.sites||[]).find(x=>x.id===S.dfSid):null;
  const d=DF.cache[dfRm()];
  const k=site?DF.kpi[dfRm()+'/'+site.id]:null;
  if(site&&!k){toast('자료를 불러온 뒤 인쇄할 수 있습니다');return;}
  if(!site&&!d){toast('자료를 불러온 뒤 인쇄할 수 있습니다');return;}
  DF.noAnim=true;   /* 인쇄용 차트는 즉시 완성 상태로 — 인쇄 미디어 전환 때 리사이즈가 나도 애니메이션 없이 붙는다 */
  const box=document.createElement('div');
  box.id='dfPrintPages';
  const pg=(cls,html)=>`<div class="sp-print-page${cls?' '+cls:''}">${html}</div>`;
  const title=site?`${site.region} · ${site.name}`:'전체 현황 대시보드';
  const hdr=()=>dfPrintHdrHTML(title);
  let html='';
  if(site){
    const st=k;
    const units=site.units||0,compDate=site.completionDate?` · ${site.completionDate}`:'';
    const kpis=dfKcHTML([
      {cls:'bl',label:'현장규모',valHTML:`${units.toLocaleString()}<span class="u">세대</span>`,meta:`${site.buildings||0}개동${compDate}`},
      {cls:'sk',label:'전체 접수',val:st.tR||0,unit:'건',meta:`세대당 ${units>0?((st.tR||0)/units).toFixed(1):'0.0'}건`},
      {cls:'ms',label:'처리 완료',val:st.res||0,unit:'건',meta:`처리율 ${(Number(st.rate)||0).toFixed(1)}%`},
      {cls:'wh'+((st.unr||0)>0?' kc-warn':''),label:'미처리',val:st.unr||0,unit:'건',meta:`세대당 ${units>0?((st.unr||0)/units).toFixed(1):'0.0'}건`},
      {cls:'wh'+((st.lt||0)>0?' kc-bad':''),label:'장기미처리(30일+)',val:st.lt||0,unit:'건',meta:`미처리의 ${(Number(st.ltr)||0).toFixed(1)}%`}]);
    const trend=dfPrTrendCard();
    const opsr=`<div class="opsr"><div class="card"><div class="ct cardttl">전월대비 실적 현황</div><div id="dfPrMom" class="mom-wrap"></div></div>${dfDonutCardHTML('공종별 미처리 분포','dfPrMx','dfPrMxLg')}</div>`;
    const P=dfAxParts(site.id,st);
    const tradeAll=`<div class="card"><div class="sh"><div class="st cardttl">${P.ax==='co'?'업체별':'공종별'} 하자처리 현황</div></div><table class="dt" style="table-layout:fixed"><thead><tr><th class="cc" style="width:6%">NO</th><th style="width:11%">${P.ax==='co'?'시공업체':'공종'}</th><th style="width:11%">${P.ax==='co'?'주요 공종':'시공업체'}</th><th class="n" style="width:7%">전체 접수</th><th class="n" style="width:7%">처리</th><th class="cc" style="width:7%">처리율</th><th class="cc" style="width:7%">미처리</th><th class="cc" style="width:6%">전월대비</th><th class="n" style="width:7%">장기미처리</th><th class="cc" style="width:25%">장기미처리 비율</th><th class="cc" style="width:6%">전월대비</th></tr></thead><tbody>${P.rows||P.emptyRow}</tbody></table></div>`;
    html+=pg('',hdr()+kpis+trend+opsr+dfMonthCardHTML(st,S.dfRm.slice(0,4),''));
    html+=pg('sp-page-break-before sp-p2',hdr()+dfLtrMomHTML(st)+`<div class="card"><div class="sh"><div class="st cardttl">장기미처리 상위 5개 공종 처리 현황</div></div><table class="dt" style="table-layout:fixed">${DF_TOP5_THEAD}<tbody>${dfTop5Rows(site.id,st.topLt,st.topLtPrev,st.lt||0,'processingPlan','')}</tbody></table></div>`);
    /* 231차: 공가 페이지가 통째로 빠지는 사례 — 한 페이지 조립이 실패하면 그 뒤 페이지까지 날아갔다.
       페이지마다 따로 감싸서 하나가 실패해도 나머지는 인쇄되게 하고, 사유는 콘솔에 남긴다. */
    if(site.showVacant!==false){
      try{
        const vu=st.vacU||{T:st.vT,Res:st.vRes,Unr:st.vUnr,Rate:st.vRate,Lt:st.vLt,Units:st.vUnits,Top:st.vTop||[],TopPrev:st.vTopPrev||{}};
        html+=pg('sp-page-break-before sp-p2',hdr()+dfVacPane(site.id,vu,DF.vac[dfRm()+'/'+site.id]||{},'sedae'));
      }catch(e){console.warn('[print] 공가세대 페이지 조립 실패',e);}
    }
    if(site.hasCommercial){
      try{html+=pg('sp-page-break-before sp-p2',hdr()+dfVacPane(site.id,st.vacS||{},DF.vac[dfRm()+'/'+site.id]||{},'sangga'));}
      catch(e){console.warn('[print] 공가상가 페이지 조립 실패',e);}
    }
    html+=pg('sp-page-break-before',hdr()+tradeAll);
  }else{
    const sites=dfDashSites();
    const units=sites.reduce((a,x)=>a+(x.units||0),0);
    const all=sites.map(x=>({s:x,st:dfStFromWeekly(d.wk[x.id],d.rm)}));
    let tR=0,tRes=0,tU=0,tLt=0,pT=0,pRes=0,pU=0,pLt=0;
    all.forEach(({st})=>{tR+=st.tR;tRes+=st.res;tU+=st.unr;tLt+=st.lt;pT+=st.prev.total;pRes+=st.prev.res;pU+=st.prev.unr;pLt+=st.prev.lt;});
    const rate=tR>0?tRes/tR*100:0;
    const kpis=dfKcHTML([
      {cls:'bl',label:'관리대상현장',valHTML:`${units.toLocaleString()}<span class="u">세대</span>`,meta:`${sites.length.toLocaleString()}개 현장`},
      {cls:'sk',label:'전체 접수',val:tR,unit:'건',meta:`세대당 ${units>0?(tR/units).toFixed(1):'0.0'}건`},
      {cls:'ms',label:'처리 완료',val:tRes,unit:'건',meta:`처리율 ${rate.toFixed(1)}%`},
      {cls:'wh'+(tU>0?' kc-warn':''),label:'미처리',val:tU,unit:'건',meta:`세대당 ${units>0?(tU/units).toFixed(1):'0.0'}건`},
      {cls:'wh'+(tLt>0?' kc-bad':''),label:'장기미처리(30일+)',val:tLt,unit:'건',meta:`미처리의 ${tU>0?(tLt/tU*100).toFixed(1):0}%`}]);
    const trend=dfPrTrendCard();
    html+=pg('',hdr()+kpis+trend
      +`<div class="opsr"><div class="card"><div class="ct cardttl">전월대비 실적 현황</div><div id="dfPrMom" class="mom-wrap"></div></div>${dfDonutCardHTML('현장별 미처리 분포','dfPrSx','dfPrSxLg')}</div>`
      +`<div class="opsr">${dfRiskDashHTML(sites,d.hh||{})||dfInsightHTML(d.ins)}${dfDonutCardHTML('공종별 미처리 분포','dfPrMx','dfPrMxLg')}</div>`);   /* 718차: ③ 현장별 민원 현황(주요 이슈 자리) · ④ 공종별 미처리 분포 */
    html+=pg('sp-page-break-before sp-p2',hdr()
      +`<div class="card"><div class="sh"><div class="ct cardttl">월별 하자처리 현황</div></div><div><table class="dt" style="table-layout:fixed" id="dfPrDashMo"></table></div></div>`
      +`<div class="card"><div class="sh"><div class="st cardttl">현장별 하자처리 현황</div></div><table class="dt" id="dfPrDashTbl" style="table-layout:fixed"></table></div>`
      +`<div class="card"><div class="sh"><div class="st cardttl">공종별 하자처리 현황</div></div><table class="dt" id="dfPrDashTblCo" style="table-layout:fixed"></table></div>`);
  }
  box.innerHTML=html;
  /* 쪽번호 n / N — @page 카운터가 크롬에서 죽어 있어 DOM 으로 넣는다(224차) */
  {const pgs=box.querySelectorAll('.sp-print-page');
   pgs.forEach((el,i)=>{const n=document.createElement('div');n.className='sp-pgn';
     n.textContent=(i+1)+' / '+pgs.length;el.appendChild(n);});}
  $('#view-defect').appendChild(box);
  document.body.classList.add('df-printing');
  /* 처리계획 textarea → 인쇄용 텍스트(plan-print). 빈 단은 통째로 숨긴다 — 원본 규칙 */
  box.querySelectorAll('textarea.plan-ta').forEach(ta=>{
    const div=document.createElement('div');div.className='plan-print';div.textContent=ta.value||ta.textContent||'';
    ta.parentNode.insertBefore(div,ta.nextSibling);
    const stk=ta.closest('.pp-stack');if(stk)stk.classList.toggle('pp-empty',!(div.textContent||'').trim());
  });
  /* 차트는 인쇄 상자 안 캔버스에 밝은 색으로 새로 그린다 */
  await new Promise(r=>setTimeout(r,60));
  try{
    if(site){
      const st=DF.kpi[dfRm()+'/'+site.id],key=dfRm()+'/'+site.id;
      dfTrendDraw('prTrend','dfPrTrend',DF.sw[key]);
      dfMomRender('dfPrMom',{tR:st.tR||0,res:st.res||0,unr:st.unr||0,lt:st.lt||0,prev:{total:(st.prev&&st.prev.total)||0,res:(st.prev&&st.prev.res)||0,unr:(st.prev&&st.prev.unr)||0,lt:(st.prev&&st.prev.lt)||0}});
      dfDonutDraw('prMx','dfPrMx','dfPrMxLg',dfDonutData(DF.sam[key]));
    }else{
      const sites=dfDashSites(),all=sites.map(x=>({s:x,st:dfStFromWeekly(d.wk[x.id],d.rm)}));
      dfTrendDraw('prTrend','dfPrTrend',d.wks);
      let tR=0,tRes=0,tU=0,tLt=0,pT=0,pRes=0,pU=0,pLt=0;
      all.forEach(({st})=>{tR+=st.tR;tRes+=st.res;tU+=st.unr;tLt+=st.lt;pT+=st.prev.total;pRes+=st.prev.res;pU+=st.prev.unr;pLt+=st.prev.lt;});
      dfMomRender('dfPrMom',{tR,res:tRes,unr:tU,lt:tLt,prev:{total:pT,res:pRes,unr:pU,lt:pLt}});
      dfDonutDraw('prSx','dfPrSx','dfPrSxLg',all.filter(x=>x.st.unr>0).map(x=>({t:dfShortSite(x.s.name),full:x.s.name,c:x.st.unr})).sort((a,b)=>b.c-a.c));
      dfDonutDraw('prMx','dfPrMx','dfPrMxLg',dfDonutData(d.am));
      const moTbl=box.querySelector('#dfPrDashMo');
      if(moTbl){const keep=$('#dfDashMo');const tmp=keep;   /* 월별 표 채우기 — 화면 채움 함수를 인쇄 표에 재사용 */
        moTbl.id='dfDashMo';if(tmp)tmp.id='dfDashMo_live';
        dfDashMonthTable(d);
        moTbl.querySelectorAll('.yr-sel').forEach(x=>x.remove());
        moTbl.id='dfPrDashMo';if(tmp)tmp.id='dfDashMo';}
      const fillAx=(pid,axv)=>{const tb=box.querySelector('#'+pid);if(!tb)return;const keep=$('#dfDashTbl');tb.id='dfDashTbl';if(keep)keep.id='dfDashTbl_live';
        const ax=S.dfAxDash;S.dfAxDash=axv;dfDashTableFill(d);S.dfAxDash=ax;
        tb.id=pid;if(keep)keep.id='dfDashTbl';};
      try{await dfAllKpi();}catch(e){}   /* 공종별 표는 전 현장 kpi 가 있어야 */
      fillAx('dfPrDashTbl','site');fillAx('dfPrDashTblCo','co');   /* 717차: 현장별 + 공종별 */
    }
  }catch(e){console.warn('[하자] 인쇄 차트 준비 실패',e);}
  await new Promise(r=>setTimeout(r,260));   /* noAnim 이라 차트는 즉시 앉는다 — 라벨 플러그인 여유만 */
  let _done=false;
  const done=()=>{if(_done)return;_done=true;window.removeEventListener('afterprint',done);
    document.body.classList.remove('df-printing');
    if(box.parentNode)box.parentNode.removeChild(box);
    ['prTrend','prMx','prSx','prMom'].forEach(dfC);
    DF.noAnim=true;   /* 상시 해제(351차) — 예전에는 여기서 애니메이션을 되살렸다 */};
  window.addEventListener('afterprint',done);
  window.print();
  /* ⚠ 231차: 1.5초 폴백이 인쇄 대화상자보다 먼저 터져 2쪽 이후가 통째로 사라졌다(원본 인쇄본 대조로 확인).
     afterprint 가 오면 done 이 즉시 정리하므로, 폴백은 넉넉히 두고 이미 정리됐으면 아무 일도 하지 않는다. */
  setTimeout(()=>{if(document.body.classList.contains('df-printing'))done();},60000);
}
function rDefect(){
  const root=$('#defectRoot');if(!root)return;
  const site=S.dfSid?(S.org.sites||[]).find(x=>x.id===S.dfSid):null;
  if(!S.live){root.innerHTML=dfNoneHTML('로그인하면 게시본을 읽어 옵니다.');dfTopbar();return;}
  dfSubSiteCfg();
  const rm=dfRm(),d=rm&&DF.cache[rm];
  if(!d){
    root.innerHTML=dfNoneHTML('게시본을 불러오는 중입니다…');
    dfLoad().then(r=>{if(S.view!=='defect')return;
      if(r)rDefect();else $('#defectRoot').innerHTML=dfNoneHTML('아직 게시된 집계가 없습니다.');});
    dfTopbar();return;
  }
  S.dfRm=d.rm;
  if(!site)rDefectDash(root,d);
  else rDefectSite(root,site);
  dfTopbar();
}
/* ═══════════ 하자 목록 — 게시본의 미처리 목록(ulz, LZ 압축·PII 마스킹) ═══════════
   ⚠ 열 구성은 하자처리 현황의 REC_COLS 와 같게 맞춘다(엑셀로 내보낸 파일이 양쪽에서 같아야 한다). */
/* 열 기본 폭(w)은 원본 REC_COLS(app-data.js 865~) 그대로 — table-layout:fixed 와 짝이다.
   fixed 가 아니면 필터행(input)이 열리는 순간 auto 레이아웃이 열 폭을 재계산해 표가 출렁인다(227차 지시). */
const REC_COLS=[
  {k:'building',t:'동',w:62},{k:'unit',t:'호',w:62},{k:'receiptDate',t:'접수일',w:132},{k:'defectClass',t:'하자구분',w:84},
  {k:'space',t:'공간',w:84},{k:'trade',t:'공종',w:96},{k:'defectType',t:'하자유형',w:96},
  {k:'receiptContent',t:'접수내용',wide:true,w:null},{k:'repairParty',t:'보수주체',w:92},
  {k:'contractor',t:'시공업체',w:120},{k:'repairContractor',t:'보수업체',w:120},{k:'delayDays',t:'지연일',num:true,w:78}
];
const REC={rows:[],view:[],q:'',band:'',vac:'',limit:500,sort:'',desc:false,title:'',withSite:false,filterRow:false,filters:{},
  hidden:{},   /* 숨긴 열 */
  vals:{},     /* 열별 값 필터 — {열키:{값:1}} 이 있으면 그 값만 남긴다 */
  w:{}};       /* 열 너비(px) — 머리 경계를 끌어 조절 */
const REC_SITE_COL={k:'siteName',t:'현장',w:152};
function recCols(){return REC.withSite?[REC_SITE_COL].concat(REC_COLS):REC_COLS;}
function recVisCols(){return recCols().filter(c=>!REC.hidden[c.k]);}
/* 공가세대 판정 — 원본 isVacUnit 과 동일(하자구분='세대' AND 입주상태∈{미분양,미납}) */
function recIsVac(r){return r.defectClass==='세대'&&(r.saleStatus==='미분양'||r.saleStatus==='미납');}
function recIsStore(r){return r.defectClass==='공용'&&/[강산살상성싱][가거기]/.test(String(r.building||'')+String(r.unit||''));}
/* 현장 kpi 의 ulz 를 풀어 목록을 얻는다 — 실패하면 캡(300건) 목록으로 물러선다 */
async function dfList(sid){
  const rm=dfRm();if(!S.live||!FB.db||!rm||!sid)return [];
  const ck=rm+'/'+sid;
  if(DF.list[ck])return DF.list[ck];
  let out=[];
  try{
    const z=(await FB.db.ref('report/'+rm+'/'+sid+'/ulz').once('value')).val();
    if(typeof z==='string'&&z&&typeof LZString!=='undefined'){
      const full=JSON.parse(LZString.decompressFromBase64(z)||'null');
      if(Array.isArray(full))out=full;
    }
  }catch(e){console.warn('[하자] 목록 해제 실패',e);}
  if(!out.length){const k=await dfSiteData(sid);out=(k&&Array.isArray(k.ul))?k.ul:[];}
  DF.list[ck]=out;return out;
}
function recBand(r){const d=Number(r.delayDays)||0;return d>=60?'d60':d>=30?'d30':'d0';}
function recBase(){
  /* 검색·값 필터·공가 필터까지 적용한 집합 — 밴드 칩 건수는 여기서 센다(밴드 자신은 제외) */
  const q=REC.q.trim().toLowerCase();
  const vf=Object.keys(REC.vals).filter(k=>REC.vals[k]&&Object.keys(REC.vals[k]).length);
  return REC.rows.filter(r=>{
    if(REC.vac==='unit'&&!recIsVac(r))return false;
    if(REC.vac==='store'&&!recIsStore(r))return false;
    for(const k of vf){const x=k.startsWith('__')?pivCell(r,k):r[k];
      const s=(x==null||x==='')?'(미기재)':String(x);
      if(!REC.vals[k][s])return false;}
    /* 필터행(각 열 아래 입력) — 원본 R.filters 와 동일한 부분 일치 */
    for(const k in REC.filters){const fq=String(REC.filters[k]||'').trim().toLowerCase();if(!fq)continue;
      const x=k.startsWith('__')?pivCell(r,k):r[k];
      const s2=((x==null||x==='')?'(미기재)':String(x)).toLowerCase();
      if(!s2.includes(fq))return false;}
    if(!q)return true;
    return recCols().some(c=>String(r[c.k]||'').toLowerCase().includes(q));
  });
}
function recCompute(){
  let v=recBase();
  if(REC.band)v=v.filter(r=>recBand(r)===REC.band);
  if(REC.sort){
    const c=recCols().find(x=>x.k===REC.sort)||{};
    v=v.slice().sort((a,b)=>{
      const x=a[REC.sort],y=b[REC.sort];
      const n=c.num?(Number(x)||0)-(Number(y)||0):String(x||'').localeCompare(String(y||''),'ko');
      return REC.desc?-n:n;});
  }
  REC.view=v;return v;
}
function recBodyHTML(){
  const base=recBase();
  const bandCnt=b=>b?base.filter(r=>recBand(r)===b).length:base.length;
  const vacCnt=REC.rows.filter(recIsVac).length;
  const v=recCompute();
  const cols=recVisCols();
  const head='<tr><th style="width:46px">No</th>'+cols.map(c=>{
    const w=REC.w[c.k]||c.w;   /* 사용자 드래그 폭 > 원본 기본 폭. 접수내용(w:null)은 잔여 전부 */
    return '<th data-act="rec.sort" data-k="'+c.k+'"'+(w?' style="width:'+w+'px"':'')+'>'
    +esc(c.t)+(REC.vals[c.k]&&Object.keys(REC.vals[c.k]).length?' <i class="fl">필터</i>':'')
    +(REC.sort===c.k?(REC.desc?' ▾':' ▴'):'')
    +'<span class="rz" data-act="rec.rz" data-k="'+c.k+'"></span></th>';}).join('')+'</tr>'
    /* 필터행 — 원본 recHeadHTML 의 rl-frow. 열 머리 우클릭 메뉴의 '필터행 표시'로 토글한다 */
    +'<tr class="rl-frow'+(REC.filterRow?' open':'')+'"><td class="rl-fc"></td>'
    +cols.map(c=>'<td class="rl-fc"><input class="rl-fin" data-key="'+c.k+'" data-act="rec.filter" value="'+esc(REC.filters[c.k]||'')+'" autocomplete="off" aria-label="'+esc(c.t)+' 필터"></td>').join('')+'</tr>';
  const lim=REC.limit>0?REC.limit:v.length;
  const body=v.slice(0,lim).map((r,i)=>'<tr><td>'+(i+1)+'</td>'
    +cols.map(c=>'<td'+(c.wide?' class="wide"':'')+'>'+esc(r[c.k]==null?'':String(r[c.k]))+'</td>').join('')+'</tr>').join('');
  const nh=Object.keys(REC.hidden).filter(k=>REC.hidden[k]).length;
  const band=(id,nm,n)=>'<button class="rl-band '+id+(REC.band===id?' on':'')+'" data-act="rec.band" data-b="'+id+'">'+nm+' <b>'+n.toLocaleString()+'</b></button>';
  const limBtn=n=>'<button class="'+(REC.limit===n?'on':'')+'" data-act="rec.limit" data-n="'+n+'">'+(n>0?n.toLocaleString()+'건':'전체')+'</button>';
  const storeCnt=REC.rows.filter(recIsStore).length;
  return '<div class="rl-band-bar">'
    +band('','전체',bandCnt(''))+band('d60','60일 이상',bandCnt('d60'))+band('d30','30~59일',bandCnt('d30'))
    +(REC.scope==='lul'?'':band('d0','30일 미만',bandCnt('d0')))
    +((vacCnt||storeCnt)?'<span class="rl-vsep"></span>':'')
    +(vacCnt?'<button class="rl-band'+(REC.vac==='unit'?' on':'')+'" data-act="rec.vac" data-v="unit">공가세대 <b>'+vacCnt.toLocaleString()+'</b></button>':'')
    +(storeCnt?'<button class="rl-band'+(REC.vac==='store'?' on':'')+'" data-act="rec.vac" data-v="store">공가상가 <b>'+storeCnt.toLocaleString()+'</b></button>':'')
    +(nh?'<button class="rl-band" data-act="rec.showAll">숨긴 열 '+nh+'개</button>':'')
    +(PIV.on?'':'<span class="rl-lim"><span class="rl-lim-lbl">표시</span>'+limBtn(500)+limBtn(1000)+limBtn(5000)+limBtn(0)+'</span>')
    +'</div>'
    +(PIV.on?pivHTML()
      /* 0건이어도 표(머리·필터행)는 유지한다 — 원본과 동일. 표째 없애면 열 머리 우클릭으로
         필터를 해제할 길이 사라진다(226차 검증에서 확인) */
      :'<div class="rec-wrap"><table class="rec-tbl"><thead>'+head+'</thead><tbody>'
        +(v.length?body:'<tr><td colspan="'+(cols.length+1)+'" class="rec-none-td">조건에 맞는 건이 없습니다.</td></tr>')
        +'</tbody></table></div>');
}
/* 모달 머리 — 원본과 같은 한 줄: 제목 · 검색 · 결과 수 · 표 복사/엑셀/피벗(목록)/닫기 */
function recHeadHTML(){
  return '<div class="rl-head"><span class="rl-ttl">'+esc(REC.title||'미처리')+'</span>'
    +'<span class="rec-n" id="recN"></span>'   /* 624차: 건수를 제목 옆으로 — 값이 변해도 검색창 자리가 안 흔들린다 */
    +'<div class="rl-acts">'
    +'<span class="rl-q-wrap'+(REC.q?' has':'')+'"><svg class="icn icn-sm" aria-hidden="true"><use href="#i-search"></use></svg>'
    +'<input id="recQ" class="rl-q" placeholder="동·호·공종·내용 검색" value="'+esc(REC.q)+'" autocomplete="off"><button class="rl-qx" data-act="rec.qclear" aria-label="지우기">×</button></span>'
    +'<button class="btn bg2 bsm" data-act="rec.xlsx">엑셀</button>'
    +'<button class="btn bg2 bsm" data-act="rec.pivot" id="recPivBtn">피벗</button>'
    +'<button class="btn bg2 bsm" data-act="modal.close">닫기</button>'
    +'</div></div>';
}
function recHeadSync(n,total){
  const el=$('#recN');
  if(el)el.innerHTML=PIV.on?'':('결과 <b>'+n.toLocaleString()+'</b> / 전체 <b>'+total.toLocaleString()+'</b>');
  const pb=$('#recPivBtn');if(pb)pb.textContent=PIV.on?'목록':'피벗';
}
/* ══ 열 머리 우클릭 필터 메뉴(rlMenu) — 원본 app-data.js 944~1010 을 REC 구조로 이식 ══
   원본과 다른 점: 값 필터 저장소가 Set(valueFilters)이 아니라 객체(REC.vals{값:1})이고,
   빈값 표기가 '(미기재)'(calapp 목록·피벗 공통 컨벤션 — '(빈값)' 아님)라는 것뿐이다. */
function recCellS(r,k){const x=k.startsWith('__')?pivCell(r,k):r[k];return (x==null||x==='')?'(미기재)':String(x);}
function recDistinct(k){
  const col=recCols().find(c=>c.k===k);
  const arr=[...new Set(REC.rows.map(r=>recCellS(r,k)))];
  if(col&&col.num)arr.sort((a,b)=>(+a||0)-(+b||0));else arr.sort((a,b)=>String(a).localeCompare(String(b),'ko'));
  return arr;
}
function recDateTree(vals){
  const years={},other=[];
  vals.forEach(v=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(v);if(!m){other.push(v);return;}const y=m[1],mo=m[2];(years[y]=years[y]||{});(years[y][mo]=years[y][mo]||[]);years[y][mo].push(v);});
  return {years,other};
}
function recDateLeaves(T,node){
  if(node[0]==='y')return Object.values(T.years[node.slice(2)]||{}).flat();
  const m=/^m:(\d{4})-(\d{2})/.exec(node);return m?((T.years[m[1]]||{})[m[2]]||[]):[];
}
function recTri(leaves,sel){let c=0;for(const v of leaves)if(sel.has(v))c++;return c===0?'none':(c===leaves.length?'all':'partial');}
function recMenuDateTreeHTML(){
  const M=REC._menu,T=M.dateTree,q=(M.q||'').trim().toLowerCase();
  const hit=v=>!q||String(v).toLowerCase().includes(q);
  const cb=st=>st==='all'?'checked':'',tri=st=>st==='partial'?' data-tri="1"':'';
  const tog=(node,exp)=>'<button class="rl-tree-tog" data-act="rec.menuTreeToggle" data-node="'+node+'">'+(exp?'−':'+')+'</button>';
  const spacer='<span class="rl-tree-tog rl-tree-spacer">·</span>';
  const row=(pad,head,chk,label,triS)=>'<div class="rl-tree-row" style="padding-left:'+pad+'px">'+head+'<label class="rl-tree-cl"><input type="checkbox" '+chk+tri(triS||'none')+'><span class="rl-tree-lbl">'+label+'</span></label></div>';
  let out='<div class="rl-tree-row rl-tree-all"><span class="rl-tree-tog rl-tree-spacer">·</span><label class="rl-tree-cl"><input type="checkbox" data-act="rec.menuAll"><span class="rl-tree-lbl">(모두 선택)</span></label></div>';
  Object.keys(T.years).sort((a,b)=>b.localeCompare(a)).forEach(y=>{
    const yl=Object.values(T.years[y]).flat();if(!yl.some(hit))return;
    const yExp=M.expand.has('y:'+y)||!!q,yState=recTri(yl,M.sel);
    out+=row(4,tog('y:'+y,yExp),'data-act="rec.menuTreeCheck" data-node="y:'+y+'" '+cb(yState),y+'년',yState);
    if(!yExp)return;
    Object.keys(T.years[y]).sort((a,b)=>b.localeCompare(a)).forEach(mo=>{
      const ml=T.years[y][mo];if(!ml.some(hit))return;
      const node='m:'+y+'-'+mo,mExp=M.expand.has(node)||!!q,mState=recTri(ml,M.sel);
      out+=row(22,tog(node,mExp),'data-act="rec.menuTreeCheck" data-node="'+node+'" '+cb(mState),Number(mo)+'월',mState);
      if(!mExp)return;
      ml.filter(hit).forEach(v=>{out+=row(44,spacer,'data-act="rec.menuVal" data-val="'+esc(v)+'" '+(M.sel.has(v)?'checked':''),esc(v));});
    });
  });
  T.other.forEach(v=>{if(!hit(v))return;out+=row(4,spacer,'data-act="rec.menuVal" data-val="'+esc(v)+'" '+(M.sel.has(v)?'checked':''),esc(v));});
  return out;
}
function recMenuListHTML(){
  const M=REC._menu;if(M.dateTree)return recMenuDateTreeHTML();
  const q=(M.q||'').trim().toLowerCase();
  let list=q?M.all.filter(v=>v.toLowerCase().includes(q)):M.all;
  const CAP=400,more=list.length>CAP;if(more)list=list.slice(0,CAP);
  const allc=M.sel.size===M.all.length&&M.all.length>0;
  const head='<label class="rl-menu-item rl-menu-all"><input type="checkbox" data-act="rec.menuAll" '+(allc?'checked':'')+'><span>(모두 선택)</span></label>';
  const items=list.map(v=>'<label class="rl-menu-item"><input type="checkbox" data-act="rec.menuVal" data-val="'+esc(v)+'" '+(M.sel.has(v)?'checked':'')+'><span>'+esc(v)+'</span></label>').join('');
  return head+items+(more?'<div class="rl-menu-note">상위 '+CAP+'개 표시 · 검색으로 좁히세요</div>':'');
}
function recMenuHTML(){
  const M=REC._menu,col=recCols().find(c=>c.k===M.key);
  const nh=Object.keys(REC.hidden).filter(k=>REC.hidden[k]).length;
  return '<div class="rl-menu-hd">'+esc(col?col.t:'')+' 필터</div>'
    +'<button class="rl-menu-row" data-act="rec.menuToggleRow">'+(REC.filterRow?'필터행 숨기기':'필터행 표시')+'</button>'
    +'<button class="rl-menu-row" data-act="rec.menuHideCol">이 열 숨기기</button>'
    +(nh?'<button class="rl-menu-row" data-act="rec.menuShowCols">숨긴 열 모두 표시 ('+nh+')</button>':'')
    +'<div class="rl-menu-sep"></div>'
    +'<input class="rl-menu-q" placeholder="검색" data-act="rec.menuSearch" value="'+esc(M.q||'')+'" autocomplete="off">'
    +'<div class="rl-menu-list" id="rlMenuList">'+recMenuListHTML()+'</div>'
    +'<div class="rl-menu-foot"><button class="btn bg2 bsm" data-act="rec.menuClear">필터 해제</button><button class="btn bo bsm" data-act="rec.menuApply">적용</button></div>';
}
function recMenuSyncAll(){
  const M=REC._menu;if(!M)return;
  const a=document.querySelector('#rlMenu [data-act="rec.menuAll"]');
  if(a){const allc=M.sel.size===M.all.length&&M.all.length>0;a.checked=allc;a.indeterminate=M.sel.size>0&&!allc;}
}
function recMenuRenderList(){const l=document.getElementById('rlMenuList');if(l){l.innerHTML=recMenuListHTML();l.querySelectorAll('input[data-tri]').forEach(c=>{c.indeterminate=true;});}recMenuSyncAll();}
function recOpenMenu(key,x,y){
  const cur=REC.vals[key],all=recDistinct(key);
  const dv=all.filter(v=>/^\d{4}-\d{2}-\d{2}/.test(v)),nonEmpty=all.filter(v=>v!=='(미기재)').length;
  const isDate=dv.length>1&&dv.length>=nonEmpty*0.7;
  REC._menu={key,all,sel:(cur&&Object.keys(cur).length)?new Set(Object.keys(cur)):new Set(all),q:'',dateTree:isDate?recDateTree(all):null,expand:new Set()};
  let m=document.getElementById('rlMenu');
  if(!m){m=document.createElement('div');m.id='rlMenu';m.className='rl-menu';document.body.appendChild(m);}
  m.innerHTML=recMenuHTML();m.style.display='block';
  const mw=244,mh=Math.min(400,innerHeight*0.7);
  m.style.left=Math.max(8,Math.min(x,innerWidth-mw-8))+'px';
  m.style.top=Math.max(8,Math.min(y,innerHeight-mh-8))+'px';
  const l=document.getElementById('rlMenuList');if(l)l.querySelectorAll('input[data-tri]').forEach(c=>{c.indeterminate=true;});
  recMenuSyncAll();
}
function recCloseMenu(){const m=document.getElementById('rlMenu');if(m)m.style.display='none';REC._menu=null;}
/* 필터행 타이핑 중에는 본문(tbody)만 갈아 끼운다 — recRender 전체를 돌리면 입력 포커스가 죽는다 */
function recRowsOnly(){
  const v=recCompute(),cols=recVisCols(),lim=REC.limit>0?REC.limit:v.length;
  const tb=document.querySelector('#mbody .rec-tbl tbody');
  if(!tb){recRender();return;}
  tb.innerHTML=v.slice(0,lim).map((r,i)=>'<tr><td>'+(i+1)+'</td>'
    +cols.map(c=>'<td'+(c.wide?' class="wide"':'')+'>'+esc(r[c.k]==null?'':String(r[c.k]))+'</td>').join('')+'</tr>').join('')
    ||'<tr><td colspan="'+(cols.length+1)+'" class="rec-none-td">조건에 맞는 건이 없습니다.</td></tr>';
  recHeadSync(v.length,REC.rows.length);
}
function recRender(){
  const t=$('#mt');if(t&&!$('#recQ'))t.innerHTML=recHeadHTML();
  const b=$('#mbody');if(b&&paintHTML(b,recBodyHTML()))ovsRefresh();   /* 453차: 같은 내용이면 다시 그리지 않는다 */
  recHeadSync(REC.view.length,REC.rows.length);
}
/* 표 복사 — 화면에 보이는 열·행을 탭 구분 텍스트로 클립보드에 */
function recCopy(){
  const v=recCompute(),cols=recVisCols();
  const lim=REC.limit>0?REC.limit:v.length;
  const tsv=[['No'].concat(cols.map(c=>c.t)).join('\t')]
    .concat(v.slice(0,lim).map((r,i)=>[i+1].concat(cols.map(c=>String(r[c.k]==null?'':r[c.k]).replace(/[\t\n]/g,' '))).join('\t'))).join('\n');
  const done=()=>toast('표를 복사했습니다 · '+Math.min(v.length,lim).toLocaleString()+'행');
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(tsv).then(done,()=>toast('복사하지 못했습니다'));
  else{const ta=document.createElement('textarea');ta.value=tsv;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done();}catch(e){toast('복사하지 못했습니다');}ta.remove();}
}
/* 열 경계 끌기 — 누른 뒤 움직인 만큼 그 열의 너비를 바꾼다(모달이 열려 있는 동안만) */
document.addEventListener('mousedown',e=>{
  const h=e.target.closest&&e.target.closest('.rec-tbl .rz');if(!h)return;
  e.preventDefault();e.stopPropagation();
  const th=h.closest('th'),k=h.dataset.k,x0=e.clientX,w0=th.getBoundingClientRect().width;
  const mv=ev=>{const w=Math.max(50,Math.round(w0+(ev.clientX-x0)));REC.w[k]=w;th.style.width=w+'px';};
  const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);};
  document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up);
});
async function recOpen(sid,scope,opts){
  opts=opts||{};
  const site=sid?(S.org.sites||[]).find(x=>x.id===sid):null;
  const all=!sid;
  const scopeLbl=scope==='lul'?'장기미처리':'미처리';
  const filtLbl=opts.trade?' · '+opts.trade:opts.co?' · '+opts.co:'';
  openModal('',  '<div class="rec-none">불러오는 중…</div>');
  const mb=$('#mb');if(mb)mb.classList.add('dfwide');
  REC.title=(site?site.name:'팀 전체')+' · '+scopeLbl+filtLbl;
  const mt0=$('#mt');if(mt0)mt0.innerHTML=recHeadHTML();
  let rows;
  if(all){
    /* ⚠ 전 현장 목록은 현장 수만큼 통신한다 — 진행 상황을 알리고 차례로 받는다.
       범위는 대시보드 집계와 동일(인수 전 현장 제외) — KPI 건수와 목록 건수가 맞아야 한다. */
    const list=dfDashSites();
    rows=[];
    for(let i=0;i<list.length;i++){
      const b=$('#mbody');
      if(b)b.innerHTML='<div class="rec-none">현장 자료를 불러오는 중… ('+(i+1)+'/'+list.length+')</div>';
      const one=await dfList(list[i].id);
      one.forEach(r=>rows.push({...r,siteName:list[i].name}));
    }
  }else rows=await dfList(sid);
  if(scope==='lul')rows=rows.filter(r=>(Number(r.delayDays)||0)>=30);
  if(opts.trade)rows=rows.filter(r=>String(r.trade||'')===opts.trade);
  if(opts.co)rows=rows.filter(r=>String(r.contractor||'')===opts.co);
  /* 기본 정렬은 접수일 최신순 — 팀 전체는 현장별로 받아 오므로 그대로 두면 현장 순으로 묶인다 */
  rows.sort((a,b)=>String(b.receiptDate||'').localeCompare(String(a.receiptDate||'')));
  REC.rows=rows;REC.q='';REC.band='';REC.sort='';REC.desc=false;REC.limit=500;
  REC.vac=opts.vac==='unit'||opts.vac==='store'?opts.vac:'';
  REC.withSite=all;REC.vals={};REC.hidden={};REC.filterRow=false;REC.filters={};
  REC.title=((site&&site.name)||'팀 전체')+' · '+scopeLbl+filtLbl;   /* 머리·엑셀 파일명 공용 */
  REC.scope=scope;
  /* 피벗 기본 조합 — 원본과 동일: 팀 전체는 현장×공종, 한 현장은 시공업체›공종 */
  PIV.on=false;PIV.pct=false;PIV.val='count';PIV.sort={key:'__total',dir:-1};
  PIV.rows=all?['siteName']:['contractor','trade'];PIV.col=all?'trade':null;
  recRender();
}
/* 피벗 — 원본과 같은 구성: 행(최대 3개, 계층)·열 1개·값(건수/평균 지연일)·% 병기·정렬·합계.
   원본과의 차이는 칩 드래그 재정렬과 우클릭 드릴다운뿐(제거 후 다시 추가로 순서를 바꾼다). */
const PIVOT_FIELDS=[
  {key:'siteName',label:'현장'},
  {key:'__month',label:'접수월'},
  {key:'trade',label:'공종'},
  {key:'defectClass',label:'하자구분'},
  {key:'space',label:'공간'},
  {key:'defectType',label:'하자유형'},
  {key:'repairParty',label:'보수주체'},
  {key:'contractor',label:'시공업체'},
  {key:'repairContractor',label:'보수업체'}
];
const PIV={on:false,rows:['trade'],col:'defectClass',val:'count',pct:false,sort:{key:'__total',dir:-1}};
function pivFieldLabel(k){const f=PIVOT_FIELDS.find(x=>x.key===k);return f?f.label:String(k||'');}
function pivCell(r,k){return k==='__month'?String(r.receiptDate||'').slice(0,7):String(r[k]==null?'':r[k]);}
function pivData(){
  const rows=recCompute(),rks=PIV.rows,ck=PIV.col,cset=new Set();
  const root={value:'전체',children:{},cells:{},cellsS:{},total:0,totalS:0,depth:-1};
  for(const r of rows){
    const cv=ck?(pivCell(r,ck)||'(빈값)'):'__all';
    const dd=Number(r.delayDays)||0;
    cset.add(cv);
    root.total++;root.cells[cv]=(root.cells[cv]||0)+1;root.totalS+=dd;root.cellsS[cv]=(root.cellsS[cv]||0)+dd;
    let cur=root;
    for(const k of rks){
      const v=pivCell(r,k)||'(빈값)';
      let ch=cur.children[v];if(!ch)ch=cur.children[v]={value:v,children:{},cells:{},cellsS:{},total:0,totalS:0,depth:cur.depth+1};
      ch.total++;ch.cells[cv]=(ch.cells[cv]||0)+1;ch.totalS+=dd;ch.cellsS[cv]=(ch.cellsS[cv]||0)+dd;cur=ch;
    }
  }
  const val=PIV.val||'count';
  /* 열 정렬 — 값이 큰 열이 앞으로. 접수월만 시간순 유지(원본 규칙) */
  const colsA=ck?[...cset].sort((a,b)=>{
    if(ck==='__month')return String(a).localeCompare(String(b),'ko');
    const ca=root.cells[a]||0,cb=root.cells[b]||0;
    const va=val==='avgDelay'?(ca?(root.cellsS[a]||0)/ca:0):ca;
    const vb=val==='avgDelay'?(cb?(root.cellsS[b]||0)/cb:0):cb;
    return (vb-va)||String(a).localeCompare(String(b),'ko');
  }):['__all'];
  const colTot={},colTotS={};
  colsA.forEach(cv=>{colTot[cv]=root.cells[cv]||0;colTotS[cv]=root.cellsS[cv]||0;});
  return{root,colsA,colTot,colTotS,grand:root.total,grandS:root.totalS,hasCol:!!ck,rks,maxD:rks.length,val,
    sort:Object.assign({},PIV.sort||{key:'__total',dir:-1},{vm:val})};
}
function pivSortNodes(nodes,sort){
  const k=sort.key,dir=sort.dir,vm=sort.vm;
  const val=n=>{const cc=k.slice(0,2)==='c:'?(n.cells[k.slice(2)]||0):n.total;
    if(vm!=='avgDelay')return cc;
    const ss=k.slice(0,2)==='c:'?((n.cellsS||{})[k.slice(2)]||0):(n.totalS||0);
    return cc?ss/cc:0;};
  return nodes.slice().sort((a,b)=>{
    if(k==='__label')return String(a.value).localeCompare(String(b.value),'ko')*dir;
    return (val(a)-val(b))*dir||String(a.value).localeCompare(String(b.value),'ko');});
}
function pivTableHTML(){
  const D=pivData();
  if(!D.grand)return '<div class="pv-empty">표시할 데이터가 없습니다</div>';
  const cd=cv=>cv==='(빈값)'?'(빈값)':esc(cv);
  const arr=k=>D.sort.key===k?(D.sort.dir>0?' ▲':' ▼'):'';
  const dsp=(c,sm)=>{
    if(D.val==='avgDelay')return c?Math.round(sm/c).toLocaleString():'·';
    if(!c)return '·';
    if(!PIV.pct)return c.toLocaleString();
    const pct=D.grand?c/D.grand*100:0;
    return c.toLocaleString()+'<span class="pv-pct">'+(pct>=9.95?pct.toFixed(0):pct.toFixed(1))+'%</span>';};
  const lblHead=D.rks.length?D.rks.map(pivFieldLabel).join(' › '):'전체';
  let h='<thead><tr><th class="pv-rh" data-act="rec.pvSort" data-pk="__label">'+esc(lblHead)+arr('__label')+'</th>';
  if(D.hasCol)D.colsA.forEach(cv=>h+='<th data-act="rec.pvSort" data-pk="c:'+esc(cv)+'">'+cd(cv)+arr('c:'+cv)+'</th>');
  h+='<th class="pv-tot" data-act="rec.pvSort" data-pk="__total">'+(D.val==='avgDelay'?'전체 평균':'합계')+arr('__total')+'</th></tr></thead>';
  let b='<tbody>';
  const emit=(node,path)=>{
    const isLeaf=node.depth>=D.maxD-1||!Object.keys(node.children).length;
    const ind=8+node.depth*16;
    const rp=path.concat([node.value]);   /* 우클릭 드릴다운용 행경로 — PIV.rows 각 차원의 값 */
    b+='<tr class="pv-row'+(isLeaf?'':' pv-grp')+'" data-rp="'+esc(JSON.stringify(rp))+'"><td class="pv-rh" style="padding-left:'+ind+'px">'+cd(node.value)+'</td>';
    if(D.hasCol)D.colsA.forEach(cv=>{b+='<td data-cv="'+esc(cv)+'">'+dsp(node.cells[cv]||0,(node.cellsS||{})[cv]||0)+'</td>';});
    b+='<td class="pv-tot">'+dsp(node.total,node.totalS||0)+'</td></tr>';
    if(!isLeaf)pivSortNodes(Object.values(node.children),D.sort).forEach(ch=>emit(ch,rp));
  };
  const top=pivSortNodes(Object.values(D.root.children),D.sort);
  if(!top.length){b+='<tr class="pv-row"><td class="pv-rh" style="padding-left:8px">전체</td>';
    if(D.hasCol)D.colsA.forEach(cv=>{b+='<td>'+dsp(D.root.cells[cv]||0,D.root.cellsS[cv]||0)+'</td>';});
    b+='<td class="pv-tot">'+dsp(D.grand,D.grandS)+'</td></tr>';}
  top.forEach(n=>emit(n,[]));
  b+='<tr class="pv-totrow"><td class="pv-rh">'+(D.val==='avgDelay'?'전체 평균':'합계')+'</td>';
  if(D.hasCol)D.colsA.forEach(cv=>b+='<td>'+dsp(D.colTot[cv]||0,D.colTotS[cv]||0)+'</td>');
  b+='<td class="pv-tot">'+dsp(D.grand,D.grandS)+'</td></tr></tbody>';
  return '<table class="pv-table">'+h+b+'</table>';
}
function pivHTML(){
  /* 행 칩은 드래그로 순서를 바꾼다(원본 pv-drag) — 클릭은 제거, 끌면 재정렬 */
  const drag=PIV.rows.length>1;   /* 하나뿐이면 끌 이유가 없다(원본과 동일) */
  const chip=(k,zone,i)=>'<span class="pv-chip'+(zone==='rows'&&drag?' pv-drag" draggable="true':'')+'" data-key="'+esc(k)+'" data-zone="'+zone+'" data-i="'+i+'">'+esc(pivFieldLabel(k))
    +'<button class="pv-chip-x" data-act="rec.pvRm" data-zone="'+zone+'" data-i="'+i+'" aria-label="제거">×</button></span>';
  const add=zone=>'<button class="pv-add" data-act="rec.pvAdd" data-zone="'+zone+'" aria-label="필드 추가">+</button>';
  const rowsZ=PIV.rows.map((k,i)=>chip(k,'rows',i)).join('')+(PIV.rows.length<3?add('rows'):'');
  const colZ=PIV.col?chip(PIV.col,'col',0):add('col');
  return '<div class="pv-bar">'
    +'<div class="pv-zone"><span class="pv-zlbl">행</span>'+rowsZ+'</div>'
    +'<div class="pv-zone"><span class="pv-zlbl">열</span>'+colZ+'</div>'
    +'<div class="pv-zone"><span class="pv-zlbl">값</span><button class="pv-chip pv-val" data-act="rec.pvVal">'+(PIV.val==='avgDelay'?'평균 지연일':'건수')+' <span class="pv-caret">▾</span></button></div>'
    +(PIV.val==='count'?'<div class="pv-zone" style="margin-left:auto"><button class="pv-chip pv-pct-tg'+(PIV.pct?' on':'')+'" data-act="rec.pvPct" data-tip="비중(%) 함께 표시" aria-pressed="'+(PIV.pct?'true':'false')+'">%</button></div>':'')
    +'</div><div class="pv-scroll" id="pvBody">'+pivTableHTML()+'</div>';
  ovsRefresh();   /* 445차: 오버레이 가로 스크롤바 부착 */
}
/* FLIP: 재배치 전후 위치 차이를 transform 으로 보간해 부드럽게 슬라이드(드래그 중인 칩 제외) */
function pvFlip(zone,mutate){
  const chips=[...zone.querySelectorAll('.pv-chip')].filter(c=>!c.classList.contains('pv-dragging'));
  const pos=new Map(chips.map(c=>[c,c.getBoundingClientRect().left]));
  mutate();
  chips.forEach(c=>{const o=pos.get(c);if(o==null)return;
    const dl=o-c.getBoundingClientRect().left;
    if(dl){c.style.transition='none';c.style.transform='translateX('+dl+'px)';
      requestAnimationFrame(()=>{c.style.transition='';c.style.transform='';});}});
}
/* 행 칩의 DOM 순서를 PIV.rows 에 반영하고 표만 다시 그린다 */
function pvCommitOrder(){
  const keys=[...document.querySelectorAll('.pv-bar .pv-chip[data-zone="rows"]')].map(c=>c.dataset.key).filter(Boolean);
  if(keys.length===PIV.rows.length&&JSON.stringify(keys)!==JSON.stringify(PIV.rows)){
    PIV.rows=keys;recRender();return true;}
  return false;
}
let pvDragged=null,pvDragMoved=false;
document.addEventListener('dragstart',e=>{
  const c=e.target&&e.target.closest?e.target.closest('.pv-chip.pv-drag[data-zone="rows"]'):null;
  if(!c)return;pvDragged=c;pvDragMoved=false;
  try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','');}catch(_){}
  setTimeout(()=>{if(pvDragged)pvDragged.classList.add('pv-dragging');},0);
});
document.addEventListener('dragover',e=>{
  if(!pvDragged)return;
  const zone=e.target.closest&&e.target.closest('.pv-zone');
  if(!zone||!zone.contains(pvDragged))return;
  e.preventDefault();try{e.dataTransfer.dropEffect='move';}catch(_){}
  const over=e.target.closest?e.target.closest('.pv-chip.pv-drag[data-zone="rows"]'):null;
  if(!over||over===pvDragged)return;
  const r=over.getBoundingClientRect(),after=e.clientX>r.left+r.width/2;
  if(after&&over.nextElementSibling===pvDragged)return;
  if(!after&&over.previousElementSibling===pvDragged)return;
  pvDragMoved=true;
  pvFlip(zone,()=>{after?over.after(pvDragged):over.before(pvDragged);});
});
document.addEventListener('drop',e=>{if(!pvDragged)return;e.preventDefault();
  const d=pvDragged;pvDragged=null;d.classList.remove('pv-dragging');pvCommitOrder();});
document.addEventListener('dragend',()=>{
  if(pvDragged){pvDragged.classList.remove('pv-dragging');pvDragged=null;pvCommitOrder();}});
/* 피벗 엑셀 — 원본 recPivotExport 와 같은 구조(행 들여쓰기·합계 행) */
function pivExport(){
  const D=pivData();
  if(!D.grand){toast('내보낼 데이터가 없습니다');return;}
  const cd=cv=>cv==='(빈값)'?'(빈값)':cv;
  const nv=(c,sm)=>D.val==='avgDelay'?(c?Math.round(sm/c):0):c;
  const head=[D.rks.length?D.rks.map(pivFieldLabel).join(' › '):'전체'];
  if(D.hasCol)D.colsA.forEach(cv=>head.push(cd(cv)));
  head.push(D.val==='avgDelay'?'전체 평균':'합계');
  const aoa=[head];
  const walk=node=>{
    const isLeaf=node.depth>=D.maxD-1||!Object.keys(node.children).length;
    const row=['  '.repeat(Math.max(0,node.depth))+cd(node.value)];
    if(D.hasCol)D.colsA.forEach(cv=>row.push(nv(node.cells[cv]||0,(node.cellsS||{})[cv]||0)));
    row.push(nv(node.total,node.totalS||0));aoa.push(row);
    if(!isLeaf)pivSortNodes(Object.values(node.children),D.sort).forEach(walk);
  };
  const top=pivSortNodes(Object.values(D.root.children),D.sort);
  if(!top.length){const row=['전체'];if(D.hasCol)D.colsA.forEach(cv=>row.push(nv(D.root.cells[cv]||0,D.root.cellsS[cv]||0)));row.push(nv(D.grand,D.grandS));aoa.push(row);}
  top.forEach(walk);
  const tr=[D.val==='avgDelay'?'전체 평균':'합계'];
  if(D.hasCol)D.colsA.forEach(cv=>tr.push(nv(D.colTot[cv]||0,D.colTotS[cv]||0)));
  tr.push(nv(D.grand,D.grandS));aoa.push(tr);
  recWriteXlsx('피벗_'+(REC.title||'').replace(/\s+/g,'')+'_'+(S.dfRm||'')+'.xlsx',aoa,'피벗');
}
/* 엑셀 — 하자처리 현황과 같은 열 순서로 내보낸다.
   ⚠ 605차: `xlsx.full.min.js` 는 930KB 인데 첫 화면에서 늘 받아지고 있었다(전체 첫 로드의 3분의 1).
   실제로 쓰는 곳은 이 함수 하나뿐이라 **누를 때 받는다**. 실패해도 화면은 그대로 두고 알림만 띄운다. */
let _xlsxPromise=null;
function loadXlsx(){
  if(typeof XLSX!=='undefined')return Promise.resolve(true);
  if(_xlsxPromise)return _xlsxPromise;
  _xlsxPromise=new Promise((res,rej)=>{
    const el=document.createElement('script');el.src='./vendor/xlsx.full.min.js?v='+APP_VER;
    el.onload=()=>res(true);el.onerror=()=>rej(new Error('xlsx'));
    document.head.appendChild(el);
  }).catch(e=>{_xlsxPromise=null;throw e;});
  return _xlsxPromise;
}
async function recWriteXlsx(filename,aoa,sheet){
  try{await loadXlsx();}
  catch(e){console.warn('loadXlsx',e);toast('엑셀 모듈을 불러오지 못했습니다');return;}
  try{
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(aoa),(sheet||'Sheet1').slice(0,31));
    XLSX.writeFile(wb,filename);
    toast('엑셀로 내보냈습니다');
  }catch(e){console.error('recWriteXlsx',e);toast('내보내기 실패');}
}
function recXlsx(){
  if(PIV.on){pivExport();return;}   /* 피벗을 보고 있으면 피벗 표를 내보낸다 — 원본과 동일 */
  const v=recCompute();
  const aoa=[['No'].concat(recCols().map(c=>c.t))]
    .concat(v.map((r,i)=>[i+1].concat(recCols().map(c=>r[c.k]==null?'':r[c.k]))));
  /* 파일명·시트명은 원본(rec.export)과 동일: 미처리목록_{제목}_{기준월}.xlsx · 시트 '미처리' */
  recWriteXlsx('미처리목록_'+(REC.title||'').replace(/\s+/g,'')+'_'+(S.dfRm||'')+'.xlsx',aoa,'미처리');
}
/* 사이드바 — 하자 관리 아래에 권역(소분류)과 그 권역의 현장을 편다.
   ⚠ 지금은 조직 관리의 현장 목록을 쓴다. 게시본을 읽기 시작하면 게시된 현장 목록과 합쳐야 한다. */
function rDefectNav(){
  const box=$('#dfNav');if(!box)return;
  const{team,regions}=tkSel();
  const sites=dfSites();   /* dfHide(현장 관리 토글)는 dfSites 가 걸러 준다 — 대시보드와 같은 목록 */
  const groups=[];
  regions.forEach(r=>{const l=sites.filter(x=>x.region===r.id);if(l.length)groups.push([r.id,r.name,l]);});
  const none=sites.filter(x=>!x.region||!regions.some(r=>r.id===x.region));
  if(none.length)groups.push(['','권역 미지정',none]);
  box.innerHTML=groups.map(([rid,rn,list])=>{
    /* 기본은 접힘 — 열어 둔 현장이 속한 권역만 자동으로 편다. 사용자가 누르면 그 선택이 우선 */
    /* 824차: 저장값이 여러 권역을 펼치고 있어도(예전 방식) 한 곳만 살린다 — 보고 있는 현장이 있으면 그 권역 우선 */
    const cur=S.view==='defect'&&!!S.dfSid&&list.some(x=>x.id===S.dfSid);
    const openKeys=Object.keys(S.dfFold||{}).filter(k=>S.dfFold[k]===false);
    const open=cur||(S.dfFold[rid]===false&&(openKeys.length<2||openKeys[0]===rid));
    return '<button class="df-reg'+(open?' open':'')+'" data-act="df.fold" data-rid="'+esc(rid)+'"'
      +' aria-expanded="'+(open?'true':'false')+'">'
      +'<svg class="icn" aria-hidden="true"><use href="#i-chevr"></use></svg>'
      +'<span class="n">'+esc(rn)+'</span></button>'
      /* 774·775차: 접힌 권역의 현장은 .df-hid 로 렌더(두 상태 모두 숨김 — mini 는 펼침과 같은 줄을 보여 준다) */
      +list.map(x=>'<div class="nvi df-site'+(open?'':' df-hid')+(S.view==='defect'&&S.dfSid===x.id?' act':'')+'" role="button" tabindex="0"'
        +' data-act="df.site" data-sid="'+esc(x.id)+'" data-tip="'+esc(x.name)+'">'
        +'<span class="dot"></span><span class="nil">'+esc(x.name)+'</span></div>').join('');
  }).join('');
}
/* Ctrl+P 머리(팀명·제목·기준일) — 원본 updatePrintHeader(app-boot.js 359) 이식.
   전용 인쇄 버튼과 무관하게 브라우저 인쇄에서도 머리가 나오도록 beforeprint 에서 채운다. */
function dfUpdatePrintHdr(){
  const tm=(typeof tkSel==='function'?tkSel().team:null);
  const a=$('#dfPhTeam');if(a)a.textContent=(tm&&tm.name?tm.name:'H서비스센터')+' 하자처리 현황';
  const site=S.dfSid?(S.org.sites||[]).find(x=>x.id===S.dfSid):null;
  const t=$('#dfPhTitle');if(t)t.textContent=site?`${site.region||''} · ${site.name}`.replace(/^ · /,''):'전체 현황 대시보드';
  const d=$('#dfPhDate');if(d){const ym=dfRm()||new Date().toISOString().slice(0,7);
    const[y,m]=ym.split('-'),last=new Date(Number(y),Number(m),0).getDate();
    d.textContent=`${y}.${m}.${String(last).padStart(2,'0')}`;}
}
window.addEventListener('beforeprint',()=>{
  dfUpdatePrintHdr();
  /* Ctrl+P 는 인쇄 미디어로 넘어가며 차트 카드가 줄어든다(.cw 140px) — 리사이즈 애니메이션 중간에
     찍히면 추이가 빈 채로 나온다(223차와 같은 원리). 즉시 완성 상태로 다시 그린다. */
  if(S.view==='defect'&&!document.body.classList.contains('df-printing')){
    DF.noAnim=true;
    try{Object.values(DF.ch||{}).forEach(c=>{if(c&&c.resize){c.resize();c.update('none');}});}catch(e){}
  }
});
window.addEventListener('afterprint',()=>{
  if(DF.noAnim&&!document.body.classList.contains('df-printing')){
    DF.noAnim=true;   /* 상시 해제(351차) — 예전에는 여기서 애니메이션을 되살렸다 */
    try{Object.values(DF.ch||{}).forEach(c=>{if(c&&c.resize){c.resize();c.update('none');}});}catch(e){}
  }
});
/* 기준월은 하자 관리에서만, 인쇄는 하자 관리·주요 업무에서만 상단바에 나온다 */
function dfTopbar(){
  const on=S.view==='defect';
  const rm=$('#tbRm'),pw=$('#tbPrintWrap');
  if(rm){rm.hidden=!on;rm.textContent=S.dfRm||'기준월 없음';}
  /* 688차: 이 PC 원본이 게시본보다 새것일 때만 — 현장 화면은 그 현장, 대시보드는 변경 현장 수 */
  const lc=$('#tbLoc');
  if(lc){let t='';
    if(on){if(S.dfSid){if(dfLocalDirty(S.dfSid))t='이 PC 원본 · 미게시 변경';}
           else{const n=dfLocalDirtySites().length;if(n)t='이 PC 원본 · 미게시 변경 '+n+'개 현장';}}
    lc.hidden=!t;lc.textContent=t;lc.dataset.s=t?'미게시':'';}   /* data-s: 좁은 화면(≤900)은 CSS 가 이 짧은 글자만 보인다 */
  if(pw){pw.hidden=!(on||S.view==='photo'||S.view==='dwg');   /* 인쇄 버튼 — 하자처리 현황 · 사진대지(798차) · 도면 인쇄(815차) */
    /* 801차: 왼쪽에 보이는 것이 있을 때만 구분선 */
    let prev=false;for(let e=pw.previousElementSibling;e;e=e.previousElementSibling)if(!e.hidden&&e.offsetParent!==null){prev=true;break;}
    pw.classList.toggle('sep',prev);}
}

/* ═══════════ 보류함 — 일자 패널 아래. 달력 날짜로 끌어다 놓으면 그 날짜로 되살아난다 ═══════════ */
/* 보류함이 달력 옆에서 지나치게 길어지지 않게 — 날짜칸 두 개 높이를 넘기지 않는다(389차).
   달력 칸 높이는 창 크기·주 수에 따라 달라지므로 값을 박지 않고 그때그때 잰다.
   ⚠ 위젯도 같은 달력을 쓰므로 함께 적용된다 */
function rHold(){
  const card=$('#holdCard'),box=$('#holdList'),ttl=$('#holdTtl'),mn=$('#holdMine');
  if(!card||!box)return;
  const list=S.holdMine?mineHolds():holdItems();
  /* '내 업무만' 을 켜 둔 채 내 보류가 없으면 카드가 사라져 다시 끌 수 없다 — 팀에 보류가 있으면 카드는 남긴다 */
  const any=list.length||(S.holdMine&&holdItems().length);
  card.hidden=!any;
  if(mn)mn.classList.toggle('on',!!S.holdMine);
  if(ttl)ttl.textContent='보류한 업무 '+list.length+'건';
  holdFit();
  if(!any){box.innerHTML='';return;}
  if(!list.length){paintReset(box);box.innerHTML='<div class="hold-empty">내 보류 업무가 없습니다.</div>';return;}
  const md=x=>{if(!x)return '기한 없음';const t=toDate(x);return (t.getMonth()+1)+'/'+t.getDate();};
  paintHTML(box,list.map(({sid,iid,it})=>
    '<div class="hold-i" draggable="true" data-act="hold.go" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'"'
    +' data-tip="누르면 업무로 이동 · 달력 날짜로 끌어 놓으면 그 날짜로">'
    +(x=>colDotHTML(planColor(x),'ro',!planOwners(x).length))(taskAsPlan(sid,iid,it))
    +'<span class="t">'+esc(it.text||'제목 없음')+'</span>'
    +'<span class="d">'+esc(md(it.date))+'</span></div>').join(''));
}
/* 보류함 높이 — 옆 달력의 **날짜칸 두 개**를 넘지 않게 최대 높이만 준다(389차 지시).
   ⚠ 예전에는 height 로 못박아 보류가 2~3건뿐이어도 열 바닥까지 빈 칸이 남았다(실사용 지적).
   max-height 로 두면 적을 땐 내용만큼만 차지하고, 많을 땐 그 안에서 스크롤한다.
   ⚠ 칸 높이는 창 크기·주 수(5·6주)에 따라 달라지므로 값을 박지 않고 그때그때 잰다 */
function holdFit(){
  const card=$('#holdCard');if(!card)return;
  const rows=$$('#fcal .fc-daygrid-body tr');
  const clear=()=>{card.style.height='';card.style.maxHeight='';};
  if(WIDGET||card.hidden||window.innerWidth<=960||rows.length<4){clear();return;}
  const td=rows[0].querySelector('td');if(!td){clear();return;}
  const h=Math.round(td.getBoundingClientRect().height*2);
  card.style.height='';
  card.style.maxHeight=(h>120?h:120)+'px';
}
/* 끌어 놓기 — 달력 날짜 칸에 떨어뜨리면 날짜를 그날로 바꾸고 보류를 푼다 */
let HOLD_DRAG=null;
function holdDrop(ds){
  if(!HOLD_DRAG||!ds)return;
  const{sid,iid}=HOLD_DRAG;HOLD_DRAG=null;
  const cur=(S.tasks[sid]||{})[iid];if(!cur)return;
  const span=(cur.end&&cur.date)?daysBetween(cur.date,cur.end):0;
  store.putTask(sid,iid,histPush({...cur,st:1,done:false,stKeep:true,date:ds,
    end:span>0?addDays(ds,span):'',updatedAt:Date.now()},'move'));
  if(!S.live){rTasks();rDay();rWidget();}
  rHold();refetchCal();
  const t=toDate(ds);toast((t.getMonth()+1)+'월 '+t.getDate()+'일로 옮겼습니다');
}
function wireHoldDnD(){
  const box=$('#holdList');if(!box||box.dataset.wired)return;
  box.dataset.wired='1';
  box.addEventListener('dragstart',e=>{
    const row=e.target.closest&&e.target.closest('.hold-i');if(!row)return;
    HOLD_DRAG={sid:row.dataset.sid,iid:row.dataset.iid};
    row.classList.add('drag');
    try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',row.dataset.iid);}catch(_){}
  });
  box.addEventListener('dragend',()=>{HOLD_DRAG=null;
    $$('.hold-i.drag').forEach(x=>x.classList.remove('drag'));
    $$('.fc-daygrid-day.hold-over').forEach(x=>x.classList.remove('hold-over'));});
  const cal=$('#fcal');if(!cal||cal.dataset.holdWired)return;
  cal.dataset.holdWired='1';
  const cellOf=t=>(t&&t.closest)?t.closest('.fc-daygrid-day[data-date]'):null;
  cal.addEventListener('dragover',e=>{
    if(!HOLD_DRAG)return;
    const c=cellOf(e.target);if(!c)return;
    e.preventDefault();try{e.dataTransfer.dropEffect='move';}catch(_){}
    if(!c.classList.contains('hold-over')){
      $$('.fc-daygrid-day.hold-over').forEach(x=>x.classList.remove('hold-over'));
      c.classList.add('hold-over');}
  });
  cal.addEventListener('drop',e=>{
    if(!HOLD_DRAG)return;
    const c=cellOf(e.target);if(!c)return;
    e.preventDefault();
    const ds=c.dataset.date;
    $$('.fc-daygrid-day.hold-over').forEach(x=>x.classList.remove('hold-over'));
    holdDrop(ds);
  });
}

/* ═══════════ 아침 확인 — 놓친 담당자 업무를 하루 한 번 묻는다 ═══════════
   담당자 업무는 자동 완료하지 않는다(stEff). 대신 그날 처음 열 때 지난 미완료 업무를
   모달로 띄워 끝낸 것은 체크하게 하고, 체크하지 않은 것은 보류(st=3)로 넘긴다.
   보류는 목록·내 업무에 회색 − 아이콘으로 남아 언제든 완료·진행으로 되돌릴 수 있다.
   '나중에'로 닫으면 아무것도 바꾸지 않고 다음에 열 때 다시 묻는다. */
const MRV_KEY='calapp.mrv';
let MRV_ON=false;
function mrvKey(){return MRV_KEY+'.'+((S.user&&S.user.uid)||'local');}
function mrvList(){
  const me=myId(),today=todayStr(),out=[];
  if(!me)return out;
  Object.keys(S.tasks||{}).forEach(sid=>{
    const m=S.tasks[sid]||{};
    Object.keys(m).forEach(iid=>{
      const it=m[iid];if(!it)return;
      if(!(it.assignees&&Object.keys(it.assignees).some(k=>it.assignees[k])))return;   /* 팀 공통은 자동 완료 대상 */
      if(!((sid===me)||it.assignees[me]))return;                                        /* 내 업무만 */
      if(it.recur&&it.recur.f)return;                                                   /* 반복은 회차별 doneOn */
      if(stOf(it.st)!==1)return;                                                        /* 완료·이미 보류는 제외 */
      const end=it.end||it.date;
      if(!end||end>=today)return;
      out.push({sid,iid,it});
    });
  });
  return out.sort((a,b)=>String(a.it.end||a.it.date).localeCompare(String(b.it.end||b.it.date)));
}
function morningReview(){
  /* 231차: 위젯만 쓰는 사람은 이 확인을 아예 못 받았다 — 위젯에서도 띄우되 창이 좁으니
     모달에 wid 전용 클래스를 붙여 폭·글자만 줄인다(로직은 동일). */
  if($('#mo')&&$('#mo').classList.contains('open'))return;
  let last='';try{last=localStorage.getItem(mrvKey())||'';}catch(e){}
  if(last===todayStr())return;                            /* 하루 한 번 */
  const list=mrvList();
  if(!list.length){try{localStorage.setItem(mrvKey(),todayStr());}catch(e){}return;}
  const md=x=>{const t=toDate(x);return (t.getMonth()+1)+'/'+t.getDate();};
  const rows=list.map(({sid,iid,it})=>{
    const sub=[it.end&&it.end!==it.date?md(it.date)+'–'+md(it.end):md(it.date),kindLabel(it.kind),siteName(it.site)].filter(Boolean).join(' · ');
    return '<div class="mrv-i" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'">'
      +stIcon(1,' data-act="mrv.done"')
      +'<div class="mrv-b"><div class="t">'+esc(it.text||'제목 없음')+'</div>'
      +'<div class="s">'+esc(sub)+'</div></div>'
      +'<div class="mrv-act"><button class="btn bg2 bxs" data-act="mrv.today">오늘로 이동</button></div></div>';
  }).join('');
  if(WIDGET){const mb=$('#mb');if(mb)mb.classList.add('mrv-wid');}
  openModal('놓친 업무 확인',
    '<div class="mrv-h">날짜가 지난 미완료 업무 <b id="mrvN">'+list.length+'</b>건입니다.<br>'
    +'끝낸 업무는 왼쪽 아이콘, 남는 업무는 <b>보류함</b>으로 넘어갑니다.</div>'
    +'<div class="mrv-l">'+rows+'</div>');
  MRV_ON=true;                                                /* 창을 닫을 때 남은 줄을 보류로 넘긴다 */
  try{localStorage.setItem(mrvKey(),todayStr());}catch(e){}   /* 열었으면 오늘은 다시 묻지 않는다 */
}
/* 창을 닫을 때 — 손대지 않고 남은 업무는 모두 보류로 넘긴다(하나씩 누르는 수고를 덜기 위함) */
function mrvHoldRest(){
  if(!MRV_ON)return;
  MRV_ON=false;
  let n=0;
  $$('#mbody .mrv-i').forEach(row=>{
    const cur=(S.tasks[row.dataset.sid]||{})[row.dataset.iid];
    if(!cur||stOf(cur.st)!==1)return;
    if(!canEditTask(cur,row.dataset.sid))return;   /* 627차: 권한 없는 업무는 일괄 보류에서 건너뛴다 */
    store.putTask(row.dataset.sid,row.dataset.iid,histPush({...cur,st:3,done:false,updatedAt:Date.now()},'hold'));n++;
  });
  if(!n)return;
  if(!S.live){rTasks();rDay();rWidget();}
  refetchCal();
  toast(n+'건을 보류함으로 넘겼습니다');
}
/* 한 건 처리 — 저장하고 그 줄만 지운다. 다 비면 모달을 닫는다 */
function mrvApply(el,patch,msg){
  const row=el.closest('.mrv-i');if(!row)return;
  const sid=row.dataset.sid,iid=row.dataset.iid,cur=(S.tasks[sid]||{})[iid];
  if(cur)store.putTask(sid,iid,histPush({...cur,...patch,updatedAt:Date.now()},patch.st===2?'done':(patch.date?'move':'edit')));
  row.remove();
  const left=$$('#mbody .mrv-i').length;
  const n=$('#mrvN');if(n)n.textContent=left;
  if(!S.live){rTasks();rDay();rWidget();}
  refetchCal();
  if(!left){MRV_ON=false;closeModal();toast('놓친 업무를 모두 정리했습니다');}
  else if(msg)toast(msg);
}

/* ═══════════ 내 업무 — 달력·주요업무를 한 화면에 모은다 ═══════════ */
function myId(){return (S.user&&S.user.uid)||(!S.live?'me':'');}
function mineTasks(){
  const me=myId(),out=[];
  Object.keys(S.tasks||{}).forEach(sid=>{
    const m=S.tasks[sid]||{};
    Object.keys(m).forEach(iid=>{
      const it=m[iid];if(!it)return;
      const mine=(sid===me)||!!(it.assignees&&it.assignees[me]);
      if(!mine||stEff(it)===2||stEff(it)===3)return;   /* 보류는 따로 모은다(mineHolds) */
      if(!tkMatch(sid,iid,it))return;   /* 내 업무 화면의 필터·검색(업무 목록과 같은 것)을 탄다 */
      out.push({sid,iid,it});
    });
  });
  return out.sort((a,b)=>{
    const ad=a.it.date||'9999',bd=b.it.date||'9999';
    return ad<bd?-1:ad>bd?1:(a.it.createdAt||0)-(b.it.createdAt||0);});
}
/* 내 보류 업무 — 아침 확인에서 넘긴 것. `mineTasks()` 와 같은 '내 것' 기준을 쓴다 */
function mineHolds(){
  const me=myId(),out=[];
  if(!me)return out;
  Object.keys(S.tasks||{}).forEach(sid=>{
    const m=S.tasks[sid]||{};
    Object.keys(m).forEach(iid=>{
      const it=m[iid];if(!it||stOf(it.st)!==3)return;
      if(!((sid===me)||(it.assignees&&it.assignees[me])))return;
      out.push({sid,iid,it});
    });
  });
  return out.sort((a,b)=>String(taskDate(a.sid,a.iid,a.it)||'9999').localeCompare(String(taskDate(b.sid,b.iid,b.it)||'9999')));   /* 반복은 회차 기준 */
}
/* 팀 공통 업무 — 담당자 없이 팀에 붙은(sid 가 팀 id) 미완료 업무 */
function teamTasks(){
  const t=curTeam();if(!t)return[];
  const m=S.tasks[t.id]||{};
  /* ⚠ 공통 = **담당자가 없는 업무**. 예전엔 "팀 가방(sid)에 들어 있으면 공통"으로 봤는데,
     업무 목록 화면에서 담당자를 지정해 만든 업무도 팀 가방에 남기 때문에
     같은 업무가 여기(공통)와 아래(미완료 = assignees 기준)에 **두 번** 나왔다.
     달력 막대의 공통 판정(속 빈 막대)도 assignees 기준이라 이제 셋이 같은 규칙을 쓴다. */
  return Object.keys(m).map(iid=>({sid:t.id,iid,it:m[iid]}))
    .filter(x=>x.it&&!Object.keys(x.it.assignees||{}).length&&stEff(x.it)!==2&&tkMatch(x.sid,x.iid,x.it))
    .sort((a,b)=>{const ad=a.it.date||'9999',bd=b.it.date||'9999';
      return ad<bd?-1:ad>bd?1:(a.it.createdAt||0)-(b.it.createdAt||0);});
}
/* 내 업무 화면의 작은 달력 — 업무가 있는 날 아래에 점을 찍는다.
   ⚠ 달력 화면(FullCalendar)과 달리 직접 그린다(칸이 작아 막대를 넣을 자리가 없다) */
/* 날짜별 점 — 업무 목록과 같은 필터(S.tkF)를 탄 모든 업무. 색은 그 업무의 지정색을 그대로 쓴다 */
function miniDots(y,m){
  const first=y+'-'+pad(m+1)+'-01',last=y+'-'+pad(m+1)+'-'+pad(new Date(y,m+1,0).getDate());
  archNeed(first);   /* 옛 달을 넘겨 보면 아카이브 점도 찍는다(384차) */
  const map={};
  const add=(d,c,done)=>{(map[d]=map[d]||[]).push({c,done});};
  allTasks().forEach(({sid,iid,it})=>{
    if(!it.date)return;
    /* 완료도 점으로 남긴다 — 목록에서 빠진 뒤에도 그 날 무엇을 했는지 달력에는 보이게(흐린 점) */
    const done=stEff(it)===2;
    if(!tkMatch(sid,iid,it))return;
    const p=taskAsPlan(sid,iid,it),col=colBg(planColor(p));   /* 687차: 그라디언트·무지개는 colBg 를 거쳐야 점에 칠해진다 */
    if(it.recur&&it.recur.f){recurDates(p,first,last).forEach(d=>add(d,col,done));return;}
    const end=it.end||it.date;
    for(let d=(it.date<first?first:it.date);d<=(end>last?last:end);d=addDays(d,1))add(d,col,done);
  });
  /* 미완료를 앞에 둔다 — 한 칸에 점 3개만 보이므로 진행 중인 것이 먼저 보여야 한다 */
  Object.keys(map).forEach(d=>{map[d].sort((a,b)=>(a.done?1:0)-(b.done?1:0));});
  return map;
}
/* 643차: 미니달력 제목의 '지금' 판정.
   ⚠ 달 비교로는 안 된다 — 주간은 예정 주가 보이는 달을 따라가므로(mine.mon 참고) 이번 주로 돌아와도
   달이 다음 달일 수 있다. 되돌리기 동작이 비우는 값(주간 tkWeek·월간 mineYm)을 그대로 본다. */
function miniIsNow(){
  return S.tkView==='month'?!S.mineYm:!S.tkWeek;
}
function miniCalHTML(){
  /* 654차: 주간 업무는 '예정 주가 있는 달'을 보여 준다(mine.mon 과 같은 규칙).
     ⚠ 예전엔 첫 진입만 오늘의 달을 써서 라벨이 '8월 1주차'(9월 1주차인데 8월)로 어긋났다. */
  const{nxt:_nx}=tkWeekCycles();
  const base=S.mineYm||(S.tkView!=='month'?_nx.start.slice(0,7)+'-01':todayStr().slice(0,7)+'-01');
  const y=Number(base.slice(0,4)),m=Number(base.slice(5,7))-1;
  const first=new Date(y,m,1),days=new Date(y,m+1,0).getDate(),lead=first.getDay();
  const dots=miniDots(y,m),today=todayStr();
  const prevDays=new Date(y,m,0).getDate();
  const{cur,nxt}=tkWeekCycles();   /* 완료 주(회색)·예정 주(파랑) 음영 — 주간 업무에서만 */
  const bands=S.tkView!=='month';
  /* 음영은 칸마다 끊지 않고 한 줄로 이어 보이게 한다 — 띠의 시작·끝 칸에만 모서리를 준다(320차).
     ⚠ 주기는 목~수라 달력 줄(일~토)을 가로지른다 — 줄이 바뀌는 자리(일·토)도 끝으로 본다 */
  const wk=(ds,dw)=>{
    if(!bands)return '';
    const c=(ds>=cur.start&&ds<=cur.end)?'wk-done':(ds>=nxt.start&&ds<=nxt.end)?'wk-plan':'';
    if(!c)return '';
    const st=(c==='wk-done')?cur.start:nxt.start,en=(c==='wk-done')?cur.end:nxt.end;
    return ' '+c+(ds===st||dw===0?' wk-a':'')+(ds===en||dw===6?' wk-z':'');
  };
  let cells='';
  for(let i=0;i<lead;i++)cells+='<div class="mc-d out"><span class="n">'+(prevDays-lead+1+i)+'</span></div>';
  for(let d=1;d<=days;d++){
    const ds=y+'-'+pad(m+1)+'-'+pad(d),dw=(lead+d-1)%7;
    const ho=holOf(ds);   /* 공휴일·지정휴무일은 일요일과 같은 빨강 */
    cells+='<button class="mc-d'+wk(ds,dw)+(ds===today?' today':'')+(ds===S.mineSel?' sel':'')
      +((dw===0||(ho&&ho.h))?' sun':'')+(dw===6?' sat':'')+'" data-act="mine.day" data-date="'+ds+'"'
      +(ho?' data-tip="'+esc(ho.n)+'"':'')+'>'
      +'<span class="n">'+d+'</span>'
      +(dots[ds]&&dots[ds].length
        ?'<span class="dots">'+dots[ds].slice(0,3).map(o=>'<i class="'+(o.done?'dn':'')+'" style="background:'+esc(o.c)+'"></i>').join('')+'</span>'
        :'')+'</button>';
  }
  /* 달마다 주 수가 달라 옆 패널 높이가 흔들리지 않도록 6주(42칸)로 채운다 */
  for(let i=lead+days;i<42;i++)cells+='<div class="mc-d out"><span class="n">'+(i-lead-days+1)+'</span></div>';
  return `<div class="card mini-cal">
    <div class="mc-h">
      <div class="cal-move mc-move">
        <button class="cal-nb" data-act="mine.mon" data-d="-1" aria-label="이전 주" data-tip="이전 주"><svg class="icn"><use href="#i-chevl"></use></svg></button>
        <button class="mc-lbl" data-act="mine.mon" data-d="0" data-tip="${bands?'이번 주로':'이번 달로'}" aria-label="${bands?'이번 주로':'이번 달로'}"${miniIsNow()?' disabled':''}><b>${y}년 ${m+1}월${bands?' <span class="mc-wkno">'+tkWeekNo(nxt.start)+'주차</span>':''}</b></button>
        <button class="cal-nb" data-act="mine.mon" data-d="1" aria-label="다음 주" data-tip="다음 주"><svg class="icn"><use href="#i-chevr"></use></svg></button>
      </div>
    </div>
    <div class="mc-w">${DOW.map((w,i)=>'<span'+(i===0?' class="sun"':i===6?' class="sat"':'')+'>'+w+'</span>').join('')}</div>
    <div class="mc-g">${cells}</div>
  </div>`;
}
/* ═══════════ 설정 — 팀 · 권역 · 계정 배정 ═══════════ */
const ICON_TRASH='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>';
const ICON_RADIO_ON='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.6" fill="currentColor" stroke="none"/></svg>';
const ICON_RADIO_OFF='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/></svg>';
function teamRows(){
  const list=S.org.teams||[];
  if(!list.length)return '<div class="tm-empty">등록된 팀이 없습니다.<br>오른쪽 <b>+</b> 로 추가하세요.</div>';
  return list.map(t=>{
    const site=(S.orgTab||'acct')==='site';
    const act=t.id===S.tk.t;
    const cnt=site?(S.org.sites||[]).length:roster().filter(p=>p.team===t.id).length;
    return `<div class="tm-row${act?' act':''}">
      <button class="tm-pick" data-act="team.switch" data-tid="${esc(t.id)}" aria-label="이 팀 선택">${act?ICON_RADIO_ON:ICON_RADIO_OFF}</button>
      <input class="mg-inp tm-nameinp" value="${esc(t.name)}" data-act="org.ren" data-kind="Team" data-id="${esc(t.id)}" placeholder="팀 이름" aria-label="팀 이름">
      <span class="tm-cnt">${cnt}</span>
      <button class="tm-x tm-del" data-act="org.delTeam" data-id="${esc(t.id)}" aria-label="삭제">${ICON_TRASH}</button>
    </div>`;}).join('');
}
function regRows(){
  const list=S.org.regions||[];
  if(!list.length)return '<div class="tm-empty">등록된 권역이 없습니다.<br>오른쪽 <b>+</b> 로 추가하세요.</div>';
  const site=(S.orgTab||'acct')==='site';   /* 현장 탭이면 계정 수가 아니라 현장 수를 보여 준다 */
  return list.map(r=>{
    const used=site?(S.org.sites||[]).filter(x=>x.region===r.id).length
                   :roster().filter(p=>p.region===r.id).length;
    return `<div class="tm-row">
      <input class="mg-inp tm-nameinp" value="${esc(r.name)}" data-act="org.ren" data-kind="Reg" data-id="${esc(r.id)}" placeholder="권역 이름" aria-label="권역 이름">
      <span class="tm-cnt">${used}</span>
      <button class="tm-x tm-del" data-act="org.delReg" data-id="${esc(r.id)}" aria-label="삭제">${ICON_TRASH}</button>
    </div>`;}).join('');
}
/* 현장은 권역 그룹 아래에 놓고, 끌어서 다른 권역으로 옮기거나 순서를 바꾼다 */
/* 현장 표 — 하자처리 현황의 현장 관리 표를 그대로 이식(권역·현장명·세대수·동수·상가수·준공일).
   행에서 바로 고치면 즉시 저장된다. 순서는 권역 등록 순 → 이름순. */
/* 그 현장을 담당하는 사람들 — 계정의 담당 현장(p.sites)에서 거꾸로 모은다.
   ⚠ 여기서는 보여 주기만 한다. 배정은 계정 보기의 '담당 현장 선택'이 맡는다(한 곳에서만 고친다) */
function siteOwnersHTML(sid){
  const t=curTeam();
  /* ⚠ 현장을 담당하는 직급은 '담당자'뿐이다(rankUses) — 계정 표에서 배정할 수 없는 직급이
     여기에만 나오면 두 화면이 어긋난다(341차) */
  const list=roster().filter(p=>(t?p.team===t.id:true)&&rankUses(p.rank).sites&&(p.sites||{})[sid]);
  /* 694차: 현장 쪽에서도 담당자를 지정한다 — 계정 탭의 현장 [+] 와 짝. 편집자·팀장·공구장(자기 권역)만 */
  /* 771차: 현장 쪽 [+] 제거 — 담당자는 계정 탭에서 사람별로 지정한다(사용자) */
  if(!list.length)return '<span class="site-none">미지정</span>';
  return list.map(p=>'<span class="own-chip"><i style="background:'+esc(colBg(ownColor(p.id)))+'"></i>'+esc(p.name)+'</span>').join('');
}
/* 771차: 그 현장 권역의 공구장(rank=lead) 이름 — 담당자 앞 열 */
function siteLeadHTML(x){
  const ls=roster().filter(p=>p.rank==='lead'&&p.region&&p.region===x.region);
  if(!ls.length)return '<span class="site-none">—</span>';
  return ls.map(p=>'<span class="own-chip"><i style="background:'+esc(colBg(ownColor(p.id)))+'"></i>'+esc(p.name)+'</span>').join('');
}
function siteTable(){
  const regs=(S.org.regions||[]).filter(r=>r.name);
  const sites=(S.org.sites||[]).filter(x=>orgRegHit(x.region,S.orgReg));   /* 권역 탭 적용(340차) */
  if(!sites.length)return '<p class="tm-empty" style="padding:22px 0;text-align:center">'
    +(S.orgReg?'이 권역에 등록된 현장이 없습니다.<br>다른 권역 탭을 눌러 보세요.':'등록된 현장이 없습니다.<br>오른쪽 위 <b>현장 추가</b>로 등록하세요.')+'</p>';
  sites.sort(siteCmp(regs));   /* 692차: 준공일 순 — normOrg 와 같은 비교자 */
  const regOpts=x=>'<option value="">권역 —</option>'+regs.map(r=>'<option value="'+esc(r.id)+'"'+(r.id===x.region?' selected':'')+'>'+esc(r.name)+'</option>').join('');
  const dn=orgDraftN();
  return `<div class="mg-savebar" id="orgSaveBar"${dn?'':' hidden'}><span>저장하지 않은 변경 <b id="orgSaveN">${dn}</b>건</span><button class="btn bg2 bsm" data-act="org.draftDrop">되돌리기</button><button class="btn bp bsm" data-act="org.draftSave">저장</button></div>
  <div style="overflow-x:auto" data-sbx="r" data-sbh><table class="mgtbl"><thead><tr>
    <th style="width:9%">권역</th><th style="width:16%">현장명</th><th style="width:8%">공구장</th><th style="width:11%">담당자</th>
    <th class="cc" style="width:5.5%">세대수</th><th class="cc" style="width:4.5%">동수</th>
    <th class="cc" style="width:5.5%">상가수</th><th class="cc" style="width:9.5%">준공일</th>
    <th class="cc" style="width:5.5%" data-tip="끄면 하자 관리 화면의 현장 목록에서 숨깁니다">하자현황</th>
    <th class="cc" style="width:5.5%" data-tip="끄면 이 현장의 하자 화면에서 공가세대 탭을 숨깁니다 · 전원에게 즉시 반영">공가세대</th><th class="cc" style="width:5.5%" data-tip="켜면 이 현장의 하자 화면에 공가상가 탭이 생깁니다 · 전원에게 즉시 반영">공가상가</th><th class="cc" style="width:5.5%" data-tip="소송 진행 현장 표시 · 전원에게 즉시 반영">소송현장</th>
    <th class="cc" style="width:7%" data-tip="이 현장 원본이 마지막으로 올라온 날 — 마스터 PC 가 올리면 조직 정보에 함께 저장돼 모두에게 보입니다">업데이트일</th>
  </tr></thead><tbody>${sites.map(x=>`<tr data-sid="${esc(x.id)}">
    <td><select class="mg-inp" data-act="org.siteUpd" data-id="${esc(x.id)}" data-f="region" aria-label="권역 선택">${regOpts(x)}</select></td>
    <td><input class="mg-inp" value="${esc(x.name)}" data-act="org.siteUpd" data-id="${esc(x.id)}" data-f="name" aria-label="현장명"></td>
    <td class="mg-lead">${siteLeadHTML(x)}</td>
    <td class="mg-own"><div class="mg-ownw">${siteOwnersHTML(x.id)}</div></td>
    <td><input class="mg-inp n" type="text" inputmode="numeric" value="${(x.units||0).toLocaleString()}" data-act="org.siteUpd" data-id="${esc(x.id)}" data-f="units" aria-label="세대수" style="text-align:right;min-width:56px"></td>
    <td><input class="mg-inp n" type="text" inputmode="numeric" value="${(x.buildings||0).toLocaleString()}" data-act="org.siteUpd" data-id="${esc(x.id)}" data-f="buildings" aria-label="동수" style="text-align:right;min-width:48px"></td>
    <td><input class="mg-inp n" type="text" inputmode="numeric" value="${(x.commercialUnits||0).toLocaleString()}" data-act="org.siteUpd" data-id="${esc(x.id)}" data-f="commercialUnits" aria-label="상가수" style="text-align:right;min-width:52px"></td>
    <td class="cc"><input class="mg-inp" type="date" max="9999-12-31" style="width:120px;max-width:100%;text-align:center;display:inline-block" value="${esc(x.completionDate||'')}" data-act="org.siteUpd" data-id="${esc(x.id)}" data-f="completionDate" aria-label="준공일"></td>
    <td class="cc"><label class="sw"><input type="checkbox"${dfIsHidden(x.id)?'':' checked'} data-act="org.siteShow" data-id="${esc(x.id)}" aria-label="하자 관리 화면에 표시"><span class="sw-t"></span></label></td>
    <td class="cc"><label class="sw"><input type="checkbox"${x.showVacant!==false?' checked':''} data-act="org.siteVac" data-id="${esc(x.id)}" aria-label="공가세대 탭 표시"><span class="sw-t"></span></label></td>
    <td class="cc"><label class="sw"><input type="checkbox"${x.hasCommercial?' checked':''} data-act="org.siteShop" data-id="${esc(x.id)}" aria-label="공가상가 포함 현장"><span class="sw-t"></span></label></td>
    <td class="cc"><label class="sw"><input type="checkbox"${x.lawsuit?' checked':''} data-act="org.siteSuit" data-id="${esc(x.id)}" aria-label="소송현장"><span class="sw-t"></span></label></td>
    <td class="cc" style="font-size:11.5px;white-space:nowrap;color:var(--lbl2)">${(()=>{const d=(DFMETA.lastUp||{})[x.id]||x.lastUploadedAt||'';return d?esc(String(d).slice(0,10)):'<span style="color:var(--lbl3)">—</span>';})()}</td>
  </tr>`).join('')}</tbody></table></div>`;
}
/* ── 현장 위치 지도(526차) ─────────────────────────────────────────────
   vendor/korea-geo.js 의 시도·시군구·읍면동 경계를 SVG 로 그린다. 외부 요청은 없다.
   좌표는 KRGEO.k 배 정수 메르카토르 — 화면 좌표계와 지도 좌표계를 여기서만 오간다.
   제주는 제자리에 두면 지도가 세로로 길어져 **좌하단 네모로 옮겨** 그린다(KM_JD). */
const KM_VB0={x:232,y:8,w:2120,h:3222};   /* 601차: 오른쪽 여백 — 경북·울산이 테두리에 붙어 있었다(2104→602차 2120) */            /* 전체 보기 — 본토 + 제주 네모.
   544차: x 를 8(=화면 1px) 늘려 지도를 왼쪽으로 1px 민다 */
const KM_JD=[1506,-706];                           /* 제주 이동량 — 오른쪽 아래 모서리 */
const KM_FR={x:1832,y:2906,w:496,h:324};           /* 제주 네모 — 보기 상자 우하단에 붙인다 */
function krGeo(){if(!window.KRGEO){loadGeo().then(()=>{Object.keys(KM_XY).forEach(k=>{delete KM_XY[k];});if(S.view==='org')rOrg();}).catch(()=>{});}return window.KRGEO||null;}   /* 762차: 처음 부르면 지연 로드, 읽히면 조직 화면 재렌더 */
/* 현장 자리는 **저장하지 않고 이름에서 그때그때 찾는다**(529차).
   좌표를 두려면 현장 목록이 게시본 구독이라 cfg 로 빼야 하고, 그러면 사람이 한 번씩 찍어 넣어야 한다.
   이름만으로 되는 범위까지만 하기로 했다 — 못 찾은 현장은 지도에 나오지 않는다.
   ⚠ kmAuto 는 색인 전체를 훑는다. 한 번 그릴 때 현장마다 불리므로 이름 단위로 기억해 둔다 */
const KM_XY={};
/* 현장명에 지역이 없으면 **권역 이름을 힌트로 붙인다**(531차) —
   '갑천1 트리풀시티' 는 권역 '대전·세종' 이 붙어야 강원 갑천면으로 새지 않는다 */
function kmSiteHint(st){
  const r=(S.org.regions||[]).find(x=>x.id===st.region);
  return (r&&r.name)||'';
}
function kmSiteXY(st){
  if(!st||!st.name)return null;
  if(!window.KRGEO)return null;   /* 774차: 지도 자료 지연 로드 전엔 계산·캐시하지 않는다 — 전엔 null 이 KM_XY 에 박혀 자료가 와도 점이 안 찍혔다 */
  const addr=SITE_ADDR[st.id]||((S.cfg&&S.cfg.siteAddr)||{})[st.id]||'';   /* 552차: 관리자가 적은 주소(cfg.siteAddr)도 쓴다 */
  const hint=kmSiteHint(st), nm=addr+'\u0000'+st.name+'\u0000'+hint;   /* 주소·이름·권역 중 하나라도 바뀌면 다시 찾는다 */
  if(!(nm in KM_XY)){
    /* ── 612차: 주소와 이름을 **2단계**로 쓴다(예전에는 `addr||name` 이라 주소가 있으면 이름을 통째로 버렸다).
       ① 주소만으로 동 수준(단지·읍면동·법정동)이 나오면 그것으로 끝.
       ② 안 나오면(주소가 '천안'·'대전' 처럼 도시만 적혔거나 아예 없으면) **이름을 보태** 다시 찾는다.
          '천안' + '…두정역' → 충남 두정동 · '대전' + '…도안' → 대전 도안동 · '광주' + '…첨단' → 첨단동.
       ⚠ ①을 먼저 보는 순서가 핵심이다. 무조건 합치면, 도로명주소를 제대로 적었는데 이름의 지명이
         실제와 다른 현장(이름 '…두정역' · 주소 성성동)에서 **이름이 이겨 엉뚱한 동으로 간다** — 실측 확인.
       ⚠ 권역 이름은 힌트 구실을 못 한다('중부1'·'중부2'는 행정구역이 아니고 '광주'는 경기 광주시로도 걸린다).
         그래서 동명이의(충남 두정동 ↔ 광주 두정동)는 **주소 없이는 못 가른다** — 이름만으로는 안 찍힌다. */
    let h=addr?kmAuto(addr,hint):null;
    if(!h||!/^(단지|읍면동|법정동)$/.test(h.kind))h=kmAuto(addr?addr+' '+st.name:st.name,hint);
    /* ⚠ 제주 항목의 중심점은 추자도까지 안고 있어 네모 위로 벗어난다 — 네모 안으로 가둔다 */
    KM_XY[nm]=h?(h.pc==='39'
      ?[Math.min(Math.max(h.x,KM_FR.x+40),KM_FR.x+KM_FR.w-40),
        Math.min(Math.max(h.y,KM_FR.y+50),KM_FR.y+KM_FR.h-50)]
      :[h.x,h.y]):null;
  }
  return KM_XY[nm];
}
/* 그 현장의 담당자 색 — 여러 명이면 첫 사람. 배정이 없으면 회색 */
/* 담당자 색. 배정이 없으면 null — 그리는 쪽이 **속 빈 원**으로 그린다.
   ⚠ 공통 색(TEAM_COLOR)과 첫 담당자 색(OWN_PAL[0])이 같은 파랑이라 색만으로는 갈리지 않는다.
   달력이 공통 업무를 속 빈 막대로 가르는 것과 같은 문법을 쓴다(535차) */
function kmSiteColor(sid){
  const t=curTeam();
  const p=roster().find(x=>(t?x.team===t.id:true)&&rankUses(x.rank).sites&&(x.sites||{})[sid]);
  return p?ownColor(p.id):null;
}
/* 겹치는 점을 서로 밀어낸다 — 작은 지도에서 한 덩어리가 되는 것을 푼다 */
function kmSpread(pts,d){
  for(let k=0;k<50;k++){let moved=0;
    for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
      const a=pts[i],b=pts[j];let dx=b.x-a.x,dy=b.y-a.y,q=Math.hypot(dx,dy);
      if(q>=d)continue;
      if(q<.001){dx=.5;dy=.3;q=.58;}
      const f=(d-q)/2/q;a.x-=dx*f;a.y-=dy*f;b.x+=dx*f;b.y+=dy*f;moved=1;}
    if(!moved)break;}
}
/* 이름표가 잡은 자리 밖으로 점을 민다 — 가장 가까운 변으로 뺀다 */
function kmPushOut(pts,boxes,pad){
  for(let k=0;k<20;k++){let moved=0;
    for(const p of pts)for(const b of boxes){
      const x0=b.x-pad,x1=b.x+b.w+pad,y0=b.y-pad,y1=b.y+b.h+pad;
      if(p.x<x0||p.x>x1||p.y<y0||p.y>y1)continue;
      const d=[p.x-x0,x1-p.x,p.y-y0,y1-p.y],i=d.indexOf(Math.min(...d));
      if(i===0)p.x=x0;else if(i===1)p.x=x1;else if(i===2)p.y=y0;else p.y=y1;
      moved=1;}
    if(!moved)break;}
}
function kmHit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
/* 793차: 현장명 실제 폭(화면 px, .okm-snm 과 같은 600 12px). 792차는 「글자 수×11+6」으로 잡아 실제보다 25~30px 넓었고,
   안 부딪히는 이름까지 부딪힌 것으로 쳐서 빠졌다. 글꼴이 아직 안 읽혔으면 재기만 하고 기억하지 않는다 */
const KM_TW={};let _kmTC=null;
function kmTextW(t){
  if(t in KM_TW)return KM_TW[t];
  _kmTC=_kmTC||document.createElement('canvas').getContext('2d');
  _kmTC.font='600 12px '+getComputedStyle(document.body).fontFamily;
  const w=_kmTC.measureText(t).width;
  if(!document.fonts||document.fonts.status==='loaded')KM_TW[t]=w;
  return w;
}
/* 791차: 같은 동으로 찍혀 **좌표가 똑같은** 현장은 색원이 한 점에 포개진다 — 그 묶음만 가로로 나란히 붙인다(간격 step).
   묶음 가운데는 원래 자리 그대로라 787차 원칙(현장 자리 그대로)은 유지된다. 자리가 다른 점은 건드리지 않는다.
   돌려주는 것은 {sid:[x,y]} — 라벨 예약 상자와 점이 같은 자리를 쓴다 */
function kmSpots(sites,step){
  const out={},grp={};
  sites.forEach(st=>{const q=kmSiteXY(st);if(!q)return;
    const k=Math.round(q[0])+','+Math.round(q[1]);(grp[k]=grp[k]||[]).push([st.id,q]);});
  Object.values(grp).forEach(a=>a.forEach(([id,q],i)=>{out[id]=[q[0]+(i-(a.length-1)/2)*step,q[1]];}));
  return out;
}
/* 지도 한 장. o.w·o.h 는 그려질 상자 크기(px) — 배율을 여기서 정해 글자·점 크기를 맞춘다.
   o.sites 를 주면 그 현장만 그린다 */
function kmSVG(vb,sel,o){
  const g=krGeo();if(!g)return '<div class="okm-none">지도 자료를 불러오는 중…</div>';
  o=o||{};
  const W=o.w||240,H=o.h||300;
  const u=1/Math.min(W/vb.w,H/vb.h);            /* 지도 좌표 1 = 화면 u 분의 1 px */
  /* 581차: 점은 화면 px 고정이라 확대할수록 상대적으로 작아 보였다 — 배율 z 에 따라 1배 3.3px → 2배 4.5 → 4배 5.6 → 8배 6.8 (상한 7.5) */
  const z=Math.max(1,KM_VB0.w/vb.w),R=Math.min(6,(o.r||3.3)*(1+0.28*Math.log2(z)))*u   /* 786차: 깊게 확대해도 점이 커지지 않게(7.5→6) */, zoom=vb.w<KM_VB0.w*0.7, deep=vb.w<KM_VB0.w*0.2;   /* 585차: 0.6→0.7 — 2026 경계는 섬을 품어 충남·강원 상자가 0.6 을 넘는다 */
  const jd=c=>c==='39'?' transform="translate('+KM_JD[0]+','+KM_JD[1]+')"':'';
  const noFr=!!sel&&sel!=='39';   /* 588차: 다른 시도를 골랐을 땐 제주 네모를 안 그린다 — 2026 경계의 경남 남쪽 섬 때문에 상자가 네모에 닿았다 */
  /* 제주 네모는 바탕을 먼저 덮는다 — 네모가 겹쳐 놓인 서남해 섬이 안쪽에 비쳐 보였다 */
  /* 553차: 경계 층은 전체 보기의 오른쪽 끝(KM_VB0 우변)에서 자른다 — 모달은 지도보다 넓어 meet 여백에 울릉도가 비쳤다.
     경북 확대에서 울릉도·독도를 빼던 정책(kmZoomBox)과 같다. clipPath id 는 svg 마다 달라야 한다(카드·모달) */
  const cid=(o.id||'okmSvg')+'-clip';
  /* 585차: 왼쪽도 자른다(KM_VB0.x−120) — 2026 경계에 백령도가 들어와 모달 왼쪽 여백에 걸렸다. 신안 군도(x≈145)는 남는다 */
  let s='<clipPath id="'+cid+'"><rect x="'+(KM_VB0.x-120)+'" y="-20000" width="'+(KM_VB0.w+120)+'" height="60000"></rect></clipPath><g clip-path="url(#'+cid+')">'
    +(noFr?'':'<rect class="okm-frbg" x="'+KM_FR.x+'" y="'+KM_FR.y+'" width="'+KM_FR.w+'" height="'+KM_FR.h+'" rx="24"></rect>');
  /* ⚠ 큰 것부터 그린다 — 경계를 단순화하며 구멍(서울·대구)을 지웠기 때문에, 순서대로 그리면
     경기가 서울을, 경북이 대구를 덮어 그 시들이 보이지도 눌리지도 않았다(531차) */
  const order=g.prov.slice().sort((a,b)=>((b[7]-b[5])*(b[8]-b[6]))-((a[7]-a[5])*(a[8]-a[6])));
  /* 583차: 현장이 있는 시도는 옅은 하늘색 — 시군구 면 데이터가 없어(경계는 mesh 한 덩어리) 시군구 단위로는 못 칠한다 */
  const has={};(o.sites||[]).forEach(st=>{const q=kmSiteXY(st);if(!q)return;
    const f=g.prov.find(f=>{const dx=f[0]==='39'?KM_JD[0]:0,dy=f[0]==='39'?KM_JD[1]:0;
      return q[0]>=f[5]+dx&&q[0]<=f[7]+dx&&q[1]>=f[6]+dy&&q[1]<=f[8]+dy;});if(f)has[f[0]]=1;});
  order.forEach(f=>{if(noFr&&f[0]==='39')return;s+='<path class="okm-pv'+(sel===f[0]?' on':has[f[0]]?' has':'')+'"'+jd(f[0])
    +' d="'+f[9]+'" data-act="org.mapPv" data-c="'+f[0]+'"></path>';});   /* 547차: 시도 툴팁은 뗐다 — 면 호버만 */
  /* ⚠ 제주는 네모로 옮겨 그린다 — 화면에 걸쳤는지 볼 때도 옮긴 자리로 봐야 한다 */
  const inView=f=>{
    const dx=f[0]==='39'?KM_JD[0]:0,dy=f[0]==='39'?KM_JD[1]:0;
    return !(f[7]+dx<vb.x||f[5]+dx>vb.x+vb.w||f[8]+dy<vb.y||f[6]+dy>vb.y+vb.h);
  };
  /* 584차: 선택 시도의 시군구 면 — 현장이 든 것은 has. 시도와 같은 data-act 라 클릭·호버가 시도처럼 흐른다(시군구 진입은 기존 kmMuniAt) */
  /* 586차: 현장이 든 시군구는 **모든 시도에서, 전체 보기에서도** 하늘색. 빈 시군구 면은 선택한 시도에서만(호버·클릭용) */
  if(g.mpoly){const allpts=(o.sites||[]).map(st=>kmSiteXY(st)).filter(Boolean);
    g.prov.forEach(f=>{const pc=f[0];if(!g.mpoly[pc]||!inView(f))return;
      const dx=pc==='39'?KM_JD[0]:0,dy=pc==='39'?KM_JD[1]:0;
      const pts=allpts.filter(q=>q[0]>=f[5]+dx&&q[0]<=f[7]+dx&&q[1]>=f[6]+dy&&q[1]<=f[8]+dy).map(q=>[q[0]-dx,q[1]-dy]);
      g.mpoly[pc].forEach(m=>{const has=pts.length&&pts.some(q=>kmInPath(m[2],q[0],q[1]));
        if(!has&&sel!==pc)return;
        s+='<path class="okm-mp'+(has?' has':'')+'"'+jd(pc)+' d="'+m[2]+'" data-act="org.mapPv" data-c="'+pc+'" data-mn="'+esc(m[0])+'"></path>';});});}
  if(g.gj&&inView(g.prov.find(f=>f[0]==='36')||g.prov[0]))s+='<path class="okm-gj" d="'+g.gj+'"></path>';
  if(zoom)g.prov.forEach(f=>{if(g.mesh[f[0]]&&inView(f))s+='<path class="okm-mn"'+jd(f[0])+' d="'+g.mesh[f[0]]+'"></path>';});
  if(deep)g.prov.forEach(f=>{if(g.sub[f[0]]&&inView(f))s+='<path class="okm-sb"'+jd(f[0])+' d="'+g.sub[f[0]]+'"></path>';});
  /* 597차: 시도 테두리는 provl(선) — 공유수면 해상경계의 긴 직선(사천만 등)은 끊겨 있다. 면(okm-pv)은 자료 그대로라 클릭·판정엔 영향 없다 */
  if(g.provl)order.forEach(f=>{if(noFr&&f[0]==='39')return;if(inView(f))s+='<path class="okm-pvl"'+jd(f[0])+' d="'+(g.provl[f[0]]||'')+'"></path>';});
  if(sel){const sf=g.prov.find(f=>f[0]===sel);if(sf)s+='<path class="okm-sl"'+jd(sel)+' d="'+((g.provl&&g.provl[sel])||sf[9])+'"></path>';}
  if(!noFr)s+='<rect class="okm-fr" x="'+KM_FR.x+'" y="'+KM_FR.y+'" width="'+KM_FR.w+'" height="'+KM_FR.h+'" rx="24"></rect>';
  /* 792차: 시·군 이름은 781차부터 확대할수록 9.5→12px 로 커지는데 시도 이름은 11px 고정이라, 확대하면 「아산」이 「충남」보다 컸다.
     시도 이름은 늘 시·군 이름 + 1px(최소 11px — 전체 보기는 그대로). ctFs·plFs 는 화면 px */
  const ctFs=Math.min(12,9.5*Math.max(1,0.72+0.28*z)),plFs=Math.max(11,ctFs+1);
  /* 547차: 제주 이름표는 네모 가운데 — 아래 귀퉁이에 두면 카드 아래 페이드에 먹혀 바래 보였다 */
  if(!noFr)s+='<text class="okm-pl'+(sel==='39'?' on':'')+'" x="'+(KM_FR.x+KM_FR.w/2).toFixed(1)+'" y="'+(KM_FR.y+KM_FR.h*.56+plFs*u*.35).toFixed(1)
    +'" text-anchor="middle" style="font-size:'+(plFs*u).toFixed(2)+'px;stroke-width:'+(2.8*u).toFixed(2)+'px">제주</text>';
  /* 시도 이름 — 화면에 크게 걸친 것부터 자리를 잡고, 이미 놓인 이름표와 부딪히면 접는다 */
  const boxes=[],cand=[];
  /* 784차: 현장 점·현장명이 앉을 자리를 먼저 막아 둔다 — 동·읍·면 이름이 그 위에 겹쳐 지저분했다.
     (점은 뒤에서 흩뿌려지므로 원래 좌표 기준으로 넉넉히 잡는다) */
  const zz=Math.max(1,KM_VB0.w/vb.w);
  const spot=kmSpots(o.sites||[],2*R+2*u);   /* 791차: 원 지름 + 2px — 흰 테(1px)끼리 닿지 않을 만큼만 */
  /* 792차: 현장명 자리 — 먼저 놓인 현장명과 부딪히면 다음 자리, 다 막히면 뺀다(점 툴팁으로 본다).
     794차: 위 → 아래 → **오른쪽 → 왼쪽**. 오른쪽·왼쪽은 점 가운데 높이에 글자를 붙인다(text-anchor start/end).
       다른 현장의 **점도 피한다** — 옆자리 이름이 같은 동 묶음의 이웃 점을 덮으면 안 된다.
       상자는 글자 잉크(기준선 −10.5 ~ +2.5px, 좌우 +1px)로 잡는다 — 흰 테끼리 닿는 것은 허용해야 위·아래 이름 사이에 옆 이름이 들어간다.
     snm[sid] = {x, yb(기준선), a(text-anchor)} (없으면 이름 생략). 고른 자리를 예약해 동·읍·면 이름이 그 위에 앉지 않게 한다 */
  const snm={},nbx=[],pbx=Object.keys(spot).map(id=>({id,b:{x:spot[id][0]-R,y:spot[id][1]-R,w:2*R,h:2*R}}));
  (o.sites||[]).forEach(st=>{const q=spot[st.id];if(!q)return;
    if(zz>2){const nm=dfShortSite(st.name||''),tw=(kmTextW(nm)+2)*u,ym=q[1]+5*u;
      const pick=[[q[0],q[1]-R-3*u,'middle'],[q[0],q[1]+R+13*u,'middle'],[q[0]+R+4*u,ym,'start'],[q[0]-R-4*u,ym,'end']]
        .map(([x,yb,a])=>({x,yb,a,b:{x:a==='middle'?x-tw/2:a==='start'?x-u:x-tw+u,y:yb-10.5*u,w:tw,h:13*u}}))
        .find(c=>!nbx.some(b=>kmHit(c.b,b))&&!pbx.some(p=>p.id!==st.id&&kmHit(c.b,p.b)));
      if(pick){snm[st.id]=pick;nbx.push(pick.b);boxes.push(pick.b);}}
    boxes.push({x:q[0]-9*u,y:q[1]-9*u,w:18*u,h:18*u});});   /* 점 자리 */
  g.prov.forEach(f=>{
    if(f[0]==='39')return;                       /* 제주는 네모 안에 따로 적었다 */
    const ix0=Math.max(f[5],vb.x),ix1=Math.min(f[7],vb.x+vb.w);
    const iy0=Math.max(f[6],vb.y),iy1=Math.min(f[8],vb.y+vb.h);
    if(ix1-ix0<22*u||iy1-iy0<18*u)return;
    cand.push({f,x:Math.min(Math.max(f[3],ix0+16*u),ix1-16*u),
                 y:Math.min(Math.max(f[4],iy0+12*u),iy1-10*u),a:(ix1-ix0)*(iy1-iy0)});
  });
  cand.sort((a,b)=>b.a-a.a);
  cand.forEach(c=>{
    const w=(c.f[1].length*plFs+7)*u,h=(plFs+3)*u,b={x:c.x-w/2,y:c.y-h/2,w,h};
    if(boxes.some(z=>kmHit(b,z)))return;
    boxes.push(b);
    s+='<text class="okm-pl'+(sel===c.f[0]?' on':'')+'" x="'+c.x.toFixed(1)+'" y="'+(c.y+plFs*u*.35).toFixed(1)
      +'" text-anchor="middle" style="font-size:'+(plFs*u).toFixed(2)+'px;stroke-width:'+(2.8*u).toFixed(2)+'px">'
      +esc(c.f[1])+'</text>';
  });
  /* 시·군·구 이름(확대) → 읍면동 이름(더 확대). 같은 규칙으로 자리를 다툰다 */
  if(zoom){
    const mc=[],add=(src,minW,minH)=>{for(const pc in src){
      if(src===g.muni&&src[pc].length===1)continue;   /* 580차: 시군구가 하나뿐인 시도(세종)는 시도 이름표와 겹치므로 뺀다 — 자리를 옮기자 이중으로 찍혔다 */
      src[pc].forEach(m=>{
      const dx=pc==='39'?KM_JD[0]:0,dy=pc==='39'?KM_JD[1]:0;
      const lp=src===g.muni?kmMuniLabelPt(pc,m):null;   /* 580차: 시군구는 읍면동 점의 중앙값 자리(육지) */
      const cx=(lp?lp[0]:m[1])+dx,cy=(lp?lp[1]:m[2])+dy,hw=m[3]/2;
      const ix0=Math.max(cx-hw,vb.x),ix1=Math.min(cx+hw,vb.x+vb.w);
      const iy0=Math.max(cy-hw,vb.y),iy1=Math.min(cy+hw,vb.y+vb.h);
      if(ix1-ix0<minW*u||iy1-iy0<minH*u)return;
      /* 580차: 중심이 화면 밖이면 그리지 않는다 — 전에는 네모∩화면 안으로 밀어 넣어서, 섬까지 품은 네모(옹진·태안·보령·군산…)의
         이름표가 바다 한가운데 떴다. 중심이 안이면 가장자리 여백만 지킨다 */
      if(cx<vb.x||cx>vb.x+vb.w||cy<vb.y||cy>vb.y+vb.h)return;
      mc.push({n:m[0],pc,x:Math.min(Math.max(cx,vb.x+12*u),vb.x+vb.w-12*u),
                      y:Math.min(Math.max(cy,vb.y+8*u),vb.y+vb.h-6*u),a:(ix1-ix0)*(iy1-iy0)});});}};
    add(g.muni,20,14);
    /* 792차: 동·읍·면 이름은 z>10 부터(경계선은 deep 그대로) — 시군구를 눌러 들어간 화면(대개 z 5~9)에선 시·군 이름만 */
    const dongZ=vb.w<KM_VB0.w*0.1;
    if(dongZ)add(g.subl,18,12);
    /* 시군구까지 들어가면 그 안이 텅 빈다 — 읍면동 경계는 광역시만 있으므로 **이름**으로 채운다.
       g.dong 은 중심점만 있어 크기를 모르니, 화면 안이면 놓고 부딪히면 접는다(537차) */
    if(dongZ)for(const pc in g.dong)g.dong[pc].forEach(m=>{
      const dx=pc==='39'?KM_JD[0]:0,dy=pc==='39'?KM_JD[1]:0;
      const x=m[1]+dx,y=m[2]+dy;
      if(x<vb.x+10*u||x>vb.x+vb.w-10*u||y<vb.y+8*u||y>vb.y+vb.h-8*u)return;
      mc.push({n:m[0],x,y,a:0});
    });
    mc.sort((a,b)=>b.a-a.a);
    mc.forEach(m=>{
      /* 781차: 확대할수록 시·군 이름을 조금씩 키운다(화면 px 기준 9.5 → 최대 16) */
      /* 784차: 크기는 시·군 기준으로 한 번만 정하고 동·읍·면은 그보다 작게(0.86) — 하위 라벨이 더 커 보여 지저분했다 */
      const isDong=!m.pc, fsBase=ctFs*u, fs=isDong?fsBase*0.86:fsBase;
      const w=(m.n.length*(fs/u)+5)*u,h=(fs/u+2)*u,b={x:m.x-w/2,y:m.y-h/2,w,h};
      if(boxes.some(z=>kmHit(b,z)))return;
      boxes.push(b);
      s+='<text class="okm-ct'+(isDong?' dong':'')+'"'+(m.pc?' data-m="'+m.pc+'|'+esc(m.n)+'"':'')+' x="'+m.x.toFixed(1)+'" y="'+(m.y+fs*.35).toFixed(1)
        +'" text-anchor="middle" style="font-size:'+fs.toFixed(2)+'px;stroke-width:'+(fs*0.25).toFixed(2)+'px">'
        +esc(m.n)+'</text>';
    });
  }
  /* 현장 점 — 원래 자리에서 밀려나면 가는 선으로 제자리를 가리킨다 */
  const pts=[];let ov='';
  (o.sites||[]).forEach(st=>{const q=kmSiteXY(st);if(q&&!(noFr&&q[1]>=KM_FR.y))pts.push({st,ox:q[0],oy:q[1],x:spot[st.id][0],y:spot[st.id][1]});});   /* 네모를 안 그릴 땐 제주 점도 뺀다 */
  /* 787차: 점은 **현장 자리 그대로** 둔다 — 라벨을 피해 밀고(kmPushOut) 서로 흩뿌리던(kmSpread) 탓에
     실제 위치에서 벗어난 자리에 색원이 찍히고 지시선이 따라붙어 「엉뚱한 곳에 꽂힌 핀」처럼 보였다.
     대신 겹치는 것은 라벨 쪽에서 피한다(현장 자리를 라벨 배치 전에 상자로 예약해 둔다). */
  /* 550차: 여기부터는 겹층(.okm-ov)에 그린다 — 호버로 바뀌는 것은 전부 이쪽. 경계 svg 는 손대지 않는다 */
  const gpx=(o.id||'okmSvg')+'-g';
  ov+=colSvgDefs(pts.map(p=>kmSiteColor(p.st.id)),gpx);   /* 687차: 그라디언트·무지개 담당자 색을 점에 그린다 */
  ov+='<path class="okm-hv"></path><text class="okm-ct hov okm-hvt" text-anchor="middle"></text>';
  pts.forEach(p=>{
    /* ⚠ 굵기를 여기서 주지 않는다 — .okm-pin 은 non-scaling-stroke 라
       굵기를 화면 px 로 읽는다. 지도 단위(u)를 넘기면 u 배로 부푼다(529차에 흰 테가 원을 삼켰다) */
    const col=kmSiteColor(p.st.id);
    ov+='<circle class="okm-pin'+(col?'':' none')+'" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+R.toFixed(2)
      +'"'+(col?' fill="'+esc(colSvgFill(col,gpx))+'"':'')+' data-sid="'+esc(p.st.id)+'"'
      +' data-tip="'+esc((p.st.name||'이름 없음')+' · '+(p.st.units||0).toLocaleString()+'세대')+'"></circle>';
    /* 781차: 어느 정도 확대되면(z≥3) 점 위에 현장명 — 글자에 흰 테두리(그림자) */
    /* 792차: 그림자는 인라인으로 u 배 — SVG 요소의 CSS drop-shadow 길이는 viewBox 단위라 깊게 확대할수록 번졌다(실측) */
    const sn=snm[p.st.id];
    if(z>2&&sn)ov+='<text class="okm-snm" x="'+sn.x.toFixed(1)+'" y="'+sn.yb.toFixed(1)+'" text-anchor="'+sn.a+'"'
      +' style="font-size:'+(12*u).toFixed(2)+'px;stroke-width:'+(2.4*u).toFixed(2)+'px;filter:drop-shadow(0 '+u.toFixed(3)+'px '+u.toFixed(3)+'px rgba(20,30,50,.14))">'+esc(dfShortSite(p.st.name||''))+'</text>';
  });
  const vbs=' viewBox="'+vb.x+' '+vb.y+' '+vb.w+' '+vb.h+'" preserveAspectRatio="xMidYMid meet" style="height:'+H+'px"';
  return '<svg class="okm'+(o.cls?' '+o.cls:'')+(vb.w<KM_VB0.w?' pan':'')+'" id="'+(o.id||'okmSvg')+'"'+vbs+' aria-label="현장 위치 지도">'
    +s+'</g></svg><svg class="okm-ov"'+vbs+' aria-hidden="true">'+ov+'</svg>';
}
/* ── 현장명·주소에서 자리 찾기(527차) ────────────────────────────────
   korea-geo 의 읍면동·시군구 이름 색인과 대조한다. **밖으로 나가는 요청이 없다** —
   지도 API 를 붙이려면 CSP 를 열고 키·도메인을 등록해야 하는데, 그러면 현장명이
   외부로 나간다. 사내 자료라 그 길은 택하지 않았다. */
const KM_STOP=/힐스테이트|현대건설|아파트|오피스텔|주상복합|단지|현장|생활권|블록|구역|지구|신도시|트리풀시티/g;
/* ⚠ 붙여 쓴 글자 속에서 지명을 찾으면 엉뚱한 곳이 걸린다 — '충남천안'에서 '남천(동)' 같은 식이다.
   그래서 공백을 지우지 않고 **어절 단위**로 나눠, 어절의 앞머리가 지명과 맞을 때만 인정한다 */
function kmWords(t){
  return String(t||'').replace(KM_STOP,' ').split(/[^가-힣0-9A-Za-z]+/).filter(w=>w.length>1);
}
/* 이름 끝의 행정 단위를 뗀 알맹이 — '두정동' → '두정', '오창읍' → '오창' */
function kmBare(n){return String(n).replace(/(특별자치시|특별자치도|광역시|특별시|동|읍|면|가|시|군|구)$/,'');}
/* text = 현장명, hint = 권역 이름.
   ⚠ 힌트는 **시군구·시도 수준에서만** 쓴다 — 힌트를 읍면동·법정동에까지 대면
   권역 '대전·세종' 이 세종시 세종동을 잡아 현장 자리를 그리로 끌고 간다(532차) */
function kmFind(text,hint){
  const g=krGeo();if(!g||!g.dong)return [];
  const ws=kmWords(text);if(!ws.length)return [];
  const hs=ws.concat(kmWords(hint||''));
  const hit=[];
  const scan=(src,kind,base)=>{
    const pool=(kind==='읍면동'||kind==='법정동')?ws:hs;
    for(const pc in src)src[pc].forEach(a=>{
    /* 790차: 두 글자 동네('마동'·'신동'·'중동')는 끝 글자를 떼면 한 글자만 남아 통째로 버려지고 있었다 —
       그럴 때는 원래 이름 그대로 대조한다(어절 앞머리 규칙은 같다) */
    let b=kmBare(a[0]);
    if(b.length<2)b=String(a[0]);
    if(b.length<2)return;
    /* 행정구역 이름은 어절 앞머리로만 본다('충남천안'에서 '남천동'이 걸리던 것을 막는다).
       단지명은 표기가 조금씩 달라(띄어쓰기·브랜드 순서) 어절 어디든 들어 있으면 인정한다 */
    if(kind==='단지'?!pool.some(w=>w.indexOf(b)>=0||b.indexOf(w)>=0&&w.length>=3)
                    :!pool.some(w=>w.indexOf(b)===0))return;
    const byName=ws.some(w=>w.indexOf(b)===0);   /* 힌트(권역)에서만 걸린 것인지 가른다 */
    const dx=pc==='39'?KM_JD[0]:0,dy=pc==='39'?KM_JD[1]:0;
    hit.push({nm:a[0],pc,kind,src:byName?'name':'hint',x:a[1]+dx,y:a[2]+dy,sc:base+b.length*10});
  });};
  /* 공동주택명 색인이 있으면 가장 먼저 본다(540차) — 현장명이 곧 단지명인 경우가 많다.
     vendor/apt-geo.js 가 있을 때만 동작하고, 없으면 아래 행정구역 이름 대조로 넘어간다 */
  if(window.KRAPT)scan(window.KRAPT,'단지',140);
  scan(g.dong,'읍면동',100);
  /* 법정동도 경계 중심좌표를 갖는다(538차) — 행정동과 같은 등급이다.
     현장명에 쓰이는 이름은 대개 법정동 쪽이다(두정동·도안동·방서동) */
  if(g.bjd)scan(g.bjd,'법정동',100);
  scan(g.muni,'시군구',60);
  /* 광역시·특별시는 시군구 색인에 구 이름만 있다 — '부산 명지' 같은 이름을 위해 시도도 훑는다.
     ⚠ 전남광주 통합(36) 때문에 약칭이 '전남광주' 하나뿐이라 '전남'·'광주' 어느 쪽으로도 안 잡혔다.
     '광주'는 경기 광주시만 걸려 **광주광역시 현장이 경기도로 가고 있었다**(546차).
     그래서 36 은 세 이름을 모두 두고, '광주'는 옛 광역시 자리(그 안의 구들 평균)를 쓴다 */
  {const pv={};
   g.prov.forEach(f=>{pv[f[0]]=[[f[1],f[3],f[4]]];});
   const gj=(g.muni['36']||[]).filter(m=>/구$/.test(m[0]));
   if(gj.length){
     const gx=Math.round(gj.reduce((a,m)=>a+m[1],0)/gj.length);
     const gy=Math.round(gj.reduce((a,m)=>a+m[2],0)/gj.length);
     pv['36']=[['전남광주',pv['36'][0][1],pv['36'][0][2]],
               ['전남',pv['36'][0][1],pv['36'][0][2]],
               ['광주',gx,gy]];
   }
   scan(pv,'시도',30);
   /* 별칭('전남'·'광주')으로 걸린 것은 좁히기(sd)에 쓰지 않는다 — '광주' 하나로
      경기 광주시가 통째로 잘려 나갔다. 실제 약칭(f[1])만 시도로 인정한다 */
   const real={};g.prov.forEach(f=>{real[f[1]]=1;});
   hit.forEach(h=>{if(h.kind==='시도'&&!real[h.nm])h.kind='시도별칭';});}
  if(!hit.length)return [];
  /* 지역이 잡혔으면 **그 밖의 후보는 버린다** — '서산 예천'이 경북 예천읍으로 가던 것을 막는다.
     시도가 잡혔으면 시도만으로 좁힌다. 권역 이름이 시도를 알려 주는 경우가 많다(531차) */
  const sd={},any={};
  /* ⚠ 좁히는 기준은 시군구·시도뿐이다 — 법정동을 여기 넣었더니 동명이의(충남 두정동 ↔ 광주 두정동)가
     서로를 살려 놓아 후보가 안 좁혀졌다(538차) */
  hit.forEach(h=>{if(h.kind==='읍면동'||h.kind==='법정동')return;any[h.pc]=1;if(h.kind==='시도')sd[h.pc]=1;});
  const pcs=Object.keys(sd).length?sd:any;
  const scoped=Object.keys(pcs).length?hit.filter(h=>pcs[h.pc]):hit;
  const seen={},out=[];
  scoped.sort((a,b)=>b.sc-a.sc).forEach(h=>{
    const k=h.nm+'|'+h.pc;if(seen[k])return;seen[k]=1;
    const f=g.prov.find(x=>x[0]===h.pc);
    out.push({...h,area:f?f[1]:''});
  });
  return out.slice(0,6);
}
/* 이름에서 찾은 후보를 한 자리로 좁힌다.
   ⚠ 읍면동 색인은 통계청 **행정동** 기준이라 두정동·갑천·도안 같은 법정동·지구명이 아예 없다.
   그래서 못 찾으면 시군구 → 시도 순으로 물러선다. 여러 곳이 걸리면 평균 자리에 찍는다 —
   권역 안 어딘가로는 반드시 떨어지므로 크게 틀리지 않는다(531차). */
function kmAuto(text,hint){
  const r=kmFind(text,hint);
  const near=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<100;   /* 100 ≈ 25km */
  const gu=r.filter(h=>h.kind==='시군구');
  const sido=r.filter(h=>h.kind==='시도'||h.kind==='시도별칭');
  /* ⚠ **현장명에** 시군구가 함께 있으면 그 시군구 근처의 동만 인정한다(537차).
     같은 시도 안에도 같은 이름의 동이 있어(천안 ↔ 태안) 엉뚱한 곳으로 새고 있었다.
     ⚠ 권역 이름에서만 걸린 시군구는 이 검사에 쓰지 않는다 — 권역이 '대전·세종' 이면
     세종만 잡혀 대전 도안동이 40km 밖으로 밀려났다(538차) */
  const guN=gu.filter(h=>h.src==='name');
  /* 현장명에 시도까지 들어 있으면(예: '광주 첨단') 그 시도 안의 동은 거리 검사를 면제한다 —
     '광주'가 경기 광주시로도 걸려 광주광역시 첨단동이 40km 밖으로 밀려났다(546차).
     ⚠ 권역에서만 온 시도는 면제하지 않는다 — '천안 태안'이 다시 새 버린다 */
  const sdN={};r.forEach(h=>{if((h.kind==='시도'||h.kind==='시도별칭')&&h.src==='name')sdN[h.pc]=1;});
  const ok=h=>sdN[h.pc]||!guN.length||guN.some(g=>Math.hypot(h.x-g.x,h.y-g.y)<160);   /* 160 ≈ 40km */
  /* 행정동·법정동은 둘 다 ±0.5km 라 한 등급으로 묶는다. 서로 붙어 있으면 같은 자리로 본다 */
  /* 단지명이 잡히면 그것으로 끝 — 이름이 곧 그 자리다 */
  const apt=r.filter(h=>h.kind==='단지'&&ok(h));
  if(apt.length&&(apt.length===1||apt.every(d=>near(d,apt[0]))))return apt[0];
  const fine=r.filter(h=>(h.kind==='읍면동'||h.kind==='법정동')&&ok(h));
  if(fine.length&&(fine.length===1||fine.every(d=>near(d,fine[0]))))return fine[0];
  /* 시군구를 못 찾은 시도는 남긴다 — 권역 '대전·세종' 처럼 두 지역에 걸치면
     한쪽만 잡혀 그리로 쏠린다. 겹치지 않는 것만 더해 평균을 낸다 */
  /* ⚠ 613차: 같은 시도의 시군구가 이미 잡혔으면 **그 시도는 버린다.** 시도는 시군구의 상위이지
     별개 지역이 아니다. 예전에는 거리(25km)로만 걸러서 '전북 익산' 이 익산시 중심과 전북도 중심의
     **평균**으로 갔다 — 도 중심이 완주·임실 부근이라 익산에서 남동쪽으로 크게 밀렸다("자꾸 완주를 잡는다").
     '전남 여수' 는 둘이 100km 넘게 떨어져 아예 안 찍혔다. 지역을 정성껏 적을수록 틀리던 셈이다.
     ⚠ pc 가 다른 것끼리는 그대로 남긴다 — 권역 '대전·세종' 처럼 두 시도에 걸치면 평균이 맞다(531차). */
  const base=gu.concat(sido.filter(x=>!gu.some(y=>y.pc===x.pc||near(x,y))));
  if(!base.length)return null;
  if(base.length===1)return base[0];
  /* ⚠ 후보가 멀리 흩어져 있으면 평균은 엉뚱한 빈 자리가 된다 —
     '광주'(경기 광주시 ↔ 광주광역시)처럼 갈리는 이름이 그렇다. 그때는 **찍지 않는다**(546차).
     틀린 자리에 찍는 것보다 비워 두는 편이 낫다 — 권역을 채우면 저절로 좁혀진다 */
  const far=base.some(a=>base.some(b=>Math.hypot(a.x-b.x,a.y-b.y)>400));   /* 400 ≈ 100km */
  if(far)return null;
  const n=base.length;
  return {...base[0],nm:base.map(h=>h.nm).join('·'),
    x:Math.round(base.reduce((a,h)=>a+h.x,0)/n),
    y:Math.round(base.reduce((a,h)=>a+h.y,0)/n)};
}
/* 화면 좌표 → 지도 좌표. preserveAspectRatio=meet 이라 남는 여백을 되짚는다 */
function kmMapXY(svg,cx,cy){
  const km=S.km;if(!svg||!km)return null;
  const r=svg.getBoundingClientRect(),vb=km.vb;
  const k=Math.min(r.width/vb.w,r.height/vb.h);
  if(!(k>0))return null;
  return [vb.x+(cx-r.left-(r.width-vb.w*k)/2)/k, vb.y+(cy-r.top-(r.height-vb.h*k)/2)/k];
}
/* 누른 자리에 있는 시군구 — 경계상자로 고르고, 겹치면 중심이 가까운 쪽을 잡는다 */
function kmMuniAt(pc,x,y){
  const g=krGeo();const list=g&&g.muni&&g.muni[pc];if(!list)return null;
  let best=null,bd=1e9;
  list.forEach(m=>{
    if(m.length<8)return;
    if(x<m[4]||x>m[6]||y<m[5]||y>m[7])return;
    const d=Math.hypot(x-m[1],y-m[2]);
    if(d<bd){bd=d;best=m;}
  });
  if(!best)return null;
  const pd=Math.max(best[6]-best[4],best[7]-best[5])*0.16;
  return {nm:best[0],vb:{x:best[4]-pd,y:best[5]-pd,w:(best[6]-best[4])+pd*2,h:(best[7]-best[5])+pd*2}};
}
/* 시도 하나를 화면에 채우는 보기 상자 */
function kmZoomBox(c){
  const g=krGeo();if(!g)return {...KM_VB0};
  const f=g.prov.find(x=>x[0]===c);if(!f)return {...KM_VB0};
  let x0=f[5],y0=f[6],x1=f[7],y1=f[8];
  if(c==='39'){x0+=KM_JD[0];x1+=KM_JD[0];y0+=KM_JD[1];y1+=KM_JD[1];}
  if(c==='23')x0=Math.max(x0,KM_VB0.x);        /* 백령도까지 넣으면 인천이 통째로 서해가 된다 */
  if(c==='37')x1=Math.min(x1,2240);
  if(c==='38')y1=Math.min(y1,KM_FR.y-60);      /* 587차: 2026 경계의 먼 남쪽 섬 때문에 상자가 제주 네모를 덮었다 */            /* 울릉도·독도 제외 */
  const pd=Math.max(x1-x0,y1-y0)*0.14;
  return {x:x0-pd,y:y0-pd,w:(x1-x0)+pd*2,h:(y1-y0)+pd*2};
}
/* 조직 관리 좌측 카드 */
function rOrgMap(){
  const root=$('#orgMapRoot');if(!root)return;
  if(_kmDown){_kmPend=true;return;}   /* 601차 */
  const all=(S.org.sites||[]).filter(x=>x.name);
  const sites=all.filter(x=>orgRegHit(x.region,S.orgReg));
  const put=sites.filter(x=>kmSiteXY(x)&&kmFiltHit(x));
  const km=S.km||(S.km={vb:{...KM_VB0},sel:'',hist:[]});
  /* ⚠ w·h 는 실제로 그려질 상자 크기다 — 카드 안쪽 폭(264 − 테두리 2)과 어긋나면
     배율이 틀려 글자·점이 의도한 크기로 안 나온다 */
  /* ⚠ 609차: '크게 보기' 는 지도 안이 아니라 **카드 머리 오른쪽**(.tm-h 의 .tm-add)으로 옮겼다 —
     팀·권역 카드의 + 버튼과 같은 자리·같은 무몰딩 규격이라 셋이 한 줄로 맞는다(index.html 참조).
     지도 안에는 상태에 따라 나타나는 '전체 보기' 만 남는다 — 늘 있는 버튼과 가끔 있는 버튼이
     한 묶음이면 자리가 흔들려 보였다. */
  root.innerHTML='<div class="okm-wrap">'+kmSVG(km.vb,km.sel,{sites:put,w:262,h:401})
    +'<div class="okm-tools">'+kmBackBtn(km)+'</div>'
    +'</div>';
  /* ⚠ 닫힌 모달의 본문은 비워지지 않는다 — 열려 있을 때만 그린다. 안 그러면 숨은 지도의 점이 호버 대상으로 잡혀
     툴팁이 엉뚱한 자리(보이지 않는 모달의 점 위)에 떴다(551차) */
  const big=$('#mo.open #okmBigRoot');if(big)big.innerHTML=kmBigHTML(put);
}
/* 584차: path 문자열(M x y l dx dy … z 반복) → 고리 배열, 점이 안에 드는지(짝수-홀수). 고리 파싱은 한 번만 */
const KM_RINGS={};
function kmPathRings(d){
  if(KM_RINGS[d])return KM_RINGS[d];
  const rings=[];let cur=null,x=0,y=0;
  const re=/([Mlz])([^Mlz]*)/g;let m;
  while((m=re.exec(d))){const c=m[1],v=m[2].trim().split(/[\s,]+/).map(Number);
    if(c==='M'){cur=[];rings.push(cur);x=v[0];y=v[1];cur.push([x,y]);}
    else if(c==='l'){for(let i=0;i+1<v.length;i+=2){x+=v[i];y+=v[i+1];cur.push([x,y]);}}}
  return KM_RINGS[d]=rings;
}
function kmInPath(d,px,py){
  let inside=false;
  kmPathRings(d).forEach(r=>{for(let i=0,j=r.length-1;i<r.length;j=i++){const [xi,yi]=r[i],[xj,yj]=r[j];
    if((yi>py)!==(yj>py)&&px<(xj-xi)*(py-yi)/(yj-yi)+xi)inside=!inside;}});
  return inside;
}
/* 580차: 시군구 이름표 자리 — 색인의 중심은 네모 중심이라 섬이 많은 군(태안·보령·군산·옹진…)은 바다에 떨어진다.
   네모 안 읍면동 점(전부 육지)의 x·y 중앙값을 쓴다. 이웃 군의 점이 섞여도 중앙값이라 육지에 남는다. 한 번 계산해 둔다 */
const KM_MLP={};
function kmMuniLabelPt(pc,m){
  const k=pc+'|'+m[0];if(KM_MLP[k]!==undefined)return KM_MLP[k];
  const g=krGeo(),ds=(g&&g.dong&&g.dong[pc])||[];
  const pts=ds.filter(d=>d[1]>=m[4]&&d[1]<=m[6]&&d[2]>=m[5]&&d[2]<=m[7]);
  if(!pts.length)return KM_MLP[k]=null;
  const med=a=>{a=a.slice().sort((x,y)=>x-y);const n=a.length;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2;};
  return KM_MLP[k]=[med(pts.map(d=>d[1])),med(pts.map(d=>d[2]))];
}
/* 551차: 되돌아가기 버튼은 **확대돼 있으면** 보인다 — 휠·끌기는 이력을 안 쌓아서 이력만 보면 버튼이 안 생겼다 */
function kmBackBtn(km){
  if(!km.hist.length&&!(km.vb.w<KM_VB0.w))return '';
  return '<button class="okm-back" data-act="org.mapAll" aria-label="전체 보기" data-tip="전체 보기">'
    +'<svg class="icn" aria-hidden="true"><use href="#i-chevl"></use></svg></button>';
}
/* 547차: 제목을 누르면 같은 지도를 모달에 크게 — 보기 상자·확대 이력(S.km)은 카드와 공유한다 */
function kmBigHTML(put){
  /* 550차: 폭은 **확대 상태 기준**으로 고정한다 — 전체 보기에서는 양옆이 비지만, 시도로 들어가면 그 폭을 다 쓴다.
     (549차에 전체 보기 비율로 줄였더니 확대하면 좁았다) */
  const km=S.km,H=Math.max(420,Math.round(innerHeight*0.88)-78),
    W=Math.max(420,Math.min(800,Math.round(innerWidth*.94)-44-300));
  /* 548차: 우측 현장 목록 — 권역 순, 이름 순. 자리를 못 찾은 현장도 옅게 적어 배지 숫자와의 차이를 보여 준다 */
  const regs=(S.org.regions||[]).filter(r=>r.name),ord={};regs.forEach((r,i)=>{ord[r.id]=i;});
  const all=(S.org.sites||[]).filter(x=>x.name&&orgRegHit(x.region,S.orgReg))
    .sort((a,b)=>(ord[a.region]??99)-(ord[b.region]??99)
      ||String(b.completionDate||'').localeCompare(String(a.completionDate||''))   /* 579차: 준공일 최신이 위, 없으면 맨 아래 */
      ||String(a.name).localeCompare(String(b.name),'ko'));
  const list=kmSiteList(all,'reg');
  /* ⚠ 폭을 .okm-wrap 에 직접 준다 — 모달이 내용 크기(width:auto)라 svg 의 100% 가 viewBox 비율 폭으로 줄어든다 */
  return '<div class="kmw-grid"><div class="okm-wrap" style="width:'+W+'px">'+kmSVG(km.vb,km.sel,{sites:put,w:W,h:H,id:'okmBig'})
    +'<div class="okm-tools">'+kmBackBtn(km)
    +'<button class="okm-back'+(S.kmYr&&S.kmYr.length?' on':'')+'" data-act="org.mapYrMenu" aria-label="준공 년차 필터" data-tip="'+esc(S.kmYr&&S.kmYr.length?'준공 년차 · '+S.kmYr.map(k=>(KM_YR.find(z=>z[0]===k)||[])[1]).join(' · '):'준공 년차 필터')+'">'
    +'<svg class="icn" aria-hidden="true"><use href="#i-filter"></use></svg></button></div>'
    +'</div>'+kmPanelHTML(all,put,list,H)+'</div>';
}
/* 549차: 범례 — 보이는 현장의 담당자(첫 사람 기준)와 미지정. 누르면 그 사람 현장만 남긴다(S.kmOwn).
   ⚠ 범례는 모달에만 띄우지만 필터는 S.km 처럼 카드와 공유한다 — 모달을 열 때 초기화한다 */
function kmOwnOf(sid){
  const t=curTeam();
  const p=roster().find(x=>(t?x.team===t.id:true)&&rankUses(x.rank).sites&&(x.sites||{})[sid]);
  return p?p.id:'';
}
/* 573차: 준공 년차 — 담보책임기간 경과 기준(A안). 준공일부터 오늘까지 경과 연수 y 로
   y<2 → 2년차(2년 담보 안), <3 → 3년차, <5 → 5년차, <10 → 10년차, 그 이상. 준공일이 오늘 뒤면 준공 전, 비어 있으면 미입력(따로 센다 — 누락이 보여야 한다) */
const KM_YR=[['pre','준공 전'],['2','2년 이내'],['3','2~3년'],['5','3~5년'],['10','5~10년'],['over','10년 초과']];   /* 581차: 구간이 읽히게 · 미입력 항목은 뺐다(해당 없음) */
const KM_YR_NONE='준공일 미입력';
function kmYearBand(x){
  const d=x.completionDate;if(!d)return 'none';
  const t=new Date(d+'T00:00:00');if(isNaN(t))return 'none';
  const y=(Date.now()-t.getTime())/(365.25*86400e3);
  return y<0?'pre':y<2?'2':y<3?'3':y<5?'5':y<10?'10':'over';
}
/* 573차: 현장 목록 — mode 'reg'(권역 묶음) 또는 'yr'(년차 묶음). 줄 모양은 같다 */
function kmSiteList(all,mode){
  const regs=(S.org.regions||[]).filter(r=>r.name);
  const groups=mode==='yr'?KM_YR.map(([k,nm])=>({k,nm,attr:'data-act="org.mapYr" data-yr="'+esc(k)+'"',on:S.kmYr===k,items:all.filter(x=>kmYearBand(x)===k)}))
    :(()=>{const seen=[];all.forEach(x=>{if(!seen.includes(x.region||''))seen.push(x.region||'');});
      return seen.map(k=>{const r=regs.find(z=>z.id===k);return {k,nm:r?r.name:'권역 없음',attr:r?'data-act="org.mapReg" data-reg="'+esc(k)+'"':'',on:!!S.kmReg&&S.kmReg===k,items:all.filter(x=>(x.region||'')===k)};});})();
  let list='';
  groups.forEach(g=>{
    if(!g.items.length)return;
    const un=g.items.reduce((a,z)=>a+(Number(z.units)||0),0);
    list+='<div class="kml-grp"><div class="kml-g'+(g.on?' on':'')+'"'+(g.attr?' '+g.attr:'')+'>'
      +esc(g.nm)+'<span class="kml-s">'+g.items.length+'</span><em class="kml-n">'+un.toLocaleString()+'</em></div>';
    g.items.forEach(x=>{
      const dim=!kmFiltHit(x);   /* 554차: 필터에 걸리면 지우지 않고 가라앉힌다 */
      const on=!!kmSiteXY(x),col=colBg(kmSiteColor(x.id)),ad=((S.cfg&&S.cfg.siteAddr)||{})[x.id]||'';
      const yb=kmYearBand(x),yl=(KM_YR.find(z=>z[0]===yb)||[])[1]||KM_YR_NONE;
      const tip=[x.completionDate?'준공 '+x.completionDate+' · '+yl:yl,ad||(on?'':'현장명으로 자리를 찾지 못했습니다 — 눌러서 주소 입력')
        ].filter(Boolean).join('\n');   /* 583차: '더블클릭으로 주소 입력' 안내는 뺐다 */
      /* 553차: 줄 더블클릭이 주소 입력. 자리를 못 찾은 줄은 한 번 클릭으로도 연다 */
      list+='<div class="kml-r'+(on?'':' off')+(dim?' dim':'')+'" data-sid="'+esc(x.id)+'"'+(on?' data-act="org.mapTo"':' data-act="org.mapAddr"')
        +' data-tip="'+esc(tip)+'">'
        +'<i'+(col?' style="background:'+esc(col)+'"':'')+'></i><b>'+esc(x.name)+'</b><em class="kml-n">'+(x.units||0).toLocaleString()+'</em></div>';});
    list+='</div>';});
  return list;
}
/* 551차: 패널 필터 — 담당자(S.kmOwn)와 권역(S.kmReg)을 함께 건다. 둘 다 모달을 열 때 비운다 */
function kmFiltHit(x){
  if(S.kmYr&&S.kmYr.length&&!S.kmYr.includes(kmYearBand(x)))return false;   /* 573차 · 576차: 다중 선택(배열) */
  if(S.kmReg&&x.region!==S.kmReg)return false;
  if(S.kmOwn)return S.kmOwn==='none'?!kmOwnOf(x.id):kmOwnOf(x.id)===S.kmOwn;
  return true;
}
/* 550차: 우측 패널 — 현장 탭(목록)과 담당자 탭(549차 범례를 옮긴 것). S.kmTab */
function kmPanelHTML(all,put,list,H){
  const tab=S.kmTab||'site';
  /* 담당자·권역 수는 지도에 찍힌 현장(자리를 찾은 것) 기준. 다른 쪽 필터는 반영해 "지금 보이는" 수를 적는다 */
  /* 563차: 담당자 탭도 현장 탭과 같은 꼴 — 권역 판 안에 그 권역 현장의 담당자(첫 사람 기준) 줄. 한 사람이 여러 권역에 나올 수 있다.
     줄 오른쪽은 "n개 현장" + 세대 합(같은 숫자 열). 누르면 그 사람 현장만(S.kmOwn) */
  const ppl=roster(),fo=S.kmOwn||'';
  const regs2=(S.org.regions||[]).filter(r=>r.name),ord2={};regs2.forEach((r,i)=>{ord2[r.id]=i;});
  const byReg={};
  all.forEach(x=>{if(S.kmYr&&S.kmYr.length&&!S.kmYr.includes(kmYearBand(x)))return;   /* 574차: 년차 필터 안의 수만 */
    const o=kmOwnOf(x.id)||'none',u=Number(x.units)||0,k=x.region||'';
    const g=byReg[k]||(byReg[k]={cnt:{},un:{},tot:0,n:0});g.cnt[o]=(g.cnt[o]||0)+1;g.un[o]=(g.un[o]||0)+u;g.tot+=u;g.n++;});
  let own='';
  Object.keys(byReg).sort((a,b)=>(ord2[a]??99)-(ord2[b]??99)).forEach(k=>{
    const r=regs2.find(z=>z.id===k),g=byReg[k];
    const ids=Object.keys(g.cnt).sort((a,b)=>a==='none'?1:b==='none'?-1:g.cnt[b]-g.cnt[a]);
    own+='<div class="kml-grp"><div class="kml-g'+(S.kmReg&&S.kmReg===k?' on':'')+'"'+(r?' data-act="org.mapReg" data-reg="'+esc(r.id)+'"':'')+'>'
      +esc(r?r.name:'권역 없음')+'<span class="kml-s">'+g.n+'</span><em class="kml-n">'+g.tot.toLocaleString()+'</em></div>';
    ids.forEach(id=>{const p=id==='none'?null:ppl.find(x=>x.id===id),col=id==='none'?null:colBg(ownColor(id));
      const dim=(S.kmReg&&S.kmReg!==k)||(fo&&fo!==id);
      own+='<div class="kml-r'+(fo===id?' on':'')+(dim?' dim':'')+'" data-act="org.mapOwn" data-own="'+esc(id)+'">'
        +'<i'+(col?' style="background:'+esc(col)+'"':'')+'></i><b>'+esc(id==='none'?'미지정':p?p.name:'?')+'</b>'
        +'<span class="kml-s">'+g.cnt[id]+'</span><em class="kml-n">'+g.un[id].toLocaleString()+'</em></div>';});
    own+='</div>';});
  const tot=all.reduce((a,z)=>a+(Number(z.units)||0),0);
  const body=tab==='own'?(own||'<div class="tm-empty">담당자가 없습니다.</div>'):(list||'<div class="tm-empty">현장이 없습니다.</div>');
  const foot=all.length?'<div class="kml-f">합계<span class="kml-s">'+all.length+'</span><em class="kml-n">'+tot.toLocaleString()+'</em></div>':'';
  const t=(id,nm)=>'<button'+(tab===id?' class="act"':'')+' data-act="org.mapTab" data-t="'+id+'">'+nm+'</button>';
  return '<div class="kml"><div class="kml-h"><div class="seg">'+t('site','현장')+t('own','담당자')+'</div></div>'
    +'<div class="kml-b" style="max-height:'+(H-36-(foot?44:0))+'px">'+body+'</div>'+foot+'</div>';
}
function kmModalClosed(){
  const s=S.kmSnap;if(s){S.km={vb:{...s.vb},sel:s.sel,hist:s.hist};S.kmSnap=null;}
  S.kmOwn='';S.kmReg='';S.kmYr=[];
  rOrgMap();
}
/* 601차: 마우스를 누르고 있는 동안에는 지도를 다시 그리지 않는다.
   휠 재그리기(140ms)나 호버 갱신이 mousedown~mouseup 사이에 끼면 노드가 바뀌어 click 이 아예 안 나온다 — "한 번 안 눌리는" 증상의 원인 */
let _kmDown=false,_kmPend=false;
document.addEventListener('mousedown',e=>{if(e.target.closest&&e.target.closest('.okm-wrap'))_kmDown=true;},true);
document.addEventListener('mouseup',()=>{if(!_kmDown)return;_kmDown=false;if(_kmPend){_kmPend=false;setTimeout(rOrgMap,0);}},true);
/* 552차: 현장 주소 입력 — 줄을 입력칸으로 바꾼다. Enter 저장 · Esc/포커스 이탈 취소. cfg.siteAddr[sid](관리자 쓰기).
   이름 추론이 틀리거나 못 찾는 현장의 근본 처방이다(547차 결론). 주소에 시·군·구·동이 있으면 kmAuto 가 그대로 찍는다 */
function kmAddrEdit(sid){
  if(!isEditor()){denyEdit();return;}
  const row=$('.kml-r[data-sid="'+sid+'"]');if(!row||row.classList.contains('edit'))return;
  const cur=((S.cfg&&S.cfg.siteAddr)||{})[sid]||'';
  row.classList.add('edit');row.removeAttribute('data-act');
  row.innerHTML='<input class="mg-inp" value="'+esc(cur)+'" placeholder="주소 — 시·군·구·동까지" aria-label="현장 주소" maxlength="120">';
  const inp=row.querySelector('input');inp.focus();inp.select();
  let done=false;
  const fin=save=>{if(done)return;done=true;
    if(save){const v=inp.value.trim();const m={...((S.cfg&&S.cfg.siteAddr)||{})};
      if(v)m[sid]=v;else delete m[sid];
      store.putCfg('siteAddr',m);S.cfg={...S.cfg,siteAddr:m};
      for(const k in KM_XY)delete KM_XY[k];   /* 자리 기억은 이름+힌트 단위라 주소가 바뀌면 비운다 */
      toast(v?'주소를 저장했습니다':'주소를 지웠습니다');}
    rOrgMap();};
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();fin(true);}else if(e.key==='Escape'){e.stopPropagation();fin(false);}});
  inp.addEventListener('blur',()=>fin(false));
}
document.addEventListener('dblclick',e=>{   /* 553차: 목록 줄 더블클릭 = 주소 입력 */
  const row=e.target.closest&&e.target.closest('.kml-r[data-sid]');if(!row)return;
  clearTimeout(_kmCT);e.preventDefault();kmAddrEdit(row.dataset.sid);
});
/* 548차: 목록의 현장을 누르면 그 현장이 있는 시도로 */
function kmGoSite(sid){
  const st=(S.org.sites||[]).find(x=>x.id===sid),q=st&&kmSiteXY(st),g=krGeo();if(!q||!g)return;
  const f=g.prov.find(f=>{const dx=f[0]==='39'?KM_JD[0]:0,dy=f[0]==='39'?KM_JD[1]:0;
    return q[0]>=f[5]+dx&&q[0]<=f[7]+dx&&q[1]>=f[6]+dy&&q[1]<=f[8]+dy;});
  if(!f)return;
  ACT['org.mapPv']({dataset:{c:f[0]}});
  kmHoverSite(sid);
}
/* 550차: 점(겹층)에서 난 이벤트도 같은 지도로 친다 */
function kmSvgOf(el){const w=el&&el.closest&&el.closest('.okm-wrap');return w?w.querySelector('.okm'):null;}
function kmSetVB(vb){$$('.okm,.okm-ov').forEach(s=>s.setAttribute('viewBox',vb.x+' '+vb.y+' '+vb.w+' '+vb.h));}
/* 548차: 확대 상태에서 끌어서 옮긴다. 끄는 동안은 viewBox 만 바꾸고, 놓을 때 한 번 다시 그린다(이름표 자리가 보기 상자에 매인다).
   ⚠ 3px 넘게 끌었으면 그 뒤의 click 은 삼킨다 — 안 그러면 놓는 순간 바다 클릭으로 한 단계 되돌아간다 */
let _kmDrag=null,_kmDragged=0;
document.addEventListener('mousedown',e=>{
  const svg=kmSvgOf(e.target);const km=S.km;
  if(!svg||e.button!==0||!km||!(km.vb.w<KM_VB0.w))return;
  const r=svg.getBoundingClientRect(),k=Math.min(r.width/km.vb.w,r.height/km.vb.h);
  _kmDrag={svg,k,x:e.clientX,y:e.clientY,vb:{...km.vb}};_kmDragged=0;
});
document.addEventListener('mousemove',e=>{
  const d=_kmDrag;if(!d)return;
  const dx=(d.x-e.clientX)/d.k,dy=(d.y-e.clientY)/d.k;
  if(!_kmDragged&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<3)return;
  _kmDragged=1;d.svg.parentNode.classList.add('drag');
  const vb=S.km.vb;
  vb.x=Math.min(Math.max(d.vb.x+dx,KM_VB0.x-vb.w*.5),KM_VB0.x+KM_VB0.w-vb.w*.5);
  vb.y=Math.min(Math.max(d.vb.y+dy,KM_VB0.y-vb.h*.5),KM_VB0.y+KM_VB0.h-vb.h*.5);
  kmSetVB(vb);
});
document.addEventListener('mouseup',()=>{
  if(!_kmDrag)return;
  const was=_kmDragged;_kmDrag=null;
  if(was)rOrgMap();
});
document.addEventListener('click',e=>{if(_kmDragged&&kmSvgOf(e.target)){e.stopPropagation();e.preventDefault();_kmDragged=0;}},true);
/* 549차: 커서 자리를 고정한 채 배율을 바꾼다. f>1 확대. 전체보다 커지면 전체 보기로 되돌린다.
   그리는 쪽이 무거우니 viewBox 만 먼저 바꾸고, 손이 멈추면 한 번 다시 그린다 */
let _kmZT=0,_kmWT=0;
function kmZoomAt(svg,cx,cy,f,push){
  const km=S.km;if(!km||!svg)return;
  const q=kmMapXY(svg,cx,cy);if(!q)return;
  const vb=km.vb,w=vb.w/f;
  if(w>=KM_VB0.w){km.vb={...KM_VB0};km.sel='';km.hist=[];rOrgMap();return;}
  if(w<KM_VB0.w*0.03)return;
  /* 554차: 휠은 한 묶음(0.8초 안의 연속 굴림)에 한 번만 이력을 쌓는다 — 안 쌓으면 시도에서 휠로 들어간 뒤
     우클릭·바다 클릭이 시도를 건너뛰고 전체로 갔고, 매 틱 쌓으면 되돌리기에 틱 수만큼 걸린다 */
  const now=Date.now();
  if(push||now-_kmWT>800)km.hist.push({vb:{...vb},sel:km.sel});
  if(!push)_kmWT=now;
  const h=vb.h/f;
  km.vb={x:q[0]-(q[0]-vb.x)/f,y:q[1]-(q[1]-vb.y)/f,w,h};
  kmSetVB(km.vb);
  clearTimeout(_kmZT);_kmZT=setTimeout(rOrgMap,push?0:140);
}
document.addEventListener('wheel',e=>{
  const svg=kmSvgOf(e.target);if(!svg)return;
  e.preventDefault();
  kmZoomAt(svg,e.clientX,e.clientY,e.deltaY<0?1.25:1/1.25,false);
},{passive:false});
/* 549차: 더블클릭 = 커서 자리로 2배 확대. 앞서 난 한 번 클릭 동작은 220ms 미뤘다가 더블클릭이 오면 버린다 —
   안 그러면 시도 선택 → 시군구 진입 → 확대가 한꺼번에 일어난다 */
let _kmCT=0;
function kmClickDefer(fn){clearTimeout(_kmCT);_kmCT=setTimeout(fn,220);}
document.addEventListener('dblclick',e=>{
  const svg=kmSvgOf(e.target);if(!svg||svg.id!=='okmBig')return;   /* 552차: 더블클릭 확대는 모달만 */
  clearTimeout(_kmCT);e.preventDefault();
  kmZoomAt(svg,e.clientX,e.clientY,2,true);
});
/* 550차: 시도 면 호버 — 경계 svg 의 :hover 대신 겹층(.okm-hv)에 같은 경로를 옮겨 그린다 */
document.addEventListener('mouseover',e=>{
  const pv=e.target.closest&&e.target.closest('.okm-pv,.okm-mp');if(!pv)return;   /* 584차: 시군구 면이 있으면 그 면이 호버 */
  const hv=pv.closest('.okm-wrap').querySelector('.okm-hv');if(!hv)return;
  hv.setAttribute('d',pv.getAttribute('d'));
  const tf=pv.getAttribute('transform');if(tf)hv.setAttribute('transform',tf);else hv.removeAttribute('transform');
  hv.classList.toggle('on',pv.classList.contains('on'));
});
document.addEventListener('mouseout',e=>{
  const pv=e.target.closest&&e.target.closest('.okm-pv,.okm-mp');if(!pv)return;
  const to=e.relatedTarget;if(to&&to.closest&&to.closest('.okm-pv,.okm-mp')===pv)return;
  const hv=pv.closest('.okm-wrap').querySelector('.okm-hv');if(hv)hv.removeAttribute('d');
});
/* 549차: 점 → 행 역방향. 지도의 점에 올리면 현장 표·모달 목록의 그 행을 밝히고 목록은 보이는 자리로 굴린다 */
document.addEventListener('mouseover',e=>{
  const pin=e.target.closest&&e.target.closest('.okm-pin[data-sid]');if(!pin)return;
  $$('.kml-r.hov,#siteRoot tr.hov').forEach(x=>x.classList.remove('hov'));
  /* 550차: 모달이 열려 있으면 뒤의 표는 건드리지 않는다 — 가려진 줄을 밝히느라 바탕 층 전체가 다시 칠해졌다 */
  const sel=$('#mo.open #okmBigRoot')?'.kml-r[data-sid="'+pin.dataset.sid+'"]':'#siteRoot tr[data-sid="'+pin.dataset.sid+'"]';
  $$(sel).forEach(x=>{x.classList.add('hov');
    if(x.classList.contains('kml-r'))x.scrollIntoView({block:'nearest'});});
});
document.addEventListener('mouseout',e=>{
  const pin=e.target.closest&&e.target.closest('.okm-pin[data-sid]');if(!pin)return;
  $$('.kml-r.hov,#siteRoot tr.hov').forEach(x=>x.classList.remove('hov'));
});
function kmOpenBig(){
  S.km=S.km||{vb:{...KM_VB0},sel:'',hist:[]};S.kmOwn='';S.kmReg='';S.kmYr=[];S.kmTab='site';
  /* 552차: 모달에서 확대·필터한 것은 닫을 때 되돌린다 — 카드는 열기 전 상태로 */
  S.kmSnap={vb:{...S.km.vb},sel:S.km.sel,hist:S.km.hist.map(h=>({vb:{...h.vb},sel:h.sel}))};
  openModal('현장 지도','<div id="okmBigRoot"></div>','');
  $('#mb').classList.add('kmw');
  rOrgMap();
}
/* 582차: 점 확대/복원 — r 을 직접 바꾼다(원래 r 은 data-r 에) */
function kmPinHov(p,on){
  if(on){if(!p.dataset.r)p.dataset.r=p.getAttribute('r');p.setAttribute('r',(Number(p.dataset.r)*1.45).toFixed(2));p.classList.add('hov');}
  else{if(p.dataset.r)p.setAttribute('r',p.dataset.r);p.classList.remove('hov');}
}
/* 547차: 현장 표의 행에 마우스를 올리면 지도의 그 현장 점을 키우고 툴팁을 점 위에 띄운다.
   ⚠ 공용 툴팁(_tipFor)은 쓰지 않는다 — 행 안에서 움직일 때마다 mouseover 가 tipHide 를 부른다 */
function kmVisible(el){return !el.closest('#mo')||$('#mo').classList.contains('open');}   /* 닫힌 모달에 남은 지도는 뺀다 */
function kmHoverSite(sid){
  $$('.okm-pin.hov').forEach(p=>kmPinHov(p,false));
  const el=$('#htip');
  if(!sid){if(el&&!_tipFor)el.classList.remove('on');return;}
  /* 모달이 열려 있으면 카드·모달 양쪽에 같은 점이 있다 — 둘 다 키우고, 툴팁은 위에 떠 있는 쪽(마지막)에 */
  const pins=$$('.okm-pin[data-sid="'+sid+'"]').filter(kmVisible),pin=pins[pins.length-1];
  if(!pin)return;
  pins.forEach(p=>kmPinHov(p,true));
  if(!el||_tipFor)return;
  el.textContent=pin.dataset.tip||'';el.classList.add('on');
  const t=el.getBoundingClientRect(),r=pin.getBoundingClientRect();
  let x=r.left+r.width/2-t.width/2,y=r.top-t.height-8;
  if(y<6)y=r.bottom+8;
  el.style.left=Math.max(6,Math.min(x,innerWidth-t.width-6))+'px';el.style.top=y+'px';
}
const KM_ROW='#siteRoot tr[data-sid],.kml-r[data-sid]';   /* 548차: 모달의 목록 행도 같은 길 */
/* 551차: 계정 표의 행 → 그 사람이 맡은 현장 점을 모두 키운다(툴팁은 없다 — 여러 개라 어디에 띄울지 없다) */
function kmHoverOwner(pid){
  $$('.okm-pin.hov').forEach(p=>kmPinHov(p,false));
  if(!pid)return;
  const p=roster().find(x=>x.id===pid);if(!p)return;
  Object.keys(p.sites||{}).forEach(sid=>$$('.okm-pin[data-sid="'+sid+'"]').filter(kmVisible).forEach(e=>kmPinHov(e,true)));
}
document.addEventListener('mouseover',e=>{
  const tr=e.target.closest&&e.target.closest('#acctRoot tr[data-pid]');
  if(tr)kmHoverOwner(tr.dataset.pid);
});
document.addEventListener('mouseout',e=>{
  const tr=e.target.closest&&e.target.closest('#acctRoot tr[data-pid]');
  if(!tr)return;
  const to=e.relatedTarget;if(to&&to.closest&&to.closest('#acctRoot tr[data-pid]')===tr)return;
  kmHoverOwner(null);
});
document.addEventListener('mouseover',e=>{
  const tr=e.target.closest&&e.target.closest(KM_ROW);
  if(!tr)return;
  kmHoverSite(tr.dataset.sid);
});
document.addEventListener('mouseout',e=>{
  const tr=e.target.closest&&e.target.closest(KM_ROW);
  if(!tr)return;
  const to=e.relatedTarget;if(to&&to.closest&&to.closest(KM_ROW)===tr)return;
  kmHoverSite(null);
});
/* 547차: 시군구는 면 데이터가 없다(경계는 mesh 한 덩어리) — 커서 아래 시군구의 이름표만 강조한다 */
let _kmMv=0;
document.addEventListener('mousemove',e=>{
  const svg=kmSvgOf(e.target);
  if(!svg&&!_kmMv)return;
  const km=S.km;
  let key='';
  if(svg&&km&&km.sel){const q=kmMapXY(svg,e.clientX,e.clientY);const m=q&&kmMuniAt(km.sel,q[0],q[1]);if(m)key=km.sel+'|'+m.nm;}
  if(key===(_kmMv||''))return;
  _kmMv=key;
  /* 550차: 경계 svg 의 글자는 건드리지 않는다 — 겹층의 사본(.okm-hvt)에 자리·글자를 옮겨 적는다 */
  $$('.okm-wrap').forEach(w=>{const t=w.querySelector('.okm-hvt');if(!t)return;
    const src=key&&[...w.querySelectorAll('.okm-ct[data-m]')].find(x=>x.dataset.m===key);
    if(!src){t.textContent='';return;}
    t.setAttribute('x',src.getAttribute('x'));t.setAttribute('y',src.getAttribute('y'));t.setAttribute('style',src.getAttribute('style'));
    t.textContent=src.textContent;});
},{passive:true});
/* 지도에서 한 단계 되돌린다 — 우클릭·바다 클릭·뒤로 버튼이 모두 이리로 온다 */
function kmBack(){
  const km=S.km;if(!km)return;
  /* 601차: 이력이 비어도 한 번에 전체로 가지 않는다 — 시도 안에서 확대돼 있으면 먼저 그 시도 보기로 돌아간다
     (휠·모달 복원처럼 이력이 없는 확대에서 우클릭이 전체로 튀던 문제) */
  if(!km.hist.length&&km.sel){
    const box=kmZoomBox(km.sel);
    if(km.vb.w<box.w*0.98){km.vb=box;rOrgMap();return;}
  }
  const h=km.hist.pop();
  if(h){km.vb=h.vb;km.sel=h.sel;}else{km.vb={...KM_VB0};km.sel='';}
  rOrgMap();
}
function curTeam(){const ts=(S.org.teams||[]).filter(t=>t.name);return ts.find(t=>t.id===S.tk.t)||ts[0]||null;}
/* 조직 관리 권역 탭 — 업무 현황의 탭 줄과 같은 것을 쓴다. 현장 보기에서는 오른쪽 끝에 현장 추가(340차) */
function rOrgBar(tab){
  const bar=$('#orgBar');if(!bar)return;
  const regs=(S.org.regions||[]).filter(r=>r.name);
  const teamless=p=>!p.team||!(S.org.teams||[]).some(x=>x.id===p.team);
  const cnt=rid=>{
    if(tab==='site')return (S.org.sites||[]).filter(x=>x.name&&orgRegHit(x.region,rid)).length;
    const t=curTeam();
    /* 미배정은 팀에 속하지 않은 계정이라 팀 필터를 태우지 않는다(389차) */
    if(rid==='_blocked')return roster().filter(p=>p.role==='blocked').length;   /* 501차: 팀과 무관하게 전부 */
    if(rid==='_free')return roster().filter(p=>p.role!=='blocked'&&teamless(p)).length;
    return roster().filter(p=>(t?p.team===t.id:true)&&orgTabHit(p,rid)).length;
  };
  /* 계정 보기에는 '인수 전 현장' 권역이 없다 — 사람이 배정되지 않는 자리다.
     대신 업무 현황처럼 직급 탭(팀장·원가 등)을 앞에 둔다(341차) */
  const isPre=r=>/미인수|인수\s*전/.test(r.name||'');
  const useRegs=tab==='site'?regs:regs.filter(r=>!isPre(r));
  const tabs=[['','전체']];
  if(tab!=='site'){
    const t0=curTeam();
    const heads=roster().filter(p=>(t0?p.team===t0.id:true)&&isTeamRank(p.rank))
      .sort((a,b)=>rankOrd(a.rank)-rankOrd(b.rank)||String(a.name).localeCompare(String(b.name),'ko'));
    const rk={};heads.forEach(p=>{const r=rankLabel(p.rank)||'담당';rk[r]=(rk[r]||0)+1;});
    heads.forEach(p=>{const r=rankLabel(p.rank)||'담당';tabs.push(['rank:'+p.id,rk[r]>1?r+' '+p.name:r]);});
  }
  useRegs.forEach(r=>tabs.push([r.id,r.name]));
  if(cnt('_none'))tabs.push(['_none','권역 미지정']);
  if(tab!=='site'&&cnt('_free'))tabs.push(['_free','미배정']);   /* 팀에 아직 넣지 않은 계정(389차) */
  if(tab!=='site'&&cnt('_blocked'))tabs.push(['_blocked','차단']);   /* 501차 */
  if(!tabs.some(x=>x[0]===S.orgReg))S.orgReg='';
  bar.innerHTML='<div class="rp-tabs tkm-tabs tkbar-tabs" data-sbx>'+tabs.map(([id,nm])=>
      '<button class="rp-tab'+(id===S.orgReg?' on':'')+'" data-act="org.reg" data-id="'+esc(id)+'">'
      +esc(nm)+'<span class="rp-tcnt">'+cnt(id)+'</span></button>').join('')+'</div>'
    +(tab==='site'?'<button class="btn bo bsm tkq-add" data-act="org.addSite"><svg class="icn"><use href="#i-plus"></use></svg> 현장 추가</button>':'');
}
/* 권역 탭 적중 — ''(전체) · 권역 id · '_none'(등록된 권역이 없는 것) */
function orgRegHit(rid,tab){
  if(!tab)return true;
  if(String(tab).indexOf('rank:')===0)return false;   /* 직급 탭은 현장에 쓰지 않는다 */
  const ok=(S.org.regions||[]).some(r=>r.id===rid);
  return tab==='_none'?!ok:rid===tab;
}
/* 계정 탭 적중 — 직급 탭(rank:<uid>)이면 그 사람만, 그 외는 권역으로 */
function orgTabHit(p,tab){
  if(tab==='_blocked')return p.role==='blocked';
  if(p.role==='blocked')return false;   /* 501차: 차단 계정은 다른 탭에 섞이지 않는다 */
  if(!tab)return true;
  if(String(tab).indexOf('rank:')===0)return p.id===tab.slice(5);
  if(isTeamRank(p.rank))return false;   /* 팀장·원가는 권역 탭에 섞지 않는다 */
  return orgRegHit(p.region,tab);
}
function rOrg(){
  const t=curTeam();
  /* 제목 옆 팀명은 사이드바 팀 선택기와 겹쳐 지웠다 — 라벨은 비우되 t 는 아래에서 계속 쓴다 */
  ['#regTeamLbl','#siteTeamLbl','#acctTeamLbl'].forEach(id=>{const e=$(id);if(e)e.textContent='';});
  const tr=$('#teamRoot'),rr=$('#regRoot'),sr=$('#siteRoot');
  if(tr)tr.innerHTML=teamRows();
  if(rr)rr.innerHTML=regRows();
  if(sr)sr.innerHTML=siteTable();
  rOrgMap();
  /* 계정/현장 보기 상태 */
  const tab=S.orgTab||'acct';
  const ap=$('#acctPane'),sp=$('#sitePane');
  if(ap)ap.style.display=tab==='acct'?'':'none';
  if(sp)sp.style.display=tab==='site'?'':'none';
  $$('.orgseg button').forEach(b=>b.classList.toggle('act',b.dataset.t===tab));
  rOrgBar(tab);
  rTeamSel();

  const ar=$('#acctRoot');if(!ar)return;
  const all=roster();
  /* 차단 계정도 이 표에는 남긴다 — roster() 는 담당자 선택·배정용이라 차단을 빼는데,
     여기서까지 빠지면 차단을 UI 에서 되돌릴 길이 없다(Firebase 콘솔로 가야 했다).
     관리자에게만 보인다 — 사용자 화면에서는 굳이 노출하지 않는다 */
  if(isEditor())Object.keys(S.accounts||{}).forEach(bid=>{
    const a=S.accounts[bid]||{};
    if(a.role!=='blocked'||all.some(p=>p.id===bid))return;
    const bp=(S.people||{})[bid]||{};
    all.push({id:bid,name:a.name||bp.name||String(a.email||'').split('@')[0]||'이름없음',
      email:a.email||bp.email||'',team:bp.team||'',region:bp.region||'',sites:bp.sites||{},
      rank:rankOf(bp.rank),role:'blocked',acct:true});
  });
  if(!all.length){
    ar.innerHTML='<div class="set-empty">'+(!S.live
      ? '로컬 모드에서는 계정 목록이 없습니다.'
      : (S.acctDenied
        ? '계정 목록을 읽을 권한이 없습니다. Firebase 규칙에서 users 노드 읽기를 허용하세요.'
        : '아직 로그인한 계정이 없습니다.'))+'</div>';
    rFilter();return;
  }
  /* 팀은 사이드바에서 고르므로 표에서 팀 열은 없앤다 —
     선택한 팀 소속과 아직 팀이 없는 계정만 보여주고, 소속은 버튼으로 넣고 뺀다 */
  /* 탭 적용(340차·341차). '미배정' 탭을 고르면 팀 소속은 감추고 아래 미배정 묶음만 남긴다(389차) */
  const mine=(S.orgReg==='_free'||S.orgReg==='_blocked')?[]:(t?all.filter(p=>p.team===t.id||p.local):[]).filter(p=>orgTabHit(p,S.orgReg));
  const free=(S.orgReg==='_blocked')
    ? all.filter(p=>p.role==='blocked')   /* 501차: 차단 탭 — 팀과 무관하게 모아 본다 */
    : all.filter(p=>!p.local&&p.role!=='blocked'&&(!p.team||!(S.org.teams||[]).some(x=>x.id===p.team)));
  const myUid=S.user?S.user.uid:'';
  const editors=all.filter(p=>p.role==='editor');
  /* 팀장 → 공구장 → 담당자 순, 같은 직급 안에서는 이름순 */
  const rankOrd={head:0,lead:1,member:2};
  const sortFn=(a,b)=>{
    const ra=rankOrd[rankOf(a.rank)]??2,rb=rankOrd[rankOf(b.rank)]??2;
    if(ra!==rb)return ra-rb;
    return String(a.name||'').localeCompare(String(b.name||''),'ko');};
  mine.sort(sortFn);free.sort(sortFn);
  const regOpt=sel=>'<option value="">권역 —</option>'+(S.org.regions||[]).map(x=>'<option value="'+esc(x.id)+'"'+(x.id===sel?' selected':'')+'>'+esc(x.name)+'</option>').join('');
  const roleOpt=(v,txt,cur)=>'<option value="'+v+'"'+(cur===v?' selected':'')+'>'+txt+'</option>';
  const sitesOf=p=>sitesChkHTML(p);   /* 628차: 내 계정과 공용 — 전역으로 승격 */
  const roleCtl=p=>{
    const role=p.role||'viewer',rc='r-'+role,isMe=p.id===myUid,lastEd=role==='editor'&&editors.length<=1;
    const lock=isMe?'본인 권한은 스스로 바꿀 수 없습니다':(lastEd?'마지막 관리자는 강등할 수 없습니다':'');
    const off=(!isEditor()||isMe||lastEd);   /* 429차: 배지 대신 다른 행과 같은 선택창 — 잠긴 행은 disabled */
    return '<select class="fbu-sel" data-act="acct.role" data-id="'+esc(p.id)+'" aria-label="권한"'
      +(off?' disabled'+(lock?' data-tip="'+lock+'"':''):'')+'>'
      +roleOpt('editor','관리자',role)+roleOpt('viewer','사용자',role)+roleOpt('blocked','차단',role)+'</select>';
  };
  const teams=(S.org.teams||[]).filter(t=>t.name);
  const teamCtl=p=>{
    if(!isEditor()||!teams.length)return '<span class="rk-fix">'+esc((teams.find(t=>t.id===p.team)||{}).name||'미배정')+'</span>';
    return '<select class="mg-inp" data-act="acct.set" data-f="team" data-id="'+esc(p.id)+'" aria-label="팀">'
      +teams.map(t=>'<option value="'+esc(t.id)+'"'+(t.id===p.team?' selected':'')+'>'+esc(t.name)+'</option>').join('')
      +'<option value=""'+(p.team?'':' selected')+'>미배정</option>'   /* 팀에서 빼면 아래 미배정 카드로 내려간다 */
      +'</select>';
  };
  const canRank=isEditor();   /* 627차: 직급 배정은 관리자만 — 규칙(people 쓰기 EDITOR·본인)과 일치 */
  const rankOpt=cur=>RANKS.map(([v,l])=>'<option value="'+v+'"'+(v===rankOf(cur)?' selected':'')+'>'+l+'</option>').join('');
  const rankCtl=p=>canRank
    ? '<select class="mg-inp" data-act="acct.set" data-f="rank" data-id="'+esc(p.id)+'" aria-label="직급">'+rankOpt(p.rank)+'</select>'
    : '<span class="rk-fix">'+esc(rankLabel(p.rank))+'</span>';
  const row=p=>{
    const u=rankUses(p.rank);
    return `<tr data-pid="${esc(p.id)}">
      <td><div class="utbl-name">${avHTML(p.id)}
        <div style="min-width:0"><div class="utbl-nick${p.id===myUid?' me':''}">${esc(p.name)}</div><div class="utbl-mail">${esc(p.email||'')}</div></div></div></td>
      <td>${teamCtl(p)}</td>
      <td>${rankCtl(p)}</td>
      <td>${u.region
        ?(canAssignRegion()
          ?'<select class="mg-inp" data-act="acct.set" data-f="region" data-id="'+esc(p.id)+'" aria-label="권역">'+regOpt(p.region)+'</select>'
          :'<span class="rk-fix">'+esc((S.org.regions||[]).find(r=>r.id===p.region)?.name||'권역 —')+'</span>')
        :''}</td>
      <td>${u.sites?sitesOf(p):''}</td>
      <td class="utbl-r">${roleCtl(p)}</td>
    </tr>`;
  };
  /* '미배정' 탭을 고르면 팀 소속 표는 아예 감춘다(389차) — 빈 표만 남아 어수선했다 */
  const freeOnly=(S.orgReg==='_free'||S.orgReg==='_blocked');
  /* ⚠ 안(#acctRoot)만 비우면 빈 카드의 테두리가 가로선으로 남는다 — 카드째 감춘다(389차) */
  const acard=ar.closest('.card');if(acard)acard.style.display=freeOnly?'none':'';
  ar.style.display=freeOnly?'none':'';
  paintHTML(ar,freeOnly?'':'<table class="utbl"><thead><tr><th style="width:200px">이름</th><th style="width:142px">팀</th><th style="width:96px">직급</th><th style="width:106px">권역</th><th>담당 현장</th><th class="utbl-r" style="width:120px">권한</th></tr></thead><tbody>'
    +(mine.length?mine.map(row).join('')
      :'<tr><td colspan="6" style="font-size:12px;color:var(--lbl3);padding:10px">이 팀에 배정된 계정이 없습니다.</td></tr>')
    +'</tbody></table>');
  /* 팀 미배정 계정 — 섞어 두면 헷갈린다는 지적에 따라 별도 카드로 분리 */
  const fc=$('#freeCard'),fr=$('#freeRoot');
  if(fc&&fr){
    /* 미배정 계정은 '미배정' 탭에서만 보여 준다(389차) — 다른 탭에도 나오면 탭을 만든 뜻이 없다 */
    fc.style.display=(free.length&&(S.orgTab||'acct')==='acct'&&(S.orgReg==='_free'||S.orgReg==='_blocked'))?'':'none';   /* 501차: 차단 탭도 이 자리에 그린다 */
    paintHTML(fr,free.length
      ?'<table class="utbl"><thead><tr><th style="width:176px">이름</th><th style="width:142px">팀</th><th></th><th class="utbl-r" style="width:120px">권한</th></tr></thead><tbody>'
        +free.map(p=>`<tr>
          <td><div class="utbl-name">${avHTML(p.id)}
            <div style="min-width:0"><div class="utbl-nick">${esc(p.name)}</div><div class="utbl-mail">${esc(p.email||'')}</div></div></div></td>
          <td>${teamCtl(p)}</td>
          <td></td>
          <td class="utbl-r">${roleCtl(p)}</td>
        </tr>`).join('')
        +'</tbody></table>'
      :'');
  }
  rFilter();
}
/* 하자처리 현황 게시본 → 이 앱의 조직·현장 모양으로 바꾼다(가져오기와 같은 규칙).
   ⚠ 권역은 저쪽이 '이름 문자열'로 다루므로 이름을 그대로 id 로 삼는다 */
let ORG_LIVE=false,ORG_RM='';   /* ORG_LIVE 는 스냅샷 문서(dfSnapBoot)만 켠다 — 614차 역전 이후 실사용 없음(호환 잔존) */
/* arrOf 삭제(614차) — _dash 구독 제거(조직 원본 역전)로 사용처가 사라졌다 */
/* 하자처리 현황 게시본이 현장 주소를 실어 보내면 지도가 그걸 먼저 쓴다(539차).
   ⚠ S.org.sites 에는 넣지 않는다 — DB 규칙이 정해진 필드만 허용해 쓰기가 통째로 거부된다.
   지금 게시본에 주소가 있는지는 확인하지 못했다. 없으면 이 표는 비고 현장명으로 돌아간다. */
const SITE_ADDR={};
/* orgFromDash 삭제(614차) — 조직 원본 역전으로 _dash 를 조직 소스로 읽지 않는다. 게시용 역변환은 dfOrgToDashSites/Teams. */
function orgSave(){
  /* ⚠ 614차 조직 원본 역전: calapp/org 가 원본이므로 여기서 저장한다. 스냅샷 문서만 읽기 전용. */
  if(S.snap){toast('스냅샷 문서에서는 저장되지 않습니다');rOrg();return;}
  normOrg(S.org);store.putOrg(S.org);if(!S.live){rOrg();rTasks();}
}
function rCfg(){rBk();dfProdCardFill();}   /* 614차: 하자 게시 카드(관리자 전용) 상태 갱신 */

/* ═══════════ 백업 ═══════════
   ⚠ 브라우저는 아무 폴더에나 쓸 수 없다 — 그래서 **위젯이 대신 쓴다.**
   위젯이 주기적으로 `window.bkExport()` 를 불러 받아 간 내용을
   `문서\H 주요업무현황\backup\hplan_YYMMDD.json` 으로 저장하고, 끝나면 `window.bkNote()` 로 알려 준다.
   위젯을 쓰지 않는 관리자를 위해 '지금 내보내기'(내려받기)와 '되돌리기'는 그대로 둔다. */
const BK_LAST='calapp.backup.last';
function bkKey(){return BK_LAST+'.'+((S.user&&S.user.uid)||'local');}
function bkStamp(d){
  const t=d||new Date();
  return String(t.getFullYear()).slice(2)+pad(t.getMonth()+1)+pad(t.getDate());
}
function bkData(){
  return JSON.stringify({
    kind:'hplan-backup',ver:APP_VER,savedAt:new Date().toISOString(),
    org:S.org,people:S.people,tasks:S.tasks,cfg:S.cfg
  },null,1);
}
/* ═══════════ 위젯 알림 창구 ═══════════
   위젯(트레이 상주)만이 윈도우 알림을 띄울 수 있다 — 앱은 '무엇을 알릴지'만 넘긴다.
   ⚠ 로그인 전·자료 수신 전에는 아무것도 내주지 않는다(빈 알림이 뜨면 신뢰를 잃는다) */
/* 알림 켜짐 여부 — 윈도우 알림을 폐지한 뒤로는 앱 알림창의 오후 점검 하나만 제어한다.
   ⚠ 저장 키(c.noti)는 그대로 둔다 — 이미 꺼 둔 사람의 설정이 살아 있어야 한다 */
function notiOn(){
  try{const c=JSON.parse(localStorage.getItem(WID_KEY)||'{}');return c.noti!==false;}catch(e){return true;}
}
/* ═══════════ 윈도우 알림 폐지(252차) ═══════════
   위젯이 띄우던 토스트는 둘뿐이었다 — ①부팅 직후 '오늘 업무' ②부름(멘션).
   ②는 부름 기능과 함께 사라졌고, ①도 필요 없다는 판단으로 껐다.
   업무 알림은 이제 앱 알림창(오후 점검)이 맡는다.
   ⚠ 아래 두 껍데기는 지우면 안 된다 — 팀원 PC 에 이미 깔린 위젯(Rust)이
   부팅 뒤 45·150초에 bootBrief 를, 30초마다 newMentions 를 계속 부른다.
   null / 빈 배열을 돌려주면 위젯은 조용히 넘어간다. Rust 쪽은 다음 위젯 빌드 때 함께 걷힌다 */
window.bootBrief=function(){return null;};
window.newMentions=function(){return[];};
/* 위젯이 부르는 창구 — 관리자 계정이고 자료가 다 와 있을 때만 내준다 */
window.bkExport=function(){
  if(!S.live||!isEditor())return null;
  if(!S.tasks||!Object.keys(S.tasks).length)return null;   /* 아직 안 받았으면 빈 백업을 만들지 않는다 */
  return {name:'hplan_'+bkStamp()+'.json',text:bkData()};
};
/* 위젯이 저장을 마치면 알려 준다 */
window.bkNote=function(name){
  try{localStorage.setItem(bkKey(),JSON.stringify({at:new Date().toISOString(),name:String(name||''),by:'위젯'}));}catch(e){}
  rBk();
};
function bkDownload(name,text){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));
  a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);
}
function rBk(){
  const card=$('#bkCard');if(card)card.style.display=isEditor()?'':'none';
}
/* ═══════════ 우클릭 메뉴 · 툴팁 ═══════════
   원칙 ①입력칸·글자를 고르는 중에는 브라우저 기본 메뉴를 그대로 둔다
        ②필터·설정 팝업과 같은 시각 문법을 쓴다
        ③데스크톱 위주 — 모바일 길게 누르기는 기기마다 달라 건드리지 않는다 */
/* ⚠ 달력 '칸'의 내용·클래스는 이벤트만 새로 받아서는 안 바뀐다 — 칸을 다시 그리게 한다 */
function calRerender(){try{if(CAL){CAL.refetchEvents();CAL.render();}}catch(e){}}
const mdLabel=ds=>{const t=toDate(ds);return (t.getMonth()+1)+'월 '+t.getDate()+'일';};
let _ctxEl=null,_ctxEsc=null,_ctxDown=null;
function closeCtx(){
  if(!_ctxEl)return;
  _ctxEl.remove();_ctxEl=null;
  if(_ctxDown){document.removeEventListener('mousedown',_ctxDown,true);_ctxDown=null;}
  document.removeEventListener('scroll',closeCtx,true);
  removeEventListener('blur',closeCtx);
  if(_ctxEsc){document.removeEventListener('keydown',_ctxEsc);_ctxEsc=null;}
}
/* 표를 탭 구분 텍스트로 — 엑셀에 그대로 붙는다 */
function tblText(tbl){
  if(!tbl)return '';
  return [...tbl.querySelectorAll('tr')].map(tr=>
    [...tr.querySelectorAll('th,td')].map(td=>String(td.textContent||'').trim()).join('\t')).join('\n');
}
function openCtx(x,y,items,anchor){
  /* anchor: 메뉴를 연 버튼. mousedown 닫기가 이 버튼 위에서 먼저 발동하면 click 의 토글 분기가
     '이미 닫힘'을 보고 다시 열어 — 아무리 눌러도 계속 열려 있게 된다(게시월 토글이 안 되던 원인).
     anchor 위 mousedown 은 닫지 않고, click 쪽 토글이 닫는다. */
  closeCtx();
  const list=items.filter(Boolean);
  if(!list.length)return;
  const el=document.createElement('div');
  el.className='ctxmenu';el.setAttribute('role','menu');
  el.innerHTML=list.map((it,i)=>it.sep
    ?'<div class="ctx-sep"></div>'
    :'<button class="ctx-it'+(it.danger?' dg':'')+(it.on?' on':'')+(it.check?' chk':'')+'" role="menuitem" data-ci="'+i+'">'
      +(it.check?'<span class="ctx-k"><svg class="icn" aria-hidden="true"><use href="#i-check"></use></svg></span>':'')
      +esc(it.label)+'</button>').join('');   /* it.on: 현재 값(575차) · it.check: 체크 상자(602차) */
  document.body.appendChild(el);
  const r=el.getBoundingClientRect();
  el.style.left=Math.max(6,Math.min(x,innerWidth-r.width-8))+'px';
  el.style.top=Math.max(6,Math.min(y,innerHeight-r.height-8))+'px';
  el.addEventListener('click',e=>{
    const b=e.target.closest('.ctx-it');if(!b)return;
    e.stopPropagation();
    const it=list[Number(b.dataset.ci)];closeCtx();
    if(it&&it.act)it.act();
  });
  el.addEventListener('contextmenu',e=>e.preventDefault());
  _ctxEl=el;
  /* ⚠ 닫기는 click 이 아니라 **mousedown 캡처**로 듣는다 — FullCalendar 가 달력 칸의 click 을 삼켜
     달력 위를 눌렀을 때 메뉴가 안 닫혔다(129~143차와 같은 함정).
     ⚠ 위젯은 창이 곧 화면이라, 다른 창으로 옮겨 가면 페이지에 클릭이 오지 않는다 — blur 로도 닫는다 */
  _ctxDown=e=>{if(!e.target.closest)return;
    if(e.target.closest('.ctxmenu'))return;
    if(anchor&&(e.target===anchor||anchor.contains(e.target)))return;   /* 토글은 click 이 맡는다 */
    closeCtx();};
  setTimeout(()=>{document.addEventListener('mousedown',_ctxDown,true);
    document.addEventListener('scroll',closeCtx,true);addEventListener('blur',closeCtx);},0);
  _ctxEsc=e=>{if(e.key==='Escape')closeCtx();};
  document.addEventListener('keydown',_ctxEsc);
}
function copyText(t,msg){
  const done=()=>toast(msg||'복사했습니다');
  if(navigator.clipboard&&navigator.clipboard.writeText)
    navigator.clipboard.writeText(String(t)).then(done).catch(()=>toast('복사 실패'));
  else{const ta=document.createElement('textarea');ta.value=String(t);document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');done();}catch(e){toast('복사 실패');}ta.remove();}
}
/* 우클릭 대상 — 달력 날짜 칸 · 업무 막대 · 업무 카드 · 미처리 목록(엑셀식 열 메뉴) */
/* 704차: 모바일 달력 제스처 — 좌우 스와이프 = 월 이동(‹ › 없음), 위로 = 점 달력+패널, 아래로(패널 맨 위·점 달력) = 큰 달력.
   편집 중(입력 상자)에는 안 잡는다. 700ms 넘는 느린 움직임·대각선은 무시
   733차: 폰 세로(미니 격자)는 **손가락을 따라간다** — 가로는 3장 트랙(.mc-track)을 transform 으로 끌고, 세로는 셀 높이(--mch)를
   46px↔전체 사이에서 보간하며 점↔막대·패널을 --mcp 로 섞는다. 놓으면 거리·속도로 스냅. 가로(mcal-land)·태블릿은 예전 방식 그대로. */
(function(){
  let sx=0,sy=0,st=0,tgt=null,dpTop=-1;
  /* ── 폰 미니 격자 드래그 상태 */
  let drag=null;   /* {axis:'x'|'y', track, box, w, h0, from} */
  const phone=()=>isMob()&&!WIDGET&&!mcalIsLand()&&S.view==='calendar';
  const track=()=>$('#calMini .mc-track');
  function dragEnd(){document.body.classList.remove('mcal-drag','mcal-settle');S.mcalDrag=false;const b=$('#view-calendar');if(b){b.style.removeProperty('--mch');b.style.removeProperty('--mcp');}drag=null;}
  document.addEventListener('touchstart',e=>{
    tgt=null;if(WIDGET||S.view!=='calendar')return;   /* 705차: 태블릿(터치·넓은 화면)도 좌우 스와이프로 월 이동 — 상하 전환은 폰만 */
    const t=e.touches[0];sx=t.clientX;sy=t.clientY;st=Date.now();tgt=e.target;
    const body=tgt.closest&&tgt.closest('#view-calendar .dp-body');dpTop=body?body.scrollTop:-1;
    if(drag)dragEnd();
    const tr=track();if(tr){tr.classList.remove('snap');tr.style.transform='';}
  },{passive:true});
  document.addEventListener('touchmove',e=>{
    if(!tgt||!tgt.closest||!phone()||!CAL)return;
    if(tgt.closest('input,textarea,select,[contenteditable],#ymPop,.pe-wrap,.plan-ed,#mo,#calFilt'))return;
    const t=e.touches[0],dx=t.clientX-sx,dy=t.clientY-sy;
    const inCal=!!tgt.closest('#calMini'),inDp=!!tgt.closest('#view-calendar .dp-col');
    if(!drag){
      if(Math.abs(dx)<8&&Math.abs(dy)<8)return;
      if(!inCal&&!inDp)return;
      if(Math.abs(dx)>Math.abs(dy)){   /* 가로 = 월 트랙 끌기(격자 위에서만) */
        if(!inCal)return;
        const tr=track();if(!tr)return;
        drag={axis:'x',track:tr,w:tr.parentElement.clientWidth};
      }else{   /* 세로 = 셀 높이 보간. 큰 달력에서 위로 · 점 달력(또는 패널 맨 위)에서 아래로 */
        const mode=S.mcal;
        if(!(inCal&&((mode==='full'&&dy<0)||(mode==='mini'&&dy>0)))&&!(inDp&&mode==='mini'&&dy>0&&dpTop<=0))return;
        const box=$('#view-calendar');if(!box)return;   /* 변수는 달력·패널 공통 조상에 — 패널(.dp-col)이 #calMini 의 형제라 거기 두면 안 닿는다 */
        drag={axis:'y',box,from:mode,h0:mode==='full'?mcalFullH():MCAL_MINI_H};
        document.body.classList.add('mcal-drag');S.mcalDrag=true;   /* redraw(resize) 가 mcalSet 으로 드래그 상태를 지우지 않게 — iOS 는 끌던 중 주소창 접힘으로 resize 가 온다 */
      }
    }
    e.preventDefault();
    if(drag.axis==='x'){
      drag.track.style.transform='translateX(calc(-33.3333% + '+Math.round(dx)+'px))';
    }else{
      const full=mcalFullH(),mini=MCAL_MINI_H;
      const h=Math.max(mini,Math.min(full,drag.h0+dy/6));   /* 6줄이 함께 늘므로 달력 전체 높이가 손가락과 1:1 로 따라간다 */
      const p=(h-mini)/Math.max(1,full-mini);
      drag.box.style.setProperty('--mch',h.toFixed(1)+'px');
      drag.box.style.setProperty('--mcp',p.toFixed(3));
    }
  },{passive:false});
  document.addEventListener('touchend',e=>{
    if(!tgt||!tgt.closest)return;
    if(tgt.closest('input,textarea,select,[contenteditable],#ymPop,.pe-wrap,.plan-ed,#mo'))return;
    const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy,dt=Date.now()-st;tgt0=tgt;tgt=null;
    if(drag){   /* 폰 미니 격자 — 스냅 */
      const d=drag;
      if(d.axis==='x'){
        const v=Math.abs(dx)/Math.max(1,dt);   /* px/ms */
        const go=(Math.abs(dx)>d.w*0.25||v>0.35)&&Math.abs(dx)>24?(dx<0?1:-1):0;
        const tr=d.track;drag=null;
        tr.classList.add('snap');
        tr.style.transform=go?'translateX('+(go>0?'-66.6667%':'0%')+')':'';
        if(!go)return;
        let fired=false;const fin=()=>{if(fired)return;fired=true;tr.removeEventListener('transitionend',fin);
          /* 다음 달로 그리면 새 트랙이 -33.33% 로 서고 가운데 장 = 방금 보던 옆 장 — 이음매 없음 */
          if(go>0)CAL.next();else CAL.prev();};
        tr.addEventListener('transitionend',fin);setTimeout(fin,360);
        return;
      }
      /* 세로 — 진행률·속도로 목표를 정하고 그 높이까지 애니메이션한 뒤 모드를 확정한다 */
      const full=mcalFullH(),mini=MCAL_MINI_H;
      const cur=parseFloat(d.box.style.getPropertyValue('--mch'))||d.h0;
      const p=(cur-mini)/Math.max(1,full-mini);
      const vy=dy/Math.max(1,dt);   /* px/ms — 0.35 넘으면 방향대로 */
      let target=p>0.5?'full':'mini';
      if(Math.abs(vy)>0.35)target=vy>0?'full':'mini';
      const toH=target==='full'?full:mini;
      document.body.classList.remove('mcal-drag');document.body.classList.add('mcal-settle');
      d.box.style.setProperty('--mch',cur+'px');
      requestAnimationFrame(()=>{d.box.style.setProperty('--mch',toH+'px');d.box.style.setProperty('--mcp',target==='full'?'1':'0');});
      let fired=false;const fin=()=>{if(fired)return;fired=true;document.body.classList.remove('mcal-settle');drag=null;S.mcalDrag=false;mcalSet(target);};
      setTimeout(fin,Math.abs(toH-cur)<1?0:340);
      drag=null;
      return;
    }
    if(dt>700||!CAL)return;
    const inCal=!!tgt0.closest('#view-calendar .cal-card'),inDp=!!tgt0.closest('#view-calendar .dp-col');
    if(!inCal&&!inDp)return;
    if(phone())return;   /* 733차: 폰 세로는 위 드래그 경로가 전부 맡는다 */
    if(Math.abs(dx)>60&&Math.abs(dy)<40){if(dx<0)CAL.next();else CAL.prev();return;}
    if(!isMob())return;
    if(Math.abs(dy)>50&&Math.abs(dx)<40){
      if(mcalIsLand()){const d=$('#view-calendar .dp-col');if(d&&inDp&&dy>0&&dpTop<=0)d.classList.remove('on');return;}
    }
  },{passive:true});
  document.addEventListener('touchcancel',()=>{tgt=null;if(drag){const tr=track();if(tr){tr.classList.add('snap');tr.style.transform='';}dragEnd();}},{passive:true});
  let tgt0=null;
})();
/* 696차: 모바일엔 우클릭이 없다 — 조직 관리 행을 550ms 길게 누르면 같은 메뉴. 손가락이 8px 넘게 움직이면 취소(스크롤) */
let _orgLpT=0,_orgLpXY=null;
document.addEventListener('touchstart',e=>{
  const t=e.target;if(!t.closest||!t.closest('#acctRoot .utbl tr[data-pid],#siteRoot .mgtbl tr[data-sid]')||t.closest('input,select,button,label'))return;
  const p=e.touches[0];_orgLpXY=[p.clientX,p.clientY];clearTimeout(_orgLpT);
  _orgLpT=setTimeout(()=>{const items=ctxFor(t);if(!items||!items.length)return;if(navigator.vibrate)navigator.vibrate(10);openCtx(_orgLpXY[0],_orgLpXY[1],items);},550);
},{passive:true});
document.addEventListener('touchmove',e=>{if(!_orgLpXY)return;const p=e.touches[0];if(Math.hypot(p.clientX-_orgLpXY[0],p.clientY-_orgLpXY[1])>8){clearTimeout(_orgLpT);_orgLpXY=null;}},{passive:true});
document.addEventListener('touchend',()=>{clearTimeout(_orgLpT);_orgLpXY=null;},{passive:true});
document.addEventListener('contextmenu',e=>{
  const t=e.target;
  if(t.closest('input,textarea,select'))return;              /* 입력칸은 기본 메뉴 */
  if(String(getSelection()||'').trim())return;               /* 글자를 고르는 중이면 기본 메뉴 */
  /* 목록 열 머리 — 원본과 같은 엑셀식 값 선택 메뉴(rlMenu). ctx 메뉴가 아니라 자체 팝업이라 앞단에서 연다 */
  const th=t.closest('.rec-tbl thead th[data-k]');
  if(th&&!PIV.on){e.preventDefault();closeCtx();recOpenMenu(th.dataset.k,e.clientX,e.clientY);return;}
  const items=ctxFor(t);
  if(!items||!items.length)return;
  e.preventDefault();
  recCloseMenu();
  openCtx(e.clientX,e.clientY,items);
});
/* rlMenu 닫기 — 원본 app-boot 942·946 과 동일: 바깥 mousedown · Esc */
document.addEventListener('mousedown',e=>{if(REC._menu&&!e.target.closest('#rlMenu'))recCloseMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&REC._menu){e.stopImmediatePropagation();e.preventDefault();recCloseMenu();}},true);
function ctxFor(t){
  /* ⓪-0 피벗 셀 — 드릴다운(해당 조합의 원본 목록) + 값 복사 */
  const ptd=t.closest('.pv-table td');
  if(ptd&&PIV.on){
    const tr=ptd.closest('tr');
    let rp=null;try{rp=tr&&tr.dataset.rp?JSON.parse(tr.dataset.rp):null;}catch(e){}
    const cvv=(ptd.dataset.cv!=null&&PIV.col)?ptd.dataset.cv:null;
    const items=[];
    if(rp||cvv!=null){
      items.push({label:'해당 목록 보기',act:()=>{
        /* 피벗의 '(빈값)' 은 목록 필터의 '(미기재)' 와 같은 값이다 */
        const put=(k,v)=>{REC.vals[k]={[v==='(빈값)'?'(미기재)':String(v)]:true};};
        if(rp)rp.forEach((v,i)=>{const k=PIV.rows[i];if(k)put(k,v);});
        if(cvv!=null)put(PIV.col,cvv);
        PIV.on=false;REC.filterRow=true;recRender();   /* 원본과 동일 — 필터행을 함께 펼쳐 조건이 보이게 */
        toast('피벗 조건으로 필터됨 · 열 머리 우클릭으로 해제');
      }});
      items.push({sep:true});
    }
    items.push({label:'값 복사',act:()=>copyText(ptd.textContent.trim())});
    return items;
  }
  /* ⓪-1 목록 본문 셀 — 원본 ② '이 값으로 필터 / 제외 / 복사'(app-data 1383~) */
  const rtd=t.closest('#mbody .rec-tbl tbody td');
  if(rtd&&!PIV.on){
    const cols=recVisCols(),ci=rtd.cellIndex;          /* 0번은 No 열 */
    const col=ci>0?cols[ci-1]:null;
    const v=rtd.textContent;
    const short=v.length>14?v.slice(0,14)+'…':(v||'(미기재)');
    const items=[];
    if(col){
      items.push({label:'"'+short+'" 값으로 필터',act:()=>{REC.vals[col.k]={[v||'(미기재)']:1};REC.filterRow=true;recRender();}});
      items.push({label:'"'+short+'" 제외',act:()=>{
        const cur=REC.vals[col.k];const o={};
        (cur&&Object.keys(cur).length?Object.keys(cur):recDistinct(col.k)).forEach(x=>o[x]=1);
        delete o[v||'(미기재)'];REC.vals[col.k]=o;REC.filterRow=true;recRender();}});
      items.push({sep:true});
    }
    items.push({label:'셀 값 복사',act:()=>copyText(v)});
    items.push({label:'표 전체 복사',act:()=>recCopy()});
    return items;
  }
  /* ⓪-2 대시보드 '현장별 하자처리 현황' 행 · 사이드바 현장 항목 — 원본 ③⑤: 현장 열기·목록 바로가기.
     사이드바 트리 항목은 .nvi.df-site — 컨테이너가 회차마다 바뀔 수 있어 클래스로 직접 잡는다 */
  const siteEl=t.closest('#dfDashTbl [data-act="df.site"][data-sid], .df-site[data-sid]');
  if(siteEl){
    const sid=siteEl.dataset.sid;
    const row=t.closest('tr');
    return[
      {label:'현장 열기',act:()=>{S.dfSid=sid;S.dfTab='sum';go('defect');}},
      {sep:true},
      {label:'미처리 목록',act:()=>recOpen(sid,'ul')},
      {label:'장기미처리 목록',act:()=>recOpen(sid,'lul')},
      {sep:true},
      row?{label:'셀 값 복사',act:()=>copyText((t.closest('td')||row).textContent.trim())}:null,
      row?{label:'표 복사',act:()=>copyText(tblText(row.closest('table')),'표를 복사했습니다')}:null
    ].filter(Boolean);   /* openCtx 는 null 항목을 거르지 않는다 — 넣으면 메뉴가 통째로 죽는다 */
  }
  /* 718차: 민원 세대 표 머리 우클릭 — 필터 줄 켜기/끄기·필터 지우기·정렬 초기화(목록보기와 같은 방식) */
  const rkth=t.closest('.rk-tbl thead th');
  if(rkth){const ns=(rkth.closest('#mb')?'modal':'site'),st=rkState(ns);
    return[{label:st.filt?'필터 줄 끄기':'필터 줄 켜기',act:()=>{st.filt=!st.filt;if(!st.filt)st.q={};rkRerender(ns);}},
      Object.keys(st.q||{}).some(k=>st.q[k])?{label:'필터 지우기',act:()=>{st.q={};rkRerender(ns);}}:null,
      {label:'정렬 초기화',act:()=>{st.sort={k:'lv',d:-1};rkRerender(ns);}}];}
  /* ⓪ 하자 표 — 표 복사 · 공종 행이면 그 공종 목록 */
  const dfTr=t.closest('#view-defect .dt tr, .rec-tbl tr');
  if(dfTr){
    const tbl=dfTr.closest('table');
    const trade=(dfTr.querySelector('td')||{}).textContent;
    const sid=S.dfSid;
    return[
      {label:'표 전체 복사',act:()=>{if(tbl&&tbl.classList.contains('rec-tbl'))recCopy();else copyText(tblText(tbl),'표를 복사했습니다');}},
      (sid&&trade&&tbl&&tbl.classList.contains('dt'))
        ?{label:'"'+String(trade).trim()+'" 미처리 목록',act:()=>{recOpen(sid,'ul').then(()=>{REC.q=String(trade).trim();recRender();});}}
        :null
    ];
  }
  /* ① 업무 카드(업무 일정 · 업무 목록 공용) */
  const plan=t.closest('#dpList .plan');
  if(plan){
    const p=findPlan(plan.dataset.pid);
    if(p){
      const occ=p.date,done=planSt(p,occ)===2;
      return[
        {label:done?'진행으로 되돌리기':'완료로 표시',act:()=>ACT['plan.stCycle']({dataset:{pid:p.id,occ},closest:()=>null})},
        {label:'수정',act:()=>ACT['plan.edit']({dataset:{pid:p.id,occ}})},
        {label:'제목 복사',act:()=>copyText(p.title||'','제목을 복사했습니다')},
        {sep:true},
        {label:'삭제',danger:true,act:()=>ACT['plan.del']({dataset:{pid:p.id,ym:ymOf(p.date),occ}})}
      ];
    }
  }
  const tk=t.closest('.tk-item');
  if(tk&&tk.dataset.sid){
    const sid=tk.dataset.sid,iid=tk.dataset.iid,it=(S.tasks[sid]||{})[iid];
    if(it){const own=canEditTask(it,sid);   /* 627차: 권한 없는 업무는 보기·복사만 */
      return own?[
      {label:stEff(it)===2?'진행으로 되돌리기':'완료로 표시',act:()=>ACT['tk.st']({dataset:{sid,iid}})},
      {label:'제목 복사',act:()=>copyText(it.text||'','제목을 복사했습니다')},
      {sep:true},
      {label:'삭제',danger:true,act:()=>ACT['tk.del']({dataset:{sid,iid}})}
    ]:[
      {label:'제목 복사',act:()=>copyText(it.text||'','제목을 복사했습니다')}
    ];}
  }
  /* ② 달력 날짜 칸 */
  /* 695차: 조직 관리 — 삭제는 우클릭으로만(표에 휴지통을 두지 않는다). 둘 다 확인 모달을 거친다 */
  const ptr=t.closest('#acctRoot .utbl tr[data-pid]');
  if(ptr&&isEditor()){
    const pid=ptr.dataset.pid,p=roster().find(x=>x.id===pid);
    if(p)return[{label:'담당자 삭제 — '+(p.name||''),danger:true,act:()=>ACT['org.delPerson']({dataset:{id:pid}})}];
  }
  const str=t.closest('#siteRoot .mgtbl tr[data-sid]');
  if(str&&isEditor()){
    const st=(S.org.sites||[]).find(x=>x.id===str.dataset.sid);
    if(st)return[{label:'현장 삭제 — '+(st.name||'이름 없음'),danger:true,act:()=>ACT['org.delSite']({dataset:{id:st.id}})}];
  }
  const cell=t.closest('#fcal td.fc-daygrid-day');
  if(cell&&cell.dataset.date){
    const ds=cell.dataset.date,off=(S.offdays||{})[ds];
    const ed=isEditor();
    return[
      {label:(S.selEnd&&ds>=S.selDate&&ds<=S.selEnd)?'이 기간에 업무 추가':'이 날짜에 업무 추가',act:()=>{
        /* 692차: 드래그로 고른 범위 안에서 우클릭했으면 그 범위를 기간으로 — 전엔 selEnd 를 지워 하루짜리로 열렸다(위젯에서 특히) */
        const keep=!!S.selEnd&&ds>=S.selDate&&ds<=S.selEnd;
        selDate(keep?S.selDate:ds,true);S.selEnd=keep?S.selEnd:'';if(WIDGET)S.widPop=true;rDay();rWidget();
        setTimeout(()=>{const a=$('#dpList')&&$('.dp-add');if(a)a.click();},60);}},
      ed?{sep:true}:null,
      ed?(off
        ?{label:'휴무일 해제 ('+off+')',act:()=>{store.putOffday(ds,'');toast('휴무일을 해제했습니다');}}
        :{label:'휴무일로 지정…',act:()=>offdayAsk(ds)}):null
    ];
  }
  return null;
}
function offdayAsk(ds){
  openModal('휴무일 지정',
    '<div style="font-size:12.5px;color:var(--lbl2);margin-bottom:9px;line-height:1.6">'+esc(mdLabel(ds))+' 을(를) 쉬는 날로 표시합니다.<br>공휴일과 같은 색으로 칠해집니다.</div>'
    +'<input class="inp" id="offName" maxlength="12" placeholder="예: 단체연차, 창립기념일" value="단체연차">',
    '<button class="btn bg2 bsm" data-act="modal.close">취소</button><button class="btn bp bsm" data-act="offday.save" data-ds="'+esc(ds)+'">지정</button>');
  const mb=$('#mb');if(mb)mb.classList.add('narrow');
  setTimeout(()=>{const i=$('#offName');if(i){i.focus();i.select();}},60);
}

/* ── 툴팁 — `data-tip` 이 있는 요소에 잠깐 머무르면 뜬다 ── */
let _tipT=null,_tipFor=null,_tipWarm=0;   /* warm: 방금까지 툴팁이 떠 있던 시각 — 인접 이동은 즉시 띄운다(621차) */
function tipHide(){clearTimeout(_tipT);if(_tipFor)_tipWarm=Date.now();_tipFor=null;const el=$('#htip');if(el)el.classList.remove('on');}
/* 514차: 대상이 움직이거나 사라지면 툴팁을 따라 옮기거나 지운다.
   사이드바 접기·뷰 전환처럼 레이아웃이 바뀔 때 툴팁만 제자리에 남아 떠 있었다. */
function tipSync(){
  if(!_tipFor)return;
  const el=$('#htip');if(!el||!el.classList.contains('on'))return;
  if(!_tipFor.isConnected||!_tipFor.matches(':hover')){tipHide();return;}
  const r=_tipFor.getBoundingClientRect(),t=el.getBoundingClientRect();
  if(!r.width&&!r.height){tipHide();return;}
  let x=r.left+r.width/2-t.width/2, y=r.top-t.height-8;
  if(y<6)y=r.bottom+8;
  el.style.left=Math.max(6,Math.min(x,innerWidth-t.width-6))+'px';
  el.style.top=y+'px';
}
let _tipMx=0,_tipMy=0;
addEventListener('mousemove',e=>{_tipMx=e.clientX;_tipMy=e.clientY;},{passive:true});
function tipShow(target){
  const el=$('#htip');if(!el)return;
  /* ⚠ 기다리는 동안 그 요소가 사라지거나(다시 그려짐) 마우스가 떠났을 수 있다 */
  if(!target.isConnected||!target.matches(':hover'))return;
  const txt=target.dataset.tip;if(!txt)return;
  _tipFor=target;
  /* 783차: data-tipc 가 있으면 둘째 줄(레벨)만 그 색으로 — 세대 현황도 칸 */
  const tc=target.dataset.tipc;
  if(tc){const ln=txt.split('\n');
    el.innerHTML=esc(ln[0])+(ln.length>1?'<br><span style="color:'+esc(tc)+'">'+esc(ln.slice(1).join(' '))+'</span>':'');}
  else el.textContent=txt;
  el.classList.add('on');
  const t=el.getBoundingClientRect();
  /* 지도 안(시도 면·현장 점)은 요소가 커서 중앙에 띄우면 엉뚱한 곳에 뜬다 — 커서를 따른다(531차) */
  const map=target.closest&&target.closest('.okm,.okm-ov');   /* ⚠ .okm-wrap 으로 잡으면 뒤로 버튼까지 커서를 따라간다(551차) */
  const r=map?{left:_tipMx,width:0,top:_tipMy-2,bottom:_tipMy+18}:target.getBoundingClientRect();
  let x=r.left+r.width/2-t.width/2;
  let y=r.top-t.height-8;
  if(y<6)y=r.bottom+8;                                  /* 위가 좁으면 아래로 */
  el.style.left=Math.max(6,Math.min(x,innerWidth-t.width-6))+'px';
  el.style.top=y+'px';
}
addEventListener('scroll',tipSync,true);
addEventListener('resize',tipHide);
document.addEventListener('mouseover',e=>{
  const t=e.target.closest?e.target.closest('[data-tip]'):null;
  if(!t){if(_tipFor)tipHide();return;}
  if(t===_tipFor)return;                                 /* 이미 그 요소를 보여 주는 중 */
  clearTimeout(_tipT);
  const el=$('#htip');if(el)el.classList.remove('on');
  /* 621차: 인접 즉시 — 툴팁이 떠 있거나 방금(400ms 안) 떠 있었다면 지연·페이드 없이 바로 옮겨 뜬다.
     첫 진입 지연(180ms)은 유지 — 지나가다 뜨는 것을 막는 원래 목적 그대로 */
  const warm=_tipFor||((Date.now()-_tipWarm)<400);
  if(warm){if(el)el.classList.add('fast');tipShow(t);}
  else{if(el)el.classList.remove('fast');_tipT=setTimeout(()=>tipShow(t),180);}
});
document.addEventListener('mouseout',e=>{
  const t=e.target.closest?e.target.closest('[data-tip]'):null;
  if(!t)return;
  const to=e.relatedTarget;
  if(to&&to.closest&&to.closest('[data-tip]')===t)return; /* 같은 요소 안에서 움직인 것 */
  tipHide();
});
/* 누르면 곧바로 감춘다 — 누른 뒤에도 떠 있으면 화면을 가린다.
   625차: 클릭·스크롤·이탈은 **콜드** 숨김 — warm(인접 즉시)을 살려 두면 클릭이 화면을 갈아끼울 때
   커서 아래 새 버튼의 툴팁이 곧바로 번쩍 뜬다(연필→편집 폼의 '취소' 툴팁). 인접 즉시는 hover 이동에만 */
function tipHideCold(){tipHide();_tipWarm=0;}
document.addEventListener('mousedown',tipHideCold,true);
document.addEventListener('scroll',tipHideCold,true);
window.addEventListener('blur',tipHideCold);
/* ⚠ 화면을 다시 그리면 툴팁이 가리키던 요소가 사라져 그대로 떠 있는다 — 주기로 확인해 치운다 */
setInterval(()=>{if(_tipFor&&!_tipFor.isConnected)tipHide();},700);
/* 오후 점검 알림 — 창을 켜 둔 채 5시를 넘기는 일이 흔하므로 1분마다 조건을 다시 본다.
   ⚠ 상태가 바뀔 때만 다시 그린다 — 1분마다 알림창을 새로 그리면 스크롤·포커스가 튄다 */
let _eveWas=null;
setInterval(()=>{
  const now=eveOn();
  if(now===_eveWas)return;
  _eveWas=now;
  if(now)evePopShow();else evePopHide();   /* 5시를 넘기는 순간 말풍선을 한 번 띄운다 */
},60000);

/* ═══════════ 화면 전환 · 공통 UI ═══════════ */
const VIEW_TTL={calendar:'캘린더',tasks:'업무 현황',photo:'사진대지 작성',qc:'견적 검토',dwg:'도면 인쇄',defect:'하자처리 현황',org:'조직 관리',settings:'설정'};
function go(view){
  if(view==='report')view='tasks';   /* 주요 업무는 업무 현황으로 통합됐다(316차) — 옛 진입점은 넘겨 준다 */
  if(S.view==='org'&&view!=='org'&&orgDraftN()){   /* 696차: 현장 표 초안을 버리고 나가지 않도록 */
    const n=orgDraftN();
    confirmModal('저장하지 않은 현장 변경','현장 표에 저장하지 않은 변경 '+n+'건이 있습니다. 저장하고 이동할까요?',()=>{orgDraftApply();go(view);},'저장하고 이동',false);
    const b=$('#mo .btn.bg2');if(b){b.textContent='버리고 이동';b.dataset.act='org.draftDropGo';b.dataset.v=view;}
    return;
  }
  S.view=view;
  S.planOpen='';S.tkOpen=null;   /* 펼쳐 둔 카드는 화면을 옮기면 접는다(일정·업무 목록 모두) */
  pickClear();   /* 655차: 화면을 옮기면 골라 둔 업무도 푼다 — 안 그러면 돌아왔을 때 남은 선택에 일괄 적용된다 */
  if(S.dpSheet)dpSheet(false);  mselClose();
  $$('.view').forEach(v=>v.classList.toggle('act',v.id==='view-'+view));
  $$('#sidebar .nvi[data-view]').forEach(n=>n.classList.toggle('act',n.dataset.view===view));
  $('#tbt').textContent=VIEW_TTL[view];
  /* ⚠ 30ms 뒤에 크기를 맞추면 그 사이 **이전 화면 기준 폭**으로 한 번 그려졌다가 늘어난다 —
     화면이 바뀐 직후 곧바로 맞추고, 레이아웃이 잡힌 다음 프레임에 한 번 더 보정한다(355차) */
  if(view==='calendar'&&isMob()&&!WIDGET)mcalSet(S.mcal||'full');   /* 704차 */
  else{document.body.classList.remove('mcal-full','mcal-mini');}
  if(view==='calendar'&&CAL){
    /* ⚠ 숨겨져 있던 동안 달력은 크기를 모른다 — 그대로 보이면 **이전 화면 폭**으로 한 번 그려졌다가
       늘어나며 반짝인다. 크기를 맞출 때까지 감춰 두고, 다 맞춘 다음 프레임에 보인다(355차) */
    const cv=$('#view-calendar');if(cv)cv.classList.add('sizing');
    CAL.updateSize();
    requestAnimationFrame(()=>{try{CAL.updateSize();}catch(e){}
      requestAnimationFrame(()=>{if(cv)cv.classList.remove('sizing');});});
  }
  if(view==='tasks')rTasks();
  if(view==='photo')rPhoto();   /* 798차 */
  if(view==='qc')rQc();         /* 811차 */
  if(view==='dwg')rDwg();       /* 815차 */
  if(view==='defect')rDefect();
  dfTopbar();rDefectNav();
  if(view==='org'){
    rOrg();
  }
  if(view==='settings'){
    rCfg();
    const b=$('#buildInfo');
    if(b){
      const sc=[...document.scripts].map(x=>x.src).find(x=>/app\.js\?v=/.test(x))||'';
      const cv=(sc.match(/v=(\d+)/)||[])[1]||'?';
      b.textContent='버전 v'+(cv!=='?'?cv:APP_VER)+' · 기록된 오류 '+ERRLOG.length+'건';
    }
    /* 위젯은 별도 파일이라 버전이 따로 논다 — 설정에서 한눈에 보이게 같이 적는다 */
  }
  mobClose();
}
let toastT=null;
/* ═══════════ 657차: 되돌리기 ═══════════
   삭제만 휴지통에 남고 완료 토글·드래그 이동·일괄 처리는 되돌릴 수단이 없었다.
   변경 **직전 값**을 한 칸만 들고 있다가 토스트의 '되돌리기'로 되돌린다.
   ⚠ 여러 건을 바꾼 일괄 처리도 한 칸이다 — 한 번 누르면 그 묶음이 통째로 돌아간다. */
let UNDO=null,REDO=null;
const _snap=(sid,iid)=>JSON.parse(JSON.stringify((S.tasks[sid]||{})[iid]||null));
function undoSnap(list,label){
  UNDO={label,at:Date.now(),items:list.map(({sid,iid})=>({sid,iid,prev:_snap(sid,iid),next:null}))};
  REDO=null;   /* 새 변경이 생기면 다시 실행 칸은 버린다 */
}
/* ⚠ 값을 바꾼 **뒤에** 불러야 한다 — 다시 실행(Ctrl+Y)에 쓸 결과값을 채운다 */
function undoCommit(){if(UNDO)UNDO.items.forEach(o=>{o.next=_snap(o.sid,o.iid);});}
function _applySnap(items,key){
  const patch={};
  items.forEach(o=>{
    const v=o[key];
    if(!v){if(S.tasks[o.sid])delete S.tasks[o.sid][o.iid];if(S.live)patch['calapp/tasks/'+o.sid+'/'+o.iid]=null;return;}
    S.tasks[o.sid]=S.tasks[o.sid]||{};S.tasks[o.sid][o.iid]=v;
    if(S.live)patch['calapp/tasks/'+o.sid+'/'+o.iid]=cleanTask(v);
  });
  /* ⚠ 660차: S.live 가 참이어도 FB.db 가 없을 수 있다(로그아웃 직후·초기화 실패) — 없으면 로컬로 떨어진다 */
  if(S.live&&FB.db){if(Object.keys(patch).length)FB.db.ref().update(patch).catch(fbErr);}
  else lsSave(LocalStore._d);
  rDay();rTasks();refetchCal();rWidget();
}
function undoRun(){
  if(!UNDO){toast('되돌릴 변경 없음');return;}
  if(!UNDO.items.some(o=>o.next))undoCommit();   /* 버튼을 바로 눌러 아직 못 채웠으면 지금 채운다 */
  _applySnap(UNDO.items,'prev');
  REDO=UNDO;UNDO=null;
  toastUndo(REDO.items.length+'건 되돌림',4000);   /* 659차: 토스트는 여기서만 — 다시 실행 여부를 묻는 자리 */
}
function redoRun(){
  if(!REDO){toast('다시 실행할 변경 없음');return;}
  _applySnap(REDO.items,'next');
  UNDO=REDO;REDO=null;
}
/* Ctrl+Z 되돌리기 · Ctrl+Y(또는 Ctrl+Shift+Z) 다시 실행.
   ⚠ 입력 중에는 브라우저 기본 실행취소가 우선이라 가로채지 않는다 */
document.addEventListener('keydown',e=>{
  if(!(e.ctrlKey||e.metaKey)||e.altKey)return;
  const t=e.target;
  if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable))return;
  const k=(e.key||'').toLowerCase();
  if(k==='z'&&!e.shiftKey){e.preventDefault();undoRun();}
  else if(k==='y'||(k==='z'&&e.shiftKey)){e.preventDefault();redoRun();}
});
/* 토스트에 되돌리기 버튼을 달아 낸다 — 누르지 않으면 그냥 사라진다 */
function toastUndo(msg,ms=4000){
  const t=$('#toast');
  t.innerHTML='<span>'+esc(msg)+'</span><button class="toast-undo" data-act="undo.redo">다시 실행</button>';
  t.classList.add('show','has-btn');
  clearTimeout(toastT);toastT=setTimeout(()=>{t.classList.remove('show','has-btn');},ms);
}
function toast(msg,duration=2400){
  const t=$('#toast');t.textContent=msg;t.classList.remove('has-btn');t.classList.add('show');
  clearTimeout(toastT);const ms=Math.max(1000,Number(duration)||2400);toastT=setTimeout(()=>t.classList.remove('show'),ms);
  /* 771차: 마우스를 올리면 남고, 떼면 1초 뒤 닫힘 */
  if(!t.__hold){t.__hold=true;t.addEventListener('mouseenter',()=>clearTimeout(toastT));t.addEventListener('mouseleave',()=>{clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),1000);});}
}
function mobClose(){
  if(S.dpSheet){dpSheet(false);return;}   /* 시트가 열려 있으면 스크림 탭은 시트부터 닫는다 */
  $('#sidebar').classList.remove('mob-open');$('#scrim').classList.remove('on');}

/* 테마 */
/* 앱 배경화면 — 이 기기(localStorage)에만 두므로 팀원 화면·데이터베이스에는 영향이 없다 */
/* 432차: 배경 dataURL 을 그대로 CSS 변수에 넣으면 수 MB 문자열이 <html> 의 '상속되는'
   커스텀 프로퍼티가 되어, 화면을 갈아끼울 때마다(요소 수천 개) 스타일 계산이 무거워진다.
   → 한 번만 Blob 으로 바꿔 짧은 blob: URL 을 쓰고, 값이 바뀌면 이전 URL 을 해제한다. */
/* 배경 위 정적 필름 그레인 — 타일 노이즈 + 먼지 입자, 애니메이션 없음.
   ⚠ 한 번만 그린다. 매 프레임 그리면 위젯·저사양 PC 에서 그대로 부담이 된다. */
/* ── 달력 유리(앱) — 위젯 설정과 같은 두 축: 투명도(a)·유리 톤(tint) ──
   ⚠ 위젯과 같은 이유로 변수 상속이 아니라 **리터럴 규칙을 스타일 태그로 주입**한다
   (FullCalendar 셀에서 var() 상속이 갱신되지 않는 엔진 특이 동작 — widApply 주석 참조). */

/* ═══════════ 액션 위임 ═══════════ */
const ACT={
  'nav.go':el=>{if(el.dataset.view==='defect')S.dfSid='';go(el.dataset.view);},
  'nav.toggle':()=>{
    S.sbUser=true;   /* 705차: 사용자가 직접 접었다 폈으면 태블릿 자동 접기(sbAuto)가 손대지 않는다 */
    tipHide();   /* 514차: 사이드바가 움직이면 툴팁은 제자리에 남는다 */
    /* 접기/펼치기 동안 차트를 '다시 그리는' 모션(막대가 바닥에서 솟는 520ms)이 보이면 안 된다.
       responsive=false 저글링은 이미 붙은 ResizeObserver 를 막지 못해 무효였다(216차 실패 원인) —
       대신 duration 이 DF.noAnim 을 읽는 함수라서, 플래그를 세우면 옵저버가 몇 번을 발화하든
       즉시 상태로만 그려져 정지 화면처럼 크기만 따라온다. 폭 전환(0.22s)이 끝난 뒤 되돌린다. */
    DF.noAnim=true;
    $('#sidebar').classList.toggle('mini');
    clearTimeout(window.__navT);
    /* 상시 해제라 되돌릴 것이 없다(351차) — 타이머만 정리한다 */
  },
  'nav.mob':()=>{$('#sidebar').classList.add('mob-open');$('#scrim').classList.add('on');},
  'nav.mobClose':mobClose,
  'cal.prev':()=>CAL&&CAL.prev(),
  'cal.next':()=>CAL&&CAL.next(),
  /* 이동만 한다 — 위젯에서 날짜를 고른 것처럼 업무 팝업이 열리던 문제(오늘·연월 이동 공통) */
  'plan.new':()=>{
    const pe=S.planEdit;
    if(pe&&!pe.orig){const t=$('#peTitle');if(t){t.focus();t.select();return;}}   /* 이미 새 업무 폼이면 제목으로 */
    openPlanEdit(null,S.selDate,S.selEnd||'');},
  'plan.cancel':closePlanEdit,
  'plan.more':()=>{
    const box=$('#dpEdit');if(!box)return;
    box.classList.toggle('adv-on');},
  /* 색 원 — 누르면 팔레트 팝오버. 읽기 카드에서 열면 data-pid 로 그 업무에 바로 적용된다 */
  'plan.color':btn=>{
    const old=$('#colPop');
    if(old){closeColPop();return;}
    /* ⚠ 화면을 오가면 안 보이는 화면의 업무 목록 폼(#tkNew)이 DOM 에 남는다 —
       존재 여부가 아니라 '누른 색 원이 어느 폼 안인가'로 대상을 정한다 */
    const inTk=!!btn.closest('#tkNew');
    const cur=inTk?((($('#tnColor')&&$('#tnColor').value))||'auto')
      :((S.planEdit&&S.planEdit.draft&&S.planEdit.draft.color)||'auto');
    const pop=document.createElement('div');
    pop.id='colPop';pop.className='col-pop';
    pop.dataset.scope=inTk?'tk':'plan';
    pop.innerHTML=colPopHTML(cur);
    /* ⚠ 카드·목록에 overflow 가 걸려 있어 그 안에 넣으면 잘린다 — 화면 최상위에 띄우고 좌표만 맞춘다 */
    document.body.appendChild(pop);
    const r=btn.getBoundingClientRect(),w=pop.offsetWidth,h=pop.offsetHeight,M=8;
    let x=Math.min(Math.max(M,r.left),Math.max(M,innerWidth-w-M));
    let y=r.bottom+6;if(y+h>innerHeight-M)y=Math.max(M,r.top-h-6);
    pop.style.left=Math.round(x)+'px';pop.style.top=Math.round(y)+'px';
    cpPaint(pop,(cur&&cur!=='auto')?cur:'#3E71D2');
    setTimeout(()=>document.addEventListener('click',colOutside,true),0);},
  /* 카드 클릭은 '펼쳐 보기' — 수정은 연필 버튼으로 (실수로 값이 바뀌지 않게) */
  'plan.open':el=>{
    const card=el.closest('.plan');if(!card)return;
    const on=card.classList.toggle('open');
    S.planOpen=on?el.dataset.pid:'';},
  'plan.edit':el=>{const p=findPlan(el.dataset.pid);if(p)openPlanEdit(p,null,null,el.dataset.occ||'');},
  /* 상태 배지 — 누를 때마다 예정→진행→완료→보류 순환.
     편집 폼에서는 draft 만 바꾸고 배지 DOM 을 제자리에서 갈아 끼운다(폼을 다시 그리면 입력 중인 값이 날아간다) */
  'plan.stCycle':el=>{
    /* 663차: 카드가 선택돼 있으면 고른 것 전체가 같은 상태로 따라간다 */
    if(!el.closest('#dpEdit')&&PICK.set.size>1){
      const p0=findPlan(el.dataset.pid);
      if(p0&&p0.sid&&PICK.set.has(p0.sid+'/'+p0.id)){pickSyncSt({dataset:{sid:p0.sid,iid:p0.id}});return;}
    }
    if(el.closest('#dpEdit')){
      const pe=S.planEdit;if(!pe||!pe.draft)return;
      const n=stEff(pe.draft,pe.draft.end||pe.draft.date)===2?1:2;
      pe.draft.st=n;pe.draft.done=n===2;pe.draft.stKeep=n===1;
      stxSet(el,n);
      planAutosave();
      return;
    }
    const p=findPlan(el.dataset.pid);if(!p)return;
    const occ=el.dataset.occ||p.date;
    const n=planSt(p,occ)===2?1:2;
    /* 660차: 일정 카드(달력·일자 패널·위젯)도 되돌리기 대상 — 저장소는 업무와 같다(planToTask) */
    if(p.sid&&p.id)undoSnap([{sid:p.sid,iid:p.id}],'상태');
    if(p.recur&&p.recur.f){                 /* 반복은 회차별 완료(doneOn)가 우선한다 */
      const k=occSrc(p,occ);
      p.doneOn=p.doneOn||{};
      if(n===2)p.doneOn[k]=1;else{delete p.doneOn[k];p.st=n;p.done=false;}
    }else{p.st=n;p.done=n===2;p.stKeep=n===1;}   /* 날짜가 지난 뒤 손으로 '진행'을 고르면 그대로 둔다 */
    p.updatedAt=Date.now();store.putPlan(p);
    undoCommit();
    if(!S.live){rDay();refetchCal();rWidget();}},
  /* 새로 만들다가 그만둘 때 — 자동 저장을 취소하고 아무것도 남기지 않는다 */
  'plan.discard':()=>{
    clearTimeout(PE_SAVE);
    const pe=S.planEdit;
    if(pe&&pe.orig){                       /* 이미 한 번 저장됐다면 지운다 */
      const p=findPlan(pe.draft&&pe.draft.id);
      if(p)store.delPlan(ymOf(p.date),p.id);
    }
    S.planEdit=null;rDay();refetchCal();rWidget();
  },
  'plan.del':el=>{
    const p=findPlan(el.dataset.pid),occ=el.dataset.occ||'';
    if(p&&p.recur&&p.recur.f&&occ){
      closeModal();
      openModal('반복 업무 삭제','<div style="font-size:13px;color:var(--lbl2);line-height:1.6">"'+esc(p.title)+'" — 이 날짜만 뺄지, 반복 전체를 지울지 고르세요.</div>',
        '<button class="btn bg2 bsm" data-act="modal.close">취소</button>'
        +'<button class="btn bo bsm" data-act="plan.skipOcc" data-pid="'+esc(p.id)+'" data-occ="'+esc(occ)+'">이 날짜만 제외</button>'
        +'<button class="btn btn-danger bsm" data-act="plan.delAll" data-pid="'+esc(p.id)+'">반복 전체 삭제</button>');
      return;
    }
    const ym=el.dataset.ym,pid=el.dataset.pid,ttl=(p&&p.title)||'제목 없음';
    confirmModal('업무 삭제','"'+ttl+'" 업무를 휴지통으로 옮깁니다. 30일 안에는 설정 > 휴지통에서 복원할 수 있습니다.',()=>{
      /* ⚠ 폼부터 닫고 지운다 — 순서가 바뀌면 다시 그릴 때 '이미 없는 업무'의 폼이 남아 한 박자 늦게 보인다 */
      clearTimeout(PE_SAVE);S.planEdit=null;
      store.delPlan(ym,pid);
      rDay();refetchCal();rWidget();          /* 라이브에서도 즉시 반영(구독 값이 오면 덮어쓴다) */
      toast('휴지통으로 옮겼습니다');
    });},
  'plan.moveOcc':el=>{
    const p=findPlan(el.dataset.pid);if(!p)return;
    const src=occSrc(p,el.dataset.occ);
    const to=($('#peOcc')&&$('#peOcc').value)||'';
    if(!/^\d{4}-\d{2}-\d{2}$/.test(to)){toast('옮길 날짜를 고르세요');return;}
    if(to===src){   /* 428차: 원래 날짜를 고르면 되돌리기 */
      if(p.moveOn&&p.moveOn[src]){p.moveOn={...p.moveOn};delete p.moveOn[src];p.updatedAt=Date.now();store.putPlan(p);
        S.planEdit=null;selDate(src);
        if(!S.live){refetchCal();rWidget();}else setTimeout(refetchCal,220);
        toast('원래 날짜로 되돌렸습니다');}
      return;}
    p.moveOn={...(p.moveOn||{})};p.moveOn[src]=to;
    /* 완료·제외 표시는 원래 날짜 기준이라 그대로 둔다 */
    p.updatedAt=Date.now();store.putPlan(p);
    S.planEdit=null;selDate(to);
    if(!S.live){refetchCal();rWidget();}else setTimeout(refetchCal,220);
    toast('이 회차를 '+to+'로 옮겼습니다');},
  'plan.skipOcc':el=>{const p=findPlan(el.dataset.pid);if(!p)return;
    const src=occSrc(p,el.dataset.occ);
    p.skipOn=p.skipOn||{};p.skipOn[src]=1;
    if(p.moveOn&&p.moveOn[src]){const mv={...p.moveOn};delete mv[src];p.moveOn=mv;}
    p.updatedAt=Date.now();store.putPlan(p);
    closeModal();S.planEdit=null;rDay();if(!S.live){refetchCal();rWidget();}toast('이 날짜를 반복에서 제외했습니다');},
  'plan.delAll':el=>{store.delPlan('',el.dataset.pid);closeModal();S.planEdit=null;rDay();
    if(!S.live){refetchCal();rWidget();}toast('반복 업무를 삭제했습니다');},
  'auth.login':fbDoLogin,
  'auth.signup':fbDoSignup,
  'auth.resend':fbDoResend,
  'auth.reset':fbDoReset,
  'acct.reset':acctResetPw,
  'acct.open':openAcctModal,
  'df.site':el=>{S.dfSid=el.dataset.sid;S.dfTab='sum';go('defect');},
  'df.tab':el=>{S.dfTab=el.dataset.t;rDefect();},
  'rec.list':el=>recOpen(el.dataset.sid||'',el.dataset.scope||el.dataset.sc||'ul',{trade:el.dataset.trade,co:el.dataset.co,vac:el.dataset.vac}),
  'rec.limit':el=>{REC.limit=Number(el.dataset.n)||0;recRender();},
  'rec.vac':el=>{REC.vac=(REC.vac===el.dataset.v?'':el.dataset.v);recRender();},
  'rec.pvAdd':el=>{const zone=el.dataset.zone,r=el.getBoundingClientRect();
    const used=zone==='rows'?PIV.rows:[PIV.col].filter(Boolean);
    const avail=PIVOT_FIELDS.filter(f=>!used.includes(f.key)&&(f.key!=='siteName'||REC.withSite));
    openCtx(r.left,r.bottom+4,avail.map(f=>({label:f.label,act:()=>{
      if(zone==='rows'){if(PIV.rows.length<3)PIV.rows.push(f.key);}else PIV.col=f.key;
      recRender();}})));},
  'rec.pvRm':el=>{if(pvDragMoved){pvDragMoved=false;return;}   /* 드래그로 끝난 제스처는 제거로 치지 않는다 */
    if(el.dataset.zone==='rows')PIV.rows.splice(Number(el.dataset.i),1);else PIV.col=null;recRender();},
  'rec.pvVal':el=>{const r=el.getBoundingClientRect();
    openCtx(r.left,r.bottom+4,[
      {label:(PIV.val==='count'?'✓ ':'')+'건수',act:()=>{PIV.val='count';recRender();}},
      {label:(PIV.val==='avgDelay'?'✓ ':'')+'평균 지연일',act:()=>{PIV.val='avgDelay';recRender();}}]);},
  'rec.pvPct':()=>{PIV.pct=!PIV.pct;const b=$('#pvBody');if(b)b.innerHTML=pivTableHTML();const t=$('.pv-pct-tg');if(t){t.classList.toggle('on',PIV.pct);t.setAttribute('aria-pressed',PIV.pct?'true':'false');}},
  'rec.pvSort':el=>{const k=el.dataset.pk;
    if(PIV.sort.key===k){if(PIV.sort.dir===1)PIV.sort={key:'__total',dir:-1};else PIV.sort={key:k,dir:1};}
    else PIV.sort={key:k,dir:-1};
    const b=$('#pvBody');if(b)b.innerHTML=pivTableHTML();},
  'rec.band':el=>{REC.band=el.dataset.b;recRender();},
  'rec.sort':el=>{const k=el.dataset.k;REC.desc=(REC.sort===k)?!REC.desc:false;REC.sort=k;recRender();},
  'rec.xlsx':()=>recXlsx(),
  'rec.pivot':()=>{PIV.on=!PIV.on;recRender();},
  'rec.showAll':()=>{REC.hidden={};recRender();},
  /* ── 열 머리 우클릭 메뉴 액션 — 원본 app-boot.js 1214~1243 이식(저장소만 REC.vals 객체) ── */
  'rec.menuToggleRow':()=>{REC.filterRow=!REC.filterRow;
    const fr=document.querySelector('#mbody .rl-frow');if(fr)fr.classList.toggle('open',REC.filterRow);
    if(!REC.filterRow){REC.filters={};document.querySelectorAll('#mbody .rl-fin').forEach(i=>{i.value='';});recRowsOnly();}
    recCloseMenu();},
  'rec.menuAll':el=>{const M=REC._menu;if(!M)return;M.sel=el.checked?new Set(M.all):new Set();recMenuRenderList();},
  'rec.menuVal':el=>{const M=REC._menu;if(!M)return;const v=el.dataset.val;if(M.sel.has(v))M.sel.delete(v);else M.sel.add(v);recMenuSyncAll();},
  'rec.menuTreeToggle':el=>{const M=REC._menu;if(!M)return;const n=el.dataset.node;if(M.expand.has(n))M.expand.delete(n);else M.expand.add(n);recMenuRenderList();},
  'rec.menuTreeCheck':el=>{const M=REC._menu;if(!M||!M.dateTree)return;const leaves=recDateLeaves(M.dateTree,el.dataset.node);const st=recTri(leaves,M.sel);if(st==='all')leaves.forEach(v=>M.sel.delete(v));else leaves.forEach(v=>M.sel.add(v));recMenuRenderList();},
  'rec.menuApply':()=>{const M=REC._menu;if(!M)return;
    if(M.sel.size>=M.all.length)delete REC.vals[M.key];
    else{const o={};M.sel.forEach(v=>o[v]=1);REC.vals[M.key]=o;}
    recCloseMenu();recRender();},
  'rec.menuClear':()=>{const M=REC._menu;if(!M)return;delete REC.vals[M.key];recCloseMenu();recRender();},
  'rec.menuHideCol':()=>{const M=REC._menu;if(!M)return;const col=recCols().find(c=>c.k===M.key);REC.hidden[M.key]=1;recCloseMenu();recRender();toast('「'+(col?col.t:M.key)+'」 열을 숨겼습니다 · 아무 열 머리 우클릭으로 복원');},
  'rec.menuShowCols':()=>{REC.hidden={};recCloseMenu();recRender();},
  /* 824차: 권역은 **한 번에 하나만** 펼친다 — 다 펼치면 사이드바가 화면을 넘긴다(12현장·1366px 에서 266px 넘침) */
  'df.fold':el=>{const k=el.dataset.rid;
    const btn=el.closest('.df-reg'),wasOpen=btn&&btn.classList.contains('open');
    $$('#dfNav .df-reg').forEach(b=>{S.dfFold[b.dataset.rid]=true;});   /* true=접힘 · false=펼침 (기존 저장값과 호환) */
    S.dfFold[k]=wasOpen?true:false;
    rDefectNav();},
  'df.vacEdit':el=>{
    const sid=el.dataset.sid,sangga=el.dataset.kind==='sangga';
    const vl=sangga?'공가상가':'공가세대',_u=sangga?'호실':'세대';
    const field=sangga?'commercialStatus':'vacantStatus';
    const key=dfRm()+'/'+sid,sv=((DF.vac[key]||{})[field])||{};
    openModal(vl+' 수 입력',
      '<p style="font-size:12px;color:var(--lbl2);margin-bottom:12px">미분양·미키불출 '+_u+'수를 입력하면 합계가 자동 계산됩니다.<br>공가 수의 원 소스는 하자처리 현황입니다 — 재게시하면 그쪽 값으로 맞춰집니다.</p>'
      +'<div class="ig2" style="margin-bottom:10px"><label class="il" for="vmMb">미분양</label><input class="inp" id="vmMb" type="text" inputmode="numeric" value="'+esc(String(sv['미분양']??''))+'" placeholder="0"></div>'
      +'<div class="ig2"><label class="il" for="vmMk">미키불출</label><input class="inp" id="vmMk" type="text" inputmode="numeric" value="'+esc(String(sv['미키불출']??''))+'" placeholder="0"></div>'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:12px;border-top:1px solid var(--sep);font-size:13px"><span>'+vl+' 합계</span><b id="vmSum">0 '+_u+'</b></div>',
      '<button class="btn bg2 bsm" data-act="modal.close">취소</button><button class="btn bp bsm" data-act="df.vacSave" data-sid="'+esc(sid)+'" data-kind="'+(sangga?'sangga':'sedae')+'">저장</button>');
    const upd=()=>{const a=parseInt($('#vmMb').value,10)||0,b=parseInt($('#vmMk').value,10)||0;const e2=$('#vmSum');if(e2)e2.textContent=(a+b).toLocaleString()+' '+_u;};
    $('#vmMb').addEventListener('input',upd);$('#vmMk').addEventListener('input',upd);upd();
    setTimeout(()=>$('#vmMb').focus(),30);},
  'df.vacSave':el=>{
    const sid=el.dataset.sid,sangga=el.dataset.kind==='sangga';
    const field=sangga?'commercialStatus':'vacantStatus';
    const rm=dfRm(),key=rm+'/'+sid;
    const mb=String($('#vmMb').value||'').trim(),mk=String($('#vmMk').value||'').trim();
    if(!DF.vac[key])DF.vac[key]={};if(!DF.vac[key][field])DF.vac[key][field]={};
    DF.vac[key][field]['미분양']=mb;DF.vac[key][field]['미키불출']=mk;
    /* 게시본은 한글 키를 fbEncKey 로 인코딩해 저장한다 — 평문으로 쓰면 같은 노드에 두 형태가 섞인다 */
    if(S.live&&FB.db)FB.db.ref('report/'+rm+'/'+sid+'/vac/'+field).update({[dfEncKey('미분양')]:mb,[dfEncKey('미키불출')]:mk})
      .catch(()=>toast('저장 실패 · 권한을 확인하세요'));
    closeModal();rDefect();},
  'df.ax.site':el=>{S.dfAxSite=el.dataset.ax;S.dfAxSiteAll=false;window._dfSort={};dfSiteAxisOnly(S.dfSid);},
  'df.ax.siteAll':()=>{S.dfAxSiteAll=!S.dfAxSiteAll;dfSiteAxisOnly(S.dfSid);},
  'df.ax.dash':el=>{S.dfAxDash=el.dataset.ax;if(DF.lastDash)dfDashTableFill(DF.lastDash);},
  'df.sort.dash':el=>{const k=el.dataset.key;const so=S.dfSort||{col:null,dir:-1};
    if(so.col===k){if(so.dir===-1)so.dir=1;else{so.col=null;so.dir=-1;}}else{so.col=k;so.dir=-1;}
    S.dfSort=so;if(DF.lastDash)dfDashTableFill(DF.lastDash);},
  'df.sort.tbl':el=>dfSortPanel(el.dataset.tbl,el),
  'print.pick':el=>rptPickSel(el),
  'print.font':el=>rptPickFont(el),
  'print.go':()=>rptPickGo(),
  'set.dfsnap':()=>dfSnapshot(),







  'df.rm':async el=>{
    if(document.querySelector('.ctxmenu')){closeCtx();return;}   /* 열려 있으면 닫기(토글) */
    if(!S.live||!FB.db)return;
    if(!DF.rmIdx){try{DF.rmIdx=(await FB.db.ref('reportIndex').once('value')).val()||{};}catch(e){DF.rmIdx={};}}
    const months=Object.keys(DF.rmIdx).filter(m=>/^\d{4}-\d{2}$/.test(m)).sort().reverse();
    if(!months.length){toast('게시된 달이 없습니다');return;}
    const cur=dfRm(),r=el.getBoundingClientRect();
    openCtx(r.left,r.bottom+6,months.map(m=>({label:(m===cur?'✓ ':'')+m+(m===ORG_RM?' · 최신':''),
      act:()=>{S.dfRmSel=(m===ORG_RM?'':m);rDefect();}})),el);},
  'hold.go':el=>gotoTask(el.dataset.sid,el.dataset.iid),
  'hold.mine':()=>{S.holdMine=!S.holdMine;rHold();},
  /* 아침 확인 — 누르는 즉시 저장하고 그 줄만 사라진다 */
  'mrv.done':el=>{stxSet(el,2);setTimeout(()=>mrvApply(el,{st:2,done:true},'완료로 바꿨습니다'),160);},
  'mrv.today':el=>mrvApply(el,{st:1,done:false,stKeep:true,date:todayStr(),end:''},'오늘로 옮겼습니다'),
  'nq.toggle':()=>{const on=!$('#nqPanel').classList.contains('on');nqOpen(on);if(on)rNq();},
  /* NLQ 결과 → 목록 창(recOpen) 매핑 — 현장·공종·공가·장기(30일+)는 창의 필터로, 나머지(동·호·본문)는
     목록 검색어로 넘긴다. ⚠ '60일 이상' 같은 세밀한 지연 조건은 밴드(d60)로 근사 — 정확한 수는 패널 칩이 답 */
  'nq.list':async()=>{const N=window.__DFNQ;if(!N)return;nqOpen(false);
    const R=N.R;
    const site=R.site?dfDashSites().find(s=>s.name===R.site):null;
    const scope=(R.delay&&R.delay.op==='gte'&&R.delay.n>=30)?'lul':'ul';
    await recOpen(site?site.id:null,scope,{trade:(R.trades&&R.trades[0])||'',vac:R.vac?'unit':''});
    if(R.delay&&R.delay.op==='gte'&&R.delay.n>=60)REC.band='d60';
    const terms=[...((R.text)||[])];if(R.dong)terms.push(R.dong);if(R.ho)terms.push(R.ho);
    if(terms.length)REC.q=terms.join(' ');
    if(terms.length||REC.band)recRender();},
  /* 457차: 헤더 검색창 — 입력창에 바로 치고 결과는 아래로 */
  'nq.clear':()=>{const i=$('#ahQ');if(i){i.value='';i.focus();}ahSrchSync('');},
  'nq.close':()=>nqOpen(false),
  /* ⚠ 위젯에는 업무 목록·하자 관리 화면이 없다 — 그쪽으로 보내면 빈 화면이 된다.
     위젯에서는 그 업무의 날짜로 달력을 옮기고 팝업을 펼친다(내 업무 팝오버와 같은 방식) */
  'nq.task':el=>{
    if(!WIDGET){gotoTask(el.dataset.sid,el.dataset.iid);return;}
    nqOpen(false);
    const d=el.dataset.date;
    if(!d){toast('기한이 없는 업무입니다 · 브라우저 앱의 업무 목록에서 볼 수 있습니다');return;}
    if(CAL)CAL.gotoDate(toDate(d));
    selDate(d,true);S.planOpen=el.dataset.iid||'';S.widPop=true;
    rMonTitle();refetchCal();rDay();rWidget();
  },
  /* 하자 현황 — 위젯에는 그 화면이 없다. 안내만 띄우고 마는 대신 브라우저를 그 현장으로 바로 연다.
     ⚠ window.open 은 위젯(WebView2)이 가로채 기본 브라우저로 넘긴다(INIT_JS) */
  'nq.site':el=>{
    nqOpen(false);
    const sid=el.dataset.sid;
    if(WIDGET){
      const u=location.origin+location.pathname+'?df='+encodeURIComponent(sid);
      window.open(u,'_blank','noopener');
      toast('브라우저에서 하자처리 현황을 엽니다');
      return;
    }
    S.dfSid=sid;S.dfTab='sum';go('defect');},
  /* 날짜 클릭은 **강조만** 한다 — 주기 이동은 머리의 ‹ › 버튼 전용(320차, 사용자 지시) */
  /* 645차: 모바일 달력의 미니달력 — 날짜를 고르면 아래 상시 패널이 바뀐다 */
  'cal.day':el=>{const d=el.dataset.date;if(!d)return;selDate(d);if(isMob()&&!WIDGET&&!mcalIsLand()&&S.mcal==='full')mcalSet('mini');},   /* 733차: 큰 달력에서 날짜를 누르면 점 달력+패널로(704차 동작 복원 — 패널이 없어 업무를 볼 길이 없었다) */
  'mine.day':el=>{const d=el.dataset.date;if(!d)return;
    S.mineSel=(S.mineSel===d?'':d);rTasksSoon();},
  /* ‹ 이전 주 · 집 이번 주 · › 다음 주 — 달력이 보는 달도 주기를 따라 옮긴다 */
  'mine.mon':el=>{
    pickClear();   /* 655차: 주·달이 바뀌면 보이는 목록이 통째로 달라진다 */
    const d=Number(el.dataset.d)||0;
    if(S.tkView==='month'){          /* 월간 업무 — 달 단위로 넘긴다 */
      const base=S.mineYm||todayStr().slice(0,7)+'-01';
      if(!d)S.mineYm='';
      else{const t=toDate(base);t.setMonth(t.getMonth()+d);S.mineYm=dstr(t).slice(0,7)+'-01';}
      rTasks();return;
    }
    if(!d)S.tkWeek='';
    else{const cur=rptCycle(S.tkWeek||todayStr());S.tkWeek=addDays(cur.start,d*7);}
    const{nxt}=tkWeekCycles();S.mineYm=nxt.start.slice(0,7)+'-01';   /* 예정 주가 보이는 달로 */
    rTasks();},
  /* 인쇄 — 상단바 버튼(#tbPrintWrap) 하나가 두 화면을 맡는다.
     ⚠ 예전엔 없는 함수(dfPrintOpen)를 typeof 로 감싸 불러 하자 관리에서 조용히 아무 일도 안 했다 */
  'sb.print':()=>{if(S.view==='defect')openPrintPick();else if(S.view==='photo')pdPrint();else if(S.view==='dwg')dwPrint();},
  /* 오후 점검 알림 — 누르면 오늘로 이동해 남은 업무를 펼친다. x 는 그날만 닫는다 */

  'pf.org':()=>acctAutoSave(),
  'pf.toggle':()=>{const p=$('#pfPop');if(!p)return;
    const on=!p.classList.contains('open');
    if(on){
      /* 694차: 자리를 잡기 전 한 프레임이라도 그려지면 왼쪽 위(left:0 top:0)에 번쩍 떴다 보인다 — 숨긴 채 열고 자리 잡은 뒤 보인다 */
      p.style.visibility='hidden';p.classList.add('open');
      if(!PF_MORE)pfRenderEmg(recentEmoji().length?'recent':'smiley','');
      pfPlace();
      requestAnimationFrame(()=>{p.style.visibility='';});
    }else p.classList.remove('open');},
  'pf.close':()=>{const p=$('#pfPop');if(p)p.classList.remove('open');pfClosed();},
  'pf.cat':el=>{
    $$('#pfCats .pf-cat').forEach(x=>x.classList.toggle('act',x===el));
    const q=$('#pfSrch');if(q)q.value='';
    pfRenderEmg(el.dataset.cat,'');},
  'pf.pick':el=>{
    PF_SEL.icon=el.dataset.e||'';
    const av=document.querySelector('.acct-av');
    if(av)av.innerHTML=avInner(PF_SEL.icon)+'<span class="av-pen"><svg class="icn"><use href="#i-plus"></use></svg></span>';
    $$('#pfEmg .pf-em').forEach(x=>x.classList.toggle('on',x===el));   /* 닫지 않는다 — 여러 개 비교해 고를 수 있게 */
    acctAutoSave();
  },
  'acct.tab':el=>renderAcctModal(el.dataset.tab),
  'acct.changePw':acctChangePw,
  'acct.signout':acctSignout,
  'modal.close':closeModal,
  'modal.stop':()=>{},
  'modal.ok':()=>{if(MODAL_CB&&MODAL_CB.ok)MODAL_CB.ok();},
  'tkf.qclear':()=>{S.tkF={...S.tkF,q:''};filtSave();rTkViews();},
  /* ⚠ id 로 찾으면 숨어 있는 다른 화면의 필터 카드를 잡는다 — 누른 버튼이 속한 카드를 토글한다 */
  /* 꺽쇠 — 펼치기/접기. **접을 때 걸려 있던 필터를 함께 푼다**(330차) — 접힌 채 필터가 남아
     결과가 왜 적은지 모르게 되는 일을 막는다. 별도 초기화 버튼은 두지 않는다 */
  'tkf.toggle':()=>{
    const open=S.tkFOpen!==true;
    if(!open)S.tkF={...S.tkF,kind:[],st:[],site:[],own:[]};
    S.tkFOpen=open;filtSave();rTasks();},
  'tk.view':el=>{
    S.tkView=el.dataset.v==='month'?'month':'week';S.tkNew=null;
    S.tk.m='teamall';   /* 보류함을 보던 중이면 함께 빠져나온다 — 안 그러면 버튼이 먹지 않는 것처럼 보인다(338차) */
    /* 주간으로 돌아오면 달력을 **예정 주가 든 달**로 맞춘다 — 월간에서 달을 넘겨 둔 채 돌아오면
       달력에 주기 띠가 하나도 안 보였다(325차 자체 검증에서 확인) */
    if(S.tkView==='week'){const{nxt}=tkWeekCycles();S.mineYm=nxt.start.slice(0,7)+'-01';}
    rTasks();},
  'tk.tab':el=>{S.tkTab=el.dataset.id||'';S.tkNew=null;rTasksSoon();},
  'tk.newOpen':el=>{
    /* 새 업무를 담을 자리 — 개인 탭(팀장 등)이면 그 사람 밑에, 그 외(전체·공통·권역·보류함)는 팀 공통.
       담당자는 어차피 폼에서 고른다(모달) */
    const sel=tkSel();
    const t=S.tkTab||'';
    const personal=t&&t!=='team'&&t.indexOf('reg:')!==0&&sel.mems.some(p=>p.id===t);
    const sid=personal?t:((sel.team&&sel.team.id)||'');
    if(!sid)return toast('먼저 팀을 만들어 주세요');
    S.tkEdit=null;S.tkNew=sid;rTasks();
    setTimeout(()=>{const t2=$('#tnTitle');if(t2)t2.focus();},S.live?260:20);
  },
  'tk.formCancel':()=>tkFormClose(),
  'tk.kind':()=>tkKindRefresh(),
  /* 날짜 칸 — 한 칸 안에서 기간을 잡는다(365차) */
  'tk.dateOpen':()=>{const D=S.tkDate||{};
    /* 다시 누르면 닫는다 */
    S.tkDate={open:!D.open,ym:(($('#tnDate')&&$('#tnDate').value)||todayStr()).slice(0,7),
      a:($('#tnDate')&&$('#tnDate').value)||'',b:($('#tnEnd')&&$('#tnEnd').value)||''};
    tkDateRefresh();},
  'tk.dateMon':el=>{const D=S.tkDate||{};const t=toDate((D.ym||todayStr().slice(0,7))+'-01');
    t.setMonth(t.getMonth()+(Number(el.dataset.d)||0));
    S.tkDate={...D,ym:dstr(t).slice(0,7)};tkDateRefresh();},
  'tk.dateDay':el=>{const d=el.dataset.d,D=S.tkDate||{};
    /* 처음 누르면 하루, 다시 뒤 날짜를 누르면 그날까지가 기간. 앞 날짜를 누르면 다시 시작일 */
    let a=D.a,b=D.b;
    /* 같은 날을 다시 누르면 비운다 — 아래 '지우기' 줄을 없앤 대신(371차) */
    if(a===d&&!b){a='';b='';}
    else if(!a||b||d<a){a=d;b='';}
    else if(d>a){b=d;}
    S.tkDate={...D,a,b,open:!b};   /* 종료일까지 고르면 닫는다 */
    const i=$('#tnDate'),j=$('#tnEnd');if(i)i.value=a;if(j)j.value=b;
    tkDateRefresh();},
  'tk.formSave':el=>taskFormSave(el.dataset.sid,el.dataset.iid||null),
  'undo.redo':()=>{const t=$('#toast');t.classList.remove('show','has-btn');redoRun();},
  'pick.clear':()=>pickClear(),
  'pick.del':()=>{const{ok}=pickEditable();
    if(!ok.length){denyTask();return;}
    if(!confirm(ok.length+'건을 휴지통으로 보낼까요?'))return;
    ok.forEach(({sid,iid})=>ACT['tk.del']({dataset:{sid,iid}}));
    pickClear();},
  'tk.open':el=>{
    const key=el.dataset.sid+'/'+el.dataset.iid;
    S.tkOpen=S.tkOpen===key?null:key;rTasks();
  },
  'tk.field':()=>{},
  'tk.edit':el=>{const _it=(S.tasks[el.dataset.sid]||{})[el.dataset.iid];
    if(_it&&!canEditTask(_it,el.dataset.sid)){denyTask();return;}
    S.tkNew=null;S.tkOpen=null;S.tkDate={open:false,ym:'',a:'',b:''};S.tkEdit=el.dataset.sid+'/'+el.dataset.iid;
    S.tkEditOcc=el.dataset.occ||'';   /* 반복이면 어느 회차에서 눌렀는지 — 팝업을 그 행에 붙이고 표시도 그 행만 */
    rTasks();},
  /* 같은 것을 다시 누르면 되돌아온다(389차) — 보류함에 따로 '뒤로' 버튼을 두지 않는다 */
  'tk.pick':el=>{pickClear();const id=el.dataset.id;S.tk.m=(S.tk.m===id&&id==='hold')?'teamall':id;rTasks();},
  'tk.st':el=>{
    /* 656차: 고른 것 중 한 건의 상태를 바꾸면 나머지도 같은 상태로 맞춘다 */
    if(PICK.set.size>1&&PICK.set.has(el.dataset.sid+'/'+el.dataset.iid)){pickSyncSt(el);return;}
    const sid=el.dataset.sid,iid=el.dataset.iid,occ=el.dataset.occ||'';
    const cur=(S.tasks[sid]||{})[iid];if(!cur)return;
    if(!canEditTask(cur,sid)){denyTask();return;}   /* 627·628차: 상태 변경도 권한 위계를 지난다 */
    if(cur.recur&&cur.recur.f&&occ){        /* 반복은 그 회차만 완료로 — 업무 전체를 건드리면 다음 회차까지 닫힌다 */
      const p=taskAsPlan(sid,iid,cur),k=occSrc(p,occ);
      const on=!!(cur.doneOn&&cur.doneOn[k]);
      const doneOn={...(cur.doneOn||{})};
      if(on)delete doneOn[k];else doneOn[k]=1;
      store.putTask(sid,iid,histPush({...cur,doneOn,updatedAt:Date.now()},on?'undone':'done'));
      if(!S.live){tkRowRefresh(el);rDay();rWidget();}
      refetchCal();return;
    }
    const n=stEff(cur)===2?1:2;
    undoSnap([{sid,iid}],'상태');
    store.putTask(sid,iid,histPush({...cur,st:n,stKeep:n===1,updatedAt:Date.now()},n===2?'done':(n===3?'hold':'undone')));
    undoCommit();   /* 659차: 변경 알림은 띄우지 않는다 — 화면이 이미 바뀌었고 Ctrl+Z 가 있다 */
    if(!S.live){tkRowRefresh(el);rDay();rWidget();}
    refetchCal();   /* 완료 처리하면 달력의 기한 표시도 즉시 사라져야 한다 */
  },
  'tk.del':el=>{
    const sid=el.dataset.sid,iid=el.dataset.iid,key=sid+'/'+iid;
    const it=(S.tasks[sid]||{})[iid]||{};
    if(!canEditTask(it,sid)){denyTask();return;}
    confirmModal('업무 삭제',
      '"'+(it.text||'제목 없음')+'" 업무를 휴지통으로 옮깁니다. 30일 안에는 설정 > 휴지통에서 복원할 수 있습니다.',
      ()=>{
        if(S.tkEdit===key)S.tkEdit=null;   /* 폼부터 닫고 지운다 — 순서가 바뀌면 반영이 한 박자 늦다 */
        store.trashTask(sid,iid);
        if(S.tkOpen===key)S.tkOpen=null;
        if(!S.live)rTasks();else setTimeout(rTasks,220);
        refetchCal();toast('휴지통으로 옮겼습니다');
      });},
  'org.addTeam':()=>{
    
    const id=uid();S.org.teams=(S.org.teams||[]).concat([{id,name:''}]);orgSave();
    setTimeout(()=>{const i=document.querySelector('#teamRoot .mg-inp[data-id="'+id+'"]');if(i)i.focus();},S.live?260:20);
  },
  'org.addReg':()=>{
    
    const id=uid();S.org.regions=(S.org.regions||[]).concat([{id,name:''}]);orgSave();
    setTimeout(()=>{const i=document.querySelector('#regRoot .mg-inp[data-id="'+id+'"]');if(i)i.focus();},S.live?260:20);
  },
  'org.delTeam':el=>{
    
    const t=(S.org.teams||[]).find(x=>x.id===el.dataset.id);if(!t)return;
    confirmModal('팀 삭제','"'+t.name+'" 팀을 삭제합니다. 이 팀의 공통 업무도 화면에서 사라지고, 배정된 담당자는 미배정으로 돌아갑니다.',()=>{
      S.org.teams=S.org.teams.filter(x=>x.id!==t.id);
      Object.keys(S.people||{}).forEach(id=>{if(S.people[id].team===t.id)store.putPerson(id,{...S.people[id],team:''});});
      orgSave();});
  },
  'org.delReg':el=>{
    
    const r=(S.org.regions||[]).find(x=>x.id===el.dataset.id);if(!r)return;
    confirmModal('권역 삭제','"'+r.name+'" 권역을 삭제합니다. 배정된 담당자의 권역은 비워집니다.',()=>{
      S.org.regions=S.org.regions.filter(x=>x.id!==r.id);
      Object.keys(S.people||{}).forEach(id=>{if(S.people[id].region===r.id)store.putPerson(id,{...S.people[id],region:''});});
      orgSave();});
  },
  'org.tab':el=>{S.orgTab=el.dataset.t;rOrg();},
  /* 현장 위치 지도(526차) — 시도를 누르면 확대, 우클릭·바다 클릭·뒤로 버튼이면 한 단계 되돌린다 */
  'org.mapPv':el=>{
    const km=S.km||(S.km={vb:{...KM_VB0},sel:'',hist:[]});
    const c=el.dataset.c;
    /* ⚠ 이미 그 시도를 보고 있으면 아무것도 하지 않는다 — 확대된 면이 화면을 거의 채우므로
       무심코 한 번 더 눌리기 쉽고, 그때마다 이력이 쌓여 뒤로가 두 번 필요했다(531차) */
    if(c===km.sel)return;
    /* 602차: 이미 그 시도보다 더 깊이 확대돼 있으면(시군구까지 들어간 상태) 좌클릭으로 도로 축소되지 않게 한다 */
    const box=kmZoomBox(c);
    if(km.vb.w<box.w*0.98)return;
    km.hist.push({vb:{...km.vb},sel:km.sel});
    km.vb=box;km.sel=c;rOrgMap();
  },
  /* 축소 버튼은 한 번에 전체로 — 여러 시도를 옮겨 다닌 뒤에는 한 단계씩 되돌리면 안 듣는 것처럼 보였다 */
  'org.mapAll':()=>{const km=S.km;if(!km)return;km.vb={...KM_VB0};km.sel='';km.hist=[];rOrgMap();},
  'org.mapBig':kmOpenBig,   /* 547차 */
  'org.mapYrMenu':el=>{   /* 575차: 년차 필터 드롭다운 — 앱 공용 메뉴(openCtx). 576차: 다중 선택 — 고르면 닫지 않고 같은 자리에 다시 연다 */
    if(_ctxEl&&document.contains(_ctxEl)&&_ctxEl.dataset.for==='kmYr'){closeCtx();return;}   /* 580차: 열려 있으면 닫는다 · 601차: 떼어진 메뉴는 무시 */
    const r=el.getBoundingClientRect(),cur=S.kmYr||[];
    const items=[{label:'전체',on:!cur.length,act:()=>{S.kmYr=[];rOrgMap();}},{sep:true},   /* 구분선은 다른 메뉴와 같은 {sep:true} */
      ...KM_YR.map(([k,nm])=>({label:nm,check:true,on:cur.includes(k),act:()=>{S.kmYr=cur.includes(k)?cur.filter(z=>z!==k):[...cur,k];rOrgMap();
        const b=$('[data-act="org.mapYrMenu"]');if(b)ACT['org.mapYrMenu'](b);}}))];
    openCtx(r.right-172,r.bottom+4,items,el);if(_ctxEl)_ctxEl.dataset.for='kmYr';},
  'org.mapTo':el=>kmClickDefer(()=>kmGoSite(el.dataset.sid)),   /* 548차 · 553차: 더블클릭(주소)과 겹치지 않게 미룬다 */
  'org.mapOwn':el=>{S.kmOwn=S.kmOwn===el.dataset.own?'':el.dataset.own;rOrgMap();},   /* 549차 */
  'org.mapTab':el=>{S.kmTab=el.dataset.t;rOrgMap();},   /* 550차 */
  'org.mapReg':el=>{S.kmReg=S.kmReg===el.dataset.reg?'':el.dataset.reg;rOrgMap();},   /* 551차 */
  'org.mapAddr':el=>kmAddrEdit(el.dataset.sid),   /* 552차 */

  'org.reg':el=>{S.orgReg=el.dataset.id||'';rOrg();},
  'org.draftSave':()=>{if(orgDraftApply())toast('현장 정보를 저장했습니다');},
  'org.draftDrop':()=>{ORG_DRAFT={};rOrg();},
  'org.draftDropGo':el=>{ORG_DRAFT={};closeModal();go(el.dataset.v);},
  'org.addSite':()=>{
    /* 795차: 새 현장은 권역 없이(→ 공구장·담당자도 빈 채) · 토글 전부 끔(하자현황 = dfHide, 공가·소송 = siteConfig) · 표 맨 아래(siteCmp: 이름 없는 행은 끝).
       전엔 첫 권역을 넣어 그 권역 준공일 없는 줄 사이에 끼었다. 권역 탭에서 누르면 새 행이 안 보이므로 전체 탭으로 */
    const id=uid(),off={hasCommercial:false,showVacant:false,lawsuit:false};
    if(!orgRegHit('',S.orgReg))S.orgReg='';
    const hm={...dfHidden(),[id]:true};store.putCfg('dfHide',hm);S.cfg={...S.cfg,dfHide:hm};
    dfSiteCfgWrite(id,off);if(DF._cfgLast)DF._cfgLast[id]={...off};
    S.org.sites=(S.org.sites||[]).concat([{id,name:'',team:'',region:'',...off}]);orgSave();
    setTimeout(()=>{const i=document.querySelector('#siteRoot .mg-inp[data-id="'+id+'"]');if(i)i.focus();},S.live?300:30);
  },
  /* 695차: 담당자(명단) 삭제 — people/{id} 만 지운다. 계정(users)·그 사람 업무(tasks/{uid})는 남는다(업무 화면에선 이름만 사라진다).
     관리자만(규칙: people 삭제는 editor 만 허용). 우클릭 → 확인 모달 */
  'org.delPerson':el=>{
    const id=el.dataset.id,p=roster().find(x=>x.id===id);if(!p)return;
    if(!isEditor()){toast('관리자만 삭제할 수 있습니다');return;}
    if(id===authUid()){toast('본인은 명단에서 지울 수 없습니다');return;}
    const n=Object.keys((mergedTaskMaps()[id])||{}).length;
    confirmModal('담당자 삭제','"'+(p.name||'')+'" 을(를) 팀 명단에서 뺍니다. 이 사람의 업무'+(n?'('+n+'건)':'')+'는 이름과 함께 남고, 담당 현장 배정만 풀립니다. 계정은 「미배정」에 남아 다시 배정할 수 있습니다.',()=>{
      /* 696차: 레코드를 지우면 그 사람 업무가 이름 없이 공통 그룹에 섞인다(tkOwnerName·tkRegionOf 가 명단에서 이름을 찾는다).
         → 팀·권역·담당 현장만 비워 「미배정」으로. 명단·업무 현황 탭에서 빠지고 업무엔 이름이 남는다(권역 미지정 그룹). 계정 목록에서 다시 배정 가능 */
      const cur=(S.people||{})[id]||{};
      store.putPerson(id,{name:p.name||cur.name||'',email:p.email||cur.email||'',team:'',region:'',rank:'member',sites:{}});
      rosterBust();rOrg();rTasks();toast('팀 명단에서 뺐습니다 — 「미배정」에서 다시 배정할 수 있습니다');
    },'삭제');
  },
  'org.delSite':el=>{
    
    const st=(S.org.sites||[]).find(x=>x.id===el.dataset.id);if(!st)return;
    confirmModal('현장 삭제','"'+(st.name||'이름 없음')+'" 현장을 삭제합니다. 담당자에게 배정된 이 현장도 함께 해제됩니다.',()=>{
      S.org.sites=S.org.sites.filter(x=>x.id!==st.id);
      Object.keys(S.people||{}).forEach(id=>{const p=S.people[id];
        if(p.sites&&p.sites[st.id]){const ns={...p.sites};delete ns[st.id];store.putPerson(id,{...p,sites:ns});}});
      /* 620차 전수 점검: 삭제 잔재 정리 — ① 이 PC 의 원본 하자 행(IndexedDB) ② siteConfig 리프.
         과거 게시월의 report/{rm}/{sid} 노드는 역사(스냅샷·과거 조회)라 남긴다 */
      delete S.def[st.id];defDelete(st.id);
      if(S.live&&FB.db)try{FB.db.ref('siteConfig/'+st.id).set(null);}catch(e){}
      orgSave();});
  },
  /* 694차: 현장 → 담당자 지정. 사람별 sites 맵을 고쳐 저장한다(데이터 구조는 그대로 — 현장 쪽 목록은 없다) */
  'acct.sitePick':el=>{
    
    const id=el.dataset.id,p=roster().find(x=>x.id===id);if(!p)return;
    if(!canAssignSites(id)){toast('담당 현장을 바꿀 권한이 없습니다');return;}   /* 628차 위계 */
    /* 자기 권역 현장만 고른다(628·630차: 담당자 본인 + 공구장의 남 배정 — 규칙 orgSiteRegion 검증과
       일치시켜 타권역 체크가 저장에서 거부되는 혼란을 막는다). 타권역 기존 배정은 숨은 채로 보존.
       관리자·팀장만 전 그룹. */
    const selfLtd=!isEditor()&&myRank()!=='head';
    const regsAll=(S.org.regions||[]).filter(r=>r.name);
    const regs=selfLtd?regsAll.filter(r=>r.id===myRegion()):regsAll;
    const sites=S.org.sites||[];
    if(!sites.length){toast('등록된 현장이 없습니다');return;}
    if(selfLtd&&!regs.length){toast('권역이 아직 지정되지 않았습니다 — 관리자에게 요청하세요');return;}
    const group=(rid,label)=>{
      const items=sites.filter(x=>(x.region||'')===rid);
      if(!items.length)return '';
      return '<div class="spk-g">'+esc(label)+'</div>'+items.map(x=>
        '<label class="spk-i"><input type="checkbox" data-sid="'+esc(x.id)+'"'+((p.sites||{})[x.id]?' checked':'')+'>'+esc(x.name)+'</label>').join('');
    };
    const shownRegIds=new Set(regs.map(r=>r.id).concat(selfLtd?[]:['']));
    const hiddenKeep=Object.keys(p.sites||{}).filter(sid2=>{
      const st2=sites.find(x=>x.id===sid2);return st2&&!shownRegIds.has(st2.region||'');
    }).map(sid2=>'<input type="checkbox" data-sid="'+esc(sid2)+'" checked hidden>').join('');
    openModal(p.name+' · 담당 현장',   /* 제목은 textContent — esc 하면 &가 &amp;로 보인다 */
      '<div class="spk">'+regs.map(r=>group(r.id,r.name)).join('')+(selfLtd?'':group('','권역 미지정'))+hiddenKeep+'</div>',
      '<button class="btn bg2 bsm" data-act="modal.close">취소</button><button class="btn bp bsm" data-act="modal.ok">저장</button>');
    MODAL_CB={type:'sites',ok:()=>{
      const sel={};
      $$('.spk input:checked').forEach(c=>{sel[c.dataset.sid]=1;});   /* hidden 보존분 포함(628차) */
      const cur=(S.people||{})[id]||{};
      store.putPerson(id,{name:p.name||'',email:p.email||'',team:cur.team||p.team||'',
        region:cur.region||p.region||'',rank:rankOf(cur.rank||p.rank),sites:sel});
      closeModal();if(!S.live)rOrg();
    }};
  },
  /* 담당 현장 칩을 눌러 그 현장만 뺀다(389차) — 넣는 길(+ 선택창)만 있고 빼는 길이 없었다.
     ⚠ putPerson 은 레코드 전체를 쓴다 — 나머지 값을 그대로 실어 보내야 지워지지 않는다 */
  'acct.siteOff':el=>{
    const id=el.dataset.id,sid=el.dataset.sid;
    const p=roster().find(x=>x.id===id);if(!p)return;
    if(!canAssignSites(id)){toast('담당 현장을 바꿀 권한이 없습니다');return;}   /* 628차 위계 */
    const cur=(S.people||{})[id]||{};
    const sites={...(cur.sites||p.sites||{})};delete sites[sid];
    store.putPerson(id,{name:p.name||'',email:p.email||'',team:cur.team||p.team||'',
      region:cur.region||p.region||'',rank:rankOf(cur.rank||p.rank),sites});
    rosterBust();          /* ⚠ roster() 는 같은 틱 동안 캐시를 쓴다 — 비우지 않으면 옛 배정이 다시 그려진다 */
    if(!S.live)rOrg();
    toast(siteName(sid)+' 을(를) 뺐습니다');
  },
  'set.guide':()=>openReadme(),
  'offday.save':()=>{
    const i=$('#offName'),ds=$('[data-act="offday.save"]').dataset.ds;
    const n=String((i&&i.value)||'').trim().slice(0,12);
    if(!n)return toast('이름을 적어 주세요');
    store.putOffday(ds,n);closeModal();toast(mdLabel(ds)+' '+n);
  },
  'readme.tab':el=>{
    const i=Number(el.dataset.i)||0;
    $$('#mbody .rd-navi').forEach((b,k)=>b.classList.toggle('act',k===i));
    $$('#mbody .rd-sec').forEach((d,k)=>d.classList.toggle('act',k===i));
    const sc=$('#mbody .md-scroll');if(sc)sc.scrollTop=0;
  },
  'set.copyErr':()=>{
    const txt='버전 v'+APP_VER+' · '+navigator.userAgent+'\n'+(ERRLOG.length?ERRLOG.join('\n'):'기록된 오류 없음');
    if(navigator.clipboard&&navigator.clipboard.writeText)
      navigator.clipboard.writeText(txt).then(()=>toast('복사했습니다')).catch(()=>toast('복사 실패'));
    else toast('복사를 지원하지 않는 브라우저입니다');
  },
  /* 휴지통(383차) — 열기·복원·영구 삭제. 목록은 열 때마다 서버에서 읽는다 */
  'trash.open':()=>trashOpen(),
  'trash.restore':el=>{const sid=el.dataset.sid,iid=el.dataset.iid;
    trashAll(t=>{const w=t[sid]&&t[sid][iid];
      if(!w){toast('이미 없는 항목입니다');trashOpen();return;}
      let it=null;try{it=JSON.parse(LZString.decompressFromBase64(w.z)||'null');}catch(e){}
      if(!it){toast('복원할 수 없는 항목입니다');return;}
      if(!canEditTask(it,sid)){denyTask();return;}   /* 627차 */
      store.putTask(sid,iid,histPush(cleanTask(it),'restore'));   /* cleanTask 를 다시 지나 tasks 스키마로 검증된다 */
      trashDrop(sid,iid);
      toast('복원했습니다');trashOpen();});},
  'trash.del':el=>{const sid=el.dataset.sid,iid=el.dataset.iid;
    confirmModal('영구 삭제','이 업무를 휴지통에서 완전히 지웁니다. 되돌릴 수 없습니다.',()=>{
      trashDrop(sid,iid);toast('완전히 지웠습니다');trashOpen();});},
  'bk.now':()=>{
    if(!isEditor())return toast('관리자만 내보낼 수 있습니다');
    const d=window.bkExport&&window.bkExport();
    if(!d)return toast('아직 자료를 다 받지 못했습니다 · 잠시 뒤 다시 눌러 주세요');
    bkDownload(d.name,d.text);
    try{localStorage.setItem(bkKey(),JSON.stringify({at:new Date().toISOString(),name:d.name,by:'수동'}));}catch(e){}
    rBk();toast('내려받기 폴더에 저장했습니다 · '+d.name);
  },
  /* 암호화 백업 복호(629차) — 위젯 안에서만 가능(DPAPI 는 그 PC·그 계정 귀속).
     브라우저 단독이면 같은 PC 의 위젯 화면에서 되돌리라고 안내한다. */
  'bk.restore':()=>{
    if(!isEditor())return toast('관리자만 되돌릴 수 있습니다');
    const inp=document.createElement('input');
    inp.type='file';inp.accept='.json,application/json';
    inp.onchange=()=>{
      const f=inp.files&&inp.files[0];if(!f)return;
      if(f.size>20*1024*1024)return toast('20MB 이하 백업 파일만 불러올 수 있습니다');
      const rd=new FileReader();
      rd.onload=async()=>{
        let raw=String(rd.result||'');
        if(raw.startsWith('HPWENC1')){   /* 629차: 위젯 자동 백업은 DPAPI 로 잠겨 있다 */
          raw=await bkDecrypt(raw);
          if(raw==null)return;   /* 안내는 bkDecrypt 가 했다 */
        }
        let d=null;
        try{d=JSON.parse(raw);}catch(e){return toast('읽을 수 없는 파일입니다');}
        if(!d||d.kind!=='hplan-backup')return toast('이 앱의 백업 파일이 아닙니다');
        const n=Object.values(d.tasks||{}).reduce((a,m)=>a+Object.keys(m||{}).length,0);
        confirmModal('백업으로 되돌리기',
          (d.savedAt||'').slice(0,10)+' 시점으로 되돌립니다 · 업무 '+n+'건, 담당자 '+Object.keys(d.people||{}).length+'명.<br>'
          +'<b>지금 내용은 모두 사라집니다.</b> 되돌리기 전에 한 번 더 백업해 두세요.',()=>{
            /* ⚠ 팀·권역·현장은 하자처리 현황이 원본이라 되돌리지 않는다 — 되돌려도 곧 덮어써진다 */
            if(d.people)Object.keys(d.people).forEach(k=>store.putPerson(k,d.people[k]));   /* 한 명씩 되돌린다 */
            if(d.tasks)Object.keys(d.tasks).forEach(sid=>Object.keys(d.tasks[sid]||{}).forEach(iid=>store.putTask(sid,iid,d.tasks[sid][iid])));
            toast('되돌렸습니다 · 화면을 새로고침해 주세요');
          },'되돌리기',true);
      };
      rd.readAsText(f);
    };
    inp.click();
  },
  'team.pop':el=>{
    const p=$('#teamPop');if(!p)return;
    const on=!p.classList.contains('on');
    p.classList.toggle('on',on);
    el.setAttribute('aria-expanded',on?'true':'false');
  },
  'team.switch':el=>{
    const p=$('#teamPop');if(p)p.classList.remove('on');
    const tid=el.dataset.tid||(el.value||'');
    if(!tid)return;
    S.tk.t=tid;S.tk.m=null;
    if(el.id!=='teamSelEl')rTeamSel();   /* 선택창에서 고른 경우 다시 그리면 열려 있던 목록이 닫힌다 */
    else{const e2=$('#teamSelEl');if(e2)e2.value=tid;}
    if(S.view==='tasks')rTasks();
    if(S.view==='settings')rOrg();
  },
  'acct.role':el=>{
    if(!isEditor())return denyEdit();
    const uid=el.dataset.id,v=el.value;
    if(!S.live){toast('로그인 후에 변경할 수 있습니다');return;}
    const who=(S.accounts[uid]&&S.accounts[uid].email)||'계정';
    FB.db.ref('users/'+uid+'/role').set(v)
      .then(()=>toast(who+' → '+roleLabel(v)))
      .catch(e=>{fbErr(e);rOrg();});
  },
  'day.fmore':el=>{   /* 458차: 달력 상단 꺽쇠 팝업 · 518차: 화면마다 자기 팝업을 연다 */
    const wrap=el.closest('.cal-nav');
    const p=wrap?wrap.querySelector('.cal-filt-pop'):$('#calFilt');
    if(!p)return;
    const on=!p.classList.contains('on');
    document.querySelectorAll('.cal-filt-pop.on').forEach(x=>{if(x!==p)x.classList.remove('on');});
    p.classList.toggle('on',on);
    if(el&&el.setAttribute)el.setAttribute('aria-expanded',on?'true':'false');
    if(on)rFilter();
  },
  'filt.msel':el=>{const m=el.closest('.msel'),was=m.classList.contains('open');mselClose();if(was)return;
    m.classList.remove('up');m.classList.add('open');
    /* 아래가 잘리면 위로 편다(520차) — 잘림 한계는 viewport 가 아니라 overflow 조상(업무현황 왼쪽 칸)까지 본다 */
    const p=m.querySelector('.msel-pop');
    if(p){
      let lim=innerHeight,a=m.parentElement;
      while(a&&a!==document.body){const cs=getComputedStyle(a);
        if(cs.overflowY!=='visible')lim=Math.min(lim,a.getBoundingClientRect().bottom);
        a=a.parentElement;}
      const r=p.getBoundingClientRect(),mr=m.getBoundingClientRect();
      if(r.bottom>lim&&mr.top-r.height-5>0)m.classList.add('up');
    }},
  'filt.mopt':el=>{
    const m=el.closest('.msel'),g=m.dataset.g,st=mselStore(m);
    const cur=(st[g]||[]).map(String),i=cur.indexOf(el.dataset.v);
    if(i<0)cur.push(el.dataset.v);else cur.splice(i,1);
    st[g]=cur;mselApply(m);},
  'filt.mall':el=>{const m=el.closest('.msel');mselStore(m)[m.dataset.g]=[];mselApply(m);},
  'cal.pick':()=>openYMPick(),
  'cal.today':()=>{closeYMPop();if(CAL)CAL.today();selDate(todayStr());if(isMob()&&!WIDGET)rCalMini();calTodaySync();},   /* 773차: 오늘로 — 달력 이동 + 오늘 선택(폰 미니 격자도 다시 그림) */
  'nq.mob':()=>{nqOpen(true);const i=$('#nqQ');if(i)setTimeout(()=>i.focus(),120);},   /* 732차: 폰 검색 = 전체화면 */
  'cal.pickY':el=>{const c=CAL?CAL.view.currentStart:new Date();
    YM_Y=(YM_Y===null?c.getFullYear():YM_Y)+Number(el.dataset.d);
    const box=$('#ymPop');if(box)box.innerHTML=ymPickHTML();},
  'cal.goYM':el=>{
    const y=Number(el.dataset.y),m=Number(el.dataset.m);
    if(!$('#ymPop'))closeModal();   /* 팝업으로 열렸으면 그대로 둔다 — 연달아 옮겨 볼 수 있다 */
    if(!CAL)return;
    CAL.gotoDate(new Date(y,m-1,1));
    /* 그 달에 오늘이 있으면 오늘을, 아니면 1일을 고른다 */
    const t=new Date(),same=t.getFullYear()===y&&t.getMonth()+1===m;
    selDate(y+'-'+pad(m)+'-'+pad(same?t.getDate():1),true);   /* 이동만 — 업무 팝업은 열지 않는다 */
    rMonTitle();subVisibleMonths();refetchCal();
    const yp=$('#ymPop');if(yp)yp.innerHTML=ymPickHTML();   /* 고른 달을 팝업에도 표시 */},
  'wid.popClose':()=>{S.widPop=false;if(S.planEdit)closePlanEdit();rWidget();},
  /* 위젯 내려받기 — 늘 최신 릴리스를 가리키는 고정 주소(팀원은 받아서 두 번 누르면 끝).
     ⚠ 예전에는 설정의 `cfg.widgetUrl` 이 이 상수를 이겼다 — 그 입력칸은 165차에 없앴는데
     저장돼 있던 옛 주소(Electron)가 계속 이겨서 186차 전환이 화면에 안 나타났다. 상수만 쓴다. */
  'wid.dl':()=>{
    window.open(WIDGET_URL,'_blank','noopener');
  },
  'wid.open':()=>{window.open(location.origin+location.pathname,'_blank','noopener');},
  'wid.reload':()=>location.reload(),
  'app.reload':()=>location.reload(),   /* 헤더 로고 클릭 — 새로고침(525차 사용자 지시) */
  'wid.side':el=>{evePopHide();widSideOpen(el.dataset.tab||'mine');},   /* 누르면 말풍선은 할 일을 다했다 */
  /* 위젯 내 업무에서 바로 완료/진행 전환 — 애니메이션을 보여 주고 목록을 다시 그린다 */
  'wid.st':el=>{
    const sid=el.dataset.sid,iid=el.dataset.iid;
    const cur=(S.tasks[sid]||{})[iid];if(!cur)return;
    const n=stEff(cur)===2?1:2;
    stxSet(el,n);
    store.putTask(sid,iid,histPush({...cur,st:n,stKeep:n===1,updatedAt:Date.now()},n===2?'done':(n===3?'hold':'undone')));
    toast(n===2?'완료로 바꿨습니다':'진행으로 되돌렸습니다');
    setTimeout(()=>{if(!S.live){rTasks();rDay();rWidget();}widSideRender();refetchCal();},220);
  },
  'wid.more':el=>{const k=el.dataset.k;S.widMore[k]=!S.widMore[k];widSideRender();},
  'wid.goTask':el=>{
    const d=el.dataset.date;
    const el2=$('#widSide');if(el2)el2.classList.remove('on');S.widSide='';
    if(d){
      if(CAL)CAL.gotoDate(toDate(d));
      selDate(d,true);S.planOpen=el.dataset.iid||'';S.widPop=true;
      rMonTitle();refetchCal();rDay();rWidget();
    }else toast('기한이 없는 업무입니다 · 브라우저 앱의 업무 목록에서 볼 수 있습니다');
  },
  'wid.moveOn':()=>{const p=$('#wgSet');if(p){p.classList.remove('on');p.setAttribute('aria-hidden','true');}widMove(true);},
  'wid.moveOff':()=>widMove(false),
  'wid.set':()=>{const p=$('#wgSet');if(!p)return;p.classList.toggle('on');p.setAttribute('aria-hidden',p.classList.contains('on')?'false':'true');widApply();}
};
/* 필터 = 업무 구분 · 진행 상태 · 권역 · 담당자 · 현장.
   팀 - 권역 - 담당자 - 현장 계층이라 위 단계를 고르면 아래 목록이 함께 좁혀진다. */
/* 다중 선택 선택창 — 생김새는 기존 select 와 같고, 누르면 체크 목록이 열린다.
   값은 배열이며 빈 배열이 곧 '전체'. scope 는 'cal'(업무 일정) 또는 'tk'(업무 목록) */
function mselHTML(scope,g,all,items,sel){
  const on=(sel||[]).map(String);
  const names=items.filter(([v])=>on.includes(String(v))).map(([,l])=>l);
  const label=!names.length?all:(names.length===1?names[0]:names[0]+' 외 '+(names.length-1));
  return '<div class="msel'+(on.length?' on':'')+'" data-g="'+g+'" data-scope="'+scope+'">'
    +'<button class="msel-b" data-act="filt.msel" data-tip="'+esc(names.join(', ')||all)+'">'
      +'<span>'+esc(label)+'</span><svg class="icn msel-c"><use href="#i-chevr"></use></svg></button>'
    +'<div class="msel-pop">'
      +'<button class="msel-all" data-act="filt.mall">전체</button>'
      +items.map(([v,l])=>'<button class="msel-o'+(on.includes(String(v))?' on':'')+'" data-act="filt.mopt" data-v="'+esc(v)+'">'
        +'<span class="msel-k"><svg class="icn"><use href="#i-check"></use></svg></span>'+esc(l)+'</button>').join('')
    +'</div></div>';
}
function mselStore(el){return el.dataset.scope==='tk'?(S.tkF=S.tkF||{}):(S.filter=S.filter||{});}
function mselApply(el){
  if(el.dataset.scope==='tk'){filtSave();rTkViews();}
  else{filtSave();rFilter();refetchCal();rDay();rWidget();}
}
function mselClose(){document.querySelectorAll('.msel.open').forEach(x=>x.classList.remove('open'));}
function rFilter(){
  const box=$('#dpFadv');if(!box)return;
  const list=roster(),me=S.user?list.find(p=>p.id===(S.user.uid||'')):null;
  const regs=(S.org.regions||[]).filter(r=>r.name);
  const f=S.filter;
  /* 값은 모두 배열 — 빈 배열이 '전체'다. 없어진 항목은 걸러 낸다 */
  const keep=(arr,ids)=>(arr||[]).map(String).filter(v=>ids.includes(v));
  f.reg=keep(f.reg,regs.map(r=>r.id));
  /* 권역을 고르면 담당자·현장 목록이 그만큼 좁아진다 */
  const inReg=f.reg.length?list.filter(p=>f.reg.includes(p.region)):list;
  f.own=keep(f.own,inReg.map(p=>p.id));
  let sites=(S.org.sites||[]).filter(x=>x.name);
  if(f.reg.length)sites=sites.filter(x=>f.reg.includes(x.region));
  if(f.own.length){
    /* 고른 담당자에게 배정된 현장이 하나도 없으면 좁히지 않는다 — 목록이 빈 채로 잠기는 것을 막는다 */
    const ids=[];
    f.own.forEach(id=>{const p=list.find(x=>x.id===id);if(p)Object.keys(p.sites||{}).filter(k=>(p.sites||{})[k]).forEach(k=>ids.push(k));});
    if(ids.length)sites=sites.filter(x=>ids.includes(x.id));
  }
  f.site=keep(f.site,sites.map(x=>x.id));
  const M=(g,all,items)=>mselHTML('cal',g,all,items,f[g]);
  box.innerHTML=
    '<div class="dp-frow">'
      +M('kind','업무 구분 전체',TK_KIND.map(k=>[k[0]||'_gen',k[1]]))
      +M('st','진행 상태 전체',ST_PICK)
    +'</div><div class="dp-frow">'
      +M('reg','권역 전체',regs.map(r=>[r.id,r.name]))
      +M('own','담당자 전체',meFirst(inReg).map(p=>[p.id,p.name+(me&&p.id===me.id?' (나)':'')]))
    +'</div><div class="dp-frow">'
      +M('site','현장 전체',sites.map(x=>[x.id,x.name]))
    +'</div>';
}
function confirmModal(title,msg,cb,okLabel,danger){
  openModal(title,'<div style="font-size:13px;color:var(--lbl2);line-height:1.6">'+esc(msg)+'</div>',
    '<button class="btn bg2 bsm" data-act="modal.close">취소</button>'
    +'<button class="btn '+((danger===false)?'bp':'btn-danger')+' bsm" data-act="modal.ok">'+esc(okLabel||'삭제')+'</button>');
  MODAL_CB={type:'confirm',ok:()=>{cb();closeModal();}};
}
document.addEventListener('click',e=>{
  /* 655차: 선택 클릭은 여기까지 오지 않는다 — 위 91행 리스너가 먼저 막지만, 순서가 바뀌어도 안전하게 한 번 더 */
  if(e.target.closest(PICK_SEL)&&!e.target.closest('.tk-acts')&&!e.target.closest('.plan-acts')
     &&(e.ctrlKey||e.metaKey||e.shiftKey||PICK.mode))return;
  /* 다중 선택 목록은 바깥을 누르면 닫는다 */
  if(!e.target.closest('.msel'))mselClose();

  /* 위젯 업무 팝업 — 달력 칸이나 팝업 자신이 아닌 곳을 누르면 닫는다 */
  if(WIDGET&&S.widPop&&!e.target.closest('#widPop')&&!e.target.closest('#fcal td.fc-daygrid-day')){
    S.widPop=false;rWidget();
  }
  /* 팝오버는 색 원 버튼 안에 들어 있다 — 여기서 막지 않으면 안쪽 클릭이 버튼까지 올라가 팝오버가 닫힌다 */
  if(e.target.closest('#colPop'))return;
  /* 지도 안 클릭(시도·바다)은 549차부터 220ms 미룬다 — 더블클릭이면 버린다(kmClickDefer).
     범례·뒤로 같은 버튼은 지도(svg) 밖이라 바로 간다 */
  {const svg=e.target.closest('.okm');   /* 겹층의 점은 여기 안 걸린다 — 점 클릭은 아무 일도 하지 않는다 */
   if(svg){
     const tgt=e.target,cx=e.clientX,cy=e.clientY;
     e.stopPropagation();
     /* 552차: 지연은 더블클릭이 있는 **모달에서만** — 카드는 바로 반응한다 */
     (svg.id==='okmBig'?kmClickDefer:f=>f())(()=>{
       /* 547차: 모달 안의 지도는 조상에 modal.stop 이 있어 [data-act] 를 지도 안으로 한정한다 */
       if(!tgt.closest('.okm [data-act]')){kmBack();return;}
       /* 이미 그 시도 안이면 한 단계 더 — 누른 자리의 시군구로 들어간다(537차) */
       const pv=tgt.closest('.okm-pv,.okm-mp'),km=S.km;   /* 584차: 시군구 면도 시도처럼 */
       if(pv&&km&&km.sel&&pv.dataset.c===km.sel){
         const q=kmMapXY($('#'+svg.id)||svg,cx,cy);   /* 554차: 미루는 사이 다시 그려졌으면 새 svg 로 잰다 */
         const m=q&&kmMuniAt(km.sel,q[0],q[1]);
         if(m){km.hist.push({vb:{...km.vb},sel:km.sel});km.vb=m.vb;km.sel='';rOrgMap();return;}
         /* 시도 강조선은 끈다 — 시군구 안까지 들어왔는데 시도 윤곽이 화면을 가로지르면 어지럽다 */
       }
       const el=tgt.closest('.okm [data-act]');const fn=el&&ACT[el.dataset.act];if(fn)fn(el);
     });
     return;
   }}
  const el=e.target.closest('[data-act]');
  if(!el)return;
  if(el.tagName==='SELECT')return;   /* select 는 change 에서만 처리 — 누르기만 해도 실행되던 버그 방지 */
  const fn=ACT[el.dataset.act];
  if(fn){if(el.dataset.act!=='modal.stop')e.stopPropagation();fn(el);}
});
/* 달력 설정 팝업 닫기 — ⚠ click 이 아니라 **mousedown 캡처**로 듣는다.
   FullCalendar 가 달력 칸의 click 을 삼켜, click 위임으로는 달력 위를 눌렀을 때 안 닫힌다(openCtx 와 같은 함정). */
function calFiltClose(){
  const cf=$('#calFilt');if(!cf||!cf.classList.contains('on'))return;
  cf.classList.remove('on');
  const b=document.querySelector('[data-act="day.fmore"]');if(b)b.setAttribute('aria-expanded','false');
}
document.addEventListener('mousedown',e=>{
  if(!(e.target.closest&&e.target.closest('#calFiltWrap')))calFiltClose();   /* 466차: 필터도 바깥 클릭으로 닫는다 */
  if(!(e.target.closest&&e.target.closest('#teamsel'))){const tp=$('#teamPop');
    if(tp&&tp.classList.contains('on')){tp.classList.remove('on');
      const tb=$('#teamSelEl');if(tb)tb.setAttribute('aria-expanded','false');}}   /* 516차 */
},true);

/* 임의로 추가한 색 칩은 우클릭으로 지운다 — 지우면 첫 칩(자동)으로 되돌린다 */
document.addEventListener('contextmenu',e=>{
  const chip=e.target.closest('.pal-c.pal-custom');
  if(!chip)return;
  if(chip.closest('#colPop')){        /* 업무 색 팝오버의 추가색 — 저장 목록에서도 지운다 */
    e.preventDefault();
    palDel(chip.dataset.c||'');
    const pop=$('#colPop'),cur=(chip.classList.contains('sel'))?'auto':null;
    if(cur)setPlanColor('auto');
    if(pop)pop.innerHTML=colPopHTML(cur||chip.dataset.c);
    if(pop)cpPaint(pop,'#3E71D2');
    return;
  }
  e.preventDefault();
  const box=chip.closest('.pal');
  const wasSel=chip.classList.contains('sel');
  chip.remove();
  if(wasSel&&box){
    const first=box.querySelector('.pal-c');
    if(first)first.classList.add('sel');
    const c=first?(first.dataset.c||''):'';
    /* 화면 선택만 바꾸면 저장값이 지워진 색으로 남는다 — 실제 값도 함께 되돌린다 */
    if(box.id==='pfPal'){PF_SEL.color=c;pfPaint(c);acctAutoSave();}
    else if(box.closest('#colPop'))setPlanColor(c||'auto');
  }
});
document.addEventListener('click',e=>{
  const pal=e.target.closest('.pal-c');
  if(pal&&!pal.classList.contains('pal-add')){const box=pal.closest('.pal');
    if(box){box.querySelectorAll('.pal-c').forEach(x=>x.classList.remove('sel'));pal.classList.add('sel');}}
});
/* 색 직접 고르기 — 고르는 중에는 미리보기 칩 하나만 움직이고, 손을 뗄 때 최근색으로 남긴다.
   ⚠ input 은 드래그 내내 계속 울린다 — 여기서 저장하면 최근색이 중간 색으로 가득 찬다(651차) */
document.addEventListener('input',e=>{
  const inp=e.target.closest('.pal-inp');if(!inp)return;
  const box=inp.closest('.pal');if(!box)return;
  const v=String(inp.value||'').toUpperCase();
  box.querySelectorAll('.pal-c').forEach(x=>x.classList.remove('sel'));
  const same=box.querySelector('.pal-c[data-c="'+v+'"]');
  if(same){
    const live=box.querySelector('.pal-c.pal-live');if(live)live.remove();
    same.classList.add('sel');return;
  }
  let chip=box.querySelector('.pal-c.pal-live');
  if(!chip){
    chip=document.createElement('div');chip.className='pal-c pal-custom pal-live';
    chip.setAttribute('data-tip','우클릭으로 삭제');
    box.insertBefore(chip,inp.closest('.pal-add'));
  }
  chip.dataset.c=v;chip.style.background=v;chip.classList.add('sel');
});
document.addEventListener('change',e=>{
  const inp=e.target.closest('.pal-inp');if(!inp)return;
  const box=inp.closest('.pal');if(!box)return;
  const v=String(inp.value||'').toUpperCase();
  palAdd(v);
  const live=box.querySelector('.pal-c.pal-live');if(live)live.classList.remove('pal-live');
});
/* 미처리 목록 — 필터행 입력·메뉴 검색은 input 이벤트로 듣는다(click 위임으로는 못 받는다) */
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.classList&&t.classList.contains('rl-fin')){
    REC.filters[t.dataset.key]=t.value;
    if(!String(t.value||'').trim())delete REC.filters[t.dataset.key];
    recRowsOnly();return;
  }
  if(t.dataset&&t.dataset.act==='rec.menuSearch'){
    const M=REC._menu;if(!M)return;
    M.q=t.value;const q=M.q.trim().toLowerCase();
    if(q)M.sel=new Set(M.all.filter(v=>String(v).toLowerCase().includes(q)));
    recMenuRenderList();return;
  }
});
/* 업무 폼은 자동 저장 — 입력이 멎으면 조용히 반영된다(저장 버튼 없음) */
document.addEventListener('input',e=>{if(e.target.closest&&e.target.closest('#dpEdit'))planAutosave();});
document.addEventListener('change',e=>{
  if(e.target.id==='peOcc'){ACT['plan.moveOcc'](e.target);return;}   /* 428차: 날짜 고르면 즉시 회차 이동 */
  if(e.target.classList&&e.target.classList.contains('cp-hue')){
    const pop=$('#colPop');if(!pop)return;
    const d=pop.querySelector('.cp-dot');
    const [,sa,v]=hexHsv(rgbHex(d?d.style.background:''));
    const hex=hsvHex(Number(e.target.value)||0,sa||.7,v||.85);
    setPlanColor(hex);palAdd(hex);return;
  }
  if(e.target.id==='peKind'){peKindRefresh();return;}
  /* 609차: 담당자 → 색 원. ⚠ 이 자리는 `change` 리스너다(select 는 change 가 확실히 온다).
     input 리스너는 8104행의 한 줄짜리 하나뿐이라 여기 두는 편이 맞다 — 옮기지 말 것. */
  if(e.target.id==='peOwners'||e.target.id==='tnAsg')peColorSync();
  if(e.target.closest&&e.target.closest('#dpEdit'))planAutosave();
});
document.addEventListener('change',e=>{
  if(e.target.closest('[data-act="pf.org"]')){ACT['pf.org']();return;}
  if(e.target.id==='tnRec'){
    /* 반복 종료 칸 — 팝업 폼은 행(#tnUntilRow), 셀 편집은 라벨을 감춘다(364차) */
    const r=$('#tnUntilRow');if(r)r.style.display=e.target.value?'':'none';
    const u=$('#tnUntil'),l=u&&u.closest('label');if(l)l.hidden=!e.target.value;
    return;}
  if(e.target.id==='tnKind'){kindOwnerSync('tnKind','tnAsg');tkKindRefresh();return;}   /* 구분에 따라 내용 칸 구성이 달라진다 */
  if(e.target.id==='peKind'){kindOwnerSync('peKind','peOwners');return;}   /* 팝업 편집기도 동일 규칙 */
  if(e.target.id==='peKind'){peKindRefresh();return;}
  const rl=e.target.closest('[data-act="acct.role"]');
  if(rl){ACT['acct.role'](rl);return;}
  const ren=e.target.closest('[data-act="org.ren"]');
  if(ren){
    const k=ren.dataset.kind;
    const list=k==='Team'?(S.org.teams||[]):k==='Site'?(S.org.sites||[]):(S.org.regions||[]);
    const it=list.find(x=>x.id===ren.dataset.id);
    if(it){it.name=(ren.value||'').trim();orgSave();if(S.view==='tasks')rTasks();}
    return;
  }
  const el=e.target.closest('[data-act="acct.set"]');
  if(!el)return;
  const id=el.dataset.id,f=el.dataset.f;
  /* 628차 위계: 권역 배정은 관리자·팀장, 팀·직급은 관리자만 — UI 를 뚫어도 규칙이 거부하지만
     여기서 먼저 끊어 혼란(값 바뀐 듯 보이다 원복)을 막는다 */
  if(f==='region'?!canAssignRegion():!isEditor()){toast('권한이 없습니다');rOrg();return;}
  const cur=(S.people||{})[id]||{};
  const base=roster().find(p=>p.id===id)||{};
  const rank=f==='rank'?rankOf(el.value):rankOf(cur.rank);
  const uses=rankUses(rank);
  /* 담당 현장을 함께 넘기지 않으면 다른 칸만 바꿔도 배정이 지워진다 */
  store.putPerson(id,{
    name:base.name||cur.name||'',
    email:base.email||cur.email||'',
    team:f==='team'?el.value:(cur.team||''),
    /* ⚠ 팀을 옮기면 이전 팀의 권역·현장은 남기지 않는다 — 다른 팀 항목이 붙어 있으면 목록이 어긋난다 */
    region:(f==='team')?'':(uses.region?(f==='region'?el.value:(cur.region||'')):''),
    rank,
    sites:(f==='team')?{}:(uses.sites?(cur.sites||{}):{})});
  if(f==='team')toast('팀을 옮겼습니다 · 권역과 담당 현장을 다시 지정해 주세요');
  if(!S.live){rOrg();rTasks();}
});
document.addEventListener('input',e=>{if(e.target.id==='nqQ')rNq();});

document.addEventListener('change',e=>{const el=e.target;if(!el||!el.dataset)return;
  /* 담당자를 바꾸면 앞의 색 점도 따라간다(389차) — select 는 클릭 처리에서 막히므로 change 에서 다룬다 */
  if(el.id==='tnAsg'){const dot=document.getElementById('tnAsgDot');
    if(dot){const c=el.value?colBg(ownColor(el.value)):'var(--lbl3)';dot.style.background=c;dot.classList.toggle('p-col-rainbow',false);dot.classList.toggle('p-col-fx',false);}}
  if(el.dataset.act==='df.moYear'){S.dfMoYear=el.value;if(DF.lastDash)dfDashMonthTable(DF.lastDash);}
  else if(el.dataset.act==='df.detailYear'){S.dfDetailYear=el.value;rDefect();}
  else if(el.dataset.act==='df.trendYear'){
    if(el.dataset.scope==='dash'){S.dfTrendYearDash=el.value;const d=DF.lastDash;if(!d)return;
      const rmY=S.dfRm.slice(0,4);dfTrendDraw('trend','dfTrend',el.value===rmY?d.wks:dfDashWksOfYear(d.wk,el.value));}
    else{S.dfTrendYearSite=el.value;const key=dfRm()+'/'+S.dfSid,k=DF.kpi[key];if(!k)return;
      const rmY=S.dfRm.slice(0,4);dfTrendDraw('strend','dfSiteTrend',el.value===rmY?DF.sw[key]:dfWksOfYear(k.weekly,el.value));}}});
document.addEventListener('input',e=>{if(e.target.id==='recQ')e.target.closest('.rl-q-wrap').classList.toggle('has',!!e.target.value);
  if(e.target.id==='rkQ'){rkState('modal').search=e.target.value;e.target.closest('.rl-q-wrap').classList.toggle('has',!!e.target.value);clearTimeout(window.__rkQT);window.__rkQT=setTimeout(()=>dfRiskModalBody(),250);return;}   /* 735차: 민원 모달 검색 — 머리는 그대로 두고 본문만 */
  if(e.target.id==='rkQs'){rkState('site').search=e.target.value;e.target.closest('.rl-q-wrap').classList.toggle('has',!!e.target.value);clearTimeout(window.__rkQT);window.__rkQT=setTimeout(()=>{rkRerender('site');const n=document.getElementById('rkQs');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length);}},250);return;}   /* 736차·757차: 현장 표 검색 — 표 카드만 다시 그리고 포커스 복원 */
  if(e.target.id==='recQ'){REC.q=e.target.value;
  const b=$('#mbody');if(!b)return;if(paintHTML(b,recBodyHTML()))ovsRefresh();recHeadSync(REC.view.length,REC.rows.length);}});
/* 처리계획 — 입력을 멈추면 저장한다(하자처리 현황과 같은 노드를 쓰므로 그쪽 화면에도 바로 반영된다) */
function dfPlanFit(el){if(!el||el.offsetParent===null)return;el.style.height='auto';el.style.height=el.scrollHeight+'px';}
function dfPlanFitAll(){$$('#view-defect .plan-ta').forEach(dfPlanFit);}
let DF_PT=null;
document.addEventListener('input',e=>{
  const el=e.target;if(!el||el.dataset.act!=='df.plan')return;
  dfPlanFit(el);   /* 쓰는 만큼 칸이 자란다 — 원본 autoResize 와 동일 */
  clearTimeout(DF_PT);
  DF_PT=setTimeout(()=>dfPlanSet(el.dataset.sid,el.dataset.f,S.dfRm,el.dataset.t,el.value),700);
});
/* 현장 표 — 하자 관리 화면 표시 여부 토글. 마이너 현장은 목록에서 빼 둘 수 있다.
   ⚠ 업무·현장 자체는 그대로 남는다. 감추는 것은 하자 관리 화면의 현장 목록뿐이다.
   ⚠ 저장은 org 가 아니라 cfg — 게시본이 갱신돼도 살아남아야 한다(dfHidden 주석 참조) */
document.addEventListener('change',e=>{
  const el=e.target.closest('[data-act="org.siteShow"]');
  if(!el)return;
  if(!isEditor()){denyEdit();rOrg();return;}
  const id=el.dataset.id;
  const st=(S.org.sites||[]).find(x=>x.id===id)||{};
  const hide=!el.checked;
  const m={...dfHidden()};
  if(hide)m[id]=true;else delete m[id];   /* 기본값(표시)은 키를 두지 않는다 */
  store.putCfg('dfHide',m);
  S.cfg={...S.cfg,dfHide:m};
  if(S.dfSid===id&&hide)S.dfSid='';       /* 열어 둔 현장을 감추면 선택도 푼다 */
  rDefectNav();
  toast('"'+(st.name||'이름 없음')+'" 을 하자 관리에서 '+(hide?'숨깁니다':'표시합니다'));
});
/* 현장 표 — 공가세대/공가상가 토글(615차). ⚠ 저장은 org 가 아니라 siteConfig 리프 —
   org 규칙이 이 필드를 허용하지 않고(cleanOrg 도 걷어냄), siteConfig 가 실시간 진실 채널이다
   (소비자 dfSubSiteCfg 가 전원에게 즉시 입힌다 · 게시본 _dash.sites 에는 [등록] 때 실린다).
   신규 현장 위저드(confirmNewSite)와 같은 dfSiteCfgWrite 를 쓴다. */
document.addEventListener('change',e=>{
  const el=e.target.closest('[data-act="org.siteVac"],[data-act="org.siteShop"],[data-act="org.siteSuit"]');
  if(!el)return;
  if(!isEditor()){denyEdit();rOrg();return;}
  const st=(S.org.sites||[]).find(x=>x.id===el.dataset.id);if(!st)return;
  const f=el.dataset.act==='org.siteVac'?'showVacant':el.dataset.act==='org.siteSuit'?'lawsuit':'hasCommercial';
  st[f]=el.checked;
  /* 795차: 바뀐 필드만 쓴다 — 전체 set 은 화면에 아직 안 입혀진 다른 토글 값을 기본값으로 덮어썼다 */
  if(S.live&&FB.db)FB.db.ref('siteConfig/'+st.id).update({[f]:el.checked,updatedAt:Date.now()}).catch(e=>{console.warn('[siteConfig] 쓰기 실패',st.id,e);fbErr(e);});
  if(DF._cfgLast)DF._cfgLast[st.id]={...(DF._cfgLast[st.id]||{}),hasCommercial:!!st.hasCommercial,showVacant:st.showVacant!==false,lawsuit:!!st.lawsuit};   /* org 스냅샷 재적용 보관본도 맞춰 둔다 — 에코 전 재렌더 대비 */
  if(S.view==='defect')rDefect();   /* 열어 둔 하자 화면의 탭 구성 즉시 갱신(에코는 값이 같아 다시 안 그린다) */
  toast('"'+(st.name||'이름 없음')+'" · '+(f==='lawsuit'?('소송현장 표시를 '+(el.checked?'켰습니다':'껐습니다'))   /* 796차: 소송 토글이 「공가상가 탭」 문구로 나왔다 */
    :((f==='showVacant'?'공가세대':'공가상가')+' 탭을 '+(el.checked?'표시':'숨김')+'으로 바꿨습니다')));
});
/* 조직 표 입력을 떠나면 미뤄 둔 조직 그리기를 몰아 처리(615차 — orgHold 짝) */
document.addEventListener('focusout',e=>{
  const el=e.target;if(!el||!el.closest||!el.closest('#view-org'))return;
  setTimeout(()=>{if(orgHold()||tkHold())return;
    if(PEND.org){PEND.org=false;rOrg();}
    if(PEND.tasks){PEND.tasks=false;if(!S.tkNew&&!S.tkEdit)rTasks();}
  },60);
});
/* 현장 표 인라인 저장 — 하자처리 현황과 같은 즉시 반영 */
/* 712차: 민원 현황 표 필터 줄 — 입력 300ms 뒤 다시 그리고 포커스를 되돌린다 */
document.addEventListener('input',e=>{
  const el=e.target.closest&&e.target.closest('input.rk-q[data-act="df.riskQ"]');if(!el)return;
  const ns=el.dataset.ns||'site',st=rkState(ns);st.q[el.dataset.q]=el.value;
  clearTimeout(window.__rkqT);window.__rkqT=setTimeout(()=>{const q=el.dataset.q;rkRerender(ns);const n=document.querySelector('input.rk-q[data-ns="'+ns+'"][data-q="'+q+'"]');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length);}},300);
});
/* 696차: 현장 표 편집은 초안(ORG_DRAFT)에 모았다가 [저장] 한 번에 orgSave — 전엔 칸마다 바로 저장돼 오타가 팀 전원에게 실시간으로 나갔고,
   권역을 바꾸면 normOrg 정렬로 행이 즉시 튀었다. 하자현황·공가 토글은 cfg/siteConfig 라 그대로 즉시 */
let ORG_DRAFT={};
function orgDraftN(){return Object.keys(ORG_DRAFT).reduce((n,id)=>n+Object.keys(ORG_DRAFT[id]).length,0);}
function orgDraftBar(){
  const bar=$('#orgSaveBar');if(!bar)return;
  const n=orgDraftN();bar.hidden=!n;const c=$('#orgSaveN');if(c)c.textContent=n;
  $$('#siteRoot .mgtbl tr[data-sid]').forEach(tr=>tr.classList.toggle('dirty',!!ORG_DRAFT[tr.dataset.sid]));
}
function orgDraftApply(){
  const ids=Object.keys(ORG_DRAFT);if(!ids.length)return false;
  ids.forEach(id=>{const st=(S.org.sites||[]).find(x=>x.id===id);if(!st)return;Object.assign(st,ORG_DRAFT[id]);});
  ORG_DRAFT={};orgSave();return true;
}
document.addEventListener('change',e=>{
  const el=e.target.closest('[data-act="org.siteUpd"]');
  if(!el)return;
  if(!isEditor()){denyEdit();rOrg();return;}
  const st=(S.org.sites||[]).find(x=>x.id===el.dataset.id);if(!st)return;
  const f=el.dataset.f,v=el.value;
  if(f==='completionDate'&&v&&v.slice(0,4)<'1900')return;   /* 615차: 연도 4자리 미완성(0002-…) 무시 */
  let nv;
  if(f==='units'||f==='buildings'||f==='commercialUnits'){
    nv=Number(String(v).replace(/[^0-9]/g,''))||0;   /* #,##0 입력 허용 */
    el.value=nv.toLocaleString();
  }else nv=String(v||'');
  const d=ORG_DRAFT[st.id]||(ORG_DRAFT[st.id]={});
  const same=(typeof nv==='number')?nv===(Number(st[f])||0):nv===String(st[f]||'');
  if(same)delete d[f];else d[f]=nv;
  if(!Object.keys(d).length)delete ORG_DRAFT[st.id];
  orgDraftBar();
});
/* 현장 위치 지도 — 우클릭·빈 바다로 한 단계 되돌린다 */
document.addEventListener('contextmenu',e=>{
  if(!kmSvgOf(e.target))return;
  e.preventDefault();clearTimeout(_kmCT);   /* 602차: 미뤄둔 좌클릭(220ms)이 뒤늦게 확대시키던 문제 */
  kmBack();
});
/* 위젯 설정 팝업 조작 */
document.addEventListener('input',e=>{
  if(e.target.id==='wgA'){const c=widCfgLoad();c.a=100-Number(e.target.value);widCfgSave(c);widApply();return;}   /* 슬라이더는 '투명도' — 값이 클수록 투명하다 */
  if(e.target.id==='wgT'){const c=widCfgLoad();c.tint=Number(e.target.value);widCfgSave(c);widApply();return;}    /* 유리 톤 — 100%가 기존 색, 낮추면 진하고 올리면 연하다 */
  if(e.target.id==='wgFz'){const c=widCfgLoad();c.fz=Number(e.target.value)/100;widCfgSave(c);widApply();return;}
  if(e.target.id==='wgNoti'){const c=widCfgLoad();c.noti=e.target.checked;widCfgSave(c);evePopHide();toast(c.noti?'오후 점검 알림을 켰습니다':'오후 점검 알림을 껐습니다');return;}
  if(e.target.id==='wgDbl'){const c=widCfgLoad();c.dbl=e.target.checked;widCfgSave(c);widApplyDbl();toast(c.dbl?'두 번 눌러 선택을 켰습니다':'두 번 눌러 선택을 껐습니다');return;}
});
document.addEventListener('change',e=>{
});
document.addEventListener('click',e=>{

  const fb=e.target.closest('#wgFont [data-fontd]');
  if(fb){
    const c=widCfgLoad(),ids=WID_FONTS.map(f=>f[0]);
    const cur=Math.max(0,ids.indexOf(widFontId(c.font)));
    c.font=ids[(cur+Number(fb.dataset.fontd)+ids.length)%ids.length];
    widCfgSave(c);widApply();
  }
});
document.addEventListener('input',e=>{
  if(e.target.id==='tkQ'){
    S.tkF={...S.tkF,q:e.target.value};e.target.closest('.dp-srch').classList.toggle('has',!!e.target.value.trim());
    clearTimeout(tkQT);tkQT=setTimeout(tkRefresh,160);   /* 전체 렌더는 포커스를 날린다 */
  }
});
/* 아래에 더 있다는 표시 — 스크롤이 남아 있으면 칸 아래쪽을 서서히 지운다(끝에 닿으면 없앤다).
   ⚠ 덧칠이 아니라 mask 라서 카드 배경색이 무엇이든 그대로 어울린다 */
const SB_SEL='#content,.dp-body,.tk-list,.nq-res,.pf-emg,.rd-body,[data-sb],[data-sbx],[data-sbh]';
function fadeOne(el){
  if(!el||!el.classList)return;
  /* 823차: 글 입력칸에는 페이드를 걸지 않는다 — 마스크가 **테두리까지** 흐려 칸이 깨져 보인다(견적 검토 붙여넣기 칸) */
  if(el.tagName==='TEXTAREA'||el.tagName==='INPUT'){el.classList.remove('sb-fade-t','sb-fade-b','sb-fade-l','sb-fade-r');return;}
  /* 797차: 머리 붙박이 표 칸(data-sbh — 조직 관리 계정·미배정·현장 표). 위 페이드는 **머리 줄 아래에서** 시작한다
     (--sbh = thead 높이, 마스크가 머리 줄 구간은 그대로 둔다). 가로로도 넘치는 칸(data-sbx)은 여기서 함께 재고
     CSS 가 세로·가로 두 판을 교차한다 — sb-fade-* 를 쓰면 한쪽 마스크가 다른 쪽을 덮어쓴다 */
  if(el.hasAttribute('data-sbh')){
    const th=el.querySelector('thead'),h=(th?th.offsetHeight:0)+'px';
    if(el.style.getPropertyValue('--sbh')!==h)el.style.setProperty('--sbh',h);
    const ov=el.scrollHeight>el.clientHeight+2,mv=el.scrollHeight-el.clientHeight-el.scrollTop;
    const sx=el.getAttribute('data-sbx'),oh=sx!==null&&el.scrollWidth>el.clientWidth+2,mh=el.scrollWidth-el.clientWidth-el.scrollLeft;
    el.classList.toggle('sbh-t',ov&&el.scrollTop>4);
    el.classList.toggle('sbh-b',ov&&mv>4);
    el.classList.toggle('sbh-l',oh&&sx!=='r'&&el.scrollLeft>4);
    el.classList.toggle('sbh-r',oh&&mh>4);
    return;
  }
  /* 689차: 가로 스크롤 요소(data-sbx) — 탭 줄·상세표. 스크롤바는 숨기고 잘린 쪽만 페이드로 알린다.
     data-sbx="r" 는 오른쪽만 — 붙박이 첫 열(sticky) 이 있는 표에서 왼쪽 페이드가 그 열을 흐리게 만든다 */
  if(el.hasAttribute('data-sbx')){
    const over=el.scrollWidth>el.clientWidth+2,more=el.scrollWidth-el.clientWidth-el.scrollLeft;
    el.classList.toggle('sb-fade-l',over&&el.scrollLeft>4&&el.getAttribute('data-sbx')!=='r');
    el.classList.toggle('sb-fade-r',over&&more>4);
    return;
  }
  /* 미처리 보기(목록 rec-wrap·피벗 pv-scroll)에는 페이드를 걸지 않는다 — 사용자 지시(218차) */
  /* 업무 목록(.tk-list)도 제외 — 줄 높이가 40px 라 26px 페이드가 마지막 줄을 반쯤 지운다(250차) */
  if(el.classList.contains('rec-wrap')||el.classList.contains('pv-scroll')||el.classList.contains('tk-list')){
    el.classList.remove('sb-fade-t','sb-fade-b');return;
  }
  const over=el.scrollHeight>el.clientHeight+2;
  const more=el.scrollHeight-el.clientHeight-el.scrollTop;
  el.classList.toggle('sb-fade-t',over&&el.scrollTop>4);      /* 위로 더 있음 */
  el.classList.toggle('sb-fade-b',over&&more>4);              /* 아래로 더 있음 */
}
function fadeScan(){$$(SB_SEL).forEach(fadeOne);}
/* ⚠ 지연을 두면 화면을 다시 그리는 사이 페이드가 잠깐 풀려 깜빡인다 — 다음 프레임에 바로 다시 잰다 */
let fadeR=0;
function fadeSoon(){if(fadeR)return;fadeR=requestAnimationFrame(()=>{fadeR=0;fadeScan();});}
/* 화면을 다시 그릴 때마다 다시 재야 한다 — 렌더 함수마다 부르지 않고 한곳에서 지켜본다 */
if(window.MutationObserver){
  const mo=new MutationObserver(fadeSoon);
  const start=()=>{const app=$('#app');if(app)mo.observe(app,{childList:true,subtree:true});fadeScan();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
  else start();
}
window.addEventListener('resize',fadeSoon);
window.addEventListener('resize',()=>holdFit());   /* 보류함 높이는 달력 줄에 맞춘다 */
/* 스크롤바는 그리지 않는다(규약) — 스크롤할 때마다 위·아래 페이드만 다시 잰다 */
document.addEventListener('scroll',e=>{
  const el=e.target;if(!el||!el.classList)return;
  fadeOne(el);
},true);
/* 가로로만 넘친 표(피벗 등)는 휠만으로 넘겨진다 — 세로 여지가 있으면 기본 동작(세로),
   Shift+휠·트랙패드 가로 입력도 기본 동작 그대로. 스크롤바 표시는 환경에 따라 다르므로 이 경로가 보험이다. */
document.addEventListener('wheel',e=>{
  const el=e.target.closest&&e.target.closest('.pv-scroll,.rec-wrap,.rkm-wrap');   /* 757차: 현황도도 휠로 가로 이동 */
  if(!el||e.shiftKey||e.deltaX)return;
  const canX=el.scrollWidth>el.clientWidth+1,canY=el.scrollHeight>el.clientHeight+1;
  if(canX&&!canY){el.scrollLeft+=e.deltaY;e.preventDefault();}
},{passive:false});
let tkQT=null;
/* 업무 목록과 내 업무는 같은 필터(S.tkF)를 쓴다 — 보고 있는 화면을 다시 그린다 */
function rTkViews(){rTasks();}
/* ⚠ 화면을 통째로 다시 그리면 검색 칸이 새 노드가 되어 한글 조합이 끊긴다.
   그리기 직전에 기존 필터 카드를 떼어 뒀다가, 새로 그려진 자리에 그 노드를 도로 끼운다. */
function tkRefresh(){
  const old=$('#tkFcard');
  const focus=old&&old.contains(document.activeElement);
  if(old)old.remove();
  rTkViews();
  const fresh=$('#tkFcard');
  if(old&&fresh){
    fresh.replaceWith(old);
    if(focus){const q=old.querySelector('#tkQ');if(q){const n=q.value.length;q.focus();try{q.setSelectionRange(n,n);}catch(_){}}}
  }
}
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&(e.target.id==='fbEmail'||e.target.id==='fbPw')){e.preventDefault();fbDoLogin();return;}
  if(e.key==='Enter'&&e.target.id==='peTitle'){e.preventDefault();savePlanInline();return;}
  /* Ctrl/⌘+K 로 찾기 */
  if(e.key==='Escape'){
    /* 겹쳐 있는 것부터 하나씩 닫는다 — 한 번에 다 닫히면 되돌리기 번거롭다 */
    if($('#colPop')){closeColPop();return;}
    if(document.querySelector('.msel.open')){mselClose();return;}
    if($('#ymPop')){closeYMPop();return;}
    const wg=$('#wgSet');
    if(wg&&wg.classList.contains('on')){wg.classList.remove('on');wg.setAttribute('aria-hidden','true');return;}
    if($('#calFilt')&&$('#calFilt').classList.contains('on')){calFiltClose();return;}
    {const tp=$('#teamPop');if(tp&&tp.classList.contains('on')){tp.classList.remove('on');return;}}
    const sd=$('#widSide');
    if(sd&&sd.classList.contains('on')){sd.classList.remove('on');S.widSide='';return;}
    if(WIDGET&&S.widPop){S.widPop=false;if(S.planEdit)closePlanEdit();rWidget();return;}
  }
  /* 위젯에서 ←→ 로 달 넘기기 — 입력 중일 때는 방해하지 않는다 */
  if(WIDGET&&(e.key==='ArrowLeft'||e.key==='ArrowRight')&&!/INPUT|TEXTAREA|SELECT/.test((e.target.tagName||''))){
    ACT[e.key==='ArrowLeft'?'cal.prev':'cal.next']();return;
  }
  if((e.ctrlKey||e.metaKey)&&(e.key==='k'||e.key==='K')){e.preventDefault();nqOpen(true);rNq();return;}
  if(e.key==='Escape'&&$('#nqPanel')&&$('#nqPanel').classList.contains('on')&&!$('#mo').classList.contains('open')){nqOpen(false);return;}
  if(e.key==='Escape'){
    if($('#mo').classList.contains('open')){closeModal();return;}
    if(S.tkNew||S.tkEdit){tkFormClose();return;}
    if($('#colPop')){closeColPop();return;}
    if(S.planEdit){closePlanEdit();return;}
    mobClose();
  }
  if(e.key==='Enter'&&$('#mo').classList.contains('open')&&e.target.tagName==='INPUT'){
    e.preventDefault();
    if(MODAL_CB&&MODAL_CB.ok)MODAL_CB.ok();
  }
});

/* 사이드바 폭 전환·창 크기 변경 후 FullCalendar 재계산
   (transition이 끝나야 실제 폭이 확정되므로 transitionend에서 호출) */
/* 좁은 화면은 셀이 60~70px 밖에 안 돼서 내부 스크롤이 사실상 안 눌린다.
   그래서 모바일에서만 '+N 더보기'(FullCalendar 표준 팝오버)로 바꾼다.
   데스크톱은 기존대로 셀 안에서 스크롤해 전부 본다. */
function isNarrow(){return window.matchMedia('(max-width:960px)').matches;}
/* false(무제한)면 칸 밖으로 넘쳐 잘린다 — true 는 칸 높이에 맞춰 넣고 나머지를 '+N건' 으로 알린다 */
/* 한 칸에 담을 막대 수 — 칸을 실제로 재서 정한다.
   ⚠ dayMaxEvents:true(자동)는 더보기 줄 자리를 한 번 더 빼는지, 실측상 한 개를 덜 담았다
      (칸 178px · 막대 피치 29px · 더보기 20px → 5개+더보기=165px 가 들어가는데 4개만 썼다).
      그래서 자동에 맡기지 않고 숫자로 넘긴다. 잴 수 없으면(첫 렌더 전) 예전처럼 자동으로 둔다 */
function calFitRows(){
  /* 줄 높이가 내용에 따라 다를 수 있어 가장 낮은 칸 기준으로 잰다(520차) */
  const frames=document.querySelectorAll('#fcal .fc-dayGridMonth-view .fc-daygrid-day-frame');
  if(!frames.length)return null;
  let frame=frames[0];
  frames.forEach(f=>{if(f.clientHeight&&f.clientHeight<frame.clientHeight)frame=f;});
  const num=frame.querySelector('.fc-daygrid-day-number');
  const ev=document.querySelector('#fcal .fc-daygrid-event-harness');
  if(!num||!ev)return null;
  const avail=frame.clientHeight-num.offsetHeight-2;          /* -2 는 day-events 의 padding-bottom */
  const pitch=ev.offsetHeight;                                /* harness 에 여백이 포함돼 있다 */
  /* ⚠ 더보기 줄 높이는 **링크가 실제로 든** day-bottom 에서 잰다(520차).
     문서상 첫 day-bottom 은 빈 칸의 것(높이 2px)일 수 있어 — 그걸 믿고 4개를 넣었다가
     '외 N건'이 칸 아래로 11px 탈출했다(실측: 빈 것 2px vs 실제 18px) */
  const moreLink=document.querySelector('#fcal .fc-daygrid-day-bottom .fc-daygrid-more-link');
  const link=moreLink?moreLink.closest('.fc-daygrid-day-bottom'):null;
  const lh=(link&&link.offsetHeight)||18;
  if(!(pitch>6)||avail<pitch)return null;
  const n=Math.floor((avail-lh)/pitch);
  return n<1?null:n;   /* 더보기 줄까지 넣을 자리도 없을 만큼 낮으면 자동에 맡긴다 */
}
function maxEvOf(){
  if(isNarrow()&&!WIDGET)return (typeof mcalIsLand==='function'&&mcalIsLand())?1:(document.body.classList.contains('mcal-full')?3:2);   /* 704차: 폰 큰 달력 3줄 · 가로 1줄 */
  const n=calFitRows();
  return n===null?true:n;
}
/* 첫 렌더·달 이동 뒤에 다시 재서 맞춘다 — 값이 그대로면 건드리지 않는다(무한 재렌더 방지) */
let _maxEv=null;
function calFitApply(){
  if(!CAL||(isNarrow()&&!WIDGET))return;   /* 776차: 위젯은 폭이 좁아도 칸 높이 기준으로 맞춘다 */
  let n=calFitRows();
  /* 776차: 위젯은 칸 높이에 따라 막대 크기를 단계별로 줄인다 — ① 보통 ② 촘촘(막대 14px·숫자 여백 축소, .wid-tight) ③ 그래도 안 들어가면 「외 N건」 줄을 없애고 1줄만(.wid-nomore).
     최소 크기에서도 막대·더보기가 날짜 칸을 넘지 않게 */
  if(WIDGET){
    const b=document.body;
    if(n===null&&!b.classList.contains('wid-tight')){b.classList.add('wid-tight');n=calFitRows();}
    else if(n!==null&&n>=2&&b.classList.contains('wid-tight')){b.classList.remove('wid-tight');const n2=calFitRows();if(n2===null)b.classList.add('wid-tight');else n=n2;}
    if(n===null){b.classList.add('wid-nomore');n=1;}else b.classList.remove('wid-nomore');
  }
  if(n===null||n===_maxEv)return;
  _maxEv=n;CAL.setOption('dayMaxEvents',n);
}

function bindCalResize(){
  const sb=$('#sidebar');
  if(sb){
    /* ⚠ 접히는 동안 매 프레임 CAL.updateSize() 를 부르지 않는다(391차 실측).
       달력 전체 레이아웃을 다시 재는 무거운 일이라 전환 내내 프레임이 밀렸다
       (44프레임 · 최악 158ms → 63프레임 · 최악 103ms). 폭은 CSS 가 이미 따라가므로
       전환 중에는 그대로 두고, **끝난 뒤 한 번만** 정확히 맞춘다.
       ⚠ transitionend 를 못 받는 경우(중간에 다시 누름 등)를 대비해 타이머로도 마무리한다 */
    let endT=null;
    /* 777차: 사이드바가 움직이는 동안 Chart.js 는 폭이 바뀔 때마다 다시 그려 프레임을 잡아먹었다(하자 화면 700ms 에 긴 프레임 7개·430ms) →
       움직이는 동안은 responsive 를 끄고 캔버스를 CSS 로만 늘렸다가(시각적으로는 같이 늘어난다) 끝나면 한 번만 resize */
    /* responsive 옵션은 생성 뒤엔 안 먹는다(216차 실패) → 인스턴스의 resize 를 잠시 빈 함수로 덮어 ResizeObserver 콜백을 무력화하고, 캔버스는 CSS 폭 100% 로 같이 늘어나게 둔다 */
    const chartsFreeze=on=>{Object.values((typeof DF!=='undefined'&&DF.ch)||{}).forEach(ch=>{try{if(!ch||!ch.canvas)return;
      if(on){if(!ch.__frz){ch.__frz=true;ch.resize=()=>{};}ch.canvas.style.width='100%';}
      else if(ch.__frz){delete ch.resize;ch.__frz=false;ch.canvas.style.width='';ch.resize();}}catch(e){}});};
    const settle=()=>{
      clearTimeout(endT);endT=null;midT.forEach(clearTimeout);midT=[];
      document.body.classList.remove('sb-anim');
      chartsFreeze(false);
      if(CAL)CAL.updateSize();
      calFitApply();               /* 접힌 뒤 칸 높이에 맞춘 줄 수 */
    };
    /* ⚠ 전환 내내 손을 놓으면 여러 날에 걸친 막대(절대 배치)가 폭을 못 따라와 끝에서 뚝 움직인다.
       매 프레임은 너무 무거우므로 전환 중 두 번만 다시 맞춘다(391차) */
    let midT=[];
    const start=()=>{
      document.body.classList.add('sb-anim');   /* 전환 동안 달력을 배치 계산에서 떼어 낸다(391차) */
      midT.forEach(clearTimeout);chartsFreeze(true);
      midT=[220].map(ms=>setTimeout(()=>{if(CAL)CAL.updateSize();},ms));   /* 777차: 중간 갱신 100ms 제거(긴 프레임 3개) — 220 하나만 */
      clearTimeout(endT);endT=setTimeout(settle,460);};   /* --sbtr .30s + 여유 */
    sb.addEventListener('transitionstart',e=>{
      if(e.propertyName==='width'||e.propertyName==='min-width')start();
    });
    sb.addEventListener('transitionend',e=>{
      if(e.propertyName==='width'||e.propertyName==='min-width')settle();
    });
    /* transitionstart 를 못 받는 경우 대비 — 토글 버튼에서도 건다 */
    document.addEventListener('click',e=>{if(e.target.closest('[data-act="nav.toggle"]'))start();});
  }
  /* 705차: 태블릿 가로(901~1280px) 는 사이드바를 아이콘 레일(.mini)로 자동 접는다 — 달력 + 업무 패널 3단이 나온다. 그 밖에선 펼친다.
     사용자가 한 번이라도 직접 토글했으면(S.sbUser) 자동 조정 안 함 */
  const sbAuto=()=>{const sb=$('#sidebar');if(!sb||S.sbUser||WIDGET)return;const w=innerWidth;const want=w>900&&w<=1280;if(sb.classList.contains('mini')!==want){sb.classList.toggle('mini',want);}};
  sbAuto();
  let rt=null;
  const redraw=()=>{clearTimeout(rt);rt=setTimeout(()=>{
    sbAuto();
    if(!CAL)return;
    const nar=isNarrow();
    if(nar!==MOBILE_CAL){MOBILE_CAL=nar;_maxEv=null;CAL.setOption('dayMaxEvents',maxEvOf());}
    if(S.view==='calendar'&&!S.mcalDrag){if(isMob()&&!WIDGET)mcalSet(S.mcal||'full');else document.body.classList.remove('mcal-full','mcal-mini');}   /* 704차: 회전·창 크기 · 733차: 드래그 중엔 손대지 않는다 */
    CAL.updateSize();
    calFitApply();               /* 창 크기가 바뀌면 칸 높이도 바뀐다 — 다시 재서 맞춘다 */
  },120);};
  window.addEventListener('resize',redraw);
  /* iOS 는 회전·주소창 접힘 때 resize 가 늦거나 빠져서 칸 폭이 어긋난 채 남는다 */
  window.addEventListener('orientationchange',()=>setTimeout(redraw,220));
  if(window.visualViewport)window.visualViewport.addEventListener('resize',redraw);
  /* 달력 카드 자체의 크기 변화(사이드바·패널 접힘 등)도 직접 관찰 */
  if(window.ResizeObserver){
    const card=$('.cal-card');
    if(card)new ResizeObserver(redraw).observe(card);
  }
}

/* ═══════════ 위젯 모드 (?w=1) — 데스크톱 PWA 창용 컴팩트 화면 ═══════════ */
/* ── 딥링크 ?df=<현장id> — 위젯의 찾기에서 하자 현황을 브라우저로 넘길 때 쓴다.
   ⚠ 현장 목록이 온 뒤라야 열 수 있다(게시본 구독이 S.org 를 채운다) — 한 번만 처리하고 버린다 */
const DF_LINK=(location.search.match(/[?&]df=([\w-]{1,40})/)||[])[1]||'';
let _dfLinkDone=false;
function dfLinkOpen(){
  if(_dfLinkDone||!DF_LINK||WIDGET)return;
  if(DF_LINK==='dash'){_dfLinkDone=true;S.dfSid='';go('defect');   /* 615차: 위젯 새 게시월 말풍선 → 대시보드 */
    try{history.replaceState(null,'',location.pathname+location.search.replace(/([?&])df=[\w-]+&?/,'$1').replace(/[?&]$/,''));}catch(e){}
    return;}
  const st=(S.org.sites||[]).find(x=>x.id===DF_LINK);
  if(!st)return;                       /* 아직 목록이 안 왔다 — 다음 갱신 때 다시 본다 */
  _dfLinkDone=true;
  S.dfSid=DF_LINK;S.dfTab='sum';go('defect');
  /* 주소창을 정리한다 — 새로고침해도 같은 현장으로 튀지 않게 */
  try{history.replaceState(null,'',location.pathname+location.search.replace(/([?&])df=[\w-]+&?/,'$1').replace(/[?&]$/,''));}catch(e){}
}
const WIDGET=/[?&]w=1\b/.test(location.search);
const GLASS=/[?&]glass=1\b/.test(location.search);   /* 위젯 유리(반투명) 모드 — 배경을 비운다 */
/* 위젯 설정 — 진하기·글자 크기·오늘 목록. 위젯 창(PC)별 로컬 저장 */
const WID_KEY='calapp.wid';
/* 위젯 글꼴 — 윈도우에 늘 있는 것만. 돋움은 작은 크기 비트맵이 있어 더 또렷할 수 있다.
   609차: 굴림을 뺐다(사용자 지시). '맑은 고딕' 은 '윈도우 기본'(win)으로 이름과 스택을 바로잡았다 —
   ⚠ **맑은 고딕의 라틴·숫자 글자는 Segoe UI 계열이다.** 그래서 'Malgun Gothic' 만 앞에 두면
   이름만 맑은 고딕일 뿐 실제로는 윈도우 기본 조합과 같다. 스택을 'Segoe UI' 먼저로 바꿔 뜻을 맞춘다. */
const WID_FONTS=[['app','기본'],['win','윈도우 기본'],['dotum','돋움']];
/* 옛 저장값 → 지금 값. ⚠ 지우지 말 것 — 위젯 설정은 PC 마다 localStorage 에 남아 있어
   137차('sys')·609차('malgun'·'gulim') 값을 쓰던 PC 가 그대로 있다. 없으면 조용히 '기본' 으로 떨어진다. */
const WID_FONT_OLD={sys:'win',malgun:'win',gulim:'win'};
function widFontId(v){const f=String(v||'');return WID_FONTS.some(x=>x[0]===f)?f:(WID_FONT_OLD[f]||'app');}
function widCfgLoad(){try{return JSON.parse(localStorage.getItem(WID_KEY))||{};}catch(e){return{};}}
function widCfgSave(c){try{localStorage.setItem(WID_KEY,JSON.stringify(c));}catch(e){}}
function widApply(){
  if(!WIDGET)return;
  const c=widCfgLoad();
  /* 진하기 — FullCalendar 셀에서 var() 상속이 갱신되지 않는 엔진 특이 동작이 있어
     변수 대신 리터럴 규칙을 스타일 태그로 주입한다 */
  const a=Number.isFinite(Number(c.a))?Number(c.a)/100:.85;   /* 기본 85% */
  /* 유리 톤 — 192차: 라이트 모드는 뺐다(유리 위 밝은 칸은 벽지에 따라 대비가 무너져 다듬을 여지가 좁다).
     대신 어두운 기준색의 농도를 한 축으로 조절한다. 저장돼 있던 tone 값은 아무도 읽지 않는다(읽는 곳 제거 — 187차 방식) */
  const tint=Math.min(1.6,Math.max(.5,(Number(c.tint)||100)/100));
  const sc=rgb=>rgb.split(',').map(x=>Math.min(255,Math.round(Number(x)*tint))).join(',');
  /* 글꼴 — 투명 창에서는 가변 폰트가 뭉개져 보인다. 윈도우 글꼴은 작은 크기용 힌팅이 있어 더 또렷할 수 있다.
     어느 쪽이 나은지는 모니터마다 달라 고르게 둔다 */
  const FONTS=WID_FONTS.map(f=>f[0]);
  const font=widFontId(c.font);   /* 옛 값('sys'·'malgun'·'gulim')은 '윈도우 기본'으로 흡수 */
  FONTS.forEach(f=>document.body.classList.toggle('wf-'+f,f===font));
  document.body.classList.toggle('wsysfont',font!=='app');
  let dyn=document.getElementById('wgDyn');
  if(!dyn){dyn=document.createElement('style');dyn.id='wgDyn';document.head.appendChild(dyn);}
  const f=n=>Math.min(1,Math.max(0,n)).toFixed(3);
  const B=sc('24,28,38');        /* 칸 */
  const W=sc('57,52,61');        /* 주말 — 붉은 끼를 아주 살짝만 */
  const H=sc('13,16,24');        /* 요일 머리 */
  const C=sc('13,17,26');        /* 카드 */
  const N=sc('16,20,30');        /* 버튼 배경 */
  dyn.textContent=GLASS?[
    'body.wid.glass #fcal td.fc-daygrid-day{background:rgba('+B+','+f(a)+')!important;}',
    /* 공휴일도 주말과 같은 칸 색으로 — 쉬는 날이라는 뜻이 같다 */
    'body.wid.glass #fcal td.fc-daygrid-day.fc-day-sat,body.wid.glass #fcal td.fc-daygrid-day.fc-day-sun,body.wid.glass #fcal td.fc-daygrid-day.hol{background:rgba('+W+','+f(a*.92)+')!important;}',
    'body.wid.glass #fcal td.fc-daygrid-day.fc-day-other{background:rgba('+B+','+f(a*.22)+')!important;}',
    'body.wid.glass #fcal .fc-col-header-cell{background:rgba('+H+','+f(a+.12)+')!important;}',
    'body.wid.glass .plan{background:rgba('+C+','+f(a+.05)+');}',
    /* 668차: 643차에 년월·화살표가 .cal-move 알약 하나로 묶였다 —
       그런데 여기서 .cal-title 에 여전히 배경을 칠해 알약 **안에 상자가 하나 더** 생겼다(년월만 더 진하게).
       이제 면은 알약(.cal-move)이 지고 제목은 투명이다. */
    'body.wid.glass .cal-head .seg,body.wid.glass .cal-head .cal-nav,body.wid.glass .cal-move{background:rgba('+N+','+f(a*.9)+');}',
    'body.wid.glass .cal-title{background:transparent;}'
  ].join('\n'):'';
  /* 글자 크기 — 85~140% 사이에서 자유롭게. 여백·막대 높이도 이 값에 함께 묶여 있다 */
  const fz=Math.min(1.4,Math.max(.85,Number(c.fz)||1));
  document.body.style.setProperty('--wfz',String(fz));
  const rng=$('#wgA');if(rng)rng.value=Math.round(100-a*100);
  const av=$('#wgAV');if(av)av.textContent=Math.round(100-a*100)+'%';
  const fr=$('#wgFz');if(fr)fr.value=Math.round(fz*100);
  const fl=$('#wgFzV');if(fl)fl.textContent=Math.round(fz*100)+'%';
  const nt=$('#wgNoti');if(nt)nt.checked=c.noti!==false;
  const tr=$('#wgT');if(tr)tr.value=Math.round(tint*100);
  const tl=$('#wgTV');if(tl)tl.textContent=Math.round(tint*100)+'%';
  const fv=$('#wgFontV');if(fv)fv.textContent=(WID_FONTS.find(f=>f[0]===font)||WID_FONTS[0])[1];
  const db=$('#wgDbl');if(db)db.checked=!!c.dbl;
  widApplyDbl();
}
/* 두 번 눌러 선택 — 위젯 창이 비활성 상태에서 클릭하면 첫 클릭은 활성화만 하고
   내부 이벤트(dateClick·eventClick 등)를 먹는다. 특정 사용자를 위한 선택 기능.
   ⚠ 윈도우에서 WM_ACTIVATE → WM_SETFOCUS → WM_MOUSEDOWN 순서가 보장되므로
   focus 시점에 플래그를 세우고 바로 다음 mousedown(capture)에서 잡는다.
   ⚠⚠ mousedown 의 preventDefault 는 뒤따르는 **click 을 막지 못한다** — FullCalendar 의
   dateClick·eventClick 은 click 에서 돈다. mousedown 을 먹은 뒤 mouseup·click·dblclick 까지
   한 벌로 함께 삼켜야 첫 클릭이 정말로 아무 일도 하지 않는다. */
let _dblActive=false,_dblJust=false,_dblEat=false,_dblTm=0,_dblEatTm=0;
const _DBL_EV=['mousedown','mouseup','click','dblclick'];
function widApplyDbl(){
  if(!WIDGET)return;
  const want=!!widCfgLoad().dbl;
  if(want===_dblActive)return;
  _dblActive=want;
  if(want){
    window.addEventListener('blur',_dblOnBlur);
    window.addEventListener('focus',_dblOnFocus);
    _DBL_EV.forEach(t=>document.addEventListener(t,_dblOnMouse,true));
    if(!document.hasFocus())document.body.classList.add('wid-await');   /* 켤 때 이미 비활성일 수 있다 */
  }else{
    window.removeEventListener('blur',_dblOnBlur);
    window.removeEventListener('focus',_dblOnFocus);
    _DBL_EV.forEach(t=>document.removeEventListener(t,_dblOnMouse,true));
    _dblClear();
  }
}
function _dblClear(){
  _dblJust=false;_dblEat=false;
  clearTimeout(_dblTm);clearTimeout(_dblEatTm);
  document.body.classList.remove('wid-await');
}
/* ⚠ 손 모양 커서는 **누르기 전**에 이미 떠 있다 — 예전에는 focus(=이미 클릭한 뒤)에 클래스를 붙여
   정작 필요한 순간에는 없었다. 창이 비활성인 동안 내내 붙여 두고, 활성화 클릭에서 뗀다 */
function _dblOnBlur(){
  _dblClear();
  document.body.classList.add('wid-await');   /* 비활성 상태 — 눌러도 활성화만 되니 손 모양을 숨긴다 */
}
function _dblOnFocus(){
  _dblJust=true;
  clearTimeout(_dblTm);
  _dblTm=setTimeout(()=>{_dblJust=false;document.body.classList.remove('wid-await');},500);   /* 키보드·Alt+Tab 등 비마우스 포커스 복귀 안전망 */
}
function _dblOnMouse(e){
  /* 설정 팝업(#wgSet)은 흡수하지 않는다 — 톱니를 눌러 연 뒤 바로 조작할 수 있어야 한다 */
  if(e.target&&e.target.closest&&e.target.closest('#wgSet'))return;
  if(e.type==='mousedown'){
    if(!_dblJust)return;
    _dblJust=false;clearTimeout(_dblTm);
    document.body.classList.remove('wid-await');
    _dblEat=true;                       /* 이 한 벌(mouseup·click·dblclick)까지 삼킨다 */
    clearTimeout(_dblEatTm);
    _dblEatTm=setTimeout(()=>{_dblEat=false;},700);   /* 끌기 등으로 click 이 안 오면 스스로 푼다 */
  }else{
    if(!_dblEat)return;
    if(e.type==='click')             {clearTimeout(_dblEatTm);_dblEatTm=setTimeout(()=>{_dblEat=false;},260);}
    if(e.type==='dblclick')          {_dblEat=false;clearTimeout(_dblEatTm);}
  }
  e.stopImmediatePropagation();e.preventDefault();
}
/* 위치·크기 조정 모드 — 켜면 창 전체가 드래그 영역이 되고, 끄면 그 자리에 고정된다.
   Electron 쪽 전환은 해시로 신호를 보낸다(preload 없이 쓰던 방식 그대로) */
function widMove(on){
  const old=$('#widMove');if(old)old.remove();
  if(on){
    const d=document.createElement('div');
    d.id='widMove';d.className='wid-move';
    d.innerHTML='<div class="t"><span>아무 데나 끌어 옮기고, 가장자리를 끌어 크기를 바꾸세요</span>'
      +'<button data-act="wid.moveOff">끝내기</button></div>';
    document.body.appendChild(d);
  }
  location.hash=on?'#move':'#moveoff';
  setTimeout(()=>{location.hash='';},50);
}
/* 위젯은 달력만 띄운다 — 날짜를 누르면 앱과 똑같은 업무 패널이 그 칸 옆에 뜬다.
   패널을 새로 만들지 않고 **일자 패널(.day-panel) 자체를 팝업 안으로 옮겨** 쓴다.
   그래야 카드·수정 아이콘·편집 폼·자동 저장이 앱과 완전히 같게 동작한다. */
function widMount(){
  const pop=$('#widPop'),panel=document.querySelector('.day-panel');
  if(!pop||!panel||pop.contains(panel))return;
  pop.innerHTML='<div class="wp-h"><span class="wp-d" id="wpDate"></span><span class="wp-w" id="wpDow"></span>'
    +'<button class="wp-x" data-act="wid.popClose" aria-label="닫기"><svg class="icn"><use href="#i-close"></use></svg></button></div>';
  pop.appendChild(panel);
}
function rWidget(){
  if(!WIDGET)return;
  widMount();
  const box=$('#widPop');if(!box)return;
  if(!S.widPop){box.classList.remove('on');return;}
  const ds=S.selDate,d=toDate(ds),ho=holOf(ds);
  const h=$('#wpDate');
  if(h)h.textContent=d.getFullYear()+'년 '+(d.getMonth()+1)+'월 '+d.getDate()+'일';
  const dw=$('#wpDow');
  if(dw)dw.textContent=[ho?ho.n:'',DOW[d.getDay()]+'요일',ds===todayStr()?'오늘':''].filter(Boolean).join(' · ');
  calTodaySync();
  box.classList.add('on');
  widPlace();
  /* 폼이 열리고 닫힐 때마다 팝업 높이가 달라진다 — 내용이 바뀌면 자리를 다시 잡는다 */
  if(!box.dataset.ro&&window.ResizeObserver){box.dataset.ro='1';new ResizeObserver(widPlace).observe(box);}
}
/* 위젯이 최신 파일 주소를 물어보는 훅 — GitHub API 를 쓰지 않으므로 사내망에서도 막히지 않는다.
   주소는 고정이고 버전은 위젯이 그 주소의 넘어가는 곳에서 스스로 읽는다 */
window.widInfo=function(){
  return {ver:'',url:WIDGET_URL};
};
/* 누른 칸 옆에 붙이되 창 밖으로 나가지 않게 한다 — 위젯은 창이 곧 화면이라 넘치면 잘려서 못 본다 */
function widPlace(){
  const box=$('#widPop');if(!box||!box.classList.contains('on'))return;
  const M=8;
  /* 664차: 업무를 쓰는 동안에는 자리를 고정한다 — 폼이 커질 때마다 팝업이 움직이면 글을 못 쓴다.
     ⚠ 화면 밖으로 나갈 때만 다시 잡는다. */
  if(S.planEdit&&box.dataset.px){
    const px=+box.dataset.px,py=+box.dataset.py,hh=box.offsetHeight,ww=box.offsetWidth;
    if(px>=M&&py>=M&&px+ww<=innerWidth-M&&py+hh<=innerHeight-M){
      box.style.left=px+'px';box.style.top=py+'px';return;
    }
  }
  box.style.maxHeight=Math.max(160,innerHeight-M*2)+'px';
  const td=document.querySelector('#fcal td[data-date="'+S.selDate+'"]');
  const r=td?td.getBoundingClientRect():{left:20,right:20,top:60};
  const w=box.offsetWidth,ht=box.offsetHeight;
  let x=r.right+M;if(x+w>innerWidth-M)x=r.left-w-M;
  x=Math.min(Math.max(M,x),Math.max(M,innerWidth-w-M));
  const y=Math.min(Math.max(M,r.top),Math.max(M,innerHeight-ht-M));
  box.style.left=Math.round(x)+'px';box.style.top=Math.round(y)+'px';
  box.dataset.px=Math.round(x);box.dataset.py=Math.round(y);
}

/* ═══════════ 798차: 업무 보조 — 사진대지 ═══════════
   ⚠ 전부 이 창 메모리에서만 처리한다 — 서버·localStorage·IndexedDB 어디에도 쓰지 않는다(사용자 지시).
     창을 닫거나 새로고침하면 사라지는 것이 정상이다. 앱 안에서 다른 화면을 다녀오는 동안은 남는다.
   사진은 넣을 때 긴 변 2000px JPEG 로 줄여 blob URL 로 들고 있다(원본 File 은 놓는다) — 폴더째 수백 장을 넣어도
   미리보기·인쇄가 버티게. 자르기는 줄인 사진(src)에서 잘라 새 blob(url)을 만들고, 다시 열면 src 위에 영역을 보여 준다. */
const PD={orient:'por',per:6,title:'사진대지',site:'',photos:[],sel:new Set(),anchor:'',seq:0,load:null,zoom:'w2',pz:0,page:1,split:false,tool:'none',color:'#E02424',lw:2,dash:0,undo:[],asel:null,clip:null};   /* 847차: asel=고른 표시 · clip=복사한 표시 */   /* 846차: 표시(원·네모·화살표) */   /* 807차: 폴더별 쪽 나누기. 808차: 용지 A4 고정·여백 10mm 고정·사진 번호 제거(인쇄 창에서 고르면 되는 것은 두지 않는다) */   /* 800차: 기본 세로 6장 · 현장명 공백. 802차: 용지·여백·자유 배율(pz) */
const PD_MAX=2000;
/* 800차: 파일·폴더 이름에서 위치·내용을 읽는다(예: 두정역/지하1층/트렌치 작업전.jpg → 위치 지하1층 · 내용 트렌치 작업 전).
   못 읽으면 빈칸으로 둔다 — 엉뚱하게 채우는 것보다 낫다. 단계 낱말은 **토막 끝**에서만 본다(「전경」·「전면」이 「전」으로 잡히지 않게) */
const PD_LOC=/(지하\s*\d+\s*층|[Bb]\s*\d+\s*층?|\d+\s*층|\d+\s*동\s*\d+\s*호|\d+\s*동|\d+\s*호|옥상|지하주차장|주차장|계단실|복도|엘리베이터|승강기|기계실|전기실|조경|필로티|외벽|옥외)/;
const PD_STEP=/(작업|시공|보수|공사|철거|교체|청소|도장|방수|절삭|정리)?\s*(완료|후|중간|중|전)(?=\s|$)/g;
function pdParseName(path,name){
  const full=String(path||name||'').replace(/\.[a-z0-9]+$/i,'');
  const segs=full.split(/[\\/]/),base=segs[segs.length-1];
  const sp=t=>' '+String(t).replace(/[_\-.]+/g,' ').replace(/\s+/g,' ').trim()+' ';
  const txt=sp(full),bt=sp(base);
  const lm=txt.match(PD_LOC);let loc=lm?lm[1].replace(/\s+/g,''):'';
  loc=loc.replace(/^(\d+동)(\d+호)$/,'$1 $2');   /* 806차: 101동 1203호 처럼 띄어 쓴다 */
  PD_STEP.lastIndex=0;let m,last=null;
  while((m=PD_STEP.exec(bt)))last=m;
  let desc='';
  if(last){
    const verb=last[1]||'작업',step=last[2]==='중간'?'중':last[2];
    let obj=bt.replace(last[0],' ')
      .replace(/\d{4}[-.]?\d{2}[-.]?\d{2}|\d{6,}|\(\d+\)|IMG|DSC|KakaoTalk|사진|photo/gi,' ')
      .replace(PD_LOC,' ');
    /* 파일 이름에 현장명이 붙어 있으면 내용에서 뺀다 — 현장명은 머리글에 따로 적힌다 */
    (S.org.sites||[]).map(x=>x.name).filter(Boolean).sort((a,b)=>b.length-a.length).forEach(nm=>{obj=obj.split(nm).join(' ');});
    obj=obj.replace(/\s+/g,' ').trim();
    desc=(obj?obj+' ':'')+verb+' '+step;
  }
  return {loc,desc};
}
/* 802차: 용지·여백 — 엑셀 인쇄 설정과 같은 갈래. 치수는 mm, 화면 px 는 ×96/25.4 */
const PD_A4=[210,297],PD_MG=10;   /* 808차: 용지는 A4, 안쪽 여백 10mm 고정 — 크기·여백은 인쇄 창에서 고른다. 방향만 여기서 정한다 */
function pdPaperMM(){const[a,b]=PD_A4;return PD.orient==='land'?[b,a]:[a,b];}
function pdCR(per,land){return per===2?(land?[2,1]:[1,2]):per===4?[2,2]:(land?[3,2]:[2,3]);}   /* [열, 줄] */
function pdLs(t){const n=String(t||'').length;return n<=4?'.6em':n<=8?'.3em':n<=14?'.1em':'0';}   /* 예시의 「사 진 대 지」 — 길면 좁힌다 */
const pdF=(k,cls,v)=>'<div class="phs-f"><b>'+k+' :</b><span class="'+cls+'">'+esc(v||'')+'</span></div>';
/* 807차: 쪽에 담을 차례 — 보통은 앞에서부터 per 장씩. 「폴더별 쪽 나누기」를 켜면 폴더(경로의 마지막 폴더)가
   바뀔 때 새 쪽에서 시작한다(남는 칸은 빈다). 폴더 없이 넣은 사진은 한 묶음으로 본다.
   반환: [[{ph,i}|null, …per장], …] — i 는 PD.photos 안의 자리(끌어 옮기기·번호가 그대로 쓴다) */
function pdFolderOf(p){const q=String(p.path||'');const k=q.lastIndexOf('/');return k<0?'':q.slice(0,k);}
function pdPageList(){
  const per=PD.per,n=PD.photos.length,out=[];
  const push=arr=>{for(let i=0;i<arr.length;i+=per){const pg=arr.slice(i,i+per);while(pg.length<per)pg.push(null);out.push(pg);}};
  if(!PD.split||!n){const all=PD.photos.map((ph,i)=>({ph,i}));if(!all.length)out.push(new Array(per).fill(null));else push(all);return out;}
  let grp=[],key=null;
  PD.photos.forEach((ph,i)=>{const f=pdFolderOf(ph);
    if(key!==null&&f!==key){push(grp);grp=[];}
    key=f;grp.push({ph,i});});
  if(grp.length)push(grp);
  if(!out.length)out.push(new Array(per).fill(null));
  return out;
}
function pdPagesHTML(print){
  const land=PD.orient==='land',per=PD.per,[c,r]=pdCR(per,land),n=PD.photos.length;
  const list=pdPageList(),pages=list.length;
  const ls=pdLs(PD.title);
  let h='';
  for(let p=0;p<pages;p++){
    let cells='';
    /* 빈 칸에 놓으면 그 뒤에 오는 사진 앞으로 — 없으면 맨 끝으로 */
    let next=n;for(let q=pages-1;q>p;q--)for(let k=per-1;k>=0;k--){const c2=list[q][k];if(c2)next=c2.i;}
    for(let k=0;k<per;k++){const cell=list[p][k],ph=cell&&cell.ph;
      let i=cell?cell.i:next;
      if(!cell){for(let k2=k+1;k2<per;k2++){const c2=list[p][k2];if(c2){i=c2.i;break;}}}
      cells+=ph
        ?'<div class="phs-cell'+(!print&&PD.sel.has(ph.id)?' sel':'')+'" data-id="'+ph.id+'" data-i="'+i+'"><div class="phs-ph'+(ph.fit&&ph.fit!=='fill'?' '+ph.fit:'')+'"><img src="'+ph.url+'" alt="" draggable="false">'+pdAnnSVG(ph)+'</div>'
          +pdF('위 치','phs-loc',ph.loc)+pdF('내 용','phs-desc',ph.desc)+'</div>'
        :'<div class="phs-cell" data-i="'+i+'" data-fill="1"><div class="phs-ph"></div>'+pdF('위 치','phs-loc','')+pdF('내 용','phs-desc','')+'</div>';
    }
    const [mw,mh]=pdPaperMM(),mg=PD_MG;
    const pg='<div class="phs-page'+(land?' land':'')+'" style="width:'+mw+'mm;height:'+mh+'mm;padding:'+mg+'mm"><div class="phs-sh"><div class="phs-ttl" style="letter-spacing:'+ls+';text-indent:'+ls+'">'+esc(PD.title)+'</div>'
      +'<div class="phs-site">현장명 : '+esc(PD.site)+'</div>'
      +'<div class="phs-cells" style="grid-template-columns:repeat('+c+',minmax(0,1fr));grid-template-rows:repeat('+r+',minmax(0,1fr))">'+cells+'</div>'
      +'<div class="phs-pg">'+(p+1)+' / '+pages+'</div></div></div>';
    h+=print?pg:'<div class="phs-pw" data-p="'+(p+1)+'">'+pg+'</div>';   /* 803차: 미리보기 밑 쪽 번호는 뺐다 — 바의 「n / 전체」와 중복 */
  }
  return {html:h,pages};
}
function pdCntText(){const j=PD.load;return PD.photos.length+'장'+(j?' · 불러오는 중 '+j.done+'/'+j.total:'');}
function rPhoto(){
  const root=$('#pdRoot');if(!root)return;
  const land=PD.orient==='land',pg=pdPagesHTML(false);
  const lay=[2,4,6].map(k=>{const[c,r]=pdCR(k,land);
    return '<button class="'+(k===PD.per?'on':'')+'" data-act="pd.per" data-k="'+k+'"><span class="phs-gl'+(land?' land':'')+'" style="grid-template-columns:repeat('+c+',1fr);grid-template-rows:repeat('+r+',1fr)">'+'<i></i>'.repeat(k)+'</span>'+k+'장</button>';}).join('');
  /* 841차: 브라우저 기본 datalist 목록은 글자·줄 높이가 앱과 따로 놀아 유난히 커 보였다 — 목록을 직접 그린다 */
  const siteNames=[...new Set((S.org.sites||[]).map(x=>x.name).filter(Boolean))];
  root.innerHTML='<div class="phs-grid"><div class="phs-col phs-left">'
    +'<div class="card"><div class="tm-h"><span>레이아웃</span></div><div class="phs-b">'
      +'<div class="seg phs-or"><button class="'+(land?'':'act')+'" data-act="pd.orient" data-o="por">세로</button><button class="'+(land?'act':'')+'" data-act="pd.orient" data-o="land">가로</button></div>'
      +'<div class="phs-lay">'+lay+'</div></div></div>'
    +'<div class="card"><div class="tm-h"><span>사진 <span class="tm-sub" id="pdCnt">'+pdCntText()+'</span></span><button class="btn bo bxs" data-act="pd.reset">초기화</button></div>'
      +'<div class="phs-b"><div class="phs-fr"><label>쪽 나눔</label><span class="seg">'
        +[['off','이어서'],['on','폴더별']].map(([k,l])=>'<button class="'+((PD.split?'on':'off')===k?'act':'')+'" data-act="pd.split" data-s="'+k+'" data-tip="'+(k==='on'?'폴더가 바뀌면 새 쪽에서 시작합니다':'폴더와 상관없이 이어 붙입니다')+'">'+l+'</button>').join('')+'</span></div>'
      +'<div class="phs-add phs-fr2"><button data-act="pd.files"><svg class="icn" aria-hidden="true"><use href="#i-photo"></use></svg>사진</button>'
      +'<button data-act="pd.dir"><svg class="icn" aria-hidden="true"><use href="#i-folder"></use></svg>폴더</button></div></div></div>'
    /* ⚠ 848차: 이 카드는 늘 그린다 — 사진을 넣을 때는 pdPages() 만 돌아 왼쪽 칸을 다시 그리지 않는다 */
    +'<div class="card"><div class="tm-h"><span>내보내기</span></div><div class="phs-b">'
      +'<button class="phs-xl" id="pdXl" data-act="pd.xlsx"'+(PD.photos.length?'':' disabled')+' data-tip="지금 미리보기 그대로 — 사진·표시·위치·내용·테두리까지 엑셀로">엑셀로 내보내기</button>'
      +'<div class="phs-xlh">인쇄는 위 인쇄 단추 · PDF 는 인쇄 창에서 저장</div></div></div>'
    +'<div class="card"><div class="tm-h"><span>머리글</span></div><div class="phs-b">'
      +'<div class="phs-fr"><label for="pdTitle">제목</label><input id="pdTitle" class="inp inp-sm" data-pd="title" maxlength="30" autocomplete="off" value="'+esc(PD.title)+'"></div>'
      +'<div class="phs-fr phs-sitew"><label for="pdSite">현장명</label>'
        +'<span class="phs-sw"><input id="pdSite" class="inp inp-sm" data-pd="site" maxlength="60" autocomplete="off" role="combobox" aria-expanded="false" aria-autocomplete="list" value="'+esc(PD.site)+'">'
        +'<div class="phs-sl" id="pdSiteList" hidden></div></span></div></div></div>'
    +'<div id="pdSelCard"></div>'
    +'</div><div class="phs-col"><div class="tkbar phs-bar"><span class="phs-cnt">미리보기'
    +'<span class="phs-pgn"><button data-act="pd.pgGo" data-d="-1" aria-label="이전 쪽" data-tip="이전 쪽"><svg class="icn" aria-hidden="true"><use href="#i-chevl"></use></svg></button>'
    +'<span class="phs-pgt" id="pdPgt">1 / '+pg.pages+'</span>'
    +'<button data-act="pd.pgGo" data-d="1" aria-label="다음 쪽" data-tip="다음 쪽"><svg class="icn" aria-hidden="true"><use href="#i-chevr"></use></svg></button></span></span>'
    +'<span class="phs-nav"><span class="phs-zc"><button data-act="pd.zStep" data-d="-1" aria-label="축소" data-tip="축소(Ctrl+휠)">−</button>'
      +'<span class="phs-pct" id="pdPct">100%</span>'
      +'<button data-act="pd.zStep" data-d="1" aria-label="확대" data-tip="확대(Ctrl+휠)">+</button></span>'
    +'<span class="seg">'
      +[['wf','쪽 맞춤'],['w1','폭 맞춤'],['w2','두 쪽'],['wg','여러 쪽']].map(([k,l])=>'<button class="'+(PD.zoom===k?'act':'')+'" data-act="pd.zoom" data-z="'+k+'">'+l+'</button>').join('')
    +'</span></span></div>'
    +'<div class="phs-view" id="pdView" data-sb>'+pg.html+'</div></div></div>'
    +'<input type="file" id="pdFiles" accept="image/*" multiple hidden><input type="file" id="pdDir" webkitdirectory multiple hidden>'
    +'<input type="file" id="pdSwap" accept="image/*" hidden>';
  rPdSel();pdZoom();
}
/* 800차: 미리보기 배율 — 「한 쪽」·「두 쪽」은 남는 칸을 재서 꽉 차게, 「여러 쪽」은 훑어보기용 고정.
   ⚠ zoom 은 레이아웃 크기를 바꾸므로 칸 크기(clientWidth)를 잰 뒤 넣는다 — 넣고 다시 재면 값이 흔들린다 */
function pdZoom(){
  const v=$('#pdView');if(!v)return;
  v.classList.toggle('z1',PD.zoom==='w1'||PD.zoom==='free');   /* 한 쪽·자유 — 한 줄에 한 쪽만(가로로 넘칠 수 있으므로) */
  v.classList.toggle('zg',PD.zoom==='wg');
  const [mw,mh]=pdPaperMM(),W=mw*96/25.4,H=mh*96/25.4;
  const cw=v.clientWidth-24-2,ch=v.clientHeight-24-4;   /* 805차: 안쪽 여백 12×2 · 테두리 */
  const np=Math.max(1,Math.ceil(PD.photos.length/PD.per));   /* 805차: 쪽이 하나뿐이면 두 쪽 칸을 잡아 둘 이유가 없다 */
  let z;
  if(PD.zoom==='free')z=PD.pz||1;
  else if(PD.zoom==='w1')z=Math.min(1,cw/W);   /* 한 쪽 = 폭에 꽉(원본 크기까지) */
  else if(PD.zoom==='w2')z=np<2?Math.min(cw/W,ch/H):Math.min((cw-14-10)/2/W,ch/H);   /* -10 은 여유 — 딱 맞추면 반올림 한두 px 에 둘째 쪽이 아래로 내려간다 */
  else if(PD.zoom==='wf')z=Math.min(cw/W,ch/H);   /* 쪽 맞춤 — 한 쪽이 통째로 */
  else z=Math.min((cw-3*10)/4/W,.3);
  z=Math.max(.1,Math.min(4,z));
  PD.pz=z;
  v.style.setProperty('--pz',z.toFixed(3));
  const pct=$('#pdPct');if(pct)pct.textContent=Math.round(z*100)+'%';
  pdVC();pdSbSync();
  $$('#pdRoot [data-act="pd.zoom"]').forEach(b=>b.classList.toggle('act',b.dataset.z===PD.zoom));
  pdPgIndi();
}
/* Ctrl+휠 확대·축소 — 커서 아래 지점을 잡아 둔다(엑셀·브라우저와 같은 느낌). 0.1~4배 */
function pdWheelZoom(e){
  const v=$('#pdView');if(!v)return;
  e.preventDefault();
  const r=v.getBoundingClientRect(),before=PD.pz||1;
  const px=(v.scrollLeft+e.clientX-r.left)/before,py=(v.scrollTop+e.clientY-r.top)/before;
  const z=Math.max(.1,Math.min(4,before*Math.pow(1.0015,-e.deltaY)));
  PD.zoom='free';PD.pz=z;pdZoom();
  v.scrollTo({left:px*z-(e.clientX-r.left),top:py*z-(e.clientY-r.top),behavior:'instant'});
  pdPgIndi();
}
/* 804차: 쪽이 칸을 못 채우면 위아래 가운데로(두 쪽 보기에서 폭이 먼저 차면 늘 밑에만 빈다).
   ⚠ 넘칠 때 켜 두면 flex 가운데 정렬이 위쪽을 잘라 먹는다 — 쪽 수·배율이 바뀔 때마다 다시 판단한다 */
/* 809차: 미리보기 세로 스크롤 막대 — 앱 정책상 네이티브 바는 숨기므로(459행) 얇은 막대를 직접 띄운다.
   445차 가로 막대(`ovs`)와 같은 방식이되 세로이고, **구를 때만 잠깐** 보였다가 사라진다(사용자).
   ⚠ 미리보기 안은 사진을 끌어 옮기는 곳이라 막대는 잡아끌지 않는다(pointerdown 을 가로채면 끌기와 부딪힌다) */
/* 843차: 업무 도구 세 화면의 세로 막대 — **늘 보이고 잡아끌 수 있다**(사용자).
   ⚠ 미리보기 안은 사진을 끌어 옮기는 곳이라 막대에만 포인터를 주고(`.on{pointer-events:auto}`) 나머지는 통과시킨다.
   topPad: 붙박이 머리 줄 높이(견적 검토 표) — 막대는 그 아래에서만 움직인다. */
function dwSb(v,cls,topPad){
  if(!v||!v.parentElement)return;
  const w=v.__sb||(v.__sb=(()=>{const b=document.createElement('div');b.className=cls;v.parentElement.appendChild(b);
    b.addEventListener('pointerdown',e=>{
      e.preventDefault();e.stopPropagation();
      const tp=v.__sbTop||0,y0=e.clientY,top0=v.scrollTop;
      const track=(v.clientHeight-tp)-12-b.offsetHeight;
      const ratio=track>0?((v.scrollHeight-v.clientHeight)/track):0;
      b.setPointerCapture(e.pointerId);b.classList.add('drag');
      const mv=ev=>{v.scrollTo({top:top0+(ev.clientY-y0)*ratio,behavior:'instant'});};
      const up=()=>{b.classList.remove('drag');b.removeEventListener('pointermove',mv);b.removeEventListener('pointerup',up);};
      b.addEventListener('pointermove',mv);b.addEventListener('pointerup',up);
    });
    return b;})());
  const tp=v.__sbTop=topPad||0;
  const h=v.clientHeight-tp,sh=v.scrollHeight-tp;
  if(sh<=h+1){w.classList.remove('on');w.style.height='0px';return;}
  w.classList.add('on');
  const PAD=6,track=h-PAD*2,bh=Math.max(24,Math.round(track*h/sh)),max=track-bh;
  w.style.height=bh+'px';
  w.style.top=Math.round(v.offsetTop+tp+PAD+max*(v.scrollTop/(v.scrollHeight-v.clientHeight)))+'px';
}
function pdSbSync(){dwSb($('#pdView'),'phs-sb');}
function pdSbFlash(){pdSbSync();}
/* ── 841차: 현장명 고르기(앱 목록) ── */
let PD_SITES=[],PD_SI=-1;
function pdSiteNames(){return [...new Set((S.org.sites||[]).map(x=>x.name).filter(Boolean))];}
function pdSiteOpen(q){
  const box=$('#pdSiteList'),inp=$('#pdSite');if(!box||!inp)return;
  const key=String(q==null?inp.value:q).trim().toLowerCase();
  const all=pdSiteNames();
  /* 이미 고른 이름 그대로면 목록을 다시 다 보여 준다 — 한 줄만 뜨면 바꿀 수가 없다 */
  PD_SITES=(!key||all.some(n=>n.toLowerCase()===key))?all:all.filter(n=>n.toLowerCase().includes(key));
  if(!PD_SITES.length){pdSiteClose();return;}
  PD_SI=-1;
  box.innerHTML=PD_SITES.map((n,i)=>'<button class="phs-sio" type="button" data-i="'+i+'">'+esc(n)+'</button>').join('');
  box.hidden=false;inp.setAttribute('aria-expanded','true');
  pdSitePos();
}
/* ⚠ 목록은 카드(overflow:hidden)와 스크롤 칸에 잘린다 — 화면 기준(fixed)으로 띄우고 자리만 맞춘다 */
function pdSitePos(){
  const box=$('#pdSiteList'),inp=$('#pdSite');if(!box||!inp||box.hidden)return;
  const r=inp.getBoundingClientRect();
  const below=innerHeight-r.bottom-10,above=r.top-10;
  const h=Math.min(216,Math.max(120,below>=160?below:above));
  const up=below<160&&above>below;
  box.style.left=Math.round(r.left)+'px';
  box.style.width=Math.round(r.width)+'px';
  box.style.maxHeight=Math.round(h)+'px';
  box.style.top=up?'':Math.round(r.bottom+4)+'px';
  box.style.bottom=up?Math.round(innerHeight-r.top+4)+'px':'';
}
document.addEventListener('scroll',()=>{const b=$('#pdSiteList');if(b&&!b.hidden)pdSitePos();},true);
window.addEventListener('resize',()=>{const b=$('#pdSiteList');if(b&&!b.hidden)pdSitePos();});
function pdSiteClose(){
  const box=$('#pdSiteList'),inp=$('#pdSite');
  if(box){box.hidden=true;box.innerHTML='';}
  if(inp)inp.setAttribute('aria-expanded','false');
  PD_SITES=[];PD_SI=-1;
}
function pdSitePick(n){
  const inp=$('#pdSite');if(!inp)return;
  inp.value=n;PD.site=n;
  $$('#pdView .phs-site').forEach(x=>{x.textContent='현장명 : '+n;});
  pdSiteClose();inp.focus();
}
function pdSiteMove(d){
  const box=$('#pdSiteList');if(!box||box.hidden)return;
  const n=PD_SITES.length;if(!n)return;
  PD_SI=(PD_SI+d+n)%n;
  [...box.children].forEach((b,i)=>b.classList.toggle('on',i===PD_SI));
  const el=box.children[PD_SI];if(el)el.scrollIntoView({block:'nearest'});
}
document.addEventListener('focusin',e=>{if(e.target&&e.target.id==='pdSite')pdSiteOpen();});
document.addEventListener('click',e=>{if(e.target&&e.target.id==='pdSite'){const b=$('#pdSiteList');if(b&&b.hidden)pdSiteOpen();}});
document.addEventListener('input',e=>{if(e.target&&e.target.id==='pdSite')pdSiteOpen();});
document.addEventListener('keydown',e=>{
  if(!e.target||e.target.id!=='pdSite')return;
  const box=$('#pdSiteList'),open=box&&!box.hidden;
  if(e.key==='ArrowDown'){e.preventDefault();if(!open)pdSiteOpen();else pdSiteMove(1);return;}
  if(e.key==='ArrowUp'){e.preventDefault();pdSiteMove(-1);return;}
  if(e.key==='Enter'&&open&&PD_SI>=0){e.preventDefault();pdSitePick(PD_SITES[PD_SI]);return;}
  if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();pdSiteClose();}
});
document.addEventListener('mousedown',e=>{
  const b=e.target.closest&&e.target.closest('.phs-sio');
  if(b){e.preventDefault();pdSitePick(PD_SITES[+b.dataset.i]);return;}
  if(!(e.target.closest&&e.target.closest('.phs-sw')))pdSiteClose();
},true);
function pdVC(){
  const v=$('#pdView');if(!v)return;
  v.classList.remove('vc');
  if(v.scrollHeight<=v.clientHeight+1)v.classList.add('vc');
}
/* 보이는 쪽 번호 — 미리보기 칸 가운데에 걸친 쪽 */
function pdPgIndi(){
  const v=$('#pdView'),t=$('#pdPgt');if(!v||!t)return;
  const pw=[...v.querySelectorAll('.phs-pw')];if(!pw.length)return;
  /* 한 줄에 여러 쪽이 놓이므로 「위에서부터 처음 보이는 쪽」을 현재 쪽으로 삼는다(마지막 쪽 기준이면 두 쪽 보기에서 늘 뒤 쪽이 잡혔다) */
  const vt=v.getBoundingClientRect().top;
  let cur=pw[pw.length-1];
  for(const w of pw){if(w.getBoundingClientRect().bottom>vt+12){cur=w;break;}}
  PD.page=Number(cur.dataset.p)||1;
  t.textContent=PD.page+' / '+pw.length;
  const bs=$$('#pdRoot .phs-pgn button');
  if(bs[0])bs[0].disabled=PD.page<=1;
  if(bs[1])bs[1].disabled=PD.page>=pw.length;
}
function pdPgGo(d){
  const v=$('#pdView');if(!v)return;
  const pw=[...v.querySelectorAll('.phs-pw')];if(!pw.length)return;
  const n=Math.min(pw.length,Math.max(1,PD.page+d)),w=pw[n-1];
  v.scrollTo({top:n===1?0:Math.max(0,v.scrollTop+w.getBoundingClientRect().top-v.getBoundingClientRect().top-20),behavior:'instant'});
  pdPgIndi();
}
/* 미리보기만 다시 — 왼쪽 입력칸(포커스)과 스크롤 자리를 지킨다 */
function pdPages(){
  const v=$('#pdView');if(!v){rPhoto();return;}
  const st=v.scrollTop,pg=pdPagesHTML(false);
  v.innerHTML=pg.html;v.scrollTo({top:st,behavior:'instant'});
  pdZoom();   /* 805차: 쪽 수가 배율에 영향을 준다(한 쪽뿐이면 두 쪽 칸을 비워 두지 않는다) — 다시 그릴 때마다 계산 */
  const c=$('#pdCnt');if(c)c.textContent=pdCntText();
  if(typeof pdAnnUI==='function')pdAnnUI();   /* 847차: 다시 그리면 고른 표시의 상자도 다시 */
  const xl=$('#pdXl');if(xl)xl.disabled=!PD.photos.length;
  rPdSel();
}
function rPdSel(){
  const box=$('#pdSelCard');if(!box)return;
  const list=PD.photos.filter(p=>PD.sel.has(p.id));
  if(!list.length){box.innerHTML='';return;}
  const same=k=>list.every(p=>p[k]===list[0][k])?list[0][k]:null;
  const lv=same('loc'),dv=same('desc'),fv=list.every(p=>(p.fit||'fill')===(list[0].fit||'fill'))?(list[0].fit||'fill'):'';
  box.innerHTML='<div class="card"><div class="tm-h"><span>선택한 사진 <span class="tm-sub">'+list.length+'장</span></span>'
    +'<button class="btn tm-add" data-act="pd.selClear" aria-label="선택 해제" data-tip="선택 해제"><svg class="icn" aria-hidden="true"><use href="#i-close"></use></svg></button></div>'
    +'<div class="phs-b"><div class="phs-fr"><label for="pdLoc">위치</label><input id="pdLoc" class="inp inp-sm" data-pd="loc" maxlength="60" autocomplete="off" value="'+esc(lv??'')+'"'+(lv===null?' placeholder="여러 값"':'')+'></div>'
    +'<div class="phs-fr"><label for="pdDesc">내용</label><input id="pdDesc" class="inp inp-sm" data-pd="desc" maxlength="80" autocomplete="off" value="'+esc(dv??'')+'"'+(dv===null?' placeholder="여러 값"':'')+'></div>'
    +'<div class="phs-fr"><label>사진</label><span class="seg">'
      +[['fill','늘림'],['contain','맞춤'],['cover','채움']].map(([k,l])=>'<button class="'+(fv===k?'act':'')+'" data-act="pd.fit" data-f="'+k+'">'+l+'</button>').join('')+'</span></div>'
    +'<div class="phs-act phs-act3"><button data-act="pd.rot" data-d="-1" data-tip="왼쪽으로 90° 돌리기">↺ 왼쪽</button>'
      +'<button data-act="pd.rot" data-d="1" data-tip="오른쪽으로 90° 돌리기">↻ 오른쪽</button>'
      +'<button data-act="pd.swap"'+(list.length>1?' disabled':'')+' data-tip="위치·내용·순서는 그대로 두고 사진만 바꿉니다">사진 교체</button></div>'
    +'<div class="phs-act phs-act2"><button data-act="pd.fillFirst"'+(list.length<2?' disabled':'')+' data-tip="선택한 것 중 맨 앞 사진의 위치·내용을 나머지에 복사합니다">첫 값 복사</button>'
      +'<button data-act="pd.fillBlank"'+(list.length<2?' disabled':'')+' data-tip="빈 칸만 바로 앞 사진 값으로 채웁니다">빈칸 채우기</button></div>'
    +'<div class="phs-tools">'
      +PD_TOOLS.map(([k,l])=>'<button class="'+(PD.tool===k?'act':'')+'" data-act="pd.tool" data-t="'+k+'">'+l+'</button>').join('')+'</div>'
    +(PD.tool!=='none'||PD.asel
      ?'<div class="phs-fr"><label>색·굵기</label><span class="phs-cw">'
        +PD_COLORS.map(c=>'<button class="phs-co'+(PD.color===c?' on':'')+'" style="background:'+c+'" data-act="pd.annColor" data-c="'+c+'" aria-label="'+c+'"></button>').join('')
        +'<span class="seg phs-lw">'+[[1,'가늘게'],[2,'보통'],[4,'굵게']].map(([w,l])=>'<button class="'+(PD.lw===w?'act':'')+'" data-act="pd.annLw" data-w="'+w+'">'+l+'</button>').join('')+'</span></span></div>'
      +'<div class="phs-fr"><label>선</label><span class="seg">'
        +[[0,'실선'],[1,'점선']].map(([d,l])=>'<button class="'+((PD.dash?1:0)===d?'act':'')+'" data-act="pd.annDash" data-d="'+d+'">'+l+'</button>').join('')+'</span></div>'
      :'')
    +((PD.tool!=='none'||PD.asel||list.some(p=>(p.ann||[]).length))?'<div class="phs-act phs-act2"><button data-act="pd.annUndo">되돌리기</button><button data-act="pd.annClear"'+(list.some(p=>(p.ann||[]).length)?'':' disabled')+'>이 사진 표시 지우기</button></div>':'')
    +'<div class="phs-act"><button data-act="pd.crop"'+(list.length>1?' disabled':'')+'><svg class="icn" aria-hidden="true"><use href="#i-crop"></use></svg>자르기</button>'
    +'<button class="dg" data-act="pd.del"><svg class="icn" aria-hidden="true"><use href="#i-trash"></use></svg>삭제</button></div></div></div>';
}
/* ═══ 846차: 사진 위 표시(원·네모·화살표·선) ═══
   좌표는 사진 칸을 0~100 으로 본 **비율**로 넣는다 — 배율을 바꾸거나 인쇄해도 같은 자리에 남는다.
   선 굵기는 `vector-effect:non-scaling-stroke` 라 화면과 종이에서 같은 두께가 된다. */
const PD_TOOLS=[['none','고르기'],['rect','네모'],['ellipse','원'],['arrow','화살표']];   /* 847차: 선·지우개는 뺀다 — 지우기는 고른 뒤 Delete 나 우클릭 */
const PD_COLORS=['#E02424','#F59F00','#1C7ED6','#2F9E44','#111111'];
const PD_DASH='6,4';   /* 849차: 점선 — 굵기와 무관하게 같은 간격으로 보이게 화면 단위(px) */
function pdAnnSVG(ph,extra){
  const list=(ph&&ph.ann)||[];
  if(!list.length&&!extra)return '';
  const one=a=>{
    const c=esc(a.c||'#E02424'),w=a.w||2;
    const st='fill="none" stroke="'+c+'" stroke-width="'+w+'"'+(a.d?' stroke-dasharray="'+PD_DASH+'"':'')+' vector-effect="non-scaling-stroke" stroke-linecap="'+(a.d?'butt':'round')+'" stroke-linejoin="round"';
    if(a.t==='rect')return '<rect x="'+Math.min(a.x,a.x2)+'" y="'+Math.min(a.y,a.y2)+'" width="'+Math.abs(a.x2-a.x)+'" height="'+Math.abs(a.y2-a.y)+'" '+st+'/>';
    if(a.t==='ellipse')return '<ellipse cx="'+((a.x+a.x2)/2)+'" cy="'+((a.y+a.y2)/2)+'" rx="'+(Math.abs(a.x2-a.x)/2)+'" ry="'+(Math.abs(a.y2-a.y)/2)+'" '+st+'/>';
    if(a.t==='line')return '<line x1="'+a.x+'" y1="'+a.y+'" x2="'+a.x2+'" y2="'+a.y2+'" '+st+'/>';
    /* 화살표 — 촉은 선 끝에서 각도대로 두 획 */
    const dx=a.x2-a.x,dy=a.y2-a.y,len=Math.hypot(dx,dy)||1;
    const hx=Math.min(9,Math.max(3.5,len*0.28)),ang=Math.atan2(dy,dx),sp=0.42;
    const p1=[a.x2-hx*Math.cos(ang-sp),a.y2-hx*Math.sin(ang-sp)],p2=[a.x2-hx*Math.cos(ang+sp),a.y2-hx*Math.sin(ang+sp)];
    return '<line x1="'+a.x+'" y1="'+a.y+'" x2="'+a.x2+'" y2="'+a.y2+'" '+st+'/>'
      +'<polyline points="'+p1[0]+','+p1[1]+' '+a.x2+','+a.y2+' '+p2[0]+','+p2[1]+'" '+st+'/>';
  };
  return '<svg class="phs-ann" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'
    +list.map(one).join('')+(extra?one(extra):'')+'</svg>';
}
function pdAnnPaint(id,extra){
  const ph=PD.photos.find(p=>p.id===id);if(!ph)return;
  $$('#pdView .phs-cell[data-id="'+id+'"] .phs-ph').forEach(box=>{
    const old=box.querySelector('.phs-ann');if(old)old.remove();
    const html=pdAnnSVG(ph,extra);
    if(html){const ui=box.querySelector('.phs-annui');
      if(ui)ui.insertAdjacentHTML('beforebegin',html);else box.insertAdjacentHTML('beforeend',html);}
  });
}
let _pdAnn=null;
document.addEventListener('pointerdown',e=>{
  if(PD.tool==='none'||e.button!==0||!e.target.closest)return;
  const box=e.target.closest('#pdView .phs-cell[data-id] .phs-ph');if(!box)return;
  const cell=box.closest('.phs-cell'),ph=PD.photos.find(p=>p.id===cell.dataset.id);if(!ph)return;
  e.preventDefault();e.stopPropagation();
  const r=box.getBoundingClientRect();
  const at=(cx,cy)=>[Math.max(0,Math.min(100,(cx-r.left)/r.width*100)),Math.max(0,Math.min(100,(cy-r.top)/r.height*100))];
  const [x,y]=at(e.clientX,e.clientY);
  _pdAnn={id:ph.id,box,r,a:{t:PD.tool,x,y,x2:x,y2:y,c:PD.color,w:PD.lw,d:PD.dash?1:0}};
  pdAnnPaint(ph.id,_pdAnn.a);
},true);
document.addEventListener('pointermove',e=>{
  if(!_pdAnn)return;
  const r=_pdAnn.r;
  _pdAnn.a.x2=Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100));
  _pdAnn.a.y2=Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100));
  if(e.shiftKey&&_pdAnn.a.t!=='line'&&_pdAnn.a.t!=='arrow'){   /* Shift = 정사각형·정원 */
    const s=Math.min(Math.abs(_pdAnn.a.x2-_pdAnn.a.x),Math.abs(_pdAnn.a.y2-_pdAnn.a.y));
    _pdAnn.a.x2=_pdAnn.a.x+Math.sign(_pdAnn.a.x2-_pdAnn.a.x)*s;
    _pdAnn.a.y2=_pdAnn.a.y+Math.sign(_pdAnn.a.y2-_pdAnn.a.y)*s;
  }
  pdAnnPaint(_pdAnn.id,_pdAnn.a);
},true);
document.addEventListener('pointerup',()=>{
  if(!_pdAnn)return;
  const {id,a}=_pdAnn;_pdAnn=null;
  const ph=PD.photos.find(p=>p.id===id);if(!ph)return;
  const small=Math.hypot(a.x2-a.x,a.y2-a.y)<2.5;   /* 그냥 누른 것은 표시로 보지 않는다 */
  if(small){pdAnnPaint(id);return;}
  pdAnnSnap(id);
  (ph.ann=ph.ann||[]).push(a);
  PD.asel={id,idx:ph.ann.length-1};PD.tool='none';   /* 847차: 그리고 나면 바로 고를 수 있게 */
  document.body.classList.remove('pd-drawing');
  pdAnnPaint(id);pdAnnUI();rPdSel();
},true);
/* ⚠ 앱 전체 되돌리기보다 먼저 잡아야 한다(캡처) — 안 그러면 「되돌릴 변경 없음」 토스트가 먼저 뜬다 */
document.addEventListener('keydown',e=>{
  if(S.view!=='photo'||!PD.photos.length)return;
  const t=e.target;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable))return;
  if((e.ctrlKey||e.metaKey)&&(e.key==='z'||e.key==='Z'||e.key==='ㅋ')){
    if(!PD.undo.length)return;                 /* 표시 기록이 없으면 앱 되돌리기에 넘긴다 */
    e.preventDefault();e.stopPropagation();pdAnnUndo();
  }
},true);
/* ── 847차: 표시 고르기·옮기기·크기 조절·복사 ── */
/* 고른 표시가 있으면 색·굵기를 그 표시에 바로 입힌다 */
function pdAnnApply(patch){
  const sel=PD.asel;if(!sel)return;
  const ph=PD.photos.find(p=>p.id===sel.id);if(!ph||!ph.ann||!ph.ann[sel.idx])return;
  pdAnnSnap(sel.id);Object.assign(ph.ann[sel.idx],patch);pdAnnPaint(sel.id);pdAnnUI();
}
function pdAnnSnap(id){
  const ph=PD.photos.find(p=>p.id===id);if(!ph)return;
  PD.undo.push({id,ann:JSON.parse(JSON.stringify(ph.ann||[]))});
  if(PD.undo.length>50)PD.undo.shift();
}
function pdAnnBox(a){return {x:Math.min(a.x,a.x2),y:Math.min(a.y,a.y2),w:Math.abs(a.x2-a.x),h:Math.abs(a.y2-a.y)};}
/* 누른 자리에 있는 표시 — 위에 그린 것부터 본다 */
function pdAnnHit(ph,x,y){
  const list=ph.ann||[];
  for(let i=list.length-1;i>=0;i--){
    const a=list[i],b=pdAnnBox(a),m=3.5;
    if(x>=b.x-m&&x<=b.x+b.w+m&&y>=b.y-m&&y<=b.y+b.h+m)return i;
  }
  return -1;
}
const PD_H=[['nw',0,0],['n',.5,0],['ne',1,0],['e',1,.5],['se',1,1],['s',.5,1],['sw',0,1],['w',0,.5]];
function pdAnnUI(){
  $$('#pdView .phs-annui').forEach(e=>e.remove());
  const sel=PD.asel;if(!sel||PD.tool!=='none')return;
  const ph=PD.photos.find(p=>p.id===sel.id);if(!ph||!ph.ann||!ph.ann[sel.idx])return;
  const a=ph.ann[sel.idx],b=pdAnnBox(a);
  const arrow=a.t==='arrow';
  const hs=(arrow?[['a1',0,0],['a2',1,1]]:PD_H).map(([k,fx,fy])=>{
    /* 화살표는 양끝을 잡는다 — 상자 모서리로는 방향을 못 바꾼다 */
    const px=arrow?(k==='a1'?a.x:a.x2):(b.x+b.w*fx),py=arrow?(k==='a1'?a.y:a.y2):(b.y+b.h*fy);
    return '<i class="phs-h" data-h="'+k+'" style="left:'+px+'%;top:'+py+'%"></i>';
  }).join('');
  const html='<div class="phs-annui" data-idx="'+sel.idx+'">'
    +'<div class="phs-abox" style="left:'+b.x+'%;top:'+b.y+'%;width:'+b.w+'%;height:'+b.h+'%"></div>'+hs+'</div>';
  $$('#pdView .phs-cell[data-id="'+sel.id+'"] .phs-ph').forEach(box=>box.insertAdjacentHTML('beforeend',html));
}
let _pdAe=null;
document.addEventListener('pointerdown',e=>{
  if(PD.tool!=='none'||e.button!==0||!e.target.closest)return;
  const box=e.target.closest('#pdView .phs-cell[data-id] .phs-ph');if(!box)return;
  const cell=box.closest('.phs-cell'),ph=PD.photos.find(p=>p.id===cell.dataset.id);if(!ph)return;
  const r=box.getBoundingClientRect();
  const x=(e.clientX-r.left)/r.width*100,y=(e.clientY-r.top)/r.height*100;
  const handle=e.target.closest('.phs-h');
  if(handle&&PD.asel&&PD.asel.id===ph.id){
    e.preventDefault();e.stopPropagation();
    pdAnnSnap(ph.id);
    _pdAe={mode:'size',h:handle.dataset.h,id:ph.id,idx:PD.asel.idx,r,a0:{...ph.ann[PD.asel.idx]},x,y};
    return;
  }
  const hit=pdAnnHit(ph,x,y);
  if(hit<0){if(PD.asel){PD.asel=null;pdAnnUI();}return;}
  e.preventDefault();e.stopPropagation();
  PD.asel={id:ph.id,idx:hit};pdAnnUI();
  pdAnnSnap(ph.id);
  _pdAe={mode:'move',id:ph.id,idx:hit,r,a0:{...ph.ann[hit]},x,y,moved:false};
},true);
document.addEventListener('pointermove',e=>{
  const d=_pdAe;if(!d)return;
  const ph=PD.photos.find(p=>p.id===d.id);if(!ph)return;
  const a=ph.ann[d.idx];if(!a)return;
  const nx=(e.clientX-d.r.left)/d.r.width*100,ny=(e.clientY-d.r.top)/d.r.height*100;
  const dx=nx-d.x,dy=ny-d.y;
  if(Math.abs(dx)+Math.abs(dy)>0.4)d.moved=true;
  if(d.mode==='move'){
    a.x=d.a0.x+dx;a.y=d.a0.y+dy;a.x2=d.a0.x2+dx;a.y2=d.a0.y2+dy;
  }else if(d.h==='a1'){a.x=nx;a.y=ny;}
  else if(d.h==='a2'){a.x2=nx;a.y2=ny;}
  else{
    let x1=Math.min(d.a0.x,d.a0.x2),y1=Math.min(d.a0.y,d.a0.y2),x2=Math.max(d.a0.x,d.a0.x2),y2=Math.max(d.a0.y,d.a0.y2);
    if(d.h.includes('w'))x1=Math.min(nx,x2-1);
    if(d.h.includes('e'))x2=Math.max(nx,x1+1);
    if(d.h.includes('n'))y1=Math.min(ny,y2-1);
    if(d.h.includes('s'))y2=Math.max(ny,y1+1);
    a.x=x1;a.y=y1;a.x2=x2;a.y2=y2;
  }
  pdAnnPaint(d.id);pdAnnUI();
},true);
document.addEventListener('pointerup',()=>{
  if(!_pdAe)return;
  if(!_pdAe.moved)PD.undo.pop();     /* 그냥 고르기만 한 것은 되돌리기에 남기지 않는다 */
  _pdAe=null;rPdSel();
},true);
/* 우클릭 — 복사 · 잘라내기 · 삭제 · 붙여넣기 */
document.addEventListener('contextmenu',e=>{
  if(!e.target.closest)return;
  const box=e.target.closest('#pdView .phs-cell[data-id] .phs-ph');if(!box)return;
  const cell=box.closest('.phs-cell'),ph=PD.photos.find(p=>p.id===cell.dataset.id);if(!ph)return;
  const r=box.getBoundingClientRect();
  const x=(e.clientX-r.left)/r.width*100,y=(e.clientY-r.top)/r.height*100;
  const hit=pdAnnHit(ph,x,y);
  if(hit>=0){PD.asel={id:ph.id,idx:hit};PD.tool='none';document.body.classList.remove('pd-drawing');pdAnnUI();rPdSel();}
  e.preventDefault();
  const items=[];
  if(hit>=0)items.push(
    {label:'복사',act:()=>{PD.clip={...ph.ann[hit]};toast('표시를 복사했습니다');}},
    {label:'잘라내기',act:()=>{PD.clip={...ph.ann[hit]};pdAnnDel();}},
    {label:'삭제',danger:true,act:()=>pdAnnDel()});
  if(PD.clip)items.push({label:'붙여넣기',act:()=>pdAnnPaste(ph.id,x,y)});
  if(!items.length)return;
  openCtx(e.clientX,e.clientY,items);
},true);
function pdAnnDel(){
  const sel=PD.asel;if(!sel)return;
  const ph=PD.photos.find(p=>p.id===sel.id);if(!ph||!ph.ann||!ph.ann[sel.idx])return;
  pdAnnSnap(sel.id);
  ph.ann.splice(sel.idx,1);PD.asel=null;
  pdAnnPaint(sel.id);pdAnnUI();rPdSel();
}
function pdAnnPaste(id,x,y){
  const ph=PD.photos.find(p=>p.id===id);if(!ph||!PD.clip)return;
  const c=PD.clip,b=pdAnnBox(c);
  const a={...c};
  if(x!=null){const dx=x-(b.x+b.w/2),dy=y-(b.y+b.h/2);a.x+=dx;a.y+=dy;a.x2+=dx;a.y2+=dy;}
  else{a.x+=3;a.y+=3;a.x2+=3;a.y2+=3;}
  pdAnnSnap(id);
  (ph.ann=ph.ann||[]).push(a);
  PD.asel={id,idx:ph.ann.length-1};
  pdAnnPaint(id);pdAnnUI();rPdSel();
}
/* 키 — Delete 삭제 · Ctrl+C/X/V */
document.addEventListener('keydown',e=>{
  if(S.view!=='photo'||!PD.asel)return;
  const t=e.target;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable))return;
  const ph=PD.photos.find(p=>p.id===PD.asel.id);if(!ph)return;
  const a=ph.ann&&ph.ann[PD.asel.idx];
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();e.stopPropagation();pdAnnDel();return;}
  if(e.key==='Escape'){PD.asel=null;pdAnnUI();return;}
  if(!(e.ctrlKey||e.metaKey)||!a)return;
  const k=e.key.toLowerCase();
  if(k==='c'||e.key==='ㅊ'){e.preventDefault();e.stopPropagation();PD.clip={...a};toast('표시를 복사했습니다');}
  else if(k==='x'||e.key==='ㅌ'){e.preventDefault();e.stopPropagation();PD.clip={...a};pdAnnDel();}
  else if(k==='v'||e.key==='ㅍ'){e.preventDefault();e.stopPropagation();pdAnnPaste(PD.asel.id);}
},true);
function pdAnnUndo(){
  const u=PD.undo.pop();if(!u){toast('되돌릴 표시가 없습니다');return;}
  const ph=PD.photos.find(p=>p.id===u.id);if(!ph)return;
  ph.ann=u.ann;PD.asel=null;pdAnnPaint(u.id);pdAnnUI();rPdSel();
}
function pdSelPaint(){
  $$('#pdView .phs-cell[data-id]').forEach(c=>c.classList.toggle('sel',PD.sel.has(c.dataset.id)));
  rPdSel();
}
/* 선택 — 클릭 = 그 사진만 · Ctrl = 하나씩 더하거나 빼기 · Shift = 기준점(마지막으로 누른 사진)부터 그 사진까지 */
function pdClickSel(id,ctrl,shift){
  const ids=PD.photos.map(p=>p.id);
  if(shift&&PD.anchor&&ids.includes(PD.anchor)){
    const a=ids.indexOf(PD.anchor),b=ids.indexOf(id),rng=ids.slice(Math.min(a,b),Math.max(a,b)+1);
    if(ctrl)rng.forEach(x=>PD.sel.add(x));else PD.sel=new Set(rng);
  }else if(ctrl){if(PD.sel.has(id))PD.sel.delete(id);else PD.sel.add(id);PD.anchor=id;}
  else{PD.sel=new Set([id]);PD.anchor=id;}
  pdSelPaint();
}
/* 806차: 사진 회전 — 그림 자체를 돌려 다시 만든다(미리보기·인쇄가 같은 그림을 쓰므로 CSS 회전보다 단순하다).
   잘라 둔 영역이 있으면 그 영역도 같이 돌린다 */
async function pdRotOne(p,dir){
  const turn=async(url,w,h)=>{
    const im=new Image();im.src=url;await im.decode();
    const cv=document.createElement('canvas');cv.width=h;cv.height=w;
    const cx=cv.getContext('2d');cx.translate(h/2,w/2);cx.rotate(dir>0?Math.PI/2:-Math.PI/2);cx.drawImage(im,-w/2,-h/2,w,h);
    const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',.92));
    return blob?URL.createObjectURL(blob):null;
  };
  const nsrc=await turn(p.src,p.w,p.h);if(!nsrc)return false;
  let nurl=nsrc,ncrop=null;
  if(p.crop){
    const c=p.crop;
    ncrop=dir>0?{x:1-c.y-c.h,y:c.x,w:c.h,h:c.w}:{x:c.y,y:1-c.x-c.w,w:c.h,h:c.w};
    const im=new Image();im.src=nsrc;await im.decode();
    const sw=Math.max(1,Math.round(ncrop.w*p.h)),sh=Math.max(1,Math.round(ncrop.h*p.w));
    const cv=document.createElement('canvas');cv.width=sw;cv.height=sh;
    cv.getContext('2d').drawImage(im,Math.round(ncrop.x*p.h),Math.round(ncrop.y*p.w),sw,sh,0,0,sw,sh);
    const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',.92));
    if(blob)nurl=URL.createObjectURL(blob);
  }
  pdRevoke(p);
  p.src=nsrc;p.url=nurl;p.crop=ncrop;const t=p.w;p.w=p.h;p.h=t;
  return true;
}
async function pdRot(dir){
  const list=PD.photos.filter(p=>PD.sel.has(p.id));if(!list.length)return;
  for(const p of list){try{await pdRotOne(p,dir);}catch(e){console.warn('[사진대지] 회전 실패',e);}}
  pdPages();
}
/* 806차: 사진 교체 — 위치·내용·맞춤·순서는 그대로 두고 그림만 바꾼다 */
async function pdSwap(file){
  const id=[...PD.sel][0],p=PD.photos.find(x=>x.id===id);if(!p||!file)return;
  let np;try{np=await pdDecode(file);}catch(e){toast('이 파일은 열 수 없습니다');return;}
  pdRevoke(p);
  p.src=np.src;p.url=np.url;p.w=np.w;p.h=np.h;p.crop=null;p.name=np.name;p.path=np.path;
  pdPages();
}
/* 806차: 위치·내용 채우기 — 첫 값 복사 / 빈칸만 앞 값으로 */
function pdFill(mode){
  const list=PD.photos.filter(p=>PD.sel.has(p.id));if(list.length<2)return;
  if(mode==='first'){const a=list[0];list.slice(1).forEach(p=>{p.loc=a.loc;p.desc=a.desc;});}
  else{let lo=list[0].loc,de=list[0].desc;
    list.forEach(p=>{if(!p.loc)p.loc=lo;else lo=p.loc;if(!p.desc)p.desc=de;else de=p.desc;});}
  pdPages();
}
function pdRevoke(p){try{if(p.url&&p.url!==p.src)URL.revokeObjectURL(p.url);URL.revokeObjectURL(p.src);}catch(e){}}
/* 넣기 — 파일 여러 장 또는 폴더(하위 폴더 전부, webkitdirectory). 경로·이름의 자연 정렬(1, 2, 10) 순으로 뒤에 붙인다 */
async function pdDecode(f){
  const bmp=await createImageBitmap(f,{imageOrientation:'from-image'});
  const s=Math.min(1,PD_MAX/Math.max(bmp.width,bmp.height)),w=Math.max(1,Math.round(bmp.width*s)),h=Math.max(1,Math.round(bmp.height*s));
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;
  const cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,w,h);cx.drawImage(bmp,0,0,w,h);bmp.close();
  const blob=await new Promise(res=>cv.toBlob(res,'image/jpeg',.9));
  if(!blob)throw new Error('encode');
  const url=URL.createObjectURL(blob);
  const g=pdParseName(f.webkitRelativePath||f.name,f.name);
  return {id:'p'+(++PD.seq),name:f.name,path:f.webkitRelativePath||'',src:url,url,w,h,crop:null,fit:'fill',loc:g.loc,desc:g.desc};
}
async function pdAdd(fl){
  const list=[...(fl||[])].filter(f=>/^image\//i.test(f.type)||/\.(jpe?g|png|gif|bmp|webp|heic|heif)$/i.test(f.name));
  if(!list.length){toast('사진이 없습니다');return;}
  /* 806차: 이름이 같고 단계만 다르면 전 → 중 → 후(완료) 순으로 — 가나다순이면 「보수완료」가 「보수전」보다 앞에 온다 */
  const key=n=>String(n).replace(/전(?=[_\-. ]|$)/g,'\u00011').replace(/(중간|중)(?=[_\-. ]|$)/g,'\u00012').replace(/(완료후|완료|후)(?=[_\-. ]|$)/g,'\u00013');
  list.sort((a,b)=>key(a.webkitRelativePath||a.name).localeCompare(key(b.webkitRelativePath||b.name),'ko',{numeric:true}));
  const job={total:list.length,done:0,dead:false};PD.load=job;
  const cnt=()=>{const c=$('#pdCnt');if(c)c.textContent=pdCntText();};cnt();
  const out=new Array(list.length);let k=0,bad=0;
  const work=async()=>{while(k<list.length){const i=k++;try{out[i]=await pdDecode(list[i]);}catch(e){bad++;}job.done++;if(PD.load===job)cnt();}};
  await Promise.all([work(),work(),work()]);
  if(job.dead){out.forEach(p=>p&&pdRevoke(p));return;}   /* 불러오는 사이 초기화했다 */
  if(!PD.site){   /* 800차: 경로·파일 이름에 조직의 현장명이 들어 있으면 머리글 현장명을 채운다(비어 있을 때만) */
    const names=(S.org.sites||[]).map(x=>x.name).filter(Boolean).sort((a,b)=>b.length-a.length);
    const keys=out.filter(Boolean).map(p=>(p.path||p.name)).join(' ').replace(/\s+/g,'');
    const hit=names.find(nm=>keys.includes(nm.replace(/\s+/g,'')));
    if(hit){PD.site=hit;const el=$('#pdSite');if(el)el.value=hit;}
  }
  if(PD.load===job)PD.load=null;
  out.forEach(p=>{if(p)PD.photos.push(p);});
  if(S.view==='photo')pdPages();
  if(bad)toast(bad+'장은 열 수 없어 넣지 않았습니다');
}
function pdDel(){
  if(!PD.sel.size)return;
  PD.photos=PD.photos.filter(p=>{if(PD.sel.has(p.id)){pdRevoke(p);return false;}return true;});
  PD.sel.clear();PD.anchor='';pdPages();
}
function pdResetNow(){
  if(PD.load)PD.load.dead=true;
  PD.photos.forEach(pdRevoke);
  Object.assign(PD,{orient:'por',per:6,title:'사진대지',site:'',photos:[],sel:new Set(),anchor:'',load:null,zoom:'w2',pz:0,page:1,split:false});
  rPhoto();
}
/* ── 끌어 옮기기 — 여러 장을 골라 두었으면 그 묶음째(순서 유지). 놓은 칸의 앞/뒤(가로 반쪽 · 1열이면 세로 반쪽)에 끼워 넣는다 ── */
let _pdDn=null,_pdDrag=null;
function pdDragStart(d){
  if(!PD.sel.has(d.id)){PD.sel=new Set([d.id]);PD.anchor=d.id;pdSelPaint();}
  const ids=PD.photos.filter(p=>PD.sel.has(p.id)).map(p=>p.id),first=PD.photos.find(p=>p.id===d.id);
  const g=document.createElement('div');g.className='phs-ghost';
  g.innerHTML='<img src="'+first.url+'" alt="">'+(ids.length>1?'<em>'+ids.length+'</em>':'');
  const bar=document.createElement('div');bar.className='phs-ins';
  document.body.appendChild(g);document.body.appendChild(bar);
  ids.forEach(id=>{const c=$('#pdView .phs-cell[data-id="'+id+'"]');if(c)c.classList.add('src');});
  document.body.classList.add('phs-dragging');
  _pdDrag={ids,g,bar,slot:null,x:d.x,y:d.y,raf:0};
}
function pdDropCalc(){
  const D=_pdDrag;if(!D)return;
  const el=document.elementFromPoint(D.x,D.y);
  let cell=el&&el.closest&&el.closest('#pdView .phs-cell');
  /* 799차: 쪽 사이 틈·쪽 번호·여백 위에서는 가장 가까운 칸으로 — 아래 끝까지 끌어 자동 스크롤한 뒤 틈에서 놓으면 아무 일도 안 일어났다 */
  if(!cell){const v=$('#pdView'),vr=v&&v.getBoundingClientRect();
    if(vr&&D.x>=vr.left&&D.x<=vr.right&&D.y>=vr.top&&D.y<=vr.bottom){let best=1e9;
      v.querySelectorAll('.phs-cell').forEach(c=>{const r=c.getBoundingClientRect();if(r.bottom<vr.top||r.top>vr.bottom)return;
        const dx=Math.max(r.left-D.x,0,D.x-r.right),dy=Math.max(r.top-D.y,0,D.y-r.bottom),d=dx*dx+dy*dy;if(d<best){best=d;cell=c;}});}}
  if(!cell){D.slot=null;D.bar.style.display='none';return;}
  const n=PD.photos.length,i=Number(cell.dataset.i),r=cell.getBoundingClientRect();
  const horiz=pdCR(PD.per,PD.orient==='land')[0]>1;
  /* 빈 칸은 늘 「그 자리 앞」 — 폴더별 쪽 나누기에서 가운데 빈 칸이 생기므로 뒤/앞을 따지면 엉뚱한 자리로 간다 */
  const after=!cell.dataset.fill&&i<n&&(horiz?D.x>r.left+r.width/2:D.y>r.top+r.height/2);
  D.slot=i>=n?n:(after?i+1:i);
  const st=D.bar.style;st.display='block';
  if(horiz){st.left=((after?r.right:r.left)-2)+'px';st.top=r.top+'px';st.width='3px';st.height=r.height+'px';}
  else{st.left=r.left+'px';st.top=((after?r.bottom:r.top)-2)+'px';st.width=r.width+'px';st.height='3px';}
}
function pdAutoScroll(){
  const D=_pdDrag;if(!D)return;
  const v=$('#pdView');if(!v)return;
  const r=v.getBoundingClientRect(),E=48;
  const dy=D.y<r.top+E?-Math.ceil((r.top+E-D.y)/4):D.y>r.bottom-E?Math.ceil((D.y-(r.bottom-E))/4):0;
  if(dy){v.scrollBy({top:dy,behavior:'instant'});pdDropCalc();}   /* ⚠ [data-sb] 는 scroll-behavior:smooth — 대입하면 매 프레임 애니메이션이 겹쳐 느려진다 */
  D.raf=requestAnimationFrame(pdAutoScroll);
}
function pdDragEnd(cancel){
  const D=_pdDrag;_pdDrag=null;if(!D)return;
  cancelAnimationFrame(D.raf);D.g.remove();D.bar.remove();document.body.classList.remove('phs-dragging');
  if(cancel||D.slot==null){$$('#pdView .phs-cell.src').forEach(c=>c.classList.remove('src'));return;}
  const set=new Set(D.ids),before=PD.photos.slice(0,D.slot).filter(p=>set.has(p.id)).length;
  const moving=PD.photos.filter(p=>set.has(p.id)),rest=PD.photos.filter(p=>!set.has(p.id));
  rest.splice(D.slot-before,0,...moving);
  PD.photos=rest;pdPages();
}
document.addEventListener('pointerdown',e=>{
  if(e.button!==0||!e.target.closest)return;
  if(PD.tool!=='none')return;   /* 846차: 표시를 그리는 중에는 자리 옮기기·고르기를 하지 않는다 */
  if(!e.target.closest('#pdView'))return;
  const cell=e.target.closest('.phs-cell[data-id]');
  if(!cell){if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&PD.sel.size){PD.sel.clear();pdSelPaint();}return;}
  e.preventDefault();
  _pdDn={id:cell.dataset.id,x:e.clientX,y:e.clientY,ctrl:e.ctrlKey||e.metaKey,shift:e.shiftKey,moved:false};
});
document.addEventListener('pointermove',e=>{
  if(!_pdDn)return;
  if(!_pdDn.moved){
    if(Math.hypot(e.clientX-_pdDn.x,e.clientY-_pdDn.y)<5)return;
    _pdDn.moved=true;pdDragStart(_pdDn);_pdDrag.raf=requestAnimationFrame(pdAutoScroll);
  }
  const D=_pdDrag;if(!D)return;
  D.x=e.clientX;D.y=e.clientY;D.g.style.left=(D.x+14)+'px';D.g.style.top=(D.y+14)+'px';
  pdDropCalc();
});
document.addEventListener('pointerup',()=>{
  const d=_pdDn;_pdDn=null;if(!d)return;
  if(d.moved)pdDragEnd(false);else pdClickSel(d.id,d.ctrl,d.shift);
});
document.addEventListener('pointercancel',()=>{if(_pdDn){_pdDn=null;pdDragEnd(true);}});
document.addEventListener('scroll',e=>{if(e.target&&e.target.id==='pdView'){pdPgIndi();pdSbFlash();}},true);
/* ⚠ passive:false 여야 preventDefault 가 먹는다 — 아니면 브라우저 전체가 확대된다 */
document.addEventListener('wheel',e=>{if((e.ctrlKey||e.metaKey)&&e.target.closest&&e.target.closest('#pdView'))pdWheelZoom(e);},{passive:false});
let _pdRT=0;
/* ⚠ 사이드바 자동 접기(705차)도 resize 로 움직인다 — 바로 재면 접히기 전 폭으로 잡힌다. 손이 멈춘 뒤 잰다 */
window.addEventListener('resize',()=>{if(S.view!=='photo')return;clearTimeout(_pdRT);_pdRT=setTimeout(pdZoom,260);});
document.addEventListener('dblclick',e=>{
  const c=e.target.closest&&e.target.closest('#pdView .phs-cell[data-id]');
  if(c)pdCropOpen(c.dataset.id);
});
document.addEventListener('input',e=>{
  const t=e.target;if(!t||!t.dataset||!t.dataset.pd||!t.closest('#pdRoot'))return;
  const k=t.dataset.pd,v=t.value;
  if(k==='title'){PD.title=v;const ls=pdLs(v);$$('#pdView .phs-ttl').forEach(x=>{x.textContent=v;x.style.letterSpacing=ls;x.style.textIndent=ls;});}
  else if(k==='site'){PD.site=v;$$('#pdView .phs-site').forEach(x=>{x.textContent='현장명 : '+v;});}
  else if(k==='loc'||k==='desc'){
    t.removeAttribute('placeholder');
    PD.photos.forEach(p=>{if(!PD.sel.has(p.id))return;p[k]=v;
      const s=$('#pdView .phs-cell[data-id="'+p.id+'"] .phs-'+k);if(s)s.textContent=v;});
  }
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t&&t.id==='pdSwap'){const f=(t.files||[])[0];t.value='';if(f)pdSwap(f);return;}
  if(!t||(t.id!=='pdFiles'&&t.id!=='pdDir'))return;
  const fl=[...(t.files||[])];t.value='';pdAdd(fl);
});
document.addEventListener('keydown',e=>{
  if(S.view!=='photo')return;
  const k=(e.key||'').toLowerCase();
  if((e.ctrlKey||e.metaKey)&&!e.altKey&&k==='p'){e.preventDefault();pdPrint();return;}   /* Ctrl+P 도 사진대지 인쇄로 */
  const t=e.target,typing=t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable);
  if(typing||$('#mo').classList.contains('open')||!PD.sel.size)return;
  if(e.key==='Delete'){e.preventDefault();pdDel();}
  else if(e.key==='Escape'){PD.sel.clear();pdSelPaint();}
});
/* ── 자르기 — 영역은 사진(src) 대비 비율 {x,y,w,h}. 비율 고정이면 끌어도 그 비율을 지킨다 ── */
const PDC_R=[['free','자유'],['cell','칸 비율'],['orig','원본'],['43','4:3'],['11','1:1']];
let PDC=null;
function pdCellRatio(){
  const ph=$('#pdView .phs-ph');
  if(ph&&ph.offsetWidth&&ph.offsetHeight)return ph.offsetWidth/ph.offsetHeight;
  const land=PD.orient==='land',[c,r]=pdCR(PD.per,land),W=land?297:210,H=land?210:297;
  return ((W-20)/c-3)/((H-20-19)/r-12-3);
}
function pdCropOpen(id){
  const p=PD.photos.find(x=>x.id===id);if(!p)return;
  const sc=Math.min(640/p.w,406/p.h),W=Math.round(p.w*sc),H=Math.round(p.h*sc);
  PDC={id,W,H,ratio:'free',R:null,r:p.crop?{...p.crop}:{x:0,y:0,w:1,h:1}};
  const hs=['nw','n','ne','e','se','s','sw','w'],pos={nw:[0,0],n:[50,0],ne:[100,0],e:[100,50],se:[100,100],s:[50,100],sw:[0,100],w:[0,50]};
  const cur={nw:'nwse',se:'nwse',ne:'nesw',sw:'nesw',n:'ns',s:'ns',e:'ew',w:'ew'};
  openModal('사진 자르기',
    '<div class="phs-crop"><div class="phs-cbar"><div class="seg" id="pdcRatio">'
      +PDC_R.map(([k,l])=>'<button class="'+(k==='free'?'act':'')+'" data-act="pd.cropRatio" data-k="'+k+'">'+l+'</button>').join('')
      +'</div><span class="phs-csz" id="pdcSz"></span></div>'
      +'<div class="phs-cstage"><div class="phs-cimg" id="pdcImg" style="width:'+W+'px;height:'+H+'px"><img src="'+p.src+'" alt="" draggable="false">'
      +'<div class="phs-cbox" id="pdcBox" data-h="move">'+hs.map(h=>'<i data-h="'+h+'" style="left:'+pos[h][0]+'%;top:'+pos[h][1]+'%;cursor:'+cur[h]+'-resize"></i>').join('')+'</div></div></div></div>',
    '<button class="btn bg2 bsm" data-act="pd.cropFull">원래대로</button><span class="phs-mfsp"></span>'
      +'<button class="btn bg2 bsm" data-act="modal.close">취소</button><button class="btn bp bsm" data-act="pd.cropApply">적용</button>');
  $('#mb').classList.add('pdcw');
  pdcPaint();
}
function pdcPaint(){
  if(!PDC)return;const b=$('#pdcBox');if(!b)return;
  const {W,H,r}=PDC,p=PD.photos.find(x=>x.id===PDC.id);
  Object.assign(b.style,{left:r.x*W+'px',top:r.y*H+'px',width:r.w*W+'px',height:r.h*H+'px'});
  const sz=$('#pdcSz');if(sz&&p)sz.textContent=Math.round(r.w*p.w).toLocaleString()+' × '+Math.round(r.h*p.h).toLocaleString();
}
/* 비율을 고르면 지금 영역의 가운데를 지키며 그 비율로 사진 안에 들어가는 가장 큰 영역 */
function pdcSetRatio(k){
  if(!PDC)return;const p=PD.photos.find(x=>x.id===PDC.id);if(!p)return;
  PDC.ratio=k;
  PDC.R=k==='cell'?pdCellRatio():k==='orig'?p.w/p.h:k==='43'?4/3:k==='11'?1:null;
  $$('#pdcRatio button').forEach(x=>x.classList.toggle('act',x.dataset.k===k));
  if(PDC.R){
    const {W,H,r}=PDC,cx=(r.x+r.w/2)*W,cy=(r.y+r.h/2)*H;
    let w=W,h=w/PDC.R;if(h>H){h=H;w=h*PDC.R;}
    let x=Math.min(Math.max(0,cx-w/2),W-w),y=Math.min(Math.max(0,cy-h/2),H-h);
    PDC.r={x:x/W,y:y/H,w:w/W,h:h/H};
  }
  pdcPaint();
}
let _pdcDn=null;
document.addEventListener('pointerdown',e=>{
  const t=e.target.closest&&e.target.closest('#pdcBox [data-h],#pdcBox');if(!t||!PDC)return;
  e.preventDefault();e.stopPropagation();
  const {W,H,r}=PDC;
  _pdcDn={h:t.dataset.h||'move',x:e.clientX,y:e.clientY,b:{x1:r.x*W,y1:r.y*H,x2:(r.x+r.w)*W,y2:(r.y+r.h)*H}};
});
document.addEventListener('pointermove',e=>{
  const d=_pdcDn;if(!d||!PDC)return;
  const {W,H,R}=PDC,dx=e.clientX-d.x,dy=e.clientY-d.y,MIN=24;
  let {x1,y1,x2,y2}=d.b;
  if(d.h==='move'){const w=x2-x1,h=y2-y1;x1=Math.min(Math.max(0,x1+dx),W-w);y1=Math.min(Math.max(0,y1+dy),H-h);x2=x1+w;y2=y1+h;}
  else{
    const h=d.h;
    if(h.includes('w'))x1=Math.min(Math.max(0,x1+dx),x2-MIN);
    if(h.includes('e'))x2=Math.max(Math.min(W,x2+dx),x1+MIN);
    if(h.includes('n'))y1=Math.min(Math.max(0,y1+dy),y2-MIN);
    if(h.includes('s'))y2=Math.max(Math.min(H,y2+dy),y1+MIN);
    if(R){
      /* 비율 고정 — 모서리는 가로 기준, 가운데 손잡이는 끈 쪽 기준으로 다른 변을 맞추고, 사진 밖으로 나가면 둘 다 줄인다 */
      let w=x2-x1,hh=y2-y1;
      if(h==='n'||h==='s')w=hh*R;else hh=w/R;
      const ax=h.includes('w')?d.b.x2:h.includes('e')?d.b.x1:(d.b.x1+d.b.x2)/2;
      const ay=h.includes('n')?d.b.y2:h.includes('s')?d.b.y1:(d.b.y1+d.b.y2)/2;
      const maxW=h.includes('w')?ax:h.includes('e')?W-ax:2*Math.min(ax,W-ax);
      const maxH=h.includes('n')?ay:h.includes('s')?H-ay:2*Math.min(ay,H-ay);
      const f=Math.min(1,maxW/w,maxH/hh);w*=f;hh*=f;
      x1=h.includes('w')?ax-w:h.includes('e')?ax:ax-w/2;x2=x1+w;
      y1=h.includes('n')?ay-hh:h.includes('s')?ay:ay-hh/2;y2=y1+hh;
    }
  }
  PDC.r={x:x1/W,y:y1/H,w:(x2-x1)/W,h:(y2-y1)/H};
  pdcPaint();
});
document.addEventListener('pointerup',()=>{_pdcDn=null;});
async function pdcApply(){
  if(!PDC)return;const p=PD.photos.find(x=>x.id===PDC.id);if(!p){closeModal();return;}
  const r=PDC.r,full=r.x<.001&&r.y<.001&&r.w>.999&&r.h>.999;
  if(full){if(p.url!==p.src)URL.revokeObjectURL(p.url);p.url=p.src;p.crop=null;}
  else{
    const img=$('#pdcImg img');
    const sx=Math.round(r.x*p.w),sy=Math.round(r.y*p.h),sw=Math.max(1,Math.round(r.w*p.w)),sh=Math.max(1,Math.round(r.h*p.h));
    const cv=document.createElement('canvas');cv.width=sw;cv.height=sh;cv.getContext('2d').drawImage(img,sx,sy,sw,sh,0,0,sw,sh);
    const blob=await new Promise(res=>cv.toBlob(res,'image/jpeg',.92));
    if(!blob){toast('자르지 못했습니다');return;}
    if(p.url!==p.src)URL.revokeObjectURL(p.url);
    p.url=URL.createObjectURL(blob);p.crop={...r};
  }
  PDC=null;closeModal();pdPages();
}
/* ── 인쇄 — 상단바 인쇄 버튼 · Ctrl+P. 브라우저 인쇄 창의 「PDF로 저장」이 곧 PDF 추출이다 ── */
function pdPrintMount(){
  pdPrintUnmount();
  const box=document.createElement('div');box.id='pdPrint';box.innerHTML=pdPagesHTML(true).html;document.body.appendChild(box);
  const st=document.createElement('style');st.id='pdPageCss';
  const [pw2,ph2]=pdPaperMM();
  st.textContent='@media print{@page{size:'+pw2+'mm '+ph2+'mm;margin:0}#pdPrint .phs-page{width:'+pw2+'mm;height:'+(ph2-.5)+'mm}}';   /* 전역 @page(A4 세로·8mm)보다 뒤에 붙여 이긴다 */
  document.head.appendChild(st);
  document.body.classList.add('phs-printing');
}
function pdPrintUnmount(){
  const b=$('#pdPrint');if(b)b.remove();
  const s=$('#pdPageCss');if(s)s.remove();
  document.body.classList.remove('phs-printing');
}
async function pdPrint(){
  if(_pdDrag)return;
  pdPrintMount();
  await Promise.all([...$$('#pdPrint img')].map(i=>i.decode?i.decode().catch(()=>{}):null));
  let done=false;
  const fin=()=>{if(done)return;done=true;window.removeEventListener('afterprint',fin);pdPrintUnmount();};
  window.addEventListener('afterprint',fin);
  window.print();
  setTimeout(()=>{if(!done)fin();},60000);
}
/* 브라우저 메뉴의 인쇄도 사진대지만 찍히게 */
let _pdAutoPrint=false;
window.addEventListener('beforeprint',()=>{if(S.view==='photo'&&!document.body.classList.contains('phs-printing')){pdPrintMount();_pdAutoPrint=true;}});
window.addEventListener('afterprint',()=>{if(_pdAutoPrint){_pdAutoPrint=false;pdPrintUnmount();}});
Object.assign(ACT,{
  'pd.orient':el=>{if(PD.orient===el.dataset.o)return;PD.orient=el.dataset.o;rPhoto();},
  'pd.zoom':el=>{if(PD.zoom===el.dataset.z)return;const keep=PD.page;PD.zoom=el.dataset.z;rPhoto();PD.page=keep;pdPgGo(0);},   /* 배율을 바꿔도 보던 쪽을 지킨다 */
  'pd.zStep':el=>{const d=Number(el.dataset.d);PD.zoom='free';PD.pz=Math.max(.1,Math.min(4,(PD.pz||1)*(d>0?1.15:1/1.15)));pdZoom();},
  'pd.split':el=>{const on=el.dataset.s==='on';if(PD.split===on)return;PD.split=on;const keep=PD.page;rPhoto();PD.page=keep;pdPgGo(0);},
  'pd.rot':el=>{pdRot(Number(el.dataset.d));},
  'pd.swap':()=>{if(PD.sel.size!==1)return;const i=$('#pdSwap');if(i)i.click();},
  'pd.tool':el=>{PD.tool=el.dataset.t;if(PD.tool!=='none')PD.asel=null;rPdSel();document.body.classList.toggle('pd-drawing',PD.tool!=='none');pdAnnUI();},
  'pd.annColor':el=>{PD.color=el.dataset.c;pdAnnApply({c:PD.color});rPdSel();},
  'pd.annLw':el=>{PD.lw=Number(el.dataset.w);pdAnnApply({w:PD.lw});rPdSel();},
  'pd.annDash':el=>{PD.dash=Number(el.dataset.d);pdAnnApply({d:PD.dash});rPdSel();},
  'pd.annUndo':()=>pdAnnUndo(),
  'pd.xlsx':()=>pdXlsx(),
  'pd.annClear':()=>{PD.photos.forEach(p=>{if(PD.sel.has(p.id)&&(p.ann||[]).length){PD.undo.push({id:p.id,ann:p.ann});p.ann=[];pdAnnPaint(p.id);}});rPdSel();},
  'pd.fillFirst':()=>pdFill('first'),
  'pd.fillBlank':()=>pdFill('blank'),
  'pd.pgGo':el=>pdPgGo(Number(el.dataset.d)),
  'pd.fit':el=>{const f=el.dataset.f;PD.photos.forEach(p=>{if(PD.sel.has(p.id))p.fit=f;});
    $$('#pdView .phs-cell.sel .phs-ph').forEach(x=>{x.classList.remove('contain','cover');if(f!=='fill')x.classList.add(f);});
    $$('#pdRoot [data-act="pd.fit"]').forEach(b=>b.classList.toggle('act',b.dataset.f===f));},
  'pd.per':el=>{const k=Number(el.dataset.k);if(PD.per===k)return;PD.per=k;rPhoto();},
  'pd.files':()=>{const i=$('#pdFiles');if(i)i.click();},
  'pd.dir':()=>{const i=$('#pdDir');if(i)i.click();},
  'pd.reset':()=>{
    /* 814차: 기본값과 같으면 물어보지 않는다 — 808차에 기본이 6장으로 바뀐 뒤에도 4 로 남아 빈 화면에서 확인창이 떴다 */
    if(!PD.photos.length&&!PD.load&&!PD.site&&PD.title==='사진대지'&&PD.per===6&&PD.orient==='por'&&!PD.split)return;
    confirmModal('초기화','사진과 입력한 내용을 모두 지웁니다.',pdResetNow,'초기화');
  },
  'pd.selClear':()=>{PD.sel.clear();pdSelPaint();},
  'pd.del':()=>pdDel(),
  'pd.crop':()=>{if(PD.sel.size===1)pdCropOpen([...PD.sel][0]);},
  'pd.cropRatio':el=>pdcSetRatio(el.dataset.k),
  'pd.cropFull':()=>{if(!PDC)return;PDC.r={x:0,y:0,w:1,h:1};pdcSetRatio('free');},
  'pd.cropApply':()=>{pdcApply();},
});

/* ═══════════ 811차: 업무 도구 — 견적 검토 ═══════════
   업체 산출서의 「산출 근거」 열을 엑셀에서 통째로 복사해 붙여넣으면 줄마다 계산식을 확인한다.
   ⚠ 사진대지와 같이 **이 창 메모리에서만** 처리한다 — 서버·localStorage 어디에도 쓰지 않는다.
   읽는 방식(실제 산출서 기준):
     · 「1. 공용욕실」 처럼 번호가 **1 로 다시 시작하면 다음 세대**. 그 안의 2·3 은 같은 세대의 다른 공간.
     · 「- 타일(벽체)」 는 항목, 그 아래 「 : (1.2*1.2)+(0.6*0.6)=1.8m2」 가 계산식.
     · 식이 길어 「 = 11.1m」 이 다음 줄로 넘어가면 이어 읽는다.
     · 「- 샤워부스 해체 및 설치」(수량 없음)·「 : 조공 0.25인」(계산식 없이 수량만)은 제외로 둔다. */
const QC={txt:'',rows:[],rnd:1,tol:0,filter:'all',ran:false};
const QC_UNIT={'m2':'㎡','M2':'㎡','m²':'㎡','sqm':'㎡'};
function qcRound(v,d){if(d==null||d<0)return v;const m=Math.pow(10,d);return Math.round((v*m).toFixed(6)*1)/m;}
function qcFmt(v){if(v==null||!isFinite(v))return '—';return String(Math.round(v*1e6)/1e6);}
/* 사칙연산·괄호·숫자만 직접 읽어 계산한다.
   ⚠ eval·new Function 은 쓸 수 없다 — 이 앱의 CSP(script-src 'self')가 막는다(실제로 막혀 전부 「읽을 수 없는 줄」이 됐다). */
function qcEval(ex){
  /* 814차: 「1.2㎡ × 1.2㎡ = 1.44㎡」처럼 식 안에 단위가 섞인 표기도 읽는다 — 숫자 뒤 단위 낱말만 걷어낸다 */
  const t=String(ex).replace(/[×xX]/g,'*').replace(/÷/g,'/')
    .replace(/(\d)\s*(㎡|㎥|m2|m3|M2|M3|평|m|M|EA|ea|개|인|본|매|식|㎜|mm|cm|㎝)(?![0-9.])/g,'$1')
    .replace(/\s+/g,'');
  if(!t||!/^[0-9.+\-*/()]+$/.test(t)||!/\d/.test(t))return null;
  let i=0,bad=false;
  const peek=()=>t[i];
  const num=()=>{const s0=i;while(i<t.length&&/[0-9.]/.test(t[i]))i++;const w=t.slice(s0,i);
    if(!/^\d*\.?\d+$|^\d+\.$/.test(w)){bad=true;return 0;}   /* 「1..2」 같은 잘못 적힌 수 */
    const v=parseFloat(w);if(!isFinite(v)){bad=true;return 0;}return v;};
  const atom=()=>{
    if(peek()==='('){i++;const v=expr();if(peek()!==')'){bad=true;return v;}i++;return v;}
    if(peek()==='-'){i++;return -atom();}
    if(peek()==='+'){i++;return atom();}
    if(peek()===undefined||!/[0-9.]/.test(peek())){bad=true;return 0;}
    return num();
  };
  const term=()=>{let v=atom();
    while(!bad&&(peek()==='*'||peek()==='/')){const op=t[i++];const r=atom();
      if(op==='/'&&r===0){bad=true;return 0;}
      v=op==='*'?v*r:v/r;}
    return v;};
  const expr=()=>{let v=term();
    while(!bad&&(peek()==='+'||peek()==='-')){const op=t[i++];const r=term();v=op==='+'?v+r:v-r;}
    return v;};
  const v=expr();
  if(bad||i!==t.length||!isFinite(v))return null;
  return Math.round(v*1e9)/1e9;   /* 0.1+0.2 같은 부동소수 찌꺼기 정리 */
}
/* 836차: 엑셀에서 여러 칸을 한 번에 복사하면 줄바꿈이 사라져 **한 줄로** 들어오는 일이 잦다.
   그런 경우도 읽도록 붙은 줄을 표시 앞에서 끊어 준다 — <산출 근거> · 따옴표 · 「1.」 같은 공간 번호 ·
   「 - 항목」 · 「* 합계」. ⚠ 식 안의 빼기(`(0.7*2.33)-(0.2*0.2)`)는 끊으면 안 되므로 **앞뒤가 공백이고
   뒤에 숫자·괄호가 아닌 글자**가 오는 하이픈만 항목으로 본다. */
function qcNormalize(t){
  let s=String(t||'');
  if((s.match(/\n/g)||[]).length>=Math.max(2,(s.match(/<산출\s*근거>/g)||[]).length))return s;   /* 줄이 이미 나뉘어 있으면 그대로 */
  return s
    .replace(/<산출\s*근거>/g,'\n<산출 근거>\n')
    .replace(/"/g,'\n')
    .replace(/\s+[*★]\s*합계/g,'\n* 합계')
    .replace(/\s+-\s+(?=[^\d(\s])/g,'\n- ')
    .replace(/(^|[^\d.])(\d{1,2})\.\s+(?=[^\d=+*/])/g,'$1\n$2. ')
    .replace(/[ \t]+\n/g,'\n');
}
function qcParse(text){
  const out=[];let unit=0,place='',pend=null,sumMode=false;
  const flush=()=>{
    if(!pend)return;
    const p=pend;pend=null;
    const ex=p.expr.trim();
    const base={no:p.unit,place:p.place,item:p.item.trim(),sum:!!p.sum};
    /* 837차: 「시스템 가구 해체 / 설치」처럼 수량이 안 적힌 항목은 **1식**으로 보고 합계에 넣는다(사용자) */
    if(!ex){out.push({...base,expr:'',calc:1,want:1,u:'식',st:'sk',why:'수량 없음 — 1식으로 봄'});return;}
    const i=ex.lastIndexOf('=');
    const lhs=i<0?ex:ex.slice(0,i),rhs=i<0?ex:ex.slice(i+1);
    const m=rhs.match(/^\s*(-?\d+(?:\.\d+)?)\s*(.*)$/);   /* ⚠ 수량은 = 바로 뒤 · 나머지가 단위 — 끝에서 찾으면 「1.8m2」의 2 를 수량으로 읽는다 */
    const want=m?parseFloat(m[1]):null;
    const ut=((m&&m[2])||'').trim().split(/\s+/)[0]||'';   /* 「=6㎡ 추가메모」처럼 뒤에 글자가 붙으면 첫 토막만 단위로 */
    const u=QC_UNIT[ut]||ut;
    if(i<0){out.push({...base,expr:'',calc:null,want,u,st:'sk',why:'계산식 없이 수량만 적힌 줄'});return;}
    const calc=qcEval(lhs);
    if(calc==null){out.push({...base,expr:lhs.trim(),calc:null,want,u,st:'sk',why:'계산식으로 읽을 수 없는 줄'});return;}
    if(want==null){out.push({...base,expr:lhs.trim(),calc,want:null,u,st:'sk',why:'= 뒤에 수량이 없는 줄'});return;}
    const d=QC.rnd,rc=qcRound(calc,d),rw=qcRound(want,d),diff=qcRound(Math.abs(rc-rw),6);
    const okTol=QC.tol>0&&diff<=QC.tol+1e-9;
    if(rc===rw||okTol){
      const why=okTol&&rc!==rw?('허용 오차 안(차이 '+qcFmt(diff)+')')
        :(calc!==want?('반올림 후 비교('+qcFmt(rc)+' = '+qcFmt(rw)+')'):'');
      out.push({...base,expr:lhs.trim(),calc,want,u,st:'ok',why});
    }else{
      const why='계산값 '+qcFmt(calc)+(calc!==rc?' → '+qcFmt(rc):'')+' · 적힌 값 '+qcFmt(want)
        +' — '+qcFmt(diff)+(rc>rw?' 적음':' 많음');
      out.push({...base,expr:lhs.trim(),calc,want,u,st:'no',why});
    }
  };
  qcNormalize(text).split(/\r?\n/).forEach(raw=>{
    let s=raw.replace(/\t/g,' ').trim();
    s=s.replace(/^"+/,'').replace(/"+$/,'').trim();   /* 엑셀이 여러 줄 칸에 씌우는 따옴표 */
    if(!s)return;
    if(/^<.*>$/.test(s)){flush();sumMode=false;return;}   /* <산출 근거> 같은 머리줄 */
    if(/^[*★•]?\s*합계/.test(s)||/^[*★]\s/.test(s)){flush();sumMode=true;return;}   /* 업체가 적어 둔 「* 합계」 — 우리 합계와 견주기만 한다 */
    /* 828차: 「2.3*0.6=…」 같은 식이 「2.」 로 시작한다고 세대 머리줄로 읽히면 안 된다 — 뒤에 **글자**가 와야 머리줄 */
    let m=s.match(/^(\d{1,3})\s*[.)]\s+([^\d=+*/].*)$/);
    if(m){flush();sumMode=false;if(m[1]==='1')unit++;place=m[2].trim();return;}
    if(/^[-•*·]\s*/.test(s)){
      flush();
      const rest=s.replace(/^[-•*·]\s*/,'');
      const c=rest.indexOf(':');
      pend={unit:unit||1,place:sumMode?'합계':place,item:c<0?rest:rest.slice(0,c),expr:c<0?'':rest.slice(c+1),sum:sumMode};
      return;
    }
    if(/^:/.test(s)){
      if(!pend)pend={unit:unit||1,place:sumMode?'합계':place,item:'',expr:'',sum:sumMode};
      pend.expr+=(pend.expr?' ':'')+s.slice(1);
      return;
    }
    if(/^=/.test(s)&&pend){pend.expr+=' '+s;return;}
    if(pend&&/^[0-9.+\-*/()= ]+$/.test(s)){pend.expr+=' '+s;return;}   /* 식이 여러 줄로 이어진 경우 */
    /* 828차: 「1+1=3」처럼 항목 줄(- …) 없이 식만 적힌 줄도 한 줄로 본다 */
    if(/=/.test(s)&&/^[0-9.+\-*/()=×÷xX ]+$/.test(s.replace(/(㎡|㎥|m2|m3|평|EA|ea|개|인|본|매|식|mm|cm|m|M)/g,''))){
      flush();pend={unit:unit||1,place:sumMode?'합계':place,item:'',expr:s,sum:sumMode};flush();return;
    }
  });
  flush();
  return out;
}
function qcRun(){
  const ta=$('#qcTa');if(ta)QC.txt=ta.value;
  QC.rows=qcParse(QC.txt);QC.ran=true;
  rQc();
  const n=QC.rows.filter(r=>r.st==='no').length;
  toast(QC.rows.length?('검토 완료 — '+QC.rows.length+'줄 중 오답 '+n+'건'):'읽을 수 있는 줄이 없습니다');
}
function qcCount(){return {ok:QC.rows.filter(r=>r.st==='ok').length,no:QC.rows.filter(r=>r.st==='no').length,sk:QC.rows.filter(r=>r.st==='sk').length,
  unit:new Set(QC.rows.map(r=>r.no)).size};}
function qcView(){return (QC.filter==='all'||QC.filter==='sum')?QC.rows:QC.rows.filter(r=>r.st===QC.filter);}
function qcTag(s){return s==='ok'?'<span class="qc-tag ok">정답</span>':s==='no'?'<span class="qc-tag no">오답</span>':'<span class="qc-tag sk">제외</span>';}
/* 833차: 세대별 합계 — 내역서에는 세대마다 그 세대 내역의 합을 **정수로 올려** 적는다.
   단위가 다른 것끼리는 못 더하므로 단위별로 따로 더한다(㎡·m·인 …). 합은 적힌 값 기준,
   계산값 합이 다르면 사유 칸에 같이 적는다. */
/* 834차: 합계는 **항목별**로 낸다(내역서가 항목 단위라). 같은 항목 이름끼리 묶어 적힌 값을 더하고 정수로 올린다. */
function qcSum(no){
  const m={},order=[];
  QC.rows.filter(r=>r.no===no&&r.want!=null&&!r.sum).forEach(r=>{
    const k=(r.item||'(항목 없음)')+'|'+(r.u||'');
    if(!m[k]){m[k]={item:r.item||'(항목 없음)',u:r.u||'',vals:[],calc:0};order.push(k);}
    m[k].vals.push(r.want);m[k].calc+=(r.calc==null?r.want:r.calc);
  });
  return order.map(k=>{const v=m[k],want=qcRound(v.vals.reduce((a,b)=>a+b,0),6);
    /* 835차: 인력 품(조공·다기능공)은 내역서에 소수 그대로 올린다 — 올림하지 않는다(사용자) */
    const noUp=QC_NOUP.test(v.item);
    return {item:v.item,u:v.u,vals:v.vals,want,calc:qcRound(v.calc,6),up:noUp?want:Math.ceil(want-1e-9),noUp};});
}
/* ⚠ 834차: ㎡·㎥ 는 한 글자 활자라 같은 크기로 두면 m 보다 작아 보인다 — m + 위첨자로 조립해 다른 단위와 크기를 맞춘다 */
const QC_NOUP=/조공|다기능공/;
function qcUnit(u){
  if(u==='㎡'||u==='m2')return '<em>m<sup>2</sup></em>';
  if(u==='㎥'||u==='m3')return '<em>m<sup>3</sup></em>';
  return '<em>'+esc(u||'')+'</em>';
}
/* 835차: 엑셀 회계 서식처럼 — 숫자는 오른쪽 끝에 맞추고 단위는 그 오른쪽 고정 칸에 둔다(자릿수가 달라도 세로로 줄이 선다) */
function qcNum(v,u){return '<span class="vw"><span class="nv">'+(v==null?'—':qcFmt(v))+'</span>'+qcUnit(u)+'</span>';}
/* 업체가 산출 근거에 적어 둔 「* 합계」와 우리 합계를 견준다 */
function qcVendorNote(no,x){
  const vend=QC.rows.filter(r=>r.no===no&&r.sum&&r.want!=null);
  const v=vend.find(r=>(r.item||'').replace(/\s/g,'')===(x.item||'').replace(/\s/g,''));
  /* 이름이 안 맞을 때는 **항목도 합계도 하나뿐일 때만** 그 값과 견준다 —
     837차에 「1식」 항목이 늘면서, 이름이 달라도 아무 합계나 끌어다 견주면 죄다 경고가 떴다 */
  const t=v||((vend.length===1&&qcSum(no).filter(y=>y.u!=='식').length===1&&x.u!=='식')?vend[0]:null);
  if(!t)return '';
  return Math.abs(t.want-x.want)<1e-9?'':('⚠ 업체 합계 '+qcFmt(t.want)+(t.u?' '+t.u:''));   /* 같으면 굳이 적지 않는다 */
}
function qcSumRow(no){
  const list=qcSum(no);if(!list.length)return '';
  return list.map((x,i)=>'<tr class="sub'+(i?'':' top')+'">'
    +'<td class="n"></td>'
    +'<td class="pl">'+(i?'':'세대 '+no+' 합계')+'</td>'
    +'<td class="it">'+esc(x.item)+'</td>'
    +'<td class="f">'+esc(x.vals.map(v=>qcFmt(v)).join('+'))+'</td>'
    +'<td class="v">'+qcNum(x.want,x.u)+'</td>'
    +'<td class="v up">'+qcNum(x.up,x.u)+'</td>'
    +'<td class="st"></td>'
    /* 반올림 자리까지 같으면 계산값 합은 적지 않는다 — 줄마다 뜨면 시끄럽다 */
    +'<td class="rs">'+esc([qcRound(x.calc,QC.rnd)!==qcRound(x.want,QC.rnd)?('계산값 합 '+qcFmt(x.calc)):'',qcVendorNote(no,x)].filter(Boolean).join(' · '))+'</td></tr>').join('');
}
/* 838차: 엑셀처럼 칸을 끌어 고르고 복사한다. 칸마다 행·열 번호를 붙여 두고 아래 포인터 처리에서 쓴다. */
function qcCoord(html,r){
  let c=0;
  return html.replace(/<td /g,()=>'<td data-r="'+r+'" data-c="'+(c++)+'" ');
}
/* 만들어진 표 조각에 행 번호를 매긴다 — 줄(tr)마다 열 번호는 0 부터 다시 */
function qcNumberCells(html){
  let r=-1;
  return html.replace(/<tr([^>]*)>([\s\S]*?)<\/tr>/g,(m,attr,body)=>{r++;return '<tr'+attr+'>'+qcCoord(body,r)+'</tr>';});
}
function qcRowsHTML(){
  let h='',cur=null;
  if(QC.filter==='sum'){   /* 837차: 세대 합계 줄만 */
    const nos=[...new Set(QC.rows.map(r=>r.no))];
    nos.forEach(n=>{h+=qcSumRow(n);});
    h=qcNumberCells(h);
    return h||'<tr><td colspan="8" style="padding:22px;text-align:center;color:var(--lbl3)">합계를 낼 줄이 없습니다</td></tr>';
  }
  const all=QC.filter==='all';
  qcView().forEach((r,i)=>{
    const first=r.no!==cur;
    if(all&&first&&cur!==null)h+=qcSumRow(cur);   /* 세대가 바뀌기 직전에 그 세대 합계 */
    cur=r.no;
    h+='<tr class="'+(first?'top ':'')+(r.sum?'vs ':'')+(r.st==='no'?'no':'')+'" data-i="'+i+'">'
      +'<td class="n">'+(first?r.no:'')+'</td>'
      +'<td class="pl">'+esc(r.place||'')+'</td>'
      +'<td class="it">'+esc(r.item||'')+'</td>'
      +'<td class="f">'+esc(r.expr||'—')+'</td>'
      +'<td class="v">'+qcNum(r.calc,r.calc==null?'':r.u)+'</td>'
      +'<td class="v'+(r.st==='no'?' bad':'')+'">'+qcNum(r.want,r.want==null?'':r.u)+'</td>'
      +'<td class="st">'+qcTag(r.st)+'</td>'
      +'<td class="rs">'+esc(r.why||'')+'</td></tr>';
  });
  if(all&&cur!==null)h+=qcSumRow(cur);
  h=qcNumberCells(h);
  return h||'<tr><td colspan="8" style="padding:22px;text-align:center;color:var(--lbl3)">해당하는 줄이 없습니다</td></tr>';
}
function rQc(){
  const root=$('#qcRoot');if(!root)return;
  const c=qcCount();
  /* ⚠ data-act 는 **문자열 그대로** 적는다 — 붙여 만들면 정적 감사가 발신처를 못 찾아 경고한다 */
  const seg=(cur,list,btn)=>'<span class="seg">'+list.map(([k,l])=>btn(k,l,String(cur)===String(k)?' act':'')).join('')+'</span>';
  const segRnd=seg(QC.rnd,[[0,'정수'],[1,'0.0'],[2,'0.00'],[-1,'안 함']],(k,l,a)=>'<button class="'+a.trim()+'" data-act="qc.rnd" data-r="'+k+'">'+l+'</button>');
  const segTol=seg(QC.tol,[[0,'없음'],[0.1,'±0.1'],[0.5,'±0.5']],(k,l,a)=>'<button class="'+a.trim()+'" data-act="qc.tol" data-t="'+k+'">'+l+'</button>');
  const segFil=seg(QC.filter,[['all','전체'],['ok','정답'],['no','오답'],['sk','제외'],['sum','합계']],(k,l,a)=>'<button class="'+a.trim()+'" data-act="qc.filter" data-k="'+k+'">'+l+'</button>');
  root.innerHTML='<div class="qc-grid"><div class="qc-col">'
    +'<div class="card"><div class="tm-h"><span>결과</span></div>'
      +'<div class="qc-sum"><div class="qc-sc ok"><span>정답</span><b>'+(QC.ran?c.ok:'—')+'</b></div>'
      +'<div class="qc-sc no"><span>오답</span><b>'+(QC.ran?c.no:'—')+'</b></div>'
      +'<div class="qc-sc sk"><span>제외</span><b>'+(QC.ran?c.sk:'—')+'</b></div></div></div>'
    +'<div class="card"><div class="tm-h"><span>산출 근거 붙여넣기</span><button class="btn bo bxs" data-act="qc.clear">지우기</button></div>'
      +'<div class="qc-b"><textarea id="qcTa" class="qc-ta" spellcheck="false">'+esc(QC.txt)+'</textarea>'
      +'<button class="qc-run" data-act="qc.run"><svg class="icn" aria-hidden="true"><use href="#i-check"></use></svg>검토</button></div></div>'
    +'<div class="card"><div class="tm-h"><span>기준</span></div><div class="qc-b">'
      +'<div class="qc-fr"><label>반올림</label>'+segRnd+'</div>'
      +'<div class="qc-fr"><label>허용 오차</label>'+segTol+'</div></div></div>'
    +'</div><div class="qc-col qc-right"><div class="tkbar qc-bar"><span class="qc-t">검토 결과'+(QC.ran?'<span>'+c.unit+'세대 · '+QC.rows.length+'줄</span>':'')+'</span>'
      +'<span>'+segFil+'</span></div>'
    +(QC.ran
      ?'<div class="qc-wrap" id="qcWrap"><table class="qc-tbl"><thead><tr><th class="n">NO</th><th class="pl">공간</th><th class="it">항목</th><th>계산식</th>'
        +'<th class="v">계산값</th><th class="v">적힌 값</th><th class="st">판정</th><th class="rs">사유</th></tr></thead><tbody>'+qcRowsHTML()+'</tbody></table></div>'
      :'<div class="qc-empty"><svg class="icn" aria-hidden="true"><use href="#i-paste"></use></svg>'
        +'<p>엑셀의 산출 근거 열을 붙여넣고<br>[검토]를 누르면 줄마다 맞는지 확인합니다.</p></div>')
    +'</div></div>';
  qcFade();
  const w=$('#qcWrap');if(w)ovsAttach(w);   /* 445차 가로 오버레이 막대 — 좁은 화면에서 표가 가로로 넘칠 때 */
}
/* 표 스크롤 — 머리 줄은 붙박이라 페이드·막대 모두 머리 아래에서만(사진대지와 같은 방식) */
function qcFade(){
  const w=$('#qcWrap');if(!w)return;
  const th=w.querySelector('thead');const h=th?th.offsetHeight:0;
  w.style.setProperty('--qh',h+'px');
  const ov=w.scrollHeight>w.clientHeight+2;
  w.classList.toggle('ft',ov&&w.scrollTop>4);
  w.classList.toggle('fb',ov&&w.scrollHeight-w.clientHeight-w.scrollTop>4);
  dwSb(w,'qc-sb',h);   /* 붙박이 머리 줄 아래에서만 */
}
function qcFlash(){qcFade();}
document.addEventListener('scroll',e=>{if(e.target&&e.target.id==='qcWrap')qcFlash();},true);
window.addEventListener('resize',()=>{if(S.view==='qc')qcFade();});
/* 결과 내보내기 — 엑셀에 그대로 붙일 수 있게 탭으로 나눈다 */
function qcTsv(list,cols){
  const head=cols===2?['판정','사유']:['NO','공간','항목','계산식','계산값','적힌 값','판정','사유'];
  const sumLine=no=>qcSum(no).map((x,i)=>[no,(i?'':'세대 '+no+' 합계'),x.item,x.vals.map(v=>qcFmt(v)).join('+'),
    qcFmt(x.want)+(x.u?' '+x.u:''),x.up+(x.u?' '+x.u:''),'',
    Math.abs(x.calc-x.want)>1e-9?('계산값 합 '+qcFmt(x.calc)):''].join('\t')).join('\n');
  const line=r=>{const st=r.st==='ok'?'정답':r.st==='no'?'오답':'제외';
    return cols===2?[st,r.why||''].join('\t')
      :[r.no,r.place||'',r.item||'',r.expr||'',(r.calc==null?'':qcFmt(r.calc))+(r.u?' '+r.u:''),
        (r.want==null?'':qcFmt(r.want))+(r.u?' '+r.u:''),st,r.why||''].join('\t');};
  const body=[];let cur=null;
  list.forEach(r=>{
    if(cols!==2&&cur!==null&&r.no!==cur)body.push(sumLine(cur));
    cur=r.no;body.push(line(r));
  });
  if(cols!==2&&cur!==null)body.push(sumLine(cur));
  return [head.join('\t')].concat(body).join('\n');
}
Object.assign(ACT,{
  'qc.run':()=>qcRun(),
  'qc.clear':()=>{QC.txt='';QC.rows=[];QC.ran=false;rQc();const t=$('#qcTa');if(t)t.focus();},
  'qc.rnd':el=>{const v=Number(el.dataset.r);if(QC.rnd===v)return;QC.rnd=v;if(QC.ran)qcRun0();else rQc();},
  'qc.tol':el=>{const v=Number(el.dataset.t);if(QC.tol===v)return;QC.tol=v;if(QC.ran)qcRun0();else rQc();},
  'qc.filter':el=>{if(QC.filter===el.dataset.k)return;QC.filter=el.dataset.k;rQc();},
});
function qcRun0(){QC.rows=qcParse(QC.txt);rQc();}   /* 기준만 바꿔 다시 판정 — 토스트 없이 */
/* ── 838차: 칸 끌어 고르기(엑셀식) ── */
const QCSEL={on:false,r0:0,c0:0,r1:0,c1:0,drag:false};
function qcCellVal(td){
  const nv=td.querySelector('.nv');
  return (nv?nv.textContent:td.textContent).replace(/\s+/g,' ').trim();
}
function qcSelPaint(){
  const w=$('#qcWrap');if(!w)return;
  w.querySelectorAll('td.selc').forEach(td=>td.classList.remove('selc'));
  if(!QCSEL.on)return;
  const r0=Math.min(QCSEL.r0,QCSEL.r1),r1=Math.max(QCSEL.r0,QCSEL.r1);
  const c0=Math.min(QCSEL.c0,QCSEL.c1),c1=Math.max(QCSEL.c0,QCSEL.c1);
  w.querySelectorAll('td[data-r]').forEach(td=>{
    const r=+td.dataset.r,c=+td.dataset.c;
    if(r>=r0&&r<=r1&&c>=c0&&c<=c1)td.classList.add('selc');
  });
}
function qcSelText(){
  const w=$('#qcWrap');if(!w||!QCSEL.on)return '';
  const rows={};
  w.querySelectorAll('td.selc').forEach(td=>{(rows[+td.dataset.r]=rows[+td.dataset.r]||[]).push([+td.dataset.c,qcCellVal(td)]);});
  return Object.keys(rows).map(Number).sort((a,b)=>a-b)
    .map(r=>rows[r].sort((a,b)=>a[0]-b[0]).map(x=>x[1]).join('\t')).join('\n');
}
function qcSelClear(){QCSEL.on=false;qcSelPaint();}
document.addEventListener('pointerdown',e=>{
  const td=e.target.closest&&e.target.closest('#qcWrap td[data-r]');
  if(!td){if(QCSEL.on&&!(e.target.closest&&e.target.closest('.ctxmenu')))qcSelClear();return;}
  if(e.button!==0)return;
  /* ⚠ 839차: 아래 preventDefault 가 mousedown 을 막아 우클릭 메뉴가 안 닫혔다(메뉴는 mousedown 캡처로 닫는다) — 여기서 직접 닫는다 */
  if(document.querySelector('.ctxmenu'))closeCtx();
  e.preventDefault();
  QCSEL.on=true;QCSEL.drag=true;
  if(e.shiftKey){QCSEL.r1=+td.dataset.r;QCSEL.c1=+td.dataset.c;}
  else{QCSEL.r0=QCSEL.r1=+td.dataset.r;QCSEL.c0=QCSEL.c1=+td.dataset.c;}
  document.body.classList.add('qc-dragging');
  qcSelPaint();
});
document.addEventListener('pointermove',e=>{
  if(!QCSEL.drag)return;
  const td=document.elementFromPoint(e.clientX,e.clientY);
  const cell=td&&td.closest&&td.closest('#qcWrap td[data-r]');
  if(!cell)return;
  QCSEL.r1=+cell.dataset.r;QCSEL.c1=+cell.dataset.c;qcSelPaint();
});
document.addEventListener('pointerup',()=>{if(!QCSEL.drag)return;QCSEL.drag=false;document.body.classList.remove('qc-dragging');});
document.addEventListener('keydown',e=>{
  if(!QCSEL.on)return;
  if(e.key==='Escape'){qcSelClear();return;}
  if((e.ctrlKey||e.metaKey)&&(e.key==='c'||e.key==='C'||e.key==='ㅊ')){
    const t=qcSelText();if(!t)return;
    e.preventDefault();copyText(t,'고른 칸을 복사했습니다');
  }
});
/* 우클릭 — 결과 복사(버튼 대신, 810차 시안대로) */
document.addEventListener('contextmenu',e=>{
  if(!e.target.closest)return;
  const w=e.target.closest('#qcWrap');if(!w||!QC.ran)return;
  const tr=e.target.closest('tbody tr[data-i]');
  e.preventDefault();
  const row=tr?qcView()[Number(tr.dataset.i)]:null;
  const nos=QC.rows.filter(r=>r.st==='no');
  const selN=QCSEL.on?($$('#qcWrap td.selc').length):0;
  openCtx(e.clientX,e.clientY,[
    selN?{label:'고른 칸 복사 ('+selN+'칸)',act:()=>{const t=qcSelText();if(t)copyText(t,'고른 칸을 복사했습니다');}}:null,
    row&&{label:'이 줄 복사',act:()=>copyText(qcTsv([row]).split('\n')[1],'이 줄을 복사했습니다')},
    {label:'오답만 복사'+(nos.length?' ('+nos.length+')':''),act:()=>{if(!nos.length){toast('오답이 없습니다');return;}copyText(qcTsv(nos),'오답 '+nos.length+'줄을 복사했습니다');}},
    {label:'전체 결과 복사',act:()=>copyText(qcTsv(QC.rows),'전체 '+QC.rows.length+'줄을 복사했습니다')},
    {sep:true},
    {label:'판정·사유만 복사(엑셀 2열)',act:()=>copyText(qcTsv(QC.rows,2),'판정·사유를 복사했습니다')},
  ]);
});

/* ═══════════ 815차: 업무 도구 — 도면 인쇄 ═══════════
   DWG 를 그대로 읽어 **도면틀(사각형)마다 한 장**으로 나눠 인쇄한다. ZWCAD 를 열지 않고 뽑기 위한 것.
   ⚠ 사진대지·견적 검토와 같이 이 창 메모리에서만 — 파일은 서버로 올라가지 않는다.
   ⚠ 읽기는 워커(vendor/libredwg/dwg-worker.js)가 한다. 본체에서 부르면 CSP(script-src 'self')가 막는다.
   나누는 방법: ① 도면틀 — 닫힌 네모(축에 나란한) 중 큰 것들. 겹쳐 그린 이중 테두리는 바깥 것만 남긴다.
                ② 틀이 없으면 — 도형이 붙어 있는 덩어리끼리(격자 칠하기 + 이웃 잇기). */
const DW={name:'',polys:[],texts:[],styles:[],ext:null,pages:[],off:new Set(),mode:'auto',used:'',paper:'a3',orient:'auto',lw:true,zoom:'w2',pz:0,page:1,busy:'',stat:null,err:'',worker:null};
let DW_WORKER=null;
const DW_PAPER={a4:[210,297],a3:[297,420]};   /* 816차: 실무에선 A4·A3 면 충분(사용자) */
function dwWorker(){
  if(DW_WORKER)return DW_WORKER;
  const w=new Worker('./vendor/libredwg/dwg-worker.js',{type:'module'});
  w.onmessage=e=>dwLoaded(e.data);
  /* 840차: 왜 안 열렸는지 화면에 남긴다 — 엔진 파일이 배포에 빠진 경우와 도면이 깨진 경우는 손볼 곳이 다르다 */
  w.onerror=e=>{DW.busy='';DW_WORKER=null;
    DW.err='도면 엔진을 불러오지 못했습니다 — vendor/libredwg 파일이 배포에 들어갔는지 확인해 주세요'+(e&&e.message?' ('+e.message+')':'');
    toast('도면 엔진을 불러오지 못했습니다');console.warn('[도면] 워커',e&&e.message);rDwg();};
  DW_WORKER=w;return w;
}
function dwOpen(file){
  if(!file)return;
  DW.busy=file.name;DW.name=file.name;DW.err='';rDwg();
  file.arrayBuffer().then(buf=>{
    /* DWG 는 앞 6글자가 AC10xx(예: AC1032). 아니면 엔진에 넘기기 전에 알려 준다 */
    const head=String.fromCharCode(...new Uint8Array(buf.slice(0,6)));
    if(!/^AC10/.test(head)){DW.busy='';DW.err='DWG 파일이 아닌 것 같습니다(앞머리 '+esc(head.replace(/[^\x20-\x7e]/g,'.'))+'). DXF·PDF 는 아직 읽지 못합니다';toast('DWG 파일이 아닙니다');rDwg();return;}
    dwWorker().postMessage({buf,name:file.name},[buf]);
  }).catch(err=>{DW.busy='';DW.err='파일을 읽지 못했습니다'+(err&&err.message?' ('+err.message+')':'');toast('파일을 열지 못했습니다');rDwg();});
}
function dwLoaded(d){
  DW.busy='';
  if(!d||!d.ok){DW.err='도면을 읽지 못했습니다'+(d&&d.err?' — '+d.err:'');toast('도면을 읽지 못했습니다');rDwg();return;}
  DW.err='';DW._core=null;DW._coreN=-1;DW.polys=d.polys||[];DW.texts=d.texts||[];DW.styles=d.styles||[];DW.ext=d.ext;DW.off=new Set();DW.page=1;
  DW.stat={n:DW.polys.length,t:DW.texts.length,ms:d.ms,skipped:d.skipped,layouts:d.layouts};
  dwSplit();
  toast(DW.pages.length+'장으로 나눴습니다');
  rDwg();
}
/* ── 도면틀 찾기 ── */
/* 도면틀 찾기 — 닫힌 네모 + **선 네 개로 그린 네모**.
   ⚠ 844차: 크기 문턱을 「도면 전체의 몇 %」로 두면, 한 장에 작은 틀이 여러 개 있는 시트(전개도 모음)를
     통째로 놓친다(청라55A형: 가장 큰 네모가 전체의 0.04%). 문턱은 **후보들끼리 견주어** 정한다. */
function dwRects(){
  if(!DW.ext)return [];
  const C=dwCore(),W=C[2]-C[0],H=C[3]-C[1];
  const MINW=W*0.01,MINH=H*0.01;              /* 글자 상자 같은 자잘한 네모는 거른다 */
  const out=[];
  const push=(x0,y0,x1,y1)=>{
    const w=x1-x0,h=y1-y0;
    if(w<MINW||h<MINH)return;
    if(Math.max(w,h)/Math.min(w,h)>8)return;
    out.push([x0,y0,x1,y1]);
  };
  DW.polys.forEach(p=>{
    if(!p.c)return;
    const n=p.p.length/2;if(n<4||n>6)return;
    const w=p.b[2]-p.b[0],h=p.b[3]-p.b[1];
    if(w<=0||h<=0)return;
    /* 축에 나란한 네모인지 — 모든 점이 상자 모서리에 붙어 있어야 한다 */
    const tol=Math.max(w,h)*0.02;let ok=true;
    for(let i=0;i<p.p.length;i+=2){
      const dx=Math.min(Math.abs(p.p[i]-p.b[0]),Math.abs(p.p[i]-p.b[2]));
      const dy=Math.min(Math.abs(p.p[i+1]-p.b[1]),Math.abs(p.p[i+1]-p.b[3]));
      if(dx>tol&&dy>tol){ok=false;break;}
    }
    if(ok)push(p.b[0],p.b[1],p.b[2],p.b[3]);
  });
  /* 선 네 개로 그린 네모 — 같은 x 구간을 덮는 가로선 두 개를 짝지어, 그 양끝을 잇는 세로선이 있는지 본다.
     ⚠ 예전에는 긴 선 40개씩 네 겹으로 돌렸다(O(n⁴)) — 작은 틀은 길이 문턱에 걸려 아예 후보가 못 됐다. */
  const hs=[],vx=new Map();
  DW.polys.forEach(p=>{
    if(p.p.length!==4)return;                /* 선분 하나짜리만 */
    const [x1,y1,x2,y2]=p.p,dx=Math.abs(x2-x1),dy=Math.abs(y2-y1);
    if(dy<=dx*0.002&&dx>=MINW)hs.push({y:(y1+y2)/2,a:Math.min(x1,x2),b:Math.max(x1,x2)});
    else if(dx<=dy*0.002&&dy>=MINH){
      const x=(x1+x2)/2,k=Math.round(x/Math.max(1e-9,MINW*0.2));
      if(!vx.has(k))vx.set(k,[]);
      vx.get(k).push({x,a:Math.min(y1,y2),b:Math.max(y1,y2)});
    }
  });
  const hKey=new Map();
  hs.forEach(h=>{
    const k=Math.round(h.a/Math.max(1e-9,MINW*0.2))+'|'+Math.round(h.b/Math.max(1e-9,MINW*0.2));
    if(!hKey.has(k))hKey.set(k,[]);
    hKey.get(k).push(h);
  });
  const hasV=(x,y0,y1)=>{
    const step=Math.max(1e-9,MINW*0.2),k0=Math.round(x/step);
    for(let k=k0-1;k<=k0+1;k++){
      const list=vx.get(k);if(!list)continue;
      const pad=(y1-y0)*0.08;
      for(const v of list)if(Math.abs(v.x-x)<=Math.max(MINW,(y1-y0))*0.02&&v.a<=y0+pad&&v.b>=y1-pad)return true;
    }
    return false;
  };
  hKey.forEach(list=>{
    if(list.length<2||list.length>40)return;
    list.sort((a,b)=>a.y-b.y);
    for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
      const y0=list[i].y,y1=list[j].y,h=y1-y0;
      if(h<MINH)continue;
      const x0=Math.max(list[i].a,list[j].a),x1=Math.min(list[i].b,list[j].b);
      if(x1-x0<MINW)continue;
      if(hasV(x0,y0,y1)&&hasV(x1,y0,y1))push(x0,y0,x1,y1);
    }
  });
  if(!out.length)return [];
  /* 겹치는 틀 정리 — 이중 테두리(안쪽 여백선)·내부 상세 칸은 바깥 것만 남긴다 */
  out.sort((a,b)=>((b[2]-b[0])*(b[3]-b[1]))-((a[2]-a[0])*(a[3]-a[1])));
  let keep=[];
  out.forEach(r=>{
    const inside=keep.some(k=>r[0]>=k[0]-1&&r[1]>=k[1]-1&&r[2]<=k[2]+1&&r[3]<=k[3]+1);
    if(!inside)keep.push(r);
  });
  /* 후보들끼리 견주어 거른다 — 가장 큰 것의 2% 도 안 되는 네모(치수 칸·글자 상자)는 틀이 아니다 */
  const A=r=>(r[2]-r[0])*(r[3]-r[1]);
  const big=A(keep[0]);
  keep=keep.filter(r=>A(r)>=big*0.02);
  /* 안이 비어 있는 네모도 틀이 아니다 — 도형이 최소 6개는 들어 있어야 한다 */
  const cnt=r=>{let n=0;for(const p of DW.polys){const cx=(p.b[0]+p.b[2])/2,cy=(p.b[1]+p.b[3])/2;
    if(cx>=r[0]&&cx<=r[2]&&cy>=r[1]&&cy<=r[3]){n++;if(n>=6)return n;}}return n;};
  const filled=keep.filter(r=>cnt(r)>=6);
  if(filled.length)keep=filled;
  /* 818차: 도면틀은 보통 **같은 크기가 되풀이된다** — 같은 크기(3% 안) 무리가 후보의 절반을 넘으면 그 무리만 쓴다 */
  if(keep.length>1){
    const grp=[];
    keep.forEach(r=>{
      const w=r[2]-r[0],h=r[3]-r[1];
      const g=grp.find(g=>Math.abs(g.w-w)<=g.w*0.03&&Math.abs(g.h-h)<=g.h*0.03);
      if(g)g.list.push(r);else grp.push({w,h,list:[r]});
    });
    grp.sort((a,b)=>b.list.length-a.list.length||(b.w*b.h)-(a.w*a.h));
    if(grp[0].list.length>1&&grp[0].list.length*2>=keep.length)keep=grp[0].list;
  }
  return keep;
}

/* 843차: 도면 한구석에 **엉뚱한 좌표**로 떨어진 도형이 섞이면(실제 파일에서 ±900만) 범위가 통째로 늘어나
   격자가 무의미해진다(도면 전체가 한 칸에 들어간다) → 도형 중심의 1~99% 를 실제 범위로 본다. 그림은 그대로 그린다. */
function dwCore(){
  if(DW._core&&DW._coreN===DW.polys.length)return DW._core;
  const xs=[],ys=[];
  DW.polys.forEach(p=>{xs.push((p.b[0]+p.b[2])/2);ys.push((p.b[1]+p.b[3])/2);});
  DW.texts.forEach(t=>{xs.push(t.x);ys.push(t.y);});
  if(!xs.length)return DW.ext;
  /* ⚠ 백분위(1~99%)로는 모자란다 — 실제 파일에서 튀는 도형이 1만 3천 개 중 30개(0.2%)였다.
     중앙값에서 얼마나 떨어졌는지(MAD)를 재고, 도형의 97% 가 들어올 때까지 범위를 넓힌다. */
  const med=a=>{const b=a.slice().sort((x,y)=>x-y);return b[b.length>>1];};
  const mx=med(xs),my=med(ys);
  const dx=med(xs.map(v=>Math.abs(v-mx)))||1,dy=med(ys.map(v=>Math.abs(v-my)))||1;
  const n=xs.length;let k=6;
  for(const t of [6,10,20,40,80,200,1000]){
    k=t;let inside=0;
    for(let i=0;i<n;i++)if(Math.abs(xs[i]-mx)<=dx*t&&Math.abs(ys[i]-my)<=dy*t)inside++;
    if(inside>=n*0.97)break;
  }
  let x0=mx-dx*k,x1=mx+dx*k,y0=my-dy*k,y1=my+dy*k;
  /* 그 범위 안에 실제로 들어온 도형들의 상자로 좁힌다(여백 3%) */
  let a0=Infinity,a1=-Infinity,b0=Infinity,b1=-Infinity;
  DW.polys.forEach(p=>{const cx=(p.b[0]+p.b[2])/2,cy=(p.b[1]+p.b[3])/2;
    if(cx<x0||cx>x1||cy<y0||cy>y1)return;
    if(p.b[0]<a0)a0=p.b[0];if(p.b[1]<b0)b0=p.b[1];if(p.b[2]>a1)a1=p.b[2];if(p.b[3]>b1)b1=p.b[3];});
  DW.texts.forEach(t=>{if(t.x<x0||t.x>x1||t.y<y0||t.y>y1)return;
    if(t.x<a0)a0=t.x;if(t.y<b0)b0=t.y;if(t.x>a1)a1=t.x;if(t.y>b1)b1=t.y;});
  const full=DW.ext||[x0,y0,x1,y1];
  if(!isFinite(a0)||a1<=a0||b1<=b0){DW._core=full.slice();DW._coreN=DW.polys.length;return DW._core;}
  const pad=Math.max(a1-a0,b1-b0)*0.03;
  const core=[a0-pad,b0-pad,a1+pad,b1+pad];
  DW._core=core;DW._coreN=DW.polys.length;
  return core;
}
/* ── 틀이 없을 때: 붙어 있는 덩어리끼리 ── */
function dwClusters(){
  if(!DW.ext)return [];
  const N=420,[X0,Y0,X1,Y1]=dwCore(),cw=(X1-X0)/N||1,ch=(Y1-Y0)/N||1;
  const g=new Uint8Array(N*N);
  const put=(x,y)=>{const i=Math.min(N-1,Math.max(0,Math.floor((x-X0)/cw))),j=Math.min(N-1,Math.max(0,Math.floor((y-Y0)/ch)));g[j*N+i]=1;};
  DW.polys.forEach(p=>{const a=p.p;
    for(let k=0;k<a.length;k+=2){put(a[k],a[k+1]);
      if(k){const n=Math.min(200,Math.max(1,Math.ceil(Math.max(Math.abs(a[k]-a[k-2])/cw,Math.abs(a[k+1]-a[k-1])/ch))));
        for(let t=1;t<n;t++)put(a[k-2]+(a[k]-a[k-2])*t/n,a[k-1]+(a[k+1]-a[k-1])*t/n);}}});
  DW.texts.forEach(t=>put(t.x,t.y));
  let cur=g;
  for(let d=0;d<2;d++){const nx=new Uint8Array(N*N);
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){if(!cur[j*N+i])continue;
      for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const a=j+dj,b=i+di;if(a>=0&&a<N&&b>=0&&b<N)nx[a*N+b]=1;}}
    cur=nx;}
  const lab=new Int32Array(N*N).fill(-1),comps=[];let nl=0;
  for(let s=0;s<N*N;s++){
    if(!cur[s]||lab[s]>=0)continue;
    const st=[s];lab[s]=nl;let mnx=N,mny=N,mxx=-1,mxy=-1,cnt=0;
    while(st.length){const q=st.pop(),j=(q/N)|0,i=q%N;cnt++;
      if(i<mnx)mnx=i;if(i>mxx)mxx=i;if(j<mny)mny=j;if(j>mxy)mxy=j;
      for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const a=j+dj,b=i+di;if(a<0||a>=N||b<0||b>=N)continue;
        const t=a*N+b;if(cur[t]&&lab[t]<0){lab[t]=nl;st.push(t);}}}
    comps.push({c:cnt,b:[X0+mnx*cw,Y0+mny*ch,X0+(mxx+1)*cw,Y0+(mxy+1)*ch]});nl++;}
  comps.sort((a,b)=>b.c-a.c);
  const big=comps.filter(c=>c.c>=Math.max(30,comps[0].c*0.02));
  return big.map(c=>c.b);
}
/* 왼쪽 위 → 오른쪽 → 아래 순으로 */
function dwSort(boxes){
  if(!boxes.length)return boxes;
  const h=boxes.reduce((s,b)=>s+(b[3]-b[1]),0)/boxes.length;
  return boxes.slice().sort((a,b)=>{
    const ra=Math.round((-a[3])/(h*0.6)),rb=Math.round((-b[3])/(h*0.6));
    return ra!==rb?ra-rb:a[0]-b[0];
  });
}
function dwSplit(){
  let boxes=[],used='';
  if(DW.mode!=='cluster'){
    const fr=dwRects();
    /* 844차: 자동일 때는 틀이 지나치게 많으면(30장 넘게) 오검출로 보고 덩어리로 간다 — 「도면틀」을 직접 고르면 그대로 쓴다 */
    if(fr.length&&(DW.mode==='frame'||fr.length<=30)){boxes=fr;used='틀';}
  }
  if(!boxes.length&&DW.mode!=='frame'){boxes=dwClusters();if(boxes.length)used='덩어리';}
  if(!boxes.length&&DW.ext){boxes=[dwCore().slice()];used='전체';}
  DW.used=used;
  DW.pages=dwSort(boxes).map(b=>{
    const w=b[2]-b[0],h=b[3]-b[1],pad=Math.max(w,h)*0.01;
    return {b:[b[0]-pad,b[1]-pad,b[2]+pad,b[3]+pad],w,h};
  });
  DW.off=new Set();
}
const dwOn=()=>DW.pages.filter((p,i)=>!DW.off.has(i));
/* ── 한 장 그리기 ── */
const DW_PX=96/25.4;   /* 1mm → px. 선 굵기는 vector-effect:non-scaling-stroke 라 화면·종이에서 같은 두께가 된다 */
function dwStyleCSS(used){
  if(!DW.lw)return '';
  let css='';
  used.forEach(i=>{const st=DW.styles[i];if(!st)return;
    /* ⚠ 바깥 CSS(.dw-svg polyline)와 명시도를 맞춰야 이긴다 — 문서 뒤에 오는 이 규칙이 우선한다 */
    css+='polyline.s'+i+'{stroke-width:'+(Math.round(st.w*DW_PX*100)/100)+'px'
      +(st.d?';stroke-dasharray:'+st.d.split(',').map(n=>Math.round(Number(n)*DW_PX*100)/100).join(','):'')+'}';});
  return css?'<style>'+css+'</style>':'';
}
function dwPageSVG(pg,forPrint){
  const [x0,y0,x1,y1]=pg.b,w=x1-x0,h=y1-y0;
  let d='';const used=new Set();
  DW.polys.forEach(p=>{
    const b=p.b;if(b[2]<x0||b[0]>x1||b[3]<y0||b[1]>y1)return;
    const a=p.p;let s='';
    for(let k=0;k<a.length;k+=2)s+=(k?' ':'')+(Math.round(a[k]*100)/100)+','+(Math.round(a[k+1]*100)/100);
    if(DW.lw&&p.s!=null)used.add(p.s);
    d+='<polyline'+(DW.lw&&p.s!=null?' class="s'+p.s+'"':'')+' points="'+s+'"/>';
  });
  DW.texts.forEach(t=>{
    if(t.x<x0||t.x>x1||t.y<y0||t.y>y1)return;
    /* ⚠ 글자도 도형과 같은 좌표계(y 위로)로 적는다 — 여기서 -y 로 적으면 바깥 group 의 뒤집기와 겹쳐 위아래가 뒤바뀐다 */
    const tx=Math.round(t.x*100)/100,ty=Math.round(t.y*100)/100;
    d+='<text x="'+tx+'" y="'+ty+'" font-size="'+(Math.round(t.h*100)/100)+'"'
      +(t.r?' transform="rotate('+(-t.r)+' '+tx+' '+ty+')"':'')
      +'>'+esc(t.s)+'</text>';
  });
  return '<svg class="dw-svg" viewBox="'+x0+' '+(-y1)+' '+w+' '+h+'" preserveAspectRatio="xMidYMid meet">'
    +dwStyleCSS(used)+'<g class="dw-g" transform="scale(1,-1)">'+d.replace(/<text /g,'<text data-t="1" ')+'</g></svg>';
}
/* 818차: 용지·방향은 **인쇄 한 번에 하나**로 고정한다 — 장마다 다르면 브라우저가 첫 장 기준으로 찍어 나머지가 어긋난다.
   자동이면 장들의 가로세로를 세어 많은 쪽을 따른다. 도면은 그 용지 안에 비율 그대로(contain) 들어간다. */
function dwLand(){
  if(DW.orient==='land')return true;
  if(DW.orient==='por')return false;
  const on=dwOn();if(!on.length)return true;
  let l=0;on.forEach(p=>{if(p.w>=p.h)l++;});
  return l*2>=on.length;
}
function dwPaperMM(){
  const [a,b]=DW_PAPER[DW.paper||'a3']||DW_PAPER.a3;
  return dwLand()?[b,a]:[a,b];
}
function dwPagesHTML(forPrint){
  const list=dwOn();
  if(!list.length)return '';
  const [mw,mh]=dwPaperMM();
  return list.map((pg,i)=>'<div class="dw-pw" data-p="'+(i+1)+'"><div class="dw-page" style="width:'+mw+'mm;height:'+mh+'mm">'
      +dwPageSVG(pg,forPrint)+'</div></div>').join('');
}
function rDwg(){
  const root=$('#dwgRoot');if(!root)return;
  const seg=(cur,list,btn)=>'<span class="seg">'+list.map(([k,l])=>btn(k,l,String(cur)===String(k)?'act':'')).join('')+'</span>';
  const segMode=seg(DW.mode,[['auto','자동'],['frame','도면틀'],['cluster','오브젝트']],(k,l,a)=>'<button class="'+a+'" data-act="dwg.mode" data-m="'+k+'">'+l+'</button>');
  const segPaper=seg(DW.paper||'a3',[['a4','A4'],['a3','A3']],(k,l,a)=>'<button class="'+a+'" data-act="dwg.paper" data-p="'+k+'">'+l+'</button>');
  const segOri=seg(DW.orient,[['auto','자동'],['land','가로'],['por','세로']],(k,l,a)=>'<button class="'+a+'" data-act="dwg.orient" data-o="'+k+'">'+l+'</button>');
  const segLw=seg(DW.lw?'on':'off',[['on','반영'],['off','일정']],(k,l,a)=>'<button class="'+a+'" data-act="dwg.lw" data-w="'+k+'">'+l+'</button>');
  const segZoom=seg(DW.zoom,[['wf','쪽 맞춤'],['w1','폭 맞춤'],['w2','두 쪽'],['wg','여러 쪽']],(k,l,a)=>'<button class="'+a+'" data-act="dwg.zoom" data-z="'+k+'">'+l+'</button>');
  const st=DW.stat;
  const skip=st&&st.skipped?Object.entries(st.skipped).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>k+' '+v).join(' · '):'';
  const list=DW.pages.map((p,i)=>'<label class="dw-pl'+(DW.off.has(i)?' off':'')+'"><input type="checkbox" data-act="dwg.toggle" data-i="'+i+'"'+(DW.off.has(i)?'':' checked')+'>'
    +'<b>'+(i+1)+'</b><span>'+Math.round(p.w)+' × '+Math.round(p.h)+'</span></label>').join('');
  root.innerHTML='<div class="dw-grid"><div class="dw-col">'
    +'<div class="card"><div class="tm-h"><span>도면 파일</span>'+(DW.pages.length?'<button class="btn bo bxs" data-act="dwg.reset">초기화</button>':'')+'</div>'
      +'<div class="dw-b">'
      +(DW.busy?'<div class="dw-load">'+esc(DW.busy)+' 읽는 중…</div>'
        :'<button class="dw-open" data-act="dwg.file"><svg class="icn" aria-hidden="true"><use href="#i-folder"></use></svg>'+(DW.name?'다른 도면 열기':'DWG 열기')+'</button>')
      +(DW.name&&!DW.busy?'<div class="dw-file">'+esc(DW.name)+'</div>':'')
      +(st?'<div class="dw-stat">도형 '+st.n.toLocaleString()+' · 글자 '+st.t.toLocaleString()+'</div>':'')
      +(skip?'<div class="dw-warn">못 그린 것 '+esc(skip)+'</div>':'')
      +(DW.err?'<div class="dw-warn dw-bad">'+esc(DW.err)+'</div>':'')
      +'</div></div>'
    +(DW.pages.length?'<div class="card"><div class="tm-h"><span>기준</span></div>'
      +'<div class="dw-b"><div class="dw-fr"><label>분리</label>'+segMode+'</div>'
      +'<div class="dw-fr"><label>용지</label>'+segPaper+'</div>'
      +'<div class="dw-fr"><label>방향</label>'+segOri+'</div>'
      +'<div class="dw-fr"><label>선</label>'+segLw+'</div></div></div>':'')
    +(DW.pages.length?'<div class="card"><div class="tm-h"><span>목록</span><span class="tm-sub">'+dwOn().length+' / '+DW.pages.length+'장</span></div>'
      +'<div class="dw-list">'+list+'</div></div>':'')
    +'</div><div class="dw-col dw-right"><div class="tkbar dw-bar"><span class="dw-t">미리보기'
      +(DW.pages.length?'<span class="dw-pgn"><button data-act="dwg.pgGo" data-d="-1" aria-label="이전 장" data-tip="이전 장"><svg class="icn" aria-hidden="true"><use href="#i-chevl"></use></svg></button>'
        +'<span class="dw-pgt" id="dwPgt">1 / '+dwOn().length+'</span>'
        +'<button data-act="dwg.pgGo" data-d="1" aria-label="다음 장" data-tip="다음 장"><svg class="icn" aria-hidden="true"><use href="#i-chevr"></use></svg></button></span>':'')+'</span>'
      +(DW.pages.length?'<span class="dw-tools">'+segZoom+'</span>':'')
    +'</div>'
    +(DW.pages.length?'<div class="dw-view" id="dwView">'+dwPagesHTML(false)+'</div>'
      :'<div class="dw-empty"><svg class="icn" aria-hidden="true"><use href="#i-frame"></use></svg>'
       +'<p>DWG 파일을 열면 도면틀마다 한 장으로 나눠<br>미리보기와 인쇄를 할 수 있습니다.</p></div>')
    +'</div></div>'
    +'<input type="file" id="dwgFile" accept=".dwg" hidden>';
  dwZoom();
}
function dwZoom(){
  const v=$('#dwView');if(!v)return;
  v.classList.toggle('z1',DW.zoom==='w1'||DW.zoom==='free');
  v.classList.toggle('zg',DW.zoom==='wg');
  if(!DW.pages.length||!dwOn().length)return;
  const [mw,mh]=dwPaperMM(),W=mw*96/25.4,H=mh*96/25.4;
  const cw=v.clientWidth-24-2,ch=v.clientHeight-24-4;
  let z;
  if(DW.zoom==='free')z=DW.pz||1;
  else if(DW.zoom==='w1')z=Math.min(1,cw/W);
  else if(DW.zoom==='w2')z=dwOn().length<2?Math.min(cw/W,ch/H):Math.min((cw-24)/2/W,ch/H);
  else if(DW.zoom==='wf')z=Math.min(cw/W,ch/H);
  else z=Math.min((cw-3*10)/4/W,.3);
  z=Math.max(.05,Math.min(4,z));DW.pz=z;
  v.style.setProperty('--dz',z.toFixed(3));
  v.classList.remove('vc');if(v.scrollHeight<=v.clientHeight+1)v.classList.add('vc');
  dwSbSync();dwPgIndi();
}
/* 816차: 미리보기 세로 막대 — 사진대지(809차)와 같은 방식. 구를 때만 보이고 0.9초 뒤 사라진다.
   ⚠ 도형을 끌지는 않지만 다른 도구와 손놀림을 맞추려고 클릭은 통과시킨다(pointer-events:none) */
function dwSbSync(){dwSb($('#dwView'),'dw-sb');}
function dwSbFlash(){dwSbSync();}
function dwPgIndi(){
  const v=$('#dwView'),t=$('#dwPgt');if(!v||!t)return;
  const pw=[...v.querySelectorAll('.dw-pw')];if(!pw.length)return;
  const vt=v.getBoundingClientRect().top;let cur=pw[pw.length-1];
  for(const w of pw){if(w.getBoundingClientRect().bottom>vt+12){cur=w;break;}}
  DW.page=Number(cur.dataset.p)||1;
  t.textContent=DW.page+' / '+pw.length;
  const bs=$$('#dwgRoot .dw-pgn button');
  if(bs[0])bs[0].disabled=DW.page<=1;
  if(bs[1])bs[1].disabled=DW.page>=pw.length;
}
function dwPgGo(d){
  const v=$('#dwView');if(!v)return;
  const pw=[...v.querySelectorAll('.dw-pw')];if(!pw.length)return;
  const n=Math.min(pw.length,Math.max(1,DW.page+d)),w=pw[n-1];
  v.scrollTo({top:n===1?0:Math.max(0,v.scrollTop+w.getBoundingClientRect().top-v.getBoundingClientRect().top-12),behavior:'instant'});
  dwPgIndi();
}
document.addEventListener('scroll',e=>{if(e.target&&e.target.id==='dwView'){dwPgIndi();dwSbFlash();}},true);
let _dwRT=0;
window.addEventListener('resize',()=>{if(S.view!=='dwg')return;clearTimeout(_dwRT);_dwRT=setTimeout(dwZoom,260);});
document.addEventListener('wheel',e=>{
  if(!(e.ctrlKey||e.metaKey)||!e.target.closest||!e.target.closest('#dwView'))return;
  e.preventDefault();
  const v=$('#dwView'),r=v.getBoundingClientRect(),before=DW.pz||1;
  const px=(v.scrollLeft+e.clientX-r.left)/before,py=(v.scrollTop+e.clientY-r.top)/before;
  DW.zoom='free';DW.pz=Math.max(.05,Math.min(4,before*Math.pow(1.0015,-e.deltaY)));dwZoom();
  v.scrollTo({left:px*DW.pz-(e.clientX-r.left),top:py*DW.pz-(e.clientY-r.top),behavior:'instant'});
},{passive:false});
/* ── 인쇄 — 사진대지와 같은 방식(#dwPrint 를 붙이고 @page 를 뒤에 끼운다) ── */
function dwPrintMount(){
  dwPrintUnmount();
  const list=dwOn();if(!list.length)return false;
  const box=document.createElement('div');box.id='dwPrint';
  const [mw,mh]=dwPaperMM();
  box.innerHTML=list.map(pg=>'<div class="dw-page" style="width:'+mw+'mm;height:'+mh+'mm">'+dwPageSVG(pg,true)+'</div>').join('');
  document.body.appendChild(box);
  const st=document.createElement('style');st.id='dwPageCss';
  st.textContent='@media print{@page{size:'+mw+'mm '+mh+'mm;margin:0}#dwPrint .dw-page{width:'+mw+'mm;height:'+(mh-.5)+'mm}}';
  document.head.appendChild(st);
  document.body.classList.add('dw-printing');
  return true;
}
function dwPrintUnmount(){
  const b=$('#dwPrint');if(b)b.remove();
  const s=$('#dwPageCss');if(s)s.remove();
  document.body.classList.remove('dw-printing');
}
function dwPrint(){
  if(!dwPrintMount()){toast('인쇄할 장이 없습니다');return;}
  let done=false;
  const fin=()=>{if(done)return;done=true;window.removeEventListener('afterprint',fin);dwPrintUnmount();};
  window.addEventListener('afterprint',fin);
  window.print();
  setTimeout(()=>{if(!done)fin();},60000);
}
let _dwAuto=false;
window.addEventListener('beforeprint',()=>{if(S.view==='dwg'&&!document.body.classList.contains('dw-printing')&&dwPrintMount())_dwAuto=true;});
window.addEventListener('afterprint',()=>{if(_dwAuto){_dwAuto=false;dwPrintUnmount();}});
document.addEventListener('change',e=>{
  const t=e.target;if(!t)return;
  if(t.id==='dwgFile'){const f=(t.files||[])[0];t.value='';if(f)dwOpen(f);return;}
  if(t.dataset&&t.dataset.act==='dwg.toggle'&&t.closest('#dwgRoot')){
    const i=Number(t.dataset.i);if(t.checked)DW.off.delete(i);else DW.off.add(i);
    rDwg();
  }
});
Object.assign(ACT,{
  'dwg.file':()=>{const i=$('#dwgFile');if(i)i.click();},
  'dwg.reset':()=>{DW.polys=[];DW.texts=[];DW.styles=[];DW.ext=null;DW.pages=[];DW.off=new Set();DW.name='';DW.stat=null;DW.err='';DW.page=1;rDwg();},
  'dwg.mode':el=>{if(DW.mode===el.dataset.m)return;DW.mode=el.dataset.m;dwSplit();rDwg();
    toast(DW.pages.length+'장 ('+(DW.used==='틀'?'도면틀 기준':DW.used==='덩어리'?'오브젝트 기준':'전체 1장')+')');},
  'dwg.paper':el=>{if((DW.paper||'a3')===el.dataset.p)return;DW.paper=el.dataset.p;rDwg();},
  'dwg.orient':el=>{if(DW.orient===el.dataset.o)return;DW.orient=el.dataset.o;rDwg();},
  'dwg.lw':el=>{const on=el.dataset.w==='on';if(DW.lw===on)return;DW.lw=on;rDwg();},
  'dwg.zoom':el=>{if(DW.zoom===el.dataset.z)return;const keep=DW.page;DW.zoom=el.dataset.z;rDwg();DW.page=keep;dwPgGo(0);},
  'dwg.pgGo':el=>dwPgGo(Number(el.dataset.d)),
  'dwg.toggle':()=>{},   /* change 위임이 처리한다 */
});

/* 826차: 「오늘」은 따로 둔 단추가 아니라 **지금 달이 아닐 때만** 제목 옆에 나타나는 칩이다.
   평소 머리줄은 아이콘만 남아 깔끔하고, 다른 달을 보는 동안에만 돌아갈 길이 보인다.
   연월 팝업 맨 위의 「오늘로」와 단축키 T 로도 같은 곳으로 간다. */
/* 827차: 연월 제목을 **두 번 누르면** 오늘로. 첫 클릭이 연월 팝업을 열었다 두 번째가 닫으므로,
   여기서는 남은 팝업만 닫고 이동하면 된다. 숨은 길이라 칩·팝업·단축키(T)는 그대로 둔다. */
document.addEventListener('dblclick',e=>{
  const t=e.target.closest&&e.target.closest('.cal-title');
  if(!t)return;
  e.preventDefault();
  closeYMPop();
  ACT['cal.today']();
});
function calTodaySync(){
  const wrap=$('#calTodayWrap');if(!wrap)return;
  const c=CAL?CAL.view.currentStart:new Date(),now=new Date();
  const same=c.getFullYear()===now.getFullYear()&&c.getMonth()===now.getMonth();
  wrap.classList.toggle('off',same);
}
document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  const t=e.target;
  if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable))return;
  if($('#mo')&&$('#mo').classList.contains('open'))return;
  if((e.key==='t'||e.key==='T'||e.key==='ㅅ')&&(S.view==='calendar'||WIDGET)){e.preventDefault();ACT['cal.today']();}
});
/* ═══════════ 848차: 사진대지 → 엑셀(xlsx) 내보내기 ═══════════
   서식까지 담는다: 제목·현장명 줄, 사진 칸(그림 삽입), 위치·내용 줄, 테두리, 쪽 나눔, A4 인쇄 설정.
   ⚠ 지금 쓰는 SheetJS(무료판)는 **그림을 못 넣는다** — xlsx 는 사실 zip 이라 여기서 직접 만든다.
     압축은 하지 않는다(STORE) — 엑셀이 그대로 읽고, 코드가 짧아진다.
   ⚠ 사진 위 표시(네모·원·화살표)는 셀 위에 따로 얹을 수 없으므로 **그림에 구워 넣는다**(canvas). */
const XL_EMU = 9525;                 /* 1px = 9525 EMU */
const XL_DPI = 150;                  /* 그림 해상도 — 150dpi 면 A4 한 장이 또렷하면서 파일이 무겁지 않다 */
const mm2px = mm => mm * 96 / 25.4;  /* 화면 기준 px(엑셀 열 너비·행 높이 환산에 쓴다) */
const mm2pt = mm => mm * 72 / 25.4;
function xlEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function xlCol(n) { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; }

/* ── 작은 ZIP 쓰기(STORE) ── */
const CRC_T = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++)c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[i] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++)c = CRC_T[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zipStore(files) {
  const enc = new TextEncoder(), parts = [], dir = [];
  let off = 0;
  const u16 = n => [n & 255, (n >> 8) & 255], u32 = n => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  files.forEach(f => {
    const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
    const c = crc32(data);
    const h = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
    ...u32(c), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)]);
    parts.push(h, name, data);
    dir.push({ name, c, len: data.length, off });
    off += h.length + name.length + data.length;
  });
  const cd = [];
  let cdLen = 0;
  dir.forEach(d => {
    const h = new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
    ...u32(d.c), ...u32(d.len), ...u32(d.len), ...u16(d.name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(d.off)]);
    cd.push(h, d.name); cdLen += h.length + d.name.length;
  });
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(dir.length), ...u16(dir.length), ...u32(cdLen), ...u32(off), ...u16(0)]);
  return new Blob([...parts, ...cd, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/* ── 한 칸(사진 + 표시)을 그림으로 굽는다 ── */
/* padMM: 사진 둘레에 남길 흰 여백 — 미리보기의 사진 칸 여백과 같게(그림은 칸을 꽉 채우므로 여백을 그림 안에 그린다) */
async function pdBake(ph, wmm, hmm, padMM) {
  const W = Math.round(wmm * XL_DPI / 25.4), H = Math.round(hmm * XL_DPI / 25.4);
  const P = Math.round((padMM || 0) * XL_DPI / 25.4);
  const IW = Math.max(1, W - P * 2), IH = Math.max(1, H - P * 2);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#fff'; cx.fillRect(0, 0, W, H);
  cx.save(); cx.beginPath(); cx.rect(P, P, IW, IH); cx.clip(); cx.translate(P, P);
  const im = new Image(); im.src = ph.url; await im.decode();
  const fit = ph.fit || 'fill';
  if (fit === 'fill') cx.drawImage(im, 0, 0, IW, IH);
  else {
    const s = fit === 'cover' ? Math.max(IW / im.width, IH / im.height) : Math.min(IW / im.width, IH / im.height);
    const w = im.width * s, h = im.height * s;
    cx.drawImage(im, (IW - w) / 2, (IH - h) / 2, w, h);
  }
  cx.restore(); cx.save(); cx.translate(P, P);
  const W0 = W, H0 = H; const _W = IW, _H = IH;
  (ph.ann || []).forEach(a => {
    const X = v => v / 100 * _W, Y = v => v / 100 * _H;
    cx.strokeStyle = a.c || '#E02424';
    cx.lineWidth = Math.max(1, (a.w || 2) * XL_DPI / 96);
    cx.lineCap = a.d ? 'butt' : 'round'; cx.lineJoin = 'round';
    const k = XL_DPI / 96;
    cx.setLineDash(a.d ? PD_DASH.split(',').map(v => Number(v) * k) : []);
    if (a.t === 'rect') { cx.strokeRect(X(Math.min(a.x, a.x2)), Y(Math.min(a.y, a.y2)), X(Math.abs(a.x2 - a.x)), Y(Math.abs(a.y2 - a.y))); return; }
    if (a.t === 'ellipse') {
      cx.beginPath();
      cx.ellipse(X((a.x + a.x2) / 2), Y((a.y + a.y2) / 2), X(Math.abs(a.x2 - a.x)) / 2, Y(Math.abs(a.y2 - a.y)) / 2, 0, 0, Math.PI * 2);
      cx.stroke(); return;
    }
    const x1 = X(a.x), y1 = Y(a.y), x2 = X(a.x2), y2 = Y(a.y2);
    cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.stroke();
    if (a.t === 'arrow') {
      const ang = Math.atan2(y2 - y1, x2 - x1), len = Math.hypot(x2 - x1, y2 - y1);
      const hx = Math.min(_W * .09, Math.max(_W * .035, len * .28)), sp = .42;
      cx.beginPath();
      cx.moveTo(x2 - hx * Math.cos(ang - sp), y2 - hx * Math.sin(ang - sp));
      cx.lineTo(x2, y2);
      cx.lineTo(x2 - hx * Math.cos(ang + sp), y2 - hx * Math.sin(ang + sp));
      cx.stroke();
    }
  });
  cx.restore();
  /* ⚠ 854차: 그림에는 테두리를 그리지 않는다 — 사진 한 칸(사진+위치+내용)의 **바깥 테두리를 굵게** 둘러
     그림에 절반쯤 가려도 남는 두께로 보이게 한다(사용자 예시와 같은 모양). */
  const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', .9));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), W: W0, H: H0 };
}

/* ── 내보내기 ── */
/* 854차: 「사진대지」처럼 짧은 제목은 미리보기와 같이 글자 사이를 띄운다(엑셀에는 자간이 없다) */
function xlTitle(t) {
  const s = String(t || '').trim();
  return s.length && s.length <= 8 ? s.split('').join(' ') : s;
}
async function pdXlsx() {
  if (!PD.photos.length) { toast('넣은 사진이 없습니다'); return; }
  const btn = $('[data-act="pd.xlsx"]'); if (btn) { btn.disabled = true; btn.textContent = '만드는 중…'; }
  try {
    const land = PD.orient === 'land', [C, R] = pdCR(PD.per, land);
    const [pw, ph2] = pdPaperMM(), MG = PD_MG;
    /* 854차(사용자): 위 여백 1.9cm · 꼬리말 1cm. 아래 여백은 꼬리말보다 커야 해서 1.5cm */
    const MGT = 19, MGB = 15, FT = 10;
    const innerW = pw - MG * 2, innerH = ph2 - MGT - MGB - 1;
    const TTL = 12, SITE = 7, CAP = 5.2;                  /* 제목 · 현장명 · 위치/내용 줄 높이(mm) */
    const colW = innerW / C;
    const imgH = (innerH - TTL - SITE - R * CAP * 2) / R;
    /* ⚠ 853차: 엑셀은 열 너비를 「글자 수」로 갖고 있고 그 px 환산이 판·글꼴·화면 배율마다 다르다 —
       우리가 mm 로 맞춰도 MS 엑셀에서는 좁게 잡혀 종이 폭을 다 못 썼다.
       그래서 일부러 **조금 넓게(WIDEN) 잡고 「폭에 맞추기」로 줄인다** — 어느 엑셀에서든 폭을 꽉 채운다.
       세로도 같은 비율로 줄어드니 쪽 높이는 그만큼 여유가 생긴다. */
    const WIDEN = 1.06;
    const colPx = Math.round(mm2px(colW) * WIDEN), imgPx = Math.round(mm2px(imgH) * WIDEN);
    const pages = pdPageList();
    const media = [], anchors = [];
    let rows = '', rowIdx = 0, breaks = [];
    const cellRef = (r, c) => xlCol(c) + (r + 1);
    /* ── 머리(제목·현장명)는 **한 번만** 쓰고 인쇄 제목으로 쪽마다 되풀이한다(사용자) ── */
    rows += `<row r="1" ht="${mm2pt(TTL).toFixed(1)}" customHeight="1"><c r="${cellRef(0, 0)}" s="1" t="inlineStr"><is><t>${xlEsc(xlTitle(PD.title))}</t></is></c></row>`;
    rows += `<row r="2" ht="${mm2pt(SITE).toFixed(1)}" customHeight="1"><c r="${cellRef(1, 0)}" s="2" t="inlineStr"><is><t>현장명 : ${xlEsc(PD.site)}</t></is></c></row>`;
    rowIdx = 2;
    for (let p = 0; p < pages.length; p++) {
      for (let r = 0; r < R; r++) {
        let cs = '';
        for (let c = 0; c < C; c++) cs += `<c r="${cellRef(rowIdx, c)}" s="5"/>`;   /* 854차: 사진 칸 — 굵은 바깥 테두리 */
        rows += `<row r="${rowIdx + 1}" ht="${(imgPx * 72 / 96).toFixed(2)}" customHeight="1">${cs}</row>`;
        const imgRow = rowIdx; rowIdx++;
        for (let c = 0; c < C; c++) {
          const cell = pages[p][r * C + c], photo = cell && cell.ph;
          if (!photo) continue;
          const baked = await pdBake(photo, colW, imgH, 0);
          media.push(baked.bytes);
          anchors.push({ row: imgRow, col: c, id: media.length });
        }
        for (const [key, fld, st] of [['위 치', 'loc', 6], ['내 용', 'desc', 7]]) {
          let t = '';
          for (let c = 0; c < C; c++) {
            const cell = pages[p][r * C + c], photo = cell && cell.ph;
            t += `<c r="${cellRef(rowIdx, c)}" s="${st}" t="inlineStr"><is><t>${key} : ${xlEsc(photo ? (photo[fld] || '') : '')}</t></is></c>`;
          }
          rows += `<row r="${rowIdx + 1}" ht="${mm2pt(CAP).toFixed(1)}" customHeight="1">${t}</row>`;
          rowIdx++;
        }
      }
      if (p < pages.length - 1) breaks.push(rowIdx);
    }
    const mergeList = [`${cellRef(0, 0)}:${cellRef(0, C - 1)}`, `${cellRef(1, 0)}:${cellRef(1, C - 1)}`];
    const cols = `<cols>${Array.from({ length: C }, (_, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.round(((colPx - 5) / 7) * 100) / 100}" customWidth="1"/>`).join('')}</cols>`;
    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
${cols}
<sheetData>${rows}</sheetData>
<mergeCells count="${mergeList.length}">${mergeList.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>
<printOptions horizontalCentered="1"/>
<pageMargins left="${(MG / 25.4).toFixed(3)}" right="${(MG / 25.4).toFixed(3)}" top="${(MGT / 25.4).toFixed(3)}" bottom="${(MGB / 25.4).toFixed(3)}" header="0" footer="${(FT / 25.4).toFixed(3)}"/>
<pageSetup paperSize="9" orientation="${land ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>
<headerFooter><oddFooter>&amp;C&amp;P / &amp;N</oddFooter></headerFooter>
${breaks.length ? `<rowBreaks count="${breaks.length}" manualBreakCount="${breaks.length}">${breaks.map(b => `<brk id="${b}" max="16383" man="1"/>`).join('')}</rowBreaks>` : ''}
<drawing r:id="rId1"/>
</worksheet>`;
    const drawing = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
${anchors.map((an, i) => `<xdr:twoCellAnchor editAs="oneCell">
<xdr:from><xdr:col>${an.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${an.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
<xdr:to><xdr:col>${an.col + 1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${an.row + 1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${i + 1}" name="사진${i + 1}"/><xdr:cNvPicPr/></xdr:nvPicPr>
<xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId${an.id}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
<xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic>
<xdr:clientData/></xdr:twoCellAnchor>`).join('')}
</xdr:wsDr>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<!-- ⚠ 851차: 0번(기본) 글꼴은 Calibri 11 로 둔다 — 엑셀의 **열 너비 단위**가 기본 글꼴의 숫자 너비로 정해져서,
     한글 글꼴을 기본으로 두면 우리가 계산한 mm 와 실제 폭이 어긋난다(칸을 넘거나 쪽이 줄어든다).
     눈에 보이는 칸은 1~3번(맑은 고딕)으로 칠한다. -->
<fonts count="4"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="20"/><name val="맑은 고딕"/></font>
<font><sz val="9"/><name val="맑은 고딕"/></font>
<font><sz val="9"/><name val="맑은 고딕"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="5"><border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>
<!-- 854차: 사진 칸 — 좌·우·위는 굵게, 아래는 얇게 -->
<border><left style="medium"><color rgb="FF000000"/></left><right style="medium"><color rgb="FF000000"/></right><top style="medium"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>
<!-- 위치 줄 — 좌·우 굵게, 위아래 얇게 -->
<border><left style="medium"><color rgb="FF000000"/></left><right style="medium"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>
<!-- 내용 줄 — 좌·우·아래 굵게 -->
<border><left style="medium"><color rgb="FF000000"/></left><right style="medium"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="medium"><color rgb="FF000000"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8">
<xf xfId="0" numFmtId="0" fontId="0" fillId="0" borderId="0"/>
<xf xfId="0" numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf xfId="0" numFmtId="0" fontId="2" fillId="0" borderId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf xfId="0" numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1"/>
<xf xfId="0" numFmtId="0" fontId="3" fillId="0" borderId="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
<xf xfId="0" numFmtId="0" fontId="0" fillId="0" borderId="2" applyBorder="1"/>
<xf xfId="0" numFmtId="0" fontId="3" fillId="0" borderId="3" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
<xf xfId="0" numFmtId="0" fontId="3" fillId="0" borderId="4" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
    const files = [
      { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>` },
      { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>` },
      { name: 'docProps/core.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xlEsc(PD.title)}</dc:title><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0,19)}Z</dcterms:created></cp:coreProperties>` },
      { name: 'docProps/app.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>calapp</Application></Properties>` },
      /* ⚠ 인쇄 제목 — 제목·현장명 두 줄을 쪽마다 되풀이한다(시트에는 한 번만 쓴다) */
      { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="사진대지" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">사진대지!$1:$2</definedName><definedName name="_xlnm.Print_Area" localSheetId="0">사진대지!$A$1:$${'ABCDEFGH'[C-1]}$${rowIdx}</definedName></definedNames></workbook>` },
      { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { name: 'xl/styles.xml', data: styles },
      { name: 'xl/worksheets/sheet1.xml', data: sheet },
      { name: 'xl/worksheets/_rels/sheet1.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>` },
      { name: 'xl/drawings/drawing1.xml', data: drawing },
      { name: 'xl/drawings/_rels/drawing1.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${media.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${i + 1}.jpeg"/>`).join('')}</Relationships>` },
    ];
    media.forEach((m, i) => files.push({ name: `xl/media/image${i + 1}.jpeg`, data: m }));
    const blob = zipStore(files);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (PD.title || '사진대지') + (PD.site ? '_' + PD.site : '') + '_' + todayStr().replace(/-/g, '') + '.xlsx';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast(pages.length + '쪽 · 사진 ' + media.length + '장을 엑셀로 내보냈습니다');
  } catch (err) {
    console.warn('[사진대지] 엑셀', err);
    toast('엑셀로 내보내지 못했습니다');
  } finally {
    const b2 = $('[data-act="pd.xlsx"]'); if (b2) { b2.disabled = false; b2.textContent = '엑셀로 내보내기'; }
  }
}

/* ═══════════ 부팅 ═══════════ */
function rAll(){rDay();rTasks();rOrg();rCfg();rFilter();rTeamSel();refetchCal();rWidget();}   /* 팀 선택기는 조직 화면 밖(사이드바)이라 rAll 에서도 그린다 */
(function boot(){
  if(WIDGET)document.body.classList.add('wid');
  if(WIDGET&&GLASS)document.body.classList.add('glass');
  if(WIDGET)widApply();
  filtLoad();          /* 지난번에 고른 필터를 되살린다(계정별·이 브라우저) */
  LocalStore.init();
  calInit();
  bindCalResize();
  subVisibleMonths();
  rDay();rAcct();rFilter();rTeamSel();rWidget();   /* 팀 선택기는 사이드바 상시 요소 — 부팅 때부터 그린다 */
  if(window.__SNAP_Z__&&dfSnapBoot()){/* 스냅샷 문서 — 하자 화면만 */}
  else if(DEV_LOCAL){hideCover();rDefectNav();setTimeout(morningReview,600);}
  else{
    fbInit();
    /* SDK가 아예 안 뜨거나(사내망 차단 등) 응답이 없으면 안내와 함께 로그인 폼을 연다 */
    if(typeof firebase==='undefined'||!FB.auth){showGateForm();fbMsg('네트워크에 연결할 수 없습니다.');}
    else FB._boot=setTimeout(()=>{if(!S.live)showGateForm();},2500);
  }
  /* 이전 버전에서 등록됐을 수 있는 서비스워커·캐시 제거 —
     캐시가 남아 있으면 배포해도 옛 코드가 계속 뜬다. (한동안 유지 후 삭제해도 됨) */
  /* 서비스워커·캐시는 쓰지 않는다 — 예전에 캐시 때문에 옛 코드가 계속 돌던 사고가 있었다.
     남아 있을 수 있는 등록·캐시를 지운다(PWA 설치용으로 잠시 뒀던 sw.js 도 이 경로로 정리된다) */
  netWatch();   /* 657차: 브라우저 온라인 여부는 로컬 모드에서도 본다 */
  if('serviceWorker' in navigator){
    navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});
    if(window.caches&&caches.keys)caches.keys().then(ks=>ks.forEach(k=>caches.delete(k))).catch(()=>{});
  }
})();
