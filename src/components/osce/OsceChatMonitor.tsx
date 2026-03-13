import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, MessageSquare } from "lucide-react";

interface Props {
  circuitId: string;
  stations: any[];
  circuitStudents: any[];
}

export function OsceChatMonitor({ circuitId, stations, circuitStudents }: Props) {
  const activeStudents = circuitStudents.filter(s => s.status === 'in_station');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="h-4 w-4" /> Monitoramento de Alunos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-full text-center py-4">
              Nenhum aluno ativo nas estações
            </p>
          ) : (
            activeStudents.map(student => {
              const station = stations.find(s => s.id === student.current_station_id);
              return (
                <div key={student.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{student.student_name}</span>
                    <Badge variant="default" className="text-xs gap-1">
                      <MessageSquare className="h-3 w-3" /> Ativo
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Estação: {station?.title || "—"} | Rotação: {student.current_rotation}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
