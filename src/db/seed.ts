import { isNull } from "drizzle-orm";
import { db } from "./index";
import { kamar, trInformationBoard, trKamarWifi } from "./schema";

const peraturan = [
  ["Jam Berkunjung Tamu", "Tamu diterima pukul 08.00–21.00 WIB di ruang tamu. Tamu lawan jenis tidak diperkenankan masuk kamar."],
  ["Pembayaran Sewa", "Sewa dibayarkan paling lambat pada tanggal jatuh tempo yang tertera di invoice. Keterlambatan dikenakan denda sesuai perjanjian."],
  ["Kebersihan Area Bersama", "Dapur, kamar mandi, dan ruang jemur wajib dibersihkan setelah dipakai. Sampah dibuang ke tempat sampah induk setiap hari."],
  ["Ketenangan Malam", "Mulai pukul 22.00 WIB, suara musik, televisi, dan percakapan mohon dijaga agar tidak mengganggu penghuni lain."],
  ["Keamanan", "Pintu gerbang dikunci pukul 23.00 WIB. Kunci kamar tidak boleh dipinjamkan kepada pihak luar."],
];

const pengumuman = [
  ["Pemeliharaan Pompa Air", "Pompa air utama akan diservis pada Sabtu pagi pukul 08.00–11.00 WIB. Selama proses berlangsung, air di lantai dua kemungkinan mengecil. Mohon menampung air secukupnya sebelum jadwal tersebut."],
  ["Penggantian Router WiFi Lantai 1", "Router lantai satu diganti dengan unit baru. Kata sandi WiFi kamar tidak berubah. Bila perangkat gagal tersambung, lupakan jaringan lama lalu sambungkan ulang."],
  ["Jadwal Pengambilan Sampah Berubah", "Mulai bulan ini pengambilan sampah dilakukan Senin, Rabu, dan Jumat pagi. Mohon sampah sudah diletakkan di tempat sampah induk sebelum pukul 06.00 WIB."],
];

async function seed() {
  const sekarang = Date.now();

  await db.delete(trInformationBoard);
  await db.insert(trInformationBoard).values([
    ...peraturan.map(([title, content], i) => {
      // Peraturan ditandai lama supaya badge "Baru" hanya muncul untuk perubahan sungguhan.
      const waktu = new Date(sekarang - 90 * 86_400_000).toISOString();
      return { type: "rule" as const, title, content, sort_order: i, published_at: waktu, updated_at: waktu };
    }),
    ...pengumuman.map(([title, content], i) => {
      const waktu = new Date(sekarang - i * 6 * 86_400_000).toISOString();
      return { type: "announcement" as const, title, content, published_at: waktu, updated_at: waktu };
    }),
  ]);

  // Kredensial WiFi contoh untuk kamar yang belum punya. Kamar diambil dari
  // tabel existing, tidak dibuat di sini.
  const daftarKamar = await db
    .select({ id_kamar: kamar.id_kamar, no_kamar: kamar.no_kamar, lantai: kamar.lantai })
    .from(kamar);

  if (daftarKamar.length > 0) {
    await db
      .insert(trKamarWifi)
      .values(
        daftarKamar.map((k) => ({
          id_kamar: k.id_kamar,
          username: `TigaDara-${k.no_kamar}`,
          password: `dara${k.no_kamar}`,
          catatan: "Contoh seed. Ganti dengan kredensial sungguhan.",
        })),
      )
      .onConflictDoNothing();
  }

  const tanpaWifi = await db.select({ id: trKamarWifi.id_kamar }).from(trKamarWifi).where(isNull(trKamarWifi.username));

  console.log(
    `Seed selesai: ${peraturan.length} peraturan, ${pengumuman.length} pengumuman, ` +
      `${daftarKamar.length} kamar dapat kredensial WiFi (${tanpaWifi.length} kosong).`,
  );
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
