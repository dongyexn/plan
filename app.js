/* ═══════════════════════════════════════════════════════════════
   H서비스센터 · 일정·업무 공유
   - 디자인·구조 원칙은 하자처리 현황 앱을 따른다 (토큰·컴포넌트 동일)
   - 데이터: 로그인 전 localStorage → 로그인 후 Firebase RTDB(calapp/*) 실시간
   - 같은 origin(GitHub Pages)·같은 Firebase 프로젝트라, 하자처리 현황에
     로그인돼 있으면 세션이 자동 공유되어 이 앱도 곧바로 실시간 모드가 된다.
   ═══════════════════════════════════════════════════════════════ */
'use strict';
const APP_VER='1.0.0';
const GUIDE_HTML=`<div class="gd">
<h4>내 업무</h4>
<p>내가 담당인 일정(앞으로 7일)과 미완료 주요업무, 받은 멘션을 한 화면에 모읍니다. 항목을 누르면 해당 화면으로 바로 이동합니다.</p>
<h4>찾기</h4>
<p>오른쪽 아래 <b>돋보기</b> 버튼(또는 <code>Ctrl</code>+<code>K</code>)으로 업무 제목·내용, 일정, 코멘트를 한 번에 찾습니다. 결과를 누르면 그 자리로 이동합니다.</p>
<h4>업무 일정</h4>
<p>달력에서 날짜를 누르면 오른쪽에 그날의 업무가 나옵니다. <b>업무 추가</b>를 누르면 오른쪽 패널 안에서 바로 작성·수정하고(따로 창이 뜨지 않습니다), 날짜를 가로로 끌면 여러 날에 걸친 업무가 됩니다.</p>
<ul>
<li>반복: 매주 · 격주 · 매월 · 매년. 반복 업무는 회차별로 완료 표시하며, 삭제할 때 이 날짜만 뺄지 전체를 지울지 고릅니다.</li>
<li>담당자를 한 명 지정하면 그 사람 색으로 표시되고, 권역 칩과 담당자 선택으로 좁혀 볼 수 있습니다.</li>
<li>자주 쓰는 조합은 <b>+ 필터 저장</b>으로 두면 한 번에 불러옵니다(내 계정에만 보임).</li>
<li>종 아이콘을 켜면 그날 아침 팀 전체에 리마인드 메일이 갑니다.</li>
</ul>
<h4>업무 목록</h4>
<p>왼쪽에서 대상을 고르면 오른쪽에 그 업무가 나옵니다. <b>팀 전체 업무</b>(공통 업무와 모든 권역·담당자 업무를 한 화면에), <b>공통 업무</b>, <b>권역</b>, 개별 <b>담당자</b>를 고를 수 있습니다.</p>
<ul>
<li><b>업무 추가</b>를 누르면 목록 위에 작성창이 열립니다. 제목과 함께 <b>진행경과</b>·<b>처리계획</b>을 나눠 적고, 현장·날짜·색·담당자·링크를 지정합니다.</li>
<li>항목을 누르면 스레드처럼 펼쳐집니다. 진행경과·처리계획은 그 자리에서 고치고, 아래 스레드에 코멘트를 남깁니다. 나머지는 오른쪽 위 <b>수정</b>을 누르면 작성창과 같은 폼이 그 자리에 열립니다.</li>
<li>왼쪽의 ⠿ 를 잡고 끌면 순서가 바뀝니다.</li>
<li>코멘트에 <code>@이름</code> 을 쓰면 그 사람에게 알림이 가고, 사이드바 배지로 표시됩니다.</li>
<li>상태 칩을 누르면 예정 → 진행 → 완료 → 보류 순으로 바뀝니다.</li>
<li>기한을 넣으면 D-표기가 붙고 임박·초과가 색으로 구분됩니다.</li>
<li>완료된 지 7일이 지난 항목은 자동으로 접힙니다.</li>
</ul>
<h4>조직/현장 관리 (관리자)</h4>
<p>팀 · 권역 · 현장을 등록하고, 가입한 계정에 팀 · 권역 · 담당 현장과 권한을 지정합니다. 이름은 눌러서 바로 고칩니다.</p>
<h4>권한</h4>
<ul>
<li><b>관리자</b> — 조직/현장 관리와 설정 변경까지 가능</li>
<li><b>사용자</b> — 일정과 업무는 자유롭게 작성, 조직 설정은 보기 전용</li>
</ul>
<h4>메일</h4>
<p>설정에서 당일 리마인드와 주간 요약을 켜고 끄고, 요일 · 수신 범위 · 제목 앞머리 · 안내 문구를 정합니다. 발송 시각만 저장소의 워크플로에서 정해집니다.</p>
<h4>문제가 생기면</h4>
<p>설정 &gt; 버전 · 오류 기록의 <b>복사</b>를 눌러 관리자에게 전달하면 원인 파악이 빠릅니다. 저장이 안 될 때는 대개 권한 문제이니 관리자에게 계정 권한을 확인해 달라고 하세요.</p>
</div>`;
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
/* 코멘트 본문 렌더 — 명부에 있는 @이름만 파란색으로 강조한다.
   esc() 로 이스케이프한 뒤 치환하므로 원문에 태그가 있어도 안전하다. */
function mentionHTML(txt){
  const h=esc(txt||'');
  const names=roster().map(p=>p.name).filter(Boolean)
    .sort((a,b)=>b.length-a.length);   /* 긴 이름 먼저 — '김동'이 '김동연'을 잘라먹지 않게 */
  if(!names.length)return h;
  const alt=names.map(n=>esc(n).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  /* 한 번만 훑는다 — 여러 번 replace 하면 방금 넣은 태그 안을 다시 치환해 중첩된다 */
  return h.replace(new RegExp('@('+alt+')','g'),(m,n)=>'<span class="mn">@'+n+'</span>');
}
/* ───── @ 자동완성 ─────
   코멘트 입력창에서 @ 를 치면 커서 바로 아래에 명부를 띄우고,
   ↑↓ 로 옮겨 Enter·Tab·클릭으로 넣는다. */
const MN={box:null,ta:null,list:[],idx:0,start:-1};
function mnClose(){if(MN.box){MN.box.remove();MN.box=null;}MN.ta=null;MN.list=[];MN.start=-1;}
/* textarea 안 커서 위치의 화면 좌표 — 거울 div 로 계산한다 */
function caretXY(ta,pos){
  const cs=getComputedStyle(ta),m=document.createElement('div');
  ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','padding','border','width','boxSizing','whiteSpace','wordBreak']
    .forEach(k=>{m.style[k]=cs[k];});
  m.style.cssText+=';position:absolute;visibility:hidden;white-space:pre-wrap;word-wrap:break-word;top:0;left:0;';
  m.textContent=ta.value.slice(0,pos);
  const mk=document.createElement('span');mk.textContent='\u200b';m.appendChild(mk);
  document.body.appendChild(m);
  const r=ta.getBoundingClientRect(),mr=mk.getBoundingClientRect(),br=m.getBoundingClientRect();
  m.remove();
  return{x:r.left+(mr.left-br.left)-ta.scrollLeft,y:r.top+(mr.top-br.top)-ta.scrollTop+(parseFloat(cs.lineHeight)||18)};
}
function mnRender(){
  if(!MN.box)return;
  MN.box.innerHTML=MN.list.map((p,i)=>
    '<div class="mn-i'+(i===MN.idx?' act':'')+'" data-i="'+i+'">'
    +'<span class="mn-av" style="background:'+esc(ownColor(p.id))+'">'+esc(String(p.name||'?').slice(0,1))+'</span>'
    +'<span class="mn-n">'+esc(p.name)+'</span>'
    +(p.email?'<span class="mn-e">'+esc(p.email)+'</span>':'')+'</div>').join('');
  const a=MN.box.querySelector('.mn-i.act');if(a&&a.scrollIntoView)a.scrollIntoView({block:'nearest'});
}
function mnOpen(ta,start,q){
  const me=S.user&&S.user.uid;
  const list=roster().filter(p=>p.id!==me&&p.name
    &&(!q||p.name.toLowerCase().indexOf(q.toLowerCase())>=0
        ||String(p.email||'').toLowerCase().indexOf(q.toLowerCase())>=0)).slice(0,8);
  if(!list.length){mnClose();return;}
  if(!MN.box){
    MN.box=document.createElement('div');MN.box.className='mn-pop';
    document.body.appendChild(MN.box);
  }
  MN.ta=ta;MN.list=list;MN.start=start;
  if(MN.idx>=list.length)MN.idx=0;
  mnRender();
  const xy=caretXY(ta,start);
  const w=Math.min(260,window.innerWidth-16);
  MN.box.style.width=w+'px';
  MN.box.style.left=Math.max(8,Math.min(xy.x,window.innerWidth-w-8))+'px';
  const h=MN.box.offsetHeight||160;
  /* 아래로 넘치면 커서 위로 띄운다 */
  MN.box.style.top=(xy.y+h>window.innerHeight-8?Math.max(8,xy.y-h-22):xy.y)+'px';
}
function mnPick(i){
  const p=MN.list[i];if(!p||!MN.ta)return;
  const ta=MN.ta,pos=ta.selectionStart;
  ta.value=ta.value.slice(0,MN.start)+'@'+p.name+' '+ta.value.slice(pos);
  const c=MN.start+p.name.length+2;
  mnClose();ta.focus();ta.setSelectionRange(c,c);
}
/* 커서 앞의 @토큰을 찾는다 — 단어 중간의 @(이메일 등)은 무시 */
function mnScan(ta){
  const pos=ta.selectionStart,v=ta.value.slice(0,pos);
  const at=v.lastIndexOf('@');
  if(at<0)return null;
  if(at>0&&!/[\s(\[]/.test(v[at-1]))return null;
  const q=v.slice(at+1);
  if(/[\s@]/.test(q)||q.length>20)return null;
  return{start:at,q};
}
document.addEventListener('input',e=>{
  const ta=e.target.closest('.th-in');if(!ta)return;
  const hit=mnScan(ta);
  if(hit)mnOpen(ta,hit.start,hit.q);else mnClose();
});
document.addEventListener('keydown',e=>{
  if(!MN.box||!MN.ta||e.target!==MN.ta)return;
  if(e.key==='ArrowDown'){e.preventDefault();MN.idx=(MN.idx+1)%MN.list.length;mnRender();return;}
  if(e.key==='ArrowUp'){e.preventDefault();MN.idx=(MN.idx-1+MN.list.length)%MN.list.length;mnRender();return;}
  if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();mnPick(MN.idx);return;}
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();mnClose();}
},true);
document.addEventListener('mousedown',e=>{
  const it=e.target.closest('.mn-i');
  if(it){e.preventDefault();mnPick(Number(it.dataset.i));return;}
  if(!e.target.closest('.mn-pop'))mnClose();
});
document.addEventListener('scroll',()=>{if(MN.box)mnClose();},true);

/* 아바타 배경색 즉시 반영 · 이모지 검색 */
function pfPaint(c){
  const av=document.querySelector('.acct-av');
  if(av&&c)av.style.setProperty('--avc',c);
}
document.addEventListener('click',e=>{
  /* 업무 색 팝오버에서 고르면 점에 반영하고 닫는다 */
  const ec=e.target.closest('#colPop .pal-c');
  if(ec&&!ec.classList.contains('pal-add')){
    const c=ec.dataset.c||'auto';
    if(S.planEdit&&S.planEdit.draft)S.planEdit.draft.color=c;
    const dot=$('#peColDot');if(dot)dot.setAttribute('style',colDotStyle(c));
    closeColPop();return;
  }
  const pc=e.target.closest('#pfPal .pal-c');
  if(pc&&!pc.classList.contains('pal-add')){PF_SEL.color=pc.dataset.c||'';setTimeout(()=>pfPaint(pc.dataset.c),0);acctAutoSave();return;}
  /* 팝오버 밖을 누르면 닫는다 — 아바타 버튼 자체는 토글이 처리 */
  const p=$('#pfPop');
  if(p&&p.classList.contains('open')&&!e.target.closest('#pfPop')&&!e.target.closest('[data-act="pf.toggle"]'))
    p.classList.remove('open');
});
document.addEventListener('input',e=>{
  if(e.target.id==='acctName'){acctAutoSave();return;}
  if(e.target.closest('#colPop')){const v=e.target.value;
    if(S.planEdit&&S.planEdit.draft)S.planEdit.draft.color=v;
    const dot=$('#peColDot');if(dot)dot.setAttribute('style',colDotStyle(v));return;}
  if(e.target.closest('#pfPal')){const v=e.target.value;PF_SEL.color=v;pfPaint(v);acctAutoSave();return;}
  if(e.target.id==='pfSrch'){
    const q=e.target.value.trim();
    $$('#pfCats .pf-cat').forEach(x=>x.classList.remove('act'));
    pfRenderEmg('smiley',q);
  }
});

/* 고른 뒤 드롭다운 목록과 '지정 안 함' 문구를 다시 맞춘다 */
/* 담당자 단일 지정 select — 53차에 다중 칩(ownPickHTML)에서 단순화 */
function ownSelHTML(id,cur,people){
  return `<select class="inp inp-sm" id="${id}" aria-label="담당자">
    <option value="">지정 안 함 — 팀 공통</option>
    ${people.map(p=>'<option value="'+esc(p.id)+'"'+(p.id===cur?' selected':'')+'>'+esc(p.name)+'</option>').join('')}
  </select>`;
}
function sitePickHTML(id,cur){
  const sites=(S.org.sites||[]).filter(x=>x.name);
  return `<select class="inp inp-sm" id="${id}">
    <option value="">현장 지정 안 함</option>
    ${sites.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===cur?' selected':'')+'>'+esc(x.name)+'</option>').join('')}
  </select>`;
}
/* 색 선택기 HTML — 기본 팔레트 + 임의 색 추가.
   현재 값이 팔레트에 없으면(직접 고른 색) 맨 뒤에 칩으로 붙여 선택 상태를 유지한다. */
/* 색 점 — 'auto'(담당자 색)는 3색 그라디언트로 표시 */
function colDotStyle(c){
  return (!c||c==='auto')?'background:linear-gradient(135deg,#3E71D2,#16A34A,#D97706)':'background:'+esc(c);
}
function palHTML(id,cur,extraFirst){
  const c=cur||'';
  const custom=c&&c!=='auto'&&PAL.indexOf(c)<0?c:'';
  return '<div class="pal" id="'+id+'">'+(extraFirst||'')
    +PAL.map(x=>'<div class="pal-c'+(x===c?' sel':'')+'" data-c="'+x+'" style="background:'+x+'"></div>').join('')
    +(custom?'<div class="pal-c sel" data-c="'+esc(custom)+'" style="background:'+esc(custom)+'"></div>':'')
    +'<label class="pal-c pal-add" title="색 직접 고르기">'
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
  const list=roster();const i=list.findIndex(p=>p.id===pid);
  return i<0?PAL[0]:OWN_PAL[i%OWN_PAL.length];
}
function ownName(pid){const p=roster().find(x=>x.id===pid);return p?p.name:'';}
function planOwners(p){
  const o=Object.keys((p&&p.owners)||{});
  if(o.length)return o;
  return p&&p.owner?[p.owner]:[];   /* 구버전 단일 담당자 호환 */
}
function planColor(p){
  if(p.color&&p.color!=='auto')return p.color;
  const o=planOwners(p);
  return o.length?ownColor(o[0]):PAL[0];
}
const ST_LBL=['예정','진행','완료','보류'];
const DEFECT_URL='https://dongyexn.github.io/report/';  // 하자처리 현황 배포 주소(기본값)
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
function holOf(ds){if(HOLI[ds])return{n:HOLI[ds],h:true};const a=ANNIV[ds.slice(5)];return a?{n:a,h:false}:null;}
function toDate(ds){const[a,b,c]=ds.split('-').map(Number);return new Date(a,b-1,c);}
function addDays(ds,n){const d=toDate(ds);d.setDate(d.getDate()+n);return dstr(d);}
function addMonths(ds,n){const d=toDate(ds);const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+n);
  const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));return dstr(d);}
function daysBetween(a,b){return Math.round((toDate(b)-toDate(a))/86400000);}
const REC_LBL={'':'반복 없음',w:'매주','2w':'격주',m:'매월',y:'매년'};
/* 53차: 시각은 시작 하나만 쓴다 — endTime 은 폐기(옛 데이터는 무시) */
function fmtSpan(p){return p&&p.time?fmtTime(p.time):'';}
function fmtTime(t){if(!t)return'';const[h,m]=t.split(':').map(Number);const ap=h<12?'오전':'오후';const hh=h%12===0?12:h%12;return ap+' '+hh+':'+pad(m);}
function relTime(ts){if(!ts)return'';const d=Date.now()-ts;const m=Math.floor(d/6e4);if(m<1)return'방금';if(m<60)return m+'분 전';const h=Math.floor(m/60);if(h<24)return h+'시간 전';return Math.floor(h/24)+'일 전';}

/* ───── 상태 ───── */
const S={
  view:'calendar',
  selDate:todayStr(),
  org:{teams:[],regions:[],sites:[]},  // 팀·권역·현장 목록 (모두 {id,name}, 현장은 team·region 포함)
  people:{},         // calapp/people/{id}: {name,email,team,region} — id는 로그인 uid
  accounts:{},       // users/{uid}: {email,name,role} — 하자처리 현황과 공용
  tasks:{},          // {memberId:{itemId:{text,st,updatedAt}}}
  cfg:{},            // {defectUrl}
  tk:{t:null,r:'*',m:null},   // 주요업무 현황 탭 선택(팀/권역/담당자)
  filter:{own:'*',reg:'*'},  // 달력 필터: 담당자 · 권역
  foldOpen:{},       // 완료 항목 접힘 해제(subjectId별)
  tkNew:null,        // 인라인 작성창이 열린 대상
  tkEdit:null,       // 인라인 수정 중인 업무 'sid/iid'
  tkOpen:null,       // 펼쳐 놓은 업무 'sid/iid'
  planEdit:null,     // 일자 패널 인라인 편집기 상태
  dayQ:'',           // 일자 패널 검색어
  tkF:{q:'',st:'',due:''},   // 주요업무 검색·필터
  orgTab:'acct',     // 조직/현장 관리 우측 탭 (acct | site)
  cmtRe:'',          // 답글 입력창을 연 코멘트 (sid/iid/cid)
  cmtNew:'',         // 코멘트 입력창을 연 업무 (sid/iid)
  prefs:{},          // calapp/prefs/{uid} — 저장한 필터 등 개인 설정
  mentions:{},       // calapp/mentions/{uid} — 나를 부른 코멘트
  live:false,        // Firebase 실시간 모드 여부
  role:null,         // editor · viewer (users/{uid})
  acctDenied:false,  // users 노드 읽기 권한 없음
  user:null,
};

