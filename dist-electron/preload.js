import { contextBridge as i, ipcRenderer as e } from "electron";
i.exposeInMainWorld("electron", {
  minimize: () => e.send("window-minimize"),
  toggleMaximize: () => e.send("window-maximize"),
  close: () => e.send("window-close"),
  openExternal: (n) => e.send("open-external", n)
});
