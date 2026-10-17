<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import CopyField from "$lib/components/CopyField.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { NativeSelect } from "$lib/components/ui/native-select";
  import {
    Frame,
    FrameHeader,
    FramePanel,
    FrameTitle,
    FrameDescription,
    FrameFooter,
  } from "$lib/components/ui/frame";
  import {
    Alert,
    AlertTitle,
    AlertDescription,
  } from "$lib/components/ui/alert";
  import type { PageProps } from "./$types";
  import type { NativeSection } from "$lib/native-admin";

  let { data, form }: PageProps = $props();
  const sections: {
    id: NativeSection;
    title: string;
    description: string;
    admin: boolean;
  }[] = [
    {
      id: "users",
      title: "Users",
      description: "Manage access to this GoatCounter site.",
      admin: true,
    },
    {
      id: "tokens",
      title: "API tokens",
      description:
        "Create credentials for integrations and revoke tokens you no longer use.",
      admin: true,
    },
    {
      id: "security",
      title: "Account security",
      description: "Change your password and manage two-factor authentication.",
      admin: false,
    },
    {
      id: "imports",
      title: "Import data",
      description:
        "Upload historical pageviews to the selected GoatCounter site.",
      admin: true,
    },
    {
      id: "pages",
      title: "Page data",
      description:
        "Find recorded paths, then delete or merge their pageviews. This does not change your website.",
      admin: true,
    },
    {
      id: "preferences",
      title: "GoatCounter preferences",
      description:
        "Update your native account display settings and GoatCounter email reports. GTCD display preferences and scheduled reports are separate.",
      admin: false,
    },
  ];
  const selected = $derived(
    sections.find((section) => section.id === data.section) ?? sections[0]
  );
  const native = $derived(
    form && "nativePage" in form ? form.nativePage : data.nativePage
  );
  const problem = $derived(
    form && "problem" in form ? form.problem : data.problem
  );
  let pending = $state(false);
  let revealed = $state(true);
  const token = $derived(
    form && "token" in form && revealed ? form.token : null
  );
  function sectionUrl(section: NativeSection) {
    return `${resolve("/dashboard/admin/[section]", { section })}?site=${data.site.id}`;
  }
  function userUrl(path: string) {
    return `${sectionUrl("users")}&resource=${encodeURIComponent(path.split("/").at(-1) ?? "")}`;
  }
  function begin() {
    pending = true;
    revealed = false;
    return async ({ update }: { update: () => Promise<void> }) => {
      try {
        await update();
        revealed = true;
      } finally {
        pending = false;
      }
    };
  }
  function enhancePost(node: HTMLFormElement) {
    if (node.method.toLowerCase() === "post") return enhance(node, begin);
  }
</script>

<SEO
  title={`${selected.title} — Administration`}
  description={selected.description}
/>
<PageHeader title={selected.title} description={selected.description} />

<nav
  aria-label="Administration"
  class="mb-6 flex flex-wrap gap-1 border-b border-border pb-3"
