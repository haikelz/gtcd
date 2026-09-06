<script lang="ts">
  import { onMount, tick } from "svelte";
  import { Check, ChevronDown, Monitor, Moon, Sun } from "@lucide/svelte";

  type Theme = "light" | "dark" | "system";
  let {
    compact = false,
    block = false,
    up = false,
  }: { compact?: boolean; block?: boolean; up?: boolean } = $props();

  let currentTheme = $state<Theme>("system");
  let open = $state(false);
  let rootElement: HTMLDivElement | undefined = $state();
  let triggerElement: HTMLButtonElement | undefined = $state();

  const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  const activeTheme = $derived(
    themes.find((t) => t.value === currentTheme) ?? themes[2]
  );

  // Up opens above the trigger (sidebar footer); otherwise below. A block
  // trigger spans the sidebar, so its menu aligns to the left edge.
  const menuPosition = $derived(
    up
      ? "bottom-full left-0 mb-2"
      : block
        ? "top-full left-0 mt-1"
        : "top-full right-0 mt-1"
  );

  function getSystemTheme(): "light" | "dark" {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(theme: Theme) {
    const resolved = theme === "system" ? getSystemTheme() : theme;
    document.documentElement.setAttribute(
      "data-theme",
      resolved === "dark" ? "gtcd-dark" : "gtcd-light"
    );
  }

  function setTheme(theme: Theme) {
    currentTheme = theme;
    localStorage.setItem("gtcd_theme", theme);
    applyTheme(theme);
    open = false;
    triggerElement?.focus();
  }

  async function toggle() {
    open = !open;
    if (open) {
      await tick();
      rootElement
        ?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
        ?.focus();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && open) {
      open = false;
      triggerElement?.focus();
    }
  }

  onMount(() => {
    const saved = localStorage.getItem("gtcd_theme") as Theme | null;
    currentTheme = saved || "system";
    applyTheme(currentTheme);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (currentTheme === "system") applyTheme("system");
    };
    mq.addEventListener("change", handler);

    const onClick = (event: MouseEvent) => {
      if (open && rootElement && !rootElement.contains(event.target as Node)) {
        open = false;
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", handleKeydown);

    return () => {
      mq.removeEventListener("change", handler);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", handleKeydown);
    };
  });
</script>

<div
  class="relative inline-block {block ? 'w-full' : ''}"
  bind:this={rootElement}
>
  <button
    bind:this={triggerElement}
    type="button"
    class="btn btn-ghost btn-sm gap-1.5 text-muted-foreground hover:text-foreground {block
      ? 'w-full justify-between'
      : ''}"
    onclick={toggle}
    aria-haspopup="menu"
    aria-expanded={open}
    aria-label="Color theme: {activeTheme.label}"
    title="Color theme"
  >
    <span class="flex items-center gap-1.5">
      <activeTheme.icon class="h-4 w-4" strokeWidth={1.5} />
      {#if block || !compact}
        <span class="{block ? '' : 'hidden sm:inline'} text-xs font-medium"
          >{activeTheme.label}</span
        >
      {/if}
    </span>
    <ChevronDown class="h-3 w-3" aria-hidden="true" />
  </button>

  {#if open}
    <ul
      role="menu"
      aria-label="Color theme"
      class="absolute z-50 flex flex-col gap-0.5 rounded-box border border-border bg-base-100 p-1.5 shadow-lg {block
        ? 'w-full'
        : 'w-44'} {menuPosition}"
    >
      {#each themes as theme}
        <li>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={currentTheme === theme.value}
            onclick={() => setTheme(theme.value)}
            class="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors {currentTheme ===
            theme.value
              ? 'bg-base-200 text-foreground'
              : 'text-muted-foreground hover:bg-base-200 hover:text-foreground'}"
          >
            <theme.icon class="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{theme.label}</span>
            {#if currentTheme === theme.value}
              <Check class="ml-auto h-3.5 w-3.5 text-primary" />
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
