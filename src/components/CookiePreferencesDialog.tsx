import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Shield, BarChart3, Settings2, Megaphone } from "lucide-react";
import { useCookieConsent, type CookiePreferences } from "@/hooks/use-cookie-consent";
import { useState, useEffect } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categories = [
  {
    key: "essential" as const,
    icon: Shield,
    title: "Cookies Essenciais",
    description: "Necessários para autenticação, sessão e funcionamento básico da plataforma. Não podem ser desativados.",
    locked: true,
  },
  {
    key: "functionality" as const,
    icon: Settings2,
    title: "Cookies de Funcionalidade",
    description: "Lembram suas preferências como tema, idioma e configurações de layout para uma experiência personalizada.",
    locked: false,
  },
  {
    key: "analytics" as const,
    icon: BarChart3,
    title: "Cookies de Desempenho / Analytics",
    description: "Coletam dados anônimos sobre páginas visitadas, tempo de uso e cliques para melhorar a plataforma.",
    locked: false,
  },
  {
    key: "marketing" as const,
    icon: Megaphone,
    title: "Cookies de Marketing",
    description: "Rastreiam a origem do visitante (UTM), conversões de cadastro e ajudam a medir a eficácia de campanhas.",
    locked: false,
  },
];

export function CookiePreferencesDialog({ open, onOpenChange }: Props) {
  const { preferences, savePreferences } = useCookieConsent();
  const [local, setLocal] = useState<CookiePreferences>(preferences);

  useEffect(() => {
    if (open) setLocal(preferences);
  }, [open, preferences]);

  const handleToggle = (key: keyof CookiePreferences) => {
    if (key === "essential") return;
    setLocal((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    savePreferences(local);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Gerenciar Preferências de Cookies</DialogTitle>
          <DialogDescription>
            Escolha quais categorias de cookies você deseja permitir. Cookies essenciais são sempre necessários.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {categories.map((cat) => (
            <div key={cat.key} className="flex items-start gap-4 rounded-lg border bg-card p-4">
              <div className="mt-0.5 rounded-md bg-muted p-2">
                <cat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-foreground">{cat.title}</h4>
                  <Switch
                    checked={local[cat.key]}
                    onCheckedChange={() => handleToggle(cat.key)}
                    disabled={cat.locked}
                    className="shrink-0"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{cat.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            Salvar Preferências
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
