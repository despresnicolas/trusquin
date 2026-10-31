<script lang="ts">
  import { page } from '$app/state';
  import Generator from '#lib/components/Generator.svelte';

  const initial = $derived(page.url.searchParams.get('rule') ?? '');
  const view = $derived(page.url.searchParams.get('view') === 'export' ? 'export' : 'rules');
</script>

<Generator {initial} {view} />