/* 입력 중이면 실시간 수신이 타이핑을 덮어쓰지 않도록 렌더 보류 (하자처리 현황 패턴) */
function shEditing(){const a=document.activeElement;return !!(a&&(a.tagName==='TEXTAREA'||a.tagName==='INPUT'||a.isContentEditable));}
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
  setTimeout(()=>{if(shEditing())return;
  if(PEND.day){PEND.day=false;if(!S.planEdit)rDay();refetchCal();}
  if(PEND.tasks){PEND.tasks=false;if(!S.tkNew&&!S.tkEdit)rTasks();}
  if(PEND.org){PEND.org=false;rOrg();}
},60);});

/* DB 규칙이 스키마 외 키를 거부($other:false)하므로, 저장 전에 필드를 정제한다.
   반복이 아닌 일정에 doneOn/skipOn 이 남아 들어가는 것도 여기서 걸러진다. */
function cleanTask(t){
  const o={text:String(t.text||'').slice(0,500),st:stOf(t.st),
    createdAt:Number(t.createdAt)||Date.now(),updatedAt:Number(t.updatedAt)||Date.now()};
  /* 일정 성격 — 날짜가 있으면 달력에도 뜬다 */
  if(t.date)o.date=String(t.date).slice(0,10);
  if(t.end)o.end=String(t.end).slice(0,10);
  if(t.time)o.time=String(t.time).slice(0,5);
  if(t.remind)o.remind=true;
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
      if(/^https?:\/\//i.test(u))o.links[k]={url:u.slice(0,500),label:String(l.label||'').slice(0,80)};});
    if(!Object.keys(o.links).length)delete o.links;
  }
  if(t.comments&&Object.keys(t.comments).length){
    o.comments={};
    Object.keys(t.comments).forEach(k=>{const c=t.comments[k]||{};
      o.comments[k]={by:String(c.by||'').slice(0,60),text:String(c.text||'').slice(0,500),at:Number(c.at)||Date.now()};
      if(c.uid)o.comments[k].uid=String(c.uid).slice(0,60);
      if(c.re)o.comments[k].re=String(c.re).slice(0,40);});
  }
  return o;
}
const RANKS=[['member','담당자'],['lead','공구장'],['head','팀장']];
function rankOf(v){return RANKS.some(r=>r[0]===v)?v:'member';}
function rankLabel(v){const r=RANKS.find(x=>x[0]===rankOf(v));return r?r[1]:'담당자';}
/* 직급별로 쓰는 칸이 다르다 — 팀장은 팀 전체를 보므로 권역·현장을 두지 않는다 */
function rankUses(v){const r=rankOf(v);return{region:r!=='head',sites:r==='member'};}   /* 공구장은 권역 전체를 맡는다 */
/* 팀장·공구장 지정은 아무나 하면 안 된다 — 관리자이거나, 이미 팀장·공구장인 사람만 */
function canSetRank(){
  if(!S.live)return true;
  if(isEditor())return true;
  const me=S.user&&roster().find(p=>p.id===S.user.uid);
  return !!me&&(rankOf(me.rank)==='head'||rankOf(me.rank)==='lead');
}
function autoSitesHTML(p){
  const r=rankOf(p.rank),n=coverSites(p).length;
  return '<span class="rk-all">'+(r==='head'?'팀 전체':'권역 전체')
    +(n?' · '+n+'개 현장':'')+'</span>';
}
/* 공구장·팀장이 실제로 맡는 현장 — 화면 표시용 */
function coverSites(p){
  const r=rankOf(p.rank);
  if(r==='head')return (S.org.sites||[]).filter(x=>!x.team||x.team===p.team);
  if(r==='lead')return (S.org.sites||[]).filter(x=>(x.region||'')===(p.region||''));
  return (S.org.sites||[]).filter(x=>(p.sites||{})[x.id]);
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
  init(){this._d=lsLoad();this._d.plans=this._d.plans||{};this._d.recur=this._d.recur||{};this._d.org=this._d.org||{teams:[],regions:[],sites:[]};this._d.tasks=this._d.tasks||{};this._d.cfg=this._d.cfg||{};this._d.people=this._d.people||{};this._d.prefs=this._d.prefs||{};
    migrateOrg(this._d);
    const moved=migratePlans(this._d)|migrateDue(this._d);
    normOrg(this._d.org);
    if(moved)lsSave(this._d);   /* 옮긴 결과를 저장하지 않으면 새로고침 때마다 되살아난다 */
    S.org=this._d.org;S.tasks=this._d.tasks;S.cfg=this._d.cfg;S.people=this._d.people;S.prefs=this._d.prefs;S.accounts={};},
  subPlans(){},
  putPlan(p){const{sid,iid,item}=planToTask(p);this.putTask(sid,iid,item);},
  delPlan(ym,id){const hit=allTasks().find(x=>x.iid===id);if(hit)this.putTask(hit.sid,hit.iid,null);},
  movePlan(p){this.putPlan(p);},
  putOrg(org){this._d.org=org;S.org=org;lsSave(this._d);},
  putPerson(id,p){if(p)this._d.people[id]=p;else delete this._d.people[id];S.people=this._d.people;lsSave(this._d);},
  putTask(mid,iid,item){this._d.tasks[mid]=this._d.tasks[mid]||{};if(item)this._d.tasks[mid][iid]=item;else delete this._d.tasks[mid][iid];S.tasks=this._d.tasks;lsSave(this._d);},
  putCfg(k,v,cb){this._d.cfg[k]=v;S.cfg=this._d.cfg;lsSave(this._d);if(cb)cb(null);},
  putPref(k,v){this._d.prefs=this._d.prefs||{};if(v)this._d.prefs[k]=v;else delete this._d.prefs[k];S.prefs=this._d.prefs;lsSave(this._d);},
  putMention(){}
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
    localStorage.setItem(BOOT_KEY,JSON.stringify({org:S.org,people:S.people,tasks:S.tasks,cfg:S.cfg,at:Date.now()}));
  }catch(e){}},500);
}
function bootCacheClear(){try{localStorage.removeItem(BOOT_KEY);}catch(e){}}
const FbStore={
  name:'fb',
  init(){},
  _on(path,cb,onErr){const r=FB.db.ref(path);r.on('value',s=>cb(s.val()),e=>{if(onErr)onErr(e);else console.warn('[FB] read',path,e);});FB._subs.push(r);},
  subPlans(){},
  putPlan(p){const{sid,iid,item}=planToTask(p);this.putTask(sid,iid,item);},
  delPlan(ym,id){const hit=allTasks().find(x=>x.iid===id);if(hit)this.putTask(hit.sid,hit.iid,null);},
  movePlan(p){this.putPlan(p);},
  putOrg(org){FB.db.ref('calapp/org').set(cleanOrg(org)).catch(fbErr);},
  putPerson(id,p){const r=FB.db.ref('calapp/people/'+id);(p?r.set(cleanPerson(p)):r.remove()).catch(fbErr);},
  putTask(mid,iid,item){const r=FB.db.ref('calapp/tasks/'+mid+'/'+iid);(item?r.set(cleanTask(item)):r.remove()).catch(fbErr);},
  putCfg(k,v,cb){FB.db.ref('calapp/cfg/'+k).set(v).then(()=>cb&&cb(null)).catch(e=>{fbErr(e);if(cb)cb(e);});},
  putPref(k,v){const uid=S.user&&S.user.uid;if(!uid)return;
    const r=FB.db.ref('calapp/prefs/'+uid+'/'+k);(v?r.set(v):r.remove()).catch(fbErr);},
  putMention(uid,id,m){FB.db.ref('calapp/mentions/'+uid+'/'+id)[m?'set':'remove'](m).catch(()=>{});},
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
        site:String(p.site||''),color:String(p.color||''),remind:!!p.remind,
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
  bindShared(){
    this.migrateRemote();

    this._on('calapp/org',v=>{S.org=v||{teams:[],regions:[],sites:[]};normOrg(S.org);bootCacheSave();
      if(shEditing()){PEND.org=true;PEND.tasks=true;return;}
      rOrg();rTasks();});
    this._on('calapp/tasks',v=>{S.tasks=v||{};bootCacheSave();
      if(shEditing()){PEND.tasks=true;PEND.day=true;return;}
      rTasks();refetchCal();rDay();rWidget();});   /* 업무가 곧 일정 — 달력도 함께 갱신 */
    this._on('calapp/people',v=>{S.people=v||{};bootCacheSave();
      if(shEditing()){PEND.org=true;PEND.tasks=true;return;}
      rOrg();rTasks();});
    /* 하자처리 현황과 공용인 users 노드 — 계정 목록을 그대로 가져온다.
       규칙상 읽기가 막히면(관리자 전용 등) 조용히 수동 명부로 대체한다. */
    this._on('users',v=>{S.accounts=v||{};S.acctDenied=false;
      const me=S.user&&S.accounts[S.user.uid];
      if(me)FB.userRec={...(FB.userRec||{}),...me};
      rAcct();                                   /* 사이드바 아바타·이름도 함께 갱신 */
      if(shEditing()){PEND.org=true;PEND.tasks=true;return;}
      rOrg();rTasks();rFilter();},
      e=>{S.accounts={};S.acctDenied=true;console.warn('[FB] users 읽기 권한 없음',e);rOrg();rTasks();});
    this._on('calapp/cfg',v=>{S.cfg=v||{};bootCacheSave();rCfg();});
    const uid=S.user&&S.user.uid;
    if(uid){
        this._on('calapp/mentions/'+uid,v=>{S.mentions=v||{};rMention();if(S.view==='mine')rMine();});
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
      site:String(p.site||''),color:String(p.color||''),remind:!!p.remind,
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
async function fbDoLogin(){
  const c=fbValidCreds('사용');if(!c)return;
  const email=c.email;
  fbMsg('로그인 중…',true);
  clearTimeout(FB._watch);
  FB._watch=setTimeout(()=>{if(!S.live)fbMsg('로그인 처리가 지연되고 있습니다 · 새로고침(F5) 후 다시 시도해 주세요.');},9000);
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
          :'<div class="myorg-fix">팀 전체<span>팀장</span></div>'}
      </div>
    </div>
  </div>`;
}
/* 직급·권역을 바꾸면 아래 칸 구성이 달라진다 — 소속 블록만 다시 그린다 */
function pfScopeRefresh(){
  const wrap=document.querySelector('.myorg');if(!wrap)return;
  const u=S.user;if(!u)return;
  const tSel=$('#acctTeam'),rSel=$('#acctRank'),gSel=$('#acctRegion');
  const cur=(S.people||{})[u.uid]||{};
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
      ${EMOJI_CATS.map((c,i)=>rec.length||i?'<button class="pf-cat" data-cat="'+c.id+'" data-act="pf.cat" title="'+esc(c.label)+'">'+esc(c.s.slice(0,c.s.indexOf(' ')))+'</button>':'').join('')}
    </div>
    <div class="pf-emg" id="pfEmg"></div>
    <div class="pf-lab">배경색</div>
    ${palHTML('pfPal',av.color||ownColor((S.user||{}).uid))}
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
    box.innerHTML='<button class="pf-em dflt" data-e="" data-act="pf.pick" title="기본 아이콘">'+AV_DFLT+'</button>';
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
  const m=mb.getBoundingClientRect();
  const w=p.offsetWidth||336,h=p.offsetHeight||372,gap=12;
  let left,top;
  if(m.right+gap+w<=window.innerWidth-8){left=m.right+gap;top=m.top;}
  else if(m.left-gap-w>=8){left=m.left-gap-w;top=m.top;}
  else if(m.bottom+gap+h<=window.innerHeight-8){left=Math.max(8,m.left);top=m.bottom+gap;}
  else{left=Math.max(8,Math.min(m.left+16,window.innerWidth-w-8));top=Math.max(8,m.top+16);}
  top=Math.max(8,Math.min(top,window.innerHeight-h-8));
  p.style.left=Math.round(left)+'px';
  p.style.top=Math.round(top)+'px';
}
window.addEventListener('resize',()=>{const p=$('#pfPop');if(p&&p.classList.contains('open'))pfPlace();});
function pfDrop(){const p=document.getElementById('pfPop');if(p&&p.parentElement===document.body)p.remove();}
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
    <div class="acct-pane">${acctTabBody(t)}</div>`;
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
  const selc=$('#pfPal .pal-c.sel');
  const color=PF_SEL.color!==null?PF_SEL.color:(selc?(selc.dataset.c||''):cur.color);
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
      try{const EP=firebase.appCheck.ReCaptchaEnterpriseProvider;
        firebase.appCheck().activate(EP?new EP(FB.APPCHECK_KEY):FB.APPCHECK_KEY,true);}
      catch(e){console.warn('[FB] appCheck',e);}
    }
    FB.auth=firebase.auth();FB.db=firebase.database();
    FB.auth.onAuthStateChanged(onAuth);
  }catch(e){console.warn('[FB] init',e);showGateForm();fbMsg('네트워크에 연결할 수 없습니다.');}
}
function enterLive(u){
  if(S.live)return;
  clearTimeout(FB._boot);clearTimeout(FB._watch);hideCover();
  S.live=true;S.user=u;store=FbStore;
  /* FB 첫 응답 전까지 마지막 캐시로 먼저 그린다 — 매일 여는 도구의 체감 속도.
     구독 값이 도착하면 그대로 덮어써서 캐시가 화면에 남는 일은 없다. */
  const c=bootCacheLoad();
  if(c){
    S.org=c.org||S.org;normOrg(S.org);
    S.people=c.people||{};S.tasks=c.tasks||{};S.cfg=c.cfg||{};
    rAll();
  }
  FbStore.bindShared();
  subVisibleMonths();
  rAcct();
}
function exitLive(){
  const was=S.live;
  S.live=false;S.user=null;
  FB._subs.forEach(r=>{try{r.off();}catch(e){}});FB._subs=[];
  store=LocalStore;LocalStore.init();
  subVisibleMonths();rAll();rAcct();
}
function rTeamSel(){
  const el=$('#teamsel');if(!el)return;
  const teams=(S.org.teams||[]).filter(t=>t.name);
  if(!teams.length){$('#tselWrap').innerHTML='';el.style.display='none';return;}
  el.style.display='';
  if(!teams.some(t=>t.id===S.tk.t))S.tk.t=teams[0].id;
  const opts=teams.map(t=>'<option value="'+esc(t.id)+'"'+(t.id===S.tk.t?' selected':'')+'>'+esc(t.name)+'</option>').join('');
  /* 선택창은 정적 마크업 — 내용만 채운다 */
  $('#tselWrap').innerHTML='<select id="teamSelEl" aria-label="팀 선택">'+opts+'</select>'
    +'<span class="tsel-ch"><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 3.5l3 3 3-3"/></svg></span>';
}
function mentionCount(){return Object.keys(S.mentions||{}).length;}
function rMention(){
  const b=$('#mentionBadge');if(!b)return;
  const n=mentionCount();
  b.textContent=n?String(n):'';
  b.style.display=n?'':'none';
}
function openMentionModal(){
  const ms=Object.entries(S.mentions||{}).sort((a,b)=>(b[1].at||0)-(a[1].at||0));
  openModal('내 멘션',
    ms.length?'<div class="cmt">'+ms.map(([id,m])=>`
      <div class="cmt-i" data-act="mention.go" data-id="${esc(id)}" data-sid="${esc(m.sid||'')}" data-iid="${esc(m.iid||'')}" style="cursor:pointer">
        <div class="cmt-h"><b>${esc(m.by||'')}</b><span>${esc(relTime(m.at))}</span></div>
        <div class="cmt-t">${mentionHTML(m.text)}</div>
      </div>`).join('')+'</div>'
      :'<div class="cmt-empty">받은 멘션이 없습니다.</div>',
    ms.length?'<button class="btn bg2 bsm" data-act="mention.clear">모두 읽음</button><button class="btn bp bsm" data-act="modal.close">닫기</button>':'');
}
function rAcct(){
  const nm=$('#sbAcctName'),rb=$('#sbAcctRole');
  if(!nm)return;
  if(!S.user){nm.textContent=DEV_LOCAL?'로컬 모드':'로그인 전';nm.title='';if(rb){rb.textContent='';rb.className='sb-acct-role';}return;}
  const nick=acctNick()||'사용자';
  nm.textContent=nick;nm.title=nick;
  if(rb){const role=S.role||'viewer';rb.textContent=roleLabel(role);rb.className='sb-acct-role '+(role==='editor'?'r-editor':'r-viewer');}
  const av=$('#sbAcctAv');
  if(av&&S.user){
    const a=avOf(S.user.uid);
    av.classList.add('av-cus');
    av.style.setProperty('--avc',a.color||ownColor(S.user.uid));
    av.innerHTML=avInner(a.icon);   /* 이모지·기본 아이콘 모두 처리 */
  }
}

