<script setup lang="ts">
import { computed } from 'vue'

import NoteEditorView from '../../components/notes/NoteEditorView.vue'

const route = useRoute()
const noteId = computed(() => {
  const routeId = route.params.id
  return Array.isArray(routeId) ? routeId[0] ?? '' : routeId
})

</script>

<template>
  <NoteEditorView :note-id="noteId" />
</template>
