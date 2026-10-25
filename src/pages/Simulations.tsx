import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SystemPromptViewer from "@/components/SystemPromptViewer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsListLine, TabsTriggerLine } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Users, ArrowLeft, ArrowRight, HeartPulse, ClipboardList, Stethoscope, Handshake, FileText, BarChart3, Heart, Activity, Dumbbell, Microscope, type LucideIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import SplitRoomDialog from "@/components/SplitRoomDialog";
import GenericSplitRoomDialog from "@/components/GenericSplitRoomDialog";
import ShareRoomDialog from "@/components/ShareRoomDialog";
import EditableRoomTitle from "@/components/EditableRoomTitle";
import SimulationRoomCard from "@/components/SimulationRoomCard";

type ModuleId = "anamnesis" | "soap" | "reconciliation" | "documentation";

const pharmacySteps: { id: ModuleId; title: string; description: string; icon: LucideIcon }[] = [
  { id: "anamnesis", title: "Anamnese", description: "Coleta de história clínica com papéis de profissional, paciente, observador e professor.", icon: Stethoscope },
  { id: "soap", title: "SOAP", description: "Transcrição estruturada da anamnese no formato SOAP, com avaliação entre pares.", icon: ClipboardList },
  { id: "reconciliation", title: "Reconciliação", description: "Reconciliação em duplas com casos clínicos, ficha e correção por IA.", icon: Handshake },
  { id: "documentation", title: "Documentação", description: "Encaminhamento e quadro resumo de medicamentos, com correção por IA e manual.", icon: FileText },
];

const otherAreas: { id: string; title: string; description: string; icon: LucideIcon; route: string }[] = [
  { id: "nursing", title: "Enfermagem Clínica", description: "Acolhimento, SAE, Evolução e Passagem de Plantão.", icon: Heart, route: "/nursing" },
  { id: "nutrition", title: "Nutrição Clínica", description: "Anamnese Nutricional, Avaliação Antropométrica, Plano Alimentar e Orientação.", icon: HeartPulse, route: "/nutrition" },
  { id: "dentistry", title: "Odontologia Clínica", description: "Anamnese Odontológica, Exame Clínico, Plano de Tratamento e Orientação.", icon: Stethoscope, route: "/dentistry" },
  { id: "medicine", title: "Medicina", description: "Anamnese Médica, Exame Físico, Raciocínio Clínico e Plano Terapêutico.", icon: Activity, route: "/medicine" },
  { id: "physiotherapy", title: "Fisioterapia", description: "Avaliação Funcional, Diagnóstico Cinético-Funcional, Plano e Evolução.", icon: Dumbbell, route: "/physiotherapy" },
  { id: "biomedicine", title: "Biomedicina", description: "Análise Laboratorial, Controle de Qualidade, Interpretação e Laudo Técnico.", icon: Microscope, route: "/biomedicine" },
];

