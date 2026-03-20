import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Loader2, ArrowLeft, KeyRound, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/student-exam-access`;

export default function StudentAuth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pin.trim()) return;
    setLoading(true);

    try {
      // Check if PIN belongs to a simulation room first
      const { data: simRoom, error: simErr } = await supabase
        .from("simulation_rooms")
        .select("id, access_code")
        .eq("access_code", pin.trim().toLowerCase())
        .limit(1)
        .maybeSingle();

      console.log("[StudentAuth] Simulation room check:", { pin: pin.trim().toLowerCase(), simRoom, simErr });

      if (simRoom) {
        // Redirect to simulation join with pre-filled data
        sessionStorage.setItem("sim_pin", pin.trim().toLowerCase());
        sessionStorage.setItem("sim_email", email.trim().toLowerCase());
        navigate("/simulation/join");
        return;
      }

      // Check if PIN belongs to a SOAP room
      const { data: soapRoom } = await supabase
        .from("soap_rooms")
        .select("id, access_code, status")
        .eq("access_code", pin.trim().toLowerCase())
        .limit(1)
        .maybeSingle();

      console.log("[StudentAuth] SOAP room check:", { pin: pin.trim().toLowerCase(), soapRoom });

      if (soapRoom) {
        if (soapRoom.status !== "active") {
          toast({ title: "Sala não disponível", description: "Esta sala SOAP ainda não foi ativada pelo professor.", variant: "destructive" });
          setLoading(false);
          return;
        }
        sessionStorage.setItem("soap_pin", pin.trim().toLowerCase());
        sessionStorage.setItem("soap_email", email.trim().toLowerCase());
        navigate("/simulations/soap/join");
        return;
      }

      // Check if PIN belongs to an OSCE circuit
      const { data: osceCircuit } = await supabase
        .from("osce_circuits")
        .select("id, access_code")
        .eq("access_code", pin.trim().toLowerCase())
        .limit(1)
        .maybeSingle();

      if (osceCircuit) {
        navigate(`/osce/student/${pin.trim().toLowerCase()}`);
        return;
      }

      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", email, pin }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        toast({ title: t("student_access_denied"), description: data.error || t("student_unknown_error"), variant: "destructive" });
        setLoading(false);
        return;
      }

      sessionStorage.setItem("student_email", email.trim().toLowerCase());
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
            <form onSubmit={handleAccess} className="space-y-4">
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
