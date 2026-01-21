<script setup lang="ts">
import { EditorContent } from '@tiptap/vue-3'
import { useEditorWithImageUpload } from '../../core/editor'
import { uploadFiles } from '../../api/upload'

const props = defineProps<{
    modelValue: any;
    placeholder?: string;
    disabled?: boolean;
    enableImageUpload?: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'send', 'textChange']);

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
            const transaction = state.tr.insert(pos ?? state.selection.from, node);
            view.dispatch(transaction);

            // 手动触发更新确保 v-model 同步
            emit('update:modelValue', editor.value?.getJSON());
        }
    } catch (error) {
        console.error('图片处理失败:', error);
    }
};

// --- 编辑器事件处理 ---
const handlePaste = (view: any, event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return false;

    let imageFound = false;
    for (const item of items) {
        if (item.type.indexOf('image') === 0) {
            const file = item.getAsFile();
            if (file) {
                imageFound = true;
                processAndInsertImage(view, file);
            }
        }
    }
    return imageFound;
};

const handleDrop = (view: any, event: DragEvent) => {
    isDragOver.value = false;
    dragCounter.value = 0;

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return false;

    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length > 0) {
        event.preventDefault();
        const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
        const pos = coordinates ? coordinates.pos : view.state.selection.from;

        for (const file of imageFiles) {
            processAndInsertImage(view, file, pos);
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