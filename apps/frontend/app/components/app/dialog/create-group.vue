<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import type { PrismaTypes, ApiResponse } from '@junction/types';
import type { ExtractDataType } from '~/utils/types';
import * as conversationApi from '~/api/conversation';
import * as userApi from '~/api/user';
import * as uploadApi from '~/api/upload';

interface Props {
    modelValue: boolean;
}

interface Emits {
    (e: 'update:modelValue', value: boolean): void;
    (e: 'success', conversationId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
});

const step = ref(1);
const groupName = ref('');
const groupAvatar = ref('');
const selectedMembers = ref<string[]>([]);
const searchQuery = ref('');
const loading = ref(false);
const creating = ref(false);
const friends = ref<AwaitedReturnType<typeof userApi.search>['data']>(null);
const friendsLoading = ref(true);

// 搜索防抖
const searchDebounce = ref<NodeJS.Timeout>();

// 头像上传
const avatarInput = ref<HTMLInputElement>();
const uploadingAvatar = ref(false);

// 获取好友列表
const loadFriends = async () => {
    friendsLoading.value = true;
    try {
        const res = await userApi.search({ query: searchQuery.value || '', limit: 100 });
        if (res.success && res.data) {
            // 过滤掉自己
            const filteredUsers = res.data.items.filter(user => 
                user.id !== useUserStore().user.value?.id
            );
            friends.value = {
                ...res.data,
                items: filteredUsers
            };
        }
    } finally {
        friendsLoading.value = false;
    }
};

// 搜索好友
const filteredFriends = computed(() => {
    if (!friends.value?.items) return [];
    if (!searchQuery.value) return friends.value.items;
    const query = searchQuery.value.toLowerCase().trim();
    return friends.value.items.filter(friend =>
        friend.name?.toLowerCase().includes(query) ||
        friend.email?.toLowerCase().includes(query)
    );
});

// 选择状态
const selectedFriends = computed(() => {
    if (!friends.value?.items) return [];
    return friends.value.items.filter(friend => selectedMembers.value.includes(friend.id));
});

// 切换成员选择
const toggleMember = (userId: string) => {
    const index = selectedMembers.value.indexOf(userId);
    if (index > -1) {
        selectedMembers.value.splice(index, 1);
    } else {
        selectedMembers.value.push(userId);
    }
};

// 搜索处理
const handleSearch = (event: Event) => {
    const query = (event.target as HTMLInputElement).value;
    searchQuery.value = query;
    clearTimeout(searchDebounce.value);
    searchDebounce.value = setTimeout(() => {
        // 重新执行搜索
        loadFriends();
    }, 300);
};

