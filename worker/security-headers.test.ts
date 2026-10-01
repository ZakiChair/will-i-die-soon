import { expect, test } from "vitest";

import nextConfig from "../next.config";
import { withSecurityHeaders } from "./security-headers";

const EXPECTED_HEADERS = {
  "content-security-policy":
    "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
  "cross-origin-opener-policy": "same-origin",
  "permissions-policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
} as const;

test("adds the release security baseline without consuming or changing the response", () => {
  const response = new Response("local response", {
    status: 201,
    statusText: "Created locally",
    headers: { "x-existing": "kept" },
  });
  const body = response.body;

  const secured = withSecurityHeaders(response);

  expect(secured).not.toBe(response);
  expect(secured.body).toBe(body);
  expect(secured.bodyUsed).toBe(false);
  expect(response.bodyUsed).toBe(false);
  expect(secured.status).toBe(201);
  expect(secured.statusText).toBe("Created locally");
  expect(secured.headers.get("x-existing")).toBe("kept");
  for (const [name, value] of Object.entries(EXPECTED_HEADERS)) {
    expect(secured.headers.get(name), name).toBe(value);
  }
});

test("declares the same baseline for every Next.js route on hosts without the Worker", async () => {
  const rules = await nextConfig.headers?.();

  expect(rules).toHaveLength(1);
  expect(rules?.[0].source).toBe("/:path*");
  expect(
    Object.fromEntries(rules?.[0].headers.map(({ key, value }) => [key.toLowerCase(), value]) ?? []),
  ).toEqual(EXPECTED_HEADERS);
});

test("preserves stricter response policies already supplied by the application", () => {
  const csp =
    "default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'";
  const response = new Response(null, {
    headers: {
      "content-security-policy": csp,
      "referrer-policy": "no-referrer",
      "x-frame-options": "DENY",
    },
  });

  const secured = withSecurityHeaders(response);

  expect(secured.headers.get("content-security-policy")).toBe(csp);
  expect(secured.headers.get("referrer-policy")).toBe("no-referrer");
  expect(secured.headers.get("x-frame-options")).toBe("DENY");
});
