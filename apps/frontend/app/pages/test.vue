<script setup lang="ts">
import type { ModelMessage } from 'ai'
import { streamAiText } from '~/api/ai'
import { defineContextMenu } from '~/composables/useContextMenu'
import { notify, getNotificationPermission, requestNotificationPermission } from '~/utils/notification'

const toast = useToast()

const input = ref('')
const notificationTitle = ref('通知测试')
const notificationBody = ref('这是一条来自测试页的系统通知')
const notificationCategory = ref<'message' | 'group' | 'mention' | 'friend-request' | 'system' | 'custom'>('system')
const notificationPermission = ref<NotificationPermission>('default')
const systemPrompt = ref('你是一个专业、可靠的 AI 助手。')
const isSending = ref(false)
const messages = ref<Array<{ role: 'user' | 'assistant'; content: string }>>([])

const canSend = computed(() => !isSending.value && input.value.trim().length > 0)
const notificationPermissionText = computed(() => {
    if (notificationPermission.value === 'granted') return '已授权'
    if (notificationPermission.value === 'denied') return '已拒绝'
    return '未设置'
})

const messageMenu = defineContextMenu<{ role: 'user' | 'assistant'; content: string }>([
    {
        id: 'recall',
        label: '撤回',
        icon: 'lucide:undo-2',
        show: (context) => context.role === 'user',
        handler: () => toast.success('已撤回'),
    },
    {
        id: 'forward',
        label: '转发',
        icon: 'lucide:forward',
        handler: () => toast.info('已转发'),
    },
    {
        id: 'edit',
        label: '修改',
        icon: 'lucide:edit-3',
        show: (context) => context.role === 'user',
        handler: () => toast.info('已进入修改'),
    },
    { type: 'separator' },
    {
        id: 'delete',
        label: '删除',
        icon: 'lucide:trash-2',
        danger: true,
        handler: () => toast.error('已删除'),
    },
])

/**
 * 转换为模型消息
 */
function toModelMessages() {
    return messages.value.map<ModelMessage>((item) => ({
        role: item.role,
        content: item.content,
    }))
}

/**
 * 追加用户消息
 */
function appendUserMessage(content: string) {
    messages.value.push({ role: 'user', content })
}

/**
 * 追加助手消息
 */
function appendAssistantMessage() {
    messages.value.push({ role: 'assistant', content: '' })
    return messages.value.length - 1
}

/**
 * 更新助手消息
 */
function updateAssistantMessage(index: number, content: string) {
    if (!messages.value[index]) return
    messages.value[index].content = content
}

/**
 * 发送消息并流式接收回复
 */
async function handleSend() {
    if (!canSend.value) return
    const content = input.value.trim()
    input.value = ''
    appendUserMessage(content)
    const assistantIndex = appendAssistantMessage()
    isSending.value = true
    try {
        const stream = await streamAiText({
            system: systemPrompt.value.trim() || undefined,
            messages: toModelMessages(),
        })
        let assistantText = ''
        for await (const chunk of stream.textStream) {
            assistantText += chunk
            updateAssistantMessage(assistantIndex, assistantText)
        }
    } catch (error: any) {
        const message = error?.message || 'AI 请求失败'
        toast.error(message)
        updateAssistantMessage(assistantIndex, `请求失败：${message}`)
    } finally {
        isSending.value = false
    }
}

/**
 * 清空对话
 */
function handleClear() {
    messages.value = []
    input.value = ''
}

async function refreshNotificationPermission() {
    notificationPermission.value = await getNotificationPermission()
}

async function handleRequestNotificationPermission() {
    const result = await requestNotificationPermission()
    notificationPermission.value = result
    if (result === 'granted') toast.success('系统通知权限已授权')
    else toast.warning('系统通知权限未授权')
}

async function handleSendNotificationTest() {
    const result = await notify({
        title: notificationTitle.value.trim() || '通知测试',
        body: notificationBody.value.trim() || undefined,
        category: notificationCategory.value,
        force: true,
    }, {
        requestPermission: true,
    })
    if (!result.success) toast.warning('系统通知未发送，请检查权限与设置')
}

onMounted(() => {
    refreshNotificationPermission()
})
</script>

