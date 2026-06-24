import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";

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
    <html data-scroll-behavior="smooth" lang="en">
      <body>
        <div className="site-frame">
          <SiteNav />
          {children}
        </div>
      </body>
    </html>
  );
}
