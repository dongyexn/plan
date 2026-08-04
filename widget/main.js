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
const os = require('os');
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
/* ⚠ 창을 만들기 전에도 state 를 쓴다(부팅 업데이트·자동 실행 경로) — 여기서 미리 읽어야 한다.
   예전에는 createWindow 안에서야 읽어, 그 전 코드가 빈 설정을 보고 있었다. */
let state = loadState();

/* 표시 층은 둘뿐이다.
   below : 바탕화면 모드 — 최상위 창을 유지한 채 z-순서만 맨 아래로. 반투명·입력 가능·다른 창에 가려짐(기본)
   top   : 항상 위에 표시
   ⚠ '벽지 층에 박는' 모드는 뺐다. 자식 창이 되면 키보드 포커스와 반투명을 둘 다 잃어 실사용이 안 된다(94차 결론). */
let botTimer = null;
/* 평소에는 창을 고정해 둔다 — 달력을 누르다가 위젯이 밀려 나가는 일이 없도록.
   위젯 설정의 '위치·크기 조정' 을 켜면 그때만 옮기고 크기를 바꿀 수 있다. */
function setLocked(lock) {
  state.locked = lock;
  /* 조정을 끝내는 순간의 자리·크기를 확정해 둔다 */
  if (lock && win && !win.isDestroyed()) { try { state.bounds = win.getBounds(); } catch { /* 무시 */ } }
  saveState(state);
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
/* ⚠ 포터블 exe 는 실행할 때 임시 폴더(%TEMP%)에 풀려서 돌아간다 — `process.execPath` 는 그 임시 경로다.
   그대로 자동 실행에 등록하면 **재부팅 뒤 그 폴더가 없어 아무것도 뜨지 않는다.**
   electron-builder 가 원본 exe 경로를 `PORTABLE_EXECUTABLE_FILE` 로 넘겨 주므로 그것을 쓴다. */
function exePath() {
  return process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
}
/* 여느 프로그램처럼 '문서' 아래 전용 폴더를 쓴다 — 다운로드 폴더에 두면 정리하다 지워지고,
   그러면 자동 실행도 함께 깨진다(자동 실행은 파일이 있는 자리를 기억한다) */
function homeDir() {
  const docs = app.getPath('documents') || path.join(os.homedir(), 'Documents');
  return path.join(docs, 'H 주요업무현황');
}
function homeExe() { return path.join(homeDir(), 'HPlanWidget.exe'); }
/* 다른 곳에서 실행됐으면 전용 폴더로 자기 자신을 복사해 둔다(실행은 그대로 계속한다).
   다음 부팅부터는 복사본이 뜬다 */
function settleHome() {
  try {
    const src = exePath(), dst = homeExe();
    if (!src.toLowerCase().endsWith('.exe')) return src;      /* 개발 중(npm start)에는 건드리지 않는다 */
    if (path.normalize(src).toLowerCase() === path.normalize(dst).toLowerCase()) return dst;
    fs.mkdirSync(homeDir(), { recursive: true });
    const a = fs.statSync(src);
    let need = true;
    try { const b = fs.statSync(dst); need = a.size !== b.size || a.mtimeMs > b.mtimeMs; } catch { /* 없으면 복사 */ }
    if (need) fs.copyFileSync(src, dst);
    return dst;
  } catch { return exePath(); }                                /* 권한 등으로 막히면 지금 자리를 쓴다 */
}
function setAutoStart(on) {
  const p = on ? settleHome() : exePath();                     /* 등록은 늘 '문서' 안의 고정 경로로 */
  state.autoStart = on; state.autoPath = on ? p : ''; saveState(state);
  try {
    app.setLoginItemSettings({ openAtLogin: on, path: p, args: [] });
  } catch { /* 정책상 막히면 무시 */ }
}
function isAutoStart() {
  /* ⚠ 사내 정책으로 등록이 막히면 API 는 계속 false 를 준다 — 저장해 둔 뜻(state.autoStart)도 함께 본다 */
  try {
    return app.getLoginItemSettings({ path: state.autoPath || exePath(), args: [] }).openAtLogin || !!state.autoStart;
  } catch { return !!state.autoStart; }
}

function createWindow() {
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
  try { fs.unlinkSync(homeExe() + '.old'); } catch { /* 지난 버전 찌꺼기 — 없으면 그만 */ }
  if (state.autoStart === undefined) setAutoStart(true);        /* 첫 실행이면 자동 실행을 켠 상태로 시작한다 */
  /* exe 를 다른 곳으로 옮겼거나 예전 버전이 임시 경로를 등록해 뒀으면 지금 경로로 다시 등록한다 */
  else if (state.autoStart && state.autoPath !== homeExe()) setAutoStart(true);   /* 옛 임시 경로·옮긴 자리를 지금 자리로 */
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

  /* ⚠ 'moved'·'resized' 만으로는 놓치는 경우가 있다(드래그 레이어로 옮길 때 등).
     끄는 동안에도 계속 나오는 'move'·'resize' 를 함께 듣되, 저장은 잠잠해진 뒤 한 번만 한다. */
  let bt = null;
  const remember = (now) => {
    if (!win || win.isDestroyed()) return;
    clearTimeout(bt);
    const save = () => { try { state.bounds = win.getBounds(); saveState(state); } catch { /* 무시 */ } };
    if (now) save(); else bt = setTimeout(save, 400);
  };
  win.on('move', () => remember(false));
  win.on('resize', () => remember(false));
  win.on('moved', () => remember(true));
  win.on('resized', () => remember(true));
  win.on('close', () => remember(true));          /* 끄기 직전에 한 번 더 — 마지막 자리를 남긴다 */
  win.on('closed', () => { win = null; });
  app.on('before-quit', () => remember(true));
}

function toggleWindow() {
  if (!win) return createWindow();
  if (win.isVisible()) { win.hide(); return; }
  /* 바탕화면 모드는 z-순서가 맨 아래라 그냥 show() 하면 다른 창에 가려 안 뜬 것처럼 보인다 —
     일단 앞으로 꺼낸 뒤 모드를 다시 적용해 제자리로 돌려놓는다 */
  win.show(); win.focus();
  setTimeout(() => applyMode(state.mode || 'below'), 400);
}

/* 다운로드 폴더 같은 데서 실행됐다면, 문서 폴더에 자리 잡은 파일로 넘겨주고 이 프로세스는 끝낸다.
   ⚠ 두 벌이 돌아다니면 '업데이트했는데 그대로'인 상황이 생긴다 — 늘 한 자리에서만 돌게 한다.
   ⚠ 넘겨준 뒤 그쪽이 또 넘기려 들면 무한 고리가 되므로, 경로가 같으면 아무것도 하지 않는다. */
function handOverToHome() {
  try {
    const here = exePath(), home = settleHome();
    if (path.normalize(here).toLowerCase() === path.normalize(home).toLowerCase()) return false;
    if (!fs.existsSync(home)) return false;
    app.relaunch({ execPath: home });
    app.exit(0);
    return true;
  } catch { return false; }
}

/* ── 자동 업데이트 ───────────────────────────────────────────────
   앱 페이지가 알려 주는 최신 버전(설정 > 바탕화면 위젯)을 지금 버전과 견줘 새 파일을 받아 둔다.
   ⚠ 실행 중인 exe 는 스스로 덮어쓸 수 없다 — 받아만 두고, 사용자가 '지금 업데이트'를 누르면
   작은 명령을 띄워 위젯이 꺼진 뒤 파일을 바꿔치고 다시 실행한다.
   ⚠ GitHub API 를 쓰지 않는다(사내망에서 막히는 경우가 있다) — 이미 열려 있는 앱 페이지와 릴리스 주소만 쓴다. */
let UPD = null;                    /* {ver, url, file} — 받아 둔 새 버전 */
function newExePath() { return path.join(homeDir(), 'HPlanWidget.new.exe'); }
function verNum(v) { return String(v || '').split('.').map(n => Number(n) || 0); }
function isNewer(a, b) {                                   /* a 가 b 보다 새 버전인가 */
  const x = verNum(a), y = verNum(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  }
  return false;
}
function download(url, dest) {
  return new Promise((res, rej) => {
    const { net } = require('electron');
    const req = net.request(url);
    let file = null;
    req.on('response', r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {   /* 릴리스 주소는 한 번 더 넘어간다 */
        const loc = Array.isArray(r.headers.location) ? r.headers.location[0] : r.headers.location;
        r.resume(); return download(loc, dest).then(res, rej);
      }
      if (r.statusCode !== 200) { r.resume(); return rej(new Error('HTTP ' + r.statusCode)); }
      file = fs.createWriteStream(dest);
      r.on('data', c => file.write(c));
      r.on('end', () => file.end(() => res(dest)));
      r.on('error', rej);
    });
    req.on('error', rej);
    req.end();
  });
}
async function checkUpdate(loud) {
  if (!win) return;
  let info = null;
  try {
    info = await win.webContents.executeJavaScript('window.widInfo ? window.widInfo() : null');
  } catch { /* 페이지가 아직 안 떴을 수 있다 */ }
  if (!info || !info.ver || !info.url) {
    if (loud) dialog.showMessageBox({ type: 'info', title: '업데이트', message: '최신 버전 정보를 읽지 못했습니다.',
      detail: '앱 설정 > 바탕화면 위젯에 위젯 파일 주소와 버전이 입력돼 있어야 합니다.' });
    return;
  }
  if (!isNewer(info.ver, app.getVersion())) {
    if (loud) dialog.showMessageBox({ type: 'info', title: '업데이트', message: '최신 버전입니다.',
      detail: '지금 버전 ' + app.getVersion() });
    return;
  }
  try {
    fs.mkdirSync(homeDir(), { recursive: true });
    const part = newExePath() + '.part';
    await download(info.url, part);
    if (!verifyExe(part)) { try { fs.unlinkSync(part); } catch { /* 무시 */ } throw new Error('받다 만 파일'); }
    try { fs.unlinkSync(newExePath()); } catch { /* 없으면 그만 */ }
    fs.renameSync(part, newExePath());                     /* 다 받은 뒤에야 정식 이름을 준다 */
    UPD = { ver: info.ver, url: info.url, file: newExePath() };
    state.pendingVer = info.ver; saveState(state);   /* 다음 실행 때 이 값을 보고 스스로 갈아탄다 */
    buildTray();
    if (tray && tray.displayBalloon) tray.displayBalloon({ title: '새 위젯을 받아 뒀습니다',
      content: 'v' + info.ver + ' — 다음에 컴퓨터를 켤 때 저절로 적용됩니다' });
    if (loud) dialog.showMessageBox({ type: 'info', title: '업데이트', message: '새 버전을 받았습니다 (v' + info.ver + ')',
      detail: '다음에 컴퓨터를 켤 때 저절로 적용됩니다.\n지금 바로 적용하려면 트레이 메뉴의 \'지금 업데이트\'를 누르세요.' });
  } catch (e) {
    if (loud) dialog.showMessageBox({ type: 'warning', title: '업데이트', message: '새 버전을 받지 못했습니다.', detail: String(e && e.message || e) });
  }
}
/* 부팅 직후 — 받아 둔 새 버전이 있으면 카톡처럼 조용히 갈아타고 다시 뜬다.
   ⚠ 창을 만들기 전에 해야 화면이 깜빡이지 않는다. 갈아탈 게 없으면 false 를 준다 */
