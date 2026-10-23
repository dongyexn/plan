# 인수인계 — H · 주요업무현황 (calapp)

**현재 기준: v1230.**

- **1230차(사용자: 다기능공·고양이·앵무새·강아지 품종·현장소장·안전관리자·설비/전기/용접/창호/콘크리트/미장공·유도원 시안 차례로 기각 → 「작업반장」 · 「순서·대사·던지기·이름 편집 아티팩트」 → 던지는 그림 다시(안전모 빼고 라바콘·도배풀) → 「적용」)** — 직접 그린 작업반장(초록 안전모·왼팔 완장·손에 쥔 노란 무전기, 커피) 추가·상호작용 6장면(작업자·관리자·신호수·장비·민원인·요정), 진돗개 삭제(31종 유지). 편집 아티팩트 저장본대로 순서(관리자·작업반장·작업자·신호수 …)·이름(렌탈·강아지)·대사·던지기 반영. 던지는 그림 건전지·타일·마루판·페인트 다시, 도배풀 it-paste 새로, 안전모·벽지·안전배지 삭제. 안전모·라바콘 요정 폴짝 때 위 잘림 수정.
- **1229차(사용자: 「그림체 섞임 — 동물도 직접 그린 스타일로」 → 직접 그리기 두 번(틀·한 마리씩) 「풍선 같다」 → 「원래 그림 다듬기(2번)」 → 「크기 키우고 손댈 수 없는 애들은 빼자」)** — 수정 허용 동물 8종(시바·여우·너구리·쥐 vscode-pets MIT, 레서판다·꿀벌·아기 Elthen 수정 허용)을 외곽선 색 통일·4배+sm·2배 표시로 다듬음, 백구 → 진돗개(시바 그림 크림색). 라이선스 문서 없는 팩·비상업 데모·AI 금지 동물(산타냥·상자냥·턱시도냥·토끼·닭·병아리·펭귄·젖소·슬라임)과 누렁이·오리 삭제(42→31).
- **1228차(사용자: 「펫 최대 3마리 · 상호작용」 시안(pvhum) 여러 차례 → 「적용 · 상호작용 더 · 공주·해적냥 삭제 · 버그 확인」)** — 위젯 미니펫 최대 3마리(cfg.pets, 예전 cfg.pet 호환)·짝별 상호작용 16장면 + 요정 셋 TBM. 상담사(민원인 뒤, 커피)·안전모 요정(안전 배지)·경광등 요정(건전지)·크레인 추가, 전사·말티즈·공주·해적냥 삭제(42종). 직접 그린 펫 전부 사방 1칸 여백 외곽선으로 다시 뽑음(끝에 닿은 외곽선이 잘리던 것), 민원인 머리·💢 수정.
- **1227차(사용자: 「주으면 얼굴 바뀌는 거 다른 펫도 — 직접 그린 것만」 → 시안 → 「적용」)** — 작업자·관리자·신호수·도장공·타일공·마루공·도배공·코킹공·라바콘 요정에 g.eat(^ ^ 눈·웃는 입·분홍 볼, 팔 들고 들썩 / 폴짝). 장비는 얼굴이 없어 제외. 다음: 크레인·틀비계·상담사(하자보수 센터 매니저) 시안, 펫 최대 3마리·상호작용 구상.
- **1226차(사용자: 「민원인(늘 화남)」 → 「던지는 건 보상비 돈뭉치, 주우면 방긋」 → 「돈 자루 · 대사 「이제야 말이 통하네~」」 → 「고객을 속물로 보는 인식 — 돈 말고 서비스·관심·사랑」 → 「하트만」 → 「적용」)** — 직접 그린 민원인(💢·찡그림, 쉬기 때 주먹·소리침)을 코킹공 뒤에 추가(41→42), 던지는 것 하트 it-love. 먹이를 받으면 g.eat 그림(웃는 얼굴)과 fd 전용 멘트 — 앱 코드에 eat/fd 지원 추가(없는 펫은 그대로).

회차별 자세한 내용·결정 경위는 **HANDOFF-log.md**(최신이 위). 회차를 올릴 때마다 위 목록 맨 위에 한 줄, 로그에 한 블록을 더하고, 목록은 최근 5개만 둔다.

## 1. 무엇인가

