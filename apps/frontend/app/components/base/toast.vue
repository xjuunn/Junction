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
</script>
