<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import type { User } from '@junction/backend/src/resource/user/user.service';
import * as conversationApi from '~/api/conversation';

interface Props {
    conversationId: string;
    show: boolean;
}

interface Emits {
    (e: 'update:show', value: boolean): void;
    (e: 'updated'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isOpen = computed({
    get: () => props.show,
    set: (value) => emit('update:show', value)
});

const loading = ref(false);
const members = ref<any[]>([]);
const groupName = ref('');
const groupAvatar = ref('');
const editingName = ref(false);
const newGroupName = ref('');
const showInviteDialog = ref(false);
const avatarInput = ref<HTMLInputElement>();
const uploadingAvatar = ref(false);

// 获取群聊信息
const loadGroupInfo = async () => {
    loading.value = true;
    try {
        const [membersRes, conversationRes] = await Promise.all([
            conversationApi.getMembers(props.conversationId),
            conversationApi.findOne(props.conversationId)
        ]);
        
        if (membersRes.success && membersRes.data) {
            members.value = membersRes.data;
        }
        
        if (conversationRes.success && conversationRes.data) {
            groupName.value = conversationRes.data.title || '';
            groupAvatar.value = conversationRes.data.avatar || '';
            newGroupName.value = groupName.value;
        }
    } finally {
        loading.value = false;
    }
};

// 获取当前用户角色
const myRole = computed(() => {
    const currentUserId = useUserStore().user.value?.id;
    const myMember = members.value.find(m => m.user.id === currentUserId);
    return myMember?.role || 'MEMBER';
});

// 是否有管理权限
const hasPermission = computed(() => {
    return myRole.value === 'OWNER' || myRole.value === 'ADMIN';
});

// 按角色分组成员
const groupedMembers = computed(() => {
    const groups = {
        owner: members.value.filter(m => m.role === 'OWNER'),
        admins: members.value.filter(m => m.role === 'ADMIN'),
        members: members.value.filter(m => m.role === 'MEMBER')
    };
    return groups;
});

// 统计信息
const stats = computed(() => ({
    total: members.value.length,
    online: members.value.filter(m => m.user.isOnline).length,
    owner: groupedMembers.value.owner.length,
    admins: groupedMembers.value.admins.length,
    regular: groupedMembers.value.members.length
}));

// 更新群聊名称
const updateGroupName = async () => {
    if (!newGroupName.value.trim() || newGroupName.value === groupName.value) {
        editingName.value = false;
        newGroupName.value = groupName.value;
        return;
    }
    
    if (newGroupName.value.trim().length < 2) {
        useToast().error('群聊名称至少需要2个字符');
        return;
    }
    
    if (newGroupName.value.trim().length > 50) {
        useToast().error('群聊名称不能超过50个字符');
        return;
    }
    
    try {
        const res = await conversationApi.updateGroupInfo(props.conversationId, {
            title: newGroupName.value.trim()
        });
        
        if (res.success) {
            groupName.value = newGroupName.value.trim();
            editingName.value = false;
            emit('updated');
            useToast().success('群聊名称已更新');
        }
    } catch (error) {
        // 错误处理已在 API 层完成
    }
};

// 头像上传
const handleAvatarUpload = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        useToast().error('请选择图片文件');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        useToast().error('图片大小不能超过5MB');
        return;
    }

    uploadingAvatar.value = true;
    try {
        const formData = new FormData();
        formData.append('files', file);
        formData.append('type', 'avatar');
        
        const response = await $fetch('/api/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (response.success && response.data?.files?.[0]) {
            const newAvatar = `${useRuntimeConfig().public.apiUrl}${response.data.files[0]}`;
            const res = await conversationApi.updateGroupInfo(props.conversationId, {
                avatar: newAvatar
            });
            
            if (res.success) {
                groupAvatar.value = newAvatar;
                emit('updated');
                useToast().success('群聊头像已更新');
            }
        }
    } catch (error) {
        useToast().error('头像上传失败');
    } finally {
        uploadingAvatar.value = false;
    }
};

// 触发头像选择
const triggerAvatarUpload = () => {
    avatarInput.value?.click();
};

