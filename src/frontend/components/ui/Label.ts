import { ce, html } from "@/frontend/utils/dom";

export type LabelProps = {
  content: unknown;
} & Partial<HTMLLabelElement>;

export function Label({ content, ...props }: LabelProps): HTMLLabelElement {
  return ce(html`<label>${content}</label>` as HTMLLabelElement, props);
}
