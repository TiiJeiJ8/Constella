# 插件开发教程 — Constella 客户端

本文档面向想为本仓库（Constella 客户端）开发节点内容插件的工程师。涵盖插件模型、接口说明、示例插件、注册与加载、开发/调试流程、打包与发布建议等。

> 先决条件
- 熟悉 Vue 3（SFC、Composition API）
- 熟悉 TypeScript
- 项目根目录命令：`npm install`、`npm run dev`

目录
- 插件架构总览
- 插件接口与类型
- 创建第一个插件（示例）
- 注册与加载
- 编辑器（可选）
- 调试与热重载
- 打包与发布建议
- 常见问题与排查

---

## 插件架构总览

- 插件入口：`src/plugins/index.ts` — 定义了 `ContentKind`、`NodePlugin`、`pluginRegistry` 等核心类型与 API。
- 插件注册：`src/plugins/register.ts` — 在应用启动阶段统一注册内置插件，并设置回退插件。
- 启动位置：`src/main.ts` 中会在 `createApp` 之前调用 `registerPlugins()`，确保插件在运行时可用。
- 现有插件目录：`src/plugins/blank`、`src/plugins/text`、`src/plugins/markdown`、`src/plugins/image` 等，每个子目录包含 `index.ts`（导出 `NodePlugin`）与 `.vue` 渲染器组件。

了解这些文件将帮助你正确实现并注册自定义插件。

---

## 插件接口与类型

关键导出（见 `src/plugins/index.ts`）：

- `type ContentKind = 'blank' | 'text' | 'markdown' | 'image' | 'link-preview' | 'embed'` — 内容类型枚举（宿主使用该字段选择渲染器）。
- `interface PluginMeta` — 插件元信息，字段包括 `kind`, `label`, `icon`, `description`, `editable`, `supportsCardMode`。
- `interface RendererProps` — 渲染器组件接收的 props（`content`, `width`, `height`, `displayMode`, `scale`）。
- `interface EditorProps` — 编辑器组件接收的 props（`content`, `onUpdate`, `onClose`）。
- `interface NodePlugin` — 插件定义：包含 `meta: PluginMeta`, `renderer: Component<RendererProps>`, 可选 `editor: Component<EditorProps>`。
- `pluginRegistry`（单例） — 提供 `register()`, `setFallback()`, `get()`, `getRenderer()`, `getEditor()`, `getMeta()` 等方法用于管理插件。

实现插件时，请遵守以上接口。插件的渲染器与编辑器必须为 Vue 组件（SFC）。

---

## 创建第一个插件（完整示例）

以下演示如何在 `src/plugins/hello` 下创建一个最小可用插件 `HelloPlugin`，只实现渲染器。

1) 新建目录

在仓库根目录下创建：

- `src/plugins/hello/HelloRenderer.vue`
- `src/plugins/hello/index.ts`

2) `HelloRenderer.vue`（最小渲染器）

```vue
<template>
  <div class="hello-renderer">
    <div v-if="displayMode === 'card'" class="card">{{ content.data || 'Hello 插件（卡片）' }}</div>
    <div v-else>{{ content.data || 'Hello 插件' }}</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import type { RendererProps } from '@/plugins'

export default defineComponent({
  name: 'HelloRenderer',
  props: {
    content: { type: Object as () => RendererProps['content'], required: true },
    width: { type: Number, required: false },
    height: { type: Number, required: false },
    displayMode: { type: String as () => RendererProps['displayMode'], required: false },
    scale: { type: Number, required: false }
  },
  setup(props) {
    const content = computed(() => props.content)
    return { content, displayMode: props.displayMode }
  }
})
</script>

<style scoped>
.hello-renderer { padding: 6px; font-weight: 600; }
.card { border-radius: 6px; padding: 8px; background: #f6f8fa; }
</style>
```

3) `index.ts`（导出插件定义）

```ts
// src/plugins/hello/index.ts
import type { NodePlugin } from '../index'
import HelloRenderer from './HelloRenderer.vue'

export const helloPlugin: NodePlugin = {
  meta: {
    kind: 'embed', // 可复用已有 ContentKind，或选择合适已有类型
    label: 'Hello',
    icon: '👋',
    description: '示例 Hello 插件',
    editable: true,
    supportsCardMode: true
  },
  renderer: HelloRenderer
}

export default helloPlugin
```

注意：如果你选择使用一个并不存在于 `ContentKind` 的新 `kind`，需要同时更新 `src/plugins/index.ts` 的 `ContentKind` 类型定义（TypeScript 类型）。建议优先复用已有 kind。

4) 注册插件

将插件加入 `src/plugins/register.ts`：

```ts
import { helloPlugin } from './hello'
pluginRegistry.register(helloPlugin)
```

然后重启或让 Vite 热重载生效。此插件在节点 `content.kind === 'embed'` 时会被选中。你也可以在运行时通过 `pluginRegistry.register(helloPlugin)` 动态注册。

---

## 编辑器（可选）

若你的插件需要用户可交互的编辑界面，提供一个 `editor` 组件并把它加入 `NodePlugin`：

