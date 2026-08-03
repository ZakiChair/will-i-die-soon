export type MetadataOriginInput = {
  readonly configuredUrl?: string;
  readonly forwardedHost?: string | null;
  readonly forwardedProto?: string | null;
  readonly host?: string | null;
};

const LOCAL_METADATA_ORIGIN = "http://localhost:3000";
const EDGE_WHITESPACE_OR_CONTROL =
  /^[\s\u0000-\u001f\u007f-\u009f]|[\s\u0000-\u001f\u007f-\u009f]$/u;
const FORBIDDEN_HOST_SYNTAX =
  /[\s\u0000-\u001f\u007f-\u009f/@\\?#,%]/u;

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

function isValidDnsHostname(hostname: string): boolean {
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

function hasEdgeWhitespaceOrControl(value: string): boolean {
  return EDGE_WHITESPACE_OR_CONTROL.test(value);
}

function rawHostParts(
  value: string,
): { readonly hostname: string; readonly port: string | null } | null {
  if (!value || FORBIDDEN_HOST_SYNTAX.test(value)) return null;

  if (value.startsWith("[")) {
    const closingBracket = value.indexOf("]");
    if (closingBracket <= 1) return null;

    const remainder = value.slice(closingBracket + 1);
    if (remainder && !/^:\d+$/u.test(remainder)) return null;
    return {
      hostname: value.slice(0, closingBracket + 1),
      port: remainder ? remainder.slice(1) : null,
    };
  }

  const firstColon = value.indexOf(":");
  const lastColon = value.lastIndexOf(":");
  if (firstColon !== lastColon) return null;

  const hostname = firstColon === -1 ? value : value.slice(0, firstColon);
  const port = firstColon === -1 ? null : value.slice(firstColon + 1);
  if (!hostname || (port !== null && !/^\d+$/u.test(port))) return null;
  return { hostname, port };
}

function normalizedHost(value: string): string | null {
  const rawHost = rawHostParts(value);
  if (!rawHost) return null;

  try {
    const parsed = new URL(`https://${value}`);
    if (
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }

    if (rawHost.hostname.startsWith("[")) {
      if (!parsed.hostname.startsWith("[") || !parsed.hostname.endsWith("]")) {
        return null;
      }
    } else if (isIpv4(rawHost.hostname)) {
      if (parsed.hostname !== rawHost.hostname) return null;
    } else if (
      !isValidDnsHostname(rawHost.hostname) ||
      parsed.hostname !== rawHost.hostname.toLowerCase()
    ) {
      return null;
    }

    const normalizedPort =
      rawHost.port === null ? "" : `:${Number(rawHost.port)}`;
    return `${parsed.hostname}${normalizedPort}`;
  } catch {
    return null;
  }
}

function normalizedRoutedHost(
  value: string | null | undefined,
): string | null {
  if (!value || value.includes(",") || hasEdgeWhitespaceOrControl(value)) {
    return null;
  }
  return normalizedHost(value);
}

function normalizedForwardedHost(
  value: string | null | undefined,
): string | null {
  const token = firstHeaderToken(value);
  return token ? normalizedHost(token) : null;
}

function configuredOrigin(value: string | undefined): URL | null {
  if (
    !value ||
    hasEdgeWhitespaceOrControl(value) ||
    value.includes("@") ||
    value.includes("\\") ||
    value.includes("?") ||
    value.includes("#")
  ) {
    return null;
  }

  const schemeMatch = /^https?:\/\//iu.exec(value);
  if (!schemeMatch) return null;

  const authorityStart = schemeMatch[0].length;
  const pathStart = value.indexOf("/", authorityStart);
  if (pathStart !== -1 && pathStart !== value.length - 1) return null;

  const rawAuthority = value.slice(
    authorityStart,
    pathStart === -1 ? value.length : pathStart,
  );
  const host = normalizedHost(rawAuthority);
  if (!host) return null;

  try {
    const parsed = new URL(value);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash ||
      new URL(`${parsed.protocol}//${host}`).origin !== parsed.origin
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
  const hostname = parsed.hostname.endsWith(".")
    ? parsed.hostname.slice(0, -1)
    : parsed.hostname;
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    (isIpv4(hostname) && hostname.startsWith("127.")) ||
    hostname === "[::1]"
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

  const routedHost = normalizedRoutedHost(input.host);
  const forwardedHost = normalizedForwardedHost(input.forwardedHost);
  const corroboratedForwardedHost =
    routedHost !== null && forwardedHost === routedHost ? forwardedHost : null;
  const requestHost = corroboratedForwardedHost ?? routedHost;
  if (requestHost) {
    return new URL(`${requestProtocol(requestHost, input.forwardedProto)}//${requestHost}`);
  }

  return new URL(LOCAL_METADATA_ORIGIN);
}
