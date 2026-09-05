<script lang="ts">
  import { page } from "$app/state";
  import Brand from "$lib/components/Brand.svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";

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
    if (status === 403)
      return "You don't have permission to access this resource.";
    if (status === 500) return "An unexpected error occurred on the server.";
    if (status === 401) return "Please sign in to continue.";
    return message;
  });

</script>

<svelte:head><title>{title} — gtcd</title><meta name="robots" content="noindex" /></svelte:head>

<main id="main-content" tabindex="-1" class="min-h-dvh flex flex-col px-6 sm:px-12 bg-base-100">
  <header class="flex flex-wrap items-center justify-between gap-4 py-6"><Brand /><ThemeToggle /></header>
  <div class="flex-1 flex items-center justify-center py-16">
    <div class="w-full max-w-xl">
      <p class="eyebrow mb-6">Error {status}</p>
      <h1 class="text-4xl sm:text-5xl font-medium tracking-tight mb-6">{title}</h1>
      <p class="text-base text-muted-foreground leading-relaxed max-w-md">{description}</p>
      <div class="flex flex-wrap gap-4 mt-8">
        <a href="/" class="btn btn-primary px-6">Back to home <span aria-hidden="true">↗</span></a>
        <button type="button" class="btn btn-ghost" onclick={() => history.back()}>Previous page</button>
      </div>
    </div>
  </div>
  <footer class="py-6 border-t border-border text-xs text-muted-foreground">gtcd · Website analytics</footer>
</main>
