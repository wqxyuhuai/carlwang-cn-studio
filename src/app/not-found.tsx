import Link from "next/link";

export default function NotFound() {
  return (
    <main className="hero">
      <div className="hero-inner">
        <h1 className="hero-title">Page not found.</h1>
        <Link className="link-line subtitle-type" href="/">
          Back home
        </Link>
      </div>
    </main>
  );
}
