import { ArrowLeft, Copy, Check, KeyRound, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

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

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={handleBack}>
        <ArrowLeft className="h-4 w-4" />
        Simulações
      </Button>
      <PageHeader
        eyebrow={`${moduleLabel} · Controle da sala`}
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
