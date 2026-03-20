import { describe, expect, it } from "vitest";

import { generateRounds } from "@/lib/simulation-distribution";
import {
  areCycleMaterialsReleased,
  canAccessCycleMaterials,
  getCycleCaseIndex,
  getMaterialCycle,
  getParticipantCycleRoundId,
  getStudyRole,
} from "@/lib/simulation-materials";

describe("simulation material helpers", () => {
  it("prioritizes the released pending cycle for material study", () => {
    const rounds = [
      { id: "r1", cycle: 1, round_number: 1, status: "pending", materials_released: true },
      { id: "r2", cycle: 2, round_number: 2, status: "pending", materials_released: false },
    ];

    expect(getMaterialCycle(rounds, null)).toBe(1);
    expect(areCycleMaterialsReleased(rounds, 1)).toBe(true);
    expect(areCycleMaterialsReleased(rounds, 2)).toBe(false);
  });

  it("derives study role by pair position and cycle", () => {
    expect(getStudyRole("A", 1)).toBe("professional");
    expect(getStudyRole("B", 1)).toBe("patient");
    expect(getStudyRole("A", 2)).toBe("patient");
    expect(getStudyRole("B", 2)).toBe("professional");
  });

  it("finds the patient case from the participant pair when needed", () => {
    const assignments = [
      { round_id: "r1", participant_id: "student-a", pair_index: 7, assigned_role: "professional", case_index: null },
      { round_id: "r1", participant_id: "student-b", pair_index: 7, assigned_role: "patient", case_index: 3 },
    ];

    expect(getCycleCaseIndex(assignments, ["r1"], "student-a", 7)).toBe(3);
  });

  it("keeps cycle materials available for pairs still pending in the active cycle", () => {
    const rounds = [
      { id: "r1", cycle: 1, round_number: 1, status: "active", materials_released: true },
      { id: "r2", cycle: 1, round_number: 2, status: "pending", materials_released: true },
    ];
    const assignments = [
      { round_id: "r1", participant_id: "student-a", pair_index: 0, assigned_role: "professional", case_index: null },
      { round_id: "r1", participant_id: "student-b", pair_index: 0, assigned_role: "patient", case_index: 0 },
      { round_id: "r2", participant_id: "student-c", pair_index: 1, assigned_role: "professional", case_index: null },
      { round_id: "r2", participant_id: "student-d", pair_index: 1, assigned_role: "patient", case_index: 1 },
    ];

    expect(getParticipantCycleRoundId(assignments, ["r1", "r2"], "student-c", 1)).toBe("r2");
    expect(canAccessCycleMaterials(rounds, assignments, 1, ["r1", "r2"], "student-c", 1, rounds[0])).toBe(true);
  });

  it("blocks cycle materials after the participant pair already completed its round", () => {
    const rounds = [
      { id: "r1", cycle: 1, round_number: 1, status: "completed", materials_released: true },
      { id: "r2", cycle: 1, round_number: 2, status: "active", materials_released: true },
    ];
    const assignments = [
      { round_id: "r1", participant_id: "student-a", pair_index: 0, assigned_role: "professional", case_index: null },
      { round_id: "r1", participant_id: "student-b", pair_index: 0, assigned_role: "patient", case_index: 0 },
      { round_id: "r2", participant_id: "student-c", pair_index: 1, assigned_role: "professional", case_index: null },
      { round_id: "r2", participant_id: "student-d", pair_index: 1, assigned_role: "patient", case_index: 1 },
    ];

    expect(canAccessCycleMaterials(rounds, assignments, 1, ["r1", "r2"], "student-a", 0, rounds[1])).toBe(false);
  });

  it("preserves the original pair index when generating rounds", () => {
    const rounds = generateRounds([
      [
        { id: "a", pair_index: 4, pair_position: "A", student_name: "Aluno A" },
        { id: "b", pair_index: 4, pair_position: "B", student_name: "Aluno B" },
      ],
    ]);

    expect(rounds[0].assignments.every((assignment) => assignment.pairIndex === 4)).toBe(true);
  });
});