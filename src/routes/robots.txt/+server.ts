import type { RequestHandler } from "./$types";

// Served dynamically so the sitemap URL matches the self-hosted origin
// instead of a hard-coded domain. Private areas stay out of crawlers.
export const GET: RequestHandler = async ({ url }) => {
  const body = `User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /setup
Disallow: /api/
Disallow: /logout

Sitemap: ${url.origin}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "max-age=0, s-maxage=3600",
    },
  });
};
