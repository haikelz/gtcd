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

<div
  class="min-h-screen flex items-center justify-center px-4 py-8 bg-background"
>
  <!-- Background blobs -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none">
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
        class="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/25"
      >
        <span class="text-primary-content font-bold text-xl">G</span>
      </div>
      <h1 class="text-2xl font-extrabold tracking-tight mb-2">
        Sign in to Dashboard
      </h1>
      <p class="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
        Enter your GoatCounter credentials to access your analytics.
      </p>
    </header>

    <!-- Form card -->
    <div
      class="bg-base-100 rounded-2xl border border-border shadow-xl shadow-black/[0.04] overflow-hidden dark:shadow-black/20"
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
              class="w-full text-foreground text-sm rounded-lg border border-border bg-background px-3.5 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40"
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
              class="w-full text-foreground text-sm rounded-lg border border-border bg-background px-3.5 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40"
              required
              autocomplete="current-password"
            />
          </div>

          {#if form?.error}
            <div
              class="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3"
            >
              <p class="text-red-600 dark:text-red-400 text-sm font-medium">
                {form.error}
              </p>
            </div>
          {/if}

          <button
            type="submit"
            class="btn-primary-custom w-full"
            disabled={loading}
          >
            {#if loading}
              <span class="flex items-center justify-center gap-2">
                <div
                  class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                ></div>
                Signing in…
              </span>
            {:else}
              Sign in →
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
</div>
