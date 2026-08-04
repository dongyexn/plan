/* H서비스센터 업무 일정 — 바탕화면 위젯 Lite (Tauri v2 · WebView2)
   Electron 위젯(widget/main.js v1.1.0)의 기능·동작·교훈을 그대로 이식한 저용량판이다.
   크로미엄을 내장하지 않고 윈도우에 이미 있는 WebView2(엣지)를 쓰므로 exe 가 수 MB 로 준다.

   ⚠ 병행 파일럿: 기존 HPlanWidget.exe(Electron)와 같은 문서 폴더를 쓰되
     · exe 이름 HPlanWidgetLite.exe · 설정 %APPDATA%\HPlanWidgetLite · 로그 widget-lite-log.txt
     · 자동실행 레지스트리 키 HPlanWidgetLite  로 분리한다.
     둘을 동시에 켜면 알림·백업이 겹치므로 파일럿 기간에는 한쪽만 켠다(README 참조).
     읽어주세요.txt 는 Electron 위젯 것이므로 여기서는 건드리지 않는다.

   앱과의 창구는 Electron 의 executeJavaScript 대신 **주입 스크립트 + 이벤트 브리지**로 재현한다
   (app.js 는 한 글자도 바꾸지 않는다 — window.bootBrief()·bkExport() 등을 그대로 부른다).

   빌드는 GitHub Actions(.github/workflows/widget-lite.yml)가 한다 — 회사 PC 제약과 무관. */
#![cfg_attr(windows, windows_subsystem = "windows")]

use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{mpsc, Mutex};
use std::time::Duration;
use tauri::menu::{CheckMenuItem, MenuBuilder, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Listener, Manager, WebviewWindow};

/* 위젯이 띄울 주소 — 배포 주소를 여기서 바꾸면 된다(환경변수 CALWIDGET_URL 로 임시 변경 가능) */
fn app_url() -> String {
    std::env::var("CALWIDGET_URL").unwrap_or_else(|_| "https://dongyexn.github.io/plan/?w=1".into())
}
const EXE_NAME: &str = "HPlanWidgetLite.exe";
const AUMID: &str = "com.hdec.hservice.widget.lite"; /* ⚠ 이게 없으면 윈도우 알림 표기가 이상해진다(Electron 174차와 동일) */
const RUN_KEY_NAME: &str = "HPlanWidgetLite"; /* 자동 실행 레지스트리 값 이름 — Electron 것과 분리 */

/* ══════════ 저장 상태 ══════════
   ⚠ Electron 교훈(146차): 설정 경로를 프로그램 시작 시점에 굳히지 말 것 — 여기서는 함수로 늘 계산한다.
   ⚠ Electron 교훈(96차): 기본값만 바꾸면 저장된 옛 값이 이긴다 — 필드 추가 시 #[serde(default)] 로 흡수. */
#[derive(Serialize, Deserialize, Default, Clone)]
struct St {
    #[serde(default)] v: i32,
    #[serde(default)] mode: String,          /* "below"(바탕화면·기본) / "top"(항상 위) */
    #[serde(default)] locked: Option<bool>,  /* 위치·크기 잠금 — 기본 true */
    #[serde(default)] bounds: Option<Bounds>,/* 물리 픽셀 — 모니터 배율과 무관하게 저장 */
    #[serde(default)] auto_start: Option<bool>,
    #[serde(default)] auto_path: String,
    #[serde(default)] brief_day: String,     /* 오늘 업무 알림을 이미 띄운 날짜 */
    #[serde(default)] noted_mentions: Vec<String>,
    #[serde(default)] last_backup: String,
    #[serde(default)] pending_ver: String,   /* 받아 둔 새 버전 — 다음 부팅 때 갈아탄다 */
}
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq)]
struct Bounds { x: i32, y: i32, w: u32, h: u32 }

static STATE: Lazy<Mutex<St>> = Lazy::new(|| Mutex::new(St::default()));
static RESTORED: AtomicBool = AtomicBool::new(false); /* ⚠ 160차: 되돌리기 전에는 어떤 저장도 금지 */
static QUITTING: AtomicBool = AtomicBool::new(false);
static UPD: Lazy<Mutex<Option<(String, PathBuf)>>> = Lazy::new(|| Mutex::new(None)); /* (버전, 받아 둔 파일) */

fn state_dir() -> PathBuf { dirs::config_dir().unwrap_or_else(std::env::temp_dir).join("HPlanWidgetLite") }
fn state_file() -> PathBuf { state_dir().join("widget-state.json") }
fn load_state() -> St {
    let mut s: St = std::fs::read_to_string(state_file()).ok()
        .and_then(|t| serde_json::from_str(&t).ok()).unwrap_or_default();
    if s.v != 1 { if s.mode != "top" { s.mode = "below".into(); } s.v = 1; }
    s
}
fn save_state() {
    let s = STATE.lock().unwrap().clone();
    let _ = std::fs::create_dir_all(state_dir());
    if let Ok(t) = serde_json::to_string(&s) { let _ = std::fs::write(state_file(), t); }
}

/* ══════════ 진단 기록 ══════════
   자리·크기가 왜 안 남는지 추측으로 쫓지 않기 위해 무슨 일이 있었는지 파일에 적는다(160차에서 이 기록 한 장으로 해결). */
fn home_dir() -> PathBuf {
    let docs = dirs::document_dir().unwrap_or_else(|| dirs::home_dir().unwrap_or_default().join("Documents"));
    docs.join("H 주요업무현황")
}
fn home_exe() -> PathBuf { home_dir().join(EXE_NAME) }
fn log(msg: &str) {
    let f = home_dir().join("widget-lite-log.txt");
    let _ = std::fs::create_dir_all(home_dir());
    let old = std::fs::read_to_string(&f).unwrap_or_default();
    let mut lines: Vec<&str> = old.lines().collect();
    let keep = lines.len().saturating_sub(200);
    lines.drain(..keep);
    let now = chrono_lite_now();
    let line = format!("{}  {}", now, msg);
    let mut out = lines.join("\n");
    if !out.is_empty() { out.push('\n'); }
    out.push_str(&line);
    let _ = std::fs::write(&f, out);
}
/* 외부 시간 크레이트 없이 현지 시각 문자열 — 초 단위면 충분하다 */
fn chrono_lite_now() -> String {
    /* SystemTime → 현지 변환은 표준만으로 번거로우니 KST(+9) 고정으로 적는다 — 진단용이라 충분 */
    let secs = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0) + 9 * 3600;
    let (days, rem) = (secs / 86400, secs % 86400);
    let (h, m, s2) = (rem / 3600, rem % 3600 / 60, rem % 60);
    /* 1970-01-01 기준 일수 → 연월일 */
    let mut y = 1970i64; let mut d = days as i64;
    loop { let leap = if y % 4 == 0 && (y % 100 != 0 || y % 400 == 0) { 366 } else { 365 };
        if d < leap { break; } d -= leap; y += 1; }
    let leap = y % 4 == 0 && (y % 100 != 0 || y % 400 == 0);
    let ml = [31, if leap {29} else {28}, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let mut mo = 0usize; while d >= ml[mo] { d -= ml[mo]; mo += 1; }
    format!("{:04}-{:02}-{:02} {:02}:{:02}:{:02}", y, mo + 1, d + 1, h, m, s2)
}
fn today_str() -> String { chrono_lite_now()[..10].to_string() }

