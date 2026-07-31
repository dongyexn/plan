/* 당일 리마인드 메일 발송 — GitHub Actions cron이 매일 아침(KST) 실행.
   - calapp/tasks 에서 오늘 날짜 + remind=true + 미완료 업무를 수집(일정과 업무는 하나로 통합됨)
   - calapp/org 담당자 이메일 전원에게 Brevo(무료 300통/일) API로 발송
   필요한 저장소 Secrets:
   - FIREBASE_SERVICE_ACCOUNT : Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 > 새 비공개 키(JSON 전체)
   - BREVO_API_KEY            : https://app.brevo.com > SMTP & API > API Keys
   - MAIL_FROM                : 발신 주소 (Brevo에서 인증한 주소, 예: no-reply@…)
*/
import admin from 'firebase-admin';
import { buildRoster, recipients, hourGate } from './mail-common.mjs';

const DB_URL = 'https://report-c29a1-default-rtdb.asia-southeast1.firebasedatabase.app';

function kstToday() {
  const now = new Date(Date.now() + 9 * 3600 * 1000); // UTC→KST
  const p = n => String(n).padStart(2, '0');
  return `${now.getUTCFullYear()}-${p(now.getUTCMonth() + 1)}-${p(now.getUTCDate())}`;
}
const esch = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function main() {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null');
  if (!sa) throw new Error('FIREBASE_SERVICE_ACCOUNT secret이 없습니다');
  admin.initializeApp({ credential: admin.credential.cert(sa), databaseURL: DB_URL });
  const db = admin.database();

  const today = kstToday();
  const ym = today.slice(0, 7);

  const cfgSnap = await db.ref('calapp/cfg/mail').get();
  const mail = cfgSnap.val() || {};
  if (mail.dailyOn === false) { console.log('당일 리마인드가 설정에서 꺼져 있음 — 종료'); process.exit(0); }
  if (!hourGate(mail)) { console.log(`설정한 발송 시각(${mail.hour}시)이 아님 — 종료`); process.exit(0); }

  const [tasksSnap, peopleSnap, usersSnap, orgSnap] = await Promise.all([
    db.ref('calapp/tasks').get(),
    db.ref('calapp/people').get(),
    db.ref('users').get(),
    db.ref('calapp/org').get()
  ]);
  /* 업무 = 일정. sid(소속)와 함께 펼쳐 둔다 */
  const flat = [];
  Object.entries(tasksSnap.val() || {}).forEach(([sid, items]) =>
    Object.entries(items || {}).forEach(([iid, it]) => { if (it) flat.push({ sid, iid, ...it, title: it.text || '', owners: it.assignees || {} }); }));

  /* 오늘 발생하는 반복 일정도 포함 — 앱과 같은 규칙으로 전개 */
  const p2 = n => String(n).padStart(2, '0');
  const dsOf = d => `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
  const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return dsOf(new Date(Date.UTC(y, m - 1, d + n))); };
  const addMonths = (s, n) => { const [y, m, d] = s.split('-').map(Number);
    const last = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();
    return dsOf(new Date(Date.UTC(y, m - 1 + n, Math.min(d, last)))); };
  const hitsToday = p => {
    const f = p.recur && p.recur.f; if (!f) return false;
    if (p.date > today) return false;
    if (p.recur.until && today > p.recur.until) return false;
    if (p.skipOn && p.skipOn[today]) return false;
    const step = x => f === 'w' ? addDays(x, 7) : f === '2w' ? addDays(x, 14) : f === 'm' ? addMonths(x, 1) : addMonths(x, 12);
    let d = p.date, guard = 0;
    while (d < today && guard++ < 2000) d = step(d);
    return d === today;
  };

  const done = p => Number(p.st) === 2;
  const plans = flat.filter(p => {
    if (!p.remind || !p.date) return false;
    if (p.recur && p.recur.f) return hitsToday(p) && !(p.doneOn && p.doneOn[today]);
    return !done(p) && p.date <= today && (p.end || p.date) >= today;
  }).sort((a, b) => (a.time || '99') < (b.time || '99') ? -1 : 1);

  if (!plans.length) { console.log(`[${today}] 리마인드 대상 업무 없음 — 종료`); process.exit(0); }

  /* 수신자 — 설정한 범위대로. 팀 공통업무는 팀원 전체(mail-common.mjs) */
  const roster = buildRoster(usersSnap.val(), peopleSnap.val());
  const emails = recipients(mail.scope || 'all', plans.map(p => ({ kind: 'plan', p })), roster, orgSnap.val());
  if (!emails.length) { console.log('수신자 이메일 없음 — 종료'); process.exit(0); }

  const fmtT = t => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} · `;
  };
  const [, mo, dd] = today.split('-');
  const subject = `${mail.prefix || '[일정 리마인드]'} ${Number(mo)}월 ${Number(dd)}일 — ${plans.length}건`;
  const rows = plans.map(p =>
    `<tr><td style="padding:9px 12px;border-bottom:1px solid #EEE;">
       <div style="font-size:14px;font-weight:700;color:#1C1C1E;">${fmtT(p.time)}${esch(p.title)}</div>
       ${p.body ? `<div style="font-size:12px;color:#666;margin-top:3px;white-space:pre-wrap;">${esch(p.body)}</div>` : ''}
     </td></tr>`).join('');
  const html =
    `<div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:520px;margin:0 auto;">
       <div style="background:linear-gradient(135deg,#3E71D2,#2C437C);border-radius:14px 14px 0 0;padding:18px 20px;color:#fff;">
         <div style="font-size:11px;opacity:.8;">H서비스센터 · 일정 리마인드</div>
         <div style="font-size:19px;font-weight:800;margin-top:2px;">${Number(mo)}월 ${Number(dd)}일 오늘의 플랜</div>
       </div>
       ${mail.intro ? `<div style="background:#fff;border:1px solid #EEE;border-top:none;padding:12px 14px 0;font-size:12.5px;color:#555;">${esch(mail.intro)}</div>` : ''}
       <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #EEE;border-top:none;border-radius:0 0 14px 14px;">${rows}</table>
       <div style="font-size:11px;color:#999;margin-top:10px;">일정·업무 공유 앱에서 자동 발송된 메일입니다.</div>
     </div>`;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { email: process.env.MAIL_FROM, name: 'H서비스센터 일정 공유' },
      to: emails.map(e => ({ email: e })),
      subject, htmlContent: html
    })
  });
  if (!res.ok) throw new Error(`Brevo 발송 실패 ${res.status}: ${await res.text()}`);
  console.log(`[${today}] 플랜 ${plans.length}건 → ${emails.length}명 발송 완료`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
