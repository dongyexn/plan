/* H · 주요업무현황 — 설치용 최소 서비스워커
   목적은 '앱으로 설치'(PWA) 조건을 만족시키는 것 하나뿐이다.
   ⚠ 캐시를 절대 두지 않는다 — 예전에 캐시 때문에 옛 코드가 계속 돌던 사고가 있었다.
   fetch 는 그대로 네트워크로 넘기고(패스스루), 새 버전이 올라오면 즉시 교체한다. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* 네트워크 그대로 — 가로채지 않는다 */ });
