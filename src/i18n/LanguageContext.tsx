import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { translations, LANGUAGE_LABELS, LANGUAGE_FLAGS, type Language } from "./translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const DEFAULT_LANGUAGE: Language = "pt";

const fallbackContext: LanguageContextType = {
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key: string) => {
    const dict = translations[DEFAULT_LANGUAGE] as Record<string, string>;
    return dict[key] ?? key;
  },
};

const LanguageContext = createContext<LanguageContextType>(fallbackContext);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("app-language");
    if (stored && (stored === "pt" || stored === "en" || stored === "es")) return stored;
    return "pt";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
  }, []);

  const t = useCallback(
    (key: string): string => {
      const dict = translations[language] as Record<string, string>;
      return dict[key] ?? key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export { LANGUAGE_LABELS, LANGUAGE_FLAGS, type Language };
