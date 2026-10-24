import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { ScoreRing } from "@/components/ui/score-ring";
import { ArrowLeft, Loader2, Award, MessageSquare, Stethoscope, ShieldAlert, Pill, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { simpleMarkdownToHtml } from "@/lib/simple-markdown";
import { PEER_EVAL_MAX_ADJUST } from "@/lib/vp-peer-eval";
import { FICHA_KEYS, FICHA_LABELS, hasFichaScores } from "@/lib/vp-grade";
import { DebriefCard, type Debrief } from "@/components/vp-room/DebriefCard";

interface PeerEvalSummary {
  count: number;
  bonus: number;
  participacao_avg?: number;
  contribuicao_avg?: number;
  colaboracao_avg?: number;
}

interface Grade {
  id: string;
  session_id: string;
  subscores: any;
  bonus_penalidades: any;
  nota_final: number | null;
  nota_microlearning: number | null;
  feedback_resumido: string | null;
  orientacoes_melhoria: string | null;
  flags_seguranca: any;
  feedback_released: boolean;
}
interface Msg { role: string; content: string; encounter: number; }

const SUBSCORE_LABELS: Record<string, string> = {
  identificacao_acolhimento: "Identificação e Acolhimento",
  queixa_principal_hda: "Queixa Principal / HDA",
  historia_medicamentosa: "História Medicamentosa",
  antecedentes_comorbidades: "Antecedentes / Comorbidades",
  habitos_estilo_vida: "Hábitos e Estilo de Vida",
  escuta_raciocinio_clinico: "Escuta e Raciocínio Clínico",
};

// O MAI é gravado como { med_0: { medication_name, score, answers: { indication: "appropriate", ... } }, med_1: ... }.
const MAI_CRITERIA: Array<[string, string]> = [
  ["indication", "Indicação"],
  ["effectiveness", "Efetividade"],
  ["dosage", "Dosagem"],
  ["correct_directions", "Técnica de administração"],
  ["practical_directions", "Comodidade terapêutica"],
  ["drug_drug", "Interação medicamento-medicamento"],
  ["drug_disease", "Interação medicamento-doença"],
  ["duplication", "Duplicidade"],
  ["duration", "Duração"],
  ["cost", "Custo"],
];
const MAI_ANSWER: Record<string, { label: string; tone: StatusTone }> = {
  appropriate: { label: "Apropriado", tone: "ok" },
  marginally: { label: "Marginalmente apropriado", tone: "warn" },
  inappropriate: { label: "Inapropriado", tone: "bad" },
};
const maiMeds = (mai: any): Array<{ medication_name?: string; score?: number; answers?: Record<string, string> }> =>
  Object.keys(mai || {})
    .filter((k) => /^med_\d+$/.test(k))
    .sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)))
    .map((k) => mai[k]);

const PROFISSAO_ROTULO: Record<string, string> = { farmaceutico: "farmacêutico", enfermeiro: "enfermeiro", medico: "médico" };

const microBonus = (m: number | null | undefined) => Math.max(0, Math.min(1, (Number(m) || 0) / 5));
const finalWithBonus = (base: number | null | undefined, m: number | null | undefined) =>
  Math.min(10, (Number(base) || 0) + microBonus(m));

