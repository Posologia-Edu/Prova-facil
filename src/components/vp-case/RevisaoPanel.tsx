import { ClipboardCheck, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import type { RevisaoCaso } from "@/lib/vp-case-schema";
import { SectionCard } from "./SectionLayout";

const GRAVIDADE: Record<string, { label: string; tone: StatusTone }> = {
  alta: { label: "Alta", tone: "bad" },
  media: { label: "Média", tone: "warn" },
  baixa: { label: "Baixa", tone: "info" },
};

interface Props {
  /** ausente quando o caso ainda não tem revisão salva */
  revisao?: RevisaoCaso;
  canEdit: boolean;
  /** há alterações não salvas: a nova revisão leria o caso salvo, sem elas */
  dirty: boolean;
  rerunning: boolean;
  onToggle: (index: number, resolvido: boolean) => void;
  onRerun: () => void;
}

export const revisaoPendentes = (r?: RevisaoCaso) => (r ? r.problemas.filter((p) => !p.resolvido).length : 0);

// Revisão de consistência feita pela IA na geração. Fica salva dentro do caso; o docente marca cada ponto como
// resolvido depois de corrigir no editor (a marcação vai junto com "Salvar rascunho").
export function RevisaoPanel({ revisao, canEdit, dirty, rerunning, onToggle, onRerun }: Props) {
  const pendentes = revisaoPendentes(revisao);
  const data = revisao?.gerada_em ? new Date(revisao.gerada_em).toLocaleString("pt-BR") : "";
  const total = revisao?.problemas.length ?? 0;

  const badge = !revisao
    ? <StatusBadge tone="neutral">Sem revisão</StatusBadge>
    : total === 0
      ? <StatusBadge tone="ok">Nenhum ponto</StatusBadge>
      : pendentes > 0
        ? <StatusBadge tone="warn">{pendentes} {pendentes === 1 ? "ponto" : "pontos"}</StatusBadge>
        : <StatusBadge tone="ok">Tudo resolvido</StatusBadge>;

  return (
    <SectionCard id="revisao" title="Revisão de consistência" badge={badge} defaultOpen={pendentes > 0}>
      {!revisao && <p className="text-sm text-muted-foreground">Este caso ainda não tem revisão de consistência salva.</p>}

      {revisao?.resumo && <p className="text-sm text-muted-foreground">{revisao.resumo}</p>}

      {revisao && total > 0 && (
        <ul className="divide-y rounded-lg border">
          {revisao.problemas.map((p, i) => {
            const g = GRAVIDADE[p.gravidade] || GRAVIDADE.media;
            return (
              <li key={i} className={`flex gap-3 p-3 text-sm ${p.resolvido ? "opacity-60" : ""}`}>
                <Checkbox
                  checked={!!p.resolvido}
                  disabled={!canEdit}
                  onCheckedChange={(c) => onToggle(i, c === true)}
                  className="mt-0.5"
                  aria-label="Marcar como resolvido"
                />
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={g.tone}>{g.label}</StatusBadge>
                    <span className="text-xs text-muted-foreground">{p.onde}</span>
                  </div>
                  <p className={p.resolvido ? "line-through" : ""}>{p.descricao}</p>
                  {p.sugestao && <p className="text-xs text-muted-foreground"><strong>Sugestão:</strong> {p.sugestao}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {revisao && (
        <p className="text-xs text-muted-foreground">
          {data && <>Gerada em {data}. </>}A marcação de "resolvido" é salva junto com o rascunho. Só o docente dono do caso vê esta revisão; os alunos nunca a veem.
        </p>
      )}

      {canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <span className="text-xs text-muted-foreground">
            {dirty ? "Salve o rascunho antes: a revisão lê a versão salva do caso." : "A revisão lê a versão salva do caso."}
          </span>
          <Button type="button" size="sm" variant="outline" onClick={onRerun} disabled={rerunning || dirty}>
            {rerunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : revisao ? <Sparkles className="h-3.5 w-3.5" /> : <ClipboardCheck className="h-3.5 w-3.5" />}
            {revisao ? "Refazer revisão" : "Fazer revisão agora"}
          </Button>
        </div>
      )}
    </SectionCard>
  );
}
