/* 815차: DWG 읽기 전용 워커.
   ⚠ 여기서만 libredwg 를 돌린다 — 엠스크립튼 글루가 new Function 을 쓰는데, 문서 CSP(script-src 'self')는
     그걸 막는다. 워커 전역에는 문서 CSP 가 상속되지 않아 그대로 돈다(실측 확인).
   하는 일: DWG → 도형을 **평평하게 펴서**(블록·치수 블록 전개) 선 묶음과 글자 목록으로 돌려준다.
   화면에 그리는 일·도면틀 찾는 일은 본체(app.js)가 맡는다.
   896차: ① **모델 공간만** 그린다(엔진의 db.entities 는 배치 공간 도형까지 섞어 준다 — 그대로 그리면 표제란·뷰포트가
   모델 좌표에 찍힌다) ② 꺼진(off)·동결(frozen)·플롯 안 함(plotflag 0) 레이어와 보이지 않는 도형은 뺀다(all 이면 다 그린다)
   ③ 외부 참조는 BLOCK_HEADER 의 flag(4=참조, 8=오버레이)·xref_pname(원래 경로)으로 확정한다 — 「알맹이 없는 블록」은 대용 지표였다
   ④ 최상위 INSERT 목록(이름·상자)과 폴리마다 레이어 번호를 함께 넘긴다(본체가 틀 블록·틀 레이어로 장을 나눈다)
   ⑤ 배치(Layout) 마다 종이 공간 도형·뷰포트를 따로 넘긴다(본체가 배치 인쇄를 만든다). */
import { LibreDwg, Dwg_File_Type } from './wrapper.js';

let lib = null;

const PI2 = Math.PI * 2;

/* 818차: 선 굵기·선종류를 함께 넘긴다.
   ⚠ libredwg 의 lineweight 는 **번호**다 — 0~23 은 아래 표(1/100mm), 29=레이어따름 · 30=블록따름 · 31=기본값. */
const LW = [0, 5, 9, 13, 15, 18, 20, 25, 30, 35, 40, 50, 53, 60, 70, 80, 90, 100, 106, 120, 140, 158, 200, 211];
const LW_DEF = 0.25;                       /* 기본 굵기(mm) */
function lwMM(v) {
  if (v == null) return null;
  if (v >= 0 && v < LW.length) return LW[v] / 100;
  return null;                              /* 29·30·31 등은 '따름/기본' — 부르는 쪽이 판단 */
}
/* 선종류 이름 → 파선 모양(mm). 이름이 제각각이라 낱말로 가른다 */
function dashOf(name) {
  const n = String(name || '').toUpperCase();
  if (!n || n === 'CONTINUOUS' || n === 'BYLAYER' || n === 'BYBLOCK' || n === 'SOLID') return '';
  if (n.includes('PHANTOM')) return '12,2,2,2,2,2';
  if (n.includes('CENTER')) return '10,2,2,2';
  if (n.includes('DASHDOT') || n.includes('DOTDASH')) return '6,2,0.5,2';
  if (n.includes('DOT')) return '0.5,2';
  if (n.includes('DIVIDE')) return '8,2,0.5,2,0.5,2';
  if (n.includes('HIDDEN') || n.includes('DASHED') || n.includes('DASH')) return '3,2';
  return '';
}
/* 896차: BLOCK_HEADER 를 엔진의 dynapi 로 직접 읽어 외부 참조를 확정한다.
   flag 비트: 1 익명 · 2 속성 있음 · 4 외부 참조 · 8 오버레이 · 16 참조 종속 · 32 해석됨 · 64 참조됨.
   xref_pname 은 붙일 때 적힌 경로(상대·절대 그대로). 일반 블록은 "" 로 온다(example_2000 으로 확인). */
