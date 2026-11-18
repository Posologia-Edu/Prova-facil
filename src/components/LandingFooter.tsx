import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { LANDING_CONTENT } from "@/lib/landing-content";

const labels = {
  pt: { product: "Produto", resources: "Recursos", legal: "Legal", contact: "Contato", terms: "Termos de serviço", privacy: "Política de privacidade", cookies: "Política de cookies", rights: "Todos os direitos reservados.", credit: "Desenvolvido por" },
  en: { product: "Product", resources: "Resources", legal: "Legal", contact: "Contact", terms: "Terms of service", privacy: "Privacy policy", cookies: "Cookie policy", rights: "All rights reserved.", credit: "Developed by" },
  es: { product: "Producto", resources: "Recursos", legal: "Legal", contact: "Contacto", terms: "Términos de servicio", privacy: "Política de privacidad", cookies: "Política de cookies", rights: "Todos los derechos reservados.", credit: "Desarrollado por" },
};

export function LandingFooter({ description }: { description?: string }) {
  const { language, t } = useLanguage();
  const c = LANDING_CONTENT[language];
  const l = labels[language];
  const groups = [
    { title: l.product, links: [[t("auth_create_account"), "/auth?tab=signup"], [t("landing_enter"), "/auth"], [c.nav.plans, "/planos"], [c.nav.features, "/funcionalidades"]] },
    { title: l.resources, links: [[c.nav.docs, "/documentacao"], [l.contact, "/contato-publico"], [c.nav.student, "/student/auth"]] },
    { title: l.legal, links: [[l.terms, "/termos"], [l.privacy, "/privacidade"], [l.cookies, "/cookies"]] },
  ];
  return (
    <footer className="border-t bg-card/80">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-highlight" />
              <span className="text-lg font-bold text-foreground">ProvaFácil</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{description ?? c.footer}</p>
          </div>
          {groups.map(group => <div key={group.title}>
            <h3 className="mb-3 font-semibold text-foreground">{group.title}</h3>
            <ul className="space-y-2 text-sm">{group.links.map(([label, to]) =>
              <li key={to}><Link to={to} className="text-muted-foreground transition-colors hover:text-foreground">{label}</Link></li>
            )}</ul>
          </div>)}
        </div>
        <p className="mt-10 border-t pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ProvaFácil. {l.rights} · {l.credit} Sérgio Araújo, Posologia Produções
        </p>
      </div>
    </footer>
  );
}
