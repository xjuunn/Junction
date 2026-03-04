<script setup lang="ts">
import {
  getGithubCommitDetail,
  getGithubInsights,
  type GithubCommitDetailData,
  type GithubInsightsData,
} from '~/api/github'
import { openExternalUrl } from '~/utils/link'

definePageMeta({
  layout: 'web',
})

const features = [
  {
    title: '统一沟通',
    desc: '消息、文件、表情、已读状态统一管理。',
    icon: 'mingcute:message-4-line',
  },
  {
    title: '稳定通话',
    desc: '基于 LiveKit 自建链路，支持语音、视频与屏幕共享。',
    icon: 'mingcute:video-line',
  },
  {
    title: 'AI 协作',
    desc: '统一 AI 封装，提供一致的接入方式。',
    icon: 'mingcute:ai-line',
  },
  {
    title: '跨端交付',
    desc: 'Tauri 多端构建，发布和部署路径更清晰。',
    icon: 'mingcute:windows-line',
  },
]

const toast = useToast()
const loadingInsights = ref(false)
const insights = ref<GithubInsightsData | null>(null)

const commitModalOpen = ref(false)
const commitModalLoading = ref(false)
const commitDetail = ref<GithubCommitDetailData | null>(null)

const repoStats = computed(() => {
  if (!insights.value) return []
  return [
    { label: 'Stars', value: insights.value.overview.stars.toLocaleString() },
    { label: 'Forks', value: insights.value.overview.forks.toLocaleString() },
    { label: 'Open Issues', value: insights.value.overview.openIssues.toLocaleString() },
    { label: 'Watchers', value: insights.value.overview.watchers.toLocaleString() },
  ]
})

const activityStats = computed(() => {
  if (!insights.value) return []
  return [
    { label: '近 7 天提交', value: String(insights.value.frequency.last7Days) },
    { label: '近 30 天提交', value: String(insights.value.frequency.last30Days) },
    { label: '周均提交', value: String(insights.value.frequency.avgPerWeek) },
    { label: '活跃天数(30天)', value: String(insights.value.frequency.activeDaysIn30Days) },
  ]
})

const importantMeta = computed(() => {
  if (!insights.value) return []
  return [
    { label: '默认分支', value: insights.value.overview.defaultBranch },
    { label: '主语言', value: insights.value.overview.language || 'Unknown' },
    { label: '最近推送', value: formatDate(insights.value.overview.pushedAt) },
    { label: '创建时间', value: formatDate(insights.value.overview.createdAt) },
  ]
})

const recentCommits = computed(() => {
  if (!insights.value) return []
  return insights.value.commits.slice(0, 8)
})

const topAuthors = computed(() => {
  if (!insights.value) return []
  return insights.value.topAuthors.slice(0, 6)
})

const formatDate = (value: string) => {
  const time = new Date(value)
  if (!Number.isFinite(time.getTime())) return '--'
  return time.toLocaleString('zh-CN')
}

const loadInsights = async (refresh = false) => {
  loadingInsights.value = true
  try {
    const res = await getGithubInsights({ refresh: refresh ? '1' : '0' })
    insights.value = res.data
  }
  catch {
    toast.error('加载仓库信息失败')
  }
  finally {
    loadingInsights.value = false
  }
}

const openCommitDetail = async (sha: string) => {
  commitModalOpen.value = true
  commitModalLoading.value = true
  commitDetail.value = null
  try {
    const res = await getGithubCommitDetail(sha)
    commitDetail.value = res.data
  }
  catch {
    toast.error('加载提交详情失败')
  }
  finally {
    commitModalLoading.value = false
  }
}

onMounted(() => {
  void loadInsights()
})
</script>

