const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('messengerAPI', {
  switchMessenger: (url) => ipcRenderer.send('switch-messenger', url)
});

contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.send('window-control', 'minimize'),
  maximize: () => ipcRenderer.send('window-control', 'maximize'),
  close: () => ipcRenderer.send('window-control', 'close')
});

contextBridge.exposeInMainWorld('authAPI', {
  loginWithGoogle: () => ipcRenderer.invoke('google-oauth-login')
});

contextBridge.exposeInMainWorld('userSessionAPI', {
  saveSession: (data) => ipcRenderer.send('save-user-session', data)
});
