import { ChevronDown, ExternalLink, FileText } from "lucide-react";

type Dokumen = { nama: string; judul: string };

/**
 * Daftar dokumen PDF sebagai accordion. Memakai <details>/<summary> bawaan
 * browser: tanpa JavaScript, tetap bisa dibuka keyboard, dan iframe PDF baru
 * dimuat setelah dibuka.
 */
export default function AkordionDokumen({
  dokumen,
  internal,
}: {
  dokumen: readonly Dokumen[];
  internal: boolean;
}) {
  const srcDari = (nama: string) =>
    internal ? `/api/dokumen/${nama}` : `/peraturan/${nama}.pdf`;

  return (
    <div className="flex flex-col gap-3">
      {dokumen.map((d) => {
        const src = srcDari(d.nama);
        return (
          <details key={d.nama} className="group rounded-lg border border-line bg-raised/80 elev-1">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 p-5">
              <FileText size={20} className="shrink-0 text-action" aria-hidden />
              <span className="t-body flex-1 font-medium">{d.judul}</span>
              <ChevronDown
                size={20}
                aria-hidden
                className="shrink-0 text-fg-secondary transition-transform group-open:rotate-180"
              />
            </summary>

            <div className="border-t border-line p-4">
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                className="mb-3 inline-flex min-h-12 items-center gap-1.5 t-label text-action"
              >
                <ExternalLink size={18} aria-hidden />
                Buka di tab baru
              </a>
              <iframe
                src={src}
                title={d.judul}
                className="h-[70vh] w-full rounded-md border border-line bg-surface"
              />
            </div>
          </details>
        );
      })}
    </div>
  );
}
