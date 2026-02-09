<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import type { User } from '@junction/backend/src/resource/user/user.service';
import * as conversationApi from '~/api/conversation';
import * as userApi from '~/api/user';

interface Props {
    modelValue: boolean;
    conversationId: string;
}

interface Emits {
    (e: 'update:modelValue', value: boolean): void;
    (e: 'success'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
});

const loading = ref(false);
const inviting = ref(false);
const friends = ref<User[]>([]);
const searchQuery = ref('');
const selectedMembers = ref<string[]>([]);
const searchDebounce = ref<NodeJS.Timeout>();

// 获取可邀请的好友列表
const loadFriends = async () => {
    loading.value = true;
    try {
        const [usersRes, membersRes] = await Promise.all([
            userApi.search({ query: '', limit: 100 }),
            conversationApi.getMembers(props.conversationId)
        ]);
        
        if (usersRes.success && usersRes.data) {
            let availableFriends = usersRes.data.items.filter(user => 
                user.id !== useUserStore().user.value?.id
            );
            
            // 过滤掉已经是群成员的用户
            if (membersRes.success && membersRes.data) {
                const memberIds = membersRes.data.map(m => m.user.id);
                availableFriends = availableFriends.filter(user => !memberIds.includes(user.id));
            }
            
            friends.value = availableFriends;
        }
    } finally {
        loading.value = false;
    }
};

// 搜索好友
const filteredFriends = computed(() => {
    if (!searchQuery.value) return friends.value;
    const query = searchQuery.value.toLowerCase().trim();
    return friends.value.filter(friend => 
        friend.name.toLowerCase().includes(query) ||
        friend.email.toLowerCase().includes(query)
    );
});

