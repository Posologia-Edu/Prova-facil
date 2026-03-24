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
import { getNativeTemplates, type NativeTemplate } from "@/lib/form-templates";
import { BookmarkPlus, FileText, Star, Trash2 } from "lucide-react";
import type { FormField } from "./types";

type FormTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area: string;
  moduleType: string;
  onApply: (title: string, formType: string, fields: FormField[]) => void;
};

export default function FormTemplateDialog({ open, onOpenChange, area, moduleType, onApply }: FormTemplateDialogProps) {
  const queryClient = useQueryClient();
  const nativeTemplates = getNativeTemplates(area, moduleType);

  const { data: userTemplates = [] } = useQuery({
    queryKey: ["form-templates-user", area, moduleType],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("form_templates" as any)
        .select("*")
        .eq("area", area)
        .eq("module_type", moduleType)
        .eq("owner_id", user.id)
        .eq("is_native", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const applyTemplate = (t: NativeTemplate | any) => {
    const fields = Array.isArray(t.content_json) ? t.content_json : JSON.parse(t.content_json);
    onApply(t.title, t.form_type, fields);
    onOpenChange(false);
    toast({ title: "Template aplicado!", description: `"${t.title}" foi carregado no formulário.` });
  };

  const deleteUserTemplate = async (id: string) => {
    if (!window.confirm("Excluir este template?")) return;
    await supabase.from("form_templates" as any).delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["form-templates-user", area, moduleType] });
    toast({ title: "Template excluído" });
  };

  const countFields = (content: any) => {
    const fields = Array.isArray(content) ? content : [];
    return fields.filter((f: FormField) => f.type !== "section_header").length;
  };

  const totalScore = (content: any) => {
    const fields = Array.isArray(content) ? content : [];
    return fields.reduce((sum: number, f: FormField) => sum + (f.max_score || 0), 0);
  };

  const formTypeLabel: Record<string, string> = { standard: "Formulário", answer_key: "Espelho" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Usar Template
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="native">
          <TabsList className="w-full">
            <TabsTrigger value="native" className="flex-1">
              <Star className="h-4 w-4 mr-1" />
              Templates Nativos ({nativeTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex-1">
              <BookmarkPlus className="h-4 w-4 mr-1" />
              Meus Templates ({userTemplates.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[55vh] mt-3">
            <TabsContent value="native" className="space-y-3 mt-0">
              {nativeTemplates.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum template nativo para este módulo.</p>
              )}
              {nativeTemplates.map((t, i) => (
                <Card key={i} className={`cursor-pointer hover:border-primary/50 transition-colors ${t.form_type === "answer_key" ? "border-l-4 border-l-primary/30" : ""}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">{t.title}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                      </div>
                      <Button size="sm" onClick={() => applyTemplate(t)}>Aplicar</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">{formTypeLabel[t.form_type] || t.form_type}</Badge>
                      <Badge variant="secondary" className="text-xs">{countFields(t.content_json)} campos</Badge>
                      {totalScore(t.content_json) > 0 && (
                        <Badge variant="secondary" className="text-xs">{totalScore(t.content_json)} pts</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="custom" className="space-y-3 mt-0">
              {userTemplates.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Nenhum template próprio ainda.</p>
                  <p className="text-xs text-muted-foreground mt-1">Salve formulários existentes como template usando o botão ⭐ no editor.</p>
                </div>
              )}
              {userTemplates.map((t: any) => (
                <Card key={t.id} className={`cursor-pointer hover:border-primary/50 transition-colors ${t.form_type === "answer_key" ? "border-l-4 border-l-primary/30" : ""}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">{t.title}</CardTitle>
                        {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => applyTemplate(t)}>Aplicar</Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteUserTemplate(t.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">{formTypeLabel[t.form_type] || t.form_type}</Badge>
                      <Badge variant="secondary" className="text-xs">{countFields(t.content_json)} campos</Badge>
                      {totalScore(t.content_json) > 0 && (
                        <Badge variant="secondary" className="text-xs">{totalScore(t.content_json)} pts</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ── Save as Template Dialog ──
type SaveAsTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area: string;
  moduleType: string;
  formTitle: string;
  formType: string;
  contentJson: FormField[];
};

export function SaveAsTemplateDialog({ open, onOpenChange, area, moduleType, formTitle, formType, contentJson }: SaveAsTemplateDialogProps) {
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
        area,
        module_type: moduleType,
        form_type: formType,
        title,
        description: description || null,
        content_json: contentJson,
        is_native: false,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["form-templates-user"] });
      toast({ title: "Template salvo!", description: `"${title}" agora está disponível nos seus templates.` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar template", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkPlus className="h-5 w-5" />
            Salvar como Template
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título do template</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Minha Ficha SOAP" />
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o template..." rows={3} />
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{formType === "answer_key" ? "Espelho" : "Formulário"}</Badge>
            <Badge variant="secondary">{contentJson.filter(f => f.type !== "section_header").length} campos</Badge>
          </div>
          <Button onClick={save} disabled={!title.trim() || saving} className="w-full">
            {saving ? "Salvando..." : "Salvar Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
