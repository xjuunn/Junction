<script setup lang="ts">
import * as conversationApi from '~/api/conversation'
import * as messageApi from '~/api/message'
import type { MessageArchivePayload } from '~/api/message'
import { downloadFile } from '~/utils/download'
import { useSettingsStore } from '~/stores/settings'

const toast = useToast()
const dialog = useDialog()
const userStore = useUserStore()
const settings = useSettingsStore()

const privacySettings = reactive({
    profileVisibility: 'contacts',
    onlineStatus: 'contacts',
    readReceipts: true,
    typingIndicator: true,
    autoRead: false,
    allowSearchByEmail: false,
    allowAddByEmail: true,
    showLastSeen: 'contacts',
    twoFactorEnabled: false,
    sessionManagement: true,
    dataExportEnabled: false,
    blockList: [] as string[],
})

const visibilityOptions = [
    { value: 'everyone', label: '所有人' },
    { value: 'contacts', label: '仅好友' },
    { value: 'nobody', label: '仅自己' },
]

const onlineStatusOptions = [
    { value: 'everyone', label: '所有人可见' },
    { value: 'contacts', label: '仅好友可见' },
    { value: 'nobody', label: '隐藏在线状态' },
]

const lastSeenOptions = [
    { value: 'everyone', label: '所有人' },
    { value: 'contacts', label: '仅好友' },
    { value: 'nobody', label: '无人' },
]

type ConversationItem = NonNullable<NonNullable<Awaited<ReturnType<typeof conversationApi.findAll>>['data']>['items']>[number]

type ArchiveConversationItem = MessageArchivePayload['conversations'][number]

const isSaving = ref(false)
const exportLoading = ref(false)
const importLoading = ref(false)
const conversationsLoading = ref(false)
const exportScope = ref<'all' | 'selected'>('selected')
const conversations = ref<ConversationItem[]>([])
const selectedConversationIds = ref<string[]>([])
const importInputRef = ref<HTMLInputElement | null>(null)

/**
 * 保存隐私设置
 */
async function handleSave() {
    isSaving.value = true
    await new Promise(resolve => setTimeout(resolve, 500))
    toast.success('隐私设置已保存')
    isSaving.value = false
}

/**
 * 加载会话列表
 */
async function loadConversations() {
    if (conversationsLoading.value) return
    conversationsLoading.value = true
    try {
        const items: ConversationItem[] = []
        let page = 1
        const limit = 50
        while (true) {
            const res = await conversationApi.findAll({ page, limit })
            const batch = res.data?.items || []
            items.push(...batch)
            if (batch.length < limit) break
            page += 1
        }
        conversations.value = items
    } finally {
        conversationsLoading.value = false
    }
}

/**
 * 切换会话全选状态
 */
function toggleAllConversations() {
    if (!conversations.value.length) return
    if (selectedConversationIds.value.length === conversations.value.length) {
        selectedConversationIds.value = []
        return
    }
    selectedConversationIds.value = conversations.value.map(item => item.id)
}

/**
 * 生成导出文件名
 */
function buildArchiveFileName(count: number) {
    const now = new Date()
    const pad = (value: number) => String(value).padStart(2, '0')
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
    return `junction-messages-${count || 'all'}-${stamp}.json`
}

/**
 * 规范化归档数据
 */
function normalizeArchivePayload(payload: any) {
    if (!payload) return null
    if (payload.archive) return payload.archive
    if (payload.success !== undefined && payload.data) return payload.data
    return payload
}

/**
 * 解析归档文件
 */
async function parseArchiveFile(file: File) {
    const text = await file.text()
    const parsed = JSON.parse(text)
    return normalizeArchivePayload(parsed) as MessageArchivePayload | null
}

/**
 * 导出消息记录
 */
