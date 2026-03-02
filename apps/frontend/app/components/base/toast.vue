<template>
    <Teleport to="body">
        <div class="toast toast-top toast-end z-[9999] p-4 gap-3 overflow-hidden pointer-events-none">
            <TransitionGroup enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 translate-x-12 scale-95"
                enter-to-class="opacity-100 translate-x-0 scale-100"
                leave-active-class="transition-all duration-200 ease-in absolute"
                leave-from-class="opacity-100 translate-x-0 scale-100"
                leave-to-class="opacity-0 translate-x-12 scale-95" move-class="transition-all duration-300 ease-in-out">
                <div v-for="item in toasts" :key="item.id"
                    class="alert shadow-lg grid-cols-[auto_1fr_auto] min-w-[320px] py-3 border-l-4 pointer-events-auto"
                    :class="getAlertClass(item.type)">
                    <icon :name="getIconName(item.type)" class="text-2xl" />

                    <span class="font-medium text-sm">{{ item.message }}</span>

                    <div class="inline-flex items-center gap-1">
                        <button
                            v-if="item.closable"
                            class="btn btn-sm btn-circle btn-ghost"
                            @click="remove(item.id)"
                        >
                            <icon name="mingcute:close-line" class="text-lg" />
                        </button>
                        <button
                            v-if="item.type === 'error'"
                            class="btn btn-xs btn-ghost"
                            @click="copyMessage(item.message)"
                        >
                            复制
                        </button>
                    </div>
                </div>
            </TransitionGroup>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
const toast = useToast()
const { toasts, remove } = toast

const getAlertClass = (type: ToastType) => {
    switch (type) {
        case 'success': return 'alert-success !bg-success text-success-content border-l-success backdrop-blur-none'
        case 'error': return 'alert-error !bg-error text-error-content border-l-error backdrop-blur-none'
        case 'warning': return 'alert-warning !bg-warning text-warning-content border-l-warning backdrop-blur-none'
        case 'info': return 'alert-info !bg-info text-info-content border-l-info backdrop-blur-none'
        default: return 'alert-info !bg-info text-info-content border-l-info backdrop-blur-none'
    }
}

const getIconName = (type: ToastType) => {
    switch (type) {
        case 'success': return 'mingcute:check-circle-fill'
        case 'error': return 'mingcute:close-circle-fill'
        case 'warning': return 'mingcute:warning-fill'
        case 'info': return 'mingcute:information-fill'
        default: return 'mingcute:information-fill'
    }
}

const copyMessage = async (message: string) => {
    if (!import.meta.client) return
    const text = String(message || '')
    if (!text) return

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text)
        } else {
            const textarea = document.createElement('textarea')
            textarea.value = text
            textarea.style.position = 'fixed'
            textarea.style.opacity = '0'
            document.body.appendChild(textarea)
            textarea.focus()
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
        }
        toast.success('已复制错误信息')
    } catch {
        toast.error('复制失败')
    }
}
</script>
