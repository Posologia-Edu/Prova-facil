import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Trash2, GripVertical, MoreVertical, Copy, ArrowUp, ArrowDown, SeparatorHorizontal, ChevronUp, ChevronDown } from "lucide-react";
import { FormField, getSections } from "./types";

interface FormBuilderProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
  showScores?: boolean;
  scoreLabel?: string;
}

export default function FormBuilder({ fields, onChange, showScores = false, scoreLabel = "Pts" }: FormBuilderProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const addField = (atIndex?: number) => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      label: "",
      type: "textarea",
      max_score: 0,
      required: false,
    };
    if (atIndex !== undefined) {
      const updated = [...fields];
      updated.splice(atIndex + 1, 0, newField);
      onChange(updated);
    } else {
      onChange([...fields, newField]);
    }
  };

  const addSectionHeader = (atIndex?: number) => {
    const newSection: FormField = {
      id: crypto.randomUUID(),
      label: "",
      type: "section_header",
      description: "",
    };
    if (atIndex !== undefined) {
      const updated = [...fields];
      updated.splice(atIndex, 0, newSection);
      onChange(updated);
    } else {
      onChange([...fields, newSection]);
    }
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const moveField = (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= fields.length) return;
    const updated = [...fields];
    [updated[fromIndex], updated[toIndex]] = [updated[toIndex], updated[fromIndex]];
    onChange(updated);
  };

  // Section operations
  const getSectionRange = (sectionStartIndex: number): [number, number] => {
    let end = sectionStartIndex + 1;
    while (end < fields.length && fields[end].type !== "section_header") {
      end++;
    }
    return [sectionStartIndex, end];
  };

  const duplicateSection = (sectionStartIndex: number) => {
    const [start, end] = getSectionRange(sectionStartIndex);
    const sectionFields = fields.slice(start, end).map(f => ({ ...f, id: crypto.randomUUID() }));
    const updated = [...fields];
    updated.splice(end, 0, ...sectionFields);
    onChange(updated);
  };

  const deleteSection = (sectionStartIndex: number) => {
    const [start, end] = getSectionRange(sectionStartIndex);
    onChange(fields.filter((_, i) => i < start || i >= end));
  };

  const moveSection = (sectionStartIndex: number, direction: "up" | "down") => {
    const [start, end] = getSectionRange(sectionStartIndex);
    const sectionFields = fields.slice(start, end);
    const remaining = [...fields.filter((_, i) => i < start || i >= end)];

    if (direction === "up") {
      // Find previous section start
      let prevStart = start - 1;
      while (prevStart > 0 && remaining[prevStart - 1]?.type !== "section_header") {
        prevStart--;
      }
      if (prevStart < 0) prevStart = 0;
      // In the remaining array, the previous section start is at a shifted index
      let insertAt = start - sectionFields.length;
      // Find the start of the previous section in remaining
      let target = start - 1;
      while (target > 0 && fields[target - 1]?.type !== "section_header") target--;
      if (target < 0) target = 0;
      remaining.splice(target, 0, ...sectionFields);
      onChange(remaining);
    } else {
      // Find next section
      if (end >= fields.length) return; // Already last
      const [nextStart, nextEnd] = getSectionRange(end);
      const afterRemoval = fields.filter((_, i) => i < start || i >= end);
      // nextStart shifted by section length
      const shiftedNextEnd = nextEnd - sectionFields.length;
      afterRemoval.splice(shiftedNextEnd, 0, ...sectionFields);
      onChange(afterRemoval);
    }
  };

  const mergeSectionWithAbove = (sectionStartIndex: number) => {
    if (sectionStartIndex === 0) return;
    // Just remove the section header
    onChange(fields.filter((_, i) => i !== sectionStartIndex));
  };

  const toggleCollapse = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const sections = getSections(fields);

  const getFieldGlobalIndex = (field: FormField) => fields.findIndex(f => f.id === field.id);

  return (
    <div className="space-y-4">
      {sections.map((section, sectionIdx) => {
        const isCollapsed = section.header ? collapsedSections.has(section.header.id) : false;
        const sectionGlobalStart = section.header ? getFieldGlobalIndex(section.header) : (section.fields.length > 0 ? getFieldGlobalIndex(section.fields[0]) : 0);

        return (
          <div key={section.header?.id || `section-${sectionIdx}`} className="space-y-2">
            {/* Section Header */}
            {section.header && (
              <div className="relative">
                <div className="bg-primary/5 border-l-4 border-l-primary rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Seção {sectionIdx + 1} de {sections.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCollapse(section.header!.id)}
                        className="h-7 w-7 p-0"
                      >
                        {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => duplicateSection(sectionGlobalStart)}>
                            <Copy className="h-4 w-4 mr-2" />Duplicar seção
                          </DropdownMenuItem>
                          {sectionIdx > 0 && (
                            <DropdownMenuItem onClick={() => moveSection(sectionGlobalStart, "up")}>
                              <ArrowUp className="h-4 w-4 mr-2" />Mover seção acima
                            </DropdownMenuItem>
                          )}
                          {sectionIdx < sections.length - 1 && (
                            <DropdownMenuItem onClick={() => moveSection(sectionGlobalStart, "down")}>
                              <ArrowDown className="h-4 w-4 mr-2" />Mover seção abaixo
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => deleteSection(sectionGlobalStart)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />Excluir seção
                          </DropdownMenuItem>
                          {sectionIdx > 0 && (
                            <DropdownMenuItem onClick={() => mergeSectionWithAbove(sectionGlobalStart)}>
                              <SeparatorHorizontal className="h-4 w-4 mr-2" />Mesclar com a seção acima
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <Input
                    value={section.header.label}
                    onChange={(e) => updateField(getFieldGlobalIndex(section.header!), { label: e.target.value })}
                    placeholder="Título da seção"
                    className="text-lg font-semibold border-none bg-transparent px-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/50"
                  />
                  <Textarea
                    value={section.header.description || ""}
                    onChange={(e) => updateField(getFieldGlobalIndex(section.header!), { description: e.target.value })}
                    placeholder="Descrição (opcional)"
                    className="border-none bg-transparent px-0 resize-none min-h-[2rem] focus-visible:ring-0 placeholder:text-muted-foreground/50 text-sm text-muted-foreground"
                    rows={1}
                  />
                </div>
              </div>
            )}

            {/* Fields in this section */}
            {!isCollapsed && (
              <div className="space-y-2 pl-1">
                {section.fields.map((field) => {
                  const globalIdx = getFieldGlobalIndex(field);
                  return (
                    <div key={field.id} className="group border rounded-lg p-3 bg-card hover:shadow-sm transition-shadow">
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col items-center gap-0.5 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => moveField(globalIdx, "up")}
                            disabled={globalIdx === 0}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => moveField(globalIdx, "down")}
                            disabled={globalIdx === fields.length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Pergunta / Rótulo"
                              value={field.label}
                              onChange={(e) => updateField(globalIdx, { label: e.target.value })}
                              className="flex-1"
                            />
                            <Select value={field.type} onValueChange={(v) => updateField(globalIdx, { type: v as any })}>
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Texto curto</SelectItem>
                                <SelectItem value="textarea">Texto longo</SelectItem>
                                <SelectItem value="radio">Múltipla escolha</SelectItem>
                                <SelectItem value="checkbox">Checkbox</SelectItem>
                                <SelectItem value="scale">Escala</SelectItem>
                              </SelectContent>
                            </Select>
                            {showScores && (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={field.max_score || 0}
                                  onChange={(e) => updateField(globalIdx, { max_score: Number(e.target.value) })}
                                  className="w-20"
                                  min={0}
                                  step={0.5}
                                  title={scoreLabel}
                                />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">{scoreLabel}</span>
                              </div>
                            )}
                          </div>
                          {(field.type === "radio" || field.type === "checkbox") && (
                            <Input
                              placeholder="Opções separadas por vírgula"
                              value={field.options?.join(", ") || ""}
                              onChange={(e) => updateField(globalIdx, { options: e.target.value.split(",").map(o => o.trim()) })}
                              className="text-sm"
                            />
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeField(globalIdx)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add field / section buttons after each section */}
            {!isCollapsed && (
              <div className="flex items-center gap-2 pl-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const lastFieldInSection = section.fields.length > 0
                      ? getFieldGlobalIndex(section.fields[section.fields.length - 1])
                      : (section.header ? getFieldGlobalIndex(section.header) : -1);
                    addField(lastFieldInSection);
                  }}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />Pergunta
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const lastFieldInSection = section.fields.length > 0
                      ? getFieldGlobalIndex(section.fields[section.fields.length - 1]) + 1
                      : (section.header ? getFieldGlobalIndex(section.header) + 1 : fields.length);
                    addSectionHeader(lastFieldInSection);
                  }}
                  className="text-xs"
                >
                  <SeparatorHorizontal className="h-3 w-3 mr-1" />Seção
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {fields.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground mb-3">Nenhum campo adicionado</p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => addField()}>
              <Plus className="h-3 w-3 mr-1" />Pergunta
            </Button>
            <Button variant="outline" size="sm" onClick={() => addSectionHeader()}>
              <SeparatorHorizontal className="h-3 w-3 mr-1" />Seção
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
