<script setup lang="ts">
import { APP_META } from './config/app-meta'

useHead({
  htmlAttrs: {
    lang: 'ru',
  },
  meta: [
    {
      content: APP_META.description,
      name: 'description',
    },
  ],
  title: APP_META.title,
})
</script>

<template>
  <a
    class="skip-link"
    data-testid="skip-link"
    href="#app-main"
  >
    Перейти к основному содержимому
  </a>
  <NuxtPage />
</template>
