<script setup lang="ts">
definePageMeta({
  middleware: [
    'admin',
    function () {
      return navigateTo('/admin/overview')
    }
  ],
  layout: 'admin'
})
</script>

<template>
  <div></div>
</template>
