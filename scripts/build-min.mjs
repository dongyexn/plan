/* 배포본 경량화 — 원본(주석 포함)은 저장소에 그대로 두고, GitHub Pages 에 올리는 사본에서만 주석·빈 줄을 걷는다.
   사용: node scripts/build-min.mjs [출력 폴더=_site]  (pages.yml 이 부른다)
   - app.js · pet.js · boot-wid.js: JS 주석 걷기(문자열·템플릿·정규식은 그대로 — static-audit 와 같은 걷기 함수), 줄 끝 공백·빈 줄 제거
   - index.html: <style> 안 CSS 주석·HTML 주석 걷기, 빈 줄 제거
   - 나머지 배포 파일은 그대로 복사, 개발용(scripts·widget-lite·node_modules·인수인계 문서 등)은 빼고
   ⚠ 걷은 JS 가 구문 오류면 빌드를 멈춘다(원본 그대로 올리는 쪽이 낫다) */
import fs from 'fs';import path from 'path';import vm from 'vm';import {fileURLToPath} from 'url';
import {stripJsComments,stripCssComments,stripHtmlComments} from './test/strip-comments.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.resolve(ROOT,process.argv[2]||'_site');
const SKIP=new Set(['.git','.github','node_modules','scripts','widget-lite','_site','dist','HANDOFF.md','HANDOFF-log.md','README.md','package.json','package-lock.json','build-single.mjs','database.rules.json']);
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const copy=(rel)=>{const s=path.join(ROOT,rel),d=path.join(OUT,rel);const st=fs.statSync(s);
  if(st.isDirectory()){fs.mkdirSync(d,{recursive:true});for(const f of fs.readdirSync(s))copy(path.join(rel,f));}else fs.copyFileSync(s,d);};
for(const f of fs.readdirSync(ROOT))if(!SKIP.has(f))copy(f);
const tidy=s=>s.replace(/[ \t]+$/gm,'').replace(/\n\s*\n+/g,'\n');
let saved=0;
for(const f of ['app.js','pet.js','boot-wid.js']){
  const src=fs.readFileSync(path.join(ROOT,f),'utf8'),out=tidy(stripJsComments(src));
  new vm.Script(out,{filename:f});   /* 구문 확인 — 깨지면 여기서 멈춘다 */
  fs.writeFileSync(path.join(OUT,f),out);saved+=Buffer.byteLength(src)-Buffer.byteLength(out);
  console.log(f,Buffer.byteLength(src),'→',Buffer.byteLength(out));
}
{const src=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  const out=tidy(stripHtmlComments(src.replace(/<style[^>]*>[\s\S]*?<\/style>/g,m=>stripCssComments(m))));
  if(!/<script src="\.\/app\.js\?v=\d+"><\/script>/.test(out))throw new Error('app.js 태그가 사라졌다');
  fs.writeFileSync(path.join(OUT,'index.html'),out);saved+=Buffer.byteLength(src)-Buffer.byteLength(out);
  console.log('index.html',Buffer.byteLength(src),'→',Buffer.byteLength(out));}
fs.writeFileSync(path.join(OUT,'.nojekyll'),'');
console.log('줄인 바이트',saved);
