<script lang="ts">
  import { enhance } from "$app/forms";
  import DashboardToolbar from "$lib/components/DashboardToolbar.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import ErrorAlert from "$lib/components/ErrorAlert.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PeriodChange from "$lib/components/PeriodChange.svelte";
  import ReportSkeleton from "$lib/components/ReportSkeleton.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import {
    Frame,
    FrameDescription,
    FrameHeader,
    FramePanel,
    FrameTitle,
  } from "$lib/components/ui/frame";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import {
    NativeSelect,
    NativeSelectOption,
  } from "$lib/components/ui/native-select";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import {
    dashboardHref,
    displayPreferences,
    formatCount,
    numbersHidden,
    t,
  } from "$lib/display";
  import {
    GOAL_NAME_MAX_LENGTH,
    GOAL_PATH_MAX_LENGTH,
    GOAL_PATH_SCAN_LIMIT,
  } from "$lib/goals";
  import { Target } from "@lucide/svelte";

  let { data, form } = $props();

  function percent(value: number): string {
    return new Intl.NumberFormat(displayPreferences().locale, {
      maximumFractionDigits: 1,
    }).format(value);
  }
</script>

<SEO
  description={t("goals.seoDescription")}
  noindex
  title={t("goals.seoTitle")}
/>

<PageHeader description={t("goals.description")} title={t("goals.title")} />

<DashboardToolbar />

