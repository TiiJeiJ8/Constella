# Plugin Development Architecture 4.0

Version: 4.0  
Status: Active  
Scope: `web/src/plugins/**`, runtime install flow, Electron plugin persistence, plugin management UI

## 1. Architecture Goals

Plugin architecture 4.0 defines a unified model for:

- Built-in node plugins shipped with the app
- Installable runtime plugins imported from local folders or archives
- Shared i18n integration
- Runtime registration and refresh
- A plugin panel that acts as both manager and marketplace foundation

## 2. Plugin Types

Constella now has two plugin sources:

### 2.1 Built-in Plugins

Built-in plugins live in:

`web/src/plugins/<plugin-name>/`

They are bundled with the app and registered through local module discovery.

### 2.2 Installed Runtime Plugins

Installed plugins are imported at runtime from:

- A plugin folder
- A `manifest.json` inside a plugin folder
- A `.constella-plugin` archive
- A `.zip` archive

They are persisted into the local Electron user data directory and loaded dynamically.

## 3. Core Data Model

### 3.1 `PluginMeta`

`PluginMeta` describes node-level fallback metadata used by the host.

Key fields:

- `kind`
- `label`
- `icon`
- `description`
- `editable`
- `supportsCardMode`
- `supportsFontSizeControl`

`label` and `description` are fallback values. UI should prefer i18n keys such as:

- `canvas.nodeTypes.<kind>`
- `canvas.nodeTypeDesc.<kind>`

### 3.2 `NodePlugin`

A node plugin includes:

- `meta`
- `renderer`
- optional `editor`
- optional `onDblClick`

## 4. Built-in Plugin Structure

Recommended structure:

```text
src/plugins/my-plugin/
  manifest.ts
  index.ts
  MyRenderer.vue
  MyEditor.vue
```

### 4.1 `manifest.ts`

Defines fallback metadata.

### 4.2 `index.ts`

Exports:

- `pluginPlugin`
- optional `pluginI18n`

### 4.3 Renderer

Renderer receives host props such as:

- `content`
- `width`
- `height`
- `displayMode`
- `scale`

### 4.4 Editor

Editor is optional and should work with the host editor modal contract.

## 5. Runtime Installable Plugin Structure

Recommended plugin folder layout:

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

## 6. Registration Pipeline

### 6.1 Built-in Registration

Built-in plugins are auto-discovered from:

`web/src/plugins/**/index.ts`

The host registers:

- `pluginPlugin`
- optional `pluginI18n`

### 6.2 Installed Plugin Registration

Installed plugins are loaded from the local installed plugin store.

The runtime loader:

1. Reads installation records
2. Loads `manifest.json`
3. Merges plugin i18n bundles
4. Imports renderer/editor runtime modules from local file paths
5. Registers node kinds unless the kind is already occupied

## 7. Runtime Refresh Model

Plugin operations should not force a full app reload.

Current expected behavior:

- Install plugin -> refresh installed catalog -> reload plugin registry at runtime
- Enable/disable plugin -> refresh runtime registry only
- Remove plugin -> refresh runtime registry only

The host exposes a reactive plugin catalog version so dependent UI can update.

## 8. i18n Strategy

### 8.1 Built-in Plugins

Built-in plugins should define `pluginI18n` in `index.ts`.

Important keys:

- `canvas.nodeTypes.<kind>`
- `canvas.nodeTypeDesc.<kind>`
- plugin-specific editor/renderer namespaces when needed

### 8.2 Installed Plugins

Runtime plugins may declare locale bundle file paths inside `manifest.json`.

Those locale messages are merged into host i18n during runtime registration.

## 9. Plugin Management UI

The plugin panel now has three responsibilities:

- Show built-in nodes
- Show installed runtime plugins
- Provide import/install entry points and future marketplace space

Current import UI:

- Drag-and-drop import zone
- Click-to-open native picker fallback

Supported import content:

- Plugin folder
- `manifest.json`
- `.zip`
- `.constella-plugin`

## 10. Persistence Model

Installed plugin data is stored under Electron user data:

- Installed plugins: `app.getPath('userData')/plugins/installed`
- Imported archives cache: `app.getPath('userData')/plugins/archives`

This is why installed plugins remain available after closing and reopening the app.

## 11. Developer Guidance

### 11.1 For Built-in Nodes

Use built-in plugins when:

- The node is part of the official product
- It should ship with every build
- It belongs in the default node catalog

### 11.2 For External Plugins

Use runtime installable plugins when:

- The feature should be optional
- The node should be distributable independently
- Future plugin marketplace compatibility is desired

### 11.3 Recommended Delivery

- Development: import plugin folder
- Distribution: provide `.constella-plugin`
- `manifest.json`: keep as internal entry file, not as the main user-facing distribution format

## 12. 4.0 Checklist

When creating a new plugin, confirm:

- Unique `kind`
- Valid fallback `manifest`
- Renderer module works in runtime loader
- Editor module is optional but compatible if provided
- i18n keys are supplied
- Import works from folder during development
- Archive packaging works for distribution
- Install, enable, disable, and uninstall refresh the runtime without full app reload
