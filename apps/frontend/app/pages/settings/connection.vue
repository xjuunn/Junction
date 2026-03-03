<script setup lang="ts">
import { normalizeEndpointUrl, probeBackendReachability, resolveRuntimeApiBaseUrl } from '~/utils/backend-endpoint'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter();
const toast = useToast()
const settings = useSettingsStore()

const runtimeApiBase = computed(() => resolveRuntimeApiBaseUrl())

const form = reactive({
  backendServerUrl: settings.backendServerUrl || runtimeApiBase.value,
})

const testing = ref(false)
const saving = ref(false)
const testResult = ref<{ ok: boolean; status?: number } | null>(null)

const normalizeHttpInput = (value: string) => normalizeEndpointUrl(value, { defaultProtocol: 'http' })
const normalizeWsInput = (value: string) => normalizeEndpointUrl(value, { defaultProtocol: 'wss' })

const normalizedServerUrl = computed(() => normalizeHttpInput(form.backendServerUrl))
const canSave = computed(() => !!normalizedServerUrl.value)

const handleBack = () => {
  // const target = String(route.query.from || '/')
  // navigateTo(target, { replace: true })
  router.back();
}

const socketEndpoint = computed(() => {
  const base = normalizedServerUrl.value
  if (!base) return ''
  try {
    const parsed = new URL(base)
    return `${parsed.protocol}//${parsed.host}/app`
  } catch {
    return ''
  }
})

const livekitEndpoint = computed(() => {
  const base = normalizedServerUrl.value
  if (!base) return ''
  try {
    const parsed = new URL(base)
    const protocol = parsed.protocol === 'https:' ? 'wss' : 'ws'
    return `${protocol}://${parsed.hostname}:7880`
  } catch {
    return ''
  }
})

async function testConnection(candidate?: string) {
  const endpoint = normalizeHttpInput(candidate ?? form.backendServerUrl)
  if (!endpoint) {
    toast.warning('请先填写服务器地址')
    return false
  }

  testing.value = true
  try {
    const result = await probeBackendReachability({ baseUrl: endpoint, timeoutMs: 3500 })
    testResult.value = { ok: result.reachable, status: result.status }
    if (!result.reachable) {
      toast.error('连接失败，请检查服务器地址与端口')
      return false
    }
    toast.success('服务器连接正常')
    return true
  } finally {
    testing.value = false
  }
}

function resetToBuildDefaults() {
  form.backendServerUrl = runtimeApiBase.value
  testResult.value = null
}

async function saveAndRetry() {
  const backendServerUrl = normalizedServerUrl.value
  if (!backendServerUrl) {
    toast.error('服务器地址格式无效')
    return
  }

  saving.value = true
  try {
    const ok = await testConnection(backendServerUrl)
    if (!ok) return

    settings.backendServerUrl = backendServerUrl
    settings.assetBaseUrl = ''
    settings.livekitBaseUrl = normalizeWsInput(livekitEndpoint.value)
    if (import.meta.client) {
      window.localStorage.setItem('junction.backendServerUrl', settings.backendServerUrl || '')
      window.localStorage.removeItem('junction.assetBaseUrl')
      window.localStorage.setItem('junction.livekitBaseUrl', settings.livekitBaseUrl || '')
    }

    toast.success('配置已保存，正在应用')
    // const from = String(route.query.from || '/')
    // const fallback = '/'
    // const target = from.startsWith('/no-signal') || from.startsWith('/settings/connection')
    //   ? fallback
    //   : from
    // await navigateTo(target)
    router.back();
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-full bg-transparent px-4 py-8">
    <div class="mx-auto w-full max-w-2xl">
      <section class="rounded-2xl border border-base-content/10 bg-base-100/80 p-6 shadow-sm backdrop-blur-md md:p-7">
        <header class="mb-6">
          <button class="btn btn-ghost btn-sm mb-3 rounded-lg px-2" @click="handleBack">
            <Icon name="mingcute:left-line" size="16" />
            返回
          </button>
          <h1 class="text-xl font-semibold tracking-tight">连接设置</h1>
          <p class="mt-1 text-sm text-base-content/60">更新服务器地址后继续使用应用。</p>
        </header>

        <div class="grid grid-cols-1 gap-4">
          <label class="form-control">
            <div class="label py-1">
              <span class="label-text text-sm font-medium">服务器地址</span>
            </div>
            <input v-model="form.backendServerUrl" type="text" class="input input-bordered h-11 rounded-xl bg-base-100"
              placeholder="例如 10.105.86.133:8080 或 api.example.com" />
          </label>
        </div>

        <div class="mt-5 rounded-xl border border-base-content/10 bg-base-200/45 p-4">
          <div class="grid grid-cols-1 gap-3">
            <label class="form-control">
              <span class="mb-1 text-xs font-medium text-base-content/65">Socket 地址</span>
              <input :value="socketEndpoint || '请先填写服务器地址'" type="text"
                class="input input-bordered h-10 rounded-lg bg-base-100/70 text-sm" readonly />
            </label>
            <label class="form-control">
              <span class="mb-1 text-xs font-medium text-base-content/65">LiveKit 地址</span>
              <input :value="livekitEndpoint || '请先填写服务器地址'" type="text"
                class="input input-bordered h-10 rounded-lg bg-base-100/70 text-sm" readonly />
            </label>
          </div>
        </div>

        <div class="mt-6 flex items-center gap-2">
          <button class="btn btn-primary btn-sm rounded-lg" :disabled="testing" @click="testConnection()">
            <span v-if="testing" class="loading loading-spinner loading-xs"></span>
            测试连接
          </button>
          <button class="btn btn-ghost btn-sm rounded-lg" @click="resetToBuildDefaults">
            恢复默认
          </button>
          <button class="btn btn-secondary btn-sm rounded-lg" :disabled="saving || !canSave" @click="saveAndRetry">
            <span v-if="saving" class="loading loading-spinner loading-xs"></span>
            保存并重试
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
