<div align="center">
<img alt="logo" height="100" width="100" src="public/icon/favicon.png" />
<h1>Constella</h1>
<p>面向知识结构化与协作式思维外化的实时协作无限画布</p>

[中文](./README.md) | [English](./README-en.md)

[后端核心服务](https://github.com/TiiJeiJ8/Constella_CORE) | [用户指南](docs/USER_GUIDE.md) | [编辑器指南](docs/EDITOR_GUIDE.md) | [插件开发](docs/PLUGIN_DEVELOPMENT_ARCHITECTURE_4.0.md)

<br />

[Contributing](./CONTRIBUTING.md) | [Security](./SECURITY.md) | [Code of Conduct](./CODE_OF_CONDUCT.md)

<br />

[![Stars](https://img.shields.io/github/stars/TiiJeiJ8/constella?style=flat)](https://github.com/TiiJeiJ8/constella/stargazers)
[![Issues](https://img.shields.io/github/issues/TiiJeiJ8/constella)](https://github.com/TiiJeiJ8/constella/issues)
[![Release](https://img.shields.io/github/v/release/TiiJeiJ8/constella)](https://github.com/TiiJeiJ8/constella/releases)
[![License](https://img.shields.io/github/license/TiiJeiJ8/constella)](./LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/TiiJeiJ8/constella)](https://github.com/TiiJeiJ8/constella/commits)

</div>

![DEMO](IMG/canvas_demo.jpg)

## 说明

> [!IMPORTANT]
>
> ### 项目定位
>
> - 本仓库是 Constella 的前端工程（Web + Electron），后端请使用 [Constella_CORE](https://github.com/TiiJeiJ8/Constella_CORE)
> - Constella 关注“结构化思维表达”，而不是线性文档编辑
> - 当前项目仍在持续迭代，欢迎通过 Issue 和 PR 参与改进

> [!NOTE]
>
> - **从源码开发/构建需要 Node.js 环境**
> - **桌面发行版（installer / zip）已内置 Node.js 环境，终端用户无需额外安装**

- 技术栈：Vue 3 + TypeScript + Vite + Electron + Yjs
- 运行形态：Web 浏览器与 Electron 桌面端
- 协作能力：基于 CRDT（Yjs + y-websocket）实现多人实时同步
- 配置方式：首次启动后在首页输入后端地址，地址将持久化到本地

## 🧑‍💻 开发

### 快速开始

1. 开发者从源码运行时，请使用 Node.js 22.12.0
2. 安装依赖：`npm install`
3. 启动 Web 开发环境：`npm run dev`
4. 启动 Electron 开发模式：`npm run dev:electron`
5. 构建 Web 产物：`npm run build`

### 构建桌面端

- 执行 `npm run version:bump -- 1.x.x` 更新版本号（构建前必做）
- 该命令会同步更新 `web/package.json`、`web/package-lock.json`，并尝试同步 `../server/package.json`、`../server/package-lock.json`
- 当找不到 `server` 目录或后端版本文件时，会自动跳过后端同步，不影响前端版本更新
- 执行 `npm run build:electron:release` 进行生产构建（一次性生成 installer + zip）
- 或执行 `npm run build:electron:installer` 构建安装程序版本
- 或执行 `npm run build:electron:zip` 构建 zip 版本
- 构建输出目录在 `dist-electron/`

### 协作地址配置

- 默认根据首页输入的后端地址自动推导 WebSocket 地址
- 如需手动指定，可在 `.env.development` 中配置：`VITE_WS_URL=localhost:3000`

### 后端 JWT 密钥配置

- **打包分发版（Electron 应用）**：用户无需手动配置，首次启动时后端会自动生成随机密钥并保存到本地配置目录
- **自建部署场景**：可通过 `JWT_SECRET` 环境变量或配置文件指定密钥；详见 [后端文档](https://github.com/TiiJeiJ8/Constella_CORE/blob/master/README.md)

## 🎉 功能

- 🧭 无限画布：节点、连线、拖拽、缩放
- 🤝 实时协作：多人同步编辑与状态共享
- 🧩 插件化节点系统：Text / Markdown / Image / Hyperlink 等，支持节点插件导入
- 🔐 房间权限控制：清晰区分成员角色与协作边界
- 🌍 国际化与主题：中英文切换、亮色 / 暗色
- 💾 数据持久化：IndexedDB（Web）+ electron-store（桌面端）

## 插件开发与导入安装

Constella 现已同时支持内置节点插件与可安装运行时插件。

- 内置正式插件位于 `src/plugins/`，它们属于应用本身，随版本一起发布
- 面向普通用户，推荐使用 `.constella-plugin` 作为主安装包格式，`.zip` 作为兼容格式
- 开发插件文件夹导入仅在 `Developer Mode` 开启后显示；关闭开发者模式会隐藏开发插件的入口点，并阻止开发插件在运行时加载，同时保留其记录以便后续重用。
- `manifest.json` 是插件目录的入口文件，不应作为独立安装包直接分发
- 建议将插件分成三层：内置正式插件、用户安装插件、开发调试插件，不要混在同一个目录职责里
- 已安装插件会持久化到 Electron 用户数据目录：`app.getPath('userData')/plugins/installed`，因此重启桌面应用后仍然存在。

相关文档：

- [插件安装包格式](docs/PLUGIN_PACKAGE_FORMAT.md)
- [插件开发架构 4.0](docs/PLUGIN_DEVELOPMENT_ARCHITECTURE_4.0.md)

## 🖼️ 界面展示

<details>
<summary> 协作画布演示 </summary>

![DEMO](IMG/demo.gif)

</details>

<details>
<summary> 深浅色模式 </summary>

![Dark&Light](IMG/dark_theme.jpg)
![Dark&Light](IMG/light_theme.jpg)

</details>

<details>
<summary> 房间页 </summary>

![Room Page](IMG/roompage.jpg)

</details>

<details>
<summary> 创建房间 </summary>

![Create Room](IMG/createroom.jpg)

</details>

<details>
<summary> 编辑器演示 </summary>

![Editor Demo](IMG/editorwindow.jpg)

</details>

<details>
<summary> 插件面板 </summary>

![Plugin Panel](IMG/plugin_panel.jpg)
![Plugin Setting Panel](IMG/plugin_panel_setting_panel.jpg)

</details>

<details>
<summary> 插件开发 </summary>

![Plugin Panel Error](IMG/plugin_developer_error.jpg)

</details>

## 📦️ 获取

### 源码运行

```bash
git clone https://github.com/TiiJeiJ8/constella.git
cd web
npm install
npm run dev
```

### 打包构建

- Web 产物：`npm run build`，输出至 `dist/`
- Electron 客户端：`npm run build:electron` (包含内置 Node runtime)

### 部署建议

- 前端可作为静态站点部署（Nginx / Caddy / 任意静态托管）
- 后端服务请参考 [Constella_CORE](https://github.com/TiiJeiJ8/Constella_CORE)

## 📁 项目结构

```text
src/
├─ components/      # 通用 UI 组件
├─ plugins/         # 节点插件
├─ composables/     # 组合式逻辑
├─ services/        # API 与协作服务
├─ locales/         # 国际化资源
├─ views/           # 页面视图
└─ assets/          # 静态资源

electron/           # Electron 主进程与 preload
public/             # 公共资源
docs/               # 使用与开发文档
```

## 🤝 贡献

欢迎参与贡献：

- 提交 Issue 报告问题或提出建议
- 提交 PR 改进功能、文档或测试
- Star / Fork 支持项目长期迭代

<a href="https://github.com/TiiJeiJ8/constella/graphs/contributors" target="_blank" rel="noopener">
  <img src="https://contrib.rocks/image?repo=TiiJeiJ8/constella&max=30&anon=1&v=1"
    alt="Constella contributors"
    width="650"
    loading="lazy"
  />
</a>

## 📢 免责声明

本项目处于持续开发阶段，部分功能和接口可能发生调整。请在生产环境使用前完成充分测试与风险评估。

## 📜 开源许可

本项目采用 [MIT License](./LICENSE)。

## ⭐ Star History

<a href="https://www.star-history.com/?repos=TiiJeiJ8%2Fconstella&type=timeline&legend=bottom-right">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/image?repos=TiiJeiJ8/constella&type=timeline&theme=dark&legend=bottom-right" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/image?repos=TiiJeiJ8/constella&type=timeline&legend=bottom-right" />
   <img alt="Star History Chart" src="https://api.star-history.com/image?repos=TiiJeiJ8/constella&type=timeline&legend=bottom-right" />
 </picture>
</a>
