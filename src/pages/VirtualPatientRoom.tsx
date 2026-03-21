import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, ChevronRight, ClipboardCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
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

const ENCOUNTER_LABELS = [
  "1º Encontro – Anamnese Inicial",
  "2º Encontro – Avaliação de Eficácia/Segurança",
  "3º Encontro – Ajustes Finais + MAI",
];

export default function VirtualPatientRoom() {
  const { cvpId } = useParams<{ cvpId: string }>();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [encounter, setEncounter] = useState(1);
  const [showMAI, setShowMAI] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentName, setStudentName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const patient = PATIENT_NAMES[patientId] || null;

  useEffect(() => {
    initRoom();
  }, [cvpId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initRoom = async () => {
    if (!cvpId) return;
    setInitialLoading(true);

    // Get student info from sessionStorage
    const email = sessionStorage.getItem("vp_email") || "";
    const name = sessionStorage.getItem("vp_student_name") || "";
    setStudentEmail(email);
    setStudentName(name);

    if (!email) {
      toast.error("Sessão expirada. Faça login novamente.");
      navigate("/student/auth");
      return;
    }

    // Get the class_virtual_patient info
    const { data: cvp, error: cvpError } = await supabase
      .from("class_virtual_patients")
      .select("id, patient_id, status")
      .eq("id", cvpId)
      .single();

    if (cvpError || !cvp) {
      toast.error("Sala não encontrada.");
      navigate("/student/auth");
      return;
    }

    setPatientId(cvp.patient_id);

    // Find or create session for this student + class_virtual_patient
    const { data: existingSession } = await supabase
      .from("virtual_patient_sessions")
      .select("id, current_encounter, status")
      .eq("class_virtual_patient_id", cvpId)
      .eq("student_email", email.toLowerCase())
      .maybeSingle();

    let sid: string;

    if (existingSession) {
      sid = existingSession.id;
      setEncounter(existingSession.current_encounter);
      if (existingSession.status === "completed") setSessionCompleted(true);
    } else {
      const { data: newSession, error: insertError } = await supabase
        .from("virtual_patient_sessions")
        .insert({
          patient_id: cvp.patient_id,
          module: cvp.patient_id.startsWith("inflammation") ? "inflammation" : "pain",
          class_virtual_patient_id: cvpId,
          student_email: email.toLowerCase(),
          student_name: name,
        })
        .select("id")
        .single();

      if (insertError || !newSession) {
        toast.error("Erro ao criar sessão.");
        console.error(insertError);
        setInitialLoading(false);
        return;
      }
      sid = newSession.id;
    }

    setSessionId(sid);

    // Load messages
    const { data: msgs } = await supabase
      .from("virtual_patient_messages")
      .select("role, content, encounter")
      .eq("session_id", sid)
      .order("created_at", { ascending: true });

    if (msgs) setMessages(msgs as Message[]);
    setInitialLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !sessionId) return;

    const userMsg: Message = { role: "user", content: input.trim(), encounter };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    await supabase.from("virtual_patient_messages").insert({
      session_id: sessionId,
      encounter,
      role: "user",
      content: userMsg.content,
    });

    try {
      const aiMessages = messages.concat(userMsg).map((m) => ({ role: m.role, content: m.content }));

      const response = await supabase.functions.invoke("virtual-patient-chat", {
        body: { patientId, messages: aiMessages, encounter },
      });

      if (response.error) throw new Error(response.error.message);

      const reply = response.data?.reply || "Desculpe, não consegui responder.";
      const assistantMsg: Message = { role: "assistant", content: reply, encounter };
      setMessages((prev) => [...prev, assistantMsg]);

      await supabase.from("virtual_patient_messages").insert({
        session_id: sessionId,
        encounter,
        role: "assistant",
        content: reply,
      });
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

    await supabase
      .from("virtual_patient_sessions")
      .update({ current_encounter: next })
      .eq("id", sessionId);

    const systemNote: Message = {
      role: "assistant",
      content: `---\n\n**📋 Transição para o ${ENCOUNTER_LABELS[next - 1]}**\n\nO paciente retorna para uma nova consulta. Continue a conversa.\n\n---`,
      encounter: next,
    };
    setMessages((prev) => [...prev, systemNote]);

    await supabase.from("virtual_patient_messages").insert({
      session_id: sessionId,
      encounter: next,
      role: "assistant",
      content: systemNote.content,
    });

    toast.success(`Avançou para o ${next}º encontro`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleMAIComplete = async () => {
    setShowMAI(false);
    setSessionCompleted(true);

    // Trigger grading
    try {
      await supabase.functions.invoke("grade-virtual-patient", {
        body: { session_id: sessionId, class_virtual_patient_id: cvpId },
      });
    } catch (err) {
      console.warn("Auto-grading failed:", err);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Paciente não encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/student/auth")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between flex-shrink-0 bg-background">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="font-semibold">
              {patient.name}, {patient.age} anos
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{patient.module}</Badge>
              <Badge variant="secondary" className="text-xs">{ENCOUNTER_LABELS[encounter - 1]}</Badge>
            </div>
            {studentName && (
              <p className="text-xs text-muted-foreground mt-1">Estudante: {studentName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {encounter < 3 && !sessionCompleted && (
            <Button variant="outline" size="sm" onClick={advanceEncounter}>
              Avançar Encontro <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {encounter === 3 && !sessionCompleted && (
            <Button size="sm" onClick={() => setShowMAI(true)}>
              <ClipboardCheck className="h-4 w-4 mr-1" /> Preencher MAI
            </Button>
          )}
          {sessionCompleted && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Concluído
            </Badge>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <p className="text-lg font-medium mb-2">Inicie o atendimento</p>
            <p className="text-sm">Cumprimente o paciente e comece a anamnese.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <Card className={`max-w-[80%] p-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </Card>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <Card className="p-3 bg-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
            </Card>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!sessionCompleted && (
        <div className="border-t p-4 flex gap-2 flex-shrink-0">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button onClick={sendMessage} disabled={loading || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      <VirtualPatientMAI
        open={showMAI}
        onOpenChange={setShowMAI}
        sessionId={sessionId}
        onComplete={handleMAIComplete}
      />
    </div>
  );
}
