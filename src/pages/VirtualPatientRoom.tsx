import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, ChevronRight, ClipboardCheck, Loader2, Users, Activity, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { simpleMarkdownToHtml } from "@/lib/simple-markdown";
import { VirtualPatientMAI } from "@/components/VirtualPatientMAI";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const RESEARCH_CONSENT_VERSION = "1.0";


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
  const [measuringVitals, setMeasuringVitals] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [encounter, setEncounter] = useState(1);
  const [showMAI, setShowMAI] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionId, setSessionId] = useState(""); // primary (shared) session id
  const [patientId, setPatientId] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentName, setStudentName] = useState("");
  const [isGroupSession, setIsGroupSession] = useState(false);
  const [groupEmails, setGroupEmails] = useState<string[]>([]);
  const [groupNames, setGroupNames] = useState<string[]>([]);
  const [groupSessionIds, setGroupSessionIds] = useState<string[]>([]);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>("");
  const encounterRef = useRef<number>(1);
  const seenMsgKeysRef = useRef<Set<string>>(new Set());
  const [consentState, setConsentState] = useState<null | boolean>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);


  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { encounterRef.current = encounter; }, [encounter]);

  const patient = PATIENT_NAMES[patientId] || null;

  useEffect(() => {
    initRoom();
  }, [cvpId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime sync for group sessions: subscribe to messages + session updates on
  // the shared primary session so every device in the group sees the same chat.
  useEffect(() => {
    if (!sessionId || !isGroupSession) return;

    const channel = supabase
      .channel(`vp-room-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "virtual_patient_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: any) => {
          const m = payload.new;
          const key = `${m.role}|${m.encounter}|${m.content}`;
          if (seenMsgKeysRef.current.has(key)) return;
          seenMsgKeysRef.current.add(key);
          setMessages((prev) => [
            ...prev,
            { role: m.role, content: m.content, encounter: m.encounter },
          ]);
          if (m.role === "assistant") setRemoteTyping(false);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "virtual_patient_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload: any) => {
          const s = payload.new;
          if (typeof s.current_encounter === "number") setEncounter(s.current_encounter);
          if (s.status === "completed") setSessionCompleted(true);
        },
      )
      .on("broadcast", { event: "typing" }, (payload: any) => {
        if (payload?.payload?.from && payload.payload.from !== studentEmail) {
          setRemoteTyping(true);
          setTimeout(() => setRemoteTyping(false), 15000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, isGroupSession, studentEmail]);

  const initRoom = async () => {
    if (!cvpId) return;
    setInitialLoading(true);

    // Get student info from sessionStorage
    const email = sessionStorage.getItem("vp_email") || "";
    const name = sessionStorage.getItem("vp_student_name") || "";
    const groupEmailsRaw = sessionStorage.getItem("vp_group_emails");
    const groupNamesRaw = sessionStorage.getItem("vp_group_names");

    setStudentEmail(email);
    setStudentName(name);

    const parsedGroupEmails: string[] = groupEmailsRaw ? JSON.parse(groupEmailsRaw) : [];
    const parsedGroupNames: string[] = groupNamesRaw ? JSON.parse(groupNamesRaw) : [];
    const isGroup = parsedGroupEmails.length > 1;
    setIsGroupSession(isGroup);
    setGroupEmails(parsedGroupEmails);
    setGroupNames(parsedGroupNames);

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

    if (isGroup) {
      // Group mode: ensure every member has a session row (for grading), but use ONE
      // shared "primary" session as the single source of truth for chat messages.
      // Primary = oldest session row (deterministic across devices) so every device
      // reads/writes to the same session_id and stays in sync via realtime.
      let sharedGroupId: string | null = null;

      const { data: existingForGroup } = await supabase
        .from("virtual_patient_sessions")
        .select("id, group_id, student_email, current_encounter, status, created_at")
        .eq("class_virtual_patient_id", cvpId)
        .in("student_email", parsedGroupEmails)
        .order("created_at", { ascending: true });

      const found = (existingForGroup || []).find((s: any) => s.group_id);
      sharedGroupId = found?.group_id || crypto.randomUUID();

      const existingByEmail = new Map<string, any>();
      (existingForGroup || []).forEach((s: any) => existingByEmail.set(s.student_email, s));

      const sessionRows: { id: string; created_at: string; current_encounter: number; status: string }[] = [];

      for (let i = 0; i < parsedGroupEmails.length; i++) {
        const memberEmail = parsedGroupEmails[i];
        const memberName = parsedGroupNames[i] || "";
        const existingSession = existingByEmail.get(memberEmail);

        if (existingSession) {
          if (!existingSession.group_id) {
            await supabase
              .from("virtual_patient_sessions")
              .update({ group_id: sharedGroupId })
              .eq("id", existingSession.id);
          }
          sessionRows.push(existingSession);
        } else {
          const { data: newSession, error: insertError } = await supabase
            .from("virtual_patient_sessions")
            .insert({
              patient_id: cvp.patient_id,
              module: cvp.patient_id.startsWith("inflammation") ? "inflammation" : "pain",
              class_virtual_patient_id: cvpId,
              student_email: memberEmail,
              student_name: memberName,
              group_id: sharedGroupId,
            })
            .select("id, created_at, current_encounter, status")
            .single();

          if (insertError || !newSession) {
            console.error("Error creating session for", memberEmail, insertError);
            continue;
          }
          sessionRows.push(newSession as any);
        }
      }

      // Pick the OLDEST session as primary — deterministic across devices
      sessionRows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const primary = sessionRows[0];
      const sessionIds = sessionRows.map((s) => s.id);

      setGroupSessionIds(sessionIds);
      setSessionId(primary?.id || "");
      setEncounter(primary?.current_encounter || 1);
      if (primary?.status === "completed") setSessionCompleted(true);

      // Load messages from primary session
      if (primary?.id) {
        const { data: msgs } = await supabase
          .from("virtual_patient_messages")
          .select("role, content, encounter, created_at")
          .eq("session_id", primary.id)
          .order("created_at", { ascending: true });
        if (msgs) {
          setMessages(msgs as Message[]);
          // Track to dedupe with realtime inserts
          msgs.forEach((m: any) => {
            seenMsgKeysRef.current.add(`${m.role}|${m.encounter}|${m.content}`);
          });
        }
      }
    } else {
      // Individual mode (original logic)
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

      const { data: msgs } = await supabase
        .from("virtual_patient_messages")
        .select("role, content, encounter")
        .eq("session_id", sid)
        .order("created_at", { ascending: true });

      if (msgs) setMessages(msgs as Message[]);
    }

    setInitialLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !sessionId) return;

    const userMsg: Message = { role: "user", content: input.trim(), encounter };
    const userKey = `user|${encounter}|${userMsg.content}`;
    seenMsgKeysRef.current.add(userKey);
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Notify other group members someone is typing/awaiting AI
    if (isGroupSession) {
      try {
        await supabase.channel(`vp-room-${sessionId}`).send({
          type: "broadcast",
          event: "typing",
          payload: { from: studentEmail },
        });
      } catch {}
    }

    // Save user message ONLY to the shared primary session (other devices receive it via realtime)
    await supabase.from("virtual_patient_messages").insert({
      session_id: sessionId,
      encounter,
      role: "user",
      content: userMsg.content,
    });

    try {
      const aiMessages = messages.concat(userMsg).map((m) => ({ role: m.role, content: m.content }));

      const response = await supabase.functions.invoke("virtual-patient-chat", {
        body: { patientId, messages: aiMessages, encounter, sessionId },
      });

      if (response.error) throw new Error(response.error.message);

      const reply = response.data?.reply || "Desculpe, não consegui responder.";
      const assistantKey = `assistant|${encounter}|${reply}`;
      seenMsgKeysRef.current.add(assistantKey);
      const assistantMsg: Message = { role: "assistant", content: reply, encounter };
      setMessages((prev) => [...prev, assistantMsg]);

      // Save assistant message ONLY to primary session — realtime fans out to other devices
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

    // Update primary session — realtime propagates to other devices.
    // Also update all sibling sessions so per-student grading sees the right encounter.
    const allIds = isGroupSession ? groupSessionIds : [sessionId];
    await Promise.all(allIds.map(id =>
      supabase.from("virtual_patient_sessions").update({ current_encounter: next }).eq("id", id)
    ));

    const noteContent = `---\n\n**📋 Transição para o ${ENCOUNTER_LABELS[next - 1]}**\n\nO paciente retorna para uma nova consulta. Continue a conversa.\n\n---`;
    const noteKey = `assistant|${next}|${noteContent}`;
    seenMsgKeysRef.current.add(noteKey);
    const systemNote: Message = { role: "assistant", content: noteContent, encounter: next };
    setMessages((prev) => [...prev, systemNote]);

    // Save note ONLY to primary session
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

  // Detecta se a última mensagem do estudante menciona aferição/medida de
  // sinais vitais — usado para exibir o botão "Medir Sinais Vitais" no chat.
  const VITALS_REGEX = /\b(sinais\s+vitais|aferir|medir|pressao|press[aã]o|\bPA\b|\bP\.?A\.?\b|frequ[eê]ncia\s+card[ií]aca|\bFC\b|frequ[eê]ncia\s+respirat[oó]ria|\bFR\b|temperatura|\btemp\b|febre|satura[cç][aã]o|\bSatO2\b|\bSpO2\b|\boximetria|glicemia|glicose|dextro|HGT)\b/i;

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const showVitalsButton =
    !sessionCompleted &&
    !!lastUserMessage &&
    VITALS_REGEX.test(lastUserMessage.content);

  const measureVitals = async () => {
    if (measuringVitals || !sessionId) return;
    setMeasuringVitals(true);
    try {
      const transcript = messages.map((m) => ({ role: m.role, content: m.content, encounter: m.encounter }));
      const { data, error } = await supabase.functions.invoke("measure-virtual-patient-vitals", {
        body: { patientId, encounter, transcript },
      });
      if (error) throw error;
      const content: string = data?.message || "Não foi possível aferir os sinais vitais.";
      const key = `assistant|${encounter}|${content}`;
      seenMsgKeysRef.current.add(key);
      const vitalsMsg: Message = { role: "assistant", content, encounter };
      setMessages((prev) => [...prev, vitalsMsg]);
      // Salva apenas na sessão primária — realtime distribui para os demais membros
      await supabase.from("virtual_patient_messages").insert({
        session_id: sessionId,
        encounter,
        role: "assistant",
        content,
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao medir sinais vitais.");
    } finally {
      setMeasuringVitals(false);
    }
  };

  const handleMAIComplete = async () => {
    setShowMAI(false);
    setSessionCompleted(true);

    try {
      if (isGroupSession && groupSessionIds.length > 1) {
        // Group activity → grade ONCE on primary session, then mirror the same grade
        // (and MAI answers) to every group member so all receive the SAME correction.
        const primaryId = sessionId || groupSessionIds[0];
        const { error: gradeErr } = await supabase.functions.invoke("grade-virtual-patient", {
          body: { session_id: primaryId, class_virtual_patient_id: cvpId },
        });
        if (gradeErr) throw gradeErr;

        // Fetch the freshly produced grade for the primary session
        const { data: primaryGrade } = await supabase
          .from("virtual_patient_grades")
          .select("subscores, bonus_penalidades, nota_final, nota_microlearning, feedback_resumido, orientacoes_melhoria, flags_seguranca, class_virtual_patient_id")
          .eq("session_id", primaryId)
          .maybeSingle();

        if (primaryGrade) {
          const otherIds = groupSessionIds.filter((id) => id !== primaryId);
          for (const otherId of otherIds) {
            const { data: existing } = await supabase
              .from("virtual_patient_grades")
              .select("id")
              .eq("session_id", otherId)
              .maybeSingle();
            const payload = {
              session_id: otherId,
              class_virtual_patient_id: primaryGrade.class_virtual_patient_id,
              subscores: primaryGrade.subscores,
              bonus_penalidades: primaryGrade.bonus_penalidades,
              nota_final: primaryGrade.nota_final,
              nota_microlearning: primaryGrade.nota_microlearning,
              feedback_resumido: primaryGrade.feedback_resumido,
              orientacoes_melhoria: primaryGrade.orientacoes_melhoria,
              flags_seguranca: primaryGrade.flags_seguranca,
            };
            if (existing?.id) {
              await supabase.from("virtual_patient_grades").update(payload).eq("id", existing.id);
            } else {
              await supabase.from("virtual_patient_grades").insert(payload);
            }
          }
        }
        toast.success("Correção em grupo gerada — todos os integrantes receberão a mesma avaliação.");
      } else {
        const { error: gradeErr } = await supabase.functions.invoke("grade-virtual-patient", {
          body: { session_id: sessionId, class_virtual_patient_id: cvpId },
        });
        if (gradeErr) throw gradeErr;
        toast.success("Correção e feedback gerados com sucesso.");
      }
    } catch (err) {
      console.warn("Auto-grading failed:", err);
      toast.error("Atendimento concluído, mas a correção automática não foi gerada agora. Tente em 'Análise VP' > 'Corrigir Turma'.");
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
            {isGroupSession ? (
              <div className="flex items-center gap-1.5 mt-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Grupo: {groupNames.join(", ")}
                </p>
              </div>
            ) : studentName ? (
              <p className="text-xs text-muted-foreground mt-1">Estudante: {studentName}</p>
            ) : null}
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
              <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(msg.content) }} />
            </Card>
          </div>
        ))}

        {(loading || remoteTyping) && (
          <div className="flex justify-start">
            <Card className="p-3 bg-muted flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {remoteTyping && !loading && (
                <span className="text-xs text-muted-foreground">Outro integrante do grupo está conversando…</span>
              )}
            </Card>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Vital signs quick-action: appears when student mentions measuring vitals */}
      {showVitalsButton && (
        <div className="border-t px-4 pt-3 flex flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={measureVitals}
            disabled={measuringVitals || loading}
            className="gap-1.5"
          >
            {measuringVitals ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Activity className="h-4 w-4" />
            )}
            {measuringVitals ? "Aferindo..." : "Medir Sinais Vitais"}
          </Button>
        </div>
      )}

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
