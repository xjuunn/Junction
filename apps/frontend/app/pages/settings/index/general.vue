<script setup lang="ts">
import { isTauri } from '~/utils/check'

const toast = useToast()
const settings = useSettingsStore()

const languageOptions = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'ja-JP', label: '日本語' },
]

const timezoneOptions = [
  { value: 'Asia/Shanghai', label: '北京时间 (UTC+8)' },
  { value: 'Asia/Tokyo', label: '东京时间 (UTC+9)' },
  { value: 'America/New_York', label: '纽约时间 (UTC-5)' },
  { value: 'Europe/London', label: '伦敦时间 (UTC+0)' },
]

const dateFormatOptions = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
]

const timeFormatOptions = [
  { value: '12h', label: '12小时制（上午/下午）' },
  { value: '24h', label: '24小时制' },
]

const isSaving = ref(false)
const isTauriEnv = isTauri()
const isSelectingDir = ref(false)

const selectDownloadDir = async () => {
  if (!isTauriEnv || isSelectingDir.value) return
  isSelectingDir.value = true
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const result = await open({
      title: '选择保存目录',
      directory: true,
      multiple: false,
    })
    if (typeof result === 'string' && result.trim()) {
      settings.downloadPath = result.trim()
    }
  } catch (err: any) {
    toast.error(err?.message || '选择目录失败')
  } finally {
    isSelectingDir.value = false
  }
}

async function handleSave() {
  isSaving.value = true
  await new Promise(resolve => setTimeout(resolve, 300))
  toast.success('设置已保存')
  isSaving.value = false
}
</script>

<template>
  <div class="card bg-base-100 shadow-sm border border-base-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div class="card-body p-6 md:p-8">
      <h2 class="card-title text-lg border-b border-base-200 pb-4 mb-6 flex items-center gap-2">
        <Icon name="mingcute:settings-3-line" class="text-primary" />
        通用设置
      </h2>

      <div class="space-y-8 max-w-2xl">
        <div class="form-control w-full">
          <label class="label">
            <span class="label-text font-bold">语言</span>
          </label>
          <select v-model="settings.language" class="select select-bordered w-full focus:select-primary bg-base-100">
            <option v-for="opt in languageOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <label class="label">
            <span class="label-text-alt text-base-content/50">选择界面显示语言</span>
          </label>
        </div>

        <div class="form-control w-full">
          <label class="label">
            <span class="label-text font-bold">时区</span>
          </label>
          <select v-model="settings.timezone" class="select select-bordered w-full focus:select-primary bg-base-100">
            <option v-for="opt in timezoneOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <label class="label">
            <span class="label-text-alt text-base-content/50">用于时间显示与通知调度</span>
          </label>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-control w-full">
            <label class="label">
              <span class="label-text font-bold">日期格式</span>
            </label>
            <select v-model="settings.dateFormat"
              class="select select-bordered w-full focus:select-primary bg-base-100">
              <option v-for="opt in dateFormatOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div class="form-control w-full">
            <label class="label">
              <span class="label-text font-bold">时间格式</span>
            </label>
            <select v-model="settings.timeFormat"
              class="select select-bordered w-full focus:select-primary bg-base-100">
              <option v-for="opt in timeFormatOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <div v-if="isTauriEnv" class="rounded-2xl border border-base-200 bg-base-100/60 p-4 md:p-5">
          <div class="flex flex-col sm:flex-row sm:items-start gap-4">
            <div class="flex-1 space-y-2">
              <div class="text-sm font-bold">文件保存路径</div>
              <input v-model="settings.downloadPath" type="text" class="input input-bordered w-full bg-base-100"
                placeholder="例如：D:\\Downloads" />
              <div class="text-xs text-base-content/50">
                仅在 Tauri 环境生效，用于文件消息下载的默认保存目录。留空时自动使用系统下载目录。
              </div>
            </div>
            <div class="flex gap-2 sm:flex-col self-center">
              <button class="btn btn-ghost btn-sm" @click="selectDownloadDir" :disabled="isSelectingDir">
                <span v-if="isSelectingDir" class="loading loading-spinner loading-xs"></span>
                选择路径
              </button>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-4">
            <input v-model="settings.autoCheckUpdate" type="checkbox" class="toggle toggle-primary" />
            <span class="label-text">
              <span class="font-bold">自动检查更新</span>
              <br />
              <span class="text-sm text-base-content/50">在应用启动时自动检查是否有新版本</span>
            </span>
          </label>
        </div>

        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-4">
            <input v-model="settings.startMinimizedToTray" type="checkbox" class="toggle toggle-primary" />
            <span class="label-text">
              <span class="font-bold">启动时最小化到托盘</span>
              <br />
              <span class="text-sm text-base-content/50">启动应用时最小化到系统托盘而不是显示窗口</span>
            </span>
          </label>
        </div>
      </div>

      <div class="card-actions justify-end mt-10 pt-6 border-t border-base-200">
        <button class="btn btn-primary px-8 rounded-xl min-w-[120px]" @click="handleSave" :disabled="isSaving">
          <span v-if="isSaving" class="loading loading-spinner loading-xs"></span>
          保存更改
        </button>
      </div>
    </div>
  </div>
</template>
