<script lang="ts">
  import { store } from '../state.svelte';
  import Hint from './Hint.svelte';

  const project = $derived(store.project);
</script>

<div class="card project">
  <label
    >Nom du projet <Hint
      text="Titre du CLAUDE.md et nom dans l'historique : deux projets du même nom partagent le même historique."
    /><input bind:value={project.name} /></label
  >
  <label
    >Description (le quoi, en une phrase) <Hint
      text="Une phrase sur ce que fait le dépôt, en tête du CLAUDE.md. Aide Claude à trancher les cas ambigus."
    /><textarea rows="2" bind:value={project.description}></textarea></label
  >
  <label
    >Stack <Hint
      text="Langages, frameworks, base, gestionnaire de paquets. Évite que Claude propose npm dans un projet pnpm."
    /><input bind:value={project.stack} placeholder="SvelteKit, Fastify, PostgreSQL, pnpm" /></label
  >
  <label class="check"
    ><input type="checkbox" bind:checked={project.useAgentsMd} /> Écrire dans AGENTS.md (multi-outils) + import dans
    CLAUDE.md <Hint
      text="À cocher si l'équipe utilise aussi Codex, Cursor… : la mémoire va dans AGENTS.md, que CLAUDE.md importe."
    /></label
  >
  <h4>
    Permissions <span class="muted">(.claude/settings.json)</span>
    <Hint
      text="Autoriser évite les confirmations pour les commandes sûres (Bash(pnpm test:*)). Refuser protège les secrets (Read(./.env)). Un refus l'emporte toujours."
    />
  </h4>
  <div class="perms">
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
  </div>
</div>

<style>
  .project {
    display: grid;
    gap: 12px;
    max-width: 900px;
  }
  .check {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .check input {
    width: auto;
  }
  h4 {
    margin: 8px 0 0;
  }
  .perms {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 12px;
  }
</style>
