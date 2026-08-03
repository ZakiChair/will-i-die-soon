import { expect, test, vi } from "vitest";

const server = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock("vinext/server/app-router-entry", () => ({
  default: { fetch: server.fetch },
}));

import worker from "./index";

test("applies the security baseline to the handler response without changing its payload", async () => {
  server.fetch.mockResolvedValue(
    new Response("rendered page", {
      status: 202,
      statusText: "Rendered",
      headers: { "content-type": "text/html; charset=utf-8" },
    }),
  );

  const response = await worker.fetch(
    new Request("https://private.example/"),
    { ASSETS: { fetch: vi.fn() } },
    { waitUntil: vi.fn(), passThroughOnException: vi.fn() },
  );

  expect(response.status).toBe(202);
  expect(response.statusText).toBe("Rendered");
  expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("content-security-policy")).toContain(
    "frame-ancestors 'none'",
  );
  await expect(response.text()).resolves.toBe("rendered page");
});
