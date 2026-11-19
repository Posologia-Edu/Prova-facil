// Descobre qual PACIENTE VIRTUAL um aluno atendeu na anamnese, a partir do vínculo com o SOAP.
// Cadeia: participante do SOAP → registro na anamnese → rodada → paciente da mesma dupla → índice do caso
// → roteiro (source_vp_id) → paciente virtual. Mesma lógica de grade-soap-v2, em forma reutilizável.
// Só vale se o paciente virtual for do mesmo professor (ownerId).

const norm = (s: unknown) =>
  String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

export type PacienteDoSoap = { vpId: string | null; nome: string | null };

export async function pacienteVirtualDoSoap(db: any, soapParticipantId: string | null | undefined, ownerId: string | null | undefined): Promise<PacienteDoSoap> {
  const vazio: PacienteDoSoap = { vpId: null, nome: null };
  if (!soapParticipantId || !ownerId) return vazio;

  const { data: sp } = await db.from("soap_participants")
    .select("room_id, student_email, anamnesis_participant_id").eq("id", soapParticipantId).maybeSingle();
  if (!sp) return vazio;

  let anamPid: string | null = sp.anamnesis_participant_id || null;
  if (!anamPid && sp.student_email) {
    const { data: sala } = await db.from("soap_rooms").select("anamnesis_room_id").eq("id", sp.room_id).maybeSingle();
    if (sala?.anamnesis_room_id) {
      const { data: porEmail } = await db.from("simulation_participants").select("id")
        .eq("room_id", sala.anamnesis_room_id).ilike("student_email", String(sp.student_email).trim()).limit(1);
      anamPid = porEmail?.[0]?.id || null;
    }
  }
  if (!anamPid) return vazio;

  const { data: part } = await db.from("simulation_participants").select("room_id").eq("id", anamPid).maybeSingle();
  const simRoomId: string | null = part?.room_id || null;
  const { data: rs } = await db.from("simulation_responses").select("round_id")
    .eq("participant_id", anamPid).not("submitted_at", "is", null).order("submitted_at", { ascending: false }).limit(1);
  const roundId: string | null = rs?.[0]?.round_id || null;
  if (!roundId || !simRoomId) return vazio;

  const { data: ass } = await db.from("simulation_round_assignments")
    .select("participant_id, assigned_role, pair_index, case_index").eq("round_id", roundId);
  const prof = (ass || []).find((a: any) => a.participant_id === anamPid);
  const pac = prof ? (ass || []).find((a: any) => a.assigned_role === "patient" && a.pair_index === prof.pair_index) : null;
  const { data: ps } = await db.from("simulation_forms").select("content_json")
    .eq("room_id", simRoomId).eq("form_type", "patient_script").limit(1);
  const cases = (ps?.[0]?.content_json as any)?.[0]?.cases;
  const caso = Array.isArray(cases) && cases.length ? cases[pac?.case_index ?? 0] || null : null;
  if (!caso) return vazio;

  if (caso.source_vp_id) {
    const { data: vp } = await db.from("custom_virtual_patients").select("id, name, user_id").eq("id", caso.source_vp_id).maybeSingle();
    if (vp && vp.user_id === ownerId) return { vpId: vp.id, nome: vp.name };
  }
  // Casos aplicados antes de guardarmos a origem: procura por nome e idade entre os pacientes do professor.
  const alvo = caso.roteiro?.identidade;
  if (alvo?.nome) {
    const { data: vps } = await db.from("custom_virtual_patients").select("id, name, case_data")
      .eq("user_id", ownerId).eq("is_legacy", false).is("deleted_at", null);
    const achado = (vps || []).find((v: any) => {
      const id = v.case_data?.nucleo?.identidade;
      return id && norm(id.nome) === norm(alvo.nome) && Number(id.idade) === Number(alvo.idade);
    });
    if (achado) return { vpId: achado.id, nome: achado.name };
  }
  return vazio;
}
