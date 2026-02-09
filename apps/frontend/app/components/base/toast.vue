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
                    class="alert shadow-lg grid-cols-[auto_1fr_auto] min-w-[320px] py-3 border-l-4 pointer-events-auto bg-base-200/80 backdrop-blur-md"
                    :class="getAlertClass(item.type)">
                    <icon :name="getIconName(item.type)" class="text-2xl" />

                    <span class="font-medium text-sm">{{ item.message }}</span>

                    <button v-if="item.closable" class="btn btn-sm btn-circle btn-ghost" @click="remove(item.id)">
                        <icon name="mingcute:close-line" class="text-lg" />
                    </button>
                </div>
            </TransitionGroup>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
const { toasts, remove } = useToast()

const getAlertClass = (type: ToastType) => {
    switch (type) {
        case 'success': return 'alert-success border-l-success-content/20 text-success-content'
        case 'error': return 'alert-error border-l-error-content/20 text-error-content'
        case 'warning': return 'alert-warning border-l-warning-content/20 text-warning-content'
        case 'info': return 'alert-info border-l-info-content/20 text-info-content'
        default: return 'alert-info'
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
</script>
