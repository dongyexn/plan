/* 주간 요약 메일 — 매주 월요일 아침(KST) 발송.
   이번 주(월~일) 팀 전체 일정 + 기한 임박·초과 업무를 한 통으로 정리한다.
   Secrets는 remind.mjs와 동일: FIREBASE_SERVICE_ACCOUNT · BREVO_API_KEY · MAIL_FROM */
import admin from 'firebase-admin';

const DB_URL = 'https://report-c29a1-default-rtdb.asia-southeast1.firebasedatabase.app';
const p2 = n => String(n).padStart(2, '0');
const esch = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function kstNow() { return new Date(Date.now() + 9 * 3600 * 1000); }
function ds(d) { return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`; }
function addDays(s, n) { const [y, m, d] = s.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return ds(t); }
function addMonths(s, n) {
  const [y, m, d] = s.split('-').map(Number);
  const last = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();
  return ds(new Date(Date.UTC(y, m - 1 + n, Math.min(d, last))));
}
function dow(s) { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }
const DOW = ['일', '월', '화', '수', '목', '금', '토'];

/* 앱과 같은 규칙으로 반복 일정을 전개 */
function recurDates(p, from, to) {
  const f = p.recur && p.recur.f; if (!f) return [];
  const out = []; const until = (p.recur.until || '').trim();
  const step = x => f === 'w' ? addDays(x, 7) : f === '2w' ? addDays(x, 14) : f === 'm' ? addMonths(x, 1) : addMonths(x, 12);
  let d = p.date, guard = 0;
  while (d < from && guard++ < 600) d = step(d);
  while (d <= to && guard++ < 600) {
    if (until && d > until) break;
    if (!(p.skipOn && p.skipOn[d])) out.push(d);
    d = step(d);
  }
  return out;
}

async function main() {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null');
  if (!sa) throw new Error('FIREBASE_SERVICE_ACCOUNT secret이 없습니다');
  admin.initializeApp({ credential: admin.credential.cert(sa), databaseURL: DB_URL });
  const db = admin.database();

  const today = ds(kstNow());
  const monday = addDays(today, -((dow(today) + 6) % 7));
  const sunday = addDays(monday, 6);
  const months = [...new Set([monday.slice(0, 7), sunday.slice(0, 7)])];

  const [recurSnap, peopleSnap, usersSnap, tasksSnap, orgSnap, ...planSnaps] = await Promise.all([
    db.ref('calapp/recur').get(), db.ref('calapp/people').get(), db.ref('users').get(),
    db.ref('calapp/tasks').get(), db.ref('calapp/org').get(),
    ...months.map(m => db.ref(`calapp/plans/${m}`).get())
  ]);

  /* 이번 주 일정 = 단일 + 기간 + 반복 전개 */
  const occ = [];
  planSnaps.forEach(s => Object.values(s.val() || {}).forEach(p => {
    if (!p || !p.date) return;
    const last = p.end || p.date;
    if (last < monday || p.date > sunday) return;
    occ.push({ date: p.date < monday ? monday : p.date, p, span: p.end && p.end !== p.date });
  }));
  Object.values(recurSnap.val() || {}).forEach(p => {
    if (p && p.date) recurDates(p, monday, sunday).forEach(d => occ.push({ date: d, p, span: false }));
  });
  occ.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.p.time || '99') < (b.p.time || '99') ? -1 : 1);

  /* 기한 임박(이번 주 안) · 초과 업무 */
  const people = peopleSnap.val() || {}, org = orgSnap.val() || {}, tasks = tasksSnap.val() || {};
  const nameOf = sid => {
    const t = (Array.isArray(org.teams) ? org.teams : Object.values(org.teams || {})).find(x => x && x.id === sid);
    if (t) return t.name;
    return (people[sid] && people[sid].name) || '';
  };
  const due = [];
  Object.keys(tasks).forEach(sid => Object.values(tasks[sid] || {}).forEach(it => {
    if (!it || !it.due || it.st === 2) return;
    if (it.due <= sunday) due.push({ ...it, who: nameOf(sid), over: it.due < today });
  }));
  due.sort((a, b) => a.due < b.due ? -1 : 1);

  if (!occ.length && !due.length) { console.log('이번 주 일정·기한 없음 — 종료'); process.exit(0); }

  const emails = [...new Set(
    [...Object.values(usersSnap.val() || {}).filter(u => u && u.role !== 'blocked').map(u => u.email),
     ...Object.values(people).map(p => p && p.email)]
      .map(e => String(e || '').trim().toLowerCase())
      .filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
  )];
  if (!emails.length) { console.log('수신자 없음 — 종료'); process.exit(0); }

  const fmtT = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${p2(m)} · `; };
  const dayRows = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    const items = occ.filter(o => o.date === d || (o.span && o.p.date <= d && (o.p.end || o.p.date) >= d));
    if (!items.length) continue;
    dayRows.push(`<tr><td style="padding:9px 12px;border-bottom:1px solid #EEE;vertical-align:top;width:74px;">
        <div style="font-size:12px;font-weight:800;color:${dow(d) === 0 ? '#DC2626' : '#1C1C1E'};">${Number(d.slice(5, 7))}/${Number(d.slice(8))} (${DOW[dow(d)]})</div></td>
      <td style="padding:9px 12px;border-bottom:1px solid #EEE;">
        ${items.map(o => `<div style="font-size:13px;color:#1C1C1E;margin-bottom:3px;">${fmtT(o.p.time)}${esch(o.p.title)}
          ${o.p.recur && o.p.recur.f ? '<span style="font-size:10px;color:#3E71D2;">(반복)</span>' : ''}</div>`).join('')}
      </td></tr>`);
  }
  const dueRows = due.map(t => `<tr><td style="padding:8px 12px;border-bottom:1px solid #EEE;">
      <span style="font-size:11px;font-weight:800;color:${t.over ? '#DC2626' : '#D97706'};">${t.over ? '기한초과' : Number(t.due.slice(5, 7)) + '/' + Number(t.due.slice(8))}</span>
      <span style="font-size:13px;color:#1C1C1E;margin-left:7px;">${esch(t.text)}</span>
      ${t.who ? `<span style="font-size:11px;color:#888;margin-left:6px;">${esch(t.who)}</span>` : ''}</td></tr>`).join('');

  const subject = `[주간 업무] ${Number(monday.slice(5, 7))}/${Number(monday.slice(8))} – ${Number(sunday.slice(5, 7))}/${Number(sunday.slice(8))} 일정 ${occ.length}건 · 기한 ${due.length}건`;
  const html = `<div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:560px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#3E71D2,#2C437C);border-radius:14px 14px 0 0;padding:18px 20px;color:#fff;">
        <div style="font-size:11px;opacity:.8;">H서비스센터 · 주간 업무 요약</div>
        <div style="font-size:19px;font-weight:800;margin-top:2px;">${Number(monday.slice(5, 7))}월 ${Number(monday.slice(8))}일 – ${Number(sunday.slice(5, 7))}월 ${Number(sunday.slice(8))}일</div>
      </div>
      <div style="background:#fff;border:1px solid #EEE;border-top:none;padding:4px 0;">
        <div style="font-size:11px;font-weight:800;color:#888;padding:12px 12px 6px;">이번 주 일정</div>
        ${dayRows.length ? `<table style="width:100%;border-collapse:collapse;">${dayRows.join('')}</table>` : '<div style="font-size:12px;color:#999;padding:6px 12px 12px;">등록된 일정이 없습니다.</div>'}
        <div style="font-size:11px;font-weight:800;color:#888;padding:14px 12px 6px;">기한 임박·초과 업무</div>
        ${dueRows ? `<table style="width:100%;border-collapse:collapse;">${dueRows}</table>` : '<div style="font-size:12px;color:#999;padding:6px 12px 12px;">해당 없음.</div>'}
      </div>
      <div style="font-size:11px;color:#999;margin-top:10px;">주요업무 현황 앱에서 자동 발송된 메일입니다.</div>
    </div>`;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { email: process.env.MAIL_FROM, name: 'H서비스센터 주요업무 현황' },
      to: emails.map(e => ({ email: e })), subject, htmlContent: html
    })
  });
  if (!res.ok) throw new Error(`Brevo 발송 실패 ${res.status}: ${await res.text()}`);
  console.log(`주간 요약: 일정 ${occ.length}건 · 기한 ${due.length}건 → ${emails.length}명 발송`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
