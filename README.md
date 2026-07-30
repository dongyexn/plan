# H서비스센터 · 일정·업무 공유

하자처리 현황 앱과 같은 디자인 언어·같은 Firebase 프로젝트(report-c29a1)를 쓰는 별도 앱.
팀 일정 달력(플랜 작성·리마인드)과 팀·공구·담당자별 주요업무현황을 실시간으로 공유한다.

## 구성

```
index.html                     화면·스타일
app.js                         앱 로직 (로컬 ⇄ Firebase 공용 저장소 인터페이스)
build-single.mjs               단일 HTML 빌드 (node build-single.mjs → dist/)
widget/                        데스크톱 네이티브 위젯 (Electron)
vendor/fullcalendar.min.js     FullCalendar 6.1.21 (MIT)
vendor/PretendardVariable.woff2
scripts/remind.mjs             당일 리마인드 메일 (매일 07:05 KST)
scripts/weekly.mjs             주간 요약 메일 (월요일 07:10 KST)
.github/workflows/*.yml        위 두 메일의 cron
database.rules.json            RTDB 보안 규칙 전체 (하자처리 현황 + calapp)
```

## 데이터 (RTDB `calapp/` 네임스페이스)

| 경로 | 내용 |
|---|---|
| `calapp/plans/{YYYY-MM}/{id}` | 단발 플랜 — date·end(기간)·title·time·body·color·owner·remind·done |
| `calapp/recur/{id}` | 반복 플랜 — 위 필드 + recur{f:w/2w/m/y, until}·doneOn{날짜}·skipOn{날짜}. 월 경계와 무관하게 항상 구독 |
| `calapp/org` | teams[] · regions[] (팀 · 권역 이름 목록) |
| `calapp/people/{id}` | 담당자 배정 — name·email·team·region (id는 로그인 uid) |
| `calapp/tasks/{subjectId}/{itemId}` | 주요업무 항목 — text·st(0예정 1진행 2완료 3보류)·due(기한)·comments{id:{by,text,at}}. subjectId는 팀 id 또는 담당자 id |
| `users/{uid}` | 하자처리 현황과 **공용** — 계정 목록(읽기 전용으로 사용) |
| `calapp/cfg` | 설정 — defectUrl(하자처리 현황 바로가기 주소) |

- 플랜·업무는 **항목 단위로 쓰기** → 10명이 동시에 작성해도 서로 덮어쓰지 않음.
- 입력 중에는 실시간 수신 렌더를 보류(shEditing)해 타이핑이 지워지지 않게 함.

## 권한

`users/{uid}/role` 값을 하자처리 현황과 공유한다.

| 역할 | 일정 · 주요업무 작성 | 팀 · 권역 · 계정 배정 · 연결 설정 |
|---|---|---|
| editor(관리자) | O | O |
| viewer(사용자) | O | X (설정 화면에 안내만 표시) |
| blocked | 로그인 차단 | — |

최초 관리자 1명은 하자처리 현황과 마찬가지로 Firebase 콘솔에서 `users/{uid}/role`을
`editor`로 직접 지정해야 한다. 이후에는 설정 > 계정 관리에서 관리자가 다른 계정의 권한을 바꿀 수 있다.

앱에서 막을 뿐 아니라 DB 규칙에서도 `calapp/org` · `calapp/people` · `calapp/cfg` 쓰기를
editor로 제한한다. 일정·업무 노드는 인증된 팀원 누구나 쓰되, 제목 120자 · 내용 1000자 ·
업무 500자 · 상태 0~3 같은 값 검증을 규칙에서 건다.

## 로그인

하자처리 현황과 같은 방식이다. `@hdec.co.kr` 계정만 가입·로그인할 수 있고, 가입 시 받은
인증메일의 링크를 눌러야 진입된다. 최초 로그인 시 `users/{uid}`에 본인을 `viewer`로 자기 등록하며,
`blocked`로 지정된 계정은 차단된다. 사이드바 하단 계정 카드를 누르면 이름(닉네임) 변경 ·
비밀번호 변경 · 로그아웃을 할 수 있다. 두 앱이 같은 Firebase 프로젝트라 계정과 권한이 그대로 공유된다.

주소 뒤에 `?local=1`을 붙이면 계정 없이 이 브라우저에만 저장되는 로컬 모드로 열린다
(시연·개발용 — 팀과 공유되지 않는다).

## 단일 파일 빌드

```
node build-single.mjs      # dist/index.html (앱 전체) + dist/vendor/
```

