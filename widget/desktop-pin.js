/* 바탕화면 고정 — 창을 '벽지 위 · 바탕화면 아이콘 아래' 층에 끼워 넣는다.
   (Desktopcal 류가 쓰는 방식. 공개된 Win32 기법이며 별도 라이브러리 없이 user32 만 호출한다)

   윈도우 바탕화면 구조
     Progman
       └ WorkerW            ← 아이콘 층
           └ SHELLDLL_DefView
               └ SysListView32   (바탕화면 아이콘)
       └ WorkerW            ← 벽지 층 (여기에 우리 창을 넣는다)
   Progman 에 0x052C 를 보내면 위 구조가 만들어진다. 만들어진 뒤
   SHELLDLL_DefView 를 가진 WorkerW 의 '다음 형제' WorkerW 가 벽지 층이다.
   윈도우 11 일부 빌드에서는 이 형제가 생기지 않는다 — 그때는 Progman 자체에 붙인다.

   여기에 넣으면
     · 다른 창이 위로 올라오고(가려짐)
     · 바탕화면 아이콘이 달력 위에 그대로 보이며 클릭도 아이콘에 먼저 간다
     · Win+D(바탕화면 보기)로도 사라지지 않는다
   ⚠ GUI 없는 환경에서는 검증이 불가능하다 — 실기에서 diagnose() 로 확인할 것. */
'use strict';

const GWL_STYLE = -16, GWL_EXSTYLE = -20;
const WS_CHILD = 0x40000000, WS_POPUP = 0x80000000;
const WS_EX_TOOLWINDOW = 0x00000080;
/* ⚠ WS_EX_NOACTIVATE 는 쓰지 않는다 — 창이 포커스를 못 받아 **로그인 칸에 글자를 못 친다**(실기에서 확인) */
const SM_XVIRTUALSCREEN = 76, SM_YVIRTUALSCREEN = 77;
const SWP_NOSIZE = 0x0001, SWP_NOMOVE = 0x0002, SWP_NOZORDER = 0x0004, SWP_NOACTIVATE = 0x0010, SWP_SHOWWINDOW = 0x0040;

let U = null;          // 불러온 user32 함수 묶음
let loadError = '';

/* HWND 는 포인터 크기 정수다. 64비트 빌드가 기본이지만 32비트도 대비한다. */
const PTR = process.arch === 'ia32' ? 'uint32' : 'uint64';

function load() {
  if (U || loadError) return U;
  let koffi;
  try { koffi = require('koffi'); }
  catch (e) { loadError = 'koffi 를 불러오지 못했습니다 (npm install 필요): ' + e.message; return null; }
  try {
    const u = koffi.load('user32.dll');
    U = {
      FindWindowExW: u.func(`${PTR} FindWindowExW(${PTR} parent, ${PTR} after, str16 cls, str16 title)`),
      SendMessageTimeoutW: u.func(`${PTR} SendMessageTimeoutW(${PTR} hwnd, uint msg, ${PTR} wp, ${PTR} lp, uint flags, uint timeout, _Out_ ${PTR} *res)`),
      SetParent: u.func(`${PTR} SetParent(${PTR} child, ${PTR} parent)`),
      GetParent: u.func(`${PTR} GetParent(${PTR} hwnd)`),
      IsChild: u.func(`int IsChild(${PTR} parent, ${PTR} child)`),
      GetWindowLongPtrW: u.func(`${PTR} GetWindowLongPtrW(${PTR} hwnd, int idx)`),
      SetWindowLongPtrW: u.func(`${PTR} SetWindowLongPtrW(${PTR} hwnd, int idx, ${PTR} val)`),
      SetWindowPos: u.func(`int SetWindowPos(${PTR} hwnd, ${PTR} after, int x, int y, int cx, int cy, uint flags)`),
      GetSystemMetrics: u.func('int GetSystemMetrics(int idx)')
    };
    return U;
  } catch (e) { loadError = 'user32.dll 호출 준비 실패: ' + e.message; return null; }
}

const N = v => (typeof v === 'bigint' ? Number(v) : (v || 0));

/* Electron 의 네이티브 핸들(Buffer) → 정수 HWND */
function hwndOf(win) {
  const b = win.getNativeWindowHandle();
  return process.arch === 'ia32' ? b.readUInt32LE(0) : Number(b.readBigUInt64LE(0));
}

/* 벽지 층 창을 찾는다. 반환: { target, how } */
function findWallpaperLayer() {
  const u = load(); if (!u) return null;
  const progman = N(u.FindWindowExW(0, 0, 'Progman', null));
  if (!progman) return null;

  /* 벽지 뒤 WorkerW 를 만들도록 셸에 요청 (0x052C). 실패해도 계속 진행한다 */
  try { u.SendMessageTimeoutW(progman, 0x052C, 0, 0, 0x0002 /*ABORTIFHUNG*/, 1000, [0]); } catch { /* 무시 */ }

  /* SHELLDLL_DefView 를 가진 WorkerW 의 다음 형제가 벽지 층 */
  let after = 0;
  for (let i = 0; i < 64; i++) {
    const w = N(u.FindWindowExW(0, after, 'WorkerW', null));
    if (!w) break;
    const def = N(u.FindWindowExW(w, 0, 'SHELLDLL_DefView', null));
    if (def) {
      const back = N(u.FindWindowExW(0, w, 'WorkerW', null));
      if (back) return { target: back, how: 'WorkerW(벽지 층)' };
      break;
    }
    after = w;
  }
  /* 윈도우 11 일부 빌드: 형제가 없다. Progman 에 직접 붙여도 아이콘 아래로 들어간다 */
  return { target: progman, how: 'Progman(직접)' };
}

