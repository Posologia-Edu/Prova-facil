import { useState, useEffect } from "react";
import SystemPromptViewer from "@/components/SystemPromptViewer";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, ClipboardCheck, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClinicalObservations() {
  const navigate = useNavigate();
  const [observations, setObservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchAll = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from("clinical_observations").select("*").eq("user_id", session.user.id).is("deleted_at", null).order("created_at", { ascending: false });

    const enriched = await Promise.all((data || []).map(async (obs: any) => {
      const { count } = await supabase.from("clinical_observation_sessions").select("*", { count: "exact", head: true }).eq("observation_id", obs.id);
      return { ...obs, _sessionCount: count || 0 };
    }));

    setObservations(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async (type: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const defaults = type === "mini_cex"
      ? [
          { id: "1", name: "Anamnese", description: "Qualidade da coleta de história" },
          { id: "2", name: "Exame Físico", description: "Técnica e sistematização" },
          { id: "3", name: "Raciocínio Clínico", description: "Diagnóstico diferencial e plano" },
          { id: "4", name: "Comunicação", description: "Relação médico-paciente" },
          { id: "5", name: "Profissionalismo", description: "Ética e postura" },
          { id: "6", name: "Organização", description: "Eficiência e gestão do tempo" },
          { id: "7", name: "Competência Global", description: "Avaliação geral" },
        ]
      : [
          { id: "1", name: "Indicação", description: "Justificativa para o procedimento" },
          { id: "2", name: "Consentimento", description: "Obtenção do consentimento informado" },
          { id: "3", name: "Preparação", description: "Preparo do material e do paciente" },
          { id: "4", name: "Técnica", description: "Execução do procedimento" },
          { id: "5", name: "Assepsia", description: "Técnica asséptica" },
          { id: "6", name: "Cuidados Pós", description: "Orientações pós-procedimento" },
          { id: "7", name: "Competência Global", description: "Avaliação geral" },
        ];

    const { data, error } = await supabase.from("clinical_observations").insert({
      user_id: session.user.id,
      type,
      title: type === "mini_cex" ? "Novo Mini-CEX" : "Novo DOPS",
      competency_domains_json: defaults,
    }).select().single();

    if (error) { toast.error("Erro ao criar"); return; }
    navigate(`/clinical-observations/${data.id}/edit`);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("clinical_observations").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    toast.success("Movido para lixeira");
    fetchAll();
  };

  const filtered = typeFilter === "all" ? observations : observations.filter(o => o.type === typeFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mini-CEX & DOPS</h1>
          <p className="text-muted-foreground text-sm mt-1">Observação direta de competências clínicas e procedimentais</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleCreate("mini_cex")} variant="outline"><Stethoscope className="h-4 w-4 mr-2" /> Novo Mini-CEX</Button>
          <Button onClick={() => handleCreate("dops")}><ClipboardCheck className="h-4 w-4 mr-2" /> Novo DOPS</Button>
        </div>
      </div>

      <Tabs value={typeFilter} onValueChange={setTypeFilter}>
        <TabsList>
          <TabsTrigger value="all">Todos ({observations.length})</TabsTrigger>
          <TabsTrigger value="mini_cex">Mini-CEX ({observations.filter(o => o.type === "mini_cex").length})</TabsTrigger>
          <TabsTrigger value="dops">DOPS ({observations.filter(o => o.type === "dops").length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="text-muted-foreground text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhuma avaliação criada ainda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((obs) => (
            <Card key={obs.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/clinical-observations/${obs.id}/edit`)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base line-clamp-2">{obs.title}</CardTitle>
                  <Badge variant={obs.type === "mini_cex" ? "default" : "secondary"}>{obs.type === "mini_cex" ? "Mini-CEX" : "DOPS"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{(obs.competency_domains_json || []).length} domínios</span>
                  <span>{obs._sessionCount} avaliações</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{format(new Date(obs.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); navigate(`/clinical-observations/${obs.id}/edit`); }}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(obs.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
