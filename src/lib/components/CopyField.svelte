<script lang="ts">
  import { showToast } from "$lib/components/toast.js";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { t } from "$lib/display";
  import { Check, Copy } from "@lucide/svelte";

  type CopyFieldProps = {
    readonly id: string;
    readonly label: string;
    readonly mono?: boolean;
    readonly value: string;
  };

  let { id, label, mono = false, value }: CopyFieldProps = $props();

  let copied = $state(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      showToast(t("shell.copyFailed"), "error");
      return;
    }

    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

<div class="flex min-w-0 items-center gap-1.5">
  <Input
    aria-label={label}
    class={mono ? "font-mono text-xs" : undefined}
    {id}
    onfocus={(event) => event.currentTarget.select()}
    readonly
    {value}
  />
  <Button
    aria-label={copied
      ? t("shell.copied", { label })
      : t("shell.copyLabel", { label: label.toLowerCase() })}
    onclick={copy}
    size="icon"
    title={t("common.copy")}
    variant="outline"
  >
    {#if copied}
      <Check />
    {:else}
      <Copy />
    {/if}
  </Button>
</div>
