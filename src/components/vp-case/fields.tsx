import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TextFieldProps {
  label: string;
  value: string | number | null | undefined;
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
  type?: "text" | "number";
  hint?: string;
  disabled?: boolean;
}

export function TextField({ label, value, onChange, multiline, rows = 3, type = "text", hint, disabled }: TextFieldProps) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {multiline ? (
        <Textarea value={value ?? ""} rows={rows} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input type={type} value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export interface Option {
  value: string;
  label: string;
}

export function SelectField({ label, value, options, onChange, disabled }: { label: string; value: string; options: Option[]; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Lista de textos (uma linha/área por item) com adicionar e remover. */
export function StringList({ label, hint, items, onChange, disabled, rows = 2 }: { label: string; hint?: string; items: string[]; onChange: (items: string[]) => void; disabled?: boolean; rows?: number }) {
  const list = items || [];
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {list.map((it, i) => (
        <div key={i} className="flex gap-2 items-start">
          <Textarea value={it} rows={rows} disabled={disabled} onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))} />
          {!disabled && (
            <Button type="button" variant="ghost" size="icon" title="Remover" onClick={() => onChange(list.filter((_, j) => j !== i))}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...list, ""])}>
          <Plus className="h-3.5 w-3.5 mr-1" />Adicionar
        </Button>
      )}
    </div>
  );
}

export interface Column<T> {
  key: keyof T & string;
  label: string;
  kind?: "text" | "area" | "select";
  options?: Option[];
  hint?: string;
  /** ocupa a linha inteira */
  wide?: boolean;
}

/** Lista de blocos (objetos) com os campos indicados em `columns`. */
export function RowList<T extends Record<string, any>>({
  label, hint, items, onChange, columns, newRow, disabled, titleOf,
}: {
  label: string;
  hint?: string;
  items: T[];
  onChange: (items: T[]) => void;
  columns: Column<T>[];
  newRow: () => T;
  disabled?: boolean;
  titleOf?: (row: T, index: number) => string;
}) {
  const list = items || [];
  const setCell = (i: number, key: string, v: string) =>
    onChange(list.map((row, j) => (j === i ? { ...row, [key]: v } : row)));
  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {list.map((row, i) => (
        <div key={i} className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-muted-foreground">{titleOf ? titleOf(row, i) : `Item ${i + 1}`}</span>
            {!disabled && (
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" title="Remover" onClick={() => onChange(list.filter((_, j) => j !== i))}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {columns.map((c) => (
              <div key={c.key} className={c.wide || c.kind === "area" ? "md:col-span-2" : ""}>
                {c.kind === "select" ? (
                  <SelectField label={c.label} value={String(row[c.key] ?? "")} options={c.options || []} disabled={disabled} onChange={(v) => setCell(i, c.key, v)} />
                ) : (
                  <TextField label={c.label} hint={c.hint} value={row[c.key]} multiline={c.kind === "area"} rows={2} disabled={disabled} onChange={(v) => setCell(i, c.key, v)} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...list, newRow()])}>
          <Plus className="h-3.5 w-3.5 mr-1" />Adicionar
        </Button>
      )}
    </div>
  );
}
