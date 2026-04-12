import { useMemo } from "react";

import { cn } from "@/lib/utils";

interface ClinicalCaseContentProps {
  content: string;
  className?: string;
}

type ContentBlock =
  | { type: "section"; title: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "list"; items: Array<{ level: number; text: string }> }
  | { type: "table"; headers: string[]; rows: string[][] };

const COLUMN_SEPARATOR = /\s{2,}/;

const getNextNonEmptyIndex = (lines: string[], start: number) => {
  for (let index = start; index < lines.length; index += 1) {
    if (lines[index].trim()) return index;
  }

  return -1;
};

const splitColumns = (line: string) =>
  line
    .trim()
    .split(COLUMN_SEPARATOR)
    .map((value) => value.trim())
    .filter(Boolean);

const isSectionHeader = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed.endsWith(":")) return false;

  const core = trimmed.slice(0, -1).trim();
  return Boolean(core) && /[A-ZÀ-Ý]/.test(core) && core === core.toUpperCase();
};

const isBulletLine = (line: string) => /^\s*-\s+/.test(line);

const detectTable = (lines: string[], start: number) => {
  const headerLine = lines[start]?.trim();
  if (!headerLine || isSectionHeader(headerLine)) return null;

  const headers = splitColumns(headerLine);
  if (headers.length < 3) return null;

  const firstRowIndex = getNextNonEmptyIndex(lines, start + 1);
  if (firstRowIndex === -1) return null;

  const firstRow = splitColumns(lines[firstRowIndex]);
  if (firstRow.length !== headers.length) return null;

  const rows: string[][] = [];
  let cursor = firstRowIndex;

  while (cursor < lines.length) {
    if (!lines[cursor].trim()) {
      const nextIndex = getNextNonEmptyIndex(lines, cursor + 1);

      if (nextIndex === -1) {
        return rows.length ? { headers, rows, nextIndex: lines.length } : null;
      }

      const nextLine = lines[nextIndex].trim();
      const nextColumns = splitColumns(nextLine);

      if (isSectionHeader(nextLine) || nextColumns.length !== headers.length) {
        return rows.length ? { headers, rows, nextIndex } : null;
      }

      cursor = nextIndex;
    }

    const currentLine = lines[cursor].trim();
    if (!currentLine || isSectionHeader(currentLine)) break;

    const columns = splitColumns(currentLine);
    if (columns.length !== headers.length) break;

    rows.push(columns);
    cursor += 1;
  }

  return rows.length ? { headers, rows, nextIndex: cursor } : null;
};

const parseClinicalCaseContent = (content: string): ContentBlock[] => {
  const lines = content.replace(/\t/g, "    ").split(/\r?\n/);
  const blocks: ContentBlock[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    blocks.push({ type: "paragraph", lines: paragraphLines });
    paragraphLines = [];
  };

  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushParagraph();
      index += 1;
      continue;
    }

    if (isSectionHeader(trimmed)) {
      flushParagraph();
      blocks.push({ type: "section", title: trimmed.slice(0, -1) });
      index += 1;
      continue;
    }

    if (isBulletLine(rawLine)) {
      flushParagraph();
      const items: Array<{ level: number; text: string }> = [];
      let cursor = index;

      while (cursor < lines.length) {
        if (!lines[cursor].trim()) {
          const nextIndex = getNextNonEmptyIndex(lines, cursor + 1);

          if (nextIndex === -1 || !isBulletLine(lines[nextIndex])) {
            cursor = nextIndex === -1 ? lines.length : nextIndex;
            break;
          }

          cursor = nextIndex;
        }

        const bulletLine = lines[cursor];
        if (!isBulletLine(bulletLine)) break;

        const leadingSpaces = bulletLine.match(/^(\s*)/)?.[1].length ?? 0;

        items.push({
          level: leadingSpaces >= 4 ? 2 : leadingSpaces >= 2 ? 1 : 0,
          text: bulletLine.trim().replace(/^-\s+/, ""),
        });

        cursor += 1;
      }

      blocks.push({ type: "list", items });
      index = cursor;
      continue;
    }

    const detectedTable = detectTable(lines, index);

    if (detectedTable) {
      flushParagraph();
      blocks.push({ type: "table", headers: detectedTable.headers, rows: detectedTable.rows });
      index = detectedTable.nextIndex;
      continue;
    }

    paragraphLines.push(trimmed);
    index += 1;
  }

  flushParagraph();

  return blocks;
};

const renderLabeledLine = (line: string) => {
  const match = line.match(/^([^:]{2,80}:)\s*(.+)$/);

  if (!match) return line;

  const [, label, value] = match;
  const wordCount = label.replace(/:$/, "").trim().split(/\s+/).length;

  if (wordCount > 8) return line;

  return (
    <>
      <span className="font-semibold text-foreground">{label}</span>{" "}
      <span>{value}</span>
    </>
  );
};

export default function ClinicalCaseContent({ content, className }: ClinicalCaseContentProps) {
  const blocks = useMemo(() => parseClinicalCaseContent(content), [content]);

  if (!content.trim()) return null;

  return (
    <article className={cn("space-y-4 text-sm leading-7 text-foreground", className)}>
      {blocks.map((block, index) => {
        if (block.type === "section") {
          return (
            <div key={`section-${index}`} className="pt-2">
              <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {block.title}
              </h3>
            </div>
          );
        }

        if (block.type === "paragraph") {
          return (
            <p key={`paragraph-${index}`} className="text-sm leading-7 text-foreground">
              {block.lines.map((line, lineIndex) => (
                <span key={`line-${index}-${lineIndex}`}>
                  {renderLabeledLine(line)}
                  {lineIndex < block.lines.length - 1 && <br />}
                </span>
              ))}
            </p>
          );
        }

        if (block.type === "list") {
          return (
            <div key={`list-${index}`} className="space-y-2">
              {block.items.map((item, itemIndex) => (
                <div
                  key={`item-${index}-${itemIndex}`}
                  className={cn(
                    "flex items-start gap-3 text-sm leading-7 text-foreground",
                    item.level === 1 && "ml-6",
                    item.level >= 2 && "ml-12",
                  )}
                >
                  <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                  <span className="flex-1">{renderLabeledLine(item.text)}</span>
                </div>
              ))}
            </div>
          );
        }

        return (
          <div key={`table-${index}`} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-sm tabular-nums">
                <thead>
                  <tr className="bg-muted/50">
                    {block.headers.map((header, headerIndex) => (
                      <th
                        key={`header-${index}-${headerIndex}`}
                        className="border-b border-r border-border px-4 py-3 text-left text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground last:border-r-0"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={`row-${index}-${rowIndex}`} className={cn(rowIndex % 2 === 1 && "bg-muted/20")}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`cell-${index}-${rowIndex}-${cellIndex}`}
                          className={cn(
                            "border-r border-border px-4 py-3 align-top text-sm leading-6 text-foreground last:border-r-0",
                            rowIndex < block.rows.length - 1 && "border-b",
                          )}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </article>
  );
}