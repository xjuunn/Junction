<script setup lang="ts">
/**
 * 底部输入区域组件，使用 daisyUI fieldset 结构
 * @param modelValue 输入框绑定的值
 * @param disabled 禁用状态
 */
const props = defineProps<{
    modelValue: string;
    disabled?: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'send']);

/**
 * 处理 Enter 键发送逻辑（支持 Shift+Enter 换行）
 * @param e 键盘事件
 */
const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (props.modelValue.trim()) emit('send');
    }
};
</script>

<template>
    <fieldset class="fieldset w-full p-0">
        <div class="flex flex-col gap-2 p-3 bg-base-200/50 focus-within:bg-base-100 focus-within:ring-2 focus-within:ring-primary/10 border border-base-content/5 rounded-2xl transition-all shadow-sm"
            :class="{ 'opacity-50 pointer-events-none': disabled }">
            <textarea :value="modelValue"
                @input="e => emit('update:modelValue', (e.target as HTMLTextAreaElement).value)" @keydown="onKeyDown"
                placeholder="发送消息..." rows="1"
                class="textarea textarea-ghost w-full resize-none focus:outline-none p-0 text-sm leading-relaxed bg-transparent min-h-[44px] max-h-48"></textarea>

            <div class="flex items-center justify-between border-t border-base-content/5 pt-2">
                <div class="flex items-center gap-1">
                    <button class="btn btn-sm btn-circle btn-ghost text-base-content/40 hover:text-primary">
                        <Icon name="mingcute:emoji-line" size="20" />
                    </button>
                    <button class="btn btn-sm btn-circle btn-ghost text-base-content/40 hover:text-primary">
                        <Icon name="mingcute:attachment-line" size="20" />
                    </button>
                </div>

                <button @click="emit('send')" :disabled="!modelValue.trim() || disabled"
                    class="btn btn-sm btn-primary px-5 rounded-xl font-bold shadow-lg shadow-primary/20 transition-transform active:scale-95">
                    发送
                    <Icon name="mingcute:send-plane-fill" size="16" />
                </button>
            </div>
        </div>
    </fieldset>
</template>