<script lang="ts">
  import { LOADING_LABELS } from '../core/presets';
  import type { Loading } from '../core/types';
  import { api, type RepoSummary } from '../history';
  import RepoChooser from './RepoChooser.svelte';

  // Dépôts déjà analysés : sans eux, l'étape « Concevoir les propositions » n'a rien à ouvrir.
  let repos = $state<RepoSummary[]>([]);
  let choosing = $state(false);
  $effect(() => {
    api.repos().then(
      (list) => (repos = list),
      () => (repos = []),
    );
  });

  const GROUPS = [
    {
      id: 'contenu',
      title: 'Ce qu’elle dit',
      lead: 'Une consigne précise et utile, que Claude ne devinerait pas seul.',
    },
    { id: 'placement', title: 'Où elle vit', lead: 'Chargée seulement quand elle sert, ou confiée à un hook.' },
    { id: 'entretien', title: 'Comment elle vieillit', lead: 'Sûre, cohérente, et mise à jour avec le projet.' },
  ];

  /** Principes d'une bonne règle : contre-exemple, version réussie et contrôle qui le vérifie. */
  const PRINCIPLES = [
    {
      group: 'contenu',
      title: 'Vérifiable',
      why: 'Claude doit pouvoir savoir s’il l’a respectée.',
      bad: '« Écrire des tests »',
      good: '« Test à côté du code : foo.ts → foo.test.ts, lancé par pnpm test »',
      check: 'formulations vagues',
    },
    {
      group: 'contenu',
      title: 'Formulée en positif',
      why: 'Dire quoi faire : une interdiction seule laisse Claude deviner l’alternative.',
      bad: '« Pas de any »',
      good: '« TypeScript strict ; valeur inconnue typée unknown »',
      check: 'interdiction sans alternative',
    },
    {
      group: 'contenu',
      title: 'Non déductible',
      why: 'Test de suppression : sans cette ligne, Claude se tromperait-il ? Sinon, la retirer.',
      bad: '« Le projet utilise Git »',
      good: '« Branches : feat/<ticket>-<slug> »',
      check: '',
    },
    {
      group: 'contenu',
      title: 'Montrer un exemple',
      why: 'Un fichier exemplaire du dépôt vaut mieux qu’une description de style.',
      bad: '« Composants propres et cohérents »',
      good: '« Nouveau composant : suivre src/components/Button.svelte »',
      check: 'fichiers exemplaires cités',
    },
    {
      group: 'contenu',
      title: 'Pointer plutôt que copier',
      why: 'Un extrait recopié vieillit ; le chemin reste juste.',
      bad: 'Un bloc de 20 lignes de code dans CLAUDE.md',
      good: '« Erreurs HTTP : httpError() de src/errors.ts:12 »',
      check: 'bloc de code copié',
    },
    {
      group: 'placement',
      title: 'Confiée au hook si elle doit arriver à 100 %',
      why: 'Le texte dépend de la bonne volonté du modèle ; un hook s’exécute à chaque fois.',
      bad: '« Toujours formater avec Prettier »',
      good: 'Hook PostToolUse Edit|Write qui lance Prettier',
      check: 'travail de linter, aucun hook',
    },
    {
      group: 'placement',
      title: 'Au bon endroit',
      why: 'Chargée seulement quand elle sert : la racine reste un index court.',
      bad: '40 lignes sur l’API dans le CLAUDE.md racine',
      good: '.claude/rules/api.md avec paths: apps/api/**',
      check: 'racine longue, règle lourde, budget d’instructions',
    },
    {
      group: 'placement',
      title: 'Critique : ancrée en haut et en bas',
      why: 'Les 3 consignes les plus oubliées ouvrent le CLAUDE.md et sont rappelées à la fin.',
      bad: '« Lancer les tests » perdu au milieu de 80 lignes',
      good: 'Règle cochée « Critique » : en tête et dans « Rappels »',
      check: 'plus de 3 règles critiques',
    },
    {
      group: 'entretien',
      title: 'Sûre et cohérente',
      why: 'Les secrets restent dans .env ; une consigne n’a qu’une seule version.',
      bad: '« Clé API : sk-… » ; « pnpm » ici, « npm » ailleurs',
      good: '« Clé API dans .env : OPENAI_API_KEY » ; un seul gestionnaire',
      check: 'secret, contradiction, doublon',
    },
    {
      group: 'entretien',
      title: 'Vivante',
      why: 'Ajouter une règle quand Claude répète une erreur, retirer celles devenues inutiles.',
      bad: 'Un CLAUDE.md écrit une fois puis oublié',
      good: 'Ré-analyser le dépôt et suivre le score dans l’historique',
      check: '',
    },
  ];

  const STEPS = [
    { title: 'Analyser le dépôt', text: 'Score de départ et propositions triées par points gagnés.', href: '/analyze' },
    {
      title: 'Concevoir les propositions',
      text: '« Concevoir… » prépare chaque fichier ; « Créer un nouveau projet » les envoie au Générateur.',
      href: '',
    },
    { title: 'Décrire le projet', text: 'Nom, description, stack et permissions.', href: '/generator?view=project' },
    { title: 'Écrire les règles', text: 'Pour chacune : quoi, et à quoi elle s’applique.', href: '/generator' },
    {
      title: 'Vérifier et exporter',
      text: 'Corriger les erreurs, relire chaque fichier, exporter le zip et le décompresser à la racine.',
      href: '/generator?view=export',
    },
    {
      title: 'Committer et ré-analyser',
      text: 'Committer CLAUDE.md et .claude/, puis ré-analyser pour voir le score monter.',
      href: '/analyze',
    },
  ];

  const FILES: { path: string; loading: Loading; role: string }[] = [
    { path: 'CLAUDE.md', loading: 'always', role: 'Index court du projet, moins de 100 lignes.' },
    { path: 'AGENTS.md', loading: 'always', role: 'Optionnel : mémoire multi-outils, importée par @AGENTS.md.' },
    { path: '.claude/rules/testing.md', loading: 'always', role: 'Règles d’un thème, sans paths.' },
    {
      path: '.claude/rules/api.md',
      loading: 'on-path',
      role: 'paths: apps/api/** : lu quand Claude touche ces fichiers.',
    },
    { path: 'apps/api/CLAUDE.md', loading: 'on-path', role: 'Lu quand Claude travaille dans apps/api.' },
    {
      path: '.claude/skills/release/SKILL.md',
      loading: 'on-demand',
      role: 'Description toujours visible, contenu chargé quand il sert.',
    },
    { path: '.claude/commands/review.md', loading: 'on-demand', role: '/review, lancé à la main.' },
    { path: '.claude/agents/test-runner.md', loading: 'on-demand', role: 'Sous-agent avec son propre contexte.' },
    { path: '.claude/settings.json', loading: 'deterministic', role: 'Permissions et hooks, appliqués à coup sûr.' },
    { path: 'CLAUDE.local.md', loading: 'personal', role: 'Tes préférences pour ce dépôt, gitignoré.' },
    { path: '~/.claude/CLAUDE.md', loading: 'personal', role: 'Tes préférences pour tous tes projets.' },
  ];
