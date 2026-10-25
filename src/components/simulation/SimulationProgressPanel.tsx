import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";

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
    <Card className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-lg font-medium">Progresso da turma</h3>
        {isPaused && <StatusBadge tone="warn" dot>Pausada</StatusBadge>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            <span className="font-mono text-foreground">{completed}</span> de <span className="font-mono text-foreground">{total}</span> rodadas concluídas
          </span>
          <span className="font-mono font-medium">{pct}%</span>
        </div>
        <Progress value={pct} className="h-1.5" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg bg-sunken p-4">
          <p className="label-mono mb-3">Já avaliados ({evaluated.length})</p>
          {evaluated.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum aluno avaliado ainda.</p>
          ) : (
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {evaluated.map(s => (
                <li key={s.id} className="text-sm flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  {s.student_name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg bg-sunken p-4">
          <p className="label-mono mb-3">Pendentes ({pending.length})</p>
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
        <div className="border-t pt-4">
          <p className="label-mono mb-3">Histórico de sessões</p>
          <ul className="space-y-2">
            {sessions
              .slice()
              .sort((a, b) => a.session_number - b.session_number)
              .map(s => (
                <li key={s.id} className="text-sm flex items-center gap-3">
                  <StatusBadge tone="neutral">Sessão {s.session_number}</StatusBadge>
                  <span className="text-muted-foreground">
                    {fmtDate(s.started_at)}
                    {s.ended_at ? ` → ${fmtDate(s.ended_at)}` : " — em andamento"}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export default SimulationProgressPanel;
