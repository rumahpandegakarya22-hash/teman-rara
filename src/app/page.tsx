import Link from "next/link";
import { ChevronRight, LogIn, Megaphone, ScrollText, UserPlus } from "lucide-react";
import AuthHeader from "@/components/auth-header";
import BackgroundBeranda from "@/components/background-beranda";
import BadgeBaru from "@/components/badge-baru";
import EmptyState from "@/components/empty-state";
import NotificationOptIn from "@/components/notification-opt-in";
import AkordionDokumen from "@/components/akordion-dokumen";
import PengaduanProgress from "@/components/pengaduan-progress";
import { StaggerContainer, StaggerItem } from "@/components/ui/stagger";
import UpdateWatcher from "@/components/update-watcher";
import { getPengumuman } from "@/lib/board";
import { DOKUMEN_INTERNAL, DOKUMEN_UMUM } from "@/lib/dokumen";
import { cuplikan, formatTanggal, isBaru } from "@/lib/format";
import { getDaftarPengaduan } from "@/lib/request";
import { getSesiPenghuni } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PapanInformasiPage() {
  const [pengumuman, sesi] = await Promise.all([getPengumuman(), getSesiPenghuni()]);

  const login = sesi.status === "aktif";
  const [aduanTerakhir] = login ? await getDaftarPengaduan(sesi.penghuni.id_penghuni, 1) : [];

  return (
    <>
      <BackgroundBeranda />
      {/* Item 9 — hero-stagger: seksi beranda muncul beruntun saat mount. */}
      <main className="relative z-10 px-4 pt-4">
      <StaggerContainer>
        <StaggerItem>
          <AuthHeader />
        </StaggerItem>
        <UpdateWatcher />

        <StaggerItem>
          <header className="mb-8">
            <p className="t-overline text-fg-secondary">Kost Tiga Dara</p>
            <h1 className="t-h1 mt-1">Papan Informasi</h1>
            <p className="t-body-sm mt-2 text-fg-secondary">
              {login
                ? "Pengumuman dan peraturan terbaru dari pengelola."
                : "Masuk untuk membaca pengumuman lengkap. Peraturan umum bisa dibaca tanpa akun."}
            </p>
          </header>
        </StaggerItem>

        <StaggerItem>
          <NotificationOptIn />
        </StaggerItem>

        {login && aduanTerakhir && (
          <StaggerItem>
            <PengaduanProgress aduan={aduanTerakhir} />
          </StaggerItem>
        )}

        {/* Calon penghuni: daftar tanpa perlu punya akun. */}
        {!login && (
          <StaggerItem>
            <Link
              href="/pendaftaran"
              className="btn-anim mb-8 flex items-center gap-3 rounded-lg border border-action bg-raised/80 p-5 elev-1"
            >
              <UserPlus size={24} className="shrink-0 text-action" aria-hidden />
              <span className="flex-1">
                <span className="t-h3 block">Daftar Jadi Penghuni</span>
                <span className="t-caption text-fg-secondary">
                  Isi formulir pendaftaran, tanpa perlu membuat akun
                </span>
              </span>
              <ChevronRight size={20} className="icon-flow shrink-0 text-fg-secondary" aria-hidden />
            </Link>
          </StaggerItem>
        )}

        <StaggerItem>
        <section aria-labelledby="judul-pengumuman" className="mb-10">
          <h2 id="judul-pengumuman" className="t-h2 mb-4 flex items-center gap-2">
            <Megaphone size={20} className="text-action" aria-hidden />
            Pengumuman
          </h2>

          {pengumuman.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="Belum ada pengumuman"
              description="Pengumuman terbaru dari pengelola akan muncul di sini."
            />
          ) : (
            <div className="relative">
              {/* Sesi tidak login: isi pengumuman diburamkan, harus masuk untuk membaca. */}
              <ul className={`flex flex-col gap-3 ${login ? "" : "pointer-events-none blur-[6px] select-none"}`}>
                {pengumuman.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={login ? `/pengumuman/${item.id}` : "#"}
                      tabIndex={login ? undefined : -1}
                      className="btn-anim flex items-start gap-3 rounded-lg border border-line bg-raised/80 p-5 elev-1"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="t-h3">{item.title}</h3>
                          {isBaru(item.published_at) && <BadgeBaru />}
                        </div>
                        {/* Textbox pengumuman opacity 80%. */}
                        <p className="t-body-sm mt-1 text-fg-secondary opacity-80">{cuplikan(item.content)}</p>
                        <p className="t-caption mt-2 text-fg-secondary">{formatTanggal(item.published_at)}</p>
                      </div>
                      <ChevronRight size={20} className="icon-flow mt-1 shrink-0 text-fg-secondary" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>

              {!login && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Link
                    href="/masuk"
                    className="btn-anim inline-flex min-h-12 items-center gap-2 rounded-md bg-action px-6 t-label text-on-action elev-2 active:bg-action-pressed"
                  >
                    <LogIn size={20} className="icon-flow" aria-hidden />
                    Masuk untuk membaca
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>
        </StaggerItem>

        <StaggerItem>
        <section aria-labelledby="judul-peraturan">
          <h2 id="judul-peraturan" className="t-h2 mb-4 flex items-center gap-2">
            <ScrollText size={20} className="text-action" aria-hidden />
            Peraturan Kost
          </h2>

          <p className="t-body-sm mb-3 text-fg-secondary">
            {login
              ? "Ketuk untuk membuka dokumen."
              : "Versi umum. Masuk untuk membaca peraturan dan panduan lengkap penghuni."}
          </p>
          <AkordionDokumen dokumen={login ? DOKUMEN_INTERNAL : DOKUMEN_UMUM} internal={login} />
        </section>
        </StaggerItem>
      </StaggerContainer>
      </main>
    </>
  );
}
