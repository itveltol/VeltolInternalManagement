import { useTranslations } from "next-intl";
import type { VacationBalance } from "../types";

interface Props {
  balance: VacationBalance | null;
  label?: string;
}

export function VacationBalanceCard({ balance, label }: Props) {
  const t = useTranslations("vacationBalance");

  if (!balance) return null;

  const total = balance.baseDays + balance.carriedOverDays;

  return (
    <div className="v-panel v-hairline rounded-xl p-5">
      {label && (
        <div className="mono-label mb-3 text-[9px] text-veltol-fgMute">{label}</div>
      )}
      <div className="flex items-baseline gap-2">
        <span className="font-display text-2xl font-semibold text-veltol-fg">
          {balance.remainingDays}
        </span>
        <span className="font-mono text-sm text-veltol-fgMute">/ {total} {t("remaining")}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <div className="mono-label text-[9px] text-veltol-fgMute">{t("base")}</div>
          <div className="font-mono text-[13px] text-veltol-fgDim">{balance.baseDays}</div>
        </div>
        <div>
          <div className="mono-label text-[9px] text-veltol-fgMute">{t("carriedOver")}</div>
          <div className="font-mono text-[13px] text-veltol-fgDim">+{balance.carriedOverDays}</div>
        </div>
        <div>
          <div className="mono-label text-[9px] text-veltol-fgMute">{t("used")}</div>
          <div className="font-mono text-[13px] text-veltol-fgDim">{balance.usedDays}</div>
        </div>
      </div>
    </div>
  );
}
