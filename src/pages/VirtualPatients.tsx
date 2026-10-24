import { useEffect, useState } from "react";
import SystemPromptViewer from "@/components/SystemPromptViewer";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Info, Sparkles, Trash2, FileText, BookOpen, Library } from "lucide-react";
import ModuleHelpGuide from "@/components/ModuleHelpGuide";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GenerateCaseDialog } from "@/components/vp-case/GenerateCaseDialog";
import { CaseLibraryDialog } from "@/components/vp-case/CaseLibraryDialog";
import { PublishToLibraryDialog } from "@/components/vp-case/PublishToLibraryDialog";
import { useAdmin } from "@/hooks/use-admin";
import { cn } from "@/lib/utils";

interface PatientInfo {
  id: string;
  name: string;
  age: number;
  profession: string;
  description: string;
  module: string;
  custom?: boolean;
  status?: string;
  legacy?: boolean;
}

const SYSTEM_PATIENTS: PatientInfo[] = [
  { id: "pain_helena", name: "Dona Helena", age: 67, profession: "Ex-professora de história", description: "Dor neuropática pós-herpética", module: "Dor" },
  { id: "pain_luciana", name: "Luciana", age: 42, profession: "Professora", description: "Fibromialgia", module: "Dor" },
  { id: "pain_rogerio", name: "Rogério", age: 58, profession: "Motorista de ônibus", description: "Lombalgia crônica", module: "Dor" },
  { id: "pain_pedro", name: "Pedro", age: 65, profession: "Aposentado", description: "Dor oncológica (câncer de pâncreas)", module: "Dor" },
  { id: "pain_ana", name: "Ana", age: 36, profession: "Advogada", description: "Cefaleia por uso excessivo de analgésicos", module: "Dor" },
  { id: "inflammation_maria", name: "Dona Maria", age: 72, profession: "Aposentada", description: "Osteoartrite de joelho", module: "Inflamação" },
  { id: "inflammation_antonio", name: "Seu Antônio", age: 66, profession: "Ex-pedreiro", description: "Osteoartrite de quadril", module: "Inflamação" },
  { id: "inflammation_renata", name: "Renata", age: 39, profession: "Cabeleireira", description: "Artrite reumatoide inicial", module: "Inflamação" },
  { id: "inflammation_wilson", name: "Seu Wilson", age: 57, profession: "Agricultor", description: "Artrite reumatoide refratária", module: "Inflamação" },
  { id: "inflammation_jose", name: "José", age: 57, profession: "Contador", description: "Complicações do corticoide em AR", module: "Inflamação" },
];

const TODOS = "__todos__";

const initials = (name: string) =>
  name.split(/\s+/).filter((p) => p && !/^(d[aeo]s?|seu|dona)$/i.test(p)).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

