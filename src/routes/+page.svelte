<script lang="ts">
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";

  let { data } = $props();

  const features = [
    {
      icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>`,
      title: "Overview Dashboard",
      description: "KPI cards, traffic charts, and breakdowns at a glance.",
    },
    {
      icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>`,
      title: "Drill-Down Analytics",
      description: "Click any item to see versions, regions, and referrers.",
    },
    {
      icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>`,
      title: "Privacy-First",
      description: "Self-hosted dashboard. No tracking scripts on your site.",
    },
    {
      icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" /></svg>`,
      title: "Dark Mode",
      description: "Light, dark, and system themes built in.",
    },
    {
      icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>`,
      title: "Date Filtering",
      description: "Today, 7 days, 30 days, 90 days, or month views.",
    },
    {
      icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>`,
      title: "Full Breakdowns",
      description: "Browsers, OS, locations, languages, devices, campaigns.",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Sign In",
      description: "Enter your GoatCounter email and password.",
    },
    {
      num: "02",
      title: "Explore",
      description: "Browse your analytics across all dimensions.",
    },
    {
      num: "03",
      title: "Drill Down",
      description: "Click any stat to see detailed breakdowns.",
    },
  ];
</script>

<svelte:head>
  <title>gtcd — Custom Dashboard for GoatCounter</title>
  <meta
    name="description"
    content="A modern, self-hosted analytics dashboard for GoatCounter. Privacy-first, beautiful, and fast."
  />
</svelte:head>

<div class="min-h-screen bg-background">
  <!-- Nav -->
  <nav
    class="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-50"
  >
    <div
      class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
    >
      <a href="/" class="flex items-center gap-2.5 no-underline">
        <div
          class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/20"
        >
          <span class="text-primary-content font-bold text-sm">G</span>
        </div>
        <span class="text-foreground font-bold text-lg tracking-tight"
          >gtcd</span
        >
      </a>
      <div class="flex items-center gap-3 sm:gap-4">
        <ThemeToggle />
        {#if data.authenticated}
          <a href="/dashboard" class="btn-primary-custom text-sm">Dashboard →</a
          >
        {:else}
          <a href="/login" class="btn-primary-custom text-sm">Sign In →</a>
        {/if}
      </div>
    </div>
  </nav>

  <!-- Hero -->
  <section class="relative overflow-hidden">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/8 rounded-full blur-3xl"
      ></div>
    </div>
    <div
      class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 sm:pt-28 sm:pb-24 text-center relative"
    >
      <div
        class="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
        Open Source Analytics Dashboard
      </div>
      <h1
        class="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6"
      >
        Your GoatCounter data,<br class="hidden sm:block" />
        <span class="text-primary">beautifully presented</span>
      </h1>
      <p
        class="text-muted-foreground text-base sm:text-xl max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed"
      >
        A modern, self-hosted analytics dashboard for GoatCounter.
        Privacy-first, dark mode, drill-down analytics — all in one place.
      </p>
      <div
        class="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
      >
        <a
          href="/login"
          class="btn-primary-custom text-base px-6 py-3 w-full sm:w-auto"
        >
          Sign In →
        </a>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener"
          class="btn-ghost-custom text-base px-6 py-3 w-full sm:w-auto"
        >
          View Source
        </a>
      </div>
    </div>
  </section>

  <!-- Features grid -->
  <section class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-24">
    <div class="text-center mb-10 sm:mb-12">
      <p class="eyebrow mb-2">Features</p>
      <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
        Everything you need
      </h2>
    </div>
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {#each features as feature}
        <div class="card-hover group">
          <div
            class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-primary-content transition-colors duration-200"
          >
            {@html feature.icon}
          </div>
          <h3 class="text-foreground font-semibold text-sm mb-1.5">
            {feature.title}
          </h3>
          <p class="text-muted-foreground text-sm leading-relaxed">
            {feature.description}
          </p>
        </div>
      {/each}
    </div>
  </section>

  <!-- How it works -->
  <section class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-24">
    <div class="text-center mb-10 sm:mb-12">
      <p class="eyebrow mb-2">How it works</p>
      <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
        Three steps
      </h2>
    </div>
    <div class="grid sm:grid-cols-3 gap-8">
      {#each steps as step}
        <div class="text-center sm:text-left">
          <span class="text-primary font-mono text-3xl font-extrabold"
            >{step.num}</span
          >
          <h3 class="text-foreground font-bold text-lg mt-2 mb-1">
            {step.title}
          </h3>
          <p class="text-muted-foreground text-sm leading-relaxed">
            {step.description}
          </p>
        </div>
      {/each}
    </div>
  </section>

  <!-- CTA -->
  <section class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-24">
    <div
      class="bg-primary/5 border border-primary/10 rounded-2xl p-6 sm:p-12 text-center"
    >
      <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
        Ready to get started?
      </h2>
      <p class="text-muted-foreground text-base mb-6 sm:mb-8 max-w-lg mx-auto">
        Sign in with your GoatCounter credentials. No sign-up required.
      </p>
      <a href="/login" class="btn-primary-custom text-base px-6 py-3"
        >Sign In →</a
      >
    </div>
  </section>

  <!-- Footer -->
  <footer class="border-t border-border py-8">
    <div
      class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4"
    >
      <p class="text-muted-foreground text-xs">
        Built with SvelteKit + GoatCounter
      </p>
      <div class="flex items-center gap-4">
        <a
          href="https://www.goatcounter.com/"
          target="_blank"
          rel="noopener"
          class="text-muted-foreground text-xs hover:text-foreground transition-colors no-underline"
          >GoatCounter</a
        >
        <a
          href="/login"
          class="text-muted-foreground text-xs hover:text-foreground transition-colors no-underline"
          >Sign In</a
        >
      </div>
    </div>
  </footer>
</div>
