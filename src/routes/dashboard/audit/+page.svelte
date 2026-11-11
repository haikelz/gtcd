<script lang="ts">
  import { page } from "$app/state";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import ErrorAlert from "$lib/components/ErrorAlert.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import ReportPagination from "$lib/components/ReportPagination.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import {
    Frame,
    FrameDescription,
    FrameHeader,
    FramePanel,
    FrameTitle,
  } from "$lib/components/ui/frame";
  import { displayPreferences, t } from "$lib/display";
  import type { MessageKey } from "$lib/i18n";
  import { formatDate, wallClockNow } from "$lib/preferences";
  import { ScrollText } from "@lucide/svelte";
  import { SvelteURLSearchParams } from "svelte/reactivity";

  let { data } = $props();

  // Actions recorded elsewhere without a label here show their raw id.
  const ACTION_LABELS: Partial<Record<string, MessageKey>> = {
    "export.create": "audit.actionExportCreate",
    "native.reveal": "audit.actionNativeReveal",
    "native.submit": "audit.actionNativeSubmit",
    "report.alert": "audit.actionReportAlert",
    "report.schedule": "audit.actionReportSchedule",
    "share.create": "audit.actionShareCreate",
    "share.revoke": "audit.actionShareRevoke",
    "site.create": "audit.actionSiteCreate",
    "site.update": "audit.actionSiteUpdate",
  };

  const preferences = $derived(displayPreferences());
  const siteNames = $derived(
    new Map(data.sites.map((site) => [site.id, site.cname || site.code]))
  );

  function actionLabel(action: string): string {
    const key = ACTION_LABELS[action];
    return key ? t(key) : action;
  }

  function timeOf(iso: string): string {
    const wall = wallClockNow(preferences.timezone, new Date(iso));
    const hours = wall.getHours();
    const minutes = String(wall.getMinutes()).padStart(2, "0");
    const time = preferences.twentyFourHours
      ? `${String(hours).padStart(2, "0")}:${minutes}`
      : `${hours % 12 || 12}:${minutes} ${hours < 12 ? "AM" : "PM"}`;

    return `${formatDate(wall, preferences.dateFormat, "full", preferences.locale)} ${time}`;
  }

  function pageHref(target: number): string {
    const params = new SvelteURLSearchParams(page.url.searchParams);
    if (target === 1) params.delete("page");
    else params.set("page", String(target));
    const query = params.toString();
    return query ? `${page.url.pathname}?${query}` : page.url.pathname;
  }
</script>

<SEO description={t("audit.description")} noindex title={t("audit.title")} />

<PageHeader description={t("audit.description")} title={t("audit.title")} />

{#if data.unavailable}
  <ErrorAlert
    message={t("audit.unavailable")}
    title={t("audit.unavailableTitle")}
  />
{:else}
  <Frame>
    <FrameHeader>
      <FrameTitle id="audit-heading">{t("audit.entries")}</FrameTitle>
      <FrameDescription>
        {t("audit.pageOf", { page: data.page, pages: data.pages })}
      </FrameDescription>
    </FrameHeader>
    {#if data.entries.length}
      <!-- Focusable so keyboard users can scroll the table on small screens. -->
      <FramePanel
        aria-labelledby="audit-heading"
        class="overflow-x-auto p-0"
        role="region"
        tabindex={0}
      >
        <table class="w-full text-left text-sm">
          <caption class="sr-only">
            {t("audit.caption", { timezone: preferences.timezone })}
          </caption>
          <thead class="border-b border-border bg-muted/40">
            <tr>
              <th class="px-4 py-3 font-medium whitespace-nowrap" scope="col"
                >{t("audit.time", { timezone: preferences.timezone })}</th
              >
              <th class="px-4 py-3 font-medium whitespace-nowrap" scope="col"
                >{t("audit.actor")}</th
              >
              <th class="px-4 py-3 font-medium whitespace-nowrap" scope="col"
                >{t("audit.action")}</th
              >
              <th class="px-4 py-3 font-medium whitespace-nowrap" scope="col"
                >{t("audit.site")}</th
              >
              <th class="px-4 py-3 font-medium whitespace-nowrap" scope="col"
                >{t("audit.target")}</th
              >
              <th class="px-4 py-3 font-medium whitespace-nowrap" scope="col"
                >{t("audit.outcome")}</th
              >
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            {#each data.entries as entry, index (`${entry.at}:${index}`)}
              <tr class="hover:bg-muted/30">
                <td class="px-4 py-3 whitespace-nowrap tabular-nums">
                  <time datetime={entry.at}>{timeOf(entry.at)}</time>
                </td>
                <td class="max-w-56 px-4 py-3 break-words">{entry.actor}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                  {actionLabel(entry.action)}
                </td>
                <td class="max-w-48 px-4 py-3 break-words">
                  {entry.site === null
                    ? "—"
                    : (siteNames.get(entry.site) ?? `#${entry.site}`)}
                </td>
                <td class="max-w-sm px-4 py-3 break-words"
                  >{entry.target || "—"}</td
                >
                <td class="px-4 py-3">
                  <Badge
                    variant={entry.outcome === "success"
                      ? "success-light"
                      : "destructive-light"}
                    >{t(
                      entry.outcome === "success"
                        ? "audit.success"
                        : "audit.failure"
                    )}</Badge
                  >
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </FramePanel>
    {:else}
      <FramePanel>
        <EmptyState
          desc={t("audit.emptyDescription")}
          icon={ScrollText}
          title={t("audit.empty")}
        />
      </FramePanel>
    {/if}
  </Frame>
  <ReportPagination
    nextHref={data.page < data.pages ? pageHref(data.page + 1) : undefined}
    previousHref={data.page > 1 ? pageHref(data.page - 1) : undefined}
  />
{/if}
