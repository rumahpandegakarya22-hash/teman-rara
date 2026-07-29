"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, CheckCircle2, ImageIcon, Trash2, UploadCloud, X } from "lucide-react";

/**
 * Port FileUploadCard (21st.dev @ravikatiyar162): kartu unggah dengan drag &
 * drop, daftar berkas ber-animasi (stagger masuk dari kiri, `layout` saat item
 * dihapus), badge ekstensi, dan ukuran berkas terformat.
 *
 * Perbedaan yang disengaja: sumber aslinya memakai state upload progress dari
 * luar. Di sini kartu membungkus `<input type="file">` asli — nama, `required`,
 * dan `accept` diteruskan — supaya FormData/Server Action yang sudah ada tidak
 * perlu diubah. Berkas yang sudah terpilih langsung berstatus "completed"
 * karena unggahannya baru terjadi saat form disubmit.
 */

/**
 * Kerangka kartu unggah (header + area seret-lepas) tanpa mengurus state berkas.
 * Dipakai di alur foto yang sudah punya input dan grid pratinjau sendiri
 * (pengaduan, bukti bayar), supaya tampilannya ikut FileUploadCard tanpa
 * menghilangkan pratinjau gambar dan tombol kamera yang sudah ada.
 */
export function UploadCardShell({
  judul = "Unggah foto",
  deskripsi = "Ambil foto langsung atau pilih dari galeri",
  petunjuk,
  onDropFiles,
  children,
  className = "",
}: {
  judul?: string;
  deskripsi?: string;
  petunjuk?: string;
  onDropFiles: (files: File[]) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const stop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <motion.div
      variants={varianKartu}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.3 }}
      className={`w-full rounded-xl border border-line bg-raised shadow-sm ${className}`}
    >
      <div className="p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sunken">
            <UploadCloud className="h-6 w-6 text-fg-secondary" aria-hidden />
          </div>
          <div>
            <h3 className="t-label text-fg">{judul}</h3>
            <p className="t-caption mt-1 text-fg-secondary">{deskripsi}</p>
          </div>
        </div>

        <div
          onDragEnter={(e) => {
            stop(e);
            setDragging(true);
          }}
          onDragLeave={(e) => {
            stop(e);
            setDragging(false);
          }}
          onDragOver={stop}
          onDrop={(e) => {
            stop(e);
            setDragging(false);
            const jatuh = Array.from(e.dataTransfer.files);
            if (jatuh.length) onDropFiles(jatuh);
          }}
          className={`mt-5 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors duration-200 ${
            dragging ? "border-action bg-action/10" : "border-line"
          }`}
        >
          <UploadCloud className="mb-3 h-10 w-10 text-fg-secondary" aria-hidden />
          <p className="t-label text-fg">Ambil foto, pilih berkas, atau seret ke sini.</p>
          {petunjuk && <p className="t-caption mt-1 text-fg-secondary">{petunjuk}</p>}
          <div className="mt-4 w-full">{children}</div>
        </div>
      </div>
    </motion.div>
  );
}

const varianKartu = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const varianItem = { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } };

