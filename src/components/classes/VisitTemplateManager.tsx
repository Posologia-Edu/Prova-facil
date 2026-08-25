import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, MapPin, User, Phone, Users as UsersIcon, Pencil } from "lucide-react";
import { toast } from "sonner";

export interface VisitTemplate {
  id: string;
  class_id: string;
  title: string;
  location: string | null;
  preceptor_name: string | null;
  preceptor_phone: string | null;
  notes: string | null;
  default_student_ids: string[];
  teacher_id?: string | null;
}

interface Student { id: string; student_name: string; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  classId: string;
  semesterId: string;
  onChanged?: () => void;
}

export function VisitTemplateManager({ open, onOpenChange, classId, semesterId, onChanged }: Props) {
  const [templates, setTemplates] = useState<VisitTemplate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [editing, setEditing] = useState<VisitTemplate | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: t }, { data: s }] = await Promise.all([
      supabase.from("class_visit_templates" as any).select("*").eq("class_id", classId).order("title"),
      supabase.from("class_students").select("id,student_name").eq("semester_id", semesterId).order("student_name"),
    ]);
    setTemplates(((t as any) || []).map((x: any) => ({ ...x, default_student_ids: x.default_student_ids || [] })));
    setStudents((s as any) || []);
    setLoading(false);
  }

  useEffect(() => {
    if (open) load();
  }, [open, classId, semesterId]);

  function newTemplate() {
    setEditing({
      id: "",
      class_id: classId,
      title: "",
      location: null,
      preceptor_name: null,
      preceptor_phone: null,
      notes: null,
      default_student_ids: [],
    });
  }

  async function save() {
    if (!editing) return;
    if (!editing.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    const payload = {
      class_id: classId,
      title: editing.title.trim(),
      location: editing.location,
      preceptor_name: editing.preceptor_name,
      preceptor_phone: editing.preceptor_phone,
      notes: editing.notes,
      default_student_ids: editing.default_student_ids,
    };
    let err;
    if (editing.id) {
      ({ error: err } = await supabase.from("class_visit_templates" as any).update(payload).eq("id", editing.id));
    } else {
      ({ error: err } = await supabase.from("class_visit_templates" as any).insert(payload));
    }
    if (err) {
      toast.error(err.message);
      return;
    }
    toast.success("Visita salva no catálogo");
    setEditing(null);
    await load();
    onChanged?.();
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta visita do catálogo?")) return;
    const { error } = await supabase.from("class_visit_templates" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    await load();
    onChanged?.();
  }

  function toggleStudent(id: string) {
    if (!editing) return;
    const cur = editing.default_student_ids;
    setEditing({
      ...editing,
      default_student_ids: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Catálogo de visitas técnicas</DialogTitle>
        </DialogHeader>

        {!editing ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Cadastre uma vez os locais de visita, preceptores e alunos padrão. Depois basta selecionar a visita ao adicioná-la no cronograma.
              </p>
              <Button size="sm" onClick={newTemplate}><Plus className="h-4 w-4 mr-1" />Nova visita</Button>
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : templates.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">Nenhuma visita cadastrada.</p>
            ) : (
              <div className="space-y-2">
                {templates.map((t) => (
                  <Card key={t.id}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{t.title}</span>
                            <Badge variant="secondary" className="text-xs">
                              <UsersIcon className="h-3 w-3 mr-1" />{t.default_student_ids.length}
                            </Badge>
                          </div>
                          {t.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {t.location.startsWith("http") ? (
                                <a href={t.location} target="_blank" rel="noreferrer" className="underline truncate max-w-md">{t.location}</a>
                              ) : t.location}
                            </p>
                          )}
                          {(t.preceptor_name || t.preceptor_phone) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                              {t.preceptor_name && (<><User className="h-3 w-3" />{t.preceptor_name}</>)}
                              {t.preceptor_phone && (<><Phone className="h-3 w-3" />{t.preceptor_phone}</>)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditing(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(t.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Título</Label>
              <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Ex.: Visita ao Hospital X" />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" />Local (URL do Google Maps)</Label>
              <Input value={editing.location ?? ""} onChange={(e) => setEditing({ ...editing, location: e.target.value || null })} placeholder="https://maps.google.com/..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="flex items-center gap-1"><User className="h-3 w-3" />Preceptor</Label>
                <Input value={editing.preceptor_name ?? ""} onChange={(e) => setEditing({ ...editing, preceptor_name: e.target.value || null })} />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1"><Phone className="h-3 w-3" />Telefone</Label>
                <Input value={editing.preceptor_phone ?? ""} onChange={(e) => setEditing({ ...editing, preceptor_phone: e.target.value || null })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea rows={2} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value || null })} />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1"><UsersIcon className="h-3 w-3" />Alunos padrão ({editing.default_student_ids.length})</Label>
              <div className="max-h-52 overflow-y-auto border rounded p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                {students.length === 0 ? (
                  <p className="text-xs text-muted-foreground col-span-2">Sem alunos no semestre.</p>
                ) : students.map((st) => (
                  <label key={st.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={editing.default_student_ids.includes(st.id)} onCheckedChange={() => toggleStudent(st.id)} />
                    <span className="truncate">{st.student_name}</span>
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={save}>Salvar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
