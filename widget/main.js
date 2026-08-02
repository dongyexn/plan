/* H서비스센터 업무 일정 — 바탕화면 위젯 (Electron)
   배포된 웹앱의 위젯 모드(?w=1)를 **투명·테두리 없는 창**으로 띄우고, 기본은 바탕화면에 붙인다
   (Desktopcal 처럼 벽지 위에 달력만 얹혀 있고 다른 창에 가려지는 형태).
   데이터는 웹앱과 같은 Firebase를 보므로 실시간으로 함께 갱신된다.

   실행    : npm install → npm start
   exe 생성: npm run dist  → dist/업무일정위젯.exe (설치 불필요 · 포터블) */
'use strict';
const { app, BrowserWindow, Tray, Menu, screen, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

/* 위젯이 띄울 주소 — 배포 주소를 여기서 바꾸면 된다 */
const APP_URL = process.env.CALWIDGET_URL || 'https://dongyexn.github.io/plan/?w=1';

const STATE_FILE = path.join(app.getPath('userData'), 'widget-state.json');
const DEFAULT_BOUNDS = { width: 380, height: 560 };

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}
function saveState(s) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(s)); } catch { /* 저장 실패는 무시 */ }
}

let win = null, tray = null;
let state = {};

/* 창을 어느 층에 둘지.
   desktop : 벽지 위에 붙어 다른 창에 가려진다(Desktopcal 과 같은 형태)
   top     : 항상 위
   normal  : 보통 창
   ⚠ 윈도우에서 '바탕화면에 붙이기'는 Electron API 로는 안 되고 Win32 로 벽지 창(WorkerW)에
   부모를 옮겨야 한다. koffi 가 있으면 그렇게 하고, 없으면 '항상 위 끄기'로 물러난다(창이 완전히
   가려지지는 않지만 다른 창 아래로 내려간다). koffi 는 선택 의존성이라 없어도 앱은 뜬다. */
function attachToWallpaper(hwnd) {
  if (process.platform !== 'win32') return false;
  let koffi;
  try { koffi = require('koffi'); } catch { return false; }
  try {
    const user32 = koffi.load('user32.dll');
    const FindWindowExA = user32.func('void* FindWindowExA(void*, void*, str, str)');
    const SendMessageTimeoutA = user32.func('long SendMessageTimeoutA(void*, uint, void*, void*, uint, uint, void*)');
    const SetParent = user32.func('void* SetParent(void*, void*)');
    const progman = FindWindowExA(null, null, 'Progman', null);
    if (!progman) return false;
    /* Progman 에 0x052C 를 보내면 벽지 뒤에 WorkerW 가 만들어진다 */
    SendMessageTimeoutA(progman, 0x052C, null, null, 0, 1000, null);
    let workerw = null, after = null;
    for (;;) {
      const shellView = FindWindowExA(null, after, 'WorkerW', null);
      if (!shellView) break;
      const def = FindWindowExA(shellView, null, 'SHELLDLL_DefView', null);
      if (def) { workerw = FindWindowExA(null, shellView, 'WorkerW', null); break; }
      after = shellView;
    }
    if (!workerw) return false;
    SetParent(hwnd, workerw);
    return true;
  } catch { return false; }
}
function applyMode(mode) {
  state.mode = mode; saveState(state);
  if (!win) return;
  if (mode === 'top') { win.setAlwaysOnTop(true, 'floating'); return; }
  win.setAlwaysOnTop(false);
  if (mode !== 'desktop') return;
  const ok = attachToWallpaper(win.getNativeWindowHandle());
  if (!ok) win.setSkipTaskbar(state.skipTaskbar !== false);   /* 물러난 경우에도 위젯처럼 보이게 */
}

