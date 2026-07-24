import { SignUp } from "@clerk/nextjs";

export default function DaftarPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <p className="t-overline text-fg-secondary">Kost Tiga Dara</p>
        <h1 className="t-h1 mt-1">Daftar</h1>
        <p className="t-body-sm mt-2 text-fg-secondary">
          Buat akun dulu, lalu pilih nomor kamar yang kamu tempati.
        </p>
      </div>
      <SignUp signInUrl="/masuk" fallbackRedirectUrl="/onboarding" />
    </main>
  );
}