</script>

<div class="home">
  <header class="hero">
    <h1>Bien configurer Claude Code</h1>
    <p class="lead">
      Des règles courtes, vérifiables et placées au bon endroit : Claude les suit mieux et elles coûtent moins de
      contexte. Sauron note un dépôt existant et génère les fichiers.
    </p>
    <div class="cta">
      <a class="button primary" href="/analyze">Analyser un dépôt</a>
      <a class="button" href="/generator?view=project">Créer un projet</a>
    </div>
    <nav class="toc" aria-label="Sur cette page">
      <a href="#regles">Ce qui fait une bonne règle</a>
      <a href="#arborescence">Arborescence générée</a>
      <a href="#boucle">Boucle de travail</a>
    </nav>
  </header>

  <div class="columns">
    <section id="regles">
      <h2>Ce qui fait une bonne règle</h2>
      {#each GROUPS as g}
        <h3>{g.title}</h3>
        <p class="muted group-lead">{g.lead}</p>
        <div class="principles">
          {#each PRINCIPLES.filter((p) => p.group === g.id) as p}
            <article class="card">
              <h4>{p.title}</h4>
              <p class="why">{p.why}</p>
              <dl>
                <dt class="bad"><span aria-hidden="true">✗</span> À éviter</dt>
                <dd>{p.bad}</dd>
                <dt class="good"><span aria-hidden="true">✓</span> À préférer</dt>
                <dd>{p.good}</dd>
              </dl>
              {#if p.check}<p class="check">Vérifié par Sauron : {p.check}</p>{/if}
            </article>
          {/each}
        </div>
      {/each}
    </section>

    <section id="boucle">
      <h2>Boucle de travail</h2>
      <ol class="steps">
        {#each STEPS as s, i}
          <li class="card">
            <span class="step" aria-hidden="true">{i + 1}</span>
            <div>
              <b>{s.title}</b>
              <p class="muted">{s.text}</p>
            </div>
            {#if s.href}
              <a href={s.href}>Ouvrir<span class="sr-only"> : {s.title}</span> →</a>
            {:else if repos.length}
              <button class="link" onclick={() => (choosing = true)}
                >Ouvrir<span class="sr-only"> : {s.title}</span> →</button
              >
            {/if}
          </li>
        {/each}
      </ol>
    </section>

    <section id="arborescence">
      <h2>Arborescence générée</h2>
      <p class="muted">Où va chaque fichier, et quand Claude le lit.</p>
      <div class="table-wrap card">
        <table>
          <thead>
            <tr><th scope="col">Fichier</th><th scope="col">Chargement</th><th scope="col">Rôle</th></tr>
          </thead>
          <tbody>
            {#each FILES as f}
              <tr>
                <td><code>{f.path}</code></td>
                <td><span class="pill load-{f.loading}">{LOADING_LABELS[f.loading]}</span></td>
                <td>{f.role}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  </div>
</div>

{#if choosing}
  <RepoChooser {repos} onclose={() => (choosing = false)} />
{/if}

<style>
  .home {
    line-height: 1.6;
  }
  .hero {
    padding: 12px 0 8px;
  }
  h1 {
    margin: 0 0 8px;
    font-size: 26px;
  }
  .lead {
    max-width: 70ch;
    margin: 0 0 16px;
    font-size: 16px;
  }
  .cta {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .button {
    display: inline-block;
    padding: 8px 16px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    text-decoration: none;
    font-weight: 600;
  }
  .button.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
  .toc {
    display: flex;
    gap: 6px 16px;
    flex-wrap: wrap;
    margin-top: 20px;
    font-size: 13px;
  }
  .toc a {
    color: var(--muted);
  }
  .columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-areas:
      'regles arborescence'
      'regles boucle';
    /* La boucle suit l'arborescence ; la hauteur des règles part dans la 2e ligne. */
    grid-template-rows: auto 1fr;
    gap: 32px 24px;
    align-items: start;
    margin-top: 32px;
  }
  @media (max-width: 900px) {
    .columns {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: 'regles' 'arborescence' 'boucle';
      grid-template-rows: auto;
    }
  }
  #regles {
    grid-area: regles;
  }
  #arborescence {
    grid-area: arborescence;
  }
  #boucle {
    grid-area: boucle;
  }
  section {
    scroll-margin-top: 70px;
  }
  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 12px;
    font-size: 20px;
  }
  h3 {
    margin: 24px 0 2px;
    font-size: 16px;
  }
  .group-lead {
    margin: 0 0 10px;
  }
  .principles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
    gap: 12px;
  }
  .principles article {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  h4 {
    margin: 0;
    font-size: 15px;
  }
  .why {
    margin: 0;
  }
  dl {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 4px 10px;
    margin: 0;
    padding: 8px 10px;
    border-radius: 6px;
    background: var(--surface-2);
    font-size: 13px;
  }
  dt {
    font-weight: 600;
    white-space: nowrap;
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .bad {
    color: var(--err);
  }
  .good {
    color: var(--ok);
  }
  .check {
    margin: auto 0 0;
    font-size: 12px;
    color: var(--muted);
  }
  .steps {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .steps li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 14px;
    align-items: center;
    padding: 12px 16px;
  }
  .steps p {
    margin: 2px 0 0;
  }
  .step {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--on-accent);
    font-weight: 700;
  }
  .link {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
  }
  .steps a,
  .steps .link {
    white-space: nowrap;
    color: var(--accent);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .table-wrap {
    padding: 0;
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th,
  td {
    padding: 8px 14px;
    border-bottom: 1px solid var(--border);
    text-align: left;
    vertical-align: top;
  }
  th {
    color: var(--muted);
    font-weight: 600;
  }
  tr:last-child td {
    border-bottom: 0;
  }
  .load-always {
    color: var(--warn);
  }
  .load-on-path,
  .load-on-demand {
    color: var(--ok);
  }
  .load-deterministic {
    color: var(--info);
  }
</style>
