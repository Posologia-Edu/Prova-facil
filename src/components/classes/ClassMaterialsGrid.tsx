import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, Scale, BookOpen, Library, Pencil, Trash2, ExternalLink, Download, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocItem {
  id: string;
  title: string;
  category: string;
  description: string | null;
  file_path: string | null;
  link_url: string | null;
  updated_at: string;
}

const DOC_CATEGORIES = [
  { value: "calendar", label: "Calendário acadêmico", icon: Calendar },
  { value: "regulation", label: "Regulamento", icon: Scale },
  { value: "syllabus", label: "Ementa / Plano de ensino", icon: BookOpen },
  { value: "bibliography", label: "Bibliografia", icon: Library },
  { value: "other", label: "Outro", icon: FileText },
];

const CATEGORY_STYLES: Record<string, string> = {
  calendar: "bg-amber-100/60 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
  regulation: "bg-primary/10 text-primary border-primary/15 dark:bg-primary/20 dark:text-primary-foreground",
  syllabus: "bg-indigo-100/60 text-indigo-700 border-indigo-200/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50",
  bibliography: "bg-emerald-100/60 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50",
  other: "bg-muted text-muted-foreground border-border",
};

const ICON_BACKGROUNDS: Record<string, string> = {
  calendar: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  regulation: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground",
  syllabus: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
  bibliography: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  other: "bg-muted text-muted-foreground",
};

interface Props {
  documents: DocItem[];
  onNew: () => void;
  onEdit: (d: DocItem) => void;
  onDelete: (d: DocItem) => void;
  onOpen: (d: DocItem) => void;
}

function relativeDate(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return "Atualizado agora";
  if (minutes < 60) return `Atualizado há ${minutes} min`;
  if (hours < 24) return `Atualizado há ${hours}h`;
  if (days === 1) return "Atualizado ontem";
  if (days < 30) return `Atualizado há ${days} dias`;
  if (months === 1) return "Atualizado há 1 mês";
  if (months < 12) return `Atualizado há ${months} meses`;
  if (years === 1) return "Atualizado há 1 ano";
  return `Atualizado há ${years} anos`;
}

export function ClassMaterialsGrid({ documents, onNew, onEdit, onDelete, onOpen }: Props) {
  const categoryMap = useMemo(() => {
    return new Map(DOC_CATEGORIES.map((c) => [c.value, c]));
  }, []);

  if (documents.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">Materiais de Apoio</h2>
            <p className="text-sm text-muted-foreground mt-1">Acesse e gerencie os documentos da turma</p>
          </div>
          <Button onClick={onNew} className="shadow-md hover:shadow-lg transition-shadow">
            <Plus className="w-4 h-4 mr-2" />Novo documento
          </Button>
        </div>
        <Card className="border-dashed border-2 bg-muted/30">
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-4">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">Nenhum material cadastrado</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              Faça upload do calendário acadêmico, regulamento, ementa, bibliografia e outros documentos de apoio.
            </p>
            <Button onClick={onNew}>
              <Plus className="w-4 h-4 mr-2" />Adicionar primeiro documento
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">Materiais de Apoio</h2>
          <p className="text-sm text-muted-foreground mt-1">Acesse e gerencie os documentos da turma</p>
        </div>
        <Button onClick={onNew} className="shadow-md hover:shadow-lg transition-shadow">
          <Plus className="w-4 h-4 mr-2" />Novo documento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {documents.map((d) => {
          const category = categoryMap.get(d.category);
          const categoryLabel = category?.label ?? d.category;
          const Icon = category?.icon ?? FileText;
          const style = CATEGORY_STYLES[d.category] || CATEGORY_STYLES.other;
          const iconBg = ICON_BACKGROUNDS[d.category] || ICON_BACKGROUNDS.other;
          const hasAction = d.file_path || d.link_url;
          const isLink = !!d.link_url;

          return (
            <Card
              key={d.id}
              className={cn(
                "group relative bg-card border border-border rounded-2xl p-5 transition-all duration-300",
                "hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5 hover:border-primary/20"
              )}
            >
              <div className="flex justify-between items-start">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300",
                    "group-hover:scale-110",
                    iconBg
                  )}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                    onClick={() => onEdit(d)}
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                    onClick={() => onDelete(d)}
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full", style)}>
                  {categoryLabel}
                </Badge>
                <h3 className="mt-2 font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {d.title}
                </h3>
                {d.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{d.description}</p>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
                <span className="text-xs text-muted-foreground">{relativeDate(d.updated_at)}</span>
                {hasAction ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5"
                    onClick={() => onOpen(d)}
                  >
                    {isLink ? (
                      <>
                        Abrir <ExternalLink className="w-4 h-4 ml-1" />
                      </>
                    ) : (
                      <>
                        Download <Download className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Sem arquivo</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
