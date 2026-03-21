import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { FileText, Send, CheckCircle, BookOpen, Users } from "lucide-react";
import FormRenderer from "@/components/forms/FormRenderer";
import type { FormField } from "@/components/forms/types";

type Phase = "login" | "waiting" | "active" | "done";

export default function ReconciliationJoin() {
  const [pin, setPin] = useState(() => sessionStorage.getItem("recon_pin") || "");
  const [email, setEmail] = useState(() => sessionStorage.getItem("recon_email") || "");
  const [phase, setPhase] = useState<Phase>("login");
  const [room, setRoom] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [clinicalCase, setClinicalCase] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleLogin = async () => {
    if (!pin.trim() || !email.trim()) return;

    const { data: rooms } = await supabase
      .from("reconciliation_rooms")
      .select("*")
      .eq("access_code", pin.trim().toLowerCase())
      .eq("status", "active");

    if (!rooms?.length) {
      toast({ title: "Sala não encontrada", description: "Verifique o PIN ou aguarde a ativação.", variant: "destructive" });
      return;
    }
    const foundRoom = rooms[0];
    setRoom(foundRoom);

    const { data: parts } = await supabase
      .from("reconciliation_participants")
      .select("*")
      .eq("room_id", foundRoom.id)
      .eq("student_email", email.trim().toLowerCase());

    if (!parts?.length) {
      toast({ title: "E-mail não encontrado", description: "Você não está cadastrado nesta sala.", variant: "destructive" });
      return;
    }
    const me = parts[0];
    setParticipant(me);

    // Update status to ready
    await supabase.from("reconciliation_participants").update({ status: "ready" }).eq("id", me.id);

    // Find partner
    if (me.pair_index >= 0) {
      const { data: partners } = await supabase
        .from("reconciliation_participants")
        .select("*")
        .eq("room_id", foundRoom.id)
        .eq("pair_index", me.pair_index)
        .neq("id", me.id);
      if (partners?.length) setPartner(partners[0]);
    }

    // Load reconciliation form
    const { data: formData } = await supabase
      .from("reconciliation_forms")
      .select("*")
      .eq("room_id", foundRoom.id)
      .eq("form_type", "reconciliation")
      .limit(1)
      .maybeSingle();
    if (formData) setForm(formData);

    // Load clinical case (round-robin by pair_index)
    const { data: cases } = await supabase
      .from("reconciliation_clinical_cases")
      .select("*")
      .eq("room_id", foundRoom.id)
      .order("position", { ascending: true });

    if (cases?.length && me.pair_index >= 0) {
      const caseIdx = me.pair_index % cases.length;
      setClinicalCase(cases[caseIdx]);
    }

    // Check if already submitted
    const { data: existingResponse } = await supabase
      .from("reconciliation_responses")
      .select("*")
      .eq("room_id", foundRoom.id)
      .eq("pair_index", me.pair_index)
      .maybeSingle();

    if (existingResponse?.submitted_at) {
      setSubmitted(true);
      setAnswers(existingResponse.answers_json as any || {});
      setPhase("done");
    } else {
      setPhase("active");
    }

    sessionStorage.setItem("recon_pin", pin.trim().toLowerCase());
    sessionStorage.setItem("recon_email", email.trim().toLowerCase());
  };

  const handleSubmit = async () => {
    if (!room || !participant || !form) return;

    const { error } = await supabase.from("reconciliation_responses").insert({
      room_id: room.id,
      pair_index: participant.pair_index,
      form_id: form.id,
      clinical_case_id: clinicalCase?.id || null,
      answers_json: answers as any,
      submitted_at: new Date().toISOString(),
    });

    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      return;
    }

    // Update both partners status to done
    await supabase.from("reconciliation_participants")
      .update({ status: "done" })
      .eq("room_id", room.id)
      .eq("pair_index", participant.pair_index);

    setSubmitted(true);
    setPhase("done");
    toast({ title: "Enviado!", description: "Ficha de reconciliação enviada com sucesso." });
  };

  const fields: FormField[] = form ? (Array.isArray(form.content_json) ? form.content_json : []) : [];

  // Form rendering delegated to FormRenderer

  if (phase === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Reconciliação</CardTitle>
            <p className="text-sm text-muted-foreground">Insira o PIN e seu e-mail para entrar</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>PIN da Sala</Label>
              <Input value={pin} onChange={e => setPin(e.target.value)} placeholder="Ex: abc123" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
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
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Ficha Enviada!</h2>
            <p className="text-muted-foreground">Sua ficha de reconciliação foi enviada com sucesso. Aguarde a avaliação do professor.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reconciliação — {room?.title}</CardTitle>
            <div className="flex gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />Dupla {(participant?.pair_index || 0) + 1}</span>
              {partner && <span>· Parceiro(a): {partner.student_name}</span>}
            </div>
          </CardHeader>
        </Card>

        {/* Clinical Case */}
        {clinicalCase && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {clinicalCase.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{clinicalCase.content}</p>
            </CardContent>
          </Card>
        )}

        {/* Reconciliation Form */}
        {form && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {form.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {fields.map((field, idx) => (
                <div key={field.id} className="space-y-2">
                  <Label className="text-sm font-medium">
                    {idx + 1}. {field.label}
                    {field.max_score ? <span className="text-muted-foreground ml-1">({field.max_score} pts)</span> : null}
                  </Label>
                  {renderField(field)}
                </div>
              ))}

              <Button className="w-full" onClick={handleSubmit} disabled={submitted}>
                <Send className="h-4 w-4 mr-2" />Enviar Ficha de Reconciliação
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
