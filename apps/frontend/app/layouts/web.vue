<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const route = useRoute()
const appTheme = AppTheme.getInstance()
const isMicaActive = computed(() => isTauri() && appTheme.getIsBgTransparent().value)
const scrollerRef = ref<HTMLElement | null>(null)

const setupScrollReveal = () => {
  const scroller = scrollerRef.value
  if (!scroller) return

  ScrollTrigger.getAll().forEach(trigger => trigger.kill())

  const revealElements = gsap.utils.toArray<HTMLElement>('[data-web-reveal]')
  revealElements.forEach((element, index) => {
    gsap.set(element, {
      autoAlpha: 0,
      y: 24,
      willChange: 'transform, opacity',
    })

    gsap.fromTo(
      element,
      {
        autoAlpha: 0,
        y: 24,
      },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.65,
        ease: 'power2.out',
        delay: Math.min(index * 0.015, 0.12),
        onComplete: () => {
          element.style.willChange = 'auto'
        },
        scrollTrigger: {
          trigger: element,
          scroller,
          start: 'top 90%',
          once: true,
          fastScrollEnd: true,
        },
      },
    )
  })

  ScrollTrigger.refresh()
}

const initWebMotion = async () => {
  if (!import.meta.client) return
  await nextTick()
  setupScrollReveal()
}

onMounted(async () => {
  gsap.registerPlugin(ScrollTrigger)
  await initWebMotion()
})

watch(() => route.fullPath, async () => {
  await initWebMotion()
})

onBeforeUnmount(() => {
  ScrollTrigger.getAll().forEach(trigger => trigger.kill())
})
</script>

<template>
  <div class="flex h-screen w-full flex-col overflow-hidden text-base-content" :class="isMicaActive ? 'bg-transparent' : 'bg-base-100'">
    <LayoutWebTopNav />
    <div ref="scrollerRef" class="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
      <slot />
    </div>
  </div>
</template>
