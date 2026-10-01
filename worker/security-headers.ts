export const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
} as const;

export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}
