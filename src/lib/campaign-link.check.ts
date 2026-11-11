// Run: node --experimental-strip-types src/lib/campaign-link.check.ts
import assert from "node:assert/strict";
import { buildCampaignUrl } from "./campaign-link.ts";

const EMPTY = {
  campaign: "",
  content: "",
  medium: "",
  source: "",
  term: "",
  url: "",
};

// Tags follow the page's own query and keep the hash.
assert.deepEqual(
  buildCampaignUrl({
    ...EMPTY,
    campaign: "spring sale",
    medium: "email",
    source: "newsletter",
    url: " https://example.com/pricing?plan=pro#faq ",
  }),
  {
    url: "https://example.com/pricing?plan=pro&utm_source=newsletter&utm_medium=email&utm_campaign=spring%20sale#faq",
  }
);

// Existing utm_* values are replaced; other parameters keep their encoding.
assert.deepEqual(
  buildCampaignUrl({
    ...EMPTY,
    campaign: "launch",
    content: "hero & footer",
    source: "x.com",
    term: "analytics",
    url: "http://example.com/?q=a%20b&utm_source=old&utm_medium=cpc&utm_id=7",
  }),
  {
    url: "http://example.com/?q=a%20b&utm_id=7&utm_source=x.com&utm_campaign=launch&utm_term=analytics&utm_content=hero%20%26%20footer",
  }
);

// Required fields and http(s) only.
assert.deepEqual(buildCampaignUrl(EMPTY), {
  invalid: ["url", "source", "campaign"],
});
for (const url of ["example.com", "ftp://example.com", "javascript:alert(1)"]) {
  assert.deepEqual(
    buildCampaignUrl({ ...EMPTY, campaign: "c", source: "s", url }),
    { invalid: ["url"] },
    url
  );
}
assert.deepEqual(
  buildCampaignUrl({
    ...EMPTY,
    campaign: " ",
    source: "s",
    url: "https://a.b",
  }),
  { invalid: ["campaign"] }
);

console.log("campaign-link: all checks passed");
