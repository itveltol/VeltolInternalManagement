"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Activity as ActivityIcon, ChevronDown } from "lucide-react";
import { verbTranslationKey, verbParams, actorDisplayName } from "../services/activityVerb";
import type { ActivityEventGroup } from "../types";

interface Props {
  group: ActivityEventGroup;
}

export function ActivityEventRow({ group }: Props) {
  const t = useTranslations("comms.feed");
  const [expanded, setExpanded] = useState(false);
  const systemLabel = t("system");
  const name = actorDisplayName(group.events[0]?.actor ?? null, systemLabel);

  if (group.events.length === 1) {
    const event = group.events[0];
    return (
      <div className="flex items-start gap-2 py-1.5 text-[12px] text-veltol-fgMute">
        <ActivityIcon className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
        <span>
          <span className="font-medium text-veltol-fgDim">{name}</span>{" "}
          {t(`verb.${verbTranslationKey(event.verb)}`, verbParams(event))}
        </span>
      </div>
    );
  }

  return (
    <div className="py-1.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full min-h-[44px] items-center gap-2 text-left text-[12px] text-veltol-fgMute hover:text-veltol-fgDim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-expanded={expanded}
      >
        <ActivityIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span>
          {name === systemLabel
            ? t("groupedSystem", { count: group.events.length })
            : t("grouped", { name, count: group.events.length })}
        </span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {expanded && (
        <div className="mt-1 flex flex-col gap-1 border-l border-border pl-4">
          {group.events.map((event) => (
            <div key={event.id} className="text-[12px] text-veltol-fgMute">
              {t(`verb.${verbTranslationKey(event.verb)}`, verbParams(event))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
