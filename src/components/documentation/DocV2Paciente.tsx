import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle, Send, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ITENS_CHECKLIST, MAX_TURNOS_PACIENTE, type RespostaChecklist } from "@/lib/doc-v2-paciente";

type Fala = { role: "aluno" | "paciente"; texto: string };
type Estado = { papel: "conduz" | "observa" | "ambos"; transcript: Fala[]; turnos_restantes: number; encerrada: boolean; checklist_enviado: boolean; concluida: boolean };
type Props = { accessCode: string; email: string; nomePaciente: string; onConcluida: () => void };

async function chamar(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("doc-v2-paciente", { body });
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* mantém a mensagem */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/**
 * Aconselhamento ao paciente virtual, depois do envio dos documentos. Quem conduz (pessoa A, ou a individual) conversa com o paciente;
 * quem observa (pessoa B) acompanha a conversa e preenche o checklist. A conversa fica guardada no servidor.
 */
export default function DocV2Paciente({ accessCode, email, nomePaciente, onConcluida }: Props) {
  const [est, setEst] = useState<Estado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [texto, setTexto] = useState("");
  const [ck, setCk] = useState<Record<string, RespostaChecklist>>({});
  const [comentario, setComentario] = useState("");
  const fim = useRef<HTMLDivElement>(null);
  const avisouConclusao = useRef(false);

  const carregar = useCallback(async () => {
    try {
      const r: Estado = await chamar({ action: "estado", access_code: accessCode, email });
      setEst(r); setErro(null);
    } catch (e: any) { setErro(e?.message || "Não foi possível abrir o aconselhamento."); }
  }, [accessCode, email]);
  useEffect(() => { void carregar(); }, [carregar]);
  // Quem observa acompanha a conversa de outro aparelho: atualiza sozinho enquanto não terminar.
  useEffect(() => {
    if (!est || est.concluida || est.papel === "conduz") return;
    const t = setInterval(() => { void carregar(); }, 6000);
    return () => clearInterval(t);
  }, [est, carregar]);
  useEffect(() => { fim.current?.scrollIntoView({ block: "nearest" }); }, [est?.transcript.length, enviando]);
  useEffect(() => {
    if (est?.concluida && !avisouConclusao.current) { avisouConclusao.current = true; onConcluida(); }
  }, [est?.concluida, onConcluida]);

  if (erro) return <Card><CardContent className="space-y-3 py-6 text-center text-sm"><p>{erro}</p><Button onClick={() => void carregar()}>Tentar de novo</Button></CardContent></Card>;
  if (!est) return <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Abrindo o aconselhamento...</CardContent></Card>;

  const conduz = est.papel !== "observa";
  const observa = est.papel !== "conduz";

  const enviar = async () => {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setEst((e) => (e ? { ...e, transcript: [...e.transcript, { role: "aluno", texto: t }] } : e));
    setTexto("");
    try {
      const r = await chamar({ action: "mensagem", access_code: accessCode, email, mensagem: t });
      setEst((e) => (e ? { ...e, transcript: [...e.transcript, { role: "paciente", texto: r.resposta }], turnos_restantes: r.turnos_restantes, encerrada: !!r.encerrada, concluida: !!r.concluida } : e));
    } catch (e: any) {
      // A fala não foi aceita: tira da tela e devolve o texto para tentar de novo.
      setEst((x) => (x ? { ...x, transcript: x.transcript.slice(0, -1) } : x));
      setTexto(t);
      toast({ title: "O paciente não respondeu", description: e?.message, variant: "destructive" });
    } finally { setEnviando(false); }
  };

  const encerrar = async () => {
    if (!window.confirm("Encerrar a conversa com o paciente? Não será possível continuar.")) return;
    try {
      const r = await chamar({ action: "encerrar", access_code: accessCode, email });
      setEst((e) => (e ? { ...e, encerrada: true, concluida: !!r.concluida } : e));
    } catch (e: any) { toast({ title: "Não foi possível encerrar", description: e?.message, variant: "destructive" }); }
  };

  const enviarChecklist = async () => {
    try {
      const r = await chamar({ action: "checklist", access_code: accessCode, email, respostas: ck, comentario });
      setEst((e) => (e ? { ...e, checklist_enviado: true, concluida: !!r.concluida } : e));
      toast({ title: "Checklist enviado" });
    } catch (e: any) { toast({ title: "Não foi possível enviar", description: e?.message, variant: "destructive" }); }
  };

  if (est.concluida) {
    return <Card><CardContent className="py-8 text-center"><CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-success" /><p className="font-medium">Aconselhamento concluído.</p><p className="text-sm text-muted-foreground">A devolutiva aparece aqui quando o professor liberar. Volte a entrar com o mesmo PIN e e-mail.</p></CardContent></Card>;
  }

  const checklistPronto = ITENS_CHECKLIST.every((i) => ck[i.id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-base font-medium"><MessageCircle className="h-4 w-4" />Orientação ao paciente: {nomePaciente}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {est.papel === "ambos" ? "Você conduz a conversa e, depois, preenche o checklist." : conduz ? "Você conduz a conversa. Quem observa acompanha e preenche o checklist." : "Você observa a conversa de quem conduz e preenche o checklist."}
          {" "}O paciente só entende o que você explicar bem. Você tem até {MAX_TURNOS_PACIENTE} mensagens e use o seu cartão como apoio.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-80 min-h-24 space-y-2 overflow-y-auto rounded-md border bg-background p-3 text-sm" aria-live="polite">
          {est.transcript.length === 0 && <p className="text-muted-foreground">{conduz ? "O paciente está à sua frente. Comece a conversa." : "A conversa ainda não começou."}</p>}
          {est.transcript.map((f, i) => (
            <div key={i} className={f.role === "aluno" ? "text-right" : ""}>
              <span className="mb-0.5 block text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">{f.role === "aluno" ? "Farmacêutico" : nomePaciente}</span>
              <p className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-1.5 text-left ${f.role === "aluno" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{f.texto}</p>
            </div>
          ))}
          {enviando && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />O paciente está respondendo...</p>}
          <div ref={fim} />
        </div>

        {conduz && !est.encerrada && (
          <div className="space-y-2">
            <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} disabled={enviando} aria-label="Sua fala ao paciente" placeholder="Fale com o paciente..." />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{est.turnos_restantes} mensagem(ns) restante(s)</span>
              <div className="flex gap-2">
                {est.transcript.length > 0 && <Button type="button" variant="ghost" size="sm" onClick={encerrar}><Square className="mr-1 h-3.5 w-3.5" />Encerrar a conversa</Button>}
                <Button type="button" onClick={enviar} disabled={enviando || !texto.trim()}><Send className="mr-2 h-4 w-4" />Falar</Button>
              </div>
            </div>
          </div>
        )}
        {est.encerrada && <p className="text-sm text-muted-foreground">A conversa foi encerrada.{observa && !est.checklist_enviado ? " Preencha o checklist abaixo." : ""}{conduz && !observa && !est.concluida ? " Falta o checklist do observador." : ""}</p>}

        {observa && !est.checklist_enviado && (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <p className="text-sm font-medium">Checklist de quem observa</p>
            {ITENS_CHECKLIST.map((i) => (
              <div key={i.id} className="space-y-1">
                <p className="text-sm">{i.texto}</p>
                <div className="flex gap-1">
                  {([["sim", "Sim"], ["parcial", "Em parte"], ["nao", "Não"]] as const).map(([v, r]) => (
                    <Button key={v} type="button" size="sm" variant={ck[i.id] === v ? "default" : "outline"} aria-label={`${i.texto}: ${r}`} onClick={() => setCk((c) => ({ ...c, [i.id]: v }))}>{r}</Button>
                  ))}
                </div>
              </div>
            ))}
            <div className="space-y-1"><Label htmlFor="ck-com" className="text-xs">O que foi bem e o que melhorar (opcional)</Label><Textarea id="ck-com" rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)} /></div>
            <Button type="button" onClick={enviarChecklist} disabled={!checklistPronto}>Enviar checklist</Button>
          </div>
        )}
        {observa && est.checklist_enviado && !est.concluida && <p className="text-sm text-muted-foreground">Checklist enviado. A atividade termina quando a conversa for encerrada.</p>}
      </CardContent>
    </Card>
  );
}
