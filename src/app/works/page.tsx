import type { Metadata } from "next";
import { WorksBrowser } from "@/components/works-browser";
import { getPublishedWorks } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Works",
  description: "Selected works by Carl Wang Studio across website, brand, interface, motion, campaign, and 3D render projects.",
};

export default async function WorksPage() {
  const works = await getPublishedWorks();

  return (
    <main>
      <WorksBrowser works={works} />
    </main>
  );
}
