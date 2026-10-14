<script lang="ts" module>
  type Turnstile = {
    remove(widgetId: string): void;
    render(container: HTMLElement, options: Record<string, unknown>): string;
  };

  const TURNSTILE_SRC =
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

  let turnstileLoad: Promise<Turnstile> | null = null;

  /** Loads Cloudflare's script once; a failed load can be retried. */
  function loadTurnstile(): Promise<Turnstile> {
    const win = window as Window & { turnstile?: Turnstile };
    turnstileLoad ??= new Promise<Turnstile>((resolve, reject) => {
      const script = document.createElement("script");
      script.async = true;
      script.src = TURNSTILE_SRC;
      script.onload = () =>
        win.turnstile ? resolve(win.turnstile) : reject(new Error("no API"));
      script.onerror = () => {
        script.remove();
        reject(new Error("Turnstile script failed to load"));
      };
      document.head.append(script);
    }).catch((error: unknown) => {
      turnstileLoad = null;
      throw error;
    });
    return turnstileLoad;
  }
</script>

<script lang="ts">
  import { enhance } from "$app/forms";
  import Brand from "$lib/components/Brand.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import { Alert, AlertAction, AlertTitle } from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import {
    Frame,
    FrameDescription,
    FrameHeader,
    FramePanel,
  } from "$lib/components/ui/frame";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { currentLocale, t } from "$lib/display";
  import {
    ArrowRight,
    CircleAlert,
    Eye,
    EyeOff,
    LoaderCircle,
  } from "@lucide/svelte";

  let { data, form } = $props();
  let challengeAttempt = $state(0);
  let challengeError = $state(false);
  let challengeEl = $state<HTMLDivElement | null>(null);
  let challengeToken = $state("");
  let codeEl = $state<HTMLInputElement | null>(null);
  let loading = $state(false);
  let showPassword = $state(false);
  let errorEl = $state<HTMLDivElement | null>(null);

  // Move focus to the error so keyboard and screen-reader users can act on it.
  $effect(() => {
    if (form?.error && errorEl) {
      errorEl.focus();
    }
  });

  // Land on the code field when the two-factor step appears.
  $effect(() => {
    if (data.mfaEmail && codeEl && !form?.error) codeEl.focus();
  });

  // Re-render the widget when the page theme changes.
  $effect(() => {
    if (!data.turnstileSiteKey) return;

    const root = document.documentElement;
    let dark = root.classList.contains("dark");
    const observer = new MutationObserver(() => {
      if (root.classList.contains("dark") === dark) return;
      dark = !dark;
      challengeAttempt++;
    });

    observer.observe(root, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  });

  // Tokens are single-use, so each attempt renders a fresh widget.
  $effect(() => {
    const container = challengeEl;
    const siteKey = data.turnstileSiteKey;
    void challengeAttempt;
    if (!container || !siteKey) return;

    let cancelled = false;
    let remove = () => {};
    challengeToken = "";
    challengeError = false;

    loadTurnstile().then(
      (turnstile) => {
        if (cancelled) return;
        const widgetId = turnstile.render(container, {
          action: "login",
          callback: (token: string) => (challengeToken = token),
          "error-callback": () => {
            challengeToken = "";
            challengeError = true;
          },
          "expired-callback": () => (challengeToken = ""),
          language: currentLocale(),
          sitekey: siteKey,
          size: "flexible",
          theme: document.documentElement.classList.contains("dark")
            ? "dark"
            : "light",
        });
        remove = () => turnstile.remove(widgetId);
      },
      () => {
        if (!cancelled) challengeError = true;
      }
    );

    return () => {
      cancelled = true;
      remove();
    };
  });
</script>

<SEO description={t("auth.seoDescription")} title={t("auth.signIn")} />

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
          <h1 class="text-lg font-semibold tracking-tight">
            {data.mfaEmail ? t("auth.mfaTitle") : t("auth.welcome")}
          </h1>
          <FrameDescription>
            {data.mfaEmail
              ? t("auth.mfaIntro", { email: data.mfaEmail })
              : t("auth.intro")}
          </FrameDescription>
        </FrameHeader>
        <FramePanel>
          {#if data.mfaEmail}
            {@render mfaForm()}
          {:else}
            {@render passwordForm()}
          {/if}
        </FramePanel>
      </Frame>
      <p class="px-2 text-center text-xs leading-relaxed text-muted-foreground">
        {t("auth.footnote")}
      </p>
    </div>
  </div>
</main>

{#snippet errorAlert()}
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
{/snippet}

{#snippet submitButton(label: string, pendingLabel: string, disabled: boolean)}
  <Button class="w-full" disabled={loading || disabled} size="lg" type="submit">
    {#if loading}
      <LoaderCircle aria-hidden="true" class="animate-spin" />
      <span>{pendingLabel}</span>
    {:else}
      <span>{label}</span>
      <ArrowRight aria-hidden="true" />
    {/if}
  </Button>
{/snippet}

{#snippet mfaForm()}
  <div class="grid gap-3">
    <form
      action="?/totp"
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
        <Label for="code">{t("auth.mfaCode")}</Label>
        <Input
          autocomplete="one-time-code"
          bind:ref={codeEl}
          class="font-mono tracking-widest tabular-nums"
          id="code"
          inputmode="numeric"
          maxlength={6}
          name="code"
          pattern={"[0-9]{6}"}
          placeholder="123456"
          required
        />
      </div>
      {@render errorAlert()}
      {@render submitButton(t("auth.mfaVerify"), t("auth.mfaVerifying"), false)}
    </form>
    <form action="?/cancelMfa" method="POST" use:enhance>
      <Button class="w-full" type="submit" variant="ghost">
        {t("auth.mfaBack")}
      </Button>
    </form>
  </div>
{/snippet}

{#snippet passwordForm()}
  <form
    action="?/login"
    class="grid gap-5"
    method="POST"
    use:enhance={() => {
      loading = true;
      return async ({ result, update }) => {
        try {
          await update();
        } finally {
          loading = false;
          if (result.type === "failure") challengeAttempt++;
        }
      };
    }}
  >
    <div class="grid gap-2">
      <Label for="email">{t("auth.email")}</Label>
      <Input
        autocomplete="email"
        id="email"
        name="email"
        placeholder={t("auth.emailPlaceholder")}
        required
        type="email"
      />
    </div>
    <div class="grid gap-2">
      <div class="flex items-center justify-between gap-2">
        <Label for="password">{t("auth.password")}</Label>
        {#if data.passwordResetUrl}
          <a
            class="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-"
            href={data.passwordResetUrl}
          >
            {t("auth.forgotPassword")}
          </a>
        {/if}
      </div>
      <div class="relative">
        <Input
          autocomplete="current-password"
          class="pr-9"
          id="password"
          name="password"
          placeholder={t("auth.passwordPlaceholder")}
          required
          type={showPassword ? "text" : "password"}
        />
        <Button
          aria-label={showPassword
            ? t("auth.hidePassword")
            : t("auth.showPassword")}
          aria-pressed={showPassword}
          class="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
          onclick={() => (showPassword = !showPassword)}
          size="icon-xs"
          title={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
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
    {#if data.turnstileSiteKey}
      <div class="flex flex-col gap-2">
        <div bind:this={challengeEl} class="min-h-[65px]"></div>
        {#if challengeError}
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle class="line-clamp-none">
              {t("auth.challengeError")}
            </AlertTitle>
            <AlertAction>
              <Button
                onclick={() => challengeAttempt++}
                size="xs"
                variant="outline"
              >
                {t("auth.challengeRetry")}
              </Button>
            </AlertAction>
          </Alert>
        {/if}
      </div>
    {/if}
    {@render errorAlert()}
    {@render submitButton(
      t("auth.signIn"),
      t("auth.signingIn"),
      data.turnstileSiteKey !== null && !challengeToken
    )}
  </form>
{/snippet}
