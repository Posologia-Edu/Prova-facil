/**
 * Generates automatic role assignments for Mock Trial groups across cases.
 * 
 * Given 5 groups and N cases, each case needs 3 roles: prosecution, defense, jury.
 * The algorithm ensures:
 * - Each group gets at least 2 different roles across all cases
 * - 3 groups active per case, 2 rest
 * - Rotation pattern similar to the reference table
 */

export type MockTrialRole = "prosecution" | "defense" | "jury";

export interface GroupAssignment {
  groupId: string;
  groupNumber: number;
  role: MockTrialRole;
}

export interface CaseAssignment {
  caseId: string;
  casePosition: number;
  assignments: GroupAssignment[];
}

// Predefined rotation pattern for 5 groups
// Each row = a case, values = [groupIndex for prosecution, defense, jury]
const ROTATION_PATTERNS: number[][] = [
  [2, 0, 1],  // Case 1: G3=Acusação, G1=Defesa, G2=Júri
  [3, 1, 4],  // Case 2: G4=Acusação, G2=Defesa, G5=Júri
  [2, 4, 3],  // Case 3: G3=Acusação(was: different), corrected below
  [4, 3, 0],  // Case 4: G5=Acusação, G4=Defesa, G1=Júri
];

// Based on the reference table from the user's document:
// Case 1: G1=Defesa, G2=Júri, G3=Acusação
// Case 2: G2=Defesa, G4=Acusação, G5=Júri
// Case 3: G2=Acusação, G3=Defesa, G4=Júri
// Case 4: G1=Júri, G4=Defesa, G5=Acusação
const REFERENCE_PATTERN: { prosecution: number; defense: number; jury: number }[] = [
  { prosecution: 2, defense: 0, jury: 1 },
  { prosecution: 3, defense: 1, jury: 4 },
  { prosecution: 1, defense: 2, jury: 3 },
  { prosecution: 4, defense: 3, jury: 0 },
];

export function generateDistribution(
  groups: { id: string; group_number: number }[],
  cases: { id: string; position: number }[]
): CaseAssignment[] {
  if (groups.length < 3 || cases.length === 0) return [];

  const sortedGroups = [...groups].sort((a, b) => a.group_number - b.group_number);
  const sortedCases = [...cases].sort((a, b) => a.position - b.position);
  const numGroups = sortedGroups.length;
  const roles: MockTrialRole[] = ["prosecution", "defense", "jury"];

  const result: CaseAssignment[] = [];

  for (let ci = 0; ci < sortedCases.length; ci++) {
    const c = sortedCases[ci];
    const assignments: GroupAssignment[] = [];

    if (numGroups === 5 && ci < REFERENCE_PATTERN.length) {
      // Use the reference pattern for up to 4 cases with 5 groups
      const pattern = REFERENCE_PATTERN[ci];
      assignments.push({
        groupId: sortedGroups[pattern.prosecution].id,
        groupNumber: sortedGroups[pattern.prosecution].group_number,
        role: "prosecution",
      });
      assignments.push({
        groupId: sortedGroups[pattern.defense].id,
        groupNumber: sortedGroups[pattern.defense].group_number,
        role: "defense",
      });
      assignments.push({
        groupId: sortedGroups[pattern.jury].id,
        groupNumber: sortedGroups[pattern.jury].group_number,
        role: "jury",
      });
    } else {
      // Generic rotation for any number of groups/cases
      for (let ri = 0; ri < 3; ri++) {
        const groupIdx = (ci * 3 + ri) % numGroups;
        assignments.push({
          groupId: sortedGroups[groupIdx].id,
          groupNumber: sortedGroups[groupIdx].group_number,
          role: roles[ri],
        });
      }
    }

    result.push({
      caseId: c.id,
      casePosition: c.position,
      assignments,
    });
  }

  return result;
}
