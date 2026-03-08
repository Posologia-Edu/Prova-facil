import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, MousePointerClick, Globe, TrendingUp, ArrowRight, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

interface AnalyticsEvent {
  id: string;
  event_type: string;
  page_url: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  session_id: string | null;
  user_id: string | null;
  metadata: any;
  created_at: string;
}

const PERIOD_OPTIONS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

const COLORS = [
  "hsl(38, 92%, 50%)", // secondary
  "hsl(220, 60%, 20%)", // primary
  "hsl(152, 60%, 40%)", // success
  "hsl(0, 72%, 51%)", // destructive
  "hsl(220, 14%, 46%)", // muted
  "hsl(280, 60%, 50%)",
  "hsl(180, 60%, 40%)",
  "hsl(60, 70%, 45%)",
];

export default function AdminAnalytics() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    loadEvents();
  }, [period]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - parseInt(period));

      const { data, error } = await supabase
        .from("analytics_events" as any)
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvents((data as any) || []);
    } catch {
      setEvents([]);
    }
    setLoading(false);
  };

  const stats = useMemo(() => {
    const pageViews = events.filter((e) => e.event_type === "page_view");
    const uniqueSessions = new Set(events.map((e) => e.session_id).filter(Boolean));
    const signups = events.filter((e) => e.event_type === "signup_completed");
    const pricingViews = events.filter((e) => e.event_type === "pricing_view" || (e.event_type === "page_view" && (e.page_url?.includes("/planos") || e.page_url?.includes("/pricing"))));

    return {
      totalPageViews: pageViews.length,
      uniqueVisitors: uniqueSessions.size,
      signups: signups.length,
      pricingViews: pricingViews.length,
    };
  }, [events]);

  // Daily visits chart
  const dailyVisits = useMemo(() => {
    const pageViews = events.filter((e) => e.event_type === "page_view");
    const grouped: Record<string, { views: number; sessions: Set<string> }> = {};

    pageViews.forEach((ev) => {
      const day = new Date(ev.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      if (!grouped[day]) grouped[day] = { views: 0, sessions: new Set() };
      grouped[day].views++;
      if (ev.session_id) grouped[day].sessions.add(ev.session_id);
    });

    return Object.entries(grouped)
      .map(([date, val]) => ({ date, views: val.views, visitors: val.sessions.size }))
      .reverse();
  }, [events]);

  // Top pages
  const topPages = useMemo(() => {
    const pageViews = events.filter((e) => e.event_type === "page_view" && e.page_url);
    const counts: Record<string, number> = {};
    pageViews.forEach((ev) => {
      const page = ev.page_url || "/";
      counts[page] = (counts[page] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, count]) => ({ page, count }));
  }, [events]);

  // UTM sources
  const utmSources = useMemo(() => {
    const withUtm = events.filter((e) => e.utm_source);
    const counts: Record<string, number> = {};
    withUtm.forEach((ev) => {
      const source = ev.utm_source || "direto";
      counts[source] = (counts[source] || 0) + 1;
    });

    // Add "Direto" for events without UTM
    const directCount = events.filter((e) => e.event_type === "page_view" && !e.utm_source).length;
    if (directCount > 0) counts["Direto"] = directCount;

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({ source, count }));
  }, [events]);

  // Conversion funnel
  const funnel = useMemo(() => {
    const pageViews = new Set(events.filter((e) => e.event_type === "page_view").map((e) => e.session_id));
    const featureViews = new Set(events.filter((e) => e.event_type === "page_view" && (e.page_url?.includes("/funcionalidades"))).map((e) => e.session_id));
    const pricingViews = new Set(events.filter((e) => e.event_type === "page_view" && (e.page_url?.includes("/planos") || e.page_url?.includes("/pricing"))).map((e) => e.session_id));
    const signupStarted = new Set(events.filter((e) => e.event_type === "signup_started" || (e.event_type === "page_view" && e.page_url?.includes("/auth"))).map((e) => e.session_id));
    const signupCompleted = new Set(events.filter((e) => e.event_type === "signup_completed").map((e) => e.session_id));

    return [
      { stage: "Visitas", count: pageViews.size },
      { stage: "Funcionalidades", count: featureViews.size },
      { stage: "Planos", count: pricingViews.size },
      { stage: "Início Cadastro", count: signupStarted.size },
      { stage: "Cadastro Completo", count: signupCompleted.size },
    ];
  }, [events]);

  // Event types breakdown
  const eventTypes = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((ev) => {
      counts[ev.event_type] = (counts[ev.event_type] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));
  }, [events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics do Site
          </h2>
          <p className="text-sm text-muted-foreground">{events.length} eventos registrados no período</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Eye className="h-4 w-4 text-secondary" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.totalPageViews}</p>
                <p className="text-xs text-muted-foreground">Page Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.uniqueVisitors}</p>
                <p className="text-xs text-muted-foreground">Visitantes Únicos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.pricingViews}</p>
                <p className="text-xs text-muted-foreground">Viram Planos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center">
                <MousePointerClick className="h-4 w-4 text-secondary" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.signups}</p>
                <p className="text-xs text-muted-foreground">Cadastros</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Daily Visits + Top Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Visitas por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyVisits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado ainda</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dailyVisits}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Line type="monotone" dataKey="views" stroke="hsl(38, 92%, 50%)" strokeWidth={2} name="Page Views" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="visitors" stroke="hsl(220, 60%, 20%)" strokeWidth={2} name="Visitantes" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Páginas Mais Acessadas</CardTitle>
          </CardHeader>
          <CardContent>
            {topPages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado ainda</p>
            ) : (
              <div className="space-y-2">
                {topPages.map((p, i) => {
                  const max = topPages[0]?.count || 1;
                  return (
                    <div key={p.page} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium truncate">{p.page || "/"}</span>
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">{p.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-secondary transition-all"
                            style={{ width: `${(p.count / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: UTM Sources + Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Origens de Tráfego</CardTitle>
          </CardHeader>
          <CardContent>
            {utmSources.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado ainda</p>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={utmSources}
                      dataKey="count"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      strokeWidth={2}
                      stroke="hsl(var(--card))"
                    >
                      {utmSources.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {utmSources.map((s, i) => (
                    <div key={s.source} className="flex items-center gap-2 text-xs">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="truncate flex-1">{s.source}</span>
                      <span className="text-muted-foreground">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Funil de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            {funnel.every((f) => f.count === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado ainda</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={funnel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={110} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" name="Sessões" radius={[0, 4, 4, 0]}>
                    {funnel.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Event Types */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Tipos de Evento</CardTitle>
        </CardHeader>
        <CardContent>
          {eventTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento registrado</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {eventTypes.map((et) => (
                <Badge key={et.type} variant="outline" className="gap-1.5 text-xs py-1.5 px-3">
                  {et.type}
                  <span className="font-bold text-foreground">{et.count}</span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
