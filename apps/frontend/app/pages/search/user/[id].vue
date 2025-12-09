<template>
    <div>
        {{ route.params.id }}
    </div>
</template>

<script setup lang="ts">
import * as User from '~/api/user';
const route = useRoute();

onMounted(() => {
    initData();
})

async function initData() {
    // User.
}


</script>