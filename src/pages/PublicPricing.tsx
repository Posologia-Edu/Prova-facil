import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LandingFooter } from "@/components/LandingFooter";
import { FREE_LIMITS } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  GraduationCap, ArrowLeft, ArrowRight, Check, X, Crown, Zap, Loader2
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  const handleSubscribe = async () => {
    setLoadingCheckout(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // User not logged in — redirect to auth with return intent
        navigate("/auth?tab=signup&redirect=premium");
        return;
      }
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Não foi possível iniciar o checkout.", variant: "destructive" });
    } finally {
      setLoadingCheckout(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold text-primary">ProvaFácil</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="sm">Entrar</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-extrabold mb-4 tracking-tight">Planos e Preços</h1>
          <p className="text-muted-foreground mb-12 text-lg">
            Comece gratuitamente e faça upgrade quando precisar de mais recursos.
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl"><Zap className="h-5 w-5" /> Gratuito</CardTitle>
                <CardDescription>Para experimentar o ProvaFácil</CardDescription>
                <p className="text-3xl font-bold mt-2">R$ 0<span className="text-sm text-muted-foreground font-normal">/mês</span></p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {features.map((f) => (
                    <li key={f.name} className="flex items-center justify-between text-sm">
                      <span>{f.name}</span>
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
            <Card className="border-2 border-secondary shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl"><Crown className="h-5 w-5 text-secondary" /> Premium</CardTitle>
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
                <Button
                  onClick={handleSubscribe}
                  disabled={loadingCheckout}
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2"
                >
                  {loadingCheckout ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Crown className="h-4 w-4" />
                  )}
                  {loadingCheckout ? "Redirecionando..." : "Assinar Premium"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
