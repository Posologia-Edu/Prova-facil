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

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Converse com o paciente como o aluno faria. A prévia usa o caso <strong>como está no editor, mesmo sem salvar</strong>, e nada é gravado.
        Os sinais vitais e o avanço automático entre encontros não funcionam aqui: escolha o encontro manualmente.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <SelectField label="Versão (profissão)" value={versao} options={versaoKeys.map((k) => ({ value: k, label: VERSAO_LABEL[k] }))} onChange={(v) => { setVersao(v as VersaoKey); setMessages([]); }} />
        <SelectField label="Encontro" value={encounter} options={[{ value: "1", label: "1º encontro" }, { value: "2", label: "2º encontro" }, { value: "3", label: "3º encontro" }]} onChange={setEncounter} />
        <Button type="button" variant="outline" onClick={() => setMessages([])} disabled={messages.length === 0}>
          <RotateCcw className="h-4 w-4 mr-2" />Recomeçar
        </Button>
      </div>

      <div className="border rounded-md h-[420px] overflow-y-auto p-3 space-y-3 bg-background">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">Cumprimente o paciente para começar.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <Card className={`max-w-[80%] p-3 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(m.content) }} />
            </Card>
          </div>
        ))}
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <Textarea
          value={input}
          rows={1}
          className="min-h-[44px] max-h-32 resize-none"
          placeholder="Digite como o aluno..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <Button type="button" size="icon" onClick={send} disabled={loading || !input.trim()}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
