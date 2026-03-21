import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, FileText, Import } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FormField, FIELD_TYPE_LABELS } from "./types";

interface FormImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (fields: FormField[]) => void;
  formTable?: string;
}

type FormSource = {
  id: string;
  title: string;
  form_type: string;
  fields: FormField[];
  source: string;
};

const FORM_TABLES = [
  { table: "simulation_forms", label: "Anamnese" },
  { table: "soap_forms", label: "SOAP" },
  { table: "reconciliation_forms", label: "Reconciliação" },
  { table: "documentation_forms", label: "Documentação" },
] as const;

export default function FormImportDialog({ open, onOpenChange, onImport, formTable }: FormImportDialogProps) {
  const [forms, setForms] = useState<FormSource[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadForms();
  }, [open]);

  const loadForms = async () => {
    setLoading(true);
    const allForms: FormSource[] = [];

    const tables: Array<{ table: "simulation_forms" | "soap_forms" | "reconciliation_forms" | "documentation_forms"; label: string }> = [
      { table: "simulation_forms", label: "Anamnese" },
      { table: "soap_forms", label: "SOAP" },
      { table: "reconciliation_forms", label: "Reconciliação" },
      { table: "documentation_forms", label: "Documentação" },
    ];

    for (const { table, label } of tables) {
      const { data } = await supabase
        .from(table)
        .select("id, title, form_type, content_json")
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        for (const row of data) {
          const raw = row.content_json as any;
          const fields: FormField[] = Array.isArray(raw?.fields) ? raw.fields : (Array.isArray(raw) ? raw : []);
          if (fields.length > 0) {
            allForms.push({
              id: row.id,
              title: row.title || "Sem título",
              form_type: row.form_type,
              fields,
              source: label,
            });
          }
        }
      }
    }

    setForms(allForms);
    setLoading(false);
  };

  const selectedForm = forms.find(f => f.id === selectedFormId);

  const filteredForms = forms.filter(f =>
    f.title.toLowerCase().includes(search.toLowerCase()) ||
    f.source.toLowerCase().includes(search.toLowerCase())
  );

  const toggleField = (fieldId: string) => {
    setSelectedFieldIds(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });
  };

  const selectAll = () => {
    if (!selectedForm) return;
    const questionFields = selectedForm.fields.filter(f => f.type !== "section_header" && f.type !== "image_block" && f.type !== "video_block");
    setSelectedFieldIds(new Set(questionFields.map(f => f.id)));
  };

  const handleImport = () => {
    if (!selectedForm) return;
    const imported = selectedForm.fields.filter(f => selectedFieldIds.has(f.id));
    onImport(imported);
    onOpenChange(false);
    setSelectedFormId(null);
    setSelectedFieldIds(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Import className="h-5 w-5" />
            Importar perguntas de outro formulário
          </DialogTitle>
        </DialogHeader>

        {!selectedForm ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar formulário..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  Carregando formulários...
                </div>
              ) : filteredForms.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  Nenhum formulário encontrado
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredForms.map(form => (
                    <button
                      key={form.id}
                      className="w-full text-left p-3 rounded-lg hover:bg-accent/50 transition-colors flex items-center justify-between group"
                      onClick={() => {
                        setSelectedFormId(form.id);
                        setSelectedFieldIds(new Set());
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{form.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {form.fields.filter(f => f.type !== "section_header").length} perguntas
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">{form.source}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setSelectedFormId(null)}>
                ← Voltar
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectAll} className="text-xs">
                  Selecionar todas
                </Button>
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={selectedFieldIds.size === 0}
                  className="text-xs"
                >
                  <Import className="h-3 w-3 mr-1" />
                  Importar ({selectedFieldIds.size})
                </Button>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-sm font-medium">{selectedForm.title}</p>
              <p className="text-xs text-muted-foreground">{selectedForm.source} · {selectedForm.form_type}</p>
            </div>

            <ScrollArea className="h-[350px]">
              <div className="space-y-1.5">
                {selectedForm.fields.map((field) => {
                  if (field.type === "section_header" || field.type === "image_block" || field.type === "video_block") {
                    return (
                      <div key={field.id} className="px-3 py-1.5 text-xs font-semibold text-primary uppercase tracking-wide">
                        {field.label || "Seção"}
                      </div>
                    );
                  }
                  return (
                    <label
                      key={field.id}
                      className="flex items-center gap-3 p-2.5 rounded-md hover:bg-accent/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedFieldIds.has(field.id)}
                        onCheckedChange={() => toggleField(field.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{field.label || "(Sem rótulo)"}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {FIELD_TYPE_LABELS[field.type] || field.type}
                      </Badge>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
