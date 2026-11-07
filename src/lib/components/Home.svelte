<script lang="ts">
  import GoalChooser from './GoalChooser.svelte';
  import HowItWorks from './HowItWorks.svelte';
</script>

<div class="home">
  <header>
    <h1>Bien configurer Claude Code</h1>
    <p class="lead">
      Des règles courtes, vérifiables et placées au bon endroit : Claude les suit mieux et elles coûtent moins de
      contexte.
    </p>
  </header>

  <HowItWorks />

  <section>
    <h2>Que veux-tu faire ?</h2>
    <GoalChooser />
  </section>
</div>

<style>
  .home {
    display: grid;
    gap: 40px;
    line-height: 1.55;
  }
  h1 {
    margin: 0 0 8px;
    font-size: 28px;
  }
  .lead {
    margin: 0;
    font-size: 16px;
    color: var(--muted);
  }
  h2 {
    margin: 0 0 14px;
    font-size: 20px;
  }
</style>
