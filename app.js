/* ═══════════════════════════════════════════════════════════════
   H서비스센터 · 일정·업무 공유
   - 디자인·구조 원칙은 하자처리 현황 앱을 따른다 (토큰·컴포넌트 동일)
   - 데이터: 로그인 전 localStorage → 로그인 후 Firebase RTDB(calapp/*) 실시간
   - 같은 origin(GitHub Pages)·같은 Firebase 프로젝트라, 하자처리 현황에
     로그인돼 있으면 세션이 자동 공유되어 이 앱도 곧바로 실시간 모드가 된다.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

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
const PAL=['#3E71D2','#16A34A','#D97706','#DC2626','#7C5CD6','#64748B'];
const ST_LBL=['예정','진행','완료','보류'];
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
function fmtTime(t){if(!t)return'';const[h,m]=t.split(':').map(Number);const ap=h<12?'오전':'오후';const hh=h%12===0?12:h%12;return ap+' '+hh+':'+pad(m);}
function relTime(ts){if(!ts)return'';const d=Date.now()-ts;const m=Math.floor(d/6e4);if(m<1)return'방금';if(m<60)return m+'분 전';const h=Math.floor(m/60);if(h<24)return h+'시간 전';return Math.floor(h/24)+'일 전';}

/* ───── 상태 ───── */
const S={
  view:'calendar',
  selDate:todayStr(),
  plans:{},          // {ym:{id:plan}}
  org:{teams:[]},    // {teams:[{id,name,ggs:[{id,name,members:[{id,name,email}]}]}]}
  tasks:{},          // {memberId:{itemId:{text,st,updatedAt}}}
  cfg:{},            // {defectUrl}
  tk:{t:null,g:null,m:null},  // 주요업무현황 탭 선택(팀/공구/담당자)
  live:false,        // Firebase 실시간 모드 여부
  user:null,
  _subYms:[]
};

/* 입력 중이면 실시간 수신이 타이핑을 덮어쓰지 않도록 렌더 보류 (하자처리 현황 패턴) */
function shEditing(){const a=document.activeElement;return !!(a&&(a.tagName==='TEXTAREA'||a.tagName==='INPUT'||a.isContentEditable));}
const PEND={day:false,tasks:false,org:false};
document.addEventListener('focusout',()=>{setTimeout(()=>{if(shEditing())return;
  if(PEND.day){PEND.day=false;rDay();refetchCal();}
  if(PEND.tasks){PEND.tasks=false;rTasks();}
  if(PEND.org){PEND.org=false;rOrg();}
},60);});

/* ═══════════ 저장소 — 로컬 ⇄ Firebase 공용 인터페이스 ═══════════ */
const LS_KEY='calapp.v1';
function lsLoad(){try{return JSON.parse(localStorage.getItem(LS_KEY))||{};}catch(e){return{};}}
function lsSave(d){try{localStorage.setItem(LS_KEY,JSON.stringify(d));}catch(e){}}

