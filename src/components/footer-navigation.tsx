import Link from "next/link";

export function FooterNavigation() {
  return (
    <footer className="page-shell border-t border-[var(--color-line)] py-8">
      <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="eyebrow text-[var(--color-muted)]">Carl Wang Studio</p>
          <p className="mt-3 max-w-xl text-sm text-[var(--color-muted)]">
            Visual systems, web experiences, product interfaces, and motion-driven content.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn" href="/works">
            Works
          </Link>
          <Link className="btn btn-primary" href="/about#contact">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
