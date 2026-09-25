/* 815차: DWG 읽기 전용 워커.
   ⚠ 여기서만 libredwg 를 돌린다 — 엠스크립튼 글루가 new Function 을 쓰는데, 문서 CSP(script-src 'self')는
     그걸 막는다. 워커 전역에는 문서 CSP 가 상속되지 않아 그대로 돈다(실측 확인).
   하는 일: DWG → 도형을 **평평하게 펴서**(블록·치수 블록 전개) 선 묶음과 글자 목록으로 돌려준다.
   화면에 그리는 일·도면틀 찾는 일은 본체(app.js)가 맡는다. */
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
function flatten(db, extra) {
  const blocks = {};
  Object.values(db.tables.BLOCK_RECORD.entries).forEach(b => { blocks[b.name] = b; });
  /* 893차: 외부 참조(XREF)는 블록 이름만 있고 알맹이가 없다 — 함께 올린 파일이 있으면 그 자리에 끼워 넣는다.
     이름은 파일 이름(확장자 뺀 것)과 맞춘다(대소문자·공백 무시). */
  const key = s => String(s || '').replace(/\.dwg$/i, '').replace(/\s+/g, '').toLowerCase();
  const missing = {};
  const empty = () => Object.keys(blocks).filter(bn => {
    const b = blocks[bn]; return (!b.entities || !b.entities.length) && !/^\*/.test(bn);
  });
  if (extra) {
    const names = Object.keys(extra);
    names.forEach(n => {
      const k = key(n);
      /* ① 블록 이름과 파일 이름이 같은 자리에 끼운다 */
      let hit = false;
      Object.keys(blocks).forEach(bn => {
        const b = blocks[bn];
        if (key(bn) === k && (!b.entities || !b.entities.length)) { b.entities = extra[n].ents; hit = true; }
      });
      /* ② 894차: 이름이 다르면 못 붙는다 — 빈 참조가 하나뿐이고 올린 파일도 하나면 그 자리에 넣는다 */
      if (!hit && names.length === 1) {
        const e = empty();
        if (e.length === 1) blocks[e[0]].entities = extra[n].ents;
      }
      /* ③ 894차: 참조 파일이 제 안에서 쓰는 블록(창호·가구…)도 같이 실어 온다 — 없으면 그 부분이 빈다 */
      Object.keys(extra[n].blocks || {}).forEach(bn => {
        const cur = blocks[bn];
        if (!cur || !cur.entities || !cur.entities.length) blocks[bn] = extra[n].blocks[bn];
      });
    });
  }
  const layers = {};
  Object.values(db.tables.LAYER.entries || {}).forEach(l => { layers[l.name] = l; });
  /* 955차: 레이어 — 도형마다 레이어 번호(l)를 달아 본체가 켜고 끄게 한다. 블록 안 「0」 레이어 도형은 끼운 자리의 레이어를 따른다(캐드 규칙).
     도면에서 꺼 둔(off)·얼린(frozen) 레이어는 처음부터 끈 채로 넘긴다 */
  const lays = [], lidx = {};
  const layerOf = n => { n = n || '0'; if (lidx[n] === undefined) { const la = layers[n]; lidx[n] = lays.length; lays.push({ name: n, off: !!(la && (la.off || la.frozen)), n: 0 }); } return lidx[n]; };
  let curL = 0;
  const styles = [], styleKey = {};
  const styleIdx = (w, d) => {
    const k = w + '|' + d;
    if (styleKey[k] === undefined) { styleKey[k] = styles.length; styles.push({ w, d }); }
    return styleKey[k];
  };
  /* 굵기·선종류는 «엔티티 → 레이어 → 기본값» 순으로 물려받는다 */
  const styleOf = e => {
    const la = layers[e.layer] || null;
    let w = lwMM(e.lineweight);
    if (w == null) w = la ? lwMM(la.lineweight) : null;
    if (w == null || w === 0) w = LW_DEF;
    let lt = e.lineType;
    if (!lt || /^by(layer|block)$/i.test(lt)) lt = la ? la.lineType : '';
    return styleIdx(Math.round(w * 100) / 100, dashOf(lt));
  };
  const polys = [];          /* {b:[x0,y0,x1,y1], p:[x,y, …], c:1 닫힘, s:모양번호} */
  const texts = [];          /* {x,y,h,r,s} */
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
  let curS = 0;
  const close = (closed) => {
    if (cur && cur.length >= 4) { polys.push({ b: curMin, p: cur, c: closed ? 1 : 0, s: curS, l: curL }); lays[curL].n++; }
    cur = null; curMin = null;
  };

  /* MTEXT 서식 코드 정리 — \pxqc; \fArial|b0; {\H2.5x;…} 따위가 그대로 찍히면 안 된다 */
  const mtext = s => String(s || '')
    .replace(/\\[pf][^;]*;/gi, '')
    .replace(/\\[A-Za-z]\d*(\.\d+)?[xX]?;?/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\\P/g, ' ')
    .replace(/\s+/g, ' ').trim();

  function draw(e, m, depth, inh) {
    if (depth > 8) return;
    seen[e.type] = (seen[e.type] || 0) + 1;
    const ln = (!e.layer || e.layer === '0') && inh ? inh : (e.layer || '0');
    curL = layerOf(ln);
    try { curS = styleOf(e); } catch (err) { curS = 0; }
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
        const s = String(e.text || '').trim(); if (!s) break;
        texts.push({ x: p.x, y: p.y, h: (e.textHeight || e.height || 2.5) * sc, r: (e.rotation || 0) * 180 / Math.PI, s, l: curL }); lays[curL].n++;
        break;
      }
      case 'MTEXT': {
        const p = tp(e.insertionPoint || { x: 0, y: 0 });
        const s = mtext(e.text); if (!s) break;
        texts.push({ x: p.x, y: p.y, h: (e.textHeight || e.height || 2.5) * sc, r: 0, s, l: curL }); lays[curL].n++;
        break;
      }
      case 'INSERT': {
        const b = blocks[e.name];
        if (!b || !b.entities || !b.entities.length) {   /* 893차: 알맹이 없는 블록 = 못 찾은 외부 참조 */
          if (e.name) missing[e.name] = (missing[e.name] || 0) + 1;
          skipped[e.type] = (skipped[e.type] || 0) + 1; break;
        }
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
        b.entities.forEach(c => draw(c, mm, depth + 1, ln));
        break;
      }
      case 'DIMENSION': case 'MULTILEADER': case 'ACAD_TABLE': {
        /* 치수·지시선·표는 이름 붙은 익명 블록(*D1 …) 안에 실제 선과 글자가 들어 있다 */
        const b = blocks[e.name || e.blockName];
        if (b && b.entities) b.entities.forEach(c => draw(c, m, depth + 1, ln));
        else skipped[e.type] = (skipped[e.type] || 0) + 1;
        break;
      }
      default: skipped[e.type] = (skipped[e.type] || 0) + 1;
    }
  }

  db.entities.forEach(e => { try { draw(e, [1, 0, 0, 1, 0, 0], 0); } catch (err) { skipped[e.type] = (skipped[e.type] || 0) + 1; } });

  let ext = [Infinity, Infinity, -Infinity, -Infinity];
  polys.forEach(p => { if (p.b[0] < ext[0]) ext[0] = p.b[0]; if (p.b[1] < ext[1]) ext[1] = p.b[1]; if (p.b[2] > ext[2]) ext[2] = p.b[2]; if (p.b[3] > ext[3]) ext[3] = p.b[3]; });
  texts.forEach(t => { if (t.x < ext[0]) ext[0] = t.x; if (t.y < ext[1]) ext[1] = t.y; if (t.x > ext[2]) ext[2] = t.x; if (t.y > ext[3]) ext[3] = t.y; });
  return { polys, texts, ext, seen, skipped, styles, missing, layers: lays };
}

