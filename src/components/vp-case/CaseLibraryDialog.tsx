import { useEffect, useState } from "react";
import { BookOpen, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export const DIFICULDADES = [
  { value: "facil", label: "Fácil" },
  { value: "medio", label: "Médio" },
  { value: "dificil", label: "Difícil" },
];

interface SeedCase {
  id: string;
  titulo: string;
  tema: string;
  dificuldade: string;
  resumo: string;
  profissoes: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** chamado depois que a cópia foi criada como rascunho na conta do docente */
  onCopied: (id: string) => void;
}

// Biblioteca de casos-semente (P13): casos já revisados que o docente copia para a própria conta,
// ajusta no editor e publica.
export function CaseLibraryDialog({ open, onOpenChange, onCopied }: Props) {
  const [items, setItems] = useState<SeedCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState<string>("todos");
  const [copying, setCopying] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (supabase as any)
      .from("vp_seed_cases")
      .select("id, titulo, tema, dificuldade, resumo, profissoes")
      .order("created_at", { ascending: true })
      .then(({ data, error }: any) => {
        if (error) toast.error(error.message);
        else setItems(data || []);
        setLoading(false);
      });
  }, [open]);

  const copiar = async (id: string) => {
    setCopying(id);
    const { data, error } = await (supabase as any).rpc("copy_vp_seed_case", { _seed_id: id });
    setCopying(null);
    if (error || !data) {
      toast.error(error?.message || "Não foi possível copiar o caso.");
      return;
    }
    toast.success("Caso copiado como rascunho. Revise no editor antes de usar com os alunos.");
    onOpenChange(false);
    onCopied(data as string);
  };

  const visiveis = items.filter((i) => filtro === "todos" || i.dificuldade === filtro);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" />Biblioteca de casos</DialogTitle>
          <DialogDescription>
            Casos prontos e revisados. Ao copiar, você recebe um rascunho só seu, que pode editar à vontade.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {[{ value: "todos", label: "Todos" }, ...DIFICULDADES].map((d) => (
            <Button key={d.value} size="sm" variant={filtro === d.value ? "default" : "outline"} onClick={() => setFiltro(d.value)}>
              {d.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : visiveis.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum caso nesta categoria ainda.</p>
        ) : (
          <div className="space-y-3">
            {visiveis.map((c) => (
              <div key={c.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{c.titulo}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <Badge variant="secondary">{DIFICULDADES.find((d) => d.value === c.dificuldade)?.label ?? c.dificuldade}</Badge>
                      {c.tema && <Badge variant="outline">{c.tema}</Badge>}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => copiar(c.id)} disabled={copying !== null}>
                    {copying === c.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Copy className="h-4 w-4 mr-1" />}
                    Usar este caso
                  </Button>
                </div>
                {c.resumo && <p className="text-sm text-muted-foreground">{c.resumo}</p>}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
