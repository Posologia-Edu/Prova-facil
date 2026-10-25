import { Bot, Eye, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsListLine, TabsTriggerLine } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import AITutorChat from "@/components/AITutorChat";
import type { Json } from "@/integrations/supabase/types";

export interface ReviewAnswerRow {
  id: string;
  question_id: string;
  answer_text: string | null;
  answer_json: Json;
  is_correct: boolean | null;
  points_earned: number | null;
  max_points: number | null;
  ai_score: number | null;
  ai_feedback: string | null;
  teacher_score: number | null;
  teacher_feedback: string | null;
  grading_status: string;
  question_bank: { type: string; content_json: Json } | null;
}

export function getAnswerStatement(answer: ReviewAnswerRow | null | undefined, fallback = "Questão") {
  const cj = (answer?.question_bank?.content_json || {}) as Record<string, unknown>;
  return (cj.question_text as string) || (cj.statement as string) || (cj.title as string) || fallback;
}

interface ExamAnswerReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  answer: ReviewAnswerRow | null;
  tab: string;
  onTabChange: (tab: string) => void;
  teacherScore: string;
  onTeacherScoreChange: (value: string) => void;
  teacherFeedback: string;
  onTeacherFeedbackChange: (value: string) => void;
  onSave: () => void;
  onSuggestScore: (score: number, feedback: string) => void;
}

// Revisão de uma resposta: Tutor de IA e Nota manual. Usado na aba Correção do editor e no Monitoramento.
export default function ExamAnswerReviewDialog({
  open,
  onOpenChange,
  answer,
  tab,
  onTabChange,
  teacherScore,
  onTeacherScoreChange,
  teacherFeedback,
  onTeacherFeedbackChange,
  onSave,
  onSuggestScore,
}: ExamAnswerReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-medium">Correção com Tutor de IA</DialogTitle>
        </DialogHeader>
        {answer && (
          <Tabs value={tab} onValueChange={onTabChange} className="w-full">
            <TabsListLine>
              <TabsTriggerLine value="tutor"><MessageSquare className="h-4 w-4" />Tutor de IA</TabsTriggerLine>
              <TabsTriggerLine value="review"><Eye className="h-4 w-4" />Nota manual</TabsTriggerLine>
            </TabsListLine>

            <TabsContent value="tutor" className="mt-4 space-y-3">
              <div>
                <Label className="label-mono">Enunciado</Label>
                <p className="mt-1.5 rounded-md bg-sunken p-3 text-sm">{getAnswerStatement(answer)}</p>
              </div>
              <div>
                <Label className="label-mono">Resposta do aluno</Label>
                <p className="mt-1.5 rounded-md bg-sunken p-3 text-sm">{answer.answer_text || "Sem resposta"}</p>
              </div>
              <Separator />
              <AITutorChat
                answerId={answer.id}
                studentAnswer={answer.answer_text || ""}
                questionStatement={getAnswerStatement(answer, "")}
                aiScore={answer.ai_score}
                aiFeedback={answer.ai_feedback}
                teacherScore={answer.teacher_score}
                maxPoints={Number(answer.max_points) || 1}
                onSuggestScore={onSuggestScore}
              />
            </TabsContent>

            <TabsContent value="review" className="mt-4 space-y-4">
              <div>
                <Label className="label-mono">Resposta do aluno</Label>
                <p className="mt-1.5 rounded-md bg-sunken p-3 text-sm">{answer.answer_text || "Sem resposta"}</p>
              </div>
              {answer.ai_feedback && (
                <div>
                  <Label className="label-mono flex items-center gap-1.5">
                    <Bot className="h-3 w-3" /> Avaliação da IA ({answer.ai_score}/{Number(answer.max_points)})
                  </Label>
                  <p className="mt-1.5 rounded-md bg-brand-soft p-3 text-sm text-brand-text">{answer.ai_feedback}</p>
                </div>
              )}
              <Separator />
              <div className="space-y-2">
                <Label>Nota do professor (máx.: {Number(answer.max_points)})</Label>
                <Input
                  type="number"
                  min={0}
                  max={Number(answer.max_points)}
                  step={0.5}
                  value={teacherScore}
                  onChange={(e) => onTeacherScoreChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Feedback (opcional)</Label>
                <Textarea
                  value={teacherFeedback}
                  onChange={(e) => onTeacherFeedbackChange(e.target.value)}
                  rows={3}
                  placeholder="Comentário para o aluno..."
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave}>Salvar nota</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
