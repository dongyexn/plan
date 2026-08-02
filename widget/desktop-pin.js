/* 위젯 창의 z-순서 제어 — user32 직접 호출(koffi).
   창을 '항상 맨 아래'로 내려 바탕화면 위에 얹힌 것처럼 보이게 한다.
   ⚠ 벽지 창(WorkerW)의 자식으로 넣는 방식은 폐기했다 — 자식 창이 되면 키보드 포커스와
   반투명(레이어드)을 둘 다 잃어 위젯으로 쓸 수 없다(94차 결론). 필요해지면 git 기록에서 되살릴 것. */
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

/* ── 대안 층: '항상 맨 아래' ──
   ⚠ 윈도우에서 **자식 창은 레이어드 창이 될 수 없다** — SetParent 로 벽지 층에 넣으면
   Electron 의 transparent:true 가 깨져 배경이 검게 나올 수 있다(빌드·GPU 설정에 따라 다름).
   그 경우를 위해 창을 최상위로 둔 채 z-순서만 맨 아래로 내리는 방식을 함께 둔다.
   투명은 유지되지만 바탕화면 아이콘이 달력에 가려지고 Win+D 로 감춰진다. */
/* 예전 버전이 남긴 자식 창 상태(WS_CHILD·부모)를 원래대로 되돌린다 — 시작할 때 한 번 부른다 */
function unpin(win) {
  const u = load(); if (!u) return false;
  try {
    const hwnd = hwndOf(win);
    u.SetParent(hwnd, 0);
    const st = N(u.GetWindowLongPtrW(hwnd, GWL_STYLE));
    u.SetWindowLongPtrW(hwnd, GWL_STYLE, (st & ~WS_CHILD) | WS_POPUP);
    return true;
  } catch { return false; }
}
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

module.exports = { unpin, sendToBottom };
