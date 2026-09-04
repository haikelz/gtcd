<script lang="ts">
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";

  let { form } = $props();
  let loading = $state(false);
</script>

<svelte:head>
  <title>Sign In — gtcd</title>
</svelte:head>

<main
  id="main-content"
  tabindex="-1"
  class="min-h-screen flex items-center justify-center px-4 py-8 bg-background relative"
>
  <!-- Background blobs -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
    <div
      class="absolute top-0 left-1/3 w-[500px] h-[500px] bg-primary/[0.04] rounded-full blur-3xl"
    ></div>
    <div
      class="absolute bottom-0 right-1/3 w-[500px] h-[500px] bg-primary/[0.04] rounded-full blur-3xl"
    ></div>
  </div>

  <div class="w-full max-w-md relative">
    <!-- Theme toggle -->
    <div class="flex justify-end mb-6 sm:mb-8">
      <ThemeToggle />
    </div>

    <!-- Header -->
    <header class="text-center mb-6 sm:mb-8">
      <div
        class="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/20"
      >
        <span class="text-primary-content font-bold text-xl">G</span>
      </div>
      <h1 class="text-2xl font-extrabold tracking-tight mb-2 text-foreground">
        Sign in to Dashboard
      </h1>
      <p class="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
        Enter your GoatCounter credentials to access your analytics.
      </p>
    </header>

    <!-- Form card -->
    <div
      class="bg-base-100 rounded-2xl border border-border shadow-xl shadow-black/[0.04] overflow-hidden"
    >
      <form
        method="POST"
        action="?/login"
        use:enhance={() => {
          loading = true;
          return async ({ result }) => {
            loading = false;
            if (result.type === "redirect") {
              goto(result.location);
            }
          };
        }}
      >
        <div class="p-5 sm:p-6 space-y-4 sm:space-y-5">
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
              class="input input-bordered w-full rounded-xl"
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
              class="input input-bordered w-full rounded-xl"
              required
              autocomplete="current-password"
            />
          </div>

          {#if form?.error}
            <div
              role="alert"
              class="bg-error/10 border border-error/30 rounded-xl p-3 text-error text-sm font-medium flex items-center gap-2"
            >
              <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{form.error}</span>
            </div>
          {/if}

          <button
            type="submit"
            class="btn btn-primary w-full rounded-xl text-base"
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
    </div>

    <!-- Help text -->
    <div class="mt-5 sm:mt-6 text-center">
      <p class="text-muted-foreground text-xs leading-relaxed">
        Use the email and password from your <strong
          class="text-foreground font-semibold">GoatCounter account</strong
        >.
      </p>
    </div>
  </div>
</main>
