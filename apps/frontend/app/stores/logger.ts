import { defineStore } from 'pinia'

export interface LogEntry {
    id: string
    type: 'info' | 'success' | 'warn' | 'error' | 'api'
    message: string
    data?: any
    timestamp: string
}

export const useLoggerStore = defineStore('logger', () => {
    const showDebugger = ref(true)

    const logs = ref<LogEntry[]>([])
    const maxLogs = 100

    const addLog = (type: LogEntry['type'], message: string, data?: any) => {
        const entry: LogEntry = {
            id: Math.random().toString(36).substring(2, 9),
            type,
            message,
            data: data ? JSON.parse(JSON.stringify(data)) : undefined,
            timestamp: new Date().toLocaleTimeString(),
        }

        logs.value.unshift(entry)
        if (logs.value.length > maxLogs) logs.value.pop()
        if (process.env.NODE_ENV === 'development') {
            const styles = {
                error: 'color: red',
                success: 'color: green; font-weight: bold',
                api: 'color: #0099ff',
                warn: 'color: orange',
                info: 'color: gray'
            }
            console.log(`%c[${type.toUpperCase()}] ${message}`, styles[type] || '', data || '')
        }
    }

    const clear = () => logs.value = []
    const toggleDebugger = (status?: boolean) => {
        showDebugger.value = status ?? !showDebugger.value
    }

    return { logs, showDebugger, addLog, clear, toggleDebugger }
})