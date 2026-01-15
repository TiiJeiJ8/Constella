import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("electron", {
  minimize: () => ipcRenderer.send("window-minimize"),
  toggleMaximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  openExternal: (url) => ipcRenderer.send("open-external", url)
});
