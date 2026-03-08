import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LandingFooter } from "@/components/LandingFooter";
import { GraduationCap, ArrowLeft } from "lucide-react";

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-card/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-secondary" />
            <span className="text-xl font-bold text-foreground">ProvaFácil</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Início
            </Button>
          </Link>
        </div>
      </nav>

      <section className="flex-1 pt-28 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-3xl font-extrabold text-foreground mb-2">Política de Cookies</h1>
          <p className="text-sm text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed rounded-xl border bg-card p-6 md:p-8">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">1. O que são Cookies</h2>
              <p>Cookies são pequenos arquivos de texto armazenados no seu navegador quando você visita um site. Eles são amplamente utilizados para fazer sites funcionarem de maneira eficiente e fornecer informações aos proprietários do site.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">2. Cookies que Utilizamos</h2>
              <div className="space-y-3 mt-3">
                <div className="rounded-lg bg-muted/50 p-4">
                  <h3 className="font-medium text-foreground mb-1">Cookies Essenciais</h3>
                  <p>Necessários para o funcionamento da plataforma. Incluem cookies de sessão de autenticação e preferências de idioma. Não podem ser desabilitados.</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <h3 className="font-medium text-foreground mb-1">Cookies de Funcionalidade</h3>
                  <p>Permitem lembrar suas preferências (como tema claro/escuro, idioma selecionado) para proporcionar uma experiência personalizada.</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <h3 className="font-medium text-foreground mb-1">Cookies de Desempenho</h3>
                  <p>Coletam informações anônimas sobre como a plataforma é utilizada, ajudando-nos a melhorar o desempenho e a experiência do usuário.</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">3. Cookies de Terceiros</h2>
              <p>Utilizamos serviços de terceiros que podem definir seus próprios cookies, incluindo: processamento de pagamentos (Stripe) e serviços de autenticação. Esses cookies são regidos pelas políticas de privacidade dos respectivos terceiros.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">4. Armazenamento Local (Local Storage)</h2>
              <p>Além de cookies, utilizamos o armazenamento local do navegador para manter dados de sessão e preferências. Esses dados são armazenados apenas no seu dispositivo e não são enviados para servidores externos.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">5. Como Gerenciar Cookies</h2>
              <p>Você pode controlar e gerenciar cookies nas configurações do seu navegador. Note que desabilitar cookies essenciais pode afetar o funcionamento da plataforma. A maioria dos navegadores permite: bloquear todos os cookies, aceitar apenas cookies do site visitado e excluir cookies ao fechar o navegador.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">6. Alterações nesta Política</h2>
              <p>Podemos atualizar esta política de cookies periodicamente para refletir mudanças em nossas práticas ou por motivos legais.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">7. Contato</h2>
              <p>Para dúvidas sobre o uso de cookies, entre em contato através da nossa <Link to="/contato-publico" className="text-secondary hover:underline">página de contato</Link>.</p>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
