/* 주간 업무 일정 메일 — 매주 월요일 오전 7시 30분(KST) 발송.
   이번 주(월~일) 달력 + 공통 업무 + 담당 업무를 한 통으로 보낸다. 수신인은 팀 전체.
   ⚠ 계산·레이아웃은 앱(app.js mailItems·mailHTML)과 짝이다 — 한쪽만 고치지 말 것.
   Secrets: FIREBASE_SERVICE_ACCOUNT · BREVO_API_KEY · MAIL_FROM */
import admin from 'firebase-admin';
import { buildRoster, expandRecur } from './mail-common.mjs';

const DB_URL = 'https://report-c29a1-default-rtdb.asia-southeast1.firebasedatabase.app';
const TEAM_COLOR = '#3E71D2';   /* 담당자 없는 팀 공통 업무의 기본색 — 앱 planColor 와 같은 값 */
const OWN_PAL = ['#3E71D2', '#16A34A', '#D97706', '#DC2626', '#7C5CD6', '#0EA5E9', '#DB2777', '#65A30D', '#EA580C', '#0D9488'];
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const p2 = n => String(n).padStart(2, '0');
const esch = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function kstNow() { return new Date(Date.now() + 9 * 3600 * 1000); }
function ds(d) { return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`; }
function addDays(s, n) { const [y, m, d] = s.split('-').map(Number); return ds(new Date(Date.UTC(y, m - 1, d + n))); }
function dow(s) { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }

/* 2026년 8월 3~9일 · 달이 걸치면 8월 31~9월 6일 */
function weekLabel(mon, sun) {
  const head = `${mon.slice(0, 4)}년 ${Number(mon.slice(5, 7))}월 ${Number(mon.slice(8))}`;
  const tail = (mon.slice(5, 7) === sun.slice(5, 7) ? '' : `${Number(sun.slice(5, 7))}월 `) + Number(sun.slice(8));
  return `${head}~${tail}일`;
}

async function main() {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null');
  if (!sa) throw new Error('FIREBASE_SERVICE_ACCOUNT secret이 없습니다');
  admin.initializeApp({ credential: admin.credential.cert(sa), databaseURL: DB_URL });
  const db = admin.database();

  const mail = (await db.ref('calapp/cfg/mail').get()).val() || {};
  if (mail.weeklyOn === false) { console.log('주간 발송이 설정에서 꺼져 있음 — 종료'); process.exit(0); }

  const today = ds(kstNow());
  if (dow(today) !== 1) { console.log('월요일이 아님 — 종료'); process.exit(0); }
  const mon = today, sun = addDays(mon, 6);

  const [peopleSnap, usersSnap, tasksSnap, orgSnap] = await Promise.all([
    db.ref('calapp/people').get(), db.ref('users').get(),
    db.ref('calapp/tasks').get(), db.ref('calapp/org').get()
  ]);
  const tasks = tasksSnap.val() || {}, people = peopleSnap.val() || {}, org = orgSnap.val() || {};
  const arr = v => Array.isArray(v) ? v : Object.values(v || {});
  const teamIds = arr(org.teams).filter(t => t && t.name).map(t => t.id);
  const isTeam = sid => teamIds.indexOf(sid) >= 0;
  const nameOf = sid => (arr(org.teams).find(x => x && x.id === sid) || {}).name || (people[sid] || {}).name || '';

  /* 담당자 색 — 앱 ownColor 와 같은 규칙(프로필 색 우선, 없으면 명부 순서) */
  const users = usersSnap.val() || {};
  const rosterIds = Object.keys(people).sort((a, b) =>
    String((people[a] || {}).name || '').localeCompare(String((people[b] || {}).name || ''), 'ko'));
  const colorOf = it => {
    if (it.color && it.color !== 'auto') return it.color;
    const own = Object.keys(it.assignees || {});
    if (!own.length) return TEAM_COLOR;
    const uid = own[0];
    if (users[uid] && users[uid].avColor) return users[uid].avColor;
    const i = rosterIds.indexOf(uid);
    return i < 0 ? TEAM_COLOR : OWN_PAL[i % OWN_PAL.length];
  };

  /* ① 이번 주 달력 — 날짜가 있는 미완료 업무를 요일 칸에 넣는다 */
  const flat = [];
  Object.entries(tasks).forEach(([sid, items]) =>
    Object.entries(items || {}).forEach(([iid, it]) => { if (it) flat.push({ sid, iid, it }); }));
  const days = [];
  for (let i = 0; i < 7; i++) days.push({ date: addDays(mon, i), list: [] });
  const put = (d, it) => { const c = days.find(x => x.date === d); if (c) c.list.push(it); };
  flat.forEach(({ it }) => {
    if (!it.date) return;
    if (it.recur && it.recur.f) {
      expandRecur({ ...it, owners: it.assignees || {} }, mon, sun)
        .forEach(o => { if (!(it.doneOn && it.doneOn[o.src])) put(o.date, it); });
      return;
    }
    if (Number(it.st) === 2) return;
    const last = it.end || it.date;
    if (last < mon || it.date > sun) return;
    for (let d = it.date < mon ? mon : it.date; d <= (last > sun ? sun : last); d = addDays(d, 1)) put(d, it);
  });

  /* ② 공통 업무 · ③ 담당 업무 — 미완료 중 이번 주까지(기한 없는 것 포함) */
  const commons = [], mines = [];
  flat.forEach(({ sid, it }) => {
    if (Number(it.st) === 2) return;
    if (it.date && it.date > sun) return;
    (isTeam(sid) ? commons : mines).push({ sid, it, who: isTeam(sid) ? '' : nameOf(sid) });
  });
  const byDate = (a, b) => (a.it.date || '9999') < (b.it.date || '9999') ? -1 : (a.it.date || '9999') > (b.it.date || '9999') ? 1 : 0;
  commons.sort(byDate);
  mines.sort((a, b) => String(a.who).localeCompare(String(b.who), 'ko') || byDate(a, b));

  if (!days.some(d => d.list.length) && !commons.length && !mines.length) {
    console.log('이번 주 담을 내용 없음 — 종료'); process.exit(0);
  }

  const roster = buildRoster(users, people);
  const emails = [...new Set(roster.map(p => String(p.email).trim().toLowerCase()))];
  if (!emails.length) { console.log('수신자 없음 — 종료'); process.exit(0); }

  const cell = d => {
    const w = dow(d.date);
    const col = w === 0 ? '#DC2626' : w === 6 ? '#3E71D2' : '#1C1C1E';
    return `<td style="width:14.28%;vertical-align:top;border:1px solid #EEE;padding:6px 5px;">
      <div style="font-size:11px;font-weight:800;color:${col};margin-bottom:4px;">${Number(d.date.slice(8))} (${DOW[w]})</div>
      ${d.list.map(it => `<div style="font-size:11px;line-height:1.4;color:#fff;background:${esch(colorOf(it))};border-radius:3px;padding:2px 4px;margin-bottom:2px;">${esch(it.text || '')}</div>`).join('')}</td>`;
  };
  const row = x => `<tr><td style="padding:7px 12px;border-bottom:1px solid #EEE;">
      <span style="font-size:11px;font-weight:800;color:${x.it.date && x.it.date < today ? '#DC2626' : '#8E8E93'};">${x.it.date ? esch(`${Number(x.it.date.slice(5, 7))}/${Number(x.it.date.slice(8))}`) : '기한 없음'}</span>
      <span style="font-size:13px;color:#1C1C1E;margin-left:8px;">${esch(x.it.text || '제목 없음')}</span>
      ${x.who ? `<span style="font-size:11px;color:#8E8E93;margin-left:6px;">${esch(x.who)}</span>` : ''}</td></tr>`;
  const sec = (t, rows, none) => `<div style="font-size:11px;font-weight:800;color:#8E8E93;padding:14px 12px 6px;">${t}</div>`
    + (rows ? `<table style="width:100%;border-collapse:collapse;">${rows}</table>`
      : `<div style="font-size:12px;color:#999;padding:2px 12px 8px;">${none}</div>`);

  const label = weekLabel(mon, sun);
  const subject = `[업무 알림] ${label} 주간 업무 일정`;
  const html = `<div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:640px;margin:0 auto;">
    <div style="background:${TEAM_COLOR};border-radius:8px 8px 0 0;padding:14px 16px;color:#fff;font-size:16px;font-weight:800;">${label} 주간 업무 일정</div>
    <div style="background:#fff;border:1px solid #EEE;border-top:none;border-radius:0 0 8px 8px;padding:10px 0 12px;">
      <div style="padding:4px 12px 8px;"><table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>${days.map(cell).join('')}</tr></table></div>
      ${sec('공통 업무', commons.map(row).join(''), '등록된 공통 업무가 없습니다.')}
      ${sec('담당 업무', mines.map(row).join(''), '등록된 담당 업무가 없습니다.')}
    </div></div>`;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { email: process.env.MAIL_FROM, name: 'H서비스센터 주요업무 현황' },
      to: emails.map(e => ({ email: e })), subject, htmlContent: html
    })
  });
  if (!res.ok) throw new Error(`Brevo 발송 실패 ${res.status}: ${await res.text()}`);
  console.log(`주간 업무 일정: 공통 ${commons.length}건 · 담당 ${mines.length}건 → ${emails.length}명 발송`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