/* ══════════ user32 직접 호출 ══════════
   desktop-pin.js(koffi) 이식 — 창을 최상위로 둔 채 z-순서만 맨 아래로 내린다.
   ⚠ 94차: 벽지 창의 자식(WS_CHILD)으로 넣는 방식은 폐기 — 키보드 포커스·반투명을 둘 다 잃는다.
   ⚠ WS_EX_NOACTIVATE 도 쓰지 않는다 — 로그인 칸에 글자를 못 친다(실기 확인). */
#[cfg(windows)]
mod win32 {
    #[link(name = "user32")]
    extern "system" {
        pub fn SetWindowPos(h: isize, after: isize, x: i32, y: i32, cx: i32, cy: i32, flags: u32) -> i32;
        pub fn GetWindowLongPtrW(h: isize, idx: i32) -> isize;
        pub fn SetWindowLongPtrW(h: isize, idx: i32, v: isize) -> isize;
        pub fn GetForegroundWindow() -> isize;
    }
    #[link(name = "shell32")]
    extern "system" { pub fn SetCurrentProcessExplicitAppUserModelID(id: *const u16) -> i32; }
    pub const HWND_BOTTOM: isize = 1;
    pub const SWP_NOSIZE: u32 = 0x0001; pub const SWP_NOMOVE: u32 = 0x0002;
    pub const SWP_NOACTIVATE: u32 = 0x0010; pub const SWP_SHOWWINDOW: u32 = 0x0040;
    pub const GWL_EXSTYLE: i32 = -20; pub const WS_EX_TOOLWINDOW: isize = 0x0000_0080;
}
fn hwnd_of(w: &WebviewWindow) -> Option<isize> { w.hwnd().ok().map(|h| h.0 as isize) }
fn send_to_bottom(w: &WebviewWindow) {
    #[cfg(windows)] if let Some(h) = hwnd_of(w) { unsafe {
        /* ⚠ 확장 스타일은 **바뀔 때만** 쓴다 — 1.5초마다 다시 쓰면 글자를 치는 중에 방해가 된다(187차) */
        let ex = win32::GetWindowLongPtrW(h, win32::GWL_EXSTYLE);
        if ex & win32::WS_EX_TOOLWINDOW == 0 {
            win32::SetWindowLongPtrW(h, win32::GWL_EXSTYLE, ex | win32::WS_EX_TOOLWINDOW);
        }
        win32::SetWindowPos(h, win32::HWND_BOTTOM, 0, 0, 0, 0, win32::SWP_NOSIZE | win32::SWP_NOMOVE | win32::SWP_NOACTIVATE);
    } }
}
/* 지금 이 창(또는 그 안의 웹뷰)에서 글자를 치고 있는가.
   ⚠⚠ 187차 원인: `w.is_focused()` 는 **웹뷰에 글자를 치는 동안 false 를 준다.**
   WebView2 는 창 안에 자식 창을 만들고 키보드 초점을 그 자식이 가져가는데,
   tao 의 판정(is_active && is_focused)은 부모 창의 WM_SETFOCUS/WM_KILLFOCUS 만 보기 때문이다
   (Electron 은 이 값이 참이라 같은 코드가 멀쩡했다).
   → 자식 창은 전면 창이 될 수 없으므로 **전면 창이 우리 창인지**로 판정한다. */
fn typing_here(w: &WebviewWindow) -> bool {
    if w.is_focused().unwrap_or(false) { return true; }
    #[cfg(windows)] if let Some(h) = hwnd_of(w) { unsafe { return win32::GetForegroundWindow() == h; } }
    #[allow(unreachable_code)] false
}
/* Win+D·최소화로 감춰졌을 때 조용히 되살린다 — show() 는 포커스를 뺏으므로 NOACTIVATE 로 */
fn show_inactive(w: &WebviewWindow) {
    #[cfg(windows)] if let Some(h) = hwnd_of(w) { unsafe {
        win32::SetWindowPos(h, win32::HWND_BOTTOM, 0, 0, 0, 0,
            win32::SWP_NOSIZE | win32::SWP_NOMOVE | win32::SWP_NOACTIVATE | win32::SWP_SHOWWINDOW);
    } }
}

/* ══════════ 앱 페이지와의 창구(브리지) ══════════
   Electron 의 executeJavaScript 를 이벤트로 재현한다:
   Rust 가 'hpw-ask'{id,code} 를 보내면, 주입 스크립트(INIT_JS)가 eval 해 'hpw-answer'{id,value} 로 답한다.
   앱 페이지(app.js)는 그대로다 — window.bootBrief() 등 기존 창구를 그대로 부른다. */
static ASK_ID: AtomicU64 = AtomicU64::new(1);
static PENDING: Lazy<Mutex<HashMap<u64, mpsc::Sender<Value>>>> = Lazy::new(|| Mutex::new(HashMap::new()));

fn ask(app: &AppHandle, code: &str, timeout_ms: u64) -> Option<Value> {
    let id = ASK_ID.fetch_add(1, Ordering::SeqCst);
    let (tx, rx) = mpsc::channel::<Value>();
    PENDING.lock().unwrap().insert(id, tx);
    if app.emit("hpw-ask", json!({ "id": id, "code": code })).is_err() {
        PENDING.lock().unwrap().remove(&id); return None;
    }
    let r = rx.recv_timeout(Duration::from_millis(timeout_ms)).ok();
    PENDING.lock().unwrap().remove(&id);
    match r { Some(v) if v.get("__err").is_none() => Some(v), _ => None }
}

/* 페이지에 심는 스크립트 — 모든 탐색(재접속 포함)마다 다시 심긴다 */
const INIT_JS: &str = r#"
(function(){
  if(!window.__TAURI__ || window.__hpwBridge) return;
  window.__hpwBridge = 1;
  var ev = window.__TAURI__.event;
  ev.listen('hpw-ask', function(e){
    var id = e.payload.id, out = null;
    try { out = (0, eval)(e.payload.code); } catch (err) { out = { __err: String(err) }; }
    Promise.resolve(out).then(function(v){ ev.emit('hpw-answer', { id: id, value: v === undefined ? null : v }); })
      .catch(function(err){ ev.emit('hpw-answer', { id: id, value: { __err: String(err) } }); });
  });
  /* 위치·크기 조정 신호 — 앱이 해시로 알려 준다(Electron 때 문법 그대로, app.js 무수정) */
  addEventListener('hashchange', function(){
    if (location.hash === '#move') ev.emit('hpw-hash', 'move');
    if (location.hash === '#moveoff') ev.emit('hpw-hash', 'moveoff');
  });
  /* 조정 모드 이동·크기 — Electron 은 -webkit-app-region 이 처리했지만 WebView2 에는 없다.
     조정 레이어(#widMove)에서의 드래그를 창 이동으로, 가장자리 12px 은 크기 조절로 넘긴다. */
  addEventListener('mousedown', function(e){
    var mv = document.getElementById('widMove');
    if (!mv || e.button !== 0) return;
    if (e.target.closest && e.target.closest('.t')) return;     /* 안내 말풍선·끝내기 버튼 */
    var M = 12, W = innerWidth, H = innerHeight, x = e.clientX, y = e.clientY;
    var dir = '';
    if (y < M) dir += 'n'; else if (y > H - M) dir += 's';
    if (x < M) dir += 'w'; else if (x > W - M) dir += 'e';
    ev.emit('hpw-drag', dir || 'move');
    e.preventDefault();
  }, true);
  /* 새 창 링크는 기본 브라우저로 — WebView2 팝업 대신 */
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[target="_blank"]');
    if (a && /^https?:/i.test(a.href)) { e.preventDefault(); ev.emit('hpw-open', a.href); }
  }, true);
  ev.emit('hpw-ready', location.pathname);
})();
"#;

