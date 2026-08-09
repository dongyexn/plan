/* 브라우저 스모크 — `npm i puppeteer` 가 되는 PC 에서 `node scripts/test/smoke.mjs` 로 실행한다.
   (⚠ 회사 PC 는 npm 이 TLS 검사로 막힌다 — 집 PC 나 GitHub Actions 에서 돌릴 것.)
   ?local=1 로 띄워 로그인 없이: 콘솔 오류 0 · 4xx/5xx 0 · 5개 화면 전환 · 달력 42칸을 확인한다.
   ⚠ 서버와 puppeteer 는 이 한 스크립트 안에서 함께 띄운다 — 따로 띄운 백그라운드 서버는
   도구 호출 사이에 죽는다(과거 검증 함정). */
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.woff2': 'font/woff2', '.md': 'text/markdown; charset=utf-8' };
const srv = createServer((req, res) => {
  let p = req.url.split('?')[0]; if (p === '/') p = '/index.html';
  const f = path.join(root, decodeURIComponent(p));
  if (fs.existsSync(f) && fs.statSync(f).isFile()) {
    res.setHeader('Content-Type', mime[path.extname(f)] || 'application/octet-stream');
    res.end(fs.readFileSync(f));
  } else { res.statusCode = 404; res.end('nf'); }
}).listen(8901);

const { default: puppeteer } = await import('puppeteer');
const br = await puppeteer.launch({ args: ['--no-sandbox'] });
const pg = await br.newPage();
const errs = [], bad = [];
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
pg.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
await pg.setViewport({ width: 1440, height: 900 });
await pg.goto('http://localhost:8901/index.html?local=1', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 2000));

let fail = 0;
const chk = (name, ok, detail) => { console.log((ok ? 'ok    ' : 'FAIL  ') + name + (detail ? '  ' + detail : '')); if (!ok) fail++; };

chk('달력 42칸(fixedWeekCount 6주)', await pg.$$eval('.fc-daygrid-day', els => els.length) === 42);
for (const v of ['tasks', 'report', 'org', 'settings', 'defect', 'calendar']) {
  await pg.evaluate(vv => { const b = document.querySelector(`[data-act="nav.go"][data-view="${vv}"]`); if (b) b.click(); }, v);
  await new Promise(r => setTimeout(r, 500));
  chk('화면 전환 ' + v, await pg.$eval('#view-' + v, el => el.classList.contains('act')).catch(() => false));
}
chk('콘솔 오류 0', errs.length === 0, errs.slice(0, 3).join(' | '));
chk('4xx/5xx 0', bad.length === 0, bad.slice(0, 3).join(' | '));

await br.close(); srv.close();
console.log('\n결과: FAIL ' + fail);
process.exit(fail ? 1 : 0);
