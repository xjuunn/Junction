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
    <div class="flex flex-col h-full bg-base-100">
        <div class="flex-1 overflow-y-auto">
            <div v-if="loading" class="flex flex-col items-center justify-center h-[60vh] space-y-6">
                <div class="w-24 h-24 rounded-full bg-base-200 animate-pulse"></div>
                <div class="h-6 w-32 bg-base-200 rounded animate-pulse"></div>
                <div class="h-4 w-48 bg-base-200 rounded animate-pulse"></div>
            </div>

            <div v-else-if="groupInfo" class="flex flex-col">
                <div class="p-8 pb-4 flex flex-col items-center">
                    <BaseAvatar :text="groupInfo.title" :height="100" :width="100" :radius="20" :src="groupInfo.avatar || undefined"
                        :alt="groupInfo.title" :placeholder-length="2" class="ring-2 ring-base-200" />

                    <h2 class="mt-4 text-2xl font-black tracking-tight flex items-center gap-2">
                        {{ groupInfo.title }}
                        <div v-if="isOwner" class="badge badge-primary badge-sm">群主</div>
                    </h2>

                    <div class="mt-2 flex items-center gap-2 text-sm opacity-50">
                        <Icon name="mingcute:group-line" size="14" />
                        <span>{{ groupInfo.memberCount }} 位成员</span>
                    </div>
                </div>

                <div class="px-6 py-4 space-y-2">
                    <div class="flex items-center justify-between px-4 py-3 bg-base-200/50 rounded-xl">
                        <div class="flex items-center gap-3">
                            <Icon name="mingcute:time-line" size="18" class="opacity-50" />
                            <span class="text-sm font-medium">创建时间</span>
                        </div>
                        <span class="text-sm opacity-50">{{ formatTimeAgo(groupInfo.createdAt) }}</span>
                    </div>

                    <div class="flex items-center justify-between px-4 py-3 bg-base-200/50 rounded-xl">
                        <div class="flex items-center gap-3">
                            <Icon name="mingcute:history-line" size="18" class="opacity-50" />
                            <span class="text-sm font-medium">活跃时间</span>
                        </div>
                        <span class="text-sm opacity-50">{{ formatTimeAgo(groupInfo.updatedAt) }}</span>
                    </div>
                </div>

                <div class="px-6 py-4">
                    <h3 class="text-sm font-bold mb-3 opacity-70">群成员</h3>
                    <div class="space-y-2">
                        <div v-for="member in members.slice(0, 10)" :key="member.userId"
                            class="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-base-200/50">
                            <BaseAvatar :text="member.user?.name" :height="36" :width="36" :radius="8"
                                :src="member.user?.image" :alt="member.user?.name" :placeholder-length="2" />
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <span class="font-medium text-sm truncate">{{ member.user?.name }}</span>
                                    <Icon v-if="member.role === 'OWNER'" name="mingcute:hand-fill" size="12" class="text-warning" />
                                    <Icon v-else-if="member.role === 'ADMIN'" name="mingcute:shield-user-fill" size="12" class="text-info" />
                                </div>
                            </div>
                        </div>
                        <div v-if="members.length > 10" class="text-center py-2 text-sm opacity-40">
                            还有 {{ members.length - 10 }} 位成员...
                        </div>
                    </div>
                </div>

                <div class="px-6 py-4 space-y-3">
                    <button @click="handleSendMessage" :disabled="isActionLoading"
                        class="btn btn-primary w-full shadow-lg shadow-primary/20">
                        <span v-if="isActionLoading" class="loading loading-spinner loading-sm"></span>
                        <Icon v-else name="mingcute:chat-4-line" size="18" />
                        发送消息
                    </button>

                    <button @click="handleLeaveGroup" :disabled="isActionLoading"
                        class="btn btn-error btn-outline w-full">
                        <Icon name="mingcute:exit-line" size="18" />
                        退出群组
                    </button>
                </div>
            </div>

            <div v-else class="flex flex-col items-center justify-center h-[60vh] text-base-content/30 gap-4">
                <Icon name="mingcute:error-line" size="48" />
                <p class="text-sm font-medium">群组信息加载失败</p>
            </div>
        </div>
    </div>
</template>
