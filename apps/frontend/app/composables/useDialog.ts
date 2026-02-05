export const useDialog = () => {
  const dialogStore = useDialogStore()

  const openDialog = (options: DialogOptions): Promise<DialogResult> => {
    return new Promise((resolve) => {
      dialogStore.open(options, resolve)
    })
  }

  // 确认框
  const confirm = (options: {
    title?: string,
    content: string,
    type?: DialogType,
    confirmText?: string,
    cancelText?: string,
    persistent?: boolean,
    hideCloseButton?: boolean
  }): Promise<boolean> => {
    return openDialog({
      ...options,
      showCancel: true,
    }).then(res => res.confirmed)
  }

  // 提示框(只有确定)
  const alert = (content: string, title?: string): Promise<boolean> => {
    return openDialog({
      title,
      content,
      type: 'info',
      showCancel: false,
    }).then(res => res.confirmed)
  }

  // 错误框
  const error = (content: string, title?: string): Promise<boolean> => {
    return openDialog({
      title,
      content,
      type: 'error',
      showCancel: false,
    }).then(res => res.confirmed)
  }

  // 输入框
  const prompt = (options: {
    title?: string,
    content: string,
    type?: DialogType,
    confirmText?: string,
    cancelText?: string,
    persistent?: boolean,
    placeholder?: string,
    defaultValue?: string,
    label?: string,
    required?: boolean,
    inputType?: 'text' | 'password' | 'number'
  }): Promise<string | null> => {
    return openDialog({
      ...options,
      showCancel: true,
      input: {
        enabled: true,
        value: options.defaultValue,
        placeholder: options.placeholder,
        label: options.label,
        required: options.required,
        type: options.inputType
      }
    }).then(res => res.confirmed ? (res.value ?? '') : null)
  }

  return {
    confirm,
    alert,
    error,
    prompt
  }
}
