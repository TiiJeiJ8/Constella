<div align="center">

<img src="public/icon/favicon.png" alt="Constella Logo" width="100" height="100" />

# Constella

**A real-time collaborative infinite canvas for structured knowledge and externalized thinking**

Vue 3 · TypeScript · Vite · Electron · Yjs

[![GitHub Stars](https://img.shields.io/github/stars/TiiJeiJ8/constella?style=flat-square&logo=github)](https://github.com/TiiJeiJ8/constella/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/TiiJeiJ8/constella?style=flat-square&logo=github)](https://github.com/TiiJeiJ8/constella/forks)
[![GitHub Issues](https://img.shields.io/github/issues/TiiJeiJ8/constella?style=flat-square&logo=github)](https://github.com/TiiJeiJ8/constella/issues)
[![License](https://img.shields.io/github/license/TiiJeiJ8/constella?style=flat-square)](./LICENSE)

[Quick Start](#quick-start) · [Core Features](#core-features) · [Screenshots](#screenshots) · [Plugin Ecosystem](#plugin-ecosystem) · [Contributing](#contributing)

[Backend Repository](https://github.com/TiiJeiJ8/Constella_CORE) · [Report an Issue](https://github.com/TiiJeiJ8/constella/issues) · [CN README](README.md)

</div>

![Constella infinite canvas demo](IMG/canvas_demo.jpg)

## Overview

Constella focuses on structured thinking, connecting nodes, content, and collaborators on an infinite canvas. It runs in modern browsers and as an Electron desktop app.

> [!IMPORTANT]
> This repository contains the Constella frontend (Web + Electron). For the backend, use [Constella_CORE](https://github.com/TiiJeiJ8/Constella_CORE).
>
> The project is actively evolving. Contributions through Issues and PRs are welcome.

> [!NOTE]
> **Developing or building from source** requires Node.js.
>
> **Desktop releases (installer / zip)** include Node.js, so end users do not need to install it separately.

## Core Features

| Feature | Description |
| --- | --- |
| Infinite canvas | Nodes, edges, free dragging, and zooming |
| Real-time collaboration | CRDT-based synchronization with Yjs + y-websocket for simultaneous editing and shared state |
| Plugin-based nodes | Text, Markdown, Image, Hyperlink, and more, with support for importing node plugins |
| Room permissions | Defined member roles and collaboration boundaries |
| Languages and themes | Chinese and English, with light and dark themes |
| Data persistence | IndexedDB on the Web and electron-store on desktop |

## Quick Start

### Prerequisites

- Node.js **22.12.0**
- Backend service: [Constella_CORE](https://github.com/TiiJeiJ8/Constella_CORE)

### Get the Source

```bash
git clone https://github.com/TiiJeiJ8/constella.git
```

Navigate to the frontend's `web` directory, then install dependencies and start the app:

```bash
npm install
npm run dev
```

On first launch, enter your backend URL on the home page. The address is saved locally for future sessions.

### Common Commands

| Purpose | Command | Output Directory |
| --- | --- | --- |
| Start the Web development server | `npm run dev` | — |
| Start Electron in development mode | `npm run dev:electron` | — |
| Build Web assets | `npm run build` | `dist/` |
| Build the Electron client (includes the Node runtime) | `npm run build:electron` | `dist-electron/` |

## Build and Deployment

### Build Desktop Releases

**1. Update the version number (required before building)**

Replace `1.x.x` with your target version:

```bash
npm run version:bump -- 1.x.x
```

This command updates `web/package.json` and `web/package-lock.json`, then attempts to synchronize `../server/package.json` and `../server/package-lock.json`. If the `server` directory or backend version files are missing, backend synchronization is skipped automatically and the frontend version update still succeeds.

**2. Choose a build option**

| Build Option | Command |
| --- | --- |
| Generate both installer and zip | `npm run build:electron:release` |
| Generate the installer only | `npm run build:electron:installer` |
| Generate the zip only | `npm run build:electron:zip` |

Build artifacts are generated in `dist-electron/`.

### Web Deployment

Run `npm run build`, then deploy the frontend assets in `dist/` using Nginx, Caddy, or any static hosting platform.

For backend deployment, refer to [Constella_CORE](https://github.com/TiiJeiJ8/Constella_CORE).

### Collaboration Address Configuration

The WebSocket URL is derived automatically from the backend URL entered on the home page. To override it, add the following to `.env.development`:

```dotenv
VITE_WS_URL=localhost:3000
```

### Backend JWT Secret Configuration

| Scenario | Configuration |
| --- | --- |
| Packaged desktop release (Electron app) | No manual configuration is required. On first startup, the backend generates a random secret and saves it to the local configuration directory. |
| Self-hosted deployment | Set the secret through the `JWT_SECRET` environment variable or a configuration file. See the [backend documentation](https://github.com/TiiJeiJ8/Constella_CORE/blob/master/README-en.md). |

## Plugin Ecosystem

Constella supports both built-in node plugins and installable runtime plugins.

### Plugin Types

| Type | Description |
| --- | --- |
| Built-in official plugins | Located in `src/plugins/` and shipped as part of the application |
| User-installed plugins | Distributed primarily as `.constella-plugin` packages, with `.zip` supported for compatibility |
| Development plugins | Imported from a plugin folder when `Developer Mode` is enabled in Settings |

Keep these three plugin categories separate so that each directory has a clear responsibility.

### Installation and Persistence

- Manage plugins through **Settings → Plugins** or the room dock plugin panel. The plugin panel defaults to package installation for end users.
- `manifest.json` is the entry file inside a plugin directory and should not be distributed as a standalone installation package.
- Installed user plugins are persisted under Electron user data and remain available after restarting the desktop app.
- Turning off `Developer Mode` hides development plugin entry points and prevents development plugins from loading at runtime. Their records are retained for later reuse.

### Developer Documentation

- [Plugin Package Format](docs/PLUGIN_PACKAGE_FORMAT.md)
- [Plugin Development Architecture 4.0](docs/PLUGIN_DEVELOPMENT_ARCHITECTURE_4.0.md)

## Screenshots

Expand an item below to view the corresponding interface.

<details>
<summary><strong>Themes · Dark and Light Modes</strong></summary>

### Dark Mode

![Constella dark mode](IMG/dark_theme.jpg)

### Light Mode

![Constella light mode](IMG/light_theme.jpg)

</details>

<details>
<summary><strong>Room Management · Room Page and Room Creation</strong></summary>

### Room Page

![Constella room page](IMG/roompage.jpg)

### Create a Room

![Constella room creation](IMG/createroom.jpg)

</details>

<details>
<summary><strong>Canvas Editing · Editor Demo</strong></summary>

![Constella editor demo](IMG/editorwindow.jpg)

</details>

<details>
<summary><strong>Plugin Management · Plugin Panel and Settings</strong></summary>

### Plugin Panel

![Constella plugin panel](IMG/plugin_panel.jpg)

### Plugin Settings

![Constella plugin settings panel](IMG/plugin_panel_setting_panel.jpg)

</details>

<details>
<summary><strong>Plugin Development · Debugging Interface</strong></summary>

![Constella plugin debugging interface](IMG/plugin_developer_error.jpg)

</details>

## Project Structure

```text
src/
├─ components/      # Shared UI components
├─ plugins/         # Node plugins
├─ composables/     # Reusable composition logic
├─ services/        # API and collaboration services
├─ locales/         # Internationalization resources
├─ views/           # Page-level views
└─ assets/          # Static assets

electron/           # Electron main process and preload
public/             # Public assets
docs/               # Usage and development documentation
```

## Contributing

You can contribute to Constella in the following ways:

- **Share feedback:** Open an Issue to report a bug, start a discussion, or propose an improvement.
- **Improve the project:** Submit a PR for features, fixes, documentation, or tests.
- **Support development:** Star or Fork the project to support its continued development.

<a href="https://github.com/TiiJeiJ8/constella/graphs/contributors" target="_blank" rel="noopener">
  <img
    src="https://contrib.rocks/image?repo=TiiJeiJ8/constella&max=100&anon=1&v=2&columns=10"
    alt="Constella contributors"
    width="650"
    loading="lazy"
  />
</a>

## Disclaimer

This project is under active development. Some features and interfaces may change. Please evaluate and test thoroughly before production use.

## License

This project is licensed under the [MIT License](./LICENSE).

### Third-party Open Source Components

Constella's Markdown node editor uses an internal fork based on MarkText / Muya. The related source is located in `web/vendor/muya`, with the original MIT License, NOTICE, and upstream README preserved in that directory.

## Star History

<a href="https://www.star-history.com/?repos=TiiJeiJ8%2Fconstella&type=timeline&legend=bottom-right">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/image?repos=TiiJeiJ8/constella&type=timeline&theme=dark&legend=bottom-right" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/image?repos=TiiJeiJ8/constella&type=timeline&legend=bottom-right" />
    <img alt="Constella Star History" src="https://api.star-history.com/image?repos=TiiJeiJ8/constella&type=timeline&legend=bottom-right" />
  </picture>
</a>
