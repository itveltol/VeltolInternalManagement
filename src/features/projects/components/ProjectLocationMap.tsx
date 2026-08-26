"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

const LocationPickerMap = dynamic(
  () => import("@/shared/components/ui/location-picker-map").then((m) => m.LocationPickerMap),
  { ssr: false },
);

interface Props {
  lat: number;
  lng: number;
}

export function ProjectLocationMap({ lat, lng }: Props) {
  const t = useTranslations("projects");

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-veltol-fgMute">
        {t("fields.pinLocation")}
      </div>
      <LocationPickerMap
        lat={lat}
        lng={lng}
        readOnly
        className="h-80 w-full overflow-hidden rounded-md border border-border"
      />
    </div>
  );
}
