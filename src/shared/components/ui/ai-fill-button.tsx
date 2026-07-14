"use client";

import { useRef } from "react";
import { Sparkles, Paperclip, Loader2, Undo2 } from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface AiFillButtonProps {
  onFill: () => void;
  onFileSelect: (file: File) => void;
  onUndo?: () => void;
  loading: boolean;
  hasSuggestions: boolean;
  disabled?: boolean;
  className?: string;
}

export function AiFillButton({
  onFill,
  onFileSelect,
  onUndo,
  loading,
  hasSuggestions,
  disabled,
  className,
}: AiFillButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (hasSuggestions && onUndo) {
    return (
      <button
        type="button"
        onClick={onUndo}
        className={cn(
          "inline-flex items-center gap-1 font-mono text-[10px] text-veltol-fgMute hover:text-veltol-accent transition-colors",
          className,
        )}
      >
        <Undo2 className="size-3" />
        Undo AI fill
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={onFill}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center gap-1 font-mono text-[10px] transition-colors",
          "text-veltol-accent/70 hover:text-veltol-accent",
          (disabled || loading) && "opacity-40 pointer-events-none",
        )}
      >
        {loading ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Sparkles className="size-3" />
        )}
        {loading ? "Filling…" : "Fill with AI"}
      </button>

      <span className="text-veltol-fgMute/40 font-mono text-[10px]">·</span>

      <button
        type="button"
        disabled={loading}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "inline-flex items-center gap-1 font-mono text-[10px] transition-colors",
          "text-veltol-accent/70 hover:text-veltol-accent",
          loading && "opacity-40 pointer-events-none",
        )}
      >
        <Paperclip className="size-3" />
        From file
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onFileSelect(file);
            e.target.value = "";
          }
        }}
      />
    </div>
  );
}
