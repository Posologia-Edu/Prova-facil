import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LandingFooter } from "@/components/LandingFooter";
import { GraduationCap, ArrowLeft } from "lucide-react";

export default function TermsOfService() {
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
          <h1 className="text-3xl font-extrabold text-foreground mb-2">Termos de Serviço</h1>
          <p className="text-sm text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed rounded-xl border bg-card p-6 md:p-8">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">1. Aceitação dos Termos</h2>
              <p>Ao acessar e utilizar a plataforma ProvaFácil, você concorda com estes Termos de Serviço. Se você não concorda com qualquer parte destes termos, não utilize a plataforma.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">2. Descrição do Serviço</h2>
              <p>O ProvaFácil é uma plataforma online de criação, gestão e aplicação de provas e avaliações, destinada a professores, educadores e instituições de ensino. Os serviços incluem criação de questões, montagem de provas, aplicação online, correção automática e análise de resultados.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">3. Cadastro e Conta</h2>
              <p>Para utilizar os serviços, é necessário criar uma conta fornecendo informações verdadeiras e atualizadas. Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">4. Planos e Pagamento</h2>
              <p>O ProvaFácil oferece plano gratuito com funcionalidades limitadas e plano premium com acesso completo. Os pagamentos do plano premium são processados mensalmente. O cancelamento pode ser feito a qualquer momento e terá efeito ao final do período já pago.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">5. Propriedade Intelectual</h2>
              <p>Todo o conteúdo criado por você na plataforma (questões, provas, materiais) permanece de sua propriedade. O ProvaFácil não reivindica direitos sobre o conteúdo dos usuários. A plataforma, sua interface, código e marca são propriedade exclusiva do ProvaFácil.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">6. Uso Aceitável</h2>
              <p>Você concorda em não utilizar a plataforma para fins ilegais, não compartilhar conteúdo ofensivo ou discriminatório, não tentar acessar contas de outros usuários e não realizar engenharia reversa do sistema.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">7. Disponibilidade do Serviço</h2>
              <p>O ProvaFácil se esforça para manter o serviço disponível 24/7, mas não garante disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência quando possível.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">8. Limitação de Responsabilidade</h2>
              <p>O ProvaFácil não se responsabiliza por perdas de dados causadas por mau uso, por decisões tomadas com base nos relatórios gerados ou por indisponibilidades temporárias do serviço.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">9. Modificações dos Termos</h2>
              <p>Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações serão comunicadas através da plataforma e entrarão em vigor imediatamente após a publicação.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">10. Contato</h2>
              <p>Para dúvidas sobre estes termos, entre em contato através da nossa <Link to="/contato-publico" className="text-secondary hover:underline">página de contato</Link>.</p>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