const LocalStore={
  name:'local',
  _d:null,
  init(){this._d=lsLoad();this._d.plans=this._d.plans||{};this._d.org=this._d.org||{teams:[]};this._d.tasks=this._d.tasks||{};this._d.cfg=this._d.cfg||{};
    S.org=this._d.org;S.tasks=this._d.tasks;S.cfg=this._d.cfg;},
  subPlans(ym){S.plans[ym]=this._d.plans[ym]||{};},
  putPlan(p){const ym=ymOf(p.date);this._d.plans[ym]=this._d.plans[ym]||{};this._d.plans[ym][p.id]=p;S.plans[ym]=this._d.plans[ym];lsSave(this._d);},
  delPlan(ym,id){if(this._d.plans[ym]){delete this._d.plans[ym][id];S.plans[ym]=this._d.plans[ym];lsSave(this._d);}},
  movePlan(p,oldYm){this.delPlan(oldYm,p.id);this.putPlan(p);},
  putOrg(org){this._d.org=org;S.org=org;lsSave(this._d);},
  putTask(mid,iid,item){this._d.tasks[mid]=this._d.tasks[mid]||{};if(item)this._d.tasks[mid][iid]=item;else delete this._d.tasks[mid][iid];S.tasks=this._d.tasks;lsSave(this._d);},
  putCfg(k,v){this._d.cfg[k]=v;S.cfg=this._d.cfg;lsSave(this._d);}
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

const FbStore={
  name:'fb',
  init(){},
  _on(path,cb){const r=FB.db.ref(path);r.on('value',s=>cb(s.val()));FB._subs.push(r);},
  subPlans(ym){
    if(S._subYms.includes(ym))return;S._subYms.push(ym);
    this._on('calapp/plans/'+ym,v=>{S.plans[ym]=v||{};
      if(shEditing()){PEND.day=true;return;}
      refetchCal();if(ymOf(S.selDate)===ym)rDay();});
  },
  putPlan(p){FB.db.ref('calapp/plans/'+ymOf(p.date)+'/'+p.id).set(p).catch(fbErr);},
  delPlan(ym,id){FB.db.ref('calapp/plans/'+ym+'/'+id).remove().catch(fbErr);},
  movePlan(p,oldYm){const u={};u['calapp/plans/'+oldYm+'/'+p.id]=null;u['calapp/plans/'+ymOf(p.date)+'/'+p.id]=p;FB.db.ref().update(u).catch(fbErr);},
  putOrg(org){FB.db.ref('calapp/org').set(org).catch(fbErr);},
  putTask(mid,iid,item){const r=FB.db.ref('calapp/tasks/'+mid+'/'+iid);(item?r.set(item):r.remove()).catch(fbErr);},
  putCfg(k,v){FB.db.ref('calapp/cfg/'+k).set(v).catch(fbErr);},
  bindShared(){
    this._on('calapp/org',v=>{S.org=(v&&v.teams)?v:{teams:[]};normOrg(S.org);
      if(shEditing()){PEND.org=true;PEND.tasks=true;return;}
      rOrg();rTasks();});
    this._on('calapp/tasks',v=>{S.tasks=v||{};
      if(shEditing()){PEND.tasks=true;return;}
      rTasks();});
    this._on('calapp/cfg',v=>{S.cfg=v||{};rCfg();});
  }
};
function fbErr(e){console.warn('[FB]',e);toast('저장 실패 — 권한 또는 네트워크를 확인하세요');}
/* Firebase 배열 직렬화 보정: 빈 배열은 사라지고 객체로 돌아올 수 있다 */
function normOrg(org){org.teams=arr(org.teams);org.teams.forEach(t=>{t.ggs=arr(t.ggs);t.ggs.forEach(g=>{g.members=arr(g.members);});});}
function arr(v){if(Array.isArray(v))return v.filter(Boolean);if(v&&typeof v==='object')return Object.values(v).filter(Boolean);return[];}

let store=LocalStore;

/* ═══════════ Firebase 초기화 · 세션 감지 ═══════════ */
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
    FB.auth.onAuthStateChanged(u=>{
      if(u&&u.emailVerified&&fbDomainOk(u.email))enterLive(u);
      else exitLive();
    });
  }catch(e){console.warn('[FB] init',e);}
}
function enterLive(u){
  if(S.live)return;
  S.live=true;S.user=u;store=FbStore;
  S.plans={};S._subYms=[];
  FbStore.bindShared();
  subVisibleMonths();
  rSync();rAcct();
  toast('팀 실시간 공유 모드로 연결됨');
}
function exitLive(){
  const was=S.live;
  S.live=false;S.user=null;
  FB._subs.forEach(r=>{try{r.off();}catch(e){}});FB._subs=[];
  store=LocalStore;LocalStore.init();
  S.plans={};S._subYms=[];
  subVisibleMonths();rAll();rSync();rAcct();
  if(was)toast('로컬 저장 모드로 전환됨');
}
function rSync(){
  const b=$('#syncBadge'),t=$('#syncTxt');
  b.classList.toggle('on',S.live);
  t.textContent=S.live?'실시간 공유':'로컬 저장';
  const st=$('#setSyncState'),sd=$('#setSyncDesc');
  if(st){st.textContent=S.live?'팀 실시간 공유 모드':'로컬 저장 모드';
    sd.textContent=S.live?'모든 변경이 즉시 팀 전체에 공유됩니다. ('+(S.user?S.user.email:'')+')':'로그인 전에는 이 브라우저에만 저장됩니다. 로그인하면 팀 실시간 공유로 전환됩니다.';}
}
function rAcct(){
  $('#sbAcctName').textContent=S.user?(S.user.email||'').split('@')[0]:'로그인 전';
  $('#sbAcctSub').textContent=S.user?'실시간 공유':'로컬 저장';
}

