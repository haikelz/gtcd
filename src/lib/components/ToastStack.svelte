<script lang="ts">
  import { SvelteMap } from "svelte/reactivity";
  import { CircleAlert, CircleCheck, Info, X } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { subscribeToasts, type ToastMessage } from "$lib/components/toast.js";
  import { Alert, AlertAction, AlertTitle } from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import { t } from "$lib/display";

  const TOAST_MS = 5000;
  const VISIBLE_TOASTS = 4;

  let toasts = $state<readonly ToastMessage[]>([]);
  // Errors stay until dismissed. Other toasts pause while the stack is
  // hovered or holds focus, then get their full time again (WCAG 2.2.1).
  let hovered = false;
  let focused = false;
  const timers = new SvelteMap<number, ReturnType<typeof setTimeout>>();

  function schedule(toast: ToastMessage): void {
    if (toast.variant === "error" || hovered || focused) return;
    if (timers.has(toast.id)) return;

    timers.set(
      toast.id,
      setTimeout(() => dismissToast(toast.id), TOAST_MS)
    );
  }

  function clearTimer(id: number): void {
    clearTimeout(timers.get(id));
    timers.delete(id);
  }

  function dismissToast(id: number): void {
    clearTimer(id);
    toasts = toasts.filter((toast) => toast.id !== id);
  }

  function updatePause(): void {
    if (hovered || focused) {
      for (const id of [...timers.keys()]) clearTimer(id);
    } else {
      for (const toast of toasts) schedule(toast);
    }
  }

  function handleFocusOut(event: FocusEvent & { currentTarget: HTMLElement }) {
    const next = event.relatedTarget;
    focused = next instanceof Node && event.currentTarget.contains(next);
    updatePause();
  }

  onMount(() => {
    const unsubscribe = subscribeToasts((toast) => {
      for (const old of toasts.slice(0, -(VISIBLE_TOASTS - 1))) {
        clearTimer(old.id);
      }
      toasts = [...toasts.slice(-(VISIBLE_TOASTS - 1)), toast];
      schedule(toast);
    });

    return () => {
      unsubscribe();
      for (const timer of timers.values()) clearTimeout(timer);
    };
  });
</script>

<div
  aria-atomic="false"
  aria-label={t("shell.notifications")}
  aria-live="polite"
  role="region"
  class="pointer-events-none fixed top-0 right-0 z-50 flex w-full max-w-sm flex-col gap-2 p-4"
  onfocusin={() => {
    focused = true;
    updatePause();
  }}
  onfocusout={handleFocusOut}
  onpointerenter={() => {
    hovered = true;
    updatePause();
  }}
  onpointerleave={() => {
    hovered = false;
    updatePause();
  }}
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
