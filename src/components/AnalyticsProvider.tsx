import { useAnalytics } from "@/hooks/use-analytics";

export function AnalyticsProvider() {
  // This component just initializes the analytics hook (page_view tracking)
  useAnalytics();
  return null;
}