/* ═══════════ 달력 (FullCalendar) ═══════════ */
let CAL=null;
function calInit(){
  CAL=new FullCalendar.Calendar($('#fcal'),{
    initialView:'dayGridMonth',
    initialDate:S.selDate,
    firstDay:0,fixedWeekCount:false,showNonCurrentDates:true,
    headerToolbar:false,height:'100%',dayMaxEvents:true,
    moreLinkContent:a=>'+'+a.num+'건',
    dayHeaderContent:a=>DOW[a.date.getDay()],
    dayCellClassNames:a=>{const o=holOf(dstr(a.date));return o&&o.h?['hol']:[];},
    dayCellContent:a=>{const ds=dstr(a.date),o=holOf(ds);
      return{html:'<span>'+a.date.getDate()+'</span>'+(o?'<span class="dhol'+(o.h?'':' anv')+'">'+esc(o.n)+'</span>':'')};},
    events:(info,ok)=>ok(buildEvents()),
    dateClick:info=>{selDate(info.dateStr);},
    eventClick:info=>{info.jsEvent.preventDefault();const p=findPlan(info.event.id);if(p)openPlanModal(p);},
    eventDrop:info=>{const p=findPlan(info.event.id);if(!p)return;
      const oldYm=ymOf(p.date);p.date=info.event.startStr;p.updatedAt=Date.now();
      if(oldYm===ymOf(p.date))store.putPlan(p);else store.movePlan(p,oldYm);
      if(!S.live){refetchCal();}
      selDate(p.date);toast('플랜 날짜를 옮겼습니다');},
    editable:true,eventDurationEditable:false,
    datesSet:()=>{rMonTitle();subVisibleMonths();markSel();}
  });
  CAL.render();
  markSel();
}
function buildEvents(){
  const evs=[];
  Object.keys(S.plans).forEach(ym=>{const m=S.plans[ym]||{};Object.keys(m).forEach(id=>{const p=m[id];if(!p||!p.date)return;
    evs.push({id:p.id,title:(p.time?fmtTime(p.time)+' ':'')+p.title,start:p.date,allDay:true,
      backgroundColor:p.color||PAL[0],borderColor:'transparent',textColor:'#fff',
      classNames:p.done?['done']:[]});});});
  return evs;
}
function refetchCal(){if(CAL)CAL.refetchEvents();}
function findPlan(id){for(const ym in S.plans){if(S.plans[ym]&&S.plans[ym][id])return S.plans[ym][id];}return null;}
function subVisibleMonths(){
  if(!CAL)return;
  const c=CAL.view.currentStart;
  [-1,0,1].forEach(k=>{const d=new Date(c.getFullYear(),c.getMonth()+k,1);store.subPlans(d.getFullYear()+'-'+pad(d.getMonth()+1));});
  if(!S.live)refetchCal();
}
function rMonTitle(){
  if(!CAL)return;const c=CAL.view.currentStart;
  $('#calMonTxt').textContent=(c.getMonth()+1)+'월';
  $('#calYearTxt').textContent=c.getFullYear();
}
function markSel(){
  $$('#fcal .fc-daygrid-day.sel-day').forEach(el=>el.classList.remove('sel-day'));
  const td=$('#fcal td[data-date="'+S.selDate+'"]');
  if(td)td.classList.add('sel-day');
}
function selDate(ds){
  S.selDate=ds;
  if(CAL&&ymOf(ds)!==CAL.view.currentStart.getFullYear()+'-'+pad(CAL.view.currentStart.getMonth()+1))CAL.gotoDate(ds);
  markSel();rDay();
}

/* ───── 우측 일자 패널 ───── */
function dayPlans(ds){
  const m=S.plans[ymOf(ds)]||{};
  return Object.values(m).filter(p=>p&&p.date===ds)
    .sort((a,b)=>(a.time||'99')<(b.time||'99')?-1:(a.time||'99')>(b.time||'99')?1:(a.createdAt||0)-(b.createdAt||0));
}
function rDay(){
  const ds=S.selDate,d=toDate(ds),ps=dayPlans(ds);
  const ho=holOf(ds);
  $('#dpDow').textContent=d.getFullYear()+'년 · '+DOW[d.getDay()]+'요일'+(ho?' · '+ho.n:'')+(ds===todayStr()?' · 오늘':'');
  $('#dpDate').textContent=(d.getMonth()+1)+'월 '+d.getDate()+'일';
  $('#dpCnt').textContent=ps.length?'플랜 '+ps.length+'건'+(ps.filter(p=>p.remind).length?' · 리마인드 '+ps.filter(p=>p.remind).length+'건':''):'등록된 플랜 없음';
  const box=$('#dpList');
  if(!ps.length){box.innerHTML='<div class="dp-empty">이 날짜에 등록된 플랜이 없습니다.</div>';return;}
  box.innerHTML=ps.map(p=>`
    <div class="plan${p.done?' done':''}" data-pid="${esc(p.id)}">
      <div class="pc" style="background:${esc(p.color||PAL[0])}"></div>
      <div class="plan-main" data-act="plan.edit" data-pid="${esc(p.id)}">
        <div class="plan-t">${esc(p.title)}</div>
        <div class="plan-meta">
          ${p.time?'<span class="pm-chip">'+esc(fmtTime(p.time))+'</span>':''}
          ${p.remind?'<span class="pm-chip remind"><svg class="icn"><use href="#i-bell"></use></svg>리마인드</span>':''}
          ${p.by?'<span>'+esc(p.by)+'</span>':''}
        </div>
        ${p.body?'<div class="plan-body">'+esc(p.body)+'</div>':''}
      </div>
      <div class="plan-side">
        <button class="p-ico${p.done?' on':''}" data-act="plan.done" data-pid="${esc(p.id)}" aria-label="완료 표시" style="${p.done?'color:var(--gn)':''}"><svg class="icn"><use href="#i-check"></use></svg></button>
        <button class="p-ico${p.remind?' on':''}" data-act="plan.remind" data-pid="${esc(p.id)}" aria-label="리마인드 전환"><svg class="icn"><use href="#i-bell"></use></svg></button>
      </div>
    </div>`).join('');
}

