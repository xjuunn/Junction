<script setup lang="ts">
import { useClipboard } from '@vueuse/core';

definePageMeta({ layout: "main" });

const { copy, copied } = useClipboard();
const toast = useToast();

const appVersion = '1.0.0';
const buildDate = '2026-02-02';
const appName = 'Junction';

const teamMembers = [
    { name: '开发团队', role: '核心开发' },
];

const links = [
    { name: '官方网站', url: 'https://junction.app', icon: 'mingcute:global-line' },
    { name: '帮助文档', url: 'https://docs.junction.app', icon: 'mingcute:book-line' },
    { name: 'GitHub', url: 'https://github.com/junction', icon: 'mingcute:github-line' },
    { name: '问题反馈', url: 'https://github.com/junction/issues', icon: 'mingcute:feedback-line' },
];

const techStack = [
    { name: 'Nuxt 4', description: '前端框架' },
    { name: 'Vue 3', description: 'UI 框架' },
    { name: 'NestJS', description: '后端框架' },
    { name: 'Prisma', description: 'ORM' },
    { name: 'Tauri', description: '桌面/移动端' },
    { name: 'Tailwind CSS', description: '样式框架' },
];

function handleCopyVersion() {
    copy(`Version: ${appVersion}\nBuild: ${buildDate}`);
    toast.success('版本信息已复制');
}

function handleOpenLink(url: string) {
    window.open(url, '_blank');
}
</script>

<template>
    <div
        class="card bg-base-100 shadow-sm border border-base-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div class="card-body p-6 md:p-8">
            <h2 class="card-title text-lg border-b border-base-200 pb-4 mb-6 flex items-center gap-2">
                <Icon name="mingcute:information-line" class="text-primary" />
                关于 Junction
            </h2>

            <div class="space-y-8 max-w-2xl">
                <div class="flex flex-col md:flex-row items-center gap-6 p-6 bg-base-200/30 rounded-2xl">
                    <div class="avatar placeholder">
                        <div class="bg-primary text-primary-content rounded-2xl w-20 h-20 text-3xl font-bold">
                            J
                        </div>
                    </div>
                    <div class="text-center md:text-left">
                        <h3 class="text-2xl font-bold">{{ appName }}</h3>
                        <p class="text-base-content/60">连接一切，沟通无界</p>
                        <div class="flex items-center gap-2 mt-2">
                            <span class="badge badge-primary">v{{ appVersion }}</span>
                            <button class="btn btn-xs btn-ghost" @click="handleCopyVersion">
                                <Icon name="mingcute:copy-line" />
                                复制版本信息
                            </button>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 class="text-md font-bold mb-4 flex items-center gap-2">
                        <Icon name="mingcute:link-line" class="text-base-content/50" />
                        快捷链接
                    </h3>

                    <div class="grid grid-cols-2 gap-3">
                        <button v-for="link in links" :key="link.name"
                            @click="handleOpenLink(link.url)"
                            class="btn btn-ghost justify-start gap-3 h-14">
                            <Icon :name="link.icon" size="22" class="text-primary" />
                            {{ link.name }}
                        </button>
                    </div>
                </div>

                <div class="divider"></div>

                <div>
                    <h3 class="text-md font-bold mb-4 flex items-center gap-2">
                        <Icon name="mingcute:stack-line" class="text-base-content/50" />
                        技术栈
                    </h3>

                    <div class="flex flex-wrap gap-2">
                        <div v-for="tech in techStack" :key="tech.name"
                            class="badge badge-lg badge-outline gap-2 py-4 px-3">
                            <span class="font-bold">{{ tech.name }}</span>
                            <span class="text-base-content/50">{{ tech.description }}</span>
                        </div>
                    </div>
                </div>

                <div class="divider"></div>

                <div>
                    <h3 class="text-md font-bold mb-4 flex items-center gap-2">
                        <Icon name="mingcute:file-text-line" class="text-base-content/50" />
                        开源许可
                    </h3>

                    <div class="card bg-base-200/30 p-4 rounded-xl">
                        <p class="text-sm text-base-content/70 mb-3">
                            Junction 是一个开源项目，采用 MIT 许可证开源。
                            我们感谢所有贡献者的付出。
                        </p>
                        <div class="flex flex-wrap gap-2">
                            <button class="btn btn-sm btn-ghost" @click="handleOpenLink('https://opensource.org/licenses/MIT')">
                                <Icon name="mingcute:document-line" />
                                MIT License
                            </button>
                            <button class="btn btn-sm btn-ghost"
                                @click="handleOpenLink('https://github.com/junction/junction/blob/main/PRIVACY.md')">
                                <Icon name="mingcute:shield-line" />
                                隐私政策
                            </button>
                            <button class="btn btn-sm btn-ghost"
                                @click="handleOpenLink('https://github.com/junction/junction/blob/main/TERMS.md')">
                                <Icon name="mingcute:scales-line" />
                                服务条款
                            </button>
                        </div>
                    </div>
                </div>

                <div class="divider"></div>

                <div>
                    <h3 class="text-md font-bold mb-4 flex items-center gap-2">
                        <Icon name="mingcute:heart-line" class="text-error" />
                        致谢
                    </h3>

                    <div class="card bg-base-200/30 p-4 rounded-xl">
                        <p class="text-sm text-base-content/70">
                            感谢您使用 Junction！您的支持是我们前进的动力。
                            如有任何问题或建议，欢迎通过上述链接与我们联系。
                        </p>
                        <p class="text-sm text-base-content/50 mt-3">
                            Build: {{ buildDate }}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
