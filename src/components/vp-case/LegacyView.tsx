import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

interface LegacyRow {
  name: string;
  age: number;
  profession: string;
  description: string;
  category: string;
  system_prompt: string;
  clinical_case: any;
  is_legacy: boolean;
}

const bullets = (title: string, items?: string[]) =>
  items && items.length > 0 ? (
    <div>
      <p className="text-sm font-medium mb-1">{title}</p>
      <ul className="list-disc pl-5 space-y-1 text-sm">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  ) : null;

/** Visão somente leitura dos casos no formato antigo (os 10 legados e casos gerados antes do esquema v2). */
export function LegacyView({ row }: { row: LegacyRow }) {
  const c = row.clinical_case || {};
  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {row.is_legacy ? "Caso legado" : "Caso no formato antigo"}: somente leitura. Ele não tem roteiro em níveis de revelação nem gabarito por profissão, que existem apenas nos casos do formato novo.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumo clínico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{row.category}</Badge>
            <Badge variant="secondary">{row.description}</Badge>
          </div>
          {c.expectation && <p className="text-sm italic">"{c.expectation}"</p>}
          {c.vitals && <p className="text-xs text-muted-foreground">{c.vitals}</p>}
          {bullets("História", c.history)}
          {bullets("Medicamentos", c.medications)}
          {c.physicalExam && (
            <div>
              <p className="text-sm font-medium mb-1">Exame físico</p>
              <p className="text-sm">{c.physicalExam}</p>
            </div>
          )}
          {bullets("Comportamento do paciente", c.behaviors)}
          {bullets("Foco de aprendizagem", c.learningFocus)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Roteiro do paciente (texto usado pela IA)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-xs leading-relaxed max-h-[480px] overflow-y-auto rounded-md bg-muted p-3">{row.system_prompt}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
