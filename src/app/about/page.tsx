import Image from "next/image";
import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { ExperienceList } from "@/components/experience-list";
import { FooterNavigation } from "@/components/footer-navigation";
import { getStudioData } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "About",
  description: "About Carl Wang Studio, design direction, skills, experience, and contact.",
};

export default async function AboutPage() {
  const { about } = await getStudioData();

  return (
    <main>
      <section className="page-shell grid min-h-[72dvh] gap-10 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="eyebrow text-[var(--color-muted)]">{about.title}</p>
          <h1 className="display-type mt-8 text-[var(--text-page-title)]">About</h1>
        </div>
        <div className="grid gap-6">
          <div className="relative aspect-[4/3] overflow-hidden border border-[var(--color-line)]">
            <Image src="/reference/A2 1.webp" alt="About visual reference" fill priority className="object-cover" sizes="60vw" />
          </div>
          <p className="max-w-2xl text-xl leading-8 text-[var(--color-muted)]">{about.bio}</p>
        </div>
      </section>

      <section className="page-shell border-y border-[var(--color-line)] py-16">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <h2 className="section-title">Design Direction</h2>
          <p className="max-w-3xl text-2xl leading-9">
            {about.intro} I use strong type, structured image rhythm, and tokenized systems to make the work easier to maintain after launch.
          </p>
        </div>
      </section>

      <section className="page-shell py-20">
        <div className="mb-10 grid gap-6 md:grid-cols-[0.8fr_1.2fr]">
          <h2 className="section-title">Skills</h2>
          <p className="text-lg leading-8 text-[var(--color-muted)]">Each group maps to a repeatable service area and a concrete part of the production workflow.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {about.skills.map((group) => (
            <section className="surface p-5" key={group.name}>
              <h3 className="text-2xl uppercase leading-none">{group.name}</h3>
              <ul className="mt-8 grid gap-3 text-sm text-[var(--color-muted)]">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <section className="page-shell pb-20">
        <div className="mb-10">
          <h2 className="section-title">Experience</h2>
        </div>
        <ExperienceList experience={about.experience} />
      </section>

      <section id="contact" className="page-shell pb-24 pt-6">
        <div className="border-y border-[var(--color-line)] py-14">
          <h2 className="display-type text-[clamp(4rem,12vw,12rem)]">Contact</h2>
          <div className="mt-10 grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <a className="text-4xl uppercase leading-none md:text-6xl" href={`mailto:${about.email}`}>
                {about.email}
              </a>
              <div className="mt-8 flex flex-wrap gap-2">
                {about.socialLinks.map((link) => (
                  <a className="btn" href={link.href} key={link.label} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>

      <FooterNavigation />
    </main>
  );
}
