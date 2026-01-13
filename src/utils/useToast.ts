export interface ToastOptions {
    message: string
    type?: 'success' | 'error' | 'info' | 'warning'
    duration?: number
}

interface ToastInstance {
    success: (message: string, duration?: number) => number
    error: (message: string, duration?: number) => number
    warning: (message: string, duration?: number) => number
    info: (message: string, duration?: number) => number
}

// 全局 toast 实例引用
let toastInstance: ToastInstance | null = null

export function setToastInstance(instance: ToastInstance) {
    toastInstance = instance
}

export function useToast() {
    return {
        success: (message: string, duration?: number) => {
            if (toastInstance) {
                return toastInstance.success(message, duration)
            }
            console.warn('Toast instance not initialized')
            return -1
        },
        error: (message: string, duration?: number) => {
            if (toastInstance) {
                return toastInstance.error(message, duration)
            }
            console.warn('Toast instance not initialized')
            return -1
        },
        warning: (message: string, duration?: number) => {
            if (toastInstance) {
                return toastInstance.warning(message, duration)
            }
            console.warn('Toast instance not initialized')
            return -1
        },
        info: (message: string, duration?: number) => {
            if (toastInstance) {
                return toastInstance.info(message, duration)
            }
            console.warn('Toast instance not initialized')
            return -1
        }
    }
}