{#if data.storageError}
  <ErrorAlert message={data.storageError} />
{:else}
  <div class="flex flex-col gap-4">
    <Frame aria-labelledby="goals-report" dense role="region">
      <FrameHeader>
        <FrameTitle id="goals-report">{t("goals.reportTitle")}</FrameTitle>
        <FrameDescription>{t("goals.help")}</FrameDescription>
      </FrameHeader>
      {#if data.report}
        {#await data.report}
          <FramePanel>
            <ReportSkeleton
              label={t("goals.loading")}
              rows={Math.min(data.goals.length, 5)}
            />
          </FramePanel>
        {:then report}
          <FramePanel class="overflow-x-auto p-0">
            <table class="w-full text-left text-sm">
              <caption class="sr-only">{t("goals.tableCaption")}</caption>
              <thead class="border-b border-border bg-muted/40">
                <tr>
                  <th class="h-9 px-4 font-medium" scope="col"
                    >{t("goals.columnGoal")}</th
                  >
                  {#if !numbersHidden()}
                    <th
                      class="h-9 px-4 text-right font-medium whitespace-nowrap"
                      scope="col">{t("goals.columnVisitors")}</th
                    >
                  {/if}
                  <th
                    class="h-9 px-4 text-right font-medium whitespace-nowrap"
                    scope="col">{t("goals.columnRate")}</th
                  >
                  <th
                    class="h-9 px-4 text-right font-medium whitespace-nowrap"
                    scope="col">{t("goals.columnChange")}</th
                  >
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                {#each report.rows as row (row.goal.id)}
                  <tr>
                    <th class="max-w-xs px-4 py-2.5 font-normal" scope="row">
                      <span class="block font-medium break-words"
                        >{row.goal.name}</span
                      >
                      <span class="flex min-w-0 items-center gap-1.5">
                        <span
                          class="truncate font-mono text-xs text-muted-foreground"
                          >{row.goal.path}</span
                        >
                        <Badge variant="outline"
                          >{t(
                            row.goal.kind === "event"
                              ? "goals.kindEvent"
                              : "goals.kindPage"
                          )}</Badge
                        >
                      </span>
                    </th>
                    {#if !numbersHidden()}
                      <td
                        class="px-4 py-2.5 text-right font-medium tabular-nums"
                      >
                        {#if row.visitors === null}
                          <span aria-hidden="true">—</span><span class="sr-only"
                            >{t("goals.notCounted")}</span
                          >
                        {:else}
                          {formatCount(row.visitors)}
                        {/if}
                      </td>
                    {/if}
                    <td class="px-4 py-2.5 text-right tabular-nums">
                      {#if row.rate === null}
                        <span aria-hidden="true">—</span><span class="sr-only"
                          >{t(
                            row.visitors === null
                              ? "goals.notCounted"
                              : "goals.noVisitors"
                          )}</span
                        >
                      {:else}
                        {percent(row.rate)}%
                        <span
                          aria-hidden="true"
                          class="mt-1 ml-auto block h-1.5 w-20 overflow-hidden rounded-full bg-muted"
                          ><span
                            class="block h-full rounded-full bg-chart-1"
                            style:width="{Math.min(row.rate, 100)}%"
                          ></span></span
                        >
                      {/if}
                    </td>
                    <td class="px-4 py-2.5 text-right">
                      {#await data.comparison}
                        <Skeleton class="ml-auto h-4 w-10" />
                      {:then comparison}
                        {#if comparison?.status === "ready"}
                          <PeriodChange
                            change={comparison.changes[row.goal.id] ?? null}
                          />
                        {/if}
                      {/await}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
            <div class="flex flex-col gap-2 border-t border-border px-4 py-3">
              {#if !numbersHidden()}
                <p class="text-xs text-muted-foreground">
                  {t("goals.denominator", { total: formatCount(report.total) })}
                </p>
              {/if}
              {#if !report.scanComplete}
                <p class="text-xs text-muted-foreground" role="status">
                  {t("goals.scanIncomplete", {
                    limit: formatCount(GOAL_PATH_SCAN_LIMIT),
                  })}
                </p>
              {/if}
              {#await data.comparison then comparison}
                {#if comparison?.status === "error"}
                  <p class="text-xs text-muted-foreground" role="status">
                    {t("reports.comparisonFailed")}
                  </p>
                {/if}
              {/await}
            </div>
          </FramePanel>
        {:catch failure}
          <FramePanel>
            <ErrorAlert message={failure.message} />
          </FramePanel>
        {/await}
      {:else}
        <FramePanel>
          <EmptyState
            desc={data.isAdmin ? t("goals.emptyAdmin") : t("goals.emptyViewer")}
            icon={Target}
            title={t("goals.emptyTitle")}
          />
        </FramePanel>
      {/if}
    </Frame>

    {#if data.isAdmin}
      <Frame aria-labelledby="goals-manage" role="region">
        <FrameHeader>
          <FrameTitle id="goals-manage">{t("goals.manageTitle")}</FrameTitle>
          <FrameDescription
            >{t("goals.manageDescription", {
              max: data.maxGoals,
            })}</FrameDescription
          >
        </FrameHeader>
        <FramePanel class="flex flex-col gap-5">
          {#if form?.message}
            <p class="text-sm text-destructive" role="alert">{form.message}</p>
          {:else if form?.saved}
            <p class="text-sm" role="status">{form.saved}</p>
          {/if}
          {#if data.goals.length > 0}
            <ul class="m-0 flex list-none flex-col gap-3 p-0">
              {#each data.goals as goal (goal.id)}
                <li class="flex flex-wrap items-end gap-2">
                  <form
                    action={dashboardHref("?/rename")}
                    class="flex min-w-0 flex-1 items-end gap-2"
                    method="POST"
                    use:enhance
                  >
                    <input name="id" type="hidden" value={goal.id} />
                    <div class="grid min-w-0 flex-1 gap-1.5">
                      <Label class="font-normal" for="goal-name-{goal.id}"
                        >{t("goals.nameFor", { path: goal.path })}</Label
                      >
                      <Input
                        id="goal-name-{goal.id}"
                        maxlength={GOAL_NAME_MAX_LENGTH}
                        name="name"
                        required
                        value={goal.name}
                      />
                    </div>
                    <Button type="submit" variant="outline"
                      >{t("goals.rename")}</Button
                    >
                  </form>
                  <form
                    action={dashboardHref("?/delete")}
                    method="POST"
                    use:enhance
                  >
                    <input name="id" type="hidden" value={goal.id} />
                    <Button
                      aria-label={t("goals.deleteLabel", { name: goal.name })}
                      type="submit"
                      variant="destructive">{t("goals.delete")}</Button
                    >
                  </form>
                </li>
              {/each}
            </ul>
          {/if}
          <form
            action={dashboardHref("?/create")}
            aria-labelledby="goals-add"
            class={[
              "flex flex-col gap-3",
              data.goals.length > 0 && "border-t border-border pt-4",
            ]}
            method="POST"
            use:enhance
          >
            <h3 class="text-sm font-medium" id="goals-add">
              {t("goals.addTitle")}
            </h3>
            <div class="grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
              <div class="grid gap-1.5">
                <Label for="goal-name">{t("goals.name")}</Label>
                <Input
                  id="goal-name"
                  maxlength={GOAL_NAME_MAX_LENGTH}
                  name="name"
                  required
                />
              </div>
              <div class="grid gap-1.5">
                <Label for="goal-kind">{t("goals.kind")}</Label>
                <NativeSelect class="w-full" id="goal-kind" name="kind">
                  <NativeSelectOption value="event"
                    >{t("goals.kindEvent")}</NativeSelectOption
                  >
                  <NativeSelectOption value="page"
                    >{t("goals.kindPage")}</NativeSelectOption
                  >
                </NativeSelect>
              </div>
              <div class="grid gap-1.5">
                <Label for="goal-path">{t("goals.path")}</Label>
                <Input
                  aria-describedby="goal-path-help"
                  class="font-mono"
                  id="goal-path"
                  maxlength={GOAL_PATH_MAX_LENGTH}
                  name="path"
                  required
                />
              </div>
            </div>
            <p class="text-xs text-muted-foreground" id="goal-path-help">
              {t("goals.pathHelp")}
            </p>
            <Button
              class="self-start"
              disabled={data.goals.length >= data.maxGoals}
              type="submit">{t("goals.add")}</Button
            >
          </form>
        </FramePanel>
      </Frame>
    {:else}
      <p class="text-sm text-muted-foreground">{t("goals.adminOnly")}</p>
    {/if}
  </div>
{/if}
