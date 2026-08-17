/* 정적 감사 — 의존성 없이 `node scripts/test/static-audit.mjs` 로 실행한다.
   회차마다 배포 전 한 번 돌려서, 181차 전수 감사에서 실제로 나온 부류의 문제
   (죽은 함수 · 짝 잃은 data-act · 죽은 CSS · title/data-tip 혼용 · 규칙-cleanTask 불일치 ·
    외부 CDN 재유입 · 버전 쿼리 태그 훼손)가 다시 생기지 않았는지 확인한다.
   FAIL 이 하나라도 있으면 종료 코드 1. WARN 은 사람이 판단한다.

   ⚠ 판정 원칙 — 과거 회차에서 확인된 함정을 그대로 반영한다:
   · fc-*             FullCalendar 가 만들어 붙인다 (라이브러리 생성 클래스는 데드 아님)
   · x-none           명시도 부스터 (110차) — 데드 아님
   · r-blocked        문자열 조합으로 만들어진다 (110차) — 데드 아님
   · wf-*, view-*     'wf-'+f · 'view-'+v 동적 조합 (181차 확인) — 데드 아님
   · wid.goDate/goTask  row() 도우미의 첫 인자로 발신된다 — '미발신' 아님 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const js = rd('app.js');
const html = rd('index.html');

const rules = rd('database.rules.json');
const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const htmlNoStyle = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');
const hay = htmlNoStyle + js;   /* 클래스·id 사용처를 찾는 건초 더미 (위젯은 같은 웹앱을 띄우므로 별도 소스 없음) */

let fail = 0, warn = 0;
const F = m => { fail++; console.log('FAIL  ' + m); };
const W = m => { warn++; console.log('WARN  ' + m); };
const OK = m => console.log('ok    ' + m);

/* ── 1. 구문 ─────────────────────────────────────────── */
for (const f of ['app.js', 'build-single.mjs']) {
  try { execFileSync(process.execPath, ['--check', path.join(root, f)], { stdio: 'pipe' }); }
  catch (e) { F(f + ' 구문 오류\n' + String(e.stderr).slice(0, 400)); }
}
OK('구문 검사 (node --check)');

/* ── 2. 죽은 함수 — 정의 말고는 아무 데서도 안 부르는 이름 ── */
{
  const all = hay;
  const decls = [...js.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_][\w$]*)\s*\(/g)].map(m => m[1]);
  const dead = decls.filter(n => (all.match(new RegExp('\\b' + n + '\\b', 'g')) || []).length <= 1);
  if (dead.length) W('정의뿐인 함수 후보: ' + dead.join(', ') + '  (동적 호출이 아닌지 확인 후 제거)');
  else OK('죽은 함수 없음 (' + decls.length + '개 검사)');
}

