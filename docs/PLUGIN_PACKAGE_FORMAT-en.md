# Plugin Package Format

Constella's plugin ecosystem is now defined around two audience-facing delivery paths and one internal entry file rule:

- End users install packaged plugins: `.constella-plugin` or `.zip`
- Developers can load an unpacked plugin folder in development workflows
- `manifest.json` is the entry file inside a plugin root, not a standalone installable package

## 1. Delivery Modes

### 1.1 End-user distribution

Recommended formats:

- `.constella-plugin`: primary distribution format
- `.zip`: compatibility distribution format

These are the formats that best match future marketplace delivery, local backup, download, and sharing.

### 1.2 Developer loading

Recommended development source:

- A complete plugin folder containing `manifest.json`

This path is intended for local iteration, testing, and debugging. It should be treated as a developer-only convenience, not the main user-facing install format.

## 2. Three-layer Plugin Model

Constella should distinguish three plugin layers:

### 2.1 Built-in official plugins

- Location: `web/src/plugins/<plugin-name>/`
- Ownership: shipped with the app
- Purpose: official node types included in every build

### 2.2 User-installed plugins

- Source: `.constella-plugin` or `.zip`
- Persistence: Electron user data
- Purpose: optional features installed by end users

### 2.3 Development plugins

- Source: local plugin folder
- Suggested location: a dedicated development directory such as `dev-plugins/`
- Purpose: local testing without mixing temporary work into built-in plugins

## 3. Plugin Root Layout

```text
my-plugin/
  manifest.json
  dist/
    renderer.js
    editor.js
  i18n/
    zh-CN.json
    en-US.json
  assets/
    icon.png
```

## 4. `manifest.json`

```json
{
  "id": "com.example.todo",
  "name": "Todo Plugin",
  "version": "1.0.0",
  "description": "Checklist node plugin",
  "author": "Example Studio",
  "homepage": "https://example.com",
  "engine": {
    "constella": "^1.2.0"
  },
  "nodes": [
    {
      "kind": "todo",
      "label": "Todo",
      "description": "Checklist node",
      "icon": "assets/icon.png",
      "renderer": "dist/renderer.js",
      "editor": "dist/editor.js",
      "editable": true,
      "supportsCardMode": true,
      "supportsFontSizeControl": false
    }
  ],
  "i18n": {
    "zh-CN": "i18n/zh-CN.json",
    "en-US": "i18n/en-US.json"
  },
  "permissions": []
}
```

## 5. Field Notes

- `id`: stable plugin identifier
- `name`: display name in plugin management UI
- `version`: plugin version
- `nodes`: one package can provide one or more node kinds
- `renderer`: required runtime renderer module path
- `editor`: optional runtime editor module path
- `i18n`: optional locale bundles merged into host i18n at runtime

## 6. Runtime Module Rules

- `renderer.js` must export a Vue component as `default`
- `editor.js` should export a Vue component as `default` when present
- Named exports such as `renderer`, `RendererComponent`, `editor`, and `EditorComponent` may also be accepted by the runtime loader
- Runtime modules must not bundle or import Vue through bare imports such as `import { h } from 'vue'`

Use the host API instead:

```js
const { h, ref, computed } = window.__CONSTELLA_PLUGIN_API__.vue
```

## 7. Packaging Guidance

Recommended release flow:

1. Build the plugin runtime assets
2. Ensure `manifest.json` paths are correct
3. Package the plugin root as `.constella-plugin`
4. Optionally provide `.zip` for compatibility

Important:

- Do not distribute `manifest.json` alone
- Do not package unrelated parent directories around the plugin root
- The archive root should contain the plugin files directly

## 8. Installation and Persistence

For installed plugins, Constella should:

1. Validate `manifest.json`
2. Copy the plugin source into the local installed plugin store
3. Persist installation metadata separately
4. Register enabled plugins at runtime

Electron stores installed plugin data under user data:

- Installed plugin contents: `app.getPath('userData')/plugins/installed`
- Imported archives cache: `app.getPath('userData')/plugins/archives`

## 9. Recommended Product Direction

- End-user import UI should prioritize `.constella-plugin` and `.zip`
- Developer workflows may expose a separate "load plugin folder" entry
- The folder-loading workflow should be gated behind Developer Mode in Settings
- Built-in official plugins, user-installed plugins, and development plugins should remain clearly separated

## 10. Current Notes

- Marketplace delivery is still being prepared
- Signature verification, sandboxing, and trust policy are not finalized yet
- Development plugin records may be preserved even when Developer Mode is turned off
- When Developer Mode is off, development plugin loading UI should be hidden and development plugins should be skipped during runtime registration
- Some local development import details may evolve while the package-first UX is being completed
