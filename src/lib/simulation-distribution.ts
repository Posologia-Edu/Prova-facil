/**
 * Generates round assignments for anamnesis simulation.
 *
 * Logic:
 * - Students are organized in pairs (pair_index 0,1,2...)
 * - Each pair has position A and B
 *
 * Cycle 1: Position A = professional, Position B = patient
 * Cycle 2: Position B = professional, Position A = patient
 *
 * Observers are selected from other pairs using circular rotation.
 *
 * @param pairs - Array of pairs, each pair is an array of 2 participant objects
 * @returns Array of round definitions with assignments
 */

type Participant = {
  id: string;
  pair_index: number;
  pair_position: string;
  student_name: string;
};

type Assignment = {
  participantId: string;
  role: "professional" | "patient" | "observer";
  pairIndex: number;
  caseIndex?: number;
};

type RoundDef = {
  roundNumber: number;
  cycle: number;
  assignments: Assignment[];
};

export function generateRounds(pairs: Participant[][], numCases?: number): RoundDef[] {
  const rounds: RoundDef[] = [];
  const numPairs = pairs.length;
  let roundNumber = 1;
  let caseCounter = 0;

  for (let cycle = 1; cycle <= 2; cycle++) {
    for (let i = 0; i < numPairs; i++) {
      const assignments: Assignment[] = [];
      const activePair = pairs[i];
      const activePairIndex = activePair[0]?.pair_index ?? i;
      const isSolo = activePair.length === 1 || activePair.some(p => p.pair_position === "S");

      if (isSolo) {
        // Solo student: always professional, no patient role swap
        const soloStudent = activePair[0];
        const caseIndex = numCases && numCases > 0 ? caseCounter % numCases : 0;
        caseCounter++;

        if (soloStudent) {
          assignments.push({
            participantId: soloStudent.id,
            role: "professional",
            pairIndex: activePairIndex,
            caseIndex,
          });
        }

        // Only generate one round for solo (cycle 2 is a repeat, skip it)
        if (cycle === 2) continue;
      } else {
        const professional = activePair.find(
          (p) => p.pair_position === (cycle === 1 ? "A" : "B")
        );
        const patient = activePair.find(
          (p) => p.pair_position === (cycle === 1 ? "B" : "A")
        );

        const caseIndex = numCases && numCases > 0 ? caseCounter % numCases : 0;
        caseCounter++;

        if (professional) {
          assignments.push({
            participantId: professional.id,
            role: "professional",
            pairIndex: activePairIndex,
          });
        }

        if (patient) {
          assignments.push({
            participantId: patient.id,
            role: "patient",
            pairIndex: activePairIndex,
            caseIndex,
          });
        }
      }

      const observerPairListIndex = (i + 1) % numPairs;
      if (observerPairListIndex !== i) {
        const observerPair = pairs[observerPairListIndex];
        const observerPairIndex = observerPair[0]?.pair_index ?? observerPairListIndex;
        const observer = observerPair.find(
          (p) => p.pair_position === (cycle === 1 ? "A" : "B")
        ) || observerPair[0];

        if (observer) {
          assignments.push({
            participantId: observer.id,
            role: "observer",
            pairIndex: observerPairIndex,
          });
        }
      }

      if (assignments.length > 0) {
        rounds.push({
          roundNumber,
          cycle,
          assignments,
        });
        roundNumber++;
      }
    }
  }

  return rounds;
}

/**
 * Generates rounds for a MAKEUP (reposição) session inside the same room.
 *
 * @param pairs - Pairs formed by the students doing the makeup. Each pair
 *                may contain 1 (solo) or 2 real makeup participants.
 * @param reusedRoles - Manual roles filled by students who already did anamnesis
 *                (they will only *play* the role, not answer forms).
 *                Format: [{ participantId, role: "patient" | "observer", targetPairListIndex }]
 * @param numCases - Total number of clinical cases available.
 * @param startingRoundNumber - Round number to continue from (after existing rounds).
 * @param makeupBatch - Sequential batch number (1, 2, 3, ...).
 * @param startingCaseCounter - Case counter offset so makeup keeps rotating cases.
 */
