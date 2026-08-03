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

export const metadata: Metadata = {
  title: "Will I Die Soon? | Health Risk Explorer",
  description:
    "A private, local-only prototype for exploring health signals and modifiable factors.",
  openGraph: {
    type: "website",
    title: "Will I Die Soon?",
    description: "Your health is not a verdict. It is a map.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Will I Die Soon? — Your health is not a verdict. It is a map.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Will I Die Soon?",
    description: "Your health is not a verdict. It is a map.",
    images: ["/og.png"],
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
