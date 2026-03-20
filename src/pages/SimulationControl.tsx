import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Square, Users, Clock, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function SimulationControl() {
  const { roomId } = useParams<{ roomId: string }>();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: room } = useQuery({
    queryKey: ["simulation-room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("simulation_rooms").select("*").eq("id", roomId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  const { data: rounds = [] } = useQuery({
    queryKey: ["simulation-rounds", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulation_rounds")
        .select("*")
        .eq("room_id", roomId!)
        .order("round_number", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
    refetchInterval: 5000,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["simulation-assignments", roomId],
    queryFn: async () => {
      const roundIds = rounds.map((r: any) => r.id);
      if (!roundIds.length) return [];
      const { data, error } = await supabase
        .from("simulation_round_assignments")
        .select("*, simulation_participants(*)")
        .in("round_id", roundIds);
      if (error) throw error;
      return data;
    },
    enabled: rounds.length > 0,
    refetchInterval: 5000,
  });

  const { data: responses = [] } = useQuery({
    queryKey: ["simulation-responses", roomId],
    queryFn: async () => {
      const roundIds = rounds.map((r: any) => r.id);
      if (!roundIds.length) return [];
      const { data, error } = await supabase
        .from("simulation_responses")
        .select("*")
        .in("round_id", roundIds);
      if (error) throw error;
      return data;
    },
    enabled: rounds.length > 0,
    refetchInterval: 5000,
  });

  const activeRound = rounds.find((r: any) => r.status === "active");
  const nextPending = rounds.find((r: any) => r.status === "pending");

  // Timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!activeRound?.started_at || !room?.duration_minutes) {
      setTimeLeft(null);
      return;
    }
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(activeRound.started_at).getTime()) / 1000);
      const remaining = room.duration_minutes * 60 - elapsed;
      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeRound, room]);

  const releaseRound = async (roundId: string) => {
    await supabase.from("simulation_rounds").update({
      status: "active",
      started_at: new Date().toISOString(),
    }).eq("id", roundId);
    queryClient.invalidateQueries({ queryKey: ["simulation-rounds", roomId] });
    toast({ title: t("sim_round_released") });
  };

  const endRound = async (roundId: string) => {
    await supabase.from("simulation_rounds").update({
      status: "completed",
      finished_at: new Date().toISOString(),
    }).eq("id", roundId);
    queryClient.invalidateQueries({ queryKey: ["simulation-rounds", roomId] });
    toast({ title: t("sim_round_ended") });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const roleLabels: Record<string, string> = {
    professional: t("sim_role_professional"),
    patient: t("sim_role_patient"),
    observer: t("sim_role_observer"),
  };

  const roleColors: Record<string, string> = {
    professional: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    patient: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    observer: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/simulations")}>
            <ArrowLeft className="h-4 w-4 mr-1" />{t("pricing_back")}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{room?.title} — {t("sim_control")}</h1>
            <p className="text-sm text-muted-foreground">PIN: <span className="font-mono">{room?.access_code}</span></p>
          </div>
        </div>
        {timeLeft !== null && (
          <div className={`text-3xl font-mono font-bold ${timeLeft <= 60 ? "text-destructive" : "text-foreground"}`}>
            <Clock className="h-5 w-5 inline mr-2" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Rounds */}
      <div className="grid gap-4">
        {rounds.map((round: any) => {
          const roundAssignments = assignments.filter((a: any) => a.round_id === round.id);
          const roundResponses = responses.filter((r: any) => r.round_id === round.id);
          const isActive = round.status === "active";
          const isCompleted = round.status === "completed";
          const isPending = round.status === "pending";

          return (
            <Card key={round.id} className={isActive ? "ring-2 ring-primary" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {t("sim_round")} {round.round_number} — {t("sim_cycle")} {round.cycle}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {isCompleted && <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />{t("sim_status_completed")}</Badge>}
                    {isActive && <Badge className="bg-green-600">{t("sim_status_active")}</Badge>}
                    {isPending && <Badge variant="outline">{t("sim_status_pending")}</Badge>}

                    {isPending && !activeRound && (
                      <Button size="sm" onClick={() => releaseRound(round.id)}>
                        <Play className="h-3.5 w-3.5 mr-1" />{t("sim_release")}
                      </Button>
                    )}
                    {isActive && (
                      <Button size="sm" variant="destructive" onClick={() => endRound(round.id)}>
                        <Square className="h-3.5 w-3.5 mr-1" />{t("sim_end_round")}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {roundAssignments.map((a: any) => (
                    <div key={a.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <Badge className={roleColors[a.assigned_role] || ""}>
                        {roleLabels[a.assigned_role] || a.assigned_role}
                      </Badge>
                      <span className="text-sm font-medium">
                        {a.simulation_participants?.student_name || "—"}
                      </span>
                      {roundResponses.some((r: any) => r.participant_id === a.participant_id && r.submitted_at) && (
                        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