/* ═══════════ 달력 (FullCalendar) ═══════════ */
let CAL=null,MOBILE_CAL=null;
function calInit(){
  MOBILE_CAL=isNarrow();
  CAL=new FullCalendar.Calendar($('#fcal'),{
    initialView:'dayGridMonth',
    initialDate:S.selDate,
    firstDay:0,fixedWeekCount:false,showNonCurrentDates:true,
    /* 시간은 제목 안의 fmtSpan 이 담당 — FC 기본 표기("10a")를 켜 두면 이중으로 찍힌다 */
    displayEventTime:false,
    headerToolbar:false,height:'100%',dayMaxEvents:maxEvOf(),
    moreLinkContent:a=>'+'+a.num,
    dayHeaderContent:a=>DOW[a.date.getDay()],
    dayCellClassNames:a=>{const o=holOf(dstr(a.date));return o&&o.h?['hol']:[];},
    dayCellContent:a=>{
      const ds=dstr(a.date),o=holOf(ds);
      const today=ds===todayStr()?'<span class="dhol dtoday">오늘</span>':'';
      return{html:today+(o?'<span class="dhol'+(o.h?'':' anv')+'">'+esc(o.n)+'</span>':'')+'<span class="dnum">'+a.date.getDate()+'</span>'};},
    events:(info,ok)=>ok(buildEvents()),
    dateClick:info=>{selDate(String(info.dateStr).slice(0,10));},
    eventClick:info=>{info.jsEvent.preventDefault();
      const t=info.event.extendedProps.task;
      if(t){gotoTask(t.sid,t.iid);return;}
      const p=findPlan(info.event.extendedProps.pid);
      if(p){selDate(info.event.extendedProps.occ||p.date);openPlanEdit(p,null,null,info.event.extendedProps.occ);}},
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
      selDate(a);openPlanEdit(null,a,b);},
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
function planEvent(p,date){
  const span=p.end?daysBetween(p.date,p.end):0;
  const done=p.recur&&p.recur.f?!!(p.doneOn&&p.doneOn[date]):!!p.done;
  const own=p.owner?ownName(p.owner):'';
  return{
    id:p.id+'@'+date,
    title:(fmtSpan(p)?fmtSpan(p)+' ':'')+p.title+(own?' · '+own:''),
    start:(p.time&&!p.end)?date+'T'+p.time:date,
    end:span>0?addDays(date,span+1):undefined,
    allDay:!p.time||!!p.end,
    backgroundColor:planColor(p),borderColor:'transparent',textColor:'#fff',
    classNames:done?['done']:[],
    extendedProps:{pid:p.id,occ:date,recur:!!(p.recur&&p.recur.f)},
    editable:!(p.recur&&p.recur.f)
  };
}
function visibleRange(){
  if(!CAL)return[S.selDate,S.selDate];
  const a=CAL.view.activeStart,b=new Date(CAL.view.activeEnd);b.setDate(b.getDate()-1);
  return[dstr(a),dstr(b)];
}
function regSel(){const r=S.filter.reg;return Array.isArray(r)?r:(r&&r!=='*'?[r]:[]);}
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
  const sid=prev?prev.sid:(owns[0]||(curTeam()&&curTeam().id)||(S.org.teams&&S.org.teams[0]&&S.org.teams[0].id)||'team');
  const base=prev?prev.it:{};
  const item={...base,
    text:p.title!==undefined?p.title:base.text,
    prog:p.body!==undefined?p.body:base.prog,
    date:p.date||'',end:p.end||'',time:p.time||'',
    site:p.site!==undefined?p.site:(base.site||''),
    color:p.color||base.color||'',
    remind:!!p.remind,
    assignees:(()=>{const o={};owns.forEach(k=>{o[k]=1;});return o;})(),
    recur:(p.recur&&p.recur.f)?{f:p.recur.f,until:String(p.recur.until||'')}:{f:'',until:''},
    st:p.done?2:stOf(base.st),
    createdAt:Number(base.createdAt||p.createdAt)||Date.now(),updatedAt:Date.now()};
  ['doneOn','skipOn','moveOn'].forEach(k=>{if(p[k])item[k]=p[k];else if(base[k])item[k]=base[k];});
  if(!item.recur.f){delete item.doneOn;delete item.skipOn;delete item.moveOn;}
  return{sid,iid:p.id,item};
}
function taskAsPlan(sid,iid,it){
  /* 달력·일자 패널이 쓰던 모양으로 감싼다 — 필드 이름만 맞춰 준다 */
  return{...it,id:iid,sid,title:it.text||'',body:it.prog||it.body||'',
    owners:it.assignees||{},done:stOf(it.st)===2};
}
function buildEvents(){
  const evs=[],[from,to]=visibleRange(),today=todayStr();
  allTasks().forEach(({sid,iid,it})=>{
    if(!taskOwnOk(sid,it))return;
    const p=taskAsPlan(sid,iid,it);
    if(it.date){
      if(it.recur&&it.recur.f)recurDates(p,from,to).forEach(d=>evs.push(planEvent(p,d)));
      else evs.push(planEvent(p,it.date));
    }
  });
  return evs;
}
function refetchCal(){if(CAL)CAL.refetchEvents();}
function findPlan(id){
  const hit=allTasks().find(x=>x.iid===id);
  return hit?taskAsPlan(hit.sid,hit.iid,hit.it):null;
}
function subVisibleMonths(){
  if(!CAL)return;
  const c=CAL.view.currentStart;
  [-1,0,1].forEach(k=>{const d=new Date(c.getFullYear(),c.getMonth()+k,1);store.subPlans(d.getFullYear()+'-'+pad(d.getMonth()+1));});
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
  /* 헤더 카드는 overflow:hidden 이라 그 안에 붙이면 잘린다 — 바깥 열(.dp-col)을 기준으로 */
  const host=$('#view-calendar .dp-col');if(!host)return;
  const pop=document.createElement('div');
  pop.id='ymPop';pop.innerHTML=ymPickHTML();
  const head=$('#view-calendar .dp-filtercard');
  if(head)pop.style.top=(head.offsetTop+head.offsetHeight+7)+'px';   /* 헤더 카드 바로 아래 */
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
  $$('#fcal .fc-daygrid-day.sel-day').forEach(el=>el.classList.remove('sel-day'));
  const td=$('#fcal td[data-date="'+S.selDate+'"]');
  if(td)td.classList.add('sel-day');
}
function selDate(ds){
  ds=String(ds||'').slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(ds))return;   /* 잘못된 값이 들어오면 무시 — NaN 표시 방지 */
  S.selDate=ds;
  setTimeout(rWidget,0);
  if(CAL&&ymOf(ds)!==CAL.view.currentStart.getFullYear()+'-'+pad(CAL.view.currentStart.getMonth()+1))CAL.gotoDate(ds);
  markSel();
  if(isMob()&&S.view==='calendar')dpSheet(true);
  /* 편집기가 열려 있으면 입력을 지우지 않는다 — 새 업무 작성 중엔 시작일만 따라간다 */
  if(S.planEdit&&$('#dpEdit')){
    rDayHead();
    if(!S.planEdit.orig){const i=$('#peDate');if(i)i.value=ds;}
    return;
  }
  rDay();
}

