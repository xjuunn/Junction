export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
    duration?: number
    closable?: boolean
}

export interface Toast extends ToastOptions {
    id: number
    message: string
    type: ToastType
}

const toasts = ref<Toast[]>([])
let counter = 0

const remove = (id: number) => {
    const index = toasts.value.findIndex((item) => item.id === id)
    if (index !== -1) {
        toasts.value.splice(index, 1)
    }
}

export const useToast = () => {
    const show = (message: string, type: ToastType = 'info', options: ToastOptions = {}) => {
        const id = counter++
        const duration = options.duration ?? 3000

        const toast: Toast = {
            id,
            message,
            type,
            closable: options.closable ?? true,
            duration
        }

        toasts.value.push(toast)

        if (duration > 0) {
            setTimeout(() => {
                remove(id)
            }, duration)
        }
    }

    return {
        toasts,
        show,
        remove,
        success: (msg: string, opts?: ToastOptions) => show(msg, 'success', opts),
        error: (msg: string, opts?: ToastOptions) => show(msg, 'error', opts),
        warning: (msg: string, opts?: ToastOptions) => show(msg, 'warning', opts),
        info: (msg: string, opts?: ToastOptions) => show(msg, 'info', opts)
    }
}