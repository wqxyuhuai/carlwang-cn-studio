import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell grid min-h-[calc(100dvh-4rem)] place-items-center py-20">
      <div className="max-w-2xl">
        <p className="eyebrow text-[var(--color-muted)]">404</p>
        <h1 className="display-type mt-8 text-[var(--text-page-title)]">Page not found</h1>
        <p className="mt-8 text-lg leading-8 text-[var(--color-muted)]">The requested page does not exist or is not published.</p>
        <Link className="btn btn-primary mt-8" href="/works">
          Browse works
        </Link>
      </div>
    </main>
  );
}
