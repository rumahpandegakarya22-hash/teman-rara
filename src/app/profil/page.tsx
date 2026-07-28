import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { KeyRound, ChevronRight } from "lucide-react";
import FormProfil from "@/components/form-profil";
import PengaturanNotifikasi from "@/components/pengaturan-notifikasi";
import SewaBerakhir from "@/components/sewa-berakhir";
import TombolKeluar from "@/components/tombol-keluar";
import { db } from "@/db";
import { trNotificationPreference } from "@/db/schema";
import { wajibMasuk } from "@/lib/guard";
import { getSesiPenghuni } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  await wajibMasuk("/profil");

  const sesi = await getSesiPenghuni();
  if (sesi.status === "belum_klaim") redirect("/onboarding");
  if (sesi.status !== "aktif") return <SewaBerakhir />;
  const { penghuni } = sesi;

  const [user, [preferensi]] = await Promise.all([
    currentUser(),
    db
      .select({
        push: trNotificationPreference.push_enabled,
        email: trNotificationPreference.email_enabled,
        in_app: trNotificationPreference.in_app_enabled,
      })
      .from(trNotificationPreference)
      .where(eq(trNotificationPreference.id_penghuni, penghuni.id_penghuni))
      .limit(1),
  ]);

  const inisial = penghuni.nama.trim().charAt(0).toUpperCase();

  return (
    <main className="flex flex-col gap-8 px-4 pt-6">
      <header className="flex items-center gap-4">
        <span
          aria-hidden
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-rose-500 font-[family-name:var(--font-display)] text-2xl text-fg-inverse"
        >
          {inisial}
        </span>
        <div className="min-w-0">
          <h1 className="t-h2 truncate">{penghuni.nama}</h1>
          <p className="t-body-sm text-fg-secondary">
            Kamar {penghuni.no_kamar}
            {penghuni.tanggal_masuk && ` · sejak ${penghuni.tanggal_masuk}`}
          </p>
        </div>
      </header>

      <section aria-labelledby="judul-data">
        <h2 id="judul-data" className="t-h3 mb-4">
          Data Kontak
        </h2>
        <FormProfil
          nama={penghuni.nama}
          email={penghuni.email ?? user?.primaryEmailAddress?.emailAddress ?? ""}
          telepon={penghuni.no_hp ?? ""}
        />
      </section>

      <section aria-labelledby="judul-keamanan">
        <h2 id="judul-keamanan" className="t-h3 mb-4">
          Keamanan Akun
        </h2>
        {/* Kata sandi dan foto profil dikelola Clerk, bukan database kost. */}
        <Link
          href="/profil/akun"
          className="btn-anim flex min-h-12 items-center gap-3 rounded-lg border border-line bg-raised p-5"
        >
          <KeyRound size={20} className="shrink-0 text-action" aria-hidden />
          <span className="flex-1">
            <span className="t-body block font-medium">Kata sandi & foto profil</span>
            <span className="t-caption text-fg-secondary">Ganti kata sandi atau foto</span>
          </span>
          <ChevronRight size={20} className="icon-flow shrink-0 text-fg-secondary" aria-hidden />
        </Link>
      </section>

      <section aria-labelledby="judul-notifikasi">
        <h2 id="judul-notifikasi" className="t-h3 mb-4">
          Notifikasi
        </h2>
        <PengaturanNotifikasi
          awal={{
            push: preferensi?.push ?? true,
            email: preferensi?.email ?? true,
            in_app: preferensi?.in_app ?? true,
          }}
        />
      </section>

      <TombolKeluar />
    </main>
  );
}
