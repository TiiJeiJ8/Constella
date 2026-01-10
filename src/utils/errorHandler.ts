/**
 * 错误处理工具
 * 用于处理 API 错误响应并提供多语言错误提示
 */

import { i18n } from '../locales'
import type { ApiResponse } from '../services/api'

/**
 * 获取错误提示消息
 * @param errorCode - API 返回的错误码
 * @param fallbackMessage - 备用消息（如果没有映射的错误码）
 * @returns 本地化的错误消息
 */
export function getErrorMessage(errorCode?: string, fallbackMessage?: string): string {
    if (!errorCode) {
        return fallbackMessage || i18n.global.t('errors.INTERNAL_ERROR')
    }

    // 尝试获取映射的错误消息
    const key = `errors.${errorCode}`
    const message = i18n.global.t(key)

    // 如果没有找到映射，返回备用消息或错误码本身
    if (message === key) {
        return fallbackMessage || errorCode
    }

    return message
}

/**
 * 处理 API 响应错误
 * @param response - API 响应对象
 * @returns 本地化的错误消息
 */
export function handleApiError(response: ApiResponse): string {
    return getErrorMessage(response.errorCode, response.message)
}

/**
 * 显示错误提示（可以根据项目使用的 UI 框架调整）
 * @param error - 错误响应或错误消息
 */
export function showError(error: ApiResponse | string) {
    const message = typeof error === 'string' ? error : handleApiError(error)

    // TODO: 这里可以集成具体的 UI 提示组件
    // 例如 Element Plus 的 ElMessage.error(message)
    // 或者 TDesign 的 MessagePlugin.error(message)
    console.error('[Error]:', message)
    alert(message)
}

/**
 * 显示成功提示
 * @param message - 成功消息
 */
export function showSuccess(message: string) {
    // TODO: 集成 UI 提示组件
    console.log('[Success]:', message)
    alert(message)
}
