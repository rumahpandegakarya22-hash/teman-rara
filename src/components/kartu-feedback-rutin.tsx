"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, MessageSquareHeart } from "lucide-react";
import { kirimFeedbackRutin, type FeedbackState } from "@/app/feedback/actions";
import RatingInput from "@/components/rating-input";
import { FlowButton } from "@/components/ui/flow-button";

function Kirim() {
  const { pending } = useFormStatus();
  return (
    <FlowButton
      type="submit"
      disabled={pending}
      className="btn-anim min-h-12 w-full rounded-md bg-action px-6 t-label text-on-action disabled:bg-sunken disabled:text-fg-disabled"
    >
      {pending ? "Mengirim…" : "Kirim Feedback"}
    </FlowButton>
  );
}

export default function KartuFeedbackRutin() {
  const [state, action] = useActionState<FeedbackState, FormData>(kirimFeedbackRutin, {});

  if (state.sukses) {
    return (
      <p className="flex items-start gap-2 rounded-lg border border-line bg-raised p-5 t-body-sm elev-1">
        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" aria-hidden />
        Terima kasih, feedback bulan ini sudah kami terima.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border border-line bg-raised p-5 elev-1">
      <h2 className="t-h3 flex items-center gap-2">
        <MessageSquareHeart size={20} className="text-action" aria-hidden />
        Bagaimana bulan ini?
      </h2>
      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-red-100 p-3 t-body-sm text-red-600">
          <AlertCircle size={18} className="shrink-0" aria-hidden />
          {state.error}
        </p>
      )}
      <RatingInput nama="rating" label="Kepuasan secara umum (1 kurang, 5 sangat baik)" wajib />
      <textarea
        name="komentar"
        rows={2}
        maxLength={500}
        aria-label="Komentar (opsional)"
        placeholder="Komentar singkat (opsional)"
        className="w-full rounded-md border border-line bg-surface p-4 t-body focus:border-action"
      />
      <Kirim />
    </form>
  );
}
