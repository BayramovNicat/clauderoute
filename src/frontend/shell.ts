import { classes } from "./classes";
import { html } from "./dom";

export type ShellRefs = {
	envFields: HTMLElement;
	providersList: HTMLElement;
	messages: HTMLElement;
	saveButton: HTMLButtonElement;
	desktopNotificationsToggle: HTMLInputElement;
	refreshButton: HTMLButtonElement;
};

export function renderShell() {
	document.documentElement.className =
		"min-h-full bg-[#f6f3ee] [color-scheme:light]";
	document.body.className =
		"m-0 min-h-screen text-[#171717] antialiased selection:bg-[#f97316] selection:text-white [font-family:'Avenir_Next',Avenir,'SF_Pro_Display',Helvetica,sans-serif]";

	const shell = html`
		<main class="mx-auto min-h-screen w-full max-w-[1120px] p-5 sm:p-8 lg:p-14" aria-label="Claude Code environment settings">
			<section class="py-5 sm:py-8 lg:py-9" id="environment">
				<div class="mb-6 grid items-end gap-4 md:flex md:justify-between">
					<div>
						<h1 class="m-0 mt-1 text-[clamp(2rem,5vw,4.5rem)] font-bold leading-[0.92] tracking-[-0.08em]">Settings</h1>
					</div>
					<button class="${classes.primaryButton}" id="save-env" type="button">Save changes</button>
				</div>
				<div class="grid gap-0" id="env-fields"></div>
				<div class="grid grid-cols-1 items-center gap-4 border-t border-[#e7e1d8] py-3 md:grid-cols-[minmax(230px,0.32fr)_minmax(0,1fr)]">
					<label class="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-[0.74rem] font-bold text-[#77736b] [font-family:'SF_Mono',Menlo,Consolas,monospace]" for="desktop-notifications-toggle">DESKTOP_ALERTS</label>
					<label class="cursor-pointer justify-self-start" for="desktop-notifications-toggle">
						<input class="absolute h-px w-px overflow-hidden whitespace-nowrap [clip-path:inset(50%)] [clip:rect(0_0_0_0)] peer" id="desktop-notifications-toggle" type="checkbox" />
						<span class="relative grid h-[34px] w-16 grid-cols-2 items-center rounded-full border border-[#e7e1d8] bg-[#f3f0ea] text-[#77736b] shadow-[inset_0_1px_3px_rgb(23_23_23_/_0.08)] transition duration-180 hover:-translate-y-px peer-checked:border-[#d15c13] peer-checked:bg-[#f97316] peer-checked:text-white peer-checked:shadow-[inset_0_1px_3px_rgb(23_23_23_/_0.12)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-[#f97316] after:absolute after:top-0.5 after:left-0.5 after:h-7 after:w-7 after:rounded-full after:bg-white after:shadow-[0_6px_14px_rgb(23_23_23_/_0.18),0_1px_2px_rgb(23_23_23_/_0.12)] after:transition-transform after:duration-180 after:ease-out peer-checked:after:translate-x-[30px]" aria-hidden="true"></span>
					</label>
				</div>
				<div class="mt-4 text-[0.9rem] font-bold text-[#4b4740]" id="messages" hidden></div>
			</section>

			<section class="border-t border-[#e7e1d8] py-5 sm:py-8 lg:py-9" id="providers">
				<div class="mb-6 grid items-end gap-4 md:flex md:justify-between">
					<div>
						<h2 class="m-0 mt-1 text-[clamp(2rem,5vw,4.5rem)] font-bold leading-[0.92] tracking-[-0.08em]">Active providers</h2>
					</div>
					<button class="min-h-9 rounded-full border-0 bg-transparent px-4 text-[0.86rem] font-bold text-[#171717] transition-colors duration-150 hover:enabled:bg-[#f3f0ea] disabled:cursor-not-allowed disabled:opacity-35" id="refresh-providers" type="button">Refresh</button>
				</div>
				<div class="grid gap-0" id="providers-list"></div>
			</section>
		</main>
	`;

	document.body.replaceChildren(shell);
	return {
		envFields: must<HTMLElement>(shell, "#env-fields"),
		providersList: must<HTMLElement>(shell, "#providers-list"),
		messages: must<HTMLElement>(shell, "#messages"),
		saveButton: must<HTMLButtonElement>(shell, "#save-env"),
		desktopNotificationsToggle: must<HTMLInputElement>(
			shell,
			"#desktop-notifications-toggle",
		),
		refreshButton: must<HTMLButtonElement>(shell, "#refresh-providers"),
	};
}

function must<T extends Element>(root: ParentNode, selector: string) {
	const element = root.querySelector<T>(selector);
	if (!element) throw new Error(`Missing element: ${selector}`);
	return element;
}
