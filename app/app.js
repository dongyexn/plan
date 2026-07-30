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
<li>담당자를 지정하면 담당자별 색으로 표시되고, 권역 칩과 담당자 선택으로 좁혀 볼 수 있습니다.</li>
<li>자주 쓰는 조합은 <b>+ 필터 저장</b>으로 두면 한 번에 불러옵니다(내 계정에만 보임).</li>
<li>종 아이콘을 켜면 그날 아침 팀 전체에 리마인드 메일이 갑니다.</li>
<li>기한이 있는 미완료 업무는 점선 배지로 달력에 함께 표시됩니다.</li>
</ul>
<h4>주요업무 현황</h4>
<p>왼쪽에서 대상을 고르면 오른쪽에 그 업무가 나옵니다. <b>팀 전체 업무</b>(공통업무와 모든 권역·담당자 업무를 한 화면에), <b>공통업무</b>, <b>권역</b>, 개별 <b>담당자</b>를 고를 수 있습니다.</p>
<ul>
<li><b>업무 추가</b>를 누르면 목록 위에 작성창이 열립니다. 제목과 함께 <b>진행경과</b>·<b>처리계획</b>을 나눠 적고, 현장·기한·색·담당자(여러 명)·링크를 지정합니다.</li>
<li>항목을 누르면 스레드처럼 펼쳐집니다. 진행경과·처리계획은 그 자리에서 고치고, 아래 스레드에 코멘트를 남깁니다. 나머지는 오른쪽 위 <b>수정</b>을 누르면 작성창과 같은 폼이 그 자리에 열립니다.</li>
<li>왼쪽의 ⠿ 를 잡고 끌면 순서가 바뀝니다.</li>
<li>코멘트에 <code>@이름</code> 을 쓰면 그 사람에게 알림이 가고, 사이드바 배지로 표시됩니다.</li>
<li>상태 칩을 누르면 예정 → 진행 → 완료 → 보류 순으로 바뀝니다.</li>
<li>기한을 넣으면 D-표기가 붙고 임박·초과가 색으로 구분됩니다.</li>
<li>말풍선으로 진행 상황을 남기고, 달력 아이콘으로 그 업무를 일정에 올릴 수 있습니다.</li>
<li>완료된 지 7일이 지난 항목은 자동으로 접힙니다.</li>
</ul>
<h4>조직 관리 (관리자)</h4>
<p>팀 · 권역 · 현장을 등록하고, 가입한 계정에 팀 · 권역 · 담당 현장과 권한을 지정합니다. 이름은 눌러서 바로 고칩니다.</p>
<h4>권한</h4>
<ul>
<li><b>관리자</b> — 조직 관리와 설정 변경까지 가능</li>
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
const PAL=['#6B7280','#3E71D2','#16A34A','#D97706','#DC2626','#7C5CD6'];
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
function fmtTime(t){if(!t)return'';const[h,m]=t.split(':').map(Number);const ap=h<12?'오전':'오후';const hh=h%12===0?12:h%12;return ap+' '+hh+':'+pad(m);}
function relTime(ts){if(!ts)return'';const d=Date.now()-ts;const m=Math.floor(d/6e4);if(m<1)return'방금';if(m<60)return m+'분 전';const h=Math.floor(m/60);if(h<24)return h+'시간 전';return Math.floor(h/24)+'일 전';}

