import type { Metadata } from "next";
import { WorksBrowser } from "@/components/works/works-browser";

export const metadata: Metadata = {
  title: "Works",
  description: "Selected works by Carl Wang Studio."
};

export default function WorksPage() {
  return (
    <main>
      <WorksBrowser />
    </main>
  );
}
