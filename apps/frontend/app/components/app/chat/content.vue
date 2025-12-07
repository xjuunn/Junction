<script setup lang="ts">
import { ref } from 'vue';

// 附件数据
const attachments = [
    { name: 'cmd.center.fig', size: '21 MB', type: 'figma', color: 'text-purple-500', icon: 'mingcute:figma-line' },
    { name: 'comments.docx', size: '3.7 MB', type: 'doc', color: 'text-blue-500', icon: 'mingcute:file-line' },
    { name: 'img.png', size: '2.3 MB', type: 'image', color: 'text-green-500', icon: 'mingcute:pic-line' },
    { name: 'requirements.pdf', size: '1.5 MB', type: 'pdf', color: 'text-red-500', icon: 'mingcute:pdf-line' },
];

// 对话流数据
const thread = [
    {
        id: 1,
        author: '阿里 (Ali)',
        role: '发送给: 尼克, 莎拉',
        time: '3月25日 上午 10:15',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ali',
        body: "嘿团队，我已经更新了邮件客户端的设计，增加了一些新的交互。指挥中心采取了不同的设计思路——现在看起来干净多了。请查看新的流程，并告诉我你们的想法！",
        attachment: 'cmd.center.fig'
    },
    {
        id: 2,
        author: '莎拉 (Sarah)',
        role: '发送给: 阿里',
        time: '3月25日 下午 2:30',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
        body: "我花了一些时间试用新版本，有不少想法。指挥中心的方向绝对是正确的——新布局对高级用户来说更有意义。非常喜欢你将键盘快捷键自然地融入 UI 的方式。\n\n关于这几点请告诉我你的看法。我很乐意随时电话讨论细节。",
        isMe: false
    },
    {
        id: 3,
        author: '尼克 (Nick)',
        role: '发送给: 阿里, 莎拉',
        time: '3月25日 下午 3:45',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nick2',
        body: "同意莎拉的看法。快捷键的整合非常顺滑。",
        isMe: true
    }
];

const replyText = ref('');
</script>