H건설 서비스중부팀(중부1·중부2·광주)의 내부 웹앱. 업무 일정(달력) · 업무 현황 · 업무 도구(D+60 점검 · 사진대지 작성 · 견적 검토 · 재하자 추적 · 생산성 검토) · 하자처리 현황(민원 현황 · 회의 모드) · 조직 관리 · 설정.

- 서버 없음. 정적 파일을 GitHub Pages(`https://dongyexn.github.io/plan/`)가 배포하고 브라우저가 Firebase(RTDB·Auth)와 직접 주고받는다. **보안은 `database.rules.json` 이 전부.**
- 데스크톱 위젯 `widget-lite/`(Tauri, WebView2)가 같은 주소를 `?w=1&glass=1` 로 띄운다. 팀원 대부분은 위젯, 관리자는 브라우저.
- AI 기능 없음. 결정: 회사가 Entra 앱 등록·Azure 구독을 승인하지 않아 데이터는 Firebase(재시도 조건 = Entra 앱 등록 1건 승인).

## 2. 파일 구성

| 파일 | 역할 |
|---|---|
| `index.html` | 마크업 + CSS 전체(단일 `<style>`) |
| `app.js` | 앱 전체(단일 파일). 상단에 `APP_VER` |
| `boot-wid.js` | head 에서 먼저 도는 부팅(위젯 모양 · 로딩 실패 안내 · 배경화면 첫 사진 · `BG_LIST` 기본 목록) |
| `database.rules.json` | RTDB 규칙. 권한의 진실 |
| `docs/` | `manual.md`(사용 안내 글 — 앱 「?」의 장 목록이자 그림 없는 장의 본문) · `dev.md`(시스템·배포) · `img/` · `guide/`(그림 안내 — 아래 스크립트가 만든다) |
| `scripts/test/run-all.mjs` | 아래 게이트를 순서대로 |
| `scripts/test/static-audit.mjs` | 버전 동기·죽은 코드·CSS 재선언·주석 삼킴·data-act 짝·회차 표기 금지 — FAIL 0·WARN 0 |
| `scripts/test/rules-auth.mjs` | 규칙 흉내로 역할별 read/write 허용·거부(AUTH-ID) |
| `scripts/test/smoke.mjs` | `?local=1` 부팅 CRUD·달력·표·페이드 |
| `scripts/test/rainbow-render.mjs` | 색(무지개·그라디언트)·지도 점·미니달력 점 |
| `scripts/test/e2e-defect.mjs` | 하자 전 구간(가짜 HCS → 게시 → 대시보드·현장 → 부분 등록 → 미게시 판정) |
| `scripts/test/risk-gold.mjs` | 민원 세대 레벨 — `scripts/test/fixtures/risk-gold.md` 60건 정답셋 |
| `scripts/test/mobile-fit.mjs` | 폰 폭 겹침·잘림 + 데스크톱 폭 가로 스크롤 |
| `scripts/test/clip-audit.mjs` | 스크롤로도 닿지 않는 내용 |
| `scripts/test/iss.mjs` | 주요 현안 — 데스크톱·위젯 판·3주 아래 칸(추가·해결·고치기·지우기·숨김·담당자·3주 이동·백업) |
| `scripts/test/firebase-live-e2e.mjs` | 실제 Firebase 2계정 E2E(Secret 있을 때만) |
| `scripts/test/strip-comments.mjs` | 감사용 주석 걷기 |
| `scripts/css-dedup.py` | CSS 죽은 선언 정리(돌린 뒤 계산 스타일 전후 대조 필수) |
| `scripts/guide-shots.mjs` | 사용 안내 그림 만들기 — `?local=1` 에 가짜 자료(현장명N·업무명N·담당자N·권역N·업체N, 하자는 가짜 HCS 업로드→가짜 Firebase 게시)를 넣고 날짜를 2026-10-14 로 고정해 찍는다 → `docs/guide/*.webp` + `guide.json` |
| `scripts/bg-sync.mjs` | Unsplash 컬렉션 「BG」 → RTDB `bg`(Actions 전용) |
| `scripts/font-subset.py` | 폰트 서브셋(거의 안 만짐) |
| `vendor/` | FullCalendar · Chart.js · xlsx · Firebase SDK · DOMPurify · marked · lz-string · Pretendard · 지도 자료 |
| `widget-lite/` | Tauri 위젯(Rust) |
| `build-single.mjs` | 단일 HTML 묶기 |
| `.github/workflows/` | smoke · 위젯 exe 빌드 · D+60 사진 정리 · bg-sync(5분마다 확인 — 요청·06:00·12:00 KST 정기 때만 실행) |

