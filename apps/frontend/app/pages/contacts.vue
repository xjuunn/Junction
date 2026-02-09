<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import * as FriendshipApi from '~/api/friendship';
import * as ConversationApi from '~/api/conversation';

definePageMeta({ layout: 'main' });

const route = useRoute();
const router = useRouter();
const toast = useToast();

interface FriendItem {
    id: string;
    friendId: string;
    friend: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
        accountType?: string;
    };
    note?: string | null;
    updatedAt: string | Date;
    isBlocked?: boolean;
}

interface GroupItem {
    id: string;
    title: string;
    avatar?: string | null;
    memberCount: number;
    updatedAt: string | Date;
    isBlocked?: boolean;
}

type FriendContact = FriendItem & { type: 'friend' };
type GroupContact = GroupItem & { type: 'group' };
type ContactItem = FriendContact | GroupContact;

const loading = ref(true);
const friends = ref<FriendItem[]>([]);
const groups = ref<GroupItem[]>([]);
const blockedFriends = ref<FriendItem[]>([]);
const searchQuery = ref('');
const activeTab = ref<'all' | 'friend' | 'group' | 'bot' | 'blocked'>('all');

const pagination = reactive({
    page: 1,
    limit: 50,
    hasMore: true,
    total: 0
});

const isDetailOpen = computed(() => {
    return route.name === 'contacts-id' || route.name === 'contacts-group-id';
});

const activeContactId = computed(() => {
    if (route.name === 'contacts-group-id') {
        return `group/${route.params.id}`;
    }
    return route.params.id as string;
});

const tabs = [
    { key: 'all', label: '全部' },
    { key: 'friend', label: '好友' },
    { key: 'group', label: '群组' },
    { key: 'bot', label: 'BOT' },
    { key: 'blocked', label: '拉黑' }
] as const;

const normalizeFriend = (item: any): FriendItem => ({
    id: item.id,
    friendId: item.friendId,
    friend: {
        id: item.friend?.id,
        name: item.friend?.name,
        email: item.friend?.email,
        image: item.friend?.image ?? null,
        accountType: item.friend?.accountType
    },
    note: item.note ?? null,
    updatedAt: item.updatedAt,
    isBlocked: item.isBlocked
});

const normalizeGroup = (item: any): GroupItem => ({
    id: item.id,
    title: item.title,
    avatar: item.avatar ?? null,
    memberCount: item.memberCount,
    updatedAt: item.updatedAt
});

const fetchData = async (reset = false): Promise<void> => {
    if (reset) {
        pagination.page = 1;
        pagination.hasMore = true;
        friends.value = [];
        groups.value = [];
        blockedFriends.value = [];
    }

    if (loading.value && !reset) return;

    loading.value = true;
    try {
        if (activeTab.value !== 'blocked') {
            const [friendRes, groupRes] = await Promise.all([
                FriendshipApi.findAll({
                    page: pagination.page,
                    limit: pagination.limit,
                    status: 'ACCEPTED'
                }),
                ConversationApi.findAll({
                    page: pagination.page,
                    limit: pagination.limit,
                    type: 'GROUP'
                })
            ]);

            if (friendRes.success && friendRes.data) {
                const normalized = friendRes.data.items.map(normalizeFriend);
                const newFriends = normalized.filter(
                    item => !friends.value.some(existing => existing.id === item.id)
                );
                friends.value = reset ? newFriends : [...friends.value, ...newFriends];
            }

            if (groupRes.success && groupRes.data) {
                const normalizedGroups = groupRes.data.items.map(normalizeGroup);
                const newGroups = normalizedGroups.filter(
                    item => !groups.value.some(existing => existing.id === item.id)
                );
                groups.value = reset ? newGroups : [...groups.value, ...newGroups];
            }

            const totalFriends = friendRes.data?.meta.total || 0;
            const totalGroups = groupRes.data?.meta.total || 0;
            pagination.total = totalFriends + totalGroups;
            pagination.hasMore = (friendRes.data?.items.length === pagination.limit) || (groupRes.data?.items.length === pagination.limit);
        } else {
            const blockedRes = await FriendshipApi.findBlocked({
                page: pagination.page,
                limit: pagination.limit
            });

            if (blockedRes.success && blockedRes.data) {
            const normalized = blockedRes.data.items.map(normalizeFriend);
            const newBlocked = normalized.filter(
                item => !blockedFriends.value.some(existing => existing.id === item.id)
            ).map(item => ({ ...item, isBlocked: true as const }));
                blockedFriends.value = reset ? newBlocked : [...blockedFriends.value, ...newBlocked];
                pagination.total = blockedRes.data.meta.total;
                pagination.hasMore = blockedRes.data.items.length === pagination.limit;
            }
        }
        if (pagination.hasMore) pagination.page++;
    } catch (error) {
        console.error(error);
        toast.error('加载联系人失败');
    } finally {
        loading.value = false;
    }
};

