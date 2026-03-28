# Plugin Package Format

Constella currently supports two plugin delivery modes:

- Development import: import a complete plugin folder
- Distribution package: import a `.constella-plugin` or `.zip` archive

`manifest.json` is the entry file of a plugin directory. It is not a standalone plugin by itself. When you import `manifest.json`, Constella treats the whole directory containing that file as the plugin source.

## Recommended Delivery Strategy

- For local development and testing, use a plugin folder
- For sharing and release, use a `.constella-plugin` archive
- Treat `.zip` as a compatibility format during early-stage tooling

## Supported Import Sources

The Electron desktop app can currently install plugins from:

- A plugin folder
- A `manifest.json` file inside a plugin folder
- A `.constella-plugin` archive
- A `.zip` archive

The plugin panel uses a drag-and-drop import area and also allows clicking the drop zone to open the native picker.

## Plugin Folder Layout

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

## `manifest.json`

```json
{
  "id": "com.example.todo",
  "name": "Todo Plugin",
  "version": "1.0.0",
  "description": "Checklist node plugin",
  "author": "Example Studio",
  "homepage": "https://example.com",
  "engine": {
    "constella": "^1.0.0"
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

## Field Notes

- `id`: stable plugin identifier
- `name`: display name for installed plugin management
- `version`: plugin version
- `nodes`: one plugin package can provide one or more node kinds
- `renderer`: required runtime renderer module path
- `editor`: optional runtime editor module path
- `i18n`: optional locale bundles merged into host i18n at runtime

## Runtime Module Rules

- `renderer.js` must export a Vue component as `default`
- `editor.js` should also export a Vue component as `default` when present
- Named exports such as `renderer`, `RendererComponent`, `editor`, and `EditorComponent` are also accepted
- Runtime plugin modules must not bundle or import Vue with bare module specifiers such as `import { h } from 'vue'`
- Use the host API instead:

```js
const { h, ref, computed } = window.__CONSTELLA_PLUGIN_API__.vue
```

## Installation Behavior

After installation, Constella:

1. Validates `manifest.json`
2. Copies the full plugin source into the local installed plugin store
3. Persists installation metadata separately
4. Loads enabled plugins at runtime without requiring a full app reload

## Local Persistence

Installed plugin data is stored in Electron user data:

- Installed plugin contents: `app.getPath('userData')/plugins/installed`
- Imported archives cache: `app.getPath('userData')/plugins/archives`

## Current Scope

- Plugin marketplace UI is being prepared, but online install is not implemented yet
- Current install flow is local-only
- Plugin signature, sandboxing, and trust policy are not finalized yet
