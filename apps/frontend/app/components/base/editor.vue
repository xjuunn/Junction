<script setup lang="ts">
import { EditorContent } from '@tiptap/vue-3'
import { useTiptapEditor } from '../../core/editor'

const props = defineProps<{
    modelValue: any;
    placeholder?: string;
    disabled?: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'send', 'textChange']);

const editor = useTiptapEditor('editable', {
    content: props.modelValue,
    placeholder: props.placeholder,
    editable: !props.disabled,
    editorProps: {
        attributes: {
            class: 'prose prose-sm focus:outline-none max-w-none min-h-[44px] max-h-48 overflow-y-auto px-1',
        },
        handleKeyDown: (view, event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                emit('send');
                return true;
            }
            return false;
        },
    },
    onUpdate: ({ editor }) => {
        emit('update:modelValue', editor.getJSON());
        emit('textChange', editor.getText());
    },
});

/**
 * 清空内容
 */
const clear = () => {
    editor.value?.commands.clearContent();
};

defineExpose({ clear });

onBeforeUnmount(() => {
    editor.value?.destroy();
});
</script>

<template>
    <div class="w-full relative min-h-[44px]">
        <editor-content :editor="editor" />
    </div>
</template>