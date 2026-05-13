import { svg } from "./dom";

export function eyeIcon(hidden: boolean) {
  return svg`
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"></path>
			<circle cx="12" cy="12" r="2.7"></circle>
			<path d="M4 4 20 20" class="${hidden ? "" : "hidden"}"></path>
		</svg>
	`;
}
