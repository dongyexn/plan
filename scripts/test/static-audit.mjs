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

/* 1-b. 주석 닫힘 — 파일 끝까지 열린 채 남은 주석만 잡는다.
   ⚠ 중간에서 닫는 기호를 잃으면 뒤 주석의 닫는 기호와 짝이 맞아 여기서는 안 걸린다.
   그 경우는 smoke 의 'CSS 전량 파싱' 검사가 규칙 수로 잡는다(469차). */
{
  const unclosed = (src, isJS) => {
    let i = 0;
    while (i < src.length) {
      const c = src[i], n = src[i + 1];
      if (c === '/' && n === '*') {
        const e = src.indexOf('*/', i + 2);
        if (e < 0) return src.slice(i, i + 90).replace(/\s+/g, ' ');
        i = e + 2; continue;
      }
      if (isJS && c === '/' && n === '/') { const e = src.indexOf('\n', i); i = e < 0 ? src.length : e + 1; continue; }
      if (c === '"' || c === "'" || (isJS && c === '`')) {
        let k = i + 1;
        while (k < src.length) { if (src[k] === '\\') { k += 2; continue; } if (src[k] === c) break; k++; }
        i = k + 1; continue;
      }
      i++;
    }
    return null;
  };
  const style = html.slice(html.indexOf('<style>') + 7, html.indexOf('</style>'));
  let bad = 0;
  for (const [src, name, isJS] of [[style, 'CSS', false], [js, 'JS', true]]) {
    const hit = unclosed(src, isJS);
    if (hit) { F(name + ' 주석이 닫히지 않았다 — 뒤 내용이 통째로 무시된다: ' + hit); bad++; }
  }
  if (!bad) OK('주석 닫힘 (CSS·JS)');
}

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
  /* change·input·mousedown 델리게이트가 dataset.act 로 직접 처리하는 액션도 '짝이 있는' 것으로 본다(442차) */
  for (const m of js.matchAll(/dataset\.act\s*===\s*'([a-z][\w.]*)'/g)) keys.add(m[1]);
  for (const m of js.matchAll(/data-act="([a-z][\w.]*)"\]/g)) keys.add(m[1]);
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
  const KEEP = /^(fc-|wf-|x-none$|r-blocked$|woff2$|s\d$|insight-block$|ib-body$|warn$|ev-g-\w+$)/;   /* 678차: ev-g-* 는 'ev-g-'+토큰 으로 조립한다(GRADS 대조는 8-b 에서 따로 한다) */   /* insight-*: 분석 의견 원문(DB 저장 HTML)의 클래스 — 마크업엔 없다(427차) */   /* 위 판정 원칙 + url(*.woff2) 오탐 + tk-item s${st} 동적 */
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
  const seg = rules.slice(rules.indexOf('"tasks"'), rules.indexOf('"trash"'));   /* 627차: 고정 3500자 창이 소유 규칙 추가로 모자랐다 — 블록 경계로 */

  /* 633차: 무지개 그라디언트는 app.js(RAINBOW_BG)와 index.html(.ev-rb)에 이중 정의 — 값이 갈리면 잡는다 */
  {
    const mApp = /RAINBOW_BG='([^']+)'/.exec(js);
    /* 676차: 단축 background 를 쓰면 position 까지 !important 로 굳어 흐름 애니메이션이 죽는다 — longhand 를 본다 */
    const mCss = /#fcal \.fc-event\.ev-rb\{background-image:([^!]+) !important/.exec(html);
    if (!mApp || !mCss) F('무지개 정의를 찾지 못했다(RAINBOW_BG 또는 .ev-rb)');
    else if (mApp[1].replace(/\s+/g,'') !== mCss[1].trim().replace(/\s+/g,''))
      F('무지개 그라디언트 이중 정의 불일치 — app.js RAINBOW_BG 와 index.html .ev-rb');
    /* ⚠ CSS 주석을 먼저 걷어낸다 — 주석 안에도 셀렉터 문자열이 있어 정규식이 그쪽을 문다 */
    const cssNC=html.replace(/\/\*[\s\S]*?\*\//g,'');
    const mTeamRule=/(?:^|[};])\s*#fcal \.fc-event\.ev-rb\.team\{([\s\S]*?)\}/m.exec(cssNC);   /* 쉼표로 이어진 셀렉터(reduce 블록)를 물지 않도록 앞을 못박는다 */
    if (!mTeamRule) F('공통 무지개 막대의 ID급 팀 전용 CSS가 누락됐다');
    else if (!mTeamRule[1].includes('padding-box') || !mTeamRule[1].includes('border-box')) F('공통 무지개 막대의 흰 내부/무지개 테두리 CSS가 불완전하다');
    else OK('무지개 공통 막대 — ID급 team 구체성 규칙 유지');
    /* 676차 회귀 방지: 무지개 막대에 닿는 규칙이 단축 background 나 background-position 을 쓰면 흐름이 멈춘다.
       (실제로 `#fcal .fc-event.team{background:#fff!important}` 하나 때문에 공통 막대가 멈춰 있었다) */
    {
      const bad=[];
      const rx=/(#fcal \.fc-event(?:\.ev-rb|\.team)[^{]*)\{([^}]*)\}/g;
      let m;while((m=rx.exec(cssNC))){
        if(/:not\(\.ev-rb\)/.test(m[1])) continue;   /* 무지개를 제외한 규칙은 흐름과 무관하다(12월 공통 막대 등) */
        if(/(^|;|\s)background\s*:/.test(m[2])) bad.push(m[1].trim()+' — 단축 background');
        if(/background-position\s*:/.test(m[2])) bad.push(m[1].trim()+' — background-position 선언');
      }
      if(bad.length) F('무지개 막대 흐름이 죽는 선언: '+bad.join(' / '));
      else OK('무지개 막대 흐름 — 단축 background·background-position 선언 없음');
    }
    if(!/@keyframes rbflow\{/.test(html)||!/@keyframes rbflow2\{/.test(html)) F('무지개 흐름 키프레임(rbflow·rbflow2) 누락');
    else OK('무지개 흐름 키프레임 2종(일반 1레이어 · 공통 2레이어)');
    /* 677차: 무지개 두 종 — 고정('rainbow')과 흐름('rainbow-anim'/.ev-fx)이 갈려 있어야 한다.
       흐름을 .ev-rb 에 도로 걸면 고정을 고른 사람 화면까지 움직인다. */
    {
      const mBase=/(?:^|[};])\s*#fcal \.fc-event\.ev-rb\{([\s\S]*?)\}/m.exec(cssNC);
      if(mBase&&/animation\s*:/.test(mBase[1])) F('고정 무지개(.ev-rb)에 애니메이션이 걸려 있다 — 흐름은 .ev-fx 전용이다');
      else if(!/#fcal \.fc-event\.ev-rb\.ev-fx\{[^}]*animation\s*:/.test(cssNC)) F('흐름 무지개(.ev-fx) 애니메이션 규칙 누락');
      else if(!/#fcal \.fc-event\.ev-rb\.ev-fx\.team\{[^}]*rbflow2/.test(cssNC)) F('흐름 무지개 공통 막대(.ev-fx.team)가 rbflow2 를 안 쓴다 — 레이어 수 불일치로 멈춘다');
      /* ⚠ 677차: 머리쪽 전역 규칙이 동작 줄이기에서 모든 애니메이션을 !important 로 죽인다.
         흐름 무지개는 그 안에서 되살려야 한다 — 예외가 사라지면 사용자 눈에는 '안 움직인다'로 보인다. */
      else if(!/#fcal \.fc-event\.ev-fx\{animation-duration:8s!important;animation-iteration-count:infinite!important;\}/.test(cssNC))
        F('동작 줄이기 예외가 없다 — 전역 reduce 규칙이 흐름 무지개까지 멈춘다');
      else if(/ev-fx[^}]*animation\s*:\s*none/.test(cssNC)) F('흐름 무지개를 어딘가에서 끄고 있다');
      else OK('무지개 두 종 분리 — 고정(.ev-rb) · 흐름(.ev-fx)');
      /* 678차: 그라디언트 7종도 app.js(GRADS)와 index.html(.ev-g-*)에 이중 정의 — 무지개와 같은 방식으로 대조한다 */
      {
        const mG=/const GRADS=\{([\s\S]*?)\};/.exec(js);
        if(!mG) F('GRADS 정의를 찾지 못했다');
        else{
          const pairs=[...mG[1].matchAll(/'(grad-\w+)'\s*:\s*'([^']+)'/g)].map(m=>[m[1],m[2]]);
          if(pairs.length!==7) F('그라디언트 색이 7종이 아니다: '+pairs.length);
          const bad=pairs.filter(([k,v])=>!cssNC.includes('#fcal .fc-event.ev-g-'+k.slice(5)+'{--gb:'+v+';}'));
          if(bad.length) F('그라디언트 이중 정의 불일치(app.js GRADS ↔ index.html .ev-g-*): '+bad.map(x=>x[0]).join(', '));
          else if(!/#fcal \.fc-event\.ev-gd\{[^}]*var\(--gb\)/.test(cssNC)) F('그라디언트 막대 기본 규칙(.ev-gd)이 --gb 를 안 쓴다');
          else if(!/#fcal \.fc-event\.ev-gd\.team\{[^}]*var\(--gb\)/.test(cssNC)) F('공통 그라디언트 막대(.ev-gd.team) 규칙 누락');
          else if(!/\.pal-row\.pal-grad\{/.test(html)) F('팔레트 그라디언트 줄(.pal-row.pal-grad) 누락');
          else if(!/#fcal \.fc-event\.ev-gd\.ev-fx\{[^}]*animation\s*:/.test(cssNC)) F('그라디언트 흐름 규칙(.ev-gd.ev-fx) 누락');
          else if(!/#fcal \.fc-event\.ev-gd\.ev-fx\.team\{[^}]*rbflow2/.test(cssNC)) F('공통 그라디언트 흐름(.ev-gd.ev-fx.team)이 rbflow2 를 안 쓴다');
          else if(pairs.some(([,v])=>{const m=/#([0-9A-Fa-f]{6})[^,]*0%.*#([0-9A-Fa-f]{6})[^,]*100%/.exec(v);return !m||m[1].toLowerCase()!==m[2].toLowerCase();}))
            F('그라디언트가 첫 색으로 닫혀 있지 않다 — 흐름에서 이음매가 보인다(A→…→A 규약)');
          else if(!js.includes("g+GRAD_ANIM")) F('팔레트에 그라디언트 흐름 칩이 없다');
          else OK('그라디언트 7종 — 이중 정의 일치 · 고정/흐름 두 벌 · 첫 색으로 닫힘');
        }
      }
      /* 682차: 스킨 고르기는 되돌렸다. 남은 것은 12월 자동 크리스마스 하나뿐이고,
         그 규칙이 직접 고른 색(무지개·그라디언트)까지 덮으면 안 된다는 것만 지킨다. */
      {
        const rules=[...cssNC.matchAll(/body\.dec #fcal \.fc-event\.team([^{]*)\{/g)];
        if(rules.length<2) F('12월 크리스마스 규칙이 없다');
        else if(rules.some(m=>!/:not\(\.ev-rb\)/.test(m[1])||!/:not\(\.ev-gd\)/.test(m[1])))
          F('크리스마스 규칙이 무지개·그라디언트 막대까지 덮는다 — :not(.ev-rb):not(.ev-gd) 를 빠뜨렸다');
        else if(/skin-/.test(cssNC)||js.includes('SKINS')) F('되돌린 스킨 고르기 잔재가 남아 있다');
        else OK('12월 크리스마스 — 직접 고른 색을 덮지 않는다');
      }
      if(!js.includes("const RB_ANIM='rainbow-anim'")) F("흐름 무지개 토큰(RB_ANIM) 정의 누락");
      else if(!js.includes("data-c=\"'+RB_ANIM+'\"")) F('팔레트에 흐름 무지개 칩이 없다');
      else if(!/\.pal-c\.pal-fx::after\{/.test(html)) F('흐름 무지개 칩의 재생 삼각형(.pal-fx::after) 누락');
      else OK('팔레트 — 흐름 무지개 칩 + 재생 삼각형');
    }
  }
  const allowed = new Set([...seg.matchAll(/"(\w+)"\s*:\s*\{/g)].map(m => m[1]));
  const miss = [...new Set(writes)].filter(f => !allowed.has(f));
  if (miss.length) F('cleanTask 가 쓰는데 규칙 tasks 에 없는 필드: ' + miss.join(', ') + '  (규칙 먼저 게시!)');
  else OK('cleanTask 필드 전부 규칙에 존재 (' + new Set(writes).size + '개)');
}

/* ── 8-b. 무지개 색 원 렌더 경로 — rainbow 토큰을 CSS에 그대로 흘리지 않는다(633차) ── */
{
  const bad = [
    /background:\'+esc\(planColor\(/,
    /background:\'+esc\(c\)/
  ].filter(re => re.test(js));
  if (bad.length) F('무지개 토큰이 변환 없이 inline background 로 흘러갈 수 있는 경로가 남아 있음');
  else OK('무지개 색 원 — colBg() 변환 경로 유지');
  if (!js.includes("rb?' p-col-rainbow':''")) F('공통/일반 색 원의 p-col-rainbow 클래스 부착 로직 누락');
  else OK('무지개 색 원 — p-col-rainbow 클래스 부착');
  if (!js.includes("isRainbow(planColor(p))?['ev-rb']:[]")) F('FullCalendar 무지개 ev-rb 클래스 경로 누락');
  else OK('FullCalendar 무지개 — 공통/일반 공통 ev-rb 경로');
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
  '.pe-bar :: gap',
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
  /* @keyframes 안의 from/to/0%… 는 셀렉터가 아니다 — 블록째 제외(440차) */
  for (;;) {
    const km = body.match(/@keyframes[^{]*\{/);
    if (!km) break;
    let j = km.index + km[0].length, depth = 1;
    while (depth > 0 && j < body.length) { if (body[j] === '{') depth++; else if (body[j] === '}') depth--; j++; }
    body = body.slice(0, km.index) + body.slice(j);
  }
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

/* ── 12. 배포본에 작업 잔재가 섞였는가(608차) ────────────────────
   608차에 검증용으로 만든 `_modal.html`(529KB)이 저장소에 남아 배포 zip 에 그대로 실려 나갔다.
   앱은 멀쩡히 돌아서 다른 검사에 전혀 안 걸렸다 — 사람이 눈으로 볼 수밖에 없는 부류였다.
   임시 파일에 쓰는 이름꼴만 잡는다(오탐이 나면 이름을 바꾸는 편이 낫다). */
{
  const JUNK = /(^_|\.(tmp|bak|orig|rej)$|^snap.*\.html$|^test.*\.html$|~$)/;
  const SKIP = new Set(['node_modules', 'dist', '.git']);
  const found = [];
  const walk = (rel) => {
    for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) { walk(r); continue; }
      if (JUNK.test(e.name)) found.push(r);
    }
  };
  walk('');
  /* 665차: 이름꼴만으로는 못 잡는 부류 — 테스트가 뱉은 산출물 폴더가 통째로 실려 나갔다(e2e/ 3MB).
     쓰지 않는 무거운 폴더는 이름으로 직접 잡는다. */
  const ART = ['e2e', 'shots', 'out', 'tmp'];
  for (const d of ART) {
    const abs = path.join(root, d);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) found.push(d + '/ (테스트 산출물)');
  }
  /* 배포본 크기 — 잔재가 섞이면 대개 여기서 먼저 티가 난다.
     ⚠ 666차에 8MB 로 잡았더니 정상 저장소(문서·아이콘 포함)가 바로 걸렸다.
     숫자만 던지면 뭘 지워야 할지 알 수 없으므로 **무거운 항목을 같이 찍는다**.
     한계는 12MB — vendor(4.2MB)와 문서가 자라도 여유가 있고, 3MB짜리 잔재 폴더가 들어오면 걸린다. */
  const size = {};
  let bytes = 0;
  const sz = (rel, topKey) => { for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const r = rel ? rel + '/' + e.name : e.name;
    const key = topKey || (e.isDirectory() ? e.name + '/' : e.name);
    if (e.isDirectory()) sz(r, key);
    else { const n = fs.statSync(path.join(root, r)).size; bytes += n; size[key] = (size[key] || 0) + n; } } };
  sz('', null);
  const mb = bytes / 1048576;
  const top = Object.entries(size).sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([k, v]) => k + ' ' + (v / 1048576).toFixed(1) + 'MB').join(' · ');
  if (mb > 12) F('배포본 ' + mb.toFixed(1) + 'MB — 12MB 초과. 무거운 항목: ' + top);
  else OK('배포본 크기 ' + mb.toFixed(1) + 'MB (' + top + ')');
  if (found.length) F('배포본에 작업 잔재 ' + found.length + '개 — 지우고 다시 묶을 것: ' + found.join(' · '));
  else OK('작업 잔재 없음 (임시 파일·산출물 폴더 검사)');
}


/* 637차 업무 저장 partial update 경로 감사 */
{
  const start=js.indexOf('const FbStore');
  const end=js.indexOf('/* 서버에 남은 예전 구조',start);
  const fbStore=start>=0&&end>start?js.slice(start,end):'';
  if(!fbStore.includes('r.update(patch)')) F('FbStore.putTask partial update diff 누락');
  else OK('업무 저장 partial update diff 경로');
}

console.log('\n결과: FAIL ' + fail + ' · WARN ' + warn);
process.exit(fail ? 1 : 0);

