<script setup lang="ts">
import { h, type Component, type VNode } from 'vue';

/**
 * 节点映射表
 */
const nodeMap: Record<string, string | Component> = {
    doc: 'div',
    paragraph: 'p',
    text: 'span',
    bold: 'strong',
    italic: 'em',
    strike: 's',
    underline: 'u',
    code: 'code',
    blockquote: 'blockquote',
    bulletList: 'ul',
    orderedList: 'ol',
    listItem: 'li',
    // 可在此扩展自定义组件，如提及、表情、图片等
    mention: 'span',
};

/**
 * 样式映射表
 */
const classMap: Record<string, string> = {
    paragraph: 'leading-relaxed mb-1 last:mb-0',
    blockquote: 'border-l-4 border-primary/20 pl-3 italic opacity-80',
    code: 'bg-base-300 px-1.5 py-0.5 rounded text-sm font-mono',
    mention: 'text-primary font-bold cursor-pointer hover:underline',
};

const props = defineProps<{
    node: any;
}>();

/**
 * 递归渲染 Tiptap 节点
 */
const renderNode = (node: any): VNode | string | null => {
    if (!node) return null;

    if (node.type === 'text') {
        let text: VNode | string = node.text || '';

        if (node.marks) {
            node.marks.forEach((mark: any) => {
                const markTag = nodeMap[mark.type] || 'span';
                text = h(markTag as any, {}, { default: () => text });
            });
        }
        return text;
    }

    const tag = nodeMap[node.type] || 'div';
    const children = node.content ? node.content.map(renderNode) : [];

    return h(tag as any, {
        class: [classMap[node.type] || '', node.attrs?.class || ''].join(' '),
        ...node.attrs
    }, {
        default: () => children
    });
};

/**
 * 渲染函数包装
 */
const ContentRenderer = () => renderNode(props.node);
</script>

<template>
    <div class="tiptap-content">
        <ContentRenderer />
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