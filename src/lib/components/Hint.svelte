<script lang="ts">
  // Infobulle de conseil : au survol et au focus clavier ; lue par les lecteurs d'écran via aria-label.
  let { text }: { text: string } = $props();

  const WIDTH = 300;
  let anchor: HTMLElement;
  let open = $state(false);
  let pos = $state({ top: 0, left: 0, width: WIDTH, above: true });

  // Position fixe calculée à l'ouverture : échappe au rognage des modales et reste dans l'écran.
  function show() {
    const r = anchor.getBoundingClientRect();
    const width = Math.min(WIDTH, innerWidth - 16);
    const left = Math.min(Math.max(8, r.left + r.width / 2 - width / 2), innerWidth - width - 8);
    const above = r.top > 140;
    pos = { top: above ? r.top - 8 : r.bottom + 8, left, width, above };
    open = true;
  }
</script>

<!-- Focusable pour que l'infobulle s'ouvre aussi au clavier (motif « tooltip » WAI-ARIA). -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<span
  bind:this={anchor}
  class="hint"
  tabindex="0"
  role="img"
  aria-label="Aide : {text}"
  onmouseenter={show}
  onmouseleave={() => (open = false)}
  onfocus={show}
  onblur={() => (open = false)}
  onkeydown={(e) => {
    if (e.key === 'Escape') open = false;
  }}
  >?{#if open}<span
      class="tip"
      class:above={pos.above}
      aria-hidden="true"
      style="top: {pos.top}px; left: {pos.left}px; width: {pos.width}px">{text}</span
    >{/if}</span
>

<style>
  .hint {
    display: inline-grid;
    place-items: center;
    width: 16px;
    height: 16px;
    border: 1px solid var(--border);
    border-radius: 50%;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    color: var(--muted);
    cursor: help;
    vertical-align: middle;
  }
  .hint:hover,
  .hint:focus-visible {
    color: var(--accent);
    border-color: var(--accent);
    outline: none;
  }
  .tip {
    position: fixed;
    z-index: 1000;
    padding: 8px 10px;
    background: var(--text);
    color: var(--bg);
    border-radius: 6px;
    box-shadow: 0 4px 16px rgb(0 0 0 / 0.2);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.45;
    text-align: left;
    white-space: normal;
    pointer-events: none;
  }
  .tip.above {
    transform: translateY(-100%);
  }
</style>
