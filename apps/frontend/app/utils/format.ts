/** 相对时间格式化 */
export function formatTimeAgo(dateStr: Date | string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) return '刚刚';
    if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
    if (diff < day) return `${Math.floor(diff / hour)}小时前`;
    if (diff < day * 7) return `${Math.floor(diff / day)}天前`;

    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * 转换为可渲染的资源路径
 * 自动拼接baseurl
 * @param input 文件路径
 * @param options 配置
 */
export function resolveAssetUrl(
    input?: string | null,
    options?: {
        baseUrl?: string
        fallback?: string
    }
): string {
    if (!input) return options?.fallback ?? '';
    const value = input.trim();
    if (!value) return options?.fallback ?? '';
    if (/^(data:|blob:)/.test(value)) return value;
    if (/^(https?:)?\/\//.test(value)) return value;
    const config = useRuntimeConfig();
    const base = options?.baseUrl ?? config.public.apiUrl;
    if (!base) return value;
    if (value.startsWith('/'))
        return `${base}${value}`;
    return `${base}/${value}`;
}

/**
 * 规范化上传资源路径，仅保留 /uploads 下的相对路径
 */
export function normalizeUploadPath(
    input?: string | null,
    options?: {
        baseUrl?: string
    }
): string {
    if (!input) return '';
    const value = input.trim();
    if (!value) return '';
    if (/^(data:|blob:)/.test(value)) return value;
    if (value.startsWith('/uploads/')) return value;
    if (value.startsWith('uploads/')) return `/${value}`;

    if (/^(https?:)?\/\//.test(value)) {
        try {
            const config = useRuntimeConfig();
            const base = options?.baseUrl ?? config.public.apiUrl;
            const baseUrl = base ? new URL(base) : null;
            const url = new URL(value, baseUrl ?? undefined);
            if (url.pathname.startsWith('/uploads/')) {
                if (baseUrl && url.origin !== baseUrl.origin) return value;
                return `${url.pathname}${url.search || ''}`;
            }
        } catch {
            return value;
        }
    }

    return value;
}
