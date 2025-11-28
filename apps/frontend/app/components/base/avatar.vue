<template>
    <div class="flex items-center justify-center overflow-hidden bg-neutral text-neutral-content shrink-0 transition-all"
        :class="[radiusClass, sizeClass]" :style="customStyle">
        <img v-if="src" :src="src" class="object-cover w-full h-full" :style="{ borderRadius: radiusStyle }"
            alt="avatar" />
        <span v-else class="font-medium whitespace-nowrap select-none">
            {{ displayText }}
        </span>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
    src?: string | null
    text?: string | null
    size?: number | string
    width?: number | string
    height?: number | string
    radius?: number | 'full'
    placeholderLength?: number
}

const props = withDefaults(defineProps<Props>(), {
    src: null,
    text: '',
    radius: 'full',
    placeholderLength: 1
})

const displayText = computed(() =>
    props.text?.slice(0, props.placeholderLength).toUpperCase() ?? ''
)

const formatSize = (val: number | string) =>
    typeof val === 'number' ? `${val}px` : val

const customStyle = computed(() => {
    const style: Record<string, string> = {}

    if (props.radius !== 'full') {
        style.borderRadius = `${props.radius}px`
    }

    if (props.size !== undefined) {
        const s = formatSize(props.size)
        style.width = s
        style.height = s
    } else {
        if (props.width !== undefined) style.width = formatSize(props.width)
        if (props.height !== undefined) style.height = formatSize(props.height)
    }

    return style
})

const sizeClass = computed(() => {
    if (props.size === undefined && props.width === undefined && props.height === undefined) {
        return 'w-10 h-10'
    }
    return ''
})

const radiusStyle = computed(() =>
    props.radius === 'full' ? '9999px' : `${props.radius}px`
)

const radiusClass = computed(() =>
    props.radius === 'full' ? 'rounded-full' : ''
)
</script>