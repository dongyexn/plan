/* ══════════ 규칙 침투 테스트(631차) — AUTH-01~18 ══════════
   Firebase 에뮬레이터(Java 의존)를 못 쓰는 환경이라, 이 앱의 규칙이 실제로 쓰는 표현 부분집합
   (child/val/exists/==/!=/&&/||/?:/auth/root/data/newData/$변수/matches)을 그대로 JS 로 평가한다.

   ⚠ 근사의 한계(정직하게):
   - 쓰기 cascade(경로 위 어느 층의 .write 든 참이면 허용)는 1012차부터 흉내낸다(tryWrite).
   - .validate 는 대상 노드와(와일드카드 포함) newData 가 실제로 건드리는 하위 필드에 대해 평가한다.
   판정 = .write 통과 AND 관련 .validate 전부 통과. 이름은 HANDOFF 권한 매트릭스의 AUTH-ID 와 연결. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const raw = fs.readFileSync(path.join(root, 'database.rules.json'), 'utf8');
const rules = JSON.parse(raw.replace(/^\s*\/\/.*$/gm, '')).rules;

/* ── 트리 노드 셈 — 규칙의 data/newData/root 와 같은 API ── */
class N {
  constructor(v) { this.v = v; }
  child(p) {
    let n = this.v;
    for (const k of String(p).split('/').filter(Boolean)) {
      n = (n != null && typeof n === 'object') ? n[k] : undefined;
    }
    return new N(n === undefined ? null : n);
  }
  val() { return (this.v != null && typeof this.v === 'object') ? this.v : (this.v === undefined ? null : this.v); }
  exists() { return this.v !== null && this.v !== undefined; }
  hasChild(k) { return this.child(k).exists(); }   /* 970차: tasks 필수 필드 검증(L7) */
  hasChildren(ks) { return Array.isArray(ks) ? ks.every(k => this.child(k).exists()) : (this.v != null && typeof this.v === 'object' && Object.keys(this.v).length > 0); }
  isNumber() { return typeof this.v === 'number'; }
  isString() { return typeof this.v === 'string'; }
  isBoolean() { return typeof this.v === 'boolean'; }
  /* 675차: aiConf 노드가 객체인지 보는 데 쓴다. 인자가 없으면 '자식이 하나라도 있는가',
     배열이면 '그 키들이 전부 있는가' — RTDB 규칙의 hasChildren 과 같은 뜻이다. */
  hasChildren(keys) {
    if (this.v == null || typeof this.v !== 'object') return false;
    if (Array.isArray(keys)) return keys.every(k => this.v[k] !== undefined && this.v[k] !== null);
    return Object.keys(this.v).length > 0;
  }
}

