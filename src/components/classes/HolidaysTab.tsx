import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, CalendarOff } from "lucide-react";
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

export function HolidaysTab({ classId }: Props) {
  const [items, setItems] = useState<Holiday[]>([]);
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
    load();
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
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
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
