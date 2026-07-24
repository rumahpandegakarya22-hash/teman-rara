import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PendaftaranTerkirimPage({
  searchParams,
}: {
  searchParams: Promise<{ no?: string }>;
}) {
  const { no } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-[#E6F0E6]">
        <CheckCircle2 size={24} className="text-success" aria-hidden />
      </span>
      <h1 className="t-h1">Pendaftaran terkirim</h1>
      <p className="t-body max-w-[40ch] text-fg-secondary">
        Pengelola akan memeriksa data dan dokumenmu, lalu menghubungi lewat nomor HP yang kamu isi.
      </p>
      {no && (
        <p className="t-body-sm rounded-md border border-line bg-raised px-4 py-3">
          Nomor pendaftaran: <span className="font-semibold">{no}</span>
        </p>
      )}
      <p className="t-caption max-w-[36ch] text-fg-secondary">
        Simpan nomor ini untuk memudahkan saat menghubungi pengelola.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex min-h-12 items-center rounded-md bg-action px-6 t-label text-on-action"
      >
        Kembali ke Beranda
      </Link>
    </main>
  );
}