<template>
    <div class="h-full bg-base-200 p-4 md:p-8 overflow-y-auto">
        <div class="mx-auto max-w-5xl space-y-6">
            <div class="flex items-center gap-3">
                <div class="avatar placeholder">
                    <div class="bg-primary text-primary-content rounded-xl w-12 h-12">
                        <Icon name="mingcute:ai-line" size="24" />
                    </div>
                </div>
                <div>
                    <h1 class="text-2xl font-bold tracking-tight">AI 对话测试</h1>
                    <p class="text-base-content/60 text-sm">用于验证 Deepseek 连接与流式回复效果</p>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div class="lg:col-span-8 space-y-4">
                    <div class="card bg-base-100 shadow-sm border border-base-200">
                        <div class="card-body p-6 md:p-8">
                            <div class="flex items-center justify-between mb-4">
                                <div class="font-bold">对话记录</div>
                                <button class="btn btn-ghost btn-sm" @click="handleClear" :disabled="isSending">
                                    清空
                                </button>
                            </div>

                            <div class="space-y-4 max-h-[480px] overflow-y-auto pr-2">
                                <div v-if="!messages.length" class="text-sm text-base-content/50">
                                    还没有消息，发送一条测试吧。
                                </div>
                                <div v-for="(message, index) in messages" :key="index" class="flex"
                                    :class="message.role === 'user' ? 'justify-end' : 'justify-start'">
                                    <div
                                        v-context-menu="{ items: messageMenu, context: message }"
                                        class="max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap"
                                        :class="message.role === 'user' ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content'">
                                        {{ message.content }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card bg-base-100 shadow-sm border border-base-200">
                        <div class="card-body p-6 md:p-8 space-y-4">
                            <div class="form-control">
                                <label class="label">
                                    <span class="label-text font-bold">系统提示词</span>
                                </label>
                                <textarea v-model="systemPrompt"
                                    class="textarea textarea-bordered w-full bg-base-100 min-h-[90px]"
                                    placeholder="可选，留空则不发送系统提示词"></textarea>
                            </div>

                            <div class="form-control">
                                <label class="label">
                                    <span class="label-text font-bold">输入消息</span>
                                </label>
                                <textarea v-model="input"
                                    class="textarea textarea-bordered w-full bg-base-100 min-h-[120px]"
                                    placeholder="请输入你要发送的内容"></textarea>
                            </div>

                            <div class="flex items-center justify-end gap-3">
                                <button class="btn btn-ghost" @click="handleClear" :disabled="isSending">
                                    清空对话
                                </button>
                                <button class="btn btn-primary" @click="handleSend" :disabled="!canSend">
                                    <span v-if="isSending" class="loading loading-spinner loading-xs"></span>
                                    发送
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="lg:col-span-4 space-y-4">
                    <div class="card bg-base-100 shadow-sm border border-base-200">
                        <div class="card-body p-6 space-y-4">
                            <div class="flex items-center justify-between">
                                <div class="font-bold">系统通知测试</div>
                                <span class="badge badge-sm" :class="notificationPermission === 'granted' ? 'badge-success' : (notificationPermission === 'denied' ? 'badge-error' : 'badge-ghost')">
                                    {{ notificationPermissionText }}
                                </span>
                            </div>

                            <div class="form-control">
                                <label class="label">
                                    <span class="label-text font-bold">标题</span>
                                </label>
                                <input v-model="notificationTitle" type="text" class="input input-bordered w-full bg-base-100" placeholder="请输入通知标题" />
                            </div>

                            <div class="form-control">
                                <label class="label">
                                    <span class="label-text font-bold">内容</span>
                                </label>
                                <textarea v-model="notificationBody" class="textarea textarea-bordered w-full bg-base-100 min-h-[90px]" placeholder="请输入通知内容"></textarea>
                            </div>

                            <div class="form-control">
                                <label class="label">
                                    <span class="label-text font-bold">通知类型</span>
                                </label>
                                <select v-model="notificationCategory" class="select select-bordered w-full bg-base-100">
                                    <option value="message">新消息</option>
                                    <option value="group">群组消息</option>
                                    <option value="mention">提及我的消息</option>
                                    <option value="friend-request">好友请求</option>
                                    <option value="system">系统通知</option>
                                    <option value="custom">自定义</option>
                                </select>
                            </div>

                            <div class="flex flex-wrap items-center gap-2">
                                <button class="btn btn-ghost btn-sm rounded-xl" @click="handleRequestNotificationPermission">
                                    授权系统通知
                                </button>
                                <button class="btn btn-primary btn-sm rounded-xl" @click="handleSendNotificationTest">
                                    发送测试通知
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="card bg-base-100 shadow-sm border border-base-200">
                        <div class="card-body p-6">
                            <div class="font-bold mb-3">使用说明</div>
                            <div class="text-sm text-base-content/60 space-y-2">
                                <div>默认读取本地 AI 配置，未填写则使用系统默认。</div>
                                <div>当前使用流式接口，适用于验证实时输出。</div>
                                <div>测试完成后可用于接入正式聊天页面。</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
