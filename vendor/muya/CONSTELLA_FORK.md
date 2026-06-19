# Constella Muya Internal Fork

This directory vendors the Muya editor source used by Constella's Markdown node editor.

## Runtime Contract

- Constella resolves `@muyajs/core` to `web/vendor/muya/src/index.ts` through `web/vite.config.ts`.
- The app must not depend on an external MarkText checkout such as `D:/Learning Material/Git/marktext`.
- Regular npm dependencies such as `prismjs`, `katex`, `mermaid`, and `@marktext/file-icons` are still resolved from `web/node_modules`.

## Upstream

- Project: MarkText / Muya
- Upstream package path: `packages/muya`
- License: MIT, preserved in `LICENSE`
- Upstream README snapshot: `UPSTREAM_README.md`
- Notice file: `NOTICE`

## Constella Changes

- Vite alias integration for `@muyajs/core`.
- TypeScript/Vite compatibility patches for browser dev transforms.
- Internal editor APIs used by the Markdown node editor, including content replacement, history, static HTML/PDF export support, image paste hooks, TOC/outline support, and live option refresh.
- Constella theme compatibility for editor chrome, code blocks, Mermaid previews, and export styling.

## Maintenance Rules

- Keep upstream-derived code inside `web/vendor/muya`.
- Prefer small, documented compatibility patches over broad rewrites.
- Do not copy new upstream files blindly; keep license/notice context with imported code.
- When changing behavior, add a short note here and verify the Markdown regression fixture at `web/docs/editor_test/EDITOR_EXPORT_TEST_FIXTURE.md`.
- Run `npm run build` from `web` after changes that touch this fork or the Markdown editor.
