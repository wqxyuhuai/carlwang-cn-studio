import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPublicContent, sectionByKey } from "@/lib/public-content";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublicContent();
  const aboutIntro = sectionByKey(content, "about_intro");
  return {
    title: aboutIntro?.titleEn || "About",
    description: aboutIntro?.subtitleEn || "About Carl Wang Studio and contact."
  };
}

export default async function AboutPage() {
  redirect("/#about");
}
