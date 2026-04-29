import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, CheckCircle2, Clock, Users } from "lucide-react";

type Round = {
  id: string;
  round_number: number;
  cycle: number;
  status: string;
  started_at?: string | null;
  finished_at?: string | null;
};

type Assignment = {
  round_id: string;
  participant_id: string;
  assigned_role: string;
};

type Participant = {
  id: string;
  student_name: string;
  participant_role: string;
};

type SimSession = {
  id: string;
  session_number: number;
  started_at: string;
  ended_at: string | null;
};

interface Props {
  rounds: Round[];
  assignments: Assignment[];
  participants: Participant[];
  sessions?: SimSession[];
  roomStatus?: string;
}

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
    " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

export function SimulationProgressPanel({ rounds, assignments, participants, sessions = [], roomStatus }: Props) {
  const total = rounds.length;
  const completed = rounds.filter(r => r.status === "completed").length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  const students = participants.filter(p => p.participant_role === "student");

  // Students who have already played "professional" in a completed round
  const completedRoundIds = new Set(rounds.filter(r => r.status === "completed").map(r => r.id));
  const evaluatedIds = new Set(
    assignments
      .filter(a => a.assigned_role === "professional" && completedRoundIds.has(a.round_id))
      .map(a => a.participant_id)
  );

  const evaluated = students.filter(s => evaluatedIds.has(s.id));
  const pending = students.filter(s => !evaluatedIds.has(s.id));

  const isPaused = roomStatus === "paused";

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Progresso da turma
          </span>
          {isPaused && (
            <Badge variant="outline" className="border-amber-400/60 text-amber-700 dark:text-amber-300">
              <Clock className="h-3 w-3 mr-1" /> Pausada
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completed} de {total} rodadas concluídas
            </span>
            <span className="font-medium">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Já avaliados ({evaluated.length})
            </div>
            {evaluated.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum aluno avaliado ainda.</p>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {evaluated.map(s => (
                  <li key={s.id} className="text-sm flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                    {s.student_name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Users className="h-4 w-4 text-primary" />
              Pendentes ({pending.length})
            </div>
            {pending.length === 0 ? (
              <p className="text-xs text-muted-foreground">Todos os alunos já foram avaliados.</p>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {pending.map(s => (
                  <li key={s.id} className="text-sm flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                    {s.student_name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {sessions.length > 0 && (
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Histórico de sessões
            </p>
            <ul className="space-y-1.5">
              {sessions
                .slice()
                .sort((a, b) => a.session_number - b.session_number)
                .map(s => (
                  <li key={s.id} className="text-sm flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">Sessão {s.session_number}</Badge>
                    <span className="text-muted-foreground">
                      {fmtDate(s.started_at)}
                      {s.ended_at ? ` → ${fmtDate(s.ended_at)}` : " — em andamento"}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SimulationProgressPanel;
