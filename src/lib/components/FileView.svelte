<script lang="ts">
  import { highlight } from '#lib/highlight.ts';

  let { path, content }: { path: string; content: string } = $props();
  const lines = $derived(highlight(path, content));
</script>

<pre>{#each lines as line}<span class="line {line.cls ?? ''}"
      ><span
        >{#each line.parts as p}{#if p.cls}<span class={p.cls}>{p.text}</span>{:else}{p.text}{/if}{/each}</span
      ></span
    >{/each}</pre>

<style>
  pre {
    background: var(--surface-2);
    border: 1px solid var(--border);
    padding: 12px 14px 12px 0;
    border-radius: 6px;
    max-height: 70vh;
    overflow: auto;
    font-size: 13px;
    line-height: 1.55;
    tab-size: 2;
    counter-reset: line;
  }
  .line {
    display: grid;
    grid-template-columns: 3.5em 1fr;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .line::before {
    counter-increment: line;
    content: counter(line);
    padding-right: 12px;
    margin-right: 12px;
    text-align: right;
    color: var(--muted);
    border-right: 1px solid var(--border);
    user-select: none;
  }
  .line:hover {
    background: var(--accent-soft);
  }
  /* Coloration produite par highlight.ts */
  .fm,
  .block {
    background: var(--surface);
  }
  .heading {
    font-weight: 700;
  }
  .quote {
    color: var(--muted);
    font-style: italic;
  }
  pre :global(.mark) {
    color: var(--accent);
  }
  pre :global(.key) {
    color: var(--info);
  }
  pre :global(.string),
  pre :global(.value) {
    color: var(--ok);
  }
  pre :global(.code) {
    color: var(--warn);
  }
  pre :global(.strong) {
    font-weight: 700;
  }
  pre :global(.import) {
    color: var(--info);
    text-decoration: underline dotted;
  }
  pre :global(.comment) {
    color: var(--muted);
    font-style: italic;
  }
</style>
