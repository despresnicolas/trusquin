<script lang="ts">
  import Preview from '#lib/components/Preview.svelte';
  import { store } from '#lib/state.svelte.ts';
</script>

<Preview files={store.files} quality={store.quality} />
