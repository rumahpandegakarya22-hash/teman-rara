import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import FormPengaduan from "@/components/form-pengaduan";
import { wajibMasuk } from "@/lib/guard";
import { getPenghuniAktif } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PengaduanBaruPage() {
  await wajibMasuk("/pengaduan/baru");
  if (!(await getPenghuniAktif())) redirect("/onboarding");

  return (
    <main className="px-4 pt-4">
      <div className="safe-top" />
      <Link
        href="/pengaduan"
        className="btn-anim -ml-2 inline-flex min-h-12 items-center gap-1 px-2 t-label text-fg-secondary"
      >
        <ChevronLeft size={20} className="icon-flow" aria-hidden />
        Pengaduan
      </Link>

      <h1 className="t-h1 mb-6 mt-2">Pengaduan Baru</h1>
      <FormPengaduan />
    </main>
  );
}
