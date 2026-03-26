import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Accessibility, Volume2, VolumeX, Eye, Type, Space, BookOpen, Keyboard } from "lucide-react";

export interface A11ySettings {
  fontSize: number;
  highContrast: boolean;
  dyslexiaFont: boolean;
  wideSpacing: boolean;
  readingMask: boolean;
  ttsEnabled: boolean;
}

const STORAGE_KEY = "a11y-exam-settings";

const defaultSettings: A11ySettings = {
  fontSize: 16,
  highContrast: false,
  dyslexiaFont: false,
  wideSpacing: false,
  readingMask: false,
  ttsEnabled: false,
};

function loadSettings(): A11ySettings {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {}
  return { ...defaultSettings };
}

function saveSettings(s: A11ySettings) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

interface Props {
  settings: A11ySettings;
  onChange: (s: A11ySettings) => void;
  currentQuestionText?: string;
  currentAlternatives?: Array<{ letter: string; text: string }>;
}

export function useA11ySettings() {
  const [settings, setSettings] = useState<A11ySettings>(loadSettings);

  const updateSettings = useCallback((next: A11ySettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  return [settings, updateSettings] as const;
}

export function getA11yClasses(settings: A11ySettings): string {
  const cls: string[] = [];
  if (settings.highContrast) cls.push("a11y-high-contrast");
  if (settings.dyslexiaFont) cls.push("a11y-dyslexia");
  if (settings.wideSpacing) cls.push("a11y-spacing");
  return cls.join(" ");
}

export function getA11yStyle(settings: A11ySettings): React.CSSProperties {
  return { fontSize: `${settings.fontSize}px` };
}

function speakText(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

function stopSpeech() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

export function ReadingMask() {
  const [y, setY] = useState(0);

  useEffect(() => {
    const handler = (e: MouseEvent) => setY(e.clientY);
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  const maskHeight = 60;
  const top = Math.max(0, y - maskHeight / 2);

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-black/50" style={{ clipPath: `polygon(0 0, 100% 0, 100% ${top}px, 0 ${top}px)` }} />
      <div className="absolute inset-0 bg-black/50" style={{ clipPath: `polygon(0 ${top + maskHeight}px, 100% ${top + maskHeight}px, 100% 100%, 0 100%)` }} />
      <div
        className="absolute left-0 right-0 border-y-2 border-primary/60"
        style={{ top: `${top}px`, height: `${maskHeight}px` }}
      />
    </div>
  );
}

export default function AccessibilityPanel({ settings, onChange, currentQuestionText, currentAlternatives }: Props) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const checkSpeaking = setInterval(() => {
      setIsSpeaking(window.speechSynthesis.speaking);
    }, 200);
    return () => clearInterval(checkSpeaking);
  }, []);

  const handleSpeak = () => {
    if (isSpeaking) {
      stopSpeech();
      return;
    }
    if (!currentQuestionText) return;
    let fullText = currentQuestionText;
    if (currentAlternatives?.length) {
      fullText += ". Alternativas: " + currentAlternatives.map(a => `${a.letter}: ${a.text}`).join(". ");
    }
    speakText(fullText);
  };

  const update = (partial: Partial<A11ySettings>) => {
    onChange({ ...settings, ...partial });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
          className="fixed bottom-4 left-4 z-[9999] h-12 w-12 rounded-full shadow-lg border-2 border-primary/30 hover:scale-105 transition-transform"
          aria-label="Abrir painel de acessibilidade"
        >
          <Accessibility className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[320px] sm:w-[360px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Accessibility className="h-5 w-5 text-primary" />
            Acessibilidade
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Font size */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Tamanho da fonte</Label>
              <span className="ml-auto text-xs font-mono text-muted-foreground">{settings.fontSize}px</span>
            </div>
            <Slider
              value={[settings.fontSize]}
              min={14}
              max={28}
              step={1}
              onValueChange={([v]) => update({ fontSize: v })}
              aria-label="Tamanho da fonte"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>14px</span>
              <span>28px</span>
            </div>
          </div>

          <Separator />

          {/* High contrast */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="a11y-contrast" className="text-sm">Alto contraste</Label>
            </div>
            <Switch
              id="a11y-contrast"
              checked={settings.highContrast}
              onCheckedChange={(v) => update({ highContrast: v })}
            />
          </div>

          {/* Dyslexia font */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="a11y-dyslexia" className="text-sm">Fonte para dislexia</Label>
            </div>
            <Switch
              id="a11y-dyslexia"
              checked={settings.dyslexiaFont}
              onCheckedChange={(v) => update({ dyslexiaFont: v })}
            />
          </div>

          {/* Wide spacing */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Space className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="a11y-spacing" className="text-sm">Espaçamento ampliado</Label>
            </div>
            <Switch
              id="a11y-spacing"
              checked={settings.wideSpacing}
              onCheckedChange={(v) => update({ wideSpacing: v })}
            />
          </div>

          <Separator />

          {/* Reading mask */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="a11y-mask" className="text-sm">Máscara de leitura</Label>
            </div>
            <Switch
              id="a11y-mask"
              checked={settings.readingMask}
              onCheckedChange={(v) => update({ readingMask: v })}
            />
          </div>

          <Separator />

          {/* TTS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Leitura por voz</Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={handleSpeak}
              aria-label={isSpeaking ? "Parar leitura" : "Ler questão atual"}
            >
              {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {isSpeaking ? "Parar leitura" : "Ler questão atual"}
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Usa o sintetizador de voz do navegador (pt-BR).
            </p>
          </div>

          <Separator />

          {/* Keyboard shortcuts info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Atalhos de teclado</Label>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Questão anterior</span>
                <kbd className="bg-background border rounded px-1.5 py-0.5 font-mono text-[10px]">←</kbd>
              </div>
              <div className="flex justify-between">
                <span>Próxima questão</span>
                <kbd className="bg-background border rounded px-1.5 py-0.5 font-mono text-[10px]">→</kbd>
              </div>
              <div className="flex justify-between">
                <span>Selecionar alternativa</span>
                <kbd className="bg-background border rounded px-1.5 py-0.5 font-mono text-[10px]">1-5</kbd>
              </div>
              <div className="flex justify-between">
                <span>Ler questão</span>
                <kbd className="bg-background border rounded px-1.5 py-0.5 font-mono text-[10px]">R</kbd>
              </div>
            </div>
          </div>

          <Separator />

          {/* Reset */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => onChange({ ...defaultSettings })}
          >
            Restaurar padrões
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
