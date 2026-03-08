import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, Settings2 } from "lucide-react";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { CookiePreferencesDialog } from "./CookiePreferencesDialog";
import { Link } from "react-router-dom";

export function CookieBanner() {
  const { consentGiven, acceptAll, rejectNonEssential } = useCookieConsent();
  const [showPreferences, setShowPreferences] = useState(false);

  if (consentGiven) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6">
        <div className="mx-auto max-w-4xl rounded-2xl border bg-card shadow-2xl p-5 md:p-6">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex shrink-0 rounded-xl bg-secondary/10 p-3">
              <Cookie className="h-6 w-6 text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-foreground mb-1">
                🍪 Utilizamos cookies
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Usamos cookies para melhorar sua experiência, analisar o tráfego e personalizar conteúdo. 
                Você pode aceitar todos, recusar os não essenciais ou personalizar suas preferências. 
                Saiba mais na nossa{" "}
                <Link to="/cookies" className="text-secondary hover:underline font-medium">
                  Política de Cookies
                </Link>.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Button
                  onClick={acceptAll}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  size="sm"
                >
                  Aceitar Todos
                </Button>
                <Button
                  onClick={rejectNonEssential}
                  variant="outline"
                  size="sm"
                >
                  Apenas Essenciais
                </Button>
                <Button
                  onClick={() => setShowPreferences(true)}
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                >
                  <Settings2 className="h-4 w-4" />
                  Personalizar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CookiePreferencesDialog open={showPreferences} onOpenChange={setShowPreferences} />
    </>
  );
}
