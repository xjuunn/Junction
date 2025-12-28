<script setup lang="ts">
/**
 * 导入时确保这些包在 package.json 中版本完全一致
 */
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'

const props = defineProps<{
    modelValue: any;
    placeholder?: string;
    disabled?: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'send', 'textChange']);

const editor = useEditor({
    content: props.modelValue,
    // 强制声明扩展类型
    extensions: [
        StarterKit as any,
        Link.configure({ openOnClick: false }) as any,
        Placeholder.configure({
            placeholder: props.placeholder ?? '输入消息...',
        }) as any,
    ],
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