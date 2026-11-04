<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
  } from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import { t } from "$lib/display";
  import { TriangleAlert } from "@lucide/svelte";

  type ErrorAlertProps = {
    readonly class?: string;
    readonly message: string;
    readonly title?: string;
  };

  let { class: className, message, title }: ErrorAlertProps = $props();
  let retrying = $state(false);

  // Re-run the page's loads in place; a full reload would discard state.
  async function retry() {
    retrying = true;
    try {
      await invalidateAll();
    } finally {
      retrying = false;
    }
  }
</script>

<Alert class={className} variant="destructive">
  <TriangleAlert />
  <AlertTitle>{title ?? t("common.reportLoadFailed")}</AlertTitle>
  <AlertDescription>{message}</AlertDescription>
  <AlertAction>
    <Button disabled={retrying} onclick={retry} size="sm" variant="outline">
      {t("common.retry")}
    </Button>
  </AlertAction>
</Alert>
