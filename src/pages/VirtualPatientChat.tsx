import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, ChevronRight, ClipboardCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { simpleMarkdownToHtml } from "@/lib/simple-markdown";
import { VirtualPatientMAI } from "@/components/VirtualPatientMAI";

interface Message {
  role: "user" | "assistant";
  content: string;
  encounter: number;
}

const PATIENT_NAMES: Record<string, { name: string; age: number; module: string }> = {
  pain_helena: { name: "Dona Helena", age: 67, module: "Dor" },
  pain_luciana: { name: "Luciana", age: 42, module: "Dor" },
  pain_rogerio: { name: "Rogério", age: 58, module: "Dor" },
  pain_pedro: { name: "Pedro", age: 65, module: "Dor" },
  pain_ana: { name: "Ana", age: 36, module: "Dor" },
  inflammation_maria: { name: "Dona Maria", age: 72, module: "Inflamação" },
  inflammation_antonio: { name: "Seu Antônio", age: 66, module: "Inflamação" },
  inflammation_renata: { name: "Renata", age: 39, module: "Inflamação" },
  inflammation_wilson: { name: "Seu Wilson", age: 57, module: "Inflamação" },
  inflammation_jose: { name: "José", age: 57, module: "Inflamação" },
};

const ENCOUNTER_LABELS = ["1º Encontro – Anamnese Inicial", "2º Encontro – Avaliação de Eficácia/Segurança", "3º Encontro – Ajustes Finais + MAI"];

