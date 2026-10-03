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
  /* 로그인 배경화면 — head 에서 먼저 받기 시작하고, 다 받으면 html.lgbg 로 서서히 드러낸다. 위젯·로컬 모드는 쓰지 않는다 */
  if (!/[?&](w|local)=1\b/.test(q)) {
    var im = new Image();
    im.onload = function(){ document.documentElement.classList.add('lgbg'); };
    im.src = 'login-bg.jpg';
  }
  if (!/[?&]w=1\b/.test(q)) return;
  var cls = ['wid', 'gate-on'].concat(/[?&]glass=1\b/.test(q) ? ['glass'] : []);   /* gate-on = 로그인 게이트가 떠 있음(처음엔 늘 뜸 — hideCover 가 뗀다) */
  var put = function(){ cls.forEach(function(c){ document.body.classList.add(c); }); };
  if (document.body) { put(); return; }
  var mo = new MutationObserver(function(){ if (document.body) { mo.disconnect(); put(); } });
  mo.observe(document.documentElement, { childList: true });
})();
