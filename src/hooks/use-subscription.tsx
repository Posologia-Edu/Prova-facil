import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

const PREMIUM_PRODUCT_ID = "prod_U1kTkTPojtC3x4";

// Free plan limits
export const FREE_LIMITS = {
  questionsPerMonth: 5,
  examsPerMonth: 1,
  studentsPerExam: 10,
};

export type PlanType = "free" | "premium" | "admin";

interface SubscriptionState {
  isLoading: boolean;
  isPremium: boolean;
  isAdmin: boolean;
  plan: PlanType;
  subscriptionEnd: string | null;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionState>({
  isLoading: true,
  isPremium: false,
  isAdmin: false,
  plan: "free",
  subscriptionEnd: null,
  checkSubscription: async () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [plan, setPlan] = useState<PlanType>("free");
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsPremium(false);
        setIsAdmin(false);
        setPlan("free");
        setSubscriptionEnd(null);
        setIsLoading(false);
        return;
      }

      // Check admin role
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (adminRole) {
        setIsAdmin(true);
        setIsPremium(true); // admins get all premium features
        setPlan("admin");
        setSubscriptionEnd(null);
        setIsLoading(false);
        return;
      }

      setIsAdmin(false);

      const { data, error } = await supabase.functions.invoke("check-subscription");

      if (error) {
        console.error("Error checking subscription:", error);
        setPlan("free");
        setIsLoading(false);
        return;
      }

      const isInvitedPremium = data?.is_invited === true;
      const hasPremium = isInvitedPremium || (data?.subscribed === true && data?.product_id === PREMIUM_PRODUCT_ID);
      setIsPremium(hasPremium);
      setPlan(hasPremium ? "premium" : "free");
      setSubscriptionEnd(data?.subscription_end || null);
    } catch (err) {
      console.error("Subscription check failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSubscription();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSubscription();
    });

    // Auto-refresh every 60 seconds
    const interval = setInterval(checkSubscription, 60000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [checkSubscription]);

  return (
    <SubscriptionContext.Provider value={{ isLoading, isPremium, isAdmin, plan, subscriptionEnd, checkSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