async function handleExportArchive() {
    if (!privacySettings.dataExportEnabled) {
        toast.error('请先开启数据导出功能')
        return
    }
    if (exportScope.value === 'selected' && !selectedConversationIds.value.length) {
        toast.error('请选择自定义会话')
        return
    }
    const confirmed = await dialog.confirm({
        title: '导出消息记录',
        content: exportScope.value === 'all'
            ? '将导出全部会话消息，确认继续吗？'
            : `将导出 ${selectedConversationIds.value.length} 个会话消息，确认继续吗？`,
        type: 'info',
        confirmText: '开始导出',
        cancelText: '取消'
    })
    if (!confirmed) return

    exportLoading.value = true
    try {
        const { public: { apiUrl } } = useRuntimeConfig()
        const token = userStore.authToken.value
        const ids = exportScope.value === 'all' ? [] : selectedConversationIds.value
        const fileName = buildArchiveFileName(ids.length || conversations.value.length)
        const result = await downloadFile({
            source: {
                url: `${apiUrl}/message/export`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ conversationIds: ids })
            },
            target: {
                dir: settings.downloadPath || undefined,
                fileName
            }
        })
        if (result.success) {
            toast.success('导出完成')
        } else {
            toast.error(result.error || '导出失败')
        }
    } catch (error: any) {
        toast.error(error?.message || '导出失败')
    } finally {
        exportLoading.value = false
    }
}

/**
 * 触发导入选择
 */
function handleImportTrigger() {
    importInputRef.value?.click()
}

/**
 * 导入消息记录
 */
async function handleImportFile(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    if (!privacySettings.dataExportEnabled) {
        toast.error('请先开启数据导出功能')
        return
    }
    importLoading.value = true
    try {
        const archive = await parseArchiveFile(file)
        const conversationsCount = archive?.conversations?.length || 0
        if (!archive || !conversationsCount) {
            toast.error('导入文件无效或不包含会话')
            return
        }
        const messageCount = archive.conversations.reduce((sum: number, item: ArchiveConversationItem) => sum + (item.messages?.length || 0), 0)
        const confirmed = await dialog.confirm({
            title: '导入消息记录',
            content: `即将导入 ${conversationsCount} 个会话，${messageCount} 条消息，确认继续吗？`,
            type: 'info',
            confirmText: '开始导入',
            cancelText: '取消'
        })
        if (!confirmed) return
        const res = await messageApi.importArchive(archive)
        const summary = res.data
        if (summary) {
            toast.success(`导入完成：会话 ${summary.importedConversations} / 消息 ${summary.importedMessages}`)
        } else {
            toast.success('导入完成')
        }
    } catch (error: any) {
        toast.error(error?.message || '导入失败')
    } finally {
        importLoading.value = false
    }
}

/**
 * 清理其他设备会话
 */
function handleClearSessions() {
    toast.success('其他设备已退出登录')
}

/**
 * 清空黑名单
 */
function handleClearBlockList() {
    toast.success('已清空黑名单')
}

onMounted(() => {
    loadConversations()
})
</script>

