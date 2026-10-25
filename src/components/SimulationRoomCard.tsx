import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Archive, ArchiveRestore, BarChart3, Copy, MoreHorizontal, Play, Scissors, Settings, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS: Record<string, { label: string; tone: StatusTone; dot: boolean }> = {
  draft: { label: "Rascunho", tone: "warn", dot: true },
  active: { label: "Ativa", tone: "info", dot: true },
  completed: { label: "Concluída", tone: "ok", dot: false },
  paused: { label: "Pausada", tone: "warn", dot: true },
};

interface SimulationRoomCardProps {
  icon: LucideIcon;
  /** normalmente um EditableRoomTitle */
  title: ReactNode;
  description?: string | null;
  status: string;
  /** linha de metadados: participantes, duração, PIN */
  meta: ReactNode;
  /** bloco extra abaixo da linha (ex.: pontuação do formulário SOAP) */
  extra?: ReactNode;
  archived?: boolean;
  onEdit: () => void;
  onActivate: () => void;
  onControl: () => void;
  /** só informar quando a sala pode ser dividida */
  onSplit?: () => void;
  onDuplicate: () => void;
  onShare: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

// Linha de sala de simulação, igual para as quatro etapas da Farmácia (e depois para as outras áreas).
export default function SimulationRoomCard({
  icon: Icon,
  title,
  description,
  status,
  meta,
  extra,
  archived,
  onEdit,
  onActivate,
  onControl,
  onSplit,
  onDuplicate,
  onShare,
  onArchive,
  onDelete,
}: SimulationRoomCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const st = STATUS[status] || { label: status, tone: "neutral" as StatusTone, dot: false };

  return (
    <div className="flex flex-wrap items-start gap-4 p-4">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${status === "completed" ? "bg-success/10 text-success" : "bg-brand-soft text-brand-text"}`}>
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1 basis-64">
        <div className="flex flex-wrap items-center gap-2">
          {title}
          <StatusBadge tone={st.tone} dot={st.dot}>{st.label}</StatusBadge>
        </div>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">{meta}</div>
        {extra}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {status === "draft" && (
          <Button size="sm" onClick={onActivate}><Play className="h-3.5 w-3.5" />Ativar</Button>
        )}
        {status === "active" && (
          <Button size="sm" onClick={onControl}><Play className="h-3.5 w-3.5" />Controle</Button>
        )}
        {status === "completed" && (
          <Button size="sm" variant="outline" onClick={onControl}><BarChart3 className="h-3.5 w-3.5" />Resultados</Button>
        )}
        <Button size="sm" variant="outline" onClick={onEdit}><Settings className="h-3.5 w-3.5" />Editar</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" aria-label="Mais ações"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onSplit && (
              <DropdownMenuItem onClick={onSplit}><Scissors className="h-3.5 w-3.5 mr-2" />Dividir</DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onDuplicate}><Copy className="h-3.5 w-3.5 mr-2" />Duplicar</DropdownMenuItem>
            <DropdownMenuItem onClick={onShare}><Share2 className="h-3.5 w-3.5 mr-2" />Enviar para professor</DropdownMenuItem>
            <DropdownMenuItem onClick={onArchive}>
              {archived ? <ArchiveRestore className="h-3.5 w-3.5 mr-2" /> : <Archive className="h-3.5 w-3.5 mr-2" />}
              {archived ? "Desarquivar" : "Arquivar"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setConfirmDelete(true)} className="text-destructive focus:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" />Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta sala?</AlertDialogTitle>
            <AlertDialogDescription>
              Participantes, formulários e respostas da sala são apagados. Esta ação não pode ser desfeita. Para guardar a sala sem apagar, use Arquivar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
