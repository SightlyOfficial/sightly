const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  get: () => ipcRenderer.invoke('get-config'),
  set: patch => ipcRenderer.invoke('set-config', patch),
  toggle: () => ipcRenderer.invoke('toggle-overlay'),
  minimize: () => ipcRenderer.send('win-min'),
  close: () => ipcRenderer.send('win-close'),
  openUrl: url => ipcRenderer.send('open-url', url),
  onConfig: cb => ipcRenderer.on('config', (_, c) => cb(c)),
  onState: cb => ipcRenderer.on('state', (_, s) => cb(s))
});