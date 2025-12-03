<script setup lang="ts">
interface Props {
    modelValue: boolean
    title?: string
    boxClass?: string
    hideCloseButton?: boolean
    persistent?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: false,
    title: '',
    boxClass: 'max-w-lg',
    hideCloseButton: false,
    persistent: false
})

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'close'): void
    (e: 'open'): void
}>()

const modalRef = ref<HTMLDialogElement | null>(null)

watch(() => props.modelValue, (val) => {
    if (!modalRef.value) return
    if (val) {
        if (!modalRef.value.open) {
            modalRef.value.showModal()
            emit('open')
        }
    } else {
        if (modalRef.value.open) {
            modalRef.value.close()
        }
    }
})

onMounted(() => {
    if (props.modelValue && modalRef.value && !modalRef.value.open) {
        modalRef.value.showModal()
    }
})

const handleNativeClose = () => {
    emit('update:modelValue', false)
    emit('close')
}

const closeModal = () => {
    if (modalRef.value?.open) {
        modalRef.value.close()
    }
}

const handleBackdropClick = () => {
    if (!props.persistent) {
        closeModal()
    }
}
</script>

<template>
    <Teleport to="body">
        <dialog ref="modalRef" class="modal modal-bottom sm:modal-middle" @close="handleNativeClose">
            <div class="modal-box relative bg-base-100/90 backdrop-blur-md border border-base-content/5 shadow-2xl transition-all duration-300 p-0 flex flex-col max-h-[90vh] w-full min-w-full sm:min-w-0 m-0 sm:m-auto rounded-t-2xl rounded-b-none sm:rounded-2xl"
                :class="props.boxClass">
                <div v-if="title || $slots.header" class="px-6 pt-5 pb-2 flex items-center justify-between shrink-0">
                    <div class="font-bold text-lg flex items-center gap-2 flex-1">
                        <slot name="header">
                            {{ title }}
                        </slot>
                    </div>
                    <button v-if="!hideCloseButton" class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 z-10"
                        @click="closeModal">
                        <Icon name="mingcute:close-line" class="text-xl" />
                    </button>
                </div>

                <div class="px-6 py-4 overflow-y-auto custom-scrollbar flex-1">
                    <slot :close="closeModal"></slot>
                </div>

                <div v-if="$slots.actions" class="modal-action px-6 pb-6 pt-2 shrink-0 bg-base-100/50 mt-0">
                    <slot name="actions" :close="closeModal"></slot>
                </div>
            </div>

            <form method="dialog" class="modal-backdrop">
                <button v-if="!persistent" type="button" @click="handleBackdropClick">close</button>
                <button v-else type="button" class="cursor-default">prevent close</button>
            </form>
        </dialog>
    </Teleport>
</template>

<style scoped>
.custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: currentColor transparent;
}
</style>
