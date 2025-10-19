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

async function test() {
    const data = await authClient.signUp.email({
        email: "test02@gmail.com",
        name: "test02",
        password: "123123123"
    })
    console.log(data);

}

</script>
