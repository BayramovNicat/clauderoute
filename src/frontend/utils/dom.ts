import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

type Binding =
	| { type: "attribute"; path: number[]; name: string; template: string }
	| { type: "node"; path: number[] };

type TemplateCache = {
	fragment: DocumentFragment;
	bindings: Binding[];
};

const HTML_TEMPLATE_CACHE = new WeakMap<TemplateStringsArray, TemplateCache>();
const SVG_TEMPLATE_CACHE = new WeakMap<TemplateStringsArray, TemplateCache>();

const MARKER_PREFIX = "__marker_";
const SVG_WRAP = "svg";

export function html<T extends HTMLElement = HTMLElement>(
	strings: TemplateStringsArray,
	...values: unknown[]
): T {
	const content = _parse(strings, values, false);
	const el = content.firstElementChild;

	if (!el) {
		throw new Error("html`` utility requires at least one root element.");
	}

	return el as T;
}

export function svg<T extends SVGElement = SVGElement>(
	strings: TemplateStringsArray,
	...values: unknown[]
): T {
	const content = _parse(strings, values, true);
	const el = content.firstElementChild;

	if (!el) {
		throw new Error("svg`` utility requires at least one root element.");
	}

	return el as T;
}

function _parse(
	strings: TemplateStringsArray,
	values: unknown[],
	isSvg: boolean,
): DocumentFragment {
	const cacheMap = isSvg ? SVG_TEMPLATE_CACHE : HTML_TEMPLATE_CACHE;
	let cache = cacheMap.get(strings);

	if (!cache) {
		cache = _createTemplate(strings, isSvg);
		cacheMap.set(strings, cache);
	}

	const fragment = cache.fragment.cloneNode(true) as DocumentFragment;

	// Pre-resolve all target nodes to prevent paths from becoming stale due to structural DOM mutations
	const targetNodes: (Node | null)[] = [];
	for (let i = 0; i < cache.bindings.length; i++) {
		const binding = cache.bindings[i];
		targetNodes[i] = binding ? _getNodeByPath(fragment, binding.path) : null;
	}

	for (let i = 0; i < cache.bindings.length; i++) {
		const binding = cache.bindings[i];
		if (!binding) continue;

		const targetNode = targetNodes[i];
		if (!targetNode) continue;

		const value = values[i];

		if (binding.type === "attribute") {
			const element = targetNode as Element;
			if (value === false || value == null) {
				element.removeAttribute(binding.name);
			} else {
				const valStr = value === true ? "" : String(value);
				let attrValue: string;
				if (binding.template === `__marker_${i}__`) {
					attrValue = valStr;
				} else {
					const currentVal =
						element.getAttribute(binding.name) ?? binding.template;
					attrValue = currentVal.replace(`__marker_${i}__`, valStr);
				}
				element.setAttribute(binding.name, attrValue);
			}
		} else {
			_replaceMarker(targetNode, value);
		}
	}

	return fragment;
}

function _createTemplate(
	strings: TemplateStringsArray,
	isSvg: boolean,
): TemplateCache {
	let source = "";

	for (let i = 0; i < strings.length; i++) {
		source += strings[i];

		if (i < strings.length - 1) {
			source += `${MARKER_PREFIX}${i}__`;
		}
	}

	const template = document.createElement("template");

	if (isSvg) {
		template.innerHTML = /*html*/ `<${SVG_WRAP}>${source}</${SVG_WRAP}>`;

		const fragment = document.createDocumentFragment();
		const svgNode = template.content.firstElementChild;

		if (svgNode) {
			while (svgNode.firstChild) {
				fragment.appendChild(svgNode.firstChild);
			}
		}

		return _compileFragment(fragment);
	}

	template.innerHTML = source;
	return _compileFragment(template.content);
}

type RawBinding =
	| { type: "attribute"; element: Element; name: string; template: string }
	| { type: "node"; markerNode: Comment };

