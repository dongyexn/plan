/* H서비스센터 업무 일정 — 바탕화면 위젯 (Electron)
   배포된 웹앱의 위젯 모드(?w=1)를 **투명·테두리 없는 창**으로 띄우고, 기본은 바탕화면에 붙인다
   (Desktopcal 처럼 벽지 위에 달력만 얹혀 있고 다른 창에 가려지는 형태).
   데이터는 웹앱과 같은 Firebase를 보므로 실시간으로 함께 갱신된다.

   실행    : npm install → npm start
   exe 생성: npm run dist  → dist/업무일정위젯.exe (설치 불필요 · 포터블) */
'use strict';
const { app, BrowserWindow, Tray, Menu, screen, shell, globalShortcut, dialog, session, clipboard } = require('electron');

/* 실패한 요청을 모아 둔다 — 사내망에서만 안 되는 이유를 추측 대신 이름으로 확인하기 위함.
   같은 exe 가 집에서는 되고 회사에서만 멈춘다면 원인은 PC 가 아니라 그 망에 있다. */
const NETERR = [];
function noteErr(kind, url, detail) {
  const host = (() => { try { return new URL(url).host; } catch { return url; } })();
  const line = new Date().toLocaleTimeString('ko-KR') + '  [' + kind + '] ' + host + '  ' + detail;
  if (NETERR[NETERR.length - 1] !== line) NETERR.push(line);
  if (NETERR.length > 60) NETERR.shift();
}
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
  if (s.v !== 3) {
    /* 'desktop'(벽지 층에 박기)·'normal'(보통 창)은 폐기 — 남아 있으면 바탕화면 모드로 옮긴다 */
    if (s.mode !== 'top') s.mode = 'below';
    s.v = 3;
    try { fs.writeFileSync(STATE_FILE, JSON.stringify(s)); } catch { /* 무시 */ }
  }
  return s;
}
function saveState(s) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(s)); } catch { /* 저장 실패는 무시 */ }
}

let win = null, tray = null;
let state = {};

/* 표시 층은 둘뿐이다.
   below : 바탕화면 모드 — 최상위 창을 유지한 채 z-순서만 맨 아래로. 반투명·입력 가능·다른 창에 가려짐(기본)
   top   : 항상 위에 표시
   ⚠ '벽지 층에 박는' 모드는 뺐다. 자식 창이 되면 키보드 포커스와 반투명을 둘 다 잃어 실사용이 안 된다(94차 결론). */
let botTimer = null;
/* 평소에는 창을 고정해 둔다 — 달력을 누르다가 위젯이 밀려 나가는 일이 없도록.
   위젯 설정의 '위치·크기 조정' 을 켜면 그때만 옮기고 크기를 바꿀 수 있다. */
function setLocked(lock) {
  state.locked = lock; saveState(state);
  if (!win) return;
  win.setMovable(!lock);
  win.setResizable(!lock);
}
function applyMode(mode) {
  state.mode = mode; saveState(state);
  if (!win) return;
  clearInterval(botTimer); botTimer = null;
  win.setSkipTaskbar(true);

  if (mode === 'top') { win.setAlwaysOnTop(true, 'floating'); if (tray) buildTray(); return; }

  win.setAlwaysOnTop(false);
  pin.sendToBottom(win);
  botTimer = setInterval(() => {
    if (!win || win.isDestroyed() || state.mode === 'top') return;
    /* Win+D(바탕화면 보기)나 최소화로 감춰지면 조용히 되살린다 */
    if (!win.isVisible()) { try { win.showInactive(); } catch { /* 무시 */ } }
    /* ⚠ 글자를 치는 중에 다시 내리면 다른 창 뒤로 숨어 버린다 — 포커스가 있으면 건드리지 않는다 */
    if (win.isFocused()) return;
    pin.sendToBottom(win);
  }, 1500);
  if (tray) buildTray();
}
/* 윈도우 시작 시 자동 실행 — 포터블 exe 라 실행 파일 경로를 그대로 등록한다 */
function setAutoStart(on) {
  state.autoStart = on; saveState(state);
  try { app.setLoginItemSettings({ openAtLogin: on, path: process.execPath, args: [] }); } catch { /* 정책상 막히면 무시 */ }
}
function isAutoStart() {
  /* ⚠ 사내 정책으로 등록이 막히면 API 는 계속 false 를 준다 — 저장해 둔 뜻(state.autoStart)도 함께 본다 */
  try { return app.getLoginItemSettings().openAtLogin || !!state.autoStart; } catch { return !!state.autoStart; }
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
  if (state.autoStart === undefined) setAutoStart(true);   /* 첫 실행이면 자동 실행을 켠 상태로 시작한다 */
  /* 유리 모드로 열어야 벽지가 비친다 — 주소에 &glass=1 을 붙인다 */
  win.loadURL(APP_URL + (APP_URL.indexOf('glass=') < 0 ? '&glass=1' : ''));
  /* 주소 자체를 못 여는 경우(사내망 차단 등)에는 흰 화면만 남는다 — 무엇이 막혔는지 보여 준다 */
  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    if (code === -3) return;   /* 사용자가 취소한 경우 */
    win.webContents.executeJavaScript(
      'document.body.innerHTML=' + JSON.stringify(
        '<div style="font:14px system-ui;padding:24px;color:#fff;background:#181c26;height:100%">'
        + '<b>주소를 열지 못했습니다</b><br><br>' + desc + ' (' + code + ')<br>'
        + '<span style="opacity:.7;font-size:12px">' + url + '</span></div>')
    ).catch(() => {});
  });

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
  if (win.isVisible()) { win.hide(); return; }
  /* 바탕화면 모드는 z-순서가 맨 아래라 그냥 show() 하면 다른 창에 가려 안 뜬 것처럼 보인다 —
     일단 앞으로 꺼낸 뒤 모드를 다시 적용해 제자리로 돌려놓는다 */
  win.show(); win.focus();
  setTimeout(() => applyMode(state.mode || 'below'), 400);
}

