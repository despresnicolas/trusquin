<script lang="ts">
  import { t } from '#lib/i18n.svelte.ts';
  import type { Loading } from '#lib/core/types.ts';

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

  /** La boucle de travail, en quatre temps. */

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

<div class="page">
  <header>
    <h1>Bonnes pratiques</h1>
    <p class="lead">Ce que Trusquin vérifie, et pourquoi : une consigne utile, au bon endroit, tenue à jour.</p>
  </header>

  <section>
    <h2>Ce qui fait une bonne règle</h2>
    <div class="groups">
      {#each GROUPS as g (g.id)}
        <div>
          <h3>{g.title}</h3>
          <p class="muted">{g.lead}</p>
          <ul class="principles">
            {#each PRINCIPLES.filter((p) => p.group === g.id) as p (p.title)}
              <li>
                <details>
                  <summary><b>{p.title}</b><span class="muted">{p.why}</span></summary>
                  <dl>
                    <dt class="bad"><span aria-hidden="true">✗</span> À éviter</dt>
                    <dd>{p.bad}</dd>
                    <dt class="good"><span aria-hidden="true">✓</span> À préférer</dt>
                    <dd>{p.good}</dd>
                  </dl>
                  {#if p.check}<p class="check">Vérifié par Trusquin : {p.check}</p>{/if}
                </details>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  </section>

  <section>
    <h2>Où va chaque fichier, et quand Claude le lit</h2>
    <div class="table-wrap card">
      <table>
        <thead>
          <tr><th scope="col">Fichier</th><th scope="col">Chargement</th><th scope="col">Rôle</th></tr>
        </thead>
        <tbody>
          {#each FILES as f (f.path)}
            <tr>
              <td><code>{f.path}</code></td>
              <td><span class="pill load-{f.loading}">{t(`loading.${f.loading}`)}</span></td>
              <td>{f.role}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</div>

<style>
  .page {
    display: grid;
    gap: 40px;
    max-width: 1000px;
    line-height: 1.55;
  }
  h1 {
    margin: 0 0 8px;
    font-size: 28px;
  }
  .lead {
    max-width: 62ch;
    margin: 0;
    font-size: 16px;
    color: var(--muted);
  }
  h2 {
    margin: 0 0 14px;
    font-size: 20px;
  }
  h3 {
    margin: 0;
    font-size: 16px;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .groups {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 28px;
  }
  .groups > div > .muted {
    margin: 2px 0 10px;
  }
  .principles {
    display: grid;
    gap: 6px;
  }
  .principles details {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .principles details[open] {
    border-color: var(--accent);
  }
  .principles summary {
    display: grid;
    gap: 2px;
    padding: 10px 12px;
    cursor: pointer;
    list-style: none;
  }
  .principles summary::-webkit-details-marker {
    display: none;
  }
  .principles summary .muted {
    font-size: 13px;
  }
  dl {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 4px 10px;
    margin: 0 12px 10px;
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
    margin: 0 12px 10px;
    font-size: 12px;
    color: var(--muted);
  }
  .table-wrap {
    margin-top: 14px;
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
