import { ArrowLeft, Copy, Check, KeyRound, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

const STEPS = ["Anamnese", "SOAP", "Reconciliação", "Documentação"];

type Accent = "anamnese" | "soap" | "reconciliacao" | "documentacao";

interface Props {
  /** mantido por compatibilidade; o visual novo usa um destaque único */
  accent?: Accent;
  moduleLabel: string;
  moduleIcon?: LucideIcon;
  title: string;
  pin?: string | null;
  backTo: string | (() => void);
  meta?: ReactNode;
  rightSlot?: ReactNode;
}

// Cabeçalho do controle de sala (Anamnese, SOAP, Reconciliação e Documentação).
export function ModuleControlHeader({ moduleLabel, title, pin, backTo, meta, rightSlot }: Props) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleBack = () => {
    if (typeof backTo === "function") backTo();
    else navigate(backTo);
  };

  const copyPin = async () => {
    if (!pin) return;
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      toast.success("PIN copiado");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const stepIdx = STEPS.indexOf(moduleLabel);

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={handleBack}>
        <ArrowLeft className="h-4 w-4" />
        Simulações
      </Button>
      {stepIdx >= 0 && (
        <div className="grid max-w-xl grid-cols-4 gap-2" aria-label="Etapas da Farmácia Clínica">
          {STEPS.map((step, i) => (
            <div key={step}>
              <div className={`h-1 rounded-full ${i < stepIdx ? "bg-success" : i === stepIdx ? "bg-primary" : "bg-muted"}`} />
              <span className={`mt-1.5 block text-[11px] ${i === stepIdx ? "font-medium text-foreground" : "text-muted-foreground"}`}>{i < stepIdx ? "✓ " : ""}{step}</span>
            </div>
          ))}
        </div>
      )}
      <PageHeader
        eyebrow={`${stepIdx >= 0 ? `Etapa ${stepIdx + 1} · ` : ""}${moduleLabel} · Controle da sala`}
        title={title}
        description={meta}
        actions={
          <>
            {rightSlot}
            {pin && (
              <button
                type="button"
                onClick={copyPin}
                aria-label="Copiar PIN"
                className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2 text-left transition-colors hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="label-mono block">PIN de acesso</span>
                  <span className="mt-1 block font-mono text-xl font-medium leading-none tracking-[0.15em]">{pin}</span>
                </span>
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
              </button>
            )}
          </>
        }
      />
    </div>
  );
}
