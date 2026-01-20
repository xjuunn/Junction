<script setup lang="ts">
import { EditorContent } from '@tiptap/vue-3'
import { createReadonlyEditor } from '../../../core/editor'

const props = defineProps<{
    node: any
}>()

const editor = createReadonlyEditor(props.node)

watch(
    () => props.node,
    value => {
        editor.commands.setContent(value)
    },
    { deep: true },
)

onBeforeUnmount(() => {
    editor.destroy()
})
</script>

<template>
    <div class="tiptap-content">
        <EditorContent :editor="editor" />
    </div>
</template>

<style scoped>
.tiptap-content :deep(ul) {
    list-style-type: disc;
    padding-left: 1.5rem;
}

.tiptap-content :deep(ol) {
    list-style-type: decimal;
    padding-left: 1.5rem;
}

.tiptap-content :deep(img) {
    max-width: 100% !important;
    height: auto !important;
    border-radius: 8px;
    border: 1px solid hsl(var(--bc) / 0.1);
    margin: 4px 0;
    display: block !important;
}

.tiptap-content :deep(.ProseMirror img) {
    max-width: 100% !important;
    height: auto !important;
    border-radius: 8px;
    border: 1px solid hsl(var(--bc) / 0.1);
    margin: 4px 0;
    display: block !important;
}
</style>
