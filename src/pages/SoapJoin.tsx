import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { FileText, Send, Eye, CheckCircle } from "lucide-react";

type FormField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "radio" | "checkbox" | "scale";
  options?: string[];
  max_score?: number;
  required?: boolean;
};

type Phase = "login" | "soap" | "waiting_peer" | "evaluate" | "done";

export default function SoapJoin() {
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("login");
  const [room, setRoom] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [anamnesisAnswers, setAnamnesisAnswers] = useState<Record<string, any>>({});
  const [soapForm, setSoapForm] = useState<any>(null);
  const [peerForm, setPeerForm] = useState<any>(null);
  const [soapAnswers, setSoapAnswers] = useState<Record<string, any>>({});
  const [peerAnswers, setPeerAnswers] = useState<Record<string, any>>({});
  const [partnerSoapAnswers, setPartnerSoapAnswers] = useState<Record<string, any>>({});
  const [submittedSoap, setSubmittedSoap] = useState(false);
  const [submittedPeer, setSubmittedPeer] = useState(false);

  const handleLogin = async () => {
    if (!pin.trim() || !email.trim()) return;
    // Find room by access code
    const { data: rooms, error: roomErr } = await supabase
      .from("soap_rooms")
      .select("*")
      .eq("access_code", pin.trim().toLowerCase())
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
      .eq("student_email", email.trim().toLowerCase());
    if (!parts?.length) {
      toast({ title: "E-mail não encontrado", description: "Você não está cadastrado nesta sala.", variant: "destructive" });
      return;
    }
    const me = parts[0];
    setParticipant(me);

    // Find partner
    if (me.pair_index >= 0) {
      const { data: partners } = await supabase
        .from("soap_participants")
        .select("*")
        .eq("room_id", foundRoom.id)
        .eq("pair_index", me.pair_index)
        .neq("id", me.id);
      if (partners?.length) setPartner(partners[0]);
    }

    // Load anamnesis data
    if (me.anamnesis_participant_id) {
      const { data: responses } = await supabase
        .from("simulation_responses")
        .select("answers_json, form_id")
        .eq("participant_id", me.anamnesis_participant_id);
      if (responses?.length) {
        // Merge all anamnesis answers
        const merged: Record<string, any> = {};
        responses.forEach((r) => {
          const answers = r.answers_json as Record<string, any>;
          Object.assign(merged, answers);
        });
        setAnamnesisAnswers(merged);
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
      // Check partner submission
      await checkPartnerAndPeerStatus(foundRoom.id, me);
    } else {
      setPhase("soap");
    }
  };

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
      checkPartnerAndPeerStatus(room.id, participant);
    }
  }, [submittedSoap]);

  // Realtime polling for partner status
  useEffect(() => {
    if (phase !== "waiting_peer" || !room || !participant) return;
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
    await checkPartnerAndPeerStatus(room.id, participant);
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
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <Label className="font-medium">{field.label}</Label>
          {field.type === "text" && (
            <Input
              value={answers[field.id] || ""}
              onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
              disabled={readOnly}
            />
          )}
          {field.type === "textarea" && (
            <Textarea
              value={answers[field.id] || ""}
              onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
              disabled={readOnly}
              rows={4}
            />
          )}
          {field.type === "radio" && field.options && (
            <RadioGroup
              value={answers[field.id] || ""}
              onValueChange={(v) => setAnswers({ ...answers, [field.id]: v })}
              disabled={readOnly}
            >
              {field.options.map((opt) => (
                <div key={opt} className="flex items-center gap-2">
                  <RadioGroupItem value={opt} id={`${field.id}-${opt}`} />
                  <Label htmlFor={`${field.id}-${opt}`}>{opt}</Label>
                </div>
              ))}
            </RadioGroup>
          )}
          {field.type === "checkbox" && field.options && (
            <div className="space-y-2">
              {field.options.map((opt) => (
                <div key={opt} className="flex items-center gap-2">
                  <Checkbox
                    checked={(answers[field.id] || []).includes(opt)}
                    onCheckedChange={(checked) => {
                      const current = answers[field.id] || [];
                      setAnswers({
                        ...answers,
                        [field.id]: checked ? [...current, opt] : current.filter((v: string) => v !== opt),
                      });
                    }}
                    disabled={readOnly}
                  />
                  <Label>{opt}</Label>
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
                disabled={readOnly}
                className="flex-1"
              />
              <span className="text-sm font-medium min-w-[3ch] text-right">{answers[field.id] || 0}/{field.max_score || 10}</span>
            </div>
          )}
        </div>
      ))}
    </div>
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
                    {Object.entries(anamnesisAnswers).map(([key, value]) => (
                      <div key={key} className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">{key}</p>
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
