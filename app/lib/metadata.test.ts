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

  test.each([
    ["http://configured.example", "http://configured.example/"],
    ["http://configured.example:80", "http://configured.example/"],
    ["http://configured.example:443/", "http://configured.example:443/"],
    ["https://configured.example:8443/", "https://configured.example:8443/"],
    ["https://configured.example:443", "https://configured.example/"],
    ["https://configured.example:80", "https://configured.example:80/"],
    ["https://192.0.2.10:9443", "https://192.0.2.10:9443/"],
    ["http://[2001:db8::1]:8080/", "http://[2001:db8::1]:8080/"],
  ])("accepts a valid configured origin: %s", (configuredUrl, expected) => {
    expect(resolveMetadataOrigin({ configuredUrl })).toEqual(new URL(expected));
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

  test("uses a valid routed host when no configured origin exists", () => {
    expect(resolveMetadataOrigin({ host: "research.example:8080" })).toEqual(
      new URL("https://research.example:8080/"),
    );
  });

  test.each([
    ["localhost:3000", "http://localhost:3000/"],
    ["localhost:443", "http://localhost:443/"],
    ["localhost.:3004", "http://localhost.:3004/"],
    ["api.localhost:3001", "http://api.localhost:3001/"],
    ["api.localhost.:3005", "http://api.localhost.:3005/"],
    ["127.0.0.1:3002", "http://127.0.0.1:3002/"],
    ["127.255.255.254", "http://127.255.255.254/"],
    ["[::1]:3003", "http://[::1]:3003/"],
  ])("keeps a local routed host on HTTP: %s", (host, expected) => {
    expect(
      resolveMetadataOrigin({
        host,
        forwardedProto: "https",
      }),
    ).toEqual(new URL(expected));
  });

  test.each([
    " https://configured.example",
    "https://configured.example ",
    "\thttps://configured.example",
    "https://configured.example\n",
    "https://user:secret@configured.example",
    "https://@configured.example",
    "https://:@configured.example",
    "https://configured.example/private",
    "https://configured.example//",
    "https://configured.example/.",
    "https://configured.example/%2e",
    "https://configured.example/?draft=1",
    "https://configured.example?",
    "https://configured.example/#draft",
    "https://configured.example#",
    "https://configured.example\\",
    "https:\\configured.example",
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
    "preview.example, attacker.invalid",
    "preview.example,",
    ", preview.example",
    " preview.example",
    "preview.example ",
    "\tpreview.example",
    "preview.example\r",
    "\u0000preview.example",
    "preview.example\u001f",
  ])("rejects a non-singleton or padded routed Host: %s", (host) => {
    expect(
      resolveMetadataOrigin({
        forwardedHost: "preview.example, attacker.invalid",
        forwardedProto: "https, http",
        host,
      }),
    ).toEqual(new URL("http://localhost:3000/"));
  });

  test.each([
    ["preview.example:8443", "https://preview.example:8443/"],
    ["192.0.2.15:8080", "https://192.0.2.15:8080/"],
    ["[2001:db8::15]:8080", "https://[2001:db8::15]:8080/"],
  ])("accepts a valid routed Host: %s", (host, expected) => {
    expect(resolveMetadataOrigin({ host })).toEqual(new URL(expected));
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
    "under_score.example",
    "ex%61mple.example",
    "2130706433",
    "0177.0.0.1",
    "0x7f000001",
  ])("rejects hostile, encoded, or non-canonical routed Host syntax: %s", (host) => {
    expect(
      resolveMetadataOrigin({
        configuredUrl: "https://configured.example/private",
        forwardedHost: "safe-request.example",
        forwardedProto: "javascript, https",
        host,
      }),
    ).toEqual(new URL("http://localhost:3000/"));
  });

  test("uses the local fallback when no candidate is valid", () => {
    expect(resolveMetadataOrigin({})).toEqual(new URL("http://localhost:3000/"));
  });
});
