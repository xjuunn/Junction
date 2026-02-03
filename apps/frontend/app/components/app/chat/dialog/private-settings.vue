<script setup lang="ts">
import * as conversationApi from '~/api/conversation';
import * as friendshipApi from '~/api/friendship';
import type { PrismaTypes } from '@junction/types';

interface Props {
    conversation: PrismaTypes.Conversation | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'conversation-deleted'): void;
}>();

const toast = useToast();
const dialog = useDialog();
const router = useRouter();
const authClient = useAuthClient();

const friendInfo = ref<any>(null);
const remark = ref('');
const loading = ref(false);
const currentUserId = ref<string>('');

const fetchCurrentUser = async () => {
    const { data } = await authClient.getSession();
    currentUserId.value = data?.user?.id || '';
};

const otherUserId = computed(() => props.conversation?.otherUserId || null);

const currentMember = computed(() => props.conversation?.mySettings);
const isMuted = computed(() => currentMember.value?.muted ?? false);
const isPinned = computed(() => currentMember.value?.pinned ?? false);
const isBlocked = computed(() => friendInfo.value?.status === 'BLOCKED');

const fetchFriendInfo = async () => {
    if (!otherUserId.value) return;
    loading.value = true;
    try {
        const res = await friendshipApi.findOne(otherUserId.value);
        if (res.data) {
            friendInfo.value = res.data;
            remark.value = res.data.note || '';
        }
    } finally {
        loading.value = false;
    }
};

const handleSaveRemark = async () => {
    if (!otherUserId.value) {
        toast.error('无法获取好友ID');
        return;
    }
    try {
        const res = await friendshipApi.update(otherUserId.value, { remark: remark.value });
        if (res.success) {
            toast.success('备注已更新');
        } else {
            toast.error(res.error || '更新失败');
        }
    } catch (e: any) {
        toast.error(e.message || '更新备注失败');
    }
};

const handleToggleMute = async () => {
    if (!props.conversation?.id) return;
    const newValue = !isMuted.value;
    const res = await conversationApi.updateSettings(props.conversation.id, {
        muted: newValue
    } as any);
    if (res.success) {
        toast.success(newValue ? '已开启免打扰' : '已取消免打扰');
        emit('conversation-deleted');
    }
};

const handleTogglePin = async () => {
    if (!props.conversation?.id) return;
    const newValue = !isPinned.value;
    const res = await conversationApi.updateSettings(props.conversation.id, {
        pinned: newValue
    } as any);
    if (res.success) {
        toast.success(newValue ? '已开启置顶' : '已取消置顶');
        emit('conversation-deleted');
    }
};

const handleBlock = async () => {
    if (!otherUserId.value) {
        toast.error('无法获取用户ID');
        return;
    }
    
    const confirmed = await dialog.confirm({
        title: isBlocked.value ? '解除拉黑' : '拉黑用户',
        content: isBlocked.value ? '确定要解除拉黑吗？' : '确定要拉黑该用户吗？拉黑后将不再接收对方的消息。',
        type: 'warning',
        confirmText: isBlocked.value ? '解除拉黑' : '拉黑',
    });
    if (!confirmed) return;
    
    try {
        const res = await friendshipApi.block(otherUserId.value);
        if (res.success) {
            toast.success(isBlocked.value ? '已解除拉黑' : '已拉黑用户');
            fetchFriendInfo();
        } else {
            toast.error(res.error || '操作失败');
        }
    } catch (e: any) {
        toast.error(e.message || '操作失败');
    }
};

const handleDeleteChat = async () => {
    const confirmed = await dialog.confirm({
        title: '删除聊天',
        content: '确定要删除该聊天记录吗？此操作不可恢复。',
        type: 'error',
        confirmText: '删除',
    });
    if (!confirmed) return;
    if (!props.conversation?.id) return;
    const res = await conversationApi.remove(props.conversation.id);
    if (res.success) {
        toast.success('聊天已删除');
        emit('conversation-deleted');
        router.push('/chat');
    }
};

const handleBlockAndDelete = async () => {
    const confirmed = await dialog.confirm({
        title: '加入黑名单并删除聊天',
        content: '确定要将该用户加入黑名单并删除聊天记录吗？',
        type: 'error',
        confirmText: '确定',
    });
    if (!confirmed) return;
    if (!otherUserId.value || !props.conversation?.id) return;
    await friendshipApi.block(otherUserId.value);
    await conversationApi.remove(props.conversation.id);
    toast.success('已加入黑名单并删除聊天');
    emit('conversation-deleted');
    router.push('/chat');
};

onMounted(async () => {
    await fetchCurrentUser();
    fetchFriendInfo();
});

watch(() => props.conversation, () => {
    fetchFriendInfo();
}, { immediate: true });
</script>

<template>
    <div class="space-y-6">
        <div class="flex flex-col items-center gap-4 pb-6 border-b border-base-200">
            <BaseAvatar :text="conversation?.title" :src="conversation?.avatar" :size="80" :radius="20" />
            <div class="text-center">
                <h3 class="text-xl font-bold">{{ conversation?.title }}</h3>
                <p class="text-sm opacity-50">ID: {{ otherUserId }}</p>
                <div class="flex items-center justify-center gap-2 mt-2">
                    <span class="badge" :class="conversation?.online ? 'badge-success' : 'badge-ghost'">
                        {{ conversation?.online ? '在线' : '离线' }}
                    </span>
                </div>
            </div>
        </div>

        <div class="space-y-4">
            <div class="form-control">
                <label class="label">
                    <span class="label-text font-medium">设置备注</span>
                </label>
                <div class="flex gap-2">
                    <input v-model="remark" type="text" placeholder="输入备注名"
                        class="input input-bordered input-sm flex-1" />
                    <button class="btn btn-soft btn-primary btn-sm" @click="handleSaveRemark">
                        保存
                    </button>
                </div>
            </div>
        </div>

        <div class="divider"></div>

        <div class="space-y-3">
            <button class="btn btn-soft btn-sm w-full justify-start" @click="handleBlock">
                <Icon :name="isBlocked ? 'mingcute:check-circle-fill' : 'mingcute:close-line'" />
                {{ isBlocked ? '解除拉黑' : '加入黑名单' }}
            </button>
        </div>

        <div class="space-y-3">
            <button class="btn btn-soft btn-error btn-sm w-full justify-start" @click="handleDeleteChat">
                <Icon name="mingcute:alert-fill" /> 删除聊天记录
            </button>
            <button class="btn btn-soft btn-error btn-sm w-full justify-start" @click="handleBlockAndDelete">
                <Icon name="mingcute:close-line" /> 加入黑名单并删除聊天
            </button>
        </div>

        <div class="divider"></div>

        <div class="space-y-3">
            <div class="form-control">
                <label class="label cursor-pointer justify-start gap-4" @click="handleToggleMute">
                    <input type="checkbox" class="toggle toggle-primary" :checked="isMuted" />
                    <span class="label-text">消息免打扰</span>
                </label>
            </div>

            <div class="form-control">
                <label class="label cursor-pointer justify-start gap-4" @click="handleTogglePin">
                    <input type="checkbox" class="toggle toggle-primary" :checked="isPinned" />
                    <span class="label-text">置顶聊天</span>
                </label>
            </div>
        </div>
    </div>
</template>
