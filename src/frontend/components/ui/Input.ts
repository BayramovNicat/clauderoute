import { ce, cn, html } from "@/frontend/utils/dom";
import { eyeIcon } from "@/frontend/utils/icons";
import { Button } from "./Button";

export type InputProps = Omit<Partial<HTMLInputElement>, "style">;

export function Input({ className, ...rest }: InputProps) {
	return ce(
		html`<input
      class="${cn(
				"h-9.5 w-full min-w-0 rounded-[10px] border-0 bg-[#f3f0ea] px-3 text-[0.88rem] font-semibold text-[#171717] outline-none focus:shadow-[0_0_0_2px_#f97316]",
				className,
			)}"
    />` as HTMLInputElement,
		rest,
	);
}

export function SecretInput({ className, ...rest }: InputProps) {
	const input = Input({
		...rest,
		type: "password",
		autocomplete: "one-time-code",
		spellcheck: false,
		className: cn("pr-2", className),
	});
	input.setAttribute("data-1p-ignore", "");
	input.setAttribute("data-lpignore", "true");
	input.setAttribute("data-bwignore", "");
	input.setAttribute("data-form-type", "other");

	const toggle = Button({
		content: eyeIcon(false),
		className:
			"absolute top-1/2 right-1.5 grid h-7.5 w-7.5 -translate-y-1/2 place-items-center rounded-lg border-0 bg-transparent text-[#77736b] transition-colors duration-150 hover:bg-white hover:text-[#171717] focus-visible:bg-white focus-visible:text-[#171717] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f97316] [&>svg]:h-4.5 [&>svg]:w-4.5 [&>svg]:fill-none [&>svg]:stroke-current [&>svg]:stroke-[1.8] [&>svg]:[stroke-linecap:round] [&>svg]:[stroke-linejoin:round]",
		ariaLabel: "Show API key",
		ariaPressed: "false",
		title: "Show API key",
		onclick: () => {
			const isVisible = input.type === "text";
			input.type = isVisible ? "password" : "text";
			toggle.ariaLabel = isVisible ? "Show API key" : "Hide API key";
			toggle.ariaPressed = String(!isVisible);
			toggle.title = isVisible ? "Show API key" : "Hide API key";
			toggle.replaceChildren(eyeIcon(!isVisible));
		},
	});

	return html`<span class="relative block min-w-0">${input}${toggle}</span>`;
}
