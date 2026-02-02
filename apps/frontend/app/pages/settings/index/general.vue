<script setup lang="ts">
const appStore = useAppStore();
const toast = useToast();

const formData = reactive({
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
});

const languageOptions = [
    { value: 'zh-CN', label: '简体中文' },
    { value: 'en-US', label: 'English (US)' },
    { value: 'zh-TW', label: '繁體中文' },
    { value: 'ja-JP', label: '日本語' },
];

const timezoneOptions = [
    { value: 'Asia/Shanghai', label: '北京时区 (UTC+8)' },
    { value: 'Asia/Tokyo', label: '东京时区 (UTC+9)' },
    { value: 'America/New_York', label: '纽约时区 (UTC-5)' },
    { value: 'Europe/London', label: '伦敦时区 (UTC+0)' },
];

const dateFormatOptions = [
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
];

const timeFormatOptions = [
    { value: '12h', label: '12小时制 (上午/下午)' },
    { value: '24h', label: '24小时制' },
];

const isSaving = ref(false);

async function handleSave() {
    isSaving.value = true;
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success('设置已保存');
    isSaving.value = false;
}
</script>

<template>
    <div
        class="card bg-base-100 shadow-sm border border-base-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                    <select v-model="formData.language" class="select select-bordered w-full focus:select-primary bg-base-100">
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
                    <select v-model="formData.timezone" class="select select-bordered w-full focus:select-primary bg-base-100">
                        <option v-for="opt in timezoneOptions" :key="opt.value" :value="opt.value">
                            {{ opt.label }}
                        </option>
                    </select>
                    <label class="label">
                        <span class="label-text-alt text-base-content/50">用于时间显示和通知调度</span>
                    </label>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="form-control w-full">
                        <label class="label">
                            <span class="label-text font-bold">日期格式</span>
                        </label>
                        <select v-model="formData.dateFormat"
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
                        <select v-model="formData.timeFormat"
                            class="select select-bordered w-full focus:select-primary bg-base-100">
                            <option v-for="opt in timeFormatOptions" :key="opt.value" :value="opt.value">
                                {{ opt.label }}
                            </option>
                        </select>
                    </div>
                </div>

                <div class="divider"></div>

                <div class="form-control">
                    <label class="label cursor-pointer justify-start gap-4">
                        <input type="checkbox" class="toggle toggle-primary" checked />
                        <span class="label-text">
                            <span class="font-bold">自动检查更新</span>
                            <br />
                            <span class="text-sm text-base-content/50">在应用启动时自动检查是否有新版本</span>
                        </span>
                    </label>
                </div>

                <div class="form-control">
                    <label class="label cursor-pointer justify-start gap-4">
                        <input type="checkbox" class="toggle toggle-primary" />
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
