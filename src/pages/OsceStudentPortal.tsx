import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Stethoscope, LogIn, Loader2, Clock, Send, Mic, MicOff, Phone } from "lucide-react";
import { toast } from "sonner";
import { OsceTimer } from "@/components/osce/OsceTimer";
import { OsceMaterialViewer } from "@/components/osce/OsceMaterialViewer";
import { useOsceAudio } from "@/hooks/use-osce-audio";

export default function OsceStudentPortal() {
  const { accessCode } = useParams<{ accessCode: string }>();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [studentRecord, setStudentRecord] = useState<any>(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch circuit
  const { data: circuit, isLoading: circuitLoading } = useQuery({
    queryKey: ["osce-student-circuit", accessCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_circuits")
        .select("*, osce_exams(*)")
        .eq("access_code", accessCode!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!accessCode && authenticated,
  });

  // Fetch student record
  const { data: myStudent, isLoading: studentLoading, refetch: refetchStudent } = useQuery({
    queryKey: ["osce-my-student", circuit?.id, email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_circuit_students")
        .select("*")
        .eq("circuit_id", circuit!.id)
        .eq("student_email", email.toLowerCase())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!circuit?.id && !!email && authenticated,
    refetchInterval: 3000,
  });

  // Fetch current station details
  const { data: currentStation } = useQuery({
    queryKey: ["osce-student-station", myStudent?.current_station_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_stations")
        .select("*")
        .eq("id", myStudent!.current_station_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!myStudent?.current_station_id,
  });

  // Fetch materials for current station
  const { data: materials } = useQuery({
    queryKey: ["osce-student-materials", myStudent?.current_station_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_station_materials")
        .select("*")
        .eq("station_id", myStudent!.current_station_id)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!myStudent?.current_station_id,
  });

  // Audio hook
  const isInStation = myStudent?.status === "in_station" && !timeUp;
  const { isMuted, isConnected, toggleMute, audioDevices, selectedDeviceId, switchMicrophone } = useOsceAudio({
    circuitId: circuit?.id,
    stationId: myStudent?.current_station_id ?? undefined,
    role: "student",
    enabled: isInStation && !!circuit?.id && !!myStudent?.current_station_id,
  });

  // Realtime subscription for circuit and student updates
  useEffect(() => {
    if (!circuit?.id) return;
    const channel = supabase
      .channel(`student-circuit-${circuit.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "osce_circuits", filter: `id=eq.${circuit.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["osce-student-circuit", accessCode] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "osce_circuit_students", filter: `circuit_id=eq.${circuit.id}` }, () => {
        refetchStudent();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [circuit?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset messages and timeUp when station changes
  useEffect(() => {
    setMessages([]);
    setTimeUp(false);
  }, [myStudent?.current_station_id]);

  const handleLogin = () => {
    if (!email.trim()) { toast.error("Informe seu email"); return; }
    setAuthenticated(true);
  };

  const handleTimeUp = () => {
    setTimeUp(true);
    toast.info("Tempo esgotado! Aguarde a próxima estação.");
  };

  const persistMessage = async (role: string, content: string) => {
    if (!circuit?.id || !myStudent?.current_station_id || !myStudent?.id) return;
    try {
      await supabase.from("osce_chat_messages" as any).insert([{
        circuit_id: circuit.id,
        station_id: myStudent.current_station_id,
        student_id: myStudent.id,
        role,
        content,
      }]);
    } catch (e) {
      console.error("Failed to persist chat message", e);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentStation || timeUp) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setSending(true);

    await persistMessage("user", userMsg.content);

    try {
      const res = await supabase.functions.invoke("osce-virtual-patient", {
        body: {
          stationId: currentStation.id,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        },
      });
      if (res.error) throw res.error;
      const data = res.data;
      const text = data?.response || (typeof data === "string" ? data : null) || "Desculpe, não consegui responder.";
      setMessages(prev => [...prev, { role: "assistant", content: text }]);
      await persistMessage("assistant", text);
    } catch (e: any) {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Stethoscope className="h-10 w-10 mx-auto text-primary mb-2" />
            <CardTitle>Portal do Aluno — OSCE Online</CardTitle>
            <p className="text-sm text-muted-foreground">Código: {accessCode}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Seu email cadastrado"
                type="email"
                className="h-12 text-lg"
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button className="w-full h-12 text-lg gap-2" onClick={handleLogin}>
              <LogIn className="h-5 w-5" /> Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading
  if (circuitLoading || studentLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Conectando ao exame...</p>
        </div>
      </div>
    );
  }

  if (!circuit) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <Stethoscope className="h-10 w-10 mx-auto text-destructive mb-4" />
          <h2 className="text-lg font-bold mb-2">Circuito Não Encontrado</h2>
          <p className="text-muted-foreground text-sm">
            O código <strong>{accessCode}</strong> não corresponde a nenhum circuito OSCE ativo.
          </p>
        </Card>
      </div>
    );
  }

  if (!myStudent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <Stethoscope className="h-10 w-10 mx-auto text-destructive mb-4" />
          <h2 className="text-lg font-bold mb-2">Email Não Encontrado</h2>
          <p className="text-muted-foreground text-sm">
            O email <strong>{email}</strong> não está cadastrado neste circuito OSCE. Verifique com seu professor.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => setAuthenticated(false)}>Tentar outro email</Button>
        </Card>
      </div>
    );
  }

  const examData = circuit as any;

  // Waiting screen
  if (myStudent.status === "waiting") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <Clock className="h-12 w-12 mx-auto text-primary mb-4 animate-pulse" />
          <h2 className="text-xl font-bold mb-2">Aguarde</h2>
          <p className="text-muted-foreground mb-4">
            Você está na fila de espera. O sistema irá encaminhá-lo automaticamente para sua estação.
          </p>
          <p className="text-sm font-medium">{myStudent.student_name}</p>
          <Badge variant="secondary" className="mt-2">Rotação: {myStudent.current_rotation || "—"}</Badge>
        </Card>
      </div>
    );
  }

  // Completed
  if (myStudent.status === "completed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <h2 className="text-xl font-bold mb-2">Exame Concluído</h2>
          <p className="text-muted-foreground">Você completou todas as estações. Obrigado!</p>
        </Card>
      </div>
    );
  }

  // Time's up screen — student is expelled from the room
  if (timeUp) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <Clock className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold mb-2">Tempo Esgotado</h2>
          <p className="text-muted-foreground mb-4">
            O tempo desta estação terminou. Aguarde enquanto o avaliador finaliza sua avaliação. 
            Você será redirecionado automaticamente para a próxima estação.
          </p>
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </Card>
      </div>
    );
  }

  // Active station view
  const durationMin = currentStation?.duration_minutes || examData?.osce_exams?.station_duration_minutes || 5;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Timer header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b p-3">
        <div className="max-w-2xl mx-auto">
          <OsceTimer
            durationMinutes={durationMin}
            isRunning={circuit?.status === "running"}
            startedAt={circuit?.started_at}
            onTimeUp={handleTimeUp}
          />
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="font-medium">{currentStation?.title}</span>
            <div className="flex items-center gap-2">
              {/* Audio controls */}
              {audioDevices.length > 1 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => switchMicrophone(e.target.value)}
                  className="h-7 text-xs rounded border border-border bg-background px-1 max-w-[140px]"
                >
                  {audioDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                  ))}
                </select>
              )}
              <Button
                size="sm"
                variant={isMuted ? "destructive" : "outline"}
                onClick={toggleMute}
                className="gap-1 h-7 px-2"
              >
                {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                {isConnected && <Phone className="h-3 w-3 text-green-500" />}
              </Button>
              <Badge variant="secondary">Rotação {myStudent.current_rotation}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions banner */}
      {currentStation?.student_instructions && (
        <div className="max-w-2xl mx-auto w-full px-4 pt-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-1">Instruções</h3>
              <p className="text-sm whitespace-pre-wrap">{currentStation.student_instructions}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 max-w-2xl mx-auto w-full p-4 flex flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto mb-4">
          {messages.length === 0 && currentStation?.virtual_patient_enabled && (
            <p className="text-center text-muted-foreground text-sm py-8">
              Inicie a conversa com o paciente virtual
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {currentStation?.virtual_patient_enabled && (
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Digite sua mensagem ao paciente..."
              rows={2}
              className="flex-1 resize-none"
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            />
            <Button onClick={sendMessage} disabled={!input.trim() || sending} size="icon" className="h-auto">
              <Send className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Material floating icons */}
      {materials && <OsceMaterialViewer materials={materials} />}
    </div>
  );
}
