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
  saving: boolean;
  onConfirm: (registrars: string[]) => void;
}

// Divisão de funções do grupo: quem não registra a ficha conduz a conversa. O rodízio é obrigatório:
// quem já registrou só volta a registrar quando todos os outros já tiverem registrado.
export function RolesDialog({ open, encounter, members, previousRegistrars, saving, onConfirm }: Props) {
  const eligible = useMemo(() => {
    const free = members.filter((m) => !previousRegistrars.includes(m.email));
    return (free.length > 0 ? free : members).map((m) => m.email);
  }, [members, previousRegistrars]);

  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (open) setSelected(eligible.slice(0, 1));
  }, [open, encounter, eligible]);

  const toggle = (email: string, checked: boolean) =>
    setSelected((prev) => (checked ? [...prev, email] : prev.filter((e) => e !== email)));

  const valid = selected.length >= 1 && selected.length < members.length;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Funções do grupo no {encounter}º encontro</DialogTitle>
          <DialogDescription className="text-left">
            Marquem quem vai <strong>registrar a ficha</strong>. Os demais <strong>conduzem a conversa</strong> com o paciente.
            As funções se alternam entre os encontros para que todos experimentem as duas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {members.map((m) => {
            const canRegister = eligible.includes(m.email);
            return (
              <label key={m.email} className="flex items-center justify-between gap-3 rounded-md border p-2.5 text-sm">
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

        <DialogFooter>
          <Button disabled={!valid || saving} onClick={() => onConfirm(selected)}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Confirmar funções
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
