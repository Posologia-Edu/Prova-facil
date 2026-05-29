import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Megaphone, Pin, PinOff, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  class_id: string;
  semester_id: string | null;
  title: string;
  body: string | null;
  pinned: boolean;
  created_at: string;
}

interface Props {
  classId: string;
  semesterId: string | null;
  compact?: boolean;
}

export function AnnouncementsBoard({ classId, semesterId, compact }: Props) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; editing?: Announcement | null }>({ open: false });

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [classId, semesterId]);

  async function load() {
    setLoading(true);
    let q = supabase.from("class_announcements").select("*").eq("class_id", classId);
    if (semesterId) q = q.or(`semester_id.eq.${semesterId},semester_id.is.null`);
    const { data, error } = await q.order("pinned", { ascending: false }).order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as any) || []);
    setLoading(false);
  }

  async function save(form: Partial<Announcement>) {
    if (!form.title?.trim()) return toast.error("Informe o título");
    const payload: any = {
      class_id: classId,
      semester_id: semesterId,
      title: form.title.trim(),
      body: form.body || null,
      pinned: form.pinned ?? false,
    };
    const { error } = dialog.editing
      ? await supabase.from("class_announcements").update(payload).eq("id", dialog.editing.id)
      : await supabase.from("class_announcements").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Comunicado salvo");
    setDialog({ open: false });
    load();
  }

  async function togglePin(a: Announcement) {
    await supabase.from("class_announcements").update({ pinned: !a.pinned }).eq("id", a.id);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir este comunicado?")) return;
    await supabase.from("class_announcements").delete().eq("id", id);
    load();
  }

  const visible = compact ? items.slice(0, 3) : items;

  return (
    <>
      <Card>
        <CardContent className={cn("p-5", compact && "p-4")}>
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />Mural de comunicados
            </div>
            <Button size="sm" variant="outline" onClick={() => setDialog({ open: true })}>
              <Plus className="w-3.5 h-3.5 mr-1" />Novo
            </Button>
          </div>

          {loading ? (
            <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : visible.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum comunicado ainda. Publique avisos, lembretes ou orientações para a turma.
            </p>
          ) : (
            <div className="space-y-2">
              {visible.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "rounded-lg border p-3 transition-shadow hover:shadow-sm",
                    a.pinned && "border-amber-400/60 bg-amber-50/50 dark:bg-amber-500/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {a.pinned && <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1 text-[10px]"><Pin className="h-2.5 w-2.5" />Fixado</Badge>}
                        <span className="font-medium">{a.title}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(a.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {a.body && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.body}</p>}
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePin(a)} title={a.pinned ? "Desafixar" : "Fixar"}>
                        {a.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialog({ open: true, editing: a })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(a.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {compact && items.length > visible.length && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{items.length - visible.length} comunicado(s)…
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AnnouncementDialog
        state={dialog}
        onClose={() => setDialog({ open: false })}
        onSave={save}
      />
    </>
  );
}

function AnnouncementDialog({
  state, onClose, onSave,
}: {
  state: { open: boolean; editing?: Announcement | null };
  onClose: () => void;
  onSave: (f: Partial<Announcement>) => void;
}) {
  const [form, setForm] = useState<Partial<Announcement>>({});
  useEffect(() => { setForm(state.editing ?? { title: "", body: "", pinned: false }); }, [state]);
  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state.editing ? "Editar comunicado" : "Novo comunicado"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Mudança de data da prova" />
          </div>
          <div className="space-y-1.5">
            <Label>Mensagem</Label>
            <Textarea rows={5} value={form.body ?? ""} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Detalhes do comunicado…" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.pinned ?? false} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
            Fixar no topo
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
