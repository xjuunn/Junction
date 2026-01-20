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

// 创建图片上传处理函数
const imageUploadHandler = async (file: File): Promise<string> => {
    try {
        console.log('开始上传图片文件:', file.name, file.size);

        // 使用统一的upload API
        const response = await uploadFiles('message', [file]);

        console.log('上传响应:', response);

        if (response.success && response.data?.files?.[0]) {
            const imageUrl = `${useRuntimeConfig().public.apiUrl}${response.data.files[0]}`;
            console.log('图片上传成功，URL:', imageUrl);
            return imageUrl;
        }

        throw new Error(response.error || '上传失败');
    } catch (error: any) {
        console.error('图片上传失败:', error);
        throw error;
    }
};

// 处理粘贴图片
const handlePaste = async (view: any, event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return false;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if(item)
        if (item.type.indexOf('image') === 0) {
            event.preventDefault();

            const file = item.getAsFile();
            if (file) {
                try {
                    const imageUrl = await imageUploadHandler(file);
                    const { state } = view;
                    const { tr } = state;
                    const node = state.schema.nodes.image.create({
                        src: imageUrl,
                        alt: '粘贴的图片',
                        title: '图片'
                    });

                    const transaction = tr.insert(state.selection.from, node);
                    view.dispatch(transaction);
                    // 更新v-model
                    const currentContent = editor.value?.getJSON();
                    if (currentContent) {
                        emit('update:modelValue', currentContent);
                    }

                    return true;
                } catch (error) {
                    console.error('粘贴图片上传失败:', error);
                }
            }
        }
    }

    return false;
};

const editor = useEditorWithImageUpload({
    content: props.modelValue,
    placeholder: props.placeholder,
    editable: !props.disabled,
    enableImageUpload: true,
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
        handlePaste: handlePaste,
    },
    onUpdate: ({ editor }) => {
        const jsonContent = editor.getJSON();
        const htmlContent = editor.getHTML();
        console.log('编辑器内容更新:', { json: jsonContent, html: htmlContent });
        emit('update:modelValue', jsonContent);
        emit('textChange', editor.getText());
    },
}, imageUploadHandler);

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

<style scoped>
/* 确保编辑器中的图片正确显示 */
:deep(.ProseMirror img) {
    max-width: 100% !important;
    height: auto !important;
    border-radius: 8px;
    border: 1px solid hsl(var(--bc) / 0.1);
    margin: 8px 0;
    display: block !important;
    box-sizing: border-box;
}

/* 图片加载状态 */
:deep(.ProseMirror img[loading]) {
    opacity: 0.5;
}

/* 确保图片容器正确显示 */
:deep(.ProseMirror p:has(img)) {
    margin: 8px 0;
}

/* 编辑器内容区域样式 */
:deep(.ProseMirror) {
    outline: none;
    padding: 4px;
    min-height: 40px;
    max-height: 192px;
    overflow-y: auto;
}

/* 确保图片在拖拽时有视觉反馈 */
:deep(.ProseMirror img:hover) {
    border-color: hsl(var(--bc) / 0.3);
}

/* 全局图片样式 */
.editor-image {
    max-width: 100% !important;
    height: auto !important;
    display: block !important;
    margin: 8px 0 !important;
    border-radius: 8px !important;
    border: 1px solid hsl(var(--bc) / 0.1) !important;
}

/* 确保图片在拖拽时有视觉反馈 */
:deep(.ProseMirror img:hover) {
    border-color: hsl(var(--bc) / 0.3);
}
</style>