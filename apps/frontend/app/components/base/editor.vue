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

// 拖拽状态
const isDragOver = ref(false);
const dragCounter = ref(0);

// 统一的图片上传处理逻辑
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
            // 插入图片并分发事务
            const transaction = state.tr.insert(pos ?? state.selection.from, node);
            view.dispatch(transaction);

            // 确保 v-model 更新
            emit('update:modelValue', editor.value?.getJSON());
        }
    } catch (error) {
        console.error('图片处理失败:', error);
    }
};

// 处理粘贴图片
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
    return imageFound; // 如果处理了图片，则阻止默认粘贴
};

// 处理拖拽投放
const handleDrop = (view: any, event: DragEvent) => {
    isDragOver.value = false;
    dragCounter.value = 0;

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return false;

    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length > 0) {
        event.preventDefault();

        // 获取释放位置的坐标
        const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
        const pos = coordinates ? coordinates.pos : view.state.selection.from;

        for (const file of imageFiles) {
            processAndInsertImage(view, file, pos);
        }
        return true; // 阻止默认浏览器打开行为
    }
    return false;
};

// 容器拖拽事件处理（仅控制 UI 状态）
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

const onDropContainer = (e: DragEvent) => {
    // 重置 UI 状态，实际逻辑由编辑器 handleDrop 处理
    isDragOver.value = false;
    dragCounter.value = 0;
};

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

const clear = () => {
    editor.value?.commands.clearContent();
};

defineExpose({ clear });

onBeforeUnmount(() => {
    editor.value?.destroy();
});
</script>

<template>
    <div class="w-full relative min-h-[44px] editor-container" :class="{ 'drag-over': isDragOver }"
        @dragenter="onDragEnter" @dragover.prevent @dragleave="onDragLeave" @drop="onDropContainer">

        <editor-content :editor="editor" />

        <!-- 关键修复：添加 pointer-events-none，防止此遮罩层拦截 drop 事件 -->
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
/* 原有样式保持不变 */
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