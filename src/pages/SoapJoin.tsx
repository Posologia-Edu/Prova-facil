import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { FileText, Send, Eye, CheckCircle } from "lucide-react";
import FormRenderer from "@/components/forms/FormRenderer";
import type { FormField } from "@/components/forms/types";
import { useFormDraft } from "@/hooks/use-form-draft";
import DraftStatusBadge from "@/components/forms/DraftStatusBadge";
import SoapV2Workspace from "@/components/soap/SoapV2Workspace";
import SoapV2Devolutiva from "@/components/soap/SoapV2Devolutiva";


type Phase = "login" | "soap" | "waiting_peer" | "evaluate" | "done";

export default function SoapJoin() {
  async function chamarSoap(body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke("soap-aluno", { body });
    if (error) {
      let msg = error.message;
      try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* mantém */ }
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }

  // Fire-and-forget AI peer grading for solo students (SOAP v1). A anamnese rotulada e o id da resposta vêm do servidor.
  const triggerAIPeerGrading = async (
    roomData: any,
    participantData: any,
    soapFormData: any,
    answers: Record<string, any>,
    responseId: string | null,
    anamAnswers: Record<string, any>,
  ) => {
    try {
      if (!responseId) return;
      const soapFormFields = soapFormData ? (Array.isArray(soapFormData.content_json) ? soapFormData.content_json : []) : [];
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grade-soap`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            response_id: responseId,
            soap_answers: answers,
            anamnesis_answers: anamAnswers,
            soap_form_fields: soapFormFields,
            student_name: participantData.student_name || "",
            patient_name: patientName || "",
            access_code: roomData.access_code,
          }),
        }
      );
    } catch (err) {
      console.error("AI peer grading error:", err);
    }
  };

  const [pin, setPin] = useState(() => sessionStorage.getItem("soap_pin") || "");
  const [email, setEmail] = useState(() => sessionStorage.getItem("soap_email") || "");
  const [phase, setPhase] = useState<Phase>("login");
  const [room, setRoom] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [anamnesisAnswers, setAnamnesisAnswers] = useState<Record<string, any>>({});
  const [anamnesisFieldLabels, setAnamnesisFieldLabels] = useState<Record<string, string>>({});
  const [registro, setRegistro] = useState<any>(null);
  const [anamneseRotulada, setAnamneseRotulada] = useState<Record<string, any>>({});
  const [soapForm, setSoapForm] = useState<any>(null);
  const [peerForm, setPeerForm] = useState<any>(null);
  const [soapAnswers, setSoapAnswers] = useState<Record<string, any>>({});
  const [peerAnswers, setPeerAnswers] = useState<Record<string, any>>({});
  const [partnerSoapAnswers, setPartnerSoapAnswers] = useState<Record<string, any>>({});
  const [submittedSoap, setSubmittedSoap] = useState(false);
  const [submittedPeer, setSubmittedPeer] = useState(false);
  const [submittingSoap, setSubmittingSoap] = useState(false);
  const [submittingPeer, setSubmittingPeer] = useState(false);

  // Autosave SOAP draft
  const soapDraftKey =
    room && participant && soapForm
      ? `soap:${room.id}:${participant.id}:${soapForm.id}`
      : null;
  const soapDraft = useFormDraft({
    draftKey: soapDraftKey,
    module: "soap",
    accessCode: pin,
    email,
    enabled: !submittedSoap,
  });
  const soapDraftRestoredRef = useRef(false);
  useEffect(() => {
    if (!soapDraftKey || !soapDraft.loaded || submittedSoap || soapDraftRestoredRef.current) return;
    if (soapDraft.draft && Object.keys(soapDraft.draft).length > 0) {
      setSoapAnswers(soapDraft.draft);
      toast({ title: "Rascunho recuperado", description: "Suas respostas anteriores do SOAP foram restauradas." });
    }
    soapDraftRestoredRef.current = true;
  }, [soapDraft.draft, soapDraft.loaded, soapDraftKey, submittedSoap]);
  useEffect(() => {
    if (!soapDraftKey || submittedSoap || !soapDraft.loaded) return;
    soapDraft.saveDraft(soapAnswers);
  }, [soapAnswers, soapDraftKey, soapDraft.loaded, submittedSoap]);

  // Autosave peer evaluation draft
  const peerDraftKey =
    room && participant && partner && peerForm
      ? `soap_peer:${room.id}:${participant.id}:${partner.id}:${peerForm.id}`
      : null;
  const peerDraft = useFormDraft({
    draftKey: peerDraftKey,
    module: "soap_peer",
    accessCode: pin,
    email,
    enabled: !submittedPeer,
  });
  const peerDraftRestoredRef = useRef(false);
  useEffect(() => {
    if (!peerDraftKey || !peerDraft.loaded || submittedPeer || peerDraftRestoredRef.current) return;
    if (peerDraft.draft && Object.keys(peerDraft.draft).length > 0) {
      setPeerAnswers(peerDraft.draft);
    }
    peerDraftRestoredRef.current = true;
  }, [peerDraft.draft, peerDraft.loaded, peerDraftKey, submittedPeer]);
  useEffect(() => {
    if (!peerDraftKey || submittedPeer || !peerDraft.loaded) return;
    peerDraft.saveDraft(peerAnswers);
  }, [peerAnswers, peerDraftKey, peerDraft.loaded, submittedPeer]);

  const doLogin = async (usedPin: string, usedEmail: string) => {
    if (!usedPin || !usedEmail) return;
    let r: any;
    try {
      r = await chamarSoap({ action: "entrar", access_code: usedPin.toLowerCase(), email: usedEmail.toLowerCase() });
    } catch (e: any) {
      toast({ title: "Não foi possível entrar", description: e?.message, variant: "destructive" });
      return;
    }
    if (!r.ok && r.motivo === "sala") {
      toast({ title: "Sala não encontrada", description: "Verifique o PIN.", variant: "destructive" });
      return;
    }
    if (!r.ok) {
      toast({ title: "E-mail não encontrado", description: "Você não está cadastrado nesta sala.", variant: "destructive" });
      return;
    }

    setRoom(r.sala);
    const me = r.participante;
    setParticipant(me);
    sessionStorage.setItem("soap_pin", usedPin);
    sessionStorage.setItem("soap_email", usedEmail);
    if (r.parceiro) setPartner(r.parceiro);
    if (r.patientName) setPatientName(r.patientName);
    setAnamnesisAnswers(r.anamnesisAnswers || {});
    setAnamnesisFieldLabels(r.anamnesisFieldLabels || {});
    setRegistro(r.registro || null);
    setAnamneseRotulada(r.anamneseRotulada || {});
    setSoapForm(r.soapForm || null);
    setPeerForm(r.peerForm || null);

    if (r.soapEnviado) {
      setSubmittedSoap(true);
      // Solo students skip peer evaluation
      if (me.pair_position === "S") setPhase("done");
      else aplicarFasePar(r.fasePar, r.respostasParceiro);
    } else {
      setPhase("soap");
    }
  };

  /** Traduz a fase devolvida pelo servidor para a tela. */
  const aplicarFasePar = (fase: string | null, respostasParceiro: any) => {
    if (fase === "evaluate") { setPartnerSoapAnswers(respostasParceiro || {}); setPhase("evaluate"); }
    else if (fase === "done") { setPartnerSoapAnswers(respostasParceiro || {}); setSubmittedPeer(true); setPhase("done"); }
    else if (fase === "waiting_peer") setPhase("waiting_peer");
  };

  const handleLogin = () => doLogin(pin.trim(), email.trim());

  // Auto-login if session data exists
  useEffect(() => {
    const savedPin = sessionStorage.getItem("soap_pin");
    const savedEmail = sessionStorage.getItem("soap_email");
    if (savedPin && savedEmail && phase === "login" && !room) {
      doLogin(savedPin.trim(), savedEmail.trim());
    }
  }, []);

  const checkPartnerAndPeerStatus = async (_roomId?: string, _me?: any) => {
    try {
      const r = await chamarSoap({ action: "par", access_code: pin.trim().toLowerCase(), email: email.trim().toLowerCase() });
      if (r.parceiro) setPartner(r.parceiro);
      aplicarFasePar(r.fase, r.respostas_parceiro);
    } catch (e) {
      console.error("estado do par", e);
    }
  };

  useEffect(() => {
    if (submittedSoap && room && participant && phase === "login") {
      // Solo students skip peer evaluation
      if (participant.pair_position === "S") {
        setPhase("done");
      } else {
        checkPartnerAndPeerStatus(room.id, participant);
      }
    }
  }, [submittedSoap]);

  // Realtime polling for partner status (not needed for solo students)
  useEffect(() => {
    if (phase !== "waiting_peer" || !room || !participant || participant.pair_position === "S") return;
    const interval = setInterval(async () => {
      await checkPartnerAndPeerStatus(room.id, participant);
    }, 5000);
    return () => clearInterval(interval);
  }, [phase, room, participant]);

  const submitSoap = async () => {
    if (!window.confirm("Tem certeza que deseja enviar o SOAP? Após o envio não será possível editar.")) return;
    if (!soapForm || !participant || !room) return;
    if (submittingSoap) return;
    setSubmittingSoap(true);
    try {
      const isSolo = participant.pair_position === "S";
      const r = await chamarSoap({ action: "enviar_soap", access_code: pin.trim().toLowerCase(), email: email.trim().toLowerCase(), answers: soapAnswers });
      const partnerAbsent = !!r.partner_absent;
      setSubmittedSoap(true);
      await soapDraft.clearDraft();
      toast(r.ja_enviado ? { title: "SOAP já enviado", description: "Seu SOAP já havia sido registrado." } : { title: "SOAP enviado!" });

      if (isSolo) {
        setPhase("done");
        // SOAP v2: a correção por IA é outra função; a da v1 não entende o formulário novo.
        if (room.schema_version !== 2) triggerAIPeerGrading(room, participant, soapForm, soapAnswers, r.response_id, anamneseRotulada).catch(console.error);
      } else if (partnerAbsent) {
        setParticipant((p: any) => ({ ...p, status: "awaiting_teacher_peer" }));
        toast({
          title: "Par ausente",
          description: "Seu colega de dupla não está no sistema. O professor avaliará seu SOAP.",
        });
        setPhase("done");
      } else {
        await checkPartnerAndPeerStatus();
      }
    } catch (err: any) {
      console.error("submitSoap error", err);
      toast({
        title: "Erro ao enviar",
        description: err?.message || "Tente novamente. Suas respostas estão salvas automaticamente.",
        variant: "destructive",
      });
    } finally {
      setSubmittingSoap(false);
    }
  };

  const submitPeerEval = async () => {
    if (!window.confirm("Tem certeza que deseja enviar a avaliação? Após o envio não será possível editar.")) return;
    if (!peerForm || !participant || !partner || !room) return;
    if (submittingPeer) return;
    setSubmittingPeer(true);
    try {
      const r = await chamarSoap({ action: "enviar_avaliacao", access_code: pin.trim().toLowerCase(), email: email.trim().toLowerCase(), answers: peerAnswers });
      setSubmittedPeer(true);
      setPhase("done");
      if (r.ja_enviado) { toast({ title: "Avaliação já enviada" }); return; }
      await peerDraft.clearDraft();
      toast({ title: "Avaliação enviada!" });
    } catch (err: any) {
      console.error("submitPeerEval error", err);
      toast({ title: "Erro ao enviar", description: err?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSubmittingPeer(false);
    }
  };

  const renderFormFields = (fields: FormField[], answers: Record<string, any>, setAnswers: (a: Record<string, any>) => void, readOnly = false) => (
    <FormRenderer fields={fields} answers={answers} onChange={setAnswers} readOnly={readOnly} />
  );

  // Login screen
  if (phase === "login" && !submittedSoap) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <FileText className="h-10 w-10 mx-auto text-primary mb-2" />
            <CardTitle>Módulo SOAP</CardTitle>
            <p className="text-sm text-muted-foreground">Entre com o PIN da sala e seu e-mail</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>PIN da Sala</Label>
              <Input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Ex: abc123" className="text-center text-lg font-mono" />
            </div>
            <div>
              <Label>Seu E-mail</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" type="email" />
            </div>
            <Button onClick={handleLogin} disabled={!pin || !email} className="w-full">Entrar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // SOAP phase
  if (phase === "soap" && room?.schema_version === 2) {
    return (
      <SoapV2Workspace
        soapForm={soapForm}
        answers={soapAnswers}
        setAnswers={setSoapAnswers}
        registro={registro}
        patientName={patientName}
        draftLoaded={soapDraft.loaded}
        draftStatus={soapDraft.status}
        draftLastSavedAt={soapDraft.lastSavedAt}
        submitting={submittingSoap}
        onSubmit={submitSoap}
      />
    );
  }

  if (phase === "soap") {
    const soapFields: FormField[] = soapForm?.content_json || [];
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="font-heading text-2xl font-medium">Formulário SOAP</h1>
            <p className="text-muted-foreground">Preencha com base nas informações da sua anamnese</p>
            {patientName && (
              <p className="text-sm mt-1">Paciente simulado atendido: <strong>{patientName}</strong></p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Anamnesis (read-only) */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg font-medium flex items-center gap-2"><Eye className="h-4 w-4" />Suas Respostas de Anamnese</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(anamnesisAnswers).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(anamnesisAnswers)
                      .filter(([key]) => key !== "_feedback")
                      .map(([key, value]) => (
                      <div key={key} className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1 font-medium">{anamnesisFieldLabels[key] || key}</p>
                        <p className="text-sm">{typeof value === "object" ? JSON.stringify(value) : String(value)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhuma resposta de anamnese encontrada.</p>
                )}
              </CardContent>
            </Card>

            {/* SOAP form */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="font-heading text-lg font-medium flex items-center gap-2"><FileText className="h-4 w-4" />{soapForm?.title || "SOAP"}</CardTitle>
                  <DraftStatusBadge status={soapDraft.status} lastSavedAt={soapDraft.lastSavedAt} />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {renderFormFields(soapFields, soapAnswers, setSoapAnswers)}
                <Button
                  type="button"
                  onClick={submitSoap}
                  disabled={submittingSoap}
                  className="w-full sticky bottom-2 z-10 shadow-lg"
                  size="lg"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submittingSoap ? "Enviando..." : "Enviar SOAP"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Waiting for peer
  if (phase === "waiting_peer") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <div className="animate-pulse mb-4">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
            </div>
            <h2 className="font-heading text-xl font-medium mb-2">Aguardando seu par</h2>
            <p className="text-muted-foreground">Seu SOAP foi enviado. Aguarde o colega da dupla enviar o dele para iniciar a avaliação.</p>
            {partner && <p className="text-sm mt-4">Par: <strong>{partner.student_name}</strong></p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Peer evaluation
  if (phase === "evaluate") {
    const peerFields: FormField[] = peerForm?.content_json || [];
    const soapFields: FormField[] = soapForm?.content_json || [];
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="font-heading text-2xl font-medium">Avaliação entre Pares</h1>
            <p className="text-muted-foreground">Avalie o SOAP do seu colega: <strong>{partner?.student_name}</strong></p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Partner's SOAP (read-only) */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg font-medium flex items-center gap-2"><Eye className="h-4 w-4" />SOAP de {partner?.student_name}</CardTitle>
              </CardHeader>
              <CardContent>
                {renderFormFields(soapFields, partnerSoapAnswers, () => {}, true)}
              </CardContent>
            </Card>

            {/* Peer evaluation form */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="font-heading text-lg font-medium flex items-center gap-2"><FileText className="h-4 w-4" />{peerForm?.title || "Avaliação"}</CardTitle>
                  <DraftStatusBadge status={peerDraft.status} lastSavedAt={peerDraft.lastSavedAt} />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {renderFormFields(peerFields, peerAnswers, setPeerAnswers)}
                <Button
                  type="button"
                  onClick={submitPeerEval}
                  disabled={submittingPeer}
                  className="w-full sticky bottom-2 z-10 shadow-lg"
                  size="lg"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submittingPeer ? "Enviando..." : "Enviar Avaliação"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Done
  const awaitingTeacher = participant?.status === "awaiting_teacher_peer";
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="py-12">
          <CheckCircle className="h-12 w-12 mx-auto text-primary mb-4" />
          <h2 className="font-heading text-xl font-medium mb-2">Módulo SOAP Concluído!</h2>
          {awaitingTeacher ? (
            <p className="text-muted-foreground">
              Seu SOAP foi enviado. Como seu colega de dupla não compareceu, o professor fará a avaliação no lugar dele. Obrigado!
            </p>
          ) : participant?.pair_position === "S" ? (
            <p className="text-muted-foreground">Seu SOAP foi enviado. Obrigado!</p>
          ) : (
            <p className="text-muted-foreground">Você enviou seu formulário SOAP e a avaliação do colega. Obrigado!</p>
          )}
        </CardContent>
      </Card>
      {room?.schema_version === 2 && participant && (
        <div className="w-full max-w-2xl">
          <SoapV2Devolutiva roomId={room.id} accessCode={room.access_code} participantId={participant.id} email={participant.student_email || email} />
        </div>
      )}
    </div>
  );
}
