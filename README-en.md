# Constella

[CN](/README.md) | [EN](./README-en.md)

> A self-hostable, real-time collaborative infinite canvas designed for **knowledge structuring and externalized thinking**.

Constella explores a core question:

**When thinking is no longer linear text, but a growing structure of nodes, branches, and connections, how should we capture, organize, and collaborate on it?**

This repository contains the **frontend codebase** of Constella. The backend core service is available at:
👉 [Constella_CORE](https://github.com/TiiJeiJ8/Constella_CORE)

Built with **Vue 3 + TypeScript + Vite**, Constella runs on both **Web browsers** and **Electron desktop**, with a strong emphasis on:

* Data ownership through self-hosting
* Structure-first expression via an infinite canvas
* Collaboration as a first-class capability, not an afterthought

---

![DEMO](IMG/demo.gif)

---

## ✨ Why Constella

Many existing tools (Notion, Obsidian, traditional whiteboards) make trade-offs:

* Local-first tools → weak real-time collaboration
* Collaborative platforms → limited data ownership or deployment control
* Whiteboard tools → poor support for structured knowledge

Constella does not aim to replace them. Instead, it explores a different direction:

> **A structure-centric, extensible, and collaborative infinite canvas system.**

---

## ✨ Core Features

* 🧭 **Infinite Canvas**
  Nodes, edges, free dragging, and zooming — expressing complex structures spatially rather than as linear documents.

* 🤝 **Real-Time Collaboration**
  Powered by **Yjs + y-websocket**, enabling multi-user synchronous editing (currently focused on LAN / self-hosted scenarios).

* 🧩 **Plugin-Based Node System**
  Node types are not hard-coded. Markdown, images, text, and more are implemented as extensible plugins.

* 🔐 **Rooms & Permission Model**
  Supports public and private rooms, providing a foundation for controlled collaboration and sharing.

* 🌍 **Internationalization & Theming**
  Built-in i18n (Chinese / English) with dark and light themes.

* 💾 **Local Persistence & Reconnection**
  IndexedDB and Electron Store ensure data durability and resilience against short network interruptions.

---

## 🧱 Tech Stack

* **Framework**: Vue 3 + Composition API
* **Language**: TypeScript
* **Build Tooling**: Vite
* **Collaboration Engine**: Yjs
* **Transport**: WebSocket (y-websocket)
* **Desktop Runtime**: Electron

This is not a demo-scale project, but a holistic engineering practice centered around **state synchronization, consistency, extensibility, and cross-platform reuse**.

---

## 🖥️ Runtime & Compatibility

* **Browsers**: Modern Chromium-based browsers and Firefox
* **Desktop**: Electron (Windows / macOS / Linux)

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
cd client
npm install
```

### 2. Start Web development server

```bash
npm run dev
```

### 3. Start Electron development mode

```bash
npm run dev:electron
```

### 4. Build for production

```bash
npm run build
```

---

## 📁 Project Structure

```text
src/
├─ components/      # Shared UI components
├─ plugins/         # Content plugins (Markdown / Image / Text, etc.)
├─ services/        # API, authentication, Yjs collaboration services
├─ composables/     # Reusable composition logic (hooks)
├─ locales/         # i18n resources
├─ views/           # Page-level views
└─ assets/          # Static assets

public/             # Public static files
docs/               # Documentation (usage / development / plugins)
```

---

## ⚙️ Configuration Notes

### Backend Endpoint

* Configurable via environment variables or directly in `src/services/api.ts`

### Local Storage

* Web: `localStorage` (access token, refresh token, user metadata)
* Electron: `electron-store`

### Internationalization (i18n)

* Translation files are located in `src/locales/`
* Currently supports Chinese and English

---

## 🔍 Common Scenarios

* **Automatic Token Refresh**
  The frontend implements a refresh-token mechanism. When a request returns 401, it attempts to refresh and retry automatically.

* **Private Room Access**
  Authentication is required with an Authorization header. Ensure your proxy (e.g., Nginx) does not strip this header.

* **Collaboration Stability**
  Supports reconnection and local persistence; brief network interruptions do not cause data loss.

---

## 📚 Documentation

* 📘 [EDITOR_GUIDE.md](docs/EDITOR_GUIDE.md)
  Editor usage and configuration guide: canvas operations, toolbars, shortcuts, and import/export workflows.

* 🧩 [PLUGIN_DEVELOPMENT.md](docs/PLUGIN_DEVELOPMENT.md)
  Plugin development guide: architecture, interfaces, examples, and extension patterns.

---

## 🤝 Project Status & Contributions

Constella is an actively developed project initiated by a student developer. It is **not yet a fully mature, production-grade system**, and there are known limitations:

* Feature coverage is still expanding
* Collaboration and permission models can be improved
* Some design decisions are constrained by current experience and resources

That said:

> **If you are interested in collaborative systems, knowledge tools, editor architecture, or Yjs-based synchronization, contributions are highly welcome.**

You are encouraged to:

* ⭐ Star the project to show support
* 🛠 Fork it for experiments or derivative work
* 🧩 Submit pull requests to improve or extend functionality
* 💬 Open issues to discuss ideas, designs, or problems

---

## 📄 License

MIT
