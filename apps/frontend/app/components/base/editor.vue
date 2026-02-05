<script setup lang="ts">
import { EditorContent } from '@tiptap/vue-3'
import { useEditorWithImageUpload } from '../../core/editor'
import { uploadFiles } from '../../api/upload'
import { downloadFile } from '~/utils/download'
import { isTauri } from '~/utils/check'

const props = defineProps<{
    modelValue: any;
    placeholder?: string;
    disabled?: boolean;
    enableImageUpload?: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'send', 'textChange']);
const dialog = useDialog();
const toast = useToast();

// --- 状态管理 ---
const isDragOver = ref(false);
const dragCounter = ref(0);

/**
 * 统一的图片上传并插入逻辑
 * 暴露给外部使用，支持指定位置插入
 */
const processAndInsertImage = async (view: any, file: File, pos?: number) => {
    try {
        const response = await uploadFiles('message', [file]);
        if (response.success && response.data?.files?.[0]) {
            const imageUrl = `${useRuntimeConfig().public.apiUrl}${response.data.files[0]}`;
            const { state } = view;
            const node = state.schema.nodes.image.create({
                src: imageUrl,
                alt: file.name
            });
            // 使用事务插入图片
            const selectionPos = pos ?? state.selection.from;
            const transaction = state.tr.replaceRangeWith(selectionPos, selectionPos, node);
            view.dispatch(transaction);

            // 手动触发更新确保 v-model 同步
            emit('update:modelValue', editor.value?.getJSON());
        }
    } catch (error) {
        console.error('图片处理失败:', error);
    }
};

/**
 * 统一的文件上传并插入下载链接
 */
const processAndInsertFile = async (view: any, file: File, pos?: number) => {
    try {
        const response = await uploadFiles('message', [file]);
        if (response.success && response.data?.files?.[0]) {
            const fileUrl = `${useRuntimeConfig().public.apiUrl}${response.data.files[0]}`;
            const { state } = view;
            const linkMark = state.schema.marks.link?.create({
                href: fileUrl,
                download: file.name,
                class: 'file-link',
                title: file.name
            });
            const textNode = state.schema.text(`文件: ${file.name}`, linkMark ? [linkMark] : []);
            const block = state.schema.nodes.paragraph.create(null, textNode);
            const selectionPos = pos ?? state.selection.from;
            const transaction = state.tr.replaceRangeWith(selectionPos, selectionPos, block);
            view.dispatch(transaction);
            emit('update:modelValue', editor.value?.getJSON());
        }
    } catch (error) {
        console.error('文件处理失败:', error);
    }
};

/**
 * 处理文件下载
 */
const handleFileDownload = async (url: string, fileName: string) => {
    const confirmed = await dialog.confirm({
        title: '下载文件',
        content: `确认下载 ${fileName} 吗？`,
        type: 'info'
    });
    if (!confirmed) return;

    try {
        const result = await downloadFile({
            source: { url },
            target: { fileName }
        });
        if (!result.success) {
            toast.error(result.error || '下载失败');
        } else {
            toast.success('下载完成');
        }
    } catch (error: any) {
        toast.error(error?.message || '下载失败');
    }
};

// --- 编辑器事件处理 ---
const handlePaste = (view: any, event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return false;

    let handled = false;
    for (const item of items) {
        const file = item.kind === 'file' ? item.getAsFile() : null;
        if (!file) continue;
        if (file.type.indexOf('image') === 0) {
            handled = true;
            processAndInsertImage(view, file);
            continue;
        }
        handled = true;
        processAndInsertFile(view, file);
    }
    return handled;
};

const handleDrop = (view: any, event: DragEvent) => {
    isDragOver.value = false;
    dragCounter.value = 0;

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return false;

    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const otherFiles = Array.from(files).filter(f => !f.type.startsWith('image/'));
    if (imageFiles.length > 0 || otherFiles.length > 0) {
        event.preventDefault();
        const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
        const pos = coordinates ? coordinates.pos : view.state.selection.from;

        for (const file of imageFiles) {
            processAndInsertImage(view, file, pos);
        }
        for (const file of otherFiles) {
            processAndInsertFile(view, file, pos);
        }
        return true;
    }
    return false;
};

// --- 拖拽 UI 控制 ---
const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    dragCounter.value++;
    isDragOver.value = true;
};

const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    dragCounter.value--;
    if (dragCounter.value <= 0) {
        dragCounter.value = 0;
        isDragOver.value = false;
    }
};

