<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
import { uploadFiles } from '~/api/upload';

definePageMeta({ layout: "main" });

const authClient = useAuthClient();
const userStore = useUserStore();
const { copy, copied } = useClipboard();
const toast = useToast();
const fileInputRef = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);

const menuItems = [
    { to: '/profile/general', label: '基本设置', icon: 'mingcute:settings-3-line' },
    { to: '/profile/security', label: '安全验证', icon: 'mingcute:shield-line' },
];

async function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    isUploading.value = true;
    try {
        const file = input.files[0];
        if (!file) return;
        const { data, success } = await uploadFiles('avatar', [file]);

        if (success && data) {
            await authClient.updateUser({
                image: data.files[0]
            });
            await userStore.refresh();
            toast.success('头像已更新');
        }
    } catch (error) {
        toast.error('头像上传失败');
    } finally {
        isUploading.value = false;
        if (fileInputRef.value) fileInputRef.value.value = '';
    }
}

function triggerFileInput() {
    fileInputRef.value?.click();
}
</script>

<template>
    <div class="h-full bg-base-200 p-4 md:p-8 overflow-y-auto">
        <div class="mx-auto max-w-6xl space-y-6">

            <div class="card bg-base-100 shadow-sm border border-base-200">
                <div class="card-body p-6 md:p-8 flex-col md:flex-row items-center md:items-start gap-8">
                    <div class="relative group shrink-0">
                        <div class="avatar">
                            <div
                                class="w-24 h-24 rounded-full ring ring-base-200 ring-offset-2 ring-offset-base-100 overflow-hidden">
                                <img v-if="userStore.user.value?.image"
                                    :src="resolveAssetUrl(userStore.user.value.image)" class="object-cover" />
                                <div v-else
                                    class="w-full h-full bg-neutral text-neutral-content grid place-items-center text-3xl font-bold">
                                    {{ userStore.user.value?.name?.charAt(0).toUpperCase() }}
                                </div>
                            </div>
                        </div>
                        <button @click="triggerFileInput"
                            class="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                            :disabled="isUploading">
                            <span v-if="isUploading" class="loading loading-spinner loading-sm"></span>
                            <Icon v-else name="mingcute:camera-line" size="24" />
                        </button>
                        <input ref="fileInputRef" type="file" class="hidden" accept="image/png, image/jpeg, image/webp"
                            @change="handleFileChange" />
                    </div>

                    <div class="flex-1 text-center md:text-left space-y-3 min-w-0 w-full pt-1">
                        <div class="flex flex-col md:flex-row items-center gap-3">
                            <h1 class="text-2xl font-black tracking-tight truncate max-w-full">
                                {{ userStore.user.value?.name || 'User' }}
                            </h1>
                            <div class="badge badge-primary badge-outline gap-1 font-medium h-6"
                                v-if="userStore.user.value?.emailVerified">
                                <Icon name="mingcute:check-circle-fill" size="14" />
                                已验证
                            </div>
                        </div>
                        <div
                            class="flex items-center justify-center md:justify-start gap-2 text-base-content/60 text-sm">
                            <Icon name="mingcute:mail-line" size="16" />
                            <span>{{ userStore.user.value?.email }}</span>
                        </div>
                        <div class="inline-flex items-center gap-2 bg-base-200 px-3 py-1.5 rounded-lg text-xs font-mono text-base-content/50 cursor-pointer hover:bg-base-300 transition-colors active:scale-95 duration-200"
                            @click="copy(userStore.user.value?.id || '')">
                            <span>UID: {{ userStore.user.value?.id }}</span>
                            <Icon :name="copied ? 'mingcute:check-line' : 'mingcute:copy-line'" size="14" />
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div class="md:col-span-3 lg:col-span-3">
                    <div class="bg-base-100 rounded-2xl border border-base-200 p-2 shadow-sm sticky top-4">
                        <ul class="menu w-full gap-1">
                            <li v-for="item in menuItems" :key="item.to">
                                <NuxtLink :to="item.to"
                                    active-class="!bg-primary !text-primary-content font-bold shadow-md shadow-primary/20"
                                    class="rounded-xl py-3 px-4 text-base-content/70 hover:bg-base-200 transition-all">
                                    <Icon :name="item.icon" size="20" />
                                    {{ item.label }}
                                </NuxtLink>
                            </li>
                        </ul>
                    </div>
                </div>

                <div class="md:col-span-9 lg:col-span-9">
                    <NuxtPage />
                </div>
            </div>
        </div>
    </div>
</template>