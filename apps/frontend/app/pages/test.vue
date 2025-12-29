<template>
    <div>
        <button class="btn btn-primary" @click="test">test</button>
    </div>
</template>

<script setup lang="ts">
const runtimeConfig = useRuntimeConfig();
function test() {
    console.log(runtimeConfig.public);

}
</script>