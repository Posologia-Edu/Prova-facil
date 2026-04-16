import { useState, useEffect } from "react";
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

type Phase = "login" | "soap" | "waiting_peer" | "evaluate" | "done";

export default function SoapJoin() {
  // Fire-and-forget AI peer grading for solo students
  const triggerAIPeerGrading = async (
    roomData: any,
    participantData: any,
    soapFormData: any,
    answers: Record<string, any>
  ) => {
    try {
      // Get SOAP response ID (just inserted)
      const { data: soapResps } = await supabase
        .from("soap_responses")
        .select("id")
        .eq("participant_id", participantData.id)
        .eq("room_id", roomData.id)
        .is("target_participant_id", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (!soapResps?.length) return;

      // Build anamnesis answers with labels
      let anamAnswers: Record<string, any> = {};
      if (participantData.anamnesis_participant_id && roomData.anamnesis_room_id) {
        const { data: anamP } = await supabase
          .from("simulation_participants")
          .select("pair_index")
          .eq("id", participantData.anamnesis_participant_id)
          .single();
        if (anamP) {
          const { data: anamForms } = await supabase
            .from("simulation_forms")
            .select("*")
            .eq("room_id", roomData.anamnesis_room_id)
            .eq("form_type", "standard");
          const anamForm = anamForms?.[0];
          if (anamForm) {
            const { data: anamResps } = await (supabase.from("simulation_responses") as any)
              .select("answers_json")
              .eq("room_id", roomData.anamnesis_room_id)
              .eq("form_id", anamForm.id)
              .eq("pair_index", anamP.pair_index)
              .limit(1);
            if (anamResps?.[0]?.answers_json) {
              const fields = Array.isArray(anamForm.content_json) ? (anamForm.content_json as any[]) : [];
              for (const [key, value] of Object.entries(anamResps[0].answers_json as Record<string, any>)) {
                if (key === "_feedback") continue;
                const field = fields.find((f: any) => f.id === key);
                anamAnswers[field?.label || key] = value;
              }
            }
          }
        }
      }

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
            response_id: soapResps[0].id,
            soap_answers: answers,
            anamnesis_answers: anamAnswers,
            soap_form_fields: soapFormFields,
            student_name: participantData.student_name || "",
            patient_name: patientName || "",
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
  const [soapForm, setSoapForm] = useState<any>(null);
  const [peerForm, setPeerForm] = useState<any>(null);
  const [soapAnswers, setSoapAnswers] = useState<Record<string, any>>({});
  const [peerAnswers, setPeerAnswers] = useState<Record<string, any>>({});
  const [partnerSoapAnswers, setPartnerSoapAnswers] = useState<Record<string, any>>({});
  const [submittedSoap, setSubmittedSoap] = useState(false);
  const [submittedPeer, setSubmittedPeer] = useState(false);

  const doLogin = async (usedPin: string, usedEmail: string) => {
    if (!usedPin || !usedEmail) return;
    // Find room by access code
    const { data: rooms, error: roomErr } = await supabase
      .from("soap_rooms")
      .select("*")
      .eq("access_code", usedPin.toLowerCase())
      .eq("status", "active");
    if (roomErr || !rooms?.length) {
      toast({ title: "Sala não encontrada", description: "Verifique o PIN.", variant: "destructive" });
      return;
    }
    const foundRoom = rooms[0];
    setRoom(foundRoom);

    // Find participant by email
    const { data: parts } = await supabase
      .from("soap_participants")
      .select("*")
      .eq("room_id", foundRoom.id)
      .eq("student_email", usedEmail.toLowerCase());
    if (!parts?.length) {
      toast({ title: "E-mail não encontrado", description: "Você não está cadastrado nesta sala.", variant: "destructive" });
      return;
    }
    const me = parts[0];
    setParticipant(me);
    sessionStorage.setItem("soap_pin", usedPin);
    sessionStorage.setItem("soap_email", usedEmail);

    // Find partner (skip for solo students)
    const isSolo = me.pair_position === "S";
    if (me.pair_index >= 0 && !isSolo) {
      const { data: partners } = await supabase
        .from("soap_participants")
        .select("*")
        .eq("room_id", foundRoom.id)
        .eq("pair_index", me.pair_index)
        .neq("id", me.id);
      if (partners?.length) setPartner(partners[0]);
    }

    // Load anamnesis data and find patient name
    if (me.anamnesis_participant_id) {
      // Find the patient (partner in anamnesis pair)
      const { data: anamnesisMe } = await supabase
        .from("simulation_participants")
        .select("pair_index, room_id")
        .eq("id", me.anamnesis_participant_id)
        .single();
      if (anamnesisMe && anamnesisMe.pair_index >= 0) {
        const { data: anamnesisPartner } = await supabase
          .from("simulation_participants")
          .select("student_name")
          .eq("room_id", anamnesisMe.room_id)
          .eq("pair_index", anamnesisMe.pair_index)
          .neq("id", me.anamnesis_participant_id)
          .limit(1)
          .maybeSingle();
        if (anamnesisPartner) setPatientName(anamnesisPartner.student_name);
      }

      const { data: responses } = await supabase
        .from("simulation_responses")
        .select("answers_json, form_id")
        .eq("participant_id", me.anamnesis_participant_id);
      if (responses?.length) {
        const merged: Record<string, any> = {};
        const formIds = [...new Set(responses.map((r) => r.form_id))];
        responses.forEach((r) => {
          const answers = r.answers_json as Record<string, any>;
          Object.assign(merged, answers);
        });
        setAnamnesisAnswers(merged);

        // Load form field labels
        if (formIds.length > 0) {
          const { data: simForms } = await supabase
            .from("simulation_forms")
            .select("content_json")
            .in("id", formIds);
          if (simForms?.length) {
            const labels: Record<string, string> = {};
            simForms.forEach((f) => {
              const fields = f.content_json as any[];
              if (Array.isArray(fields)) {
                fields.forEach((field: any) => {
                  if (field.id && field.label) {
                    labels[field.id] = field.label;
                  }
                });
              }
            });
            setAnamnesisFieldLabels(labels);
          }
        }
      }
    }

    // Load SOAP and peer forms
    const { data: formsList } = await supabase
      .from("soap_forms")
      .select("*")
      .eq("room_id", foundRoom.id);
    if (formsList) {
      setSoapForm(formsList.find((f: any) => f.form_type === "soap") || null);
      setPeerForm(formsList.find((f: any) => f.form_type === "peer_evaluation") || null);
    }

    // Check if already submitted SOAP
    const { data: existingSoap } = await supabase
      .from("soap_responses")
      .select("id")
      .eq("participant_id", me.id)
      .eq("room_id", foundRoom.id)
      .is("target_participant_id", null);
    if (existingSoap?.length) {
      setSubmittedSoap(true);
      // Solo students skip peer evaluation
      if (isSolo) {
        setPhase("done");
      } else {
        await checkPartnerAndPeerStatus(foundRoom.id, me);
      }
    } else {
      setPhase("soap");
    }
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

  const checkPartnerAndPeerStatus = async (roomId: string, me: any) => {
    // Check if partner submitted SOAP
    if (partner || me.pair_index >= 0) {
      const { data: partners } = await supabase
        .from("soap_participants")
        .select("*")
        .eq("room_id", roomId)
        .eq("pair_index", me.pair_index)
        .neq("id", me.id);
      const pt = partners?.[0];
      if (pt) {
        setPartner(pt);
        const { data: partnerSoap } = await supabase
          .from("soap_responses")
          .select("answers_json")
          .eq("participant_id", pt.id)
          .eq("room_id", roomId)
          .is("target_participant_id", null);
        if (partnerSoap?.length) {
          setPartnerSoapAnswers(partnerSoap[0].answers_json as Record<string, any>);
          // Check if I already evaluated
          const { data: existingPeer } = await supabase
            .from("soap_responses")
            .select("id")
            .eq("participant_id", me.id)
            .eq("target_participant_id", pt.id)
            .eq("room_id", roomId);
          if (existingPeer?.length) {
            setSubmittedPeer(true);
            setPhase("done");
          } else {
            setPhase("evaluate");
          }
        } else {
          setPhase("waiting_peer");
        }
      } else {
        setPhase("waiting_peer");
      }
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
    if (!soapForm || !participant || !room) return;
    const { error } = await supabase.from("soap_responses").insert({
      room_id: room.id,
      participant_id: participant.id,
      form_id: soapForm.id,
      answers_json: soapAnswers,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await supabase.from("soap_participants").update({ status: "submitted" }).eq("id", participant.id);
    setSubmittedSoap(true);
    toast({ title: "SOAP enviado!" });
    // Solo students skip peer evaluation — trigger AI peer grading instead
    if (participant.pair_position === "S") {
      await supabase.from("soap_participants").update({ status: "done" }).eq("id", participant.id);
      setPhase("done");
      // Fire-and-forget AI grading for solo student
      triggerAIPeerGrading(room, participant, soapForm, soapAnswers).catch(console.error);
    } else {
      await checkPartnerAndPeerStatus(room.id, participant);
    }
  };

  const submitPeerEval = async () => {
    if (!peerForm || !participant || !partner || !room) return;
    const { error } = await supabase.from("soap_responses").insert({
      room_id: room.id,
      participant_id: participant.id,
      target_participant_id: partner.id,
      form_id: peerForm.id,
      answers_json: peerAnswers,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setSubmittedPeer(true);
    setPhase("done");
    toast({ title: "Avaliação enviada!" });
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
  if (phase === "soap") {
    const soapFields: FormField[] = soapForm?.content_json || [];
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Formulário SOAP</h1>
            <p className="text-muted-foreground">Preencha com base nas informações da sua anamnese</p>
            {patientName && (
              <p className="text-sm mt-1">Paciente simulado atendido: <strong>{patientName}</strong></p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Anamnesis (read-only) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4" />Suas Respostas de Anamnese</CardTitle>
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
                <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />{soapForm?.title || "SOAP"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderFormFields(soapFields, soapAnswers, setSoapAnswers)}
                <Button onClick={submitSoap} className="w-full"><Send className="h-4 w-4 mr-2" />Enviar SOAP</Button>
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
            <h2 className="text-xl font-bold mb-2">Aguardando seu par</h2>
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
            <h1 className="text-2xl font-bold">Avaliação entre Pares</h1>
            <p className="text-muted-foreground">Avalie o SOAP do seu colega: <strong>{partner?.student_name}</strong></p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Partner's SOAP (read-only) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4" />SOAP de {partner?.student_name}</CardTitle>
              </CardHeader>
              <CardContent>
                {renderFormFields(soapFields, partnerSoapAnswers, () => {}, true)}
              </CardContent>
            </Card>

            {/* Peer evaluation form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />{peerForm?.title || "Avaliação"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderFormFields(peerFields, peerAnswers, setPeerAnswers)}
                <Button onClick={submitPeerEval} className="w-full"><Send className="h-4 w-4 mr-2" />Enviar Avaliação</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Done
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="py-12">
          <CheckCircle className="h-12 w-12 mx-auto text-primary mb-4" />
          <h2 className="text-xl font-bold mb-2">Módulo SOAP Concluído!</h2>
          <p className="text-muted-foreground">Você enviou seu formulário SOAP e a avaliação do colega. Obrigado!</p>
        </CardContent>
      </Card>
    </div>
  );
}
