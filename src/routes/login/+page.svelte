<script lang="ts">
  import { enhance } from "$app/forms";
  import {
    ArrowRight,
    ChartNoAxesCombined,
    CircleAlert,
    Eye,
    EyeOff,
    FileText,
    Globe,
  } from "@lucide/svelte";
  import SEO from "$lib/components/SEO.svelte";
  import Brand from "$lib/components/Brand.svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";

  let { form } = $props();
  let loading = $state(false);
  let showPassword = $state(false);
  let errorEl = $state<HTMLDivElement | null>(null);

  // Move focus to the error so keyboard and screen-reader users can act on it.
  $effect(() => {
    if (form?.error && errorEl) {
      errorEl.focus();
    }
  });
</script>

<SEO
  title="Sign in"
  description="Sign in with your GoatCounter account to access your analytics dashboard."
/>

<main id="main-content" tabindex="-1" class="login-page">
  <div class="login-shell">
    <aside class="login-story" aria-label="About your analytics workspace">
      <div class="flex items-center gap-2 text-sm">
        <ChartNoAxesCombined class="h-5 w-5" />Website analytics, with
        perspective
      </div>
      <div class="py-12">
        <p class="login-headline">Every visit.<br />A clearer picture.</p>
        <p class="mt-6 max-w-sm text-base leading-relaxed opacity-80">
          Explore the traffic, content and audience behind your website. All in
          your own workspace.
        </p>
      </div>
      <div class="login-diagram" aria-hidden="true">
        <div class="flex items-center justify-between mb-8">
          <span class="text-sm">From activity to understanding</span
          ><ChartNoAxesCombined class="h-5 w-5" />
        </div>
        <svg viewBox="0 0 360 120" class="w-full" fill="none">
          <path
            d="M0 100H360M0 60H360M0 20H360"
            stroke="currentColor"
            opacity=".12"
          />
          <path
            d="M0 99C20 99 20 74 40 74S60 89 80 89S100 48 120 48S140 64 160 64S180 28 200 28S220 46 240 46S260 16 280 16S300 30 320 30S340 8 360 8"
            stroke="var(--color-feature-accent)"
            stroke-width="3"
          />
          <circle cx="280" cy="16" r="5" fill="var(--color-chart-3)" />
        </svg>
        <div class="flex justify-between gap-3 mt-8 text-xs">
          <span class="flex items-center gap-2"
            ><ChartNoAxesCombined class="h-4 w-4" />Traffic</span
          ><span class="flex items-center gap-2"
            ><FileText class="h-4 w-4" />Content</span
          ><span class="flex items-center gap-2"
            ><Globe class="h-4 w-4" />Audience</span
          >
        </div>
      </div>
      <p class="text-xs opacity-70 mt-8">
        Powered by GoatCounter. Hosted by you.
      </p>
    </aside>
    <div class="login-form">
      <div class="flex items-center justify-between mb-8">
        <Brand />
        <ThemeToggle compact />
      </div>

      <p class="text-sm text-muted-foreground mb-2">Welcome back</p>
      <h1 class="text-3xl font-medium tracking-tight mb-3">
        Open your workspace
      </h1>
      <p class="text-sm text-muted-foreground mb-8">
        Sign in with your existing GoatCounter account.
      </p>

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
        <div class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium mb-2"
              >Email</label
            >
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              class="input input-bordered w-full"
              required
              autocomplete="email"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium mb-2"
              >Password</label
            >
            <div class="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Your GoatCounter password"
                class="input input-bordered w-full pr-11"
                required
                autocomplete="current-password"
              />
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-square absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground tooltip tooltip-left"
                data-tip={showPassword ? "Hide password" : "Show password"}
                onclick={() => (showPassword = !showPassword)}
                aria-pressed={showPassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {#if showPassword}
                  <EyeOff class="h-4 w-4" />
                {:else}
                  <Eye class="h-4 w-4" />
                {/if}
              </button>
            </div>
          </div>

          {#if form?.error}
            <div
              role="alert"
              tabindex="-1"
              bind:this={errorEl}
              class="alert alert-error text-sm font-medium focus:outline-none"
            >
              <CircleAlert class="h-4 w-4 shrink-0" />
              <span>{form.error}</span>
            </div>
          {/if}

          <button
            type="submit"
            class="btn btn-primary w-full"
            disabled={loading}
          >
            {#if loading}
              <span
                class="loading loading-spinner loading-sm"
                aria-hidden="true"
              ></span>
              <span>Signing in…</span>
            {:else}
              Sign in <ArrowRight class="h-4 w-4" />
            {/if}
          </button>
        </div>
      </form>
      <p
        class="text-xs text-muted-foreground mt-8 pt-6 border-t border-border leading-relaxed"
      >
        Your analytics stay connected to your GoatCounter instance. No separate
        account needed.
      </p>
    </div>
  </div>
</main>

<style>
  .login-page {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 2rem;
  }
  .login-shell {
    width: 100%;
    max-width: 72rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-radius: 1.5rem;
    overflow: hidden;
    border: 1px solid var(--color-border);
    background: var(--color-base-100);
  }
  .login-story {
    background: var(--color-feature);
    color: var(--color-feature-content);
    padding: 3rem;
  }
  .login-headline {
    font-size: 3rem;
    letter-spacing: -0.04em;
    line-height: 1.1;
    font-weight: 500;
  }
  .login-diagram {
    padding: 1.5rem;
    border: 1px solid
      color-mix(in oklch, var(--color-feature-accent) 25%, transparent);
    border-radius: var(--radius-box);
    background: color-mix(
      in oklch,
      var(--color-feature-accent) 8%,
      transparent
    );
  }
  .login-form {
    padding: 3rem;
    align-self: center;
  }
  @media (max-width: 1023px) {
    .login-shell {
      max-width: 30rem;
      grid-template-columns: 1fr;
    }
    .login-story {
      display: none;
    }
  }
  @media (max-width: 639px) {
    .login-page {
      padding: 1rem;
    }
    .login-form {
      padding: 1.5rem;
    }
  }
</style>
