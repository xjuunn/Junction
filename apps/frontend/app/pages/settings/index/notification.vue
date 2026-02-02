<script setup lang="ts">
const toast = useToast();

const notificationSettings = reactive({
    enablePush: true,
    enableEmail: true,
    enableDesktop: true,
    soundEnabled: true,
    soundVolume: 80,
    showPreview: 'always',
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    messageNotifications: true,
    groupNotifications: true,
    friendRequestNotifications: true,
    systemNotifications: true,
    mentionNotifications: true,
});

const previewOptions = [
    { value: 'always', label: '始终显示' },
    { value: 'when-unlocked', label: '仅在解锁时显示' },
    { value: 'never', label: '从不显示' },
];

const isSaving = ref(false);

async function handleSave() {
    isSaving.value = true;
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success('通知设置已保存');
    isSaving.value = false;
}

function handleTestNotification() {
    toast.info('这是一条测试通知');
}
</script>

<template>
    <div
        class="card bg-base-100 shadow-sm border border-base-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div class="card-body p-6 md:p-8">
            <h2 class="card-title text-lg border-b border-base-200 pb-4 mb-6 flex items-center gap-2">
                <Icon name="mingcute:notification-line" class="text-primary" />
                通知设置
            </h2>

            <div class="space-y-8 max-w-2xl">
                <div>
                    <h3 class="text-md font-bold mb-4 flex items-center gap-2">
                        <Icon name="mingcute:notification-badge-line" class="text-base-content/50" />
                        通知渠道
                    </h3>

                    <div class="space-y-4">
                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" v-model="notificationSettings.enablePush"
                                    class="toggle toggle-primary" />
                                <span class="label-text">
                                    <span class="font-bold">推送通知</span>
                                    <br />
                                    <span class="text-sm text-base-content/50">通过系统推送接收消息通知</span>
                                </span>
                            </label>
                        </div>

                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" v-model="notificationSettings.enableEmail"
                                    class="toggle toggle-primary" />
                                <span class="label-text">
                                    <span class="font-bold">邮件通知</span>
                                    <br />
                                    <span class="text-sm text-base-content/50">通过邮件接收重要消息提醒</span>
                                </span>
                            </label>
                        </div>

                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" v-model="notificationSettings.enableDesktop"
                                    class="toggle toggle-primary" />
                                <span class="label-text">
                                    <span class="font-bold">桌面通知</span>
                                    <br />
                                    <span class="text-sm text-base-content/50">在桌面显示消息通知横幅</span>
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="divider"></div>

                <div>
                    <h3 class="text-md font-bold mb-4 flex items-center gap-2">
                        <Icon name="mingcute:volume-line" class="text-base-content/50" />
                        通知声音
                    </h3>

                    <div class="space-y-4">
                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" v-model="notificationSettings.soundEnabled"
                                    class="toggle toggle-primary" />
                                <span class="label-text font-bold">启用通知声音</span>
                            </label>
                        </div>

                        <div class="form-control w-full">
                            <label class="label">
                                <span class="label-text font-bold">声音音量</span>
                                <span class="label-text-alt">{{ notificationSettings.soundVolume }}%</span>
                            </label>
                            <input v-model.number="notificationSettings.soundVolume" type="range" min="0" max="100"
                                class="range range-primary" :disabled="!notificationSettings.soundEnabled" />
                        </div>
                    </div>
                </div>

                <div class="divider"></div>

                <div>
                    <h3 class="text-md font-bold mb-4 flex items-center gap-2">
                        <Icon name="mingcute:eye-off-line" class="text-base-content/50" />
                        通知显示
                    </h3>

                    <div class="space-y-4">
                        <div class="form-control w-full">
                            <label class="label">
                                <span class="label-text font-bold">预览内容</span>
                            </label>
                            <select v-model="notificationSettings.showPreview"
                                class="select select-bordered w-full focus:select-primary bg-base-100">
                                <option v-for="opt in previewOptions" :key="opt.value" :value="opt.value">
                                    {{ opt.label }}
                                </option>
                            </select>
                            <label class="label">
                                <span class="label-text-alt text-base-content/50">通知横幅中显示的消息预览内容</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="divider"></div>

                <div>
                    <h3 class="text-md font-bold mb-4 flex items-center gap-2">
                        <Icon name="mingcute:moon-line" class="text-base-content/50" />
                        勿扰模式
                    </h3>

                    <div class="space-y-4">
                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" v-model="notificationSettings.quietHoursEnabled"
                                    class="toggle toggle-primary" />
                                <span class="label-text font-bold">启用勿扰模式</span>
                            </label>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="form-control w-full">
                                <label class="label">
                                    <span class="label-text font-bold">开始时间</span>
                                </label>
                                <input v-model="notificationSettings.quietHoursStart" type="time"
                                    class="input input-bordered w-full focus:input-primary bg-base-100"
                                    :disabled="!notificationSettings.quietHoursEnabled" />
                            </div>

                            <div class="form-control w-full">
                                <label class="label">
                                    <span class="label-text font-bold">结束时间</span>
                                </label>
                                <input v-model="notificationSettings.quietHoursEnd" type="time"
                                    class="input input-bordered w-full focus:input-primary bg-base-100"
                                    :disabled="!notificationSettings.quietHoursEnabled" />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="divider"></div>

                <div>
                    <h3 class="text-md font-bold mb-4 flex items-center gap-2">
                        <Icon name="mingcute:message-3-line" class="text-base-content/50" />
                        通知类型
                    </h3>

                    <div class="space-y-3">
                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" v-model="notificationSettings.messageNotifications"
                                    class="toggle toggle-primary" />
                                <span class="label-text font-bold">新消息</span>
                            </label>
                        </div>

                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" v-model="notificationSettings.groupNotifications"
                                    class="toggle toggle-primary" />
                                <span class="label-text font-bold">群组消息</span>
                            </label>
                        </div>

                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" v-model="notificationSettings.mentionNotifications"
                                    class="toggle toggle-primary" />
                                <span class="label-text font-bold">提及我的消息</span>
                            </label>
                        </div>

                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" v-model="notificationSettings.friendRequestNotifications"
                                    class="toggle toggle-primary" />
                                <span class="label-text font-bold">好友请求</span>
                            </label>
                        </div>

                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" v-model="notificationSettings.systemNotifications"
                                    class="toggle toggle-primary" />
                                <span class="label-text font-bold">系统通知</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card-actions justify-end mt-10 pt-6 border-t border-base-200 gap-3">
                <button class="btn btn-ghost rounded-xl" @click="handleTestNotification">
                    <Icon name="mingcute:notification-fill" />
                    测试通知
                </button>
                <button class="btn btn-primary px-8 rounded-xl min-w-[120px]" @click="handleSave" :disabled="isSaving">
                    <span v-if="isSaving" class="loading loading-spinner loading-xs"></span>
                    保存更改
                </button>
            </div>
        </div>
    </div>
</template>
