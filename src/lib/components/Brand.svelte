<script lang="ts">
  import { resolve } from "$app/paths";
  import { t } from "$lib/display";
</script>

<a
  aria-label={t("shell.brandLabel")}
  class="inline-flex items-center gap-2 rounded-md text-sm font-semibold tracking-tight text-foreground"
  href={resolve("/")}
>
  <span
    aria-hidden="true"
    class="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground"
  >
    <!-- The horn mark; static/favicon.svg and the PNG icons draw the same path. -->
    <svg class="size-4" fill="none" viewBox="0 0 100 100">
      <path
        d="M21.5 79C21.5 48 37.5 21 60.5 21C74.5 21 81.5 33 77.5 44C73.5 54 59.5 55 56.5 44"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-width="12"
      />
    </svg>
  </span>
  <span>gtcd</span>
</a>
