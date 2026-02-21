import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ClassOption {
  id: string;
  name: string;
}

interface ExamSaveConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: ExamConfig) => void;
  saving: boolean;
  defaultTitle?: string;
  defaultInstitution?: string;
  defaultTeacher?: string;
}

export interface ExamConfig {
  title: string;
  description: string;
  institution: string;
  teacher: string;
  classId: string | null;
  showPrepInstructions: boolean;
  prepInstructions: string;
  showExamInstructions: boolean;
  examInstructions: string;
}

export default function ExamSaveConfigDialog({
  open,
  onOpenChange,
  onSave,
  saving,
  defaultTitle = "Nova Prova",
  defaultInstitution = "",
  defaultTeacher = "",
}: ExamSaveConfigDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [institution, setInstitution] = useState(defaultInstitution);
  const [teacher, setTeacher] = useState(defaultTeacher);
  const [classId, setClassId] = useState<string>("none");
  const [showPrepInstructions, setShowPrepInstructions] = useState(false);
  const [prepInstructions, setPrepInstructions] = useState("");
  const [showExamInstructions, setShowExamInstructions] = useState(false);
  const [examInstructions, setExamInstructions] = useState("");
  const [classes, setClasses] = useState<ClassOption[]>([]);

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setInstitution(defaultInstitution);
      setTeacher(defaultTeacher);
      loadClasses();
    }
  }, [open, defaultTitle, defaultInstitution, defaultTeacher]);

  const loadClasses = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { data } = await supabase
      .from("classes")
      .select("id, name")
      .eq("user_id", user.user.id)
      .is("deleted_at", null)
      .order("name");
    setClasses(data || []);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      institution: institution.trim(),
      teacher: teacher.trim(),
      classId: classId === "none" ? null : classId,
      showPrepInstructions,
      prepInstructions: prepInstructions.trim(),
      showExamInstructions,
      examInstructions: examInstructions.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuração da Prova</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Descrição: (não exibida aos participantes)</Label>
            <Input
              placeholder="Descrição Nova Prova"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">As informações abaixo serão exibidas para o participante:</p>

          <div className="space-y-2">
            <Label>Título da Prova: *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Farmacologia Aplicada | Avaliação 2.1 | 2023.2" />
          </div>

          <div className="space-y-2">
            <Label>Instituição:</Label>
            <Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Nome da instituição" />
          </div>

          <div className="space-y-2">
            <Label>Professor(a):</Label>
            <Input value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="Nome do professor" />
          </div>

          <div className="space-y-2">
            <Label>Vincular a uma turma:</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma turma</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch checked={showPrepInstructions} onCheckedChange={setShowPrepInstructions} />
              <Label className="text-sm">Exibir instruções preparatórias para a prova</Label>
            </div>
            {showPrepInstructions && (
              <Textarea
                placeholder="Instruções preparatórias..."
                value={prepInstructions}
                onChange={(e) => setPrepInstructions(e.target.value)}
                rows={3}
              />
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch checked={showExamInstructions} onCheckedChange={setShowExamInstructions} />
              <Label className="text-sm">Exibir instruções para a prova (durante a prova)</Label>
            </div>
            {showExamInstructions && (
              <Textarea
                placeholder="Instruções durante a prova..."
                value={examInstructions}
                onChange={(e) => setExamInstructions(e.target.value)}
                rows={3}
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar Prova
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
