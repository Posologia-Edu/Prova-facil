import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pill, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VirtualPatientMAIProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  onComplete: () => void;
}

const MAI_CRITERIA = [
  { key: "indication", label: "Indicação", description: "Existe indicação para o medicamento?" },
  { key: "effectiveness", label: "Efetividade", description: "O medicamento é efetivo para a condição?" },
  { key: "dosage", label: "Dosagem", description: "A dosagem está correta?" },
  { key: "correct_directions", label: "Orientações corretas", description: "As orientações de uso estão corretas?" },
  { key: "practical_directions", label: "Orientações práticas", description: "As orientações são práticas e viáveis?" },
  { key: "drug_drug", label: "Interação medicamento-medicamento", description: "Há interações medicamentosas clinicamente significativas?" },
  { key: "drug_disease", label: "Interação medicamento-doença", description: "Há interações medicamento-doença?" },
  { key: "duplication", label: "Duplicidade", description: "Há duplicidade terapêutica desnecessária?" },
  { key: "duration", label: "Duração", description: "A duração do tratamento é adequada?" },
  { key: "cost", label: "Custo", description: "O medicamento é a opção mais custo-efetiva?" },
];

const OPTIONS = [
  { value: "appropriate", label: "Apropriado", score: 1 },
  { value: "marginally", label: "Marginalmente Apropriado", score: 2 },
  { value: "inappropriate", label: "Inapropriado", score: 3 },
];

interface MedicationMAI {
  name: string;
  answers: Record<string, string>;
  expanded: boolean;
}

export function VirtualPatientMAI({ open, onOpenChange, sessionId, onComplete }: VirtualPatientMAIProps) {
  const [medications, setMedications] = useState<MedicationMAI[]>([
    { name: "", answers: {}, expanded: true },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addMedication = () => {
    setMedications(prev => [
      ...prev.map(m => ({ ...m, expanded: false })),
      { name: "", answers: {}, expanded: true },
    ]);
  };

  const removeMedication = (index: number) => {
    if (medications.length <= 1) {
      toast.error("É necessário pelo menos um medicamento.");
      return;
    }
    setMedications(prev => prev.filter((_, i) => i !== index));
  };

  const updateMedName = (index: number, name: string) => {
    setMedications(prev => prev.map((m, i) => i === index ? { ...m, name } : m));
  };

  const updateAnswer = (medIndex: number, criterionKey: string, value: string) => {
    setMedications(prev => prev.map((m, i) =>
      i === medIndex ? { ...m, answers: { ...m.answers, [criterionKey]: value } } : m
    ));
  };

  const toggleExpand = (index: number) => {
    setMedications(prev => prev.map((m, i) =>
      i === index ? { ...m, expanded: !m.expanded } : m
    ));
  };

  const getMedScore = (med: MedicationMAI) => {
    return Object.values(med.answers).reduce((sum, val) => {
      const opt = OPTIONS.find(o => o.value === val);
      return sum + (opt?.score || 0);
    }, 0);
  };

  const getMedCompleteness = (med: MedicationMAI) => {
    return Object.keys(med.answers).length;
  };

  const handleSubmit = async () => {
    // Validate all medications
    for (let i = 0; i < medications.length; i++) {
      const med = medications[i];
      if (!med.name.trim()) {
        toast.error(`Informe o nome do medicamento ${i + 1}.`);
        return;
      }
      if (Object.keys(med.answers).length < MAI_CRITERIA.length) {
        toast.error(`Preencha todos os critérios para "${med.name}".`);
        setMedications(prev => prev.map((m, j) => ({ ...m, expanded: j === i })));
        return;
      }
    }

    setSubmitting(true);

    // Build combined MAI data
    const maiJson: Record<string, any> = {};
    let totalScore = 0;

    medications.forEach((med, idx) => {
      const medKey = `med_${idx}`;
      const medScore = getMedScore(med);
      totalScore += medScore;
      maiJson[medKey] = {
        medication_name: med.name,
        answers: med.answers,
        score: medScore,
      };
    });

    maiJson._medication_count = medications.length;
    maiJson._total_score = totalScore;

    const { error } = await supabase.from("virtual_patient_mai_scores").insert({
      session_id: sessionId,
      mai_json: maiJson,
      total_score: totalScore,
    });

    if (error) {
      toast.error("Erro ao salvar MAI.");
      console.error(error);
    } else {
      await supabase.from("virtual_patient_sessions")
        .update({ status: "completed", mai_answers_json: maiJson })
        .eq("id", sessionId);
      toast.success("MAI salvo com sucesso!");
      onComplete();
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Medication Appropriateness Index (MAI)</DialogTitle>
          <DialogDescription>
            Avalie a adequação de cada medicamento prescrito para este paciente. Adicione todos os medicamentos em uso e preencha os 10 critérios para cada um.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {medications.map((med, medIdx) => (
            <div key={medIdx} className="border rounded-lg overflow-hidden">
              {/* Medication header */}
              <div
                className="flex items-center gap-2 p-3 bg-muted/50 cursor-pointer"
                onClick={() => toggleExpand(medIdx)}
              >
                <Pill className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  {med.name ? (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{med.name}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {getMedCompleteness(med)}/{MAI_CRITERIA.length}
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Medicamento {medIdx + 1}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {medications.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); removeMedication(medIdx); }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                  {med.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>

              {/* Expanded content */}
              {med.expanded && (
                <div className="p-4 space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Nome do medicamento</Label>
                    <Input
                      value={med.name}
                      onChange={(e) => updateMedName(medIdx, e.target.value)}
                      placeholder="Ex: Ibuprofeno 400mg"
                      className="mt-1"
                    />
                  </div>

                  {MAI_CRITERIA.map((criterion, idx) => (
                    <div key={criterion.key} className="space-y-2 border-b pb-3 last:border-b-0">
                      <Label className="font-medium text-sm">
                        {idx + 1}. {criterion.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{criterion.description}</p>
                      <RadioGroup
                        value={med.answers[criterion.key] || ""}
                        onValueChange={(val) => updateAnswer(medIdx, criterion.key, val)}
                        className="flex flex-col sm:flex-row gap-2 mt-1"
                      >
                        {OPTIONS.map(opt => (
                          <div key={opt.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt.value} id={`med${medIdx}_${criterion.key}_${opt.value}`} />
                            <Label htmlFor={`med${medIdx}_${criterion.key}_${opt.value}`} className="text-sm cursor-pointer">
                              {opt.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <Button variant="outline" onClick={addMedication} className="w-full gap-2">
            <Plus className="h-4 w-4" /> Adicionar outro medicamento
          </Button>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? "Salvando..." : `Enviar Avaliação MAI (${medications.length} medicamento${medications.length > 1 ? "s" : ""})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
