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
        <Transition name="modal-bounce" appear>
            <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-md" @click="isOpen = false"></div>
                <div
                    class="relative bg-base-100/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-white/20">

                    <div
                        class="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none">
                    </div>
                    <div
                        class="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/10 blur-[80px] rounded-full pointer-events-none">
                    </div>

                    <header class="relative p-8 pb-6 border-b border-base-200/30">
                        <div class="flex items-start justify-between">
                            <div class="space-y-1">
                                <h1
                                    class="text-3xl font-black tracking-tight bg-gradient-to-br from-base-content to-base-content/60 bg-clip-text text-transparent">
                                    {{ step === 1 ? '创建群聊' : '邀请成员' }}
                                </h1>
                                <p class="text-sm font-medium text-base-content/40 uppercase tracking-wider">
                                    {{ step === 1 ? 'Step 01: 基本信息' : 'Step 02: 邀请好友' }}
                                </p>
                            </div>
                            <button
                                class="btn btn-ghost btn-circle btn-sm bg-base-200/50 hover:bg-error hover:text-error-content transition-all"
                                @click="isOpen = false">
                                <Icon name="mingcute:close-line" size="20" />
                            </button>
                        </div>

                        <div class="flex items-center gap-2 mt-8">
                            <div class="flex-1 h-1.5 rounded-full bg-base-200 overflow-hidden relative">
                                <div class="absolute inset-y-0 left-0 bg-primary transition-all duration-500 ease-out"
                                    :style="{ width: step === 1 ? '50%' : '100%' }"></div>
                            </div>
                            <span class="text-[10px] font-bold opacity-30">{{ step }}/2</span>
                        </div>
                    </header>

                    <!-- 内容区域 -->
                    <main class="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
                        <!-- 步骤1：基本信息 -->
                        <div v-if="step === 1" class="space-y-10 animate-fade-in-up">
                            <div class="flex flex-col items-center">
                                <div class="relative group cursor-pointer" @click="triggerAvatarUpload">
                                    <div class="avatar">
                                        <div
                                            class="w-32 h-32 mask mask-squircle bg-base-200 ring-4 ring-primary/5 ring-offset-4 ring-offset-base-100 transition-all group-hover:ring-primary/20 shadow-inner">
                                            <img v-if="groupAvatar" :src="groupAvatar" alt="群聊头像"
                                                class="object-cover" />
                                            <div v-else
                                                class="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col items-center justify-center text-primary/40">
                                                <Icon name="mingcute:group-2-line" size="40" />
                                                <span
                                                    class="text-[10px] mt-2 font-bold uppercase tracking-tighter">添加照片</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 浮动操作按钮 -->
                                    <div class="absolute -bottom-2 -right-2 flex gap-2">
                                        <div v-if="!groupAvatar"
                                            class="btn btn-primary btn-circle btn-sm shadow-xl hover:scale-110 active:scale-95 transition-transform">
                                            <Icon v-if="!uploadingAvatar" name="mingcute:camera-line" size="16" />
                                            <span v-else class="loading loading-spinner loading-xs"></span>
                                        </div>
                                        <button v-else
                                            class="btn btn-error btn-circle btn-sm shadow-xl hover:scale-110 active:scale-95 transition-transform"
                                            @click.stop="removeAvatar">
                                            <Icon name="mingcute:delete-line" size="16" />
                                        </button>
                                    </div>
                                </div>
                                <input ref="avatarInput" type="file" accept="image/*" class="hidden"
                                    @change="handleAvatarUpload" />
                            </div>

                            <div class="form-control w-full">
                                <label class="label mb-1">
                                    <span
                                        class="label-text font-bold text-xs uppercase tracking-widest opacity-50">群聊名称</span>
                                </label>
                                <input v-model="groupName" type="text" placeholder="群聊名称"
                                    class="input input-lg w-full bg-base-200/50 border-none focus:ring-4 focus:ring-primary/10 rounded-2xl text-lg font-semibold transition-all"
                                    maxlength="50" @keyup.enter="nextStep" />
                                <div class="flex justify-end mt-2">
                                    <span class="text-[10px] font-mono opacity-30">{{ groupName.length }}/50</span>
                                </div>
                            </div>
                        </div>

                        <!-- 步骤2：邀请成员 -->
                        <div v-if="step === 2" class="space-y-6 animate-fade-in-right">
                            <div class="form-control">
                                <div class="relative group">
                                    <Icon name="mingcute:search-2-line" size="20"
                                        class="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/30 group-focus-within:text-primary transition-colors" />
                                    <input v-model="searchQuery" type="text" placeholder="搜索好友姓名或邮箱..."
                                        class="input w-full pl-12 bg-base-200/50 border-none focus:ring-4 focus:ring-primary/10 rounded-2xl transition-all"
                                        @input="handleSearch" />
                                </div>
                            </div>

                            <div v-if="selectedFriends.length" class="space-y-3">
                                <div class="flex items-center justify-between px-1">
                                    <h3 class="text-xs font-bold uppercase tracking-widest opacity-50">已选择 ({{
                                        selectedFriends.length }})</h3>
                                    <button class="text-[10px] font-bold text-primary hover:underline"
                                        @click="selectedMembers = []">全部清空</button>
                                </div>

                                <div class="flex flex-wrap gap-2">
                                    <div v-for="friend in selectedFriends" :key="friend.id"
                                        class="badge badge-primary h-9 gap-2 px-3 pl-1.5 rounded-xl border-none shadow-md shadow-primary/10 animate-zoom-in">
                                        <div class="avatar">
                                            <div class="w-6 h-6 rounded-lg">
                                                <img v-if="friend.image" :src="friend.image" :alt="friend.name" />
                                                <div v-else
                                                    class="bg-primary-focus flex items-center justify-center text-[10px]">
                                                    {{ getInitial(friend) }}</div>
                                            </div>
                                        </div>
                                        <span class="text-xs font-bold truncate max-w-[100px]">{{ getDisplayName(friend)
                                        }}</span>
                                        <button @click="toggleMember(friend.id)"
                                            class="hover:bg-primary-focus rounded-full p-0.5 transition-colors">
                                            <Icon name="mingcute:close-line" size="14" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- 好友列表 -->
                            <div class="space-y-3">
                                <h3 class="text-xs font-bold uppercase tracking-widest opacity-50 px-1">推荐好友</h3>

                                <div class="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                                    <!-- 骨架屏 -->
                                    <div v-if="friendsLoading" class="space-y-2">
                                        <div v-for="i in 4" :key="i"
                                            class="flex items-center gap-4 p-4 rounded-2xl bg-base-200/30 animate-pulse">
                                            <div class="w-12 h-12 bg-base-300 rounded-xl"></div>
                                            <div class="flex-1 space-y-2">
                                                <div class="h-3 bg-base-300 rounded w-1/3"></div>
                                                <div class="h-2 bg-base-200 rounded w-1/2"></div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 空状态 -->
                                    <div v-else-if="filteredFriends.length === 0"
                                        class="flex flex-col items-center py-10 opacity-20">
                                        <Icon name="mingcute:user-search-line" size="48" />
                                        <p class="text-sm font-bold mt-2">未找到相关好友</p>
                                    </div>

                                    <!-- 列表项 -->
                                    <div v-else class="space-y-1.5">
                                        <div v-for="friend in filteredFriends" :key="friend.id"
                                            class="group flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all hover:bg-primary/10"
                                            :class="{ 'bg-primary/5': selectedMembers.includes(friend.id) }"
                                            @click="toggleMember(friend.id)">

                                            <div class="avatar">
                                                <div
                                                    class="w-12 h-12 rounded-xl transition-transform group-hover:scale-105">
                                                    <img v-if="friend.image" :src="friend.image" />
                                                    <div v-else
                                                        class="w-full h-full bg-base-300 flex items-center justify-center text-primary font-black">
                                                        {{ getInitial(friend) }}</div>
                                                </div>
                                            </div>

                                            <div class="flex-1 min-w-0">
                                                <div class="font-bold text-sm tracking-tight">{{ getDisplayName(friend)
                                                }}</div>
                                                <div class="text-xs opacity-40 truncate">{{ friend.email }}</div>
                                            </div>

                                            <!-- 自定义 Checkbox -->
                                            <div class="flex items-center justify-center w-6 h-6 rounded-lg border-2 transition-all"
                                                :class="selectedMembers.includes(friend.id) ? 'bg-primary border-primary' : 'border-base-content/10 group-hover:border-primary/50'">
                                                <Icon v-if="selectedMembers.includes(friend.id)"
                                                    name="mingcute:check-line" size="16" class="text-primary-content" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>

                    <!-- 底部操作：磨砂背景 -->
                    <footer class="p-8 pt-4 bg-base-100/50 backdrop-blur-md border-t border-base-200/30">
                        <div class="flex items-center gap-4">
                            <button v-if="step > 1" class="btn btn-ghost rounded-2xl font-bold" @click="prevStep">
                                <Icon name="mingcute:left-line" size="18" />
                                上一步
                            </button>

                            <div class="flex-1"></div>

                            <button class="btn btn-ghost rounded-2xl font-bold opacity-50"
                                @click="isOpen = false">取消</button>

                            <button v-if="step === 1"
                                class="btn btn-primary px-8 rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                :disabled="!groupName.trim() || groupName.trim().length < 2" @click="nextStep">
                                下一步
                                <Icon name="mingcute:right-line" size="18" />
                            </button>

                            <button v-else
                                class="btn btn-primary px-10 rounded-2xl font-black shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                                :disabled="creating" @click="createGroup">
                                <span v-if="creating" class="loading loading-spinner loading-xs"></span>
                                <span v-else class="flex items-center gap-2">
                                    <Icon name="mingcute:check-circle-line" size="20" />
                                    完成创建
                                </span>
                            </button>
                        </div>
                    </footer>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
/* 极致动画 */
.modal-bounce-enter-active {
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-bounce-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-bounce-enter-from {
    opacity: 0;
    transform: scale(0.9) translateY(40px);
}

.modal-bounce-leave-to {
    opacity: 0;
    transform: scale(0.95);
}

.animate-fade-in-up {
    animation: fadeInUp 0.4s ease-out both;
}

.animate-fade-in-right {
    animation: fadeInRight 0.4s ease-out both;
}

.animate-zoom-in {
    animation: zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes fadeInRight {
    from {
        opacity: 0;
        transform: translateX(20px);
    }

    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes zoomIn {
    from {
        opacity: 0;
        transform: scale(0.5);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

/* 自定义滚动条 */
.custom-scrollbar::-webkit-scrollbar {
    width: 5px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: hsl(var(--bc) / 0.15);
    border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--bc) / 0.3);
}

/* 让输入框Placeholder更有质感 */
::placeholder {
    color: hsl(var(--bc) / 0.2);
    font-weight: 500;
}
</style>