import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { WebVitals } from "@/components/web-vitals";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  // No page shows monospace text, so don't download it on every page.
  // A page that uses it still gets it.
  preload: false,
});

export const metadata: Metadata = {
  // Social previews need full links, like https://.../opengraph-image.
  metadataBase: new URL(siteUrl),
  title: {
    // Pages that set their own title get "Projects · Shipboard".
    template: "%s · Shipboard",
    default: "Shipboard",
  },
  description: "Plan the work, track every issue and ship with confidence.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
