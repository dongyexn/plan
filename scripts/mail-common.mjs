/* 메일 수신자 계산 — 앱(app.js mailRecipients)과 동일한 규칙을 쓴다.
   scope='all'   : 차단되지 않은 전원
   scope='owner' : 항목의 담당자에게만. 단 팀 공통업무는 그 팀 소속 전원.
   담당자 지정이 전혀 없는 항목이 섞이면 전원 발송으로 되돌린다(누락 방지). */
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
export function teamIdsOf(orgVal) {
  const o = orgVal || {};
  const arr = Array.isArray(o.teams) ? o.teams : Object.values(o.teams || {});
  return arr.filter(t => t && t.name).map(t => t.id);
}
/* items: [{kind:'plan', p} | {kind:'task', sid}] */
export function recipients(scope, items, roster, orgVal) {
  const emails = r => [...new Set(r.map(p => String(p.email).trim().toLowerCase()))];
  if (scope !== 'owner') return emails(roster);
  const teams = teamIdsOf(orgVal);
  const ids = new Set();
  let anyAll = false;
  items.forEach(it => {
    if (it.kind === 'task') {
      if (teams.indexOf(it.sid) >= 0) roster.filter(p => p.team === it.sid).forEach(p => ids.add(p.id));
      else ids.add(it.sid);
      return;
    }
    const own = Object.keys((it.p && it.p.owners) || {});
    if (!own.length) { anyAll = true; return; }
    own.forEach(id => ids.add(id));
  });
  if (anyAll) return emails(roster);
  const list = roster.filter(p => ids.has(p.id));
  return list.length ? emails(list) : emails(roster);
}
/* 설정한 발송 시각(KST)과 현재 시각이 맞는지 — 워크플로를 매시 실행으로 두고 여기서 거른다.
   워크플로가 하루 1회만 도는 기존 환경에서는 SKIP_HOUR_GATE=1 로 통과시킨다. */
export function hourGate(mail) {
  if (process.env.SKIP_HOUR_GATE === '1') return true;
  const want = Number(mail && mail.hour);
  if (!Number.isFinite(want)) return true;
  const kstHour = new Date(Date.now() + 9 * 3600 * 1000).getUTCHours();
  return kstHour === want;
}
