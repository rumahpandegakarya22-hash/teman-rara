import { ClerkProvider } from "@clerk/nextjs";
import { idID } from "@clerk/localizations";
import type { Metadata, Viewport } from "next";
import { Lora, Poppins } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/bottom-nav";
import InstallPrompt from "@/components/install-prompt";
import ServiceWorkerRegistrar from "@/components/service-worker-registrar";

const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Teman Rara — Kost Tiga Dara",
  description: "Papan informasi, kamar, dan pengaduan penghuni Kost Tiga Dara.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Teman Rara" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F6F2" },
    { media: "(prefers-color-scheme: dark)", color: "#201D1C" },
  ],
};

// Komponen Clerk tidak bisa memakai kelas Tailwind kita, jadi token diteruskan
// sebagai variabel. Nilai statis sebelumnya (bg terang + teks gelap) tabrakan
// dengan aplikasi yang dark-dominant sehingga teks kartu jadi terang di atas
// terang. Sekarang dipatok ke palet gelap merek supaya kontras konsisten.
const clerkVariables = {
  colorPrimary: "#E67B7E",
  colorText: "#F8F6F2",
  colorTextSecondary: "#B9AE9F",
  colorBackground: "#2A2726",
  colorInputText: "#F8F6F2",
  colorInputBackground: "#201D1C",
  colorDanger: "#E08387",
  colorSuccess: "#8CC08C",
  borderRadius: "12px",
  fontFamily: "var(--font-poppins)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${lora.variable} ${poppins.variable}`}>
      <body>
        <ClerkProvider localization={idID} appearance={{ variables: clerkVariables }}>
          <ServiceWorkerRegistrar />
          <div className="mx-auto min-h-dvh w-full max-w-[720px] pb-24">{children}</div>
          <InstallPrompt />
          <BottomNav />
        </ClerkProvider>
      </body>
    </html>
  );
}
