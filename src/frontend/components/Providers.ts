import { ProvidersService } from "../services/ProvidersService";
import { cn, html } from "../utils/dom";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { EmptyState } from "./ui/EmptyState";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { ProviderCard } from "./ui/ProviderCard";

export function Providers() {
  const service = ProvidersService.getInstance();
  const container = html`<div
    class="w-full max-w-3xl mx-auto px-4 pb-16 mt-6"
  ></div>`;

  function render() {
    const { loading, error, data } = service.getState();

    // For initial load, show the big loading spinner if we don't have data yet.
    if (loading && !data) {
      container.replaceChildren(
        LoadingSpinner({ text: "Loading providers..." }),
      );
      return;
    }

    // For error on initial load (no data), show the error block.
    if (error && !data) {
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
      container.replaceChildren(
        EmptyState({
          title: "No Active Providers Found",
          description:
            "It looks like there are no active AI providers configured in your OmniRoute account.",
        }),
      );
      return;
    }

    const listHtml = data.providers.map((provider) =>
      ProviderCard({ provider, limits: data.limits }),
    );

    // Differentiate between refreshing error and no error
    let alerts: unknown;
    if (error) {
      const alertEl = Alert({
        type: "error",
        content: `Failed to refresh: ${error}`,
        className: "mx-6 mt-6 !mb-0",
      });
      alertEl.style.display = "flex";
      alerts = alertEl;
    }

    const refreshBtn = Button({
      onclick: () => service.fetchData(),
      className: cn(
        "px-3 py-1.5 gap-1.5 text-xs font-semibold text-[#77736b] hover:text-[#171717] hover:bg-[#f3f0ea] active:scale-[0.98] transition-all duration-300 rounded-lg border border-[#e7e1d8]/50 bg-[#faf9f6]/30 hover:border-[#e7e1d8] flex items-center justify-center cursor-pointer",
        loading ? "pointer-events-none opacity-60" : "",
      ),
      content: html`
        <svg
          class="h-3.5 w-3.5 ${loading ? "animate-spin text-[#f97316]" : ""}"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
        <span>Refresh</span>
      `,
    });

    container.replaceChildren(
      Card({
        title: "Active Routing Providers",
        description:
          "Review active upstream accounts, connection health, and routing models.",
        headerActions: refreshBtn,
        alerts,
        content: listHtml,
      }),
    );
  }

  service.subscribe(() => render());
  render();
  return container;
}
