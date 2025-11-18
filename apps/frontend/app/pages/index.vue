<template>
    <layout-list-content ref="layoutListContentRef">
        <template #list>
            <div class="flex flex-col h-full">
                <main-mobile-nav>
                    <template #start>
                        <base-avatar :size="40" :text="user?.name"></base-avatar>
                    </template>
                    <template #end>
                        <main-common-window-control-buttons></main-common-window-control-buttons>
                    </template>
                </main-mobile-nav>
                <div class="p-2 hidden md:block">
                    <div class="input bg-base-content/1 border-0 input-sm focus-within:outline-0 w-full">
                        <input placeholder="输入关键词或用户名" type="text">
                    </div>
                </div>
                <div class="tabs tabs-border">
                    <input v-model="chatListType" type="radio" name="chat-tab" value="message" class="tab"
                        aria-label="消息" checked />
                    <input v-model="chatListType" type="radio" name="chat-tab" value="private" class="tab"
                        aria-label="私信" />
                    <input v-model="chatListType" type="radio" name="chat-tab" value="group" class="tab"
                        aria-label="群组" />
                </div>
                <ChatList @on-item-click="onItemClick"></ChatList>
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
const layoutListContentRef = useTemplateRef('layoutListContentRef');
const { user } = useUserStore();
function onItemClick(item: any) {
    console.log(item);
    layoutListContentRef.value?.switchContent();
}

</script>