<template>
    <div class="grid grid-cols-4">
        <button class="btn btn-primary" @click="test">
            test
        </button>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    layout: 'main-window'
})

async function test() {

}
</script>
