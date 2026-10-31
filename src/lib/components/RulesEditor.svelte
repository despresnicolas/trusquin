<script lang="ts">
  import { KIND_LABELS, SCOPE_LABELS, newRule } from '../core/presets';
  import type { Project } from '../core/types';
  import { CONFIG_FILE, download } from '../export';
  import { store } from '../state.svelte';
  import RuleForm from './RuleForm.svelte';
  import { untrack } from 'svelte';

  let { initial = '' }: { initial?: string } = $props();

  let selectedId = $state(untrack(() => initial) || store.project.rules[0]?.id || '');
  const project = $derived(store.project);
  const files = $derived(store.files);
  const quality = $derived(store.quality);
  const selected = $derived(project.rules.find((r) => r.id === selectedId));
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

  async function importConfig(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      store.project = JSON.parse(await file.text()) as Project;
      selectedId = store.project.rules[0]?.id ?? '';
    } catch {
      alert(`${file.name} n'est pas un ${CONFIG_FILE} valide.`);
    }
  }
</script>

<div class="layout">
  <aside>
    <div class="card project">
      <label>Nom du projet<input bind:value={project.name} /></label>
      <label>Description (le quoi, en une phrase)<textarea rows="2" bind:value={project.description}></textarea></label>
      <label>Stack<input bind:value={project.stack} placeholder="SvelteKit, Fastify, PostgreSQL, pnpm" /></label>
      <label class="check"
        ><input type="checkbox" bind:checked={project.useAgentsMd} /> Écrire dans AGENTS.md (multi-outils) + import dans CLAUDE.md</label
      >
      <details>
        <summary>Permissions</summary>
        <label
          >Autoriser (une par ligne)
          <textarea
            rows="3"
            value={project.permissions.allow.join('\n')}
            oninput={(e) =>
              (project.permissions.allow = e.currentTarget.value
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean))}></textarea>
        </label>
        <label
          >Refuser (une par ligne)
          <textarea
            rows="3"
            value={project.permissions.deny.join('\n')}
            oninput={(e) =>
              (project.permissions.deny = e.currentTarget.value
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean))}></textarea>
        </label>
      </details>
    </div>

    <ul class="list">
      {#each project.rules as rule (rule.id)}
        {@const n = issuesFor(rule.id)}
        <li>
          <button
            class:active={rule.id === selectedId}
            class:off={!rule.enabled}
            onclick={() => (selectedId = rule.id)}
          >
            <span class="title">{rule.title || rule.name || 'Sans titre'}</span>
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

    <div class="actions">
      <button onclick={() => download(CONFIG_FILE, JSON.stringify($state.snapshot(project), null, 2))}
        >Sauver {CONFIG_FILE}</button
      >
      <label class="file">Charger un {CONFIG_FILE}<input type="file" accept=".json" onchange={importConfig} /></label>
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
    grid-template-columns: minmax(260px, 340px) 1fr;
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 800px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }
  aside {
    display: grid;
    gap: 12px;
  }
  .project {
    display: grid;
    gap: 10px;
  }
  .check {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .check input {
    width: auto;
  }
  summary {
    cursor: pointer;
    color: var(--muted);
    font-size: 12px;
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
  .file {
    border: 1px dashed var(--border);
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
    color: var(--text);
    font-size: 14px;
  }
  .file input {
    display: none;
  }
</style>
