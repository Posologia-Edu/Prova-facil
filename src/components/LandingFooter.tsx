import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t bg-card/80">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="h-6 w-6 text-secondary" />
              <span className="text-lg font-bold text-foreground">ProvaFácil</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Plataforma de criação e aplicação de provas para professores, educadores e instituições de ensino.
            </p>
          </div>

          {/* Produto */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">Produto</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/auth?tab=signup" className="text-muted-foreground hover:text-foreground transition-colors">
                  Criar Conta
                </Link>
              </li>
              <li>
                <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors">
                  Entrar
                </Link>
              </li>
              <li>
                <Link to="/planos" className="text-muted-foreground hover:text-foreground transition-colors">
                  Planos
                </Link>
              </li>
              <li>
                <Link to="/funcionalidades" className="text-muted-foreground hover:text-foreground transition-colors">
                  Funcionalidades
                </Link>
              </li>
            </ul>
          </div>

          {/* Recursos */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">Recursos</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/documentacao" className="text-muted-foreground hover:text-foreground transition-colors">
                  Documentação
                </Link>
              </li>
              <li>
                <Link to="/contato-publico" className="text-muted-foreground hover:text-foreground transition-colors">
                  Contato
                </Link>
              </li>
              <li>
                <Link to="/student/auth" className="text-muted-foreground hover:text-foreground transition-colors">
                  Aplicação Online
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/termos" className="text-muted-foreground hover:text-foreground transition-colors">
                  Termos de Serviço
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="text-muted-foreground hover:text-foreground transition-colors">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-muted-foreground hover:text-foreground transition-colors">
                  Política de Cookies
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ProvaFácil. Todos os direitos reservados. — Desenvolvido por Sérgio Araújo, Posologia Produções
          </p>
        </div>
      </div>
    </footer>
  );
}
