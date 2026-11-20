import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DraftStatus = "idle" | "saving" | "saved" | "error";

interface Options {
  draftKey: string | null;
  module: string;
  /** PIN da sala e e-mail do aluno: o servidor só entrega e grava o rascunho de quem é dono da chave. */
  accessCode?: string | null;
  email?: string | null;
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
async function chamarRascunho(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke("form-draft", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useFormDraft({ draftKey, module: _module, accessCode, email, enabled = true, debounceMs = 800 }: Options) {
  const acessoRef = useRef({ accessCode: accessCode || "", email: email || "" });
  acessoRef.current = { accessCode: (accessCode || "").trim(), email: (email || "").trim() };
  const temAcesso = !!(accessCode && email);
  // Chave cujo carregamento terminou. `loaded` só vale para a chave ATUAL: sem isso, quando a chave aparece (depois do login)
  // o valor antigo "true" (de quando a chave ainda era nula) faz a tela marcar o rascunho como restaurado antes de ele chegar,
  // e o primeiro salvamento grava o formulário vazio por cima do rascunho.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const semChave = !enabled || !draftKey;
  const loaded = semChave ? true : loadedKey === draftKey;
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
    if (!enabled || !draftKey || !localKey) return;
    if (!temAcesso) return; // espera o PIN e o e-mail chegarem

    // 1) Read local mirror synchronously
    let localPayload: { answers: Record<string, any>; ts: number } | null = null;
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) localPayload = JSON.parse(raw);
    } catch {
      /* ignore */
    }

    (async () => {
      let data: { answers_json: Record<string, any>; updated_at: string } | null = null;
      try {
        const r = await chamarRascunho({ action: "load", access_code: acessoRef.current.accessCode, email: acessoRef.current.email, draft_key: draftKey });
        data = r?.draft || null;
      } catch (e) {
        console.error("[useFormDraft] server load error", e); // segue só com a cópia local
      }
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

      setDraft(chosen);
      if (chosen && chosenTs) setLastSavedAt(new Date(chosenTs));
      setLoadedKey(draftKey);
    })();
    return () => {
      cancelled = true;
    };
  }, [draftKey, enabled, localKey, temAcesso]);

  const performSave = useCallback(async () => {
    if (!draftKey || !enabled) return;
    const payload = latestRef.current;
    if (!payload) return;
    setStatus("saving");
    let error: unknown = null;
    try {
      await chamarRascunho({ action: "save", access_code: acessoRef.current.accessCode, email: acessoRef.current.email, draft_key: draftKey, answers: payload });
    } catch (e) {
      error = e;
    }
    if (error) {
      console.error("[useFormDraft] server save error", error);
      setStatus("error");
    } else {
      setStatus("saved");
      setLastSavedAt(new Date());
    }
  }, [draftKey, enabled]);

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
    try {
      await chamarRascunho({ action: "clear", access_code: acessoRef.current.accessCode, email: acessoRef.current.email, draft_key: draftKey });
    } catch (e) {
      console.error("[useFormDraft] server clear error", e);
    }
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
