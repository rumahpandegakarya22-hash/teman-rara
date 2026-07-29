"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { klaimAkun, type OnboardingState } from "@/app/onboarding/actions";
import { FlowButton } from "@/components/ui/flow-button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <FlowButton
      type="submit"
      disabled={pending}
      className="btn-anim min-h-12 w-full rounded-md bg-action px-6 t-label text-on-action active:bg-action-pressed disabled:bg-sunken disabled:text-fg-disabled"
    >
      {pending ? "Memeriksa…" : "Hubungkan Akun"}
    </FlowButton>
  );
}

export default function OnboardingForm() {
  const [state, action] = useActionState<OnboardingState, FormData>(klaimAkun, {});

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-red-100 p-4 t-body-sm text-red-600">
          <AlertCircle size={20} className="shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="no_kamar" className="t-label mb-2 block">
          Nomor kamar
        </label>
        <input
          id="no_kamar"
          name="no_kamar"
          required
          inputMode="numeric"
          placeholder="Contoh: 101"
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
          autoComplete="tel"
          placeholder="08xxxxxxxxxx"
          className="min-h-12 w-full rounded-md border border-line bg-raised px-4 t-body focus:border-action"
        />
        <p className="t-caption mt-2 text-fg-secondary">
          Pakai nomor yang kamu berikan saat check-in.
        </p>
      </div>

      <SubmitButton />

      <p className="t-caption flex items-start gap-2 text-fg-secondary">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden />
        Data ini hanya dipakai untuk memastikan kamu penghuni yang terdaftar. Kalau tidak cocok,
        hubungi pengelola.
      </p>
    </form>
  );
}
