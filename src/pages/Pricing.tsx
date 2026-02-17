import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription, FREE_LIMITS } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  X,
  Crown,
  Zap,
  ArrowLeft,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

const features = [
  { name: "Questões com IA por mês", free: `${FREE_LIMITS.questionsPerMonth}`, premium: "Ilimitado" },
  { name: "Provas por mês", free: `${FREE_LIMITS.examsPerMonth}`, premium: "Ilimitado" },
  { name: "Exportação PDF", free: false, premium: true },
  { name: "Provas online", free: false, premium: true },
  { name: "Alunos por prova", free: `${FREE_LIMITS.studentsPerExam}`, premium: "Ilimitado" },
  { name: "Correção por IA", free: false, premium: true },
  { name: "Monitoramento em tempo real", free: false, premium: true },
  { name: "Suporte prioritário", free: false, premium: true },
];

export default function Pricing() {
  const { isPremium, subscriptionEnd, isLoading, checkSubscription } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const navigate = useNavigate();

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar checkout.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao abrir portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  const renderFeatureValue = (value: string | boolean) => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground/40" />
      );
    }
    return <span className="text-sm font-medium">{value}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Planos e Assinatura</h1>
          <p className="text-sm text-muted-foreground">Escolha o plano ideal para você</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        {/* Free Plan */}
        <Card className={`relative ${!isPremium ? "border-primary" : ""}`}>
          {!isPremium && (
            <Badge className="absolute -top-3 left-6" variant="outline">Seu plano</Badge>
          )}
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Gratuito
            </CardTitle>
            <CardDescription>Para começar a criar provas</CardDescription>
            <p className="text-3xl font-bold mt-2">R$ 0<span className="text-sm text-muted-foreground font-normal">/mês</span></p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {features.map((f) => (
                <li key={f.name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{f.name}</span>
                  {renderFeatureValue(f.free)}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            {!isPremium ? (
              <p className="text-xs text-muted-foreground text-center w-full">Plano atual</p>
            ) : (
              <Button variant="outline" className="w-full" disabled>
                Plano básico
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Premium Plan */}
        <Card className={`relative ${isPremium ? "border-primary shadow-lg" : "border-secondary/50"}`}>
          {isPremium && (
            <Badge className="absolute -top-3 left-6">Seu plano</Badge>
          )}
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-secondary" />
              Premium
            </CardTitle>
            <CardDescription>Acesso completo a todas as funcionalidades</CardDescription>
            <p className="text-3xl font-bold mt-2">R$ 29,90<span className="text-sm text-muted-foreground font-normal">/mês</span></p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {features.map((f) => (
                <li key={f.name} className="flex items-center justify-between text-sm">
                  <span>{f.name}</span>
                  {renderFeatureValue(f.premium)}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            {isPremium ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Ativo até {subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString("pt-BR") : "—"}
                </p>
                <Button variant="outline" className="w-full" onClick={handleManage} disabled={portalLoading}>
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                  Gerenciar assinatura
                </Button>
              </>
            ) : (
              <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={handleCheckout} disabled={checkoutLoading || isLoading}>
                {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
                Assinar Premium
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      <div className="max-w-4xl">
        <Separator className="my-4" />
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Não tem certeza? Comece gratuitamente e atualize quando quiser.
          </p>
          <Button variant="ghost" size="sm" onClick={checkSubscription}>
            Atualizar status
          </Button>
        </div>
      </div>
    </div>
  );
}
