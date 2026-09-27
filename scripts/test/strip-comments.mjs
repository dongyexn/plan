/* 1012차: 정적 감사용 주석 걷기 — 주석에만 남은 이름을 「쓰는 중」으로 세던 사각지대를 없앤다(d60.seed·.rpt .pg 가 그렇게 살아남았다).
   문자열·템플릿·정규식 리터럴은 건드리지 않고, 줄 수는 그대로 둔다(줄 번호가 원본과 맞게). */
export function stripJsComments(src) {
  let out = '', i = 0, n = src.length;
  const stack = [];           /* 템플릿 ${ } 깊이 */
  let lastSig = '';           /* 마지막 의미 있는 토큰(정규식/나눗셈 판별) */
  const REGEX_PREV = /[(,=:[!&|?{};+\-*%<>~^]$|^(return|typeof|case|do|else|in|of|new|delete|void|throw|yield|await)$/;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); const body = src.slice(i, e < 0 ? n : e + 2); out += body.replace(/[^\n]/g, ''); i = e < 0 ? n : e + 2; continue; }
    if (c === '"' || c === "'") { let j = i + 1; while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; } out += src.slice(i, j + 1); i = j + 1; lastSig = 'str'; continue; }
    if (c === '`' || (c === '}' && stack.length && stack[stack.length - 1] === 0)) {
      if (c === '}') stack.pop();
      let j = i + 1;
      while (j < n) { if (src[j] === '\\') { j += 2; continue; } if (src[j] === '`') break; if (src[j] === '$' && src[j + 1] === '{') { break; } j++; }
      if (src[j] === '`') { out += src.slice(i, j + 1); i = j + 1; lastSig = 'str'; continue; }
      out += src.slice(i, j + 2); i = j + 2; stack.push(0); lastSig = '{'; continue;
    }
    if (c === '{' && stack.length) { stack[stack.length - 1]++; out += c; i++; lastSig = '{'; continue; }
    if (c === '}' && stack.length) { stack[stack.length - 1]--; out += c; i++; lastSig = '}'; continue; }
    if (c === '/' && REGEX_PREV.test(lastSig)) {
      let j = i + 1, cls = false;
      while (j < n && src[j] !== '\n') { const x = src[j]; if (x === '\\') { j += 2; continue; } if (x === '[') cls = true; else if (x === ']') cls = false; else if (x === '/' && !cls) break; j++; }
      j++; while (j < n && /[a-z]/.test(src[j])) j++;
      out += src.slice(i, j); i = j; lastSig = 're'; continue;
    }
    if (/\s/.test(c)) { out += c; i++; continue; }
    if (/[A-Za-z_$0-9]/.test(c)) { let j = i; while (j < n && /[\w$]/.test(src[j])) j++; lastSig = src.slice(i, j); out += lastSig; i = j; continue; }
    out += c; lastSig = c; i++;
  }
  return out;
}
export const stripCssComments = s => s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ''));
export const stripHtmlComments = s => s.replace(/<!--[\s\S]*?-->/g, '');
