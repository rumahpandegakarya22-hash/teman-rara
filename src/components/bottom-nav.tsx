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
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-raised/95 backdrop-blur safe-bottom"
    >
      <ul className="mx-auto flex max-w-[720px]">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex min-h-[56px] flex-col items-center justify-center gap-1 py-2"
              >
                {/* Item 2 — dock (micro): ikon terangkat/membesar saat aktif, mengecil saat ditekan. */}
                <motion.span
                  animate={{ y: active ? -3 : 0, scale: active ? 1.12 : 1 }}
                  whileTap={{ scale: 0.86 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
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
