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
