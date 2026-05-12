const HTML_TEMPLATE = document.createElement("template");
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

type RawHtml = {
  __rawHtml: string;
};

type TrustedTypesPolicy = {
  createHTML(value: string): string;
};

const trustedTypes = globalThis as typeof globalThis & {
  trustedTypes?: {
    createPolicy(name: string, rules: TrustedTypesPolicy): TrustedTypesPolicy;
  };
};

const policy = trustedTypes.trustedTypes?.createPolicy("starter-html", {
  createHTML: (value) => value,
});

export function rawHtml(value: string): RawHtml {
  return { __rawHtml: value };
}

export function isRawHTML(value: unknown): value is RawHtml {
  return (
    typeof value === "object" &&
    value !== null &&
    "__rawHtml" in value &&
    typeof (value as RawHtml).__rawHtml === "string"
  );
}

export function html(
  strings: TemplateStringsArray,
  ...values: unknown[]
): HTMLElement {
  const content = parseTemplate(HTML_TEMPLATE, strings, values);
  const element = content.firstElementChild;
  if (!element) {
    throw new Error("html`` utility requires at least one root element.");
  }
  return element as HTMLElement;
}

const SVG_NS = "http://www.w3.org/2000/svg";

export function svg(
  strings: TemplateStringsArray,
  ...values: unknown[]
): SVGElement {
  const content = parseTemplate(HTML_TEMPLATE, strings, values, true);
  const element = content.firstElementChild;
  if (!element) {
    throw new Error("svg`` utility requires at least one root element.");
  }
  return element as SVGElement;
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

function parseTemplate(
  template: HTMLTemplateElement,
  strings: TemplateStringsArray,
  values: unknown[],
  isSvg = false,
): DocumentFragment {
  const elementsMap = new Map<string, Node>();
  let idCounter = 0;

  const processValue = (value: unknown): string => {
    if (value instanceof Node) {
      const id = `__ref_${idCounter++}__`;
      elementsMap.set(id, value);
      return `<template data-ref="${id}"></template>`;
    }

    if (Array.isArray(value)) return value.map(processValue).join("");
    if (isRawHTML(value)) return value.__rawHtml;
    if (value == null || value === false) return "";
    return escapeHtml(String(value));
  };

  const rawHtml = strings.reduce((result, string, index) => {
    return (
      result +
      string +
      (index < values.length ? processValue(values[index]) : "")
    );
  }, "");

  const source = isSvg
    ? `<svg xmlns="${SVG_NS}">${rawHtml.trim()}</svg>`
    : rawHtml.trim();
  template.innerHTML = policy ? policy.createHTML(source) : source;
  const content = document.importNode(template.content, true);
  content.querySelectorAll("template[data-ref]").forEach((placeholder) => {
    const id = placeholder.getAttribute("data-ref");
    if (!id) return;
    const realNode = elementsMap.get(id);
    if (realNode) placeholder.replaceWith(realNode);
  });
  return content;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
