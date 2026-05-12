import { ce, html } from "../dom";

export type ButtonProps = {
  content: unknown;
} & Partial<HTMLButtonElement>;

export function Button({ content, ...props }: ButtonProps): HTMLButtonElement {
  return ce(
    html`<button type="button">${content}</button>` as HTMLButtonElement,
    props,
  );
}
