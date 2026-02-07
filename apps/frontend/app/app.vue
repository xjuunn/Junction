<template>
  <client-only class="w-screen h-screen overflow-hidden select-none">
    <base-toast />
    <base-dialog />
    <base-context-menu />
    <nuxt-layout>
      <nuxt-page />
    </nuxt-layout>
    <!-- <debug-logger></debug-logger> -->
  </client-only>
</template>
