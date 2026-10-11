<script lang="ts">
  import { page } from "$app/state";
  import Brand from "$lib/components/Brand.svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { ArrowLeft, ArrowRight } from "@lucide/svelte";

  const status = $derived(page.status);
  const message = $derived(
    page.error && typeof page.error === "object" && "message" in page.error
      ? (page.error as { message: string }).message
      : "Something went wrong"
  );

  const title = $derived.by(() => {
    if (status === 404) return "Page not found";
    if (status === 403) return "Access denied";
    if (status === 500) return "Server error";
    if (status === 401) return "Unauthorized";
    return `Error ${status}`;
  });

  const description = $derived.by(() => {
    if (status === 404)
      return "The page you're looking for doesn't exist or has been moved.";
    if (status === 403) return message;
    if (status === 500) return "An unexpected error occurred on the server.";
    if (status === 401) return "Please sign in to continue.";
    return message;
  });
</script>

<svelte:head>
  <title>{title} — gtcd</title>
  <meta content="noindex" name="robots" />
</svelte:head>

<main
  class="flex min-h-dvh flex-col bg-background px-4 sm:px-6"
  id="main-content"
  tabindex="-1"
>
  <header class="flex items-center justify-between gap-4 py-4">
    <Brand />
    <ThemeToggle compact />
  </header>
  <div class="flex flex-1 items-center justify-center py-16">
    <div class="flex w-full max-w-lg flex-col items-start gap-4">
      <Badge variant="outline">Error {status}</Badge>
      <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p class="max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <div class="mt-2 flex flex-wrap gap-2">
        <Button href="/">
          Continue
          <ArrowRight aria-hidden="true" />
        </Button>
        <Button onclick={() => history.back()} variant="outline">
          <ArrowLeft aria-hidden="true" />
          Previous page
        </Button>
      </div>
    </div>
  </div>
  <footer class="border-t py-4 text-xs text-muted-foreground">
    gtcd · Website analytics
  </footer>
</main>
