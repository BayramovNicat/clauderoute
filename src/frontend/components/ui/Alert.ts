import { ce, cn, html } from "@/frontend/utils/dom";

export type AlertProps = {
	type: "success" | "error";
	content?: unknown;
} & Omit<Partial<HTMLDivElement>, "style">;

export function Alert({
	type,
	content = "",
	className,
	...props
}: AlertProps): HTMLDivElement {
	const isSuccess = type === "success";
	const bgClass = isSuccess
		? "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-[0_4px_12px_rgba(16,185,129,0.05)]"
		: "bg-rose-50 border-rose-200 text-rose-800 shadow-[0_4px_12px_rgba(244,63,94,0.05)]";
	const iconColor = isSuccess ? "text-emerald-600" : "text-rose-600";
	const iconPath = isSuccess
		? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
		: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z";

	const element = html`
    <div
      style="display: none;"
      class="${cn(
				"mb-6 border rounded-xl p-4 flex items-center gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-2",
				bgClass,
				className,
			)}"
    >
      <svg
        class="h-5 w-5 shrink-0 ${iconColor}"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="${iconPath}" />
      </svg>
      <span class="text-sm font-semibold message-text">${content}</span>
    </div>
  ` as HTMLDivElement;

	return ce(element, props);
}
