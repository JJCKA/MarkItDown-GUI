import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // Backend
  getBackendPort: () => ipcRenderer.invoke('backend-port'),

  // Dialogs
  openFiles: () => ipcRenderer.invoke('dialog:open-files'),
  openFolder: () => ipcRenderer.invoke('dialog:open-folder'),
  saveFile: (defaultName: string) => ipcRenderer.invoke('dialog:save-file', defaultName),

  // Filesystem helpers
  statPath: (filepath: string) => ipcRenderer.invoke('fs:stat', filepath),
  readDir: (dirpath: string) => ipcRenderer.invoke('fs:readdir', dirpath),
})
