import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Library, Search, Trash2, FileDown } from "lucide-react";

interface BankCase {
  id: string;
  title: string;
  case_number: string | null;
  learning_objectives: string | null;
  process_content: string;
  characters_json: any;
  tags: string[];
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mockTrialId: string;
  nextPosition: number;
  onImported: () => void;
}

export function MockTrialCaseBankDialog({
  open,
  onOpenChange,
  mockTrialId,
  nextPosition,
  onImported,
}: Props) {
  const [items, setItems] = useState<BankCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (supabase as any)
      .from("mock_trial_case_bank")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }: any) => {
        if (error) toast.error("Erro ao carregar banco de processos");
        else setItems(data || []);
        setLoading(false);
      });
  }, [open]);

  const filtered = items.filter((it) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      it.title.toLowerCase().includes(q) ||
      (it.learning_objectives || "").toLowerCase().includes(q) ||
      (it.case_number || "").toLowerCase().includes(q) ||
      (it.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  });

  const importCase = async (item: BankCase) => {
    setImportingId(item.id);
    try {
      const year = new Date().getFullYear();
      const newCaseNumber = `${String(nextPosition + 1).padStart(3, "0")}/${year}`;
      const { error } = await supabase.from("mock_trial_cases").insert({
        mock_trial_id: mockTrialId,
        position: nextPosition,
        case_number: newCaseNumber,
        title: item.title,
        process_content: item.process_content,
        learning_objectives: item.learning_objectives,
        characters_json: item.characters_json || [],
      });
      if (error) throw error;
      toast.success("Processo importado do banco");
      onImported();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao importar");
    } finally {
      setImportingId(null);
    }
  };

  const deleteCase = async (id: string) => {
    if (!confirm("Excluir este processo do banco? Esta ação não pode ser desfeita.")) return;
    const { error } = await (supabase as any)
      .from("mock_trial_case_bank")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Removido do banco");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Banco de Processos
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, objetivos, número ou tag..."
          />
        </div>

        <ScrollArea className="h-[55vh] pr-2">
          {loading ? (
            <div className="text-sm text-muted-foreground p-4">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 text-center">
              Nenhum processo no banco. Salve processos a partir de um Júri Simulado para reutilizá-los.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{item.title}</p>
                        {item.case_number && (
                          <Badge variant="outline" className="text-[10px]">
                            {item.case_number}
                          </Badge>
                        )}
                      </div>
                      {item.learning_objectives && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {item.learning_objectives}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">
                          {(item.process_content || "").length.toLocaleString("pt-BR")} caracteres
                        </span>
                        {Array.isArray(item.characters_json) && item.characters_json.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            • {item.characters_json.length} personagens
                          </span>
                        )}
                        {(item.tags || []).map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => importCase(item)}
                        disabled={importingId === item.id}
                      >
                        <FileDown className="h-3 w-3 mr-1" />
                        {importingId === item.id ? "Importando..." : "Importar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteCase(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
