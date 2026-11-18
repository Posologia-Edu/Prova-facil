import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, PhoneCall, PhoneOff, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { MAX_TURNOS_PRESCRITOR } from "@/lib/recon-v2";

type Fala = { role: "aluno" | "prescritor"; texto: string };
type Props = { accessCode: string; email: string; sbarTexto: string; podeLigar: boolean };

async function chamar(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("recon-v2-prescritor", { body });
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* mantém a mensagem */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/**
 * Ligação para o prescritor virtual, no fim da etapa 4 (opcional). A IA faz o médico que recebeu o SBAR e decide pelo argumento.
 * A conversa fica guardada no servidor, então recarregar a página não perde nada.
 */
export default function ReconV2Prescritor({ accessCode, email, sbarTexto, podeLigar }: Props) {
  const [falas, setFalas] = useState<Fala[]>([]);
  const [restantes, setRestantes] = useState(MAX_TURNOS_PRESCRITOR);
  const [encerrada, setEncerrada] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [texto, setTexto] = useState("");
  const fim = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    if (!podeLigar) { setCarregando(false); return; }
    try {
      const r = await chamar({ action: "estado", access_code: accessCode, email });
      setFalas(r.transcript || []);
      setRestantes(r.turnos_restantes);
      setEncerrada(!!r.encerrada);
    } catch (e) {
      console.error("prescritor", e);
    } finally {
      setCarregando(false);
    }
  }, [accessCode, email, podeLigar]);
  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { fim.current?.scrollIntoView({ block: "nearest" }); }, [falas.length, enviando]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setFalas((l) => [...l, { role: "aluno", texto: t }]);
    setTexto("");
    try {
      const r = await chamar({ action: "mensagem", access_code: accessCode, email, mensagem: t, sbar: sbarTexto });
      setFalas((l) => [...l, { role: "prescritor", texto: r.resposta }]);
      setRestantes(r.turnos_restantes);
      setEncerrada(!!r.encerrada);
    } catch (e: any) {
      // A fala do aluno não foi aceita: tira da tela e devolve o texto para ele tentar de novo.
      setFalas((l) => l.slice(0, -1));
      setTexto(t);
      toast({ title: "A ligação não completou", description: e?.message, variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  };

  const encerrar = async () => {
    if (!window.confirm("Desligar o telefone? Você não poderá ligar de novo.")) return;
    try {
      const r = await chamar({ action: "encerrar", access_code: accessCode, email });
      setEncerrada(!!r.encerrada);
    } catch (e: any) {
      toast({ title: "Não foi possível encerrar", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium"><PhoneCall className="h-4 w-4" />Ligar para o prescritor (opcional)</p>
        {falas.length > 0 && !encerrada && <span className="text-xs text-muted-foreground">{restantes} mensagem(ns) restante(s)</span>}
      </div>

      {!podeLigar ? (
        <p className="text-sm text-muted-foreground">Envie a BPMH antes. Depois, escreva o SBAR e ligue para o prescritor para negociar as mudanças.</p>
      ) : carregando ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <>
          {falas.length === 0 && !encerrada && (
            <p className="text-sm text-muted-foreground">O prescritor virtual recebe o seu SBAR e responde como um médico: ele resiste e só cede a argumento com dado do caso, risco e proposta específica. Você tem até {MAX_TURNOS_PRESCRITOR} mensagens. A conversa fica registrada e entra na correção.</p>
          )}
          {falas.length > 0 && (
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border bg-background p-3 text-sm" aria-live="polite">
              {falas.map((f, i) => (
                <div key={i} className={f.role === "aluno" ? "text-right" : ""}>
                  <span className="mb-0.5 block text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">{f.role === "aluno" ? "Você" : "Prescritor"}</span>
                  <p className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-1.5 text-left ${f.role === "aluno" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{f.texto}</p>
                </div>
              ))}
              {enviando && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />O prescritor está respondendo...</p>}
              <div ref={fim} />
            </div>
          )}
          {encerrada ? (
            <p className="text-sm text-muted-foreground">{falas.length ? "A ligação foi encerrada." : "Você optou por não ligar."} Quando estiver pronto, envie a reconciliação.</p>
          ) : (
            <div className="space-y-2">
              <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} disabled={enviando} aria-label="Sua fala ao prescritor"
                placeholder={falas.length === 0 ? "Comece pelo SBAR: situação, o que você encontrou, o risco e o que propõe." : "Responda ao prescritor..."} />
              <div className="flex flex-wrap justify-between gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={encerrar}><PhoneOff className="mr-2 h-4 w-4" />{falas.length ? "Desligar" : "Não vou ligar"}</Button>
                <Button type="button" onClick={enviar} disabled={enviando || !texto.trim()}><Send className="mr-2 h-4 w-4" />{falas.length === 0 ? "Ligar e falar" : "Responder"}</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
