import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = 8397;
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.webmanifest':'application/manifest+json' };
const srv = http.createServer((req,res)=>{
  const u = req.url.split('?')[0];
  const f = path.join(root, u==='/'?'index.html':u);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});
  res.end(fs.readFileSync(f));
}).listen(PORT);

const br = await chromium.launch({...(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}),args:['--no-sandbox']});
const pg = await br.newPage({viewport:{width:1440,height:960},deviceScaleFactor:2});
pg.on('pageerror',e=>console.log('PAGEERR',e.message));
await pg.goto(`http://localhost:${PORT}/index.html?local=1`);
await pg.waitForTimeout(1200);
await pg.evaluate(()=>{go('settings');});
await pg.waitForTimeout(800);
const vis = await pg.evaluate(()=>{
  const c=document.getElementById('dfPubCard');
  return {display:c?getComputedStyle(c).display:'none-el',stat:document.getElementById('dfLocalStat')?.textContent,rm:document.getElementById('dfPubRm')?.value,ex:document.getElementById('dfExTk')?.value};
});
console.log('CARD',JSON.stringify(vis));
await pg.screenshot({path:'/home/claude/work/shot-settings.png',fullPage:false});
const card=await pg.locator('#dfPubCard');
if(await card.count())await card.screenshot({path:'/home/claude/work/shot-card.png'});
/* 업로드존 hover 상태 */
await pg.hover('#dfUz');
await pg.waitForTimeout(200);
await card.screenshot({path:'/home/claude/work/shot-card-hover.png'});
await br.close();srv.close();
console.log('done');
