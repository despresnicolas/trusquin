<script lang="ts">
  import Analysis from '#lib/components/Analysis.svelte';
  import Quality from '#lib/components/Quality.svelte';
  import { store } from '#lib/state.svelte.ts';
</script>

<Analysis />

<section id="qualite">
  <h2>Qualité de l'export</h2>
  <Quality quality={store.quality} />
</section>

<style>
  section {
    margin-top: 32px;
    scroll-margin-top: 72px;
  }
  h2 {
    margin: 0 0 12px;
    font-size: 18px;
  }
</style>