/* ───── 우측 일자 패널 ───── */
function dayPlans(ds,raw){
  /* raw=true 면 화면 필터·검색을 무시한다(메일 미리보기 등) */
  const out=[];
  allTasks().forEach(({sid,iid,it})=>{
    if(!it.date)return;
    if(!raw&&!taskOwnOk(sid,it))return;
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
  const f=S.filter.own;
  if(!f||f==='*')return true;
  return who.includes(f);
}
function rDayHead(){
  const ds=S.selDate,d=toDate(ds),ps=dayPlans(ds),ho=holOf(ds);
  $('#dpDate').textContent=d.getFullYear()+'. '+(d.getMonth()+1)+'. '+d.getDate()+'.';
  /* 헤더 우측 보조문구 — 요일·공휴일·오늘 */
  const dow=$('#dpDow');
  if(dow)dow.textContent=DOW[d.getDay()]+'요일'+(ho?' · '+ho.n:'')+(ds===todayStr()?' · 오늘':'');
  return ps;
}
function rDay(){
  const ps=rDayHead();
  const box=$('#dpList');
  /* 작성 중에도 버튼은 남기고, 누르면 새 업무 폼으로 바꾼다 */
  const add=$('.dp-add');if(add)add.classList.toggle('on',!!S.planEdit);
  const editorHTML=S.planEdit?planFormHTML():'';
  const editingId=S.planEdit&&S.planEdit.orig?S.planEdit.orig.id:null;
  const shown=ps.filter(x=>x.p.id!==editingId);   /* 편집 중인 항목은 폼이 대신한다 */
  if(!shown.length&&!editorHTML){
    box.innerHTML='<div class="dp-empty">'+(dayQ()?'검색 결과가 없습니다.':'이 날짜에 등록된 업무가 없습니다.')+'</div>';return;}
  box.innerHTML=editorHTML+shown.map(({p,occ})=>{
    const done=isDone(p,occ),rep=p.recur&&p.recur.f,span=p.end&&p.end!==p.date;
    return `
    <div class="plan${done?' done':''}" data-pid="${esc(p.id)}">
      <div class="pc" style="background:${esc(planColor(p))}"></div>
      <div class="plan-main" data-act="plan.open" data-pid="${esc(p.id)}" data-occ="${esc(occ)}">
        <div class="plan-t">${esc(p.title)}</div>
        ${p.body?'<div class="plan-body">'+esc(p.body)+'</div>':''}
        <div class="plan-meta">
          ${fmtSpan(p)?'<span class="pm-chip">'+esc(fmtSpan(p))+'</span>':''}
          ${p.site?'<span class="pm-chip site-on">'+esc(siteName(p.site))+'</span>':''}
          ${span?'<span class="pm-chip">'+(toDate(p.date).getMonth()+1)+'/'+toDate(p.date).getDate()+'–'+(toDate(p.end).getMonth()+1)+'/'+toDate(p.end).getDate()+'</span>':''}
          ${rep?'<span class="pm-chip rep">'+esc(REC_LBL[p.recur.f])+'</span>':''}
          ${planOwners(p).map(o=>'<span class="pm-chip own"><span class="dot-c" style="background:'+esc(ownColor(o))+'"></span>'+esc(ownName(o))+'</span>').join('')}
          ${p.remind?'<span class="pm-chip remind"><svg class="icn"><use href="#i-bell"></use></svg>리마인드</span>':''}
        </div>
      </div>
      <div class="plan-side">
        <button class="p-ico" data-act="plan.edit" data-pid="${esc(p.id)}" data-occ="${esc(occ)}" aria-label="수정" title="수정"><svg class="icn"><use href="#i-pen"></use></svg></button>
        <button class="p-ico${done?' on':''}" data-act="plan.done" data-pid="${esc(p.id)}" data-occ="${esc(occ)}" aria-label="완료 표시" style="${done?'color:var(--gn)':''}"><svg class="icn"><use href="#i-check"></use></svg></button>
        <button class="p-ico${p.remind?' on':''}" data-act="plan.remind" data-pid="${esc(p.id)}" aria-label="리마인드 전환"><svg class="icn"><use href="#i-bell"></use></svg></button>
      </div>
    </div>`;}).join('')
  ;
  const rec=$('#peRec');
  if(rec)rec.addEventListener('change',()=>{const r=$('#peUntilRow');if(r)r.style.visibility=rec.value?'':'hidden';});
}

/* ───── 업무 작성·수정 모달 ───── */
let MODAL_CB=null;
function openModal(title,bodyHTML,footHTML){
  $('#mt').textContent=title;$('#mbody').innerHTML=bodyHTML;$('#mf').innerHTML=footHTML||'';
  /* 하단 버튼이 없는 모달(사용 안내 등)은 우상단 X 로 닫는다 — 참조 앱과 동일 */
  $('#mb').classList.toggle('has-x',!footHTML);
  $('#mo').classList.add('open');
}
function closeModal(){$('#mo').classList.remove('open');MODAL_CB=null;pfDrop();}
/* 인라인 편집기 — 모달 대신 우측 일자 패널 안에서 작성·수정한다 */
function openPlanEdit(p,startD,endD,occ){
  S.planEdit={orig:p?{...p}:null,occ:occ||'',start:startD||S.selDate,end:endD||''};
  rDay();
  setTimeout(()=>{const t=$('#peTitle');if(t)t.focus();},30);
}
function colOutside(e){
  const pop=$('#colPop');
  if(!pop){document.removeEventListener('click',colOutside,true);return;}
  if(pop.contains(e.target)||e.target.closest('#peColBtn'))return;
  closeColPop();
}
function closeColPop(){
  const pop=$('#colPop');if(pop)pop.remove();
  document.removeEventListener('click',colOutside,true);
}
function closePlanEdit(){if(!S.planEdit)return;closeColPop();S.planEdit=null;rDay();}
function planFormHTML(){
  const pe=S.planEdit;if(!pe)return'';
  const d=pe.orig||{id:uid(),date:pe.start,end:pe.end,title:'',time:'',body:'',color:'auto',
    remind:false,done:false,recur:{f:'',until:''},createdAt:Date.now()};
  pe.draft=d;
  const rc=(d.recur&&d.recur.f)||'';
  const people=roster();
  const hasEnd=!!(d.end&&d.end!==d.date);
  return `<div class="dp-edit" id="dpEdit">
    <div class="pe-bar">
      <input class="pe-ttl" id="peTitle" maxlength="80" placeholder="무엇을 하나요?" value="${esc(d.title)}">
      <button class="pe-x" data-act="plan.cancel" aria-label="닫기 (Esc)" title="닫기 (Esc)"><svg class="icn"><use href="#i-close"></use></svg></button>
    </div>
    <div class="pe-body">
      <div class="frow"><label>기간</label>
        <div class="pe-range${hasEnd?' on':''}" id="peRange">
          <input type="date" class="inp inp-sm" id="peDate" value="${esc(d.date)}">
          <button class="pe-rx" data-act="plan.range" aria-label="여러 날">${hasEnd?'→':'＋ 여러 날'}</button>
          <input type="date" class="inp inp-sm pe-end" id="peEnd" value="${esc(d.end||'')}">
        </div>
      </div>
      <div class="frow2">
        <div class="frow"><label>시간</label><input type="time" class="inp inp-sm" id="peTime" value="${esc(d.time||'')}"></div>
        <div class="frow"><label>담당자</label>${ownSelHTML('peOwners',planOwners(d)[0]||'',people)}</div>
      </div>
      <div class="frow2">
        <div class="frow" style="flex:1"><label>현장</label>${sitePickHTML('peSite',d.site||'')}</div>
        <div class="frow pe-colw"><label>색</label>
          <button class="pe-col" id="peColBtn" data-act="plan.color" aria-label="색 고르기" title="색 고르기">
            <span class="pe-col-d" id="peColDot" style="${colDotStyle(d.color)}"></span>
          </button>
        </div>
      </div>
      <button class="pe-more" data-act="plan.more" id="peMoreBtn">자세히 <span style="font-weight:500">(반복 · 메모 · 리마인드)</span> ▾</button>
      <div class="pe-adv" id="peAdv">
        <div class="frow2">
          <div class="frow"><label>반복</label><select class="inp inp-sm" id="peRec">${Object.keys(REC_LBL).map(k=>'<option value="'+k+'"'+(k===rc?' selected':'')+'>'+REC_LBL[k]+'</option>').join('')}</select></div>
          <div class="frow" id="peUntilRow" style="${rc?'':'visibility:hidden'}"><label>반복 종료</label><input type="date" class="inp inp-sm" id="peUntil" value="${esc((d.recur&&d.recur.until)||'')}"></div>
        </div>
        <div class="frow"><label>내용</label><textarea class="inp inp-sm" id="peBody" maxlength="500" placeholder="메모·세부 내용">${esc(d.body||'')}</textarea></div>
        <label class="chk-row"><input type="checkbox" id="peRemind"${d.remind?' checked':''}> 당일 아침 리마인드 메일</label>
        ${pe.orig&&pe.orig.sid?'<button class="btn bo bxs pe-full" data-act="plan.toTask" data-sid="'+esc(pe.orig.sid)+'" data-iid="'+esc(d.id)+'">주요업무에서 자세히 쓰기 →</button>':''}
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
    <div class="dp-edit-f">
      ${pe.orig?'<button class="btn btn-danger bsm" data-act="plan.del" data-pid="'+esc(d.id)+'" data-ym="'+esc(ymOf(d.date))+'" data-occ="'+esc(pe.occ||'')+'" style="margin-right:auto">삭제</button>':''}
      <button class="btn bg2 bsm" data-act="plan.cancel">취소</button>
      <button class="btn bp bsm" data-act="plan.save">저장</button>
    </div>
  </div>`;
}
function savePlanInline(){
  const pe=S.planEdit;if(!pe)return;
  const title=($('#peTitle').value||'').trim();
  if(!title){toast('제목을 입력하세요');$('#peTitle').focus();return;}
  const date=$('#peDate').value||S.selDate;
  const rangeOn=$('#peRange')&&$('#peRange').classList.contains('on');
  let end=rangeOn?(($('#peEnd').value||'').trim()):'';
  if(end&&end<date){toast('종료일이 시작일보다 빠릅니다');return;}
  if(end===date)end='';
  const f=($('#peRec')&&$('#peRec').value)||'';
  const p={...pe.draft,
    date,end,title,
    time:$('#peTime').value||'',
    site:($('#peSite')&&$('#peSite').value)||'',
    owners:(()=>{const v=($('#peOwners')&&$('#peOwners').value)||'';return v?{[v]:1}:{};})(),owner:'',
    body:(($('#peBody')&&$('#peBody').value)||'').trim(),
    color:(pe.draft&&pe.draft.color)||'auto',
    recur:f?{f,until:(($('#peUntil')&&$('#peUntil').value)||'')}:{f:'',until:''},
    remind:!!($('#peRemind')&&$('#peRemind').checked),
    by:S.user?(S.user.email||'').split('@')[0]:(pe.draft.by||''),
    updatedAt:Date.now()};
  const wasRec=!!(pe.orig&&pe.orig.recur&&pe.orig.recur.f);
  const nowRec=!!f;
  if(pe.orig&&wasRec!==nowRec){
    store.delPlan(ymOf(pe.orig.date),pe.orig.id);
    store.putPlan(p);
  }else{
    const oldYm=pe.orig?ymOf(pe.orig.date):null;
    if(!nowRec&&oldYm&&oldYm!==ymOf(p.date))store.movePlan(p,oldYm);
    else store.putPlan(p);
  }
  const wasNew=!pe.orig;
  S.planEdit=null;
  selDate(p.date);
  if(!S.live){refetchCal();rDay();}
  toast(wasNew?'업무를 추가했습니다':'업무를 수정했습니다');
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
function stOf(v){const n=Number(v);return (n===1||n===2||n===3)?n:0;}
function tkSel(){
  const teams=(S.org.teams||[]).filter(t=>t.name),regions=(S.org.regions||[]).filter(r=>r.name),all=roster();
  const team=teams.find(x=>x.id===S.tk.t)||teams[0]||null;S.tk.t=team?team.id:null;
  /* 로컬 모드의 가상 담당자는 선택한 팀에 속한 것으로 본다 */
  const mems=team?all.filter(p=>p.team===team.id||p.local):[];
  /* 선택값: teamall(팀 전체) · team(공통 업무) · reg:<권역id>(권역) · 담당자 id */
  const m=S.tk.m;
  const regOk=rid=>rid===''?mems.some(p=>!p.region||!regions.some(r=>r.id===p.region)):regions.some(r=>r.id===rid);
  const valid=m==='teamall'||m==='team'
    ||(typeof m==='string'&&m.indexOf('reg:')===0&&regOk(m.slice(4)))
    ||mems.some(p=>p.id===m);
  if(!valid)S.tk.m='teamall';
  return{teams,team,regions,mems,total:all.length};
}
/* 좌측 카운트는 '아직 끝나지 않은 업무' 수 — 완료는 세지 않는다 */
function taskCount(sid){
  const m=S.tasks[sid]||{};
  const f=S.tkF||{};
  const keepDone=String(f.st)==='2';
  return Object.keys(m).filter(k=>(keepDone||stOf(m[k].st)!==2)&&tkMatch(sid,k,m[k])).length;
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
function taskItemHTML(sid,iid,it,withSubject,hideOwn){
  const key=sid+'/'+iid;
  if(S.tkEdit===key)return taskFormHTML(sid,iid,it);   /* 수정 중이면 항목 자리에 폼이 들어간다 */
  const di=dueInfo(it.date),cn=Object.keys(it.comments||{}).length,st=stOf(it.st);
  /* 담당자별 묶음 안에서는 소제목이 곧 그 사람 — 본인 배지는 겹말이라 뺀다(공동 담당자만 남긴다) */
  const asg=Object.keys(it.assignees||{}).filter(id=>id!==hideOwn)
    .map(id=>roster().find(p=>p.id===id)).filter(Boolean);
  const lnk=Object.entries(it.links||{});
  const sn=siteName(it.site);
  const open=S.tkOpen===key;
  const col=(it.color&&it.color!=='auto')?it.color:'';
  return `
  <div class="tk-item s${st}${open?' open':''}" draggable="true" data-sid="${esc(sid)}" data-iid="${esc(iid)}">
    ${col?'<span class="tkc" style="background:'+esc(col)+'"></span>':''}
    <div class="tk-line">
      <span class="tk-grip" aria-hidden="true">⠿</span>
      <div class="tk-body" data-act="tk.open" data-sid="${esc(sid)}" data-iid="${esc(iid)}">
        <div class="tk-row1">
          <span class="tk-ttl">${esc(it.text||'제목 없음')}</span>
          <span class="due-chip ${di.cls}" data-act="tk.due" data-sid="${esc(sid)}" data-iid="${esc(iid)}" title="날짜">${esc(di.txt)}</span>
          ${fmtSpan(it)?'<span class="tk-time">'+esc(fmtSpan(it))+'</span>':''}
        </div>
        <div class="tk-meta">
          <span class="tk-st s${st}" data-act="tk.st" data-sid="${esc(sid)}" data-iid="${esc(iid)}">${ST_LBL[st]}</span>
          ${kindOf(it.kind)?'<span class="kind">'+esc(kindLabel(it.kind))+'</span>':''}
          ${withSubject?'<span class="asg">'+esc(subjName(sid))+'</span>':''}
          ${sn?'<span class="site-on">'+esc(sn)+'</span>':''}
          ${asg.map(p=>'<span class="asg"><span class="dot-c" style="background:'+esc(ownColor(p.id))+'"></span>'+esc(p.name)+'</span>').join('')}
        </div>
      </div>
      <div class="tk-acts">
        ${cn?`<button class="tk-ico on" data-act="tk.open" data-sid="${esc(sid)}" data-iid="${esc(iid)}" aria-label="코멘트">
          <svg class="icn"><use href="#i-cmt"></use></svg><span class="cn">${cn}</span></button>`:''}
        ${open?'<button class="btn bg2 bxs tk-editbtn" data-act="tk.edit" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'">수정</button>':''}
        <button class="tk-del" data-act="tk.del" data-sid="${esc(sid)}" data-iid="${esc(iid)}" aria-label="삭제"><svg class="icn"><use href="#i-close"></use></svg></button>
      </div>
    </div>
    ${open?taskDetailHTML(sid,iid,it):''}
  </div>`;
}
/* 펼친 업무 — 진행경과·처리계획과 코멘트 스레드 (수정 버튼은 위 tk-line 우측 상단) */
function taskDetailHTML(sid,iid,it){
  const cs=Object.entries(it.comments||{}).sort((a,b)=>(a[1].at||0)-(b[1].at||0));
  const box=(lbl,val,field)=>`<div class="tk-sec">
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
        +'<span>'+esc(l.label||l.url.replace(/^https?:\/\//,''))+'</span></a>').join('')}</div>
    </div>`:''}
    <div class="tk-thread">
      ${threadHTML(cs,sid,iid)}
      ${S.cmtNew!==sid+'/'+iid?`<button class="th-open" data-act="tk.cmtOpen" data-sid="${esc(sid)}" data-iid="${esc(iid)}">
        <svg class="icn"><use href="#i-cmt"></use></svg> 진행 상황을 남기세요 · @이름으로 부르기
      </button>`:`
      <div class="th-new">
        <div class="th-av me av-cus" style="--avc:${esc((S.user&&(avOf(S.user.uid).color||ownColor(S.user.uid)))||'var(--b600)')}">
          ${S.user?avInner(avOf(S.user.uid).icon):'나'}</div>
        <div class="th-b">
          <textarea class="th-in" data-sid="${esc(sid)}" data-iid="${esc(iid)}" rows="1" placeholder="진행 상황을 남기세요 · @이름으로 부르기"></textarea>
          <div class="th-f">
            <button class="btn bg2 bxs" data-act="tk.cmtCancel">취소</button>
            <button class="btn bp bxs" data-act="tk.cmtSend" data-sid="${esc(sid)}" data-iid="${esc(iid)}">남기기</button>
          </div>
        </div>
      </div>`}
    </div>
  </div>`;
}
/* 코멘트 한 줄 — 작성자 프로필은 저장된 이름이 아니라 지금의 계정 정보를 따른다 */
function cmtHTML(cid,c,sid,iid,depth){
  const who=roster().find(p=>p.id===c.uid);
  const nm=who?who.name:(c.by||'');
  const av=c.uid?avOf(c.uid):{color:'',icon:''};
  const col=c.uid?(av.color||ownColor(c.uid)):'var(--fill2)';
  return `<div class="th-i${depth?' re':''}" data-cid="${esc(cid)}">
    <div class="th-av av-cus" style="--avc:${esc(col)}">${c.uid?avInner(av.icon):esc(String(nm||'?').slice(0,1))}</div>
    <div class="th-b">
      <div class="th-h"><b>${esc(nm)}</b><span>${esc(relTime(c.at))}</span>
        ${depth?'':'<button class="th-re" data-act="tk.cmtRe" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'" data-cid="'+esc(cid)+'">답글</button>'}
      </div>
      <div class="th-t">${mentionHTML(c.text)}</div>
    </div>
  </div>`;
}
function threadHTML(cs,sid,iid){
  const top=cs.filter(([,c])=>!c.re);
  const kids=cid=>cs.filter(([,c])=>c.re===cid);
  return top.map(([cid,c])=>{
    const rs=kids(cid);
    return cmtHTML(cid,c,sid,iid,0)
      +rs.map(([rid,rc])=>cmtHTML(rid,rc,sid,iid,1)).join('')
      +(S.cmtRe===sid+'/'+iid+'/'+cid?reBoxHTML(sid,iid,cid):'');
  }).join('');
}
function reBoxHTML(sid,iid,cid){
  return `<div class="th-new re">
    <div class="th-av me av-cus" style="--avc:${esc((S.user&&(avOf(S.user.uid).color||ownColor(S.user.uid)))||'var(--b600)')}">
      ${S.user?avInner(avOf(S.user.uid).icon):'나'}</div>
    <div class="th-b">
      <textarea class="th-in" data-sid="${esc(sid)}" data-iid="${esc(iid)}" data-re="${esc(cid)}" rows="1" placeholder="답글 · @이름으로 부르기"></textarea>
      <div class="th-f">
        <button class="btn bg2 bxs" data-act="tk.cmtReCancel">취소</button>
        <button class="btn bp bxs" data-act="tk.cmtSend" data-sid="${esc(sid)}" data-iid="${esc(iid)}" data-re="${esc(cid)}">답글 남기기</button>
      </div>
    </div>
  </div>`;
}
function taskListHTML(sid){
  const items=S.tasks[sid]||{};
  const ord=k=>Number.isFinite(Number(items[k].order))?Number(items[k].order):(items[k].createdAt||0)/1e10;
  const all=Object.keys(items).filter(iid=>tkMatch(sid,iid,items[iid]))
    .sort((a,b)=>ord(a)-ord(b)||(items[a].createdAt||0)-(items[b].createdAt||0));
  if(!all.length)return '<div class="tk-empty">'
    +(tkFilterOn()?'조건에 맞는 업무가 없습니다.':'등록된 업무가 없습니다. 위의 <b>업무 추가</b>를 누르세요.')+'</div>';
  const cut=Date.now()-7*86400000;
  const old=tkFilterOn()?[]:all.filter(iid=>stOf(items[iid].st)===2&&(items[iid].updatedAt||0)<cut);
  const open=S.foldOpen[sid];
  const shown=open?all:all.filter(iid=>!old.includes(iid));
  const hideOwn=isTeamSid(sid)?'':sid;   /* 개인 목록이면 본인 배지는 겹말 */
  return shown.map(iid=>taskItemHTML(sid,iid,items[iid],false,hideOwn)).join('')
    +(old.length?`<div class="tk-fold" data-act="tk.fold" data-sid="${esc(sid)}">${open?'▲ 지난 완료 '+old.length+'건 접기':'▼ 지난 완료 '+old.length+'건 보기'}</div>`:'');
}
/* ── 집계 보기 보조 — 미완료만, 기한순 ── */
function openItems(sid){
  const m=S.tasks[sid]||{};
  /* 완료해도 바로 사라지지 않는다 — 7일이 지난 완료만 목록에서 뺀다(담당자 화면과 같은 규칙).
     단 필터·검색이 켜져 있으면 전부 대상 — 상태 '완료'로 지난 완료도 찾아볼 수 있게 */
  const cut=Date.now()-7*86400000;
  const stale=it=>stOf(it.st)===2&&(it.updatedAt||0)<cut;
  const showAll=tkFilterOn();
  return Object.keys(m).filter(iid=>m[iid]&&(showAll||!stale(m[iid]))&&tkMatch(sid,iid,m[iid]))
    .sort((a,b)=>{const ad=m[a].date||'9999',bd=m[b].date||'9999';
      return ad<bd?-1:ad>bd?1:(m[a].createdAt||0)-(m[b].createdAt||0);})
    .map(iid=>({iid,it:m[iid]}));
}
function regionMembers(mems,regions,rid){
  return rid===''?mems.filter(p=>!p.region||!regions.some(r=>r.id===p.region))
                 :mems.filter(p=>p.region===rid);
}
/* 담당자 묶음 — 담당자별 소제목 아래 그 사람의 미완료 업무 */
function memberGroupHTML(list){
  if(!list.length)return '<div class="tk-empty">배정된 담당자가 없습니다.</div>';
  list=list.slice().sort((a,b)=>{const w=x=>rankOf(x.rank)==='lead'?0:1;
    return w(a)-w(b)||String(a.name).localeCompare(String(b.name),'ko');});
  let any=false;
  const html=list.map(p=>{
    const items=openItems(p.id);
    if(!items.length)return '';
    any=true;
    const rk=rankOf(p.rank);
    return '<div class="tk-sub2">'+esc(p.name)
      +(rk==='lead'?'<span class="rk">공구장</span>':'')+'</div>'
      +items.map(({iid,it})=>taskItemHTML(p.id,iid,it,false,p.id)).join('');
  }).join('');
  return any?html:'<div class="tk-empty">미완료 업무가 없습니다.</div>';
}
/* 권역별 섹션 — 팀 전체 보기에서 권역 단위로 레이아웃을 나눈다 */
function regionSectionsHTML(mems,regions){
  const groups=[];
  const heads=mems.filter(p=>rankOf(p.rank)==='head');
  const rest=mems.filter(p=>rankOf(p.rank)!=='head');
  const byRank=list=>list.slice().sort((a,b)=>{
    const w=x=>rankOf(x.rank)==='lead'?0:1;
    return w(a)-w(b)||String(a.name).localeCompare(String(b.name),'ko');});
  if(heads.length)groups.push(['팀장',byRank(heads)]);   /* 권역보다 위 */
  regions.forEach(r=>{const list=rest.filter(p=>p.region===r.id);if(list.length)groups.push([r.name,byRank(list)]);});
  const none=regionMembers(rest,regions,'');
  if(none.length)groups.push(['권역 미지정',byRank(none)]);
  if(!groups.length)return '<div class="tk-empty">배정된 담당자가 없습니다.</div>';
  return groups.map(([rn,list])=>{
    const cnt=list.reduce((a,p)=>a+taskCount(p.id),0);
    const inner=list.map(p=>{
      const items=openItems(p.id);
      if(!items.length)return '';
      const rk=rankOf(p.rank);
      return '<div class="tk-sub2">'+esc(p.name)
        +(rk==='lead'?'<span class="rk">공구장</span>':rk==='head'?'<span class="rk">팀장</span>':'')+'</div>'
        +items.map(({iid,it})=>taskItemHTML(p.id,iid,it,false,p.id)).join('');
    }).join('')||'<div class="tk-empty" style="padding:8px 2px;text-align:left">미완료 업무가 없습니다.</div>';
    return '<div class="tk-sub">'+esc(rn)+'<span class="c">'+cnt+'</span></div>'+inner;
  }).join('');
}
/* 작성·수정 공용 폼 — 작성창과 수정 폼이 같은 골격을 쓴다(일관성) */
function taskFormHTML(sid,iid,cur){
  const d=cur||{text:'',prog:'',plan:'',site:'',assignees:{},links:{},color:'',date:'',time:'',kind:''};
  const people=tkSel().mems;
  const col=(d.color&&d.color!=='auto')?d.color:'';
  const kind=kindOf(d.kind),split=kindSplit(kind);
  return `<div class="tk-new" id="tkNew">
    <div class="tkf-top">
      <input class="inp tk-new-t" id="tnTitle" maxlength="120" placeholder="업무 제목을 입력하세요" value="${esc(d.text||'')}">
      ${iid?`<div class="tkf-now">
        <span class="tk-st s${stOf(d.st)}" data-act="tk.st" data-sid="${esc(sid)}" data-iid="${esc(iid)}">${ST_LBL[stOf(d.st)]}</span>
        ${d.date?'<span class="due-chip '+dueInfo(d.date).cls+'">'+esc(dueInfo(d.date).txt)+'</span>':''}
        ${siteName(d.site)?'<span class="site-on">'+esc(siteName(d.site))+'</span>':''}
        ${Object.keys(d.assignees||{}).map(id=>'<span class="asg"><span class="dot-c" style="background:'+esc(ownColor(id))+'"></span>'+esc(ownName(id))+'</span>').join('')}
      </div>`:''}
    </div>

    <div class="tkf-sec">
      <div class="tkf-h">분류</div>
      <div class="tkf-g4">
        <div class="tkf-f"><label for="tnKind">업무 구분</label>
          <select class="inp inp-sm" id="tnKind" data-act="tk.kind">
            ${TK_KIND.map(([v,l])=>'<option value="'+v+'"'+(v===kind?' selected':'')+'>'+l+'</option>').join('')}
          </select></div>
        <div class="tkf-f"><label for="tnSite">현장</label>${sitePickHTML('tnSite',d.site||'')}</div>
        <div class="tkf-f tkf-f2"><label>색</label>
          ${palHTML('tnPal',col,'<div class="pal-c'+(col?'':' sel')+'" data-c="" style="background:var(--fill2)" title="색 없음"></div>')}</div>
      </div>
    </div>

    <div class="tkf-sec" id="tnBodySec">
      ${split?`<div class="tk-new-g">
        <div class="tk-sec"><div class="tk-sec-h">진행경과</div>
          <textarea class="inp tk-new-a" id="tnProg" maxlength="2000" placeholder="지금까지의 경과">${esc(d.prog||d.body||'')}</textarea></div>
        <div class="tk-sec"><div class="tk-sec-h">처리계획</div>
          <textarea class="inp tk-new-a" id="tnPlan" maxlength="2000" placeholder="앞으로의 계획">${esc(d.plan||'')}</textarea></div>
      </div>`:`<div class="tk-sec"><div class="tk-sec-h">내용</div>
        <textarea class="inp tk-new-a" id="tnProg" maxlength="2000" placeholder="${esc(kindLabel(kind))} 내용을 적으세요">${esc(d.prog||d.body||'')}</textarea></div>`}
    </div>

    <div class="tkf-sec">
      <div class="tkf-h">일정 <span class="c">비워 두면 달력에 뜨지 않습니다</span></div>
      <div class="tkf-g3 tkf-g2">
        <div class="tkf-f"><label for="tnDate">날짜</label>
          <input type="date" class="inp inp-sm" id="tnDate" value="${esc(d.date||'')}"></div>
        <div class="tkf-f"><label for="tnTime">시간 (선택)</label>
          <input type="time" class="inp inp-sm" id="tnTime" value="${esc(d.time||'')}"></div>
      </div>
    </div>

    <div class="tkf-sec">
      <div class="tkf-h">담당자</div>
      ${ownSelHTML('tnAsg',Object.keys(d.assignees||{}).find(k=>(d.assignees||{})[k])||'',people)}
    </div>

    <div class="tkf-sec">
      <div class="tkf-h">링크 <span class="c">선택</span></div>
      <div id="tnLinks">${Object.entries(d.links||{}).map(([k,l])=>linkRowHTML(k,l)).join('')}</div>
      <button class="btn bo bxs" data-act="tk.linkAdd" style="align-self:flex-start;margin-top:6px"><svg class="icn"><use href="#i-plus"></use></svg> 링크 추가</button>
    </div>

    <div class="tkf-foot">
      ${iid?'<button class="btn btn-danger bsm" data-act="tk.del" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'">삭제</button>':''}
      <div class="tk-new-btns">
        <button class="btn bg2 bsm" data-act="tk.formCancel">취소</button>
        <button class="btn bp bsm" data-act="tk.formSave" data-sid="${esc(sid)}" data-iid="${esc(iid||'')}">${iid?'저장':'등록'}</button>
      </div>
    </div>
  </div>`;
}
/* 업무 구분을 바꾸면 본문 칸 구성이 달라진다 — 그 부분만 다시 그려 다른 입력을 지키지 않게 한다 */
function tkKindRefresh(){
  const sec=$('#tnBodySec');if(!sec)return;
  const kind=kindOf(($('#tnKind')&&$('#tnKind').value)||'');
  const prog=($('#tnProg')&&$('#tnProg').value)||'';
  const plan=($('#tnPlan')&&$('#tnPlan').value)||'';
  sec.innerHTML=kindSplit(kind)
    ? `<div class="tk-new-g">
        <div class="tk-sec"><div class="tk-sec-h">진행경과</div>
          <textarea class="inp tk-new-a" id="tnProg" maxlength="2000" placeholder="지금까지의 경과">${esc(prog)}</textarea></div>
        <div class="tk-sec"><div class="tk-sec-h">처리계획</div>
          <textarea class="inp tk-new-a" id="tnPlan" maxlength="2000" placeholder="앞으로의 계획">${esc(plan)}</textarea></div>
      </div>`
    : `<div class="tk-sec"><div class="tk-sec-h">내용</div>
        <textarea class="inp tk-new-a" id="tnProg" maxlength="2000" placeholder="${esc(kindLabel(kind))} 내용을 적으세요">${esc(prog)}</textarea></div>`;
}
function taskFormSave(sid,iid){
  const t=($('#tnTitle').value||'').trim();
  if(!t){toast('제목을 입력하세요');$('#tnTitle').focus();return;}
  const cur=iid?((S.tasks[sid]||{})[iid]||null):null;
  const id=iid||uid();
  const v=($('#tnAsg')&&$('#tnAsg').value)||'';const asg=v?{[v]:1}:{};
  const links={};
  $$('#tnLinks .lnk-row').forEach(r=>{
    const u=(r.querySelector('.lnk-url').value||'').trim();
    if(!u)return;
    links[r.dataset.lid]={url:/^https?:\/\//i.test(u)?u:'https://'+u,label:(r.querySelector('.lnk-lbl').value||'').trim()};
  });
  const cSel=$('#tnPal .pal-c.sel');
  store.putTask(sid,id,{...(cur||{st:0,createdAt:Date.now()}),
    text:t,kind:kindOf(($('#tnKind')&&$('#tnKind').value)||''),
    prog:(($('#tnProg')&&$('#tnProg').value)||'').trim(),
    plan:(($('#tnPlan')&&$('#tnPlan').value)||'').trim(),
    site:$('#tnSite').value||'',
    date:($('#tnDate')&&$('#tnDate').value)||'',
    time:($('#tnTime')&&$('#tnTime').value)||'',
    assignees:asg,links,color:cSel?(cSel.dataset.c||''):'',
    order:(cur&&Number.isFinite(Number(cur.order)))?Number(cur.order):nextOrder(sid),
    updatedAt:Date.now()});
  S.tkNew=null;S.tkEdit=null;S.tkOpen=sid+'/'+id;
  if(!S.live){rTasks();rDay();rWidget();}else setTimeout(rTasks,220);
  refetchCal();
}

/* ── 목록 보조 ── */
function nextOrder(sid){
  const m=S.tasks[sid]||{};
  const vals=Object.values(m).map(x=>Number(x.order)).filter(Number.isFinite);
  return (vals.length?Math.max(...vals):0)+1;
}
function linkRowHTML(id,l){
  return `<div class="lnk-row" data-lid="${esc(id)}">
    <input class="inp inp-sm lnk-lbl" placeholder="이름 (선택)" maxlength="80" value="${esc((l&&l.label)||'')}">
    <input class="inp inp-sm lnk-url" placeholder="https://…" maxlength="500" value="${esc((l&&l.url)||'')}">
    <button class="tm-x tm-del" data-act="tk.linkDel" aria-label="링크 삭제"><svg class="icn"><use href="#i-close"></use></svg></button>
  </div>`;
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
const TK_ST=[['','전체'],['0','예정'],['1','진행'],['2','완료'],['3','보류']];
/* 업무 분류 — 일반만 진행경과·처리계획을 나눠 쓰고, 나머지는 내용 한 칸 */
const TK_KIND=[['','일반'],['gather','공통'],['meet','회의'],['trip','출장'],['etc','기타']];
function kindOf(v){return TK_KIND.some(k=>k[0]===v)?v:'';}
function kindLabel(v){const k=TK_KIND.find(x=>x[0]===kindOf(v));return k?k[1]:'일반';}
function kindSplit(v){return kindOf(v)==='';}   /* 일반이면 두 칸으로 나눈다 */
const TK_DUE=[['','날짜 전체'],['over','지난 날짜'],['soon','7일 내'],['none','날짜 없음']];
function tkFilterHTML(){
  const f=S.tkF||{};
  const on=!!(String(f.q||'').trim()||f.st||f.due);
  return `<div class="tkf-bar${on?' on':''}">
    <div class="tkf-srch">
      <svg class="icn tkf-srch-i" aria-hidden="true"><use href="#i-search"></use></svg>
      <input class="inp inp-sm" id="tkQ" placeholder="업무 · 경과 · 계획 · 현장 · 담당자 검색" value="${esc(f.q||'')}" autocomplete="off">
      ${String(f.q||'').trim()?'<button class="tkf-srch-x" data-act="tkf.qclear" aria-label="지우기"><svg class="icn"><use href="#i-close"></use></svg></button>':''}
    </div>
    <select class="inp inp-sm tkf-sel" id="tkFst" data-act="tkf.set" aria-label="상태">
      ${TK_ST.map(([v,l])=>'<option value="'+v+'"'+(v===(f.st||'')?' selected':'')+'>'+l+'</option>').join('')}
    </select>
    <select class="inp inp-sm tkf-sel" id="tkFdue" data-act="tkf.set" aria-label="기한">
      ${TK_DUE.map(([v,l])=>'<option value="'+v+'"'+(v===(f.due||'')?' selected':'')+'>'+l+'</option>').join('')}
    </select>
    ${on?'<button class="btn bg2 bxs tkf-reset" data-act="tkf.reset">초기화</button>':''}
  </div>`;
}
function tkMatch(sid,iid,it){
  const f=S.tkF||{};
  const q=String(f.q||'').trim().toLowerCase();
  if(q){
    const asg=Object.keys(it.assignees||{}).map(id=>ownName(id)).join(' ');
    const hay=[it.text,it.prog,it.body,it.plan,siteName(it.site),subjName(sid),asg,
      Object.values(it.comments||{}).map(c=>c&&c.text).join(' ')].join(' ').toLowerCase();
    if(hay.indexOf(q)<0)return false;
  }
  if(f.st!==''&&f.st!==undefined&&f.st!==null){
    if(String(stOf(it.st))!==String(f.st))return false;
  }
  if(f.due){
    const d=it.date||'';
    if(f.due==='none'&&d)return false;
    if(f.due==='over'&&(!d||d>=todayStr()))return false;
    if(f.due==='soon'){
      if(!d)return false;
      const n=daysBetween(todayStr(),d);
      if(n<0||n>7)return false;
    }
  }
  return true;
}
function tkFilterOn(){const f=S.tkF||{};return !!(String(f.q||'').trim()||f.st||f.due);}
function rTasks(){
  const root=$('#tkRoot');
  const{teams,team,regions,mems,total}=tkSel();
  if(!teams.length&&!total){
    root.innerHTML='<div class="tk-none">아직 등록된 계정·팀이 없습니다.<br>조직/현장 관리에서 팀·권역을 만들고 계정에 배정하세요.<br><button class="btn bp bsm" data-act="nav.go" data-view="org">조직/현장 관리로 이동</button></div>';
    return;
  }
  const sel=S.tk.m;
  const tn=team?team.name:'팀';
  /* 좌측 카운트 */
  const cCommon=team?taskCount(team.id):0;
  const cMems=mems.reduce((a,p)=>a+taskCount(p.id),0);
  /* 대상별 제목 · 작성 대상(sid) · 목록 */
  let subject='',sid=null,listHTML='';
  if(sel==='teamall'){
    subject=tn+' 전체 업무';
    const ci=team?openItems(team.id):[];
    listHTML='<div class="tk-sub">공통 업무<span class="c">'+cCommon+'</span></div>'
      +(ci.length?ci.map(({iid,it})=>taskItemHTML(team.id,iid,it,false)).join('')
        :'<div class="tk-empty" style="padding:8px 2px;text-align:left">공통 업무가 없습니다.</div>')
      +regionSectionsHTML(mems,regions);
  }else if(sel==='team'){
    subject=tn+' 공통 업무';sid=team?team.id:null;
    listHTML=sid?taskListHTML(sid):'<div class="tk-empty">조직/현장 관리에서 팀을 먼저 등록하세요.</div>';
  }else if(typeof sel==='string'&&sel.indexOf('reg:')===0){
    const rid=sel.slice(4);
    subject=(rid===''?'권역 미지정':(((regions.find(r=>r.id===rid)||{}).name)||'권역'))+' 업무';
    listHTML=memberGroupHTML(regionMembers(mems,regions,rid));
  }else{
    const p=mems.find(x=>x.id===sel);
    subject=p?p.name:'담당자';sid=sel;
    listHTML=taskListHTML(sid);
  }
  /* 담당자 카드 — 권역 행(선택 가능) 아래에 담당자 */
  const heads=mems.filter(p=>rankOf(p.rank)==='head');          /* 팀장 — 권역에 매이지 않는다 */
  const rest=mems.filter(p=>rankOf(p.rank)!=='head');
  const byRank=list=>list.slice().sort((a,b)=>{           /* 공구장을 권역 맨 위로 */
    const w=x=>rankOf(x.rank)==='lead'?0:1;
    return w(a)-w(b)||String(a.name).localeCompare(String(b.name),'ko');});
  const regGroups=[];
  regions.forEach(r=>{const list=rest.filter(p=>p.region===r.id);if(list.length)regGroups.push([r.id,r.name,byRank(list)]);});
  const none=regionMembers(rest,regions,'');
  if(none.length)regGroups.push(['','권역 미지정',byRank(none)]);

  root.innerHTML=`<div class="tkwrap">
    <div class="tkside">
      <div class="card tks-card">
        <div class="tks-h">팀</div>
        <div class="tks-item tks-reg${sel==='teamall'?' act':''}" data-act="tk.pick" data-id="teamall">
          <span class="n">${esc(tn)}</span>
          <span class="c">${cCommon+cMems}</span>
        </div>
        <div class="tks-item sub${sel==='team'?' act':''}" data-act="tk.pick" data-id="team"><span class="std"></span>
          <span class="n">공통 업무</span>
          ${team?'<span class="c">'+cCommon+'</span>':''}
        </div>
        ${heads.map(p=>`<div class="tks-item sub${sel===p.id?' act':''}" data-act="tk.pick" data-id="${esc(p.id)}"><span class="std"></span>
          <span class="n">${esc(p.name)}<span class="rk">팀장</span></span>
          <span class="c">${taskCount(p.id)}</span></div>`).join('')}
      </div>
      <div class="card tks-card">
        <div class="tks-h">권역 · 담당자</div>
        ${regGroups.map(([rid,rn,list])=>`
          <div class="tks-item tks-reg${sel==='reg:'+rid?' act':''}" data-act="tk.pick" data-id="reg:${esc(rid)}">
            <span class="n">${esc(rn)}</span><span class="c">${list.reduce((a,p)=>a+taskCount(p.id),0)}</span></div>
          ${list.map(p=>`<div class="tks-item sub${sel===p.id?' act':''}" data-act="tk.pick" data-id="${esc(p.id)}"><span class="std"></span>
            <span class="n">${esc(p.name)}${rankOf(p.rank)==='lead'?'<span class="rk">공구장</span>':''}</span>
            <span class="c">${taskCount(p.id)}</span></div>`).join('')}
        `).join('')||'<div class="tk-empty" style="text-align:left;padding:6px 2px">배정된 담당자가 없습니다.</div>'}
      </div>
    </div>
    <div class="card tkmain">
      <div class="tkm-h"><div class="bar"></div><b>업무 목록</b><span class="tkm-sub">${esc(subject)}</span>
        ${sid?'<button class="btn bo bsm" data-act="tk.newOpen" data-sid="'+esc(sid)+'"><svg class="icn"><use href="#i-plus"></use></svg> 업무 추가</button>':''}
      </div>
      ${tkFilterHTML()}
      ${sid&&S.tkNew===sid?taskFormHTML(sid,null,null):''}
      <div class="tk-list">${listHTML}</div>
    </div>
  </div>`;
  wireTaskDnD();
  if((sid&&S.tkNew===sid)||S.tkEdit){const t=$('#tnTitle');if(t&&document.activeElement!==t)t.focus();}
}
/* 업무로 이동 — 검색·내 업무·멘션·달력에서 공통으로 쓰고, 모달 없이 인라인으로 펼친다 */
function gotoTask(sid,iid){
  nqOpen(false);closeModal();
  const isTeam=(S.org.teams||[]).some(t=>t.id===sid);
  if(isTeam){S.tk.t=sid;S.tk.m='team';}
  else{const p=roster().find(x=>x.id===sid);if(p&&p.team)S.tk.t=p.team;S.tk.m=sid;}
  S.tkNew=null;S.tkEdit=null;S.tkOpen=sid+'/'+iid;
  go('tasks');rTasks();
  setTimeout(()=>{const el=document.querySelector('.tk-item[data-iid="'+iid+'"]');
    if(el)el.scrollIntoView({block:'center',behavior:'smooth'});},80);
}

/* ═══════════ 찾기 — 업무·일정·코멘트를 한 번에 ═══════════ */
function nqOpen(on){
  const p=$('#nqPanel'),f=$('#nqFab');if(!p||!f)return;
  p.classList.toggle('on',!!on);f.classList.toggle('on',!!on);
  p.setAttribute('aria-hidden',on?'false':'true');
  f.setAttribute('aria-expanded',on?'true':'false');
  if(on)setTimeout(()=>{const q=$('#nqQ');if(q){q.focus();q.select();}},60);
}
function nqMark(text,q){
  const t=String(text||'');
  const i=t.toLowerCase().indexOf(q.toLowerCase());
  if(i<0)return esc(t.slice(0,80));
  return esc(t.slice(Math.max(0,i-24),i))+'<mark>'+esc(t.substr(i,q.length))+'</mark>'+esc(t.substr(i+q.length,50));
}
function nqSearch(q){
  const out={tasks:[],cmts:[]};
  if(q.length<1)return out;
  const lo=q.toLowerCase(),hit=v=>String(v||'').toLowerCase().includes(lo);
  Object.keys(S.tasks||{}).forEach(sid=>{
    const m=S.tasks[sid]||{};
    Object.keys(m).forEach(iid=>{
      const it=m[iid];if(!it)return;
      if(hit(it.text)||hit(it.body)||hit(it.prog)||hit(it.plan)||hit(siteName(it.site)))out.tasks.push({sid,iid,it});
      Object.values(it.comments||{}).forEach(c=>{if(hit(c.text))out.cmts.push({sid,iid,it,c});});
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
  if(!q){box.innerHTML='<div class="nq-empty">업무 제목·내용, 일정, 코멘트에서 찾습니다.</div>';return;}
  const r=nqSearch(q);
  const total=r.tasks.length+r.cmts.length;
  if(!total){box.innerHTML='<div class="nq-empty">"'+esc(q)+'" 에 해당하는 결과가 없습니다.</div>';return;}
  const item=(icon,tt,sb,attrs)=>`<div class="nq-item" ${attrs}>
    <span class="ic"><svg class="icn"><use href="#${icon}"></use></svg></span>
    <div style="min-width:0"><div class="tt">${tt}</div><div class="sb">${esc(sb)}</div></div></div>`;
  box.innerHTML=
    (r.tasks.length?'<div class="nq-g">업무 '+r.tasks.length+'</div>'+r.tasks.slice(0,20).map(({sid,iid,it})=>
      item('i-tasks',nqMark(it.text,q),
        subjName(sid)+(it.date?' · '+it.date+(it.end&&it.end!==it.date?'~'+it.end:''):''),
        'data-act="nq.task" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'"')).join(''):'')
    +(r.cmts.length?'<div class="nq-g">코멘트 '+r.cmts.length+'</div>'+r.cmts.slice(0,20).map(({sid,iid,it,c})=>
      item('i-cmt',nqMark(c.text,q),(c.by||'')+' · '+(it.text||''),
        'data-act="nq.cmt" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'"')).join(''):'');
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
      if(!mine||stOf(it.st)===2)return;
      out.push({sid,iid,it});
    });
  });
  return out.sort((a,b)=>{
    const ad=a.it.date||'9999',bd=b.it.date||'9999';
    return ad<bd?-1:ad>bd?1:(a.it.createdAt||0)-(b.it.createdAt||0);});
}
function minePlans(days){
  const me=myId(),from=todayStr(),to=addDays(from,days);
  const out=[];
  const push=(p,d)=>{if(planOwners(p).includes(me))out.push({p,date:d});};
  allTasks().forEach(({sid,iid,it})=>{
    if(!it.date)return;
    const p=taskAsPlan(sid,iid,it);
    if(it.recur&&it.recur.f){recurDates(p,from,to).forEach(d=>push(p,d));return;}
    const last=it.end||it.date;
    if(last<from||it.date>to)return;
    push(p,it.date<from?from:it.date);});
  return out.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:((a.p.time||'99')<(b.p.time||'99')?-1:1));
}
function rMine(){
  const root=$('#mineRoot');if(!root)return;
  const me=myId();
  if(!me){root.innerHTML='<div class="tk-none">로그인하면 내 업무를 모아 볼 수 있습니다.</div>';return;}
  const plans=minePlans(7),tasks=mineTasks();
  const mentions=Object.entries(S.mentions||{}).sort((a,b)=>(b[1].at||0)-(a[1].at||0));
  const dlab=d=>{const n=daysBetween(todayStr(),d);
    return n===0?'오늘':n===1?'내일':(toDate(d).getMonth()+1)+'/'+toDate(d).getDate();};
  root.innerHTML='<div class="mine-grid">'
    +`<div class="card">
        <div class="mine-h"><div class="bar"></div><b>이번 주 내 일정</b><span class="c">${plans.length}</span></div>
        ${plans.length?plans.map(({p,date})=>`
          <div class="mine-row" data-act="mine.plan" data-date="${esc(date)}">
            <span class="d">${esc(dlab(date))}</span>
            <span class="t">${fmtSpan(p)?esc(fmtSpan(p))+' · ':''}${esc(p.title)}</span>
          </div>`).join(''):'<div class="mine-empty">앞으로 7일 안에 내 담당 일정이 없습니다.</div>'}
      </div>`
    +`<div class="card">
        <div class="mine-h"><div class="bar"></div><b>내 주요업무</b><span class="c">${tasks.length}</span></div>
        ${tasks.length?tasks.map(({sid,iid,it})=>{
          const di=it.date?dueInfo(it.date):null;
          return `<div class="mine-row ${di?di.cls:''}" data-act="mine.task" data-sid="${esc(sid)}" data-iid="${esc(iid)}">
            <span class="d">${di?esc(di.txt):'—'}</span>
            <span class="t">${esc(it.text||'제목 없음')}</span>
            <span class="tk-st s${stOf(it.st)}" style="cursor:default">${ST_LBL[stOf(it.st)]}</span>
          </div>`;}).join(''):'<div class="mine-empty">내가 담당인 미완료 업무가 없습니다.</div>'}
      </div>`
    +`<div class="card">
        <div class="mine-h"><div class="bar"></div><b>내 멘션</b><span class="c">${mentions.length}</span></div>
        ${mentions.length?mentions.map(([id,m])=>`
          <div class="mine-row" data-act="mention.go" data-id="${esc(id)}" data-sid="${esc(m.sid||'')}" data-iid="${esc(m.iid||'')}">
            <span class="d">${esc(relTime(m.at))}</span>
            <span class="t">${esc(m.by||'')} · ${esc(m.text||'')}</span>
          </div>`).join(''):'<div class="mine-empty">받은 멘션이 없습니다.</div>'}
      </div>`
    +'</div>';
}

/* ═══════════ 설정 — 팀 · 권역 · 계정 배정 ═══════════ */
const ICON_TRASH='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>';
const ICON_RADIO_ON='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.6" fill="currentColor" stroke="none"/></svg>';
const ICON_RADIO_OFF='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/></svg>';
function teamRows(){
  const list=S.org.teams||[];
  if(!list.length)return '<div class="tm-empty">등록된 팀이 없습니다. + 추가를 누르세요.</div>';
  return list.map(t=>{
    const act=t.id===S.tk.t,cnt=roster().filter(p=>p.team===t.id).length;
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
  return list.map(r=>{
    const used=roster().filter(p=>p.region===r.id).length;
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
    <th style="width:11%">권역</th><th style="width:21%">현장명</th>
    <th class="cc" style="width:8%">세대수</th><th class="cc" style="width:7%">동수</th>
    <th class="cc" style="width:8%">상가수</th><th class="cc" style="width:12%">준공일</th>
    <th class="cc mg-disth" style="width:8%">공가세대</th><th class="cc mg-disth" style="width:8%">공가상가</th>
    <th class="cc mg-disth" style="width:10%">업데이트일</th><th class="cc" style="width:5%"></th>
  </tr></thead><tbody>${sites.map(x=>`<tr>
    <td><select class="mg-inp" data-act="org.siteUpd" data-id="${esc(x.id)}" data-f="region" aria-label="권역 선택">${regOpts(x)}</select></td>
    <td><input class="mg-inp" value="${esc(x.name)}" data-act="org.siteUpd" data-id="${esc(x.id)}" data-f="name" aria-label="현장명"></td>
    <td><input class="mg-inp n" type="number" value="${x.units||0}" data-act="org.siteUpd" data-id="${esc(x.id)}" data-f="units" aria-label="세대수" style="text-align:right"></td>
    <td><input class="mg-inp n" type="number" value="${x.buildings||0}" data-act="org.siteUpd" data-id="${esc(x.id)}" data-f="buildings" aria-label="동수" style="text-align:right"></td>
    <td><input class="mg-inp n" type="number" value="${x.commercialUnits||0}" data-act="org.siteUpd" data-id="${esc(x.id)}" data-f="commercialUnits" aria-label="상가수" style="text-align:right"></td>
    <td class="cc"><input class="mg-inp" type="date" max="9999-12-31" style="width:132px;max-width:100%;text-align:center;display:inline-block" value="${esc(x.completionDate||'')}" data-act="org.siteUpd" data-id="${esc(x.id)}" data-f="completionDate" aria-label="준공일"></td>
    <td class="cc mg-dis"><label class="sw"><input type="checkbox" checked disabled aria-label="공가세대 — 하자처리 현황 전용"><span class="sw-t"></span></label></td>
    <td class="cc mg-dis"><label class="sw"><input type="checkbox" disabled aria-label="공가상가 — 하자처리 현황 전용"><span class="sw-t"></span></label></td>
    <td class="cc mg-dis" style="font-size:11.5px;white-space:nowrap">—</td>
    <td class="cc"><button class="tm-x tm-del" data-act="org.delSite" data-id="${esc(x.id)}" aria-label="삭제">${ICON_TRASH}</button></td>
  </tr>`).join('')}</tbody></table></div>`;
}
function moveSite(id,rgn,targetId,after){
  const list=S.org.sites||[];
  const i=list.findIndex(x=>x.id===id);if(i<0)return;
  const [moved]=list.splice(i,1);
  moved.region=rgn||'';
  if(targetId){
    let at=list.findIndex(x=>x.id===targetId);
    if(at<0)at=list.length;else at=after?at+1:at;
    list.splice(at,0,moved);
  }else list.push(moved);
  S.org.sites=list;orgSave();rOrg();
}
function curTeam(){const ts=(S.org.teams||[]).filter(t=>t.name);return ts.find(t=>t.id===S.tk.t)||ts[0]||null;}
function rOrg(){
  const t=curTeam(),lbl=t?'· '+t.name:'';
  ['#regTeamLbl','#siteTeamLbl','#acctTeamLbl'].forEach(id=>{const e=$(id);if(e)e.textContent=lbl;});
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
    const shown=list.slice(0,3).map(x=>'<span class="site-on">'+esc(x.name)+'</span>').join('');
    return '<div class="site-chk">'
      +'<button class="site-pick" data-act="acct.sitePick" data-id="'+esc(p.id)+'" aria-label="담당 현장 선택" title="담당 현장 선택"><svg class="icn"><use href="#i-plus"></use></svg></button>'
      +(list.length?shown+(list.length>3?'<span class="site-more">+'+(list.length-3)+'</span>':''):'<span class="site-none">미지정</span>')
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
      <td>${rankCtl(p)}</td>
      <td>${u.region
        ?'<select class="mg-inp" data-act="acct.set" data-f="region" data-id="'+esc(p.id)+'" aria-label="권역">'+regOpt(p.region)+'</select>'
        :'<span class="rk-all">팀 전체</span>'}</td>
      <td>${u.sites?sitesOf(p):autoSitesHTML(p)}</td>
      <td class="utbl-r">${roleCtl(p)}</td>
    </tr>`;
  };
  ar.innerHTML='<table class="utbl"><thead><tr><th style="width:178px">이름</th><th style="width:106px">직급</th><th style="width:106px">권역</th><th>담당 현장</th><th class="utbl-r" style="width:130px">권한</th></tr></thead><tbody>'
    +(mine.length?mine.map(row).join('')
      :'<tr><td colspan="5" style="font-size:12px;color:var(--lbl3);padding:10px">이 팀에 배정된 계정이 없습니다.</td></tr>')
    +'</tbody></table>';
  /* 팀 미배정 계정 — 섞어 두면 헷갈린다는 지적에 따라 별도 카드로 분리 */
  const fc=$('#freeCard'),fr=$('#freeRoot');
  if(fc&&fr){
    fc.style.display=(free.length&&(S.orgTab||'acct')==='acct')?'':'none';   /* 현장 탭에선 미배정 카드도 접는다 */
    fr.innerHTML=free.length
      ?'<table class="utbl"><thead><tr><th style="width:178px">이름</th><th></th><th class="utbl-r" style="width:124px">권한</th></tr></thead><tbody>'
        +free.map(p=>`<tr>
          <td><div class="utbl-name">${avHTML(p.id)}
            <div style="min-width:0"><div class="utbl-nick">${esc(p.name)}</div><div class="utbl-mail">${esc(p.email||'')}</div></div></div></td>
          <td><button class="btn bo bxs" data-act="acct.join" data-id="${esc(p.id)}">이 팀에 추가</button></td>
          <td class="utbl-r">${roleCtl(p)}</td>
        </tr>`).join('')
        +'</tbody></table>'
      :'';
  }
  rFilter();
}
function orgSave(){normOrg(S.org);store.putOrg(S.org);if(!S.live){rOrg();rTasks();}}
function rCfg(){
  const i=$('#setDefectUrl');
  if(i&&document.activeElement!==i)i.value=S.cfg.defectUrl||DEFECT_URL;
  const m=S.cfg.mail||{};
  const hs=$('#mlHour');
  if(hs&&!hs.options.length){
    let o='';
    for(let h=5;h<=21;h++)o+='<option value="'+h+'">'+(h<12?'오전':'오후')+' '+((h%12)||12)+'시</option>';
    hs.innerHTML=o;
  }
  const set=(id,v,prop)=>{const e=$(id);if(e&&document.activeElement!==e)e[prop||'value']=v;};
  set('#mlHour',String(m.hour===undefined?7:m.hour));
  set('#mlDaily',m.dailyOn!==false,'checked');
  set('#mlWeekly',m.weeklyOn!==false,'checked');
  set('#mlDow',String(m.weeklyDow===undefined?1:m.weeklyDow));
  set('#mlScope',m.scope||'all');
  set('#mlPrefix',m.prefix||'');
  set('#mlIntro',m.intro||'');
}
/* ═══════════ 메일 — 수신자 계산 · 미리보기 ═══════════
   scope='all'   : 전원에게 같은 내용
   scope='owner' : 담당자에게만. 단 팀 공통 업무는 그 팀 소속 전원에게 간다. */
function teamIds(){return (S.org.teams||[]).filter(t=>t.name).map(t=>t.id);}
function isTeamSid(sid){return teamIds().indexOf(sid)>=0;}
function teamMemberIds(tid){return roster().filter(p=>p.team===tid).map(p=>p.id);}
/* 항목 하나의 수신 대상 id 목록 — 팀 공통 업무면 팀원 전체 */
function targetsOf(kind,x){
  if(kind==='task')return isTeamSid(x.sid)?teamMemberIds(x.sid):[x.sid];
  const own=Object.keys((x.p&&x.p.owners)||{});
  return own.length?own:null;   /* 담당자 지정이 없으면 전원 */
}
function mailRecipients(scope,items){
  const all=roster().filter(p=>p.email);
  if(scope!=='owner')return{list:all,note:'수신 범위 · 팀 전체'};
  const ids=new Set();let anyAll=false;
  items.forEach(it=>{
    const t=targetsOf(it.kind,it);
    if(t===null){anyAll=true;return;}
    t.forEach(id=>ids.add(id));
  });
  if(anyAll)return{list:all,note:'수신 범위 · 담당자 지정이 없는 항목이 있어 전체 발송'};
  const list=all.filter(p=>ids.has(p.id));
  return{list,note:'수신 범위 · 담당자에게만 (팀 공통 업무는 팀원 전체)'};
}
/* 메일에 담길 항목 수집 */
function mailItems(kind){
  const today=todayStr(),out=[];
  if(kind==='daily'){
    dayPlans(today,true).forEach(({p,occ})=>{if(p.remind&&!isDone(p,occ))out.push({kind:'plan',p,date:today});});
    return out;
  }
  const mon=addDays(today,-((toDate(today).getDay()+6)%7)),sun=addDays(mon,6);
  for(let d=mon;d<=sun;d=addDays(d,1))
    dayPlans(d,true).forEach(({p,occ})=>{if(!isDone(p,occ))out.push({kind:'plan',p,date:d});});
  Object.keys(S.tasks||{}).forEach(sid=>Object.keys(S.tasks[sid]||{}).forEach(iid=>{
    const it=S.tasks[sid][iid];
    if(it&&it.date&&stOf(it.st)!==2&&it.date<=sun)out.push({kind:'task',sid,iid,it,over:it.date<today});
  }));
  return out;
}
/* 발송 메일과 같은 골격의 HTML — 실제 스크립트(scripts/*.mjs)와 레이아웃을 맞춘다 */
function mailHTML(kind,items,m){
  const today=todayStr(),d=toDate(today);
  const head=(sub,ttl)=>`<div style="background:linear-gradient(135deg,#3E71D2,#2C437C);border-radius:14px 14px 0 0;padding:18px 20px;color:#fff;">
      <div style="font-size:11px;opacity:.8;">H서비스센터 · ${sub}</div>
      <div style="font-size:19px;font-weight:800;margin-top:2px;">${ttl}</div></div>`;
  const intro=m.intro?`<div style="background:#fff;border:1px solid #EEE;border-top:none;padding:12px 14px 0;font-size:12.5px;color:#555;">${esc(m.intro)}</div>`:'';
  let rows='';
  if(kind==='daily'){
    rows=items.map(({p})=>`<tr><td style="padding:9px 12px;border-bottom:1px solid #EEE;">
      <div style="font-size:14px;font-weight:700;color:#1C1C1E;">${fmtSpan(p)?esc(fmtSpan(p))+' · ':''}${esc(p.title)}</div>
      ${p.body?`<div style="font-size:12px;color:#666;margin-top:3px;">${esc(p.body)}</div>`:''}</td></tr>`).join('')
      ||'<tr><td style="padding:14px 12px;font-size:12.5px;color:#999;">리마인드를 켠 업무가 없습니다.</td></tr>';
    return `<div style="max-width:520px;">${head('일정 리마인드',(d.getMonth()+1)+'월 '+d.getDate()+'일 오늘의 업무')}${intro}
      <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #EEE;border-top:none;border-radius:0 0 14px 14px;">${rows}</table></div>`;
  }
  const plans=items.filter(x=>x.kind==='plan'),dues=items.filter(x=>x.kind==='task');
  const sec=(t,inner)=>`<tr><td style="padding:10px 12px 4px;font-size:11px;font-weight:700;color:#8E8E93;letter-spacing:.04em;">${t}</td></tr>${inner}`;
  rows=sec('이번 주 일정',plans.map(({p,date})=>`<tr><td style="padding:8px 12px;border-bottom:1px solid #EEE;">
      <div style="font-size:13.5px;font-weight:700;color:#1C1C1E;">${esc(date.slice(5).replace('-','/'))} · ${fmtSpan(p)?esc(fmtSpan(p))+' · ':''}${esc(p.title)}</div></td></tr>`).join('')
      ||'<tr><td style="padding:10px 12px;font-size:12.5px;color:#999;border-bottom:1px solid #EEE;">등록된 일정이 없습니다.</td></tr>')
    +sec('기한 임박 · 초과 업무',dues.map(({sid,it,over})=>`<tr><td style="padding:8px 12px;border-bottom:1px solid #EEE;">
      <div style="font-size:13.5px;font-weight:700;color:${over?'#DC2626':'#1C1C1E'};">${esc(it.text)} <span style="font-weight:600;font-size:11.5px;color:#8E8E93;">${esc(subjName(sid))} · ${esc(it.date)}${over?' 지남':''}</span></div></td></tr>`).join('')
      ||'<tr><td style="padding:10px 12px;font-size:12.5px;color:#999;">기한이 임박한 업무가 없습니다.</td></tr>');
  return `<div style="max-width:520px;">${head('주간 요약',(d.getMonth()+1)+'월 ' + d.getDate() + '일 주간 업무 요약')}${intro}
    <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #EEE;border-top:none;border-radius:0 0 14px 14px;">${rows}</table></div>`;
}
function mailPreview(kind){
  const m=S.cfg.mail||{};
  const items=mailItems(kind);
  const{list,note}=mailRecipients(m.scope||'all',items);
  const h=m.hour===undefined?7:m.hour;
  const d=toDate(todayStr());
  const subject=(m.prefix||(kind==='daily'?'[일정 리마인드]':'[주간 요약]'))+' '
    +(d.getMonth()+1)+'월 '+d.getDate()+'일 — '+items.length+'건';
  const names=list.map(p=>esc(p.name)).join(', ')||'(수신자 없음)';
  openModal(kind==='daily'?'당일 리마인드 미리보기':'주간 요약 미리보기',
    `<div class="mlp-to"><b>받는 사람 ${list.length}명</b> · ${esc(note)}<br>${names}<br>
       <b>발송 시각</b> ${(h<12?'오전':'오후')+' '+((h%12)||12)}시${kind==='weekly'?' · '+DOW[(m.weeklyDow===undefined?1:m.weeklyDow)]+'요일':''}</div>
     <div class="mlp-sub">제목 · ${esc(subject)}</div>
     <div class="mlp-wrap">${mailHTML(kind,items,m)}</div>`,
    '<button class="btn bg2 bsm" data-act="modal.close">닫기</button>');
}
function saveMailCfg(){
  if(!isEditor())return denyEdit();
  const m={
    dailyOn:$('#mlDaily').checked,
    weeklyOn:$('#mlWeekly').checked,
    weeklyDow:Number($('#mlDow').value),
    hour:Number($('#mlHour').value),
    scope:$('#mlScope').value,
    prefix:($('#mlPrefix').value||'').trim(),
    intro:($('#mlIntro').value||'').trim()
  };
  store.putCfg('mail',m,err=>{
    if(err){toast('메일 설정 저장 실패 · '+((err&&err.message)||err));return;}
    S.cfg={...S.cfg,mail:m};toast('메일 설정을 저장했습니다');
  });
}

/* ═══════════ 화면 전환 · 공통 UI ═══════════ */
const VIEW_TTL={calendar:'업무 일정',mine:'내 업무',tasks:'업무 목록',org:'조직/현장 관리',settings:'설정'};
function go(view){
  S.view=view;
  if(S.dpSheet)dpSheet(false);
  $$('.view').forEach(v=>v.classList.toggle('act',v.id==='view-'+view));
  $$('#sidebar .nvi[data-view]').forEach(n=>n.classList.toggle('act',n.dataset.view===view));
  $('#tbt').textContent=VIEW_TTL[view];
  if(view==='calendar'&&CAL)setTimeout(()=>CAL.updateSize(),30);
  if(view==='tasks')rTasks();
  if(view==='mine')rMine();
  if(view==='org'){
    rOrg();
  }
  if(view==='settings'){
    rCfg();
    const d=$('#darkChk');if(d)d.checked=document.documentElement.classList.contains('dark');
    const b=$('#buildInfo');
    if(b)b.textContent='버전 '+APP_VER+' · 기록된 오류 '+ERRLOG.length+'건';
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
function applyTheme(dark){
  document.documentElement.classList.toggle('dark',dark);
  const c=$('#darkChk');if(c)c.checked=dark;
  const u=$('#thIcon');if(u)u.setAttribute('href',dark?'#i-moon':'#i-sun');
  try{localStorage.setItem('calapp.theme',dark?'dark':'light');}catch(e){}
}

/* ═══════════ 액션 위임 ═══════════ */
const ACT={
  'nav.go':el=>go(el.dataset.view),
  'nav.toggle':()=>$('#sidebar').classList.toggle('mini'),
  'nav.mob':()=>{$('#sidebar').classList.add('mob-open');$('#scrim').classList.add('on');},
  'nav.mobClose':mobClose,
  'day.sheetClose':()=>dpSheet(false),
  'theme.toggle':()=>applyTheme(!document.documentElement.classList.contains('dark')),
  'link.defect':()=>{
    const u=(S.cfg.defectUrl||DEFECT_URL).trim();
    if(!u){toast('설정에서 하자처리 현황 주소를 먼저 입력하세요');go('settings');return;}
    window.open(u,'_blank','noopener');
  },
  /* 달 이동은 보기만 바꾼다 — 선택일(날짜 헤더)은 그대로 둔다 */
  'cal.prev':()=>CAL&&CAL.prev(),
  'cal.next':()=>CAL&&CAL.next(),
  'cal.today':()=>{selDate(todayStr());},
  'plan.new':()=>{
    const pe=S.planEdit;
    if(pe&&!pe.orig){const t=$('#peTitle');if(t){t.focus();t.select();return;}}   /* 이미 새 업무 폼이면 제목으로 */
    openPlanEdit(null);},
  'plan.cancel':closePlanEdit,
  /* 기간 — 평소엔 하루, 누르면 종료일이 같은 줄에 펼쳐진다 */
  'plan.range':()=>{
    const box=$('#peRange');if(!box)return;
    const on=box.classList.toggle('on');
    const btn=box.querySelector('.pe-rx');if(btn)btn.textContent=on?'→':'＋ 여러 날';
    const end=$('#peEnd');
    if(on){if(!end.value)end.value=$('#peDate').value||S.selDate;end.focus();}
    else end.value='';},
  'plan.more':()=>{
    const box=$('#dpEdit');if(!box)return;
    box.classList.toggle('adv-on');},
  /* 색 — 점 하나만 두고, 누르면 그리드 팝오버 */
  'plan.color':()=>{
    const old=$('#colPop');if(old){closeColPop();return;}
    const btn=$('#peColBtn');if(!btn)return;
    const cur=(S.planEdit&&S.planEdit.draft&&S.planEdit.draft.color)||'auto';
    const pop=document.createElement('div');
    pop.id='colPop';pop.className='col-pop';
    pop.innerHTML=palHTML('pePal',(!cur||cur==='auto')?'auto':cur,
      '<div class="pal-c'+((!cur||cur==='auto')?' sel':'')+'" data-c="auto" style="'+colDotStyle('auto')+'" title="담당자 색"></div>');
    btn.parentElement.appendChild(pop);
    setTimeout(()=>document.addEventListener('click',colOutside,true),0);},
  /* 카드 클릭은 '펼쳐 보기' — 수정은 연필 버튼으로 (실수로 값이 바뀌지 않게) */
  'plan.open':el=>{
    const card=el.closest('.plan');if(!card)return;
    const on=card.classList.toggle('open');
    S.planOpen=on?el.dataset.pid:'';},
  'plan.edit':el=>{const p=findPlan(el.dataset.pid);if(p)openPlanEdit(p,null,null,el.dataset.occ||'');},
  'plan.toTask':el=>{closePlanEdit();gotoTask(el.dataset.sid,el.dataset.iid);},
  'plan.done':el=>{const p=findPlan(el.dataset.pid);if(!p)return;
    const occ=occSrc(p,el.dataset.occ||p.date);
    if(p.recur&&p.recur.f){p.doneOn=p.doneOn||{};if(p.doneOn[occ])delete p.doneOn[occ];else p.doneOn[occ]=1;}
    else p.done=!p.done;
    p.updatedAt=Date.now();store.putPlan(p);if(!S.live){rDay();refetchCal();rWidget();}},
  'plan.remind':el=>{const p=findPlan(el.dataset.pid);if(!p)return;p.remind=!p.remind;p.updatedAt=Date.now();store.putPlan(p);if(!S.live)rDay();toast(p.remind?'당일 아침 리마인드 메일이 발송됩니다':'리마인드를 해제했습니다');},
  'plan.save':savePlanInline,
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
      store.delPlan(ym,pid);S.planEdit=null;rDay();
      if(!S.live){refetchCal();rWidget();}toast('업무를 삭제했습니다');
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
  'acct.open':openAcctModal,
  'mention.open':openMentionModal,
  'nq.toggle':()=>{const on=!$('#nqPanel').classList.contains('on');nqOpen(on);if(on)rNq();},
  'nq.close':()=>nqOpen(false),
  'nq.q':()=>{},
  'nq.task':el=>gotoTask(el.dataset.sid,el.dataset.iid),
  'nq.cmt':el=>gotoTask(el.dataset.sid,el.dataset.iid),
  'mine.plan':el=>{go('calendar');selDate(el.dataset.date);},
  'mine.task':el=>gotoTask(el.dataset.sid,el.dataset.iid),
  'mention.clear':()=>{
    const uid2=S.user&&S.user.uid;if(!uid2)return;
    Object.keys(S.mentions||{}).forEach(id=>store.putMention(uid2,id,null));
    S.mentions={};rMention();closeModal();
  },
  'mention.go':el=>{
    const uid2=S.user&&S.user.uid;
    if(uid2)store.putMention(uid2,el.dataset.id,null);
    delete S.mentions[el.dataset.id];rMention();
    closeModal();
    if(el.dataset.sid)gotoTask(el.dataset.sid,el.dataset.iid);
    else go('tasks');
  },

  'pf.org':()=>acctAutoSave(),
  'pf.toggle':()=>{const p=$('#pfPop');if(!p)return;
    const on=!p.classList.contains('open');
    p.classList.toggle('open',on);
    if(on){
      if(!PF_MORE)pfRenderEmg(recentEmoji().length?'recent':'smiley','');
      pfPlace();
    }},
  'pf.close':()=>{const p=$('#pfPop');if(p)p.classList.remove('open');},
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
  'tkf.qclear':()=>{S.tkF={...S.tkF,q:''};rTasks();},
  'tkf.reset':()=>{S.tkF={q:'',st:'',due:''};rTasks();},
  'tk.newOpen':el=>{S.tkEdit=null;S.tkNew=el.dataset.sid;rTasks();},
  'tk.formCancel':()=>{S.tkNew=null;S.tkEdit=null;rTasks();},
  'tk.kind':()=>tkKindRefresh(),
  'tk.formSave':el=>taskFormSave(el.dataset.sid,el.dataset.iid||null),
  'tk.open':el=>{
    const key=el.dataset.sid+'/'+el.dataset.iid;
    S.tkOpen=S.tkOpen===key?null:key;rTasks();
  },
  'tk.field':()=>{},
  'tk.linkAdd':()=>{const box=$('#tnLinks');if(box)box.insertAdjacentHTML('beforeend',linkRowHTML(uid(),null));},
  'tk.linkDel':el=>{const r=el.closest('.lnk-row');if(r)r.remove();},
  'tk.edit':el=>{S.tkNew=null;S.tkEdit=el.dataset.sid+'/'+el.dataset.iid;rTasks();
    setTimeout(()=>{const t=$('#tnTitle');if(t)t.focus();},30);},
  'tk.pick':el=>{S.tk.m=el.dataset.id;rTasks();},
  'tk.st':el=>{
    const sid=el.dataset.sid,iid=el.dataset.iid;
    const cur=(S.tasks[sid]||{})[iid];if(!cur)return;
    store.putTask(sid,iid,{...cur,st:(stOf(cur.st)+1)%4,updatedAt:Date.now()});
    if(!S.live){rTasks();rDay();rWidget();}
    refetchCal();   /* 완료 처리하면 달력의 기한 표시도 즉시 사라져야 한다 */
  },
  'tk.del':el=>{
    const sid=el.dataset.sid,iid=el.dataset.iid,key=sid+'/'+iid;
    const it=(S.tasks[sid]||{})[iid]||{};
    const cn=Object.keys(it.comments||{}).length;
    confirmModal('업무 삭제',
      '"'+(it.text||'제목 없음')+'" 업무를 삭제합니다.'+(cn?' 코멘트 '+cn+'건도 함께 지워집니다.':'')+' 되돌릴 수 없습니다.',
      ()=>{
        store.putTask(sid,iid,null);
        if(S.tkEdit===key)S.tkEdit=null;
        if(S.tkOpen===key)S.tkOpen=null;
        if(!S.live)rTasks();else setTimeout(rTasks,220);
        refetchCal();toast('업무를 삭제했습니다');
      });},
  'tk.fold':el=>{const sid=el.dataset.sid;S.foldOpen[sid]=!S.foldOpen[sid];rTasks();},
  'tk.due':el=>{
    const sid=el.dataset.sid,iid=el.dataset.iid,cur=(S.tasks[sid]||{})[iid];if(!cur)return;
    openModal('날짜 설정',`<div class="frow"><label>날짜</label><input type="date" class="inp" id="dueVal" value="${esc(cur.date||'')}"></div>`,
      (cur.date?'<button class="btn bg2 bsm" data-act="tk.dueClear" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'" style="margin-right:auto">날짜 지우기</button>':'')
      +'<button class="btn bg2 bsm" data-act="modal.close">취소</button><button class="btn bp bsm" data-act="modal.ok">저장</button>');
    MODAL_CB={type:'due',ok:()=>{
      const v=$('#dueVal').value||'';
      store.putTask(sid,iid,{...cur,date:v,updatedAt:Date.now()});
      closeModal();if(!S.live){rTasks();rDay();}refetchCal();}};
  },
  'tk.dueClear':el=>{const sid=el.dataset.sid,iid=el.dataset.iid,cur=(S.tasks[sid]||{})[iid];if(!cur)return;
    store.putTask(sid,iid,{...cur,date:'',updatedAt:Date.now()});closeModal();if(!S.live){rTasks();rDay();}refetchCal();},
  'tk.cmtOpen':el=>{S.cmtNew=el.dataset.sid+'/'+el.dataset.iid;rTasks();
    setTimeout(()=>{const t=document.querySelector('.th-new:not(.re) .th-in');if(t)t.focus();},40);},
  'tk.cmtCancel':()=>{S.cmtNew='';rTasks();},
  'tk.cmtRe':el=>{S.cmtRe=el.dataset.sid+'/'+el.dataset.iid+'/'+el.dataset.cid;rTasks();
    setTimeout(()=>{const t=document.querySelector('.th-new.re .th-in');if(t)t.focus();},40);},
  'tk.cmtReCancel':()=>{S.cmtRe='';rTasks();},
  'tk.cmtSend':el=>{
    const sid=el.dataset.sid,iid=el.dataset.iid,cur=(S.tasks[sid]||{})[iid];if(!cur)return;
    const re=el.dataset.re||'';
    const box=document.querySelector('.th-in[data-sid="'+sid+'"][data-iid="'+iid+'"]'+(re?'[data-re="'+re+'"]':':not([data-re])'))||$('#cmtIn');
    const t=((box&&box.value)||'').trim();if(!t){if(box)box.focus();return;}
    const cid=uid(),who=(S.user&&acctNick())||'나';
    const rec={by:who,text:t,at:Date.now()};
    if(S.user&&S.user.uid)rec.uid=S.user.uid;
    if(re)rec.re=re;
    store.putTask(sid,iid,{...cur,comments:{...(cur.comments||{}),[cid]:rec},updatedAt:cur.updatedAt||Date.now()});
    S.cmtRe='';S.cmtNew='';
    /* @이름 을 찾아 그 사람에게 알림을 남긴다 */
    if(S.live){
      const hit=new Set();
      roster().forEach(p=>{if(p.id!==(S.user&&S.user.uid)&&t.includes('@'+p.name))hit.add(p.id);});
      hit.forEach(pid=>store.putMention(pid,uid(),{by:who,text:t.slice(0,300),sid,iid,at:Date.now()}));
      if(hit.size)toast(hit.size+'명에게 멘션 알림을 보냈습니다');
    }
    if(box)box.value='';
    setTimeout(()=>{if(!S.live)rTasks();else rTasks();},S.live?250:20);
  },
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
  'acct.join':el=>{
    
    const t=curTeam();if(!t){toast('팀을 먼저 등록하세요');return;}
    const id=el.dataset.id,base=roster().find(p=>p.id===id)||{},cur=(S.people||{})[id]||{};
    store.putPerson(id,{name:base.name||cur.name||'',email:base.email||cur.email||'',
      team:t.id,region:cur.region||'',rank:rankOf(cur.rank),sites:cur.sites||{}});
    if(!S.live)rOrg();
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
    openModal(esc(p.name)+' · 담당 현장',
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
  'set.guide':()=>openModal('사용 안내',GUIDE_HTML,''),
  'set.copyErr':()=>{
    const txt='버전 '+APP_VER+' · '+navigator.userAgent+'\n'+(ERRLOG.length?ERRLOG.join('\n'):'기록된 오류 없음');
    if(navigator.clipboard&&navigator.clipboard.writeText)
      navigator.clipboard.writeText(txt).then(()=>toast('복사했습니다')).catch(()=>toast('복사 실패'));
    else toast('복사를 지원하지 않는 브라우저입니다');
  },
  'org.import':async()=>{
    /* 어느 단계에서 막혔는지 화면에 남긴다 — 토스트만으로는 원인을 알 수 없다 */
    const fail=(t,m)=>openModal(t,'<div style="font-size:13px;color:var(--lbl2);line-height:1.65">'+m+'</div>',
      '<button class="btn bg2 bsm" data-act="modal.close">닫기</button>');
    if(!S.live)return fail('가져오기','로그인 상태에서만 사용할 수 있습니다. 로컬 모드에서는 게시본을 읽을 수 없습니다.');
    if(!isEditor())return fail('가져오기','관리자만 가져올 수 있습니다.<br>현재 권한은 <b>'+esc(roleLabel(S.role||'viewer'))+'</b>입니다. Firebase 콘솔에서 <code>users/{내 uid}/role</code>을 <code>editor</code>로 지정하세요.');
    toast('게시본을 확인하는 중…');
    const read=async p=>{try{return{ok:true,val:(await FB.db.ref(p).once('value')).val()};}
      catch(e){return{ok:false,err:e};}};
    /* ① 게시월 목록 — reportIndex 가 없거나 못 읽으면 최근 24개월을 직접 훑는다 */
    let months=[],idxNote='';
    const idx=await read('reportIndex');
    if(idx.ok&&idx.val&&Object.keys(idx.val).length)months=Object.keys(idx.val).sort();
    else{
      idxNote=idx.ok?'게시월 인덱스가 비어 있어 최근 월을 직접 확인했습니다.'
                    :'게시월 인덱스를 읽을 수 없어 최근 월을 직접 확인했습니다.';
      const d=new Date();
      for(let i=0;i<24;i++){
        const y=d.getFullYear(),m=d.getMonth()-i;
        const dd=new Date(y,m,1);
        months.push(dd.getFullYear()+'-'+pad(dd.getMonth()+1));
      }
      months.reverse();
    }
    /* ② 최신 월부터 거슬러 올라가며 팀·현장이 담긴 게시본을 찾는다 */
    let found=null,permDenied=false;
    for(let i=months.length-1;i>=0&&!found;i--){
      const rm=months[i];
      const [t,s2]=await Promise.all([read('report/'+rm+'/_dash/teams'),read('report/'+rm+'/_dash/sites')]);
      if(!t.ok||!s2.ok){permDenied=true;continue;}
      const teams=arr(t.val),sites=arr(s2.val);
      if(teams.length||sites.length)found={rm,teams,sites};
    }
    if(!found){
      return fail('가져오기',(permDenied
        ? '게시본을 읽을 권한이 없습니다. 규칙의 <code>report</code> 읽기 조건을 확인하세요.'
        : '팀·현장 정보가 담긴 게시본을 찾지 못했습니다.<br>하자처리 현황에서 <b>설정 &gt; 사내 게시</b>로 한 번 등록한 뒤 다시 시도하세요.')
        +(idxNote?'<br><br><span style="font-size:11.5px;color:var(--lbl3)">'+idxNote+'</span>':''));
    }
    const {rm,teams,sites}=found;
    /* 하자처리 현황은 권역을 '이름 문자열'로 다룬다 — 이름을 그대로 id 로 삼아 현장과 연결한다 */
    const regNames=[...new Set([...teams.flatMap(t=>arr(t.regions)),...sites.map(x=>x.region)]
      .map(x=>String(x||'').trim()).filter(Boolean))];
    const next={
      teams:teams.map(t=>({id:String(t.id),name:String(t.name||'').slice(0,60)})),
      regions:regNames.map(n=>({id:n,name:n})),
      sites:sites.map(x=>({id:String(x.id),name:String(x.name||'').slice(0,60),
        team:String(x.teamId||''),region:String(x.region||''),
        units:Number(x.units)||0,buildings:Number(x.buildings)||0,
        commercialUnits:Number(x.commercialUnits)||0,completionDate:String(x.completionDate||'').slice(0,10)}))
    };
    confirmModal('게시본에서 가져오기',
      rm+' 게시본 기준 · 팀 '+next.teams.length+'개, 권역 '+next.regions.length+'개, 현장 '+next.sites.length+'개를 가져옵니다. '
      +'기존 목록은 대체됩니다. 계정 배정은 이름이 같으면 그대로 이어지고, 없어진 항목은 비워집니다.',()=>{
      const oldName=(list,id)=>{const x=(list||[]).find(y=>y.id===id);return x?x.name:'';};
      const byName=(list,name)=>{const x=(list||[]).find(y=>y.name&&y.name===name);return x?x.id:'';};
      const prev=S.org;
      Object.keys(S.people||{}).forEach(pid=>{
        const p=S.people[pid];
        const t=byName(next.teams,oldName(prev.teams,p.team));
        const r=byName(next.regions,oldName(prev.regions,p.region));
        const st={};
        Object.keys(p.sites||{}).forEach(sid=>{const nid=byName(next.sites,oldName(prev.sites,sid));if(nid)st[nid]=1;});
        if(t!==(p.team||'')||r!==(p.region||'')||JSON.stringify(st)!==JSON.stringify(p.sites||{}))
          store.putPerson(pid,{...p,team:t,region:r,sites:st});
      });
      S.org=next;orgSave();rOrg();
      if(!next.teams.some(t=>t.id===S.tk.t))S.tk.t=next.teams.length?next.teams[0].id:null;
      rTeamSel();rFilter();
      toast('가져왔습니다 · 조직/현장 관리에서 확인하세요');
    },'가져오기',false);
  },
  'team.switch':el=>{
    const tid=el.dataset.tid||(el.value||'');
    if(!tid)return;
    S.tk.t=tid;S.tk.r='*';S.tk.m=null;
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
  'cal.pick':()=>openYMPick(),
  'cal.pickY':el=>{const c=CAL?CAL.view.currentStart:new Date();
    YM_Y=(YM_Y===null?c.getFullYear():YM_Y)+Number(el.dataset.d);
    const box=$('#ymPop')||$('#mbody');box.innerHTML=ymPickHTML();},
  'cal.goYM':el=>{
    const y=Number(el.dataset.y),m=Number(el.dataset.m);
    if($('#ymPop'))closeYMPop();else closeModal();
    if(!CAL)return;
    CAL.gotoDate(new Date(y,m-1,1));
    /* 그 달에 오늘이 있으면 오늘을, 아니면 1일을 고른다 */
    const t=new Date(),same=t.getFullYear()===y&&t.getMonth()+1===m;
    selDate(y+'-'+pad(m)+'-'+pad(same?t.getDate():1));
    rMonTitle();subVisibleMonths();refetchCal();},
  'mail.preview':el=>mailPreview(el.dataset.kind),
  'wid.set':()=>{const p=$('#wgSet');if(!p)return;p.classList.toggle('on');p.setAttribute('aria-hidden',p.classList.contains('on')?'false':'true');widApply();}
};
/* 필터 = 권역(세그먼트) + 담당자(선택). 권역을 고르면 담당자 목록도 그 권역으로 좁혀진다. */
function rFilter(){
  const list=roster(),me=S.user?list.find(p=>p.id===(S.user.uid||'')):null;
  const regs=(S.org.regions||[]).filter(r=>r.name);
  const rf=$('#regFilter');
  if(rf){
    /* 없어진 권역은 걸러낸다 — select 는 단일 선택 */
    const keep=regSel().filter(id=>regs.some(r=>r.id===id));
    S.filter.reg=keep.length?[keep[0]]:'*';
    const cur=regSel()[0]||'*';
    rf.innerHTML='<option value="*">권역 전체</option>'
      +regs.map(r=>'<option value="'+esc(r.id)+'"'+(r.id===cur?' selected':'')+'>'+esc(r.name)+'</option>').join('');
    rf.value=cur;
  }
  const sel=$('#ownFilter');if(!sel)return;
  const rs=regSel();
  const inReg=rs.length?list.filter(p=>rs.includes(p.region)):list;
  if(S.filter.own!=='*'&&!inReg.some(p=>p.id===S.filter.own))S.filter.own='*';
  /* '내 업무'를 따로 두면 목록의 내 이름과 겹친다 — 이름 뒤에 (나) 만 붙인다 */
  sel.innerHTML='<option value="*">담당자 전체</option>'
    +inReg.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+(me&&p.id===me.id?' (나)':'')+'</option>').join('');
  sel.value=[...sel.options].some(o=>o.value===S.filter.own)?S.filter.own:'*';
  S.filter.own=sel.value;
}
function confirmModal(title,msg,cb,okLabel,danger){
  openModal(title,'<div style="font-size:13px;color:var(--lbl2);line-height:1.6">'+esc(msg)+'</div>',
    '<button class="btn bg2 bsm" data-act="modal.close">취소</button>'
    +'<button class="btn '+((danger===false)?'bp':'btn-danger')+' bsm" data-act="modal.ok">'+esc(okLabel||'삭제')+'</button>');
  MODAL_CB={type:'confirm',ok:()=>{cb();closeModal();}};
}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');
  if(!el)return;
  if(el.tagName==='SELECT')return;   /* select 는 change 에서만 처리 — 누르기만 해도 실행되던 버그 방지 */
  const fn=ACT[el.dataset.act];
  if(fn){if(el.dataset.act!=='modal.stop')e.stopPropagation();fn(el);}
});
/* 임의로 추가한 색 칩은 우클릭으로 지운다 — 지우면 첫 칩(자동)으로 되돌린다 */
document.addEventListener('contextmenu',e=>{
  const chip=e.target.closest('.pal-c.pal-custom');
  if(!chip)return;
  e.preventDefault();
  const box=chip.closest('.pal');
  const wasSel=chip.classList.contains('sel');
  chip.remove();
  if(wasSel&&box){const first=box.querySelector('.pal-c');if(first)first.classList.add('sel');}
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
document.addEventListener('change',e=>{
  if(e.target.id==='teamSelEl'){ACT['team.switch'](e.target);return;}
  if(e.target.closest('[data-act="pf.org"]')){ACT['pf.org']();return;}
  if(e.target.id==='tnKind'){tkKindRefresh();return;}
  if(e.target.id==='tkFst'||e.target.id==='tkFdue'){
    S.tkF={...S.tkF,[e.target.id==='tkFst'?'st':'due']:e.target.value};rTasks();return;}
  const rl=e.target.closest('[data-act="acct.role"]');
  if(rl){ACT['acct.role'](rl);return;}
  if(e.target.id==='regFilter'){const v=e.target.value;S.filter.reg=v==='*'?'*':[v];rFilter();refetchCal();rDay();rWidget();return;}
  if(e.target.id==='ownFilter'){S.filter.own=e.target.value;refetchCal();rDay();rWidget();return;}
  const ren=e.target.closest('[data-act="org.ren"]');
  if(ren){
    const k=ren.dataset.kind;
    const list=k==='Team'?(S.org.teams||[]):k==='Site'?(S.org.sites||[]):(S.org.regions||[]);
    const it=list.find(x=>x.id===ren.dataset.id);
    if(it){it.name=(ren.value||'').trim();orgSave();if(S.view==='tasks')rTasks();}
    return;
  }
  if(e.target.id==='darkChk'){applyTheme(e.target.checked);return;}
  if(e.target.closest&&e.target.closest('[data-act="set.mail"]')){saveMailCfg();return;}
  if(e.target.id==='setDefectUrl'){                    /* 연결 주소는 입력을 마치면 자동 저장 */
    if(!isEditor()){denyEdit();rCfg();return;}
    store.putCfg('defectUrl',(e.target.value||'').trim(),err=>{
      toast(err?('저장 실패 · '+((err&&err.message)||err)):'저장했습니다');});
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
    region:uses.region?(f==='region'?el.value:(cur.region||'')):'',
    rank,
    sites:uses.sites?(cur.sites||{}):{}});
  if(!S.live){rOrg();rTasks();}
});
document.addEventListener('input',e=>{if(e.target.id==='nqQ')rNq();});
/* 현장 표 인라인 저장 — 하자처리현황과 같은 즉시 반영 */
document.addEventListener('change',e=>{
  const el=e.target.closest('[data-act="org.siteUpd"]');
  if(!el)return;
  if(!isEditor()){denyEdit();rOrg();return;}
  const st=(S.org.sites||[]).find(x=>x.id===el.dataset.id);if(!st)return;
  const f=el.dataset.f,v=el.value;
  if(f==='units'||f==='buildings'||f==='commercialUnits')st[f]=Number(v)||0;
  else st[f]=String(v||'');
  orgSave();
  if(f==='region'&&!S.live)rOrg();   /* 권역이 바뀌면 정렬 위치가 달라진다 */
});
/* 위젯 설정 팝업 조작 */
document.addEventListener('input',e=>{
  if(e.target.id==='wgA'){const c=widCfgLoad();c.a=Number(e.target.value);widCfgSave(c);widApply();}
});
document.addEventListener('change',e=>{
  if(e.target.id==='wgPanelChk'){const c=widCfgLoad();c.panel=e.target.checked;widCfgSave(c);widApply();return;}
  if(e.target.id==='wgDarkChk'){applyTheme(e.target.checked);return;}
});
document.addEventListener('click',e=>{
  const b=e.target.closest('#wgFz button');
  if(b){const c=widCfgLoad();c.fz=b.dataset.fz;widCfgSave(c);widApply();}
});
document.addEventListener('input',e=>{
  if(e.target.id==='dpQ'){S.dayQ=e.target.value;dpSrchMark();rDay();return;}
  if(e.target.id==='tkQ'){
    S.tkF={...S.tkF,q:e.target.value};
    clearTimeout(tkQT);tkQT=setTimeout(tkRefresh,160);   /* 전체 렌더는 포커스를 날린다 */
  }
});
let tkQT=null;
/* 목록·좌측 카운트만 다시 그려 입력 포커스를 유지 */
function tkRefresh(){
  const root=$('#tkRoot');if(!root)return;
  const q=$('#tkQ'),pos=q?q.selectionStart:null;
  rTasks();
  const q2=$('#tkQ');
  if(q2&&q){q2.focus();try{q2.setSelectionRange(pos,pos);}catch(_){}}
}
function dpSrchMark(){const w=document.querySelector('.dp-srch');if(w)w.classList.toggle('has',!!String(S.dayQ||'').trim());}
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&(e.target.id==='fbEmail'||e.target.id==='fbPw')){e.preventDefault();fbDoLogin();return;}
  if(e.key==='Enter'&&e.target.id==='peTitle'){e.preventDefault();savePlanInline();return;}
  /* Ctrl/⌘+K 로 찾기 */
  if((e.ctrlKey||e.metaKey)&&(e.key==='k'||e.key==='K')){e.preventDefault();nqOpen(true);rNq();return;}
  if(e.key==='Escape'&&$('#nqPanel')&&$('#nqPanel').classList.contains('on')&&!$('#mo').classList.contains('open')){nqOpen(false);return;}
  if(e.key==='Escape'){
    if($('#mo').classList.contains('open')){closeModal();return;}
    if(S.tkNew||S.tkEdit){S.tkNew=null;S.tkEdit=null;rTasks();return;}
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
function maxEvOf(){return isNarrow()?2:false;}

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
    if(nar!==MOBILE_CAL){MOBILE_CAL=nar;CAL.setOption('dayMaxEvents',maxEvOf());}
    CAL.updateSize();
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
const WIDGET=/[?&]w=1\b/.test(location.search);
const GLASS=/[?&]glass=1\b/.test(location.search);   /* 위젯 유리(반투명) 모드 — 배경을 비운다 */
/* 위젯 설정 — 진하기·글자 크기·오늘 목록. 위젯 창(PC)별 로컬 저장 */
const WID_KEY='calapp.wid';
function widCfgLoad(){try{return JSON.parse(localStorage.getItem(WID_KEY))||{};}catch(e){return{};}}
function widCfgSave(c){try{localStorage.setItem(WID_KEY,JSON.stringify(c));}catch(e){}}
function widApply(){
  if(!WIDGET)return;
  const c=widCfgLoad();
  /* 진하기 — FullCalendar 셀에서 var() 상속이 갱신되지 않는 엔진 특이 동작이 있어
     변수 대신 리터럴 규칙을 스타일 태그로 주입한다 */
  const a=Number.isFinite(Number(c.a))?Number(c.a)/100:.55;
  let dyn=document.getElementById('wgDyn');
  if(!dyn){dyn=document.createElement('style');dyn.id='wgDyn';document.head.appendChild(dyn);}
  const f=n=>Math.min(1,Math.max(0,n)).toFixed(3);
  dyn.textContent=GLASS?[
    'body.wid.glass #fcal td.fc-daygrid-day{background:rgba(24,28,38,'+f(a)+')!important;}',
    'body.wid.glass #fcal td.fc-daygrid-day.fc-day-sat,body.wid.glass #fcal td.fc-daygrid-day.fc-day-sun{background:rgba(52,56,68,'+f(a*.92)+')!important;}',
    'body.wid.glass #fcal td.fc-daygrid-day.fc-day-other{background:rgba(24,28,38,'+f(a*.42)+')!important;}',
    'body.wid.glass #fcal td.fc-daygrid-day.fc-day-today{background:rgba(62,113,210,'+f(a*.88)+')!important;}',
    'body.wid.glass #fcal .fc-col-header-cell{background:rgba(13,16,24,'+f(a+.12)+')!important;}',
    'body.wid.glass .plan{background:rgba(13,17,26,'+f(a+.05)+');}',
    'body.wid.glass .cal-head .seg,body.wid.glass .cal-head .cal-nav{background:rgba(16,20,30,'+f(a*.9)+');}'
  ].join('\n'):'';
  const fz=c.fz==='s'?.9:c.fz==='l'?1.14:1;document.body.style.setProperty('--wfz',String(fz));
  const pn=$('#widPanel');if(pn)pn.style.display=c.panel===false?'none':'';
  const rng=$('#wgA');if(rng)rng.value=Math.round(a*100);
  if($('#wgFz'))$$('#wgFz button').forEach(b=>b.classList.toggle('act',b.dataset.fz===(c.fz||'m')));
  const pc=$('#wgPanelChk');if(pc)pc.checked=c.panel!==false;
  const dc=$('#wgDarkChk');if(dc)dc.checked=document.documentElement.classList.contains('dark');
}
function rWidget(){
  if(!WIDGET)return;
  const ds=S.selDate,ps=dayPlans(ds),d=toDate(ds),ho=holOf(ds);
  $('#widPanel').innerHTML='<div class="wid-h">'+(d.getMonth()+1)+'월 '+d.getDate()+'일 · '+DOW[d.getDay()]+(ho?' · '+esc(ho.n):'')+(ds===todayStr()?' · 오늘':'')+'</div>'
    +(ps.length?ps.map(({p,occ})=>`<div class="plan${isDone(p,occ)?' done':''}">
        <div class="pc" style="background:${esc(planColor(p))}"></div>
        <div class="plan-main"><div class="plan-t">${esc(p.title)}</div>
        ${fmtSpan(p)?'<div class="plan-meta"><span class="pm-chip">'+esc(fmtSpan(p))+'</span></div>':''}</div></div>`).join('')
      :'<div class="dp-empty" style="padding:10px 0">업무 없음</div>');
}

/* ═══════════ 부팅 ═══════════ */
function rAll(){rDay();rTasks();rOrg();rCfg();rFilter();rMention();rMine();rTeamSel();refetchCal();rWidget();}   /* 팀 선택기는 조직 화면 밖(사이드바)이라 rAll 에서도 그린다 */
(function boot(){
  let dark=false;
  try{dark=localStorage.getItem('calapp.theme')==='dark';}catch(e){}
  applyTheme(dark);
  if(WIDGET)document.body.classList.add('wid');
  if(WIDGET&&GLASS)document.body.classList.add('glass');
  if(WIDGET)widApply();
  LocalStore.init();
  calInit();
  bindCalResize();
  subVisibleMonths();
  rDay();rAcct();rFilter();rTeamSel();rWidget();   /* 팀 선택기는 사이드바 상시 요소 — 부팅 때부터 그린다 */
  if(DEV_LOCAL){hideCover();}
  else{
    fbInit();
    /* SDK가 아예 안 뜨거나(사내망 차단 등) 응답이 없으면 안내와 함께 로그인 폼을 연다 */
    if(typeof firebase==='undefined'||!FB.auth){showGateForm();fbMsg('네트워크에 연결할 수 없습니다.');}
    else FB._boot=setTimeout(()=>{if(!S.live)showGateForm();},2500);
  }
  /* 이전 버전에서 등록됐을 수 있는 서비스워커·캐시 제거 —
     캐시가 남아 있으면 배포해도 옛 코드가 계속 뜬다. (한동안 유지 후 삭제해도 됨) */
  if('serviceWorker' in navigator){
    navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});
    if(window.caches&&caches.keys)caches.keys().then(ks=>ks.forEach(k=>caches.delete(k))).catch(()=>{});
  }
})();
