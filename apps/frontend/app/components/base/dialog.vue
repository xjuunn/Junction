<script setup lang="ts">
const store = useDialogStore()
const modalRef = ref<HTMLDialogElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

// 监听 store 开关
watch(() => store.isOpen, (val) => {
  if (!modalRef.value) return
  if (val) {
    modalRef.value.showModal()
  } else {
    modalRef.value.close()
  }
})

const isConfirmDisabled = computed(() => {
  if (!store.options.input?.enabled) return false
  if (!store.options.input?.required) return false
  return !store.inputValue.trim()
})

watch(() => store.isOpen, (val) => {
  if (val) {
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})

// 关闭逻辑
const handleClose = (result: boolean) => {
  store.close(result)
}

// 遮罩点击
const handleBackdropClick = () => {
  if (!store.options.persistent) {
    handleClose(false)
  }
}

const handleCancel = (event: Event) => {
  if (store.options.persistent) {
    event.preventDefault()
    return
  }
  handleClose(false)
}

// 获取类型对应的颜色
const getTypeColor = (type: DialogType | undefined) => {
  switch (type) {
    case 'success': return 'text-success'
    case 'warning': return 'text-warning'
    case 'error': return 'text-error'
    case 'info': default: return 'text-info'
  }
}

const getDefaultTitle = (type: DialogType | undefined) => {
  switch (type) {
    case 'success': return '成功'
    case 'warning': return '警告'
    case 'error': return '错误'
    case 'info': default: return '提示'
  }
}
</script>

<template>
  <dialog ref="modalRef" class="modal modal-bottom sm:modal-middle" @close="handleClose(false)"
    @cancel="handleCancel">
    <div
      class="modal-box relative overflow-hidden bg-base-100/80 backdrop-blur-md border border-base-content/5 shadow-2xl transition-all duration-300 flex flex-col p-0"
      :class="[store.options.maxWidth || 'max-w-lg']">
      <div class="px-6 pt-5 pb-2 flex items-center justify-between">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <Icon v-if="store.options.type" class="text-xl" :class="getTypeColor(store.options.type)" :name="store.options.type === 'error' ? 'mingcute:close-circle-fill' :
            store.options.type === 'warning' ? 'mingcute:alert-fill' :
              store.options.type === 'success' ? 'mingcute:check-circle-fill' : 'mingcute:information-fill'" />
          <span>
            {{ store.options.title || getDefaultTitle(store.options.type) }}
          </span>
        </h3>

        <button v-if="!store.options.hideCloseButton" class="btn btn-sm btn-circle btn-ghost"
          @click="handleClose(false)">
          <Icon name="mingcute:close-line" class="text-xl" />
        </button>
      </div>

      <div class="px-6 py-4 text-base-content/80 text-sm leading-relaxed min-h-[60px]">
        <div v-if="store.options.html" v-html="store.options.content"></div>
        <p v-else>{{ store.options.content }}</p>
        <div v-if="store.options.input?.enabled" class="mt-3">
          <label class="form-control w-full">
            <span v-if="store.options.input.label" class="label-text text-xs text-base-content/60 mb-1">
              {{ store.options.input.label }}
            </span>
            <input
              ref="inputRef"
              v-model="store.inputValue"
              :type="store.options.input.type || 'text'"
              :placeholder="store.options.input.placeholder || ''"
              class="input input-bordered w-full bg-transparent"
            />
          </label>
        </div>
      </div>

      <div class="modal-action px-6 pb-6 mt-2 flex gap-3">
        <button v-if="store.options.showCancel"
          class="btn btn-ghost flex-1 border border-base-content/10 bg-base-200/80 hover:bg-base-200/90 backdrop-blur-md"
          @click="handleClose(false)">
          {{ store.options.cancelText || '取消' }}
        </button>

        <button class="btn flex-1 text-white shadow-lg shadow-current/20" :class="{
          'btn-primary': !store.options.type || store.options.type === 'info' || store.options.type === 'success',
          'btn-warning': store.options.type === 'warning',
          'btn-error': store.options.type === 'error'
        }" :disabled="isConfirmDisabled" @click="handleClose(true)">
          {{ store.options.confirmText || '确认' }}
        </button>
      </div>
    </div>

    <form method="dialog" class="modal-backdrop">
      <button v-if="!store.options.persistent" type="button" @click="handleBackdropClick">close</button>
      <button v-else type="button" class="cursor-default">prevent close</button>
    </form>
  </dialog>
</template>

<style scoped>
.modal-box {
  scrollbar-width: thin;
  scrollbar-color: currentColor transparent;
}
</style>
