import type { Router } from 'vue-router'
import {
  getBackFallbackPath,
  normalizePath,
  shouldReplaceForNavigation,
} from '~/utils/navigation-policy'

export default defineNuxtPlugin((nuxtApp) => {
  const router = nuxtApp.$router as Router
  const rawPush = router.push.bind(router)
  const rawReplace = router.replace.bind(router)
  const rawBack = router.back.bind(router)

  // 统一 push 入栈策略：主 Tab/同级切换默认 replace，避免移动端返回循环。
  ;(router as any).push = ((to: Parameters<Router['push']>[0]) => {
    const from = router.currentRoute.value
    const target = router.resolve(to)
    if (shouldReplaceForNavigation(target, from)) {
      return rawReplace(to as Parameters<Router['replace']>[0])
    }
    return rawPush(to)
  }) as Router['push']

  // 统一 back 兜底：没有可回退记录时跳转到合理父级，避免“返回无响应/离开应用”。
  ;(router as any).back = (() => {
    const state = window.history.state as { back?: string | null } | null
    if (state?.back) {
      rawBack()
      return
    }

    const currentPath = normalizePath(router.currentRoute.value.path)
    const fallback = getBackFallbackPath(currentPath)
    if (fallback && fallback !== currentPath) {
      void rawReplace(fallback)
      return
    }

    rawBack()
  }) as Router['back']
})

