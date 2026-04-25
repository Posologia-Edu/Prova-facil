import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Loader2, ArrowLeft, KeyRound, Mail, Users, User, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/student-exam-access`;

export default function StudentAuth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [assessmentType, setAssessmentType] = useState<"individual" | "group">("individual");
  const [groupEmails, setGroupEmails] = useState<string[]>([""]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const addGroupEmail = () => setGroupEmails(prev => [...prev, ""]);
  const removeGroupEmail = (index: number) => setGroupEmails(prev => prev.filter((_, i) => i !== index));
  const updateGroupEmail = (index: number, value: string) => {
    setGroupEmails(prev => prev.map((e, i) => i === index ? value : e));
  };

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    // For individual mode, email is required
    if (assessmentType === "individual" && !email.trim()) return;

    // For group mode, at least one email is required
    const validGroupEmails = groupEmails.map(e => e.trim().toLowerCase()).filter(Boolean);
    if (assessmentType === "group" && validGroupEmails.length === 0) {
      toast({ title: "Erro", description: "Informe pelo menos um e-mail do grupo.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const normalizedPin = pin.trim().toLowerCase();
      const primaryEmail = assessmentType === "individual" ? email.trim().toLowerCase() : validGroupEmails[0];

      // Check if PIN belongs to a simulation room first
      const { data: simRoom } = await supabase
        .from("simulation_rooms")
        .select("id, access_code, status")
        .eq("access_code", normalizedPin)
        .limit(1)
        .maybeSingle();

      if (simRoom) {
        if (simRoom.status === "draft") {
          toast({ title: "Sala não disponível", description: "Esta sala de simulação ainda não foi ativada pelo professor.", variant: "destructive" });
          setLoading(false);
          return;
        }
        sessionStorage.setItem("sim_pin", normalizedPin);
        sessionStorage.setItem("sim_email", primaryEmail);
        navigate("/simulation/join");
        return;
      }

      // Check if PIN belongs to a SOAP room
      const { data: soapRoom } = await supabase
        .from("soap_rooms")
        .select("id, access_code, status")
        .eq("access_code", normalizedPin)
        .limit(1)
        .maybeSingle();

      if (soapRoom) {
        if (soapRoom.status !== "active") {
          toast({ title: "Sala não disponível", description: "Esta sala SOAP ainda não foi ativada pelo professor.", variant: "destructive" });
          setLoading(false);
          return;
        }
        sessionStorage.setItem("soap_pin", normalizedPin);
        sessionStorage.setItem("soap_email", primaryEmail);
        navigate("/simulation/soap/join");
        return;
      }

      // Check if PIN belongs to a Reconciliation room
      const { data: reconRoom } = await supabase
        .from("reconciliation_rooms")
        .select("id, access_code, status")
        .eq("access_code", normalizedPin)
        .limit(1)
        .maybeSingle();

      if (reconRoom) {
        if (reconRoom.status !== "active") {
          toast({ title: "Sala não disponível", description: "Esta sala de reconciliação ainda não foi ativada.", variant: "destructive" });
          setLoading(false);
          return;
        }
        sessionStorage.setItem("recon_pin", normalizedPin);
        sessionStorage.setItem("recon_email", primaryEmail);
        navigate("/simulation/reconciliation/join");
        return;
      }

      // Check if PIN belongs to a Documentation room
      const { data: docRoom } = await supabase
        .from("documentation_rooms")
        .select("id, access_code, status")
        .eq("access_code", normalizedPin)
        .limit(1)
        .maybeSingle();

      if (docRoom) {
        if (docRoom.status !== "active") {
          toast({ title: "Sala não disponível", description: "Esta sala de documentação ainda não foi ativada.", variant: "destructive" });
          setLoading(false);
          return;
        }
        sessionStorage.setItem("doc_pin", normalizedPin);
        sessionStorage.setItem("doc_email", primaryEmail);
        navigate("/simulation/documentation/join");
        return;
      }

      // Check if PIN belongs to a Virtual Patient room
      const { data: vpRoom } = await supabase
        .from("class_virtual_patients")
        .select("id, class_id, patient_id, status")
        .eq("access_code", normalizedPin)
        .limit(1)
        .maybeSingle();

      if (vpRoom) {
        if (vpRoom.status !== "active") {
          toast({ title: "Sala não disponível", description: "Este paciente virtual ainda não foi ativado pelo professor.", variant: "destructive" });
          setLoading(false);
          return;
        }

        if (assessmentType === "group") {
          // Validate ALL group emails against the class
          const { data: classStudents } = await supabase
            .from("class_students")
            .select("id, student_name, student_email")
            .eq("class_id", vpRoom.class_id);

          const normalizedClassEmails = (classStudents || []).map(s => ({
            ...s,
            normalized: (s.student_email || "").trim().toLowerCase(),
          }));

          const validatedMembers: { email: string; name: string }[] = [];
          const invalidEmails: string[] = [];

          for (const ge of validGroupEmails) {
            const match = normalizedClassEmails.find(s => s.normalized === ge);
            if (match) {
              validatedMembers.push({ email: ge, name: match.student_name });
            } else {
              invalidEmails.push(ge);
            }
          }

          if (invalidEmails.length > 0) {
            toast({
              title: "E-mails não cadastrados",
              description: `Os seguintes e-mails não estão na turma: ${invalidEmails.join(", ")}`,
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          if (validatedMembers.length === 0) {
            toast({ title: "Erro", description: "Nenhum e-mail válido do grupo.", variant: "destructive" });
            setLoading(false);
            return;
          }

          // Store group info and navigate
          sessionStorage.setItem("vp_email", validatedMembers[0].email);
          sessionStorage.setItem("vp_student_name", validatedMembers.map(m => m.name).join(", "));
          sessionStorage.setItem("vp_group_emails", JSON.stringify(validatedMembers.map(m => m.email)));
          sessionStorage.setItem("vp_group_names", JSON.stringify(validatedMembers.map(m => m.name)));
          navigate(`/virtual-patients/room/${vpRoom.id}`);
          return;
        } else {
          // Individual mode
          const { data: studentInClass } = await supabase
            .from("class_students")
            .select("id, student_name")
            .eq("class_id", vpRoom.class_id)
            .ilike("student_email", primaryEmail)
            .limit(1)
            .maybeSingle();

          if (!studentInClass) {
            toast({ title: "Acesso negado", description: "Seu e-mail não está cadastrado na turma vinculada a este paciente virtual.", variant: "destructive" });
            setLoading(false);
            return;
          }

          sessionStorage.setItem("vp_email", primaryEmail);
          sessionStorage.setItem("vp_student_name", studentInClass.student_name || "");
          // Clear group data
          sessionStorage.removeItem("vp_group_emails");
          sessionStorage.removeItem("vp_group_names");
          navigate(`/virtual-patients/room/${vpRoom.id}`);
          return;
        }
      }

      // Check if PIN belongs to a Mock Trial
      const { data: mockTrialRoom } = await supabase
        .from("mock_trials")
        .select("id, access_code, status, judge_name")
        .eq("access_code", normalizedPin)
        .limit(1)
        .maybeSingle();

      if (mockTrialRoom) {
        if (mockTrialRoom.status === "draft") {
          toast({ title: "Atividade não disponível", description: "Este júri simulado ainda não foi ativado pelo professor.", variant: "destructive" });
          setLoading(false);
          return;
        }

        // In group mode, ALL provided e-mails must belong to the SAME group.
        // If any e-mail does not belong to the identified group, block entry
        // and list exactly which e-mail(s) are not part of it.
        if (assessmentType === "group") {
          const { data: trialGroups } = await supabase
            .from("mock_trial_groups")
            .select("id, name")
            .eq("mock_trial_id", mockTrialRoom.id);
          const groupIds = (trialGroups || []).map((g: any) => g.id);
          if (groupIds.length > 0) {
            const { data: studs } = await supabase
              .from("mock_trial_students")
              .select("group_id, student_email, student_name")
              .in("group_id", groupIds);
            const roster = (studs || []).map((s: any) => ({
              ...s,
              email_norm: (s.student_email || "").trim().toLowerCase(),
            }));

            // Find candidate group: first email that matches any roster entry
            let foundGroupId: string | null = null;
            for (const ge of validGroupEmails) {
              const match = roster.find((s: any) => s.email_norm === ge);
              if (match) { foundGroupId = match.group_id; break; }
            }
            if (!foundGroupId) {
              toast({
                title: "Grupo não encontrado",
                description: "Nenhum dos e-mails informados está cadastrado em um grupo deste Júri Simulado.",
                variant: "destructive",
              });
              setLoading(false);
              return;
            }

            // Validate that EVERY provided e-mail belongs to that exact group
            const groupRoster = roster.filter((s: any) => s.group_id === foundGroupId);
            const groupEmailsSet = new Set(groupRoster.map((s: any) => s.email_norm));
            const invalidEmails = validGroupEmails.filter(ge => !groupEmailsSet.has(ge));
            if (invalidEmails.length > 0) {
              const groupName = (trialGroups || []).find((g: any) => g.id === foundGroupId)?.name || "do grupo identificado";
              toast({
                title: "E-mail(s) fora do grupo",
                description: `Os seguintes e-mails não fazem parte de "${groupName}": ${invalidEmails.join(", ")}. Corrija e tente novamente.`,
                variant: "destructive",
              });
              setLoading(false);
              return;
            }

            // All good — store the full validated member list
            const memberEmails = groupRoster.map((s: any) => s.email_norm);
            const memberNames = groupRoster.map((s: any) => s.student_name || "");
            const primary = groupRoster[0]?.student_email || validGroupEmails[0];
            sessionStorage.setItem("mt_pin", normalizedPin);
            sessionStorage.setItem("mt_email", primary);
            sessionStorage.setItem("mt_group_emails", JSON.stringify(memberEmails));
            sessionStorage.setItem("mt_group_names", JSON.stringify(memberNames));
            navigate(`/mock-trial/portal/${normalizedPin}`);
            return;
          }
        }

        // Individual mode: clear any previous group data
        sessionStorage.removeItem("mt_group_emails");
        sessionStorage.removeItem("mt_group_names");

        sessionStorage.setItem("mt_pin", normalizedPin);
        sessionStorage.setItem("mt_email", primaryEmail);
        navigate(`/mock-trial/portal/${normalizedPin}`);
        return;
      }

      const { data: osceCircuit } = await supabase
        .from("osce_circuits")
        .select("id, access_code")
        .eq("access_code", normalizedPin)
        .limit(1)
        .maybeSingle();

      if (osceCircuit) {
        navigate(`/osce/student/${normalizedPin}`);
        return;
      }

      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", email: primaryEmail, pin }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        toast({ title: t("student_access_denied"), description: data.error || t("student_unknown_error"), variant: "destructive" });
        setLoading(false);
        return;
      }

      sessionStorage.setItem("student_email", primaryEmail);
      sessionStorage.setItem("student_session_id", data.sessionId);

      if (data.status === "finished") {
        navigate(`/student/results/${data.sessionId}`);
      } else {
        navigate(`/student/exam/${data.sessionId}`);
      }
    } catch (err) {
      toast({ title: t("student_error"), description: t("student_connection_error"), variant: "destructive" });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-20 right-1/4 h-96 w-96 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          {t("student_back_home")}
        </Link>

        <Card className="border shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-2">
              <GraduationCap className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">{t("student_portal_title")}</CardTitle>
            <CardDescription>{t("student_portal_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Assessment type toggle */}
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={assessmentType === "individual" ? "default" : "outline"}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => setAssessmentType("individual")}
              >
                <User className="h-3.5 w-3.5" /> Individual
              </Button>
              <Button
                type="button"
                variant={assessmentType === "group" ? "default" : "outline"}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => setAssessmentType("group")}
              >
                <Users className="h-3.5 w-3.5" /> Em Grupo
              </Button>
            </div>

            <form onSubmit={handleAccess} className="space-y-4">
              {assessmentType === "individual" ? (
                <div className="space-y-2">
                  <Label htmlFor="student-email">
                    <Mail className="inline h-3.5 w-3.5 mr-1" />
                    {t("student_email_label")}
                  </Label>
                  <Input
                    id="student-email"
                    type="email"
                    placeholder={t("student_email_placeholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>
                    <Users className="inline h-3.5 w-3.5 mr-1" />
                    E-mails do Grupo
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Informe os e-mails de todos os membros do grupo. Todos devem estar cadastrados na turma.
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {groupEmails.map((ge, i) => (
                      <div key={i} className="flex gap-1.5">
                        <Input
                          type="email"
                          placeholder={`E-mail do membro ${i + 1}`}
                          value={ge}
                          onChange={(e) => updateGroupEmail(i, e.target.value)}
                          className="text-sm"
                        />
                        {groupEmails.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive" onClick={() => removeGroupEmail(i)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" className="w-full gap-1.5" onClick={addGroupEmail}>
                    <Plus className="h-3.5 w-3.5" /> Adicionar Membro
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="student-pin">
                  <KeyRound className="inline h-3.5 w-3.5 mr-1" />
                  {t("student_pin_label")}
                </Label>
                <Input
                  id="student-pin"
                  type="text"
                  placeholder={t("student_pin_placeholder")}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="font-mono uppercase tracking-widest text-center text-lg"
                  maxLength={10}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("student_access_btn")}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-4">
              {t("student_help_text")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
