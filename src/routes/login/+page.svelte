<script lang="ts">
  import { enhance } from "$app/forms";
  import SEO from "$lib/components/SEO.svelte";
  import Brand from "$lib/components/Brand.svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";

  let { form } = $props();
  let loading = $state(false);
  let errorEl = $state<HTMLDivElement | null>(null);

  // Move focus to the error so keyboard and screen-reader users can act on it.
  $effect(() => {
    if (form?.error && errorEl) {
      errorEl.focus();
    }
  });
</script>

<SEO title="Sign in" description="Sign in with your GoatCounter account to explore your website analytics." />

<main id="main-content" tabindex="-1" class="login-page">
  <section class="login-story" aria-label="About your workspace">
    <Brand />
    <div class="login-story-copy">
      <p class="eyebrow mb-6">Your analytics workspace</p>
      <h2>The whole picture.<br /><span class="text-primary">One place to look.</span></h2>
      <p class="text-muted-foreground leading-relaxed mt-6 max-w-sm">Follow the traffic. Understand your audience. Find the pages that matter.</p>
      <div class="login-index">
        <p><span>01</span> Traffic & trends</p>
        <p><span>02</span> Audience & devices</p>
        <p><span>03</span> Pages & referrers</p>
      </div>
    </div>
    <p class="text-xs text-muted-foreground">Your GoatCounter data. Your own perspective.</p>
  </section>
  <section class="login-form-section" aria-labelledby="login-title">
    <div class="login-toolbar"><a href="/" class="section-link">← Back to home</a><ThemeToggle /></div>
    <div class="login-form">
      <p class="eyebrow mb-4">Welcome back</p>
      <h1 id="login-title" class="text-3xl font-medium tracking-tight">Get into the details.</h1>
      <p class="text-sm text-muted-foreground leading-relaxed mt-3 mb-8">Sign in with your GoatCounter account to open your analytics workspace.</p>
      <form
        method="POST"
        action="?/login"
        use:enhance={() => {
          loading = true;
          return async ({ update }) => {
            try {
              await update();
            } finally {
              loading = false;
            }
          };
        }}
      >
        <div class="space-y-5">
          <div>
            <label
              for="email"
              class="block text-foreground text-sm font-medium mb-2"
              >Email</label
            >
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              class="input input-bordered w-full rounded-md"
              required
              autocomplete="email"
            />
          </div>

          <div>
            <label
              for="password"
              class="block text-foreground text-sm font-medium mb-2"
              >Password</label
            >
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Your GoatCounter password"
              class="input input-bordered w-full rounded-md"
              required
              autocomplete="current-password"
            />
          </div>

          {#if form?.error}
            <div
              role="alert"
              tabindex="-1"
              bind:this={errorEl}
              class="alert alert-error text-sm font-medium focus:outline-none"
            >
              <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{form.error}</span>
            </div>
          {/if}

          <button
            type="submit"
            class="btn btn-primary w-full rounded-md text-base"
            disabled={loading}
          >
            {#if loading}
              <span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
              <span>Signing in…</span>
            {:else}
              Sign in <span aria-hidden="true">→</span>
            {/if}
          </button>
        </div>
      </form>
      <p class="text-xs text-muted-foreground leading-relaxed mt-6 pt-6 border-t border-border">Use the email and password for your existing GoatCounter account. No separate account needed.</p>
    </div>
    <p class="text-xs text-muted-foreground text-center">A clearer view starts here.</p>
  </section>
</main>

<style>
  .login-page { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); min-height: 100dvh; background: var(--color-base-100); }
  .login-story { display: flex; flex-direction: column; justify-content: space-between; padding: 3rem; background: var(--color-base-200); border-right: 1px solid var(--color-border); }
  .login-story-copy { padding-block: 5rem; }
  .login-story h2 { font-size: clamp(2rem, 4vw, 3.5rem); font-weight: 500; letter-spacing: -0.06em; line-height: 1.15; }
  .login-index { margin-top: 3rem; max-width: 24rem; }
  .login-index p { display: flex; gap: 1.5rem; padding-block: 1rem; border-top: 1px solid var(--color-border); font-size: 0.875rem; }
  .login-index span { font-family: var(--font-mono); color: var(--color-primary); font-size: 0.75rem; }
  .login-form-section { display: flex; flex-direction: column; justify-content: space-between; padding: 2rem; gap: 3rem; }
  .login-toolbar { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between; }
  .login-form { width: min(100%, 25rem); margin-inline: auto; }
  @media (max-width: 767px) {
    .login-page { grid-template-columns: minmax(0, 1fr); }
    .login-story { display: none; }
    .login-form-section { padding: 1rem 1.5rem 2rem; min-height: 100dvh; }
  }
</style>