/* ───── 플랜 작성·수정 모달 ───── */
let MODAL_CB=null;
function openModal(title,bodyHTML,footHTML){
  $('#mt').textContent=title;$('#mbody').innerHTML=bodyHTML;$('#mf').innerHTML=footHTML;
  $('#mo').classList.add('open');
}
function closeModal(){$('#mo').classList.remove('open');MODAL_CB=null;}
function openPlanModal(p){
  const isNew=!p;
  const d=p||{id:uid(),date:S.selDate,title:'',time:'',body:'',color:PAL[0],remind:false,done:false,createdAt:Date.now()};
  const dd=toDate(d.date);
  openModal(isNew?'플랜 추가':'플랜 수정',`
    <div class="frow"><label>날짜</label><input type="date" class="inp inp-sm" id="pfDate" value="${esc(d.date)}"></div>
    <div class="frow"><label>제목</label><input class="inp" id="pfTitle" maxlength="80" placeholder="무엇을 하나요?" value="${esc(d.title)}"></div>
    <div class="frow2">
      <div class="frow"><label>시간 (선택)</label><input type="time" class="inp inp-sm" id="pfTime" value="${esc(d.time||'')}"></div>
      <div class="frow"><label>색</label><div class="pal" id="pfPal">${PAL.map(c=>'<div class="pal-c'+(c===(d.color||PAL[0])?' sel':'')+'" data-c="'+c+'" style="background:'+c+'"></div>').join('')}</div></div>
    </div>
    <div class="frow"><label>내용 (선택)</label><textarea class="inp" id="pfBody" maxlength="500" placeholder="메모·세부 내용">${esc(d.body||'')}</textarea></div>
    <label class="chk-row"><input type="checkbox" id="pfRemind"${d.remind?' checked':''}> 당일 아침 팀원에게 리마인드 메일 발송</label>
  `,`
    ${isNew?'':'<button class="btn btn-danger bsm" data-act="plan.del" data-pid="'+esc(d.id)+'" data-ym="'+esc(ymOf(d.date))+'" style="margin-right:auto">삭제</button>'}
    <button class="btn bg2 bsm" data-act="modal.close">취소</button>
    <button class="btn bp bsm" data-act="plan.save">저장</button>
  `);
  MODAL_CB={type:'plan',orig:isNew?null:{...d},draft:d};
  setTimeout(()=>{const t=$('#pfTitle');if(t)t.focus();},50);
}
function savePlanFromModal(){
  const cb=MODAL_CB;if(!cb||cb.type!=='plan')return;
  const title=($('#pfTitle').value||'').trim();
  if(!title){toast('제목을 입력하세요');$('#pfTitle').focus();return;}
  const date=$('#pfDate').value||S.selDate;
  const sel=$('#pfPal .pal-c.sel');
  const p={...cb.draft,
    date,title,
    time:$('#pfTime').value||'',
    body:($('#pfBody').value||'').trim(),
    color:sel?sel.dataset.c:PAL[0],
    remind:$('#pfRemind').checked,
    by:S.user?(S.user.email||'').split('@')[0]:(cb.draft.by||''),
    updatedAt:Date.now()};
  const oldYm=cb.orig?ymOf(cb.orig.date):null;
  if(oldYm&&oldYm!==ymOf(p.date))store.movePlan(p,oldYm);
  else store.putPlan(p);
  closeModal();
  selDate(p.date);
  if(!S.live){refetchCal();rDay();}
  toast(cb.orig?'플랜을 수정했습니다':'플랜을 추가했습니다');
}

