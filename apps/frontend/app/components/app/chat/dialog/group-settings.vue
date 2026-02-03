<script setup lang="ts">
import * as conversationApi from '~/api/conversation';
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

const activeTab = ref<'members' | 'info' | 'settings'>('members');
const members = ref<any[]>([]);
const loading = ref(false);
const authClient = useAuthClient();
const currentUserId = ref<string>('');

const fetchCurrentUser = async () => {
    const { data } = await authClient.getSession();
    currentUserId.value = data?.user?.id || '';
};

const isOwner = computed(() => props.conversation?.ownerId === currentUserId.value);
const isAdmin = computed(() => props.conversation?.members?.some((m: any) => m.userId === currentUserId.value && m.role === 'ADMIN'));
const currentMember = computed(() => props.conversation?.mySettings);
const isMuted = computed(() => currentMember.value?.muted ?? false);
const isPinned = computed(() => currentMember.value?.pinned ?? false);

const fetchMembers = async () => {
    if (!props.conversation?.id) return;
    loading.value = true;
    try {
        const res = await conversationApi.getMembers(props.conversation.id);
        if (res.data) members.value = res.data;
    } finally {
        loading.value = false;
    }
};

const handleLeaveGroup = async () => {
    if (!currentUserId.value) {
        toast.error('用户未登录');
        return;
    }
    
    if (isOwner.value) {
        toast.warning('群主不能直接退出，请先转让群主或解散群聊');
        return;
    }
    
    const confirmed = await dialog.confirm({
        title: '退出群聊',
        content: '确定要退出该群聊吗？',
        type: 'warning',
        confirmText: '退出',
    });
    if (!confirmed) return;
    if (!props.conversation?.id) return;
    
    const res = await conversationApi.removeMember(props.conversation.id, currentUserId.value);
    if (res.success) {
        toast.success('已退出群聊');
        emit('conversation-deleted');
        router.push('/chat');
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

const handleDisbandGroup = async () => {
    const confirmed = await dialog.confirm({
        title: '解散群聊',
        content: '确定要解散该群聊吗？此操作不可恢复！',
        type: 'error',
        confirmText: '解散',
    });
    if (!confirmed) return;
    if (!props.conversation?.id) return;
    const res = await conversationApi.remove(props.conversation.id);
    if (res.success) {
        toast.success('群聊已解散');
        emit('conversation-deleted');
        router.push('/chat');
    }
};

const handleRemoveMember = async (member: any) => {
    const confirmed = await dialog.confirm({
        title: '移除成员',
        content: `确定要将 ${member.user?.name || '该成员'} 移出群聊吗？`,
        type: 'warning',
        confirmText: '移除',
    });
    if (!confirmed) return;
    if (!props.conversation?.id) return;
    const res = await conversationApi.removeMember(props.conversation.id, member.userId);
    if (res.success) {
        toast.success('已移除成员');
        fetchMembers();
    }
};

const handleUpdateMemberRole = async (member: any, role: 'ADMIN' | 'MEMBER') => {
    if (!props.conversation?.id) return;
    const res = await conversationApi.updateMemberRole(props.conversation.id, member.userId, role);
    if (res.success) {
        toast.success(`已设置为${role === 'ADMIN' ? '管理员' : '普通成员'}`);
        fetchMembers();
    }
};

const showTransferDialog = ref(false);
const selectedTransferMember = ref<any>(null);
const transferInput = ref('');

const handleTransferOwner = async () => {
    if (!selectedTransferMember.value || !props.conversation?.id) return;
    
    const confirmed = await dialog.confirm({
        title: '转让群主',
        content: `确定要将群主转让给 ${selectedTransferMember.value.user?.name || '该成员'} 吗？转让后你将失去群主身份。`,
        type: 'warning',
        confirmText: '确定转让',
    });
    if (!confirmed) return;
    
    const res = await conversationApi.updateMemberRole(props.conversation.id, selectedTransferMember.value.userId, 'OWNER');
    if (res.success) {
        toast.success('群主已转让');
        showTransferDialog.value = false;
        selectedTransferMember.value = null;
        transferInput.value = '';
        emit('conversation-deleted');
    }
};

const openTransferDialog = (member: any) => {
    selectedTransferMember.value = member;
    transferInput.value = member.user?.name || '';
    showTransferDialog.value = true;
};

onMounted(async () => {
    await fetchCurrentUser();
    fetchMembers();
});
</script>

<template>
    <div class="flex flex-col h-full">
        <div class="tabs tabs-boxed bg-base-200/50 p-1 rounded-xl mb-6">
            <button class="tab flex-1" :class="{ 'tab-active': activeTab === 'members' }" @click="activeTab = 'members'">
                <Icon name="mingcute:group-fill" class="mr-2" />
                成员 ({{ members.length }})
            </button>
            <button class="tab flex-1" :class="{ 'tab-active': activeTab === 'info' }" @click="activeTab = 'info'">
                <Icon name="mingcute:information-line" class="mr-2" />
                群信息
            </button>
            <button class="tab flex-1" :class="{ 'tab-active': activeTab === 'settings' }" @click="activeTab = 'settings'">
                <Icon name="mingcute:settings-line" class="mr-2" />
                聊天设置
            </button>
        </div>

                    <div v-if="activeTab === 'members'" class="space-y-4">
            <div v-if="loading" class="flex justify-center py-8">
                <span class="loading loading-spinner loading-md"></span>
            </div>
            <div v-else class="space-y-2">
                <div v-for="member in members" :key="member.id"
                    class="flex items-center justify-between p-3 rounded-xl hover:bg-base-200/50 transition-colors">
                    <div class="flex items-center gap-3">
                        <BaseAvatar :text="member.user?.name" :src="member.user?.avatar" :size="44" :radius="12" />
                        <div>
                            <div class="font-medium flex items-center gap-2">
                                {{ member.user?.name }}
                                <span v-if="member.userId === currentUserId" class="badge badge-sm badge-primary">我</span>
                                <span v-if="member.role === 'OWNER'" class="badge badge-sm badge-warning">群主</span>
                                <span v-if="member.role === 'ADMIN'" class="badge badge-sm badge-info">管理员</span>
                            </div>
                            <div class="text-xs opacity-50">{{ member.user?.id }}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span v-if="member.role === 'OWNER' && member.userId === currentUserId" class="text-xs text-warning">
                            你是群主
                        </span>
                        <div v-if="member.userId !== currentUserId && (isOwner || isAdmin)" class="dropdown dropdown-end">
                            <button tabindex="0" class="btn btn-ghost btn-sm btn-circle">
                                <Icon name="mingcute:more-1-line" size="18" />
                            </button>
                            <ul tabindex="0"
                                class="dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-xl w-40 border border-base-200">
                                <li v-if="member.role !== 'ADMIN' && isOwner">
                                    <button @click="handleUpdateMemberRole(member, 'ADMIN')">设为管理员</button>
                                </li>
                                <li v-if="member.role === 'ADMIN' && isOwner">
                                    <button @click="handleUpdateMemberRole(member, 'MEMBER')">取消管理员</button>
                                </li>
                                <li>
                                    <button class="text-error" @click="handleRemoveMember(member)">移出群聊</button>
                                </li>
                                <li v-if="isOwner">
                                    <button @click="openTransferDialog(member)">转让群主</button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="activeTab === 'info'" class="space-y-6">
            <div class="flex flex-col items-center gap-4 pb-6 border-b border-base-200">
                <BaseAvatar :text="conversation?.title" :src="conversation?.avatar" :size="80" :radius="20" />
                <div class="text-center">
                    <h3 class="text-xl font-bold">{{ conversation?.title }}</h3>
                    <p class="text-sm opacity-50">群号: {{ conversation?.id }}</p>
                </div>
                <div class="flex gap-3">
                    <button class="btn btn-soft btn-sm">
                        <Icon name="mingcute:add-line" /> 邀请好友
                    </button>
                    <button class="btn btn-soft btn-sm">
                        <Icon name="mingcute:qr-code-line" /> 群二维码
                    </button>
                </div>
            </div>

            <div class="space-y-3">
                <div class="flex justify-between py-2 border-b border-base-200">
                    <span class="opacity-60">群成员</span>
                    <span class="font-medium">{{ members.length }} 人</span>
                </div>
                <div class="flex justify-between py-2 border-b border-base-200">
                    <span class="opacity-60">群聊类型</span>
                    <span class="font-medium">{{ conversation?.type === 'GROUP' ? '群聊' : '私聊' }}</span>
                </div>
                <div class="flex justify-between py-2">
                    <span class="opacity-60">创建时间</span>
                    <span class="font-medium">{{ conversation?.createdAt ? new Date(conversation.createdAt).toLocaleDateString() : '-' }}</span>
                </div>
            </div>
        </div>

        <div v-if="activeTab === 'settings'" class="space-y-6">
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

            <div class="divider"></div>

            <div class="space-y-2">
                <template v-if="isOwner">
                    <button class="btn btn-soft btn-sm w-full justify-start" @click="activeTab = 'members'">
                        <Icon name="mingcute:user-transfer-line" /> 转让群主
                    </button>
                    <button class="btn btn-soft btn-error btn-sm w-full justify-start" @click="handleDisbandGroup">
                        <Icon name="mingcute:alert-fill" /> 解散群聊
                    </button>
                </template>
                <template v-else>
                    <button class="btn btn-soft btn-error btn-sm w-full justify-start" @click="handleLeaveGroup">
                        <Icon name="mingcute:close-line" /> 退出群聊
                    </button>
                </template>
            </div>
        </div>
    </div>

    <Teleport to="body">
        <BaseModal v-model="showTransferDialog" boxClass="max-w-sm">
            <template #header>
                <div class="flex items-center gap-3">
                    <Icon name="mingcute:user-transfer-line" class="text-lg" />
                    <span>转让群主</span>
                </div>
            </template>
            <div class="space-y-4">
                <p class="text-sm opacity-70">
                    确定要将群主转让给 <span class="font-medium">{{ selectedTransferMember?.user?.name }}</span> 吗？
                </p>
                <p class="text-xs text-warning">转让后你将失去群主身份，但仍保留群聊。</p>
            </div>
            <template #actions="{ close }">
                <button class="btn btn-ghost btn-sm" @click="close">取消</button>
                <button class="btn btn-primary btn-sm" @click="handleTransferOwner">确定转让</button>
            </template>
        </BaseModal>
    </Teleport>
</template>
