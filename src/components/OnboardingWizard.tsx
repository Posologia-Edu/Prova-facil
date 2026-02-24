import { CheckCircle2, Circle, GraduationCap, Library, FileEdit, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

const steps = [
  {
    key: "class",
    icon: GraduationCap,
    titleKey: "onboarding_step1",
    descKey: "onboarding_step1_desc",
    link: "/classes",
  },
  {
    key: "questions",
    icon: Library,
    titleKey: "onboarding_step2",
    descKey: "onboarding_step2_desc",
    link: "/questions",
  },
  {
    key: "exam",
    icon: FileEdit,
    titleKey: "onboarding_step3",
    descKey: "onboarding_step3_desc",
    link: "/composer",
  },
  {
    key: "publish",
    icon: Globe,
    titleKey: "onboarding_step4",
    descKey: "onboarding_step4_desc",
    link: "/exams",
  },
];

export function OnboardingWizard() {
  const { t } = useLanguage();

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          🎉 {t("onboarding_title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("onboarding_subtitle")}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((step, i) => (
            <Link
              key={step.key}
              to={step.link}
              className="flex items-start gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors group"
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <step.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">
                  {i + 1}. {t(step.titleKey)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{t(step.descKey)}</p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
