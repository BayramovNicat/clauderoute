import { ce, cn, html } from "@/frontend/utils/dom";

export type ModelInfoProps = {
  model: { id: string; name: string };
  limitData: Record<string, unknown> | null;
  className?: string;
} & Omit<Partial<HTMLDivElement>, "style">;

export function ModelInfo({
  model,
  limitData,
  className,
  ...props
}: ModelInfoProps): HTMLDivElement {
  let limitText = "";
  if (limitData) {
    if (typeof limitData === "object" && limitData !== null) {
      const parts: string[] = [];
      const session = (limitData.session ?? limitData.session_limit) as
        | Record<string, unknown>
        | number
        | undefined;
      const weekly = (limitData.weekly ?? limitData.weekly_limit) as
        | Record<string, unknown>
        | number
        | undefined;

      const formatQuota = (
        label: string,
        q: Record<string, unknown> | number | undefined,
      ) => {
        if (q === undefined) return;
        if (typeof q === "number") {
          parts.push(`${label}: ${q}`);
          return;
        }
        if (typeof q.remainingPercentage === "number") {
          parts.push(`${label}: ${q.remainingPercentage}%`);
          return;
        }
        const t = typeof q.total === "number" ? q.total : 0;
        const u = typeof q.used === "number" ? q.used : 0;
        const r =
          typeof q.remaining === "number"
            ? q.remaining
            : t > 0
              ? t - u
              : undefined;

        if (t > 0 && r !== undefined) {
          parts.push(`${label}: ${Math.round((r / t) * 100)}%`);
        } else if (r !== undefined) {
          parts.push(`${label}: ${r} left`);
        } else if (t > 0) {
          parts.push(`${label}: ${t}`);
        }
      };

      formatQuota("Session", session);
      formatQuota("Weekly", weekly);

      if (session === undefined && weekly === undefined) {
        if (typeof limitData.remainingPercentage === "number") {
          parts.push(`${limitData.remainingPercentage}%`);
        } else {
          const t = typeof limitData.total === "number" ? limitData.total : 0;
          const u = typeof limitData.used === "number" ? limitData.used : 0;
          const r =
            typeof limitData.remaining === "number"
              ? limitData.remaining
              : t > 0
                ? t - u
                : undefined;
          if (t > 0 && r !== undefined) {
            parts.push(`${Math.round((r / t) * 100)}%`);
          } else if (r !== undefined) {
            parts.push(`Remaining: ${r}`);
          }
        }
      }

      if (parts.length > 0) {
        limitText = parts.join(" | ");
      } else {
        const raw = JSON.stringify(limitData)
          .replace(/[{""}]/g, "")
          .replace(/:/g, ": ");
        limitText = raw.length > 40 ? `${raw.substring(0, 37)}...` : raw;
      }
    } else {
      limitText = String(limitData);
    }
  }

  const element = html`
    <div
      class="${cn(
        "flex items-center gap-1 bg-[#faf9f6]/80 border border-[#e7e1d8]/60 px-2.5 py-1 rounded-lg transition-all hover:border-[#e7e1d8] hover:bg-[#faf9f6] shadow-2xs hover:shadow-xs group",
        className,
      )}"
    >
      <span
        class="text-[#2c2925] text-xs font-semibold select-none cursor-default"
        title="${model.id}"
      >
        ${model.name}
      </span>
      ${
        limitText ? html`<div class="w-px h-3 bg-[#e7e1d8]/80 mx-1"></div>` : ""
      }
      ${
        limitText
          ? html`<span class="text-[0.65rem] font-bold text-[#8c877d] uppercase tracking-wide select-none cursor-help group-hover:text-[#6a665d] transition-colors" title="Usage Limits">${limitText}</span>`
          : ""
      }
    </div>
  ` as HTMLDivElement;

  return ce(element, props);
}
