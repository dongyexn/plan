/* POST /api/ai — CALAPP AI 중계(700차)
   브라우저 → { system, prompt, max? }  (Authorization: Bearer <Firebase ID 토큰>, X-Firebase-AppCheck 선택)
   서버   → { text, mode }
   1) Origin 검사(CORS) 2) ID 토큰 검증 3) users/{uid}/role == 'editor' 4) 본문 검증·크기 제한 5) uid 별 속도 제한
   6) Azure AI 호출(키는 환경변수) 7) 결과 반환. 브라우저는 model·messages 를 못 정한다 — 서버가 만든다. */
const { app } = require('@azure/functions');
const { verifyIdToken, fetchRole, verifyAppCheck, AuthError } = require('../auth/firebase');
const azure = require('../ai/azure');

const MAX_BODY = 64 * 1024;          // 64KB — 하자 분석 입력(축약본)보다 넉넉
const MAX_SYSTEM = 8000, MAX_PROMPT = 48000, MAX_TOKENS = 8192;
const RATE = { n: 6, win: 60000 };   // uid 당 분당 6회 (인스턴스 메모리 — 최선책)
const _hits = new Map();

function origins() { return String(process.env.ALLOWED_ORIGINS || 'https://dongyexn.github.io').split(',').map(s => s.trim()).filter(Boolean); }
function corsHeaders(origin) {
  const ok = origins().includes(origin) || (/^http:\/\/localhost(:\d+)?$/.test(origin) && origins().some(o => o.startsWith('http://localhost')));
  return ok ? {
    'Access-Control-Allow-Origin': origin, 'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Firebase-AppCheck',
    'Access-Control-Max-Age': '600',
  } : null;
}
function json(status, body, extra) { return { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(extra || {}) }, body: JSON.stringify(body) }; }

function rateOk(uid) {
  const now = Date.now(), a = (_hits.get(uid) || []).filter(t => now - t < RATE.win);
  if (a.length >= RATE.n) { _hits.set(uid, a); return false; }
  a.push(now); _hits.set(uid, a); return true;
}

function parseBody(text) {
  if (text.length > MAX_BODY) throw new AuthError(413, '요청이 너무 큽니다');
  let b; try { b = JSON.parse(text); } catch (e) { throw new AuthError(400, 'JSON 이 아닙니다'); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) throw new AuthError(400, '본문 형식 오류');
  const system = String(b.system || ''), prompt = String(b.prompt || '');
  if (!prompt.trim()) throw new AuthError(400, 'prompt 가 비었습니다');
  if (system.length > MAX_SYSTEM || prompt.length > MAX_PROMPT) throw new AuthError(413, '입력이 너무 깁니다');
  let max = Number(b.max) || 4096; max = Math.max(256, Math.min(MAX_TOKENS, Math.floor(max)));
  /* 예상 밖 필드는 버린다 — messages/model/temperature 를 브라우저가 못 정한다 */
  return { system, prompt, max };
}

/* 주민번호·전화·이메일 원문이 섞여 오면 막는다(브라우저 마스킹의 2차 방어) */
const PII = [/\d{6}-[1-4]\d{6}/, /01[016789]-?\d{3,4}-?\d{4}/, /[A-Za-z0-9._%+-]+@(?!hdec\.co\.kr)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/];
function piiHit(s) { return PII.some(re => re.test(s)); }

app.http('ai', {
  methods: ['POST', 'OPTIONS'], authLevel: 'anonymous', route: 'ai',
  handler: async (req, ctx) => {
    const origin = req.headers.get('origin') || '';
    const cors = corsHeaders(origin);
    if (req.method === 'OPTIONS') return cors ? { status: 204, headers: cors } : { status: 403 };
    if (origin && !cors) return json(403, { error: '허용되지 않은 출처' });
    try {
      const user = await verifyIdToken(req.headers.get('authorization'));
      const ac = await verifyAppCheck(req.headers.get('x-firebase-appcheck'));
      if (!ac.ok) ctx.warn('[appcheck] ' + ac.reason + ' uid=' + user.uid);
      const role = await fetchRole(user);
      if (role !== 'editor') throw new AuthError(403, 'AI 분석은 관리자만 쓸 수 있습니다');
      if (!rateOk(user.uid)) throw new AuthError(429, '잠시 뒤 다시 시도하세요 (분당 ' + RATE.n + '회)');
      const body = parseBody(await req.text());
      if (piiHit(body.system) || piiHit(body.prompt)) throw new AuthError(400, '개인정보로 보이는 값이 섞여 있어 보낼 수 없습니다');
      const t0 = Date.now();
      const out = await azure.ask(body, ctx);
      ctx.log(`[ai] uid=${user.uid} mode=${out.mode} ms=${Date.now() - t0} in=${body.prompt.length}`);
      return json(200, { text: out.text, mode: out.mode }, cors || {});
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500) ctx.error('[ai] ' + (e.stack || e.message));
      return json(status, { error: e.message || '오류' }, cors || {});
    }
  },
});
