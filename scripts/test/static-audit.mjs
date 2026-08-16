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
  const orphanKey  = [...keys].filter(k => !emitted.has(k));
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
  const KEEP = /^(fc-|wf-|x-none$|r-blocked$|woff2$|s\d$)/;   /* 위 판정 원칙 + url(*.woff2) 오탐 + tk-item s${st} 동적 */
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

console.log('\n결과: FAIL ' + fail + ' · WARN ' + warn);
process.exit(fail ? 1 : 0);
