import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DraftStatus = "idle" | "saving" | "saved" | "error";

interface Options {
  draftKey: string | null;
  module: string;
  enabled?: boolean;
  /** Debounce in ms for saves (default 1500). */
  debounceMs?: number;
}

/**
 * Universal server-side autosave for student form drafts.
 *
 * Strategy:
 * - On mount, looks up an existing draft by `draft_key`.
 * - `saveDraft(answers)` debounces an upsert to `form_drafts`.
 * - `clearDraft()` removes the row (call after final submission succeeds).
 *
 * Drafts are intentionally readable/writable by anyone — students access via
 * PIN+email (unauthenticated), and the `draft_key` embeds room+participant+form
 * which acts as the capability token (matches existing PIN-based tables).
 */
export function useFormDraft({ draftKey, module, enabled = true, debounceMs = 1500 }: Options) {
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<Record<string, any> | null>(null);
  const [status, setStatus] = useState<DraftStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<Record<string, any> | null>(null);

  // Load existing draft
  useEffect(() => {
    let cancelled = false;
    if (!enabled || !draftKey) {
      setLoaded(true);
      return;
    }
    setLoaded(false);
    (async () => {
      const { data } = await (supabase.from("form_drafts") as any)
        .select("answers_json, updated_at")
        .eq("draft_key", draftKey)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setDraft((data.answers_json as Record<string, any>) || null);
        if (data.updated_at) setLastSavedAt(new Date(data.updated_at));
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [draftKey, enabled]);

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
      console.error("[useFormDraft] save error", error);
      setStatus("error");
    } else {
      setStatus("saved");
      setLastSavedAt(new Date());
    }
  }, [draftKey, module, enabled]);

  const saveDraft = useCallback(
    (answers: Record<string, any>) => {
      if (!enabled || !draftKey) return;
      latestRef.current = answers;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        performSave();
      }, debounceMs);
    },
    [draftKey, enabled, debounceMs, performSave]
  );

  const clearDraft = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!draftKey) return;
    await (supabase.from("form_drafts") as any).delete().eq("draft_key", draftKey);
    setDraft(null);
    setLastSavedAt(null);
    setStatus("idle");
  }, [draftKey]);

  // Flush on unmount / page hide
  useEffect(() => {
    const flush = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        performSave();
      }
    };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
    return () => {
      flush();
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, [performSave]);

  return { draft, loaded, status, lastSavedAt, saveDraft, clearDraft };
}
