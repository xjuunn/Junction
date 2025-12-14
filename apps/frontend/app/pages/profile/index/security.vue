<script setup lang="ts">
const authClient = useAuthClient();
const userStore = useUserStore();
const toast = useToast();
const isPasskeyLoading = ref(false);

async function handleRegisterPasskey() {
    isPasskeyLoading.value = true;
    try {
        await authClient.passkey.addPasskey({
            name: `${userStore.user.value?.name || 'User'}'s Device`,
            // displayName: userStore.user.value?.name || 'User'
        });
        toast.success('Passkey 添加成功');
    } catch (error) {
        toast.error('操作取消或失败');
    } finally {
        isPasskeyLoading.value = false;
    }
}
</script>

<template>
    <div
        class="card bg-base-100 shadow-sm border border-base-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div class="card-body p-6 md:p-8">
            <h2 class="card-title text-lg border-b border-base-200 pb-4 mb-6 flex items-center gap-2">
                <Icon name="mingcute:shield-shape-line" class="text-primary" />
                安全设置
            </h2>

            <div class="space-y-6">
                <div
                    class="bg-base-200/40 rounded-xl p-5 border border-base-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-base-200/60">
                    <div class="flex gap-4">
                        <div
                            class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Icon name="mingcute:fingerprint-line" size="24" />
                        </div>
                        <div class="space-y-1">
                            <div class="font-bold text-base-content">通行密钥 (Passkey)</div>
                            <p class="text-sm text-base-content/60 leading-relaxed max-w-md">
                                使用设备的生物识别（指纹、面容）或安全密钥进行无密码登录，这是最安全的验证方式。
                            </p>
                        </div>
                    </div>
                    <button class="btn btn-neutral btn-sm rounded-lg shrink-0" @click="handleRegisterPasskey"
                        :disabled="isPasskeyLoading">
                        <span v-if="isPasskeyLoading" class="loading loading-spinner loading-xs"></span>
                        <Icon v-else name="mingcute:add-line" />
                        添加 Passkey
                    </button>
                </div>

                <div class="divider text-base-content/30 text-xs">认证方式状态</div>

                <div class="grid gap-3">
                    <div class="flex items-center justify-between p-4 bg-base-100 border border-base-200 rounded-xl">
                        <div class="flex items-center gap-4">
                            <div
                                class="w-10 h-10 rounded-lg bg-base-200 flex items-center justify-center text-base-content/70">
                                <Icon name="mingcute:mail-send-line" size="20" />
                            </div>
                            <div>
                                <div class="font-bold text-sm">邮箱验证码 (OTP)</div>
                                <div class="text-xs text-base-content/50">默认开启</div>
                            </div>
                        </div>
                        <div class="badge badge-success badge-sm badge-outline font-medium gap-1">
                            <Icon name="mingcute:check-line" size="12" /> 活跃
                        </div>
                    </div>

                    <div
                        class="flex items-center justify-between p-4 bg-base-100 border border-base-200 rounded-xl opacity-75">
                        <div class="flex items-center gap-4">
                            <div
                                class="w-10 h-10 rounded-lg bg-base-200 flex items-center justify-center text-base-content/70">
                                <Icon name="mingcute:wallet-line" size="20" />
                            </div>
                            <div>
                                <div class="font-bold text-sm">SIWE (Web3 钱包)</div>
                                <div class="text-xs text-base-content/50">通过以太坊钱包签名登录</div>
                            </div>
                        </div>
                        <button class="btn btn-ghost btn-xs text-base-content/60">配置</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>