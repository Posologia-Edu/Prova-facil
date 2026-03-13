import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, User } from "lucide-react";

interface Props {
  stations: any[];
  evaluations: any[];
  currentRotation: number;
}

export function OsceCircuitGrid({ stations, evaluations, currentRotation }: Props) {
  const clinicalStations = stations.filter((s) => !s.is_rest_station);

  // Group evaluations by station
  const evalsByStation = evaluations.reduce((acc: Record<string, any[]>, ev: any) => {
    if (!acc[ev.station_id]) acc[ev.station_id] = [];
    acc[ev.station_id].push(ev);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4" /> Mapa de Estações — Rotação {currentRotation}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {clinicalStations.map((station) => {
            const stationEvals = evalsByStation[station.id] || [];
            const currentEval = stationEvals.find((e: any) => e.rotation === currentRotation);
            const completedCount = stationEvals.filter((e: any) => e.finished_at).length;

            return (
              <div
                key={station.id}
                className={`rounded-xl border-2 p-4 transition-colors ${
                  currentEval && !currentEval.finished_at
                    ? "border-primary bg-primary/5"
                    : currentEval?.finished_at
                    ? "border-green-300 bg-green-50"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-xs">{station.position}</Badge>
                  {currentEval?.finished_at && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {currentEval && !currentEval.finished_at && <Clock className="h-4 w-4 text-primary animate-pulse" />}
                </div>
                <h4 className="font-medium text-sm mb-1 truncate">{station.title}</h4>
                {currentEval ? (
                  <p className="text-xs text-muted-foreground truncate">
                    {currentEval.student_name}
                    {currentEval.finished_at && ` — ${currentEval.total_score}/${currentEval.max_score}`}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem aluno</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{completedCount} avaliações concluídas</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