/* ══════════ 창 · 표시 모드 ══════════ */
fn win_of(app: &AppHandle) -> Option<WebviewWindow> { app.get_webview_window("main") }

fn apply_mode(app: &AppHandle, mode: &str) {
    { let mut s = STATE.lock().unwrap(); s.mode = mode.to_string(); }
    save_state();
    let Some(w) = win_of(app) else { return };
    let _ = w.set_skip_taskbar(true);
    if mode == "top" { let _ = w.set_always_on_top(true); return; }
    let _ = w.set_always_on_top(false);
    send_to_bottom(&w);
}
/* ⚠ 바탕화면 모드 유지는 1.5초 주기 — Win+D 로 감춰지면 되살리고, 다른 창이 밀어 올리면 다시 내린다.
   ⚠ 글자를 치는 중에 다시 내리면 다른 창 뒤로 숨는다 — 포커스가 있으면 건드리지 않는다(Electron 그대로). */
fn spawn_bottom_keeper(app: AppHandle) {
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_millis(1500));
        if QUITTING.load(Ordering::SeqCst) { return; }
        if STATE.lock().unwrap().mode == "top" { continue; }
        let Some(w) = win_of(&app) else { continue };
        if !w.is_visible().unwrap_or(true) { show_inactive(&w); }
        /* ⚠ 쓰는 중에 창을 다시 맨 아래로 내리면 한글 조합이 끊긴다 — 손대지 않는다(187차) */
        if typing_here(&w) { continue; }
        send_to_bottom(&w);
    });
}

fn set_locked(app: &AppHandle, lock: bool) {
    STATE.lock().unwrap().locked = Some(lock);
    if lock { remember(app, true, "조정끝"); }   /* 조정을 끝내는 순간의 자리·크기를 확정 */
    save_state();
    if let Some(w) = win_of(app) { let _ = w.set_resizable(!lock); }
    log(if lock { "위치·크기 잠금" } else { "위치·크기 조정 시작" });
}

/* 자리·크기 저장 — ⚠ 160차 교훈 전부 이식:
   ①물리 픽셀로 저장(배율 재해석 방지) ②restored 전에는 저장 금지 ③바뀐 값일 때만 기록 */
static LAST_SAVED: Lazy<Mutex<String>> = Lazy::new(|| Mutex::new(String::new()));
static LAST_TRY: Lazy<Mutex<std::time::Instant>> = Lazy::new(|| Mutex::new(std::time::Instant::now()));
/* ⚠ 'moved/resized' 만으로는 놓치는 경우가 있어 'move/resize' 도 듣되, 잦은 연발은 400ms 로 삭인다(Electron 그대로) */
fn remember(app: &AppHandle, now: bool, why: &str) {
    if !RESTORED.load(Ordering::SeqCst) { return; }
    if !now {
        let mut t = LAST_TRY.lock().unwrap();
        if t.elapsed() < Duration::from_millis(400) { return; }
        *t = std::time::Instant::now();
    }
    let Some(w) = win_of(app) else { return };
    let (Ok(p), Ok(sz)) = (w.outer_position(), w.outer_size()) else { return };
    let b = Bounds { x: p.x, y: p.y, w: sz.width, h: sz.height };
    let key = format!("{},{},{},{}", b.x, b.y, b.w, b.h);
    {
        let mut ls = LAST_SAVED.lock().unwrap();
        if *ls == key { return; }
        *ls = key.clone();
    }
    STATE.lock().unwrap().bounds = Some(b);
    save_state();
    log(&format!("자리 저장({}) {}", why, key));
}
/* ⚠⚠ 160차 '자리가 매번 줄어들던' 원인 대응 — 저장해 둔 값(want)으로 창이 뜬 뒤 되돌리고,
   어긋나면 120ms 간격 3회 재시도. 끝나기 전에는 저장 금지, 5초 지나면 안전 해제. */
fn restore_bounds(app: AppHandle, want: Bounds) {
    std::thread::spawn(move || {
        for i in 0..4 {
            let Some(w) = win_of(&app) else { break };
            let _ = w.set_position(tauri::PhysicalPosition::new(want.x, want.y));
            let _ = w.set_size(tauri::PhysicalSize::new(want.w, want.h));
            std::thread::sleep(Duration::from_millis(120));
            if let (Ok(p), Ok(s)) = (w.outer_position(), w.outer_size()) {
                let ok = (p.x - want.x).abs() <= 2 && (p.y - want.y).abs() <= 2
                    && (s.width as i64 - want.w as i64).abs() <= 2 && (s.height as i64 - want.h as i64).abs() <= 2;
                log(&format!("자리 되돌림{} · 원함={},{},{},{} · 결과={},{},{},{}",
                    if ok { "" } else { "(어긋남)" }, want.x, want.y, want.w, want.h, p.x, p.y, s.width, s.height));
                if ok || i == 3 { break; }
            }
        }
        RESTORED.store(true, Ordering::SeqCst);
    });
    /* 안전 해제 — 무슨 일이 있어도 5초 뒤에는 저장을 허용한다 */
    std::thread::spawn(|| { std::thread::sleep(Duration::from_secs(5)); RESTORED.store(true, Ordering::SeqCst); });
}

/* 저장된(또는 계산된) 자리·크기를 실제 모니터 안으로 끌어들인다.
   ⚠ 185차: 첫 실행 기본 위치를 논리 크기(620)와 물리 좌표를 섞어 계산해 배율 화면에서 오른쪽이
   잘렸고, 설정 톱니까지 화면 밖이라 조정 모드 진입 자체가 불가능했다 — 모니터가 바뀌거나 빠져도
   같은 궁지가 생기므로, 부팅 때는 늘 화면 안으로 보정하고 트레이에 '위치·크기 초기화'를 둔다. */
fn clamp_to_screens(w: &WebviewWindow, mut b: Bounds) -> Bounds {
    let mons = w.available_monitors().unwrap_or_default();
    if mons.is_empty() { return b; }
    /* 창과 가장 많이 겹치는 모니터(없으면 첫 번째)의 작업 영역 기준 */
    let mut best = 0usize; let mut best_ov = -1i64;
    for (i, m) in mons.iter().enumerate() {
        let wa = m.work_area();
        let (mx, my) = (wa.position.x as i64, wa.position.y as i64);
        let (mw, mh) = (wa.size.width as i64, wa.size.height as i64);
        let ox = (b.x as i64 + b.w as i64).min(mx + mw) - (b.x as i64).max(mx);
        let oy = (b.y as i64 + b.h as i64).min(my + mh) - (b.y as i64).max(my);
        let ov = ox.max(0) * oy.max(0);
        if ov > best_ov { best_ov = ov; best = i; }
    }
    let wa = mons[best].work_area();
    let (mx, my) = (wa.position.x, wa.position.y);
    let (mw, mh) = (wa.size.width, wa.size.height);
    b.w = b.w.min(mw); b.h = b.h.min(mh);                       /* 모니터보다 크면 줄인다 */
    b.x = b.x.min(mx + mw as i32 - b.w as i32).max(mx);
    b.y = b.y.min(my + mh as i32 - b.h as i32).max(my);
    b
}
/* 첫 실행·초기화 공용 기본 자리 — 주 모니터 작업 영역 오른쪽 위, 전부 물리 픽셀로 계산(단위 혼용 금지) */
fn default_bounds(w: &WebviewWindow) -> Option<Bounds> {
    let mon = w.primary_monitor().ok()??;
    let sf = mon.scale_factor();
    let (pw, ph) = ((620.0 * sf) as u32, (520.0 * sf) as u32);  /* 논리 620x520 을 물리로 */
    let wa = mon.work_area();
    Some(Bounds {
        x: wa.position.x + (wa.size.width as i32 - pw as i32 - (24.0 * sf) as i32).max(0),
        y: wa.position.y + (40.0 * sf) as i32,
        w: pw, h: ph,
    })
}
fn toggle_window(app: &AppHandle) {
    let Some(w) = win_of(app) else { return };
    if w.is_visible().unwrap_or(false) { let _ = w.hide(); return; }
    /* 바탕화면 모드는 z-순서가 맨 아래라 그냥 show() 하면 안 뜬 것처럼 보인다 —
       일단 앞으로 꺼낸 뒤 모드를 다시 적용해 제자리로 돌려놓는다(Electron 그대로) */
    let _ = w.show(); let _ = w.set_focus();
    let app2 = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(400));
        let mode = STATE.lock().unwrap().mode.clone();
        apply_mode(&app2, &mode);
    });
}

