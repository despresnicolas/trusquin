<script lang="ts">
  import { goto } from '$app/navigation';
  import { CLAUDE_FILE_LABELS, claudeFiles, importContext, importRules } from '../core/analyze';
  import { generate } from '../core/placement';
  import { newId, starterProject } from '../core/presets';
  import type { ClaudeFile, ClaudeFileGroup, Rule } from '../core/types';
  import { api } from '../history';
  import { archive, store } from '../state.svelte';
  import FileView from './FileView.svelte';
  import Hint from './Hint.svelte';

  let {
    path,
    name,
    drafts = [],
    onremove = () => {},
  }: { path: string; name: string; drafts?: Rule[]; onremove?: (ruleId: string) => void } = $props();
  let files = $state<ClaudeFile[] | null>(null);
  let failure = $state('');
  let selectedPath = $state('');
  const groups = Object.keys(CLAUDE_FILE_LABELS) as ClaudeFileGroup[];

  /** Fichiers produits par les propositions conçues, avec les règles qui les produisent. */
  const added = $derived.by(() => {
    const ids = new Set(drafts.map((d) => d.id));
    const project = { ...starterProject(), name, permissions: { allow: [], deny: [] }, rules: drafts };
    const generated = generate(project).filter((f) => f.sources.some((id) => ids.has(id)));
    const contents = Object.fromEntries(generated.map((f) => [f.path, f.content]));
    return claudeFiles({ paths: Object.keys(contents), contents }).map((f) => ({
      ...f,
      sources: generated.find((g) => g.path === f.path)!.sources,
    }));
  });

  /** Fichiers du dépôt + ajouts : un ajout sur un fichier existant le marque « modifié ». */
  const entries = $derived.by(() => {
    const list: { path: string; group: ClaudeFileGroup; file?: ClaudeFile; draft?: (typeof added)[number] }[] = (
      files ?? []
    ).map((file) => ({
      path: file.path,
      group: file.group,
      file,
      draft: added.find((a) => a.path === file.path),
    }));
    for (const draft of added)
      if (!list.some((e) => e.path === draft.path))
        list.push({ path: draft.path, group: draft.group, file: undefined, draft });
    return list;
  });
  const selected = $derived(entries.find((e) => e.path === selectedPath) ?? entries[0]);

  $effect(() => {
    api.files(path).then(
      (list) => (files = list),
      (e: Error) => (failure = e.message),
    );
  });

  /** Nouveau projet du générateur : règles du dépôt + propositions conçues. */
  async function createProject() {
    const contents = Object.fromEntries((files ?? []).map((f) => [f.path, f.content]));
    const repo = { paths: Object.keys(contents), contents };
    if (store.errors) {
      if (
        !confirm(`Le projet en cours a ${store.errors} erreur(s) bloquante(s) et ne sera pas enregistré. Continuer ?`)
      )
        return;
    } else {
      try {
        await archive();
      } catch (e) {
        failure = `Projet en cours non enregistré, rien n'est remplacé : ${(e as Error).message}`;
        return;
      }
    }
    store.project = {
      ...starterProject(),
      name,
      ...importContext(repo),
      rules: [...importRules(repo, newId), ...$state.snapshot(drafts)],
    };
    await goto('/generator?view=project');
  }
</script>

{#if failure}
  <p class="sev-error">{failure}</p>
{:else if !files}
  <p class="muted">Lecture du dépôt…</p>
{:else}
  <div class="toolbar">
    <span class="muted">
      {#if added.length}
        {added.length} fichier(s) à enregistrer dans le projet
        <Hint
          text="Les propositions conçues ne sont pas écrites dans le dépôt. « Créer un nouveau projet » les ajoute au Générateur avec les règles existantes : vérifier, puis exporter le zip."
        />
      {:else}
        Conçois une proposition (onglet Propositions) pour l'ajouter ici.
      {/if}
    </span>
    <button class="primary" onclick={createProject} disabled={!entries.length}>Créer un nouveau projet</button>
    <Hint
      text="Ouvre le Générateur avec les règles importées de ce dépôt et les propositions conçues. Le projet en cours est d'abord enregistré dans l'historique."
    />
  </div>

  {#if !entries.length}
    <p class="muted">Aucun fichier Claude Code (CLAUDE.md, .claude/…) dans ce dépôt.</p>
  {:else}
    <div class="layout">
      <nav class="card">
        {#each groups as group}
          {@const list = entries.filter((e) => e.group === group)}
          {#if list.length}
            <h4>{CLAUDE_FILE_LABELS[group]} <span class="muted">{list.length}</span></h4>
            {#each list as e (e.path)}
              <button class="ghost" class:active={e.path === selected?.path} onclick={() => (selectedPath = e.path)}>
                <code>{e.path}</code>
                {#if e.draft}<span class="pill new">{e.file ? 'modifié' : 'nouveau'}</span>{/if}
              </button>
            {/each}
          {/if}
        {/each}
      </nav>
      {#if selected}
        <article class="card">
          <header>
            <code class="path">{selected.path}</code>
            {#if selected.draft}
              <span class="pill new">{selected.file ? 'Modifié' : 'Nouveau'} · à enregistrer dans le projet</span>
              <span class="spacer"></span>
              <button class="ghost" onclick={() => selected.draft!.sources.forEach(onremove)}>Retirer</button>
            {/if}
          </header>
          {#if selected.file}
            <FileView path={selected.path} content={selected.file.content} />
          {/if}
          {#if selected.draft}
            {#if selected.file}<h4>Ajout proposé</h4>{/if}
            <FileView path={selected.path} content={selected.draft.content} />
          {/if}
        </article>
      {/if}
    </div>
  {/if}
{/if}

<style>
  .layout {
    display: grid;
    grid-template-columns: minmax(200px, 280px) minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }
  @media (max-width: 1000px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  nav {
    display: grid;
    gap: 2px;
  }
  nav h4 {
    margin: 12px 0 4px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
  }
  nav h4:first-child {
    margin-top: 0;
  }
  nav button {
    text-align: left;
    overflow-wrap: anywhere;
  }
  nav button.active {
    background: var(--accent-soft);
  }
  header {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }
  .path {
    font-weight: 600;
  }
  .toolbar {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }
  .toolbar > span:first-child,
  .spacer {
    flex: 1;
  }
  .new {
    background: var(--accent-soft);
    color: var(--accent);
  }
  article h4 {
    margin: 12px 0 6px;
  }
</style>
