import { useState } from "react";
import SystemPromptViewer from "@/components/SystemPromptViewer";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Settings, Play, Trash2, GraduationCap, FileText, Copy, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { derivarReferencia } from "@/lib/doc-v2";
import ShareRoomDialog from "@/components/ShareRoomDialog";
import EditableRoomTitle from "@/components/EditableRoomTitle";
import SimulationRoomCard from "@/components/SimulationRoomCard";
import { StatusBadge } from "@/components/ui/status-badge";
import { FileText as RoomIcon } from "lucide-react";

export default function DocumentationRooms() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reconRoomId, setReconRoomId] = useState<string>("");
  const [versao, setVersao] = useState<"1" | "2">("1");

  const { data: rooms, isLoading } = useQuery({
    queryKey: ["documentation-rooms"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data, error } = await supabase
        .from("documentation_rooms")
        .select("*")
        .eq("user_id", session.user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: reconRooms } = useQuery({
    queryKey: ["reconciliation-rooms-for-documentation"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data } = await supabase
        .from("reconciliation_rooms")
        .select("id, title, access_code, schema_version")
        .eq("user_id", session.user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: participantCounts } = useQuery({
    queryKey: ["documentation-participant-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("documentation_participants").select("room_id, participant_role");
      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        if (p.participant_role === "student") {
          counts[p.room_id] = (counts[p.room_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", session.user.id).maybeSingle();
      return data;
    },
  });

  /**
   * Documentação v2: traz da Reconciliação v2 só as duplas completas (individuais também), os casos com dossiê v2 e,
   * para cada caso, a conciliação de referência derivada (rascunho que o professor revisa na tela da sala).
   */
  async function importarDaReconV2(docRoomId: string, reconRoomId: string) {
    const { data: partes } = await supabase.from("reconciliation_participants").select("*").eq("room_id", reconRoomId).eq("participant_role", "student");
    const porDupla = new Map<number, any[]>();
    for (const p of partes || []) if (p.pair_index >= 0) porDupla.set(p.pair_index, [...(porDupla.get(p.pair_index) || []), p]);
    const completas = [...porDupla.values()].filter((g) => g.length === 2 || (g.length === 1 && g[0].pair_position === "S")).flat();
    if (completas.length) {
      const { error } = await supabase.from("documentation_participants").insert(completas.map((rp: any) => ({
        room_id: docRoomId, student_name: rp.student_name, student_email: rp.student_email, pair_index: rp.pair_index,
        pair_position: rp.pair_position, reconciliation_participant_id: rp.id, participant_role: "student",
      })));
      if (error) throw error;
    }

    const { data: casos } = await supabase.from("reconciliation_clinical_cases").select("*").eq("room_id", reconRoomId).order("position", { ascending: true });
    const v2 = (casos || []).filter((c: any) => c.caso_json);
    if (!v2.length) return;
    const { data: novos, error } = await supabase.from("documentation_clinical_cases").insert(v2.map((rc: any, i: number) => ({
      room_id: docRoomId, reconciliation_case_id: rc.id, title: rc.title, content: "", position: i, caso_json: rc.caso_json,
    })) as any).select("id, reconciliation_case_id");
    if (error) throw error;
    const { data: privados } = await supabase.from("reconciliation_v2_privado" as any).select("case_id, prescricao, gabarito").eq("room_id", reconRoomId);
    const porCaso = new Map<string, any>(((privados as any[]) || []).map((p) => [p.case_id, p]));
    const linhas = (novos || []).map((n: any) => {
      const pv = porCaso.get(n.reconciliation_case_id);
      const referencia = pv ? derivarReferencia(Array.isArray(pv.prescricao) ? pv.prescricao : [], Array.isArray(pv.gabarito?.discrepancias) ? pv.gabarito.discrepancias : []) : [];
      return { case_id: n.id, room_id: docRoomId, referencia, gabarito: { discrepancias: pv?.gabarito?.discrepancias || [] } };
    });
    if (linhas.length) {
      const { error: e2 } = await supabase.from("documentation_v2_privado" as any).insert(linhas as any);
      if (e2) throw e2;
    }
  }

  const createRoom = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const selectedReconId = reconRoomId && reconRoomId !== "none" ? reconRoomId : null;
      const ehV2 = versao === "2";
      if (ehV2) {
        const origem = (reconRooms || []).find((r: any) => r.id === selectedReconId) as any;
        if (!origem || origem.schema_version !== 2) throw new Error("A Documentação v2 parte de uma sala de Reconciliação v2. Escolha uma.");
      }

      const { data, error } = await supabase
        .from("documentation_rooms")
        .insert({
          user_id: session.user.id,
          title,
          description,
          reconciliation_room_id: selectedReconId,
          // Só a v2 grava a versão: criar sala v1 não depende da coluna nova existir no banco.
          ...(ehV2 ? { schema_version: 2 } : {}),
        } as any)
        .select()
        .single();
      if (error) throw error;

      if (ehV2 && selectedReconId) {
        await importarDaReconV2(data.id, selectedReconId);
        return data;
      }

      // Auto-import participants and clinical cases from reconciliation
      if (selectedReconId) {
        const { data: reconParticipants } = await supabase
          .from("reconciliation_participants")
          .select("*")
          .eq("room_id", selectedReconId)
          .eq("participant_role", "student");

        if (reconParticipants?.length) {
          await supabase.from("documentation_participants").insert(
            reconParticipants.map(rp => ({
              room_id: data.id,
              student_name: rp.student_name,
              student_email: rp.student_email,
              pair_index: rp.pair_index,
              pair_position: rp.pair_position,
              reconciliation_participant_id: rp.id,
              participant_role: "student",
            }))
          );
        }

        const { data: reconCases } = await supabase
          .from("reconciliation_clinical_cases")
          .select("*")
          .eq("room_id", selectedReconId)
          .order("position", { ascending: true });

        if (reconCases?.length) {
          await supabase.from("documentation_clinical_cases").insert(
            reconCases.map(rc => ({
              room_id: data.id,
              reconciliation_case_id: rc.id,
              title: rc.title,
              content: rc.content,
              position: rc.position,
            }))
          );
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["documentation-rooms"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setReconRoomId("");
      navigate(versao === "2" ? `/simulations/documentation/v2/${data.id}` : `/simulations/documentation/editor/${data.id}`);
    },
    onError: (e: any) => {
      toast({ title: "Erro", description: e?.message?.startsWith("A Documentação v2") ? e.message : "Erro ao criar sala de documentação.", variant: "destructive" });
    },
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documentation_rooms").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documentation-rooms"] }),
  });

  const duplicateRoom = useMutation({
    mutationFn: async (roomId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const original = rooms?.find(r => r.id === roomId);
      if (!original) throw new Error("Room not found");
      const { data: newRoom, error } = await supabase.from("documentation_rooms").insert({
        user_id: session.user.id,
        title: `${original.title} (cópia)`,
        description: original.description,
        reconciliation_room_id: original.reconciliation_room_id,
      }).select().single();
      if (error) throw error;

      // Duplicate cases first to build old→new ID map
      const { data: cases } = await supabase.from("documentation_clinical_cases").select("*").eq("room_id", roomId);
      const caseIdMap: Record<string, string> = {};
      if (cases?.length) {
        const { data: newCases } = await supabase.from("documentation_clinical_cases")
          .insert(cases.map(c => ({ room_id: newRoom.id, reconciliation_case_id: c.reconciliation_case_id, title: c.title, content: c.content, position: c.position })))
          .select("id");
        if (newCases) {
          cases.forEach((oldCase, i) => { caseIdMap[oldCase.id] = newCases[i].id; });
        }
      }

      // Duplicate forms, remapping case IDs in answer_key content
      const { data: forms } = await supabase.from("documentation_forms").select("*").eq("room_id", roomId);
      if (forms?.length) {
        await supabase.from("documentation_forms").insert(forms.map(f => {
          let contentJson = f.content_json;
          if ((f.form_type === "answer_key" || f.form_type === "referral_answer_key" || f.form_type === "medication_answer_key") && contentJson && typeof contentJson === "object" && !Array.isArray(contentJson) && (contentJson as any).case_answers) {
            const oldAnswers = (contentJson as any).case_answers as Record<string, any>;
            const newAnswers: Record<string, any> = {};
            for (const [oldId, fields] of Object.entries(oldAnswers)) {
              const newId = caseIdMap[oldId] || oldId;
              newAnswers[newId] = fields;
            }
            contentJson = { case_answers: newAnswers };
          }
          return { room_id: newRoom.id, title: f.title, form_type: f.form_type, content_json: contentJson };
        }));
      }

      const { data: participants } = await supabase.from("documentation_participants").select("*").eq("room_id", roomId);
      if (participants?.length) {
        await supabase.from("documentation_participants").insert(participants.map(p => ({ room_id: newRoom.id, student_name: p.student_name, student_email: p.student_email, pair_index: p.pair_index, pair_position: p.pair_position, participant_role: p.participant_role })));
      }
      return newRoom;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["documentation-rooms"] });
      toast({ title: "Sala duplicada", description: "A sala de documentação foi duplicada com sucesso." });
      navigate(`/simulations/documentation/editor/${data.id}`);
    },
    onError: () => toast({ title: "Erro", description: "Erro ao duplicar sala.", variant: "destructive" }),
  });

  const [shareRoomId, setShareRoomId] = useState<string | null>(null);
  const [shareRoomTitle, setShareRoomTitle] = useState("");

  const statusColor: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    finished: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  };

  const teacherName = profile?.full_name || "Professor";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="eyebrow mb-2.5">Praticar · Simulação</div>
          <h1 className="font-heading text-[2rem] font-medium leading-[1.1] text-foreground">Módulo Documentação</h1>
          <p className="mt-2 text-sm text-muted-foreground">Encaminhamento e quadro resumo de medicamentos vinculados à Reconciliação</p>
        </div>
        <div className="flex items-center gap-2">
          <SystemPromptViewer toolKey="documentation" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nova Sala</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading text-xl font-medium">Criar Sala de Documentação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome da Sala</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Documentação Turma A" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div>
                <Label>Versão</Label>
                <Select value={versao} onValueChange={(v) => setVersao(v as "1" | "2")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">v1 (encaminhamento e quadro resumo)</SelectItem>
                    <SelectItem value="2">v2 (4 documentos, parte da Reconciliação v2)</SelectItem>
                  </SelectContent>
                </Select>
                {versao === "2" && <p className="mt-1 text-xs text-muted-foreground">Escolha abaixo uma sala de Reconciliação v2: os casos e as duplas completas vêm dela.</p>}
              </div>
              <div>
                <Label>Sala de Reconciliação de origem{versao === "2" ? "" : " (opcional)"}</Label>
                <Select value={reconRoomId} onValueChange={setReconRoomId}>
                  <SelectTrigger><SelectValue placeholder="Vincular a uma sala de Reconciliação" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma (modo independente)</SelectItem>
                    {reconRooms?.filter((r: any) => versao === "1" || r.schema_version === 2).map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.title} (PIN: {r.access_code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(!reconRoomId || reconRoomId === "none") && (
                  <p className="text-xs text-warning-ink mt-1">
                    ⚠️ Modo independente: use quando a reconciliação foi realizada offline. Os participantes e casos clínicos deverão ser configurados manualmente.
                  </p>
                )}
              </div>
              <Button onClick={() => createRoom.mutate()} disabled={!title || createRoom.isPending || (versao === "2" && (!reconRoomId || reconRoomId === "none"))} className="w-full">
                Criar
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : !(rooms || []).filter((r: any) => !r.is_archived).length ? (
        <Card className="flex flex-col items-center justify-center py-14 text-center">
          <RoomIcon className="mb-4 h-10 w-10 text-muted-foreground/40" />
          <h3 className="font-heading text-lg font-medium">Nenhuma sala de Documentação</h3>
          <p className="mt-1 text-sm text-muted-foreground">Crie uma sala para iniciar este módulo. Salas arquivadas ficam em Simulação, aba Inativas.</p>
        </Card>
      ) : (
        <Card className="divide-y overflow-hidden">
          {(rooms || []).filter((r: any) => !r.is_archived).map((room) => {
            const studentCount = participantCounts?.[room.id] || 0;
            return (
              <SimulationRoomCard
                key={room.id}
                icon={RoomIcon}
                title={<EditableRoomTitle roomId={room.id} title={room.title} tableName="documentation_rooms" invalidateKeys={["documentation-rooms"]} />}
                description={room.description}
                status={room.status}
                meta={
                  <>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{studentCount} {studentCount === 1 ? "aluno" : "alunos"}</span>
                    <span>PIN <b className="font-mono font-medium text-foreground">{room.access_code}</b></span>
                    <span>{teacherName}</span>
                  </>
                }
                onEdit={() => navigate((room as any).schema_version === 2 ? `/simulations/documentation/v2/${room.id}` : `/simulations/documentation/editor/${room.id}`)}
                onActivate={async () => {
                  await supabase.from("documentation_rooms").update({ status: "active" }).eq("id", room.id);
                  queryClient.invalidateQueries({ queryKey: ["documentation-rooms"] });
                  toast({ title: "Sala ativada!" });
                }}
                onControl={() => navigate((room as any).schema_version === 2 ? `/simulations/documentation/v2/${room.id}` : `/simulations/documentation/control/${room.id}`)}
                onDuplicate={() => ((room as any).schema_version === 2
                  ? toast({ title: "Ainda não disponível", description: "Duplicar sala v2 vem em uma próxima etapa. Crie uma nova a partir da Reconciliação." })
                  : duplicateRoom.mutate(room.id))}
                onShare={() => { setShareRoomId(room.id); setShareRoomTitle(room.title); }}
                onArchive={async () => {
                  await supabase.from("documentation_rooms").update({ is_archived: true } as any).eq("id", room.id);
                  queryClient.invalidateQueries({ queryKey: ["documentation-rooms"] });
                  toast({ title: "Sala arquivada" });
                }}
                onDelete={() => deleteRoom.mutate(room.id)}
              />
            );
          })}
        </Card>
      )}

      {shareRoomId && (
        <ShareRoomDialog open={!!shareRoomId} onOpenChange={(o) => { if (!o) setShareRoomId(null); }} roomId={shareRoomId} roomTitle={shareRoomTitle} moduleType="documentation" />
      )}
    </div>
  );
}
