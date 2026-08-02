/* H서비스센터 업무 일정 — 바탕화면 위젯 (Electron)
   배포된 웹앱의 위젯 모드(?w=1)를 **투명·테두리 없는 창**으로 띄우고, 기본은 바탕화면에 붙인다
   (Desktopcal 처럼 벽지 위에 달력만 얹혀 있고 다른 창에 가려지는 형태).
   데이터는 웹앱과 같은 Firebase를 보므로 실시간으로 함께 갱신된다.

   실행    : npm install → npm start
   exe 생성: npm run dist  → dist/업무일정위젯.exe (설치 불필요 · 포터블) */
'use strict';
const { app, BrowserWindow, Tray, Menu, screen, shell, globalShortcut, dialog } = require('electron');
const pin = require('./desktop-pin');
const path = require('path');
const fs = require('fs');

/* 위젯이 띄울 주소 — 배포 주소를 여기서 바꾸면 된다 */
const APP_URL = process.env.CALWIDGET_URL || 'https://dongyexn.github.io/plan/?w=1';

const STATE_FILE = path.join(app.getPath('userData'), 'widget-state.json');
const DEFAULT_BOUNDS = { width: 620, height: 520 };   /* 바탕화면 달력이므로 넓게 — 크기·위치는 기억된다 */

function loadState() {
  let s = {};
  try { s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { s = {}; }
  /* ⚠ 표시 모드는 userData 에 저장된다 — 기본값을 바꿔도 예전에 저장된 값이 그대로 이긴다.
     'desktop'(바탕화면에 박기)은 키 입력이 안 되는 보기 전용이라, 예전에 그걸로 저장돼 있으면
     한 번만 '바탕화면 모드'로 옮겨 준다(사용자가 다시 고르면 그 선택은 유지된다). */
  if (s.v !== 2) {
    if (s.mode === 'desktop') s.mode = 'below';
    s.v = 2;
    try { fs.writeFileSync(STATE_FILE, JSON.stringify(s)); } catch { /* 무시 */ }
  }
  return s;
}
function saveState(s) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(s)); } catch { /* 저장 실패는 무시 */ }
}

let win = null, tray = null;
let state = {};

/* 창을 어느 층에 둘지.
   desktop : 벽지 위 · 바탕화면 아이콘 아래에 끼워 넣는다(다른 창에 가려지고 Win+D 에도 남는다)
   top     : 항상 위
   normal  : 보통 창
   실제 끼워 넣기는 desktop-pin.js(user32 호출)가 한다. 실패하면 '항상 위 끄기'로 물러난다. */
let pinTimer = null, lastPin = null, prevMode = null;
/* 평소에는 창을 고정해 둔다 — 달력을 누르다가 위젯이 밀려 나가는 일이 없도록.
   위젯 설정의 '위치·크기 조정' 을 켜면 그때만 옮기고 크기를 바꿀 수 있다. */
function setLocked(lock) {
  state.locked = lock; saveState(state);
  if (!win) return;
  win.setMovable(!lock);
  win.setResizable(!lock);
}
/* ⚠ 바탕화면 층(벽지 창의 자식)에 들어간 창은 **키보드 포커스를 받을 수 없다**.
   윈도우가 키 입력을 최상위 창에만 보내기 때문이며, 고칠 수 있는 설정이 아니다.
   그래서 고정 모드는 '보기 전용'이고, 로그인·업무 작성은 입력 가능한 층에서 한다.
   트레이의 '입력 모드'가 잠시 위로 꺼내 주고, 끝나면 되돌린다. */