/* ───── 상태 ───── */
const S={
  view:'calendar',
  selDate:todayStr(),
  plans:{},          // {ym:{id:plan}}
  org:{teams:[],regions:[],sites:[]},  // 팀·권역·현장 목록 (모두 {id,name}, 현장은 team·region 포함)
  people:{},         // calapp/people/{id}: {name,email,team,region} — id는 로그인 uid
  accounts:{},       // users/{uid}: {email,name,role} — 하자처리 현황과 공용
  tasks:{},          // {memberId:{itemId:{text,st,updatedAt}}}
  cfg:{},            // {defectUrl}
  tk:{t:null,r:'*',m:null},   // 주요업무 현황 탭 선택(팀/권역/담당자)
  recur:{},          // calapp/recur/{id} — 반복 일정 원본(월 경계와 무관하게 항상 구독)
  filter:{own:'*',reg:'*'},  // 달력 필터: 담당자 · 권역
  calView:'dayGridMonth',
  foldOpen:{},       // 완료 항목 접힘 해제(subjectId별)
  tkNew:null,        // 인라인 작성창이 열린 대상
  tkEdit:null,       // 인라인 수정 중인 업무 'sid/iid'
  tkOpen:null,       // 펼쳐 놓은 업무 'sid/iid'
  planEdit:null,     // 일자 패널 인라인 편집기 상태
  prefs:{},          // calapp/prefs/{uid} — 저장한 필터 등 개인 설정
  mentions:{},       // calapp/mentions/{uid} — 나를 부른 코멘트
  live:false,        // Firebase 실시간 모드 여부
  role:null,         // editor · viewer (users/{uid})
  acctDenied:false,  // users 노드 읽기 권한 없음
  user:null,
  _subYms:[]
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
function cleanPlan(p){
  const rec=p.recur&&p.recur.f?{f:p.recur.f,until:String(p.recur.until||'')}:{f:'',until:''};
  const o={
    id:String(p.id),date:String(p.date),end:String(p.end||''),
    title:String(p.title||'').slice(0,120),time:String(p.time||''),
    body:String(p.body||'').slice(0,1000),color:String(p.color||'auto'),
    by:String(p.by||''),
    remind:!!p.remind,done:!!p.done,
    owners:(()=>{const o={};planOwners(p).forEach(x=>{if(x)o[x]=1;});return o;})(),
    createdAt:Number(p.createdAt)||Date.now(),updatedAt:Number(p.updatedAt)||Date.now(),
    recur:rec
  };
  if(rec.f){
    if(p.doneOn&&Object.keys(p.doneOn).length)o.doneOn=p.doneOn;
    if(p.skipOn&&Object.keys(p.skipOn).length)o.skipOn=p.skipOn;
  }
  return o;
}
function cleanTask(t){
  const o={text:String(t.text||'').slice(0,500),st:stOf(t.st),
    createdAt:Number(t.createdAt)||Date.now(),updatedAt:Number(t.updatedAt)||Date.now()};
  if(t.body)o.body=String(t.body).slice(0,2000);
  if(t.prog)o.prog=String(t.prog).slice(0,2000);
  if(t.plan)o.plan=String(t.plan).slice(0,2000);
  if(t.site)o.site=String(t.site).slice(0,40);
  if(t.color)o.color=String(t.color).slice(0,16);
  if(t.due)o.due=String(t.due);
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
      o.comments[k]={by:String(c.by||'').slice(0,60),text:String(c.text||'').slice(0,500),at:Number(c.at)||Date.now()};});
  }
  return o;
}
function cleanPerson(p){
  const o={name:String(p.name||'').slice(0,60),email:String(p.email||'').slice(0,200),
    team:String(p.team||''),region:String(p.region||'')};
  if(p.sites&&Object.keys(p.sites).length){o.sites={};Object.keys(p.sites).forEach(k=>{if(p.sites[k])o.sites[k]=1;});}
  return o;
}
function cleanOrg(org){
  const nm=x=>({id:String(x.id),name:String(x.name||'').slice(0,60)});
  return{
    teams:(org.teams||[]).filter(Boolean).map(nm),
    regions:(org.regions||[]).filter(Boolean).map(nm),
    sites:(org.sites||[]).filter(Boolean).map(x=>({...nm(x),team:String(x.team||''),region:String(x.region||'')}))
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
    migrateOrg(this._d);normOrg(this._d.org);
    S.org=this._d.org;S.tasks=this._d.tasks;S.cfg=this._d.cfg;S.people=this._d.people;S.recur=this._d.recur;S.prefs=this._d.prefs;S.accounts={};},
  subPlans(ym){S.plans[ym]=this._d.plans[ym]||{};},
  putPlan(p){
    if(p.recur&&p.recur.f){this._d.recur[p.id]=p;S.recur=this._d.recur;lsSave(this._d);return;}
    const ym=ymOf(p.date);this._d.plans[ym]=this._d.plans[ym]||{};this._d.plans[ym][p.id]=p;S.plans[ym]=this._d.plans[ym];lsSave(this._d);},
  delPlan(ym,id){
    if(this._d.recur[id]){delete this._d.recur[id];S.recur=this._d.recur;lsSave(this._d);return;}
    if(this._d.plans[ym]){delete this._d.plans[ym][id];S.plans[ym]=this._d.plans[ym];lsSave(this._d);}},
  movePlan(p,oldYm){this.delPlan(oldYm,p.id);this.putPlan(p);},
  putOrg(org){this._d.org=org;S.org=org;lsSave(this._d);},
  putPerson(id,p){if(p)this._d.people[id]=p;else delete this._d.people[id];S.people=this._d.people;lsSave(this._d);},
  putTask(mid,iid,item){this._d.tasks[mid]=this._d.tasks[mid]||{};if(item)this._d.tasks[mid][iid]=item;else delete this._d.tasks[mid][iid];S.tasks=this._d.tasks;lsSave(this._d);},
  putCfg(k,v){this._d.cfg[k]=v;S.cfg=this._d.cfg;lsSave(this._d);},
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

const FbStore={
  name:'fb',
  init(){},
  _on(path,cb,onErr){const r=FB.db.ref(path);r.on('value',s=>cb(s.val()),e=>{if(onErr)onErr(e);else console.warn('[FB] read',path,e);});FB._subs.push(r);},
  subPlans(ym){
    if(S._subYms.includes(ym))return;S._subYms.push(ym);
    this._on('calapp/plans/'+ym,v=>{S.plans[ym]=v||{};
      if(shEditing()){PEND.day=true;return;}
      refetchCal();if(ymOf(S.selDate)===ym)rDay();});
  },
  putPlan(p){
    const path=(p.recur&&p.recur.f)?'calapp/recur/'+p.id:'calapp/plans/'+ymOf(p.date)+'/'+p.id;
    FB.db.ref(path).set(cleanPlan(p)).catch(fbErr);},
  delPlan(ym,id){
    const path=S.recur[id]?'calapp/recur/'+id:'calapp/plans/'+ym+'/'+id;
    FB.db.ref(path).remove().catch(fbErr);},
  movePlan(p,oldYm){const u={};u['calapp/plans/'+oldYm+'/'+p.id]=null;u['calapp/plans/'+ymOf(p.date)+'/'+p.id]=cleanPlan(p);FB.db.ref().update(u).catch(fbErr);},
  putOrg(org){FB.db.ref('calapp/org').set(cleanOrg(org)).catch(fbErr);},
  putPerson(id,p){const r=FB.db.ref('calapp/people/'+id);(p?r.set(cleanPerson(p)):r.remove()).catch(fbErr);},
  putTask(mid,iid,item){const r=FB.db.ref('calapp/tasks/'+mid+'/'+iid);(item?r.set(cleanTask(item)):r.remove()).catch(fbErr);},
  putCfg(k,v){FB.db.ref('calapp/cfg/'+k).set(v).catch(fbErr);},
  putPref(k,v){const uid=S.user&&S.user.uid;if(!uid)return;
    const r=FB.db.ref('calapp/prefs/'+uid+'/'+k);(v?r.set(v):r.remove()).catch(fbErr);},
  putMention(uid,id,m){FB.db.ref('calapp/mentions/'+uid+'/'+id)[m?'set':'remove'](m).catch(()=>{});},
  bindShared(){
    this._on('calapp/recur',v=>{S.recur=v||{};
      if(shEditing()){PEND.day=true;return;}
      refetchCal();rDay();rWidget();});
    this._on('calapp/org',v=>{S.org=v||{teams:[],regions:[],sites:[]};normOrg(S.org);
      if(shEditing()){PEND.org=true;PEND.tasks=true;return;}
      rOrg();rTasks();});
    this._on('calapp/tasks',v=>{S.tasks=v||{};
      if(shEditing()){PEND.tasks=true;return;}
      rTasks();});
    this._on('calapp/people',v=>{S.people=v||{};
      if(shEditing()){PEND.org=true;PEND.tasks=true;return;}
      rOrg();rTasks();});
    /* 하자처리 현황과 공용인 users 노드 — 계정 목록을 그대로 가져온다.
       규칙상 읽기가 막히면(관리자 전용 등) 조용히 수동 명부로 대체한다. */
    this._on('users',v=>{S.accounts=v||{};S.acctDenied=false;
      if(shEditing()){PEND.org=true;PEND.tasks=true;return;}
      rOrg();rTasks();rFilter();},
      e=>{S.accounts={};S.acctDenied=true;console.warn('[FB] users 읽기 권한 없음',e);rOrg();rTasks();});
    this._on('calapp/cfg',v=>{S.cfg=v||{};rCfg();});
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
    if(rec.name)next.name=rec.name;
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
function openAcctModal(){
  const u=S.user;if(!u){toast('로그인이 필요합니다');return;}
  const role=S.role||'viewer';
  let last='';try{if(u.metadata&&u.metadata.lastSignInTime)last=new Date(u.metadata.lastSignInTime).toLocaleString('ko-KR');}catch(e){}
  openModal('계정',`
    <div class="acct-head">
      <div class="acct-av"><svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M12 13c-3.9 0-7 2.4-7 5.4 0 .9.5 1.6 1.6 1.6h10.8c1.1 0 1.6-.7 1.6-1.6 0-3-3.1-5.4-7-5.4z"/></svg></div>
      <div style="min-width:0;flex:1">
        <div class="acct-mail">${esc(u.email||'')}</div>
        <span class="acct-rolebadge ${role==='editor'?'r-editor':'r-viewer'}">${esc(roleLabel(role))}</span>
      </div>
    </div>
    <div class="acct-sep"></div>
    <label class="il" for="acctName">이름 (닉네임)</label>
    <div class="acct-row">
      <input class="inp" id="acctName" maxlength="60" value="${esc(acctNick())}" placeholder="표시할 이름" style="flex:1">
      <button class="acct-btn acct-btn-primary" data-act="acct.saveName">저장</button>
    </div>
    <div class="acct-sep"></div>
    <label class="il">비밀번호 변경</label>
    <input class="inp acct-gap" id="acctPwCur" type="password" autocomplete="current-password" placeholder="현재 비밀번호">
    <input class="inp acct-gap" id="acctPwNew" type="password" autocomplete="new-password" placeholder="새 비밀번호 (6자 이상)">
    <input class="inp acct-gap" id="acctPwNew2" type="password" autocomplete="new-password" placeholder="새 비밀번호 확인">
    <button class="acct-btn acct-btn-primary acct-btn-full" data-act="acct.changePw">비밀번호 변경</button>
    ${last?'<div class="acct-last">마지막 로그인 · '+esc(last)+'</div>':''}`,
    '<button class="acct-btn acct-btn-danger" data-act="acct.signout" style="margin-right:auto">로그아웃</button><button class="acct-btn acct-btn-ghost" data-act="modal.close">닫기</button>');
  MODAL_CB={type:'acct'};
}
async function acctSaveName(){
  const inp=$('#acctName');if(!inp)return;
  const name=inp.value.trim().slice(0,60);
  const u=FB.auth&&FB.auth.currentUser;if(!u){toast('로그인이 필요합니다');return;}
  try{await u.updateProfile({displayName:name});}catch(e){toast('이름 저장 실패 · '+(e.message||e));return;}
  /* 부분 쓰기는 규칙에 막히므로 레코드 전체를 다시 쓴다(역할·생성일 유지) */
  const rec=FB.userRec||{};
  try{
    await FB.db.ref('users/'+u.uid).set({
      email:String(u.email||'').toLowerCase(),
      role:rec.role||S.role||'viewer',
      createdAt:rec.createdAt||Date.now(),
      lastSeen:Date.now(),
      name
    });
  }catch(e){console.warn('[FB] name save',e);toast('이름은 이 브라우저에만 반영됩니다');}
  S.user=u;if(FB.userRec)FB.userRec.name=name;
  rAcct();toast('이름이 저장되었습니다');
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
  S.plans={};S._subYms=[];
  FbStore.bindShared();
  subVisibleMonths();
  rAcct();
}
function exitLive(){
  const was=S.live;
  S.live=false;S.user=null;
  FB._subs.forEach(r=>{try{r.off();}catch(e){}});FB._subs=[];
  store=LocalStore;LocalStore.init();
  S.plans={};S._subYms=[];
  subVisibleMonths();rAll();rAcct();
}
function rTeamSel(){
  const el=$('#teamsel');if(!el)return;
  const teams=(S.org.teams||[]).filter(t=>t.name);
  if(!teams.length){el.innerHTML='';el.style.display='none';return;}
  el.style.display='';
  if(!teams.some(t=>t.id===S.tk.t))S.tk.t=teams[0].id;
  const opts=teams.map(t=>'<option value="'+esc(t.id)+'"'+(t.id===S.tk.t?' selected':'')+'>'+esc(t.name)+'</option>').join('');
  el.innerHTML='<div class="tsel-wrap"><select id="teamSelEl" aria-label="팀 선택">'+opts+'</select>'
    +'<span class="tsel-ch"><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 3.5l3 3 3-3"/></svg></span></div>';
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
        <div class="cmt-t">${esc(m.text||'')}</div>
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
}

/* ═══════════ 달력 (FullCalendar) ═══════════ */
let CAL=null;
function calInit(){
  CAL=new FullCalendar.Calendar($('#fcal'),{
    initialView:S.calView,
    initialDate:S.selDate,
    firstDay:0,fixedWeekCount:false,showNonCurrentDates:true,
    headerToolbar:false,height:'100%',dayMaxEvents:false,
    dayHeaderContent:a=>DOW[a.date.getDay()],
    dayCellClassNames:a=>{const o=holOf(dstr(a.date));return o&&o.h?['hol']:[];},
    allDayText:'종일',
    /* FullCalendar 로케일 파일을 따로 싣지 않으므로 시간축은 직접 한글로 그린다 */
    slotLabelContent:a=>{const h=a.date.getHours();return{html:(h<12?'오전':'오후')+' '+((h%12)||12)+'시'};},
    slotDuration:'01:00:00',
    /* 날짜 칸의 공휴일 표기는 월간 뷰 전용 — 주간 뷰의 종일 칸에 끼어들면 숫자가 두 번 찍힌다 */
    dayCellContent:a=>{
      if(a.view&&a.view.type!=='dayGridMonth')return{html:'<span class="dnum">'+a.date.getDate()+'</span>'};
      const ds=dstr(a.date),o=holOf(ds);
      return{html:(o?'<span class="dhol'+(o.h?'':' anv')+'">'+esc(o.n)+'</span>':'')+'<span class="dnum">'+a.date.getDate()+'</span>'};},
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
      const a=info.startStr.slice(0,10),b=addDays(info.endStr.slice(0,10),-1);
      CAL.unselect();
      if(b<=a)return;
      selDate(a);openPlanEdit(null,a,b);},
    /* 주간: 오전 7시 ~ 오후 7시(19~20시 칸까지) 표시. expandRows 로 남는 높이를 행에 균등 분배 —
       빈 여백 없이 모든 행이 같은 높이(최소 34px)가 된다 */
    nowIndicator:true,slotMinTime:'07:00:00',slotMaxTime:'20:00:00',allDaySlot:true,expandRows:true,
    views:{timeGridWeek:{
      dayHeaderContent:a=>{const o=holOf(dstr(a.date));
        return{html:'<div style="font-size:11px;font-weight:700">'+DOW[a.date.getDay()]+'</div>'
          +'<div style="font-size:14px;font-weight:800">'+a.date.getDate()+'</div>'
          +(o?'<div style="font-size:9.5px;font-weight:700;margin-top:1px">'+esc(o.n)+'</div>':'')};},
      dayCellContent:()=>({html:''}),
      dayHeaderFormat:{weekday:'short'}
    }},
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
  while(d<=to&&guard++<400){
    if(until&&d>until)break;
    if(!(p.skipOn&&p.skipOn[d]))out.push(d);
    d=step(d);
  }
  return out;
}
function planEvent(p,date){
  const span=p.end?daysBetween(p.date,p.end):0;
  const done=p.recur&&p.recur.f?!!(p.doneOn&&p.doneOn[date]):!!p.done;
  const own=p.owner?ownName(p.owner):'';
  return{
    id:p.id+'@'+date,
    title:(p.time?fmtTime(p.time)+' ':'')+p.title+(own?' · '+own:''),
    start:date,end:span>0?addDays(date,span+1):undefined,allDay:!p.time||!!p.end,
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
function ownOk(p){
  const owns=planOwners(p);
  if(S.filter.reg!=='*'){
    const ids=roster().filter(x=>x.region===S.filter.reg).map(x=>x.id);
    if(!owns.some(o=>ids.includes(o)))return false;
  }
  const f=S.filter.own;
  if(f==='*')return true;
  return owns.includes(f);
}
function buildEvents(){
  const evs=[],[from,to]=visibleRange();
  Object.keys(S.plans).forEach(ym=>{const m=S.plans[ym]||{};Object.keys(m).forEach(id=>{
    const p=m[id];if(!p||!p.date||!ownOk(p))return;
    evs.push(planEvent(p,p.date));});});
  Object.keys(S.recur||{}).forEach(id=>{const p=S.recur[id];if(!p||!p.date||!ownOk(p))return;
    recurDates(p,from,to).forEach(d=>evs.push(planEvent(p,d)));});
  /* 기한이 있는 미완료 업무 — 읽기 전용으로 늘 함께 얹는다 */
  const today=todayStr();
  Object.keys(S.tasks||{}).forEach(sid=>{
    const items=S.tasks[sid]||{};
    Object.keys(items).forEach(iid=>{
      const it=items[iid];
      if(!it||!it.due||stOf(it.st)===2)return;
      if(it.due<from||it.due>to)return;
      const who=subjectName(sid);
      const col=(it.color&&it.color!=='auto')?it.color:'';
      const over=it.due<today;
      evs.push({id:'task:'+sid+':'+iid,title:'⏳ '+it.text.slice(0,28)+(who?' · '+who:''),
        start:it.due,allDay:true,display:'block',editable:false,
        backgroundColor:'transparent',
        ...(col&&!over?{borderColor:col,textColor:col}:{}),   /* 기한 초과는 항상 빨강 */
        classNames:over?['duev','over']:['duev'],
        extendedProps:{task:{sid,iid}}});
    });
  });
  return evs;
}
function subjectName(sid){
  const t=(S.org.teams||[]).find(x=>x.id===sid);if(t)return t.name;
  const p=roster().find(x=>x.id===sid);return p?p.name:'';
}
function refetchCal(){if(CAL)CAL.refetchEvents();}
function findPlan(id){if(S.recur&&S.recur[id])return S.recur[id];for(const ym in S.plans){if(S.plans[ym]&&S.plans[ym][id])return S.plans[ym][id];}return null;}
function subVisibleMonths(){
  if(!CAL)return;
  const c=CAL.view.currentStart;
  [-1,0,1].forEach(k=>{const d=new Date(c.getFullYear(),c.getMonth()+k,1);store.subPlans(d.getFullYear()+'-'+pad(d.getMonth()+1));});
  if(!S.live)refetchCal();
}
function rMonTitle(){
  if(!CAL)return;const c=CAL.view.currentStart;
  if(S.calView==='timeGridWeek'){
    const e=new Date(CAL.view.activeEnd);e.setDate(e.getDate()-1);
    $('#calMonTxt').textContent=(c.getMonth()+1)+'월 '+c.getDate()+'일 – '+(e.getMonth()+1)+'월 '+e.getDate()+'일';
  }else{
    $('#calMonTxt').textContent=(c.getMonth()+1)+'월';
  }
  $('#calYearTxt').textContent=c.getFullYear();
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
  /* 편집기가 열려 있으면 입력을 지우지 않는다 — 새 업무 작성 중엔 시작일만 따라간다 */
  if(S.planEdit&&$('#dpEdit')){
    rDayHead();
    if(!S.planEdit.orig){const i=$('#peDate');if(i)i.value=ds;}
    return;
  }
  rDay();
}

/* ───── 우측 일자 패널 ───── */
function dayPlans(ds){
  const out=[];
  const m=S.plans[ymOf(ds)]||{};
  Object.values(m).forEach(p=>{
    if(!p||!ownOk(p))return;
    const last=p.end||p.date;
    if(ds>=p.date&&ds<=last)out.push({p,occ:p.date});
  });
  /* 기간 일정이 이전 달에서 시작한 경우도 포함 */
  const prev=S.plans[ymOf(addDays(ds,-31))]||{};
  Object.values(prev).forEach(p=>{if(!p||!p.end||!ownOk(p))return;
    if(ds>=p.date&&ds<=p.end&&!out.some(x=>x.p.id===p.id))out.push({p,occ:p.date});});
  Object.values(S.recur||{}).forEach(p=>{
    if(!p||!ownOk(p))return;
    if(recurDates(p,ds,ds).length)out.push({p,occ:ds});
  });
  return out.sort((a,b)=>((a.p.time||'99')<(b.p.time||'99')?-1:(a.p.time||'99')>(b.p.time||'99')?1:(a.p.createdAt||0)-(b.p.createdAt||0)));
}
function isDone(p,occ){return (p.recur&&p.recur.f)?!!(p.doneOn&&p.doneOn[occ]):!!p.done;}
function rDayHead(){
  const ds=S.selDate,d=toDate(ds),ps=dayPlans(ds),ho=holOf(ds);
  $('#dpDow').textContent=d.getFullYear()+'년 · '+DOW[d.getDay()]+'요일'+(ho?' · '+ho.n:'')+(ds===todayStr()?' · 오늘':'');
  $('#dpDate').textContent=(d.getMonth()+1)+'월 '+d.getDate()+'일';
  $('#dpCnt').textContent=ps.length?'업무 '+ps.length+'건'+(ps.filter(x=>x.p.remind).length?' · 리마인드 '+ps.filter(x=>x.p.remind).length+'건':''):'등록된 업무 없음';
  return ps;
}
function rDay(){
  const ps=rDayHead();
  const box=$('#dpList');
  const add=$('.dp-add');if(add)add.style.display=S.planEdit?'none':'';
  const editorHTML=S.planEdit?planFormHTML():'';
  const editingId=S.planEdit&&S.planEdit.orig?S.planEdit.orig.id:null;
  const shown=ps.filter(x=>x.p.id!==editingId);   /* 편집 중인 항목은 폼이 대신한다 */
  if(!shown.length&&!editorHTML){box.innerHTML='<div class="dp-empty">이 날짜에 등록된 업무가 없습니다.</div>';return;}
  box.innerHTML=editorHTML+shown.map(({p,occ})=>{
    const done=isDone(p,occ),rep=p.recur&&p.recur.f,span=p.end&&p.end!==p.date;
    return `
    <div class="plan${done?' done':''}" data-pid="${esc(p.id)}">
      <div class="pc" style="background:${esc(planColor(p))}"></div>
      <div class="plan-main" data-act="plan.edit" data-pid="${esc(p.id)}" data-occ="${esc(occ)}">
        <div class="plan-t">${esc(p.title)}</div>
        ${p.body?'<div class="plan-body">'+esc(p.body)+'</div>':''}
        <div class="plan-meta">
          ${p.time?'<span class="pm-chip">'+esc(fmtTime(p.time))+'</span>':''}
          ${span?'<span class="pm-chip">'+(toDate(p.date).getMonth()+1)+'/'+toDate(p.date).getDate()+'–'+(toDate(p.end).getMonth()+1)+'/'+toDate(p.end).getDate()+'</span>':''}
          ${rep?'<span class="pm-chip rep">'+esc(REC_LBL[p.recur.f])+'</span>':''}
          ${planOwners(p).map(o=>'<span class="pm-chip own"><span class="dot-c" style="background:'+esc(ownColor(o))+'"></span>'+esc(ownName(o))+'</span>').join('')}
          ${p.remind?'<span class="pm-chip remind"><svg class="icn"><use href="#i-bell"></use></svg>리마인드</span>':''}
        </div>
      </div>
      <div class="plan-side">
        <button class="p-ico${done?' on':''}" data-act="plan.done" data-pid="${esc(p.id)}" data-occ="${esc(occ)}" aria-label="완료 표시" style="${done?'color:var(--gn)':''}"><svg class="icn"><use href="#i-check"></use></svg></button>
        <button class="p-ico${p.remind?' on':''}" data-act="plan.remind" data-pid="${esc(p.id)}" aria-label="리마인드 전환"><svg class="icn"><use href="#i-bell"></use></svg></button>
      </div>
    </div>`;}).join('');
  const rec=$('#peRec');
  if(rec)rec.addEventListener('change',()=>{const r=$('#peUntilRow');if(r)r.style.display=rec.value?'':'none';});
}

/* ───── 업무 작성·수정 모달 ───── */
let MODAL_CB=null;
function openModal(title,bodyHTML,footHTML){
  $('#mt').textContent=title;$('#mbody').innerHTML=bodyHTML;$('#mf').innerHTML=footHTML||'';
  /* 하단 버튼이 없는 모달(사용 안내 등)은 우상단 X 로 닫는다 — 참조 앱과 동일 */
  $('#mb').classList.toggle('has-x',!footHTML);
  $('#mo').classList.add('open');
}
function closeModal(){$('#mo').classList.remove('open');MODAL_CB=null;}
/* 인라인 편집기 — 모달 대신 우측 일자 패널 안에서 작성·수정한다 */
function openPlanEdit(p,startD,endD,occ){
  S.planEdit={orig:p?{...p}:null,occ:occ||'',start:startD||S.selDate,end:endD||''};
  rDay();
  setTimeout(()=>{const t=$('#peTitle');if(t)t.focus();},30);
}
function closePlanEdit(){if(!S.planEdit)return;S.planEdit=null;rDay();}
function planFormHTML(){
  const pe=S.planEdit;if(!pe)return'';
  const d=pe.orig||{id:uid(),date:pe.start,end:pe.end,title:'',time:'',body:'',color:'auto',
    remind:false,done:false,recur:{f:'',until:''},createdAt:Date.now()};
  pe.draft=d;
  const rc=(d.recur&&d.recur.f)||'';
  const people=roster();
  return `<div class="dp-edit" id="dpEdit">
    <div class="frow"><label>제목</label><input class="inp inp-sm" id="peTitle" maxlength="80" placeholder="무엇을 하나요?" value="${esc(d.title)}"></div>
    <div class="frow2">
      <div class="frow"><label>시작일</label><input type="date" class="inp inp-sm" id="peDate" value="${esc(d.date)}"></div>
      <div class="frow"><label>종료일 <span style="font-weight:500;color:var(--lbl3)">여러 날이면</span></label><input type="date" class="inp inp-sm" id="peEnd" value="${esc(d.end||'')}"></div>
    </div>
    <div class="frow2">
      <div class="frow"><label>시간 (선택)</label><input type="time" class="inp inp-sm" id="peTime" value="${esc(d.time||'')}"></div>
      <div class="frow"><label>반복</label><select class="inp inp-sm" id="peRec">${Object.keys(REC_LBL).map(k=>'<option value="'+k+'"'+(k===rc?' selected':'')+'>'+REC_LBL[k]+'</option>').join('')}</select></div>
    </div>
    <div class="frow" id="peUntilRow" style="${rc?'':'display:none'}"><label>반복 종료 (선택)</label><input type="date" class="inp inp-sm" id="peUntil" value="${esc((d.recur&&d.recur.until)||'')}"></div>
    <div class="frow"><label>담당자 <span style="font-weight:500;color:var(--lbl3)">여러 명 선택 가능</span></label>
      <div class="chipbar" id="peOwners">${people.map(x=>'<span class="chip2'+(planOwners(d).includes(x.id)?' act':'')+'" data-own="'+esc(x.id)+'">'+esc(x.name)+'</span>').join('')||'<span class="site-none">담당자가 없습니다</span>'}</div>
    </div>
    <div class="frow"><label>색 <span style="font-weight:500;color:var(--lbl3)">첫 번째는 담당자 색</span></label>
      <div class="pal" id="pePal">
        <div class="pal-c${(!d.color||d.color==='auto')?' sel':''}" data-c="auto" style="background:linear-gradient(135deg,#3E71D2,#16A34A,#D97706)" title="담당자 색"></div>
        ${PAL.map(c=>'<div class="pal-c'+(c===d.color?' sel':'')+'" data-c="'+c+'" style="background:'+c+'"></div>').join('')}
      </div></div>
    <div class="frow"><label>내용 (선택)</label><textarea class="inp inp-sm" id="peBody" maxlength="500" placeholder="메모·세부 내용">${esc(d.body||'')}</textarea></div>
    <label class="chk-row" style="margin-bottom:10px"><input type="checkbox" id="peRemind"${d.remind?' checked':''}> 당일 아침 리마인드 메일</label>
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
  let end=($('#peEnd').value||'').trim();
  if(end&&end<date){toast('종료일이 시작일보다 빠릅니다');return;}
  if(end===date)end='';
  const f=$('#peRec').value||'';
  const sel=$('#pePal .pal-c.sel');
  const p={...pe.draft,
    date,end,title,
    time:$('#peTime').value||'',
    owners:(()=>{const o={};$$('#peOwners .chip2.act').forEach(c=>{o[c.dataset.own]=1;});return o;})(),owner:'',
    body:($('#peBody').value||'').trim(),
    color:sel?sel.dataset.c:'auto',
    recur:f?{f,until:($('#peUntil').value||'')}:{f:'',until:''},
    remind:$('#peRemind').checked,
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
    return[{id:'me',name:'나',email:'',team:'',region:'',sites:{},role:'editor',acct:false,local:true}];
  const out={};
  Object.keys(S.accounts||{}).forEach(uid=>{
    const a=S.accounts[uid]||{};
    if(a.role==='blocked')return;
    out[uid]={id:uid,name:a.name||String(a.email||'').split('@')[0]||'이름없음',email:a.email||'',team:'',region:'',role:a.role||'viewer',acct:true};
  });
  Object.keys(S.people||{}).forEach(id=>{
    const p=S.people[id]||{},prev=out[id];
    out[id]={id,
      name:(prev&&prev.acct&&prev.name)||p.name||'이름없음',
      email:(prev&&prev.email)||p.email||'',
      team:p.team||'',region:p.region||'',sites:p.sites||{},
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
  /* 선택값: teamall(팀 전체) · team(공통업무) · reg:<권역id>(권역) · 담당자 id */
  const m=S.tk.m;
  const regOk=rid=>rid===''?mems.some(p=>!p.region||!regions.some(r=>r.id===p.region)):regions.some(r=>r.id===rid);
  const valid=m==='teamall'||m==='team'
    ||(typeof m==='string'&&m.indexOf('reg:')===0&&regOk(m.slice(4)))
    ||mems.some(p=>p.id===m);
  if(!valid)S.tk.m='teamall';
  return{teams,team,regions,mems,total:all.length};
}
function taskCount(sid){
  const m=S.tasks[sid]||{};
  return Object.keys(m).filter(k=>stOf(m[k].st)!==2).length;
}
function dueInfo(due){
  if(!due)return{cls:'none',txt:'기한'};
  const n=daysBetween(todayStr(),due);
  if(n<0)return{cls:'over',txt:'D+'+(-n)};
  if(n===0)return{cls:'over',txt:'D-DAY'};
  if(n<=3)return{cls:'soon',txt:'D-'+n};
  return{cls:'',txt:'D-'+n};
}
function siteName(id){const s=(S.org.sites||[]).find(x=>x.id===id);return s?s.name:'';}
function taskItemHTML(sid,iid,it,withSubject){
  const key=sid+'/'+iid;
  if(S.tkEdit===key)return taskFormHTML(sid,iid,it);   /* 수정 중이면 항목 자리에 폼이 들어간다 */
  const di=dueInfo(it.due),cn=Object.keys(it.comments||{}).length,st=stOf(it.st);
  const asg=Object.keys(it.assignees||{}).map(id=>roster().find(p=>p.id===id)).filter(Boolean);
  const lnk=Object.entries(it.links||{});
  const sn=siteName(it.site);
  const open=S.tkOpen===key;
  const col=(it.color&&it.color!=='auto')?it.color:'';
  return `
  <div class="tk-item s${st}${open?' open':''}" draggable="true" data-sid="${esc(sid)}" data-iid="${esc(iid)}">
    ${col?'<span class="tkc" style="background:'+esc(col)+'"></span>':''}
    <div class="tk-line">
      <span class="tk-grip" aria-hidden="true">⠿</span>
      <span class="tk-st s${st}" data-act="tk.st" data-sid="${esc(sid)}" data-iid="${esc(iid)}">${ST_LBL[st]}</span>
      <div class="tk-body" data-act="tk.open" data-sid="${esc(sid)}" data-iid="${esc(iid)}">
        <div class="tk-ttl">${esc(it.text||'제목 없음')}</div>
        ${(sn||asg.length||lnk.length||withSubject)?`<div class="tk-meta">
          ${withSubject?'<span class="asg">'+esc(subjName(sid))+'</span>':''}
          ${sn?'<span class="site-on">'+esc(sn)+'</span>':''}
          ${asg.map(p=>'<span class="asg"><span class="dot-c" style="background:'+esc(ownColor(p.id))+'"></span>'+esc(p.name)+'</span>').join('')}
          ${lnk.map(([k,l])=>'<a class="lnk" href="'+esc(l.url)+'" target="_blank" rel="noopener">'+esc(l.label||l.url.replace(/^https?:\/\//,'').slice(0,26))+'</a>').join('')}
        </div>`:''}
      </div>
      <span class="due-chip ${di.cls}" data-act="tk.due" data-sid="${esc(sid)}" data-iid="${esc(iid)}" title="기한">${esc(di.txt)}</span>
      <button class="tk-ico${cn?' on':''}" data-act="tk.open" data-sid="${esc(sid)}" data-iid="${esc(iid)}" aria-label="코멘트">
        <svg class="icn"><use href="#i-cmt"></use></svg>${cn?'<span class="cn">'+cn+'</span>':''}</button>
      <button class="tk-ico" data-act="tk.toPlan" data-sid="${esc(sid)}" data-iid="${esc(iid)}" aria-label="일정으로"><svg class="icn"><use href="#i-cal"></use></svg></button>
      ${open?'<button class="btn bg2 bxs tk-editbtn" data-act="tk.edit" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'">수정</button>':''}
      <button class="tk-del" data-act="tk.del" data-sid="${esc(sid)}" data-iid="${esc(iid)}" aria-label="삭제"><svg class="icn"><use href="#i-close"></use></svg></button>
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
  return `<div class="tk-detail">
    <div class="tk-secs">${box('진행경과',it.prog||it.body,'prog')}${box('처리계획',it.plan,'plan')}</div>
    <div class="tk-thread">
      ${cs.map(([cid,c])=>`<div class="th-i">
          <div class="th-av">${esc((c.by||'?').slice(0,1))}</div>
          <div class="th-b"><div class="th-h"><b>${esc(c.by||'')}</b><span>${esc(relTime(c.at))}</span></div>
            <div class="th-t">${esc(c.text)}</div></div>
        </div>`).join('')}
      <div class="th-new">
        <div class="th-av me">${esc(((S.user&&acctNick())||'나').slice(0,1))}</div>
        <div class="th-b">
          <textarea class="th-in" data-sid="${esc(sid)}" data-iid="${esc(iid)}" rows="1" placeholder="진행 상황을 남기세요 · @이름으로 부르기"></textarea>
          <div class="th-f"><button class="btn bp bxs" data-act="tk.cmtSend" data-sid="${esc(sid)}" data-iid="${esc(iid)}">남기기</button></div>
        </div>
      </div>
    </div>
  </div>`;
}
function taskListHTML(sid){
  const items=S.tasks[sid]||{};
  const ord=k=>Number.isFinite(Number(items[k].order))?Number(items[k].order):(items[k].createdAt||0)/1e10;
  const all=Object.keys(items).sort((a,b)=>ord(a)-ord(b)||(items[a].createdAt||0)-(items[b].createdAt||0));
  if(!all.length)return '<div class="tk-empty">등록된 업무가 없습니다. 위의 <b>업무 추가</b>를 누르세요.</div>';
  const cut=Date.now()-7*86400000;
  const old=all.filter(iid=>stOf(items[iid].st)===2&&(items[iid].updatedAt||0)<cut);
  const open=S.foldOpen[sid];
  const shown=open?all:all.filter(iid=>!old.includes(iid));
  return shown.map(iid=>taskItemHTML(sid,iid,items[iid],false)).join('')
    +(old.length?`<div class="tk-fold" data-act="tk.fold" data-sid="${esc(sid)}">${open?'▲ 지난 완료 '+old.length+'건 접기':'▼ 지난 완료 '+old.length+'건 보기'}</div>`:'');
}
/* ── 집계 보기 보조 — 미완료만, 기한순 ── */
function openItems(sid){
  const m=S.tasks[sid]||{};
  return Object.keys(m).filter(iid=>m[iid]&&stOf(m[iid].st)!==2)
    .sort((a,b)=>{const ad=m[a].due||'9999',bd=m[b].due||'9999';
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
  let any=false;
  const html=list.map(p=>{
    const items=openItems(p.id);
    if(!items.length)return '';
    any=true;
    return '<div class="tk-sub2">'+esc(p.name)+'</div>'
      +items.map(({iid,it})=>taskItemHTML(p.id,iid,it,false)).join('');
  }).join('');
  return any?html:'<div class="tk-empty">미완료 업무가 없습니다.</div>';
}
/* 권역별 섹션 — 팀 전체 보기에서 권역 단위로 레이아웃을 나눈다 */
function regionSectionsHTML(mems,regions){
  const groups=[];
  regions.forEach(r=>{const list=mems.filter(p=>p.region===r.id);if(list.length)groups.push([r.name,list]);});
  const none=regionMembers(mems,regions,'');
  if(none.length)groups.push(['권역 미지정',none]);
  if(!groups.length)return '<div class="tk-empty">배정된 담당자가 없습니다.</div>';
  return groups.map(([rn,list])=>{
    const cnt=list.reduce((a,p)=>a+taskCount(p.id),0);
    const inner=list.map(p=>{
      const items=openItems(p.id);
      if(!items.length)return '';
      return '<div class="tk-sub2">'+esc(p.name)+'</div>'
        +items.map(({iid,it})=>taskItemHTML(p.id,iid,it,false)).join('');
    }).join('')||'<div class="tk-empty" style="padding:8px 2px;text-align:left">미완료 업무가 없습니다.</div>';
    return '<div class="tk-sub">'+esc(rn)+'<span class="c">'+cnt+'</span></div>'+inner;
  }).join('');
}
/* 작성·수정 공용 폼 — 작성창과 수정 폼이 같은 골격을 쓴다(일관성) */
function taskFormHTML(sid,iid,cur){
  const d=cur||{text:'',prog:'',plan:'',site:'',due:'',assignees:{},links:{},color:''};
  const people=tkSel().mems;
  const sites=(S.org.sites||[]).filter(x=>x.name);
  const col=(d.color&&d.color!=='auto')?d.color:'';
  return `<div class="tk-new" id="tkNew">
    <input class="inp tk-new-t" id="tnTitle" maxlength="120" placeholder="업무 제목" value="${esc(d.text||'')}">
    <div class="tk-new-g">
      <div class="tk-sec"><div class="tk-sec-h">진행경과</div>
        <textarea class="inp tk-new-a" id="tnProg" maxlength="2000" placeholder="지금까지의 경과">${esc(d.prog||d.body||'')}</textarea></div>
      <div class="tk-sec"><div class="tk-sec-h">처리계획</div>
        <textarea class="inp tk-new-a" id="tnPlan" maxlength="2000" placeholder="앞으로의 계획">${esc(d.plan||'')}</textarea></div>
    </div>
    <div class="tk-new-r" style="margin-bottom:9px">
      <select class="inp inp-sm" id="tnSite"><option value="">현장 —</option>${sites.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===d.site?' selected':'')+'>'+esc(x.name)+'</option>').join('')}</select>
      <input type="date" class="inp inp-sm" id="tnDue" aria-label="기한" value="${esc(d.due||'')}">
      <div class="pal" id="tnPal" title="색">
        <div class="pal-c${col?'':' sel'}" data-c="" style="background:var(--fill2)" title="색 없음"></div>
        ${PAL.map(c=>'<div class="pal-c'+(c===col?' sel':'')+'" data-c="'+c+'" style="background:'+c+'"></div>').join('')}
      </div>
    </div>
    <div class="tk-new-r" style="margin-bottom:9px">
      <div class="chipbar" id="tnAsg">${people.map(p=>'<span class="chip2'+((d.assignees||{})[p.id]?' act':'')+'" data-asg="'+esc(p.id)+'">'+esc(p.name)+'</span>').join('')||'<span class="site-none">담당자가 없습니다</span>'}</div>
    </div>
    <div class="frow" style="margin-bottom:9px"><label>링크 (선택)</label>
      <div id="tnLinks">${Object.entries(d.links||{}).map(([k,l])=>linkRowHTML(k,l)).join('')}</div>
      <button class="btn bo bxs" data-act="tk.linkAdd" style="align-self:flex-start;margin-top:4px"><svg class="icn"><use href="#i-plus"></use></svg> 링크 추가</button>
    </div>
    <div class="tk-new-r">
      ${iid?'<button class="btn btn-danger bsm" data-act="tk.del" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'" style="margin-right:auto">삭제</button>':''}
      <div class="tk-new-btns">
        <button class="btn bg2 bsm" data-act="tk.formCancel">취소</button>
        <button class="btn bp bsm" data-act="tk.formSave" data-sid="${esc(sid)}" data-iid="${esc(iid||'')}">${iid?'저장':'등록'}</button>
      </div>
    </div>
  </div>`;
}
function taskFormSave(sid,iid){
  const t=($('#tnTitle').value||'').trim();
  if(!t){toast('제목을 입력하세요');$('#tnTitle').focus();return;}
  const cur=iid?((S.tasks[sid]||{})[iid]||null):null;
  const id=iid||uid();
  const asg={};$$('#tnAsg .chip2.act').forEach(c=>{asg[c.dataset.asg]=1;});
  const links={};
  $$('#tnLinks .lnk-row').forEach(r=>{
    const u=(r.querySelector('.lnk-url').value||'').trim();
    if(!u)return;
    links[r.dataset.lid]={url:/^https?:\/\//i.test(u)?u:'https://'+u,label:(r.querySelector('.lnk-lbl').value||'').trim()};
  });
  const cSel=$('#tnPal .pal-c.sel');
  store.putTask(sid,id,{...(cur||{st:0,createdAt:Date.now()}),
    text:t,prog:($('#tnProg').value||'').trim(),plan:($('#tnPlan').value||'').trim(),
    site:$('#tnSite').value||'',due:$('#tnDue').value||'',
    assignees:asg,links,color:cSel?(cSel.dataset.c||''):'',
    order:(cur&&Number.isFinite(Number(cur.order)))?Number(cur.order):nextOrder(sid),
    updatedAt:Date.now()});
  S.tkNew=null;S.tkEdit=null;S.tkOpen=sid+'/'+id;
  if(!S.live)rTasks();else setTimeout(rTasks,220);
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
function rTasks(){
  const root=$('#tkRoot');
  const{teams,team,regions,mems,total}=tkSel();
  if(!teams.length&&!total){
    root.innerHTML='<div class="tk-none">아직 등록된 계정·팀이 없습니다.<br>조직 관리에서 팀·권역을 만들고 계정에 배정하세요.<br><button class="btn bp bsm" data-act="nav.go" data-view="org">조직 관리로 이동</button></div>';
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
    listHTML='<div class="tk-sub">공통업무<span class="c">'+cCommon+'</span></div>'
      +(ci.length?ci.map(({iid,it})=>taskItemHTML(team.id,iid,it,false)).join('')
        :'<div class="tk-empty" style="padding:8px 2px;text-align:left">공통업무가 없습니다.</div>')
      +regionSectionsHTML(mems,regions);
  }else if(sel==='team'){
    subject=tn+' 공통업무';sid=team?team.id:null;
    listHTML=sid?taskListHTML(sid):'<div class="tk-empty">조직 관리에서 팀을 먼저 등록하세요.</div>';
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
  const regGroups=[];
  regions.forEach(r=>{const list=mems.filter(p=>p.region===r.id);if(list.length)regGroups.push([r.id,r.name,list]);});
  const none=regionMembers(mems,regions,'');
  if(none.length)regGroups.push(['','권역 미지정',none]);

  root.innerHTML=`<div class="tkwrap">
    <div class="tkside">
      <div class="card tks-card">
        <div class="tks-h">팀</div>
        <div class="tks-item${sel==='teamall'?' act':''}" data-act="tk.pick" data-id="teamall">
          <span class="n">${esc(tn)} 전체 업무</span>
          <span class="c">${cCommon+cMems}</span>
        </div>
        <div class="tks-item${sel==='team'?' act':''}" data-act="tk.pick" data-id="team">
          <span class="n">공통업무</span>
          ${team?'<span class="c">'+cCommon+'</span>':''}
        </div>
      </div>
      <div class="card tks-card">
        <div class="tks-h">담당자 · 권역</div>
        ${regGroups.map(([rid,rn,list])=>`
          <div class="tks-item tks-reg${sel==='reg:'+rid?' act':''}" data-act="tk.pick" data-id="reg:${esc(rid)}">
            <span class="n">${esc(rn)}</span><span class="c">${list.reduce((a,p)=>a+taskCount(p.id),0)}</span></div>
          ${list.map(p=>`<div class="tks-item sub${sel===p.id?' act':''}" data-act="tk.pick" data-id="${esc(p.id)}">
            <span class="n">${esc(p.name)}</span><span class="c">${taskCount(p.id)}</span></div>`).join('')}
        `).join('')||'<div class="tk-empty" style="text-align:left;padding:6px 2px">배정된 담당자가 없습니다.</div>'}
      </div>
    </div>
    <div class="card tkmain">
      <div class="tkm-h"><div class="bar"></div><b>${esc(subject)}</b>
        ${sid?'<button class="btn bo bsm" data-act="tk.newOpen" data-sid="'+esc(sid)+'"><svg class="icn"><use href="#i-plus"></use></svg> 업무 추가</button>':''}
      </div>
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
  const out={tasks:[],plans:[],cmts:[]};
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
  const scan=p=>{if(p&&(hit(p.title)||hit(p.body)))out.plans.push(p);};
  Object.keys(S.plans).forEach(ym=>Object.values(S.plans[ym]||{}).forEach(scan));
  Object.values(S.recur||{}).forEach(scan);
  return out;
}
function subjName(sid){
  const t=(S.org.teams||[]).find(x=>x.id===sid);
  if(t)return t.name+' 공통업무';
  const p=roster().find(x=>x.id===sid);
  return p?p.name:'';
}
function rNq(){
  const box=$('#nqRes'),q=($('#nqQ')&&$('#nqQ').value||'').trim();
  if(!box)return;
  if(!q){box.innerHTML='<div class="nq-empty">업무 제목·내용, 일정, 코멘트에서 찾습니다.</div>';return;}
  const r=nqSearch(q);
  const total=r.tasks.length+r.plans.length+r.cmts.length;
  if(!total){box.innerHTML='<div class="nq-empty">"'+esc(q)+'" 에 해당하는 결과가 없습니다.</div>';return;}
  const item=(icon,tt,sb,attrs)=>`<div class="nq-item" ${attrs}>
    <span class="ic"><svg class="icn"><use href="#${icon}"></use></svg></span>
    <div style="min-width:0"><div class="tt">${tt}</div><div class="sb">${esc(sb)}</div></div></div>`;
  box.innerHTML=
    (r.tasks.length?'<div class="nq-g">업무 '+r.tasks.length+'</div>'+r.tasks.slice(0,20).map(({sid,iid,it})=>
      item('i-tasks',nqMark(it.text,q),subjName(sid)+(it.due?' · 기한 '+it.due:''),
        'data-act="nq.task" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'"')).join(''):'')
    +(r.plans.length?'<div class="nq-g">일정 '+r.plans.length+'</div>'+r.plans.slice(0,20).map(p=>
      item('i-cal',nqMark(p.title,q),p.date+(p.end&&p.end!==p.date?' ~ '+p.end:'')+(p.owner?' · '+ownName(p.owner):''),
        'data-act="nq.plan" data-date="'+esc(p.date)+'" data-pid="'+esc(p.id)+'"')).join(''):'')
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
    const ad=a.it.due||'9999',bd=b.it.due||'9999';
    return ad<bd?-1:ad>bd?1:(a.it.createdAt||0)-(b.it.createdAt||0);});
}
function minePlans(days){
  const me=myId(),from=todayStr(),to=addDays(from,days);
  const out=[];
  const push=(p,d)=>{if(planOwners(p).includes(me))out.push({p,date:d});};
  Object.keys(S.plans).forEach(ym=>Object.values(S.plans[ym]||{}).forEach(p=>{
    if(!p||!p.date)return;
    const last=p.end||p.date;
    if(last<from||p.date>to)return;
    push(p,p.date<from?from:p.date);}));
  Object.values(S.recur||{}).forEach(p=>{if(p)recurDates(p,from,to).forEach(d=>push(p,d));});
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
            <span class="t">${p.time?esc(fmtTime(p.time))+' · ':''}${esc(p.title)}</span>
          </div>`).join(''):'<div class="mine-empty">앞으로 7일 안에 내 담당 일정이 없습니다.</div>'}
      </div>`
    +`<div class="card">
        <div class="mine-h"><div class="bar"></div><b>내 주요업무</b><span class="c">${tasks.length}</span></div>
        ${tasks.length?tasks.map(({sid,iid,it})=>{
          const di=it.due?dueInfo(it.due):null;
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
const ICON_PERSON='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M12 13c-3.9 0-7 2.4-7 5.4 0 .9.5 1.6 1.6 1.6h10.8c1.1 0 1.6-.7 1.6-1.6 0-3-3.1-5.4-7-5.4z"/></svg>';
/* 현장은 권역 그룹 아래에 놓고, 끌어서 다른 권역으로 옮기거나 순서를 바꾼다 */
function siteRows(){
  const sites=S.org.sites||[],regs=(S.org.regions||[]).filter(r=>r.name);
  if(!sites.length&&!regs.length)return '<div class="tm-empty">권역과 현장을 먼저 등록하세요.</div>';
  const group=(rid,label)=>{
    const items=sites.filter(x=>(x.region||'')===rid);
    return `<div class="sg">
      <div class="sgh">${esc(label)}<span class="cnt">${items.length}</span></div>
      <div class="sgl" data-rgn="${esc(rid)}">
        ${items.length?items.map(x=>`
          <div class="sti2" draggable="true" data-site="${esc(x.id)}">
            <span class="std"></span>
            <input class="mg-inp" value="${esc(x.name)}" data-act="org.ren" data-kind="Site" data-id="${esc(x.id)}" placeholder="현장 이름" aria-label="현장 이름">
            <button class="tm-x tm-del" data-act="org.delSite" data-id="${esc(x.id)}" aria-label="삭제">${ICON_TRASH}</button>
          </div>`).join(''):'<div class="sg-empty">여기로 끌어다 놓으세요</div>'}
      </div></div>`;
  };
  return regs.map(r=>group(r.id,r.name)).join('')
    +(sites.some(x=>!x.region||!regs.some(r=>r.id===x.region))?group('','권역 미지정'):'');
}
/* 드래그 배선 — 현장 목록을 다시 그릴 때마다 호출 */
let _dnd=null;
function wireSiteDnD(){
  const root=$('#siteRoot');if(!root)return;
  const clear=()=>root.querySelectorAll('.drop-above,.drop-below,.over').forEach(x=>x.classList.remove('drop-above','drop-below','over'));
  root.querySelectorAll('.sti2[draggable]').forEach(el=>{
    el.addEventListener('dragstart',e=>{
      if(!isEditor()){e.preventDefault();return;}
      _dnd=el.dataset.site;el.classList.add('dragging');
      try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',_dnd);}catch(_){}
    });
    el.addEventListener('dragend',()=>{el.classList.remove('dragging');clear();_dnd=null;});
    el.addEventListener('dragover',e=>{
      if(!_dnd||_dnd===el.dataset.site)return;
      e.preventDefault();
      const r=el.getBoundingClientRect(),after=e.clientY>r.top+r.height/2;
      el.classList.toggle('drop-below',after);el.classList.toggle('drop-above',!after);
    });
    el.addEventListener('dragleave',()=>el.classList.remove('drop-above','drop-below'));
    el.addEventListener('drop',e=>{
      if(!_dnd||_dnd===el.dataset.site)return;
      e.preventDefault();e.stopPropagation();
      const r=el.getBoundingClientRect(),after=e.clientY>r.top+r.height/2;
      moveSite(_dnd,el.closest('.sgl').dataset.rgn,el.dataset.site,after);
    });
  });
  root.querySelectorAll('.sgl').forEach(box=>{
    box.addEventListener('dragover',e=>{if(!_dnd)return;e.preventDefault();box.classList.add('over');});
    box.addEventListener('dragleave',()=>box.classList.remove('over'));
    box.addEventListener('drop',e=>{
      if(!_dnd)return;
      e.preventDefault();box.classList.remove('over');
      moveSite(_dnd,box.dataset.rgn,null,false);
    });
  });
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
  if(sr){sr.innerHTML=siteRows();wireSiteDnD();}
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
  const order={editor:0,viewer:1,blocked:2};
  const sortFn=(a,b)=>{const ra=order[a.role]??1,rb=order[b.role]??1;
    return ra!==rb?ra-rb:String(a.email||'').localeCompare(String(b.email||''));};
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
  const row=p=>{
    const rc='r-'+(p.role||'viewer');
    return `<tr>
      <td><div class="utbl-name"><div class="fbu-av ${rc}">${ICON_PERSON}</div>
        <div style="min-width:0"><div class="utbl-nick">${esc(p.name)}</div><div class="utbl-mail">${esc(p.email||'')}</div></div></div></td>
      <td><select class="mg-inp" data-act="acct.set" data-f="region" data-id="${esc(p.id)}" aria-label="권역">${regOpt(p.region)}</select></td>
      <td>${sitesOf(p)}</td>
      <td class="utbl-r">${roleCtl(p)}</td>
    </tr>`;
  };
  ar.innerHTML='<table class="utbl"><thead><tr><th>이름</th><th style="width:120px">권역</th><th>담당 현장</th><th class="utbl-r">권한</th></tr></thead><tbody>'
    +(mine.length?mine.map(row).join('')
      :'<tr><td colspan="4" style="font-size:12px;color:var(--lbl3);padding:10px">이 팀에 배정된 계정이 없습니다.</td></tr>')
    +'</tbody></table>';
  /* 팀 미배정 계정 — 섞어 두면 헷갈린다는 지적에 따라 별도 카드로 분리 */
  const fc=$('#freeCard'),fr=$('#freeRoot');
  if(fc&&fr){
    fc.style.display=free.length?'':'none';
    fr.innerHTML=free.length
      ?'<table class="utbl"><thead><tr><th>이름</th><th></th><th class="utbl-r">권한</th></tr></thead><tbody>'
        +free.map(p=>`<tr>
          <td><div class="utbl-name"><div class="fbu-av r-${esc(p.role||'viewer')}">${ICON_PERSON}</div>
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
  const set=(id,v,prop)=>{const e=$(id);if(e&&document.activeElement!==e)e[prop||'value']=v;};
  set('#mlDaily',m.dailyOn!==false,'checked');
  set('#mlWeekly',m.weeklyOn!==false,'checked');
  set('#mlDow',String(m.weeklyDow===undefined?1:m.weeklyDow));
  set('#mlScope',m.scope||'all');
  set('#mlPrefix',m.prefix||'');
  set('#mlIntro',m.intro||'');
}
function saveMailCfg(){
  if(!isEditor())return denyEdit();
  const m={
    dailyOn:$('#mlDaily').checked,
    weeklyOn:$('#mlWeekly').checked,
    weeklyDow:Number($('#mlDow').value),
    scope:$('#mlScope').value,
    prefix:($('#mlPrefix').value||'').trim(),
    intro:($('#mlIntro').value||'').trim()
  };
  store.putCfg('mail',m);S.cfg={...S.cfg,mail:m};toast('메일 설정을 저장했습니다');
}

/* ═══════════ 화면 전환 · 공통 UI ═══════════ */
const VIEW_TTL={calendar:'업무 일정',mine:'내 업무',tasks:'주요업무 현황',org:'조직 관리',settings:'설정'};
function go(view){
  S.view=view;
  $$('.view').forEach(v=>v.classList.toggle('act',v.id==='view-'+view));
  $$('#sidebar .nvi[data-view]').forEach(n=>n.classList.toggle('act',n.dataset.view===view));
  $('#tbt').textContent=VIEW_TTL[view];
  if(view==='calendar'&&CAL)setTimeout(()=>CAL.updateSize(),30);
  if(view==='tasks')rTasks();
  if(view==='mine')rMine();
  if(view==='org'){
    const ed=isEditor();
    $$('#view-org .mg-grid').forEach(c=>c.style.display=ed?'':'none');
    const note=$('#orgViewerNote');if(note)note.style.display=ed?'none':'';
    if(ed)rOrg();
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
function mobClose(){$('#sidebar').classList.remove('mob-open');$('#scrim').classList.remove('on');}

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
  'theme.toggle':()=>applyTheme(!document.documentElement.classList.contains('dark')),
  'link.defect':()=>{
    const u=(S.cfg.defectUrl||DEFECT_URL).trim();
    if(!u){toast('설정에서 하자처리 현황 주소를 먼저 입력하세요');go('settings');return;}
    window.open(u,'_blank','noopener');
  },
  'cal.view':el=>{S.calView=el.dataset.v;
    $$('#calSeg button').forEach(b=>b.classList.toggle('act',b.dataset.v===S.calView));
    if(CAL){CAL.changeView(S.calView);rMonTitle();}},
  'cal.reg':el=>{S.filter.reg=el.dataset.r;rFilter();refetchCal();rDay();},
  'cal.prev':()=>CAL&&CAL.prev(),
  'cal.next':()=>CAL&&CAL.next(),
  'cal.today':()=>{selDate(todayStr());},
  'plan.new':()=>openPlanEdit(null),
  'plan.cancel':closePlanEdit,
  'plan.edit':el=>{const p=findPlan(el.dataset.pid);if(p)openPlanEdit(p,null,null,el.dataset.occ||'');},
  'plan.done':el=>{const p=findPlan(el.dataset.pid);if(!p)return;
    const occ=el.dataset.occ||p.date;
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
    store.delPlan(el.dataset.ym,el.dataset.pid);closeModal();S.planEdit=null;rDay();
    if(!S.live){refetchCal();rWidget();}toast('업무를 삭제했습니다');},
  'plan.skipOcc':el=>{const p=findPlan(el.dataset.pid);if(!p)return;
    p.skipOn=p.skipOn||{};p.skipOn[el.dataset.occ]=1;p.updatedAt=Date.now();store.putPlan(p);
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
  'nq.plan':el=>{
    nqOpen(false);go('calendar');selDate(el.dataset.date);
    setTimeout(()=>{const p=findPlan(el.dataset.pid);if(p)openPlanEdit(p,null,null,el.dataset.date);},80);
  },
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
  'acct.saveName':acctSaveName,
  'acct.changePw':acctChangePw,
  'acct.signout':acctSignout,
  'modal.close':closeModal,
  'modal.stop':()=>{},
  'modal.ok':()=>{if(MODAL_CB&&MODAL_CB.ok)MODAL_CB.ok();},
  'tk.newOpen':el=>{S.tkEdit=null;S.tkNew=el.dataset.sid;rTasks();},
  'tk.formCancel':()=>{S.tkNew=null;S.tkEdit=null;rTasks();},
  'tk.formSave':el=>taskFormSave(el.dataset.sid,el.dataset.iid||null),
  'tk.open':el=>{
    const key=el.dataset.sid+'/'+el.dataset.iid;
    S.tkOpen=S.tkOpen===key?null:key;rTasks();
  },
  'tk.field':()=>{},
  'tk.linkAdd':()=>{const box=$('#tnLinks');if(box)box.insertAdjacentHTML('beforeend',linkRowHTML(uid(),null));},
  'tk.linkDel':el=>{const r=el.closest('.lnk-row');if(r)r.remove();},
  'tk.linkOpen':()=>{},
  'tk.edit':el=>{S.tkNew=null;S.tkEdit=el.dataset.sid+'/'+el.dataset.iid;rTasks();
    setTimeout(()=>{const t=$('#tnTitle');if(t)t.focus();},30);},
  'tk.pick':el=>{S.tk.m=el.dataset.id;rTasks();},
  'tk.st':el=>{
    const sid=el.dataset.sid,iid=el.dataset.iid;
    const cur=(S.tasks[sid]||{})[iid];if(!cur)return;
    store.putTask(sid,iid,{...cur,st:(stOf(cur.st)+1)%4,updatedAt:Date.now()});
    if(!S.live)rTasks();
    refetchCal();   /* 완료 처리하면 달력의 기한 표시도 즉시 사라져야 한다 */
  },
  'tk.del':el=>{
    const key=el.dataset.sid+'/'+el.dataset.iid;
    store.putTask(el.dataset.sid,el.dataset.iid,null);closeModal();
    if(S.tkEdit===key)S.tkEdit=null;
    if(S.tkOpen===key)S.tkOpen=null;
    if(!S.live)rTasks();else setTimeout(rTasks,220);
    refetchCal();},
  'tk.fold':el=>{const sid=el.dataset.sid;S.foldOpen[sid]=!S.foldOpen[sid];rTasks();},
  'tk.due':el=>{
    const sid=el.dataset.sid,iid=el.dataset.iid,cur=(S.tasks[sid]||{})[iid];if(!cur)return;
    openModal('기한 설정',`<div class="frow"><label>완료 기한</label><input type="date" class="inp" id="dueVal" value="${esc(cur.due||'')}"></div>`,
      (cur.due?'<button class="btn bg2 bsm" data-act="tk.dueClear" data-sid="'+esc(sid)+'" data-iid="'+esc(iid)+'" style="margin-right:auto">기한 해제</button>':'')
      +'<button class="btn bg2 bsm" data-act="modal.close">취소</button><button class="btn bp bsm" data-act="modal.ok">저장</button>');
    MODAL_CB={type:'due',ok:()=>{
      const v=$('#dueVal').value||'';
      store.putTask(sid,iid,{...cur,due:v,updatedAt:Date.now()});
      closeModal();if(!S.live)rTasks();refetchCal();}};
  },
  'tk.dueClear':el=>{const sid=el.dataset.sid,iid=el.dataset.iid,cur=(S.tasks[sid]||{})[iid];if(!cur)return;
    store.putTask(sid,iid,{...cur,due:'',updatedAt:Date.now()});closeModal();if(!S.live)rTasks();refetchCal();},
  'tk.cmtSend':el=>{
    const sid=el.dataset.sid,iid=el.dataset.iid,cur=(S.tasks[sid]||{})[iid];if(!cur)return;
    const box=document.querySelector('.th-in[data-sid="'+sid+'"][data-iid="'+iid+'"]')||$('#cmtIn');
    const t=((box&&box.value)||'').trim();if(!t){if(box)box.focus();return;}
    const cid=uid(),who=(S.user&&acctNick())||'나';
    store.putTask(sid,iid,{...cur,comments:{...(cur.comments||{}),[cid]:{by:who,text:t,at:Date.now()}},updatedAt:cur.updatedAt||Date.now()});
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
  'tk.toPlan':el=>{
    const sid=el.dataset.sid,iid=el.dataset.iid,cur=(S.tasks[sid]||{})[iid];if(!cur)return;
    const when=cur.due||todayStr();
    go('calendar');selDate(when);
    setTimeout(()=>{
      openPlanEdit(null,when,'');
      const t=$('#peTitle');if(t)t.value=cur.text;
      const c=document.querySelector('#peOwners .chip2[data-own="'+sid+'"]');if(c)c.classList.add('act');
    },60);
  },
  'org.addTeam':()=>{
    if(!isEditor())return denyEdit();
    const id=uid();S.org.teams=(S.org.teams||[]).concat([{id,name:''}]);orgSave();
    setTimeout(()=>{const i=document.querySelector('#teamRoot .mg-inp[data-id="'+id+'"]');if(i)i.focus();},S.live?260:20);
  },
  'org.addReg':()=>{
    if(!isEditor())return denyEdit();
    const id=uid();S.org.regions=(S.org.regions||[]).concat([{id,name:''}]);orgSave();
    setTimeout(()=>{const i=document.querySelector('#regRoot .mg-inp[data-id="'+id+'"]');if(i)i.focus();},S.live?260:20);
  },
  'org.delTeam':el=>{
    if(!isEditor())return denyEdit();
    const t=(S.org.teams||[]).find(x=>x.id===el.dataset.id);if(!t)return;
    confirmModal('팀 삭제','"'+t.name+'" 팀을 삭제합니다. 이 팀의 공통업무도 화면에서 사라지고, 배정된 담당자는 미배정으로 돌아갑니다.',()=>{
      S.org.teams=S.org.teams.filter(x=>x.id!==t.id);
      Object.keys(S.people||{}).forEach(id=>{if(S.people[id].team===t.id)store.putPerson(id,{...S.people[id],team:''});});
      orgSave();});
  },
  'org.delReg':el=>{
    if(!isEditor())return denyEdit();
    const r=(S.org.regions||[]).find(x=>x.id===el.dataset.id);if(!r)return;
    confirmModal('권역 삭제','"'+r.name+'" 권역을 삭제합니다. 배정된 담당자의 권역은 비워집니다.',()=>{
      S.org.regions=S.org.regions.filter(x=>x.id!==r.id);
      Object.keys(S.people||{}).forEach(id=>{if(S.people[id].region===r.id)store.putPerson(id,{...S.people[id],region:''});});
      orgSave();});
  },
  'org.addSite':()=>{
    if(!isEditor())return denyEdit();
    const id=uid();const r0=(S.org.regions||[]).find(x=>x.name);
    S.org.sites=(S.org.sites||[]).concat([{id,name:'',team:'',region:r0?r0.id:''}]);orgSave();
    setTimeout(()=>{const i=document.querySelector('#siteRoot .mg-inp[data-id="'+id+'"]');if(i)i.focus();},S.live?300:30);
  },
  'org.delSite':el=>{
    if(!isEditor())return denyEdit();
    const st=(S.org.sites||[]).find(x=>x.id===el.dataset.id);if(!st)return;
    confirmModal('현장 삭제','"'+(st.name||'이름 없음')+'" 현장을 삭제합니다. 담당자에게 배정된 이 현장도 함께 해제됩니다.',()=>{
      S.org.sites=S.org.sites.filter(x=>x.id!==st.id);
      Object.keys(S.people||{}).forEach(id=>{const p=S.people[id];
        if(p.sites&&p.sites[st.id]){const ns={...p.sites};delete ns[st.id];store.putPerson(id,{...p,sites:ns});}});
      orgSave();});
  },
  'acct.join':el=>{
    if(!isEditor())return denyEdit();
    const t=curTeam();if(!t){toast('팀을 먼저 등록하세요');return;}
    const id=el.dataset.id,base=roster().find(p=>p.id===id)||{},cur=(S.people||{})[id]||{};
    store.putPerson(id,{name:base.name||cur.name||'',email:base.email||cur.email||'',
      team:t.id,region:cur.region||'',sites:cur.sites||{}});
    if(!S.live)rOrg();
  },
  'acct.sitePick':el=>{
    if(!isEditor())return denyEdit();
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
      store.putPerson(id,{name:p.name||'',email:p.email||'',team:cur.team||p.team||'',region:cur.region||p.region||'',sites:sel});
      closeModal();if(!S.live)rOrg();
    }};
  },
  'acct.site':el=>{
    if(!isEditor())return denyEdit();
    const id=el.dataset.id,sid=el.dataset.sid;
    const base=roster().find(p=>p.id===id)||{};
    const cur=(S.people||{})[id]||{};
    const sites={...(cur.sites||base.sites||{})};
    if(sites[sid])delete sites[sid];else sites[sid]=1;
    store.putPerson(id,{name:base.name||cur.name||'',email:base.email||cur.email||'',
      team:cur.team||base.team||'',region:cur.region||base.region||'',sites});
    if(!S.live)rOrg();
  },
  'set.dark':()=>{},
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
        team:String(x.teamId||''),region:String(x.region||'')}))
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
      toast('가져왔습니다 · 조직 관리에서 확인하세요');
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
  'set.saveUrl':()=>{if(!isEditor())return denyEdit();store.putCfg('defectUrl',($('#setDefectUrl').value||'').trim());if(!S.live)rCfg();toast('저장했습니다');}
};
/* 필터 = 권역(세그먼트) + 담당자(선택). 권역을 고르면 담당자 목록도 그 권역으로 좁혀진다. */
function rFilter(){
  const list=roster(),me=S.user?list.find(p=>p.id===(S.user.uid||'')):null;
  const regs=(S.org.regions||[]).filter(r=>r.name);
  const seg=$('#regSeg');
  if(seg){
    if(!regs.length){seg.innerHTML='';seg.style.display='none';}
    else{
      seg.style.display='';
      if(S.filter.reg!=='*'&&!regs.some(r=>r.id===S.filter.reg))S.filter.reg='*';
      seg.innerHTML='<span class="reg'+(S.filter.reg==='*'?' act':'')+'" data-act="cal.reg" data-r="*">전체</span>'
        +regs.map(r=>'<span class="reg'+(S.filter.reg===r.id?' act':'')+'" data-act="cal.reg" data-r="'+esc(r.id)+'">'+esc(r.name)+'</span>').join('');
    }
  }
  const sel=$('#ownFilter');if(!sel)return;
  const inReg=S.filter.reg==='*'?list:list.filter(p=>p.region===S.filter.reg);
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
document.addEventListener('click',e=>{
  const chip=e.target.closest('#tnAsg .chip2, #peOwners .chip2');
  if(chip){chip.classList.toggle('act');return;}
  const pal=e.target.closest('.pal-c');
  if(pal){const box=pal.closest('.pal');
    if(box){box.querySelectorAll('.pal-c').forEach(x=>x.classList.remove('sel'));pal.classList.add('sel');}}
});
document.addEventListener('change',e=>{
  if(e.target.id==='teamSelEl'){ACT['team.switch'](e.target);return;}
  const rl=e.target.closest('[data-act="acct.role"]');
  if(rl){ACT['acct.role'](rl);return;}
  if(e.target.id==='ownFilter'){S.filter.own=e.target.value;refetchCal();rDay();rWidget();return;}
  const ren=e.target.closest('[data-act="org.ren"]');
  if(ren){
    if(!isEditor()){denyEdit();rOrg();return;}
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
    store.putCfg('defectUrl',(e.target.value||'').trim());
    toast('저장했습니다');return;
  }
  const el=e.target.closest('[data-act="acct.set"]');
  if(!el)return;
  if(!isEditor()){denyEdit();rOrg();return;}
  const id=el.dataset.id,f=el.dataset.f;
  const cur=(S.people||{})[id]||{};
  const base=roster().find(p=>p.id===id)||{};
  store.putPerson(id,{
    name:base.name||cur.name||'',
    email:base.email||cur.email||'',
    team:f==='team'?el.value:(cur.team||''),
    region:f==='region'?el.value:(cur.region||'')});
  if(!S.live){rOrg();rTasks();}
});
document.addEventListener('input',e=>{if(e.target.id==='nqQ')rNq();});
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&(e.target.id==='fbEmail'||e.target.id==='fbPw')){e.preventDefault();fbDoLogin();return;}
  /* Ctrl/⌘+K 로 찾기 */
  if((e.ctrlKey||e.metaKey)&&(e.key==='k'||e.key==='K')){e.preventDefault();nqOpen(true);rNq();return;}
  if(e.key==='Escape'&&$('#nqPanel')&&$('#nqPanel').classList.contains('on')&&!$('#mo').classList.contains('open')){nqOpen(false);return;}
  if(e.key==='Escape'){
    if($('#mo').classList.contains('open')){closeModal();return;}
    if(S.tkNew||S.tkEdit){S.tkNew=null;S.tkEdit=null;rTasks();return;}
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
function bindCalResize(){
  const sb=$('#sidebar');
  if(sb)sb.addEventListener('transitionend',e=>{
    if((e.propertyName==='width'||e.propertyName==='min-width')&&CAL)CAL.updateSize();
  });
  let rt=null;
  window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(CAL)CAL.updateSize();},120);});
}

/* ═══════════ 위젯 모드 (?w=1) — 데스크톱 PWA 창용 컴팩트 화면 ═══════════ */
const WIDGET=/[?&]w=1\b/.test(location.search);
function rWidget(){
  if(!WIDGET)return;
  const ds=S.selDate,ps=dayPlans(ds),d=toDate(ds),ho=holOf(ds);
  $('#widPanel').innerHTML='<div class="wid-h">'+(d.getMonth()+1)+'월 '+d.getDate()+'일 · '+DOW[d.getDay()]+(ho?' · '+esc(ho.n):'')+(ds===todayStr()?' · 오늘':'')+'</div>'
    +(ps.length?ps.map(({p,occ})=>`<div class="plan${isDone(p,occ)?' done':''}">
        <div class="pc" style="background:${esc(planColor(p))}"></div>
        <div class="plan-main"><div class="plan-t">${esc(p.title)}</div>
        ${p.time?'<div class="plan-meta"><span class="pm-chip">'+esc(fmtTime(p.time))+'</span></div>':''}</div></div>`).join('')
      :'<div class="dp-empty" style="padding:10px 0">업무 없음</div>');
}

/* ═══════════ 부팅 ═══════════ */
function rAll(){rDay();rTasks();rOrg();rCfg();rFilter();rMention();rMine();refetchCal();rWidget();}
(function boot(){
  let dark=false;
  try{dark=localStorage.getItem('calapp.theme')==='dark';}catch(e){}
  applyTheme(dark);
  if(WIDGET)document.body.classList.add('wid');
  LocalStore.init();
  calInit();
  bindCalResize();
  subVisibleMonths();
  rDay();rAcct();rFilter();rWidget();
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
