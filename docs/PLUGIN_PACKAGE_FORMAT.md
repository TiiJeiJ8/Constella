# 插件安装包格式规范

Constella 的插件生态目前围绕两条面向受众的交付路径，以及一条内部入口文件规则定义：

- 面向终端用户的安装格式：`.constella-plugin` 或 `.zip`
- 面向开发者的加载方式：未打包插件目录
- `manifest.json` 是插件根目录内的入口文件，不是可单独安装的分发包

## 1. 交付模式

### 1.1 终端用户分发

推荐格式：

- `.constella-plugin`：主分发格式
- `.zip`：兼容分发格式

这两种格式最契合未来插件市场分发、本地备份、下载与分享场景。

### 1.2 开发者加载

推荐开发来源：

- 包含 `manifest.json` 的完整插件目录

该路径用于本地迭代、测试与调试，应视为开发者便利能力，而非面向普通用户的主要安装格式。

## 2. 三层插件模型

Constella 应区分三类插件层级：

### 2.1 内置官方插件

- 位置：`web/src/plugins/<plugin-name>/`
- 归属：随应用发布
- 目标：每个构建默认包含的官方节点类型

### 2.2 用户安装插件

- 来源：`.constella-plugin` 或 `.zip`
- 持久化位置：Electron 用户数据目录
- 目标：由终端用户按需安装的可选能力

### 2.3 开发插件

- 来源：本地插件目录
- 建议位置：专用开发目录，例如 `dev-plugins/`
- 目标：本地测试，不与内置官方插件混放临时代码

## 3. 插件根目录结构

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
    "constella": "^1.2.99"
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

## 5. 字段说明

- `id`：稳定的插件标识符
- `name`：插件管理 UI 中的显示名称
- `version`：插件版本号
- `nodes`：一个安装包可提供一个或多个节点类型
- `renderer`：必填，运行时渲染器模块路径
- `editor`：可选，运行时编辑器模块路径
- `i18n`：可选，运行时合并到宿主 i18n 的多语言资源

## 6. 运行时模块规则

- `renderer.js` 必须以 `default` 导出 Vue 组件
- `editor.js` 若存在，应以 `default` 导出 Vue 组件
- 运行时加载器也可兼容命名导出，例如 `renderer`、`RendererComponent`、`editor`、`EditorComponent`
- 运行时模块不得通过裸导入打包或引入 Vue，例如 `import { h } from 'vue'`

应改用宿主 API：

```js
const { h, ref, computed } = window.__CONSTELLA_PLUGIN_API__.vue
```

## 7. 打包建议

推荐发布流程：

1. 构建插件运行时资源
2. 确认 `manifest.json` 中路径正确
3. 将插件根目录打包为 `.constella-plugin`
4. 可选提供 `.zip` 作为兼容格式

注意：

- 不要单独分发 `manifest.json`
- 不要把插件根目录以外的父级目录一并打包
- 压缩包根层级应直接包含插件文件

## 8. 安装与持久化

对于已安装插件，Constella 应：

1. 校验 `manifest.json`
2. 将插件源文件复制到本地安装存储
3. 单独持久化安装元数据
4. 在运行时注册已启用插件

Electron 中安装数据目录：

- 已安装插件内容：`app.getPath('userData')/plugins/installed`
- 导入压缩包缓存：`app.getPath('userData')/plugins/archives`

## 9. 推荐产品方向

- 面向终端用户的导入入口应优先 `.constella-plugin` 与 `.zip`
- 开发者工作流可单独提供“加载插件目录”入口
- 目录加载能力应由设置中的开发者模式开关控制
- 内置官方插件、用户安装插件、开发插件应保持明确分层

## 10. 当前说明

- 插件市场在线分发能力仍在准备中
- 签名校验、沙箱隔离、信任策略尚未最终定稿
- 即使关闭开发者模式，开发插件记录也可能保留
- 开发者模式关闭时，应隐藏开发插件加载入口，并在运行时跳过开发插件注册
- 在“安装包优先”用户体验完全落地前，本地开发导入细节可能继续演进
