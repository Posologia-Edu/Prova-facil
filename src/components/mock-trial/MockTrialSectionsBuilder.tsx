import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Pencil,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Section {
  id: string;
  key: string;
  title: string;
  summary: string;
  content: string;
  status: "pending" | "generating" | "ready" | "failed";
  order: number;
  error: string | null;
}

interface Props {
  caseId: string;
  sections: Section[];
  onChange: (sections: Section[]) => void;
}

export function MockTrialSectionsBuilder({ caseId, sections, onChange }: Props) {
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, string | null>>({});

  if (!sections || sections.length === 0) {
    return null;
  }

  const generateSection = async (sec: Section) => {
    setBusy((b) => ({ ...b, [sec.key]: true }));
    // Optimistic UI
    onChange(sections.map((s) => (s.key === sec.key ? { ...s, status: "generating", error: null } : s)));
    try {
      const { data, error } = await supabase.functions.invoke("mock-trial-section", {
        body: { caseId, sectionKey: sec.key },
      });
      if (error || !data?.ok) {
        throw new Error(error?.message || data?.error || "Falha ao gerar");
      }
      // Refetch sections from DB to get authoritative state
      const { data: row } = await (supabase as any)
        .from("mock_trial_cases")
        .select("sections_json")
        .eq("id", caseId)
        .single();
      onChange((row?.sections_json as Section[]) || sections);
      setExpanded((e) => ({ ...e, [sec.key]: true }));
      toast.success(`Seção "${sec.title}" gerada`);
    } catch (e: any) {
      onChange(sections.map((s) => (s.key === sec.key ? { ...s, status: "failed", error: e.message } : s)));
      toast.error(e.message || "Erro ao gerar seção");
    } finally {
      setBusy((b) => ({ ...b, [sec.key]: false }));
    }
  };

  const saveEdit = async (sec: Section) => {
    const newContent = editing[sec.key];
    if (newContent == null) return;
    const updated = sections.map((s) =>
      s.key === sec.key ? { ...s, content: newContent, status: "ready" as const } : s,
    );
    onChange(updated);
    // Reassemble process_content
    const assembled = updated
      .filter((s) => s.status === "ready" && s.content)
      .map((s) => `## ${s.title}\n\n${s.content}`)
      .join("\n\n---\n\n");
    await (supabase as any)
      .from("mock_trial_cases")
      .update({ sections_json: updated, process_content: assembled })
      .eq("id", caseId);
    setEditing((e) => ({ ...e, [sec.key]: null }));
    toast.success("Seção atualizada");
  };

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === "ready")
      return (
        <Badge className="bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Pronta
        </Badge>
      );
    if (status === "generating")
      return (
        <Badge variant="secondary">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Gerando…
        </Badge>
      );
    if (status === "failed")
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Falhou
        </Badge>
      );
    return <Badge variant="outline">Pendente</Badge>;
  };

  const readyCount = sections.filter((s) => s.status === "ready").length;
  const total = sections.length;

  return (
    <div className="mt-4 border rounded-lg p-3 bg-muted/10 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-sm font-medium">Construção por Partes</p>
          <p className="text-xs text-muted-foreground">
            Gere cada seção individualmente. As já geradas viram contexto para as próximas.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {readyCount}/{total} prontas
        </Badge>
      </div>

      <div className="space-y-2">
        {sections.map((sec) => {
          const isOpen = expanded[sec.key];
          const isEditing = editing[sec.key] != null;
          const isBusy = busy[sec.key] || sec.status === "generating";
          return (
            <div key={sec.id || sec.key} className="border rounded-md bg-background p-3 space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{sec.title}</p>
                    <StatusBadge status={sec.status} />
                  </div>
                  {sec.summary && (
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{sec.summary}</p>
                  )}
                  {sec.error && <p className="text-[11px] text-destructive mt-1">{sec.error}</p>}
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Button
                    size="sm"
                    variant={sec.status === "ready" ? "outline" : "default"}
                    onClick={() => generateSection(sec)}
                    disabled={isBusy}
                  >
                    {isBusy ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : sec.status === "ready" ? (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    ) : (
                      <Sparkles className="h-3 w-3 mr-1" />
                    )}
                    {sec.status === "ready" ? "Regerar" : "Gerar completo"}
                  </Button>
                  {sec.status === "ready" && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpanded((e) => ({ ...e, [sec.key]: !isOpen }))}
                      >
                        {isOpen ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setEditing((e) => ({
                            ...e,
                            [sec.key]: isEditing ? null : sec.content,
                          }))
                        }
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {sec.status === "ready" && isOpen && !isEditing && (
                <div className="prose prose-sm dark:prose-invert max-w-none border-t pt-2 max-h-96 overflow-auto text-xs">
                  <ReactMarkdown>{sec.content}</ReactMarkdown>
                </div>
              )}

              {isEditing && (
                <div className="space-y-2 border-t pt-2">
                  <Textarea
                    value={editing[sec.key] || ""}
                    onChange={(e) => setEditing((s) => ({ ...s, [sec.key]: e.target.value }))}
                    rows={12}
                    className="font-mono text-xs"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(sec)}>
                      Salvar edição
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing((e) => ({ ...e, [sec.key]: null }))}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
