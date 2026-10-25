import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { simpleMarkdownToHtml } from "@/lib/simple-markdown";
import type { VersaoKey, VpCaseData } from "@/lib/vp-case-schema";
import { VERSAO_LABEL } from "./defaults";
import { SelectField } from "./fields";

interface Msg {
  role: "user" | "assistant";
  content: string;
  encounter: number;
}

/**
 * Prévia de conversa: o docente testa o caso como está no editor (inclusive sem salvar).
 * Nada é gravado: não existe sessão, nota nem mensagem no banco.
 */
export function PreviewChat({ caseData, versaoKeys }: { caseData: VpCaseData; versaoKeys: VersaoKey[] }) {
  const [versao, setVersao] = useState<VersaoKey>(versaoKeys[0] || "farmaceutico");
  const [encounter, setEncounter] = useState("1");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const enc = Number(encounter);
    const userMsg: Msg = { role: "user", content: text, encounter: enc };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("virtual-patient-chat", {
        body: {
          patientId: "preview",
          messages: history,
          encounter: enc,
          profession: versao,
          previewCaseData: caseData,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setMessages([...history, { role: "assistant", content: data?.reply || "(sem resposta)", encounter: enc }]);
    } catch (e: any) {
      toast.error(e.message || "Erro na prévia.");
      setMessages(messages); // desfaz a mensagem que não foi respondida
      setInput(text);
    } finally {
      setLoading(false);
    }
  };

  const nome = caseData.nucleo.identidade.nome || "Paciente";
  const ini = nome.split(/s+/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "P";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_1fr_auto]">
        <SelectField label="Versão (profissão)" value={versao} options={versaoKeys.map((k) => ({ value: k, label: VERSAO_LABEL[k] }))} onChange={(v) => { setVersao(v as VersaoKey); setMessages([]); }} />
        <SelectField label="Encontro" value={encounter} options={[{ value: "1", label: "1º encontro" }, { value: "2", label: "2º encontro" }, { value: "3", label: "3º encontro" }]} onChange={setEncounter} />
        <Button type="button" variant="outline" onClick={() => setMessages([])} disabled={messages.length === 0}>
          <RotateCcw className="h-4 w-4" />Reiniciar conversa
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="h-[420px] space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">Cumprimente o paciente para começar.</p>
          )}
          {messages.map((m, i) => {
            const me = m.role === "user";
            return (
              <div key={i} className={`flex items-end gap-2 ${me ? "flex-row-reverse" : ""}`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-medium ${me ? "bg-highlight/20 text-foreground" : "bg-brand-soft text-brand-text"}`}>
                  {me ? "Você" : ini}
                </span>
                <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${me ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted"}`}>
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-0 text-inherit" dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(m.content) }} />
                </div>
              </div>
            );
          })}
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <div ref={bottomRef} />
        </div>
        <div className="flex gap-2 border-t bg-muted/30 p-3">
          <Textarea
            value={input}
            rows={1}
            className="min-h-[44px] max-h-32 resize-none bg-background"
            placeholder="Escreva a pergunta ao paciente…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <Button type="button" onClick={send} disabled={loading || !input.trim()}><Send className="h-4 w-4" />Enviar</Button>
        </div>
      </Card>

      <p className="text-sm text-muted-foreground">
        A prévia usa o caso <strong>como está no editor, mesmo sem salvar</strong>, e nada é gravado. Os sinais vitais e o avanço automático entre encontros não funcionam aqui: escolha o encontro manualmente.
      </p>
    </div>
  );
}
