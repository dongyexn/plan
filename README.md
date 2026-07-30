# 업무 일정 · 주요업무 현황

팀 업무 일정 달력과 담당자별 주요업무 현황을 실시간으로 공유하는 사내 웹앱.
GitHub Pages + Firebase Realtime Database(무료 티어)로 동작한다.

## 구성

```
index.html                     화면·스타일
app.js                         앱 로직 (로컬 ⇄ Firebase 공용 저장소 인터페이스)
build-single.mjs               단일 HTML 빌드 (node build-single.mjs → dist/)
vendor/fullcalendar.min.js     FullCalendar 6.1.21 (MIT)
vendor/PretendardVariable.woff2
scripts/remind.mjs             당일 리마인드 메일 (매일 07:05 KST)
scripts/weekly.mjs             주간 요약 메일 (월요일 07:10 KST)
.github/workflows/*.yml        위 두 메일의 cron
database.rules.json            RTDB 보안 규칙 전체
widget/                        데스크톱 위젯 (Electron)
```

## 데이터 (RTDB `calapp/` 네임스페이스)

| 경로 | 내용 |
|---|---|
| `calapp/plans/{YYYY-MM}/{id}` | 단발 업무 — date·end(기간)·title·time·body·color·owner·remind·done |
| `calapp/recur/{id}` | 반복 업무 — 위 필드 + recur{f,until}·doneOn·skipOn |
| `calapp/tasks/{subjectId}/{itemId}` | 주요업무 항목 — text(제목)·prog(진행경과)·plan(처리계획)·site(현장)·st(0예정 1진행 2완료 3보류)·due·order·assignees·links·comments |
| `calapp/mentions/{uid}` | 코멘트에서 나를 부른 알림 |
| `calapp/org` | 팀 · 권역 · 현장 목록 |
| `calapp/people/{uid}` | 담당자 배정 — name·email·team·region·sites |
| `calapp/cfg` | 앱 설정 — 바로가기 주소, 메일 발송 형식 |
| `users/{uid}` | 계정·권한 — 하자처리 대시보드와 **공용**(이 앱은 읽기 위주) |

항목 단위로 쓰기 때문에 여러 명이 동시에 작성해도 서로 덮어쓰지 않는다.
입력 중에는 실시간 수신 렌더를 보류해 타이핑이 지워지지 않는다.

## 권한

`users/{uid}/role` 값을 하자처리 대시보드와 공유한다.

| 역할 | 일정 · 주요업무 작성 | 조직 관리 · 설정 |
|---|---|---|
| editor(관리자) | O | O |
| viewer(사용자) | O | X (보기 전용 안내 표시) |
| blocked | 로그인 차단 | — |

최초 관리자 1명은 Firebase 콘솔에서 `users/{uid}/role`을 `editor`로 직접 지정한다.
이후에는 조직 관리 화면에서 관리자가 다른 계정의 권한을 바꿀 수 있다.
앱에서 막을 뿐 아니라 DB 규칙에서도 `calapp/org` · `people` · `cfg` 쓰기를 editor로 제한하고,
일정·업무 노드에는 길이·형식 검증을 건다.

## 로그인

사내 도메인(`@hdec.co.kr`) 계정만 가입·로그인할 수 있고, 가입 시 받은 인증메일의 링크를
눌러야 진입된다. 최초 로그인 시 `users/{uid}`에 본인을 `viewer`로 자기 등록한다.
사이드바 하단 계정 카드에서 이름 변경 · 비밀번호 변경 · 로그아웃을 할 수 있다.

주소 뒤에 `?local=1`을 붙이면 계정 없이 이 브라우저에만 저장되는 로컬 모드로 열린다(시연용).

## 화면

**내 업무** — 내가 담당인 일정(앞으로 7일)·미완료 주요업무·받은 멘션을 한 화면에 모으고,
누르면 달력이나 주요업무 현황의 해당 항목으로 이동한다.

**찾기** — 오른쪽 아래 플로팅 버튼(또는 `Ctrl`+`K`)으로 업무 제목·내용, 일정, 코멘트를 가로질러 검색한다.

**업무 일정** — 월/주 뷰, 날짜를 가로로 끌어 만드는 기간 업무, 반복 업무(매주·격주·매월·매년),
담당자 지정과 자동 색, 권역 칩 + 담당자 선택 필터(권역을 고르면 담당자 목록도 좁혀진다). 기한이 있는 미완료 주요업무는 점선 배지로 함께 보인다.
반복 업무는 회차별로 완료 표시하며 삭제 시 "이 날짜만 제외 / 전체 삭제"를 고른다.