>
  {#each sections.filter((section) => !section.admin || data.canAdminister) as section (section.id)}
    <Button
      href={sectionUrl(section.id)}
      variant={data.section === section.id ? "secondary" : "ghost"}
      aria-current={data.section === section.id ? "page" : undefined}
      >{section.title}</Button
    >
  {/each}
</nav>

{#if problem}
  <Alert variant="destructive" class="mb-6" role="alert">
    <AlertTitle>Administration unavailable</AlertTitle>
    <AlertDescription>
      <p>{problem.message}</p>
      {#if problem.reconnect}
        <form method="POST" action={resolve("/logout")} class="mt-3">
          <Button type="submit" variant="outline">Sign out and reconnect</Button
          >
        </form>
      {/if}
    </AlertDescription>
  </Alert>
{/if}

<div aria-live="polite" aria-atomic="true" class="space-y-3">
  {#each native?.messages ?? [] as message (message.text)}
    <Alert variant={message.error ? "destructive" : "default"} class="mb-4">
      <AlertTitle
        >{message.error
          ? "Review your request"
          : "GoatCounter response"}</AlertTitle
      >
      <AlertDescription>{message.text}</AlertDescription>
    </Alert>
  {/each}
</div>

{#if token}
  <Frame class="mb-6">
    <FrameHeader
      ><FrameTitle>Revealed API token</FrameTitle><FrameDescription
        >Keep this credential private. It is only shown after an explicit
        request.</FrameDescription
      ></FrameHeader
    >
    <FramePanel
      ><CopyField id="revealed-token" label="API token" value={token} /><Button
        variant="ghost"
        class="mt-2"
        onclick={() => {
          revealed = false;
        }}>Hide token</Button
      ></FramePanel
    >
  </Frame>
{/if}

{#if native}
  {#if data.section === "imports"}
    <Alert class="mb-6"
      ><AlertTitle>Before you import</AlertTitle><AlertDescription
        >Use GoatCounter CSV or CSV.gz files, up to 8 MB (32 MB uncompressed).
        Google Analytics imports add totals, not full visitor history. Accepted
        uploads are processed in the background; acceptance does not mean the
        import has finished. Replacing data deletes existing pageviews.</AlertDescription
      ></Alert
    >
  {/if}
  {#if native.links.length}
    <div class="mb-6 flex flex-wrap gap-2">
      {#if page.url.searchParams.has("resource")}<Button
          href={sectionUrl("users")}
          variant="outline">All users</Button
        >{/if}
      {#each native.links as link (link.path)}<Button
          href={userUrl(link.path)}
          variant="outline">{link.label}</Button
        >{/each}
    </div>
  {/if}

  {#each native.tables as table, index (index)}
    <Frame class="mb-6">
      <FrameHeader
        ><FrameTitle
          >{selected.title}{native.tables.length > 1
            ? ` · ${index + 1}`
            : ""}</FrameTitle
        ></FrameHeader
      >
      <FramePanel class="overflow-x-auto p-0">
        <table class="w-full text-left text-sm">
          <caption class="sr-only">{selected.title} in GoatCounter</caption>
          <thead class="border-b border-border bg-muted/40"
            ><tr
              >{#each table.headers as header, headerIndex (headerIndex)}<th
                  scope="col"
                  class="px-4 py-3 font-medium whitespace-nowrap">{header}</th
                >{/each}</tr
            ></thead
          >
          <tbody class="divide-y divide-border"
            >{#each table.rows as row, rowIndex (rowIndex)}<tr
                class="hover:bg-muted/30"
                >{#each row as cell, cellIndex (cellIndex)}<td
                    class="max-w-sm px-4 py-3 break-words">{cell || "—"}</td
                  >{/each}</tr
              >{/each}</tbody
          >
        </table>
      </FramePanel>
    </Frame>
  {/each}

  <div class="max-w-3xl space-y-6">
    {#each native.forms as nativeForm, formIndex (`${data.section}:${nativeForm.method}:${nativeForm.id}`)}
      <Frame>
        <FrameHeader><FrameTitle>{nativeForm.title}</FrameTitle></FrameHeader>
        <form
          method={nativeForm.method}
          action={nativeForm.method === "GET"
            ? sectionUrl(data.section)
            : undefined}
          enctype={nativeForm.fields.some((field) => field.type === "file")
            ? "multipart/form-data"
            : "application/x-www-form-urlencoded"}
          use:enhancePost
          aria-busy={pending}
        >
          <input
            type="hidden"
            name="site"
            value={data.site.id}
            disabled={nativeForm.method === "POST"}
          />
          {#if nativeForm.method === "POST"}<input
              type="hidden"
              name="__action"
              value={nativeForm.id}
            /><input
              type="hidden"
              name="__intent"
              value={nativeForm.intent}
            />{/if}
          <FramePanel class="space-y-4">
            {#if nativeForm.id === "/user/enable-totp" && native.setupSecret}
              <p class="text-sm text-muted-foreground">
                Add this setup key to your authenticator, then enter its
                six-digit code. Store the key privately; GoatCounter does not
                issue recovery codes.
              </p>
              <CopyField
                id="totp-setup"
                label="Authenticator setup key"
                value={native.setupSecret}
              />
            {/if}
            {#each nativeForm.fields as field, fieldIndex (fieldIndex)}
              {@const id = `native-${formIndex}-${fieldIndex}`}
              {#if field.type === "radio" && nativeForm.fields[fieldIndex - 1]?.type !== "radio"}
                <p class="text-sm font-medium">Access</p>
              {/if}
              <div class="space-y-1.5">
                {#if field.type === "checkbox" || field.type === "radio"}
                  <label
                    for={id}
                    class="flex min-h-8 items-start gap-3 text-sm"
                  >
                    <input
                      {id}
                      type={field.type}
                      name={field.name}
                      value={field.value}
                      checked={field.checked}
                      disabled={pending || field.disabled}
                      required={field.required}
                      class="mt-1 size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      aria-describedby={field.help ? `${id}-help` : undefined}
                    />
                    <span>{field.label}</span>
                  </label>
                {:else}
                  <Label for={id}>{field.label}</Label>
                  {#if field.type === "select"}
                    <NativeSelect
                      {id}
                      name={field.name}
                      value={field.value}
                      disabled={pending || field.disabled}
                      required={field.required}
                      aria-describedby={field.help ? `${id}-help` : undefined}
                    >
                      {#each field.options as option (option.value)}<option
                          value={option.value}
                          disabled={option.disabled}>{option.label}</option
                        >{/each}
                    </NativeSelect>
                  {:else if field.type === "file"}
                    <Input
                      {id}
                      type="file"
                      name={field.name}
                      accept=".csv,.csv.gz"
                      required
                      disabled={pending || field.disabled}
                    />
                  {:else if field.type !== "textarea"}
                    <Input
                      {id}
                      type={field.type}
                      name={field.name}
                      value={field.value}
                      disabled={pending || field.disabled}
                      required={field.required}
                      readonly={field.name === "user.email"}
                      autocomplete={field.type === "password"
                        ? field.name === "c_password"
                          ? "current-password"
                          : "new-password"
                        : undefined}
                      aria-describedby={field.help ? `${id}-help` : undefined}
                    />
                  {/if}
                {/if}
                {#if field.name === "user.email"}
                  <p id={`${id}-help`} class="text-sm text-muted-foreground">
                    Your sign-in address is read-only here. An administrator can
                    change it in Users.
                  </p>
                {:else if field.help}<p
                    id={`${id}-help`}
                    class="max-w-prose text-sm text-muted-foreground"
                  >
                    {field.help}
                  </p>{/if}
              </div>
            {/each}
            {#if nativeForm.destructive}
              <label
                class="flex items-start gap-3 text-sm"
                for={`confirm-${formIndex}`}
                ><input
                  id={`confirm-${formIndex}`}
                  type="checkbox"
                  name="__confirm"
                  value="yes"
                  required
                  class="mt-1 size-4 accent-destructive"
                  disabled={pending}
                /><span
                  >I confirm: {nativeForm.title}. This changes stored data or
                  account access and may not be reversible.</span
                ></label
              >
            {/if}
          </FramePanel>
          <FrameFooter class="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant={nativeForm.destructive ? "destructive" : "default"}
              disabled={pending}
              >{pending ? "Submitting…" : nativeForm.submitLabel}</Button
            >
          </FrameFooter>
        </form>
        {#if data.section === "tokens" && /\/remove\/[1-9]\d*$/.test(nativeForm.id)}
          <FramePanel class="pt-0"
            ><form method="POST" use:enhance={begin}>
              <input
                type="hidden"
                name="__reveal"
                value={nativeForm.id.split("/").at(-1)}
              /><Button type="submit" variant="outline" disabled={pending}
                >Reveal token: {nativeForm.title.replace(
                  /^[^:]+:\s*/,
                  ""
                )}</Button
              >
            </form></FramePanel
          >
        {/if}
      </Frame>
    {/each}
    {#if !native.forms.length && !native.tables.length}
      <Alert
        ><AlertTitle>No administration controls available</AlertTitle
        ><AlertDescription
          >Your account may not have access, or this GoatCounter version uses
          different forms. API tokens also require a verified email address. No
          changes have been sent.</AlertDescription
        ></Alert
      >
    {/if}
  </div>
{/if}
