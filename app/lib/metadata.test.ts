import { describe, expect, test } from "vitest";

import { resolveMetadataOrigin } from "./metadata";

describe("resolveMetadataOrigin", () => {
  test("prefers an explicit origin-only HTTP(S) site URL", () => {
    expect(
      resolveMetadataOrigin({
        configuredUrl: "https://research.example:8443/",
        forwardedHost: "ignored.example",
        forwardedProto: "https",
        host: "also-ignored.example",
      }),
    ).toEqual(new URL("https://research.example:8443/"));
  });

  test("accepts a matching forwarded host without changing the routed host", () => {
    expect(
      resolveMetadataOrigin({
        forwardedHost: "preview.example:443, attacker.invalid",
        forwardedProto: "https, http",
        host: "preview.example:443",
      }),
    ).toEqual(new URL("https://preview.example/"));
  });

  test("does not let a valid but untrusted forwarded host replace the routed host", () => {
    expect(
      resolveMetadataOrigin({
        forwardedHost: "attacker.example",
        forwardedProto: "https",
        host: "private-preview.example",
      }),
    ).toEqual(new URL("https://private-preview.example/"));
  });

  test("falls back locally rather than trusting a forwarded host without a routed host", () => {
    expect(
      resolveMetadataOrigin({
        forwardedHost: "attacker.example",
        forwardedProto: "https",
      }),
    ).toEqual(new URL("http://localhost:3000/"));
  });

  test("uses the host fallback and keeps localhost on HTTP", () => {
    expect(
      resolveMetadataOrigin({
        host: "localhost:3000, ignored.example",
        forwardedProto: "https, http",
      }),
    ).toEqual(new URL("http://localhost:3000/"));

    expect(resolveMetadataOrigin({ host: "research.example:8080" })).toEqual(
      new URL("https://research.example:8080/"),
    );

    expect(
      resolveMetadataOrigin({
        host: "127.1.2.3:3000",
        forwardedProto: "https",
      }),
    ).toEqual(new URL("http://127.1.2.3:3000/"));
  });

  test.each([
    "https://user:secret@configured.example",
    "https://configured.example/private",
    "https://configured.example/?draft=1",
    "https://configured.example/#draft",
    "ftp://configured.example",
    "not a URL",
  ])("rejects a configured value outside the origin-only contract: %s", (configuredUrl) => {
    expect(
      resolveMetadataOrigin({
        configuredUrl,
        forwardedHost: "safe-request.example",
        forwardedProto: "https",
        host: "safe-request.example",
      }),
    ).toEqual(new URL("https://safe-request.example/"));
  });

  test.each([
    "user@host.example",
    "host.example/path",
    "host.example?query=1",
    "host.example#fragment",
    "https://host.example",
    "bad host.example",
    "-bad.example",
    "bad..example",
  ])("rejects hostile or invalid host syntax: %s", (forwardedHost) => {
    expect(
      resolveMetadataOrigin({
        configuredUrl: "https://configured.example/private",
        forwardedHost,
        forwardedProto: "javascript, https",
      }),
    ).toEqual(new URL("http://localhost:3000/"));
  });

  test("uses the local fallback when no candidate is valid", () => {
    expect(resolveMetadataOrigin({})).toEqual(new URL("http://localhost:3000/"));
  });
});
