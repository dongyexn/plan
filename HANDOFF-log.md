# 변경 이력 (읽기 전용) — 현재 상태는 HANDOFF.md

## 마지막 기록 기준 v1291
### 1291차 물가정보 자체 리뷰 반영
- 담은 네이버 상품: 줄 끝 + 대신 ✓(.pr-nvok) · 같은 상품(원본 주소, 없으면 자재명+단가) 다시 담기 막음.
- prKey: 네이버(s:'nv')는 판매처(nt)까지 — 이름·규격이 같은 다른 판매처 상품이 「가장 최근 달만」 묶음에서 하나로 합쳐지던 것.
- 규칙 calapp/nvc/$k: 지우기 불가(newData.exists()) · 덮어쓰기는 at 이 더 클 때만 — 옛 결과로 남의 결과를 덮지 못한다(AUTH-33n~p).
- 불러오기 직전 서버를 한 번 더 확인(nvFetch force 아님) — 팀원이 7일 안에 불러 둔 결과가 있으면 그걸 보이고 횟수를 쓰지 않는다(알림). 「새로 불러오기」 확인 뒤엔 force.
- 검색 기록: 한 번만 받던 것을 1분 지나면 다시 받는다(nvHist · NV.hAt).
- 횟수: 실패해도(한도 · 인증 거절 제외) 시작 비용이 들 수 있어 nvBump.
- 자잘한 것: 「n일 전」 날짜 기준(어제), 검색어 치는 중엔 결과 조회를 멈춘 뒤 한 번(350ms), 네이버 묶음이 보이면 빈 화면의 「네이버 쇼핑」 링크 뺌, 단가 검토 보고의 물가정보지(kpi) 대비 문장 걷음, 물가정보 머리 주석(「대신 긁어오지 않는다」) 바로잡음.
- ⚠ 규칙 바뀜 — 콘솔 게시 필요. 미확인: Apify 한도 소진 때 오류 문구(추정 regex), 실서비스 전체 흐름.

## 마지막 기록 기준 v1290
### 1290차 물가정보 네이버 쇼핑 검색(Apify)
- 사용자: 「네이버쇼핑 수집용 기획 → 통합검색 용도 · 가볍게 넣기」. 네이버 쇼핑 검색 API 는 2026-07-31 종료라 Apify 수집기 johnvc/naver-search-api(네이버 통합검색, 결과 1건마다 과금)를 앱에서 직접 부른다(CORS *).
- 시험(probe-apify 브랜치 · Actions): searchapi 수집기는 고장(즉시 실패) · khadinakbar 는 무료라면서 johnvc 를 불러 회당 ~0.29달러에 3건 · parsebird 는 브랜드스토어 전용 · automation-lab 은 건당 0.03달러. johnvc 를 결과 10건(maxResultsPerQuery)으로 — 「석고보드 9.5t」 6초 · 0.064달러 · 쇼핑 5건(웹 문서 3~5건 뒤에 쇼핑 블록). ⚠ 시험 작업이 `ls -t` 로 파일을 골라 2단계가 한 번 더 돌았다(0.58달러) → 실행 파일을 probe/NEXT 로 고정.
- 무료 플랜: 카드 없음 · 월 5달러 · 다 쓰면 다음 결제 주기까지 막힘(종량 과금 없음, 공식 요금 페이지) — 계정 limits 의 maxMonthlyUsageUsd=5 확인.
- 앱: 검색어(2자 이상) 표 맨 아래 「네이버 쇼핑」 묶음 — 「네이버에서 불러오기」(누를 때만 · 자동 아님), 불러오는 동안 지난 결과는 흐리게(.dim) · 작은 원(.pr-nvsp, i 요소 — span 이면 머리 줄 flex:1 로 늘어나 막대가 됐다). 줄: 상품명을 nvSplit 로 자재명 · 규격(숫자 규격 · 모델명 · 색 · ~용) · 단위(수량, 「1박스(25EA)」 → 박스 + 규격 25EA)로 나눈다. 원본 열기 · 목록에 담기(s:'nv', sp · u 까지).
- 결과는 calapp/nvc/{k}(k = 띄어쓰기 뺀 소문자 검색어의 FNV 해시) 에 팀 공유 — 같은 검색어는 다시 받지 않는다. 7일 안 결과를 「새로 불러오기」하면 1회 쓴다고 확인. 왼쪽 「네이버 검색 기록」 카드(최근 30개, orderByChild('at') · .indexOn at) — 누르면 저장된 결과를 횟수 없이. 출처 카드 · 상단 건수에 네이버 결과 포함.
- 부른 횟수 calapp/nvu/{YYYY-MM}(+1 만, transaction). 한도 소진(402 · limit · usage 문구)은 「이번 달 한도를 다 썼습니다」.
- 토큰: calapp/sec/apify(팀원 읽기 · 관리자 쓰기 · apify_api_ 형식) — 설정 › 외부 연결(관리자만 · #nvCard). CSP connect-src 에 https://api.apify.com.
- 「네이버에서 담기」(붙여넣기)는 상단 막대에서 네이버 쇼핑 묶음 머리 「직접 담기」로(토큰 없어도 보임).
- 규칙 시험 AUTH-33a~m. ⚠ database.rules.json 콘솔 게시 필요 · 게시 뒤 설정 › 외부 연결에 토큰.

## 마지막 기록 기준 v1289
### 1289차 저장소 정리 · 배포본 줄이기
- HANDOFF-log.md 1.48MB → 0.31MB: 999차 이전·초기 설명 절은 걷고 git 이력 안내(`git show a446e34:HANDOFF-log.md`). HANDOFF.md 의 734~764차 참조도 그 안내로.
- widget-lite/gen(Tauri 가 빌드 때 만드는 스키마 310KB) git 에서 뺌(.gitignore).
- 폴더: scripts/price(g2b·std·wage) · scripts/jobs(acct-del·bg-sync·d60-photo-clean) · scripts/dev(지도·폰트·펫 정지 그림·안내 그림·CSS 정리) · build-single.mjs → scripts/. 직접 그린 펫 그림 vendor/pets(485개)·vendor/pets.js → assets/pets · assets/pets.js — vendor 는 외부 라이브러리만. 워크플로·시험·문서·build-single(assets 복사) 경로 모두 바꿈.
- 배포본: build-min 이 JS 를 terser 로 한 번 더 줄인다(지역 이름만 · 최상위·함수 이름 유지). app.js 배포본 1.22MB → 1.08MB. terser 는 devDependency 고정(5.51.2), pages.yml 이 npm ci --ignore-scripts.
- 시험: scripts/test/run-built.mjs — 배포본을 끼운 복사본에서 전체 시험(원본 글자를 읽는 정적 감사·계산식 읽기는 TEST_SKIP 으로 뺌). smoke.yml 에 「배포본 회귀」 단계. 로컬: 브라우저 시험 전부 통과.
- 확인 후 안 한 것: 안 쓰는 함수 후보 4개는 모두 쓰이고 있었다(rw.hwpx·rw.html·물가 비교 보고·콘솔 도구 riskAuditCSV). 이행 함수(people·defect IndexedDB·로컬 옛 모양)는 아직 남은 자료를 지키므로 유지. CSS 같은 본문 합치기는 계단식 순서를 지키는 범위에서 25개·1KB 뿐이라 안 함. CSS 공백 줄이기 7KB 도 안 함. ExcelJS 는 물가정보 엑셀 서식(머리 칸 색·테두리·틀 고정) 때문에 유지 — 쓸 때만 받는다.

## 마지막 기록 기준 v1288
### 1288차 보안 감사 2차(1287 에서 못 본 3범위) — 찾은 취약점 없음, 보강만
- 감사: price-data 토큰→위젯 릴리즈 · 파일 가져오기·붙여넣기 렌더링 · 위젯 같은 출처 이동·eval 채널. 세 범위 모두 후보 0.
- 위젯 1.6.3: 업데이트 태그가 정확히 widget-lite-vX.Y.Z/HPlanWidgetLite.exe 일 때만(「v9.9.9-x」 꼴 태그로 exe 와 해시를 서로 다른 릴리스에서 가져오는 틈). on_navigation 주소 파싱 실패 시 거부(unwrap_or(false)).
- price-data.yml: checkout persist-credentials false — 쓰기 토큰은 푸시 단계 env 에만. widget-lite.yml: 수동 실행도 main 에서만 릴리스.
- app.js: 보고서 작성기 엑셀 읽기도 readWorkbookSafe, 그림 블록 src esc, D+60 가져오기 공종·구분 표는 Object.create(null).
- 남김: 위젯 브리지·이동 범위를 /plan/ 으로(같은 출처의 다른 Pages — report 저장소 등 — 가 브리지 범위에 든다, Windows 확인 필요), 액션 SHA 고정, 업데이트 서명(공개키).

## 마지막 기록 기준 v1287
### 1287차 보안 감사(cloudflare security-audit-skill, quick) 반영
- 감사: 소스만 읽음(정찰 4 · 사냥 5 · 범위 점검 1 · 검증 5). 확인 1(낮음) · 검증 필요 3 · 기각 1. 미점검으로 남김: 파일 가져오기·붙여넣기 렌더링, price-data 토큰→위젯 릴리즈 경로, 위젯 같은 출처 이동·eval 채널.
- 규칙 calapp/people/$pid .write: 맨 앞에 MEMBER(editor·viewer) — 팀장·공구장 분기가 직급만 봐서 차단·삭제된 사람도 남의 권역·담당 현장을 바꿀 수 있었다(rules-auth AUTH-32a~c 로 재현 → 수정 후 통과).
- 규칙 calapp/archive/$sid/$iid .write: 원본 업무가 없을 때는 (기존 사본이 있거나) createdBy=나 일 때만 — 남 이름·작성자 없는 가짜 보관 사본을 심고 그걸 근거로 휴지통 사본까지 만들 수 있었다(AUTH-31a·b 재현 → 수정).
- 규칙 calapp/acctDel/$uid/by == auth.uid (AUTH-31d).
- ⚠ database.rules.json 은 콘솔에 손으로 게시 — 게시해야 위 규칙이 적용된다.
- acct-del.mjs: 공개 저장소라 Actions 로그도 공개 — 삭제한 계정 uid·이메일 대신 순번만. d60-photo-clean.mjs: 현장 이름 대신 순번.
- 위젯(1.6.2): 백업 파일 이름을 페이지가 주는 대로 쓰던 것 → hplan_NNNNNN.json(바이트 검사)만 받는다. 이름 검사 함수를 정리(prune)와 함께 쓴다.
- 물가정보 표 기준월 칸 esc. acct-del · bg-sync · d60-photo-clean · smoke 워크플로에 permissions: contents: read.
- 남긴 보강: 위젯 capability·이동 범위를 /plan/ 으로 좁히기(Windows 실행 확인 불가로 보류), 액션 SHA 고정, dfInsightHTML 허용목록, CSP firebasedatabase 호스트 고정.

## 마지막 기록 기준 v1286
### 1286차 견적 검토 「단가 대조」 · 「노무비」 · 물가정보 단가 변동 표시
**사용자: 「최근 도입한 기능으로 사용자가 체감할 업데이트 제안 · 미리보기」 → 제안 셋(단가 대조 · 노무비 계산기 · 찜 단가 변동 알림) → 「셋 다 괜찮다 시안 · 노무비 계산기는 생산성도 — 하루 몇 건 → 며칠 → 노임으로 얼마」**
- 견적 검토 방식 고르기(QC.mode: calc 계산식 · cmp 단가 대조 · lab 노무비) — 물가정보 「목록 · 단가 비교」처럼 오른쪽 막대 끝 탭(tlSeg, qcModeSeg). 처음엔 왼쪽 카드였으나 「전환탭 디자인이 다른 페이지와 다르다」로 옮김. 계산식 쪽 필터 탭은 data-qf 로 집어 qcRefresh 가 옮겨 담는다(미끄럼 표시 .sl-ind 는 떼고).
- 물가정보 단가 칸: 변동 표시가 단가 옆에 오도록 nowrap · 열 84→124px.
- GitHub 검사 두 번 실패 — 로그 파일(blob)은 프록시로 못 받아, run-all 이 GitHub 에서 실패 시험의 ✗ 줄을 ::error 주석으로 남기게 함(check-runs/<id>/annotations 로 읽힘). 원인: widget-layers 「폰 메뉴 올라오는 중 「설정」 한 번에」(0.1초 단위 타이밍)가 동시 실행 부하로 실패 → 'solo' 표시 시험은 다른 시험이 끝난 뒤 혼자 돈다. release.mjs 는 열린 PR 이 있으면 그 PR 을 쓴다.
- 단가 대조: qcPParse — 머리 줄(품명/명칭/항목/공종 + 단가)이 있으면 그 열(단가는 「합계 단가」 우선), 없으면 글 칸 첫째=품명 · 둘째=규격 · 단위 모양 칸=단위 · 마지막 숫자=단가. qcPCand — PUB 셋(g2b · sms · wage)에서 품명 낱말(앞 3→1개)로 pubFind 후 점수(단위 같음 3 · 규격 낱말 숫자 2/글 1 · 품명 낱말 1), 상위 6. 점수 3 미만 1등은 「짝 없음」. 사람이 고른 짝은 QC.pk[줄]='k:i'·'none'. 허용 ±5/10/15/20%(QC.ptol). 「보고서로 보내기」(qc.prw → RW 'pc' · qcPBlocks).
- 노무비: 줄 = 직종(시중노임 이름) · 작업량 · 단위 · 1인 1일 작업량 · 인원 → 일수 = 작업량 ÷ (1인 1일 × 인원), QC.lround(안 함 · 0.5 · 1일) 올림 → 노무비 = 노임 × 인원 × 일수 · 단위당. 1인 1일을 비우면 일수를 직접 넣는다. 입력은 다시 그리지 않고 그 줄과 합계만(qcLabSync) — 직종 · 1인 1일을 바꿀 때만 rQc. 「보고서로 보내기」(qcLabBlocks).
- 저장: TS_SAVE.qc 에 mode · ptxt · ptol · pk · pran · lab · lround 추가(이 PC IndexedDB 만). 불러올 때 pran 이면 qcPRun(true)로 짝을 다시 찾되 고른 짝은 유지.
- 물가정보: 담아 둔 공공 단가(s 가 g2b · sms · wage)를 지금 파일의 같은 이름 · 규격 · 단위 줄과 비교(prLatest, P.kx 색인) → 단가 칸에 ▲▼% (pr-chg), 고칠 수 있으면 누르면 최신값 · 최신월로(pr.upd). 물가정보를 열 때 담아 둔 출처 파일만 받고(prChgLoad), 바뀐 게 있으면 이 브라우저에 달마다 한 번 알림(calapp.prchg). ⚠ 위젯 알림은 하지 않았다 — 위젯이 단가 파일(조달청 약 600KB)을 받아야 해서 가벼움을 해친다.
- 시험(로컬): 예시 단가표 7줄 → 6줄 짝 · 1줄 짝 없음, 짝 바꾸기 · 허용 범위 · 보고서 보내기, 노무비 입력 중 초점 유지 · 올림, 새로고침 뒤 이어하기, 폰 가로 넘침 없음, 변동 ▲5.6% · ▲1.2% · 알림 · 최신값 반영.

## 마지막 기록 기준 v1285
### 1285차 릴리즈 · 시험 시간 줄이기
**사용자: 「너무 오래 걸리는 건 해소할 방안?」 → 네 가지 제안 → 「일단 다 해봐」 · 「배경화면 자동 변경 기본으로 설정되어 있지?」(예 — 고정(calapp.bgpin)이 없으면 들어올 때마다 무작위, 브라우저별)**
- 측정(1284 릴리즈): 로컬 npm test 약 320초(위젯 65 · 현안 46 · 잘림 45 · 모바일 43 · 펫 30 · 하자 23 · 무지개 13 · smoke 8 · 나머지 <5) + GitHub 검사 약 5분(그중 브라우저 준비 22초 · 회귀 게이트 4분 28초).
- ① release.mjs 는 기본으로 npm test 를 돌리지 않는다(--test 로 켬) — 같은 시험을 PR 의 smoke 가 돌리고, 실패하면 병합하지 않는다.
- ② run-all.mjs 동시 실행: TEST_JOBS(기본 CPU-1, 1~4) · 오래 걸리는 것부터 · 시험별 출력은 끝난 뒤 한 덩어리 + 걸린 초. widget-layers 포트 8527 → 8528(잘림 검사와 겹침). ⚠ `failed+=await run()` 은 await 전 값을 읽어 동시 실행에서 실패 수를 잃는다 — 결과를 변수에 받은 뒤 더한다(시험 중 실제로 FAIL 이 PASS 로 찍힌 것을 잡음). 로컬 2코어 TEST_JOBS=2: 320초 → 149초.
- mobile-fit 「데스크톱 폭 가로 스크롤 없음」: 동시 실행으로 CPU 가 바쁘면 차트 캔버스가 900ms 안에 줄지 않아 +132px 로 실패 → 맞을 때까지 400ms 간격 최대 5번 다시 잰다(넘침이 남으면 그대로 실패). 혼자 돌리면 원래도 통과.
- ③ smoke.yml: ~/.cache/ms-playwright 캐시(package-lock 해시) · 맞으면 install-deps 만 · TEST_JOBS=3.
- ④ 범위: 바뀐 파일이 모두 앱 밖(HANDOFF · README · docs/ · scripts/(test 제외) · smoke 외 워크플로 · widget-lite/ · 공공 단가 json)이면 브라우저 시험을 건너뛰고 정적 · 권한 · 정답셋 · 계산식만. 기준 TEST_BASE(기본 origin/main, main 자신이면 HEAD^1) · TEST_SCOPE=full 이면 늘 전부. ⚠ 릴리즈는 app.js 버전을 올리므로 늘 전부 — 가벼운 범위는 공공 단가 갱신 커밋(price-data) · 문서만 바뀐 경우에 효과.

## 마지막 기록 기준 v1284
### 1284차 릴리즈 스크립트(scripts/release.mjs)
**사용자: 「그래프 엔지니어링 시대 — 우리는 무엇을」 → 정답이 하나인 단계는 코드로(릴리즈부터) → 「한번 해봐」**
- `node scripts/release.mjs <회차> --title "PR 제목" --line "HANDOFF.md 한 줄" --log <블록 파일> [--widget x.y.z] [--trailer <파일>] [--no-merge] [--dry] [--skip-test]` (npm run release -- … 도 같다).
- 순서: 브랜치(main 이면 calapp-v<회차> 새로) → APP_VER · index.html app.js?v= (· 위젯 Cargo.toml · tauri.conf.json · Cargo.lock) → HANDOFF.md 맨 위 한 줄(최근 5개만) · HANDOFF-log.md 블록 → static-audit(FAIL 0 · WARN 0) → npm test(전체 결과 PASS) → 커밋(--trailer 줄 붙임) · 푸시 · PR → check-runs 모두 completed 까지 15초 간격(25분 넘으면 멈춤) → 하나라도 success 가 아니면 멈춤 → 병합 → /home/claude/out/calapp-v<회차>.zip.
- 어느 단계든 실패하면 그 자리에서 멈춘다(✗ 이유). 같은 회차로 다시 돌리면 이미 넣은 인수인계 줄 · 로그 블록은 건너뛴다(버전은 같은 값으로 다시 씀).
- ⚠ 화면 시안 · 사용자 수용 · 코드 검토(calapp-review 1번) · 서버 흉내 QA(calapp-qa)는 사람 판단이라 스크립트 밖 — 스크립트는 그 뒤 「내보내기」만.
- 시험: 저장소 사본에서 --dry(두 번 연속 · --widget 포함) — 버전 · 인수인계 · 위젯 세 파일 확인. 이번 v1284 자체를 이 스크립트로 냈다.

## 마지막 기록 기준 v1283
### 1283차 차트 툴팁 감시 누수 — getBoundingClientRect null 오류
**사용자: 오류 기록(v1282, Edge 156) 「Uncaught TypeError: Cannot read properties of null (reading 'getBoundingClientRect') @app.js?v=1282:5961」 10줄씩 두 번**
- ⚠ 배포본은 build-min 으로 주석을 걷어 줄 번호가 원본과 다르다 — `node scripts/build-min.mjs <dir>` 로 만든 사본의 같은 줄을 봐야 한다(5961 → 원본 6959).
- 원인: chTipDraw 가 캔버스마다 document mousemove(캡처) 감시를 붙이고 떼지 않았다. 하자 화면을 다시 그리면 dfC 가 차트를 destroy → Chart.js 가 chart.canvas 를 null 로 → 툴팁(#chTip.on)이 켜진 채 마우스를 움직이면 쌓인 감시 수만큼 TypeError(한 번에 10줄 = 감시 10개).
- 고침: 캔버스를 cv 로 쥐고, cv 가 문서에서 빠지면 감시를 removeEventListener 로 스스로 뗀다 · el.__pos 는 chart.canvas 가 없으면 툴팁을 닫는다 · dfC 에서 chTipHide().
- 시험: 차트 3개를 띄워 툴팁을 켠 뒤 지우고 마우스 이동 — 옛 배포본은 오류, 고친 판은 0.
- 테스트 고침: e2e-defect · mobile-fit 의 「기준월 자동 결정(전월 상한)」 기대값이 31일에 new Date().setMonth(-1) 로 이번 달이 되어 실패(10-31 → 10-01). setDate(1) 먼저. 앱 쪽 계산(6651행 부근)은 1일 기준이라 문제없음.

## 마지막 기록 기준 v1282
### 1282차 물가정보 첫 진입 안 뜸(1281 회귀)
**사용자: 「물가정보 페이지가 바로 뜨지 않음 · 다른 페이지를 연 후 다시 누르면 뜨긴 함」**
- 원인: 1281 prSub() 가 FB._on(...) 을 불렀으나 _on 은 FbStore(구독 묶음 객체)의 메서드 — FB 엔 없다 → TypeError 로 rPr 가 첫 줄에서 멈춤. FB._prOn=true 를 먼저 세워 두어 두 번째 진입부터는 prSub 를 건너뛰고 그려졌다(대신 실시간 구독은 안 붙은 상태).
- 고침: FbStore._on. 시험: 로컬 모드에서 S.live·FB.db 를 흉내(즉시 · 300ms 늦게 응답) → 첫 진입에 바로 그려지고 받은 줄이 들어옴. ⚠ 로컬 모드 시험은 S.live=false 라 prSub 를 아예 안 타서 1281 때 못 잡았다 — 구독 경로를 바꾸면 흉내 FB.db 로 확인할 것.

## 마지막 기록 기준 v1281
### 1281차 물가정보 구독을 화면 진입 때로
**사용자: 「페이지 처음 진입하면 일시적으로 버벅임 — 물가정보 때문인가? 물가정보 페이지 들어갔을 때만 되도록」 · 「국가법령정보센터 API 로 법령 검색 페이지 구상」**
- 측정(로컬 모드 · Playwright longtask/CPU 프로필): 부팅 긴 작업 149ms(app.js 1.5MB 해석) · 213ms(FullCalendar 첫 그리기). data/*.json(조달청 · 표준시장단가 · 노임)은 원래 pubFind(검색) 때만 받는다 — 부팅엔 안 받음. 실서버 부팅(구독 다수)은 여기서 재현 못 함.
- 그래도 calapp/price 구독은 부팅(FB 구독 묶음)에서 뺐다: prSub() — rPr 첫머리에서 한 번, FB._prOn. 구독을 모두 끊을 때(2350행 부근) FB._prOn=false 로 내려 다시 붙는다. 위젯은 붙지 않음. 받기 전 빈 표는 「불러오는 중」(PR.got).
- 법령 API 조사(구상만): law.go.kr/DRF/lawSearch.do · lawService.do (OC=신청 아이디, target=law·prec·admrul …). 응답에 Access-Control-Allow-Origin 없음 → 앱에서 직접 호출 불가. Actions 러너에서 OC=test 로 부르면 「서버장비의 IP주소 및 도메인주소를 등록」 요구 — 러너 IP 는 매번 바뀌어 IP 등록이 어렵다. 도메인 등록 + Referer 로 통하는지는 사용자 신청 뒤 시험해야 함.

## 마지막 기록 기준 v1280
### 1280차 위젯 — 최소 너비 · 머리 단추
**사용자: 「위젯 헤더 버튼들이 많아져서 최소 너비를 늘려야할듯 · 설정을 못누르는 케이스 · 탭으로는 가능하나 눈에 안 보임」**
- 측정(로컬 ?w=1&glass=1): 머리 = 년월 묶음 159 + 틈 8 + 단추 묶음 220 → 360 에서 설정(wid.set)이 오른쪽 밖(368~394). 400 이상이어야 다 보인다.
- widget-lite/src/main.rs min_inner_size 360 → 420 · 버전 1.6.1(Cargo.toml · tauri.conf.json · Cargo.lock). main 에 합치면 widget-lite.yml 이 widget-lite-v1.6.1 릴리스 → 각 PC 자동 업데이트.
- 옛 exe(최소 360)가 남아 있는 동안을 위해 index.html: @media (max-width:419px) body.wid 머리 틈 4 · 단추 묶음 틈 3 · .cal-nb 22px · 년월 단추 좌우 여백 2 — 360 에서 설정 끝 347. ⚠ 460px 이하 26px 규칙(6131행 부근) 뒤에 둬야 이긴다.

## 마지막 기록 기준 v1279
### 1279차 물가정보 — 붙여넣어 담기 · 검색 X · 두 열 · 필터행
**사용자: 「막대끌어도 그냥 새창이 열리지 뭐가 되진 않는데 · 직관적인 방법 필요 · 검색창에 x · 쿠팡 못 쓰면 왜 원본에서 찾기에 · 자재명 규격 2열로 · 데스크톱은 테이블 헤더에 필터행」**
- 북마클릿(1277~1278)이 실사용에서 동작하지 않음(원인 미확인 — 끌어다 놓기가 즐겨찾기로 안 들어가고 새 창으로 열림). 걷어냄(prBmCode · prBmIn · prBmOpen · #pradd).
- 대신 붙여넣기: document paste(물가정보 목록 보기 · 입력 칸 밖) → prPasteParse(text/plain 에서 「…원」 첫 가격(배송·적립·할인 줄 제외) · 소음 줄(PR_NOISE) 아닌 첫 줄을 이름, text/html 첫 http 링크를 원본, 네이버면 s=nv) → prPasteFill(단가 입력 줄 채움, 저장은 사람). 「네이버에서 담기」(pr.bm)는 네이버 쇼핑 검색 새 탭 + 표 맨 위 안내 줄(PR.pst, 붙여넣거나 X 로 닫힘). 폰(≤960px)은 단추 숨김. 비교 화면의 캡처 붙여넣기(.pc-cap)와는 갈래가 다르다(목록 보기에서만).
- 검색 X: .pr-qx(pr.qx). 보이기는 CSS :has(input:placeholder-shown) — 치는 중에 검색 카드를 다시 그리지 않으므로.
- 원본에서 찾기(PR_FIND): 네이버 쇼핑 · 조달청 나라장터만.
- 두 열: 데스크톱은 규격 열(td.pr-spc), 이름 칸 아래 span 은 숨김 · 폰은 거꾸로(규격 열 숨김). 열: 40 · 자재명 · 20% · 48 · 84 · 66 · 80 · 12.5% · 96. 새 줄도 자재명 / 규격 칸 따로(⚠ 폰에선 규격 칸이 숨는다). colspan 9.
- 필터행: 머리 마지막 칸 필터 단추(pr.fr) → tr.pr-frow(PR_FK n·sp·u·p·s·m·nt, 부분 일치 hgMatch, 단가는 >= > <= < · a~b) · 지우기(pr.ffx). 팀 줄(prRows)과 공공 줄(pubVisible) 모두. 입력 중엔 PR._fonly 로 tbody · 건수 · 출처 카드만 갈아 끼움(한글 조합 · 초점 유지). 필터행은 머리 줄 높이(--prth, prSbSync) 아래 붙박이. 폰 숨김.

## 마지막 기록 기준 v1278
### 1278차 네이버 담기 — 자리 · 사용법
**사용자: 「담기 단추 버튼 위치가 애매하고 어떻게 사용하는건지 잘 모르겠음」**
- 검색 카드 「원본에서 찾기」 줄 끝의 a.pr-bm 을 뺐다. 표 위 막대(단가 입력 왼쪽)에 「네이버에서 담기」 단추(pr.bm · .pr-bmb, 760px 이하 숨김).
- prBmOpen(): 세 단계 창 — 1 「calapp 담기」(북마클릿, 끌어다 놓으면 즐겨찾기 이름이 됨) · 2 네이버 쇼핑 검색 열기(지금 검색어) · 3 즐겨찾기 누르기. 창 안 「calapp 담기」를 누르면 안내 알림만(앱 CSP 가 javascript: 를 막는다).

## 마지막 기록 기준 v1277
### 1277차 물가정보 — 네이버 「담기 단추」
**사용자: GPT 가 쓴 구현 지침(운영비 0원 · GitHub Pages · RTDB 구조 유지 · 네이버 검색 API 종료 → 새 탭 · iframe · 브라우저 직접 수집 검토 · 무료 공공데이터 추가 조사 · Cloud Functions 는 결제 계정 필요하면 제외)**
- 검토 결과: ① 네이버 쇼핑 검색 API — 2026-07-31 종료, API HUB 로도 안 옮겨짐(쇼핑인사이트는 클릭 추이뿐). ② 앱에서 fetch — 응답에 Access-Control-Allow-Origin 없음(CORS 차단), 러너에서 직접 받으면 418(봇 차단) → 직접 수집 불가 · 서버 긁기는 약관 위반이라 안 함. ③ iframe — 앱 CSP frame-src 에 네이버 없음 · 열려도 다른 출처라 내용을 읽을 수 없어 단가가 쌓이지 않음 → 안 함. ④ Firebase Cloud Functions — Spark 에선 배포 불가, Blaze 는 결제 수단 있는 Cloud Billing 계정 필요 → 제외. ⑤ 공공데이터 추가: 조달청_공사원가_표준시장단가(CSV)는 2025-08 1회성이라 지금 쓰는 2026 하반기 PDF 수집이 더 최신 · 조달청_공사원가_자원코드는 단가 없음 · 종합쇼핑몰 품목정보는 활용신청 대기(1276).
- 담기 단추: prBmCode() 가 북마클릿 코드를 만든다(앱 주소 = location.origin+pathname). 읽는 차례 JSON-LD Product(name · offers.price) → meta product:price:amount · og:price:amount → 드래그해 고른 글(「12,300원」, 이름은 숫자 아닌 첫 줄) → og:title · 문서 제목. 새 탭 A#pradd?n&p&u&s(네이버 주소면 s=nv, 아니면 etc).
- 앱: prBmIn() — hideCover done() 뒤 한 번 + 이미 들어와 있으면 hashchange. 해시를 지우고(history.replaceState) 물가정보 · 단가 입력 줄을 열어 칸을 채운다(저장은 사람이). 가격을 못 읽으면 단가 칸에 초점.
- 검색 카드 「원본에서 찾기」 줄 끝에 a.pr-bm(끌어다 두는 링크, 누르면 안내 알림만 — 앱 CSP 가 javascript: 실행을 막는다). 폰(≤760px)은 숨김.
- 시험: 가짜 상품 페이지 둘(JSON-LD · 드래그 글)에서 북마클릿 → 새 탭 → 로컬 모드 앱에서 칸 채움 확인. ⚠ 실제 네이버 상품 페이지에서 가격을 읽는지는 아직 확인 못 함(러너는 418, 이 작업 환경은 네이버 접속 불가).

## 마지막 기록 기준 v1276
### 1276차 폰 손질 · 앱 정보 · 물가정보 공공 단가 셋
**사용자: 첨부 화면 + 「폰 현장 탭 전환 모션 · 로그인 뒤 헤더 위 배경색 남음 · 주요 현안 카드 높이 · 느낀 점 미리보기」 → 「손질 시안 수용 · 미니펫 해당 없음 · 남은 건 굳이 · 물가정보 다른 출처 왜 안 뜨는지 · 출처 숫자 · 원본 링크 · 단가 입력 취소」 → 「다나와 빼고 · 네이버 방안」 → 「띄울 수 없는 출처는 빼고 공신력 있는 출처」 → 「1·2·3 다 넣어」**
- 폰 df.tab: MV_TAB 에서 빼고 DF._tabDir 로 표(.tnav~*)만 mvIn(14*dir). 활성 탭은 nav.scrollTo 로 보이게. 로그인 뒤 상단 색: hideCover done() → shellTintRefresh(theme-color meta 다시 붙이기 + html 바탕 한 번 칠하기) — iOS 실기 미확인. #view-iss .card.iss-c 폰 min-height 0.
- 설정 「앱 정보」: set.privacy(Firebase 싱가포르 리전 등) · set.oss(라이선스 표 — 미니펫은 직접 그린 것이라 뺌).
- 외부 출처 조사: 네이버 검색 API 의 쇼핑 검색은 2026-07-31 종료(대체 없음 — 외부 정리 글·GitHub 두 곳 확인, 네이버 공지 직접 확인 못 함). 쿠팡 파트너스 API 는 누적 판매 15만 원 뒤 최종 승인(외부 글 기준) · 내부 조회 용도 약관 미확인. 다나와 공개 API 없음. 한국물가정보·한국물가협회는 유료 구독 자료 · 공개 API 못 찾음 → 출처에서 뺌. PR_OLD 에 이름만 남겨 저장된 줄은 원래 이름으로 보이고 prSk 로 「견적·기타」에 묶인다(출처 고르기·숫자). 비교 칸은 PR_SKA.
- 출처 숫자: 검색어 기준(QM) + 공공 단가 검색 결과 수(PN). 머리 합계도. 출처 카드는 .pr-srcc 로 검색어 갈래에서 같이 갈아 끼움.
- 줄 끝 단추: 원본(i-ext) · 비교 · 찜/담기. 원본 주소가 없으면 .pr-ib0 빈 자리(폰은 숨김). 출처 표는 표시만. 열 너비 마지막 104px · 비고 16%.
- PUB(공공 단가 묶음): PUB_K=['g2b','sms','wage'], 파일 data/g2b-price.json · std-price.json · wage.json. 한 줄 = [이름, 단위, 단가, 기준월, 분류 차례, 분류명, VAT, 비고, 규격(있으면 g2bName 이 그대로 씀)]. pubFind/pubVisible/pubRowsHTML/pubItem · pubLists(q) · 줄 data-k. 엑셀은 묶음마다 시트.
- 수집(.github/workflows/price-data.yml, 매달 3일 05:17 KST, 하나가 실패해도 나머지 반영): scripts/std-price.mjs — cost.kict.re.kr: GET / → /getCsrfToken(쿠키 XSRF-TOKEN) → POST /archive/list {sortData:'price'} → 최근 「표준시장단가 적용공종 및 단가」 글 → GET /file/download?fileId=&fileSeq=(1부터, fileName 쉼표 순서) → pdftotext -layout. 공종 줄은 코드 줄 위아래로 쪼개져 있어 두 코드 사이 줄을 반씩 나눠 붙이고 머리 줄 「규격」 위치로 이름·규격을 가른다. 2026 하반기 1,849공종. scripts/wage-price.mjs — cak.or.kr 건설임금 게시판 최근 「…적용 건설업 임금실태조사 보고서」 PDF, Ⅲ 개별직종 표, 「-」는 이전 공표 값 + 비고. 2026.9.1 공표 116직종. 국토부 누리집은 Actions 러너에서 접속 안 됨.
- 종합쇼핑몰 계약단가(조달청_나라장터 종합쇼핑몰 품목정보 서비스, /1230000/at/ShoppingMallPrdctInfoService): 지금 키로 SERVICE_KEY_IS_NOT_REGISTERED → 사용자 활용신청 뒤 응답 필드 확인하고 mall 묶음으로 넣는다.
- 탐색용 브랜치 probe-src(임시 워크플로 probe.yml) — 지워야 함.

## 마지막 기록 기준 v1275
### 1275차 물가정보 표 — 바깥 막대 · 머리 줄 페이드
**사용자: 「물가정보 테이블카드 오른쪽 외부에 스크롤바 만들어줘 만질수있게 · 테이블 헤더 상단에 페이드 걸리는데 그렇지 않도록」 → 「그래 진행해 · 버그 없는지 확인해보고」**
- 원인(페이드): 물가정보 표 .qc-wrap 이 공용 페이드(fadeCalc → sb-fade-t)를 받아 맨 위부터 흐려 머리 줄까지 지웠다. → #prWrap 에 data-sbh(머리 붙박이 표 규약 — --sbh 아래부터 페이드).
- 막대: prSbSync → dwSb(#prWrap,'pr-vsb',thead 높이). 막대는 .qc-right 에 붙고 CSS right:-11px 로 카드 바깥 여백에. ⚠ .pr-sb 는 왼쪽 카드 몸통 클래스라 이름이 겹쳐 pr-vsb. ⚠ #view-pr 가 overflow:hidden 이면 여백의 막대가 잘려 눌리지 않는다 → visible(폰은 기존대로 overflow-y:auto). 스크롤·창 크기·다시 그리기(두 갈래 모두) 때 동기화.
- 점검(1024·1440·1920, 폰): 검색·맨 아래·더 보기·비교 화면 왕복·다른 화면 왕복·창 줄이기·검색어 지우기 — 막대 위치(카드 오른쪽 5px 바깥)·잡기·문서 가로 넘침 없음 확인. 찾은 버그: 다시 그리면 표가 맨 위로 튐(더 보기를 누르면 처음으로) → 검색어 변경(_qonly 갈래)이 아니면 scrollTop 유지.

## 마지막 기록 기준 v1274
### 1274차 물가정보 — 조달청 칸 다듬기 · 줄 단추 정리
**사용자: 「뭘 개선해야한다고 생각하니 셀프점검해봐라」 → 「미리보기 먼저 · 간격이나 배치 정렬 문제도」 → 「찜목록 제목 숫자 · 폴더 만들기 위치 · 조달청 줄 글자가 아래로 쏠림 · NO 없음 · 삭제 자리 음영만」 → 「굳이 삭제버튼을 끝에 넣어서 조달청 가격정보 쪽까지 끝이 비게 만드는 이유 · 레이아웃 개선방안 스스로 연구」 → 「반영」**
- 수집 d 한 줄에 [6] 부가세(1 별도 · 0 포함) · [7] 납품조건 추가(g2b-price.mjs). 2026-10 자료는 5,877건 모두 VAT 별도, 납품장소도·현장도착도·공장상차도.
- g2bName(r): 품명을 「, 」로 나눠 첫 조각(+ 숫자 없는 둘째 조각)을 이름, 나머지를 규격. g2bSpec = 숫자가 있고 「숫자+한글」로 시작하지 않으면 규격. 첫 조각이 규격이면 이름은 물품분류명, 첫 조각이 분류명과 겹치지 않으면 분류명을 앞에. g2bItem 이 팀 목록 항목(n·sp·u·p·s·m·nt)을 만든다.
- g2bVisible: 팀 목록에 같은 n|sp|u|m 의 조달청 항목이 있으면 뺀다 · PR.sort 적용. pr.gcmp = 목록에 담고 비교에 넣기.
- 줄 끝 단추 둘(팀: pr.cmpt · pr.star / 조달청: pr.gcmp · pr.gadd) — 단추 수가 줄마다 같아 빈 자리가 없다. 원본은 prTagHTML(출처 표 a.pr-tl). 지우기는 prDel — ctxFor 앞단 prCtx(우클릭) · 폰은 조직 관리 길게 누르기 선택자에 물가정보 줄을 더했다.
- 표 열: 48 · 자재명 · 56 · 96 · 80 · 80 · 18% · 76. 폰은 단위·출처·기준월·비고를 접고 출처는 이름 아래(.pr-tgm). 머리줄이 두 줄로 접히면 높이를 푼다.
- 찜 목록 머리 숫자 삭제(전체 찜 줄과 겹침) · 폴더 + 는 머리 오른쪽 · 조달청 제목 줄 위아래 여백 같게 · 조달청 줄 번호.

## 마지막 기록 기준 v1273
### 1273차 물가정보 검색 — 한글 조합 끊김
**사용자: 검색 칸에 「ㅅㅓㄱㄱㅗㅂㅗㄷㅡ」 화면 + 「자음모음이 안합쳐짐」**
- 원인: input 마다 rPr → root.innerHTML 을 통째로 바꿔 #prQ 가 새 요소가 됨 → IME 조합 중인 글자가 확정되지 못하고 자모로 남는다(v1269 부터, 초점·커서를 되살려도 조합은 끊긴다).
- 고침: rPr 는 HTML 을 만든 뒤, PR._qonly(검색어 입력) 이거나 #prQ 에 초점이 있으면 .qc-right 와 .pr-lk 만 갈아 끼운다(구독 알림으로 다시 그릴 때도). 시험: CDP Input.imeSetComposition 으로 ㅅ→서→석·ㄱ→고 조합 → 값 「석고」 · 같은 요소 유지.
- ⚠ 입력 칸이 들어 있는 영역을 innerHTML 로 다시 만들지 않는다 — 한글 입력 칸은 남기고 나머지만 바꾼다.

## 마지막 기록 기준 v1272
### 1272차 물가정보 — 조달청 가격정보 자동 연동
**사용자: 「조달청 키는 내가 직접 받아야하나?」 → 「액션에 키 넣었어」(리포 Secrets G2B_KEY)**
- API: https://apis.data.go.kr/1230000/ao/PriceInfoService/{op}?serviceKey&type=json&pageNo&numOfRows. 오퍼레이션(공공데이터포털 페이지에서 확인): getPriceInfoListFcltyCmmnMtrilBildng·MchnEqp·ElctyIrmc·Engrk(시설공통자재), getPriceInfoListMrktCnstrctPcBildng·Engrk·MchnEqp(시장시공가격), getPriceInfoListFcltyCmmnMtrilTotal(inqryDiv=1·inqryBgnDate/EndDate YYYYMMDD), getCnsttyClsfcInfoList, getNetRsceinfoList, getStdMarkUprcinfoList.
- 응답 항목: prceNticeNo, nticeDt(고시일), bsnsDivNm, prdctClsfcNo·prdctClsfcNoNm(물품분류), prdctIdntNo, krnPrdctNm(품명, 규격 포함), unit, prce(글자), vatYnNm, dlvryCndtnNm(현장도착도) 등. 오래된 고시가 앞(오름차순) — 2024-10 · 2025-04 · 2025-10 · 2026-04 · 2026-10 이 섞여 온다. 시장시공가격 일부 고시는 prce 0.
- ⚠ 이 작업 환경(클라우드)은 data.go.kr 에 직접 닿지 않는다 — Actions 러너에서만 부른다. 확인은 임시 워크플로가 결과를 브랜치에 커밋하는 방식으로 했다(지움).
- scripts/g2b-price.mjs: 6개 오퍼레이션 전부(쪽당 500) → 품명·단위(비교 키는 nk 로 * x × · ㎜ mm · 괄호 정규화)·분류별 최신 고시만, 0원 제외, 최신 고시월에서 12개월 넘게 재고시 없는 품목 제외 → data/g2b-price.json {at, c[분류 6], d[[품명, 단위, 단가, 고시월, 분류, 물품분류명]]}. 첫 수집: 호출 77 · 행 36,920 · 5,877건 · 약 0.5MB(gzip 약 0.1MB).
- .github/workflows/g2b-price.yml: 매달 3일 20:17 UTC + 수동. 파일이 바뀌었을 때만 main 에 커밋. GITHUB_TOKEN 커밋은 push 로 다른 워크플로를 깨우지 않아 pages.yml 에 workflow_run(g2b-price 성공) 을 더했다.
- 앱: G2B 상태 · g2bLoad(처음 검색 때 fetch, cache no-cache) · g2bFind(띄어 쓴 낱말 AND, 초성은 getChoseong 미리 계산, 한영 convertQwertyToHangul, 최대 500) · g2bRowsHTML(팀 목록 아래 「조달청 가격정보 n건 · 갱신월」, 40줄 + 더 보기 80줄씩) · pr.gadd(품명을 첫 「, 」에서 자재명/규격으로 나눠 팀 목록에 s:'g2b'). 이미 담은 것은 ✓. 출처 필터 조달청을 끄거나 찜 폴더를 보고 있으면 숨김. 팀 목록 검색도 낱말 AND(hgMatch 를 낱말마다).

## 마지막 기록 기준 v1271
### 1271차 동기화 끊김 띠 — 물가정보 구독 거절 · 띠 글 겹침
**사용자: 폰 달력 위 띠(새로고침 단추) 글자가 겹친 화면 + 「버그 확인 필요」**
- 원인 ①: v1269 에 넣은 _on('calapp/price') 에 onErr 가 없었다. Firebase 콘솔에 규칙을 게시하기 전이라 읽기가 거절 → _on 기본 처리 syncLost → 앱 전체에 「실시간 동기화가 끊겼습니다」. ⚠ 새 경로 구독은 규칙 게시 전 배포될 수 있으니 onErr 로 따로 받는다. 지금은 PR.denied → 물가정보 목록 빈 칸에 「서버 저장 규칙이 아직 게시되지 않아…」.
- 원인 ②: #syncLost 에 line-height 가 없어 body{line-height:0} 을 물려받음 — 폰 폭에서 두 줄로 접히면 줄이 겹친다 → line-height:1.45.

## 마지막 기록 기준 v1270
### 1270차 물가정보 — 메모 대신 찜 이름 · 줄 펼침 삭제
**사용자: 「메모 기능은 굳이 싶다 · 차라리 제목을 적는게 어떨지」(→ 찜 항목 이름) · 「목록 펼쳐서 물가변동이나 이런거 볼필요가 있을까 — 필요없는거같은데」**
- 삭제: calapp/price/memo(앱·규칙·시험), prHist·prSpark(달별 기록), 펼침 줄(.pr-dt) · PR.open.
- 찜 pin/{id} = {f, t}: f 폴더 id 또는 '_', t 찜 이름(1~40자). prPv 가 옛 글자 값(폴더 id)도 읽는다. prPinSet(id,f,t) — t 를 안 주면 지금 이름을 지킨다(폴더만 옮길 때). 이름을 적으면 찜도 된다.
- 찜 창 #prPop(body 에 붙는 fixed 창): 별 단추 아래(모자라면 위). 창 밖 mousedown(캡처)에서 이름 칸을 먼저 blur 해 change 로 저장한 뒤 닫는다. 화면 이동(go)·Esc 도 닫는다. prTyping 은 #prPop 입력 중에도 구독 다시 그리기를 미룬다.
- 줄 끝 단추: 원본 · 비교 · 별 · 지우기(prCanEdit, 데스크톱은 줄에 올렸을 때만).
- 규칙 pin: hasChildren f · f 는 '_' 또는 있는 폴더 · t 길이 · 다른 칸 거절. rules-auth AUTH-30j(이름 41자)·30k(다른 칸)·30n~p. ⚠ 배포 뒤 Firebase 콘솔에 database.rules.json 게시.

## 마지막 기록 기준 v1269
### 1269차 업무 도구 — 재하자 추적·생산성 검토 삭제 · 보고서 작성 · 물가정보
**사용자: 「재하자추적하고 생산성검토 도구를 삭제하고 보고서 작성과 물가정보를 추가하자 / 공문 대장은 여기서 할일은 아니다 / 보고서 작성은 폰트 변경, 크기, 굵게 등 서식기능을 강화 · 블록카드 세분화 · 한글이나 엑셀에서 쓸만한 기능은 다 넣으면 된다 / 둘다 외부로 자료를 추출하는 버튼은 헤더쪽에」 → 「팀 저장 > 찜 목록 · 분류별 폴더 · 출처 더 넣을 곳」 → 「일단 커밋하고 추후에 출처를 추가할 수 있게」**
- 삭제: 재하자 추적·생산성 검토 코드·화면·CSS·아이콘(i-redo·i-prod)·TS 저장 키(tl). 공용은 tlSeg·tlEmpty·tlSaveWb 만 남김.
- 보고서 작성 RW={tpl,files,open,blocks,sel,edit,uid,pg:{or,mg,num,band,font},hist,fut,ts,range,ce}. 블록 {id,k,d}: hdr·sec·h2·p·box·note·two·kpi·tbl·chart·img·sign·hr·pb. 쪽은 .rpt 양식(1px=1pt) — rwPaginate 가 높이를 재서 A4 에 나눈다(절 제목 홀로 남지 않게 · pb 는 새 쪽). 서버 저장 없음.
- 서식: execCommand(styleWithCSS) + 크기는 fontSize 7 → span px 로 바꿔 pt. 띠 mousedown 은 preventDefault 로 편집 칸 선택을 지키고, select·팔레트는 RW.range 로 선택을 되살린다. ⚠ 다시 그릴 때 초점 칸이 지워지며 오는 focusout 이 옛 글로 값을 되덮는다 — RW.drawing 동안 무시.
- 표 d={rows[[{h,cs,rs,m,bg,al,va}]],head,bd(h·all·out·none),w(%),num(열),agg(sum·avg)}. 칸 끌기·Shift 로 범위(RW.ts). 병합은 이미 병합된 칸이 섞이면 거절. 행·열 넣기/빼기는 rwAnchor 로 병합 범위를 지킨다. 숫자 판정 rwNum 은 끝 단위(원·건·%…)를 떼고 본다.
- 내보내기: 인쇄 #rwPrint + body.rw-printing(@page 가로/세로) · HTML(.rpt·.rw- CSS 를 시트에서 모아 넣음) · 한글 hwpxjs.htmlToHwpx(문단·표, 차트는 값 표).
- 물가정보 calapp/price: items/{id}{n,sp,u,p,s,m,url,nt,by,at} · memo/{id}/{mid}{t,by,at} · fold/{fid}{n,by,at} · pin/{id}=폴더 id 또는 '_'. 찜은 자재·규격·출처 단위(prPinMap — 달이 바뀐 기록도 같은 찜). 출처 PR_SRC 7종, prSrc(k) 는 목록에 없는 키도 키 이름으로 보인다 → 출처를 늘릴 땐 PR_SRC 한 줄(규칙은 /^[a-z0-9]{1,12}$/).
- 규칙 price: 읽기 MEMBER · 단가·메모·폴더는 넣은 사람·관리자만 고치고 지움 · 찜은 있는 폴더나 '_'. rules-auth AUTH-30a~q. ⚠ 배포 뒤 Firebase 콘솔에 database.rules.json 게시.
- 조달청 나라장터 가격정보현황서비스(OpenAPI)는 인증키가 필요 — 사용자가 공공데이터포털에서 받아 저장소 Secret 에 넣으면 GitHub Actions 월 1회 수집으로 붙인다(다음 회차).

## 마지막 기록 기준 v1268
### 1268차 조직 — 직무(건축·설비·전기·조경·원가·안전) · 권역 「전체」
**사용자: 「지금까지 팀원을 다 건축 담당자만 넣었는데 설비나 전기 담당자도 있어서 — 직급이나 권역으로 분리하긴 어렵고 따로 분류를 줘야 할 듯. 건축 설비 전기 조경, 원가 안전도 그 분류로, 직급은 다른 곳과 동일하게 팀장 공구장 담당자」 → 묻기: 설비·전기의 권역·현장 = 「팀마다 나뉘기도, 한 사람이 팀 전체를 맡기도」 · 업무 탭 = 「권역 탭에 섞기」 → 시안(아티팩트, 실제 앱 로컬 모드) → 「공종 > 직무로 해서 적용」**
- 데이터: people/{id}/trade(mech·elec·land·cost·safety, 건축은 없음). RANKS 는 head·lead·member. tradeOf(p) 는 옛 rank safety·cost 도 읽는다. cleanPerson 은 옛 rank 값을 그대로 둔다(본인 저장이 직급을 바꾸면 규칙이 거절), keepPerson 이 trade 를 넘기지 않은 저장(담당 현장·권역)에서 trade·옛 rank 를 보존. peopleMigrate: 관리자 접속 때 옛 rank → member + trade(people 구독 · 첫 업무 스냅샷 9초 뒤).
- 팀 단위 판정 isTeamRank(rank) → isTeamP(p)(팀장 · 직무 원가·안전), rankUses → usesOf(p). 업무·조직 탭 라벨 teamLabel(팀장 / 원가 / 안전), 정렬 직급 → 직무 순.
- 권역 「전체」 REG_ALL='*': inRegion(p,rid) — 업무 탭·조직 탭·regionMembers·권역 카드 건수에 함께. tkRegionOf: 「전체」인 사람의 업무는 업무 현장의 권역(현장 없으면 팀). 담당 현장 고르기는 모든 권역. 위젯 4주 아래 칸: 공구장 「전체」면 모든 현장.
- 계정 표: 「직무」 열(관리자 select, 그 외 글자) · 권역 select 끝에 「전체」. 현장 표 담당자 칩: 비건축은 이름 옆 직무(.own-tr). siteArchOwner — 지도 색·범례는 건축 담당 우선. d60Owner 도 건축 담당자 우선.
- 규칙: people/trade .validate(5값) · 본인(최초엔 trade 없음 · 이후 불변) · 팀장·공구장(남의 trade 불변) · sites 검증에 「쓰는 사람 권역이 * 이면 orgSiteRegion 에 있는 현장 모두」. rules-auth AUTH-29a~g.
- ⚠ 배포 뒤 Firebase 콘솔에 database.rules.json 게시 필요(게시 전엔 trade 저장 거절).

## 마지막 기록 기준 v1267
### 1267차 폰 하단 탭 「업무 현황」 — 업무 도구처럼 시트에서 고르기(주요 현안 포함)
**사용자: 「모바일에서 주요 현안을 하단 탭 주요 업무에서 선택해서 들어갈 수 있도록 배치」 → (업무 현황 화면 위 전환 탭에 「주요 현안」 칸을 넣던 안을 보고) 「주요 업무 페이지 내 탭으로 접근하는게 아니라 업무도구와 같은 방식으로 적용」**
- mtasksOpen(): #mss 시트(머리 「업무 현황」) — MTK 주간 업무(i-cal-ck) · 현장별 업무(i-layers) · 주요 현안(i-board), 지금 보고 있는 것에 act. 시트에 tk 클래스(mssClose 가 뗌) — mtab.go 의 wasOpen 이 'tk' 를 구분해 열린 채 다시 누르면 닫고 끝.
- mtab.tk: iss → go('iss'), week/month → S.tkView·tkNew·tk.m 을 tk.view 와 같게(주간은 예정 주가 든 달) 맞추고 업무 현황으로.
- mtabSync: S.view iss 도 tasks 칸. 메뉴 시트(mmenuOpen)의 「주요 현안」 줄 삭제.
- 확인(390px): 업무 현황 칸 → 시트 → 주요 현안(S.view iss · 칸 켜짐) / 현장별(tasks month) / 열린 채 다시 누르면 닫힘 / 업무 도구 시트와 오가기.

## 마지막 기록 기준 v1266
### 1266차 프로필 미니펫 — 이름 표기 · 판 높이 고정
**사용자: 「프로필에 캐릭터 > 미니펫으로 표기 · 펫 밑에 이름 넣고 · 선택 팝업이 이모지나 배경색 높이와 동일해서 달라지지 않도록」**
- acx-seg 「캐릭터」→「미니펫」(값·클래스 m-chr·pet: 접두는 그대로).
- pfChrRender 칸: img 아래 <span>이름</span>. .pf-em 세로 묶음 63px, 이름 10.5px/13px · nowrap 말줄임 · T2 색.
- .pf-cg 높이 154→130px(이름 칸 2줄 + 간격) — 판(#pfPop) 높이가 이모지·배경색 202px 와 같아짐(전엔 226px). 3줄째부터 굴림.

## 마지막 기록 기준 v1265
### 1265차 위젯 펫 — 사내 인물 5종
**사용자: 「사람에 회사사람들도 넣어보면 어떨까 매니저 책임매니저 팀장 / 미리보기부터」 → 「신입사원과 임원 넣자」 → 시안 아티팩트(위젯 위에서 도는 미리보기)로 머리·얼굴을 여러 차례 고친 뒤 「이제 적용하자 · 상호작용 잘 넣고 너무 길진 않게 · 던지기는 커피가 기본, 보고서도 괜찮을 듯」**
- 그림: 관리자(manager) 프레임을 한 장씩 다시 칠함 — 머리 0~9줄은 25칸 템플릿, 10줄 아래는 얼굴 위에 얹는 덧칠 줄(빈칸·점은 원래 픽셀). 턱은 한 칸씩 안으로 둥글게(네모 턱 방지), 귀는 왼쪽 한쪽만 얼굴 선 안쪽에 그늘. 옷깃 줄(셔츠 흰색 첫 줄) 기준 넥타이·배지·행커치프·사원증.
- 5종 머리를 실루엣으로 구분(색만 다르던 매니저·책임·팀장을 다시 그림): 신입(여) 7:3 생머리(어깨 아래까지, 목 뒤 뒷머리 채움) · 매니저 덮은머리(앞머리가 이마를 덮음) · 책임 7:3 가르마에서 쓸어 올린 머리(앞이 솟고 결이 비스듬히, 안경) · 팀장 납작한 2:8 반백(흰 빗질 결, 짙은 눈썹·행커치프·넥타이핀) · 임원 은발 올백(보라 넥타이·금배지, 손에 든 것 없음).
- 던지기 it: 신입·매니저·임원 coffee, 책임·팀장 report(새 그림 it-report.png 32px — 집게 달린 서류·표·도장, PET_IT_SZ 18). fd: 책임 「잘 받았어요·검토 들어갑니다」, 팀장 「결재 완료!·수고 많았어요」.
- pet.js: OFC 집합 → kind 'ofc'. PAIR 15쌍(모두 두 줄: 팀장↔신입·책임·매니저·관리자, 임원↔팀장·신입·책임·상담사, 책임→매니저, 매니저→신입, 신입→믹스커피·프린터, 팀장→도장, 책임→노트북, 회의보드→매니저). RULES: ofc→현장 사람(ppl·lead·mgr·sig) 「현장 고생 많아요」, 사무 펫 방문 규칙에 ofc 포함.
- av-<키>.png 다시 생성(scripts/pet-av.py). 프로필 캐릭터 탭은 CALAPP_PETS 를 읽으므로 자동 포함.

## 마지막 기록 기준 v1264
### 1264차 캐릭터 아바타 시각 중심 · 현안 아바타 즉시 갱신
**사용자: 「캐릭터가 원 정 중앙에 배치되지않음 기계적인 중앙이 아니라 시각적으로 중앙에 있어야함 · 교체하면 주요현안 프로필이 즉각적으로 안고쳐짐」**
- 원인 1: <키>-t.png 는 고르기 칸용이라 그림 둘레 여백이 고르지 않다(예: 상담사 104×108 중 그림은 x 4~80 — 오른쪽이 비어 왼쪽으로 쏠림 · 발밑 기준선 정렬). object-fit 가운데는 캔버스 가운데일 뿐.
- 처리: scripts/pet-av.py 가 펫마다 그림 영역(bbox)과 알파 무게 중심을 재서 가로 = 0.6·무게중심 + 0.4·bbox 가운데, 세로 = 0.35·무게중심 + 0.65·bbox 가운데를 정사각형(여백 4px) 한가운데에 둔다 — 크기 조정 없이 붙여 넣기만(픽셀 유지). avInner 는 av-<키>.png. 원 75개를 나란히 그려 확인(전·후).
- 원인 2: acctSave 성공 뒤 rAcct·rOrg·rTasks 만, users 구독도 rOrg·rTasks·rDay·달력·위젯·하자 사이드바만 다시 그려 rIss 가 빠져 있었다 → 둘 다 rIss() 추가(입력 중이면 rIss 가 알아서 미룸).
- vendor/pets.js 머리 주석에 av 규칙, pets.mjs 「그림 파일 누락 없음」 에 av-<키>.png.

## 마지막 기록 기준 v1263
### 1263차 프로필 캐릭터 — 75종 전부
**사용자: 「사람뿐만 아니라 모든 분류를 다 쓸수있게 해주면 안될까」**
- AV_PETS(사람 15종 고정 목록) 삭제 → window.CALAPP_PETS(vendor/pets.js) 의 c 분류로. pfChrRender: 목록이 없으면 「불러오는 중…」 + loadScriptOnce('vendor/pets.js?v='+APP_VER) 뒤 다시 그림 · 실패 문구. 분류 PF_CCAT 기본은 지금 쓰는 캐릭터의 분류, 없으면 사람.
- avPetKey: /^pet:([a-z][a-z0-9-]{0,15})$/ — 목록을 받은 뒤엔 CALAPP_PETS 에 있는 키만. 썸네일은 P[k].t.f, 아바타는 <키>-t.png(모든 펫이 이 이름).
- avOf: 아이콘 12자 상한(이모지 묶음 기준)에 캐릭터 값 예외 — 9자 키(excavator·tr-window·of-laptop 등)가 잘리지 않게. 규칙(avIcon 24자)은 그대로.
- CSS: .pf-chr 를 세로 묶음(분류 칩 .pf-ccats + .pf-cg 5열 154px 굴림).

## 마지막 기록 기준 v1262
### 1262차 프로필 아바타 「캐릭터」 탭
**사용자: 「펫의 리소스를 다른 곳에 활용할만한 부분」 → 미리보기 ①공종 아이콘 ②빈 상태 그림 ③프로필 캐릭터 ④완료 하트 → 「3번 프로필만 적용하는게 맞다」. ①은 금속·방수·수장 그림이 없어 상위 공종에 빈칸이 생기는 문제가 미리보기에서 보였음**
- AV_PETS(사람 15종: manager·lead·worker·signal·guide·paperer·floorer·tiler·painter·caulker·plaster·glazier·plumber·angry·cs) · avPetKey(icon) — 「pet:<키>」 이고 목록 안일 때만. avInner 가 img.av-pet 을, 아니면 기존 이모지·기본 아이콘. avOf 의 12자 상한 안(가장 긴 키 11자).
- 계정 창: acx-seg 3칸(emo·chr·col), #pfChr(5열) 은 m-chr 일 때만 · m-chr 은 이모지 분류·이모지 판·팔레트·직접 고르기를 숨김. pfMode 의 미끄러짐 방향은 탭 순서로. pf.pick 의 .on 은 #pfEmg·#pfChr 둘 다.
- acctSave: 캐릭터 값은 최근 이모지(prefs.emoji)에 넣지 않는다(이모지 판에 「pet:…」 글자가 뜨지 않게).
- 확인: 데스크톱·폰에서 캐릭터 탭 → 고르기 → 아바타 즉시 교체 · 배경색·이모지 탭 오가기 · 다른 사용자 캐릭터가 현안 카드 머리에 나옴(캡처).

## 마지막 기록 기준 v1261
### 1261차 견적 검토 — 식 중간 라벨 · 중첩·다른 괄호 · 비례식 꼴
**사용자: 「견적검토에 수식 중간에 PD 이런식으로 문구가 들어가면 인식을 못하고 비례식도 계산을 못해줌 괄호가 이중으로 쳐져도 잘 못보는듯」**
- 재현(가상 산출서 31건): 라벨 4건 · {}·[]·전각 괄호 3건 · 곱하기 빠진 괄호 2건 · 「- 항목」 다음 줄 맨 식 1건 · 비례식 「X = 값」 체인 · 「∴」 · 「→」 3건이 「읽을 수 없는 줄」. 순수 (( )) 중첩은 원래 읽었음 — 사용자 말한 「이중 괄호」는 { [ ( 섞임·곱하기 생략일 가능성이 높아 둘 다 처리.
- qcPre(s): 괄호 통일 + 라벨 걷기(빈칸 치환). qcEval 은 단위 걷기 → qcPre → ×÷ → 「수 빈칸 수」 거절 → 빈칸 제거 → 암시 곱. 이어지는 줄·맨 식 줄 판정도 qcPre(qcClean(s)) 로.
- qcRatio: ∴ → => 를 빈칸으로, 「:X = 값」 을 「:X, X=값」 으로. qcLine: 비례식 다음 줄 「∴ x=」 「→ X=」 도 이어 붙임.
- scripts/test/qc-parse.mjs 신설(브라우저 없음, 12건) · run-all 「견적 검토 계산식 읽기」.

## 마지막 기록 기준 v1260
### 1260차 펫 시험 병렬화 · 배관공 대본 줄임 · 로컬 전체 회귀 생략
**사용자: 「제안 2번도 수용」 → 펫 시험 구간 측정(짝 32초 44% · 표본 순회 21 · 던지기 13) → 「진행해 · 배광공 배관 대본 좀 줄이고」**
- pet.js: JOB 공통 대본(오늘 너 보수한다! / 살살 해주세요~ / 💪 3줄) 중 plumber 만 빼고 PAIR 에 ['plumber','tr-pipe',[[0,'배관 손볼게!',1300],[1,'뻥 뚫렸다!',1200,2]]].
- pets.mjs: 3) 짝·4) 던지기를 Promise.all(창마다 새 context) — 결과는 PAIRS 순서대로 ok. bubbles 상한 30→40회(동시 실행 여유). 5) 순회는 pick 을 i%4 로 나눠 창 4개. 측정: 전체 모드 48~53초(3회 PASS).
- 작업 방식(제안 2): 로컬은 static-audit · rules-auth · 바꾼 영역 시험만 돌리고 run-all 은 CI(smoke, PR) 에 맡긴다.

## 마지막 기록 기준 v1259
### 1259차 테스트 경량화 — CI 중복 실행 정리 · 펫/위젯 시험 대기 줄이기
**사용자: 「테스트도 경량화할 필욘 없을까」 → 측정(전체 약 8분: pets 186초 · widget-layers 91초 · clip 48 · iss 47 · mobile-fit 45 · e2e-defect 27 · 나머지 36) 뒤 제안 1·3 「진행하자」. 제안 2(로컬 전체 생략)는 보류**
- smoke.yml: on push(main) + pull_request — 전엔 [push, pull_request] 라 PR 브랜치 push·PR·main 병합 push 로 배포 한 번에 3회. checkout fetch-depth 0(pets.mjs 의 main 비교용).
- pets.mjs: page() 는 .wgPet 수가 맞을 때까지(최대 15초) + 300ms. 던지기는 .wgBall 이 사라질 때까지(최대 9초) + 600ms(먹기). 5) 전체 순회는 git diff origin/main...HEAD + 작업 트리에 pet.js·vendor/pets 가 있거나 PETS_FULL=1 이면 25묶음 전부, 아니면 처음·끝·i%6===3 묶음(6개). git 비교가 실패하면 전부.
- widget-layers.mjs: until(pg,f) — ST 를 40ms 마다 보며 최대 1.5초. 위젯·데스크톱 층 루프와 편집기 바깥 클릭에 적용, clickOutside 의 350ms 고정 대기 삭제. 「Esc 1회는 확인창만」은 확인창이 닫힌 뒤 120ms 더 보고 아래 층이 남았는지 확인.

## 마지막 기록 기준 v1258
### 1258차 셀프 리뷰 적용 4 — UX
**사용자: 셀프 리뷰 「U13 U10 U9 제외하고 모두 적용」 — UX 묶음(전후 캡처로 확인, 미리보기 전달)**
- U2 하자 목록(rec-tbl): table-layout:fixed 에서 접수내용(w:null)이 남는 폭을 받는데, 현장 열(152)이 붙으면 고정 열 합이 min-width 1180 을 넘어 0px — 표 min-width 를 열 폭 합 + 260 으로 계산(인라인).
- U3 조직 현장 표: #sitePane .mgtbl min-width 1120 · 1·2·8열 최소 폭(권역 고르개가 꺾쇠만, 현장명이 「현장」으로 잘리던 것).
- U4 회의 03: ↓ 가 끝 현장이면 다음 담당자 칩(ACT mtg.who) · ↑ 가 첫 현장이면 앞 담당자 끝 현장. 담당자 안에서는 그대로 순환.
- U5 #bkCard 를 모두에게 — .bk-ed(내보내기·되돌리기) 줄만 관리자. 휴지통 읽기는 1085 규칙 범위(trashAll)가 이미 사용자별.
- U6 mssOpen: mySites() 현장을 「내 담당 현장」 묶음으로 맨 위, 아래 권역 묶음에서는 뺌.
- U7 issCard: 현안 0개·입력 중 아님 → .emp(min-height 0 · align-self start).
- U8 d60 데스크톱: 예정(fin·prog 아님) 점검일 칸에 small.d60-dd(D-n · D-DAY · D+n 빨강). 열 폭 8/12/11/15/12 + 공종 10.5.
- U11 현장 KPI 카드·현장규모 메타 「· 준공 YYYY-MM-DD」.
- U12 추이 차트: 접수 꺾은선 끝 값 align -35/-145(위), 처리 35/145(아래) · 막대 합계는 1번째·n-2번째 생략.
- U14 빈 상태: 「데이터 없음」→「자료 없음」, 「표시할 자료가 없습니다.」, 「~없습니다」 문장에 마침표.
- U15 사이드바 「업무 도구」 .sbsl-tg(nav.tools) — body.sb-tools-off 면 .nvi.nvt 중 보는 것만 남김(961px 이상, 접힌 레일 제외). 저장값 calapp.sbTools(1/0), 없으면 높이 820 미만에서 접힘.

## 마지막 기록 기준 v1257
### 1257차 셀프 리뷰 적용 3 — 성능
**사용자: 셀프 리뷰 「U13 U10 U9 제외하고 모두 적용」 — 성능 묶음(화면 변화 없음)**
- `:has()` 상태 선택자 → 클래스: 유리 위젯 html.wid-glass(boot-wid.js), 인쇄 html.rpt-on·df-printing·phs-printing·d60-printing(prCls 한곳), 사이드바 접힘 body.sb-mini, 로그인 배경 출처 body.bg-cr.
- refetchCal: 일정 서명이 지난번과 같으면 건너뜀, 제목만 바뀐 일정은 setProp. 계산한 목록은 CAL_EVS·CAL_PRE 로 events 콜백과 공유.
- users 구독: 이름·메일·avColor·avIcon·역할 서명이 같으면 다시 그리지 않음. rOrg 는 조직 화면일 때만(아니면 들어갈 때 그림).
- 달력 칸당 일정 수 calN 을 localStorage 에 두어 첫 그림부터 dayMaxEvents 맞춤(calFitApply 가 갱신).
- xlsx 지연 로드 주소 ?v=0.20.3 고정(캐시). 펫 깊은 잠 진입 IDLE_MS 60초.

## 마지막 기록 기준 v1256
### 1256차 셀프 리뷰 적용 2 — 규칙 좁히기 · 게시 무결성 · CSP
**사용자: 셀프 리뷰 「U13 U10 U9 제외하고 모두 적용」 — 보안·무결성 묶음. ⚠ database.rules.json 을 Firebase 콘솔에 먼저 게시해야 한다(규칙과 앱 변경은 양쪽 순서 모두 호환)**
- D+60 insp/$sid: .write 를 관리자(ED)로, 멤버 쓰기는 date · dates/$tr · phb · fin/$tr · hide/$tr · units/$u · res/$tr/$k · civil/$tr/$id 에 둠. 앱은 늘 칸 경로(d60Write·d60WriteMany·d60Inc)로 쓰고, 현장 통째 쓰기는 백업 복원(관리자)뿐.
- 휴지통·보관함: null(영구 삭제·복원 뒤 걷기) 분기에서 「사본의 현장이 내 담당」 조건을 뺐다 — 작성자·담당자(assignees)·팀장·같은 권역 공구장·관리자만. 휴지통 새 사본은 원본 업무가 없으면 보관 사본이나 기존 사본이 있을 때만(원본 없는 트리에 가짜 사본을 심어 복원 때 남의 업무로 만드는 것 차단) — 원본이 있으면 전과 같은 소유 검사.
- people.sites: orgSiteRegion 에 없는 현장 id 는 거절(전엔 「미러가 없으면 허용」). 업무 assignees `$pid` 와 links `$lid` 키 형식, hist `$h` 는 0~19(앱이 20개로 자른 배열).
- 업무 생성: 관리자 외 신규는 createdBy == auth.uid. 앱(putTask 신규 set·moveTask 새 자리)은 작성자가 없는 옛 업무를 되살리거나 옮길 때 나로 채운다.
- 현안: $iid validate 에 현장 미러 존재 + 새로 만들 때 by == 나(관리자 외). ⚠ 부모($sid) validate 는 자식 쓰기 때 돌지 않아 $iid 에 둔다.
- 계정 삭제 요청: acctDel/$uid validate 에 users/$uid/role != editor — 같은 쓰기에서 users 를 지워도 root 는 쓰기 전 값.
- 개인 설정 prefs: 상위 읽기(MEMBER)를 지우고 $uid 에 본인만 읽기.
- 게시: 시작 때 report/{rm}/_meta 를 읽어 다른 사람이 게시한 시각보다 이 PC 업로드(DFMETA.lastUp)가 오래된 현장은 _hasRows 에서 빼 서버 게시본 유지 — 확인창에 빨간 「서버가 더 새것 · 유지」. 쓰기 전에 _meta/lock 트랜잭션(다른 사람 잠금이 10분 안이면 중단·안내), 마지막 _meta 통째 쓰기로 풀리고 실패하면 finally 에서 지움. 게시 번호로 읽는 쪽에서 섞임을 알리는 것(pubId)은 하지 않음 — 잠금으로 동시 게시는 막고, 중간 실패는 다시 게시하면 맞춰진다.
- CSP: script-src 의 https://www.google.com → https://www.google.com/recaptcha/(App Check 엔터프라이즈 스크립트 경로). *.firebasedatabase.app 는 RTDB 롱폴링(JSONP) 대비 유지.
- 보류: 위젯 원격 허용 주소를 /plan/* 로 좁히기 — 위젯 판을 올리면 전 PC 자동 업데이트라 실기(Tauri)에서 이벤트 브리지 확인 뒤에.
- 테스트: rules-auth AUTH-20a~28(18건). 가짜 Firebase(e2e-defect·mobile-fit·guide-shots)에 remove·transaction. e2e-defect·mobile-fit 의 게시 승인 헬퍼는 이번 게시의 확인창(__PUBOK__ 새로 걸림)이 뜰 때까지 기다린다 — 게시 앞에 await(서버 _meta 읽기)가 하나 늘자 닫히는 중인 앞 확인창 단추를 눌러 이번 게시가 영영 기다리던 시험 경합이 드러났다.

## 마지막 기록 기준 v1255
### 1255차 안정화 묶음 — 구독 끊김 알림 · 재게시 캐시 · 부팅 방어 · 로그아웃 · 닫기 전 저장 · 업무 내용 보존
**사용자: 「이제 신기능보다 안정화·기존 기능 개선 · 셀프 리뷰 · 기능 개선은 미리보기」 → 네 갈래 점검 보고(안정성·보안/무결성·성능·화면) → 「U13 U10 U9 제외하고 모두 적용」 — 안정화(1255) · 규칙(1256) · 성능(1257) · 화면(1258) 순으로 나눠 올림**
- 구독 끊김(syncLost): FbStore._on 의 기본 오류 처리(전엔 console.warn)가 띠를 띄운다 — 「실시간 동기화가 끊겼습니다 · 지금 보이는 자료는 최신이 아닐 수 있습니다 [새로고침]」. 데스크톱은 위 가운데, 위젯은 아래(머리 줄을 가리지 않게). 한 번만. users 구독은 자체 오류 처리(수동 명부 대체) 그대로.
- 자료 미수신 감시: onAuth 의 _dbWatch 가 `if(S.live)return` 이라 enterLive 뒤엔 늘 그냥 끝났다 → 업무 첫 스냅샷 플래그 FB._gotData 로 판정, 20초 안에 안 오면 syncLost.
- 재게시: reportIndex 구독이 이전 값과 비교해 같은 달 시각이 바뀌면 dfInvalidate(rm) — DF.cache·kpi/sw/sam/vac·_pubAt 를 버리고, 하자 화면이면 다시 그린다. 게시한 PC 의 무효화도 같은 함수. DF.rmIdx 도 구독 값으로 갱신.
- 부팅 방어: LocalStore.init 을 try 로 감싸 실패하면 원본을 calapp.v1.bad 로 남기고 비우고 시작, migrateOrg 는 arr(), toDate 는 String(ds). 재현 스크립트(teams 객체·숫자 날짜)에서 대조군과 같게 로그인 폼까지 뜸.
- 로그아웃: 로그인 상태였던 창의 exitLive 는 location.reload() — siteConfig·reportIndex·연결 감시·아침 확인 플래그를 하나하나 되돌리지 않는다(로컬 모드는 그대로). 접속 중 role 이 blocked 로 바뀌면 부팅 캐시를 지우고 signOut, 새로 연 로그인 화면에 sessionStorage calapp.flash 로 이유 한 번.
- 로그인 판정 겹침: onAuth 를 같은 uid 진행 중 약속으로 묶음(onAuth0 이 본체) — users/{uid} 통째 쓰기 두 번 방지.
- 닫기 전 저장: pagehide·beforeunload 에서 자동 저장 대기(PE_SAVE)면 즉시 저장(run 시작에 PE_SAVE=null). 위젯이 아니고 연결이 끊긴 상태면 닫기 경고.
- 업무 내용 보존: cleanTask 가 plan(옛 「내용」)을 버려 휴지통 복원·보관함·담당 이동·마감 이전 뒤 사라짐 → 보존.
- 현안: 내용·목표일·해결 표시는 issPatch(칸 update, null 은 지움) — 지워진 현안에 칸만 쓰면 규칙 hasChildren(t,at,by)이 거절해 되살아나지 않는다.
- 하자 불러오기: dfLoad 진행 중 같은 달이면 같은 약속을 돌려줌(전엔 null → 「게시된 집계 없음」 깜빡임), 본체 dfLoad0.
- 자잘한 것: 읽기 실패는 fbReadErr(「불러오지 못했습니다」, 휴지통·D+60 사진), IDB 연결 onversionchange/onclose, 하자 원본 저장 때 navigator.storage.persist, 아카이브 이동은 관리자가 아니면 canEditTask 통과분만, 업로드 감사의 오늘은 todayStr().
- Ctrl+K: 데스크톱은 찾기 창 안 칸이 숨어 있어 초점이 사라졌다 → 머리 줄 #ahQ 가 보이면 거기로.
- 나머지 리뷰 항목: 게시 잠금·게시 번호(S6)는 규칙과 함께 1256.

## 마지막 기록 기준 v1254
### 1254차 조경 던지기 물방울 · 기본 던지기 하트 · 축구공·사과 삭제
**사용자: 「너가 웹 권한 받아서 지우면 되잖아(공개 저장소 기록 속 옛 그림) · 던지기 물품 조경은 사과가 아니라 물로 하던지 바꿔라 · 기본 던지기 물품은 하트로 하면 축구공도 지워도 됨」**
- 조경(tr-tree) it apple → water: 파란 물방울 32px(외곽선 짙은 파랑·왼쪽 위 밝게·흰 반사), PET_IT_SZ water 17. it-apple.png 삭제(조경만 썼음).
- 기본 던지기: cfg.it 이 없으면 it-heart(축구공 대신). 받은 뒤는 늘 먹이 갈래(eat 그림·fd/food 대사·하트 1개) — 공 갈래(PET_LINES.ball 「일 안하농·월급루팡·⚽·😎」)와 it-ball.png 삭제. PET_IT_SZ 의 ball·apple 삭제.
- 기록 정리 — 뒤이어 사용자 허락(「그래 작업 허락한다」)으로 다시 받은 사본에서 같은 방법으로 556개 경로를 빼고 main 강제 푸시 완료(4a08222 → 3d74ede, 트리 동일). 태그 21개는 세션 연결이 태그 푸시·태그 API 쓰기를 막아(403) 각 태그를 새 커밋으로 옮기는 명령 retag.sh 를 사용자에게 줌. 아래는 처음 시도 때 기록.
- 기록 정리(시도): 새로 받은 사본에서 git filter-repo 로 vendor/pets/ 아래 지금 없는 그림 554개 경로를 전 기록에서 빼고, 그림을 글자로 넣던 옛 vendor/pets.js(v1174~1175)는 빈 목록으로 바꿈 — 마지막 트리는 그대로(검증). 그러나 main·태그 강제 푸시가 세션의 자동 승인(Git 파괴 작업)에서 거절돼 올리지 못함. 올리려면 사용자 승인이 필요하고, 올려도 PR 기록(refs/pull/*)·캐시는 GitHub 지원에 요청해야 완전히 지워진다.
- 테스트: pets.mjs 던지기 기본값을 하트로.

## 마지막 기록 기준 v1253
### 1253차 펫 정리 — 동물·아기 삭제 · 배관공 · pet.js 분리 · 표시 기준 통일 · 경량화
**사용자: 「펫 기능에 대해 다각도로 자체 리뷰 · 위젯 전용으로 남겨 두는 게 좋은가」 → 리뷰(위젯 전용 유지 + 라이선스·코드 위치·그림 기준·유지비) → 「1~4 수용 · 고양이는 대표 펫이니 있어야 · 토끼는 없어도 · 써도 되는 고양이 찾아 미리보기 · 유지비 경량화」 → 후보(LuizMelo Pet Cats Pack CC0 등) → 「그냥 동물 분류를 다 날릴까? 사람 한 칸 비는 건 뭐로 넣을지 미리보기」 → 후보 설비공·전기공·콘크리트공·용접공 → 「배관공이란 이름으로 설비공을 창호공 뒤에 · 동물이랑 아기 전부 삭제 · 나머지 2~4도 함께」**
- 삭제: 동물 분류 10종(dog-akita·cat-greywhite·fox-red·raccoon-gray·rat-gray·chicken-white·duckling·capybara·bunny-white·el-bee) + 사람 분류 el-baby1. 그림 79개(동작 gif·t·z), 동물만 쓰던 먹이 it-bottle·carrot·cheddar·corn·honey·meat·taiyaki. 짝 대본(닭↔병아리·카피바라 3쌍·토끼↔강아지·고양이↔병아리·꿀벌↔조경), 장면(고양이→쥐 쫓기·강아지→닭·아기↔강아지/고양이·동물끼리·사람→동물), 동물 이름 맞춤표(NK)·kind 'ani'·runP. 분류 칩 「동물」. 사과 it-apple(조경)·축구공 it-ball(기본)은 남김.
- 라이선스 이유: 고양이 Bow.Pixel·토끼 ToffeeCraft 는 재배포 금지인데 저장소가 공개. Elthen(여우·꿀벌·아기)은 CC 비상업+상업 허용 댓글만 있고 재배포 조건 미기재, vscode-pets 그림(시바·너구리·쥐·닭)은 MIT 가 그림에도 적용되는지 미기재 — 확인 못 한 그림은 두지 않기로.
- 배관공 plumber(c p, 창호공 다음): 예전 공종 사람 시안(설비공 — 노란 안전모·하늘 셔츠·남색 멜빵·빨간 파이프렌치)을 같은 내보내기(4배 gif, 표시 1.5배)로 — walk 39×42 · idle 39×40 · eat 39×42 · t 33×34, it spanner, say 「꽉 조여요!」, lines 「누수 잡자!」·🔧. PPL·JOB(plumber→tr-pipe 짝)·TBM_JOB(배관 누수 보수). 전체 75종(사람 15·안전 20·공종 25·사무 15).
- pet.js 분리: app.js 의 미니펫 묶음(대사·그림 경로·petLoad·petMake·PET·고르기 창·공 던지기 클릭·pointermove)을 pet.js 로. app.js 에는 petM()(window.PETM)·petBoot()(WIDGET 일 때 ./pet.js?v= 를 한 번 받음)만. 부르는 곳 — histPush(done)·wid.set(pick false)·wid.petPick(pickToggle)·wid.petCat(cat)·wid.pet(toggle)·설정 닫기(pick false + sync)·widApply(petBoot + sync). pet.js 끝에서 PETM 을 걸고 petSync() 한 번. app.js 1,503,518 → 1,453,721 바이트. build-min·static-audit(구문·회차 표기)에 pet.js 추가.
- 표시 통일·경량화: 남은 펫이 모두 sm 이라 sm 플래그 삭제, .wgPet img·고르기 썸네일·설정 썸네일의 pixelated 삭제(매끈 표시가 기본). 동물만 쓰던 동작 코드 삭제 — 눕기·낮잠(sleeping·nap·sleep·napNow·'lie')·앞발질/공 물기 그림(swipe·with_ball → idle)·st(쉬는 그림으로 콩콩, .wad CSS)·fl(왼쪽 그림 뒤집기)·z 글자 요소(.z CSS·--ph)·PET_LINES.wake. 깊은 잠(z 그림)·공 던지기·끌기·짝·TBM 은 그대로. 누르기 2·3번째(예전 앞발질·공 문 그림)는 쉬는 그림으로.
- 기준 문서: vendor/pets.js 머리 주석에 출처(모두 직접 그림 + Fluent ❤️)와 새 펫 표시 기준(4배 그림·표시 1.5배·t 크기식·동작 장수·분류) 정리.
- static-audit: 구문 검사·회차 표기 검사에 pet.js, 핸들러 짝·CSS 클래스 사용처를 찾는 jsNC 에 pet.js 를 이어 붙임(안 그러면 wid.petCat·wid.pet·펫 CSS 가 「사용처 없음」 WARN).
- 테스트: pets.mjs — 분류 psto, 짝 plumber↔tr-pipe 추가(동물 짝 빼고), 던지기 plumber·sf-radio·of-kbd·tr-tree, 전체 순회는 한 창에서 설정만 바꿔 세 마리씩(창을 매번 새로 열지 않음), 본편(?w 없음)에서 pet.js·pets.js 요청이 없는지 확인.

## 마지막 기록 기준 v1252
### 1252차 카피바라 등 외곽선 한 칸 손질(사용자 그림판 수정 반영)
**사용자: 「등에 픽셀 한 칸이 밀려 있어서 그림판으로 조금 고쳐봤어」(잠 자세 그림 첨부)**
- 첨부(205×175, 한 칸 7px)를 칸 가운데 표본 → 원래 팔레트 최근접으로 읽어 1251 잠 그림과 칸별 비교: 다른 곳은 3칸뿐 — 9행 5열 L→m, 10행 2열 투명→외곽선, 10행 3열 외곽선→L(26칸 좌표). 1248 에서 열 3을 뺀 뒤 왼쪽 외곽선을 「줄마다 맨 왼쪽 칠한 칸」으로 이어 10행만 한 칸 안쪽에 잡혔던 것.
- 같은 3칸을 26×23 바탕(build3)에 넣어 걷기·쉬기·먹기·잠 gif 와 t·z 그림을 다시 뽑음. 크기·움직임 그대로.

## 마지막 기록 기준 v1251
### 1251차 카피바라 잠 자세 높임
**사용자: 「카피바라 자는 폼이 너무 낮은데 다리를 좀 덜 자르자」 → 비교 그림(지금 18줄·19·20·21줄) → 「20줄로 하자」**
- 잠(lie)·z 그림: 26×23 그림의 위 20줄(배 아래 다리 위 음영까지)을 바닥에 내리고 맨 아랫줄 외곽선, 눈은 감은 3칸 그대로. 표시 39×27 → 39×30.

## 마지막 기록 기준 v1250
### 1250차 쓰다듬기 삭제 · 상담사↔민원인 대사 현실적으로
**사용자: 「쓰다듬기 기능은 없어도 될 듯 · 민원인하고 상담사 상호작용 대사 좀 더 현실적으로 — 그럼 믿을게요? 이거 맞나」 → 제안 5줄(민원인 4번 「시간 문자로 꼭 주세요!」로 고침) → 「진행」 → 「대사를 짧고 임팩트 있게」 → 「한 문장으로」 → 「상담사 답변이 너무 김」 → 「그래 해라」**
- 쓰다듬기 삭제: petMake 의 mouseenter(1.5초 머물면 멈춰 PET_LINES.pet 「야르릉/💕」·깡총·하트 3개)·mouseleave 제거, PET_LINES.pet 삭제. 클릭 반응·잡아 끌기·먹이 하트(1개)·깊은 잠 판단(petAct, 문서 pointermove)은 그대로.
- RULES cs↔angry(긴 5줄안 → 「짧고 임팩트 있게 · 한 문장으로 · 상담사 답 너무 김」으로 줄임): 민원인 「아직이에요?!」「몇 번째예요!」「또 새요!」 중 하나 → (다가가서) 상담사 「내일 오전 방문할게요!」 → 민원인 「문자 꼭 줘요!」「이번엔 진짜죠?」 중 하나 → 상담사 깡총 「네, 꼭 드릴게요!」. 민원인 glad·하트는 뺌(한마디에 풀리지 않게).
- scripts/test/pets.mjs 짝 대본에 cs↔angry 추가. 620px 위젯에서 말풍선 잘림 없음 확인.

## 마지막 기록 기준 v1249
### 1249차 카피바라 sm 되돌림(걷기 등 거칠음·눈 크기 흔들림)
**사용자: 「카피바라 걸을 때 등 부분이 좀 거칠다 · 눈이랑 머리 크기가 갑자기 바뀌는 것도 이상하다」**
- 원인: 1248 에서 sm 을 지워 .wgPet img 기본 image-rendering:pixelated 로 표시. 26칸 그림을 4배 gif(104×92)로 저장해 39×35 로 보이면 1.5배(비정수) 최근접 표본 — 걷기(WAAPI translateX 소수 위치)와 방향 전환(scaleX(-1))마다 두 배로 그려지는 열·행이 바뀌어 등 계단이 들쭉날쭉하고 눈·머리 폭이 달라짐. 같은 gif 를 0·0.33·0.5·0.75px 어긋남 × 좌우로 찍어 확인 — sm(auto)은 모두 같은 모양.
- 직접 그린 펫(작업자·관리자·사무·공종·화난 민원인 등)은 모두 sm 1 이었음 — 1248 의 「다른 직접 그린 펫처럼 pixelated」 판단이 틀렸음. 카피바라 sm 1 복원, 그림·크기·움직임은 1248 그대로.

## 마지막 기록 기준 v1248
### 1248차 카피바라 크기·도트·걷기 손질
**사용자: 「그냥 포기다 · 원래 카피바라 사이즈 좀만 줄이고 좀 더 도트 느낌 · 걷는 모션만 개선 · 미리보기」 → 「도트 느낌은 직접 그린 펫들과 위화감 없게 · 걷기는 앉은 채 뒷다리만」 → 「색이 완전히 달라짐, 기존과 동일 · 앞다리도 움직여야」 → 「발 다시」 → 「쉬기는 지금과 똑같이 · 먹기 찡긋 왜 없어졌니 · 눈 1px 더 · 주둥이 짧아짐 · 다른 동물 걷는 거 참고」 → 「잠잘 때 눈 1px 줄여 · 쉴 때 왜 눈이 달라지냐 · 걷기 다리 너무 얇음」 → 「다리 위 음영까지 같이 움직여야」 → 「쉴 때 다리 음영 구성을 그대로」 → 「이렇게까지만 하고 적용, 상호작용 확인」**
- 다른 동물(고양이·병아리·토끼 등) 오리지널 교체 시안은 모두 기각 — 이번 판에 없음.
- 축소: 전체 비율 축소(BOX)는 주둥이가 짧아지고 색이 번져 기각. 원래 그림(base.png 30×27)에서 몸통 쪽 열 3·6·9·12, 행 11·15·16·21 만 빼 26×23 — 머리·주둥이·귀·색은 원본 픽셀 그대로, 뺀 열에서 끊긴 왼쪽 외곽선만 이음. 눈 2→3칸(먹기 찡긋 ^ 은 3칸 그대로, 잠 눈 3칸).
- 쉬기: 기본/귀 까딱/기본/기본(눈 감는 장면 뺌), 1200·300·900·500ms. 먹기: 찡긋 눈+오물(입 아래 2칸) 300ms×4. 잠: 몸 위 18행을 바닥에 내리고 다리 없음(식빵).
- 걷기: 다리를 새로 그리지 않고 앉은 그림의 15행 아래를 열로 세 조각(뒷다리 0–9 · 가까운 앞다리 10–15 · 먼 앞다리 16–21)으로 잘라 음영째 이동. 뒷다리+먼 앞다리 / 가까운 앞다리가 엇갈려 +1·0·−1·0칸, 앞으로 갈 때 한 번 1칸 들림. 15–17행은 몸 외곽선 고정·안쪽 음영만 이동, 18행 아래는 조각 통째. 드러난 배·다리 가장자리 외곽선 보충, 외곽선 부스러기 제거. 180ms×4.
- 표시: walk/run/idle/eat 39×35 · lie 39×27 · t 38×34 · z 39×27(4배 gif 를 1.5배 표시 — 직접 그린 펫과 같은 칸 크기), sm 삭제(pixelated). 짝·던지기(당근)·대사는 그대로.

## 마지막 기록 기준 v1247
### 1247차 젖소 → 카피바라 · 먹이 그림 라이선스 정리 · 펫 회귀 테스트
**사용자: GPT 펫 리뷰 첨부 「보고 개선할 점 미리보기」 → 시안(고르기 창 아래 줄·사용법·초점·좁은 창, 풍속 대사, 사과·치즈) → 「분류 창 사용성은 기각 · 풍속 10m/s 넘었어요! 유지 · 고양이·병아리·토끼 사용해도 되는지 검색 · 젖소는 빼자 · 대신 카피바라(당근)」 → 「병아리랑 토끼 검색해서 그림 대조」 → 카피바라 직접 그림 3번 탈락(실루엣·색·표정 「ㅡ ㅡ 뚱한」) → GPT 시안 그림 → 「그래 적용하자」**
- 고르기 창 변경(아래 줄·사용법·초점 유지·좁은 창 폭)과 풍속 대사 변경은 되돌림 — 이번 판에 없음.
- 젖소 cow(GHAP 데모, 비상업·개인) 그림·목록·짝(젖소↔닭) 삭제. 카피바라 capybara: 사용자가 ChatGPT 로 만든 시안 이미지의 큰 그림을 블록 8.1px 격자(오프셋 1.5·3)로 표본해 30×27, k-means 로 갈색 4단(203,127,79 · 180,109,73 · 133,80,63 · 112,67,55)+외곽선(46,28,22), 바닥 그림자 지움. 원본이 앉은 자세라 걷기는 발 고정·몸 1칸 들썩, 쉬기 귀 까딱·눈 더 감기, 먹기 눈 휨·오물, 눕기는 다리 접고 납작. 표시 walk 45×42 · idle/eat 45×40 · lie 45×33, it carrot, sm 1. 시안 속 작은 걷기·눕기 그림은 장마다 모양이 달라 쓰지 않음.
- 짝 PAIR: capybara↔bunny-white(당근 같이), capybara↔duckling(삐약? → …올라와), capybara↔angry(…진정해요).
- 먹이 그림: it-apple·it-cheddar 를 직접 그림으로 교체(pixelfood CC BY-NC-SA 4.0 비상업 제거) — 조경·너구리·쥐가 받음.
- 라이선스(itch.io 페이지 확인, 파일 이름·용량 대조): 고양이 Bow.Pixel 「Cat 85+ Animations」 상업·수정 가능, 재배포 금지 · 병아리 Pale_Tale 「Duck 4‑direction Animated sprite」 CC0(원작자 댓글로 CC0 확인) · 토끼 ToffeeCraft 「Bunny Pixel Animations」 상업·수정 가능, 재배포·재판매 금지. 저장소가 공개라 재배포 금지 팩 그림이 공개돼 있음 — 비공개 전환 권함(사용자 몫). vendor/pets.js 출처 주석 갱신(분류 o 사무 포함).
- 테스트: scripts/test/pets.mjs 추가·run-all 에 「위젯 미니펫」 — 그림 누락·분류, 3마리 제한(넷째 교체·다시 누르면 내림), 짝 대본 6쌍, 던지기 5종 먹이 그림, 전체 85종 세 마리씩 올림·놀기·던지기 오류·404.

## 마지막 기록 기준 v1246
### 1246차 경광등·호출벨·중장비 짝 대본 · 굴착기 낮춤 · 렌탈 과상승 방지봉 · 지게차 협착 방지봉
**사용자: 「경광등 호출벨 중장비는 상호작용 넣자 · 굴착기 바퀴를 좀 줄여서 키를 낮추자 렌탈도 하단을 좀 줄이고」 → 「경광등이랑 호출벨은 한세트임 · 렌탈은 협착방지봉도 · 지게차도」 → 예시 사진(렌탈 과상승 방지봉, 지게차 뒤 빨강·흰 협착 방지봉) → 「전자는 왜 콩나물이 달려있고 후자는 반대로 끼운 거 같은데」 → 「그래 진행하자」**
- PAIR 9쌍(sf-bell manager 다음): sf-bell↔beacon(호출 → 경광등 장비 정지, 한 세트), sf-bell·beacon·manager ↔ @eq(중장비 전부), excavator↔dump, mixer↔roller, forklift↔crane, scissor↔ladder, gondola↔bosun. 그 밖 중장비 조합은 기존 일반 장면(빵!).
- 그림(scratchpad eq/eqfix.py — eq2 excavator·eq3 scissor/forklift 를 고친 판): 굴착기 궤도 9→6칸·롤러 작게(버킷 2칸 올림) idle 72×48→72×44. 렌탈 받침 6→4칸·바퀴 반지름 2.8→2.2, 난간 양 귀퉁이에서 위로 곧은 은색 과상승 방지봉(끝 장식 없음) idle 54×54→54×56. 지게차는 원래 그림 그대로 두고 왼쪽 6칸 넓혀 뒤 평형추에 굵은 빨간 받침 + 바깥으로 뻗은 빨강·흰 줄무늬 봉 walk/idle 66→75 폭. 기존 그림은 예전 함수로 재현해 vendor gif 와 픽셀 일치 확인 뒤 바꿈.
- 점검: 새 짝 9쌍 + 기존 2쌍 대사 순서대로, 85종 올림·놀기·던지기 오류·404 없음.

## 마지막 기록 기준 v1245
### 1245차 고르기 창 첫 제목 여백 · 작은 조약돌 발 · 키 맞춤
**사용자: 「선택창 분류 제목 사람이랑 위에가 너무 붙어있음 · 사물펫 말(발)이 이전에 비해 너무 눈에 띔 · 작업현황판이랑 풍속계, 호출벨, 커피믹스 키가 너무 큼 · 노트북은 살짝 키워도」 → 비교 시안 → 「작업현황판은 하단에 뚫린 거 빼고 서류 쪽에 얼굴 넣으면 될 듯, 그렇게 해서 하면 될 듯」**
- index.html #wgPick .pk-hd:first-child padding-top 4px → 10px.
- 발: v1244 조약돌(폭 4·하이라이트)이 눈에 띄어 예전 막대 다리+발판과 같은 폭 3·같은 색(60,62,70 / 40,40,46)의 작은 조약돌(위 2칸·아래 3칸, 1px 들림)로. 사물 펫 44종과 새 안전 4종 다시 뽑음(강화안전모 포함).
- 키: 작업현황판(A형 받침 아래 뚫린 칸 없앰, 서류 두 장 위에 얼굴·집게·체크) idle 51×57→51×40, 풍속계(날개 작게·버튼 빼고 날개 아래 얼굴) 39×54→39×45, 호출벨(목줄 고리 작게·단추 낮춤) 42×54→42×46, 커피믹스(스틱 짧게) 27×50→27×40, 노트북 화면·판 키움 48×36→54×40. pets.js g/t/z 크기 갱신.
- 점검: 새 짝 대본·85종 올림·놀기·던지기 오류·404 없음.

## 마지막 기록 기준 v1244
### 1244차 안전 펫 5종 · 사물 펫 조약돌 발
**사용자: 「안전에 호출벨 무전기 풍속계 강화안전모 작업현황판 추가 · 사무쪽도 넣을 때 던지기 물품이랑 상호작용 체크」 → 예시 사진(목걸이형 호출기·휴대용 풍속계·형광 안전모·A형 작업현황판) → 「강화안전모는 안전모에서 형광색, + 는 짙은 회색」 · 「사물펫 발을 커비처럼 조약돌 모양」 → 「기존 발사이즈랑 동일하게」 → 「그래 진행해, 상호작용 던지기 물품도 잘 확인하고」**
- 새 안전 펫(vendor/pets, c 's', FAIRY 에 추가): sf-hhelm 강화안전모(it cone) · sf-radio 무전기 · sf-bell 호출벨 · sf-wind 풍속계(셋 it battery) · sf-board 작업현황판(it cone). 모두 직접 그린 픽셀, 로고·상표 글자 없음. 안전모 다음에 강화안전모, 안전조끼 다음에 나머지 넷.
- 던지기: of-mouse·of-kbd it coffee → battery(fd 「충전 완료!」). PET_IT_SZ 그대로(battery 19·cone 17).
- 짝 대본 PAIR 12쌍: 마우스↔키보드·마우스/키보드↔노트북, 무전기↔신호수·크레인, 풍속계↔크레인·곤돌라(풍속 넘으면 중지), 호출벨↔상담사·관리자, 강화안전모↔안전모, 반장·관리자↔작업현황판. 그 밖엔 요정(fairy) 일반 장면.
- 조약돌 발: 사물 펫 44종(tr-* 25 · of-* 15 · helm·beacon·sf-svest · 라바콘은 발 없음이라 같은 그림) 다시 뽑음. 예전 막대 다리+발판 자리에 위 2칸·아래 4칸 작은 타원(짙은 회색), 걸을 때 1px 들림. 다시 뽑기 전 기존 다리로 뽑아 vendor gif 와 픽셀 대조(같은 프레임 접힘·커피 김 반투명 말고 일치) 뒤 다리만 바꿈 — 표시 크기(pets.js g/t/z)·프레임 시간 그대로.
- 점검(브라우저): 새 짝 12쌍 대사 순서대로 나옴, 새 펫↔콘·관리자·굴착기 일반 장면, 던지기 8종 그림·크기·먹기 대사, 85종 세 마리씩 올림·놀기·던지기 오류·404 없음.

## 마지막 기록 기준 v1243
### 1243차 위젯 설정 다듬기 · 현안 카드 1~5열 · 사무 분류 15종
**사용자: 「미니펫 선택 버튼 안 문구 가로중앙정렬 · 펫 선택창 분류 제목 영역 높이 키우기 · 현안카드열 1열에서 5열까지 · 사무 분류도 넣을까」 → 사무 시안 반복(탈락 다수) → 마우스는 로지텍 M240 느낌, 키보드는 풀배열·ㄴ자 엔터·눌린 키만 RGB → 「마우스랑 키보드 본편에 적용」 · 「아파트 모형·피로회복제 빼기」(5배수 15종)**
- #wgSet .wgs-pet: 글자 가운데(padding 0 20px), .icn 은 absolute 오른쪽 끝. #wgPick .pk-hd 위 14px·아래 6px(첫 제목 위 4px).
- 현안 카드 열: widIssCol(c) — issCol 1~5(그 밖은 3). 설정 −/+ 단추는 1~5 사이로만, body 에 --issc 를 걸어 #issStrip grid-auto-columns·.iss-none span 계산(예전 body.iss4 클래스 없앰). 540px 이하 좁은 위젯은 min(--issc,2). scripts/test/iss.mjs 에 「현안 카드 열 1~5(위젯 설정)」.
- PET_CATS 에 ['o','사무'](공종 다음, 동물 앞). kind: of- 로 시작하면 'of'. 펫 15종(of-mix 커피믹스·of-mug 커피(테이크아웃 컵, 로고 없음)·of-stamp·of-note·of-staple·of-print·of-shred·of-laptop·of-mouse(일반 대칭형, 클릭 시 버튼 반쪽 전체가 눌림·휠 회전)·of-kbd(숫자열·ㄴ자 엔터·텐키, 평소 불 꺼짐 → 눌린 키만 RGB)·of-env·of-phone(벨 울리며 수화기 흔들림)·of-calc·of-cal(탁상형)·of-board), 모두 it=coffee·sm 1. 그림은 직접 그린 픽셀(브랜드 로고 없음).
- 짝 대본 PAIR 사무 18쌍(결재·커피·메모·출력·파쇄·전화 민원·달력 일정·화이트보드 회의 등) + 일반 장면 2개(사무↔사무, 관리자·반장·상담사·기능공↔사무).

## 마지막 기록 기준 v1242
### 1242차 던지기 물품 정리 · 펫 경량화·렉 점검
**사용자: 던지기 시안(망치·스패너 다시 그림, 젖소 당근, 크기는 기계적으로 말고 눈으로) → 「그래 이렇게 가자 · 그리고 펫 관련해서 경량화 최적화 렉 검사 해봐」**
- it-hammer.png(평범한 장도리 — 나무 자루·직사각 쇠 머리·짧은 노루발) · it-spanner.png(열린 입·고리) — 다른 물품처럼 32px 캔버스를 채우고 굵은 외곽선·4단 명암. 망치: 가구·콘크리트·창호·석재·목문·방화문·보도블럭(fd 「뚝딱뚝딱!」「고정 완료!」「🔨」), 스패너: 설비·환기·배수구·렌지후드·시스템루버·위생도기(fd 「꽉 조였어요!」「누수 없음!」「🔧」). 젖소 it=carrot. 쓰지 않게 된 it-clover·it-strawberry 삭제.
- PET_IT_SZ — 그림은 그대로 두고 날아가는 표시 크기만: 축구공 14, 사과·치즈·꿀단지·타일 15, 붕어빵·커피·라바콘·도배풀·마루판 17, 당근·실리콘·망치·스패너 18, 건전지 19, 나머지 16.
- 점검(위젯, 리눅스 Chromium): 펫 없음 메인 0.5% · 1마리 1.9% · 3마리 2.4%(스크립트 0.3ms/초), 래스터 3마리 약 8ms/초. 고르기 창이 열려 있으면 65칸 움직이는 썸네일 때문에 래스터 약 65ms/초 · 펫 그림 376KB → 썸네일 t 를 쉬는 그림 첫 장 png(-t.png, 65개 · 예전 -t.gif 는 idle 과 똑같은 사본이었음)로 바꾸고, 올린 펫과 마우스를 올린 칸만 data-a(idle gif)로 바꿔 움직임 — 창 열 때 76KB, 래스터 약 6ms/초. 설정 줄 썸네일(#wgPetT)은 idle gif(머리 줄에 이미 받은 그림).
- 누수 점검: 65종을 세 바퀴 올렸다 내림(195회) 뒤 setInterval 수·노드 수 그대로, 펫·공 잔재 0. 3마리 60초 놀기(상호작용 12번·던지기 12번) 뒤 GC 힙 7.64→7.54MB.

## 마지막 기록 기준 v1241
### 1241차 고르기 창 분류 순서·여백 · 펫 짝 대본 확장
**사용자: 「선택창에서 분류 제목 위아래 여백 살짝만 · 안전 장비는 이름 그냥 안전으로 · 안전 분류를 공종보다 먼저 · 상호작용 이것저것 넣어보고 개선 · 안전모 안전화 안전조끼 조합도 · 버그 없는지도 체크」**
- PET_CATS 순서 사람(p)·안전(s)·공종(t)·동물(a), 칩 이름 「안전」. .pk-hd 위 10px·아래 3px(첫 제목은 위 2px).
- PET 짝 대본 PAIR — [앞 키, 뒤 키(@kind 면 그 종류 전부), 대사 줄]. talk(S) 가 다가가 마주 본 뒤 줄마다 말(2 는 웃으며 폴짝). PR(짝 대본) 을 RULES 앞에 붙여 ALL, RK 는 PR → NK 이름 → 종류 → 요정 이름 순. 짝: 타일↔코킹·창호↔코킹·도배↔도장·전기↔등기구·설비↔위생도기/배수구·소방↔전기·에어컨↔시스템루버·렌지후드↔환기·통신↔승강기·방화문↔소방·목문↔방화문·조경↔보도블럭·석재↔타일, 민원인↔승강기/통신/배수구/에어컨, 상담사↔통신, 안전화↔안전조끼, 닭↔병아리(「엄마?」)·젖소↔닭·토끼↔강아지·고양이↔병아리·꿀벌↔조경, 기능공↔자기 공종(JOB 7쌍), 안전화·조끼↔기능공/신호수·유도원/작업반장.
- 보호구 TBM: 안전화·안전모·안전조끼가 다 있으면 안전모 진행(TBM_S.gear).
- 점검: 짝 10종·셋 2종 브라우저로 돌려 대사 끝까지·오류 없음. 넓은 머리 줄에서는 다가가는 데(30px/s) 몇 초 걸린다 — 기존과 같음.

## 마지막 기록 기준 v1240
### 1240차 미니펫 묶음 적용 · 고르기 창 분류
**사용자: (미리보기 pvhum 여러 차례) 「이제 모두 적용하자」 · 「위젯 설정에서 미니펫 버튼 너비를 위의 다른 곳 너비와 동일하게」 · 「없음은 없어도 될 듯 · 선택창 높이는 위젯 설정 창 높이와 동일하게」**
- 고르기 창(petPickRender): 위 칩 PET_CATS(p 사람 · t 공종 · s 안전·장비 · a 동물) + 「전체」(분류 제목 .pk-hd 를 붙여 이어서). 펫의 분류는 pets.js 항목의 c — 목록 순서가 칸 순서. 칩은 data-act wid.petCat → PET_CAT. 「없음」 칸 삭제(내리려면 올린 펫을 다시 누름). 창 높이 = #wgSet offsetHeight, 넘치면 .pk-g 안에서 스크롤(flex 세로).
- 설정 「미니펫」 단추(.wgs-pet): flex:1 — 위 슬라이더 칸과 같은 폭, 이름은 말줄임.
- 펫 목록(vendor/pets.js, 65종): 사람에 유도원(guide — 빨간 안전모·빨간 조끼·경광봉, kind sig)·미장공(plaster)·창호공(glazier — 작은 창을 들고, ppl, TBM_JOB 「벽 균열 미장」「창호 교체」). 공종 25종 tr-*(직접 그림, 1.5배·4배 저장, walk/idle/eat, run=walk) — 도배·타일·마루·가구·콘크리트·창호·석재·목문·방화문·도장·코킹·위생도기·전기·설비·보도블럭·소방·통신·조경·승강기·환기·등기구(fly — 쉴 때 빛이 퍼져도 세 동작을 같은 높이로 잘라 둥실 높이가 안 바뀜)·배수구·에어컨·렌지후드·시스템루버. 안전·장비에 안전화(sf-sboot, 다리 없이 통통)·안전조끼(sf-svest), kind fairy. 라바콘·안전모·경광등 이름에서 「요정」 뗌.
- 동물: 레서판다 삭제(파일도). 닭 chicken-white(vscode-pets 흰 닭을 다른 동물처럼 다듬음, 0.8배). 예전 앱(21cdc62)에서 되살림 — 고양이(cat-greywhite, 이름 「고양이」, 잘 때 그림은 원본 시트 Cat_Grey_White.png 47행 「고개 든 엎드림」 4장으로 — 그림 수정 아님) · 병아리(duckling, 표시 0.75배) · 젖소(cow) · 토끼(bunny-white). 이들 팩은 라이선스 문서가 없어 그림은 원본 그대로. 먹이 붕어빵·옥수수·네잎클로버·당근 it-*.png 도 되살림.
- 상호작용: kind 'tr'(공종) 장면 4개(관리자/반장 점검 · 민원인 · 기능공 · 공종끼리). 동물 이름(NK) 장면 — 고양이↔쥐(쥐가 달아나고 고양이가 쫓음, runP 'run'), 강아지↔닭(닭이 달아남), 아기↔강아지/고양이(하트). RK 는 NK 이름 → 종류 → 요정 이름 순으로 맞춘다.

## 마지막 기록 기준 v1239
### 1239차 너구리 잠든 얼굴 정리
**사용자: 「너구리 콧방울 빼고 아직 위에 점 뜨는 거 개선이 안 됐네」**
- vendor/pets/raccoon-gray-lie.gif(3장)·raccoon-gray-z.png — 24×9 원본 격자에서 손봄: 파란 콧방울(43,77,139) 제거, 둘째 장(콧방울 부풂)은 머리 2~6행을 첫 장과 같게, 이마 짙은 점(17,3) → 얼굴색(204), 4행 가면 줄에 감은 눈 검은 두 칸씩(15–16, 18–19). 표시 크기·프레임 시간 그대로.

## 마지막 기록 기준 v1238
### 1238차 로그인 배경 중간 교체
**사용자: 「로그인 후 들어갈 때 배경화면 중간에 바뀌는 경우가 있음」**
- 흐름: boot-wid.js 가 지난번 받은 목록(calapp.bgl)에서 무작위로 골라(BG_RND) 바로 표시 → app.js 시작 때 FB 초기화(bgSub)로 RTDB bg 를 받으면 목록을 바꾸고 bgApply(true) → bgPick 이 BG_RND 를 새 목록에서 「주소 전체 같음」으로 찾음 → 못 찾으면 새로 무작위 → 로그인 화면이 걷히는 동안 사진이 바뀜.
- 못 찾는 경우: ① bg-sync(하루 두 번·요청 시)가 컬렉션을 다시 받아 urls.raw 뒤 값(ixid 등)이 달라진 경우(확인 못 함 — RTDB 값을 이 세션에서 읽을 수 없음) ② 사진이 컬렉션에서 빠진 경우 ③ 첫 방문(boot-wid 기본 목록)과 RTDB 목록이 다른 경우.
- 수정: bgId(u)= ? 앞 주소로 비교(bgPick·고정 사진·bglast·썸네일 표시·bgApply 같은 사진 판단·boot-wid 고정 사진). 이번 방문에 고른 사진 객체는 window.BG_RNDO 에 두고 목록에서 빠져도 그대로 — 새 목록은 다음 방문부터. 사용자가 사진을 고르면(bgSetPin) BG_RNDO 해제.
- 확인(로컬, 함수 직접): 같은 사진 주소 뒤 값만 바뀐 목록 → 같은 사진, 목록에서 빠짐 → 같은 사진 유지.

## 마지막 기록 기준 v1237
### 1237차 너구리 검은 눈
**사용자: 「눈을 흰색이 아니라 검은색으로 하자 · 중간에 저거 연두색은 뭐냐」**
- raccoon-gray idle·walk·with_ball·t 전 장, swipe 1·4장: 1칸 사이 흰 눈 점 둘 → (20,18,22).
- 연두색(4,249,0) = vscode-pets 원본 with_ball(공 물기)의 공. 먹이(it)가 있는 펫은 공 물기 대신 swipe 를 써서(petMake react r===3) 너구리(사과)에겐 앱에서 안 보임 — 사용자에게 보낸 확인용 캡처에 공 물기 장을 넣어서 보였던 것.

## 마지막 기록 기준 v1236
### 1236차 너구리 눈
**사용자: 「너구리 눈이 좀 사시인가 양옆으로 퍼진 거 같아 · 잘 때는 - - 가 되면 좋겠고」**
- 너구리 얼굴: 검은 가면 줄(89,86,82)에 흰 눈 점(255) 둘이 2칸 사이 — 4배 그림을 원래 격자(÷4)로 읽어 같은 줄 흰 점 두 개가 2칸 넘게 떨어졌으면 뒤쪽 점을 가면색으로, 앞쪽 점 2칸 앞에 흰 점. raccoon-gray idle·walk·with_ball 전 장, swipe 첫 장(나머지 장은 감은 눈·놀란 눈이라 그대로), t 썸네일.
- 눕기(lie 3장)·깊은 잠(z): 머리 쪽 가면 줄(5칸 이상 이어진 가면색)의 양끝 2칸씩을 밝은 회색(204)으로 → 「- -」.

## 마지막 기록 기준 v1235
### 1235차 너구리 눕기 그림
**사용자: 「너구리 누웠을 때 좀 이상하다 확인」**
- 원인: vscode-pets 너구리 lie 원본 맨 윗줄(머리 위 4줄 떨어진 곳)에 파란 점 하나 — v1229 다듬기에서 그 점에도 외곽선이 둘려 머리 위에 떠 있는 점으로 보였고, 그 점 때문에 그림 위쪽이 비어 표시 높이도 29.
- vendor/pets/raccoon-gray-lie.gif(3장)·raccoon-gray-z.png 에서 큰 덩어리의 5% 미만인 떨어진 조각 제거 → 위 빈 줄 잘라 96×36(4배) → pets.js lie·z h 29→18.
- 다른 동물·펫 그림도 같은 방식으로 떨어진 조각 검사: 민원인 eat(반짝)·경광등 요정(빛 줄기)·아기 swipe(효과)는 의도한 것.
- 코 옆 파란 점(콧방울 커졌다 작아짐)은 원본 애니메이션이라 그대로.
- 주의: ImageSequence.Iterator 의 프레임은 같은 객체라 리스트에 담을 땐 .copy() — 안 하면 마지막 장으로 다 덮인다.

## 마지막 기록 기준 v1234
### 1234차 사람 셋 TBM
**사용자: 「고양이 좀 이상해졌는데 다시 생각해봐라」 · 「TBM 상호작용을 다른 조합에도 — 관리자 작업자 신호수 / 작업반장 작업자 신호수 / 관리자 작업반장 작업자, 작업자는 다른 기능공으로 대체 가능」**
- app.js PET: tbm(T,S) — T=[왼쪽, 가운데(진행·구호), 오른쪽], S=[[자리, 대사, ms, 폴짝(1 자기·2 나머지)]...] 뒤 「좋아!」 세 번·하트. 대본 TBM_S: fairy(요정 셋, 예전과 같음) · mgr([기능공, 관리자, 신호수]) · lead([기능공, 작업반장, 신호수], 무전 「치익-」) · both([작업반장, 관리자, 기능공], 반장이 인원 보고).
- play(): 요정 셋 → 사람 셋(kind: mgr·sig·lead·ppl 중 비어 있는 펫) → 둘 장면 순. 셋 TBM 은 30%(지금 상호작용은 바로).
- 「오늘 작업」: TBM_JOB — 작업자 자재 반입 · 도장공 세대 도장 보수 · 타일공 욕실 타일 교체 · 마루공 마루 들뜸 보수 · 도배공 도배 재시공 · 코킹공 실리콘 재시공.
- 확인(로컬 위젯): 관리자+작업자+신호수, 작업반장+도장공+신호수, 관리자+작업반장+타일공, 신호수+코킹공+관리자(순서 무관), 요정 셋 모두 대본 끝까지, 관리자+작업자+상담사는 셋 TBM 아님(둘 장면).
- 고양이(시안만): 원래 그림을 다시 그리면 비율이 달라져 이상해짐 → 원래 그림(외곽선 통일 뒤)에 가로 3줄·세로 3칸을 「안쪽 외곽선·색 경계가 적은 줄」 골라 하나씩 겹쳐 넣어 키움(scratchpad/rev/cat5.py). 2배 표시, 높이 33.

## 마지막 기록 기준 v1233
### 1233차 펫 높이 2px · 상호작용 말풍선
**사용자: 「사무실 물건 4개 기각 다시」 · 「고양이 단순 확대라 도트가 뭉개짐, 깔끔하게 리터칭 · 아웃라인 잘림도 보고」 · 「서 있는 높이 2px 내려야겠다」 · 「상호작용 대사가 옆 펫에 가려 안 보임 — 말풍선 방향 조절」**
- 높이: .wgPet margin-top -24→-22, throwBall floor h/2+20→+22. 발은 머리 줄 위에서 40(요일 줄 윗선 42).
- 말풍선: petMake 에 pal(짝) — PET.play 가 장면 동안 두 펫에 서로를 짝으로(TBM 은 가운데 안전모 요정 반대쪽), 끝나면 해제. say() 는 짝이 있으면 짝 반대쪽에 띄우고, 머리 줄 밖(0 / 머리 줄 폭)으로 나갈 때만 뒤집음 — 오른쪽 단추 위로 잠깐 겹치는 건 허용. 말하는 동안 .wgPet.talk(z-index 33).
- 확인(로컬 위젯, 2배 캡처): 관리자+작업자·상담사+민원인 말풍선이 짝과 겹친 표본 0. TBM 세 마리는 가운데가 말할 때 어느 쪽이든 옆과 겹치나 z-index 로 위에 보임.
- 시안만(pvhum): 사무실 요정 4종(커피믹스·도장·포스트잇·스테이플러, scratchpad/eq/offfairy.py — 라바콘 요정식 얼굴·다리), 고양이 다시 그림(scratchpad/rev/cat3.py — Elthen 고양이 모양을 큰 격자에 사각형으로 다시 그려 2배 표시, 1.18배 매끈 확대의 뭉개짐 해결). 사무실 물건(회전의자·복사기·정수기·화분)은 기각.

## 마지막 기록 기준 v1232
### 1232차 말풍선 꼬리
**사용자: 「말풍선이 꼬리랑 풍선이랑 딱 안 붙어 있는데」**
- 원인: .wgPet .bub 은 border-radius 10px(높이 약 20px → 양끝이 반원). 꼬리(::after, 4px 삼각형)가 bottom:6px·right:100% 라 둥근 모서리가 안으로 휜 곳에 붙어 사이가 비었다(3배 캡처로 확인).
- 꼬리를 bottom:calc(50% - 4px)(반원의 가장 바깥) · right:calc(100% - 2px)(2px 겹침)로. .bub.l 은 left:calc(100% - 2px).
- 테스트: widget-layers 의 「편집 중 실시간 반영」 단계가 2026-10-24(토)에 main 에서도 깨짐 — 앞 단계가 팝업을 연 채 오늘을 고른 상태로 남겨, 오늘 칸을 누르면 같은 날 다시 누름으로 닫혔다(selDate 토글). 그 단계 앞에서 팝업을 닫아 둠(테스트만 고침).

## 마지막 기록 기준 v1231
### 1231차 펫 서 있는 높이
**사용자: 「펫 서 있는 높이를 낮출까 싶은데 어느 정도가 좋을지 애매 — 높이 노브 두고 보면서」 → 미리보기(pvhum)에 0~14px 노브 → 「3이 적당한 듯, 아예 14는?」 → 실제 위젯 캡처 비교 → 「일단 3」**
- 실제 위젯(로컬 ?w=1&glass=1, 620·900px): .cal-head 높이 36, 발(펫 아래 끝)은 머리 줄 위에서 35(아래 끝 1px 위), 요일 줄 윗선은 42. 미리보기는 머리 줄 아래가 하늘 사진이라 많이 내려도 괜찮아 보이므로 실제 캡처로 판단.
- index.html .wgPet margin-top -27→-24, app.js throwBall floor h/2+17→+20(둘을 같이 바꿔야 공이 발 높이에 멎음). 들고 있을 때 바닥 그림자(#wgPetSh)는 offsetTop 기준이라 그대로 맞음.

## 마지막 기록 기준 v1230
### 1230차 작업반장·편집 아티팩트 반영·던지는 그림
**사용자: 다기능공(빨간 안전모 — 「빨강은 유도원」)·고양이(vscode-pets 고양이는 작가 요청으로 배포 안 됨)·앵무새·강아지 품종(시바 색만 바꾼 것 — 「특색 없음」)·직접 그린 고양이·햄스터(「동물 못 그림」)·안전관리자·현장소장(관리자와 겹침)·설비/전기/용접/창호/콘크리트/미장공(「안 와닿음」)·유도원(신호수와 겹침) 기각 → 「작업반장」 → 「순서·대사·던지기·이름 편집 아티팩트(끌어서 순서)」 → 「도배지·타일·마루판·페인트·안전모·건전지 알아보기 어렵다」 → 「적용」**
- 작업반장(scratchpad/hum/hum5.py → eq/lead_exp.py): 초록 안전모(줄 없음 — 「두 줄은 무슨 의미」), 회색 점퍼·반사띠·펜 꽂은 가슴주머니, 왼팔 노란 완장(무전기 쥔 팔과 반대), 노란 무전기를 1칸 기울여 오른손에 쥠(손 살색을 무전기 아래에 겹쳐 그림). 쉬기 때 입가로 들어 무전. 2칸 기울임·검정 무전기·계단 안테나는 기각.
- 상호작용(app.js PET RULES): kind 'lead' — 작업자/공종(작업 지시→넵 반장님), 관리자(인원 보고), 신호수(무전으로 신호 요청 → 신호수가 다가옴), 장비(무전 정지), 민원인(바로 보수 → 하트), 요정(통제 구역 확인).
- 편집 아티팩트(https://claude.ai/artifact/Hk5MWopj74DTmnfrAh45D6, db pets/v1230): 순서 탭(SortableJS, 고르기 창처럼 4칸) · 이름·울음소리·대사·던지기(그림 단추)·받았을 때 대사. 저장본 그대로 pets.js 를 다시 씀(키 순서 = 고르기 창 순서, 첫 칸 「없음」 뒤 4마리가 첫 줄).
- 던지는 그림(scratchpad/draw/items18~20.py, paint3.py, paste.py): 건전지(기울인 원통), 타일(아이보리 포세린 2x2·대리석 결), 마루판(판 3장), 페인트(원래 그림 몸통을 은색으로 · 파란 라벨 띠·흘러내림·손잡이 — 새로 그린 것보다 원래 보완이 낫다는 사용자 의견), 도배풀 it-paste(하늘색 통·하얀 풀·솔). 안전모 아이템은 빼고 안전모 요정은 라바콘. 안 쓰게 된 it-hat·it-wpaper·it-badge 삭제.
- 안전모·라바콘 요정: 폴짝(hop) 프레임 꼭대기가 캔버스 밖으로 나가던 것 → 캔버스 위 여유(eq8 helm oy+3, eq4 cone oy+2) 로 export_all 다시.
- 시도했다 기각한 그림·코드는 scratchpad(hum6~9.py, ani3/, dogs/) 에 남김.

## 마지막 기록 기준 v1229
### 1229차 동물 다듬기·정리
**사용자: 「그림체 섞임은 동물들을 직접 그린 스타일로 다시 그리면?」 → 「누렁이·해적냥·오리·공주 삭제, 나머지 새로, 백구는 진돗개」 → 틀 그림 17종 시안 「니가 생각하기에 이게 맞니 퀄리티가」 → 한 마리씩(시바) 「아직도 풍선 같은데」 → 「2번 방식(원래 그림 다듬기)」 → 「크기 키우면 안 될까 · 손댈 수 없는 애들은 빼자」**
- 직접 그리기 실패 원인(자체 판단): 몸통이 타원 하나·다리가 막대·명암이 근육을 안 따라 풍선처럼 보임. scratchpad/ani(틀), ani2/shiba.py(한 마리씩) 는 미채택.
- 라이선스: vscode-pets 저장소 MIT(시바 Kevin Huang·여우 Elthen 등 출처 표기), Elthen 은 itch.io 댓글에서 「자유롭게 수정해도 된다」. 그 밖 itch 팩은 라이선스 문서 없음, 젖소는 비상업 데모, 슬라임(Tiny Questers)은 AI 입력 금지 → 삭제.
- 다듬기(scratchpad/ani2/restyle.py): 1칸 여백 → 가장자리의 어두운 원래 외곽선을 K(34,26,30)로 → 외곽선 없는 쪽만 새로 두름 → 4배 확대 저장, sm:1, 원래 격자의 2배로 표시(1.5배는 작업자 옆에서 너무 작음 — 사용자). 동작(달리기·앞발질·공 물기·눕기)은 원래 그대로. 진돗개는 시바 그림의 주황 계열(HLS h .02~.14, s>.25)을 크림(h .11, s .28)으로 — id 는 dog-white 유지(고른 사람 그대로).
- 삭제 11종 그림·쓰지 않게 된 던지는 것(당근·네잎클로버·옥수수·붕어빵) git rm. 31종.

## 마지막 기록 기준 v1228
### 1228차 미니펫 3마리·상호작용
**사용자: 「크레인·틀비계 · 상담사(하자보수센터 매니저) · 펫 최대 3마리 + 펫에 따른 상호작용」 → 시안(pvhum: 3마리 엔진·상호작용) 여러 차례(상담사 태블릿 뺌·올림머리·요원 수신기 / 민원인 머리·💢 / 요정 후보 다수 폐기 → 안전모·경광등 / 크레인 두 번 다시 / 「다니는 폭은 지금이 맞다」) → 「셋으로 TBM」 → 「적용 · 상호작용 더 · 공주·해적냥 삭제 · 버그 확인 · 자체 평가」**
- app.js: 펫 하나를 petMake() 로(예전 PET IIFE 그대로 + busy·상호작용용 노출), PET 은 묶음(최대 PET_MAX=3, 고른 순서). 공은 누른 자리에서 가장 가까운(상호작용 중이 아닌) 펫, 완료 축하·깨우기는 모두. 혼잣말(시간·공통 업무)은 첫 펫만.
- 상호작용: 6초마다 15% — 비어 있는(free: 자거나 잡히거나 공 쫓는 중 아님) 두 펫이 RULES 첫 맞는 장면(상담사↔민원인, 관리자 점검, 신호수↔장비, 민원인↔작업자류, 상담사↔작업자·관리자, 경광등↔민원인, 안전모↔작업자, 요정↔장비, 작업자↔장비, 작업자끼리, 요정끼리, 장비끼리, 동물끼리, 사람↔동물, 인사). 라바콘·안전모·경광등이 다 있으면 30% 로 TBM(모여 서서 작업·위험 요인·통제·착용 확인·「무재해로 가자! 좋아×3」). 단계마다 셋 다 ok() 인지 보고 아니면 그만(끌기·잠·내림). moveP 는 시간 초과로도 끝나 굳지 않음.
- 설정: cfg.pets(배열) · 고르기 창은 누르면 올림/내림, 4번째는 가장 먼저 올린 펫이 내려감, 여러 마리면 칸에 순서 번호. 단추 글자 「첫 펫 외 n」.
- CSS: #wgPet·#wgBall → .wgPet·.wgBall(여러 개). #wgPetSh 는 끄는 하나뿐이라 그대로.
- 그림: scratchpad/eq/export_all.py 가 직접 그린 24종을 한 번에 다시 뽑음(eq.py·hum.py outline 이 사방 1칸 여백 — 끝에 닿은 쪽 외곽선 누락 17종이던 것). 상담사 hum4.py, 안전모·경광등 eq8.py, 크레인 eq7.py, 건전지 items16.py, 안전 배지 items15.py.
- 확인(scratchpad/tests/pet-multi.mjs, 로컬 위젯): 예전 cfg.pet 호환 · 3마리 흩어진 자리 · TBM 끝까지 · 공 1개 · 토글·4번째 밀어내기·없음 · 상호작용 중 끌기 뒤 회복 · 오류 없음.

## 마지막 기록 기준 v1227
### 1227차 직접 그린 펫 웃는 얼굴
**사용자: 「던지기 주으면 얼굴 바뀌는 거 다른 펫들도 — 직접 그린 것만(다른 건 수정하면 안 될 것 같으니)」 → 시안 → 「적용」**
- hum.py char() 에 happy 인자(^ ^ 눈·벌린 웃는 입·분홍 볼), eq4.py cone() 에도 happy. scratchpad/eq/export8.py 가 eat 4장(팔 들고 들썩·폴짝) 을 4배로 저장 — 작업자·관리자·신호수는 출시본 폭(가로로 잘라 둔 84·80·88)에 맞춰 왼쪽 1칸 잘라 맞춤.
- 대상 9종: worker·manager·signal·painter·tiler·floorer·paperer·caulker·cone. 전용 fd 멘트 없음(😋). 장비·남의 그림 펫은 그대로.

## 마지막 기록 기준 v1226
### 1226차 민원인·먹이 받으면 표정
**사용자: 「민원인 넣는 거 어때, 항상 화나 있는 걸로」 → 「던지는 것 보상비 돈뭉치, 주우면 표정 방긋」 → 「돈 자루에 한가득 · 대사 「이제야 말이 통하네~」 추가」 → 「고객을 속물로 본다는 인식을 줄 수 있으니 돈이 아닌 서비스·관심·사랑」 → 「반창고 빼고 하트만」 → 「적용 · 주우면 얼굴 바뀌는 거 다른 펫에도(직접 그린 것만)」**
- 그림: scratchpad/hum/hum3.py civ() — 안전모 없음, 짙은 머리·보라 상의, 찡그린 눈썹·붉은 볼·💢. 쉬기: 주먹 들고 소리침·김. eat: ^ ^ 눈·웃는 입·분홍 볼·노란 반짝. 4배 + sm.
- 던지는 것: 하트 it-love(scratchpad/draw/items14.py). 돈뭉치·돈 자루·하트+반창고 안은 미채택(고객 인식).
- 앱: 먹이를 주우면 set(cfg.g.eat?'eat':'idle'), 멘트는 cfg.fd 가 있으면 그것(없으면 PET_LINES.food 😋). 2.6초 뒤 next() 로 평소 그림.
- 민원인 fd: 이제야 말이 통하네~ · 신경 써줘서 고마워요 · 다음엔 빨리 해주세요~ · 😊. 순서: 코킹공 뒤.
- 다음: 직접 그린 다른 펫(작업자류·라바콘 요정)에 eat 표정 시안. 남이 그린 펫은 라이선스상 손대지 않음.

## 마지막 기록 기준 v1225
### 1225차 코킹공·레미콘 수정
**사용자: 물건 요정 시안(드럼통이·바리케이드·벽돌이·시멘트 포대·실리콘건이·삼각대) 「기각」 → 「코킹공 · 비계 요정 어때 · 레미콘 통이 운전석과 너무 붙음」 → 「코킹공 레미콘 수정 좋다 적용」**
- 코킹공: hum2.py(캔버스 폭 27 — 코킹건이 몸 앞으로 나옴), 쉬기 때 노즐에서 실리콘이 흘러내림. 던지는 실리콘 카트리지 it-cart(scratchpad/draw/items10.py). 순서: 도배공 뒤. 표시 40×40~42.
- 레미콘: eq2.py mixer() — 드럼 폭 4~28 로 줄이고 30~32 에 물탱크·사다리, 운전석 35~45. 표시 72×40.
- 비계 요정(eq6.py, 발판 얼굴·강관 다리) 미채택. 다음: 민원인(늘 화난) 시안.

## 마지막 기록 기준 v1224
### 1224차 건설 펫 2차
**사용자: 「도장공 타일공 마루공 도배공 · 롤러 · 재미 요소 3종(라바콘 요정·안전모 슬라임·현장냥) 미리보기」 → 「안전모 슬라임·현장냥 빼고 적용 · 라바콘 요정은 라바콘 던지기 · 순서는 신호수 뒤 · 말티즈를 백구 뒤로 · 라바콘 요정 비슷한 컨셉?」**
- 사람 4종: scratchpad/hum/hum2.py(hum.py 의 char() 재사용, 23×28 칸). 도장공 흰 안전모·얼룩 작업복·롤러 / 타일공 주황 안전모·회색 작업복·공구 벨트·고무망치 / 마루공 노랑 안전모·초록 셔츠·앞치마·세운 마루판 / 도배공 흰 안전모·하늘색 작업복·도배솔.
- 롤러·라바콘 요정: scratchpad/eq/eq4.py. 롤러 앞 드럼 회전·쉬기 진동. 라바콘 요정 눈·다리 달린 라바콘, 쉬기 폴짝. 안전모 슬라임(직접 그린 슬라임 — Tiny Questers 슬라임은 AI 입력 금지라 쓰지 않음)·현장냥은 미채택.
- 던지는 것(scratchpad/draw/items9.py, 32px): 타일 it-tile · 마루판 it-plank · 벽지 롤 it-wpaper. 도장공 페인트 통, 라바콘 요정 라바콘, 롤러 기름통.
- export3.py 로 4배 그림 + sm. 순서: 신호수 → 도장공·타일공·마루공·도배공·라바콘 요정·롤러 → 굴착기…, 말티즈는 백구 뒤.

## 마지막 기록 기준 v1223
### 1223차 곤돌라·달비계 높이
**사용자: 「곤돌라랑 달비계는 살짝 높이 낮춰줘 · 더 추가할 만한 건설 관련 펫 추천」**
- eq3.py: 곤돌라 캔버스 46×28(바닥판 py 21→17, 와이어 4칸 짧게) — 표시 걷기 38·쉬기 39. 달비계 줄 위 여백 3→1칸 — 걷기 38·쉬기 39.
- 추천 후보는 답변으로만(결정 대기).

## 마지막 기록 기준 v1222
### 1222차 펫 순서·달비계·지게차
**사용자: 「지게차 높이 높다 · 달비계 발이 너무 큰데 앞으로 향함, 비계에 앉았으니 ㄱ자 · 곤돌라·달비계 던지는 것? · 순서는 대사 화면 말고 끌어서 이동」 → 「달비계 다리 줄여라(작업자들 숏다리) · 순서는 바꿨다」**
- 순서: 이름·대사 편집 아티팩트(Hk5…)에 「순서」 탭(기본) — SortableJS 1.15.0(cdnjs), 터치는 길게 눌러 끌기(delay 180). 저장본 pets/main 순서 그대로 pets.js 키 순서를 다시 씀. 저장본에 함께 들어온 수정: 관리자 대사 「작업 중지권 발동!」, 신호수 대사 「안전 제일!」, 쥐돌이 이름 「쥐」.
- 달비계(bosun): 곤돌라 뒤에 넣음(순서 편집 목록에 없던 펫이라 같은 외벽 작업인 곤돌라 옆). 허벅지 5칸·정강이 2칸 ㄱ자, 작은 장화. 4배 그림+sm, 표시 39×40~42.
- 던지는 것: 곤돌라·달비계는 페인트 통 it-paint(scratchpad/draw/items8.py, 32px), 나머지 장비 기름통.
- 지게차: 오버헤드 가드·마스트를 낮추고 팔레트 들기 0·2·5칸(표시 걷기 45, 쉬기 48).

## 마지막 기록 기준 v1221
### 1221차 직접 그린 펫 화질·곤돌라·고소작업대
**사용자: 「곤돌라 안전모가 버섯 같다 · 달비계 너무 크다 · 고소작업대 펴지면 위에 잘릴 듯 · 위젯에서 사람 픽셀이 깨짐 — 시안과 같은 품질로 · 펫 순서도 바꾸고 싶다」**
- 원인: 표시 크기가 원래 격자의 1.5배라 image-rendering:pixelated 에서 한 칸이 1px·2px 로 번갈아 그려져 눈·외곽선 굵기가 들쭉날쭉(시안은 2배 확대로 봐서 안 보였음).
- 처리: scratchpad/eq/export2.py 가 직접 그린 10종(worker·manager·signal·excavator·dump·mixer·gondola·scissor·ladder·forklift)의 walk·idle·t·z 를 최근접 4배로 키워 저장, pets.js 에 sm:1(image-rendering:auto 로 줄임). 다른 1.5배 펫(전사·슬라임 등 남의 그림)은 그대로.
- 곤돌라: 중간 작업자 mid() 를 높은 돔·얇은 테·가운데 골·점 눈으로. 고소작업대: 캔버스 34×40, 리프트 높이 0·2·4칸, 작업자 몸이 난간 앞(쉬기 최대 54px).
- 순서: 이름·대사 편집 아티팩트(Hk5…, db pets/main)의 BASE 와 저장본을 v1221 33종으로 덮어씀 — 사용자 저장 후 반영.
- 달비계(bosun): 26×37 칸으로 줄이고 페인트 통을 의자 옆으로(표시 39×42) — 시안만, 결정 대기.

## 마지막 기록 기준 v1220
### 1220차 건설장비 7종
**사용자: 「굴착기·스카이·레미콘 같은 건설장비도 그려볼 수 있냐」 → 「작업자 크기로, 덤프트럭도, 하자보수 장비도 추천」 → 「던지는 건 기름통 · 곤돌라 고소작업대 렌탈차 지게차」 → 「스카이 빼고 나머지 다 적용 · 사다리차 이름을 스카이로 · 곤돌라 중간 두 개 사람인지 식별 안 됨 · 달비계도?」**
- 그림: scratchpad/eq/eq2.py(굴착기·덤프·레미콘·옛 스카이차)·eq3.py(곤돌라·고소작업대·사다리차·지게차·달비계), export.py 가 동작별 위아래 빈 줄을 잘라 공유 팔레트 GIF 로 저장(t=쉬기 사본, z=쉬기 첫 장). 모두 오른쪽을 보고 그림(fl 없음), 1.5배 표시(폭 60~75px — 머리 줄에서 다닐 폭이 그만큼 줄어듦).
- 쉬기 동작: 굴착기 버킷 파기 · 덤프 적재함 들어 흙 쏟기 · 레미콘 드럼 줄무늬 회전 · 곤돌라 흔들림·롤러 칠 · 고소작업대 X자 리프트 오르내림 · 사다리차 사다리 들기(끝 바스켓에 상자) · 지게차 팔레트 올리기.
- 던지는 것: 장비별(흙더미·시멘트 포대·기름통) 대신 「모두 기름통」(먹이 반응과 어울림). it-dirt·it-cement 는 넣지 않음.
- 옛 스카이차(바스켓 붐) 미채택, 사다리차가 「스카이」 이름을 씀. 리트리버·깜장냥 삭제(그림 11개 git rm), 출처 주석의 Goldie·Cat 85 회색 언급 정리.
- 고르기 썸네일: 칸이 약 53×34 라 t 를 높이 34·폭 52 안으로 비율 유지 축소.
- 다음: 달비계(작업줄·생명줄·의자판·페인트통·롤러) 시안 — 결정 대기.

## 마지막 기록 기준 v1219
### 1219차 건설 캐릭터 3종
**사용자: 「흰쥐 오골계 마을청년 할아버지 빼고 몬스터나 사람(전사·슬라임 퀄리티, 무료)」 → 후보 정리 → 「다 별론데 전사 스타일 기반으로 건설 노동자·관리자 컨셉」 → 시안(pvhum) → 「안전모 납작」·「전사 비율로」·「점 눈」·「각도 앞쪽」·「안전모 디테일」·「현장 떼고 · 신호수 추가 · 신호수 라바콘, 작업자 안전모, 관리자는?」 → 「커피로」**
- 그림: scratchpad/hum/hum.py 가 도형으로 그림(21×28 칸, 1.5배 표시). 3/4 정면, 큰 머리·짧은 몸통·2칸 다리, 점 눈 두 개·작은 입·볼, 높은 돔 안전모(가운데 골·옆 리브·앞챙 반사·배지 — 작업자 초록 십자, 관리자 파란 마크, 신호수 흰 반사띠). 걷기 4장(다리 번갈아 들기·팔 위아래), 쉬기 4장(들썩·깜빡임, 신호수는 경광봉 흔들기).
- 전사(Tiny Questers) 는 수정 허용이지만 LICENSE 가 「AI/ML 모델의 입력으로 사용」 금지 → 전사 그림을 고치지 않고 비율만 재서 새로 그림.
- 던지는 것(직접 그림, 32px): 안전모 it-hat(작업자) · 커피 테이크아웃 컵 it-coffee(관리자, 도면 두루마리 후보는 미채택) · 라바콘 it-cone(신호수).
- 삭제: rat-white · chick-black · mf-villagerman · mf-oldman (그림 25개 git rm). 순서: 전사 뒤에 작업자·관리자·신호수, 그다음 공주.
- 다음: 사용자 요청으로 건설장비(굴착기·스카이·레미콘) 펫 시안.

## 마지막 기록 기준 v1218
### 1218차 펫 이름·대사·순서
**사용자: 「펫 이름이랑 대사 목록도 줘봐 수정해서 줄게 · 순서도 내가 조정」 → 「미리보기 형식으로(폰)」 → 편집 폼 아티팩트(db pets/main: order·pets{id:{n,say,lines}}) 저장 → 「펫 선택창 상태도 보여줘」**
- vendor/pets.js 를 저장본 순서로 다시 씀(객체 키 순서 = 고르기 창 순서). 이름·울음소리·전용 대사 그대로, 빈 대사 줄은 버림, 대사가 없으면 lines 키 자체를 지움.
- 버그: 시바(dog-akita)는 lines:[] 였는데 react 1번째 반응이 `cfg.lines?petPick(cfg.lines):cfg.say` 라 빈 배열에서 undefined 를 말할 수 있었다 → `cfg.lines&&cfg.lines.length`.
- 고르기 창 확인(위젯 620px): 5열, 「골든 리트리버」만 칸에서 말줄임(골든 리트…).
- 이어서 사용자: 「누렁이는 리트리버 뒤로 · 흑구 크림냥 치즈냥 북극여우 황계 삭제 · 골든 리트리버 골든 생략」 → dog-black·cat-cream·cat-ginger·fox-white·chick-lbrown 삭제(34→29, 동작·t·z 그림 30개), dog-golden 이름 「리트리버」, dog-brown 을 dog-golden 뒤로. 출처 주석에서 크림·드라큘라·치즈 언급 정리.

## 마지막 기록 기준 v1217
### 1217차 던지는 것 새 그림
**사용자: 「던지는거 디자인 좀더 이쁜거 — 공은 축구공, 닭다리는 고기, 닭 옥수수 말고, 풀은 건초 등, 빵 없애고 오리 먹이, 할아버지 사과, 아기 젖병, 슬라임 고기, 생선 못생김 · 딸기·사과 풍으로」 → 시안(pvit, 칸마다 후보·픽셀/매끈 전환) 여러 차례 → 붕어빵·축구공 등 「니가 픽셀아트 그려」 → 최종 8칸**
- 최종: 공(시바·강아지 셋·말티즈) it-ball = 직접 그린 축구공 32px · 고기(리트리버·여우 둘·전사·슬라임) it-meat = Noto 🍖 를 16px 격자로 줄인 것 · 붕어빵(고양이 7·펭귄) it-taiyaki = 직접 그림(가로로 긴 판) · 옥수수(닭 셋·오리 둘) it-corn = Noto 🌽 픽셀 · 네잎클로버(젖소) it-clover = Twemoji 🍀 픽셀(CC BY 4.0 — 출처 표기, pets.js 주석) · 젖병(아기) it-bottle = Noto 🍼 픽셀 · 사과(할아버지) pixelfood.
- 픽셀(16px) 그림은 2배 최근접으로 32px 저장 — #wgBall.it 16px 표시에서 레티나 1:1, 일반 화면 2×2 평균 = 원래 픽셀.
- 공: 예전엔 CSS 그라데이션 10px 공. 이제 #wgBall 16px 에 it-ball.png 배경(throwBall 이 it 없으면 it-ball) — 공·먹이 모두 16px 라 .it 크기 규칙·클래스 삭제, ballStep 위치 보정 8/16 고정. 물리(반발·미끄럼)는 여전히 cfg.it 유무로 갈림.
- 크기: 사용자 「던지는 것 네잎클로버 정도 사이즈로 다 키우자」 → it 그림 모두 잉크가 32px 칸을 꽉 채우게. 이모지 픽셀(고기·옥수수·젖병·클로버)은 원본 SVG 를 크게 그려 잉크 상자로 자른 뒤 16 격자로 줄이고 2배 최근접. pixelfood(사과·딸기·치즈·당근·꿀)는 잉크 상자로 잘라 긴 변 32 로 최근접 확대(비정수 배율이지만 16px 로 줄여 보이므로 티 안 남). 축구공은 원을 0~31 로 다시 그림.
- 붕어빵 사선: 「붕어빵도 사선으로」 → 그린 도형(몸통 타원·꼬리 다각형·지느러미)을 32° 돌린 좌표에서 다시 칠하고, 비늘·꼬리 결·아가미·눈은 돌린 자리에 화면 격자 기준 픽셀로 찍음(그림째 돌리면 무늬가 뭉개졌다). 머리가 오른쪽 위.
- 당근·꿀: 「당근은 통통한 스타일 · 사선 / 꿀은 꿀단지로」 → 당근은 사선 축에서 두툼한 몸통(끝으로 갈수록 가늘게)·가로 주름·잎 세 갈래, 꿀단지는 둥근 항아리 몸통·목·테두리 위로 꿀이 넘쳐 흘러내리는 모양(글자 없음). 둘 다 직접 그림 — pixelfood 그림 대신.
- 「당근은 다시해 사이즈 좀더 키우고 딸기도 살짝만 키우고」 → 당근: 몸통 길이 22→28·굵기 7.2→8.6, 잎 세 갈래 키움, 32px 칸 2~30. 딸기: 원본이 좁고 이미 세로 32 를 채워 그림으로는 못 키움 → app.js PET_IT_SZ={strawberry:18}(던질 때 #wgBall 크기, ballStep 위치 보정을 ball.sz 기준으로).
- 「당근이랑 붕어빵 살짝만 더 키워서 진행하자」 → PET_IT_SZ 에 carrot·taiyaki 18 추가.
- 지움: it-fish(Fluent) · it-chicken_thigh · it-kale · it-milk · it-bread(pixelfood). 남은 pixelfood: 사과·딸기·치즈·당근·꿀.
- 직접 그린 붕어빵·축구공·뼈 고기 등의 그림 스크립트는 작업 폴더(scratchpad/draw, tai)에만 둠.

## 마지막 기록 기준 v1216
### 1216차 전사 · 아기 오리 넣고 거북이 빼기
**사용자: 둘째 펫 자료 zip(오리·RPG 캐릭터·hmg·Popo 등) → 시안(pvpet6, 후보 28종 + 지금 33종, ＋/✕ 표시) → 「넣기 전사 · 아기 오리 / 빼기 거북이 / 새로 넣은 애들은 기존처럼 그림자나 높이 조정 동일하게 / 공던지기·먹이주기 정리해서 보여줘」**
- warrior: tiny-questers warrior_free gif 1x — walk_right 4장(150ms, 달리기 80ms) · idle_down 5장. 승리·공격·쓰러짐은 높이·폭이 커서(50px·96px) 뺌. z = idle 첫 장. 먹이 chicken_thigh.
- duckling: Duck 팩 duck_run_aside 13장(80ms, 달리기 50ms) · duck_idle 24장(100ms). 먹이 bread. 라이선스 문서 없음.
- 조정: 동작마다 프레임 합집합 상자로 잘라 아래 빈 줄 없음(발 = 바닥선, 그림자 .sh 가 그 1px 아래) · t = idle 그대로(34px 이하) · 그림자 폭은 set() 자동. 1214 의 8종 포함 새 10종 잉크 높이: 걷기/쉬기 차 ≤2px, 고양이 85 달리기만 +2.
- turtle-green 삭제와 함께 그 펫만 쓰던 it-lettuce.png 도 지움.
- 공던지기·먹이주기 정리 시안 제공(사용자 검토 대기).

## 마지막 기록 기준 v1215
### 1215차 기존 펫 정리
**사용자: 정리 시안(pvpet5 — 42종 걸려 보기 · ✕ 로 뺄 후보) → 「고양이·흰색 · 고양이·검정 · 턱시도 고양이 · 마녀 고양이 · 꼬마냥·회색 · 꼬마냥·흰색 · 토끼·얼룩 · 토끼·회색 · 산타 고양이」 · 「전사도 있을텐데」**
- 삭제 id: cat-white · cat-black · tux · cat-witch · kitty1 · kitty3 · bunny-spot · bunny-gray · xmas. 남은 펫이 쓰지 않는 그림 파일(동작·t·z, 이전 차수 잔여 포함) 55개 git rm.
- 출처 주석: Carysaurus · XmasCatFree · Bunny 16x16 · CatPackHalloweenFREE 줄 삭제, 1.5배 예외 = 꼬마냥·산타 · 토끼·흰색 · 해적 · 리트리버 · 펭귄 · 슬라임.
- 고른 펫이 지워진 사용자 → petSync 에서 P[k] 없음 → unmount, 설정 단추 「없음」(따로 옮기지 않음).
- 전사: tiny-questers warrior_free gif 1x walk_right 4장 · idle_down 5장(1.5배, 38x36). 승리(win)·공격은 칼이 머리 위로 높아(50px) 44px 칸을 넘고, 쓰러짐(die)은 칼·방패가 흩어져 폭 96 — 둘 다 넣지 않음. 시안에만, 앱 미반영.

## 마지막 기록 기준 v1214
### 1214차 새 펫 8종
**사용자: 펫 자료 zip → 「미리보기로 제공해봐」 → 시안(pvpet4, 후보 26종·라이선스 정리) → 「토끼 흰색, 고양이 치즈 회색 회백 해적2, 골든 리트리버, 펭귄, 슬라임 추가 · 기존 애들 정리 미리보기」**
- 추가(id · 출처 · 표시 배율): bunny-white(32PixelBunny · 1.5) · cat-ginger/cat-grey/cat-greywhite(Cat 85 Animations · 2) · cat-pirate(FreePiratePack PirateCat2 — 쉬는 3장뿐이라 st · 1.5) · dog-golden(Goldie pack · 1.5) · penguin(Spritesheets/GIFs · 1.5) · slime(Tiny Questers · 1.5).
- 자른 줄: 32PixelBunny Run 시트 5장=걷기·달리기, Idle·Sleep gif. Cat85 32px 칸 2행(걷기 8)·6행(달리기)·0행(쉬기 4)·11행 끝 장(눕기). Goldie 32x40 칸 6행 걷기·7행 달리기·3행 앉기. 펭귄 64px Walk 6·Idle 2. 슬라임 walk_right·idle_down gif.
- GIF 저장: 프레임 전체를 한 팔레트로 양자화하고 알파<128 을 255번(투명)으로 — Pillow 기본 저장은 검은 고양이(오레오)의 검정이 투명색과 겹쳐 배경이 까맣게 나왔다.
- 넣지 않은 것: 오레오(재배포·수정 금지) · Paws & Whiskers(비상업·재배포 금지) · 꼬마냥 소품(14 feb) · 곰 · 박쥐 · 버섯 · 해적1 · 고양이 용품 공/쥐.
- 출처 주석에 32PixelBunny · Cat 85 Animations · FreePiratePack · Goldie pack · Spritesheets/GIFs · Tiny Questers 추가, 1.5배 예외 목록 갱신.

## 마지막 기록 기준 v1213
### 1213차 계정 삭제
**사용자: 「계정 삭제는 진짜로 어떻게든 앱 내에서 할수없는건가?」 → 방법 3가지(앱 기록 정리 · GitHub 작업으로 로그인 계정까지 · 본인 탈퇴) 중 1+2 권고 → 「미리보기부터 · 업무는 남겨둬야지」(pvdel) → 「그래 진행하자」**
- 앱: ctxFor 계정 줄(#acctRoot · #freeRoot — 미배정·차단·승인 대기 표 줄에도 data-pid)에 「계정 삭제 — 이름」(danger). 담당자 삭제와 구분선. 본인·관리자 계정은 메뉴 없음(acct.del 에서도 막음 — 관리자는 먼저 사용자로). 확인창 뒤 루트 update 한 번: users/{uid}=null · calapp/acctDel/{uid}={at,by,email} · (명부가 있거나 맡은 업무가 있으면) calapp/people/{uid}=cleanPerson({…,sites:{},gone:1}) — 팀·권역·직급은 그대로라 업무 현황에서 그 사람 업무 묶음이 남는다.
- gone: rosterBuild 가 gone 표시 → ownName·tkOwnerName 은 그대로 이름을 찾고, 조직 관리 표·탭 숫자·팀/권역 숫자·직급 탭·필터 담당·담당자 고르기(ownSelHTML — 지금 그 업무의 담당이면 남김)에서는 뺀다. cleanPerson 이 gone 을 보존.
- 로그인 계정: 앱(브라우저)은 남의 Firebase 인증 계정을 못 지운다 → scripts/acct-del.mjs + .github/workflows/acct-del.yml(10분마다·수동 실행, firebase-admin 13.10.0 고정, 기존 FIREBASE_SERVICE_ACCOUNT). 요청자가 지금도 editor 인지 · 대상이 editor 가 아닌지 다시 확인 → auth.deleteUser(없으면 통과) → users/{uid}(그 사이 다시 로그인해 승인 대기로 생긴 기록) · 요청 지움. 실제 실행은 운영 환경에서만 확인 가능(이 환경 미검증).
- 규칙: calapp/acctDel 읽기·쓰기 관리자, people.gone 은 1 만 · 본인/팀장/공구장 쓰기에서 gone 불변(관리자만 붙임). 시험 AUTH-26a~h. **콘솔 게시 필요.**
- 설명서 위젯·설정 장에 계정 삭제 줄.

## 마지막 기록 기준 v1212
### 1212차 가입 승인 대기
**사용자: 「앱 로그인 돌파, 취약점이나 파이어베이스 데이터 유출 등 보안 심각사항 검토」 → 최우선 지적(회사 메일만 있으면 누구나 스스로 viewer 등록 → 하자·D+60 세대 사진·민원·전 직원 메일 열람) → 「승인대기 미리보기부터」(pvpend) → 「그래 하자 · 승인 대기 탭은 가장 마지막, 대기자가 있어야 탭이 보이게 · 한번 거절되면 다시는 가입 못하나?」**
- 규칙: users/$uid 본인 최초 쓰기 role 은 'pending' 만(이전 'viewer'). role 검증에 pending. MEMBER(editor·viewer) 정의는 그대로라 pending 은 users/본인 읽기 말고 전부 거부. people 본인 줄·prefs 쓰기에도 MEMBER 를 붙였다(차단·대기 계정이 명부·설정을 쓰던 것). 시험 AUTH-25a~k. **Firebase 콘솔 게시 필요** — 게시 전엔 새 가입자가 pending 기록을 못 써 계속 실패하고, 게시 후 기존 계정은 그대로(이미 viewer).
- 가입자: resolveRole 이 새 기록을 pending 으로. onAuth 에서 pending 이면 bootCacheClear → 게이트 cvView('wait')(인증 대기 칸 재사용 · 제목 「승인을 기다리고 있습니다」 · 「가입한 계정」 · 다시 보내기·스팸 안내 숨김) → pendWatch(users/{uid}/role on value). viewer·editor 가 되면 pendStop 후 onAuth 재진입(규칙이 DB 의 role 을 보므로 토큰 갱신 불필요). blocked 면 로그인 화면 「승인되지 않은 계정입니다」. 로그아웃·다른 계정·user null 에서 pendStop.
- 관리자: pendList(관리자·라이브만) · rosterBuild 는 pending 을 명부에 안 넣는다(담당자 고르기 등에 안 나옴). rOrgBar 탭 맨 끝 「승인 대기 N」(N>0 일 때만) · 고른 탭이 가로 스크롤 밖이면 밀어 보이게. 표(freeCard 자리): 이름 260 · 가입 시각 · 거절/승인(acct.pend → acct.role 재사용, 거절은 confirmModal). pendSync(users 구독마다): 사이드바 조직 관리·폰 메뉴 단추 .nv-bdg 숫자, 수가 늘면 toastAct 「가입 승인 대기 N명 · 보기」(위젯 포함 — 위젯 「보기」는 앱을 ?go=pend 로 열고 앱이 관리자 확인 뒤 조직 관리 승인 대기 탭으로).
- 거절 = blocked. 같은 계정은 다시 가입할 수 없지만(메일 하나에 계정 하나 — 이미 있는 계정) 관리자가 「차단」 탭에서 사용자로 바꾸면 들어온다. users 기록을 지우면 다음 로그인 때 다시 승인 대기로 등록된다.
- 설명서 시작하기에 승인 단계.

## 마지막 기록 기준 v1211
### 1211차 잠 zz 잘림
**사용자: 「펫 잠잘때 zz가 너무 높게 떠서 짤림」**
- 원인: .z 가 #wgPet(44px 칸) bottom:80% 고정 + line-height 기본(상자 16.5px) + 14px 상승 → 키 큰 잠 그림(마녀냥·아기·고양이)은 끝에서 창 위(-13.5px 까지)로 나갔다. 누운 그림이 낮은 펫은 반대로 머리와 멀었다.
- 고침: set() 이 그림을 바꿀 때 #wgPet 에 --ph(지금 그림 높이). .z{bottom:min(calc(var(--ph) - 10px),22px);line-height:1} · 상승 translate(8px,-8px). 34종 잠 그림(lie, 없으면 idle·walk) 실측 — 끝 위치 창 위 6~22px, z 아래는 머리 위 2px 겹침(마녀냥·꿀벌은 그림이 커 더 겹침).

## 마지막 기록 기준 v1210
### 1210차 목표일 월/일 · 시바 달리기
**사용자: 「디데이로 하지 말고 월/일로 하고 넘어도 동일한 양식인 대신 색을 붉은색, 당일이면 파란색 / 펫 시바견 달리기 직전에 갑자기 사이즈가 커지는데 확인 · 다른 펫들도 함 확인」**
- 목표일 꼬리: 늘 「M/D」(issMD). 단계 색 pd0 회색(8일↑) · pd1 노랑(7~4) · pd2 주황(3~1) · pd3 파랑(당일 — 데스크톱 --b600, 위젯 --b400) · pd4 빨강 글자(지남, 1209 의 빨간 배지 없앰 — 위젯 #FF7B7B). 남은 날은 말풍선 「목표일 · N일 남음 / 오늘 / N일 지남」. iss.mjs 단계 검사를 월/일 기대값으로.
- 시바: run.gif 8장 중 0·4번이 꼿꼿이 선 자세(원본 18px 높이, 걷기·쉬기 16~17px, 150ms)라 달리기로 바뀌는 순간 몸이 커 보였다 — 표시 배율은 모든 동작 2배로 같았다(크기 계산 문제 아님). 두 장을 빼고 질주 6장(120·70·120ms)으로 다시 저장(투명 유지). 원본은 작업 폴더 보관.
- 다른 펫: 34종 전 동작 프레임별 잉크 높이(표시 px) 실측. 배율 불일치 없음. 큰 차이는 동작 그림 자체 — 갈색·검정·흰 강아지 run 의 도약 한 장(+4), 레서판다·쥐 swipe 일어서기, 아기 idle 앉기(기어가기보다 큼), 거북 run 은 등에 로켓(원본 vscode-pets 그림). 손대지 않음.

## 마지막 기록 기준 v1209
### 1209차 주요 현안 목표일
**사용자: 「주요현안에 목표일을 설정하게 하고 목표일에 가까워질수록 숫자 색이 변하고 경과하면 붉은 색 — 일단 미리보기부터」 → 시안 pvdue(데스크톱·폰·위젯, 표기 두 안) → 「목표일을 정하지 않으면 날짜 띄우지 않고 툴팁으로만 언제 등록한 건지」 → 「전자로 하자 · 아이콘 두고」**
- 자료: calapp/iss/{sid}/{iid}.due = 'YYYY-MM-DD'(없으면 목표일 없음). database.rules.json 에 due 검증 추가 — **Firebase 콘솔에 규칙 다시 게시 필요**. 시험 AUTH-22i(허용)·22j(모양 틀림 거부). issRec 이 due 를 함께 옮긴다(해결·고치기에서 안 사라지게).
- 꼬리(issTail): 해결 → 「M/D 해결」. 진행 + 목표일 → D-N / D-day / D+N, 단계 클래스 pd0(8일↑, 기존 회색) · pd1(7~4, --am-ink / 위젯 #FFC27A) · pd2(3~1, #E8590C / #FF9A5C) · pd3(당일, --rd / #FF7B7B) · pd4(지남, 빨간 배지 흰 글자 / #E5484D). 진행 + 목표일 없음 → .nd(내용 없음, 마우스 올리면 옅은 #i-cal 13px, 폰은 안 보임).
- 고르기: 꼬리 안 투명 input[type=date].iss-due(inset 0) — 마우스는 click 에서 showPicker(업무 폼 날짜 칩과 같은 방식), 터치는 기본 동작. change → issDueSet(빈 값이면 지움). 고르는 동안 issTyping 이 .iss-due 를 입력 중으로 봐 실시간 다시 그리기를 미룬다(focusout 에서 밀린 것 반영).
- 우클릭(ctxFor 현안 줄): 진행 현안에 「목표일 정하기/바꾸기」(issDuePick = showPicker) · 「목표일 지우기」(있을 때) · 구분선 · 「현안 지우기」 · 「보드에서 빼기」. 문서 contextmenu 는 입력칸이면 기본 메뉴인데 .iss-due 는 예외로 줄 메뉴.
- 등록일·등록자: 꼬리에서 빼고 .iss-tx data-tip(「9/24 등록 · 이름」). 30일↑ 주황(ISS_OLD, .iss-m.old) 폐지 — 「오래된 현안 순」 정렬(issOld)은 그대로.
- 시험(iss.mjs): 목표일 없음 꼬리 비움·말풍선, 단계 5단(D-10·D-5·D-2·D-day·D+3), 저장, 우클릭 지우기. 설명서 「D+N」 줄 → 「목표일」.

## 마지막 기록 기준 v1208
### 1208차 위젯 탭 간격 · 새 현안 점 높이
**사용자: 「위젯도 주요현안 권역탭 데스크처럼 간격 좀 주고 / 현안 새로 쓰면 나오는 파란 원 살짝 아래로 쳐진 건지 이상하네」**
- 탭: 데스크톱 실측(탭 폭 85·87·92, 좌우 15, 글자-배지 11) → 위젯 .iss-wt 탭 사이 2→0, 단추 좌우 10→15, 간격 5→6 + 배지 기본 margin-left 5(1207 의 0 덮어쓰기 제거). 실측 폭이 데스크톱과 같다.
- 점: 1207 에서 .iss-tx 를 1.5px 내리면서 그 안의 ::before 점도 같이 내려가 원 중심보다 1px 아래(3x 47.5 vs 44.5). margin-bottom 1→3px 로 올려 위젯·데스크톱 모두 원 중심과 일치.

## 마지막 기록 기준 v1207
### 1207차 현안 글자 높이 · 카드 4줄 복귀 · 위젯 탭 배지 · 배경 무작위
**사용자: 「현안 내용 글자가 살짝 위로 올라간 듯 / 카드 기본 높이 다시 4개 기준 / 위젯 권역 탭 숫자 높이가 애매 — 데스크톱처럼 카운트 배지 / 배경화면은 시간 단위가 아니라 들어갈 때마다 랜덤」**
- 글자: 상자 중심은 원·날짜와 같았지만(158.4 vs 158.5) Pretendard 한글 잉크가 줄 상자 위쪽에 붙어 잉크 중심이 1.67px 위(3x 실측 39.5 vs 44.5). .iss-tx 에 position:relative;top:1.5px — 줄 높이·배치는 그대로. 1x 실측 원·글자·날짜 잉크 중심 모두 14.5(위젯)·15.5(데스크톱).
- 높이: 1206 의 5줄을 4줄로(.card.iss-c · #issPane · #issStrip), iss.mjs 문구도 4줄.
- 탭 배지: 위젯 권역 탭 숫자를 .rp-tcnt 로(데스크톱과 같은 부품), .iss-wt 안에서만 어두운 판 색(흰 10% · 켜진 탭은 --b400 20% 섞은 바탕 + --b400 글자).
- 배경: boot-wid.js 가 목록에서 지난번 사진(localStorage calapp.bglast)을 뺀 무작위 하나를 골라 window.BG_RND · bglast 에 적는다(고정 사진 규칙은 그대로). app.js bgPick = 고정 → BG_RND(목록에 있으면) → 같은 규칙으로 새로 고름. 목록이 새로 와도 보던 사진이 남아 있으면 그대로. 시간 순번(bgHour)·BG_HOLD·1분 setInterval 제거. 설정 「자동 변경」 말풍선·설명서 문구 고침.

## 마지막 기록 기준 v1206
### 1206차 주요 현안 손질 5건
**사용자: 「위젯 주요 현안 현장 추가 팝업 상단 검색창이 흰색으로만 뜸 / 현장 추가 버튼도 한번 더 누르면 닫히게 / 카드에서 삭제버튼이 있어서 날짜가 중간에 애매한 위치 — 삭제는 우클릭으로 / 카드 기본 높이를 업무 5개 들어갈 사이즈로 / 현장 카드 추가하면 위치 자동 배치」**
- 찾기 줄 흰색: .ctx-q 배경이 var(--mbg,var(--bg2)) 라 --mbg 를 주는 .ctxmenu.site 가 아니면 밝은 bg2. iss.more 를 담당 현장 고르기와 같은 cls:'site' 로(위젯은 #1A1D26 불투명 판 · 찾기 줄·아래 페이드 같은 색).
- + 토글: iss.sort 와 같은 방식(_ctxEl.dataset.for==='issMore' 면 closeCtx).
- 지우기: issItem 의 .iss-x 단추 제거(관련 CSS 6곳 정리) → ctxFor 에서 .iss-i 위 우클릭이면 [현안 지우기(danger), 구분선, 보드에서 빼기]. 폰은 길게 누르기(기존 550ms 경로). 설명서 줄 고침.
- 높이: .card.iss-c · #issPane .iss-c min-height, #issStrip height 의 4* → 5*. 데스크톱 카드도 같이(이전에 4줄을 같이 맞춘 결정 유지).
- 자동 배치: 정렬 「내가 놓은 순서」에서 order 에 없는 현장이 맨 끝(1e6+기본)으로 가던 것 → 기본 순서(권역·담당자)에서 바로 앞 현장 뒤에 끼운다. order 에 이미 있던 현장은 예전 자리. 다른 정렬은 원래 자동.
- 시험: iss.mjs — 우클릭 지우기·되돌리기, 5줄 높이 2항목, + 다시 눌러 닫힘.

## 마지막 기록 기준 v1205
### 1205차 작성 중 순서 고정 · 팝업 날짜 넘기기 · 내 업무만
**사용자: 위젯 개선안(pvwx) 중 「3,6만 수용 · 6은 버튼이 한 행 전부 차지하게」 + 「몇 번이나 시켰던 사항인데 아직도 업무 작성 중에 순서가 뒤바뀌는 오류 — 제발 고쳐라」**
- 재현(위젯·데스크톱, 같은 날 공통1·내 업무3·팀원1): 새 업무 — 폼이 맨 위 → 첫 글자 자동 저장 뒤 공통 아래로, 담당 나 → 내 업무 끝, 담당 팀원 → 맨 아래. 기존 업무 수정 — 담당을 바꾸면 폼이 그 등급 자리로, 공통으로 바꾸면 맨 위로. 달력 막대도 같은 이유로 줄을 옮김. 610·1046차는 제목·createdAt 만 고쳤고, 등급(evOrd)·담당 묶음(evOwnKey)·새 업무 첫 저장은 남아 있었다.
- 고침: sortPlans 를 키(planSortKey)+비교(planKeyCmp)로 나누고 rangePlans 가 planFreeze 로 편집 중 업무 키를 처음 그린 순간 값으로 고정(S.planEdit.sk — 새 업무는 'top'). buildEvents 의 draft 막대는 extendedProps ord·oky·cre 를 pe.ek(기존 업무는 orig 값, 새 업무는 ord -1 = 칸 맨 위)로 덮는다. 폼을 닫으면 정상 정렬로(closePlanEdit 에서 pe.ek 가 있었으면 refetchCal). 닫을 때 한 번 제자리로 가는 것은 의도.
- 확인: 같은 시나리오 위젯·데스크톱 모두 폼 자리·막대 순서 변화 없음. widget-layers 에 회귀 4항목(새 업무·수정 자리, ‹ ›·←→, 내 업무만).
- 팝업 ‹ ›: .dp-lh 에 .dp-nv 두 개(wp-x 부품, 위젯 팝업에서만 보임) → day.step = 쓰던 폼 닫고 selDate(±1,false,stick). stick 이면 widPlace 가 left·top 을 그대로 둔다(높이가 늘어 아래로 넘칠 때만 올림) — 단추가 손 밑에 남는다. 칸을 누르면 다시 그 칸 옆. 팝업이 맨 위 층이고 폼이 닫혀 있으면 ←→ 도 하루씩(그 밖엔 기존대로 달 넘김).
- 내 업무만: 위젯 필터 맨 위 한 줄 전체(.dp-fme, msel 켜짐 모양 · 꺾쇠 없음) — 담당 필터를 나 하나로 / 다시 누르면 해제. 담당 칩에도 그대로 보인다. 필터 판만 rgba(20,23,31,.9)(다른 어두운 판 70% 는 그대로). 데스크톱·폰 필터에는 안 넣음.

## 마지막 기록 기준 v1204
### 1204차 4주 현안 카드 3열/4열
**사용자: 「위젯 4주 모드에서 하단 주요 현안카드를 3열로할지 4열로할지 정할수있었음 하는데」**
- 위젯 설정에 「현안 카드 열」 줄(#wgColR, wgs-cyc 부품 · 값은 mvRoll 로 굴러 바뀜). 4주 + 주요 현안이 꺼져 있으면 숨김(#wgSet .wgs-r[hidden] 추가 — .wgs-r 의 display:flex 가 hidden 을 이겼다).
- 저장은 기기별 위젯 설정(calapp.wid issCol). widIss3 가 body.iss4 를 켜고 CSS 가 grid-auto-columns 를 (100% - 18px)/4 로, 빈 문구는 4칸 차지. 540px 이하는 기존 2장 규칙이 그대로 이긴다.
- 760px 위젯: 카드 폭 243 → 181px. 4열에선 머리의 담당자 이름이 더 일찍 말줄임.

## 마지막 기록 기준 v1203
### 1203차 렉·속도 최적화
**사용자: 「버그랑 렉 속도 최적화 개선 실시」**
- 측정(현장 15 · 사람 20 · 업무 1500(기간·반복 포함) · 현안 45, 크로미움): 달 넘김 위젯 564→377ms · 위젯 4주 434→272ms · 데스크톱 560→413ms, D+60 화면 전환 821→470ms, 위젯 부팅 1050→901ms.
- 원인: FullCalendar 는 dayMaxEvents 로 숨길 막대까지 전부 그리고 줄마다 getBoundingClientRect 로 잰다 — 한 달 350여 개. CSS(:has·backdrop·그림자) 제거 실험은 효과 없음.
- calTrim: FC events 에 넘기기 전, 하루짜리 막대를 날짜별로 eventOrder(-duration·ord·oky·start·allDay·cre·pid) 차례로 정렬해 (dayMaxEvents+1)개만 남긴다. 뺀 수 _evDrop[날짜] → moreLinkContent 의 .mlN(data-n) 에 #fcal MutationObserver(mlFix)가 더한다. 기간 막대는 줄 배치 때문에 그대로. dayMaxEvents 가 true(잴 수 없음)면 자르지 않는다. 칸 수 변경은 calMaxSet(batchRendering 안 setOption+refetchEvents).
- 검증: 위젯·데스크톱·폰 3달씩, 자른 것/전부 넘긴 것의 날짜별 보이는 막대(pid·위치)와 「외 N건」 숫자 일치(차이 0). 폰 큰 달력 「+N」은 그리는 시점에 mcal-full 이 없으면 「외 N건」이 남던 문제 → .mlP 를 CSS(body.mcal-full)로 숨기고 ::before '+'.
- fadeCalc/fadeMany: 페이드 칸을 모두 잰 뒤 한꺼번에 class 를 바꾼다(칸마다 읽고 쓰며 배치 계산을 다시 강제하던 것). 조직 화면 전환 fadeOne 104→58ms(4회).
- dfTopbar 구분선 판정 offsetParent → checkVisibility. mtabSync 는 위젯·넓은 화면에서 건너뛰고, 좁아질 때 창 크기 처리에서 부른다.
- 펫 34종 먹이 던진 뒤 끌기 점검: 오류·어긋남 없음.

## 마지막 기록 기준 v1202
### 1202차 정렬 단추 다시 눌러 닫기
**사용자: 「주요현안 정렬 버튼 한번 눌러서 팝업 뜬뒤에 다시 한번 누르면 팝업 닫히도록」**
- openCtx 는 앵커 위 mousedown 에서 닫지 않고 click 토글에 맡긴다 → iss.sort 에서 열린 메뉴가 issSort 것이면 closeCtx 후 끝(지도 년차 메뉴 kmYr 와 같은 방식). iss.mjs 확인 항목 추가. ＋(현장 추가) 메뉴는 요청 범위 밖이라 그대로.

## 마지막 기록 기준 v1201
### 1201차 공구장 담당 현장
**사용자: 1200 에서 낸 안(공구장에게도 담당 현장 칸) 「이 방향으로 가보자」 → 시안(조직 관리 계정·현장, 주요 현안 — 지금/바꾼 안) → 「그래 진행해」**
- rankUses(rank).sites 를 member 만 → member·lead. 이 한 줄로: 계정 표 공구장 줄 「담당 현장」 칸(현장 추가 단추) · 본인 계정 저장에서 공구장 sites 유지 · 직급 바꿀 때 공구장이 되어도 담당 현장 유지 · 현장 표 담당자 열(siteOwnersHTML) · 현장 지도 색/범례(kmSiteColor·kmOwnOf) 에 공구장 포함. 주요 현안 카드 담당자(issOwners)·「내 현장 먼저」·4주 아래 칸(mySites)·내 업무도 자연히 반영.
- D+60 점검 담당(d60Owner)은 담당자(member) 우선 그대로.
- 규칙: people/$uid/sites 검증은 이미 직급과 무관(관리자 · 팀장 · 현장 권역 = 내 권역) — 공구장 본인은 자기 공구 현장만, 바꿀 것 없음.
- 시안 확인 전에 작업 브랜치에 커밋해 두었던 것(stop hook) 위에 버전만 올려 병합.

## 마지막 기록 기준 v1200
### 1200차 주요 현안 현장명 줄임말
**사용자: 「주요 현안 카드 현장명은 줄임말로 하자 hs 이거」**
- issHead 의 현장명을 dfShortSite(하자 화면과 같은 규칙: 힐스테이트 → HS, 디에이치·더 에이치·THE H → TH)로. 카드 머리만(+ 메뉴 목록·토스트는 그대로 전체 이름).

## 마지막 기록 기준 v1199
### 1199차 주요 현안 — 끌어 옮기기 · 정렬 · 접기 · 새 현안 점
**사용자: 「주요현안 카드 끌어서 자리 배치 바꿀수있게 · 개인한테만 적용 · 권역 탭 영역 우측에 정렬 기능 · 이런 주요현안 관련 기능 개선안 너도 내봐 미리보기랑」 → 시안(①끌기+정렬 ②현안 없는 현장 숨기기 ③새 현안 표시 ④카드 접기) → 「2번을 숨기기가 아니라 접기로 / 3번은 새로 등록된건 하루동안 파란점 / 새1은 안해도되고 / 나머지는 모두 적용」**
- 내 설정: calapp/prefs/{uid}/iss = {sort: base|open|old|me|mine, order: 현장 id 쉼표, fold: 현장 id 쉼표, fe: 현안 없는 현장 접기}. store.putPref 로 저장(로컬 모드는 LocalStore prefs). 규칙 prefs/$uid/iss 추가(AUTH-24a~c). **콘솔 게시 필요.**
- 정렬: issSites = issSorted(issOrder(…)). open = 진행 수 많은 순, old = 진행 중 줄의 가장 큰 D+N 순, me = 내 담당 현장 먼저, mine = 내가 놓은 순서(목록에 없는 현장은 뒤에 기본 순서). 같으면 기본 순서. 데스크톱·위젯 판·4주 아래 칸 모두.
- 정렬 단추: 탭 줄 오른쪽 ＋ 앞 — 데스크톱 .tkq-add 「정렬」, 위젯 .iss-srt 아이콘(i-sort = Lucide arrow-up-down). openCtx 메뉴(현재 값 ✓, 「현안 없는 현장 접기」 체크, 「내 순서 · 접기 지우기」).
- 끌기: 카드 머리(.iss-ch / .tm-h, 단추·입력 제외)를 6px 넘게 끌면 같은 칸(d.par) 안에 position:fixed 복제본(.iss-drag) — 칸 밖 body 에 붙이면 위젯 유리 카드 꾸밈(#issPane .iss-c 규칙)을 못 받아 하얗게 보였다. 원래 카드는 흐리게(.iss-ph) 자리를 옮기고 나머지는 FLIP(MV_MID·MV_EASE). 놓을 자리는 줄로 흐르는 판이면 카드 좌우 반, 한 열이면 위아래 반. 놓으면 지금 보이는 카드끼리 순서만 전체 순서에 끼워 넣어 sort=mine 저장.
- 접기: 머리 두 번(dblclick) → fold 목록 토글. fe 켜면 진행 0 인 카드 자동 접힘. 접힌 카드는 머리만, 행 높이에 늘어나지 않게 align-self:start.
- 새 현안: 해결 안 된 줄 중 등록 24시간 이내 → 줄 앞 파란 점(.nw). 「새 N」 표시는 안 함.
- 시험: iss.mjs 정렬(진행 많은 순)·두 번 눌러 접기, 끌기는 위젯·데스크톱에서 직접 확인(s1 을 s3 오른쪽 반에 놓으면 s2,s3,s1).

## 마지막 기록 기준 v1198
### 1198차 펫 그림자 · 빈 카드 문구
**사용자: 「펫 그림자만 의미가 있다 모든 펫에 대해 적절한 그림자 넣어 / 주요 현안 카드 빈 카드에 내용 추가 할때 빈 카드일때 잇던 문구가 안사라짐」**
- 집 꾸미기 시안(방석·밥그릇·소품)은 채택 안 함 — 그림자만.
- 그림자: #wgPet 안 .sh(.bd 형제) — 바닥선 1px 아래, 높이 4, rgba(0,0,0,.3) 타원. 폭은 set() 에서 지금 그림 폭 × .62(fly 는 .42 · 투명도 .55 — 떠 있는 만큼 작고 옅게), 깊은 잠 그림도 맞춤. 깡총(hop)을 #wgPet → .bd 로 옮겨 몸만 뛰고 그림자는 바닥에 남음. 들고 끄는 동안은 .sh 숨기고 바닥 그림자(#wgPetSh)가 대신. 34종 모두 찍어 확인.
- 빈 카드: issCard — 줄이 없고 그 카드에 입력 칸이 열려 있으면 .iss-empty 를 그리지 않음. iss.mjs 에 확인 항목 추가.

## 마지막 기록 기준 v1197
### 1197차 주요 현안 카드 순서 · 넘기기 모션
**사용자: 「구성이나 디자인적인 개선은 없을까 뭐 집을 준다던지 / 그리고 위젯에서 주요 업무 넘길때 부드럽게 모션 넣어주고 / 카드 순서를 권역이랑 담당자 순서로 맞춰주라」**
- 순서: issSites = issOrder(…) — issGroups(권역 → 권역 미지정 → 인수 전) 묶음 안에서 담당자(issOwners) 중 명부(roster) 순서가 가장 앞인 사람 기준, 담당자 없는 현장은 뒤, 같으면 원래 순서. 데스크톱·위젯 판·권역 탭·4주 아래 칸 모두.
- 넘기기(「주요 업무」 = 주요 현안으로 봄): ① 권역 탭 전환 — 기존 탭 모션(MV_TAB)에 iss.rg → .iss-grid 가 고른 쪽에서 14px 밀려 들어옴(데스크톱도 같이). ② 4주 아래 칸 — scroll-snap(카드 시작), scroll-behavior smooth, 마우스 휠을 가로 한 칸(카드 폭+6) 넘김으로(260ms 안 연속 신호는 하나로, 카드 안 목록이 그 방향으로 더 구를 수 있으면 목록 먼저).
- 시험: 권역1 = 담당자1(명부 첫째) 현장 → 담당자2 현장 → 담당자 없는 현장 순, 휠 한 번에 202px(카드 하나) 이동, 탭 전환 시 애니메이션 1.
- 펫 집 꾸미기 시안(머리 줄 왼쪽 끝 방석·밥그릇, 오른쪽 끝 소품, 그림자 · 낮잠은 방석에서, 먹이는 그릇에서, 털실 놀이) — CatPackFree Furnitures.png(사용자가 올린 팩, 라이선스 파일 없음)에서 잘라 줄임. 답 대기. 둘째 묶음 아이디어(손님·마감·휴일·배고파)도 답 대기.

## 마지막 기록 기준 v1196
### 1196차 대사 반영 · 공통 업무 대사 손보기
**사용자: 「저장했음 / 외 몇건은 제외해줘 그건 말하지 말고 / 공통업무가 여러개면 랜덤으로 그중 하나 말해 / 펫 개선 사항에 대해 더 추천해줘 미리보기랑 함께」**
- 대사 편집 폼(아티팩트 「미니펫 대사 편집」, db lines/main) 저장본 v2 를 읽어 반영: 공통 — tap(제가요?·이걸요? 뺌) · ball(일 안하농·월급루팡·⚽·😎) · lunch(🍕🍔🍙🍖 추가) · leave(집에 가자 추가, 이모지 뺌) · com 「{t} 하자!」. 펫 — 꼬마냥·고양이류·레서판다·토끼·닭(울음 꼬꼬댁!)·꿀벌·마을 청년·할아버지(울음 에구궁)·공주·마녀 고양이(울음 냥!) 대사 교체.
- 공통 업무: 오늘 공통 업무 중 하나를 무작위로, 「외 N건」 없음. PET_LINES.comMore 삭제(폼 문서의 comMore 도 지움 — 다음 편집 때 안 나오게).
- 다음 회차 후보(시안 「미니펫 아이디어 — 둘째 묶음」): 손님 펫 · 오늘 마감 알림 · 휴일 앞날 · 배고파. 첫 묶음의 커서 바라보기는 미채택(답 없음).

## 마지막 기록 기준 v1195
### 1195차 펫 하트 · 오늘 업무 수 · 공통 업무 대사 · 대사 폼 · 4주 아래 칸 직급
**사용자: 「1번 도입하고 3번은 랜덤하게 그날 공통업무 있으면 말해줘 / 펫이 말하는 오늘 업무 몇건이 실제 업무 막대 개수랑 불일치하는데 아마 기간업무를 안세는건지 / 펫 대사 또 한번 다시 다 수정하려고 하니까 수정할수있는 폼 / 메이플이나 유명 게임에서 프리소스 푼거 없니 / 주요현안에 4주 모드하면 공구장은 아무것도 안뜨던데 담당공구의 모든 현장이 떠야지, 팀장은 그냥 모든 현장」**
- 하트: hearts(n) — 머리 줄에 .wgHt(12px, it-heart.png = Fluent Emoji ❤️ MIT 32px) 를 펫 머리 위에서 띄워 1.1초 CSS 애니메이션 뒤 지움. 쓰다듬기 반응 3개, 먹이 받아먹기 1개.
- 오늘 업무 수: 예전 todayN 은 오늘 칸에 그려진 하네스 중 abs(기간 막대)를 빼고 셌다 → 맞음, 기간 업무가 빠졌다. buildEvents(오늘,오늘) 에서 start ≤ 오늘 < end(없으면 start=오늘) 인 것 — 달력 필터도 같이 따른다. 기간 1 + 당일 1 시험에서 막대 2 = 펫 2.
- 공통 업무: talk 주기(30초)에 시간대 대사가 아니면 8% 로 오늘 공통 업무(classNames team) 하나를 「오늘 공통: {t}」(14자 자름) + 더 있으면 「외 {n}건」. 없으면 말 안 함. 끄는 중·공 있을 때 쉼.
- 대사: 코드 안 문자열('😋' '😵' '일 안하농' '오늘 업무 N건')을 PET_LINES(food·drop·idle·today·com·comMore)로 모음. 편집 폼 아티팩트 「미니펫 대사 편집」(db lines/main, 지금 대사로 채워 둠) — 사용자가 저장하면 읽어서 PET_LINES·pets.js 에 반영할 것.
- 4주 아래 칸: issStripHTML — isTeamRank(팀장·안전·원가) 전부, lead 는 내 people.region 과 같은 권역 현장 전부 + 내 현장, 그 밖은 내 현장.
- 게임 프리소스: 메이플스토리 등 상용 게임 그림은 공식 무료 공개가 없고(넥슨은 2차 창작을 권장할 뿐 사내 도구에 쓰는 허락은 아님) 쓰지 않는 게 맞다고 답함.

## 마지막 기록 기준 v1194
### 1194차 끌기 고장(가져가기 뒤) · 성능 점검
**사용자: 「물고기 먹은 뒤에 끌기 오류가 생기는건지 처음에는 끌기 잘 되다가 무슨 트리거가 걸리는건지 그 뒤로는 고장남 / 그리고 이것저것 마니햇는데 성능에 영향 안주는지 다시 체크」**
- 재현: 먹이를 던져 가져가게 한 뒤 끌면 펫은 그대로, 그림자만 움직임(꼬마냥·상자 고양이 둘 다). 원인 — moveTo 의 Web Animation 이 fill:'forwards' 라 끝난 뒤에도 transform 을 계속 덮어써, 끌기의 인라인 transform 이 안 먹었다. 먹이 가져가기가 아니라 「걷기든 달리기든 이동이 한 번 끝난 뒤」면 모두 해당(처음엔 아직 이동이 끝나기 전이라 됐던 것). → onfinish 에서 자리를 인라인에 적고 그 애니메이션을 cancel. 1193 의 「떨어지는 중 다시 잡기」 고침은 그대로 둠.
- 성능(위젯 620×520, 업무 200건, 30초 평균 메인 스레드): v1173(펫 없음) 0.52% · v1176(시바) 0.81% / 지금 펫 없음 0.52% · 시바 0.86% · 꼬마냥 0.92% · 상자(천천히) 0.74% · 4주+현안 0.80% · 판 켬 0.78%. 평상시는 예전과 같은 수준.
- 끄는 동안이 무거웠다: 12초 끌기 포함 30초 평균 24.9%(같은 마우스 움직임만 3.5%). 매 pointermove 마다 bounds()·getBoundingClientRect 측정 + 인라인 transform·rotate·그림자 style 변경 → 스타일 재계산(이 문서는 :has 규칙 때문에 비싸다). → 잡을 때 한 번만 재고, 펫·흔들림·그림자를 멈춰 둔 Web Animation 3개(ax·ar·as)의 currentTime 만 rAF 로 한 프레임에 한 번 바꿈 → 10.9%(끄는 동안만 약 20%, 놓으면 0). 그림자 drop-shadow 필터는 차이가 없어 둠, 흔들림 CSS 전환은 쓸모없어 뺌.
- 확인: 가져가기 뒤 끌기 40px → 40px, 아래로 끌어도 머리 줄 6px 들림, 놓은 뒤 남는 애니메이션 0.

## 마지막 기록 기준 v1193
### 1193차 펫 끌기 손보기 · 상자 고양이 방향
**사용자: 「펫이 안끌려가고 그림자만 끌릴때도 있음 / 위젯 하부로 끌려갈땐 그림자는 위에 잔존함 그냥 위에서만 끌수있게 하는게 어떤지 / 박스 고양이 뒤로 이동함 펫 방향에 따라 반전을 해주던지 확인해」**
- 그림자만 끌림: 놓은 뒤 떨어지는 애니메이션(Web Animation, 최대 0.7초)이 끝나기 전에 다시 잡으면, 진행 중인 애니메이션이 인라인 transform 을 덮어 펫은 안 움직이고 그림자만 따라왔다. 그 애니메이션을 land 로 들고 있다가 잡을 때 취소. (재현: 놓고 0.12초 뒤 다시 잡아 끌기 → 고친 뒤 -60 끌면 -63 따라옴)
- 끌기 범위: 머리 줄 안 가로로만(0 ~ 머리 줄 폭-펫 폭), 세로는 6px 들린 채 고정 → 그림자가 늘 바로 밑. 놓으면 걸을 수 있는 칸으로 떨어짐. 달력 위로 폴짝 올라오는 동작은 쓸 일이 없어 뺌.
- 방향: 상자 고양이(머리 왼쪽·꼬리 오른쪽), 크림 고양이(꼬리 오른쪽)가 왼쪽을 보고 그려져 오른쪽으로 갈 때 뒤로 가는 것처럼 보였다 → 둘 다 fl:1.

## 마지막 기록 기준 v1192
### 1192차 펫 잡아 끌기 · 고양이 생선
**사용자: 「펫 끌기가 끄는 동안 마우스에 잡혀있어야는데 그렇지가 않다 / 미리보기랑 해서 잘 만들어봐라 / 고양이 음식을 생선으로 하면 어때」 → 시안(실제 위젯 스냅샷 위 끌기 + 생선 3후보)에서 「난 생선 3번 / 해서 적용해」**
- 원인: 1190 의 끌기는 가로로만, 걸을 수 있는 칸 안에서만 움직여 커서를 위아래·칸 밖으로 움직이면 손을 떠난 것처럼 보였다.
- 새 끌기: pointerdown 에서 잡은 점(gx,gy) 기억 · setPointerCapture. 4px 넘게 움직이면 held — translate(x,y) 로 커서를 2D 로(창 안으로 제한), .bd rotate 로 끄는 속도만큼 흔들림(transform-origin 위 · ±25°), 끄는 방향으로 돌아봄, 바닥에 놓일 자리 그림자 #wgPetSh. 놓으면 x 를 걸을 수 있는 칸으로 맞추고 y>8(달력 위)이면 -14px 를 거쳐 폴짝 올라와 앉고, 아니면 떨어지듯(ease-in). 착지 깡총 + 😵. 조상 중 잘라내는 칸은 #content 뿐이라 달력 위로도 보인다(z 60).
- 고양이류 10종 먹이: 지금 쓰는 pixelfood 에 통생선이 없어 이모지 3종(Noto·Twemoji·Fluent)을 후보로 → Fluent Emoji 🐟(MIT) 를 32px 로 줄여 it-fish.png. it-salmon.png 지움.

## 마지막 기록 기준 v1191
### 1191차 설정 버전 표기 · 펫 버그 점검
**사용자: 「위젯 설정 팝업 제목 우측에 버전 표기해줘 / 펫 관련 버그도 좀 확인해보고」**
- 설정 제목 오른쪽 #wgVer = 'v'+APP_VER(widApply 에서), 12px 회색.
- 펫 점검 방법: PET 코드 전체 읽기 + 위젯에서 펫 6종 × 무작위 30동작(던지기·누르기·끌기·쓰다듬기·업무 완료) 뒤 공이 남았는지·계속 움직이는지 확인.
- 버그 ①(재현됨): 공이 날아가거나 가지러 가는 중에 펫을 2번 이상 누르면 react 가 stop()/moveTo 로 가져가기 애니메이션을 끊고 next 는 ball 이 있어 그냥 돌아가 → 공이 바닥에 남고 펫이 영영 멈춤. PET.done() 도 같음. → ball 이 있으면 react 는 깡총+말만, done 은 자리 이동 생략.
- 버그 ②(재현됨): 커서를 가만히 둔 자리로 펫이 걸어 들어오면 mouseenter 가 멈추고 타이머를 지워, 커서를 움직일 때까지(마우스를 안 쓰면 계속) 굳음. → petAct(마지막 pointermove)가 400ms 안일 때만 쓰다듬기, 끄는 중 제외, 반응 3초 뒤 later(next).
- ③: 먹이 펫(it)의 누르기 3번째 반응이 「공 문 그림」(with_ball) — 공을 물고 있어 먹이와 안 맞음 → swipe.
- 고친 뒤 같은 무작위 시험 4종 모두 공 남음 없음·계속 움직임.

## 마지막 기록 기준 v1190
### 1190차 보드 현장 넣기(하자 토글 무관) · 설정 펫 줄 · 펫 끌기
**사용자: 「주요 현안 현장 카드 추가 버튼 누르면 뺀 현장이 없다고 하는데 이거 아마 하자처리현황에 토글 온 된거만 뜨게 되어있는거같은데 그거랑 무관하게 추가할수잇게해줘 / 펫 줄 시안 적용해 / 펫 잡고 끌어다가 옮길수도 있게 해줘」**
- 맞음 — 1189 는 dfSites(하자 화면 표시 토글 켠 현장)만 대상이라 + 목록이 비었다. issBase = 팀의 이름 있는 현장 전부, issVis = issHide 덧씀(true 뺌 · false 넣음) 없으면 !dfIsHidden. issHideSet(sid,on) 은 기본과 같아지면 지운다. 규칙 issHide 값을 참거짓 둘 다(AUTH-23c 넣기 false 허용, 23g 문자 거부). **다시 게시 필요.** 백업 되돌리기도 참거짓 그대로.
- 1189 의 issHide 줄 주석이 calapp/iss 구독 줄 주석과 뒤섞여 있던 것 바로잡음.
- 설정 미니펫 줄: 시안대로 그림을 라벨 칸 오른쪽 #wgPetT(투명도 % 자리), 버튼엔 이름·화살표만.
- 펫 끌기: #wgPet pointerdown → 4px 넘게 움직이면 끌기(깊은 잠·낮잠 깨움, 걷기 멈춤, 쉬는 그림, 방향은 끄는 쪽). 걸을 수 있는 폭(bounds) 안. 놓으면 깡총, 3초 뒤 다시 돌아다님. 끈 뒤 click 은 누르기 반응·공 던지기 둘 다 건너뜀(PET.dragged). 공이 날다가 끄는 동안 멎으면 ballStep 이 기다렸다가 놓은 뒤 가지러 간다. touch-action:none, 끄는 동안 grabbing.

## 마지막 기록 기준 v1189
### 1189차 주요 현안 — 보드에서 현장 빼기 · 넣기
**사용자: 「주요현안 카드가 표기되는 조건이 뭐지 / 권역 탭 라인 우측에 플러스 넣어서 더 넣을수있게 하면 좋을거같은데 / 그리고 우클로 빼줄수있게」 → 두 갈래(현장 아닌 카드 · 보이는 현장 고르기)를 물음 → 「보이는 현장 추가지 / 팀 전체에 적용이야」**
- 표시 조건(답한 내용): dfSites — 조직 관리 현장 중 이름 있고, 하자 화면 숨김(cfg/dfHide) 아니고, 선택 팀 소속. 탭은 권역 → 권역 미지정 → 인수 전 현장. 위젯 4주 아래 칸은 그중 내 담당.
- 저장: calapp/issHide/{sid}=true. 팀 공통이라 cfg(관리자만 쓰기)가 아니라 따로 두고 MEMBER 쓰기(현안 쓰기와 같은 단계). 값은 true 만, 넣으면 지운다. 규칙 AUTH-23a~f. **콘솔 게시 필요.**
- issSites() 가 issHide 를 거른다 → 데스크톱·위젯 판·4주 아래 칸·권역 탭 숫자 모두. issHidden() = 뺀 현장.
- 빼기: ctxFor 맨 앞 .iss-c[data-sid] → 「보드에서 빼기」, toastAct 되돌리기. 입력 칸 위 우클릭은 기본 메뉴.
- 넣기: 탭 줄 오른쪽 — 데스크톱은 업무 현황과 같은 .tkq-add 「현장 추가」, 위젯 .iss-wt 끝 + 아이콘. openCtx 로 권역별(issGroups) 목록, 8개 넘으면 찾기 칸. 뺀 현장이 없으면 토스트.
- 로컬 모드 _d.issHide, 백업(bkData 둘 다)·되돌리기 포함. 안내서 한 줄.
- 설정 미니펫 줄 시안(그림을 투명도 % 자리로)은 사용자 답 대기 — 변경분은 스크래치 패치로 보관.

## 마지막 기록 기준 v1188
### 1188차 펫 그림 바꿀 때 튀는 것
**사용자: 「먹이 던지면 펫의 위치가 갑자기 바뀌는 버그」**
- 위젯에서 던지기를 반복하며 매 프레임 그림 가운데 x 를 기록 — 4px 넘게 바뀐 순간은 모두 그림이 바뀌는 순간(쉬기↔달리기↔받기)이었고 5~10px. 동작마다 그림 폭이 다르고 #wgPet 은 왼쪽 기준이라 몸이 옆으로 밀렸다(먹이를 받으면 「받기」 대신 폭 좁은 「쉬기」로 바뀌어 더 눈에 띔). 그보다 큰 순간 이동은 재현 안 됨.
- 고침: mount 에서 .bd 폭 = 그 펫 그림 중 가장 넓은 폭, 그림은 그 안 가운데·바닥. 다시 재니 꼬마냥·쥐·젖소 0, 시바는 달리기 그림 자체 모양 차이로 한 번 6~11px.
- 같은 날 요청: 설정 미니펫 줄(그림을 투명도 % 자리로) 시안 · 주요 현안 표시 조건 설명 · 권역 탭 + / 우클릭 빼기 — 다음 회차.

## 마지막 기록 기준 v1187
### 1187차 꼬마냥 쉬기 · 못 걷는 펫 이동 · 펫별 먹이
**사용자: 「꼬마냥 회전을 너무 많이 해서 불편함 / 걷는 모션이 없는 애들은 느리게 이동하면 되지 않을까 대신 걷는 주기 더 적게 / 펫에 따라 공이 아니라 다른거여도」 → 시안(꼬마냥 쉬기 3안 · 속도 3단 · 미끄러짐/콩콩 · 펫별/모두 공)에서 「정면만 · 콩콩으로 · 펫마다 다르게 · 젖소 아주 살짝만 줄이자 · 적용하자」**
- 꼬마냥 회색·흰색·산타 idle: 원본 6장이 정면→뒤→옆→정면으로 1.2초마다 돈다 → 정면 장(0·4·5)만 1400/300ms 로 다시 저장.
- st(크림·상자 고양이): moveTo 가 제자리였던 것을 쉬는 그림으로 이동 — 초당 10px(공 받으러 16px), 1px 씩, 움직이는 동안 #wgPet.wad 로 1px 콩콩. next 의 걷기 확률 st 만 15%. 1185 의 「공이 굴러온다」(ballEl._roll) 는 뺌. 속도는 시안에서 따로 고르지 않아 기본(느리게)으로.
- 먹이: pets.js 의 it(고양이류 연어, 여우 닭다리, 너구리·마을 청년 사과, 레서판다·공주 딸기, 쥐 치즈, 토끼 당근, 닭 옥수수, 젖소 풀(kale), 오리·할아버지 빵, 꿀벌 꿀, 거북이 양배추, 아기 우유 · 강아지는 공). 그림은 npm pixelfood 32px 를 vendor/pets/it-*.png 로, #wgBall.it 배경으로 16px. 바닥에서 덜 튀고(.25) 바로 멎는다. 받으면 with_ball(공 문 그림) 대신 idle + 😋.
- 라이선스: pixelfood 는 CC BY-NC-SA 4.0(비상업) — 사용자에게 알림. 젖소 데모 팩과 같은 조건.
- 젖소: 2배(38) → 34/19배(walk 47×34, idle·z·t 43×30).

## 마지막 기록 기준 v1186
### 1186차 펫 정리 · 주요 현안 카드 높이 · 4주 + 주요 현안
**사용자: 「빼기 2 — 농부, 귀족 남자 / 크기 바꿈 4 — 꼬마냥·회색 20→30px, 꼬마냥·흰색 20→30px, 꼬마냥·산타 23→34px, 토끼·회색 26→539px / 선택창에 펫 미리보기도 사이즈 적당히 / 걷는 동작없는 애들 굴리는거 미리보기 / 주요현안 카드 제목에 현장명이랑 담당자 글자가 살짝 위로 / 카드 기본 사이즈를 목록 4개 채울 정도의 높이, 3주 모드에서도 동일 / 3주 모드를 4주 모드로 — 전주 금주 담주 다담주 주요현안 1행」**
- 크기 4종은 정수 배가 아니라(원본 1배 → 1.5배) 픽셀 굵기가 고르지 않다고 물었고 사용자가 「적은 대로 1.5배」로 답함. 토끼 539 는 39 로(1.5배 = 26→39). g·z 모두 ×1.5(내림). pets.js 머리 주석에 예외로 적음.
- 농부(mf-peasant)·귀족 남자(mf-nobleman) 목록·그림 파일 삭제 → 34종.
- 고르기 창: t 를 위젯 표시 비율대로(젖소 24×17→48×34, 말티즈 34×32, 마녀 27×34 등). 칸 높이 34 를 넘으면 줄인다. 설정 단추의 썸네일도 같은 t 를 쓴다(손대지 않음).
- 위젯 카드 머리: 잉크 중심을 재 보니 현장명 ~1.2px · 담당자 ~0.8px 가 프로필·+ 보다 떠 있었다 → b·.n·.iss-own top:1px. 데스크톱은 담당자 이름만 1px.
- 카드 기본 높이 = 현안 4줄: 줄 높이는 max(글줄, 지우기 단추 19px) — calc 로. 판 164 · 아래 칸 156 · 데스크톱 181(테두리 포함). aspect-ratio 정사각형은 뺌.
- 4주: dayGrid4w(4주·한 주씩), 시작은 오늘-7(전주), calRef 는 둘째 주(금주). 아래 칸은 grid-auto-flow:column 한 줄 — 3장(좁은 위젯 2장) 폭, 넘치면 옆으로 · 카드 안 목록은 세로로 구름. 설정 글·토스트·안내서 「4주 + 주요 현안」. 설정 키 iss3·함수 이름 cal3 등은 그대로(저장값 호환).
- 확인만: 로컬 모드에서 4주 아래 칸 첫 그림에 담당자 표시가 빠짐(사람 목록보다 먼저 그림, 다시 그리면 나옴) — 실서버는 people 구독이 다시 그려서 해당 없음으로 보고 손대지 않음.
- 미리보기: 걷지 못하는 펫 공 받기(앱 PET 코드 그대로 옮긴 HTML).
- 시험: iss.mjs 4주 뷰·아래 칸 한 줄·카드 기본 높이 항목.

## 마지막 기록 기준 v1185
### 1185차 마녀 고양이 방향 · 걷지 못하는 펫 공 받기
**사용자: 「미니펫 사이즈랑 빼기 미리보기 다시 줘봐 조정좀 하게 / 마녀냥은 뒤로 날아가던데 확인해보고 / 걷는 모션이 없는 애들한테 공 던져주면 이동을 못하니까 줍지를 못하던데」**
- 마녀 고양이: 원본 스프라이트가 왼쪽을 본다 → vendor/pets.js 에 fl:1(PET.face 가 반대로 뒤집음).
- st 펫(cat-cream·cat-box): moveTo 가 제자리라 공에 닿지 못했다 → ballStep 에서 공이 멈추면 펫 앞까지 굴러오는 애니메이션(ballEl._roll) 후 with_ball. 새로 던지면 굴러오던 것 취소.
- 펫 36종 크기·빼기 미리보기 다시 게시(앱 반영은 사용자 결정 뒤).

## 마지막 기록 기준 v1184
### 1184차 주요 현안 아이콘 · 새 기능 점검
**사용자: 아이콘 시안 2번(현장 계열 → 「현장 느낌 말고 사무적인걸로」) → 「목록판으로 하자 / 전체적으로 새로 넣은 기능들에 대해서 버그 없는지 오류없는지 중복이나 데드코드 간소화도 체크」** — i-board = Lucide layout-list(사이드바·위젯 머리·폰 메뉴 공용, 안내 글도 고침). 점검(주요 현안 · 3주 뷰 · 위젯 판 · 펫 · 오후 점검 삭제 자리):
- 버그: 3주 + 판 켬 상태에서 + 를 누르면 rIss(force) 가 문서 첫 .iss-in(숨은 #issStrip 쪽)에 초점 → 판 입력 칸에 글이 안 들어갔다. 판이 켜진 동안 아래 칸은 그리지 않고, 초점은 offsetParent 가 있는 칸만, 판을 끌 때 rIss() 로 아래 칸을 다시.
- 버그: 고치던 줄(.iss-ed)에서 해결·지우기 단추는 focusout 저장을 건너뛰는데 S.issUI.ed 가 남아 다시 그린 화면에 입력 칸이 살아 있었다 → iss.ck·iss.del·iss.rg 가 ed(탭은 add 도) 를 비운다.
- 위험: 규칙 iss/$sid 를 [A-Za-z0-9_-]{1,40} 로 막아 두면 하자 게시본에서 옮겨 온 옛 현장 id 가 다른 꼴일 때 저장이 거부된다 → 길이(1~80) 검사만(RTDB 키 금지 문자는 DB 가 막는다). 규칙 다시 게시 필요.
- 빠짐: 백업(bkData — 앱·위젯 둘 다)·백업 되돌리기에 주요 현안이 없었다 → iss 를 담고, 되돌리기 확인 문구에 건수.
- 정리: 「가운데 창」 시절 주석 3곳, .iss-wt 기본값을 #issPane 값으로 덮던 두 벌 정의 → 한 벌, .iss-c .tm-h>span 정렬 두 벌 → 한 벌, 쓰지 않는 #issPane .iss-sc 패딩·--card-bg 변수 제거. 펫 목록의 그림 파일 누락·남는 파일 0, 정수 배 위반 0 확인. 오후 점검 삭제 뒤 남은 참조 0(evePop·eveOn·notiOn·wgNoti).
- 시험: scripts/test/iss.mjs(데스크톱 14 + 위젯 8 항목) 를 run-all 에 추가.
- 정적 감사 WARN 1(title= 2곳 — 펫 고르기 단추·강조색 점, 1174 에서 들어옴) → aria-label·data-tip. 펫 본체 el.title 도 aria-label 로.

## 마지막 기록 기준 v1183
### 1183차 주요 현안 카드 담당자 표시
**사용자: 「주요 현안 카드에 제목 앞에 담당자 프로필 넣기를 할까 / 제목 영역에 담당자 지정색으로 음영을 줄까」 → 시안(지금·프로필·색 음영·둘 다) → 「음영 프로필로 하는데 앞에 제목 앞에 선은 빼자 / + 앞에는 담당자 이름 넣고 연한 색으로」** — issHead(s,n,pg) 하나로 위젯(.iss-ch)·데스크톱(.tm-h) 머리를 그린다. 담당자 issOwners(sid) = roster() 중 sites[sid] 가진 사람. 음영: 머리에 --itc(colBg(첫 담당자 색)) + ::before 불투명도(위젯 .28, 데스크톱 .16) — 그라디언트·무지개도 colBg 로 그대로 칠해진다. 위젯은 카드 모서리 10px 밖으로 칠이 비쳐 ::before 위쪽 모서리를 둥글게. 프로필 원 20px(.iss-av — avInner, 아이콘 색 avIcCol), 둘 이상은 -7px 겹침(최대 3). 이름: + 앞 .iss-own(연한 글자, flex 1 1 0 — 좁으면 이름이 먼저 줄고 현장 이름은 지킨다). 담당자 없는 현장은 예전과 같다.

## 마지막 기록 기준 v1182
### 1182차 미니펫 정리 · 바닥선
**사용자: 폰 미리보기(실제 위젯 머리 줄 + 49종 크기·빼기) → 「빼기 13 — 회색 고양이, 꼬마냥·주황, 작은 고양이, 드라큘라 고양이, 닭·흰색, 닭·갈색, 닭·회색, 원숭이, 일꾼, 마을 아가씨, 할머니, 귀족 부인, 여왕 / 크기 바꿈 — 말티즈 26→34, 마녀 고양이 34→44, 젖소 21→42 / 마녀고양이가 너무 높게 날고있음 / 젖소가 살짝 높게 걷는듯 / 신규 추가 펫들 기존 펫들처럼 직접보고 동일한 높이에서 있도록」** — 원인: 새 펫(젖소·닭·토끼·말티즈 등)은 RGBA 로 잘랐는데 반투명 그림자(알파 ≤128)가 GIF 투명색으로 빠지며 아래 1~4줄이 비었다. 모든 그림·썸네일·깊은 잠을 알파 128 기준 합집합으로 다시 잘라 저장(좌우 빈 칸도), 표시 크기는 같은 배율로 줄임. 실제 위젯에 36종을 하나씩 띄워 img 아래 끝이 머리 줄 위에서 35px 로 모두 같음을 확인(나는 펫 제외). 젖소는 다시 자른 뒤 원래 19px 이라 42 는 소수 배 → 정수 2배 38. 마녀 고양이는 44px 로 키우면 머리 줄 위로 17px 솟아 fy(둥실 위쪽 끝) 3px — PET mount 가 c.fy 를 읽는다(기본 16, 아래 끝 fy/4). 정수 배 점검 스크립트로 sm 아닌 펫의 모든 그림이 원본의 같은 정수 배인지 확인(0건 위반). 주요 현안 카드 담당자 표시(프로필·지정색 음영) 시안만 — 결정 전.

## 마지막 기록 기준 v1181
### 1181차 미니펫 15종 추가 · 정수 배율
**사용자: 후보 시안(32종)에서 「넣기 15 — 꼬마냥·산타 모자2, 토끼·회색, 토끼·얼룩, 작은 고양이·주황, 말티즈, 닭·흰색(새), 닭·연갈색, 닭·검정, 젖소, 고양이·검정, 고양이·흰색, 고양이·크림, 드라큘라 고양이, 상자 고양이, 마녀 고양이 / 빼기 17 — 꾸미기 리본·안경·날개 등, 산타 모자1, 루돌프 2, 닭·진갈색, 뱀파이어, 상자 속 검은 고양이」 · 「크기 억지로 조절해서 픽셀이 뭉개지는 펫들이 있던데 최적의 사이즈로 돌려놓자」** — 원인: 표시 크기(w,h)가 원본의 소수 배(1.35·1.53·1.62·0.84 …)이고 고르기 창은 다시 1.2배. 고침(scripts 밖 일회 변환): 그림마다 같은 색 연속 길이의 공약수로 확대 배율을 찾아(3% 허용) 위상을 맞춰 원래 격자로 줄여 다시 저장, 표시 크기 = 원래 크기 × 정수 k(k = round(26/걷기 높이), 최소 1), 썸네일은 34px 이하 정수 배, 깊은 잠 그림도 같은 k. 결과 높이 18~34px(꼬마냥 20 · 시바 34 · 강아지·여우·너구리·레서판다 32 · 쥐 26 · 사람 24~30). 격자가 없는 그림(vscode 닭·원숭이 — 매끈하게 그린 원본, 말티즈 128px 고해상 · 마녀 64px)은 정수로 줄일 수 없어 sm(image-rendering:auto)로 매끈하게. 새 펫: 꾸미기 시트는 장식만 들어 있어 꼬마냥·회색 위에 겹침, run=walk, lie=잠 줄, z=잠/쉬기 첫 장. 닭(새)·젖소는 왼쪽을 보고 그려져 fl(PET.face 가 뒤집음). 크림·드라큘라·상자 고양이는 걷는 그림이 없어 st — moveTo 가 제자리에서 돌아선 뒤 끝낸다(공도 그 자리에서). 젖소 GHAP 데모는 비상업·개인 프로젝트 라이선스(사용자에게 알림). 전용 멘트 각 3줄(글자만/이모지만).

## 마지막 기록 기준 v1180
### 1180차 위젯 주요 현안 유리 · 설정 구분선
**사용자: 「위젯 주요 현안 유리 적용해주고 배경 없애줘 / 권역 탭은 헤더처럼 별도 영역으로 배경 넣어주고 유리처리 / 각 현장 카드 기본 높이를 줘서 정사각형에 가깝게 / 위젯 설정에서 미니펫 아래 구분선 빼자, 간격도 너무 넓은듯 / 미니펫 추가 소스 미리보기」** — #issPane: 판 배경(wgDyn) 삭제, gap 6. .iss-wt 는 요일 머리와 같은 유리(wgDyn H 톤, blur 14) 띠, 버튼 높이 42(요일 머리). 카드: wgDyn 의 날짜 칸 유리(a+.1) + blur, aspect-ratio 1/1. 설정: 미니펫 아래 .wgs-sep 삭제(그 자리 12px 여백도 함께 빠짐). 미니펫 후보 — 받아 온 zip(꼬마냥 꾸미기 14 feb 11종·겨울 4종 — 장식만 든 시트라 꼬마냥·회색 위에 겹침, Bunny, Bunbun, 주황 작은 고양이, 말티즈, 닭 4색, 젖소(GHAP 데모: 비상업·개인 프로젝트만), Carysaurus 검정·흰색, CatPackFree·Halloween 제자리 그림, 마녀 고양이 비행)를 GIF 로 잘라 비교 시안. Free pack cat 1·1.6·1.9 는 이미 꼬마냥 1~3.

## 마지막 기록 기준 v1179
### 1179차 위젯 주요 현안 자리 바꾸기 · 오후 점검 알림 폐지 · 설정 순서
**사용자: 「위젯에서 주요 현안 누르면 팝업을 띄우는게 아니라 그냥 헤더 밑으로를 주요 현안으로 스위칭 / 오후 점검 알림 이거 기능은 없애자 / 강조색, 미니펫은 글꼴 밑으로 보내자 그리고 구분선도 같이」** — 가운데 창(#issWin, LAYERS iss, .iss-win/.iss-wh/.iss-wx) 삭제 → cal-card 안 #issPane: body.iss-on 이면 #fcal·#calFchips·#issStrip 숨김, 판 = 권역 탭(.iss-wt) + 카드 3열(560↓ 2열), 배경은 wgDyn 의 날짜 칸 유리색. 머리 단추 aria-pressed 로 켜짐 표시(강조색). 달력 조작 ACT(cal.prev/next/pick/today, day.fmore, nq.toggle)는 먼저 달력으로 돌린다. 켤 때 날짜 팝업(widPop)은 닫고, 끌 때 CAL.updateSize·calFitApply. 오후 점검: evePop 말풍선·eveList·eveOn·notiOn·1분 setInterval·부팅 호출·설정 스위치(#wgNoti)·CSS(#evePop)·widget-layers 말풍선 시험 삭제(dfNewPop 의 겹침 회피 코드도 정리). 설정: 강조색·미니펫(+구분선)을 글꼴 아래로.

## 마지막 기록 기준 v1178
### 1178차 주요 현안 창 깜빡임 · 높이 · 3열
**사용자: 위젯 창 캡처 — 「+누를때마다 화면 깜빡이고 / 밑에 여백 불쾌함 3열로 바꾸고 하단은 카드에 맞춰서 높이 조정 / 제목에 진행 0 없어도 될듯 / 아이콘 바꾸고 싶은데 적절한거 내와봐」** — 깜빡임 원인: rIss 가 #issWin 안을 통째로 바꿔 .iss-win 이 새로 생기고 popSc 가 매번 재생. 틀은 열 때 한 번 만들고 안쪽만 바꾼다(재현 스크립트로 + · Enter 뒤 getAnimations 0 확인). .iss-win height → max-height, .iss-sc flex:0 1 auto. 카드 격자 3열 고정(560px↓ 2열). 아이콘은 후보 9종(Lucide — 화이트보드·클립보드·메모장·포스트잇·칸반·할 일·주의 말풍선·깃발·핀)을 실제 위젯 머리 줄·사이드바에 끼운 시안 → 「포스트잇으로 하자」 → i-board = sticky-note(사이드바·위젯 머리·폰 메뉴 공용).

## 마지막 기록 기준 v1177
### 1177차 주요 현안 보드
**사용자: 「현장 주요현안 보드 … 사무실 화이트보드를 디지털로 … 위젯 헤더 아이콘 · 위젯 설정에서 3주(전주·금주·다음주)+현안 카드 전환 · 데스크톱은 업무 관리에 페이지」 → 시안 1(권역 판 안 칸 나누기·중요 표시) → 시안 2(현장별 카드 분리, 중요 표시 뺌, 위젯은 가운데 창, 다른 화면과 같은 틀) → 시안 3(30일 · 해결 7일 뒤 숨김 · 밝은 판 폐기 · 3주 아래는 내 담당 현장만, 창과 같은 카드, 그 자리에서 수정) → 「데스크톱도 그냥 위젯의 팝업 창과 동일한 구성으로 넣고 적용하자 / _일째 이거보다 더 좋은 표현법」** — 데스크톱 「주요 현안」(사이드바 업무 현황 아래 · 폰 메뉴 시트): 밑줄 권역 탭(dfSiteGroups — 하자와 같은 묶음, 진행 건수) + 현장 카드 격자(auto-fill 270px, 카드 = .card + tm-h 머리 띠). 줄: 동그라미 해결/취소 · 글자 눌러 고치기(빈 칸이면 지움) · × 지우기(되돌리기 알림) · 꼬리 D+N(적은 날부터, 0이면 「오늘」, 30일↑ 주황, 툴팁 등록일·등록자) / 해결은 「M/D 해결」, 7일 지나면 보드에서 뺀다(자료 유지). 위젯: 머리 줄 보드 단추(Lucide presentation → i-board) → 가운데 창(바깥·Esc·× 닫기, 바깥 클릭은 삼킴) — 같은 구성. 설정 「3주 + 주요 현안」: 달력 FC 커스텀 뷰 dayGrid3w(3주, 한 주씩) + 아래 반 칸에 내 담당 현장(mySites — 로컬 모드는 전부) 카드, 카드 판은 날짜 칸 유리색(wgDyn)을 따른다. 저장 calapp/iss — 규칙 새 노드(MEMBER 쓰기, $sid 통째 삭제는 editor, t 1~200자, at·by 필수, 모르는 칸 거부) + rules-auth AUTH-22a~h. 사용 안내 「주요 현안」 장 추가(글). 경과 표기는 팀이 이미 쓰는 D+ 표기를 따랐다.

## 마지막 기록 기준 v1176
### 1176차 미니펫 최적화 2
**사용자: 「더 최적화할수있는 방안 탐구」 → 비교 시안(부드럽게 vs 1·2·3px) → 「그래 2로 해서 다 적용하자」** — 위젯 프로세스 전체 CPU(SystemInfo.getProcessInfo)로 다시 재니 메인 스레드 밖(합성·래스터)이 컸다: 걷는 이동(초당 60번 다시 그림) 약 150ms/s, 제자리 GIF 26ms/s, 멈춘 그림 0. 끊는 단위별: 1px 105 · 2px 87 · 3px 80 · 4px 76(렌더러 45 안팎은 애니메이션이 도는 한 남음). 적용: 걸음 steps(거리/2), 걷기 40%, 3분 무활동 깊은 잠(정지 PNG, bob pause, 대사 중지 — 공·완료·클릭·마우스로 깸), 그림 낱개 파일(같은 GIF 은 한 파일 공유, 246개 775KB). 측정(소프트웨어 GPU): 시바 활동 중 렌더러 24·GPU 38ms/s, 깊은 잠 0/0, 받는 양 46KB.

## 마지막 기록 기준 v1175
### 1175차 미니펫 성능 · 버그 점검
**사용자: 「버그 없는지 확인 / 성능에 영향을 많이 안주는지 확인」** — CDP Performance.getMetrics 로 위젯(620×520) 10초 측정: 펫 없음·강조색만 1ms, v1174 펫 520~650ms(스타일 재계산 200~300ms). 원인은 프레임마다 인라인 transform 쓰기 — 같은 조건에서 빈 div 하나만 20fps 로 옮겨도 33ms/s 가 나와, 이 문서의 스타일 재계산 단가(:has 규칙) 문제로 확인. GIF 재생 자체는 0. → PET 재작성: moveTo 가 element.animate(합성기) 한 구간씩, 끝나면 next() 가 다음 행동(걷기 55%·쉬기·눕기·낮잠), 지금 자리는 애니메이션 진행률로 계산(레이아웃 안 읽음), 나는 펫 둥실은 .bd 무한 animate, 공은 날 때만 rAF, 시간 대사는 30초 간격 20%. 결과 6ms(시바)·22ms(꿀벌). 힙 +1.7MB(pets.js). 펫 동작 점검 13항 통과, 전체 테스트 PASS.

## 마지막 기록 기준 v1174
### 1174차 위젯 강조색 · 미니펫 · 배경화면 스크롤바
**사용자: 「위젯 커스텀 디자인 요소 … 미리보기는 필수」 → 시안 여러 차례(테마·사진·타일·스킨 등 폐기, 강조색 확정) → 「펫」 방향(vscode-pets 등 무료 픽셀 펫, 받아 온 Elthen·itch.io 팩 추가) → 「적용하자 / 설정에서 배경화면 더보기 팝업에 세로 스크롤바」** — 위젯 설정에 강조색 점 6개(WID_ACC)와 미니펫 단추. 미니펫 고르기는 설정 창 왼쪽의 같은 유리 카드(#wgPick, 5열·스크롤, 맨 앞 없음), 레이어 wgSet 의 keep 에 #wgPick 포함 · 설정 닫히면 같이 닫힘. PET 컨트롤러: 걸을 폭 = 년월 묶음(오늘 단추 포함) 오른쪽 ~ 필터 칩·단추 묶음 왼쪽, 좁으면 숨김. 그림은 동작별로 위아래 빈 줄을 잘라 발이 단추 아래선(margin-top −27)에 닿게, 꿀벌만 떠서 둥실(fly). 대사(사용자 확정)는 글자만 또는 이모지만. 그림 출처는 vendor/pets.js 머리 주석(vscode-pets·Elthen·itch.io 무료 팩) — 정식 라이선스 문서는 각 페이지에서 확인 필요.

## 마지막 기록 기준 v1173
### 1173차 로그인 화면 판 36%
**사용자: 「카드 영역을 좀만 줄이고 싶거든 배경화면을 좀만 더 볼수잇게 / 모바일은 그냥 둬도 되겟고 데스크톱만」 → 미리보기(50·42·36%, 불러오는 중·폼·들어가기 재생) → 「36으로」「버그 안생기는지 잘 확인하고」** — 데스크톱(≥961px) 로그인 화면은 본문 판(#main)을 오른쪽으로 밀어 유리 판으로 쓰는 구조라 50vw 네 곳(#coverGate left · #main translateX 둘(사이드바 보통/접힘) · .ah-brand 가운데 25vw)을 :root --lgx:64vw 하나로 묶었다. 961px 에서 판 346px·카드 298px(가입·인증·재설정 포함 넘침 없음). 들어가기·로그아웃 움직임은 같은 transform 이 변수만 바뀌어 시간·곡선 그대로.

## 마지막 기록 기준 v1172
### 1172차 보고서 버그 재확인
**사용자: 「버그 없는지 재확인 / 브랜치는 알아서 없어지는거같은데」** — e2e 시드로 기준월 2026-09·2027-01, 팀·현장(운영 현장 sA, 인수 전 현장 sZ — 주차 2개월·장기 0) 보고서를 dfPrintReport → A4 PDF: 모두 2쪽, 페이지 오류·콘솔 오류 없음. 한 하네스에서 인쇄 세 번째에 렌더러가 죽는 것은 v1167 코드에서도 같아 하네스(메모리) 문제로 판단 — sZ 단독은 정상. 고침: 장기 고착 0건 칸 생략. 브랜치: 저장소 설정 delete_branch_on_merge=true 라 병합하면 GitHub 가 작업 브랜치를 지운다(지금 원격엔 main 뿐).

## 마지막 기록 기준 v1171
### 1171차 추이·도넛 더 줄이기 · 인쇄 여유
**사용자: 실제 인쇄 PDF 2개(엣지 155, HDharmony) — 「추이차트가 안짧아졌는데? / 도넛 사이즈도 더 줄여야겠고」** — 9월 기준월(월별 9행)이라 1쪽이 남아 추이가 상한 180까지 늘었다(1170 은 범위만 75%). 추이 상한 110, 도넛 100~120·지름 상한 96(반지름 48). 같은 PDF 2쪽에서 업체 표 합계 줄이 쪽 번호에 닿음 — 화면 실측보다 인쇄 글자 높이가 커지는 차이로 보고 rptFit 의 쪽 번호 위 여유를 14→30px. 남는 높이는 표 행(상한 4·처리계획 18)·절 간격(상한 14) 뒤엔 빈다.

## 마지막 기록 기준 v1170
### 1170차 추이·도넛 줄이기
**사용자: 「추이차트가 너무 길다 지금의 75% 수준으로 줄여도 되겠다 / 미처리 분포 도넛 사이즈도 좀 줄여서 섹션 영역을 줄이자」** — rptFit 높이 범위를 75% 로: 추이 84(기본)~180(상한)·68(넘칠 때 하한), 도넛 120~150·96. 그만큼 남는 높이는 표 행(--g 상한 4, 처리계획 18)·절 간격(--sg 상한 14)이 받고, 그래도 남으면 아래가 빈다(시드 현장 보고서 2쪽 약 29mm). 도넛이 낮아져 이름표가 겹치던 것 — 간격 23~28 고정, 들어갈 만큼만 표시.

## 마지막 기록 기준 v1169
### 1169차 처리계획 칸 — 이번 달만
**사용자: 「현장페이지에서 처리계획 쪽 보고서는 전월 안나오게 해주라 금월 소제목도 빼고 그냥 처리계획만 나오게」** — rptSite planTbl 의 처리계획 칸에서 지난달 계획 줄과 「전월」「금월」 라벨을 뺐다. 표의 전월 건수 열은 그대로. CSS .plan .prev · .plan .lb 삭제.

## 마지막 기록 기준 v1168
### 1168차 보고서 인쇄 양식 개편
**사용자: 「하자처리현황에 보고서 인쇄 레이아웃, 여백, 간격, 크기 등 더 전문적인 느낌으로 … 미리보기 시안 제공」 → 시안 16회 조정 후 「미처리 분포 좌우 사이에 옅은 구분선만 넣어서 적용」** — 확정 사항: 글꼴·바닥(쪽 번호만)은 현재 그대로, 머리는 현재 틀 유지. 12월(월별 12행·52주)·관리현장 13개 기준으로 두 쪽이 차도록 맞추고, 남는 높이는 내용이 받는다(1쪽 추이 그림 112→최대 240, 2쪽 도넛 160→최대 200 · 모자라면 표 행 간격을 최대 2px 줄여 도넛 자리를 만든 뒤 도넛을 줄임) → 그다음 표 행(--g, 처리계획 표는 금월 기입란이 받아 최대 14) → 절 간격(--sg 최대 10). 넘치면 dense → dense2. 기각된 시안: 추이 둘로 나누기(좌우·상하), 회의 모드 권역 카드·공종별 막대 목록·장기 비율 막대, 맑은 고딕/명조, 바닥 문서명·옅은 선. 연초(1월)는 월별 표가 짧아 1쪽 아래가 남는다(추이 그림 상한 240) — 미결. 검증: e2e 시드 13개 현장·2026-12 기준월로 dfPrintReport → page.pdf A4 2쪽, 본문 끝이 종이 아래 13~16mm.

## 마지막 기록 기준 v1167
### 1167차 위젯 App Check 끄기
**사용자: 「구글은 빼도 되는지 확인해봐 / 앱체크 그때 이후로 꺼두고잇어」** — 작업 관리자의 「WebView2 서브프레임: https://google.com/」(30.1MB, 위젯 132.6MB 중) = App Check 의 reCAPTCHA Enterprise 숨은 창. 근거: 127~128차에 RTDB·Auth 의 App Check 강제를 끄고 그대로 두기로 했고 사용자가 지금도 꺼 둔 상태라고 확인. App Check 필수였던 AI 중계(703차)는 앱에서 이미 빠짐(app.js 에 호출 없음). → fbInit 에서 `WIDGET` 이면 appCheck().activate 를 하지 않는다. 위젯 전용 디버그 토큰 경로(FB.APPCHECK_DEBUG·FIREBASE_APPCHECK_DEBUG_TOKEN)는 쓸 곳이 없어 삭제. ⚠ 콘솔에서 RTDB/Auth 강제를 다시 켜면 위젯이 데이터를 못 읽는다(FB._dbWatch 가 「보안 확인(App Check) 토큰 문제」로 알림) — 그때는 `&&!WIDGET` 를 되돌린다. vendor/firebase-app-check-compat.js 는 index.html 고정 태그라 위젯도 받지만 activate 전엔 창·통신 없음. 검증: 전체 테스트 PASS. 실제 위젯 메모리 감소는 사용자 작업 관리자로 확인 필요.

## 마지막 기록 기준 v1166
### 1166차 알림 유리 테 빼기
**사용자: 「토스트 윗부분 글래스 효과가 어색 여기는 빼는게 어떤지」** — 알림 캡슐의 위쪽 흰 반사광 줄(--lqd-hi)과 바깥 어두운 테(--lqd-edge)를 4개 규칙(#toast,.toast-bk 기본 · body.wid · 폰 · 데스크톱)에서 제거, box-shadow 는 아래 그림자만. 판(--lqd-fill)·흐림(--lqd-blur)은 유지. 검증: 전체 테스트 PASS.

## 마지막 기록 기준 v1165
### 1165차 위젯 반응 · 유리 플랫하게
**사용자: 「위젯 빠릿하질 못한데 / 모션이 렉을 유발하는거 아닌지 / 위젯 헤더쪽은 리퀴드글래스 적용하지 말자 / 위젯은 66에서 70으로 / 전체적으로 너무 리퀴드글래스 스러워졋는데 테두리 부분이라던지 좀 예전하고 중간쯤 / 플랫한 느낌으로」** — 계측(헤드리스, 위젯 460×760, 동작 7개 × 흐림 켬/끔 × 모션 켬/끔, 최대 프레임·34ms 넘는 프레임·긴 작업): 흐림 40px 켬일 때만 팝업 옮기기 57ms·달 넘김 75ms(긴 작업 57ms) 튐 — 모션을 꺼도 달 넘김(FullCalendar 다시 그리기 ≈50ms)·업무 추가(폼 그리기 ≈40ms)는 그대로라 모션 자체보다 큰 흐림이 부담. 프로파일: 달 넘김 = cal.next 53ms 중 calFitApply 9.7ms(강제 배치), 업무 추가 = openPlanEdit 16ms·fadeScan 14ms. 조치: --lqd-blur 40→20px(판이 70%라 눈차이 거의 없음) → 다시 재니 흐림 켬/끔 차이 사라짐. 위젯 달 넘김은 칸 크기 열쇠(창 크기·body 클래스·인라인 스타일)가 같으면 calFitApply 를 건너뜀. ⚠ 실제 GPU(WebView2)는 헤드리스와 달라 체감은 미확인 — 남은 의심: 1154 의 손 놓은 60초 뒤 메모리 목표 Low(캐시를 비워 첫 조작이 무거울 수 있음). 모양: :root 토큰만 바꿔 앱·위젯 전체에 — --glass .66→.76, --lq-blur blur(20px) saturate(1.6), --lq-hi 위 한 줄 .6, --lq-line .13→.09, --lq-edge .18→.1, --lqd-fill .66→.70, --lqd-hi 위 한 줄 .12, --lqd-edge .5→.25. 위젯 머리 단추(.cal-move·.cal-nav·.seg) 테두리 1px rgba(255,255,255,.14)로 되돌리고 그림자 뺌. 검증: 전체 테스트 PASS.

## 마지막 기록 기준 v1164
### 1164차 지워도 되는 파일
**사용자: 「이번엔 너가 올려줄수있니 / 지워도 되는 파일 있으면 지워주고」** — 저장소 dongyexn/plan(마지막 커밋 v1156)을 내려받아 로컬과 대조: 저장소에만 있는 파일 없음(vendor/libredwg·dwg-split·dwg 시험 자료는 사용자가 이미 지움). 로컬에만 있는 것: .gitignore · .github/workflows/pages.yml · scripts/build-min.mjs(1163). 참조 전수 확인 후 삭제: `scripts/coast-land.mjs`(608차 점검표에 「지워도 되는 유일한 파일」로 적힌 폐기 접근), `scripts/test/shot-prod.mjs`(설정 게시 카드 일회용 스크린샷 — run-all·package.json·문서 어디서도 안 부름). 남긴 것: site-geo-check(진단 도구, kmFind 복사본), apt-index·geo2026(지도 자료 재생성), font-subset·css-dedup(재사용 도구). push: 저장소 쓰기 권한 요청이 이 세션에서 거부돼 올리지 못함 — 사용자가 zip 으로 올림. 검증: 전체 테스트 PASS.

## 마지막 기록 기준 v1163
### 1163차 전체 점검 · 배포본 경량화
**사용자: 「전체적으로 버그 데드코드 중복 오류 수정 / 경량화 실시」** — 점검 결과: ESLint 9(no-undef·no-unreachable·no-dupe-keys·no-redeclare·no-self-assign·no-fallthrough 등) — 미정의는 vendor 전역(LZString·DOMPurify·ChartDataLabels)뿐, 안 쓰는 값 2(riskAuditCSV 는 콘솔 도구라 유지). CSS: css-dedup 죽은 선언 0, 완전 중복 규칙 0(인쇄 @page 두 벌은 문맥이 달라 둠), 안 쓰는 keyframes·id 0, 안 쓰는 변수는 --aifs(아래)·--band·--mv-slow(토큰이라 둠)·--fc-*(FullCalendar 가 읽음). 같은 선언을 가진 규칙 묶음 105개 중 합쳐도 캐스케이드가 같은 44개를 합쳐 보니 1.5KB(0.2%)뿐이고 지운 규칙 옆 주석이 떠돌게 돼 하지 않음. 화면 순회: 모든 화면의 보이는 data-act 를 눌러 봄(삭제·내보내기·업로드·로그아웃 등 제외) — 데스크톱 341 · 폰 296 · 위젯 8, pageerror·console.error 0. 고침: ① rptFit 끝의 `.ai` 글자 줄이기 — 보고서에 .ai 요소가 없어(AI 의견 칸 폐지) 늘 null, --aifs 를 읽는 CSS 도 없음 → 두 줄 삭제. ② mvMorph 의 안 쓰는 X. ③ 1159~1161 에 단 주석의 회차 숫자 제거(규칙). ④ 툴팁 정리 타이머 setInterval(700) 이 늘 돌던 것 → tipShow 가 걸고 tipHide 가 푼다(위젯이 0.7초마다 깨지 않게). 경량화: 실행 부하는 이미 지연 로드(차트·지도·엑셀·marked)라, 남은 큰 몫은 주석(app.js 의 23%·index.html 의 26%). 원본은 그대로 두고 배포본만 걷는다 — scripts/build-min.mjs(static-audit 와 같은 걷기 함수, 걷은 JS 는 vm.Script 로 구문 확인 후 쓰기, 개발 파일 제외) + .github/workflows/pages.yml(upload-pages-artifact@v5·deploy-pages@v5). 걷은 배포본으로 전체 시험을 돌려 브라우저 시험 전부 PASS(정적 감사 2건은 주석을 표지로 쓰는 감사라 걷은 본에선 당연히 실패 — 원본 기준 PASS). 저장소 Settings → Pages → Source 를 GitHub Actions 로 바꿔야 쓰인다. 루트 .gitignore(node_modules·_site·dist·widget-lite/target), static-audit §12 SKIP 에 _site. 검증: 전체 테스트 PASS.

## 마지막 기록 기준 v1162
### 1162차 내 업무 휴지통 단추 1px
**사용자: 「내업무 휴지통 버튼이 좀 밑으로 쳐진듯」** — 잰 값(위젯 460, 3배 화면): 줄 상자 가운데는 제목 86.0 · 단추 86.25 로 같았으나 화면 글자 잉크 가운데가 제목 22.5 · 단추 23.5(머리 줄 위에서) — 단추 글자가 작아(12.5 vs 15) 위쪽 잉크가 낮다. `.wid-side .wp-tr` margin -6px -6px -6px 0 → -7px -6px -5px 0. 고친 뒤 22.5 · 22.5. 검증: 전체 테스트 PASS.

## 마지막 기록 기준 v1161
### 1161차 iOS 27식 리퀴드 글래스 — 앱·위젯 전체
**사용자: 「시안 모두 적용 앱 전체적으로 리퀴드글래스 적용 / 위젯도 66% 정도 어떨지 / 조절 기능은 넣지 않는다 / Os 설정과 무관하게 앱은 일관된 모습을 보여준다」** — :root 토큰: `--glass` .88→.66(= `--lq-fill`), `--lq-blur` blur(22px) saturate(1.5) brightness(1.04), `--lq-hi` 위 .95·아래 .4·테 .5, 새 `--lq-line`(테두리 rgba(16,24,40,.13))·`--lq-edge`(0 0 0 .5px rgba(16,24,40,.18)), `--lqd-hi` 위 .32, 새 `--lqd-fill` rgba(26,29,38,.66)·`--lqd-blur` blur(40px) saturate(1.4)·`--lqd-edge` 0 0 0 1px rgba(0,0,0,.5). 밝은 판: `background:var(--glass)` 를 쓰는 13개 규칙(폰 시트·창·확인창·새 업무 시트·일자 시트·필터·연월·찾기·tkbulk·pwa 카드·계정 창 등)의 흐림을 --lq-blur, 테두리를 --lq-line, 그림자 앞에 --lq-hi. 하단 탭 테두리 --lq-line, 데스크톱 우클릭 바탕 --lq-fill+--lq-edge, 로그인 판·카드 바탕 --lq-fill. 어두운 판: 위젯 연월·필터·드롭다운·우클릭·찾기·설정·일자/내 업무(.wid-pop)·창(#mb, 다시 흐림)·알림 3종(앱·폰·위젯)을 --lqd-fill/--lqd-blur, 흰 테두리는 투명으로 두고 그림자 앞에 --lqd-edge,--lqd-hi. 위젯 머리 단추 묶음은 바탕(사용자 투명도 값)은 그대로, 테두리를 --lqd-edge·--lqd-hi 로. 내 업무 머리 줄에 rgba(20,23,31,.72) 띠(스크롤 가장자리). 조절 슬라이더 없음, prefers-reduced-transparency·prefers-contrast 대응 없음(사용자 결정: OS 설정과 무관하게 일관). 손대지 않음: 사용 안내 말풍선(그늘 위라 유리면 탁함), 데스크톱 드롭다운 목록(.msel-pop — 유리 판 안에 다시 유리), #htip 툴팁, 위젯 #pfPop. 검증: 전체 테스트 PASS, 위젯·데스크톱·폰 7장면 pageerror 0·눈으로 확인(헤드리스는 흐림 40px 를 못 그려 12px 로 찍음). 실제 WebView2 미확인.

## 마지막 기록 기준 v1160
### 1160차 내 업무 빈 칸 한 줄 · iOS 27식 유리 시안
**사용자: 「개선안 5만 적용하고 / 리퀴드 글래스의 가장 큰 단점은 가독성이 안좋아지는건데 최근애플은 이걸 개선해서 ios27을 내놧어 / 이걸 좀 반영해보는게 어때?」** — 적용: `.wl-none` 를 가로 한 줄(아이콘 숨김, padding 6px 10px 10px). 개선안 1(「+N」)·2(5주 5줄)는 채택 안 됨. 시안(미적용): iOS 27 보도(MacRumors·9to5Mac)의 가독성 처리 — 뒤 내용 확산 강화·가장자리 어둡게·반사광 밝게·스크롤 가장자리 띠·투명도 줄이기/대비 높이기 대응·맑게↔진하게 조절 — 를 우리 판에 옮긴 값: 어두운 판 rgba(26,29,38,.7)·saturate 1.4·바깥 1px rgba(0,0,0,.5)·안 반사광 위 .32/테 .1, 밝은 판 rgba(255,255,255,.66)·saturate 1.5·바깥 .5px rgba(16,24,40,.18)·안 반사광 .95/.5, 내 업무 머리 줄 띠 rgba(20,23,31,.72). 잰 값(헤드리스, 흐림은 두 쪽 모두 12px): 판 뒤 얼룩(밝기 표준편차) 위젯 내 업무 20.7→13.8 · 일자 팝업 7.3→4.9 · 데스크톱 우클릭 18.4→14.7 · 폰 탭 13.9→10.6, 글자 최악 1% 대비 4.8→7.6 · 9.2→11.9 · 9.7→10.7 · 8.2→11.4. 검증: 전체 테스트 PASS.

## 마지막 기록 기준 v1159
### 1159차 위젯 디테일 모션 · 블러 A · Esc
**사용자: 「프로필 이모지 배경색 전환탭도 모션 빠짐 / 이런 디테일 부분도 보고 / 리퀴드 글래스 적용할만한 부분 찾아보고 / 난 A가 맞다고 본다 / 개선안은 미리보기 먼저하고 / 3은 적용하고 / 4는 기각」** — ① A안: `body.wid #mo{backdrop-filter:none;background:rgba(0,0,0,.28)}`, 위젯 #mb 의 blur(24px) 제거(92% 판이라 안 보임). ② Esc: LAYERS 에 widPlan(위젯 팝업 안 폼이 열려 있으면 폼만 닫기, on 없음 — 바깥 누르기 규칙엔 안 낌)을 widPop 앞에. ③ 고르는 줄 미끄러짐이 위젯에선 통째로 꺼져 있었다(slSync `if(WIDGET)return` · CSS body:not(.wid)) — 위젯은 SL_SPEC 중 '#mb' 로 시작하는 것만 돌리고, 창 안 규칙(.acct-tabs·.acx-seg·.rpk-seg)은 body:not(.wid) 를 뗌. 위젯 켜진 칸 칠은 별도 규칙으로 투명. 이모지 분류(.pf-cats)도 SL_SPEC 에 + MV_TAB 'pf.cat':'#pfEmg>*'(판 자체는 그대로라 자식에). ④ 디테일: pf.pick 얼굴 scale .6→1, .pf-em 칠 전환, .pal-c 고리 outline-offset 5→2, .acct-av 바탕 전환, 위젯 글꼴 이름 mvRoll, .cal-nb.f-on::after popSc, .msel-pop 닫힘 opacity+display allow-discrete. 측정: 위젯 디테일 17동작 프레임 차분 — 고친 것 모두 여러 프레임. 남김: 찾기 결과 표시, 필터 고른 뒤 달력 다시 그리기, 이모지 분류 판 교체 앞 ~100ms 빈 판(mvIn 공용 결). ⑤ 미리보기만: 리퀴드 글래스 후보(위젯 설정·연월·머리 단추 반사광 / 앱 연월·필터·폰 메뉴 시트, 사용 안내 말풍선은 그늘 위라 비권장), 개선안 1(「+N」)·2(5주 달 5줄 — 예전 「항상 6주」 결정(fixedWeekCount:true)과 충돌)·5(빈 칸 한 줄). ⚠ 헤드리스 크로뮴은 큰 흐림(40px)을 제대로 그리지 못해 미리보기는 12px 로 찍었다. 테스트 widget-layers 「편집기 Esc」 기대치를 새 동작(폼만 → 다음 Esc 에 팝업)으로 바꿈. 검증: 전체 테스트 PASS, pageerror 0. 실제 WebView2 미확인.

## 마지막 기록 기준 v1158
### 1158차 위젯 모션 보강
**사용자: 「위젯에 모션 적용 덜된 부분들이 있음 / 위젯 부팅시 나오는 놓친업무때 뒤에 블러가 과한게 아닌지 / 위젯에서 사용성 개선할만한 부분 검토」** — 위젯(460×760, glass) 동작 30여 개를 CDP 화면 녹화로 찍고 연속 프레임 차분(바뀐 화소 비율)으로 「한 프레임에 다 바뀜 = 모션 없음」을 골랐다. 걸린 것: 일자 팝업 다른 날 옮기기(자리 점프)·폼 열고 닫기(판 높이 점프 — 닫을 때 줄어든 판 밖으로 목록이 잘려 잠깐 빈 판), 놓친 업무 ✓·→·날짜(줄 즉시 삭제·창 높이 점프), 내 업무 ✓(줄 즉시 삭제 — rWidget 과 widSideRender 가 연달아 그려 mvGone 유령을 지움)·더 보기(판 높이 점프), 연·월 팝업을 단추로 닫기(openYMPick/openTkPick 이 remove — 바깥 누르기는 이미 흐림). 고침: widGlide(translate·height WAAPI, 옮기는 중 RO 무시·끝나고 다시 잡기·중간에 바뀌면 보이는 자리에서 이어감), mvFold(줄·구분 접기, 첫 구분이 접히면 다음 구분 윗선도), mrv 남은 줄 셀 때 .mv-gone 제외(닫을 때 보류로 넘기는 대상에서도), widSideRender 같은 html 이면 생략 + 팝오버 높이 애니메이션, closeYMPop. 놓친 업무 뒤 #mo(blur 4px·34%)는 위젯이 투명 창 위 떠 있는 조각들이라 창 전체 사각이 흐리고 어두워진다 — 미리보기(현재/흐림 없음 28%/없음)만 전달, 미적용. 검증: 같은 계측 재실행 — 위 항목 모두 여러 프레임에 걸쳐 바뀜, pageerror 0. 전체 테스트 PASS. 실제 WebView2 화면은 미확인.

## 마지막 기록 기준 v1157
### 1157차 사용 안내 → 실제 화면 투어
**사용자: 「사용 안내 기능을 4번으로 바꾸는 것도 괜찮을듯 / 따로 보기보단 실제로 바로 네비게이션 역할 해주는게」** — 모달 그림 안내 대신 실제 화면 위 스포트라이트. #tour(body 직속, z 9500, line-height 자체 지정) = .tr-hole(box-shadow 200vmax 그늘) · .tr-ring(맥박) · .tr-tip. 단계 {c 장, v 화면, s 선택자(쉼표=처음 보이는 것), all 한 틀로, t 설명} — 문구는 scripts/guide-shots.mjs 와 같은 줄기. 장 안 n/m 은 적지 않음(없는 단추를 건너뛰면 수가 어긋남). 투어 중 알림(#toast·.toast-bk)은 숨김. 폰은 아래 탭에 가리면 가운데로 스크롤. 위젯은 openReadme 유지. 검증: 데스크톱 1440·폰 390 전 단계 스크린샷 — 구멍이 대상에 사방 6px(뷰포트 가장자리는 4px 묶음), 말풍선이 구멍과 겹치지 않고 화면 안, pageerror 0; 짚은 자리 클릭=다음·바깥 클릭 무시·장 칩·이전·첫 단계에서 ←·마치기·글 안내 동작 확인. 오늘 업무가 없으면 「업무 고치기 · 완료」 단계는 건너뛴다(정상).

## 마지막 기록 기준 v1156
### 1156차 프로필 전환 탭 1px · 배포본 크기 · 디자인 참고 미리보기
**사용자: 「위젯 프로필 전환탭 버튼이 살짝 아래로 / 배경색을 눌러야 밑으로 내려가네」 + static-audit 「배포본 20.4MB — vendor/ 14.0MB」 + Lucian UX/UI Prompt 쓸 만한 것 미리보기**
- 재현: 위젯 유리, 계정 창 → 프로필 고치기 → 「배경색」 클릭 0.9초 뒤 캡처 — 테두리 위 틈 12·아래 6(기기 px, 3배) = 켜진 칸이 1px 아래. getBoundingClientRect 는 위아래 4px 그대로 · 이모지 쪽은 9/9. 창 높이 애니메이션(acxMorph)·색 판 transform 이 끝난 뒤에도 켜진 칸만 따로 그려진 채 남는 합성 층 문제로 본다. will-change:transform(4/4 회 정상)·contain:paint(2/2) 는 고쳐지고 isolation 은 1/2. → `#mb.acx .acx-seg{will-change:transform}`.
- 배포본 크기: 저장소(dongyexn/plan, 5b81d3f)와 작업본을 파일 단위로 맞대 보니 내용은 같고, 저장소에만 옛 도면 기능 파일이 남아 있다 — `vendor/libredwg/`(wasm 9.7MB 등 5개), `scripts/test/dwg-split.mjs`, `scripts/test/fixtures/dwg/`(5개). 앱·테스트 어디서도 부르지 않는다. zip 을 덮어 올리면 지운 파일은 안 지워진다 — 저장소에서 직접 지워야 한다. 저장소엔 `widget-lite/.gitignore` 가 빠져 있다(점 파일 업로드 누락으로 보임 — target/ 이 안 올라가게 막는 파일).
- Lucian UX/UI Prompt(MIT, 부품 200개 갤러리 — 규칙 문서 아님): 우리 앱에 이미 있는 것(겹치는 알림·미끄러지는 탭·우클릭 메뉴·되돌리기·기간 달력·당겨 새로고침·스켈레톤·묶음 선택) 빼고 161 코호트 잔존(장기미처리)·158 폭포(월간 미처리 증감)·156 상자 수염(공종별 처리 소요일)·197 스포트라이트(첫 로그인 안내)를 가짜 자료로 미리보기만 — 앱 미적용.

## 마지막 기록 기준 v1155
### 1155차 모션 손질 — 모핑(작은 것 → 큰 것)·시트
**사용자: 「앱에 들어간 각종 모션들 부자연스러운 부분 확인 / 특히 팝업 열고 닫을 때 / 업무 추가할 때 / 작은 것에서 큰 게 나오는 모션들」**
계측: Playwright 화면 녹화(screencast) + 매 프레임 rAF 로 상자·폼·막의 자리·크기·투명도·진행률 기록(데스크톱 달력 ＋·업무 현황 업무 추가·사용 안내 창·닫기, 폰 일자 시트·＋·업무 추가 시트·메뉴, 위젯 팝업·설정, 우클릭 메뉴·연월).
찾은 것: ① 모핑 상자에 파란 1.5px 테 — 상자가 폼으로 바뀌는 순간 테가 툭 사라지고 그림자가 툭 생김, 업무 현황 상자는 유리색만 베껴 뒤 목록이 비침 ② 상자는 시간 50%에 크기 90%인데 속은 100%(0.38초) 끝나야 나와 빈 상자 0.15초 대기 + 속 페이드 — 내용까지 약 0.6초(사용 안내 0.7초) ③ 사용 안내처럼 무거운 창은 left·top·width·height 애니메이션이 메인 스레드라 단추 크기로 멈췄다 78% 로 건너뜀, 창이 제자리에 먼저 비쳤다 사라짐(rAF 미룸 사이 CSS 전이), 상자·창이 둘 다 반투명인 순간 뒤가 비침, 투명도 0 층은 미리 그려 두지 않아 드러날 때 빈 프레임 ④ 달력 새 폼 아래 카드는 PE_EASE(빠른 출발)로 내려가 상자와 사이에 빈 틈 ⑤ 닫힘: 상자가 단추 크기에 닿은 뒤까지 흐려지며 단추 위에 흰 막 ⑥ 폰 업무 추가 시트: sheet 클래스를 열 때 붙이며 전이를 켠 채 닫힌 자리를 굳혀 0.97 배율에서 출발 — 올라오지 않고 제자리에서 커짐.
고침: `mvSkin`(칠·그림자·테·backdrop-filter 베낌, `.mv-morph` 파란 테 삭제·border-box). `mvMorphBox` 는 큰 쪽 자리에 상자를 두고 transform(translate+scale, transform-origin 0 0)만 움직인다 — 합성기. 모서리는 큰 쪽 반경 고정(반경을 따로 움직이면 메인 스레드라 무거운 창에서 타원으로 부풂 — 시도 후 뺌). `MV_MORPH`=340ms · `cubic-bezier(.3,.9,.3,1.04)` · `MV_MORPH_R`=.62(크기 99.5%) 에서 폼은 0.01 투명도 유지를 끝내고 다 보이며, 상자만 `MV_MORPH_X`=140ms 동안 흐려진다. 속 칸은 그때부터 30ms 간격 180ms 흐림→또렷. `mbMorphOpen`: 펴기 전 한 프레임 visibility:hidden, #mb 전이·0.96 확대 끔(펴기 끝까지), #mo 막 전이 0.12초. `openPlanEdit` 새 폼 FLIP 은 `dpFlipRun(fl,MV_MORPH,MV_MORPH_EASE)`. `mvMorphFrom`: 그림자를 줄이며 거두고, 흐림은 30%→75% 사이에 끝. 폰 시트: `rTkNewOverlay` 에서 열 때 transition:none 으로 닫힌 자리를 굳힌 뒤 열기.
검증: 같은 장면 재녹화 — 내용이 다 보이기까지 달력 ＋ 약 0.6→0.4초, 사용 안내 0.7→0.45초(그림 그리는 0.1초 출발 지연은 남음), 빈 상자·파란 테·제자리 깜빡임·타원·반투명 비침 없음, 폰 업무 추가 시트가 아래에서 0.5초에 올라옴. 프레임 간 자리 급변 자동 검사(80px·투명도 0.5 넘는 변화) — 남은 것은 의도된 것(폼 0.01→1 은 불투명 상자 아래, 시트 첫 프레임). 페이지 오류 0, 전체 테스트. 녹화에서만 본 것: 위젯 팝업 유리 흐림(blur 40)이 헤드리스에선 안 걸린다(12px 는 걸림) — 윈도우 WebView2(GPU)에서는 미확인.

## 마지막 기록 기준 v1154
### 1154차 위젯 메모리 절감 — 위젯 1.6.0
**사용자: 「메모리를 생각보다 많이 먹는데 확인해서 절감안」 → 「1,2,3,4 진행」** (작업 관리자 WebView2 관리자(7) 264MB)
계측(리눅스 Chromium, 절대값은 윈도우와 다름): 빈 페이지 프로세스 묶음 260MB · 위젯 335MB — 대부분 런타임 몫. 페이지 안은 DOM 7.5 · JS 5 · 스크립트 캐시 3 · 디코드 5 · 타일 4MB. 흐림 끄기 차이 2~3MB(원인 아님). 갱신 500회에 JS 6.4→7.4MB — FullCalendar 내부(segHeights·depths 키 누적, 1회 약 2.5KB). 업무 3천 건 JS 14MB·1만 건 36MB. 부팅 때 reCAPTCHA(App Check)가 www.google.com 틀을 띄운다 — 사이트 격리로 렌더러가 따로 뜬다(교차 출처 틀 실험: 기본 렌더러 3개 → `--disable-site-isolation-trials` 1개).
- ① widget-lite: INIT_JS 가 mousemove·mousedown·keydown·wheel·touchstart 를 보고 60초 무입력이면 `hpw-mem`='low', 다시 입력하면 'normal'. Rust `set_mem_level` → `with_webview` → `controller().CoreWebView2()` → `cast::<ICoreWebView2_19>()` → `SetMemoryUsageTargetLevel(LOW/NORMAL)`. 런타임이 낮아 _19 가 없으면 조용히 넘어간다. 의존성 webview2-com 0.39(tauri·wry 와 같은 판).
- ② `additional_browser_args`: 기본값(msWebOOUI·msPdfOOUI·msSmartScreenProtection 끔)을 그대로 적고 `SpareRendererForSitePerProcess` 끔 + `--disable-site-isolation-trials`. 위젯은 on_navigation 으로 앱 주소 밖에 못 나가 격리 해제 위험이 작다.
- ③ app.js: 위젯이면 `calapp/d60` 구독 안 함 · 관리자 보관함 미리 읽기(archNeed 14초) 안 함 · 휴지통 정리(trashPurge) 안 함. 위젯 백업 `bkExport` 는 Promise — 보관함(이미 읽혀 있으면 그것)·D+60 을 get 으로 읽어 담고 버린다(못 읽으면 null → 다음 주기). `archLoad` 의 풀기를 `archDecode` 로 떼어 함께 쓴다. `bk.now` 는 Promise.resolve 로 받는다. Rust 백업 대기 15→60초.
- ④ `widDaily`(위젯, 5분마다): 10분+ 손 놓았고 새 판 대기 아님 · (20시간+ 켜짐 & 3~6시) 또는 (48시간+ & 30분+ 손 놓음) · verIdle 이면 새로 부른다. 아침 확인은 하루 한 번 키라 다시 뜨지 않는다.
검증: 위젯/웹 구독 경로 비교(위젯에 calapp/d60 없음), 위젯 bkExport 가 보관함 압축 풀어 담고 ARCH.loaded 그대로 false · 웹은 동기 객체, 시계 고정으로 widDaily(17h 23시 유지 · 03:30 방금 만짐 유지 · 03:45 15분 손 놓음 새로고침), cargo check(리눅스) 통과 · 윈도우 전용 코드는 webview2-com-sys 0.39.1 바인딩(ICoreWebView2_19::SetMemoryUsageTargetLevel · COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW/NORMAL · ICoreWebView2Controller::CoreWebView2)과 시그니처 대조 — 첫 컴파일은 Actions. 실제 절감량은 윈도우에서 미확인(README 점검 12번).

## 마지막 기록 기준 v1153
### 1153차 업무 현황 편집 행 담당자 칩 제거
**사용자: 「업무현황에 담당자에 칩 입히니까 주변이랑 겹쳐서 불쾌함」** — 편집 중 행의 select(담당자·현장)에 전역 `select:not([multiple])` 의 칩 테두리(inset 1px)가 그대로 붙고, `.tk-item.editing .tk-row select` 가 여백 8·음수 여백 8 로 칸 밖으로 8px 나가 담당자 점(오른끝 561)을 2px 덮고 업무명(왼끝 615)에 맞닿았다. → `box-shadow:none` · `border-radius:var(--rsm)` · `padding:0 4px; margin:1px -4px 0`(작성 칸과 같은 4/−4). 읽기 때 글자 자리는 그대로. 검증: 1440·1100·폰에서 점→칸 2px · 칸→업무명/현장 4px, 평상·호버 전후 화면 비교, 전체 테스트.

## 마지막 기록 기준 v1152
### 1152차 정렬 감사 · 버그 수정
**사용자: 「이렇게 정렬 아다리 안 맞는 부분 찾아보고 버그 수정도 하고」** — 자동 계측 스크립트(scratchpad)로 데스크톱 1440·1100, 폰 390, 위젯(일반·유리) 각 화면·팝업·시트·메뉴·편집 상태를 열고 ① 같은 줄 같은 높이 단추의 세로 중심 ② 단추 안 아이콘 중심 ③ 머리 글자와 같은 줄 단추 ④ 줄 높이 0 글자 ⑤ 아이콘+글자 ⑥ 세로로 늘어선 아이콘 단추 열의 가로 중심을 쟀다(0.75~12px 어긋남만).
- 업무 현황 편집 행: `.tk-acts` 높이 28 이 위에 붙어 ✓(26) 중심이 첫 줄(작성 칸 30)보다 2px 위, 담당자·현장 select(28)도 1px 위 → `.tk-acts` margin-top 2 · select margin-top 1. 편집 행 높이 36 그대로.
- 캘린더 일자 패널 + : 폰 margin-right -8·데스크톱 -6 으로 카드 오른쪽 끝에 붙어 아래 완료 표시(.stx) 열보다 7·9px 오른쪽 → -1 · +3 으로 가운데를 .stx 가운데에(위젯 팝업은 이미 같은 축).
- 계정 창: `.acx-row` 오른쪽 여백 16 → 24, 로그아웃 원 가운데 = 닫기(×) 가운데.
- 폰 상단 연·월 단추 0.8px 은 주석에 적힌 의도(눈맞춤)라 그대로.
버그: ① `.toast-bk`(앞 알림 사본, body 직속)가 151행 줄 높이 복원 목록에 없어 line-height 0 → 높이 24, 펼침 때 글이 넘침 → 목록에 추가. ② 접힌 뒤 알림 글이 반투명 앞 알림 너머로 겹쳐 보임(1150 이전부터) → `tstLayout` 이 밑에 깔린 것에 `.bk-under`, 글자 투명·자식 숨김, 펼치면 다시 보임. ③ 게시된 기준월 없이 회의 모드를 열면 머리 「0년 NaN월」 → `mtgOpen` 에서 `dfRm()` 없으면 알림 후 중단. 검증: 계측 재실행 0건(의도된 0.8px 제외), 펼침·접힘 알림 화면, 회의 모드 자료 없음/있음, 페이지 오류 0, 전체 테스트.

## 마지막 기록 기준 v1151
### 1151차 리퀴드 글래스 적용 · 위젯 팝업 + × 정렬
**사용자: 「폰 상단빼고 적용 / 회의모드 머리는 본문이 겹칠 일이 없다 / 업무팝업에서 + x 정렬」** — 1150 미리보기(scratchpad glass.css)의 값을 본 규칙에 옮김(!important 없이 기존 규칙 값 교체). 하단 탭 `#mtab::before`·`.mtab-m` = --lq-fill·--lq-blur·--lq-hi, `.mtab-ind` = 흰 렌즈 그라데이션. 데스크톱 `body:not(.wid) .ctxmenu` = rgba(255,255,255,.58)·테두리 없음·18. 알림은 기본 `#toast,.toast-bk` 와 폰·데스크톱의 `body:not(.wid) #toast` 두 규칙이 따로 칠하므로 셋 다 .62·blur 22·--lqd-hi(위젯 알림은 그대로). `.wid-pop` = .55·blur 40·테두리 투명. 회의 모드 머리(5)·폰 상단바(2)는 넣지 않음. 위젯 팝업 머리: 닫기 묶음(.wp-h)이 top 11 이라 + (dp-lh 위 12)보다 1px 높았다 → 12, 제목·+·× 중심 모두 같은 y 로 계측. 검증: 적용본 화면과 미리보기 화면 픽셀 비교 — 탭·메뉴·알림 차이 0, 위젯은 × 1px 이동분만, 전체 테스트.

## 마지막 기록 기준 v1150
### 1150차 롤백 · 가운데 체크 · 하루 두 번 동기화
**사용자: 「4는 롤백 / 선택한 사진은 지금이 아니라 사진 중간에 체크 표시로 / 자동동기화를 6시, 12시 하루 두 번」** — `.bgp-more` 를 1148 모양(+N 18px · ::before blur 막)으로 복원, clip-path 제거. `bgThumbHTML` 의 「지금」(.nw) 삭제, `.ck` 를 top/left 50% 가운데(28px, 모두 보기 32px). bg-sync.yml 의 55분 규칙 → KST 06:00·12:00 슬롯(05:59 → 전날 12:00, 06:03 → 06:00, 12:20 → 12:00 로 셸 확인). README·HANDOFF·bg-sync.mjs 문구 맞춤. 검증: 썸네일·모두 보기 창(데스크톱 4열·폰 2열) 체크 중심 오차 0px, 이름 줄과 겹침 없음 확인, 전체 테스트.

## 마지막 기록 기준 v1149
### 1149차 앱에서 동기화 요청 외
**사용자: 동기화 단추를 눌러도 GitHub 안 들어가게 · 미리보기 왼쪽 로고 · 설정 머리 버전 굵게 · +N 숫자 기준 가운데** — ① bg.sync: FB.db.ref('bg/req').set(ServerValue.TIMESTAMP)(editor 만 — database.rules.json bg/req, validate newData == now; AUTH-21d~g, 시험기에 now 고정값 지원). bgSub 가 req·chk 를 읽어 req>chk(30분 안)이면 단추 회전·툴팁 「가져오는 중」, 끝나면 토스트. 목록·at 가 그대로면 사진 다시 고르지 않음. bg-sync.yml: */5 확인 단계(curl 공개 읽기 bg/req·bg/chk, 수동 실행·req>chk·55분 경과일 때만 설치·실행), bg-sync.mjs 는 set → update{chk, (l, at)}. 앱에 GitHub/Unsplash 키 없음 — 즉시가 아니라 다음 확인 때(보통 5~15분). ② #bgPv 에 .lg(#cvBrand innerHTML 복사) — 왼쪽 판 가운데(25%/50%), 로고 5.5px. ③ .tb-ver 700. ④ .bgp-more b i{position:absolute;right:100%} — 실측 숫자 중심 = 타일 중심(781.8/781.8). ⑤ 그 타일 ::before backdrop-filter 가 둥근 모서리 밖으로 번져(크로뮴) 제거, 어둡기 .58. 검증: 전체 테스트 PASS, 데스크톱·폰 설정 카드 캡처·모서리 픽셀 확인. 실제 Actions·규칙 게시는 이 환경에서 확인 불가.

## 마지막 기록 기준 v1148
### 1148차 배경화면 매시간 동기화
**사용자: 동기화 주기 1시간** — .github/workflows/bg-sync.yml cron 매시 7분(정각 혼잡 회피). 요청 수: 컬렉션 30장마다 API 1회 → 시간당 1~2회로 Unsplash 데모 한도(시간당 50) 여유. 주석·README·HANDOFF 문구 「하루 한 번」→「매시간」. 성탄절 리스(Pixabay 10482042, 흰 구멍 제거·크기 46/44/36%)는 시안까지 하고 사용자 결정으로 접음 — 코드 반영 없음. 검증: 전체 테스트 PASS. 실제 Actions 실행은 이 환경에서 확인 불가.

## 마지막 기록 기준 v1147
### 1147차 버그 점검(별도 검토 + 재현)
**사용자: 버그 없는지 체크** — v1140→v1146 차이 검토, 모두 Playwright 재현 후 수정: ① 안내 ←→ keydown 이 닫힌 뒤 남은 #mbody 를 보고 키를 막음 → #mo.open && #mb.rdw · 보조키 제외 · [contenteditable] 제외 ② 위젯 .gd-l li.on 흰 글자/연한 판 → body.wid 색 ③ 360×640·위젯에서 ‹ › 잘림 → ≤820 은 .rd-body 높이 auto(시트만 구름)·그림 38dvh, 데스크톱 .gd-nav sticky(980×700 에서도 보임), 넓은 그림 280px ④ 현장 찾기 빈 칸 Enter → 값 그대로 닫기, isComposing 무시 ⑤ 찾기 칸 Home/End 는 커서 이동 ⑥ 0건이면 「찾는 현장이 없습니다」·아래 흐림 덮개 숨김(.nores) ⑦ guideNav 초기 호출. 점 자리 판정의 작은 칸 여유를 점 반지름만큼(10px). 검증: 재현 스크립트 재실행 전부 해소, 전체 테스트 PASS.

## 마지막 기록 기준 v1146
### 1146차 그림으로 따라가는 사용 안내
**사용자: 글만 주르륵이 아니라 사진으로 설명하는 인터랙티브 안내 · 현장명1·2·3 처럼 드라이하게 · 하자는 가짜 데이터로** — 시안(캘린더 장) 승인 뒤 전 장 적용. `scripts/guide-shots.mjs` 신설: 1440×860(사이드바 펼침)·390×844 폰·460 위젯, `page.clock.install(2026-10-14)+resume`, 가짜 자료 seedBase/seedD60/seedDefect(e2e-defect 와 같은 업로드→가짜 FB 게시), 칸은 data-act 선택자로 재고 그림 밖이면 뺀다, webp 는 페이지 캔버스로 굽는다(의존성 없음). 21장 · 0.9MB. 뷰어: `guideSecHTML`·`guideSpot`·`guideGo`(‹ › 는 번호 하나씩, 끝에서 다음 단계)·마우스 올림·←→·밀기, 폰은 고른 설명 한 줄·시트 높이 고정, 넓은 그림(가로/세로 > 1.9)은 설명 두 칸 아래로, 그림 안내 창 980px·본문 min(580px,70dvh). 점 자리: 작은 단추는 아래→위→왼쪽→오른쪽, 다른 작은 칸 위·서로 28px 이내는 피함. 1145차 docs/img/guide-add·mtg·bg(가람 이름) 삭제. 시작하기·문제 해결은 글 그대로. 검증: 전 장 데스크톱·폰 캡처 확인(그림 깨짐 0, pageerror 0, 데스크톱 본문 넘침 없음), 상단바 점 겹침 확대 확인.

## 마지막 기록 기준 v1145
### 1145차 사용 안내 창·그림
**사용자: 데스크톱 팝업 컴팩트 · 폰에서 탭 아래 제목 중복 · 필요한 곳 그림** — #mb.rdw 1180→760px, 목차 176→132px, 본문 높이 62dvh→min(520px,62dvh). 폰(≤820px) .rd-sec>h2:first-child 숨김. docs/img/guide-add·mtg·bg·ver.webp(로컬 모드 1280×800 2배 캡처, 빨간 둥근 테, 카드 테두리와 겹치지 않게 1px 안쪽으로 자름, 가짜 현장명), 설치 그림은 width 400. 표 첫 열 nowrap. 검증: 데스크톱·폰 7탭 캡처 — 그림 깨짐 0, 폰 h2 display none, 데스크톱 창 760×641.

## 마지막 기록 기준 v1144
### 1144차 문서 정리
**사용자: README·HANDOFF 손보기, 사용 안내는 아주 단순하게** — docs/manual.md 를 장(탭)마다 「무엇 — 어떻게」 한 줄 항목으로 다시 씀(시작하기·캘린더·업무 현황·업무 도구·하자처리 현황·위젯·설정·문제 해결, 회의 모드·배경화면 추가, 오류 복사는 설정 화면 버전 번호로 고침). README 는 링크·배포·Secrets(UNSPLASH_ACCESS_KEY 추가)만. HANDOFF.md 336KB → 본문만(현재 구조·결정·함정), 회차 요약 916~1143차 원문은 이 파일 맨 끝 부록으로 옮김(삭제 아님). 검증: 전체 테스트 PASS(정적 감사의 HANDOFF 파일 구성 표 실존 검사 포함), 앱 「?」 사용 안내 창 캡처.

## 마지막 기록 기준 v1143
### 1143차 현장 메뉴 흐림
**사용자: 페이드가 이상함** — mask 가 메뉴 판까지 지워 뒤 달력 비침·테두리 사라짐 → 현장 메뉴는 mask 끄고 불투명 판 + 판 색 덮개 흐림, 열 때·찾기 후 fadeOne. 검증: 위젯 스크롤 0·120·138·끝, 데스크톱 0·138 — 픽셀 표본으로 위·아래 글자가 판 색으로 서서히 사라지고(아래 104→34) 뒤 비침 없음, 끝에선 아래 흐림 꺼짐 확인.

## 마지막 기록 기준 v1142
### 1142차 현장 찾기 칸 정리
**사용자: 글자 정렬·위 여백 없음·겹침** — .ctx-q sticky top:0, 위·좌·우 6px 동일, 글자 시작선 46px 일치, sticky 덮어쓰던 .slhl 규칙·위 페이드 마스크 보정, 찾기 줄 배경 불투명. 검증: 위젯(어두운) 스크롤 0·120·검색 중, 데스크톱 일반 편집기 스크롤 0·120 — 간격 6.0/6.0/6.0 측정, 확대 캡처로 비침·겹침 없음 확인.

## 마지막 기록 기준 v1141
### 1141차 현장 선택 목록
**1141차(사용자: 위젯 업무 추가 현장 칸이 부자연스러움)** — 현장 선택 상자(sitePickHTML — data-pick="site", 일정 편집기·업무 현황 칸 공용)를 열면 openCtx 가 권역별 머리(.ctx-hd)로 묶고 맨 위 「현장 없음」(흐린 글씨, 옵션 글자 「-」는 그대로), 현장 9개 이상이면 위에 붙는 찾기 칸(.ctx-q/.ctx-qf — 열면 바로 입력, 글자 포함 현장만·빈 머리 숨김, Enter 첫 줄, ↓↑ 는 보이는 줄만). 돋보기·머리·항목 글자 왼쪽 선 일치(46px 측정). 최근 묶음은 넣지 않음. openCtx 에 o.cls·o.search·it.hd·it.dim 추가. .ctxmenu.site 높이 340 은 재기 전 클래스로(.dd 는 잰 뒤라 위로 뒤집혔던 것). 폰(위젯 아님)은 기존 고르기 시트 그대로. 검증: 위젯 460×820 가짜 현장 13개 — 열기·「청」 찾기(1개 + 그 권역 머리), 정렬 측정. pageerror 0.

## 마지막 기록 기준 v1140
### 1140차 전체 버그 점검
**1140차(사용자: 앱 전체 버그 점검)** — 1122 이후 바뀐 곳 코드 검토(별도 검토) + 전 화면 순회(데스크톱·폰 10화면, pageerror·console error 0)로 찾아 고침 — ① 03 묶음으로 들어갈 때 mtgEnter 가 뒤 카드까지 모션을 걸어(진행 중 애니메이션이 CSS 위치·투명도를 덮음) 빠진 카드(-1)가 잠깐 앞을 가리던 것 — 앞 카드만 등장 모션. 같은 원인으로 첫 그리기(na) 때 -1 카드의 자체 transition 이 명시도에서 이겨 흐려지며 보이던 것도 끔. ② 표지가 떠 있을 때 ←·↑ 가 뒤 페이지를 바꾸고 표지가 사라지던 것 — 표지 중엔 ←↑ PageUp Home End 막음, 열 때 MTG.p=0(표지 뒤는 늘 01). ③ 폰 로그인 작가 표기 — 일반 규칙이 미디어 규칙 뒤에 있어 가운데·safe-area 가 무시되던 것(순서 바꿈), 게이트(z 99999)가 덮어 링크가 안 눌리던 것(z 100000). ④ bgApply 사진 받기 경쟁 — 늦게 끝난 옛 요청이 새 사진을 덮지 않게(onload 때 지금 고른 사진인지 확인). ⑤ 1분 갱신마다 설정 썸네일을 다시 그려 초점·호버가 끊기던 것 — 바뀌었거나 force 일 때만. ⑥ 추이 차트 mouseleave 리스너가 다시 그릴 때마다 쌓이던 것 — 표시를 캔버스(_hxL)에. ⑦ 현장명이 비면 이름 줄 만들다 오류 나던 것. 검증: 표지 중 ← → 표지 유지·페이지 그대로, 03 진입 때 뒤 카드 애니메이션 0, 순회 오류 0.

## 마지막 기록 기준 v1139
### 1139차 배경화면 중간 바뀜
**1139차(사용자: 배경화면이 중간에 한 번 바뀜)** — 원인 둘 — ① boot-wid.js 가 고정 사진(calapp.bgpin)을 모르고 자동 순번 사진을 먼저 띄운 뒤 app.js 가 고정 사진으로 갈아 끼움 ② RTDB 목록(bgSub)이 늦게 와서 목록 길이·순서가 바뀌면(첫 방문 = 적어 둔 3장 → 컬렉션 7장, 컬렉션 변경) 같은 시각이라도 순번이 다른 사진. 고침 — boot-wid.js 가 고정 사진을 먼저 본다. bgSub 가 새 목록을 받을 때 보던 사진을 이번 시간대 동안 유지(BG_HOLD {p,h} — 정각이 지나면 새 목록 순번, 수동 고르기·자동 켜기는 바로 해제). 검증: 고정 후 새로고침 — 0.4초·3.9초 모두 고정 사진. 새 목록(순서 뒤집고 1장 추가) 도착 — 보던 사진 유지, 1분 갱신 뒤에도 유지, 다음·다다음 시간대엔 새 목록 순번. pageerror 0.

## 마지막 기록 기준 v1138
### 1138차 배경화면 카드·위젯 자리
**1138차(사용자: 배경화면 카드 다듬기 · 위젯 카드가 왼쪽으로 간 것)** — ⚠ 1135 도움말 카드 삭제 때 닫는 </div> 하나가 남아 set-col-stack 이 일찍 닫히고 위젯 카드가 격자 셋째 칸(아래 왼쪽)으로 밀렸던 것 — 지움(설정 칸 구조: set-col[하자 데이터·배경화면] / set-col-stack[백업·D+60 서식·위젯]). 카드: 자동 스위치를 머리 오른쪽 「자동 변경」으로(+관리자 동기화 아이콘), 본문은 미리보기(16:10, 작가 표기는 안쪽 왼쪽 아래 그라데이션 위) | 3×2 사진 칸이 미리보기 높이를 나눠 채움. 6장 넘으면 여섯째 칸이 「+N 모두 보기」 타일(뒤에 다음 사진 흐리게) — 지금·고정 사진은 앞 다섯 칸 안. 폰은 위아래. 기본은 자동(고정 기록 calapp.bgpin 이 없으면 자동) — 끄거나 고르는 건 각자 브라우저에만. 검증(가짜 사진 7장): 사용자 화면 캡처(왼쪽 배경화면 · 오른쪽 위젯), 썸네일 고정·스위치·+2 타일 → 창에서 6번 고정. pageerror 0.

## 마지막 기록 기준 v1137
### 1137차 로그인 리퀴드 글래스
**1137차(사용자: 로그인 카드 리퀴드 글래스 · 폰 작가 표기는 아래로)** — 로그인 유리 판 — 데스크톱 #main rgba(255,255,255,.4)·blur 30 saturate 1.6 brightness 1.06 + 안쪽 반사광(왼위 1.5px 흰 선·오른아래 옅은 선·1px 테·안쪽 90px 빛), 폰 .cv-card .44 같은 값(안쪽 빛 60px). 채도 2.1 은 하늘이 형광으로 떠서 1.6. 판이 옅어져 보조 글자가 묻혀 #coverGate 글자 토큰 한 단계 진하게(--cv-t1~t4). 폰 작가 표기(#bgCredit) — 판 아래 가운데, 판을 34px 띄움(:has), 키보드가 뜨면 숨김. 검증: 1600×900·390×844 에서 밝은·어두운·주황 사진 3장 캡처(가짜 사진). pageerror 없음.

## 마지막 기록 기준 v1136
### 1136차 배경화면 카드·창 다듬기
**1136차(사용자: 자동/고정 선택 개선 · 자잘한 문구 제거 · 배경화면으로 이름 · 모두 보기 창 키우기 · 로그인 카드 더 투명하게)** — 카드 이름 「배경화면」. 자동/고정 단추(.seg bg.mode) → 「한 시간마다 자동으로 바꾸기」 스위치(.sw #bgAuto, bg.auto — 끄면 지금 사진으로 고정, 썸네일을 누르면 저절로 꺼지며 그 사진 고정). 안내 문구(#bgPickNote)·머리 「N장 · 동기화 시각」 삭제 — 관리자 동기화는 머리 오른쪽 아이콘 하나(마지막 동기화 시각은 툴팁). 「모두 보기 N」 테두리 단추. 모두 보기 창(#mb.bgw — openModal 폭 클래스 지우기 목록에 추가) 최대 1120px · 한 줄 4장(폰 2장) · 둥근 12px · 마우스 올리면 작가 이름 · 스위치·장수 없음. 로그인 유리 판 불투명도 낮춤 — 데스크톱 #main .88→.72, 폰 .cv-card .88→.76. 검증(가짜 사진 20장): 썸네일 → 스위치 꺼짐·고정, 스위치 켬 → 해제, 끔 → 지금 사진 고정, 창에서 9번 고정, 창에 스위치 없음. 로그인 화면 캡처. pageerror 0.

## 마지막 기록 기준 v1135
### 1135차 배경 동기화·많은 사진·버전 위치
**1135차(사용자: 배경 카드 동기화 단추(B) · 사진 많을 때 · 도움말 카드 삭제 · 버전은 머리 줄로)** — 배경 사진 카드 머리 오른쪽에 「N장 · M/D HH:MM 동기화」(RTDB bg.at — bgSub 가 bg 전체를 읽어 BG_AT·localStorage calapp.bgat) + 관리자에게만 「동기화」 — GitHub bg-sync 실행 화면(Run workflow)을 새 탭으로(앱에 GitHub 토큰을 두지 않으려고 바로 실행하지 않음, 1분 안 반영). 썸네일은 카드에 두 줄(6장)까지 — 지금·고정 사진이 7번째 이후면 6번째 자리에 넣는다. 더 있으면 「모두 보기 N장」 → 창(한 줄 5장, 폰 3장)에서 고르기(창은 그대로 두고 체크만 옮김). 설정 「도움말」 카드(사용 안내·버전/오류 기록) 삭제 — 사용 안내는 머리 줄 ? 단추가 그대로, 버전은 설정 화면에서만 머리 줄 오른쪽(#tbVer 「v1135 · 오류 n건」)에 나오고 누르면 버전·오류 기록 복사(set.copyErr). 검증(가짜 사진 20장): 카드 6장 + 모두 보기 창 20장, 창에서 15번 고정 → 카드 6번째 자리에 체크, 머리 줄 장수·동기화 시각·관리자 단추, 설정 화면에서만 버전 표시. pageerror 0.

## 마지막 기록 기준 v1134
### 1134차 배경 선택창
**1134차(사용자: 배경 사진 선택창 유려하게 · 사용자 화면에서 왼쪽이 비지 않게)** — 선택창 — 왼쪽 큰 미리보기(작은 로그인 화면 모양 #bgPv · 아래 작가 표기 #bgPvCr), 오른쪽 자동/고정 + 안내(자동: 「다음 HH:00」), 썸네일 한 줄 3장(16:10·둥근 10px · 고정 사진은 파란 테두리 + 체크 배지 · 자동은 「지금」 알약 · 마우스 올리면 살짝 떠오름). 폰은 위아래로. 배경 사진 카드를 설정 왼쪽 칸(하자 데이터 아래)으로 — 사용자(하자 데이터·백업·D+60 서식 카드가 안 보임)는 왼쪽 배경 · 오른쪽 도움말·위젯, 관리자는 왼쪽 하자 데이터·배경 · 오른쪽 백업·서식·도움말·위젯. 검증: 1600×900 관리자·사용자(카드 숨김 흉내) 설정 화면 캡처, 자동/고정·썸네일 동작 그대로. pageerror 0.

## 마지막 기록 기준 v1133
### 1133차 배경 자동/고정
**1133차(사용자: 회의 표지 단추 빼고 · 설정에서 자동/고정 선택 — 윈도우 배경화면처럼)** — 회의 표지 「다른 사진」 단추(bg.next·.nx) 삭제. 설정 「배경 사진」 머리에 자동/고정 전환(.seg #bgMode) — 자동: 한 시간마다(지금 사진에 「지금」), 고정: 고른 사진을 계속(calapp.bgpin {u} — 1132 의 시간대 만료 h 없앰). 사진 썸네일을 누르면 그 사진으로 고정, 「고정」만 누르면 지금 걸린 사진으로 고정, 「자동」은 해제. 고정한 사진이 컬렉션에서 빠지면 자동으로. 이 브라우저에만. 검증(가짜 사진 3장): 썸네일 → 고정·문구, 자동 → 해제, 고정 → 지금 사진, 3시간 뒤에도 고정 유지, 표지에 단추 없음. pageerror 0.

## 마지막 기록 기준 v1132
### 1132차 배경 사진 수동 고르기
**1132차(사용자: 설정에서 그 시간대 배경 사진을 수동으로)** — 설정에 「배경 사진」 카드(#bgCard) — 자동 + 컬렉션 사진 썸네일(320px). 누르면 이 브라우저에만·그 시간대 동안만 그 사진(localStorage calapp.bgpin {u,h}, 정각이 지나면 자동으로), 자동을 누르면 바로 해제. 지금 걸린 사진에 「지금」 표시. 회의 표지 오른쪽 아래(시작 안내 위)에 「다른 사진」 단추 — 마우스를 올렸을 때만 보임(터치 기기는 늘), 다음 사진으로 같은 방식 고정. 회의 표지가 떠 있는 동안에는 정각이 지나도 사진을 바꾸지 않는다(bgApply 가 표지 중엔 건너뜀, 수동 고르기는 force). 검증(가짜 사진 3장): 썸네일 클릭 → 고정·배경·안내 문구, 표지 표기 반영, 표지 「다른 사진」 → 다음 장, 표지 중 고정 만료돼도 그대로. pageerror 0.

## 마지막 기록 기준 v1131
### 1131차 BG 컬렉션 자동 반영
**1131차(사용자: 컬렉션에 넣으면 자동 반영 — 하루 한 번이면 됨)** — GitHub 작업 bg-sync(.github/workflows/bg-sync.yml, 매일 05:00 KST + 수동 Run workflow) — scripts/bg-sync.mjs 가 Unsplash API 로 컬렉션 「BG」(V1rR9aIWwDE, 공개)의 가로 사진을 읽어 RTDB bg {l:[{u,n,h}],at} 에 쓴다(바뀌었을 때만). 키는 리포 Secrets UNSPLASH_ACCESS_KEY(앱에 없음), Firebase 는 d60 과 같은 FIREBASE_SERVICE_ACCOUNT. 규칙 bg: .read true(로그인 전 화면) · .write false(앱에서 아무도 못 씀 — 서비스 계정만) + rules-auth AUTH-21a~c. 앱: FB 초기화 직후 bgSub — bg/l 을 실시간으로 받아 window.BG_LIST 교체·localStorage calapp.bgl 저장·bgApply. boot-wid.js 는 calapp.bgl → 적어 둔 기본 목록 순. 1130 의 「BG 갱신」 수작업은 이제 필요 없음(작업이 안 돌 때의 기본값으로만 남김). ⚠ 사용자가 리포 Secrets 에 UNSPLASH_ACCESS_KEY 를 넣어야 작업이 돈다(이 세션의 GitHub 프록시는 Actions Secrets 경로를 막음). 검증: bg-sync DRY(fetch 가짜 — 가로 1·세로 1 → 가로만 1), 앱 bgSub 가짜 FB.db 로 목록 교체·저장·배경·표기 반영, 새로고침 때 저장 목록 사용, rules-auth 21a~c. 실제 Unsplash·RTDB 호출은 이 환경에서 막혀 미검증.

## 마지막 기록 기준 v1130
### 1130차 배경 사진 = 컬렉션 BG
**1130차(사용자: 배경 사진을 내 Unsplash 컬렉션 「BG」에서)** — 1129 의 API 키 방식(UNSPLASH_KEY·bgRefresh·localStorage calapp.bg·connect-src api.unsplash.com) 삭제 — Unsplash 약관상 Access Key 는 비공개여야 해서 앱에 넣지 않는다. 대신 사용자 컬렉션 「BG」(V1rR9aIWwDE, 지금 3장)의 사진 주소·작가 목록을 boot-wid.js 의 window.BG_LIST 에 적고, 시각 ÷ 1시간으로 고른 사진을 로그인 배경·회의 표지에 쓴다(사진 파일 저장 없음 — images.unsplash.com 직접, CSP img-src 만). 작가·Unsplash 표기 유지. 【BG 갱신】 컬렉션에 사진을 넣으면: 사용자 브라우저에서 unsplash.com 을 연 채 fetch('/napi/collections/V1rR9aIWwDE/photos?per_page=30&page=N') 로 id·urls.raw·user.name·user.username 을 받아 BG_LIST 를 다시 쓴다(가로 사진만). Unsplash 개발자 앱 「calapp」(Demo)은 사용자 계정에 만들어 두었으나 지금은 쓰지 않음. 검증: 사진 요청을 가짜로 바꿔 로그인 --bg-img·표기(Claudio Schwarz)·새로고침 유지·표지 표기 확인, API 요청 0. 사용자 브라우저에서 2560px 사진 0.85MB·약 1초에 열림. pageerror 0.

## 마지막 기록 기준 v1129
### 1129차 회의 표지 · Unsplash 배경
**1129차(사용자: 회의 표지 A · 배경 사진을 Unsplash 자연 주제에서 한 시간마다)** — 회의모드를 열면 표지 한 장(mtgCover — 배경 사진 위 「2026년 9월 하자처리 현황」·기준일·관리현장·관리세대, → · Enter · Space · ↓ · 클릭으로 걷고 01 이 들어옴). 배경 사진(로그인 #lgBg · 회의 표지): UNSPLASH_KEY 가 있으면 Unsplash 「nature」 주제 가로 사진 30장 목록을 하루 한 번 받아 localStorage(calapp.bg)에 목록만 두고(사진 파일 저장 없음, 주소 직접 사용 — API 규정), 시각 ÷ 1시간으로 고른 사진을 --bg-img 로. 1분마다 시각·날짜 확인. 키 없음·받기 실패·사진 안 열림이면 login-bg.jpg. boot-wid.js 가 캐시 목록으로 첫 화면부터 그 사진을 먼저 받는다. 작가·Unsplash 표기(#bgCredit 로그인 왼쪽 아래 · 표지 오른쪽 아래, utm 포함) 필수. CSP img-src images.unsplash.com · connect-src api.unsplash.com 추가. ⚠ UNSPLASH_KEY 는 아직 비어 있음 — 사용자 Unsplash 개발자 앱의 Access Key 를 넣어야 동작. 테스트 고침: widget-layers 의 「편집 중 미룬 실시간 반영」 단계가 앞 단계에서 넘긴 달에 머물러, 달 그리드 밖 날짜(2026-10-11)에 오늘 칸이 없어 깨지던 것 — 그 단계 앞에서 cal.today. 검증: Unsplash 응답·사진을 가짜로 바꿔(Playwright route) 키 있음 — API 2회(topic·random) 뒤 목록 저장, --bg-img·표기 반영, 새로고침 때 API 0회로 캐시 사진. 키 없음 — 기본 사진·표기 없음. 표지 표시 → → 키로 걷힘 · 01 진입, pageerror 0.

## 마지막 기록 기준 v1128
### 1128차 03 열 폭·재점검
**1128차(사용자: 03 처리현황 공종·시공업체 열 넓힘 + 버그 재점검)** — 03 처리현황 줄 열 폭 — 공종 minmax(64,88)→(72,104), 시공업체 (60,96)→(72,120), 막대 칸 최소 40→72(1280 에서 막대가 43px 로 눌리던 것). 재점검 중 고침: ① 대시보드 히트맵 줄 등장이 차트 모듈을 받은 직후 다시 그릴 때 두 번 나던 것 — 1.5초 안 재호출은 생략(DF._hmAt) ② 추이 차트 세로선은 마우스 환경에서만(터치는 mouseleave 가 없어 선이 남음). 검증: 1600·1280 캡처, 히트맵 재호출 1.7초 간격 6→(0.2초)0→(1.7초)6, 회의 01~05·03 묶음 넘기기/순환/업체별/크기 변경·대시보드 세로선 pageerror 0.

## 마지막 기록 기준 v1127
### 1127차 03 순환·이름 줄, 본 페이지 모션
**1127차(사용자: 03 순환 · 이름 줄 겹침 · 01 요약 칩 삭제 · 본 페이지 추이차트·히트맵 모션)** — 03 카드 묶음 순환 — 끝 다음은 처음, 처음 이전은 끝(↑↓·휠). 뒤 카드는 폴더 탭 대신 1126 시안 A 처럼 앞 카드 아래로 이름 줄(현장명만) 두 겹 — 뒤 카드 본문은 visibility:hidden(겹침 사이로 글자가 비치던 것), 뒤 카드 색은 불투명 회색 섞기(--lbl3 은 반투명이라 비침). 바로 앞 차례 카드는 위에 숨겨 ↑ 때 위에서 내려옴. mtgAggFit 의 계획 칸 높이를 offsetHeight 로(겹친 카드 scale 영향 제거). 01 KPI 아래 요약 칩(mtgInsights·.mm-ins) 삭제. 본 페이지 대시보드: ① 히트맵 줄이 차례로 떠오름(회의 05 와 같은 박자, 인쇄·보고서 중 제외) ② 하자접수·처리 주차별 추이에 회의 추이 차트의 세로 점선이 미끄러져 따라가는 모션(mtgHx + dfCrossPlug, 선 계열 점 포함 · 값은 기존 #chTip 그대로) ③ 추이 차트 처음 그릴 때 900ms easeOutQuart 로 솟음 — DF.noAnim 상시 켜짐과 별개로 첫 그리기만(intro), 리사이즈·사이드바 토글·인쇄는 그대로 즉시. 검증: 가짜 데이터 현장 5개 — ↓·탭 클릭·휠·업체별·1280 크기 변경 뒤 위치 유지, 3에서 ↓6번 → 4(순환). 대시보드 히트맵 줄 6/6 애니메이션, 추이 차트 그리는 중 값 변화 확인, 세로선 hover 진입·이동·이탈(ca 0→1→0). pageerror 0.

## 마지막 기록 기준 v1126
### 1126차 03 겹친 카드·폴더 탭
**1126차(사용자: 03 현장 넘기기를 겹친 카드 + 폴더 탭으로)** — 03 장기미처리 처리계획 현장 카드를 한 자리에 겹쳐 쌓고 한 장씩 넘김(mtgDeck) — 앞 카드만 보이고, 다음 두 현장은 본문을 앞 카드 뒤에 숨긴 채 현장명 탭만 앞 카드 아래로 튀어나옴(폴더처럼 왼쪽부터 옆으로 엇갈림, 둘째는 흐리게). 넘기기: ↑↓ 키 · 휠(본문 끝에서) · 탭 클릭. 앞 카드는 위로 빠지며 사라지고 뒤 카드가 앞으로. 제목 줄 오른쪽에 `n / 전체`. 카드 높이는 내용대로, 묶음 높이는 앞 카드 + 탭 줄. 창 크기·공종/업체 전환·담당자 칩 때 mtgDeckFit/mtgDeck(0) 로 다시 맞춤. 1125 의 스크롤 이동(mtgSnapFit·mm-body._ai) 삭제. 04 공가세대는 그대로 격자. 검증(가짜 데이터 현장 5개): ↓ 1→2, 둘째 탭 클릭 2→4, 휠 위 4→3, 업체별 전환·1280×800 크기 변경 뒤 높이·탭 위치 유지, 끝 5/5 탭 없음, 04 묶음 없음, pageerror 0.

## 마지막 기록 기준 v1125
### 1125차 제목 줄 복원·03 칩 삭제
**1125차(사용자: 페이지 제목 다시 살리고 03 현장 칩 삭제)** — 회의모드 제목 줄(번호·제목·오른쪽 기준일/현장/세대)을 1122 모양으로 되돌림 — 제목 줄 오른쪽과 겹치므로 1123 의 탭 줄 메타(.mm-meta)와 그 CSS 삭제. 03 현장 칩 줄(.mm-idx·sticky .mm-hc·mtg.go) 삭제 — 03·04 오른쪽은 다시 권역·담당자 칩. ↑↓ 키 현장 이동은 남김(현재 현장을 mm-body._ai 로 기억, 카드 위 20px 에 맞춤). 검증: 1600×900 01·03 캡처, pageerror 0.

## 마지막 기록 기준 v1124
### 1124차 03 카드 내용 높이
**1124차(사용자: 03 처리계획 카드는 화면 말고 내용 높이로)** — mtgSnapFit 의 카드 min-height(화면 높이) 삭제 — 카드는 내용대로, 사이 간격 14px. 활성 표시: 목록 줄·↑↓로 고른 현장을 기억(끝쪽 카드는 위까지 못 올라와도 고른 것 표시), 휠·터치·드래그면 다시 위치 기준(목록 줄 아래 40px 선), 맨 끝이면 마지막. 01 도넛이 1280에서 작은 것은 1122 이하와 같음(좌우 설명선 여백 158px 고정이라 폭이 좁으면 반지름 51px, 1600 은 115px) — 손대지 않음. 검증: 1600×900 ↓15회 끝=2/2, 휠 위로=1번째, 카드 높이 567·567.

## 마지막 기록 기준 v1123
### 1123차 회의모드 개선안 반영
**1123차(사용자: 회의모드 개선안 1·2·4·5·6·7·8 수용, 3 회의 지시 메모 제외)** — (1) 상단바 페이지 제목 줄 삭제, 탭 오른쪽에 `기준일 · 현장 n · 세대` 메타(1440 이하 기준일만, 1360 이하 숨김 — 탭 줄바꿈 방지). (2) 03 장기미처리 처리계획에 현장 인덱스(sticky, 계획 미작성 현장 빨간 점) — 클릭·↑↓ 키로 현장 카드 단위 이동(mtgGoSite: 카드 상단을 인덱스 바로 아래로 정확히 맞춤, mtgSnapFit: 카드 최소높이·활성 표시). (4) 01 KPI 아래 자동 요약 칩(mtgInsights: 장기미처리 연속 증감 · 처리율 최저 현장 · 장기 증가 최다 현장). (5) 계획 미작성 회색 표시, 카드 머리에 `계획 n/m` 알약(미작성 있으면 빨강). (6) 02 권역 카드 지표 3열 정렬(space-between, 라벨 줄바꿈 금지). (7) 01 추이 범례를 선 모양으로. 04 공가세대도 같은 mtgPlan 이라 계획 표시·알약 동일. 검증: 1600×900·1280×800 01~05 캡처, 03 ↓ 이동 후 카드-인덱스 간격 2px·활성 1.

## 마지막 기록 기준 v1122
### 1122차 05 오른쪽 2:1
**1122차(사용자: 05 추이·감지요소 2:1)** — 05 오른쪽 열을 세로 격자로(grid-template-rows: minmax(0,2fr) minmax(max-content,1fr)) — 카드 바깥 높이 2:1(1600×900 355:179 · 1920×1080 476:238), 화면이 낮으면 감지요소 4줄이 다 보이는 높이는 지킨다(줄 최소 26px). 함께 고침: 1113차에 남은 `#mm .p5g .p5f{grid-column:span 2}` 가 오른쪽 열 안에서 보이지 않는 둘째 칸을 만들어 추이 카드가 12px 좁았다(1118~1121) — 규칙 삭제 + 오른쪽 열 칸을 minmax(0,1fr) 하나로.

## 마지막 기록 기준 v1121
### 1121차 위젯 1.5.0 — 두 번째 자동 실행 경로·바탕화면 아이콘·부팅 표식
**1121차(사용자: 위젯 부팅 때 가끔 안 켜짐 — 실행 로그 없음)** — 위젯 1.5.0(widget-lite, exe 재빌드). 로그 0줄 = 프로세스가 시작조차 안 됨(Run 키·시작 앱 승인은 609·629차에 이미 점검·복구 중). ① 시작프로그램 폴더 바로가기(`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\H 주요업무현황 위젯.lnk`, 인자 `--autostart-s`) — Run 키와 따로 도는 두 번째 자동 실행 경로, 관리자 권한 불필요. 자동 실행 켜고 끌 때 함께, 켜 둔 동안 매 시작 없으면 다시 만든다. 둘 다 뜨면 단일 인스턴스가 하나만 남기고 「중복 실행 → 기존 창 표시(인자)」를 남긴다. 시작 로그는 「시작(자동)/시작(자동·시작프로그램)/시작(수동)」. ② 바탕화면 바로가기(`H 주요업무현황 위젯.lnk`) — 처음 한 번 만들고(St.desk_icon), 사용자가 지우면 다시 만들지 않는다. 트레이 「바탕화면 아이콘」으로 켜고 끈다. 이미 떠 있으면 더블클릭 = 기존 창 앞으로. ③ 부팅 표식 `%LOCALAPPDATA%\HPlanWidgetLite\boot-log.txt` — 문서 폴더 밖에 시작 한 줄(문서폴더 경로·exe 존재 여부). 문서 폴더가 로그온 직후 준비 안 돼 위젯 로그가 0줄인 날을 「아예 안 떴다」와 가른다. ④ 바로가기는 셸 COM(IShellLinkW·IPersistFile, windows 0.62 — tauri 가 이미 쓰는 판에 기능 Win32_System_Com·Win32_UI_Shell 만 더함). 「자동 실행 점검」 로그·「자동 실행 상태 확인」 창에 시작프로그램 바로가기 유무 추가. 확인: 리눅스 cargo check 통과(윈도우 전용 코드는 이 환경에서 윈도우 대상 표준 라이브러리를 못 받아 windows 0.62.2·windows-core·windows-strings 소스와 시그니처 대조 — 첫 컴파일은 Actions).

## 마지막 기록 기준 v1120
### 1120차 전체화면 나간 뒤 차트 다시 맞춤
**1120차(사용자: 전체화면에서 바로 나가면 본 페이지 추이 차트 비율 오류)** — 재현 못 함(가상 자료 · 창 크기 1600×900↔1920×1080·1366×700↔768 · 배율 1/1.25/1.5 · 닫힘 후 0/150/400ms 뒤 크기 복귀 · 실제 창 전체화면(Xvfb+CDP) — 대시보드 dfTrend/dfSx/dfMx 와 회의 01 차트 모두 칸 크기 = 차트 크기). 방어 수정: 회의 모드 닫힘 끝(done)과 전체화면 해제(fullscreenchange) 때 본 페이지(#mm 밖) Chart 를 다음 프레임 + 400ms 뒤 두 번 c.resize() 로 지금 칸에 다시 맞춘다(mtgRefitPage).

## 마지막 기록 기준 v1119
### 1119차 05 모션·점검
**1119차(사용자: 05 모션·버그 점검)** — 05 들어올 때: 타일 5개·히트맵 카드·오른쪽 두 카드가 차례로(mtgEnter 가 .p5g 의 카드를 낱개로), 히트맵 줄이 28ms 간격으로 떠오르고(02 표 줄과 같은 박자), 중대 감지요소 막대가 펴진다(02 비율 막대와 같은 clip-path), 타일 숫자는 세어 오르고 추이 차트는 01 과 같은 그리기 모션. 점검(현장 13곳 가상 자료 · 1600/1280): 01~05 순회·방향키 이동·히트맵 칸/현장명 → 목록·추이 차트 세로선 값 상자·창 크기 바꿈·03 공종/업체 전환·회의 모드 닫은 뒤 대시보드 히트맵 호버 — 페이지 오류·콘솔 오류 0, 차트 인스턴스 누수 없음(05 = mmC5 하나 + 대시보드 3).

## 마지막 기록 기준 v1118
### 1118차 05 민원 현황 다듬기
**1118차(사용자: 05 민원 현황 다듬기)** — ① 05 오른쪽 2칸 = 민원 세대 추이(위) · 중대 감지요소(아래). 추이: 최근 12개월(게시된 달) 주의 이상(파랑)·긴급·심각(빨강) 두 선, 01 「미처리·장기미처리 추이」와 같은 그림 — 01 차트의 글꼴·축·채움·처음/끝 값·세로선 값 상자·호버를 mtgKit(anim) 로 빼서 mtgCharts1·mtgCharts5 가 같이 쓴다. 지난달 레벨 수는 mtgLoad→mtgRkPrevLoad 에서 reportIndex 의 기준월 이전 11개월 × 현장(kpi/hh/cnt, DF.rkPrev). ② 중대 감지요소: RISK_RULES.factors 중 crit 4개만, kpi/hh/fac 기준 세대 수 + 전월대비(kpi/hh/fac 전월, DF.rkFacPrev). 열 머리 없음. ③ 히트맵 = 대시보드 것 그대로(칸 전월대비 없음), 회의 화면에서 칸 사이 3px·줄 최소 28px — 현장 13곳이 1600×900 에 한 화면(1280×800 은 약간 구름). ④ 담당자 칩 없음(머리 오른쪽은 기준일·관리세대).

## 마지막 기록 기준 v1117
### 1117차 히트맵 개선안 적용
**1117차(사용자: 히트맵 개선안 적용)** — .rkh 히트맵(대시보드·회의 모드 05 공용): ① 농도를 열마다 .14~.92 로 넓혀 적고 많음이 확실히 갈린다(이전 .5~.95). ② 글자색 = 흰색과 같은 계열 진한 글자 중 바탕과 대비가 큰 쪽(WCAG 대비식 — lum/crt/ink), 글자 그림자·칸 그림자 제거. ③ 0 은 옅은 바탕 「–」(.rkh-z). ④ 양호도 같은 방식으로 음영(회청색 164,176,196). ⑤ 머리글에 레벨 색 점. ⑥ 납작한 칸(모서리 5px, 회의 7px). ⑦ 호버: 떠오름 대신 줄 띠(.rkh-r 바탕 --fill) + 칸 안쪽 2px 테두리·채도 1.15, .2s MV_EASE.

## 마지막 기록 기준 v1116
### 1116차 회의 모드 히트맵 간격
**1116차(사용자: 회의 모드 히트맵 간격)** — 05 히트맵 칸 사이 6→3px(가로·세로), 줄이 카드의 남는 높이를 나눠 가져(flex:1) 빈 줄 간격 대신 칸이 커진다(최소 36px). 현장명·권역은 가운데 정렬 유지.

## 마지막 기록 기준 v1115
### 1115차 히트맵 호버 모션
**1115차(사용자: 히트맵 호버)** — .rkh-c(대시보드·회의 모드 05 공용) 호버: 이징 MV_EASE .32s(기존 .2s 표준), translateY(-2px) scale(1.035) + 두 겹 부드러운 그림자 + 밝기 1.04. 벗어날 때 z-index 를 .32s 늦게 내려 내려앉는 동안 이웃 칸 밑으로 꺼지지 않게(transition z-index 0s .32s, 호버 땐 지연 0). 누르는 순간 scale(.98) .12s.

## 마지막 기록 기준 v1114
### 1114차 05 히트맵 = 대시보드 히트맵
**1114차(사용자: 05 히트맵)** — 05 현장별 민원 현황을 대시보드 히트맵(dfRiskDashHTML) 그대로 씀(계 열 없음·양호 포함, 색·농도·정렬 동일). 회의 화면 크기로만 키움(#mm .p5h: 글자 15px·셀 36px·현장명 칸 = 대시보드 계산 폭 × 1.25, 남는 칸은 레벨 열로). 클릭: 셀 → 그 현장·레벨 세대 목록(df.riskCell), 현장명 → 회의 모드 중엔 화면을 옮기지 않고 그 현장 주의 이상 세대 목록(df.siteRisk → dfRiskCellModal(sid,'') — lv '' = lv≥1, 제목 「주의 이상」). 이전 자체 히트맵 CSS(.hr/.hc) 삭제.

## 마지막 기록 기준 v1113
### 1113차 회의 모드 05 민원 현황
**1113차(사용자: 회의 모드 05 민원 현황 추가 외)** — ① 회의 모드 다섯째 장 「민원 현황」(MTG_P[4], mtgP5): 게시 kpi.hh(세대 레벨 cnt·list)로 — 위 레벨 타일 5개(주의 이상·긴급·심각·경계·주의 세대, 전월대비 배지 = report/전월/현장/kpi/hh/cnt, mtgLoad 에서 mtgRkPrevLoad 로 미리 받음·DF.rkPrev 공용), 아래 5칸 격자: 현장 × 레벨 히트맵 3칸(셀 농도 = 열 최대 대비, 긴급+심각 많은 순, 합계 줄, 셀 → df.riskCell) | 감지요소 2칸(RISK_RULES.factors 전부·0 포함, 주의 이상 세대 기준, 중대 요소 빨강). 표(세대 목록)는 넣지 않는다(사용자: 현황만). ② 회의 모드 페이지 탭 글자 19→18px·번호 14→13px.

## 마지막 기록 기준 v1112
### 1112차 목록 다시 열기·그 외/계 지연
**1112차(사용자: 버그 2건)** — ① 목록보기를 닫았다가 같은 목록을 다시 열면 「불러오는 중…」에 멈추던 것: openModal 이 #mbody 를 로딩 문구로 바꿔도 paintHTML 은 지난번 서명(__sig)과 같은 내용이라 다시 그리지 않았다 → paintHTML 이 마지막으로 그린 첫 자식(__fc)도 비교해 그 사이 다른 코드가 바꿨으면 다시 그린다(모든 paintHTML 사용처 공통). 재현 확인(v1111: 2·3번째 열기 로딩 고정 → 수정 후 정상). ② 03 공종별/업체별 전환 때 그 외·계가 늦게 뜨던 것: 줄 차례 모션이 숨긴 줄까지 세어 그 외·계가 숨은 줄 수 × 25ms 늦었다 → 보이는 줄만 센다.

## 마지막 기록 기준 v1111
### 1111차 03 넓은 카드 다듬기
**1111차(사용자: 03 넓은 카드 다듬기)** — ① 세로선을 따로(.vl, 격자 7fr|1px|5fr·간격 26 — 카드 안 여백과 같음) 두어 양쪽 머리 가로선이 세로선에 붙지 않고 끊긴다. ② 현황 표: 열 머리 공종·시공업체(업체별은 시공업체·공종)·미처리·장기(빨강 — 막대 범례 대신)·전월대비. 색 범례 삭제, 막대는 두 색(장기=--ch-d60 · 30일 미만=--ch-d0)+옅은 바탕(--fill), 6px. 줄 = 이름·주요 시공업체(주요 공종)·막대·미처리(회색)·장기(검정 굵게)·전월 대비 장기 증감 배지(mtgBa(lt−plt)). ③ 끝 두 줄 그 외·계(mtgAggFit: 다 들어가면 계만, 넘치면 장기 적은 쪽부터 숨겨 그 외로 합산 — data-u/lt/plt). 계 = 전체(왼쪽 장기미처리 계와 같음), 누르면 그 현장 미처리 전부. ④ 글자 크기를 카드 안 기존 단계로: 제목 19px·800·--lbl2, 열 머리·보조 칸 14.5px(권역·세대와 같음), 줄 15px, 배지 12.5px. ⑤ 목록보기: 주요 업체/공종 칸 → 그 공종×그 업체, 왼쪽 계획(03·04)의 업체명 → 그 공종×그 업체. recOpen 제목에 공종·업체 둘 다, 빈 공종·업체는 집계 이름(기타·(미기재))으로 거른다 — 「(미기재)」 줄 목록이 비던 것 수정.

## 마지막 기록 기준 v1110
### 1110차 03 넓은 카드 머리 분리·현황 높이 맞춤
**1110차(사용자: 2건)** — 03 넓은 카드 ① 머리도 반으로: 카드 안을 2×2 격자(.wg, 7fr/5fr)로 — 왼쪽 위 현장 머리(이름·장기미처리 계)·아래 처리계획, 오른쪽 위 현황 머리(제목 19px·공종별/업체별·범례·미처리/장기 열 머리)·아래 줄. 가로선은 양쪽 머리 아래 따로, 세로선은 카드 위까지 이어진다. mtgAggHTML 이 {h,b} 반환, mtg.agg 는 .ah·.ag 둘 다 제자리 교체. ② 현황 줄을 계획 높이에 맞춤(mtgAggFit): 장기 많은 순 최대 16줄을 그린 뒤 계획 높이(.pls 는 align-self:start 로 제 높이)에 34px 줄이 들어가는 만큼만 보이고(최소 3줄), 남는 높이는 줄 간격으로 나눠 갖는다(최대 52px). 그릴 때·담당자 전환·공종/업체 전환·창 크기 변경 때 다시 맞춘다.

## 마지막 기록 기준 v1109
### 1109차 회의 모드 03 넓은 카드·프로필 닫힘
**1109차(사용자: 3건)** — ① 회의 모드 헤더 「전체화면」을 「나가기」 쪽으로(.mm-fs+.mm-x margin-left −14 → 간격 26). ② 03 장기미처리 처리계획: 현장 카드가 한 줄 전체(.sc.wide, 04 공가세대는 기존 2열) — 왼쪽 처리계획(7fr), 오른쪽 그 현장의 공종별/업체별 처리현황(5fr, mtgAggHTML: 미처리 u>0, 장기 많은 순→미처리 순 8개, 60일+·30~59일·30일 미만 쌓은 막대, 미처리·장기 수, 줄을 누르면 rec.list). 공종별/업체별 전환(MTG.agg, mtg.agg 가 .ag 만 제자리 교체 + 줄 등장·막대 펼침 모션). ③ 프로필 팝업 닫힘: 사이드바로 줄어드는 상자가 흰색 그대로 내려앉던 것 → mvMorphFrom 이 돌아갈 단추(또는 가장 가까운 불투명 조상)의 바탕색으로 물들며 35% 이후 흐려져 사라진다(모든 모프 닫힘 공통).

## 마지막 기록 기준 v1108
### 1108차 시간 칩·링크 줄·전환·D+60 지도·회의 모드
**1108차(사용자: 8건)** — ① 업무 폼 시간 칩: 입력칸이 아이콘 자리까지(peTinFit 이 아이콘+간격 D 만큼 margin-left −D·padding-left D/k·폭 +D/k — 폰 축소(k) 포함). 아이콘을 눌러도 바로 입력, 포커스 테두리가 아이콘까지. ② 링크 칩 → 주소 줄 펼침/접힘 모션(peLnkAnim: 높이·위아래 여백·흐림, 펼침 MV_MID·접힘 MV_FAST 후 hidden, 다시 누르면 취소하고 반대로). ③ 화면 전환 덜컥 원인 2: (가) 전환이 끝나 html.vt-nav 를 거둘 때 `.view.act>*` viewIn 이 다시 재생돼 0.6초쯤 본문이 반투명으로 한 번 더 깜빡였다(실측) → 끝날 때 새 화면에 `.vt-done`(viewIn 끔), 다음 go() 때 제거. (나) 새 본문이 viewIn(.5 에서 시작)이라 옛 화면과 겹쳐 보임 → 새 본문 vtIn(0→1·6px, .24s)·옛 본문 .09s 로. ④ D+60 현장 지도가 처음 진입 때 비던 것: 지도 파일(korea-geo) 지연 로드 끝나면 조직 화면만 다시 그렸다 → d60 이면 rOrgMap(). ⑤ 회의 모드 탭 글자 = 카드 제목(19px·800), 번호 14px. ⑥ 월간 접수·처리 마지막 달 값 — 두 막대 글자가 겹치면 가운데를 기준으로 좌우로 맞댄다. ⑦ 두 차트 세로선·값 상자: mtgHx — x 는 지수 감속으로 미끄러지고, 들어올 때 흐림에서 나타나며 나가면(mouseleave·mouseout) 흐려져 사라진다. 선 위 점은 미끄러지는 x 의 곡선 높이(mvLineY). ⑧ 조직 관리 「공가세대」 끈 현장은 회의 모드 04 공가세대 처리계획에서 제외(mtgVacOn — 칩·카드 모두).

## 마지막 기록 기준 v1107
### 1107차 버그 수정 묶음
**1107차(사용자: 버그 수정 — 이번 묶음(1092~1106) 전수 점검)** — 3화면 크기(1600·1280·390)×전 화면·하자 탭 6종·찾기·알림·회의 모드 순회: 페이지·콘솔 오류 0. 별도 검토(JS diff·CSS diff, Chromium CSSOM 대조 — hover 감싸기 197·짝 196 무손실 확인) 지적 9건 수정: ① 뒤 알림의 「다시 실행」(undo.redo)이 앞 알림을 닫던 것 → 누른 알림만 tstDrop. ② 뒤 알림 단추로 닫으면 mouseleave 가 안 와 펼침·멈춘 시간이 남던 것 → tstDrop 후 hover 아니면 tstHover(false). ③ .toast-bk.out 흐려짐이 인라인 opacity 에 막혀 툭 사라지던 것(!important + tstDrop 이 인라인 지움). ④ 앞 알림이 시간 외 길(단추·밀기·화면 이동)로 닫혀도 뒤 알림 자리 다시 잡기(#toast class MutationObserver). ⑤ 폰에서 쌓인 동안 앞 알림이 아래 화면 누름을 막던 것(pointer-events 는 마우스 환경만). ⑥ 폰에서 알림을 미는 중 새 알림이 오면 새 알림이 치워지던 것(_sw/_swc). ⑦ 회의 모드 중 Ctrl+K 가 뒤에 숨은 찾기를 열던 것 → 무시. ⑧ 회의 모드를 LAYERS block 으로 — 저녁 알림·아침 확인 창이 발표 화면 위로 뜨지 않게. ⑨ dpLeave 가 다른 카드의 접힘 유령까지 걷던 것 → 같은 카드(data-gpid)만. ⑩ 사이드바 연속 이동 시 앞 전환이 vt-nav 를 먼저 거두던 것 → 마지막 전환만(토큰). ⑪ 대시보드 인쇄(df-printing)에 .toast-bk 숨김 추가. 참고: widget-layers 「폰 메뉴 올라오는 중 설정」 1회 실패 후 재실행 3/3·전체 PASS — 시트 미끄럼 타이밍 의존(기존).

## 마지막 기록 기준 v1106
### 1106차 화면 전환 · 알림 쌓기
**1106차(사용자: 트렌디 개선안 1·4 미리보기 → 적용)** — ① 화면 전환(View Transitions): 사이드바 이동(`nav.go` → `navGo`)만 `document.startViewTransition` — `html.vt-nav` 동안 `#content` 에만 view-transition-name(vmain), `:root{view-transition-name:none}` 이라 상단바·사이드바는 살아 있다. 옛 본문 vtOut .14s 흐려짐 + 새 본문 viewIn(기존 키프레임), 그동안 `.view.act>*` viewIn 은 끈다(이중 방지). 코드에서 부르는 go() 는 그대로 즉시(동기 — 뒤따르는 렌더 코드가 S.view 를 믿는다). 미지원·위젯·조직 초안 확인창 경로는 go 그대로. ② 알림 쌓기(Sonner 식): toast/toastAct/toastUndo 가 먼저 `tstPush()` — 앞 알림(#toast)이 떠 있으면 사본을 `.toast-bk` 로 남긴다(단추·_fn·남은 시간). 최대 2장, 접힘 = 위로 8px·5% 작게·흐리게, 올리면(body.tst-x) 제 높이만큼 위로 펼쳐지고 시간 멈춤. 쌓인 동안은 폭을 가장 넓은 것에 맞춤(minWidth). 단추 동작은 요소별 `_fn`(`toast.act` 가 뒤 알림이면 그 것을 실행). 화면 이동 시 tstClear. CSS 의 #toast 규칙은 `#toast,.toast-bk` 로 함께(데스크톱·폰·위젯), 인쇄 숨김 목록에도. 폰은 펼치기 없음(뒤 알림은 보이기만). 검증: 데스크톱·폰·위젯 각각 최대 2장·뒤 알림 되돌리기 실행·시간 경과 소멸·화면 이동 치움·연속 이동·오류 0.

## 마지막 기록 기준 v1105
### 1105차 공휴일 표 대조·보강
**1105차(사용자: 오픈소스 검토 → 공휴일 데이터 대조 진행 · HEIC 변환은 기각)** — app.js `HOLI` 를 hyunbinseo/holidays-kr(npm @hyunbinseo/holidays-kr 5.2027.2, MIT, 월력요항 가공)와 2025~2027 대조: 2025 일치, 2026·2027 에 7일 누락 → 추가. 2026-05-01 노동절 · 2026-06-03 지방선거 · 2026-07-17 제헌절 · 2027-05-01 노동절 · 2027-05-03 대체공휴일 · 2027-07-17 제헌절 · 2027-07-19 대체공휴일(노동절·제헌절은 2026년 4월 관공서 공휴일 규정 개정으로 공휴일). 2028~2030 은 노동절·제헌절(모두 평일이라 대체 없음)만 추가 — 그 해 선거일·임시공휴일은 발표되면 추가. 대조 후 2025~2027 차이 0. ANNIV(회색 기념일) 근로자의날·제헌절은 2025 이전용으로 그대로(HOLI 가 먼저). 라이브러리는 넣지 않음(데이터 대조만 — 회사망 CDN 불확실). heic-to(HEIC 변환, LGPL·3.2MB)는 사용자 기각. es-hangul 은 불필요(앱에 초성 매칭 코드 있음).

## 마지막 기록 기준 v1104
### 1104차 처리계획 칸 field-sizing
**1104차(사용자: good-css 2안 진행 — 처리계획 칸 높이를 CSS로)** — `#view-defect .plan-ta` 에 `@supports (field-sizing:content){field-sizing:content}`. 지원 브라우저(크롬·엣지 123, 사파리 26.2, 파이어폭스 152)는 dfPlanFit·dfPlanFitAll 이 바로 돌아간다(`dfFS()` — 함수 선언이라 렌더가 먼저 불러도 안전). 미지원은 예전 JS 측정 그대로. 실측(장기미처리 탭, 빈칸·한 줄·긴 문장·4줄): 높이 32/32/45/78 — 예전 JS 32/32/43/76 은 테두리 2px 만큼 짧게 잘렸었다. 탭 전환 때 칸 수만큼 재던 레이아웃 계산이 없어진다.

## 마지막 기록 기준 v1103
### 1103차 폰 누름 피드백 · 현장 칩 두 번 눌러 해제
**1103차(사용자: 폰 누름 피드백 미리보기 → 업무 추가는 변화가 안 보임 · 현장 칩은 두 번 눌러 해제)** — ① 터치 누름 피드백: hover 미디어로 감싼 196개 규칙마다 바로 뒤에 `@media not ((hover:hover) and (pointer:fine)){…:hover→:active…}` 한 벌 — 손가락이 닿은 동안만 데스크톱 hover 모양(새 디자인 없음). ⚠ 새 hover 규칙을 쓰면 이 짝도 함께. ② 폰 업무 추가(+, .tkbar .tkq-add) 누름: 글자색만 옅어져 안 보임 → 바탕 var(--fill) — `.btn.bo:not(.on):active{background:transparent}` 짝이 이겨서 `body:not(.wid) .tkbar .btn.bo.tkq-add:active` 로 명시도 올림. ③ 조직 관리 현장 칩(acct.siteOff) — 터치(hover 없는 기기)는 첫 탭에 해제 대기 `.site-on.arm`(데스크톱 hover 와 같은 빨간 취소선)만, 같은 칩을 한 번 더 누르면 해제, 다른 곳을 누르면(document pointerdown 캡처) 대기 취소. 권한 없음 안내는 첫 탭에 바로. 데스크톱은 한 번 클릭 그대로. 실측(폰 에뮬): 첫 탭 대기·바깥 탭 취소·두 번째 탭 해제·다른 칩 탭 시 그 칩만 대기·데스크톱 한 번 해제. 실기기 확인 필요: 목록 스크롤 시작 시 줄이 잠깐 회색으로 깜빡이는지.

## 마지막 기록 기준 v1102
### 1102차 hover 를 마우스 환경으로 한정 · 회의 모드 단추 숨김
**1102차(사용자: good-css 점검 → hover 정리 진행)** — ① 폰(iPhone)에서 누른 뒤 hover 모양이 남던 것: 조건 없는 `:hover` 규칙 196개를 제자리에서 `@media (hover:hover) and (pointer:fine){…}` 로 감쌈(캐스케이드 순서 유지). `:focus-visible` 등과 한 목록이던 27개는 비-hover 선택자를 원래 규칙으로 남기고 hover 쪽만 감쌈. 이제 index.html 의 :hover 는 전부 hover 미디어 안 — ⚠ 새 hover 규칙도 이 미디어 안에 쓸 것. 데스크톱 4화면(달력·업무 현황·조직·사진대지) 요소 300개 평상·hover 계산 스타일 전후 동일(전환 끄고 비교). 폰에서 hover 고착 덕에 보이던 조직 관리 행 삭제 단추(.tm-row .tm-del)는 이제 행 안 칸을 누르면(focus-within) 보인다. 실기기 확인 필요(헤드리스는 hover 고착을 재현 못 해 CDP forcePseudoState 로 비교). ② 1095 버그: 상단 「회의 모드」(#tbMtgWrap)가 하자처리 현황 밖·폰에서도 보였다 — `.tb-nav{display:flex}` 가 hidden 을 이겨서. index.html 의 `#tbRm[hidden],…{display:none!important}` 목록에 #tbMtgWrap 추가. ③ static-audit WARN(주석 회차 표기) 정리.

## 마지막 기록 기준 v1101
### 1101차 일자 목록 추가·삭제 모션
**1101차(사용자: 업무 팝업 업무 추가·삭제 모션이 덜 부드러움)** — 일자 목록(#dpList, 데스크톱 패널·위젯 날짜 팝업 공용) 프레임 단위 실측으로 원인 4가지. ① 카드 삭제(우클릭 메뉴 등)에서 rDay 의 mvGone 과 dpLeave 가 같은 카드를 두 번 접었다(유령 2개 — 아래 카드가 한 칸 내려갔다 두 칸 올라옴) → dpLeave 가 넣기 전에 .mv-gone 유령을 즉시 걷는다(oncancel 은 비동기라 직접 remove). ② 맨 위 유령이 접힌 끝에 6px 튐 — 다음 카드의 `.plan+.plan` 위 여백이 유령이 빠질 때 사라졌다 → 맨 위 유령이면 다음 항목 위 여백까지 접는다(dpLeave·mvGone 공통). ③ 새 업무 폼이 끼면 아래 카드가 174px 한 번에 내려갔다 → openPlanEdit(새 업무)·빈 폼 닫기에 FLIP(dpFlipPre/dpFlipRun, 320/280ms). ④ Enter 저장(savePlanInline)은 폼이 사라지고 카드가 따로 떠오르며 아래 카드가 튀었다 → `_peShrink` 로 그 카드를 폼 높이에서 줄인다(rDay 그린 뒤 소비, 라이브는 구독 값이 온 그리기에서 · 1.5초 지나면 버림) · closePlanEdit 도 자동 저장 전 새 업무면 draft id 로 같은 줄임. 실측: 삭제·폼 삭제·마지막 업무 삭제·추가·저장·빈 폼 닫기 모두 튐 0. 참고: 삭제 직후 refetchCal 이 헤드리스에서 약 80ms(움직임 시작 전이라 끊김은 아님).

## 마지막 기록 기준 v1100
### 1100차 민원 세대 표 막대 카드 밖 · 회의 모드 모션·버그 점검
**1100차(사용자: 공구 띠 기각 · 회의 모드 모션·버그 점검 · 민원 세대 표 오른쪽 막대 안 보임)** — ① 민원 현황 세대 표(.rk-tsc) 세로 막대를 카드 밖 오른쪽으로: #view-defect(구르는 판)를 #content 여백으로 12 넓히고(안쪽 여백 12, 내용 폭 그대로) 감싸개 margin-right −30/padding-right 20. 막대는 D+60 과 같은 표준 속성(scrollbar-width:thin · scrollbar-color --sepo) — webkit 막대만 쓰던 것이 일부 크롬에서 안 보였다. 실측: 카드 오른쪽 1582 · 막대 1583~1593 · 표 폭 그대로. ② 회의 모드: 담당자 칩은 제자리에서 색 전환(칩 transition, 카드 묶음만 갈아 끼움 — 상단 바·칩 줄을 다시 그리지 않음), 02 장기미처리 비율 막대가 왼쪽에서 차오름, 기준월 바꾸는 동안 본문 흐림, 여는 동안 회의 모드 단추 흐림. ③ 버그: 연속 클릭 시 중복 열기 막음(MTG.ld) · 닫히는 중 다시 열면 닫힘 끝에 새 창까지 지워지던 것(닫히는 노드는 즉시 걷고 새로 만듦) · 월 선택 메뉴가 떠 있을 때 ←/→ 넘김 막음 · 열 때 #mm 에 초점, 닫을 때 열기 전 자리(없으면 회의 모드 단추)로 · 열 때 slSync 로 밑줄 기준 갱신.

## 마지막 기록 기준 v1099

### 1099차 — 값 상자 여백 · 처리계획 2열(사용자)
- 담당 현장 4곳 가짜 명부로 2열·구름 확인. 시험 9종 PASS.

### 1098차 — 회의 모드 전체화면·값 상자·기준월(사용자)
- 추이 6월 위 마우스 → 「6월 미처리 1,092 / 장기 828」 상자, 막대 8월 → 「8월 접수 552 처리 310」, 기준월 단추 → 게시 달 목록(가짜 자료 1개월) 확인. 시험 9종 PASS.

### 1097차 — 회의 모드 다듬기(사용자)
- 도넛 조각 올림 → 가운데 「HS 청주 가경 441건」 확인, 추이 시작값 603/434 겹침 해소, 720px 높이에서 02 화면 구름 확인. 시험 9종 PASS.

### 1096차 — 회의 모드 모션 · 목록 대조(사용자)
- 가짜 자료로 숫자 ↔ 목록 「결과 N」 36건 대조: 01 미처리·장기, 02 현장 6 + 합계 × (미처리·장기), 03 공종 10, 04 공가 공종 10 — 수정 전 장기 계열 21건 불일치(예: 두정역 장기 171 vs 목록 166) → 수정 후 전부 일치. 기존 현장 장기미처리 탭 상위 공종 링크(수장 17 → 12)도 같은 원인. 시험 9종 PASS.

### 1095차 — 회의 모드(사용자)
- 가짜 자료(e2e 머리)로 실제 앱에서 확인: 단추 → 01~04 전환(←/→), 도넛 공종별 전환, 공종명 클릭 → 목록 창이 회의 모드 위에 뜸, Esc 두 번 → 창·회의 모드 닫힘, 오류 없음. 시험 9종 PASS.

### 1094차 — 관리자 타 계정 이름 수정(사용자)
- 로컬 모드 조직 관리에서 이름 칸 고치기 → 명부·표 이름 반영 확인. 시험 9종 PASS(rules-auth AUTH-20a~c 포함). 발표 모드는 미리보기(PNG 5장)만 — 앱 반영 없음.

### 1093차 — 업무 현황 당겨서 새로고침 제외 · 모핑 확대(사용자)
- 브라우저 확인: 창 열기 → 단추 자리 상자(z 1001)가 창 크기로 펴진 뒤 창 표시(불투명 1) · 닫기 → 단추로 줄어듦 · 조직 관리 팀 추가 → 새 행으로 펴짐. 시험 9종 PASS.

### 1092차 — 움직임 5종 적용 · 모션 통일(사용자)
- 브라우저 확인: 달력 다음 달 → 「10→11」 토막만 굴림 후 맨 글자 복귀, 빠르게 세 번 눌러도 글자 안 겹침 · ＋ 모핑 중 #peTitle 초점 유지 · 비운 폼 닫기 → ＋ 로 줄어듦 · 업무 현황 ＋ ↔ 폼 · 폰 상단바 년월 굴림 · 하단 탭 알약 늘었다 줄며. 시험 9종 PASS.

### 1091차 — 주요 이슈 제목형 · 미니달력 시험 격리(사용자)
- 보고서 대시보드·현장 1쪽 PDF 확인(카드 4장, 2쪽 유지). 시험 9종(정적 감사·rules-auth·smoke·rainbow-render·e2e·risk-gold·mobile-fit·clip·widget-layers) PASS — rainbow-render 미니달력 점 FAIL 해소.

### 1090차 — 보고서 주요 이슈 내용 개편(사용자)
- 가상 자료 대시보드: 미처리 증가 원인(접수 +39% · 처리 -6%) · 현장 편차 · 다음 달 장기 전망 · 업체 집중 4장. 현장: 중대하자 · 증가 원인 · 장기 전망 · 업체 집중 4장. 보고서 2쪽 유지. 정적 감사·smoke·e2e·risk-gold PASS. 미니달력 점(그라디언트 계정 6명 · 완료 섞음) 실측: 그라디언트 칠해짐 — 사용자 증상 재현 안 됨.

### 1089차 — 인쇄 정리(사용자)
- PDF(크롬 page.pdf)로 전 경로 확인: 화면 그대로 대시보드 3→2쪽·현장 6→5쪽(빈 쪽 없음), 표 폭 1118→본문 폭(잘림 없음), 하단 탭·그림자 띠 없음, 히트맵 다섯 등급 표시. 보고서 양식 대시보드·현장 2쪽 변화 없음. 캘린더 Ctrl+P 달력 7열 한 장 + 일자 패널, 업무 현황·조직·설정 본문만. 사진대지 가운데 세로선 7px→4px(300dpi, 바깥 3px). 전체 시험 8종 PASS.

### 1088차 — 막대 끌기·팝업 기준점·머리 그림자·흔들림·사진 커짐(사용자)
- 브라우저: 끌기 중 따라오는 막대 transform(scale·rotate)·불투명도 1·원래 막대 .ev-src 2개·놓을 칸 파란 테두리, 놓은 뒤 클래스 정리. 위젯 팝업 기준점 420px 창 95/360px·900px 창 0/360px. 업무 현황 목록 굴리면 .tk-hrow.stuck, 맨 위로 가면 빠짐. 시간 칩 「abc」 Enter → mv-shake·mv-bad. 사진 사본 날아감 → 끝나면 사본 제거·원본 보임, 닫으면 되돌아감. 전체 시험 8종 PASS.

### 1087차 — 위젯 휴지통 단추 「휴지통 ›」(사용자)
- 위젯 캡처 확인. 정적 감사·smoke·widget-layers PASS.

### 1086차 — 프로필 이모지/배경색 간격(사용자)
- 실측: 분류→격자 19→12, 배경색 색 원 간격 21·20·20·20·21, 두 판 모두 창 389px(데스크톱·폰). 정적 감사·smoke·mobile-fit·clip·widget-layers PASS.

### 1085차 — 배경색 판 높이 · 휴지통 읽기 규칙 · 휴지통 단추 글자(사용자)
- 계정 창 이모지/배경색 396px 같음(데스크톱·폰). 가짜 DB 로 trashAll 역할별: 담당자 6요청 m1/a·m2/c(내가 만든 것) · 공구장 21요청(트리+현장 질의) · 팀장 6요청 다른 팀 제외. rules-auth AUTH-19 17건 포함 PASS. 정적 감사·smoke·e2e·risk-gold·mobile-fit·clip·widget-layers PASS. 실 Firebase 질의 규칙은 미확인.

### 1084차 — 위젯 휴지통 단추 · 휴지통 직급 범위 · 이모지 3줄(사용자)
- trashVisible 모의 판정(담당자 m1·공구장 L1·팀장 H1·관리자, 5건): 10001 · 10101 · 11101 · 11111 기대대로. 위젯 내 업무 팝업 단추 → 휴지통 창이 팝업 위에 뜸. 이모지 격자 134px·8열·3줄(데스크톱·폰). 정적 감사·smoke·e2e·risk-gold·mobile-fit·clip·widget-layers·rules-auth PASS.

### 1083차 — 막대 우클릭 · 강조 미끄러짐 · KPI 굴림(사용자)
- 막대 우클릭 → 「진행으로 되돌리기·수정·제목 복사·삭제」, 빈칸 → 날짜 메뉴, 메뉴 항목 위 이동 시 .slhl-b 이동, dfKcHTML 두 번(41,286 → 42,107) 굴림 후 평문 복귀. 정적 감사·smoke·e2e·mobile-fit·clip·widget-layers PASS.

### 1082차 — 완료 취소선·올리기 상자·게시 이음선·당겨서 새로고침·목록 글자 이동(사용자)
- 브라우저: 완료 클릭 → .plan.done.stk + 취소선 애니메이션 1개, 올리기 상자 drag/busy/ok 캡처 후 2.6초 뒤 원래대로, 단계 fresh 클래스는 첫 그리기만(다시 그리면 없음), standalone 흉내 폰 업무 화면에서 CDP 터치로 끌기 → #ptr ready → 놓으면 새로고침, 필터 현장 목록 「ㅊ」→ 청주 테크노폴리스 표시·↓ 다음 항목. 정적 감사·smoke·e2e·mobile-fit·clip·widget-layers PASS.

### 1081차 — 민원 규칙 사용자 편집판 반영(사용자)
- 사용자 판: 정답셋 59/60(비용 지급요함 누락) · 문맥 31/32(인테리어 줄눈 보상) + 오탐 탐침(화재감지기·삼성/LG 본사·바닥 실리콘 탈락). 검토판: 60/60·32/32·6/6, 탐침 22+16건 원래와 대조. risk-gold·정적 감사·smoke PASS.

### 1080차 — 댓글 규칙 삭제(사용자)
- 규칙 JSON 파싱 OK, rules-auth PASS, 정적 감사·smoke PASS. 규칙 게시 필요.

### 1079차 — 점검(버그·데드코드·보안)(사용자)
- 브라우저: 「0630」 Enter → 06:30 저장, 제목 수정 후 06:30 유지, 「1」 입력 중 자동 저장에도 06:30 유지·입력칸 「1」 그대로, 「10:30」 후 초점 이동 → 10:30. timeParse 17개 예문. eslint 오류 0. 정적 감사·rules-auth·smoke·e2e·risk·mobile-fit·clip·widget-layers PASS.

### 1078차 — iOS 상단 흐림: 여백 대신 fixed 앱 틀(사용자)
- standalone 흉내 캡처: 머리 top 0(웹과 같음), 6개 화면·찾기 정상. 정적 감사·smoke·mobile-fit·clip·widget-layers PASS.

### 1077차 — 찾기 제목 정렬 · 링크 사슬 정렬(사용자)
- 폰 찾기 머리 잉크 중심 아이콘 110.5 / 글자 111.0(2x px). 링크 아이콘 확대 비교·데스크톱·위젯 카드 캡처. 정적 감사·smoke PASS.

### 1076차 — 찾기 머리 · 바 컬러 삭제 · 시간 칩 폭(사용자)
- 위젯·데스크톱·폰 칩 캡처(시간 칩 아이콘~글자 간격·가운데 정렬이 구분·반복·링크와 같음), 폰·위젯 찾기 머리 캡처. 정적 감사·smoke·widget-layers·mobile-fit·clip PASS.

### 1075차 — iOS 홈 화면 앱 상단 흐림 회피 · 폰 찾기 짙은 머리(사용자)
- navigator.standalone 흉내로 폰 6개 화면 머리 위치(34px 아래)·달력 마지막 줄·찾기 여는 중간 프레임 캡처. 일반 폰(웹)은 0 그대로. 정적 감사·smoke·mobile-fit·clip PASS.

### 1074차 — 링크 아이콘 15px(사용자)
- 정적 감사 0·0, smoke PASS.

### 1073차 — 링크 아이콘 A안 · 16px(사용자)
- 데스크톱·위젯·폰 일자 카드 캡처. 정적 감사 0·0, smoke·clip PASS.

### 1072차 — 점검 반영 · 앱 바 컬러 · 폰 헤더 · 민원 휠(사용자)
- 데스크톱 톱니 → 소프트 → 새로고침 후 유지, 공통 업무 테두리 유지 · 폰 점 달력 소프트·시간 뺀 제목 · 폰 업무 추가 + 아이콘 · 메뉴 열면 mds-on 해제 · 검색 닫힘 visibility hidden · 위젯엔 톱니 숨김(위젯 설정 그대로). 정적 감사 0·0, smoke·e2e·risk·mobile-fit·clip·widget-layers PASS(widget-layers 의 mvGone null 오류 고침).

### 1071차 — 바 컬러 이름 소프트(사용자)
- 정적 감사 0·0.

### 1070차 — 유리 위젯 밝은 반투명 바(사용자)
- 유리 위젯 캡처 확인. 정적 감사 0·0, smoke PASS.

### 1069차 — 시간 타이핑 · 유리 위젯 환한 파스텔(사용자)
- 달력 폼에 「930」 입력 → 칸을 떠나면 09:30, 「엉뚱」 → 09:30 유지 + 토스트, 저장값 09:30. 업무 현황 폼도 .pe-tin. 파서 16개 예문 확인. 정적 감사 0·0, smoke·e2e·risk·mobile-fit·clip·계정 흐름 PASS.

### 1068차 — 모션 항상 · 바 컬러(사용자)
- reducedMotion=reduce 로 연 폰에서도 굴림·착지 재생 확인. smoke·e2e·risk·mobile-fit PASS, 정적 감사 0·0.

### 1067차 — 숫자 굴림 · 막대 착지 · 위젯 색감(사용자)
- 표본: 업무 추가 직후 데스크톱·폰 「업무 N건」 굴림 span 생성 → 1.3초 뒤 평문 「업무 5건」 복귀, 막대 착지 애니메이션 2개(이동+테두리) 실행 · 업무 현황 탭 건수·미완료·주기 건수 4곳 굴림 · 위젯(일자 팝업 닫힘)은 굴림 생략 · 위젯 일반/유리 × 기본/파스텔 캡처(공통 업무 테두리 유지 확인, FC 재칠 때 class 소실 → classNames 로 고침). 정적 감사 0·0, smoke·e2e·risk·mobile-fit·clip·계정 흐름 PASS.

### 1066차 — 민원 배치도 동 순서(사용자)
- 정렬 함수 단독 확인: 101 102 103 1101 상가1 s01 s02. e2e·risk-gold PASS, 정적 감사 0·0.

### 1065차 — 민원 등급 편향 수정(사용자 실자료 집계 기반)
- risk-gold·smoke·e2e·mobile-fit PASS, 정적 감사 0·0. 실자료 결과 미확인.

### 1064차 — 미처리 누수·균열은 경계(사용자)
- risk-gold·smoke·e2e·mobile-fit PASS, 정적 감사 0·0.

### 1063차 — 민원 등급 물리 바닥 조정(사용자)
- 가상 자료 재판정 분포 위 HANDOFF 참조. risk-gold PASS(새 시험 1건). 실자료 분포는 사용자 확인 필요(재게시 후).

### 1062차 — 게시본 나눠 쓰기(사용자: 게시본 쓰기 끊김 반복)
- 가상 자료 게시 쓰기 크기 실측(한 번 2.8MB → 현장당 0.04~0.55MB 9번). 세 번째 쓰기에서 실패시키면 「현장 2 / 5개만 새로 썼습니다」 표시 확인. 정적 감사 0·0 · e2e·risk·mobile-fit·clip PASS. rainbow-render 의 「업무 현황 미니달력 점 그라디언트」가 10-01 에 v1059 에서도 똑같이 실패 — 날짜(달 첫날)에 걸리는 시험 문제로 이번 변경과 무관, 미해결. 실망(사내망)에서 끊김이 사라지는지는 미확인.

### 1061차 — 도면 인쇄 폐지(사용자)
- 정적 감사 0·0 · 전체 브라우저 시험 PASS · 사이드바·폰 도구 목록에서 빠짐 확인 · 옛 도면 기록(dw·dwbuf)을 넣고 새로고침하면 지워짐 확인. 배포본 18.3MB → 8.4MB. 재시도용으로 옮겨 둔 옛 설계 기록:
- **업무 도구 › 도면 인쇄(815차)**: DWG 를 그대로 읽어 **도면틀마다 한 장**으로 나눠 인쇄한다(ZWCAD 를 열지 않으려는 목적). `#view-dwg` / `rDwg()` / 상태 `DW`. 이 창 메모리에서만.
  ⚠ 엔진(vendor/libredwg, GPL-3.0, wasm 9.7MB)은 **워커에서만** 돌린다 — 엠스크립튼 글루가 `new Function` 을 써서 문서 CSP(script-src 'self')에 막히지만, 워커 전역에는 그 CSP 가 상속되지 않아 그대로 돈다(실측). 그래서 **CSP 는 손대지 않았다**.
  워커(`vendor/libredwg/dwg-worker.js`)가 파싱 + 도형 펴기(블록·치수 블록 전개, MTEXT 서식코드 제거)까지 하고 선 묶음·글자 목록만 돌려준다. 본체는 도면틀 찾기(`dwRects` — 닫힌 네모 + **선 4개로 된 틀**)와 덩어리 나누기(`dwClusters`), 미리보기·인쇄를 맡는다.
  ⚠ 글자는 도형과 **같은 좌표계(y 위로)** 로 적는다 — `-y` 로 적으면 바깥 그룹의 뒤집기와 겹쳐 위아래가 뒤집힌다(815차에 그 버그를 겪었다).
  816차: 카드는 「도면 파일 / 기준(분리 자동·도면틀·오브젝트 + 용지 A4·A3) / 목록」. 용지는 A4·A3 만. 미리보기 세로 막대는 사진대지와 같은 방식(`dwSbSync`/`dwSbFlash`, 구를 때만). 817차: 바는 「미리보기 ◀ n / 전체 ▶」(쪽 이동을 제목 옆에), 왼쪽은 파일 이름·도형/글자 수·못 그린 것만 적는다(읽기 시간은 빼고 토스트에도 안 적는다), 초기화 단추.
  818차(외부 검토 반영): ⚠ **용지·방향은 인쇄 한 번에 하나**로 고정한다(`dwPaperMM()` 은 인자를 받지 않는다) — 장마다 다르면 브라우저가 첫 장 기준으로 찍어 나머지가 어긋난다. 자동이면 장들의 가로/세로를 세어 많은 쪽. 도면은 그 용지 안에 비율 그대로(contain).
  선 굵기·선종류는 워커가 «엔티티 → 레이어 → 기본 0.25mm» 로 물려받아 `styles[]` 로 넘기고, 쪽 SVG 안에 `polyline.sN{stroke-width…;stroke-dasharray…}` 로 붙는다(⚠ 바깥 `.dw-svg polyline` 과 명시도를 맞춰야 이긴다). 「선 / 반영·일정」 으로 끌 수 있다. 색상은 아직 흑백 고정.
  844차 도면틀 찾기 다시 씀: ⚠ 크기 문턱을 「도면 전체의 몇 %」로 두면 **한 장에 작은 틀이 여럿인 시트**(전개도 모음)를 통째로 놓친다(청라55A형은 가장 큰 네모가 전체의 0.04%). 이제 문턱은 후보들끼리 견주어 정한다(가장 큰 것의 2% 이상 · 안에 도형 6개 이상 · 가로세로 비 8 이하 · 각 변이 전체의 1% 이상).
  ⚠ 892차(실파일 A03-001 단위세대평면도, 13장이 한 장으로 나왔다): ① 선 네 개 틀 찾기가 **선분 하나짜리 폴리선**만 봤는데 이 도면은 네 변이 **여러 마디 폴리선 안의 한 구간**이었다 → **한 장도 못 찾았을 때만** 폴리선 구간까지 넓혀 다시 찾는다(늘 넓히면 청라 35개·a1 20개처럼 가짜 변이 쏟아진다). ② 위쪽 다섯 장은 세로 테두리를 **통으로** 그어 그 큰 네모가 안쪽 틀을 삼켰다 → 되풀이 크기(3% 안) 틀을 **넷 이상** 품고 그 틀들이 넓이의 **60% 이상**을 채우면 껍데기로 보고 버린다. 시험 `qc/e892.mjs`(A03 13 · 청라 22 · a1 2).
  선 네 개짜리 틀도 다시 썼다 — 예전 O(n⁴)(긴 선 40개씩 네 겹)에서 **같은 x 구간을 덮는 가로선 짝 + 양끝 세로선** 확인으로 바꿔 작은 틀도 잡는다.
  자동일 때 틀이 30개를 넘으면 오검출로 보고 덩어리로 간다(「도면틀」을 직접 고르면 그대로 쓴다).
  실측: 480KB 0.6초 · 1.3MB 2.0초 · 3.4MB 2.2초. 못 그리는 것: POINT · SPLINE · VIEWPORT · 선굵기/선종류/해치 무늬.

### 1060차 — 앱 전체 모션 일관화(사용자: 제안 1~7 모두)
- 시간 표본(데스크톱·폰·위젯): 탭 전환 판 translateX 14→0·불투명 0→1 이 0.3초 안(주간↔현장별은 방향 반대로 ±14 확인) · 달 넘김 ±14 · 일자 목록 6px .22s · 삭제 카드 높이 51→0 .3초 · 하자 사이드바 권역 FLIP · 우클릭 메뉴·필터 목록 scale .96→1 · 폰 달 넘김은 격자 슬라이드 없음. 계정 흐름 시험·정적 감사 0·0·전체 브라우저 시험 PASS. 하자 탭·지도 목록 탭·날짜 트리는 로컬 자료가 없어 표본 못 냄(같은 도우미 경로).

### 1059차 — 명부 담당 현장 칩 무몰딩(사용자)
- 정적 감사 0·0, 전체 시험 PASS.

### 1058차 — 명부 무몰딩 · 네모 팝업 · 계정 창 모션(사용자)
- 창 높이 표본(데스크톱·폰): 편집 189→428 · 배경색 430→351 · 완료 351→189 · 비밀번호 189→331 모두 0.4초 안에 부드럽게. 계정 흐름 36항목·정적 감사 0·0·전체 시험 PASS.

### 1057차 — 떠 있는 창 통일(사용자 수용)
- 휴지통·휴무일·확인창·계정·메뉴 세 화면 캡처 확인. 계정 흐름 시험·정적 감사 0·0·전체 시험 PASS.

### 1056차 — 폰 페이지 머리 밑 페이드 제거(사용자)
- 화면 전체가 구르는 폰 페이지 8종만 위 페이드 끔. 정적 감사 0·0, 전체 시험 PASS. 실기기 미확인.

### 1055차 — 계정 창 버그 재점검(사용자)
- 찾은 것 4건(최근색 삭제 미저장 · 로그아웃 취소 시 창 닫힘 · 이름 칸 글꼴 늦게 올 때 폭 · 좁은 위젯 소속 줄 끊김) 수정. 계정 흐름 시험 세 화면 36항목·정적 감사 0·0·전체 시험 PASS. 실제 Firebase·iOS 실기기 미확인.

### 1054차 — 계정 창 손질(사용자)
- 배지 간격 8px(데스크톱·폰·위젯) · 직접 고른 색 12개 넣어도 저장 10 · 칩 30 · 세 줄 · 계정 흐름 시험 세 화면 전부 통과. 정적 감사 0·0, 전체 시험 PASS.

### 1053차 — 계정 창 개편(사용자 시안 P3·E4) · 앱 안 색 고르기 · 파스텔 팔레트
- 시안 흐름: B(머리띠) → C/E → T1~T3 → SNS S1·S2 → 유리 캡슐 F1·F2(숫자 캡슐 뺌) → G·H·K(빛 과함·레퍼런스) → F2 하단 → 현장 뺌 → P3(로그아웃 아이콘) → 아바타 판 E1/E2 → E3 → E4(✓ 둥근 단추·흐름 재생 원·정렬) → 직접 고르기. 고위험 막대 아이콘 빨강은 기각.
- 확인(데스크톱·폰·위젯 각 25항목, 전부 통과): 열기 모양 · 닫기 정렬(오른쪽 ±1 · 이름 줄 ±3) · 아바타 → 편집 · 이모지 반영 · 배경색 10칸 · 파스텔 → 아이콘 어두운 선 · 「+」 → 앱 안 판(대화상자 안 뜸) · 네모 끌기·색 코드 입력 반영 · ‹ 뒤 새 색 칩 선택 · 그라디언트 첫 끝 → gc-22c55e-… · 흐름 켬/끔(gf-/gc-) · 직접 고르기 중 탭 전환 → 판 닫힘 · ✓ 복귀 · 이름 칸 폭 81(한글 3자) · 저장 · 비밀번호 판 오가기 · 비밀번호 판에서 이름 유지 · 로그아웃 확인창에 acx 안 남음 · 다시 열면 평소 모양 · 다른 창에 클래스 안 남음. 파스텔 담당자 막대 12개 모두 on-light(글자 #1B1B1F). 정적 감사 0·0, 전체 시험 PASS. 실제 Firebase 저장·iOS 실기기는 미확인.

### 1052차 — 디자인 점검 반영(사용자 선택)
- 미리보기 7건 중 1(공통 막대 말줄임)·2(생산성 선택칸)·3(재하자 세그만)·4(하자 빈 상태 틀) 수용, 5는 D+60 빈 줄 꼬리만 삭제, 6(안내 문구 삭제)·7(사진대지 폴더 무몰딩) 기각. 확인: 데스크톱·폰·위젯 캡처, 공통 막대 넘침 제목 전부 text-overflow ellipsis, 하자 빈 판 아래 끝 = 도구 판(874/900) · 폰 759/844(탭 위). 고위험 막대는 시험 데이터에 없어 화면 미확인. 정적 감사 0·0, 전체 시험 PASS.

### 1051차 — 업무 링크 아이콘 통일(사용자)
- 업무 일정·업무 현황 읽기 카드의 링크 아이콘 i-ext → i-lnk(작성 폼 칩과 같은 사슬 모양). 확인: 데스크톱 일자 패널 카드 캡처, 정적 감사 0·0, 스모크 PASS.

### 1050차 — 위젯 부팅 스켈레톤(사용자 시안 A)
- 미리보기 A(뼈대+카드)·B(뼈대+로고만) 중 A. 확인: 부팅 로딩 460·360 캡처, 폼 전환 시 뼈대 걷힘, 데스크톱·폰 영향 없음. 정적 감사 0·0, 전체 시험 PASS. 실제 WebView2 투명 창 위 모습은 미확인.

### 1049차 — 위젯 로그인 창 가운데 · 인증 뒤 서버 지연 때 폼 번쩍임(사용자)
- 확인: 위젯 460·360 로그인 폼 위아래 여백 같음(202/202·72/72), 데스크톱·폰 폼 자리 그대로. 안내 줄은 위젯·데스크톱·폰 강제 상태로 캡처. 정적 감사 0·0, 전체 시험 PASS. 실제 Firebase 지연은 미재현.

### 1048차 — 폰 메뉴 시트 첫 탭 빗나감(사용자)
- 재현(CDP 터치): 메뉴 연 뒤 0.1~0.2초에 「설정」 → touchstart 는 설정, click 은 「홈 화면에 추가」. 수정 후 0.2초부터 매번 설정. 정적 감사 0·0, 전체 시험 PASS. 실기기(iOS) 미확인.

### 1047차 — 크리스마스 줄무늬 이웃 달 번짐(사용자)
- 확인: 폰 390 에서 12월 기준 세 판의 공통 막대 — 1046 은 11·12·1월 모두 줄무늬, 1047 은 12월 판만. 정적 감사 0·0, 전체 시험 PASS. 실기기 스와이프는 미확인.

### 1046차 — 옛 업무 수정 시 순서 튐(사용자)
- 재현: createdAt 없는 옛 업무 + 있는 업무 2건 같은 날 → 옛 업무 제목 수정 뒤 일자 목록·달력 칸 맨 아래로(1045). 수정 후 고침·상태 변경 모두 순서 유지. 새 업무 작성 경로(데스크톱·위젯 3건 연속 작성·수정)는 순서 정상. 정적 감사 0·0, 전체 시험 PASS.

### 1045차 — 위젯 사용성 2차 검토(6건)
- 코드 검토+실제 키·마우스 탐침: 찾기 Esc 뒤 숨은 입력 초점으로 위젯 멈춤, 아침 확인 닫을 때 이미 옮긴 업무 보류, 보통 속도 클릭 닫기 뒤 미룬 반영 누락, 끊긴 동안 자동 새로고침, 창 크기 변경 시 팝업 자리, 자정 뒤 알림창 오늘/어제. 확인: 탐침 재실행 모두 정상, widget-layers 4항목 추가(1044 코드 4건 실패), 정적 감사 0·0, 전체 시험 PASS. 끊김 중 새로고침 막기는 코드 확인만. 실제 WebView2 미확인.

### 1044차 — 열린 창 관리 통합(LAYERS) · 위젯 겹침·닫기 시험
- 사용자: 버그가 끝없이 나온다 → 원인(닫기 경로 5곳 분산·조합 시험 없음) 설명, 두 가지 미리보기 후 승인. 시험을 먼저 만들어 1043 코드에서 PASS → 층 목록으로 교체 → 같은 시험 PASS(바뀐 동작 없음). 확인: 시험 72항목, 1043 수정 되돌린 코드에서 6건 실패 검출, 정적 감사 0·0, 전체 시험 PASS. 실제 WebView2 위젯·실기기 미확인.

### 1043차 — 위젯 실사용 버그 7건
- 자동 점검(460×820·360×560 실제 마우스)에서 360폭 팝업 넘침 1건, 코드 검토에서 편집기 잔류·알림창 옛 목록·말풍선 겹침/안 접힘·아침 확인 1회뿐·이동 중 새로고침·Esc 순서·←→ 6건. 확인: 위젯 탐침으로 #mo 중 ←→ 막힘·Esc 가 #mo 먼저·말풍선 #mo 중 보류→닫힌 뒤 표시→10초 뒤 접힘·이동 중 verIdle=false. 날 넘김 아침 확인은 코드 확인만. 정적 감사 0·0, 전체 시험 PASS. 실제 WebView2 위젯 미확인.

### 1042차 — 폰 고르기 시트 · iOS 키보드 뒤따르기(사용자 캡처)
- 확인: 폰 에뮬레이션 날짜 시트→수정→현장 칩 탭 → 고르기 시트(제목 「현장」·9줄·지금 값 ✓·줄 폭 348=판 폭), 여는 움직임 ≈0.55s·닫힘 녹화, 고른 값이 select·폼에 들어감. 정적 감사 0·0, 전체 시험 PASS. iOS 키보드 위치는 실기기에서만 확인 가능.

### 1041차 — +·닫기 크기 전 환경 통일(사용자)
- 실측 전: + 데스크톱 23×30/13·위젯 31×30/13·폰 36/20, 닫기 24~30/13~17 제각각. 후: + 32/20(폰 36), 닫기 32/20(폰 36). 머리 줄 캡처(데스크톱·폰·위젯의 날짜 머리·찾기·창)로 줄맞춤 확인. 정적 감사 0·0, 전체 시험 PASS.

### 1040차 — 위젯 팝업 불투명도·제목(사용자)
- 확인: 위젯 팝업 5종 머리 캡처(제목 크기·닫기 단추 줄맞춤), 정적 감사 0·0, 전체 시험 PASS. 실제 위젯 흐림 위 가독성은 사용자 확인 몫.

### 1039차 — 위젯 필터 팝업 구성 통일(사용자)
- 확인: 데스크톱·위젯(460) 계산값 비교 — 머리 flex·아래 줄 none·폭 306·여백 11·모서리 18·단추 34/17/13/600·간격 6 동일, 위젯 왼쪽 9px. 정적 감사 0·0, 전체 시험 PASS.

### 1038차 — 로그인 배경·위젯 머리 단추(사용자)
- 확인: 로그인 화면 데스크톱 1440·폰 390 캡처(데스크톱은 오른쪽 절반을 로그인 카드가 덮어 왼쪽 봉우리만 온전히 보인다 — cover 라 가로 위치로는 못 옮김), 정적 감사 0·0, 전체 시험 PASS.

### 1037차 — 데스크톱 유리 카드·필터 단추·알림(사용자)
- 누락 인정: 1035·1036 에서 폰(≤960)·위젯 구획에만 넣고 데스크톱 적용 여부를 말하지 않았다.
- 확인: 데스크톱 1440 전후 캡처(달력 필터·업무 현황 필터·연·월·메뉴·찾기·알림·새 업무 팝업), 정적 감사 0·0, 전체 시험 PASS.

### 1036차 — 위젯 유리 카드·캡슐·모션·확인창(사용자)
- 함정: `body.wid.glass .cal-head .cal-nav,body.wid.glass .cal-move{border-radius:3px}` 가 유리 모드에서 캡슐을 도로 각지게 덮었다 — 같이 고침.
- 확인: 위젯(glass=1, 배경 사진 흉내) 전후 캡처, 팝업 4종 열림 ≈230ms·닫힘 ≈140ms 프레임 녹화, 정적 감사 0·0, 전체 시험 PASS. 실제 위젯(WebView2 투명 창)에서의 흐림·다시 그리기는 미확인.

### 1035차 — 폰 필터·새 업무 시트·알림 캡슐(사용자)
- 확인: 폰 에뮬레이션 캡처(필터 두 곳·새 업무 시트·키보드 흉내 300px·닫힘 중·알림), 실제 필터 걸기→「초기화」 켜짐→눌러 풀림(달력·업무 현황), 데스크톱 필터는 머리 숨김·「모두 해제」 줄 그대로. 정적 감사 0·0, 전체 시험 PASS. 위젯 적용안은 미리보기만(미결).

### 1034차 — 모션·깜빡임·흐름(사용자)
- 녹화: CDP screencast 폰 30·데스크톱 27 동작, 프레임 차이로 A→B→A·2프레임 깜빡임 판정(0건) + 캡처 판독. 원인 찾기: 첫 진입 A 와 전환 뒤 B 의 조상 계산 스타일 전부 비교 → `#content` mask-image 만 달랐다.
- 확인: 도구띠 첫 진입 elementsFromPoint 로 보임, 남은 페이드 0(전 화면), 연·월 팝업 바깥 탭 → 시트 안 열림, 삭제 흐름 캡처, 데스크톱 캘린더 진입 빈 프레임 없음. 정적 감사 0·0, 전체 시험 PASS.

### 1033차 — 배포 전 버그 정리(사용자)
- 자동 점검 스크립트의 오탐 두 가지 기록: 업무 id 를 사람마다 같게 만들면 `tkCycleItems` 의 seen(iid) 중복 거름에 걸려 한 사람만 보인다(실데이터는 id 고유) · 부드러운 스크롤(scroll-behavior:smooth) 칸은 scrollTop 을 넣고 바로 읽으면 0.
- 확인: 연·월 팝업 닫는 중 position absolute 유지·곧바로 다시 열림, Y 편집 중 X 삭제 → Y 폼·편집 유지, 쓰던 새 업무 폼에서 하단 탭 → 묻는 창·화면·폼 유지. 정적 감사 0·0, 전체 시험 PASS.

### 1032차 — 홈 화면에 추가 · 카카오톡 안내(사용자)
- 카카오톡 안내는 한 번 닫으면 안 뜨게(사용자 결정). 미리보기의 위 띠는 고정 머리 요소들과 겹칠 위험이 있어 하단 탭 위 카드 자리로.
- 확인: 폰 에뮬레이션 UA 별(아이폰 사파리·카카오톡·안드로이드 크롬) 카드·시트 캡처, 닫은 뒤 다시 안 뜸, 홈 화면 앱 흉내(standalone)에선 카드·메뉴 줄 없음, 정적 감사 0·0, 전체 시험 PASS. 실기기(카카오톡 외부 열기·안드로이드 설치 창) 미확인.

### 1031차 — 업무 현황 끝까지 굴려도 마지막 업무가 탭 밑(사용자)
- 원인·수정은 HANDOFF 1031.
- 확인: 폰 에뮬레이션 390×560·844, 업무 30건 끝까지 굴린 뒤 마지막 줄 아래끝 548→460(탭 위 492), 현장별 532→460. 정적 감사 0·0, 전체 시험 PASS.

### 1030차 — 폰 달력 이웃 달 막대 흐림 제거(사용자)
- 데스크톱·위젯과 같게 숫자만 흐림. 1029차 mask 코드 삭제.
- 확인: 폰 에뮬레이션 그라디언트·단색 캡처(8월말~9월초·월말 넘김), 정적 감사 0·0, 전체 시험 PASS.

### 1029차 — 위젯 현장명 · 그라디언트 기간 막대(사용자)
- 폭 오차·조각별 그라디언트·이웃 달 흐림 세 가지를 고침(HANDOFF 1029).
- 확인: 폰 에뮬레이션 그라디언트·무지개 계정 막대 전후 캡처(주 넘김·달 넘김·「+N」 끊김), 단색 막대 캡처 불변, 정적 감사 0·0, 전체 시험 PASS.

### 1028차 — 캐시 축소 · 폰 기간 막대 제목 · 카드 현장명 HS/TH(사용자)
- 외부 리뷰 검토 결과 4순위(로컬 캐시)만 수용: accounts 를 이름·색·아이콘·역할로. 1·2순위(전체 구독·보관함)는 운영 DB 용량 확인 후 판단, 3순위(D+60 서식 권한)는 953·1012차 결정대로 유지.
- 폰 달력 `.mc-d:has(.mc-bars.hd)` 가 모두 z 2 라 이웃한 머리 칸끼리 뒤 칸이 앞 칸 제목을 덮음 → nth-child(7n+k) 로 앞 열이 위.
- 확인: 폰 에뮬레이션 전후 캡처(9/13 주 「2주 넘는 긴 업무」 제목), 정적 감사 0·0, 전체 시험 PASS.

### 1027차 — 빈 화면 단추 광학 정렬(사용자)
- 글자 덩어리 가운데를 문장 가운데에. 폼 하단 저장 단추 기각.
- 확인: 글자·문장 가운데 좌표 실측(194 vs 193.5), 전후 캡처, 정적 감사 0·0, 전체 시험 PASS.

### 1026차 — 토스 원칙 적용(사용자)
- 되돌릴 수 있는 삭제 확인창 제거(바로 휴지통 + 되돌리기), 빈 목록 다음 행동 단추, 하자 불러오기 스켈레톤, 알림 문구 틀 통일.
- 확인: 폰·데스크톱 삭제→알림→되돌리기 왕복, 빈 날 단추·스켈레톤 캡처, 정적 감사 0·0, 전체 시험 PASS.

### 1025차 — 폰 + 단추 키움(사용자)
- 아이콘 17~20px · 누르는 곳 30~36px.
- 확인: 폰 에뮬레이션 크기 실측·전후 캡처(머리 줄 위치 불변), 정적 감사 0·0, 전체 시험 PASS.

### 1024차 — 하단 탭 늘 보이기(사용자)
- 탭 숨김을 「초점」이 아니라 「키보드가 실제로 떴을 때」로. 검색·새 업무 폼 판을 탭 아래로, 탭 누르면 먼저 닫기.
- 확인: 폰 에뮬레이션 상태별 탭 칸 5개 elementFromPoint(새 업무·키보드 흉내·키보드 내림·검색·계정·업무 현황 폼·확인창), 정적 감사 0·0, 전체 시험 PASS.

### 1023차 — 계정 시트가 하단 탭을 가리지 않게(사용자)
- 큰 창 시트를 탭 위 떠 있는 카드로, 탭 누르면 창 닫고 이동.
- 확인: 폰 캡처, 탭 누름 → 창 닫힘·화면 이동, 잡이 닫힘, 창 위치 추적, 정적 감사 0·0, 전체 시험 PASS.

### 1022차 — 폰 시트 X → 잡이(사용자)
- 큰 창 시트·메뉴/도구/현장 시트에 누르면 닫히는 잡이, X 숨김. #mss 곡선 통일. 앱 주석 회차 재유입 제거 + 감사 10c.
- 확인: 폰 에뮬레이션 잡이 누름 닫힘·캡처, 정적 감사 0·0, 전체 시험 PASS.

### 1021차 — 끌어 닫기·차례 등장·눌림 속도·알림·닫기 단추 정렬(사용자)
- 업무 시트 끌 때 달력 동행·속도 비례 닫힘, 큰 창 시트 끌어 닫기, 카드 차례 등장, 눌림 들어감/돌아옴 분리, 알림 멈춤·밀어 치우기, X 정렬.
- 확인: 폰 에뮬레이션 터치 끌기(시트·달력 좌표·창 변형·배경 알파), 알림 6초 누름 유지·밀기, X·제목 중심 좌표 실측(데스크톱·폰), 정적 감사 0·0, 전체 시험 PASS.

### 1020차 — 폰 계정 창 소속 한 줄(사용자)
- 팀·권역·직급을 폰에서도 한 줄로.
- 확인: 390·360 폭 캡처, 정적 감사 0·0, 전체 시험 PASS.

### 1019차 — 폰 앱 다듬기(사용자)
- 탭 강조·오버스크롤·길게 누름 선택 막기, 눌림 반응, 화면 전환 빈 프레임 제거, 기존 업무 열 때 키보드 자동 제거, 삭제 접힘, 드롭다운·월 선택·필터 닫힘 모션, 큰 창 아래 시트, 시트·달력 동시 복귀.
- 확인: 폰 에뮬레이션 29개 동작 프레임 녹화 전후, 시트·달력 좌표 프레임별, 모달 위치 추적(폰·데스크톱), 눌림 계산 스타일, 정적 감사 0·0, 전체 시험 PASS. 실기기 미확인.

### 1018차 — 기간 막대 끊김·제목 넘침 · 계정 탭 모션 · 시트 곡선(사용자)
- 넘친 칸에서 빠진 기간 막대를 보이는 구간으로 다시 셈. 계정 창 탭 미끄럼. 폰 업무 시트 열기/닫기 감속 곡선.
- 확인: 폰 에뮬레이션 전후 캡처(넘친 칸 사이 기간 막대), 계정 탭 표시 좌표 프레임별 이동, 정적 감사 0·0, 전체 시험 PASS.

### 1017차 — 모바일 4건(사용자)
- 현장 탭 줄 가로 스크롤 튐, 6주 달 막대 넘침, iOS 입력 초점 확대, 키보드 위 드롭다운 위치.
- 확인: 폰 에뮬레이션 재현 전후(탭 scrollLeft·막대 끝 좌표·메뉴 좌표·iOS UA viewport), 정적 감사 0·0, 전체 시험 PASS. 실기기 미확인.

### 1016차 — 달력 테두리 규칙 살림 · 하자 상태 색 E안(사용자)
- 안 닫힌 주석에 묻혀 있던 #fcal 규칙 복구 + 정적 감사 검사 추가. 미처리 중립(--lbl) · 장기미처리 차트 빨강(--ch-d60h).
- 확인: 달력 전후 캡처(데스크톱 테두리만 차이·폰 0), 색 시안 캡처, 정적 감사 0·0, 전체 시험 PASS.

### 1015차 — 미처리 색 · 주석 회차 제거 · 남은 정리(사용자)
- 미처리 색을 추이 차트 하늘(--ch-d0)로. 앱 주석의 회차 표기 전부 제거. denyTask 문구·죽은 CSS·회전 분기 정리. 달력 #fcal 규칙이 안 닫힌 주석에 묻혀 있던 것 발견(미수정).
- 확인: 주석 걷은 코드 전후 동일(엑셀 XML 주석 2곳만 의도한 차이), 캡처, 정적 감사 0·0, 전체 시험 PASS.

### 1014차 — 주석 간소화 · Firebase 12 · 미리보기 4건 · 상태 색 · 스크롤 막대(사용자)
- 주석 약 23~27% 축소·어긋난 주석 정정, Firebase 12.19.0, 하자 상태 색 파랑/하늘/빨강 토큰, 공가 스트립 넘침·ovs 끌기 회귀·민원 표 막대 잘림 수정, 현장 탭 흰 알약·점선 빈 상태·확인창 데스크톱 C안·D+60 데스크톱 상태 세그.
- 확인: 주석 걷은 코드 전후 동일, 막대 표시 캡처(브라우저 막대 켜고)·넘침 실측·끌기 시험, 데스크톱·폰 캡처, 정적 감사 0·0, 전체 시험 PASS. 실서버 Firebase 로그인은 미확인.

### 1013차 — 점검 결과 2차분: 데드코드·중복·감사·최신화·UI 통일(사용자)
- 죽은 코드·아이콘·CSS 선언 137 제거, 헬퍼 통합(pad·mDays·dlBlob·copyText·loadScriptOnce·pgIndi 등), 정적 감사 주석 제외·상수·아이콘·@media, Actions v7·Cargo.lock·문서, 상태 색·증감 방향·폰 카드·빈 값·버튼 위계 등 UI 통일, 추이 축 제목 위로.
- 확인: 계산 스타일 전후 대조(데스크톱·폰·인쇄·위젯 차이 0), 화면 캡처, 정적 감사 0·0, 규칙 시험, 전체 시험 PASS.

### 1012차 — 점검 결과 1차분: 회귀 2·보안·재현 버그·성능(사용자)
- 도넛 범례·민원 전월 회귀 수정. D+60 사진 주입 차단·DOMPurify 3.4.16·옛 plans 규칙·프로필 색·스냅샷 CSP·부팅 캐시 uid·D+60 규칙·전화번호 가리기·위젯 업데이트 고정+해시·복호 제한. 반복 토글 휴지통 사본·엑셀 날짜·KST·자정·반복 종료일·스냅샷 차트. 부팅 3중 렌더·차트 분할.
- 확인: 재현 스크립트 전후, 규칙 시험 AUTH-15~18, 스냅샷 실제 내려받아 열기, 위젯 cargo check, 부팅 측정, 정적 감사 0·0, 전체 시험 PASS.

### 1011차 — 탭 모션 정숙 · D+60 전환 깜빡 · 사이드바 달력 덜그덕(사용자)
- 탭 표시 튕김 제거·짧게. D+60 점검/서식 전환을 공통 미끄럼 엔진으로, 유령 알약 깜빡 수정. 사이드바 전환 동안 달력 표·여러 날 막대가 폭을 따라가게.
- 확인: 탭별 애니메이션 목록, D+60 전환 녹화 프레임, 합성 세그먼트 전후 비교, 사이드바 전환 프레임별 칸 폭·막대 비율·녹화, 정적 감사 0·0, 전체 시험 PASS.

### 1010차 — 그려진 뒤 커지는 덜컥 전수 확인(사용자)
- 전월대비 카드·도넛 범례·대시보드 월별/현장별 표를 첫 그리기에 함께 채움. 조직 지도 자리표시를 지도 높이로.
- 확인: 하자 가상 데이터·로컬 시드·위젯으로 두 폭 높이/layout-shift 전수 측정(D+60·사진·품질·도면·재하자·생산은 빈 상태만), 정적 감사 0·0, 전체 시험 PASS.

### 1009차 — 하자 카드 제목 테두리 · 처리계획 칸 덜컥(사용자)
- 게시 단계 목록 클래스(.st)가 하자 카드 제목·표 칸에 번지던 것 → .pb-st. 처리계획 칸 높이를 그리기 전에 맞춤.
- 확인: 하자 가상 데이터 + 여러 줄 처리계획으로 높이 실측, 정적 감사 0·0, 전체 시험 PASS.

### 1008차 — 민원 현황 카드 덜컥 · 세대 표 세로 막대(사용자)
- 민원 세대 현황 카드를 처음부터 같은 높이로 그리고 전월 값을 기억. 세대 표는 데스크톱에서 표만 세로로 구르고 막대는 카드 밖(잡아 끌기).
- 확인: 하자 가상 데이터로 카드 높이·layout-shift 실측, 막대 위치(카드 오른쪽 밖 4~12px)·붙박이 머리 캡처, 정적 감사 0·0, 전체 시험 PASS.

### 1007차 — 하자 현장 탭 전환 덜컥거림(사용자)
- 탭 표시를 먼저 움직이고 무거운 다시 그리기는 뒤로. 표시가 되돌아갔다 다시 가던 것 해결. 카드 막대·처리계획 칸 높이의 레이아웃 반복 계산 제거.
- 확인: 하자 가상 데이터 + CPU 6배 느리게로 전후 측정·프레임 확인, 정적 감사 0·0, 전체 시험 PASS.

### 1006차 — 걸린 필터 칩을 머리 오른쪽으로(사용자)
- 데스크톱: 필터 단추 왼쪽에 붙여 오른쪽 정렬, 높이 34. 자리가 모자라면 예전 아래 줄로. 폰·위젯은 그대로.
- 확인: 정적 감사 0·0, 전체 시험 PASS, 1440·1100·폰 전환·모두 해제 캡처.

### 1005차 — 위젯 내 업무 머리 · 데스크톱 권역 칩(사용자)
- 위젯 「내 업무」 창 제목이 오른쪽 위에 떠 목록과 겹치던 것 수정(970차 규칙이 번짐).
- 데스크톱 달력 년월(·오늘) 옆에 권역 칩을 모두 꺼내 둠 — 켜고 끄기, 필터 팝업 권역과 같은 값. 데스크톱 칩 줄·필터 개수에선 권역 제외.
- 확인: 정적 감사 0·0, 전체 시험 PASS, 칩 켜기·끄기·여럿·팝업 동기·다른 달·1100px 캡처, 위젯 내 업무 캡처.

### 1004차 — 위젯 필터·찾기 팝업 겹침(사용자)
- 필터를 연 채 찾기를 누르면 필터가 닫히지 않던 것 수정. 위젯 팝업 단추 12조합 확인.

### 1003차 — 로그인 이름 흰색 · 위젯 락업 크기 · 폰 점 위치(사용자)
- 데스크톱 로그인 화면 머리줄 이름 흰색. 위젯 로딩 락업을 기본 크기(22·16)로. 폰 로딩 점을 로고 바로 아래(간격 12)로.
- 확인: 정적 감사 0·0, 전체 시험 PASS, 폰·위젯·데스크톱 캡처와 위치 실측(점 가운데 = 락업 가운데).

### 1002차 — 위젯 점 · 배경화면 위 그림자(사용자)
- 로딩 점 6px 을 위젯까지. 배경화면 위 로고(데스크톱·폰)와 폰 로딩 점에 옅은 그림자.
- 확인: 정적 감사 0·0, 전체 시험 PASS, 데스크톱·폰·위젯 캡처.

### 1001차 — 로딩 뼈대(시안 B) · 점 키우기 · 배경화면 교체(사용자)
- 데스크톱 자동 로그인 대기 화면: 오른쪽 판에 옅은 달력 뼈대(숨쉬기) + 가운데 점. 폰은 그대로.
- 로딩 점 4→6px(데스크톱·폰).
- 배경화면을 사용자 원본 jpg(2560×1440)로 — 손대지 않고 그대로.
- 확인: 정적 감사 0·0, 전체 시험 PASS, 데스크톱(대기·진입·폼)·폰·위젯 대기 화면 캡처.

### 1000차 — 열 필터 아래 줄 · 메뉴 오른쪽 맞춤(사용자)
- 하자 목록 열 필터: 필터 해제(왼쪽 글자) · 적용(오른쪽 채움 칩).
- 칸이 화면 오른쪽 끝이면 메뉴를 칸 오른쪽 끝에 맞춘다.
- 확인: 하자 가상 데이터(e2e 방식)로 대시보드·현장 상세 연도, 기준월, 열 필터를 열고 값 변경까지. 정적 감사 0·0, 전체 시험 PASS.


## 999차 이전 기록
1289차에 파일 크기(1.48MB)를 줄이려고 999차 이전 회차 기록과 초기 설명(1~7.x 절)을 걷어냈다. 원문은 git 이력에 그대로 있다:
`git show a446e34:HANDOFF-log.md` (1288차 시점 전체본)
