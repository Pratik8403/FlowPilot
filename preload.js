const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startTracking: () => ipcRenderer.send('start-tracking'),
  stopTracking: () => ipcRenderer.send('stop-tracking'),
  onStateChange: (fn) => ipcRenderer.on('state-change', (e, d) => fn(d))
});
