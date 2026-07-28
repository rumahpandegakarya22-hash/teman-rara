import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { LogIn } from "lucide-react";

export default function AuthHeader() {
  return (
    <div className="mb-2 flex justify-end">
      <Show when="signed-out">
        <Link
          href="/masuk"
          className="btn-anim inline-flex min-h-12 items-center gap-2 rounded-md px-3 t-label text-action"
        >
          <LogIn size={20} className="icon-flow" aria-hidden />
          Masuk
        </Link>
      </Show>
      <Show when="signed-in">
        <Link
          href="/kamar"
          className="btn-anim inline-flex min-h-12 items-center rounded-md px-3 t-label text-action"
        >
          Kamar Saya
        </Link>
      </Show>
    </div>
  );
}
