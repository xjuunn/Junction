import { isTauri } from '~/utils/check';

export const isExternalHttpUrl = (url: string) => {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
};

/**
 * 外部链接统一在系统浏览器中打开
 */
export const openExternalUrl = async (url: string) => {
  if (!isExternalHttpUrl(url)) return false;
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(url);
    return true;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
};
