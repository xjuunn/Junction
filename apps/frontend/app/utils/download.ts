import { isTauri } from '~/utils/check';
import { useSettingsStore } from '~/stores/settings';

export type DownloadMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface DownloadProgress {
  loaded: number;
  total?: number;
  percent?: number;
}

export interface DownloadSource {
  url: string;
  method?: DownloadMethod;
  headers?: Record<string, string>;
  body?: BodyInit | null;
}

export interface DownloadTarget {
  /**
   * 绝对路径，优先级最高
   */
  path?: string;
  /**
   * 目标目录（与 fileName 拼接）
   */
  dir?: string;
  /**
   * 文件名（不含目录）
   */
  fileName?: string;
  /**
   * 目录不存在时是否自动创建
   */
  ensureDir?: boolean;
  /**
   * 同名是否覆盖
   */
  overwrite?: boolean;
}

export interface DownloadHooks {
  onProgress?: (progress: DownloadProgress) => void;
  beforeSave?: (context: { fileName: string; bytes: Uint8Array }) => Promise<{ fileName?: string; bytes?: Uint8Array } | void> | void;
  afterSave?: (context: { fileName: string; path?: string }) => Promise<void> | void;
}

export interface DownloadOptions {
  source: DownloadSource;
  target?: DownloadTarget;
  /**
   * auto: 自动判断环境
   * tauri: 强制走 Tauri 下载
   * web: 强制走浏览器下载
   */
  mode?: 'auto' | 'tauri' | 'web';
  hooks?: DownloadHooks;
  /**
   * 自定义文件名解析
   */
  resolveFileName?: (source: DownloadSource) => string | null;
}

export interface DownloadResult {
  success: boolean;
  fileName?: string;
  path?: string;
  error?: string;
}

export const DOWNLOAD_PATH_KEY = 'junction.downloadPath';

export const getSavedDownloadDir = () => {
  if (typeof window === 'undefined') return null;
  let value = '';
  try {
    const settings = useSettingsStore();
    value = settings?.downloadPath || '';
  } catch {
    value = '';
  }
  if (!value) {
    value = window.localStorage.getItem(DOWNLOAD_PATH_KEY) || '';
  }
  return value && value.trim() ? value.trim() : null;
};

export const setSavedDownloadDir = (dir: string) => {
  if (typeof window === 'undefined') return;
  const next = (dir || '').trim();
  if (!next) window.localStorage.removeItem(DOWNLOAD_PATH_KEY);
  else window.localStorage.setItem(DOWNLOAD_PATH_KEY, next);
};


const sanitizeFileName = (name: string) => name.replace(/[\\/:*?"<>|]/g, '_').trim();

const guessFileName = (source: DownloadSource) => {
  try {
    const url = new URL(source.url);
    const raw = url.pathname.split('/').filter(Boolean).pop() || 'download';
    return sanitizeFileName(raw);
  } catch {
    return 'download';
  }
};

const resolveFileName = (source: DownloadSource, target?: DownloadTarget, resolver?: DownloadOptions['resolveFileName']) => {
  const fromResolver = resolver?.(source);
  if (fromResolver && fromResolver.trim()) return sanitizeFileName(fromResolver);
  if (target?.fileName && target.fileName.trim()) return sanitizeFileName(target.fileName);
  return guessFileName(source);
};

const readWithProgress = async (response: Response, onProgress?: DownloadHooks['onProgress']) => {
  if (!response.body || !onProgress) {
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  const reader = response.body.getReader();
  const total = Number(response.headers.get('content-length')) || undefined;
  let loaded = 0;
  const chunks: Uint8Array[] = [];

  // 逐块读取并上报进度
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.length;
      onProgress({ loaded, total, percent: total ? Math.round((loaded / total) * 100) : undefined });
    }
  }

  const result = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
};

const downloadInWeb = async (options: DownloadOptions): Promise<DownloadResult> => {
  const fileName = resolveFileName(options.source, options.target, options.resolveFileName);
  try {
    const response = await fetch(options.source.url, {
      method: options.source.method || 'GET',
      headers: options.source.headers,
      body: options.source.body,
    });
    if (!response.ok) {
      return { success: false, error: `下载失败: ${response.status} ${response.statusText}` };
    }
    const bytes = await readWithProgress(response, options.hooks?.onProgress);
    const next = await options.hooks?.beforeSave?.({ fileName, bytes });
    const finalName = next?.fileName || fileName;
    const finalBytes = next?.bytes || bytes;
    const blob = new Blob([finalBytes]);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = finalName;
    link.click();
    URL.revokeObjectURL(objectUrl);
    await options.hooks?.afterSave?.({ fileName: finalName });
    return { success: true, fileName: finalName };
  } catch (error: any) {
    return { success: false, error: error?.message || '下载失败' };
  }
};

const downloadInTauri = async (options: DownloadOptions): Promise<DownloadResult> => {
  const fileName = resolveFileName(options.source, options.target, options.resolveFileName);
  try {
    const { fetch } = await import('@tauri-apps/plugin-http');
    const { writeFile, mkdir, exists } = await import('@tauri-apps/plugin-fs');
    const { join, dirname, downloadDir } = await import('@tauri-apps/api/path');

    const response = await fetch(options.source.url, {
      method: options.source.method || 'GET',
      headers: options.source.headers,
      body: options.source.body,
    });
    if (!response.ok) {
      return { success: false, error: `下载失败: ${response.status} ${response.statusText}` };
    }

    const bytes = await readWithProgress(response, options.hooks?.onProgress);
    const next = await options.hooks?.beforeSave?.({ fileName, bytes });
    const finalName = next?.fileName || fileName;
    const finalBytes = next?.bytes || bytes;

    const target = options.target || {};
    const candidates: string[] = [];
    if (target.path) {
      candidates.push(target.path);
    } else if (target.dir) {
      candidates.push(await join(target.dir, finalName));
    } else {
      const savedDir = getSavedDownloadDir();
      if (savedDir) {
        candidates.push(await join(savedDir, finalName));
      }
    }
    const systemDir = await downloadDir();
    candidates.push(await join(systemDir, finalName));

    let lastError: any = null;
    for (const candidate of candidates) {
      try {
        const dirPath = await dirname(candidate);
        if (target.ensureDir !== false) {
          await mkdir(dirPath, { recursive: true });
        }
        if (target.overwrite !== true) {
          const has = await exists(candidate);
          if (has) {
            lastError = new Error('目标文件已存在');
            continue;
          }
        }
        await writeFile(candidate, finalBytes);
        await options.hooks?.afterSave?.({ fileName: finalName, path: candidate });
        return { success: true, fileName: finalName, path: candidate };
      } catch (err) {
        lastError = err;
      }
    }
    const message = lastError?.message || String(lastError || '');
    return { success: false, error: message || '下载失败' };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error || '下载失败') };
  }
};

