<script setup lang="ts">
import * as botApi from '~/api/ai-bot'
import { uploadFiles } from '~/api/upload'

const toast = useToast()
const dialog = useDialog()
type CreateBotInput = Parameters<typeof botApi.createBot>[0]
type UpdateBotInput = Parameters<typeof botApi.updateBot>[1]
type BotVisibility = NonNullable<CreateBotInput['visibility']>
type BotTriggerMode = NonNullable<CreateBotInput['triggerMode']>
type BotResponseMode = NonNullable<CreateBotInput['responseMode']>
type BotStatus = NonNullable<UpdateBotInput['status']>

interface BotFormState {
  id: string
  name: string
  description: string
  avatar: string
  visibility: BotVisibility
  triggerMode: BotTriggerMode
  autoReplyInGroup: boolean
  responseMode: BotResponseMode
  systemPrompt: string
  temperature: number
  maxTokens: number
  memoryLength: number
  humanizeEnabled: boolean
  humanizeMinDelay: number
  humanizeMaxDelay: number
  humanizeChunkSize: number
  humanizeCharMinMs: number
  humanizeCharMaxMs: number
  humanizeOverLimitThreshold: number
  humanizeOverLimitDelayMs: number
  summaryEnabled: boolean
  translationEnabled: boolean
  apiBaseUrl: string
  model: string
  apiKey: string
  tools: string
  knowledgeBase: string
  status: BotStatus
  apiKeyHint: string
}

const loading = ref(false)
const saving = ref(false)
const bots = ref<any[]>([])
const selectedId = ref<string>('')
const showForm = ref(false)
const showApiKey = ref(false)
const apiKeyTouched = ref(false)
const avatarUploading = ref(false)
const avatarInputRef = ref<HTMLInputElement | null>(null)
const localAvatarPreview = ref('')

const form = reactive<BotFormState>({
  id: '',
  name: '',
  description: '',
  avatar: '',
  visibility: 'PRIVATE' as BotVisibility,
  triggerMode: 'MENTION' as BotTriggerMode,
  autoReplyInGroup: false,
  responseMode: 'INSTANT' as BotResponseMode,
  systemPrompt: '',
  temperature: 0.7,
  maxTokens: 1024,
  memoryLength: 20,
  humanizeEnabled: false,
  humanizeMinDelay: 300,
  humanizeMaxDelay: 900,
  humanizeChunkSize: 60,
  humanizeCharMinMs: 200,
  humanizeCharMaxMs: 800,
  humanizeOverLimitThreshold: 10,
  humanizeOverLimitDelayMs: 5000,
  summaryEnabled: false,
  translationEnabled: false,
  apiBaseUrl: '',
  model: '',
  apiKey: '',
  tools: '',
  knowledgeBase: '',
  status: 'ACTIVE' as BotStatus,
  apiKeyHint: ''
})

watch(() => form.triggerMode, (mode) => {
  if (mode === 'AUTO' && !form.autoReplyInGroup) {
    form.autoReplyInGroup = true
  }
})

const visibilityOptions: Array<{ value: BotVisibility; label: string }> = [
  { value: 'PRIVATE', label: '私有 (仅自己可见)' },
  { value: 'PUBLIC', label: '公开 (所有人可见)' },
  { value: 'ORG', label: '组织内可见' },
]

const triggerOptions: Array<{ value: BotTriggerMode; label: string }> = [
  { value: 'MENTION', label: '@ 提及触发' },
  { value: 'AUTO', label: '自动回应' },
]

const responseOptions: Array<{ value: BotResponseMode; label: string }> = [
  { value: 'INSTANT', label: '即时回复' },
  { value: 'STREAM', label: '流式回复' },
]

const activeBots = computed(() => bots.value.filter(bot => bot.status === 'ACTIVE'))
const avatarPreview = computed(() => {
  if (localAvatarPreview.value) return localAvatarPreview.value
  if (form.avatar) return resolveAssetUrl(form.avatar)
  return ''
})

const loadBots = async () => {
  loading.value = true
  try {
    const res = await botApi.listBots({ mine: true, limit: 50, includeDisabled: true })
    if (res.success && res.data) {
      bots.value = res.data.items || []
      if (selectedId.value && showForm.value) {
        const current = bots.value.find(bot => bot.id === selectedId.value)
        if (current) fillForm(current)
      }
    }
  } finally {
    loading.value = false
  }
}

