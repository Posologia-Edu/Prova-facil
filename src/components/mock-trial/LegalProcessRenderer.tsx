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
        className="px-8 md:px-14 py-12 max-w-none font-serif text-[15.5px] leading-[1.95] text-foreground
                   [&_h1]:text-center [&_h1]:font-bold [&_h1]:text-2xl [&_h1]:uppercase [&_h1]:tracking-[0.15em] [&_h1]:mt-10 [&_h1]:mb-6 [&_h1]:text-primary
                   [&_h2]:text-center [&_h2]:font-bold [&_h2]:text-lg [&_h2]:uppercase [&_h2]:tracking-[0.12em] [&_h2]:mt-12 [&_h2]:mb-5 [&_h2]:pb-3 [&_h2]:border-b-2 [&_h2]:border-primary/30 [&_h2]:text-primary
                   [&_h3]:font-semibold [&_h3]:text-base [&_h3]:uppercase [&_h3]:tracking-wider [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-foreground/90 [&_h3]:border-l-4 [&_h3]:border-primary/60 [&_h3]:pl-3
                   [&_h4]:font-semibold [&_h4]:text-[15px] [&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-foreground/80
                   [&_p]:mb-5 [&_p]:text-justify [&_p]:indent-10 [&_p]:hyphens-auto
                   [&_strong]:font-semibold [&_strong]:text-primary
                   [&_em]:italic [&_em]:text-foreground/85
                   [&_ul]:my-5 [&_ul]:pl-10 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:marker:text-primary
                   [&_ol]:my-5 [&_ol]:pl-10 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:marker:text-primary [&_ol]:marker:font-semibold
                   [&_li]:text-justify [&_li]:pl-2
                   [&_li>p]:indent-0 [&_li>p]:mb-2
                   [&_hr]:my-12 [&_hr]:border-0 [&_hr]:h-px [&_hr]:bg-gradient-to-r [&_hr]:from-transparent [&_hr]:via-primary/40 [&_hr]:to-transparent
                   [&_table]:w-full [&_table]:my-8 [&_table]:border-collapse [&_table]:text-[13px] [&_table]:font-sans [&_table]:shadow-sm [&_table]:rounded-md [&_table]:overflow-hidden
                   [&_thead]:bg-primary/10
                   [&_th]:bg-primary/10 [&_th]:border [&_th]:border-primary/20 [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-primary [&_th]:uppercase [&_th]:text-[11px] [&_th]:tracking-wider
                   [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-top
                   [&_tbody_tr:nth-child(even)]:bg-muted/30
                   [&_blockquote]:border-l-4 [&_blockquote]:border-primary/50 [&_blockquote]:pl-5 [&_blockquote]:py-2 [&_blockquote]:my-6 [&_blockquote]:bg-muted/30 [&_blockquote]:italic [&_blockquote]:text-foreground/85 [&_blockquote]:rounded-r-md
                   [&_blockquote_p]:indent-0
                   [&_code]:font-mono [&_code]:text-xs [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-primary
                   [&_img]:my-6 [&_img]:mx-auto [&_img]:rounded-md [&_img]:shadow-md [&_img]:max-h-[520px] [&_img]:border [&_img]:border-border
                   [&_img+em]:block [&_img+em]:text-center [&_img+em]:text-xs [&_img+em]:text-muted-foreground [&_img+em]:mt-2"
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
