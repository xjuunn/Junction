<script setup lang="ts">
import * as botApi from '~/api/ai-bot'

const toast = useToast()

const loading = ref(false)
const saving = ref(false)
const bots = ref<any[]>([])
const selectedId = ref<string>('')
const showForm = ref(false)
const showApiKey = ref(false)
const apiKeyTouched = ref(false)

const form = reactive({
  id: '',
  name: '',
  description: '',
  avatar: '',
  visibility: 'PRIVATE',
  triggerMode: 'MENTION',
  autoReplyInGroup: false,
  responseMode: 'INSTANT',
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
  status: 'ACTIVE',
  apiKeyHint: ''
})

const visibilityOptions = [
  { value: 'PRIVATE', label: '私有（仅自己可见）' },
  { value: 'PUBLIC', label: '公开（所有人可见）' },
  { value: 'ORG', label: '组织内可见' },
]

const triggerOptions = [
  { value: 'MENTION', label: '@ 触发' },
  { value: 'AUTO', label: '自动回应' },
]

const responseOptions = [
  { value: 'INSTANT', label: '即时回复' },
  { value: 'STREAM', label: '流式回复' },
]

const activeBots = computed(() => bots.value.filter(bot => bot.status === 'ACTIVE'))

const loadBots = async () => {
  loading.value = true
  try {
    const res = await botApi.listBots({ mine: true, limit: 50 })
    if (res.success && res.data) {
      bots.value = res.data.items || []
      if (selectedId.value) {
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
  form.visibility = bot.visibility || 'PRIVATE'
  form.triggerMode = bot.triggerMode || 'MENTION'
  form.autoReplyInGroup = !!bot.autoReplyInGroup
  form.responseMode = bot.responseMode || 'INSTANT'
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
  form.status = bot.status || 'ACTIVE'
  form.apiKeyHint = bot.apiKeyHint || ''
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
    visibility: 'PRIVATE',
    triggerMode: 'MENTION',
    autoReplyInGroup: false,
    responseMode: 'INSTANT',
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
    status: 'ACTIVE',
    apiKeyHint: ''
  })
  showForm.value = true
}

const formatJson = (value: any) => {
  if (!value) return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const handleSave = async () => {
  if (!form.name.trim()) {
    toast.error('请输入机器人名称')
    return
  }
  saving.value = true
  try {
    const payload = {
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
      status: form.status
    }
    if (form.id) {
      const res = await botApi.updateBot(form.id, payload)
      if (res.success) toast.success('机器人已更新')
    } else {
      const res = await botApi.createBot(payload)
      if (res.success) toast.success('机器人已创建')
    }
    await loadBots()
    if (form.id) {
      const updated = bots.value.find(bot => bot.id === form.id)
      if (updated) fillForm(updated)
    } else {
      showForm.value = false
    }
  } finally {
    saving.value = false
  }
}

const handleToggleStatus = async (bot: any) => {
  const nextStatus = bot.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  const res = await botApi.updateBot(bot.id, { status: nextStatus })
  if (res.success) {
    toast.success(nextStatus === 'ACTIVE' ? '机器人已启用' : '机器人已停用')
    await loadBots()
  }
}

onMounted(loadBots)
</script>

<template>
  <div class="card bg-base-100 shadow-sm border border-base-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div class="card-body p-6 md:p-8">
      <div class="flex items-center justify-between border-b border-base-200 pb-4 mb-6">
        <h2 class="card-title text-lg flex items-center gap-2">
          <Icon name="mingcute:ai-line" class="text-primary" />
          机器人管理
        </h2>
        <div class="flex gap-2">
          <button class="btn btn-ghost" @click="loadBots" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner loading-xs"></span>
            刷新
          </button>
          <button class="btn btn-primary" @click="resetForm">
            创建机器人
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1 space-y-4">
          <div class="text-sm font-bold text-base-content/70">我的机器人（{{ activeBots.length }}）</div>
          <div v-if="loading" class="space-y-3">
            <div v-for="i in 4" :key="i" class="h-20 rounded-xl bg-base-200/50 animate-pulse"></div>
          </div>
          <div v-else class="space-y-3">
            <button
              v-for="bot in bots"
              :key="bot.id"
              class="w-full text-left p-4 rounded-2xl border border-base-200 hover:border-primary/40 transition-all"
              :class="{ 'bg-primary/5 border-primary/40': bot.id === selectedId }"
              @click="fillForm(bot)"
            >
              <div class="flex items-center gap-3">
                <BaseAvatar :text="bot.name" :src="bot.avatar" :height="40" :width="40" />
                <div class="flex-1 min-w-0">
                  <div class="font-bold truncate">{{ bot.name }}</div>
                  <div class="text-xs opacity-60 truncate">{{ bot.description || '暂无描述' }}</div>
                </div>
                <span class="badge badge-sm" :class="bot.status === 'ACTIVE' ? 'badge-success' : 'badge-ghost'">
                  {{ bot.status === 'ACTIVE' ? '启用' : '停用' }}
                </span>
              </div>
            </button>
            <div v-if="bots.length === 0" class="text-sm text-base-content/50">暂无机器人</div>
          </div>
        </div>

        <div class="lg:col-span-2">
          <div v-if="!showForm" class="text-sm text-base-content/50">
            请选择或创建一个机器人
          </div>
          <div v-else class="space-y-6">
            <div class="text-sm font-bold text-base-content/70">????</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label"><span class="label-text font-bold">机器人名称</span></label>
                <input v-model="form.name" type="text" class="input input-bordered w-full" placeholder="例如：市场助理" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-bold">头像 URL</span></label>
                <input v-model="form.avatar" type="text" class="input input-bordered w-full" placeholder="可选" />
              </div>
            </div>

            <div class="form-control">
              <label class="label"><span class="label-text font-bold">描述</span></label>
              <textarea v-model="form.description" class="textarea textarea-bordered h-24" placeholder="机器人用途与能力描述"></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="form-control">
                <label class="label"><span class="label-text font-bold">可见性</span></label>
                <select v-model="form.visibility" class="select select-bordered">
                  <option v-for="opt in visibilityOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-bold">触发方式</span></label>
                <select v-model="form.triggerMode" class="select select-bordered">
                  <option v-for="opt in triggerOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-bold">回复模式</span></label>
                <select v-model="form.responseMode" class="select select-bordered">
                  <option v-for="opt in responseOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
            </div>

            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-3">
                <input v-model="form.autoReplyInGroup" type="checkbox" class="checkbox checkbox-sm" />
                <span class="label-text">群聊中允许自动回应</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label"><span class="label-text font-bold">系统提示词</span></label>
              <textarea v-model="form.systemPrompt" class="textarea textarea-bordered h-28" placeholder="定义机器人角色、口吻、限制"></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="form-control">
                <label class="label"><span class="label-text font-bold">温度</span></label>
                <input v-model.number="form.temperature" type="number" min="0" max="2" step="0.1" class="input input-bordered" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-bold">最大长度</span></label>
                <input v-model.number="form.maxTokens" type="number" min="64" max="4096" step="32" class="input input-bordered" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-bold">记忆长度</span></label>
                <input v-model.number="form.memoryLength" type="number" min="1" max="80" step="1" class="input input-bordered" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label"><span class="label-text font-bold">API Base URL</span></label>
                <input v-model="form.apiBaseUrl" type="text" class="input input-bordered" placeholder="可选，留空使用系统默认" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-bold">模型</span></label>
                <input v-model="form.model" type="text" class="input input-bordered" placeholder="可选，留空使用系统默认" />
              </div>
            </div>

            <div class="form-control">
              <label class="label"><span class="label-text font-bold">API Key</span></label>
              <div class="join w-full">
                <input v-model="form.apiKey" :type="showApiKey ? 'text' : 'password'" class="input input-bordered join-item w-full"
                  @input="apiKeyTouched = true"
                  :placeholder="form.apiKeyHint ? `已保存（${form.apiKeyHint}）` : '可选，留空使用系统默认'" />
                <button class="btn btn-ghost join-item" type="button" @click="showApiKey = !showApiKey">
                  {{ showApiKey ? '隐藏' : '显示' }}
                </button>
              </div>
              <label class="label">
                <span class="label-text-alt text-base-content/50">留空不修改已保存的 Key</span>
              </label>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-3">
                  <input v-model="form.summaryEnabled" type="checkbox" class="checkbox checkbox-sm" />
                  <span class="label-text">启用总结</span>
                </label>
              </div>
              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-3">
                  <input v-model="form.translationEnabled" type="checkbox" class="checkbox checkbox-sm" />
                  <span class="label-text">启用翻译</span>
                </label>
              </div>
            </div>

            <div class="rounded-2xl border border-base-200 bg-base-100/70 p-4 space-y-4">
              <div class="text-sm font-bold text-base-content/70">人类输入模拟</div>
              <label class="label cursor-pointer justify-start gap-3">
                <input v-model="form.humanizeEnabled" type="checkbox" class="checkbox checkbox-sm" />
                <span class="label-text">启用分段发送与输入延迟</span>
              </label>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="form-control">
                  <label class="label"><span class="label-text font-bold">最小延迟(ms)</span></label>
                  <input v-model.number="form.humanizeMinDelay" type="number" min="0" max="10000" step="50"
                    class="input input-bordered" :disabled="!form.humanizeEnabled" />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text font-bold">最大延迟(ms)</span></label>
                  <input v-model.number="form.humanizeMaxDelay" type="number" min="0" max="15000" step="50"
                    class="input input-bordered" :disabled="!form.humanizeEnabled" />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text font-bold">单段长度</span></label>
                  <input v-model.number="form.humanizeChunkSize" type="number" min="30" max="400" step="10"
                    class="input input-bordered" :disabled="!form.humanizeEnabled" />
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label"><span class="label-text font-bold">每字最小时间(ms)</span></label>
                  <input v-model.number="form.humanizeCharMinMs" type="number" min="50" max="2000" step="50"
                    class="input input-bordered" :disabled="!form.humanizeEnabled" />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text font-bold">每字最大时间(ms)</span></label>
                  <input v-model.number="form.humanizeCharMaxMs" type="number" min="50" max="5000" step="50"
                    class="input input-bordered" :disabled="!form.humanizeEnabled" />
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label"><span class="label-text font-bold">超过字数阈值</span></label>
                  <input v-model.number="form.humanizeOverLimitThreshold" type="number" min="1" max="200" step="1"
                    class="input input-bordered" :disabled="!form.humanizeEnabled" />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text font-bold">超过阈值延迟(ms)</span></label>
                  <input v-model.number="form.humanizeOverLimitDelayMs" type="number" min="0" max="60000" step="100"
                    class="input input-bordered" :disabled="!form.humanizeEnabled" />
                </div>
              </div>
              <div class="text-xs text-base-content/50">
                启用后机器人会把回复拆成多条消息并随机延迟发送，不强制句末标点。
              </div>
            </div>

            <div class="form-control">
              <label class="label"><span class="label-text font-bold">工具定义（JSON）</span></label>
              <textarea v-model="form.tools" class="textarea textarea-bordered h-28" placeholder='例如：[{"name":"search","description":"检索知识库"}]'></textarea>
            </div>

            <div class="form-control">
              <label class="label"><span class="label-text font-bold">知识库（JSON/文本）</span></label>
              <textarea v-model="form.knowledgeBase" class="textarea textarea-bordered h-28" placeholder="可填入数组或文本"></textarea>
            </div>

            <div class="flex items-center justify-between border-t border-base-200 pt-6">
              <button v-if="form.id" class="btn btn-ghost" @click="handleToggleStatus(form)">
                {{ form.status === 'ACTIVE' ? '停用机器人' : '启用机器人' }}
              </button>
              <div class="ml-auto flex items-center gap-3">
                <button class="btn btn-ghost" @click="showForm = false">取消</button>
                <button class="btn btn-primary min-w-[120px]" :disabled="saving" @click="handleSave">
                  <span v-if="saving" class="loading loading-spinner loading-xs"></span>
                  保存配置
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