index.html과 app.js를 한 파일로 합친다. 인라인 스크립트를 쓰면서도 CSP를 유지하려고
스크립트 본문의 SHA-256 해시를 계산해 `script-src`에 넣고, 산출물에서 다시 해시를
검증한다(한 글자만 달라져도 브라우저가 스크립트를 차단하므로).
배포는 `dist` 폴더(index.html + vendor)만 올리면 된다.

## 배포 절차

1. 새 저장소에 이 폴더 전체를 push → Settings > Pages → 배포.
   (단일 파일로 올리려면 `node build-single.mjs` 후 `dist` 내용만 올린다.)
2. Firebase 콘솔 > Realtime Database > 규칙: `database.rules.json` **전체를 붙여넣기**.
   기존 하자처리 현황 규칙이 그대로 들어 있고 `calapp` 블록만 추가된 파일이다.
   (`users` 목록 읽기는 기존대로 관리자 전용 — 일반 사용자 화면의 담당자 명부는
   관리자가 팀·권역을 지정할 때 기록되는 `calapp/people`로 제공된다.)
3. 저장소 Settings > Secrets and variables > Actions에 등록:
   - `FIREBASE_SERVICE_ACCOUNT` — Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 > 새 비공개 키(JSON 전체 붙여넣기)
   - `BREVO_API_KEY` — brevo.com 가입(무료 300통/일) > SMTP & API > API Keys
   - `MAIL_FROM` — Brevo에서 인증한 발신 주소
4. 앱 설정 페이지에서 하자처리 현황 주소 입력(사이드바 바로가기용).
5. 리마인드 테스트: 저장소 Actions 탭 > "리마인드 메일" > Run workflow(수동 실행).

## 달력 기능

월/주 뷰 전환, 날짜를 가로로 끌어 만드는 기간 일정, 반복 일정(매주·격주·매월·매년, 종료일 지정),
담당자 지정과 담당자별 자동 색, 담당자 필터. 기한이 있는 미완료 업무는 점선 배지(⏳)로 늘 함께 보이고, 완료하면 사라진다.
반복 일정은 회차별로 완료 표시하며, 삭제 시 "이 날짜만 제외 / 반복 전체 삭제"를 고른다.
한 날짜에 일정이 많으면 그 칸 안에서 스크롤한다.

## 주요업무 현황 기능

팀 공통업무와 담당자별 업무를 1:2로 나란히 보고 탭으로 대상을 바꾼다.
항목마다 기한(D-표기, 임박은 주황·초과는 빨강), 코멘트 스레드, 달력으로 보내는 버튼이 있다.
완료된 지 7일이 지난 항목은 자동으로 접히고 "지난 완료 N건 보기"로 펼친다.

## 데스크톱 위젯 (네이티브)

`widget/` 폴더가 Electron 기반 네이티브 위젯이다. 테두리 없는 항상 위 창으로 달력과
그날 플랜만 띄우고, 트레이 아이콘 · 전역 단축키(Alt+Shift+C) · 창 위치 기억을 지원한다.
데이터는 웹앱과 같은 Firebase를 보므로 실시간으로 함께 갱신된다.

```
cd widget
npm install
npm start          # 바로 실행해 확인
npm run dist       # dist/업무일정위젯.exe  — 설치 불필요한 포터블 실행 파일
```

- 위젯이 여는 주소는 `widget/main.js` 상단 `APP_URL`에서 바꾼다(배포 주소 + `?w=1`).
  환경변수 `CALWIDGET_URL`로도 덮어쓸 수 있다.
- 트레이 메뉴에서 항상 위 표시 · 작업표시줄 숨김 · 새로고침 · 종료를 고를 수 있다.
- exe를 시작프로그램에 등록하면 부팅 시 자동으로 뜬다
  (`Win+R` → `shell:startup` 폴더에 바로가기 복사).

위젯 창에서도 한 번 로그인해야 한다(브라우저와 세션이 분리되어 있다).

## 메일 자동 발송

**주간 요약** — 매주 월요일 07:10(KST). 이번 주 월~일 일정과 기한이 임박·초과한 업무를 한 통으로 보낸다.

**당일 리마인드** — 종 아이콘이 켜진(remind=true) 미완료 플랜이 있는 날 아침 07:05(KST),
로그인 계정(users, 차단 제외)과 설정에서 직접 추가한 담당자의 이메일 전원에게
당일 플랜 목록을 발송한다.
