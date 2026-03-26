import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { action } = body;

    // ─── LOG EVENT ───
    if (action === "log-event") {
      const { sessionId, eventType, eventData } = body;
      if (!sessionId || !eventType) return json({ error: "Missing sessionId or eventType" }, 400);

      // Insert audit log
      await supabase.from("exam_audit_logs").insert({
        session_id: sessionId,
        event_type: eventType,
        event_data: eventData || {},
      });

      // Increment violation count for violation-type events
      const violationEvents = ["focus_lost", "fullscreen_exit", "copy_attempt", "paste_attempt", "cut_attempt", "contextmenu_attempt", "keyboard_shortcut_blocked", "printscreen_attempt"];
      if (violationEvents.includes(eventType)) {
        await supabase.rpc("increment_violation_count", { p_session_id: sessionId }).catch(() => {
          // Fallback: manual increment
          supabase
            .from("exam_sessions")
            .select("violation_count")
            .eq("id", sessionId)
            .single()
            .then(({ data }) => {
              if (data) {
                supabase
                  .from("exam_sessions")
                  .update({ violation_count: (data.violation_count || 0) + 1 })
                  .eq("id", sessionId);
              }
            });
        });
      }

      // Save fingerprint on session_started
      if (eventType === "session_started" && eventData?.fingerprint) {
        await supabase
          .from("exam_sessions")
          .update({ device_fingerprint: eventData.fingerprint })
          .eq("id", sessionId);
      }

      return json({ success: true });
    }

    // ─── CAPTURE PHOTO ───
    if (action === "capture-photo") {
      const { sessionId, photoBase64 } = body;
      if (!sessionId || !photoBase64) return json({ error: "Missing data" }, 400);

      // Convert base64 to binary
      const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      const timestamp = Date.now();
      const filePath = `${sessionId}/${timestamp}.jpg`;

      const { error: uploadErr } = await supabase.storage
        .from("exam-proctoring")
        .upload(filePath, binaryData, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadErr) {
        console.error("Upload error:", uploadErr);
        return json({ error: "Failed to upload photo" }, 500);
      }

      // Update session with first photo URL
      const { data: sess } = await supabase
        .from("exam_sessions")
        .select("photo_url")
        .eq("id", sessionId)
        .single();

      if (sess && !sess.photo_url) {
        await supabase
          .from("exam_sessions")
          .update({ photo_url: filePath })
          .eq("id", sessionId);
      }

      // Log the capture
      await supabase.from("exam_audit_logs").insert({
        session_id: sessionId,
        event_type: "photo_captured",
        event_data: { path: filePath },
      });

      return json({ success: true, path: filePath });
    }

    // ─── GET VIOLATIONS ───
    if (action === "get-violations") {
      const { publicationId } = body;
      if (!publicationId) return json({ error: "Missing publicationId" }, 400);

      // Get all sessions for this publication
      const { data: sessions } = await supabase
        .from("exam_sessions")
        .select("id, student_name, student_email, violation_count, device_fingerprint, photo_url")
        .eq("publication_id", publicationId)
        .order("violation_count", { ascending: false });

      if (!sessions) return json({ sessions: [], logs: [] });

      const sessionIds = sessions.map(s => s.id);

      // Get all audit logs
      let logs: any[] = [];
      for (let i = 0; i < sessionIds.length; i += 50) {
        const batch = sessionIds.slice(i, i + 50);
        const { data } = await supabase
          .from("exam_audit_logs")
          .select("*")
          .in("session_id", batch)
          .order("created_at", { ascending: false })
          .limit(500);
        if (data) logs.push(...data);
      }

      // Get photo URLs for sessions with photos
      const photoPaths: Record<string, string[]> = {};
      for (const sess of sessions) {
        if (sess.photo_url || sess.violation_count > 0) {
          const { data: files } = await supabase.storage
            .from("exam-proctoring")
            .list(sess.id, { limit: 50, sortBy: { column: "created_at", order: "asc" } });
          if (files && files.length > 0) {
            photoPaths[sess.id] = files.map(f => `${sess.id}/${f.name}`);
          }
        }
      }

      return json({ sessions, logs, photoPaths });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    console.error("Error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
