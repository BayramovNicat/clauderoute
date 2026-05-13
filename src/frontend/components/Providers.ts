import { ProvidersService } from "../services/ProvidersService";
import { html } from "../utils/dom";
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
