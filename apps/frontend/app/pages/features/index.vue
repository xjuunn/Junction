<template>
    <div>
        <button class="btn btn-primary" @click="test">test</button>
        <button class="btn btn-primary" @click="btnFetch">fetch</button>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    layout: "main-window"
})
function test() {
    navigateTo('/auth/sign-in')
}
import * as AppApi from '~/api/app'
async function btnFetch() {
    const data = await AppApi.getHello();
    console.log(data);

}
</script>