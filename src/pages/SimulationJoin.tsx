import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FormRenderer from "@/components/forms/FormRenderer";
import type { FormField } from "@/components/forms/types";
import ClinicalCaseContent from "@/components/ClinicalCaseContent";
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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, FileText, Users, Stethoscope, Eye, GraduationCap, Send, Play, Square, ChevronRight, RefreshCw, BookOpen, CheckCircle, Trash2, UserRound, PauseCircle, PlayCircle, UserCog, SkipForward } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { generateRounds } from "@/lib/simulation-distribution";
import {
  areCycleMaterialsReleased,
  canAccessCycleMaterials,
  getCycleCaseIndex,
  hasCycleStarted,
  getMaterialCycle,
  getPendingRoundsSorted,
  getStudyRole,
} from "@/lib/simulation-materials";
import SimulationPausedView from "@/components/simulation/SimulationPausedView";

// FormField type imported from @/components/forms/types

const normalizeParticipantEmail = (value: string) => value.trim().toLowerCase();
const normalizeAccessCode = (value: string) => value.trim().toLowerCase();
const shouldMarkParticipantAsJoined = (participantStatus: string, rounds: any[]) =>
  participantStatus === "waiting" &&
  !rounds.some((round: any) => round.materials_released || round.status === "active" || round.status === "completed");

