/** Cloudflare Worker entry point for the local-only health explorer. */
import handler from "vinext/server/app-router-entry";

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
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
