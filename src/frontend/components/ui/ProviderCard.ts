import type { Provider } from "@/frontend/services/ProvidersService";
import { ce, cn, html } from "@/frontend/utils/dom";
import { ModelInfo } from "./ModelInfo";
import { StatusBadge } from "./StatusBadge";

export type ProviderCardProps = {
  provider: Provider;
  limits?: Record<string, Record<string, unknown>> | null;
  className?: string;
} & Omit<Partial<HTMLDivElement>, "style">;

export function ProviderCard({
  provider,
  limits,
  className,
  ...props
}: ProviderCardProps): HTMLDivElement {
  const modelsList = provider.models || [];

  const providerTitle = (provider.provider || provider.id || "Unknown")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char: string) => char.toUpperCase());

  const emailStr =
    provider.email || provider.name || provider.account || "No email linked";
  const isActive = provider.status === "active" || provider.enabled !== false;

  const element = html`
    <div
      class="${cn(
        "flex flex-col p-5 rounded-2xl border border-[#e7e1d8]/40 bg-[#faf9f6]/20 hover:bg-[#faf9f6]/40 hover:border-[#e7e1d8]/80 hover:shadow-[0_4px_16px_rgba(0,0,0,0.01)] transition-all duration-300",
        className,
      )}"
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
          ${StatusBadge({ active: isActive })}
        </div>
      </div>

      <div class="h-px bg-[#e7e1d8]/30 my-4"></div>

      <!-- Models Section -->
      <div class="flex flex-col gap-y-2">
        <span
          class="text-[0.68rem] font-black uppercase tracking-wider text-[#77736b]"
        >
          Available Routing Models (${modelsList.length})
        </span>
        <div class="flex flex-wrap gap-1.5 pt-1">
          ${modelsList.map((m) => {
            const limitData = (limits?.[m.id] ||
              limits?.[provider.id] ||
              null) as Record<string, unknown> | null;
            return ModelInfo({ model: m, limitData });
          })}
        </div>
      </div>
    </div>
  ` as HTMLDivElement;

  return ce(element, props);
}
