import { FormField, isNotApplicable, tableColumns, tableRowCount } from "./types";

/** Resposta de um campo como texto (relatórios e exportações). Tabelas viram uma linha por linha preenchida. */
export function formatAnswerText(field: FormField, value: any): string {
  if (isNotApplicable(value)) return "Não se aplica";
  if (field.type === "table") {
    const cols = tableColumns(field);
    const matriz: string[][] = Array.isArray(value) ? value : [];
    const linhas = Array.from({ length: tableRowCount(field) }, (_, r) => {
      const rotulo = field.table_row_labels?.[r];
      const cels = cols.map((c, j) => ({ c, v: String(matriz[r]?.[j] ?? "").trim() })).filter((x) => x.v);
      if (cels.length === 0) return "";
      return `${rotulo ? rotulo + ": " : ""}${cels.map((x) => `${x.c} ${x.v}`).join("; ")}`;
    }).filter(Boolean);
    return linhas.length ? linhas.join("\n") : "—";
  }
  if (field.type === "scale") return value == null || value === "" ? "—" : `${value}/${field.scale_max || field.max_score || 10}`;
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return value == null || value === "" ? "—" : String(value);
}

/** Respostas de um formulário em modo leitura: cabeçalhos de seção, valores e tabelas com colunas (usado por quem avalia). */
export default function FormAnswersView({ fields, answers, className = "" }: { fields: FormField[]; answers: Record<string, any>; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {fields.map((field) => {
        if (field.type === "image_block" || field.type === "video_block") return null;
        if (field.type === "section_header") {
          return field.label ? <h4 key={field.id} className="border-l-4 border-primary bg-primary/5 px-3 py-1.5 text-sm font-semibold">{field.label}</h4> : null;
        }
        const value = answers?.[field.id];
        if (field.type === "table") {
          const cols = tableColumns(field);
          const matriz: string[][] = Array.isArray(value) ? value : [];
          const fixos = field.table_row_labels && field.table_row_labels.length > 0 ? field.table_row_labels : null;
          const linhas = Array.from({ length: tableRowCount(field) }, (_, r) => r).filter((r) => cols.some((_, j) => String(matriz[r]?.[j] ?? "").trim()));
          return (
            <div key={field.id} className="space-y-1">
              <p className="text-sm font-medium text-foreground">{field.label}</p>
              {linhas.length === 0 ? (
                <p className="rounded bg-muted p-2 text-sm text-muted-foreground">—</p>
              ) : (
                <div className="overflow-x-auto rounded border">
                  <table className="w-full min-w-[480px] text-xs">
                    <thead>
                      <tr className="bg-muted/50 text-left">
                        {fixos && <th className="px-2 py-1.5 font-medium">{field.table_row_header || ""}</th>}
                        {cols.map((c, j) => <th key={j} className="px-2 py-1.5 font-medium">{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {linhas.map((r) => (
                        <tr key={r} className="border-t align-top">
                          {fixos && <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">{fixos[r]}</td>}
                          {cols.map((_, j) => <td key={j} className="px-2 py-1.5">{matriz[r]?.[j] || "—"}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        }
        return (
          <div key={field.id} className="space-y-1">
            <p className="text-sm font-medium text-foreground">{field.label}</p>
            <p className="whitespace-pre-wrap rounded bg-muted p-2 text-sm text-muted-foreground">{formatAnswerText(field, value)}</p>
          </div>
        );
      })}
    </div>
  );
}
