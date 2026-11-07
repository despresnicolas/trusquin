<script lang="ts">
  import GradeScale from './GradeScale.svelte';

  /** La boucle de travail, en quatre temps. */
  const LOOP = [
    { title: 'Analyser', text: 'Trusquin note le dépôt sur 100 et liste les propositions, triées par points gagnés.' },
    {
      title: 'Corriger',
      text: 'Modifier ou créer les fichiers depuis les propositions, ou les écrire dans le générateur.',
    },
    {
      title: 'Exporter',
      text: 'Vérifier le contrôle qualité, exporter le zip et le décompresser à la racine du dépôt.',
    },
    { title: 'Ré-analyser', text: 'Committer CLAUDE.md et .claude/, puis ré-analyser pour voir la note monter.' },
  ];
</script>

<section>
  <h2>Comment ça marche</h2>
  <ol>
    {#each LOOP as s, i (s.title)}
      <li>
        <span class="num" aria-hidden="true">{i + 1}</span>
        <b>{s.title}</b>
        <p class="muted">{s.text}</p>
      </li>
    {/each}
  </ol>
  <h3>La notation</h3>
  <div class="note">
    <GradeScale grade="A" />
    <p class="muted">
      L'analyse donne une note sur 100, traduite en lettre de A à E. Objectif : <b>A</b>, 85 et plus.
    </p>
  </div>
</section>

<style>
  section {
    margin-bottom: 24px;
    line-height: 1.55;
  }
  h2 {
    margin: 0 0 14px;
    font-size: 20px;
  }
  ol {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: grid;
    gap: 6px;
    align-content: start;
  }
  p {
    margin: 0;
  }
  .note {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
  }
  h3 {
    margin: 28px 0 12px;
    font-size: 16px;
  }
  .num {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--on-accent);
    font-weight: 700;
  }
</style>
