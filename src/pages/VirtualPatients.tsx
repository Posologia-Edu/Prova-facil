import { useState, useEffect } from "react";
import SystemPromptViewer from "@/components/SystemPromptViewer";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Zap, User, MessageCircle, Info } from "lucide-react";
import ModuleHelpGuide from "@/components/ModuleHelpGuide";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PatientInfo {
  id: string;
  name: string;
  age: number;
  profession: string;
  description: string;
  module: "pain" | "inflammation";
}

const PATIENTS: PatientInfo[] = [
  // Dor
  { id: "pain_helena", name: "Dona Helena", age: 67, profession: "Ex-professora de história", description: "Dor neuropática pós-herpética", module: "pain" },
  { id: "pain_luciana", name: "Luciana", age: 42, profession: "Professora", description: "Fibromialgia", module: "pain" },
  { id: "pain_rogerio", name: "Rogério", age: 58, profession: "Motorista de ônibus", description: "Lombalgia crônica", module: "pain" },
  { id: "pain_pedro", name: "Pedro", age: 65, profession: "Aposentado", description: "Dor oncológica (câncer de pâncreas)", module: "pain" },
  { id: "pain_ana", name: "Ana", age: 36, profession: "Advogada", description: "Cefaleia por uso excessivo de analgésicos", module: "pain" },
  // Inflamação
  { id: "inflammation_maria", name: "Dona Maria", age: 72, profession: "Aposentada", description: "Osteoartrite de joelho", module: "inflammation" },
  { id: "inflammation_antonio", name: "Seu Antônio", age: 66, profession: "Ex-pedreiro", description: "Osteoartrite de quadril", module: "inflammation" },
  { id: "inflammation_renata", name: "Renata", age: 39, profession: "Cabeleireira", description: "Artrite reumatoide inicial", module: "inflammation" },
  { id: "inflammation_wilson", name: "Seu Wilson", age: 57, profession: "Agricultor", description: "Artrite reumatoide refratária", module: "inflammation" },
  { id: "inflammation_jose", name: "José", age: 57, profession: "Contador", description: "Complicações do corticoide em AR", module: "inflammation" },
];

export default function VirtualPatients() {
  const navigate = useNavigate();
  const [activeSessions, setActiveSessions] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchActiveSessions();
  }, []);

  const fetchActiveSessions = async () => {
    const { data } = await supabase
      .from("virtual_patient_sessions")
      .select("id, patient_id")
      .eq("status", "in_progress");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((s: any) => { map[s.patient_id] = s.id; });
      setActiveSessions(map);
    }
  };

  const startSession = async (patient: PatientInfo) => {
    if (activeSessions[patient.id]) {
      navigate(`/virtual-patients/chat/${patient.id}?session=${activeSessions[patient.id]}`);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("virtual_patient_sessions")
      .insert({
        patient_id: patient.id,
        module: patient.module,
        user_id: userData?.user?.id || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);
      return;
    }

    navigate(`/virtual-patients/chat/${patient.id}?session=${data.id}`);
  };

  const renderPatientCard = (patient: PatientInfo) => {
    const hasSession = !!activeSessions[patient.id];
    return (
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
          </div>
        </CardHeader>
        <CardContent>
          <Badge variant="outline" className="mb-3">{patient.description}</Badge>
          <p className="text-xs text-muted-foreground mb-4">
            Simulação com 3 encontros clínicos: anamnese inicial, avaliação de eficácia/segurança e ajustes finais + MAI.
          </p>
          <Button
            className="w-full"
            variant={hasSession ? "outline" : "default"}
            onClick={() => startSession(patient)}
          >
            {hasSession ? (
              <><RotateCw className="h-4 w-4 mr-2" />Continuar Atendimento</>
            ) : (
              <><Play className="h-4 w-4 mr-2" />Iniciar Atendimento</>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const painPatients = PATIENTS.filter(p => p.module === "pain");
  const inflammationPatients = PATIENTS.filter(p => p.module === "inflammation");

  return (
    <div className="space-y-6">
      <ModuleHelpGuide moduleKey="virtual_patients" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pacientes Virtuais</h1>
          <p className="text-muted-foreground">Simule atendimentos clínicos com pacientes virtuais de IA em 3 encontros progressivos.</p>
        </div>
        <SystemPromptViewer toolKey="virtual-patients" />
      </div>

      <Tabs defaultValue="pain">
        <TabsList>
          <TabsTrigger value="pain">
            <Zap className="h-4 w-4 mr-1" /> Dor
          </TabsTrigger>
          <TabsTrigger value="inflammation">
            <Flame className="h-4 w-4 mr-1" /> Inflamação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pain" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {painPatients.map(renderPatientCard)}
          </div>
        </TabsContent>

        <TabsContent value="inflammation" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inflammationPatients.map(renderPatientCard)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
