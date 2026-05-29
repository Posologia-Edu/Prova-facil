import { useEffect } from "react";

export interface ShortcutMap {
  /** Key combos like "g o" (after pressing g, then o) or single "n", "/" */
  [combo: string]: () => void;
}

/**
 * Lightweight global keyboard shortcuts. Ignores when typing in form fields.
 * Supports single keys and simple two-key sequences ("g o", "g s", etc.).
 */
export function useKeyboardShortcuts(map: ShortcutMap, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let buffer = "";
    let timer: number | null = null;

    function isTyping(el: EventTarget | null) {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    }

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;
      const k = e.key.toLowerCase();
      if (k.length !== 1 && k !== "/") return;

      // Try sequence first
      const seq = buffer ? `${buffer} ${k}` : k;
      if (map[seq]) {
        e.preventDefault();
        map[seq]();
        buffer = "";
        if (timer) window.clearTimeout(timer);
        return;
      }
      if (map[k] && !buffer) {
        e.preventDefault();
        map[k]();
        return;
      }
      // begin sequence buffering for next char
      buffer = k;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => { buffer = ""; }, 800);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timer) window.clearTimeout(timer);
    };
  }, [map, enabled]);
}
