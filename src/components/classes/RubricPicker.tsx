import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Library, Save, Trash2, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_SEMINAR_RUBRIC, SeminarRubric,
} from "@/lib/seminar-rubric";

export interface SavedRubric {
  id: string;
  name: string;
  description: string | null;
  scope: string;
  rubric_json: SeminarRubric;
}

interface Props {
  value: string | null;
  onChange: (rubricId: string | null, rubric: SeminarRubric | null) => void;
  scope?: string;
  label?: string;
}

export function RubricPicker({ value, onChange, scope = "seminar", label = "Rubrica da biblioteca" }: Props) {
  const [rubrics, setRubrics] = useState<SavedRubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [scope]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("class_rubrics")
      .select("*")
      .eq("scope", scope)
      .order("name");
    setRubrics((data as any) || []);
    setLoading(false);
  }

  function handleChange(v: string) {
    if (v === "__none__") {
      onChange(null, null);
      return;
    }
    const r = rubrics.find((x) => x.id === v);
    if (r) onChange(r.id, r.rubric_json);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5"><Library className="w-3.5 h-3.5" />{label}</Label>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setManageOpen(true)}>
          Gerenciar
        </Button>
      </div>
      <Select value={value ?? "__none__"} onValueChange={handleChange} disabled={loading}>
        <SelectTrigger><SelectValue placeholder="Selecionar rubrica..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— Nenhuma —</SelectItem>
          {rubrics.map((r) => (
            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <RubricLibraryDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        scope={scope}
        rubrics={rubrics}
        onChanged={load}
      />
    </div>
  );
}

function RubricLibraryDialog({
  open, onOpenChange, scope, rubrics, onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scope: string;
  rubrics: SavedRubric[];
  onChanged: () => void;
}) {
  const [form, setForm] = useState<{ id?: string; name: string; description: string }>({
    name: "", description: "",
  });
  const [saving, setSaving] = useState(false);

  function reset() { setForm({ name: "", description: "" }); }

  async function save() {
    if (!form.name.trim()) return toast.error("Informe o nome");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) { setSaving(false); return toast.error("Sessão inválida"); }
    const payload: any = {
      user_id: uid,
      name: form.name.trim(),
      description: form.description || null,
      scope,
      rubric_json: DEFAULT_SEMINAR_RUBRIC,
    };
    const { error } = form.id
      ? await supabase.from("class_rubrics").update({ name: payload.name, description: payload.description }).eq("id", form.id)
      : await supabase.from("class_rubrics").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Rubrica salva — edite o detalhamento ao usar em uma avaliação");
    reset();
    onChanged();
  }

  async function remove(id: string) {
    if (!confirm("Excluir rubrica?")) return;
    const { error } = await supabase.from("class_rubrics").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChanged();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Library className="w-5 h-5" />Biblioteca de rubricas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3 space-y-2 bg-muted/30">
            <div className="text-sm font-medium">{form.id ? "Editar rubrica" : "Nova rubrica"}</div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-2">
              <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Textarea rows={2} placeholder="Descrição (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end">
              {form.id && <Button variant="outline" size="sm" onClick={reset}>Cancelar</Button>}
              <Button size="sm" onClick={save} disabled={saving}>
                {saving && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                <Save className="w-3.5 h-3.5 mr-1" />Salvar
              </Button>
            </div>
            {!form.id && (
              <p className="text-[11px] text-muted-foreground">
                A rubrica é criada com o template padrão. Você pode personalizar critérios e pesos ao usá-la em uma avaliação.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Rubricas salvas</Label>
            {rubrics.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma rubrica cadastrada.</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {rubrics.map((r) => (
                  <div key={r.id} className="flex items-start gap-2 rounded border p-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{r.name}</span>
                        <Badge variant="outline" className="text-[10px]">{r.scope}</Badge>
                      </div>
                      {r.description && <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setForm({ id: r.id, name: r.name, description: r.description || "" })}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(r.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