/* 창을 바탕화면 층에 붙인다. 반환: { ok, how, error } */
function pin(win) {
  const u = load();
  if (!u) return { ok: false, how: '', error: loadError };
  if (process.platform !== 'win32') return { ok: false, how: '', error: '윈도우에서만 동작합니다' };

  const hwnd = hwndOf(win);
  const layer = findWallpaperLayer();
  if (!layer) return { ok: false, how: '', error: '바탕화면(Progman) 창을 찾지 못했습니다' };

  /* 화면 좌표를 기억해 두었다가 붙인 뒤 그 자리로 되돌린다.
     부모가 바뀌면 좌표 기준이 부모의 클라이언트 영역으로 바뀌기 때문이다.
     벽지 층의 원점은 '가상 화면의 좌상단'이라 모니터가 왼쪽/위에 붙어 있으면 음수 보정이 필요하다. */
  const b = win.getBounds();

  try {
    /* ⚠ Electron 의 프레임 없는 창은 WS_POPUP 이다. WS_POPUP 인 채로 SetParent 하면
       '소유'만 될 뿐 자식이 되지 않아 벽지 층에 들어가지 않는다(IsChild 가 false).
       WS_POPUP 을 떼고 WS_CHILD 를 붙인 뒤에 부모를 옮겨야 한다. */
    const st = N(u.GetWindowLongPtrW(hwnd, GWL_STYLE));
    u.SetWindowLongPtrW(hwnd, GWL_STYLE, (st & ~WS_POPUP) | WS_CHILD);
    const ex = N(u.GetWindowLongPtrW(hwnd, GWL_EXSTYLE));
    u.SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex | WS_EX_TOOLWINDOW);   /* Alt+Tab 에서만 뺀다 */
    u.SetParent(hwnd, layer.target);
  } catch (e) {
    return { ok: false, how: layer.how, error: 'SetParent 실패: ' + e.message };
  }

  const ok = !!N(u.IsChild(layer.target, hwnd));
  /* ⚠ 실패했는데 위치를 다시 잡으면 창이 5초마다 튀어 오른다 — 성공했을 때만 보정한다 */
  if (ok) {
    const vx = u.GetSystemMetrics(SM_XVIRTUALSCREEN);
    const vy = u.GetSystemMetrics(SM_YVIRTUALSCREEN);
    try {
      u.SetWindowPos(hwnd, 0, b.x - vx, b.y - vy, 0, 0,
        SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_SHOWWINDOW);
    } catch { /* 위치 보정 실패는 치명적이지 않다 */ }
  }
  return { ok, how: layer.how, error: ok ? '' : '부모로 옮겼지만 자식으로 확인되지 않았습니다' };
}

/* 바탕화면 층에서 떼어 낸다(항상 위·보통 창으로 돌아갈 때) */
function unpin(win) {
  const u = load(); if (!u) return false;
  const hwnd = hwndOf(win);
  try {
    u.SetParent(hwnd, 0);
    const st = N(u.GetWindowLongPtrW(hwnd, GWL_STYLE));
    u.SetWindowLongPtrW(hwnd, GWL_STYLE, (st & ~WS_CHILD) | WS_POPUP);   /* 원래 모양으로 되돌린다 */
    const ex = N(u.GetWindowLongPtrW(hwnd, GWL_EXSTYLE));
    u.SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex & ~WS_EX_TOOLWINDOW);
    return true;
  } catch { return false; }
}

/* 아직 붙어 있는지. 탐색기가 재시작되면 부모가 사라져 창이 떠 버린다 — 주기 점검용 */
function isPinned(win) {
  const u = load(); if (!u) return false;
  try { return !!N(u.GetParent(hwndOf(win))); } catch { return false; }
}

/* 실기 확인용 진단 — 트레이 메뉴에서 호출한다 */
function diagnose(win) {
  const u = load();
  const lines = [];
  lines.push('플랫폼: ' + process.platform + ' / ' + process.arch);
  lines.push('koffi: ' + (u ? '불러옴' : '실패 — ' + loadError));
  if (!u) return lines.join('\n');
  const progman = N(u.FindWindowExW(0, 0, 'Progman', null));
  lines.push('Progman: ' + (progman ? '찾음(' + progman + ')' : '못 찾음'));
  const layer = findWallpaperLayer();
  lines.push('붙일 층: ' + (layer ? layer.how + '(' + layer.target + ')' : '없음'));
  if (win) {
    lines.push('현재 부모: ' + (isPinned(win) ? '있음(고정됨)' : '없음(떠 있음)'));
    const b = win.getBounds();
    lines.push('창 위치: ' + b.x + ',' + b.y + ' ' + b.width + '×' + b.height);
  }
  return lines.join('\n');
}

/* ── 대안 층: '항상 맨 아래' ──
   ⚠ 윈도우에서 **자식 창은 레이어드 창이 될 수 없다** — SetParent 로 벽지 층에 넣으면
   Electron 의 transparent:true 가 깨져 배경이 검게 나올 수 있다(빌드·GPU 설정에 따라 다름).
   그 경우를 위해 창을 최상위로 둔 채 z-순서만 맨 아래로 내리는 방식을 함께 둔다.
   투명은 유지되지만 바탕화면 아이콘이 달력에 가려지고 Win+D 로 감춰진다. */
function sendToBottom(win) {
  const u = load(); if (!u) return false;
  try {
    const hwnd = hwndOf(win);
    const ex = N(u.GetWindowLongPtrW(hwnd, GWL_EXSTYLE));
    u.SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex | WS_EX_TOOLWINDOW);
    u.SetWindowPos(hwnd, 1 /*HWND_BOTTOM*/, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE);
    return true;
  } catch { return false; }
}

module.exports = { pin, unpin, isPinned, sendToBottom, diagnose };
