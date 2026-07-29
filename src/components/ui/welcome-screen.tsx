"use client";

import { motion } from "motion/react";

/**
 * Port WelcomeScreen (21st.dev @ravikatiyar162). Varian dan transisi
 * framer-motion disalin apa adanya: container stagger 0.2s, item spring
 * (stiffness 100 / damping 15), gambar spring 0.8s masuk dari atas, plus
 * clip-path elips yang sama.
 */

const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.2 } } };
const item = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100, damping: 15 } },
};
const gambar = {
  hidden: { y: -50, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring" as const, duration: 0.8 } },
};

export function WelcomeScreen({
  imageUrl,
  title,
  description,
  buttonText,
  onButtonClick,
  secondaryActionText,
  onSecondaryActionClick,
  className = "",
}: {
  imageUrl: string;
  title: React.ReactNode;
  description: React.ReactNode;
  buttonText: string;
  onButtonClick: () => void;
  secondaryActionText?: React.ReactNode;
  onSecondaryActionClick?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex h-full w-full flex-col items-center justify-between bg-surface ${className}`}>
      <motion.div className="relative w-full" initial="hidden" animate="visible" variants={gambar}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className="h-auto w-full object-cover"
          style={{ clipPath: "ellipse(100% 60% at 50% 40%)" }}
        />
      </motion.div>

      <motion.div
        className="flex flex-1 flex-col items-center justify-center space-y-6 p-8 text-center"
        initial="hidden"
        animate="visible"
        variants={container}
      >
        <motion.h1 className="t-h1 tracking-tight text-fg" variants={item}>
          {title}
        </motion.h1>
        <motion.p className="max-w-md t-body-sm text-fg-secondary" variants={item}>
          {description}
        </motion.p>
      </motion.div>

      <motion.div
        className="w-full space-y-4 p-8 pt-0"
        initial="hidden"
        animate="visible"
        variants={container}
      >
        <motion.div variants={item}>
          <button
            type="button"
            onClick={onButtonClick}
            className="btn-anim min-h-12 w-full rounded-md bg-action px-6 t-label text-on-action active:bg-action-pressed"
          >
            {buttonText}
          </button>
        </motion.div>
        {secondaryActionText && onSecondaryActionClick && (
          <motion.div variants={item} className="text-center">
            <button
              type="button"
              onClick={onSecondaryActionClick}
              className="btn-anim t-body-sm text-fg-secondary underline underline-offset-4"
            >
              {secondaryActionText}
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
