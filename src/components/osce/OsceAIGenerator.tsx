import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  onGenerated: () => void;
}

const AREAS = [
  "Farmácia Clínica",
  "Medicina",
  "Enfermagem",
  "Odontologia",
  "Fisioterapia",
  "Nutrição",
  "Psicologia",
  "Outro",
];

export function OsceAIGenerator({ open, onOpenChange, examId, onGenerated }: Props) {
  const [context, setContext] = useState("");
  const [area, setArea] = useState("Farmácia Clínica");
  const [objectives, setObjectives] = useState("");
  const [level, setLevel] = useState("graduação");

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-osce-station", {
        body: { examId, context, area, objectives, level },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Estação gerada com IA!");
      onGenerated();
      onOpenChange(false);
      setContext("");
      setObjectives("");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao gerar estação"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Estação com IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Área Clínica</Label>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Nível</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="graduação">Graduação</SelectItem>
                <SelectItem value="pós-graduação">Pós-graduação</SelectItem>
                <SelectItem value="residência">Residência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Contexto / Tema</Label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ex: Paciente idoso com polifarmácia, uso de anticoagulantes e risco de interações medicamentosas..."
              rows={3}
            />
          </div>

          <div>
            <Label>Objetivos de Aprendizagem</Label>
            <Textarea
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              placeholder="Ex: Realizar conciliação medicamentosa, identificar interações, orientar posologia..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => generate.mutate()} disabled={generate.isPending || !context.trim()} className="gap-2">
            {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generate.isPending ? "Gerando..." : "Gerar Estação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
