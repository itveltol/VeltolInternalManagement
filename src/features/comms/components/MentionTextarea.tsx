"use client";

import { useMemo, useRef, useState } from "react";
import { Textarea } from "@/shared/components/ui/textarea";
import type { MentionCandidate } from "../types";

interface Props extends React.ComponentProps<"textarea"> {
  candidates: MentionCandidate[];
}

// Matches an in-progress @handle immediately before the caret — the same
// handle charset as mentions.ts's MENTION_PATTERN, minus the lookbehind
// (we already know the caret is mid-token from lastIndexOf("@")).
const PARTIAL_MENTION = /@([a-zA-Z0-9._-]*)$/;

export function MentionTextarea({ candidates, onChange, ...props }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [triggerIndex, setTriggerIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return candidates.filter((c) => c.handle.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, candidates]);

  const isOpen = query !== null && matches.length > 0;

  function syncMentionState(el: HTMLTextAreaElement) {
    const caret = el.selectionStart ?? el.value.length;
    const beforeCaret = el.value.slice(0, caret);
    const match = beforeCaret.match(PARTIAL_MENTION);
    if (match) {
      setQuery(match[1]);
      setTriggerIndex(caret - match[0].length);
      setActiveIndex(0);
    } else {
      setQuery(null);
      setTriggerIndex(null);
    }
  }

  function selectCandidate(candidate: MentionCandidate) {
    const el = textareaRef.current;
    if (!el || triggerIndex === null) return;
    const caret = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, triggerIndex);
    const after = el.value.slice(caret);
    const inserted = `@${candidate.handle} `;

    // The composer's textarea is uncontrolled (plain form submitted via a
    // server action, no `value` prop) — mutate the DOM value directly
    // rather than going through React state.
    el.value = `${before}${inserted}${after}`;
    const nextCaret = before.length + inserted.length;
    el.focus();
    el.setSelectionRange(nextCaret, nextCaret);

    setQuery(null);
    setTriggerIndex(null);
  }

  return (
    <div className="relative">
      <Textarea
        {...props}
        ref={textareaRef}
        onChange={(e) => {
          syncMentionState(e.target);
          onChange?.(e);
        }}
        onKeyDown={(e) => {
          if (!isOpen) {
            props.onKeyDown?.(e);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % matches.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
          } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            selectCandidate(matches[activeIndex]);
          } else if (e.key === "Escape") {
            setQuery(null);
            setTriggerIndex(null);
          } else {
            props.onKeyDown?.(e);
          }
        }}
        onClick={(e) => {
          syncMentionState(e.currentTarget);
          props.onClick?.(e);
        }}
        onBlur={(e) => {
          // Let a mousedown selection register before closing the popup.
          setTimeout(() => setQuery(null), 150);
          props.onBlur?.(e);
        }}
      />
      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-lg border border-border bg-popover shadow-md">
          {matches.map((candidate, i) => (
            <button
              key={candidate.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectCandidate(candidate);
              }}
              className={`flex w-full flex-col px-2.5 py-1.5 text-left text-[13px] ${
                i === activeIndex ? "bg-accent text-accent-foreground" : "text-veltol-fg"
              }`}
            >
              <span className="font-medium">{candidate.name}</span>
              <span className="text-[11px] text-veltol-fgMute">@{candidate.handle}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
