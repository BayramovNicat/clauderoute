import { ce, cn, html } from "@/frontend/utils/dom";

export type StatusBadgeProps = {
  active: boolean;
  className?: string;
} & Omit<Partial<HTMLDivElement>, "style">;

export function StatusBadge({
  active,
  className,
  ...props
}: StatusBadgeProps): HTMLDivElement {
  const badgeClass = active
    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 shadow-[0_2px_8px_rgba(16,185,129,0.03)]"
    : "bg-rose-500/10 text-rose-600 border border-rose-500/25 shadow-[0_2px_8px_rgba(244,63,94,0.03)]";
  const dotClass = active
    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"
    : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse";

  const element = html`
    <div
      class="${cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold select-none",
        badgeClass,
        className,
      )}"
    >
      <span class="h-1.5 w-1.5 rounded-full ${dotClass}"></span>
      ${active ? "Active" : "Disabled"}
    </div>
  ` as HTMLDivElement;

  return ce(element, props);
}
