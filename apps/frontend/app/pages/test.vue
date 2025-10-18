<template>
    <div class="grid grid-cols-4">
        <button class="btn btn-primary" @click="test">
            <span>test</span>
        </button>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    layout: 'main-window'
})
import { type PrismaTypes } from '@junction/types';
const testData = ref<PrismaTypes.Test>()
async function test() {
    
}

</script>
