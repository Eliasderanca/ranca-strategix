// Ranca Strategix – Desktop-Fenster für die Online-App auf claude.ai.
// Alle Daten bleiben in claude.ai; dieses Programm ist nur das Fenster.
const { app, BrowserWindow, Menu, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_URL = 'https://claude.ai/artifact/S7DArUyTrmaRwN8Urm3uwv';
const PARTITION = 'persist:ranca';
// Hosts, die im App-Fenster bleiben dürfen (claude.ai und Anmeldung)
const INTERNAL = [/(^|\.)claude\.ai$/, /(^|\.)anthropic\.com$/, /(^|\.)claudeusercontent\.com$/, /(^|\.)accounts\.google\.com$/, /(^|\.)google\.com$/, /(^|\.)gstatic\.com$/, /(^|\.)appleid\.apple\.com$/, /(^|\.)apple\.com$/, /(^|\.)cloudflare\.com$/];
const isInternal = (u) => { try { const h = new URL(u).hostname; return INTERNAL.some((r) => r.test(h)); } catch { return false; } };

const stateFile = () => path.join(app.getPath('userData'), 'window.json');
const loadState = () => { try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch { return { width: 1440, height: 920 }; } };
const saveState = (w) => { try { if (!w.isMinimized() && !w.isFullScreen()) fs.writeFileSync(stateFile(), JSON.stringify(w.getBounds())); } catch {} };

let win;
function createWindow() {
  const st = loadState();
  win = new BrowserWindow({
    ...st, minWidth: 420, minHeight: 600, title: 'Ranca Strategix',
    backgroundColor: '#ffffff', titleBarStyle: 'default', show: false,
    webPreferences: { partition: PARTITION, contextIsolation: true, sandbox: true, spellcheck: false },
  });
  win.once('ready-to-show', () => win.show());
  ['resize', 'move'].forEach((ev) => win.on(ev, () => saveState(win)));

  // Normale Chrome-Kennung, damit die Anmeldung (z. B. mit Google) nicht blockiert wird
  const ua = win.webContents.getUserAgent().replace(/\s*Electron\/\S+/, '').replace(/\s*ranca-strategix\/\S+/i, '');
  win.webContents.setUserAgent(ua);

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternal(url)) return { action: 'allow', overrideBrowserWindowOptions: { webPreferences: { partition: PARTITION } } };
    shell.openExternal(url); return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (!isInternal(url)) { e.preventDefault(); shell.openExternal(url); } });
  win.webContents.on('did-fail-load', (e, code, desc, url, isMain) => {
    if (isMain && code !== -3) win.loadFile(path.join(__dirname, 'offline.html'));
  });
  win.on('page-title-updated', (e) => { e.preventDefault(); win.setTitle('Ranca Strategix'); });
  win.loadURL(APP_URL);
}

function buildMenu() {
  const t = [
    { label: 'Ranca Strategix', submenu: [
      { role: 'about', label: 'Über Ranca Strategix' }, { type: 'separator' },
      { role: 'hide', label: 'Ausblenden' }, { role: 'hideOthers', label: 'Andere ausblenden' }, { role: 'unhide', label: 'Alle einblenden' },
      { type: 'separator' }, { role: 'quit', label: 'Ranca Strategix beenden' } ] },
    { label: 'Bearbeiten', submenu: [
      { role: 'undo', label: 'Widerrufen' }, { role: 'redo', label: 'Wiederholen' }, { type: 'separator' },
      { role: 'cut', label: 'Ausschneiden' }, { role: 'copy', label: 'Kopieren' }, { role: 'paste', label: 'Einsetzen' }, { role: 'selectAll', label: 'Alles auswählen' } ] },
    { label: 'Darstellung', submenu: [
      { label: 'Startseite', accelerator: 'Cmd+Shift+H', click: () => win && win.loadURL(APP_URL) },
      { role: 'reload', label: 'Neu laden' },
      { label: 'Zurück', accelerator: 'Cmd+[', click: () => win && win.webContents.navigationHistory.canGoBack() && win.webContents.navigationHistory.goBack() },
      { type: 'separator' },
      { role: 'resetZoom', label: 'Originalgröße' }, { role: 'zoomIn', label: 'Vergrößern' }, { role: 'zoomOut', label: 'Verkleinern' },
      { type: 'separator' }, { role: 'togglefullscreen', label: 'Vollbild' } ] },
    { label: 'Fenster', submenu: [ { role: 'minimize', label: 'Im Dock ablegen' }, { role: 'zoom', label: 'Zoomen' }, { role: 'close', label: 'Schließen' } ] },
    { label: 'Hilfe', submenu: [ { label: 'Im Browser öffnen', click: () => shell.openExternal(APP_URL) } ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(t));
}

app.setName('Ranca Strategix');
app.whenReady().then(() => { buildMenu(); createWindow(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); else win && win.show(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
