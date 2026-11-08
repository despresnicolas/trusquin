<script lang="ts">
  import { goto } from '$app/navigation';
  import { importContext, importedPath, importRules } from '#lib/core/analyze.ts';
  import { newId, starterProject } from '#lib/core/presets.ts';
  import { exportZip, zipName } from '#lib/export.ts';
  import { api } from '#lib/history.ts';
  import { t } from '#lib/i18n.svelte.ts';
  import { archive, store } from '#lib/state.svelte.ts';
  import Hint from './Hint.svelte';
  import ScoreBadge from './ScoreBadge.svelte';

  let notice = $state('');
  let resetting = $state(false);
  const errors = $derived(store.errors);
  // Ce qui bloque l'export, avec la règle concernée quand il y en a une.
  const blocking = $derived(store.quality.issues.filter((i) => i.severity === 'error'));
  const titleOf = (id: string) => store.project.rules.find((r) => r.id === id)?.title || t('common.untitled');

  /** Les .md (CLAUDE.md, règles) et settings.json (hooks) ajoutent des règles au projet en cours. */
  async function importFiles(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const contents: Record<string, string> = {};
    for (const file of input.files ?? []) {
      contents[importedPath(file.name)] = await file.text();
    }
    input.value = '';
    const repo = { paths: Object.keys(contents), contents };
    if (!repo.paths.length) return;
    const rules = importRules(repo, newId);
    const context = importContext(repo);
    store.project.description ||= context.description;
    store.project.stack ||= context.stack;
    store.project.rules.push(...rules);
    notice = rules.length ? t('bar.imported', { n: rules.length }) : t('bar.noneFound');
    if (rules.length) await goto(`/generator?rule=${rules[0].id}`);
  }

  async function save() {
    try {
      notice = t('bar.saved', { name: (await archive()).name });
    } catch (e) {
      notice = t('bar.notSaved', { error: (e as Error).message });
    }
  }

  async function exportCurrent() {
    if (errors || !store.files.length) return;
    await api.saveFile(zipName(store.project), await exportZip(store.files, store.quality));
  }

  async function reset() {
    resetting = false;
    try {
      // Avec des erreurs bloquantes (dont « aucune règle »), rien n'est enregistré.
      if (!errors) await archive();
    } catch (e) {
      notice = t('bar.resetFailed', { error: (e as Error).message });
      return;
    }
    store.project = starterProject(t('common.defaultProject'));
    notice = '';
    await goto('/generator?goal=new&view=project');
  }
</script>

<div class="bar card">
  <b class="name">{store.project.name || t('common.unnamed')}</b>
  {#if store.empty}<span class="pill">{t('bar.toStart')}</span>{:else}<ScoreBadge score={store.quality.score} />{/if}
  <span class="spacer"></span>
  <button onclick={() => (resetting = true)}>{t('bar.new')}</button>
  <Hint text={t('bar.newHint')} />
  <label class="file">{t('bar.import')}<input type="file" accept=".md,.json" multiple onchange={importFiles} /></label>
  <Hint text={t('bar.importHint')} />
  <button onclick={save} disabled={errors > 0} title={errors ? t('bar.saveBlocked', { n: errors }) : undefined}
    >{t('common.save')}</button
  >
  <Hint text={t('bar.saveHint')} />
  <button
    class="primary"
    onclick={exportCurrent}
    disabled={errors > 0 || !store.files.length}
    title={!store.files.length ? t('bar.noFiles') : errors ? t('bar.exportBlocked') : undefined}
    >{t('bar.export')}</button
  >
  <Hint text={t('bar.exportHint')} />
</div>

{#if resetting}
  <div class="card confirm" role="alert">
    {#if store.empty}
      <span>{t('bar.resetEmpty')}</span>
    {:else if errors}
      <span class="sev-error">{t('bar.resetLost', { n: errors })}</span>
    {:else}
      <span>{t('bar.resetSaved')}</span>
    {/if}
    <button class="primary" onclick={reset}>{t('bar.new')}</button>
    <button class="ghost" onclick={() => (resetting = false)}>{t('common.cancel')}</button>
  </div>
{/if}
{#if store.empty}
  <p class="card todo">
    {t('bar.emptyTodo')}
    <a href="/generator?view=guide">{t('bar.emptyGuide')}</a>
    {t('bar.emptyImport')}
  </p>
{:else if blocking.length}
  <div class="card todo" role="status">
    <b>{t(blocking.length > 1 ? 'bar.blockingMany' : 'bar.blockingOne', { n: blocking.length })}</b>
    <ul>
      {#each blocking as i, n (n)}
        <li>
          {i.message} <span class="muted">→ {i.fix}</span>
          {#if i.ruleId}<a href="/generator?rule={i.ruleId}">{t('bar.openRule', { title: titleOf(i.ruleId) })}</a>{/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}
{#if notice}<p class="muted notice">{notice}</p>{/if}

<style>
  .bar,
  .confirm {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    padding: 10px 14px;
  }
  .confirm {
    margin-top: 8px;
  }
  .name {
    font-size: 16px;
  }
  .spacer {
    flex: 1;
  }
  .file {
    display: block;
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
  .todo {
    margin-top: 8px;
    padding: 10px 14px;
  }
  .todo ul {
    margin: 4px 0 0;
    padding-left: 20px;
  }
  .notice {
    margin: 8px 2px 0;
  }
</style>
