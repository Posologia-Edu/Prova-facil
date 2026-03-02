import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/use-subscription";
import { Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface PremiumGateProps {
  feature: string;
  children: React.ReactNode;
  /** If true, renders inline alert instead of replacing children */
  inline?: boolean;
}

export function PremiumGate({ feature, children, inline }: PremiumGateProps) {
  const { isPremium, isLoading } = useSubscription();
  const navigate = useNavigate();

  if (isLoading || isPremium) return <>{children}</>;

  const upgradeBlock = (
    <Alert className="border-primary/30 bg-primary/5">
      <Lock className="h-4 w-4 text-primary" />
      <AlertTitle className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-primary" />
        Recurso Premium
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <strong>{feature}</strong> está disponível apenas no plano Premium.
        </p>
        <Button size="sm" onClick={() => navigate("/pricing")}>
          <Crown className="h-3.5 w-3.5 mr-1.5" />
          Ver Planos
        </Button>
      </AlertDescription>
    </Alert>
  );

  if (inline) {
    return (
      <>
        {upgradeBlock}
        {children}
      </>
    );
  }

  return upgradeBlock;
}

interface UsageLimitGateProps {
  current: number;
  limit: number;
  featureLabel: string;
  children: React.ReactNode;
}

export function UsageLimitGate({ current, limit, featureLabel, children }: UsageLimitGateProps) {
  const { isPremium, isLoading } = useSubscription();
  const navigate = useNavigate();

  if (isLoading || isPremium || current < limit) return <>{children}</>;

  return (
    <Alert className="border-primary/30 bg-primary/5">
      <Lock className="h-4 w-4 text-primary" />
      <AlertTitle className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-primary" />
        Limite atingido
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Você atingiu o limite de <strong>{limit} {featureLabel}</strong> no plano gratuito ({current}/{limit}).
          Faça upgrade para uso ilimitado.
        </p>
        <Button size="sm" onClick={() => navigate("/pricing")}>
          <Crown className="h-3.5 w-3.5 mr-1.5" />
          Ver Planos
        </Button>
      </AlertDescription>
    </Alert>
  );
}
