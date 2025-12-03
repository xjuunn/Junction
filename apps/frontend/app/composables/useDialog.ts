export const useDialog = () => {
  const dialogStore = useDialogStore()

  const openDialog = (options: DialogOptions): Promise<boolean> => {
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
    persistent?: boolean
  }): Promise<boolean> => {
    return openDialog({
      ...options,
      showCancel: true,
    })
  }

  // 提示框 (只有确定)
  const alert = (content: string, title?: string): Promise<boolean> => {
    return openDialog({
      title,
      content,
      type: 'info',
      showCancel: false,
    })
  }

  // 错误框
  const error = (content: string, title?: string): Promise<boolean> => {
    return openDialog({
      title,
      content,
      type: 'error',
      showCancel: false,
    })
  }

  return {
    confirm,
    alert,
    error
  }
}