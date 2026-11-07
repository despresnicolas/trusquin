<script lang="ts">
  import { templateForCriterion } from '#lib/core/presets.ts';
  import type { ClaudeFile, Criterion, RepoAnalysis, Rule } from '#lib/core/types.ts';
  import { api } from '#lib/history.ts';
  import DraftModal from './DraftModal.svelte';
  import FileEditor from './FileEditor.svelte';
  import Hint from './Hint.svelte';

  let {
    root,
    result,
    sent,
    onadd,
    onsaved,
  }: {
    root: string;
    result: RepoAnalysis;
    sent: string[];
    onadd: (criterionId: string, rule: Rule) => void;
    onsaved: (backups: string[]) => void;
  } = $props();
  let designing = $state<Criterion | null>(null);
  let editing = $state<{ path: string; content: string } | null>(null);
  // Contenu actuel des fichiers Claude du dépôt, pour les ouvrir dans l'éditeur.
  // null tant que la lecture n'a pas abouti : sans le contenu, éditer ou créer risquerait d'écraser un fichier.
  let files = $state<ClaudeFile[] | null>(null);
  $effect(() => {
    api.files(root).then(
      (list) => (files = list),
      () => (files = null),
    );
  });
  function edit(path: string) {
    const file = files?.find((f) => f.path === path);
    if (file) editing = { path, content: file.content };
  }
  /** Critères calculés à partir des défauts de la mémoire : on propose d'ouvrir les fichiers concernés. */
  const ISSUE_CODES: Record<string, string> = { specific: 'vague', 'no-secrets': 'secret', imports: 'broken-import' };
  const filesFor = (c: Criterion) => [
    ...new Set(result.memoryIssues.filter((i) => i.file && i.code === ISSUE_CODES[c.id]).map((i) => i.file!)),
  ];
  const designTemplate = $derived(designing && templateForCriterion(designing.id));
  // Les critères qui rapportent le plus de points d'abord.
  const criteria = $derived(result.criteria.filter((c) => c.fix).sort((a, b) => b.max - b.points - (a.max - a.points)));
</script>

{#if !criteria.length && !result.memoryIssues.length}
  <p class="card muted">Pas de proposition : rien à améliorer pour ce dépôt.</p>
{:else}
  <ol class="list">
    {#each criteria as c (c.id)}
      <li class="card">
        <div class="head">
          <b>{c.fix}</b>
          <span class="gain"
            >+{c.max - c.points} pts <Hint
              text="Points gagnés sur la note du dépôt une fois le critère corrigé."
            /></span
          >
        </div>
        <div class="muted">{c.label} · {c.detail}</div>
        {#if filesFor(c).length}
          <div class="act">
            {#each filesFor(c) as f (f)}
              <button onclick={() => edit(f)} disabled={!files}>Modifier <code>{f}</code>…</button>
            {/each}
          </div>
        {/if}
        {#if templateForCriterion(c.id)}
          <div class="act">
            {#if sent.includes(c.id)}<span class="pill">Dans Fichiers Claude</span>{/if}
            <button onclick={() => (designing = c)}
              >{sent.includes(c.id) ? 'Concevoir à nouveau…' : 'Concevoir…'}</button
            >
            <Hint
              text="Ouvre un modèle à adapter au dépôt, avec sa destination et ses défauts en direct. Une fois ajouté, il apparaît dans Fichiers Claude comme nouveau fichier à enregistrer dans le projet."
            />
          </div>
        {/if}
      </li>
    {/each}
    {#each result.memoryIssues as i, n (n)}
      <li class="card">
        <div class="head">
          <b>{i.fix}</b>
          <span class="sev-{i.severity}"
            >{i.severity === 'error' ? 'erreur' : i.severity === 'warning' ? 'avertissement' : 'suggestion'}</span
          >
        </div>
        <div class="muted">
          {#if i.file}<code>{i.file}</code> ·
          {/if}{i.message}
        </div>
        {#if i.file}
          <div class="act">
            <button onclick={() => edit(i.file!)} disabled={!files}>Modifier le fichier…</button>
            <Hint
              text="Ouvre le fichier avec ses défauts détectés en direct pendant la saisie, puis l'enregistre dans le dépôt et le ré-analyse."
            />
          </div>
        {/if}
      </li>
    {/each}
  </ol>
{/if}

{#if designing && designTemplate && files}
  <DraftModal
    criterion={designing}
    template={designTemplate}
    {root}
    existing={files.map((f) => f.path)}
    {onsaved}
    onadd={(rule) => onadd(designing!.id, rule)}
    onclose={() => (designing = null)}
  />
{/if}

{#if editing}
  <FileEditor {root} path={editing.path} content={editing.content} {onsaved} onclose={() => (editing = null)} />
{/if}

<style>
  .list {
    display: grid;
    gap: 8px;
    padding: 0;
    margin: 0;
    list-style: none;
  }
  .list li {
    padding: 10px 14px;
  }
  .head {
    display: flex;
    gap: 12px;
    justify-content: space-between;
    align-items: baseline;
  }
  .act {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
    margin-top: 6px;
  }
  .gain {
    color: var(--ok);
    font-family: var(--mono);
    white-space: nowrap;
  }
</style>
