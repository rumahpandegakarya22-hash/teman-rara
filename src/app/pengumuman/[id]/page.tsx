import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getPengumumanById } from "@/lib/board";
import { wajibMasuk } from "@/lib/guard";
import { formatTanggal } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DetailPengumumanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Isi pengumuman hanya untuk penghuni yang sudah masuk.
  await wajibMasuk(`/pengumuman/${id}`);

  const item = await getPengumumanById(id);
  if (!item) notFound();

  return (
    <main className="px-4 pt-4">
      <div className="safe-top" />
      <Link
        href="/"
        className="btn-anim -ml-2 inline-flex min-h-12 items-center gap-1 px-2 t-label text-fg-secondary"
      >
        <ChevronLeft size={20} className="icon-flow" aria-hidden />
        Papan Informasi
      </Link>

      <article className="mt-4">
        <h1 className="t-h1">{item.title}</h1>
        <p className="t-caption mt-2 text-fg-secondary">{formatTanggal(item.published_at)}</p>
        <div className="t-body-lg mt-6 whitespace-pre-line">{item.content}</div>
      </article>
    </main>
  );
}
