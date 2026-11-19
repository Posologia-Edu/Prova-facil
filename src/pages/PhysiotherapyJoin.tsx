import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { FileText, Send, CheckCircle, BookOpen, Users } from "lucide-react";
import FormRenderer from "@/components/forms/FormRenderer";
import type { FormField } from "@/components/forms/types";
import { moduleLabel } from "@/lib/physiotherapy-modules";

type Phase = "login" | "active" | "done";

export default function PhysiotherapyJoin() {
  const [countdown, setCountdown] = useState(15);
  const [pin, setPin] = useState(() => sessionStorage.getItem("physiotherapy_pin") || "");
  const [email, setEmail] = useState(() => sessionStorage.getItem("physiotherapy_email") || "");
  const [phase, setPhase] = useState<Phase>("login");
  const [room, setRoom] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [clinicalCase, setClinicalCase] = useState<any>(null);
  const [standardForm, setStandardForm] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);

  async function chamarArea(body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke("area-aluno", { body: { modulo: "physiotherapy", ...body } });
    if (error) {
      let msg = error.message;
      try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* mantém */ }
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }

  const handleLogin = async () => {
    if (!pin.trim() || !email.trim()) return;
    let r: any;
    try {
      r = await chamarArea({ action: "entrar", access_code: pin.trim().toLowerCase(), email: email.trim().toLowerCase() });
    } catch (e: any) {
      toast({ title: "Não foi possível entrar", description: e?.message, variant: "destructive" });
      return;
    }
    if (!r.ok && r.motivo === "sala") { toast({ title: "Sala não encontrada", description: "Verifique o PIN ou aguarde a ativação.", variant: "destructive" }); return; }
    if (!r.ok) { toast({ title: "E-mail não encontrado", variant: "destructive" }); return; }
    setRoom(r.sala);
    setParticipant(r.participante);
    if (r.parceiro) setPartner(r.parceiro);
    if (r.formulario) setStandardForm(r.formulario);
    if (r.caso) setClinicalCase(r.caso);
    if (r.enviada) { setSubmitted(true); setPhase("done"); } else { setPhase("active"); }
    sessionStorage.setItem("physiotherapy_pin", pin.trim().toLowerCase());
    sessionStorage.setItem("physiotherapy_email", email.trim().toLowerCase());
  };

  const handleSubmit = async () => {
    if (!window.confirm("Tem certeza que deseja enviar o formulário? Após o envio não será possível editar.")) return;
    if (!room || !participant || !standardForm) return;
    try {
      await chamarArea({ action: "enviar", access_code: (room.access_code || pin).trim().toLowerCase(), email: (participant.student_email || email).trim().toLowerCase(), answers });
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e?.message || "Tente novamente.", variant: "destructive" });
      return;
    }
    setSubmitted(true); setPhase("done");
    toast({ title: "Enviado!", description: "Formulário enviado com sucesso." });
  };

  const formFields: FormField[] = standardForm ? (Array.isArray(standardForm.content_json) ? standardForm.content_json : []) : [];

  useEffect(() => {
    if (phase !== "done") return;
    if (countdown <= 0) { window.location.href = "/"; return; }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  if (phase === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="font-heading text-xl font-medium">Fisioterapia</CardTitle>
            <p className="text-sm text-muted-foreground">Insira o PIN e seu e-mail para entrar</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><Label>PIN da Sala</Label><Input value={pin} onChange={e => setPin(e.target.value)} placeholder="Ex: abc123" /></div>
            <div><Label>E-mail</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" /></div>
            <Button className="w-full" onClick={handleLogin}>Entrar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="font-heading text-xl font-medium mb-2">Formulário Enviado!</h2>
            <p className="text-muted-foreground">Aguarde a avaliação do professor.</p>
            <p className="text-sm text-muted-foreground mt-4">Redirecionando em {countdown}s...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg font-medium">{moduleLabel[room?.module_type] || "Fisioterapia"} — {room?.title}</CardTitle>
            <div className="flex gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{participant?.pair_position === "S" ? "Individual" : `Dupla ${(participant?.pair_index || 0) + 1}`}</span>
              {partner && <span>· Parceiro(a): {partner.student_name}</span>}
            </div>
          </CardHeader>
        </Card>

        {clinicalCase && (
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg font-medium flex items-center gap-2"><BookOpen className="h-4 w-4" />{clinicalCase.title}</CardTitle></CardHeader>
            <CardContent><p className="text-sm whitespace-pre-wrap">{clinicalCase.content}</p></CardContent>
          </Card>
        )}

        {standardForm && (
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg font-medium flex items-center gap-2"><FileText className="h-4 w-4" />{standardForm.title}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <FormRenderer fields={formFields} answers={answers} onChange={setAnswers} showScores={true} />
            </CardContent>
          </Card>
        )}

        <Button className="w-full" onClick={handleSubmit} disabled={submitted}>
          <Send className="h-4 w-4 mr-2" />Enviar
        </Button>
      </div>
    </div>
  );
}
