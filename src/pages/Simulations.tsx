import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, Clock, Play, Settings, Trash2, Scissors, HeartPulse, ClipboardList, ArrowRight, Stethoscope } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import SplitRoomDialog from "@/components/SplitRoomDialog";

const modules = [
  {
    id: "anamnesis",
    title: "Anamnese",
    description: "Simulação de coleta de história clínica com papéis de profissional, paciente, observador e professor.",
    icon: Stethoscope,
    tab: "anamnesis",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    id: "soap",
    title: "SOAP",
    description: "Transcrição estruturada da anamnese no formato SOAP com avaliação entre pares.",
    icon: ClipboardList,
    route: "/simulations/soap",
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
  },
];

export default function Simulations() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(10);
  const [splitRoomId, setSplitRoomId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("modules");

  const { data: rooms, isLoading } = useQuery({
    queryKey: ["simulation-rooms"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data, error } = await supabase
        .from("simulation_rooms")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: participantCounts } = useQuery({
    queryKey: ["simulation-participant-counts"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return {};
      const { data, error } = await supabase
        .from("simulation_participants")
        .select("room_id, participant_role");
      if (error) return {};
      const counts: Record<string, number> = {};
      (data || []).forEach((p) => {
        if (p.participant_role === "student") {
          counts[p.room_id] = (counts[p.room_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const createRoom = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("simulation_rooms")
        .insert({ user_id: session.user.id, title, description, duration_minutes: duration })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["simulation-rooms"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setDuration(10);
      navigate(`/simulations/${data.id}/edit`);
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao criar simulação.", variant: "destructive" });
    },
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("simulation_rooms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["simulation-rooms"] }),
  });

  const statusColor: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  };

  const statusLabel: Record<string, string> = {
    draft: t("sim_status_draft"),
    active: t("sim_status_active"),
    completed: t("sim_status_completed"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("sim_title")}</h1>
          <p className="text-muted-foreground">{t("sim_subtitle")}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="modules">
            <HeartPulse className="h-4 w-4 mr-1" />Módulos
          </TabsTrigger>
          <TabsTrigger value="anamnesis">
            <Stethoscope className="h-4 w-4 mr-1" />Salas de Anamnese
          </TabsTrigger>
        </TabsList>

        {/* Modules overview */}
        <TabsContent value="modules" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((mod) => (
              <Card
                key={mod.id}
                className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-primary/20"
                onClick={() => {
                  if (mod.route) {
                    navigate(mod.route);
                  } else if (mod.tab) {
                    setActiveTab(mod.tab);
                  }
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-xl ${mod.bgColor} flex items-center justify-center shrink-0`}>
                      <mod.icon className={`h-6 w-6 ${mod.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg flex items-center justify-between">
                        {mod.title}
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </CardTitle>
                      <CardDescription className="mt-1">{mod.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Badge variant="outline" className="text-xs">
                    {mod.id === "anamnesis" ? `${rooms?.length || 0} salas` : "Acessar módulo"}
                  </Badge>
                </CardContent>
              </Card>
            ))}

            {/* Placeholder for future modules */}
            <Card className="border-dashed border-2 opacity-50">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <Plus className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Novos módulos em breve</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Anamnesis rooms */}
        <TabsContent value="anamnesis" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />{t("sim_new")}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("sim_create_title")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{t("sim_name")}</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("sim_name_placeholder")} />
                  </div>
                  <div>
                    <Label>{t("sim_description")}</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t("sim_duration")} ({t("sim_minutes")})</Label>
                    <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={1} />
                  </div>
                  <Button onClick={() => createRoom.mutate()} disabled={!title || createRoom.isPending} className="w-full">
                    {t("create")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground">{t("loading")}</p>
          ) : !rooms?.length ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">{t("sim_empty")}</h3>
                <p className="text-muted-foreground mb-4">{t("sim_empty_hint")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => {
                const studentCount = participantCounts?.[room.id] || 0;
                return (
                  <Card key={room.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{room.title}</CardTitle>
                          {room.description && <CardDescription>{room.description}</CardDescription>}
                        </div>
                        <Badge className={statusColor[room.status] || ""}>
                          {statusLabel[room.status] || room.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{room.duration_minutes} min</span>
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{studentCount} alunos</span>
                        <span className="font-mono text-xs">PIN: {room.access_code}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/simulations/${room.id}/edit`)}>
                          <Settings className="h-3.5 w-3.5 mr-1" />{t("sim_edit")}
                        </Button>
                        {room.status === "active" && (
                          <Button size="sm" onClick={() => navigate(`/simulations/${room.id}/control`)}>
                            <Play className="h-3.5 w-3.5 mr-1" />{t("sim_control")}
                          </Button>
                        )}
                        {room.status === "draft" && studentCount > 0 && (
                          <Button variant="outline" size="sm" onClick={() => setSplitRoomId(room.id)}>
                            <Scissors className="h-3.5 w-3.5 mr-1" />Dividir
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => deleteRoom.mutate(room.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {splitRoomId && (
        <SplitRoomDialog
          roomId={splitRoomId}
          open={!!splitRoomId}
          onOpenChange={(open) => { if (!open) setSplitRoomId(null); }}
          onComplete={() => {
            setSplitRoomId(null);
            queryClient.invalidateQueries({ queryKey: ["simulation-rooms"] });
            queryClient.invalidateQueries({ queryKey: ["simulation-participant-counts"] });
          }}
        />
      )}
    </div>
  );
}
