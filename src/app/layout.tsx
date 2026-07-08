import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@/components/common/reveal-media.css";
import "@/components/video/video-player.css";
import { GlassDistortionFilter } from "@/components/glass-distortion-filter";
import { SiteCursor } from "@/components/site-cursor";
import { SiteNav } from "@/components/site-nav";

const themeInitScript = `(() => {
  try {
    document.documentElement.dataset.theme = "dark";
    window.localStorage.setItem("theme", "dark");
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
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <GlassDistortionFilter />
        <SiteCursor />
        <div className="site-frame">
          <SiteNav />
          {children}
        </div>
      </body>
    </html>
  );
}
