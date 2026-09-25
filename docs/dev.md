# 개발 문서 — 시스템 · 배포 · 내부 규칙

> 쓰는 사람용 안내는 [manual.md](manual.md). 코드 구조·함정은 저장소의 HANDOFF.md.

## 9. 개발·배포 전 검증

개발 도구는 앱 런타임과 분리되어 있습니다. 저장소에서 아래 명령으로 현재 기준 회귀 검사를 한 번에 실행할 수 있습니다.

```text
npm ci
npx playwright install chromium
npm test
```

`npm test`는 정적 감사 → Firebase Rules 감사 → 브라우저 스모크 → 무지개 렌더링 → 하자 전 구간 E2E 순서로 실행합니다. `LIVE_E2E_EMAIL`, `LIVE_E2E_PASSWORD`, `LIVE_E2E_SECOND_EMAIL`, `LIVE_E2E_SECOND_PASSWORD`가 모두 있으면 실제 Firebase 2계정 E2E도 자동으로 이어서 실행합니다. 모든 테스트 데이터와 검증 로직은 이 저장소 안에서 독립적으로 준비됩니다.


## 11. 시스템 개요

> 여기서부터(11~13)는 **시스템을 구축·배포하는 사람**을 위한 내용이다.

```
브라우저 / 위젯 / 휴대전화
        ↓
GitHub Pages  ← 정적 파일
        ↓
Firebase RTDB ← 데이터 · 인증 · 보안 규칙
```

서버가 없다. 정적 파일을 GitHub Pages 가 배포하고, 브라우저가 Firebase 와 직접 주고받는다.
**따라서 보안은 전부 DB 규칙(`database.rules.json`)에 달려 있다.**

### 파일

```
index.html                     화면·스타일 (CSS 전부 포함)
app.js                         모든 로직
database.rules.json            RTDB 보안 규칙 — 필드 추가 시 반드시 함께 수정
build-single.mjs               단일 HTML 빌드
vendor/                        FullCalendar · Chart.js · xlsx · Firebase SDK · Pretendard (자체 호스팅)
vendor/libredwg/               DWG 읽기 엔진(GNU LibreDWG → WebAssembly, GPL-3.0) + 전용 워커 dwg-worker.js
                               ⚠ 용량이 10MB 다. 배포에서 빠지면 「도면 인쇄」가 파일을 못 연다
scripts/test/static-audit.mjs  배포 전 정적 검사
scripts/test/smoke.mjs         브라우저 스모크
widget-lite/                   바탕화면 위젯 (Tauri · WebView2)
```

### 실행 모드

| 주소 | 모드 |
|---|---|
| 기본 | 로그인 + Firebase |
| `?local=1` | 계정 없이 이 브라우저에만 저장 (시연용) |
| `?w=1` | 위젯 레이아웃 — 달력만 |
| `?w=1&glass=1` | 위 + 반투명. **위젯이 실제로 여는 주소** |

`glass` 를 나눈 이유 — 위젯 창은 배경이 투명해 반투명으로 칠해야 바탕화면이 비친다.
브라우저로 `?w=1` 만 열 때(개발자 도구로 볼 때)는 뒤가 흰 페이지라 불투명이 맞다.

---

## 12. Firebase 세팅

### 1. 프로젝트

