const { app, BrowserWindow, BrowserView, ipcMain, Menu } = require('electron');
const path = require('path');
// Import the default export from electron-store to ensure Store is a constructor
const Store = require('electron-store').default;
const store = new Store();

let win, view;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'images', 'eadid_logo.png'),
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, 'images', 'eadid_logo.png'));
  }

  // Remove default menu
  Menu.setApplicationMenu(null);

  const userSession = store.get('userSession');
  console.log(userSession ? 'User session loaded: ' + JSON.stringify(userSession) : 'No user session found.');

  win.loadFile('index.html').catch(err => console.error('Error loading index.html:', err));

  // Resize the BrowserView whenever the window is resized.
  win.on('resize', resizeBrowserView);
}

ipcMain.on('switch-messenger', (event, url) => {
  if (!win) return;

  if (view) {
    win.removeBrowserView(view);
    view = null;
  }

  try {
    view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    win.setBrowserView(view);
    resizeBrowserView();

    // For WhatsApp, set a specific user agent
    if (url.includes('whatsapp')) {
      view.webContents.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.78 Safari/537.36'
      );
    }
    view.webContents.loadURL(url).catch(err => console.error('Failed to load URL:', err));
  } catch (err) {
    console.error('Error creating BrowserView:', err);
  }
});

ipcMain.on('window-control', (event, action) => {
  if (!win) return;
  if (action === 'minimize') {
    win.minimize();
  } else if (action === 'maximize') {
    win.isMaximized() ? win.unmaximize() : win.maximize();
  } else if (action === 'close') {
    win.close();
  }
});

ipcMain.on('save-user-session', (event, sessionData) => {
  store.set('userSession', sessionData);
  console.log('User session saved:', sessionData);
});

function resizeBrowserView() {
  if (!win || !view) return;
  const [winWidth, winHeight] = win.getSize();
  // Adjust the x and y offsets as needed; here, view starts at x:80, y:30.
  view.setBounds({ x: 80, y: 30, width: winWidth - 80, height: winHeight - 30 });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
