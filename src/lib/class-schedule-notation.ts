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

// Accepts single ("2T23") or multi-day ("245T12") notation. Returns expanded list.
export function parseSlot(input: string): WeeklySlot[] {
  const s = input.trim().toUpperCase();
  const m = /^([1-7]+)([MTN])(\d+)$/.exec(s);
  if (!m) return [];
  const days = m[1].split("").map(Number);
  const periods = m[3].split("").map(Number);
  const shift = m[2] as Shift;
  return days.map((d) => ({ dayOfWeek: d, shift, periods }));
}

// Group slots by shift+periods into compact notation (e.g. 245T12, 6T56).
export function formatSlots(slots: WeeklySlot[]): string {
  const groups = new Map<string, number[]>();
  for (const s of slots) {
    const key = `${s.shift}|${s.periods.join("")}`;
    const arr = groups.get(key) || [];
    if (!arr.includes(s.dayOfWeek)) arr.push(s.dayOfWeek);
    groups.set(key, arr);
  }
  return Array.from(groups.entries())
    .map(([key, days]) => {
      const [shift, periods] = key.split("|");
      return `${days.sort().join("")}${shift}${periods}`;
    })
    .join(", ");
}

export function parseSlotsInput(input: string): { ok: WeeklySlot[]; invalid: string[] } {
  const parts = input.split(/[,;\s]+/).filter(Boolean);
  const ok: WeeklySlot[] = [];
  const invalid: string[] = [];
  for (const p of parts) {
    const slots = parseSlot(p);
    if (slots.length) ok.push(...slots);
    else invalid.push(p);
  }
  return { ok, invalid };
}

export function slotsForDate(slots: WeeklySlot[], isoDate: string): WeeklySlot[] {
  if (!isoDate) return [];
  const d = new Date(isoDate + "T12:00:00");
  const br = jsDayToBrDay(d.getDay());
  return slots.filter((s) => s.dayOfWeek === br);
}
