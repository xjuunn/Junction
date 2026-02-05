
export type DialogType = 'info' | 'success' | 'warning' | 'error'

export interface DialogInputOptions {
  enabled?: boolean
  value?: string
  placeholder?: string
  label?: string
  required?: boolean
  type?: 'text' | 'password' | 'number'
}

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
  input?: DialogInputOptions
}

interface DialogState {
  isOpen: boolean
  options: DialogOptions
  resolve: ((value: DialogResult) => void) | null
  inputValue: string
}

export interface DialogResult {
  confirmed: boolean
  value?: string
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
    ,
    inputValue: ''
  }),

  actions: {
    open(options: DialogOptions, resolvePromise: (value: DialogResult) => void) {
      const openNow = () => {
        this.options = {
          type: 'info',
          showCancel: true,
          persistent: false,
          html: false,
          maxWidth: 'max-w-lg',
          hideCloseButton: false,
          ...options
        }
        this.inputValue = this.options.input?.value ?? ''
        this.resolve = resolvePromise
        this.isOpen = true
      }

      if (this.isOpen) {
        this.isOpen = false
        nextTick(openNow)
        return
      }

      openNow()
    },

    close(result: boolean) {
      this.isOpen = false
      if (this.resolve) {
        this.resolve({ confirmed: result, value: this.inputValue })
        this.resolve = null
      }
    }
  }
})
