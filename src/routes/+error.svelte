<script lang="ts">
  import { page } from "$app/state";
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

  const is404 = $derived(status === 404);
</script>

<svelte:head>
  <title>{title} — gtcd</title>
</svelte:head>

<main
  id="main-content"
  tabindex="-1"
  class="min-h-screen flex items-center justify-center px-4 bg-background relative"
>
  <!-- Background blobs -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
    <div
      class="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full blur-3xl bg-primary/5"
    ></div>
    <div
      class="absolute bottom-0 right-1/3 w-[500px] h-[500px] rounded-full blur-3xl bg-primary/5"
    ></div>
  </div>

  <div class="w-full max-w-md relative animate-fade-in">
    <!-- Theme toggle -->
    <div class="flex justify-end mb-8">
      <ThemeToggle />
    </div>

    <div class="text-center">
      <!-- Status code -->
      <div class="mb-6" aria-hidden="true">
        <span
          class="text-7xl sm:text-8xl font-extrabold tracking-tighter text-primary/20 select-none"
        >
          {status}
        </span>
      </div>

      <!-- Icon -->
      <div class="flex justify-center mb-6" aria-hidden="true">
        {#if is404}
          <div
            class="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary/10 text-primary"
          >
            <svg
              class="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
        {:else if status === 403}
          <div
            class="w-16 h-16 rounded-2xl flex items-center justify-center bg-error/10 text-error"
          >
            <svg
              class="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
        {:else if status >= 500}
          <div
            class="w-16 h-16 rounded-2xl flex items-center justify-center bg-error/10 text-error"
          >
            <svg
              class="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
        {:else}
          <div
            class="w-16 h-16 rounded-2xl flex items-center justify-center bg-warning/10 text-warning"
          >
            <svg
              class="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
        {/if}
      </div>

      <!-- Title -->
      <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3 text-foreground">
        {title}
      </h1>

      <!-- Description -->
      <p class="text-sm sm:text-base leading-relaxed mb-8 max-w-sm mx-auto text-muted-foreground">
        {description}
      </p>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
        <a
          href="/"
          class="btn btn-primary rounded-xl text-sm px-6 w-full sm:w-auto text-center no-underline"
        >
          Go Home
        </a>
        <button
          type="button"
          class="btn btn-outline rounded-xl text-sm px-6 w-full sm:w-auto cursor-pointer"
          onclick={() => history.back()}
        >
          Go Back
        </button>
      </div>

      <!-- Debug info (only when available) -->
      {#if message && message !== "Not Found" && !is404}
        <div
          class="mt-8 rounded-xl p-4 text-left bg-base-200 border border-border"
        >
          <p
            class="text-[0.6875rem] font-semibold uppercase tracking-wider mb-2 text-muted-foreground"
          >
            Details
          </p>
          <p class="text-xs font-mono text-muted-foreground">
            {message}
          </p>
        </div>
      {/if}
    </div>
  </div>
</main>
