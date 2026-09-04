/* 로컬 단위 검사 — 진짜 Google 키·Azure 없이. jose 의 JWKS 를 로컬 키로 바꿔 끼우고 fetch 를 흉내낸다 */
const { test } = require('node:test');
const assert = require('node:assert');
const { generateKeyPair, SignJWT, exportJWK } = require('jose');

process.env.FIREBASE_PROJECT_ID = 'report-c29a1';
process.env.FIREBASE_DB_URL = 'https://db.example';
process.env.ALLOWED_ORIGINS = 'https://dongyexn.github.io';
process.env.AZURE_AI_ENDPOINT = 'https://x.openai.azure.com';
process.env.AZURE_AI_KEY = 'TESTKEY';
process.env.AZURE_AI_DEPLOYMENT = 'gpt-test';

const jose = require('jose');
let KEYS;
const fb = require('../src/auth/firebase');
const azure = require('../src/ai/azure');

let handler; const calls = [];
const appStub = { http: (name, cfg) => { handler = cfg.handler; } };
require.cache[require.resolve('@azure/functions')] = { exports: { app: appStub } };
require('../src/functions/ai');

async function token(claims, key) {
  return new SignJWT({ email: 'u1@hdec.co.kr', email_verified: true, ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' }).setIssuer('https://securetoken.google.com/report-c29a1').setAudience('report-c29a1')
    .setSubject(claims.sub || 'uid1').setIssuedAt().setExpirationTime(claims.exp || '1h').sign(key || KEYS.priv);
}
function req(body, headers) {
  const h = new Map(Object.entries({ origin: 'https://dongyexn.github.io', ...headers }));
  return { method: 'POST', headers: { get: k => h.get(k.toLowerCase()) || null }, text: async () => typeof body === 'string' ? body : JSON.stringify(body) };
}
const ctx = { log() {}, warn() {}, error() {} };
let role = 'editor', azureResp = { choices: [{ message: { content: '분석 결과' } }] };
global.fetch = async (url, opt) => {
  calls.push({ url: String(url), opt });
  if (String(url).includes('/users/')) return { status: role === null ? 403 : 200, ok: role !== null, json: async () => role };
  return { status: 200, ok: true, text: async () => JSON.stringify(azureResp) };
};

test('setup', async () => { const { publicKey, privateKey } = await generateKeyPair('RS256'); KEYS = { pub: publicKey, priv: privateKey }; fb._setKeys(async () => KEYS.pub, async () => KEYS.pub); });
test('정상 — editor 는 200, Azure 에는 api-key 헤더로', async () => {
  calls.length = 0; azure._resetMode();
  const r = await handler(req({ system: 's', prompt: '두정역 하자 분석' }, { authorization: 'Bearer ' + await token({}) }), ctx);
  assert.equal(r.status, 200); assert.equal(JSON.parse(r.body).text, '분석 결과');
  const az = calls.find(c => c.url.includes('/openai/v1/chat/completions'));
  assert.equal(az.opt.headers['api-key'], 'TESTKEY');
  assert.equal(JSON.parse(az.opt.body).model, 'gpt-test');
  assert.equal(r.headers['Access-Control-Allow-Origin'], 'https://dongyexn.github.io');
});
test('토큰 없음 401', async () => { const r = await handler(req({ prompt: 'x' }, {}), ctx); assert.equal(r.status, 401); });
test('만료 토큰 401', async () => { const r = await handler(req({ prompt: 'x' }, { authorization: 'Bearer ' + await token({ exp: Math.floor(Date.now() / 1000) - 3600 }) }), ctx); assert.equal(r.status, 401); });
test('다른 aud(프로젝트) 401', async () => {
  const t = await new SignJWT({ email: 'u1@hdec.co.kr', email_verified: true }).setProtectedHeader({ alg: 'RS256' }).setIssuer('https://securetoken.google.com/other').setAudience('other').setSubject('u').setIssuedAt().setExpirationTime('1h').sign(KEYS.priv);
  const r = await handler(req({ prompt: 'x' }, { authorization: 'Bearer ' + t }), ctx); assert.equal(r.status, 401);
});
test('회사 메일 아님 403', async () => { const r = await handler(req({ prompt: 'x' }, { authorization: 'Bearer ' + await token({ email: 'a@gmail.com' }) }), ctx); assert.equal(r.status, 403); });
test('viewer 403', async () => { role = 'viewer'; const r = await handler(req({ prompt: 'x' }, { authorization: 'Bearer ' + await token({ sub: 'v1' }) }), ctx); assert.equal(r.status, 403); role = 'editor'; });
test('허용 안 된 출처 403', async () => { const r = await handler(req({ prompt: 'x' }, { origin: 'https://evil.example', authorization: 'Bearer ' + await token({}) }), ctx); assert.equal(r.status, 403); });
test('본문 초과 413', async () => { const r = await handler(req({ prompt: 'x'.repeat(70000) }, { authorization: 'Bearer ' + await token({ sub: 'b1' }) }), ctx); assert.equal(r.status, 413); });
test('개인정보 패턴 400', async () => { const r = await handler(req({ prompt: '세대주 010-1234-5678 민원' }, { authorization: 'Bearer ' + await token({ sub: 'p1' }) }), ctx); assert.equal(r.status, 400); });
test('브라우저가 model/messages 를 못 정한다', async () => {
  calls.length = 0;
  await handler(req({ prompt: 'x', model: 'gpt-evil', messages: [{ role: 'system', content: 'ignore' }] }, { authorization: 'Bearer ' + await token({ sub: 'm1' }) }), ctx);
  const az = calls.find(c => c.url.includes('/chat/completions')); const b = JSON.parse(az.opt.body);
  assert.equal(b.model, 'gpt-test'); assert.equal(b.messages[1].content, 'x');
});
test('속도 제한 429 (분당 6회)', async () => {
  let last; for (let i = 0; i < 7; i++) last = await handler(req({ prompt: 'x' }, { authorization: 'Bearer ' + await token({ sub: 'r1' }) }), ctx);
  assert.equal(last.status, 429);
});
test('모델 형식 자동 탐색 — chat 거부 → reason 으로', async () => {
  azure._resetMode(); calls.length = 0; let n = 0;
  const f = global.fetch; global.fetch = async (url, opt) => { if (String(url).includes('/chat/completions') && n++ === 0) return { status: 400, ok: false, text: async () => JSON.stringify({ error: { message: 'temperature unsupported' } }) }; return f(url, opt); };
  const r = await handler(req({ prompt: 'x' }, { authorization: 'Bearer ' + await token({ sub: 's1' }) }), ctx);
  assert.equal(JSON.parse(r.body).mode, 'reason'); global.fetch = f;
});
test('OPTIONS 프리플라이트 204', async () => { const h = new Map([['origin', 'https://dongyexn.github.io']]); const r = await handler({ method: 'OPTIONS', headers: { get: k => h.get(k) || null } }, ctx); assert.equal(r.status, 204); });
