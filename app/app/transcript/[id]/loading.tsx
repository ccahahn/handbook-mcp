import Link from "next/link";

export default function Loading() {
  return (
    <main className="page">
      <Link href="/" className="transcript-back">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 3L4 6l3 3" />
        </svg>
        Decisions
      </Link>

      <div className="transcript-header">
        <div className="transcript-title-block">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-meta" />
        </div>
      </div>

      <article className="transcript-body">
        <div className="turn">
          <div className="skeleton skeleton-speaker" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
        <div className="turn">
          <div className="skeleton skeleton-speaker" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      </article>
    </main>
  );
}
