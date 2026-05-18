import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, Gavel, UserSquare2, Scroll, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { consolidateScores } from "@/lib/mock-trial-evaluations";

interface Props {
  cases: any[];
  groups: any[];
  students: any[];
  assignments: any[];
  evaluations: any[];
}

interface StudentRow {
  id: string;
  name: string;
  email?: string;
  groupName: string;
  perCase: Array<{
    caseId: string;
    caseTitle: string;
    role: "prosecution" | "defense" | "jury";
    score: number | null;
  }>;
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

export function StudentScoresPanel({ cases, groups, students, assignments, evaluations }: Props) {
  const rows = useMemo<StudentRow[]>(() => {
    // Build score lookup per (caseId, groupId)
    const scoreMap = new Map<string, number | null>();
    for (const c of cases) {
      const caseAssigns = assignments.filter((a: any) => a.case_id === c.id);
      const caseEvals = evaluations.filter((e: any) => e.case_id === c.id);
      const consolidated = consolidateScores(caseEvals, caseAssigns);
      for (const cs of consolidated) {
        scoreMap.set(`${c.id}:${cs.groupId}`, cs.finalGroup);
      }
      // jury group score from ai_jury_panel
      const juryAssign = caseAssigns.find((a: any) => a.role === "jury");
      if (juryAssign) {
        const juryEval = caseEvals.find(
          (e: any) => e.evaluator_type === "ai_jury_panel" && e.evaluated_role === "jury"
        );
        scoreMap.set(
          `${c.id}:${juryAssign.group_id}`,
          juryEval ? Number(juryEval.score) : null
        );
      }
    }

    const sortedStudents = [...students].sort((a, b) =>
      (a.student_name || "").localeCompare(b.student_name || "", "pt-BR", { sensitivity: "base" })
    );

    return sortedStudents.map((s) => {
      const group = groups.find((g) => g.id === s.group_id);
      const perCase: StudentRow["perCase"] = [];
      for (const c of cases) {
        const assign = assignments.find(
          (a: any) => a.case_id === c.id && a.group_id === s.group_id
        );
        if (!assign || !["prosecution", "defense", "jury"].includes(assign.role)) continue;
        const score = scoreMap.get(`${c.id}:${s.group_id}`) ?? null;
        perCase.push({
          caseId: c.id,
          caseTitle: c.title || c.case_number || "Processo",
          role: assign.role,
          score,
        });
      }
      const validScores = perCase.map((p) => p.score).filter((v): v is number => v != null);
      const average =
        validScores.length > 0
          ? Number((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2))
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
  }, [cases, groups, students, assignments, evaluations]);

  const exportCsv = () => {
    const header = ["Aluno", "Email", "Grupo", ...cases.map((c) => c.title || c.case_number || "Processo"), "Média"];
    const lines = [header.join(";")];
    for (const r of rows) {
      const caseCols = cases.map((c) => {
        const pc = r.perCase.find((p) => p.caseId === c.id);
        if (!pc) return "—";
        return pc.score != null ? pc.score.toFixed(2).replace(".", ",") : "Pendente";
      });
      lines.push(
        [r.name, r.email || "", r.groupName, ...caseCols, r.average != null ? r.average.toFixed(2).replace(".", ",") : ""].join(";")
      );
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
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
              <CardTitle className="text-base">Notas dos Alunos · Júri Simulado</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Média de todas as participações (Acusação, Defesa e Júri Técnico) em ordem alfabética.
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
                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-10">#</th>
                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Apenado(a)</th>
                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Grupo</th>
                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Participações</th>
                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right pr-6">Média</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id} className="border-b border-foreground/5 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground align-top">{String(idx + 1).padStart(3, "0")}</td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-start gap-2">
                      <UserSquare2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground">{r.name}</div>
                        {r.email && <div className="text-xs text-muted-foreground truncate">{r.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Badge variant="outline" className="font-normal">{r.groupName}</Badge>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {r.perCase.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">Sem distribuição</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {r.perCase.map((p) => {
                          const Icon = p.role === "jury" ? Gavel : Scale;
                          return (
                            <span
                              key={p.caseId}
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] ${ROLE_CHIP[p.role]}`}
                              title={`${p.caseTitle} — ${ROLE_LABEL[p.role]}`}
                            >
                              <Icon className="h-3 w-3" />
                              <span className="font-medium">{ROLE_LABEL[p.role]}</span>
                              <span className="opacity-70">·</span>
                              <span className="font-mono font-semibold">
                                {p.score != null ? p.score.toFixed(1) : "—"}
                              </span>
                            </span>
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
