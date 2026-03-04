<script setup lang="ts">
import {
  detectClientPlatform,
  fetchGithubReleases,
  getLatestReleaseDownload,
  type GithubRelease,
  type GithubReleaseAsset,
  type ReleasePlatform,
} from '~/api/release'
import { openExternalUrl } from '~/utils/link'

definePageMeta({
  layout: 'web',
})

const toast = useToast()
const selectedPlatform = ref<ReleasePlatform>('windows')
const latestRelease = ref<GithubRelease | null>(null)
const releases = ref<GithubRelease[]>([])
const isLoadingLatest = ref(false)
const isLoadingReleases = ref(false)
const isDownloadingLatest = ref(false)

const latestTag = computed(() => latestRelease.value?.tag_name || '--')
const publishDate = computed(() => {
  const time = latestRelease.value?.published_at
  if (!time) return '--'
  return new Date(time).toLocaleDateString('zh-CN')
})

const platforms: { value: ReleasePlatform; label: string; icon: string }[] = [
  { value: 'windows', label: 'Windows', icon: 'mingcute:windows-fill' },
  { value: 'macos', label: 'macOS', icon: 'mingcute:computer-fill' },
  { value: 'linux', label: 'Linux', icon: 'mingcute:linux-fill' },
  { value: 'android-arm64-v8a', label: 'Android (ARM64)', icon: 'mingcute:android-fill' },
  { value: 'android-armeabi-v7a', label: 'Android (ARM32)', icon: 'mingcute:android-fill' },
  { value: 'android-x86_64', label: 'Android (x86_64)', icon: 'mingcute:android-fill' },
  { value: 'ios', label: 'iOS', icon: 'mingcute:apple-fill' },
]

const platformLabel = computed(() => platforms.find(item => item.value === selectedPlatform.value)?.label || '')

