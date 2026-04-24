import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Scale } from "lucide-react";

interface Props {
  content: string;
  caseNumber?: string;
  title?: string;
}

/**
 * Premium legal-document style renderer for mock trial processes.
 * Mimics an official judicial publication / electronic case file.
 */
export function LegalProcessRenderer({ content, caseNumber, title }: Props) {
  return (
    <div className="bg-[hsl(var(--background))] rounded-lg border border-border shadow-sm overflow-hidden">
      {/* Letterhead */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center border border-primary/30">
            <Scale className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              Diário da Justiça — Processo Eletrônico
            </p>
            {title && <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>}
          </div>
          {caseNumber && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Autos nº</p>
              <p className="font-mono text-sm font-semibold text-foreground">{caseNumber}</p>
            </div>
          )}
        </div>
      </div>

      {/* Document body — serif typography mimicking judicial publications */}
      <article
        className="px-8 md:px-12 py-10 max-w-none font-serif text-[15px] leading-[1.8] text-foreground
                   [&_h1]:text-center [&_h1]:font-bold [&_h1]:text-xl [&_h1]:uppercase [&_h1]:tracking-wider [&_h1]:mt-8 [&_h1]:mb-4
                   [&_h2]:text-center [&_h2]:font-bold [&_h2]:text-base [&_h2]:uppercase [&_h2]:tracking-wide [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-2
                   [&_h3]:font-semibold [&_h3]:text-[15px] [&_h3]:uppercase [&_h3]:tracking-wide [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-primary
                   [&_p]:mb-4 [&_p]:text-justify [&_p]:indent-8
                   [&_strong]:font-semibold [&_strong]:text-foreground
                   [&_ul]:my-4 [&_ul]:pl-8 [&_ul]:list-disc [&_ul]:space-y-1
                   [&_ol]:my-4 [&_ol]:pl-8 [&_ol]:list-decimal [&_ol]:space-y-1
                   [&_li]:text-justify
                   [&_hr]:my-10 [&_hr]:border-0 [&_hr]:h-px [&_hr]:bg-gradient-to-r [&_hr]:from-transparent [&_hr]:via-border [&_hr]:to-transparent
                   [&_table]:w-full [&_table]:my-6 [&_table]:border-collapse [&_table]:text-sm [&_table]:font-sans
                   [&_th]:bg-muted [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
                   [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2
                   [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-4
                   [&_code]:font-mono [&_code]:text-xs [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </article>

      {/* Footer seal */}
      <div className="border-t border-border bg-muted/30 px-8 py-3 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Documento assinado eletronicamente</span>
        <span className="font-mono">Júri Simulado · Educacional</span>
      </div>
    </div>
  );
}