function buildTray() {
  const icon = path.join(__dirname, 'tray.png');
  if (!tray) tray = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: '위젯 보이기 / 숨기기', click: toggleWindow },
    { type: 'separator' },
    {
      label: '항상 위에 표시', type: 'checkbox', checked: state.mode === 'top',
      click: m => applyMode(m.checked ? 'top' : 'below')
    },
    {
      label: '윈도우 시작 시 자동 실행', type: 'checkbox', checked: isAutoStart(),
      click: m => setAutoStart(m.checked)
    },
    { type: 'separator' },
    { label: '새로고침', click: () => win && win.reload() },
    { label: '개발자 도구 (문제 확인)', click: () => win && win.webContents.openDevTools({ mode: 'detach' }) },
    {
      label: '네트워크 오류 보기' + (NETERR.length ? ' (' + NETERR.length + ')' : ''),
      click: () => {
        const body = NETERR.length ? NETERR.slice(-20).join('\n') : '기록된 오류가 없습니다.';
        dialog.showMessageBox({
          type: NETERR.length ? 'warning' : 'info', title: '네트워크 오류',
          message: NETERR.length ? '막힌 요청이 있습니다' : '막힌 요청이 없습니다',
          detail: body + '\n\n[복사]를 누르면 전체 내용이 클립보드에 담깁니다.',
          buttons: ['복사', '닫기'], defaultId: 0, cancelId: 1
        }).then(r => { if (r.response === 0) clipboard.writeText(NETERR.join('\n')); });
      }
    },
    { label: '브라우저 앱 열기', click: () => shell.openExternal(APP_URL.replace('?w=1', '')) },
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
  /* ⚠ 기본 User-Agent 에는 'Electron/…' 과 앱 이름이 들어 있다.
     로그인에 쓰이는 보안 확인(reCAPTCHA)이 이걸 보고 막아 '로그인 중…' 에서 멈추는 일이 있다
     (엣지에서는 되는데 위젯에서만 안 되던 원인). 창을 만들기 전에 브라우저와 같은 모양으로 바꾼다. */
  app.userAgentFallback = app.userAgentFallback
    .replace(/ Electron\/[\d.]+/g, '')
    .replace(/ 업무일정위젯\/[\d.]+/g, '')
    .replace(/ hservice-calendar-widget\/[\d.]+/g, '');

  app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });

  /* 인증서 검사(사내 보안 장비)가 가로막으면 여기로 온다 — 우회하지 않고 기록만 한다 */
  app.on('certificate-error', (e, wc, url, err) => { noteErr('인증서', url, err); });
  /* 프록시가 아이디·비밀번호를 요구하면 창이 안 뜨고 조용히 멈춘다 */
  app.on('login', (e, wc, req, auth) => { noteErr('프록시 인증 요구', req.url, auth.host || ''); });
  app.whenReady().then(() => {
    createWindow();
    buildTray();
    /* 요청 실패를 통째로 잡는다(차단·시간 초과·인증서 오류 등) */
    try {
      session.defaultSession.webRequest.onErrorOccurred({ urls: ['<all_urls>'] }, d => {
        if (/ERR_ABORTED|ERR_BLOCKED_BY_CLIENT$/.test(d.error || '')) return;
        noteErr('요청 실패', d.url, d.error);
      });
    } catch { /* 무시 */ }
    globalShortcut.register('Alt+Shift+C', toggleWindow);   // 단축키로 즉시 호출
    /* 문제가 생겼을 때 원인을 볼 수 있게 — 브라우저와 같은 단축키 */
    globalShortcut.register('CommandOrControl+Shift+I', () => win && win.webContents.openDevTools({ mode: 'detach' }));
  });
  app.on('window-all-closed', e => { /* 트레이에 남는다 — 종료하지 않음 */ });
  app.on('will-quit', () => globalShortcut.unregisterAll());
}
