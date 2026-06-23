import Image from "next/image";
import Link from "next/link";
import type { Work } from "@/lib/types";

export function WorkCard({ work, priority = false, className = "" }: { work: Work; priority?: boolean; className?: string }) {
  return (
    <Link
      href={`/works/${work.slug}`}
      className={`group block overflow-hidden border border-[var(--color-line)] bg-[var(--color-surface)] ${className}`}
    >
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={work.coverImage.src}
          alt={work.coverImage.alt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 34vw, 100vw"
          className="object-cover transition duration-500 ease-[var(--ease-out)] group-hover:scale-[1.045]"
        />
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-black/10 to-transparent p-4 opacity-0 transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
          <div className="text-white">
            <p className="eyebrow opacity-80">
              {work.year} / {work.category}
            </p>
            <h3 className="mt-2 text-2xl uppercase leading-none">{work.title}</h3>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-4 p-4">
        <div>
          <h3 className="text-xl uppercase leading-none">{work.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted)]">{work.intro}</p>
        </div>
        <span className="eyebrow text-[var(--color-muted)]">{work.year}</span>
      </div>
    </Link>
  );
}
