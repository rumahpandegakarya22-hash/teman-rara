import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-raised px-5 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-sunken">
        <Icon size={24} className="text-fg-secondary" aria-hidden />
      </span>
      <h3 className="t-h3">{title}</h3>
      <p className="t-body-sm max-w-[36ch] text-fg-secondary">{description}</p>
    </div>
  );
}