export default function Simulations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(10);
  const [splitRoomId, setSplitRoomId] = useState<string | null>(null);
  const [splitSoapRoomId, setSplitSoapRoomId] = useState<string | null>(null);
  const [splitReconciliationRoomId, setSplitReconciliationRoomId] = useState<string | null>(null);
  const [splitDocumentationRoomId, setSplitDocumentationRoomId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("areas");
  const [shareRoomId, setShareRoomId] = useState<string | null>(null);
  const [shareRoomTitle, setShareRoomTitle] = useState("");
  const [shareModuleType, setShareModuleType] = useState("");
  const [archiveFilter, setArchiveFilter] = useState<"active" | "archived">("active");

  const archiveMutation = useMutation({
    mutationFn: async ({ table, id, archived }: { table: "simulation_rooms" | "soap_rooms" | "reconciliation_rooms" | "documentation_rooms"; id: string; archived: boolean }) => {
      const { error } = await supabase.from(table).update({ is_archived: archived } as any).eq("id", id);
      if (error) throw error;
      return { table, archived };
    },
    onSuccess: ({ table, archived }) => {
      const key = table === "simulation_rooms" ? "simulation-rooms"
        : table === "soap_rooms" ? "soap-rooms-list"
        : table === "reconciliation_rooms" ? "reconciliation-rooms-list"
        : "documentation-rooms-list";
      queryClient.invalidateQueries({ queryKey: [key] });
      toast({ title: archived ? "Sala arquivada" : "Sala reativada" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível atualizar a sala.", variant: "destructive" }),
  });

  const { data: rooms, isLoading } = useQuery({
    queryKey: ["simulation-rooms"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data, error } = await supabase
        .from("simulation_rooms")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: soapRooms, isLoading: soapLoading } = useQuery({
    queryKey: ["soap-rooms-list"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data, error } = await supabase
        .from("soap_rooms")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch SOAP forms for scoring display on cards
  const { data: soapFormsByRoom } = useQuery({
    queryKey: ["soap-forms-by-room", soapRooms?.map(r => r.id)],
    queryFn: async () => {
      if (!soapRooms?.length) return {};
      const roomIds = soapRooms.map(r => r.id);
      const { data, error } = await supabase
        .from("soap_forms")
        .select("id, room_id, form_type, content_json")
        .in("room_id", roomIds);
      if (error) return {};
      const map: Record<string, any[]> = {};
      (data || []).forEach(f => {
        (map[f.room_id] ||= []).push(f);
      });
      return map;
    },
    enabled: !!soapRooms?.length,
  });

  const { data: reconciliationRooms, isLoading: reconciliationLoading } = useQuery({
    queryKey: ["reconciliation-rooms-list"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data, error } = await supabase
        .from("reconciliation_rooms")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: documentationRooms, isLoading: documentationLoading } = useQuery({
    queryKey: ["documentation-rooms-list"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data, error } = await supabase
        .from("documentation_rooms")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: participantCounts } = useQuery({
    queryKey: ["simulation-participant-counts"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return {};
      const { data, error } = await supabase
        .from("simulation_participants")
        .select("room_id, participant_role");
      if (error) return {};
      const counts: Record<string, number> = {};
      (data || []).forEach((p) => {
        if (p.participant_role === "student") {
          counts[p.room_id] = (counts[p.room_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const createRoom = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("simulation_rooms")
        .insert({ user_id: session.user.id, title, description, duration_minutes: duration })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["simulation-rooms"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setDuration(10);
      navigate(`/simulations/${data.id}/edit`);
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao criar simulação.", variant: "destructive" });
    },
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("simulation_rooms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["simulation-rooms"] }),
  });

  const deleteSoapRoom = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("soap_rooms")
        .delete()
        .eq("id", id)
        .select("id");

      if (error) throw error;
      if (!data?.length) throw new Error("Sala não encontrada ou sem permissão para excluir.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["soap-rooms-list"] });
      toast({ title: "Sala SOAP excluída com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir sala SOAP", description: error.message, variant: "destructive" });
    },
  });

  const deleteReconciliationRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reconciliation_rooms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reconciliation-rooms-list"] }),
  });

  const deleteDocumentationRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documentation_rooms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documentation-rooms-list"] }),
  });

  const duplicateAnamnesisRoom = useMutation({
    mutationFn: async (roomId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const original = rooms?.find(r => r.id === roomId);
      if (!original) throw new Error("Room not found");
      const { data: newRoom, error } = await supabase.from("simulation_rooms").insert({
        user_id: session.user.id,
        title: `${original.title} (cópia)`,
        description: original.description,
        duration_minutes: original.duration_minutes,
      }).select().single();
      if (error) throw error;
      // Copy forms
      const { data: forms } = await supabase.from("simulation_forms").select("*").eq("room_id", roomId);
      if (forms?.length) {
        await supabase.from("simulation_forms").insert(forms.map(f => ({ room_id: newRoom.id, title: f.title, form_type: f.form_type, content_json: f.content_json })));
      }
      // Copy participants
      const { data: participants } = await supabase.from("simulation_participants").select("*").eq("room_id", roomId);
      if (participants?.length) {
        await supabase.from("simulation_participants").insert(participants.map(p => ({ room_id: newRoom.id, student_name: p.student_name, student_email: p.student_email, pair_index: p.pair_index, pair_position: p.pair_position, participant_role: p.participant_role, assigned_role: p.assigned_role })));
      }
      return newRoom;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["simulation-rooms"] });
      toast({ title: "Sala duplicada", description: "A sala foi duplicada com sucesso." });
      navigate(`/simulations/${data.id}/edit`);
    },
    onError: () => toast({ title: "Erro", description: "Erro ao duplicar sala.", variant: "destructive" }),
  });

  const duplicateSoapRoom = useMutation({
    mutationFn: async (roomId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const original = soapRooms?.find(r => r.id === roomId);
      if (!original) throw new Error("Room not found");
      const { data: newRoom, error } = await supabase.from("soap_rooms").insert({
        user_id: session.user.id,
        title: `${original.title} (cópia)`,
        description: original.description,
        anamnesis_room_id: original.anamnesis_room_id,
      }).select().single();
      if (error) throw error;
      const { data: forms } = await supabase.from("soap_forms").select("*").eq("room_id", roomId);
      if (forms?.length) {
        await supabase.from("soap_forms").insert(forms.map(f => ({ room_id: newRoom.id, title: f.title, form_type: f.form_type, content_json: f.content_json })));
      }
      // Copy participants
      const { data: participants } = await supabase.from("soap_participants").select("*").eq("room_id", roomId);
      if (participants?.length) {
        await supabase.from("soap_participants").insert(participants.map(p => ({ room_id: newRoom.id, student_name: p.student_name, student_email: p.student_email, pair_index: p.pair_index, pair_position: p.pair_position, participant_role: p.participant_role })));
      }
      return newRoom;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["soap-rooms-list"] });
      toast({ title: "Sala duplicada", description: "A sala SOAP foi duplicada com sucesso." });
      navigate(`/simulations/soap/editor/${data.id}`);
    },
    onError: () => toast({ title: "Erro", description: "Erro ao duplicar sala.", variant: "destructive" }),
  });

  const duplicateReconciliationRoom = useMutation({
    mutationFn: async (roomId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const original = reconciliationRooms?.find(r => r.id === roomId);
      if (!original) throw new Error("Room not found");
      const { data: newRoom, error } = await supabase.from("reconciliation_rooms").insert({
        user_id: session.user.id,
        title: `${original.title} (cópia)`,
        description: original.description,
        soap_room_id: original.soap_room_id,
      }).select().single();
      if (error) throw error;

      // Duplicate cases first to build old→new ID map
      const { data: cases } = await supabase.from("reconciliation_clinical_cases").select("*").eq("room_id", roomId);
      const caseIdMap: Record<string, string> = {};
      if (cases?.length) {
        const { data: newCases } = await supabase.from("reconciliation_clinical_cases")
          .insert(cases.map(c => ({ room_id: newRoom.id, title: c.title, content: c.content, position: c.position })))
          .select("id");
        if (newCases) {
          cases.forEach((oldCase, i) => { caseIdMap[oldCase.id] = newCases[i].id; });
        }
      }

      // Duplicate forms, remapping case IDs in answer_key content
      const { data: forms } = await supabase.from("reconciliation_forms").select("*").eq("room_id", roomId);
      if (forms?.length) {
        await supabase.from("reconciliation_forms").insert(forms.map(f => {
          let contentJson = f.content_json;
          if (f.form_type === "answer_key" && contentJson && typeof contentJson === "object" && !Array.isArray(contentJson) && (contentJson as any).case_answers) {
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

      const { data: participants } = await supabase.from("reconciliation_participants").select("*").eq("room_id", roomId);
      if (participants?.length) {
        await supabase.from("reconciliation_participants").insert(participants.map(p => ({ room_id: newRoom.id, student_name: p.student_name, student_email: p.student_email, pair_index: p.pair_index, pair_position: p.pair_position, participant_role: p.participant_role })));
      }
      return newRoom;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reconciliation-rooms-list"] });
      toast({ title: "Sala duplicada", description: "A sala de reconciliação foi duplicada com sucesso." });
      navigate(`/simulations/reconciliation/editor/${data.id}`);
    },
    onError: () => toast({ title: "Erro", description: "Erro ao duplicar sala.", variant: "destructive" }),
  });

  const duplicateDocumentationRoom = useMutation({
    mutationFn: async (roomId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const original = documentationRooms?.find(r => r.id === roomId);
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
      queryClient.invalidateQueries({ queryKey: ["documentation-rooms-list"] });
      toast({ title: "Sala duplicada", description: "A sala de documentação foi duplicada com sucesso." });
      navigate(`/simulations/documentation/editor/${data.id}`);
    },
    onError: () => toast({ title: "Erro", description: "Erro ao duplicar sala.", variant: "destructive" }),
  });

  const { data: areaCounts } = useQuery({
    queryKey: ["simulation-area-counts"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return {} as Record<string, number>;
      const entries = await Promise.all(
        otherAreas.map(async (a) => {
          const { count } = await supabase
            .from(`${a.id}_rooms` as any)
            .select("id", { count: "exact", head: true })
            .eq("user_id", session.user.id);
          return [a.id, count || 0] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<string, number>;
    },
  });

  const activateRoom = async (table: string, listKey: string, id: string) => {
    await supabase.from(table as any).update({ status: "active" }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: [listKey] });
    toast({ title: "Sala ativada!" });
  };

  const modules: Record<ModuleId, {
    label: string;
    icon: LucideIcon;
    rooms: any[];
    loading: boolean;
    table: "simulation_rooms" | "soap_rooms" | "reconciliation_rooms" | "documentation_rooms";
    listKey: string;
    editPath: (id: string) => string;
    controlPath: (id: string) => string;
    shareType: string;
    duplicate: (id: string) => void;
    remove: (id: string) => void;
    split: (id: string) => void;
    canSplit: (room: any) => boolean;
    onCreate: () => void;
    createLabel: string;
    emptyTitle: string;
  }> = {
    anamnesis: {
      label: "Anamnese", icon: Stethoscope, rooms: rooms || [], loading: isLoading, table: "simulation_rooms", listKey: "simulation-rooms",
      editPath: (id) => `/simulations/${id}/edit`, controlPath: (id) => `/simulations/${id}/control`, shareType: "simulation",
      duplicate: (id) => duplicateAnamnesisRoom.mutate(id), remove: (id) => deleteRoom.mutate(id), split: setSplitRoomId,
      canSplit: (room) => room.status === "draft" && (participantCounts?.[room.id] || 0) > 0,
      onCreate: () => setOpen(true), createLabel: "Nova sala", emptyTitle: "Nenhuma sala de Anamnese",
    },
    soap: {
      label: "SOAP", icon: ClipboardList, rooms: soapRooms || [], loading: soapLoading, table: "soap_rooms", listKey: "soap-rooms-list",
      editPath: (id) => `/simulations/soap/editor/${id}`, controlPath: (id) => `/simulations/soap/control/${id}`, shareType: "soap",
      duplicate: (id) => duplicateSoapRoom.mutate(id), remove: (id) => deleteSoapRoom.mutate(id), split: setSplitSoapRoomId,
      canSplit: (room) => room.status === "draft",
      onCreate: () => navigate("/simulations/soap"), createLabel: "Nova sala SOAP", emptyTitle: "Nenhuma sala SOAP",
    },
    reconciliation: {
      label: "Reconciliação", icon: Handshake, rooms: reconciliationRooms || [], loading: reconciliationLoading, table: "reconciliation_rooms", listKey: "reconciliation-rooms-list",
      editPath: (id) => `/simulations/reconciliation/editor/${id}`, controlPath: (id) => `/simulations/reconciliation/control/${id}`, shareType: "reconciliation",
      duplicate: (id) => duplicateReconciliationRoom.mutate(id), remove: (id) => deleteReconciliationRoom.mutate(id), split: setSplitReconciliationRoomId,
      canSplit: (room) => room.status === "draft",
      onCreate: () => navigate("/simulations/reconciliation"), createLabel: "Nova sala de Reconciliação", emptyTitle: "Nenhuma sala de Reconciliação",
    },
    documentation: {
      label: "Documentação", icon: FileText, rooms: documentationRooms || [], loading: documentationLoading, table: "documentation_rooms", listKey: "documentation-rooms-list",
      editPath: (id) => `/simulations/documentation/editor/${id}`, controlPath: (id) => `/simulations/documentation/control/${id}`, shareType: "documentation",
      duplicate: (id) => duplicateDocumentationRoom.mutate(id), remove: (id) => deleteDocumentationRoom.mutate(id), split: setSplitDocumentationRoomId,
      canSplit: (room) => room.status === "draft",
      onCreate: () => navigate("/simulations/documentation"), createLabel: "Nova sala de Documentação", emptyTitle: "Nenhuma sala de Documentação",
    },
  };

  const countOf = (id: ModuleId, archived: boolean) => modules[id].rooms.filter((r: any) => !!r.is_archived === archived).length;
  const showArchived = archiveFilter === "archived";
  const currentModule = (activeTab in modules ? modules[activeTab as ModuleId] : null);
  const inModule = !!currentModule;
  const inPharmacy = activeTab === "pharmacy" || inModule;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {inPharmacy && (
          <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setActiveTab(inModule ? "pharmacy" : "areas")}>
            <ArrowLeft className="h-4 w-4" />{inModule ? "Farmácia Clínica" : "Áreas"}
          </Button>
        )}
        <PageHeader
          eyebrow="Praticar"
          title={inModule ? currentModule!.label : inPharmacy ? "Farmácia Clínica" : "Simulação Realística"}
          description={
            inPharmacy
              ? "Simulação realística em quatro etapas encadeadas: anamnese, SOAP, reconciliação e documentação clínica."
              : "Salas de simulação por área da saúde. Na Farmácia Clínica, as etapas se encadeiam: Anamnese, SOAP, Reconciliação e Documentação."
          }
          actions={
            <>
              <SystemPromptViewer toolKey="simulations" />
              <Button variant="outline" onClick={() => navigate("/simulations/aggregator")}>
                <BarChart3 className="h-4 w-4" />Agregador de notas
              </Button>
              {inModule && (
                <Button onClick={currentModule!.onCreate}><Plus className="h-4 w-4" />{currentModule!.createLabel}</Button>
              )}
            </>
          }
        />
      </div>

      {activeTab === "areas" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="surface-hover cursor-pointer space-y-3 p-5" onClick={() => setActiveTab("pharmacy")}>
            <div className="flex items-start justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-soft text-brand-text"><HeartPulse className="h-5 w-5" /></span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="font-heading text-lg font-medium">Farmácia Clínica</h3>
            <p className="text-xs text-muted-foreground">Anamnese, SOAP, Reconciliação e Documentação farmacêutica.</p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone="ok">{pharmacySteps.reduce((s, m) => s + countOf(m.id, false), 0)} ativas</StatusBadge>
              <StatusBadge tone="neutral">{pharmacySteps.reduce((s, m) => s + countOf(m.id, true), 0)} inativas</StatusBadge>
            </div>
          </Card>
          {otherAreas.map((area) => {
            const n = areaCounts?.[area.id];
            return (
              <Card key={area.id} className="surface-hover cursor-pointer space-y-3 p-5" onClick={() => navigate(area.route)}>
                <div className="flex items-start justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-soft text-brand-text"><area.icon className="h-5 w-5" /></span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="font-heading text-lg font-medium">{area.title}</h3>
                <p className="text-xs text-muted-foreground">{area.description}</p>
                {n !== undefined && (
                  <StatusBadge tone={n > 0 ? "ok" : "neutral"}>{n === 0 ? "nenhuma sala" : `${n} ${n === 1 ? "sala" : "salas"}`}</StatusBadge>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === "pharmacy" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {pharmacySteps.map((step, i) => (
            <Card key={step.id} className="surface-hover cursor-pointer space-y-3 p-5" onClick={() => setActiveTab(step.id)}>
              <div className="flex items-center justify-between">
                <span className="label-mono">Etapa {i + 1}</span>
                <step.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <h3 className="font-heading text-lg font-medium">{step.title}</h3>
              <p className="text-xs text-muted-foreground">{step.description}</p>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={countOf(step.id, false) > 0 ? "ok" : "neutral"}>{countOf(step.id, false)} {countOf(step.id, false) === 1 ? "ativa" : "ativas"}</StatusBadge>
                <StatusBadge tone="neutral">{countOf(step.id, true)} {countOf(step.id, true) === 1 ? "inativa" : "inativas"}</StatusBadge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {inModule && (() => {
        const mod = currentModule!;
        const visible = mod.rooms.filter((r: any) => !!r.is_archived === showArchived);
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {pharmacySteps.map((step) => (
                <Button key={step.id} size="sm" variant={activeTab === step.id ? "default" : "outline"} onClick={() => setActiveTab(step.id)}>
                  {step.title}
                  <span className="font-mono text-xs opacity-70">{countOf(step.id, false)}</span>
                </Button>
              ))}
            </div>

            <Tabs value={archiveFilter} onValueChange={(v) => setArchiveFilter(v as "active" | "archived")}>
              <TabsListLine>
                <TabsTriggerLine value="active">Ativas <span className="font-mono text-xs text-muted-foreground">{countOf(activeTab as ModuleId, false)}</span></TabsTriggerLine>
                <TabsTriggerLine value="archived">Inativas <span className="font-mono text-xs text-muted-foreground">{countOf(activeTab as ModuleId, true)}</span></TabsTriggerLine>
              </TabsListLine>
            </Tabs>

            {mod.loading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : visible.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-14 text-center">
                <mod.icon className="mb-4 h-10 w-10 text-muted-foreground/40" />
                <h3 className="font-heading text-lg font-medium">{showArchived ? "Nenhuma sala inativa" : mod.emptyTitle}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {showArchived ? "Arquive salas de semestres anteriores para vê-las aqui." : "Crie a primeira sala para começar."}
                </p>
                {!showArchived && <Button className="mt-4" onClick={mod.onCreate}><Plus className="h-4 w-4" />{mod.createLabel}</Button>}
              </Card>
            ) : (
              <Card className="divide-y overflow-hidden">
                {visible.map((room: any) => {
                  const studentCount = participantCounts?.[room.id] || 0;
                  let extra: React.ReactNode = null;
                  if (activeTab === "soap") {
                    const peerForm = (soapFormsByRoom?.[room.id] || []).find((f: any) => f.form_type === "peer_evaluation");
                    if (peerForm) {
                      let peerTotal = 0;
                      if (Array.isArray(peerForm.content_json)) {
                        (peerForm.content_json as any[]).forEach((f: any) => { if (f.type !== "section_header") peerTotal += (f.max_score || 0); });
                      }
                      const peerValid = peerTotal === 10;
                      extra = (
                        <div className={`mt-3 rounded-md border px-3 py-2 text-xs ${peerValid ? "border-success/40 bg-success/5" : "bg-sunken"}`}>
                          <span className="label-mono">Pontuação do formulário (vale 10)</span>
                          <p className={`mt-1.5 ${peerValid ? "text-success" : "text-muted-foreground"}`}>
                            Avaliação entre pares: <strong className="font-mono">{peerTotal}/10</strong>{peerValid && " ✓"} · a nota do aluno é a da avaliação entre pares
                          </p>
                        </div>
                      );
                    }
                  }
                  return (
                    <SimulationRoomCard
                      key={room.id}
                      icon={mod.icon}
                      title={<EditableRoomTitle roomId={room.id} title={room.title} tableName={mod.table} invalidateKeys={[mod.listKey]} />}
                      description={room.description}
                      status={room.status}
                      archived={!!room.is_archived}
                      meta={
                        <>
                          {activeTab === "anamnesis" && (
                            <>
                              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{studentCount} {studentCount === 1 ? "aluno" : "alunos"}</span>
                              <span>{room.duration_minutes} min</span>
                            </>
                          )}
                          <span>PIN <b className="font-mono font-medium text-foreground">{room.access_code}</b></span>
                        </>
                      }
                      extra={extra}
                      onEdit={() => navigate(mod.editPath(room.id))}
                      onActivate={() => activateRoom(mod.table, mod.listKey, room.id)}
                      onControl={() => navigate(mod.controlPath(room.id))}
                      onSplit={mod.canSplit(room) ? () => mod.split(room.id) : undefined}
                      onDuplicate={() => mod.duplicate(room.id)}
                      onShare={() => { setShareRoomId(room.id); setShareRoomTitle(room.title); setShareModuleType(mod.shareType); }}
                      onArchive={() => archiveMutation.mutate({ table: mod.table, id: room.id, archived: !room.is_archived })}
                      onDelete={() => mod.remove(room.id)}
                    />
                  );
                })}
              </Card>
            )}
          </div>
        );
      })()}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-medium">Nova sala de Anamnese</DialogTitle>
            <DialogDescription>Você define participantes e formulários depois, no editor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da sala</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Anamnese · Turma A, 2026.1" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Duração por rodada (minutos)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={1} className="w-32" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => createRoom.mutate()} disabled={!title || createRoom.isPending}>Criar sala</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {splitRoomId && (
        <SplitRoomDialog
          roomId={splitRoomId}
          open={!!splitRoomId}
          onOpenChange={(open) => { if (!open) setSplitRoomId(null); }}
          onComplete={() => {
            setSplitRoomId(null);
            queryClient.invalidateQueries({ queryKey: ["simulation-rooms"] });
            queryClient.invalidateQueries({ queryKey: ["simulation-participant-counts"] });
          }}
        />
      )}

      {splitSoapRoomId && (
        <GenericSplitRoomDialog roomId={splitSoapRoomId} open={!!splitSoapRoomId} onOpenChange={(o) => { if (!o) setSplitSoapRoomId(null); }} onComplete={() => { setSplitSoapRoomId(null); queryClient.invalidateQueries({ queryKey: ["soap-rooms-list"] }); }} tablePrefix="soap" />
      )}

      {splitReconciliationRoomId && (
        <GenericSplitRoomDialog roomId={splitReconciliationRoomId} open={!!splitReconciliationRoomId} onOpenChange={(o) => { if (!o) setSplitReconciliationRoomId(null); }} onComplete={() => { setSplitReconciliationRoomId(null); queryClient.invalidateQueries({ queryKey: ["reconciliation-rooms-list"] }); }} tablePrefix="reconciliation" />
      )}

      {splitDocumentationRoomId && (
        <GenericSplitRoomDialog roomId={splitDocumentationRoomId} open={!!splitDocumentationRoomId} onOpenChange={(o) => { if (!o) setSplitDocumentationRoomId(null); }} onComplete={() => { setSplitDocumentationRoomId(null); queryClient.invalidateQueries({ queryKey: ["documentation-rooms-list"] }); }} tablePrefix="documentation" />
      )}

      {shareRoomId && (
        <ShareRoomDialog open={!!shareRoomId} onOpenChange={(o) => { if (!o) setShareRoomId(null); }} roomId={shareRoomId} roomTitle={shareRoomTitle} moduleType={shareModuleType} />
      )}
    </div>
  );
}
