import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scale } from "lucide-react";
import {
  calibrationRows,
  calibrationSummary,
  reasonLabel,
  type AdjustedGradeLike,
} from "@/lib/vp-calibration";

const sinal = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`;
const cor = (v: number) => (v > 0 ? "text-emerald-600" : v < 0 ? "text-destructive" : "text-muted-foreground");

/** Compara a nota da IA com o ajuste do docente nas avaliações ajustadas (P16). Só o docente vê. */
export function CalibrationPanel({
  grades,
  dimensionLabels,
}: {
  grades: AdjustedGradeLike[];
  dimensionLabels: Record<string, string>;
}) {
  const rows = calibrationRows(grades);
  if (rows.length === 0) return null;
  const summary = calibrationSummary(rows);
  const dims = Object.entries(summary.byDimension)
    .filter(([, v]) => v !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" /> Calibração da IA
          <Badge variant="secondary" className="text-[10px]">{summary.n} ajuste{summary.n > 1 ? "s" : ""}</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Diferença entre a nota que a IA deu e o seu ajuste (docente − IA). Valor positivo: a IA foi mais rigorosa que você. Cada grupo conta uma vez.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-xs font-semibold">Diferença média da nota final</p>
            <p className={`text-2xl font-bold ${cor(summary.meanDelta)}`}>{sinal(summary.meanDelta)}</p>
            <div className="space-y-1">
              {summary.byVersion.map((v) => (
                <p key={v.label} className="text-[11px] text-muted-foreground">
                  {v.label}: <span className={cor(v.meanDelta)}>{sinal(v.meanDelta)}</span> ({v.n})
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-xs font-semibold">Dimensões com maior diferença média</p>
            {dims.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma dimensão foi alterada.</p>
            ) : (
              <div className="space-y-1">
                {dims.slice(0, 6).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{dimensionLabels[k] || k}</span>
                    <span className={`font-medium ${cor(v)}`}>{sinal(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">IA</TableHead>
              <TableHead className="text-center">Docente</TableHead>
              <TableHead className="text-center">Diferença</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Modelo · rubrica</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell className="text-center">{r.iaNota.toFixed(2)}</TableCell>
                <TableCell className="text-center">{r.docenteNota.toFixed(2)}</TableCell>
                <TableCell className={`text-center font-medium ${cor(r.delta)}`}>{sinal(r.delta)}</TableCell>
                <TableCell className="text-sm">{reasonLabel(r.reason)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.model} · {r.rubric}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
