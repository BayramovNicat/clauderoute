import { ce, cn, html } from "@/frontend/utils/dom";

export type ModelInfoProps = {
  model: { id: string; name: string };
  limitData: Record<string, unknown> | null;
  className?: string;
} & Omit<Partial<HTMLDivElement>, "style">;

interface QuotaInfo {
  percentage?: number;
  remaining?: number;
  displayText: string;
}

export function ModelInfo({
  model,
  limitData,
  className,
  ...props
}: ModelInfoProps): HTMLDivElement {
  let limitText = "";
  let hoverTitleText = "Usage Limits";

  if (limitData) {
    if (typeof limitData === "object" && limitData !== null) {
      const session = (limitData.session ?? limitData.session_limit) as
        | Record<string, unknown>
        | number
        | undefined;
      const weekly = (limitData.weekly ?? limitData.weekly_limit) as
        | Record<string, unknown>
        | number
        | undefined;

      const getQuotaInfo = (
        label: string,
        q: Record<string, unknown> | number | undefined,
      ): QuotaInfo | undefined => {
        if (q === undefined) return undefined;
        if (typeof q === "number") {
          return { displayText: `${label}: ${q}` };
        }
        if (typeof q.remainingPercentage === "number") {
          return {
            percentage: q.remainingPercentage,
            displayText: `${label}: ${q.remainingPercentage}%`,
          };
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
          const pct = Math.round((r / t) * 100);
          return {
            percentage: pct,
            remaining: r,
            displayText: `${label}: ${pct}%`,
          };
        }
        if (r !== undefined) {
          return {
            remaining: r,
            displayText: `${label}: ${r} left`,
          };
        }
        if (t > 0) {
          return {
            displayText: `${label}: ${t}`,
          };
        }
        return undefined;
      };

      const sessionInfo = getQuotaInfo("Session", session);
      const weeklyInfo = getQuotaInfo("Weekly", weekly);

      if (sessionInfo || weeklyInfo) {
        // Tooltip hover text: full descriptive combination
        const parts: string[] = [];
        if (sessionInfo) parts.push(sessionInfo.displayText);
        if (weeklyInfo) parts.push(weeklyInfo.displayText);
        hoverTitleText = parts.join(" | ");

        const getShortText = (prefix: string, info: QuotaInfo): string => {
          if (info.percentage !== undefined) {
            return `${prefix}: ${info.percentage}%`;
          }
          if (info.remaining !== undefined) {
            return `${prefix}: ${info.remaining} left`;
          }
          return info.displayText
            .replace("Session", "S")
            .replace("Weekly", "W");
        };

        // Badge display text: show BOTH session and weekly using super short prefixes (S / W)
        if (sessionInfo && weeklyInfo) {
          const sText = getShortText("S", sessionInfo);
          const wText = getShortText("W", weeklyInfo);
          limitText = `${sText} | ${wText}`;
        } else if (sessionInfo) {
          limitText = getShortText("S", sessionInfo);
        } else if (weeklyInfo) {
          limitText = getShortText("W", weeklyInfo);
        }
      } else {
        // Fallback for flat limit values/objects
        if (typeof limitData.remainingPercentage === "number") {
          limitText = `${limitData.remainingPercentage}%`;
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
            limitText = `${Math.round((r / t) * 100)}%`;
          } else if (r !== undefined) {
            limitText = `${r} left`;
          } else {
            const raw = JSON.stringify(limitData)
              .replace(/[{""}]/g, "")
              .replace(/:/g, ": ");
            limitText = raw.length > 40 ? `${raw.substring(0, 37)}...` : raw;
          }
        }
        hoverTitleText = `Usage Limits: ${limitText}`;
      }
    } else {
      limitText = String(limitData);
      hoverTitleText = `Usage Limits: ${limitText}`;
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
          ? html`<span class="text-[0.65rem] font-bold text-[#8c877d] uppercase tracking-wide select-none cursor-help group-hover:text-[#6a665d] transition-colors" title="${hoverTitleText}">${limitText}</span>`
          : ""
      }
    </div>
  ` as HTMLDivElement;

  return ce(element, props);
}
