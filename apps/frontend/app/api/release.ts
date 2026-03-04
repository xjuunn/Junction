export type ReleasePlatform =
  | 'windows'
  | 'macos'
  | 'linux'
  | 'android-arm64-v8a'
  | 'android-armeabi-v7a'
  | 'android-i686'
  | 'android-x86_64'
  | 'ios'

export type GithubReleaseAsset = {
  name: string
  size: number
  browser_download_url: string
  content_type?: string
}

export type GithubRelease = {
  id: number
  tag_name: string
  name: string
  html_url: string
  published_at: string
  draft: boolean
  prerelease: boolean
  assets: GithubReleaseAsset[]
}

const DEFAULT_OWNER = 'xjuunn'
const DEFAULT_REPO = 'Junction'

const INSTALLER_EXTENSIONS = /\.(msi|exe|zip|dmg|pkg|appimage|deb|rpm|tar\.gz|tar\.xz|apk|aab|ipa)$/i
const NON_BINARY_EXTENSIONS = /\.(txt|md|sha256)$/i

const PLATFORM_MATCHERS: Record<ReleasePlatform, (name: string) => boolean> = {
  windows: name => /desktop-windows/i.test(name) && /\.(msi|exe|zip)$/i.test(name),
  macos: name => /desktop-macos/i.test(name) && /\.(dmg|pkg|zip)$/i.test(name),
  linux: name => /desktop-linux/i.test(name) && /\.(appimage|deb|rpm|tar\.gz|tar\.xz)$/i.test(name),
  'android-arm64-v8a': name => /mobile-android-(aarch64|arm64|arm64-v8a)__/i.test(name) && /\.(apk|aab)$/i.test(name),
  'android-armeabi-v7a': name => /mobile-android-(armv7|armeabi|armeabi-v7a)__/i.test(name) && /\.(apk|aab)$/i.test(name),
  'android-i686': name => /mobile-android-i686__/i.test(name) && /\.(apk|aab)$/i.test(name),
  'android-x86_64': name => /mobile-android-x86_64__/i.test(name) && /\.(apk|aab)$/i.test(name),
  ios: name => /mobile-ios|ios|iphone|ipad/i.test(name) && /\.ipa$/i.test(name),
}

const isDownloadableAsset = (asset: GithubReleaseAsset) => {
  const name = asset.name.toLowerCase()
  if (NON_BINARY_EXTENSIONS.test(name)) return false
  return INSTALLER_EXTENSIONS.test(name)
}

export const fetchLatestGithubRelease = async (
  owner = DEFAULT_OWNER,
  repo = DEFAULT_REPO,
  refresh = false,
): Promise<GithubRelease> => {
  const response = await api.get<GithubRelease>('/github/releases/latest', {
    owner,
    repo,
    refresh: refresh ? '1' : '0',
  })
  if (!response.data) {
    throw new Error('Latest release data is empty')
  }
  return response.data
}

export const fetchGithubReleases = async (
  owner = DEFAULT_OWNER,
  repo = DEFAULT_REPO,
  page = 1,
  perPage = 20,
  refresh = false,
): Promise<GithubRelease[]> => {
  const response = await api.get<GithubRelease[]>('/github/releases', {
    owner,
    repo,
    page,
    limit: perPage,
    refresh: refresh ? '1' : '0',
  })
  if (!response.data) {
    throw new Error('Release list data is empty')
  }
  return response.data
}

export const detectClientPlatform = (): ReleasePlatform => {
  if (!import.meta.client) return 'windows'
  const ua = navigator.userAgent.toLowerCase()
  if (/android/.test(ua)) {
    if (/armv7|armeabi/.test(ua)) return 'android-armeabi-v7a'
    if (/x86_64|x64/.test(ua)) return 'android-x86_64'
    if (/i686|x86/.test(ua)) return 'android-i686'
    return 'android-arm64-v8a'
  }
  if (/iphone|ipad|ipod|ios/.test(ua)) return 'ios'
  if (/mac|darwin/.test(ua)) return 'macos'
  if (/linux|x11/.test(ua)) return 'linux'
  return 'windows'
}

export const pickReleaseAsset = (
  release: GithubRelease,
  platform: ReleasePlatform,
): GithubReleaseAsset | null => {
  const matcher = PLATFORM_MATCHERS[platform]
  const exactMatch = release.assets.find(asset => matcher(asset.name))
  if (exactMatch) return exactMatch

  const binaryAssets = release.assets.filter(isDownloadableAsset)
  if (binaryAssets.length === 0) return null

  if (platform.startsWith('android')) {
    return null
  }

  if (platform === 'windows') {
    return binaryAssets.find(asset => /desktop-windows/i.test(asset.name)) ?? null
  }

  if (platform === 'macos') {
    return binaryAssets.find(asset => /desktop-macos/i.test(asset.name)) ?? null
  }

  if (platform === 'linux') {
    return binaryAssets.find(asset => /desktop-linux/i.test(asset.name)) ?? null
  }

  if (platform === 'ios') {
    return null
  }

  return binaryAssets[0] ?? null
}

export const getLatestReleaseDownload = async (platform?: ReleasePlatform) => {
  const release = await fetchLatestGithubRelease()
  const currentPlatform = platform || detectClientPlatform()
  const asset = pickReleaseAsset(release, currentPlatform)
  return {
    platform: currentPlatform,
    release,
    asset,
  }
}