// 移除头像
const removeAvatar = async () => {
    try {
        const res = await conversationApi.updateGroupInfo(props.conversationId, {
            avatar: ''
        });
        
        if (res.success) {
            groupAvatar.value = '';
            emit('updated');
            useToast().success('群聊头像已移除');
        }
    } catch (error) {
        // 错误处理已在 API 层完成
    }
};

// 移除成员
const removeMember = async (memberId: string, memberName: string) => {
    const isSelf = memberId === useUserStore().user.value?.id;
    const confirmText = isSelf ? '确定要退出群聊吗？' : `确定要将 ${memberName} 移出群聊吗？`;
    
    if (!confirm(confirmText)) return;
    
    try {
        const res = await conversationApi.removeMember(props.conversationId, memberId);
        if (res.success) {
            await loadGroupInfo();
            emit('updated');
            
            if (isSelf) {
                isOpen.value = false;
                useRouter().push('/chat');
            } else {
                useToast().success(res.message);
            }
        }
    } catch (error) {
        // 错误处理已在 API 层完成
    }
};

// 修改成员角色
const changeMemberRole = async (memberId: string, newRole: 'ADMIN' | 'MEMBER') => {
    try {
        const res = await conversationApi.updateMemberRole(props.conversationId, memberId, newRole);
        if (res.success) {
            await loadGroupInfo();
            useToast().success('角色已更新');
        }
    } catch (error) {
        // 错误处理已在 API 层完成
    }
};

// 获取角色显示名称
const getRoleName = (role: string) => {
    const roleMap = {
        'OWNER': '群主',
        'ADMIN': '管理员',
        'MEMBER': '成员'
    };
    return roleMap[role as keyof typeof roleMap] || role;
};

// 获取角色徽章样式
const getRoleBadgeClass = (role: string) => {
    const classMap = {
        'OWNER': 'badge-warning',
        'ADMIN': 'badge-info',
        'MEMBER': 'badge-ghost'
    };
    return classMap[role as keyof typeof classMap] || 'badge-ghost';
};

// 获取用户名显示
const getDisplayName = (user: User) => {
    return user.name || user.email.split('@')[0] || '未知用户';
};

// 获取用户名首字符
const getInitial = (user: User) => {
    const name = getDisplayName(user);
    return name.charAt(0).toUpperCase();
};

// 邀请成员成功处理
const handleInviteSuccess = () => {
    loadGroupInfo();
    emit('updated');
    showInviteDialog.value = false;
};

onMounted(() => {
    if (props.show) {
        loadGroupInfo();
    }
});

// 监听对话框显示状态
watch(() => props.show, (newShow) => {
    if (newShow) {
        loadGroupInfo();
        if (avatarInput.value) {
            avatarInput.value.value = '';
        }
    }
});

// 检查是否移动端
const isMobile = computed(() => useDevice().isMobile);
</script>

