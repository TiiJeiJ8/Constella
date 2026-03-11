## 插件开发架构指南（3.0）

> 版本：3.0  
> 发布日期：2026年3月  
> 适用范围：`web/src/plugins/**`

### 概览

3.0 架构的目标是：新增插件时，仅在 `src/plugins/<your-plugin>/` 目录内完成开发，不改核心注册流程。

你只需要提供：

- `manifest.ts`：插件元信息（含 fallback）
- `index.ts`：导出 `pluginPlugin`（必需）
- `Renderer.vue`：节点渲染器（必需）
- `Editor.vue`：自定义编辑器（可选）
- `pluginI18n`：插件内多语言（强烈推荐）

---

## 一、目录结构

```text
src/plugins/my-plugin/
├── manifest.ts
├── index.ts
├── MyRenderer.vue
└── MyEditor.vue      # 可选
```

---

## 二、manifest.ts（fallback 元数据）

```ts
// src/plugins/my-plugin/manifest.ts
import type { PluginMeta } from '../index'

export const manifest: PluginMeta = {
    kind: 'my-plugin',
    label: 'My Plugin',         // fallback 显示名
    icon: '🎯',
    description: 'My plugin node', // fallback 描述
    editable: true,
    supportsCardMode: true
}
```

说明：

- `kind` 必须唯一。
- `label/description` 在 3.0 中是 fallback 值；优先显示 i18n 文案。
- `supportsCardMode = true` 时，属性面板会出现显示模式切换。

---

## 三、Renderer 组件

```vue
<template>
    <div class="my-plugin-renderer">
        <div v-if="displayMode === 'card'">{{ content.data || 'Card' }}</div>
        <div v-else>{{ content.data || 'Full' }}</div>
    </div>
</template>

<script setup lang="ts">
import type { RendererProps } from '@/plugins'

defineProps<RendererProps>()
</script>
```

`RendererProps` 关键字段：

- `content`: 节点内容
- `width/height`: 当前节点尺寸
- `displayMode`: `'full' | 'card'`
- `scale`: 画布缩放比例

---

## 四、index.ts（核心入口）

```ts
// src/plugins/my-plugin/index.ts
import type { NodePlugin, PluginI18nMessages } from '../index'
import MyRenderer from './MyRenderer.vue'
import MyEditor from './MyEditor.vue'
import { manifest } from './manifest'

export const pluginI18n: PluginI18nMessages = {
    'zh-CN': {
        canvas: {
            nodeTypes: { 'my-plugin': '我的插件' },
            nodeTypeDesc: { 'my-plugin': '我的插件节点' }
        },
        plugins: {
            myPlugin: {
                editor: {
                    title: '我的插件编辑器',
                    save: '保存',
                    cancel: '取消'
                },
                renderer: {
                    emptyHint: '暂无内容'
                }
            }
        }
    },
    'en-US': {
        canvas: {
            nodeTypes: { 'my-plugin': 'My Plugin' },
            nodeTypeDesc: { 'my-plugin': 'My plugin node' }
        },
        plugins: {
            myPlugin: {
                editor: {
                    title: 'My Plugin Editor',
                    save: 'Save',
                    cancel: 'Cancel'
                },
                renderer: {
                    emptyHint: 'No content yet'
                }
            }
        }
    }
}

export const pluginPlugin: NodePlugin = {
    meta: manifest,
    renderer: MyRenderer,
    editor: MyEditor,
    onDblClick: (content) => {
        // 可选：返回 true 表示双击已处理，框架不再打开编辑器
        return false
    }
}

// 可选兼容导出
export const myPlugin = pluginPlugin
```

关键点：

- 必须导出：`pluginPlugin`
- 推荐导出：`pluginI18n`
- 可选导出：`onDblClick`

---

## 五、自定义编辑器协议（运行时）

当插件提供 `editor` 时，画布会动态挂载该组件，并传入：

- props:
  - `node-id`
  - `content`
- emits:
  - `update(nodeId, contentPatch)`
  - `close()`

示例：

```vue
<template>
    <div class="my-editor">
        <textarea v-model="draft" />
        <button @click="save">Save</button>
        <button @click="$emit('close')">Cancel</button>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { NodeContent } from '@/plugins'

const props = defineProps<{
    nodeId: string
    content: NodeContent
}>()

const emit = defineEmits<{
    (e: 'update', nodeId: string, contentPatch: NodeContent): void
    (e: 'close'): void
}>()

const draft = ref(props.content?.data || '')

function save() {
    emit('update', props.nodeId, {
        ...props.content,
        data: draft.value
    })
}
</script>
```

---

## 六、自动发现与注册机制

插件注册器会自动扫描 `src/plugins/**/index.ts`：

```ts
const pluginModules = import.meta.glob('./**/index.ts', { eager: true })
for (const module of Object.values(pluginModules)) {
    if (module.pluginPlugin) {
        registerPluginI18n(module.pluginI18n)
        pluginRegistry.register(module.pluginPlugin)
    }
}
```

行为说明：

- 自动注册 `pluginPlugin`
- 自动合并 `pluginI18n` 到全局 i18n
- 自动设置 `blank` 为 fallback 插件
- 注册过程带幂等保护，可重复调用

---

## 七、UI 接入规则

### 1) 右侧属性面板

- 节点类型按钮来自 `getPluginsMeta()`。
- 标题/描述显示逻辑：
  - 优先 `canvas.nodeTypes.<kind>` / `canvas.nodeTypeDesc.<kind>`
  - 缺失时回退到 `manifest.label/description`

### 2) 双击行为

默认流程：

1. 如果 `onDblClick` 返回 `true`，停止后续流程。
2. 否则若存在 `editor`，打开插件自定义编辑器。
3. 否则打开通用 `NodeEditorModal`。

---

## 八、推荐 i18n 命名规范

- 节点公共名称：`canvas.nodeTypes.<kind>`
- 节点公共描述：`canvas.nodeTypeDesc.<kind>`
- 插件私有文案：`plugins.<camelCaseKind>.*`

例如 `kind = my-plugin`，推荐命名空间 `plugins.myPlugin`。

---

## 九、常见问题

### 插件没有被发现

- 确认路径是 `src/plugins/<name>/index.ts`
- 确认导出了 `pluginPlugin`

### 侧栏显示 fallback 而不是翻译

- 检查 `pluginI18n` 是否包含：
  - `canvas.nodeTypes.<kind>`
  - `canvas.nodeTypeDesc.<kind>`

### 双击没有打开编辑器

- 检查 `meta.editable` 是否为 `true`
- 检查 `onDblClick` 是否总是返回 `true`

### 保存后节点内容没有更新

- 确认编辑器 emit 的是 `update(nodeId, contentPatch)`
- `contentPatch` 建议从 `props.content` 展开后修改，避免丢字段

---

## 十、开发完成检查清单

- 已创建 `manifest.ts/index.ts/Renderer.vue`
- `index.ts` 已导出 `pluginPlugin`
- `kind` 全局唯一
- 需要多语言时已导出 `pluginI18n`
- 若有编辑器，已实现 `update/close` 协议
- `editable/supportsCardMode` 配置正确
- 本地重启后控制台可看到插件已注册
