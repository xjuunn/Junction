<template>
    <div class="flex items-center justify-center overflow-hidden bg-neutral text-neutral-content shrink-0"
        :class="radiusClass" :style="{
            width: size + 'px',
            height: size + 'px',
            borderRadius: radiusStyle
        }">
        <img v-if="src" :src="src" class="object-cover w-full h-full" :style="{ borderRadius: radiusStyle }" />

        <span v-else class="font-medium">
            {{ displayText }}
        </span>
    </div>
</template>

<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        src?: string | null
        text?: string | null
        size?: number
        radius?: number | 'full'
        placeholderLength?: number
    }>(),
    {
        src: null,
        text: '',
        size: 40,
        radius: 'full',
        placeholderLength: 1
    }
)

const displayText = computed(() =>
    props.text?.slice(0, props.placeholderLength).toUpperCase() ?? ''
)

const radiusStyle = computed(() =>
    props.radius === 'full' ? '9999px' : props.radius + 'px'
)

const radiusClass = computed(() =>
    props.radius === 'full' ? 'rounded-full' : ''
)
</script>
