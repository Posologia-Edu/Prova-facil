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
};

type RoundDef = {
  roundNumber: number;
  cycle: number;
  assignments: Assignment[];
};

export function generateRounds(pairs: Participant[][]): RoundDef[] {
  const rounds: RoundDef[] = [];
  const numPairs = pairs.length;
  let roundNumber = 1;

  for (let cycle = 1; cycle <= 2; cycle++) {
    for (let i = 0; i < numPairs; i++) {
      const assignments: Assignment[] = [];
      const activePair = pairs[i];

      // Determine professional and patient based on cycle
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
          pairIndex: i,
        });
      }

      if (patient) {
        assignments.push({
          participantId: patient.id,
          role: "patient",
          pairIndex: i,
        });
      }

      // Select observer from another pair (circular)
      const observerPairIndex = (i + 1) % numPairs;
      if (observerPairIndex !== i) {
        const observerPair = pairs[observerPairIndex];
        // Pick the student who is position A in cycle 1, B in cycle 2
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

      rounds.push({
        roundNumber,
        cycle,
        assignments,
      });
      roundNumber++;
    }
  }

  return rounds;
}