/* ══════════ 문서 폴더 정착 · 자동 실행 · 자기 복구 ══════════ */
fn exe_path() -> PathBuf { std::env::current_exe().unwrap_or_default() }
fn is_exe_build() -> bool { exe_path().extension().map(|e| e == "exe").unwrap_or(false) }
fn norm(p: &Path) -> String { p.to_string_lossy().to_lowercase().replace('/', "\\") }

fn settle_home() -> PathBuf {
    let src = exe_path(); let dst = home_exe();
    if !is_exe_build() { return src; }                 /* 개발 실행(cargo run)에는 건드리지 않는다 */
    if norm(&src) == norm(&dst) { return dst; }
    let _ = std::fs::create_dir_all(home_dir());
    let need = match (std::fs::metadata(&src), std::fs::metadata(&dst)) {
        (Ok(a), Ok(b)) => a.len() != b.len(),
        _ => true,
    };
    if need { let _ = std::fs::copy(&src, &dst); }
    dst
}
/* 다운로드 폴더 같은 데서 실행됐다면 문서 폴더 파일로 넘겨주고 이 프로세스는 끝낸다.
   ⚠ 두 벌이 돌아다니면 '업데이트했는데 그대로'가 생긴다. 경로가 같으면 아무것도 하지 않는다(무한 고리 방지). */
fn hand_over_to_home() -> bool {
    if !is_exe_build() { return false; }
    let here = exe_path(); let home = settle_home();
    if norm(&here) == norm(&home) { return false; }
    if !home.exists() { return false; }
    let _ = std::process::Command::new(&home).spawn();
    true
}
/* ⚠ 업데이트 교체가 절반만 끝난 채 죽으면 exe 가 없고 .old 만 남는다 — 켤 때마다 되돌린다(164차) */
fn self_heal() {
    let t = home_exe();
    if t.exists() { return; }
    let old = with_ext(&t, "exe.old"); let neu = new_exe_path();
    if neu.exists() && verify_exe(&neu) { let _ = std::fs::rename(&neu, &t); log("자기 복구 — 받아 둔 새 파일로 되살림"); return; }
    if old.exists() && verify_exe(&old) { let _ = std::fs::rename(&old, &t); log("자기 복구 — 이전 파일로 되살림"); }
}
fn with_ext(p: &Path, ext: &str) -> PathBuf { let mut q = p.to_path_buf(); q.set_extension(ext); q }

/* 자동 실행 — Electron setLoginItemSettings 와 같은 HKCU Run 키. 등록은 늘 문서 폴더의 고정 경로로(146차). */
fn set_auto_start(on: bool) {
    let p = if on { settle_home() } else { exe_path() };
    { let mut s = STATE.lock().unwrap(); s.auto_start = Some(on); s.auto_path = if on { p.to_string_lossy().into() } else { String::new() }; }
    save_state();
    #[cfg(windows)] {
        use winreg::enums::HKEY_CURRENT_USER;
        use winreg::RegKey;
        let run = RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey_with_flags("Software\\Microsoft\\Windows\\CurrentVersion\\Run", winreg::enums::KEY_ALL_ACCESS);
        if let Ok(run) = run {
            if on { let _ = run.set_value(RUN_KEY_NAME, &format!("\"{}\"", p.to_string_lossy())); }
            else { let _ = run.delete_value(RUN_KEY_NAME); }
        }
    }
}
fn is_auto_start() -> bool {
    /* ⚠ 사내 정책으로 등록이 막히면 레지스트리는 계속 빈다 — 저장해 둔 뜻도 함께 본다(Electron 그대로) */
    #[cfg(windows)] {
        use winreg::enums::HKEY_CURRENT_USER;
        use winreg::RegKey;
        if let Ok(run) = RegKey::predef(HKEY_CURRENT_USER).open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run") {
            if run.get_value::<String, _>(RUN_KEY_NAME).is_ok() { return true; }
        }
    }
    STATE.lock().unwrap().auto_start.unwrap_or(false)
}

/* ══════════ 윈도우 알림 ══════════
   앱 페이지가 '무엇을 알릴지' 판단하고(로그인·자료 수신·알림 끄기까지 거기서), 여기서는 띄우기만 한다(174차 역할 분리). */
fn toast(app: &AppHandle, title: &str, body: &str, payload: Option<Value>) {
    use tauri_winrt_notification::Toast;
    let app2 = app.clone();
    let t = Toast::new(AUMID).title(title).text1(body);
    let r = t.on_activated(move |_arg| {
        if let Some(w) = win_of(&app2) { let _ = w.show(); let _ = w.set_focus(); }
        if let Some(p) = payload.clone() {
            let _ = ask(&app2, &format!("window.notiGo && window.notiGo({})", p), 3000);
        }
        Ok(())
    }).show();
    if let Err(e) = r { log(&format!("알림 실패 {}", e)); }
}
/* ① 오늘 업무 — 하루 한 번만. 재부팅을 여러 번 해도 다시 뜨지 않는다 */
fn brief_once(app: &AppHandle) {
    let Some(d) = ask(app, "window.bootBrief ? window.bootBrief() : null", 8000) else { return };
    let day = d.get("day").and_then(|v| v.as_str()).unwrap_or("").to_string();
    if day.is_empty() { return; }
    if STATE.lock().unwrap().brief_day == day { return; }
    { STATE.lock().unwrap().brief_day = day.clone(); } save_state();
    let lines: Vec<String> = d.get("lines").and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|x| x.as_str().map(String::from)).collect()).unwrap_or_default();
    let more = d.get("more").and_then(|v| v.as_i64()).unwrap_or(0);
    let title = d.get("title").and_then(|v| v.as_str()).unwrap_or("오늘 업무").to_string();
    let mut body = lines.join("\n");
    if more > 0 { body.push_str(&format!("\n외 {}건", more)); }
    toast(app, &title, &body, Some(json!({ "date": day })));
    log(&format!("오늘 업무 알림 · {}", title));
}
/* ② 부름 — 이미 알린 것은 id 로 기억해 두 번 띄우지 않는다(최근 100개) */
fn mention_check(app: &AppHandle) {
    let seen = STATE.lock().unwrap().noted_mentions.clone();
    let code = format!("window.newMentions ? window.newMentions({}) : []", serde_json::to_string(&seen).unwrap_or_else(|_| "[]".into()));
    let Some(list) = ask(app, &code, 8000) else { return };
    let Some(arr) = list.as_array() else { return };
    if arr.is_empty() { return; }
    let mut ids = seen;
    for m in arr {
        let by = m.get("by").and_then(|v| v.as_str()).unwrap_or("");
        let task = m.get("task").and_then(|v| v.as_str()).unwrap_or("");
        let text = m.get("text").and_then(|v| v.as_str()).unwrap_or("");
        let body = if task.is_empty() { text.to_string() } else { format!("{}\n{}", task, text) };
        toast(app, &format!("{}님이 불렀습니다", by), &body, Some(m.clone()));
        if let Some(id) = m.get("id").and_then(|v| v.as_str()) { ids.push(id.to_string()); }
    }
    let keep = ids.len().saturating_sub(100);
    ids.drain(..keep);
    STATE.lock().unwrap().noted_mentions = ids;
    save_state();
}

