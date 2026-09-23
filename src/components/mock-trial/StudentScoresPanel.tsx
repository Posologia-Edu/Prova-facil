import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, Gavel, UserSquare2, Scroll, Download, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip as UiTooltip, TooltipContent as UiTooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { consolidateScores } from "@/lib/mock-trial-evaluations";
import { computeMtPeerBonus, MT_PEER_EVAL_MAX_ADJUST, MtPeerEvaluationScores } from "@/lib/mt-peer-eval";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, AlertTriangle, Info } from "lucide-react";

interface Props {
  mockTrialId: string;
  cases: any[];
  groups: any[];
  students: any[];
  assignments: any[];
  evaluations: any[];
}

type AttendanceStatus = "present" | "absent" | "excused";

interface AttendanceRow {
  id?: string;
  student_id: string;
  case_id: string;
  status: AttendanceStatus;
  score_override: number | null;
  notes: string | null;
}

interface MtPeerEvalRow extends MtPeerEvaluationScores {
  case_id: string;
  group_id: string;
  evaluator_name: string | null;
  evaluator_email: string;
  evaluatee_email: string;
  comentario: string | null;
}

interface PerCase {
  caseId: string;
  caseTitle: string;
  role: "prosecution" | "defense" | "jury";
  rawScore: number | null;
  status: AttendanceStatus;
  override: number | null;
  effectiveScore: number | null; // counted in average (already includes peer bonus)
  countsInAverage: boolean;
  peerBonus: number;
  peerEvals: MtPeerEvalRow[];
}

interface StudentRow {
  id: string;
  name: string;
  email?: string;
  groupName: string;
  perCase: PerCase[];
  average: number | null;
}

const ROLE_LABEL: Record<string, string> = {
  prosecution: "Acusação",
  defense: "Defesa",
  jury: "Júri Técnico",
};

const ROLE_CHIP: Record<string, string> = {
  prosecution: "bg-red-600/10 text-red-700 border-red-600/30",
  defense: "bg-primary/10 text-primary border-primary/30",
  jury: "bg-amber-500/10 text-amber-700 border-amber-500/30",
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Presente",
  absent: "Faltou (nota 0)",
  excused: "Não participou (não conta)",
};

const STATUS_DOT: Record<AttendanceStatus, string> = {
  present: "bg-emerald-500",
  absent: "bg-red-500",
  excused: "bg-muted-foreground",
};

