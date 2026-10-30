<script lang="ts">
  import { page } from '$app/state';
  import RulesEditor from '#lib/components/RulesEditor.svelte';

  const initial = $derived(page.url.searchParams.get('rule') ?? '');
</script>

{#key initial}
  <RulesEditor {initial} />
{/key}
