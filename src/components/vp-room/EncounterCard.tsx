import { useEffect, useState } from "react";
import { Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FichaVersao } from "@/lib/vp-ficha";

// Cartão do encontro no estilo OSCE: cenário, local, papel, tarefa e tempo. Diz o que fazer, nunca o que vai
// encontrar nem o que perguntar. Vem da ação encounter_brief do chat (só casos v2).
export interface EncounterBrief {
  encounter: number;
  tipo: string;
  interlocutor: string;
  interlocutor_nome: string | null;
  cenario: string;
  tarefa: string;
  local: string | null;
  tempo_min: number | null;
}

const PAPEL: Record<FichaVersao, string> = {
  farmaceutico: "Farmacêutico(a)",
  enfermeiro: "Enfermeiro(a)",
  medico: "Médico(a)",
};

function comQuemFala(b: EncounterBrief): string {
  switch (b.interlocutor) {
    case "cuidador": return "O(a) cuidador(a) do paciente";
    case "prescritor": return b.interlocutor_nome ? `O prescritor, ${b.interlocutor_nome}` : "O prescritor";
    case "equipe": return b.interlocutor_nome ? `A equipe, ${b.interlocutor_nome}` : "A equipe";
    default: return "O paciente";
  }
}

export const timerKey = (sessionId: string, encounter: number) => `vp_timer_${sessionId}_${encounter}`;
export const introKey = (sessionId: string, encounter: number) => `vp_intro_${sessionId}_${encounter}`;

interface IntroProps {
  open: boolean;
  /** primeira abertura do encontro (botão "Começar"); depois vira só consulta ("Fechar") */
  firstTime: boolean;
  brief: EncounterBrief;
  title: string;
  versao: FichaVersao | null;
  hasFicha: boolean;
  onStart: () => void;
  onClose: () => void;
}

export function EncounterIntroDialog({ open, firstTime, brief, title, versao, hasFicha, onStart, onClose }: IntroProps) {
  const prescritor = brief.interlocutor === "prescritor" || brief.interlocutor === "equipe";
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !firstTime) onClose(); }}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => { if (firstTime) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (firstTime) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-left">Leia o cartão do encontro antes de começar.</DialogDescription>
        </DialogHeader>

        <dl className="space-y-3 text-sm">
          {brief.local && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Local</dt>
              <dd>{brief.local}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cenário</dt>
            <dd>{brief.cenario}</dd>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seu papel</dt>
              <dd>{versao ? PAPEL[versao] : "Profissional de saúde"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Você conversa com</dt>
              <dd>{comQuemFala(brief)}</dd>
            </div>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sua tarefa</dt>
            <dd className="font-medium">{brief.tarefa}</dd>
          </div>
          {brief.tempo_min ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tempo sugerido</dt>
              <dd>{brief.tempo_min} minutos. O cronômetro é só uma referência: nada é bloqueado ao fim do tempo.</dd>
            </div>
          ) : null}
        </dl>

        <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
          <p className="font-semibold">Como interagir</p>
          <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
            <li>{prescritor ? "Escreva como se estivesse falando com o profissional, de forma objetiva." : "Escreva como se estivesse falando com a pessoa. Ela só responde ao que for perguntado."}</li>
            <li>Sinais vitais, exames e medicamentos que a pessoa trouxe só aparecem se você pedir ou disser que vai aferir.</li>
            {hasFicha && <li>Registre o que levantar na ficha (botão Ficha). Ela acompanha os três encontros.</li>}
            <li>Quando terminar este encontro, use Avançar Encontro.</li>
          </ul>
        </div>

        <DialogFooter>
          {firstTime ? (
            <Button onClick={onStart}>Começar o atendimento</Button>
          ) : (
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Faixa fixa no topo da sala: lembra o local e a tarefa e reabre o cartão completo.
export function EncounterStrip({ brief, onOpen }: { brief: EncounterBrief; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left border-b bg-muted/40 hover:bg-muted/60 px-4 py-2 text-xs flex items-center gap-2 flex-shrink-0 transition-colors"
      title="Ver o cartão completo do encontro"
    >
      {brief.local && (
        <span className="flex items-center gap-1 font-medium shrink-0">
          <MapPin className="h-3.5 w-3.5" /> {brief.local}
        </span>
      )}
      <span className="truncate text-muted-foreground">Tarefa: {brief.tarefa}</span>
      <span className="ml-auto underline shrink-0">Ver cartão</span>
    </button>
  );
}

// Cronômetro de referência do encontro (por dispositivo). Começa no "Começar o atendimento"; nunca bloqueia nada.
export function EncounterTimer({ sessionId, encounter, minutes }: { sessionId: string; encounter: number; minutes: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  let started = 0;
  try { started = Number(sessionStorage.getItem(timerKey(sessionId, encounter))) || 0; } catch { /* sem cronômetro */ }
  if (!started) return null;

  const secs = Math.max(0, Math.floor((now - started) / 1000));
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const over = !!minutes && secs > minutes * 60;
  return (
    <Badge variant="outline" className={`text-xs font-mono gap-1 ${over ? "border-amber-500 text-amber-600" : ""}`} title="Tempo neste encontro (referência)">
      <Clock className="h-3 w-3" /> {mm}:{ss}{minutes ? ` / ${minutes} min` : ""}
    </Badge>
  );
}
