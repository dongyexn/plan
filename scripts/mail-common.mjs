/* 메일 공용 — 명부 만들기와 반복 일정 전개.
   195차부터 수신인은 '차단되지 않은 팀 전원'으로 고정이라 범위 계산은 없앴다(앱 mailRecipients 와 동일). */
export function buildRoster(usersVal, peopleVal) {
  const users = usersVal || {}, people = peopleVal || {};
  const out = {};
  Object.keys(users).forEach(uid => {
    const a = users[uid] || {};
    if (a.role === 'blocked') return;
    out[uid] = { id: uid, name: a.name || String(a.email || '').split('@')[0], email: a.email || '', team: '' };
  });
  Object.keys(people).forEach(id => {
    const p = people[id] || {}, prev = out[id];
    out[id] = { id,
      name: (prev && prev.name) || p.name || '', 
      email: (prev && prev.email) || p.email || '',
      team: p.team || '' };
  });
  return Object.values(out).filter(p => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(p.email || '').trim()));
}
/* 반복 일정 전개 — 앱(app.js recurDates)과 같은 규칙. 수정하면 앱 쪽도 함께 고칠 것.
   skipOn(제외)·until(종료)·moveOn(이 회차만 다른 날로) 을 모두 반영해
   [{date(실제 표시일), src(원래 회차일)}] 를 돌려준다.
   완료(doneOn)·제외(skipOn) 표시는 항상 src 기준으로 기록돼 있다. */
export function expandRecur(p, from, to) {
  const f = p.recur && p.recur.f; if (!f) return [];
  const p2 = n => String(n).padStart(2, '0');
  const ds = d => `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
  const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return ds(new Date(Date.UTC(y, m - 1, d + n))); };
  const addMonths = (s, n) => { const [y, m, d] = s.split('-').map(Number);
    const last = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();
    return ds(new Date(Date.UTC(y, m - 1 + n, Math.min(d, last)))); };
  const step = x => f === 'w' ? addDays(x, 7) : f === '2w' ? addDays(x, 14) : f === 'm' ? addMonths(x, 1) : addMonths(x, 12);
  const until = (p.recur.until || '').trim();
  const mv = p.moveOn || {};
  const out = [];
  let d = p.date, guard = 0;
  while (d < from && guard++ < 2000) d = step(d);
  while (d <= to && guard++ < 2000) {
    if (until && d > until) break;
    if (!(p.skipOn && p.skipOn[d])) {
      const to2 = mv[d];
      if (!to2) out.push({ date: d, src: d });
      else if (to2 >= from && to2 <= to) out.push({ date: to2, src: d });
    }
    d = step(d);
  }
  /* 범위 밖(앞·뒤) 회차가 이 범위로 옮겨온 경우도 포함 */
  Object.keys(mv).forEach(src => {
    const dst = mv[src];
    if (dst >= from && dst <= to && (src < from || src > to)
      && !out.some(o => o.date === dst) && !(p.skipOn && p.skipOn[src])) out.push({ date: dst, src });
  });
  return out.sort((a, b) => a.date < b.date ? -1 : 1);
}
