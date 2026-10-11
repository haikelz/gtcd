<script lang="ts">
  import { SvelteMap } from "svelte/reactivity";
  import { CircleAlert, CircleCheck, Info, X } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { subscribeToasts, type ToastMessage } from "$lib/components/toast.js";
  import { Alert, AlertAction, AlertTitle } from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import { t } from "$lib/display";

  let toasts = $state<readonly ToastMessage[]>([]);
  const timers = new SvelteMap<number, ReturnType<typeof setTimeout>>();

  function dismissToast(id: number): void {
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
    timers.delete(id);
    toasts = toasts.filter((toast) => toast.id !== id);
  }

  onMount(() => {
    const unsubscribe = subscribeToasts((toast) => {
      toasts = [...toasts.slice(-3), toast];
      timers.set(
        toast.id,
        setTimeout(() => dismissToast(toast.id), 5000)
      );
    });

    return () => {
      unsubscribe();
      for (const timer of timers.values()) clearTimeout(timer);
    };
  });
</script>

<div
  aria-atomic="false"
  aria-live="polite"
  class="pointer-events-none fixed top-0 right-0 z-50 flex w-full max-w-sm flex-col gap-2 p-4"
>
  {#each toasts as toast (toast.id)}
    <div class="toast-item pointer-events-auto">
      <Alert
        class="bg-popover pr-2 text-popover-foreground shadow-lg"
        role={toast.variant === "error" ? "alert" : "status"}
      >
        {#if toast.variant === "success"}
          <CircleCheck aria-hidden="true" class="text-success" />
        {:else if toast.variant === "error"}
          <CircleAlert aria-hidden="true" class="text-destructive" />
        {:else}
          <Info aria-hidden="true" class="text-info" />
        {/if}
        <AlertTitle class="line-clamp-none">{toast.message}</AlertTitle>
        <AlertAction class="max-sm:col-start-3 max-sm:row-start-1 max-sm:mt-0">
          <Button
            aria-label={t("shell.dismissNotification")}
            onclick={() => dismissToast(toast.id)}
            size="icon-xs"
            title={t("shell.dismissNotification")}
            variant="ghost"
          >
            <X aria-hidden="true" />
          </Button>
        </AlertAction>
      </Alert>
    </div>
  {/each}
</div>
