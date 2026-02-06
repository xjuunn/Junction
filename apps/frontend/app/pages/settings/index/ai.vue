<script setup lang="ts">
import { useSettingsStore } from '~/stores/settings'
import type { AiProviderRuntimeConfig, AiRuntimeConfig } from '~/utils/ai'

const toast = useToast()
const settings = useSettingsStore()
const runtimeConfig = useRuntimeConfig()
const aiRuntimeConfig = computed(() => runtimeConfig.public?.ai as AiRuntimeConfig | undefined)

const providerOptions = [
  { value: 'deepseek', label: 'Deepseek' },
]

const isSaving = ref(false)
const showApiKey = ref(false)

const defaultProviderId = computed(() => aiRuntimeConfig.value?.defaultProvider || 'deepseek')
const fallbackProviderId = computed(() => settings.aiProviderId || defaultProviderId.value)
const fallbackProviderConfig = computed<AiProviderRuntimeConfig>(() => {
  const providers = aiRuntimeConfig.value?.providers || {}
  return providers[fallbackProviderId.value] || {
    apiKey: '',
    baseUrl: '',
    defaultModel: '',
  }
})

/**
 * 保存 AI 配置
 */
async function handleSave() {
  isSaving.value = true
  await new Promise(resolve => setTimeout(resolve, 300))
  toast.success('当前为后端托管模式，前端不保存 API Key')
  isSaving.value = false
}

/**
 * 清空客户端 AI 配置
 */
function handleClear() {
  settings.aiProviderId = ''
  settings.aiApiKey = ''
  settings.aiBaseUrl = ''
  settings.aiDefaultModel = ''
  toast.success('已清空本地配置')
}

/**
 * 切换 API Key 可见性
 */
function toggleApiKeyVisible() {
  showApiKey.value = !showApiKey.value
}
</script>

<template>
  <div class="card bg-base-100 shadow-sm border border-base-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div class="card-body p-6 md:p-8">
      <h2 class="card-title text-lg border-b border-base-200 pb-4 mb-6 flex items-center gap-2">
        <Icon name="mingcute:ai-line" class="text-primary" />
        AI 设置
      </h2>

      <div class="space-y-8 max-w-2xl">
        <div class="rounded-2xl border border-base-200 bg-base-100/60 p-4 md:p-5 space-y-4">
          <div class="text-sm font-bold">客户端 API Key</div>
          <div class="text-sm text-base-content/60">
            该配置仅保存在本地设备，不会同步到服务器。留空时使用系统默认配置。
          </div>

          <div class="form-control w-full">
            <label class="label">
              <span class="label-text font-bold">提供方</span>
            </label>
            <select v-model="settings.aiProviderId" class="select select-bordered w-full focus:select-primary bg-base-100">
              <option value="">使用默认（{{ defaultProviderId }}）</option>
              <option v-for="opt in providerOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <label class="label">
              <span class="label-text-alt text-base-content/50">默认提供方：{{ defaultProviderId }}</span>
            </label>
          </div>

          <div class="form-control w-full">
            <label class="label">
              <span class="label-text font-bold">API Key</span>
            </label>
            <div class="join w-full">
              <input v-model="settings.aiApiKey" :type="showApiKey ? 'text' : 'password'"
                class="input input-bordered join-item w-full bg-base-100" placeholder="请输入你的 API Key" />
              <button class="btn btn-ghost join-item" type="button" @click="toggleApiKeyVisible">
                {{ showApiKey ? '隐藏' : '显示' }}
              </button>
            </div>
            <label class="label">
              <span class="label-text-alt text-base-content/50">
                未填写时使用默认配置
              </span>
            </label>
          </div>

          <div class="form-control w-full">
            <label class="label">
              <span class="label-text font-bold">API Base URL</span>
            </label>
            <input v-model="settings.aiBaseUrl" type="text" class="input input-bordered w-full bg-base-100"
              placeholder="例如：https://api.deepseek.com" />
            <label class="label">
              <span class="label-text-alt text-base-content/50">
                默认值：{{ fallbackProviderConfig.baseUrl || '未配置' }}
              </span>
            </label>
          </div>

          <div class="form-control w-full">
            <label class="label">
              <span class="label-text font-bold">默认模型</span>
            </label>
            <input v-model="settings.aiDefaultModel" type="text" class="input input-bordered w-full bg-base-100"
              placeholder="例如：deepseek-chat" />
            <label class="label">
              <span class="label-text-alt text-base-content/50">
                默认值：{{ fallbackProviderConfig.defaultModel || '未配置' }}
              </span>
            </label>
          </div>
        </div>
      </div>

      <div class="card-actions justify-end mt-10 pt-6 border-t border-base-200 gap-3">
        <button class="btn btn-ghost rounded-xl" @click="handleClear">
          清空本地配置
        </button>
        <button class="btn btn-primary px-8 rounded-xl min-w-[120px]" @click="handleSave" :disabled="isSaving">
          <span v-if="isSaving" class="loading loading-spinner loading-xs"></span>
          保存修改
        </button>
      </div>
    </div>
  </div>
</template>
