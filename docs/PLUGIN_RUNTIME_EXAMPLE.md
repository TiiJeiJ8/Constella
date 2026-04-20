# Plugin Runtime Example

This document shows a minimal runtime plugin example that matches the current 4.0 plugin architecture.

Use this example when:

- You want to prototype a custom node outside built-in official plugins
- You want to test a plugin before packaging it as `.constella-plugin`
- You want a reference for `manifest.json`, renderer export, and optional i18n

## 1. Example Plugin Root

```text
example-notice-plugin/
  manifest.json
  dist/
    renderer.js
  i18n/
    zh-CN.json
    en-US.json
  assets/
    icon.png
```

## 2. `manifest.json`

```json
{
  "id": "com.example.notice-card",
  "name": "Notice Card",
  "version": "1.0.0",
  "description": "A simple notice-style card node",
  "author": "Example Studio",
  "engine": {
    "constella": "^1.2.97"
  },
  "nodes": [
    {
      "kind": "notice-card",
      "label": "Notice Card",
      "description": "Display a highlighted title and message",
      "icon": "assets/icon.png",
      "renderer": "dist/renderer.js",
      "editable": true,
      "supportsCardMode": true,
      "supportsFontSizeControl": true
    }
  ],
  "i18n": {
    "zh-CN": "i18n/zh-CN.json",
    "en-US": "i18n/en-US.json"
  },
  "permissions": []
}
```

## 3. `dist/renderer.js`

```js
const { h } = window.__CONSTELLA_PLUGIN_API__.vue

export default {
  name: 'NoticeCardRenderer',
  props: {
    content: {
      type: String,
      default: ''
    }
  },
  render() {
    return h(
      'div',
      {
        style: {
          padding: '16px 18px',
          borderRadius: '16px',
          background: 'linear-gradient(180deg, rgba(251,191,36,0.18), rgba(245,158,11,0.08))',
          border: '1px solid rgba(245,158,11,0.26)',
          color: '#78350f',
          lineHeight: '1.7',
          whiteSpace: 'pre-wrap',
          fontWeight: '600'
        }
      },
      this.content || 'Important notice'
    )
  }
}
```

## 4. `i18n/zh-CN.json`

```json
{
  "canvas.nodeTypes.notice-card": "通知卡片",
  "canvas.nodeTypeDesc.notice-card": "用于展示标题与提示内容的节点"
}
```

## 5. `i18n/en-US.json`

```json
{
  "canvas.nodeTypes.notice-card": "Notice Card",
  "canvas.nodeTypeDesc.notice-card": "A node for displaying highlighted notice content"
}
```

## 6. How to Use This Example

Recommended development flow:

1. Keep the plugin as a local folder while iterating
2. Verify that `manifest.json` paths are correct
3. Load it through a development plugin workflow
4. Package it as `.constella-plugin` for end-user distribution

In the current product direction:

- End users should install packaged plugins from the standard import entry
- Folder-based loading should be reserved for developer workflows
- Folder-based loading may be hidden unless Developer Mode is enabled

## 7. Important Notes

- `manifest.json` is part of the plugin folder and should not be distributed alone
- Built-in official plugins should stay in `src/plugins/`
- Runtime example plugins should stay outside built-in plugin directories during development
- End-user installation should prefer `.constella-plugin`, with `.zip` as a compatibility format
