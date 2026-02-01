<script setup lang="ts">
import { ref } from 'vue';
import type { PrismaTypes } from '@junction/types';
import * as conversationApi from '~/api/conversation';

definePageMeta({ layout: 'main' });

const loading = ref(false);
const testResult = ref<{
    success: boolean;
    data?: AwaitedReturnType<typeof conversationApi.create>['data'];
    error?: string;
    message: string;
} | null>(null);

// 测试创建群聊
const testCreateGroup = async () => {
    loading.value = true;
    try {
        const res = await conversationApi.create({
            type: 'GROUP',
            title: '测试群聊 ' + Date.now(),
            memberIds: []
        });
        
        if (res.success) {
            testResult.value = {
                success: true,
                data: res.data,
                message: '群聊创建成功！'
            };
            console.log('创建群聊成功:', res.data);
        }
    } catch (error) {
        testResult.value = {
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
            message: '群聊创建失败'
        };
        console.error('创建群聊失败:', error);
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div class="p-8 max-w-2xl mx-auto">
        <div class="mb-8">
            <h1 class="text-3xl font-bold mb-2">群聊功能测试</h1>
            <p class="text-base-content/60">测试群聊创建和基本功能</p>
        </div>
        
        <div class="card bg-base-200/30 rounded-xl p-6 mb-6">
            <h2 class="text-xl font-semibold mb-4">创建测试群聊</h2>
            <button 
                class="btn btn-primary"
                :class="{ 'loading': loading }"
                @click="testCreateGroup"
            >
                <Icon v-if="loading" name="mingcute:loading-3-line" size="18" class="animate-spin" />
                {{ loading ? '创建中...' : '创建群聊' }}
            </button>
        </div>
        
        <!-- 测试结果 -->
        <div v-if="testResult" class="card" :class="testResult.success ? 'bg-success/10 border-success/20' : 'bg-error/10 border-error/20'"">
            <div class="p-6">
                <h3 class="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Icon :name="testResult.success ? 'mingcute:check-circle-fill' : 'mingcute:close-circle-fill'" 
                           :class="testResult.success ? 'text-success' : 'text-error'" size="20" />
                    {{ testResult.message }}
                </h3>
                
                <div v-if="testResult.success && testResult.data" class="mt-4">
                    <h4 class="font-medium mb-2">群聊信息：</h4>
                    <pre class="bg-base-200/50 p-4 rounded-lg text-sm overflow-x-auto">{{ JSON.stringify(testResult.data, null, 2) }}</pre>
                    <div class="mt-4">
                        <NuxtLink :to="`/chat/${testResult.data.id}`" class="btn btn-primary">
                            进入群聊
                        </NuxtLink>
                    </div>
                </div>
                
                <div v-else-if="!testResult.success" class="mt-4">
                    <h4 class="font-medium mb-2 text-error">错误信息：</h4>
                    <div class="bg-error/10 p-4 rounded-lg text-error">{{ testResult.error }}</div>
                </div>
            </div>
        </div>
        
        <!-- 功能说明 -->
        <div class="card bg-base-100 rounded-xl p-6 mt-6">
            <h2 class="text-xl font-semibold mb-4">已实现的功能</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                    <div class="flex items-center gap-2">
                        <Icon name="mingcute:check-fill" class="text-success" size="16" />
                        <span>创建群聊</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <Icon name="mingcute:check-fill" class="text-success" size="16" />
                        <span>邀请成员</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <Icon name="mingcute:check-fill" class="text-success" size="16" />
                        <span>移除成员</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <Icon name="mingcute:check-fill" class="text-success" size="16" />
                        <span>角色管理</span>
                    </div>
                </div>
                <div class="space-y-2">
                    <div class="flex items-center gap-2">
                        <Icon name="mingcute:check-fill" class="text-success" size="16" />
                        <span>群聊信息管理</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <Icon name="mingcute:check-fill" class="text-success" size="16" />
                        <span>头像上传</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <Icon name="mingcute:check-fill" class="text-success" size="16" />
                        <span>在线状态显示</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <Icon name="mingcute:check-fill" class="text-success" size="16" />
                        <span>响应式设计</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>