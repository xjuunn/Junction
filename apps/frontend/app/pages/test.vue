<template>
    <div class="grid grid-cols-4">
        <button class="btn btn-primary" @click="test">
            <span v-if="!loading">{{ useTestStore().num }}</span>
        </button>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    layout: 'main-window'
})
const loading = ref(true);
onMounted(() => {
    loading.value = false;
})

async function test() {
    useTestStore().addNum();
}

</script>
