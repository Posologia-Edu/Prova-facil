import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { fichaSchema, type FichaVersao } from "@/lib/vp-ficha";

interface Props {
  /** sessão primária (a mesma que guarda o chat do grupo) */
  sessionId: string;
  encounter: number;
  versao: FichaVersao;
  studentEmail: string;
  studentName: string;
  isGroup: boolean;
  /** atendimento concluído: a ficha vira somente leitura */
  locked: boolean;
  onClose: () => void;
}

const SAVE_DELAY_MS = 1000;
const POLL_MS = 6000;
const k = (enc: number, key: string) => `${enc}:${key}`;

// Ficha do atendimento: uma linha por seção no banco, para dois integrantes do grupo
// editarem seções diferentes sem sobrescrever um ao outro.
export function RecordPanel({ sessionId, encounter, versao, studentEmail, studentName, isGroup, locked, onClose }: Props) {
  const [tab, setTab] = useState(encounter);
  const [values, setValues] = useState<Record<string, string>>({});
  const [editors, setEditors] = useState<Record<string, string>>({});
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const latest = useRef<Record<string, string>>({});
  const dirty = useRef<Set<string>>(new Set());
  const timers = useRef<Record<string, number>>({});

  useEffect(() => { setTab(encounter); }, [encounter]);

  const table = () => (supabase as any).from("virtual_patient_record_sections");

  const saveKey = useCallback(async (storeKey: string) => {
    const [encStr, ...rest] = storeKey.split(":");
    const sectionKey = rest.join(":");
    const content = latest.current[storeKey] ?? "";
    const { error: err } = await table().upsert(
      {
        session_id: sessionId,
        encounter: Number(encStr),
        section_key: sectionKey,
        content,
        updated_by_email: studentEmail || null,
        updated_by_name: studentName || studentEmail || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id,encounter,section_key" },
    );
    if (err) {
      console.error("ficha: falha ao salvar", err);
      setError(true);
      return;
    }
    setError(false);
    // Só dá a seção por salva se o aluno não digitou mais nada nesse meio tempo.
    if ((latest.current[storeKey] ?? "") === content) {
      dirty.current.delete(storeKey);
      setPendingCount(dirty.current.size);
    }
  }, [sessionId, studentEmail, studentName]);

  const flush = useCallback(() => {
    Object.keys(timers.current).forEach((key) => { window.clearTimeout(timers.current[key]); });
    timers.current = {};
    dirty.current.forEach((key) => { void saveKey(key); });
  }, [saveKey]);

  const pull = useCallback(async () => {
    if (!sessionId) return;
    const { data, error: err } = await table()
      .select("encounter, section_key, content, updated_by_name, updated_by_email")
      .eq("session_id", sessionId);
    if (err || !data) return;
    const nextValues: Record<string, string> = {};
    const nextEditors: Record<string, string> = {};
    for (const r of data as any[]) {
      const key = k(r.encounter, r.section_key);
      // Não sobrescreve o que o aluno está digitando agora.
      if (dirty.current.has(key)) continue;
      nextValues[key] = r.content ?? "";
      latest.current[key] = r.content ?? "";
      if (r.updated_by_email && r.updated_by_email !== studentEmail) nextEditors[key] = r.updated_by_name || r.updated_by_email;
    }
    setValues((prev) => ({ ...prev, ...nextValues }));
    setEditors((prev) => {
      const merged = { ...prev };
      for (const key of Object.keys(nextValues)) {
        if (nextEditors[key]) merged[key] = nextEditors[key]; else delete merged[key];
      }
      return merged;
    });
    setLoaded(true);
  }, [sessionId, studentEmail]);

  useEffect(() => {
    void pull();
    const poll = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (dirty.current.size > 0) flush(); // reenvia o que falhou ao salvar
      void pull();
    }, POLL_MS);
    const onHidden = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", flush);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [pull, flush]);

  const onChange = (enc: number, key: string, text: string) => {
    const storeKey = k(enc, key);
    latest.current[storeKey] = text;
    dirty.current.add(storeKey);
    setPendingCount(dirty.current.size);
    setValues((prev) => ({ ...prev, [storeKey]: text }));
    setEditors((prev) => { const n = { ...prev }; delete n[storeKey]; return n; });
    window.clearTimeout(timers.current[storeKey]);
    timers.current[storeKey] = window.setTimeout(() => { void saveKey(storeKey); }, SAVE_DELAY_MS);
  };

  const schema = useMemo(() => fichaSchema(tab, versao), [tab, versao]);
  const readOnly = locked || tab < encounter;
  const encounters = useMemo(() => Array.from({ length: encounter }, (_, i) => i + 1), [encounter]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <div className="flex items-start justify-between gap-2 border-b p-3 flex-shrink-0">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm">{schema.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{schema.hint}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose} title="Fechar ficha">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {encounters.length > 1 && (
        <div className="border-b px-3 py-2 flex-shrink-0">
          <Tabs value={String(tab)} onValueChange={(v) => setTab(Number(v))}>
            <TabsList className="h-8">
              {encounters.map((e) => (
                <TabsTrigger key={e} value={String(e)} className="text-xs h-6 px-3">
                  {e === 1 ? "Anamnese" : e === 2 ? "SBAR" : "SOAP"}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {!loaded && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando a ficha…
          </div>
        )}
        {schema.sections.map((s) => {
          const storeKey = k(tab, s.key);
          return (
            <div key={s.key} className="space-y-1">
              <Label htmlFor={`ficha-${tab}-${s.key}`} className="text-xs font-semibold">{s.label}</Label>
              <Textarea
                id={`ficha-${tab}-${s.key}`}
                value={values[storeKey] ?? ""}
                onChange={(e) => onChange(tab, s.key, e.target.value)}
                placeholder={s.placeholder}
                readOnly={readOnly}
                rows={3}
                className="text-sm resize-y min-h-[72px]"
              />
              {isGroup && editors[storeKey] && (
                <p className="text-[11px] text-muted-foreground">Última edição: {editors[storeKey]}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t px-3 py-2 text-xs flex items-center gap-1.5 flex-shrink-0 text-muted-foreground">
        {error ? (
          <span className="text-destructive">Não foi possível salvar. Verifique a conexão; vamos tentar de novo.</span>
        ) : readOnly ? (
          <span>{locked ? "Atendimento concluído: ficha somente leitura." : "Encontro anterior: somente leitura."}</span>
        ) : pendingCount > 0 ? (
          <><Loader2 className="h-3 w-3 animate-spin" /> Salvando…</>
        ) : (
          <><Check className="h-3 w-3 text-green-600" /> Salvo automaticamente{isGroup ? " e compartilhado com o grupo" : ""}</>
        )}
      </div>
    </div>
  );
}
