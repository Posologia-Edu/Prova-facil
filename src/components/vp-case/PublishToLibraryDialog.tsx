import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { DIFICULDADES } from "./CaseLibraryDialog";

interface Props {
  caseId: string | null;
  defaultTitulo: string;
  defaultTema: string;
  defaultResumo: string;
  onOpenChange: (open: boolean) => void;
}

// Só para administradores: congela um caso já revisado na biblioteca. Repetir com o mesmo título atualiza a entrada.
export function PublishToLibraryDialog({ caseId, defaultTitulo, defaultTema, defaultResumo, onOpenChange }: Props) {
  const [titulo, setTitulo] = useState("");
  const [tema, setTema] = useState("");
  const [resumo, setResumo] = useState("");
  const [dificuldade, setDificuldade] = useState("medio");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!caseId) return;
    setTitulo(defaultTitulo);
    setTema(defaultTema);
    setResumo(defaultResumo);
    setDificuldade("medio");
  }, [caseId, defaultTitulo, defaultTema, defaultResumo]);

  const publicar = async () => {
    if (!caseId || !titulo.trim()) return;
    setSaving(true);
    const { error } = await (supabase as any).rpc("publish_vp_seed_case", {
      _case_id: caseId, _titulo: titulo.trim(), _tema: tema.trim(), _dificuldade: dificuldade, _resumo: resumo.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Caso adicionado à biblioteca.");
    onOpenChange(false);
  };

  return (
    <Dialog open={!!caseId} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar à biblioteca de casos</DialogTitle>
          <DialogDescription>
            Congela uma cópia do caso como está agora. Edições posteriores no seu caso só chegam à biblioteca se você repetir esta ação com o mesmo título.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div>
            <Label>Tema</Label>
            <Input value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Ex.: Hipertensão, Diabetes, Asma" />
          </div>
          <div>
            <Label>Dificuldade</Label>
            <div className="flex gap-2 mt-1">
              {DIFICULDADES.map((d) => (
                <Button key={d.value} type="button" size="sm" variant={dificuldade === d.value ? "default" : "outline"} onClick={() => setDificuldade(d.value)}>
                  {d.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>Resumo para o docente</Label>
            <Textarea rows={3} value={resumo} onChange={(e) => setResumo(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={publicar} disabled={saving || !titulo.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
