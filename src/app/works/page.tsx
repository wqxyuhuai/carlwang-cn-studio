import type { Metadata } from "next";
import { WorksBrowser } from "@/components/works/works-browser";
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
  const content = await getPublicContent();
  const section = sectionByKey(content, "works_hero");
  const works = content.works.filter((work) => work.status === "Published").sort((left, right) => left.order - right.order);

  return (
    <main>
      <WorksBrowser title={section?.titleEn || "Works from"} workTypes={content.workTypes} works={works} />
    </main>
  );
}
