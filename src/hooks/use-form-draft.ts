import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DraftStatus = "idle" | "saving" | "saved" | "error";

interface Options {
  draftKey: string | null;
  module: string;
  enabled?: boolean;
  /** Debounce in ms for server saves (default 800). LocalStorage mirror is immediate. */
  debounceMs?: number;
}

/**
 * Universal autosave for student form drafts.
 *
 * Strategy:
 * - On every change, mirror immediately to localStorage (synchronous, instant).
 * - Debounced upsert to `form_drafts` for cross-device recovery.
 * - On mount, restore from whichever source is newest (local vs server).
 * - Flushes on pagehide / visibilitychange / beforeunload.
 */
export function useFormDraft({ draftKey, module, enabled = true, debounceMs = 800 }: Options) {
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<Record<string, any> | null>(null);
  const [status, setStatus] = useState<DraftStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<Record<string, any> | null>(null);
  const draftKeyRef = useRef<string | null>(null);
  draftKeyRef.current = draftKey;

  const localKey = draftKey ? `form_draft_v1:${draftKey}` : null;

  // Load existing draft (local first, then server; pick newest)
  useEffect(() => {
    let cancelled = false;
    if (!enabled || !draftKey || !localKey) {
      setLoaded(true);
      return;
    }
    setLoaded(false);

    // 1) Read local mirror synchronously
    let localPayload: { answers: Record<string, any>; ts: number } | null = null;
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) localPayload = JSON.parse(raw);
    } catch {
      /* ignore */
    }

    (async () => {
      const { data } = await (supabase.from("form_drafts") as any)
        .select("answers_json, updated_at")
        .eq("draft_key", draftKey)
        .maybeSingle();
      if (cancelled) return;

      const serverTs = data?.updated_at ? new Date(data.updated_at).getTime() : 0;
      const localTs = localPayload?.ts || 0;

      let chosen: Record<string, any> | null = null;
      let chosenTs = 0;
      if (localTs >= serverTs && localPayload) {
        chosen = localPayload.answers;
        chosenTs = localTs;
      } else if (data) {
        chosen = (data.answers_json as Record<string, any>) || null;
        chosenTs = serverTs;
      }

      if (chosen) {
        setDraft(chosen);
        if (chosenTs) setLastSavedAt(new Date(chosenTs));
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [draftKey, enabled, localKey]);

  const performSave = useCallback(async () => {
    if (!draftKey || !enabled) return;
    const payload = latestRef.current;
    if (!payload) return;
    setStatus("saving");
    const { error } = await (supabase.from("form_drafts") as any).upsert(
      {
        draft_key: draftKey,
        module,
        answers_json: payload,
      },
      { onConflict: "draft_key" }
    );
    if (error) {
      console.error("[useFormDraft] server save error", error);
      setStatus("error");
    } else {
      setStatus("saved");
      setLastSavedAt(new Date());
    }
  }, [draftKey, module, enabled]);

  const saveDraft = useCallback(
    (answers: Record<string, any>) => {
      if (!enabled || !draftKey || !localKey) return;
      latestRef.current = answers;

      // Immediate localStorage mirror (synchronous, survives refresh even before server save)
      try {
        localStorage.setItem(localKey, JSON.stringify({ answers, ts: Date.now() }));
      } catch {
        /* quota or private mode — ignore */
      }

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        performSave();
      }, debounceMs);
    },
    [draftKey, enabled, debounceMs, performSave, localKey]
  );

  const clearDraft = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!draftKey) return;
    try {
      if (localKey) localStorage.removeItem(localKey);
    } catch {
      /* ignore */
    }
    await (supabase.from("form_drafts") as any).delete().eq("draft_key", draftKey);
    setDraft(null);
    setLastSavedAt(null);
    setStatus("idle");
  }, [draftKey, localKey]);

  // Flush on unmount / page hide / visibility change
  useEffect(() => {
    const flush = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        performSave();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      flush();
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [performSave]);

  return { draft, loaded, status, lastSavedAt, saveDraft, clearDraft };
}
