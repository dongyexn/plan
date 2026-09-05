# calapp-ai-proxy — CALAPP AI 중계 (700차)

브라우저가 Azure AI 키를 갖지 않도록, 하자 분석 AI 호출을 이 Function 이 대신 한다.
브라우저 → `POST /api/ai` (Authorization: Bearer <Firebase ID 토큰>) → Function(키는 환경변수) → Azure AI Foundry.

## 배포된 인스턴스
- 함수 앱 `calapp-ai-proxy` · 리소스 그룹 `rg-2314916-8017` · 사용량(Windows) · Node 22 · Korea Central
- URL `https://calapp-ai-proxy-hdaah3ccbqdcbzbt.koreacentral-01.azurewebsites.net`
- 앱에는 설정 → AI 연결 → 「중계 서버」 칸에 위 URL 을 넣는다(`aiConf.proxy`).

## 환경변수(포털 → 설정 → 환경 변수)
| 이름 | 값 |
|---|---|
| `AZURE_AI_ENDPOINT` | `https://<resource>.services.ai.azure.com` (앱 설정 화면의 엔드포인트 그대로) |
| `AZURE_AI_DEPLOYMENT` | 배포 이름 |
| `AZURE_AI_KEY` | **여기에만** — 코드·Firebase·브라우저 어디에도 넣지 않는다 |
| `FIREBASE_PROJECT_ID` | `report-c29a1` |
| `FIREBASE_DB_URL` | RTDB 주소 |
| `FIREBASE_PROJECT_NUMBER` | App Check 검증용. 없으면 코드 기본값 `625677240502`(report-c29a1) |
| `ALLOWED_ORIGINS` | `https://dongyexn.github.io` (쉼표로 추가) |
| `APPCHECK_MODE` | 기본 **`hard`**(703차: 토큰 없거나 틀리면 401). 급할 때 `soft` 로 내리면 기록만 |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` — zip 배포 뒤 Kudu 가 `npm install` |

## 인증·권한 (서비스 계정 없음)
1. ID 토큰: Google JWKS(`securetoken@system.gserviceaccount.com`)로 RS256·iss·aud·exp 검증, `email_verified` + `@hdec.co.kr`.
2. 권한: RTDB REST `users/{uid}/role.json?auth=<사용자 토큰>` — 규칙(본인 레코드 read)이 권한 소스. `editor` 만 통과.
3. App Check: `X-Firebase-AppCheck` 헤더를 App Check JWKS 로 검증(soft/hard).
4. 본문 64KB · prompt 48000자 · uid 당 분당 6회 · 개인정보 패턴(주민번호·휴대폰·외부 메일) 거절. 브라우저는 `system/prompt/max` 만 보내고 model·messages 는 서버가 만든다.

## 배포
- 소스 zip(host.json·package.json·package-lock.json·src) 을 Kudu `POST /api/zipdeploy?isAsync=true` 로 — 회사 SSO 로 Kudu(`…scm…azurewebsites.net`)에 들어간 브라우저에서 가능. 또는 `az functionapp deployment source config-zip -g rg-2314916-8017 -n calapp-ai-proxy --src <zip>`.
- 배포 뒤 Kudu 로그에 `npm install` 이 "aborted" 로 찍혀도 `node_modules/jose` 가 있으면 된 것(Kudu 래퍼 타임아웃). 없으면 Kudu `POST /api/command` 로 `npm install --omit=dev` 를 `site\wwwroot` 에서.
- 확인: 토큰 없이 `POST /api/ai` → `401 {"error":"로그인 토큰이 없습니다"}`.

## 로컬
`cp local.settings.json.example local.settings.json` 뒤 값 채우고 `func start`. 단위 검사 `npm test` (진짜 Google 키·Azure 없이 로컬 키로 14건).
