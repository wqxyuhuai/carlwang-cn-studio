import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPublicContent, sectionByKey } from "@/lib/public-content";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublicContent();
  const section = sectionByKey(content, "works_hero");
  return {
    title: section?.titleEn || "Works",
    description: section?.subtitleEn || "Selected works by Carl Wang Studio."
  };
}

export default async function WorksPage() {
  redirect("/?view=grid#works-index");
}