/* ═══════════ 주요업무현황 — 팀 | 공구 | 담당자 3열 ═══════════ */
function allMembers(){
  const out=[];
  (S.org.teams||[]).forEach(t=>(t.ggs||[]).forEach(g=>(g.members||[]).forEach(m=>out.push({...m,team:t.name,gg:g.name}))));
  return out;
}
/* 탭 선택 검증 — 삭제·변경돼도 항상 유효한 대상을 가리키게 */
function tkSel(){
  const teams=S.org.teams||[];
  const team=teams.find(x=>x.id===S.tk.t)||teams[0]||null;S.tk.t=team?team.id:null;
  const ggs=team?(team.ggs||[]):[];
  const gg=ggs.find(x=>x.id===S.tk.g)||ggs[0]||null;S.tk.g=gg?gg.id:null;
  const mems=gg?(gg.members||[]):[];
  const mem=mems.find(x=>x.id===S.tk.m)||mems[0]||null;S.tk.m=mem?mem.id:null;
  return{teams,team,ggs,gg,mems,mem};
}
function tkTabs(list,selId,lv){
  return '<div class="tabs">'+list.map(x=>'<span class="tab'+(x.id===selId?' act':'')+'" data-act="tk.tab" data-lv="'+lv+'" data-id="'+esc(x.id)+'">'+esc(x.name)+'</span>').join('')+'</div>';
}
function taskListHTML(sid){
  const items=S.tasks[sid]||{};
  const ids=Object.keys(items).sort((a,b)=>(items[a].createdAt||0)-(items[b].createdAt||0));
  if(!ids.length)return '<div class="tk-empty">등록된 업무가 없습니다.</div>';
  return ids.map(iid=>{const it=items[iid];return `
    <div class="tk-item s${it.st||0}" data-sid="${esc(sid)}" data-iid="${esc(iid)}">
      <span class="tk-st s${it.st||0}" data-act="tk.st" data-sid="${esc(sid)}" data-iid="${esc(iid)}">${ST_LBL[it.st||0]}</span>
      <div class="tk-txt" data-act="tk.editable" data-sid="${esc(sid)}" data-iid="${esc(iid)}">${esc(it.text)}</div>
      <span class="tk-time">${relTime(it.updatedAt)}</span>
      <button class="tk-del" data-act="tk.del" data-sid="${esc(sid)}" data-iid="${esc(iid)}" aria-label="삭제"><svg class="icn"><use href="#i-close"></use></svg></button>
    </div>`;}).join('');
}
function tkCard(title,tabsHTML,sub,sid,emptyGuide){
  return `<div class="tkc">
    <div class="tkc-h"><div class="bar"></div><b>${esc(title)}</b>${sub?'<span>'+esc(sub)+'</span>':''}</div>
    ${tabsHTML}
    ${sid?'<div class="tk-list">'+taskListHTML(sid)+'</div><button class="btn bo bxs tkc-add" data-act="tk.add" data-sid="'+esc(sid)+'"><svg class="icn"><use href="#i-plus"></use></svg> 업무 추가</button>'
        :'<div class="tk-empty">'+esc(emptyGuide)+'</div>'}
  </div>`;
}
function rTasks(){
  const root=$('#tkRoot');
  const{teams,team,ggs,gg,mems,mem}=tkSel();
  if(!teams.length){
    root.innerHTML='<div class="tk-none">아직 조직 구성이 없습니다.<br>설정에서 팀 · 공구 · 담당자를 먼저 등록하세요.<br><button class="btn bp bsm" data-act="nav.go" data-view="settings">설정으로 이동</button></div>';
    return;
  }
  root.innerHTML='<div class="tk3">'
    +tkCard('팀의 업무',tkTabs(teams,S.tk.t,'t'),null,team?team.id:null,'')
    +tkCard('공구별 업무',ggs.length?tkTabs(ggs,S.tk.g,'g'):'',team?team.name:'',gg?gg.id:null,'설정에서 이 팀의 공구를 등록하세요.')
    +tkCard('담당자별 업무',mems.length?tkTabs(mems,S.tk.m,'m'):'',gg?gg.name:'',mem?mem.id:null,'설정에서 이 공구의 담당자를 등록하세요.')
    +'</div>';
}
function tkStartEdit(el){
  el.contentEditable='true';el.focus();
  const r=document.createRange();r.selectNodeContents(el);r.collapse(false);
  const s=getSelection();s.removeAllRanges();s.addRange(r);
  el.addEventListener('blur',function onb(){el.removeEventListener('blur',onb);tkCommit(el);},{once:true});
}
function tkCommit(el){
  el.contentEditable='false';
  const mid=el.dataset.sid,iid=el.dataset.iid;
  const txt=el.innerText.replace(/\n{2,}/g,'\n').trim();
  const cur=(S.tasks[mid]||{})[iid];
  if(!txt){store.putTask(mid,iid,null);if(!S.live)rTasks();return;}
  if(cur&&cur.text===txt)return;
  const item={...(cur||{createdAt:Date.now()}),text:txt,st:cur?cur.st:0,updatedAt:Date.now()};
  store.putTask(mid,iid,item);
  if(!S.live)rTasks();
}

