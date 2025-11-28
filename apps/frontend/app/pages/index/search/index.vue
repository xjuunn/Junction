<template>
    <div class="min-h-screen flex flex-col">
        <main-mobile-nav :is-show-back="true" class="shadow-sm z-50">
            <template #start>
                <span class="font-bold text-lg">搜索用户</span>
            </template>
        </main-mobile-nav>

        <div class="flex-1 flex flex-col items-center w-full px-4 pt-6 pb-10">
            <div class="w-full max-w-lg mb-8">
                <div class="join w-full shadow-sm">
                    <input type="text" v-model="keyword" @keyup.enter="btnSearch"
                        class="input input-bordered join-item w-full focus:outline-none"
                        placeholder="输入用户名或关键词..." />
                    <button class="btn btn-primary join-item px-6" :class="{ 'btn-disabled': loading }"
                        @click="btnSearch">
                        <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                        <icon v-else name="mingcute:search-2-fill" class="text-xl"></icon>
                    </button>
                </div>
            </div>

            <div class="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-4">
                <template v-if="loading">
                    <div v-for="i in 6" :key="i" class="card shadow-sm border border-base-200">
                        <div class="card-body flex-row items-center p-4 gap-4">
                            <div class="skeleton w-12 h-12 rounded-full shrink-0"></div>
                            <div class="flex-1 min-w-0 flex flex-col gap-2">
                                <div class="skeleton h-4 w-1/2"></div>
                                <div class="skeleton h-3 w-1/3"></div>
                            </div>
                            <div class="skeleton w-16 h-8 rounded-lg shrink-0"></div>
                        </div>
                    </div>
                </template>

                <template v-else-if="data?.data?.items && data.data.items.length > 0">
                    <div v-for="user in data.data.items" :key="user.id"
                        class="card shadow-sm border border-base-200 hover:shadow-md transition-all duration-200">
                        <div class="card-body flex-row items-center p-4 gap-4">
                            <div class="avatar">
                                <div
                                    class="w-12 h-12 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                                    <base-avatar :text="user.name" :src="user.image" class="w-full h-full" />
                                </div>
                            </div>

                            <div class="flex-1 min-w-0">
                                <h3 class="font-bold text-base-content truncate">{{ user.name }}</h3>
                                <p class="text-xs text-base-content/60 truncate">ID: {{ user.id }}</p>
                            </div>

                            <button class="btn btn-sm shrink-0 gap-1 w-24 transition-all"
                                :class="getButtonClass(user.id)" :disabled="isButtonDisabled(user.id)"
                                @click="handleAddFriend(user)">
                                <span v-if="pendingIds.has(user.id)" class="loading loading-spinner loading-xs"></span>
                                <icon v-else-if="sentIds.has(user.id)" name="mingcute:check-fill" />
                                <icon v-else name="mingcute:user-add-line" />
                                {{ getButtonText(user.id) }}
                            </button>
                        </div>
                    </div>
                </template>

                <template v-else-if="searched">
                    <div class="col-span-full flex flex-col items-center justify-center py-10 text-base-content/50">
                        <icon name="mingcute:ghost-line" class="text-6xl mb-2 opacity-50"></icon>
                        <p>未找到相关用户</p>
                    </div>
                </template>

                <template v-else>
                    <div class="col-span-full flex flex-col items-center justify-center py-10 text-base-content/50">
                        <icon name="mingcute:search-3-line" class="text-6xl mb-2 opacity-50"></icon>
                        <p>输入关键词开始搜索</p>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import * as UserApi from '@/api/user';
import * as FriendshipApi from '@/api/friendship';

const data = ref<AwaitedReturnType<typeof UserApi['search']>>();
const keyword = ref("")
const loading = ref(false)
const searched = ref(false)

const pendingIds = ref(new Set<string>());
const sentIds = ref(new Set<string>());

async function btnSearch() {
    if (!keyword.value.trim()) return;
    loading.value = true;
    searched.value = true;
    try {
        data.value = await UserApi.search(keyword.value, { limit: 20, page: 1 });
        sentIds.value.clear();
    } finally {
        loading.value = false;
    }
}

async function handleAddFriend(user: any) {
    if (pendingIds.value.has(user.id) || sentIds.value.has(user.id)) return;

    pendingIds.value.add(user.id);
    try {
        await FriendshipApi.create({ receiverId: user.id });
        sentIds.value.add(user.id);
    } catch (error) {
        console.error(error);
    } finally {
        pendingIds.value.delete(user.id);
    }
}

function getButtonClass(userId: string) {
    if (sentIds.value.has(userId)) {
        return 'btn-success btn-soft text-success-content';
    }
    return 'btn-primary btn-soft';
}

function isButtonDisabled(userId: string) {
    return pendingIds.value.has(userId) || sentIds.value.has(userId);
}

function getButtonText(userId: string) {
    if (pendingIds.value.has(userId)) return '发送中';
    if (sentIds.value.has(userId)) return '已发送';
    return '加好友';
}
</script>