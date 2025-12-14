<script setup lang="ts">
const authClient = useAuthClient();
const userStore = useUserStore();
const toast = useToast();
const isLoading = ref(false);

const formData = reactive({
    name: '',
    email: ''
});

watchEffect(() => {
    if (userStore.user.value) {
        formData.name = userStore.user.value.name || '';
        formData.email = userStore.user.value.email || '';
    }
});

async function handleUpdateProfile() {
    if (!userStore.user.value) return;
    isLoading.value = true;
    try {
        if (formData.name !== userStore.user.value.name) {
            await authClient.updateUser({ name: formData.name });
        }

        if (formData.email !== userStore.user.value.email) {
            await authClient.changeEmail({
                newEmail: formData.email,
                callbackURL: window.location.href
            });
            toast.success('验证邮件已发送，请查收');
        } else {
            toast.success('个人信息已保存');
        }
        await userStore.refresh();
    } catch (error) {
        toast.error('保存失败');
    } finally {
        isLoading.value = false;
    }
}
</script>

<template>
    <div
        class="card bg-base-100 shadow-sm border border-base-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div class="card-body p-6 md:p-8">
            <h2 class="card-title text-lg border-b border-base-200 pb-4 mb-6 flex items-center gap-2">
                <Icon name="mingcute:user-edit-line" class="text-primary" />
                基本信息
            </h2>

            <div class="grid gap-8 max-w-2xl">
                <div class="form-control w-full">
                    <label class="label">
                        <span class="label-text font-bold">显示名称</span>
                    </label>
                    <input v-model="formData.name" type="text"
                        class="input input-bordered w-full focus:input-primary bg-base-100" placeholder="设置您的昵称" />
                    <label class="label">
                        <span class="label-text-alt text-base-content/50">这将是其他用户看到的名称</span>
                    </label>
                </div>

                <div class="form-control w-full">
                    <label class="label">
                        <span class="label-text font-bold">电子邮箱</span>
                    </label>
                    <input v-model="formData.email" type="email"
                        class="input input-bordered w-full focus:input-primary bg-base-100"
                        placeholder="your@email.com" />
                    <div v-if="formData.email !== userStore.user.value?.email"
                        class="alert alert-warning mt-4 py-2 text-sm shadow-sm">
                        <Icon name="mingcute:alert-line" />
                        <span>修改邮箱需要重新验证，验证通过前将保留原邮箱。</span>
                    </div>
                </div>
            </div>

            <div class="card-actions justify-end mt-10 pt-6 border-t border-base-200">
                <button class="btn btn-primary px-8 rounded-xl min-w-[120px]" @click="handleUpdateProfile"
                    :disabled="isLoading">
                    <span v-if="isLoading" class="loading loading-spinner loading-xs"></span>
                    保存更改
                </button>
            </div>
        </div>
    </div>
</template>