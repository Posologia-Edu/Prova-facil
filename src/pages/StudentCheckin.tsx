import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Clock, XCircle, Loader2, MapPin } from "lucide-react";

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/checkin-submit`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type Result = { success: true; status: "present" | "late"; student_name: string; lesson_title: string; time: string } | { error: string };

export default function StudentCheckin() {
  const { token } = useParams<{ token: string }>();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsGeo, setNeedsGeo] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    // Try to preflight geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 5000 },
      );
    }
  }, []);

  async function submit() {
    if (!email.trim() || !pin.trim() || !token) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ token, email: email.trim(), pin: pin.trim(), lat: coords?.lat, lng: coords?.lng }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes("Localização")) setNeedsGeo(true);
        setResult({ error: data.error || "Erro ao fazer check-in." });
      } else {
        setResult(data);
      }
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }

  function requestGeo() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setNeedsGeo(false); },
      (e) => setResult({ error: "Permissão de localização negada: " + e.message }),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  if (result && "success" in result) {
    const isLate = result.status === "late";
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            {isLate ? <Clock className="h-16 w-16 mx-auto text-amber-500 mb-4" /> : <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-500 mb-4" />}
            <h2 className="text-2xl font-bold mb-2">{isLate ? "Check-in registrado — Atrasado" : "Presença confirmada"}</h2>
            <p className="text-muted-foreground mb-1">{result.student_name}</p>
            <p className="text-sm text-muted-foreground">{result.lesson_title}</p>
            <p className="text-xs text-muted-foreground mt-4">{new Date(result.time).toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center">Check-in de presença</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>E-mail cadastrado</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="seu@email.com" />
          </div>
          <div>
            <Label>PIN pessoal (6 dígitos)</Label>
            <Input inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} className="text-center text-2xl font-mono tracking-widest" />
          </div>
          {needsGeo && (
            <Button variant="outline" onClick={requestGeo} className="w-full">
              <MapPin className="h-4 w-4 mr-2" />Autorizar localização
            </Button>
          )}
          {result && "error" in result && (
            <div className="flex items-start gap-2 p-3 rounded bg-destructive/10 text-destructive text-sm">
              <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{result.error}</span>
            </div>
          )}
          <Button onClick={submit} disabled={loading || !email || pin.length < 4} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Confirmar presença
          </Button>
          {coords && <p className="text-xs text-muted-foreground text-center">📍 Localização detectada</p>}
        </CardContent>
      </Card>
    </div>
  );
}
