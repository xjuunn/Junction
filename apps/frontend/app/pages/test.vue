<template>
    <div class="grid grid-cols-4">
        <button class="btn btn-primary" @click="test">test</button>
    </div>
</template>

<script setup lang="ts">
import * as UploadApi from '@/api/upload'
definePageMeta({
    layout: 'main-window'
})
function test() {
    const { open, files } = useFileDialog({
        multiple: true
    });

    watch(files, (fileList) => {
        if (!fileList || fileList.length === 0) return;

        const arr = Array.from(fileList);
        UploadApi.uploadFiles("test", arr);
    });

    open();
}

</script>