function applyMode(mode) {
  state.mode = mode; saveState(state);
  if (!win) return;
  clearInterval(pinTimer); pinTimer = null;

  if (mode === 'top' || mode === 'normal') {
    pin.unpin(win);
    win.setAlwaysOnTop(mode === 'top', 'floating');
    win.setSkipTaskbar(state.skipTaskbar !== false);
    if (tray) buildTray();
    return;
  }

  win.setAlwaysOnTop(false);
  win.setSkipTaskbar(true);

  if (mode === 'below') {
    /* 바탕화면 모드 — 최상위 창 그대로 두고 z-순서만 맨 아래로 내린다.
       창이 최상위이므로 **투명도 유지되고 키보드 입력도 된다**(자식 창이 되면 둘 다 잃는다). */
    pin.unpin(win);
    lastPin = { ok: pin.sendToBottom(win), how: '바탕화면 모드(맨 아래)', error: '' };
    pinTimer = setInterval(() => {
      if (!win || win.isDestroyed() || state.mode !== 'below') return;
      /* Win+D(바탕화면 보기)나 최소화로 감춰지면 조용히 되살린다 */
      if (!win.isVisible()) { try { win.showInactive(); } catch { /* 무시 */ } }
      /* ⚠ 글자를 치는 중에 다시 내리면 다른 창 뒤로 숨어 버린다 — 포커스가 있으면 건드리지 않는다 */
      if (win.isFocused()) return;
      pin.sendToBottom(win);
    }, 1500);
    if (tray) buildTray();
    return;
  }

  lastPin = pin.pin(win);          /* desktop — 벽지 층에 끼워 넣기(아이콘이 위로 온다) */
  if (lastPin.ok && !state.pinNoticed) {
    state.pinNoticed = true; saveState(state);
    dialog.showMessageBox({
      type: 'info', title: '바탕화면에 고정했습니다',
      message: '이제 달력이 바탕화면에 붙어 다른 창에 가려집니다.',
      detail: '이 상태에서는 글자를 칠 수 없습니다(윈도우가 바탕화면 층 창에는 키 입력을 보내지 않습니다).\n'
        + '로그인이나 업무 작성이 필요하면 트레이 아이콘 → "입력 모드로" 를 누르세요.',
      buttons: ['확인']
    });
  }
  /* 탐색기가 재시작되면 부모가 사라져 창이 떠 버린다 — 주기적으로 확인해 다시 붙인다.
     ⚠ 계속 실패하는 PC 에서 무한히 재시도하면 창이 5초마다 튀어 오른다 — 세 번 실패하면 멈춘다 */
  let fails = lastPin && lastPin.ok ? 0 : 1;
  pinTimer = setInterval(() => {
    if (!win || win.isDestroyed() || state.mode !== 'desktop') return;
    if (pin.isPinned(win)) { fails = 0; return; }
    lastPin = pin.pin(win);
    if (lastPin.ok) { fails = 0; return; }
    if (++fails >= 3) { clearInterval(pinTimer); pinTimer = null; if (tray) buildTray(); }
  }, 5000);
  if (tray) buildTray();
}

