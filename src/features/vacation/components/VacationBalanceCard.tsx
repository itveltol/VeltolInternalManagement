import { useTranslations } from "next-intl";
import { balanceTotal } from "../types";
import type { VacationBalance } from "../types";

interface Props {
  balance: VacationBalance | null;
  label?: string;
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

export function VacationBalanceCard({ balance, label }: Props) {
  const t = useTranslations("vacationBalance");

  if (!balance) return null;

  const fields = [
    { label: t("base"), value: `${balance.baseDays}` },
    { label: t("carriedOver"), value: `+${balance.carriedOverDays}` },
    ...(balance.adjustmentDays !== 0
      ? [{ label: t("adjustments"), value: signed(balance.adjustmentDays) }]
      : []),
    { label: t("used"), value: `${balance.usedDays}` },
    ...(balance.otherLeaveDays > 0
      ? [{ label: t("otherLeave"), value: `${balance.otherLeaveDays}` }]
      : []),
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {label && (
        <div className="mb-3 text-[11px] font-medium text-veltol-fgMute">{label}</div>
      )}
      <div className="flex items-baseline gap-2">
        <span
          className={
            balance.remainingDays < 0
              ? "text-2xl font-semibold text-veltol-red"
              : "text-2xl font-semibold text-veltol-fg"
          }
        >
          {balance.remainingDays}
        </span>
        <span className="font-mono text-sm text-veltol-fgMute">/ {balanceTotal(balance)} {t("remaining")}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        {fields.map((f) => (
          <div key={f.label}>
            <div className="text-[11px] font-medium text-veltol-fgMute">{f.label}</div>
            <div className="font-mono text-[13px] text-veltol-fgDim">{f.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