/* ══════════ 자동 백업 ══════════
   앱의 window.bkExport() 로 내용을 받아 문서\H 주요업무현황\backup\hplan_YYMMDD.json 으로 남긴다(163차).
   ⚠ 관리자 계정 + 자료 수신 뒤에만 내용이 온다 — 빈 백업으로 덮어쓰는 사고는 앱 쪽에서 막는다. */
fn backup_dir() -> PathBuf { home_dir().join("backup") }
fn run_backup(app: &AppHandle, force: bool) -> bool {
    if !force {
        let last = STATE.lock().unwrap().last_backup.clone();
        let n = 10.min(last.len());
        if !last.is_empty() && &last[..n] >= today_minus_days(7).as_str() { return false; }
    }
    let Some(d) = ask(app, "window.bkExport ? window.bkExport() : null", 15000) else { return false };
    let (Some(name), Some(text)) = (d.get("name").and_then(|v| v.as_str()), d.get("text").and_then(|v| v.as_str())) else { return false };
    let _ = std::fs::create_dir_all(backup_dir());
    let f = backup_dir().join(name);
    if std::fs::write(&f, text).is_err() { log("백업 저장 실패"); return false; }
    STATE.lock().unwrap().last_backup = format!("{}T00:00:00", today_str());
    save_state();
    prune_backups();
    log(&format!("백업 저장 {} ({}KB)", f.display(), text.len() / 1024));
    let _ = ask(app, &format!("window.bkNote && window.bkNote({})", serde_json::to_string(name).unwrap()), 3000);
    true
}
fn today_minus_days(n: i64) -> String {
    /* last_backup 날짜 문자열 비교용 — 7일 전 날짜 */
    let secs = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0) + 9 * 3600 - n * 86400;
    let days = secs / 86400;
    let mut y = 1970i64; let mut d = days;
    loop { let leap = if y % 4 == 0 && (y % 100 != 0 || y % 400 == 0) { 366 } else { 365 };
        if d < leap { break; } d -= leap; y += 1; }
    let leap = y % 4 == 0 && (y % 100 != 0 || y % 400 == 0);
    let ml = [31, if leap {29} else {28}, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let mut mo = 0usize; while d >= ml[mo] { d -= ml[mo]; mo += 1; }
    format!("{:04}-{:02}-{:02}", y, mo + 1, d + 1)
}
fn prune_backups() {
    /* 오래된 것부터 지워 최근 12개만(163차). ⚠ hplan_ 패턴만 지운다 — 다른 파일 안전 */
    let Ok(rd) = std::fs::read_dir(backup_dir()) else { return };
    let mut names: Vec<String> = rd.filter_map(|e| e.ok()).map(|e| e.file_name().to_string_lossy().into_owned())
        .filter(|n| n.len() == 17 && n.starts_with("hplan_") && n.ends_with(".json")
            && n[6..12].chars().all(|c| c.is_ascii_digit()))
        .collect();
    names.sort();
    while names.len() > 12 { let _ = std::fs::remove_file(backup_dir().join(names.remove(0))); }
}

/* ══════════ 자동 업데이트 ══════════
   Electron 판(144~161차)의 방식 그대로 — 깃허브 API 는 쓰지 않고(사내망) 릴리스 리디렉트 주소에서 버전을 읽는다.
   ⚠ 파일럿용 릴리스는 태그 widget-lite-vX.Y.Z + 파일 HPlanWidgetLite.exe.
   ⚠ /releases/latest 는 '가장 최근 릴리스'라 Electron 릴리스가 최신이면 여기 파일이 없다 —
     그때는 확인 실패로 조용히 넘어간다(내려받기 전에 태그 이름으로 거른다). */
fn new_exe_path() -> PathBuf { home_dir().join("HPlanWidgetLite.new.exe") }
fn verify_exe(f: &Path) -> bool {
    /* ⚠ Electron 은 20MB 문턱 — 이 exe 는 수 MB 라 3MB 로 본다(받다 만 파일 걸러내기) */
    std::fs::metadata(f).map(|m| m.len() > 3 * 1024 * 1024).unwrap_or(false)
}
fn is_newer(a: &str, b: &str) -> bool {
    let n = |v: &str| -> Vec<u64> { v.split('.').map(|x| x.parse().unwrap_or(0)).collect() };
    let (x, y) = (n(a), n(b));
    for i in 0..x.len().max(y.len()) {
        let (p, q) = (*x.get(i).unwrap_or(&0), *y.get(i).unwrap_or(&0));
        if p != q { return p > q; }
    }
    false
}
fn cur_ver() -> String { env!("CARGO_PKG_VERSION").to_string() }
fn resolve_latest(url: &str) -> Option<(String, String)> {
    /* 넘어가는 주소만 받아 본다(파일은 받지 않는다) — Location 에 태그(버전)가 들어 있다 */
    let cli = reqwest::blocking::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(8)).build().ok()?;
    let r = cli.get(url).send().ok()?;
    if !r.status().is_redirection() { return None; }
    let to = r.headers().get("location")?.to_str().ok()?.to_string();
    /* ⚠ 태그가 widget-lite-v… 일 때만 우리 것 — widget-v…(Electron) 릴리스가 최신이면 여기서 걸러진다 */
    let m = to.split("/releases/download/widget-lite-v").nth(1)?;
    let ver: String = m.chars().take_while(|c| c.is_ascii_digit() || *c == '.').collect();
    if ver.is_empty() { return None; }
    Some((ver, to))
}
fn download(url: &str, dest: &Path) -> Result<(), String> {
    let cli = reqwest::blocking::Client::builder().timeout(Duration::from_secs(180)).build().map_err(|e| e.to_string())?;
    let mut r = cli.get(url).send().map_err(|e| e.to_string())?;
    if !r.status().is_success() { return Err(format!("HTTP {}", r.status())); }
    let mut f = std::fs::File::create(dest).map_err(|e| e.to_string())?;
    std::io::copy(&mut r, &mut f).map_err(|e| e.to_string())?;
    Ok(())
}
fn check_update(app: &AppHandle, loud: bool) {
    let info = ask(app, "window.widInfo ? window.widInfo() : null", 8000);
    let base = info.as_ref().and_then(|v| v.get("url")).and_then(|v| v.as_str()).map(String::from);
    let Some(base) = base else {
        if loud { msg_ok("업데이트", "최신 버전 정보를 읽지 못했습니다.", "앱 페이지가 아직 뜨지 않았을 수 있습니다."); }
        return;
    };
    /* HPlanWidget.exe → HPlanWidgetLite.exe, /releases/download/태그/ → /releases/latest/download/ */
    let mine = base.replace("HPlanWidget.exe", EXE_NAME);
    let latest = if mine.contains("/releases/latest/download/") { mine.clone() } else {
        match mine.split("/releases/download/").next() {
            Some(pre) => format!("{}/releases/latest/download/{}", pre, EXE_NAME),
            None => mine.clone(),
        }
    };
    let Some((ver, url)) = resolve_latest(&latest) else {
        if loud { msg_ok("업데이트", "최신 버전을 확인하지 못했습니다.",
            "릴리스에 파일럿(HPlanWidgetLite) 판이 아직 없거나, 최신 릴리스가 Electron 판입니다."); }
        log("최신 버전 확인 실패(파일럿 릴리스 없음 또는 망)"); return;
    };
    if !is_newer(&ver, &cur_ver()) {
        if loud { msg_ok("업데이트", "최신 버전입니다.", &format!("지금 버전 {}", cur_ver())); }
        return;
    }
    let _ = std::fs::create_dir_all(home_dir());
    let part = home_dir().join("HPlanWidgetLite.new.exe.part");
    if let Err(e) = download(&url, &part) {
        if loud { msg_ok("업데이트", "새 버전을 받지 못했습니다.", &e); }
        log(&format!("업데이트 내려받기 실패 {}", e)); return;
    }
    if !verify_exe(&part) { let _ = std::fs::remove_file(&part); log("받다 만 파일 — 버림"); return; }
    let _ = std::fs::remove_file(new_exe_path());
    if std::fs::rename(&part, new_exe_path()).is_err() { return; }   /* 다 받은 뒤에야 정식 이름을 준다(147차) */
    *UPD.lock().unwrap() = Some((ver.clone(), new_exe_path()));
    STATE.lock().unwrap().pending_ver = ver.clone();
    save_state();
    rebuild_tray(app);
    if loud { msg_ok("업데이트", &format!("새 버전을 받았습니다 (v{})", ver),
        "다음에 컴퓨터를 켤 때 저절로 적용됩니다.\n지금 바로 적용하려면 트레이 메뉴의 '지금 업데이트'를 누르세요."); }
    log(&format!("새 버전 받아 둠 v{}", ver));
}
/* 부팅 직후 — 받아 둔 새 버전이 있으면 조용히 갈아타고 다시 뜬다. ⚠ 창을 만들기 전에(157차) */
fn take_update_on_boot() -> bool {
    let pv = STATE.lock().unwrap().pending_ver.clone();
    let f = new_exe_path();
    if pv.is_empty() || !f.exists() { return false; }
    if !is_newer(&pv, &cur_ver()) {
        let _ = std::fs::remove_file(&f);
        STATE.lock().unwrap().pending_ver.clear(); save_state();
        return false;
    }
    swap_and_restart(&f)
}
/* ⚠ 윈도우는 실행 중 exe 를 지울 순 없어도 이름은 바꿀 수 있다 — .old 로 밀고 새 파일을 제자리에(147차).
   Tauri exe 는 포터블 임시 폴더 없이 제자리에서 도므로 Electron 보다 이 길이 잘 열린다.
   막히면(EPERM 등) PowerShell 도우미(-EncodedCommand=UTF-16 — 한글 경로 안전, 161차)로 넘긴다. */
