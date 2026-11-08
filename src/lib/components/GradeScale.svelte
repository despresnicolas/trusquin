<script lang="ts">
  import { t } from '#lib/i18n.svelte.ts';
  import { GRADES } from '#lib/core/analyze.ts';

  // Façon Nutri-Score : les cinq lettres côte à côte, celle de `grade` mise en avant.
  let { grade }: { grade?: string } = $props();
</script>

<div class="scale" role="img" aria-label={grade ? t('grade.label', { grade }) : t('grade.scale')}>
  {#each GRADES as g, i (g.grade)}
    <span class="cell">
      <b class="letter {g.grade.toLowerCase()}" class:on={g.grade === grade}>{g.grade}</b>
      <small class="muted">{i ? `${g.min}–${GRADES[i - 1].min - 1}` : `${g.min}+`}</small>
    </span>
  {/each}
</div>

<style>
  .scale {
    display: inline-grid;
    grid-template-columns: repeat(5, auto);
    align-items: center;
    padding: 6px;
    border-radius: 14px;
    background: var(--surface);
    border: 1px solid var(--border);
  }
  .cell {
    display: grid;
    gap: 4px;
    justify-items: center;
  }
  .letter {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    color: var(--on-accent);
    font-size: 20px;
    opacity: 0.85;
  }
  .a {
    background: var(--grade-a);
    border-radius: 10px 0 0 10px;
  }
  .b {
    background: var(--grade-b);
  }
  .c {
    background: var(--grade-c);
    color: var(--on-grade-light);
  }
  .d {
    background: var(--grade-d);
  }
  .e {
    background: var(--grade-e);
    border-radius: 0 10px 10px 0;
  }
  .on {
    position: relative;
    z-index: 1;
    width: 52px;
    height: 52px;
    margin: -6px -6px;
    border: 3px solid var(--surface);
    border-radius: 12px;
    font-size: 28px;
    opacity: 1;
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.25);
  }
  small {
    font-size: 11px;
  }
</style>
