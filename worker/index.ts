/** Cloudflare Worker entry point for the local-only health explorer. */
import handler from "vinext/server/app-router-entry";
import { withSecurityHeaders } from "./security-headers";

interface AssetFetcher {
  fetch(request: Request): Response | Promise<Response>;
}

interface Env {
  readonly ASSETS: AssetFetcher;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const response = await handler.fetch(request, env, ctx);
    return withSecurityHeaders(response);
  },
};

export default worker;
