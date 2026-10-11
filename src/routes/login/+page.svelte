<script lang="ts">
  import { enhance } from "$app/forms";
  import Brand from "$lib/components/Brand.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import { Alert, AlertTitle } from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import {
    Frame,
    FrameDescription,
    FrameHeader,
    FramePanel,
  } from "$lib/components/ui/frame";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import {
    ArrowRight,
    CircleAlert,
    Eye,
    EyeOff,
    LoaderCircle,
  } from "@lucide/svelte";

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
  description="Sign in with your GoatCounter account to access your analytics dashboard."
  title="Sign in"
/>

<main
  class="flex min-h-dvh flex-col bg-background px-4 py-4 sm:px-6"
  id="main-content"
  tabindex="-1"
>
  <header class="flex items-center justify-between gap-4">
    <Brand />
    <ThemeToggle compact />
  </header>
  <div class="flex flex-1 items-center justify-center py-10">
    <div class="flex w-full max-w-sm flex-col gap-4">
      <Frame spacing="lg">
        <FrameHeader class="gap-1 pt-3">
          <h1 class="text-lg font-semibold tracking-tight">Welcome back</h1>
          <FrameDescription>
            Sign in with your existing GoatCounter account.
          </FrameDescription>
        </FrameHeader>
        <FramePanel>
          <form
            action="?/login"
            class="grid gap-5"
            method="POST"
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
            <div class="grid gap-2">
              <Label for="email">Email</Label>
              <Input
                autocomplete="email"
                id="email"
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </div>
            <div class="grid gap-2">
              <Label for="password">Password</Label>
              <div class="relative">
                <Input
                  autocomplete="current-password"
                  class="pr-9"
                  id="password"
                  name="password"
                  placeholder="Your GoatCounter password"
                  required
                  type={showPassword ? "text" : "password"}
                />
                <Button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  class="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
                  onclick={() => (showPassword = !showPassword)}
                  size="icon-xs"
                  title={showPassword ? "Hide password" : "Show password"}
                  variant="ghost"
                >
                  {#if showPassword}
                    <EyeOff />
                  {:else}
                    <Eye />
                  {/if}
                </Button>
              </div>
            </div>
            {#if form?.error}
              <Alert
                bind:ref={errorEl}
                class="focus:outline-none"
                tabindex={-1}
                variant="destructive"
              >
                <CircleAlert />
                <AlertTitle class="line-clamp-none">{form.error}</AlertTitle>
              </Alert>
            {/if}
            <Button class="w-full" disabled={loading} size="lg" type="submit">
              {#if loading}
                <LoaderCircle aria-hidden="true" class="animate-spin" />
                <span>Signing in…</span>
              {:else}
                <span>Sign in</span>
                <ArrowRight aria-hidden="true" />
              {/if}
            </Button>
          </form>
        </FramePanel>
      </Frame>
      <p class="px-2 text-center text-xs leading-relaxed text-muted-foreground">
        Your analytics stay connected to your GoatCounter instance. No separate
        account needed.
      </p>
    </div>
  </div>
</main>
