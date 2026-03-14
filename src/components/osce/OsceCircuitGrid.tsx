import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, User, ClipboardCheck } from "lucide-react";
import { OsceTimer } from "@/components/osce/OsceTimer";
import { Progress } from "@/components/ui/progress";

interface Props {
  stations: any[];
  evaluations: any[];
  currentRotation: number;
  circuitStudents?: any[];
  circuitId?: string;
  durationMinutes?: number;
  isRunning?: boolean;
}

export function OsceCircuitGrid({ stations, evaluations, currentRotation, circuitStudents = [], circuitId, durationMinutes = 5, isRunning = false }: Props) {
  const clinicalStations = stations.filter((s) => !s.is_rest_station);

  // Fetch checklist items count per station
  const stationIds = clinicalStations.map(s => s.id);
  const { data: checklistCounts } = useQuery({
    queryKey: ["osce-checklist-counts", stationIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("osce_checklist_items")
        .select("id, station_id")
        .in("station_id", stationIds);
      return data || [];
    },
    enabled: stationIds.length > 0,
  });

  // Fetch evaluation items for active evaluations (to track checklist progress)
  const activeEvalIds = evaluations
    .filter((e: any) => !e.finished_at)
    .map((e: any) => e.id);
  
  const { data: evalItems } = useQuery({
    queryKey: ["osce-eval-items-progress", activeEvalIds],
    queryFn: async () => {
      if (activeEvalIds.length === 0) return [];
      const { data } = await supabase
        .from("osce_evaluation_items")
        .select("id, evaluation_id, value")
        .in("evaluation_id", activeEvalIds);
      return data || [];
    },
    enabled: activeEvalIds.length > 0,
    refetchInterval: 5000, // Poll every 5s for live updates
  });

  // Group evaluations by station
  const evalsByStation = evaluations.reduce((acc: Record<string, any[]>, ev: any) => {
    if (!acc[ev.station_id]) acc[ev.station_id] = [];
    acc[ev.station_id].push(ev);
    return acc;
  }, {});

  // Group checklist items by station
  const checklistByStation = (checklistCounts || []).reduce((acc: Record<string, number>, item: any) => {
    acc[item.station_id] = (acc[item.station_id] || 0) + 1;
    return acc;
  }, {});

  // Group eval items by evaluation_id
  const evalItemsByEvalId = (evalItems || []).reduce((acc: Record<string, any[]>, item: any) => {
    if (!acc[item.evaluation_id]) acc[item.evaluation_id] = [];
    acc[item.evaluation_id].push(item);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4" /> Mapa de Estações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {clinicalStations.map((station) => {
            const stationEvals = evalsByStation[station.id] || [];
            const completedCount = stationEvals.filter((e: any) => e.finished_at).length;
            const assignedStudent = circuitStudents.find(s => s.current_station_id === station.id && s.status === "in_station");
            
            // Find active (non-finished) evaluation for this station
            const activeEval = stationEvals.find((e: any) => !e.finished_at);
            
            // Checklist progress
            const totalChecklist = checklistByStation[station.id] || 0;
            let filledChecklist = 0;
            if (activeEval && evalItemsByEvalId[activeEval.id]) {
              filledChecklist = evalItemsByEvalId[activeEval.id].filter((item: any) => item.value > 0).length;
            }
            const checklistPct = totalChecklist > 0 ? (filledChecklist / totalChecklist) * 100 : 0;

            return (
              <div
                key={station.id}
                className={`rounded-xl border-2 p-4 transition-colors ${
                  assignedStudent
                    ? "border-primary bg-primary/5"
                    : completedCount > 0
                    ? "border-green-300 bg-green-50 dark:bg-green-950/20"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-xs">Estação {station.position}</Badge>
                  {!assignedStudent && completedCount > 0 && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {assignedStudent && <Clock className="h-4 w-4 text-primary animate-pulse" />}
                </div>
                <h4 className="font-medium text-sm mb-2 truncate">{station.title}</h4>

                {/* Per-station timer */}
                {assignedStudent ? (
                  <div className="space-y-3">
                    <p className="text-xs text-primary font-medium truncate">
                      👤 {assignedStudent.student_name}
                    </p>
                    <div className="scale-[0.75] origin-top-left">
                      <OsceTimer
                        durationMinutes={station.duration_minutes || durationMinutes}
                        isRunning={isRunning}
                        startedAt={assignedStudent.station_entered_at}
                      />
                    </div>

                    {/* Checklist progress */}
                    {totalChecklist > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ClipboardCheck className="h-3 w-3" /> Checklist
                          </span>
                          <span>{filledChecklist}/{totalChecklist}</span>
                        </div>
                        <Progress value={checklistPct} className="h-2" />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {completedCount > 0 ? `${completedCount} avaliação(ões) concluída(s)` : "Sem aluno"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
