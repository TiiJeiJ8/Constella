# Constella 客户端开发指南

## 启动开发环境

### Web 开发模式（浏览器）
```bash
cd client
npm run dev
```
访问 http://localhost:5173

### Electron 开发模式（桌面应用）
```bash
cd client
npm run dev:electron
```

## 功能说明

### 窗口控制
- **最小化**：隐藏窗口到任务栏
- **最大化/还原**：切换全屏/窗口模式
- **关闭**：退出应用

### 功能按钮
- **设置（齿轮图标）**：打开设置面板（开发中）
- **语言切换（中/EN）**：中英文切换
- **主题切换**：浅色/深色模式

### 多语言支持
- 中文（zh-CN）
- English（en-US）

语言设置自动保存到 localStorage。

## 项目结构

```
client/
├── electron/           # Electron 主进程和预加载脚本
│   ├── main.ts        # 主进程（窗口管理、IPC）
│   └── preload.ts     # 预加载脚本（安全 API 暴露）
├── src/
│   ├── views/
│   │   └── HomeView.vue    # 首页（入场动画 + 服务器连接）
│   ├── components/
│   │   └── base/
│   │       └── LightDarkBtn.vue  # 主题切换按钮
│   ├── locales/       # 国际化翻译文件
│   │   ├── zh-CN.json
│   │   ├── en-US.json
│   │   └── index.ts
│   ├── style.css      # 全局样式（主题色盘）
│   ├── App.vue        # 根组件
│   └── main.ts        # 入口文件
└── package.json

```

## 样式系统

### 主题变量（定义在 style.css）
```css
/* 浅色主题 */
--bg-primary: #ffffff
--text-primary: #2c3e50
--accent-primary: #409eff

/* 深色主题 */
html[data-theme='dark'] {
  --bg-primary: #1a1a1a
  --text-primary: #e4e7ed
}
```

所有组件使用 CSS 变量实现主题切换。

## 下一步开发

- [ ] 实现设置对话框
- [ ] 完善服务器连接逻辑
- [ ] 添加用户认证界面
- [ ] 实现画布编辑器
- [ ] 离线存储支持
