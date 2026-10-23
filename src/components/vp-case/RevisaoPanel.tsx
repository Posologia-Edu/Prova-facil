import { useState } from "react";
import { ChevronDown, ChevronUp, ClipboardCheck, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { RevisaoCaso } from "@/lib/vp-case-schema";

const GRAVIDADE: Record<string, { label: string; variant: "destructive" | "secondary" | "outline" }> = {
  alta: { label: "Alta", variant: "destructive" },
  media: { label: "Média", variant: "secondary" },
  baixa: { label: "Baixa", variant: "outline" },
};

interface Props {
  revisao: RevisaoCaso;
  canEdit: boolean;
  /** há alterações não salvas: a nova revisão leria o caso salvo, sem elas */
  dirty: boolean;
  rerunning: boolean;
  onToggle: (index: number, resolvido: boolean) => void;
  onRerun: () => void;
}

// Revisão de consistência feita pela IA na geração. Fica salva dentro do caso; o docente marca cada ponto como
// resolvido depois de corrigir no editor (a marcação vai junto com "Salvar rascunho").
export function RevisaoPanel({ revisao, canEdit, dirty, rerunning, onToggle, onRerun }: Props) {
  const pendentes = revisao.problemas.filter((p) => !p.resolvido).length;
  const [open, setOpen] = useState(pendentes > 0);
  const data = revisao.gerada_em ? new Date(revisao.gerada_em).toLocaleString("pt-BR") : "";

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <button type="button" className="flex items-center gap-2 text-left" onClick={() => setOpen((v) => !v)}>
            <ClipboardCheck className="h-4 w-4 text-primary shrink-0" />
            <span className="font-medium text-sm">Revisão de consistência</span>
            <Badge variant={pendentes > 0 ? "secondary" : "outline"}>
              {revisao.problemas.length === 0
                ? "Nenhum ponto"
                : pendentes > 0 ? `${pendentes} de ${revisao.problemas.length} pendente(s)` : "Tudo resolvido"}
            </Badge>
            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {canEdit && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRerun}
              disabled={rerunning || dirty}
              title={dirty ? "Salve o rascunho antes: a revisão lê a versão salva do caso." : "Pedir uma nova revisão do caso salvo"}
            >
              {rerunning ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Revisar de novo
            </Button>
          )}
        </div>

        {open && (
          <div className="space-y-3">
            {revisao.resumo && <p className="text-sm text-muted-foreground">{revisao.resumo}</p>}
            {revisao.problemas.length > 0 && (
              <ul className="space-y-2">
                {revisao.problemas.map((p, i) => {
                  const g = GRAVIDADE[p.gravidade] || GRAVIDADE.media;
                  return (
                    <li key={i} className={`rounded-md border p-3 text-sm flex gap-3 ${p.resolvido ? "opacity-60" : ""}`}>
                      <Checkbox
                        checked={!!p.resolvido}
                        disabled={!canEdit}
                        onCheckedChange={(c) => onToggle(i, c === true)}
                        className="mt-0.5"
                        aria-label="Marcar como resolvido"
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={g.variant} className="text-[10px]">{g.label}</Badge>
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
            <p className="text-[11px] text-muted-foreground">
              {data && <>Gerada em {data}. </>}A marcação de "resolvido" é salva junto com o rascunho. Só o docente dono do caso vê este painel; os alunos nunca o veem.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
