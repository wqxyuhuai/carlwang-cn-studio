import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@/components/common/reveal-media.css";
import "@/components/video/video-player.css";
import { GlassDistortionFilter } from "@/components/glass-distortion-filter";
import { ImageProtection } from "@/components/image-protection";
import { SiteCursor } from "@/components/site-cursor";

const themeInitScript = `(() => {
  try {
    document.documentElement.dataset.theme = "dark";
    window.localStorage.setItem("theme", "dark");
    const view = new URLSearchParams(window.location.search).get("view");
    const isWorksIndex = window.location.hash === "#works-index" || window.location.hash === "#works-list" || view === "grid" || view === "list";
    document.documentElement.dataset.workTab = isWorksIndex ? "list" : "featured";
  } catch {
  }
})();`;

export const metadata: Metadata = {
  metadataBase: new URL("https://studio.carlwang.cn"),
  title: {
    default: "Carl Wang Studio",
    template: "%s | Carl Wang Studio"
  },
  description: "A designer working across visual, digital and spatial systems.",
  openGraph: {
    title: "Carl Wang Studio",
    description: "Visual, digital and spatial systems by Carl Wang Studio.",
    url: "https://studio.carlwang.cn",
    siteName: "Carl Wang Studio",
    type: "website"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-scroll-behavior="smooth" data-theme="dark" lang="en" suppressHydrationWarning>
      <head>
        <link
          as="font"
          crossOrigin="anonymous"
          href="/fonts/bebas-neue/BebasNeue-Bold.woff2?v=576ce7f040fa"
          rel="preload"
          type="font/woff2"
        />
        <link
          as="font"
          crossOrigin="anonymous"
          href="/fonts/sf-pro/SF-Pro-Display-Regular.woff2?v=c41e3c28bca0"
          rel="preload"
          type="font/woff2"
        />
        <link
          as="font"
          crossOrigin="anonymous"
          href="/fonts/sf-pro/SF-Pro-Display-Medium.woff2?v=6bad112c5e4a"
          rel="preload"
          type="font/woff2"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <GlassDistortionFilter />
        <ImageProtection />
        <SiteCursor />
        <div className="site-frame">
          {children}
        </div>
      </body>
    </html>
  );
}
