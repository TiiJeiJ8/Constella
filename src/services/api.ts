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
    private isRefreshing: boolean = false
    private refreshPromise: Promise<ApiResponse> | null = null

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
     * 自动刷新 Token（带防抖）
     */
    private async autoRefreshToken(): Promise<ApiResponse> {
        // 如果正在刷新，返回同一个 Promise
        if (this.isRefreshing && this.refreshPromise) {
            return this.refreshPromise
        }

        this.isRefreshing = true

        this.refreshPromise = (async () => {
            try {
                const refreshToken = localStorage.getItem('refresh_token')
                if (!refreshToken) {
                    throw new Error('No refresh token')
                }

                const result = await this.refreshToken(refreshToken)

                if (result.success && result.data) {
                    // 更新 token
                    if (result.data.access_token) {
                        localStorage.setItem('access_token', result.data.access_token)
                    }
                    if (result.data.refresh_token) {
                        localStorage.setItem('refresh_token', result.data.refresh_token)
                    }
                    console.log('[Token] Auto refresh on 401 successful')
                }

                return result
            } finally {
                this.isRefreshing = false
                this.refreshPromise = null
            }
        })()

        return this.refreshPromise
    }

    /**
     * 带 Token 自动刷新的请求方法
     */
    private async fetchWithAuth(url: string, options: RequestInit, retryOnUnauth = true): Promise<Response> {
        const response = await fetch(url, options)

        // 如果是 401 未授权，且允许重试，尝试刷新 Token
        if (response.status === 401 && retryOnUnauth) {
            console.log('[Token] Got 401, attempting auto refresh...')

            const refreshResult = await this.autoRefreshToken()

            if (refreshResult.success) {
                // Token 刷新成功，重新发起请求（只重试一次）
                const newToken = localStorage.getItem('access_token')
                if (newToken && options.headers) {
                    (options.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
                }
                return await fetch(url, options)
            }
        }

        return response
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

    /**
     * 获取认证头
     */
    private getAuthHeaders(): HeadersInit {
        const accessToken = localStorage.getItem('access_token')
        return {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        }
    }

    /**
     * 获取房间列表
     */
    async getRooms(params?: {
        page?: number
        limit?: number
        userId?: string  // 过滤特定用户的房间
    }): Promise<ApiResponse> {
        try {
            const queryParams = new URLSearchParams()
            if (params?.page) queryParams.append('page', params.page.toString())
            if (params?.limit) queryParams.append('limit', params.limit.toString())
            if (params?.userId) queryParams.append('user_id', params.userId)  // 服务器期望user_id参数

            const url = `${this.baseUrl}/api/v1/rooms${queryParams.toString() ? '?' + queryParams.toString() : ''}`

            const response = await this.fetchWithAuth(url, {
                method: 'GET',
                headers: this.getAuthHeaders()
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
                    message: result.message || 'Failed to fetch rooms',
                    errorCode: result.data
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
     * 获取所有房间（公开+私密）
     */
    async getAllRooms(params?: {
        page?: number
        limit?: number
    }): Promise<ApiResponse> {
        try {
            const queryParams = new URLSearchParams()
            if (params?.page) queryParams.append('page', params.page.toString())
            if (params?.limit) queryParams.append('limit', params.limit.toString())
            queryParams.append('include_private', 'true')  // 包含私密房间

            const url = `${this.baseUrl}/api/v1/rooms/all${queryParams.toString() ? '?' + queryParams.toString() : ''}`

            const response = await this.fetchWithAuth(url, {
                method: 'GET',
                headers: this.getAuthHeaders()
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
                    message: result.message || 'Failed to fetch all rooms',
                    errorCode: result.data
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
     * 创建房间
     */
    async createRoom(params: {
        name: string
        description?: string
        is_private?: boolean
        password?: string
        settings?: any
    }): Promise<ApiResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/rooms`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(params)
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
                    message: result.message || 'Failed to create room',
                    errorCode: result.data
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
     * 获取房间详情
     */
    async getRoomById(roomId: string): Promise<ApiResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/rooms/${roomId}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
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
                    message: result.message || 'Failed to get room',
                    errorCode: result.data
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
     * 获取房间 Relay Token（用于 Yjs WebSocket 连接）
     */
    async getRoomRelayToken(roomId: string): Promise<ApiResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/rooms/${roomId}/relay-token`, {
                method: 'POST',
                headers: this.getAuthHeaders()
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
                    message: result.message || 'Failed to get relay token',
                    errorCode: result.data
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
     * 删除房间
     */
    async deleteRoom(roomId: string, password?: string): Promise<ApiResponse> {
        try {
            const response = await this.fetchWithAuth(`${this.baseUrl}/api/v1/rooms/${roomId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders(),
                body: password ? JSON.stringify({ password }) : undefined
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
                    message: result.message || 'Failed to delete room',
                    errorCode: result.data
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
     * 加入房间
     */
    async joinRoom(roomId: string, password?: string): Promise<ApiResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/rooms/${roomId}/join`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ password })
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
                    message: result.message || 'Failed to join room',
                    errorCode: result.data
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
     * 获取用户加入的房间列表
     */
    async getMyRooms(): Promise<ApiResponse> {
        const userId = localStorage.getItem('user_id')
        if (!userId) {
            return {
                success: false,
                errorCode: 'USER_NOT_LOGGED_IN',
                message: 'User not logged in'
            }
        }
        return this.getRooms({ userId })
    }
}

// 导出单例
export const apiService = new ApiService()
