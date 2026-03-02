import { isTauri } from '~/utils/check'

const SUPPORTED_PROTOCOLS = new Set(['junction:', 'junc:'])
const RESERVED_HOSTS = new Set(['open', 'launch', 'app'])
const TARGET_QUERY_KEYS = ['path', 'route', 'to', 'target', 'url']

const normalizeInternalRoute = (rawTarget: string): string | null => {
  let target = String(rawTarget || '').trim()
  if (!target) return null

  if (/^https?:\/\//i.test(target)) {
    try {
      const parsed = new URL(target)
      target = `${parsed.pathname}${parsed.search}${parsed.hash}`
    } catch {
      return null
    }
  }

  if (/^(junction|junc):\/\//i.test(target)) {
    return resolveDeepLinkRoute(target)
  }

  if (target.startsWith('#')) {
    target = target.slice(1)
  }
  if (!target.startsWith('/')) {
    target = `/${target}`
  }

  try {
    const normalized = new URL(target, 'https://junction.local')
    return `${normalized.pathname}${normalized.search}${normalized.hash}`
  } catch {
    return null
  }
}

const resolveDeepLinkRoute = (rawUrl: string): string | null => {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return null
  }

  if (!SUPPORTED_PROTOCOLS.has(parsed.protocol)) return null

  const explicitTarget = TARGET_QUERY_KEYS
    .map(key => parsed.searchParams.get(key))
    .find(Boolean)

  if (explicitTarget) {
    return normalizeInternalRoute(explicitTarget)
  }

  if (parsed.hash) {
    const hashTarget = parsed.hash.slice(1)
    const normalized = normalizeInternalRoute(hashTarget)
    if (normalized) return normalized
  }

  const host = parsed.hostname || ''
  const pathname = parsed.pathname || '/'
  const prefix = host && !RESERVED_HOSTS.has(host) ? `/${host}` : ''
  let route = `${prefix}${pathname}`
  if (!route.startsWith('/')) route = `/${route}`

  const query = new URLSearchParams(parsed.search)
  TARGET_QUERY_KEYS.forEach(key => query.delete(key))
  const queryString = query.toString()
  if (queryString) {
    route += route.includes('?') ? `&${queryString}` : `?${queryString}`
  }
  if (parsed.hash) {
    route += parsed.hash
  }

  return normalizeInternalRoute(route)
}

export default defineNuxtPlugin(async () => {
  if (!isTauri()) return

  const router = useRouter()
  const handled = new Set<string>()

  const navigateByDeepLink = async (rawUrl: string) => {
    const target = resolveDeepLinkRoute(rawUrl)
    if (!target) return

    const key = `${rawUrl} -> ${target}`
    if (handled.has(key)) return
    handled.add(key)

    await router.isReady()
    if (router.currentRoute.value.fullPath === target) return

    try {
      await router.push(target)
    } catch {
      return
    }
  }

  try {
    const { getCurrent, onOpenUrl } = await import('@tauri-apps/plugin-deep-link')
    const initialUrls = await getCurrent()
    if (initialUrls?.length) {
      for (const url of initialUrls) {
        await navigateByDeepLink(url)
      }
    }

    await onOpenUrl((urls) => {
      urls.forEach((url) => {
        void navigateByDeepLink(url)
      })
    })
  } catch {
    return
  }
})
