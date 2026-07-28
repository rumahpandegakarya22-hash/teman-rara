"use client";

import { MotionConfig } from "motion/react";

/** Membuat semua animasi motion/react ikut prefers-reduced-motion perangkat. */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
