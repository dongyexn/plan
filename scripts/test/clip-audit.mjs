/* 845차: 잘림 검사 — **스크롤로도 닿을 수 없는 내용**이 있는지 잰다.
   왜 필요한가: 822차에 `align-content:center` 가 넘치는 내용의 위쪽을 잘라 스크롤로도 못 닿게 만든 적이 있다.
   그 부류는 정적 감사도 겹침 검사(mobile-fit)도 못 잡는다 — 요소는 제자리에 있고 화면 밖으로 나가지도 않았다.

   재는 방법:
     ① 칸을 맨 위로 올린 뒤, 그 칸과 조상들의 잘라내기(overflow·clip-path)를 잠깐 풀고
        자손들이 **칸 위쪽 밖으로** 얼마나 삐져나오는지 잰다(= 위로 못 닿는 양).
     ② 맨 아래로 내린 뒤 같은 방법으로 아래쪽을 잰다.
   ⚠ 실제로 구르는 것은 그 칸이 아니라 조상일 수 있다 — 가장 가까운 **진짜 스크롤 칸**을 찾아 올리고 내린다.
   ⚠ 화면 밖(뷰포트 위/아래)은 잘림이 아니다 — 페이지 자체를 굴리면 닿는다. 칸 기준으로만 잰다.
   사용: CHROMIUM=/path/to/chrome node scripts/test/clip-audit.mjs
*/
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.wasm': 'application/wasm', '.md': 'text/markdown' };
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(root, u === '/' ? 'index.html' : u);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
}).listen(8527);

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓ ' : '✗ ') + n); if (!c) fail++; };
const exe = process.env.CHROMIUM || '';
const br = await chromium.launch(Object.assign({ args: ['--no-sandbox'] }, exe ? { executablePath: exe } : {}));

/* 한 칸의 «못 닿는 양»(px) — {top, bottom}
   ⚠ 잘라내기를 풀어서 재면 안 된다: overflow 를 풀면 그 칸은 더 이상 구르지 않아 **스크롤 위치가 0 으로 돌아가고**,
     멀쩡한 스크롤 칸이 전부 「아래가 잘렸다」로 잡힌다(845차에 실제로 겪었다).
     overflow 는 자리(layout)를 바꾸지 않으므로, 그냥 둔 채 자손 상자를 재면 된다. */
/* 화면 안의 «잘라내는 칸»을 전부 찾아 한꺼번에 잰다.
   ⚠ 잘라내기를 풀어서 재면 안 된다: overflow 를 풀면 그 칸은 더 이상 구르지 않아 **스크롤 위치가 0 으로 돌아가고**,
     멀쩡한 스크롤 칸이 전부 「아래가 잘렸다」로 잡힌다(845차에 겪었다). overflow 는 자리를 바꾸지 않으므로 그대로 두고 잰다.
   ⚠ 안쪽에 따로 구르는 칸이 있으면 그 안의 내용은 그 칸이 책임진다 — 바깥에서 세면 멀쩡한 화면이 걸린다. */
const SCAN = `(limit)=>{
  const scrollable=e=>{const cs=getComputedStyle(e);return /(auto|scroll)/.test(cs.overflowY)&&e.scrollHeight>e.clientHeight+2;};
  const clips=e=>{const cs=getComputedStyle(e);return cs.overflowY!=='visible'||cs.clipPath!=='none';};
  const name=e=>{
    let s=e.tagName.toLowerCase();
    if(e.id)s+='#'+e.id;
    const c=(e.className&&e.className.toString&&e.className.toString())||'';
    if(c&&typeof c==='string')s+='.'+c.trim().split(/\\s+/).slice(0,2).join('.');
    return s;
  };
  const targets=[...document.querySelectorAll('*')].filter(e=>{
    if(e===document.documentElement||e===document.body)return false;   /* 페이지 자체는 굴리면 닿는다 */
    if(!clips(e))return false;
    const r=e.getBoundingClientRect();
    if(r.width<80||r.height<60)return false;
    if(r.bottom<0||r.top>innerHeight)return false;
    const cs=getComputedStyle(e);
    return cs.display!=='none'&&cs.visibility!=='hidden';
  });
  const out=[];
  targets.forEach(el=>{
    const scroller=(()=>{for(let e=el;e&&e!==document.documentElement;e=e.parentElement)if(scrollable(e))return e;return null;})();
    const bounds=()=>{
      let t=Infinity,b=-Infinity;
      el.querySelectorAll('*').forEach(c=>{
        const cs=getComputedStyle(c);
        if(cs.display==='none'||cs.visibility==='hidden')return;
        if(cs.position==='fixed'||cs.position==='absolute'||cs.position==='sticky')return;
        if(c.closest('details:not([open])'))return;   /* 접힌 「자세히」 안의 내용은 지금 보이는 것이 아니다 */
        /* 조상이 떠 있거나(fixed·absolute) 따로 구르면 이 내용은 이 칸이 자르지 않는다 */
        for(let p=c.parentElement;p&&p!==el;p=p.parentElement){
          const pc=getComputedStyle(p);
          if(scrollable(p)||pc.position==='fixed'||pc.position==='absolute'||pc.position==='sticky')return;
        }
        const r=c.getBoundingClientRect();
        if(r.width<=0||r.height<=0)return;
        if(r.top<t)t=r.top; if(r.bottom>b)b=r.bottom;
      });
      return {t,b};
    };
    const one=where=>{
      if(scroller)scroller.scrollTop=where==='top'?0:scroller.scrollHeight;
      const box=el.getBoundingClientRect(),bb=bounds();
      if(!isFinite(bb.t))return 0;
      return Math.round(where==='top'?Math.max(0,box.top-bb.t):Math.max(0,bb.b-box.bottom));
    };
    const top=one('top'),bottom=one('bottom');
    if(scroller)scroller.scrollTop=0;
    if(top>limit||bottom>limit)out.push({el:name(el),top,bottom});
  });
  return {checked:targets.length,bad:out};
}`;

