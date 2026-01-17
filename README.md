# Constella

[CN](/README.md) | [EN](./README-en.md)

> 一款面向**知识结构化与协作式思维外化**的可自部署实时协作无限画布应用。

Constella 致力于解决一个核心问题：

**当思考不再是线性的文本，而是不断生长、分叉、连接的结构时，我们该如何记录、组织并与他人协作？**

本仓库为 **Constella 前端代码库**，后端核心服务位于：
👉 [Constella_CORE](https://github.com/TiiJeiJ8/Constella_CORE)

项目基于 **Vue 3 + TypeScript + Vite** 构建，支持 **Web 浏览器** 与 **Electron 桌面端**，强调：

* 数据可控（自部署）
* 结构优先（无限画布 + 节点连接）
* 协作原生（实时同步，而非事后合并）

---

![DEMO](IMG/demo.gif)

---

## ✨ 为什么是 Constella

市面上已经有很多优秀的工具，但它们往往在以下维度存在取舍：

* 本地工具 → 协作能力弱
* 协作工具 → 数据与部署不可控
* 白板工具 → 结构表达能力有限
* 知识工具 → 思维结构化支持不足

Constella 的目标不是替代它们，而是探索一个不同方向：

> **以“结构化思维”为核心的一体化、可扩展、可协作无限画布系统。**

---

## ✨ 核心特性

* 🧭 **无限画布（Infinite Canvas）**
  节点 / 连线 / 自由拖拽 / 缩放，用空间表达复杂结构，而非线性文档。

* 🤝 **实时协作（Real-time Collaboration）**
  基于 **Yjs + y-websocket**，支持多人实时同步编辑（当前以局域网/自部署场景为主）。

* 🧩 **插件化节点系统**
  节点类型并非写死，支持 Markdown、图片、文本等内容插件，便于持续扩展。

* 🔐 **房间与权限模型**
  支持公开 / 私有房间，为协作与分享提供基础控制能力。

* 🌍 **国际化与主题系统**
  中 / 英双语，暗色 / 亮色主题切换。

* 💾 **本地持久化与断线重连**
  IndexedDB / Electron Store，短暂断线不影响编辑状态。

---

## 🧱 技术栈

* **框架**：Vue 3 + Composition API
* **语言**：TypeScript
* **构建工具**：Vite
* **协作引擎**：Yjs
* **通信**：WebSocket（y-websocket）
* **桌面端**：Electron

该项目并非 Demo 级练习，而是围绕 **状态同步、数据一致性、插件扩展与跨端复用** 等问题进行的完整工程实践。

---

## 🖥️ 运行环境与兼容性

* **浏览器**：Chromium 内核 / Firefox（现代浏览器）
* **桌面端**：Electron（Windows / macOS / Linux）

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd client
npm install
```

### 2. 启动 Web 开发环境

```bash
npm run dev
```

### 3. 启动 Electron 开发模式

```bash
npm run dev:electron
```

### 4. 构建生产版本

```bash
npm run build
```

---

## 📁 核心目录结构

```text
src/
├─ components/      # 通用 UI 组件
├─ plugins/         # 内容插件（Markdown / Image / Text 等）
├─ services/        # API、鉴权、Yjs 协作相关服务
├─ composables/     # 组合式逻辑（Hooks）
├─ locales/         # i18n 国际化资源
├─ views/           # 页面级视图
└─ assets/          # 静态资源

public/             # 公共静态资源
docs/               # 项目文档（使用 / 开发 / 插件）
```

---

## ⚙️ 配置要点

### 后端地址

* 通过环境变量配置，或在 `src/services/api.ts` 中设置 `baseUrl`

### 本地存储

* Web：`localStorage`（access / refresh token、用户信息）
* Electron：`electron-store`

### 国际化（i18n）

* 翻译文件位于 `src/locales/`
* 当前支持中英文切换

---

## 🔍 常见场景说明

* **Token 自动刷新**
  前端内置 refresh token 机制：请求返回 401 时，会尝试刷新并自动重试。

* **私有房间访问**
  需要登录并携带 Authorization Header；部署时请确保代理（如 Nginx）不会剥离该 Header。

* **协作稳定性**
  支持断线重连与本地持久化，短时网络异常不会导致数据丢失。

---

## 📚 文档与资源

* 📘 [EDITOR_GUIDE.md](docs/EDITOR_GUIDE.md)
  编辑器使用与配置指南：画布操作、工具栏、快捷键、导入 / 导出流程。

* 🧩 [PLUGIN_DEVELOPMENT.md](docs/PLUGIN_DEVELOPMENT.md)
  插件开发指南：插件架构、接口约定、示例与扩展方式。

---

## 🤝 关于项目状态与贡献

Constella 由学生个人发起并持续开发，目前**尚未达到完全成熟产品级别**，在以下方面仍存在不足：

* 功能覆盖仍在扩展中
* 协作与权限模型仍有优化空间
* 部分设计受限于当前个人技术能力

但也正因如此：

> **如果你对协作系统、知识工具、编辑器架构或 Yjs 感兴趣，非常欢迎参与共建。**

你可以：

* ⭐ Star 项目表示支持
* 🛠 Fork 并进行实验或二次开发
* 🧩 提交 PR，改进现有实现或新增插件
* 💬 提出 Issue，讨论设计与方向

---

## 📄 License

MIT