export default function SimulationJoin() {
  const { t } = useLanguage();
  const navigate = useNavigate();
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
  const [redirectSeconds, setRedirectSeconds] = useState<number | null>(null);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);

  const pauseSimulation = async () => {
    if (!room?.id) return;
    const { error } = await supabase.from("simulation_rooms").update({ status: "paused" }).eq("id", room.id);
    setPauseDialogOpen(false);
    if (error) {
      toast({ title: "Erro ao pausar", description: error.message, variant: "destructive" });
      return;
    }
    setRoom((prev: any) => prev ? { ...prev, status: "paused" } : prev);
    toast({ title: "Simulação pausada", description: "Os alunos verão uma tela informando que a sessão continuará em outro dia." });
  };

  const resumeSimulation = async () => {
    if (!room?.id) return;
    const { error } = await supabase.from("simulation_rooms").update({ status: "active" }).eq("id", room.id);
    if (error) {
      toast({ title: "Erro ao retomar", description: error.message, variant: "destructive" });
      return;
    }
    setRoom((prev: any) => prev ? { ...prev, status: "active" } : prev);
    toast({ title: "Simulação retomada", description: "Você pode continuar a partir da próxima rodada pendente." });
  };

  const syncJoinedPresence = async (
    participantRecord: any,
    participantsData: any[],
    roundsData: any[],
  ) => {
    if (!participantRecord || !shouldMarkParticipantAsJoined(participantRecord.status, roundsData)) {
      return { participantRecord, participantsData };
    }

    const { error } = await supabase
      .from("simulation_participants")
      .update({ status: "joined" })
      .eq("id", participantRecord.id)
      .eq("status", "waiting");

    if (error) {
      return { participantRecord, participantsData };
    }

    const joinedParticipant = { ...participantRecord, status: "joined" };

    return {
      participantRecord: joinedParticipant,
      participantsData: participantsData.map((currentParticipant: any) =>
        currentParticipant.id === joinedParticipant.id ? joinedParticipant : currentParticipant
      ),
    };
  };

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
      // Check if PIN belongs to a virtual patient room and redirect
      const { data: vpRoom } = await supabase
        .from("class_virtual_patients")
        .select("id, class_id, patient_id, status")
        .eq("access_code", normalizedPin)
        .limit(1)
        .maybeSingle();

      if (vpRoom) {
        if (vpRoom.status !== "active") {
          toast({ title: t("student_error"), description: "Este paciente virtual ainda não foi ativado pelo professor.", variant: "destructive" });
          return;
        }
        const { data: studentInClass } = await supabase
          .from("class_students")
          .select("id, student_name")
          .eq("class_id", vpRoom.class_id)
          .ilike("student_email", normalizedEmail)
          .limit(1)
          .maybeSingle();

        if (!studentInClass) {
          toast({ title: t("student_access_denied"), description: "Seu e-mail não está cadastrado na turma vinculada a este paciente virtual.", variant: "destructive" });
          return;
        }

        sessionStorage.setItem("vp_email", normalizedEmail);
        sessionStorage.setItem("vp_student_name", studentInClass.student_name || "");
        sessionStorage.removeItem("vp_group_emails");
        sessionStorage.removeItem("vp_group_names");
        navigate(`/virtual-patients/room/${vpRoom.id}`);
        return;
      }

      toast({ title: t("student_error"), description: t("sim_room_not_found"), variant: "destructive" });
      return;
    }

    // Check if room is active (not draft)
    if (roomData.status === "draft") {
      toast({ title: t("student_error"), description: "Esta sala de simulação ainda não foi ativada pelo professor.", variant: "destructive" });
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

    const { data: roundsData } = await supabase
      .from("simulation_rounds")
      .select("id, status, materials_released")
      .eq("room_id", roomData.id);

    const syncedPresence = await syncJoinedPresence(matchedParticipant, participantsData || [], roundsData || []);
    const participantForSession = syncedPresence.participantRecord;
    const participantsForSession = syncedPresence.participantsData;

    const { data: formsData } = await supabase
      .from("simulation_forms")
      .select("*")
      .eq("room_id", roomData.id);

    setPin(normalizedPin);
    setEmail(normalizedEmail);
    setRoom(roomData);
    setParticipant(participantForSession);
    setForms(formsData || []);
    setAllParticipants(participantsForSession || []);
    setMaterialsReady(participantForSession?.status === "ready");
    setJoined(true);
  };

  const joinRoom = async () => {
    await joinRoomWithCredentials(pin, email);
  };

  const isProfessor = participant?.participant_role === "professor";

  // Poll for active round, all rounds, and participants
  useEffect(() => {
    if (!joined || !room) return;
    const poll = async () => {
      const { data: roundsAll } = await supabase
        .from("simulation_rounds")
        .select("*")
        .eq("room_id", room.id)
        .order("round_number", { ascending: true });
      setAllRounds(roundsAll || []);

      const { data: participantsDataRaw } = await supabase
        .from("simulation_participants")
        .select("*")
        .eq("room_id", room.id);

      const currentParticipant = (participantsDataRaw || []).find((currentParticipant: any) => {
        if (participant?.id) return currentParticipant.id === participant.id;
        return normalizeParticipantEmail(currentParticipant.student_email || "") === normalizeParticipantEmail(email);
      });

      const syncedPresence = await syncJoinedPresence(currentParticipant, participantsDataRaw || [], roundsAll || []);
      const participantsData = syncedPresence.participantsData;
      const refreshedParticipant = syncedPresence.participantRecord;

      setAllParticipants(participantsData || []);

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
      const { computeFieldScore } = await import("@/components/forms/types");
      fields.forEach((field) => {
        if (field.max_score && answers[field.id]) {
          score += computeFieldScore(field, answers[field.id]);
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

  const pendingRounds = getPendingRoundsSorted(allRounds);
  const nextPendingRound = pendingRounds[0] || null;
  const materialCycle = getMaterialCycle(allRounds, activeRound);
  const materialCycleRounds = allRounds.filter((round: any) => round.cycle === materialCycle);
  const materialCycleRoundIds = materialCycleRounds.map((round: any) => round.id);
  const cycleMaterialsReleased = areCycleMaterialsReleased(allRounds, materialCycle);
  const cycleAlreadyStarted = hasCycleStarted(allRounds, materialCycle);
  const canSeeCycleMaterials = canAccessCycleMaterials(
    allRounds,
    allAssignments,
    materialCycle,
    materialCycleRoundIds,
    participant?.id,
    participant?.pair_index,
    activeRound,
  );
  const needsMaterialRelease =
    !activeRound &&
    !!nextPendingRound &&
    materialCycleRounds.length > 0 &&
    !cycleMaterialsReleased &&
    !cycleAlreadyStarted;

  // Professor: release materials for ALL rounds in the cycle
  const releaseMaterials = async () => {
    if (materialCycleRoundIds.length > 0) {
      await Promise.all([
        supabase.from("simulation_rounds").update({
          materials_released: true,
        }).in("id", materialCycleRoundIds),
        supabase
          .from("simulation_participants")
          .update({ status: "waiting" })
          .eq("room_id", room.id)
          .eq("participant_role", "student"),
        supabase
          .from("simulation_rooms")
          .update({ current_cycle: materialCycle, current_round: 0, status: "active" })
          .eq("id", room.id),
      ]);
    }
    setMaterialsReady(false);
    toast({ title: t("sim_materials_released") });
  };

  // Professor: start simulation (release round after materials)
  const releaseRound = async () => {
    if (!nextPendingRound) return;
    await Promise.all([
      supabase.from("simulation_rounds").update({
        status: "active",
        started_at: new Date().toISOString(),
        released_by: participant?.student_name || "professor",
      }).eq("id", nextPendingRound.id),
      supabase
        .from("simulation_rooms")
        .update({ current_cycle: nextPendingRound.cycle, current_round: nextPendingRound.round_number, status: "active" })
        .eq("id", room.id),
    ]);
    setAnswers({});
    setFeedback("");
    toast({ title: t("sim_round_released") });
  };

  // Professor: substituir paciente/observador em uma rodada (aluno faltou)
  const swapAssignmentParticipant = async (assignmentId: string, newParticipantId: string) => {
    const { error } = await supabase
      .from("simulation_round_assignments")
      .update({ participant_id: newParticipantId })
      .eq("id", assignmentId);
    if (error) {
      toast({ title: "Erro ao substituir", description: error.message, variant: "destructive" });
      return;
    }
    setAllAssignments((prev) => prev.map((a) => a.id === assignmentId ? { ...a, participant_id: newParticipantId } : a));
    toast({ title: "Participante substituído." });
  };

  // Professor: iniciar uma rodada pendente específica (pular fora da ordem)
  const startSpecificRound = async (round: any) => {
    if (activeRound) {
      toast({ title: "Encerre a rodada ativa antes de iniciar outra.", variant: "destructive" });
      return;
    }
    if (!room) return;
    const cycleRounds = allRounds.filter((r: any) => r.cycle === round.cycle);
    const needRelease = !cycleRounds.some((r: any) => r.materials_released);
    const ops: Promise<any>[] = [];
    if (needRelease) {
      ops.push(
        supabase.from("simulation_rounds").update({ materials_released: true }).in("id", cycleRounds.map((r: any) => r.id)) as any,
        supabase.from("simulation_participants").update({ status: "waiting" }).eq("room_id", room.id).eq("participant_role", "student") as any,
      );
    }
    ops.push(
      supabase.from("simulation_rounds").update({
        status: "active",
        started_at: new Date().toISOString(),
        released_by: participant?.student_name || "professor",
      }).eq("id", round.id) as any,
      supabase.from("simulation_rooms").update({ current_cycle: round.cycle, current_round: round.round_number, status: "active" }).eq("id", room.id) as any,
    );
    await Promise.all(ops);
    setAnswers({});
    setFeedback("");
    toast({ title: `Rodada ${round.round_number} iniciada (fora da ordem).` });
  };

  const endRound = async () => {
    if (!activeRound) return;
    // Check if professor submitted evaluation
    if (isProfessor && !submitted) {
      toast({ title: t("sim_must_submit_first"), variant: "destructive" });
      return;
    }
    const remainingPendingRounds = allRounds.filter((round: any) => round.id !== activeRound.id && round.status === "pending");
    await Promise.all([
      supabase.from("simulation_rounds").update({
        status: "completed",
        finished_at: new Date().toISOString(),
      }).eq("id", activeRound.id),
      supabase
        .from("simulation_rooms")
        .update({
          current_cycle: activeRound.cycle,
          current_round: activeRound.round_number,
          status: remainingPendingRounds.length === 0 ? "completed" : "active",
        })
        .eq("id", room.id),
    ]);
    toast({ title: t("sim_round_ended") });
  };

  // Student: mark materials as studied — persist to DB so professor can see
  const markMaterialsReady = async () => {
    if (!participant) return;
    setMaterialsReady(true);
    setParticipant((previousParticipant: any) => previousParticipant ? { ...previousParticipant, status: "ready" } : previousParticipant);
    await supabase
      .from("simulation_participants")
      .update({ status: "ready" })
      .eq("id", participant.id);
  };

  const [generatingRounds, setGeneratingRounds] = useState(false);
  const [selectedForPairing, setSelectedForPairing] = useState<string[]>([]);
  const [distributionGenerated, setDistributionGenerated] = useState(false);
  const [localRounds, setLocalRounds] = useState<any[]>([]);
  const [showPairingMode, setShowPairingMode] = useState(false);

  // Solo mode state
  const [soloMode, setSoloMode] = useState(false);
  const [soloProfessionalId, setSoloProfessionalId] = useState("");
  const [soloPatientId, setSoloPatientId] = useState("");
  const [soloObserverId, setSoloObserverId] = useState("");
  const [soloCaseIndex, setSoloCaseIndex] = useState(0);

  // Check if all existing rounds are still pending (never started)
  const allRoundsPending = allRounds.length > 0 && allRounds.every((r: any) => r.status === "pending");
  const hasStartedRounds = allRounds.some((r: any) => r.status === "active" || r.status === "completed");

  // Reset rounds - delete all pending rounds and assignments
  const resetRounds = async () => {
    if (!room) return;
    const roundIds = allRounds.map((r: any) => r.id);
    if (roundIds.length > 0) {
      await supabase.from("simulation_round_assignments").delete().in("round_id", roundIds);
      await supabase.from("simulation_rounds").delete().in("id", roundIds);
    }
    setAllRounds([]);
    setAllAssignments([]);
    setDistributionGenerated(false);
    setLocalRounds([]);
    setShowPairingMode(true);
    toast({ title: "Rodadas resetadas" });
  };

  // Get unpaired and paired students
  const unpairedStudents = allParticipants.filter((p: any) => p.participant_role === "student" && (p.pair_index === -1 || p.pair_position === "X"));
  const pairedStudents = allParticipants.filter((p: any) => p.participant_role === "student" && p.pair_index >= 0 && p.pair_position !== "X");
  const pairsMap: Record<number, any[]> = {};
  pairedStudents.forEach((s: any) => {
    if (!pairsMap[s.pair_index]) pairsMap[s.pair_index] = [];
    pairsMap[s.pair_index].push(s);
  });
  const formedPairs = Object.entries(pairsMap).filter(([_, ps]) => ps.length === 2 || (ps.length === 1 && ps[0].pair_position === "S"));
  const nextPairIdx = Object.keys(pairsMap).length > 0 ? Math.max(...Object.keys(pairsMap).map(Number)) + 1 : 0;

  // Get clinical cases from patient_script form
  const patientScriptForm = forms.find((f: any) => f.form_type === "patient_script");
  const clinicalCases: { id: string; title: string; script: string }[] = (() => {
    if (!patientScriptForm) return [];
    const content = patientScriptForm.content_json as any;
    if (Array.isArray(content) && content.length > 0 && content[0]?.cases) {
      return content[0].cases;
    }
    if (Array.isArray(content) && content.length > 0 && content[0]?.label) {
      return [{ id: "legacy", title: "Caso 1", script: content[0].label }];
    }
    return [];
  })();

  const toggleStudentForPairing = (id: string) => {
    setSelectedForPairing((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  const formPair = async () => {
    if (selectedForPairing.length !== 2) return;
    const [a, b] = selectedForPairing;
    await supabase.from("simulation_participants").update({ pair_index: nextPairIdx, pair_position: "A" }).eq("id", a);
    await supabase.from("simulation_participants").update({ pair_index: nextPairIdx, pair_position: "B" }).eq("id", b);
    setSelectedForPairing([]);
    const { data } = await supabase.from("simulation_participants").select("*").eq("room_id", room.id);
    setAllParticipants(data || []);
    toast({ title: t("sim_pair_formed") });
  };

  const clearAllPairs = async () => {
    const studentIds = allParticipants.filter((p: any) => p.participant_role === "student").map((p: any) => p.id);
    if (!studentIds.length) return;
    for (const id of studentIds) {
      await supabase.from("simulation_participants").update({ pair_index: -1, pair_position: "X" }).eq("id", id);
    }
    const { data } = await supabase.from("simulation_participants").select("*").eq("room_id", room.id);
    setAllParticipants(data || []);
    setDistributionGenerated(false);
    setLocalRounds([]);
    toast({ title: t("sim_clear_pairs") });
  };

  // Generate distribution preview (local only, not saved yet)
  const generateDistributionPreview = () => {
    if (soloMode) {
      generateSoloDistributionPreview();
      return;
    }
    if (formedPairs.length === 0) {
      toast({ title: t("sim_need_pairs"), variant: "destructive" });
      return;
    }
    const pairsList = formedPairs.map(([_, ps]) => ps);
    const numCases = clinicalCases.length;
    const rounds = generateRounds(pairsList, numCases > 0 ? numCases : undefined);
    setLocalRounds(rounds);
    setDistributionGenerated(true);
  };

  // Generate solo mode distribution preview
  const generateSoloDistributionPreview = () => {
    if (!soloProfessionalId || !soloPatientId || !soloObserverId) {
      toast({ title: "Selecione os 3 participantes", variant: "destructive" });
      return;
    }
    if (new Set([soloProfessionalId, soloPatientId, soloObserverId]).size !== 3) {
      toast({ title: "Cada participante deve ter um papel diferente", variant: "destructive" });
      return;
    }
    const rounds = [{
      roundNumber: 1,
      cycle: 1,
      assignments: [
        { participantId: soloProfessionalId, role: "professional", pairIndex: 0, caseIndex: soloCaseIndex },
        { participantId: soloPatientId, role: "patient", pairIndex: 0, caseIndex: soloCaseIndex },
        { participantId: soloObserverId, role: "observer", pairIndex: 1 },
      ],
    }];
    setLocalRounds(rounds);
    setDistributionGenerated(true);
  };

  // Save rounds to DB
  const generateRoundsForRoom = async () => {
    if (!room || localRounds.length === 0) return;
    setGeneratingRounds(true);
    try {
      // Clear any existing rounds first
      const existingRoundIds = allRounds.map((r: any) => r.id);
      if (existingRoundIds.length > 0) {
        await supabase.from("simulation_round_assignments").delete().in("round_id", existingRoundIds);
        await supabase.from("simulation_rounds").delete().in("id", existingRoundIds);
      }
      for (const round of localRounds) {
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
          case_index: a.caseIndex ?? null,
        }));
        await supabase.from("simulation_round_assignments").insert(assignments);
      }

      if (room.status === "draft") {
        await supabase.from("simulation_rooms").update({ status: "active" }).eq("id", room.id);
      }

      setShowPairingMode(false);
      setDistributionGenerated(false);
      setLocalRounds([]);
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

  // Render participant list for a round (with ready status for professor)
  const renderRoundParticipants = (roundId: string) => {
    const roundAssignments = getAssignmentsForRound(roundId);
    if (roundAssignments.length === 0) return null;
    const round = allRounds.find((r: any) => r.id === roundId);
    const isCompleted = round?.status === "completed";
    const isActiveR = round?.status === "active";
    const usedIds = new Set(roundAssignments.map((a: any) => a.participant_id));
    const swapCandidates = allParticipants.filter(
      (p: any) => p.participant_role === "student" && !usedIds.has(p.id)
    );

    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{t("sim_participants_in_round")}</p>
        <div className="space-y-1">
          {roundAssignments.map((a: any) => {
            const Icon = roleIcons[a.assigned_role] || Users;
            const participantData = allParticipants.find((p: any) => p.id === a.participant_id);
            const isReady = participantData?.status === "ready";
            const canSwap = isProfessor && !isCompleted && !isActiveR && (a.assigned_role === "patient" || a.assigned_role === "observer");
            return (
              <div key={a.id} className="flex items-center gap-2 text-sm flex-wrap">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{getParticipantName(a.participant_id)}</span>
                <Badge variant="outline" className={`text-xs ${roleBadgeColors[a.assigned_role] || ""}`}>
                  {roleLabels[a.assigned_role] || a.assigned_role}
                </Badge>
                {isProfessor && cycleMaterialsReleased && !isActive && (
                  isReady ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground/50" />
                  )
                )}
                {canSwap && swapCandidates.length > 0 && (
                  <Select onValueChange={(val) => swapAssignmentParticipant(a.id, val)}>
                    <SelectTrigger className="h-7 w-auto text-xs gap-1 border-dashed ml-1">
                      <UserCog className="h-3 w-3" />
                      <SelectValue placeholder="Substituir" />
                    </SelectTrigger>
                    <SelectContent>
                      {swapCandidates.map((c: any) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.student_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const RoleIcon = assignment ? roleIcons[assignment.assigned_role] || Users : Users;
  const form = getFormForRole();
  const isActive = !!activeRound;
  const canFill = isActive && !submitted && assignment?.assigned_role !== "patient";
  const completedRoundsList = allRounds.filter((r: any) => r.status === "completed");
  const allRoundsCompleted = allRounds.length > 0 && allRounds.every((round: any) => round.status === "completed");
  const isPaused = room?.status === "paused";
  const hasCompletedRound = allRounds.some((r: any) => r.status === "completed");
  const hasPendingRound = allRounds.some((r: any) => r.status !== "completed");
  const canPause = isProfessor && !isPaused && hasCompletedRound && hasPendingRound;

  // Check if student participates in active round
  const participatesInActiveRound = isActive && !!assignment;

  // Professor should see pairing UI when no rounds exist or explicitly in pairing mode (after reset)
  const shouldShowPairingUI = isProfessor && !isActive && (allRounds.length === 0 || showPairingMode);

  useEffect(() => {
    if (!joined || isProfessor || isActive || !allRoundsCompleted) {
      setRedirectSeconds(null);
      return;
    }

    setRedirectSeconds(15);
    const redirectTimeout = window.setTimeout(() => {
      navigate("/");
    }, 15000);
    const countdownInterval = window.setInterval(() => {
      setRedirectSeconds((previousSeconds) => {
        if (previousSeconds == null) return 14;
        return previousSeconds > 0 ? previousSeconds - 1 : 0;
      });
    }, 1000);

    return () => {
      window.clearTimeout(redirectTimeout);
      window.clearInterval(countdownInterval);
    };
  }, [allRoundsCompleted, isActive, isProfessor, joined, navigate]);

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

  // Paused room state — show informative screen for students (professor still has access to control)
  if (room?.status === "paused" && !isProfessor) {
    return (
      <SimulationPausedView
        roomTitle={room?.title || ""}
        studentName={participant?.student_name || ""}
        participantId={participant?.id || ""}
        rounds={allRounds as any}
        assignments={allAssignments as any}
      />
    );
  }

  const isMaterialStage = isActive && activeRound && !activeRound.started_at && activeRound.materials_released;
  // Actually, we need a different approach: materials_released=true but round status is still "pending" means material stage
  // When professor clicks "start simulation" it becomes "active"
  // Let me rethink: the round has status "pending" → professor releases materials → materials_released=true, status still "pending"
  // → professor starts simulation → status becomes "active", started_at set
  // But we already use "active" status... Let me handle it differently:
  // The material release phase is when the next pending round needs materials AND materials are released but round not started yet

  if (isActive && !isProfessor && !participatesInActiveRound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <Clock className="h-12 w-12 text-muted-foreground/50 animate-pulse" />
          <p className="text-lg text-muted-foreground">{t("sim_waiting_professor")}</p>
        </div>
      </div>
    );
  }

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

      {/* Professor Controls - only when rounds are confirmed and not in pairing mode */}
      {isProfessor && !shouldShowPairingUI && allRounds.length > 0 && (
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

            {/* Ready count when materials are released but round not started */}
            {!isActive && cycleMaterialsReleased && (() => {
              // All students (not professors) should have materials
              const students = allParticipants.filter((p: any) => p.participant_role === "student");
              const readyCount = students.filter((p: any) => p.status === "ready").length;
              return (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className={`h-4 w-4 ${readyCount === students.length ? "text-green-600" : "text-muted-foreground"}`} />
                  <span className="text-muted-foreground">
                    {readyCount}/{students.length} alunos prontos
                  </span>
                </div>
              );
            })()}

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

            {/* Reset button when all rounds are still pending */}
            {allRoundsPending && !isActive && (
              <Button variant="outline" size="sm" onClick={resetRounds} className="w-full">
                <RefreshCw className="h-3.5 w-3.5 mr-1" />Redistribuir
              </Button>
            )}

            {/* Pause / Resume — multi-day execution */}
            {(canPause || isPaused) && (
              <div className="pt-2 border-t">
                {isPaused ? (
                  <Button onClick={resumeSimulation} className="w-full gap-2 bg-green-600 hover:bg-green-700">
                    <PlayCircle className="h-4 w-4" />
                    Retomar simulação
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setPauseDialogOpen(true)}
                    className="w-full gap-2 border-amber-400/60 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40"
                  >
                    <PauseCircle className="h-4 w-4" />
                    Pausar e continuar em outro dia
                  </Button>
                )}
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  As respostas das rodadas concluídas ficam salvas e seguem para SOAP e agregador de notas.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Waiting state for students */}
      {!isProfessor && !canSeeCycleMaterials && !participatesInActiveRound && !allRoundsCompleted && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground/50 mb-4 animate-pulse" />
            <h3 className="text-lg font-medium">{t("sim_waiting_professor")}</h3>
            <p className="text-sm text-muted-foreground">{t("sim_waiting_desc")}</p>
          </CardContent>
        </Card>
      )}

      {/* Material study phase for students - role based on pair_position + cycle, NOT round assignments */}
      {!isProfessor && canSeeCycleMaterials && !participatesInActiveRound && (
        (() => {
          const cycleAssigns = allAssignments.filter((assignment: any) => materialCycleRoundIds.includes(assignment.round_id));
          const caseIdx = getCycleCaseIndex(
            cycleAssigns,
            materialCycleRoundIds,
            participant?.id,
            participant?.pair_index,
          );
          // In solo/manual mode, use the actual assigned_role from round assignments
          const myDirectAssignment = cycleAssigns.find((assignment: any) => assignment.participant_id === participant?.id);
          const myRole = myDirectAssignment?.assigned_role || getStudyRole(participant?.pair_position, materialCycle) || "professional";

          // Professionals see anamnesis form
          if (myRole === "professional") {
            const anamnesisForm = forms.find((f: any) => f.form_type === "anamnesis");
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {t("sim_release_materials")} — {roleLabels.professional}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {anamnesisForm ? (
                    <div className="border rounded-lg p-4 space-y-2">
                      <p className="text-sm font-semibold">{anamnesisForm.title || t("sim_form_anamnesis")}</p>
                      <FormRenderer
                        fields={(anamnesisForm.content_json as FormField[])}
                        answers={{}}
                        onChange={() => {}}
                        readOnly
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("sim_no_script")}</p>
                  )}
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
            );
          }

          // Patients see their assigned clinical case
          if (myRole === "patient") {
            const assignedCase = clinicalCases[caseIdx] || clinicalCases[0];
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {t("sim_release_materials")} — {roleLabels.patient}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {assignedCase ? (
                    <div className="border rounded-lg p-4 space-y-2">
                      <p className="text-sm font-semibold">{assignedCase.title}</p>
                      <ClinicalCaseContent content={assignedCase.script} />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("sim_no_cases")}</p>
                  )}
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
            );
          }

          // Observers see observer eval form during material study
          if (myRole === "observer") {
            const observerForm = forms.find((f: any) => f.form_type === "observer_eval");
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {t("sim_release_materials")} — {roleLabels.observer}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {observerForm ? (
                    <div className="border rounded-lg p-4 space-y-2">
                      <p className="text-sm font-semibold">{observerForm.title || "Formulário do Observador"}</p>
                      <FormRenderer
                        fields={(observerForm.content_json as FormField[])}
                        answers={{}}
                        onChange={() => {}}
                        readOnly
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum formulário do observador configurado.</p>
                  )}
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
            );
          }

          return null;
        })()
      )}

      {/* Waiting state (professor, need to form pairs and generate) */}
      {shouldShowPairingUI && !nextPendingRound && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{distributionGenerated ? t("sim_distribution_title") : t("sim_form_pairs")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!distributionGenerated ? (
              <>
                {/* Solo mode toggle */}
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="solo-mode" className="text-sm font-medium cursor-pointer">Modo Solo (Reposição)</Label>
                  </div>
                  <Switch
                    id="solo-mode"
                    checked={soloMode}
                    onCheckedChange={(checked) => {
                      setSoloMode(checked);
                      setSelectedForPairing([]);
                      setSoloProfessionalId("");
                      setSoloPatientId("");
                      setSoloObserverId("");
                      setSoloCaseIndex(0);
                    }}
                  />
                </div>

                {soloMode ? (
                  /* Solo mode: manual role assignment */
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Selecione manualmente quem assumirá cada papel na simulação individual.
                    </p>

                    {/* Professional select */}
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-sm">
                        <Stethoscope className="h-4 w-4" />Profissional (avaliado)
                      </Label>
                      <Select value={soloProfessionalId} onValueChange={setSoloProfessionalId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o profissional" />
                        </SelectTrigger>
                        <SelectContent>
                          {allParticipants.filter((p: any) => p.participant_role === "student").map((s: any) => (
                            <SelectItem key={s.id} value={s.id} disabled={s.id === soloPatientId || s.id === soloObserverId}>
                              {s.student_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Patient select */}
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-sm">
                        <Users className="h-4 w-4" />Paciente Simulado (receberá roteiro)
                      </Label>
                      <Select value={soloPatientId} onValueChange={setSoloPatientId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o paciente simulado" />
                        </SelectTrigger>
                        <SelectContent>
                          {allParticipants.filter((p: any) => p.participant_role === "student").map((s: any) => (
                            <SelectItem key={s.id} value={s.id} disabled={s.id === soloProfessionalId || s.id === soloObserverId}>
                              {s.student_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Observer select */}
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-sm">
                        <Eye className="h-4 w-4" />Observador (receberá formulário)
                      </Label>
                      <Select value={soloObserverId} onValueChange={setSoloObserverId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o observador" />
                        </SelectTrigger>
                        <SelectContent>
                          {allParticipants.filter((p: any) => p.participant_role === "student").map((s: any) => (
                            <SelectItem key={s.id} value={s.id} disabled={s.id === soloProfessionalId || s.id === soloPatientId}>
                              {s.student_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Clinical case select (if more than 1) */}
                    {clinicalCases.length > 1 && (
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-sm">
                          <BookOpen className="h-4 w-4" />Caso Clínico
                        </Label>
                        <Select value={String(soloCaseIndex)} onValueChange={(v) => setSoloCaseIndex(Number(v))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {clinicalCases.map((c, i) => (
                              <SelectItem key={c.id} value={String(i)}>{c.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Distribute button */}
                    <div className="border-t pt-4">
                      <Button
                        onClick={generateDistributionPreview}
                        disabled={!soloProfessionalId || !soloPatientId || !soloObserverId}
                        className="w-full"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Visualizar Distribuição
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Formed pairs */}
                    {formedPairs.length > 0 && (
                      <div className="space-y-2">
                        {formedPairs.map(([idx, ps]) => (
                          <div key={idx} className="p-3 bg-muted rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground mb-1">{t("sim_pair")} {Number(idx) + 1}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{ps[0]?.student_name}</span>
                              <span className="text-xs text-muted-foreground">&</span>
                              <span className="text-sm font-medium">{ps[1]?.student_name}</span>
                            </div>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={clearAllPairs}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" />{t("sim_clear_pairs")}
                        </Button>
                      </div>
                    )}

                    {/* Unpaired students */}
                    {unpairedStudents.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {t("sim_unpaired_students")} ({unpairedStudents.length}) — {t("sim_select_pair")}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {unpairedStudents.map((s: any) => {
                            const isSelected = selectedForPairing.includes(s.id);
                            return (
                              <button
                                key={s.id}
                                onClick={() => toggleStudentForPairing(s.id)}
                                className={`p-2 rounded-lg border text-left text-sm transition-colors ${
                                  isSelected
                                    ? "border-primary bg-primary/10 ring-2 ring-primary"
                                    : "border-border hover:border-primary/50"
                                }`}
                              >
                                <span className="font-medium">{s.student_name}</span>
                                {s.student_email && <p className="text-xs text-muted-foreground">{s.student_email}</p>}
                              </button>
                            );
                          })}
                        </div>
                        {selectedForPairing.length === 2 && (
                          <Button onClick={formPair} className="w-full" size="sm">
                            <Users className="h-4 w-4 mr-1" />{t("sim_form_pairs")}
                          </Button>
                        )}
                      </div>
                    )}

                    {unpairedStudents.length === 0 && formedPairs.length === 0 && (
                      <p className="text-sm text-muted-foreground">{t("sim_need_students")}</p>
                    )}

                    {/* Distribute button */}
                    <div className="border-t pt-4">
                      <Button onClick={generateDistributionPreview} disabled={formedPairs.length === 0} className="w-full">
                        <Play className="h-4 w-4 mr-1" />
                        {t("sim_distribute")}
                      </Button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Distribution preview */}
                {soloMode && (
                  <Badge variant="secondary" className="mb-2">
                    <UserRound className="h-3 w-3 mr-1" />Modo Solo
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground">{t("sim_material_rule_hint")}</p>
                <div className="space-y-3">
                  {localRounds.map((round) => (
                    <div key={round.roundNumber} className="p-4 border rounded-lg space-y-2">
                      <p className="text-sm font-semibold">
                        {t("sim_round")} {round.roundNumber} — {t("sim_cycle")} {round.cycle}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {round.assignments.map((a: any) => {
                          const pName = allParticipants.find((p: any) => p.id === a.participantId)?.student_name || "—";
                          return (
                            <div key={a.participantId} className="flex items-center gap-2">
                              <Badge className={roleBadgeColors[a.role] || ""}>
                                {roleLabels[a.role] || a.role}
                              </Badge>
                              <span className="text-sm font-medium">{pName}</span>
                              {a.role === "patient" && clinicalCases.length > 0 && a.caseIndex != null && (
                                <span className="text-xs text-muted-foreground">
                                  ({clinicalCases[a.caseIndex]?.title || `Caso ${a.caseIndex + 1}`})
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 border-t pt-4">
                  <Button variant="outline" onClick={() => { setDistributionGenerated(false); setLocalRounds([]); }} className="flex-1">
                    {t("pricing_back")}
                  </Button>
                  <Button onClick={generateRoundsForRoom} disabled={generatingRounds} className="flex-1">
                    {generatingRounds ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                    {t("confirm")}
                  </Button>
                </div>
              </>
            )}
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

      {!isActive && !isProfessor && allRoundsCompleted && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <CheckCircle className="h-10 w-10 text-primary" />
            <p className="text-lg font-medium">{t("sim_all_rounds_completed")}</p>
            <p className="text-sm text-muted-foreground">
              Você será encaminhado para a página inicial em {redirectSeconds ?? 15}s.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Submitted state */}
      {submitted && !allRoundsCompleted && (
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
                <FormRenderer
                  fields={fields}
                  answers={answers}
                  onChange={setAnswers}
                  showScores={true}
                  idPrefix="prof-"
                />

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
                  const { computeFieldScore } = await import("@/components/forms/types");
                  fields.forEach((field) => {
                    if (field.max_score && answers[field.id]) score += computeFieldScore(field, answers[field.id]);
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
                {(() => {
                  const caseIdx = assignment?.case_index ?? 0;
                  const assignedCase = clinicalCases[caseIdx];
                  if (assignedCase) {
                    return (
                      <div>
                        <p className="font-semibold mb-2">{assignedCase.title}</p>
                        <ClinicalCaseContent content={assignedCase.script} />
                      </div>
                    );
                  }
                  // Fallback to old format
                  return (form.content_json as any)?.[0]?.label || t("sim_no_script");
                })()}
              </div>
            ) : (
              <>
                <FormRenderer
                  fields={(form.content_json as FormField[])}
                  answers={answers}
                  onChange={setAnswers}
                  readOnly={!canFill}
                  showScores={true}
                />
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
      <AlertDialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pausar e continuar em outro dia?</AlertDialogTitle>
            <AlertDialogDescription>
              {isActive
                ? `Há uma rodada ativa (Rodada ${activeRound?.round_number}). Recomendamos encerrá-la antes de pausar para preservar as notas. Você pode pausar agora e a rodada ativa continuará disponível para retomar.`
                : "Os alunos verão uma tela informando que a sessão continuará em outro dia. As respostas das rodadas concluídas ficam salvas e seguem normalmente para o SOAP e o agregador de notas."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={pauseSimulation}>Pausar simulação</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
