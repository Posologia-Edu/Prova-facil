import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, ChevronRight, ClipboardCheck, Loader2, Users, Activity, ShieldCheck, Mail, FileText, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { simpleMarkdownToHtml } from "@/lib/simple-markdown";
import { VirtualPatientMAI } from "@/components/VirtualPatientMAI";
import { RecordPanel } from "@/components/vp-room/RecordPanel";
import { RolesDialog } from "@/components/vp-room/RolesDialog";
import { EncounterIntroDialog, EncounterStrip, EncounterTimer, introKey, timerKey, type EncounterBrief } from "@/components/vp-room/EncounterCard";
import type { FichaVersao } from "@/lib/vp-ficha";
import { fetchPublicVpCase, sessionModuleFor } from "@/lib/vp-catalog";
import { vpAluno } from "@/lib/vp-aluno";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const RESEARCH_CONSENT_VERSION = "1.0";


interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  encounter: number;
  author_name?: string | null;
  author_email?: string | null;
}

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
  const [groupId, setGroupId] = useState<string>("");
  const [remoteTyping, setRemoteTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>("");
  const isTreinoRef = useRef(false);
  const [isTreino, setIsTreino] = useState(false);
  const [dificuldade, setDificuldade] = useState<string | null>(null);
  const encounterRef = useRef<number>(1);
  const seenMsgKeysRef = useRef<Set<string>>(new Set());
  const [consentState, setConsentState] = useState<null | boolean>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);
  const [showPeerEvalNotice, setShowPeerEvalNotice] = useState(false);
  // Ficha eletrônica (P20): só nos casos v2; o chat informa se existe e qual versão da profissão.
  const [ficha, setFicha] = useState<{ versao: FichaVersao } | null>(null);
  const [showFicha, setShowFicha] = useState(false);
  const [showSoapWarning, setShowSoapWarning] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  // Divisão de funções do grupo: o docente liga por paciente; o grupo escolhe quem registra a ficha em cada encontro.
  const [groupRolesOn, setGroupRolesOn] = useState(false);
  const [rolesByEncounter, setRolesByEncounter] = useState<Record<number, string[]>>({});
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);
  const [showRolesEdit, setShowRolesEdit] = useState(false);
  const [rolesChosenBy, setRolesChosenBy] = useState<Record<number, string>>({});
  const [pin, setPin] = useState("");
  // Cartão do encontro estilo OSCE (P21): só nos casos v2.
  const [brief, setBrief] = useState<EncounterBrief | null>(null);
  const [briefVersao, setBriefVersao] = useState<FichaVersao | null>(null);
  const [introManual, setIntroManual] = useState(false);
  const [introTick, setIntroTick] = useState(0);


  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { encounterRef.current = encounter; }, [encounter]);

  useEffect(() => {
    if (!sessionId || !patientId) return;
    let active = true;
    supabase.functions
      .invoke("virtual-patient-chat", { body: { action: "encounter_brief", patientId, encounter, sessionId } })
      .then(({ data }) => {
        if (!active) return;
        const v = data?.versao;
        setBrief(data?.brief ? { ...data.brief, encounter } : null);
        setBriefVersao(v === "farmaceutico" || v === "enfermeiro" || v === "medico" ? v : null);
        if (data?.ficha && (v === "farmaceutico" || v === "enfermeiro" || v === "medico")) {
          setFicha({ versao: v });
        } else {
          setFicha(null);
        }
      })
      .catch(() => { /* sem ficha */ });
    return () => { active = false; };
  }, [sessionId, patientId, encounter]);

  // A ficha abre sozinha na primeira vez para o aluno perceber que existe.
  const fichaAvailable = !!ficha;
  // Em tela larga ela fica ao lado da conversa; no celular cobriria a tela toda, então começa fechada.
  useEffect(() => {
    if (fichaAvailable && window.matchMedia("(min-width: 1024px)").matches) setShowFicha(true);
  }, [fichaAvailable]);

  const roleMembers = groupEmails.map((e, i) => ({ email: e.toLowerCase(), name: groupNames[i] || e }));
  const rolesActive = groupRolesOn && !!ficha && isGroupSession && groupEmails.length > 1;
  const currentRegistrars = rolesByEncounter[encounter];
  const myRole: "ficha" | "conversa" | null =
    rolesActive && currentRegistrars ? (currentRegistrars.includes(studentEmail.toLowerCase()) ? "ficha" : "conversa") : null;
  const rolesPending = rolesActive && !sessionCompleted && (!rolesLoaded || !currentRegistrars);
  const chatBlocked = rolesActive && !sessionCompleted && (rolesPending || myRole === "ficha");
  // Cartão do encontro: abre sozinho na primeira vez de cada encontro (depois das funções e do consentimento).
  const activeBrief = brief && brief.encounter === encounter ? brief : null;
  let introSeen = true;
  try { introSeen = sessionStorage.getItem(introKey(sessionId, encounter)) === "1"; } catch { /* sem armazenamento: não insiste */ }
  void introTick;
  const introOpen = !!activeBrief && !sessionCompleted && !rolesPending && !showConsent && (!introSeen || introManual);
  const confirmIntro = () => {
    try {
      sessionStorage.setItem(introKey(sessionId, encounter), "1");
      if (!sessionStorage.getItem(timerKey(sessionId, encounter))) sessionStorage.setItem(timerKey(sessionId, encounter), String(Date.now()));
    } catch { /* sem armazenamento */ }
    setIntroManual(false);
    setIntroTick((t) => t + 1);
  };

  const namesOf = (emails: string[]) => roleMembers.filter((m) => emails.includes(m.email)).map((m) => m.name).join(", ");

  // As funções do grupo chegam junto com a consulta periódica da sala (veja a sincronização do grupo abaixo).

  // Quem registra a ficha precisa do painel aberto.
  useEffect(() => { if (myRole === "ficha") setShowFicha(true); }, [myRole, encounter]);

  const saveRoles = async (registrars: string[]) => {
    setSavingRoles(true);
    try {
      await vpAluno(cvpId!, { action: "funcoes_salvar", session_id: sessionId, encounter, registrars });
    } catch {
      setSavingRoles(false);
      toast.error("Não foi possível salvar as funções. Tente novamente.");
      return;
    }
    setSavingRoles(false);
    setRolesByEncounter((prev) => ({ ...prev, [encounter]: registrars }));
    setRolesChosenBy((prev) => ({ ...prev, [encounter]: (studentEmail || "").toLowerCase() }));
    setShowRolesEdit(false);
  };

  const [patient, setPatient] = useState<{ name: string; age: number; module: string } | null>(null);

  useEffect(() => {
    initRoom();
  }, [cvpId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const lastMsgAtRef = useRef<string>("");

  // Sincronização do grupo: a sala consulta a função a cada 4 s (no lugar do realtime), e também ao voltar o foco ou a rede.
  // O aviso "outro integrante está conversando" continua pelo canal de broadcast, que não lê tabela.
  useEffect(() => {
    if (!sessionId || !isGroupSession || !cvpId) return;

    const channel = supabase
      .channel(`vp-room-${sessionId}`)
      .on("broadcast", { event: "typing" }, (payload: any) => {
        if (payload?.payload?.from && payload.payload.from !== studentEmail) {
          setRemoteTyping(true);
          setTimeout(() => setRemoteTyping(false), 15000);
        }
      })
      .subscribe();

    let ativo = true;
    async function syncFromDb() {
      try {
        const d = await vpAluno(cvpId!, { action: "estado", session_id: sessionId, desde: lastMsgAtRef.current || undefined, com_funcoes: true });
        if (!ativo || !d?.ok) return;
        const rows: any[] = d.messages || [];
        if (rows.length) lastMsgAtRef.current = rows[rows.length - 1].created_at || lastMsgAtRef.current;
        const missing = rows.filter((r) => !seenMsgKeysRef.current.has(r.id));
        if (missing.length > 0) {
          missing.forEach((r) => seenMsgKeysRef.current.add(r.id));
          setMessages((prev) => [...prev, ...(missing as Message[])]);
          if (missing.some((r) => r.role === "assistant")) setRemoteTyping(false);
        }
        if (typeof d.encounter === "number") setEncounter(d.encounter);
        if (d.status === "completed") setSessionCompleted(true);
        if (Array.isArray(d.funcoes)) {
          const m: Record<number, string[]> = {};
          const by: Record<number, string> = {};
          d.funcoes.forEach((r: any) => {
            m[r.encounter] = ((r.registrars as string[]) || []).map((x) => x.toLowerCase());
            if (r.chosen_by) by[r.encounter] = String(r.chosen_by).toLowerCase();
          });
          setRolesByEncounter(m);
          setRolesChosenBy(by);
          setRolesLoaded(true);
        }
      } catch { /* tenta de novo no próximo ciclo */ }
    }
    const onVisible = () => { if (document.visibilityState === "visible") syncFromDb(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", syncFromDb);
    window.addEventListener("online", syncFromDb);
    syncFromDb();
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") syncFromDb();
    }, 4000);

    return () => {
      ativo = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", syncFromDb);
      window.removeEventListener("online", syncFromDb);
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [sessionId, isGroupSession, studentEmail, cvpId]);

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

    let sala: any;
    try {
      const d = await vpAluno(cvpId, { action: "sala" });
      if (!d?.ok) throw new Error(d?.motivo || "sala");
      sala = d.sala;
    } catch (e: any) {
      toast.error(e?.message === "sessao_expirada" ? "Sessão expirada. Faça login novamente." : "Sala não encontrada.");
      navigate("/student/auth");
      return;
    }

    setPatientId(sala.patient_id);
    setPin(sala.access_code || "");
    setGroupRolesOn(!!sala.group_roles);
    // P14: paciente de treino recebe o feedback assim que a correção termina e não pede consentimento de pesquisa.
    isTreinoRef.current = sala.mode === "treino";
    setIsTreino(isTreinoRef.current);
    setDificuldade(sala.dificuldade ?? null);

    // Nome, idade e categoria vêm do cadastro único (função pública: não expõe roteiro nem gabarito).
    const pub = await fetchPublicVpCase(sala.patient_id);
    setPatient(pub);
    const sessionModule = sessionModuleFor(pub?.module);

    let d: any;
    try {
      d = await vpAluno(cvpId, { action: "entrar", module: sessionModule, group_emails: parsedGroupEmails });
    } catch (e: any) {
      toast.error("Erro ao criar sessão.");
      console.error(e);
      setInitialLoading(false);
      return;
    }
    if (!d?.ok) {
      toast.error(d?.motivo === "grupo" ? "Os integrantes do grupo não conferem com a turma." : "Acesso negado a esta sala.");
      navigate("/student/auth");
      return;
    }

    setStudentName(d.nome || name);
    if (d.grupo) {
      setIsGroupSession(true);
      setGroupEmails(d.grupo.emails);
      setGroupNames(d.grupo.nomes);
      setGroupSessionIds(d.grupo.sessionIds);
      setGroupId(d.grupo.id);
    } else {
      setIsGroupSession(false);
    }
    setSessionId(d.sessionId);
    setEncounter(d.encounter || 1);
    if (d.completed) setSessionCompleted(true);
    const msgs: any[] = d.messages || [];
    msgs.forEach((m) => seenMsgKeysRef.current.add(m.id));
    if (msgs.length) lastMsgAtRef.current = msgs[msgs.length - 1].created_at || "";
    setMessages(msgs as Message[]);

    setInitialLoading(false);

    const rc = d.consent ?? null;
    setConsentState(rc);
    if (rc === null && !isTreinoRef.current) setShowConsent(true);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !sessionId) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      encounter,
      author_name: studentName || null,
      author_email: studentEmail || null,
    };
    seenMsgKeysRef.current.add(userMsg.id!);
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

    // A mensagem é gravada só na sessão primária (os outros integrantes a recebem pela consulta periódica)
    vpAluno(cvpId!, { action: "mensagem", session_id: sessionId, id: userMsg.id, encounter, role: "user", content: userMsg.content })
      .catch(() => toast.error("Não foi possível salvar a sua mensagem."));

    try {
      const aiMessages = messages.concat(userMsg).map((m) => ({ role: m.role, content: m.content, encounter: m.encounter }));

      const response = await supabase.functions.invoke("virtual-patient-chat", {
        body: { patientId, messages: aiMessages, encounter, sessionId },
      });

      if (response.error) throw new Error(response.error.message);

      const reply = response.data?.reply || "Desculpe, não consegui responder.";
      const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: reply, encounter };
      seenMsgKeysRef.current.add(assistantMsg.id!);
      setMessages((prev) => [...prev, assistantMsg]);

      vpAluno(cvpId!, { action: "mensagem", session_id: sessionId, id: assistantMsg.id, encounter, role: "assistant", content: reply })
        .catch(() => toast.error("Não foi possível salvar a resposta do paciente."));
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
    try {
      const r = await vpAluno(cvpId!, { action: "avancar", session_id: sessionId, para: next });
      if (r?.jaAvancou) { setEncounter(r.encounter); return; } // outro integrante já avançou
    } catch {
      toast.error("Não foi possível avançar o encontro. Tente novamente.");
      return;
    }
    setEncounter(next);

    // Casos v2 trazem o cartão do encontro (cenário e tarefa, sem lista de passos); legados seguem com a nota padrão.
    let body = "O paciente retorna para uma nova consulta. Continue a conversa.";
    try {
      const { data } = await supabase.functions.invoke("virtual-patient-chat", {
        body: { action: "encounter_brief", patientId, encounter: next, sessionId },
      });
      const b = data?.brief;
      if (b?.cenario) {
        body = `**Cenário:** ${b.cenario}\n\n**Sua tarefa:** ${b.tarefa}`;
        if (b.interlocutor_nome) body += `\n\n_Neste encontro você conversa com ${b.interlocutor_nome}, não com o paciente._`;
      }
    } catch (_) { /* nota padrão */ }
    const noteContent = `---\n\n**📋 Transição para o ${encounterLabel(next)}**\n\n${body}\n\n---`;
    const systemNote: Message = { id: crypto.randomUUID(), role: "assistant", content: noteContent, encounter: next };
    seenMsgKeysRef.current.add(systemNote.id!);
    setMessages((prev) => [...prev, systemNote]);

    vpAluno(cvpId!, { action: "mensagem", session_id: sessionId, id: systemNote.id, encounter: next, role: "assistant", content: systemNote.content }).catch(() => {});

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
        body: { patientId, encounter, transcript, sessionId },
      });
      if (error) throw error;
      const content: string = data?.message || "Não foi possível aferir os sinais vitais.";
      const vitalsMsg: Message = { id: crypto.randomUUID(), role: "assistant", content, encounter };
      seenMsgKeysRef.current.add(vitalsMsg.id!);
      setMessages((prev) => [...prev, vitalsMsg]);
      vpAluno(cvpId!, { action: "mensagem", session_id: sessionId, id: vitalsMsg.id, encounter, role: "assistant", content }).catch(() => {});
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao medir sinais vitais.");
    } finally {
      setMeasuringVitals(false);
    }
  };

  // Antes do MAI: se a ficha existe e o SOAP do 3º encontro está em branco, avisa (a ficha vale parte da nota).
  // O MAI só existe na Farmácia e nos pacientes do formato anterior (sem ficha). Enfermagem e Medicina concluem sem ele.
  const maiRequired = !ficha || ficha.versao === "farmaceutico";
  const encounterLabel = (n: number) => (n === 3 && !maiRequired ? "3º Encontro – Ajustes Finais" : ENCOUNTER_LABELS[n - 1]);
  const goToFinish = () => { if (maiRequired) setShowMAI(true); else setShowFinishConfirm(true); };

  const requestFinish = async () => {
    if (ficha && sessionId) {
      let data: any[] = [];
      try {
        const r = await vpAluno(cvpId!, { action: "ficha_ler", session_id: sessionId });
        data = (r?.secoes || []).filter((x: any) => x.encounter === 3);
      } catch { /* sem leitura: não bloqueia */ }
      const filled = data.some((r) => String(r.content || "").trim());
      if (!filled) { setShowSoapWarning(true); return; }
    }
    goToFinish();
  };

  const handleMAIComplete = async () => {
    setShowMAI(false);
    setSessionCompleted(true);
    // O servidor só corrige sessões concluídas; o MAI já conclui, e sem MAI a conclusão é registrada aqui
    try { await vpAluno(cvpId!, { action: "concluir", session_id: sessionId }); } catch { /* a correção avisa se faltar */ }

    // Treino individual: o aluno vai direto à tela de feedback, que aguarda a correção terminar (ela segue rodando aqui).
    if (isTreinoRef.current && !(isGroupSession && groupSessionIds.length > 1)) {
      navigate(`/virtual-patients/feedback/${cvpId}?gerando=1`);
    }

    // Case is considered finished the moment the group submits the MAI — this is
    // the trigger point for peer-eval invites, independent of AI grading below
    // (which can fail/be retried later without blocking the peer-eval e-mails).
    // Only one device is ever in the room, so the others learn about the peer
    // evaluation solely through this e-mail — the modal below gives whoever is
    // at the keyboard something to read aloud to the rest of the group before
    // everyone leaves the room.
    if (isGroupSession && groupSessionIds.length > 1 && groupId) {
      supabase.functions
        .invoke("send-vp-peer-eval-invites", { body: { group_id: groupId, class_virtual_patient_id: cvpId } })
        .then(({ data, error }) => {
          if (error) {
            console.warn("Peer eval invite failed:", error);
            return;
          }
          if (data?.reason !== "not_a_group") setShowPeerEvalNotice(true);
        })
        .catch((err) => console.warn("Peer eval invite failed:", err));
    }

    try {
      if (isGroupSession && groupSessionIds.length > 1) {
        // Group activity → grade ONCE on primary session, then mirror the same grade
        // (and MAI answers) to every group member so all receive the SAME correction.
        const primaryId = sessionId || groupSessionIds[0];
        const { error: gradeErr } = await supabase.functions.invoke("grade-virtual-patient", {
          body: { session_id: primaryId, class_virtual_patient_id: cvpId },
        });
        if (gradeErr) throw gradeErr;

        // Copia a nota da sessão primária para as demais (feito no servidor)
        await vpAluno(cvpId!, { action: "espelhar_nota", session_id: primaryId });
        toast.success("Correção em grupo gerada. Um e-mail para avaliação entre pares foi enviado a cada integrante.");
      } else {
        const { error: gradeErr } = await supabase.functions.invoke("grade-virtual-patient", {
          body: { session_id: sessionId, class_virtual_patient_id: cvpId },
        });
        if (gradeErr) throw gradeErr;
        if (isTreinoRef.current) {
          // O servidor já liberou o feedback deste paciente de treino; a tela de feedback detecta sozinha.
          toast.success("Correção pronta. Seu feedback já está disponível.");
          return;
        }
        toast.success("Correção e feedback gerados com sucesso.");
      }
    } catch (err) {
      console.warn("Auto-grading failed:", err);
      toast.error("Atendimento concluído, mas a correção automática não foi gerada agora. Tente em 'Análise VP' > 'Corrigir Turma'.");
    }
  };

  const saveConsent = async (accept: boolean) => {
    if (!sessionId) return;
    setSavingConsent(true);
    try {
      await vpAluno(cvpId!, { action: "consentimento", session_id: sessionId, accept, version: RESEARCH_CONSENT_VERSION });
    } catch {
      setSavingConsent(false);
      toast.error("Não foi possível registrar sua resposta.");
      return;
    }
    setSavingConsent(false);
    setConsentState(accept);
    setShowConsent(false);
    toast.success(accept ? "Consentimento registrado. Obrigado!" : "Preferência registrada. Sua sessão não será usada no estudo.");
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

  const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  const nameOfAuthor = (msg: Message) => (msg.author_email && msg.author_email === studentEmail ? "Você" : msg.author_name || msg.author_email || "");
  const diffLabel = dificuldade ? ({ facil: "Fácil", medio: "Médio", dificil: "Difícil" } as Record<string, string>)[dificuldade] || dificuldade : "";
  const encounterTitles = ["Anamnese inicial", "Eficácia e segurança", maiRequired ? "Ajustes finais + MAI" : "Ajustes finais"];
  const conduzindo = rolesActive && currentRegistrars
    ? namesOf(roleMembers.map((m) => m.email).filter((e) => !currentRegistrars.includes(e)))
    : "";

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Cabeçalho */}
      <header className="flex flex-shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b bg-card px-4 py-3 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft font-heading text-base font-medium text-brand-text">
            {initials(patient.name)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-heading text-lg font-medium leading-tight">{patient.name}, {patient.age} anos</h2>
            {isGroupSession ? (
              <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                <Users className="h-3 w-3 shrink-0" />{groupNames.join(", ")}
              </p>
            ) : studentName ? (
              <p className="truncate text-xs text-muted-foreground">Estudante: {studentName}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge tone="neutral">{patient.module}</StatusBadge>
          {isTreino
            ? <StatusBadge tone="info">Treino{diffLabel ? ` · ${diffLabel}` : ""}</StatusBadge>
            : <StatusBadge tone="accent">Avaliativo</StatusBadge>}
          {isGroupSession && <StatusBadge tone="neutral">Grupo · {groupNames.length} integrantes</StatusBadge>}
          {pin && (
            <button
              type="button"
              className="inline-flex"
              title="PIN da sala (clique para copiar). Outro integrante usa o PIN para entrar."
              onClick={() => { navigator.clipboard?.writeText(pin); toast.success("PIN copiado!"); }}
            >
              <StatusBadge tone="neutral" className="cursor-pointer font-mono tracking-widest"><Copy className="h-3 w-3" />PIN {pin}</StatusBadge>
            </button>
          )}
          {myRole && (
            <StatusBadge
              tone="brand"
              title={rolesChosenBy[encounter] ? `Funções definidas por ${namesOf([rolesChosenBy[encounter]]) || rolesChosenBy[encounter]}` : undefined}
            >
              {myRole === "ficha" ? "Você registra a ficha" : "Você conduz a conversa"}
            </StatusBadge>
          )}
          {sessionCompleted && <StatusBadge tone="ok" dot>Concluído</StatusBadge>}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {isGroupSession && remoteTyping && !loading && (
            <StatusBadge tone="info" dot>Outro integrante está conversando…</StatusBadge>
          )}
          {activeBrief && (
            <EncounterTimer sessionId={sessionId} encounter={encounter} minutes={activeBrief.tempo_min} />
          )}
          {activeBrief && (
            <Button variant="outline" size="sm" onClick={() => setIntroManual(true)}>Ver cartão</Button>
          )}
          {myRole && !sessionCompleted && (
            <Button variant="ghost" size="sm" onClick={() => setShowRolesEdit(true)} title="Alterar as funções deste encontro">
              Funções
            </Button>
          )}
          {ficha && (
            <Button variant={showFicha ? "secondary" : "outline"} size="sm" onClick={() => setShowFicha((v) => !v)}>
              <FileText className="h-4 w-4" /> Ficha
            </Button>
          )}
          {encounter < 3 && !sessionCompleted && (
            <Button variant="outline" size="sm" onClick={advanceEncounter}>
              Avançar encontro <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {encounter === 3 && !sessionCompleted && (
            <Button size="sm" onClick={requestFinish}>
              <ClipboardCheck className="h-4 w-4" /> {maiRequired ? "Preencher MAI" : "Concluir atendimento"}
            </Button>
          )}
        </div>
      </header>

      {/* Etapas dos encontros */}
      <div className="flex-shrink-0 border-b bg-card/60 px-4 py-2.5 lg:px-6">
        <div className="mb-1.5 flex gap-1.5" aria-hidden>
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-1.5 flex-1 rounded-full ${n < encounter || sessionCompleted ? "bg-primary" : n === encounter ? "bg-highlight" : "bg-muted"}`} />
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 text-xs">
          <span className="text-muted-foreground"><b className="font-medium text-foreground">Encontro {encounter} de 3</b> · {encounterTitles[encounter - 1]}</span>
          <span className="hidden text-muted-foreground sm:inline">
            {encounterTitles.map((t, i) => (
              <span key={t}>{i > 0 && " · "}<span className={i + 1 === encounter ? "font-medium text-foreground" : ""}>{t}</span></span>
            ))}
          </span>
        </div>
      </div>

      {activeBrief && <EncounterStrip brief={activeBrief} onOpen={() => setIntroManual(true)} />}

      <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 min-h-0 flex-1 flex-col">
      {conduzindo && (
        <div className="flex-shrink-0 border-b px-4 py-2 text-xs text-muted-foreground lg:px-6">
          Quem conduz agora: <b className="font-medium text-foreground">{conduzindo}</b>
        </div>
      )}

      {/* Mensagens */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4 lg:px-6">
        {messages.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <p className="mb-2 font-heading text-xl font-medium text-foreground">Inicie o atendimento</p>
            <p className="text-sm">Cumprimente o paciente e comece a anamnese.</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isPatient = msg.role === "assistant";
          const mine = !isPatient && (!isGroupSession || !msg.author_email || msg.author_email === studentEmail);
          const author = nameOfAuthor(msg);
          return (
            <div key={msg.id ?? i} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-medium ${
                  isPatient ? "bg-brand-soft text-brand-text" : mine ? "bg-highlight/20 text-foreground" : "bg-info-soft text-info"
                }`}
                aria-hidden
              >
                {isPatient ? initials(patient.name) : initials(author || studentName || "Você")}
              </span>
              <div className="max-w-[78%]">
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm ${
                    isPatient ? "rounded-bl-sm bg-muted" : mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-info-soft"
                  }`}
                >
                  <div className="prose prose-sm max-w-none text-inherit dark:prose-invert prose-p:my-1 first:prose-p:mt-0 last:prose-p:mb-0" dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(msg.content) }} />
                </div>
                <p className={`mt-1 text-[11px] text-muted-foreground ${mine ? "text-right" : ""}`}>
                  {isPatient ? "paciente" : isGroupSession ? (mine ? "você" : `${author} · integrante do grupo`) : "você"}
                </p>
              </div>
            </div>
          );
        })}

        {(loading || remoteTyping) && (
          <div className="flex items-end gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-medium text-brand-text" aria-hidden>{initials(patient.name)}</span>
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin" />
              {remoteTyping && !loading && (
                <span className="text-xs text-muted-foreground">Outro integrante do grupo está conversando…</span>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Rodapé: sinais vitais e campo de mensagem */}
      {(showVitalsButton || (!sessionCompleted && !chatBlocked)) && (
        <div className="flex-shrink-0 space-y-2.5 border-t bg-card px-4 py-3 lg:px-6">
          {showVitalsButton && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="secondary" size="sm" onClick={measureVitals} disabled={measuringVitals || loading}>
                {measuringVitals ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                {measuringVitals ? "Aferindo..." : "Medir sinais vitais"}
              </Button>
              <span className="text-xs text-muted-foreground">aparece quando você diz que vai aferir</span>
            </div>
          )}
          {!sessionCompleted && !chatBlocked && (
            <div className="flex gap-2">
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
        </div>
      )}

      {chatBlocked && (
        <div className="flex-shrink-0 border-t bg-card px-4 py-3 text-sm text-muted-foreground lg:px-6">
          {rolesPending
            ? "Definam as funções do grupo para continuar."
            : `Neste encontro você registra a ficha. Quem conduz a conversa: ${namesOf(roleMembers.map((m) => m.email).filter((e) => !(currentRegistrars || []).includes(e)))}.`}
        </div>
      )}
      </div>

      {ficha && showFicha && sessionId && (
        <aside className="fixed inset-0 z-40 min-h-0 lg:static lg:z-auto lg:w-[400px] lg:flex-shrink-0 lg:border-l">
          <RecordPanel
            cvpId={cvpId || ""}
            sessionId={sessionId}
            encounter={encounter}
            versao={ficha.versao}
            studentEmail={studentEmail}
            studentName={studentName}
            isGroup={isGroupSession}
            locked={sessionCompleted}
            roleLockedReason={myRole === "conversa" ? `Neste encontro você conduz a conversa; a ficha é de ${namesOf(currentRegistrars || [])}.` : rolesPending ? "Definam as funções do grupo para editar a ficha." : undefined}
            onClose={() => setShowFicha(false)}
          />
        </aside>
      )}
      </div>

      <VirtualPatientMAI
        open={showMAI}
        onOpenChange={setShowMAI}
        sessionId={sessionId}
        cvpId={cvpId || ""}
        onComplete={handleMAIComplete}
      />

      {activeBrief && (
        <EncounterIntroDialog
          open={introOpen}
          firstTime={!introSeen}
          brief={activeBrief}
          title={encounterLabel(encounter)}
          versao={briefVersao}
          hasFicha={!!ficha}
          onStart={confirmIntro}
          onClose={() => setIntroManual(false)}
        />
      )}

      <RolesDialog
        open={(rolesActive && rolesLoaded && !currentRegistrars && !sessionCompleted) || showRolesEdit}
        initial={showRolesEdit ? currentRegistrars : undefined}
        onCancel={showRolesEdit ? () => setShowRolesEdit(false) : undefined}
        encounter={encounter}
        members={roleMembers}
        previousRegistrars={Object.entries(rolesByEncounter)
          .filter(([e]) => Number(e) < encounter)
          .flatMap(([, v]) => v)}
        saving={savingRoles}
        onConfirm={saveRoles}
      />

      <Dialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Concluir o atendimento?</DialogTitle>
            <DialogDescription>
              Ao concluir, a conversa e a ficha serão enviadas para correção e não será possível editar mais nada.
              {isGroupSession && groupSessionIds.length > 1 ? " Os colegas do grupo receberão o convite para a avaliação entre pares." : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowFinishConfirm(false)}>Voltar</Button>
            <Button onClick={() => { setShowFinishConfirm(false); handleMAIComplete(); }}>Concluir atendimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSoapWarning} onOpenChange={setShowSoapWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>A evolução (SOAP) está em branco</DialogTitle>
            <DialogDescription>
              O registro do 3º encontro ainda não foi preenchido. A ficha vale parte da nota ({maiRequired ? 2 : 4} dos 10 pontos).
              Você pode preencher agora ou concluir assim mesmo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowSoapWarning(false); goToFinish(); }}>Concluir assim mesmo</Button>
            <Button onClick={() => { setShowSoapWarning(false); setShowFicha(true); }}>Preencher o SOAP</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConsent} onOpenChange={(o) => { if (!o && consentState !== null) setShowConsent(false); }}>
        <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Consentimento para uso científico (LGPD)
            </DialogTitle>
            <DialogDescription className="text-left space-y-3 pt-2">
              <p>
                Esta atividade faz parte de um estudo educacional sobre uso de <strong>LLM e RAG em simulações clínicas</strong>.
                Solicitamos sua autorização para utilizar, de forma <strong>anonimizada</strong>, os dados desta sessão
                (transcript da conversa, tempos de resposta e indicadores de desempenho) em análises e publicações científicas.
              </p>
              <p>
                Seus dados pessoais (nome, e-mail) <strong>não serão divulgados</strong>. Sua decisão <strong>não interfere</strong>
                na sua nota, no acesso à plataforma ou na correção da atividade. Você pode revogar este consentimento a qualquer
                momento entrando em contato com o docente responsável.
              </p>
              <p className="text-xs text-muted-foreground">
                Base legal: art. 7º, I e IX, e art. 11, II, "c" da LGPD (Lei nº 13.709/2018). Versão do termo: {RESEARCH_CONSENT_VERSION}.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => saveConsent(false)} disabled={savingConsent}>
              Não autorizo
            </Button>
            <Button onClick={() => saveConsent(true)} disabled={savingConsent}>
              {savingConsent ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1.5" />}
              Autorizo o uso científico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPeerEvalNotice} onOpenChange={setShowPeerEvalNotice}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Verifiquem o e-mail de cada um!
            </DialogTitle>
            <DialogDescription className="text-left space-y-3 pt-2">
              <p>
                O atendimento foi concluído. Agora cada integrante do grupo precisa checar o próprio e-mail e
                avaliar a participação dos colegas — isso faz parte da nota individual de cada aluno.
              </p>
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Quem precisa checar o e-mail:</p>
                {groupNames.map((name, i) => (
                  <div key={i} className="text-sm flex items-center justify-between gap-2">
                    <span className="font-medium">{name || "—"}</span>
                    <span className="text-xs text-muted-foreground truncate">{groupEmails[i]}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                O link é pessoal e expira em 3 horas — melhor fazer isso agora, antes de sair da sala.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowPeerEvalNotice(false)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