<template>
    <Teleport to="body">
        <Transition name="modal" appear>
            <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <!-- 背景遮罩 -->
                <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="isOpen = false"></div>
                
                <!-- 对话框主体 -->
                <div class="relative bg-base-100 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-base-200/50">
                    
                    <!-- 装饰性光效 -->
                    <div class="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 blur-[60px] pointer-events-none"></div>
                    <div class="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/10 blur-[60px] pointer-events-none"></div>
                    
                    <!-- 头部 -->
                    <header class="relative p-8 pb-6 border-b border-base-200/50">
                        <div class="flex items-center justify-between">
                            <div>
                                <h1 class="text-2xl font-bold bg-gradient-to-r from-base-content to-base-content/70 bg-clip-text text-transparent">
                                    群聊信息
                                </h1>
                                <p class="text-sm text-base-content/60 mt-1">管理群聊设置和成员</p>
                            </div>
                            <button class="btn btn-ghost btn-circle btn-sm hover:bg-base-200" @click="isOpen = false">
                                <Icon name="mingcute:close-line" size="20" />
                            </button>
                        </div>
                    </header>
                    
                    <!-- 内容区域 -->
                    <main class="flex-1 overflow-y-auto p-8 pb-6">
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <!-- 左侧：群聊信息 -->
                            <div class="lg:col-span-1 space-y-6">
                                <!-- 群聊头像 -->
                                <div class="flex flex-col items-center space-y-4">
                                    <div class="relative group">
                                        <div class="avatar">
                                            <div class="w-28 h-28 rounded-3xl border-4 border-base-200 shadow-xl transition-all group-hover:shadow-2xl">
                                                <img v-if="groupAvatar" :src="groupAvatar" alt="群聊头像" class="object-cover" />
                                                <div v-else class="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                                                    <Icon name="mingcute:group-2-line" size="48" class="text-primary/30" />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- 头像操作按钮 -->
                                        <div v-if="hasPermission" class="absolute -bottom-3 -right-3 flex gap-1">
                                            <button 
                                                v-if="!groupAvatar"
                                                class="btn btn-primary btn-circle btn-sm shadow-lg"
                                                :class="{ 'loading': uploadingAvatar }"
                                                @click="triggerAvatarUpload"
                                                :disabled="uploadingAvatar"
                                            >
                                                <Icon v-if="!uploadingAvatar" name="mingcute:camera-line" size="16" />
                                            </button>
                                            <button 
                                                v-else
                                                class="btn btn-error btn-circle btn-sm shadow-lg"
                                                @click="removeAvatar"
                                            >
                                                <Icon name="mingcute:delete-line" size="16" />
                                            </button>
                                        </div>
                                        
                                        <!-- 悬浮效果 -->
                                        <div v-if="hasPermission && !groupAvatar" class="absolute inset-0 rounded-3xl bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" @click="triggerAvatarUpload"></div>
                                    </div>
                                    
                                    <input 
                                        ref="avatarInput"
                                        type="file" 
                                        accept="image/*"
                                        class="hidden"
                                        @change="handleAvatarUpload"
                                    />
                                </div>
                                
                                <!-- 群聊名称 -->
                                <div class="space-y-3">
                                    <label class="text-sm font-medium text-base-content/70">群聊名称</label>
                                    <div v-if="editingName" class="flex gap-2">
                                        <input 
                                            v-model="newGroupName" 
                                            type="text" 
                                            class="input input-bordered input-sm flex-1"
                                            placeholder="群聊名称"
                                            maxlength="50"
                                            @keyup.enter="updateGroupName"
                                            @keyup.escape="editingName = false; newGroupName = groupName"
                                        />
                                        <button class="btn btn-primary btn-sm" @click="updateGroupName">
                                            <Icon name="mingcute:check-line" size="16" />
                                        </button>
                                        <button class="btn btn-ghost btn-sm" @click="editingName = false; newGroupName = groupName">
                                            <Icon name="mingcute:close-line" size="16" />
                                        </button>
                                    </div>
                                    <div v-else class="flex items-center gap-2">
                                        <h2 class="text-lg font-bold truncate flex-1">{{ groupName }}</h2>
                                        <button v-if="hasPermission" 
                                                class="btn btn-ghost btn-circle btn-xs" 
                                                @click="editingName = true">
                                            <Icon name="mingcute:edit-2-line" size="14" />
                                        </button>
                                    </div>
                                </div>
                                
                                <!-- 统计信息 -->
                                <div class="space-y-3">
                                    <label class="text-sm font-medium text-base-content/70">群聊统计</label>
                                    <div class="grid grid-cols-2 gap-3">
                                        <div class="bg-base-200/30 rounded-xl p-3 text-center">
                                            <div class="text-2xl font-bold text-primary">{{ stats.total }}</div>
                                            <div class="text-xs text-base-content/60">总成员</div>
                                        </div>
                                        <div class="bg-base-200/30 rounded-xl p-3 text-center">
                                            <div class="text-2xl font-bold text-success">{{ stats.online }}</div>
                                            <div class="text-xs text-base-content/60">在线</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 右侧：成员列表 -->
                            <div class="lg:col-span-2 space-y-6">
                                <!-- 成员管理工具栏 -->
                                <div class="flex items-center justify-between">
                                    <div>
                                        <h3 class="text-lg font-bold">成员列表</h3>
                                        <p class="text-sm text-base-content/60">{{ stats.total }} 位成员</p>
                                    </div>
                                    <button 
                                        v-if="hasPermission"
                                        class="btn btn-primary btn-sm"
                                        @click="showInviteDialog = true"
                                    >
                                        <Icon name="mingcute:user-add-line" size="16" />
                                        邀请成员
                                    </button>
                                </div>
                                
                                <!-- 成员列表 -->
                                <div class="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                                    <div v-if="loading" class="space-y-3">
                                        <div v-for="i in 6" :key="i" class="flex items-center gap-4 p-4 rounded-xl bg-base-200/30 animate-pulse">
                                            <div class="w-12 h-12 bg-base-300 rounded-full"></div>
                                            <div class="flex-1 space-y-2">
                                                <div class="h-4 bg-base-300 rounded w-1/3"></div>
                                                <div class="h-3 bg-base-200 rounded w-1/2"></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div v-else class="space-y-6">
                                        <!-- 群主 -->
                                        <div v-if="groupedMembers.owner.length" class="space-y-3">
                                            <h4 class="text-sm font-medium text-base-content/60 uppercase tracking-wider flex items-center gap-2">
                                                <Icon name="mingcute:crown-fill" size="16" class="text-warning" />
                                                群主
                                            </h4>
                                            <div v-for="member in groupedMembers.owner" :key="member.id" 
                                                 class="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-warning/5 to-transparent border border-warning/10">
                                                <div class="avatar">
                                                    <div class="w-12 h-12 rounded-full relative">
                                                        <img v-if="member.user.image" :src="member.user.image" :alt="member.user.name" class="object-cover" />
                                                        <div v-else class="w-full h-full bg-gradient-to-br from-warning/10 to-warning/5 flex items-center justify-center">
                                                            <span class="text-warning font-medium text-sm">{{ getInitial(member.user) }}</span>
                                                        </div>
                                                        <div class="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-2 border-base-100"></div>
                                                    </div>
                                                </div>
                                                <div class="flex-1 min-w-0">
                                                    <div class="font-medium text-base-content truncate">{{ getDisplayName(member.user) }}</div>
                                                    <div class="text-sm text-base-content/60 truncate flex items-center gap-2">
                                                        <span class="badge badge-warning badge-sm">{{ getRoleName(member.role) }}</span>
                                                        <span v-if="member.user.isOnline" class="text-success flex items-center gap-1">
                                                            <span class="w-2 h-2 bg-success rounded-full"></span>
                                                            在线
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- 管理员 -->
                                        <div v-if="groupedMembers.admins.length" class="space-y-3">
                                            <h4 class="text-sm font-medium text-base-content/60 uppercase tracking-wider flex items-center gap-2">
                                                <Icon name="mingcute:shield-user-fill" size="16" class="text-info" />
                                                管理员 ({{ groupedMembers.admins.length }})
                                            </h4>
                                            <div v-for="member in groupedMembers.admins" :key="member.id" 
                                                 class="flex items-center gap-4 p-4 rounded-xl hover:bg-base-200/50 transition-all group">
                                                <div class="avatar">
                                                    <div class="w-12 h-12 rounded-full relative">
                                                        <img v-if="member.user.image" :src="member.user.image" :alt="member.user.name" class="object-cover" />
                                                        <div v-else class="w-full h-full bg-gradient-to-br from-info/10 to-info/5 flex items-center justify-center">
                                                            <span class="text-info font-medium text-sm">{{ getInitial(member.user) }}</span>
                                                        </div>
                                                        <div class="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-base-100" :class="member.user.isOnline ? 'bg-success' : 'bg-base-300'"></div>
                                                    </div>
                                                </div>
                                                <div class="flex-1 min-w-0">
                                                    <div class="font-medium text-base-content truncate">{{ getDisplayName(member.user) }}</div>
                                                    <div class="text-sm text-base-content/60 truncate flex items-center gap-2">
                                                        <span class="badge badge-info badge-sm">{{ getRoleName(member.role) }}</span>
                                                        <span v-if="member.user.isOnline" class="text-success flex items-center gap-1">
                                                            <span class="w-2 h-2 bg-success rounded-full"></span>
                                                            在线
                                                        </span>
                                                    </div>
                                                </div>
                                                <!-- 群主操作 -->
                                                <div v-if="myRole === 'OWNER'" class="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div class="dropdown dropdown-end">
                                                        <div tabindex="0" role="button" class="btn btn-ghost btn-circle btn-sm">
                                                            <Icon name="mingcute:more-2-line" size="16" />
                                                        </div>
                                                        <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow border border-base-200">
                                                            <li>
                                                                <a @click="changeMemberRole(member.user.id, 'MEMBER')">
                                                                    <Icon name="mingcute:user-star-line" size="16" />
                                                                    设为成员
                                                                </a>
                                                            </li>
                                                            <li>
                                                                <a class="text-error" @click="removeMember(member.user.id, getDisplayName(member.user))">
                                                                    <Icon name="mingcute:user-delete-line" size="16" />
                                                                    移出群聊
                                                                </a>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- 普通成员 -->
                                        <div v-if="groupedMembers.members.length" class="space-y-3">
                                            <h4 class="text-sm font-medium text-base-content/60 uppercase tracking-wider flex items-center gap-2">
                                                <Icon name="mingcute:user-fill" size="16" />
                                                成员 ({{ groupedMembers.members.length }})
                                            </h4>
                                            <div v-for="member in groupedMembers.members" :key="member.id" 
                                                 class="flex items-center gap-4 p-4 rounded-xl hover:bg-base-200/50 transition-all group">
                                                <div class="avatar">
                                                    <div class="w-12 h-12 rounded-full relative">
                                                        <img v-if="member.user.image" :src="member.user.image" :alt="member.user.name" class="object-cover" />
                                                        <div v-else class="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                                                            <span class="text-primary font-medium text-sm">{{ getInitial(member.user) }}</span>
                                                        </div>
                                                        <div class="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-base-100" :class="member.user.isOnline ? 'bg-success' : 'bg-base-300'"></div>
                                                    </div>
                                                </div>
                                                <div class="flex-1 min-w-0">
                                                    <div class="font-medium text-base-content truncate">{{ getDisplayName(member.user) }}</div>
                                                    <div class="text-sm text-base-content/60 truncate flex items-center gap-2">
                                                        <span class="badge badge-ghost badge-sm">{{ getRoleName(member.role) }}</span>
                                                        <span v-if="member.user.isOnline" class="text-success flex items-center gap-1">
                                                            <span class="w-2 h-2 bg-success rounded-full"></span>
                                                            在线
                                                        </span>
                                                    </div>
                                                </div>
                                                <!-- 管理员操作 -->
                                                <div v-if="hasPermission" class="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div class="dropdown dropdown-end">
                                                        <div tabindex="0" role="button" class="btn btn-ghost btn-circle btn-sm">
                                                            <Icon name="mingcute:more-2-line" size="16" />
                                                        </div>
                                                        <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow border border-base-200">
                                                            <li v-if="myRole === 'OWNER'">
                                                                <a @click="changeMemberRole(member.user.id, 'ADMIN')">
                                                                    <Icon name="mingcute:shield-user-line" size="16" />
                                                                    设为管理员
                                                                </a>
                                                            </li>
                                                            <li>
                                                                <a class="text-error" @click="removeMember(member.user.id, getDisplayName(member.user))">
                                                                    <Icon name="mingcute:user-delete-line" size="16" />
                                                                    移出群聊
                                                                </a>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                                <!-- 自己退出群聊 -->
                                                <div v-else-if="member.user.id === useUserStore().user.value?.id" class="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button class="btn btn-ghost btn-sm text-error" 
                                                            @click="removeMember(member.user.id, getDisplayName(member.user))">
                                                        退出群聊
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </Transition>
        
        <!-- 邀请成员对话框 -->
        <AppDialogInviteMembers 
            v-model="showInviteDialog"
            :conversation-id="props.conversationId"
            @success="handleInviteSuccess"
        />
    </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
}

.modal-enter-active .relative.bg-base-100,
.modal-leave-active .relative.bg-base-100 {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from .relative.bg-base-100,
.modal-leave-to .relative.bg-base-100 {
    transform: scale(0.9);
}

.custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--bc) / 0.1) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: hsl(var(--bc) / 0.1);
    border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: hsl(var(--bc) / 0.2);
}
</style>