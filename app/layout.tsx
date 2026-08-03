import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  IBM_Plex_Mono,
  Manrope,
} from "next/font/google";
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

const localMetadataBase = "http://localhost:3000";
const socialImage = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "Will I Die Soon? — Your health is not a verdict. It is a map.",
};

function resolveMetadataBase(configuredUrl: string | undefined): URL {
  if (configuredUrl) {
    try {
      const parsedUrl = new URL(configuredUrl);
      if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
        return parsedUrl;
      }
    } catch {
      // Fall through to the local development URL.
    }
  }

  return new URL(localMetadataBase);
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(process.env.NEXT_PUBLIC_SITE_URL),
  title: "Will I Die Soon? | Health Risk Explorer",
  description:
    "A private, local-only prototype for exploring health signals and modifiable factors.",
  openGraph: {
    type: "website",
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
