import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { FileText, Send, CheckCircle, BookOpen, Users, Table2, Plus, Trash2 } from "lucide-react";
import FormRenderer from "@/components/forms/FormRenderer";
import type { FormField } from "@/components/forms/types";
import { useFormDraft } from "@/hooks/use-form-draft";
import DraftStatusBadge from "@/components/forms/DraftStatusBadge";


// FormField type imported from @/components/forms/types
type MedColumn = { id: string; label: string };
type MedFormContent = { columns: MedColumn[]; rows_score: number };
type Phase = "login" | "active" | "done";

export default function DocumentationJoin() {
  const [countdown, setCountdown] = useState(15);
  const [pin, setPin] = useState(() => sessionStorage.getItem("doc_pin") || "");
  const [email, setEmail] = useState(() => sessionStorage.getItem("doc_email") || "");
  const [phase, setPhase] = useState<Phase>("login");
  const [room, setRoom] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [clinicalCase, setClinicalCase] = useState<any>(null);
  const [referralForm, setReferralForm] = useState<any>(null);
  const [medForm, setMedForm] = useState<any>(null);
  const [referralAnswers, setReferralAnswers] = useState<Record<string, any>>({});
  const [medRows, setMedRows] = useState<Record<string, string>[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const handleLogin = async () => {
    if (!pin.trim() || !email.trim()) return;

    const { data: rooms } = await supabase.from("documentation_rooms").select("*").eq("access_code", pin.trim().toLowerCase()).eq("status", "active");
    if (!rooms?.length) {
      toast({ title: "Sala não encontrada", description: "Verifique o PIN ou aguarde a ativação.", variant: "destructive" });
      return;
    }
    const foundRoom = rooms[0];
    setRoom(foundRoom);

    const { data: parts } = await supabase.from("documentation_participants").select("*").eq("room_id", foundRoom.id).eq("student_email", email.trim().toLowerCase());
    if (!parts?.length) {
      toast({ title: "E-mail não encontrado", variant: "destructive" });
      return;
    }
    const me = parts[0];
    setParticipant(me);

    await supabase.from("documentation_participants").update({ status: "ready" }).eq("id", me.id);

    if (me.pair_index >= 0 && me.pair_position !== "S") {
      const { data: partners } = await supabase.from("documentation_participants").select("*").eq("room_id", foundRoom.id).eq("pair_index", me.pair_index).neq("id", me.id);
      if (partners?.length) setPartner(partners[0]);
    }

    // Load forms
    const { data: allForms } = await supabase.from("documentation_forms").select("*").eq("room_id", foundRoom.id);
    const rf = allForms?.find((f: any) => f.form_type === "referral");
    const mf = allForms?.find((f: any) => f.form_type === "medication_summary");
    if (rf) setReferralForm(rf);
    if (mf) setMedForm(mf);

    // Load clinical case
    const { data: cases } = await supabase.from("documentation_clinical_cases").select("*").eq("room_id", foundRoom.id).order("position", { ascending: true });
    if (cases?.length && me.pair_index >= 0) setClinicalCase(cases[me.pair_index % cases.length]);

    // Check existing submissions
    const { data: existingResp } = await supabase.from("documentation_responses").select("*").eq("room_id", foundRoom.id).eq("pair_index", me.pair_index);
    if (existingResp?.some((r: any) => r.submitted_at)) {
      setSubmitted(true);
      setPhase("done");
    } else {
      setPhase("active");
    }

    sessionStorage.setItem("doc_pin", pin.trim().toLowerCase());
    sessionStorage.setItem("doc_email", email.trim().toLowerCase());
  };

  // Autosave: one combined draft per (room, participant) covering both forms
  const draftKey =
    room && participant
      ? `documentation:${room.id}:${participant.id}`
      : null;
  const {
    draft,
    loaded: draftLoaded,
    status: draftStatus,
    lastSavedAt,
    saveDraft,
    clearDraft,
  } = useFormDraft({ draftKey, module: "documentation", enabled: !submitted });

  const draftRestoredRef = useRef(false);
  useEffect(() => {
    if (!draftLoaded || submitted || draftRestoredRef.current) return;
    if (draft) {
      const r = (draft as any).referralAnswers;
      const m = (draft as any).medRows;
      if (r && typeof r === "object") setReferralAnswers(r);
      if (Array.isArray(m)) setMedRows(m);
      if ((r && Object.keys(r).length) || (Array.isArray(m) && m.length)) {
        toast({ title: "Rascunho recuperado", description: "Suas respostas anteriores foram restauradas." });
      }
    }
    draftRestoredRef.current = true;
  }, [draft, draftLoaded, submitted]);

  useEffect(() => {
    if (!draftKey || submitted || !draftLoaded) return;
    saveDraft({ referralAnswers, medRows });
  }, [referralAnswers, medRows, draftKey, draftLoaded, submitted, saveDraft]);

  const handleSubmit = async () => {
    if (!room || !participant) return;

    // Submit referral response
    if (referralForm) {
      await supabase.from("documentation_responses").insert({
        room_id: room.id,
        pair_index: participant.pair_index,
        form_id: referralForm.id,
        clinical_case_id: clinicalCase?.id || null,
        answers_json: referralAnswers as any,
        submitted_at: new Date().toISOString(),
      });
    }

    // Submit medication summary response
    if (medForm) {
      await supabase.from("documentation_responses").insert({
        room_id: room.id,
        pair_index: participant.pair_index,
        form_id: medForm.id,
        clinical_case_id: clinicalCase?.id || null,
        answers_json: { rows: medRows } as any,
        submitted_at: new Date().toISOString(),
      });
    }

    await supabase.from("documentation_participants").update({ status: "done" }).eq("room_id", room.id).eq("pair_index", participant.pair_index);

    await clearDraft();
    setSubmitted(true);
    setPhase("done");
    toast({ title: "Enviado!", description: "Documentação enviada com sucesso." });
  };


  const referralFields: FormField[] = referralForm ? (Array.isArray(referralForm.content_json) ? referralForm.content_json : []) : [];
  const medContent: MedFormContent | null = medForm ? (medForm.content_json as MedFormContent) : null;

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

  const addMedRow = () => {
    const row: Record<string, string> = {};
    medContent?.columns.forEach(c => { row[c.id] = ""; });
    setMedRows([...medRows, row]);
  };

  if (phase === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Documentação</CardTitle>
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
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Documentação Enviada!</h2>
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
            <CardTitle className="text-lg">Documentação — {room?.title}</CardTitle>
            <div className="flex gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{participant?.pair_position === "S" ? "Individual" : `Dupla ${(participant?.pair_index || 0) + 1}`}</span>
              {partner && <span>· Parceiro(a): {partner.student_name}</span>}
            </div>
          </CardHeader>
        </Card>

        {clinicalCase && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" />{clinicalCase.title}</CardTitle></CardHeader>
            <CardContent><p className="text-sm whitespace-pre-wrap">{clinicalCase.content}</p></CardContent>
          </Card>
        )}

        {/* Referral form */}
        {referralForm && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />{referralForm.title}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <FormRenderer
                fields={referralFields}
                answers={referralAnswers}
                onChange={setReferralAnswers}
                showScores={true}
              />
            </CardContent>
          </Card>
        )}

        {/* Medication summary table */}
        {medContent && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Table2 className="h-4 w-4" />{medForm.title}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Pontuação por linha: {medContent.rows_score} pts</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead>
                    <tr>
                      {medContent.columns.map(c => <th key={c.id} className="border p-2 text-left bg-muted">{c.label}</th>)}
                      <th className="border p-2 w-12 bg-muted"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {medRows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {medContent.columns.map(c => (
                          <td key={c.id} className="border p-1">
                            <Input value={row[c.id] || ""} onChange={e => {
                              const updated = [...medRows];
                              updated[rIdx] = { ...updated[rIdx], [c.id]: e.target.value };
                              setMedRows(updated);
                            }} className="h-8" />
                          </td>
                        ))}
                        <td className="border p-1">
                          <Button variant="ghost" size="sm" onClick={() => setMedRows(medRows.filter((_, i) => i !== rIdx))}><Trash2 className="h-3 w-3" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button variant="outline" size="sm" onClick={addMedRow}><Plus className="h-3.5 w-3.5 mr-1" />Adicionar Linha</Button>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <DraftStatusBadge status={draftStatus} lastSavedAt={lastSavedAt} />
        </div>
        <Button className="w-full" onClick={handleSubmit} disabled={submitted}>
          <Send className="h-4 w-4 mr-2" />Enviar Documentação
        </Button>
      </div>
    </div>
  );
}
