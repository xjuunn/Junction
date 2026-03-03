<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()

const goConnectionSettings = () => {
  navigateTo(
    {
      path: '/settings/connection',
      query: {
        reason: String(route.query.reason || 'unreachable'),
        from: String(route.query.from || '/'),
      },
    },
    { replace: true },
  )
}
</script>

<template>
  <div class="relative min-h-full overflow-hidden bg-transparent">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute -top-24 left-[8%] h-72 w-72 rounded-full bg-error/12 blur-3xl"></div>
      <div class="absolute right-[6%] top-[28%] h-80 w-80 rounded-full bg-warning/12 blur-3xl"></div>
      <div class="absolute bottom-[-15%] left-[28%] h-64 w-64 rounded-full bg-base-content/8 blur-3xl"></div>
    </div>

    <div class="relative mx-auto flex min-h-full w-full max-w-3xl items-center justify-center px-4 py-10">
      <section class="w-full rounded-3xl border border-base-content/10 bg-base-100/72 p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl md:p-10">
        <div class="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-error/25 bg-error/10 text-error">
          <Icon name="mingcute:wifi-off-line" size="30" />
        </div>

        <h1 class="mt-6 text-3xl font-semibold tracking-tight text-base-content">网络信号丢失</h1>
        <p class="mx-auto mt-3 max-w-xl text-sm leading-6 text-base-content/65 md:text-base">
          当前设备与后端服务连接超时，应用已进入保护状态。请检查网络或更新服务地址后继续使用。
        </p>

        <div class="mt-8 flex justify-center">
          <button class="btn btn-primary rounded-xl px-7" @click="goConnectionSettings">
            设置连接
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
