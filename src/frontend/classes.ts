export const classes = {
  primaryButton:
    "min-h-9 rounded-full border-0 bg-[#171717] px-4 text-[0.86rem] font-bold text-white transition-colors duration-150 hover:enabled:bg-[#f97316] disabled:cursor-not-allowed disabled:opacity-35",
  disabled: "cursor-not-allowed opacity-35",
  envRow:
    "grid grid-cols-1 items-center gap-4 border-t border-[#e7e1d8] py-3 last:border-b md:grid-cols-[minmax(230px,0.32fr)_minmax(0,1fr)]",
  envName:
    "overflow-hidden text-ellipsis whitespace-nowrap text-[0.74rem] font-bold text-[#77736b] [font-family:'SF_Mono',Menlo,Consolas,monospace]",
  controlField:
    "h-[38px] w-full min-w-0 rounded-[10px] border-0 bg-[#f3f0ea] px-3 text-[0.88rem] font-semibold text-[#171717] outline-none focus:shadow-[0_0_0_2px_#f97316]",
  secretInput:
    "pr-11 tracking-[0.02em] [font-family:'SF_Mono',Menlo,Consolas,monospace]",
  providerCard: "border-t border-[#e7e1d8] py-4 last:border-b",
  providerCardHeader:
    "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4",
  providerName: "m-0 text-[1.12rem] font-bold tracking-[-0.03em]",
  providerAccount:
    "mt-1 mb-0 break-all text-[0.84rem] font-medium text-[#77736b]",
  statusBadge: "whitespace-nowrap text-[0.76rem] font-bold",
  statusBadgeActive: "text-[#16833a]",
  statusBadgeWarning: "text-[#9a5b00]",
  modelsBox: "mt-3",
  modelsTitle:
    "m-0 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[#77736b]",
  modelList: "mt-2 flex max-h-[150px] flex-wrap gap-x-3 gap-y-2 overflow-auto",
  modelPill:
    "text-[0.72rem] font-semibold text-[#4b4740] [font-family:'SF_Mono',Menlo,Consolas,monospace]",
  errorBox: "mt-3 mb-0 text-[0.86rem] font-semibold text-[#b3261e]",
  message: "mt-4 text-[0.9rem] font-bold text-[#4b4740]",
  messageError: "text-[#b3261e]",
  emptyState:
    "m-0 break-words border-t border-[#e7e1d8] py-4 text-[0.9rem] font-semibold text-[#77736b]",
} as const;
