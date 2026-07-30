/* 단일 HTML 빌드 — index.html + app.js 를 하나로 합친다.
   인라인 스크립트를 쓰면서도 CSP를 유지하기 위해 script 본문의 SHA-256 해시를
   계산해 script-src 에 넣는다(= 이 코드만 실행 허용, 다른 인라인은 여전히 차단).

   사용: node build-single.mjs   →  dist/index.html
*/
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');

/* 해시는 <script> 태그 안에 들어갈 '정확한 문자열' 기준이어야 한다.
   앞뒤 개행 하나만 달라져도 CSP가 차단해 앱이 통째로 안 뜬다. */
const inlineBody = '\n' + js + '\n';
const hash = 'sha256-' + crypto.createHash('sha256').update(inlineBody, 'utf8').digest('base64');

/* CSP 메타의 script-src 만 정확히 고친다 — 문서 앞쪽 주석 등에 같은 문구가 있어도 안전하게 */
/* 함수 치환을 쓴다 — 문자열 치환은 삽입 텍스트의 $& · $` · $' 를 특수 패턴으로 해석해
   실제 삽입 내용이 달라지고, 그러면 CSP 해시가 어긋나 스크립트가 통째로 차단된다. */
let out = html.replace('<script src="./app.js"></script>', () => `<script>${inlineBody}</script>`);
out = out.replace(/(<meta http-equiv="Content-Security-Policy"[^>]*?)script-src 'self'/,
  (_m, pre) => `${pre}script-src '${hash}' 'self'`);

if (!/Content-Security-Policy[^>]*script-src '(sha256-[^']+)'/.test(out))
  throw new Error('CSP 메타에 해시가 들어가지 않았습니다');
if (out.includes('src="./app.js"')) throw new Error('app.js 인라인 실패');

/* 최종 산출물에서 인라인 스크립트를 다시 꺼내 해시를 재검증한다 —
   삽입 과정에서 한 글자라도 달라졌으면 여기서 잡힌다 */
const m = out.match(/<script>([\s\S]*?)<\/script>/);
const actual = 'sha256-' + crypto.createHash('sha256').update(m[1], 'utf8').digest('base64');
if (actual !== hash) throw new Error(`해시 불일치 — 삽입된 스크립트가 변형됨\n  기대: ${hash}\n  실제: ${actual}`);

fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
fs.writeFileSync(path.join(dir, 'dist', 'index.html'), out);

/* vendor 파일은 용량이 커서 별도로 둔다 — dist 폴더째 올리면 된다 */
fs.mkdirSync(path.join(dir, 'dist', 'vendor'), { recursive: true });
for (const f of fs.readdirSync(path.join(dir, 'vendor'))) {
  fs.copyFileSync(path.join(dir, 'vendor', f), path.join(dir, 'dist', 'vendor', f));
}

const kb = n => (n / 1024).toFixed(0) + 'KB';
console.log(`dist/index.html  ${kb(out.length)}  (HTML ${kb(html.length)} + JS ${kb(js.length)})`);
console.log(`CSP 해시: ${hash}`);
