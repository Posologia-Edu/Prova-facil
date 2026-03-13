import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Sparkles, Settings, Coffee } from "lucide-react";
import { toast } from "sonner";
import { OsceStationEditor } from "@/components/osce/OsceStationEditor";
import { OsceAIGenerator } from "@/components/osce/OsceAIGenerator";

export default function OsceEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAI, setShowAI] = useState(false);
  const [activeTab, setActiveTab] = useState("stations");

  const { data: exam, isLoading: examLoading } = useQuery({
    queryKey: ["osce-exam", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("osce_exams").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: stations, isLoading: stationsLoading } = useQuery({
    queryKey: ["osce-stations", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_stations")
        .select("*")
        .eq("osce_exam_id", id!)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const updateExam = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from("osce_exams").update(updates).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["osce-exam", id] }),
  });

  const addStation = useMutation({
    mutationFn: async (isRest: boolean) => {
      const nextPos = (stations?.length || 0) + 1;
      const { error } = await supabase.from("osce_stations").insert([{
        osce_exam_id: id!,
        position: nextPos,
        title: isRest ? `Descanso ${nextPos}` : `Estação ${nextPos}`,
        is_rest_station: isRest,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["osce-stations", id] });
      toast.success("Estação adicionada");
    },
  });

  if (examLoading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!exam) return <div className="p-8 text-destructive">Exame não encontrado</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/osce")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <Input
            className="text-xl font-bold border-none bg-transparent p-0 h-auto focus-visible:ring-0"
            value={exam.title}
            onChange={(e) => updateExam.mutate({ title: e.target.value })}
          />
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setShowAI(true)}>
          <Sparkles className="h-4 w-4" /> Gerar com IA
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="stations">Estações ({stations?.length || 0})</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1"><Settings className="h-3 w-3" /> Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="stations" className="space-y-4 mt-4">
          {stationsLoading ? (
            <Card className="animate-pulse p-8"><div className="h-6 bg-muted rounded w-1/3" /></Card>
          ) : stations && stations.length > 0 ? (
            stations.map((station: any) => (
              <OsceStationEditor
                key={station.id}
                station={station}
                examId={id!}
                defaultDuration={exam.station_duration_minutes}
              />
            ))
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">Nenhuma estação criada ainda</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => addStation.mutate(false)} className="gap-2">
                  <Plus className="h-4 w-4" /> Estação Clínica
                </Button>
                <Button variant="outline" onClick={() => addStation.mutate(true)} className="gap-2">
                  <Coffee className="h-4 w-4" /> Estação de Descanso
                </Button>
              </div>
            </Card>
          )}

          {stations && stations.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => addStation.mutate(false)} className="gap-2">
                <Plus className="h-4 w-4" /> Estação Clínica
              </Button>
              <Button variant="ghost" onClick={() => addStation.mutate(true)} className="gap-2">
                <Coffee className="h-4 w-4" /> Descanso
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Configurações do Exame</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Descrição</Label><Textarea value={exam.description || ""} onChange={(e) => updateExam.mutate({ description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Duração padrão por estação (min)</Label><Input type="number" value={exam.station_duration_minutes} onChange={(e) => updateExam.mutate({ station_duration_minutes: Number(e.target.value) })} min={1} /></div>
                <div><Label>Tempo de transição (segundos)</Label><Input type="number" value={exam.transition_seconds} onChange={(e) => updateExam.mutate({ transition_seconds: Number(e.target.value) })} min={0} /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <OsceAIGenerator
        open={showAI}
        onOpenChange={setShowAI}
        examId={id!}
        onGenerated={() => queryClient.invalidateQueries({ queryKey: ["osce-stations", id] })}
      />
    </div>
  );
}
