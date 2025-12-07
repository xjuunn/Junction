<script setup lang="ts">
import { type ChatItemProps } from './item.vue';
const chatList = ref<ChatItemProps[]>([
    {
        id: 1,
        name: '欧强',
        time: '12分钟前',
        preview: '太酷了，你是怎么做到的？非常有创意...',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ochieng',
        isPinned: true,
        status: 'online',
        unreadCount: 0
    },
    {
        id: 2,
        name: '阿里',
        time: '2小时前',
        preview: '那你觉得怎么样？',
        avatarColor: 'bg-[#5B4D88]',
        initials: 'AM',
        isMuted: true,
        status: 'sleep',
        unreadCount: 3
    },
    {
        id: 3,
        name: '尤兰达',
        time: '2小时前',
        preview: '语音消息 (0:12)',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yolonda',
        isActive: true,
        isVoice: true,
        isRead: true,
        status: 'none'
    },
    {
        id: 4,
        name: '莎奈',
        time: '3小时前',
        preview: '哇，非常感谢！',
        avatarColor: 'bg-[#7A3E4D]',
        initials: 'SM',
        status: 'love',
        unreadCount: 0
    },
    {
        id: 5,
        name: '杰德',
        time: '5小时前',
        preview: '发送了一张图片',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jed',
        isPhoto: true,
        unreadCount: 0
    },
    {
        id: 6,
        name: '设计团队',
        time: '昨天',
        preview: '下周的会议提纲已经发到群里了。',
        avatarColor: 'bg-primary',
        initials: 'DT',
        unreadCount: 5
    }
]);

// 标签数据
const tabs = [
    { key: 'all', label: '全部', count: 6 },
    { key: 'personal', label: '个人', count: 4 },
    { key: 'other', label: '其他', count: 2 }
];

const activeTab = ref('all');

// 点击处理
const handleChatClick = (id: number) => {
    chatList.value.forEach(chat => {
        chat.isActive = chat.id === id;
    });
};
</script>

<template>
    <div class="flex flex-col h-full bg-base-100 select-none text-base-content font-sans overflow-hidden">

        <!-- 头部区域 -->
        <div class="px-6 pt-7 pb-4 shrink-0 flex items-center justify-between">
            <h1 class="text-[20px] font-bold tracking-tight text-base-content">消息通知</h1>

            <!-- 右侧操作组 -->
            <div class="flex items-center gap-2">
                <!-- 全读按钮 -->
                <button
                    class="btn btn-sm btn-square border-none bg-base-content/5 hover:bg-base-content/10 text-base-content/60 rounded-lg transition-colors">
                    <Icon name="mingcute:check-line" size="18" />
                </button>
                <!-- 设置按钮 -->
                <button
                    class="btn btn-sm btn-square border-none bg-base-content/5 hover:bg-base-content/10 text-base-content/60 rounded-lg transition-colors">
                    <Icon name="mingcute:settings-3-line" size="18" />
                </button>
            </div>
        </div>

        <!-- 标签切换 -->
        <div
            class="px-6 flex items-center gap-6 text-[13px] font-medium shrink-0 border-b border-base-content/5 relative">
            <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
                class="pb-3 relative flex items-center gap-2 transition-all outline-none group"
                :class="activeTab === tab.key ? 'text-base-content' : 'text-base-content/40 hover:text-base-content/70'">
                <!-- 标签文字 -->
                <span :class="activeTab === tab.key ? 'font-bold' : 'font-medium'">
                    {{ tab.label }}
                </span>

                <!-- 计数胶囊 -->
                <span
                    class="h-[18px] min-w-[18px] px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors"
                    :class="activeTab === tab.key
                        ? 'bg-primary text-primary-content shadow-[0_2px_8px_rgba(var(--p)/0.4)]'
                        : 'bg-base-content/5 text-base-content/40 group-hover:bg-base-content/10'">
                    {{ tab.count }}
                </span>

                <!-- 底部激活条 -->
                <div v-if="activeTab === tab.key"
                    class="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t-full shadow-[0_-1px_6px_rgba(var(--p)/0.6)]">
                </div>
            </button>
        </div>

        <!-- 列表 -->
        <div class="flex-1 overflow-y-auto px-3 py-3 space-y-1 scroll-smooth">
            <div class="pb-4 space-y-1.5">
                <AppChatItem v-for="chat in chatList" :key="chat.id" :data="chat" @click="handleChatClick(chat.id)" />
            </div>
        </div>
    </div>
</template>