"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { simpanProfil, type ProfilState } from "@/app/profil/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-anim min-h-12 w-full rounded-md bg-action px-6 t-label text-on-action active:bg-action-pressed disabled:bg-sunken disabled:text-fg-disabled"
    >
      {pending ? "Menyimpan…" : "Simpan Perubahan"}
    </button>
  );
}

export default function FormProfil({
  nama,
  email,
  telepon,
}: {
  nama: string;
  email: string;
  telepon: string;
}) {
  const [state, action] = useActionState<ProfilState, FormData>(simpanProfil, {});

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.sukses && (
        <p role="status" className="flex items-start gap-2 rounded-md bg-[#E6F0E6] p-4 t-body-sm text-success">
          <CheckCircle2 size={20} className="shrink-0" aria-hidden />
          {state.sukses}
        </p>
      )}
      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-red-100 p-4 t-body-sm text-red-600">
          <AlertCircle size={20} className="shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      <div>
        <p className="t-label mb-2">Nama lengkap</p>
        <p className="min-h-12 rounded-md border border-line bg-sunken px-4 py-3 t-body text-fg-secondary">
          {nama}
        </p>
        <p className="t-caption mt-2 text-fg-secondary">
          Nama dipakai di invoice, jadi hanya pengelola yang bisa mengubahnya.
        </p>
      </div>

      <div>
        <label htmlFor="email" className="t-label mb-2 block">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={email}
          autoComplete="email"
          className="min-h-12 w-full rounded-md border border-line bg-raised px-4 t-body focus:border-action"
        />
      </div>

      <div>
        <label htmlFor="no_hp" className="t-label mb-2 block">
          Nomor HP
        </label>
        <input
          id="no_hp"
          name="no_hp"
          type="tel"
          required
          inputMode="tel"
          defaultValue={telepon}
          placeholder="08xxxxxxxxxx"
          autoComplete="tel"
          className="min-h-12 w-full rounded-md border border-line bg-raised px-4 t-body focus:border-action"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
