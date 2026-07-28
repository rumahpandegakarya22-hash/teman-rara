"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Home, MessageSquareWarning, BedDouble, User } from "lucide-react";

const tabs = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/kamar", label: "Kamar", icon: BedDouble },
  { href: "/pengaduan", label: "Pengaduan", icon: MessageSquareWarning },
  { href: "/profil", label: "Profil", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    // Dock kaca mengambang — bentuk & material meniru dock Mini Apps Ops, warna
    // pakai token Teman Rara sendiri (--raised/--line lewat kelas bg-raised/border-line).
    <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3 safe-bottom">
      <ul className="mx-auto flex w-full max-w-[420px] gap-1 rounded-xl border border-line/70 bg-raised/70 p-1.5 shadow-[var(--elev-3)] backdrop-blur-2xl backdrop-saturate-[1.8]">
        {tabs.map(({ href, label, icon: Icon }, i) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="group flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-lg py-2 transition-colors duration-150 hover:bg-sunken/60 active:bg-sunken/80"
              >
                {/* Item 2 — dock (micro): ikon terangkat/membesar saat aktif, mengecil saat ditekan. */}
                {/* Item 3 — delay per posisi (0.05s x index) biar urutan dock terasa beruntun. */}
                <motion.span
                  animate={{ y: active ? -3 : 0, scale: active ? 1.12 : 1 }}
                  whileTap={{ scale: 0.86 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28, delay: i * 0.05 }}
                  className="flex"
                >
                  <Icon
                    size={24}
                    strokeWidth={active ? 2.25 : 1.75}
                    className={active ? "text-action" : "text-fg-secondary"}
                    aria-hidden
                  />
                </motion.span>
                <span className={`t-caption ${active ? "text-action font-semibold" : "text-fg-secondary"}`}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
