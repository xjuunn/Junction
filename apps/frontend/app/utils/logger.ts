import { useLoggerStore } from '~/stores/logger'

class Logger {
    private get store() {
        if (import.meta.client) {
            try { return useLoggerStore() } catch { return null }
        }
        return null
    }

    info(msg: string, data?: any) { this.store?.addLog('info', msg, data) }
    success(msg: string, data?: any) { this.store?.addLog('success', msg, data) }
    warn(msg: string, data?: any) { this.store?.addLog('warn', msg, data) }
    error(msg: string, data?: any) { this.store?.addLog('error', msg, data) }

    api(url: string, status: number | string, data?: any, isError = false) {
        this.store?.addLog(isError ? 'error' : 'api', `[API] ${status} - ${url}`, data)
    }
}

export const logger = new Logger()