function formatUkuran(b: number) {
  if (b === 0) return "0 KB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function FileUploadCard({
  id,
  name,
  accept,
  required,
  multiple = false,
  kamera = false,
  maks,
  onFilesChange,
  judul = "Unggah berkas",
  deskripsi = "Pilih dan unggah berkas yang diminta",
  petunjuk,
  className = "",
}: {
  id?: string;
  name: string;
  accept?: string;
  required?: boolean;
  multiple?: boolean;
  /** Tambahkan tombol ambil foto langsung — dipakai di alur bukti/pengaduan. */
  kamera?: boolean;
  maks?: number;
  onFilesChange?: (files: File[]) => void;
  judul?: string;
  deskripsi?: string;
  petunjuk?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  // Menulis balik ke input asli lewat DataTransfer supaya nilai drag & drop
  // ikut terkirim di FormData, bukan cuma tampil di daftar.
  const sinkron = (daftar: File[]) => {
    const dt = new DataTransfer();
    daftar.forEach((f) => dt.items.add(f));
    if (inputRef.current) inputRef.current.files = dt.files;
    setFiles(daftar);
    onFilesChange?.(daftar);
  };

  const batas = maks ?? (multiple ? Infinity : 1);
  const tambah = (baru: File[]) =>
    sinkron((multiple ? [...files, ...baru] : baru.slice(0, 1)).slice(0, batas));
  const hapus = (i: number) => sinkron(files.filter((_, k) => k !== i));

  const buka = (pakaiKamera: boolean) => {
    if (!inputRef.current) return;
    if (pakaiKamera) inputRef.current.setAttribute("capture", "environment");
    else inputRef.current.removeAttribute("capture");
    inputRef.current.click();
  };

  const stop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <motion.div
      variants={varianKartu}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.3 }}
      className={`w-full rounded-xl border border-line bg-raised shadow-sm ${className}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sunken">
              <UploadCloud className="h-6 w-6 text-fg-secondary" aria-hidden />
            </div>
            <div>
              <h3 className="t-label text-fg">{judul}</h3>
              <p className="t-caption mt-1 text-fg-secondary">{deskripsi}</p>
            </div>
          </div>
        </div>

        <div
          onDragEnter={(e) => {
            stop(e);
            setDragging(true);
          }}
          onDragLeave={(e) => {
            stop(e);
            setDragging(false);
          }}
          onDragOver={stop}
          onDrop={(e) => {
            stop(e);
            setDragging(false);
            const jatuh = Array.from(e.dataTransfer.files);
            if (jatuh.length) tambah(jatuh);
          }}
          onClick={() => buka(false)}
          className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors duration-200 ${
            dragging ? "border-action bg-action/10" : "border-line hover:border-action/50"
          }`}
        >
          <input
            ref={inputRef}
            id={id}
            name={name}
            type="file"
            accept={accept}
            required={required}
            multiple={multiple}
            className="hidden"
            onChange={(e) => tambah(Array.from(e.target.files ?? []))}
          />
          <UploadCloud className="mb-4 h-10 w-10 text-fg-secondary" aria-hidden />
          <p className="t-label text-fg">Pilih berkas atau seret ke sini.</p>
          {petunjuk && <p className="t-caption mt-1 text-fg-secondary">{petunjuk}</p>}
          {kamera ? (
            <div className="mt-4 flex gap-3" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => buka(true)}
                className="btn-anim flex min-h-12 items-center justify-center gap-2 rounded-md border border-fg px-4 t-label"
              >
                <Camera size={20} className="icon-flow" aria-hidden />
                Kamera
              </button>
              <button
                type="button"
                onClick={() => buka(false)}
                className="btn-anim flex min-h-12 items-center justify-center gap-2 rounded-md border border-fg px-4 t-label"
              >
                <ImageIcon size={20} className="icon-flow" aria-hidden />
                Galeri
              </button>
            </div>
          ) : (
            <span className="btn-anim mt-4 rounded-md border border-line px-3 py-1.5 t-caption text-fg">
              Pilih Berkas
            </span>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="border-t border-line p-5">
          <ul className="space-y-4">
            <AnimatePresence>
              {files.map((f, i) => (
                <motion.li
                  key={`${f.name}-${f.size}-${i}`}
                  variants={varianItem}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  layout
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sunken t-caption font-bold text-fg-secondary">
                      {f.type.split("/")[1]?.toUpperCase().substring(0, 3) || "FILE"}
                    </div>
                    <div className="flex-1">
                      <p className="max-w-[150px] truncate t-body-sm font-medium text-fg sm:max-w-xs">
                        {f.name}
                      </p>
                      <div className="t-caption text-fg-secondary">
                        <span>{formatUkuran(f.size)}</span>
                        <span className="mx-1">•</span>
                        <span className="text-success">Siap dikirim</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
                    <button
                      type="button"
                      aria-label={`Hapus ${f.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        hapus(i);
                      }}
                      className="btn-anim flex h-8 w-8 items-center justify-center rounded-full text-fg-secondary"
                    >
                      {multiple ? <X className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}
    </motion.div>
  );
}
