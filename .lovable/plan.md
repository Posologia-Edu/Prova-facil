

## Plan: Fix Material Release + Student Count + Split Room Feature

### Problem 1: Materials not releasing for all participants

**Root cause analysis**: The material release logic appears correct in code, but the issue likely stems from a timing/state issue. After investigating, I believe the problem is that when the professor releases materials and students poll, the `currentCycle` variable (line 269) depends on `nextPendingRound?.cycle || activeRound?.cycle`. If there's any edge case where the student's local `allRounds` state hasn't updated yet, `currentCycle` becomes `undefined` and `cycleMaterialsReleased` evaluates to `false`, showing the waiting screen.

**Fix**: Add a fallback for `currentCycle` — default to cycle 1 if no pending/active round is found but rounds exist. Also add debug logging and ensure the `cycleMaterialsReleased` check is more robust by looking at ALL rounds, not just ones matching the current cycle.

**File**: `src/pages/SimulationJoin.tsx`
- Change `currentCycle` calculation to include a fallback: check the first available round's cycle if no pending/active round exists
- Add a safeguard: if rounds exist and any has `materials_released = true`, consider materials released regardless of cycle matching

---

### Feature 2: Show student count on room cards

**File**: `src/pages/Simulations.tsx`
- Update the query to also fetch participant counts per room (separate query or join)
- Display a `Users` icon with the student count next to the duration on each room card

**Implementation**:
- Add a second query to fetch `simulation_participants` grouped by `room_id` with count, filtered to `participant_role = 'student'`
- Display on the card as `<Users icon> N alunos`

---

### Feature 3: Split Room mode

This is a significant new feature. The admin can split a room into multiple sub-rooms, assigning students and a professor to each new room.

**Flow**:
1. On the room card or editor, add a "Dividir Sala" button
2. Opens a dialog where admin:
   - Chooses how many rooms to split into (2, 3, 4...)
   - For each new room: assigns a professor name/email and selects students
   - The original room keeps its PIN and retains unselected students
   - Each new room gets a new auto-generated PIN
3. On confirm: creates new `simulation_rooms` entries, copies forms from the original room, moves selected participants to new rooms

**Files to modify**:
- `src/pages/Simulations.tsx` — Add "Dividir" button on room cards
- New component `src/components/SplitRoomDialog.tsx`:
  - Input: number of sub-rooms
  - For each sub-room: professor name/email fields + student multi-select
  - Preview of distribution before confirming
- On confirmation:
  - Create N-1 new rooms (original keeps its students/PIN)
  - Copy all `simulation_forms` from original room to new rooms
  - Move selected `simulation_participants` to new rooms (update `room_id`)
  - Add professor participant to each new room

**Database**: No schema changes needed — existing `simulation_rooms`, `simulation_participants`, and `simulation_forms` tables support this.

---

### Summary of changes

| File | Change |
|------|--------|
| `src/pages/SimulationJoin.tsx` | Fix `currentCycle` fallback for material release |
| `src/pages/Simulations.tsx` | Add student count display + split room button |
| `src/components/SplitRoomDialog.tsx` | New dialog for splitting rooms |

