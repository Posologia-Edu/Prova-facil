import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkPlus, FileText, Star, Trash2 } from "lucide-react";

type MedColumn = { id: string; label: string };
type MedFormContent = { columns: MedColumn[]; rows_score: number; answer_rows?: Record<string, string>[] };

type MedTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (title: string, formType: string, content: MedFormContent) => void;
};

export default function MedTemplateDialog({ open, onOpenChange, onApply }: MedTemplateDialogProps) {
  const queryClient = useQueryClient();

  const { data: userTemplates = [] } = useQuery({
    queryKey: ["med-templates-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("form_templates" as any)
        .select("*")
        .eq("area", "pharmacy")
        .eq("module_type", "quadro_resumo")
        .eq("owner_id", user.id)
        .eq("is_native", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const applyTemplate = (t: any) => {
    const content = typeof t.content_json === "string" ? JSON.parse(t.content_json) : t.content_json;
    onApply(t.title, t.form_type, content as MedFormContent);
    onOpenChange(false);
    toast({ title: "Template aplicado!", description: `"${t.title}" foi carregado.` });
  };

  const deleteTemplate = async (id: string) => {
    if (!window.confirm("Excluir este template?")) return;
    await supabase.from("form_templates" as any).delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["med-templates-user"] });
    toast({ title: "Template excluído" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Templates de Quadro Resumo
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[55vh] mt-3">
          {userTemplates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Nenhum template de Quadro Resumo salvo ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Salve um Quadro Resumo existente como template usando o botão ⭐ no editor.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userTemplates.map((t: any) => {
                const content = typeof t.content_json === "string" ? JSON.parse(t.content_json) : t.content_json;
                const colCount = content?.columns?.length || 0;
                return (
                  <Card key={t.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm">{t.title}</CardTitle>
                          {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => applyTemplate(t)}>Aplicar</Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteTemplate(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">Quadro Resumo</Badge>
                        <Badge variant="secondary" className="text-xs">{colCount} colunas</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ── Save Medication Template Dialog ──
type SaveMedTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formTitle: string;
  formType: string;
  contentJson: MedFormContent;
};

export function SaveMedTemplateDialog({ open, onOpenChange, formTitle, formType, contentJson }: SaveMedTemplateDialogProps) {
  const [title, setTitle] = useState(formTitle);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => { setTitle(formTitle); }, [formTitle]);

  const save = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase.from("form_templates" as any).insert({
        owner_id: user.id,
        area: "pharmacy",
        module_type: "quadro_resumo",
        form_type: formType,
        title,
        description: description || null,
        content_json: contentJson,
        is_native: false,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["med-templates-user"] });
      toast({ title: "Template salvo!", description: `"${title}" agora está disponível nos seus templates.` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar template", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const colCount = contentJson?.columns?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkPlus className="h-5 w-5" />
            Salvar Quadro Resumo como Template
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título do template</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Quadro Resumo Padrão" />
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o template..." rows={3} />
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">Quadro Resumo</Badge>
            <Badge variant="secondary">{colCount} colunas</Badge>
          </div>
          <Button onClick={save} disabled={!title.trim() || saving} className="w-full">
            {saving ? "Salvando..." : "Salvar Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
