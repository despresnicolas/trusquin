<script lang="ts">
  let { score, label = '', size = 'sm' }: { score: number; label?: string; size?: 'sm' | 'lg' } = $props();
  const tone = $derived(score >= 85 ? 'ok' : score >= 60 ? 'warn' : 'err');
</script>

<span class="badge {tone} {size}">
  <b>{score}</b><small>/100</small>
  {#if label}<em>{label}</em>{/if}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
    padding: 2px 10px;
    border-radius: 99px;
    border: 1px solid currentColor;
  }
  .badge.lg {
    font-size: 28px;
    padding: 6px 18px;
  }
  .badge small {
    font-size: 0.7em;
    opacity: 0.7;
  }
  .badge em {
    font-style: normal;
    margin-left: 8px;
    font-weight: 700;
  }
  .ok {
    color: var(--ok);
  }
  .warn {
    color: var(--warn);
  }
  .err {
    color: var(--err);
  }
</style>