fn swap_and_restart(src: &Path) -> bool {
    let target = home_exe(); let old = with_ext(&target, "exe.old");
    if !verify_exe(src) {
        let _ = std::fs::remove_file(src);
        STATE.lock().unwrap().pending_ver.clear(); save_state();
        log("교체 취소 — 받아 둔 파일이 온전하지 않다");
        return false;
    }
    let _ = std::fs::remove_file(&old);
    let step = (|| -> std::io::Result<()> {
        if target.exists() { std::fs::rename(&target, &old)?; }
        std::fs::rename(src, &target)?; Ok(())
    })();
    match step {
        Ok(()) => {
            STATE.lock().unwrap().pending_ver.clear(); save_state();
            log("교체 성공(즉시) → 다시 실행");
            let _ = std::process::Command::new(&target).spawn();
            true
        }
        Err(e) => {
            if !target.exists() && old.exists() { let _ = std::fs::rename(&old, &target); }
            log(&format!("즉시 교체 실패({}) — 도우미에게 맡긴다", e));
            if spawn_swap_helper(src, &target) {
                STATE.lock().unwrap().pending_ver.clear(); save_state();
                log("도우미에게 교체를 맡기고 종료한다");
                true
            } else { log("교체 실패 — 다음 기회에 다시 시도한다"); false }
        }
    }
}
fn spawn_swap_helper(src: &Path, target: &Path) -> bool {
    #[cfg(windows)] {
        let q = |t: &Path| format!("'{}'", t.to_string_lossy().replace('\'', "''"));
        let ps = format!(
            "$p={}; while(Get-Process -Id $p -ErrorAction SilentlyContinue){{Start-Sleep -Milliseconds 300}}; Start-Sleep -Milliseconds 500; Move-Item -LiteralPath {} -Destination {} -Force; Start-Process -FilePath {};",
            std::process::id(), q(src), q(target), q(target));
        let utf16: Vec<u8> = ps.encode_utf16().flat_map(|u| u.to_le_bytes()).collect();
        let b64 = b64encode(&utf16);
        return std::process::Command::new("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-EncodedCommand", &b64])
            .spawn().is_ok();
    }
    #[allow(unreachable_code)] false
}
/* 표준만으로 base64 — 크레이트 하나 아끼기 */
fn b64encode(data: &[u8]) -> String {
    const T: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((data.len() + 2) / 3 * 4);
    for ch in data.chunks(3) {
        let b = [ch[0], *ch.get(1).unwrap_or(&0), *ch.get(2).unwrap_or(&0)];
        let n = ((b[0] as u32) << 16) | ((b[1] as u32) << 8) | b[2] as u32;
        out.push(T[(n >> 18) as usize & 63] as char);
        out.push(T[(n >> 12) as usize & 63] as char);
        out.push(if ch.len() > 1 { T[(n >> 6) as usize & 63] as char } else { '=' });
        out.push(if ch.len() > 2 { T[n as usize & 63] as char } else { '=' });
    }
    out
}

/* ══════════ 안내창 ══════════ (rfd — 별도 창이라 어느 스레드에서든 안전) */
fn msg_ok(title: &str, msg: &str, detail: &str) {
    let (t, m, d) = (title.to_string(), msg.to_string(), detail.to_string());
    std::thread::spawn(move || {
        rfd::MessageDialog::new().set_title(&t)
            .set_description(format!("{}\n\n{}", m, d))
            .set_buttons(rfd::MessageButtons::Ok).show();
    });
}
fn msg_ask(title: &str, msg: &str, detail: &str, yes: &str, no: &str) -> bool {
    let r = rfd::MessageDialog::new().set_title(title)
        .set_description(format!("{}\n\n{}", msg, detail))
        .set_buttons(rfd::MessageButtons::OkCancelCustom(yes.to_string(), no.to_string())).show();
    match r {
        rfd::MessageDialogResult::Custom(s) => s == yes,
        rfd::MessageDialogResult::Ok | rfd::MessageDialogResult::Yes => true,
        _ => false,
    }
}

