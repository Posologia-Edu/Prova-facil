import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Clock, Loader2, MapPin, RefreshCw, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lessonId: string;
  lessonTitle: string;
  onClosed: () => void;
}

interface LiveRow { id: string; student_name: string; status: string; checkin_at: string | null; }

export function QrCheckinDialog({ open, onOpenChange, lessonId, lessonTitle, onClosed }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [ttl, setTtl] = useState(30);
  const [rows, setRows] = useState<LiveRow[]>([]);
  const [geoOn, setGeoOn] = useState(false);
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  const url = useMemo(() => token ? `${window.location.origin}/checkin/${token}` : "", [token]);

  async function fetchToken() {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("checkin-qr-token", { body: { lessonId } });
    setLoading(false);
    if (error || !data?.token) { toast.error("Erro ao gerar QR."); return; }
    setToken(data.token);
    setTtl(data.ttl || 30);
  }

  async function loadRows() {
    const { data } = await supabase
      .from("class_attendance")
      .select("id, status, checkin_at, class_students!inner(student_name)")
      .eq("lesson_id", lessonId);
    // deno-lint-ignore no-explicit-any
    setRows(((data as any[]) || []).map(r => ({ id: r.id, status: r.status, checkin_at: r.checkin_at, student_name: r.class_students.student_name })));
  }

  async function openCheckin() {
    const patch: Record<string, unknown> = { checkin_open: true, checkin_opened_at: new Date().toISOString() };
    if (geoOn && geoCoords) {
      patch.checkin_geo_lat = geoCoords.lat;
      patch.checkin_geo_lng = geoCoords.lng;
      patch.checkin_geo_radius_m = 150;
    } else {
      patch.checkin_geo_lat = null;
      patch.checkin_geo_lng = null;
      patch.checkin_geo_radius_m = null;
    }
    const { error } = await supabase.from("class_schedule_items").update(patch).eq("id", lessonId);
    if (error) { toast.error("Erro ao abrir check-in."); return; }
    await fetchToken();
    await loadRows();
  }

  async function closeCheckin() {
    await supabase.from("class_schedule_items").update({ checkin_open: false }).eq("id", lessonId);
    setToken(null);
    onClosed();
    onOpenChange(false);
  }

  // Auto-open when dialog opens
  useEffect(() => {
    if (!open) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    openCheckin();

    // Rotate token every 20s
    intervalRef.current = window.setInterval(() => { fetchToken(); }, 20000);
    // Tick countdown
    tickRef.current = window.setInterval(() => setTtl(t => Math.max(0, t - 1)), 1000);

    // Realtime attendance
    const channel = supabase.channel(`att-${lessonId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "class_attendance", filter: `lesson_id=eq.${lessonId}` }, () => loadRows())
      .subscribe();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lessonId]);

  function captureLocation() {
    if (!navigator.geolocation) { toast.error("Geolocalização não disponível."); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setGeoCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); toast.success("Local capturado."); },
      (e) => toast.error("Erro: " + e.message),
      { enableHighAccuracy: true },
    );
  }

  const checkedIn = rows.filter(r => r.status === "present" || r.status === "late");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) closeCheckin(); else onOpenChange(o); }}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Check-in por QR — {lessonTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* QR side */}
          <div className="flex flex-col items-center gap-4">
            <div className="p-6 bg-white rounded-xl shadow-lg min-h-[320px] flex items-center justify-center">
              {token ? (
                <QRCodeSVG value={url} size={280} level="M" />
              ) : (
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-3 w-3" /> Novo QR em {ttl}s
              <Button size="sm" variant="ghost" onClick={fetchToken} disabled={loading}>Renovar agora</Button>
            </div>
            <div className="w-full space-y-2 border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" />Exigir geolocalização</Label>
                <Switch checked={geoOn} onCheckedChange={(v) => { setGeoOn(v); if (v) captureLocation(); }} />
              </div>
              {geoOn && (
                <div className="text-xs text-muted-foreground">
                  {geoCoords ? `Local: ${geoCoords.lat.toFixed(5)}, ${geoCoords.lng.toFixed(5)} (raio 150m)` : "Aguardando permissão…"}
                  <Button size="sm" variant="link" onClick={captureLocation} className="ml-2 p-0 h-auto">Recapturar</Button>
                </div>
              )}
              {geoOn && (
                <Button size="sm" variant="outline" onClick={openCheckin} className="w-full">Aplicar geo</Button>
              )}
            </div>
          </div>

          {/* Live list */}
          <div className="border rounded-lg p-3 max-h-[500px] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Check-ins ao vivo</h3>
              <Badge>{checkedIn.length}</Badge>
            </div>
            {checkedIn.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aguardando alunos escanearem…</p>
            ) : (
              <div className="space-y-1">
                {checkedIn.sort((a, b) => (b.checkin_at || "").localeCompare(a.checkin_at || "")).map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/40 text-sm">
                    <div className="flex items-center gap-2">
                      {r.status === "late" ? <Clock className="h-4 w-4 text-amber-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      <span>{r.student_name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{r.checkin_at ? new Date(r.checkin_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="destructive" onClick={closeCheckin}><X className="h-4 w-4 mr-1" />Fechar check-in</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
