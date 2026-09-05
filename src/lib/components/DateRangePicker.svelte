<script lang="ts">
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
      const nextBtn = document.getElementById(`date-opt-${presets[next].value}`);
      nextBtn?.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (index - 1 + presets.length) % presets.length;
      selectPreset(presets[prev].value);
      const prevBtn = document.getElementById(`date-opt-${presets[prev].value}`);
      prevBtn?.focus();
    }
  }
</script>

<div
  role="radiogroup"
  aria-label="Date range filter"
  class="segment-control"
>
  <span class="sr-only">Select date range:</span>
  {#each presets as preset, i}
    {@const isSelected = value === preset.value}
    <button
      type="button"
      id="date-opt-{preset.value}"
      role="radio"
      aria-checked={isSelected}
      tabindex={isSelected ? 0 : -1}
      class="px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-primary {isSelected
        ? 'bg-base-200 text-foreground font-semibold'
        : 'text-muted-foreground hover:text-foreground hover:bg-base-300/40'}"
      onclick={() => selectPreset(preset.value)}
      onkeydown={(e) => handleKeydown(e, i)}
    >
      {preset.label}
    </button>
  {/each}
</div>
