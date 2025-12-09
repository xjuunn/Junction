<template>
    <div>
        <button class="btn btn-primary" @click="test">test</button>
    </div>
</template>

<script setup lang="ts">
async function test() {
    const authClient = useAuthClient();
    const data = await authClient.signIn.email({
        email: "xjuunn@gmail.com",
        password: "123123"
    })
    console.log(data);

}
</script>