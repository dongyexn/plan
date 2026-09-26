/* 963차: 위젯 첫 화면 깜빡임 방지 — app.js(1MB 남짓)가 다 받아져 boot() 가 body.wid 를 달기 전까지는
   일반 화면의 불투명 로그인 게이트(#25282D 전면)가 투명 위젯 창에 그대로 그려졌다(실행·새로고침 때마다).
   head 에서 가장 먼저 돌아 body 가 생기는 즉시 wid·glass 를 달아 첫 페인트부터 위젯 모양으로 그린다.
   ⚠ CSP 가 인라인 스크립트를 막으므로 별도 파일이다. 판정식은 app.js 의 WIDGET·GLASS 와 같아야 한다. */
(function(){
  /* 970차(P4): 처음 여는 동안 스크립트(달력·Firebase·app.js)를 못 받으면 로딩 점 대신 안내와 새로고침 단추를 띄운다.
     전엔 안내 없이 점만 계속 돌았다. 다 뜬 뒤(load 이후)에 필요할 때 부르는 스크립트의 실패는 여기서 다루지 않는다 */
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

  var q = location.search;
  if (!/[?&]w=1\b/.test(q)) return;
  var cls = ['wid', 'gate-on'].concat(/[?&]glass=1\b/.test(q) ? ['glass'] : []);   /* 970차: gate-on = 로그인 게이트가 떠 있음(처음엔 늘 뜸 — hideCover 가 뗀다) */
  var put = function(){ cls.forEach(function(c){ document.body.classList.add(c); }); };
  if (document.body) { put(); return; }
  var mo = new MutationObserver(function(){ if (document.body) { mo.disconnect(); put(); } });
  mo.observe(document.documentElement, { childList: true });
})();