/* ══════════ 트레이 ══════════ */
fn rebuild_tray(app: &AppHandle) {
    let upd = UPD.lock().unwrap().clone();
    let mode_top = STATE.lock().unwrap().mode == "top";
    let m = MenuBuilder::new(app);
    let mk = |id: &str, label: &str| MenuItem::with_id(app, id, label, true, None::<&str>).unwrap();
    let menu = m
        .item(&mk("toggle", "위젯 보이기 / 숨기기"))
        .item(&PredefinedMenuItem::separator(app).unwrap())
        .item(&CheckMenuItem::with_id(app, "top", "항상 위에 표시", true, mode_top, None::<&str>).unwrap())
        .item(&CheckMenuItem::with_id(app, "autostart", "윈도우 시작 시 자동 실행", true, is_auto_start(), None::<&str>).unwrap())
        .item(&PredefinedMenuItem::separator(app).unwrap())
        .item(&match &upd {
            Some((v, _)) => mk("applyupd", &format!("지금 업데이트 (v{})", v)),
            None => mk("checkupd", "업데이트 확인"),
        })
        .item(&MenuItem::with_id(app, "ver", &format!("버전 {} (파일럿)", cur_ver()), false, None::<&str>).unwrap())
        .item(&mk("reload", "새로고침"))
        .item(&mk("devtools", "개발자 도구 (문제 확인)"))
        .item(&mk("backup", "지금 백업하기"))
        .item(&mk("resetpos", "위치·크기 초기화"))
        .item(&mk("diag", "진단 폴더 열기"))
        .item(&mk("autostat", "자동 실행 상태 확인"))
        .item(&mk("openweb", "브라우저 앱 열기"))
        .item(&PredefinedMenuItem::separator(app).unwrap())
        .item(&mk("quit", "종료"))
        .build().unwrap();
    if let Some(tray) = app.tray_by_id("main") { let _ = tray.set_menu(Some(menu)); }
}

fn on_menu(app: &AppHandle, id: &str) {
    match id {
        "toggle" => toggle_window(app),
        "top" => {
            let now = STATE.lock().unwrap().mode.clone();
            apply_mode(app, if now == "top" { "below" } else { "top" });
            rebuild_tray(app);
        }
        "autostart" => { set_auto_start(!is_auto_start()); rebuild_tray(app); }
        "checkupd" => { let a = app.clone(); std::thread::spawn(move || check_update(&a, true)); }
        "applyupd" => {
            let a = app.clone();
            std::thread::spawn(move || {
                let upd = UPD.lock().unwrap().clone();
                let Some((_v, f)) = upd else { return };
                if msg_ask("업데이트", "지금 새 버전으로 바꿀까요?",
                    "위젯이 잠깐 꺼졌다 다시 뜹니다. 쓰던 내용은 저장돼 있습니다.\n(기다리면 다음에 컴퓨터를 켤 때 저절로 적용됩니다)",
                    "지금 바꾸기", "나중에") {
                    if swap_and_restart(&f) { QUITTING.store(true, Ordering::SeqCst); a.exit(0); }
                    else { msg_ok("업데이트", "지금은 바꾸지 못했습니다.",
                        "파일이 다른 곳에서 쓰이고 있을 수 있습니다.\n다음에 컴퓨터를 켤 때 다시 시도합니다.\n(진단 폴더의 widget-lite-log.txt 에 사유가 남습니다)"); }
                }
            });
        }
        "reload" => { if let Some(w) = win_of(app) { let _ = w.eval("location.reload()"); } }
        "devtools" => { if let Some(w) = win_of(app) { w.open_devtools(); } }
        "backup" => {
            let a = app.clone();
            std::thread::spawn(move || {
                let ok = run_backup(&a, true);
                if ok { msg_ok("백업", "백업했습니다.", &backup_dir().to_string_lossy()); }
                else { msg_ok("백업", "지금은 백업하지 않았습니다.",
                    "관리자 계정으로 로그인돼 있고 자료를 다 받은 뒤에만 저장합니다.\n(진단 폴더의 widget-lite-log.txt 에 사유가 남습니다)"); }
            });
        }
        "resetpos" => {
            /* 창이 화면 밖으로 나가 설정 톱니를 못 누르는 궁지의 탈출구(185차) */
            if let Some(w) = win_of(app) {
                if let Some(b) = default_bounds(&w) {
                    let _ = w.set_size(tauri::PhysicalSize::new(b.w, b.h));
                    let _ = w.set_position(tauri::PhysicalPosition::new(b.x, b.y));
                }
                let _ = w.show();
                remember(app, true, "초기화");
                log("위치·크기 초기화");
            }
        }
        "diag" => { let _ = open::that(home_dir()); }
        "autostat" => {
            let reg = if is_auto_start() { "등록됨" } else { "등록 안 됨" };
            let b = STATE.lock().unwrap().bounds;
            msg_ok("자동 실행", &format!("윈도우 시작 시 자동 실행: {}", reg),
                &format!("등록된 실행 파일\n{}\n\n설정 파일\n{}\n저장된 자리·크기: {}\n버전: {} (파일럿)\n\n⚠ 이 경로에 파일이 그대로 있어야 재부팅 뒤에도 뜹니다.",
                    exe_path().display(), state_file().display(),
                    b.map(|b| format!("{},{},{},{}", b.x, b.y, b.w, b.h)).unwrap_or_else(|| "(없음)".into()),
                    cur_ver()));
        }
        "openweb" => { let _ = open::that(app_url().replace("?w=1", "")); }
        "quit" => {
            QUITTING.store(true, Ordering::SeqCst);
            remember(app, true, "quit"); log("종료");
            app.exit(0);
        }
        _ => {}
    }
}

/* ══════════ 페이지 감시 ══════════
   Electron 의 did-fail-load 재시도(10초×20회) 대체 — WebView2 이벤트 대신 브리지 핑으로 살아 있는지 본다.
   페이지가 안 떴거나(사내망 차단) 죽었으면 다시 부른다. */
fn spawn_page_watch(app: AppHandle) {
    std::thread::spawn(move || {
        let mut misses = 0u32; let mut retries = 0u32;
        loop {
            std::thread::sleep(Duration::from_secs(15));
            if QUITTING.load(Ordering::SeqCst) { return; }
            if ask(&app, "1", 4000).is_some() { misses = 0; retries = 0; continue; }
            misses += 1;
            if misses < 2 || retries >= 20 { continue; }   /* 일시 지연은 넘어가고, 약 3분치만 재시도 */
            retries += 1; misses = 0;
            log(&format!("페이지 무응답 — {}번째 재접속", retries));
            if let Some(w) = win_of(&app) {
                let _ = w.eval(format!("location.replace({})", serde_json::to_string(&format!("{}&glass=1", app_url())).unwrap()));
            }
        }
    });
}

