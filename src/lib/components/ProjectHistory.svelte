<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, type ProjectSummary } from '../history';
  import { archive, store } from '../state.svelte';
  import ScoreBadge from './ScoreBadge.svelte';

  let projects = $state<ProjectSummary[]>([]);
  let loading = $state(false);
  let failure = $state('');

  const date = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

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

  // Le projet en cours est enregistré avant d'être remplacé : rien ne se perd.
  const open = (id: number) =>
    attempt(async () => {
      await archive();
      store.project = (await api.project(id)).project;
      await goto('/generator');
    });

  const forget = (name: string) =>
    attempt(async () => {
      if (!confirm(`Supprimer toutes les versions de « ${name} » ?`)) return;
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
  <p class="muted">Aucun projet enregistré. « Enregistrer » et « Nouveau projet » (en haut) l'ajoutent ici.</p>
{:else}
  <table>
    <tbody>
      {#each projects as p (p.last.name)}
        <tr class:current={p.last.name === store.project.name}>
          <td><b>{p.last.name}</b></td>
          <td><ScoreBadge score={p.last.score} /></td>
          <td class="muted">{p.last.ruleCount} règle{p.last.ruleCount > 1 ? 's' : ''}</td>
          <td class="muted">{date(p.last.createdAt)} · {p.versions} version{p.versions > 1 ? 's' : ''}</td>
          <td class="actions">
            <button onclick={() => open(p.last.id)} disabled={loading}>Ouvrir</button>
            <button class="danger" onclick={() => forget(p.last.name)} disabled={loading}>Supprimer</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
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