function createWindow() {
  state = loadState();
  const area = screen.getPrimaryDisplay().workAreaSize;
  /* 바탕화면 모드에서는 달력이 아이콘을 가린다 — 아이콘이 몰려 있는 왼쪽을 피해 오른쪽 위에 놓는다 */
  const b = state.bounds || {
    ...DEFAULT_BOUNDS,
    x: Math.max(0, area.width - DEFAULT_BOUNDS.width - 24),
    y: 40
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

  /* 예전 실행에서 자식 창으로 바뀐 상태가 남아 있을 수 있다 — 어떤 모드로 가든 먼저 원래 모양으로 되돌린다 */
  pin.unpin(win);
  applyMode(state.mode || 'below');   /* 기본 = 바탕화면 모드: 반투명 · 다른 창 아래 · 입력 가능 */
  /* 유리 모드로 열어야 벽지가 비친다 — 주소에 &glass=1 을 붙인다 */
  win.loadURL(APP_URL + (APP_URL.indexOf('glass=') < 0 ? '&glass=1' : ''));

  /* 주입한 버튼은 해시 변경으로 신호를 보낸다 (preload 없이 처리) */
  win.webContents.on('did-navigate-in-page', (_e, url) => {
    if (url.endsWith('#move')) setLocked(false);
    if (url.endsWith('#moveoff')) setLocked(true);
  });
  setLocked(state.locked !== false);

  /* 보안 — 위젯 창은 지정한 주소 밖으로 못 나가고, 새 창은 기본 브라우저로만 연다 */
  const origin = (() => { try { return new URL(APP_URL).origin; } catch { return null; } })();
  /* ⚠ 로그인(Firebase signInWithPopup)은 새 창을 띄운다. 전부 바깥 브라우저로 보내면
     위젯 안에서는 영원히 로그인이 안 끝난다 — 인증 도메인만 실제 창으로 연다 */
  const AUTH_HOSTS = /(^|\.)(google\.com|googleapis\.com|gstatic\.com|firebaseapp\.com|web\.app|microsoftonline\.com|live\.com)$/i;
  win.webContents.setWindowOpenHandler(({ url }) => {
    let h = '';
    try { h = new URL(url).hostname; } catch { /* 잘못된 주소는 무시 */ }
    if (h && AUTH_HOSTS.test(h)) {
      return { action: 'allow', overrideBrowserWindowOptions: {
        width: 520, height: 640, autoHideMenuBar: true, resizable: true,
        webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
      } };
    }
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    let u; try { u = new URL(url); } catch { e.preventDefault(); return; }
    if (!origin || u.origin === origin) return;
    if (AUTH_HOSTS.test(u.hostname)) return;     /* 로그인 리디렉트는 허용 */
    e.preventDefault();
    if (/^https?:/.test(url)) shell.openExternal(url);
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
  if (!tray) tray = new Tray(icon);
  const pinned = state.mode === 'desktop';
  const menu = Menu.buildFromTemplate([
    {
      label: '현재: ' + ({ below: '바탕화면 모드 (입력 가능)', desktop: '바탕화면에 박기 (입력 불가)',
                          top: '항상 위에 표시', normal: '보통 창' }[state.mode || 'below']),
      enabled: false
    },
    { label: '위젯 보이기 / 숨기기', click: toggleWindow },
    {
      label: pinned ? '입력 모드로 (로그인·업무 작성)' : '입력 모드 (지금 켜져 있음)',
      enabled: pinned,
      click: () => { prevMode = 'desktop'; applyMode('top'); if (win) { win.show(); win.focus(); } }
    },
    ...(prevMode === 'desktop' && state.mode !== 'desktop'
      ? [{ label: '↩ 바탕화면 고정으로 되돌리기', click: () => { prevMode = null; applyMode('desktop'); } }]
      : []),
    { type: 'separator' },
    {
      label: '바탕화면에 박기 (아이콘이 위로 · 입력 불가)' + (pinned && lastPin && !lastPin.ok ? ' — 실패, 진단 참고' : ''),
      type: 'radio', checked: state.mode === 'desktop',
      click: () => applyMode('desktop')
    },
    {
      label: '바탕화면 모드 (반투명 · 입력 가능)', type: 'radio', checked: (state.mode || 'below') === 'below',
      click: () => applyMode('below')
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
    {
      label: '바탕화면 고정 진단',
      click: () => dialog.showMessageBox({
        type: 'info', title: '바탕화면 고정 진단',
        message: pin.diagnose(win),
        detail: lastPin ? ('마지막 시도: ' + (lastPin.ok ? '성공' : '실패') + (lastPin.how ? ' / ' + lastPin.how : '') + (lastPin.error ? '\n' + lastPin.error : '')) : '아직 시도하지 않았습니다',
        buttons: ['확인']
      })
    },
    { label: '브라우저에서 전체 화면 열기', click: () => shell.openExternal(APP_URL.replace('?w=1', '')) },
    { type: 'separator' },
    { label: '종료', click: () => { app.quit(); } }
  ]);
  tray.setToolTip('H · 주요업무현황 위젯');
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