const NOW = 1790000000000;
function evalExpr(expr, ctx) {
  let e = expr;
  for (const [k, v] of Object.entries(ctx.vars || {})) e = e.split(k).join(JSON.stringify(v));
  e = e.replace(/\.matches\(/g, '.match(');            /* 규칙 matches → JS match(truthy 사용) */
  const fn = new Function('auth', 'root', 'data', 'newData', 'query', 'now', 'return (' + e + ');');
  return !!fn(ctx.auth, ctx.root, ctx.data, ctx.newData, ctx.query || {}, NOW);   /* now = 서버 시각 — 시험에선 고정값(서버값 쓰기도 이 값으로 들어온다고 본다) */   /* 1085: 질의 규칙(query.orderByChild·equalTo) — 질의 없는 읽기는 빈 객체 */
}

/* 규칙 트리에서 경로의 노드 규칙 찾기 — 와일드카드($x)를 vars 로 수집 */
function ruleNodeAt(pathArr) {
  let node = rules; const vars = {};
  for (const seg of pathArr) {
    if (node[seg]) { node = node[seg]; continue; }
    const wc = Object.keys(node).find(k => k.startsWith('$'));
    if (!wc) return null;
    vars[wc] = seg; node = node[wc];
  }
  return { node, vars };
}

/* .validate 재귀 — newData 가 만드는 각 위치의 validate 를 전부 평가.
   ⚠ 필드의 .validate 안에서 data 는 **그 필드의 기존값**이다 — 재귀마다 data 도 함께 내린다
   (안 내리면 createdBy 불변 검사(newData.val()==data.val())가 엉뚱한 비교로 오판한다) */
function validateAll(node, vars, ctx, nd, dd) {
  if (node['.validate'] !== undefined) {
    if (!evalExpr(node['.validate'], { ...ctx, vars, newData: nd, data: dd })) return false;
  }
  const v = nd.v;
  if (v != null && typeof v === 'object') {
    for (const key of Object.keys(v)) {
      let child = node[key], cvars = vars;
      if (!child) {
        const wc = Object.keys(node).find(k => k.startsWith('$'));
        if (wc) { child = node[wc]; cvars = { ...vars, [wc]: key }; }
        else if (node['$other'] || node['.validate'] !== undefined) child = node['$other'];
      }
      if (child === undefined) continue;
      if (child && child['.validate'] === false) return false;
      if (child && !validateAll(child, cvars, ctx, nd.child(key), dd.child(key))) return false;
    }
  }
  return true;
}

/* 1012차: RTDB 쓰기 cascade — 경로 위 어느 층의 .write 든 참이면 허용(하위의 거부로 되돌릴 수 없다).
   전엔 '상위 .write 없음' 전제로 대상 노드만 봤다(953차 d60 서식처럼 층층이 둔 규칙은 시험하지 못했다).
   각 층의 newData 는 그 층 기존값에 새 값을 대상 경로에 끼운 결과다 */
function withAt(base, rest, val) {
  if (!rest.length) return val;
  const o = (base != null && typeof base === 'object') ? { ...base } : {};
  const v = withAt(o[rest[0]], rest.slice(1), val);
  if (v === null || v === undefined) delete o[rest[0]]; else o[rest[0]] = v;
  return Object.keys(o).length ? o : null;
}
function tryWrite(pathStr, auth, treeRoot, newVal) {
  const pathArr = pathStr.split('/').filter(Boolean);
  const found = ruleNodeAt(pathArr);
  if (!found) return { ok: false, why: '.write 없음' };
  const at = sub => sub.reduce((n, k) => (n || {})[k], treeRoot) ?? null;
  const ctx = { auth, root: new N(treeRoot), data: new N(at(pathArr)), vars: found.vars };
  const nd = new N(newVal === undefined ? null : newVal);
  let granted = false, anyWrite = false;
  for (let i = 1; i <= pathArr.length && !granted; i++) {
    const sub = pathArr.slice(0, i), f = ruleNodeAt(sub);
    if (!f || f.node['.write'] === undefined || typeof f.node['.write'] !== 'string') continue;
    anyWrite = true;
    const cur = at(sub);
    granted = evalExpr(f.node['.write'], { auth, root: ctx.root, vars: f.vars, data: new N(cur), newData: new N(withAt(cur, pathArr.slice(i), newVal === undefined ? null : newVal)) });
  }
  if (!anyWrite) return { ok: false, why: '.write 없음' };
  if (!granted) return { ok: false, why: '.write 거부' };
  if (newVal != null && !validateAll(found.node, found.vars, ctx, nd, ctx.data)) return { ok: false, why: '.validate 거부' };
  return { ok: true };
}

/* 671차: 읽기 판정 — RTDB 는 상위 .read 가 허용하면 하위가 전부 열린다(캐스케이드).
   경로를 따라가며 하나라도 참이면 ALLOW. aiConf 는 키를 담으므로 이 캐스케이드가 핵심이다. */
function tryRead(pathStr, auth, treeRoot, query) {
  const pathArr = pathStr.split('/').filter(Boolean);
  const ctx0 = { auth, root: new N(treeRoot), query };
  for (let i = 0; i <= pathArr.length; i++) {
    const sub = pathArr.slice(0, i);
    const found = ruleNodeAt(sub);
    if (!found || found.node['.read'] === undefined) continue;
    const r = found.node['.read'];
    if (typeof r !== 'string') { if (r) return { ok: true }; continue; }   /* 루트의 .read:false 처럼 불리언으로 적힌 규칙 */
    const data = new N(sub.reduce((n, k) => (n || {})[k], treeRoot) ?? null);
    if (evalExpr(r, { ...ctx0, data, newData: data, vars: found.vars })) return { ok: true };
  }
  return { ok: false, why: '.read 거부' };
}

/* ── 픽스처 — v628 검증과 같은 조직 ── */
const A = uid => ({ uid, token: { email: uid.toLowerCase() + '@hdec.co.kr', email_verified: true } });
const TREE = {
  users: { E1: { role: 'editor' }, U1: { role: 'viewer' }, U2: { role: 'viewer' }, U3: { role: 'viewer' }, U4: { role: 'viewer' }, U5: { role: 'viewer' } },
  calapp: {
    orgSiteRegion: { sA: '중부1', sB: '중부2', sC: '중부1' },
    people: {
      U1: { name: '김담당', email: 'u1@hdec.co.kr', team: 't1', region: '중부1', rank: 'member', sites: { sA: 1 } },
      U2: { name: '박작성', email: 'u2@hdec.co.kr', team: 't1', region: '중부1', rank: 'member', sites: { sC: 1 } },
      U3: { name: '이팀장', email: 'u3@hdec.co.kr', team: 't1', region: '', rank: 'head', sites: {} },
      U4: { name: '최공구', email: 'u4@hdec.co.kr', team: 't1', region: '중부1', rank: 'lead', sites: {} },
      U5: { name: '정타권', email: 'u5@hdec.co.kr', team: 't1', region: '중부2', rank: 'member', sites: { sB: 1 } },
    },
    tasks: { U2: {
      own: { text: '작성자 것', st: 1, createdAt: 1, updatedAt: 1, createdBy: 'U2' },
      legacy: { text: '레거시', st: 1, createdAt: 1, updatedAt: 1 },
      asg: { text: '담당 지정', st: 1, createdAt: 1, updatedAt: 1, createdBy: 'U2', assignees: { U1: 1 } },
      siteT: { text: '현장 업무', st: 1, createdAt: 1, updatedAt: 1, createdBy: 'U2', site: 'sA' },
    }, U5: { far: { text: '타권역', st: 1, createdAt: 1, updatedAt: 1, createdBy: 'U5' } } },
  },
};
const P = id => JSON.parse(JSON.stringify(TREE.calapp.people[id]));
const T = (sid, iid) => JSON.parse(JSON.stringify(TREE.calapp.tasks[sid][iid]));

let fail = 0;
const t = (id, name, expect, res) => {
  const got = res.ok;
  const pass = got === expect;
  console.log(`${pass ? '✓' : '✗'} ${id}  ${name} — 기대 ${expect ? 'ALLOW' : 'DENY'} / 결과 ${got ? 'ALLOW' : 'DENY'}${pass ? '' : ' (' + (res.why || '') + ')'}`);
  if (!pass) fail++;
};

/* AUTH-01 viewer → org 쓰기 */
t('AUTH-01', 'viewer → calapp/org 쓰기', false, tryWrite('calapp/org', A('U1'), TREE, { teams: [] }));
/* AUTH-02 viewer → 타인 people */
t('AUTH-02', 'viewer → 타인 people 쓰기', false, tryWrite('calapp/people/U2', A('U1'), TREE, { ...P('U2'), name: '변조' }));
/* AUTH-03 viewer → 자기 people(소속 불변) */
t('AUTH-03', 'viewer → 자기 people(이름·현장만)', true, tryWrite('calapp/people/U1', A('U1'), TREE, { ...P('U1'), name: '개명', sites: { sA: 1, sC: 1 } }));
t('AUTH-03b', 'viewer → 자기 rank 승급 시도', false, tryWrite('calapp/people/U1', A('U1'), TREE, { ...P('U1'), rank: 'head' }));
/* AUTH-04/05 lead 권역 경계 */
t('AUTH-04', 'lead → 타권역 사람 현장 배정', false, tryWrite('calapp/people/U5', A('U4'), TREE, { ...P('U5'), sites: { sB: 1 } }));
t('AUTH-05', 'lead → 같은 권역 사람 현장 배정', true, tryWrite('calapp/people/U2', A('U4'), TREE, { ...P('U2'), sites: { sC: 1, sA: 1 } }));
/* AUTH-06 createdBy 불변 */
t('AUTH-06', '작성자 → 자기 업무 createdBy 양도', false, tryWrite('calapp/tasks/U2/own', A('U2'), TREE, { ...T('U2', 'own'), createdBy: 'U1' }));
t('AUTH-06b', '작성자 → createdBy 삭제(레거시화)', false, tryWrite('calapp/tasks/U2/own', A('U2'), TREE, (() => { const x = T('U2', 'own'); delete x.createdBy; return x; })()));
/* AUTH-07 레거시에 createdBy 심기(소유 탈취) */
t('AUTH-07', 'viewer → 레거시 업무에 자기 createdBy 삽입', false, tryWrite('calapp/tasks/U2/legacy', A('U1'), TREE, { ...T('U2', 'legacy'), createdBy: 'U1' }));
/* AUTH-08 editor → org */
t('AUTH-08', 'editor → calapp/org 쓰기', true, tryWrite('calapp/org', A('E1'), TREE, { teams: [{ id: 't1', name: 'T' }] }));
/* AUTH-09 자기 sites 권역 강제 */
t('AUTH-09', 'viewer → 자기 sites 에 타권역(sB) 추가', false, tryWrite('calapp/people/U1', A('U1'), TREE, { ...P('U1'), sites: { sA: 1, sB: 1 } }));
t('AUTH-09b', 'viewer → 자기 sites 에 자기 권역(sC) 추가', true, tryWrite('calapp/people/U1', A('U1'), TREE, { ...P('U1'), sites: { sA: 1, sC: 1 } }));
/* AUTH-10 업무 위계 */
t('AUTH-10', 'viewer → 남의 일반 업무 수정', false, tryWrite('calapp/tasks/U2/own', A('U1'), TREE, { ...T('U2', 'own'), st: 2 }));
t('AUTH-10b', '지정 담당자 → 그 업무 수정', true, tryWrite('calapp/tasks/U2/asg', A('U1'), TREE, { ...T('U2', 'asg'), st: 2 }));
t('AUTH-10c', '팀장 → 남의 업무 수정', true, tryWrite('calapp/tasks/U5/far', A('U3'), TREE, { ...T('U5', 'far'), st: 2 }));
t('AUTH-10d', '공구장 → 같은 권역 업무 수정', true, tryWrite('calapp/tasks/U2/own', A('U4'), TREE, { ...T('U2', 'own'), st: 2 }));
t('AUTH-10e', '공구장 → 타권역 업무 수정', false, tryWrite('calapp/tasks/U5/far', A('U4'), TREE, { ...T('U5', 'far'), st: 2 }));
t('AUTH-10f', '담당자 → 내 담당 현장 업무 수정', true, tryWrite('calapp/tasks/U2/siteT', A('U1'), TREE, { ...T('U2', 'siteT'), st: 2 }));
t('AUTH-10g', '누구나 → 레거시 업무 수정(정책 유지)', true, tryWrite('calapp/tasks/U2/legacy', A('U5'), TREE, { ...T('U2', 'legacy'), st: 2 }));
/* 미인증 방어(people 재구성 확인) */
/* ── 669차: 화면(UI)과 서버 권한이 어긋나던 곳 ── */
/* AUTH-14 휴지통·보관함도 업무 본체와 같은 소유 검사 */
const TR = (sid, iid) => ({ text: T(sid, iid).text, date: '2026-08-01', deletedAt: 1, z: 'x' });
const AR = (sid, iid) => ({ text: T(sid, iid).text, date: '2026-08-01', archivedAt: 1, z: 'x' });
t('AUTH-14a', '남의 업무 → 휴지통에 넣기', false, tryWrite('calapp/trash/U5/far', A('U1'), TREE, TR('U5','far')));
t('AUTH-14b', '자기 담당 업무 → 휴지통에 넣기', true, tryWrite('calapp/trash/U2/asg', A('U1'), TREE, TR('U2','asg')));
t('AUTH-14c', '작성자 → 자기 업무 보관', true, tryWrite('calapp/archive/U2/own', A('U2'), TREE, AR('U2','own')));
t('AUTH-14d', '남의 업무 → 보관', false, tryWrite('calapp/archive/U5/far', A('U1'), TREE, AR('U5','far')));
t('AUTH-14e', '팀장 → 남의 업무 휴지통', true, tryWrite('calapp/trash/U5/far', A('U3'), TREE, TR('U5','far')));
t('AUTH-14f', '휴지통에 든 남의 업무 지우기(복원)', false,
  tryWrite('calapp/trash/U5/far', A('U1'), { ...TREE, calapp: { ...TREE.calapp,
    trash: { U5: { far: { ...TR('U5','far'), createdBy: 'U5' } } } } }, null));
t('AUTH-11', '메일 미검증 계정 → 자기 people 쓰기', false, tryWrite('calapp/people/U1', { uid: 'U1', token: { email: 'u1@hdec.co.kr', email_verified: false } }, TREE, { ...P('U1'), name: 'x' }));

/* AUTH-15~18 (1012차 보안) — D+60 사진 값 꼴·현장 통째 삭제 · D+60 서식 직무 통째 삭제 · 옛 plans · 프로필 색 */
const PH = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
const T15 = { ...TREE, calapp: { ...TREE.calapp, d60photo: { sA: { arch: { k1: { p1: { d: PH, by: 'U1', ts: 1 } } } } },
  d60: { forms: { arch: { unit: { sp1: { name: '거실', ord: 1 } } } } } } };
t('AUTH-15a', 'viewer → D+60 사진 값에 HTML 주입', false, tryWrite('calapp/d60photo/sA/arch/k1/p2', A('U1'), T15, { d: 'x"><input data-act="acct.role">', by: 'U1', ts: 2 }));
t('AUTH-15b', 'viewer → D+60 사진(data:image/webp) 추가', true, tryWrite('calapp/d60photo/sA/arch/k1/p2', A('U1'), T15, { d: PH, by: 'U1', ts: 2 }));
t('AUTH-15c', 'viewer → 현장 사진 통째 삭제', false, tryWrite('calapp/d60photo/sA', A('U1'), T15, null));
t('AUTH-15d', 'viewer → 항목 사진 정리(세대 삭제)', true, tryWrite('calapp/d60photo/sA/arch/k1', A('U1'), T15, null));
t('AUTH-15e', 'editor → 현장 사진 통째 삭제', true, tryWrite('calapp/d60photo/sA', A('E1'), T15, null));
t('AUTH-16a', 'viewer → D+60 직무 서식 통째 삭제', false, tryWrite('calapp/d60/forms/arch', A('U1'), T15, null));
t('AUTH-16b', 'viewer → D+60 공간 이름 고치기', true, tryWrite('calapp/d60/forms/arch/unit/sp1/name', A('U1'), T15, '안방'));
t('AUTH-16c', 'editor → D+60 직무 서식 초기화', true, tryWrite('calapp/d60/forms/arch', A('E1'), T15, null));
t('AUTH-17a', 'viewer → 옛 plans 쓰기', false, tryWrite('calapp/plans/2026-01/x1', A('U1'), TREE, { id: 'own', date: '2026-01-02', title: 'x', owners: { U2: 1 } }));
t('AUTH-17b', 'editor → 옛 plans 정리(삭제)', true, tryWrite('calapp/plans/2026-01/x1', A('E1'), TREE, null));
t('AUTH-18a', 'viewer → 자기 프로필 색에 CSS 덧붙이기', false, tryWrite('users/U1', A('U1'), TREE, { email: 'u1@hdec.co.kr', role: 'viewer', avColor: '0;scale:999' }));
t('AUTH-18b', 'viewer → 자기 프로필 색(#3E71D2)', true, tryWrite('users/U1', A('U1'), TREE, { email: 'u1@hdec.co.kr', role: 'viewer', avColor: '#3E71D2' }));
t('AUTH-18c', 'viewer → 자기 프로필 색(gf-그라디언트)', true, tryWrite('users/U1', A('U1'), TREE, { email: 'u1@hdec.co.kr', role: 'viewer', avColor: 'gf-3b82f6-ec4899' }));

/* AUTH-19 (1085) 휴지통 읽기 = 보이는 범위. calapp 통째 읽기 없앰(자식마다 같은 읽기) */
const T19 = { ...TREE, users: { ...TREE.users, U6: { role: 'viewer' } }, calapp: { ...TREE.calapp,
  people: { ...TREE.calapp.people, U6: { name: '남팀원', email: 'u6@hdec.co.kr', team: 't2', region: '중부1', rank: 'member', sites: {} } },
  trash: { U1: { a: { text: 'x', createdBy: 'U1' } }, U2: { b: { text: 'y', createdBy: 'U2' } }, U5: { c: { text: 'z', createdBy: 'U5', site: 'sA' } }, t1: { d: { text: 'w', createdBy: 'U1' } }, U6: { e: { text: 'v', createdBy: 'U6' } } } } };
const Q = (o, v) => ({ orderByChild: o, equalTo: v });
t('AUTH-19a', 'viewer → calapp 통째 읽기', false, tryRead('calapp', A('U1'), T19));
t('AUTH-19b', 'viewer → calapp/tasks 읽기', true, tryRead('calapp/tasks', A('U1'), T19));
t('AUTH-19c', 'viewer → calapp/people 읽기', true, tryRead('calapp/people', A('U1'), T19));
t('AUTH-19d', 'viewer → 휴지통 통째 읽기', false, tryRead('calapp/trash', A('U1'), T19));
t('AUTH-19e', 'editor → 휴지통 통째 읽기', true, tryRead('calapp/trash', A('E1'), T19));
t('AUTH-19f', '담당자 → 내 트리 휴지통', true, tryRead('calapp/trash/U1', A('U1'), T19));
t('AUTH-19g', '담당자 → 남의 트리 휴지통', false, tryRead('calapp/trash/U2', A('U1'), T19));
t('AUTH-19h', '담당자 → 팀 공통 트리에서 내가 만든 것(질의)', true, tryRead('calapp/trash/t1', A('U1'), T19, Q('createdBy', 'U1')));
t('AUTH-19i', '담당자 → 남이 만든 것 질의', false, tryRead('calapp/trash/U2', A('U1'), T19, Q('createdBy', 'U2')));
t('AUTH-19j', '공구장 → 같은 권역 사람 트리', true, tryRead('calapp/trash/U2', A('U4'), T19));
t('AUTH-19k', '공구장 → 타권역 사람 트리', false, tryRead('calapp/trash/U5', A('U4'), T19));
t('AUTH-19l', '공구장 → 타권역 트리에서 내 권역 현장(질의)', true, tryRead('calapp/trash/U5', A('U4'), T19, Q('site', 'sA')));
t('AUTH-19m', '공구장 → 타권역 현장 질의', false, tryRead('calapp/trash/U5', A('U4'), T19, Q('site', 'sB')));
t('AUTH-19n', '팀장 → 같은 팀 사람 트리', true, tryRead('calapp/trash/U5', A('U3'), T19));
t('AUTH-19o', '팀장 → 팀 공통 트리', true, tryRead('calapp/trash/t1', A('U3'), T19));
t('AUTH-19p', '팀장 → 다른 팀 사람 트리', false, tryRead('calapp/trash/U6', A('U3'), T19));
t('AUTH-19q', '담당자 → 현장 질의(공구장 아님)', false, tryRead('calapp/trash/U5', A('U1'), T19, Q('site', 'sA')));

/* 1093: 관리자 → 타 계정 이름 고치기(계정 이름 · 명부 이름) / 일반 사용자는 거부 */
t('AUTH-20a', 'editor → 타인 계정 이름', true, tryWrite('users/U2/name', A('E1'), TREE, '개명'));
t('AUTH-20b', 'viewer → 타인 계정 이름', false, tryWrite('users/U2/name', A('U1'), TREE, '변조'));
t('AUTH-20c', 'editor → 타인 명부 이름', true, tryWrite('calapp/people/U2', A('E1'), TREE, { ...P('U2'), name: '개명' }));

/* AUTH-21 배경 사진 목록 — 누구나 읽기(로그인 전) · 앱에서는 아무도 쓰기 못 함 */
t('AUTH-21a', '비로그인 → bg 읽기', true, tryRead('bg', null, TREE));
t('AUTH-21b', '비로그인 → bg 쓰기', false, tryWrite('bg', null, TREE, { l: [] }));
t('AUTH-21c', 'editor → bg 쓰기', false, tryWrite('bg', A('E1'), TREE, { l: [] }));
t('AUTH-21d', 'editor → bg/req(동기화 요청) 쓰기', true, tryWrite('bg/req', A('E1'), TREE, NOW));
t('AUTH-21e', 'viewer → bg/req 쓰기', false, tryWrite('bg/req', A('V1'), TREE, NOW));
t('AUTH-21f', '비로그인 → bg/req 쓰기', false, tryWrite('bg/req', null, TREE, NOW));
t('AUTH-21g', 'editor → bg/l 쓰기', false, tryWrite('bg/l', A('E1'), TREE, []));
/* AUTH-22 주요 현안 — MEMBER 누구나 쓰고 지움 · 꼴 검사 · 현장 통째 삭제는 관리자 */
const T22 = { ...TREE, calapp: { ...TREE.calapp, iss: { sA: { i1: { t: '현안', at: 1, by: 'U2' } } } } };
t('AUTH-22a', 'viewer → 현안 추가', true, tryWrite('calapp/iss/sA/i2', A('U1'), T22, { t: '새 현안', at: 2, by: 'U1' }));
t('AUTH-22b', 'viewer → 남이 쓴 현안 해결 표시', true, tryWrite('calapp/iss/sA/i1', A('U1'), T22, { t: '현안', at: 1, by: 'U2', dt: 3 }));
t('AUTH-22c', 'viewer → 남이 쓴 현안 지우기', true, tryWrite('calapp/iss/sA/i1', A('U1'), T22, null));
t('AUTH-22d', 'viewer → 현장 현안 통째 삭제', false, tryWrite('calapp/iss/sA', A('U1'), T22, null));
t('AUTH-22e', '미등록 계정 → 현안 추가', false, tryWrite('calapp/iss/sA/i2', A('V1'), T22, { t: 'x', at: 2, by: 'V1' }));
t('AUTH-22f', 'viewer → 빈 내용', false, tryWrite('calapp/iss/sA/i2', A('U1'), T22, { t: '', at: 2, by: 'U1' }));
t('AUTH-22g', 'viewer → 모르는 칸', false, tryWrite('calapp/iss/sA/i2', A('U1'), T22, { t: 'x', at: 2, by: 'U1', z: 1 }));
t('AUTH-22h', 'viewer → 현안 읽기', true, tryRead('calapp/iss', A('U1'), T22));
t('AUTH-22i', 'viewer → 목표일', true, tryWrite('calapp/iss/sA/i1', A('U1'), T22, { t: '현안', at: 1, by: 'U2', due: '2026-10-30' }));
t('AUTH-22j', 'viewer → 목표일 모양 틀림', false, tryWrite('calapp/iss/sA/i1', A('U1'), T22, { t: '현안', at: 1, by: 'U2', due: '10/30' }));
/* AUTH-23 주요 현안 보드에 보일 현장 덧씀 — 팀 공통 · MEMBER 누구나 · 참거짓만 */
t('AUTH-23a', 'viewer → 현장 빼기', true, tryWrite('calapp/issHide/sA', A('U1'), T22, true));
t('AUTH-23b', 'viewer → 다시 넣기(지움)', true, tryWrite('calapp/issHide/sA', A('U1'), { ...T22, calapp: { ...T22.calapp, issHide: { sA: true } } }, null));
t('AUTH-23c', 'viewer → 넣기(false)', true, tryWrite('calapp/issHide/sA', A('U1'), T22, false));
t('AUTH-23g', 'viewer → 문자 값', false, tryWrite('calapp/issHide/sA', A('U1'), T22, 'x'));
t('AUTH-23d', '미등록 계정 → 현장 빼기', false, tryWrite('calapp/issHide/sA', A('V1'), T22, true));
t('AUTH-23e', 'viewer → 통째 지우기', false, tryWrite('calapp/issHide', A('U1'), T22, null));
t('AUTH-23f', 'viewer → 읽기', true, tryRead('calapp/issHide', A('U1'), T22));
/* AUTH-24 주요 현안 내 화면 설정 — 본인 prefs 만 */
t('AUTH-24a', 'viewer → 내 정렬·순서·접기', true, tryWrite('calapp/prefs/U1/iss', A('U1'), T22, { sort: 'mine', order: 'sA,sB', fold: 'sB', fe: true }));
t('AUTH-24b', 'viewer → 모르는 정렬', false, tryWrite('calapp/prefs/U1/iss', A('U1'), T22, { sort: 'x' }));
t('AUTH-24c', 'viewer → 남의 설정', false, tryWrite('calapp/prefs/U2/iss', A('U1'), T22, { sort: 'open' }));
/* 가입 승인 대기(1212) — 새 계정은 pending 으로만 스스로 등록, 승인 전엔 본인 기록 말고 못 읽음 */
const NW = { uid:'N1', token:{ email:'n1@hdec.co.kr', email_verified:true } };
const T25 = { ...T22, users:{ ...T22.users, N1:{ email:'n1@hdec.co.kr', role:'pending' } } };
t('AUTH-25a', '새 계정 → 스스로 승인 대기 등록', true, tryWrite('users/N1', NW, T22, { email:'n1@hdec.co.kr', role:'pending' }));
t('AUTH-25b', '새 계정 → 스스로 사용자 등록', false, tryWrite('users/N1', NW, T22, { email:'n1@hdec.co.kr', role:'viewer' }));
t('AUTH-25c', '승인 대기 → 스스로 사용자로', false, tryWrite('users/N1', NW, T25, { email:'n1@hdec.co.kr', role:'viewer' }));
t('AUTH-25d', '승인 대기 → 내 기록 읽기', true, tryRead('users/N1', NW, T25));
t('AUTH-25e', '승인 대기 → 업무 읽기', false, tryRead('calapp/tasks', NW, T25));
t('AUTH-25f', '승인 대기 → 계정 목록 읽기', false, tryRead('users', NW, T25));
t('AUTH-25g', '승인 대기 → 내 명부 쓰기', false, tryWrite('calapp/people/N1', NW, T25, { name:'n', email:'n1@hdec.co.kr', team:'', region:'', rank:'member' }));
t('AUTH-25h', '승인 대기 → 내 화면 설정', false, tryWrite('calapp/prefs/N1/iss', NW, T25, { sort:'open' }));
t('AUTH-25i', '관리자 → 승인(사용자로)', true, tryWrite('users/N1/role', A('E1'), T25, 'viewer'));
t('AUTH-25j', '사용자 → 남을 승인', false, tryWrite('users/N1/role', A('U1'), T25, 'viewer'));
t('AUTH-25k', '사용자 → 내 명부 쓰기(그대로 됨)', true, tryWrite('calapp/people/U1', A('U1'), T25, { ...P('U1'), name:'김담당2' }));
/* 계정 삭제(1213) — 관리자만 요청·gone 표시, 다른 사람은 gone 을 못 바꾼다 */
t('AUTH-26a', '관리자 → 계정 삭제 요청', true, tryWrite('calapp/acctDel/U2', A('E1'), T22, { at:1, by:'E1', email:'u2@hdec.co.kr' }));
t('AUTH-26b', '사용자 → 계정 삭제 요청', false, tryWrite('calapp/acctDel/U2', A('U1'), T22, { at:1, by:'U1', email:'u2@hdec.co.kr' }));
t('AUTH-26c', '사용자 → 삭제 요청 읽기', false, tryRead('calapp/acctDel', A('U1'), T22));
t('AUTH-26d', '관리자 → 계정 기록 지우기', true, tryWrite('users/U2', A('E1'), T22, null));
t('AUTH-26e', '관리자 → 명부 gone', true, tryWrite('calapp/people/U2', A('E1'), T22, { ...P('U2'), sites:{}, gone:1 }));
t('AUTH-26f', '팀장 → 남의 명부 gone', false, tryWrite('calapp/people/U2', A('U3'), T22, { ...P('U2'), gone:1 }));
t('AUTH-26g', '본인 → 내 명부 gone', false, tryWrite('calapp/people/U1', A('U1'), T22, { ...P('U1'), gone:1 }));
t('AUTH-26h', '팀장 → 남의 현장 배정(그대로 됨)', true, tryWrite('calapp/people/U2', A('U3'), T22, { ...P('U2'), sites:{ sA:1 } }));
/* AUTH-20~28 (1256 셀프 리뷰) — D+60 현장 통째 삭제 · 담당 현장으로 영구 삭제 · 휴지통 가짜 사본 · 미러 없는 현장 · 주인 없는 새 업무 · 현안 작성자 · 계정 삭제 보호 · 개인 설정 읽기 · 이력 키 */
const T20 = { ...TREE, calapp: { ...TREE.calapp, d60: { insp: { sA: { date: '2026-08-01', res: { arch: { k1: { a: 'ok', by: 'U1', ts: 1 } } }, units: { u1: { dg: '101', ho: '101', ord: 1 } } } } },
  trash: { U2: { siteT: { ...TR('U2','siteT'), createdBy: 'U2', site: 'sA' } } }, prefs: { U2: { emoji: 'x' } } } };
t('AUTH-20a', 'viewer → D+60 현장 점검 통째 지우기', false, tryWrite('calapp/d60/insp/sA', A('U1'), T20, null));
t('AUTH-20b', 'viewer → D+60 판정 한 칸', true, tryWrite('calapp/d60/insp/sA/res/arch/k2', A('U1'), T20, { a: 'ng', by: 'U1', ts: 2 }));
t('AUTH-20c', 'viewer → D+60 세대 한 줄 지우기', true, tryWrite('calapp/d60/insp/sA/units/u1', A('U1'), T20, null));
t('AUTH-20d', 'editor → D+60 현장 통째(백업 복원)', true, tryWrite('calapp/d60/insp/sA', A('E1'), T20, { date: '2026-08-02' }));
t('AUTH-21a', '담당 현장만 겹치는 viewer → 남의 휴지통 영구 삭제', false, tryWrite('calapp/trash/U2/siteT', A('U1'), T20, null));
t('AUTH-21b', '작성자 → 자기 휴지통 영구 삭제', true, tryWrite('calapp/trash/U2/siteT', A('U2'), T20, null));
t('AUTH-22', 'viewer → 원본 없는 휴지통 사본 심기', false, tryWrite('calapp/trash/U2/ghost', A('U1'), T20, { text: '가짜', date: '2026-08-01', deletedAt: 1, z: 'x' }));
t('AUTH-23', 'viewer → 미러에 없는 현장(sZ)을 담당에', false, tryWrite('calapp/people/U1', A('U1'), TREE, { ...P('U1'), sites: { sA: 1, sZ: 1 } }));
t('AUTH-24a', 'viewer → 작성자 없는 새 업무', false, tryWrite('calapp/tasks/U2/n1', A('U1'), TREE, { text: '새것', st: 1, createdAt: 1, updatedAt: 1 }));
t('AUTH-24b', 'viewer → 작성자=나 인 새 업무', true, tryWrite('calapp/tasks/U2/n1', A('U1'), TREE, { text: '새것', st: 1, createdAt: 1, updatedAt: 1, createdBy: 'U1' }));
t('AUTH-25a', 'viewer → 남 이름(by)으로 현안 만들기', false, tryWrite('calapp/iss/sA/i1', A('U1'), TREE, { t: '현안', at: 1, by: 'U2' }));
t('AUTH-25b', 'viewer → 내 이름으로 현안 만들기', true, tryWrite('calapp/iss/sA/i1', A('U1'), TREE, { t: '현안', at: 1, by: 'U1' }));
t('AUTH-25c', 'viewer → 없는 현장(sZ)에 현안', false, tryWrite('calapp/iss/sZ/i1', A('U1'), TREE, { t: '현안', at: 1, by: 'U1' }));
t('AUTH-26a', 'editor → 관리자 계정 삭제 요청', false, tryWrite('calapp/acctDel/E1', A('E1'), TREE, { at: 1, by: 'E1', email: 'e1@hdec.co.kr' }));
t('AUTH-26b', 'editor → 일반 계정 삭제 요청', true, tryWrite('calapp/acctDel/U1', A('E1'), TREE, { at: 1, by: 'E1', email: 'u1@hdec.co.kr' }));
t('AUTH-27a', 'viewer → 남의 개인 설정 읽기', false, tryRead('calapp/prefs/U2', A('U1'), T20));
t('AUTH-27b', 'viewer → 내 개인 설정 읽기', true, tryRead('calapp/prefs/U1', A('U1'), T20));
t('AUTH-28', '작성자 → 이력 키 25(앱은 0~19)', false, tryWrite('calapp/tasks/U2/own/hist/25', A('U2'), TREE, { t: 1, u: 'x', k: 'a' }));
/* 1268: 직무(trade) — 관리자만 정한다. 권역 「전체」(*) 인 사람은 자기 담당 현장을 모든 권역에서 고른다 */
t('AUTH-29a', '관리자 → 남의 직무 설비', true, tryWrite('calapp/people/U2', A('E1'), TREE, { ...P('U2'), trade: 'mech' }));
t('AUTH-29b', '사용자 → 내 직무 바꾸기', false, tryWrite('calapp/people/U1', A('U1'), TREE, { ...P('U1'), trade: 'elec' }));
t('AUTH-29c', '팀장 → 남의 직무 바꾸기', false, tryWrite('calapp/people/U2', A('U3'), TREE, { ...P('U2'), trade: 'mech' }));
t('AUTH-29d', '관리자 → 없는 직무 값', false, tryWrite('calapp/people/U2', A('E1'), TREE, { ...P('U2'), trade: 'xx' }));
{ const T29 = JSON.parse(JSON.stringify(TREE)); T29.calapp.people.U1 = { ...P('U1'), region: '*', trade: 'elec' };
  t('AUTH-29e', '권역 전체(설비·전기) → 내 sites 에 타권역(sB) 추가', true, tryWrite('calapp/people/U1', A('U1'), T29, { ...T29.calapp.people.U1, sites: { sA: 1, sB: 1 } }));
  t('AUTH-29f', '권역 전체 → 직무 그대로 이름 바꾸기', true, tryWrite('calapp/people/U1', A('U1'), T29, { ...T29.calapp.people.U1, name: '개명' }));
  t('AUTH-29g', '권역 전체 → 직무 지우기', false, tryWrite('calapp/people/U1', A('U1'), T29, { name: '김담당', email: 'u1@hdec.co.kr', team: 't1', region: '*', rank: 'member', sites: { sA: 1 } })); }
/* 1269 물가정보 — 단가는 MEMBER 누구나 넣고, 고치기·지우기는 넣은 사람·관리자. 찜 폴더도 같은 규칙, 찜 {f,t} 은 있는 폴더(또는 미분류 '_')로만 */
{ const IT = { n: '석고보드', sp: '9.5T', u: '장', p: 3720, s: 'g2b', m: '2026-10', by: 'U1', at: 1 };
  const T30 = JSON.parse(JSON.stringify(TREE)); T30.calapp.price = { items: { p1: IT }, fold: { f1: { n: '방수', by: 'U1', at: 1 } }, pin: {} };
  t('AUTH-30a', '팀원 → 단가 넣기', true, tryWrite('calapp/price/items/p2', A('U2'), T30, { ...IT, by: 'U2' }));
  t('AUTH-30b', '팀원 → 남의 이름(by)으로 넣기', false, tryWrite('calapp/price/items/p2', A('U2'), T30, { ...IT }));
  t('AUTH-30c', '팀원 → 남이 넣은 단가 지우기', false, tryWrite('calapp/price/items/p1', A('U2'), T30, null));
  t('AUTH-30d', '넣은 사람 → 지우기', true, tryWrite('calapp/price/items/p1', A('U1'), T30, null));
  t('AUTH-30e', '관리자 → 남의 단가 지우기', true, tryWrite('calapp/price/items/p1', A('E1'), T30, null));
  t('AUTH-30f', '기준월 형식 틀림', false, tryWrite('calapp/price/items/p2', A('U2'), T30, { ...IT, by: 'U2', m: '2026.10' }));
  t('AUTH-30g', '새 출처 키(영문 소문자)', true, tryWrite('calapp/price/items/p2', A('U2'), T30, { ...IT, by: 'U2', s: 'gm' }));
  t('AUTH-30h', '출처 키에 한글', false, tryWrite('calapp/price/items/p2', A('U2'), T30, { ...IT, by: 'U2', s: '지마켓' }));
  t('AUTH-30i', '원본 주소가 http 아님', false, tryWrite('calapp/price/items/p2', A('U2'), T30, { ...IT, by: 'U2', url: 'javascript:1' }));
  t('AUTH-30l', '팀원 → 폴더 만들기', true, tryWrite('calapp/price/fold/f2', A('U2'), T30, { n: '도배', by: 'U2', at: 1 }));
  t('AUTH-30m', '팀원 → 남의 폴더 이름 바꾸기', false, tryWrite('calapp/price/fold/f1', A('U2'), T30, { n: '바꿈', by: 'U1', at: 1 }));
  t('AUTH-30n', '팀원 → 있는 폴더에 찜', true, tryWrite('calapp/price/pin/p1', A('U2'), T30, { f: 'f1', t: '방수 하도' }));
  t('AUTH-30o', '팀원 → 미분류 찜', true, tryWrite('calapp/price/pin/p1', A('U2'), T30, { f: '_' }));
  t('AUTH-30p', '없는 폴더에 찜', false, tryWrite('calapp/price/pin/p1', A('U2'), T30, { f: 'zz' }));
  t('AUTH-30j', '찜 이름 41자', false, tryWrite('calapp/price/pin/p1', A('U2'), T30, { f: '_', t: 'ㄱ'.repeat(41) }));
  t('AUTH-30k', '찜에 다른 칸', false, tryWrite('calapp/price/pin/p1', A('U2'), T30, { f: '_', z: 1 }));
  t('AUTH-30q', '가입 대기(역할 없음) → 단가 넣기', false, tryWrite('calapp/price/items/p3', { uid: 'X9', token: { email: 'x9@hdec.co.kr', email_verified: true } }, T30, { ...IT, by: 'X9' })); }
console.log(fail ? `\nFAIL ${fail}` : '\nRULES-AUTH ALL PASS');
process.exit(fail ? 1 : 0);
