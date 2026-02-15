<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import * as ConversationApi from '~/api/conversation';

definePageMeta({ layout: 'main' });

const emit = defineEmits<{
    (e: 'group-deleted', groupId: string): void;
}>();

const route = useRoute();
const router = useRouter();
const toast = useToast();

interface GroupInfo {
    id: string;
    title: string;
    avatar?: string;
    type: string;
    ownerId: string;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
    members?: Array<{
        userId: string;
        role: string;
        joinedAt: string;
        user: {
            id: string;
            name: string;
            email: string;
            image?: string;
        };
    }>;
}

const loading = ref(true);
const groupInfo = ref<GroupInfo | null>(null);
const members = ref<any[]>([]);
const isActionLoading = ref(false);

const conversationId = computed(() => route.params.id as string);

const isOwner = computed(() => groupInfo.value?.ownerId === useUserStore().user.value?.id);

const initData = async () => {
    if (!conversationId.value) {
        router.back();
        return;
    }

    loading.value = true;
    try {
        const { data, success, error } = await ConversationApi.findOne(conversationId.value);
        if (success && data) {
            groupInfo.value = data as unknown as GroupInfo;
        } else {
            toast.error(error || '获取群组信息失败');
            router.back();
            return;
        }

        const membersRes = await ConversationApi.getMembers(conversationId.value);
        if (membersRes.success && membersRes.data) {
            members.value = membersRes.data;
        }
    } catch (err: any) {
        toast.error(err.message || '网络请求异常');
    } finally {
        loading.value = false;
    }
};

const handleSendMessage = async () => {
    if (!groupInfo.value) return;

    isActionLoading.value = true;
    try {
        router.push(`/chat/${groupInfo.value.id}`);
    } catch (err: any) {
        toast.error(err.message || '网络错误');
    } finally {
        isActionLoading.value = false;
    }
};

const handleLeaveGroup = async () => {
    if (!groupInfo.value) return;

    const dialog = useDialog();
    const confirmed = await dialog.confirm({
        title: '退出群组',
        content: `确定要退出群组"${groupInfo.value.title}"吗？`,
        type: 'warning'
    });

    if (!confirmed) return;

    isActionLoading.value = true;
    try {
        const res = await ConversationApi.removeMember(groupInfo.value.id, useUserStore().user.value!.id);
        if (res.success) {
            toast.success('已退出群组');
            emit('group-deleted', groupInfo.value.id);
            router.push('/contacts');
        } else {
            toast.error(res.error || '退出失败');
        }
    } catch (err: any) {
        toast.error(err.message || '网络错误');
    } finally {
        isActionLoading.value = false;
    }
};

onMounted(() => {
    initData();
});
</script>