<template>
  <div class="min-h-screen w-full bg-transparent text-base-content flex flex-col relative overflow-x-hidden font-sans selection:bg-base-content/20 selection:text-base-content">
    
    <!-- 环境光晕背景 -->
    <div data-web-parallax-container>
      <div data-web-parallax="16" class="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/10 blur-[120px] pointer-events-none -z-10 mix-blend-multiply"></div>
    </div>
    <div data-web-parallax-container>
      <div data-web-parallax="-14" class="fixed bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-accent/10 blur-[120px] pointer-events-none -z-10 mix-blend-multiply"></div>
    </div>


    <main class="flex-1 flex flex-col items-center pt-48 pb-32 w-full max-w-5xl mx-auto px-6">
      
      <!-- 极简 Hero Section -->
      <section data-web-reveal class="flex flex-col items-center text-center w-full">
        <span class="px-5 py-1.5 rounded-full border border-base-content/10 bg-base-content/[0.02] backdrop-blur-md text-[10px] font-bold tracking-[0.2em] uppercase text-base-content/50 mb-10 shadow-sm">
          Junction 2026
        </span>
        <h1 class="text-5xl sm:text-6xl md:text-8xl font-medium tracking-tighter leading-[1.05] text-base-content">
          更清晰的<span class="text-base-content/30 font-light">协作体验</span>
        </h1>
        <p class="mt-8 text-sm md:text-base font-light text-base-content/50 max-w-2xl leading-relaxed tracking-wide">
          Junction 提供即时通信、实时通话和 AI 协作能力。页面同时集成仓库动态，让你在官网直接看到最近更新情况。
        </p>
        <div class="flex flex-col sm:flex-row items-center gap-4 mt-12">
          <NuxtLink to="/web/download" class="px-8 py-3.5 rounded-full bg-base-content text-base-100 text-sm font-medium tracking-wide hover:scale-105 active:scale-95 transition-transform duration-500 shadow-xl">
            下载客户端
          </NuxtLink>
          <NuxtLink to="/chat" class="px-8 py-3.5 rounded-full border border-base-content/10 bg-base-content/[0.02] backdrop-blur-md text-sm font-medium tracking-wide hover:bg-base-content/[0.05] transition-colors duration-500">
            立即使用
          </NuxtLink>
        </div>
      </section>

      <!-- 特性网格 -->
      <section data-web-reveal class="w-full mt-32 grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
        <article
          v-for="item in features"
          :key="item.title"
          class="group relative overflow-hidden p-8 lg:p-10 rounded-[2.5rem] bg-base-content/[0.02] border border-base-content/5 hover:bg-base-content/[0.04] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col items-start gap-6 shadow-sm"
        >
          <div class="w-14 h-14 rounded-2xl bg-base-content/[0.04] border border-base-content/5 flex items-center justify-center text-base-content/40 group-hover:scale-110 group-hover:text-base-content group-hover:bg-base-content/[0.06] transition-all duration-700 ease-out shrink-0">
            <Icon :name="item.icon" class="w-6 h-6" />
          </div>
          <div class="flex flex-col gap-2">
            <h2 class="text-xl font-medium tracking-tight text-base-content/90">{{ item.title }}</h2>
            <p class="text-sm font-light text-base-content/50 leading-relaxed tracking-wide">{{ item.desc }}</p>
          </div>
        </article>
      </section>

      <!-- GitHub Insights 区域 -->
      <section data-web-reveal class="w-full mt-32 rounded-[3rem] border border-base-content/5 bg-base-content/[0.01] p-8 md:p-12 lg:p-16 backdrop-blur-xl shadow-sm relative overflow-hidden group/insights">
        <div class="absolute inset-0 bg-gradient-to-b from-transparent to-base-content/[0.02] opacity-0 group-hover/insights:opacity-100 transition-opacity duration-1000 pointer-events-none -z-10"></div>
        
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 relative z-10">
          <div class="flex flex-col gap-2">
            <h2 class="text-3xl md:text-4xl font-medium tracking-tight text-base-content">仓库概览</h2>
            <p class="text-sm font-light text-base-content/40 tracking-widest uppercase">GITHUB REPOSITORY INSIGHTS</p>
          </div>
          <div class="flex items-center gap-3">
            <button class="flex items-center gap-2 px-5 py-2.5 rounded-full border border-base-content/10 bg-base-content/[0.02] text-xs font-semibold tracking-wider text-base-content/60 hover:text-base-content hover:bg-base-content/5 transition-all" :disabled="loadingInsights" @click="loadInsights(true)">
              <Icon v-if="loadingInsights" name="mingcute:loading-line" class="w-4 h-4 animate-spin" />
              <Icon v-else name="mingcute:refresh-2-line" class="w-4 h-4" />
              <span>刷新数据</span>
            </button>
            <button
              v-if="insights?.overview?.htmlUrl"
              class="flex items-center gap-2 px-6 py-2.5 rounded-full bg-base-content text-base-100 text-xs font-semibold tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-transform"
              @click="openExternalUrl(insights.overview.htmlUrl)"
            >
              <span>访问仓库</span>
              <Icon name="mingcute:external-link-line" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div v-if="loadingInsights && !insights" class="py-32 flex justify-center items-center">
          <span class="loading loading-spinner loading-lg text-base-content/20"></span>
        </div>

        <div v-else-if="insights" class="flex flex-col gap-12 relative z-10">
          
          <!-- 项目标题块 -->
          <div class="flex flex-col items-center text-center">
            <h3 class="text-2xl font-semibold tracking-tight text-base-content">{{ insights.overview.fullName }}</h3>
            <p class="mt-2 text-sm font-light text-base-content/50 max-w-lg">{{ insights.overview.description || '暂无描述信息' }}</p>
          </div>

          <!-- 核心数据网格 -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div v-for="item in repoStats" :key="item.label" class="flex flex-col p-6 rounded-3xl bg-base-content/[0.02] border border-base-content/5 items-center justify-center gap-2 hover:bg-base-content/[0.04] transition-colors">
              <span class="text-[10px] font-bold tracking-[0.2em] text-base-content/30 uppercase">{{ item.label }}</span>
              <span class="text-3xl font-light tracking-tighter text-base-content">{{ item.value }}</span>
            </div>
            
            <div v-for="item in activityStats" :key="item.label" class="flex flex-col p-6 rounded-3xl bg-base-content/[0.02] border border-base-content/5 items-center justify-center gap-2 hover:bg-base-content/[0.04] transition-colors">
              <span class="text-[10px] font-bold tracking-[0.2em] text-base-content/30 uppercase">{{ item.label }}</span>
              <span class="text-3xl font-light tracking-tighter text-base-content">{{ item.value }}</span>
            </div>
          </div>

          <!-- 元数据列表 -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div v-for="item in importantMeta" :key="item.label" class="flex flex-col px-6 py-4 rounded-2xl border border-base-content/5 bg-transparent justify-center gap-1">
              <span class="text-[10px] font-medium tracking-widest text-base-content/40 uppercase">{{ item.label }}</span>
              <span class="text-sm font-medium text-base-content/80 truncate">{{ item.value }}</span>
            </div>
          </div>

          <div class="w-full h-px bg-base-content/5"></div>

          <!-- 作者与提交区域 -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            
            <!-- 活跃作者 -->
            <div class="flex flex-col gap-6">
              <h3 class="text-xs font-bold tracking-[0.2em] text-base-content/30 uppercase pl-2">Top Contributors</h3>
              <div class="flex flex-col gap-2">
                <div
                  v-for="author in topAuthors"
                  :key="`${author.login || author.name}-${author.commits}`"
                  class="group flex items-center justify-between p-4 rounded-2xl hover:bg-base-content/[0.03] transition-colors duration-300"
                >
                  <div class="flex items-center gap-4 min-w-0">
                    <div class="w-10 h-10 rounded-full bg-base-content/5 overflow-hidden shrink-0 border border-base-content/10">
                      <img v-if="author.avatar" :src="author.avatar" :alt="author.name" class="w-full h-full object-cover">
                      <Icon v-else name="mingcute:user-4-fill" class="w-full h-full p-2 text-base-content/20" />
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="text-sm font-semibold text-base-content/90 truncate">{{ author.name }}</span>
                      <span class="text-xs font-light text-base-content/40 truncate">{{ author.login || 'unknown' }}</span>
                    </div>
                  </div>
                  <div class="flex flex-col items-end shrink-0">
                    <span class="text-lg font-medium text-base-content">{{ author.commits }}</span>
                    <span class="text-[9px] font-bold tracking-widest text-base-content/30 uppercase">Commits</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 最近提交 -->
            <div class="flex flex-col gap-6">
              <h3 class="text-xs font-bold tracking-[0.2em] text-base-content/30 uppercase pl-2">Recent Activity</h3>
              <div class="flex flex-col gap-2">
                <div
                  v-for="commit in recentCommits"
                  :key="commit.sha"
                  class="group flex flex-col gap-3 p-5 rounded-2xl bg-base-content/[0.02] border border-base-content/5 hover:bg-base-content/[0.04] hover:border-base-content/10 transition-all duration-300 cursor-pointer"
                  @click="openCommitDetail(commit.sha)"
                >
                  <p class="text-sm font-medium text-base-content/90 line-clamp-2 leading-relaxed group-hover:text-base-content transition-colors">{{ commit.message }}</p>
                  <div class="flex items-center justify-between mt-auto pt-2 border-t border-base-content/5">
                    <div class="flex items-center gap-3 text-[11px] font-mono text-base-content/40">
                      <span class="px-2 py-0.5 rounded-md bg-base-content/5">{{ commit.shortSha }}</span>
                      <span class="truncate max-w-[100px]">{{ commit.authorName }}</span>
                    </div>
                    <span class="text-[10px] font-medium text-base-content/30 tracking-wider">{{ formatDate(commit.committedAt).split(' ')[0] }}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </main>

    <!-- 极简提交详情 Modal (使用 DaisyUI 风格结构但覆盖样式) -->
    <BaseModal v-model="commitModalOpen" title="Commit Details" box-class="max-w-2xl bg-base-100/90 backdrop-blur-3xl border border-base-content/10 rounded-[2rem] shadow-2xl p-0 overflow-hidden">
      <template #default>
        <div class="p-8 md:p-10 flex flex-col gap-8">
          <div v-if="commitModalLoading" class="py-20 flex justify-center">
            <span class="loading loading-spinner loading-md text-base-content/20" />
          </div>
          
          <template v-else-if="commitDetail">
            <!-- Message & SHA -->
            <div class="flex flex-col gap-4">
              <p class="text-lg md:text-xl font-medium text-base-content leading-relaxed whitespace-pre-wrap">{{ commitDetail.commit.message }}</p>
              <div class="flex items-center gap-3">
                <span class="px-3 py-1 rounded-lg bg-base-content/5 text-xs font-mono text-base-content/60 border border-base-content/10">{{ commitDetail.sha.substring(0, 7) }}</span>
                <span class="text-xs font-light text-base-content/40">·</span>
                <span class="text-xs font-medium text-base-content/60">{{ commitDetail.commit.author?.name || 'Unknown' }}</span>
              </div>
            </div>

            <div class="w-full h-px bg-base-content/5"></div>

            <!-- Stats -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div class="flex flex-col p-4 rounded-2xl bg-success/5 border border-success/10 justify-center">
                <span class="text-[10px] font-bold tracking-widest text-success/60 uppercase mb-1">Additions</span>
                <span class="text-2xl font-light text-success">+{{ commitDetail.stats?.additions ?? 0 }}</span>
              </div>
              <div class="flex flex-col p-4 rounded-2xl bg-error/5 border border-error/10 justify-center">
                <span class="text-[10px] font-bold tracking-widest text-error/60 uppercase mb-1">Deletions</span>
                <span class="text-2xl font-light text-error">-{{ commitDetail.stats?.deletions ?? 0 }}</span>
              </div>
              <div class="flex flex-col p-4 rounded-2xl bg-base-content/5 border border-base-content/5 justify-center">
                <span class="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-1">Total</span>
                <span class="text-2xl font-light text-base-content">{{ commitDetail.stats?.total ?? 0 }}</span>
              </div>
              <div class="flex flex-col p-4 rounded-2xl bg-base-content/5 border border-base-content/5 justify-center">
                <span class="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-1">Files</span>
                <span class="text-2xl font-light text-base-content">{{ commitDetail.files?.length ?? 0 }}</span>
              </div>
            </div>

            <!-- Full SHA -->
            <div class="flex flex-col p-4 rounded-2xl bg-base-content/[0.02] border border-base-content/5 gap-2">
              <span class="text-[10px] font-bold tracking-widest text-base-content/30 uppercase">Full SHA Signature</span>
              <span class="text-xs font-mono text-base-content/50 break-all leading-relaxed">{{ commitDetail.sha }}</span>
            </div>

            <!-- Action -->
            <div class="flex justify-end pt-4">
              <button class="flex items-center gap-2 px-6 py-3 rounded-full bg-base-content text-base-100 text-sm font-medium tracking-wide hover:scale-105 active:scale-95 transition-transform" @click="openExternalUrl(commitDetail.html_url)">
                <span>View on GitHub</span>
                <Icon name="mingcute:external-link-line" class="w-4 h-4" />
              </button>
            </div>
          </template>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
/* 隐藏原生详情标记 */
details > summary::-webkit-details-marker {
  display: none;
}
/* 自定义滚动条 (如需) */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: oklch(var(--bc) / 0.1);
  border-radius: 4px;
}
</style>
