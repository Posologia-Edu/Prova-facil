import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DOC_V2_CRITERIOS, type DevolutivaDoc } from "@/lib/doc-v2-rubrica";

/** Devolutiva da Documentação v2 ao aluno: aparece só depois que o professor confirma a nota e libera. */
export default function DocV2Devolutiva({ accessCode, email }: { accessCode: string; email: string }) {
  const [dev, setDev] = useState<DevolutivaDoc | null>(null);
  const [lendo, setLendo] = useState(true);

  useEffect(() => {
    let vivo = true;
    supabase.functions.invoke("doc-v2-devolutiva", { body: { access_code: accessCode, email } })
      .then(({ data, error }) => { if (vivo && !error && data && !data.error) setDev(data as DevolutivaDoc); })
      .finally(() => { if (vivo) setLendo(false); });
    return () => { vivo = false; };
  }, [accessCode, email]);

  if (lendo) return <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Verificando a devolutiva...</CardContent></Card>;
  if (!dev?.liberada) {
    return <Card><CardContent className="py-8 text-center"><CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-success" /><p className="font-medium">Documentação enviada.</p><p className="text-sm text-muted-foreground">A devolutiva aparece aqui quando o professor liberar. Volte a entrar com o mesmo PIN e e-mail.</p></CardContent></Card>;
  }
  const criterios = DOC_V2_CRITERIOS.filter((c) => dev.criterios && c.id in dev.criterios);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg font-medium">Devolutiva da sua dupla</CardTitle>
        {dev.nota_final != null && <p className="text-sm">Nota final: <b>{dev.nota_final.toFixed(2).replace(".", ",")}</b> / 10 <span className="text-muted-foreground">(80% rubrica{dev.revisao_nota != null ? " + 20% revisão do colega" : "; sem revisão recebida, vale só a rubrica"})</span></p>}
        {dev.nota != null && <p className="text-sm text-muted-foreground">Rubrica do professor: {dev.nota.toFixed(2).replace(".", ",")}{dev.revisao_nota != null ? ` · revisão do colega: ${dev.revisao_nota.toFixed(2).replace(".", ",")}` : ""}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        {dev.comentario && <p className="rounded-lg bg-muted/40 p-3 text-sm">{dev.comentario}</p>}
        {dev.revisao_comentario && <p className="rounded-lg bg-muted/40 p-3 text-sm"><b>Comentário do colega que revisou:</b> {dev.revisao_comentario}</p>}
        {(dev.alertas || []).length > 0 && (
          <div className="space-y-1 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" />Riscos para o paciente nos seus documentos</p>
            <ul className="list-disc pl-5">{dev.alertas!.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>
        )}
        <ul className="space-y-3">
          {criterios.map((c) => {
            const n = dev.criterios![c.id];
            return (
              <li key={c.id} className="space-y-1 text-sm">
                <p className="font-medium">{c.label}</p>
                <p><b>{n === "__na__" ? "Não se aplica" : `${n} de 4`}</b>{dev.justificativas?.[c.id] ? <span className="text-muted-foreground"> · {dev.justificativas[c.id]}</span> : null}</p>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
