import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  WeeklySlot, Shift, DAY_LABELS, SHIFT_LABELS, formatSlot, formatSlots, parseSlotsInput,
} from "@/lib/class-schedule-notation";

interface Props {
  classId: string;
  initial: WeeklySlot[];
  onSaved?: (slots: WeeklySlot[]) => void;
}

export function WeeklyScheduleEditor({ classId, initial, onSaved }: Props) {
  const [slots, setSlots] = useState<WeeklySlot[]>(initial || []);
  const [bulkInput, setBulkInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setSlots(initial || []); }, [initial]);

  function addSlot() {
    setSlots([...slots, { dayOfWeek: 2, shift: "T", periods: [1, 2] }]);
  }
  function updateSlot(i: number, patch: Partial<WeeklySlot>) {
    setSlots(slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function removeSlot(i: number) {
    setSlots(slots.filter((_, idx) => idx !== i));
  }

  function importBulk() {
    const { ok, invalid } = parseSlotsInput(bulkInput);
    if (invalid.length) toast.error(`Notação inválida: ${invalid.join(", ")}`);
    if (ok.length) {
      setSlots([...slots, ...ok]);
      setBulkInput("");
      toast.success(`${ok.length} horário(s) importado(s)`);
    }
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("classes")
      .update({ weekly_schedule: slots as any })
      .eq("id", classId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Grade semanal salva");
    onSaved?.(slots);
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="font-semibold">Grade semanal da disciplina</h3>
          <p className="text-sm text-muted-foreground">
            Use a notação brasileira: dia da semana (1=Dom, 2=Seg…7=Sáb), turno (M/T/N) e horários.
            Ex.: <code className="px-1 bg-muted rounded">2T23</code>, <code className="px-1 bg-muted rounded">6T56</code>
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder="Cole vários horários: 2T23, 4T23, 5T23, 6T56"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); importBulk(); } }}
          />
          <Button variant="outline" onClick={importBulk}>Importar</Button>
        </div>

        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhum horário cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {slots.map((s, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2 p-2 border rounded-md">
                <div className="space-y-1">
                  <Label className="text-xs">Dia</Label>
                  <Select value={String(s.dayOfWeek)} onValueChange={(v) => updateSlot(i, { dayOfWeek: Number(v) })}>
                    <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DAY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Turno</Label>
                  <Select value={s.shift} onValueChange={(v) => updateSlot(i, { shift: v as Shift })}>
                    <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SHIFT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Horários (ex.: 23, 56)</Label>
                  <Input
                    className="w-28 h-9"
                    value={s.periods.join("")}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^1-9]/g, "");
                      updateSlot(i, { periods: digits.split("").map(Number) });
                    }}
                  />
                </div>
                <Badge variant="outline" className="font-mono">{formatSlot(s)}</Badge>
                <Button variant="ghost" size="icon" className="ml-auto" onClick={() => removeSlot(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" onClick={addSlot}>
            <Plus className="h-4 w-4 mr-1" />Adicionar horário
          </Button>
          <div className="flex items-center gap-3">
            {slots.length > 0 && (
              <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
                {formatSlots(slots)}
              </span>
            )}
            <Button onClick={save} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />Salvar grade
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
