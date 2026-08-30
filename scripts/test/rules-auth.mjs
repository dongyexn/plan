/* ══════════ 규칙 침투 테스트(631차) — AUTH-01~10 ══════════
   Firebase 에뮬레이터(Java 의존)를 못 쓰는 환경이라, 이 앱의 규칙이 실제로 쓰는 표현 부분집합
   (child/val/exists/==/!=/&&/||/?:/auth/root/data/newData/$변수/matches)을 그대로 JS 로 평가한다.

   ⚠ 근사의 한계(정직하게):
   - RTDB 의 '상위 .write 허용이 하위를 전부 연다' cascade 는 흉내내지 않는다 — 이 앱 규칙은
     calapp 레벨에 .write 가 없어(각 노드가 자기 .write 를 가진다) 해당 시맨틱이 발동하지 않는다.
     static-audit 와 별개로, 여기서도 상위 .write 부재를 검사해 전제가 깨지면 FAIL 로 알린다.
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
  isNumber() { return typeof this.v === 'number'; }
  isString() { return typeof this.v === 'string'; }
  isBoolean() { return typeof this.v === 'boolean'; }
}

function evalExpr(expr, ctx) {
  let e = expr;
  for (const [k, v] of Object.entries(ctx.vars || {})) e = e.split(k).join(JSON.stringify(v));
  e = e.replace(/\.matches\(/g, '.match(');            /* 규칙 matches → JS match(truthy 사용) */
  const fn = new Function('auth', 'root', 'data', 'newData', 'return (' + e + ');');
  return !!fn(ctx.auth, ctx.root, ctx.data, ctx.newData);
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

/* 상위에 .write 가 있으면 cascade 근사 전제가 깨진다 — 검사 */
function noAncestorWrite(pathArr) {
  let node = rules;
  for (const seg of pathArr) {
    if (node['.write'] !== undefined && node !== rules) return false; /* 루트 .write:false 는 무시 */
    if (node[seg]) { node = node[seg]; continue; }
    const wc = Object.keys(node).find(k => k.startsWith('$'));
    if (!wc) return true;
    node = node[wc];
  }
  return true;
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

function tryWrite(pathStr, auth, treeRoot, newVal) {
  const pathArr = pathStr.split('/').filter(Boolean);
  const found = ruleNodeAt(pathArr);
  if (!found || found.node['.write'] === undefined) return { ok: false, why: '.write 없음' };
  if (!noAncestorWrite(pathArr)) return { ok: false, why: '상위 .write 존재 — 근사 전제 붕괴' };
  const ctx = { auth, root: new N(treeRoot), data: new N(pathArr.reduce((n, k) => (n || {})[k], treeRoot) ?? null), vars: found.vars };
  const nd = new N(newVal === undefined ? null : newVal);
  if (!evalExpr(found.node['.write'], { ...ctx, newData: nd })) return { ok: false, why: '.write 거부' };
  if (newVal != null && !validateAll(found.node, found.vars, ctx, nd, ctx.data)) return { ok: false, why: '.validate 거부' };
  return { ok: true };
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
/* AUTH-12 게시 산출물 — 만드는 쪽은 관리자만 */
t('AUTH-12a', 'viewer → analysis 쓰기', false, tryWrite('analysis/sA/2026-07', A('U1'), TREE, '<p>의견</p>'));
t('AUTH-12b', 'editor → analysis 쓰기', true, tryWrite('analysis/sA/2026-07', A('E1'), TREE, '<p>의견</p>'));
t('AUTH-13a', 'viewer → meta 쓰기', false, tryWrite('meta/sA', A('U1'), TREE, { updatedAt: 1, updatedBy: 'U1' }));
t('AUTH-13b', 'editor → meta 쓰기', true, tryWrite('meta/sA', A('E1'), TREE, { updatedAt: 1, updatedBy: 'E1' }));
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

console.log(fail ? `\nFAIL ${fail}` : '\nRULES-AUTH ALL PASS');
process.exit(fail ? 1 : 0);
