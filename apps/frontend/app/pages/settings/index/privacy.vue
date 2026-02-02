<script setup lang="ts">
const toast = useToast();

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
});

const visibilityOptions = [
    { value: 'everyone', label: '所有人' },
    { value: 'contacts', label: '仅好友' },
    { value: 'nobody', label: '仅自己' },
];

const onlineStatusOptions = [
    { value: 'everyone', label: '所有人可见' },
    { value: 'contacts', label: '仅好友可见' },
    { value: 'nobody', label: '隐藏在线状态' },
];

const lastSeenOptions = [
    { value: 'everyone', label: '所有人' },
    { value: 'contacts', label: '仅好友' },
    { value: 'nobody', label: '无人' },
];

const isSaving = ref(false);
const isExporting = ref(false);

async function handleSave() {
    isSaving.value = true;
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success('隐私设置已保存');
    isSaving.value = false;
}

async function handleExportData() {
    isExporting.value = true;
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success('数据导出请求已提交，请查收邮件');
    isExporting.value = false;
}

function handleClearSessions() {
    toast.success('其他设备已退出登录');
}

function handleClearBlockList() {
    toast.success('已清空黑名单');
}
</script>

<template>
    <div
        class="card bg-base-100 shadow-sm border border-base-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                                    <span class="text-sm text-base-content/50">增强账户安全性，需要额外验证步骤</span>
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

                        <div class="card bg-base-200/50 p-4 rounded-xl">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="font-bold">其他设备会话</p>
                                    <p class="text-sm text-base-content/50">管理您账户的登录设备</p>
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
                <button class="btn btn-ghost rounded-xl" @click="handleExportData" :disabled="isExporting">
                    <span v-if="isExporting" class="loading loading-spinner loading-xs"></span>
                    <Icon v-else name="mingcute:download-line" />
                    导出数据
                </button>
                <button class="btn btn-primary px-8 rounded-xl min-w-[120px]" @click="handleSave" :disabled="isSaving">
                    <span v-if="isSaving" class="loading loading-spinner loading-xs"></span>
                    保存更改
                </button>
            </div>
        </div>
    </div>
</template>
