<template>
    <div class="h-full flex flex-col">
        <main-mobile-nav :is-show-back="true">
            <template #start>
                搜索
            </template>
        </main-mobile-nav>
        <div class="flex-1 overflow-y-auto p-5 items-center flex flex-col">
            <div class="join w-full flex justify-center md:w-10/12 lg:w-8/12 xl:w-6/12 max-w-[500px] lg:mt-24 ">
                <div class="input focus-within:outline-0 bg-transparent join-item">
                    <input type="text" placeholder="搜索用户名或关键词">
                </div>
                <button class="btn btn-soft btn-primary join-item">
                    <icon name="mingcute:search-2-fill"></icon>
                    搜索
                </button>
            </div>



        </div>
    </div>
</template>

<script setup lang="ts">

</script>