const formatSize = (size: number) => {
  if (!Number.isFinite(size) || size <= 0) return '--'
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`
}

const triggerBrowserDownload = (url: string) => {
  if (!import.meta.client) return
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.rel = 'noopener noreferrer'
  anchor.target = '_self'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

const handleDownloadAsset = (asset: GithubReleaseAsset) => {
  if (!asset.browser_download_url) return
  triggerBrowserDownload(asset.browser_download_url)
  toast.success(`开始下载 ${asset.name}`)
}

const handleDownloadLatest = async () => {
  if (isDownloadingLatest.value) return
  isDownloadingLatest.value = true
  try {
    const { release, asset } = await getLatestReleaseDownload(selectedPlatform.value)
    latestRelease.value = release
    if (!asset?.browser_download_url) {
      toast.warning(`当前版本暂无 ${platformLabel.value} 对应安装包`)
      await openExternalUrl(release.html_url)
      return
    }
    handleDownloadAsset(asset)
  }
  catch {
    toast.error('下载失败，请稍后重试')
  }
  finally {
    isDownloadingLatest.value = false
  }
}

const loadLatestRelease = async () => {
  isLoadingLatest.value = true
  try {
    const { release } = await getLatestReleaseDownload(selectedPlatform.value)
    latestRelease.value = release
  }
  catch {
    toast.error('获取最新版本失败，请稍后重试')
  }
  finally {
    isLoadingLatest.value = false
  }
}

const loadReleases = async () => {
  isLoadingReleases.value = true
  try {
    releases.value = await fetchGithubReleases()
  }
  catch {
    toast.error('获取版本列表失败，请稍后重试')
  }
  finally {
    isLoadingReleases.value = false
  }
}

watch(selectedPlatform, () => {
  void loadLatestRelease()
})

onMounted(() => {
  selectedPlatform.value = detectClientPlatform()
  void loadLatestRelease()
  void loadReleases()
})
</script>

<template>
  <div
    class="min-h-screen w-full bg-transparent text-base-content flex flex-col relative overflow-x-hidden font-sans selection:bg-base-content/20 selection:text-base-content">

    <div data-web-parallax-container>
      <div
        data-web-parallax="20"
        class="fixed top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/10 blur-[140px] pointer-events-none -z-10 mix-blend-multiply">
      </div>
    </div>
    <div data-web-parallax-container>
      <div
        data-web-parallax="-18"
        class="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-info/10 blur-[140px] pointer-events-none -z-10 mix-blend-multiply">
      </div>
    </div>

    <main class="flex-1 flex flex-col items-center pt-40 pb-32 w-full max-w-4xl mx-auto px-6">

      <section data-web-reveal class="flex flex-col items-center text-center w-full mb-16">
        <div
          class="w-20 h-20 mb-8 rounded-[1.5rem] bg-base-content/[0.02] border border-base-content/5 flex items-center justify-center shadow-sm relative group cursor-default">
          <div
            class="absolute inset-0 bg-base-content/5 rounded-[1.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 ease-out pointer-events-none">
          </div>
          <Icon name="mingcute:asterisk-fill" size="1.8rem"
            class="w-8 h-8 text-base-content/80 group-hover:-translate-y-1 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" />
        </div>

        <h1 class="text-5xl sm:text-7xl font-light tracking-tighter text-base-content leading-none">获取客户端</h1>
        <p class="mt-6 text-sm font-medium tracking-[0.3em] uppercase text-base-content/40">全平台覆盖 · 始终保持最新</p>
      </section>

      <section data-web-reveal class="w-full relative group">
        <div
          class="absolute inset-0 bg-gradient-to-b from-transparent to-base-content/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none rounded-[3rem]">
        </div>
        <div
          class="relative z-10 flex flex-col items-center p-8 sm:p-12 lg:p-16 rounded-[3rem] bg-base-content/[0.02] border border-base-content/5 backdrop-blur-2xl transition-all duration-700 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:border-base-content/10">

          <div class="flex flex-wrap justify-center gap-2 mb-12 w-full max-w-3xl">
            <button v-for="item in platforms" :key="item.value"
              class="flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] font-bold tracking-wider transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] uppercase"
              :class="selectedPlatform === item.value ? 'bg-base-content text-base-100 shadow-xl scale-100' : 'bg-transparent text-base-content/40 hover:bg-base-content/5 hover:text-base-content scale-95 hover:scale-100 border border-transparent hover:border-base-content/5'"
              @click="selectedPlatform = item.value">
              <Icon :name="item.icon" class="w-4 h-4" />
              <span class="hidden sm:inline">{{ item.label }}</span>
            </button>
          </div>

          <div class="flex flex-col items-center text-center w-full">
            <span class="text-[10px] font-bold tracking-[0.4em] text-base-content/30 uppercase mb-4">最新发行版本</span>
            <div class="h-20 sm:h-24 flex items-center justify-center">
              <span v-if="isLoadingLatest" class="loading loading-dots loading-lg text-base-content/20"></span>
              <h2 v-else class="text-6xl sm:text-8xl font-light tracking-tighter text-base-content">{{ latestTag }}</h2>
            </div>
            <p class="mt-4 text-xs font-medium tracking-widest uppercase text-base-content/40">发布于 {{ publishDate }}</p>

            <button
              class="mt-12 group/btn relative flex items-center justify-center gap-4 overflow-hidden rounded-full bg-base-content px-10 sm:px-14 py-4 sm:py-5 font-bold tracking-widest uppercase text-base-100 text-xs sm:text-sm shadow-2xl transition-all duration-500 hover:scale-105 active:scale-95 w-full sm:w-auto"
              :disabled="isDownloadingLatest" @click="handleDownloadLatest">
              <div
                class="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]">
              </div>
              <span v-if="isDownloadingLatest" class="loading loading-spinner relative z-10 w-5 h-5"></span>
              <template v-else>
                <Icon name="mingcute:download-2-line"
                  class="relative z-10 w-5 h-5 group-hover/btn:-translate-y-0.5 transition-transform duration-500" />
                <span class="relative z-10">下载 {{ platformLabel }} 版</span>
              </template>
            </button>
          </div>
        </div>
      </section>

      <div class="w-full h-px bg-gradient-to-r from-transparent via-base-content/10 to-transparent my-20"></div>

      <section data-web-reveal class="w-full flex flex-col gap-8">
        <div class="flex items-end justify-between px-2 sm:px-6">
          <h2 class="text-xs font-bold uppercase tracking-[0.3em] text-base-content/40">历史版本归档</h2>
          <span class="text-[9px] font-bold uppercase tracking-[0.3em] text-base-content/20">All Releases</span>
        </div>

        <div v-if="isLoadingReleases" class="flex justify-center py-20">
          <span class="loading loading-spinner loading-lg text-base-content/20"></span>
        </div>

        <div v-else-if="releases.length === 0" class="flex flex-col items-center py-32 text-center opacity-30">
          <Icon name="mingcute:ghost-line" class="mb-6 h-16 w-16 font-light" />
          <p class="text-[10px] font-bold uppercase tracking-[0.4em]">暂无历史数据</p>
        </div>

        <div v-else class="flex flex-col gap-4">
          <details v-for="release in releases" :key="release.id"
            class="group overflow-hidden rounded-[2.5rem] bg-transparent border border-base-content/5 transition-all duration-500 hover:bg-base-content/[0.02] hover:border-base-content/10 [&::-webkit-details-marker]:hidden">
            <summary class="flex cursor-pointer list-none items-center justify-between p-6 sm:p-8 outline-none">
              <div class="flex items-center gap-6">
                <div
                  class="w-14 h-14 rounded-2xl bg-base-content/[0.03] border border-base-content/5 flex items-center justify-center text-base-content/30 group-hover:text-base-content/60 group-open:bg-base-content group-open:text-base-100 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] shrink-0">
                  <Icon name="mingcute:box-3-line"
                    class="w-6 h-6 group-open:scale-110 transition-transform duration-500" />
                </div>
                <div class="flex flex-col gap-1.5">
                  <div class="flex items-center gap-3">
                    <span class="text-xl font-medium tracking-tight text-base-content">{{ release.tag_name }}</span>
                    <span v-if="release.prerelease"
                      class="rounded-md bg-warning/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-warning border border-warning/20">预览版</span>
                    <span v-if="release.draft"
                      class="rounded-md bg-base-content/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-base-content/50 border border-base-content/10">草稿</span>
                  </div>
                  <span class="text-[11px] font-medium tracking-widest uppercase text-base-content/30">
                    {{ new Date(release.published_at).toLocaleDateString('zh-CN') }} · {{ release.assets.length }} 个构建物
                  </span>
                </div>
              </div>
              <div
                class="flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-base-content/30 transition-all duration-500 group-hover:bg-base-content/5 group-hover:text-base-content shrink-0">
                <Icon name="mingcute:add-line" class="h-5 w-5 transition-transform duration-500 group-open:rotate-45" />
              </div>
            </summary>

            <div class="px-6 sm:px-8 pb-8 pt-0">
              <div class="mb-6 ml-20 h-px w-[calc(100%-5rem)] bg-gradient-to-r from-base-content/10 to-transparent">
              </div>

              <div v-if="release.assets.length === 0"
                class="py-8 ml-20 text-[10px] font-bold uppercase tracking-[0.3em] text-base-content/20">
                该版本无可用下载项
              </div>

              <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 ml-0 sm:ml-20">
                <div v-for="asset in release.assets" :key="asset.name"
                  class="group/asset flex items-center justify-between rounded-[1.5rem] border border-base-content/5 bg-base-content/[0.01] p-4 sm:p-5 transition-all duration-300 hover:bg-base-content/[0.03] hover:border-base-content/15 cursor-pointer"
                  @click="handleDownloadAsset(asset)">
                  <div class="min-w-0 pr-4 flex flex-col gap-1">
                    <p
                      class="truncate text-sm font-medium text-base-content/70 transition-colors duration-300 group-hover/asset:text-base-content">
                      {{ asset.name }}
                    </p>
                    <p class="font-mono text-[10px] text-base-content/30 tracking-widest">{{ formatSize(asset.size) }}
                    </p>
                  </div>
                  <div
                    class="h-10 w-10 shrink-0 rounded-full bg-base-content/5 text-base-content/40 transition-all duration-500 flex items-center justify-center group-hover/asset:bg-base-content group-hover/asset:text-base-100 group-hover/asset:shadow-md">
                    <Icon name="mingcute:download-2-line"
                      class="h-4 w-4 group-hover/asset:translate-y-0.5 transition-transform duration-300" />
                  </div>
                </div>
              </div>
            </div>
          </details>
        </div>
      </section>

    </main>
  </div>
</template>
