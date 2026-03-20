import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

export function VirtualPatientMAI({ open, onOpenChange, sessionId, onComplete }: VirtualPatientMAIProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (Object.keys(answers).length < MAI_CRITERIA.length) {
      toast.error("Preencha todos os critérios do MAI antes de enviar.");
      return;
    }

    setSubmitting(true);
    const totalScore = Object.values(answers).reduce((sum, val) => {
      const opt = OPTIONS.find(o => o.value === val);
      return sum + (opt?.score || 0);
    }, 0);

    const { error } = await supabase.from("virtual_patient_mai_scores").insert({
      session_id: sessionId,
      mai_json: answers,
      total_score: totalScore,
    });

    if (error) {
      toast.error("Erro ao salvar MAI.");
      console.error(error);
    } else {
      await supabase.from("virtual_patient_sessions")
        .update({ status: "completed", mai_answers_json: answers })
        .eq("id", sessionId);
      toast.success("MAI salvo com sucesso!");
      onComplete();
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Medication Appropriateness Index (MAI)</DialogTitle>
          <DialogDescription>
            Avalie a adequação do tratamento prescrito para este paciente em cada um dos 10 critérios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {MAI_CRITERIA.map((criterion, idx) => (
            <div key={criterion.key} className="space-y-2 border-b pb-4 last:border-b-0">
              <Label className="font-medium">
                {idx + 1}. {criterion.label}
              </Label>
              <p className="text-xs text-muted-foreground">{criterion.description}</p>
              <RadioGroup
                value={answers[criterion.key] || ""}
                onValueChange={(val) => setAnswers(prev => ({ ...prev, [criterion.key]: val }))}
                className="flex flex-col sm:flex-row gap-2 mt-1"
              >
                {OPTIONS.map(opt => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt.value} id={`${criterion.key}_${opt.value}`} />
                    <Label htmlFor={`${criterion.key}_${opt.value}`} className="text-sm cursor-pointer">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? "Salvando..." : "Enviar Avaliação MAI"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
