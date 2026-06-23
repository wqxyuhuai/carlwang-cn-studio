import type { Metadata } from "next";
import Link from "next/link";
import { getStudioData } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const data = await getStudioData();
  const statusCounts = data.works.reduce<Record<string, number>>((acc, work) => {
    acc[work.status] = (acc[work.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <main className="page-shell py-10">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="surface h-fit p-5">
          <p className="eyebrow text-[var(--color-muted)]">Protected route required before production</p>
          <h1 className="mt-8 text-4xl uppercase leading-none">Admin Console</h1>
          <nav className="mt-8 grid gap-2 text-sm text-[var(--color-muted)]">
            <a href="#works">Works Management</a>
            <a href="#sync">Sync Status</a>
            <a href="#settings">Site Settings</a>
            <a href="#messages">Contact Messages</a>
          </nav>
        </aside>

        <div className="grid gap-6">
          <section className="grid gap-4 md:grid-cols-4">
            {["Draft", "Ready", "Published", "Failed"].map((status) => (
              <div className="surface p-5" key={status}>
                <p className="eyebrow text-[var(--color-muted)]">{status}</p>
                <strong className="mt-8 block text-5xl">{statusCounts[status] || 0}</strong>
              </div>
            ))}
          </section>

          <section id="works" className="surface overflow-x-auto p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-3xl uppercase leading-none">Works Management</h2>
              <button className="btn btn-primary" type="button">
                Sync all
              </button>
            </div>
            <table className="w-full min-w-[780px] border-collapse text-left text-sm">
              <thead className="text-[var(--color-muted)]">
                <tr className="border-b border-[var(--color-line)]">
                  <th className="py-3">Title</th>
                  <th>Year</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Featured</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.works.map((work) => (
                  <tr className="border-b border-[var(--color-line)]" key={work.slug}>
                    <td className="py-4">{work.title}</td>
                    <td>{work.year}</td>
                    <td>{work.category}</td>
                    <td>{work.status}</td>
                    <td>{work.featured ? "Yes" : "No"}</td>
                    <td className="flex gap-2 py-3">
                      <Link className="btn min-h-9 px-3 py-1" href={`/works/${work.slug}`}>
                        Preview
                      </Link>
                      <button className="btn min-h-9 px-3 py-1" type="button">
                        Publish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section id="sync" className="grid gap-4 md:grid-cols-3">
            <div className="surface p-5 md:col-span-2">
              <h2 className="text-3xl uppercase leading-none">Sync Status</h2>
              <p className="mt-6 text-[var(--color-muted)]">Source: {data.sync.source}</p>
              <p className="mt-2 text-[var(--color-muted)]">{data.sync.error || `Last synced at ${data.sync.lastSyncedAt}`}</p>
            </div>
            <div className="surface p-5">
              <h2 className="text-3xl uppercase leading-none">Error Log</h2>
              <p className="mt-6 text-sm text-[var(--color-muted)]">Unsupported blocks and OSS failures should be listed here after the server sync is connected.</p>
            </div>
          </section>

          <section id="settings" className="surface p-5">
            <h2 className="text-3xl uppercase leading-none">Site Settings</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="eyebrow text-[var(--color-muted)]">Accent Color</span>
                <input className="border border-[var(--color-line)] bg-transparent p-3" readOnly value={data.settings.accentColor} />
              </label>
              <label className="grid gap-2">
                <span className="eyebrow text-[var(--color-muted)]">Default Theme</span>
                <input className="border border-[var(--color-line)] bg-transparent p-3" readOnly value={data.settings.defaultTheme} />
              </label>
            </div>
          </section>

          <section id="messages" className="surface p-5">
            <h2 className="text-3xl uppercase leading-none">Contact Messages</h2>
            <div className="mt-6 border border-dashed border-[var(--color-line)] p-8 text-[var(--color-muted)]">
              Empty state: no messages have been connected yet.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