<template>
    <div class="h-full w-full overflow-y-auto hidden-scrollbar">
        <!-- Loading State -->
        <div v-if="loading"
            class="flex flex-col items-center justify-center h-full min-h-[400px] space-y-8 animate-pulse">
            <div class="w-32 h-32 rounded-full bg-base-content/10"></div>
            <div class="flex flex-col items-center gap-3 w-full max-w-xs">
                <div class="h-8 w-3/4 bg-base-content/10 rounded-lg"></div>
                <div class="h-4 w-1/2 bg-base-content/10 rounded-lg"></div>
            </div>
            <div class="w-full max-w-md px-8 space-y-4">
                <div class="h-12 w-full bg-base-content/10 rounded-xl"></div>
                <div class="h-12 w-full bg-base-content/10 rounded-xl"></div>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="!groupInfo" v-motion-fade
            class="flex flex-col items-center justify-center h-full min-h-[400px] text-base-content/50 gap-6">
            <div class="p-6 bg-base-200/50 rounded-full">
                <Icon name="mingcute:group-3-line" size="48" />
            </div>
            <div class="text-center">
                <h3 class="text-lg font-bold text-base-content">未找到群组</h3>
                <p class="text-sm mt-1">该群组可能已被解散或不存在</p>
            </div>
            <button @click="router.back()" class="btn btn-ghost btn-sm">
                返回上一页
            </button>
        </div>

        <!-- Content -->
        <div v-else class="min-h-full w-full max-w-3xl mx-auto p-4 sm:p-6 lg:p-10 flex flex-col gap-6"
            v-motion-slide-bottom>
            <!-- Header Card -->
            <div class="relative overflow-hidden rounded-3xl backdrop-blur-xl border border-base-content/5 shadow-sm">
                <!-- Decorative Background -->
                <div class="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent"></div>

                <div class="relative px-6 pt-12 pb-8 flex flex-col items-center text-center">
                    <!-- Avatar with Status Ring -->
                    <div class="relative group">
                        <BaseAvatar :text="groupInfo.title" :src="groupInfo.avatar || undefined" :alt="groupInfo.title"
                            :width="120" :height="120" :radius="40" :placeholder-length="2"
                            class="shadow-xl ring-4 ring-base-100/50 backdrop-blur-sm transition-transform duration-300 group-hover:scale-105" />
                        <div
                            class="absolute -bottom-1 -right-1 bg-base-100 rounded-full p-1 shadow-sm border border-base-content/5">
                            <div class="bg-primary/10 text-primary p-1.5 rounded-full">
                                <Icon name="mingcute:group-fill" size="16" />
                            </div>
                        </div>
                    </div>

                    <!-- Title & ID -->
                    <div class="mt-5 space-y-1">
                        <h1
                            class="text-2xl sm:text-3xl font-black tracking-tight text-base-content flex items-center justify-center gap-2">
                            {{ groupInfo.title }}
                        </h1>
                        <div class="flex items-center justify-center gap-2 text-sm text-base-content/60">
                            <span>ID: {{ groupInfo.id.slice(0, 8) }}...</span>
                            <button @click="useClipboard().copy(groupInfo.id); toast.success('群ID已复制')"
                                class="hover:text-primary transition-colors">
                                <Icon name="mingcute:copy-2-line" size="14" />
                            </button>
                        </div>
                    </div>

                    <!-- Tags/Badges -->
                    <div class="mt-4 flex flex-wrap gap-2 justify-center">
                        <div class="badge badge-lg badge-ghost gap-1.5 pl-1.5 pr-3 h-8">
                            <Icon name="mingcute:user-3-line" size="14" />
                            {{ groupInfo.memberCount }} 成员
                        </div>
                        <div v-if="isOwner" class="badge badge-lg badge-primary badge-outline gap-1.5 pl-1.5 pr-3 h-8">
                            <Icon name="mingcute:crown-line" size="14" />
                            我是群主
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Actions -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button @click="handleSendMessage" :disabled="isActionLoading"
                    class="btn btn-primary btn-lg w-full shadow-lg shadow-primary/10 border-none transform active:scale-[0.98] transition-all">
                    <span v-if="isActionLoading" class="loading loading-spinner loading-md"></span>
                    <template v-else>
                        <Icon name="mingcute:chat-4-fill" size="22" />
                        <span class="font-bold">发送消息</span>
                    </template>
                </button>

                <button @click="handleLeaveGroup" :disabled="isActionLoading"
                    class="btn btn-lg w-full bg-base-100/80 backdrop-blur-md border border-base-content/10 hover:bg-error/10 hover:border-error/30 hover:text-error transform active:scale-[0.98] transition-all">
                    <Icon name="mingcute:exit-line" size="20" />
                    <span class="text-sm font-medium">退出群组</span>
                </button>
            </div>

            <!-- Information Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                    class="bg-base-100/30 backdrop-blur-md rounded-2xl p-5 border border-base-content/5 flex flex-col gap-4 hover:bg-base-100/50 transition-colors">
                    <h3 class="text-sm font-bold text-base-content/40 uppercase tracking-wider">群组信息</h3>

                    <div class="flex items-center gap-4">
                        <div
                            class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Icon name="mingcute:calendar-line" size="20" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="text-xs text-base-content/50 mb-0.5">创建时间</div>
                            <div class="text-sm font-medium">{{ formatTimeAgo(groupInfo.createdAt) }}</div>
                        </div>
                    </div>
                </div>

                <div
                    class="bg-base-100/30 backdrop-blur-md rounded-2xl p-5 border border-base-content/5 flex flex-col gap-4 hover:bg-base-100/50 transition-colors">
                    <h3 class="text-sm font-bold text-base-content/40 uppercase tracking-wider">活跃状态</h3>

                    <div class="flex items-center gap-4">
                        <div
                            class="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                            <Icon name="mingcute:history-line" size="20" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="text-xs text-base-content/50 mb-0.5">最近活跃</div>
                            <div class="text-sm font-medium">{{ formatTimeAgo(groupInfo.updatedAt) }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Members Preview -->
            <div class="bg-base-100/30 backdrop-blur-md rounded-3xl border border-base-content/5 overflow-hidden">
                <div class="px-6 py-5 border-b border-base-content/5 flex items-center justify-between">
                    <h3 class="font-bold text-lg flex items-center gap-2">
                        群成员
                        <span class="badge badge-sm badge-ghost">{{ members.length }}</span>
                    </h3>
                </div>

                <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div v-for="member in members.slice(0, 10)" :key="member.userId"
                        class="flex items-center gap-3 p-3 rounded-2xl hover:bg-base-200/50 transition-colors border border-transparent hover:border-base-content/5">
                        <BaseAvatar :text="member.user?.name" :height="40" :width="40" :radius="14"
                            :src="member.user?.image" :alt="member.user?.name" :placeholder-length="2" />

                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-1.5">
                                <span class="font-bold text-sm truncate">{{ member.user?.name }}</span>
                                <Icon v-if="member.role === 'OWNER'" name="mingcute:crown-fill" size="14"
                                    class="text-warning" title="群主" />
                                <Icon v-else-if="member.role === 'ADMIN'" name="mingcute:shield-fill" size="14"
                                    class="text-info" title="管理员" />
                            </div>
                            <div class="text-xs text-base-content/40 truncate">
                                {{ formatTimeAgo(member.joinedAt) }}加入
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="members.length > 10" class="px-6 pb-5 pt-2 text-center">
                    <button class="btn btn-ghost btn-sm btn-block text-base-content/50 hover:text-base-content">
                        查看全部 {{ members.length }} 位成员
                        <Icon name="mingcute:arrow-right-line" />
                    </button>
                </div>
            </div>

            <!-- Footer Info -->
            <div class="text-center pb-8 opacity-30 text-xs">
                Junction Group Profile
            </div>
        </div>
    </div>
</template>


<style scoped>
.hidden-scrollbar {
    scrollbar-width: none;
    /* Firefox */
}
</style>