function _compileFragment(fragment: DocumentFragment): TemplateCache {
	const rawBindings: RawBinding[] = [];

	function traverse(node: Node) {
		if (node.nodeType === Node.ELEMENT_NODE) {
			const element = node as Element;
			for (const attr of Array.from(element.attributes)) {
				if (attr.value.includes(MARKER_PREFIX)) {
					const matches = [...attr.value.matchAll(/__marker_(\d+)__/g)];
					for (const match of matches) {
						const index = Number(match[1]);
						rawBindings[index] = {
							type: "attribute",
							element,
							name: attr.name,
							template: attr.value,
						};
					}
					element.removeAttribute(attr.name);
				}
			}
		} else if (node.nodeType === Node.TEXT_NODE) {
			const text = node.nodeValue ?? "";
			if (text.includes(MARKER_PREFIX)) {
				const parent = node.parentNode;
				if (parent) {
					const parts = text.split(/__marker_\d+__/);
					const matches = [...text.matchAll(/__marker_(\d+)__/g)];
					const newNodes: Node[] = [];

					for (let i = 0; i < parts.length; i++) {
						if (parts[i]) {
							newNodes.push(document.createTextNode(parts[i]));
						}
						if (i < matches.length) {
							const index = Number(matches[i][1]);
							const comment = document.createComment(`µ${index}`);
							newNodes.push(comment);
							rawBindings[index] = {
								type: "node",
								markerNode: comment,
							};
						}
					}

					for (const newNode of newNodes) {
						parent.insertBefore(newNode, node);
					}
					parent.removeChild(node);
				}
				return;
			}
		}

		const children = Array.from(node.childNodes);
		for (const child of children) {
			traverse(child);
		}
	}

	traverse(fragment);

	const bindings: Binding[] = [];
	for (let i = 0; i < rawBindings.length; i++) {
		const raw = rawBindings[i];
		if (!raw) continue;

		if (raw.type === "attribute") {
			bindings[i] = {
				type: "attribute",
				path: _getPath(fragment, raw.element),
				name: raw.name,
				template: raw.template,
			};
		} else {
			bindings[i] = {
				type: "node",
				path: _getPath(fragment, raw.markerNode),
			};
		}
	}

	return {
		fragment,
		bindings,
	};
}

function _getPath(root: Node, node: Node): number[] {
	const path: number[] = [];
	let current: Node | null = node;

	while (current && current !== root) {
		const parentNode: Node | null = current.parentNode;
		if (!parentNode) {
			break;
		}

		let index = 0;
		let sibling = current.previousSibling;
		while (sibling) {
			index++;
			sibling = sibling.previousSibling;
		}

		path.push(index);
		current = parentNode;
	}

	path.reverse();
	return path;
}

function _getNodeByPath(root: Node, path: number[]): Node | null {
	let node: Node | null = root;

	for (let i = 0; i < path.length; i++) {
		node = node.childNodes[path[i]] ?? null;

		if (!node) {
			return null;
		}
	}

	return node;
}

function _replaceMarker(marker: Node, value: unknown): void {
	const parent = marker.parentNode;

	if (!parent) {
		return;
	}

	_appendBefore(parent, marker, value);
	parent.removeChild(marker);
}

function _appendBefore(parent: Node, before: Node, value: unknown): void {
	if (value == null || value === false || value === true) {
		return;
	}

	if (value instanceof Node) {
		parent.insertBefore(value, before);
		return;
	}

	if (Array.isArray(value)) {
		for (let i = 0; i < value.length; i++) {
			_appendBefore(parent, before, value[i]);
		}

		return;
	}

	parent.insertBefore(document.createTextNode(String(value)), before);
}

export function ce<T extends HTMLElement>(
	el: T,
	props: Omit<Partial<T>, "style"> & {
		dataset?: Record<string, string | undefined>;
		style?: string | Partial<CSSStyleDeclaration>;
	},
): T {
	const { dataset, style, ...rest } = props;
	if (dataset) Object.assign(el.dataset, dataset);
	if (typeof style === "string") {
		el.style.cssText = style;
	} else if (style) {
		Object.assign(el.style, style);
	}
	Object.assign(el, rest);
	return el;
}

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
