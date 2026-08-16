/* 브라우저 스모크 — `?local=1` 모드에서 핵심 흐름을 실제로 눌러 본다.
   정적 감사(static-audit)가 못 잡는 부류(동작이 실제로 되는가)를 배포 전에 확인한다.

   실행:  npm i playwright-core   (한 번만 — 저장소에는 넣지 않는다)
          node scripts/test/smoke.mjs
   브라우저: 환경변수 CHROMIUM 에 크로미움 경로를 주면 그걸 쓰고,
             없으면 playwright 기본 설치 경로를 쓴다(CI 는 install 단계에서 받는다).

   시나리오 — 실제 회귀가 났던 경로만 최소로:
   ① 부팅: 달력이 그려진다
   ② 생성: 업무 추가 → 제목 입력 → 자동 저장 → 일자 패널에 카드
   ③ 토글: 상태 원을 눌러 완료로
   ④ 삭제: 카드 열어 삭제 → 확인 → 휴지통으로 이동
   ⑤ 복원: 설정 > 휴지통 > 복원 → 카드가 되살아난다 · 새로고침 후에도 남는다 */
import { chromium } from 'playwright-core';
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
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
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
  await page.waitForTimeout(900);                 /* 자동 저장 디바운스 대기 */
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
  await page.waitForTimeout(400);
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
  await page.waitForTimeout(500);
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
  await page.waitForTimeout(500);
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
  await page.waitForTimeout(2300);                     /* archMigrate(1.8초) 대기 */
  const moved = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('calapp.v1') || '{}');
    return { hot: !!((d.tasks.team || {}).arcSmk1), cold: !!(((d.archive || {}).team || {}).arcSmk1) };
  });
  if (!moved.hot && moved.cold) OK('아카이브 — 옛 완료 업무가 보관함으로 이동');
  else F('아카이브 — 이동 실패 (핫 ' + moved.hot + ' · 보관 ' + moved.cold + ')');

  /* ⑦ 찾기 — 보관함에 있어도 검색으로 다시 찾아진다 */
  await page.keyboard.press('Control+k');
  await page.waitForSelector('#nqQ', { timeout: 4000 });
  await page.fill('#nqQ', '아카이브');          /* fill 이 input 이벤트를 내 rNq 가 돈다 */
  await page.waitForTimeout(700);
  const found = await page.locator('#nqRes .nq-item .tt').allTextContents();
  if (found.some(t => t.includes('아카이브'))) OK('찾기 — 보관함 업무 검색됨');
  else F('찾기 — 보관함 업무가 검색되지 않음 (' + found.join(' / ') + ')');

  if (errs.length) F('페이지 오류 ' + errs.length + '건: ' + errs[0]);
  else OK('페이지 오류 없음');
} catch (e) {
  F('시나리오 중단: ' + String(e).slice(0, 300));
} finally {
  await browser.close(); srv.close();
}
console.log('\n결과: FAIL ' + fail);
process.exit(fail ? 1 : 0);