## 3. 검증 · 배포

```
CHROMIUM=/path/to/chrome node scripts/test/run-all.mjs   # 끝에 「전체 결과: PASS」
```
- 버전 세 곳 동기: `app.js` 의 `APP_VER` · `index.html` 의 `app.js?v=` · zip `calapp-vNNNN`. zip 전에 `widget-lite/target` 지움.
- 규칙이 바뀌었으면 Firebase 콘솔에 **먼저** 게시. 위젯 exe 는 `widget-lite/` 가 바뀔 때만 다시 빌드.
- 코드 수정은 유일한 문맥 문자열 + `count==1` 확인으로. `find()` 가 -1 인 채 슬라이스하면 파일 꼬리가 복제된다(감사기가 잡는다). 마크업을 지울 땐 div 짝을 파서로 확인 — 닫는 태그 하나가 남아 설정 칸이 밀린 적이 있다.
- 화면 변경은 **보고 전에 직접** 잰다: 간격·정렬은 수치로, 겹침·비침은 확대 캡처로, 스크롤한 상태까지.

## 4. 데이터 (RTDB)

| 경로 | 내용 |
|---|---|
| `calapp/tasks/{sid}/{iid}` | 업무. `sid` = 담당자 uid 또는 팀 id(공통). `assignees` · `date`/`end` · `st`(1 진행 2 완료 3 보류) · `site` · `recur` |
| `calapp/plans/{uid}/{id}` | 달력 일정(휴무일 등) |
| `calapp/org` | `teams` · `regions` · `sites`(`normOrg` 가 정렬해 저장) |
| `calapp/people/{uid}` | team · region · rank · sites |
| `calapp/cfg` · `prefs/{uid}` · `trash` · `archive` | 설정 · 개인 설정 · 휴지통(30일) · 보관함 |
| `calapp/d60` | D+60 서식(forms)·점검 결과(insp) — 팀 공유 |
| `calapp/iss/{sid}/{iid}` | 주요 현안 `{t,at,by,dt}` — MEMBER 누구나 쓰고 지움(현장 통째는 관리자). 해결(dt) 7일 뒤 보드에서 숨김 |
| `calapp/d60photo/{sid}/{tr}/{key}/{pid}` | D+60 항목 사진(800px). **구독하지 않는다** — 항목 단위 `get()`(섞이면 월 다운로드가 터진다) |
| `users/{uid}` | role(editor/viewer/blocked) · avColor · avIcon |
| `report/{YYYY-MM}/…` · `reportIndex` | 하자 게시본(`kpi.hh` = 세대 레벨) · 게시된 달 |
| `siteConfig/{sid}` | 현장별 하자현황·공가·소송 토글 |
| `bg` | 배경화면 목록 `{l:[{u,n,h}],at}` — 읽기 전원, 쓰기는 Actions(서비스 계정)만 |

하자 원본(HCS)은 **이 PC 의 IndexedDB `calapp_defects_v1`** 에만, 업무 도구 이어하기는 `calapp_tools_v1` 에만 있다. 서버로는 가지 않는다.

## 5. 권한

- editor = 관리자(조직·현장·게시·삭제), viewer = 업무 작성까지, blocked = 로그인 불가. 규칙이 강제(`rules-auth`).
- 업무는 작성자·담당자만 수정. 팀장·공구장은 자기 팀/권역. 휴지통·보관함도 같은 소유 검사. 처리계획(plans)은 **전원 편집**(결정).
- 담당자 「삭제」는 레코드를 지우지 않고 미배정으로 보낸다(업무에 이름이 남는다).
- 알고 둔 허용(1080 결정): 본인이 자기 권역 현장을 sites 에 넣으면 그 현장 업무를 고칠 수 있다 · createdBy 없는 옛 업무는 누구나 수정 · CSP `https://*.firebasedatabase.app` 와일드카드 유지(RTDB 샤드 이동).

## 6. 화면별 핵심