export type ReusedRole = {
  participantId: string;
  role: "patient" | "observer";
  targetPairListIndex: number;
};

export function generateMakeupRounds(
  pairs: Participant[][],
  reusedRoles: ReusedRole[],
  numCases: number | undefined,
  startingRoundNumber: number,
  makeupBatch: number,
  startingCaseCounter = 0,
): (RoundDef & { isMakeup: true; makeupBatch: number; reusedParticipantIds: string[] })[] {
  const rounds: (RoundDef & { isMakeup: true; makeupBatch: number; reusedParticipantIds: string[] })[] = [];
  const numPairs = pairs.length;
  let roundNumber = startingRoundNumber;
  let caseCounter = startingCaseCounter;

  const reusedByPair = new Map<number, ReusedRole[]>();
  for (const r of reusedRoles) {
    const arr = reusedByPair.get(r.targetPairListIndex) ?? [];
    arr.push(r);
    reusedByPair.set(r.targetPairListIndex, arr);
  }

  for (let cycle = 1; cycle <= 2; cycle++) {
    for (let i = 0; i < numPairs; i++) {
      const activePair = pairs[i];
      const activePairIndex = activePair[0]?.pair_index ?? i;
      const isSolo = activePair.length === 1 || activePair.some(p => p.pair_position === "S");
      const assignments: Assignment[] = [];
      const reusedIds: string[] = [];
      const pairReused = reusedByPair.get(i) ?? [];

      const caseIndex = numCases && numCases > 0 ? caseCounter % numCases : 0;
      caseCounter++;

      if (isSolo) {
        const soloStudent = activePair[0];
        if (soloStudent) {
          assignments.push({
            participantId: soloStudent.id,
            role: "professional",
            pairIndex: activePairIndex,
            caseIndex,
          });
        }
        // Reused patient (solo needs one)
        const reusedPatient = pairReused.find(r => r.role === "patient");
        if (reusedPatient) {
          assignments.push({
            participantId: reusedPatient.participantId,
            role: "patient",
            pairIndex: activePairIndex,
            caseIndex,
          });
          reusedIds.push(reusedPatient.participantId);
        }
        if (cycle === 2) continue;
      } else {
        const professional = activePair.find(
          (p) => p.pair_position === (cycle === 1 ? "A" : "B")
        );
        const patient = activePair.find(
          (p) => p.pair_position === (cycle === 1 ? "B" : "A")
        );
        if (professional) {
          assignments.push({
            participantId: professional.id,
            role: "professional",
            pairIndex: activePairIndex,
          });
        }
        if (patient) {
          assignments.push({
            participantId: patient.id,
            role: "patient",
            pairIndex: activePairIndex,
            caseIndex,
          });
        }
      }

      // Observer: prefer next pair (like main), otherwise use reused observer
      const observerPairListIndex = (i + 1) % numPairs;
      let observerAssigned = false;
      if (numPairs > 1 && observerPairListIndex !== i) {
        const observerPair = pairs[observerPairListIndex];
        const observerPairIndex = observerPair[0]?.pair_index ?? observerPairListIndex;
        const observer = observerPair.find(
          (p) => p.pair_position === (cycle === 1 ? "A" : "B")
        ) || observerPair[0];
        if (observer) {
          assignments.push({
            participantId: observer.id,
            role: "observer",
            pairIndex: observerPairIndex,
          });
          observerAssigned = true;
        }
      }
      if (!observerAssigned) {
        const reusedObserver = pairReused.find(r => r.role === "observer");
        if (reusedObserver) {
          assignments.push({
            participantId: reusedObserver.participantId,
            role: "observer",
            pairIndex: activePairIndex,
          });
          reusedIds.push(reusedObserver.participantId);
        }
      }

      if (assignments.length > 0) {
        rounds.push({
          roundNumber,
          cycle,
          assignments,
          isMakeup: true,
          makeupBatch,
          reusedParticipantIds: reusedIds,
        });
        roundNumber++;
      }
    }
  }

  return rounds;
}