const allContacts = computed<ContactItem[]>(() => {
    return [
        ...friends.value.map((f): FriendContact => ({ ...f, type: 'friend' })),
        ...groups.value.map((g): GroupContact => ({ ...g, type: 'group' }))
    ];
});

const isFriendContact = (item: ContactItem): item is FriendContact => item.type === 'friend';
const isGroupContact = (item: ContactItem): item is GroupContact => item.type === 'group';
const isBotFriend = (friend?: FriendItem['friend']) => {
    if (!friend) return false;
    if (friend.accountType === 'BOT') return true;
    if (friend.email && friend.email.startsWith('bot+') && friend.email.endsWith('@bot.local')) return true;
    return false;
};

const botContacts = computed<ContactItem[]>(() => {
    return friends.value
        .filter(item => isBotFriend(item.friend))
        .map((item): FriendContact => ({ ...item, type: 'friend' }));
});

const filteredList = computed<ContactItem[]>(() => {
    let result: ContactItem[] = [];

    if (activeTab.value === 'blocked') {
        result = blockedFriends.value.map((item): FriendContact => ({ ...item, type: 'friend' }));
    } else {
        result = allContacts.value;

        if (activeTab.value === 'friend') {
            result = result.filter(item => isFriendContact(item) && !isBotFriend(item.friend));
        } else if (activeTab.value === 'group') {
            result = result.filter(item => isGroupContact(item));
        } else if (activeTab.value === 'bot') {
            result = botContacts.value;
        }
    }

    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(item => {
            if (isFriendContact(item)) {
                const name = item.friend?.name || '';
                const note = item.note || '';
                return name.toLowerCase().includes(query) || note.toLowerCase().includes(query);
            } else {
                return item.title.toLowerCase().includes(query);
            }
        });
    }

    return result.sort((a, b) => {
        const aTime = new Date(a.updatedAt).getTime();
        const bTime = new Date(b.updatedAt).getTime();
        return bTime - aTime;
    });
});

const handleItemClick = (item: ContactItem) => {
    if (isFriendContact(item)) {
        if (item.friendId) {
            router.push(`/contacts/${item.friendId}`);
        }
    } else {
        router.push(`/contacts/group/${item.id}`);
    }
};

const handleBack = () => {
    router.push('/contacts');
};

const handleRefresh = () => {
    searchQuery.value = '';
    fetchData(true);
};

const removeFriend = (friendId: string) => {
    friends.value = friends.value.filter(f => f.friendId !== friendId);
};

const removeGroup = (groupId: string) => {
    groups.value = groups.value.filter(g => g.id !== groupId);
};

const addBlockedFriend = (friend: FriendItem) => {
    blockedFriends.value.unshift({ ...friend, isBlocked: true as const });
    friends.value = friends.value.filter(f => f.friendId !== friend.friendId);
};

watch(activeTab, () => {
    fetchData(true);
});

onMounted(() => {
    fetchData(true);
});

defineExpose({
    removeFriend,
    removeGroup,
    addBlockedFriend
});
</script>