export default function VirtualPatientChat() {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session") || "";
  const isEphemeral = !sessionId; // sem session => modo exploração (admin/teste)
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [encounter, setEncounter] = useState(1);
  const [showMAI, setShowMAI] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [customPatient, setCustomPatient] = useState<{ name: string; age: number; module: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Detecta se é paciente customizado (UUID)
  const isCustom = !!patientId && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(patientId);
  const apiPatientId = isCustom ? `custom:${patientId}` : patientId;
  const patient = PATIENT_NAMES[patientId || ""] || customPatient;

  useEffect(() => {
    if (isCustom && patientId) {
      supabase.from("custom_virtual_patients")
        .select("name, age, category")
        .eq("id", patientId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setCustomPatient({ name: data.name, age: data.age, module: data.category });
        });
    }
  }, [isCustom, patientId]);


  useEffect(() => {
    if (sessionId) loadSession();
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSession = async () => {
    const { data: session } = await supabase
      .from("virtual_patient_sessions")
      .select("current_encounter, status")
      .eq("id", sessionId)
      .single();

    if (session) {
      setEncounter(session.current_encounter);
      if (session.status === "completed") setSessionCompleted(true);
    }

    const { data: msgs } = await supabase
      .from("virtual_patient_messages")
      .select("role, content, encounter")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (msgs) setMessages(msgs as Message[]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input.trim(), encounter };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Persistir somente quando há sessão real (fluxo das salas virtuais)
    if (!isEphemeral) {
      await supabase.from("virtual_patient_messages").insert({
        session_id: sessionId,
        encounter,
        role: "user",
        content: userMsg.content,
      });
    }

    try {
      // Build messages for AI (full history)
      const aiMessages = messages
        .concat(userMsg)
        .map(m => ({ role: m.role, content: m.content, encounter: m.encounter }));

      const response = await supabase.functions.invoke("virtual-patient-chat", {
        body: { patientId: apiPatientId, messages: aiMessages, encounter, sessionId: isEphemeral ? undefined : sessionId },
      });

      if (response.error) throw new Error(response.error.message);

      const reply = response.data?.reply || "Desculpe, não consegui responder.";
      const assistantMsg: Message = { role: "assistant", content: reply, encounter };
      setMessages(prev => [...prev, assistantMsg]);

      if (!isEphemeral) {
        await supabase.from("virtual_patient_messages").insert({
          session_id: sessionId,
          encounter,
          role: "assistant",
          content: reply,
        });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao comunicar com o paciente virtual.");
    } finally {
      setLoading(false);
    }
  };

  const advanceEncounter = async () => {
    if (encounter >= 3) return;
    const next = encounter + 1;
    setEncounter(next);

    if (!isEphemeral) {
      await supabase
        .from("virtual_patient_sessions")
        .update({ current_encounter: next })
        .eq("id", sessionId);
    }

    const systemNote: Message = {
      role: "assistant",
      content: `---\n\n**📋 Transição para o ${ENCOUNTER_LABELS[next - 1]}**\n\nO paciente retorna para uma nova consulta. Continue a conversa.\n\n---`,
      encounter: next,
    };
    setMessages(prev => [...prev, systemNote]);

    if (!isEphemeral) {
      await supabase.from("virtual_patient_messages").insert({
        session_id: sessionId,
        encounter: next,
        role: "assistant",
        content: systemNote.content,
      });
    }

    toast.success(`Avançou para o ${next}º encontro`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!patient) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Paciente não encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/virtual-patients")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Cabeçalho */}
      <header className="flex flex-shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b bg-card px-4 py-3 lg:px-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/virtual-patients")} aria-label="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft font-heading text-base font-medium text-brand-text" aria-hidden>
            {initials(patient.name)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-heading text-lg font-medium leading-tight">{patient.name}, {patient.age} anos</h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <StatusBadge tone="neutral">{patient.module}</StatusBadge>
              <StatusBadge tone="brand">{ENCOUNTER_LABELS[encounter - 1]}</StatusBadge>
              {isEphemeral && <StatusBadge tone="warn" dot>Modo exploração — não salvo</StatusBadge>}
              {sessionCompleted && <StatusBadge tone="ok" dot>Concluído</StatusBadge>}
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {encounter < 3 && !sessionCompleted && (
            <Button variant="outline" size="sm" onClick={advanceEncounter}>
              Avançar encontro <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {encounter === 3 && !sessionCompleted && !isEphemeral && (
            <Button size="sm" onClick={() => setShowMAI(true)}>
              <ClipboardCheck className="h-4 w-4" /> Preencher MAI
            </Button>
          )}
        </div>
      </header>

      {/* Etapas dos encontros */}
      <div className="flex flex-shrink-0 gap-1.5 border-b bg-card/60 px-4 py-2 lg:px-6" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span key={n} className={`h-1.5 flex-1 rounded-full ${n < encounter || sessionCompleted ? "bg-primary" : n === encounter ? "bg-highlight" : "bg-muted"}`} />
        ))}
      </div>

      {/* Mensagens */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4 lg:px-6">
        {messages.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <p className="mb-2 font-heading text-xl font-medium text-foreground">Inicie o atendimento</p>
            <p className="text-sm">Cumprimente o paciente e comece a anamnese.</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const me = msg.role === "user";
          return (
            <div key={i} className={`flex items-end gap-2 ${me ? "flex-row-reverse" : ""}`}>
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-medium ${me ? "bg-highlight/20 text-foreground" : "bg-brand-soft text-brand-text"}`} aria-hidden>
                {me ? "Você" : initials(patient.name)}
              </span>
              <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${me ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted"}`}>
                <div className="prose prose-sm max-w-none text-inherit dark:prose-invert prose-p:my-1 first:prose-p:mt-0 last:prose-p:mb-0" dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(msg.content) }} />
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-end gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-medium text-brand-text" aria-hidden>{initials(patient.name)}</span>
            <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5"><Loader2 className="h-4 w-4 animate-spin" /></div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Campo de mensagem */}
      {!sessionCompleted && (
        <div className="flex flex-shrink-0 gap-2 border-t bg-card px-4 py-3 lg:px-6">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite a sua pergunta…"
            className="max-h-32 min-h-[44px] resize-none"
            rows={1}
          />
          <Button onClick={sendMessage} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />Enviar
          </Button>
        </div>
      )}

      <VirtualPatientMAI
        open={showMAI}
        onOpenChange={setShowMAI}
        sessionId={sessionId}
        onComplete={() => {
          setShowMAI(false);
          setSessionCompleted(true);
        }}
      />
    </div>
  );
}
