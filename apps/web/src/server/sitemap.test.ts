import { describe, expect, it } from "vitest";

import { parsePost } from "../blog/parse-post.js";
import { MARKETPLACE_V2_FIXTURE } from "../marketplace/marketplace-v2.fixture.js";
import { sitemapXml } from "./sitemap.js";

const post = parsePost(
  "an-agentic-ide",
  "---\ntitle: An agentic IDE\ndate: 2026-08-20\nlede: A post.\n---\nBody.\n",
);

describe("sitemapXml", () => {
  it("lists public pages, posts, plugins, and unique authors with update dates", () => {
    const xml = sitemapXml("https://cc.example.invalid", [post], ["/compare/a-b"], {
      status: "available",
      manifest: MARKETPLACE_V2_FIXTURE,
      stats: null,
    });

    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    for (const path of [
      "/",
      "/download",
      "/blog",
      "/changelog",
      "/plugin-guide",
      "/privacy",
      "/brand",
      "/compare/a-b",
      "/marketplace",
      "/marketplace?category=thread-content",
      "/marketplace?category=code-and-reviews",
      "/blog/an-agentic-ide",
      "/marketplace/prompt-library",
      "/marketplace/review-companion",
      "/marketplace/author/codythatsme",
      "/marketplace/author/acme-tools",
    ]) {
      expect(xml).toContain(`<loc>https://cc.example.invalid${path}</loc>`);
    }
    expect(xml).toContain("<lastmod>2026-08-20</lastmod>");
    expect(xml).toContain("<lastmod>2026-08-24T16:45:00+02:00</lastmod>");
    expect(
      xml.match(
        /<loc>https:\/\/cc\.example\.invalid\/marketplace\/author\/codythatsme<\/loc>/gu,
      ),
    ).toHaveLength(1);
    expect(xml).not.toContain("category=future-tools");
    expect(xml).not.toContain("/dashboard");
    expect(xml).not.toContain("/marketplace/v2/");
  });

  it("omits unavailable marketplace pages", () => {
    const xml = sitemapXml("https://cc.example.invalid", [post], [], {
      status: "unavailable",
    });

    expect(xml).toContain("<loc>https://cc.example.invalid/blog/an-agentic-ide</loc>");
    expect(xml).not.toContain("/marketplace");
  });
});
