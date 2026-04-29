import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, PauseCircle } from "lucide-react";

type Round = { id: string; round_number: number; cycle: number; status: string };
type Assignment = { round_id: string; participant_id: string; assigned_role: string };

interface Props {
  roomTitle: string;
  studentName: string;
  participantId: string;
  rounds: Round[];
  assignments: Assignment[];
}

const roleLabel: Record<string, string> = {
  professional: "Profissional",
  patient: "Paciente",
  observer: "Observador",
};

export function SimulationPausedView({ roomTitle, studentName, participantId, rounds, assignments }: Props) {
  const myAssignments = assignments.filter(a => a.participant_id === participantId);
  const myRounds = myAssignments
    .map(a => ({ assignment: a, round: rounds.find(r => r.id === a.round_id) }))
    .filter(x => x.round)
    .sort((a, b) => (a.round!.round_number) - (b.round!.round_number));

  const completedMine = myRounds.filter(x => x.round!.status === "completed");
  const pendingMine = myRounds.filter(x => x.round!.status !== "completed");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-xl border-amber-400/40">
        <CardHeader className="text-center space-y-2">
          <PauseCircle className="h-12 w-12 mx-auto text-amber-500" />
          <CardTitle className="text-xl">Simulação pausada</CardTitle>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{roomTitle}</span> — {studentName}
          </p>
          <Badge variant="outline" className="border-amber-400/60 text-amber-700 dark:text-amber-300 mx-auto">
            <Clock className="h-3 w-3 mr-1" /> Continua em outra sessão
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            O professor pausou esta simulação e retomará em outro dia. Suas respostas
            até aqui foram salvas e serão usadas normalmente nas próximas etapas.
          </p>

          {completedMine.length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Você já participou de
              </p>
              <ul className="space-y-1.5">
                {completedMine.map(({ assignment, round }) => (
                  <li key={round!.id} className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <span>Rodada {round!.round_number}</span>
                    <Badge variant="secondary" className="text-xs">
                      {roleLabel[assignment.assigned_role] || assignment.assigned_role}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pendingMine.length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Pendente para a próxima sessão
              </p>
              <ul className="space-y-1.5">
                {pendingMine.map(({ assignment, round }) => (
                  <li key={round!.id} className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                    <span>Rodada {round!.round_number}</span>
                    <Badge variant="outline" className="text-xs">
                      {roleLabel[assignment.assigned_role] || assignment.assigned_role}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {myRounds.length === 0 && (
            <p className="text-sm text-muted-foreground text-center italic">
              Você ainda não foi atribuído a nenhuma rodada — aguarde a próxima sessão.
            </p>
          )}

          <p className="text-xs text-center text-muted-foreground pt-2">
            Você pode fechar esta janela. Aguarde a comunicação do professor sobre a próxima sessão.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default SimulationPausedView;
