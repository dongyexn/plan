/* ═══════════════════════════════════════════════════════════════
   H서비스센터 · 일정·업무 공유
   - 디자인·구조 원칙은 하자처리 현황 앱을 따른다 (토큰·컴포넌트 동일)
   - 데이터: 로그인 전 localStorage → 로그인 후 Firebase RTDB(calapp/*) 실시간
   - 같은 origin(GitHub Pages)·같은 Firebase 프로젝트라, 하자처리 현황에
     로그인돼 있으면 세션이 자동 공유되어 이 앱도 곧바로 실시간 모드가 된다.
   ═══════════════════════════════════════════════════════════════ */
'use strict';
const APP_VER='3.2.0';   /* 이 웹앱의 버전. ⚠ 예전엔 위젯 버전과 같은 값으로 묶었으나 위젯이 Lite 로 갈리며 끊었다 — 위젯 버전은 트레이 메뉴에 나온다 */
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
  if(av&&c)av.style.setProperty('--avc',c);
}
document.addEventListener('click',e=>{
  /* 색상환 슬라이더 — 끌 때는 미리보기만, 놓을 때 확정한다(끌 때마다 저장하면 목록이 다시 그려져 팝오버가 사라진다) */
  /* 팝오버에서 고르면 줄에 반영하고 닫는다 */
  const ec=e.target.closest('#colPop .pal-c');
  if(ec&&!ec.classList.contains('pal-add')){
    setPlanColor(ec.dataset.c||'auto');closeColPop();return;
  }
  const pc=e.target.closest('#pfPal .pal-c');
  if(pc&&!pc.classList.contains('pal-add')){PF_SEL.color=pc.dataset.c||'';setTimeout(()=>pfPaint(pc.dataset.c||ownColor((S.user||{}).uid)),0);acctAutoSave();return;}
  /* 팝오버 밖을 누르면 닫는다 — 아바타 버튼 자체는 토글이 처리 */
  const p=$('#pfPop');
  if(p&&p.classList.contains('open')&&!e.target.closest('#pfPop')&&!e.target.closest('[data-act="pf.toggle"]'))
    p.classList.remove('open');
});
document.addEventListener('input',e=>{
  if(e.target.id==='acctName'){acctAutoSave();return;}
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
  const st=team?'background:transparent;box-shadow:inset 0 0 0 1.5px '+esc(c):'background:'+esc(c);
  return pid
    ?'<span class="p-col p-col-ro'+(team?' p-col-team':'')+'" style="'+st+'"></span>'
    :'<button class="p-col'+(team?' p-col-team':'')+'" data-act="plan.color" aria-label="색 고르기" data-tip="색 고르기" style="'+st+'"></button>';
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
  const custom=c&&c!=='auto'&&PAL.indexOf(c)<0?c:'';
  return '<div class="pal" id="'+id+'">'+(extraFirst||'')
    +PAL.map(x=>'<div class="pal-c'+(x===c?' sel':'')+'" data-c="'+x+'" style="background:'+x+'"></div>').join('')
    +(custom?'<div class="pal-c pal-custom sel" data-c="'+esc(custom)+'" style="background:'+esc(custom)+'" data-tip="우클릭으로 삭제"></div>':'')
    +'<label class="pal-c pal-add" data-tip="직접 고르기">'
    +'<input type="color" class="pal-inp" value="'+esc(custom||'#3E71D2')+'"><span>+</span></label>'
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
  return '<div class="'+(cls||'fbu-av')+' av-cus" style="--avc:'+esc(color||ownColor(pid))+'">'
    +avInner(icon)+'</div>';
}
/* 담당자 자동 색 — 명부 순서에 따라 안정적으로 배정 */
const OWN_PAL=['#3E71D2','#16A34A','#D97706','#DC2626','#7C5CD6','#0EA5E9','#DB2777','#65A30D','#EA580C','#0D9488'];
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
/* 완료 업무를 목록에 남겨 두는 기간(일) — 지나면 '지난 완료 N건' 접기 안으로 들어간다.
   ⚠ 미니달력(miniDots)은 이 값과 무관하다 — 거기서는 완료도 계속 점으로 남는다 */
const DONE_KEEP_D=3;
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
  selDate:todayStr(),
  org:{teams:[],regions:[],sites:[]},  // 팀·권역·현장 목록 (모두 {id,name}, 현장은 team·region 포함)
  offdays:{},        // calapp/offdays/<날짜> = 이름 — 단체연차 등 팀 휴무일(공휴일처럼 칠한다)
  people:{},         // calapp/people/{id}: {name,email,team,region} — id는 로그인 uid
  accounts:{},       // users/{uid}: {email,name,role} — 하자처리 현황과 공용
  tasks:{},          // {memberId:{itemId:{text,st,updatedAt}}}
  cfg:{},            // 앱 설정(하자 감춘 현장 등)
  tk:{t:null,m:null},       // 주요업무 현황 탭 선택(팀/권역/담당자)
  tkNewSide:'',      // 새 업무 폼이 열린 카드 — 'a'(팀 업무) · 'b'(담당 업무)
  tkA:'',            // 팀 업무 카드의 탭 — ''(전체) · 'team'(공통) · 담당자 id
  tkB:'',            // 담당 업무 카드의 탭 — ''(전체) · 권역 id · '_none'(권역 미지정)
  filter:{kind:[],st:[],reg:[],own:[],site:[]},  // 달력 필터 — 모두 다중 선택(빈 배열이 '전체')
  foldOpen:{},       // 완료 항목 접힘 해제(subjectId별)
  mineYm:'',         // 내 업무 화면의 작은 달력이 보고 있는 달
  mineSel:'',        // 작은 달력에서 고른 날 — 그 날 업무를 목록에서 강조한다
  rptWeek:'',        // 주요 업무 화면이 보고 있는 주(빈 값이면 이번 주)
  rptReg:'',          // 주요 업무에서 선택된 권역 탭(빈 값이면 첫 번째)
  rptMode:'week',    // 주요 업무 보기 — week(주간 보고) · month(월별 현장)
  rptYm:'',          // 월별 현장 보기가 보고 있는 달(YYYY-MM, 빈 값이면 이번 달)
  tkNew:null,        // 인라인 작성창이 열린 대상
  tkEdit:null,       // 인라인 수정 중인 업무 'sid/iid'
  tkOpen:null,       // 펼쳐 놓은 업무 'sid/iid'
  planEdit:null,     // 일자 패널 인라인 편집기 상태
  dayQ:'',           // 일자 패널 검색어
  dayScope:'day',    // 찾는 범위: day(이 날짜) · month(이 달) · all(전체)
  widPop:false,
  widMore:{com:false,mine:false,hold:false},   // 위젯 내 업무 팝업에서 목록을 펼쳤는지
  holdMine:false,    // 보류함을 내 업무만 보기로 좁혔는지
  dfSid:'',          // 하자 관리에서 보고 있는 현장(비면 대시보드)
  dfFold:{},         // 하자 관리 사이드바에서 접어 둔 권역
  dfTab:'sum',       // 하자 현장 화면의 탭
  dfRm:'',           // 하자 게시본 기준월(YYYY-MM)
  widSide:'',        // 위젯 헤더의 '내 업무' 팝오버 ('' / mine)
  tkF:{q:'',st:[],kind:[],site:[]},   // 업무 목록 검색·필터 — 모두 다중 선택(권역은 카드 탭이 맡는다)
  orgTab:'acct',     // 조직/현장 관리 우측 탭 (acct | site)
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
const PEND={day:false,tasks:false,org:false};
document.addEventListener('focusout',e=>{
  const f=e.target&&e.target.closest&&e.target.closest('[data-act="tk.field"]');
  if(f){
    const sid=f.dataset.sid,iid=f.dataset.iid,cur=(S.tasks[sid]||{})[iid];
    if(cur){
      const v=f.innerText.replace(/\u00a0/g,' ').trim();
      if((cur[f.dataset.f]||'')!==v)store.putTask(sid,iid,{...cur,[f.dataset.f]:v,updatedAt:Date.now()});
    }
  }
  setTimeout(()=>{if(tkHold())return;
  if(PEND.day){PEND.day=false;if(!S.planEdit)rDay();refetchCal();}
  if(PEND.tasks){PEND.tasks=false;if(!S.tkNew&&!S.tkEdit)rTasks();}
  if(PEND.org){PEND.org=false;rOrg();}
},60);});

/* DB 규칙이 스키마 외 키를 거부($other:false)하므로, 저장 전에 필드를 정제한다.
   반복이 아닌 일정에 doneOn/skipOn 이 남아 들어가는 것도 여기서 걸러진다. */
function cleanTask(t){
  const o={text:String(t.text||'').slice(0,500),st:stOf(t.st),stKeep:!!t.stKeep,
    createdAt:Number(t.createdAt)||Date.now(),updatedAt:Number(t.updatedAt)||Date.now()};
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
  if(t.plan)o.plan=String(t.plan).slice(0,2000);
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
function canSetRank(){
  if(!S.live)return true;
  if(isEditor())return true;
  const me=S.user&&roster().find(p=>p.id===S.user.uid);
  return !!me&&(rankOf(me.rank)==='head'||rankOf(me.rank)==='lead');
}
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
      completionDate:String(x.completionDate||'').slice(0,10)}))
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
    S.org=this._d.org;S.tasks=this._d.tasks;S.cfg=this._d.cfg;S.people=this._d.people;S.prefs=this._d.prefs;S.offdays=this._d.offdays;S.accounts={};},
  putPlan(p){const{sid,iid,item,prevSid}=planToTask(p);
    if(prevSid&&prevSid!==sid)this.putTask(prevSid,iid,null);   /* 담당자가 바뀌면 옛 소속에서 지운다 */
    this.putTask(sid,iid,item);},
  delPlan(ym,id){const hit=allTasks().find(x=>x.iid===id);if(hit)this.putTask(hit.sid,hit.iid,null);},
  movePlan(p){this.putPlan(p);},
  putOrg(org){this._d.org=org;S.org=org;lsSave(this._d);},
  putOffday(ds,name){this._d.offdays=this._d.offdays||{};
    if(name)this._d.offdays[ds]=name;else delete this._d.offdays[ds];
    S.offdays=this._d.offdays;lsSave(this._d);calRerender();rDay();rWidget();},
  putPerson(id,p){if(p)this._d.people[id]=p;else delete this._d.people[id];S.people=this._d.people;lsSave(this._d);},
  putTask(mid,iid,item){this._d.tasks[mid]=this._d.tasks[mid]||{};if(item)this._d.tasks[mid][iid]=item;else delete this._d.tasks[mid][iid];S.tasks=this._d.tasks;lsSave(this._d);},
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
  delPlan(ym,id){const hit=allTasks().find(x=>x.iid===id);if(hit)this.putTask(hit.sid,hit.iid,null);},
  movePlan(p){this.putPlan(p);},
  putOrg(org){FB.db.ref('calapp/org').set(cleanOrg(org)).catch(fbErr);},
  putOffday(ds,name){FB.db.ref('calapp/offdays/'+ds)[name?'set':'remove'](name||null).catch(fbErr);},
  putPerson(id,p){const r=FB.db.ref('calapp/people/'+id);(p?r.set(cleanPerson(p)):r.remove()).catch(fbErr);},
  putTask(mid,iid,item){
    /* 서버 응답을 기다리면 한 박자 늦게 반영된다 — 화면에 먼저 반영하고 서버 값이 오면 덮어쓴다.
       실패하면 구독이 원래 값을 되돌려 주므로 화면이 어긋난 채 남지 않는다 */
    S.tasks[mid]=S.tasks[mid]||{};
    if(item)S.tasks[mid][iid]=item;else delete S.tasks[mid][iid];
    rDay();rTasks();refetchCal();rWidget();
    const r=FB.db.ref('calapp/tasks/'+mid+'/'+iid);(item?r.set(cleanTask(item)):r.remove()).catch(fbErr);},
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
    allTasks().forEach(({sid,iid,it})=>{
      if(!it||!it.due)return;
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
    const attach=rm=>{
      if(!rm||rm===ORG_RM)return;
      ORG_RM=rm;
      if(ORG_OFF){ORG_OFF();ORG_OFF=null;}
      const ref=FB.db.ref('report/'+rm+'/_dash');
      const cb=ref.on('value',snap=>{
        const v=snap.val()||{};
        const teams=arrOf(v.teams),sites=arrOf(v.sites);
        if(!teams.length&&!sites.length)return;   /* 빈 게시본이면 사본을 그대로 둔다 */
        ORG_LIVE=true;
        S.org=orgFromDash(teams,sites);
        bootCacheSave();
        /* 읽지 못하는 계정을 위해 사본도 맞춰 둔다(관리자만 쓸 수 있다) */
        if(isEditor())FB.db.ref('calapp/org').set(cleanOrg(S.org)).catch(()=>{});
        if(tkHold()){PEND.org=true;PEND.tasks=true;return;}
        rOrg();rTasks();rTeamSel();rFilter();dfLinkOpen();
      },()=>{ /* 권한 없음 — 사본으로 간다 */ });
      ORG_OFF=()=>{try{ref.off('value',cb);}catch(e){}};
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

    /* ⚠ 팀·권역·현장의 원본은 하자처리 현황이다. 복사해 두지 않고 **그 자리를 그대로 구독**한다 —
       거기서 현장이 바뀌면 이 앱도 즉시 따라간다.
       `calapp/org` 는 **읽지 못하는 계정·오프라인을 위한 사본**으로만 남긴다(관리자가 접속해 있을 때 갱신). */
    this._on('calapp/org',v=>{
      if(ORG_LIVE)return;                       /* 원본을 읽고 있으면 사본은 무시한다 */
      S.org=v||{teams:[],regions:[],sites:[]};normOrg(S.org);bootCacheSave();
      if(tkHold()){PEND.org=true;PEND.tasks=true;return;}
      rOrg();rTasks();dfLinkOpen();});
    this.bindReportOrg();
    this._on('calapp/tasks',v=>{S.tasks=v||{};bootCacheSave();
      /* 첫 스냅샷이 온 뒤 한 번 — 놓친 담당자 업무를 아침 확인으로 묻는다 */
      if(!FB._mrv){FB._mrv=true;setTimeout(morningReview,WIDGET?1400:800);   /* 위젯은 첫 렌더가 조금 늦다 */
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
function fbErr(e){
  console.warn('[FB]',e);
  const c=String((e&&e.code)||'');
  if(/permission|PERMISSION/i.test(c+String(e&&e.message)))
    toast('저장 권한이 없습니다 — Firebase 규칙에 calapp 블록이 반영됐는지 확인하세요');
  else toast('저장 실패 — 네트워크 상태를 확인하세요');
}
/* Firebase 배열 직렬화 보정: 빈 배열은 사라지고 객체로 돌아올 수 있다 */
function normOrg(org){org.teams=arr(org.teams);org.regions=arr(org.regions);org.sites=arr(org.sites);}
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
      <button class="acct-av av-cus av-btn" data-act="pf.toggle" aria-label="아바타 변경" style="--avc:${esc(av.color||ownColor(u.uid))}">
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
function acctTabBody(tab){
  const u=S.user;if(!u)return '';
  const av=avOf(u.uid);
  if(tab==='pw'){
    /* 아바타는 두 탭 공통 — 비밀번호 탭에서도 눌러 바꿀 수 있다 */
    return `${acctHeadHTML()}
      <label class="il">비밀번호 변경</label>
      <input class="inp acct-gap" id="acctPwCur" type="password" autocomplete="current-password" placeholder="현재 비밀번호">
      <input class="inp acct-gap" id="acctPwNew" type="password" autocomplete="new-password" placeholder="새 비밀번호 (6자 이상)">
      <input class="inp acct-gap" id="acctPwNew2" type="password" autocomplete="new-password" placeholder="새 비밀번호 확인">
      <button class="acct-btn acct-btn-primary acct-btn-full" data-act="acct.changePw">비밀번호 변경</button>
      ${emojiPickerHTML(av)}`;
  }
  return `${acctHeadHTML()}
    <label class="il" for="acctName">이름</label>
    <input class="inp" id="acctName" maxlength="60" value="${esc(acctNick())}" placeholder="표시할 이름">
    ${myOrgHTML()}
    ${emojiPickerHTML(av)}`;
}
/* 내 소속 — 팀·직급은 여기서, 권역·담당 현장은 조직 관리에서(양쪽에서 고치면 서로 덮어쓴다) */
function myOrgHTML(){
  const u=S.user;if(!u)return '';
  const me=roster().find(p=>p.id===u.uid)||{};
  const teams=(S.org.teams||[]).filter(t=>t.name);
  const regions=(S.org.regions||[]).filter(r=>r.name);
  const uses=rankUses(me.rank);
  const rk=rankOf(me.rank);
  const canRank=canSetRank();
  return `<div class="myorg">
    <div class="myorg-h">소속</div>
    <div class="myorg-g myorg-g3">
      <div class="myorg-f"><label for="acctTeam">팀</label>
        <select class="inp inp-sm" id="acctTeam" data-act="pf.org">
          <option value="">미배정</option>
          ${teams.map(t=>'<option value="'+esc(t.id)+'"'+(t.id===me.team?' selected':'')+'>'+esc(t.name)+'</option>').join('')}
        </select></div>
      <div class="myorg-f"><label for="acctRank">직급</label>
        ${canRank
          ?'<select class="inp inp-sm" id="acctRank" data-act="pf.org">'
            +RANKS.map(([v,l])=>'<option value="'+v+'"'+(v===rk?' selected':'')+'>'+l+'</option>').join('')+'</select>'
          :'<div class="myorg-fix">'+esc(rankLabel(rk))+'<span>관리자·팀장·공구장만</span></div>'}
      </div>
      <div class="myorg-f"><label for="acctRegion">권역</label>
        ${uses.region
          ?'<select class="inp inp-sm" id="acctRegion" data-act="pf.org"><option value="">미지정</option>'
            +regions.map(r=>'<option value="'+esc(r.id)+'"'+(r.id===me.region?' selected':'')+'>'+esc(r.name)+'</option>').join('')+'</select>'
          :'<div class="myorg-fix">해당 없음<span>'+esc(rankLabel(rk))+'</span></div>'}
      </div>
    </div>
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
  const nameInp=$('#acctName');
  const name=nameInp?nameInp.value.trim().slice(0,60):'';
  const cur=avOf((S.user||{}).uid||'');
  const icon=PF_SEL.icon===null?cur.icon:PF_SEL.icon;
  /* ⚠ 팔레트의 .sel 을 fallback 으로 읽으면, 색을 고른 적 없는 계정이 이름만 고쳐도
     그 순간의 자동 색이 avColor 로 박제된다 — 만진 적 없으면(null) 저장값을 그대로 둔다 */
  const color=PF_SEL.color!==null?PF_SEL.color:cur.color;
  /* 소속(팀·직급)은 조직 데이터(people)라 계정 저장과 별개로 먼저 반영한다 */
  const myUid=(S.user||{}).uid||'';
  const tSel=$('#acctTeam'),rSel=$('#acctRank');
  if(myUid&&(tSel||rSel)){
    const me=roster().find(p=>p.id===myUid)||{};
    const pcur=(S.people||{})[myUid]||{};
    const gSel=$('#acctRegion');
    const rank=rSel?rankOf(rSel.value):rankOf(pcur.rank);
    const uses=rankUses(rank);
    store.putPerson(myUid,{
      name:name||me.name||'',email:String((S.user||{}).email||me.email||'').toLowerCase(),
      team:tSel?tSel.value:(pcur.team||''),
      region:uses.region?(gSel?gSel.value:(pcur.region||'')):'',
      rank,sites:uses.sites?(pcur.sites||{}):{}});
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
function enterLive(u){
  if(S.live)return;
  clearTimeout(FB._boot);clearTimeout(FB._watch);clearTimeout(FB._dbWatch);hideCover();
  S.live=true;S.user=u;store=FbStore;
  /* FB 첫 응답 전까지 마지막 캐시로 먼저 그린다 — 매일 여는 도구의 체감 속도.
     구독 값이 도착하면 그대로 덮어써서 캐시가 화면에 남는 일은 없다. */
  const c=bootCacheLoad();
  if(c){
    S.org=c.org||S.org;normOrg(S.org);
    S.people=c.people||{};S.tasks=c.tasks||{};S.cfg=c.cfg||{};
    S.accounts=c.accounts||{};   /* 마지막으로 알던 지정색으로 즉시 그린다 — 깜빡임 방지 */
    rAll();
  }
  FbStore.bindShared();
  subVisibleMonths();
  rAcct();
}
function exitLive(){
  S.live=false;S.user=null;
  FB._subs.forEach(r=>{try{r.off();}catch(e){}});FB._subs=[];
  store=LocalStore;LocalStore.init();
  subVisibleMonths();rAll();rAcct();
}
/* 팀 이름 줄이기 — 'H서비스중부팀' → '중부'. 앞의 회사·조직 접두와 끝의 '팀'만 떼고 가운데만 쓴다 */
function teamShort(nm){
  const s2=String(nm||'').trim();
  const m=s2.match(/^[A-Za-z가-힣]*?서비스(.+?)팀$/);
  return (m&&m[1])?m[1]:s2;
}
function rTeamSel(){
  const el=$('#teamsel');if(!el)return;
  const teams=(S.org.teams||[]).filter(t=>t.name);
  if(!teams.length){$('#tselWrap').innerHTML='';el.style.display='none';return;}
  el.style.display='';
  if(!teams.some(t=>t.id===S.tk.t))S.tk.t=teams[0].id;
  const opts=teams.map(t=>'<option value="'+esc(t.id)+'"'+(t.id===S.tk.t?' selected':'')+'>'+esc(t.name)+'</option>').join('');
  /* 선택창은 정적 마크업 — 내용만 채운다 */
  const cur=teams.find(t=>t.id===S.tk.t)||teams[0];
  $('#tselWrap').innerHTML='<select id="teamSelEl" aria-label="팀 선택">'+opts+'</select>'
    +'<span class="tsel-ch"><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 3.5l3 3 3-3"/></svg></span>'
    +'<span class="tsel-mini">'+esc(teamShort(cur?cur.name:''))+'</span>';   /* 접었을 때 보이는 줄인 이름 */
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
function evePopShow(force){
  if(!eveOn())return;
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
  let x=r.left+r.width/2-b.width/2;
  x=Math.max(6,Math.min(x,innerWidth-b.width-6));       /* 위젯은 창이 곧 화면 — 넘치면 잘린다 */
  el.style.left=Math.round(x)+'px';
  el.style.top=Math.round(r.bottom+8)+'px';
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
    const sec=(t,key,total)=>'<div class="wl-h">'+esc(t)
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
      +sec('미완료 업무','mine',tasks.length)
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
      +(holds.length?sec('보류한 업무','hold',holds.length)
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
    el.style.setProperty('--avc',a.color||ownColor(S.user.uid));
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
    eventOrder:'-duration,ord,oky,start,allDay,title',
    headerToolbar:false,height:'100%',dayMaxEvents:maxEvOf(),
    moreLinkContent:a=>'외 '+a.num+'건 ›',   /* 234차: 5안(우측 정렬 미니) — 조용하게 오른쪽 끝에 */
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
    dateClick:info=>{S.selEnd='';selDate(String(info.dateStr).slice(0,10));},
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
      const oldYm=ymOf(p.date);const ns=info.event.startStr.slice(0,10);
      if(p.end)p.end=addDays(p.end,daysBetween(p.date,ns));
      p.date=ns;p.updatedAt=Date.now();
      if(oldYm===ymOf(p.date))store.putPlan(p);else store.movePlan(p,oldYm);
      if(!S.live){refetchCal();}
      selDate(p.date);toast('업무 날짜를 옮겼습니다');},
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
    datesSet:()=>{rMonTitle();subVisibleMonths();markSel();}
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
    textColor:team?'':(isLightColor(planColor(p))?'#1B1B1F':'#fff'),
    /* ⚠ display 를 지정하지 않으면 시간이 있는 업무는 FullCalendar 가 '점 형식'으로 그린다 —
       배경 없이 어두운 글자라 유리(어두운) 배경 위에서 거의 보이지 않는다. 전부 색 막대로 통일한다 */
    display:'block',
    classNames:(done?['done']:[]).concat((!team&&isLightColor(planColor(p)))?['on-light']:[]).concat(team?['team']:[]).concat(isRisk(p.kind)?['risk']:[]),
    /* 칸 안 차례 — 공통(0) · 내 업무(1) · 팀장(2) · 나머지(3).
       칸이 넘쳐 '외 N건' 으로 접힐 때 나와 상관 있는 것이 먼저 남는다(eventOrder 참조) */
    extendedProps:{pid:p.id,occ:date,recur:!!(p.recur&&p.recur.f),ord:evOrd(p,team),oky:evOwnKey(p)},
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
  const out=[];
  Object.keys(S.tasks||{}).forEach(sid=>{
    const m=S.tasks[sid]||{};
    Object.keys(m).forEach(iid=>{const it=m[iid];if(it)out.push({sid,iid,it});});
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
    plan:p.plan!==undefined?String(p.plan||''):(base.plan||''),
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
  return{...it,id:iid,sid,title:it.text||'',body:it.prog||it.body||'',
    owners:it.assignees||{},done:stEff(it)===2};
}
/* ⚠ 범위는 **FullCalendar 가 넘겨주는 것**을 먼저 쓴다 — CAL.view 를 읽으면 달을 넘길 때
   뷰 상태가 갱신되기 전에 계산될 수 있고, 그러면 그 달의 반복 회차가 통째로 빠진다.
   인자가 없으면(직접 호출) 지금 보이는 범위로 떨어진다. */
function buildEvents(rFrom,rTo){
  const vr=visibleRange();
  const from=rFrom||vr[0],to=rTo||vr[1];
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
function rMonTitle(){
  if(!CAL)return;const c=CAL.view.currentStart;
  $('#calMonTxt').textContent=(c.getMonth()+1)+'월';
  $('#calYearTxt').textContent=c.getFullYear()+'년';
}
/* 연·월 바로 가기 — 제목을 누르면 뜬다 */
let YM_Y=null;
function ymPickHTML(){
  const c=CAL?CAL.view.currentStart:new Date();
  const cy=YM_Y===null?c.getFullYear():YM_Y;
  const now=new Date(),ty=now.getFullYear(),tm=now.getMonth()+1;
  const sy=c.getFullYear(),sm=c.getMonth()+1;
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
  </div>`;
}
function openYMPick(){
  YM_Y=null;
  const old=$('#ymPop');
  if(old){old.remove();return;}                       /* 다시 누르면 토글 닫기 */
  /* 연·월 버튼이 있는 달력 열 기준으로 붙인다(.cal-card 는 position:relative) */
  const host=$('#view-calendar .cal-card');if(!host)return;
  const pop=document.createElement('div');
  pop.id='ymPop';pop.innerHTML=ymPickHTML();
  const btn2=$('#view-calendar .cal-title');
  if(btn2)pop.style.top=(btn2.offsetTop+btn2.offsetHeight+8)+'px';   /* 연·월 버튼 바로 아래 */
  host.appendChild(pop);
  setTimeout(()=>{document.addEventListener('click',ymOutside,true);},0);
}
function ymOutside(e){
  const pop=$('#ymPop');
  if(!pop){document.removeEventListener('click',ymOutside,true);return;}
  if(pop.contains(e.target)||e.target.closest('.cal-title'))return;   /* 여는 버튼 클릭은 토글이 처리한다 */
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
  const sc=$('#scrim');if(sc)sc.classList.toggle('on',S.dpSheet||$('#sidebar').classList.contains('mob-open'));
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
    if(!raw&&!dayHit((it.text||'')+' '+(it.prog||'')+' '+(it.plan||'')))return;
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
function dayQ(){return String((S.dayQ||'')).trim().toLowerCase();}
function dayHit(txt){const q=dayQ();return !q||String(txt||'').toLowerCase().indexOf(q)>=0;}
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
function rDayHead(){
  const ds=S.selDate,d=toDate(ds),ho=holOf(ds);
  const fmt=x=>{const t=toDate(x);return t.getFullYear()+'. '+(t.getMonth()+1)+'. '+t.getDate()+'.';};
  const dow=$('#dpDow');
  if(S.selEnd){   /* 기간 선택 — 날짜도 요일도 시작 ~ 종료 */
    const e=toDate(S.selEnd);
    $('#dpDate').textContent=fmt(ds)+' ~ '+fmt(S.selEnd);
    if(dow)dow.textContent=DOW[d.getDay()]+' ~ '+DOW[e.getDay()]+'요일';
  }else{
    $('#dpDate').textContent=fmt(ds);
    if(dow)dow.textContent=DOW[d.getDay()]+'요일'+(ho?' · '+ho.n:'')+(ds===todayStr()?' · 오늘':'');
  }
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
    return String(x.p.title||'').localeCompare(String(y.p.title||''),'ko');
  });
}
function rangePlans(){
  const q=dayQ(),sc=S.dayScope||'day';
  /* 검색어가 있고 범위가 '월·전체'면 선택 날짜를 벗어나 찾는다 */
  if(q&&sc!=='day'){
    const ym=ymOf(S.selDate),out=[];
    allTasks().forEach(({sid,iid,it})=>{
      if(!it.date||!taskFilterOk(sid,it))return;
      if(!dayHit((it.text||'')+' '+(it.prog||'')+' '+(it.plan||'')))return;
      if(sc==='month'){
        const s0=it.date,e0=it.end||it.date;
        if(ymOf(s0)>ym||ymOf(e0)<ym)return;   /* 기간이 이 달에 걸치기만 해도 포함 */
      }
      out.push({p:taskAsPlan(sid,iid,it),occ:it.date});
    });
    return sortPlans(out);
  }
  const a=S.selDate,b=S.selEnd||S.selDate;
  if(!S.selEnd)return sortPlans(dayPlans(a));
  const seen={},out=[];
  for(let d=a;d<=b;d=addDays(d,1)){
    dayPlans(d).forEach(x=>{const k=x.p.id+'@'+x.occ;if(seen[k])return;seen[k]=1;out.push(x);});
  }
  return sortPlans(out);
}
/* 펼쳐 보기 — 내용(진행경과·처리계획)과 링크를 읽기 전용으로 보여 준다 */
function planDetHTML(p){
  const sec=(h,v)=>v?'<div class="pd-sec"><div class="pd-h">'+h+'</div><div class="pd-b">'+esc(v)+'</div></div>':'';
  const lnk=Object.values(p.links||{}).filter(l=>l&&l.url);
  const body=kindSplit(p.kind)?sec('진행경과',p.body)+sec('처리계획',p.plan):sec('내용',p.body);
  const links=lnk.length?'<div class="pd-sec"><div class="pd-h">링크</div><div>'
      +lnk.map(l=>'<a class="pd-lnk" data-act="lnk.open" href="'+esc(l.url)+'" target="_blank" rel="noopener"><svg class="icn"><use href="#i-ext"></use></svg>'
        +esc(linkLabel(l))+'</a>').join('')+'</div></div>':'';
  /* 보여 줄 게 없으면 펼침 자체를 만들지 않는다 — 눌러도 아무 일이 없던 헛손질 방지 */
  return (body||links)?'<div class="plan-det">'+body+links+'</div>':'';
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
  if(!ps.length&&!S.planEdit){
    box.innerHTML='<div class="dp-empty">'+(dayQ()?'검색 결과가 없습니다.':'이 날짜에 등록된 업무가 없습니다.')+'</div>';
    rHold();wireHoldDnD();return;}
  /* 폼은 원래 카드가 있던 자리에 그대로 들어간다 — 수정을 눌러도 목록이 위로 튀지 않는다 */
  let slot=false;
  const parts=ps.map(({p,occ})=>{
    if(editingId&&p.id===editingId){slot=true;return '<div id="peSlot"></div>';}
    const done=isDone(p,occ),rep=p.recur&&p.recur.f,span=p.end&&p.end!==p.date,st=planSt(p,occ);
    const md=x=>{const t=toDate(x);return (t.getMonth()+1)+'/'+t.getDate();};
    const lnk=Object.values(p.links||{}).filter(l=>l&&l.url)[0];
    const det=planDetHTML(p);
    const openAct=det?' data-act="plan.open" data-pid="'+esc(p.id)+'" data-occ="'+esc(occ)+'"':'';
    return `
    <div class="plan${done?' done':''}${det?' has-det':''}${det&&S.planOpen===p.id?' open':''}" data-pid="${esc(p.id)}">
      <div class="plan-hd">
        ${colDotHTML(planColor(p),p.id,!planOwners(p).length)}
        <div class="plan-t"${openAct}>${riskMark(p.kind)}${esc(p.title)}</div>
        <div class="plan-side">
          ${lnk?'<a class="p-ico" href="'+esc(lnk.url)+'" target="_blank" rel="noopener" aria-label="링크 열기" data-tip="'+esc(linkLabel(lnk))+'"><svg class="icn"><use href="#i-ext"></use></svg></a>':''}
          ${stIcon(st,' data-act="plan.stCycle" data-pid="'+esc(p.id)+'" data-occ="'+esc(occ)+'"')}
          <button class="p-ico p-edit" data-act="plan.edit" data-pid="${esc(p.id)}" data-occ="${esc(occ)}" aria-label="수정" data-tip="수정"><svg class="icn"><use href="#i-pen"></use></svg></button>
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
  box.innerHTML=(S.planEdit&&!slot?'<div id="peSlot"></div>':'')+parts;
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
  mb.classList.remove('rdw','narrow','mlw','dfwide','wide-pick');   /* ⚠ 지난번 모달의 폭 설정이 남으면 다음 모달이 엉뚱한 크기로 뜬다 */
  mb.classList.toggle('has-x',!footHTML);
  $('#mo').classList.add('open');
}
function closeModal(){mrvHoldRest();$('#mo').classList.remove('open');MODAL_CB=null;pfDrop();}
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
    if(dot)dot.style.background=planColor({color:tn.value,assignees:{}});
    return;
  }
  const pe=S.planEdit;if(!pe||!pe.draft)return;
  pe.draft.color=c;
  const btn=$('#dpEdit .p-col');
  if(btn)btn.style.background=planColor(pe.draft);
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
  }
  const fc=$('#dpFcard');
  if(fc&&fc.classList.contains('adv-on')&&!t.closest('#dpFcard'))fc.classList.remove('adv-on');
  const sd=$('#widSide');
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
  return kindSplit(kind)
    ? `<div class="frow"><label>진행경과</label><textarea class="inp inp-sm" id="peProg" maxlength="2000" placeholder="지금까지의 경과">${esc(d.body||'')}</textarea></div>
       <div class="frow"><label>처리계획</label><textarea class="inp inp-sm" id="pePlan" maxlength="2000" placeholder="앞으로의 계획">${esc(d.plan||'')}</textarea></div>`
    : `<div class="frow"><label>내용</label><textarea class="inp inp-sm" id="peProg" maxlength="2000" placeholder="${esc(kindLabel(kind))} 내용을 적으세요">${esc(d.body||'')}</textarea></div>`;
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
        <div class="frow"><label>업무 구분</label>
          <select class="inp inp-sm" id="peKind">${TK_KIND.map(k=>'<option value="'+k[0]+'"'+(k[0]===kind?' selected':'')+'>'+k[1]+'</option>').join('')}</select></div>
        <div class="frow"><label>담당자</label>${ownSelHTML('peOwners',planOwners(d)[0]||'',people)}</div>
      </div>
      <div class="frow"><label>현장</label>${sitePickHTML('peSite',d.site||'')}</div>
      <div class="pe-morerow">
        <button class="pe-more" data-act="plan.more" id="peMoreBtn" aria-label="자세히"><svg class="icn"><use href="#i-chevr"></use></svg></button>
        ${pe.orig&&pe.orig.sid?'<button class="pe-ic pe-more-ic" data-act="plan.toTask" data-sid="'+esc(pe.orig.sid)+'" data-iid="'+esc(d.id)+'" aria-label="업무 목록에서 자세히 쓰기" data-tip="자세히 쓰기"><svg class="icn"><use href="#i-tasks"></use></svg></button>':''}
      </div>
      <div class="pe-adv" id="peAdv">
        <div class="frow2">
          <div class="frow"><label>시간</label><input type="time" class="inp inp-sm" id="peTime" value="${esc(d.time||'')}"></div>
          <div class="frow"><label>반복</label><select class="inp inp-sm" id="peRec">${Object.keys(REC_LBL).map(k=>'<option value="'+k+'"'+(k===rc?' selected':'')+'>'+REC_LBL[k]+'</option>').join('')}</select></div>
        </div>
        <div class="frow" id="peUntilRow" style="${rc?'':'display:none'}"><label>반복 종료</label><input type="date" class="inp inp-sm" id="peUntil" value="${esc((d.recur&&d.recur.until)||'')}"></div>
        <div class="frow"><label>링크</label><input class="inp inp-sm" id="peLink" maxlength="${LINK_MAX}" placeholder="https://…" value="${esc((lnk&&lnk.url)||'')}"></div>
        <div id="peBodySec">${peBodyHTML(d,kind)}</div>

        ${(pe.orig&&rc&&pe.occ)?`<div class="frow occ-row">
          <label>이 회차만 옮기기 <span style="font-weight:500;color:var(--lbl3)">반복 규칙은 그대로</span></label>
          <div class="occ-line">
            <input type="date" class="inp inp-sm" id="peOcc" value="${esc(pe.occ)}">
            <button class="btn bo bxs" data-act="plan.moveOcc" data-pid="${esc(d.id)}" data-occ="${esc(pe.occ)}">이 회차 옮기기</button>
            ${(d.moveOn&&d.moveOn[occSrc(d,pe.occ)])?'<button class="btn bg2 bxs" data-act="plan.resetOcc" data-pid="'+esc(d.id)+'" data-occ="'+esc(pe.occ)+'">원래대로</button>':''}
          </div>
        </div>`:''}
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
    body:(($('#peProg')&&$('#peProg').value)||'').trim(),
    plan:(($('#pePlan')&&$('#pePlan').value)||'').trim(),
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
  selDate(p.date);
  if(!S.live){refetchCal();rDay();}
}

/* ═══════════ 주요업무 현황 — 좌: 대상 선택 · 우: 작성/목록 ═══════════ */
/* 명부 = 로그인 계정(users) + 이 앱의 팀·권역 배정(calapp/people) */
function roster(){
  /* 로컬 모드는 계정이 없다 — 화면이 비지 않도록 '나' 한 명을 가정한다(이 브라우저 전용) */
  if(!S.live&&!Object.keys(S.people||{}).length)
    return[{id:'me',name:'나',email:'',team:'',region:'',sites:{},rank:'member',role:'editor',acct:false,local:true}];
  const out={};
  Object.keys(S.accounts||{}).forEach(uid=>{
    const a=S.accounts[uid]||{};
    if(a.role==='blocked')return;
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
function taskCount(id){
  const keepDone=String((S.tkF||{}).st)==='2';
  return tkTargetItems(id).filter(({it})=>keepDone||stEff(it)!==2).length;
}
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
/* 작은 달력에서 고른 날에 걸치는 업무인지 — 목록에서 강조하는 데 쓴다 */
function onSelDay(sid,iid,it){
  const d=S.mineSel;if(!d||!it||!it.date)return false;
  if(it.recur&&it.recur.f)return recurDates(taskAsPlan(sid,iid,it),d,d).length>0;
  return d>=it.date&&d<=(it.end||it.date);
}
function taskItemHTML(sid,iid,it,withSubject,hideOwn){
  const key=sid+'/'+iid;
  if(S.tkEdit===key)return taskFormHTML(sid,iid,it);   /* 수정 중이면 항목 자리에 폼이 들어간다 */
  const dsp=taskDate(sid,iid,it);            /* 반복이면 '지금 볼 회차', 아니면 it.date */
  const di=dueInfo(dsp),st=stEff(it);
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
  const dcell=dsp?(span?md(dsp)+'–'+md(it.end):md(dsp)):'';
  /* 제목 뒤에 흐리게 붙는 것 — **가끔만 있는 값**이라 열을 따로 주지 않는다.
     ⚠ 구분은 '일반'이 대부분이라 열로 두면 같은 글자만 반복된다(고위험은 제목 앞 표식이 이미 알린다).
     ⚠ 담당자도 열을 두지 않는다 — 목록이 담당자별로 묶여 있어 소제목과 겹말이다.
     공동 담당(둘 이상)일 때만 나머지 사람을 여기 적는다. */
  const sub=[kindOf(it.kind)?kindLabel(it.kind):'',fmtSpan(it),
    (it.recur&&it.recur.f)?REC_LBL[it.recur.f]:'',
    asg.length?asg.map(x=>x.name).join(', '):(withSubject?subjName(sid):'')].filter(Boolean).join(' · ');
  const go=' data-act="tk.open" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'"';
  return `
  <div class="tk-item s${st}${open?' open':''}${onSelDay(sid,iid,it)?' hl':''}" draggable="true" data-sid="${esc(sid)}" data-iid="${esc(iid)}">
    <div class="tk-row">
      ${colDotHTML(planColor(p0),iid,!planOwners(p0).length)}
      <span class="tk-ttl"${go}>${riskMark(it.kind)}${esc(it.text||'제목 없음')}${sub?'<i class="tk-sub-i">'+esc(sub)+'</i>':''}</span>
      <span class="tkc tkc-s"${go}>${esc(sn)}</span>
      <span class="tkc tkc-d ${esc(di.cls)}"${go}>${esc(dcell)}</span>
      <span class="tk-acts">
        ${lnk?'<a class="tk-ico" href="'+esc(lnk.url)+'" target="_blank" rel="noopener" data-act="lnk.open" aria-label="링크 열기" data-tip="'+esc(linkLabel(lnk))+'"><svg class="icn"><use href="#i-ext"></use></svg></a>':''}
        ${stIcon(st,' data-act="tk.st" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'"')}
        <button class="tk-ico" data-act="tk.edit" data-sid="${esc(sid)}" data-iid="${esc(iid)}" aria-label="수정" data-tip="수정"><svg class="icn"><use href="#i-pen"></use></svg></button>
      </span>
    </div>
    ${open?taskDetailHTML(sid,iid,it):''}
  </div>`;
}
/* 목록 맨 위 열 이름 — 어느 열이 무엇인지 한 번만 알려 준다 */
function tkHeadRowHTML(){
  return '<div class="tk-row tk-hrow"><span></span><span class="tk-ttl">업무</span>'
    +'<span class="tkc tkc-s">현장</span><span class="tkc tkc-d">날짜</span><span class="tk-acts"></span></div>';
}
/* 펼친 업무 — 진행경과·처리계획·링크 (수정 버튼은 위 tk-line 우측 상단) */
function taskDetailHTML(sid,iid,it){
  /* 비어 있는 칸은 그리지 않는다 — 펼쳐 보기만 할 때 빈 상자가 자리를 먹는다 */
  const box=(lbl,val,field)=>!String(val||'').trim()?'':`<div class="tk-sec">
      <div class="tk-sec-h">${lbl}</div>
      <div class="tk-sec-b" contenteditable="true" data-act="tk.field" data-f="${field}" data-sid="${esc(sid)}" data-iid="${esc(iid)}"
        data-ph="${lbl}를 입력하세요">${esc(val||'')}</div>
    </div>`;
  const lnk=Object.entries(it.links||{});
  const split=kindSplit(it.kind);
  return `<div class="tk-detail">
    ${split?'<div class="tk-secs">'+box('진행경과',it.prog||it.body,'prog')+box('처리계획',it.plan,'plan')+'</div>'
      :box('내용',it.prog||it.body,'prog')}
    ${lnk.length?`<div class="tk-sec">
      <div class="tk-sec-h">링크</div>
      <div class="tk-links">${lnk.map(([k,l])=>'<a class="tk-link" href="'+esc(l.url)+'" target="_blank" rel="noopener">'
        +'<svg class="icn"><use href="#i-ext"></use></svg>'
        +'<span>'+esc(linkLabel(l))+'</span></a>').join('')}</div>
    </div>`:''}
  </div>`;
}
/* 한 대상(팀 공통 또는 담당자 한 명)의 목록.
   ⚠ id 는 '보는 대상'이고 저장 위치가 아니다 — 항목은 제 sid 로 그린다(수정·삭제 경로가 그 값이다) */
function taskListHTML(id){
  const all=tkTargetItems(id);
  const ord=x=>Number.isFinite(Number(x.it.order))?Number(x.it.order):(x.it.createdAt||0)/1e10;
  all.sort((a,b)=>ord(a)-ord(b)||(a.it.createdAt||0)-(b.it.createdAt||0));
  if(!all.length)return '<div class="tk-empty">'
    +(tkFilterOn()?'조건에 맞는 업무가 없습니다.':'등록된 업무가 없습니다. 위의 <b>업무 추가</b>를 누르세요.')+'</div>';
  const cut=Date.now()-DONE_KEEP_D*86400000;
  const isOld=x=>stOf(x.it.st)===2&&(x.it.updatedAt||0)<cut;
  const old=tkFilterOn()?[]:all.filter(isOld);
  const open=S.foldOpen[id];
  const shown=open?all:all.filter(x=>!isOld(x));
  const hideOwn=(S.org.teams||[]).some(t=>t.id===id)?'':id;   /* 개인 목록이면 본인 배지는 겹말 */
  return shown.map(x=>taskItemHTML(x.sid,x.iid,x.it,false,hideOwn)).join('')
    +(old.length?`<div class="tk-fold" data-act="tk.fold" data-sid="${esc(id)}">${open?'▲ 지난 완료 '+old.length+'건 접기':'▼ 지난 완료 '+old.length+'건 보기'}</div>`:'');
}
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
/* ── 집계 보기 보조 — 미완료만, 기한순 ── */
/* ── 한 대상(팀 또는 담당자)의 업무 모으기 ──
   ⚠ **저장 위치(sid)가 아니라 배정(assignees)으로 모은다.** 업무는 팀 가방에도, 첫 담당자 uid 가방에도
   저장되는데(planToTask·taskFormSave), 예전처럼 그 사람 가방만 보면 목록에서 통째로 빠졌다
   — 업무 목록 화면에서 담당자를 지정해 만든 업무가 정확히 그런 경우다.
   · 팀 id  → 그 팀 가방의 **담당자 없는(공통)** 업무
   · 담당자 → 모든 가방에서 assignees 에 그 사람이 있는 업무
   ⚠ 공동 담당이면 두 사람 목록에 함께 나온다(의도) */
function tkTargetItems(id){
  const out=[];
  const isTeam=(S.org.teams||[]).some(t=>t.id===id);
  Object.keys(S.tasks||{}).forEach(sid=>{
    if(isTeam&&sid!==id)return;
    const m=S.tasks[sid]||{};
    Object.keys(m).forEach(iid=>{
      const it=m[iid];if(!it)return;
      const own=Object.keys(it.assignees||{}).filter(k=>it.assignees[k]);
      if(isTeam?own.length:!own.includes(id))return;
      if(!tkMatch(sid,iid,it))return;
      out.push({sid,iid,it});
    });
  });
  return out.sort((a,b)=>{const ad=a.it.date||'9999',bd=b.it.date||'9999';
    return ad<bd?-1:ad>bd?1:(a.it.createdAt||0)-(b.it.createdAt||0);});
}
function openItems(id){
  /* 완료해도 바로 사라지지 않는다 — DONE_KEEP_D 일이 지난 완료만 목록에서 뺀다.
     단 필터·검색이 켜져 있으면 전부 대상 — 상태 '완료'로 지난 완료도 찾아볼 수 있게 */
  const cut=Date.now()-DONE_KEEP_D*86400000;
  const showAll=tkFilterOn();
  return tkTargetItems(id).filter(({it})=>showAll||!(stEff(it)===2&&(it.updatedAt||0)<cut));
}
function regionMembers(mems,regions,rid){
  return rid===''?mems.filter(p=>!p.region||!regions.some(r=>r.id===p.region))
                 :mems.filter(p=>p.region===rid);
}
/* 담당자 묶음 — 담당자별 소제목 아래 그 사람의 미완료 업무 */
function memberGroupHTML(list){
  if(!list.length)return '<div class="tk-empty">배정된 담당자가 없습니다.</div>';
  list=list.slice().sort((a,b)=>rankOrd(a.rank)-rankOrd(b.rank)||String(a.name).localeCompare(String(b.name),'ko'));
  let any=false;
  const html=list.map(p=>{
    const items=openItems(p.id);
    if(!items.length)return '';
    any=true;
    const rk=rankOf(p.rank);
    return '<div class="tk-sub2">'+esc(p.name)
      +(rk!=='member'?'<span class="rk">'+esc(rankLabel(rk))+'</span>':'')+'</div>'
      +items.map(x=>taskItemHTML(x.sid,x.iid,x.it,false,p.id)).join('');
  }).join('');
  return any?html:'<div class="tk-empty">미완료 업무가 없습니다.</div>';
}
/* 권역별 섹션 — 팀 전체 보기에서 권역 단위로 레이아웃을 나눈다 */
/* which: 'head' 팀장만 · 'reg' 권역 담당자만 · 없으면 전부(다른 화면에서 쓰던 그대로) */
function regionSectionsHTML(mems,regions,which){
  const groups=[];
  const heads=mems.filter(p=>isTeamRank(p.rank));
  const rest=mems.filter(p=>!isTeamRank(p.rank));
  const byRank=list=>list.slice().sort((a,b)=>rankOrd(a.rank)-rankOrd(b.rank)||String(a.name).localeCompare(String(b.name),'ko'));
  if(heads.length&&which!=='reg')groups.push(['팀',byRank(heads)]);   /* 팀장·안전·원가 — 권역보다 위 */
  if(which!=='head'){
    regions.forEach(r=>{const list=rest.filter(p=>p.region===r.id);if(list.length)groups.push([r.name,byRank(list)]);});
    const none=regionMembers(rest,regions,'');
    if(none.length)groups.push(['권역 미지정',byRank(none)]);
  }
  if(!groups.length)return which?'':'<div class="tk-empty">배정된 담당자가 없습니다.</div>';
  return groups.map(([rn,list])=>{
    const cnt=list.reduce((a,p)=>a+taskCount(p.id),0);
    const inner=list.map(p=>{
      const items=openItems(p.id);
      if(!items.length)return '';
      const rk=rankOf(p.rank);
      /* 묶음 이름이 곧 직급이면(팀장 묶음) 이름 옆 배지는 같은 말을 두 번 하는 셈이다 */
      const badge=(rk!=='member'&&rn!==rankLabel(rk))?'<span class="rk">'+esc(rankLabel(rk))+'</span>':'';
      return '<div class="tk-sub2">'+esc(p.name)+badge+'</div>'
        +items.map(x=>taskItemHTML(x.sid,x.iid,x.it,false,p.id)).join('');
    }).join('');
    if(!inner)return '';                 /* 업무가 없는 권역은 통째로 감춘다(머리·구분선까지) */
    return '<div class="tk-sub">'+esc(rn)+'<span class="c">'+cnt+'</span></div>'+inner;
  }).join('');
}
/* 작성·수정 공용 폼 — 작성창과 수정 폼이 같은 골격을 쓴다(일관성) */
function taskFormHTML(sid,iid,cur){
  /* 업무 일정의 편집 폼과 같은 골격 — 행 순서·아이콘·버튼·디자인 전부 동일.
     다만 업무 목록에는 '자세히'(접기·펼치기)와 '업무 목록에서 쓰기' 아이콘이 필요 없다 */
  const d=cur||{text:'',prog:'',plan:'',site:'',assignees:meOwner(),links:{},color:'',date:'',end:'',time:'',kind:KIND_DEF,recur:{f:'',until:''}};
  const people=tkSel().mems;
  const kind=kindOf(d.kind),split=kindSplit(kind);
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
        <div class="frow"><label>업무 구분</label>
          <select class="inp inp-sm" id="tnKind" data-act="tk.kind">
            ${TK_KIND.map(([v,l])=>'<option value="'+v+'"'+(v===kind?' selected':'')+'>'+esc(l)+'</option>').join('')}
          </select></div>
        <div class="frow"><label>담당자</label>${ownSelHTML('tnAsg',own,people)}</div>
        <div class="frow"><label>현장</label>${sitePickHTML('tnSite',d.site||'')}</div>
        <div class="frow"><label>링크</label><input class="inp inp-sm" id="tnLink" maxlength="${LINK_MAX}" placeholder="https://…" value="${esc((lnk&&lnk.url)||'')}"></div>
      </div>
      <div id="tnBodySec">${tkBodyHTML(split,d.prog||d.body||'',d.plan||'',kind)}</div>
    </div>
  </div>`;
}
function tkBodyHTML(split,prog,plan,kind){
  return split
    ? `<div class="frow2">
        <div class="frow"><label>진행경과</label><textarea class="inp inp-sm" id="tnProg" maxlength="2000" placeholder="지금까지의 경과">${esc(prog)}</textarea></div>
        <div class="frow"><label>처리계획</label><textarea class="inp inp-sm" id="tnPlan" maxlength="2000" placeholder="앞으로의 계획">${esc(plan)}</textarea></div>
       </div>`
    : `<div class="frow"><label>내용</label><textarea class="inp inp-sm" id="tnProg" maxlength="2000" placeholder="${esc(kindLabel(kind))} 내용을 적으세요">${esc(prog)}</textarea></div>`;
}
/* 업무 구분을 바꾸면 본문 칸 구성이 달라진다 — 그 부분만 다시 그려 다른 입력을 지키지 않게 한다 */
/* 업무 구분을 '공통'으로 고르면 담당자도 공통(빈 값)으로 — 공통 업무는 특정 담당자에게 걸지 않는다 */
function kindOwnerSync(kindId,ownId){
  const k=$('#'+kindId),o=$('#'+ownId);
  if(k&&o&&k.value==='gather')o.value='';
}
function tkKindRefresh(){
  const sec=$('#tnBodySec');if(!sec)return;
  const kind=kindOf(($('#tnKind')&&$('#tnKind').value)||'');
  const prog=($('#tnProg')&&$('#tnProg').value)||'';
  const plan=($('#tnPlan')&&$('#tnPlan').value)||'';
  sec.innerHTML=tkBodyHTML(kindSplit(kind),prog,plan,kind);
}
function taskFormSave(sid,iid){
  const t=($('#tnTitle').value||'').trim();
  if(!t){toast('제목을 입력하세요');$('#tnTitle').focus();return;}
  const cur=iid?((S.tasks[sid]||{})[iid]||null):null;
  const id=iid||uid();
  const v=($('#tnAsg')&&$('#tnAsg').value)||'';const asg=v?{[v]:1}:{};
  /* 링크는 업무 일정 폼과 같이 한 칸 — 예전에 여러 개 넣어 둔 것은 첫 칸만 고치고 나머지는 그대로 둔다 */
  const links={...((cur&&cur.links)||{})};
  const lu=(($('#tnLink')&&$('#tnLink').value)||'').trim();
  const lk0=Object.keys(links)[0];
  if(lu){const k=lk0||uid();links[k]={...(links[k]||{}),url:/^https?:\/\//i.test(lu)?lu:'https://'+lu};}
  else if(lk0)delete links[lk0];
  const rec=($('#tnRec')&&$('#tnRec').value)||'';
  store.putTask(sid,id,{...(cur||{createdAt:Date.now()}),
    text:t,kind:kindOf(($('#tnKind')&&$('#tnKind').value)||''),
    prog:(($('#tnProg')&&$('#tnProg').value)||'').trim(),
    plan:(($('#tnPlan')&&$('#tnPlan').value)||'').trim(),
    site:$('#tnSite').value||'',
    date:($('#tnDate')&&$('#tnDate').value)||'',
    end:($('#tnEnd')&&$('#tnEnd').value)||'',
    time:($('#tnTime')&&$('#tnTime').value)||'',
    recur:rec?{f:rec,until:(($('#tnUntil')&&$('#tnUntil').value)||'')}:{f:'',until:''},
    /* ⚠ 표시 상태(stEff)를 저장하면 지난 팀 업무를 고치기만 해도 완료로 굳는다 — 저장된 상태만 유지 */
    st:stOf(cur&&cur.st),
    stKeep:!!(cur&&cur.stKeep),
    assignees:asg,links,color:($('#tnColor')&&$('#tnColor').value)||'',
    order:(cur&&Number.isFinite(Number(cur.order)))?Number(cur.order):nextOrder(sid),
    updatedAt:Date.now()});
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
  return v('tnTitle')!==was(cur.text)
    ||v('tnProg')!==was(cur.prog||cur.body)
    ||v('tnPlan')!==was(cur.plan);
}
/* 폼을 닫는 유일한 통로 — 취소 버튼과 Escape 가 함께 쓴다 */
function tkFormClose(){
  if(!tkFormDirty()){S.tkNew=null;S.tkEdit=null;rTasks();return;}
  confirmModal('작성 중인 내용 버리기','적은 내용이 저장되지 않았습니다. 그대로 닫으면 사라집니다.',
    ()=>{S.tkNew=null;S.tkEdit=null;rTasks();},'버리고 닫기',true);
}
/* ── 목록 보조 ── */
function nextOrder(sid){
  const m=S.tasks[sid]||{};
  const vals=Object.values(m).map(x=>Number(x.order)).filter(Number.isFinite);
  return (vals.length?Math.max(...vals):0)+1;
}
let _tdrag=null;
function wireTaskDnD(){
  const list=$('.tk-list');if(!list)return;
  const clear=()=>list.querySelectorAll('.drop-above,.drop-below').forEach(x=>x.classList.remove('drop-above','drop-below'));
  list.querySelectorAll('.tk-item[draggable]').forEach(el=>{
    el.addEventListener('dragstart',e=>{_tdrag={sid:el.dataset.sid,iid:el.dataset.iid};el.classList.add('dragging');
      try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',el.dataset.iid);}catch(_){}});
    el.addEventListener('dragend',()=>{el.classList.remove('dragging');clear();_tdrag=null;});
    el.addEventListener('dragover',e=>{
      if(!_tdrag||_tdrag.iid===el.dataset.iid||_tdrag.sid!==el.dataset.sid)return;
      e.preventDefault();
      const r=el.getBoundingClientRect(),after=e.clientY>r.top+r.height/2;
      el.classList.toggle('drop-below',after);el.classList.toggle('drop-above',!after);});
    el.addEventListener('dragleave',()=>el.classList.remove('drop-above','drop-below'));
    el.addEventListener('drop',e=>{
      if(!_tdrag||_tdrag.iid===el.dataset.iid||_tdrag.sid!==el.dataset.sid)return;
      e.preventDefault();
      const r=el.getBoundingClientRect(),after=e.clientY>r.top+r.height/2;
      reorderTask(_tdrag.sid,_tdrag.iid,el.dataset.iid,after);});
  });
}
function reorderTask(sid,iid,targetIid,after){
  const items=S.tasks[sid]||{};
  const ord=k=>Number.isFinite(Number(items[k].order))?Number(items[k].order):(items[k].createdAt||0)/1e10;
  const ids=Object.keys(items).sort((a,b)=>ord(a)-ord(b));
  const from=ids.indexOf(iid);if(from<0)return;
  ids.splice(from,1);
  let at=ids.indexOf(targetIid);if(at<0)at=ids.length;else at=after?at+1:at;
  ids.splice(at,0,iid);
  ids.forEach((k,i)=>{const cur=items[k];
    if(Number(cur.order)!==i+1)store.putTask(sid,k,{...cur,order:i+1});});
  if(!S.live)rTasks();
}
/* 업무 검색·필터 — 제목·경과·계획·현장·담당자까지 훑고, 상태·기한으로 좁힌다 */
/* 업무 분류 — 일반만 진행경과·처리계획을 나눠 쓰고, 나머지는 내용 한 칸 */
const TK_KIND=[['','일반'],['risk','고위험'],['gather','공통'],['trip','출장'],['meet','회의'],['etc','기타']];   /* 첫 항목이 새 업무 기본값 — 일반 */
const KIND_DEF='';
function kindOf(v){return TK_KIND.some(k=>k[0]===v)?v:'';}
function kindLabel(v){const k=TK_KIND.find(x=>x[0]===kindOf(v));return k?k[1]:'일반';}
function kindSplit(v){return kindOf(v)==='';}   /* 일반이면 두 칸으로 나눈다 */
function isRisk(v){return kindOf(v)==='risk';}   /* 고위험 — 달력 막대·목록에서 느낌표로 표시 */
/* 제목 앞 고위험 표식 — 달력 막대는 CSS(.fc-event.risk)가 같은 아이콘을 그린다.
   ⚠ 모양은 CSS 마스크가 그린다 — 안에 글자를 넣지 않는다(넣으면 원 안에서 위로 뜬다) */
function riskMark(kind){return isRisk(kind)?'<span class="risk-b" role="img" aria-label="고위험" data-tip="고위험 업무"></span>':'';}
/* 필터는 매번 다시 고르기 번거롭다 — 계정별로 이 브라우저에 저장해 다음에 그대로 연다 */
function filtKey(){return 'calapp.filt.'+((S.user&&S.user.uid)||'local');}
function filtSave(){
  try{localStorage.setItem(filtKey(),JSON.stringify({filter:S.filter,dayScope:S.dayScope,tkF:S.tkF}));}
  catch(e){/* 저장 실패는 무시 */}
}
function filtLoad(){
  try{
    const v=JSON.parse(localStorage.getItem(filtKey())||'null');if(!v)return;
    if(v.filter)S.filter={...S.filter,...v.filter};
    if(v.dayScope)S.dayScope=v.dayScope;
    if(v.tkF){S.tkF={...S.tkF,...v.tkF};delete S.tkF.reg;}   /* 옛 저장값의 권역은 버린다(필터에서 없앴다) */
  }catch(e){/* 깨진 값은 무시 */}
}
function tkFilterHTML(){
  const f=S.tkF||{};
  const on=!!(String(f.q||'').trim()||(f.st||[]).length||(f.kind||[]).length||(f.site||[]).length);
  /* ⚠ 권역 필터는 없앴다 — 팀 전체 화면의 '담당 업무' 카드 탭이 권역을 맡는다(248차). */
  const sites=(S.org.sites||[]).filter(x=>x.name);
  const M=(g,all,items)=>mselHTML('tk',g,all,items,f[g]);
  return `<div class="card dp-fcard tkf-card${on?' adv-on':''}" id="tkFcard">
    <div class="dp-frow">
      <div class="dp-srch">
        <svg class="icn dp-srch-i" aria-hidden="true"><use href="#i-search"></use></svg>
        <input class="inp inp-sm" id="tkQ" placeholder="찾기" value="${esc(f.q||'')}" autocomplete="off">
        ${String(f.q||'').trim()?'<button class="dp-srch-x" data-act="tkf.qclear" aria-label="지우기"><svg class="icn"><use href="#i-close"></use></svg></button>':''}
      </div>
      ${on?'<button class="btn bg2 bxs" data-act="tkf.reset">초기화</button>':''}
      <button class="dp-fmore" data-act="tkf.more" aria-label="필터 펼치기" data-tip="필터"><svg class="icn"><use href="#i-chevr"></use></svg></button>
    </div>
    <div class="dp-fadv">
      <div class="dp-frow">
        ${M('kind','업무 구분 전체',TK_KIND.map(k=>[k[0]||'_gen',k[1]]))}
        ${M('st','진행 상태 전체',ST_PICK)}
        ${M('site','현장 전체',sites.map(x=>[x.id,x.name]))}
      </div>
    </div>
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
  const ST=(f.st||[]).map(String),K=(f.kind||[]).map(String),SI=(f.site||[]).map(String);
  if(ST.length&&!ST.includes(String(stEff(it))))return false;
  if(K.length&&!K.includes(kindOf(it.kind)||'_gen'))return false;
  if(SI.length&&!SI.includes(String(it.site||'')))return false;
  return true;
}
function tkFilterOn(){const f=S.tkF||{};return !!(String(f.q||'').trim()||f.st||f.due);}
/* 다시 그리기 전후로 스크롤 위치를 기억한다 — rTasks 는 #tkRoot 를 통째로 갈아끼우므로
   그냥 두면 완료 체크·펼치기마다 목록이 맨 위로 튄다.
   ⚠ 대상(팀/담당자)을 바꿨을 때는 되돌리지 않는다 — 새 목록이 아래로 내려간 채 열린다 */
let _tkScKey='';
function rTasks(){
  const root=$('#tkRoot');
  const scKey=String(S.tk.t||'')+'|'+String(S.tk.m||'');
  const scSame=_tkScKey===scKey;
  const scList=[...root.querySelectorAll('.tk-list')].map(el=>el.scrollTop);
  const scSide=(root.querySelector('.tks-list')||{}).scrollTop||0;
  _tkScKey=scKey;
  const restoreScroll=()=>{
    if(scSame)root.querySelectorAll('.tk-list').forEach((el,i)=>{if(scList[i])el.scrollTop=scList[i];});
    const sl=root.querySelector('.tks-list');if(sl&&scSide)sl.scrollTop=scSide;   /* 사이드바는 내용이 같으니 늘 되돌린다 */
  };
  const{teams,team,regions,mems}=tkSel();
  if(!teams.length){
    root.innerHTML='<div class="tk-none">아직 등록된 팀이 없습니다.<br>조직/현장 관리에서 팀·권역을 만들고 계정에 배정하세요.<br><button class="btn bp bsm" data-act="nav.go" data-view="org">조직/현장 관리로 이동</button></div>';
    return;
  }
  const sel=S.tk.m;
  const tn=team?team.name:'팀';
  /* 좌측 카운트 */
  const cCommon=team?taskCount(team.id):0;
  const cMems=mems.reduce((a,p)=>a+taskCount(p.id),0);
  /* 대상별 제목 · 작성 대상(sid) · 목록 */
  let subject='',sid=null,listHTML='',split=null;
  if(sel==='teamall'){
    subject=tn+' 전체 업무';
    /* 팀 전체 화면은 카드를 둘로 나눈다 — 공통·팀장(A) / 권역 담당자(B).
       각 카드는 제 머리에 탭을 달고 그 탭만으로 좁힌다(S.tkA·S.tkB) */
    split=tkSplitHTML(team,mems,regions);
  }else if(sel==='team'){
    subject=tn+' 공통 업무';sid=team?team.id:null;
    listHTML=sid?taskListHTML(sid):'<div class="tk-empty">조직/현장 관리에서 팀을 먼저 등록하세요.</div>';
  }else if(typeof sel==='string'&&sel.indexOf('reg:')===0){
    const rid=sel.slice(4);
    subject=(rid===''?'권역 미지정':(((regions.find(r=>r.id===rid)||{}).name)||'권역'))+' 업무';
    listHTML=memberGroupHTML(regionMembers(mems,regions,rid));
  }else if(sel==='hold'){
    subject='보류한 업무';
    const hs=holdItems();
    listHTML=hs.length?hs.map(({sid,iid,it})=>taskItemHTML(sid,iid,it,false)).join('')
      :'<div class="tk-empty">보류 중인 업무가 없습니다.</div>';
  }else{
    const p=mems.find(x=>x.id===sel);
    subject=p?p.name:'담당자';sid=sel;
    listHTML=taskListHTML(sid);
  }
  /* 화면에 실제로 그려진 업무 수 — 업무 패널 머리 우측에 표시 */
  const shownCnt=(listHTML.match(/class="tk-item /g)||[]).length;

  root.innerHTML=`<div class="tkwrap">
    <div class="tkside">
      ${miniCalHTML()}
      <div class="card tks-card tks-hold">
        <div class="tks-item tks-reg${sel==='hold'?' act':''}" data-act="tk.pick" data-id="hold">
          <span class="n">보류한 업무</span><span class="c">${holdItems().length}</span>
        </div>
      </div>
    </div>

    <div class="tkcol">
      ${tkFilterHTML()}
      ${split?`<div class="tk-split">
        <div class="card tkmain">
          <div class="tkm-h tkm-tabh">${split.tabsA}
            <button class="btn bo bxs tkm-add" data-act="tk.newOpen" data-side="a"><svg class="icn"><use href="#i-plus"></use></svg> 업무 추가</button>
          </div>
          <div class="tk-list">
            ${split.sidA&&S.tkNew===split.sidA&&S.tkNewSide!=='b'?taskFormHTML(split.sidA,null,null):''}
            ${split.a?tkHeadRowHTML()+split.a:'<div class="tk-empty">표시할 업무가 없습니다.</div>'}</div>
        </div>
        <div class="card tkmain">
          <div class="tkm-h tkm-tabh">${split.tabsB}
            <button class="btn bo bxs tkm-add" data-act="tk.newOpen" data-side="b"><svg class="icn"><use href="#i-plus"></use></svg> 업무 추가</button>
          </div>
          <div class="tk-list">
            ${split.sidB&&S.tkNew===split.sidB&&S.tkNewSide==='b'?taskFormHTML(split.sidB,null,null):''}
            ${split.b?tkHeadRowHTML()+split.b:'<div class="tk-empty">표시할 업무가 없습니다.</div>'}</div>
        </div>
      </div>`:`<div class="card tkmain">
        <div class="tkm-h"><b>업무 목록</b><span class="tkm-sub">${esc(subject)}</span>
          <span class="tkm-c">${shownCnt}건</span>
          ${sel==='hold'?'':'<button class="btn bo bxs tkm-add" data-act="tk.newOpen"><svg class="icn"><use href="#i-plus"></use></svg> 업무 추가</button>'}
        </div>
        <div class="tk-list">
          ${sid&&S.tkNew===sid?taskFormHTML(sid,null,null):''}
          ${listHTML.includes('tk-item')?tkHeadRowHTML():''}${listHTML}
        </div>
      </div>`}
    </div>
  </div>`;
  wireTaskDnD();
  restoreScroll();
  if((sid&&S.tkNew===sid)||S.tkEdit){const t=$('#tnTitle');if(t&&document.activeElement!==t)t.focus();}
}
/* ═══════════ 주요 업무 — 주 단위 업무보고 표 ═══════════
   보고 주기는 목요일에 시작해 수요일에 끝난다(8/6~8/12 → 8/13~8/19 …).
   한 화면에 「완료」(이번 주기)와 「예정」(다음 주기)을 나란히 놓고, 권역마다 따로 묶는다.
   ⚠ 팀 공통 업무·권역 미지정·인수 전 현장 권역은 보고 대상이 아니다.
   ⚠ 완료일 전용 필드는 없다 — 종료일(end 또는 date)을 그날로 본다. */
const RPT_DOW=4;   /* 주기 시작 요일 — 목요일(일=0) */
function rptCycle(ds){
  const start=addDays(ds,-((toDate(ds).getDay()-RPT_DOW+7)%7));
  return{start,end:addDays(start,6)};
}
function rptLabel(a,b){
  const A=toDate(a),B=toDate(b);
  return A.getFullYear()+'년 '+(A.getMonth()+1)+'월 '+A.getDate()+'~'
    +(A.getMonth()===B.getMonth()?'':(B.getMonth()+1)+'월 ')+B.getDate()+'일';
}
const rptMd=d=>d?(Number(d.slice(5,7))+'/'+Number(d.slice(8))):'';
function rptRows(pid,from,to,done){
  /* pid = 담당자 id. assignees 에 pid 가 있는 업무를 **모든 가방**에서 모은다.
     업무는 팀 id 아래에도, 첫 담당자 uid 아래에도 저장된다(planToTask 참조) —
     예전처럼 pid 가 든 첫 가방 하나만 훑으면 다른 가방의 업무가 보고에서 빠졌다. */
  const out=[];
  Object.keys(S.tasks||{}).forEach(tid=>{
    const m=S.tasks[tid]||{};
    Object.keys(m).forEach(iid=>{
      const it=m[iid];
      if(!it||!it.assignees||!it.assignees[pid])return;
      /* ⚠ 반복 업무는 회차를 펼쳐서 본다 — 안 그러면 시작일(과거) 하나만 보고 주기에 안 걸려
         **주간 보고에서 통째로 빠졌다**(달력·월별 현장에는 나오는데 여기만 없었다).
         완료 여부도 회차별(doneOn)로 따진다. */
      if(it.recur&&it.recur.f){
        const p=taskAsPlan(tid,iid,it);
        recurDates(p,from,to).forEach(d=>{
          if(done===!!(it.doneOn&&it.doneOn[occSrc(p,d)]))out.push({iid,it,d});
        });
        return;
      }
      if(done!==(stEff(it)===2))return;
      const s=it.date||'',e=it.end||it.date||'';
      if(done){if(e>=from&&e<=to)out.push({iid,it,d:e});return;}   /* 완료 — 그 주기에 끝난 것 */
      if(!s){out.push({iid,it,d:''});return;}                      /* 예정 — 기한 없는 미완료도 빠뜨리지 않는다 */
      if(s<=to&&e>=from)out.push({iid,it,d:s});                    /* 주기에 걸치는 것 */
    });
  });
  return out.sort((a,b)=>String(a.d||'9999').localeCompare(String(b.d||'9999')));
}
/* 보기 모드 전환 — 주간 보고(기존) · 월별 현장(월 단위, 현장별 묶음) */
function rptModeSeg(){
  const m=S.rptMode||'week';
  return '<div class="seg rp-seg">'
    +'<button class="'+(m==='week'?'act':'')+'" data-act="rpt.mode" data-m="week">주간 보고</button>'
    +'<button class="'+(m==='month'?'act':'')+'" data-act="rpt.mode" data-m="month">월별 현장</button>'
    +'</div>';
}
/* 보고 대상 권역 탭 — 두 보기가 같은 선택(S.rptReg)을 쓴다 */
function rptRegs(regions){return regions.filter(r=>!/미인수|인수\s*전/.test(r.name));}
function rReport(){
  const root=$('#reportRoot');if(!root)return;
  if((S.rptMode||'week')==='month')return rReportMonth(root);
  const{mems,regions}=tkSel();
  const cur=rptCycle(S.rptWeek||todayStr());
  const nxt=rptCycle(addDays(cur.start,7));
  const regs=rptRegs(regions);
  const byRank=l=>l.slice().sort((a,b)=>rankOrd(a.rank)-rankOrd(b.rank)||String(a.name).localeCompare(String(b.name),'ko'));
  if(!S.rptReg&&regs.length)S.rptReg=regs[0].id;

  const rptShort=(a,b)=>{
    const A=toDate(a),B=toDate(b);
    return (A.getMonth()+1)+'/'+A.getDate()+' ~ '+(A.getMonth()===B.getMonth()?'':(B.getMonth()+1)+'/')+B.getDate();
  };

  const tblHTML=(people,from,to,done)=>{
    const rows=[];
    people.forEach(p=>{
      const list=rptRows(p.id,from,to,done);
      (list.length?list:[null]).forEach((r,i)=>{
        const it=r&&r.it;
        rows.push('<tr>'
          +(i===0?'<td class="rp-own" rowspan="'+(list.length||1)+'">'+esc(p.name)+'</td>':'')
          +'<td class="rp-site">'+esc(it?siteName(it.site):'')+'</td>'
          +'<td class="rp-t">'+(it?riskMark(it.kind):'')+esc(it?(it.text||''):'')+'</td>'
          +'<td class="cc rp-d">'+esc(r&&r.d?rptMd(r.d):'')+'</td>'   /* 반복은 그 회차 날짜 */
          +'<td class="rp-memo">'+esc(it?(it.plan||it.prog||it.body||''):'')+'</td>'
          +'</tr>');
      });
    });
    const icon=done
      ?'<svg viewBox="0 0 16 16" class="rp-bic"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>'
      :'<svg viewBox="0 0 16 16" class="rp-bic"><path d="M8 3.5a.5.5 0 01.5.5v4.25a.5.5 0 01-.146.354l-2 2a.5.5 0 01-.708-.708L7.5 8.043V4a.5.5 0 01.5-.5z"/><path d="M8 16A8 8 0 108 0a8 8 0 000 16zm7-8A7 7 0 111 8a7 7 0 0114 0z"/></svg>';
    return `<div class="rp-sec${done?' rp-done':' rp-plan'}">
      <div class="rp-sec-h"><span class="rp-badge${done?' done':' plan'}">${icon}${done?'완료':'예정'}</span>
        <span class="rp-period">${esc(rptLabel(from,to))}</span></div>
      <table class="rp-tbl"><colgroup><col style="width:16%"><col style="width:18%"><col style="width:38%"><col style="width:11%"><col style="width:17%"></colgroup>
        <thead><tr><th>담당자</th><th>현장</th><th>업무</th><th class="cc">${done?'완료일':'예정일'}</th><th>비고</th></tr></thead>
        <tbody>${rows.join('')||'<tr><td colspan="5" class="rp-none">해당 업무가 없습니다.</td></tr>'}</tbody></table>
    </div>`;
  };

  /* 권역별 건수 */
  const regCnt=r=>{
    const pp=mems.filter(p=>p.region===r.id);
    return pp.reduce((n,p)=>n+rptRows(p.id,cur.start,cur.end,true).length+rptRows(p.id,nxt.start,nxt.end,false).length,0);
  };

  const tabs=regs.map(r=>`<button class="rp-tab${r.id===S.rptReg?' on':''}" data-act="rpt.tab" data-reg="${esc(r.id)}">${esc(r.name)} <span class="rp-tcnt">${regCnt(r)}</span></button>`).join('');

  const activeReg=regs.find(r=>r.id===S.rptReg)||regs[0];
  let body='';
  if(activeReg){
    const people=byRank(mems.filter(p=>p.region===activeReg.id));
    if(!people.length)body='<div class="rp-empty">배정된 담당자가 없습니다.</div>';
    else body=`<div class="rp-split">${tblHTML(people,cur.start,cur.end,true)}${tblHTML(people,nxt.start,nxt.end,false)}</div>`;
  }

  root.innerHTML=`<div class="rp-head">
      ${rptModeSeg()}
      <div class="cal-nav">
        <button class="cal-nb" data-act="rpt.week" data-d="-7" data-tip="이전 주기"><svg class="icn"><use href="#i-chevl"></use></svg></button>
        <button class="cal-nb cal-today" data-act="rpt.week" data-d="0" data-tip="이번 주기"><svg class="icn"><use href="#i-today"></use></svg></button>
        <button class="cal-nb" data-act="rpt.week" data-d="7" data-tip="다음 주기"><svg class="icn"><use href="#i-chevr"></use></svg></button>
      </div>
      <div class="rp-week"><span class="rp-wk-done">완료 <b>${esc(rptShort(cur.start,cur.end))}</b></span><span class="rp-wk-sep">·</span><span class="rp-wk-plan">예정 <b>${esc(rptShort(nxt.start,nxt.end))}</b></span></div>
    </div>
    <div class="rp-tabs">${tabs}</div>
    ${body||'<div class="rp-empty">보고 대상 권역이 없습니다.</div>'}`;
}

/* ── 월별 현장 보기 — 고른 달에 걸친 업무를 현장별로 묶어 보여준다 ──
   ⚠ 날짜가 있는 업무만 대상 — 월 단위 화면이라 기한 없는 업무는 업무 목록에서 본다.
   반복 업무는 그 달의 회차만 전개하고, 완료 여부는 회차별(doneOn)로 본다. */
function rptYmSel(){return /^\d{4}-\d{2}$/.test(S.rptYm)?S.rptYm:todayStr().slice(0,7);}
function rptMonthItems(ym){
  const from=ym+'-01';
  const to=ym+'-'+pad(new Date(Number(ym.slice(0,4)),Number(ym.slice(5,7)),0).getDate());
  const out=[];   /* {sid,iid,it,d(표시일·기간이면 시작일),done} */
  const seen=new Set();   /* 같은 업무가 팀·담당자 두 가방에 있어도 iid 는 하나 — 한 번만 센다 */
  Object.keys(S.tasks||{}).forEach(sid=>{
    const m=S.tasks[sid]||{};
    Object.keys(m).forEach(iid=>{
      const it=m[iid];if(!it||!it.date||seen.has(iid))return;
      if(it.recur&&it.recur.f){
        const p=taskAsPlan(sid,iid,it);
        recurDates(p,from,to).forEach(d=>{
          out.push({sid,iid,it,d,done:!!(it.doneOn&&it.doneOn[occSrc(p,d)])});
        });
        seen.add(iid);return;
      }
      const s=it.date,e=it.end||it.date;
      if(s<=to&&e>=from){out.push({sid,iid,it,d:s,done:stEff(it)===2});seen.add(iid);}
    });
  });
  return{from,to,items:out};
}
function rReportMonth(root){
  const{regions}=tkSel();
  const regs=rptRegs(regions);
  if(!S.rptReg&&regs.length)S.rptReg=regs[0].id;
  if(S.rptReg&&regs.length&&!regs.some(r=>r.id===S.rptReg))S.rptReg=regs[0].id;
  const ym=rptYmSel();
  const{items}=rptMonthItems(ym);
  const sitesAll=S.org.sites||[];
  const regOfSite=sid=>{const s=sitesAll.find(x=>x.id===sid);return s?(s.region||''):null;};   /* null=목록에 없는 현장 */
  /* 현장 미지정 — site 가 비었거나 목록에서 지워진 현장. 권역과 무관하게 늘 아래에 붙인다 */
  const noSite=items.filter(x=>!x.it.site||regOfSite(x.it.site)===null);
  const cntOf=r=>items.filter(x=>x.it.site&&regOfSite(x.it.site)===r.id).length;
  const tabs=regs.map(r=>`<button class="rp-tab${r.id===S.rptReg?' on':''}" data-act="rpt.tab" data-reg="${esc(r.id)}">${esc(r.name)} <span class="rp-tcnt">${cntOf(r)}</span></button>`).join('');
  const activeReg=regs.find(r=>r.id===S.rptReg)||regs[0];
  const sites=activeReg?sitesAll.filter(s=>s.region===activeReg.id):[];
  const bySite={};items.forEach(x=>{if(x.it.site)(bySite[x.it.site]=bySite[x.it.site]||[]).push(x);});

  const rowHTML=x=>{
    const asg=Object.keys(x.it.assignees||{}).map(id=>ownName(id)).filter(Boolean).join(', ');
    const span=x.it.end&&x.it.end!==x.it.date&&!(x.it.recur&&x.it.recur.f);
    const memo=x.it.plan||x.it.prog||x.it.body||'';
    return `<div class="rpm-row${x.done?' done':''}" data-act="rpt.go" data-sid="${esc(x.sid)}" data-iid="${esc(x.iid)}" role="button" tabindex="0">
      ${stIcon(x.done?2:1)}
      <span class="rpm-t">${riskMark(x.it.kind)}${esc(x.it.text||'제목 없음')}${memo?'<span class="rpm-memo">'+esc(memo)+'</span>':''}</span>
      <span class="rpm-own${asg?'':' team'}">${esc(asg||'공통')}</span>
      <span class="rpm-d">${esc(span?rptMd(x.it.date)+'–'+rptMd(x.it.end):rptMd(x.d))}</span>
    </div>`;
  };
  const groupHTML=(name,list)=>{
    const done=list.filter(x=>x.done).length;
    const rows=list.slice().sort((a,b)=>a.d.localeCompare(b.d)||String(a.it.text||'').localeCompare(String(b.it.text||''),'ko'));
    return `<div class="rpm-card${list.length?'':' empty'}">
      <div class="rpm-h"><span class="rpm-site">${esc(name)}</span>
        ${list.length
          ?`<span class="rpm-cnt"><b class="c-done">완료 ${done}</b><i>·</i><b class="c-run">진행 ${list.length-done}</b></span>`
          :'<span class="rpm-noneb">업무 없음</span>'}
      </div>
      ${list.length?'<div class="rpm-rows">'+rows.map(rowHTML).join('')+'</div>':''}
    </div>`;
  };
  const cards=sites.map(s=>groupHTML(s.name||'이름 없음',bySite[s.id]||[])).join('');
  const total=sites.reduce((n,s)=>n+((bySite[s.id]||[]).length),0);
  const doneN=sites.reduce((n,s)=>n+((bySite[s.id]||[]).filter(x=>x.done).length),0);
  const y=Number(ym.slice(0,4)),mo=Number(ym.slice(5,7));

  root.innerHTML=`<div class="rp-head">
      ${rptModeSeg()}
      <div class="cal-nav">
        <button class="cal-nb" data-act="rpt.mon" data-d="-1" data-tip="이전 달"><svg class="icn"><use href="#i-chevl"></use></svg></button>
        <button class="cal-nb cal-today" data-act="rpt.mon" data-d="0" data-tip="이번 달"><svg class="icn"><use href="#i-today"></use></svg></button>
        <button class="cal-nb" data-act="rpt.mon" data-d="1" data-tip="다음 달"><svg class="icn"><use href="#i-chevr"></use></svg></button>
      </div>
      <div class="rp-week"><b>${y}년 ${mo}월</b><span class="rpm-sum">현장 ${sites.length} · 업무 ${total}건${total?' · 완료 '+doneN:''}</span></div>
    </div>
    <div class="rp-tabs">${tabs||''}</div>
    ${activeReg?'<div class="rpm-grid">'+(cards||'<div class="rp-empty">이 권역에 등록된 현장이 없습니다.</div>')+'</div>'
      :'<div class="rp-empty">보고 대상 권역이 없습니다.</div>'}
    ${noSite.length?'<div class="rpm-grid rpm-nosite">'+groupHTML('현장 미지정 · 공통',noSite)+'</div>':''}`;
}

/* ── 팀 전체 화면의 두 카드 — 각 카드 머리에 탭을 단다(1안) ──
   A(팀 업무): 전체 · 공통 · 팀장/안전/원가 각 사람
   B(담당 업무): 전체 · 권역별 · 권역 미지정
   ⚠ 탭은 **그 카드만** 좁힌다 — 두 카드는 서로 영향을 주지 않는다.
   ⚠ 지워진 담당자·권역이 탭에 남아 있으면 빈 화면이 되므로, 없는 값은 '전체'로 되돌린다. */
function tkSplitHTML(team,mems,regions){
  const heads=mems.filter(p=>isTeamRank(p.rank));
  const rest=mems.filter(p=>!isTeamRank(p.rank));
  const byRank=l=>l.slice().sort((a,b)=>rankOrd(a.rank)-rankOrd(b.rank)||String(a.name).localeCompare(String(b.name),'ko'));
  const headList=byRank(heads);
  const ci=team?openItems(team.id):[];
  const cCommon=team?taskCount(team.id):0;

  /* A 탭 목록 */
  const tabsA=[['','전체',cCommon+headList.reduce((a,p)=>a+taskCount(p.id),0)]];
  if(team)tabsA.push(['team','공통 업무',cCommon]);
  /* ⚠ 탭은 **직급으로만** 적는다(사용자 지시). 같은 직급이 둘 이상일 때만 이름을 덧붙여 구분한다 */
  const rkCnt={};headList.forEach(p=>{const r=rankLabel(p.rank)||'담당';rkCnt[r]=(rkCnt[r]||0)+1;});
  headList.forEach(p=>{const r=rankLabel(p.rank)||'담당';
    tabsA.push([p.id,rkCnt[r]>1?r+' '+p.name:r,taskCount(p.id)]);});
  if(!tabsA.some(t=>t[0]===S.tkA))S.tkA='';

  /* B 탭 목록 — 담당자가 있는 권역만 */
  const regGroups=[];
  regions.forEach(r=>{const list=rest.filter(p=>p.region===r.id);if(list.length)regGroups.push([r.id,r.name,byRank(list)]);});
  const none=regionMembers(rest,regions,'');
  if(none.length)regGroups.push(['_none','권역 미지정',byRank(none)]);
  const tabsB=[['','전체',rest.reduce((a,p)=>a+taskCount(p.id),0)]]
    .concat(regGroups.map(([rid,rn,list])=>[rid,rn,list.reduce((a,p)=>a+taskCount(p.id),0)]));
  if(!tabsB.some(t=>t[0]===S.tkB))S.tkB='';

  /* 본문 */
  const commonHTML=()=>ci.length
    ?'<div class="tk-sub">공통 업무<span class="c">'+cCommon+'</span></div>'+ci.map(x=>taskItemHTML(x.sid,x.iid,x.it,false)).join('')
    :'';
  let a='';
  if(S.tkA===''){a=commonHTML()+regionSectionsHTML(mems,regions,'head');}
  else if(S.tkA==='team'){a=team?taskListHTML(team.id):'';}
  else a=taskListHTML(S.tkA);

  let b='';
  if(S.tkB==='')b=regionSectionsHTML(mems,regions,'reg');
  else{
    const g=regGroups.find(x=>x[0]===S.tkB);
    b=g?memberGroupHTML(g[2]):'';
  }
  /* ⚠ data-act 는 **리터럴로** 적는다 — 문자열을 조합하면 정적 감사가 발신처를 못 찾는다 */
  const tabBtn=(id,nm,c,sel,side)=>'<button class="rp-tab'+(id===sel?' on':'')+'" '
    +(side==='a'?'data-act="tk.tabA"':'data-act="tk.tabB"')+' data-id="'+esc(id)+'">'
    +esc(nm)+'<span class="rp-tcnt">'+c+'</span></button>';
  const tabHTML=(list,sel,side)=>'<div class="rp-tabs tkm-tabs">'
    +list.map(([id,nm,c])=>tabBtn(id,nm,c,sel,side)).join('')+'</div>';
  return{a,b,tabsA:tabHTML(tabsA,S.tkA,'a'),tabsB:tabHTML(tabsB,S.tkB,'b'),
    sidA:(S.tkA&&S.tkA!=='team')?S.tkA:(team?team.id:null),
    /* 담당 업무 카드에서 만든 업무는 팀 자리에 담고 담당자는 폼에서 고른다 — 권역 탭만으로는 사람이 정해지지 않는다 */
    sidB:team?team.id:null};
}
/* 업무로 이동 — 검색·내 업무·달력에서 공통으로 쓰고, 모달 없이 인라인으로 펼친다 */
function gotoTask(sid,iid){
  nqOpen(false);closeModal();
  const isTeam=(S.org.teams||[]).some(t=>t.id===sid);
  if(isTeam){S.tk.t=sid;S.tk.m='team';}
  else{const p=roster().find(x=>x.id===sid);if(p&&p.team)S.tk.t=p.team;S.tk.m=sid;}
  S.tkNew=null;S.tkEdit=null;
  go('tasks');
  /* ⚠ go() 가 화면 전환 때 tkOpen 을 접는다 — 펼침 지정은 반드시 그 뒤에 */
  S.tkOpen=sid+'/'+iid;rTasks();
  setTimeout(()=>{const el=document.querySelector('.tk-item[data-iid="'+iid+'"]');
    if(el)el.scrollIntoView({block:'center',behavior:'smooth'});},80);
}

/* ═══════════ 찾기 — 업무·현장·하자를 한 번에 ═══════════ */
function nqOpen(on){
  const p=$('#nqPanel');if(!p)return;
  /* 접힌 사이드바에서 기능 팝오버(#sbTools.open)와 자리가 겹친다 — 열 때 그쪽을 먼저 닫는다.
     팝오버가 z-index 400, 찾기 패널이 61 이라 그대로 두면 패널이 아래로 깔려 잘려 보인다 */
  if(on){const t=$('#sbTools');if(t)t.classList.remove('open');}
  p.classList.toggle('on',!!on);
  p.setAttribute('aria-hidden',on?'false':'true');
  /* 여는 버튼이 둘 — 앱은 사이드바(#tbSrch), 위젯은 헤더(#widSrch). 있는 쪽만 눌린 표시를 준다 */
  [$('#tbSrch'),$('#widSrch')].forEach(f=>{
    if(!f)return;
    f.classList.toggle('on',!!on);f.setAttribute('aria-expanded',on?'true':'false');});
  if(on)setTimeout(()=>{const q=$('#nqQ');if(q){q.focus();q.select();}},60);
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
  const lo=q.toLowerCase(),hit=v=>String(v||'').toLowerCase().includes(lo);
  Object.keys(S.tasks||{}).forEach(sid=>{
    const m=S.tasks[sid]||{};
    Object.keys(m).forEach(iid=>{
      const it=m[iid];if(!it)return;
      if(hit(it.text)||hit(it.body)||hit(it.prog)||hit(it.plan)||hit(siteName(it.site)))out.tasks.push({sid,iid,it});
    });
  });
  /* 하자처리 현황도 함께 찾는다 — 현장 이름과, 이미 불러온 하자 목록의 건.
     ⚠ 목록은 현장을 한 번 연 뒤에야 손에 있다(전 현장 목록을 미리 받으면 수 MB). */
  (S.org.sites||[]).forEach(s=>{if(hit(s.name))out.sites.push(s);});
  Object.keys(DF.list||{}).forEach(ck=>{
    const sid=ck.split('/')[1]||'';
    (DF.list[ck]||[]).forEach(r=>{
      if(out.defects.length>=40)return;
      if(hit(r.trade)||hit(r.defectType)||hit(r.receiptContent)||hit(r.space)||hit(r.building)||hit(r.unit))
        out.defects.push({sid,r});
    });
  });
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
  if(!q){box.innerHTML='<div class="nq-empty">업무 제목·진행경과·처리계획, 현장, 하자에서 찾습니다.</div>';return;}
  const r=nqSearch(q);
  const total=r.tasks.length+r.sites.length+r.defects.length;
  if(!total){box.innerHTML='<div class="nq-empty">"'+esc(q)+'" 에 해당하는 결과가 없습니다.</div>';return;}
  const item=(icon,tt,sb,attrs)=>`<div class="nq-item" ${attrs}>
    <span class="ic"><svg class="icn"><use href="#${icon}"></use></svg></span>
    <div style="min-width:0"><div class="tt">${tt}</div><div class="sb">${esc(sb)}</div></div></div>`;
  box.innerHTML=
    (r.tasks.length?'<div class="nq-g">업무 '+r.tasks.length+'</div>'+r.tasks.slice(0,20).map(({sid,iid,it})=>
      item('i-tasks',nqMark(it.text,q),
        subjName(sid)+(it.date?' · '+it.date+(it.end&&it.end!==it.date?'~'+it.end:''):''),
        'data-act="nq.task" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'" data-date="'+esc(it.date||'')+'"')).join(''):'')
    +(r.sites.length?'<div class="nq-g">하자처리 현황 · 현장 '+r.sites.length+'</div>'+r.sites.slice(0,10).map(s=>
      item('i-defect',nqMark(s.name,q),'하자 현황 보기',
        'data-act="nq.site" data-sid="'+esc(s.id)+'"')).join(''):'')
    +(r.defects.length?'<div class="nq-g">하자 '+r.defects.length+'</div>'+r.defects.slice(0,20).map(({sid,r:x})=>
      item('i-defect',nqMark([x.trade,x.defectType,x.receiptContent].filter(Boolean).join(' · '),q),
        (siteName(sid)||'')+' · '+[x.building,x.unit].filter(Boolean).join('-')+' · 지연 '+(Number(x.delayDays)||0)+'일',
        'data-act="nq.site" data-sid="'+esc(sid)+'"')).join(''):'');
}

/* ═══════════ 하자처리 현황 — 원본(하자처리 현황 앱) 화면 이식 ═══════════
   대시보드·현장 패널의 화면 구성과 기능은 원본을 그대로 따르고,
   색·모서리·글자 크기·간격만 이 앱의 토큰을 쓴다(각진 8px 모서리 등).
   ⚠ 이 앱은 **읽기 전용**이다(처리계획·분석 의견 제외). 원본 하자 행은 업로드한 PC에만 있고,
   집계·게시는 하자처리 현황 앱이 한다. 숫자의 단일 출처는 게시본:
   - report/{rm}/_dash : wks(주차 누계)·am(공종별 미처리)·insightsHTML·sites·teams
   - report/{rm}/{sid} : kpi(calc 전체 — weekly·monthly·trAgg·coAgg·top·topLt·prev·vacU·vacS…)
                          ·siteWks(추이차트용)·siteAm(도넛용)·vac(공가 입력값)·ulz(미처리 목록 압축) */
const DF={cache:{},kpi:{},sw:{},sam:{},vac:{},plans:{},ana:{},list:{},ch:{},busy:false,lastDash:null};
/* 도넛 팔레트 — 원본과 동일 고정값(같은 현장·공종이 어디서나 같은 색) */
const DF_PAL=['#1F2B4C','#2C437C','#304D9D','#3259B6','#3E71D2','#538CDE','#74ABE6','#A0C8F0','#C7DDF6','#DFEBFA','#EAF2FC','#B3C7DD'];
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
   게시본을 구독 중일 때(ORG_LIVE) orgFromDash 가 S.org.sites 를 통째로 갈아끼워 지워지고,
   orgSave 도 거부한다. 그래서 게시본과 무관한 calapp/cfg 에 현장 id 만 모아 둔다(팀 전체 공유) */
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
const dfLtrTip=(nm,unr,d60,d30,d0)=>{const p=n=>unr>0?(n/unr*100).toFixed(1)+'%':'0%';
  return esc(nm)+' — 60일+ '+d60.toLocaleString()+'건('+p(d60)+') · 30~59일 '+d30.toLocaleString()+'건('+p(d30)+') · 30일 미만 '+d0.toLocaleString()+'건('+p(d0)+')';};
const dfLtrBar=(nm,unr,d60,d30,d0)=>{
  const ltr=unr>0?((d60+d30)/unr*100):0;
  const p60=unr>0?Math.min(d60/unr*100,100):0,p30=unr>0?Math.min(d30/unr*100,100):0,p0=unr>0?Math.min(d0/unr*100,100):0;
  return`<div class="ltrbar-wrap"><div class="ltrbar" data-tip="${dfLtrTip(nm,unr,d60,d30,d0)}"><div class="seg s60" style="width:${p60.toFixed(1)}%"></div><div class="seg s30" style="width:${p30.toFixed(1)}%"></div><div class="seg s0" style="width:${p0.toFixed(1)}%"></div></div><span class="ltrbar-pct">${ltr.toFixed(1)}%</span></div>`;};
const dfLtrCells=(d0,d30,d60,unr,ltDlt,isFirst,u)=>{
  const lt=d30+d60;
  return`<td class="cc ltr-red tl-grp-ltr">${dfNF(lt)}</td><td class="cc tl-grp-ltr">${dfLtrBar('장기미처리',unr,d60,d30,d0)}</td><td class="cc">${dfDlt(ltDlt,isFirst,lt,u)}</td>`;};
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
function dfSubSiteCfg(){
  if(DF._cfgBound||!S.live||!FB.db)return;DF._cfgBound=true;
  FB.db.ref('siteConfig').on('value',snap=>{
    const cfg=snap.val()||{};let changed=false;
    for(const sid in cfg){
      const c=cfg[sid]||{},x=(S.org.sites||[]).find(y=>y.id===sid);if(!x)continue;
      if(typeof c.hasCommercial==='boolean'&&x.hasCommercial!==c.hasCommercial){x.hasCommercial=c.hasCommercial;changed=true;}
      if(typeof c.showVacant==='boolean'&&(x.showVacant!==false)!==c.showVacant){x.showVacant=c.showVacant;changed=true;}
    }
    if(!changed)return;   /* 값이 같은 에코는 다시 그리지 않는다(깜빡임 방지) */
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
    await Promise.all(sites.map(async s=>{
      try{wk[s.id]=(await dfRef('report/'+rm+'/'+s.id+'/kpi/weekly'))||[];}catch(e){wk[s.id]=[];}
    }));
    DF.cache[rm]={rm,wks:Array.isArray(wks)?wks:[],am:am||{},ins,wk};
    return DF.cache[rm];
  }catch(e){console.warn('[하자] 게시본 읽기 실패',e);return null;}
  finally{DF.busy=false;}
}
/* 현장 하나를 열 때 — kpi 전체·추이·도넛·공가 입력값을 병렬로 읽는다 */
async function dfSiteData(sid){
  const rm=dfRm();if(!S.live||!FB.db||!rm||!sid)return null;
  const k=rm+'/'+sid;
  if(DF.kpi[k]!==undefined)return DF.kpi[k];
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
/* 처리계획 — 하자처리 현황과 같은 자리(plans/{현장}/{필드}/{기준월@공종}) · 키는 fbEncKey 와 동일 규칙 */
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
/* 분석 의견 — analysis/{현장}/{기준월}. 열람자도 쓸 수 있다(원본의 공동 작성 규칙) */
async function dfLoadAna(sid){
  if(!S.live||!FB.db||!sid)return {};
  if(DF.ana[sid])return DF.ana[sid];
  try{DF.ana[sid]=(await FB.db.ref('analysis/'+sid).once('value')).val()||{};}
  catch(e){DF.ana[sid]={};}
  return DF.ana[sid];
}
/* 분석 의견 HTML — 원본과 같이 AI 산출 HTML 을 씻어서 그대로 렌더한다(레거시 문자열 값도 수용) */
function dfAitHTML(sid){
  const m=DF.ana[sid];
  const v=(typeof m==='string')?m:((m||{})[S.dfRm]||'');
  if(!v)return '<p style="color:var(--lbl3)">이 달의 AI 분석이 없습니다.</p>';
  return (typeof DOMPurify!=='undefined')?DOMPurify.sanitize(v):esc(v);
}
/* 현재 열어 둔 현장의 처리계획·분석 의견 실시간 구독 — 원본(fb2SubSite)과 같은 동작.
   내가 입력 중인 칸은 건드리지 않는다(타이핑을 실시간 수신이 덮어쓰는 사고 방지). */
function dfSubSite(sid){
  const skey=dfRm()+'/'+sid;   /* 기준월이 바뀌면 vac 경로도 바뀐다 — rm 포함 키로 재구독 */
  if(DF._sub&&DF._sub.sid===skey)return;
  if(DF._sub)DF._sub.offs.forEach(f=>{try{f();}catch(e){}});
  DF._sub={sid:skey,offs:[]};
  if(!S.live||!FB.db||!sid)return;
  /* 공가 수(미분양·미키불출)는 하자처리 현황이 원 소스 — 그쪽에서 수정하면 즉시 따라간다(226차: '연동 안 됨' 지적의 원인) */
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
  const aref=FB.db.ref('analysis/'+sid);
  const ah=aref.on('value',snap=>{
    DF.ana[sid]=snap.val()||{};
    const el=$('#dfAit');if(el)el.innerHTML=dfAitHTML(sid);
  });
  DF._sub.offs.push(()=>aref.off('value',ah));
}
/* ── 차트 공통 — 원본과 같은 구성, 색은 토큰에서 읽는다 ── */
function cvar(n,f){try{const v=getComputedStyle(document.documentElement).getPropertyValue(n).trim();return v||f;}catch(e){return f;}}
function dfC(k){if(DF.ch[k]){DF.ch[k].$destroyed=true;try{DF.ch[k].destroy();}catch(e){}delete DF.ch[k];}}
function dfChartInit(){
  if(typeof Chart==='undefined')return false;
  if(window.ChartDataLabels&&!Chart.__dlOff){Chart.register(ChartDataLabels);
  /* 원본과 동일한 툴팁 위치 — 가장 높은 지점 위에 뜨는 'aboveAll'(app-core.js 774) */
  if(Chart.Tooltip&&!Chart.Tooltip.positioners.aboveAll){
    Chart.Tooltip.positioners.aboveAll=function(items,evt){
      if(!items.length)return false;
      let minY=Infinity,sumX=0;
      for(const it of items){const p=it.element.tooltipPosition();if(p.y<minY)minY=p.y;sumX+=p.x;}
      const x=sumX/items.length;
      const y=Math.max(this.chart.chartArea.top+4,minY-16);
      return{x,y};
    };
  }Chart.defaults.set('plugins.datalabels',{display:false});Chart.__dlOff=true;}
  if(!Chart.__ctReg){Chart.register({id:'centerText',afterDraw(chart,_,opts){if(!opts||!opts.display)return;const{ctx,chartArea:{left,right,top,bottom}}=chart;const cx=(left+right)/2,cy=(top+bottom)/2;ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=opts.valueColor||cvar('--lbl','#1C1C1E');ctx.font=`700 ${opts.valueSize||16}px 'Pretendard Variable',Pretendard,sans-serif`;ctx.fillText(opts.value||'',cx,cy-2);ctx.fillStyle=opts.labelColor||cvar('--ch-axis','rgba(60,60,67,.58)');ctx.font=`600 ${opts.labelSize||11}px 'Pretendard Variable',Pretendard,sans-serif`;ctx.fillText(opts.label||'',cx,cy+14);ctx.restore();}});Chart.__ctReg=true;}
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
  const dark=document.documentElement.classList.contains('dark');
  const ink=cvar('--lbl','#1C1C1E'),grid=cvar('--ch-grid','rgba(0,0,0,.05)'),axisT=cvar('--ch-axis','rgba(60,60,67,.42)');
  const stroke=cvar('--bg2',dark?'#212121':'#fff');
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
  const _pr=/^pr/.test(key);   /* 인쇄용 캔버스 — 231차 지시로 축 제목·눈금·점 크기 축소 */
  const _atSize=_pr?9:((typeof window!=='undefined'&&window.innerWidth<=768)?10:13);
  const _tkSize=_pr?8:((typeof window!=='undefined'&&window.innerWidth<=768)?9:12);   /* 231차: 인쇄 축 수치도 축소 */
  const innerDl=(color)=>({display:ctx=>window.innerWidth>768&&dfMoDLCfg(ctx).showInner&&ctx.dataset.data[ctx.dataIndex]>0,opacity:opIn,anchor:'center',align:'center',color,font:ctx=>({size:dfMoDLCfg(ctx).size,weight:600}),formatter:v=>v.toLocaleString()});
  const ds=[
    {type:'bar',label:'60일 이상',data:rows.map(x=>Number(x.lt60)||0),backgroundColor:cvar('--ch-d60','#DA6A60'),hoverBackgroundColor:cvar('--ch-d60h','#C65A50'),pointStyle:'rectRounded',stack:'u',borderRadius:0,borderSkipped:false,yAxisID:'y',order:3,animations:barAnim,datalabels:innerDl('#fff')},
    {type:'bar',label:'30~59일',data:rows.map(x=>(Number(x.lt)||0)-(Number(x.lt60)||0)),backgroundColor:cvar('--ch-d30','#E89C9A'),hoverBackgroundColor:cvar('--ch-d30h','#C76F6D'),pointStyle:'rectRounded',stack:'u',borderRadius:0,borderSkipped:false,yAxisID:'y',order:3,animations:barAnim,datalabels:innerDl(cvar('--ch-lbl2','#7A3434'))},
    {type:'bar',label:'30일 미만',data:rows.map(x=>(Number(x.u)||0)-(Number(x.lt)||0)),backgroundColor:cvar('--ch-d0','#B3C7DD'),hoverBackgroundColor:cvar('--ch-d0h','#7E9BBC'),pointStyle:'rectRounded',stack:'u',borderRadius:0,borderSkipped:false,yAxisID:'y',order:3,animations:barAnim,
      datalabels:{labels:{value:innerDl(cvar('--ch-lbl','#1F2B4C')),
        total:{display:ctx=>{if(window.innerWidth<=768)return false;const t=rows[ctx.dataIndex]?Number(rows[ctx.dataIndex].u)||0:0;if(t<=0)return false;const c=dfMoDLCfg(ctx),n=ctx.chart.data.labels.length;return c.totalEvery===1||ctx.dataIndex%c.totalEvery===0||ctx.dataIndex===n-1;},opacity:op,anchor:'end',align:'end',offset:2,clip:false,color:ink,font:ctx=>({size:dfMoDLCfg(ctx).size,weight:700}),textStrokeColor:stroke,textStrokeWidth:4,formatter:(v,ctx)=>{const t=Number(rows[ctx.dataIndex].u)||0;return t>0?t.toLocaleString():'';}}}}},
    {type:'line',label:'전체 접수',data:cumR,borderColor:cvar('--ch-recv','#3E71D2'),backgroundColor:stroke,pointBackgroundColor:stroke,pointBorderColor:cvar('--ch-recv','#3E71D2'),pointBorderWidth:_pr?1.2:2,tension:.4,pointRadius:_pr?2.2:4,pointHoverRadius:8,pointHoverBorderWidth:3,pointHoverBackgroundColor:cvar('--ch-recv','#3E71D2'),pointHoverBorderColor:'#fff',hoverBorderWidth:3.5,borderWidth:2.5,fill:false,yAxisID:'y1',order:1,animations:lineAnim,
      datalabels:{display:ctx=>window.innerWidth>768&&(ctx.dataIndex===0||ctx.dataIndex===ctx.dataset.data.length-1),opacity:op,anchor:'center',align:ctx=>ctx.dataIndex===0?'right':'left',offset:8,clip:false,color:cvar('--ch-dlr','#2C437C'),font:{size:11,weight:700},textStrokeColor:stroke,textStrokeWidth:4,textShadowColor:'rgba(0,0,0,.2)',textShadowBlur:3,formatter:v=>v.toLocaleString()}},
    {type:'line',label:'처리 완료',data:cumRes,borderColor:cvar('--ch-done','#F0B144'),backgroundColor:stroke,pointBackgroundColor:stroke,pointBorderColor:cvar('--ch-done','#F0B144'),pointBorderWidth:_pr?1.2:2,tension:.4,pointRadius:_pr?2.2:4,pointHoverRadius:8,pointHoverBorderWidth:3,pointHoverBackgroundColor:cvar('--ch-done','#F0B144'),pointHoverBorderColor:'#fff',hoverBorderWidth:3.5,borderWidth:2.5,fill:false,yAxisID:'y1',order:0,animations:lineAnim,
      datalabels:{display:ctx=>window.innerWidth>768&&(ctx.dataIndex===0||ctx.dataIndex===ctx.dataset.data.length-1),opacity:op,anchor:'center',align:ctx=>ctx.dataIndex===0?'right':'left',offset:8,clip:false,color:cvar('--ch-dld','#A0590A'),font:{size:11,weight:700},textStrokeColor:stroke,textStrokeWidth:4,textShadowColor:'rgba(0,0,0,.2)',textShadowBlur:3,formatter:v=>v.toLocaleString()}}];
  DF.ch[key]=new Chart(el,{data:{labels:rows.map(x=>`${Number(x.m)||0}월\n${Number(x.w)||0}주`),datasets:ds},
    options:{responsive:true,maintainAspectRatio:false,
      animation:{duration:DUR,easing:'easeOutQuart',onComplete(ac){if(!ac.initial||ac.chart.$dlShown)return;ac.chart.$dlShown=true;const ch=ac.chart,t0=performance.now(),fd=350;const tick=()=>{if(!ch||ch.$destroyed||!ch.ctx)return;try{const p=Math.min(1,(performance.now()-t0)/fd);ch.$la=p*p*(3-2*p);ch.update('none');if(p<1)requestAnimationFrame(tick);}catch(e){console.warn('label fade tick aborted',e);}};requestAnimationFrame(tick);}},
      plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false,position:'aboveAll',yAlign:'top',caretPadding:6,padding:12,usePointStyle:true,boxWidth:10,boxHeight:10,boxPadding:6,callbacks:{label:ctx=>`${ctx.dataset.label}: ${(ctx.parsed.y??ctx.parsed??0).toLocaleString()}건`}}},
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
function dfDonutDraw(key,cid,lgid,items){
  if(!dfChartInit())return;
  const el=document.getElementById(cid);if(!el)return;
  dfC(key);
  const data=(items||[]).filter(x=>x&&Number(x.c)>0);
  const lg=document.getElementById(lgid);
  if(!data.length){if(lg)lg.innerHTML='<div class="dn-empty">자료 없음</div>';return;}
  const tot=data.reduce((a,x)=>a+Number(x.c),0);
  const border=cvar('--bg2',document.documentElement.classList.contains('dark')?'#212121':'#fff');
  /* 원본 app-view.js 911·919행 문자 그대로 — pointStyle:'circle'·caretPadding:32 포함,
     animation 옵션은 원본처럼 지정하지 않는다(도넛 기본 회전·원호 이징까지 동일해야 한다).
     유일 편차: DF.noAnim(전용 인쇄·사이드바 토글) 때만 duration 0 을 덧씌우는 어댑터 한 줄. */
  DF.ch[key]=new Chart(el,{type:'doughnut',data:{labels:data.map(d=>d.t),datasets:[{data:data.map(d=>Number(d.c)),backgroundColor:data.map((d,i)=>DF_PAL[i%DF_PAL.length]),borderWidth:3,borderColor:border,pointStyle:'circle',hoverOffset:12,hoverBorderWidth:3}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:14},cutout:'58%',
      ...(DF.noAnim?{animation:{duration:0}}:{}),
      /* 231차 지시: 인쇄본에서 도넛 안 글자가 커 보인다 — 인쇄용 캔버스(prSx/prMx)만 축소.
         화면은 원본과 동일한 기본값(16/11)을 그대로 둔다. */
      plugins:{centerText:{display:true,value:tot.toLocaleString()+'건',label:'미처리',
        ...(/^pr/.test(key)?{valueSize:13,labelSize:8}:{})},legend:{display:false},
        tooltip:{caretPadding:32,padding:12,usePointStyle:true,boxWidth:10,boxHeight:10,boxPadding:6,callbacks:{labelPointStyle:()=>({pointStyle:'circle',rotation:0}),label:ctx=>`${ctx.label}: ${ctx.parsed.toLocaleString()}건 (${tot>0?(ctx.parsed/tot*100).toFixed(1):0}%)`}},datalabels:{display:false}}}});
  if(lg){
    /* 원본과 동일: 범례는 항상 2열 — --lgr(행수)로 좌열부터 세로 채움. 폭 조건 토글은 원본에 없다(225차 철회). */
    lg.classList.add('lg-2col');
    lg.style.setProperty('--lgr',String(Math.max(1,Math.ceil(data.length/2))));
    lg.innerHTML=data.map((d,i)=>`<div class="it" data-idx="${i}"${d.full?` data-tt="${esc(d.full)}" aria-label="${esc(d.full)}"`:''} data-tip="${esc(d.full||d.t)}"><span class="l"><span class="dt" style="background:${DF_PAL[i%DF_PAL.length]}"></span><span class="nm">${esc(d.t)}</span></span><span class="cnt">${Number(d.c).toLocaleString()}건</span><span class="pct">${tot>0?(Number(d.c)/tot*100).toFixed(1):0}%</span></div>`).join('');
    lg.querySelectorAll('.it').forEach(it=>{
      it.addEventListener('mouseenter',()=>{const ch=DF.ch[key];if(!ch)return;const idx=Number(it.dataset.idx);ch.setActiveElements([{datasetIndex:0,index:idx}]);if(ch.tooltip)ch.tooltip.setActiveElements([{datasetIndex:0,index:idx}],{x:0,y:0});ch.update();});
      it.addEventListener('mouseleave',()=>{const ch=DF.ch[key];if(!ch)return;ch.setActiveElements([]);if(ch.tooltip)ch.tooltip.setActiveElements([],{x:0,y:0});ch.update();});
    });
  }
}
function dfDonutCardHTML(title,cid,lgid){return `<div class="card"><div class="ct cardttl">${esc(title)}</div><div class="dn-side"><div class="canv"><canvas id="${cid}"></canvas></div><div class="lg lg-2col" id="${lgid}"></div></div></div>`;}
/* 전월대비 실적 현황 — 원본과 같은 가로 막대(전월/금월 + 증감 배지) */
function dfMomRender(elId,tot){
  const el=document.getElementById(elId);if(!el)return;
  const M=[
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
  requestAnimationFrame(()=>{el.querySelectorAll('.fl').forEach((fl,i)=>{setTimeout(()=>{fl.style.width=fl.dataset.w+'%';},60+i*40);});});
}
/* KPI 카드 — 원본 kc 구조(라벨/큰 값/메타 + 우상단 '목록 보기') */
function dfKcHTML(list){
  return '<div class="akpi">'+list.map(k=>`<div class="kc ${k.cls}${k.act?' kc-click':''}"${k.act?` data-act="rec.list" data-sid="${esc(k.sid||'')}" data-scope="${k.act}"`:''}${k.tt?` data-tip="${esc(k.tt)}"`:''}><div class="kl">${k.label}</div><div class="kv">${k.valHTML!==undefined?k.valHTML:k.val.toLocaleString()+(k.unit?`<span class="u">${k.unit}</span>`:'')}</div><div class="km">${k.meta}</div>${k.act?`<span class="kc-cta"><span class="kc-cta-t">목록 보기</span> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></span>`:''}</div>`).join('')+'</div>';
}
/* 주요 이슈 — 게시본 HTML 그대로(원본 .ic 카드). 남이 만든 HTML 이므로 반드시 DOMPurify 로 씻는다 */
function dfInsightHTML(html){
  const raw=String(html||'').trim();
  /* 게시본 이슈는 정적 HTML 이다 — 원본이 붙여 둔 '펼치기' 툴팁만 떼어 오해를 없앤다
     (상세 집계는 게시본에 실리지 않아 이 앱에서는 펼칠 수 없다) */
  const inner=raw?String((typeof DOMPurify!=='undefined')?DOMPurify.sanitize(raw):esc(raw)).replace(/\sdata-tt="펼치기"/g,'')
    :'<div class="ic warn"><div class="ic-i"><svg viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/></svg></div><div class="ic-t"><div class="ic-ttl">주요 이슈 없음</div><div class="ic-sub">이 게시본에는 주요 이슈가 포함되지 않았습니다 · 재게시하면 표시됩니다.</div></div></div>';
  return `<div class="card"><div class="sh"><div class="ct cardttl">주요 이슈 및 분석 의견</div><span class="df-sub">${esc(S.dfRm)} 게시본</span></div><div class="ins-grid">${inner}</div></div>`;
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
    +`<td>${dfLtrBar(s.name,st.unr,st.dd[2],st.dd[1],st.dd[0])}</td>`
    +`<td class="cc" style="white-space:nowrap"><span class="ba ${b2.dBadge}" data-tip="전월 ${st.prev.lt.toLocaleString()} → 금월 ${st.lt.toLocaleString()}">${b2.dArrow} ${b2.dTxt}</span></td></tr>`;
}
function dfDashSort(all){
  const so=S.dfSort;if(!so||!so.col)return all;
  const gv=({s,st})=>({region:s.region,name:s.name,units:s.units||0,tR:st.tR,res:st.res,rate:st.rate,unr:st.unr,deltaUnr:st.unr-st.prev.unr,lt:st.lt,ltr:st.ltr,delta:st.lt-st.prev.lt}[so.col]);
  return all.slice().sort((a,b)=>{const va=gv(a),vb=gv(b);
    if(typeof va==='string')return so.dir*String(va).localeCompare(String(vb),'ko');
    return so.dir*(va-vb);});
}
const DF_DASH_TH=[['region','권역','cc','7.7%'],['name','현장명','','16.75%'],['units','세대수','n','7.2%'],['tR','전체 접수','n','7.2%'],['res','처리','n','7.2%'],['rate','처리율','n','7.2%'],['unr','미처리','n','7.2%'],['deltaUnr','전월대비','cc','7.2%'],['lt','장기미처리','n','7.2%'],['ltr','장기미처리 비율','cc','17.75%'],['delta','전월대비','cc','7.2%']];
function dfDashTheadHTML(){
  const so=S.dfSort||{};
  return '<thead><tr>'+DF_DASH_TH.map(([k,t,cls,w])=>{
    const act=so.col===k;
    return`<th class="${cls}${act?' act':''}" style="width:${w}${cls==='cc'?';white-space:nowrap':''}" data-act="df.sort.dash" data-key="${k}" tabindex="0">${t} <span class="sortmk">${act?(so.dir===1?'▲':'▼'):'↕'}</span></th>`;}).join('')+'</tr></thead>';
}
function dfDashTableFill(d){
  const tbl=$('#dfDashTbl');if(!tbl)return;
  if(S.dfAxDash==='co'){dfDashCoFill(tbl);return;}
  const ttl=$('#dfDashAxTtl');if(ttl)ttl.textContent='현장별 하자처리현황';
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
    foot=`<tfoot><tr class="tot"><td class="cc"></td><td><b>합계</b></td><td class="n">${T.units.toLocaleString()}</td><td class="n">${T.tR.toLocaleString()}</td><td class="n" style="color:var(--gn)">${T.res.toLocaleString()}</td><td class="n">${rate.toFixed(1)}%</td><td class="n" style="color:var(--am)">${T.unr.toLocaleString()}</td><td class="cc" style="white-space:nowrap"><span class="ba ${b1.dBadge}" data-tip="전월 ${T.pU.toLocaleString()} → 금월 ${T.unr.toLocaleString()}">${b1.dArrow} ${b1.dTxt}</span></td><td class="n" style="color:var(--rd)">${T.lt.toLocaleString()}</td><td>${dfLtrBar('합계',T.unr,T.d60,T.d30,T.d0)}</td><td class="cc" style="white-space:nowrap"><span class="ba ${b2.dBadge}" data-tip="전월 ${T.pLt.toLocaleString()} → 금월 ${T.lt.toLocaleString()}">${b2.dArrow} ${b2.dTxt}</span></td></tr></tfoot>`;
  }
  tbl.innerHTML=dfDashTheadHTML()+'<tbody>'+rows+'</tbody>'+foot;
}
/* 대시보드 업체별 축 — 현장별 coAgg 를 업체 기준으로 합친다(원본 dashCoAgg). 상위 10 + 나머지 한 줄 */
/* 업체별 하자처리현황 집계 — 대시보드 표·보고서 양식 공용 */
/* 범례·보고서용 짧은 현장명 — '힐스테이트'는 어디에 붙어 있든 뗀다(갑천1 트리풀시티 힐스테이트 등) */
function dfShortSite(nm){
  const s2=String(nm||'').replace(/힐스테이트/g,'').replace(/\s{2,}/g,' ').trim().replace(/^[·\-\s]+|[·\-\s]+$/g,'');
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
  const ttl=$('#dfDashAxTtl');if(ttl)ttl.textContent='업체별 하자처리현황';
  $$('#dfDashAx button').forEach(b=>b.classList.toggle('on',b.dataset.ax==='co'));
  const rm=dfRm(),list=dfDashSites();
  const miss=list.some(s=>DF.kpi[rm+'/'+s.id]===undefined);
  const H=['NO','시공업체','주요 공종','전체 접수','처리','처리율','미처리','전월대비','장기미처리','장기미처리 비율','전월대비'];
  const W=[7.7,16.75,7.2,7.2,7.2,7.2,7.2,7.2,7.2,17.75,7.2];
  const CLS=['cc','','cc','n','n','n','n','cc','n','cc','cc'];
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
    const name=opt.tot?`<b>${esc(x.key)}</b>`:muted?`<b style="color:var(--lbl3);font-style:italic">${esc(x.key)}</b>`:`<b style="color:var(--bt1)">${esc(x.key)}</b>`;
    return`<tr${opt.tot?' class="tot"':''}><td class="cc">${muted?'':(i+1)}</td><td>${name}</td><td class="cc">${muted?'-':esc(x.side||'-')}</td>`
      +`<td class="n">${x.r.toLocaleString()}</td><td class="n" style="color:var(--gn)">${x.res.toLocaleString()}</td><td class="n" style="font-weight:600">${rate.toFixed(1)}%</td>`
      +`<td class="n" style="color:var(--am)">${x.u.toLocaleString()}</td><td class="cc" style="white-space:nowrap"><span class="ba ${b1.dBadge}" data-tip="전월 ${x.pu.toLocaleString()} → 금월 ${x.u.toLocaleString()}">${b1.dArrow} ${b1.dTxt}</span></td>`
      +`<td class="n" style="color:var(--rd)">${x.lt.toLocaleString()}</td><td>${dfLtrBar(x.key,x.u,x.d60,x.d30,x.d0)}</td>`
      +`<td class="cc" style="white-space:nowrap"><span class="ba ${b2.dBadge}" data-tip="전월 ${x.plt.toLocaleString()} → 금월 ${x.lt.toLocaleString()}">${b2.dArrow} ${b2.dTxt}</span></td></tr>`;};
  const T=rows.reduce((a,r)=>{a.r+=r.r;a.res+=r.res;a.u+=r.u;a.lt+=r.lt;a.d0+=r.d0;a.d30+=r.d30;a.d60+=r.d60;a.pu+=r.pu;a.plt+=r.plt;return a;},{r:0,res:0,u:0,lt:0,d0:0,d30:0,d60:0,pu:0,plt:0});
  const body=ordered.length?ordered.map((x,i)=>rowH(x,i,{muted:!!(x.fold||x.key==='(미기재)')})).join('')
    :'<tr><td colspan="11" style="text-align:center;padding:14px;color:var(--lbl3)">이 게시본에는 업체별 자료가 없습니다 · 재게시하면 보입니다</td></tr>';
  const tfoot=ordered.length?`<tfoot>${rowH(Object.assign({},T,{key:'합계',side:''}),0,{tot:true})}</tfoot>`:'';
  tbl.innerHTML=thead+'<tbody>'+body+'</tbody>'+tfoot;
}
/* 월별 하자처리현황 (대시보드) — 원본 buildDashMonthTable 포트. 현장별 weekly 를 월말 carry-forward 합산 */
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
    return`<tr><td class="cc mcell">${mo}월</td><td class="cc recv-total tl-grp">${dfNF(m.tR)}</td><td class="cc recv-weekly">${dfNF(m.recvW)}</td><td class="cc proc-blue tl-grp">${dfNF(m.cumRes)}</td><td class="rate-col proc-blue">${m.rate.toFixed(1)}%</td><td class="cc proc-blue">${dfNF(m.resW)}</td><td class="cc">${dfDlt(m.resWDlt,first,m.resW,'월')}</td><td class="cc unr-red tl-grp">${dfNF(m.unr)}</td><td class="cc">${dfDlt(m.unrDlt,first,m.unr,'월')}</td>${dfLtrCells(m.d0,m.d30,m.d60,m.unr,m.ltDlt,first,'월')}</tr>`;}).join('');
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
    {cls:'wh',label:'미처리',val:tU,unit:'건',meta:`세대당 ${units>0?(tU/units).toFixed(1):'0.0'}건`,act:'ul',sid:'',tt:'팀 전체 미처리 목록 보기'},
    {cls:'wh',label:'장기미처리(30일+)',val:tLt,unit:'건',meta:`미처리의 ${tU>0?(tLt/tU*100).toFixed(1):0}%`,act:'lul',sid:'',tt:'팀 전체 장기미처리 목록 보기'}]);
  const dashYears=[...new Set(Object.values(d.wk||{}).flatMap(dfYearsOf))].sort();
  const rmY=S.dfRm.slice(0,4);
  const dashYear=(dashYears.includes(S.dfTrendYearDash)?S.dfTrendYearDash:rmY);
  const dashWks=dashYear===rmY?d.wks:dfDashWksOfYear(d.wk,dashYear);
  root.innerHTML=kpis
    +dfTrendCardHTML('dfTrend','dash',dashYears,dashYear)
    +`<div class="opsr"><div class="card"><div class="ct cardttl">전월대비 실적 현황</div><div id="dfMom" class="mom-wrap"></div></div>${dfDonutCardHTML('현장별 미처리 분포','dfSx','dfSxLg')}</div>`
    +`<div class="opsr">${dfInsightHTML(d.ins)}${dfDonutCardHTML('공종별 미처리 분포','dfMx','dfMxLg')}</div>`
    +`<div class="card mb12"><div class="sh"><div class="ct cardttl">월별 하자처리현황</div><select class="yr-sel" id="dfMoYr" data-act="df.moYear" aria-label="월별 연도 선택"></select></div><div style="overflow-x:auto"><table class="dt dt-detail" style="table-layout:fixed" id="dfDashMo"></table></div></div>`
    +`<div class="card mb12"><div class="sh"><div class="st cardttl" id="dfDashAxTtl">현장별 하자처리현황</div><div class="axseg" id="dfDashAx" role="group" aria-label="묶는 기준"><button data-act="df.ax.dash" data-ax="site" class="${S.dfAxDash==='co'?'':'on'}">현장별</button><button data-act="df.ax.dash" data-ax="co" class="${S.dfAxDash==='co'?'on':''}">업체별</button></div></div><table class="dt" id="dfDashTbl" style="table-layout:fixed"></table></div>`;
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
  const ltr=x.u>0?(x.lt/x.u*100):0,pLtr=x.pu>0?(x.plt/x.pu*100):0;
  const dN=Number((ltr-pLtr).toFixed(1));
  const arrow=dN===0?'─':dN>0?'▲':'▼',sign=dN===0?'':dN>0?'+':'−',badge=dN===0?'bgr':dN>0?'brd':'bgn';
  const b1=dfDeltaParts(x.u-x.pu);
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
    +`<td>${dfLtrBar(x.key,x.u,x.d60,x.d30,x.d0)}</td>`
    +`<td class="cc" style="white-space:nowrap"><span class="ba ${badge}">${arrow} ${sign}${Math.abs(dN).toFixed(1)}p</span></td></tr>`;
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
  tbl.querySelector('tbody').innerHTML=P.rows||P.emptyRow;
  const card=tbl.closest('.card');
  if(card){
    card.querySelectorAll('.axseg button').forEach(b=>b.classList.toggle('on',b.dataset.ax===(S.dfAxSite==='co'?'co':'trade')));
    const ttl=card.querySelector('.cardttl');if(ttl)ttl.textContent=(P.ax==='co'?'업체별':'공종별')+' 하자처리현황';
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
      return`<tr><td class="cc mcell">${w.m}월</td><td class="cc recv-total tl-grp">${dfNF(m.tR)}</td><td class="cc recv-weekly">${dfNF(m.recvW)}</td><td class="cc proc-blue tl-grp">${dfNF(m.cumRes)}</td><td class="rate-col proc-blue">${m.rate.toFixed(1)}%</td><td class="cc proc-blue">${dfNF(m.resW)}</td><td class="cc">${dfDlt(m.resWDlt,first,m.resW,'월')}</td><td class="cc unr-red tl-grp">${dfNF(m.unr)}</td><td class="cc">${dfDlt(m.unrDlt,first,m.unr,'월')}</td>${dfLtrCells(m.d0,m.d30,m.d60,m.unr,m.ltDlt,first,'월')}</tr>`;}).join('');
  return `<div class="card" data-print="tl-month"><div class="sh"><div class="st cardttl">월별 현황</div>${pickerHTML||''}</div><div style="overflow-x:auto"><table class="dt dt-detail" style="table-layout:fixed">${moColgroup}${moThead}<tbody>${moBody||'<tr><td colspan="12" style="text-align:center;padding:14px;color:var(--lbl3)">데이터 없음</td></tr>'}</tbody></table></div></div>`;
}
/* 공가 탭 — 원본 vacPaneHTML. 공가 수(미분양·미키불출)는 하자처리 현황에서 입력한 값을 읽기만 한다 */
function dfVacPane(sid,stat,vacSv,kind){
  const sangga=kind==='sangga';
  const vl=sangga?'공가상가':'공가세대';
  const field=sangga?'commercialProcessingPlan':'vacantProcessingPlan';
  const _u=sangga?'호실':'세대';
  const sv=(vacSv&&(sangga?vacSv.commercialStatus:vacSv.vacantStatus))||{};
  const mb=parseInt(sv['미분양'],10)||0,mk=parseInt(sv['미키불출'],10)||0;
  const hasV=(sv['미분양']!=null&&sv['미분양']!=='')||(sv['미키불출']!=null&&sv['미키불출']!=='');
  const edit=`data-act="df.vacEdit" data-sid="${esc(sid)}" data-kind="${sangga?'sangga':'sedae'}" role="button" tabindex="0" data-tip="${vl} 수 입력"`;
  const st=stat||{T:0,Res:0,Unr:0,Rate:0,Lt:0,Units:0,Top:[],TopPrev:{}};
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
  if(k===undefined||DF.plans[site.id]===undefined||DF.ana[site.id]===undefined){
    root.innerHTML=dfNoneHTML(site.name+' 자료를 불러오는 중입니다…');
    Promise.all([dfSiteData(site.id),dfLoadPlans(site.id),dfLoadAna(site.id)])
      .then(()=>{if(S.view==='defect'&&S.dfSid===site.id)rDefect();});
    return;
  }
  dfSubSite(site.id);   /* 처리계획·분석 의견 실시간 반영 */
  if(!k){root.innerHTML=dfNoneHTML('이 현장의 게시 자료가 없습니다.');return;}
  const st=k;
  const units=site.units||0;
  const compDate=site.completionDate?` · ${site.completionDate}`:'';
  const kpis=dfKcHTML([
    {cls:'bl kc-site',label:esc(site.region||'-'),valHTML:`<span class="kc-site-nm">${esc(site.name||'-')}</span>`,meta:`${units.toLocaleString()}세대 · ${site.buildings||0}개동${compDate}`},
    {cls:'sk',label:'전체 접수',val:st.tR||0,unit:'건',meta:`세대당 ${units>0?((st.tR||0)/units).toFixed(1):'0.0'}건`},
    {cls:'ms',label:'처리 완료',val:st.res||0,unit:'건',meta:`처리율 ${(Number(st.rate)||0).toFixed(1)}%`},
    {cls:'wh',label:'미처리',val:st.unr||0,unit:'건',meta:`세대당 ${units>0?((st.unr||0)/units).toFixed(1):'0.0'}건`,act:'ul',sid:site.id,tt:'미처리 하자리스트 보기'},
    {cls:'wh',label:'장기미처리(30일+)',val:st.lt||0,unit:'건',meta:`미처리의 ${(Number(st.ltr)||0).toFixed(1)}%`,act:'lul',sid:site.id,tt:'장기미처리 하자리스트 보기'}]);
  /* 탭 — 원본과 같은 구성(공가세대/공가상가는 현장 설정에 따라) */
  const showSedae=site.showVacant!==false,showSangga=!!site.hasCommercial;
  let tab=S.dfTab||'sum';
  if(tab==='vac'&&!showSedae)tab='sum';
  if(tab==='store'&&!showSangga)tab='sum';
  S.dfTab=tab;
  const tnav=`<div class="tnav">
    <button class="tnav-i${tab==='sum'?' act':''}" data-act="df.tab" data-t="sum"><svg class="icn icn-sm" aria-hidden="true"><use href="#i-chart"></use></svg>종합</button>
    <button class="tnav-i${tab==='lt'?' act':''}" data-act="df.tab" data-t="lt"><svg class="icn icn-sm" aria-hidden="true"><use href="#i-warn"></use></svg>장기미처리</button>
    ${showSedae?`<button class="tnav-i${tab==='vac'?' act':''}" data-act="df.tab" data-t="vac"><svg class="icn icn-sm" aria-hidden="true"><use href="#i-home"></use></svg>공가세대</button>`:''}
    ${showSangga?`<button class="tnav-i${tab==='store'?' act':''}" data-act="df.tab" data-t="store"><svg class="icn icn-sm" aria-hidden="true"><use href="#i-build"></use></svg>공가상가</button>`:''}
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
      <div class="card" data-print="ov-analysis"><div class="sh"><div class="st cardttl">종합 분석 의견</div></div><div class="aib"><div class="ail">AI 분석</div><div class="ait" id="dfAit">${dfAitHTML(site.id)}</div></div></div>
    </div>`;
  }else if(tab==='lt'){
    const ltrMomBar=dfLtrMomHTML(st);
    const P=dfAxParts(site.id,st);
    const sortTh=(txt,type,cls,w)=>`<th class="${cls}" style="width:${w}${cls==='cc'?';white-space:nowrap':''}" data-sort data-sort-type="${type}" tabindex="0" data-act="df.sort.tbl" data-tbl="dfTrade-${esc(site.id)}">${txt} <span class="sortmk">↕</span></th>`;
    body=`<div class="as">
      ${ltrMomBar}
      <div class="card"><div class="sh"><div class="st cardttl">장기미처리 상위 5개 공종 처리 현황</div></div><table class="dt" style="table-layout:fixed">${DF_TOP5_THEAD}<tbody>${dfTop5Rows(site.id,st.topLt,st.topLtPrev,st.lt||0,'processingPlan','')}</tbody></table></div>
      <div class="card"><div class="sh"><div class="st cardttl">${P.ax==='co'?'업체별':'공종별'} 하자처리현황</div><div class="axseg" role="group" aria-label="묶는 기준"><button class="${P.ax==='trade'?'on':''}" data-act="df.ax.site" data-ax="trade">공종별</button><button class="${P.ax==='co'?'on':''}" data-act="df.ax.site" data-ax="co">업체별</button></div></div><table class="dt" style="table-layout:fixed" id="dfTrade-${esc(site.id)}"><thead><tr>${sortTh('NO','num','cc','6%')}${sortTh(P.ax==='co'?'시공업체':'공종','str','','11%')}${sortTh(P.ax==='co'?'주요 공종':'시공업체','str','','11%')}${sortTh('전체 접수','num','n','7%')}${sortTh('처리','num','n','7%')}${sortTh('처리율','num','cc','7%')}${sortTh('미처리','num','cc','7%')}${sortTh('전월대비','num','cc','6%')}${sortTh('장기미처리','num','n','7%')}<th class="cc" style="width:25%">장기미처리 비율</th>${sortTh('전월대비','num','cc','6%')}</tr></thead><tbody>${P.rows||P.emptyRow}</tbody></table></div>
    </div>`;
  }else if(tab==='vac'){
    body=dfVacPane(site.id,st.vacU||{T:st.vT,Res:st.vRes,Unr:st.vUnr,Rate:st.vRate,Lt:st.vLt,Units:st.vUnits,Top:st.vTop,TopPrev:st.vTopPrev},DF.vac[key],'sedae');
  }else if(tab==='store'){
    body=dfVacPane(site.id,st.vacS,DF.vac[key],'sangga');
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
        return`<tr class="${lastOfMonth?'mend':''}">${monthCell}<td class="cc">${w.wn}주</td><td class="cc recv-total tl-grp">${dfNF(m.tR)}</td><td class="cc recv-weekly">${dfNF(m.recvW)}</td><td class="cc proc-blue tl-grp">${dfNF(m.cumRes)}</td><td class="rate-col proc-blue">${m.rate.toFixed(1)}%</td><td class="cc proc-blue">${dfNF(m.resW)}</td><td class="cc">${dfDlt(m.resWDlt,first,m.resW,'주')}</td><td class="cc unr-red tl-grp">${dfNF(m.unr)}</td><td class="cc">${dfDlt(m.unrDlt,first,m.unr,'주')}</td>${dfLtrCells(m.d0,m.d30,m.d60,m.unr,m.ltDlt,first,'주')}</tr>`;}).join('');
    const wkThead=`<thead><tr>${dfTh('','월')}${dfTh('','주차')}${dfThG('','전체 접수')}${dfTh('recv-sub','주간 접수')}${dfThG('','전체 처리')}${dfTh('rate-col','처리율')}${dfTh('','주간 처리')}${dfTh('','전월대비')}${dfThG('','전체 미처리')}${dfTh('','전월대비')}${dfTh('tl-grp-ltr','장기미처리')}<th class="cc tl-grp-ltr">장기미처리 비율</th><th class="cc">전월대비</th></tr></thead>`;
    body=`<div class="as">
      ${dfMonthCardHTML(st,curYear,yrPicker)}
      <div class="card"><div class="sh"><div class="st cardttl">주차별 현황</div></div><div style="overflow-x:auto"><table class="dt dt-detail" style="table-layout:fixed">${wkColgroup}${wkThead}<tbody>${wkBody||'<tr><td colspan="13" style="text-align:center;padding:14px;color:var(--lbl3)">데이터 없음</td></tr>'}</tbody></table></div></div>
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
  const rm=dfRm();
  toast('스냅샷 준비 중 — 현장 자료 수집…');
  const d=await dfLoad();if(!d){toast('게시본이 없습니다');return;}
  await dfAllKpi();
  const sites=dfSites();
  /* ⚠ org 에 전체 현장을 담으면 뷰어에서 감춘 현장이 자료 없이 뜬다 — 자료를 담은 현장만 넣는다
     (스냅샷은 cfg 를 싣지 않으므로 dfHide 를 뷰어에서 다시 읽을 수 없다) */
  const snap={rm,org:{...S.org,sites},dash:{wks:d.wks,am:d.am,ins:d.ins,wk:d.wk},site:{},plans:{},ana:{}};
  for(const st of sites){
    const key=rm+'/'+st.id;
    if(DF.kpi[key]===undefined)await dfSiteData(st.id);
    await dfLoadPlans(st.id);await dfLoadAna(st.id);
    let ulz='';
    try{ulz=(await FB.db.ref('report/'+rm+'/'+st.id+'/ulz').once('value')).val()||'';}catch(e){}
    snap.site[st.id]={kpi:DF.kpi[key]||null,sw:DF.sw[key]||[],sam:DF.sam[key]||{},vac:DF.vac[key]||{},ulz};
    snap.plans[st.id]=DF.plans[st.id]||{};snap.ana[st.id]=DF.ana[st.id]||{};
  }
  toast('스냅샷 문서 조립 중…');
  let idx,app;
  try{
    [idx,app]=await Promise.all([fetch('./index.html').then(r=>r.text()),fetch('./app.js?v='+Date.now()).then(r=>r.text())]);
  }catch(e){toast('스냅샷 생성 실패 · 앱 파일을 불러올 수 없습니다');return;}
  /* vendor 인라인 — firebase 4종은 뺀다(스냅샷은 통신하지 않는다) */
  const tags=[...idx.matchAll(/<script src="\.\/(vendor\/[^"]+|app\.js[^"]*)"[^>]*><\/script>/g)];
  for(const m of tags){
    const src=m[1];
    if(/firebase/.test(src)){idx=idx.replace(m[0],'');continue;}
    if(/^app\.js/.test(src)){const rep='<script>\n'+app.split('</scr'+'ipt>').join('<\\/scr'+'ipt>')+'\n</scr'+'ipt>';idx=idx.replace(m[0],()=>rep);continue;}
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
  a.download='하자처리현황_스냅샷_'+rm+'.html';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  toast('스냅샷을 내려받았습니다 · '+rm);
}
/* 스냅샷 문서로 열렸을 때 — FB 대신 박아 둔 자료를 읽는다. 쓰기는 전부 무시 */
function dfSnapBoot(){
  let snap=null;
  try{snap=JSON.parse(LZString.decompressFromBase64(window.__SNAP_Z__));}catch(e){}
  if(!snap)return false;
  const tree={report:{[snap.rm]:{_dash:{wks:snap.dash.wks,am:snap.dash.am,insightsHTML:snap.dash.ins}}},plans:snap.plans,analysis:snap.ana,siteConfig:{},reportIndex:{[snap.rm]:1}};
  Object.keys(snap.site||{}).forEach(sid=>{
    const v=snap.site[sid];
    tree.report[snap.rm][sid]={kpi:v.kpi,siteWks:v.sw,siteAm:v.sam,vac:v.vac,ulz:v.ulz};
  });
  const walk=(o,ps)=>{let c=o;for(const k of ps){if(c==null)return null;c=c[k];}return c==null?null:c;};
  S.live=true;
  FB.db={ref:p=>({
    once:async()=>({val:()=>{const v=walk(tree,String(p||'').split('/').filter(Boolean));return v===undefined?null:v;}}),
    on:(ev,cb)=>{const v=walk(tree,String(p||'').split('/').filter(Boolean));setTimeout(()=>cb&&cb({val:()=>v===undefined?null:v}),30);return cb;},
    off:()=>{},set:async()=>{toast('스냅샷 문서 · 저장되지 않습니다');},update:async()=>{toast('스냅샷 문서 · 저장되지 않습니다');}
  })};
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
  const hdrF=rpHdr(((team&&team.name)||'H서비스센터')+' 하자처리현황 보고',
    [`권역 <b>${esc(rgs.join(' · '))}</b>`,`관리대상현장 <b>${sites.length}개</b>`,`관리세대 <b>${rpN(units)}세대</b>`],asof);
  const hdrS=rpHdr(((team&&team.name)||'H서비스센터')+' 하자처리현황 보고',[],asof,true);

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

  const worst=[...st].sort((a,b)=>(b.c.unr||0)-(a.c.unr||0))[0];
  const avg=tR?res/tR*100:0;
  const iss=[];
  if(worst&&unr)iss.push({t:'특정 현장 집중',
    m:`<b>${esc(worst.s.name)}</b> 미처리 <b>${rpN(worst.c.unr)}건</b> — 팀 전체의 <b>${rpPct(worst.c.unr,unr)}</b>. 처리율 ${rpPct(worst.c.res,worst.c.tR)}로 팀 평균(${avg.toFixed(1)}%) 대비 ${(avg-(worst.c.tR?worst.c.res/worst.c.tR*100:0)).toFixed(1)}%p 낮음.`});
  if(lt-pLt!==0)iss.push({t:lt>pLt?'장기미처리 증가':'장기미처리 감소',
    m:`장기미처리 <b>${rpN(lt)}건</b>, 전월 대비 <b>${rpN(Math.abs(lt-pLt))}건 ${lt>pLt?'증가':'감소'}</b>. 미처리 중 비중 ${rpPct(pLt,pUnr)} → <b>${rpPct(lt,unr)}</b>.`});
  const mR=tR-pR,mRes=res-pRes;
  if(mR||mRes)iss.push({t:mRes<mR?'처리 속도 둔화':'처리 속도 개선',
    m:`월간 처리 <b>${rpN(mRes)}건</b>으로 월간 접수(${rpN(mR)}건)를 ${mRes<mR?'밑돌아 미처리 순증':'웃돌아 미처리 감소'}.`});
  const issHTML=iss.map(i=>`<div class="iss"><div class="t">${esc(i.t)}</div><div class="m">${i.m}</div></div>`).join('');

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
  const hdrF=rpHdr(site.name+' 하자처리현황 보고',
    [`권역 <b>${esc(site.region||'-')}</b>`,
     `규모 <b>${site.buildings?site.buildings+'개동 ':''}${rpN(site.units)}세대</b>`,
     `준공 <b>${esc((site.completionDate||'').replace('-','. ')+'.')}</b>`],asof);
  const hdrS=rpHdr(site.name+' 하자처리현황 보고',[],asof,true);

  const kpi=rpKpi([
    {k:'전체 접수',v:c.tR,d:`세대당 ${site.units?((c.tR||0)/site.units).toFixed(1):'0.0'}건 · ${rpDelta((c.tR||0)-(p.total||0))}`},
    {k:'처리 완료',v:c.res,d:`처리율 <b>${rpPct(c.res,c.tR)}</b> · ${rpDelta((c.res||0)-(p.res||0))}`},
    {k:'미처리',v:c.unr,d:`세대당 ${site.units?((c.unr||0)/site.units).toFixed(1):'0.0'}건 · ${rpDelta((c.unr||0)-(p.unr||0))}`},
    {k:'장기미처리',v:c.lt,d:`미처리의 <b>${rpPct(c.lt,c.unr)}</b> · ${rpDelta((c.lt||0)-(p.lt||0))}`}]);
  const trend=rpTrend(c.weekly||[])+RP_LG;

  const tops=((c.trAgg)||[]).slice().sort((a,b)=>(b.u||0)-(a.u||0));
  const iss=[];
  if(tops[0])iss.push({t:'미처리 집중 공종',
    m:`<b>${esc(tops[0].t)}</b> ${rpN(tops[0].u)}건(미처리의 <b>${rpPct(tops[0].u,c.unr)}</b>) · 시공업체 ${esc(tops[0].coTop||'-')}.`});
  if((c.lt||0)-(p.lt||0)!==0)iss.push({t:c.lt>(p.lt||0)?'장기미처리 증가':'장기미처리 감소',
    m:`장기미처리 <b>${rpN(c.lt)}건</b>, 전월 대비 <b>${rpN(Math.abs((c.lt||0)-(p.lt||0)))}건 ${c.lt>(p.lt||0)?'증가':'감소'}</b>. 미처리 중 비중 <b>${rpPct(c.lt,c.unr)}</b>.`});
  if(c.critUnr)iss.push({t:'중대하자',
    m:`사내 매뉴얼 기준 <b>${rpN(c.critUnr)}건</b>이 미처리 상태. 최우선 현장 재방문 및 정밀 진단 요망.`});
  const issHTML=iss.map(i=>`<div class="iss"><div class="t">${esc(i.t)}</div><div class="m">${i.m}</div></div>`).join('');

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

  const _am=DF.ana[sid];
  const ai=(typeof _am==='string')?_am:((_am||{})[S.dfRm]||'');
  const aiHTML=ai?`<div class="ai">${rptAI(ai)}</div>`
    :`<div class="ai"><ul><li>AI 분석이 아직 생성되지 않았습니다.</li></ul></div>`;

  const p1=rpSec(1,'종합 현황','전월 대비',kpi)+rpSec(2,'하자접수 · 처리 주차별 추이','',trend)
    +rpSec(3,'주요 이슈','전월 대비 변화·공종 간 편차 기준 자동 선별',issHTML)
    +rpSec(4,'월별 처리 현황',S.dfRm.slice(0,4)+'년 누계',moTbl);
  const p2=rpSec(5,'미처리 분포',`미처리 ${rpN(c.unr)}건 기준`,dist)
    +rpSec(6,'장기미처리 처리계획','30일 이상 · 상위 5개 공종',planTbl(ltTop,c.topLtPrev,'processingPlan',c.lt))
    +(vacTop.length?rpSec(7,'공가세대 처리계획',`공가세대 미처리 ${rpN(c.vUnr||0)}건 · 상위 ${vacTop.length}개 공종`,
        planTbl(vacTop,c.vTopPrev,'vacantProcessingPlan',c.vUnr)):'');
  const p3=rpSec(vacTop.length?8:7,'종합 분석 의견','AI 분석',aiHTML);
  return `<div class="rpt">${rpPage(1,3,hdrF,p1)}${rpPage(2,3,hdrS,p2)}${rpPage(3,3,hdrS,p3)}</div>`;
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
/* AI 분석 원문을 보고서 서식으로 — HTML 이면 스타일 걷어내고 재서식, 평문이면 소제목/목록 */
function rptAI(src){
  const s2=String(src||'').trim();
  if(/<\s*(div|ul|li|p|strong|b)\b/i.test(s2)){
    const box=document.createElement('div');
    box.innerHTML=(typeof DOMPurify!=='undefined')?DOMPurify.sanitize(s2):esc(s2);
    box.querySelectorAll('*').forEach(el=>{
      el.removeAttribute('style');el.removeAttribute('class');
      if(/^(SCRIPT|STYLE)$/.test(el.tagName))el.remove();
    });
    let out='';
    const walk=el=>{
      [...el.children].forEach(ch=>{
        const tag=ch.tagName;
        if(tag==='UL'||tag==='OL'){
          const lis=[...ch.querySelectorAll(':scope>li')].map(li=>'<li>'+li.innerHTML+'</li>').join('');
          if(lis)out+='<ul>'+lis+'</ul>';
        }else if(tag==='DIV'&&!ch.children.length){
          const txt=ch.textContent.trim();if(txt)out+='<div class="ai-h">'+esc(txt)+'</div>';
        }else if(tag==='P'){
          const txt=ch.innerHTML.trim();if(txt)out+='<ul><li>'+txt+'</li></ul>';
        }else walk(ch);
      });
    };
    walk(box);
    return out||('<ul><li>'+esc(box.textContent.trim().slice(0,400))+'</li></ul>');
  }
  const lines=s2.replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
  let out='',ul=false;
  const close=()=>{if(ul){out+='</ul>';ul=false;}};
  lines.forEach(ln=>{
    const body=ln.replace(/^[#*\u2022\-\s]+/,'').replace(/\*\*/g,'');
    if(body.length<=30&&!/[.。]$/.test(body)){close();out+='<div class="ai-h">'+esc(body)+'</div>';}
    else{if(!ul){out+='<ul>';ul=true;}out+='<li>'+esc(body)+'</li>';}
  });
  close();
  return out||'<ul><li>내용 없음</li></ul>';
}
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
function rptFont(){return localStorage.getItem('calapp.rptFont')==='sys'?'sys':'brand';}
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
      ${[['brand','기본'],['sys','맑은 고딕']].map(([f,nm])=>
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
  if(S.view!=='defect'){window.print();return;}
  const rm=dfRm();
  if(S.dfSid){
    if(DF.kpi[rm+'/'+S.dfSid]===undefined){toast('자료를 불러온 뒤 인쇄할 수 있습니다');return;}
    /* ⚠ 사전 로드가 하나라도 reject 되면 async 가 조용히 중단돼 보고서가 아예 안 뜬다(223차 점검에서 확인)
       — 네트워크 실패여도 이미 받아 둔 자료로 조립한다 */
    try{await dfLoadPlans(S.dfSid);}catch(e){console.warn('[하자] 인쇄 사전 로드(plans)',e);}
    try{await dfLoadAna(S.dfSid);}catch(e){console.warn('[하자] 인쇄 사전 로드(ana)',e);}
    try{await dfList(S.dfSid);}catch(e){console.warn('[하자] 인쇄 사전 로드(list)',e);}   /* 공종·유형별 분포는 전체 미처리 목록 기준 */
  }else{
    if(!DF.cache[rm]){toast('자료를 불러온 뒤 인쇄할 수 있습니다');return;}
    toast('현장 자료 수집 중…');
    try{await dfAllKpi();}catch(e){console.warn('[하자] 인쇄 사전 로드(kpi)',e);}
  }
  const old=document.getElementById('rptRoot');if(old)old.remove();
  /* 보고서는 A4 전면을 직접 쓴다 — 기존 @page(여백·쪽번호)를 인쇄 동안만 덮는다 */
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
  return `<div class="sp-page-hdr"><div class="ph-l"><div class="ph-team">${esc((team&&team.name)||'H서비스센터')} 하자처리현황</div><div class="ph-title">${esc(title)}</div></div><div class="ph-r"><div class="ph-label">기준일</div><div class="ph-date">${y}.${m}.${String(last).padStart(2,'0')}</div></div></div>`;
}
async function dfPrint(){
  if(S.view!=='defect'){window.print();return;}
  const site=S.dfSid?(S.org.sites||[]).find(x=>x.id===S.dfSid):null;
  const d=DF.cache[dfRm()];
  const k=site?DF.kpi[dfRm()+'/'+site.id]:null;
  if(site&&!k){toast('자료를 불러온 뒤 인쇄할 수 있습니다');return;}
  if(!site&&!d){toast('자료를 불러온 뒤 인쇄할 수 있습니다');return;}
  const wasDark=document.documentElement.classList.contains('dark');
  if(wasDark)document.documentElement.classList.remove('dark');   /* 인쇄는 항상 밝은 색(원본 printThemeSwap) */
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
      {cls:'wh',label:'미처리',val:st.unr||0,unit:'건',meta:`세대당 ${units>0?((st.unr||0)/units).toFixed(1):'0.0'}건`},
      {cls:'wh',label:'장기미처리(30일+)',val:st.lt||0,unit:'건',meta:`미처리의 ${(Number(st.ltr)||0).toFixed(1)}%`}]);
    const trend=dfPrTrendCard();
    const opsr=`<div class="opsr"><div class="card"><div class="ct cardttl">전월대비 실적 현황</div><div id="dfPrMom" class="mom-wrap"></div></div>${dfDonutCardHTML('공종별 미처리 분포','dfPrMx','dfPrMxLg')}</div>`;
    const P=dfAxParts(site.id,st);
    const tradeAll=`<div class="card"><div class="sh"><div class="st cardttl">${P.ax==='co'?'업체별':'공종별'} 하자처리현황</div></div><table class="dt" style="table-layout:fixed"><thead><tr><th class="cc" style="width:6%">NO</th><th style="width:11%">${P.ax==='co'?'시공업체':'공종'}</th><th style="width:11%">${P.ax==='co'?'주요 공종':'시공업체'}</th><th class="n" style="width:7%">전체 접수</th><th class="n" style="width:7%">처리</th><th class="cc" style="width:7%">처리율</th><th class="cc" style="width:7%">미처리</th><th class="cc" style="width:6%">전월대비</th><th class="n" style="width:7%">장기미처리</th><th class="cc" style="width:25%">장기미처리 비율</th><th class="cc" style="width:6%">전월대비</th></tr></thead><tbody>${P.rows||P.emptyRow}</tbody></table></div>`;
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
    html+=pg('sp-page-break-before',hdr()+`<div class="card"><div class="sh"><div class="st cardttl">종합 분석 의견</div></div><div class="aib"><div class="ail">AI 분석</div><div class="ait">${dfAitHTML(site.id)}</div></div></div>`);
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
      {cls:'wh',label:'미처리',val:tU,unit:'건',meta:`세대당 ${units>0?(tU/units).toFixed(1):'0.0'}건`},
      {cls:'wh',label:'장기미처리(30일+)',val:tLt,unit:'건',meta:`미처리의 ${tU>0?(tLt/tU*100).toFixed(1):0}%`}]);
    const trend=dfPrTrendCard();
    html+=pg('',hdr()+kpis+trend
      +`<div class="opsr"><div class="card"><div class="ct cardttl">전월대비 실적 현황</div><div id="dfPrMom" class="mom-wrap"></div></div>${dfDonutCardHTML('현장별 미처리 분포','dfPrSx','dfPrSxLg')}</div>`
      +`<div class="opsr">${dfInsightHTML(d.ins)}${dfDonutCardHTML('공종별 미처리 분포','dfPrMx','dfPrMxLg')}</div>`);
    html+=pg('sp-page-break-before',hdr()
      +`<div class="card"><div class="sh"><div class="ct cardttl">월별 하자처리현황</div></div><div><table class="dt dt-detail" style="table-layout:fixed" id="dfPrDashMo"></table></div></div>`
      +`<div class="card"><div class="sh"><div class="st cardttl">현장별 하자처리현황</div></div><table class="dt" id="dfPrDashTbl" style="table-layout:fixed"></table></div>`);
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
      const tb=box.querySelector('#dfPrDashTbl');
      if(tb){const keep=$('#dfDashTbl');tb.id='dfDashTbl';if(keep)keep.id='dfDashTbl_live';
        const ax=S.dfAxDash;S.dfAxDash='site';dfDashTableFill(d);S.dfAxDash=ax;
        tb.id='dfPrDashTbl';if(keep)keep.id='dfDashTbl';}
    }
  }catch(e){console.warn('[하자] 인쇄 차트 준비 실패',e);}
  await new Promise(r=>setTimeout(r,260));   /* noAnim 이라 차트는 즉시 앉는다 — 라벨 플러그인 여유만 */
  let _done=false;
  const done=()=>{if(_done)return;_done=true;window.removeEventListener('afterprint',done);
    document.body.classList.remove('df-printing');
    if(box.parentNode)box.parentNode.removeChild(box);
    ['prTrend','prMx','prSx','prMom'].forEach(dfC);
    DF.noAnim=false;
    if(wasDark)document.documentElement.classList.add('dark');};
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
    +'<div class="rl-acts">'
    +'<span class="rl-q-wrap"><svg class="icn icn-sm" aria-hidden="true"><use href="#i-search"></use></svg>'
    +'<input id="recQ" class="rl-q" placeholder="동·호·공종·내용 검색" value="'+esc(REC.q)+'" autocomplete="off"></span>'
    +'<span class="rec-n" id="recN"></span>'
    +'<button class="btn bo bsm" data-act="rec.xlsx">엑셀</button>'
    +'<button class="btn bo bsm" data-act="rec.pivot" id="recPivBtn">피벗</button>'
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
  const b=$('#mbody');if(b)b.innerHTML=recBodyHTML();
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
/* 엑셀 — 하자처리 현황과 같은 열 순서로 내보낸다 */
function recWriteXlsx(filename,aoa,sheet){
  if(typeof XLSX==='undefined'){toast('엑셀 모듈을 불러오지 못했습니다');return;}
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
   ⚠ 지금은 조직/현장 관리의 현장 목록을 쓴다. 게시본을 읽기 시작하면 게시된 현장 목록과 합쳐야 한다. */
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
    const open=S.dfFold[rid]!==undefined?S.dfFold[rid]===false
      :(S.view==='defect'&&!!S.dfSid&&list.some(x=>x.id===S.dfSid));
    return '<button class="df-reg'+(open?' open':'')+'" data-act="df.fold" data-rid="'+esc(rid)+'"'
      +' aria-expanded="'+(open?'true':'false')+'">'
      +'<svg class="icn" aria-hidden="true"><use href="#i-chevr"></use></svg>'
      +'<span class="n">'+esc(rn)+'</span></button>'
      +(open?list.map(x=>'<div class="nvi df-site'+(S.view==='defect'&&S.dfSid===x.id?' act':'')+'" role="button" tabindex="0"'
        +' data-act="df.site" data-sid="'+esc(x.id)+'" data-tip="'+esc(x.name)+'">'
        +'<span class="dot"></span><span class="nil">'+esc(x.name)+'</span></div>').join(''):'');
  }).join('');
}
/* Ctrl+P 머리(팀명·제목·기준일) — 원본 updatePrintHeader(app-boot.js 359) 이식.
   전용 인쇄 버튼과 무관하게 브라우저 인쇄에서도 머리가 나오도록 beforeprint 에서 채운다. */
function dfUpdatePrintHdr(){
  const tm=(typeof tkSel==='function'?tkSel().team:null);
  const a=$('#dfPhTeam');if(a)a.textContent=(tm&&tm.name?tm.name:'H서비스센터')+' 하자처리현황';
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
    DF.noAnim=false;
    try{Object.values(DF.ch||{}).forEach(c=>{if(c&&c.resize){c.resize();c.update('none');}});}catch(e){}
  }
});
/* 기준월은 하자 관리에서만, 인쇄는 하자 관리·주요 업무에서만 상단바에 나온다 */
function dfTopbar(){
  const on=S.view==='defect';
  const rm=$('#tbRm'),pw=$('#tbPrintWrap');
  if(rm){rm.hidden=!on;rm.textContent=S.dfRm||'기준월 없음';}
  if(pw)pw.hidden=!(on||S.view==='report');   /* 인쇄가 필요한 화면은 이 둘뿐 — 달력·업무 목록에는 없다 */
}

/* ═══════════ 보류함 — 일자 패널 아래. 달력 날짜로 끌어다 놓으면 그 날짜로 되살아난다 ═══════════ */
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
  if(!list.length){box.innerHTML='<div class="hold-empty">내 보류 업무가 없습니다.</div>';return;}
  const md=x=>{if(!x)return '기한 없음';const t=toDate(x);return (t.getMonth()+1)+'/'+t.getDate();};
  box.innerHTML=list.map(({sid,iid,it})=>
    '<div class="hold-i" draggable="true" data-act="hold.go" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'"'
    +' data-tip="누르면 업무로 이동 · 달력 날짜로 끌어 놓으면 그 날짜로">'
    +'<span class="t">'+esc(it.text||'제목 없음')+'</span>'
    +'<span class="d">'+esc(md(it.date))+'</span></div>').join('');
}
/* 보류함 높이 — 옆 달력의 4주차 줄에 맞춰 **최대 높이**만 준다.
   ⚠ 예전에는 height 로 못박아 보류가 2~3건뿐이어도 열 바닥까지 빈 칸이 남았다(실사용 지적).
   max-height 로 두면 적을 땐 내용만큼만 차지하고, 많을 땐 예전처럼 4주차 줄에 맞춰 안에서 스크롤한다 */
function holdFit(){
  const card=$('#holdCard');if(!card)return;
  const rows=$$('#fcal .fc-daygrid-body tr');
  const clear=()=>{card.style.height='';card.style.maxHeight='';};
  if(WIDGET||card.hidden||window.innerWidth<=960||rows.length<4){clear();return;}
  const col=$('.cal-wrap .dp-col');if(!col){clear();return;}
  const top=rows[3].getBoundingClientRect().top, bot=col.getBoundingClientRect().bottom;
  const h=Math.round(bot-top);
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
  store.putTask(sid,iid,{...cur,st:1,done:false,stKeep:true,date:ds,
    end:span>0?addDays(ds,span):'',updatedAt:Date.now()});
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
    store.putTask(row.dataset.sid,row.dataset.iid,{...cur,st:3,done:false,updatedAt:Date.now()});n++;
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
  if(cur)store.putTask(sid,iid,{...cur,...patch,updatedAt:Date.now()});
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
  const map={};
  const add=(d,c,done)=>{(map[d]=map[d]||[]).push({c,done});};
  allTasks().forEach(({sid,iid,it})=>{
    if(!it.date)return;
    /* 완료도 점으로 남긴다 — 목록에서 빠진 뒤에도 그 날 무엇을 했는지 달력에는 보이게(흐린 점) */
    const done=stEff(it)===2;
    if(!tkMatch(sid,iid,it))return;
    const p=taskAsPlan(sid,iid,it),col=planColor(p);
    if(it.recur&&it.recur.f){recurDates(p,first,last).forEach(d=>add(d,col,done));return;}
    const end=it.end||it.date;
    for(let d=(it.date<first?first:it.date);d<=(end>last?last:end);d=addDays(d,1))add(d,col,done);
  });
  /* 미완료를 앞에 둔다 — 한 칸에 점 3개만 보이므로 진행 중인 것이 먼저 보여야 한다 */
  Object.keys(map).forEach(d=>{map[d].sort((a,b)=>(a.done?1:0)-(b.done?1:0));});
  return map;
}
function miniCalHTML(){
  const base=S.mineYm||todayStr().slice(0,7)+'-01';
  const y=Number(base.slice(0,4)),m=Number(base.slice(5,7))-1;
  const first=new Date(y,m,1),days=new Date(y,m+1,0).getDate(),lead=first.getDay();
  const dots=miniDots(y,m),today=todayStr();
  const prevDays=new Date(y,m,0).getDate();
  let cells='';
  for(let i=0;i<lead;i++)cells+='<div class="mc-d out"><span class="n">'+(prevDays-lead+1+i)+'</span></div>';
  for(let d=1;d<=days;d++){
    const ds=y+'-'+pad(m+1)+'-'+pad(d),dw=(lead+d-1)%7;
    const ho=holOf(ds);   /* 공휴일·지정휴무일은 일요일과 같은 빨강 */
    cells+='<button class="mc-d'+(ds===today?' today':'')+(ds===S.mineSel?' sel':'')
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
      <b>${y}년 ${m+1}월</b>
      <div class="cal-nav">
        <button class="cal-nb" data-act="mine.mon" data-d="-1" aria-label="지난 달" data-tip="지난 달"><svg class="icn"><use href="#i-chevl"></use></svg></button>
        <button class="cal-nb cal-today" data-act="mine.mon" data-d="0" aria-label="이번 달로" data-tip="이번 달로"><svg class="icn"><use href="#i-today"></use></svg></button>
        <button class="cal-nb" data-act="mine.mon" data-d="1" aria-label="다음 달" data-tip="다음 달"><svg class="icn"><use href="#i-chevr"></use></svg></button>
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
  if(!list.length)return '<div class="tm-empty">등록된 팀이 없습니다. + 추가를 누르세요.</div>';
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
  if(!list.length)return '<div class="tm-empty">등록된 권역이 없습니다. + 추가를 누르세요.</div>';
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
/* 현장 표 — 하자처리현황의 현장 관리 표를 그대로 이식(권역·현장명·세대수·동수·상가수·준공일).
   행에서 바로 고치면 즉시 저장된다. 순서는 권역 등록 순 → 이름순. */
function siteTable(){
  const sites=(S.org.sites||[]).slice(),regs=(S.org.regions||[]).filter(r=>r.name);
  if(!sites.length)return '<p class="tm-empty" style="padding:22px 0;text-align:center">등록된 현장이 없습니다.<br><b>+ 현장 추가</b>로 등록하세요.</p>';
  const ord={};regs.forEach((r,i)=>{ord[r.id]=i;});
  sites.sort((a,b)=>(ord[a.region]??99)-(ord[b.region]??99)||String(a.name).localeCompare(String(b.name),'ko'));
  const regOpts=x=>'<option value="">권역 —</option>'+regs.map(r=>'<option value="'+esc(r.id)+'"'+(r.id===x.region?' selected':'')+'>'+esc(r.name)+'</option>').join('');
  return `<div style="overflow-x:auto"><table class="mgtbl"><thead><tr>
    <th style="width:10%">권역</th><th style="width:17%">현장명</th>
    <th class="cc" style="width:8%">세대수</th><th class="cc" style="width:7%">동수</th>
    <th class="cc" style="width:8%">상가수</th><th class="cc" style="width:11%">준공일</th>
    <th class="cc" style="width:8%" data-tip="끄면 하자 관리 화면의 현장 목록에서 숨깁니다">하자현황</th>
    <th class="cc" style="width:7%">공가세대</th><th class="cc" style="width:7%">공가상가</th>
    <th class="cc mg-disth" style="width:9%">업데이트일</th><th class="cc" style="width:5%"></th>
  </tr></thead><tbody>${sites.map(x=>`<tr>
    <td><select class="mg-inp" data-act="org.siteUpd" data-id="${esc(x.id)}" data-f="region" aria-label="권역 선택">${regOpts(x)}</select></td>
    <td><input class="mg-inp" value="${esc(x.name)}" data-act="org.siteUpd" data-id="${esc(x.id)}" data-f="name" aria-label="현장명"></td>
    <td><input class="mg-inp n" type="text" inputmode="numeric" value="${(x.units||0).toLocaleString()}" data-act="org.siteUpd" data-id="${esc(x.id)}" data-f="units" aria-label="세대수" style="text-align:right;min-width:56px"></td>
    <td><input class="mg-inp n" type="text" inputmode="numeric" value="${(x.buildings||0).toLocaleString()}" data-act="org.siteUpd" data-id="${esc(x.id)}" data-f="buildings" aria-label="동수" style="text-align:right;min-width:48px"></td>
    <td><input class="mg-inp n" type="text" inputmode="numeric" value="${(x.commercialUnits||0).toLocaleString()}" data-act="org.siteUpd" data-id="${esc(x.id)}" data-f="commercialUnits" aria-label="상가수" style="text-align:right;min-width:52px"></td>
    <td class="cc"><input class="mg-inp" type="date" max="9999-12-31" style="width:120px;max-width:100%;text-align:center;display:inline-block" value="${esc(x.completionDate||'')}" data-act="org.siteUpd" data-id="${esc(x.id)}" data-f="completionDate" aria-label="준공일"></td>
    <td class="cc"><label class="sw"><input type="checkbox"${dfIsHidden(x.id)?'':' checked'} data-act="org.siteShow" data-id="${esc(x.id)}" aria-label="하자 관리 화면에 표시"><span class="sw-t"></span></label></td>
    <td class="cc mg-ro"><label class="sw"><input type="checkbox"${x.showVacant!==false?' checked':''} disabled aria-label="공가세대 — 하자처리 현황에서 관리"><span class="sw-t"></span></label></td>
    <td class="cc mg-ro"><label class="sw"><input type="checkbox"${x.hasCommercial?' checked':''} disabled aria-label="공가상가 — 하자처리 현황에서 관리"><span class="sw-t"></span></label></td>
    <td class="cc mg-dis" style="font-size:11.5px;white-space:nowrap">—</td>
    <td class="cc"><button class="tm-x tm-del" data-act="org.delSite" data-id="${esc(x.id)}" aria-label="삭제">${ICON_TRASH}</button></td>
  </tr>`).join('')}</tbody></table></div>`;
}
function curTeam(){const ts=(S.org.teams||[]).filter(t=>t.name);return ts.find(t=>t.id===S.tk.t)||ts[0]||null;}
function rOrg(){
  const t=curTeam();
  /* 제목 옆 팀명은 사이드바 팀 선택기와 겹쳐 지웠다 — 라벨은 비우되 t 는 아래에서 계속 쓴다 */
  ['#regTeamLbl','#siteTeamLbl','#acctTeamLbl'].forEach(id=>{const e=$(id);if(e)e.textContent='';});
  const tr=$('#teamRoot'),rr=$('#regRoot'),sr=$('#siteRoot');
  if(tr)tr.innerHTML=teamRows();
  if(rr)rr.innerHTML=regRows();
  if(sr)sr.innerHTML=siteTable();
  /* 계정/현장 탭 상태 */
  const tab=S.orgTab||'acct';
  const ap=$('#acctPane'),sp=$('#sitePane'),ab=$('#orgAddSite');
  if(ap)ap.style.display=tab==='acct'?'':'none';
  if(sp)sp.style.display=tab==='site'?'':'none';
  if(ab)ab.style.display=tab==='site'?'':'none';
  $$('.orgseg button').forEach(b=>b.classList.toggle('act',b.dataset.t===tab));
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
  const mine=t?all.filter(p=>p.team===t.id||p.local):[];
  const free=all.filter(p=>!p.local&&(!p.team||!(S.org.teams||[]).some(x=>x.id===p.team)));
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
  const sitesOf=p=>{
    const list=(S.org.sites||[]).filter(x=>(p.sites||{})[x.id]);
    /* ⚠ 무조건 3개로 자르면 칸이 넓어도 '+1'이 뜬다 — 넣을 수 있는 만큼 다 넣고 넘칠 때만 접는다(CSS 가 판단) */
    const shown=list.map(x=>'<span class="site-on">'+esc(x.name)+'</span>').join('');
    return '<div class="site-chk">'
      +'<button class="site-pick" data-act="acct.sitePick" data-id="'+esc(p.id)+'" aria-label="담당 현장 선택" data-tip="담당 현장 선택"><svg class="icn"><use href="#i-plus"></use></svg></button>'
      +(list.length?shown:'<span class="site-none">미지정</span>')
      +'</div>';
  };
  const roleCtl=p=>{
    const role=p.role||'viewer',rc='r-'+role,isMe=p.id===myUid,lastEd=role==='editor'&&editors.length<=1;
    const lock=isMe?'본인 계정':(lastEd?'마지막 관리자':'');
    return (!isEditor()||isMe||lastEd)
      ? (lock?'<span class="fbu-lock">'+lock+'</span> ':'')+'<span class="fbu-role '+rc+'">'+esc(roleLabel(role))+'</span>'
      : '<select class="fbu-sel" data-act="acct.role" data-id="'+esc(p.id)+'" aria-label="권한">'
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
  const canRank=canSetRank();
  const rankOpt=cur=>RANKS.map(([v,l])=>'<option value="'+v+'"'+(v===rankOf(cur)?' selected':'')+'>'+l+'</option>').join('');
  const rankCtl=p=>canRank
    ? '<select class="mg-inp" data-act="acct.set" data-f="rank" data-id="'+esc(p.id)+'" aria-label="직급">'+rankOpt(p.rank)+'</select>'
    : '<span class="rk-fix">'+esc(rankLabel(p.rank))+'</span>';
  const row=p=>{
    const u=rankUses(p.rank);
    return `<tr>
      <td><div class="utbl-name">${avHTML(p.id)}
        <div style="min-width:0"><div class="utbl-nick">${esc(p.name)}</div><div class="utbl-mail">${esc(p.email||'')}</div></div></div></td>
      <td>${teamCtl(p)}</td>
      <td>${rankCtl(p)}</td>
      <td>${u.region
        ?'<select class="mg-inp" data-act="acct.set" data-f="region" data-id="'+esc(p.id)+'" aria-label="권역">'+regOpt(p.region)+'</select>'
        :''}</td>
      <td>${u.sites?sitesOf(p):''}</td>
      <td class="utbl-r">${roleCtl(p)}</td>
    </tr>`;
  };
  ar.innerHTML='<table class="utbl"><thead><tr><th style="width:180px">이름</th><th style="width:142px">팀</th><th style="width:96px">직급</th><th style="width:106px">권역</th><th>담당 현장</th><th class="utbl-r" style="width:120px">권한</th></tr></thead><tbody>'
    +(mine.length?mine.map(row).join('')
      :'<tr><td colspan="6" style="font-size:12px;color:var(--lbl3);padding:10px">이 팀에 배정된 계정이 없습니다.</td></tr>')
    +'</tbody></table>';
  /* 팀 미배정 계정 — 섞어 두면 헷갈린다는 지적에 따라 별도 카드로 분리 */
  const fc=$('#freeCard'),fr=$('#freeRoot');
  if(fc&&fr){
    fc.style.display=(free.length&&(S.orgTab||'acct')==='acct')?'':'none';   /* 현장 탭에선 미배정 카드도 접는다 */
    fr.innerHTML=free.length
      ?'<table class="utbl"><thead><tr><th style="width:176px">이름</th><th style="width:142px">팀</th><th></th><th class="utbl-r" style="width:120px">권한</th></tr></thead><tbody>'
        +free.map(p=>`<tr>
          <td><div class="utbl-name">${avHTML(p.id)}
            <div style="min-width:0"><div class="utbl-nick">${esc(p.name)}</div><div class="utbl-mail">${esc(p.email||'')}</div></div></div></td>
          <td>${teamCtl(p)}</td>
          <td></td>
          <td class="utbl-r">${roleCtl(p)}</td>
        </tr>`).join('')
        +'</tbody></table>'
      :'';
  }
  rFilter();
}
/* 하자처리 현황 게시본 → 이 앱의 조직·현장 모양으로 바꾼다(가져오기와 같은 규칙).
   ⚠ 권역은 저쪽이 '이름 문자열'로 다루므로 이름을 그대로 id 로 삼는다 */
let ORG_LIVE=false,ORG_RM='',ORG_OFF=null;
function arrOf(v){return v?(Array.isArray(v)?v.filter(Boolean):Object.values(v).filter(Boolean)):[];}
function orgFromDash(teams,sites){
  const regNames=[...new Set([...teams.flatMap(t=>arrOf(t.regions)),...sites.map(x=>x.region)]
    .map(x=>String(x||'').trim()).filter(Boolean))];
  return {
    teams:teams.map(t=>({id:String(t.id),name:String(t.name||'').slice(0,60)})),
    regions:regNames.map(n=>({id:n,name:n})),
    sites:sites.map(x=>({id:String(x.id),name:String(x.name||'').slice(0,60),
      team:String(x.teamId||''),region:String(x.region||''),
      units:Number(x.units)||0,buildings:Number(x.buildings)||0,
      commercialUnits:Number(x.commercialUnits)||0,completionDate:String(x.completionDate||'').slice(0,10),
      vacantUnits:!!(x.vacantUnits||x.vacant||x.distUnits),
      vacantCommercial:!!(x.vacantCommercial||x.distCommercial),
      showVacant:x.showVacant!==false,               /* 공가세대 탭 표시 여부 — 원본 현장 설정 */
      hasCommercial:!!x.hasCommercial}))             /* 공가상가 탭 표시 여부 */
  };
}
function orgSave(){
  /* ⚠ 원본(하자처리 현황)을 구독 중일 때는 이 앱에서 고쳐도 곧 덮어써진다 — 손대지 않는다 */
  if(ORG_LIVE){toast('팀·권역·현장은 하자처리 현황에서 관리합니다');rOrg();return;}
  normOrg(S.org);store.putOrg(S.org);if(!S.live){rOrg();rTasks();}
}
function rCfg(){rBk();}

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
    :'<button class="ctx-it'+(it.danger?' dg':'')+'" role="menuitem" data-ci="'+i+'">'+esc(it.label)+'</button>').join('');
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
  /* ⓪-2 대시보드 '현장별 하자처리현황' 행 · 사이드바 현장 항목 — 원본 ③⑤: 현장 열기·목록 바로가기.
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
  /* ⓪-3 종합 분석(AI) 영역 — 원본 ⑥(뷰어라 재생성은 없음) */
  const ait=t.closest('.ait');
  if(ait&&t.closest('#view-defect')){
    return[{label:'분석 의견 복사',act:()=>copyText(ait.innerText.trim(),'분석 의견을 복사했습니다')}];
  }
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
    if(it)return[
      {label:stEff(it)===2?'진행으로 되돌리기':'완료로 표시',act:()=>ACT['tk.st']({dataset:{sid,iid}})},
      {label:'제목 복사',act:()=>copyText(it.text||'','제목을 복사했습니다')},
      {sep:true},
      {label:'삭제',danger:true,act:()=>ACT['tk.del']({dataset:{sid,iid}})}
    ];
  }
  /* ② 달력 날짜 칸 */
  const cell=t.closest('#fcal td.fc-daygrid-day');
  if(cell&&cell.dataset.date){
    const ds=cell.dataset.date,off=(S.offdays||{})[ds];
    const ed=isEditor();
    return[
      {label:'이 날짜에 업무 추가',act:()=>{selDate(ds,true);S.selEnd='';if(WIDGET)S.widPop=true;rDay();rWidget();
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
let _tipT=null,_tipFor=null;
function tipHide(){clearTimeout(_tipT);_tipFor=null;const el=$('#htip');if(el)el.classList.remove('on');}
function tipShow(target){
  const el=$('#htip');if(!el)return;
  /* ⚠ 기다리는 동안 그 요소가 사라지거나(다시 그려짐) 마우스가 떠났을 수 있다 */
  if(!target.isConnected||!target.matches(':hover'))return;
  const txt=target.dataset.tip;if(!txt)return;
  _tipFor=target;
  el.textContent=txt;
  el.classList.add('on');
  const r=target.getBoundingClientRect(),t=el.getBoundingClientRect();
  let x=r.left+r.width/2-t.width/2;
  let y=r.top-t.height-8;
  if(y<6)y=r.bottom+8;                                  /* 위가 좁으면 아래로 */
  el.style.left=Math.max(6,Math.min(x,innerWidth-t.width-6))+'px';
  el.style.top=y+'px';
}
document.addEventListener('mouseover',e=>{
  const t=e.target.closest?e.target.closest('[data-tip]'):null;
  if(!t){if(_tipFor)tipHide();return;}
  if(t===_tipFor)return;                                 /* 이미 그 요소를 보여 주는 중 */
  clearTimeout(_tipT);
  const el=$('#htip');if(el)el.classList.remove('on');
  _tipT=setTimeout(()=>tipShow(t),420);                  /* 지나가다 뜨지 않게 조금 기다린다 */
});
document.addEventListener('mouseout',e=>{
  const t=e.target.closest?e.target.closest('[data-tip]'):null;
  if(!t)return;
  const to=e.relatedTarget;
  if(to&&to.closest&&to.closest('[data-tip]')===t)return; /* 같은 요소 안에서 움직인 것 */
  tipHide();
});
/* 누르면 곧바로 감춘다 — 누른 뒤에도 떠 있으면 화면을 가린다 */
document.addEventListener('mousedown',tipHide,true);
document.addEventListener('scroll',tipHide,true);
window.addEventListener('blur',tipHide);
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
const VIEW_TTL={calendar:'캘린더',tasks:'업무 목록',report:'주요 업무',defect:'하자처리 현황',org:'조직/현장 관리',settings:'설정'};
document.addEventListener('click',e=>{
  const t=$('#sbTools');if(!t||!t.classList.contains('open'))return;
  if(!t.contains(e.target))t.classList.remove('open');   /* 접힌 사이드바의 기능 팝업 — 바깥 클릭이면 닫는다 */
},true);
function go(view){
  S.view=view;
  S.planOpen='';S.tkOpen=null;   /* 펼쳐 둔 카드는 화면을 옮기면 접는다(일정·업무 목록 모두) */
  if(S.dpSheet)dpSheet(false);
  const fc=$('#dpFcard');if(fc)fc.classList.remove('adv-on');   /* 화면을 옮기면 펼쳐 둔 필터는 닫는다 */
  mselClose();
  $$('.view').forEach(v=>v.classList.toggle('act',v.id==='view-'+view));
  $$('#sidebar .nvi[data-view]').forEach(n=>n.classList.toggle('act',n.dataset.view===view));
  $('#tbt').textContent=VIEW_TTL[view];
  if(view==='calendar'&&CAL)setTimeout(()=>CAL.updateSize(),30);
  if(view==='tasks')rTasks();
  if(view==='report')rReport();
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
      b.textContent='버전 '+APP_VER+' · 화면 v'+cv+' · 기록된 오류 '+ERRLOG.length+'건';
    }
    /* 위젯은 별도 파일이라 버전이 따로 논다 — 설정에서 한눈에 보이게 같이 적는다 */
  }
  mobClose();
}
let toastT=null;
function toast(msg){
  const t=$('#toast');t.textContent=msg;t.classList.add('show');
  clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2400);
}
function mobClose(){
  if(S.dpSheet){dpSheet(false);return;}   /* 시트가 열려 있으면 스크림 탭은 시트부터 닫는다 */
  $('#sidebar').classList.remove('mob-open');$('#scrim').classList.remove('on');}

/* 테마 */
/* 앱 배경화면 — 이 기기(localStorage)에만 두므로 팀원 화면·데이터베이스에는 영향이 없다 */
function applyBg(){
  /* ⚠ 위젯 창은 자체 배경 체계(불투명/글라스)를 쓴다 — 같은 localStorage 를 읽는 탓에 hasbg 가 붙으면
     hasbg 토큰(--surf2 밝은 반투명 등)이 위젯을 덮쳐 다른달 셀에 밝은 판이 깔리고 년월·넘김 버튼이
     이상해진다(218차 위젯 회귀의 원인). 위젯에서는 배경 기능 전체를 무시한다.
     (WIDGET 상수는 아래쪽 선언이라 TDZ — location 으로 직접 검사) */
  if(/[?&]w=1\b/.test(location.search)){document.body.classList.remove('hasbg');return;}
  let url='',al='80',bri='100';
  try{url=localStorage.getItem('calapp.bg')||'';al=localStorage.getItem('calapp.bgAlpha')||'90';
    bri=localStorage.getItem('calapp.bgBri')||'100';}catch(e){}
  const root=document.documentElement;
  root.style.setProperty('--app-bg-img',url?`url("${url}")`:'none');
  root.style.setProperty('--app-card-alpha',(Number(al)||90)/100);
  root.style.setProperty('--app-bg-bri',String((Number(bri)||100)/100));   /* 사진 자체 밝기 */
  document.body.classList.toggle('hasbg',!!url);
  const btn=$('#bgClearBtn');if(btn)btn.hidden=!url;
  const dl=$('#bgAlpha');if(dl)dl.value=al;
  const alv=$('#bgAlphaV');if(alv)alv.textContent=al+'%';
  const db=$('#bgBri');if(db)db.value=bri;
  const dbv=$('#bgBriV');if(dbv)dbv.textContent=bri+'%';
  if(url)bgGrainPaint();      /* 필름 그레인은 배경이 있을 때만 그린다 */
  calGlassApply();
}
/* 배경 위 정적 필름 그레인 — 디뉴어 로그인 배경과 같은 방식(타일 노이즈 + 먼지 입자, 애니메이션 없음).
   ⚠ 한 번만 그린다. 매 프레임 그리면 위젯·저사양 PC 에서 그대로 부담이 된다. */
let _grainDone=false;
function bgGrainPaint(){
  const cv=$('#bgGrain');if(!cv||!cv.getContext)return;
  const ctx=cv.getContext('2d',{alpha:true});if(!ctx)return;
  const DPR=Math.min(devicePixelRatio||1,1.5);
  const W=Math.floor(innerWidth*DPR),H=Math.floor(innerHeight*DPR);
  if(_grainDone&&cv.width===W&&cv.height===H)return;
  cv.width=W;cv.height=H;cv.style.width=innerWidth+'px';cv.style.height=innerHeight+'px';
  const TILE=180,SPREAD=92;
  const t=document.createElement('canvas');t.width=t.height=TILE;
  const tc=t.getContext('2d');const img=tc.createImageData(TILE,TILE);
  for(let i=3;i<img.data.length;i+=4)img.data[i]=255;
  for(let i=0;i<img.data.length;i+=4){const v=128+(Math.random()*2-1)*SPREAD;img.data[i]=img.data[i+1]=img.data[i+2]=v;}
  tc.putImageData(img,0,0);
  ctx.clearRect(0,0,W,H);
  ctx.globalAlpha=1;ctx.fillStyle=ctx.createPattern(t,'repeat');ctx.fillRect(0,0,W,H);
  const n=Math.round((W*H)/(DPR*DPR)/13000);   /* 정적인 먼지 입자 */
  for(let i=0;i<n;i++){const big=Math.random()<0.10;const s=(big?2.2+Math.random()*3.4:1+Math.random()*1.3)*DPR;
    ctx.globalAlpha=big?0.12:0.07;ctx.fillStyle=Math.random()<0.5?'#000':'#fff';
    ctx.fillRect(Math.random()*W,Math.random()*H,s,s);}
  ctx.globalAlpha=1;_grainDone=true;
}
let _grainT=null;
addEventListener('resize',()=>{clearTimeout(_grainT);
  _grainT=setTimeout(()=>{if(document.body.classList.contains('hasbg'))bgGrainPaint();},150);},{passive:true});
/* ── 달력 유리(앱) — 위젯 설정과 같은 두 축: 투명도(a)·유리 톤(tint) ──
   ⚠ 위젯과 같은 이유로 변수 상속이 아니라 **리터럴 규칙을 스타일 태그로 주입**한다
   (FullCalendar 셀에서 var() 상속이 갱신되지 않는 엔진 특이 동작 — widApply 주석 참조). */
const CAL_GLASS_KEY='calapp.calGlass';
function calGlassLoad(){try{return JSON.parse(localStorage.getItem(CAL_GLASS_KEY))||{};}catch(e){return{};}}
function calGlassSave(c){try{localStorage.setItem(CAL_GLASS_KEY,JSON.stringify(c));}catch(e){}}
function calGlassApply(){
  if(WIDGET)return;                       /* 위젯은 자체 설정(widApply)이 맡는다 */
  const c=calGlassLoad();
  const a=Number.isFinite(Number(c.a))?Number(c.a)/100:.85;               /* 기본 85% (투명도 15%) */
  const tint=Math.min(1.6,Math.max(.5,(Number(c.tint)||100)/100));
  const sc=rgb=>rgb.split(',').map(x=>Math.min(255,Math.round(Number(x)*tint))).join(',');
  const f=n=>Math.min(1,Math.max(0,n)).toFixed(3);
  const B=sc('24,28,38'),W=sc('57,52,61'),H=sc('13,16,24'),N=sc('16,20,30');
  let dyn=document.getElementById('calDyn');
  if(!dyn){dyn=document.createElement('style');dyn.id='calDyn';document.head.appendChild(dyn);}
  dyn.textContent=[
    /* 232차: 달력을 두르는 띠는 **년·월 버튼 배경과 같은 색**으로(사용자 지시).
       버튼은 아래 6091행에서 rgba(N, a*.9) 를 쓴다 — 같은 값을 테두리에도 준다. */
    'body.hasbg #fcal{border-color:rgba('+N+','+f(a*.9)+');}',
    'body.hasbg #fcal .fc-scrollgrid{box-shadow:0 0 0 1px rgba(255,255,255,'+f(.22*tint)+');}',
    'body.hasbg #fcal td.fc-daygrid-day{background:rgba('+B+','+f(a)+');}',
    /* 공휴일도 주말과 같은 칸 색 — 쉬는 날이라는 뜻이 같다(위젯과 동일) */
    'body.hasbg #fcal td.fc-daygrid-day.fc-day-sat,body.hasbg #fcal td.fc-daygrid-day.fc-day-sun,body.hasbg #fcal td.fc-daygrid-day.hol{background:rgba('+W+','+f(a*.92)+');}',
    /* ⚠ 이웃(다른) 달 칸은 테마와 무관하게 같은 값 — 다크에서 --surf2 등이 끼어들어 색이 달라지던 것을 막는다 */
    'body.hasbg #fcal td.fc-daygrid-day.fc-day-other,html.dark body.hasbg #fcal td.fc-daygrid-day.fc-day-other{background:rgba('+B+','+f(a*.22)+');}',
    'body.hasbg #fcal .fc-col-header-cell{background:rgba('+H+','+f(a+.12)+');}',
    /* 년월·월넘김 버튼도 위젯과 같은 채움 */
    'body.hasbg:not(.wid) #view-calendar .cal-title,body.hasbg:not(.wid) #view-calendar .cal-head>.cal-ctl>.cal-nav{background:rgba('+N+','+f(a*.9)+');}',
    'body.hasbg #view-calendar .cal-title,body.hasbg #view-calendar .cal-title .y{color:#fff;}',
    /* 꺽쇠는 .cal-title-c 가 따로 색(--lbl3)을 갖는다 — 버튼 색만 바꾸면 어두운 채움 위에서 안 보인다 */
    'body.hasbg #view-calendar .cal-title-c{color:rgba(255,255,255,.72);}',
    'body.hasbg #view-calendar .cal-nb{color:rgba(255,255,255,.82);}',
    'body.hasbg #view-calendar .cal-nb:hover{background:rgba(255,255,255,.14);color:#fff;}'
  ].join('\n');
  const ra=$('#bgCalA');if(ra)ra.value=Math.round(100-a*100);
  const va=$('#bgCalAV');if(va)va.textContent=Math.round(100-a*100)+'%';
  const rt=$('#bgCalT');if(rt)rt.value=Math.round(tint*100);
  const vt=$('#bgCalTV');if(vt)vt.textContent=Math.round(tint*100)+'%';
}
function applyTheme(dark){
  document.documentElement.classList.toggle('dark',dark);
  const u=$('#thIcon');if(u)u.setAttribute('href',dark?'#i-moon':'#i-sun');
  try{localStorage.setItem('calapp.theme',dark?'dark':'light');}catch(e){}
  /* 차트는 그릴 때의 토큰 색을 굽는다 — 테마가 바뀌면 하자 화면을 다시 그려야 색이 따라온다 */
  if(S.view==='defect'){try{rDefect();}catch(e){}}
}

/* ═══════════ 액션 위임 ═══════════ */
const ACT={
  'nav.go':el=>{if(el.dataset.view==='defect')S.dfSid='';go(el.dataset.view);},
  'nav.toggle':()=>{
    /* 접기/펼치기 동안 차트를 '다시 그리는' 모션(막대가 바닥에서 솟는 520ms)이 보이면 안 된다.
       responsive=false 저글링은 이미 붙은 ResizeObserver 를 막지 못해 무효였다(216차 실패 원인) —
       대신 duration 이 DF.noAnim 을 읽는 함수라서, 플래그를 세우면 옵저버가 몇 번을 발화하든
       즉시 상태로만 그려져 정지 화면처럼 크기만 따라온다. 폭 전환(0.22s)이 끝난 뒤 되돌린다. */
    DF.noAnim=true;
    $('#sidebar').classList.toggle('mini');
    clearTimeout(window.__navT);
    window.__navT=setTimeout(()=>{DF.noAnim=false;},700);
  },
  'nav.mob':()=>{$('#sidebar').classList.add('mob-open');$('#scrim').classList.add('on');},
  'nav.mobClose':mobClose,
  'day.sheetClose':()=>dpSheet(false),
  'theme.toggle':()=>applyTheme(!document.documentElement.classList.contains('dark')),
  'nav.tools':()=>{const t=$('#sbTools');if(t)t.classList.toggle('open');},
  /* 달 이동은 보기만 바꾼다 — 선택일(날짜 헤더)은 그대로 둔다 */
  'cal.prev':()=>CAL&&CAL.prev(),
  'cal.next':()=>CAL&&CAL.next(),
  /* 이동만 한다 — 위젯에서 날짜를 고른 것처럼 업무 팝업이 열리던 문제(오늘·연월 이동 공통) */
  'cal.today':()=>{selDate(todayStr(),true);},
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
    if(p.recur&&p.recur.f){                 /* 반복은 회차별 완료(doneOn)가 우선한다 */
      const k=occSrc(p,occ);
      p.doneOn=p.doneOn||{};
      if(n===2)p.doneOn[k]=1;else{delete p.doneOn[k];p.st=n;p.done=false;}
    }else{p.st=n;p.done=n===2;p.stKeep=n===1;}   /* 날짜가 지난 뒤 손으로 '진행'을 고르면 그대로 둔다 */
    p.updatedAt=Date.now();store.putPlan(p);
    if(!S.live){rDay();refetchCal();rWidget();}},
  'plan.toTask':el=>{closePlanEdit();gotoTask(el.dataset.sid,el.dataset.iid);},
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
    confirmModal('업무 삭제','"'+ttl+'" 업무를 삭제합니다. 되돌릴 수 없습니다.',()=>{
      /* ⚠ 폼부터 닫고 지운다 — 순서가 바뀌면 다시 그릴 때 '이미 없는 업무'의 폼이 남아 한 박자 늦게 보인다 */
      clearTimeout(PE_SAVE);S.planEdit=null;
      store.delPlan(ym,pid);
      rDay();refetchCal();rWidget();          /* 라이브에서도 즉시 반영(구독 값이 오면 덮어쓴다) */
      toast('업무를 삭제했습니다');
    });},
  'plan.moveOcc':el=>{
    const p=findPlan(el.dataset.pid);if(!p)return;
    const src=occSrc(p,el.dataset.occ);
    const to=($('#peOcc')&&$('#peOcc').value)||'';
    if(!/^\d{4}-\d{2}-\d{2}$/.test(to)){toast('옮길 날짜를 고르세요');return;}
    if(to===src){toast('원래 날짜와 같습니다');return;}
    p.moveOn={...(p.moveOn||{})};p.moveOn[src]=to;
    /* 완료·제외 표시는 원래 날짜 기준이라 그대로 둔다 */
    p.updatedAt=Date.now();store.putPlan(p);
    S.planEdit=null;selDate(to);
    if(!S.live){refetchCal();rWidget();}else setTimeout(refetchCal,220);
    toast('이 회차를 '+to+'로 옮겼습니다');},
  'plan.resetOcc':el=>{
    const p=findPlan(el.dataset.pid);if(!p)return;
    const src=occSrc(p,el.dataset.occ);
    if(!p.moveOn||!p.moveOn[src]){toast('옮긴 회차가 아닙니다');return;}
    const mv={...p.moveOn};delete mv[src];p.moveOn=mv;
    p.updatedAt=Date.now();store.putPlan(p);
    S.planEdit=null;selDate(src);
    if(!S.live){refetchCal();rWidget();}else setTimeout(refetchCal,220);
    toast('원래 날짜로 되돌렸습니다');},
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
  'df.fold':el=>{const k=el.dataset.rid;
    const btn=el.closest('.df-reg'),wasOpen=btn&&btn.classList.contains('open');
    S.dfFold[k]=wasOpen?true:false;   /* true=접힘 · false=펼침 (기존 저장값과 호환) */
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
  'set.bgPick':()=>{
    const f=document.createElement('input');f.type='file';f.accept='image/*';
    f.onchange=()=>{const file=f.files&&f.files[0];if(!file)return;
      /* 크기 제한 대신 자동 축소 — 브라우저 로컬 저장은 보통 5MB 남짓이고 dataURL 은 원본보다 약 33% 커진다.
         긴 변 2560px·JPEG 로 줄이면 큰 사진도 대개 1MB 안쪽이 된다. */
      const r=new FileReader();
      r.onload=()=>{
        const img=new Image();
        img.onload=()=>{
          const max=2560,sc=Math.min(1,max/Math.max(img.width,img.height));
          const cv=document.createElement('canvas');
          cv.width=Math.round(img.width*sc);cv.height=Math.round(img.height*sc);
          cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
          let out=cv.toDataURL('image/jpeg',0.86);
          if(out.length>3.6e6)out=cv.toDataURL('image/jpeg',0.7);
          try{localStorage.setItem('calapp.bg',out);applyBg();toast('배경을 바꿨습니다 · 이 기기에만 저장됩니다');}
          catch(e){toast('이 브라우저의 로컬 저장 공간이 부족합니다 · 더 작은 이미지를 골라 주세요');}
        };
        img.onerror=()=>toast('이미지를 읽지 못했습니다');
        img.src=String(r.result);};
      r.readAsDataURL(file);};
    f.click();},
  'set.bgClear':()=>{try{localStorage.removeItem('calapp.bg');}catch(e){}applyBg();toast('배경을 없앴습니다');},
  'set.bgAlpha':el=>{const v=String(el.value||'80');try{localStorage.setItem('calapp.bgAlpha',v);}catch(e){}applyBg();},
  'set.bgBri':el=>{const v=String(el.value||'100');try{localStorage.setItem('calapp.bgBri',v);}catch(e){}applyBg();},
  'cal.set':el=>{
    const p=$('#calSet');if(!p)return;
    const on=!p.classList.contains('on');
    p.classList.toggle('on',on);
    el.setAttribute('aria-expanded',on?'true':'false');
    if(on)calGlassApply();   /* 열 때 현재 값으로 맞춘다 */
  },
  'set.calA':el=>{const c=calGlassLoad();c.a=100-Number(el.value);calGlassSave(c);calGlassApply();},   /* 슬라이더는 '투명도' — 클수록 투명 */
  'set.calT':el=>{const c=calGlassLoad();c.tint=Number(el.value);calGlassSave(c);calGlassApply();},
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
      toast('브라우저에서 하자 현황을 엽니다');
      return;
    }
    S.dfSid=sid;S.dfTab='sum';go('defect');},
  'mine.day':el=>{const d=el.dataset.date;if(!d)return;S.mineSel=(S.mineSel===d?'':d);rTasks();},
  'mine.mon':el=>{
    const d=Number(el.dataset.d)||0;
    const base=S.mineYm||todayStr().slice(0,7)+'-01';
    if(!d){S.mineYm='';}
    else{const t=toDate(base);t.setMonth(t.getMonth()+d);S.mineYm=dstr(t).slice(0,7)+'-01';}
    rTasks();},
  'rpt.week':el=>{const d=Number(el.dataset.d)||0;
    S.rptWeek=d?addDays(S.rptWeek||todayStr(),d):'';rReport();},
  'rpt.tab':el=>{S.rptReg=el.dataset.reg;rReport();},
  'rpt.mode':el=>{S.rptMode=el.dataset.m==='month'?'month':'week';rReport();},
  'rpt.mon':el=>{const d=Number(el.dataset.d)||0;
    S.rptYm=d?addMonths(rptYmSel()+'-01',d).slice(0,7):'';rReport();},
  'rpt.go':el=>gotoTask(el.dataset.sid,el.dataset.iid),
  /* 인쇄 — 상단바 버튼(#tbPrintWrap) 하나가 두 화면을 맡는다.
     ⚠ 예전엔 없는 함수(dfPrintOpen)를 typeof 로 감싸 불러 하자 관리에서 조용히 아무 일도 안 했다 */
  'sb.print':()=>{if(S.view==='report')window.print();else if(S.view==='defect')openPrintPick();},
  /* 오후 점검 알림 — 누르면 오늘로 이동해 남은 업무를 펼친다. x 는 그날만 닫는다 */

  'pf.org':()=>acctAutoSave(),
  'pf.toggle':()=>{const p=$('#pfPop');if(!p)return;
    const on=!p.classList.contains('open');
    p.classList.toggle('open',on);
    if(on){
      if(!PF_MORE)pfRenderEmg(recentEmoji().length?'recent':'smiley','');
      pfPlace();
    }},
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
  'tkf.more':el=>{const c=el.closest('.dp-fcard');if(c)c.classList.toggle('adv-on');},
  'tkf.reset':()=>{S.tkF={q:'',st:[],kind:[],site:[]};filtSave();rTkViews();},
  'tk.tabA':el=>{S.tkA=el.dataset.id||'';S.tkNew=null;rTasks();},
  'tk.tabB':el=>{S.tkB=el.dataset.id||'';rTasks();},
  'tk.newOpen':el=>{
    /* ⚠ 새 업무는 '지금 보고 있는 자리'에 만든다.
       담당자를 고른 상태면 그 사람 밑에, 팀 전체·권역처럼 담을 자리가 아니면 팀 공통으로 간다
       (예전에는 버튼에 박아 둔 값을 써서 엉뚱한 곳에 생겼다) */
    const sel=tkSel(),m=S.tk.m;
    const mem=sel.mems.find(p=>p.id===m);
    /* 팀 전체 화면은 '팀 업무' 카드 안에 폼을 연다 — 그 카드의 탭이 담당자면 그 사람 자리에,
       아니면 팀 공통 자리에. ⚠ 화면(S.tk.m)은 옮기지 않는다 — 탭이 있으니 옮길 이유가 없다 */
    if(m==='teamall'){
      const side=el.dataset.side==='b'?'b':'a';
      const sidA=(side==='b')?((sel.team&&sel.team.id)||'')
        :((S.tkA&&S.tkA!=='team')?S.tkA:((sel.team&&sel.team.id)||''));
      if(!sidA)return toast('먼저 팀을 만들어 주세요');
      S.tkEdit=null;S.tkNew=sidA;S.tkNewSide=side;rTasks();
      setTimeout(()=>{const t=$('#tnTitle');if(t)t.focus();},S.live?260:20);
      return;
    }
    const sid=el.dataset.sid||(mem?mem.id:((sel.team&&sel.team.id)||''));
    if(!sid)return toast('먼저 팀을 만들어 주세요');
    /* ⚠ 폼은 그 자리가 화면에 보일 때만 그려진다 — 권역을 보고 있었다면 그 자리로 옮겨 준다.
       그러지 않으면 '눌렀는데 아무 일도 안 일어나는' 것처럼 보인다 */
    if(!mem&&m!=='team'){S.tk.m='team';toast('공통 업무로 추가합니다 · 담당자는 폼에서 고를 수 있습니다');}
    S.tkEdit=null;S.tkNew=sid;rTasks();
    setTimeout(()=>{const t=$('#tnTitle');if(t)t.focus();},S.live?260:20);
  },
  'tk.formCancel':()=>tkFormClose(),
  'tk.kind':()=>tkKindRefresh(),
  'tk.formSave':el=>taskFormSave(el.dataset.sid,el.dataset.iid||null),
  'tk.open':el=>{
    const key=el.dataset.sid+'/'+el.dataset.iid;
    S.tkOpen=S.tkOpen===key?null:key;rTasks();
  },
  'tk.field':()=>{},
  'tk.edit':el=>{S.tkNew=null;S.tkEdit=el.dataset.sid+'/'+el.dataset.iid;rTasks();
    setTimeout(()=>{const t=$('#tnTitle');if(t)t.focus();},30);},
  'tk.pick':el=>{S.tk.m=el.dataset.id;rTasks();},
  'tk.st':el=>{
    const sid=el.dataset.sid,iid=el.dataset.iid;
    const cur=(S.tasks[sid]||{})[iid];if(!cur)return;
    const n=stEff(cur)===2?1:2;
    store.putTask(sid,iid,{...cur,st:n,stKeep:n===1,updatedAt:Date.now()});
    if(!S.live){rTasks();rDay();rWidget();}
    refetchCal();   /* 완료 처리하면 달력의 기한 표시도 즉시 사라져야 한다 */
  },
  'tk.del':el=>{
    const sid=el.dataset.sid,iid=el.dataset.iid,key=sid+'/'+iid;
    const it=(S.tasks[sid]||{})[iid]||{};
    confirmModal('업무 삭제',
      '"'+(it.text||'제목 없음')+'" 업무를 삭제합니다. 되돌릴 수 없습니다.',
      ()=>{
        if(S.tkEdit===key)S.tkEdit=null;   /* 폼부터 닫고 지운다 — 순서가 바뀌면 반영이 한 박자 늦다 */
        store.putTask(sid,iid,null);
        if(S.tkOpen===key)S.tkOpen=null;
        if(!S.live)rTasks();else setTimeout(rTasks,220);
        refetchCal();toast('업무를 삭제했습니다');
      });},
  'tk.fold':el=>{const sid=el.dataset.sid;S.foldOpen[sid]=!S.foldOpen[sid];rTasks();},
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
  'org.addSite':()=>{
    
    const id=uid();const r0=(S.org.regions||[]).find(x=>x.name);
    S.org.sites=(S.org.sites||[]).concat([{id,name:'',team:'',region:r0?r0.id:''}]);orgSave();
    setTimeout(()=>{const i=document.querySelector('#siteRoot .mg-inp[data-id="'+id+'"]');if(i)i.focus();},S.live?300:30);
  },
  'org.delSite':el=>{
    
    const st=(S.org.sites||[]).find(x=>x.id===el.dataset.id);if(!st)return;
    confirmModal('현장 삭제','"'+(st.name||'이름 없음')+'" 현장을 삭제합니다. 담당자에게 배정된 이 현장도 함께 해제됩니다.',()=>{
      S.org.sites=S.org.sites.filter(x=>x.id!==st.id);
      Object.keys(S.people||{}).forEach(id=>{const p=S.people[id];
        if(p.sites&&p.sites[st.id]){const ns={...p.sites};delete ns[st.id];store.putPerson(id,{...p,sites:ns});}});
      orgSave();});
  },
  'acct.sitePick':el=>{
    
    const id=el.dataset.id,p=roster().find(x=>x.id===id);if(!p)return;
    const regs=(S.org.regions||[]).filter(r=>r.name);
    const sites=S.org.sites||[];
    if(!sites.length){toast('등록된 현장이 없습니다');return;}
    const group=(rid,label)=>{
      const items=sites.filter(x=>(x.region||'')===rid);
      if(!items.length)return '';
      return '<div class="spk-g">'+esc(label)+'</div>'+items.map(x=>
        '<label class="spk-i"><input type="checkbox" data-sid="'+esc(x.id)+'"'+((p.sites||{})[x.id]?' checked':'')+'>'+esc(x.name)+'</label>').join('');
    };
    openModal(p.name+' · 담당 현장',   /* 제목은 textContent — esc 하면 &가 &amp;로 보인다 */
      '<div class="spk">'+regs.map(r=>group(r.id,r.name)).join('')+group('','권역 미지정')+'</div>',
      '<button class="btn bg2 bsm" data-act="modal.close">취소</button><button class="btn bp bsm" data-act="modal.ok">저장</button>');
    MODAL_CB={type:'sites',ok:()=>{
      const sel={};
      $$('.spk input:checked').forEach(c=>{sel[c.dataset.sid]=1;});
      const cur=(S.people||{})[id]||{};
      store.putPerson(id,{name:p.name||'',email:p.email||'',team:cur.team||p.team||'',
        region:cur.region||p.region||'',rank:rankOf(cur.rank||p.rank),sites:sel});
      closeModal();if(!S.live)rOrg();
    }};
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
    const txt='버전 '+APP_VER+' · '+navigator.userAgent+'\n'+(ERRLOG.length?ERRLOG.join('\n'):'기록된 오류 없음');
    if(navigator.clipboard&&navigator.clipboard.writeText)
      navigator.clipboard.writeText(txt).then(()=>toast('복사했습니다')).catch(()=>toast('복사 실패'));
    else toast('복사를 지원하지 않는 브라우저입니다');
  },
  'bk.now':()=>{
    if(!isEditor())return toast('관리자만 내보낼 수 있습니다');
    const d=window.bkExport&&window.bkExport();
    if(!d)return toast('아직 자료를 다 받지 못했습니다 · 잠시 뒤 다시 눌러 주세요');
    bkDownload(d.name,d.text);
    try{localStorage.setItem(bkKey(),JSON.stringify({at:new Date().toISOString(),name:d.name,by:'수동'}));}catch(e){}
    rBk();toast('내려받기 폴더에 저장했습니다 · '+d.name);
  },
  'bk.restore':()=>{
    if(!isEditor())return toast('관리자만 되돌릴 수 있습니다');
    const inp=document.createElement('input');
    inp.type='file';inp.accept='.json,application/json';
    inp.onchange=()=>{
      const f=inp.files&&inp.files[0];if(!f)return;
      const rd=new FileReader();
      rd.onload=()=>{
        let d=null;
        try{d=JSON.parse(rd.result);}catch(e){return toast('읽을 수 없는 파일입니다');}
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
  'team.switch':el=>{
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
  'day.qclear':()=>{const i=$('#dpQ');if(i){i.value='';}S.dayQ='';dpSrchMark();rDay();},
  'day.fmore':()=>{const c=$('#dpFcard');if(c)c.classList.toggle('adv-on');},
  'filt.msel':el=>{const m=el.closest('.msel'),was=m.classList.contains('open');mselClose();if(!was)m.classList.add('open');},
  'filt.mopt':el=>{
    const m=el.closest('.msel'),g=m.dataset.g,st=mselStore(m);
    const cur=(st[g]||[]).map(String),i=cur.indexOf(el.dataset.v);
    if(i<0)cur.push(el.dataset.v);else cur.splice(i,1);
    st[g]=cur;mselApply(m);},
  'filt.mall':el=>{const m=el.closest('.msel');mselStore(m)[m.dataset.g]=[];mselApply(m);},
  /* 펼친 카드 안의 링크 — 클릭이 위임을 타고 올라가 '펼침'을 도로 접지 않게 여기서 멈춘다(이동은 a 기본 동작) */
  'lnk.open':()=>{},
  'cal.pick':()=>openYMPick(),
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
  'wid.side':el=>{evePopHide();widSideOpen(el.dataset.tab||'mine');},   /* 누르면 말풍선은 할 일을 다했다 */
  /* 위젯 내 업무에서 바로 완료/진행 전환 — 애니메이션을 보여 주고 목록을 다시 그린다 */
  'wid.st':el=>{
    const sid=el.dataset.sid,iid=el.dataset.iid;
    const cur=(S.tasks[sid]||{})[iid];if(!cur)return;
    const n=stEff(cur)===2?1:2;
    stxSet(el,n);
    store.putTask(sid,iid,{...cur,st:n,stKeep:n===1,updatedAt:Date.now()});
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
  /* 다중 선택 목록은 바깥을 누르면 닫는다 */
  if(!e.target.closest('.msel'))mselClose();

  /* 위젯 업무 팝업 — 달력 칸이나 팝업 자신이 아닌 곳을 누르면 닫는다 */
  if(WIDGET&&S.widPop&&!e.target.closest('#widPop')&&!e.target.closest('#fcal td.fc-daygrid-day')){
    S.widPop=false;rWidget();
  }
  /* 팝오버는 색 원 버튼 안에 들어 있다 — 여기서 막지 않으면 안쪽 클릭이 버튼까지 올라가 팝오버가 닫힌다 */
  if(e.target.closest('#colPop'))return;
  const el=e.target.closest('[data-act]');
  if(!el)return;
  if(el.tagName==='SELECT')return;   /* select 는 change 에서만 처리 — 누르기만 해도 실행되던 버그 방지 */
  const fn=ACT[el.dataset.act];
  if(fn){if(el.dataset.act!=='modal.stop')e.stopPropagation();fn(el);}
});
/* 달력 설정 팝업 닫기 — ⚠ click 이 아니라 **mousedown 캡처**로 듣는다.
   FullCalendar 가 달력 칸의 click 을 삼켜, click 위임으로는 달력 위를 눌렀을 때 안 닫힌다(openCtx 와 같은 함정).
   여는 버튼(#calSetWrap 안)은 제외 — 그래야 click 의 토글이 정상 동작한다(219차 게시월 토글과 같은 이유). */
function calSetClose(){
  const cs=$('#calSet');if(!cs||!cs.classList.contains('on'))return;
  cs.classList.remove('on');
  const b=document.querySelector('[data-act="cal.set"]');if(b)b.setAttribute('aria-expanded','false');
}
document.addEventListener('mousedown',e=>{
  if(e.target.closest&&e.target.closest('#calSetWrap'))return;
  calSetClose();
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')calSetClose();});

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
/* 색 직접 고르기 — 고른 색을 칩으로 붙이고 선택 상태로 만든다 */
document.addEventListener('input',e=>{
  const inp=e.target.closest('.pal-inp');if(!inp)return;
  const box=inp.closest('.pal');if(!box)return;
  const v=String(inp.value||'').toUpperCase();
  box.querySelectorAll('.pal-c').forEach(x=>x.classList.remove('sel'));
  let chip=box.querySelector('.pal-c.pal-custom');
  if(!chip){
    chip=document.createElement('div');chip.className='pal-c pal-custom';
    box.insertBefore(chip,inp.closest('.pal-add'));
  }
  chip.dataset.c=v;chip.style.background=v;chip.classList.add('sel');
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
  if(e.target.classList&&e.target.classList.contains('cp-hue')){
    const pop=$('#colPop');if(!pop)return;
    const d=pop.querySelector('.cp-dot');
    const [,sa,v]=hexHsv(rgbHex(d?d.style.background:''));
    const hex=hsvHex(Number(e.target.value)||0,sa||.7,v||.85);
    setPlanColor(hex);palAdd(hex);return;
  }
  if(e.target.id==='peKind'){peKindRefresh();return;}
  if(e.target.closest&&e.target.closest('#dpEdit'))planAutosave();
});
document.addEventListener('change',e=>{
  if(e.target.id==='teamSelEl'){ACT['team.switch'](e.target);return;}
  if(e.target.closest('[data-act="pf.org"]')){ACT['pf.org']();return;}
  if(e.target.id==='tnRec'){const r=$('#tnUntilRow');if(r)r.style.display=e.target.value?'':'none';return;}
  if(e.target.id==='tnKind'){kindOwnerSync('tnKind','tnAsg');tkKindRefresh();return;}   /* 구분에 따라 내용 칸 구성이 달라진다 */
  if(e.target.id==='peKind'){kindOwnerSync('peKind','peOwners');return;}   /* 팝업 편집기도 동일 규칙 */
  if(e.target.id==='peKind'){peKindRefresh();return;}
  const rl=e.target.closest('[data-act="acct.role"]');
  if(rl){ACT['acct.role'](rl);return;}
  if(e.target.id==='dpScope'){S.dayScope=e.target.value;filtSave();rDay();return;}
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
  if(el.dataset.act==='df.moYear'){S.dfMoYear=el.value;if(DF.lastDash)dfDashMonthTable(DF.lastDash);}
  else if(el.dataset.act==='df.detailYear'){S.dfDetailYear=el.value;rDefect();}
  else if(el.dataset.act==='df.trendYear'){
    if(el.dataset.scope==='dash'){S.dfTrendYearDash=el.value;const d=DF.lastDash;if(!d)return;
      const rmY=S.dfRm.slice(0,4);dfTrendDraw('trend','dfTrend',el.value===rmY?d.wks:dfDashWksOfYear(d.wk,el.value));}
    else{S.dfTrendYearSite=el.value;const key=dfRm()+'/'+S.dfSid,k=DF.kpi[key];if(!k)return;
      const rmY=S.dfRm.slice(0,4);dfTrendDraw('strend','dfSiteTrend',el.value===rmY?DF.sw[key]:dfWksOfYear(k.weekly,el.value));}}});
document.addEventListener('input',e=>{if(e.target.id==='recQ'){REC.q=e.target.value;
  const b=$('#mbody');if(!b)return;b.innerHTML=recBodyHTML();recHeadSync(REC.view.length,REC.rows.length);}});
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
/* 현장 표 인라인 저장 — 하자처리현황과 같은 즉시 반영 */
document.addEventListener('change',e=>{
  const el=e.target.closest('[data-act="org.siteUpd"]');
  if(!el)return;
  if(!isEditor()){denyEdit();rOrg();return;}
  const st=(S.org.sites||[]).find(x=>x.id===el.dataset.id);if(!st)return;
  const f=el.dataset.f,v=el.value;
  if(f==='units'||f==='buildings'||f==='commercialUnits'){
    st[f]=Number(String(v).replace(/[^0-9]/g,''))||0;   /* #,##0 표기의 콤마를 걷어내고 저장 */
    el.value=st[f].toLocaleString();                    /* 칸에도 서식을 되입힌다 */
  }else st[f]=String(v||'');
  orgSave();
  if(f==='region'&&!S.live)rOrg();   /* 권역이 바뀌면 정렬 위치가 달라진다 */
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
    const cur=Math.max(0,ids.indexOf(c.font==='sys'?'malgun':(c.font||'app')));
    c.font=ids[(cur+Number(fb.dataset.fontd)+ids.length)%ids.length];
    widCfgSave(c);widApply();
  }
});
document.addEventListener('input',e=>{
  if(e.target.id==='dpQ'){S.dayQ=e.target.value;dpSrchMark();rDay();return;}
  if(e.target.id==='tkQ'){
    S.tkF={...S.tkF,q:e.target.value};
    clearTimeout(tkQT);tkQT=setTimeout(tkRefresh,160);   /* 전체 렌더는 포커스를 날린다 */
  }
});
/* 아래에 더 있다는 표시 — 스크롤이 남아 있으면 칸 아래쪽을 서서히 지운다(끝에 닿으면 없앤다).
   ⚠ 덧칠이 아니라 mask 라서 카드 배경색이 무엇이든 그대로 어울린다 */
const SB_SEL='#content,.dp-body,.tk-list,.nq-res,.pf-emg,.rd-body,[data-sb]';
function fadeOne(el){
  if(!el||!el.classList)return;
  /* 미처리 보기(목록 rec-wrap·피벗 pv-scroll)에는 페이드를 걸지 않는다 — 사용자 지시(218차) */
  if(el.classList.contains('rec-wrap')||el.classList.contains('pv-scroll')){
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
  const el=e.target.closest&&e.target.closest('.pv-scroll,.rec-wrap');
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
function dpSrchMark(){const w=document.querySelector('.dp-srch');if(w)w.classList.toggle('has',!!String(S.dayQ||'').trim());}
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
    const fc=$('#dpFcard');
    if(fc&&fc.classList.contains('adv-on')){fc.classList.remove('adv-on');return;}
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
  const frame=document.querySelector('#fcal .fc-dayGridMonth-view .fc-daygrid-day-frame');
  if(!frame)return null;
  const num=frame.querySelector('.fc-daygrid-day-number');
  const ev=document.querySelector('#fcal .fc-daygrid-event-harness');
  if(!num||!ev)return null;
  const avail=frame.clientHeight-num.offsetHeight-2;          /* -2 는 day-events 의 padding-bottom */
  const pitch=ev.offsetHeight;                                /* harness 에 여백이 포함돼 있다 */
  const link=document.querySelector('#fcal .fc-daygrid-day-bottom');
  const lh=(link&&link.offsetHeight)||18;
  if(!(pitch>6)||avail<pitch)return null;
  const n=Math.floor((avail-lh)/pitch);
  return n<1?null:n;   /* 더보기 줄까지 넣을 자리도 없을 만큼 낮으면 자동에 맡긴다 */
}
function maxEvOf(){
  if(isNarrow())return 2;
  const n=calFitRows();
  return n===null?true:n;
}
/* 첫 렌더·달 이동 뒤에 다시 재서 맞춘다 — 값이 그대로면 건드리지 않는다(무한 재렌더 방지) */
let _maxEv=null;
function calFitApply(){
  if(!CAL||isNarrow())return;
  const n=calFitRows();
  if(n===null||n===_maxEv)return;
  _maxEv=n;CAL.setOption('dayMaxEvents',n);
}

function bindCalResize(){
  const sb=$('#sidebar');
  if(sb){
    /* 전환이 끝날 때만 다시 그리면 달력이 마지막에 뚝 바뀐다 —
       접히는 동안 매 프레임 따라 그려 이어지게 한다 */
    let raf=null,until=0;
    const follow=()=>{
      if(CAL)CAL.updateSize();
      if(performance.now()<until)raf=requestAnimationFrame(follow);
      else{raf=null;if(CAL)CAL.updateSize();}
    };
    const start=()=>{
      until=performance.now()+340;          /* --tr 은 .22s, 여유를 둔다 */
      if(!raf)raf=requestAnimationFrame(follow);
    };
    sb.addEventListener('transitionstart',e=>{
      if(e.propertyName==='width'||e.propertyName==='min-width')start();
    });
    sb.addEventListener('transitionend',e=>{
      if(e.propertyName==='width'||e.propertyName==='min-width'){until=0;if(CAL)CAL.updateSize();}
    });
    /* transitionstart 를 못 받는 경우 대비 — 토글 버튼에서도 건다 */
    document.addEventListener('click',e=>{if(e.target.closest('[data-act="nav.toggle"]'))start();});
  }
  let rt=null;
  const redraw=()=>{clearTimeout(rt);rt=setTimeout(()=>{
    if(!CAL)return;
    const nar=isNarrow();
    if(nar!==MOBILE_CAL){MOBILE_CAL=nar;_maxEv=null;CAL.setOption('dayMaxEvents',maxEvOf());}
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
/* 위젯 글꼴 — 윈도우에 늘 있는 것만. 굴림·돋움은 작은 크기 비트맵이 있어 더 또렷할 수 있다 */
const WID_FONTS=[['app','기본'],['malgun','맑은 고딕'],['gulim','굴림'],['dotum','돋움']];
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
  const font=FONTS.includes(c.font)?c.font:(c.font==='sys'?'malgun':'app');   /* 137차의 'sys' 는 맑은 고딕으로 */
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
    'body.wid.glass .cal-head .seg,body.wid.glass .cal-head .cal-nav,body.wid.glass .cal-title{background:rgba('+N+','+f(a*.9)+');}'
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
  const slot=$('#widFilterSlot'),fc=$('#dpFcard');
  if(slot&&fc&&!slot.contains(fc)){
    /* 위젯에는 찾기 기능을 두지 않는다 — 검색칸과 범위 선택은 아예 떼어 낸다(숨기면 값이 남아 필터처럼 작동한다) */
    const q=fc.querySelector('.dp-srch'),sc=fc.querySelector('.dp-scope');
    if(q)q.remove();
    if(sc)sc.remove();
    S.dayQ='';
    slot.appendChild(fc);                                 /* 필터 버튼만 헤더 줄로 */
  }
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
  box.style.maxHeight=Math.max(160,innerHeight-M*2)+'px';
  const td=document.querySelector('#fcal td[data-date="'+S.selDate+'"]');
  const r=td?td.getBoundingClientRect():{left:20,right:20,top:60};
  const w=box.offsetWidth,ht=box.offsetHeight;
  let x=r.right+M;if(x+w>innerWidth-M)x=r.left-w-M;
  x=Math.min(Math.max(M,x),Math.max(M,innerWidth-w-M));
  const y=Math.min(Math.max(M,r.top),Math.max(M,innerHeight-ht-M));
  box.style.left=Math.round(x)+'px';box.style.top=Math.round(y)+'px';
}

/* ═══════════ 부팅 ═══════════ */
function rAll(){rDay();rTasks();rOrg();rCfg();rFilter();rTeamSel();refetchCal();rWidget();}   /* 팀 선택기는 조직 화면 밖(사이드바)이라 rAll 에서도 그린다 */
(function boot(){
  let dark=false;
  try{dark=localStorage.getItem('calapp.theme')==='dark';}catch(e){}
  applyTheme(dark);
  if(WIDGET)document.body.classList.add('wid');
  if(WIDGET&&GLASS)document.body.classList.add('glass');
  if(WIDGET)widApply();
  filtLoad();          /* 지난번에 고른 필터를 되살린다(계정별·이 브라우저) */
  LocalStore.init();
  calInit();
  bindCalResize();
  subVisibleMonths();
  rDay();rAcct();rFilter();rTeamSel();rWidget();   /* 팀 선택기는 사이드바 상시 요소 — 부팅 때부터 그린다 */
  applyBg();
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
  if('serviceWorker' in navigator){
    navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});
    if(window.caches&&caches.keys)caches.keys().then(ks=>ks.forEach(k=>caches.delete(k))).catch(()=>{});
  }
})();
