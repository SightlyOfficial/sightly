const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, globalShortcut, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const CFG_FILE = path.join(app.getPath('userData'), 'config.json');
const DEFAULTS = { style: 'cross', color: '#00ff00', size: 10, thickness: 2, gap: 4,
  dot: true, outline: true, opacity: 100, enabled: false };
let cfg = { ...DEFAULTS, ...load() };
let win = null, overlay = null, tray = null;

function load() { try { return JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); } catch { return {}; } }
function save() { fs.mkdirSync(path.dirname(CFG_FILE), { recursive: true }); fs.writeFileSync(CFG_FILE, JSON.stringify(cfg)); }

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', showMain);

function createMain() {
  win = new BrowserWindow({
    width: 940, height: 560, frame: false, resizable: false, show: false,
    backgroundColor: '#313338', title: 'Sightly',
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.on('close', e => { if (!app.isQuitting) { e.preventDefault(); win.hide(); } });
  win.on('closed', () => { win = null; });
}

function showMain() {
  if (!win) createMain(); else { win.show(); win.focus(); }
}

function createOverlay() {
  const b = screen.getPrimaryDisplay().bounds;
  const S = 400;
  overlay = new BrowserWindow({
    width: S, height: S, x: Math.round(b.x + (b.width - S) / 2), y: Math.round(b.y + (b.height - S) / 2),
    transparent: true, frame: false, alwaysOnTop: true, skipTaskbar: true,
    focusable: false, resizable: false, hasShadow: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.setIgnoreMouseEvents(true, { forward: true });
  overlay.loadFile(path.join(__dirname, 'renderer', 'overlay.html'));
  overlay.webContents.on('did-finish-load', () => overlay && overlay.webContents.send('config', cfg));
  overlay.on('closed', () => { overlay = null; });
}

function setEnabled(on) {
  cfg.enabled = on; save();
  if (on && !overlay) createOverlay();
  if (!on && overlay) overlay.close();
  if (win) win.webContents.send('state', { enabled: on });
  if (tray) tray.setContextMenu(buildMenu());
}

function buildMenu() {
  return Menu.buildFromTemplate([
    { label: 'Ouvrir', click: showMain },
    { label: cfg.enabled ? 'Masquer le crosshair' : 'Afficher le crosshair',
      click: () => setEnabled(!cfg.enabled) }
  ]);
}

function createTray() {
  tray = new Tray(nativeImage.createEmpty());
  tray.setToolTip('Sightly');
  tray.on('click', showMain);
  tray.setContextMenu(buildMenu());
}

ipcMain.handle('get-config', () => cfg);
ipcMain.handle('set-config', (_, patch) => {
  cfg = { ...cfg, ...patch }; save();
  if (overlay) overlay.webContents.send('config', cfg);
  return cfg;
});
ipcMain.handle('toggle-overlay', () => { setEnabled(!cfg.enabled); return { enabled: cfg.enabled }; });
ipcMain.on('win-min', () => win && win.minimize());
ipcMain.on('win-close', () => win && win.close());
ipcMain.on('open-url', (_, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });

app.whenReady().then(() => {
  createMain();
  createTray();
  if (cfg.enabled) createOverlay();
  globalShortcut.register('Control+Alt+H', () => setEnabled(!cfg.enabled));
});
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('activate', showMain);
app.on('window-all-closed', e => e.preventDefault());