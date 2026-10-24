import * as React from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** rótulo curto acima do título (ex.: o grupo do menu: "Praticar") */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** botões da página; só um deve ser o primário */
  actions?: React.ReactNode;
}

// Cabeçalho único das páginas: título em serifa, descrição curta e as ações alinhadas à direita.
// Todas as telas começam por ele, para o título nascer sempre no mesmo lugar e no mesmo tamanho.
function PageHeader({ eyebrow, title, description, actions, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-6", className)} {...props}>
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-2.5">{eyebrow}</div>}
        <h1 className="font-heading text-[2rem] font-medium leading-[1.1] text-foreground">{title}</h1>
        {description && <p className="mt-2 max-w-[62ch] text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export { PageHeader };
