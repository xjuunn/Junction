
export type DialogType = 'info' | 'success' | 'warning' | 'error'

export interface DialogOptions {
  title?: string
  content: string
  type?: DialogType
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  persistent?: boolean
  html?: boolean
  maxWidth?: string
  hideCloseButton?: boolean
}

interface DialogState {
  isOpen: boolean
  options: DialogOptions
  resolve: ((value: boolean) => void) | null
}

export const useDialogStore = defineStore('dialog', {
  state: (): DialogState => ({
    isOpen: false,
    options: {
      content: '',
      type: 'info',
      maxWidth: 'max-w-lg'
    },
    resolve: null
  }),

  actions: {
    open(options: DialogOptions, resolvePromise: (value: boolean) => void) {
      this.options = {
        type: 'info',
        showCancel: true,
        persistent: false,
        html: false,
        maxWidth: 'max-w-lg',
        hideCloseButton: false,
        ...options
      }
      this.resolve = resolvePromise
      this.isOpen = true
    },

    close(result: boolean) {
      this.isOpen = false
      if (this.resolve) {
        this.resolve(result)
        this.resolve = null
      }
    }
  }
})