import { type Provider, ProvidersService } from "../services/ProvidersService";
import { html } from "../utils/dom";
import { Card } from "./ui/Card";
import { LoadingSpinner } from "./ui/LoadingSpinner";

export function Providers() {
  const service = ProvidersService.getInstance();
  const container = html`<div
    class="w-full max-w-3xl mx-auto px-4 pb-16 mt-6"
  ></div>`;

  function render() {
    const { loading, error, data } = service.getState();

    if (loading) {
      container.replaceChildren(
        LoadingSpinner({ text: "Loading providers..." }),
      );
      return;
    }

    if (error) {
      container.replaceChildren(html`
        <div
          class="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-sm font-medium"
        >
          Error: ${error}
        </div>
      `);
      return;
    }

    if (
      !data?.providers ||
      !Array.isArray(data.providers) ||
      data.providers.length === 0
    ) {
      container.replaceChildren(html`
        <div
          class="flex flex-col items-center text-center p-8 bg-white/80 backdrop-blur-md rounded-2xl border border-[#e7e1d8] shadow-[0_8px_30px_rgb(0,0,0,0.02)]"
        >
          <div
            class="h-16 w-16 bg-[#faf9f6] rounded-full flex items-center justify-center border border-[#e7e1d8]/60 mb-4 text-[#a19c91]"
          >
            <svg
              class="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-[#171717] tracking-tight">
            No Active Providers Found
          </h2>
          <p class="text-[#77736b] text-sm mt-2 max-w-sm leading-relaxed">
            It looks like there are no active AI providers configured in your
            OmniRoute account.
          </p>
        </div>
      `);
      return;
    }

    const listHtml = data.providers.map((p: Provider) => {
      const modelsList = p.models || [];

      const providerTitle = (p.provider || p.id || "Unknown")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (char: string) => char.toUpperCase());

      const emailStr = p.email || p.name || p.account || "No email linked";
      const isActive = p.status === "active" || p.enabled !== false;

      const badgeClass = isActive
        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 shadow-[0_2px_8px_rgba(16,185,129,0.03)]"
        : "bg-rose-500/10 text-rose-600 border border-rose-500/25 shadow-[0_2px_8px_rgba(244,63,94,0.03)]";
      const dotClass = isActive
        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"
        : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse";

      return html`
        <div
          class="flex flex-col p-5 rounded-2xl border border-[#e7e1d8]/40 bg-[#faf9f6]/20 hover:bg-[#faf9f6]/40 hover:border-[#e7e1d8]/80 hover:shadow-[0_4px_16px_rgba(0,0,0,0.01)] transition-all duration-300"
        >
          <!-- Provider Header -->
          <div class="flex items-start justify-between gap-4">
            <div class="flex flex-col gap-y-1 min-w-0">
              <h3
                class="text-base font-extrabold text-[#171717] tracking-tight truncate"
              >
                ${providerTitle}
              </h3>
              <span
                class="text-[#77736b] text-xs font-semibold truncate flex items-center gap-1.5"
              >
                <svg
                  class="h-3.5 w-3.5 shrink-0 opacity-70"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                  />
                </svg>
                ${emailStr}
              </span>
            </div>
            <div class="flex items-center shrink-0">
              <div
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold select-none ${badgeClass}"
              >
                <span class="h-1.5 w-1.5 rounded-full ${dotClass}"></span>
                ${isActive ? "Active" : "Disabled"}
              </div>
            </div>
          </div>

          <div class="h-px bg-[#e7e1d8]/30 my-4"></div>

          <!-- Models Section -->
          <div class="flex flex-col gap-y-2">
            <span
              class="text-[0.68rem] font-black uppercase tracking-wider text-[#77736b]"
              >Available Routing Models (${modelsList.length})</span
            >
            <div class="flex flex-wrap gap-1.5 pt-1">
              ${modelsList.map((m) => {
                const limitData = (data.limits?.[m.id] ||
                  data.limits?.[p.id] ||
                  null) as Record<string, unknown> | null;
                let limitText = "";
                if (limitData) {
                  if (typeof limitData === "object" && limitData !== null) {
                    const parts: string[] = [];
                    const session = (limitData.session ??
                      limitData.session_limit) as
                      | Record<string, unknown>
                      | number
                      | undefined;
                    const weekly = (limitData.weekly ??
                      limitData.weekly_limit) as
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
                        const t =
                          typeof limitData.total === "number"
                            ? limitData.total
                            : 0;
                        const u =
                          typeof limitData.used === "number"
                            ? limitData.used
                            : 0;
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
                      limitText =
                        raw.length > 40 ? `${raw.substring(0, 37)}...` : raw;
                    }
                  } else {
                    limitText = String(limitData);
                  }
                }

                return html`
                  <div
                    class="flex items-center gap-1 bg-[#faf9f6]/80 border border-[#e7e1d8]/60 px-2.5 py-1 rounded-lg transition-all hover:border-[#e7e1d8] hover:bg-[#faf9f6] shadow-2xs hover:shadow-xs group"
                  >
                    <span
                      class="text-[#2c2925] text-xs font-semibold select-none cursor-default"
                      title="${m.id}"
                    >
                      ${m.name}
                    </span>
                    ${
                      limitText
                        ? html`<div class="w-px h-3 bg-[#e7e1d8]/80 mx-1"></div>`
                        : ""
                    }
                    ${
                      limitText
                        ? html`<span class="text-[0.65rem] font-bold text-[#8c877d] uppercase tracking-wide select-none cursor-help group-hover:text-[#6a665d] transition-colors" title="Usage Limits">${limitText}</span>`
                        : ""
                    }
                  </div>
                `;
              })}
            </div>
          </div>
        </div>
      `;
    });

    container.replaceChildren(
      Card({
        title: "Active Routing Providers",
        description:
          "Review active upstream accounts, connection health, and routing models.",
        content: listHtml,
      }),
    );
  }

  service.subscribe(() => render());
  render();
  return container;
}
