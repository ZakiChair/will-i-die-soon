export type MetadataOriginInput = {
  readonly configuredUrl?: string;
  readonly forwardedHost?: string | null;
  readonly forwardedProto?: string | null;
  readonly host?: string | null;
};

const LOCAL_METADATA_ORIGIN = "http://localhost:3000";

function firstHeaderToken(value: string | null | undefined): string | null {
  const token = value?.split(",", 1)[0]?.trim();
  return token ? token : null;
}

function isIpv4(hostname: string): boolean {
  const parts = hostname.split(".");
  return (
    parts.length === 4 &&
    parts.every(
      (part) =>
        /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255,
    )
  );
}

function isValidHostname(hostname: string): boolean {
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;
  if (hostname.startsWith("[") && hostname.endsWith("]")) return true;
  if (isIpv4(hostname)) return true;

  const withoutFinalDot = hostname.endsWith(".")
    ? hostname.slice(0, -1)
    : hostname;
  if (!withoutFinalDot || withoutFinalDot.length > 253) return false;
  return withoutFinalDot.split(".").every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label),
  );
}

function normalizedRequestHost(value: string | null | undefined): string | null {
  const token = firstHeaderToken(value);
  if (!token || /[\s/@\\?#]/u.test(token)) return null;

  try {
    const parsed = new URL(`https://${token}`);
    if (
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash ||
      !isValidHostname(parsed.hostname)
    ) {
      return null;
    }
    return parsed.host;
  } catch {
    return null;
  }
}

function configuredOrigin(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    const parsed = new URL(value.trim());
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash ||
      !isValidHostname(parsed.hostname)
    ) {
      return null;
    }
    return new URL(parsed.origin);
  } catch {
    return null;
  }
}

function isLocalHost(host: string): boolean {
  const parsed = new URL(`https://${host}`);
  return (
    parsed.hostname === "localhost" ||
    parsed.hostname.endsWith(".localhost") ||
    (isIpv4(parsed.hostname) && parsed.hostname.startsWith("127.")) ||
    parsed.hostname === "[::1]"
  );
}

function requestProtocol(host: string, forwardedProto: string | null | undefined) {
  const local = isLocalHost(host);
  const requested = firstHeaderToken(forwardedProto)?.toLowerCase();
  if (local) return "http:";
  if (requested === "https") return "https:";
  return "https:";
}

export function resolveMetadataOrigin(input: MetadataOriginInput): URL {
  const configured = configuredOrigin(input.configuredUrl);
  if (configured) return configured;

  const routedHost = normalizedRequestHost(input.host);
  const forwardedHost = normalizedRequestHost(input.forwardedHost);
  const corroboratedForwardedHost =
    routedHost !== null && forwardedHost === routedHost ? forwardedHost : null;
  const requestHost = corroboratedForwardedHost ?? routedHost;
  if (requestHost) {
    return new URL(`${requestProtocol(requestHost, input.forwardedProto)}//${requestHost}`);
  }

  return new URL(LOCAL_METADATA_ORIGIN);
}
