# H · 주요업무현황

팀 업무 일정 · 업무 현황 · 하자처리 현황 · D+60 점검을 한곳에서 공유하는 웹앱. 브라우저 · 바탕화면 위젯 · 휴대전화(홈 화면에 추가)에서 같은 화면.

- 주소: https://dongyexn.github.io/plan/ (회사 메일 로그인)
- 사용 안내: 앱 머리 줄 「?」(폰은 메뉴 「사용 안내」) — 실제 화면을 장마다 옮겨 다니며 단추를 짚어 안내(← → · Esc, 짚은 자리를 눌러도 다음). 끝 카드의 「글 안내」가 예전 그림 안내. 글은 [docs/manual.md](docs/manual.md), 그림은 `node scripts/dev/guide-shots.mjs` 로 다시 만든다
- 시스템 · Firebase · 배포: [docs/dev.md](docs/dev.md)
- 코드 구조 · 함정: [HANDOFF.md](HANDOFF.md) · 회차 이력: [HANDOFF-log.md](HANDOFF-log.md)

## 배포

```bash
npm ci && npx playwright install chromium
npm test    # 전부 PASS 여야 배포
```

1. 버전 세 곳을 같은 숫자로: `app.js` 의 `APP_VER` · `index.html` 의 `app.js?v=` · zip 이름 `calapp-vNNNN`
2. push 하면 GitHub Pages 가 배포 — `.github/workflows/pages.yml` 이 `node scripts/build-min.mjs` 로 주석·빈 줄을 걷은 사본(_site)을 올린다(원본은 주석 그대로). **Settings → Pages → Source = GitHub Actions** 여야 쓰인다
3. `database.rules.json` 을 바꿨으면 **push 전에** Firebase 콘솔 → Realtime Database → 규칙에 먼저 게시(안 하면 저장 거부)

리포 Secrets

| 이름 | 용도 |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | D+60 사진 자동 정리 · 배경화면 동기화(bg-sync) |
| `UNSPLASH_ACCESS_KEY` | 배경화면 동기화 — Unsplash 컬렉션 「BG」를 매일 06:00·12:00 + 앱 「다시 가져오기」 요청 때 읽음(5분마다 확인) |
| `LIVE_E2E_*` | 실서버 E2E(선택) |
