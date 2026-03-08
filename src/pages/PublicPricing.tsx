import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LandingFooter } from "@/components/LandingFooter";
import { FREE_LIMITS } from "@/hooks/use-subscription";
import {
  GraduationCap, ArrowLeft, ArrowRight, Check, X, Crown, Zap
} from "lucide-react";

const features = [
  { name: "Questões por mês", free: `${FREE_LIMITS.questionsPerMonth}`, premium: "Ilimitado" },
  { name: "Provas por mês", free: `${FREE_LIMITS.examsPerMonth}`, premium: "Ilimitado" },
  { name: "Exportação em PDF", free: false, premium: true },
  { name: "Provas online", free: false, premium: true },
  { name: "Alunos por prova", free: `${FREE_LIMITS.studentsPerExam}`, premium: "Ilimitado" },
  { name: "Correção com IA", free: false, premium: true },
  { name: "Monitoramento em tempo real", free: false, premium: true },
  { name: "Suporte prioritário", free: false, premium: true },
];

const renderValue = (value: string | boolean) => {
  if (typeof value === "boolean") {
    return value ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground/40" />;
  }
  return <span className="text-sm font-medium">{value}</span>;
};

export default function PublicPricing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-card/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-secondary" />
            <span className="text-xl font-bold text-foreground">ProvaFácil</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Início
              </Button>
            </Link>
            <Link to="/auth?tab=signup">
              <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                Criar Conta
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <section className="pt-28 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-foreground md:text-5xl">
              Planos e Preços
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Comece gratuitamente e faça upgrade quando precisar de mais recursos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free */}
            <Card className="relative pt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Gratuito
                </CardTitle>
                <CardDescription>Para experimentar o ProvaFácil</CardDescription>
                <p className="text-3xl font-bold mt-2">
                  R$ 0<span className="text-sm text-muted-foreground font-normal">/mês</span>
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {features.map((f) => (
                    <li key={f.name} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{f.name}</span>
                      {renderValue(f.free)}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Link to="/auth?tab=signup" className="w-full">
                  <Button variant="outline" className="w-full gap-2">
                    Começar Grátis
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Premium */}
            <Card className="relative pt-4 border-secondary/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-secondary" />
                  Premium
                </CardTitle>
                <CardDescription>Para professores que precisam de mais</CardDescription>
                <p className="text-3xl font-bold mt-2">
                  R$ 29,90<span className="text-sm text-muted-foreground font-normal">/mês</span>
                </p>
                <p className="text-xs text-green-600 font-medium mt-1">🎉 7 dias grátis para testar • Cancele quando quiser</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {features.map((f) => (
                    <li key={f.name} className="flex items-center justify-between text-sm">
                      <span>{f.name}</span>
                      {renderValue(f.premium)}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Link to="/auth?tab=signup" className="w-full">
                  <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2">
                    <Crown className="h-4 w-4" />
                    Assinar Premium
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
