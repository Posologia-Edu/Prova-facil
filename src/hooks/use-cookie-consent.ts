import { useState, useCallback, useEffect } from "react";

export interface CookiePreferences {
  essential: boolean;
  functionality: boolean;
  analytics: boolean;
  marketing: boolean;
}

const STORAGE_KEY = "cookie-consent";
const CONSENT_GIVEN_KEY = "cookie-consent-given";

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  functionality: false,
  analytics: false,
  marketing: false,
};

export function useCookieConsent() {
  const [preferences, setPreferencesState] = useState<CookiePreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const [consentGiven, setConsentGiven] = useState(() => {
    return localStorage.getItem(CONSENT_GIVEN_KEY) === "true";
  });

  const savePreferences = useCallback((prefs: CookiePreferences) => {
    const safe = { ...prefs, essential: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    localStorage.setItem(CONSENT_GIVEN_KEY, "true");
    setPreferencesState(safe);
    setConsentGiven(true);
  }, []);

  const acceptAll = useCallback(() => {
    savePreferences({ essential: true, functionality: true, analytics: true, marketing: true });
  }, [savePreferences]);

  const rejectNonEssential = useCallback(() => {
    savePreferences({ essential: true, functionality: false, analytics: false, marketing: false });
  }, [savePreferences]);

  const updatePreferences = useCallback((partial: Partial<CookiePreferences>) => {
    savePreferences({ ...preferences, ...partial, essential: true });
  }, [preferences, savePreferences]);

  const hasConsent = useCallback((category: keyof CookiePreferences) => {
    return preferences[category] === true;
  }, [preferences]);

  return {
    preferences,
    consentGiven,
    acceptAll,
    rejectNonEssential,
    updatePreferences,
    hasConsent,
    savePreferences,
  };
}
