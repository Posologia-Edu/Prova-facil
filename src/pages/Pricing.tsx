import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription, FREE_LIMITS } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, X, Crown, Zap, ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";

export default function Pricing() {
  const { t } = useLanguage();
  const { isPremium, subscriptionEnd, isLoading, checkSubscription } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const navigate = useNavigate();

  const features = [
    { name: t("pricing_questions_month"), free: `${FREE_LIMITS.questionsPerMonth}`, premium: t("pricing_unlimited") },
    { name: t("pricing_exams_month"), free: `${FREE_LIMITS.examsPerMonth}`, premium: t("pricing_unlimited") },
    { name: t("pricing_pdf_export"), free: false, premium: true },
    { name: t("pricing_online_exams"), free: false, premium: true },
    { name: t("pricing_students_exam"), free: `${FREE_LIMITS.studentsPerExam}`, premium: t("pricing_unlimited") },
    { name: t("pricing_ai_grading"), free: false, premium: true },
    { name: t("pricing_realtime_monitor"), free: false, premium: true },
    { name: t("pricing_priority_support"), free: false, premium: true },
  ];

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setPortalLoading(false);
    }
  };

  const renderFeatureValue = (value: string | boolean) => {
    if (typeof value === "boolean") {
      return value ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground/40" />;
    }
    return <span className="text-sm font-medium">{value}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("pricing_back")}
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t("pricing_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("pricing_subtitle")}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <Card className={`relative ${!isPremium ? "border-primary" : ""}`}>
          {!isPremium && <Badge className="absolute -top-3 left-6" variant="outline">{t("pricing_current_plan")}</Badge>}
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />{t("pricing_free")}</CardTitle>
            <CardDescription>{t("pricing_free_desc")}</CardDescription>
            <p className="text-3xl font-bold mt-2">R$ 0<span className="text-sm text-muted-foreground font-normal">{t("pricing_month")}</span></p>
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
              <p className="text-xs text-muted-foreground text-center w-full">{t("pricing_current_plan")}</p>
            ) : (
              <Button variant="outline" className="w-full" disabled>{t("pricing_basic_plan")}</Button>
            )}
          </CardFooter>
        </Card>

        <Card className={`relative ${isPremium ? "border-primary shadow-lg" : "border-secondary/50"}`}>
          {isPremium && <Badge className="absolute -top-3 left-6">{t("pricing_current_plan")}</Badge>}
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-secondary" />{t("pricing_premium")}</CardTitle>
            <CardDescription>{t("pricing_premium_desc")}</CardDescription>
            <p className="text-3xl font-bold mt-2">R$ 29,90<span className="text-sm text-muted-foreground font-normal">{t("pricing_month")}</span></p>
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
                  {t("pricing_active_until")} {subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString() : "—"}
                </p>
                <Button variant="outline" className="w-full" onClick={handleManage} disabled={portalLoading}>
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                  {t("pricing_manage")}
                </Button>
              </>
            ) : (
              <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={handleCheckout} disabled={checkoutLoading || isLoading}>
                {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
                {t("pricing_subscribe")}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      <div className="max-w-4xl">
        <Separator className="my-4" />
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{t("pricing_not_sure")}</p>
          <Button variant="ghost" size="sm" onClick={checkSubscription}>{t("pricing_refresh")}</Button>
        </div>
      </div>
    </div>
  );
}
