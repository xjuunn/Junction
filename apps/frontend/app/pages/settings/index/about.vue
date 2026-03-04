<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { openExternalUrl } from '~/utils/link'

const toast = useToast()
const { copy } = useClipboard()

const appName = 'Junction'
const appVersion = '0.1.1'
const buildDate = '2026-02-02'

const linkItems = [
  {
    title: '代码仓库',
    description: '查看项目源码、提交记录与开发进度',
    url: 'https://github.com/xjuunn/Junction',
    icon: 'mingcute:github-line',
  },
  {
    title: '问题追踪',
    description: '提交缺陷反馈与改进建议',
    url: 'https://github.com/xjuunn/Junction/issues',
    icon: 'mingcute:bug-line',
  },
  {
    title: '版本发布',
    description: '查看版本日志与更新说明',
    url: 'https://github.com/xjuunn/Junction/releases',
    icon: 'mingcute:rocket-line',
  },
  {
    title: '作者主页',
    description: '访问开发者主页与更多开源项目',
    url: 'https://github.com/xjuunn',
    icon: 'mingcute:user-4-line',
  },
]

const supportItems = [
  {
    title: '提交缺陷报告',
    url: 'https://github.com/xjuunn/Junction/issues/new?template=bug_report.md',
    icon: 'mingcute:warning-line',
  },
  {
    title: '提出功能建议',
    url: 'https://github.com/xjuunn/Junction/issues/new?template=feature_request.md',
    icon: 'mingcute:ai-line',
  },
]

const copyBuildInfo = async () => {
  await copy(`应用名称: ${appName}\n当前版本: ${appVersion}\n构建日期: ${buildDate}`)
  toast.success('构建信息已复制到剪贴板')
}
</script>

<template>
  <div
    class="min-h-full w-full overflow-y-auto bg-transparent p-4 font-sans text-base-content selection:bg-base-content/20 sm:p-8">
    <div class="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <section
        class="flex flex-col items-center gap-6 rounded-[2rem] border border-base-content/5 bg-base-content/[0.02] p-6 shadow-sm sm:flex-row sm:items-start sm:p-8">
        <div
          class="group flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-base-content/10 bg-base-content/[0.04]">
          <Icon name="mingcute:asterisk-fill" size="3rem"
            class="h-10 w-10 text-base-content/80 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-180" />
        </div>

        <div class="flex flex-1 flex-col items-center gap-4 sm:items-start">
          <div class="space-y-1 text-center sm:text-left">
            <h1 class="text-2xl font-bold tracking-tight text-base-content">{{ appName }}</h1>
            <p class="text-sm font-medium text-base-content/50">企业级实时沟通与协作体验</p>
          </div>

          <div class="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span
              class="rounded-lg border border-base-content/5 bg-base-content/[0.03] px-3 py-1.5 text-xs font-medium text-base-content/70">
              版本 {{ appVersion }}
            </span>
            <span
              class="rounded-lg border border-base-content/5 bg-base-content/[0.03] px-3 py-1.5 text-xs font-medium text-base-content/70">
              构建于 {{ buildDate }}
            </span>
            <button
              class="ml-1 flex items-center gap-1.5 rounded-lg bg-base-content px-3.5 py-1.5 text-xs font-semibold text-base-100 shadow-md shadow-base-content/10 transition-all duration-200 hover:opacity-85 active:scale-95"
              @click="copyBuildInfo">
              <Icon name="mingcute:copy-2-line" class="h-3.5 w-3.5" />
              <span>复制信息</span>
            </button>
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="pl-2 text-xs font-bold tracking-wider text-base-content/40">官方链接</h2>
        <div
          class="flex flex-col overflow-hidden rounded-3xl border border-base-content/5 bg-base-content/[0.02] shadow-sm">
          <button v-for="(item, index) in linkItems" :key="item.title"
            class="group flex w-full items-center gap-4 p-4 text-left transition-colors duration-300 hover:bg-base-content/[0.04]"
            :class="{ 'border-b border-base-content/5': index !== linkItems.length - 1 }"
            @click="openExternalUrl(item.url)">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-base-content/5 bg-base-content/[0.04] text-base-content/60 transition-all duration-300 group-hover:bg-base-content group-hover:text-base-100">
              <Icon :name="item.icon" class="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <h3 class="text-sm font-semibold text-base-content/90">{{ item.title }}</h3>
              <p class="truncate text-xs text-base-content/50">{{ item.description }}</p>
            </div>
            <Icon name="mingcute:right-line"
              class="h-4 w-4 shrink-0 text-base-content/20 transition-all duration-300 group-hover:translate-x-1 group-hover:text-base-content/60" />
          </button>
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="pl-2 text-xs font-bold tracking-wider text-base-content/40">支持与反馈</h2>
        <div
          class="flex flex-col overflow-hidden rounded-3xl border border-base-content/5 bg-base-content/[0.02] shadow-sm">
          <button v-for="(item, index) in supportItems" :key="item.title"
            class="group flex w-full items-center gap-4 p-4 text-left transition-colors duration-300 hover:bg-base-content/[0.04]"
            :class="{ 'border-b border-base-content/5': index !== supportItems.length - 1 }"
            @click="openExternalUrl(item.url)">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-base-content/5 bg-base-content/[0.04] text-base-content/60 transition-all duration-300 group-hover:bg-base-content group-hover:text-base-100">
              <Icon :name="item.icon" class="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="text-sm font-semibold text-base-content/90">{{ item.title }}</h3>
            </div>
            <Icon name="mingcute:external-link-line"
              class="h-4 w-4 shrink-0 text-base-content/20 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-base-content/60" />
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
