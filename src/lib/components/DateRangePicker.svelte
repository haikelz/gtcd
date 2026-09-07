<script lang="ts">
  import { page } from "$app/state";
  let {
    value = "7d",
    onchange,
  }: {
    value?: string;
    onchange?: (preset: string) => void;
  } = $props();

  const presets = [
    { label: "Today", value: "today" },
    { label: "7 days", value: "7d" },
    { label: "30 days", value: "30d" },
    { label: "90 days", value: "90d" },
    { label: "Month", value: "month" },
  ];

  function selectPreset(val: string) {
    value = val;
    onchange?.(val);
  }

  function handleKeydown(e: KeyboardEvent, index: number) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = (index + 1) % presets.length;
      selectPreset(presets[next].value);
      const nextBtn = document.getElementById(
        `date-opt-${presets[next].value}`
      );
      nextBtn?.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (index - 1 + presets.length) % presets.length;
      selectPreset(presets[prev].value);
      const prevBtn = document.getElementById(
        `date-opt-${presets[prev].value}`
      );
      prevBtn?.focus();
    }
  }
</script>

<div class="flex flex-wrap items-center justify-end gap-2">
  <div role="radiogroup" aria-label="Date range filter" class="segment-control">
    <span class="sr-only">Select date range:</span>
    {#each presets as preset, i (preset.value)}
      {@const isSelected = value === preset.value}
      <button
        type="button"
        id="date-opt-{preset.value}"
        role="radio"
        aria-checked={isSelected}
        tabindex={isSelected ? 0 : -1}
        class="px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-primary {isSelected
          ? 'bg-base-200 text-foreground font-medium'
          : 'text-muted-foreground hover:text-foreground'}"
        onclick={() => selectPreset(preset.value)}
        onkeydown={(e) => handleKeydown(e, i)}
      >
        {preset.label}
      </button>
    {/each}
  </div>
  <form
    method="GET"
    class="flex items-center gap-1.5"
    aria-label="Custom date range"
  >
    <label class="sr-only" for="range-start">Start date</label>
    <input
      id="range-start"
      class="input input-bordered input-sm w-32"
      name="start"
      type="date"
      value={page.url.searchParams.get("start") || ""}
    />
    <span class="text-xs text-muted-foreground" aria-hidden="true">to</span>
    <label class="sr-only" for="range-end">End date</label>
    <input
      id="range-end"
      class="input input-bordered input-sm w-32"
      name="end"
      type="date"
      value={page.url.searchParams.get("end") || ""}
    />
    <button class="btn btn-sm btn-outline" type="submit">Apply</button>
  </form>
</div>
