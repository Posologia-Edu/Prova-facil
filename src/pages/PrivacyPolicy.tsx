import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LandingFooter } from "@/components/LandingFooter";
import { GraduationCap, ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl font-extrabold text-foreground mb-2">Política de Privacidade</h1>
          <p className="text-sm text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed rounded-xl border bg-card p-6 md:p-8">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">1. Informações que Coletamos</h2>
              <p>Coletamos informações que você fornece diretamente ao criar sua conta (nome, e-mail, instituição) e dados gerados pelo uso da plataforma (questões criadas, provas aplicadas, resultados de alunos).</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">2. Como Usamos suas Informações</h2>
              <p>Utilizamos seus dados para: fornecer e melhorar nossos serviços, personalizar sua experiência, processar pagamentos, enviar comunicações sobre o serviço e gerar análises agregadas de uso da plataforma.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">3. Compartilhamento de Dados</h2>
              <p>Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros para fins de marketing. Dados podem ser compartilhados apenas com processadores de pagamento para completar transações e com serviços essenciais para o funcionamento da plataforma.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">4. Dados dos Alunos</h2>
              <p>Os dados dos alunos (nome, e-mail, respostas de provas) são armazenados de forma segura e acessíveis apenas pelo professor responsável. Não utilizamos dados de alunos para fins de marketing ou publicidade.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">5. Segurança dos Dados</h2>
              <p>Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados, incluindo criptografia em trânsito (HTTPS), controle de acesso baseado em função e isolamento de dados entre usuários.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">6. Retenção de Dados</h2>
              <p>Seus dados são mantidos enquanto sua conta estiver ativa. Ao solicitar a exclusão da conta, todos os seus dados serão removidos permanentemente em até 30 dias, exceto quando a retenção for exigida por lei.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">7. Seus Direitos</h2>
              <p>Você tem direito a: acessar seus dados pessoais, solicitar correção de dados incorretos, solicitar exclusão de seus dados, exportar seus dados e revogar consentimento a qualquer momento.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">8. Uso de Inteligência Artificial</h2>
              <p>Utilizamos IA para geração de questões e correção automática. Os dados enviados aos modelos de IA são processados de forma segura e não são utilizados para treinamento de modelos. Os resultados gerados são armazenados apenas na sua conta.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">9. Alterações nesta Política</h2>
              <p>Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas através da plataforma ou por e-mail.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">10. Contato</h2>
              <p>Para questões sobre privacidade, entre em contato através da nossa <Link to="/contato-publico" className="text-secondary hover:underline">página de contato</Link>.</p>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
