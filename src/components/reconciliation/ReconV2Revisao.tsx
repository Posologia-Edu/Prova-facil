import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import FormAnswersView from "@/components/forms/FormAnswersView";
import FormRenderer from "@/components/forms/FormRenderer";
import type { FormField } from "@/components/forms/types";
import { ROTULO_FONTE, ROTULO_TRANSICAO, type CasoV2, type ItemPrescricao } from "@/lib/recon-v2";

type Props = { accessCode: string; email: string };
type Estado = {
  estado: "aguardando_minha" | "sem_par" | "aguardando_outra" | "revisar" | "enviada";
  alvo?: { rotulo: string; caso: { titulo: string; caso_json: CasoV2 }; prescricao: ItemPrescricao[]; campos: FormField[]; respostas: Record<string, any> };
  formulario_revisao: { id: string; campos: FormField[] } | null;
  recebida: Record<string, any> | null;
  minha_revisao?: Record<string, any>;
};

async function chamar(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("recon-v2-revisao", { body });
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* mantém a mensagem */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Revisão cruzada: depois de enviar a própria reconciliação, a dupla confere a de outra dupla (anel) com um checklist. */
export default function ReconV2Revisao({ accessCode, email }: Props) {
  const [est, setEst] = useState<Estado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setEst(await chamar({ action: "estado", access_code: accessCode, email }));
    } catch (e: any) {
      setErro(e?.message || "Não foi possível carregar a revisão.");
    } finally {
      setCarregando(false);
    }
  }, [accessCode, email]);
  useEffect(() => { void carregar(); }, [carregar]);

  const enviar = async () => {
    if (!window.confirm("Enviar a revisão? Depois do envio não será possível editar.")) return;
    setEnviando(true);
    try {
      await chamar({ action: "enviar", access_code: accessCode, email, answers: respostas });
      toast({ title: "Revisão enviada" });
      await carregar();
    } catch (e: any) {
      toast({ title: "Não foi possível enviar a revisão", description: e?.message, variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  };

  const recebida = est?.recebida && est.formulario_revisao ? (
    <Card className="text-left">
      <CardHeader><CardTitle className="font-heading text-lg font-medium">Revisão que a sua dupla recebeu</CardTitle>
        <p className="text-sm text-muted-foreground">Feita por outra dupla da turma, de forma anônima. Conta 20% da sua nota.</p></CardHeader>
      <CardContent><FormAnswersView fields={est.formulario_revisao.campos} answers={est.recebida!} /></CardContent>
    </Card>
  ) : null;

  const atualizar = (
    <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={carregando}><RefreshCw className="mr-2 h-3.5 w-3.5" />Verificar de novo</Button>
  );

  if (carregando && !est) return <p className="text-center text-sm text-muted-foreground">Carregando a revisão cruzada...</p>;
  if (erro || !est) {
    return <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground"><p>{erro || "Não foi possível carregar a revisão."}</p>{atualizar}</div>;
  }

  if (est.estado === "aguardando_outra") {
    return (
      <>
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4 text-center text-sm text-muted-foreground">
          <p>Na revisão cruzada, você confere a reconciliação de outra dupla. Ela ainda não enviou. Volte aqui daqui a pouco.</p>{atualizar}
        </div>
        {recebida}
      </>
    );
  }
  if (est.estado === "sem_par" || est.estado === "aguardando_minha") {
    return recebida;
  }
  if (est.estado === "enviada") {
    return (
      <>
        <div className="rounded-lg border bg-card p-4 text-center text-sm text-muted-foreground">Sua revisão cruzada foi enviada. Obrigado!</div>
        {recebida}
      </>
    );
  }

  // revisar
  const a = est.alvo!;
  const caso = a.caso.caso_json;
  return (
    <div className="space-y-4 text-left">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg font-medium">Revisão cruzada: {a.rotulo}</CardTitle>
          <p className="text-sm text-muted-foreground">Confira a reconciliação desta dupla e responda o checklist. Seja específico: a dupla lê o seu comentário.</p>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader><CardTitle className="text-base">O caso e o trabalho da dupla</CardTitle></CardHeader>
          <CardContent className="max-h-[70vh] space-y-4 overflow-y-auto">
            <div>
              <h3 className="font-heading text-base font-medium">{caso.titulo}</h3>
              <Badge variant="outline" className="mt-1">{ROTULO_TRANSICAO[caso.transicao]}</Badge>
              <p className="mt-1 text-sm text-muted-foreground">{caso.resumo}</p>
              <p className="mt-1 text-sm"><b>{caso.paciente.nome}</b>, {caso.paciente.idade} anos, {caso.paciente.peso_kg} kg{caso.paciente.creatinina_mg_dl ? `, creatinina ${caso.paciente.creatinina_mg_dl} mg/dL` : ""}. Alergias registradas: {caso.paciente.alergias_registradas || "nenhuma"}.</p>
            </div>
            <details className="rounded-lg border">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Fontes do dossiê ({caso.fontes.length})</summary>
              <div className="space-y-2 px-3 pb-3 text-sm">
                {caso.fontes.map((f) => (
                  <div key={f.id}><p className="font-medium"><span className="mr-2 font-mono text-[0.7rem] uppercase text-primary">{ROTULO_FONTE[f.tipo]}</span>{f.titulo}</p><p className="whitespace-pre-wrap text-muted-foreground">{f.texto}</p></div>
                ))}
              </div>
            </details>
            <details className="rounded-lg border">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Prescrição do serviço</summary>
              <ul className="list-disc space-y-1 px-3 pb-3 pl-8 text-sm">
                {a.prescricao.map((m, i) => <li key={i}>{m.medicamento} {m.dose}, {m.via}, {m.frequencia}{m.observacao ? ` (${m.observacao})` : ""}</li>)}
              </ul>
            </details>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Reconciliação da dupla</p>
              <FormAnswersView fields={a.campos} answers={a.respostas} />
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader><CardTitle className="text-base">Seu checklist</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {est.formulario_revisao ? (
              <FormRenderer fields={est.formulario_revisao.campos} answers={respostas} onChange={setRespostas} idPrefix="reconv2rev-" />
            ) : (
              <p className="text-sm text-muted-foreground">A sala não tem o checklist da revisão. Avise o professor.</p>
            )}
            <Button type="button" size="lg" className="w-full" onClick={enviar} disabled={enviando || !est.formulario_revisao}>
              <Send className="mr-2 h-4 w-4" />{enviando ? "Enviando..." : "Enviar revisão"}
            </Button>
          </CardContent>
        </Card>
      </div>
      {recebida}
    </div>
  );
}
