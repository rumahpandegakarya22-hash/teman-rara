"use client";

import { AnimatePresence, motion, type Variants } from "motion/react";
import { usePathname } from "next/navigation";

const variants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.2, 0, 0, 1] } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18, ease: [0, 0, 0, 1] } },
};

/** Item 1 — layer transisi halaman: fade + slide tipis tiap ganti route. */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={pathname} variants={variants} initial="initial" animate="animate" exit="exit">
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
