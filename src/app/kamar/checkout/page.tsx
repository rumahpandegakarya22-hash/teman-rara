import { redirect } from "next/navigation";
import SegeraHadir from "@/components/segera-hadir";
import SewaBerakhir from "@/components/sewa-berakhir";
import { wajibMasuk } from "@/lib/guard";
import { getSesiPenghuni } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Placeholder tujuan menu "Pengajuan Checkout" di halaman Kamar. Alur asli
// (form + server action) belum ada di repo ini; sementara memakai pola
// "Segera hadir" yang sudah dipakai fitur lain (RiwayatPembayaranSoon).
export default async function CheckoutPage() {
  await wajibMasuk("/kamar/checkout");

  const sesi = await getSesiPenghuni();
  if (sesi.status === "belum_klaim") redirect("/onboarding");
  if (sesi.status !== "aktif") return <SewaBerakhir />;

  return <SegeraHadir judul="Pengajuan Checkout" fase="fase berikutnya" />;
}
