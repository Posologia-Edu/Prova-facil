import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Clock, FileText, Users, Stethoscope, Eye, GraduationCap, Send, Play, Square, ChevronRight, RefreshCw, BookOpen, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { generateRounds } from "@/lib/simulation-distribution";

type FormField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "radio" | "checkbox" | "scale";
  options?: string[];
  max_score?: number;
};

const normalizeParticipantEmail = (value: string) => value.trim().toLowerCase();
const normalizeAccessCode = (value: string) => value.trim().toLowerCase();

export default function SimulationJoin() {
  const { t } = useLanguage();
  const [pin, setPin] = useState(() => sessionStorage.getItem("sim_pin") || "");
  const [email, setEmail] = useState(() => sessionStorage.getItem("sim_email") || "");
  const [joined, setJoined] = useState(false);
  const [room, setRoom] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [activeRound, setActiveRound] = useState<any>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [forms, setForms] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [feedback, setFeedback] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [allRounds, setAllRounds] = useState<any[]>([]);
  const [completedResponses, setCompletedResponses] = useState<any[]>([]);
  const [allParticipants, setAllParticipants] = useState<any[]>([]);
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const [materialsReady, setMaterialsReady] = useState(false);
  const [studentsReady, setStudentsReady] = useState<string[]>([]);

  // Auto-join if redirected from StudentAuth
  useEffect(() => {
    const savedPin = sessionStorage.getItem("sim_pin");
    const savedEmail = sessionStorage.getItem("sim_email");
    if (savedPin && savedEmail) {
      sessionStorage.removeItem("sim_pin");
      sessionStorage.removeItem("sim_email");
      setTimeout(() => {
        joinRoomWithCredentials(savedPin, savedEmail);
      }, 100);
    }
  }, []);

  const joinRoomWithCredentials = async (pinVal: string, emailVal: string) => {
    const normalizedPin = normalizeAccessCode(pinVal);
    const normalizedEmail = normalizeParticipantEmail(emailVal);

    const { data: roomData, error: roomErr } = await supabase
      .from("simulation_rooms")
      .select("*")
      .eq("access_code", normalizedPin)
      .maybeSingle();

    if (roomErr || !roomData) {
      toast({ title: t("student_error"), description: t("sim_room_not_found"), variant: "destructive" });
      return;
    }

    const { data: participantsData, error: participantsErr } = await supabase
      .from("simulation_participants")
      .select("*")
      .eq("room_id", roomData.id);

    if (participantsErr) {
      toast({ title: t("student_error"), description: t("student_connection_error"), variant: "destructive" });
      return;
    }

    const matchedParticipant = (participantsData || []).find(
      (currentParticipant: any) => normalizeParticipantEmail(currentParticipant.student_email || "") === normalizedEmail
    );

    if (!matchedParticipant) {
      toast({ title: t("student_access_denied"), description: t("sim_not_registered"), variant: "destructive" });
      return;
    }

    const { data: formsData } = await supabase
      .from("simulation_forms")
      .select("*")
      .eq("room_id", roomData.id);

    setPin(normalizedPin);
    setEmail(normalizedEmail);
    setRoom(roomData);
    setParticipant(matchedParticipant);
    setForms(formsData || []);
    setAllParticipants(participantsData || []);
    setJoined(true);
  };

  const joinRoom = async () => {
    await joinRoomWithCredentials(pin, email);
  };

  const isProfessor = participant?.participant_role === "professor";

  // Poll for active round & all rounds
  useEffect(() => {
    if (!joined || !room) return;
    const poll = async () => {
      const { data: roundsAll } = await supabase
        .from("simulation_rounds")
        .select("*")
        .eq("room_id", room.id)
        .order("round_number", { ascending: true });
      setAllRounds(roundsAll || []);

      // Load all assignments for all rounds
      if (roundsAll && roundsAll.length > 0) {
        const roundIds = roundsAll.map((r: any) => r.id);
        const { data: assignsAll } = await supabase
          .from("simulation_round_assignments")
          .select("*")
          .in("round_id", roundIds);
        setAllAssignments(assignsAll || []);
      }

      const activeR = roundsAll?.find((r: any) => r.status === "active") || null;
      setActiveRound(activeR);

      if (activeR && participant) {
        const { data: assigns } = await supabase
          .from("simulation_round_assignments")
          .select("*")
          .eq("round_id", activeR.id)
          .eq("participant_id", participant.id)
          .limit(1);
        setAssignment(assigns?.[0] || null);

        const { data: resp } = await supabase
          .from("simulation_responses")
          .select("*")
          .eq("round_id", activeR.id)
          .eq("participant_id", participant.id)
          .not("submitted_at", "is", null)
          .limit(1);
        setSubmitted(!!resp?.length);
      } else {
        setAssignment(null);
        setSubmitted(false);
      }

      // Load completed round responses for professor
      if (isProfessor) {
        const completedRounds = (roundsAll || []).filter((r: any) => r.status === "completed");
        if (completedRounds.length > 0) {
          const roundIds = completedRounds.map((r: any) => r.id);
          const { data: responses } = await supabase
            .from("simulation_responses")
            .select("*")
            .in("round_id", roundIds);
          setCompletedResponses(responses || []);
        }
      }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [joined, room, participant, isProfessor]);

  // Timer
  useEffect(() => {
    if (!activeRound?.started_at || !room?.duration_minutes) {
      setTimeLeft(null);
      return;
    }
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(activeRound.started_at).getTime()) / 1000);
      const remaining = room.duration_minutes * 60 - elapsed;
      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeRound, room]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const getFormForRole = (): any | null => {
    if (!assignment) return null;
    const roleFormMap: Record<string, string> = {
      professional: "anamnesis",
      patient: "patient_script",
      observer: "observer_eval",
      professor: "professor_eval",
    };
    const formType = roleFormMap[assignment.assigned_role];
    return forms.find((f: any) => f.form_type === formType) || null;
  };

  const submitForm = async () => {
    if (!activeRound || !participant || !assignment) return;
    const form = getFormForRole();
    if (!form) return;

    let score = 0;
    if (form.form_type === "observer_eval" || form.form_type === "professor_eval") {
      const fields = form.content_json as FormField[];
      fields.forEach((field) => {
        if (field.max_score && answers[field.id]) {
          score += Number(answers[field.id]) || 0;
        }
      });
    }

    const { error } = await supabase.from("simulation_responses").insert({
      round_id: activeRound.id,
      participant_id: participant.id,
      form_id: form.id,
      answers_json: { ...answers, _feedback: feedback },
      score,
      submitted_at: new Date().toISOString(),
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
      toast({ title: t("sim_submitted") });
    }
  };

  // Determine if current round is first round of its cycle
  const isFirstRoundOfCycle = (round: any) => {
    if (!round) return false;
    const sameRoundsInCycle = allRounds.filter((r: any) => r.cycle === round.cycle);
    sameRoundsInCycle.sort((a: any, b: any) => a.round_number - b.round_number);
    return sameRoundsInCycle.length > 0 && sameRoundsInCycle[0].id === round.id;
  };

  // Check if the next pending round needs material release
  const nextPendingRound = allRounds.find((r: any) => r.status === "pending");
  const needsMaterialRelease = nextPendingRound && isFirstRoundOfCycle(nextPendingRound) && !nextPendingRound.materials_released;

  // Professor: release materials
  const releaseMaterials = async () => {
    if (!nextPendingRound) return;
    await supabase.from("simulation_rounds").update({
      materials_released: true,
    }).eq("id", nextPendingRound.id);
    toast({ title: t("sim_materials_released") });
  };

  // Professor: start simulation (release round after materials)
  const releaseRound = async () => {
    if (!nextPendingRound) return;
    await supabase.from("simulation_rounds").update({
      status: "active",
      started_at: new Date().toISOString(),
      released_by: participant?.student_name || "professor",
    }).eq("id", nextPendingRound.id);
    setAnswers({});
    setFeedback("");
    toast({ title: t("sim_round_released") });
  };

  const endRound = async () => {
    if (!activeRound) return;
    // Check if professor submitted evaluation
    if (isProfessor && !submitted) {
      toast({ title: t("sim_must_submit_first"), variant: "destructive" });
      return;
    }
    await supabase.from("simulation_rounds").update({
      status: "completed",
      finished_at: new Date().toISOString(),
    }).eq("id", activeRound.id);
    toast({ title: t("sim_round_ended") });
  };

  // Student: mark materials as studied
  const markMaterialsReady = () => {
    if (participant) {
      setMaterialsReady(true);
      // Store locally - in a real scenario this could be saved to DB
    }
  };

  const [generatingRounds, setGeneratingRounds] = useState(false);

  const generateRoundsForRoom = async () => {
    if (!room || !allParticipants.length) return;
    setGeneratingRounds(true);
    try {
      const students = allParticipants.filter((p: any) => p.participant_role === "student");
      const pairsMap: Record<number, any[]> = {};
      students.forEach((s: any) => {
        if (!pairsMap[s.pair_index]) pairsMap[s.pair_index] = [];
        pairsMap[s.pair_index].push(s);
      });
      const pairsList = Object.values(pairsMap).filter(p => p.length >= 2);

      if (pairsList.length === 0) {
        toast({ title: "Erro", description: "É necessário pelo menos uma dupla de alunos.", variant: "destructive" });
        return;
      }

      const rounds = generateRounds(pairsList);

      for (const round of rounds) {
        const { data: roundData, error: roundError } = await supabase
          .from("simulation_rounds")
          .insert({
            room_id: room.id,
            round_number: round.roundNumber,
            cycle: round.cycle,
            status: "pending",
          })
          .select()
          .single();
        if (roundError) continue;

        const assignments = round.assignments.map((a: any) => ({
          round_id: roundData.id,
          participant_id: a.participantId,
          assigned_role: a.role,
          pair_index: a.pairIndex,
        }));
        await supabase.from("simulation_round_assignments").insert(assignments);
      }

      if (room.status === "draft") {
        await supabase.from("simulation_rooms").update({ status: "active" }).eq("id", room.id);
      }

      toast({ title: t("sim_started") || "Rodadas geradas com sucesso!" });
    } catch (err) {
      toast({ title: "Erro", description: "Falha ao gerar rodadas.", variant: "destructive" });
    } finally {
      setGeneratingRounds(false);
    }
  };

  const roleIcons: Record<string, any> = {
    professional: Stethoscope,
    patient: Users,
    observer: Eye,
    professor: GraduationCap,
  };

  const roleLabels: Record<string, string> = {
    professional: t("sim_role_professional"),
    patient: t("sim_role_patient"),
    observer: t("sim_role_observer"),
    professor: t("sim_professor"),
  };

  const roleBadgeColors: Record<string, string> = {
    professional: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    patient: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    observer: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  };

  const getParticipantName = (id: string) => allParticipants.find((p: any) => p.id === id)?.student_name || id;

  // Get assignments for a specific round
  const getAssignmentsForRound = (roundId: string) => {
    return allAssignments.filter((a: any) => a.round_id === roundId);
  };

  const renderResponseReadOnly = (response: any) => {
    const anamnesisForm = forms.find((f: any) => f.form_type === "anamnesis");
    if (!anamnesisForm) return <p className="text-sm text-muted-foreground">{t("sim_no_script")}</p>;

    const fields = anamnesisForm.content_json as FormField[];
    const answersData = response.answers_json as Record<string, any>;

    return (
      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.id} className="space-y-1">
            <p className="text-sm font-medium text-foreground">{field.label}</p>
            <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
              {Array.isArray(answersData[field.id])
                ? answersData[field.id].join(", ")
                : answersData[field.id] || "—"}
            </p>
          </div>
        ))}
        {answersData._feedback && (
          <div className="space-y-1 border-t pt-2">
            <p className="text-sm font-medium text-foreground">{t("sim_feedback_label")}</p>
            <p className="text-sm text-muted-foreground bg-muted p-2 rounded">{answersData._feedback}</p>
          </div>
        )}
      </div>
    );
  };

  // Render participant list for a round
  const renderRoundParticipants = (roundId: string) => {
    const roundAssignments = getAssignmentsForRound(roundId);
    if (roundAssignments.length === 0) return null;

    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{t("sim_participants_in_round")}</p>
        <div className="space-y-1">
          {roundAssignments.map((a: any) => {
            const Icon = roleIcons[a.assigned_role] || Users;
            return (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{getParticipantName(a.participant_id)}</span>
                <Badge variant="outline" className={`text-xs ${roleBadgeColors[a.assigned_role] || ""}`}>
                  {roleLabels[a.assigned_role] || a.assigned_role}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Login screen
  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Stethoscope className="h-10 w-10 mx-auto text-primary mb-2" />
            <CardTitle>{t("sim_join_title")}</CardTitle>
            <CardDescription>{t("sim_join_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("student_email_label")}</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>PIN</Label>
              <Input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="abc123" className="font-mono text-center text-lg" />
            </div>
            <Button onClick={joinRoom} className="w-full" disabled={!pin || !email}>
              {t("student_access_btn")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const RoleIcon = assignment ? roleIcons[assignment.assigned_role] || Users : Users;
  const form = getFormForRole();
  const isActive = !!activeRound;
  const canFill = isActive && !submitted && assignment?.assigned_role !== "patient";
  const completedRoundsList = allRounds.filter((r: any) => r.status === "completed");

  // Check if student participates in active round
  const participatesInActiveRound = isActive && !!assignment;

  // Material release stage check
  const isMaterialStage = isActive && activeRound && !activeRound.started_at && activeRound.materials_released;
  // Actually, we need a different approach: materials_released=true but round status is still "pending" means material stage
  // When professor clicks "start simulation" it becomes "active"
  // Let me rethink: the round has status "pending" → professor releases materials → materials_released=true, status still "pending"
  // → professor starts simulation → status becomes "active", started_at set
  // But we already use "active" status... Let me handle it differently:
  // The material release phase is when the next pending round needs materials AND materials are released but round not started yet

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{room?.title}</h1>
          <p className="text-sm text-muted-foreground">{participant?.student_name}</p>
        </div>
        <div className="flex items-center gap-3">
          {isProfessor && (
            <Badge variant="secondary" className="text-sm py-1 px-3 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              <GraduationCap className="h-4 w-4 mr-1" />
              {t("sim_professor")}
            </Badge>
          )}
          {assignment && !isProfessor && (
            <Badge className="text-sm py-1 px-3">
              <RoleIcon className="h-4 w-4 mr-1" />
              {roleLabels[assignment.assigned_role]}
            </Badge>
          )}
          {timeLeft !== null && (
            <span className={`font-mono text-xl font-bold ${timeLeft <= 60 ? "text-destructive" : "text-foreground"}`}>
              {formatTime(timeLeft)}
            </span>
          )}
        </div>
      </div>

      {/* Professor Controls */}
      {isProfessor && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("sim_round")} — {t("sim_professor")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t("sim_round")}: {activeRound?.round_number || nextPendingRound?.round_number || "—"}</span>
              <span>•</span>
              <span>{t("sim_cycle")}: {activeRound?.cycle || nextPendingRound?.cycle || "—"}</span>
            </div>

            {/* Show participants for current/next round */}
            {(activeRound || nextPendingRound) && renderRoundParticipants((activeRound || nextPendingRound).id)}

            <div className="flex gap-2">
              {/* Material release stage - first round of cycle only */}
              {!isActive && nextPendingRound && needsMaterialRelease && (
                <Button onClick={releaseMaterials} className="flex-1" variant="outline">
                  <BookOpen className="h-4 w-4 mr-1" />{t("sim_release_materials")}
                </Button>
              )}
              {/* Start simulation - after materials released OR not first round of cycle */}
              {!isActive && nextPendingRound && !needsMaterialRelease && (
                <Button onClick={releaseRound} className="flex-1">
                  <Play className="h-4 w-4 mr-1" />{t("sim_start_simulation")} — {t("sim_round")} {nextPendingRound.round_number}
                </Button>
              )}
              {isActive && (
                <Button onClick={endRound} variant="destructive" className="flex-1">
                  <Square className="h-4 w-4 mr-1" />{t("sim_end_round")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Waiting state for students: no active round */}
      {!isActive && !isProfessor && !nextPendingRound?.materials_released && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground/50 mb-4 animate-pulse" />
            <h3 className="text-lg font-medium">{t("sim_waiting_professor")}</h3>
            <p className="text-sm text-muted-foreground">{t("sim_waiting_desc")}</p>
          </CardContent>
        </Card>
      )}

      {/* Material study phase for students */}
      {!isActive && !isProfessor && nextPendingRound?.materials_released && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {t("sim_release_materials")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show all forms for study */}
            {forms.map((form: any) => {
              const fields = form.content_json as FormField[];
              return (
                <div key={form.id} className="border rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium">{form.title || form.form_type}</p>
                  {fields.map((field) => (
                    <p key={field.id} className="text-sm text-muted-foreground">• {field.label}</p>
                  ))}
                </div>
              );
            })}
            {!materialsReady ? (
              <Button onClick={markMaterialsReady} className="w-full">
                <CheckCircle className="h-4 w-4 mr-1" />{t("sim_materials_ready")}
              </Button>
            ) : (
              <div className="flex flex-col items-center py-4">
                <CheckCircle className="h-8 w-8 text-primary mb-2" />
                <p className="text-sm text-muted-foreground">{t("sim_waiting_professor")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Student not participating in active round */}
      {isActive && !isProfessor && !participatesInActiveRound && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground/50 mb-4 animate-pulse" />
            <h3 className="text-lg font-medium">{t("sim_waiting_your_round")}</h3>
          </CardContent>
        </Card>
      )}

      {/* Waiting state (professor, no rounds - need to generate) */}
      {!isActive && isProfessor && !nextPendingRound && allRounds.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
            <RefreshCw className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">{"Nenhuma rodada encontrada. Gere as rodadas para iniciar a simulação."}</p>
            <Button onClick={generateRoundsForRoom} disabled={generatingRounds}>
              {generatingRounds ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
              {"Gerar Rodadas"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* All rounds completed */}
      {!isActive && isProfessor && !nextPendingRound && allRounds.length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground">{t("sim_all_rounds_completed")}</p>
          </CardContent>
        </Card>
      )}

      {/* Submitted state */}
      {submitted && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Send className="h-10 w-10 text-primary mb-3" />
            <h3 className="text-lg font-medium">{t("sim_submitted")}</h3>
            <p className="text-sm text-muted-foreground">{t("sim_waiting_next_round")}</p>
          </CardContent>
        </Card>
      )}

      {/* Professor evaluation form during active round */}
      {isActive && !submitted && isProfessor && (
        (() => {
          const profForm = forms.find((f: any) => f.form_type === "professor_eval");
          if (!profForm) return null;
          const fields = profForm.content_json as FormField[];
          return (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {profForm.title || t("sim_form_professor_eval")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label className="font-medium">
                      {field.label}
                      {field.max_score ? <span className="text-muted-foreground ml-2">({field.max_score} pts)</span> : null}
                    </Label>
                    {field.type === "text" && (
                      <Input value={answers[field.id] || ""} onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })} />
                    )}
                    {field.type === "textarea" && (
                      <Textarea value={answers[field.id] || ""} onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })} rows={4} />
                    )}
                    {field.type === "radio" && field.options && (
                      <RadioGroup value={answers[field.id] || ""} onValueChange={(v) => setAnswers({ ...answers, [field.id]: v })}>
                        {field.options.map((opt) => (
                          <div key={opt} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt} id={`prof-${field.id}-${opt}`} />
                            <Label htmlFor={`prof-${field.id}-${opt}`}>{opt}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                    {field.type === "checkbox" && field.options && (
                      <div className="space-y-2">
                        {field.options.map((opt) => (
                          <div key={opt} className="flex items-center space-x-2">
                            <Checkbox
                              id={`prof-${field.id}-${opt}`}
                              checked={(answers[field.id] || []).includes(opt)}
                              onCheckedChange={(checked) => {
                                const current = answers[field.id] || [];
                                setAnswers({
                                  ...answers,
                                  [field.id]: checked ? [...current, opt] : current.filter((o: string) => o !== opt),
                                });
                              }}
                            />
                            <Label htmlFor={`prof-${field.id}-${opt}`}>{opt}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                    {field.type === "scale" && (
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[answers[field.id] || 0]}
                          onValueChange={([v]) => setAnswers({ ...answers, [field.id]: v })}
                          max={field.max_score || 10}
                          step={1}
                          className="flex-1"
                        />
                        <span className="font-mono text-sm w-12 text-right">{answers[field.id] || 0}/{field.max_score || 10}</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Feedback field */}
                <div className="space-y-2 border-t pt-4">
                  <Label className="font-medium">{t("sim_feedback_label")}</Label>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder={t("sim_feedback_placeholder")}
                    rows={4}
                  />
                </div>

                <Button onClick={async () => {
                  let score = 0;
                  fields.forEach((field) => {
                    if (field.max_score && answers[field.id]) score += Number(answers[field.id]) || 0;
                  });
                  const { error } = await supabase.from("simulation_responses").insert({
                    round_id: activeRound.id,
                    participant_id: participant.id,
                    form_id: profForm.id,
                    answers_json: { ...answers, _feedback: feedback },
                    score,
                    submitted_at: new Date().toISOString(),
                  });
                  if (error) {
                    toast({ title: "Erro", description: error.message, variant: "destructive" });
                  } else {
                    setSubmitted(true);
                    toast({ title: t("sim_submitted") });
                  }
                }} className="w-full mt-4">
                  <Send className="h-4 w-4 mr-2" />{t("sim_submit")}
                </Button>
              </CardContent>
            </Card>
          );
        })()
      )}

      {/* Non-professor form display */}
      {isActive && !submitted && !isProfessor && participatesInActiveRound && form && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {form.title || roleLabels[assignment?.assigned_role]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignment?.assigned_role === "patient" ? (
              <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                {(form.content_json as any)?.[0]?.label || t("sim_no_script")}
              </div>
            ) : (
              <>
                {(form.content_json as FormField[]).map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label className="font-medium">
                      {field.label}
                      {field.max_score ? <span className="text-muted-foreground ml-2">({field.max_score} pts)</span> : null}
                    </Label>
                    {field.type === "text" && (
                      <Input value={answers[field.id] || ""} onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })} disabled={!canFill} />
                    )}
                    {field.type === "textarea" && (
                      <Textarea value={answers[field.id] || ""} onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })} disabled={!canFill} rows={4} />
                    )}
                    {field.type === "radio" && field.options && (
                      <RadioGroup value={answers[field.id] || ""} onValueChange={(v) => setAnswers({ ...answers, [field.id]: v })} disabled={!canFill}>
                        {field.options.map((opt) => (
                          <div key={opt} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt} id={`${field.id}-${opt}`} />
                            <Label htmlFor={`${field.id}-${opt}`}>{opt}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                    {field.type === "checkbox" && field.options && (
                      <div className="space-y-2">
                        {field.options.map((opt) => (
                          <div key={opt} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${field.id}-${opt}`}
                              checked={(answers[field.id] || []).includes(opt)}
                              onCheckedChange={(checked) => {
                                const current = answers[field.id] || [];
                                setAnswers({
                                  ...answers,
                                  [field.id]: checked ? [...current, opt] : current.filter((o: string) => o !== opt),
                                });
                              }}
                              disabled={!canFill}
                            />
                            <Label htmlFor={`${field.id}-${opt}`}>{opt}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                    {field.type === "scale" && (
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[answers[field.id] || 0]}
                          onValueChange={([v]) => setAnswers({ ...answers, [field.id]: v })}
                          max={field.max_score || 10}
                          step={1}
                          disabled={!canFill}
                          className="flex-1"
                        />
                        <span className="font-mono text-sm w-12 text-right">{answers[field.id] || 0}/{field.max_score || 10}</span>
                      </div>
                    )}
                  </div>
                ))}
                <Button onClick={submitForm} disabled={!canFill} className="w-full mt-4">
                  <Send className="h-4 w-4 mr-2" />{t("sim_submit")}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Professor: View anamnesis responses after completed rounds */}
      {isProfessor && completedRoundsList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("sim_view_anamnesis")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {completedRoundsList.map((round) => {
                const anamnesisForm = forms.find((f: any) => f.form_type === "anamnesis");
                const roundResponses = completedResponses.filter(
                  (r: any) => r.round_id === round.id && r.form_id === anamnesisForm?.id
                );
                return (
                  <AccordionItem key={round.id} value={round.id}>
                    <AccordionTrigger className="text-sm">
                      {t("sim_round")} {round.round_number} — {t("sim_cycle")} {round.cycle}
                    </AccordionTrigger>
                    <AccordionContent>
                      {/* Show participants */}
                      <div className="mb-3">
                        {renderRoundParticipants(round.id)}
                      </div>
                      {roundResponses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma resposta de anamnese nesta rodada.</p>
                      ) : (
                        <div className="space-y-4">
                          {roundResponses.map((resp: any) => (
                            <div key={resp.id} className="border rounded-lg p-3 space-y-2">
                              <p className="text-sm font-medium text-primary">
                                <Stethoscope className="h-4 w-4 inline mr-1" />
                                {getParticipantName(resp.participant_id)}
                              </p>
                              {renderResponseReadOnly(resp)}
                            </div>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
