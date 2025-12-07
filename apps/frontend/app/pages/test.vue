<template>
    <layout-list-detail :show-detail="isDetailOpen">

        <template #list>
            <div class="p-4">列表内容</div>
        </template>

        <template #detail>
            <div class="p-4 h-full">详情内容</div>
        </template>

        <template #empty>
            <div class="flex items-center justify-center h-full text-gray-400">
                选择列表项
            </div>
        </template>

        <!-- <template #mobile-header>
            <div class="p-2 border-b">返回按钮</div>
        </template> -->

    </layout-list-detail>
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router'
definePageMeta({ layout: 'main' })

const route = useRoute()
// 如果路由中存在id，则显示详情
const isDetailOpen = computed(() => {
    return !!route.params.id
})
</script>