/* 브라우저 스모크 — `?local=1` 모드에서 핵심 흐름을 실제로 눌러 본다.
   정적 감사(static-audit)가 못 잡는 부류(동작이 실제로 되는가)를 배포 전에 확인한다.

   실행:  npm ci   (한 번만 — 저장소에는 넣지 않는다)
          node scripts/test/smoke.mjs
   브라우저: 환경변수 CHROMIUM 에 크로미움 경로를 주면 그걸 쓰고,
             없으면 playwright 기본 설치 경로를 쓴다(CI 는 install 단계에서 받는다).

   시나리오 — 실제 회귀가 났던 경로만 최소로:
   ① 부팅: 달력이 그려진다
   ② 생성: 업무 추가 → 제목 입력 → 자동 저장 → 일자 패널에 카드
   ③ 토글: 상태 원을 눌러 완료로
   ④ 삭제: 카드 열어 삭제 → 확인 → 휴지통으로 이동
   ⑤ 복원: 설정 > 휴지통 > 복원 → 카드가 되살아난다 · 새로고침 후에도 남는다 */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = 8391;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.woff2': 'font/woff2', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

let fail = 0;
const OK = m => console.log('ok    ' + m);
const F = m => { fail++; console.log('FAIL  ' + m); };

/* ⚠ 고정 대기(waitForTimeout)를 쓰지 말 것 — CI 러너는 개발 PC 보다 몇 배 느려서
   로컬에서만 통과하는 시험이 된다. 조건이 참이 될 때까지 폴링한다. */
const waitFor = async (page, fn, arg, ms = 15000, label = '') => {
  const t0 = Date.now();
  for (;;) {
    if (await page.evaluate(fn, arg)) return true;
    if (Date.now() - t0 > ms) throw new Error('조건 대기 시간 초과' + (label ? ': ' + label : ''));
    await page.waitForTimeout(100);
  }
};
/* 로컬 저장소의 업무 트리를 그대로 읽어 온다 — 화면 표식보다 흔들림이 적다 */
const store = page => page.evaluate(() => JSON.parse(localStorage.getItem('calapp.v1') || '{}'));

/* 저장소를 그대로 띄우는 정적 서버 — 의존성 없이 */
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => srv.listen(PORT, r));

const exe = process.env.CHROMIUM || undefined;
let browser;
try { browser = await chromium.launch(exe ? { executablePath: exe } : {}); }
catch (e) {
  console.log('FAIL  브라우저를 실행하지 못했습니다 — `npx playwright install chromium` 을 먼저 돌리세요.');
  console.log('      (환경변수 CHROMIUM 으로 실행 파일 경로를 직접 줄 수도 있습니다)');
  console.log('      ' + String(e).split('\n')[0]);
  srv.close(); process.exit(1);
}
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e).slice(0, 200)));

