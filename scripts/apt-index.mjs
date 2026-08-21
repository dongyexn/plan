/* 공동주택명 색인 만들기 — 미니 맵이 현장명을 자리로 옮길 때 마지막으로 보는 표.
 *
 * 왜 필요한가
 *   현장명이 '갑천1 트리풀시티'·'도안'·'대실' 처럼 행정구역 이름이 아닌 경우가 많다.
 *   이런 이름은 읍면동·법정동 색인으로는 못 찾아 권역 평균 자리로 밀린다.
 *   도로명주소 건물DB 에는 **공동주택명 + 법정동코드** 가 들어 있으므로,
 *   단지 이름을 법정동으로 옮기고 그 법정동의 좌표를 쓰면 자리가 정확해진다.
 *
 * 자료 (둘 다 공개 자료 — 사내 자료가 아니다)
 *   1) 도로명주소 건물DB : 공공데이터포털 '행정안전부_도로명주소 건물DB'
 *      시도별 텍스트 파일(| 구분, CP949)을 받아 한 폴더에 둔다.
 *   2) 법정동 좌표      : vendor/korea-geo.js 의 bjd 색인을 그대로 쓴다.
 *
 * 쓰는 법
 *   node scripts/apt-index.mjs <건물DB폴더> [시도코드...]
 *   예) node scripts/apt-index.mjs ./build_db 44 43 30 36 41
 *   → vendor/apt-geo.js 를 만든다. index.html 의 korea-geo.js 다음에 끼워 넣으면
 *     app.js 의 kmAuto 가 이 표를 먼저 본다(window.KRAPT).
 *
 * ⚠ 시도코드는 **법정동코드 앞 2자리**다(서울 11 · 대전 30 · 세종 36 · 경기 41 ·
 *   충북 43 · 충남 44). korea-geo 의 시도 코드(25·29·31·33·34)와 체계가 다르다.
 * ⚠ 건물DB 의 열 순서는 배포 회차마다 달라진 적이 있다. 첫 줄을 눈으로 확인하고
 *   아래 COL 을 맞춰라 — 말없이 엉뚱한 열을 읽으면 색인이 통째로 쓰레기가 된다.
 */
import fs from 'fs';
import path from 'path';

/* 건물DB 열 위치(0부터). 배포본을 열어 확인하고 고칠 것 */
const COL = { lawdCd: 0, sido: 1, sgg: 2, umd: 3, ri: 4, aptNm: 17 };
const SEP = '|';

const [, , dir, ...sidoArgs] = process.argv;
if (!dir) {
  console.error('사용법: node scripts/apt-index.mjs <건물DB폴더> [시도코드...]');
  process.exit(1);
}
const wantSido = new Set(sidoArgs);

/* korea-geo 의 법정동 좌표를 읽어 (시도코드|법정동명) → [x,y] 로 만든다 */
const geoSrc = fs.readFileSync(path.join('vendor', 'korea-geo.js'), 'utf8');
const KRGEO = JSON.parse(geoSrc.slice(geoSrc.indexOf('window.KRGEO=') + 13, geoSrc.lastIndexOf(';')));
const bjd = {};
for (const pc in KRGEO.bjd) KRGEO.bjd[pc].forEach(a => { (bjd[a[0]] = bjd[a[0]] || []).push([pc, a[1], a[2]]); });

/* 법정동코드 앞 2자리 → korea-geo 시도 코드 */
const SIDO = { '11': '11', '26': '21', '27': '22', '28': '23', '30': '25', '31': '26',
  '36': '29', '41': '31', '42': '32', '51': '32', '43': '33', '44': '34',
  '45': '35', '52': '35', '46': '36', '29': '36', '12': '36', '47': '37', '48': '38', '50': '39' };

const seen = {};
let rows = 0, hit = 0;
for (const f of fs.readdirSync(dir)) {
  if (!/\.txt$/i.test(f)) continue;
  const txt = fs.readFileSync(path.join(dir, f), 'latin1');   /* CP949 는 아래에서 되돌린다 */
  const buf = fs.readFileSync(path.join(dir, f));
  const dec = new TextDecoder('euc-kr').decode(buf);
  for (const line of (dec || txt).split('\n')) {
    const a = line.split(SEP);
    if (a.length <= COL.aptNm) continue;
    rows++;
    const code = String(a[COL.lawdCd] || '').trim();
    const apt = String(a[COL.aptNm] || '').trim();
    if (!apt || code.length < 10) continue;
    if (wantSido.size && !wantSido.has(code.slice(0, 2))) continue;
    const pc = SIDO[code.slice(0, 2)];
    if (!pc) continue;
    const umd = String(a[COL.umd] || '').trim();
    const cand = (bjd[umd] || []).find(b => b[0] === pc);
    if (!cand) continue;                       /* 법정동 좌표를 못 찾으면 건너뛴다 */
    const key = pc + '|' + apt;
    if (seen[key]) continue;
    seen[key] = [pc, cand[1], cand[2]];
    hit++;
  }
}
const out = {};
for (const k in seen) { const [pc, x, y] = seen[k]; (out[pc] = out[pc] || []).push([k.split('|')[1], x, y]); }
const body = '/* 공동주택명 → 법정동 좌표. scripts/apt-index.mjs 가 만든다 — 손으로 고치지 말 것 */\n'
  + 'window.KRAPT=' + JSON.stringify(out) + ';\n';
fs.writeFileSync(path.join('vendor', 'apt-geo.js'), body);
console.log(`읽은 줄 ${rows.toLocaleString()} · 담은 단지 ${hit.toLocaleString()} · ${(body.length / 1024).toFixed(0)}KB`);
