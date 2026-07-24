import Link from "next/link";
import { UserProfile } from "@clerk/nextjs";
import { ChevronLeft } from "lucide-react";
import { wajibMasuk } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function AkunPage() {
  await wajibMasuk("/profil/akun");

  return (
    <main className="px-4 pt-4">
      <div className="safe-top" />
      <Link
        href="/profil"
        className="-ml-2 inline-flex min-h-12 items-center gap-1 px-2 t-label text-fg-secondary"
      >
        <ChevronLeft size={20} aria-hidden />
        Profil
      </Link>

      <h1 className="t-h1 mb-6 mt-2">Keamanan Akun</h1>
      <UserProfile routing="path" path="/profil/akun" />
    </main>
  );
}
