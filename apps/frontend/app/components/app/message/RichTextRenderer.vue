<script setup lang="ts">
import { EditorContent } from '@tiptap/vue-3'
import { createReadonlyEditor } from '../../../core/editor'
import { downloadFile } from '~/utils/download'
import { isTauri } from '~/utils/check'

const props = defineProps<{
    node: any
}>()

const editor = createReadonlyEditor(props.node)
const dialog = useDialog()
const toast = useToast()

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

/**
 * 处理文件下载
 */
const handleFileDownload = async (url: string, fileName: string) => {
    const confirmed = await dialog.confirm({
        title: '下载文件',
        content: `确认下载 ${fileName} 吗？`,
        type: 'info'
    })
    if (!confirmed) return

    try {
        const result = await downloadFile({
            source: { url },
            target: { fileName }
        })
        if (!result.success) {
            toast.error(result.error || '下载失败')
        } else {
            toast.success('下载完成')
        }
    } catch (error: any) {
        toast.error(error?.message || '下载失败')
    }
}

/**
 * 处理文件块点击
 */
const handleClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    const link = target?.closest('a.file-link, a[data-file], a[href*="/uploads/"]') as HTMLAnchorElement | null
    if (!link) return
    event.preventDefault()
    event.stopPropagation()
    const url = link.getAttribute('href') || ''
    const fileName = link.getAttribute('title') || link.getAttribute('data-file-name') || link.textContent || '文件'
    if (!url) return
    handleFileDownload(url, fileName)
}
</script>

<template>
    <div class="tiptap-content" @click="handleClick">
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

.tiptap-content :deep(.ProseMirror a[data-file]),
.tiptap-content :deep(.ProseMirror a.file-link) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 12px;
    background: linear-gradient(135deg, hsl(var(--b2)) 0%, hsl(var(--b3)) 100%);
    color: inherit;
    text-decoration: none;
    border: 1px solid hsl(var(--bc) / 0.12);
    box-shadow: 0 6px 16px hsl(var(--bc) / 0.08);
    width: 100%;
    box-sizing: border-box;
}

.tiptap-content :deep(.ProseMirror a[data-file]::before),
.tiptap-content :deep(.ProseMirror a.file-link::before) {
    content: '📎';
}

.tiptap-content :deep(.ProseMirror a[data-file]:hover),
.tiptap-content :deep(.ProseMirror a.file-link:hover) {
    background: linear-gradient(135deg, hsl(var(--b3)) 0%, hsl(var(--b2)) 100%);
    border-color: hsl(var(--bc) / 0.2);
}
</style>
