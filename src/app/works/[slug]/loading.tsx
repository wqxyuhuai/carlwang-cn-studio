import { WorkDetailClose } from "@/components/works/work-detail-close";

export default function WorkDetailLoading() {
  return (
    <main className="pw-detail-page pw-detail-page--loading" aria-busy="true" aria-label="Loading work">
      <WorkDetailClose />
      <aside className="pw-detail-left" aria-hidden="true">
        <div className="pw-detail-loading-summary">
          <span className="pw-detail-loading-cover" />
          <span className="pw-detail-loading-line is-title" />
          <span className="pw-detail-loading-line is-meta" />
        </div>
      </aside>
      <section className="pw-detail-right" aria-hidden="true">
        <div className="pw-detail-loading-body">
          <span className="pw-detail-loading-line is-copy" />
          <span className="pw-detail-loading-line is-copy is-short" />
          <span className="pw-detail-loading-media" />
        </div>
      </section>
    </main>
  );
}
