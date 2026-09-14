/* 896차: 도면 인쇄 — 워커(vendor/libredwg/dwg-worker.js)와 본체(app.js 도면 인쇄부)를 브라우저 없이 node 로 돌려 검사한다.
   워커는 self.postMessage 를 가짜로 대고 onmessage 를 직접 부른다. 본체는 app.js 에서 도면 인쇄부만 잘라 vm 으로 돌린다($·toast 는 가짜).
   fixtures/dwg/: host.dwg(틀 블록 3장 + 숨김 레이어 3 + 외부 참조 ../ref/XR-PLAN.dwg + 빈 블록 + 배치 1) · XR-PLAN.dwg(참조 본체) ·
   frames-layer.dwg(「도면틀」 레이어 네모 2장, 블록 없음) · example_2000.dwg(libredwg 시험 파일 — 회귀 기준: 78 폴리·덩어리 1장).
   ⚠ 시험 DWG 는 ezdxf → libredwg dxf2dwg/dwgwrite 로 만든 것(make-fixtures.py) — 참조 플래그·레이어 플래그는 JSON 을 손봐 넣었다. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const FX=path.join(ROOT,'scripts/test/fixtures/dwg');
let fail=0;const ok=(c,msg)=>{console.log((c?'ok    ':'FAIL  ')+msg);if(!c)fail++;};

/* 본체 잘라 오기 */
const src=fs.readFileSync(path.join(ROOT,'app.js'),'utf-8');
const a=src.indexOf('/* ═══════════ 815차: 업무 도구 — 도면 인쇄'),b=src.indexOf('/* 826차: 「오늘」은');
if(a<0||b<0){console.log('FAIL  app.js 도면 인쇄부 표식을 못 찾음');process.exit(1);}
const ctx={console,Math,Number,String,Object,Array,Set,Map,Uint8Array,Int32Array,isFinite,setTimeout,clearTimeout,
  document:{addEventListener(){},body:{classList:{add(){},remove(){},contains(){return false}}},createElement(){return{style:{},classList:{add(){}}}},head:{appendChild(){}}},
  window:{addEventListener(){}},$:()=>null,$$:()=>[],esc:s=>String(s),toast:m=>ctx._t.push(m),_t:[],ACT:{},S:{view:'dwg'},Worker:class{},dwSb(){}};
vm.createContext(ctx);
vm.runInContext(src.slice(a,b)+'\n;this.X={DW,dwSplit,dwPageSVG,dwFrameOpts,dwLoaded,dwRects,dwHasLayout,dwLayoutAuto};',ctx);
const X=ctx.X,DW=X.DW;

/* 워커 */
const out=[];globalThis.self={postMessage:m=>out.push(m)};
await import(path.join(ROOT,'vendor/libredwg/dwg-worker.js'));
const read=async(file,refs=[],all=false)=>{
  const rs=refs.map(r=>({name:path.basename(r),buf:fs.readFileSync(r).buffer.slice(0)}));
  await self.onmessage({data:{buf:fs.readFileSync(file).buffer.slice(0),name:path.basename(file),refs:rs,all}});
  const d=out.pop();if(!d.ok)throw new Error(d.err);return d;
};
const load=d=>{DW.mode='auto';DW.frame='';X.dwLoaded(d);};

