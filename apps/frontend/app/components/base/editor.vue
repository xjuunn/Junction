<script setup lang="ts">
import { EditorContent } from '@tiptap/vue-3'
import { Mention } from '@tiptap/extension-mention'
import { mergeAttributes } from '@tiptap/core'
import { useEditorWithImageUpload } from '../../core/editor'
import { uploadFiles } from '../../api/upload'
import { downloadFile, findExistingDownloadPath, openLocalDirForFile, openLocalPath } from '~/utils/download'
import { isTauri } from '~/utils/check'
import { resolveAssetBaseUrl } from '~/utils/backend-endpoint'

type MentionItem = { id: string; name: string; image?: string | null; accountType?: string | null }

const props = defineProps<{
    modelValue: any;
    placeholder?: string;
    disabled?: boolean;
    enableImageUpload?: boolean;
    enableMention?: boolean;
    mentionItems?: MentionItem[];
    mentionTitle?: string;
}>();

const emit = defineEmits(['update:modelValue', 'send', 'textChange']);
const dialog = useDialog();
const toast = useToast();

const mentionItems = computed(() => props.mentionItems ?? []);
const mentionTitle = computed(() => props.mentionTitle || '选择成员');

const buildMentionSuggestion = () => {
    let container: HTMLDivElement | null = null;
    let listEl: HTMLDivElement | null = null;
    let headerEl: HTMLDivElement | null = null;
    let selectedIndex = 0;

    const getItemLabel = (item: MentionItem) => item?.name || item?.id || '未知用户';

    const clear = () => {
        container?.remove();
        container = null;
        listEl = null;
        headerEl = null;
        selectedIndex = 0;
    };

    const position = (clientRect?: DOMRect | null) => {
        if (!container || !clientRect) return;
        const rect = clientRect;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 12;
        const desiredWidth = Math.max(rect.width, 220);
        container.style.minWidth = `${desiredWidth}px`;
        container.style.position = 'fixed';
        const box = container.getBoundingClientRect();
        const estimatedHeight = Math.max(box.height, 120);
        const top = rect.top - estimatedHeight - 10;
        const maxTop = viewportHeight - estimatedHeight - padding;
        const maxLeft = viewportWidth - desiredWidth - padding;
        const left = Math.min(Math.max(rect.left, padding), maxLeft);
        const clampedTop = Math.min(Math.max(top, padding), maxTop);
        container.style.top = `${clampedTop}px`;
        container.style.left = `${left}px`;
    };

    const renderItems = (items: MentionItem[], command: (item: { id: string; label: string }) => void) => {
        if (!listEl) return;
        listEl.innerHTML = '';
        items.forEach((item, index) => {
            const button = document.createElement('button');
            button.type = 'button';
    button.className = 'mention-suggest-item';
    if (index === selectedIndex) {
        button.classList.add('is-active');
    }
            button.innerHTML = `
                <span class="mention-suggest-avatar"></span>
                <span class="mention-suggest-name">${getItemLabel(item)}</span>
                ${item.accountType === 'BOT' ? '<span class="mention-suggest-tag">BOT</span>' : ''}
            `;
            button.onclick = () => command({ id: item.id, label: getItemLabel(item) });
            listEl?.appendChild(button);
        });
    };

    return {
        char: '@',
        allowSpaces: false,
        items: ({ query }: { query: string }) => {
            const keyword = query.trim().toLowerCase();
            const source = mentionItems.value;
            if (!keyword) return source.slice(0, 8);
            return source.filter(item => getItemLabel(item).toLowerCase().includes(keyword)).slice(0, 8);
        },
        render: () => ({
            onStart: (props: any) => {
                selectedIndex = 0;
                container = document.createElement('div');
                container.className = 'mention-suggest bg-base-300 text-base-content border border-base-200';
                headerEl = document.createElement('div');
                headerEl.className = 'mention-suggest-header';
                headerEl.textContent = mentionTitle.value;
                listEl = document.createElement('div');
                listEl.className = 'mention-suggest-list';
                container.appendChild(headerEl);
                container.appendChild(listEl);
                document.body.appendChild(container);
                position(props.clientRect?.());
                renderItems(props.items, props.command);
            },
            onUpdate: (props: any) => {
                if (!container) return;
                position(props.clientRect?.());
                const items = props.items || [];
                if (selectedIndex >= items.length) {
                    selectedIndex = 0;
                }
                renderItems(items, props.command);
            },
            onKeyDown: (props: any) => {
                const items = props.items || [];
                if (!items.length) return false;
                if (props.event.key === 'ArrowDown') {
                    selectedIndex = (selectedIndex + 1) % items.length;
                    renderItems(items, props.command);
                    return true;
                }
                if (props.event.key === 'ArrowUp') {
                    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                    renderItems(items, props.command);
                    return true;
                }
                if (props.event.key === 'Enter') {
                    const item = items[selectedIndex];
                    if (item) {
                        props.command({ id: item.id, label: getItemLabel(item) });
                        return true;
                    }
                }
                if (props.event.key === 'Escape') {
                    return true;
                }
                return false;
            },
            onExit: () => {
                clear();
            }
        })
    };
};

