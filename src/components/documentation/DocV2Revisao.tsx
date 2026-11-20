import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { itensRevisao, type RespostaRevisao } from "@/lib/doc-v2-nota";
import { normalizarRespostas, resumoDocumentos, type ItemReferencia } from "@/lib/doc-v2";
import { extrasValidos } from "@/lib/doc-v2-extras";

type Estado =
  | { estado: "aguardando_minha" | "aguardando_outra" | "sem_par" | "enviada" }
  | { estado: "revisar"; extras?: string[]; alvo: { rotulo: string; caso: { titulo: string; caso_json: any }; referencia: ItemReferencia[]; respostas: any; ocorrencias?: Record<string, string> } };

async function chamar(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("doc-v2-revisao", { body });
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* mantém a mensagem */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Revisão cruzada: a dupla revisa os documentos da dupla seguinte com um checklist. Vale 20% da nota da dupla revisada. */
export default function DocV2Revisao({ accessCode, email }: { accessCode: string; email: string }) {
  const [est, setEst] = useState<Estado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ck, setCk] = useState<Record<string, RespostaRevisao>>({});
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try { setEst(await chamar({ action: "estado", access_code: accessCode, email })); setErro(null); }
    catch (e: any) { setErro(e?.message || "Não foi possível abrir a revisão."); }
  }, [accessCode, email]);
  useEffect(() => { void carregar(); }, [carregar]);

  const alvoTexto = useMemo(() => (est?.estado === "revisar" ? resumoDocumentos(normalizarRespostas(est.alvo.respostas), extrasValidos(est.extras)) : ""), [est]);

  if (erro) return <Card><CardContent className="space-y-2 py-4 text-center text-sm"><p>{erro}</p><Button size="sm" onClick={() => void carregar()}>Tentar de novo</Button></CardContent></Card>;
  if (!est || est.estado === "aguardando_minha" || est.estado === "sem_par") return null;
  if (est.estado === "aguardando_outra") {
    return <Card><CardContent className="space-y-2 py-4 text-sm"><p className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4" />A dupla que você vai revisar ainda não enviou os documentos.</p><Button size="sm" variant="outline" onClick={() => void carregar()}>Verificar de novo</Button></CardContent></Card>;
  }
  if (est.estado === "enviada") {
    return <Card><CardContent className="flex items-center gap-2 py-4 text-sm"><CheckCircle2 className="h-4 w-4 text-success" />Você já enviou a sua revisão. Obrigado.</CardContent></Card>;
  }

  if (est.estado !== "revisar") return null;
  const itens = itensRevisao(extrasValidos(est.extras));
  const pronto = itens.every((i) => ck[i.id]);
  const enviar = async () => {
    setEnviando(true);
    try {
      await chamar({ action: "enviar", access_code: accessCode, email, respostas: ck, comentario });
      setEst({ estado: "enviada" });
      toast({ title: "Revisão enviada" });
    } catch (e: any) { toast({ title: "Não foi possível enviar", description: e?.message, variant: "destructive" }); }
    finally { setEnviando(false); }
  };

  const { alvo } = est;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-base font-medium"><ClipboardCheck className="h-4 w-4" />Revisão cruzada: {alvo.rotulo}</CardTitle>
        <p className="text-xs text-muted-foreground">Leia os documentos da outra dupla e responda o checklist. Seja justo e específico: o seu comentário chega a eles, sem o seu nome, e vale 20% da nota deles.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <details className="rounded border p-2"><summary className="cursor-pointer text-sm font-medium">Caso: {alvo.caso.titulo}</summary>
          <p className="mt-2 text-xs">{alvo.caso.caso_json?.resumo}</p>
          {Object.values(alvo.ocorrencias || {}).filter(Boolean).map((o, i) => <p key={i} className="mt-2 text-xs"><b>O que aconteceu depois:</b> {o}</p>)}
          <p className="mt-2 text-xs font-medium">Conciliação validada</p>
          <ul className="list-disc pl-5 text-xs">{alvo.referencia.map((m, i) => <li key={i}>{m.medicamento}: {m.conduta}{m.frequencia ? `, ${m.frequencia}` : ""}</li>)}</ul>
        </details>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded border bg-background p-3 text-xs">{alvoTexto}</pre>
        {itens.map((i) => (
          <div key={i.id} className="space-y-1">
            <p className="text-sm">{i.texto}</p>
            <div className="flex gap-1">
              {([["sim", "Sim"], ["parcial", "Em parte"], ["nao", "Não"]] as const).map(([v, r]) => (
                <Button key={v} type="button" size="sm" variant={ck[i.id] === v ? "default" : "outline"} aria-label={`${i.texto}: ${r}`} onClick={() => setCk((c) => ({ ...c, [i.id]: v }))}>{r}</Button>
              ))}
            </div>
          </div>
        ))}
        <div className="space-y-1"><Label htmlFor="rev-com" className="text-xs">O que ficou bom e o que melhorar</Label><Textarea id="rev-com" rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)} /></div>
        <Button type="button" onClick={enviar} disabled={!pronto || enviando}>{enviando ? "Enviando..." : "Enviar revisão"}</Button>
      </CardContent>
    </Card>
  );
}