/* 1. host.dwg */
let d=await read(path.join(FX,'host.dwg'));
ok(d.polys.length===36&&d.hid.ents===9&&d.hid.layers===3,`숨김 레이어 제외 — 폴리 ${d.polys.length}(36) · 뺀 도형 ${d.hid.ents}(9) · 뺀 레이어 ${d.hid.layers}(3)`);
ok(!d.layers.includes('Defpoints')&&!d.layers.includes('A-HIDE')&&!d.layers.includes('A-FRZ'),'숨김 레이어 이름이 목록에 없음');
ok(d.xrefs['XR-PLAN']&&d.xrefs['XR-PLAN'].path==='../ref/XR-PLAN.dwg','외부 참조 경로 읽음 — '+JSON.stringify(d.xrefs));
ok(Object.keys(d.missing).join()==='XR-PLAN','빠진 참조는 XR-PLAN 만(빈 블록 EMPTY 는 아님) — '+JSON.stringify(d.missing));
ok(d.inserts.filter(i=>i.n==='TITLE-A3').length===3,'최상위 INSERT 상자 3개');
ok(d.layouts.length===1&&d.layouts[0].vps.length===1&&d.layouts[0].polys.length===1,'배치 1 — 뷰포트 1(통 뷰포트 제외)·종이 도형 1');
load(d);
ok(DW.used==='블록'&&DW.pages.length===3,`자동 → 틀 블록 3장 (${DW.used} ${DW.pages.length})`);
ok(X.dwFrameOpts().some(o=>o[0]==='b:TITLE-A3'),'틀 고르개에 블록 TITLE-A3');
DW.mode='layout';X.dwSplit();
ok(DW.used==='배치'&&DW.pages.length===1&&DW.pages[0].L,'배치 모드 → 1장');
const svg=X.dwPageSVG(DW.pages[0]);
ok(/<svg x="20" y="40" width="360" height="240" viewBox="455 0 450 300"/.test(svg),'배치 SVG — 뷰포트 안쪽 svg 좌표·viewBox(축척 240/300)');
ok(svg.includes('LAYOUT TITLE')&&svg.includes('SHEET 2'),'배치 SVG — 종이 글자와 뷰포트 안 모델 글자 둘 다');
DW.mode='cluster';X.dwSplit();ok(DW.used==='덩어리'&&DW.pages.length===6,'오브젝트 모드 6덩어리');
/* all */
d=await read(path.join(FX,'host.dwg'),[],true);
ok(d.polys.length===45&&d.hid.ents===0,`레이어 「모두」 — 폴리 ${d.polys.length}(45)`);
/* 참조 붙이기 */
d=await read(path.join(FX,'host.dwg'),[path.join(FX,'XR-PLAN.dwg')]);
ok(Object.keys(d.missing).length===0&&d.polys.length===60,`참조 붙임 — 빠진 참조 0 · 폴리 ${d.polys.length}(60 = 36 + 12×2)`);
ok(d.refInfo['XR-PLAN.dwg']&&d.refInfo['XR-PLAN.dwg'].ents===11,'참조는 모델 공간만(11) — 배치 네모가 딸려 오지 않음');
/* 이름을 바꿔도 경로 파일명으로 맞는다 */
fs.copyFileSync(path.join(FX,'XR-PLAN.dwg'),'/tmp/xr-plan.dwg');
d=await read(path.join(FX,'host.dwg'),['/tmp/xr-plan.dwg']);
ok(Object.keys(d.missing).length===0,'참조 파일명 대소문자 달라도 맞춤');

/* 2. frames-layer.dwg */
d=await read(path.join(FX,'frames-layer.dwg'));load(d);
ok(d.layers.includes('도면틀'),'\\U+ 이스케이프 레이어 이름 복원 — '+d.layers.join(','));
ok(DW.used==='레이어'&&DW.pages.length===2,`자동 → 틀 레이어 2장 (${DW.used} ${DW.pages.length})`);
ok(!X.dwHasLayout(),'빈 Layout1 은 배치로 치지 않음');

/* 3. example_2000.dwg 회귀 */
d=await read(path.join(FX,'example_2000.dwg'));load(d);
ok(d.polys.length===78&&DW.used==='덩어리'&&DW.pages.length===1,`example_2000 회귀 — 78 폴리·덩어리 1장 (${d.polys.length} ${DW.used} ${DW.pages.length})`);
ok(d.layouts.every(l=>!l.vps.length&&!l.polys.length),'example_2000 — 통 뷰포트만 있는 배치는 비어 있음');

console.log(`\n결과: FAIL ${fail}`);process.exitCode=fail?1:0;
