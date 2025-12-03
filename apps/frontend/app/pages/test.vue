<template>
    <div>
        <button class="btn btn-primary" @click="test">test</button>
        <base-modal v-model="isShow" title="测试Modal">
            <p>测试Modal</p>
            <template #actions>
                <button class="btn btn-primary" @click="isShow = false">确定</button>
            </template>
        </base-modal>
    </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'main-window' });
const isShow = ref(false);
function test() {
    isShow.value = true
}

</script>