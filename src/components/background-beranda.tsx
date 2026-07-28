"use client";

import { motion } from "motion/react";

/**
 * Layer background beranda: foto dengan overlay warna surface.
 *
 * PLACEHOLDER: sekarang memakai gradient. Saat foto siap, taruh di
 * public/bg/beranda.jpg lalu ganti `backgroundImage` di bawah menjadi
 * url('/bg/beranda.jpg'). Intensitas blur dan opacity overlay mengikuti
 * spesifikasi (blur kuat, overlay surface 70%) dan bisa disetel di sini.
 *
 * Item 9 — hero-stagger: layer ini fade-in duluan, di belakang konten.
 */
export default function BackgroundBeranda() {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
      className="pointer-events-none fixed inset-0 z-0"
    >
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl"
        style={{
          // Foto asli; gradient dipakai kalau file belum ada supaya tidak blank.
          backgroundImage:
            "url('/bg/beranda.jpg'), linear-gradient(135deg, var(--color-rose-500), var(--color-sand-700), var(--color-sand-900))",
        }}
      />
      {/* Overlay warna background sekarang, opacity 70%. */}
      <div className="absolute inset-0 bg-surface/70" />
    </motion.div>
  );
}
