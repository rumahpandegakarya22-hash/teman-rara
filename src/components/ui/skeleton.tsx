/** Item 7 — placeholder shimmer untuk konten yang sedang dimuat. */
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} aria-hidden />;
}
