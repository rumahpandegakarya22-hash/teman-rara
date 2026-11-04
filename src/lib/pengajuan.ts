import "server-only";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { activeTenant, booking, kamar, trCheckoutRequest, trPindahRequest } from "@/db/schema";

export type KamarKosong = { no_kamar: number; tipe_kamar: string | null };

// Booking yang menahan kamar dari calon penghuni pindah: sudah dikonfirmasi,
// sedang check-in, atau pendaftaran yang masih diproses. Case-insensitive
// karena nilai status_booking historis tidak konsisten kapital.
const STATUS_MENAHAN = new Set(["konfirmasi", "check-in", "pending"]);

/**
 * Kamar yang bisa jadi tujuan pindah: tidak ada penghuni aktif DAN tidak ada
 * booking penahan (Konfirmasi/Check-in/Pending). Kamar penghuni sendiri dibuang.
 * Mirip validasi handler pindah-kamar di Ops, tapi versi daftar untuk dropdown.
 */
export async function getKamarKosong(kecualiNoKamar?: string): Promise<KamarKosong[]> {
  const [kosong, semuaBooking] = await Promise.all([
    db
      .select({ no_kamar: kamar.no_kamar, tipe_kamar: kamar.tipe_kamar })
      .from(kamar)
      .leftJoin(activeTenant, eq(activeTenant.kamar_id, kamar.id_kamar))
      .where(isNull(activeTenant.kamar_id))
      .orderBy(asc(kamar.no_kamar)),
    db.select({ kamar_no: booking.kamar_no, status_booking: booking.status_booking }).from(booking),
  ]);

  const terbooking = new Set(
    semuaBooking
      .filter((b) => STATUS_MENAHAN.has(String(b.status_booking ?? "").toLowerCase().trim()))
      .map((b) => String(b.kamar_no)),
  );
  return kosong
    .filter((r) => !terbooking.has(String(r.no_kamar)) && String(r.no_kamar) !== kecualiNoKamar)
    .map(({ no_kamar, tipe_kamar }) => ({ no_kamar, tipe_kamar }));
}

/** Pengajuan checkout terbaru penghuni (status apa pun) untuk ditampilkan. */
export async function getCheckoutRequestTerakhir(idPenghuni: string) {
  const [row] = await db
    .select()
    .from(trCheckoutRequest)
    .where(eq(trCheckoutRequest.id_penghuni, idPenghuni))
    .orderBy(desc(trCheckoutRequest.created_at))
    .limit(1);
  return row ?? null;
}

/** Pengajuan pindah kamar terbaru penghuni (status apa pun). */
export async function getPindahRequestTerakhir(idPenghuni: string) {
  const [row] = await db
    .select()
    .from(trPindahRequest)
    .where(eq(trPindahRequest.id_penghuni, idPenghuni))
    .orderBy(desc(trPindahRequest.created_at))
    .limit(1);
  return row ?? null;
}

/** True kalau penghuni masih punya pengajuan checkout yang menunggu diproses. */
export async function adaCheckoutMenunggu(idPenghuni: string) {
  const [row] = await db
    .select({ id: trCheckoutRequest.id })
    .from(trCheckoutRequest)
    .where(and(eq(trCheckoutRequest.id_penghuni, idPenghuni), eq(trCheckoutRequest.status, "Menunggu")))
    .limit(1);
  return !!row;
}

/** True kalau penghuni masih punya pengajuan pindah yang menunggu diproses. */
export async function adaPindahMenunggu(idPenghuni: string) {
  const [row] = await db
    .select({ id: trPindahRequest.id })
    .from(trPindahRequest)
    .where(and(eq(trPindahRequest.id_penghuni, idPenghuni), eq(trPindahRequest.status, "Menunggu")))
    .limit(1);
  return !!row;
}

/** Fitur pindah kamar dimatikan. Ubah ke true untuk menyalakan lagi (kartu di /kamar ikut kembali). */
export const PINDAH_KAMAR_AKTIF = false;
