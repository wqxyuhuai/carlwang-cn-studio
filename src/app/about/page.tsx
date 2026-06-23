import Image from "next/image";
import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { getStudioData } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "About",
  description: "About Carl Wang Studio, design direction, skills, experience, and contact.",
};

export default async function AboutPage() {
  const { about } = await getStudioData();

  return (
    <main>
      <section className="framed-page relative overflow-hidden px-5 pb-5 pt-20 md:px-8">
        <div className="grid min-h-[calc(100dvh-8rem)] grid-cols-1 grid-rows-[auto_1fr_auto] gap-10">
          <div className="grid gap-10 lg:grid-cols-[0.42fr_0.58fr]">
            <aside className="hidden max-w-xs pt-10 lg:block">
              <div className="border-l border-[var(--color-line)] pl-6 text-[var(--color-muted)]">
                <span className="block text-5xl leading-none text-[var(--color-muted)]">“</span>
                <p className="mt-3 text-2xl font-semibold leading-tight">Clear systems, enhanced by motion and detail</p>
                <p className="mt-5 text-sm uppercase">Carl Wang Studio</p>
              </div>
            </aside>

            <section className="mx-auto w-full max-w-[520px]">
              <h1 className="text-[clamp(1.9rem,2.4vw,3rem)] font-semibold leading-[1.05]">
                Carl Wang designs visual systems, web experiences, and motion-driven digital products.
              </h1>
              <p className="mt-8 text-base leading-7 text-[var(--color-muted)]">{about.bio}</p>
              <figure className="mt-8">
                <div className="relative aspect-square overflow-hidden bg-[var(--color-soft)]">
                  <Image src="/reference/A1 4.webp" alt="Carl Wang Studio about visual reference" fill priority className="object-cover grayscale" sizes="520px" />
                </div>
              </figure>
            </section>
          </div>

          <section className="mx-auto w-full max-w-[520px] self-start lg:ml-[45%] lg:mr-auto">
            <h2 className="text-2xl font-semibold">Work Experience</h2>
            <div className="mt-6 grid gap-7">
              {about.experience.slice(0, 3).map((item) => (
                <article key={item.company}>
                  <h3 className="font-semibold">{item.company}</h3>
                  <p className="text-sm text-[var(--color-muted)]">{item.period}</p>
                  <p className="mt-2 text-sm leading-6">{item.summary}</p>
                </article>
              ))}
            </div>
          </section>

          <div className="grid items-end gap-6 md:grid-cols-[1fr_auto]">
            <h2 className="poster-type text-[clamp(5rem,15vw,14rem)] lowercase">about</h2>
            <div className="flex gap-6 pb-5 text-sm text-[var(--color-muted)]">
              {about.socialLinks.slice(0, 3).map((link) => (
                <a className="underlined-link" href={link.href} key={link.label} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="page-shell py-28">
        <div className="grid gap-16 border-t border-[var(--color-line)] pt-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
          <div>
            <h2 className="poster-type text-[clamp(4.5rem,12vw,11rem)]">Contact</h2>
            <p className="sparse-copy mt-6">For selected brand, web, interface, and motion work.</p>
          </div>
          <div className="grid min-w-0 gap-10">
            <div>
              <a className="break-words text-4xl uppercase leading-none md:text-5xl xl:text-6xl" href={`mailto:${about.email}`}>
                {about.email}
              </a>
              <div className="mt-8 flex flex-wrap gap-5 text-sm uppercase">
                {about.socialLinks.map((link) => (
                  <a className="underlined-link" href={link.href} key={link.label} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>
    </main>
  );
}