// 已选择的好友
const selectedFriends = computed(() => {
    return friends.value.filter(friend => selectedMembers.value.includes(friend.id));
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
const handleSearch = (query: string) => {
    searchQuery.value = query;
    clearTimeout(searchDebounce.value);
    searchDebounce.value = setTimeout(() => {
        // 搜索逻辑已在 computed 中处理
    }, 300);
};

// 邀请成员
const inviteMembers = async () => {
    if (selectedMembers.value.length === 0) return;
    
    inviting.value = true;
    try {
        const res = await conversationApi.addMembers(props.conversationId, selectedMembers.value);
        if (res.success) {
            emit('success');
            isOpen.value = false;
            resetForm();
            useToast().success(`成功邀请 ${selectedMembers.value.length} 位成员加入群聊`);
        }
    } catch (error) {
        // 错误处理已在 API 层完成
    } finally {
        inviting.value = false;
    }
};

// 重置表单
const resetForm = () => {
    selectedMembers.value = [];
    searchQuery.value = '';
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

// 批量选择
const selectAll = () => {
    selectedMembers.value = filteredFriends.value.map(friend => friend.id);
};

const clearAll = () => {
    selectedMembers.value = [];
};

// 监听对话框打开
watch(isOpen, (newVal) => {
    if (newVal) {
        loadFriends();
        resetForm();
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
                <div class="relative bg-base-100/80 backdrop-blur-md modal-surface rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-base-200/50">
                    
                    <!-- 装饰性光效 -->
                    <div class="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 blur-[60px] pointer-events-none"></div>
                    <div class="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/10 blur-[60px] pointer-events-none"></div>
                    
                    <!-- 头部 -->
                    <header class="relative p-8 pb-6 border-b border-base-200/50">
                        <div class="flex items-center justify-between">
                            <div>
                                <h1 class="text-2xl font-bold bg-gradient-to-r from-base-content to-base-content/70 bg-clip-text text-transparent">
                                    邀请成员
                                </h1>
                                <p class="text-sm text-base-content/60 mt-1">选择要邀请的好友加入群聊</p>
                            </div>
                            <button class="btn btn-ghost btn-circle btn-sm hover:bg-base-200" @click="isOpen = false">
                                <Icon name="mingcute:close-line" size="20" />
                            </button>
                        </div>
                    </header>
                    
                    <!-- 内容区域 -->
                    <main class="flex-1 overflow-y-auto p-8 pb-6">
                        <!-- 搜索和批量操作 -->
                        <div class="space-y-4">
                            <!-- 搜索框 -->
                            <div class="form-control">
                                <div class="input input-bordered flex items-center gap-3 h-12 rounded-xl">
                                    <Icon name="mingcute:search-2-line" size="20" class="text-base-content/40" />
                                    <input 
                                        v-model="searchQuery" 
                                        type="text" 
                                        placeholder="搜索好友姓名或邮箱..." 
                                        class="flex-1 bg-transparent outline-none"
                                        @input="handleSearch"
                                    />
                                    <div v-if="searchQuery" class="badge badge-ghost badge-sm">
                                        {{ filteredFriends.length }}
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 已选择的成员预览 -->
                            <div v-if="selectedFriends.length" class="space-y-3">
                                <div class="flex items-center justify-between">
                                    <h3 class="text-sm font-medium text-base-content/70">
                                        已选择 {{ selectedFriends.length }} 位成员
                                    </h3>
                                    <button class="btn btn-ghost btn-xs text-error" @click="clearAll">
                                        清空
                                    </button>
                                </div>
                                
                                <!-- 移动端紧凑显示 -->
                                <div v-if="isMobile" class="flex gap-2 overflow-x-auto pb-2">
                                    <div 
                                        v-for="friend in selectedFriends.slice(0, 10)" 
                                        :key="friend.id"
                                        class="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full flex-shrink-0"
                                    >
                                        <div class="avatar w-6 h-6">
                                            <img v-if="friend.image" :src="friend.image" :alt="friend.name" class="object-cover" />
                                            <div v-else class="w-full h-full bg-primary/20 flex items-center justify-center text-xs">
                                                {{ getInitial(friend) }}
                                            </div>
                                        </div>
                                        <span class="text-xs font-medium truncate max-w-[60px]">{{ getDisplayName(friend) }}</span>
                                    </div>
                                    <div v-if="selectedFriends.length > 10" class="flex items-center gap-2 bg-base-200/50 px-3 py-1.5 rounded-full flex-shrink-0">
                                        <span class="text-xs font-medium">+{{ selectedFriends.length - 10 }}</span>
                                    </div>
                                </div>
                                
                                <!-- 桌面端网格显示 -->
                                <div v-else class="flex flex-wrap gap-2">
                                    <div 
                                        v-for="friend in selectedFriends" 
                                        :key="friend.id"
                                        class="badge badge-primary badge-lg gap-2 px-3 py-2"
                                    >
                                        <div class="avatar w-5 h-5">
                                            <img v-if="friend.image" :src="friend.image" :alt="friend.name" class="object-cover" />
                                            <div v-else class="w-full h-full bg-primary/20 flex items-center justify-center text-xs">
                                                {{ getInitial(friend) }}
                                            </div>
                                        </div>
                                        <span class="text-xs font-medium truncate max-w-[80px]">{{ getDisplayName(friend) }}</span>
                                        <Icon name="mingcute:close-line" size="12" class="cursor-pointer hover:text-error transition-colors" @click="toggleMember(friend.id)" />
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 批量操作 -->
                            <div v-if="!loading && filteredFriends.length" class="flex items-center justify-between">
                                <h3 class="text-sm font-medium text-base-content/70">
                                    好友列表 ({{ filteredFriends.length }})
                                </h3>
                                <div class="flex gap-2">
                                    <button 
                                        class="btn btn-ghost btn-xs"
                                        :disabled="selectedMembers.length === 0"
                                        @click="clearAll"
                                    >
                                        取消全选
                                    </button>
                                    <button 
                                        class="btn btn-primary btn-xs"
                                        :disabled="selectedMembers.length === filteredFriends.length"
                                        @click="selectAll"
                                    >
                                        全选
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 好友列表 -->
                        <div class="space-y-1 mt-6 max-h-80 overflow-y-auto custom-scrollbar">
                            <!-- 加载状态 -->
                            <div v-if="loading" class="space-y-3">
                                <div v-for="i in 6" :key="i" class="flex items-center gap-4 p-4 rounded-xl bg-base-200/30 animate-pulse">
                                    <div class="w-12 h-12 bg-base-300 rounded-full"></div>
                                    <div class="flex-1 space-y-2">
                                        <div class="h-4 bg-base-300 rounded w-1/2"></div>
                                        <div class="h-3 bg-base-200 rounded w-3/4"></div>
                                    </div>
                                    <div class="w-5 h-5 bg-base-300 rounded"></div>
                                </div>
                            </div>
                            
                            <!-- 空状态 -->
                            <div v-else-if="filteredFriends.length === 0" class="text-center py-16">
                                <Icon name="mingcute:user-search-line" size="56" class="text-base-content/20 mx-auto mb-4" />
                                <p class="text-base-content/40 text-sm font-medium">{{ searchQuery ? '没有找到相关好友' : '暂无可邀请的好友' }}</p>
                                <p v-if="searchQuery" class="text-base-content/30 text-xs mt-2">尝试使用其他关键词搜索</p>
                            </div>
                            
                            <!-- 好友列表 -->
                            <div v-else class="space-y-1">
                                <div 
                                    v-for="friend in filteredFriends" 
                                    :key="friend.id"
                                    class="group flex items-center gap-4 p-4 rounded-xl hover:bg-base-200/50 cursor-pointer transition-all"
                                    :class="{ 'bg-primary/5 border border-primary/20': selectedMembers.includes(friend.id) }"
                                    @click="toggleMember(friend.id)"
                                >
                                    <!-- 头像 -->
                                    <div class="avatar">
                                        <div class="w-12 h-12 rounded-full border-2 border-transparent group-hover:border-primary/20 transition-all relative">
                                            <img v-if="friend.image" :src="friend.image" :alt="friend.name" class="object-cover" />
                                            <div v-else class="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                                                <span class="text-primary font-medium text-sm">{{ getInitial(friend) }}</span>
                                            </div>
                                            
                                            <!-- 在线状态指示器 -->
                                            <div class="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-2 border-base-100"></div>
                                        </div>
                                    </div>
                                    
                                    <!-- 用户信息 -->
                                    <div class="flex-1 min-w-0">
                                        <div class="font-medium text-base-content truncate flex items-center gap-2">
                                            {{ getDisplayName(friend) }}
                                            <Icon name="mingcute:verified-fill" v-if="friend.role === 'admin'" size="14" class="text-primary" />
                                            <span v-if="friend.accountType === 'BOT'" class="badge badge-outline badge-xs">机器人</span>
                                        </div>
                                        <div class="text-sm text-base-content/60 truncate">{{ friend.email }}</div>
                                    </div>
                                    
                                    <!-- 选中状态 -->
                                    <div class="flex items-center">
                                        <div v-if="selectedMembers.includes(friend.id)" class="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                            <Icon name="mingcute:check-line" size="14" class="text-primary-content" />
                                        </div>
                                        <div v-else class="w-6 h-6 rounded-full border-2 border-base-300"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                    
                    <!-- 底部操作 -->
                    <footer class="p-8 pt-6 border-t border-base-200/50">
                        <div class="flex items-center gap-3">
                            <div v-if="selectedMembers.length > 0" class="flex-1">
                                <div class="text-sm text-base-content/60">
                                    将邀请 <span class="font-bold text-primary">{{ selectedMembers.length }}</span> 位好友加入群聊
                                </div>
                            </div>
                            
                            <button 
                                class="btn btn-ghost btn-md px-6 font-medium"
                                @click="isOpen = false"
                            >
                                取消
                            </button>
                            
                            <button 
                                class="btn btn-primary btn-md px-8 font-medium shadow-lg shadow-primary/25"
                                :disabled="selectedMembers.length === 0 || inviting"
                                @click="inviteMembers"
                            >
                                <Icon v-if="inviting" name="mingcute:loading-3-line" size="18" class="animate-spin" />
                                <span v-else>邀请成员</span>
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

.modal-enter-active .relative.modal-surface,
.modal-leave-active .relative.modal-surface {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from .relative.modal-surface,
.modal-leave-to .relative.modal-surface {
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