/* ═══════════ 설정 — 조직 구성 편집 ═══════════ */
function rOrg(){
  const root=$('#orgRoot');
  const teams=S.org.teams||[];
  root.innerHTML=teams.length?teams.map(t=>`
    <div class="org-team" data-tid="${esc(t.id)}">
      <div class="org-th"><b>${esc(t.name)}</b>
        <button class="p-ico" data-act="org.renTeam" data-tid="${esc(t.id)}" aria-label="팀 이름 변경"><svg class="icn"><use href="#i-edit"></use></svg></button>
        <div class="sp"></div>
        <button class="org-x" data-act="org.delTeam" data-tid="${esc(t.id)}" aria-label="팀 삭제"><svg class="icn"><use href="#i-trash"></use></svg></button>
      </div>
      ${(t.ggs||[]).map(g=>`
        <div class="org-gg" data-gid="${esc(g.id)}">
          <div class="org-ggh"><b>${esc(g.name)}</b>
            <button class="p-ico" style="width:22px;height:22px" data-act="org.renGg" data-tid="${esc(t.id)}" data-gid="${esc(g.id)}" aria-label="공구 이름 변경"><svg class="icn" style="width:12px;height:12px"><use href="#i-edit"></use></svg></button>
            <div class="sp" style="flex:1"></div>
            <button class="org-x" data-act="org.delGg" data-tid="${esc(t.id)}" data-gid="${esc(g.id)}" aria-label="공구 삭제"><svg class="icn"><use href="#i-trash"></use></svg></button>
          </div>
          ${(g.members||[]).map(m=>`
            <div class="org-mem"><b>${esc(m.name)}</b><span class="em">${esc(m.email||'이메일 없음')}</span>
              <button class="p-ico" style="width:22px;height:22px" data-act="org.editMem" data-tid="${esc(t.id)}" data-gid="${esc(g.id)}" data-mid="${esc(m.id)}" aria-label="담당자 수정"><svg class="icn" style="width:12px;height:12px"><use href="#i-edit"></use></svg></button>
              <button class="org-x" data-act="org.delMem" data-tid="${esc(t.id)}" data-gid="${esc(g.id)}" data-mid="${esc(m.id)}" aria-label="담당자 삭제"><svg class="icn"><use href="#i-close"></use></svg></button>
            </div>`).join('')}
          <div class="org-addrow"><button class="btn bo bxs" data-act="org.addMem" data-tid="${esc(t.id)}" data-gid="${esc(g.id)}"><svg class="icn"><use href="#i-plus"></use></svg> 담당자</button></div>
        </div>`).join('')}
      <div class="org-addrow"><input class="inp inp-sm" id="gg-${esc(t.id)}" placeholder="새 공구 이름 (예: 1공구)"><button class="btn bo bsm" data-act="org.addGg" data-tid="${esc(t.id)}">공구 추가</button></div>
    </div>`).join(''):'<div class="tk-empty" style="padding:8px 2px">등록된 팀이 없습니다. 아래에서 팀을 추가하세요.</div>';
}
function orgFind(tid,gid){
  const t=(S.org.teams||[]).find(x=>x.id===tid);
  const g=t&&gid?(t.ggs||[]).find(x=>x.id===gid):null;
  return{t,g};
}
function orgSave(){normOrg(S.org);store.putOrg(S.org);if(!S.live){rOrg();rTasks();}}
function openTextModal(title,label,val,cb){
  openModal(title,`<div class="frow"><label>${esc(label)}</label><input class="inp" id="tmVal" value="${esc(val||'')}" maxlength="40"></div>`,
    `<button class="btn bg2 bsm" data-act="modal.close">취소</button><button class="btn bp bsm" data-act="modal.ok">저장</button>`);
  MODAL_CB={type:'text',ok:()=>{const v=($('#tmVal').value||'').trim();if(!v){toast('내용을 입력하세요');return;}cb(v);closeModal();}};
  setTimeout(()=>{const t=$('#tmVal');if(t){t.focus();t.select();}},50);
}
function openMemModal(title,mem,cb){
  openModal(title,`
    <div class="frow"><label>이름</label><input class="inp" id="mmName" value="${esc(mem.name||'')}" maxlength="20"></div>
    <div class="frow"><label>이메일 (리마인드 수신)</label><input class="inp" id="mmMail" type="email" placeholder="name@hdec.co.kr" value="${esc(mem.email||'')}"></div>`,
    `<button class="btn bg2 bsm" data-act="modal.close">취소</button><button class="btn bp bsm" data-act="modal.ok">저장</button>`);
  MODAL_CB={type:'mem',ok:()=>{const n=($('#mmName').value||'').trim();if(!n){toast('이름을 입력하세요');return;}
    cb(n,($('#mmMail').value||'').trim());closeModal();}};
  setTimeout(()=>{const t=$('#mmName');if(t)t.focus();},50);
}
function rCfg(){
  const i=$('#setDefectUrl');
  if(i&&document.activeElement!==i)i.value=S.cfg.defectUrl||'';
}

