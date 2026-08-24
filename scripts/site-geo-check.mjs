/* 현장 위치 찾기 진단 — 어느 현장이 왜 안 찍히는지 표로 뽑는다(609차 이후).
 *
 * 왜 필요한가
 *   지도에 안 뜨는 현장이 있어도 앱은 이유를 알려 주지 않는다. 이름이 색인에 없어서인지,
 *   후보가 여럿이라 버려진 것인지, 권역(힌트)이 비어서인지 구분이 안 된다.
 *   이 스크립트는 app.js 의 kmFind/kmAuto 를 **그대로 옮겨** 후보와 판정 사유를 함께 보여 준다.
 *
 * ⚠ 밖으로 나가는 요청이 없다. 사내 PC 에서 node 로 돌리면 되고, 현장명은 이 컴퓨터를 벗어나지 않는다.
 *
 * 쓰는 법
 *   1) 아래 SITES 에 현장을 적는다. name 은 필수, addr·region 은 있으면 적는다.
 *      (앱과 같은 규칙 — 주소가 있으면 주소를 먼저 쓰고, region 은 권역 이름 힌트로 쓴다)
 *   2) node scripts/site-geo-check.mjs
 *
 * 읽는 법
 *   찍힘   … 어느 색인에서 어떤 이름으로 걸렸는지. 등급이 '시군구'·'시도' 면 그 지역 어딘가라는 뜻이라
 *            단지 자리는 아니다. 지도 축척에서는 대개 티가 안 나지만 확대하면 어긋난다.
 *   못찍음 … 사유가 함께 나온다. 후보가 아예 없으면 '색인에 없음',
 *            멀리 흩어져 버린 것이면 '후보가 100km 넘게 흩어짐(546차 규칙으로 안 찍음)'.
 *   후보   … 상위 6개. 엉뚱한 이름이 1등이면 그게 '잘못 짚음'의 원인이다.
 */
import fs from 'fs';
import path from 'path';

/* ─────────────── 여기에 현장을 적는다 ─────────────── */
const SITES = [
  // { name: '힐스테이트 두정역', addr: '', region: '중부1' },
  // { name: '○○○ ○○',          addr: '충청남도 천안시 서북구 두정동 000', region: '중부1' },
];
/* ────────────────────────────────────────────────── */

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = fs.readFileSync(path.join(root, 'vendor', 'korea-geo.js'), 'utf8');
const KRGEO = JSON.parse(src.slice(src.indexOf('window.KRGEO=') + 13, src.lastIndexOf(';')));
let KRAPT = null;
try {
  const a = fs.readFileSync(path.join(root, 'vendor', 'apt-geo.js'), 'utf8');
  const i = a.indexOf('window.KRAPT=');
  if (i >= 0) KRAPT = JSON.parse(a.slice(i + 13, a.lastIndexOf(';')));
} catch (e) { /* 없으면 그냥 넘어간다 — 앱과 같다 */ }

/* ── 아래는 app.js 에서 옮긴 것이다. app.js 를 고치면 여기도 맞출 것 ── */
const KM_JD = [0, 0];   /* 제주 네모 옮김값 — 진단에서는 자리만 보므로 0 으로 둔다 */
const KM_STOP = /힐스테이트|현대건설|아파트|오피스텔|주상복합|단지|현장|생활권|블록|구역|지구|신도시|트리풀시티/g;
const kmWords = t => String(t || '').replace(KM_STOP, ' ').split(/[^가-힣0-9A-Za-z]+/).filter(w => w.length > 1);
const kmBare = n => String(n).replace(/(특별자치시|특별자치도|광역시|특별시|동|읍|면|가|시|군|구)$/, '');

function kmFind(text, hint) {
  const g = KRGEO; if (!g || !g.dong) return [];
  const ws = kmWords(text); if (!ws.length) return [];
  const hs = ws.concat(kmWords(hint || ''));
  const hit = [];
  const scan = (srcIdx, kind, base) => {
    const pool = (kind === '읍면동' || kind === '법정동') ? ws : hs;
    for (const pc in srcIdx) srcIdx[pc].forEach(a => {
      const b = kmBare(a[0]);
      if (b.length < 2) return;
      if (kind === '단지' ? !pool.some(w => w.indexOf(b) >= 0 || b.indexOf(w) >= 0 && w.length >= 3)
        : !pool.some(w => w.indexOf(b) === 0)) return;
      const byName = ws.some(w => w.indexOf(b) === 0);
      const dx = pc === '39' ? KM_JD[0] : 0, dy = pc === '39' ? KM_JD[1] : 0;
      hit.push({ nm: a[0], pc, kind, src: byName ? 'name' : 'hint', x: a[1] + dx, y: a[2] + dy, sc: base + b.length * 10 });
    });
  };
  if (KRAPT) scan(KRAPT, '단지', 140);
  scan(g.dong, '읍면동', 100);
  if (g.bjd) scan(g.bjd, '법정동', 100);
  scan(g.muni, '시군구', 60);
  {
    const pv = {};
    g.prov.forEach(f => { pv[f[0]] = [[f[1], f[3], f[4]]]; });
    const gj = (g.muni['36'] || []).filter(m => /구$/.test(m[0]));
    if (gj.length) {
      const gx = Math.round(gj.reduce((a, m) => a + m[1], 0) / gj.length);
      const gy = Math.round(gj.reduce((a, m) => a + m[2], 0) / gj.length);
      pv['36'] = [['전남광주', pv['36'][0][1], pv['36'][0][2]],
        ['전남', pv['36'][0][1], pv['36'][0][2]], ['광주', gx, gy]];
    }
    scan(pv, '시도', 30);
    const real = {}; g.prov.forEach(f => { real[f[1]] = 1; });
    hit.forEach(h => { if (h.kind === '시도' && !real[h.nm]) h.kind = '시도별칭'; });
  }
  if (!hit.length) return [];
  const sd = {}, any = {};
  hit.forEach(h => { if (h.kind === '읍면동' || h.kind === '법정동') return; any[h.pc] = 1; if (h.kind === '시도') sd[h.pc] = 1; });
  const pcs = Object.keys(sd).length ? sd : any;
  const scoped = Object.keys(pcs).length ? hit.filter(h => pcs[h.pc]) : hit;
  const seen = {}, out = [];
  scoped.sort((a, b) => b.sc - a.sc).forEach(h => {
    const k = h.nm + '|' + h.pc; if (seen[k]) return; seen[k] = 1;
    const f = g.prov.find(x => x[0] === h.pc);
    out.push({ ...h, area: f ? f[1] : '' });
  });
  return out.slice(0, 6);
}

