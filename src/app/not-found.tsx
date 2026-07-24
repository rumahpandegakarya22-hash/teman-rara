import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="t-h1">Halaman tidak ditemukan</h1>
      <p className="t-body text-fg-secondary">Isi yang kamu cari sudah dihapus atau tautannya salah.</p>
      <Link
        href="/"
        className="mt-2 inline-flex min-h-12 items-center rounded-md bg-action px-6 t-label text-on-action"
      >
        Kembali ke Papan Informasi
      </Link>
    </main>
  );
}
