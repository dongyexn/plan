/* 위젯 첫 화면 깜빡임 방지 — head 에서 가장 먼저 돌아 body 가 생기는 즉시 wid·glass 를 달아 첫 페인트부터 위젯 모양으로 그린다(없으면 불투명 로그인 게이트가 비친다).
   ⚠ CSP 가 인라인 스크립트를 막으므로 별도 파일이다. 판정식은 app.js 의 WIDGET·GLASS 와 같아야 한다 */
(function(){
  /* 처음 여는 동안 스크립트(달력·Firebase·app.js)를 못 받으면 로딩 점 대신 안내와 새로고침 단추를 띄운다.
     load 이후 필요할 때 부르는 스크립트의 실패는 여기서 다루지 않는다 */
  var failShown = false;
  var showFail = function(){
    var l = document.getElementById('cvLoading');
    if (!l) { document.addEventListener('DOMContentLoaded', showFail); return; }
    if (failShown) return; failShown = true;
    var d = l.querySelector('.cv-dots'); if (d) d.style.display = 'none';
    var p = document.getElementById('cvFail'), b = document.getElementById('cvFailBtn');   /* 자리는 index.html 에 숨겨 두었다 */
    if (p) p.hidden = false;
    if (b) b.addEventListener('click', function(){ location.reload(); });
    l.setAttribute('aria-label', '불러오지 못했습니다');
  };
  window.addEventListener('error', function(e){
    var t = e && e.target;
    if (!t || t.tagName !== 'SCRIPT' || document.readyState === 'complete') return;
    showFail();
  }, true);

  /* 1078 iOS 홈 화면 앱 — iOS 26 이 상태 표시줄 아래를 흐리게 덮는다. html.ios-pwa 면 index.html 이 앱 틀(#app)을 fixed·셸색으로 둬 WebKit 이 흐림 대신 그 색을 쓰게 한다 */
  if (navigator.standalone === true) document.documentElement.classList.add('ios-pwa');
  var q = location.search;
  /* 배경 사진 목록 — 사용자 Unsplash 컬렉션 「BG」(V1rR9aIWwDE)의 사진 주소·작가만(사진 파일은 저장하지 않고 images.unsplash.com 을 그대로 쓴다).
     ⚠ 키는 앱에 넣지 않는다(Unsplash 약관 — Access Key 비공개). 컬렉션은 GitHub 작업 bg-sync 가 하루 한 번 RTDB bg/l 로 옮기고 app.js(bgSub)가 읽어
     이 브라우저(calapp.bgl)에 둔다 — 아래 목록은 그것도 없을 때(첫 방문)의 기본값. app.js(bgPick)·로그인 배경·회의 표지가 같은 목록을 쓴다 */
  window.BG_LIST = [
    {u:'https://images.unsplash.com/photo-1791133052453-aaa8d29a2840?ixid=NHwxMjA3fDA&ixlib=rb-4.1.0',n:'Serge Taeymans',h:'https://unsplash.com/@poseidonx'},
    {u:'https://images.unsplash.com/photo-1778423136174-5d564de2a947?ixid=NHwxMjA3fDA&ixlib=rb-4.1.0',n:'Claudio Schwarz',h:'https://unsplash.com/@purzlbaum'},
    {u:'https://images.unsplash.com/photo-1790892956551-2cb46f88431a?ixid=NHwxMjA3fDA&ixlib=rb-4.1.0',n:'George Cox',h:'https://unsplash.com/@georgeallancox'}
  ];
  /* 로그인 배경화면 — head 에서 먼저 받기 시작하고, 다 받으면 html.lgbg 로 서서히 드러낸다. 위젯·로컬 모드는 쓰지 않는다 */
  if (!/[?&](w|local)=1\b/.test(q)) {
    var L = window.BG_LIST;
    try { var cl = JSON.parse(localStorage.getItem('calapp.bgl') || 'null'); if (cl && cl.length) L = window.BG_LIST = cl; } catch (e) {}   /* 지난번 RTDB 에서 받은 목록(컬렉션 최신)이 있으면 그것 */
    var pk = L && L.length ? L[Math.floor(Date.now() / 3600000) % L.length] : null;   /* 이 시각(한 시간 단위)의 사진 — 못 받으면 기본 사진 */
    try { var pn = JSON.parse(localStorage.getItem('calapp.bgpin') || 'null'); if (pn && pn.u && L) for (var k = 0; k < L.length; k++) if (L[k].u === pn.u) pk = L[k]; } catch (e) {}   /* 설정에서 고정한 사진 — app.js bgPick 과 같은 규칙(첫 화면부터 그 사진, 중간에 바뀌지 않게) */
    var im = new Image();
    var bu = pk && pk.u ? pk.u + (pk.u.indexOf('?') < 0 ? '?' : '&') + 'w=2560&q=80&fm=jpg&fit=crop' : '';
    im.onload = function(){ if (bu) document.documentElement.style.setProperty('--bg-img', 'url("' + bu + '")'); document.documentElement.classList.add('lgbg'); };
    im.onerror = function(){ if (!bu) return; bu = ''; im.src = 'login-bg.jpg'; };
    im.src = bu || 'login-bg.jpg';
  }
  if (!/[?&]w=1\b/.test(q)) return;
  var cls = ['wid', 'gate-on'].concat(/[?&]glass=1\b/.test(q) ? ['glass'] : []);   /* gate-on = 로그인 게이트가 떠 있음(처음엔 늘 뜸 — hideCover 가 뗀다) */
  var put = function(){ cls.forEach(function(c){ document.body.classList.add(c); }); };
  if (document.body) { put(); return; }
  var mo = new MutationObserver(function(){ if (document.body) { mo.disconnect(); put(); } });
  mo.observe(document.documentElement, { childList: true });
})();
