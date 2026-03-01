import type { RouteLocationNormalizedLoaded } from 'vue-router'

const TAB_ROOTS = new Set([
  '/chat',
  '/contacts',
  '/dashboard',
  '/profile',
  '/notification',
  '/settings',
  '/search',
])

const STATIC_DETAIL_PATHS = new Set([
  '/tools/scrcpy/settings',
])

export function normalizePath(path?: string | null): string {
  if (!path) return '/'
  const raw = path.split('?')[0]?.split('#')[0] || '/'
  if (raw === '/') return '/'
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

export function getRootPath(path?: string | null): string {
  const normalized = normalizePath(path)
  if (normalized === '/') return '/'
  const segment = normalized.split('/')[1]
  return segment ? `/${segment}` : '/'
}

export function getSiblingGroup(path?: string | null): string | null {
  const normalized = normalizePath(path)
  if (normalized === '/settings' || normalized.startsWith('/settings/')) return 'settings'
  if (normalized === '/profile' || normalized.startsWith('/profile/')) return 'profile'
  if (normalized === '/admin' || normalized.startsWith('/admin/')) return 'admin'
  if (normalized === '/search' || normalized.startsWith('/search/')) return 'search'
  if (normalized === '/notification' || normalized.startsWith('/notification/')) return 'notification'
  return null
}

export function isDetailRoute(route: RouteLocationNormalizedLoaded): boolean {
  const normalizedPath = normalizePath(route.path)
  if (STATIC_DETAIL_PATHS.has(normalizedPath)) return true
  if (route.matched.some(record => record.path.includes(':'))) return true
  const routeName = String(route.name || '')
  return routeName.includes('-id')
}

export function shouldReplaceForNavigation(
  to: RouteLocationNormalizedLoaded,
  from: RouteLocationNormalizedLoaded
): boolean {
  if (!to.path || !from.path) return false
  const toPath = normalizePath(to.path)
  const fromPath = normalizePath(from.path)
  if (toPath === fromPath && to.fullPath === from.fullPath) return false

  const toRoot = getRootPath(toPath)
  const fromRoot = getRootPath(fromPath)

  if (TAB_ROOTS.has(toRoot) && TAB_ROOTS.has(fromRoot) && toRoot !== fromRoot) {
    return true
  }

  const toGroup = getSiblingGroup(toPath)
  const fromGroup = getSiblingGroup(fromPath)
  if (toGroup && toGroup === fromGroup) {
    if (!isDetailRoute(to) && !isDetailRoute(from)) return true
  }

  return false
}

export function getBackFallbackPath(path?: string | null): string | null {
  const normalized = normalizePath(path)

  if (/^\/chat\/[^/]+$/.test(normalized)) return '/chat'
  if (/^\/contacts\/group\/[^/]+$/.test(normalized)) return '/contacts'
  if (/^\/contacts\/[^/]+$/.test(normalized)) return '/contacts'
  if (/^\/notification\/friend-request\/[^/]+$/.test(normalized)) return '/notification'
  if (/^\/notification\/[^/]+$/.test(normalized)) return '/notification'
  if (/^\/search\/user\/[^/]+$/.test(normalized)) return '/search'
  if (normalized === '/tools/scrcpy/settings') return '/tools/scrcpy'
  if (/^\/tools\/minecraft\/[^/]+$/.test(normalized)) return '/tools/minecraft'
  if (/^\/admin\/tables\/[^/]+$/.test(normalized)) return '/admin/database'

  return null
}

