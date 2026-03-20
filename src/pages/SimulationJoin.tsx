import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Clock, FileText, Users, Stethoscope, Eye, GraduationCap, Send, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type FormField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "radio" | "checkbox" | "scale";
  options?: string[];
  max_score?: number;
};

export default function SimulationJoin() {
  const { t } = useLanguage();
  const [pin, setPin] = useState(() => sessionStorage.getItem("sim_pin") || "");
  const [email, setEmail] = useState(() => sessionStorage.getItem("sim_email") || "");
  const [joined, setJoined] = useState(false);
  const [room, setRoom] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [activeRound, setActiveRound] = useState<any>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [forms, setForms] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Auto-join if redirected from StudentAuth
  useEffect(() => {
    const savedPin = sessionStorage.getItem("sim_pin");
    const savedEmail = sessionStorage.getItem("sim_email");
    if (savedPin && savedEmail) {
      sessionStorage.removeItem("sim_pin");
      sessionStorage.removeItem("sim_email");
      // Auto-join after mount
      setTimeout(() => {
        joinRoomWithCredentials(savedPin, savedEmail);
      }, 100);
    }
  }, []);

  const joinRoomWithCredentials = async (pinVal: string, emailVal: string) => {
    const { data: roomData, error: roomErr } = await supabase
      .from("simulation_rooms")
      .select("*")
      .eq("access_code", pinVal.trim().toLowerCase())
      .single();
    if (roomErr || !roomData) {
      toast({ title: t("student_error"), description: t("sim_room_not_found"), variant: "destructive" });
      return;
    }

    const { data: partData, error: partErr } = await supabase
      .from("simulation_participants")
      .select("*")
      .eq("room_id", roomData.id)
      .eq("student_email", emailVal.trim().toLowerCase())
      .single();
    if (partErr || !partData) {
      toast({ title: t("student_access_denied"), description: t("sim_not_registered"), variant: "destructive" });
      return;
    }

    const { data: formsData } = await supabase
      .from("simulation_forms")
      .select("*")
      .eq("room_id", roomData.id);

    setRoom(roomData);
    setParticipant(partData);
    setForms(formsData || []);
    setJoined(true);
  };

  const joinRoom = async () => {
    await joinRoomWithCredentials(pin, email);
  };

  // Poll for active round
  useEffect(() => {
    if (!joined || !room) return;
    const poll = async () => {
      const { data: rounds } = await supabase
        .from("simulation_rounds")
        .select("*")
        .eq("room_id", room.id)
        .eq("status", "active")
        .limit(1);

      const round = rounds?.[0] || null;
      setActiveRound(round);

      if (round && participant) {
        const { data: assigns } = await supabase
          .from("simulation_round_assignments")
          .select("*")
          .eq("round_id", round.id)
          .eq("participant_id", participant.id)
          .limit(1);
        setAssignment(assigns?.[0] || null);

        // Check if already submitted
        const { data: resp } = await supabase
          .from("simulation_responses")
          .select("*")
          .eq("round_id", round.id)
          .eq("participant_id", participant.id)
          .not("submitted_at", "is", null)
          .limit(1);
        setSubmitted(!!resp?.length);
      } else {
        setAssignment(null);
        setSubmitted(false);
      }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [joined, room, participant]);

  // Timer
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

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const getFormForRole = (): any | null => {
    if (!assignment) return null;
    const roleFormMap: Record<string, string> = {
      professional: "anamnesis",
      patient: "patient_script",
      observer: "observer_eval",
      professor: "professor_eval",
    };
    const formType = roleFormMap[assignment.assigned_role];
    return forms.find((f: any) => f.form_type === formType) || null;
  };

  const submitForm = async () => {
    if (!activeRound || !participant || !assignment) return;
    const form = getFormForRole();
    if (!form) return;

    // Calculate score for evaluation forms
    let score = 0;
    if (form.form_type === "observer_eval" || form.form_type === "professor_eval") {
      const fields = form.content_json as FormField[];
      fields.forEach((field) => {
        if (field.max_score && answers[field.id]) {
          score += Number(answers[field.id]) || 0;
        }
      });
    }

    const { error } = await supabase.from("simulation_responses").insert({
      round_id: activeRound.id,
      participant_id: participant.id,
      form_id: form.id,
      answers_json: answers,
      score,
      submitted_at: new Date().toISOString(),
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
      toast({ title: t("sim_submitted") });
    }
  };

  const roleIcons: Record<string, any> = {
    professional: Stethoscope,
    patient: Users,
    observer: Eye,
    professor: GraduationCap,
  };

  const roleLabels: Record<string, string> = {
    professional: t("sim_role_professional"),
    patient: t("sim_role_patient"),
    observer: t("sim_role_observer"),
    professor: t("sim_professor"),
  };

  // Login screen
  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Stethoscope className="h-10 w-10 mx-auto text-primary mb-2" />
            <CardTitle>{t("sim_join_title")}</CardTitle>
            <CardDescription>{t("sim_join_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("student_email_label")}</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>PIN</Label>
              <Input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="abc123" className="font-mono text-center text-lg" />
            </div>
            <Button onClick={joinRoom} className="w-full" disabled={!pin || !email}>
              {t("student_access_btn")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const RoleIcon = assignment ? roleIcons[assignment.assigned_role] || Users : Users;
  const form = getFormForRole();
  const isActive = !!activeRound;
  const canFill = isActive && !submitted && assignment?.assigned_role !== "patient";

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{room?.title}</h1>
          <p className="text-sm text-muted-foreground">{participant?.student_name}</p>
        </div>
        <div className="flex items-center gap-3">
          {assignment && (
            <Badge className="text-sm py-1 px-3">
              <RoleIcon className="h-4 w-4 mr-1" />
              {roleLabels[assignment.assigned_role]}
            </Badge>
          )}
          {timeLeft !== null && (
            <span className={`font-mono text-xl font-bold ${timeLeft <= 60 ? "text-destructive" : "text-foreground"}`}>
              {formatTime(timeLeft)}
            </span>
          )}
        </div>
      </div>

      {/* Waiting state */}
      {!isActive && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground/50 mb-4 animate-pulse" />
            <h3 className="text-lg font-medium">{t("sim_waiting_professor")}</h3>
            <p className="text-sm text-muted-foreground">{t("sim_waiting_desc")}</p>
          </CardContent>
        </Card>
      )}

      {/* Submitted state */}
      {submitted && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Send className="h-10 w-10 text-green-600 mb-3" />
            <h3 className="text-lg font-medium text-green-700">{t("sim_submitted")}</h3>
            <p className="text-sm text-muted-foreground">{t("sim_waiting_next_round")}</p>
          </CardContent>
        </Card>
      )}

      {/* Form display */}
      {isActive && !submitted && form && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {form.title || roleLabels[assignment?.assigned_role]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignment?.assigned_role === "patient" ? (
              // Patient sees read-only script
              <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                {(form.content_json as any)?.[0]?.label || t("sim_no_script")}
              </div>
            ) : (
              // Others see fillable form
              <>
                {(form.content_json as FormField[]).map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label className="font-medium">
                      {field.label}
                      {field.max_score ? <span className="text-muted-foreground ml-2">({field.max_score} pts)</span> : null}
                    </Label>

                    {field.type === "text" && (
                      <Input
                        value={answers[field.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                        disabled={!canFill}
                      />
                    )}

                    {field.type === "textarea" && (
                      <Textarea
                        value={answers[field.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                        disabled={!canFill}
                        rows={4}
                      />
                    )}

                    {field.type === "radio" && field.options && (
                      <RadioGroup
                        value={answers[field.id] || ""}
                        onValueChange={(v) => setAnswers({ ...answers, [field.id]: v })}
                        disabled={!canFill}
                      >
                        {field.options.map((opt) => (
                          <div key={opt} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt} id={`${field.id}-${opt}`} />
                            <Label htmlFor={`${field.id}-${opt}`}>{opt}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {field.type === "checkbox" && field.options && (
                      <div className="space-y-2">
                        {field.options.map((opt) => (
                          <div key={opt} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${field.id}-${opt}`}
                              checked={(answers[field.id] || []).includes(opt)}
                              onCheckedChange={(checked) => {
                                const current = answers[field.id] || [];
                                setAnswers({
                                  ...answers,
                                  [field.id]: checked
                                    ? [...current, opt]
                                    : current.filter((o: string) => o !== opt),
                                });
                              }}
                              disabled={!canFill}
                            />
                            <Label htmlFor={`${field.id}-${opt}`}>{opt}</Label>
                          </div>
                        ))}
                      </div>
                    )}

                    {field.type === "scale" && (
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[answers[field.id] || 0]}
                          onValueChange={([v]) => setAnswers({ ...answers, [field.id]: v })}
                          max={field.max_score || 10}
                          step={1}
                          disabled={!canFill}
                          className="flex-1"
                        />
                        <span className="font-mono text-sm w-12 text-right">
                          {answers[field.id] || 0}/{field.max_score || 10}
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                <Button onClick={submitForm} disabled={!canFill} className="w-full mt-4">
                  <Send className="h-4 w-4 mr-2" />{t("sim_submit")}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
