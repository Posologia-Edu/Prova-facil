import { GraduationCap, Library, FileEdit, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
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
    <Card className="border-dashed p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-lg font-medium">{t("onboarding_title")}</h2>
        <span className="text-xs text-muted-foreground">Aparece só para contas novas</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t("onboarding_subtitle")}</p>
      <div className="my-4 flex gap-1.5" aria-hidden>
        {steps.map((s, i) => (
          <span key={s.key} className={`h-1.5 flex-1 rounded-full ${i === 0 ? "bg-highlight" : "bg-muted"}`} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <Link
            key={step.key}
            to={step.link}
            className="group flex items-start gap-3 rounded-card border bg-card p-3 transition-colors hover:bg-muted/50"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-text">
              <step.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium group-hover:text-primary">
                {i + 1}. {t(step.titleKey)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t(step.descKey)}</p>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
