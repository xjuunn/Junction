<template>
    <div class="grid grid-cols-4">
        <button class="btn btn-primary" @click="test">test</button>
    </div>
</template>

<script setup lang="ts">
import * as FriendshipApi from '~/api/friendship'
definePageMeta({
    layout: 'main-window'
})
async function test() {
    const data = await FriendshipApi.remove("zRF583ZvyX0VtBDu16GuwJa6TC3fehve")
    console.log(data);
}

</script>
