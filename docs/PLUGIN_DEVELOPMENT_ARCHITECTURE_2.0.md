## 新插件架构指南（即插即用）

> 版本：2.0（自动发现架构）  
> 发布日期：2026年3月

### 架构改进概览

新架构采用**自动发现 + 动态型系统**，使插件开发者无需修改核心注册文件即可安装新插件。

**主要改进：**
- ✅ **即插即用**：将插件放入 `plugins` 文件夹 → 自动被发现和注册
- ✅ **无需修改核心**：不再需要修改 `register.ts` 或 `index.ts`
- ✅ **支持动态类型**：`ContentKind` 已改为 `string`，支持无限自定义类型
- ✅ **单一导出接口**：所有插件导出 `pluginPlugin` 对象

---

## 快速开始：5分钟创建新插件

### 第1步：创建插件目录结构

在 `src/plugins/` 下创建新文件夹，例如 `src/plugins/my-plugin/`，包含以下文件：

```
src/plugins/my-plugin/
├── manifest.ts              # 插件元数据（必须）
├── index.ts                 # 插件导出（必须）
├── MyRenderer.vue           # 渲染器组件（必须）
└── MyEditor.vue             # 编辑器组件（可选）
```

### 第2步：创建 manifest.ts

定义插件的元数据：

```typescript
// src/plugins/my-plugin/manifest.ts
import type { PluginMeta } from '../index'

export const manifest: PluginMeta = {
    kind: 'my-plugin',           // 唯一标识，自定义字符串 ✨
    label: '我的插件',
    icon: '🎯',
    description: '我的第一个插件',
    editable: true,              // 是否可编辑
    supportsCardMode: true       // 是否支持卡片模式
}
```

### 第3步：创建渲染器 (MyRenderer.vue)

```vue
<template>
    <div class="my-plugin-renderer">
        <span v-if="displayMode === 'card'" class="card-mode">
            {{ content.data || '卡片内容' }}
        </span>
        <div v-else class="full-mode">
            {{ content.data || '完整内容' }}
        </div>
    </div>
</template>

<script setup lang="ts">
import type { RendererProps } from '@/plugins'

defineProps<RendererProps>()
</script>

<style scoped>
.my-plugin-renderer {
    padding: 12px;
    border-radius: 4px;
    background: #f5f5f5;
}

.card-mode {
    display: inline-block;
    padding: 4px 8px;
    background: #fff;
    border-left: 3px solid #409eff;
}

.full-mode {
    word-break: break-word;
}
</style>
```

### 第4步：创建 index.ts（核心）

```typescript
// src/plugins/my-plugin/index.ts
import type { NodePlugin } from '../index'
import MyRenderer from './MyRenderer.vue'
import { manifest } from './manifest'

// ✨ 必须导出这个名称
export const pluginPlugin: NodePlugin = {
    meta: manifest,
    renderer: MyRenderer
    // editor: MyEditor  // 如果需要编辑功能，添加此属性
}

// 向后兼容导出（可选）
export const myPlugin = pluginPlugin
```

### ✨ 完成！

现在只需重启开发服务器（`npm run dev`），插件就会被自动发现和注册。

打开浏览器控制台查看：
```
[Plugins] Auto-registered: ['my-plugin', 'text', 'markdown', ...]
```

---

## 可选：添加编辑器

如果需要编辑功能，创建 `MyEditor.vue`：

```vue
<template>
    <div class="my-plugin-editor">
        <textarea v-model="data" placeholder="编辑内容..."></textarea>
        <button @click="save">保存</button>
        <button @click="cancel">取消</button>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { EditorProps } from '@/plugins'

defineProps<EditorProps>()

const emit = defineEmits<{
    update: [data: string]
    close: []
}>()

const data = ref('')

function save() {
    defineProps.onUpdate(data.value)
}

function cancel() {
    defineProps.onClose()
}
</script>
```

然后在 `index.ts` 中：

```typescript
import MyEditor from './MyEditor.vue'

export const pluginPlugin: NodePlugin = {
    meta: { ...manifest, editable: true },
    renderer: MyRenderer,
    editor: MyEditor  // ← 添加这行
}
```

---

## 常见使用案例

### 案例1：自定义数据可视化

```typescript
export const manifest: PluginMeta = {
    kind: 'chart',
    label: '图表',
    icon: '📊',
    description: '数据图表展示',
    editable: false,
    supportsCardMode: false
}
```

### 案例2：代码块（支持编辑）

```typescript
export const manifest: PluginMeta = {
    kind: 'code-block',
    label: '代码',
    icon: '💻',
    description: '代码片段',
    editable: true,
    supportsCardMode: true
}
```

### 案例3：外部服务集成

```typescript
export const manifest: PluginMeta = {
    kind: 'api-response',
    label: 'API响应',
    icon: '🔌',
    description: '自动获取API数据',
    editable: true,
    supportsCardMode: false
}
```

---

## 故障排查

| 问题 | 原因 | 解决方案 |
|-----|------|--------|
| 插件没有被发现 | 导出名称不是 `pluginPlugin` | 检查 `index.ts` 中的导出名称 |
| 类型错误 | 忘记导入 `PluginMeta` 类型 | `import type { PluginMeta } from '../index'` |
| 编辑器不显示 | `meta.editable` 为 false | 设置 `editable: true` |
| 渲染器样式冲突 | 样式未作用域化 | 添加 `<style scoped>` |

---

## 启用开发日志

在浏览器控制台查看详细的插件加载日志：

```javascript
// 在浏览器控制台运行
localStorage.setItem('DEBUG_PLUGINS', '1')
// 刷新页面
```

查看所有已注册插件：

```javascript
// 在应用中运行
import { pluginRegistry } from '@/plugins'
console.log(pluginRegistry.getAllMeta())
```

---

## 技术细节

### 自动发现工作原理

```typescript
// src/plugins/register.ts
export async function registerPlugins() {
    // 1. 使用 import.meta.glob 获取所有 */index.ts 文件
    const pluginModules = import.meta.glob<any>('./**/index.ts', { eager: true })
    
    // 2. 查找导出的 pluginPlugin
    for (const [path, module] of Object.entries(pluginModules)) {
        if (module.pluginPlugin) {
            pluginRegistry.register(module.pluginPlugin)  // ← 自动注册
        }
    }
}
```

### 动态类型系统

```typescript
// 旧：类型固定
export type ContentKind = 'text' | 'image' | 'markdown'  // ❌

// 新：类型开放 ✅
export type ContentKind = string  // 完全支持自定义
```

---

## 与旧版本的兼容性

旧版本中的插件仍然有效，因为：

```typescript
// text/index.ts 旧代码仍然工作
export const textPlugin = pluginPlugin
export const pluginPlugin = { ... }  // ← 新增导出
```

旧导出（`textPlugin`, `blankPlugin` 等）仍然可用，但自动注册只使用 `pluginPlugin`。

---

## 下一步

- 📖 学习 [Vue 3 SFC 文档](https://vuejs.org/)
- 🚀 参考现有插件：`text/`, `markdown/`, `image/`
- 💡 在 GitHub Discussions 分享你的插件
- 📦 考虑发布为 npm 包供社区使用

