import { useState } from "react";
import { AlertTriangle, CheckCircle2, Circle, Loader2, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { CASOS_SUGERIDOS } from "@/lib/vp-casos-sugeridos";
import type { VersaoKey } from "@/lib/vp-case-schema";

const PROFS: Array<{ key: VersaoKey; label: string; note?: string }> = [
  { key: "farmaceutico", label: "Farmácia" },
  { key: "enfermeiro", label: "Enfermagem", note: "rascunho para revisão de um docente da área" },
  { key: "medico", label: "Medicina", note: "rascunho para revisão de um docente da área" },
];

type StepStatus = "wait" | "run" | "ok" | "warn" | "error";
interface Step { id: string; label: string; status: StepStatus; detail?: string }
interface AuditIssue { gravidade: "alta" | "media" | "baixa"; onde: string; descricao: string; sugestao?: string }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** chamado quando o rascunho foi criado (mesmo que alguma etapa posterior tenha falhado) */
  onCreated: (category: string) => void;
  onOpenEditor: (id: string) => void;
}

async function callGenerator(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("generate-vp-case", { body });
  if (error) {
    let msg = error.message;
    try {
      const b = await (error as any).context?.json?.();
      if (b?.error) msg = b.error;
    } catch { /* mantém a mensagem genérica */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

const GRAV_CLS: Record<AuditIssue["gravidade"], string> = {
  alta: "text-destructive",
  media: "text-amber-600",
  baixa: "text-muted-foreground",
};

// Gera um caso v2 em etapas (núcleo → uma versão por profissão → revisão de consistência).
// O caso sempre nasce como rascunho: o docente revisa no editor e publica.
export function GenerateCaseDialog({ open, onOpenChange, onCreated, onOpenEditor }: Props) {
  const [category, setCategory] = useState("");
  const [context, setContext] = useState("");
  const [quem, setQuem] = useState<"paciente" | "cuidador">("paciente");
  const [profs, setProfs] = useState<VersaoKey[]>(["farmaceutico"]);
  const [running, setRunning] = useState(false);
  const [showSug, setShowSug] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [resumo, setResumo] = useState("");
  const [finished, setFinished] = useState(false);

  const setStep = (id: string, patch: Partial<Step>) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const reset = () => {
    setSteps([]); setCaseId(null); setIssues([]); setResumo(""); setFinished(false);
  };

  const toggleProf = (key: VersaoKey, on: boolean) =>
    setProfs((prev) => {
      const next = on ? [...prev, key] : prev.filter((k) => k !== key);
      return next.length > 0 ? next : prev; // ao menos uma profissão
    });

  const run = async () => {
    if (!category.trim() || !context.trim()) return;
    const chosen = PROFS.filter((p) => profs.includes(p.key));
    reset();
    setSteps([
      { id: "nucleo", label: "Núcleo clínico (fatos, medicamentos, exames, vitais)", status: "wait" },
      ...chosen.map((p) => ({ id: p.key, label: `Versão para ${p.label} (cenário, revelação, encontros, gabarito)`, status: "wait" as StepStatus })),
      { id: "auditar", label: "Revisão de consistência do caso", status: "wait" },
    ]);
    setRunning(true);

    let id: string | null = null;
    try {
      setStep("nucleo", { status: "run" });
      const n = await callGenerator({ action: "nucleo", category: category.trim(), clinical_context: context.trim(), quem_conta: quem });
      id = n.id;
      setCaseId(n.id);
      setStep("nucleo", { status: "ok", detail: n.name });
      onCreated(n.category);

      for (const p of chosen) {
        setStep(p.key, { status: "run" });
        const v = await callGenerator({ action: "versao", id, profession: p.key });
        const errs: string[] = v.errors || [];
        setStep(p.key, errs.length ? { status: "warn", detail: `${errs.length} pendência(s) para revisar no editor` } : { status: "ok" });
      }

      setStep("auditar", { status: "run" });
      const a = await callGenerator({ action: "auditar", id });
      setIssues(a.problemas || []);
      setResumo(a.resumo || "");
      setStep("auditar", { status: (a.problemas || []).length ? "warn" : "ok", detail: (a.problemas || []).length ? `${a.problemas.length} ponto(s) de atenção` : "Nenhum problema encontrado" });
    } catch (e: any) {
      const current = steps.find((s) => s.status === "run");
      setSteps((prev) => prev.map((s) => (s.status === "run" ? { ...s, status: "error", detail: e.message || "Falha" } : s)));
      void current;
    } finally {
      setRunning(false);
      setFinished(true);
    }
  };

  const close = (o: boolean) => {
    if (running) return;
    onOpenChange(o);
    if (!o) reset();
  };

  const icon = (s: StepStatus) =>
    s === "ok" ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
    : s === "warn" ? <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
    : s === "error" ? <XCircle className="h-4 w-4 text-destructive shrink-0" />
    : s === "run" ? <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
    : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />;

  const showForm = steps.length === 0;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => { if (running) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>Gerar Paciente Virtual</DialogTitle>
          <DialogDescription>
            A IA cria um caso completo: núcleo clínico, uma versão por profissão (cenário, revelação, 3 encontros e gabarito) e uma revisão de consistência. O caso nasce como <strong>rascunho</strong>: revise no editor e publique.
          </DialogDescription>
        </DialogHeader>

        {showForm ? (
          <div className="space-y-4 py-1">
            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowSug((v) => !v)}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />{showSug ? "Ocultar casos sugeridos" : "Casos sugeridos"}
              </Button>
              {showSug && (
                <div className="mt-2 rounded-md border p-2 max-h-52 overflow-y-auto space-y-3">
                  {(["Dor", "Inflamação"] as const).map((cat) => (
                    <div key={cat}>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">{cat}</p>
                      <div className="space-y-1">
                        {CASOS_SUGERIDOS.filter((c) => c.categoria === cat).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left rounded px-2 py-1.5 text-sm hover:bg-muted transition-colors"
                            onClick={() => { setCategory(c.categoria); setContext(c.contexto); setQuem(c.quem_conta); setShowSug(false); }}
                          >
                            {c.titulo}
                            {c.quem_conta === "cuidador" && <span className="ml-2 text-[11px] text-muted-foreground">(cuidador)</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-muted-foreground">Um clique preenche o formulário; você pode editar o texto antes de gerar.</p>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="gen-category">Categoria do paciente</Label>
              <Input id="gen-category" placeholder="Ex.: Dor, Inflamação, Diabetes, Polifarmácia..." value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="gen-context">Contexto clínico</Label>
              <Textarea
                id="gen-context"
                rows={5}
                placeholder="Cenário desejado: idade aproximada, comorbidades, gravidade, contexto social, problemas que o aluno deve descobrir, objetivo educacional..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
              />
            </div>
            <div>
              <Label>Quem conta a história ao aluno</Label>
              <RadioGroup value={quem} onValueChange={(v) => setQuem(v as "paciente" | "cuidador")} className="mt-1.5 grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 rounded-md border p-2.5 text-sm cursor-pointer">
                  <RadioGroupItem value="paciente" /> O próprio paciente
                </label>
                <label className="flex items-center gap-2 rounded-md border p-2.5 text-sm cursor-pointer">
                  <RadioGroupItem value="cuidador" /> Um cuidador
                </label>
              </RadioGroup>
            </div>
            <div>
              <Label>Profissões</Label>
              <div className="mt-1.5 space-y-2">
                {PROFS.map((p) => (
                  <label key={p.key} className="flex items-start gap-2 rounded-md border p-2.5 text-sm cursor-pointer">
                    <Checkbox checked={profs.includes(p.key)} onCheckedChange={(c) => toggleProf(p.key, c === true)} className="mt-0.5" />
                    <span>
                      <span className="font-medium">{p.label}</span>
                      {p.note && <span className="block text-xs text-muted-foreground">{p.note}</span>}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Cada profissão leva alguns minutos. Mantenha esta janela aberta durante a geração.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-1">
            <ul className="space-y-2">
              {steps.map((s) => (
                <li key={s.id} className="flex items-start gap-2 text-sm">
                  {icon(s.status)}
                  <span>
                    {s.label}
                    {s.detail && <span className={`block text-xs ${s.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>{s.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>

            {finished && (resumo || issues.length > 0) && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-sm">
                {resumo && <p className="font-medium">{resumo}</p>}
                {issues.length > 0 && (
                  <ul className="space-y-2">
                    {issues.map((i, idx) => (
                      <li key={idx} className="text-xs">
                        <span className={`font-semibold uppercase ${GRAV_CLS[i.gravidade] || ""}`}>{i.gravidade}</span>{" "}
                        <span className="text-muted-foreground">· {i.onde}</span>
                        <p>{i.descricao}</p>
                        {i.sugestao && <p className="text-muted-foreground">Sugestão: {i.sugestao}</p>}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground">Estes pontos ficam salvos no caso: no editor, o painel "Revisão de consistência" os mostra e você marca cada um como resolvido.</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {showForm ? (
            <>
              <Button variant="outline" onClick={() => close(false)}>Cancelar</Button>
              <Button onClick={run} disabled={!category.trim() || !context.trim()}>
                <Sparkles className="h-4 w-4 mr-2" />Gerar
              </Button>
            </>
          ) : (
            <>
              {finished && <Button variant="outline" onClick={() => close(false)}>Fechar</Button>}
              {caseId && (
                <Button onClick={() => { onOpenChange(false); onOpenEditor(caseId); reset(); }} disabled={running}>
                  Abrir no editor
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
