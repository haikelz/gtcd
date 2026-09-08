<script lang="ts">
  import { CircleAlert, CircleCheck, Info, X } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { subscribeToasts, type ToastMessage } from "$lib/components/toast.js";

  let toasts = $state<readonly ToastMessage[]>([]);
  const timers = new Map<number, ReturnType<typeof setTimeout>>();

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
  class="toast toast-top toast-end z-60 w-full max-w-sm p-4 pointer-events-none"
  aria-live="polite"
  aria-atomic="false"
>
  {#each toasts as toast (toast.id)}
    <div
      class="toast-item alert pointer-events-auto shadow-lg {toast.variant ===
      'success'
        ? 'alert-success'
        : toast.variant === 'error'
          ? 'alert-error'
          : 'alert-info'}"
      role={toast.variant === "error" ? "alert" : "status"}
    >
      {#if toast.variant === "success"}
        <CircleCheck class="h-5 w-5 shrink-0" aria-hidden="true" />
      {:else if toast.variant === "error"}
        <CircleAlert class="h-5 w-5 shrink-0" aria-hidden="true" />
      {:else}
        <Info class="h-5 w-5 shrink-0" aria-hidden="true" />
      {/if}
      <span class="text-sm font-medium">{toast.message}</span>
      <button
        type="button"
        class="btn btn-ghost btn-sm btn-square ml-auto tooltip tooltip-left"
        data-tip="Dismiss notification"
        aria-label="Dismiss notification"
        onclick={() => dismissToast(toast.id)}
      >
        <X class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  {/each}
</div>
