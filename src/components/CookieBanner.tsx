import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { useLanguage } from "@/i18n/LanguageContext";
import { CookiePreferencesDialog } from "./CookiePreferencesDialog";

const copy = {
  pt: { title: "Preferências de cookies", detail: "Usamos cookies para analisar o tráfego e personalizar conteúdo.", policy: "Política de cookies", accept: "Aceitar todos", essential: "Só essenciais", settings: "Personalizar" },
  en: { title: "Cookie preferences", detail: "We use cookies to analyze traffic and personalize content.", policy: "Cookie policy", accept: "Accept all", essential: "Essential only", settings: "Customize" },
  es: { title: "Preferencias de cookies", detail: "Usamos cookies para analizar el tráfico y personalizar el contenido.", policy: "Política de cookies", accept: "Aceptar todas", essential: "Solo esenciales", settings: "Personalizar" },
};

export function CookieBanner() {
  const { consentGiven, acceptAll, rejectNonEssential } = useCookieConsent();
  const [showPreferences, setShowPreferences] = useState(false);
  const { language } = useLanguage();
  const c = copy[language];
  if (consentGiven) return null;

  return (
    <>
      <section aria-label={c.title} lang={language}
        className="pf-cookie-notice fixed bottom-2 left-2 right-2 z-[100] rounded-xl border bg-card p-3 text-card-foreground shadow-2xl sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-[415px] sm:p-4">
        <h2 className="font-sans text-sm font-semibold">{c.title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {c.detail} <Link to="/cookies" className="underline underline-offset-2">{c.policy}</Link>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <Button size="sm" variant="outline" onClick={acceptAll} className="px-2.5">{c.accept}</Button>
          <Button size="sm" variant="outline" onClick={rejectNonEssential} className="px-2.5">{c.essential}</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowPreferences(true)} className="px-2">{c.settings}</Button>
        </div>
      </section>
      <CookiePreferencesDialog open={showPreferences} onOpenChange={setShowPreferences} />
    </>
  );
}