- 编辑器组件接收 `EditorProps`：`content: NodeContent`, `onUpdate: (data: string) => void`, `onClose: () => void`。
- 编辑器通常作为模态窗口或浮层实现，调用 `onUpdate` 将新数据回写宿主。

示例（框架）：

```ts
export const myPlugin: NodePlugin = {
  meta: { /* ... */ editable: true },
  renderer: MyRenderer,
  editor: MyEditor
}
```

宿主在需要打开编辑器时会调用 `pluginRegistry.getEditor(kind)` 获取组件并挂载。

---

## 调试与热重载

- 启动开发服：

```bash
npm install
npm run dev
```

- 修改 `.vue` / `index.ts` 文件通常会被 Vite 热重载（HMR）捕获并应用。
- 若插件注册代码变更但未生效，尝试重启开发服：`npm run dev`。
- 在浏览器控制台查找 `pluginRegistry` 打印的日志（`[PluginRegistry] Registered: ...` 或 `[Plugins] Registered:`）。

调试技巧：
- 在运行时打开浏览器控制台，输入 `window.__VUE_DEVTOOLS_GLOBAL_HOOK__` 或直接在应用代码里打印 `pluginRegistry.getRegisteredKinds()`。
- 使用 `pluginRegistry.getRenderer('your-kind')` 检查是否返回组件。

---

## 打包与发布建议

两种常见策略：

1. 将插件直接放入宿主仓库（最简单）
   - 把插件源码放在 `src/plugins` 并加入 `register.ts`。
   - 优点：零配置，适合闭源或私有扩展。

2. 作为独立 npm 包发布（进阶）
   - 将渲染器与 `NodePlugin` 导出为 ESM 包。
   - 在宿主中以依赖方式安装并在运行时调用 `pluginRegistry.register(...)` 注册（或在宿主插件注册表中引入）。
   - 注意设置 `peerDependencies`（尤其是 `vue@^3`），避免出现多 Vue 实例问题。

打包注意：
- 如果插件包含 `.vue` 文件，打包时需确保构建器能正确处理 SFC（例如使用 Vite + `@vitejs/plugin-vue`）。
- 遵循语义化版本控制，明确兼容的宿主最低版本与 Vue 版本。

---

## 常见问题与排查

- 插件不渲染：确认 `meta.kind` 与节点上 `content.kind` 完全一致；检查 `pluginRegistry.getRenderer(kind)` 是否返回组件。
- 注册无日志：确认 `registerPlugins()` 在 `src/main.ts` 的调用时机在 `createApp` 之前（本仓库已在 `main.ts` 调用）。
- 编辑器未打开：检查插件是否将 `editor` 字段导出且 `meta.editable === true`。
- 多个插件同 `kind` 冲突：保证 `meta.kind` 唯一，或在注册阶段根据优先级进行选择（当前实现以最后注册覆盖为准）。

---

## 附录：快速清单

- 创建插件：在 `src/plugins/<your-plugin>` 下新增 `.vue` 渲染器 + `index.ts` 导出 `NodePlugin`。
- 注册：把插件导入 `src/plugins/register.ts` 并调用 `pluginRegistry.register()`。
- 测试：运行 `npm run dev`，在应用中创建对应 `content.kind` 的节点并观察渲染。

---

## 附录：远程光标平滑移动实现

本项目实现了基于插帧的远程光标平滑移动效果，技术细节如下：

**实现位置**：
- 插帧管理器：[src/utils/cursorInterpolation.ts](src/utils/cursorInterpolation.ts)
- 集成位置：[src/components/canvas/CanvasStage.vue](src/components/canvas/CanvasStage.vue)

**核心技术**：
- **线性插值（LERP）**：使用 `current += (target - current) * speed` 实现平滑过渡
- **requestAnimationFrame**：利用浏览器 RAF 循环，确保 60fps 流畅动画
- **智能优化**：
  - 死区（1px）：小于死区直接跳转，避免微小抖动
  - 最大距离（500px）：超过则直接跳转，防止大延迟时的拖尾
  - 空闲检测：无变化超过 16ms（1帧）自动停止动画，节省性能
- **Map 数据结构**：用 `Map<clientId, position>` 管理多个光标，O(1) 查找

**性能特点**：
- 仅在有光标移动时运行 RAF 循环
- 无光标或全部静止时自动暂停动画
- 内存占用极低（每个光标仅约 100 字节）
- 支持同时平滑渲染数十个远程光标

**可调参数**（在 `CursorInterpolationManager` 类中）：
```typescript
INTERPOLATION_SPEED = 0.2  // 插值速度 (0-1)，越大越快跟随
DEAD_ZONE = 1              // 死区半径（像素）
MAX_DISTANCE = 500         // 最大距离（像素）
IDLE_THRESHOLD = 16        // 空闲阈值（毫秒）
```

**使用示例**：
```typescript
import { CursorInterpolationManager } from '@/utils/cursorInterpolation'

const manager = new CursorInterpolationManager()

// 设置更新回调
manager.onUpdate((positions) => {
  // positions: Map<clientId, {x, y}>
  // 在此更新 UI
})

// 更新光标目标位置
manager.updateCursor(clientId, { x: 100, y: 200 })

// 移除光标
manager.removeCursor(clientId)

// 销毁管理器
manager.destroy()
```


