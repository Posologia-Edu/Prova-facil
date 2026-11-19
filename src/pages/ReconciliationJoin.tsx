import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ClinicalCaseContent from "@/components/ClinicalCaseContent";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { FileText, Send, CheckCircle, BookOpen, Users } from "lucide-react";
import FormRenderer from "@/components/forms/FormRenderer";
import type { FormField } from "@/components/forms/types";
import { useFormDraft } from "@/hooks/use-form-draft";
import DraftStatusBadge from "@/components/forms/DraftStatusBadge";
import ReconV2Aluno from "@/components/reconciliation/ReconV2Aluno";



type Phase = "login" | "waiting" | "active" | "done";

export default function ReconciliationJoin() {
  const [countdown, setCountdown] = useState(15);
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

  async function chamarRecon(body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke("recon-aluno", { body });
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
      r = await chamarRecon({ action: "entrar", access_code: pin.trim().toLowerCase(), email: email.trim().toLowerCase() });
    } catch (e: any) {
      toast({ title: "Não foi possível entrar", description: e?.message, variant: "destructive" });
      return;
    }
    if (!r.ok && r.motivo === "sala") {
      toast({ title: "Sala não encontrada", description: "Verifique o PIN ou aguarde a ativação.", variant: "destructive" });
      return;
    }
    if (!r.ok) {
      toast({ title: "E-mail não encontrado", description: "Você não está cadastrado nesta sala.", variant: "destructive" });
      return;
    }

    setRoom(r.sala);
    setParticipant(r.participante);
    if (r.parceiro) setPartner(r.parceiro);
    if (r.formulario) setForm(r.formulario);
    if (r.caso) setClinicalCase(r.caso);

    if (r.enviada) {
      setSubmitted(true);
      setAnswers(r.respostas || {});
      setPhase("done");
    } else {
      setPhase("active");
    }

    sessionStorage.setItem("recon_pin", pin.trim().toLowerCase());
    sessionStorage.setItem("recon_email", email.trim().toLowerCase());
  };

  // Autosave draft for reconciliation form
  const draftKey =
    room && participant && form && room.schema_version !== 2
      ? `reconciliation:${room.id}:${participant.id}:${form.id}`
      : null;
  const {
    draft,
    loaded: draftLoaded,
    status: draftStatus,
    lastSavedAt,
    saveDraft,
    clearDraft,
  } = useFormDraft({ draftKey, module: "reconciliation", accessCode: room?.access_code, email: participant?.student_email || email, enabled: !submitted });

  // Restore draft once on first load if no final submission
  const draftRestoredRef = useRef(false);
  useEffect(() => {
    if (!draftLoaded || submitted || draftRestoredRef.current) return;
    if (draft && Object.keys(draft).length > 0) {
      setAnswers(draft);
      toast({ title: "Rascunho recuperado", description: "Suas respostas anteriores foram restauradas." });
    }
    draftRestoredRef.current = true;
  }, [draft, draftLoaded, submitted]);

  // Trigger debounced autosave on answers change
  useEffect(() => {
    if (!draftKey || submitted) return;
    if (!draftLoaded) return;
    saveDraft(answers);
  }, [answers, draftKey, draftLoaded, submitted, saveDraft]);

  const handleSubmit = async () => {
    if (!window.confirm("Tem certeza que deseja enviar o formulário? Após o envio não será possível editar.")) return;
    if (!room || !participant || !form) return;

    try {
      await chamarRecon({ action: "enviar", access_code: room.access_code, email: participant.student_email || email, answers });
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e?.message, variant: "destructive" });
      return;
    }

    await clearDraft();
    setSubmitted(true);
    setPhase("done");
    toast({ title: "Enviado!", description: "Ficha de reconciliação enviada com sucesso." });
  };


  const fields: FormField[] = form ? (Array.isArray(form.content_json) ? form.content_json : []) : [];

  // Auto-redirect after submission
  useEffect(() => {
    if (phase !== "done") return;
    if (countdown <= 0) {
      window.location.href = "/";
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  // Form rendering delegated to FormRenderer

  // Reconciliação v2: a tela inteira é outra (dossiê, BPMH travada, prescrição entregue pelo servidor).
  if (phase !== "login" && room?.schema_version === 2 && participant) {
    return <ReconV2Aluno room={room} participant={participant} accessCode={room.access_code} email={participant.student_email || email} />;
  }

  if (phase === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="font-heading text-xl font-medium">Reconciliação</CardTitle>
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
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="font-heading text-xl font-medium mb-2">Ficha Enviada!</h2>
            <p className="text-muted-foreground">Sua ficha de reconciliação foi enviada com sucesso. Aguarde a avaliação do professor.</p>
            <p className="text-sm text-muted-foreground mt-4">Redirecionando em {countdown}s...</p>
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
            <CardTitle className="font-heading text-lg font-medium">Reconciliação — {room?.title}</CardTitle>
            <div className="flex gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{participant?.pair_position === "S" ? "Individual" : `Dupla ${(participant?.pair_index || 0) + 1}`}</span>
              {partner && <span>· Parceiro(a): {partner.student_name}</span>}
            </div>
          </CardHeader>
        </Card>

        {/* Clinical Case */}
        {clinicalCase && (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {clinicalCase.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ClinicalCaseContent content={clinicalCase.content} />
            </CardContent>
          </Card>
        )}

        {/* Reconciliation Form */}
        {form && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="font-heading text-lg font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {form.title}
                </CardTitle>
                <DraftStatusBadge status={draftStatus} lastSavedAt={lastSavedAt} />
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <FormRenderer
                fields={fields}
                answers={answers}
                onChange={setAnswers}
                showScores={true}
              />

              <Button type="button" className="w-full sticky bottom-2 z-10 shadow-lg" size="lg" onClick={handleSubmit} disabled={submitted}>
                <Send className="h-4 w-4 mr-2" />Enviar Ficha de Reconciliação
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