self.onmessage = async (ev) => {
  const { buf, name, refs } = ev.data || {};
  try {
    const t0 = Date.now();
    if (!lib) self.postMessage({ stage: 'load' });   /* 955차: 단계 알림 — 본체가 「엔진 준비 · 읽는 중 · 그리는 중」을 보여 준다 */
    lib = lib || await LibreDwg.create();
    self.postMessage({ stage: 'parse' });
    const tLoad = Date.now() - t0;
    const t1 = Date.now();
    const dwg = lib.dwg_read_data(new Uint8Array(buf), Dwg_File_Type.DWG);
    /* 954차: convert 결과는 JS 객체라 바로 풀어도 된다 — 전엔 flatten 이 던지면 풀지 못하고, 참조 파일은 아예 풀지 않아 열 때마다 wasm 메모리가 쌓였다 */
    let db;
    try { db = lib.convert(dwg); } finally { try { lib.dwg_free(dwg); } catch (e) { } }
    const tParse = Date.now() - t1;
    self.postMessage({ stage: 'flat' });
    const t2 = Date.now();
    /* 893차: 함께 올린 참조 파일(refs)을 먼저 읽어 이름 → 도형 목록으로 만든다 */
    const extra = {}, refErr = {};
    (refs || []).forEach(r => {
      try {
        const p2 = lib.dwg_read_data(new Uint8Array(r.buf), Dwg_File_Type.DWG);
        let d2;
        try { d2 = lib.convert(p2); } finally { try { lib.dwg_free(p2); } catch (e) { } }
        const bl = {};
        Object.values((d2.tables && d2.tables.BLOCK_RECORD && d2.tables.BLOCK_RECORD.entries) || {})
          .forEach(b => { if (b && b.name) bl[b.name] = b; });
        extra[r.name] = { ents: d2.entities || [], blocks: bl };
        /* 895차: 왜 안 붙었는지 알려 주려고 개수를 함께 넘긴다 */
        refErr[r.name] = { ents: (d2.entities || []).length, blocks: Object.keys(bl).length };
      } catch (err) { refErr[r.name] = { err: String(err && err.message || err).slice(0, 120) }; }
    });
    const out = flatten(db, extra);
    self.postMessage({
      ok: true, name,
      polys: out.polys, texts: out.texts, ext: out.ext, styles: out.styles, layers: out.layers,
      layouts: (db.objects.LAYOUT || []).map(l => l.layoutName),
      seen: out.seen, skipped: out.skipped, missing: out.missing, refInfo: refErr,
      ms: { load: tLoad, parse: tParse, flat: Date.now() - t2 }
    });
  } catch (err) {
    self.postMessage({ ok: false, err: String(err && err.message || err).slice(0, 300) });
  }
};
