<script setup lang="ts">
const store = useDialogStore()
const modalRef = ref<HTMLDialogElement | null>(null)

// 监听 store 开启/关闭
watch(() => store.isOpen, (val) => {
  if (!modalRef.value) return
  if (val) {
    modalRef.value.showModal()
  } else {
    modalRef.value.close()
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

// 获取类型对应的颜色（用于图标或按钮）
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
  <dialog ref="modalRef" class="modal modal-bottom sm:modal-middle" @close="handleClose(false)">
    <!-- Modal Box: 样式复用 CommonModal -->
    <div
      class="modal-box relative overflow-hidden bg-base-100/80 backdrop-blur-md border border-base-content/5 shadow-2xl transition-all duration-300 flex flex-col p-0"
      :class="[store.options.maxWidth || 'max-w-lg']">
      <!-- 1. 顶部 Header -->
      <div class="px-6 pt-5 pb-2 flex items-center justify-between">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <!-- 动态图标 -->
          <Icon v-if="store.options.type" class="text-xl" :class="getTypeColor(store.options.type)" :name="store.options.type === 'error' ? 'mingcute:close-circle-fill' :
            store.options.type === 'warning' ? 'mingcute:alert-fill' :
              store.options.type === 'success' ? 'mingcute:check-circle-fill' : 'mingcute:information-fill'" />
          <!-- 标题: 如果没有传入 title，根据 type 显示默认标题 -->
          <span>
            {{ store.options.title || getDefaultTitle(store.options.type) }}
          </span>
        </h3>

        <!-- 右上角关闭按钮 -->
        <button v-if="!store.options.hideCloseButton" class="btn btn-sm btn-circle btn-ghost"
          @click="handleClose(false)">
          <Icon name="mingcute:close-line" class="text-xl" />
        </button>
      </div>

      <!-- 2. 内容区域 -->
      <div class="px-6 py-4 text-base-content/80 text-sm leading-relaxed min-h-[60px]">
        <div v-if="store.options.html" v-html="store.options.content"></div>
        <p v-else>{{ store.options.content }}</p>
      </div>

      <!-- 3. 底部 Actions -->
      <div class="modal-action px-6 pb-6 mt-2 flex gap-3">
        <!-- 取消按钮 -->
        <button v-if="store.options.showCancel"
          class="btn btn-ghost flex-1 border border-base-content/10 bg-base-200/50 hover:bg-base-200"
          @click="handleClose(false)">
          {{ store.options.cancelText || '取消' }}
        </button>

        <!-- 确认按钮 -->
        <button class="btn flex-1 text-white shadow-lg shadow-current/20" :class="{
          'btn-primary': !store.options.type || store.options.type === 'info' || store.options.type === 'success',
          'btn-warning': store.options.type === 'warning',
          'btn-error': store.options.type === 'error'
        }" @click="handleClose(true)">
          {{ store.options.confirmText || '确认' }}
        </button>
      </div>
    </div>

    <!-- 遮罩背景 -->
    <form method="dialog" class="modal-backdrop">
      <button v-if="!store.options.persistent" type="button" @click="handleBackdropClick">close</button>
      <button v-else type="button" class="cursor-default">prevent close</button>
    </form>
  </dialog>
</template>

<style scoped>
/* 隐藏原生滚动条 */
.modal-box {
  scrollbar-width: thin;
  scrollbar-color: currentColor transparent;
}
</style>
