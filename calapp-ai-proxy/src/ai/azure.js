/* Azure AI Foundry 호출(700차) — app.js 5255~5330 의 AI_PROVIDERS.azure.ask 를 그대로 옮겼다.
   키·endpoint·deployment 는 환경변수에서만. 모델별 요청 형식(chat/reason/bare/legacy) 탐색도 여기서. */
const AZ_TIMEOUT = 170000;          // 브라우저 180초보다 짧게
const AZ_REASON_PAD = 16000;
let _mode = null;                   // 인스턴스가 살아 있는 동안 성공한 형식을 기억

function azBase(v) {
  let t = String(v || '').trim().replace(/\s+/g, '');
  if (!t) return '';
  if (!/^https?:\/\//i.test(t)) t = 'https://' + t;
  try { return new URL(t).origin; } catch (e) { return t.replace(/\/+$/, '').replace(/\/openai(\/.*)?$/, ''); }
}

function env() {
  const endpoint = azBase(process.env.AZURE_AI_ENDPOINT), key = process.env.AZURE_AI_KEY || '', dep = process.env.AZURE_AI_DEPLOYMENT || '';
  if (!endpoint || !key || !dep) throw Object.assign(new Error('서버에 AI 연결 정보가 없습니다 (AZURE_AI_ENDPOINT/KEY/DEPLOYMENT)'), { status: 500 });
  return { endpoint, key, dep };
}

async function ask({ system, prompt, max = 4096, temp = 0.4 }, log) {
  const { endpoint, key, dep } = env();
  const url = endpoint + '/openai/v1/chat/completions';
  const msgs = [{ role: 'system', content: system }, { role: 'user', content: prompt }];
  const shape = m => {
    const b = { model: dep, messages: msgs };
    if (m === 'reason') { b.max_completion_tokens = max + AZ_REASON_PAD; b.reasoning_effort = 'minimal'; }
    else if (m === 'bare') { b.max_completion_tokens = max + AZ_REASON_PAD; }
    else if (m === 'legacy') { b.max_tokens = max; b.temperature = temp; }
    else { b.max_completion_tokens = max; b.temperature = temp; }
    return b;
  };
  const once = async m => {
    const ac = new AbortController(); const tid = setTimeout(() => ac.abort(), AZ_TIMEOUT);
    let r;
    try { r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'api-key': key }, body: JSON.stringify(shape(m)), signal: ac.signal }); }
    catch (e) { throw Object.assign(new Error(ac.signal.aborted ? 'AI 응답이 3분 안에 오지 않았습니다' : 'AI 서버에 닿지 못했습니다'), { status: 504 }); }
    finally { clearTimeout(tid); }
    const body = await r.text();
    let d = null; try { d = JSON.parse(body); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') throw Object.assign(new Error('HTTP ' + r.status + ' — JSON 이 아닌 응답'), { status: 502 });
    if (!r.ok && !d.error) d = { error: { message: 'HTTP ' + r.status } };
    return d;
  };
  const order = _mode ? [_mode] : ['chat', 'reason', 'bare', 'legacy'];
  let d = null, used = null, lastErr = '';
  for (const m of order) {
    d = await once(m);
    if (!d.error) { used = m; break; }
    lastErr = (d.error && d.error.message) || 'API 오류';
    if (log) log.warn('[azure] shape=' + m + ' → ' + lastErr.slice(0, 160));
    if (!/temperature|reasoning_effort|max_completion_tokens|max_tokens|unsupported|not supported|unrecognized/i.test(lastErr)) break;
  }
  if (!used) { if (_mode) _mode = null; throw Object.assign(new Error(lastErr), { status: 502 }); }
  const c = (d.choices || [])[0];
  if (!c || !c.message || !c.message.content) throw Object.assign(new Error('AI 가 빈 응답을 냈습니다' + (c && c.finish_reason ? ' (' + c.finish_reason + ')' : '')), { status: 502 });
  _mode = used;
  return { text: c.message.content, mode: used, usage: d.usage || null };
}

module.exports = { ask, azBase, _resetMode: () => { _mode = null; } };
