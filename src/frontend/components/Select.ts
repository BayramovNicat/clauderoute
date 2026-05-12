import { ce, html } from "../dom";

export type SelectOption = {
	value: string;
	label: string;
};

export type SelectProps = Omit<
	Partial<HTMLSelectElement>,
	"style" | "options"
> & {
	options: SelectOption[];
};

export function Select({ options, ...props }: SelectProps) {
	return ce(
		html`
      <select
        class="h-9.5 w-full min-w-0 rounded-[10px] border-0 bg-[#f3f0ea] px-3 text-[0.88rem] font-semibold text-[#171717] outline-none focus:shadow-[0_0_0_2px_#f97316]"
      >
        ${options.map(
					(option) =>
						html`<option value="${option.value}">
              ${option.label}
            </option>` as HTMLOptionElement,
				)}
      </select>
    `,
		props,
	);
}
