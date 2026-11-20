import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NARANJO_PERGUNTAS, ROTULO_NARANJO, type CampoExtra, type EsquemaExtra, type RespostaNaranjo } from "@/lib/doc-v2-extras";

type Props = { esquema: EsquemaExtra; valor: Record<string, any>; onChange: (v: Record<string, any>) => void; desabilitado?: boolean };

const SELECT = "h-10 w-full rounded-md border border-input bg-background px-2 text-sm";

/** Renderizador único dos documentos extras: lê o esquema (campos) e edita um objeto de respostas. */
export default function DocV2ExtraForm({ esquema, valor, onChange, desabilitado }: Props) {
  const set = (id: string, v: unknown) => onChange({ ...valor, [id]: v });
  const id = (c: CampoExtra) => `x-${esquema.id}-${c.id}`;

  const campo = (c: CampoExtra) => {
    switch (c.tipo) {
      case "secao":
        return <h4 key={c.id} className="pt-2 text-sm font-semibold">{c.rotulo}</h4>;
      case "texto":
      case "data":
        return <div key={c.id} className="space-y-1"><Label htmlFor={id(c)} className="text-xs">{c.rotulo}</Label><Input id={id(c)} type={c.tipo === "data" ? "date" : "text"} placeholder={"placeholder" in c ? c.placeholder : undefined} value={valor[c.id] ?? ""} onChange={(e) => set(c.id, e.target.value)} /></div>;
      case "area":
        return <div key={c.id} className="space-y-1"><Label htmlFor={id(c)} className="text-xs">{c.rotulo}</Label><Textarea id={id(c)} rows={3} placeholder={c.placeholder} value={valor[c.id] ?? ""} onChange={(e) => set(c.id, e.target.value)} /></div>;
      case "select":
        return (
          <div key={c.id} className="space-y-1"><Label htmlFor={id(c)} className="text-xs">{c.rotulo}</Label>
            <select id={id(c)} value={valor[c.id] ?? ""} onChange={(e) => set(c.id, e.target.value)} className={SELECT}>
              <option value="">Escolha</option>{c.opcoes.map((o) => <option key={o.v} value={o.v}>{o.r}</option>)}
            </select>
          </div>
        );
      case "tabela": {
        const linhas: Record<string, string>[] = Array.isArray(valor[c.id]) && valor[c.id].length ? valor[c.id] : [{}];
        const mudar = (i: number, col: string, v: string) => set(c.id, linhas.map((l, j) => (j === i ? { ...l, [col]: v } : l)));
        return (
          <div key={c.id} className="space-y-2"><p className="text-xs font-medium">{c.rotulo}</p>
            {linhas.map((l, i) => (
              <div key={i} className="grid gap-2 rounded border p-2 sm:grid-cols-2">
                {c.colunas.map((k) => <Input key={k.id} aria-label={`${c.rotulo}, ${k.rotulo}, linha ${i + 1}`} placeholder={k.rotulo} value={l[k.id] ?? ""} onChange={(e) => mudar(i, k.id, e.target.value)} />)}
                <Button type="button" variant="ghost" size="sm" className="justify-self-end sm:col-span-2" aria-label={`Remover linha ${i + 1} de ${c.rotulo}`} onClick={() => set(c.id, linhas.filter((_, j) => j !== i))}><Trash2 className="mr-1 h-3.5 w-3.5" />Remover</Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => set(c.id, [...linhas, {}])}><Plus className="mr-1 h-3.5 w-3.5" />Adicionar linha</Button>
          </div>
        );
      }
      case "naranjo": {
        const resp: Record<string, RespostaNaranjo> = valor[c.id] && typeof valor[c.id] === "object" ? valor[c.id] : {};
        const respondidas = NARANJO_PERGUNTAS.filter((q) => resp[q.id]).length;
        return (
          <div key={c.id} className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <p className="text-xs font-medium">{c.rotulo}: responda as 10 perguntas e depois some os pontos</p>
            {NARANJO_PERGUNTAS.map((q, i) => (
              <div key={q.id} className="space-y-1">
                <p className="text-sm">{i + 1}. {q.texto}</p>
                <div className="flex gap-1">
                  {([["sim", "Sim"], ["nao", "Não"], ["nsei", "Não sei"]] as const).map(([v, r]) => (
                    <Button key={v} type="button" size="sm" variant={resp[q.id] === v ? "default" : "outline"} aria-label={`Pergunta ${i + 1}: ${r}`} onClick={() => set(c.id, { ...resp, [q.id]: v })}>{r}</Button>
                  ))}
                </div>
              </div>
            ))}
            <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Tabela de pontos</summary>
              <ul className="mt-1 list-disc pl-5">{NARANJO_PERGUNTAS.map((q, i) => <li key={q.id}>{i + 1}: sim {q.pontos.sim > 0 ? "+" : ""}{q.pontos.sim}, não {q.pontos.nao > 0 ? "+" : ""}{q.pontos.nao}, não sei 0</li>)}</ul>
              <p className="mt-1">{(Object.keys(ROTULO_NARANJO) as (keyof typeof ROTULO_NARANJO)[]).map((k) => ROTULO_NARANJO[k]).join(" · ")}</p>
            </details>
            <p className="text-xs text-muted-foreground">{respondidas} de 10 respondidas. A soma e a categoria você informa nos campos abaixo; o sistema só avisa se não baterem com as suas respostas.</p>
          </div>
        );
      }
    }
  };

  return <fieldset disabled={desabilitado} className="space-y-3">{esquema.campos.map(campo)}</fieldset>;
}
