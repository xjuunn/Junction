<template>
    <layout-list-content>
        <template #list>
            <div class="flex flex-col h-full">
                <main-mobile-nav></main-mobile-nav>
                <div class="tabs tabs-border">
                    <input v-model="chatListType" type="radio" name="chat-tab" value="message" class="tab"
                        aria-label="消息" checked />
                    <input v-model="chatListType" type="radio" name="chat-tab" value="private" class="tab"
                        aria-label="私信" />
                    <input v-model="chatListType" type="radio" name="chat-tab" value="group" class="tab"
                        aria-label="群组" />
                </div>
                <ChatList></ChatList>
            </div>
        </template>
        <template #content>
            <nuxt-page></nuxt-page>
        </template>
    </layout-list-content>
</template>
<script lang="ts" setup>
definePageMeta({ layout: "main-window" });
const chatListType = ref<'message' | 'private' | 'group'>('message')
</script>