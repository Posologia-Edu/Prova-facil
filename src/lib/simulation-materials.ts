type RoundLike = {
  id: string;
  cycle: number;
  round_number: number;
  status: string;
  materials_released: boolean;
  created_at?: string;
};

type AssignmentLike = {
  round_id: string;
  participant_id: string;
  pair_index: number;
  assigned_role: string;
  case_index?: number | null;
};

export function getPendingRoundsSorted<T extends RoundLike>(rounds: T[]) {
  return [...rounds]
    .filter((round) => round.status === "pending")
    .sort((a, b) => {
      if (a.cycle !== b.cycle) return a.cycle - b.cycle;
      if (a.round_number !== b.round_number) return a.round_number - b.round_number;
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });
}

export function getMaterialCycle<T extends RoundLike>(rounds: T[], activeRound: T | null) {
  if (activeRound?.cycle) return activeRound.cycle;

  const pendingRounds = getPendingRoundsSorted(rounds);
  const releasedPendingRound = pendingRounds.find((round) => round.materials_released);

  if (releasedPendingRound) return releasedPendingRound.cycle;
  if (pendingRounds[0]?.cycle) return pendingRounds[0].cycle;
  if (rounds[0]?.cycle) return rounds[0].cycle;

  return 1;
}

export function areCycleMaterialsReleased<T extends RoundLike>(rounds: T[], cycle: number) {
  return rounds.some((round) => round.cycle === cycle && round.materials_released);
}

export function getStudyRole(pairPosition?: string, cycle = 1) {
  if (pairPosition === "A") return cycle === 1 ? "professional" : "patient";
  if (pairPosition === "B") return cycle === 1 ? "patient" : "professional";
  return null;
}

export function getCycleCaseIndex<T extends AssignmentLike>(
  assignments: T[],
  roundIds: string[],
  participantId?: string,
  pairIndex?: number,
) {
  const cycleAssignments = assignments.filter((assignment) => roundIds.includes(assignment.round_id));

  const directMatch = cycleAssignments.find(
    (assignment) => assignment.participant_id === participantId && assignment.assigned_role === "patient" && assignment.case_index != null,
  );
  if (directMatch?.case_index != null) return directMatch.case_index;

  const pairMatch = cycleAssignments.find(
    (assignment) => assignment.pair_index === pairIndex && assignment.assigned_role === "patient" && assignment.case_index != null,
  );
  if (pairMatch?.case_index != null) return pairMatch.case_index;

  const fallbackMatch = cycleAssignments.find(
    (assignment) => assignment.assigned_role === "patient" && assignment.case_index != null,
  );
  return fallbackMatch?.case_index ?? 0;
}

export function getParticipantCycleRoundId<T extends AssignmentLike>(
  assignments: T[],
  roundIds: string[],
  participantId?: string,
  pairIndex?: number,
) {
  const cycleAssignments = assignments.filter((assignment) => roundIds.includes(assignment.round_id));

  const directMatch = cycleAssignments.find(
    (assignment) => assignment.participant_id === participantId && assignment.assigned_role !== "observer",
  );
  if (directMatch) return directMatch.round_id;

  const pairMatch = cycleAssignments.find(
    (assignment) => assignment.pair_index === pairIndex && assignment.assigned_role !== "observer",
  );
  return pairMatch?.round_id ?? null;
}

export function canAccessCycleMaterials<T extends RoundLike, A extends AssignmentLike>(
  rounds: T[],
  assignments: A[],
  cycle: number,
  roundIds: string[],
  participantId?: string,
  pairIndex?: number,
  activeRound?: T | null,
) {
  if (!areCycleMaterialsReleased(rounds, cycle)) return false;
  if (!activeRound) return true;
  if (activeRound.cycle !== cycle) return false;

  const participantRoundId = getParticipantCycleRoundId(assignments, roundIds, participantId, pairIndex);
  if (!participantRoundId) return true;

  const participantRound = rounds.find((round) => round.id === participantRoundId);
  if (!participantRound) return true;

  return participantRound.status === "pending";
}