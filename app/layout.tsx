import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  Bricolage_Grotesque,
  IBM_Plex_Mono,
  Manrope,
} from "next/font/google";
import { resolveMetadataOrigin } from "./lib/metadata";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-data",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const metadataBase = resolveMetadataOrigin({
    configuredUrl: process.env.NEXT_PUBLIC_SITE_URL,
    forwardedHost: requestHeaders.get("x-forwarded-host"),
    forwardedProto: requestHeaders.get("x-forwarded-proto"),
    host: requestHeaders.get("host"),
  });
  const rootUrl = new URL("/", metadataBase);
  const socialImage = {
    url: new URL("/og.png", metadataBase),
    width: 1200,
    height: 630,
    alt: "Will I Die Soon? — Your health is not a verdict. It is a map.",
  };

  return {
    metadataBase,
    title: "Will I Die Soon? | Health Risk Explorer",
    description:
      "A private, local-only prototype for exploring health signals and modifiable factors.",
    alternates: {
      canonical: rootUrl,
    },
    openGraph: {
      type: "website",
      url: rootUrl,
      title: "Will I Die Soon?",
      description: "Your health is not a verdict. It is a map.",
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: "Will I Die Soon?",
      description: "Your health is not a verdict. It is a map.",
      images: [socialImage],
    },
    icons: {
      icon: "/favicon.svg",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