/* ═══════════ 화면 전환 · 공통 UI ═══════════ */
const VIEW_TTL={calendar:['업무 일정'],tasks:['주요업무현황'],settings:['설정','']};
function go(view){
  S.view=view;
  $$('.view').forEach(v=>v.classList.toggle('act',v.id==='view-'+view));
  $$('#sidebar .nvi[data-view]').forEach(n=>n.classList.toggle('act',n.dataset.view===view));
  $('#tbt').textContent=VIEW_TTL[view][0];
  $('#tbsu').textContent=VIEW_TTL[view][1];
  $('#btnToday').style.display=view==='calendar'?'':'none';
  if(view==='calendar'&&CAL)setTimeout(()=>CAL.updateSize(),30);
  if(view==='tasks')rTasks();
  if(view==='settings'){rOrg();rCfg();rSync();}
  mobClose();
}
let toastT=null;
function toast(msg){
  const t=$('#toast');t.textContent=msg;t.classList.add('show');
  clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2400);
}
function mobClose(){$('#sidebar').classList.remove('mob-open');$('#scrim').classList.remove('on');}

/* 테마 */
function applyTheme(dark){
  document.documentElement.classList.toggle('dark',dark);
  const u=$('#thIcon');if(u)u.setAttribute('href',dark?'#i-moon':'#i-sun');
  try{localStorage.setItem('calapp.theme',dark?'dark':'light');}catch(e){}
}

