import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  stations: any[];
}

export function OsceCircuitSetupDialog({ open, onOpenChange, examId, stations }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [isOnline, setIsOnline] = useState(false);
  const [evaluators, setEvaluators] = useState<Record<string, { name: string; email: string }>>({});

  const clinicalStations = stations.filter(s => !s.is_rest_station);

  // Fetch user's classes
  const { data: classes } = useQuery({
    queryKey: ["classes-for-osce"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch students of selected class
  const { data: classStudents } = useQuery({
    queryKey: ["class-students-osce", selectedClassId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_students")
        .select("*")
        .eq("class_id", selectedClassId!)
        .order("student_name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClassId,
  });

  const createCircuit = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");
      if (!selectedClassId) throw new Error("Selecione uma turma");

      // Update exam with class_id and is_online
      await supabase.from("osce_exams").update({
        class_id: selectedClassId,
        is_online: isOnline,
      }).eq("id", examId);

      // Create circuit
      const { data: circuit, error: circuitError } = await supabase
        .from("osce_circuits")
        .insert([{
          osce_exam_id: examId,
          user_id: session.user.id,
          class_id: selectedClassId,
        }])
        .select()
        .single();
      if (circuitError) throw circuitError;

      // Import students from class
      if (classStudents && classStudents.length > 0) {
        const studentRows = classStudents.map(s => ({
          circuit_id: circuit.id,
          student_name: s.student_name,
          student_email: s.student_email || '',
          student_registration: s.student_registration,
          status: 'waiting' as const,
        }));
        const { error: studentsError } = await supabase
          .from("osce_circuit_students")
          .insert(studentRows);
        if (studentsError) throw studentsError;
      }

      // Save evaluators per station
      const evalRows = Object.entries(evaluators)
        .filter(([_, v]) => v.name.trim() && v.email.trim())
        .map(([stationId, v]) => ({
          station_id: stationId,
          evaluator_name: v.name.trim(),
          evaluator_email: v.email.trim().toLowerCase(),
        }));
      if (evalRows.length > 0) {
        const { error: evalError } = await supabase
          .from("osce_station_evaluators")
          .insert(evalRows);
        if (evalError) throw evalError;
      }

      return circuit;
    },
    onSuccess: (circuit) => {
      toast.success("Circuito criado com sucesso!");
      onOpenChange(false);
      navigate(`/osce/${circuit.id}/control`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateEvaluator = (stationId: string, field: "name" | "email", value: string) => {
    setEvaluators(prev => ({
      ...prev,
      [stationId]: { ...prev[stationId], [field]: value },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Circuito OSCE</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Class Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Turma</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma turma" />
              </SelectTrigger>
              <SelectContent>
                {classes?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} {c.semester && `(${c.semester})`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {classStudents && (
              <p className="text-sm text-muted-foreground">
                {classStudents.length} aluno(s) serão importados para o circuito
              </p>
            )}
          </div>

          {/* Mode */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Switch checked={isOnline} onCheckedChange={setIsOnline} />
            <div>
              <Label>OSCE Online</Label>
              <p className="text-xs text-muted-foreground">
                {isOnline
                  ? "Alunos interagem com paciente virtual via chat. Gera link do aluno."
                  : "Modo presencial. Apenas link do avaliador será gerado."}
              </p>
            </div>
          </div>

          {/* Evaluators per station */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2"><UserCheck className="h-4 w-4" /> Avaliadores por Estação</Label>
            {clinicalStations.map(station => (
              <Card key={station.id} className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">{station.position}</Badge>
                  <span className="text-sm font-medium">{station.title}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Nome do avaliador"
                    value={evaluators[station.id]?.name || ""}
                    onChange={e => updateEvaluator(station.id, "name", e.target.value)}
                    className="h-9 text-sm"
                  />
                  <Input
                    placeholder="Email do avaliador"
                    type="email"
                    value={evaluators[station.id]?.email || ""}
                    onChange={e => updateEvaluator(station.id, "email", e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => createCircuit.mutate()}
            disabled={!selectedClassId || createCircuit.isPending}
            className="gap-2"
          >
            {createCircuit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar Circuito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