const fillForm = (bot: any) => {
  selectedId.value = bot.id
  form.id = bot.id
  form.name = bot.name || ''
  form.description = bot.description || ''
  form.avatar = bot.avatar || ''
  form.visibility = (bot.visibility || 'PRIVATE') as BotVisibility
  form.triggerMode = (bot.triggerMode || 'MENTION') as BotTriggerMode
  form.autoReplyInGroup = !!bot.autoReplyInGroup
  form.responseMode = (bot.responseMode || 'INSTANT') as BotResponseMode
  form.systemPrompt = bot.systemPrompt || ''
  form.temperature = bot.temperature ?? 0.7
  form.maxTokens = bot.maxTokens ?? 1024
  form.memoryLength = bot.memoryLength ?? 20
  form.humanizeEnabled = !!bot.humanizeEnabled
  form.humanizeMinDelay = bot.humanizeMinDelay ?? 300
  form.humanizeMaxDelay = bot.humanizeMaxDelay ?? 900
  form.humanizeChunkSize = bot.humanizeChunkSize ?? 60
  form.humanizeCharMinMs = bot.humanizeCharMinMs ?? 200
  form.humanizeCharMaxMs = bot.humanizeCharMaxMs ?? 800
  form.humanizeOverLimitThreshold = bot.humanizeOverLimitThreshold ?? 10
  form.humanizeOverLimitDelayMs = bot.humanizeOverLimitDelayMs ?? 5000
  form.summaryEnabled = !!bot.summaryEnabled
  form.translationEnabled = !!bot.translationEnabled
  form.apiBaseUrl = bot.apiBaseUrl || ''
  form.model = bot.model || ''
  form.apiKey = ''
  apiKeyTouched.value = false
  form.tools = formatJson(bot.tools)
  form.knowledgeBase = formatJson(bot.knowledgeBase)
  form.status = (bot.status || 'ACTIVE') as BotStatus
  form.apiKeyHint = bot.apiKeyHint || ''
  localAvatarPreview.value = ''
  showForm.value = true
}

const resetForm = () => {
  selectedId.value = ''
  apiKeyTouched.value = false
  Object.assign(form, {
    id: '',
    name: '',
    description: '',
    avatar: '',
    visibility: 'PRIVATE' as BotVisibility,
    triggerMode: 'MENTION' as BotTriggerMode,
    autoReplyInGroup: false,
    responseMode: 'INSTANT' as BotResponseMode,
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 1024,
    memoryLength: 20,
    humanizeEnabled: false,
    humanizeMinDelay: 300,
    humanizeMaxDelay: 900,
    humanizeChunkSize: 60,
    humanizeCharMinMs: 200,
    humanizeCharMaxMs: 800,
    humanizeOverLimitThreshold: 10,
    humanizeOverLimitDelayMs: 5000,
    summaryEnabled: false,
    translationEnabled: false,
    apiBaseUrl: '',
    model: '',
    apiKey: '',
    tools: '',
    knowledgeBase: '',
    status: 'ACTIVE' as BotStatus,
    apiKeyHint: ''
  })
  localAvatarPreview.value = ''
  showForm.value = true
}

const triggerAvatarPicker = () => {
  avatarInputRef.value?.click()
}

const handleAvatarSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    toast.warning('请选择图片文件')
    input.value = ''
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    toast.warning('图片大小不能超过 5MB')
    input.value = ''
    return
  }

  if (localAvatarPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(localAvatarPreview.value)
  }
  localAvatarPreview.value = URL.createObjectURL(file)
  avatarUploading.value = true
  try {
    const res = await uploadFiles('avatar', [file])
    const avatar = res.data?.files?.[0] || ''
    if (!res.success || !avatar) {
      throw new Error('上传失败')
    }
    form.avatar = avatar
  } catch (error: any) {
    toast.error(error?.message || '头像上传失败')
  } finally {
    avatarUploading.value = false
    input.value = ''
  }
}

const clearAvatar = () => {
  form.avatar = ''
  if (localAvatarPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(localAvatarPreview.value)
  }
  localAvatarPreview.value = ''
}

