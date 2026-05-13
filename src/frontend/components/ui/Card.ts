import { ce, cn, html } from "@/frontend/utils/dom";

export type CardProps = {
  title: string;
  description: string;
  titleGradientTo?: string;
  headerActions?: unknown;
  content: unknown;
  alerts?: unknown;
  className?: string;
} & Omit<Partial<HTMLDivElement>, "style">;

export function Card({
  title,
  description,
  titleGradientTo = "to-[#f97316]",
  headerActions,
  content,
  alerts,
  className,
  ...props
}: CardProps): HTMLDivElement {
  const headerActionsHtml = headerActions
    ? html`<div class="flex items-center gap-3 shrink-0">${headerActions}</div>`
    : "";

  const alertsHtml = alerts ? html`<div class="px-6 pt-6">${alerts}</div>` : "";

  const headerBlock = html`
    <div
      class="p-6 border-b border-[#e7e1d8]/60 bg-linear-to-r from-transparent via-[#fcfaf7] to-transparent flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <h1
          class="${cn(
            "text-2xl font-extrabold tracking-tight bg-linear-to-r from-[#171717] via-[#2c2925] bg-clip-text text-transparent",
            titleGradientTo,
          )}"
        >
          ${title}
        </h1>
        <p class="text-[#77736b] text-sm mt-1">${description}</p>
      </div>
      ${headerActionsHtml}
    </div>
  `;

  const element = html`
    <div
      class="${cn(
        "bg-white/80 backdrop-blur-md rounded-2xl border border-[#e7e1d8] shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden transition-all duration-300",
        className,
      )}"
    >
      ${headerBlock} ${alertsHtml}
      <div class="p-6 flex flex-col gap-y-5">${content}</div>
    </div>
  ` as HTMLDivElement;

  return ce(element, props);
}
