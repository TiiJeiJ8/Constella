# Contributing to Constella Web

Thanks for contributing to Constella's web client. This repository contains the Vue + TypeScript + Vite + Electron frontend for the Constella experience.

## Before You Start

> [!NOTE]
> FOR USERS: Node is now bundled with the project, so no separate installation is needed!
> FOR DEVELOPERS: The web client now uses Node.js `22.12.0` bundled with the project. No separate Node.js installation is required for development or production builds.

- Use Node.js  `22.12.0`
- Install dependencies with `npm install`
- Read [README.md](./README.md) for project context and startup instructions
- For editor-related changes, check [docs/EDITOR_GUIDE.md](./docs/EDITOR_GUIDE.md)

## Local Development

Common commands:

- `npm run dev`: start the web app
- `npm run dev:electron`: start the Electron development flow
- `npm run dev:electron-no-backend`: run Electron UI without starting the backend flow
- `npm run build`: run type-checking and production build
- `npm run build:electron:release/zip/installer`: build the Electron package (Desktop artifacts bundle a Node runtime for end users, but not for development)

## What We Expect in Contributions

- Keep changes scoped and clearly explained.
- Preserve the existing visual language unless the change is intentionally redesigning part of the UI.
- Prefer small, reviewable pull requests over large mixed changes.
- Update docs when behavior, UX, or developer workflow changes.

## UI and UX Changes

If your change affects the interface or interaction design, include:

- A short summary of the user-facing change
- Screenshots or a short recording for major UI changes
- Notes about Electron-only or browser-only behavior when relevant

## Code Quality

Before opening a pull request, make sure you have run:

- `npm run build`

If you changed core editing, collaboration, Electron bridges, or rendering behavior, also explain how you manually tested it.

## Pull Request Guidelines

Please include:

- What changed
- Why it changed
- What area it affects: `ui`, `editor`, `canvas`, `electron`, `docs`, or `infra`
- How you tested it
- Screenshots/recordings for visual changes

## Issues and Feature Requests

When opening an issue, include:

- Clear reproduction steps
- Expected behavior
- Actual behavior
- Browser / Electron / OS details
- Screenshots, logs, or console errors when helpful

## Security

Please do not report security issues publicly in GitHub issues. Use the process in [SECURITY.md](./SECURITY.md).
