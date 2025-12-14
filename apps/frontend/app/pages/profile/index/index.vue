<script setup lang="ts">
definePageMeta({
    middleware: [
        function (to, from) {
            return navigateTo('/profile/general')
        }
    ]
})
</script>
<template>
    <div></div>
</template>