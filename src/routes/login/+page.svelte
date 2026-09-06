<script lang="ts">
  import { enhance } from "$app/forms";
  import { CircleAlert, Eye, EyeOff } from "@lucide/svelte";
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

<SEO title="Sign in" description="Sign in with your GoatCounter account to access your analytics dashboard." />

<main
  id="main-content"
  tabindex="-1"
  class="min-h-dvh flex items-center justify-center px-4 py-8"
>
  <div class="w-full max-w-sm">
    <div class="flex items-center justify-between mb-8">
      <Brand />
      <ThemeToggle compact />
    </div>

    <h1 class="text-2xl font-bold tracking-tight mb-2">Sign in</h1>
    <p class="text-sm text-muted-foreground mb-6">
      Use your GoatCounter account.
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
          <label for="email" class="block text-sm font-medium mb-2">Email</label>
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
              class="btn btn-ghost btn-sm btn-square absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
            <span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
            <span>Signing in…</span>
          {:else}
            Sign in
          {/if}
        </button>
      </div>
    </form>
  </div>
</main>
