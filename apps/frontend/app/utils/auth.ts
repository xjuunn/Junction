export function resolveAuthErrorStatus(error: unknown): number | null {
  const rawStatus = (error as any)?.status
    ?? (error as any)?.response?.status
    ?? (error as any)?.data?.status
    ?? (error as any)?.data?.statusCode
    ?? (error as any)?.error?.status
    ?? (error as any)?.cause?.status

  const status = Number(rawStatus)
  return Number.isFinite(status) ? status : null
}

export function isAuthInvalidError(error: unknown): boolean {
  const status = resolveAuthErrorStatus(error)
  if (status === 401 || status === 403) return true

  const code = String(
    (error as any)?.code
    ?? (error as any)?.error?.code
    ?? (error as any)?.data?.code
    ?? ''
  ).toLowerCase()
  if (code.includes('unauthorized') || code.includes('invalid_token') || code.includes('missing_token')) {
    return true
  }

  const message = String((error as any)?.message ?? '').toLowerCase()
  return message.includes('unauthorized') || message.includes('invalid token') || message.includes('missing token')
}

