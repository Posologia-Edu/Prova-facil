import { useState } from "react";
import { AlertTriangle, Copy, Loader2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { VersaoKey } from "@/lib/vp-case-schema";
import { cn } from "@/lib/utils";
import { VERSAO_LABEL } from "./defaults";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** profissões que o caso ainda não tem */
  missing: VersaoKey[];
  /** há alterações não salvas: a IA lê o núcleo salvo */
  dirty: boolean;
  generating: VersaoKey | null;
  onAI: (key: VersaoKey) => void | Promise<void>;
  onManual: (key: VersaoKey) => void;
}

function Option({ selected, disabled, icon, title, text, onClick }: {
  selected: boolean; disabled?: boolean; icon: React.ReactNode; title: string; text: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
        selected ? "border-primary bg-brand-soft" : "hover:bg-muted/50",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted text-foreground">{icon}</span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{text}</span>
      </span>
    </button>
  );
}

export function AddVersionDialog({ open, onOpenChange, missing, dirty, generating, onAI, onManual }: Props) {
  const [key, setKey] = useState<VersaoKey | null>(null);
  const [mode, setMode] = useState<"ia" | "manual">("manual");
  const current = key && missing.includes(key) ? key : missing[0];
  const effectiveMode = dirty ? "manual" : mode;

  const create = async () => {
    if (!current) return;
    if (effectiveMode === "ia") await onAI(current);
    else onManual(current);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!generating) onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar versão</DialogTitle>
          <DialogDescription>A versão usa o mesmo núcleo clínico. Escolha a profissão e como criar.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Profissão">
            {missing.map((k) => (
              <Button key={k} type="button" size="sm" variant={k === current ? "default" : "outline"} role="radio" aria-checked={k === current} onClick={() => setKey(k)}>
                {VERSAO_LABEL[k]}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Option
              selected={effectiveMode === "ia"}
              disabled={dirty}
              icon={<Sparkles className="h-4 w-4" />}
              title="Com IA"
              text="Lê o núcleo salvo e escreve cenário, gabarito e encontros para a profissão."
              onClick={() => setMode("ia")}
            />
            <Option
              selected={effectiveMode === "manual"}
              icon={<Copy className="h-4 w-4" />}
              title="Manual"
              text="Clona uma versão existente para você adaptar à mão."
              onClick={() => setMode("manual")}
            />
          </div>

          {dirty && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-ink" />
              <span>Há alterações não salvas. Salve o rascunho para gerar com IA: ela lê o núcleo salvo do caso.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={!!generating}>Cancelar</Button>
          <Button type="button" onClick={create} disabled={!current || !!generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : effectiveMode === "ia" ? <Sparkles className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {effectiveMode === "ia" ? "Gerar versão" : "Criar versão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
