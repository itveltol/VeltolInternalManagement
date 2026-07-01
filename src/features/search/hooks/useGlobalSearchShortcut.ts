"use client"

import { useEffect } from "react";
import { useSearchStore } from "./useSearchStore";

export function useGlobalSearchShortcut() {

    const open = useSearchStore((s) => s.open);

    useEffect(() => {
        function handler(e: KeyboardEvent) {
            if((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                open();
            }
        }
        window.addEventListener("keydown", handler);
        return () => {
            window.removeEventListener("keydown", handler);
        };
    }, [open]);
}