/**
 * API Service
 * 处理所有的 HTTP 请求
 */

export interface ApiResponse<T = any> {
    success: boolean
    code?: number
    message?: string
    data?: T
    errorCode?: string  // 错误码，用于前端多语言映射
}

class ApiService {
    private baseUrl: string = ''
    private abortController: AbortController | null = null

    /**
     * 设置服务器基础 URL
     */
    setBaseUrl(url: string) {
        // 清理 URL，移除尾部斜杠
        this.baseUrl = url.replace(/\/$/, '')
    }

    /**
     * 获取当前服务器 URL
     */
    getBaseUrl(): string {
        return this.baseUrl
    }

    /**
     * 取消当前请求
     */
    cancelRequest() {
        if (this.abortController) {
            this.abortController.abort()
            this.abortController = null
        }
    }

    /**
     * 健康检查 - 验证服务器连接
     */
    async healthCheck(url?: string): Promise<ApiResponse> {
        const targetUrl = url || this.baseUrl

        if (!targetUrl) {
            return {
                success: false,
                message: 'No server URL provided'
            }
        }

        // 创建新的 AbortController
        this.abortController = new AbortController()

        try {
            const response = await fetch(`${targetUrl}/api/v1/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: this.abortController.signal
            })

            if (response.ok) {
                const result = await response.json()
                this.abortController = null
                return {
                    success: true,
                    code: result.code,
                    message: result.message || 'Server is healthy',
                    data: result.data
                }
            } else {
                this.abortController = null
                // 尝试解析错误响应
                try {
                    const errorData = await response.json()
                    return {
                        success: false,
                        code: errorData.code || response.status,
                        message: errorData.message || `Server returned status ${response.status}`,
                        errorCode: errorData.data
                    }
                } catch {
                    return {
                        success: false,
                        code: response.status,
                        message: `Server returned status ${response.status}`
                    }
                }
            }
        } catch (error: any) {
            this.abortController = null

            let errorMessage = 'Connection failed'

            if (error.name === 'AbortError') {
                errorMessage = 'Connection cancelled'
            } else if (error.name === 'TimeoutError') {
                errorMessage = 'Connection timeout'
            } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
                errorMessage = 'Unable to reach server'
            } else {
                errorMessage = error.message || 'Unknown error'
            }

            return {
                success: false,
                message: errorMessage
            }
        }
    }

    /**
     * 用户注册
     */
    async register(username: string, email: string, password: string): Promise<ApiResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            })

            const result = await response.json()

            if (response.ok) {
                return {
                    success: true,
                    code: result.code,
                    message: result.message,
                    data: result.data
                }
            } else {
                return {
                    success: false,
                    code: result.code || response.status,
                    message: result.message || 'Registration failed',
                    errorCode: result.data  // 错误码
                }
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Network error'
            }
        }
    }

    /**
     * 用户登录
     */
    async login(email: string, password: string): Promise<ApiResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            })

            const result = await response.json()

            if (response.ok) {
                return {
                    success: true,
                    code: result.code,
                    message: result.message,
                    data: result.data
                }
            } else {
                return {
                    success: false,
                    code: result.code || response.status,
                    message: result.message || 'Login failed',
                    errorCode: result.data  // 错误码
                }
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Network error'
            }
        }
    }

    /**
     * 刷新 Token
     */
    async refreshToken(refreshToken: string): Promise<ApiResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh_token: refreshToken })
            })

            const result = await response.json()

            if (response.ok) {
                return {
                    success: true,
                    code: result.code,
                    message: result.message,
                    data: result.data
                }
            } else {
                return {
                    success: false,
                    code: result.code || response.status,
                    message: result.message || 'Token refresh failed',
                    errorCode: result.data  // 错误码
                }
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Network error'
            }
        }
    }
}

// 导出单例
export const apiService = new ApiService()