export default function VirtualPatientFeedback() {
  const { cvpId } = useParams<{ cvpId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // Vindo do treino logo após o envio do MAI: a correção ainda está rodando e esta tela aguarda o feedback ficar pronto.
  const aguardando = new URLSearchParams(location.search).get("gerando") === "1";
  const [tentativas, setTentativas] = useState(0);
  const [modo, setModo] = useState<{ mode: string; dificuldade: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [mai, setMai] = useState<any>(null);
  const [transcript, setTranscript] = useState<Msg[]>([]);
  const [studentName, setStudentName] = useState("");
  const [patientName, setPatientName] = useState("");
  const [peerSummary, setPeerSummary] = useState<PeerEvalSummary | null>(null);
  const [debrief, setDebrief] = useState<Debrief | null>(null);

  // Casos do novo formato dizem com quem o aluno falou em cada encontro (prescritor, equipe, cuidador); os demais, paciente.
  const interlocutorLabel = (encounter: number) => {
    const e = debrief?.encontros?.find((x) => x.numero === encounter);
    if (!e) return "Paciente";
    if (e.interlocutor === "prescritor") return e.nome ? `Prescritor (${e.nome})` : "Prescritor";
    if (e.interlocutor === "equipe") return e.nome ? `Equipe (${e.nome})` : "Equipe";
    if (e.interlocutor === "cuidador") return "Cuidador";
    return "Paciente";
  };

  useEffect(() => {
    load();
  }, [cvpId]);

  // Enquanto a correção do treino não termina, consulta de novo a cada 5 s (até cerca de 3 minutos).
  useEffect(() => {
    if (!aguardando || loading || grade?.feedback_released || tentativas >= 36) return;
    const t = setTimeout(() => { setTentativas((n) => n + 1); load(true); }, 5000);
    return () => clearTimeout(t);
  }, [aguardando, loading, grade, tentativas]);

  const load = async (quiet = false) => {
    const email = (sessionStorage.getItem("vp_email") || "").trim().toLowerCase();
    if (!cvpId || !email) {
      toast.error("Sessão expirada. Acesse novamente com seu PIN e e-mail.");
      navigate("/student/auth");
      return;
    }
    if (!quiet) setLoading(true);

    // Tipo da atividade (treino ou avaliativo). Consulta tolerante a erro.
    const { data: modeData, error: modeErr } = await (supabase as any)
      .from("class_virtual_patients")
      .select("mode, dificuldade")
      .eq("id", cvpId)
      .maybeSingle();
    if (!modeErr && modeData) setModo({ mode: modeData.mode || "avaliativo", dificuldade: modeData.dificuldade ?? null });

    // Buscar a sessão do aluno neste paciente virtual
    const { data: session } = await supabase
      .from("virtual_patient_sessions")
      .select("id, student_name, group_id, patient_id")
      .eq("class_virtual_patient_id", cvpId)
      .ilike("student_email", email)
      .maybeSingle();

    if (!session) {
      toast.error("Você não tem registro de atendimento neste paciente virtual.");
      navigate("/student/auth");
      return;
    }
    setStudentName(session.student_name || "");
    setPatientName(session.patient_id || "");

    if (session.group_id && cvpId) {
      const { data: summary } = await supabase.functions.invoke("vp-peer-eval-summary", {
        body: { class_virtual_patient_id: cvpId, email },
      });
      if (summary && !summary.error) setPeerSummary(summary as PeerEvalSummary);
    }

    // Buscar a nota — pode estar na própria sessão OU em qualquer membro do grupo
    let { data: gradeData } = await supabase
      .from("virtual_patient_grades")
      .select("id, session_id, subscores, bonus_penalidades, nota_final, nota_microlearning, feedback_resumido, orientacoes_melhoria, flags_seguranca, feedback_released")
      .eq("session_id", session.id)
      .maybeSingle();

    let primarySessionId = session.id;

    if ((!gradeData || !gradeData.feedback_released) && session.group_id) {
      const { data: siblings } = await supabase
        .from("virtual_patient_sessions")
        .select("id, created_at")
        .eq("group_id", session.group_id)
        .order("created_at", { ascending: true });
      const sibIds = (siblings || []).map((s: any) => s.id);
      if (sibIds.length > 0) {
        const { data: groupGrades } = await supabase
          .from("virtual_patient_grades")
          .select("id, session_id, subscores, bonus_penalidades, nota_final, nota_microlearning, feedback_resumido, orientacoes_melhoria, flags_seguranca, feedback_released")
          .in("session_id", sibIds);
        const released = (groupGrades || []).find((g: any) => g.feedback_released);
        if (released) gradeData = released as any;
        // Encontrar a sessão primária com mensagens
        primarySessionId = (siblings && siblings[0]?.id) || session.id;
      }
    }

    if (!gradeData) {
      setGrade(null);
      setLoading(false);
      return;
    }
    if (!gradeData.feedback_released) {
      setGrade({ ...(gradeData as any), feedback_released: false });
      setLoading(false);
      return;
    }
    setGrade(gradeData as any);

    // MAI
    const { data: maiRow } = await supabase
      .from("virtual_patient_mai_scores")
      .select("mai_json")
      .eq("session_id", gradeData.session_id)
      .maybeSingle();
    setMai(maiRow?.mai_json || null);

    // Conversa: buscar mensagens da sessão primária do grupo (ou da sessão)
    const sourceId = session.group_id ? primarySessionId : session.id;
    const { data: msgs } = await supabase
      .from("virtual_patient_messages")
      .select("role, content, encounter")
      .eq("session_id", sourceId)
      .order("created_at", { ascending: true });
    setTranscript((msgs as Msg[]) || []);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Treino recém-concluído: a correção está rodando; mostra o andamento em vez de "feedback indisponível".
  if (aguardando && (!grade || !grade.feedback_released) && tentativas < 36) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-highlight" />
            <h2 className="font-heading text-xl font-medium">Gerando o seu feedback…</h2>
            <p className="text-sm text-muted-foreground">
              Atendimento concluído. A correção leva cerca de 1 minuto. Esta tela atualiza sozinha; não feche a página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!grade) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <Stethoscope className="h-10 w-10 mx-auto text-muted-foreground" />
            <h2 className="font-heading text-xl font-medium">Feedback ainda não disponível</h2>
            <p className="text-sm text-muted-foreground">
              Seu professor ainda não corrigiu ou liberou o feedback deste atendimento. Tente novamente mais tarde.
            </p>
            <Button onClick={() => navigate("/student/auth")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!grade.feedback_released) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <Stethoscope className="h-10 w-10 mx-auto text-muted-foreground" />
            <h2 className="font-heading text-xl font-medium">Feedback aguardando liberação</h2>
            <p className="text-sm text-muted-foreground">
              Seu atendimento já foi corrigido, mas o professor ainda não liberou o feedback para visualização.
            </p>
            <Button onClick={() => navigate("/student/auth")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const baseWithMicroBonus = finalWithBonus(grade.nota_final, grade.nota_microlearning);
  const bonus = microBonus(grade.nota_microlearning);
  const peerBonus = peerSummary?.count ? peerSummary.bonus : 0;
  const finalScore = Math.max(0, Math.min(10, baseWithMicroBonus + peerBonus));
  const flags = Array.isArray(grade.flags_seguranca) ? grade.flags_seguranca : [];
  const aprovado = finalScore >= 6;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4 md:px-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/student/auth")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
            {modo && (modo.mode === "treino" ? (
              <StatusBadge tone="info">
                Treino{modo.dificuldade ? ` · ${({ facil: "Fácil", medio: "Médio", dificil: "Difícil" } as Record<string, string>)[modo.dificuldade] || modo.dificuldade}` : ""}
              </StatusBadge>
            ) : (
              <StatusBadge tone="brand">Avaliativo</StatusBadge>
            ))}
            {studentName && <span className="hidden text-sm text-muted-foreground sm:inline">{studentName}</span>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-8">
        {/* Nota final */}
        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 items-center gap-6 bg-gradient-to-br from-brand-soft to-card p-6 sm:grid-cols-[auto_minmax(0,1fr)] md:p-8">
            <ScoreRing
              value={finalScore / 10}
              size={132}
              stroke={10}
              tone={aprovado ? "ok" : "bad"}
              label={finalScore.toFixed(1).replace(".", ",")}
              aria-label={`Nota final ${finalScore.toFixed(1)} de 10`}
            />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-accent-ink" />
                <span className="eyebrow">Nota final do atendimento</span>
              </div>
              <h1 className="font-heading text-[1.75rem] font-medium leading-tight">
                {aprovado ? "Bom atendimento" : "Há pontos importantes a rever"}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>Base <b className="font-mono font-medium text-foreground">{(grade.nota_final || 0).toFixed(2)}</b></span>
                <span>Eficiência clínica <b className="font-mono font-medium text-foreground">+{bonus.toFixed(2)}</b></span>
                {peerSummary?.count ? (
                  <span>Pares <b className="font-mono font-medium text-foreground">{peerBonus >= 0 ? "+" : ""}{peerBonus.toFixed(2)}</b></span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Eficiência clínica: {(grade.nota_microlearning || 0).toFixed(1)} / 5
              </p>
            </div>
          </div>
        </Card>

        {/* Flags de Segurança: logo após a nota, porque são o que o aluno mais precisa ver */}
        {flags.length > 0 && (
          <div className="flex gap-3 rounded-card border border-destructive/30 bg-destructive-soft p-4 md:p-5">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-destructive">Pontos críticos de segurança</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {flags.map((f: any, i: number) => <li key={i}>{String(f)}</li>)}
              </ul>
            </div>
          </div>
        )}

        {/* Avaliação entre pares */}
        {peerSummary && peerSummary.count > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" /> Avaliação entre Pares
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Média das notas dadas por {peerSummary.count} colega{peerSummary.count > 1 ? "s" : ""} de grupo
                (as respostas individuais não são identificadas). Isso ajusta sua nota final em até{" "}
                {PEER_EVAL_MAX_ADJUST.toFixed(1)} ponto{PEER_EVAL_MAX_ADJUST !== 1 ? "s" : ""}.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  ["Participação", peerSummary.participacao_avg],
                  ["Contribuição técnica", peerSummary.contribuicao_avg],
                  ["Colaboração", peerSummary.colaboracao_avg],
                ].map(([rotulo, valor]) => (
                  <div key={rotulo as string} className="rounded-lg border bg-sunken/40 p-4">
                    <p className="label-mono">{rotulo}</p>
                    <p className="num mt-2 text-2xl">
                      {(Number(valor) || 0).toFixed(1).replace(".", ",")}
                      <span className="text-sm text-muted-foreground"> / 5</span>
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscores */}
        {grade.subscores && Object.keys(grade.subscores).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhamento por critério</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {Object.entries(SUBSCORE_LABELS).map(([k, label]) => (
                <div key={k} className="flex items-center justify-between py-2.5 text-sm first:pt-0 last:pb-0">
                  <span>{label}</span>
                  <span className="font-mono font-medium tabular-nums">{(Number(grade.subscores?.[k]) || 0).toFixed(2)}</span>
                </div>
              ))}
              {hasFichaScores(grade.subscores) && FICHA_KEYS.map((k) => (
                <div key={k} className="flex items-center justify-between py-2.5 text-sm last:pb-0">
                  <span>Ficha · {FICHA_LABELS[k]}</span>
                  <span className="font-mono font-medium tabular-nums">{(Number(grade.subscores?.[k]) || 0).toFixed(2)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Feedback qualitativo */}
        {grade.feedback_resumido && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feedback do Professor (IA Tutor)</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(grade.feedback_resumido) }}
              />
            </CardContent>
          </Card>
        )}

        {grade.orientacoes_melhoria && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Orientações de melhoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(grade.orientacoes_melhoria) }}
              />
            </CardContent>
          </Card>
        )}

        {/* Caminho esperado do caso (só casos com gabarito; já liberado junto com o feedback) */}
        {cvpId && <DebriefCard cvpId={cvpId} email={(sessionStorage.getItem("vp_email") || "").trim().toLowerCase()} onLoaded={setDebrief} />}

        {/* MAI */}
        {mai && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Pill className="h-4 w-4 text-primary" /> Avaliação MAI (Medication Appropriateness Index)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(mai?.medications) && mai.medications.length > 0 ? (
                <div className="space-y-4">
                  {mai.medications.map((med: any, idx: number) => (
                    <div key={idx} className="rounded-lg border p-3.5">
                      <div className="mb-2 flex items-center justify-between">
                        <strong className="text-sm font-medium">{med.name || `Medicamento ${idx + 1}`}</strong>
                        {typeof med.score === "number" && <Badge>{med.score.toFixed(1)}</Badge>}
                      </div>
                      {med.justification && (
                        <p className="text-xs text-muted-foreground">{med.justification}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : maiMeds(mai).length > 0 ? (
                <div className="space-y-4">
                  {maiMeds(mai).map((med, idx) => (
                    <div key={idx} className="overflow-hidden rounded-lg border">
                      <div className="flex items-center justify-between gap-2 bg-sunken px-4 py-2.5">
                        <strong className="text-sm font-medium">{med.medication_name || `Medicamento ${idx + 1}`}</strong>
                        {typeof med.score === "number" && <StatusBadge tone="neutral">Soma {med.score}</StatusBadge>}
                      </div>
                      <ul className="divide-y text-sm">
                        {MAI_CRITERIA.map(([k, label]) => {
                          const v = MAI_ANSWER[String(med.answers?.[k] ?? "")];
                          if (!v) return null;
                          return (
                            <li key={k} className="flex items-center justify-between gap-2 px-4 py-2">
                              <span className="text-muted-foreground">{label}</span>
                              <StatusBadge tone={v.tone}>{v.label}</StatusBadge>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Cada critério é marcado como apropriado, marginalmente apropriado ou inapropriado. A soma mostra o que você concluiu sobre o medicamento (quanto menor, mais apropriado).
                  </p>
                </div>
              ) : (
                <pre className="text-xs whitespace-pre-wrap text-muted-foreground">{JSON.stringify(mai, null, 2)}</pre>
              )}
            </CardContent>
          </Card>
        )}

        {/* Conversa */}
        {transcript.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" /> Conversa com o Paciente Virtual
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[600px] space-y-3 overflow-y-auto">
              {transcript.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] p-3.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "rounded-2xl rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-2xl rounded-bl-sm border bg-card"
                    }`}
                  >
                    <div className="mb-1 text-[10px] opacity-70">
                      {m.role === "user" ? `Você (${PROFISSAO_ROTULO[debrief?.profissao || ""] || "farmacêutico"})` : interlocutorLabel(m.encounter)} • Encontro {m.encounter}
                    </div>
                    <div
                      dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(m.content) }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
