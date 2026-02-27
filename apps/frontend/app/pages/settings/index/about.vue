<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { openExternalUrl } from '~/utils/link'

const { copy } = useClipboard()
const toast = useToast()

const appName = 'Junction'
const appVersion = '1.0.0'
const buildDate = '2026-02-02'

const links = [
  { name: '官方网站', url: 'https://junction.app', icon: 'mingcute:global-line' },
  { name: '帮助文档', url: 'https://docs.junction.app', icon: 'mingcute:book-line' },
  { name: 'GitHub', url: 'https://github.com/junction', icon: 'mingcute:github-line' },
  { name: '问题反馈', url: 'https://github.com/junction/issues', icon: 'mingcute:feedback-line' },
]

const techStack = [
  { name: 'Nuxt 4', description: '前端框架' },
  { name: 'Vue 3', description: 'UI 框架' },
  { name: 'NestJS', description: '服务端框架' },
  { name: 'Prisma', description: '数据访问层' },
  { name: 'Tauri', description: '桌面运行时' },
  { name: 'Tailwind CSS', description: '样式系统' },
]

const legalLinks = [
  { name: 'MIT License', url: 'https://opensource.org/licenses/MIT', icon: 'mingcute:document-line' },
  { name: '隐私政策', url: 'https://github.com/junction/junction/blob/main/PRIVACY.md', icon: 'mingcute:shield-line' },
  { name: '服务条款', url: 'https://github.com/junction/junction/blob/main/TERMS.md', icon: 'mingcute:scales-line' },
]

const handleCopyVersion = async () => {
  await copy(`Version: ${appVersion}\nBuild: ${buildDate}`)
  toast.success('版本信息已复制')
}
</script>

<template>
  <div class="card border border-base-content/10 bg-base-100/20 shadow-none backdrop-blur-md">
    <div class="card-body p-5 md:p-7">
      <h2 class="card-title mb-4 flex items-center gap-2 border-b border-base-content/10 pb-4 text-lg">
        <Icon name="mingcute:information-line" class="text-primary" />
        关于 Junction
      </h2>

      <div class="space-y-6">
        <section class="rounded-2xl border border-base-content/10 bg-base-100/20 p-5">
          <div class="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div class="flex items-center gap-4">
              <div class="grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary">
                <span class="text-2xl font-bold">J</span>
              </div>
              <div>
                <div class="text-xl font-bold">{{ appName }}</div>
                <div class="text-sm text-base-content/60">连接一切，沟通无界</div>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="badge badge-primary badge-soft">v{{ appVersion }}</span>
              <button class="btn btn-soft btn-sm" @click="handleCopyVersion">
                <Icon name="mingcute:copy-line" />
                复制版本
              </button>
            </div>
          </div>
        </section>

        <section>
          <div class="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Icon name="mingcute:link-line" class="text-base-content/60" />
            快捷入口
          </div>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button v-for="link in links" :key="link.name"
              class="btn btn-soft justify-start gap-3"
              @click="openExternalUrl(link.url)">
              <Icon :name="link.icon" size="18" />
              {{ link.name }}
            </button>
          </div>
        </section>

        <section>
          <div class="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Icon name="mingcute:stack-line" class="text-base-content/60" />
            技术栈
          </div>
          <div class="flex flex-wrap gap-2">
            <span v-for="tech in techStack" :key="tech.name"
              class="badge badge-soft gap-2 border border-base-content/10 px-3 py-3">
              <span class="font-medium">{{ tech.name }}</span>
              <span class="text-base-content/60">{{ tech.description }}</span>
            </span>
          </div>
        </section>

        <section class="rounded-2xl border border-base-content/10 bg-base-100/20 p-4">
          <div class="mb-3 text-sm font-semibold">开源与协议</div>
          <div class="flex flex-wrap gap-2">
            <button v-for="item in legalLinks" :key="item.name"
              class="btn btn-soft btn-sm"
              @click="openExternalUrl(item.url)">
              <Icon :name="item.icon" />
              {{ item.name }}
            </button>
          </div>
          <div class="mt-3 text-xs text-base-content/60">Build: {{ buildDate }}</div>
        </section>
      </div>
    </div>
  </div>
</template>
