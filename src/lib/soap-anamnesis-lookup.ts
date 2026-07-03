import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches anamnesis answers for a student using multiple lookup strategies.
 * Uses email as the primary "unique ID" so the AI grader always has access
 * to the anamnesis data — even when the pair link (anamnesis_participant_id)
 * is missing or the SOAP room is not explicitly linked to an anamnesis room.
 *
 * Returns a { label: value } record. Empty object if nothing found.
 */
export async function fetchAnamnesisAnswersForStudent(opts: {
  studentEmail?: string | null;
  studentName?: string | null;
  anamnesisParticipantId?: string | null;
  anamnesisRoomId?: string | null;
}): Promise<Record<string, any>> {
  const email = (opts.studentEmail || "").trim().toLowerCase();
  const name = (opts.studentName || "").trim();
  const anamRoomId = opts.anamnesisRoomId || null;
  const anamPid = opts.anamnesisParticipantId || null;

  const normalize = (s: string) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const collected: Record<string, any> = {};

  async function extractFromResponse(formId: string, participantId: string): Promise<boolean> {
    const { data: form } = await supabase
      .from("simulation_forms")
      .select("id, content_json, form_type")
      .eq("id", formId)
      .maybeSingle();
    if (!form) return false;
    const { data: resps } = await (supabase.from("simulation_responses") as any)
      .select("answers_json, submitted_at, created_at")
      .eq("form_id", formId)
      .eq("participant_id", participantId)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(1);
    const resp = resps?.[0];
    if (!resp?.answers_json) return false;
    const fields = Array.isArray(form.content_json) ? (form.content_json as any[]) : [];
    for (const [key, value] of Object.entries(resp.answers_json as Record<string, any>)) {
      if (key === "_feedback") continue;
      const field = fields.find((f: any) => f.id === key);
      collected[field?.label || key] = value;
    }
    return Object.keys(collected).length > 0;
  }

  async function tryRoomWithParticipant(roomId: string, participantId: string): Promise<boolean> {
    const { data: anamForms } = await supabase
      .from("simulation_forms")
      .select("id, form_type")
      .eq("room_id", roomId)
      .in("form_type", ["anamnesis", "standard"]);
    const anamForm =
      anamForms?.find((f: any) => f.form_type === "anamnesis") || anamForms?.[0];
    if (!anamForm) return false;
    return await extractFromResponse(anamForm.id, participantId);
  }

  // Strategy 1: explicit anamnesis_participant_id
  if (anamPid && anamRoomId) {
    if (await tryRoomWithParticipant(anamRoomId, anamPid)) return collected;
  }

  // Strategy 2: linked anamnesis room + match by email
  if (anamRoomId && email) {
    const { data: byEmail } = await supabase
      .from("simulation_participants")
      .select("id, student_email")
      .eq("room_id", anamRoomId);
    const match = (byEmail || []).find(
      (p: any) => (p.student_email || "").trim().toLowerCase() === email
    );
    if (match && (await tryRoomWithParticipant(anamRoomId, match.id))) return collected;
  }

  // Strategy 3: linked anamnesis room + match by name
  if (anamRoomId && name) {
    const { data: byName } = await supabase
      .from("simulation_participants")
      .select("id, student_name")
      .eq("room_id", anamRoomId);
    const match = (byName || []).find(
      (p: any) => normalize(p.student_name) === normalize(name)
    );
    if (match && (await tryRoomWithParticipant(anamRoomId, match.id))) return collected;
  }

  // Strategy 4: global search by email across ALL anamnesis rooms (unique ID fallback)
  if (email) {
    const { data: allByEmail } = await supabase
      .from("simulation_participants")
      .select("id, room_id, created_at")
      .ilike("student_email", email)
      .order("created_at", { ascending: false });
    for (const p of allByEmail || []) {
      if (await tryRoomWithParticipant(p.room_id, p.id)) return collected;
    }
  }

  // Strategy 5: global search by name
  if (name) {
    const { data: allByName } = await supabase
      .from("simulation_participants")
      .select("id, room_id, student_name, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    const matches = (allByName || []).filter(
      (p: any) => normalize(p.student_name) === normalize(name)
    );
    for (const p of matches) {
      if (await tryRoomWithParticipant(p.room_id, p.id)) return collected;
    }
  }

  return collected;
}
