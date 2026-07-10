import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODULE_CONFIG: Record<string, { rooms: string; forms: string; participants: string; clinical_cases?: string; extra_room_fields?: string[]; cross_link_fields?: string[] }> = {
  simulation: { rooms: "simulation_rooms", forms: "simulation_forms", participants: "simulation_participants", extra_room_fields: ["duration_minutes"] },
  soap: { rooms: "soap_rooms", forms: "soap_forms", participants: "soap_participants", cross_link_fields: ["anamnesis_room_id"] },
  reconciliation: { rooms: "reconciliation_rooms", forms: "reconciliation_forms", participants: "reconciliation_participants", clinical_cases: "reconciliation_clinical_cases", cross_link_fields: ["soap_room_id"] },
  documentation: { rooms: "documentation_rooms", forms: "documentation_forms", participants: "documentation_participants", clinical_cases: "documentation_clinical_cases", cross_link_fields: ["reconciliation_room_id"] },
  nursing: { rooms: "nursing_rooms", forms: "nursing_forms", participants: "nursing_participants", clinical_cases: "nursing_clinical_cases", extra_room_fields: ["module_type"] },
  medicine: { rooms: "medicine_rooms", forms: "medicine_forms", participants: "medicine_participants", clinical_cases: "medicine_clinical_cases", extra_room_fields: ["module_type"] },
  dentistry: { rooms: "dentistry_rooms", forms: "dentistry_forms", participants: "dentistry_participants", clinical_cases: "dentistry_clinical_cases", extra_room_fields: ["module_type"] },
  nutrition: { rooms: "nutrition_rooms", forms: "nutrition_forms", participants: "nutrition_participants", clinical_cases: "nutrition_clinical_cases", extra_room_fields: ["module_type"] },
  physiotherapy: { rooms: "physiotherapy_rooms", forms: "physiotherapy_forms", participants: "physiotherapy_participants", clinical_cases: "physiotherapy_clinical_cases", extra_room_fields: ["module_type"] },
  biomedicine: { rooms: "biomedicine_rooms", forms: "biomedicine_forms", participants: "biomedicine_participants", clinical_cases: "biomedicine_clinical_cases", extra_room_fields: ["module_type"] },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { roomId, email, moduleType } = await req.json();
    if (!roomId || !email || !moduleType) {
      return new Response(JSON.stringify({ error: "roomId, email e moduleType são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = MODULE_CONFIG[moduleType];
    if (!config) {
      return new Response(JSON.stringify({ error: "moduleType inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify room ownership
    const { data: room, error: roomErr } = await adminClient
      .from(config.rooms)
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomErr || !room) {
      return new Response(JSON.stringify({ error: "Sala não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (room.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Você não é dono desta sala" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find target user by email (paginated)
    let targetUser: any = null;
    let page = 1;
    while (!targetUser) {
      const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers({ page, perPage: 500 });
      if (listErr) throw new Error("Erro ao buscar usuários");
      const users = listData?.users || [];
      if (users.length === 0) break;
      targetUser = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      page++;
      if (page > 20) break;
    }

    if (!targetUser) {
      return new Response(JSON.stringify({ error: "Nenhum professor encontrado com este e-mail" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetUser.id === userId) {
      return new Response(JSON.stringify({ error: "Você não pode enviar para si mesmo" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check target has teacher or admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUser.id)
      .in("role", ["teacher", "admin"])
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Este e-mail não pertence a um professor cadastrado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clone room
    const newRoomData: any = {
      user_id: targetUser.id,
      title: room.title,
      description: room.description,
      status: "draft",
    };

    // Copy extra fields (module_type, duration_minutes)
    if (config.extra_room_fields) {
      for (const field of config.extra_room_fields) {
        if (room[field] !== undefined) newRoomData[field] = room[field];
      }
    }

    // Cross-link fields are set to null (recipient doesn't have these rooms)
    if (config.cross_link_fields) {
      for (const field of config.cross_link_fields) {
        newRoomData[field] = null;
      }
    }

    const { data: newRoom, error: insertErr } = await adminClient
      .from(config.rooms)
      .insert(newRoomData)
      .select()
      .single();

    if (insertErr || !newRoom) {
      console.error("[SHARE-ROOM] insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Erro ao criar cópia da sala" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clone clinical cases FIRST so we can build old→new ID map for case_answers remap
    const caseIdMap: Record<string, string> = {};
    if (config.clinical_cases) {
      const { data: cases } = await adminClient.from(config.clinical_cases).select("*").eq("room_id", roomId).order("position", { ascending: true });
      if (cases?.length) {
        const insertPayload = cases.map((c: any) => ({
          room_id: newRoom.id,
          title: c.title,
          content: c.content,
          position: c.position,
        }));
        const { data: newCases } = await adminClient.from(config.clinical_cases).insert(insertPayload).select("id, position, title");
        if (newCases) {
          for (const oldCase of cases) {
            const match = newCases.find((nc: any) => nc.position === oldCase.position && nc.title === oldCase.title)
              || newCases.find((nc: any) => nc.title === oldCase.title);
            if (match) caseIdMap[oldCase.id] = match.id;
          }
        }
      }
    }

    // Clone forms, remapping case_answers keys with caseIdMap
    const { data: forms } = await adminClient.from(config.forms).select("*").eq("room_id", roomId);
    if (forms?.length) {
      const newForms = forms.map((f: any) => {
        let contentJson: any = f.content_json;
        if (contentJson && typeof contentJson === "object" && !Array.isArray(contentJson) && contentJson.case_answers && typeof contentJson.case_answers === "object") {
          const oldAnswers = contentJson.case_answers as Record<string, unknown>;
          const newAnswers: Record<string, unknown> = {};
          for (const [oldId, val] of Object.entries(oldAnswers)) {
            newAnswers[caseIdMap[oldId] || oldId] = val;
          }
          contentJson = { ...contentJson, case_answers: newAnswers };
        }
        return {
          room_id: newRoom.id,
          title: f.title,
          form_type: f.form_type,
          content_json: contentJson,
          ...(f.target_role !== undefined ? { target_role: f.target_role } : {}),
          ...(f.fields_json !== undefined ? { fields_json: f.fields_json } : {}),
        };
      });
      await adminClient.from(config.forms).insert(newForms);
    }

    // Clone participants
    const { data: participants } = await adminClient.from(config.participants).select("*").eq("room_id", roomId);
    if (participants?.length) {
      const newParticipants = participants.map((p: any) => ({
        room_id: newRoom.id,
        student_name: p.student_name,
        student_email: p.student_email,
        pair_index: p.pair_index,
        pair_position: p.pair_position,
        participant_role: p.participant_role,
        ...(p.assigned_role !== undefined ? { assigned_role: p.assigned_role } : {}),
      }));
      await adminClient.from(config.participants).insert(newParticipants);
    }

    return new Response(JSON.stringify({ success: true, roomId: newRoom.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[SHARE-ROOM] ERROR:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