const LIMIT = 2;   /* 2px 까지는 테두리·그림자 오차로 본다 */
let checked = 0, bad = [];

const scan = pg => pg.evaluate(new Function('limit', 'return (' + SCAN + ')(limit)'), LIMIT);

for (const [W, H, tag] of [[1536, 864, '넓은 화면'], [1366, 768, '노트북'], [390, 844, '폰']]) {
  const pg = await br.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await pg.goto('http://localhost:8527/index.html?local=1');
  await pg.waitForSelector('#fcal .fc-daygrid-day', { timeout: 20000, state: 'attached' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(700);

  /* 자기시험 ① 일부러 잘린 칸(822차 재현)을 잡는가 */
  await pg.evaluate(() => {
    const d = document.createElement('div'); d.id = 'clipSelfBad';
    d.style.cssText = 'position:fixed;left:20px;top:120px;width:240px;height:150px;overflow:auto;display:flex;flex-wrap:wrap;align-content:center;background:#fff;z-index:9999';
    d.innerHTML = '<div style="width:100%;height:60px;background:#1f4fd8;margin:3px 0"></div>'.repeat(6);
    document.body.appendChild(d);
  });
  let r = await scan(pg);
  const caught = r.bad.find(x => x.el.includes('clipSelfBad'));
  ok(`${tag} — 자기시험: 일부러 잘린 칸을 잡는다 (위 ${caught ? caught.top : 0}px)`, !!caught && caught.top > 40);
  await pg.evaluate(() => { const e = document.querySelector('#clipSelfBad'); if (e) e.remove(); });

  /* 자기시험 ② 그냥 구르는 칸은 통과시키는가 */
  await pg.evaluate(() => {
    const d = document.createElement('div'); d.id = 'clipSelfOk';
    d.style.cssText = 'position:fixed;left:20px;top:120px;width:240px;height:150px;overflow:auto;background:#fff;z-index:9999';
    d.innerHTML = '<div style="height:60px;background:#1f4fd8;margin:3px 0"></div>'.repeat(6);
    document.body.appendChild(d);
  });
  r = await scan(pg);
  ok(`${tag} — 자기시험: 그냥 구르는 칸은 통과`, !r.bad.some(x => x.el.includes('clipSelfOk')));
  await pg.evaluate(() => { const e = document.querySelector('#clipSelfOk'); if (e) e.remove(); });

  /* 화면을 돌며 훑는다 */
  const go = async (v, wait = 800) => { await pg.evaluate(x => window.go && go(x), v); await pg.waitForTimeout(wait); };
  const sweep = async label => {
    const s = await scan(pg);
    checked += s.checked;
    s.bad.forEach(b => bad.push({ where: `${tag} · ${label}`, ...b }));
  };
  await go('calendar'); await sweep('캘린더');
  await go('tasks', 1000); await sweep('업무 현황');
  await go('photo'); await sweep('사진대지');
  await go('qc');
  await pg.evaluate(() => {
    const t = document.querySelector('#qcTa'); if (!t) return;
    t.value = Array.from({ length: 25 }, (_, i) => `1. 방 ${i}\n- 항목 ${i}\n : ${i + 1}+1=${i + 2}`).join('\n');
    t.dispatchEvent(new Event('input', { bubbles: true }));
    const b = document.querySelector('[data-act="qc.run"]'); if (b) b.click();
  });
  await pg.waitForTimeout(700); await sweep('견적 검토');
  await go('dwg'); await sweep('도면 인쇄');
  await go('org', 1000); await sweep('조직 관리');
  await go('settings', 1000); await sweep('설정');
  /* 사용 안내(README 뷰어)도 본다 — 글이 길어 잘리기 쉽다 */
  await pg.evaluate(() => window.openReadme && openReadme()); await pg.waitForTimeout(2600); await sweep('사용 안내');
  await pg.close();
}

bad.forEach(b => console.log(`   ⚠ ${b.where} · ${b.el} — 위 ${b.top}px · 아래 ${b.bottom}px 가 스크롤로 닿지 않음`));
ok(`잘린 칸 없음 (칸 ${checked}개 측정)`, bad.length === 0);

console.log(fail ? `\n실패 ${fail}건` : '\n전부 통과');
await br.close();
srv.close();
process.exit(fail ? 1 : 0);
