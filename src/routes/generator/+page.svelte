<script lang="ts">
  import { page } from '$app/state';
  import Generator from '#lib/components/Generator.svelte';
  import { isGoal } from '#lib/goals.ts';

  const initial = $derived(page.url.searchParams.get('rule') ?? '');
  const VIEWS = ['start', 'guide', 'project', 'rules', 'export', 'history'] as const;
  const view = $derived(VIEWS.find((v) => v === page.url.searchParams.get('view')) ?? (initial ? 'rules' : 'start'));
  const param = $derived(page.url.searchParams.get('goal'));
  const goal = $derived(isGoal(param) ? param : undefined);
</script>

<Generator {initial} {view} {goal} />
