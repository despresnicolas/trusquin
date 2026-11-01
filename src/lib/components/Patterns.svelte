<script lang="ts">
  import { goto } from '$app/navigation';
  import { newRule, PATTERNS, templatesFor, type Template } from '../core/presets';
  import { store } from '../state.svelte';

  function use(t: Template) {
    const rule = newRule(t.rule);
    store.project.rules.push(rule);
    goto(`/generator?rule=${rule.id}`);
  }

  const tree = `repo/
├── CLAUDE.md                 # toujours chargé · index court (< 100 lignes)
├── CLAUDE.local.md           # perso, gitignoré
├── AGENTS.md                 # optionnel · multi-outils, importé par @AGENTS.md
├── apps/api/CLAUDE.md        # chargé quand Claude travaille dans apps/api
└── .claude/
    ├── settings.json         # permissions + hooks (déterministe)
    ├── settings.local.json   # perso, gitignoré
    ├── rules/
    │   ├── testing.md        # sans paths → toujours chargé
    │   └── api.md            # paths: ["apps/api/**"] → chargé à la demande
    ├── skills/release/SKILL.md   # description en contexte, corps à la demande
    ├── commands/review.md        # /review lancé à la main
    └── agents/test-runner.md     # sous-agent, contexte isolé
~/.claude/CLAUDE.md           # perso, tous projets`;
</script>

<h2>Patterns</h2>
<p class="muted">Une situation, l'élément Claude Code qui y répond, et des modèles à ajouter au projet.</p>

<div class="patterns">
  {#each PATTERNS as p (p.question)}
    <section class="card pattern">
      <p class="question">{p.question}</p>
      <p><b>{p.answer}</b> · <code>{p.where}</code></p>
      {#each templatesFor(p) as t (t.label)}
        <div class="template">
          <div>
            <b>{t.label}</b>
            <div class="muted">{t.hint}</div>
          </div>
          <button onclick={() => use(t)}>Ajouter au projet</button>
        </div>
      {:else}
        {#if !p.kind}
          <a href="/generator?view=project">Régler dans Générateur › Projet</a>
        {:else}
          <p class="muted">Pas de modèle : partir d'une règle vide.</p>
        {/if}
      {/each}
    </section>
  {/each}
</div>

<div class="grid">
  <section class="card">
    <h3>Arborescence générée</h3>
    <pre>{tree}</pre>
  </section>

  <section class="card">
    <h3>Ce qui fait une bonne règle</h3>
    <ul>
      <li>
        <b>Vérifiable</b> : « tests dans <code>foo.test.ts</code> à côté de <code>foo.ts</code> », pas « écrire des tests
        ».
      </li>
      <li><b>Non déductible</b> : test de suppression — sans la ligne, Claude se tromperait-il ? Sinon, supprimer.</li>
      <li><b>Pointer, pas copier</b> : <code>src/errors.ts:12</code> plutôt qu'un extrait qui vieillit.</li>
      <li><b>Pas de travail de linter</b> : indentation, quotes, points-virgules → formatter + hook.</li>
      <li><b>WHAT / WHY / HOW</b> : stack et structure, raisons des choix, commandes exactes.</li>
      <li><b>Pas de secret</b>, pas de contradiction entre fichiers.</li>
      <li><b>Vivant</b> : ajouter une règle quand Claude répète une erreur, retirer celles devenues inutiles.</li>
    </ul>
  </section>

  <section class="card">
    <h3>Boucle de travail</h3>
    <ol>
      <li>
        <b>Analyse de dépôt</b> : score de départ, puis onglet <b>Propositions</b> trié par points gagnés ; « Concevoir…
        » prépare un fichier, visible dans <b>Fichiers Claude</b> comme nouveau. « Créer un nouveau projet » y ouvre le Générateur
        avec les règles du dépôt et ces ajouts.
      </li>
      <li><b>Générateur › Projet</b> : nom, description, stack, permissions (ou « Nouveau projet » / « Importer »).</li>
      <li><b>Générateur › Règles</b> : pour chaque règle, dire quoi et à quoi elle s'applique.</li>
      <li>
        <b>Générateur › Aperçu &amp; export</b> : corriger erreurs et avertissements, vérifier chaque fichier ; puis « Exporter
        le zip » (barre du haut) et décompresser à la racine du dépôt. « Enregistrer » garde une version dans l'Historique.
      </li>
      <li>Committer <code>sauron.json</code> ; régénérer avec <code>pnpm sauron generate</code>.</li>
      <li><b>Analyse de dépôt › Ré-analyser</b> : vérifier que le score monte (onglet Historique).</li>
    </ol>
  </section>
</div>

<style>
  h2 {
    margin: 0 0 4px;
    font-size: 18px;
  }
  .patterns {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
    gap: 12px;
    margin: 12px 0 24px;
  }
  .pattern p {
    margin: 0 0 8px;
  }
  .question {
    font-weight: 600;
  }
  .template {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    border-top: 1px solid var(--border);
  }
  .template .muted {
    font-size: 12px;
  }
  .template button {
    flex-shrink: 0;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 460px), 1fr));
    gap: 16px;
  }
  h3 {
    margin-top: 0;
  }
  pre {
    background: var(--surface-2);
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
  }
  ul,
  ol {
    padding-left: 18px;
    display: grid;
    gap: 6px;
  }
</style>
