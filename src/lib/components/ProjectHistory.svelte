<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, type ProjectSummary } from '#lib/history.ts';
  import { i18n, t } from '#lib/i18n.svelte.ts';
  import { archive, store } from '#lib/state.svelte.ts';
  import ScoreBadge from './ScoreBadge.svelte';

  let projects = $state<ProjectSummary[]>([]);
  let loading = $state(false);
  let failure = $state('');

  const date = (iso: string) => new Date(iso).toLocaleString(i18n.locale, { dateStyle: 'short', timeStyle: 'short' });

  async function attempt(task: () => Promise<void>) {
    loading = true;
    failure = '';
    try {
      await task();
    } catch (e) {
      failure = (e as Error).message;
    } finally {
      loading = false;
    }
  }

  const refresh = async () => {
    projects = await api.projects();
  };

  // Le projet en cours est enregistré avant d'être remplacé, sauf s'il a des erreurs bloquantes.
  const open = (id: number) =>
    attempt(async () => {
      if (store.errors) {
        if (!(await api.ask(t('history.askOpen', { n: store.errors }), t('history.open')))) return;
      } else await archive();
      store.project = (await api.project(id)).project;
      await goto('/generator?goal=resume&view=rules');
    });

  const forget = (name: string) =>
    attempt(async () => {
      if (!(await api.ask(t('history.askDelete', { name })))) return;
      await api.forgetProject(name);
      await refresh();
    });

  $effect(() => {
    void store.saved;
    attempt(refresh);
  });
</script>

{#if failure}<p class="sev-error">{failure}</p>{/if}

{#if !projects.length}
  <p class="muted">{t('history.empty')}</p>
{:else}
  <div class="scroll-x">
    <table>
      <tbody>
        {#each projects as p (p.last.name)}
          <tr class:current={p.last.name === store.project.name}>
            <td><b>{p.last.name}</b></td>
            <td><ScoreBadge score={p.last.score} /></td>
            <td class="muted">{t(p.last.ruleCount > 1 ? 'history.rules' : 'history.rule', { n: p.last.ruleCount })}</td>
            <td class="muted"
              >{date(p.last.createdAt)} · {t(p.versions > 1 ? 'history.versions' : 'history.version', {
                n: p.versions,
              })}</td
            >
            <td class="actions">
              <button onclick={() => open(p.last.id)} disabled={loading} title={t('history.openTitle')}
                >{t('history.open')}</button
              >
              <button class="danger" onclick={() => forget(p.last.name)} disabled={loading}>{t('common.delete')}</button
              >
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<style>
  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
  }
  tr.current {
    background: var(--accent-soft);
  }
  .actions {
    text-align: right;
    white-space: nowrap;
  }
  .danger {
    color: var(--err);
  }
</style>
