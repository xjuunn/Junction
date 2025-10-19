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
        email: "test01@gmail.com",
        name: "test01",
        password: "123123123"
    })
    console.log(data);

}

</script>
