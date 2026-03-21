import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Trash2, GripVertical, MoreVertical, Copy, ArrowUp, ArrowDown,
  SeparatorHorizontal, ChevronUp, ChevronDown, FileText, Image, Video,
  Type, Import, CheckCircle2, Key,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormField, FormFieldType, FIELD_TYPE_LABELS, getSections } from "./types";
import FormImportDialog from "./FormImportDialog";

interface FormBuilderProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
  showScores?: boolean;
  scoreLabel?: string;
  /** Which form table to query for imports: simulation_forms, soap_forms, etc. */
  formTable?: string;
}

export default function FormBuilder({ fields, onChange, showScores = false, scoreLabel = "Pts", formTable }: FormBuilderProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [toolbarTop, setToolbarTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const setFieldRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) fieldRefs.current.set(id, el);
    else fieldRefs.current.delete(id);
  }, []);

  // Update toolbar position when selected field changes
  useEffect(() => {
    if (!selectedFieldId || !containerRef.current) {
      setToolbarTop(0);
      return;
    }
    const fieldEl = fieldRefs.current.get(selectedFieldId);
    if (!fieldEl) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const fieldRect = fieldEl.getBoundingClientRect();
    setToolbarTop(fieldRect.top - containerRect.top);
  }, [selectedFieldId, fields]);

  // Find the insertion index (after the currently selected field, or at the end)
  const getInsertIndex = (): number => {
    if (selectedFieldId) {
      const idx = fields.findIndex(f => f.id === selectedFieldId);
      if (idx >= 0) return idx + 1;
    }
    return fields.length;
  };

  const insertField = (newField: FormField) => {
    const idx = getInsertIndex();
    const updated = [...fields];
    updated.splice(idx, 0, newField);
    onChange(updated);
    setSelectedFieldId(newField.id);
  };

  const addField = (type: FormFieldType = "textarea") => {
    insertField({
      id: crypto.randomUUID(),
      label: "",
      type,
      max_score: 0,
      required: false,
      ...(type === "radio" || type === "checkbox" || type === "dropdown" ? { options: ["Opção 1"] } : {}),
      ...(type === "rating" ? { rating_max: 5 } : {}),
    });
  };

  const addSectionHeader = () => {
    const idx = getInsertIndex();
    const newSection: FormField = {
      id: crypto.randomUUID(),
      label: "",
      type: "section_header",
      description: "",
    };
    const updated = [...fields];
    updated.splice(idx, 0, newSection);
    onChange(updated);
    setSelectedFieldId(newSection.id);
  };

  const addTitleDescription = () => {
    insertField({
      id: crypto.randomUUID(),
      label: "",
      type: "section_header",
      description: "",
    });
  };

  const addImageBlock = () => {
    insertField({
      id: crypto.randomUUID(),
      label: "Imagem",
      type: "image_block",
      media_url: "",
    });
  };

  const addVideoBlock = () => {
    insertField({
      id: crypto.randomUUID(),
      label: "Vídeo",
      type: "video_block",
      media_url: "",
    });
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const duplicateField = (index: number) => {
    const copy = { ...fields[index], id: crypto.randomUUID() };
    const updated = [...fields];
    updated.splice(index + 1, 0, copy);
    onChange(updated);
    setSelectedFieldId(copy.id);
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
    while (end < fields.length && fields[end].type !== "section_header") end++;
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
      let target = start - 1;
      while (target > 0 && fields[target - 1]?.type !== "section_header") target--;
      if (target < 0) target = 0;
      remaining.splice(target, 0, ...sectionFields);
      onChange(remaining);
    } else {
      if (end >= fields.length) return;
      const [, nextEnd] = getSectionRange(end);
      const afterRemoval = fields.filter((_, i) => i < start || i >= end);
      const shiftedNextEnd = nextEnd - sectionFields.length;
      afterRemoval.splice(shiftedNextEnd, 0, ...sectionFields);
      onChange(afterRemoval);
    }
  };

  const mergeSectionWithAbove = (sectionStartIndex: number) => {
    if (sectionStartIndex === 0) return;
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

  const handleImport = (importedFields: FormField[]) => {
    const idx = getInsertIndex();
    const updated = [...fields];
    const newFields = importedFields.map(f => ({ ...f, id: crypto.randomUUID() }));
    updated.splice(idx, 0, ...newFields);
    onChange(updated);
    if (newFields.length > 0) setSelectedFieldId(newFields[newFields.length - 1].id);
  };

  const sections = getSections(fields);
  const getFieldGlobalIndex = (field: FormField) => fields.findIndex(f => f.id === field.id);

  // Question types that can be selected in the type dropdown (excludes special blocks)
  const questionTypes: FormFieldType[] = ["text", "textarea", "radio", "checkbox", "dropdown", "scale", "rating", "date", "file_upload"];

  const renderFieldEditor = (field: FormField, globalIdx: number) => {
    const isSelected = selectedFieldId === field.id;

    // Image block
    if (field.type === "image_block") {
      return (
        <div
          key={field.id}
          ref={(el) => setFieldRef(field.id, el)}
          className={`group border rounded-lg p-4 bg-card transition-all cursor-pointer ${isSelected ? "ring-2 ring-primary shadow-md" : "hover:shadow-sm"}`}
          onClick={() => setSelectedFieldId(field.id)}
        >
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Image className="h-4 w-4" /> Bloco de imagem
            </Label>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); duplicateField(globalIdx); }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); removeField(globalIdx); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <Input
            placeholder="URL da imagem"
            value={field.media_url || ""}
            onChange={(e) => updateField(globalIdx, { media_url: e.target.value })}
            className="text-sm"
          />
          {field.media_url && (
            <div className="mt-2 rounded-md overflow-hidden max-h-48">
              <img src={field.media_url} alt="" className="w-full object-contain max-h-48" />
            </div>
          )}
        </div>
      );
    }

    // Video block
    if (field.type === "video_block") {
      return (
        <div
          key={field.id}
          ref={(el) => setFieldRef(field.id, el)}
          className={`group border rounded-lg p-4 bg-card transition-all cursor-pointer ${isSelected ? "ring-2 ring-primary shadow-md" : "hover:shadow-sm"}`}
          onClick={() => setSelectedFieldId(field.id)}
        >
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Video className="h-4 w-4" /> Bloco de vídeo
            </Label>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); duplicateField(globalIdx); }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); removeField(globalIdx); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <Input
            placeholder="URL do vídeo (YouTube, Vimeo, etc.)"
            value={field.media_url || ""}
            onChange={(e) => updateField(globalIdx, { media_url: e.target.value })}
            className="text-sm"
          />
          {field.media_url && (
            <div className="mt-2 aspect-video rounded-md overflow-hidden bg-muted">
              <iframe src={field.media_url} className="w-full h-full" allowFullScreen />
            </div>
          )}
        </div>
      );
    }

    // Regular question field
    return (
      <div
        key={field.id}
        ref={(el) => setFieldRef(field.id, el)}
        className={`group border rounded-lg p-3 bg-card transition-all cursor-pointer ${isSelected ? "ring-2 ring-primary shadow-md" : "hover:shadow-sm"}`}
        onClick={() => setSelectedFieldId(field.id)}
      >
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-center gap-0.5 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); moveField(globalIdx, "up"); }} disabled={globalIdx === 0}>
              <ChevronUp className="h-3 w-3" />
            </Button>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); moveField(globalIdx, "down"); }} disabled={globalIdx === fields.length - 1}>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                placeholder="Pergunta / Rótulo"
                value={field.label}
                onChange={(e) => updateField(globalIdx, { label: e.target.value })}
                className="flex-1 min-w-[180px]"
              />
              <Select value={field.type} onValueChange={(v) => updateField(globalIdx, { type: v as FormFieldType })}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {questionTypes.map(t => (
                    <SelectItem key={t} value={t}>{FIELD_TYPE_LABELS[t]}</SelectItem>
                  ))}
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

            {/* Description field */}
            {isSelected && (
              <Input
                placeholder="Descrição da pergunta (opcional)"
                value={field.description || ""}
                onChange={(e) => updateField(globalIdx, { description: e.target.value })}
                className="text-sm text-muted-foreground"
              />
            )}

            {/* Options for radio/checkbox/dropdown */}
            {(field.type === "radio" || field.type === "checkbox" || field.type === "dropdown") && (
              <div className="space-y-1.5">
                {(field.options || []).map((opt, optIdx) => (
                  <div key={optIdx} className="flex items-center gap-2">
                    {field.type === "radio" && <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40" />}
                    {field.type === "checkbox" && <div className="h-4 w-4 rounded border-2 border-muted-foreground/40" />}
                    {field.type === "dropdown" && <span className="text-xs text-muted-foreground w-5">{optIdx + 1}.</span>}
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...(field.options || [])];
                        newOpts[optIdx] = e.target.value;
                        updateField(globalIdx, { options: newOpts });
                      }}
                      className="flex-1 text-sm"
                      placeholder={`Opção ${optIdx + 1}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        const newOpts = (field.options || []).filter((_, i) => i !== optIdx);
                        updateField(globalIdx, { options: newOpts });
                      }}
                      disabled={(field.options || []).length <= 1}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary"
                  onClick={() => updateField(globalIdx, { options: [...(field.options || []), `Opção ${(field.options?.length || 0) + 1}`] })}
                >
                  <Plus className="h-3 w-3 mr-1" /> Adicionar opção
                </Button>
              </div>
            )}

            {/* Scale settings */}
            {field.type === "scale" && isSelected && (
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Mín:</span>
                  <Input value={field.scale_min_label || ""} onChange={(e) => updateField(globalIdx, { scale_min_label: e.target.value })} className="w-24 h-8 text-xs" placeholder="Rótulo" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Máx:</span>
                  <Input value={field.scale_max_label || ""} onChange={(e) => updateField(globalIdx, { scale_max_label: e.target.value })} className="w-24 h-8 text-xs" placeholder="Rótulo" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Até:</span>
                  <Input type="number" value={field.max_score || 10} onChange={(e) => updateField(globalIdx, { max_score: Number(e.target.value) })} className="w-16 h-8 text-xs" min={2} max={10} />
                </div>
              </div>
            )}

            {/* Rating settings */}
            {field.type === "rating" && isSelected && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Estrelas:</span>
                <Select value={String(field.rating_max || 5)} onValueChange={(v) => updateField(globalIdx, { rating_max: Number(v) })}>
                  <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[3, 4, 5, 7, 10].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Answer key section - shown when scores are enabled and field has points */}
            {showScores && (field.max_score || 0) > 0 && isSelected && (
              <div className="mt-3 p-3 bg-accent/30 border border-accent rounded-lg space-y-2">
                <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                  <Key className="h-4 w-4" />
                  <span>Chave de resposta</span>
                </div>

                {/* Radio / Dropdown: select one correct option */}
                {(field.type === "radio" || field.type === "dropdown") && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Selecione a alternativa correta:</p>
                    <RadioGroup
                      value={field.correct_answer != null ? String(field.correct_answer) : ""}
                      onValueChange={(v) => updateField(globalIdx, { correct_answer: Number(v) })}
                    >
                      {(field.options || []).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <RadioGroupItem value={String(optIdx)} id={`ans-${field.id}-${optIdx}`} />
                          <Label htmlFor={`ans-${field.id}-${optIdx}`} className="text-sm cursor-pointer">
                            {opt || `Opção ${optIdx + 1}`}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    {field.correct_answer != null && (
                      <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => updateField(globalIdx, { correct_answer: undefined })}>
                        Limpar seleção
                      </Button>
                    )}
                  </div>
                )}

                {/* Checkbox: select multiple correct options */}
                {field.type === "checkbox" && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Selecione as alternativas corretas:</p>
                    {(field.options || []).map((opt, optIdx) => {
                      const correctIndices = Array.isArray(field.correct_answer) ? field.correct_answer : [];
                      const isChecked = correctIndices.includes(optIdx);
                      return (
                        <div key={optIdx} className="flex items-center gap-2">
                          <Checkbox
                            id={`ans-${field.id}-${optIdx}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const updated = checked
                                ? [...correctIndices, optIdx]
                                : correctIndices.filter((i: number) => i !== optIdx);
                              updateField(globalIdx, { correct_answer: updated.length > 0 ? updated : undefined });
                            }}
                          />
                          <Label htmlFor={`ans-${field.id}-${optIdx}`} className="text-sm cursor-pointer">
                            {opt || `Opção ${optIdx + 1}`}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Text / Textarea: type the correct answer */}
                {(field.type === "text" || field.type === "textarea") && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Resposta correta esperada:</p>
                    <Input
                      placeholder="Digite a resposta correta"
                      value={typeof field.correct_answer === "string" ? field.correct_answer : ""}
                      onChange={(e) => updateField(globalIdx, { correct_answer: e.target.value || undefined })}
                      className="text-sm"
                    />
                  </div>
                )}

                {/* Scale: correct value */}
                {field.type === "scale" && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Valor correto na escala:</p>
                    <Input
                      type="number"
                      placeholder="Ex: 5"
                      value={typeof field.correct_answer === "number" ? field.correct_answer : ""}
                      onChange={(e) => updateField(globalIdx, { correct_answer: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-24 text-sm"
                      min={1}
                      max={field.max_score || 10}
                    />
                  </div>
                )}

                {/* Rating: correct number of stars */}
                {field.type === "rating" && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Classificação correta:</p>
                    <Input
                      type="number"
                      placeholder="Ex: 4"
                      value={typeof field.correct_answer === "number" ? field.correct_answer : ""}
                      onChange={(e) => updateField(globalIdx, { correct_answer: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-24 text-sm"
                      min={1}
                      max={field.rating_max || 5}
                    />
                  </div>
                )}

                {/* Feedback fields */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                  <div>
                    <Label className="text-xs text-muted-foreground">Feedback (correto)</Label>
                    <Input
                      placeholder="Parabéns! Resposta correta."
                      value={field.feedback_correct || ""}
                      onChange={(e) => updateField(globalIdx, { feedback_correct: e.target.value })}
                      className="text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Feedback (incorreto)</Label>
                    <Input
                      placeholder="Resposta incorreta."
                      value={field.feedback_incorrect || ""}
                      onChange={(e) => updateField(globalIdx, { feedback_incorrect: e.target.value })}
                      className="text-xs mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bottom toolbar for selected field */}
            {isSelected && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 mr-auto">
                  <Label htmlFor={`req-${field.id}`} className="text-xs text-muted-foreground">Obrigatória</Label>
                  <Switch
                    id={`req-${field.id}`}
                    checked={field.required || false}
                    onCheckedChange={(v) => updateField(globalIdx, { required: v })}
                  />
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); duplicateField(globalIdx); }} title="Duplicar">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); removeField(globalIdx); }} title="Excluir">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative pr-14" ref={containerRef}>
      {/* Main form content */}
      <div className="space-y-4">
        {sections.map((section, sectionIdx) => {
          const isCollapsed = section.header ? collapsedSections.has(section.header.id) : false;
          const sectionGlobalStart = section.header ? getFieldGlobalIndex(section.header) : (section.fields.length > 0 ? getFieldGlobalIndex(section.fields[0]) : 0);

          return (
            <div key={section.header?.id || `section-${sectionIdx}`} className="space-y-2">
              {/* Section Header */}
              {section.header && (
                <div
                  ref={(el) => setFieldRef(section.header!.id, el)}
                  className={`bg-primary/5 border-l-4 border-l-primary rounded-lg p-4 space-y-2 cursor-pointer transition-all ${selectedFieldId === section.header.id ? "ring-2 ring-primary shadow-md" : ""}`}
                  onClick={() => setSelectedFieldId(section.header!.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Seção {sectionIdx + 1} de {sections.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); toggleCollapse(section.header!.id); }} className="h-7 w-7 p-0">
                        {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => e.stopPropagation()}>
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
                          <DropdownMenuItem onClick={() => deleteSection(sectionGlobalStart)} className="text-destructive">
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
              )}

              {/* Fields */}
              {!isCollapsed && (
                <div className="space-y-2 pl-1">
                  {section.fields.map((field) => renderFieldEditor(field, getFieldGlobalIndex(field)))}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {fields.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">Nenhum campo adicionado</p>
            <p className="text-xs text-muted-foreground/60 mb-4">Use o menu lateral para adicionar perguntas e seções</p>
          </div>
        )}
      </div>

      {/* Floating toolbar that follows selected field */}
      <div
        className="absolute right-0 transition-all duration-200 ease-out"
        style={{ top: `${toolbarTop}px`, width: '48px' }}
      >
        <div className="flex flex-col gap-0.5 bg-card border rounded-lg shadow-lg p-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
            onClick={() => addField("textarea")}
            title="Adicionar pergunta"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
            onClick={() => setImportOpen(true)}
            title="Importar pergunta"
          >
            <Import className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
            onClick={() => addTitleDescription()}
            title="Adicionar título e descrição"
          >
            <Type className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
            onClick={() => addImageBlock()}
            title="Adicionar imagem"
          >
            <Image className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
            onClick={() => addVideoBlock()}
            title="Adicionar vídeo"
          >
            <Video className="h-5 w-5" />
          </Button>
          <div className="border-t border-border my-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
            onClick={() => addSectionHeader()}
            title="Adicionar seção"
          >
            <SeparatorHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Import dialog */}
      <FormImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImport}
        formTable={formTable}
      />
    </div>
  );
}
