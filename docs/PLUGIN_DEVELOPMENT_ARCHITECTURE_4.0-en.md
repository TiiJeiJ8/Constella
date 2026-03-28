# Plugin Development Architecture 4.0

Version: 4.0  
Status: Active  
Scope: `web/src/plugins/**`, runtime install flow, Electron persistence, plugin management UI, future marketplace compatibility

## 1. Goals

Plugin architecture 4.0 defines a clean separation between:

- Official built-in node plugins
- User-installed runtime plugins
- Development-only local plugins

It also standardizes:

- `manifest.json` as plugin root metadata
- Runtime registration and refresh behavior
- i18n integration
- Electron-side persistence
- A package-first direction for future marketplace delivery

## 2. Plugin Layers

Constella should treat plugin sources as three distinct layers.

### 2.1 Built-in official plugins

Location:

`web/src/plugins/<plugin-name>/`

Characteristics:

- Bundled with the app
- Part of the official node catalog
- Versioned with the repository
- Available by default in every build

### 2.2 User-installed plugins

Source:

- `.constella-plugin`
- `.zip`

Characteristics:

- Installed by end users
- Persisted under Electron user data
- Optional and removable
- Intended to align with future plugin marketplace delivery

### 2.3 Development plugins

Source:

- Local plugin folder containing `manifest.json`

Recommended location:

- `dev-plugins/` at repository root, or another clearly separate development-only directory

Characteristics:

- For local iteration and debugging
- Not part of built-in official plugins
- Not the same as user-installed packages
- Should not be mixed into release assets by accident
- Should only be exposed in product UI when Developer Mode is enabled

## 3. Why These Layers Must Stay Separate

These layers solve different problems:

- Built-in plugins belong to the product itself
- User-installed plugins belong to the user's local environment
- Development plugins belong to the developer workflow

If they are mixed together, common risks appear:

- Temporary development plugins accidentally ship in production
- Built-in and external ownership boundaries become unclear
- Runtime install and source-controlled plugin flows become hard to reason about
- Marketplace and local development concepts get conflated

## 4. Core Data Model

### 4.1 `PluginMeta`

`PluginMeta` describes node-level fallback metadata used by the host UI.

Key fields:

- `kind`
- `label`
- `icon`
- `description`
- `editable`
- `supportsCardMode`
- `supportsFontSizeControl`

UI should prefer i18n keys over fallback text when available:

- `canvas.nodeTypes.<kind>`
- `canvas.nodeTypeDesc.<kind>`

### 4.2 `NodePlugin`

A built-in node plugin includes:

- `meta`
- `renderer`
- optional `editor`
- optional `onDblClick`

### 4.3 Runtime package manifest

Runtime installable plugins use `manifest.json` as the plugin root contract.

Important rule:

- `manifest.json` is an internal plugin entry file, not a standalone user-facing package

## 5. Built-in Plugin Structure

Recommended structure:

```text
src/plugins/my-plugin/
  manifest.ts
  index.ts
  MyRenderer.vue
  MyEditor.vue
```

### 5.1 `manifest.ts`

Defines fallback metadata for host-side registration.

### 5.2 `index.ts`

Exports:

- `pluginPlugin`
- optional `pluginI18n`

## 6. Runtime Plugin Structure

Recommended plugin root layout:

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

Recommended package formats:

- `.constella-plugin` as the primary release artifact
- `.zip` as a compatibility format

## 7. Registration Pipeline

### 7.1 Built-in registration

Built-in plugins are discovered from:

`web/src/plugins/**/index.ts`

The host registers:

- `pluginPlugin`
- optional `pluginI18n`

### 7.2 Development plugin registration

Development plugins should be loaded from a dedicated development directory or a dedicated "load plugin folder" workflow.

They should not be treated as built-in plugins, and they should not be persisted as end-user installs unless explicitly packaged and installed.

Developer Mode policy:

- When Developer Mode is on, development plugin loading and listing may be shown in the plugin panel
- When Developer Mode is off, development plugin UI should be hidden
- When Developer Mode is off, stored development plugin records may remain, but they should be skipped during runtime registration

### 7.3 User-installed plugin registration

Installed plugins are loaded from the local installed plugin store.

The runtime loader should:

1. Read installation records
2. Load `manifest.json`
3. Merge plugin i18n bundles
4. Import runtime renderer and editor modules from local file paths
5. Register node kinds after conflict checks

## 8. Conflict Policy

Recommended rule:

- Built-in official plugins must not be overridden by development or installed plugins using the same node `kind`

If a conflict occurs:

- Reject registration and surface a clear error

This keeps official node behavior stable and prevents accidental shadowing.

## 9. Runtime Refresh Model

Plugin operations should update runtime state without requiring a full app reload.

Expected behavior:

- Install plugin -> refresh installed catalog -> reload runtime plugin registry
- Enable/disable plugin -> refresh runtime plugin registry
- Remove plugin -> refresh runtime plugin registry

The host should expose a reactive plugin catalog version so dependent UI updates automatically.

## 10. i18n Strategy

### 10.1 Built-in plugins

Built-in plugins should define `pluginI18n` in `index.ts`.

Important keys:

- `canvas.nodeTypes.<kind>`
- `canvas.nodeTypeDesc.<kind>`

### 10.2 Runtime plugins

Runtime plugins may declare locale bundle paths inside `manifest.json`.

Those locale messages are merged into host i18n during runtime registration.

## 11. Plugin Management UI

The plugin panel has three responsibilities:

- Show built-in official nodes
- Show installed runtime plugins
- Reserve space for future marketplace UI

Recommended product direction:

- Main user-facing install entry: import `.constella-plugin` / `.zip`
- Secondary developer-facing entry: load plugin folder in development mode
- Product-facing plugin management may appear in both Settings and the room dock plugin panel

This keeps end-user experience package-first while preserving a fast local development workflow.

## 12. Persistence Model

Installed plugin data is stored under Electron user data:

- Installed plugins: `app.getPath('userData')/plugins/installed`
- Imported archives cache: `app.getPath('userData')/plugins/archives`

This is why installed plugins remain available after closing and reopening the app.

Development plugin records may also be persisted locally, but they remain logically separate from installed user plugins.

## 13. Recommended Directory Strategy

Use:

- `web/src/plugins/` for official built-in plugins
- `app.getPath('userData')/plugins/installed` for end-user installed plugins
- `dev-plugins/` or an equivalent isolated directory for development plugins

Avoid:

- Mixing experimental local plugin folders into built-in plugin directories
- Treating `manifest.json` as a standalone install artifact
- Using built-in plugin directories as a substitute for user installation storage

## 14. Developer Guidance

Use built-in plugins when:

- The node is official
- It should ship with every build
- It belongs in the default node catalog

Use user-installed plugins when:

- The feature is optional
- The node should be shared independently
- Marketplace compatibility is desired

Use development plugins when:

- You are iterating locally
- You do not want temporary work mixed into official source plugins
- You want to test packaging before release

## 15. 4.0 Checklist

When creating or integrating a plugin, confirm:

- Unique plugin `id`
- Unique node `kind`
- Valid fallback metadata
- Valid `manifest.json`
- Runtime renderer works
- Optional editor works when present
- i18n resources are supplied when needed
- Development folder loading works in dev workflows
- Development folder loading is hidden when Developer Mode is off
- Archive packaging works for end-user distribution
- Install, enable, disable, and uninstall can refresh runtime state cleanly