export function StudentScoresPanel({
  mockTrialId,
  cases,
  groups,
  students,
  assignments,
  evaluations,
}: Props) {
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [peerEvals, setPeerEvals] = useState<MtPeerEvalRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAttendance = async () => {
    if (!mockTrialId) return;
    const { data, error } = await supabase
      .from("mock_trial_attendance" as any)
      .select("*")
      .eq("mock_trial_id", mockTrialId);
    if (!error && data) setAttendance(data as any);
  };

  const loadPeerEvals = async () => {
    const caseIds = cases.map((c: any) => c.id);
    if (caseIds.length === 0) { setPeerEvals([]); return; }
    const { data, error } = await supabase
      .from("mock_trial_peer_evaluations")
      .select("case_id, group_id, evaluator_name, evaluator_email, evaluatee_email, preparacao_score, atuacao_score, colaboracao_score, comentario")
      .in("case_id", caseIds);
    if (!error && data) setPeerEvals(data as any);
  };

  useEffect(() => {
    loadAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockTrialId]);

  useEffect(() => {
    loadPeerEvals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cases.map((c: any) => c.id).join(",")]);

  const attendanceMap = useMemo(() => {
    const m = new Map<string, AttendanceRow>();
    for (const a of attendance) m.set(`${a.student_id}:${a.case_id}`, a);
    return m;
  }, [attendance]);

  const scoreMap = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const c of cases) {
      const caseAssigns = assignments.filter((a: any) => a.case_id === c.id);
      const caseEvals = evaluations.filter((e: any) => e.case_id === c.id);
      const consolidated = consolidateScores(caseEvals, caseAssigns);
      for (const cs of consolidated) {
        m.set(`${c.id}:${cs.groupId}`, cs.finalGroup);
      }
      const juryAssign = caseAssigns.find((a: any) => a.role === "jury");
      if (juryAssign) {
        const juryEval = caseEvals.find(
          (e: any) =>
            e.evaluator_type === "ai_jury_panel" && e.evaluated_role === "jury"
        );
        m.set(
          `${c.id}:${juryAssign.group_id}`,
          juryEval ? Number(juryEval.score) : null
        );
      }
    }
    return m;
  }, [cases, assignments, evaluations]);

  const peerEvalMap = useMemo(() => {
    const m = new Map<string, MtPeerEvalRow[]>();
    for (const p of peerEvals) {
      const key = `${p.case_id}:${p.group_id}:${p.evaluatee_email}`;
      const arr = m.get(key) || [];
      arr.push(p);
      m.set(key, arr);
    }
    return m;
  }, [peerEvals]);

  const rows = useMemo<StudentRow[]>(() => {
    const sorted = [...students].sort((a, b) =>
      (a.student_name || "").localeCompare(b.student_name || "", "pt-BR", {
        sensitivity: "base",
      })
    );
    return sorted.map((s) => {
      const group = groups.find((g) => g.id === s.group_id);
      const perCase: PerCase[] = [];
      for (const c of cases) {
        const assign = assignments.find(
          (a: any) => a.case_id === c.id && a.group_id === s.group_id
        );
        if (!assign || !["prosecution", "defense", "jury"].includes(assign.role))
          continue;
        const rawScore = scoreMap.get(`${c.id}:${s.group_id}`) ?? null;
        const att = attendanceMap.get(`${s.id}:${c.id}`);
        const status: AttendanceStatus = att?.status ?? "present";
        const override = att?.score_override ?? null;
        const studentEmail = (s.student_email || "").trim().toLowerCase();
        const evalsForStudent = studentEmail
          ? peerEvalMap.get(`${c.id}:${s.group_id}:${studentEmail}`) || []
          : [];
        const peerBonus = evalsForStudent.length ? computeMtPeerBonus(evalsForStudent) : 0;

        let effectiveScore: number | null = null;
        let countsInAverage = true;
        if (status === "absent") {
          effectiveScore = 0;
        } else if (status === "excused") {
          effectiveScore = null;
          countsInAverage = false;
        } else if (override != null) {
          // A manual override is the teacher's own final word — don't perturb it with the peer bonus.
          effectiveScore = Number(override);
        } else {
          effectiveScore = rawScore != null && peerBonus !== 0
            ? Math.max(0, Math.min(10, rawScore + peerBonus))
            : rawScore;
        }

        perCase.push({
          caseId: c.id,
          caseTitle: c.title || c.case_number || "Processo",
          role: assign.role,
          peerBonus,
          peerEvals: evalsForStudent,
          rawScore,
          status,
          override,
          effectiveScore,
          countsInAverage,
        });
      }
      const counted = perCase
        .filter((p) => p.countsInAverage)
        .map((p) => (p.effectiveScore != null ? p.effectiveScore : null))
        .filter((v): v is number => v != null);
      const average =
        counted.length > 0
          ? Number((counted.reduce((a, b) => a + b, 0) / counted.length).toFixed(2))
          : null;
      return {
        id: s.id,
        name: s.student_name || "—",
        email: s.student_email,
        groupName: group?.name || "—",
        perCase,
        average,
      };
    });
  }, [cases, groups, students, assignments, scoreMap, attendanceMap, peerEvalMap]);

  const upsertAttendance = async (
    studentId: string,
    caseId: string,
    patch: Partial<AttendanceRow>
  ) => {
    setLoading(true);
    const existing = attendanceMap.get(`${studentId}:${caseId}`);
    const payload = {
      mock_trial_id: mockTrialId,
      student_id: studentId,
      case_id: caseId,
      status: patch.status ?? existing?.status ?? "present",
      score_override:
        patch.score_override !== undefined
          ? patch.score_override
          : existing?.score_override ?? null,
      notes: patch.notes !== undefined ? patch.notes : existing?.notes ?? null,
    };
    const { error } = await supabase
      .from("mock_trial_attendance" as any)
      .upsert(payload, { onConflict: "student_id,case_id" });
    setLoading(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Presença atualizada");
    await loadAttendance();
  };

  const exportCsv = () => {
    const header = [
      "Aluno",
      "Email",
      "Grupo",
      ...cases.map((c) => c.title || c.case_number || "Processo"),
      "Média",
    ];
    const lines = [header.join(";")];
    for (const r of rows) {
      const caseCols = cases.map((c) => {
        const pc = r.perCase.find((p) => p.caseId === c.id);
        if (!pc) return "—";
        if (pc.status === "absent") return "Faltou (0)";
        if (pc.status === "excused") return "N/A";
        return pc.effectiveScore != null
          ? pc.effectiveScore.toFixed(2).replace(".", ",")
          : "Pendente";
      });
      lines.push(
        [
          r.name,
          r.email || "",
          r.groupName,
          ...caseCols,
          r.average != null ? r.average.toFixed(2).replace(".", ",") : "",
        ].join(";")
      );
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notas-juri-simulado.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum aluno cadastrado nos grupos.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-foreground/10 bg-gradient-to-b from-muted/40 to-background">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">
                <Scroll className="h-3.5 w-3.5" />
                <span>Relação Nominal de Apenados</span>
              </div>
              <CardTitle className="text-base">
                Notas dos Alunos · Júri Simulado
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Clique no <Pencil className="inline h-3 w-3" /> em cada participação
                para registrar presença, falta ou ajustar a nota.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 border-y border-foreground/10">
              <tr className="text-left">
                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-10">
                  #
                </th>
                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Apenado(a)
                </th>
                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Grupo
                </th>
                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Participações
                </th>
                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right pr-6">
                  Média
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={r.id}
                  className="border-b border-foreground/5 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground align-top">
                    {String(idx + 1).padStart(3, "0")}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-start gap-2">
                      <UserSquare2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground">
                          {r.name}
                        </div>
                        {r.email && (
                          <div className="text-xs text-muted-foreground truncate">
                            {r.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Badge variant="outline" className="font-normal">
                      {r.groupName}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {r.perCase.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">
                        Sem distribuição
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {r.perCase.map((p) => {
                          const Icon = p.role === "jury" ? Gavel : Scale;
                          const displayScore =
                            p.status === "excused"
                              ? "N/A"
                              : p.status === "absent"
                              ? "0.0"
                              : p.effectiveScore != null
                              ? p.effectiveScore.toFixed(1)
                              : "—";
                          return (
                            <Popover key={p.caseId}>
                              <PopoverTrigger asChild>
                                <button
                                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] hover:ring-2 hover:ring-primary/30 transition ${ROLE_CHIP[p.role]}`}
                                  title={`${p.caseTitle} — ${ROLE_LABEL[p.role]} — ${STATUS_LABEL[p.status]}`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[p.status]}`}
                                  />
                                  <Icon className="h-3 w-3" />
                                  <span className="font-medium">
                                    {ROLE_LABEL[p.role]}
                                  </span>
                                  <span className="opacity-70">·</span>
                                  <span className="font-mono font-semibold">
                                    {displayScore}
                                  </span>
                                  <Pencil className="h-2.5 w-2.5 opacity-60 ml-0.5" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 space-y-3">
                                <div>
                                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                                    {p.caseTitle}
                                  </div>
                                  <div className="text-sm font-semibold">
                                    {r.name} · {ROLE_LABEL[p.role]}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    Nota original do grupo:{" "}
                                    {p.rawScore != null
                                      ? p.rawScore.toFixed(2)
                                      : "—"}
                                    {p.peerBonus !== 0 && (
                                      <>
                                        {" "}+ pares{" "}
                                        <strong className={p.peerBonus > 0 ? "text-emerald-600" : "text-red-600"}>
                                          {p.peerBonus >= 0 ? "+" : ""}{p.peerBonus.toFixed(2)}
                                        </strong>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="border rounded-md p-2 space-y-1.5">
                                  <div className="text-xs font-medium flex items-center gap-1.5">
                                    <Users className="h-3 w-3" /> Avaliação entre Pares
                                    <TooltipProvider>
                                      <UiTooltip>
                                        <TooltipTrigger asChild>
                                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                        </TooltipTrigger>
                                        <UiTooltipContent
                                          side="left"
                                          align="start"
                                          sideOffset={8}
                                          collisionPadding={16}
                                          avoidCollisions
                                          className="w-[min(92vw,420px)] max-h-[70vh] overflow-y-auto z-[100]"
                                        >
                                          <div className="text-xs space-y-1.5 break-words whitespace-normal">
                                            <p>
                                              <strong>O que é:</strong> logo que o juiz encerra este processo, cada
                                              integrante do grupo recebe um e-mail para avaliar os colegas de 0 a 5
                                              em três critérios (mostrados como <strong>P · A · C</strong>):
                                            </p>
                                            <ul className="list-disc list-inside space-y-0.5 ml-1">
                                              <li><strong>P — Preparação:</strong> participou das reuniões e da construção dos argumentos/perguntas antes do julgamento.</li>
                                              <li>
                                                <strong>A — Atuação no julgamento:</strong>{" "}
                                                {p.role === "jury"
                                                  ? "qualidade das perguntas feitas e imparcialidade no julgamento."
                                                  : "qualidade da argumentação e atuação durante o julgamento."}
                                              </li>
                                              <li><strong>C — Colaboração:</strong> postura respeitosa e colaborativa do início ao fim.</li>
                                            </ul>
                                            <p>
                                              <strong>Como vira bônus/penalidade:</strong> média das 3 notas de cada
                                              avaliador, depois média entre avaliadores (0–5). Ponto neutro:{" "}
                                              <strong>2.5</strong>.
                                            </p>
                                            <p className="font-mono text-[11px] bg-muted/50 rounded px-2 py-1">
                                              bônus = ((média − 2.5) / 2.5) × 1.0, limitado a ±1.0
                                            </p>
                                            <p>
                                              Se ninguém responder, o bônus fica em <strong>0</strong> (nem soma, nem
                                              subtrai) — não é penalidade por falta de resposta. Se o professor já
                                              definiu uma nota individual manual (override), o bônus{" "}
                                              <strong>não</strong> é aplicado por cima dela.
                                            </p>
                                            <p className="text-muted-foreground italic">
                                              Um grupo pode jogar papéis diferentes em cada processo (ex.: Acusação no
                                              caso 1, Júri no caso 2) — a avaliação é sempre por processo específico.
                                            </p>
                                          </div>
                                        </UiTooltipContent>
                                      </UiTooltip>
                                    </TooltipProvider>
                                    {new Set(p.peerEvals.map((e) => `${e.preparacao_score}-${e.atuacao_score}-${e.colaboracao_score}`)).size === 1 &&
                                      p.peerEvals.length > 1 && (
                                        <span title="Todos os avaliadores deram exatamente as mesmas notas">
                                          <AlertTriangle className="h-3 w-3 text-amber-600" />
                                        </span>
                                      )}
                                  </div>
                                  {p.peerEvals.length === 0 ? (
                                    <p className="text-[11px] text-muted-foreground">
                                      Nenhum colega avaliou este aluno ainda (grupo sem outros integrantes, convite
                                      ainda não enviado, ou ninguém respondeu — bônus fica em 0 nesse caso).
                                    </p>
                                  ) : (
                                    <>
                                      {p.peerEvals.map((e, i) => (
                                        <div key={i} className="text-[11px] flex items-center justify-between">
                                          <span className="text-muted-foreground truncate max-w-[45%]">
                                            {e.evaluator_name || e.evaluator_email}
                                          </span>
                                          <span className="font-mono">
                                            P:{e.preparacao_score} · A:{e.atuacao_score} · C:{e.colaboracao_score}
                                          </span>
                                        </div>
                                      ))}
                                      <p className="text-[10px] text-muted-foreground pt-0.5">
                                        Bônus/penalidade de até ±{MT_PEER_EVAL_MAX_ADJUST.toFixed(1)}, já somado à nota original acima.
                                      </p>
                                    </>
                                  )}
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-medium">
                                    Presença
                                  </label>
                                  <Select
                                    value={p.status}
                                    onValueChange={(v) =>
                                      upsertAttendance(r.id, p.caseId, {
                                        status: v as AttendanceStatus,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="present">
                                        Presente (usar nota do grupo)
                                      </SelectItem>
                                      <SelectItem value="absent">
                                        Faltou (nota 0)
                                      </SelectItem>
                                      <SelectItem value="excused">
                                        Não participou (não conta na média)
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {p.status === "present" && (
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-medium">
                                      Nota individual (opcional)
                                    </label>
                                    <div className="flex gap-1">
                                      <Input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="10"
                                        defaultValue={
                                          p.override != null
                                            ? String(p.override)
                                            : ""
                                        }
                                        placeholder={
                                          p.rawScore != null
                                            ? p.rawScore.toFixed(2)
                                            : "—"
                                        }
                                        className="h-8"
                                        id={`override-${r.id}-${p.caseId}`}
                                      />
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 px-2"
                                        onClick={() => {
                                          const el = document.getElementById(
                                            `override-${r.id}-${p.caseId}`
                                          ) as HTMLInputElement | null;
                                          const val = el?.value?.trim();
                                          upsertAttendance(r.id, p.caseId, {
                                            score_override:
                                              val === "" || val == null
                                                ? null
                                                : Number(val),
                                          });
                                        }}
                                        disabled={loading}
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </Button>
                                      {p.override != null && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 px-2"
                                          onClick={() =>
                                            upsertAttendance(r.id, p.caseId, {
                                              score_override: null,
                                            })
                                          }
                                          title="Remover nota individual"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                      Se em branco, usa a nota do grupo.
                                    </p>
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right pr-6 align-top">
                    <span
                      className={`inline-block font-mono font-bold text-lg ${
                        r.average == null
                          ? "text-muted-foreground"
                          : r.average >= 7
                          ? "text-emerald-600"
                          : r.average >= 5
                          ? "text-amber-600"
                          : "text-red-600"
                      }`}
                    >
                      {r.average != null ? r.average.toFixed(2) : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