/* ── 3. data-act 짝 — 발신했는데 핸들러 없음(FAIL) / 핸들러만 있음(WARN) ── */
{
  const ROW_EMITTED = ['wid.goDate', 'wid.goTask'];           /* row() 도우미로 발신 */
  const emitted = new Set([...hay.matchAll(/data-act="([^"$]+)"/g)].map(m => m[1]));
  ROW_EMITTED.forEach(a => { if (js.includes("row('" + a + "'")) emitted.add(a); });
  /* 핸들러 존재는 문자열 유무로 본다 — ACT 맵 키('x.y':)뿐 아니라
     change/blur 위임(closest('[data-act="x.y"]'))으로 처리되는 것도 핸들러다(select 는 click 위임에 안 걸린다) */
  const orphanEmit = [...emitted].filter(a => a.includes('.')
    && !js.includes("'" + a + "'") && !js.includes('"' + a + '"'));
  const keys = new Set([...js.matchAll(/'([a-z][\w]*\.[\w]+)'\s*:\s*(?:async\s*)?(?:function|\(|[A-Za-z_$][\w$]*\s*=>)/g)].map(m => m[1]));
  const DIRECT_CALL = new Set(['plan.moveOcc']);   /* change 델리게이트가 ACT[]로 직접 부르는 액션 — data-act 발신처가 없다(428차) */
  const orphanKey  = [...keys].filter(k => !emitted.has(k) && !DIRECT_CALL.has(k));
  if (orphanEmit.length) F('핸들러 없는 data-act: ' + orphanEmit.join(', '));
  if (orphanKey.length)  W('발신처 없는 핸들러(UI 를 지울 때 짝을 안 지운 흔적): ' + orphanKey.join(', '));
  if (!orphanEmit.length && !orphanKey.length) OK('data-act 짝 일치 (' + emitted.size + '개 발신)');
}

/* ── 4. 툴팁 — title= 는 data-tip 과 겹치면 노란 기본 툴팁이 같이 뜬다(179차) ── */
{
  const t = (js.match(/ title="/g) || []).length + (htmlNoStyle.match(/ title="/g) || []).length;
  if (t) W('title= 속성 ' + t + '곳 잔존 — data-tip 으로 통일하거나 의도를 주석으로 남길 것');
  else OK('title= 잔존 없음 (툴팁은 data-tip 단일)');
}

/* ── 5. 죽은 CSS 클래스 ─────────────────────────────── */
{
  const KEEP = /^(fc-|wf-|x-none$|r-blocked$|woff2$|s\d$|insight-block$|ib-body$|warn$)/;   /* insight-*: 분석 의견 원문(DB 저장 HTML)의 클래스 — 마크업엔 없다(427차) */   /* 위 판정 원칙 + url(*.woff2) 오탐 + tk-item s${st} 동적 */
  const cls = new Set([...css.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(m => m[1]));
  const dead = [...cls].filter(c => !KEEP.test(c) &&
    !new RegExp('[\'"`\\s<>=.(]' + c.replace(/-/g, '\\-') + '[\'"`\\s<>.,)\\]}:$]').test(hay));
  if (dead.length) W('사용처 없는 CSS 클래스 후보: ' + dead.sort().join(', ') +
    '  (⚠ 지우기 전에 콤마 그룹·:not 부스터·동적 조합을 줄 단위로 확인)');
  else OK('죽은 CSS 클래스 없음 (' + cls.size + '종 검사)');
}

/* ── 6. 버전 쿼리 태그 — build-single.mjs 와 같은 정규식으로 존재 확인 ── */
{
  const m = html.match(/<script src="\.\/app\.js\?v=(\d+)"><\/script>/);
  if (!m) F('app.js?v=N 스크립트 태그가 깨졌다 — 캐시 사고(158차 이전) 방지 장치');
  else OK('버전 쿼리 v=' + m[1] + ' (배포 시 숫자를 올렸는지 눈으로 확인)');
}

/* ── 7. 외부 스크립트 재유입 — vendor 자체 호스팅 원칙(176·181차) ── */
{
  const ext = [...html.matchAll(/<script src="(https?:[^"]+)"/g)].map(m => m[1]);
  if (ext.length) F('외부 호스트 스크립트 재유입: ' + ext.join(', ') + '  (vendor/ 로 옮길 것)');
  else OK('스크립트 전부 자체 호스팅');
}

/* ── 8. 규칙 ↔ cleanTask 필드 동기 — $other:false 가 write 전체를 거부한다 ── */
{
  const body = js.slice(js.indexOf('function cleanTask'), js.indexOf('function cleanTask') + 1600);
  const writes = [...body.matchAll(/\bo\.(\w+)\s*=/g)].map(m => m[1])
    .concat([...body.matchAll(/\bo=\{([^}]*)\}/gs)].flatMap(m => [...m[1].matchAll(/(\w+)\s*:/g)].map(x => x[1])));
  const seg = rules.slice(rules.indexOf('"tasks"'), rules.indexOf('"tasks"') + 3500);
  const allowed = new Set([...seg.matchAll(/"(\w+)"\s*:\s*\{/g)].map(m => m[1]));
  const miss = [...new Set(writes)].filter(f => !allowed.has(f));
  if (miss.length) F('cleanTask 가 쓰는데 규칙 tasks 에 없는 필드: ' + miss.join(', ') + '  (규칙 먼저 게시!)');
  else OK('cleanTask 필드 전부 규칙에 존재 (' + new Set(writes).size + '개)');
}

/* ── 9. 단일 파일 빌드 시험 — 태그 정규식이 어긋나면 여기서 잡힌다 ── */
{
  try { execFileSync(process.execPath, [path.join(root, 'build-single.mjs')], { stdio: 'pipe' });
        fs.rmSync(path.join(root, 'dist'), { recursive: true, force: true });
        OK('build-single.mjs 정상'); }
  catch (e) { F('build-single.mjs 실패: ' + String(e.stderr || e).slice(0, 300)); }
}

/* ── 9-1. 버전 두 곳 일치(390차) — APP_VER 와 index.html 의 app.js?v=NNN 은 같은 숫자여야 한다.
        예전엔 semver 를 따로 뒀다가 배포마다 손으로 맞춰야 했다. 이제 기계가 본다. ── */
{
  const av = (js.match(/const APP_VER='(\d+)'/) || [])[1];
  const qv = (html.match(/app\.js\?v=(\d+)/) || [])[1];
  if (!av || !qv) F('버전 값을 찾지 못했습니다 (APP_VER=' + av + ' · ?v=' + qv + ')');
  else if (av !== qv) F('버전 불일치: APP_VER=' + av + ' vs app.js?v=' + qv + '  (zip 이름도 calapp-v' + qv + ' 여야 한다)');
  else OK('버전 일치 (APP_VER = ?v = ' + av + ')');
}

/* ── 10. 인수인계 문서 ↔ 실제 파일 대조(383차) — 문서가 없는 파일을 안내하면 없느니만 못하다.
        HANDOFF.md '파일 구성' 표의 백틱 경로가 실제로 존재하는지 본다(끝이 / 면 폴더). ── */
{
  const ho = rd('HANDOFF.md');
  const tbl = ho.slice(ho.indexOf('## 2. 파일 구성'), ho.indexOf('## 3.'));
  const paths = [...tbl.matchAll(/^\|\s*`([^`]+)`/gm)].map(m => m[1]);
  const gone = paths.filter(p => !fs.existsSync(path.join(root, p.replace(/\/$/, ''))));
  if (!paths.length) W('HANDOFF.md 파일 구성 표를 찾지 못함 — 형식이 바뀌었으면 이 검사도 고칠 것');
  else if (gone.length) F('HANDOFF.md 가 안내하는데 실제로 없는 파일: ' + gone.join(', ') + '  (문서를 현행화할 것)');
  else OK('HANDOFF 파일 구성 표 실존 (' + paths.length + '개)');
}


/* ── 11. CSS 늦은 재선언 감시(422차) ──────────────────────────────
   같은 셀렉터를 파일 뒤쪽에서 다시 선언해 같은 프로퍼티를 덮으면, 앞의 수정이
   말없이 무효가 된다(§frow margin 사고). 기존 재선언은 베이스라인으로 동결하고
   → 새로 생기는 재선언만 잡는다. 의도적 재선언이면 베이스라인에 항목을 추가할 것. */
{
  const CSS_DUP_BASELINE = new Set([
  '#fcal .dhol.off :: color',
  '#fcal .fc-day-today .dnum :: height',
  '#fcal .fc-day-today .dnum :: margin',
  '#fcal .fc-day-today .dnum :: min-width',
  '#fcal .fc-day-today .dnum :: padding',
  '#fcal .fc-day-today .dnum :: width',
  '#fcal .fc-event :: border-radius',
  '#fcal .fc-popover :: background',
  '#fcal .fc-popover :: border-radius',
  '#fcal .fc-popover :: box-shadow',
  '#fcal .fc-popover-header :: background',
  '#fcal .fc-popover-header :: color',
  '#fcal .fc-popover-header :: font-size',
  '#fcal .fc-popover-header :: font-weight',
  '#fcal .fc-scrollgrid :: border-radius',
  '#sidebar.mini .teamsel :: height',
  '#sidebar.mini .teamsel :: justify-content',
  '#sidebar.mini .teamsel :: padding',
  '#view-defect #dfPrintPages .ait :: font-size',
  '#view-defect #dfPrintPages .ait :: line-height',
  '#view-defect #dfPrintPages .dn-side .canv :: align-self',
  '#view-defect #dfPrintPages .dn-side .canv :: flex',
  '#view-defect #dfPrintPages .dn-side .canv :: height',
  '#view-defect #dfPrintPages .dn-side .canv :: max-height',
  '#view-defect #dfPrintPages .dn-side .canv :: max-width',
  '#view-defect #dfPrintPages .dn-side .canv :: width',
  '#view-defect #dfPrintPages .dn-side .lg .cnt :: font-size',
  '#view-defect #dfPrintPages .dn-side .lg .cnt :: padding',
  '#view-defect #dfPrintPages .dn-side .lg .cnt :: text-align',
  '#view-defect #dfPrintPages .dn-side .lg .cnt :: white-space',
  '#view-defect #dfPrintPages .dn-side .lg .it :: gap',
  '#view-defect #dfPrintPages .dn-side .lg .it :: grid-template-columns',
  '#view-defect #dfPrintPages .dn-side .lg .it :: height',
  '#view-defect #dfPrintPages .dn-side .lg .it :: line-height',
  '#view-defect #dfPrintPages .dn-side .lg .nm :: font-size',
  '#view-defect #dfPrintPages .dn-side .lg .nm :: min-width',
  '#view-defect #dfPrintPages .dn-side .lg .nm :: overflow',
  '#view-defect #dfPrintPages .dn-side .lg .nm :: text-overflow',
  '#view-defect #dfPrintPages .dn-side .lg .nm :: white-space',
  '#view-defect #dfPrintPages .dn-side .lg .pct :: font-size',
  '#view-defect #dfPrintPages .dn-side .lg .pct :: min-width',
  '#view-defect #dfPrintPages .dn-side .lg .pct :: padding',
  '#view-defect #dfPrintPages .dn-side .lg .pct :: text-align',
  '#view-defect #dfPrintPages .dn-side .lg .pct :: white-space',
  '#view-defect #dfPrintPages .dn-side .lg :: align-self',
  '#view-defect #dfPrintPages .dn-side .lg :: flex',
  '#view-defect #dfPrintPages .dn-side .lg :: font-size',
  '#view-defect #dfPrintPages .dn-side .lg :: min-width',
  '#view-defect #dfPrintPages .dn-side .lg :: overflow',
  '#view-defect #dfPrintPages .dn-side .lg.lg-2col :: column-gap',
  '#view-defect #dfPrintPages .dn-side .lg.lg-2col :: display',
  '#view-defect #dfPrintPages .dn-side .lg.lg-2col :: grid-auto-flow',
  '#view-defect #dfPrintPages .dn-side .lg.lg-2col :: grid-template-columns',
  '#view-defect #dfPrintPages .dn-side .lg.lg-2col :: grid-template-rows',
  '#view-defect #dfPrintPages .dn-side .lg.lg-2col :: min-width',
  '#view-defect #dfPrintPages .dn-side .lg.lg-2col :: row-gap',
  '#view-defect #dfPrintPages .dn-side :: align-items',
  '#view-defect #dfPrintPages .dn-side :: gap',
  '#view-defect #dfPrintPages .dn-side :: height',
  '#view-defect #dfPrintPages .dn-side :: justify-content',
  '#view-defect #dfPrintPages .dn-side :: max-height',
  '#view-defect #dfPrintPages .dn-side :: min-height',
  '#view-defect #dfPrintPages .dn-side :: overflow',
  '#view-defect #dfPrintPages .dn-side :: padding',
  '#view-defect #dfPrintPages .main-chart-card :: aspect-ratio',
  '#view-defect #dfPrintPages .main-chart-card :: height',
  '#view-defect #dfPrintPages .main-chart-card :: min-height',
  '.acct-btn :: height',
  '.acct-pane :: min-height',
  '.bp :: background',
  '.day-panel :: min-height',
  '.dp-edit .frow :: margin-bottom',
  '.dp-edit .frow2 :: display',
  '.dp-edit .frow2 :: gap',
  '.mc-d .dots i :: background',
  '.mc-d.sel .dots i,.mc-d.today .dots i :: background',
  '.mg-grid :: grid-template-columns',
  '.mgtbl :: border-collapse',
  '.mgtbl :: width',
  '.mgtbl td :: padding',
  '.mgtbl td :: vertical-align',
  '.msel-b :: height',
  '.nic :: border-radius',
  '.nic :: height',
  '.nic :: width',
  '.nvi :: gap',
  '.nvi :: margin-bottom',
  '.nvi :: padding',
  '.nvi.act .nic :: background',
  '.nvi.act .nic svg :: color',
  '.nvi:not(.act) .nic :: background',
  '.pd-b :: color',
  '.pe-bar :: padding',
  '.pe-bar::after :: left',
  '.pe-bar::after :: right',
  '.pe-body :: padding',
  '.pe-side :: gap',
  '.pe-ttl :: font-size',
  '.pe-ttl :: line-height',
  '.pe-ttl :: padding',
  '.plan-side :: gap',
  '.rpt .page :: box-shadow',
  '.rpt .page :: margin',
  '.rpt .page :: min-height',
  '.tb-ic :: height',
  '.tb-ic :: width',
  '.tk-acts :: gap',
  '.tk-ico .icn :: height',
  '.tk-ico .icn :: width',
  '.tk-ico.on :: color',
  '.tk-ico.on :: opacity',
  '.tk-ico:hover :: background',
  '.tk-ico:hover :: color',
  '.tk-item+.tk-item>.tk-row::before :: left',
  '.tk-item.editing .tk-row .cell-inp,.tk-item.editing .tk-row select :: margin-left',
  '.tk-item.editing .tk-row .cell-inp,.tk-item.editing .tk-row select :: padding-left',
  '.tk-item.editing .tk-row select :: padding-right',
  '.tk-item.open :: background',
  '.tk-list :: gap',
  '.tkl-s .tk-row :: grid-template-columns',
  '.tkl-s-w .tk-row :: grid-template-columns',
  '.tkmain :: flex',
  '.tkmain :: min-height',
  '.tks-item .rk :: font-size',
  '.tks-item :: font-size',
  '.tks-item :: padding',
  '.tks-item.sub :: font-size',
  '.tkside :: display',
  '.tkside :: flex-direction',
  '.tkside :: gap',
  '.tkside :: min-height',
  '.tm-empty :: padding',
  '100% :: transform',
  'body.wid #fcal :: font-size',
  'body.wid .cal-title :: font-size',
  'body.wid.glass .cal-title,body.wid.glass .cal-title .y :: color',
  'textarea.inp :: min-height',
  'to :: transform'
  ]);
  let body = css.replace(/\/\*[\s\S]*?\*\//g, '');
  /* @media 블록은 스코프가 달라 제외 */
  let flat = ''; let i = 0;
  for (;;) {
    const m = body.slice(i).match(/@media[^{]*\{/);
    if (!m) { flat += body.slice(i); break; }
    flat += body.slice(i, i + m.index);
    let j = i + m.index + m[0].length, depth = 1;
    while (depth > 0 && j < body.length) { if (body[j] === '{') depth++; else if (body[j] === '}') depth--; j++; }
    i = j;
  }
  const seen = new Map();   /* sel → [props…] 목록 */
  for (const m of flat.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim().replace(/\s+/g, ' ');
    if (!sel || sel.startsWith('@')) continue;
    const props = new Set(m[2].split(';').map(p => p.split(':')[0].trim()).filter(Boolean));
    if (!seen.has(sel)) seen.set(sel, []);
    seen.get(sel).push(props);
  }
  const fresh = [];
  for (const [sel, blocks] of seen) {
    if (blocks.length < 2) continue;
    for (let a = 0; a < blocks.length; a++) for (let b = a + 1; b < blocks.length; b++)
      for (const p of blocks[a]) if (blocks[b].has(p) && !CSS_DUP_BASELINE.has(sel + ' :: ' + p)) fresh.push(sel + ' :: ' + p);
  }
  if (fresh.length) F('CSS 재선언 신규 ' + fresh.length + '건 — 앞선 규칙을 말없이 덮는다: ' + [...new Set(fresh)].slice(0, 5).join(' · '));
  else OK('CSS 재선언 신규 없음 (베이스라인 ' + CSS_DUP_BASELINE.size + '건 동결)');
}

console.log('\n결과: FAIL ' + fail + ' · WARN ' + warn);
process.exit(fail ? 1 : 0);
