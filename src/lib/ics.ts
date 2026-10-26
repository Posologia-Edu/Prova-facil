// Exportação de eventos para o formato iCalendar (.ics). Tudo é gerado no navegador.

export interface IcsEvent {
  uid: string;
  title: string;
  description?: string;
  start: Date;
  end?: Date;
  allDay?: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

const dateValue = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

const utcValue = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

const escapeText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// Linhas do iCalendar têm no máximo 75 caracteres; as demais continuam na linha seguinte, com um espaço.
const fold = (line: string) => {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  parts.push(rest);
  return parts.join("\r\n");
};

export function buildIcs(events: IcsEvent[], calendarName = "ProvaFácil"): string {
  const now = utcValue(new Date());
  const lines: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ProvaFacil//Calendario//PT", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${escapeText(calendarName)}`];
  for (const ev of events) {
    lines.push("BEGIN:VEVENT", `UID:${ev.uid}@provafacil`, `DTSTAMP:${now}`);
    if (ev.allDay) {
      const next = new Date(ev.start.getFullYear(), ev.start.getMonth(), ev.start.getDate() + 1);
      lines.push(`DTSTART;VALUE=DATE:${dateValue(ev.start)}`, `DTEND;VALUE=DATE:${dateValue(next)}`);
    } else {
      const end = ev.end && ev.end > ev.start ? ev.end : new Date(ev.start.getTime() + 60 * 60 * 1000);
      lines.push(`DTSTART:${utcValue(ev.start)}`, `DTEND:${utcValue(end)}`);
    }
    lines.push(`SUMMARY:${escapeText(ev.title)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
