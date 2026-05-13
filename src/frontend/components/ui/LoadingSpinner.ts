import { html } from "@/frontend/utils/dom";

export function LoadingSpinner({ text }: { text: string }) {
	return html`
		<div class="flex flex-col items-center justify-center py-20 gap-y-4">
			<div class="w-12 h-12 border-4 border-[#f97316]/30 border-t-[#f97316] rounded-full animate-spin"></div>
			<p class="text-[#77736b] font-medium text-sm animate-pulse">${text}</p>
		</div>
	`;
}