/* kmAuto 와 같은 판정 + 왜 그렇게 됐는지 사유를 함께 돌려준다 */
function kmAutoWhy(text, hint) {
  const r = kmFind(text, hint);
  if (!r.length) return { hit: null, why: '색인에 없음 — 이름·주소에 행정구역 이름이 하나도 안 걸렸다', cand: r };
  const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < 100;
  const gu = r.filter(h => h.kind === '시군구');
  const sido = r.filter(h => h.kind === '시도' || h.kind === '시도별칭');
  const guN = gu.filter(h => h.src === 'name');
  const sdN = {}; r.forEach(h => { if ((h.kind === '시도' || h.kind === '시도별칭') && h.src === 'name') sdN[h.pc] = 1; });
  const ok = h => sdN[h.pc] || !guN.length || guN.some(g => Math.hypot(h.x - g.x, h.y - g.y) < 160);
  const apt = r.filter(h => h.kind === '단지' && ok(h));
  if (apt.length && (apt.length === 1 || apt.every(d => near(d, apt[0])))) return { hit: apt[0], why: '단지 색인', cand: r };
  const fine = r.filter(h => (h.kind === '읍면동' || h.kind === '법정동') && ok(h));
  if (fine.length && (fine.length === 1 || fine.every(d => near(d, fine[0])))) return { hit: fine[0], why: fine[0].kind, cand: r };
  if (fine.length) return { hit: null, why: '읍면동 후보가 25km 넘게 흩어져 버려짐(동명이의)', cand: r };
  /* 613차: 같은 시도의 시군구가 있으면 그 시도는 버린다 — app.js 와 같은 규칙 */
  const base = gu.concat(sido.filter(x => !gu.some(y => y.pc === x.pc || near(x, y))));
  if (!base.length) return { hit: null, why: '읍면동은 걸렸지만 거리 검사에서 전부 탈락', cand: r };
  if (base.length === 1) return { hit: base[0], why: base[0].kind + ' 수준(단지 자리 아님)', cand: r };
  const far = base.some(a => base.some(b => Math.hypot(a.x - b.x, a.y - b.y) > 400));
  if (far) return { hit: null, why: '후보가 100km 넘게 흩어짐 — 틀린 자리에 찍느니 비운다(546차)', cand: r };
  const n = base.length;
  return {
    hit: { ...base[0], nm: base.map(h => h.nm).join('·'), kind: base[0].kind,
      x: Math.round(base.reduce((a, h) => a + h.x, 0) / n), y: Math.round(base.reduce((a, h) => a + h.y, 0) / n) },
    why: base.length + '곳 평균 자리(단지 자리 아님)', cand: r,
  };
}

if (!SITES.length) {
  console.log('SITES 가 비어 있습니다 — 이 파일 위쪽 배열에 현장을 적고 다시 실행하세요.');
  process.exit(0);
}
const pad = (s, n) => { let w = 0; const t = String(s); for (const c of t) w += /[가-힣]/.test(c) ? 2 : 1; return t + ' '.repeat(Math.max(0, n - w)); };
let okN = 0, coarse = 0;
console.log(`색인: 읍면동 ${Object.values(KRGEO.dong).flat().length} · 법정동 ${KRGEO.bjd ? Object.values(KRGEO.bjd).flat().length : 0} · 단지 ${KRAPT ? Object.values(KRAPT).flat().length : '(apt-geo.js 비어 있음)'}\n`);
for (const s of SITES) {
  /* 612차 2단계 — app.js 의 kmSiteXY 와 같은 순서다. 한쪽을 고치면 다른 쪽도 고칠 것 */
  const ad = (s.addr || '').trim();
  let r = ad ? kmAutoWhy(ad, s.region || '') : null;
  let via = '주소';
  if (!r || !r.hit || !/^(단지|읍면동|법정동)$/.test(r.hit.kind)) {
    r = kmAutoWhy(ad ? ad + ' ' + s.name : s.name, s.region || '');
    via = ad ? '주소+이름' : '이름';
  }
  if (r.hit) {
    okN++;
    if (/시군구|시도|평균/.test(r.why)) coarse++;
    console.log(`✔ ${pad(s.name, 26)} ${pad(via, 10)} ${pad(r.hit.area + ' ' + r.hit.nm, 26)} ${r.why}`);
  } else {
    console.log(`✘ ${pad(s.name, 26)} ${pad(via, 10)} ${pad('—', 26)} ${r.why}`);
  }
  const c = r.cand.slice(0, 4).map(h => `${h.area} ${h.nm}(${h.kind}${h.src === 'hint' ? '·권역' : ''})`).join(' | ');
  console.log(`   후보: ${c || '없음'}`);
}
console.log(`\n찍힘 ${okN}/${SITES.length} · 그중 시군구·시도 수준(단지 자리 아님) ${coarse}개 · 못 찍음 ${SITES.length - okN}개`);
