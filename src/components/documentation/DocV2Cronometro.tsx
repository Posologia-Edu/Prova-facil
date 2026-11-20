import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

const lerInicio = (chave: string): number => {
  try {
    const v = Number(localStorage.getItem(chave));
    if (Number.isFinite(v) && v > 0) return v;
    const agora = Date.now();
    localStorage.setItem(chave, String(agora));
    return agora;
  } catch { return Date.now(); }
};

/** Cronômetro apenas sugestivo: mostra o tempo que falta (ou passou) e nunca bloqueia nada. Começa na primeira abertura neste aparelho. */
export default function DocV2Cronometro({ minutos, chave }: { minutos: number; chave: string }) {
  const [inicio] = useState(() => lerInicio(chave));
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 1000); return () => clearInterval(t); }, []);
  const restanteS = Math.round(minutos * 60 - (agora - inicio) / 1000);
  const passou = restanteS < 0;
  const abs = Math.abs(restanteS);
  const texto = `${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
  return (
    <p className={`flex items-center gap-1 text-xs ${passou ? "text-warning-ink" : "text-muted-foreground"}`} aria-label="Cronômetro sugerido">
      <Timer className="h-3.5 w-3.5" />{passou ? `${texto} acima do tempo sugerido (sem bloqueio)` : `${texto} do tempo sugerido`}
    </p>
  );
}