/* ═══════════ 액션 위임 ═══════════ */
const ACT={
  'nav.go':el=>go(el.dataset.view),
  'nav.toggle':()=>$('#sidebar').classList.toggle('mini'),
  'nav.mob':()=>{$('#sidebar').classList.add('mob-open');$('#scrim').classList.add('on');},
  'nav.mobClose':mobClose,
  'theme.toggle':()=>applyTheme(!document.documentElement.classList.contains('dark')),
  'link.defect':()=>{
    const u=(S.cfg.defectUrl||'').trim();
    if(!u){toast('설정에서 하자처리 현황 주소를 먼저 입력하세요');go('settings');return;}
    window.open(u,'_blank','noopener');
  },
  'cal.prev':()=>CAL&&CAL.prev(),
  'cal.next':()=>CAL&&CAL.next(),
  'cal.today':()=>{selDate(todayStr());},
  'plan.new':()=>openPlanModal(null),
  'plan.edit':el=>{const p=findPlan(el.dataset.pid);if(p)openPlanModal(p);},
  'plan.done':el=>{const p=findPlan(el.dataset.pid);if(!p)return;p.done=!p.done;p.updatedAt=Date.now();store.putPlan(p);if(!S.live){rDay();refetchCal();}},
  'plan.remind':el=>{const p=findPlan(el.dataset.pid);if(!p)return;p.remind=!p.remind;p.updatedAt=Date.now();store.putPlan(p);if(!S.live)rDay();toast(p.remind?'당일 아침 리마인드 메일이 발송됩니다':'리마인드를 해제했습니다');},
  'plan.save':savePlanFromModal,
  'plan.del':el=>{store.delPlan(el.dataset.ym,el.dataset.pid);closeModal();if(!S.live){rDay();refetchCal();}toast('플랜을 삭제했습니다');},
  'modal.close':closeModal,
  'modal.stop':()=>{},
  'modal.ok':()=>{if(MODAL_CB&&MODAL_CB.ok)MODAL_CB.ok();},
  'tk.tab':el=>{
    const lv=el.dataset.lv;S.tk[lv]=el.dataset.id;
    if(lv==='t'){S.tk.g=null;S.tk.m=null;}
    if(lv==='g')S.tk.m=null;
    rTasks();
  },
  'tk.add':el=>{
    const sid=el.dataset.sid,iid=uid();
    store.putTask(sid,iid,{text:'',st:0,createdAt:Date.now(),updatedAt:Date.now()});
    if(!S.live)rTasks();
    setTimeout(()=>{
      const t=document.querySelector('.tk-item[data-sid="'+sid+'"][data-iid="'+iid+'"] .tk-txt');
      if(t)tkStartEdit(t);
    },S.live?260:30);
  },
  'tk.st':el=>{
    const sid=el.dataset.sid,iid=el.dataset.iid;
    const cur=(S.tasks[sid]||{})[iid];if(!cur)return;
    store.putTask(sid,iid,{...cur,st:((cur.st||0)+1)%4,updatedAt:Date.now()});
    if(!S.live)rTasks();
  },
  'tk.del':el=>{store.putTask(el.dataset.sid,el.dataset.iid,null);if(!S.live)rTasks();},
  'tk.editable':el=>{if(el.isContentEditable)return;tkStartEdit(el);},
  'org.addTeam':()=>{
    const i=$('#orgNewTeam'),v=(i.value||'').trim();
    if(!v){toast('팀 이름을 입력하세요');i.focus();return;}
    S.org.teams=S.org.teams||[];S.org.teams.push({id:uid(),name:v,ggs:[]});i.value='';orgSave();toast('팀을 추가했습니다');
  },
  'org.renTeam':el=>{const{t}=orgFind(el.dataset.tid);if(!t)return;openTextModal('팀 이름 변경','팀 이름',t.name,v=>{t.name=v;orgSave();});},
  'org.delTeam':el=>{
    const{t}=orgFind(el.dataset.tid);if(!t)return;
    confirmModal('팀 삭제','"'+t.name+'" 팀과 소속 공구·담당자를 모두 삭제합니다. 담당자의 주요업무도 화면에서 사라집니다.',()=>{
      S.org.teams=S.org.teams.filter(x=>x.id!==t.id);orgSave();});
  },
  'org.addGg':el=>{
    const{t}=orgFind(el.dataset.tid);if(!t)return;
    const i=$('#gg-'+t.id),v=(i.value||'').trim();
    if(!v){toast('공구 이름을 입력하세요');i.focus();return;}
    t.ggs=t.ggs||[];t.ggs.push({id:uid(),name:v,members:[]});orgSave();
  },
  'org.renGg':el=>{const{g}=orgFind(el.dataset.tid,el.dataset.gid);if(!g)return;openTextModal('공구 이름 변경','공구 이름',g.name,v=>{g.name=v;orgSave();});},
  'org.delGg':el=>{
    const{t,g}=orgFind(el.dataset.tid,el.dataset.gid);if(!t||!g)return;
    confirmModal('공구 삭제','"'+g.name+'" 공구와 소속 담당자를 삭제합니다.',()=>{t.ggs=t.ggs.filter(x=>x.id!==g.id);orgSave();});
  },
  'org.addMem':el=>{
    const{g}=orgFind(el.dataset.tid,el.dataset.gid);if(!g)return;
    openMemModal('담당자 추가',{},(name,email)=>{g.members=g.members||[];g.members.push({id:uid(),name,email});orgSave();});
  },
  'org.editMem':el=>{
    const{g}=orgFind(el.dataset.tid,el.dataset.gid);if(!g)return;
    const m=(g.members||[]).find(x=>x.id===el.dataset.mid);if(!m)return;
    openMemModal('담당자 수정',m,(name,email)=>{m.name=name;m.email=email;orgSave();});
  },
  'org.delMem':el=>{
    const{g}=orgFind(el.dataset.tid,el.dataset.gid);if(!g)return;
    g.members=(g.members||[]).filter(x=>x.id!==el.dataset.mid);orgSave();
  },
  'set.saveUrl':()=>{store.putCfg('defectUrl',($('#setDefectUrl').value||'').trim());if(!S.live)rCfg();toast('저장했습니다');}
};
function confirmModal(title,msg,cb){
  openModal(title,'<div style="font-size:13px;color:var(--lbl2);line-height:1.6">'+esc(msg)+'</div>',
    '<button class="btn bg2 bsm" data-act="modal.close">취소</button><button class="btn btn-danger bsm" data-act="modal.ok">삭제</button>');
  MODAL_CB={type:'confirm',ok:()=>{cb();closeModal();}};
}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');
  if(!el)return;
  const fn=ACT[el.dataset.act];
  if(fn){if(el.dataset.act!=='modal.stop')e.stopPropagation();fn(el);}
});
document.addEventListener('click',e=>{
  const pal=e.target.closest('.pal-c');
  if(pal){$$('#pfPal .pal-c').forEach(x=>x.classList.remove('sel'));pal.classList.add('sel');}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if($('#mo').classList.contains('open'))closeModal();else mobClose();}
  if(e.key==='Enter'&&e.target.classList&&e.target.classList.contains('tk-txt')&&!e.shiftKey){e.preventDefault();e.target.blur();}
  if(e.key==='Enter'&&$('#mo').classList.contains('open')&&e.target.tagName==='INPUT'){
    e.preventDefault();
    if(MODAL_CB&&MODAL_CB.type==='plan')savePlanFromModal();
    else if(MODAL_CB&&MODAL_CB.ok)MODAL_CB.ok();
  }
});

/* ═══════════ 부팅 ═══════════ */
function rAll(){rDay();rTasks();rOrg();rCfg();refetchCal();}
(function boot(){
  let dark=false;
  try{dark=localStorage.getItem('calapp.theme')==='dark';}catch(e){}
  applyTheme(dark);
  LocalStore.init();
  calInit();
  subVisibleMonths();
  rDay();rSync();rAcct();
  fbInit();
})();
