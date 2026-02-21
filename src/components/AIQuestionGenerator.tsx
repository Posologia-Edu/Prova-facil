import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface GeneratedQuestion {
  question_text: string;
  type: string;
  difficulty: string;
  bloom_level: string;
  tags: string[];
  options?: { a: string; b: string; c: string; d: string };
  correct_answer?: string;
  explanation?: string;
  expected_answer?: string;
  grading_criteria?: string;
  column_a?: string[];
  column_b?: string[];
  correct_matches?: Record<string, number>;
  selected?: boolean;
}

interface AIQuestionGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveQuestions: (questions: GeneratedQuestion[]) => void;
}

const typeLabels: Record<string, string> = {
  multiple_choice: "Múltipla Escolha",
  true_false: "Verdadeiro/Falso",
  open_ended: "Dissertativa",
  matching: "Associação de Colunas",
};

export function AIQuestionGenerator({ open, onOpenChange, onSaveQuestions }: AIQuestionGeneratorProps) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [step, setStep] = useState<"config" | "review">("config");
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionType, setQuestionType] = useState("multiple_choice");
  const [count, setCount] = useState([3]);
  const [generated, setGenerated] = useState<GeneratedQuestion[]>([]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: "Informe um tópico", description: "O campo de tópico é obrigatório.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: { topic, context, difficulty, questionType, count: count[0], language },
      });

      if (error) throw error;

      if (data?.error) {
        toast({ title: "Erro ao gerar", description: data.error, variant: "destructive" });
        return;
      }

      const questions = (data.questions || []).map((q: any) => ({
        ...q,
        type: questionType,
        difficulty,
        selected: true,
      }));

      setGenerated(questions);
      setStep("review");
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erro",
        description: e.message || "Falha ao gerar questões. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (index: number) => {
    setGenerated((prev) =>
      prev.map((q, i) => (i === index ? { ...q, selected: !q.selected } : q))
    );
  };

  const handleSave = async () => {
    const selected = generated.filter((q) => q.selected);
    if (selected.length === 0) {
      toast({ title: "Nenhuma questão selecionada", variant: "destructive" });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast({ title: "Faça login primeiro.", variant: "destructive" });
        return;
      }

      // Save each question to question_bank
      const inserts = selected.map((q) => ({
        user_id: userData.user!.id,
        type: q.type,
        difficulty: q.difficulty,
        bloom_level: q.bloom_level || "",
        tags: q.tags || [],
        content_json: {
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          expected_answer: q.expected_answer,
          grading_criteria: q.grading_criteria,
          column_a: q.column_a,
          column_b: q.column_b,
          correct_matches: q.correct_matches,
        },
      }));

      const { error } = await supabase.from("question_bank").insert(inserts);
      if (error) throw error;

      onSaveQuestions(selected);
      handleClose();
      toast({ title: `${selected.length} questão(ões) salva(s)`, description: "Adicionadas ao banco de questões." });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao salvar", description: e.message || "Tente novamente.", variant: "destructive" });
    }
  };

  const handleClose = () => {
    setStep("config");
    setGenerated([]);
    setTopic("");
    setContext("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-secondary" />
            {step === "config" ? "Gerador de Questões com IA" : "Revisar Questões Geradas"}
          </DialogTitle>
          <DialogDescription>
            {step === "config"
              ? "Configure os parâmetros e a IA gerará questões de alta qualidade."
              : `${generated.length} questões geradas. Revise, selecione e salve.`}
          </DialogDescription>
        </DialogHeader>

        {step === "config" && (
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>Tópico *</Label>
              <Input
                placeholder="Ex: Mecanismo de ação da Diabetes Tipo 2"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Contexto / Texto de Apoio (opcional)</Label>
              <Textarea
                placeholder="Cole aqui um texto, artigo ou material de referência para basear as questões..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Questão</Label>
                <Select value={questionType} onValueChange={setQuestionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                    <SelectItem value="true_false">Verdadeiro / Falso</SelectItem>
                    <SelectItem value="open_ended">Dissertativa</SelectItem>
                    <SelectItem value="matching">Associação de Colunas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dificuldade</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Fácil</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="hard">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantidade de questões: {count[0]}</Label>
              <Slider value={count} onValueChange={setCount} min={1} max={10} step={1} />
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="flex-1 overflow-auto space-y-3 py-2 pr-1">
            {generated.map((q, i) => (
              <Card
                key={i}
                className={`p-4 transition-all ${q.selected ? "border-primary/40 bg-primary/5" : "opacity-60"}`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={q.selected}
                    onCheckedChange={() => toggleQuestion(i)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-sm font-medium leading-snug">{q.question_text}</p>

                    {q.type === "multiple_choice" && q.options && (
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        {Object.entries(q.options).map(([key, val]) => (
                          <div
                            key={key}
                            className={`px-2 py-1 rounded border ${
                              q.correct_answer === key
                                ? "bg-success/10 border-success/30 font-medium"
                                : "bg-muted/50"
                            }`}
                          >
                            <span className="font-semibold mr-1">{key})</span> {val}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === "true_false" && (
                      <p className="text-xs text-muted-foreground">
                        Resposta: <span className="font-medium">{q.correct_answer === "true" ? "Verdadeiro" : "Falso"}</span>
                      </p>
                    )}

                    {q.type === "open_ended" && q.expected_answer && (
                      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        <strong>Resposta esperada:</strong> {q.expected_answer}
                      </div>
                    )}

                    {q.type === "matching" && q.column_a && q.column_b && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <strong>Coluna A:</strong>
                          {q.column_a.map((item, j) => (
                            <p key={j} className="pl-2">{j + 1}. {item}</p>
                          ))}
                        </div>
                        <div>
                          <strong>Coluna B:</strong>
                          {q.column_b.map((item, j) => (
                            <p key={j} className="pl-2">{String.fromCharCode(97 + j)}) {item}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {q.explanation && (
                      <p className="text-xs text-muted-foreground italic">💡 {q.explanation}</p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={q.difficulty as "easy" | "medium" | "hard"} className="text-[10px]">
                        {q.difficulty}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{typeLabels[q.type]}</span>
                      <span className="text-[10px] text-muted-foreground">· {q.bloom_level}</span>
                      {q.tags?.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter className="pt-2">
          {step === "config" ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar Questões
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("config")}>
                Voltar e Regenerar
              </Button>
              <Button onClick={handleSave}>
                Salvar {generated.filter((q) => q.selected).length} Selecionada(s)
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
