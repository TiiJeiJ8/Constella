# 错误处理使用说明

## 概述

前端已实现基于错误码的多语言错误提示系统。所有 API 错误码映射都存储在独立的 JSON 文件中，支持中英文。

## 文件结构

```
web/src/
├── locales/
│   ├── errors/
│   │   ├── zh-CN.json     # 中文错误码映射
│   │   └── en-US.json     # 英文错误码映射
│   ├── zh-CN.json         # 中文主翻译文件
│   ├── en-US.json         # 英文主翻译文件
│   └── index.ts           # i18n 配置
├── utils/
│   └── errorHandler.ts    # 错误处理工具
└── services/
    └── api.ts             # API 服务
```

## 错误码映射文件

### zh-CN.json (中文)
```json
{
    "AUTH_MISSING_FIELDS": "请填写所有必填字段",
    "AUTH_EMAIL_EXISTS": "该邮箱已被注册",
    "AUTH_INVALID_CREDENTIALS": "邮箱或密码错误",
    ...
}
```

### en-US.json (英文)
```json
{
    "AUTH_MISSING_FIELDS": "Please fill in all required fields",
    "AUTH_EMAIL_EXISTS": "This email is already registered",
    "AUTH_INVALID_CREDENTIALS": "Invalid email or password",
    ...
}
```

## 使用方法

### 1. 导入错误处理工具

```typescript
import { handleApiError, showError, getErrorMessage } from '@/utils/errorHandler'
```

### 2. 处理 API 错误

#### 方法 A：使用 handleApiError

```typescript
const result = await apiService.login(email, password)

if (!result.success) {
    // 自动根据错误码获取本地化消息
    const errorMessage = handleApiError(result)
    console.error(errorMessage)
    // 或直接显示
    showError(result)
}
```

#### 方法 B：使用 getErrorMessage

```typescript
const result = await apiService.register(username, email, password)

if (!result.success) {
    // 手动获取错误消息
    const message = getErrorMessage(result.errorCode, result.message)
    alert(message)
}
```

### 3. 在组件中使用

```vue
<script setup>
import { ref } from 'vue'
import { apiService } from '@/services/api'
import { handleApiError, showError } from '@/utils/errorHandler'

const email = ref('')
const password = ref('')
const errorMsg = ref('')

async function handleLogin() {
    const result = await apiService.login(email.value, password.value)
    
    if (result.success) {
        // 登录成功
        console.log('Token:', result.data.access_token)
    } else {
        // 使用错误处理工具获取本地化消息
        errorMsg.value = handleApiError(result)
        // 或直接显示
        showError(result)
    }
}
</script>
```

## API 响应格式

### 成功响应
```json
{
    "success": true,
    "code": 200,
    "message": "Login successful",
    "data": {
        "access_token": "...",
        "refresh_token": "..."
    }
}
```

### 错误响应
```json
{
    "success": false,
    "code": 401,
    "message": "Invalid email or password",
    "errorCode": "AUTH_INVALID_CREDENTIALS"
}
```

## 错误处理工具 API

### getErrorMessage(errorCode?, fallbackMessage?)

获取本地化的错误消息。

**参数：**
- `errorCode` - API 返回的错误码
- `fallbackMessage` - 备用消息（如果没有找到映射）

**返回：** 本地化的错误消息字符串

### handleApiError(response)

处理 API 响应错误，自动提取错误码并返回本地化消息。

**参数：**
- `response` - ApiResponse 对象

**返回：** 本地化的错误消息字符串

### showError(error)

显示错误提示（可集成 UI 组件）。

**参数：**
- `error` - ApiResponse 对象或错误消息字符串

### showSuccess(message)

显示成功提示（可集成 UI 组件）。

**参数：**
- `message` - 成功消息字符串

## 添加新的错误码

1. 在后端定义错误码（参见 `server/docs/ERROR_CODES.md`）
2. 在 `web/src/locales/errors/zh-CN.json` 添加中文翻译
3. 在 `web/src/locales/errors/en-US.json` 添加英文翻译

示例：
```json
// zh-CN.json
{
    "NEW_ERROR_CODE": "新的错误提示"
}

// en-US.json
{
    "NEW_ERROR_CODE": "New error message"
}
```

## 注意事项

1. 错误码必须与后端保持一致
2. 所有错误码都应该在两个语言文件中定义
3. 如果错误码没有映射，会显示 fallback 消息或错误码本身
4. `showError` 和 `showSuccess` 函数可以集成具体的 UI 提示组件（如 Element Plus、TDesign 等）
