import { describe, expect, it } from "vitest";

import { canonicalHref } from "./canonical";

function match(
  pathname: string,
  overrides: {
    status?: string;
    globalNotFound?: boolean;
    ownsCanonical?: boolean;
  } = {},
) {
  return {
    pathname,
    status: overrides.status ?? "success",
    globalNotFound: overrides.globalNotFound ?? false,
    staticData:
      overrides.ownsCanonical === undefined
        ? {}
        : { ownsCanonical: overrides.ownsCanonical },
  };
}

describe("canonicalHref", () => {
  it.each([
    {
      name: "the home page",
      matches: [match("/")],
      href: "https://cc.example.invalid/",
    },
    {
      name: "a leaf page",
      matches: [match("/"), match("/plugin-guide")],
      href: "https://cc.example.invalid/plugin-guide",
    },
    {
      name: "a trailing slash",
      matches: [match("/"), match("/blog/")],
      href: "https://cc.example.invalid/blog",
    },
    {
      name: "a leaf that is not found",
      matches: [match("/"), match("/blog/missing", { status: "notFound" })],
      href: null,
    },
    {
      name: "a global not-found",
      matches: [match("/", { globalNotFound: true })],
      href: null,
    },
    {
      name: "a route that owns its canonical",
      matches: [match("/"), match("/guides/x", { ownsCanonical: true })],
      href: null,
    },
    {
      name: "a child of a route that owns its own canonical",
      matches: [
        match("/"),
        match("/marketplace", { ownsCanonical: true }),
        match("/marketplace/advisor"),
      ],
      href: "https://cc.example.invalid/marketplace/advisor",
    },
  ])("returns the canonical for $name", ({ matches, href }) => {
    expect(canonicalHref(matches)).toBe(href);
  });
});
