import { redirect } from "next/navigation";
import OnboardingForm from "@/components/onboarding-form";
import SewaBerakhir from "@/components/sewa-berakhir";
import { wajibMasuk } from "@/lib/guard";
import { getSesiPenghuni } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await wajibMasuk("/onboarding");

  const { status } = await getSesiPenghuni();
  if (status === "aktif") redirect("/kamar");
  if (status === "berakhir") return <SewaBerakhir />;

  return (
    <main className="px-4 pt-8">
      <header className="mb-8">
        <p className="t-overline text-fg-secondary">Langkah terakhir</p>
        <h1 className="t-h1 mt-1">Hubungkan akunmu</h1>
        <p className="t-body-sm mt-2 text-fg-secondary">
          Cocokkan dengan data penghuni yang tersimpan di pengelola, supaya info kamar dan tagihanmu
          bisa ditampilkan.
        </p>
      </header>

      <OnboardingForm />
    </main>
  );
}
