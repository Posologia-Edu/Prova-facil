import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

const PREMIUM_PRODUCT_ID = "prod_TzvUGnyBqiwcv3";

// Free plan limits
export const FREE_LIMITS = {
  questionsPerMonth: 5,
  examsPerMonth: 1,
  studentsPerExam: 10,
};

interface SubscriptionState {
  isLoading: boolean;
  isPremium: boolean;
  subscriptionEnd: string | null;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionState>({
  isLoading: true,
  isPremium: false,
  subscriptionEnd: null,
  checkSubscription: async () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsPremium(false);
        setSubscriptionEnd(null);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription");

      if (error) {
        console.error("Error checking subscription:", error);
        setIsLoading(false);
        return;
      }

      setIsPremium(data?.subscribed === true && data?.product_id === PREMIUM_PRODUCT_ID);
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
    <SubscriptionContext.Provider value={{ isLoading, isPremium, subscriptionEnd, checkSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