<template>
    <div class="card bg-base-100 shadow-sm border border-base-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div class="card-body p-6 md:p-8">
            <h2 class="card-title text-lg border-b border-base-200 pb-4 mb-6 flex items-center gap-2">
                <Icon name="mingcute:shield-line" class="text-primary" />
                隐私设置
            </h2>

            <div class="space-y-8 max-w-2xl">
                <div>
                    <h3 class="text-md font-bold mb-4 flex items-center gap-2">
                        <Icon name="mingcute:user-line" class="text-base-content/50" />
                        个人资料可见性
                    </h3>

                    <div class="space-y-4">
                        <div class="form-control w-full">
                            <label class="label">
                                <span class="label-text font-bold">个人资料可见性</span>
                            </label>
                            <select v-model="privacySettings.profileVisibility"
                                class="select select-bordered w-full focus:select-primary bg-base-100">
                                <option v-for="opt in visibilityOptions" :key="opt.value" :value="opt.value">
                                    {{ opt.label }}
                                </option>
                            </select>
                            <label class="label">
                                <span class="label-text-alt text-base-content/50">谁可以查看您的个人资料信息</span>
                            </label>
                        </div>

                        <div class="form-control w-full">
                            <label class="label">
                                <span class="label-text font-bold">在线状态</span>
                            </label>
                            <select v-model="privacySettings.onlineStatus"
                                class="select select-bordered w-full focus:select-primary bg-base-100">
                                <option v-for="opt in onlineStatusOptions" :key="opt.value" :value="opt.value">
                                    {{ opt.label }}
                                </option>
                            </select>
                        </div>

                        <div class="form-control w-full">
                            <label class="label">
                                <span class="label-text font-bold">最后上线时间</span>
                            </label>
                            <select v-model="privacySettings.showLastSeen"
                                class="select select-bordered w-full focus:select-primary bg-base-100">
                                <option v-for="opt in lastSeenOptions" :key="opt.value" :value="opt.value">
                                    {{ opt.label }}
                                </option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="divider"></div>

                <div>
                    <h3 class="text-md font-bold mb-4 flex items-center gap-2">
                        <Icon name="mingcute:eye-line" class="text-base-content/50" />
                        功能开关
                    </h3>

                    <div class="space-y-3">
                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" v-model="privacySettings.readReceipts"
                                    class="toggle toggle-primary" />
                                <span class="label-text">
                                    <span class="font-bold">已读回执</span>
                                    <br />
                                    <span class="text-sm text-base-content/50">向发送者显示消息已读状态</span>
                                </span>
                            </label>
                        </div>

                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" v-model="privacySettings.typingIndicator"
                                    class="toggle toggle-primary" />
                                <span class="label-text">
                                    <span class="font-bold">输入指示器</span>
                                    <br />
                                    <span class="text-sm text-base-content/50">显示您正在输入的状态</span>
                                </span>
                            </label>
                        </div>

                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" v-model="privacySettings.autoRead"
                                    class="toggle toggle-primary" />
                                <span class="label-text">
                                    <span class="font-bold">自动已读</span>
                                    <br />
                                    <span class="text-sm text-base-content/50">打开消息时自动标记为已读</span>
                                </span>
                            </label>
                        </div>

                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" v-model="privacySettings.allowSearchByEmail"
                                    class="toggle toggle-primary" />
                                <span class="label-text font-bold">允许通过邮箱搜索到我</span>
                            </label>
                        </div>

                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" v-model="privacySettings.allowAddByEmail"
                                    class="toggle toggle-primary" />
                                <span class="label-text font-bold">允许通过邮箱添加好友</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="divider"></div>

                <div>
                    <h3 class="text-md font-bold mb-4 flex items-center gap-2">
                        <Icon name="mingcute:lock-line" class="text-base-content/50" />
                        安全设置
                    </h3>

                    <div class="space-y-4">
                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" v-model="privacySettings.twoFactorEnabled"
                                    class="toggle toggle-primary" />
                                <span class="label-text">
                                    <span class="font-bold">两步验证</span>
                                    <br />
                                    <span class="text-sm text-base-content/50">增强账号安全性，需要额外验证步骤</span>
                                </span>
                            </label>
                        </div>

                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" v-model="privacySettings.sessionManagement"
                                    class="toggle toggle-primary" />
                                <span class="label-text">
                                    <span class="font-bold">新设备登录验证</span>
                                    <br />
                                    <span class="text-sm text-base-content/50">在新设备登录时发送验证通知</span>
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="divider"></div>

                <div>
                    <h3 class="text-md font-bold mb-4 flex items-center gap-2">
                        <Icon name="mingcute:database-line" class="text-base-content/50" />
                        数据管理
                    </h3>

                    <div class="space-y-4">
                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" v-model="privacySettings.dataExportEnabled"
                                    class="toggle toggle-primary" />
                                <span class="label-text font-bold">允许导出个人数据</span>
                            </label>
                        </div>

                        <div class="card bg-base-200/50 p-4 rounded-xl space-y-3">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="font-bold">消息记录备份</p>
                                    <p class="text-sm text-base-content/50">导出或导入 JSON 归档。</p>
                                </div>
                                <div v-if="conversationsLoading" class="text-xs text-base-content/40">加载中</div>
                            </div>

                            <div class="space-y-2">
                                <label class="label cursor-pointer justify-start gap-3">
                                    <input type="radio" value="all" v-model="exportScope" class="radio radio-primary" />
                                    <span class="label-text">导出全部会话</span>
                                </label>
                                <label class="label cursor-pointer justify-start gap-3">
                                    <input type="radio" value="selected" v-model="exportScope" class="radio radio-primary" />
                                    <span class="label-text">选择会话导出</span>
                                </label>
                            </div>

                            <div v-if="exportScope === 'selected'"
                                class="border border-base-content/10 rounded-xl p-3 max-h-60 overflow-y-auto space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="text-xs uppercase opacity-50">已选 {{ selectedConversationIds.length }}</span>
                                    <button type="button" class="btn btn-xs btn-ghost" @click="toggleAllConversations">
                                        全选/清空
                                    </button>
                                </div>
                                <label v-for="conv in conversations" :key="conv.id"
                                    class="flex items-center gap-3 p-2 rounded-lg hover:bg-base-100 cursor-pointer">
                                    <input type="checkbox" class="checkbox checkbox-sm checkbox-primary"
                                        :value="conv.id" v-model="selectedConversationIds" />
                                    <div class="flex flex-col min-w-0">
                                        <span class="truncate font-medium">{{ conv.title || '未命名会话' }}</span>
                                        <span class="text-xs text-base-content/50">
                                            {{ conv.type === 'GROUP' ? `群聊 · ${conv.memberCount} 人` : '私聊' }}
                                        </span>
                                    </div>
                                </label>
                                <div v-if="!conversations.length" class="text-sm text-base-content/50">暂无会话</div>
                            </div>

                            <div class="flex items-center gap-2">
                                <button type="button" class="btn btn-sm btn-primary" @click="handleExportArchive"
                                    :disabled="!privacySettings.dataExportEnabled || exportLoading || (exportScope === 'selected' && !selectedConversationIds.length)">
                                    <span v-if="exportLoading" class="loading loading-spinner loading-xs"></span>
                                    导出消息记录
                                </button>
                                <button type="button" class="btn btn-sm btn-ghost" @click="handleImportTrigger"
                                    :disabled="!privacySettings.dataExportEnabled || importLoading">
                                    <span v-if="importLoading" class="loading loading-spinner loading-xs"></span>
                                    导入消息记录
                                </button>
                                <input ref="importInputRef" type="file" class="hidden"
                                    accept="application/json,.json" @change="handleImportFile" />
                            </div>
                        </div>

                        <div class="card bg-base-200/50 p-4 rounded-xl">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="font-bold">其他设备会话</p>
                                    <p class="text-sm text-base-content/50">管理您账号的登录设备</p>
                                </div>
                                <button class="btn btn-sm btn-ghost" @click="handleClearSessions">
                                    查看全部
                                </button>
                            </div>
                        </div>

                        <div class="card bg-base-200/50 p-4 rounded-xl">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="font-bold">黑名单</p>
                                    <p class="text-sm text-base-content/50">已屏蔽 {{ privacySettings.blockList.length }} 个用户</p>
                                </div>
                                <button class="btn btn-sm btn-ghost text-error" @click="handleClearBlockList">
                                    清空
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card-actions justify-end mt-10 pt-6 border-t border-base-200 gap-3">
                <button class="btn btn-ghost rounded-xl" @click="handleExportArchive"
                    :disabled="!privacySettings.dataExportEnabled || exportLoading">
                    <span v-if="exportLoading" class="loading loading-spinner loading-xs"></span>
                    <Icon v-else name="mingcute:download-line" />
                    导出消息记录
                </button>
                <button class="btn btn-primary px-8 rounded-xl min-w-[120px]" @click="handleSave" :disabled="isSaving">
                    <span v-if="isSaving" class="loading loading-spinner loading-xs"></span>
                    保存修改
                </button>
            </div>
        </div>
    </div>
</template>
