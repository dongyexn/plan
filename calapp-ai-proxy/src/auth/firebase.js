/* CALAPP AI 중계 — 인증(700차)
   서비스 계정 없이 동작한다.
   ① Firebase ID 토큰: Google 공개키(JWKS)로 서명·iss·aud·exp 를 검증한다.
   ② 권한: RTDB REST 를 **사용자 본인의 토큰**으로 읽어 users/{uid}/role 을 본다 — 규칙(본인 레코드 read)이 곧 권한 소스.
   ③ App Check: 헤더가 있으면 Firebase App Check JWKS 로 검증. APPCHECK_MODE=hard 면 없거나 틀리면 거절, soft(기본) 면 기록만. */
const { createRemoteJWKSet, jwtVerify } = require('jose');

const PROJECT = process.env.FIREBASE_PROJECT_ID || 'report-c29a1';
const DB_URL = (process.env.FIREBASE_DB_URL || '').replace(/\/+$/, '');
const EMAIL_RE = /@hdec[.]co[.]kr$/i;

/* Google 은 ID 토큰 서명키를 JWKS 로도 낸다(x509 목록이 아니라). jose 가 캐시·회전(kid)을 처리한다 */
let ID_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
let AC_JWKS = createRemoteJWKSet(new URL('https://firebaseappcheck.googleapis.com/v1beta/jwks'));

class AuthError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

async function verifyIdToken(authHeader) {
  const m = /^Bearer\s+(.+)$/i.exec(String(authHeader || '').trim());
  if (!m) throw new AuthError(401, '로그인 토큰이 없습니다');
  let payload;
  try {
    ({ payload } = await jwtVerify(m[1], ID_JWKS, {
      issuer: 'https://securetoken.google.com/' + PROJECT,
      audience: PROJECT,
      algorithms: ['RS256'],
      clockTolerance: 60,
    }));
  } catch (e) {
    throw new AuthError(401, '토큰이 유효하지 않습니다 (' + (e.code || e.message) + ')');
  }
  const uid = String(payload.sub || payload.user_id || '');
  if (!uid) throw new AuthError(401, '토큰에 사용자가 없습니다');
  if (payload.email_verified !== true || !EMAIL_RE.test(String(payload.email || '')))
    throw new AuthError(403, '회사 계정만 쓸 수 있습니다');
  return { uid, email: String(payload.email), raw: m[1] };
}

/* users/{uid}/role — 본인 토큰으로 읽는다. 규칙이 막으면(권한 없음) null */
async function fetchRole(user) {
  if (!DB_URL) throw new AuthError(500, 'FIREBASE_DB_URL 이 없습니다');
  const r = await fetch(`${DB_URL}/users/${encodeURIComponent(user.uid)}/role.json?auth=${encodeURIComponent(user.raw)}`, { method: 'GET' });
  if (r.status === 401 || r.status === 403) return null;
  if (!r.ok) throw new AuthError(502, 'RTDB 권한 조회 실패 HTTP ' + r.status);
  const v = await r.json();
  return typeof v === 'string' ? v : null;
}

async function verifyAppCheck(header) {
  const mode = String(process.env.APPCHECK_MODE || 'hard').toLowerCase();   /* 703차: 기본 hard — 브라우저가 늘 토큰을 낸다(실환경 확인). soft 로 되돌리려면 환경변수 */
  const tok = String(header || '').trim();
  if (!tok) { if (mode === 'hard') throw new AuthError(401, 'App Check 토큰이 없습니다'); return { ok: false, reason: 'missing' }; }
  try {
    await jwtVerify(tok, AC_JWKS, {
      issuer: 'https://firebaseappcheck.googleapis.com/' + await projectNumber(),
      algorithms: ['RS256'],
      clockTolerance: 60,
    });
    return { ok: true };
  } catch (e) {
    if (mode === 'hard') throw new AuthError(401, 'App Check 검증 실패');
    return { ok: false, reason: e.code || e.message };
  }
}
/* App Check 의 iss 는 프로젝트 **번호** 를 쓴다. 환경변수 FIREBASE_PROJECT_NUMBER 가 없으면 iss 검증을 건너뛰지 않고 실패로 둔다(soft 면 기록) */
async function projectNumber() {
  return process.env.FIREBASE_PROJECT_NUMBER || '625677240502';   /* 703차: report-c29a1 의 프로젝트 번호(비밀 아님) — 환경변수가 있으면 그것 */
}

module.exports = { verifyIdToken, fetchRole, verifyAppCheck, AuthError,
  /* 단위 검사용 — 진짜 Google 키 대신 로컬 키를 꽂는다 */
  _setKeys(id, ac) { if (id) ID_JWKS = id; if (ac) AC_JWKS = ac; } };