function readXrefs(dwg) {
  const out = {};
  try {
    const n = lib.dwg_get_num_objects(dwg);
    for (let i = 0; i < n; i++) {
      const obj = lib.dwg_get_object(dwg, i);
      if (!obj || lib.dwg_object_get_fixedtype(obj) !== 49) continue;   /* 49 = DWG_TYPE_BLOCK_HEADER */
      const t = lib.dwg_object_to_object_tio(obj); if (!t) continue;
      const name = lib.dwg_dynapi_entity_data(t, 'name');
      const flag = lib.dwg_dynapi_entity_data(t, 'flag') || 0;
      const path = lib.dwg_dynapi_entity_data(t, 'xref_pname') || '';
      if (name && ((flag & 4) || path)) out[name] = { path: uesc(path), overlay: !!(flag & 8) };
    }
  } catch (err) { }
  return out;
}
/* 896차: 엔진이 비ASCII 이름·글자를 DXF 식 \U+XXXX 로 넘길 때가 있다(도면틀 → \U+b3c4\U+ba74\U+d2c0) — 풀어서 쓴다 */
const uesc = s => String(s || '').replace(/\\U\+([0-9A-Fa-f]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
function markPlot(tbl) {
  const up = Object.values(tbl).some(l => l && l.plotFlag === 1);
  Object.values(tbl).forEach(l => { if (l) l._up = up; });
}
/* 경로에서 파일 이름만(확장자·공백·대소문자 무시) — 참조 파일 맞추기의 열쇠 */
const fkey = s => String(s || '').replace(/^.*[\\/]/, '').replace(/\.dwg$/i, '').replace(/\s+/g, '').toLowerCase();

function flatten(db, extra, xrefs, opts) {
  opts = opts || {};
  const blocks = {};
  Object.values(db.tables.BLOCK_RECORD.entries).forEach(b => { blocks[b.name] = b; });
  /* 893차: 외부 참조(XREF)는 블록 이름만 있고 알맹이가 없다 — 함께 올린 파일이 있으면 그 자리에 끼워 넣는다.
     896차: 맞추기는 ① 참조에 적힌 경로의 파일 이름 → ② 블록 이름 → ③ 빠진 참조·올린 파일이 하나씩이면 그냥(894차) 순서. */
  const missing = {};
  const xrNames = Object.keys(xrefs || {});
  const isXr = bn => !!(xrefs && xrefs[bn]);
  const empty = () => Object.keys(blocks).filter(bn => {
    const b = blocks[bn]; return (!b.entities || !b.entities.length) && !/^\*/.test(bn);
  });
  const xrOf = {};                           /* 블록 이름 → 어느 참조 파일이 채웠나(레이어 「참조|레이어」 판정에 쓴다) */
  if (extra) {
    const names = Object.keys(extra);
    names.forEach(n => {
      const k = fkey(n);
      let hit = null;
      xrNames.forEach(bn => { if (!hit && fkey(xrefs[bn].path || bn) === k && blocks[bn] && !(blocks[bn].entities || []).length) hit = bn; });
      if (!hit) Object.keys(blocks).forEach(bn => { if (!hit && fkey(bn) === k && !(blocks[bn].entities || []).length) hit = bn; });
      if (!hit && names.length === 1) { const e = empty(); if (e.length === 1) hit = e[0]; }
      if (hit) { blocks[hit].entities = extra[n].ents; xrOf[hit] = n; }
      /* 894차: 참조 파일이 제 안에서 쓰는 블록(창호·가구…)도 같이 실어 온다 — 없으면 그 부분이 빈다 */
      Object.keys(extra[n].blocks || {}).forEach(bn => {
        const cur = blocks[bn];
        if (!cur || !cur.entities || !cur.entities.length) blocks[bn] = extra[n].blocks[bn];
      });
    });
  }
  const layers = {};
  Object.values(db.tables.LAYER.entries || {}).forEach(l => { layers[l.name] = l; });
  /* 896차: 레이어 찾기 — 참조 안 도형은 호스트에 「참조|레이어」 로 잡혀 있고(꺼짐·동결도 거기서 정한다), 없으면 참조 파일 제 레이어 */
  const layerOf = (e, xr) => {
    if (xr && layers[xr + '|' + e.layer]) return layers[xr + '|' + e.layer];
    if (layers[e.layer]) return layers[e.layer];
    if (xr && xrOf[xr] && extra[xrOf[xr]].layers) return extra[xrOf[xr]].layers[e.layer] || null;
    return null;
  };
  /* ⚠ plotflag 0 은 「플롯 안 함」인데, 어떤 변환기(libredwg dxf2dwg 로 만든 파일)는 모든 레이어를 0 으로 남긴다 —
     한 레이어라도 1 인 파일에서만 이 기준을 쓴다(AutoCAD 파일은 보통 레이어가 1, Defpoints 만 0) */
  markPlot(layers);
  const layerHidden = la => !!la && (la.off || la.frozen || (la._up && la.plotFlag === 0));
  const layerNames = [], layerIdxOf = {};
  const layerIdx = nm => { nm = uesc(nm || '0'); if (layerIdxOf[nm] === undefined) { layerIdxOf[nm] = layerNames.length; layerNames.push(nm); } return layerIdxOf[nm]; };
  const hid = { layers: 0, ents: 0 };
  Object.values(layers).forEach(l => { if (layerHidden(l)) hid.layers++; });
  const styles = [], styleKey = {};
  const styleIdx = (w, d) => {
    const k = w + '|' + d;
    if (styleKey[k] === undefined) { styleKey[k] = styles.length; styles.push({ w, d }); }
    return styleKey[k];
  };
  /* 굵기·선종류는 «엔티티 → 레이어 → 기본값» 순으로 물려받는다 */
  const styleOf = (e, xr) => {
    const la = layerOf(e, xr);
    let w = lwMM(e.lineweight);
    if (w == null) w = la ? lwMM(la.lineweight) : null;
    if (w == null || w === 0) w = LW_DEF;
    let lt = e.lineType;
    if (!lt || /^by(layer|block)$/i.test(lt)) lt = la ? la.lineType : '';
    return styleIdx(Math.round(w * 100) / 100, dashOf(lt));
  };
  let polys = [];            /* {b:[x0,y0,x1,y1], p:[x,y, …], c:1 닫힘, s:모양번호, l:레이어번호} */
  let texts = [];            /* {x,y,h,r,s} */
  const seen = {}, skipped = {};
  let cur = null, curMin = null;

  const put = (x, y) => {
    if (!isFinite(x) || !isFinite(y)) return;
    cur.push(x, y);
    if (x < curMin[0]) curMin[0] = x;
    if (y < curMin[1]) curMin[1] = y;
    if (x > curMin[2]) curMin[2] = x;
    if (y > curMin[3]) curMin[3] = y;
  };
  const open = () => { cur = []; curMin = [Infinity, Infinity, -Infinity, -Infinity]; };
  let curS = 0, curL = 0;
  const close = (closed) => {
    if (cur && cur.length >= 4) polys.push({ b: curMin, p: cur, c: closed ? 1 : 0, s: curS, l: curL });
    cur = null; curMin = null;
  };

  /* MTEXT 서식 코드 정리 — \pxqc; \fArial|b0; {\H2.5x;…} 따위가 그대로 찍히면 안 된다 */
  const mtext = s => uesc(s)
    .replace(/\\[pf][^;]*;/gi, '')
    .replace(/\\[A-Za-z]\d*(\.\d+)?[xX]?;?/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\\P/g, ' ')
    .replace(/\s+/g, ' ').trim();

  function draw(e, m, depth, xr) {
    if (depth > 8) return;
    seen[e.type] = (seen[e.type] || 0) + 1;
    /* 896차: 꺼진·동결·플롯 안 함 레이어와 보이지 않는 도형은 인쇄에서 뺀다(CAD 의 플롯과 같게). all 이면 다 그린다 */
    if (!opts.all && (e.isVisible === false || layerHidden(layerOf(e, xr)))) { hid.ents++; return; }
    try { curS = styleOf(e, xr); } catch (err) { curS = 0; }
    curL = layerIdx(xr ? xr + '|' + e.layer : e.layer);
    const tp = p => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] });
    const sc = Math.hypot(m[0], m[1]) || 1;
    switch (e.type) {
      case 'LINE': {
        if (!e.startPoint || !e.endPoint) break;
        const a = tp(e.startPoint), b = tp(e.endPoint);
        open(); put(a.x, a.y); put(b.x, b.y); close(0); break;
      }
      case 'LWPOLYLINE': case 'POLYLINE': case 'POLYLINE2D': case 'POLYLINE3D': {
        const vs = e.vertices || [];
        if (vs.length < 2) break;
        open(); vs.forEach(v => { const q = tp(v); put(q.x, q.y); });
        if (e.closed || e.shape) { const q = tp(vs[0]); put(q.x, q.y); }
        close(e.closed || e.shape ? 1 : 0); break;
      }
      case 'CIRCLE': {
        if (!e.center || !isFinite(e.radius)) break;
        open();
        for (let i = 0; i <= 48; i++) {
          const a = PI2 * i / 48;
          const q = tp({ x: e.center.x + e.radius * Math.cos(a), y: e.center.y + e.radius * Math.sin(a) });
          put(q.x, q.y);
        }
        close(1); break;
      }
      case 'ARC': {
        if (!e.center || !isFinite(e.radius)) break;
        const a0 = e.startAngle || 0;
        let span = ((e.endAngle || 0) - a0 + PI2) % PI2; if (!span) span = PI2;
        const n = Math.max(6, Math.min(96, Math.ceil(span / 0.12)));
        open();
        for (let i = 0; i <= n; i++) {
          const a = a0 + span * i / n;
          const q = tp({ x: e.center.x + e.radius * Math.cos(a), y: e.center.y + e.radius * Math.sin(a) });
          put(q.x, q.y);
        }
        close(0); break;
      }
      case 'ELLIPSE': {
        if (!e.center || !e.majorAxisEndPoint) break;
        const ma = Math.hypot(e.majorAxisEndPoint.x, e.majorAxisEndPoint.y);
        const ang = Math.atan2(e.majorAxisEndPoint.y, e.majorAxisEndPoint.x);
        const s0 = e.startAngle || 0, s1 = (e.endAngle === undefined ? PI2 : e.endAngle);
        open();
        for (let i = 0; i <= 64; i++) {
          const th = s0 + (s1 - s0) * i / 64;
          const x = ma * Math.cos(th), y = ma * (e.axisRatio || 1) * Math.sin(th);
          const q = tp({ x: e.center.x + x * Math.cos(ang) - y * Math.sin(ang), y: e.center.y + x * Math.sin(ang) + y * Math.cos(ang) });
          put(q.x, q.y);
        }
        close(0); break;
      }
      case 'SOLID': case '3DFACE': {
        const ps = [e.corner1, e.corner2, e.corner4 || e.corner3, e.corner3, e.corner1].filter(Boolean).map(tp);
        if (ps.length < 3) break;
        open(); ps.forEach(p => put(p.x, p.y)); close(1); break;
      }
      case 'HATCH': {
        (e.boundaryPaths || e.paths || []).forEach(bp => {
          const vs = (bp.vertices || bp.edges || []).map(v => v.start || v).filter(v => v && isFinite(v.x));
          if (vs.length < 2) return;
          open(); vs.map(tp).forEach(p => put(p.x, p.y)); close(1);
        });
        break;
      }
      case 'TEXT': case 'ATTRIB': {
        const p = tp(e.startPoint || e.insertionPoint || { x: 0, y: 0 });
        const s = uesc(e.text).trim(); if (!s) break;
        texts.push({ x: p.x, y: p.y, h: (e.textHeight || e.height || 2.5) * sc, r: (e.rotation || 0) * 180 / Math.PI, s });
        break;
      }
      case 'MTEXT': {
        const p = tp(e.insertionPoint || { x: 0, y: 0 });
        const s = mtext(e.text); if (!s) break;
        texts.push({ x: p.x, y: p.y, h: (e.textHeight || e.height || 2.5) * sc, r: 0, s });
        break;
      }
      case 'INSERT': {
        const b = blocks[e.name];
        if (!b || !b.entities || !b.entities.length) {
          /* 896차: 참조로 확정된 블록만 「빠진 참조」로 센다 — 그냥 빈 블록은 조용히 건너뛴다(예전엔 둘 다 참조라고 알렸다) */
          if (e.name && (isXr(e.name) || !xrNames.length)) missing[e.name] = (missing[e.name] || 0) + 1;
          skipped[e.type] = (skipped[e.type] || 0) + 1; break;
        }
        const xr2 = isXr(e.name) || xrOf[e.name] ? e.name : xr;
        const a = e.rotation || 0, ca = Math.cos(a), sa = Math.sin(a);
        const sx = e.xScale || 1, sy = e.yScale || 1;
        const ip = e.insertionPoint || { x: 0, y: 0 };
        const bx = b.basePoint ? b.basePoint.x : 0, by = b.basePoint ? b.basePoint.y : 0;
        const mm = [
          m[0] * ca * sx + m[2] * sa * sx, m[1] * ca * sx + m[3] * sa * sx,
          m[0] * (-sa * sy) + m[2] * ca * sy, m[1] * (-sa * sy) + m[3] * ca * sy,
          m[0] * (ip.x - bx) + m[2] * (ip.y - by) + m[4],
          m[1] * (ip.x - bx) + m[3] * (ip.y - by) + m[5]
        ];
        b.entities.forEach(c => draw(c, mm, depth + 1, xr2));
        /* 896차: 속성(ATTRIB)은 INSERT 에 딸려 온다 — 좌표는 이미 INSERT 가 놓인 공간 기준이라 m 만 곱한다 */
        (e.attribs || []).forEach(a => draw(a, m, depth + 1, xr));
        break;
      }
      case 'DIMENSION': case 'MULTILEADER': case 'ACAD_TABLE': {
        /* 치수·지시선·표는 이름 붙은 익명 블록(*D1 …) 안에 실제 선과 글자가 들어 있다 */
        const b = blocks[e.name || e.blockName];
        if (b && b.entities) b.entities.forEach(c => draw(c, m, depth + 1, xr));
        else skipped[e.type] = (skipped[e.type] || 0) + 1;
        break;
      }
      default: skipped[e.type] = (skipped[e.type] || 0) + 1;
    }
  }

  const I = [1, 0, 0, 1, 0, 0];
  const extOf = (ps, ts) => {
    const ext = [Infinity, Infinity, -Infinity, -Infinity];
    ps.forEach(p => { if (p.b[0] < ext[0]) ext[0] = p.b[0]; if (p.b[1] < ext[1]) ext[1] = p.b[1]; if (p.b[2] > ext[2]) ext[2] = p.b[2]; if (p.b[3] > ext[3]) ext[3] = p.b[3]; });
    ts.forEach(t => { if (t.x < ext[0]) ext[0] = t.x; if (t.y < ext[1]) ext[1] = t.y; if (t.x > ext[2]) ext[2] = t.x; if (t.y > ext[3]) ext[3] = t.y; });
    return ext;
  };
  /* ⚠ 896차: 모델 공간 블록의 도형만 그린다. db.entities 는 배치 공간 도형까지 섞여 있다(wrapper.js convert 가 둘 다 밀어 넣는다) */
  /* ⚠ 같은 이름의 *Model_Space 가 둘인 파일이 있다(dxf2dwg 산출물) — 도형이 있는 쪽을 쓴다 */
  const msBlk = Object.values(db.tables.BLOCK_RECORD.entries).filter(b => /^\*MODEL_SPACE$/i.test(b.name || ''))
    .sort((a, b) => (b.entities || []).length - (a.entities || []).length)[0];
  const msEnts = msBlk ? (msBlk.entities || []) : db.entities;
  const inserts = [];        /* 최상위 INSERT — {n:블록 이름, b:상자, c:그린 폴리 수} (본체의 틀 블록 판정용) */
  msEnts.forEach(e => {
    const i0 = polys.length;
    try { draw(e, I, 0); } catch (err) { skipped[e.type] = (skipped[e.type] || 0) + 1; }
    if (e.type === 'INSERT' && e.name && polys.length > i0) {
      const b = [Infinity, Infinity, -Infinity, -Infinity];
      for (let i = i0; i < polys.length; i++) { const q = polys[i].b; if (q[0] < b[0]) b[0] = q[0]; if (q[1] < b[1]) b[1] = q[1]; if (q[2] > b[2]) b[2] = q[2]; if (q[3] > b[3]) b[3] = q[3]; }
      inserts.push({ n: uesc(e.name), b, c: polys.length - i0 });
    }
  });
  const msPolys = polys, msTexts = texts;
  /* 896차: 배치(Layout) — 종이 공간 도형은 종이 단위(보통 mm) 좌표라 따로 담고, 뷰포트는 모델을 어디서 얼마나 잘라 넣는지만 넘긴다.
     ⚠ LAYOUT.viewportId 가 가리키는 VIEWPORT 는 「종이 자체」를 뜻하는 통 뷰포트라 뺀다(example_2000 으로 확인). */
  const layouts = [];
  (db.objects.LAYOUT || []).forEach(L => {
    const blk = Object.values(blocks).find(b => b.handle === L.paperSpaceTableId && /^\*PAPER_SPACE/i.test(b.name || ''));
    if (!blk) return;
    polys = []; texts = [];
    const vps = [];
    (blk.entities || []).forEach(e => {
      if (e.type === 'VIEWPORT') {
        if (e.handle === L.viewportId || !(e.width > 0) || !(e.height > 0) || !(e.viewHeight > 0)) return;
        const c = e.viewportCenter || { x: 0, y: 0 }, d = e.displayCenter || { x: 0, y: 0 };
        vps.push({ cx: c.x, cy: c.y, w: e.width, h: e.height, vc: [d.x, d.y], vh: e.viewHeight, tw: e.viewTwistAngle || 0 });
        return;
      }
      try { draw(e, I, 0); } catch (err) { skipped[e.type] = (skipped[e.type] || 0) + 1; }
    });
    const lim = L.minLimit && L.maxLimit && isFinite(L.minLimit.x) && isFinite(L.maxLimit.x) && L.maxLimit.x > L.minLimit.x && L.maxLimit.y > L.minLimit.y
      ? [L.minLimit.x, L.minLimit.y, L.maxLimit.x, L.maxLimit.y] : null;
    layouts.push({ name: uesc(L.layoutName || blk.name), tab: L.tabOrder || 0, lim, polys, texts, vps, ext: extOf(polys, texts) });
  });
  layouts.sort((a, b) => a.tab - b.tab);
  polys = msPolys; texts = msTexts;
  return { polys, texts, ext: extOf(polys, texts), seen, skipped, styles, missing, inserts, layers: layerNames, hid, layouts };
}

