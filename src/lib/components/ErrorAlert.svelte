<script lang="ts">
  import {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
  } from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import { TriangleAlert } from "@lucide/svelte";

  type ErrorAlertProps = {
    readonly class?: string;
    readonly message: string;
    readonly title?: string;
  };

  let {
    class: className,
    message,
    title = "This report could not load",
  }: ErrorAlertProps = $props();
</script>

<Alert class={className} variant="destructive">
  <TriangleAlert />
  <AlertTitle>{title}</AlertTitle>
  <AlertDescription>{message}</AlertDescription>
  <AlertAction>
    <Button onclick={() => location.reload()} size="sm" variant="outline">
      Retry
    </Button>
  </AlertAction>
</Alert>
