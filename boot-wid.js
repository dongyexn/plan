/* 963차: 위젯 첫 화면 깜빡임 방지 — app.js(1MB 남짓)가 다 받아져 boot() 가 body.wid 를 달기 전까지는
   일반 화면의 불투명 로그인 게이트(#25282D 전면)가 투명 위젯 창에 그대로 그려졌다(실행·새로고침 때마다).
   head 에서 가장 먼저 돌아 body 가 생기는 즉시 wid·glass 를 달아 첫 페인트부터 위젯 모양으로 그린다.
   ⚠ CSP 가 인라인 스크립트를 막으므로 별도 파일이다. 판정식은 app.js 의 WIDGET·GLASS 와 같아야 한다. */
(function(){
  var q = location.search;
  if (!/[?&]w=1\b/.test(q)) return;
  var cls = ['wid'].concat(/[?&]glass=1\b/.test(q) ? ['glass'] : []);
  var put = function(){ cls.forEach(function(c){ document.body.classList.add(c); }); };
  if (document.body) { put(); return; }
  var mo = new MutationObserver(function(){ if (document.body) { mo.disconnect(); put(); } });
  mo.observe(document.documentElement, { childList: true });
})();
