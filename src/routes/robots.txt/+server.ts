import type { RequestHandler } from "./$types";

// Crawlers must be able to read noindex headers, including on shared links.
// robots.txt is not access control; authentication still protects private data.
export const GET: RequestHandler = async () => {
  const body = `User-agent: *
Allow: /
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "max-age=0, s-maxage=3600",
    },
  });
};
