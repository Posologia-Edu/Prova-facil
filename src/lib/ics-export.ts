/**
 * Minimal ICS (iCalendar) export for class schedules.
 * RFC 5545 — works in Google Calendar, Outlook, Apple Calendar.
 */

interface IcsEvent {
  uid: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  durationHours?: number;
}

function escapeText(s: string): string {
  return (s || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function toIcsDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export function buildIcs(calendarName: string, events: IcsEvent[]): string {
  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ExamCraft//Class Schedule//PT",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  events.forEach((ev) => {
    if (!ev.date) return;
    const start = new Date(ev.date + "T09:00:00");
    const end = new Date(start.getTime() + (ev.durationHours ?? 2) * 60 * 60 * 1000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.uid}@examcraft`,
      `DTSTAMP:${toIcsDate(now)}`,
      `DTSTART:${toIcsDate(start)}`,
      `DTEND:${toIcsDate(end)}`,
      `SUMMARY:${escapeText(ev.title)}`,
    );
    if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : filename + ".ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
