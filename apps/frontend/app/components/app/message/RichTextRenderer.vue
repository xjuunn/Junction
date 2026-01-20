<script setup lang="ts">
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

const props = defineProps<{
    node: any
}>()

const editor = new Editor({
    extensions: [StarterKit],
    content: props.node,
    editable: false,
})

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
</style>