const mentionExtension = props.enableMention ? Mention.configure({
    HTMLAttributes: {
        class: 'mention',
        'data-mention': 'user'
    },
    renderText({ options, node }) {
        return `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`;
    },
    renderHTML({ options, node }) {
        return [
            'a',
            mergeAttributes(
                {
                    href: `/search/user/${node.attrs.id}`,
                    'data-mention-id': node.attrs.id,
                    'data-mention-label': node.attrs.label ?? node.attrs.id,
                    class: 'mention'
                },
                options.HTMLAttributes
            ),
            `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`
        ];
    },
    suggestion: buildMentionSuggestion()
}) : null;

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
            const imageUrl = `${resolveAssetBaseUrl()}${response.data.files[0]}`;
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
            const fileUrl = `${resolveAssetBaseUrl()}${response.data.files[0]}`;
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
    if (isTauri()) {
        const existingPath = await findExistingDownloadPath(fileName, { fileName });
        if (existingPath) {
            const openFile = await dialog.confirm({
                title: '文件已下载',
                content: `检测到 ${fileName} 已下载，请选择操作。`,
                type: 'info',
                confirmText: '打开文件',
                cancelText: '打开目录',
                persistent: true,
                hideCloseButton: true
            });
            if (openFile) {
                try {
                    await openLocalPath(existingPath);
                } catch (error: any) {
                    toast.error(error?.message || '打开文件失败');
                }
            } else {
                try {
                    await openLocalDirForFile(existingPath);
                } catch (error: any) {
                    toast.error(error?.message || '打开目录失败');
                }
            }
            return;
        }
    }
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
    customExtensions: mentionExtension ? [mentionExtension] : [],
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
    return `${resolveAssetBaseUrl()}${response?.data?.files[0]}`;
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
    processAndInsertFile,  // 处理并插入文件
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

:deep(.ProseMirror .mention) {
    color: hsl(var(--p));
    background: hsl(var(--p) / 0.12);
    padding: 0 6px;
    border-radius: 999px;
    text-decoration: none;
    font-weight: 600;
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

:global(.mention-suggest) {
    position: absolute;
    z-index: 60;
    border-radius: 16px;
    box-shadow: 0 16px 32px hsl(var(--bc) / 0.18), 0 2px 6px hsl(var(--bc) / 0.1);
    padding: 12px;
    max-height: 280px;
    overflow: hidden;
    background-clip: padding-box;
}

:global(.mention-suggest-header) {
    font-size: 11px;
    font-weight: 700;
    color: hsl(var(--bc));
    opacity: 0.7;
    padding: 4px 6px 8px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
}

:global(.mention-suggest-list) {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 220px;
    overflow-y: auto;
}

:global(.mention-suggest-item) {
    display: grid;
    grid-template-columns: 20px 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 12px;
    background: transparent;
    width: 100%;
    pointer-events: auto;
    appearance: none;
    border: none;
    cursor: pointer;
    text-align: left;
    color: inherit;
    transition: background 0.15s ease;
}

:global(.mention-suggest-item:hover),
:global(.mention-suggest-item.is-active) {
    background: hsl(var(--b2));
}

:global(.mention-suggest-avatar) {
    width: 20px;
    height: 20px;
    border-radius: 6px;
    background: hsl(var(--b2));
    display: inline-block;
}

:global(.mention-suggest-name) {
    font-size: 13px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

:global(.mention-suggest-tag) {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 2px 6px;
    border-radius: 999px;
    background: hsl(var(--p));
    color: hsl(var(--pc));
}
</style>