### 달력
- 데스크톱: FullCalendar 월 뷰 + 오른쪽 업무 패널. `#fcal` 은 **display:flex**(block 이면 높이 0).
- 폰 세로: FullCalendar 를 쓰지 않고 **큰 월 달력 `#calMini`**(`mcalPane` 3장 가로 트랙, `mcalFit` 실측). 날짜 → 업무 시트(`mdsOpen`). ⚠ 폰 달력을 고칠 땐 숨은 `#fcal` 을 재면 시험이 늘 통과한다.
- 업무 색 = 담당자 프로필 색(`planColor`) — 업무의 `color` 값은 읽지 않는다. 그라디언트·무지개는 `colBg()` 를 거쳐야 칠해진다.
- 일정 편집기·업무 현황 작성 칸은 같은 칩 부품(`.pe-f2`, `peChipFill`). 현장 칸(`sitePickHTML`, `data-pick="site"`)은 권역별 묶음 + 찾기 메뉴.

### 업무 현황
- 주간(목~수) 표와 현장별 카드. 놓친 업무·보류는 아침 확인 창(`morningReview`).

### 주요 현안
- `issCard(s,'pg'|'w')` 하나를 데스크톱 화면(#issRoot) · 위젯 달력 자리(#issPane, 머리 단추 `iss.open` 으로 바꿔 낌) · 위젯 3주 아래 칸(#issStrip, 내 담당 현장만)이 같이 쓴다. 다시 그리기 `rIss` 는 입력 중이면 미뤘다가 focusout 에 그린다.
- 위젯 「3주 + 주요 현안」(calapp.wid `iss3`)은 FullCalendar 커스텀 뷰 `dayGrid3w` — 월 뷰 CSS 를 그대로 쓰게 `viewClassNames:['fc-dayGridMonth-view']`, `fixedWeekCount:false`(안 끄면 6주로 늘어난다). ⚠ `gotoDate` 는 보이는 범위 안 날짜면 안 움직이고 prev/next 는 currentDate 기준이라, 3주 뷰 이동은 `cal3Go`(같은 뷰로 changeView)만 쓴다. 제목 달은 가운데 주(`calRef`).

### 하자처리 현황
- 업로드(설정) → `norm()` → IndexedDB → `calc()` → **게시** `dfPublish`(원본 있는 현장만 갱신). 원본이 마지막 게시보다 새것일 때만 로컬로 그린다(`dfLocalDirty`).
- 표·막대 카드는 폰에서도 데스크톱 폭을 유지하고 가로로 민다(좁히면 숫자가 겹친다).
- 회의 모드(`mtgOpen`): 표지 → 01 대시보드 · 02 현황 · 03 장기미처리 처리계획(카드 덱, ↑↓) · 04 공가 · 민원. ← → 로 넘김. 자료는 게시본만, 화면에서 고치지 않는다.

### 민원 현황 (세대 레벨)
- 규칙은 `RISK_RULES` 한 곳 · 감지 `riskDetect` · 점수 `riskScore` · 레벨 `riskLevel`(긴급·심각·경계·주의·양호). 세대 접수만 본다. 판정 근거는 콘솔 `riskAuditCSV(sid)`.
- **규칙을 바꾸면 정답셋(`scripts/test/fixtures/risk-gold.md`)도 같이** — 코드를 정답셋에 맞추지 않는다. 레벨은 게시본에 실리므로 재등록해야 화면이 바뀐다.
- 자세한 감지요소·점수표는 `docs/dev.md` 부록 A 와 HANDOFF-log 734~764차.

### 업무 도구
- D+60 점검만 팀 공유(RTDB). 나머지는 로컬 전용(IndexedDB). D+60 규칙 경로를 늘리면 **규칙 배포 없이는 저장이 거부된다**(`calapp` 의 `$other:false`).
- 도면 인쇄는 1061차에 폐지(엔진 한계). 재시도 기록은 HANDOFF-log 1061차.

### 배경화면
- 목록 우선순위: RTDB `bg`(`bgSub`) → localStorage `calapp.bgl` → `boot-wid.js` 의 `BG_LIST`. 매시간 `L[bgHour()%L.length]`.
- 고정은 각자 브라우저 `calapp.bgpin`(없으면 자동). 새 목록이 와도 그 시간 동안은 지금 사진 유지(`BG_HOLD`).
- **Unsplash 키는 앱에 두지 않는다**(약관: 비공개). Secrets 에만, Actions 가 RTDB 로 옮긴다. bg = {l, at(목록 바뀐 시각), chk(마지막 확인), req(관리자 요청)} — 앱 동기화 단추는 bg/req 에 서버 시각만 쓰고(규칙: editor 만, now 일 때만), 작업이 5분마다 req > chk 또는 가장 최근 06:00·12:00 KST 이후 미실행(chk 가 그 시각 전)을 보고 돈다. 즉시 실행이 아니다(GitHub 예약 최소 5분·지연 있음).

### 사용 안내
- `openReadme` 가 `docs/manual.md` 를 ## 장으로 쪼개고, `docs/guide/guide.json` 의 `sec[장 이름][d|m]` 이 있으면 그 장은 글 대신 그림 단계(`guideSecHTML`)로 그린다 — 장 이름이 manual.md 제목과 같아야 한다.
- 번호 점 자리는 그리는 쪽(`place`)이 정한다: 작은 단추는 아래·위·옆 바깥, 다른 작은 단추 글자 위는 피함. 칸 위치(%)는 스크립트가 실제 요소를 재서 적는다.
- **화면이 바뀌면 `node scripts/guide-shots.mjs` 를 다시 돌린다**(그림 밖으로 나간 칸·못 찾은 칸은 ✗ 로 찍힌다). 이름은 드라이하게(사용자 지시) — 실제 현장명·가상 브랜드명 금지.

### 조직 관리
- 현장 표 편집은 초안(`ORG_DRAFT`) → 「저장」 한 번. 지도(`kmSVG`)는 통계청 경계 SVG, 외부 API 없음.
- siteConfig 구독은 부팅 때 건다(하자 화면에서만 걸면 토글이 서버를 덮었다).

### 폰 공통
- 떠 있는 부품만 둥글게(캡슐 30 · 시트 24 · 팝업 20~24), 본문 카드는 3px. 유리 판 = `var(--glass)` + `blur(20px) saturate(1.8)`.
- 줄 강조 미끄러짐은 `slSync()` / `SL_SPEC` 한 줄 추가. 표시 요소는 줄 맨 뒤에 붙인다(`:first-child` 규칙 보호).

## 7. 반복해서 걸린 함정

- 마우스 올림 규칙은 `@media (hover:hover) and (pointer:fine)` 안에, 짝으로 `@media not (…)` 에 `:active`.
- 모바일 쿼리는 `body:not(.wid)` 접두(위젯 보호). 스크롤바는 숨기고 페이드로만(`[data-sb]`·`[data-sbx]`). 페이드 관찰자는 `#app` 만 본다 — 밖에 붙는 메뉴·창은 `fadeOne` 을 직접 부른다.
- mask 페이드는 판 배경까지 지운다 — 불투명 판 위 sticky 줄이 있으면 판 색 덮개로.
- 선택자 우선순위: `.slhl>:not(.slhl-b)` 처럼 넓은 규칙이 sticky·배경을 덮는다. 고친 뒤 계산 스타일로 확인.
- 한글 세로 맞춤은 상자가 아니라 잉크로 잰다(글자가 줄 상자보다 위에 앉는다).
- 가운데 정렬엔 `safe`(넘치면 위가 잘려 스크롤로도 못 닿는다).
- iOS Safari 는 `cursor:pointer` 없는 div 에 위임 click 을 안 보낸다. Playwright 는 재현 못 한다.
- `pointerdown` 에서 `preventDefault()` 하면 `mousedown` 이 안 난다.
- 다시 그려지는 화면의 움직임은 표시 요소를 기억해 옮겨 단다(새로 만들면 매번 처음부터).
- 현실 규모(업무 28 · 현장 14 · 650세대)로 검증. 앱 주석에 회차 표기 금지(감사기 10c).
- 배포용 압축(minify) 빌드는 도입하지 않는다(780 결정 — 이득이 파싱 수십 ms, 비용은 디버깅).

## 8. 남은 과제

- 실데이터 첫 달 결과로 민원 레벨 경계값 조정.
- 세대 표 필터 입력 시 전체 재렌더(포커스 복원으로 버팀).
- 견적 검토: 업체별 산출 근거 표기를 실데이터로 계속 넓히기.
- 사이드바 회전 증상(재현 안 됨 — 실기기 캡처 필요).
- 일반 사용자의 데스크톱·폰 휴지통 진입(지금은 위젯 · 관리자 설정뿐).