export default function VirtualPatients() {
  const navigate = useNavigate();
  const [customPatients, setCustomPatients] = useState<PatientInfo[]>([]);
  const [activeTab, setActiveTab] = useState(TODOS);
  const [genOpen, setGenOpen] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [publishing, setPublishing] = useState<PatientInfo | null>(null);
  const { isAdmin } = useAdmin();

  useEffect(() => {
    loadCustom();
  }, []);

  const loadCustom = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("custom_virtual_patients")
      .select("id, name, age, profession, description, category, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      setCustomPatients(data.map((p: any) => ({
        id: p.id,
        name: p.name,
        age: p.age,
        profession: p.profession,
        description: p.description,
        module: p.category,
        custom: true,
        status: p.status,
      })));
    }
  };

  const startSession = (patient: PatientInfo) => {
    navigate(`/virtual-patients/chat/${patient.id}?ephemeral=1`);
  };

  const deleteCustom = async (id: string) => {
    if (!confirm("Excluir este paciente customizado?")) return;
    const { error } = await supabase.from("custom_virtual_patients").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Paciente excluído.");
      loadCustom();
    }
  };

  const renderPatientCard = (patient: PatientInfo) => (
    <Card key={patient.id} className="surface-hover flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-soft font-heading text-lg font-medium text-brand-text">
              {initials(patient.name)}
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-heading text-lg font-medium leading-tight">{patient.name}</h3>
              <p className="truncate text-xs text-muted-foreground">{patient.age} anos · {patient.profession}</p>
            </div>
          </div>
          {patient.custom ? (
            patient.status === "draft"
              ? <StatusBadge tone="warn" dot>Rascunho</StatusBadge>
              : <StatusBadge tone="ok" dot>Publicado</StatusBadge>
          ) : (
            patient.legacy && <StatusBadge>Legado</StatusBadge>
          )}
        </div>

        <p className="min-h-[2.5rem] text-sm leading-relaxed text-muted-foreground">{patient.description}</p>

        <div className="flex flex-wrap gap-1.5">
          <StatusBadge tone="neutral">{patient.module}</StatusBadge>
          {patient.custom && <StatusBadge tone="accent"><Sparkles className="h-3 w-3" />Meu paciente</StatusBadge>}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Button className="flex-1" onClick={() => startSession(patient)}>
            <MessageCircle className="h-4 w-4" />Conversar
          </Button>
          <Button variant="outline" onClick={() => navigate(`/virtual-patients/case/${patient.id}`)}>
            <FileText className="h-4 w-4" />Roteiro
          </Button>
          {patient.custom && (
            <Button variant="ghost" size="icon" onClick={() => deleteCustom(patient.id)} title="Excluir" aria-label="Excluir paciente">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
        {isAdmin && patient.custom && (
          <Button variant="ghost" size="sm" className="-mt-1 justify-start text-muted-foreground" onClick={() => setPublishing(patient)}>
            <Library className="h-4 w-4" />Adicionar à biblioteca
          </Button>
        )}
      </CardContent>
    </Card>
  );

  const all = [...SYSTEM_PATIENTS.map((p) => ({ ...p, legacy: true })), ...customPatients];
  const categories = Array.from(new Set(all.map((p) => p.module)));
  // Ordem: Dor, Inflamação, depois as categorias criadas pelo docente.
  categories.sort((a, b) => {
    const order = ["Dor", "Inflamação"];
    const ai = order.indexOf(a); const bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  const visible = activeTab === TODOS ? all : all.filter((p) => p.module === activeTab);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6 md:p-8">
      <ModuleHelpGuide moduleKey="virtual_patients" />
      <PageHeader
        eyebrow="Praticar"
        title="Pacientes Virtuais"
        description="Converse com o paciente para testá-lo. O atendimento real, com avaliação, acontece nas Salas Virtuais com os alunos."
        actions={
          <>
            <SystemPromptViewer toolKey="virtual-patients" />
            <Button variant="outline" onClick={() => setLibOpen(true)}>
              <BookOpen className="h-4 w-4" />Biblioteca de casos
            </Button>
            <Button variant="ai" onClick={() => setGenOpen(true)}>
              <Sparkles className="h-4 w-4" />Gerar paciente
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Categorias">
          {[TODOS, ...categories].map((cat) => {
            const count = cat === TODOS ? all.length : all.filter((p) => p.module === cat).length;
            const on = activeTab === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActiveTab(cat)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  on ? "border-transparent bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {cat === TODOS ? "Todos" : cat}
                <span className={cn("font-mono text-[11px]", on ? "opacity-80" : "text-muted-foreground")}>{count}</span>
              </button>
            );
          })}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />Conversas aqui são efêmeras e não ficam salvas. Pacientes que você gera são privados.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map(renderPatientCard)}
      </div>

      <CaseLibraryDialog
        open={libOpen}
        onOpenChange={setLibOpen}
        onCopied={(id) => navigate(`/virtual-patients/case/${id}`)}
      />
      <PublishToLibraryDialog
        caseId={publishing?.id ?? null}
        defaultTitulo={publishing ? `${publishing.name} — ${publishing.description}` : ""}
        defaultTema={publishing?.module ?? ""}
        defaultResumo={publishing?.description ?? ""}
        onOpenChange={(o) => { if (!o) setPublishing(null); }}
      />
      <GenerateCaseDialog
        open={genOpen}
        onOpenChange={setGenOpen}
        onCreated={async (category) => { await loadCustom(); setActiveTab(category); }}
        onOpenEditor={(id) => navigate(`/virtual-patients/case/${id}`)}
      />
    </div>
  );
}
