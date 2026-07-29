## 주요 업무 현황

하자처리 현황 앱과 같은 디자인 언어·같은 Firebase 프로젝트(report-c29a1)를 쓰는 별도 앱.
팀 일정 달력(플랜 작성·리마인드)과 팀·공구·담당자별 주요업무현황을 실시간으로 공유한다.

## 구성

```
index.html                     화면·스타일 (인라인 스크립트 없음 — CSP script-src 'self')
app.js                         앱 로직 (로컬 ⇄ Firebase 공용 저장소 인터페이스)
vendor/fullcalendar.min.js     FullCalendar 6.1.21 (MIT)
vendor/PretendardVariable.woff2
scripts/remind.mjs             당일 리마인드 메일 발송 (GitHub Actions가 실행)
.github/workflows/remind.yml   매일 07:05 KST cron
database.rules.calapp.json     RTDB 규칙 추가분 (기존 규칙에 병합)
```

## 데이터 (RTDB `calapp/` 네임스페이스)

| 경로 | 내용 |
|---|---|
| `calapp/plans/{YYYY-MM}/{id}` | 플랜 — date·title·time·body·color·remind·done·by |
| `calapp/org` | 조직 구성 — teams[] → ggs[] → members[] (name·email) |
| `calapp/tasks/{memberId}/{itemId}` | 주요업무 항목 — text·st(0예정 1진행 2완료 3보류) |
| `calapp/cfg` | 설정 — defectUrl(하자처리 현황 바로가기 주소) |

- 플랜·업무는 **항목 단위로 쓰기** → 10명이 동시에 작성해도 서로 덮어쓰지 않음.
- 입력 중에는 실시간 수신 렌더를 보류(shEditing)해 타이핑이 지워지지 않게 함.

## 동작 모드

- **로그인 전** — localStorage(`calapp.v1`)에 이 브라우저만의 로컬 저장.
- **로그인 후** — Firebase 실시간 공유. 같은 GitHub Pages origin이라
  하자처리 현황에 로그인돼 있으면 세션이 자동으로 공유되어 곧바로 실시간 모드가 된다.
  (전용 로그인 화면은 추후 추가 예정)

## 배포 절차

1. 새 저장소에 이 폴더 전체를 push → Settings > Pages → 배포.
2. Firebase 콘솔 > Realtime Database > 규칙: `database.rules.calapp.json`의
   `calapp` 블록을 기존 규칙에 추가.
3. 저장소 Settings > Secrets and variables > Actions에 등록:
   - `FIREBASE_SERVICE_ACCOUNT` — Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 > 새 비공개 키(JSON 전체 붙여넣기)
   - `BREVO_API_KEY` — brevo.com 가입(무료 300통/일) > SMTP & API > API Keys
   - `MAIL_FROM` — Brevo에서 인증한 발신 주소
4. 앱 설정 페이지에서 하자처리 현황 주소 입력(사이드바 바로가기용).
5. 리마인드 테스트: 저장소 Actions 탭 > "리마인드 메일" > Run workflow(수동 실행).

## 리마인드 메일

종 아이콘이 켜진(remind=true) 미완료 플랜이 있는 날 아침 07:05(KST),
조직 구성에 등록된 담당자 이메일 전원에게 당일 플랜 목록을 발송한다.