// --- 编辑器初始化 ---
const editor = useEditorWithImageUpload({
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
        handleDOMEvents: {
            click: (view, event) => {
                const target = event.target as HTMLElement | null;
                const link = target?.closest('a.file-link, a[href*="/uploads/"]') as HTMLAnchorElement | null;
                if (!link) return false;
                event.preventDefault();
                event.stopPropagation();
                const url = link.getAttribute('href') || '';
                const fileName = link.getAttribute('title') || link.textContent || '文件';
                if (!url) return true;
                handleFileDownload(url, fileName);
                return true;
            }
        },
        handleClick: (view, pos, event) => {
            const target = event.target as HTMLElement | null;
            const link = target?.closest('a.file-link, a[href*="/uploads/"]') as HTMLAnchorElement | null;
            if (!link) return false;
            event.preventDefault();
            event.stopPropagation();
            const url = link.getAttribute('href') || '';
            const fileName = link.getAttribute('title') || link.textContent || '文件';
            if (!url) return true;
            handleFileDownload(url, fileName);
            return true;
        },
        handlePaste,
        handleDrop,
    },
    onUpdate: ({ editor }) => {
        emit('update:modelValue', editor.getJSON());
        emit('textChange', editor.getText());
    },
}, async (file) => {
    const response = await uploadFiles('message', [file]);
    return `${useRuntimeConfig().public.apiUrl}${response?.data?.files[0]}`;
});

// --- 外部操作 API 暴露 ---

/**
 * 清空内容
 */
const clear = () => {
    editor.value?.commands.clearContent();
};

/**
 * 设置焦点
 */
const focus = () => {
    editor.value?.commands.focus();
};

/**
 * 插入文本内容
 */
const insertContent = (content: string | object) => {
    editor.value?.chain().focus().insertContent(content).run();
};

/**
 * 设置完整内容
 */
const setContent = (content: any) => {
    editor.value?.commands.setContent(content);
};

/**
 * 获取当前编辑器实例，允许父组件直接调用 Tiptap 原生 API
 */
defineExpose({
    editor,             // 暴露原始实例
    clear,              // 清空
    focus,              // 聚焦
    processAndInsertImage, // 图片插入
    processAndInsertFile,  // ????
    insertContent,      // 插入内容
    setContent          // 替换内容
});

onBeforeUnmount(() => {
    editor.value?.destroy();
});
</script>

<template>
    <div class="w-full relative min-h-[44px] editor-container" :class="{ 'drag-over': isDragOver }"
        @dragenter="onDragEnter" @dragover.prevent @dragleave="onDragLeave" @drop="isDragOver = false">

        <editor-content :editor="editor" />

        <!-- 拖拽提示层 -->
        <div v-show="isDragOver"
            class="absolute inset-0 bg-primary/10 backdrop-blur-sm flex items-center justify-center rounded-lg border-2 border-dashed border-primary z-50 pointer-events-none">
            <div class="flex items-center gap-2 text-primary font-medium">
                <Icon name="mingcute:add-line" size="24" />
                <span>释放鼠标上传图片</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
:deep(.ProseMirror img) {
    max-width: 100% !important;
    height: auto !important;
    border-radius: 8px;
    border: 1px solid hsl(var(--bc) / 0.1);
    margin: 8px 0;
    display: block !important;
    box-sizing: border-box;
}

:deep(.ProseMirror img[loading]) {
    opacity: 0.5;
}

:deep(.ProseMirror p:has(img)) {
    margin: 8px 0;
}

:deep(.ProseMirror) {
    outline: none;
    padding: 4px;
    min-height: 40px;
    max-height: 192px;
    overflow-y: auto;
}

:deep(.ProseMirror a.file-link) {
    display: flex;
    align-items: center;
    justify-content: flex-start;
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

:deep(.ProseMirror a.file-link::before) {
    content: '📎';
}

:deep(.ProseMirror a.file-link:hover) {
    background: linear-gradient(135deg, hsl(var(--b3)) 0%, hsl(var(--b2)) 100%);
    border-color: hsl(var(--bc) / 0.2);
}

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: #adb5bd;
    pointer-events: none;
    height: 0;
}

.drag-over {
    border-color: hsl(var(--primary)) !important;
    background-color: hsl(var(--primary) / 0.05) !important;
}

.editor-container {
    position: relative;
    transition: all 0.2s ease;
}

.editor-container :deep(.ProseMirror) {
    pointer-events: auto;
}
</style>