// 头像上传处理
const handleAvatarUpload = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // 验证文件类型和大小
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
        const response = await uploadApi.uploadFiles('avatar', [file]);

        if (response.success && response.data?.files?.[0]) {
            groupAvatar.value = `${useRuntimeConfig().public.apiUrl}${response.data.files[0]}`;
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
const removeAvatar = () => {
    groupAvatar.value = '';
};

// 导航控制
const nextStep = async () => {
    if (step.value === 1) {
        if (!groupName.value.trim()) {
            useToast().error('请输入群聊名称');
            return;
        }
        if (groupName.value.trim().length < 2) {
            useToast().error('群聊名称至少需要2个字符');
            return;
        }
        if (groupName.value.trim().length > 50) {
            useToast().error('群聊名称不能超过50个字符');
            return;
        }
        
        step.value = 2;
        // 重置搜索并重新加载好友列表
        searchQuery.value = '';
        await loadFriends();
    }
};

const prevStep = () => {
    step.value = Math.max(1, step.value - 1);
};

// 创建群聊
const createGroup = async () => {
    if (!groupName.value.trim()) return;

    creating.value = true;
    try {
        const res = await conversationApi.create({
            type: 'GROUP',
            title: groupName.value.trim(),
            avatar: groupAvatar.value || undefined,
            memberIds: selectedMembers.value
        });

        if (res.success && res.data) {
            emit('success', res.data.id);
            isOpen.value = false;
            resetForm();
            useToast().success('群聊创建成功');
        }
    } catch (error) {
        // 错误处理已在 API 层完成
    } finally {
        creating.value = false;
    }
};

// 重置表单
const resetForm = () => {
    step.value = 1;
    groupName.value = '';
    groupAvatar.value = '';
    selectedMembers.value = [];
    searchQuery.value = '';
};

// 监听对话框关闭
watch(isOpen, (newVal) => {
    if (!newVal) {
        resetForm();
    } else {
        // 重置头像输入
        if (avatarInput.value) {
            avatarInput.value.value = '';
        }
        // 如果在第一步，预加载好友列表
        if (step.value === 1) {
            loadFriends();
        }
    }
});

// 获取用户名显示
const getDisplayName = (user: { name?: string | null; email: string }) => {
    return user.name || user.email.split('@')[0] || '未知用户';
};

// 获取用户名首字符
const getInitial = (user: { name?: string | null; email: string }) => {
    const name = getDisplayName(user);
    return name.charAt(0).toUpperCase();
};

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
                <div
                    class="relative bg-base-100 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-base-200/50">

                    <!-- 装饰性光效 -->
                    <div class="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 blur-[60px] pointer-events-none">
                    </div>
                    <div class="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/10 blur-[60px] pointer-events-none">
                    </div>

                    <!-- 头部 -->
                    <header class="relative p-8 pb-6 border-b border-base-200/50">
                        <div class="flex items-center justify-between">
                            <div>
                                <h1
                                    class="text-2xl font-bold bg-gradient-to-r from-base-content to-base-content/70 bg-clip-text text-transparent">
                                    {{ step === 1 ? '创建群聊' : '邀请成员' }}
                                </h1>
                                <p class="text-sm text-base-content/60 mt-1">
                                    {{ step === 1 ? '设置群聊基本信息' : '选择要邀请的好友' }}
                                </p>
                            </div>
                            <button class="btn btn-ghost btn-circle btn-sm hover:bg-base-200" @click="isOpen = false">
                                <Icon name="mingcute:close-line" size="20" />
                            </button>
                        </div>

                        <!-- 步骤指示器 -->
                        <div class="flex items-center gap-2 mt-6">
                            <div v-for="i in 2" :key="i" class="flex-1 h-1.5 rounded-full transition-all duration-300"
                                :class="step >= i ? 'bg-gradient-to-r from-primary to-primary/80' : 'bg-base-200'">
                            </div>
                        </div>
                    </header>

                    <!-- 内容区域 -->
                    <main class="flex-1 overflow-y-auto p-8 pb-6">
                        <!-- 步骤1：基本信息 -->
                        <div v-if="step === 1" class="space-y-8">
                            <!-- 头像上传 -->
                            <div class="flex flex-col items-center space-y-4">
                                <div class="relative group">
                                    <div class="avatar">
                                        <div
                                            class="w-24 h-24 rounded-2xl border-4 border-base-200 shadow-lg transition-all group-hover:shadow-xl">
                                            <img v-if="groupAvatar" :src="groupAvatar" alt="群聊头像"
                                                class="object-cover" />
                                            <div v-else
                                                class="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                                                <Icon name="mingcute:group-2-line" size="32" class="text-primary/40" />
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 头像操作按钮 -->
                                    <div class="absolute -bottom-2 -right-2 flex gap-1">
                                        <button v-if="!groupAvatar" class="btn btn-primary btn-circle btn-sm shadow-lg"
                                            :class="{ 'loading': uploadingAvatar }" @click="triggerAvatarUpload"
                                            :disabled="uploadingAvatar">
                                            <Icon v-if="!uploadingAvatar" name="mingcute:camera-line" size="16" />
                                        </button>
                                        <button v-else class="btn btn-error btn-circle btn-sm shadow-lg"
                                            @click="removeAvatar">
                                            <Icon name="mingcute:delete-line" size="16" />
                                        </button>
                                    </div>

                                    <!-- 悬浮效果 -->
                                    <div v-if="!groupAvatar"
                                        class="absolute inset-0 rounded-2xl bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        @click="triggerAvatarUpload"></div>
                                </div>

                                <input ref="avatarInput" type="file" accept="image/*" class="hidden"
                                    @change="handleAvatarUpload" />
                            </div>

                            <!-- 群聊名称 -->
                            <div class="form-control">
                                <label class="label">
                                    <span class="label-text font-medium">群聊名称</span>
                                    <span class="label-text-alt">{{ groupName.length }}/50</span>
                                </label>
                                <input v-model="groupName" type="text" placeholder="输入群聊名称"
                                    class="input input-bordered w-full h-12 rounded-xl font-medium transition-all focus:ring-4 focus:ring-primary/10"
                                    maxlength="50" @keyup.enter="nextStep" />
                            </div>
                        </div>

                        <!-- 步骤2：邀请成员 -->
                        <div v-if="step === 2" class="space-y-6">
                            <!-- 搜索框 -->
                            <div class="form-control">
                                <div class="input input-bordered flex items-center gap-3 h-12 rounded-xl">
                                    <Icon name="mingcute:search-2-line" size="20" class="text-base-content/40" />
                                    <input v-model="searchQuery" type="text" placeholder="搜索好友姓名或邮箱..."
                                        class="flex-1 bg-transparent outline-none" @input="handleSearch" />
                                    <div v-if="searchQuery" class="badge badge-ghost badge-sm">
                                        {{ filteredFriends.length }}
                                    </div>
                                </div>
                            </div>

                            <!-- 已选择的成员预览 -->
                            <div v-if="selectedFriends.length" class="space-y-3">
                                <div class="flex items-center justify-between">
                                    <h3 class="text-sm font-medium text-base-content/70">已选择 {{ selectedFriends.length
                                    }} 位成员</h3>
                                    <button class="btn btn-ghost btn-xs" @click="selectedMembers = []">
                                        清空
                                    </button>
                                </div>

                                <div class="flex flex-wrap gap-2">
                                    <div v-for="friend in selectedFriends" :key="friend.id"
                                        class="badge badge-primary badge-lg gap-2 px-3 py-2">
                                        <div class="avatar w-5 h-5">
                                            <img v-if="friend.image" :src="friend.image" :alt="friend.name"
                                                class="object-cover" />
                                            <div v-else
                                                class="w-full h-full bg-primary/20 flex items-center justify-center text-xs">
                                                {{ getInitial(friend) }}
                                            </div>
                                        </div>
                                        <span class="text-xs font-medium truncate max-w-[80px]">{{
                                            getDisplayName(friend) }}</span>
                                        <Icon name="mingcute:close-line" size="12" class="cursor-pointer"
                                            @click="toggleMember(friend.id)" />
                                    </div>
                                </div>
                            </div>

                            <!-- 好友列表 -->
                            <div class="space-y-3">
                                <h3 class="text-sm font-medium text-base-content/70">好友列表</h3>

                                <div class="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                                    <!-- 加载状态 -->
                                    <div v-if="friendsLoading" class="space-y-3">
                                        <div v-for="i in 5" :key="i"
                                            class="flex items-center gap-4 p-3 rounded-xl bg-base-200/30 animate-pulse">
                                            <div class="w-12 h-12 bg-base-300 rounded-full"></div>
                                            <div class="flex-1 space-y-2">
                                                <div class="h-4 bg-base-300 rounded w-1/2"></div>
                                                <div class="h-3 bg-base-200 rounded w-3/4"></div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 空状态 -->
                                    <div v-else-if="filteredFriends.length === 0" class="text-center py-12">
                                        <Icon name="mingcute:user-search-line" size="48"
                                            class="text-base-content/20 mx-auto mb-4" />
                                        <p class="text-base-content/40 text-sm">{{ searchQuery ? '没有找到相关好友' : '暂无好友' }}
                                        </p>
                                    </div>

                                    <!-- 好友列表 -->
                                    <div v-else class="space-y-1">
                                        <div v-for="friend in filteredFriends" :key="friend.id"
                                            class="group flex items-center gap-4 p-3 rounded-xl hover:bg-base-200/50 cursor-pointer transition-all"
                                            :class="{ 'bg-primary/5': selectedMembers.includes(friend.id) }"
                                            @click="toggleMember(friend.id)">
                                            <!-- 头像 -->
                                            <div class="avatar">
                                                <div
                                                    class="w-12 h-12 rounded-full border-2 border-transparent group-hover:border-primary/20 transition-all">
                                                    <img v-if="friend.image" :src="friend.image" :alt="friend.name"
                                                        class="object-cover" />
                                                    <div v-else
                                                        class="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                                                        <span class="text-primary font-medium">{{ getInitial(friend)
                                                        }}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- 用户信息 -->
                                            <div class="flex-1 min-w-0">
                                                <div class="font-medium text-base-content truncate">{{
                                                    getDisplayName(friend) }}</div>
                                                <div class="text-sm text-base-content/60 truncate">{{ friend.email }}
                                                </div>
                                            </div>

                                            <!-- 选中状态 -->
                                            <div class="checkbox">
                                                <input type="checkbox" :checked="selectedMembers.includes(friend.id)"
                                                    class="checkbox checkbox-primary checkbox-sm" @click.stop />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>

                    <!-- 底部操作 -->
                    <footer class="p-8 pt-6 border-t border-base-200/50">
                        <div class="flex items-center gap-3">
                            <button v-if="step > 1" class="btn btn-ghost btn-md px-6 font-medium" @click="prevStep">
                                <Icon name="mingcute:left-line" size="18" />
                                上一步
                            </button>

                            <div class="flex-1"></div>

                            <button class="btn btn-ghost btn-md px-6 font-medium" @click="isOpen = false">
                                取消
                            </button>

                            <button v-if="step === 1"
                                class="btn btn-primary btn-md px-8 font-medium shadow-lg shadow-primary/25"
                                :disabled="!groupName.trim() || groupName.trim().length < 2" @click="nextStep">
                                下一步
                                <Icon name="mingcute:right-line" size="18" />
                            </button>

                            <button v-else class="btn btn-primary btn-md px-8 font-medium shadow-lg shadow-primary/25"
                                :disabled="creating" @click="createGroup">
                                <Icon v-if="creating" name="mingcute:loading-3-line" size="18" class="animate-spin" />
                                <span v-else>创建群聊</span>
                            </button>
                        </div>
                    </footer>
                </div>
            </div>
        </Transition>
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