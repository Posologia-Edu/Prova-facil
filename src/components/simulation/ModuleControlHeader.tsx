import { ArrowLeft, Copy, Check, KeyRound, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, ReactNode } from "react";
import { toast } from "sonner";

type Accent = "anamnese" | "soap" | "reconciliacao" | "documentacao";

const ACCENTS: Record<Accent, { grad: string; ring: string; chipBg: string; chipText: string; dot: string }> = {
  anamnese:      { grad: "from-[#0f1b3d] via-[#152a5a] to-[#1e3a7a]", ring: "ring-sky-300/30",    chipBg: "bg-sky-400/15 border-sky-300/40",     chipText: "text-sky-100",    dot: "bg-sky-300" },
  soap:          { grad: "from-[#0d2818] via-[#123a25] to-[#1a5236]", ring: "ring-emerald-300/30",chipBg: "bg-emerald-400/15 border-emerald-300/40", chipText: "text-emerald-100", dot: "bg-emerald-300" },
  reconciliacao: { grad: "from-[#2a1140] via-[#3b1f5c] to-[#553380]", ring: "ring-violet-300/30", chipBg: "bg-violet-400/15 border-violet-300/40",  chipText: "text-violet-100",  dot: "bg-violet-300" },
  documentacao:  { grad: "from-[#3a1d0a] via-[#5a2d10] to-[#8a4a1c]", ring: "ring-amber-300/30",  chipBg: "bg-amber-400/15 border-amber-300/40",    chipText: "text-amber-100",   dot: "bg-amber-300" },
};

interface Props {
  accent: Accent;
  moduleLabel: string;
  moduleIcon: LucideIcon;
  title: string;
  pin?: string | null;
  backTo: string | (() => void);
  meta?: ReactNode;
  rightSlot?: ReactNode;
}

export function ModuleControlHeader({ accent, moduleLabel, moduleIcon: Icon, title, pin, backTo, meta, rightSlot }: Props) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const a = ACCENTS[accent];

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
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${a.grad} shadow-xl ring-1 ${a.ring}`}>
      {/* decorative glows */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
      {/* gold hairline */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />

      <div className="relative p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-8 px-2 text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          {/* Left: module + title */}
          <div className="min-w-0 flex-1">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${a.chipBg} ${a.chipText} backdrop-blur-sm mb-3`}>
              <span className={`h-1.5 w-1.5 rounded-full ${a.dot} animate-pulse`} />
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">{moduleLabel}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight break-words">
              {title}
            </h1>
            {meta && <div className="mt-2 text-sm text-white/70">{meta}</div>}
          </div>

          {/* Right: PIN card */}
          {pin && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={copyPin}
                className="group flex items-center gap-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md px-5 py-3.5 transition-all shadow-lg"
                aria-label="Copiar PIN"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-300/20 ring-1 ring-amber-300/40">
                  <KeyRound className="h-5 w-5 text-amber-200" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/90">
                    PIN de acesso
                  </div>
                  <div className="font-mono text-2xl sm:text-3xl font-bold text-white tabular-nums tracking-[0.15em] leading-tight">
                    {pin}
                  </div>
                </div>
                <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-md bg-white/10 group-hover:bg-white/20 transition-colors">
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-300" />
                  ) : (
                    <Copy className="h-4 w-4 text-white/80" />
                  )}
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