try {
  /* ① 부팅 */
  await page.goto(`http://localhost:${PORT}/index.html?local=1`);
  await page.waitForSelector('#fcal .fc-daygrid-day', { timeout: 8000 });
  OK('부팅 — 달력 렌더');

  /* ② 생성 — 업무 추가 → 제목 입력(입력 중 자동 저장) → 체크(저장하고 닫기) */
  const TITLE = '스모크 시험 업무';
  await page.click('[data-act="plan.new"]');
  await page.waitForSelector('#peTitle', { timeout: 4000 });
  await page.fill('#peTitle', TITLE);
  await waitFor(page, t => {                      /* 자동 저장이 실제로 끝날 때까지 */
    const d = JSON.parse(localStorage.getItem('calapp.v1') || '{}');
    for (const sid in (d.tasks || {})) for (const iid in d.tasks[sid])
      if (d.tasks[sid][iid].text === t) return true;
    return false;
  }, TITLE, 15000, '자동 저장');
  await page.click('[data-act="plan.cancel"]');   /* 체크 = 저장하고 닫기 */
  await page.waitForSelector('.plan .plan-t', { timeout: 4000 });
  const cardTxt = await page.locator('.plan .plan-t').first().textContent();
  if ((cardTxt || '').includes(TITLE)) OK('생성 — 일자 패널에 카드');
  else F('생성 — 카드가 보이지 않음 (본문: ' + cardTxt + ')');

  /* ③ 토글 — 저장된 상태 확인은 localStorage 로 직접 본다(화면 표식은 회차마다 달라질 수 있다) */
  const stBefore = await page.evaluate(t => {
    const d = JSON.parse(localStorage.getItem('calapp.v1') || '{}');
    for (const sid in (d.tasks || {})) for (const iid in d.tasks[sid])
      if (d.tasks[sid][iid].text === t) return { sid, iid, st: d.tasks[sid][iid].st };
    return null;
  }, TITLE);
  if (!stBefore) F('저장 — localStorage 에 업무가 없음');
  else OK('저장 — localStorage 기록 (st=' + stBefore.st + ')');
  await page.click('[data-act="plan.stCycle"]');
  await waitFor(page, k => {
    const d = JSON.parse(localStorage.getItem('calapp.v1') || '{}');
    return (((d.tasks[k.sid] || {})[k.iid] || {}).st) !== k.st;
  }, stBefore, 15000, '상태 토글');
  const stAfter = await page.evaluate(k => {
    const d = JSON.parse(localStorage.getItem('calapp.v1') || '{}');
    return ((d.tasks[k.sid] || {})[k.iid] || {}).st;
  }, stBefore);
  if (stAfter !== stBefore.st) OK('토글 — 상태 변경 (' + stBefore.st + '→' + stAfter + ')');
  else F('토글 — 상태가 그대로');

  /* ④ 삭제 → 휴지통 — 카드의 수정 버튼으로 폼을 열면 삭제 버튼이 나온다 */
  await page.click('.plan [data-act="plan.edit"]');
  await page.waitForSelector('[data-act="plan.del"]', { timeout: 4000 });
  await page.click('[data-act="plan.del"]');
  await page.waitForSelector('[data-act="modal.ok"]', { timeout: 4000 });
  await page.click('[data-act="modal.ok"]');
  await waitFor(page, t => {
    const d = JSON.parse(localStorage.getItem('calapp.v1') || '{}');
    for (const sid in (d.trash || {})) for (const iid in d.trash[sid])
      if (d.trash[sid][iid].text === t) return true;
    return false;
  }, TITLE, 15000, '휴지통 이동');
  const inTrash = await page.evaluate(t => {
    const d = JSON.parse(localStorage.getItem('calapp.v1') || '{}');
    for (const sid in (d.trash || {})) for (const iid in d.trash[sid])
      if (d.trash[sid][iid].text === t) return true;
    return false;
  }, TITLE);
  const stillTask = await page.evaluate(k => {
    const d = JSON.parse(localStorage.getItem('calapp.v1') || '{}');
    return !!((d.tasks[k.sid] || {})[k.iid]);
  }, stBefore);
  if (inTrash && !stillTask) OK('삭제 — 휴지통으로 이동');
  else F('삭제 — 휴지통 ' + inTrash + ' · 원본 잔존 ' + stillTask);

  /* ⑤ 복원 — 설정 > 휴지통 > 복원, 새로고침 후 지속 */
  await page.click('[data-act="nav.go"][data-view="settings"], [data-view="settings"]');
  await page.waitForSelector('[data-act="trash.open"]', { timeout: 4000 });
  await page.click('[data-act="trash.open"]');
  await page.waitForSelector('[data-act="trash.restore"]', { timeout: 4000 });
  await page.click('[data-act="trash.restore"]');
  await waitFor(page, t => {
    const d = JSON.parse(localStorage.getItem('calapp.v1') || '{}');
    for (const sid in (d.tasks || {})) for (const iid in d.tasks[sid])
      if (d.tasks[sid][iid].text === t) return true;
    return false;
  }, TITLE, 15000, '복원 반영');
  await page.reload();
  await page.waitForSelector('#fcal .fc-daygrid-day', { timeout: 8000 });
  const back = await page.evaluate(t => {
    const d = JSON.parse(localStorage.getItem('calapp.v1') || '{}');
    for (const sid in (d.tasks || {})) for (const iid in d.tasks[sid])
      if (d.tasks[sid][iid].text === t) return true;
    return false;
  }, TITLE);
  if (back) OK('복원 — 새로고침 후에도 남음');
  else F('복원 — 업무가 되살아나지 않음');

  /* ⑥ 아카이브 — 오래 끝난 업무를 심고 새로고침하면 보관함으로 옮겨진다 */
  const OLDT = '아카이브 시험 업무';
  await page.evaluate(t => {
    const d = JSON.parse(localStorage.getItem('calapp.v1') || '{}');
    d.tasks = d.tasks || {}; (d.tasks.team = d.tasks.team || {}).arcSmk1 =
      { text: t, st: 2, date: '2024-03-05', createdAt: 1709000000000, updatedAt: 1709600000000 };
    localStorage.setItem('calapp.v1', JSON.stringify(d));
  }, OLDT);
  await page.reload();
  await page.waitForSelector('#fcal .fc-daygrid-day', { timeout: 8000 });
  await waitFor(page, () => {                          /* archMigrate 가 끝날 때까지 */
    const d = JSON.parse(localStorage.getItem('calapp.v1') || '{}');
    return !!(((d.archive || {}).team || {}).arcSmk1);
  }, null, 20000, '아카이브 이동');
  const moved = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('calapp.v1') || '{}');
    return { hot: !!((d.tasks.team || {}).arcSmk1), cold: !!(((d.archive || {}).team || {}).arcSmk1) };
  });
  if (!moved.hot && moved.cold) OK('아카이브 — 옛 완료 업무가 보관함으로 이동');
  else F('아카이브 — 이동 실패 (핫 ' + moved.hot + ' · 보관 ' + moved.cold + ')');

  /* ⑦ 찾기 — 보관함에 있어도 검색으로 다시 찾아진다 */
  await page.keyboard.press('Control+k');
  /* 457차: 검색 입력은 헤더 검색창으로 옮겼다(패널 안 입력은 위젯·모바일 전용) */
  await page.waitForSelector('#ahQ', { timeout: 4000 });
  await page.fill('#ahQ', '아카이브');          /* fill 이 input 이벤트를 내 rNq 가 돈다 */
  await waitFor(page, () => {                   /* 아카이브를 읽어 다시 그릴 때까지 */
    const els = document.querySelectorAll('#nqRes .nq-item .tt');
    return [...els].some(e => e.textContent.includes('아카이브'));
  }, null, 20000, '찾기 결과');
  const found = await page.locator('#nqRes .nq-item .tt').allTextContents();
  if (found.some(t => t.includes('아카이브'))) OK('찾기 — 보관함 업무 검색됨');
  else F('찾기 — 보관함 업무가 검색되지 않음 (' + found.join(' / ') + ')');

  /* ⑨ 반복 — 주간 반복을 만들고, 다음 주 회차가 뜨고, 한 회차만 제외되는지(422차) */
  await page.keyboard.press('Escape');
  const RT = '반복 스모크 점검';
  const today = await page.evaluate(() => todayStr());
  const nextWk = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); });
  await page.evaluate(ds => { selDate(ds, true); rDay(); }, today);
  await page.click('[data-act="plan.new"]');
  await page.waitForSelector('#peTitle', { timeout: 4000 });
  await page.fill('#peTitle', RT);
  await page.click('#peMoreBtn');
  await page.selectOption('#peRec', 'w');
  await page.click('[data-act="plan.cancel"]');   /* 저장하고 닫기 */
  await waitFor(page, t => {
    const d = JSON.parse(localStorage.getItem('calapp.v1') || '{}');
    for (const sid in (d.tasks || {})) for (const iid in d.tasks[sid])
      if (d.tasks[sid][iid].text === t && d.tasks[sid][iid].recur && d.tasks[sid][iid].recur.f === 'w') return true;
    return false;
  }, RT, 15000, '반복 저장');
  OK('반복 — 주간 반복으로 저장 (recur.f=w)');
  await page.evaluate(ds => { selDate(ds, true); rDay(); }, nextWk);
  await waitFor(page, t => [...document.querySelectorAll('#dpList .plan-t')].some(e => e.textContent.includes(t)),
    RT, 15000, '다음 주 회차');
  const occ2 = await page.evaluate(t => [...document.querySelectorAll('#dpList .plan-t')].some(e => e.textContent.includes(t)), RT);
  if (occ2) OK('반복 — 다음 주 같은 요일에 회차가 뜬다');
  else F('반복 — 다음 주 회차가 안 보인다');
  /* 다음 주 회차를 열어 "이 날짜만 제외" */
  await page.click('#dpList .plan [data-act="plan.edit"]');
  await page.waitForSelector('[data-act="plan.del"]', { timeout: 4000 });
  await page.click('[data-act="plan.del"]');           /* 반복 회차의 삭제 → 선택 모달 */
  await page.waitForSelector('[data-act="plan.skipOcc"]', { timeout: 4000 });
  await page.click('[data-act="plan.skipOcc"]');       /* "이 날짜만 제외" */
  await waitFor(page, t => {
    const d = JSON.parse(localStorage.getItem('calapp.v1') || '{}');
    for (const sid in (d.tasks || {})) for (const iid in d.tasks[sid]) {
      const it = d.tasks[sid][iid];
      if (it.text === t && it.skipOn && Object.keys(it.skipOn).length) return true;
    }
    return false;
  }, RT, 15000, 'skipOn 기록');
  const afterSkip = await page.evaluate(([t, ds]) => {
    selDate(ds, true); rDay();
    const gone = ![...document.querySelectorAll('#dpList .plan-t')].some(e => e.textContent.includes(t));
    const d = JSON.parse(localStorage.getItem('calapp.v1') || '{}');
    let skip = false;
    for (const sid in (d.tasks || {})) for (const iid in d.tasks[sid]) {
      const it = d.tasks[sid][iid];
      if (it.text === t && it.skipOn && Object.keys(it.skipOn).length) skip = true;
    }
    return { gone, skip };
  }, [RT, nextWk]);
  const origLeft = await page.evaluate(([t, ds]) => { selDate(ds, true); rDay();
    return [...document.querySelectorAll('#dpList .plan-t')].some(e => e.textContent.includes(t)); }, [RT, today]);
  if (afterSkip.gone && afterSkip.skip && origLeft) OK('반복 — 이 날짜만 제외: 그날은 빠지고 원래 날짜는 남는다');
  else F('반복 — 제외 실패 (사라짐 ' + afterSkip.gone + ' · skipOn ' + afterSkip.skip + ' · 원날짜 ' + origLeft + ')');

  /* 469차: 인라인 CSS 가 끝까지 파싱되는지 — 주석 미닫힘·중괄호 붕괴는 오류 없이 규칙을 삼킨다.
     실제 화면이 깨져도 정적 검사·오류 로그로는 안 잡히므로 파싱 결과를 직접 센다. */
  const cssStat = await page.evaluate(() => {
    const inl = [...document.styleSheets].filter(s => !s.href);
    const our = inl[inl.length - 1];
    let n = 0; try { n = our.cssRules.length; } catch (e) { n = -1; }
    const last = (() => { try { const r = [...our.cssRules]; const x = r[r.length - 1];
      return (x.selectorText || x.cssText || '').slice(0, 60); } catch (e) { return ''; } })();
    return { n, last, mcg: (() => { const g = document.querySelector('.mc-g');
      return g ? getComputedStyle(g).display : 'none'; })() };
  });
  if (cssStat.n >= 1800) OK('CSS 전량 파싱 (' + cssStat.n + '개 규칙)');
  else F('CSS 파싱이 중간에 끊겼다 — 주석 미닫힘·중괄호 붕괴 의심 (' + cssStat.n + '개에서 멈춤, 마지막: ' + cssStat.last + ')');

  /* 689차: 기간 업무 라벨 — 완료 패널이 occ 로 끝날짜를 넘겨 「8/31–8/31」로 찍히던 회귀 */
  const lbl = await page.evaluate(() => {
    const it = { text: '기간', date: '2026-08-29', end: '2026-08-31', color: 'auto', assignees: {}, st: 1, createdAt: 1, updatedAt: 1 };
    const m = taskItemHTML('t1', 'x', it, false, '', { site: false, who: false }, '2026-08-31').match(/tkc-d[^>]*>([^<]*)/);
    return m ? m[1] : '';
  });
  if (lbl === '8/29–8/31') OK('기간 업무 라벨 — occ(끝날짜)를 받아도 시작–끝 (' + lbl + ')');
  else F('기간 업무 라벨 이상: ' + JSON.stringify(lbl));
  /* 689차: 가로 페이드 — data-sbx 요소는 잘린 쪽만 sb-fade-l/r 을 받는다 */
  const hx = await page.evaluate(async () => {
    const d = document.createElement('div'); d.setAttribute('data-sbx', ''); d.style.cssText = 'width:100px;overflow-x:auto;white-space:nowrap';
    d.innerHTML = '<span style="display:inline-block;width:400px">x</span>'; document.body.appendChild(d);
    fadeOne(d); const a = d.className; d.scrollLeft = 150; fadeOne(d); const b = d.className; d.scrollLeft = 999; fadeOne(d); const c = d.className;
    d.setAttribute('data-sbx', 'r'); d.scrollLeft = 150; fadeOne(d); const r = d.className; d.remove();
    return { a, b, c, r };
  });
  if (hx.a === 'sb-fade-r' && hx.b.split(' ').sort().join(' ') === 'sb-fade-l sb-fade-r' && hx.c === 'sb-fade-l' && hx.r === 'sb-fade-r') OK('가로 페이드 — 시작 r · 중간 l+r · 끝 l · data-sbx=r 은 오른쪽만');
  else F('가로 페이드 클래스 이상: ' + JSON.stringify(hx));

  /* 692차: 현장 순서(권역 → 준공일 → 이름) · 드래그 범위 안 우클릭 「업무 추가」는 범위를 지킨다 */
  const so = await page.evaluate(() => {
    const regs = [{ id: 'r1', name: 'R1' }, { id: 'r2', name: 'R2' }];
    const sites = [{ id: 'a', name: 'C', region: 'r2', completionDate: '2026-05-01' }, { id: 'b', name: 'B', region: 'r1', completionDate: '2024-01-01' },
      { id: 'c', name: 'A', region: 'r1', completionDate: '2025-06-01' }, { id: 'd', name: 'D', region: 'r1' }, { id: 'e', name: 'E', region: 'r2', completionDate: '2023-01-01' }];
    const order = sites.sort(siteCmp(regs)).map(x => x.id).join('');
    const was = { d: S.selDate, e: S.selEnd };
    selRange('2026-09-08', '2026-09-11');
    const cell = document.querySelector('#fcal td[data-date="2026-09-10"]') || document.querySelector('#fcal td.fc-daygrid-day');
    const keep = cell ? (() => { const it = ctxFor(cell); const inRange = cell.dataset.date >= '2026-09-08' && cell.dataset.date <= '2026-09-11'; return { inRange, lbl: it[0].label, endBefore: S.selEnd }; })() : null;
    S.selDate = was.d; S.selEnd = was.e;
    return { order, keep };
  });
  if (so.order === 'cbdae') OK('현장 순서 — 권역 → 준공일 최신 위 → 준공일 없음 뒤 (' + so.order + ')');
  else F('현장 순서 이상: ' + so.order);
  if (so.keep && (!so.keep.inRange || /기간/.test(so.keep.lbl))) OK('드래그 범위 안 우클릭 — 「이 기간에 업무 추가」');
  else F('우클릭 범위 유지 이상: ' + JSON.stringify(so.keep));

  /* 695차: 담당자·현장 삭제는 우클릭 → 확인 모달 → 실행. 표에는 삭제 버튼이 없다 */
  const del = await page.evaluate(async () => {
    store.putOrg({ teams: [{ id: 't1', name: 'T' }], regions: [{ id: 'r1', name: 'R' }], sites: [{ id: 'sX', name: 'X', region: 'r1', team: 't1' }, { id: 'sY', name: 'Y', region: 'r1', team: 't1' }] });
    store.putPerson('p1', { name: 'P1', email: '', team: 't1', region: 'r1', rank: 'member', sites: { sX: 1 } });
    store.putPerson('p2', { name: 'P2', email: '', team: 't1', region: 'r1', rank: 'member', sites: { sY: 1 } });
    S.accounts = { p1: { name: 'P1', role: 'editor' }, p2: { name: 'P2', role: 'editor' } }; S.user = { uid: 'p1' }; S.tk.t = 't1'; rosterBust(); rAll();
    go('org'); S.orgTab = 'site'; rOrg(); rOrgBar('site'); await new Promise(r => setTimeout(r, 100));
    const noBtn = !document.querySelector('#siteRoot [data-act="org.delSite"]');
    const sItems = ctxFor(document.querySelector('#siteRoot .mgtbl tr[data-sid="sY"] td'));
    sItems[0].act(); await new Promise(r => setTimeout(r, 100));
    const sModal = /현장 삭제/.test(document.querySelector('#mt').textContent);
    document.querySelector('[data-act="modal.ok"]').click(); await new Promise(r => setTimeout(r, 200));
    const siteGone = !S.org.sites.some(x => x.id === 'sY') && !(S.people.p2.sites || {}).sY;
    S.orgTab = 'acct'; rOrg(); rOrgBar('acct'); await new Promise(r => setTimeout(r, 100));
    const pItems = ctxFor(document.querySelector('#acctRoot .utbl tr[data-pid="p2"] td'));
    pItems[0].act(); await new Promise(r => setTimeout(r, 100));
    const pModal = /담당자 삭제/.test(document.querySelector('#mt').textContent);
    document.querySelector('[data-act="modal.ok"]').click(); await new Promise(r => setTimeout(r, 200));
    const personGone = !!S.people.p2 && S.people.p2.team === '' && S.people.p2.name === 'P2' && !Object.keys(S.people.p2.sites || {}).length;   /* 696차: 지우지 않고 미배정으로 */
    ACT['org.delPerson']({ dataset: { id: 'p1' } }); await new Promise(r => setTimeout(r, 100));
    const selfBlocked = !!S.people.p1 && !document.querySelector('#mo').classList.contains('open');
    return { noBtn, sModal, siteGone, pModal, personGone, selfBlocked };
  });
  if (del.noBtn && del.sModal && del.siteGone) OK('현장 삭제 — 표에 버튼 없음 · 우클릭 → 확인 모달 → 사람 배정도 해제');
  else F('현장 삭제 흐름 이상: ' + JSON.stringify(del));
  if (del.pModal && del.personGone && del.selfBlocked) OK('담당자 삭제 — 우클릭 → 확인 모달 → 미배정으로(이름 유지) · 본인은 차단');
  else F('담당자 삭제 흐름 이상: ' + JSON.stringify(del));

  /* 696차: 현장 표 편집은 초안 → [저장] 한 번. 나가면 묻는다 */
  const dr = await page.evaluate(async () => {
    go('org'); S.orgTab = 'site'; rOrg(); rOrgBar('site'); await new Promise(r => setTimeout(r, 100));
    const inp = document.querySelector('#siteRoot input[data-f="units"][data-id="sX"]'); inp.value = '777'; inp.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    const pending = orgDraftN() === 1 && (S.org.sites.find(x => x.id === 'sX').units || 0) !== 777 && !document.querySelector('#orgSaveBar').hidden;
    go('calendar'); await new Promise(r => setTimeout(r, 100));
    const asked = document.querySelector('#mo').classList.contains('open') && S.view === 'org';
    document.querySelector('[data-act="modal.ok"]').click(); await new Promise(r => setTimeout(r, 150));
    const saved = S.org.sites.find(x => x.id === 'sX').units === 777 && S.view === 'calendar' && orgDraftN() === 0;
    return { pending, asked, saved };
  });
  if (dr.pending && dr.asked && dr.saved) OK('현장 표 초안 — 바로 저장 안 함 · 나갈 때 묻고 저장');
  else F('현장 표 초안 흐름 이상: ' + JSON.stringify(dr));

  if (errs.length) F('페이지 오류 ' + errs.length + '건: ' + errs[0]);
  else OK('페이지 오류 없음');
} catch (e) {
  F('시나리오 중단: ' + String(e).slice(0, 300));
} finally {
  await browser.close(); srv.close();
}
console.log('\n결과: FAIL ' + fail);
process.exit(fail ? 1 : 0);
