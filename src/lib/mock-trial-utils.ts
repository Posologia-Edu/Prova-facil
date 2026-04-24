// Utilities shared across mock trial UI components

// Format a group label avoiding "Grupo N – Grupo N" duplication when the
// custom name is itself the auto-generated "Grupo X" label.
export function formatGroupLabel(
  group: { group_number?: number | null; name?: string | null } | null | undefined,
): string {
  if (!group) return "";
  const name = (group.name || "").trim();
  const base = `Grupo ${group.group_number ?? ""}`.trim();
  if (!name) return base;
  if (/^grupo\b/i.test(name)) return name;
  return `${base} – ${name}`;
}