**주요업무 현황** — 왼쪽에서 대상(팀 공통업무 · 담당자별 전체 · 개별 담당자)을 고르고 오른쪽에서 작성·확인한다.
담당자는 권역별로 묶여 있다. 업무 추가는 목록 위 작성창에서 이뤄지며 제목과 함께 진행경과·처리계획을
나눠 적고 현장·기한·담당자(여러 명)를 지정한다. 항목을 누르면 펼쳐져 두 칸을 그 자리에서 고치고
코멘트를 스레드로 남긴다. 링크 첨부와 드래그 정렬, `@이름` 멘션을 지원한다.
항목마다 기한(D-표기), 코멘트 스레드, 달력으로 보내는 버튼이 있고, 완료 7일 경과 항목은 자동으로 접힌다.

**조직 관리(관리자)** — 사이드바에서 고른 팀을 기준으로 권역 · 현장 · 계정을 관리한다.
현장은 권역 그룹 아래에 놓이며, 끌어다 놓아 다른 권역으로 옮기거나 순서를 바꾼다.
계정은 선택한 팀 소속과 팀 미배정만 보이고, 미배정 계정은 "이 팀에 추가"로 편입한다.
담당 현장은 + 버튼을 눌러 권역별 목록에서 고른다.

**설정** — 다크 모드, 사용 안내, 버전 · 오류 기록 복사, 하자처리 대시보드 바로가기 주소(자동 저장),
그리고 최신 게시본(`report/{기준월}/_dash`)의 팀 · 권역 · 현장 목록 **가져오기**.
이름이 같은 항목은 기존 계정 배정이 그대로 이어진다.

## 단일 파일 빌드

```
node build-single.mjs      # dist/index.html + dist/vendor/
```

index.html과 app.js를 한 파일로 합친다. 인라인 스크립트를 쓰면서도 CSP를 유지하려고
스크립트 본문의 SHA-256 해시를 계산해 `script-src`에 넣고, 산출물에서 다시 검증한다.

## 데스크톱 위젯

`widget/` 폴더가 Electron 기반 위젯이다. 테두리 없는 항상 위 창으로 달력과 그날 업무만 띄우고,
트레이 아이콘 · 전역 단축키(Alt+Shift+C) · 창 위치 기억을 지원한다.

```
cd widget
npm install
npm start          # 실행해 확인
npm run dist       # dist/업무일정위젯.exe (포터블)
```

`widget/main.js` 상단 `APP_URL`을 배포 주소 + `?w=1`로 바꾼다. 위젯 창에서도 한 번 로그인해야 한다.

## 배포 절차

1. 새 저장소에 폴더 전체를 push → Settings > Pages → 배포.
   (단일 파일로 올리려면 `node build-single.mjs` 후 `dist` 내용만 올린다.)
2. Firebase 콘솔 > Realtime Database > 규칙에 `database.rules.json` **전체를 붙여넣기**.
3. 저장소 Settings > Secrets and variables > Actions에 등록(메일 발송용):
   - `FIREBASE_SERVICE_ACCOUNT` — Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 > 새 비공개 키(JSON 전체)
   - `BREVO_API_KEY` — brevo.com(무료 300통/일) > SMTP & API > API Keys
   - `MAIL_FROM` — Brevo에서 인증한 발신 주소
4. 설정 화면에서 하자처리 대시보드 주소를 입력(사이드바 바로가기용).
5. 메일 테스트: Actions 탭 > 워크플로 > Run workflow(수동 실행).

## 메일 자동 발송

**주간 요약** — 매주 월요일 07:10(KST). 이번 주 일정과 기한 임박·초과 업무를 한 통으로.

**당일 리마인드** — 종 아이콘이 켜진 미완료 업무가 있는 날 아침 07:05(KST) 발송.

두 메일 모두 설정 화면에서 켜고 끌 수 있고, 주간 요약 요일 · 수신 범위(팀 전체 / 담당자에게만) ·
제목 앞머리 · 안내 문구를 앱에서 정한다. 설정은 `calapp/cfg/mail`에 저장되고 발송 스크립트가 읽는다.
발송 시각만 워크플로의 cron에서 정한다.
