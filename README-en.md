<div align="center">
<img alt="logo" height="100" width="100" src="public/icon/favicon.png" />
<h1>Constella</h1>
<p>A real-time collaborative infinite canvas for structured knowledge and externalized thinking</p>

[中文](./README.md) | [English](./README-en.md) | [Backend Core](https://github.com/TiiJeiJ8/Constella_CORE) | [User Guide](docs/USER_GUIDE-en.md) | [Editor Guide](docs/EDITOR_GUIDE.md) | [Plugin Development](docs/PLUGIN_DEVELOPMENT_ARCHITECTURE_3.0.md)

<br />

[Contributing](./CONTRIBUTING.md) | [Security](./SECURITY.md) | [Code of Conduct](./CODE_OF_CONDUCT.md)

<br />

[![Stars](https://img.shields.io/github/stars/TiiJeiJ8/constella?style=flat)](https://github.com/TiiJeiJ8/constella/stargazers)
[![Issues](https://img.shields.io/github/issues/TiiJeiJ8/constella)](https://github.com/TiiJeiJ8/constella/issues)
[![License](https://img.shields.io/github/license/TiiJeiJ8/constella)](./LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/TiiJeiJ8/constella)](https://github.com/TiiJeiJ8/constella/commits)

</div>

![DEMO](IMG/demo.gif)

## Overview

> [!IMPORTANT]
>
> ### Project Scope
>
> - This repository is the frontend of Constella (Web + Electron). The backend is [Constella_CORE](https://github.com/TiiJeiJ8/Constella_CORE)
> - **The app requires a Node.js environment to run**
> - Constella focuses on structure-first knowledge expression instead of linear documents
> - The project is actively evolving; contributions via Issues and PRs are welcome

- Stack: Vue 3 + TypeScript + Vite + Electron + Yjs
- Runtime: modern browsers and Electron desktop
- Collaboration: CRDT-based real-time sync via Yjs + y-websocket
- Setup: backend URL is entered on the home page and persisted locally

## 🧑‍💻 Development

### Quick Start

1. Ensure Node.js (recommended >= 20)
2. Install dependencies: `npm install`
3. Start Web dev server: `npm run dev`
4. Start Electron dev mode: `npm run dev:electron`
5. Build Web assets: `npm run build`

### Build Desktop Package

- Run `npm run build:electron`
- Build artifacts are generated in `dist-electron/`

### Collaboration Address Configuration

- WebSocket URL is derived automatically from your backend URL
- You can override it in `.env.development` with `VITE_WS_URL=localhost:3000`

## 👀 Demo

- Recorded demo: `IMG/demo.gif`
- Local preview: run `npm run dev` and open the URL shown in terminal

## 🎉 Features

- 🧭 Infinite canvas: nodes, edges, free dragging, zooming
- 🤝 Real-time collaboration: multi-user synchronous editing
- 🧩 Plugin-based node system: Text / Markdown / Image / Hyperlink and more
- 🔐 Room model: public/private rooms foundation
- 🌍 i18n and theming: Chinese/English + light/dark
- 💾 Persistence: IndexedDB (Web) + electron-store (desktop)

## 🖼️ Screenshots

<details>
<summary> Canvas Collaboration Demo </summary>

![DEMO](IMG/demo.gif)

</details>

<details>
<summary> Dark & Light Mode </summary>

![Dark&Light](IMG/dark_theme.jpg)
![Dark&Light](IMG/light_theme.jpg)

</details>

<details>
<summary> Room Page </summary>

![Room Page](IMG/roompage.jpg)

</details>

<details>
<summary> Create Room </summary>

![Create Room](IMG/createroom.jpg)

</details>

<details>
<summary> Editor Demo </summary>

![Editor Demo](IMG/editorwindow.jpg)

</details>

## 📦️ Distribution

### Run from Source

```bash
git clone https://github.com/TiiJeiJ8/constella.git
cd web
npm install
npm run dev
```

### Build Artifacts

- Web build: `npm run build` outputs to `dist/`
- Electron package: `npm run build:electron`

### Deployment Notes

- Frontend can be deployed as static assets (Nginx/Caddy/any static hosting)
- For backend setup, refer to [Constella_CORE](https://github.com/TiiJeiJ8/Constella_CORE)

## 📁 Project Structure

```text
src/
├─ components/      # Shared UI components
├─ plugins/         # Node plugins
├─ composables/     # Reusable composition logic
├─ services/        # API and collaboration services
├─ locales/         # i18n resources
├─ views/           # Page-level views
└─ assets/          # Static assets

electron/           # Electron main/preload process
public/             # Public assets
docs/               # Usage and development docs
```

## 🤝 Contributing

Contributions are welcome:

- Open Issues for bugs, discussions, and proposals
- Submit PRs for features, fixes, docs, and tests
- Support long-term iteration via Stars and Forks

<a href="https://github.com/TiiJeiJ8/constella/graphs/contributors" target="_blank" rel="noopener">
  <img src="https://contrib.rocks/image?repo=TiiJeiJ8/constella&max=30&anon=1&v=1"
    alt="Constella contributors"
    width="650"
    loading="lazy"
  />
</a>

## 📢 Disclaimer

This project is under active development. Some features and interfaces may change. Please evaluate and test thoroughly before production use.

## 📜 License

This project is licensed under [MIT License](./LICENSE).

## ⭐ Star History

<a href="https://www.star-history.com/?repos=TiiJeiJ8%2Fconstella&type=timeline&legend=bottom-right">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/image?repos=TiiJeiJ8/constella&type=timeline&theme=dark&legend=bottom-right" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/image?repos=TiiJeiJ8/constella&type=timeline&legend=bottom-right" />
   <img alt="Star History Chart" src="https://api.star-history.com/image?repos=TiiJeiJ8/constella&type=timeline&legend=bottom-right" />
 </picture>
</a>
