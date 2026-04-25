import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GraduationCap, Loader2, RefreshCw, Eye, Sparkles, Lock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  caseId: string;
  teacherGuide: string | null;
  hasContent: boolean;
  onUpdated: (newGuide: string) => void;
}

export function TeacherGuidePanel({ caseId, teacherGuide, hasContent, onUpdated }: Props) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const generate = async () => {
    if (!hasContent) {
      toast.error("Gere ao menos uma parte do processo antes de criar o roteiro.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("mock-trial-teacher-guide", {
        body: { caseId },
      });
      if (error || !data?.ok) throw new Error(error?.message || data?.error || "Falha ao gerar roteiro");
      onUpdated(data.content);
      toast.success("Roteiro de condução gerado!");
      setOpen(true);
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar roteiro");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mt-3 border rounded-lg p-3 bg-amber-500/5 border-amber-500/30 space-y-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-start gap-2 min-w-0">
            <GraduationCap className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                Roteiro de Condução (Professor)
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Lock className="h-2.5 w-2.5" /> Apenas docente
                </Badge>
                {teacherGuide && (
                  <Badge className="bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30 text-[10px]">
                    Pronto
                  </Badge>
                )}
              </p>
              <p className="text-xs text-muted-foreground leading-snug">
                Pontos críticos de conduta farmacológica e cuidado, perguntas-guia, argumentos pró-acusação/defesa e veredito técnico para conduzir a discussão.
              </p>
            </div>
          </div>
          <div className="flex gap-1 flex-wrap">
            {teacherGuide && (
              <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
                <Eye className="h-3 w-3 mr-1" /> Ver roteiro
              </Button>
            )}
            <Button size="sm" variant={teacherGuide ? "outline" : "default"} onClick={generate} disabled={busy || !hasContent}>
              {busy ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : teacherGuide ? (
                <RefreshCw className="h-3 w-3 mr-1" />
              ) : (
                <Sparkles className="h-3 w-3 mr-1" />
              )}
              {busy ? "Gerando..." : teacherGuide ? "Regerar" : "Gerar roteiro"}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Roteiro de Condução do Professor
            </DialogTitle>
            <DialogDescription>
              Material confidencial para apoiar sua condução da discussão pós-Júri Simulado.
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none overflow-auto pr-2
                          prose-headings:scroll-mt-4 prose-headings:font-semibold
                          prose-h1:text-xl prose-h1:mt-6 prose-h1:mb-3 prose-h1:pb-2 prose-h1:border-b
                          prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-2 prose-h2:text-amber-700 dark:prose-h2:text-amber-400
                          prose-h3:text-base prose-h3:mt-4 prose-h3:mb-1
                          prose-p:my-2 prose-li:my-0.5
                          prose-strong:text-foreground
                          [&_table]:w-full [&_table]:my-3 [&_table]:text-[12.5px] [&_table]:border-collapse [&_table]:block [&_table]:overflow-x-auto
                          [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:border [&_th]:border-border [&_th]:font-semibold
                          [&_td]:px-2 [&_td]:py-1.5 [&_td]:border [&_td]:border-border [&_td]:align-top
                          [&_blockquote]:border-l-4 [&_blockquote]:border-amber-500/40 [&_blockquote]:bg-amber-500/5 [&_blockquote]:px-3 [&_blockquote]:py-1 [&_blockquote]:rounded-r [&_blockquote]:not-italic
                          [&_hr]:my-4 [&_hr]:border-border">
            {teacherGuide ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{teacherGuide}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground">Nenhum roteiro gerado ainda.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
