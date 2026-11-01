<script lang="ts">
  import { KIND_LABELS, SCOPE_LABELS, newRule } from '../core/presets';
  import { store } from '../state.svelte';
  import RuleForm from './RuleForm.svelte';
  import { untrack } from 'svelte';

  let { initial = '' }: { initial?: string } = $props();

  let selectedId = $state(untrack(() => initial) || store.project.rules[0]?.id || '');
  const project = $derived(store.project);
  const files = $derived(store.files);
  const quality = $derived(store.quality);
  // Repli sur la première règle : après un import ou un nouveau projet, l'ancienne sélection n'existe plus.
  const selected = $derived(project.rules.find((r) => r.id === selectedId) ?? project.rules[0]);
  const issuesFor = (id: string) => quality.issues.filter((i) => i.ruleId === id);

  function add(partial = {}) {
    const rule = newRule(partial);
    project.rules.push(rule);
    selectedId = rule.id;
  }

  function remove(id: string) {
    project.rules = project.rules.filter((r) => r.id !== id);
    selectedId = project.rules[0]?.id ?? '';
  }
</script>

<div class="layout">
  <aside>
    <ul class="list">
      {#each project.rules as rule (rule.id)}
        {@const n = issuesFor(rule.id)}
        <li>
          <button
            class:active={rule.id === selected?.id}
            class:off={!rule.enabled}
            onclick={() => (selectedId = rule.id)}
          >
            <span class="title">{rule.title || rule.name || 'Sans titre'}</span>
            {#if rule.critical && rule.kind === 'rule' && rule.scope === 'project'}<span class="pill">critique</span
              >{/if}
            <span class="pill"
              >{rule.kind === 'rule' ? SCOPE_LABELS[rule.scope].split(' (')[0] : KIND_LABELS[rule.kind]}</span
            >
            {#if n.some((i) => i.severity === 'error')}<span class="sev-error">●</span>
            {:else if n.some((i) => i.severity === 'warning')}<span class="sev-warning">●</span>{/if}
          </button>
        </li>
      {/each}
    </ul>

    <div class="actions">
      <button onclick={() => add()}>+ Règle vide</button>
      <a class="from-pattern" href="/patterns">+ Depuis un pattern</a>
    </div>
  </aside>

  <section>
    {#if selected}
      {#key selected.id}
        <RuleForm rule={selected} {files} issues={issuesFor(selected.id)} onremove={() => remove(selected.id)} />
      {/key}
    {:else}
      <div class="card muted">Ajoute une règle ou pars d'un modèle.</div>
    {/if}
  </section>
</div>

<style>
  .layout {
    display: grid;
    grid-template-columns: minmax(260px, 340px) minmax(0, 1fr);
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 800px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  aside {
    display: grid;
    gap: 12px;
  }
  .list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 4px;
  }
  .list button {
    width: 100%;
    display: flex;
    gap: 8px;
    align-items: center;
    text-align: left;
  }
  .list button.active {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .list button.off {
    opacity: 0.5;
  }
  .title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .actions {
    display: grid;
    gap: 6px;
  }
  .from-pattern {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 10px;
    background: var(--surface);
    color: var(--text);
    text-decoration: none;
  }
</style>
