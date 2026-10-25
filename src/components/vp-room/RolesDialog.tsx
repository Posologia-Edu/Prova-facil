import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface RoleMember {
  email: string;
  name: string;
}

interface Props {
  open: boolean;
  encounter: number;
  members: RoleMember[];
  /** e-mails que já registraram a ficha em encontros anteriores */
  previousRegistrars: string[];
  /** seleção inicial (ao alterar funções já definidas); sem isso, começa com o primeiro elegível */
  initial?: string[];
  /** se informado, o diálogo pode ser fechado sem confirmar (alteração de funções já definidas) */
  onCancel?: () => void;
  saving: boolean;
  onConfirm: (registrars: string[]) => void;
}

// Divisão de funções do grupo: quem não registra a ficha conduz a conversa. O rodízio é obrigatório:
// quem já registrou só volta a registrar quando todos os outros já tiverem registrado.
export function RolesDialog({ open, encounter, members, previousRegistrars, initial, onCancel, saving, onConfirm }: Props) {
  const eligible = useMemo(() => {
    const free = members.filter((m) => !previousRegistrars.includes(m.email));
    return (free.length > 0 ? free : members).map((m) => m.email);
  }, [members, previousRegistrars]);

  const [selected, setSelected] = useState<string[]>([]);

  // As listas chegam recriadas a cada atualização da sala; só a CHAVE delas decide se a seleção deve ser refeita.
  const eligibleKey = eligible.join("|");
  const initialKey = (initial || []).join("|");
  useEffect(() => {
    if (!open) return;
    const start = initial && initial.length > 0 ? initial.filter((e) => eligible.includes(e)) : [];
    setSelected(start.length > 0 ? start : eligible.slice(0, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, encounter, eligibleKey, initialKey]);

  const toggle = (email: string, checked: boolean) =>
    setSelected((prev) => (checked ? (prev.includes(email) ? prev : [...prev, email]) : prev.filter((e) => e !== email)));

  const valid = selected.length >= 1 && selected.length < members.length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && onCancel) onCancel(); }}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => { if (!onCancel) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (!onCancel) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-medium">Funções do grupo no {encounter}º encontro</DialogTitle>
          <DialogDescription className="text-left">
            Marquem quem vai <strong>registrar a ficha</strong>. Os demais <strong>conduzem a conversa</strong> com o paciente.
            As funções se alternam entre os encontros para que todos experimentem as duas. A primeira confirmação vale para o grupo todo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {members.map((m) => {
            const canRegister = eligible.includes(m.email);
            return (
              <label key={m.email} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-brand-soft">
                <span className="min-w-0">
                  <span className="font-medium">{m.name}</span>
                  {!canRegister && <span className="block text-xs text-muted-foreground">Já registrou a ficha: vez dos colegas.</span>}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{selected.includes(m.email) ? "Registra a ficha" : "Conduz a conversa"}</span>
                  <Checkbox
                    checked={selected.includes(m.email)}
                    disabled={!canRegister}
                    onCheckedChange={(c) => toggle(m.email, c === true)}
                  />
                </span>
              </label>
            );
          })}
        </div>

        {!valid && (
          <p className="text-xs text-destructive">É preciso ao menos uma pessoa registrando a ficha e uma conduzindo a conversa.</p>
        )}

        <DialogFooter className="gap-2">
          {onCancel && <Button variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>}
          <Button disabled={!valid || saving} onClick={() => onConfirm(selected)}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Confirmar funções
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
