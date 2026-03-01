<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { openExternalUrl } from '~/utils/link'

const toast = useToast()
const { copy } = useClipboard()

const appName = 'Junction'
const appVersion = '1.0.0'
const buildDate = '2026-02-02'

const linkItems = [
  {
    title: '代码仓库',
    description: '查看项目源码、路线图与版本历史',
    url: 'https://github.com/xjuunn/Junction',
    icon: 'mingcute:github-line'
  },
  {
    title: '问题追踪',
    description: '提交程序缺陷与改进建议',
    url: 'https://github.com/xjuunn/Junction/issues',
    icon: 'mingcute:bug-line'
  },
  {
    title: '版本发布',
    description: '查看历史版本与详细更新说明',
    url: 'https://github.com/xjuunn/Junction/releases',
    icon: 'mingcute:rocket-line'
  },
  {
    title: '作者主页',
    description: '访问开发者主页与更多开源项目',
    url: 'https://github.com/xjuunn',
    icon: 'mingcute:user-4-line'
  },
]

const supportItems = [
  { title: '提交缺陷报告', url: 'https://github.com/xjuunn/Junction/issues/new?template=bug_report.md', icon: 'mingcute:warning-line' },
  { title: '提出功能建议', url: 'https://github.com/xjuunn/Junction/issues/new?template=feature_request.md', icon: 'mingcute:ai-line' },
]

const copyBuildInfo = async () => {
  await copy(`应用名称: ${appName}\n当前版本: ${appVersion}\n构建日期: ${buildDate}`)
  toast.success('构建信息已复制到剪贴板')
}
</script>

<template>
  <div
    class="min-h-full w-full bg-transparent flex justify-center items-start p-4 sm:p-8 font-sans text-base-content selection:bg-base-content/20 overflow-y-auto">
    <div class="w-full max-w-2xl flex flex-col gap-8">

      <section
        class="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 sm:p-8 rounded-[2rem] bg-base-content/[0.02] border border-base-content/5 shadow-sm">
        <div
          class="w-20 h-20 rounded-2xl bg-base-content/[0.04] border border-base-content/10 flex items-center justify-center shrink-0 group">
          <Icon name="mingcute:asterisk-fill" size="3rem"
            class="w-10 h-10 text-base-content/80 group-hover:rotate-180 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" />
        </div>

        <div class="flex flex-col items-center sm:items-start flex-1 gap-4">
          <div class="text-center sm:text-left space-y-1">
            <h1 class="text-2xl font-bold tracking-tight text-base-content">{{ appName }}</h1>
            <p class="text-sm font-medium text-base-content/50">企业级实时沟通与协作体验</p>
          </div>

          <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span
              class="px-3 py-1.5 rounded-lg bg-base-content/[0.03] border border-base-content/5 text-xs font-medium text-base-content/70">
              版本 {{ appVersion }}
            </span>
            <span
              class="px-3 py-1.5 rounded-lg bg-base-content/[0.03] border border-base-content/5 text-xs font-medium text-base-content/70">
              构建于 {{ buildDate }}
            </span>
            <button
              class="px-3.5 py-1.5 rounded-lg bg-base-content text-base-100 text-xs font-semibold hover:opacity-85 active:scale-95 transition-all duration-200 flex items-center gap-1.5 shadow-md shadow-base-content/10 ml-1"
              @click="copyBuildInfo">
              <Icon name="mingcute:copy-2-line" class="w-3.5 h-3.5" />
              <span>复制信息</span>
            </button>
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-xs font-bold text-base-content/40 tracking-wider pl-2">官方链接</h2>
        <div
          class="flex flex-col bg-base-content/[0.02] border border-base-content/5 rounded-3xl overflow-hidden shadow-sm">
          <button v-for="(item, index) in linkItems" :key="item.title"
            class="group flex items-center gap-4 p-4 hover:bg-base-content/[0.04] transition-colors duration-300 w-full text-left"
            :class="{ 'border-b border-base-content/5': index !== linkItems.length - 1 }"
            @click="openExternalUrl(item.url)">
            <div
              class="w-10 h-10 rounded-xl bg-base-content/[0.04] border border-base-content/5 flex items-center justify-center shrink-0 group-hover:bg-base-content text-base-content/60 group-hover:text-base-100 transition-all duration-300">
              <Icon :name="item.icon" class="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div class="flex-1 min-w-0 flex flex-col gap-0.5">
              <h3 class="text-sm font-semibold text-base-content/90">{{ item.title }}</h3>
              <p class="text-xs text-base-content/50 truncate">{{ item.description }}</p>
            </div>
            <Icon name="mingcute:right-line"
              class="w-4 h-4 text-base-content/20 group-hover:text-base-content/60 group-hover:translate-x-1 transition-all duration-300 shrink-0" />
          </button>
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-xs font-bold text-base-content/40 tracking-wider pl-2">支持与反馈</h2>
        <div
          class="flex flex-col bg-base-content/[0.02] border border-base-content/5 rounded-3xl overflow-hidden shadow-sm">
          <button v-for="(item, index) in supportItems" :key="item.title"
            class="group flex items-center gap-4 p-4 hover:bg-base-content/[0.04] transition-colors duration-300 w-full text-left"
            :class="{ 'border-b border-base-content/5': index !== supportItems.length - 1 }"
            @click="openExternalUrl(item.url)">
            <div
              class="w-10 h-10 rounded-xl bg-base-content/[0.04] border border-base-content/5 flex items-center justify-center shrink-0 group-hover:bg-base-content text-base-content/60 group-hover:text-base-100 transition-all duration-300">
              <Icon :name="item.icon" class="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-semibold text-base-content/90">{{ item.title }}</h3>
            </div>
            <Icon name="mingcute:external-link-line"
              class="w-4 h-4 text-base-content/20 group-hover:text-base-content/60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 shrink-0" />
          </button>
        </div>
      </section>

    </div>
  </div>
</template>