const formatJson = (value: any) => {
  if (!value) return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const parseJsonSafe = (value: string) => {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const insertMcpTemplate = () => {
  const template = {
    mcp: { enabled: true, allow: [], deny: [], timezone: '', web: { allowDomains: [], timeoutMs: 8000, maxBytes: 200000 } }
  }
  const current = parseJsonSafe(form.tools)
  if (!current || typeof current !== 'object' || Array.isArray(current)) {
    form.tools = JSON.stringify(template, null, 2)
    return
  }
  const currentMcp = (current as any).mcp || {}
  const merged = { ...(current as any), mcp: { ...template.mcp, ...currentMcp, web: { ...template.mcp.web, ...(currentMcp.web || {}) } } }
  form.tools = JSON.stringify(merged, null, 2)
}

const handleSave = async () => {
  if (!form.name.trim()) {
    toast.error('请输入名称')
    return
  }
  saving.value = true
  try {
    const basePayload: CreateBotInput = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      avatar: form.avatar.trim() || undefined,
      visibility: form.visibility,
      triggerMode: form.triggerMode,
      autoReplyInGroup: form.autoReplyInGroup,
      responseMode: form.responseMode,
      systemPrompt: form.systemPrompt.trim() || undefined,
      temperature: Number(form.temperature),
      maxTokens: Number(form.maxTokens),
      memoryLength: Number(form.memoryLength),
      humanizeEnabled: form.humanizeEnabled,
      humanizeMinDelay: Number(form.humanizeMinDelay),
      humanizeMaxDelay: Number(form.humanizeMaxDelay),
      humanizeChunkSize: Number(form.humanizeChunkSize),
      humanizeCharMinMs: Number(form.humanizeCharMinMs),
      humanizeCharMaxMs: Number(form.humanizeCharMaxMs),
      humanizeOverLimitThreshold: Number(form.humanizeOverLimitThreshold),
      humanizeOverLimitDelayMs: Number(form.humanizeOverLimitDelayMs),
      summaryEnabled: form.summaryEnabled,
      translationEnabled: form.translationEnabled,
      apiBaseUrl: form.apiBaseUrl.trim() || undefined,
      model: form.model.trim() || undefined,
      apiKey: apiKeyTouched.value ? form.apiKey : undefined,
      tools: form.tools,
      knowledgeBase: form.knowledgeBase,
    }
    if (form.id) {
      const res = await botApi.updateBot(form.id, { ...basePayload, status: form.status })
      if (res.success) toast.success('已保存')
    } else {
      const res = await botApi.createBot(basePayload)
      if (res.success) toast.success('已创建')
    }
    await loadBots()
    showForm.value = false
  } finally {
    saving.value = false
  }
}

const handleToggleStatus = async (bot: any) => {
  const nextStatus: BotStatus = bot.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  const res = await botApi.updateBot(bot.id, { status: nextStatus })
  if (res.success) {
    toast.success(nextStatus === 'ACTIVE' ? '已启用' : '已停用')
    await loadBots()
    if (showForm.value && form.id === bot.id) form.status = nextStatus
  }
}

const handleDelete = async () => {
  if (!form.id) return
  const confirmed = await dialog.confirm({
    title: '确认删除',
    content: '删除后无法恢复。',
    type: 'warning',
    confirmText: '删除',
    cancelText: '取消'
  })
  if (!confirmed) return
  const res = await botApi.removeBot(form.id)
  if (res.success) {
    toast.success('已删除')
    showForm.value = false
    selectedId.value = ''
    await loadBots()
  }
}

onMounted(loadBots)
onBeforeUnmount(() => {
  if (localAvatarPreview.value.startsWith('blob:')) URL.revokeObjectURL(localAvatarPreview.value)
})
</script>

<template>
  <div
    class="h-full min-h-[500px] w-full flex flex-col font-sans text-base-content selection:bg-primary/20 bg-transparent">

    <Transition name="fade" mode="out-in">

      <!-- 列表视图 -->
      <div v-if="!showForm" key="list" class="flex flex-col flex-1 h-full w-full">
        <!-- 极简 Header -->
        <div class="flex-none px-6 py-8 lg:px-12 lg:py-10 flex items-end justify-between">
          <div>
            <h1 class="text-3xl font-light tracking-wide flex items-center gap-3">
              机器人
            </h1>
            <p class="text-sm text-base-content/40 mt-2 tracking-widest font-light uppercase">
              <span class="text-success">{{ activeBots.length }} Online</span> · {{ bots.length }} Total
            </p>
          </div>
          <div class="flex items-center gap-4">
            <button class="btn btn-circle btn-ghost text-base-content/50 hover:text-base-content" @click="loadBots"
              :disabled="loading">
              <span v-if="loading" class="loading loading-spinner loading-sm"></span>
              <Icon v-else name="mingcute:refresh-2-line" size="22" />
            </button>
            <button class="btn btn-primary rounded-full px-6 font-light tracking-widest uppercase shadow-sm"
              @click="resetForm">
              <Icon name="mingcute:add-line" size="18" /> 新建
            </button>
          </div>
        </div>

        <!-- 列表内容 -->
        <div class="flex-1 overflow-y-auto px-6 lg:px-12 pb-12 custom-scrollbar">
          <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div v-for="i in 8" :key="i" class="h-32 bg-base-content/5 animate-pulse rounded-3xl"></div>
          </div>

          <div v-else-if="bots.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <button v-for="bot in bots" :key="bot.id"
              class="group text-left p-6 rounded-3xl transition-all duration-300 bg-base-100/40 backdrop-blur-xl border border-base-content/5 hover:bg-base-100/60 hover:shadow-lg hover:shadow-base-content/5 hover:-translate-y-1 flex flex-col gap-5"
              @click="fillForm(bot)">
              <div class="flex items-center gap-4">
                <div class="relative flex-shrink-0">
                  <div
                    class="w-14 h-14 rounded-full overflow-hidden bg-base-content/5 flex items-center justify-center">
                    <img v-if="bot.avatar" :src="resolveAssetUrl(bot.avatar)" class="w-full h-full object-cover" />
                    <Icon v-else name="mingcute:bot-line" size="24" class="text-base-content/30" />
                  </div>
                  <span class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-base-100/50"
                    :class="bot.status === 'ACTIVE' ? 'bg-success' : 'bg-base-content/20'"></span>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-medium text-lg text-base-content truncate group-hover:text-primary transition-colors">
                    {{ bot.name }}</h3>
                  <p class="text-xs text-base-content/40 truncate mt-1 font-light">{{ bot.description || '暂无描述' }}</p>
                </div>
              </div>

              <div class="flex items-center gap-2 mt-auto">
                <span
                  class="px-2.5 py-1 rounded-full bg-base-content/5 text-[10px] text-base-content/50 font-medium tracking-widest uppercase">{{
                    bot.visibility === 'PRIVATE' ? 'PRIVATE' : bot.visibility === 'PUBLIC' ? 'PUBLIC' : 'ORG' }}</span>
                <span
                  class="px-2.5 py-1 rounded-full bg-base-content/5 text-[10px] text-base-content/50 font-medium tracking-widest uppercase">{{
                    bot.triggerMode === 'MENTION' ? '@ MENTION' : 'AUTO' }}</span>
              </div>
            </button>
          </div>

          <div v-else class="h-full min-h-[40vh] flex flex-col items-center justify-center text-center opacity-40">
            <Icon name="mingcute:ghost-line" size="64" class="mb-6 font-light" />
            <p class="text-sm font-light tracking-widest uppercase">这里空空如也</p>
          </div>
        </div>
      </div>

      <!-- 表单视图 -->
      <div v-else key="form" class="flex flex-col flex-1 h-full w-full relative">
        <!-- 悬浮的极简头部 -->
        <div
          class="flex-none px-6 py-4 flex items-center justify-between sticky top-0 z-30 bg-base-100/60 backdrop-blur-xl border-b border-base-content/5">
          <div class="flex items-center gap-4">
            <button
              class="btn btn-circle btn-ghost btn-sm text-base-content/50 hover:text-base-content bg-base-content/5"
              @click="showForm = false">
              <Icon name="mingcute:left-line" size="20" />
            </button>
            <h2 class="text-base font-medium tracking-wide">{{ form.id ? '配置' : '新建' }}</h2>
          </div>

          <div class="flex items-center gap-1">
            <template v-if="form.id">
              <button class="btn btn-ghost btn-sm rounded-full font-light tracking-widest uppercase text-xs px-4"
                :class="form.status === 'ACTIVE' ? 'text-warning hover:bg-warning/10' : 'text-success hover:bg-success/10'"
                @click="handleToggleStatus(form)">
                {{ form.status === 'ACTIVE' ? '停用' : '启用' }}
              </button>
              <button
                class="btn btn-ghost btn-sm rounded-full font-light tracking-widest uppercase text-xs px-4 text-error hover:bg-error/10"
                @click="handleDelete">
                删除
              </button>
              <div class="w-px h-3 bg-base-content/10 mx-2"></div>
            </template>
            <button class="btn btn-primary btn-sm rounded-full px-6 font-light tracking-widest uppercase"
              :disabled="saving" @click="handleSave">
              <span v-if="saving" class="loading loading-spinner loading-xs"></span>
              <span v-else>保存</span>
            </button>
          </div>
        </div>

        <!-- 表单内容 -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-12">
          <div class="max-w-3xl mx-auto space-y-16 pb-20">

            <!-- 头部：头像与名称 -->
            <section class="flex flex-col md:flex-row gap-8 items-center md:items-start">
              <div class="flex flex-col items-center gap-3 shrink-0">
                <input ref="avatarInputRef" type="file" accept="image/*" class="hidden" @change="handleAvatarSelected">
                <div
                  class="relative group cursor-pointer w-24 h-24 rounded-full overflow-hidden bg-base-content/5 flex items-center justify-center transition-all duration-300 hover:scale-105"
                  @click="triggerAvatarPicker">
                  <img v-if="avatarPreview" :src="avatarPreview" class="w-full h-full object-cover" />
                  <Icon v-else name="mingcute:camera-line" size="28" class="text-base-content/20" />
                  <div
                    class="absolute inset-0 bg-base-100/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <span v-if="avatarUploading" class="loading loading-spinner loading-sm text-primary"></span>
                    <Icon v-else name="mingcute:upload-2-line" size="24" class="text-base-content" />
                  </div>
                </div>
                <button v-if="form.avatar"
                  class="text-[10px] text-base-content/30 hover:text-error uppercase tracking-widest transition-colors"
                  @click="clearAvatar">移除</button>
              </div>

              <div class="flex-1 w-full space-y-4">
                <input v-model="form.name" type="text"
                  class="w-full bg-transparent border-none focus:ring-0 p-0 text-3xl font-light placeholder:text-base-content/20 text-center md:text-left"
                  placeholder="命名你的助理...">
                <textarea v-model="form.description"
                  class="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-light resize-none h-16 placeholder:text-base-content/20 custom-scrollbar text-center md:text-left"
                  placeholder="一句话描述它的作用..."></textarea>
              </div>
            </section>

            <!-- 分割线 -->
            <div class="w-full h-px bg-base-content/5"></div>

            <!-- 基础设置 -->
            <section class="space-y-6">
              <h3 class="text-xs font-semibold text-base-content/30 uppercase tracking-widest">设置 / SETTINGS</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="space-y-3">
                  <label class="text-[10px] font-medium text-base-content/50 uppercase tracking-widest">可见性</label>
                  <select v-model="form.visibility"
                    class="w-full bg-base-content/5 border-none focus:ring-1 focus:ring-primary rounded-2xl px-5 py-3.5 text-sm appearance-none cursor-pointer transition-all">
                    <option v-for="opt in visibilityOptions" :key="opt.value" :value="opt.value">{{ opt.label }}
                    </option>
                  </select>
                </div>
                <div class="space-y-3">
                  <label class="text-[10px] font-medium text-base-content/50 uppercase tracking-widest">触发方式</label>
                  <select v-model="form.triggerMode"
                    class="w-full bg-base-content/5 border-none focus:ring-1 focus:ring-primary rounded-2xl px-5 py-3.5 text-sm appearance-none cursor-pointer transition-all">
                    <option v-for="opt in triggerOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
                <div class="space-y-3">
                  <label class="text-[10px] font-medium text-base-content/50 uppercase tracking-widest">回复模式</label>
                  <select v-model="form.responseMode"
                    class="w-full bg-base-content/5 border-none focus:ring-1 focus:ring-primary rounded-2xl px-5 py-3.5 text-sm appearance-none cursor-pointer transition-all">
                    <option v-for="opt in responseOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
              </div>

              <div class="flex flex-wrap gap-8 pt-4">
                <label class="flex items-center gap-3 cursor-pointer group">
                  <input v-model="form.autoReplyInGroup" type="checkbox"
                    class="toggle toggle-sm toggle-primary opacity-60 group-hover:opacity-100 transition-opacity">
                  <span class="text-sm font-light text-base-content/70">群聊自动回应</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer group">
                  <input v-model="form.summaryEnabled" type="checkbox"
                    class="toggle toggle-sm toggle-primary opacity-60 group-hover:opacity-100 transition-opacity">
                  <span class="text-sm font-light text-base-content/70">启用总结</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer group">
                  <input v-model="form.translationEnabled" type="checkbox"
                    class="toggle toggle-sm toggle-primary opacity-60 group-hover:opacity-100 transition-opacity">
                  <span class="text-sm font-light text-base-content/70">启用翻译</span>
                </label>
              </div>
            </section>

            <!-- 提示词与模型 -->
            <section class="space-y-6">
              <h3 class="text-xs font-semibold text-base-content/30 uppercase tracking-widest">大脑 / BRAIN</h3>

              <div class="space-y-3">
                <label class="text-[10px] font-medium text-base-content/50 uppercase tracking-widest">系统提示词 (System
                  Prompt)</label>
                <textarea v-model="form.systemPrompt"
                  class="w-full bg-base-content/5 border-none focus:ring-1 focus:ring-primary rounded-3xl p-6 text-sm font-mono resize-none h-48 custom-scrollbar placeholder:text-base-content/20 transition-all leading-relaxed"
                  placeholder="定义角色、语气、核心指令..."></textarea>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 bg-base-content/[0.02] p-6 rounded-3xl">
                <div class="space-y-4">
                  <div class="flex justify-between items-end">
                    <label class="text-[10px] font-medium text-base-content/50 uppercase tracking-widest">创造力
                      (Temp)</label>
                    <span class="text-xs font-mono text-base-content/60">{{ form.temperature }}</span>
                  </div>
                  <input v-model.number="form.temperature" type="range" min="0" max="2" step="0.1"
                    class="range range-xs range-primary opacity-50 hover:opacity-100 transition-opacity">
                </div>
                <div class="space-y-3">
                  <label class="text-[10px] font-medium text-base-content/50 uppercase tracking-widest">最大 Token</label>
                  <input v-model.number="form.maxTokens" type="number"
                    class="w-full bg-transparent border-b border-base-content/10 focus:border-primary focus:outline-none py-2 text-sm font-mono text-center">
                </div>
                <div class="space-y-3">
                  <label class="text-[10px] font-medium text-base-content/50 uppercase tracking-widest">记忆轮数</label>
                  <input v-model.number="form.memoryLength" type="number"
                    class="w-full bg-transparent border-b border-base-content/10 focus:border-primary focus:outline-none py-2 text-sm font-mono text-center">
                </div>
              </div>
            </section>

            <!-- API 配置 -->
            <section class="space-y-6">
              <h3 class="text-xs font-semibold text-base-content/30 uppercase tracking-widest">接口 / API OVERRIDE</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-3">
                  <label class="text-[10px] font-medium text-base-content/50 uppercase tracking-widest">Base URL <span
                      class="font-light lowercase opacity-50">(可选)</span></label>
                  <input v-model="form.apiBaseUrl" type="text"
                    class="w-full bg-base-content/5 border-none focus:ring-1 focus:ring-primary rounded-2xl px-5 py-3.5 text-sm font-mono transition-all">
                </div>
                <div class="space-y-3">
                  <label class="text-[10px] font-medium text-base-content/50 uppercase tracking-widest">指定模型 <span
                      class="font-light lowercase opacity-50">(可选)</span></label>
                  <input v-model="form.model" type="text"
                    class="w-full bg-base-content/5 border-none focus:ring-1 focus:ring-primary rounded-2xl px-5 py-3.5 text-sm font-mono transition-all">
                </div>
                <div class="space-y-3 md:col-span-2">
                  <label class="text-[10px] font-medium text-base-content/50 uppercase tracking-widest">API Key</label>
                  <div class="relative">
                    <input v-model="form.apiKey" :type="showApiKey ? 'text' : 'password'"
                      class="w-full bg-base-content/5 border-none focus:ring-1 focus:ring-primary rounded-2xl pl-5 pr-12 py-3.5 text-sm font-mono placeholder:text-base-content/20 transition-all"
                      @input="apiKeyTouched = true"
                      :placeholder="form.apiKeyHint ? `已保存 (尾号 ${form.apiKeyHint})` : 'sk-...'">
                    <button
                      class="absolute right-4 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content transition-colors"
                      type="button" @click="showApiKey = !showApiKey">
                      <Icon :name="showApiKey ? 'mingcute:eye-close-line' : 'mingcute:eye-2-line'" size="18" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <!-- 拟人化 -->
            <section class="space-y-6">
              <div class="flex items-center gap-4">
                <h3 class="text-xs font-semibold text-base-content/30 uppercase tracking-widest">拟人化 / HUMANIZE</h3>
                <input v-model="form.humanizeEnabled" type="checkbox" class="toggle toggle-sm toggle-primary">
              </div>

              <div v-show="form.humanizeEnabled"
                class="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 bg-base-content/[0.02] p-8 rounded-3xl">
                <div class="space-y-2">
                  <label class="text-[10px] text-base-content/40 uppercase tracking-widest">Min Delay (ms)</label>
                  <input v-model.number="form.humanizeMinDelay" type="number"
                    class="w-full bg-transparent border-b border-base-content/10 focus:border-primary focus:outline-none py-1.5 text-sm font-mono text-center">
                </div>
                <div class="space-y-2">
                  <label class="text-[10px] text-base-content/40 uppercase tracking-widest">Max Delay (ms)</label>
                  <input v-model.number="form.humanizeMaxDelay" type="number"
                    class="w-full bg-transparent border-b border-base-content/10 focus:border-primary focus:outline-none py-1.5 text-sm font-mono text-center">
                </div>
                <div class="space-y-2">
                  <label class="text-[10px] text-base-content/40 uppercase tracking-widest">Chunk Size</label>
                  <input v-model.number="form.humanizeChunkSize" type="number"
                    class="w-full bg-transparent border-b border-base-content/10 focus:border-primary focus:outline-none py-1.5 text-sm font-mono text-center">
                </div>
                <div class="space-y-2">
                  <label class="text-[10px] text-base-content/40 uppercase tracking-widest">Limit Threshold</label>
                  <input v-model.number="form.humanizeOverLimitThreshold" type="number"
                    class="w-full bg-transparent border-b border-base-content/10 focus:border-primary focus:outline-none py-1.5 text-sm font-mono text-center">
                </div>
                <div class="space-y-2">
                  <label class="text-[10px] text-base-content/40 uppercase tracking-widest">Char Min (ms)</label>
                  <input v-model.number="form.humanizeCharMinMs" type="number"
                    class="w-full bg-transparent border-b border-base-content/10 focus:border-primary focus:outline-none py-1.5 text-sm font-mono text-center">
                </div>
                <div class="space-y-2">
                  <label class="text-[10px] text-base-content/40 uppercase tracking-widest">Char Max (ms)</label>
                  <input v-model.number="form.humanizeCharMaxMs" type="number"
                    class="w-full bg-transparent border-b border-base-content/10 focus:border-primary focus:outline-none py-1.5 text-sm font-mono text-center">
                </div>
                <div class="space-y-2 col-span-2">
                  <label class="text-[10px] text-base-content/40 uppercase tracking-widest">Over Limit Delay
                    (ms)</label>
                  <input v-model.number="form.humanizeOverLimitDelayMs" type="number"
                    class="w-full bg-transparent border-b border-base-content/10 focus:border-primary focus:outline-none py-1.5 text-sm font-mono text-center">
                </div>
              </div>
            </section>

            <!-- 扩展 -->
            <section class="space-y-6">
              <h3 class="text-xs font-semibold text-base-content/30 uppercase tracking-widest">扩展 / EXTENSIONS</h3>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <label class="text-[10px] font-medium text-base-content/50 uppercase tracking-widest">Tools
                    (JSON)</label>
                  <button class="text-[10px] text-primary hover:opacity-70 uppercase tracking-widest transition-opacity"
                    type="button" @click="insertMcpTemplate">Insert MCP</button>
                </div>
                <textarea v-model="form.tools"
                  class="w-full bg-base-content/5 border-none focus:ring-1 focus:ring-primary rounded-3xl p-6 text-xs font-mono resize-none h-32 custom-scrollbar placeholder:text-base-content/20 transition-all"></textarea>
              </div>

              <div class="space-y-3">
                <label class="text-[10px] font-medium text-base-content/50 uppercase tracking-widest">Knowledge
                  Base</label>
                <textarea v-model="form.knowledgeBase"
                  class="w-full bg-base-content/5 border-none focus:ring-1 focus:ring-primary rounded-3xl p-6 text-xs font-mono resize-none h-32 custom-scrollbar placeholder:text-base-content/20 transition-all"></textarea>
              </div>
            </section>

          </div>
        </div>
      </div>

    </Transition>
  </div>
</template>

<style scoped>
/* 定义干净的淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 极致隐藏滚动条 */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-radius: 4px;
}

.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background-color: oklch(var(--bc) / 0.1);
}
</style>