<template>
    <div class="flex flex-col h-full bg-base-100 relative">

        <!-- 1. 顶部工具栏 (Sticky Top) -->
        <div
            class="flex items-center justify-between px-6 py-3 border-b border-base-content/5 shrink-0 bg-base-100/80 backdrop-blur-md sticky top-0 z-20">
            <div class="flex items-center gap-2 text-base-content/50">
                <button class="btn btn-sm btn-square btn-ghost hover:text-base-content transition-colors" title="关闭">
                    <Icon name="mingcute:close-line" size="20" />
                </button>
                <div class="h-4 w-[1px] bg-base-content/10 mx-1"></div>
                <button class="btn btn-sm btn-square btn-ghost hover:text-base-content transition-colors" title="上一条">
                    <Icon name="mingcute:up-line" size="20" />
                </button>
                <button class="btn btn-sm btn-square btn-ghost hover:text-base-content transition-colors" title="下一条">
                    <Icon name="mingcute:down-line" size="20" />
                </button>
            </div>

            <div class="flex items-center gap-1.5">
                <button
                    class="btn btn-sm btn-ghost bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-none btn-square rounded-lg">
                    <Icon name="mingcute:pin-fill" size="18" />
                </button>
                <button
                    class="btn btn-sm btn-ghost bg-base-200 hover:bg-base-300 text-base-content/70 border-none gap-2 rounded-lg font-normal px-3">
                    <Icon name="mingcute:back-2-line" size="18" /> 回复全部
                </button>
                <div class="h-4 w-[1px] bg-base-content/10 mx-1"></div>
                <button
                    class="btn btn-sm btn-ghost btn-square text-base-content/50 hover:text-base-content hover:bg-base-200 rounded-lg">
                    <Icon name="mingcute:star-line" size="20" />
                </button>
                <button
                    class="btn btn-sm btn-ghost btn-square text-base-content/50 hover:text-base-content hover:bg-base-200 rounded-lg">
                    <Icon name="mingcute:delete-2-line" size="20" />
                </button>
                <button
                    class="btn btn-sm btn-ghost btn-square text-base-content/50 hover:text-base-content hover:bg-base-200 rounded-lg">
                    <Icon name="mingcute:more-2-line" size="20" />
                </button>
            </div>
        </div>

        <!-- 2. 中间滚动内容 (Scrollable Content) -->
        <!-- pb-32 为底部固定输入框留出空间，防止内容被遮挡 -->
        <div class="flex-1 overflow-y-auto px-8 py-6 pb-32 scroll-smooth">

            <!-- 邮件主题头 -->
            <div class="mb-6">
                <div class="flex items-center gap-3 mb-2">
                    <h1 class="text-2xl font-bold text-base-content tracking-tight">回复：设计评审反馈 [6]</h1>
                    <span class="badge badge-sm badge-outline text-base-content/40 font-medium">收件箱</span>
                </div>
                <div class="flex items-center gap-4 text-xs font-medium">
                    <div class="flex items-center gap-1.5 text-base-content/50 bg-base-200/50 px-2 py-1 rounded-md">
                        <Icon name="mingcute:calendar-line" size="14" />
                        <span>3月25日 - 3月29日</span>
                    </div>
                </div>
            </div>

            <!-- 参与人标签 -->
            <div class="flex flex-wrap items-center gap-2 mb-8">
                <div
                    class="badge badge-lg badge-success gap-2 pl-1.5 pr-3 py-4 rounded-xl text-xs font-bold border-none text-success-content bg-success shadow-sm shadow-success/20">
                    <div class="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-[10px]">
                        <Icon name="mingcute:user-3-fill" />
                    </div>
                    参与者 (3)
                </div>

                <div class="flex -space-x-2 overflow-hidden px-2">
                    <img class="inline-block h-8 w-8 rounded-full ring-2 ring-base-100"
                        src="https://api.dicebear.com/7.x/avataaars/svg?seed=Ali" alt="" />
                    <img class="inline-block h-8 w-8 rounded-full ring-2 ring-base-100"
                        src="https://api.dicebear.com/7.x/avataaars/svg?seed=Nick" alt="" />
                    <img class="inline-block h-8 w-8 rounded-full ring-2 ring-base-100"
                        src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" alt="" />
                </div>

                <button
                    class="btn btn-xs h-8 bg-base-200/60 hover:bg-base-300 border-none rounded-lg text-xs font-medium text-base-content/60 gap-1 px-3">
                    <Icon name="mingcute:add-line" /> 邀请
                </button>
            </div>

            <!-- AI 摘要卡片 -->
            <div
                class="border border-base-content/5 bg-gradient-to-br from-base-200/50 to-base-100 rounded-2xl p-5 mb-8 relative overflow-hidden group">
                <!-- 装饰性渐变边框模拟 -->
                <div class="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-b from-primary to-secondary"></div>

                <div class="flex items-center justify-between mb-3">
                    <div
                        class="flex items-center gap-2 text-xs font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity">
                        <Icon name="mingcute:ai-line" size="16" />
                        AI 智能摘要
                    </div>
                    <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="btn btn-xs btn-ghost btn-square">
                            <Icon name="mingcute:thumb-up-line" />
                        </button>
                        <button class="btn btn-xs btn-ghost btn-square">
                            <Icon name="mingcute:thumb-down-line" />
                        </button>
                    </div>
                </div>
                <p class="text-sm text-base-content/70 leading-relaxed text-justify">
                    关于新邮件客户端功能的详细设计评审。团队重点讨论了指挥中心的改进方案以及分类系统的优化。总体反馈非常积极，针对快捷操作的布局位置提出了一些建设性的修改建议。
                </p>
            </div>

            <!-- 附件列表 -->
            <div class="mb-10">
                <div
                    class="flex items-center gap-2 text-xs font-bold text-base-content/40 mb-3 uppercase tracking-wider">
                    <Icon name="mingcute:attachment-line" />
                    附件 (4)
                </div>
                <div class="flex flex-wrap gap-3">
                    <div v-for="file in attachments" :key="file.name"
                        class="flex items-center gap-3 bg-base-100 border border-base-content/10 hover:border-primary/30 hover:shadow-sm px-3.5 py-2.5 rounded-xl cursor-pointer transition-all text-sm group">
                        <div class="p-1.5 rounded-lg bg-base-200 group-hover:bg-white transition-colors">
                            <Icon :name="file.icon" size="18" :class="file.color" />
                        </div>
                        <div class="flex flex-col">
                            <span class="font-medium text-base-content/80 group-hover:text-primary transition-colors">{{
                                file.name }}</span>
                            <span class="text-[10px] text-base-content/40">{{ file.size }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 对话流 (Thread) -->
            <div class="space-y-10 relative pl-4">
                <!-- 贯穿线 -->
                <!-- <div class="absolute left-[34px] top-6 bottom-12 w-[2px] bg-base-content/5"></div> -->

                <div v-for="(msg, index) in thread" :key="msg.id" class="relative group">
                    <div class="flex gap-5">
                        <!-- 头像 -->
                        <div class="avatar shrink-0 z-10">
                            <div class="w-10 h-10 rounded-full ring-4 ring-base-100 bg-base-200 shadow-sm">
                                <img :src="msg.avatar" />
                            </div>
                        </div>

                        <!-- 消息主体 -->
                        <div class="flex-1">
                            <!-- 消息头 -->
                            <div class="flex items-center justify-between mb-1.5">
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-sm text-base-content">{{ msg.author }}</span>
                                    <span class="text-xs text-base-content/40">{{ msg.role }}</span>
                                </div>
                                <span class="text-xs text-base-content/40 font-medium tabular-nums">{{ msg.time
                                }}</span>
                            </div>

                            <!-- 消息内容 -->
                            <div class="text-[15px] text-base-content/80 leading-relaxed whitespace-pre-wrap mb-3">{{
                                msg.body }}</div>

                            <!-- 消息内附件 -->
                            <div v-if="msg.attachment"
                                class="inline-flex items-center gap-3 bg-base-200/50 hover:bg-base-200 px-3 py-2 rounded-xl border border-base-content/5 transition-colors cursor-pointer">
                                <Icon name="mingcute:figma-line" class="text-purple-500" size="20" />
                                <div class="flex flex-col">
                                    <span class="text-xs font-bold text-base-content/80">{{ msg.attachment }}</span>
                                    <span class="text-[10px] text-base-content/40">21 MB · 点击预览</span>
                                </div>
                            </div>

                            <!-- 快捷操作栏 (悬浮显示) -->
                            <div
                                class="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button
                                    class="btn btn-xs btn-ghost gap-1 font-normal text-base-content/60 hover:bg-base-200">
                                    <Icon name="mingcute:back-line" /> 回复
                                </button>
                                <button
                                    class="btn btn-xs btn-ghost gap-1 font-normal text-base-content/60 hover:bg-base-200">
                                    <Icon name="mingcute:forward-line" /> 转发
                                </button>
                                <button class="btn btn-xs btn-square btn-ghost text-base-content/50">
                                    <Icon name="mingcute:emoji-line" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- 3. 底部固定回复框 (Fixed Footer) -->
        <div
            class="absolute bottom-0 left-0 right-0 border-t border-base-content/5 bg-base-100/80 backdrop-blur-xl z-30 p-5">
            <div class="max-w-4xl mx-auto flex flex-col gap-3">
                <!-- 提示信息 -->
                <div class="flex items-center justify-between px-1">
                    <div class="flex items-center gap-2 text-xs text-base-content/50">
                        <div class="w-2 h-2 rounded-full bg-success"></div>
                        <span>正在回复给 <b class="text-base-content/80">阿里, 莎拉</b></span>
                    </div>
                    <button class="btn btn-xs btn-ghost text-base-content/50 hover:text-base-content">
                        <Icon name="mingcute:fullscreen-line" />
                    </button>
                </div>

                <!-- 输入区域 -->
                <div
                    class="relative bg-base-200/50 focus-within:bg-base-100 focus-within:ring-2 focus-within:ring-primary/20 focus-within:shadow-sm border border-transparent focus-within:border-primary/50 rounded-lg transition-all">
                    <textarea v-model="replyText" rows="1" placeholder="输入回复内容..."
                        class="textarea textarea-ghost w-full resize-none border-none focus:outline-none bg-transparent py-3 text-sm min-h-[50px] leading-relaxed"></textarea>

                    <!-- 工具栏 -->
                    <div class="flex items-center justify-between px-2 pb-2">
                        <div class="flex items-center gap-1 text-base-content/40">
                            <button class="btn btn-sm btn-circle btn-ghost hover:text-primary">
                                <Icon name="mingcute:text-line" size="18" />
                            </button>
                            <button class="btn btn-sm btn-circle btn-ghost hover:text-primary">
                                <Icon name="mingcute:attachment-line" size="18" />
                            </button>
                            <button class="btn btn-sm btn-circle btn-ghost hover:text-primary">
                                <Icon name="mingcute:emoji-line" size="18" />
                            </button>
                            <button class="btn btn-sm btn-circle btn-ghost hover:text-primary">
                                <Icon name="mingcute:ai-line" size="18" />
                            </button>
                        </div>
                        <button
                            class="btn btn-sm btn-primary rounded-xl px-4 gap-2 font-bold shadow-lg shadow-primary/30 hover:scale-105 transition-transform">
                            发送
                            <Icon name="mingcute:send-plane-fill" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>