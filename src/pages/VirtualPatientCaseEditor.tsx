import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, HeartPulse, History, Loader2, MessageSquare, Plus, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  VERSAO_KEYS,
  buildPatientPrompt,
  isCaseDataV2,
  validateCaseData,
  type VersaoKey,
  type VpCaseData,
} from "@/lib/vp-case-schema";
import { versaoProgress } from "@/lib/vp-case-progress";
import { AddVersionDialog } from "@/components/vp-case/AddVersionDialog";
import { LegacyView } from "@/components/vp-case/LegacyView";
import { NucleoEditor } from "@/components/vp-case/NucleoEditor";
import { PreviewChat } from "@/components/vp-case/PreviewChat";
import { RevisaoPanel, revisaoPendentes } from "@/components/vp-case/RevisaoPanel";
import { VersaoEditor } from "@/components/vp-case/VersaoEditor";
import { VERSAO_LABEL, cloneVersao, emptyVersao } from "@/components/vp-case/defaults";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

interface VersionRow {
  id: string;
  saved_at: string;
  snapshot: any;
}

export default function VirtualPatientCaseEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<any>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [draft, setDraft] = useState<VpCaseData | null>(null);
  const [savedJson, setSavedJson] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("nucleo");
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [rerunning, setRerunning] = useState(false);
  const [generating, setGenerating] = useState<VersaoKey | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (active) setUid(user?.id ?? null);
      const q = supabase.from("custom_virtual_patients").select("*");
      const { data } = await (id && UUID_RE.test(id) ? q.eq("id", id) : q.eq("slug", id || "")).maybeSingle();
      if (!active) return;
      setRow(data);
      if (data && isCaseDataV2(data.case_data)) {
        const d = clone(data.case_data as unknown as VpCaseData);
        setDraft(d);
        setSavedJson(JSON.stringify(d));
        setStatus(data.status === "draft" ? "draft" : "published");
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]);

  const canEdit = !!row && !row.is_legacy && !!draft && row.user_id === uid;
  const dirty = !!draft && JSON.stringify(draft) !== savedJson;
  const errors = useMemo(() => (draft ? validateCaseData(draft) : []), [draft]);
  const versaoKeys = useMemo(() => (draft ? VERSAO_KEYS.filter((k) => draft.versoes[k]) : []), [draft]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const loadVersions = async (patientId: string) => {
    const { data } = await supabase
      .from("custom_virtual_patient_versions")
      .select("id, saved_at, snapshot")
      .eq("patient_id", patientId)
      .order("saved_at", { ascending: false });
    setVersions((data as VersionRow[]) || []);
  };

  useEffect(() => {
    if (row && canEdit) loadVersions(row.id);
  }, [row?.id, canEdit]);

  const mutate = (fn: (d: VpCaseData) => void) =>
    setDraft((prev) => {
      if (!prev) return prev;
      const next = clone(prev);
      fn(next);
      return next;
    });

  const addVersao = (key: VersaoKey) => {
    mutate((d) => {
      const base = VERSAO_KEYS.map((k) => d.versoes[k]).find(Boolean);
      d.versoes[key] = base ? cloneVersao(base) : emptyVersao();
    });
    setTab(key);
    toast.success(`Versão ${VERSAO_LABEL[key]} criada a partir de uma versão existente. Adapte o cenário, a revelação e o gabarito.`);
  };

  const save = async (nextStatus: "draft" | "published") => {
    if (!row || !draft) return;
    if (nextStatus === "published" && errors.length > 0) {
      toast.error("Corrija os problemas apontados antes de publicar.");
      return;
    }
    setSaving(true);
    let systemPrompt: string = row.system_prompt;
    try {
      const k = VERSAO_KEYS.find((x) => draft.versoes[x]);
      if (k) systemPrompt = buildPatientPrompt(draft, k);
    } catch {
      // mantém o texto anterior se o rascunho ainda estiver incompleto
    }
    const n = draft.nucleo;
    const { error } = await supabase
      .from("custom_virtual_patients")
      .update({
        case_data: draft as unknown as Json,
        status: nextStatus,
        name: n.identidade.nome || row.name,
        age: Number.isFinite(n.identidade.idade) ? n.identidade.idade : row.age,
        profession: n.identidade.ocupacao || row.profession,
        baseline_vitals: n.vitais_baseline as unknown as Json,
        baseline_context: n.contexto_vitais || "",
        system_prompt: systemPrompt,
      })
      .eq("id", row.id);
    setSaving(false);
    if (error) {
      toast.error(error.message || "Não foi possível salvar.");
      return;
    }
    setSavedJson(JSON.stringify(draft));
    setStatus(nextStatus);
    setRow({ ...row, status: nextStatus, name: n.identidade.nome || row.name });
    toast.success(nextStatus === "published" ? "Caso publicado. Já pode ser vinculado a turmas." : "Rascunho salvo.");
    loadVersions(row.id);
  };

  // Gera com IA uma versão que falta. A função lê o núcleo salvo e devolve a versão sem gravar:
  // ela entra no rascunho do editor para o docente revisar e salvar.
  const gerarVersaoIA = async (key: VersaoKey) => {
    if (!row || dirty) return;
    setGenerating(key);
    try {
      const { data, error } = await supabase.functions.invoke("generate-vp-case", {
        body: { action: "versao", id: row.id, profession: key, salvar: false },
      });
      if (error || data?.error) {
        let msg = data?.error || error?.message || "Falha ao gerar a versão.";
        try { const b = await (error as any)?.context?.json?.(); if (b?.error) msg = b.error; } catch { /* mantém */ }
        throw new Error(msg);
      }
      mutate((d) => { d.versoes[key] = data.versao; });
      setTab(key);
      const n = (data.errors || []).length;
      toast.success(
        n
          ? `Versão ${VERSAO_LABEL[key]} gerada com ${n} pendência(s) para revisar. Revise e salve o rascunho.`
          : `Versão ${VERSAO_LABEL[key]} gerada. Revise e salve o rascunho; depois use "Refazer revisão".`,
      );
    } catch (e: any) {
      toast.error(e.message || "Não foi possível gerar a versão.");
    } finally {
      setGenerating(null);
    }
  };

  // Nova revisão de consistência: a função lê e grava o caso salvo, então o editor recarrega o caso do banco.
  const rerunRevisao = async () => {
    if (!row || dirty) return;
    setRerunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-vp-case", { body: { action: "auditar", id: row.id } });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Falha na revisão.");
      const { data: fresh } = await supabase.from("custom_virtual_patients").select("case_data").eq("id", row.id).maybeSingle();
      if (fresh && isCaseDataV2(fresh.case_data)) {
        const d = clone(fresh.case_data as unknown as VpCaseData);
        setDraft(d);
        setSavedJson(JSON.stringify(d));
      }
      toast.success(data?.revisao_salva === false ? "Revisão feita, mas não foi possível salvá-la no caso." : "Revisão atualizada.");
    } catch (e: any) {
      toast.error(e.message || "Não foi possível revisar o caso.");
    } finally {
      setRerunning(false);
    }
  };

  const restore = (v: VersionRow) => {
    const cd = v.snapshot?.case_data;
    if (!isCaseDataV2(cd)) {
      toast.error("Essa versão não pode ser restaurada.");
      return;
    }
    setDraft(clone(cd as VpCaseData));
    setTab("nucleo");
    toast.success("Versão carregada no editor. Revise e salve para confirmar.");
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!row) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/virtual-patients")}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
        <Alert>
          <AlertDescription>Caso não encontrado. Se ele é um dos pacientes legados, confirme que a migração do cadastro único foi aplicada.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const missing = draft ? VERSAO_KEYS.filter((k) => !draft.versoes[k]) : [];

  const header = (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" className="-ml-3" onClick={() => navigate("/virtual-patients")}><ArrowLeft className="h-4 w-4" />Pacientes Virtuais</Button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-soft font-heading text-xl font-medium text-brand-text">
            {initials(row.name)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h1 className="font-heading text-[2rem] font-medium leading-[1.1] text-foreground">{row.name}</h1>
              <span className="text-sm text-muted-foreground">{row.age} anos</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge tone="brand">{row.category}</StatusBadge>
              {row.is_legacy && <StatusBadge>Legado</StatusBadge>}
              {draft && (status === "published"
                ? <StatusBadge tone="ok" dot>Publicado</StatusBadge>
                : <StatusBadge tone="warn" dot>Rascunho</StatusBadge>)}
              {draft && !canEdit && <StatusBadge>Somente leitura</StatusBadge>}
              {dirty && <StatusBadge tone="accent" dot>Alterações não salvas</StatusBadge>}
            </div>
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            {missing.length > 0 && (
              <Button variant="outline" onClick={() => setAddOpen(true)} disabled={!!generating}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Adicionar versão
              </Button>
            )}
            <Button variant="outline" onClick={() => save("draft")} disabled={saving || !dirty && status === "draft"}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar rascunho
            </Button>
            <Button onClick={() => save("published")} disabled={saving || errors.length > 0 || (!dirty && status === "published")}>
              <Send className="h-4 w-4" />Publicar
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  if (!draft) {
    return (
      <div className="space-y-6">
        {header}
        <LegacyView row={row} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      {errors.length > 0 ? (
        <div className="flex items-start gap-3 rounded-card border border-warning/30 bg-warning-soft px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-ink" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{errors.length} {errors.length === 1 ? "problema impede" : "problemas impedem"} a publicação.</p>
            <ul className="mt-1.5 max-h-40 list-disc space-y-0.5 overflow-y-auto pl-5 text-muted-foreground">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-card border border-success/30 bg-success-soft px-4 py-3 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          <span>Caso consistente: pode ser publicado.</span>
        </div>
      )}

      {!canEdit && (
        <Alert>
          <AlertDescription>Este caso é somente leitura para você. Use a prévia para conversar com ele.</AlertDescription>
        </Alert>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="nucleo"><HeartPulse className="mr-1.5 h-3.5 w-3.5" />Núcleo clínico</TabsTrigger>
          {versaoKeys.map((k) => {
            const p = versaoProgress(draft, k);
            return (
              <TabsTrigger key={k} value={k}>
                {VERSAO_LABEL[k]}
                <span className={`ml-2 font-mono text-xs ${p.done === p.total ? "text-success" : "text-muted-foreground"}`}>{p.done}/{p.total}</span>
              </TabsTrigger>
            );
          })}
          <TabsTrigger value="previa"><MessageSquare className="mr-1.5 h-3.5 w-3.5" />Prévia</TabsTrigger>
          {canEdit && (
            <TabsTrigger value="historico">
              <History className="mr-1.5 h-3.5 w-3.5" />Histórico
              {versions.length > 0 && <span className="ml-2 font-mono text-xs text-muted-foreground">{versions.length}</span>}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="nucleo" className="mt-6">
          <NucleoEditor
            nucleo={draft.nucleo}
            disabled={!canEdit}
            onChange={(fn) => mutate((d) => fn(d.nucleo))}
            topo={draft.revisao || canEdit ? {
              section: {
                id: "revisao",
                label: "Revisão de consistência",
                count: draft.revisao ? revisaoPendentes(draft.revisao) || "" : "",
              },
              node: (
                <RevisaoPanel
                  revisao={draft.revisao}
                  canEdit={canEdit}
                  dirty={dirty}
                  rerunning={rerunning}
                  onToggle={(i, resolvido) => mutate((d) => { if (d.revisao?.problemas[i]) d.revisao.problemas[i].resolvido = resolvido; })}
                  onRerun={rerunRevisao}
                />
              ),
            } : undefined}
          />
        </TabsContent>

        {versaoKeys.map((k) => (
          <TabsContent key={k} value={k} className="mt-6">
            <VersaoEditor
              versaoKey={k}
              versao={draft.versoes[k]!}
              nucleo={draft.nucleo}
              disabled={!canEdit}
              onChange={(fn) => mutate((d) => fn(d.versoes[k]!))}
            />
          </TabsContent>
        ))}

        <TabsContent value="previa" className="mt-6">
          {versaoKeys.length > 0 ? (
            <PreviewChat caseData={draft} versaoKeys={versaoKeys} />
          ) : (
            <p className="text-sm text-muted-foreground">Crie ao menos uma versão para usar a prévia.</p>
          )}
        </TabsContent>

        {canEdit && (
          <TabsContent value="historico" className="mt-6 space-y-4">
            <Card>
              <div className="divide-y">
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-soft text-brand-text"><Clock className="h-4 w-4" /></span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Versão aberta no editor</p>
                    <p className="text-xs text-muted-foreground">{dirty ? "Com alterações não salvas" : "Igual à última salva"}</p>
                  </div>
                  <StatusBadge tone="accent">Aberta</StatusBadge>
                </div>
                {versions.length === 0 ? (
                  <p className="px-4 py-6 text-sm italic text-muted-foreground">Ainda não há versões anteriores.</p>
                ) : (
                  versions.map((v) => (
                    <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="grid h-8 w-8 place-items-center rounded-md bg-muted text-muted-foreground"><Clock className="h-4 w-4" /></span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{new Date(v.saved_at).toLocaleString("pt-BR")}</p>
                        <p className="text-xs text-muted-foreground">{v.snapshot?.status === "draft" ? "Era rascunho" : "Era publicado"}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => restore(v)}>Restaurar no editor</Button>
                    </div>
                  ))
                )}
              </div>
            </Card>
            <p className="text-sm text-muted-foreground">
              Cada vez que o caso é salvo, a versão anterior é guardada (as últimas 30). Restaurar carrega a versão no editor; ela só vira a atual quando você salva.
            </p>
          </TabsContent>
        )}
      </Tabs>

      <AddVersionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        missing={missing}
        dirty={dirty}
        generating={generating}
        onAI={gerarVersaoIA}
        onManual={addVersao}
      />
    </div>
  );
}
