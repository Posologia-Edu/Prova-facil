import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import FormAnswersView, { formatAnswerText } from "@/components/forms/FormAnswersView";
import FormRenderer from "@/components/forms/FormRenderer";
import { NA_ANSWER, computeFormScore, type FormField } from "@/components/forms/types";
import { isPatientRoteiro, roteiroToText } from "@/lib/vp-patient-roteiro";
import { Sparkles } from "lucide-react";
import { REGISTRO_CRITERIOS, notaDoRegistro, type AvaliacaoRegistro } from "@/lib/anamnese-registro";
import { ObserverScriptSummary } from "@/components/simulation/PatientScriptView";

type Props = {
  roomId: string;
  response: { id: string; score?: number | null; answers_json?: any };
  anamneseFields: FormField[];
  caseItem?: { title?: string; script: string; roteiro?: unknown };
  onSaved: () => void;
};

/** Pontuação do registro escrito de uma rodada: o professor lê o registro e os pontos-chave do caso e pontua os 7 critérios. */
export function RegistroScoring({ roomId, response, anamneseFields, caseItem, onSaved }: Props) {
  const salvo = response.answers_json?._avaliacao_registro as AvaliacaoRegistro | undefined;
  const [respostas, setRespostas] = useState<Record<string, any>>(salvo?.respostas || {});
  const [comentario, setComentario] = useState(salvo?.comentario || "");
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [sugestoes, setSugestoes] = useState<Record<string, string>>({});
  const [usouIa, setUsouIa] = useState(salvo?.origem === "ia");

  const nota = computeFormScore(REGISTRO_CRITERIOS, respostas);
  const notaSalva = notaDoRegistro(response);

  const pontuarComIa = async () => {
    setAiLoading(true);
    try {
      const registroTexto = anamneseFields
        .filter((f) => f.type !== "section_header" && f.type !== "image_block" && f.type !== "video_block")
        .map((f) => f.label + ": " + formatAnswerText(f, response.answers_json?.[f.id]))
        .join("\n");
      const roteiroTexto = caseItem ? (isPatientRoteiro(caseItem.roteiro) ? roteiroToText(caseItem.roteiro) : caseItem.script) : "";
      const { data, error } = await supabase.functions.invoke("grade-anamnesis-record", {
        body: {
          room_id: roomId,
          roteiro_texto: roteiroTexto,
          registro_texto: registroTexto,
          criterios: REGISTRO_CRITERIOS.map((c) => ({ id: c.id, criterio: c.label, peso: c.max_score, ancoras: c.description, allow_na: !!c.allow_na })),
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Falha ao chamar a IA");
      const novas: Record<string, any> = {};
      const just: Record<string, string> = {};
      for (const [id, v] of Object.entries(data.criterios || {}) as [string, { nota: number | null; justificativa: string }][]) {
        novas[id] = v.nota === null ? NA_ANSWER : v.nota;
        if (v.justificativa) just[id] = v.justificativa;
      }
      setRespostas((atual) => ({ ...atual, ...novas }));
      setSugestoes(just);
      if (data.comentario) setComentario(data.comentario);
      setUsouIa(true);
      toast({ title: "Sugestão da IA aplicada", description: "Revise os critérios e confirme a pontuação." });
    } catch (e) {
      toast({ title: "Não foi possível pontuar com a IA", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const confirmar = async () => {
    setSaving(true);
    const avaliacao: AvaliacaoRegistro = {
      respostas,
      comentario: comentario.trim() || undefined,
      confirmado: true,
      confirmado_em: new Date().toISOString(),
      origem: usouIa ? "ia" : "professor",
    };
    const { error } = await supabase
      .from("simulation_responses")
      .update({ score: nota, answers_json: { ...(response.answers_json || {}), _avaliacao_registro: avaliacao } })
      .eq("id", response.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar a pontuação", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Pontuação do registro salva" });
    onSaved();
  };

  return (
    <div className="space-y-4 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Pontuação do registro escrito (vale 30% da nota da rodada)</p>
        {notaSalva != null ? (
          <StatusBadge tone="ok">Pontuado: {notaSalva.toFixed(1)}/10</StatusBadge>
        ) : (
          <StatusBadge tone="warn">Registro ainda não pontuado</StatusBadge>
        )}
      </div>

      {caseItem && <ObserverScriptSummary caseItem={caseItem} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Registro do aluno</p>
          <FormAnswersView fields={anamneseFields} answers={response.answers_json || {}} />
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Critérios</p>
            <Button size="sm" variant="outline" onClick={pontuarComIa} disabled={aiLoading} className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />{aiLoading ? "Pontuando..." : "Pontuar com IA"}
            </Button>
          </div>
          <FormRenderer fields={REGISTRO_CRITERIOS} answers={respostas} onChange={setRespostas} showScores idPrefix={`rg-${response.id}-`} />
          {Object.keys(sugestoes).length > 0 && (
            <div className="space-y-1 rounded-md bg-sunken p-3 text-xs">
              <p className="font-medium">Justificativas da IA (sugestão, você decide):</p>
              {REGISTRO_CRITERIOS.filter((c) => sugestoes[c.id]).map((c) => (
                <p key={c.id}><span className="font-medium">{c.label.split("?")[0].slice(0, 70)}…</span> {sugestoes[c.id]}</p>
              ))}
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Comentário sobre o registro (opcional)</Label>
            <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-sm">Nota do registro: {nota.toFixed(1)}/10</span>
            <Button size="sm" onClick={confirmar} disabled={saving}>{notaSalva != null ? "Atualizar pontuação" : "Confirmar pontuação"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
