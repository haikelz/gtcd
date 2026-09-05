<script lang="ts">
  import AnalyticsPreview from "$lib/components/AnalyticsPreview.svelte";
  import Brand from "$lib/components/Brand.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";

  let { data } = $props();
  const destination = $derived(data.authenticated ? "/dashboard" : "/login");
</script>

<SEO title="A clearer view of your website" description="Explore your GoatCounter analytics in a focused, self-hosted workspace. Follow traffic, understand your audience, and see which pages bring people back." />

<div class="landing">
  <nav class="landing-nav" aria-label="Main navigation">
    <div class="landing-width nav-inner">
      <Brand />
      <div class="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
        <a href="#workspace">The workspace</a>
        <a href="#approach">Our approach</a>
      </div>
      <a href={destination} class="btn btn-outline">
        {data.authenticated ? "Open dashboard" : "Sign in"} <span aria-hidden="true">↗</span>
      </a>
    </div>
  </nav>

  <main id="main-content" tabindex="-1">
    <section class="landing-width hero-section" aria-labelledby="hero-title">
      <div class="hero-kicker">
        <p class="eyebrow flex items-center gap-3"><span class="w-5 h-px bg-primary" aria-hidden="true"></span> A workspace for website analytics</p>
        <span class="hidden sm:block font-mono text-xs text-muted-foreground">POWERED BY GOATCOUNTER</span>
      </div>
      <div class="hero-copy">
        <h1 id="hero-title">A clearer view.<br /><span>Your next move.</span></h1>
        <div class="hero-description">
          <p>Understand where your visitors come from, what they read, and how they find you. Your GoatCounter data, in a workspace built for focus.</p>
          <div class="flex flex-wrap items-center gap-5 mt-6">
            <a href={destination} class="btn btn-primary px-5">Open your dashboard <span aria-hidden="true">↗</span></a>
            <a href="#workspace" class="text-sm underline underline-offset-4">Explore the workspace</a>
          </div>
          <p class="mt-5 text-xs text-muted-foreground">Self-hosted. Open source. Yours to run.</p>
        </div>
      </div>
      <div id="workspace" class="scroll-mt-24">
        <AnalyticsPreview />
      </div>
      <div class="under-preview">
        <span>Less time finding the numbers. More time understanding them.</span>
        <span class="font-mono text-xs">BUILT AROUND YOUR DATA</span>
      </div>
    </section>

    <section id="approach" class="landing-width approach-section" aria-labelledby="approach-title">
      <div>
        <p class="eyebrow mb-5">From overview to understanding</p>
        <h2 id="approach-title">Every visit has<br />a bigger picture.</h2>
        <p class="text-muted-foreground text-base mt-6 max-w-sm leading-relaxed">Start with the trend. Follow it into the details. Keep the context that makes your numbers useful.</p>
        <a href={destination} class="section-link mt-6">See your analytics <span aria-hidden="true">↗</span></a>
      </div>
      <div class="approach-list">
        <article>
          <span class="font-mono text-xs text-primary">01</span>
          <div><h3>Read the rhythm of your traffic</h3><p>Move between daily, weekly, and monthly views. See your totals and daily average alongside the full traffic trend.</p></div>
        </article>
        <article>
          <span class="font-mono text-xs text-primary">02</span>
          <div><h3>Know the audience behind the visits</h3><p>Explore browsers, operating systems, countries, languages, and screen sizes in consistent, readable reports.</p></div>
        </article>
        <article>
          <span class="font-mono text-xs text-primary">03</span>
          <div><h3>Follow the paths that matter</h3><p>Find your most-viewed pages, open their referrers, and see which campaigns bring visitors to your website.</p></div>
        </article>
      </div>
    </section>

    <section class="ownership-section" aria-labelledby="ownership-title">
      <div class="landing-width ownership-inner">
        <div>
          <p class="eyebrow mb-5">Your infrastructure. Your perspective.</p>
          <h2 id="ownership-title">Good analytics.<br />On your terms.</h2>
        </div>
        <div>
          <p class="text-muted-foreground text-base leading-relaxed max-w-md">A self-hosted interface for the GoatCounter you already use. Sign in with your existing account and explore your website from one considered workspace.</p>
          <a href={destination} class="btn btn-primary mt-8 px-6">Get into the details <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>
  </main>

  <footer class="landing-width landing-footer">
    <div><Brand /><p class="text-xs text-muted-foreground mt-3">A little clarity goes a long way.</p></div>
    <div class="flex flex-wrap items-center gap-6">
      <a href="https://github.com/haikelz/gtcd" target="_blank" rel="noopener noreferrer" class="section-link">Source code ↗</a>
      <a href="https://www.goatcounter.com/" target="_blank" rel="noopener noreferrer" class="section-link">GoatCounter ↗</a>
      <ThemeToggle />
    </div>
  </footer>
</div>

<style>
  .landing { background: var(--color-base-100); }
  .landing-width { width: min(75rem, calc(100% - 4rem)); margin-inline: auto; }
  .landing-nav { border-bottom: 1px solid var(--color-border); }
  .nav-inner { height: 5rem; display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; }
  .nav-inner a:hover { color: var(--color-primary); }
  .hero-section { padding-top: 4rem; }
  .hero-kicker { display: flex; align-items: center; justify-content: space-between; gap: 2rem; margin-bottom: 2rem; }
  .hero-copy { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); align-items: end; gap: 4rem; margin-bottom: 4rem; }
  h1 { font-size: clamp(2.5rem, 6vw, 5rem); font-weight: 500; letter-spacing: -0.065em; line-height: 1.08; }
  h1 span { color: var(--color-primary); }
  .hero-description > p:first-child { color: var(--color-muted-foreground); font-size: 1rem; line-height: 1.8; max-width: 30rem; }
  .under-preview { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; padding-block: 1.5rem; color: var(--color-muted-foreground); font-size: 0.75rem; }
  .approach-section { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1.1fr); gap: 6rem; padding-block: 6rem; }
  h2 { font-size: clamp(2rem, 3.5vw, 3rem); line-height: 1.15; font-weight: 500; letter-spacing: -0.05em; }
  .approach-list article { display: grid; grid-template-columns: 2rem 1fr; gap: 1rem; padding-block: 1.5rem; border-top: 1px solid var(--color-border); }
  .approach-list article:last-child { border-bottom: 1px solid var(--color-border); }
  .approach-list h3 { font-size: 1.125rem; font-weight: 500; margin-bottom: 0.75rem; }
  .approach-list p { font-size: 0.875rem; line-height: 1.8; color: var(--color-muted-foreground); max-width: 32rem; }
  .ownership-section { border-block: 1px solid var(--color-border); background: var(--color-base-200); padding-block: 5rem; }
  .ownership-inner { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1.1fr); align-items: center; gap: 6rem; }
  .landing-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 2rem; padding-block: 2.5rem; }
  @media (max-width: 767px) {
    .landing-width { width: calc(100% - 2rem); }
    .hero-section { padding-top: 2.5rem; }
    .hero-copy { grid-template-columns: minmax(0,1fr); gap: 1.5rem; margin-bottom: 2.5rem; }
    .hero-kicker { margin-bottom: 1.5rem; }
    .approach-section, .ownership-inner { grid-template-columns: minmax(0,1fr); gap: 2rem; }
    .approach-section { padding-block: 4rem; }
    .ownership-section { padding-block: 3rem; }
    .landing-footer { align-items: start; }
  }
</style>