1. [Firebase 콘솔](https://console.firebase.google.com) > 프로젝트 추가
2. **Realtime Database** 생성 — 위치 `asia-southeast1`, **잠금 모드**
3. **Authentication** > 이메일/비밀번호 사용 설정
4. 설정 > 웹 앱 추가 → `firebaseConfig` 를 `app.js` 의 `FB.cfg` 에 넣는다

### 2. 보안 규칙

Realtime Database > 규칙에 `database.rules.json` **전체를 붙여넣는다.**

> ⚠ 건너뛰면 **누구나 데이터를 읽고 쓴다.** 서버가 없으므로 규칙이 곧 서버다.

### 3. 최초 관리자

가입은 앱에서, **첫 관리자만 콘솔에서** 올린다.

1. 앱에서 가입 → `users/{uid}` 가 `viewer` 로 생성됨
2. 콘솔에서 `users/{uid}/role` 을 **`editor`** 로 변경

이후에는 조직 관리 화면에서 바꾼다.

### 데이터 구조

| 경로 | 내용 |
|---|---|
| `calapp/tasks/{sid}/{iid}` | **업무 하나** — 일정과 업무가 통합된 단일 엔티티 |
| `calapp/org` | 팀·권역·현장 — 조직 관리의 기준 정보 |
| `calapp/people/{uid}` | 담당자 배정 |
| `calapp/offdays/{날짜}` | 팀 휴무일 |
| `calapp/cfg` | 앱 설정 |
| `calapp/prefs/{uid}` | 개인 설정 — 본인만 쓰기 |
| `calapp/trash/{sid}/{iid}` | 휴지통 — 30일 보관 |
| `calapp/archive/{sid}/{iid}` | 보관함 — 완료 6개월 뒤 |
| `users/{uid}` | 계정·권한 |
| `report/{YYYY-MM}` | 하자 월별 게시본 — 대시보드·현장 집계·미처리 목록 |
| `reportIndex/{YYYY-MM}` | 게시된 기준월 인덱스 |
| `plans/{sid}` | 현장별 처리계획 |
| `siteConfig/{sid}` | 현장별 하자 표시 설정 |

`sid` 는 업무가 담긴 자리다 — 첫 담당자의 uid, 없으면 팀 id.
⚠ **집계는 항상 `assignees` 로 한다. `sid` 에 기대지 않는다.**

캘린더와 업무 현황은 같은 업무를 다른 각도로 보여 준다. 항목 단위로 쓰므로 동시 작성해도 덮어쓰지 않고,
입력 중에는 실시간 수신 렌더를 보류해 타이핑이 지워지지 않는다.

팀·권역·현장은 `calapp/org`가 기준 정보이며, 하자 게시본의 `sites`·`teams`는 게시 시점의 집계용 스냅샷으로 저장한다.

---

## 13. 배포

### 최초 1회

1. 저장소 > Settings > Pages > **Deploy from a branch** > `main` / `(root)`
2. Firebase > Authentication > **승인된 도메인**에 배포 주소 추가

### 배포할 때마다

```bash
npm test                              # 전체 회귀 게이트
# 또는 개별 실행
node scripts/test/static-audit.mjs   # FAIL 0 · WARN 0 이어야 함
node scripts/test/risk-gold.mjs      # 민원 세대 레벨화 정답셋(60건)
node scripts/test/mobile-fit.mjs     # 폰 폭 겹침·잘림 + 데스크톱 가로 스크롤
node scripts/test/smoke.mjs          # 핵심 흐름 클릭 (CHROMIUM 환경변수 필요)
```

**버전 세 곳을 같은 숫자로 올린다.**

| 고칠 파일 | 고칠 자리 |
|---|---|
| zip 이름 | `calapp-v900` |
| `index.html` | `app.js?v=900` |
| `app.js` | `const APP_VER='900'` |

> 어긋나면 static-audit 이 FAIL 로 잡는다.

push 하면 GitHub Pages 가 자동 배포한다.
⚠ 규칙을 바꿨다면 **먼저** Firebase 콘솔에 붙여넣는다.

```bash
node build-single.mjs    # dist/ — 단일 파일 배포용
```

### 위젯 배포

> exe 빌드에 **개발 도구가 필요 없다.** 깃허브가 만든다.
> (팀원 PC 에는 최초 1회 설치. 이후 갱신은 자동.)

1. `widget-lite/Cargo.toml` 과 `tauri.conf.json` 의 `version` 을 같은 값으로 올려 push
2. 5~10분 뒤 **Releases** 에 `HPlanWidgetLite.exe` 가 올라온다
3. 팀원 위젯이 6시간마다 확인해 받아 두고, **다음 부팅 때 갈아탄다**

앱(index.html·app.js)만 고쳤다면 exe 를 다시 만들 필요가 없다 — 위젯은 배포된 주소를 불러온다.
`widget-lite/src/main.rs` 를 고쳤을 때만 다시 만든다.

---

## 부록 A. 민원 세대 레벨 판정 규칙

- **판정 재료**: 접수내용의 고객 발화(직원 처리메모 제외, 쉼표로 섞인 문장은 나눠 봄)에서 감지요소 10종 — ★중대 4(안전위험 · 보상요구 · 법적·외부확산 · 감정격화·위협표현) · 일반 4(반복하자·반복민원 · 응대·소통불만 · 생활불편 · 책임·형평성불만) · 참고 2(처리지연·장기방치 · 사설시공·인테리어). 키워드가 있어도 민원 방향의 문맥이 있어야 잡습니다(「책임지고 처리」「사고 없이 마무리」는 무효). 접수 데이터로도 붙습니다 — 현재 미처리 지연 60일+ → 처리지연·장기방치, 세대 접수 8건+(또는 5건+·미처리 2건+)·같은 공간·유형 반복·재촉 날짜 2개+행동어 → 반복하자·반복민원. 세대 레벨화는 하자구분이 「세대」인 접수만 다룹니다(공용부 제외). 하자유형의 물리 심각도는 별도 축.
- **레벨**: 긴급 = ★중대 3개 이상, 또는 법적·외부확산이 있고 미처리가 남았으며 점수 7 이상 · 심각 = ★중대 1~2개 또는 일반 3개 이상 · 경계 = 일반 1~2개 또는 물리 심각(누수·균열·파손…) · 주의 = 참고 요소만 또는 물리 경계 · 양호 = 나머지. 1년 이상 방치는 한 단계 위(심각까지).
- **점수**(표의 「점수」 열, 등급 안 정렬): ★중대 +3 · 일반 +1 · 참고 +1 · 180일+ +1 · 365일+ +2 · 물리 심각 +2 · 물리 경계 +1(상한 12).
- 소송 미참여 세대 태그는 민원이 아닙니다(채권양도 안 한 세대 구분). 안내방송·화장대 오타·"자재발주"의 "재발" 같은 오탐은 제외 규칙에 있습니다.
- 규칙은 `app.js` 의 `RISK_RULES` 한 곳. 고치면 `node scripts/test/risk-gold.mjs`(예문 60건 정답셋 + 문맥 28건 + 점수·등급)가 회귀를 잡습니다. 실데이터 오탐 점검은 브라우저 콘솔에서 `riskAuditCSV('현장id')` — 접수번호·요소·검출어·판정·사유 CSV.
- 계산은 업로드 시 현장별로 되고 게시본에 함께 실리므로 마스터 PC 가 아니어도 팀 전원이 봅니다.


## 부록 B. 업무 색 그라디언트



색 팝오버는 두 부분이다. 위는 **단색**(기본색 + 최근 쓴 색 + 직접 고르기), 아래 구분선 밑은 **그라디언트** 줄이다.

그라디언트는 **두 줄**이다. 위가 고정, 아래가 흐름(칩에 **▶**)이고 같은 순서라 세로로 짝이 맞는다.

| 줄 | 칩 | 색 이름 |
|---|---|---|
| 고정 | 무지개 + 색 7종 | `rainbow` · `grad-rd` `grad-og` `grad-yl` `grad-gr` `grad-bl` `grad-nv` `grad-pp` |
| 흐름 ▶ | 같은 8종 | 위 이름 뒤에 `-anim` (`rainbow-anim` · `grad-rd-anim` …) |

- 고정은 막대 폭에 맞춰 색이 **다 보이고**, 흐름은 8초 주기로 흐른다.
- 색 7종은 단색의 명암 차가 아니라 **이웃 색을 섞은** 그라디언트다(예: 빨강은 로즈–레드–오렌지).
  각 그라디언트는 시작 색으로 되돌아와 닫히므로 흐를 때 이음매가 보이지 않는다.
- 그리기와 흐름은 막대가 아니라 **`::after` 한 겹**이 맡는다. 흐름은 `transform` 을 미는 합성 애니메이션이라
  주 스레드를 쓰지 않는다(683차). 프레임은 `steps(160)`, 초당 20칸이다.
- 흐름은 사용자가 직접 고른 장식이므로 OS 「동작 줄이기」로 끄지 않는다 — 그 설정을 쓰는 사람의 선택지는 고정 쪽이다.

