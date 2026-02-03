<script setup lang="ts">
import type { PrismaTypes } from '@junction/types';

interface Props {
    show: boolean;
    conversation: PrismaTypes.Conversation | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
    (e: 'update:show', value: boolean): void;
    (e: 'conversation-deleted'): void;
}>();

const isGroupChat = computed(() => props.conversation?.type === 'GROUP');
</script>

<template>
    <ClientOnly>
        <BaseModal :model-value="show" @update:model-value="emit('update:show', $event)" :boxClass="isGroupChat ? 'max-w-2xl' : 'max-w-md'" persistent>
            <template #header>
                <div class="flex items-center gap-3">
                    <Icon name="mingcute:settings-3-line" class="text-lg" />
                    <span>{{ isGroupChat ? '群聊设置' : '聊天设置' }}</span>
                </div>
            </template>

            <div class="min-h-[400px]">
                <AppChatDialogGroupSettings v-if="isGroupChat" :conversation="conversation" @close="emit('update:show', false)"
                    @conversation-deleted="emit('conversation-deleted')" />
                <AppChatDialogPrivateSettings v-else :conversation="conversation" @close="emit('update:show', false)"
                    @conversation-deleted="emit('conversation-deleted')" />
            </div>
        </BaseModal>
    </ClientOnly>
</template>
