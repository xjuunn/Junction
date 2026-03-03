interface NormalizeEndpointOptions {
  defaultProtocol?: 'http' | 'https' | 'ws' | 'wss'
}

const ABSOLUTE_PROTOCOL_RE = /^[a-z][a-z\d+\-.]*:\/\//i

function trimTrailingSlash(input: string) {
  return input.replace(/\/+$/, '')
}

export function normalizeEndpointUrl(input?: string | null, options: NormalizeEndpointOptions = {}) {
  const value = String(input || '').trim()
  if (!value) return ''

  const defaultProtocol = options.defaultProtocol || 'http'
  const withScheme = ABSOLUTE_PROTOCOL_RE.test(value) ? value : `${defaultProtocol}://${value}`
  try {
    const url = new URL(withScheme)
    return trimTrailingSlash(url.toString())
  } catch {
    return ''
  }
}

export function resolveRuntimeApiBaseUrl() {
  const runtimeConfig = useRuntimeConfig()
  const protocol = String(runtimeConfig.public.httpType || 'http').trim() || 'http'
  const host = String(runtimeConfig.public.serverHost || '').trim()
  const backendPort = String(runtimeConfig.public.backendPort || '').trim()
  const fallbackBaseUrl = host
    ? `${protocol}://${host}${backendPort ? `:${backendPort}` : ''}`
    : ''
  return normalizeEndpointUrl(String(runtimeConfig.public.apiUrl || fallbackBaseUrl).trim(), {
    defaultProtocol: protocol === 'https' ? 'https' : 'http',
  })
}

function readSettingsValue<K extends 'backendServerUrl' | 'assetBaseUrl' | 'livekitBaseUrl'>(key: K) {
  if (import.meta.client) {
    try {
      const raw = window.localStorage.getItem('settings')
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        const value = String(parsed?.[key] || '').trim()
        if (value) return value
      }
    } catch {
    }
  }
  if (!import.meta.client) return ''
  try {
    const settings = useSettingsStore()
    return String(settings[key] || '').trim()
  } catch {
    return ''
  }
}

export function resolveApiBaseUrl() {
  const runtimeConfig = useRuntimeConfig()
  const protocol = String(runtimeConfig.public.httpType || 'http').trim() || 'http'
  const custom = normalizeEndpointUrl(readSettingsValue('backendServerUrl'), {
    defaultProtocol: protocol === 'https' ? 'https' : 'http',
  })
  return custom || resolveRuntimeApiBaseUrl()
}

export function resolveAssetBaseUrl() {
  const custom = normalizeEndpointUrl(readSettingsValue('assetBaseUrl'), { defaultProtocol: 'http' })
  return custom || resolveApiBaseUrl()
}

export function resolveSocketNamespaceUrl(namespace: string) {
  const base = resolveApiBaseUrl()
  if (!base) return `/${namespace}`
  try {
    const parsed = new URL(base)
    return `${parsed.protocol}//${parsed.host}/${String(namespace || '').replace(/^\/+/, '')}`
  } catch {
    return `/${namespace}`
  }
}

export function resolveLiveKitBaseUrl() {
  const runtimeConfig = useRuntimeConfig()
  const runtimeLivekitUrl = String(runtimeConfig.public.livekitUrl || '').trim()
  const custom = normalizeEndpointUrl(readSettingsValue('livekitBaseUrl'), { defaultProtocol: 'wss' })
  if (custom) return custom

  const normalizedRuntime = normalizeEndpointUrl(runtimeLivekitUrl, { defaultProtocol: 'wss' })
  if (normalizedRuntime) return normalizedRuntime

  const apiBase = resolveApiBaseUrl()
  try {
    const api = new URL(apiBase)
    const wsProtocol = api.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${wsProtocol}//${api.host}`
  } catch {
    return ''
  }
}

export async function probeBackendReachability(options: { baseUrl?: string; timeoutMs?: number; path?: string } = {}) {
  const timeoutMs = Number(options.timeoutMs || 4000)
  const path = String(options.path || '/app/hello')
  const baseUrl = options.baseUrl
    ? normalizeEndpointUrl(options.baseUrl, { defaultProtocol: 'http' })
    : resolveApiBaseUrl()

  if (!baseUrl) return { reachable: false, status: 0, reason: 'invalid-base-url' as const }

  const endpoint = `${trimTrailingSlash(baseUrl)}${path.startsWith('/') ? path : `/${path}`}`
  const controller = new AbortController()
  const startedAt = Date.now()
  let didTimeout = false
  const timer = setTimeout(() => {
    didTimeout = true
    controller.abort()
  }, timeoutMs)
  try {
    const response = await fetch(`${endpoint}${endpoint.includes('?') ? '&' : '?'}_ts=${Date.now()}`, {
      method: 'GET',
      signal: controller.signal,
    })
    return { reachable: true, status: response.status, reason: 'ok' as const }
  } catch (error: any) {
    const elapsed = Date.now() - startedAt
    if (didTimeout || error?.name === 'AbortError' || elapsed >= timeoutMs) {
      return { reachable: false, status: 0, reason: 'timeout' as const }
    }
    return { reachable: false, status: 0, reason: 'network-error' as const }
  } finally {
    clearTimeout(timer)
  }
}