/* ══════════ 시작 ══════════ */
fn main() {
    #[cfg(windows)] unsafe {
        let wide: Vec<u16> = AUMID.encode_utf16().chain(std::iter::once(0)).collect();
        win32::SetCurrentProcessExplicitAppUserModelID(wide.as_ptr());
    }
    { *STATE.lock().unwrap() = load_state(); }          /* ⚠ 준비된 뒤 맨 앞에서 읽는다(146차) */
    self_heal();
    log(&format!("시작 · 설정파일={} · 실행파일={} · 버전={}", state_file().display(), exe_path().display(), cur_ver()));
    if take_update_on_boot() { return; }                /* 카톡처럼 — 창을 만들기 전에 갈아탄다(157차) */
    if hand_over_to_home() { return; }                  /* 다른 자리에서 실행됐으면 문서 폴더 판에 넘긴다 */

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            /* 중복 실행 — 이미 떠 있으면 기존 창을 보여준다 */
            if let Some(w) = app.get_webview_window("main") { let _ = w.show(); let _ = w.set_focus(); }
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();

            /* 브리지 회신 받기 */
            handle.listen_any("hpw-answer", move |ev| {
                if let Ok(v) = serde_json::from_str::<Value>(ev.payload()) {
                    if let Some(id) = v.get("id").and_then(|x| x.as_u64()) {
                        if let Some(tx) = PENDING.lock().unwrap().remove(&id) {
                            let _ = tx.send(v.get("value").cloned().unwrap_or(Value::Null));
                        }
                    }
                }
            });
            let h2 = app.handle().clone();
            handle.listen_any("hpw-hash", move |ev| {
                let p = ev.payload().trim_matches('"');
                if p == "move" { set_locked(&h2, false); }
                if p == "moveoff" { set_locked(&h2, true); }
            });
            let h3 = app.handle().clone();
            handle.listen_any("hpw-drag", move |ev| {
                if STATE.lock().unwrap().locked.unwrap_or(true) { return; }   /* 잠금 중엔 무시 */
                /* ⚠ start_resize_dragging 은 WebviewWindow 가 아니라 Window 쪽 API 다(2.11.5 확인).
                   Manager::get_window 은 unstable 피처 뒤라, 게이트 없는 경로로 얻는다:
                   WebviewWindow --AsRef--> Webview --window()--> Window (셋 다 소스에서 게이트 없음 확인).
                   ResizeDirection 은 tauri 재수출이 없어 tauri-runtime 에서 온다. */
                let Some(ww) = win_of(&h3) else { return };
                let w: tauri::Window = AsRef::<tauri::Webview>::as_ref(&ww).window();
                use tauri_runtime::ResizeDirection as D;
                match ev.payload().trim_matches('"') {
                    "move" => { let _ = w.start_dragging(); }
                    "n" => { let _ = w.start_resize_dragging(D::North); }
                    "s" => { let _ = w.start_resize_dragging(D::South); }
                    "e" => { let _ = w.start_resize_dragging(D::East); }
                    "w" => { let _ = w.start_resize_dragging(D::West); }
                    "ne" => { let _ = w.start_resize_dragging(D::NorthEast); }
                    "nw" => { let _ = w.start_resize_dragging(D::NorthWest); }
                    "se" => { let _ = w.start_resize_dragging(D::SouthEast); }
                    "sw" => { let _ = w.start_resize_dragging(D::SouthWest); }
                    _ => {}
                }
            });
            handle.listen_any("hpw-open", move |ev| {
                let u = ev.payload().trim_matches('"').to_string();
                if u.starts_with("http") { let _ = open::that(u); }
            });

            /* 창 — 저장된 자리(물리 픽셀)로 되돌리기 전까지 숨겨 두어 깜빡임을 없앤다 */
            let url: tauri::Url = format!("{}&glass=1", app_url()).parse().unwrap();
            let w = tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::External(url))
                .title("H · 주요업무현황 위젯")
                .decorations(false).transparent(true).shadow(false)
                .skip_taskbar(true).resizable(true)
                .inner_size(620.0, 520.0).min_inner_size(300.0, 380.0)
                .visible(false)
                .initialization_script(INIT_JS)
                .build()?;

            let want = STATE.lock().unwrap().bounds;
            match want {
                /* ⚠ 지난 실행이 화면 밖 자리를 저장했을 수 있다(185차 실제 사례) — 보정해서 되돌린다 */
                Some(b) => { restore_bounds(handle.clone(), clamp_to_screens(&w, b)); }
                None => {
                    /* 첫 실행 — 아이콘이 몰린 왼쪽을 피해 주 모니터 오른쪽 위.
                       ⚠ set_position 은 물리 픽셀을 받는다 — 창 크기(논리 620)도 배율을 곱해 물리로 맞춘다(185차) */
                    if let Some(b) = default_bounds(&w) {
                        let _ = w.set_position(tauri::PhysicalPosition::new(b.x, b.y));
                        let _ = w.set_size(tauri::PhysicalSize::new(b.w, b.h));
                    }
                    RESTORED.store(true, Ordering::SeqCst);
                }
            }
            let _ = w.show();
            let mode = STATE.lock().unwrap().mode.clone();
            apply_mode(&handle, if mode.is_empty() { "below" } else { &mode });
            let locked = STATE.lock().unwrap().locked.unwrap_or(true);
            let _ = w.set_resizable(!locked);

            /* 트레이 */
            let tray_png = include_bytes!("../icons/tray.png");
            let icon = tauri::image::Image::from_bytes(tray_png)?;
            let h4 = app.handle().clone();
            let h5 = app.handle().clone();
            TrayIconBuilder::with_id("main")
                .icon(icon)
                .tooltip("H · 주요업무현황 위젯 (파일럿)")
                .show_menu_on_left_click(false)
                .on_menu_event(move |_app, ev| on_menu(&h4, ev.id().0.as_str()))
                .on_tray_icon_event(move |_tray, ev| {
                    if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up, .. } = ev { toggle_window(&h5); }
                })
                .build(app)?;
            rebuild_tray(&handle);

            /* 단축키 — Electron 그대로 */
            use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
            let h6 = app.handle().clone();
            let _ = app.global_shortcut().on_shortcut("Alt+Shift+C", move |_a, _s, e| {
                if e.state() == ShortcutState::Pressed { toggle_window(&h6); }
            });
            let h7 = app.handle().clone();
            let _ = app.global_shortcut().on_shortcut("CommandOrControl+Shift+I", move |_a, _s, e| {
                if e.state() == ShortcutState::Pressed { if let Some(w) = win_of(&h7) { w.open_devtools(); } }
            });

            /* 파일 정리·자동 실행 등록은 화면이 뜬 뒤로 미룬다(Electron 그대로) */
            let h8 = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_secs(3));
                let _ = std::fs::remove_file(with_ext(&home_exe(), "exe.old"));
                let first = STATE.lock().unwrap().auto_start.is_none();
                let want_auto = STATE.lock().unwrap().auto_start.unwrap_or(false);
                let cur_path = STATE.lock().unwrap().auto_path.clone();
                if first { set_auto_start(true); rebuild_tray(&h8); }
                else if want_auto && cur_path != home_exe().to_string_lossy() { set_auto_start(true); }
            });

            /* 주기 작업 — Electron 의 시각표 그대로 */
            spawn_bottom_keeper(handle.clone());
            spawn_page_watch(handle.clone());
            let hu = handle.clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_secs(90));
                loop { check_update(&hu, false);
                    if QUITTING.load(Ordering::SeqCst) { return; }
                    std::thread::sleep(Duration::from_secs(6 * 3600)); }
            });
            let hb = handle.clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_secs(120));
                loop { run_backup(&hb, false);
                    if QUITTING.load(Ordering::SeqCst) { return; }
                    std::thread::sleep(Duration::from_secs(6 * 3600)); }
            });
            let hn = handle.clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_secs(45)); brief_once(&hn);
                std::thread::sleep(Duration::from_secs(105)); brief_once(&hn);   /* 자료 지연 대비 두 번(174차) */
            });
            let hm = handle.clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(Duration::from_secs(30));
                if QUITTING.load(Ordering::SeqCst) { return; }
                mention_check(&hm);
            });
            /* 자리·크기 — 이벤트를 놓치는 경우가 있어 5초마다 확인(바뀌었을 때만 쓴다) */
            let hp = handle.clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(Duration::from_secs(5));
                if QUITTING.load(Ordering::SeqCst) { return; }
                remember(&hp, true, "주기");
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            let app = window.app_handle();
            match event {
                tauri::WindowEvent::Moved(_) => remember(app, false, "move"),
                tauri::WindowEvent::Resized(_) => remember(app, false, "resize"),
                tauri::WindowEvent::Focused(false) => remember(app, true, "blur"),
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    /* 트레이에 남는다 — Alt+F4 등은 숨김으로 처리하고 종료는 트레이 메뉴로만 */
                    if !QUITTING.load(Ordering::SeqCst) { api.prevent_close(); let _ = window.hide(); }
                    remember(app, true, "close");
                }
                _ => {}
            }
        })
        .build(tauri::generate_context!())
        .expect("초기화 실패")
        .run(|_app, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                if !QUITTING.load(Ordering::SeqCst) { api.prevent_exit(); }
            }
        });
}
