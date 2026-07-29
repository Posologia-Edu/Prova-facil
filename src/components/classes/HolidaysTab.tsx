import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, CalendarOff, CalendarCheck } from "lucide-react";
import { WeeklySlot, slotsForDate, formatSlot } from "@/lib/class-schedule-notation";
import { toast } from "sonner";

interface Holiday {
  id: string;
  user_id: string;
  class_id: string | null;
  holiday_date: string;
  name: string;
  recurring_yearly: boolean;
}

interface Props {
  classId: string;
  semesterId?: string | null;
  onScheduleChanged?: () => void;
}

const PRESET_BR = [
  { date: "01-01", name: "Confraternização Universal" },
  { date: "04-21", name: "Tiradentes" },
  { date: "05-01", name: "Dia do Trabalho" },
  { date: "09-07", name: "Independência" },
  { date: "10-12", name: "Nossa Senhora Aparecida" },
  { date: "11-02", name: "Finados" },
  { date: "11-15", name: "Proclamação da República" },
  { date: "12-25", name: "Natal" },
];

export function HolidaysTab({ classId, semesterId, onScheduleChanged }: Props) {
  const [items, setItems] = useState<Holiday[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [dlg, setDlg] = useState<{ open: boolean; editing?: Holiday | null }>({ open: false });
  const [form, setForm] = useState<Partial<Holiday>>({});


  async function load() {
    const { data } = await supabase
      .from("class_holidays")
      .select("*")
      .or(`class_id.eq.${classId},class_id.is.null`)
      .order("holiday_date");
    setItems((data as any) || []);
  }
  useEffect(() => { load(); }, [classId]);

  useEffect(() => {
    if (dlg.open) {
      setForm(dlg.editing ?? { name: "", holiday_date: "", recurring_yearly: false });
    }
  }, [dlg]);

  async function save() {
    if (!form.name?.trim() || !form.holiday_date) {
      toast.error("Informe a data e o nome do feriado");
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;
    const payload = {
      user_id: uid,
      class_id: classId,
      name: form.name.trim(),
      holiday_date: form.holiday_date,
      recurring_yearly: !!form.recurring_yearly,
    };
    const { error } = dlg.editing
      ? await supabase.from("class_holidays").update(payload).eq("id", dlg.editing.id)
      : await supabase.from("class_holidays").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Feriado salvo");
    setDlg({ open: false });
    await load();
    await syncToSchedule(true);
  }

  async function remove(h: Holiday) {
    if (!confirm(`Excluir "${h.name}"?`)) return;
    const { error } = await supabase.from("class_holidays").delete().eq("id", h.id);
    if (error) return toast.error(error.message);
    load();
  }

  async function importBrPresets() {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;
    const year = new Date().getFullYear();
    const rows = PRESET_BR.map((p) => ({
      user_id: uid,
      class_id: classId,
      holiday_date: `${year}-${p.date}`,
      name: p.name,
      recurring_yearly: true,
    }));
    const { error } = await supabase.from("class_holidays").insert(rows);
    if (error) return toast.error(error.message);
    toast.success("Feriados nacionais importados");
    await load();
    await syncToSchedule(true);
  }

  // Lança no cronograma os feriados que caem em um dia da semana com aula (grade do semestre)
  async function syncToSchedule(silent = false) {
    if (!semesterId) {
      if (!silent) toast.error("Selecione um semestre para lançar os feriados no cronograma");
      return;
    }
    setSyncing(true);
    try {
      const [{ data: sem }, { data: cls }, { data: existing }] = await Promise.all([
        supabase.from("class_semesters").select("start_date,end_date").eq("id", semesterId).single(),
        supabase.from("classes").select("weekly_schedule").eq("id", classId).single(),
        supabase.from("class_schedule_items").select("lesson_date,is_holiday").eq("semester_id", semesterId),
      ]);
      const start = (sem as any)?.start_date;
      const end = (sem as any)?.end_date;
      if (!start || !end) {
        if (!silent) toast.error("Defina a data de início e término do semestre para lançar os feriados");
        return;
      }
      const weekly = (((cls as any)?.weekly_schedule || []) as WeeklySlot[]);
      if (!weekly.length) {
        if (!silent) toast.error("Cadastre a grade semanal (notação) da turma primeiro");
        return;
      }
      const holidays = await fetchHolidaysFor(classId);
      const taken = new Set(
        ((existing as any[]) || []).filter((i) => i.is_holiday && i.lesson_date).map((i) => i.lesson_date as string)
      );

      const rows: any[] = [];
      const cursor = new Date(start + "T12:00:00");
      const last = new Date(end + "T12:00:00");
      while (cursor <= last) {
        const iso = cursor.toISOString().slice(0, 10);
        const hit = holidayMatchingDate(holidays, iso);
        const slots = hit ? slotsForDate(weekly, iso) : [];
        if (hit && slots.length > 0 && !taken.has(iso)) {
          taken.add(iso);
          rows.push({
            semester_id: semesterId,
            lesson_date: iso,
            title: `Feriado — ${hit.name}`,
            lesson_type: "holiday",
            template_data: {},
            rubric_json: {},
            status: "cancelled",
            is_holiday: true,
            holiday_name: hit.name,
            time_slot: formatSlot(slots[0]),
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      if (rows.length === 0) {
        if (!silent) toast.info("Nenhum feriado novo coincide com os dias de aula do semestre");
        return;
      }
      const { error } = await supabase.from("class_schedule_items").insert(rows);
      if (error) return toast.error(error.message);
      toast.success(`${rows.length} feriado(s) lançado(s) no cronograma`);
      onScheduleChanged?.();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => syncToSchedule(false)} disabled={syncing}>
          <CalendarCheck className="w-4 h-4 mr-1" />Lançar no cronograma
        </Button>
        <Button variant="outline" onClick={importBrPresets}>
          <CalendarOff className="w-4 h-4 mr-1" />Importar feriados nacionais BR
        </Button>
        <Button onClick={() => setDlg({ open: true, editing: null })}>
          <Plus className="w-4 h-4 mr-1" />Novo feriado
        </Button>
      </div>


      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum feriado cadastrado. Cadastre para que apareçam automaticamente no cronograma.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Data</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-32">Recorrente</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="tabular-nums">{h.holiday_date}</TableCell>
                  <TableCell className="font-medium">{h.name}</TableCell>
                  <TableCell>
                    {h.recurring_yearly ? <Badge>Anual</Badge> : <Badge variant="outline">Único</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setDlg({ open: true, editing: h })}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(h)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={dlg.open} onOpenChange={(o) => !o && setDlg({ open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dlg.editing ? "Editar feriado" : "Novo feriado"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={form.holiday_date ?? ""} onChange={(e) => setForm({ ...form, holiday_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Carnaval" />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="recurring"
                type="checkbox"
                checked={form.recurring_yearly ?? false}
                onChange={(e) => setForm({ ...form, recurring_yearly: e.target.checked })}
              />
              <Label htmlFor="recurring">Repetir todos os anos</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg({ open: false })}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export async function fetchHolidaysFor(classId: string): Promise<Holiday[]> {
  const { data } = await supabase
    .from("class_holidays")
    .select("*")
    .or(`class_id.eq.${classId},class_id.is.null`);
  return (data as any) || [];
}

export function holidayMatchingDate(holidays: Holiday[], isoDate: string): Holiday | null {
  if (!isoDate) return null;
  const md = isoDate.slice(5); // MM-DD
  for (const h of holidays) {
    if (h.recurring_yearly) {
      if (h.holiday_date.slice(5) === md) return h;
    } else if (h.holiday_date === isoDate) {
      return h;
    }
  }
  return null;
}