function createWindow() {
  state = loadState();
  const area = screen.getPrimaryDisplay().workAreaSize;
  const b = state.bounds || {
    ...DEFAULT_BOUNDS,
    x: area.width - DEFAULT_BOUNDS.width - 24,
    y: 60
  };

  win = new BrowserWindow({
    ...b,
    minWidth: 300, minHeight: 380,
    frame: false,              // 테두리 없음 — 위젯처럼 보이게
    transparent: true,         // 벽지가 비치도록 — 창 배경은 웹앱의 유리 모드가 그린다
    hasShadow: false,
    resizable: true,
    skipTaskbar: state.skipTaskbar !== false,   // 바탕화면 위젯이므로 기본은 작업표시줄에서 숨김
    alwaysOnTop: state.mode === 'top',
    autoHideMenuBar: true,
    backgroundColor: '#00000000',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, webviewTag: false }
  });

  applyMode(state.mode || 'desktop');
  /* 유리 모드로 열어야 벽지가 비친다 — 주소에 &glass=1 을 붙인다 */
  win.loadURL(APP_URL + (APP_URL.indexOf('glass=') < 0 ? '&glass=1' : ''));

  /* 프레임이 없으므로 드래그 영역과 닫기 버튼을 주입한다.
     (웹앱 자체는 손대지 않고 위젯에서만 덧입힌다) */
  win.webContents.on('did-finish-load', () => {
    win.webContents.insertCSS(`
      body.wid { padding-top: 26px !important; }
      #wgbar { position: fixed; top: 0; left: 0; right: 0; height: 26px; z-index: 99999;
        -webkit-app-region: drag; display: flex; align-items: center; gap: 6px;
        padding: 0 8px; font: 600 11px/1 'Pretendard Variable', sans-serif;
        color: rgba(60,60,67,.6); background: rgba(255,255,255,.72);
        backdrop-filter: blur(12px); border-bottom: 1px solid rgba(60,60,67,.12); }
      html.dark #wgbar { color: rgba(236,236,236,.7); background: rgba(33,33,33,.8);
        border-bottom-color: rgba(255,255,255,.12); }
      #wgbar .sp { flex: 1; }
      #wgbar button { -webkit-app-region: no-drag; border: 0; background: transparent;
        cursor: pointer; color: inherit; font: inherit; padding: 3px 6px; border-radius: 6px; }
      #wgbar button:hover { background: rgba(120,120,128,.16); }
    `);
    win.webContents.executeJavaScript(`
      if (!document.getElementById('wgbar')) {
        const bar = document.createElement('div');
        bar.id = 'wgbar';
        bar.innerHTML = '<span>업무 일정</span><span class="sp"></span>' +
          '<button id="wgOpen" title="브라우저에서 열기">↗</button>' +
          '<button id="wgHide" title="숨기기">−</button>';
        document.body.appendChild(bar);
        document.getElementById('wgHide').onclick = () => location.hash = '#hide';
        document.getElementById('wgOpen').onclick = () => location.hash = '#open';
      }
    `).catch(() => {});
  });

  /* 주입한 버튼은 해시 변경으로 신호를 보낸다 (preload 없이 처리) */
  win.webContents.on('did-navigate-in-page', (_e, url) => {
    if (url.endsWith('#hide')) { win.hide(); win.webContents.executeJavaScript('location.hash=""').catch(() => {}); }
    if (url.endsWith('#open')) { shell.openExternal(APP_URL.replace('?w=1', '')); win.webContents.executeJavaScript('location.hash=""').catch(() => {}); }
  });

  /* 보안 — 위젯 창은 지정한 주소 밖으로 못 나가고, 새 창은 기본 브라우저로만 연다 */
  const origin = (() => { try { return new URL(APP_URL).origin; } catch { return null; } })();
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!origin || new URL(url).origin !== origin) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); }
  });
  win.webContents.on('will-attach-webview', e => e.preventDefault());

  const remember = () => { state.bounds = win.getBounds(); saveState(state); };
  win.on('moved', remember);
  win.on('resized', remember);
  win.on('closed', () => { win = null; });
}

function toggleWindow() {
  if (!win) return createWindow();
  if (win.isVisible()) win.hide(); else { win.show(); win.focus(); }
}

function buildTray() {
  const icon = path.join(__dirname, 'tray.png');
  tray = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: '위젯 보이기 / 숨기기', click: toggleWindow },
    { type: 'separator' },
    {
      label: '바탕화면에 고정', type: 'radio', checked: (state.mode || 'desktop') === 'desktop',
      click: () => applyMode('desktop')
    },
    {
      label: '항상 위에 표시', type: 'radio', checked: state.mode === 'top',
      click: () => applyMode('top')
    },
    {
      label: '보통 창', type: 'radio', checked: state.mode === 'normal',
      click: () => applyMode('normal')
    },
    {
      label: '작업표시줄에 숨기기', type: 'checkbox', checked: !!state.skipTaskbar,
      click: m => { state.skipTaskbar = m.checked; saveState(state); if (win) win.setSkipTaskbar(m.checked); }
    },
    { label: '새로고침', click: () => win && win.reload() },
    { type: 'separator' },
    { label: '브라우저에서 전체 화면 열기', click: () => shell.openExternal(APP_URL.replace('?w=1', '')) },
    { type: 'separator' },
    { label: '종료', click: () => { app.quit(); } }
  ]);
  tray.setToolTip('H서비스센터 업무 일정');
  tray.setContextMenu(menu);
  tray.on('click', toggleWindow);
}

/* 중복 실행 방지 — 이미 떠 있으면 기존 창을 보여준다 */
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });
  app.whenReady().then(() => {
    createWindow();
    buildTray();
    globalShortcut.register('Alt+Shift+C', toggleWindow);   // 단축키로 즉시 호출
  });
  app.on('window-all-closed', e => { /* 트레이에 남는다 — 종료하지 않음 */ });
  app.on('will-quit', () => globalShortcut.unregisterAll());
}
