import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Trash2, Coffee, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { OsceChecklistBuilder } from "./OsceChecklistBuilder";
import { OsceStationMaterials } from "./OsceStationMaterials";

interface Props {
  station: any;
  examId: string;
  defaultDuration: number;
}

export function OsceStationEditor({ station, examId, defaultDuration }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const update = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from("osce_stations").update(updates).eq("id", station.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["osce-stations", examId] }),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("osce_stations").delete().eq("id", station.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["osce-stations", examId] });
      toast.success("Estação removida");
    },
  });

  if (station.is_rest_station) {
    return (
      <Card className="border-dashed opacity-70">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <Coffee className="h-4 w-4" />
            <span className="text-sm font-medium">{station.title}</span>
            <Badge variant="outline" className="text-xs">Descanso</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={() => remove.mutate()} className="h-7 w-7 text-destructive">
            <Trash2 className="h-3 w-3" />
          </Button>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <CardTitle className="text-base">{station.title}</CardTitle>
                <Badge variant="secondary" className="text-xs">{station.duration_minutes || defaultDuration} min</Badge>
                {station.virtual_patient_enabled && <Badge variant="default" className="text-xs">Paciente Virtual</Badge>}
              </div>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); remove.mutate(); }} className="h-7 w-7 text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Título</Label><Input value={station.title} onChange={(e) => update.mutate({ title: e.target.value })} /></div>
              <div><Label>Duração (min)</Label><Input type="number" value={station.duration_minutes || ""} onChange={(e) => update.mutate({ duration_minutes: e.target.value ? Number(e.target.value) : null })} placeholder={`${defaultDuration} (padrão)`} /></div>
            </div>

            <div>
              <Label>Instruções do Estudante (Porta)</Label>
              <Textarea
                value={station.student_instructions}
                onChange={(e) => update.mutate({ student_instructions: e.target.value })}
                placeholder="Cenário clínico, tarefa e tempo disponível..."
                rows={4}
              />
            </div>

            <div>
              <Label>Resumo do Caso Clínico</Label>
              <Textarea
                value={station.case_summary}
                onChange={(e) => update.mutate({ case_summary: e.target.value })}
                placeholder="Caso clínico detalhado para referência do avaliador..."
                rows={3}
              />
            </div>

            <div>
              <Label>Roteiro do Paciente Simulado (Ator)</Label>
              <Textarea
                value={station.patient_script}
                onChange={(e) => update.mutate({ patient_script: e.target.value })}
                placeholder="Script do ator: o que sentir, informações condicionais, humor..."
                rows={5}
              />
            </div>

            <div>
              <Label>Objetivos de Aprendizagem</Label>
              <Textarea
                value={(station.learning_objectives || []).join("\n")}
                onChange={(e) => update.mutate({ learning_objectives: e.target.value.split("\n").filter(Boolean) })}
                placeholder="Um objetivo por linha..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Switch
                checked={station.virtual_patient_enabled}
                onCheckedChange={(v) => update.mutate({ virtual_patient_enabled: v })}
              />
              <div>
                <Label className="cursor-pointer">Paciente Virtual (Chatbot IA)</Label>
                <p className="text-xs text-muted-foreground">Ativa um chatbot que simula o paciente usando o roteiro acima</p>
              </div>
            </div>

            {station.virtual_patient_enabled && (
              <div>
                <Label>Prompt do Paciente Virtual</Label>
                <Textarea
                  value={station.virtual_patient_system_prompt}
                  onChange={(e) => update.mutate({ virtual_patient_system_prompt: e.target.value })}
                  placeholder="Prompt de sistema para o chatbot do paciente virtual..."
                  rows={4}
                />
              </div>
            )}

            <div>
              <h4 className="font-semibold mb-3">Checklist do Avaliador</h4>
              <OsceChecklistBuilder stationId={station.id} />
            </div>

            <div>
              <OsceStationMaterials stationId={station.id} />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
