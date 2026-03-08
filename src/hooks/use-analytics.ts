import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCookieConsent } from "./use-cookie-consent";

const SESSION_KEY = "analytics-session-id";
const UTM_KEY = "analytics-utm";

function getOrCreateSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function captureUtmParams(): Record<string, string> {
  const stored = sessionStorage.getItem(UTM_KEY);
  if (stored) return JSON.parse(stored);

  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }
  if (Object.keys(utm).length > 0) {
    sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
  }
  return utm;
}

export function useAnalytics() {
  const { hasConsent, consentGiven } = useCookieConsent();
  const location = useLocation();
  const lastPath = useRef("");

  const trackEvent = useCallback(
    async (eventType: string, metadata?: Record<string, unknown>) => {
      // Analytics events require analytics consent; marketing events require marketing consent
      const category = eventType.startsWith("utm_") || eventType === "signup_started" || eventType === "signup_completed"
        ? "marketing"
        : "analytics";

      if (!consentGiven || !hasConsent(category)) return;

      const utm = captureUtmParams();
      const sessionId = getOrCreateSessionId();

      try {
        const { data: { session } } = await supabase.auth.getSession();
        await supabase.from("analytics_events" as any).insert({
          event_type: eventType,
          page_url: window.location.pathname,
          referrer: document.referrer || null,
          utm_source: utm.utm_source || null,
          utm_medium: utm.utm_medium || null,
          utm_campaign: utm.utm_campaign || null,
          session_id: sessionId,
          user_id: session?.user?.id || null,
          metadata: metadata || {},
        });
      } catch {
        // Silently fail — analytics should never break the app
      }
    },
    [consentGiven, hasConsent]
  );

  // Auto-track page views
  useEffect(() => {
    if (location.pathname !== lastPath.current) {
      lastPath.current = location.pathname;
      trackEvent("page_view", { path: location.pathname });
    }
  }, [location.pathname, trackEvent]);

  // Capture UTM on first load
  useEffect(() => {
    captureUtmParams();
  }, []);

  return { trackEvent };
}