self.onmessage = async (ev) => {
  const { buf, name, refs, all } = ev.data || {};
  try {
    const t0 = Date.now();
    lib = lib || await LibreDwg.create();
    const tLoad = Date.now() - t0;
    const t1 = Date.now();
    const dwg = lib.dwg_read_data(new Uint8Array(buf), Dwg_File_Type.DWG);
    const db = lib.convert(dwg);
    const tParse = Date.now() - t1;
    const t2 = Date.now();
    /* 893차: 함께 올린 참조 파일(refs)을 먼저 읽어 이름 → 도형 목록으로 만든다 */
    const extra = {}, refErr = {};
    (refs || []).forEach(r => {
      try {
        const d2 = lib.convert(lib.dwg_read_data(new Uint8Array(r.buf), Dwg_File_Type.DWG));
        const bl = {}, ly = {};
        Object.values((d2.tables && d2.tables.BLOCK_RECORD && d2.tables.BLOCK_RECORD.entries) || {})
          .forEach(b => { if (b && b.name) bl[b.name] = b; });
        Object.values((d2.tables && d2.tables.LAYER && d2.tables.LAYER.entries) || {}).forEach(l => { if (l && l.name) ly[l.name] = l; });
        markPlot(ly);                        /* 파일마다 따로 — 호스트가 plotflag 를 쓴다고 참조 파일까지 그 기준으로 가리면 안 된다 */
        /* 896차: 참조도 모델 공간만 — 참조 파일의 배치 도형을 호스트에 끼워 넣으면 안 된다 */
        const ms2 = Object.values((d2.tables && d2.tables.BLOCK_RECORD && d2.tables.BLOCK_RECORD.entries) || {})
          .filter(b => b && /^\*MODEL_SPACE$/i.test(b.name || '')).sort((a, b) => (b.entities || []).length - (a.entities || []).length)[0];
        const ents = ms2 ? (ms2.entities || []) : (d2.entities || []);
        extra[r.name] = { ents, blocks: bl, layers: ly };
        /* 895차: 왜 안 붙었는지 알려 주려고 개수를 함께 넘긴다 */
        refErr[r.name] = { ents: ents.length, blocks: Object.keys(bl).length };
      } catch (err) { refErr[r.name] = { err: String(err && err.message || err).slice(0, 120) }; }
    });
    const xrefs = readXrefs(dwg);
    const out = flatten(db, extra, xrefs, { all: !!all });
    try { lib.dwg_free(dwg); } catch (e) { }
    self.postMessage({
      ok: true, name,
      polys: out.polys, texts: out.texts, ext: out.ext, styles: out.styles,
      layouts: out.layouts, inserts: out.inserts, layers: out.layers, hid: out.hid, xrefs,
      seen: out.seen, skipped: out.skipped, missing: out.missing, refInfo: refErr,
      ms: { load: tLoad, parse: tParse, flat: Date.now() - t2 }
    });
  } catch (err) {
    self.postMessage({ ok: false, err: String(err && err.message || err).slice(0, 300) });
  }
};
