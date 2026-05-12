import { ce, cn, html } from "../dom";

export type ToggleProps = Partial<HTMLInputElement>;

export function Toggle({ className, ...rest }: ToggleProps) {
  const input = ce(
    html`<input
      type="checkbox"
      class="${cn(
        "peer absolute h-px w-px overflow-hidden whitespace-nowrap [clip-path:inset(50%)] [clip:rect(0_0_0_0)]",
        className,
      )}"
    />` as HTMLInputElement,
    rest,
  );
  const track = html`<span
    class="${cn(
      "relative grid h-8.5 w-16 grid-cols-2 items-center rounded-full border border-[#e7e1d8] bg-[#f3f0ea] text-[#77736b]",
      "shadow-[inset_0_1px_3px_rgb(23_23_23/0.08)] transition duration-180 hover:-translate-y-px",
      "peer-checked:border-[#d15c13] peer-checked:bg-[#f97316] peer-checked:text-white",
      "peer-checked:shadow-[inset_0_1px_3px_rgb(23_23_23/0.12)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-[#f97316]",
      "after:absolute after:top-0.5 after:left-0.5 after:h-7 after:w-7 after:rounded-full after:bg-white",
      "after:shadow-[0_6px_14px_rgb(23_23_23/0.18),0_1px_2px_rgb(23_23_23/0.12)] after:transition-transform after:duration-180 after:ease-out",
      "peer-checked:after:translate-x-7.5",
    )}"
    aria-hidden="true"
  ></span>`;

  return html`
    <label class="cursor-pointer justify-self-start"> ${input} ${track} </label>
  `;
}
