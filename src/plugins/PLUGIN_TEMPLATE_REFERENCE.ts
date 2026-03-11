/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║                                                                      ║
 * ║  NEW PLUGIN TEMPLATE FOR CONSTELLA 2.0                              ║
 * ║  (自动发现架构 - 模板文件)                                            ║
 * ║                                                                      ║
 * ║  使用说明：                                                           ║
 * ║  1. 复制此文件夹到 src/plugins/                                      ║
 * ║  2. 修改 manifest.ts 中的 kind、label、description 等               ║
 * ║  3. 在 index.ts 中可选导出 pluginI18n，自带多语言文案                ║
 * ║  4. 实现 TemplateRenderer.vue                                        ║
 * ║  5. 重启开发服务器，插件自动注册！                                   ║
 * ║                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

// ============================================================================
// 文件1: manifest.ts
// ============================================================================

/* 
export const manifest = {
    kind: 'template',                    // 唯一标识 - 修改为你的插件类型
    label: '模板',                        // UI 显示名称
    icon: '📦',                          // 图标表情符号
    description: '这是一个模板插件',      // 描述
    editable: true,                      // 是否支持编辑
    supportsCardMode: true               // 是否支持卡片模式
}
*/

// ============================================================================
// 文件2: index.ts - 必须保持这个名称！
// ============================================================================

/*
import type { NodePlugin } from '../index'
import TemplateRenderer from './TemplateRenderer.vue'
import { manifest } from './manifest'

export const pluginI18n = {
  'zh-CN': {
    canvas: {
      nodeTypes: {
        template: '模板'
      },
      nodeTypeDesc: {
        template: '模板节点'
      }
    },
    plugins: {
      template: {
        title: '模板插件'
      }
    }
  },
  'en-US': {
    canvas: {
      nodeTypes: {
        template: 'Template'
      },
      nodeTypeDesc: {
        template: 'Template node'
      }
    },
    plugins: {
      template: {
        title: 'Template plugin'
      }
    }
  }
}

// ✨ 必须导出这个确切名称 - 自动发现系统会寻找它
export const pluginPlugin: NodePlugin = {
    meta: manifest,
    renderer: TemplateRenderer
    // editor: TemplateEditor  // 可选：如果需要编辑功能
}

// 可选：向后兼容导出
// export const templatePlugin = pluginPlugin
*/

// ============================================================================
// 文件3: TemplateRenderer.vue - 渲染器组件
// ============================================================================

/*
<template>
  <div class="template-renderer">
    <!-- 卡片模式 -->
    <div v-if="displayMode === 'card'" class="card-container">
      <div class="card-header">{{ meta?.label || 'Plugin' }}</div>
      <div class="card-content">
        {{ content.data || 'No content' }}
      </div>
    </div>

    <!-- 完整模式 -->
    <div v-else class="full-container">
      <div class="content-preview">
        {{ content.data || 'Empty node' }}
      </div>
      <div class="metadata" v-if="content.metadata">
        {{ content.metadata }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RendererProps, PluginMeta } from '@/plugins'
import { pluginRegistry } from '@/plugins'

const props = defineProps<RendererProps>()

// 获取插件元数据
const meta = computed(() => {
  return pluginRegistry.getMeta(props.content.kind)
})
</script>

<style scoped>
.template-renderer {
  user-select: none;
}

.card-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f7fa;
}

.card-header {
  background: #409eff;
  color: white;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
}

.card-content {
  padding: 12px;
  font-size: 13px;
  line-height: 1.5;
  color: #606266;
  word-break: break-word;
  max-height: 200px;
  overflow: auto;
}

.full-container {
  padding: 16px;
}

.content-preview {
  font-size: 14px;
  line-height: 1.6;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-word;
}

.metadata {
  margin-top: 12px;
  padding: 8px;
  background: #f0f9ff;
  border-left: 3px solid #409eff;
  font-size: 12px;
  color: #606266;
}
</style>
*/

// ============================================================================
// 文件4 (可选): TemplateEditor.vue - 编辑器组件
// ============================================================================

/*
<template>
  <div class="template-editor">
    <div class="editor-header">
      <h3>编辑内容</h3>
      <button class="close-btn" @click="onClose">×</button>
    </div>
    
    <textarea 
      v-model="editData"
      class="editor-input"
      placeholder="输入内容..."
    />
    
    <div class="editor-footer">
      <button class="btn btn-primary" @click="save">保存</button>
      <button class="btn btn-secondary" @click="cancel">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { EditorProps } from '@/plugins'

const props = defineProps<EditorProps>()

const editData = ref(props.content.data || '')

function save() {
  props.onUpdate(editData.value)
}

function cancel() {
  props.onClose()
}
</script>

<style scoped>
.template-editor {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  min-width: 500px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #ebeef5;
}

.editor-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #909399;
  cursor: pointer;
}

.close-btn:hover {
  color: #606266;
}

.editor-input {
  width: 100%;
  min-height: 300px;
  padding: 12px 16px;
  border: none;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
}

.editor-input:focus {
  outline: none;
}

.editor-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #ebeef5;
  background: #f5f7fa;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-primary {
  background: #409eff;
  color: white;
}

.btn-primary:hover {
  background: #66b1ff;
}

.btn-secondary {
  background: white;
  color: #606266;
  border: 1px solid #dcdfe6;
}

.btn-secondary:hover {
  color: #303133;
  border-color: #b4bccc;
}
</style>
*/

