<template>
    <ClientOnly>
        <div v-if="showDebugger" class="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            <div ref="ballRef"
                class="absolute w-12 h-12 bg-black/90 dark:bg-white/90 backdrop-blur-md rounded-full shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing pointer-events-auto touch-none select-none will-change-transform"
                @pointerdown="handlePointerDown">
                <span class="text-[10px] font-mono font-bold text-white dark:text-black">LOG</span>
                <span v-if="errorCount > 0"
                    class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] text-white font-bold shadow-sm">
                    {{ errorCount }}
                </span>
            </div>

            <div v-if="isPanelOpen"
                class="fixed inset-0 bg-black/60 pointer-events-auto backdrop-blur-sm flex items-center justify-center sm:items-end sm:justify-end sm:p-4"
                @click.self="closePanel">
                <div
                    class="w-full h-[85vh] sm:w-[600px] sm:h-[700px] bg-white dark:bg-[#09090b] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 ring-1 ring-black/5">
                    <div
                        class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur">
                        <h3 class="font-bold text-gray-700 dark:text-gray-200 text-sm tracking-tight">System Logger</h3>
                        <div class="flex gap-2">
                            <button @click="store.clear()"
                                class="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-700 dark:text-gray-300">
                                Clear
                            </button>
                            <button @click="closePanel"
                                class="px-3 py-1.5 text-xs font-medium bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                    <div class="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50 dark:bg-[#0c0c0e] scrollbar-thin">
                        <div v-for="log in logs" :key="log.id"
                            class="p-2.5 rounded-lg bg-white dark:bg-[#151518] shadow-sm border-l-[3px] text-xs font-mono break-all transition-colors hover:bg-gray-50 dark:hover:bg-[#1a1a1d]"
                            :class="{
                                'border-red-500': log.type === 'error',
                                'border-emerald-500': log.type === 'success',
                                'border-blue-500': log.type === 'api',
                                'border-gray-400': log.type === 'info',
                                'border-amber-500': log.type === 'warn',
                            }">
                            <div class="flex justify-between items-center text-gray-400 mb-1.5 text-[10px]">
                                <span
                                    class="uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-gray-100 dark:bg-gray-800/50">{{
                                    log.type }}</span>
                                <span class="opacity-70">{{ log.timestamp }}</span>
                            </div>
                            <div class="text-gray-700 dark:text-gray-300 mb-1 leading-relaxed whitespace-pre-wrap">{{
                                log.message }}</div>
                            <details v-if="log.data" class="group mt-2">
                                <summary
                                    class="cursor-pointer text-blue-500 hover:text-blue-600 text-[10px] select-none flex items-center gap-1 font-medium transition-colors w-fit">
                                    <span class="group-open:rotate-90 transition-transform duration-200">▶</span>
                                    Payload
                                </summary>
                                <div class="mt-2 relative">
                                    <pre
                                        class="p-3 bg-gray-50 dark:bg-black rounded-md border border-gray-100 dark:border-gray-800 overflow-x-auto text-[10px] text-gray-600 dark:text-gray-400 custom-scrollbar">{{ JSON.stringify(log.data, null, 2) }}</pre>
                                </div>
                            </details>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </ClientOnly>
</template>

<script setup lang="ts">
import { useLoggerStore } from '~/stores/logger'

const store = useLoggerStore()
const { logs, showDebugger } = storeToRefs(store)
const errorCount = computed(() => logs.value.filter(l => l.type === 'error').length)

const ballRef = ref<HTMLElement | null>(null)
const isPanelOpen = ref(false)

let x = 0
let y = 0
let vx = 0
let vy = 0
let isDragging = false
let rafId = 0
let lastX = 0
let lastY = 0
let startX = 0
let startY = 0
let lastTime = 0

const FRICTION = 0.92
const BOUNCE = 0.4
const STOP_THRESHOLD = 0.1
const EDGE_PADDING = 10

const updateStyle = () => {
    if (ballRef.value) {
        ballRef.value.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }
}

const constrain = () => {
    if (!ballRef.value) return
    const rect = ballRef.value.getBoundingClientRect()
    const maxX = window.innerWidth - rect.width
    const maxY = window.innerHeight - rect.height

    if (x < 0) {
        x = 0
        vx = -vx * BOUNCE
    } else if (x > maxX) {
        x = maxX
        vx = -vx * BOUNCE
    }

    if (y < 0) {
        y = 0
        vy = -vy * BOUNCE
    } else if (y > maxY) {
        y = maxY
        vy = -vy * BOUNCE
    }
}

const physicsLoop = () => {
    if (isDragging) return

    if (Math.abs(vx) > STOP_THRESHOLD || Math.abs(vy) > STOP_THRESHOLD) {
        x += vx
        y += vy
        vx *= FRICTION
        vy *= FRICTION

        constrain()
        updateStyle()
        rafId = requestAnimationFrame(physicsLoop)
    } else {
        cancelAnimationFrame(rafId)
        vx = 0
        vy = 0
        constrain()
        updateStyle()
    }
}

const onPointerMove = (e: PointerEvent) => {
    if (!isDragging) return
    e.preventDefault()

    const now = performance.now()
    const dt = now - lastTime || 1

    const dx = e.clientX - lastX
    const dy = e.clientY - lastY

    x += dx
    y += dy

    vx = dx
    vy = dy

    lastX = e.clientX
    lastY = e.clientY
    lastTime = now

    updateStyle()
}

const onPointerUp = () => {
    isDragging = false
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)

    const dist = Math.hypot(lastX - startX, lastY - startY)
    if (dist < 5) {
        isPanelOpen.value = !isPanelOpen.value
    } else {
        rafId = requestAnimationFrame(physicsLoop)
    }
}

const handlePointerDown = (e: PointerEvent) => {
    if (!ballRef.value) return

    cancelAnimationFrame(rafId)
    isDragging = true

    ballRef.value.setPointerCapture(e.pointerId)

    startX = e.clientX
    startY = e.clientY
    lastX = e.clientX
    lastY = e.clientY
    lastTime = performance.now()

    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
}

const closePanel = () => {
    isPanelOpen.value = false
}

const handleResize = () => {
    if (!ballRef.value) return
    const rect = ballRef.value.getBoundingClientRect()
    x = Math.min(x, window.innerWidth - rect.width - EDGE_PADDING)
    y = Math.min(y, window.innerHeight - rect.height - EDGE_PADDING)
    x = Math.max(x, EDGE_PADDING)
    y = Math.max(y, EDGE_PADDING)
    updateStyle()
}

watch(showDebugger, async (active) => {
    if (active) {
        await nextTick()
        if (ballRef.value) {
            x = window.innerWidth - ballRef.value.offsetWidth - 20
            y = window.innerHeight - ballRef.value.offsetHeight - 100
            updateStyle()
            window.addEventListener('resize', handleResize)
        }
    } else {
        window.removeEventListener('resize', handleResize)
    }
}, { immediate: true })

onMounted(() => {
    const route = useRoute()
    if (route.query.debug === 'true') {
        store.toggleDebugger(true)
    }
})

onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
    width: 4px;
}

.scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.3);
    border-radius: 20px;
}

.dark .scrollbar-thin::-webkit-scrollbar-thumb {
    background-color: rgba(75, 85, 99, 0.5);
}
</style>