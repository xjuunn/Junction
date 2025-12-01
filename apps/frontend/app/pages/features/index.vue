<template>
    <div>
        <button class="btn btn-primary" @click="test">test</button>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    layout: "main-window"
})
function test() {
    navigateTo('/auth/sign-in')
}
</script>