import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getAuthenticatedUserId(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const authClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

async function assertPublicationOwner(req: Request, supabase: any, publicationId: string) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return { errorResponse: json({ error: "Não autenticado." }, 401) };
  }

  const { data: publication, error } = await supabase
    .from("exam_publications")
    .select("id, user_id")
    .eq("id", publicationId)
    .maybeSingle();

  if (error || !publication) {
    return { errorResponse: json({ error: "Publicação não encontrada." }, 404) };
  }

  if (publication.user_id !== userId) {
    return { errorResponse: json({ error: "Acesso negado." }, 403) };
  }

  return { userId };
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

    if (action === "log-event") {
      const { sessionId, eventType, eventData } = body;
      if (!sessionId || !eventType) return json({ error: "Missing sessionId or eventType" }, 400);

      const { data: session } = await supabase
        .from("exam_sessions")
        .select("id, status, violation_count")
        .eq("id", sessionId)
        .maybeSingle();

      if (!session) return json({ error: "Sessão não encontrada." }, 404);

      if (session.status === "blocked" && eventType !== "session_unblocked") {
        return json({ success: true, ignored: true });
      }

      await supabase.from("exam_audit_logs").insert({
        session_id: sessionId,
        event_type: eventType,
        event_data: eventData || {},
      });

      const violationEvents = ["focus_lost", "fullscreen_exit", "copy_attempt", "paste_attempt", "cut_attempt", "contextmenu_attempt", "keyboard_shortcut_blocked", "printscreen_attempt"];
      if (violationEvents.includes(eventType)) {
        await supabase
          .from("exam_sessions")
          .update({ violation_count: (session.violation_count || 0) + 1 })
          .eq("id", sessionId)
          .eq("status", "in_progress");
      }

      if (eventType === "session_started" && eventData?.fingerprint) {
        await supabase
          .from("exam_sessions")
          .update({ device_fingerprint: eventData.fingerprint })
          .eq("id", sessionId)
          .neq("status", "blocked");
      }

      if (eventType === "session_blocked") {
        await supabase
          .from("exam_sessions")
          .update({ status: "blocked" })
          .eq("id", sessionId)
          .neq("status", "submitted")
          .neq("status", "graded");
      }

      return json({ success: true });
    }

    if (action === "capture-photo") {
      const { sessionId, photoBase64 } = body;
      if (!sessionId || !photoBase64) return json({ error: "Missing data" }, 400);

      const { data: session } = await supabase
        .from("exam_sessions")
        .select("id, status")
        .eq("id", sessionId)
        .maybeSingle();

      if (!session) return json({ error: "Sessão não encontrada." }, 404);
      if (session.status === "blocked") return json({ success: true, ignored: true });

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

      await supabase.from("exam_audit_logs").insert({
        session_id: sessionId,
        event_type: "photo_captured",
        event_data: { path: filePath },
      });

      return json({ success: true, path: filePath });
    }

    if (action === "get-violations") {
      const { publicationId } = body;
      if (!publicationId) return json({ error: "Missing publicationId" }, 400);

      const auth = await assertPublicationOwner(req, supabase, publicationId);
      if (auth.errorResponse) return auth.errorResponse;

      const { data: sessions } = await supabase
        .from("exam_sessions")
        .select("id, student_name, student_email, status, violation_count, device_fingerprint, photo_url")
        .eq("publication_id", publicationId)
        .order("violation_count", { ascending: false });

      if (!sessions) return json({ sessions: [], logs: [], photoPaths: {} });

      const sessionIds = sessions.map(s => s.id);

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

    if (action === "unlock-session") {
      const { sessionId } = body;
      if (!sessionId) return json({ error: "Missing sessionId" }, 400);

      const { data: session, error: sessionError } = await supabase
        .from("exam_sessions")
        .select("id, publication_id")
        .eq("id", sessionId)
        .maybeSingle();

      if (sessionError || !session) {
        return json({ error: "Sessão não encontrada." }, 404);
      }

      const auth = await assertPublicationOwner(req, supabase, session.publication_id);
      if (auth.errorResponse) return auth.errorResponse;

      await supabase
        .from("exam_sessions")
        .update({ status: "in_progress", finished_at: null, violation_count: 0 })
        .eq("id", sessionId);

      await supabase.from("exam_audit_logs").insert({
        session_id: sessionId,
        event_type: "session_unblocked",
        event_data: { teacher_user_id: auth.userId },
      });

      return json({ success: true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    console.error("Error:", err);
    return json({ error: "Internal error" }, 500);
  }
});