<template>
    <LayoutListDetail :show-detail="isDetailOpen" @back="handleBack">
        <template #list>
            <div class="flex flex-col h-full bg-base-100 select-none border-r border-base-content/2 overflow-hidden relative">
                <div class="absolute -top-20 -left-20 w-40 h-40 bg-primary/5 blur-[80px] pointer-events-none"></div>

                <header class="p-6 pb-2 space-y-5 relative z-10">
                    <div class="flex items-center justify-between">
                        <div class="flex flex-col">
                            <h1 class="text-2xl font-black tracking-tight flex items-center gap-2">
                                通讯录
                                <div v-if="filteredList.length > 0 && activeTab !== 'blocked'"
                                    class="badge badge-ghost badge-sm font-bold opacity-50">
                                    {{ filteredList.length }}
                                </div>
                                <div v-if="blockedFriends.length > 0 && activeTab === 'blocked'"
                                    class="badge badge-error badge-sm font-bold">
                                    {{ blockedFriends.length }}
                                </div>
                            </h1>
                        </div>
                        <div class="flex gap-1 bg-base-200 p-1 rounded-full">
                            <button class="btn btn-ghost btn-circle btn-sm" @click="handleRefresh">
                                <Icon name="mingcute:refresh-3-line" size="18" :class="{ 'animate-spin': loading }" />
                            </button>
                        </div>
                    </div>

                    <div class="relative group">
                        <div
                            class="absolute inset-y-0 left-4 flex items-center pointer-events-none text-base-content/30 group-focus-within:text-primary transition-colors">
                            <Icon name="mingcute:search-line" size="18" />
                        </div>
                        <input v-model="searchQuery" type="text" placeholder="搜索联系人..."
                            class="input input-sm h-11 w-full pl-11 bg-base-200/50 border-none focus:bg-base-100 rounded-2xl font-medium transition-all focus:ring-4 focus:ring-primary/10" />
                    </div>

                    <div class="tabs tabs-boxed bg-transparent p-0 gap-2">
                        <button v-for="tab in tabs" :key="tab.key" :value="tab.key"
                            class="flex-1 btn btn-sm h-9 border-none rounded-xl font-bold transition-all no-animation"
                            :class="activeTab === tab.key
                                ? tab.key === 'blocked'
                                    ? 'bg-error text-error-content'
                                    : 'bg-base-content text-base-100'
                                : 'bg-base-200/50 text-base-content/50 hover:bg-base-300'"
                            @click="activeTab = tab.key">
                            {{ tab.label }}
                        </button>
                    </div>
                </header>

                <main class="flex-1 overflow-y-auto no-scrollbar py-2 px-3">
                    <div v-if="loading && !allContacts.length && activeTab !== 'blocked'" class="space-y-3">
                        <div v-for="i in 6" :key="i" class="flex items-center gap-4 animate-pulse">
                            <div class="w-12 h-12 bg-base-300 rounded-full"></div>
                            <div class="flex-1 space-y-2">
                                <div class="h-4 bg-base-300 rounded w-1/3"></div>
                                <div class="h-3 bg-base-200 rounded w-1/2"></div>
                            </div>
                        </div>
                    </div>

                    <div v-else-if="!filteredList.length"
                        class="h-full flex flex-col items-center justify-center text-center p-12 opacity-20">
                        <Icon
                            :name="activeTab === 'blocked' ? 'mingcute:forbidden-line' : activeTab === 'bot' ? 'mingcute:ai-line' : 'mingcute:user-search-line'"
                            size="64" />
                        <p class="mt-4 font-black uppercase tracking-widest text-xs">
                            {{ activeTab === 'blocked' ? '暂无拉黑用户' : activeTab === 'bot' ? '暂无机器人' : '暂无联系人' }}
                        </p>
                    </div>

                    <div v-else class="flex flex-col space-y-1">
                        <div v-for="item in filteredList" :key="item.id" @click="handleItemClick(item)"
                            class="group relative flex items-center gap-4 px-3 py-3 cursor-pointer transition-all duration-200 rounded-2xl"
                            :class="[
                                item.type === 'friend' && activeContactId === item.friendId
                                    ? 'bg-base-200/80'
                                    : item.type === 'group' && activeContactId === `group/${item.id}`
                                        ? 'bg-base-200/80'
                                        : 'hover:bg-base-200/40 active:scale-[0.98]'
                            ]">
                            <div class="relative shrink-0">
                                <BaseAvatar v-if="item.type === 'friend'" :text="item.friend?.name || ''" :height="46"
                                    :width="46" :radius="12" :src="item.friend?.image || undefined"
                                    :alt="item.friend?.name" :placeholder-length="2" :class="[
                                        item.type === 'friend' && activeContactId === item.friendId
                                            ? 'ring-2 ring-primary/20'
                                            : 'ring-1 ring-base-content/5'
                                    ]" />
                                <BaseAvatar v-else :text="item.title" :height="46" :width="46" :radius="12"
                                    :src="item.avatar" :alt="item.title" :placeholder-length="2"
                                    class="ring-1 ring-base-content/5" />
                                <div v-if="item.type === 'friend' && item.isBlocked"
                                    class="absolute -bottom-1 -right-1 bg-error rounded-full p-0.5">
                                    <Icon name="mingcute:forbidden-line" size="10" class="text-error-content" />
                                </div>
                            </div>

                            <div class="flex-1 min-w-0 flex flex-col gap-0">
                                <div class="flex items-center justify-between gap-2">
                                    <h3 class="font-bold text-[14px] truncate tracking-tight flex items-center gap-2">
                                        <span>{{ item.type === 'friend' ? item.friend?.name : item.title }}</span>
                                        <span v-if="item.type === 'friend' && isBotFriend(item.friend)"
                                            class="badge badge-outline badge-xs">机器人</span>
                                    </h3>
                                    <span class="text-[10px] font-bold tabular-nums tracking-wider opacity-40 shrink-0">
                                        {{ formatTimeAgo(item.updatedAt) }}
                                    </span>
                                </div>
                                <div v-if="item.type === 'friend' && item.note"
                                    class="text-[13px] truncate opacity-50 leading-tight font-medium">
                                    {{ item.note }}
                                </div>
                                <div v-else-if="item.type === 'group'"
                                    class="text-[13px] truncate opacity-40 leading-tight">
                                    {{ item.memberCount }} 位成员
                                </div>
                                <div v-else-if="item.type === 'friend' && item.friend?.email"
                                    class="text-[13px] truncate opacity-40 leading-tight">
                                    {{ item.friend?.email }}
                                </div>
                            </div>

                            <div v-if="item.type === 'group'" class="absolute top-2 right-2">
                                <div class="badge badge-xs font-bold bg-neutral text-neutral-content">
                                    <Icon name="mingcute:group-fill" size="10" />
                                </div>
                            </div>
                        </div>

                        <div v-if="pagination.hasMore" class="py-4 flex justify-center w-full">
                            <button @click="() => fetchData()"
                                class="btn btn-ghost btn-xs text-base-content/40 hover:text-base-content"
                                :disabled="loading">
                                <span v-if="loading" class="loading loading-spinner loading-xs"></span>
                                <span v-else>加载更多</span>
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </template>

        <template #detail>
            <NuxtPage @friend-deleted="removeFriend" @group-deleted="removeGroup" @friend-blocked="addBlockedFriend" />
        </template>

        <template #empty>
            <div class="flex flex-col items-center justify-center h-full text-base-content/30 gap-4">
                <div class="w-24 h-24 rounded-full bg-base-200/50 flex items-center justify-center">
                    <Icon name="mingcute:contact-line" size="40" />
                </div>
                <span class="text-sm font-medium tracking-wide">选择一位联系人查看详情</span>
            </div>
        </template>
    </LayoutListDetail>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}

.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
