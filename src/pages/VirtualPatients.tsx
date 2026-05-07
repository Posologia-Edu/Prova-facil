import { useEffect, useState } from "react";
import SystemPromptViewer from "@/components/SystemPromptViewer";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Zap, User, MessageCircle, Info, Sparkles, Loader2, Trash2 } from "lucide-react";
import ModuleHelpGuide from "@/components/ModuleHelpGuide";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PatientInfo {
  id: string;
  name: string;
  age: number;
  profession: string;
  description: string;
  module: string;
  custom?: boolean;
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

export default function VirtualPatients() {
  const navigate = useNavigate();
  const [customPatients, setCustomPatients] = useState<PatientInfo[]>([]);
  const [activeTab, setActiveTab] = useState("Dor");
  const [genOpen, setGenOpen] = useState(false);
  const [genCategory, setGenCategory] = useState("");
  const [genContext, setGenContext] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadCustom();
  }, []);

  const loadCustom = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("custom_virtual_patients")
      .select("id, name, age, profession, description, category")
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
      })));
    }
  };

  const startSession = (patient: PatientInfo) => {
    navigate(`/virtual-patients/chat/${patient.id}?ephemeral=1`);
  };

  const handleGenerate = async () => {
    if (!genCategory.trim() || !genContext.trim()) {
      toast.error("Informe categoria e contexto clínico.");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-virtual-patient", {
        body: { category: genCategory.trim(), clinical_context: genContext.trim() },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success(`Paciente "${data.patient.name}" criado com sucesso!`);
      setGenOpen(false);
      setGenContext("");
      const newCategory = data.patient.category;
      await loadCustom();
      setActiveTab(newCategory);
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar paciente.");
    } finally {
      setGenerating(false);
    }
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
    <Card key={patient.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{patient.name}, {patient.age} anos</CardTitle>
              <CardDescription>{patient.profession}</CardDescription>
            </div>
          </div>
          {patient.custom && (
            <Button variant="ghost" size="icon" onClick={() => deleteCustom(patient.id)} title="Excluir">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="outline">{patient.description}</Badge>
          {patient.custom && <Badge variant="secondary"><Sparkles className="h-3 w-3 mr-1" />Meu paciente</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Converse livremente com o paciente para testar o comportamento. As mensagens não são salvas — o atendimento real ocorre nas Salas Virtuais.
        </p>
        <Button className="w-full" onClick={() => startSession(patient)}>
          <MessageCircle className="h-4 w-4 mr-2" />Conversar com Paciente
        </Button>
      </CardContent>
    </Card>
  );

  const all = [...SYSTEM_PATIENTS, ...customPatients];
  const categories = Array.from(new Set(all.map((p) => p.module)));
  // Garantir ordem: Dor, Inflamação, depois custom
  categories.sort((a, b) => {
    const order = ["Dor", "Inflamação"];
    const ai = order.indexOf(a); const bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <div className="space-y-6">
      <ModuleHelpGuide moduleKey="virtual_patients" />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pacientes Virtuais</h1>
          <p className="text-muted-foreground">Converse com os pacientes virtuais para testá-los. O atendimento real (com persistência e avaliação) acontece nas Salas Virtuais com os alunos.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setGenOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />Gerar Paciente Virtual
          </Button>
          <SystemPromptViewer toolKey="virtual-patients" />
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Modo exploração:</strong> as conversas aqui são efêmeras e não ficam salvas. Pacientes que você gerar são privados — só você os vê.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat}>
              {cat === "Dor" ? <Zap className="h-4 w-4 mr-1" /> : cat === "Inflamação" ? <Flame className="h-4 w-4 mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {all.filter((p) => p.module === cat).map(renderPatientCard)}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Paciente Virtual</DialogTitle>
            <DialogDescription>
              Informe a categoria e o contexto clínico. A IA criará um paciente completo no mesmo padrão dos existentes (3 encontros, comportamento realista, respostas a condutas).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="category">Categoria do paciente</Label>
              <Input
                id="category"
                placeholder="Ex.: Diabetes, Hipertensão, Asma, Dor, Inflamação..."
                value={genCategory}
                onChange={(e) => setGenCategory(e.target.value)}
                disabled={generating}
              />
            </div>
            <div>
              <Label htmlFor="context">Contexto clínico</Label>
              <Textarea
                id="context"
                placeholder="Descreva brevemente o cenário clínico desejado: idade aproximada, comorbidades, gravidade, contexto social, objetivo educacional..."
                value={genContext}
                onChange={(e) => setGenContext(e.target.value)}
                disabled={generating}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)} disabled={generating}>Cancelar</Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando...</> : <><Sparkles className="h-4 w-4 mr-2" />Gerar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
