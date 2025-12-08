<script setup lang="ts">
definePageMeta({ layout: "main" })
const route = useRoute();
const isDetailOpen = computed(() => !!route.params.id);
</script>

<template>
    <LayoutListDetail :show-detail="isDetailOpen" sidebar-width="340px">
        <template #list>
            list
        </template>
        <template #detail>
            <NuxtPage />
        </template>
        <template #empty>
            empty
        </template>
        <template #mobile-header>
            header
        </template>
    </LayoutListDetail>
</template>