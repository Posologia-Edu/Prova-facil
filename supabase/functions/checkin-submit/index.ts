import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function b64urlDecode(s: string): string {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return atob(s);
}

async function verify(token: string, secret: string): Promise<{ lid: string; exp: number } | null> {
  const [p, sig] = token.split(".");
  if (!p || !sig) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const sigBytes = Uint8Array.from(b64urlDecode(sig), c => c.charCodeAt(0));
  const ok = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(p));
  if (!ok) return null;
  const payload = JSON.parse(b64urlDecode(p));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (x: number) => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { token, email, pin, lat, lng } = await req.json();
    if (!token || !email || !pin) return json({ error: "Dados incompletos." }, 400);

    const payload = await verify(token, Deno.env.get("CHECKIN_JWT_SECRET")!);
    if (!payload) return json({ error: "QR code expirado. Peça ao professor para exibir o QR novamente." }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: lesson } = await admin
      .from("class_schedule_items")
      .select("id, semester_id, title, lesson_date, checkin_open, checkin_opened_at, checkin_geo_lat, checkin_geo_lng, checkin_geo_radius_m")
      .eq("id", payload.lid)
      .maybeSingle();

    if (!lesson) return json({ error: "Aula não encontrada." }, 404);
    if (!lesson.checkin_open) return json({ error: "Check-in fechado." }, 400);

    // Geofence
    if (lesson.checkin_geo_lat != null && lesson.checkin_geo_lng != null && lesson.checkin_geo_radius_m) {
      if (typeof lat !== "number" || typeof lng !== "number") {
        return json({ error: "Localização é obrigatória. Autorize o acesso e tente novamente." }, 400);
      }
      const dist = haversineM(lat, lng, lesson.checkin_geo_lat, lesson.checkin_geo_lng);
      if (dist > lesson.checkin_geo_radius_m) {
        return json({ error: `Você está a ${Math.round(dist)}m do local da aula (limite ${lesson.checkin_geo_radius_m}m).` }, 400);
      }
    }

    // Locate student in this semester by email
    const cleanEmail = String(email).trim().toLowerCase();
    const { data: students } = await admin
      .from("class_students")
      .select("id, student_name, student_email, pin_hash")
      .eq("semester_id", lesson.semester_id);

    const student = (students || []).find(s => (s.student_email || "").trim().toLowerCase() === cleanEmail);
    if (!student) return json({ error: "E-mail não encontrado nesta turma." }, 404);
    if (!student.pin_hash) return json({ error: "PIN não cadastrado. Peça ao professor para gerar." }, 400);

    const ok = await bcrypt.compare(String(pin), student.pin_hash);
    if (!ok) return json({ error: "PIN incorreto." }, 401);

    // Calculate status: present up to 15min after opening, late up to 30min
    const openedAt = lesson.checkin_opened_at ? new Date(lesson.checkin_opened_at) : new Date();
    const minutes = (Date.now() - openedAt.getTime()) / 60000;
    const status = minutes <= 15 ? "present" : "late";

    const nowIso = new Date().toISOString();
    const { error: upErr } = await admin.from("class_attendance").upsert({
      lesson_id: lesson.id,
      student_id: student.id,
      status,
      checkin_method: "qr",
      checkin_at: nowIso,
      checkin_lat: lat ?? null,
      checkin_lng: lng ?? null,
    }, { onConflict: "lesson_id,student_id" });

    if (upErr) return json({ error: "Erro ao registrar presença." }, 500);

    return json({
      success: true,
      status,
      student_name: student.student_name,
      lesson_title: lesson.title,
      lesson_date: lesson.lesson_date,
      time: nowIso,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
