import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Search, Plus, Trash2, Download, Sparkles, Loader2, BookOpen } from "lucide-react";

interface ClinicalCaseBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: "anamnesis" | "reconciliation";
  onImport: (title: string, content: string) => void;
}

export default function ClinicalCaseBankDialog({ open, onOpenChange, phase, onImport }: ClinicalCaseBankDialogProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("my-cases");

  // Create new state
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTags, setNewTags] = useState("");
  const [aiTheme, setAiTheme] = useState("");
  const [generating, setGenerating] = useState(false);
  const [createMode, setCreateMode] = useState<"manual" | "ai">("manual");

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["clinical-case-bank", phase],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinical_case_bank")
        .select("*")
        .eq("phase", phase)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const filtered = cases.filter((c: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.title.toLowerCase().includes(q) || (c.tags || []).some((t: string) => t.toLowerCase().includes(q)) || (c.content || "").toLowerCase().includes(q);
  });

  const handleSaveManual = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast({ title: "Preencha título e conteúdo", variant: "destructive" });
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const tags = newTags.split(",").map(t => t.trim()).filter(Boolean);
    const { error } = await supabase.from("clinical_case_bank").insert({
      user_id: session.user.id,
      phase,
      title: newTitle.trim(),
      content: newContent.trim(),
      tags,
    });
    if (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
      return;
    }
    toast({ title: "Caso salvo no banco!" });
    setNewTitle("");
    setNewContent("");
    setNewTags("");
    queryClient.invalidateQueries({ queryKey: ["clinical-case-bank", phase] });
    setTab("my-cases");
  };

  const handleGenerateAI = async () => {
    if (!aiTheme.trim() || aiTheme.trim().length < 3) {
      toast({ title: "Informe uma temática (mínimo 3 caracteres)", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-clinical-case`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ phase, theme: aiTheme.trim() }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao gerar caso");
      }

      const { title, content } = await resp.json();
      setNewTitle(title || `Caso - ${aiTheme}`);
      setNewContent(content || "");
      setCreateMode("manual");
      toast({ title: "Caso gerado! Revise e salve." });
    } catch (err: any) {
      toast({ title: err.message || "Erro ao gerar caso", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleImport = (c: any) => {
    onImport(c.title, c.content);
    toast({ title: "Caso importado para a sala!" });
    onOpenChange(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("clinical_case_bank").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["clinical-case-bank", phase] });
    toast({ title: "Caso removido" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Banco de Casos Clínicos — {phase === "anamnesis" ? "Anamnese" : "Reconciliação"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="my-cases" className="flex-1">Meus Casos ({cases.length})</TabsTrigger>
            <TabsTrigger value="create" className="flex-1">Criar Novo</TabsTrigger>
          </TabsList>

          <TabsContent value="my-cases" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por título ou tag..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>

            {isLoading ? (
              <p className="text-muted-foreground text-sm text-center py-6">Carregando...</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{search ? "Nenhum caso encontrado." : "Nenhum caso salvo ainda."}</p>
                <Button variant="link" size="sm" onClick={() => setTab("create")} className="mt-2">
                  <Plus className="h-3.5 w-3.5 mr-1" />Criar primeiro caso
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((c: any) => (
                  <div key={c.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{(c.content || "").substring(0, 150)}...</p>
                        {c.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {c.tags.map((t: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => handleImport(c)}>
                          <Download className="h-3.5 w-3.5 mr-1" />Importar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Button variant={createMode === "manual" ? "default" : "outline"} size="sm" onClick={() => setCreateMode("manual")}>
                <Plus className="h-3.5 w-3.5 mr-1" />Manual
              </Button>
              <Button variant={createMode === "ai" ? "default" : "outline"} size="sm" onClick={() => setCreateMode("ai")}>
                <Sparkles className="h-3.5 w-3.5 mr-1" />Gerar com IA
              </Button>
            </div>

            {createMode === "ai" && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <Label>Temática desejada</Label>
                <Input
                  value={aiTheme}
                  onChange={e => setAiTheme(e.target.value)}
                  placeholder="Ex: Paciente diabético com insuficiência renal"
                />
                <Button onClick={handleGenerateAI} disabled={generating || aiTheme.trim().length < 3}>
                  {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  {generating ? "Gerando..." : "Gerar Caso com IA"}
                </Button>
                <p className="text-xs text-muted-foreground">O caso será gerado e preenchido nos campos abaixo para revisão.</p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label>Título</Label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Caso Clínico - Diabetes Tipo 2" />
              </div>
              <div>
                <Label>Conteúdo</Label>
                <Textarea value={newContent} onChange={e => setNewContent(e.target.value)} rows={10} placeholder="Descreva o caso clínico completo..." />
              </div>
              <div>
                <Label>Tags (separadas por vírgula)</Label>
                <Input value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="diabetes, cardiologia, idoso" />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveManual} disabled={!newTitle.trim() || !newContent.trim()}>
                  Salvar no Banco
                </Button>
                <Button variant="outline" onClick={() => {
                  if (newTitle.trim() && newContent.trim()) {
                    onImport(newTitle.trim(), newContent.trim());
                    toast({ title: "Caso importado direto para a sala!" });
                    onOpenChange(false);
                  }
                }} disabled={!newTitle.trim() || !newContent.trim()}>
                  <Download className="h-4 w-4 mr-1" />Importar Direto
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