// ============================================================================
// 快速检查清单
// ============================================================================

/*
NEW PLUGIN CHECKLIST:

☐ 创建 src/plugins/my-plugin/ 文件夹
☐ 创建 manifest.ts
  ☐ 设置唯一的 kind
  ☐ 设置 label（UI显示名）
  ☐ 选择合适的 icon
  ☐ 编写 description
  ☐ 设置 editable 和 supportsCardMode

☐ 创建 index.ts
  ☐ 导入 manifest
  ☐ 导入 RendererComponent
  ☐ 导出 pluginPlugin 对象（必须是这个名称！）
  ☐ 如需编辑功能，导入 EditorComponent

☐ 创建 MyRenderer.vue
  ☐ 接收 RendererProps（content, width, height 等）
  ☐ 处理 displayMode（'card' 或 'full'）
  ☐ 处理空内容情况

☐ 创建 MyEditor.vue（可选）
  ☐ 接收 EditorProps（content, onUpdate, onClose）
  ☐ 实现编辑界面
  ☐ 调用 onUpdate() 保存数据
  ☐ 调用 onClose() 关闭编辑器

☐ 重启开发服务器
☐ 在浏览器控制台查看注册日志
  console.log(pluginRegistry.getRegisteredKinds())
☐ 创建新节点测试插件

SUCCESS: 如果看到日志输出你的 kind，说明注册成功！
*/

// ============================================================================
// 常用 Props 接口参考
// ============================================================================

/*
// RendererProps - 渲染器接收的数据
interface RendererProps {
  content: NodeContent      // 节点内容 { kind, data, displayMode, metadata }
  width: number            // 节点宽度（像素）
  height: number           // 节点高度（像素）
  displayMode?: DisplayMode // 'full' 或 'card'
  scale?: number           // 画布缩放比例
}

// EditorProps - 编辑器接收的数据  
interface EditorProps {
  content: NodeContent              // 原节点内容
  onUpdate: (data: string) => void  // 保存数据回调
  onClose: () => void               // 关闭编辑器回调
}

// PluginMeta - 插件元数据
interface PluginMeta {
  kind: string              // 内容类型（唯一标识）
  label: string             // UI 显示名
  icon: string              // 图标表情符（单个字符）
  description: string       // 描述
  editable: boolean         // 是否支持编辑
  supportsCardMode: boolean // 是否支持卡片模式
}
*/

// ============================================================================
// 实用代码片段
// ============================================================================

/*
// 1. 构建基础插件（最小化）
export const pluginPlugin = {
  meta: {
    kind: 'my-type',
    label: 'MyPlugin',
    icon: '🎯',
    description: 'My custom plugin',
    editable: false,
    supportsCardMode: false
  },
  renderer: MyRenderer
}

// 2. 支持编辑功能
export const pluginPlugin = {
  meta: {
    ...manifest,
    editable: true  // ← 关键
  },
  renderer: MyRenderer,
  editor: MyEditor  // ← 必需
}

// 3. 调试：查看插件
import { pluginRegistry } from '@/plugins'
console.log(pluginRegistry.getAllMeta())
console.log(pluginRegistry.getRenderer('my-type'))
console.log(pluginRegistry.getEditor('my-type'))

// 4. 动态注册插件（运行时）
import { pluginRegistry } from '@/plugins'
pluginRegistry.register(myPlugin)
*/

// ============================================================================
// 遇到问题？
// ============================================================================

/*
Q: 插件没有被发现
A: 检查 index.ts 中是否导出了 pluginPlugin（确切名称）

Q: 类型检查失败
A: 确保导入了 PluginMeta、RendererProps 等类型
   import type { PluginMeta, RendererProps } from '@/plugins'

Q: 编辑器不显示
A: 1. meta.editable 必须为 true
   2. 必须在 pluginPlugin 中设置 editor 属性

Q: 样式冲突
A: 在 Vue 组件中使用 <style scoped> 隔离样式

Q: 性能问题
A: 避免在 setup() 中进行重操作
   使用 computed 检查重复计算
   使用 v-show 而不是 v-if 避免频繁 DOM 操作

详见: web/docs/PLUGIN_DEVELOPMENT_ARCHITECTURE_2.0.md
*/

// ============================================================================
export const PLUGIN_TEMPLATE_VERSION = '2.0'
export const PLUGIN_TEMPLATE_DESCRIPTION = '可复制的Constella插件模板 - 自动发现架构'
// ============================================================================
