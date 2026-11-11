<script lang="ts">
  import { buildCampaignUrl, type CampaignLinkInput } from "$lib/campaign-link";
  import CopyField from "$lib/components/CopyField.svelte";
  import {
    Frame,
    FrameDescription,
    FrameHeader,
    FramePanel,
    FrameTitle,
  } from "$lib/components/ui/frame";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { t } from "$lib/display";
  import type { MessageKey } from "$lib/i18n";

  const TAG_FIELDS = [
    { field: "source", label: "tools.linkSource", required: true },
    { field: "medium", label: "tools.linkMedium", required: false },
    { field: "campaign", label: "tools.linkCampaign", required: true },
    { field: "term", label: "tools.linkTerm", required: false },
    { field: "content", label: "tools.linkContent", required: false },
  ] as const satisfies readonly {
    field: Exclude<keyof CampaignLinkInput, "url">;
    label: MessageKey;
    required: boolean;
  }[];

  let input = $state({
    campaign: "",
    content: "",
    medium: "",
    source: "",
    term: "",
    url: "",
  });

  const result = $derived(buildCampaignUrl(input));
  // Required fields left empty are explained once, below; a typed URL that
  // is not http(s) gets its own message.
  const urlInvalid = $derived(
    input.url.trim() !== "" &&
      "invalid" in result &&
      result.invalid.includes("url")
  );
</script>

<Frame>
  <FrameHeader>
    <FrameTitle>{t("tools.linkTitle")}</FrameTitle>
    <FrameDescription>{t("tools.linkHelp")}</FrameDescription>
  </FrameHeader>
  <FramePanel class="grid gap-4">
    <div class="grid gap-2">
      <Label for="campaign-link-url">{t("tools.linkUrl")}</Label>
      <Input
        aria-describedby={urlInvalid ? "campaign-link-url-error" : undefined}
        aria-invalid={urlInvalid || undefined}
        autocomplete="url"
        bind:value={input.url}
        class="font-mono"
        id="campaign-link-url"
        placeholder="https://example.com/pricing"
        required
        spellcheck="false"
        type="url"
      />
      {#if urlInvalid}
        <p class="text-xs text-destructive" id="campaign-link-url-error">
          {t("tools.linkUrlInvalid")}
        </p>
      {/if}
    </div>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each TAG_FIELDS as tag (tag.field)}
        <div class="grid content-start gap-2">
          <Label
            class="flex-wrap gap-x-1.5 gap-y-1"
            for="campaign-link-{tag.field}"
          >
            {t(tag.label)}
            <span class="font-mono text-xs font-normal text-muted-foreground"
              >utm_{tag.field}</span
            >
            {#if !tag.required}
              <span class="font-normal text-muted-foreground"
                >{t("exports.optional")}</span
              >
            {/if}
          </Label>
          <Input
            bind:value={input[tag.field]}
            id="campaign-link-{tag.field}"
            required={tag.required}
            spellcheck="false"
          />
        </div>
      {/each}
    </div>
    <div aria-live="polite" class="grid gap-2">
      {#if "url" in result}
        <p class="sr-only">{t("tools.linkReady")}</p>
        <Label for="campaign-link-result">{t("tools.linkResult")}</Label>
        <CopyField
          id="campaign-link-result"
          label={t("tools.linkResult")}
          mono
          value={result.url}
        />
      {:else}
        <p class="text-sm text-muted-foreground">
          {t("tools.linkIncomplete")}
        </p>
      {/if}
    </div>
  </FramePanel>
</Frame>