/**
 * 统一下载入口
 */
export const downloadFile = async (options: DownloadOptions): Promise<DownloadResult> => {
  const mode = options.mode || 'auto';
  if (mode === 'tauri' || (mode === 'auto' && isTauri())) {
    return downloadInTauri(options);
  }
  return downloadInWeb(options);
};

/**
 * 仅在 Tauri 环境下打开保存路径选择
 */

/**
 * 创建带默认配置的下载器
 */
export const createDownloader = (defaults: DownloadOptions) => {
  return (options: DownloadOptions) => downloadFile({
    ...defaults,
    ...options,
    source: { ...defaults.source, ...options.source },
    target: { ...defaults.target, ...options.target },
    hooks: { ...defaults.hooks, ...options.hooks },
  });
};

/**
 * 获取可能的下载路径（仅 Tauri）
 */
export const getDownloadCandidates = async (fileName: string, target?: DownloadTarget) => {
  if (!isTauri()) return [];
  const safeName = sanitizeFileName(fileName || '');
  if (!safeName) return [];
  const { join, downloadDir } = await import('@tauri-apps/api/path');
  const candidates: string[] = [];
  const pushUnique = (value?: string) => {
    if (!value) return;
    if (!candidates.includes(value)) candidates.push(value);
  };

  if (target?.path) {
    pushUnique(target.path);
  } else if (target?.dir) {
    pushUnique(await join(target.dir, safeName));
  } else {
    const savedDir = getSavedDownloadDir();
    if (savedDir) {
      pushUnique(await join(savedDir, safeName));
    }
  }

  const systemDir = await downloadDir();
  pushUnique(await join(systemDir, safeName));
  return candidates;
};

/**
 * 查找已存在的下载文件路径（仅 Tauri）
 */
export const findExistingDownloadPath = async (fileName: string, target?: DownloadTarget) => {
  if (!isTauri()) return null;
  const safeName = sanitizeFileName(fileName || '');
  if (!safeName) return null;
  const { exists } = await import('@tauri-apps/plugin-fs');
  const candidates = await getDownloadCandidates(safeName, target);
  for (const candidate of candidates) {
    try {
      if (await exists(candidate)) return candidate;
    } catch {
      continue;
    }
  }
  return null;
};

/**
 * 打开本地文件（仅 Tauri）
 */
export const openLocalPath = async (path: string) => {
  if (!isTauri()) return;
  const { open } = await import('@tauri-apps/plugin-shell');
  await open(path);
};

/**
 * 打开文件所在目录（仅 Tauri）
 */
export const openLocalDirForFile = async (filePath: string) => {
  if (!isTauri()) return;
  const { dirname } = await import('@tauri-apps/api/path');
  const { open } = await import('@tauri-apps/plugin-shell');
  const dir = await dirname(filePath);
  await open(dir);
};
