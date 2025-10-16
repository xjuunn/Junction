<template>
    <layout-list-content>
        <template #list>
            list
        </template>
        <template #content>
            content
        </template>
    </layout-list-content>
</template>
<script lang="ts" setup>
definePageMeta({ layout: "main-window" })
</script>