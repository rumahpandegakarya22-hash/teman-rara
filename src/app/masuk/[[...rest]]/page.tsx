import { SignIn } from "@clerk/nextjs";

export default function MasukPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <p className="t-h1 mt-1">Kost Tiga Dara</p>
        <h1 className="t-display">Masuk</h1>
        <p className="t-body-sm mt-2 text-fg-secondary">
          Masuk untuk melihat detail kamar.
        </p>
      </div>
      <SignIn signUpUrl="/daftar" fallbackRedirectUrl="/kamar" />
    </main>
  );
}
