import { normalizeUploadPath, resolveAssetUrl } from '~/utils/format'

/**
 * 规范化消息 payload 内的图片路径（仅处理 /uploads 下的资源）
 */
export const normalizeMessageImagePayload = (payload: any): any => {
    if (!payload) return payload
    if (Array.isArray(payload)) return payload.map(item => normalizeMessageImagePayload(item))
    if (typeof payload !== 'object') return payload

    const next: Record<string, any> = {}
    Object.keys(payload).forEach((key) => {
        const value = payload[key]
        if (key === 'imageUrl' || key === 'src') {
            next[key] = typeof value === 'string' ? normalizeUploadPath(value) : value
            return
        }
        next[key] = normalizeMessageImagePayload(value)
    })
    return next
}

/**
 * 渲染前补全消息 payload 内的图片 URL
 */
export const resolveMessageImagePayload = (payload: any): any => {
    if (!payload) return payload
    if (Array.isArray(payload)) return payload.map(item => resolveMessageImagePayload(item))
    if (typeof payload !== 'object') return payload

    const next: Record<string, any> = {}
    Object.keys(payload).forEach((key) => {
        const value = payload[key]
        if (key === 'imageUrl' || key === 'src') {
            next[key] = typeof value === 'string' ? resolveAssetUrl(value) : value
            return
        }
        next[key] = resolveMessageImagePayload(value)
    })
    return next
}
