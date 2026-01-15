import { ipcMain as o, shell as s, app as n, BrowserWindow as t } from "electron";
import i, { dirname as d } from "path";
import { fileURLToPath as f } from "url";
const m = f(import.meta.url), a = d(m);
let e = null;
function l() {
  e = new t({
    width: 1280,
    height: 800,
    frame: !1,
    // 隐藏默认边框
    transparent: !1,
    backgroundColor: "#ffffff",
    roundedCorners: !0,
    // 启用圆角
    webPreferences: {
      nodeIntegration: !1,
      contextIsolation: !0,
      preload: i.join(a, "preload.js"),
      sandbox: !1
    }
  }), process.env.VITE_DEV_SERVER_URL ? (e.loadURL(process.env.VITE_DEV_SERVER_URL), e.webContents.openDevTools()) : e.loadFile(i.join(a, "../dist/index.html")), e.on("closed", () => {
    e = null;
  });
}
o.on("window-minimize", () => {
  e && e.minimize();
});
o.on("window-maximize", () => {
  e && (e.isMaximized() ? e.unmaximize() : e.maximize());
});
o.on("window-close", () => {
  e && e.close();
});
o.on("open-external", (w, r) => {
  s.openExternal(r);
});
n.whenReady().then(() => {
  l(), n.on("activate", () => {
    t.getAllWindows().length === 0 && l();
  });
});
n.on("window-all-closed", () => {
  process.platform !== "darwin" && n.quit();
});
