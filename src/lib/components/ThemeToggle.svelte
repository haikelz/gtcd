<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
  } from "$lib/components/ui/dropdown-menu";
  import { t } from "$lib/display";
  import { ChevronsUpDown, Monitor, Moon, Sun } from "@lucide/svelte";
  import { onMount } from "svelte";

  type Theme = "light" | "dark" | "system";

  type ThemeToggleProps = {
    /** Stretch the trigger to its container (sidebar footer). */
    readonly block?: boolean;
    /** Show only the icon on small screens. */
    readonly compact?: boolean;
    /** Open the menu above the trigger. */
    readonly up?: boolean;
  };

  const THEMES = $derived([
    { icon: Sun, label: t("shell.themeLight"), value: "light" },
    { icon: Moon, label: t("shell.themeDark"), value: "dark" },
    { icon: Monitor, label: t("shell.themeSystem"), value: "system" },
  ] as const);

  let {
    block = false,
    compact = false,
    up = false,
  }: ThemeToggleProps = $props();

  let currentTheme = $state<Theme>("system");

  const activeTheme = $derived(
    THEMES.find((theme) => theme.value === currentTheme) ?? THEMES[2]
  );

  function isTheme(value: string | null): value is Theme {
    return value === "light" || value === "dark" || value === "system";
  }

  function applyTheme(theme: Theme) {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const resolved =
      theme === "system" ? (prefersDark ? "dark" : "light") : theme;

    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.style.colorScheme = resolved;
  }

  function handleThemeChange(value: string) {
    if (!isTheme(value)) return;

    currentTheme = value;
    localStorage.setItem("gtcd_theme", value);
    applyTheme(value);
  }

  onMount(() => {
    const saved = localStorage.getItem("gtcd_theme");
    currentTheme = isTheme(saved) ? saved : "system";
    applyTheme(currentTheme);

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function handleSystemChange() {
      if (currentTheme === "system") applyTheme("system");
    }

    media.addEventListener("change", handleSystemChange);
    return () => media.removeEventListener("change", handleSystemChange);
  });
</script>

<DropdownMenu>
  <DropdownMenuTrigger>
    {#snippet child({ props })}
      <Button
        {...props}
        aria-label={t("shell.colorThemeCurrent", { theme: activeTheme.label })}
        class={block ? "w-full justify-between" : undefined}
        size="sm"
        title={t("shell.colorTheme")}
        variant="ghost"
      >
        <span class="flex items-center gap-1.5">
          <activeTheme.icon />
          <span class={compact && !block ? "max-sm:sr-only" : undefined}>
            {activeTheme.label}
          </span>
        </span>
        <ChevronsUpDown class="text-muted-foreground" />
      </Button>
    {/snippet}
  </DropdownMenuTrigger>
  <DropdownMenuContent
    align={block ? "start" : "end"}
    class={block ? undefined : "w-40"}
    side={up ? "top" : "bottom"}
  >
    <DropdownMenuLabel>{t("shell.colorTheme")}</DropdownMenuLabel>
    <DropdownMenuRadioGroup
      onValueChange={handleThemeChange}
      value={currentTheme}
    >
      {#each THEMES as theme (theme.value)}
        <DropdownMenuRadioItem value={theme.value}>
          <theme.icon />
          {theme.label}
        </DropdownMenuRadioItem>
      {/each}
    </DropdownMenuRadioGroup>
  </DropdownMenuContent>
</DropdownMenu>
