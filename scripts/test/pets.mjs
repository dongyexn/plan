/* 위젯 미니펫 회귀 — 그림 파일 누락 · 3마리 제한(넷째는 가장 먼저 올린 펫이 내려감) · 짝 대본 · 던지기 · 전체 펫 올림·놀기 오류.
   사용: node scripts/test/pets.mjs (CHROMIUM 경로를 줄 수 있다) */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const PORT=8541;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.gif':'image/gif','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
const srv=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]);const f=path.join(root,u==='/'?'index.html':u);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));}).listen(PORT);
let fail=0;const ok=(n,c,x)=>{console.log((c?'✓ ':'✗ ')+n+(c||x===undefined?'':'  → '+JSON.stringify(x)));if(!c)fail++;};
const W=ms=>new Promise(r=>setTimeout(r,ms));
const exe=process.env.CHROMIUM||'';
const br=await chromium.launch(Object.assign({args:['--no-sandbox']},exe?{executablePath:exe}:{}));
async function page(cfg,w=620,h=700){const ctx=await br.newContext({viewport:{width:w,height:h}});const pg=await ctx.newPage();const perr=[],nf=[];
  pg.on('pageerror',e=>perr.push(e.message));pg.on('response',r=>{if(r.status()>=400)nf.push(r.url());});
  await pg.addInitScript(c=>{localStorage.setItem('calapp.wid',JSON.stringify(c));},cfg);
  await pg.goto('http://localhost:'+PORT+'/index.html?local=1&w=1&glass=1');await W(2000);return{ctx,pg,perr,nf};}
const bubbles=async(pg,n,until)=>{const log=[];for(let i=0;i<n;i++){await W(400);const t=(await pg.$$eval('.wgPet .bub.on',x=>x.map(y=>y.textContent))).join('|');
  if(t&&log[log.length-1]!==t)log.push(t);if(until&&log.some(x=>x.includes(until)))break;}return log;};

/* 1) 목록 — 쓰는 그림이 모두 있는지 */
const src=fs.readFileSync(path.join(root,'vendor/pets.js'),'utf8');const s=src.indexOf('{',src.indexOf('CALAPP_PETS'));
const P=JSON.parse(src.slice(s,src.lastIndexOf('}')+1));const keys=Object.keys(P);
const miss=keys.flatMap(k=>{const v=P[k];return [...Object.values(v.g).map(g=>g.f),v.t.f,v.z.f,...(v.it?['it-'+v.it+'.png']:[])].filter(f=>!fs.existsSync(path.join(root,'vendor/pets',f))).map(f=>k+':'+f);});
ok('그림 파일 누락 없음('+keys.length+'종)',!miss.length,miss);
ok('분류 c 지정',keys.every(k=>'pstoa'.includes(P[k].c||'a')),keys.filter(k=>!'pstoa'.includes(P[k].c||'a')));

/* 2) 3마리 제한 */
{const{ctx,pg,perr}=await page({pets:['manager','worker','cone']});
  ok('세 마리 표시',(await pg.$$eval('.wgPet',a=>a.length))===3);
  await pg.evaluate(()=>petToggle('helm'));await W(500);
  ok('넷째를 올리면 가장 먼저 올린 펫이 내려감',JSON.stringify(await pg.evaluate(()=>petKeys()))===JSON.stringify(['worker','cone','helm']));
  await pg.evaluate(()=>petToggle('cone'));await W(400);ok('다시 누르면 내림',(await pg.$$eval('.wgPet',a=>a.length))===2);
  ok('오류 없음(제한)',!perr.length,perr);await ctx.close();}

/* 3) 짝 대본 */
const PAIRS=[['sf-bell','beacon','띵동! 호출 눌렀어요','삐뽀삐뽀! 장비 정지!'],['excavator','dump','흙 퍼 담습니다~','덜컹! 반출 갑니다'],['of-mouse','of-kbd','나 없으면 클릭 못 해요','나 없으면 글자 못 쳐요'],
  ['sf-wind','crane','풍속 10m/s 넘었어요!','인양 작업 중지합니다'],['capybara','duckling','삐약?','…올라와'],['capybara','angry','하자 언제 고쳐요!','…진정해요'],
  ['cs','angry','불편 드려 죄송합니다, 접수 내역 확인할게요','네, 바로 보내 드리겠습니다']];
for(const [a,b,t1,t2] of PAIRS){const{ctx,pg,perr,nf}=await page({pets:[b,a]});await pg.evaluate(()=>PET.play());const log=await bubbles(pg,30,t2);
  ok('짝 '+a+'↔'+b,log.some(x=>x.includes(t1))&&log.some(x=>x.includes(t2))&&!perr.length&&!nf.length,{log,perr,nf});await ctx.close();}

/* 4) 던지기 — 펫별 먹이 그림 */
for(const k of ['capybara','sf-radio','of-kbd','raccoon-gray','rat-gray']){const{ctx,pg,perr,nf}=await page({pets:[k]});
  const cx=await pg.$eval('.wgPet',e=>{const r=e.getBoundingClientRect();return r.left+r.width/2+120;});
  await pg.evaluate(x=>PET.throwBall(x),cx);await W(250);
  const bg=await pg.$eval('.wgBall',e=>e.style.backgroundImage).catch(()=>'');await W(6000);
  ok('던지기 '+k,bg.includes('it-'+(P[k].it||'ball')+'.png')&&!perr.length&&!nf.length,{bg,perr,nf});await ctx.close();}

/* 5) 전체 — 세 마리씩 올려 놀고 던짐 */
const bad=[];for(let i=0;i<keys.length;i+=3){const ks=keys.slice(i,i+3);const{ctx,pg,perr,nf}=await page({pets:ks});
  const n=await pg.$$eval('.wgPet',a=>a.length);await pg.evaluate(()=>PET.play());await W(2500);
  const cx=await pg.$eval('.wgPet',e=>{const r=e.getBoundingClientRect();return r.left+r.width/2+100;});await pg.evaluate(x=>PET.throwBall(x),cx);await W(3000);
  if(perr.length||nf.length||n!==ks.length)bad.push({ks,n,perr,nf});await ctx.close();}
ok('전체 '+keys.length+'종 올림·놀기·던지기 오류 없음',!bad.length,bad);

await br.close();srv.close();
console.log(fail?'FAIL '+fail:'PASS');process.exitCode=fail?1:0;
