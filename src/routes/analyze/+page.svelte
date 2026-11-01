<script lang="ts">
  import { page } from '$app/state';
  import Analysis from '#lib/components/Analysis.svelte';

  const VIEWS = ['report', 'proposals', 'files', 'history'] as const;
  const initialPath = $derived(page.url.searchParams.get('path') ?? '');
  const initialView = $derived(VIEWS.find((v) => v === page.url.searchParams.get('view')) ?? 'report');
</script>

{#key page.url.search}
  <Analysis {initialPath} {initialView} />
{/key}
