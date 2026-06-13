// Notação brasileira de horário: ex. "2T23" = segunda-feira (dia 2), Tarde, 2º e 3º horários.
// Convenção: 1=Domingo, 2=Segunda, 3=Terça, 4=Quarta, 5=Quinta, 6=Sexta, 7=Sábado
// Turno: M = Manhã, T = Tarde, N = Noite

export type Shift = "M" | "T" | "N";

export interface WeeklySlot {
  dayOfWeek: number; // 1-7 (1=Dom .. 7=Sáb na notação BR)
  shift: Shift;
  periods: number[]; // ex: [2,3]
}

export const DAY_LABELS: Record<number, string> = {
  1: "Domingo",
  2: "Segunda",
  3: "Terça",
  4: "Quarta",
  5: "Quinta",
  6: "Sexta",
  7: "Sábado",
};

export const SHIFT_LABELS: Record<Shift, string> = {
  M: "Manhã",
  T: "Tarde",
  N: "Noite",
};

// JS getDay(): 0=Sun..6=Sat. BR notação: 1=Sun..7=Sat -> + 1
export function jsDayToBrDay(jsDay: number): number {
  return jsDay + 1;
}

export function formatSlot(slot: WeeklySlot): string {
  return `${slot.dayOfWeek}${slot.shift}${slot.periods.join("")}`;
}

export function parseSlot(input: string): WeeklySlot | null {
  const s = input.trim().toUpperCase();
  const m = /^([1-7])([MTN])(\d+)$/.exec(s);
  if (!m) return null;
  const periods = m[3].split("").map(Number);
  return { dayOfWeek: Number(m[1]), shift: m[2] as Shift, periods };
}

export function formatSlots(slots: WeeklySlot[]): string {
  return slots.map(formatSlot).join(", ");
}

export function slotsForDate(slots: WeeklySlot[], isoDate: string): WeeklySlot[] {
  if (!isoDate) return [];
  const d = new Date(isoDate + "T12:00:00");
  const br = jsDayToBrDay(d.getDay());
  return slots.filter((s) => s.dayOfWeek === br);
}