function takeUpdateOnBoot() {
  try {
    const f = newExePath();
    if (!state.pendingVer || !fs.existsSync(f)) return false;
    if (!isNewer(state.pendingVer, app.getVersion())) {   /* 이미 그 버전이거나 잘못 적힌 값 — 치우고 그냥 뜬다 */
      try { fs.unlinkSync(f); } catch { /* 무시 */ }
      state.pendingVer = ''; saveState(state);
      return false;
    }
    return swapAndRestart(f);                              /* 실패하면 그냥 지금 버전으로 뜬다 */
  } catch { return false; }
}
/* 받아 둔 파일로 바꿔치고 다시 실행한다.
   ⚠ 윈도우는 실행 중인 exe 를 **지울 수는 없어도 이름은 바꿀 수 있다** — 그 성질을 이용해
   현재 파일을 `.old` 로 밀어내고 새 파일을 제자리에 놓는다.
   ⚠ 예전처럼 `cmd /c move` 를 쓰면 **한글 폴더 이름이 명령창 인코딩에서 깨질 수 있다** — Node 로 직접 옮긴다.
   ⚠ 성공했을 때만 pendingVer 를 비운다(실패하면 다음 기회에 다시 시도해야 한다). */
function swapAndRestart(src) {
  const target = homeExe(), old = target + '.old';
  try {
    if (!verifyExe(src)) { try { fs.unlinkSync(src); } catch { /* 무시 */ } state.pendingVer = ''; saveState(state); return false; }
    try { fs.unlinkSync(old); } catch { /* 없으면 그만 */ }
    if (fs.existsSync(target)) fs.renameSync(target, old);   /* 실행 중이어도 이름 바꾸기는 된다 */
    fs.renameSync(src, target);
    state.pendingVer = ''; saveState(state);
  } catch (e) {
    try { if (!fs.existsSync(target) && fs.existsSync(old)) fs.renameSync(old, target); } catch { /* 되돌리기 실패는 무시 */ }
    return false;                                            /* 다음 기회에 다시 시도한다 */
  }
  app.relaunch({ execPath: target });
  app.exit(0);
  return true;
}
/* 받다 만 파일로 바꿔치면 위젯이 아예 안 뜬다 — 크기로 최소한의 확인을 한다 */
function verifyExe(f) {
  try { return fs.statSync(f).size > 20 * 1024 * 1024; } catch { return false; }
}
function applyUpdate() {
  if (!UPD) return false;
  return swapAndRestart(UPD.file);
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
    UPD
      ? {
          label: '지금 업데이트 (v' + UPD.ver + ')',
          click: () => {
            dialog.showMessageBox({
              type: 'question', title: '업데이트', message: '지금 새 버전으로 바꿀까요?',
              detail: '위젯이 잠깐 꺼졌다 다시 뜹니다. 쓰던 내용은 저장돼 있습니다.\n(기다리면 다음에 컴퓨터를 켤 때 저절로 적용됩니다)',
              buttons: ['지금 바꾸기', '나중에'], defaultId: 0, cancelId: 1
            }).then(r => { if (r.response === 0 && !applyUpdate()) {
              dialog.showMessageBox({ type: 'warning', title: '업데이트', message: '지금은 바꾸지 못했습니다.',
                detail: '다음에 컴퓨터를 켤 때 다시 시도합니다.' });
            } });
          }
        }
      : { label: '업데이트 확인', click: () => checkUpdate(true) },
    { label: '버전 ' + app.getVersion(), enabled: false },
    { label: '새로고침', click: () => win && win.reload() },
    { label: '개발자 도구 (문제 확인)', click: () => win && win.webContents.openDevTools({ mode: 'detach' }) },
    {
      label: '자동 실행 상태 확인',
      click: () => {
        let reg = '(확인 실패)';
        try { const s = app.getLoginItemSettings({ path: exePath(), args: [] }); reg = s.openAtLogin ? '등록됨' : '등록 안 됨'; } catch { /* 무시 */ }
        dialog.showMessageBox({
          type: 'info', title: '자동 실행',
          message: '윈도우 시작 시 자동 실행: ' + reg,
          detail: '등록된 실행 파일\n' + exePath()
            + '\n\n⚠ 이 경로에 파일이 그대로 있어야 재부팅 뒤에도 뜹니다.'
            + '\nexe 를 옮기거나 이름을 바꿨다면 위젯을 한 번 실행해 주세요(자동으로 다시 등록합니다).',
          buttons: ['복사', '닫기'], defaultId: 1, cancelId: 1
        }).then(r => { if (r.response === 0) clipboard.writeText(exePath()); });
      }
    },
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
    /* 카톡처럼 — 켜질 때 받아 둔 새 버전이 있으면 먼저 갈아탄다(창은 만들지 않는다) */
    if (takeUpdateOnBoot()) return;
    if (handOverToHome()) return;
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
    /* 시작 뒤 한 번, 그다음 6시간마다 조용히 확인한다(받아만 두고 알림만 띄운다) */
    setTimeout(() => checkUpdate(false), 90000);   /* 부팅 직후는 붐빈다 — 자리 잡은 뒤에 확인한다 */
    setInterval(() => checkUpdate(false), 6 * 60 * 60 * 1000);
    /* 문제가 생겼을 때 원인을 볼 수 있게 — 브라우저와 같은 단축키 */
    globalShortcut.register('CommandOrControl+Shift+I', () => win && win.webContents.openDevTools({ mode: 'detach' }));
  });
  app.on('window-all-closed', e => { /* 트레이에 남는다 — 종료하지 않음 */ });
  app.on('will-quit', () => globalShortcut.unregisterAll());
}
