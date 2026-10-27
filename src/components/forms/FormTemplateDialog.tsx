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
import { BookmarkPlus, FileText, HeartPulse, Share2, Star, Trash2, Users } from "lucide-react";
import { isCaseDataV2, type VpCaseData } from "@/lib/vp-case-schema";
import { buildPatientRoteiro, roteiroTitle, roteiroToText, type PatientRoteiro } from "@/lib/vp-patient-roteiro";
import type { FormField } from "./types";
import ShareTemplateDialog from "./ShareTemplateDialog";

type FormTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area: string;
  moduleType: string;
  onApply: (title: string, formType: string, fields: FormField[]) => void;
  /** Só no roteiro do paciente da simulação: habilita a aba "Pacientes virtuais" (casos v2 de Farmácia do professor). */
  virtualPatients?: { onApplyCase: (c: { title: string; script: string; roteiro: PatientRoteiro }) => void };
};

export default function FormTemplateDialog({ open, onOpenChange, area, moduleType, onApply, virtualPatients }: FormTemplateDialogProps) {
  const queryClient = useQueryClient();
  const nativeTemplates = getNativeTemplates(area, moduleType);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ id: string; title: string } | null>(null);

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

  const { data: sharedTemplates = [] } = useQuery({
    queryKey: ["form-templates-shared", area, moduleType],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get shares for current user
      const { data: shares, error: sharesErr } = await supabase
        .from("form_template_shares" as any)
        .select("template_id, shared_by")
        .eq("shared_with", user.id);
      if (sharesErr || !shares?.length) return [];

      const templateIds = shares.map((s: any) => s.template_id);
      const { data: templates, error: tplErr } = await supabase
        .from("form_templates" as any)
        .select("*")
        .in("id", templateIds)
        .eq("area", area)
        .eq("module_type", moduleType);
      if (tplErr) throw tplErr;

      // Get owner names
      const ownerIds = [...new Set((templates || []).map((t: any) => t.owner_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ownerIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));

      return (templates || []).map((t: any) => ({
        ...t,
        owner_name: profileMap.get(t.owner_id) || "Professor",
      }));
    },
    enabled: open,
  });

  // Casos v2 publicados do professor, com versão Farmácia. Lista ao vivo: um paciente virtual novo aparece sozinho.
  const { data: vpCases = [], isLoading: vpLoading } = useQuery({
    queryKey: ["form-templates-vp-cases"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("custom_virtual_patients")
        .select("id, name, age, status, is_legacy, case_data, created_at")
        .eq("user_id", user.id)
        .eq("is_legacy", false)
        .neq("status", "draft")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || [])
        .filter((r: any) => isCaseDataV2(r.case_data) && !!(r.case_data as VpCaseData).versoes?.farmaceutico)
        .map((r: any) => ({ id: r.id as string, name: r.name as string, data: r.case_data as VpCaseData }));
    },
    enabled: open && !!virtualPatients,
  });

  const applyVpCase = (vp: { name: string; data: VpCaseData }) => {
    const roteiro = buildPatientRoteiro(vp.data, "farmaceutico");
    if (!roteiro || !virtualPatients) return;
    virtualPatients.onApplyCase({ title: roteiroTitle(roteiro), script: roteiroToText(roteiro), roteiro });
    onOpenChange(false);
    toast({ title: "Caso adicionado!", description: `"${vp.name}" entrou na lista de casos da sala.` });
  };

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

  const openShareDialog = (id: string, title: string) => {
    setShareTarget({ id, title });
    setShareDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Usar Template
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue={virtualPatients ? "vp" : "native"}>
            <TabsList className="w-full">
              {virtualPatients && (
                <TabsTrigger value="vp" className="flex-1">
                  <HeartPulse className="h-4 w-4 mr-1" />
                  Pacientes virtuais ({vpCases.length})
                </TabsTrigger>
              )}
              <TabsTrigger value="native" className="flex-1">
                <Star className="h-4 w-4 mr-1" />
                Nativos ({nativeTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex-1">
                <BookmarkPlus className="h-4 w-4 mr-1" />
                Meus ({userTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="shared" className="flex-1">
                <Users className="h-4 w-4 mr-1" />
                Compartilhados ({sharedTemplates.length})
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[55vh] mt-3">
              {virtualPatients && (
                <TabsContent value="vp" className="space-y-3 mt-0">
                  <p className="text-xs text-muted-foreground">
                    Seus pacientes virtuais publicados, na versão Farmácia. Aplicar adiciona o caso à lista da sala, com o roteiro do paciente copiado neste momento.
                  </p>
                  {vpLoading && <p className="text-sm text-muted-foreground text-center py-8">Carregando…</p>}
                  {!vpLoading && vpCases.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">Nenhum paciente virtual publicado com versão Farmácia.</p>
                      <p className="text-xs text-muted-foreground mt-1">Crie ou publique um caso em Pacientes Virtuais para ele aparecer aqui.</p>
                    </div>
                  )}
                  {vpCases.map((vp) => {
                    const r = buildPatientRoteiro(vp.data, "farmaceutico");
                    return (
                      <Card key={vp.id} className="hover:border-primary/50 transition-colors">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <CardTitle className="text-sm">{vp.name}</CardTitle>
                              {r && <p className="text-xs text-muted-foreground mt-1">{roteiroTitle(r)} · {r.local}</p>}
                            </div>
                            <Button size="sm" onClick={() => applyVpCase(vp)}>Aplicar</Button>
                          </div>
                        </CardHeader>
                        {r && (
                          <CardContent className="pt-0">
                            <div className="flex gap-2">
                              <Badge variant="outline" className="text-xs">{r.fatos.length} informações</Badge>
                              <Badge variant="secondary" className="text-xs">{r.medicamentos.length} medicamentos</Badge>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </TabsContent>
              )}
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
                          <Button size="sm" variant="ghost" onClick={() => openShareDialog(t.id, t.title)} title="Compartilhar">
                            <Share2 className="h-3.5 w-3.5" />
                          </Button>
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

              <TabsContent value="shared" className="space-y-3 mt-0">
                {sharedTemplates.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Nenhum template compartilhado com você.</p>
                    <p className="text-xs text-muted-foreground mt-1">Outros professores podem compartilhar templates com você por e-mail.</p>
                  </div>
                )}
                {sharedTemplates.map((t: any) => (
                  <Card key={t.id} className={`cursor-pointer hover:border-primary/50 transition-colors ${t.form_type === "answer_key" ? "border-l-4 border-l-primary/30" : ""}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm">{t.title}</CardTitle>
                          {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
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
                        <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                          <Users className="h-3 w-3 mr-1" />
                          {t.owner_name}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {shareTarget && (
        <ShareTemplateDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          templateId={shareTarget.id}
          templateTitle={shareTarget.title}
        />
      )}
    </>
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
