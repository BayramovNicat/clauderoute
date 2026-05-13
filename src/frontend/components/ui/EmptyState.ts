import { ce, cn, html } from "@/frontend/utils/dom";

export type EmptyStateProps = {
  title: string;
  description: string;
  iconSvg?: unknown;
  className?: string;
} & Omit<Partial<HTMLDivElement>, "style">;

export function EmptyState({
  title,
  description,
  iconSvg,
  className,
  ...props
}: EmptyStateProps): HTMLDivElement {
  const icon = iconSvg
    ? iconSvg
    : html`
        <svg
          class="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
      `;

  const element = html`
    <div
      class="${cn(
        "flex flex-col items-center text-center p-8 bg-white/80 backdrop-blur-md rounded-2xl border border-[#e7e1d8] shadow-[0_8px_30px_rgb(0,0,0,0.02)]",
        className,
      )}"
    >
      <div
        class="h-16 w-16 bg-[#faf9f6] rounded-full flex items-center justify-center border border-[#e7e1d8]/60 mb-4 text-[#a19c91]"
      >
        ${icon}
      </div>
      <h2 class="text-xl font-bold text-[#171717] tracking-tight">
        ${title}
      </h2>
      <p class="text-[#77736b] text-sm mt-2 max-w-sm leading-relaxed">
        ${description}
      </p>
    </div>
  ` as HTMLDivElement;

  return ce(element, props);
}
