import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, History, Loader2, Plus, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { LegacyView } from "@/components/vp-case/LegacyView";
import { NucleoEditor } from "@/components/vp-case/NucleoEditor";
import { PreviewChat } from "@/components/vp-case/PreviewChat";
import { RevisaoPanel } from "@/components/vp-case/RevisaoPanel";
import { VersaoEditor } from "@/components/vp-case/VersaoEditor";
import { VERSAO_LABEL, cloneVersao, emptyVersao } from "@/components/vp-case/defaults";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
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

  const header = (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => navigate("/virtual-patients")}><ArrowLeft className="h-4 w-4 mr-1" />Pacientes Virtuais</Button>
        <h1 className="text-2xl font-bold">{row.name}, {row.age} anos</h1>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{row.category}</Badge>
          {row.is_legacy && <Badge variant="secondary">Legado</Badge>}
          {draft && <Badge variant={status === "published" ? "default" : "secondary"}>{status === "published" ? "Publicado" : "Rascunho"}</Badge>}
          {draft && !canEdit && <Badge variant="outline">Somente leitura</Badge>}
          {dirty && <Badge variant="destructive">Alterações não salvas</Badge>}
        </div>
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save("draft")} disabled={saving || !dirty && status === "draft"}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Salvar rascunho
          </Button>
          <Button onClick={() => save("published")} disabled={saving || errors.length > 0 || (!dirty && status === "published")}>
            <Send className="h-4 w-4 mr-2" />Publicar
          </Button>
        </div>
      )}
    </div>
  );

  if (!draft) {
    return (
      <div className="space-y-4">
        {header}
        <LegacyView row={row} />
      </div>
    );
  }

  const missing = VERSAO_KEYS.filter((k) => !draft.versoes[k]);

  return (
    <div className="space-y-4">
      {header}

      {errors.length > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-1">{errors.length} {errors.length === 1 ? "problema" : "problemas"} a corrigir antes de publicar:</p>
            <ul className="list-disc pl-5 space-y-0.5 text-sm max-h-40 overflow-y-auto">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>O caso está consistente: pode ser publicado.</AlertDescription>
        </Alert>
      )}

      {draft.revisao && (
        <RevisaoPanel
          revisao={draft.revisao}
          canEdit={canEdit}
          dirty={dirty}
          rerunning={rerunning}
          onToggle={(i, resolvido) => mutate((d) => { if (d.revisao?.problemas[i]) d.revisao.problemas[i].resolvido = resolvido; })}
          onRerun={rerunRevisao}
        />
      )}

      {!draft.revisao && canEdit && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Este caso ainda não tem revisão de consistência salva.</span>
          <Button type="button" size="sm" variant="outline" onClick={rerunRevisao} disabled={rerunning || dirty} title={dirty ? "Salve o rascunho antes: a revisão lê a versão salva do caso." : undefined}>
            {rerunning ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />}
            Fazer revisão agora
          </Button>
        </div>
      )}

      {!canEdit && (
        <Alert>
          <AlertDescription>Este caso é somente leitura para você. Use a prévia para conversar com ele.</AlertDescription>
        </Alert>
      )}

      {canEdit && missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Adicionar versão:</span>
          {missing.map((k) => (
            <Button key={k} type="button" size="sm" variant="outline" onClick={() => addVersao(k)}>
              <Plus className="h-3.5 w-3.5 mr-1" />{VERSAO_LABEL[k]}
            </Button>
          ))}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="nucleo">Núcleo clínico</TabsTrigger>
          {versaoKeys.map((k) => <TabsTrigger key={k} value={k}>{VERSAO_LABEL[k]}</TabsTrigger>)}
          <TabsTrigger value="previa">Prévia</TabsTrigger>
          {canEdit && <TabsTrigger value="historico"><History className="h-3.5 w-3.5 mr-1" />Histórico</TabsTrigger>}
        </TabsList>

        <TabsContent value="nucleo" className="mt-4">
          <NucleoEditor nucleo={draft.nucleo} disabled={!canEdit} onChange={(fn) => mutate((d) => fn(d.nucleo))} />
        </TabsContent>

        {versaoKeys.map((k) => (
          <TabsContent key={k} value={k} className="mt-4">
            <VersaoEditor
              versao={draft.versoes[k]!}
              nucleo={draft.nucleo}
              disabled={!canEdit}
              onChange={(fn) => mutate((d) => fn(d.versoes[k]!))}
            />
          </TabsContent>
        ))}

        <TabsContent value="previa" className="mt-4">
          {versaoKeys.length > 0 ? (
            <PreviewChat caseData={draft} versaoKeys={versaoKeys} />
          ) : (
            <p className="text-sm text-muted-foreground">Crie ao menos uma versão para usar a prévia.</p>
          )}
        </TabsContent>

        {canEdit && (
          <TabsContent value="historico" className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">Cada vez que o caso é salvo, a versão anterior é guardada (as últimas 30).</p>
            {versions.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">Ainda não há versões anteriores.</p>
            ) : (
              versions.map((v) => (
                <Card key={v.id}>
                  <CardContent className="py-3 flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <p className="font-medium">{new Date(v.saved_at).toLocaleString("pt-BR")}</p>
                      <p className="text-xs text-muted-foreground">{v.snapshot?.status === "draft" ? "Era rascunho" : "Era publicado"}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => restore(v)}>Restaurar no editor</Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
