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
    <svg class="size-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 18V12M9.3 18V5M14.7 18V9M20 18V3"
        stroke="currentColor"
        stroke-width="2.5"
      />
    </svg>
  </span>
  <span>gtcd</span>
</a>
